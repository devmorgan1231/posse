use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, CloseAccount, Transfer};

use crate::errors::PosseError;
use crate::state::*;

pub fn now() -> Result<i64> {
    Ok(Clock::get()?.unix_timestamp)
}

pub fn rent0() -> Result<u64> {
    Ok(Rent::get()?.minimum_balance(0))
}

pub fn bps_of(x: u64, bps: u16) -> Result<u64> {
    let v = (x as u128)
        .checked_mul(bps as u128)
        .ok_or(PosseError::MathOverflow)?
        .checked_div(BPS_DENOM as u128)
        .ok_or(PosseError::MathOverflow)?;
    u64::try_from(v).map_err(|_| error!(PosseError::MathOverflow))
}

pub fn share_of(pool: u64, amount: u64, total: u64) -> Result<u64> {
    require!(total > 0, PosseError::MathOverflow);
    let num = (pool as u128)
        .checked_mul(amount as u128)
        .ok_or(PosseError::MathOverflow)?;
    #[cfg(not(feature = "mut-i12"))]
    let v = num / (total as u128);
    #[cfg(feature = "mut-i12")]
    let v = num
        .checked_add(total as u128 - 1)
        .ok_or(PosseError::MathOverflow)?
        / (total as u128);
    u64::try_from(v).map_err(|_| error!(PosseError::MathOverflow))
}

pub fn can_receive(to: &AccountInfo, amount: u64, rent_min: u64) -> bool {
    amount == 0 || to.lamports() > 0 || amount >= rent_min
}

pub fn pda_pay<'info>(
    system: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    seeds: &[&[u8]],
    amount: u64,
    keep: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let left = from
        .lamports()
        .checked_sub(amount)
        .ok_or(PosseError::VaultRentBreach)?;
    require!(left >= keep, PosseError::VaultRentBreach);
    system_program::transfer(
        CpiContext::new_with_signer(
            system.clone(),
            system_program::Transfer {
                from: from.clone(),
                to: to.clone(),
            },
            &[seeds],
        ),
        amount,
    )
}

pub fn user_pay<'info>(
    system: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    system_program::transfer(
        CpiContext::new(
            system.clone(),
            system_program::Transfer {
                from: from.clone(),
                to: to.clone(),
            },
        ),
        amount,
    )
}

pub fn check_nft_mint(mint: &anchor_spl::token::Mint) -> Result<()> {
    #[cfg(not(feature = "mut-i4"))]
    {
        require!(mint.decimals == 0, PosseError::NotNftDecimals);
        require!(
            mint.supply == 1 || mint.mint_authority.is_none(),
            PosseError::NotNftSupply
        );
    }
    #[cfg(feature = "mut-i4")]
    let _ = mint;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn finish_sale<'info>(
    posse: &Account<'info, Posse>,
    vault: &AccountInfo<'info>,
    royalty_recipient: &AccountInfo<'info>,
    fee_wallet: &AccountInfo<'info>,
    custody: &AccountInfo<'info>,
    buyer_token: &AccountInfo<'info>,
    custody_rent_payer: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    system: &AccountInfo<'info>,
    sale: u64,
) -> Result<(u64, u64, u64)> {
    let rmin = rent0()?;
    let royalty_due = bps_of(sale, posse.royalty_bps)?;
    let fee_due = bps_of(sale, posse.settle_fee_bps)?;
    let royalty = if can_receive(royalty_recipient, royalty_due, rmin) {
        royalty_due
    } else {
        0
    };
    let fee = if can_receive(fee_wallet, fee_due, rmin) {
        fee_due
    } else {
        0
    };
    let net = sale
        .checked_sub(royalty)
        .and_then(|x| x.checked_sub(fee))
        .ok_or(PosseError::MathOverflow)?;
    let key = posse.key();
    let vseeds: &[&[u8]] = &[SEED_VAULT, key.as_ref(), &[posse.vault_bump]];
    pda_pay(
        system,
        vault,
        royalty_recipient,
        vseeds,
        royalty,
        posse.vault_rent,
    )?;
    pda_pay(system, vault, fee_wallet, vseeds, fee, posse.vault_rent)?;

    token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            Transfer {
                from: custody.clone(),
                to: buyer_token.clone(),
                authority: vault.clone(),
            },
            &[vseeds],
        ),
        1,
    )?;
    #[cfg(not(feature = "mut-i8"))]
    let rent_dest = custody_rent_payer.clone();
    #[cfg(feature = "mut-i8")]
    let rent_dest = {
        let _ = custody_rent_payer;
        vault.clone()
    };
    token::close_account(CpiContext::new_with_signer(
        token_program.clone(),
        CloseAccount {
            account: custody.clone(),
            destination: rent_dest,
            authority: vault.clone(),
        },
        &[vseeds],
    ))?;
    Ok((royalty, fee, net))
}
