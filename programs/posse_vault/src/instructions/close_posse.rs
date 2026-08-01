use anchor_lang::prelude::*;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct ClosePosse<'info> {
    pub caller: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, close = organizer)]
    pub posse: Box<Account<'info, Posse>>,
    /// CHECK: pinned to posse.organizer
    #[account(mut, address = posse.organizer @ PosseError::RecipientMismatch)]
    pub organizer: UncheckedAccount<'info>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    /// CHECK: must equal config.fee_wallet
    #[account(mut)]
    pub fee_wallet: UncheckedAccount<'info>,
    #[account(mut, has_one = posse, seeds = [SEED_DISPOSITION, posse.key().as_ref()], bump = disposition.bump)]
    pub disposition: Option<Box<Account<'info, Disposition>>>,
    /// CHECK: must equal disposition.rent_payer
    #[account(mut)]
    pub disposition_rent_payer: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ClosePosse>) -> Result<()> {
    let t = now()?;
    let a = &ctx.accounts;
    let p = &a.posse;
    require!(
        p.status == status::SETTLED || p.status == status::REFUNDING,
        PosseError::BadStatus
    );
    require!(
        p.final_claims >= p.contributor_count,
        PosseError::ClaimsOutstanding
    );
    require_keys_eq!(
        a.fee_wallet.key(),
        a.config.fee_wallet,
        PosseError::FeeWalletMismatch
    );
    let key = p.key();
    let system = a.system_program.to_account_info();
    let vault = a.vault.to_account_info();
    let vseeds: &[&[u8]] = &[SEED_VAULT, key.as_ref(), &[p.vault_bump]];
    let balance = vault.lamports();
    let rent_part = balance.min(p.vault_rent);
    let dust = balance - rent_part;
    let rmin = rent0()?;
    let dust_to_fee = if can_receive(&a.fee_wallet.to_account_info(), dust, rmin) {
        dust
    } else {
        0
    };
    pda_pay(
        &system,
        &vault,
        &a.fee_wallet.to_account_info(),
        vseeds,
        dust_to_fee,
        0,
    )?;
    let rest = vault.lamports();
    pda_pay(
        &system,
        &vault,
        &a.organizer.to_account_info(),
        vseeds,
        rest,
        0,
    )?;

    if p.status == status::SETTLED {
        let d = a
            .disposition
            .as_ref()
            .ok_or(PosseError::DispositionMismatch)?;
        let payer = a
            .disposition_rent_payer
            .as_ref()
            .ok_or(PosseError::DispositionMismatch)?;
        require_keys_eq!(payer.key(), d.rent_payer, PosseError::RecipientMismatch);
        d.close(payer.to_account_info())?;
    }
    emit_cpi!(PosseClosed {
        posse: key,
        dust_to_fee_wallet: dust_to_fee,
        rent_to_organizer: rest,
        at: t
    });
    Ok(())
}
