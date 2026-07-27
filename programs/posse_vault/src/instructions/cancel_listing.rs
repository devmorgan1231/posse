use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;

#[event_cpi]
#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(
        mut, close = seller, has_one = seller, has_one = mint,
        seeds = [SEED_LISTING, seller.key().as_ref(), mint.key().as_ref()], bump = listing.bump
    )]
    pub listing: Box<Account<'info, Listing>>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = listing)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(init_if_needed, payer = seller, associated_token::mint = mint, associated_token::authority = seller)]
    pub seller_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<CancelListing>) -> Result<()> {
    let l = &mut ctx.accounts.listing;
    require!(l.status == listing_status::OPEN, PosseError::ListingNotOpen);
    l.status = listing_status::CANCELLED;
    let (seller, mint, bump) = (l.seller, l.mint, l.bump);
    let seeds: &[&[u8]] = &[SEED_LISTING, seller.as_ref(), mint.as_ref(), &[bump]];
    let amount = ctx.accounts.escrow.amount;
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.seller_token.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )?;
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        },
        &[seeds],
    ))?;
    emit_cpi!(ListingCancelled {
        listing: ctx.accounts.listing.key(),
        seller,
        mint
    });
    Ok(())
}
