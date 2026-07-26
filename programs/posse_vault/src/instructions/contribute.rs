use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        init_if_needed, payer = contributor, space = 8 + Contribution::INIT_SPACE,
        seeds = [SEED_CONTRIBUTION, posse.key().as_ref(), contributor.key().as_ref()], bump
    )]
    pub contribution: Box<Account<'info, Contribution>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<Contribute>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, PosseError::Paused);
    require!(amount > 0, PosseError::InvalidAmount);
    let t = now()?;
    let p = &mut ctx.accounts.posse;
    require!(
        p.status == status::OPEN || p.status == status::RAISING,
        PosseError::BadStatus
    );
    require!(t <= p.closes_at, PosseError::DeadlinePassed);
    let headroom = p
        .target_lamports
        .checked_sub(p.raised_lamports)
        .ok_or(PosseError::MathOverflow)?;
    require!(headroom > 0, PosseError::NoHeadroom);
    #[cfg(not(feature = "mut-i10"))]
    let accepted = amount.min(headroom);
    #[cfg(feature = "mut-i10")]
    let accepted = amount;

    user_pay(
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.contributor.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        accepted,
    )?;

    let c = &mut ctx.accounts.contribution;
    if c.contributor == Pubkey::default() {
        c.posse = p.key();
        c.contributor = ctx.accounts.contributor.key();
        c.amount_lamports = 0;
        c.first_at = t;
        c.returned_claimed = false;
        c.final_claimed = false;
        c.bump = ctx.bumps.contribution;
        c.reserved = [0; 32];
        p.contributor_count = p
            .contributor_count
            .checked_add(1)
            .ok_or(PosseError::MathOverflow)?;
    }
    c.amount_lamports = c
        .amount_lamports
        .checked_add(accepted)
        .ok_or(PosseError::MathOverflow)?;
    p.raised_lamports = p
        .raised_lamports
        .checked_add(accepted)
        .ok_or(PosseError::MathOverflow)?;
    if p.status == status::OPEN {
        p.status = status::RAISING;
    }
    let funded = p.raised_lamports >= p.target_lamports;
    if funded {
        p.status = status::FUNDED;
        p.funded_at = t;
    }
    emit_cpi!(ChippedIn {
        posse: p.key(),
        contributor: c.contributor,
        accepted,
        new_raised: p.raised_lamports,
        contributor_count: p.contributor_count,
    });
    if funded {
        emit_cpi!(Funded {
            posse: p.key(),
            raised: p.raised_lamports
        });
    }
    Ok(())
}
