use anchor_lang::prelude::*;

use super::crank::crank_guard;
use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct StartDisposition<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(
        init, payer = caller, space = 8 + Disposition::INIT_SPACE,
        seeds = [SEED_DISPOSITION, posse.key().as_ref()], bump
    )]
    pub disposition: Box<Account<'info, Disposition>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<StartDisposition>) -> Result<()> {
    crank_guard(&ctx.accounts.caller.key(), &ctx.accounts.posse)?;
    let t = now()?;
    let p = &mut ctx.accounts.posse;
    require!(p.status == status::HELD, PosseError::BadStatus);
    let opens = p
        .bought_at
        .checked_add(
            (p.exit_day as i64)
                .checked_mul(SECONDS_PER_DAY)
                .ok_or(PosseError::MathOverflow)?,
        )
        .ok_or(PosseError::MathOverflow)?;
    require!(t >= opens, PosseError::HoldNotOver);
    let ends = if p.exit_kind == exit_kind::AUCTION {
        t.checked_add((p.exit_hours as i64) * SECONDS_PER_HOUR)
            .ok_or(PosseError::MathOverflow)?
    } else {
        0
    };
    p.status = status::DISPOSING;
    let posse_key = p.key();
    let d = &mut ctx.accounts.disposition;
    d.posse = posse_key;
    d.kind = p.exit_kind;
    d.starts_at = t;
    d.ends_at = ends;
    d.reserve_lamports = p.exit_price_lamports;
    d.high_bid_lamports = 0;
    d.high_bidder = Pubkey::default();
    d.bid_count = 0;
    d.bid_escrow_bump =
        Pubkey::find_program_address(&[SEED_BID_ESCROW, posse_key.as_ref()], &crate::ID).1;
    d.settled = false;
    d.sale_lamports = 0;
    d.royalty_lamports = 0;
    d.settle_fee_lamports = 0;
    d.net_lamports = 0;
    d.buyer = Pubkey::default();
    d.settled_at = 0;
    d.bump = ctx.bumps.disposition;
    d.rent_payer = ctx.accounts.caller.key();
    d.reserved = [0; 32];
    emit_cpi!(DispositionStarted {
        posse: posse_key,
        kind: d.kind,
        starts_at: t,
        ends_at: ends,
        reserve: d.reserve_lamports
    });
    Ok(())
}
