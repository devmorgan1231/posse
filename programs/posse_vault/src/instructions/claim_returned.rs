use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct ClaimReturned<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut, has_one = contributor, has_one = posse,
        seeds = [SEED_CONTRIBUTION, posse.key().as_ref(), contributor.key().as_ref()], bump = contribution.bump
    )]
    pub contribution: Box<Account<'info, Contribution>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ClaimReturned>) -> Result<()> {
    let p = &ctx.accounts.posse;
    #[cfg(feature = "mut-i6")]
    require!(!ctx.accounts.config.paused, PosseError::Paused);
    require!(
        p.status >= status::BOUGHT && p.status <= status::SETTLED,
        PosseError::BadStatus
    );
    require!(p.returned_lamports > 0, PosseError::NothingToClaim);
    let c = &mut ctx.accounts.contribution;
    require!(
        !c.returned_claimed && !c.final_claimed,
        PosseError::AlreadyClaimed
    );
    let payout = share_of(p.returned_lamports, c.amount_lamports, p.raised_lamports)?;
    c.returned_claimed = true;
    let key = p.key();
    pda_pay(
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.contributor.to_account_info(),
        &[SEED_VAULT, key.as_ref(), &[p.vault_bump]],
        payout,
        p.vault_rent,
    )?;
    emit_cpi!(ReturnedClaimed {
        posse: key,
        contributor: c.contributor,
        amount: payout
    });
    Ok(())
}
