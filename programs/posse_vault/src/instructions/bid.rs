use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct Bid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, has_one = posse, seeds = [SEED_DISPOSITION, posse.key().as_ref()], bump = disposition.bump)]
    pub disposition: Box<Account<'info, Disposition>>,
    #[account(mut, seeds = [SEED_BID_ESCROW, posse.key().as_ref()], bump = disposition.bid_escrow_bump)]
    pub bid_escrow: SystemAccount<'info>,
    /// CHECK: must equal disposition.high_bidder when there is a standing bid (checked in the handler)
    #[account(mut)]
    pub prev_bidder: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<Bid>, amount: u64) -> Result<()> {
    let t = now()?;
    let posse_key = ctx.accounts.posse.key();
    require!(
        ctx.accounts.posse.status == status::DISPOSING,
        PosseError::BadStatus
    );
    let d = &ctx.accounts.disposition;
    require!(d.kind == exit_kind::AUCTION, PosseError::WrongKind);
    require!(
        d.starts_at <= t && t < d.ends_at,
        PosseError::AuctionNotLive
    );
    require!(amount >= d.reserve_lamports, PosseError::BidBelowReserve);
    let had_bid = d.bid_count > 0;
    let prev = d.high_bidder;
    let prev_amount = d.high_bid_lamports;
    if had_bid {
        let inc = (d.reserve_lamports / 100).max(MIN_BID_INCREMENT_LAMPORTS);
        require!(
            amount
                >= prev_amount
                    .checked_add(inc)
                    .ok_or(PosseError::MathOverflow)?,
            PosseError::BidIncrementTooSmall
        );
    }

    let system = ctx.accounts.system_program.to_account_info();
    let escrow = ctx.accounts.bid_escrow.to_account_info();
    user_pay(
        &system,
        &ctx.accounts.bidder.to_account_info(),
        &escrow,
        amount,
    )?;
    if had_bid {
        let prev_acc = ctx
            .accounts
            .prev_bidder
            .as_ref()
            .ok_or(PosseError::PrevBidderMismatch)?;
        require_keys_eq!(prev_acc.key(), prev, PosseError::PrevBidderMismatch);
        #[cfg(not(feature = "mut-i9"))]
        pda_pay(
            &system,
            &escrow,
            &prev_acc.to_account_info(),
            &[SEED_BID_ESCROW, posse_key.as_ref(), &[d.bid_escrow_bump]],
            prev_amount,
            0,
        )?;
    }
    let d = &mut ctx.accounts.disposition;
    d.high_bid_lamports = amount;
    d.high_bidder = ctx.accounts.bidder.key();
    d.bid_count = d.bid_count.checked_add(1).ok_or(PosseError::MathOverflow)?;
    emit_cpi!(BidPlaced {
        posse: posse_key,
        bidder: d.high_bidder,
        amount,
        prev_bidder: if had_bid { prev } else { Pubkey::default() },
        prev_refund: if had_bid { prev_amount } else { 0 },
        at: t,
    });
    Ok(())
}
