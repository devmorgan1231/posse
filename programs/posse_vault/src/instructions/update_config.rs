use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct UpdateConfigArgs {
    pub fee_wallet: Option<Pubkey>,
    pub execution_fee_bps: Option<u16>,
    pub settlement_fee_bps: Option<u16>,
    pub admin: Option<Pubkey>,
    pub paused: Option<bool>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [SEED_CONFIG], bump = config.bump, has_one = admin @ PosseError::NotAdmin)]
    pub config: Box<Account<'info, Config>>,
}

pub(crate) fn handler(ctx: Context<UpdateConfig>, args: UpdateConfigArgs) -> Result<()> {
    let c = &mut ctx.accounts.config;
    if let Some(bps) = args.execution_fee_bps {
        #[cfg(not(feature = "mut-i5"))]
        require!(bps <= c.max_fee_bps, PosseError::FeeAboveCap);
        c.execution_fee_bps = bps;
    }
    if let Some(bps) = args.settlement_fee_bps {
        #[cfg(not(feature = "mut-i5"))]
        require!(bps <= c.max_fee_bps, PosseError::FeeAboveCap);
        c.settlement_fee_bps = bps;
    }
    if let Some(w) = args.fee_wallet {
        c.fee_wallet = w;
    }
    if let Some(a) = args.admin {
        c.admin = a;
    }
    if let Some(p) = args.paused {
        c.paused = p;
    }
    emit_cpi!(ConfigUpdated {
        admin: c.admin,
        fee_wallet: c.fee_wallet,
        execution_fee_bps: c.execution_fee_bps,
        settlement_fee_bps: c.settlement_fee_bps,
        paused: c.paused,
    });
    Ok(())
}
