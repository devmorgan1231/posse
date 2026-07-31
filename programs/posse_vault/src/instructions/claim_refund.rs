use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
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

pub(crate) fn handler(ctx: Context<ClaimRefund>) -> Result<()> {
    #[cfg(feature = "mut-i6")]
    require!(!ctx.accounts.config.paused, PosseError::Paused);
    let t = now()?;
    let p = &mut ctx.accounts.posse;
    let key = p.key();
    if p.status <= status::FUNDED && t > p.closes_at {
        p.status = status::REFUNDING;
        emit_cpi!(Expired { posse: key, at: t });
    }
    require!(p.status == status::REFUNDING, PosseError::BadStatus);
    let c = &ctx.accounts.contribution;
    require!(!c.final_claimed, PosseError::AlreadyClaimed);
    let amount = c.amount_lamports;
    let contributor = c.contributor;
    p.final_claims = p
        .final_claims
        .checked_add(1)
        .ok_or(PosseError::MathOverflow)?;
    pda_pay(
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.contributor.to_account_info(),
        &[SEED_VAULT, key.as_ref(), &[p.vault_bump]],
        amount,
        p.vault_rent,
    )?;
    ctx.accounts.contribution.final_claimed = true;
    emit_cpi!(RefundClaimed {
        posse: key,
        contributor,
        amount
    });
    Ok(())
}
