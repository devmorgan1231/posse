use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct BuyListed<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump = posse.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut, has_one = posse, seeds = [SEED_DISPOSITION, posse.key().as_ref()], bump = disposition.bump)]
    pub disposition: Box<Account<'info, Disposition>>,
    #[account(address = posse.mint @ PosseError::MintMismatch)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = vault)]
    pub custody: Box<Account<'info, TokenAccount>>,
    #[account(init_if_needed, payer = buyer, associated_token::mint = mint, associated_token::authority = buyer)]
    pub buyer_token: Box<Account<'info, TokenAccount>>,
    /// CHECK: must equal posse.royalty_recipient
    #[account(mut)]
    pub royalty_recipient: UncheckedAccount<'info>,
    /// CHECK: must equal config.fee_wallet
    #[account(mut)]
    pub fee_wallet: UncheckedAccount<'info>,
    /// CHECK: must equal posse.custody_rent_payer
    #[account(mut)]
    pub custody_rent_payer: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<BuyListed>) -> Result<()> {
    let t = now()?;
    let a = &ctx.accounts;
    let p = &a.posse;
    require!(p.status == status::DISPOSING, PosseError::BadStatus);
    require!(
        a.disposition.kind == exit_kind::LISTING,
        PosseError::WrongKind
    );
    require!(!a.disposition.settled, PosseError::AlreadySettled);
    require_keys_eq!(
        a.custody_rent_payer.key(),
        p.custody_rent_payer,
        PosseError::RecipientMismatch
    );
    require_keys_eq!(
        a.royalty_recipient.key(),
        p.royalty_recipient,
        PosseError::RecipientMismatch
    );
    require_keys_eq!(
        a.fee_wallet.key(),
        a.config.fee_wallet,
        PosseError::FeeWalletMismatch
    );
    let sale = p.exit_price_lamports;
    let system = a.system_program.to_account_info();
    user_pay(
        &system,
        &a.buyer.to_account_info(),
        &a.vault.to_account_info(),
        sale,
    )?;
    let buyer = a.buyer.key();
    let posse_key = p.key();
    let (royalty, fee, net) = finish_sale(
        &a.posse,
        &a.vault.to_account_info(),
        &a.royalty_recipient.to_account_info(),
        &a.fee_wallet.to_account_info(),
        &a.custody.to_account_info(),
        &a.buyer_token.to_account_info(),
        &a.custody_rent_payer.to_account_info(),
        &a.token_program.to_account_info(),
        &system,
        sale,
    )?;
    let d = &mut ctx.accounts.disposition;
    d.settled = true;
    d.sale_lamports = sale;
    d.royalty_lamports = royalty;
    d.settle_fee_lamports = fee;
    d.net_lamports = net;
    d.buyer = buyer;
    d.settled_at = t;
    ctx.accounts.posse.status = status::SETTLED;
    emit_cpi!(Settled {
        posse: posse_key,
        buyer,
        sale,
        royalty,
        fee,
        net,
        at: t
    });
    Ok(())
}
