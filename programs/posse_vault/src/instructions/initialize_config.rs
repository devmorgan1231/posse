use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;

#[event_cpi]
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [SEED_CONFIG], bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        seeds = [crate::ID.as_ref()], bump, seeds::program = bpf_loader_upgradeable::ID,
        constraint = program_data.upgrade_authority_address == Some(admin.key()) @ PosseError::NotUpgradeAuthority
    )]
    pub program_data: Box<Account<'info, ProgramData>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<InitializeConfig>,
    fee_wallet: Pubkey,
    execution_fee_bps: u16,
    settlement_fee_bps: u16,
    max_fee_bps: u16,
) -> Result<()> {
    require!(max_fee_bps <= MAX_FEE_BPS_CEILING, PosseError::FeeAboveCap);
    require!(
        execution_fee_bps <= max_fee_bps && settlement_fee_bps <= max_fee_bps,
        PosseError::FeeAboveCap
    );
    let c = &mut ctx.accounts.config;
    c.admin = ctx.accounts.admin.key();
    c.fee_wallet = fee_wallet;
    c.execution_fee_bps = execution_fee_bps;
    c.settlement_fee_bps = settlement_fee_bps;
    c.max_fee_bps = max_fee_bps;
    c.paused = false;
    c.bump = ctx.bumps.config;
    c.reserved = [0; 64];
    emit_cpi!(ConfigUpdated {
        admin: c.admin,
        fee_wallet: c.fee_wallet,
        execution_fee_bps: c.execution_fee_bps,
        settlement_fee_bps: c.settlement_fee_bps,
        paused: c.paused,
    });
    Ok(())
}
