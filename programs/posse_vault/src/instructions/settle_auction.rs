use anchor_lang::prelude::*;
use anchor_spl::associated_token::{self, AssociatedToken};
use anchor_spl::token::{Mint, Token, TokenAccount};

use super::crank::crank_guard;
use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut, has_one = posse, seeds = [SEED_DISPOSITION, posse.key().as_ref()], bump = disposition.bump)]
    pub disposition: Box<Account<'info, Disposition>>,
    #[account(mut, seeds = [SEED_BID_ESCROW, posse.key().as_ref()], bump = disposition.bid_escrow_bump)]
    pub bid_escrow: SystemAccount<'info>,
    /// CHECK: must equal disposition.rent_payer
    #[account(mut)]
    pub disposition_rent_payer: UncheckedAccount<'info>,
    #[account(address = posse.mint @ PosseError::MintMismatch)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = vault)]
    pub custody: Box<Account<'info, TokenAccount>>,
    /// CHECK: must equal disposition.high_bidder when there is a winning bid
    #[account(mut)]
    pub winner: Option<UncheckedAccount<'info>>,
    /// CHECK: the winner's associated token account for the mint (created idempotently)
    #[account(mut)]
    pub winner_token: Option<UncheckedAccount<'info>>,
    /// CHECK: must equal posse.royalty_recipient
    #[account(mut)]
    pub royalty_recipient: UncheckedAccount<'info>,
    /// CHECK: must equal config.fee_wallet
    #[account(mut)]
    pub fee_wallet: UncheckedAccount<'info>,
    /// CHECK: must equal posse.custody_rent_payer
    #[account(mut)]
    pub custody_rent_payer: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<SettleAuction>) -> Result<()> {
    crank_guard(&ctx.accounts.caller.key(), &ctx.accounts.posse)?;
    let t = now()?;
    let a = &ctx.accounts;
    let p = &a.posse;
    require!(p.status == status::DISPOSING, PosseError::BadStatus);
    require!(
        a.disposition.kind == exit_kind::AUCTION,
        PosseError::WrongKind
    );
    require!(!a.disposition.settled, PosseError::AlreadySettled);
    require!(t >= a.disposition.ends_at, PosseError::AuctionNotEnded);
    require_keys_eq!(
        a.disposition_rent_payer.key(),
        a.disposition.rent_payer,
        PosseError::RecipientMismatch
    );
    require_keys_eq!(
        a.custody_rent_payer.key(),
        p.custody_rent_payer,
        PosseError::RecipientMismatch
    );
    require_keys_eq!(
        a.royalty_recipient.key(),
        p.royalty_recipient,
        PosseError::RecipientMismatch
    );
    require_keys_eq!(
        a.fee_wallet.key(),
        a.config.fee_wallet,
        PosseError::FeeWalletMismatch
    );

    let posse_key = p.key();
    let system = a.system_program.to_account_info();
    let escrow = a.bid_escrow.to_account_info();
    let eseeds: &[&[u8]] = &[
        SEED_BID_ESCROW,
        posse_key.as_ref(),
        &[a.disposition.bid_escrow_bump],
    ];
    let has_bid = a.disposition.bid_count > 0
        && a.disposition.high_bid_lamports >= a.disposition.reserve_lamports;

    if has_bid {
        let winner = a.winner.as_ref().ok_or(PosseError::WinnerAccountMismatch)?;
        require_keys_eq!(
            winner.key(),
            a.disposition.high_bidder,
            PosseError::WinnerAccountMismatch
        );
        if a.custody.is_frozen() {
            pda_pay(
                &system,
                &escrow,
                &winner.to_account_info(),
                eseeds,
                a.disposition.high_bid_lamports,
                0,
            )?;
            return fail_disposition(ctx, t);
        }
    } else {
        return fail_disposition(ctx, t);
    }

    let winner = a.winner.as_ref().unwrap().to_account_info();
    let winner_token = a
        .winner_token
        .as_ref()
        .ok_or(PosseError::WinnerAccountMismatch)?
        .to_account_info();
    require_keys_eq!(
        winner_token.key(),
        associated_token::get_associated_token_address(&winner.key(), &p.mint),
        PosseError::WinnerAccountMismatch
    );
    associated_token::create_idempotent(CpiContext::new(
        a.associated_token_program.to_account_info(),
        associated_token::Create {
            payer: a.caller.to_account_info(),
            associated_token: winner_token.clone(),
            authority: winner.clone(),
            mint: a.mint.to_account_info(),
            system_program: system.clone(),
            token_program: a.token_program.to_account_info(),
        },
    ))?;

    let sale = a.disposition.high_bid_lamports;
    let escrow_all = escrow.lamports();
    pda_pay(
        &system,
        &escrow,
        &a.vault.to_account_info(),
        eseeds,
        escrow_all,
        0,
    )?;
    let buyer = winner.key();
    let (royalty, fee, net) = finish_sale(
        &a.posse,
        &a.vault.to_account_info(),
        &a.royalty_recipient.to_account_info(),
        &a.fee_wallet.to_account_info(),
        &a.custody.to_account_info(),
        &winner_token,
        &a.custody_rent_payer.to_account_info(),
        &a.token_program.to_account_info(),
        &system,
        sale,
    )?;
    let d = &mut ctx.accounts.disposition;
    d.settled = true;
    d.sale_lamports = sale;
    d.royalty_lamports = royalty;
    d.settle_fee_lamports = fee;
    d.net_lamports = net;
    d.buyer = buyer;
    d.settled_at = t;
    ctx.accounts.posse.status = status::SETTLED;
    emit_cpi!(Settled {
        posse: posse_key,
        buyer,
        sale,
        royalty,
        fee,
        net,
        at: t
    });
    Ok(())
}

fn fail_disposition(ctx: Context<SettleAuction>, t: i64) -> Result<()> {
    let posse_key = ctx.accounts.posse.key();
    ctx.accounts.posse.status = status::HELD;
    let payer = ctx.accounts.disposition_rent_payer.to_account_info();
    ctx.accounts.disposition.close(payer)?;
    emit_cpi!(DispositionFailed {
        posse: posse_key,
        at: t
    });
    Ok(())
}
