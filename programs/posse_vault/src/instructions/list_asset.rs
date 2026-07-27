use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[event_cpi]
#[derive(Accounts)]
pub struct ListAsset<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, token::mint = mint, token::authority = seller)]
    pub seller_token: Box<Account<'info, TokenAccount>>,
    #[account(
        init, payer = seller, space = 8 + Listing::INIT_SPACE,
        seeds = [SEED_LISTING, seller.key().as_ref(), mint.key().as_ref()], bump
    )]
    pub listing: Box<Account<'info, Listing>>,
    #[account(init_if_needed, payer = seller, associated_token::mint = mint, associated_token::authority = listing)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ListAsset>, ask_lamports: u64) -> Result<()> {
    require!(ask_lamports > 0, PosseError::InvalidAmount);
    check_nft_mint(&ctx.accounts.mint)?;
    require!(
        ctx.accounts.seller_token.amount >= 1,
        PosseError::SellerHasNoAsset
    );
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_token.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        1,
    )?;
    let l = &mut ctx.accounts.listing;
    l.seller = ctx.accounts.seller.key();
    l.mint = ctx.accounts.mint.key();
    l.ask_lamports = ask_lamports;
    l.status = listing_status::OPEN;
    l.created_at = now()?;
    l.escrow_bump = 0;
    l.bump = ctx.bumps.listing;
    l.reserved = [0; 32];
    emit_cpi!(AssetListed {
        listing: l.key(),
        seller: l.seller,
        mint: l.mint,
        ask: l.ask_lamports
    });
    Ok(())
}
