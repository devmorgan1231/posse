use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct ClaimProceeds<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(has_one = posse, seeds = [SEED_DISPOSITION, posse.key().as_ref()], bump = disposition.bump)]
    pub disposition: Box<Account<'info, Disposition>>,
    #[account(
        mut, close = contributor, has_one = contributor, has_one = posse,
        seeds = [SEED_CONTRIBUTION, posse.key().as_ref(), contributor.key().as_ref()], bump = contribution.bump
    )]
    pub contribution: Box<Account<'info, Contribution>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ClaimProceeds>) -> Result<()> {
    #[cfg(feature = "mut-i6")]
    require!(!ctx.accounts.config.paused, PosseError::Paused);
    let p = &ctx.accounts.posse;
    require!(p.status == status::SETTLED, PosseError::BadStatus);
    require!(
        ctx.accounts.disposition.settled,
        PosseError::DispositionMismatch
    );
    let c = &ctx.accounts.contribution;
    require!(!c.final_claimed, PosseError::AlreadyClaimed);
    let returned = if !c.returned_claimed && p.returned_lamports > 0 {
        share_of(p.returned_lamports, c.amount_lamports, p.raised_lamports)?
    } else {
        0
    };
    let proceeds = share_of(
        ctx.accounts.disposition.net_lamports,
        c.amount_lamports,
        p.raised_lamports,
    )?;
    let total = returned
        .checked_add(proceeds)
        .ok_or(PosseError::MathOverflow)?;
    let key = p.key();
    let contributor = c.contributor;
    pda_pay(
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.contributor.to_account_info(),
        &[SEED_VAULT, key.as_ref(), &[p.vault_bump]],
        total,
        p.vault_rent,
    )?;
    let c = &mut ctx.accounts.contribution;
    c.final_claimed = true;
    c.returned_claimed = true;
    let p = &mut ctx.accounts.posse;
    p.final_claims = p
        .final_claims
        .checked_add(1)
        .ok_or(PosseError::MathOverflow)?;
    if returned > 0 {
        emit_cpi!(ReturnedClaimed {
            posse: key,
            contributor,
            amount: returned
        });
    }
    emit_cpi!(ProceedsClaimed {
        posse: key,
        contributor,
        amount: proceeds
    });
    Ok(())
}
