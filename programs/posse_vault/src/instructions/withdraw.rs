use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut, close = contributor, has_one = contributor, has_one = posse,
        seeds = [SEED_CONTRIBUTION, posse.key().as_ref(), contributor.key().as_ref()], bump = contribution.bump
    )]
    pub contribution: Box<Account<'info, Contribution>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<Withdraw>) -> Result<()> {
    let p = &mut ctx.accounts.posse;
    #[cfg(not(feature = "mut-i11"))]
    require!(
        p.status == status::OPEN || p.status == status::RAISING,
        PosseError::BadStatus
    );
    #[cfg(feature = "mut-i11")]
    require!(p.status <= status::FUNDED, PosseError::BadStatus);
    let amount = ctx.accounts.contribution.amount_lamports;
    p.raised_lamports = p
        .raised_lamports
        .checked_sub(amount)
        .ok_or(PosseError::MathOverflow)?;
    p.contributor_count = p
        .contributor_count
        .checked_sub(1)
        .ok_or(PosseError::MathOverflow)?;
    let key = p.key();
    pda_pay(
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.contributor.to_account_info(),
        &[SEED_VAULT, key.as_ref(), &[p.vault_bump]],
        amount,
        p.vault_rent,
    )?;
    emit_cpi!(Withdrew {
        posse: key,
        contributor: ctx.accounts.contributor.key(),
        amount,
        new_raised: p.raised_lamports
    });
    Ok(())
}
