use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use super::crank::crank_guard;
use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct ExecutePurchase<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut, close = seller,
        seeds = [SEED_LISTING, listing.seller.as_ref(), listing.mint.as_ref()], bump = listing.bump
    )]
    pub listing: Box<Account<'info, Listing>>,
    /// CHECK: must equal posse.seller (checked in the handler); receives the price and the escrow rent
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    /// CHECK: must equal config.fee_wallet (checked in the handler)
    #[account(mut)]
    pub fee_wallet: UncheckedAccount<'info>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = listing)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(init_if_needed, payer = caller, associated_token::mint = mint, associated_token::authority = vault)]
    pub custody: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ExecutePurchase>) -> Result<()> {
    let t = now()?;
    let a = &ctx.accounts;
    let p = &a.posse;
    crank_guard(&a.caller.key(), p)?;
    require!(p.status == status::FUNDED, PosseError::BadStatus);
    require!(t <= p.closes_at, PosseError::DeadlinePassed);
    require!(
        a.listing.status == listing_status::OPEN,
        PosseError::ListingNotOpen
    );
    #[cfg(not(feature = "mut-i4"))]
    {
        require_keys_eq!(a.listing.mint, p.mint, PosseError::MintMismatch);
        require_keys_eq!(a.mint.key(), p.mint, PosseError::MintMismatch);
        require_keys_eq!(a.listing.seller, p.seller, PosseError::SellerMismatch);
    }
    #[cfg(not(feature = "mut-i1"))]
    {
        require_keys_eq!(a.seller.key(), p.seller, PosseError::RecipientMismatch);
        require_keys_eq!(
            a.fee_wallet.key(),
            a.config.fee_wallet,
            PosseError::FeeWalletMismatch
        );
    }
    let price = a.listing.ask_lamports;
    require!(price <= p.max_price_lamports, PosseError::PriceAboveMax);
    #[cfg(not(feature = "mut-i2"))]
    let fee = bps_of(price, p.fee_bps)?;
    #[cfg(feature = "mut-i2")]
    let fee = bps_of(price, a.config.execution_fee_bps)?;
    let cost = price.checked_add(fee).ok_or(PosseError::MathOverflow)?;
    require!(p.raised_lamports >= cost, PosseError::Unaffordable);
    require!(a.escrow.amount == 1, PosseError::EscrowEmpty);
    check_nft_mint(&a.mint)?;

    let fee_paid = if can_receive(&a.fee_wallet.to_account_info(), fee, rent0()?) {
        fee
    } else {
        0
    };
    let returned = p.raised_lamports - price - fee_paid;

    let posse_key = a.posse.key();
    let (vault_bump, vault_rent, mint) = (p.vault_bump, p.vault_rent, p.mint);
    {
        let p = &mut ctx.accounts.posse;
        p.status = status::BOUGHT;
        p.price_lamports = price;
        p.exec_fee_lamports = fee_paid;
        p.returned_lamports = returned;
        p.bought_at = t;
        p.custody_rent_payer = ctx.accounts.caller.key();
    }
    ctx.accounts.listing.status = listing_status::SOLD;

    let a = &ctx.accounts;
    let system = a.system_program.to_account_info();
    let vault = a.vault.to_account_info();
    let vseeds: &[&[u8]] = &[SEED_VAULT, posse_key.as_ref(), &[vault_bump]];
    pda_pay(
        &system,
        &vault,
        &a.seller.to_account_info(),
        vseeds,
        price,
        vault_rent,
    )?;
    pda_pay(
        &system,
        &vault,
        &a.fee_wallet.to_account_info(),
        vseeds,
        fee_paid,
        vault_rent,
    )?;

    let (lseller, lmint, lbump) = (a.listing.seller, a.listing.mint, a.listing.bump);
    let lseeds: &[&[u8]] = &[SEED_LISTING, lseller.as_ref(), lmint.as_ref(), &[lbump]];
    token::transfer(
        CpiContext::new_with_signer(
            a.token_program.to_account_info(),
            Transfer {
                from: a.escrow.to_account_info(),
                to: a.custody.to_account_info(),
                authority: a.listing.to_account_info(),
            },
            &[lseeds],
        ),
        1,
    )?;
    token::close_account(CpiContext::new_with_signer(
        a.token_program.to_account_info(),
        CloseAccount {
            account: a.escrow.to_account_info(),
            destination: a.seller.to_account_info(),
            authority: a.listing.to_account_info(),
        },
        &[lseeds],
    ))?;

    emit_cpi!(Purchased {
        posse: posse_key,
        mint,
        seller: lseller,
        price,
        fee: fee_paid,
        returned,
        at: t
    });
    Ok(())
}
