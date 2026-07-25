use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::errors::PosseError;
use crate::events::*;
use crate::state::*;
use crate::util::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreatePosseArgs {
    pub nonce: u64,
    pub seller: Pubkey,
    pub royalty_recipient: Pubkey,
    pub royalty_bps: u16,
    pub target_lamports: u64,
    pub max_price_lamports: u64,
    pub closes_at: i64,
    pub exit_kind: u8,
    pub exit_day: u16,
    pub exit_price_lamports: u64,
    pub exit_hours: u16,
}

#[event_cpi]
#[derive(Accounts)]
#[instruction(args: CreatePosseArgs)]
pub struct CreatePosse<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(seeds = [SEED_CONFIG], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(
        init, payer = organizer, space = 8 + Posse::INIT_SPACE,
        seeds = [SEED_POSSE, organizer.key().as_ref(), &args.nonce.to_le_bytes()], bump
    )]
    pub posse: Box<Account<'info, Posse>>,
    #[account(mut, seeds = [SEED_VAULT, posse.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<CreatePosse>, args: CreatePosseArgs) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, PosseError::Paused);
    check_nft_mint(&ctx.accounts.mint)?;
    let t = now()?;
    require!(
        args.target_lamports > 0 && args.max_price_lamports > 0,
        PosseError::InvalidAmount
    );
    require!(args.closes_at > t, PosseError::DeadlineInPast);
    require!(
        args.royalty_bps as u64 <= BPS_DENOM,
        PosseError::InvalidRoyalty
    );
    require!(
        args.exit_price_lamports >= MIN_EXIT_PRICE_LAMPORTS,
        PosseError::InvalidExit
    );
    match args.exit_kind {
        exit_kind::AUCTION => require!(
            args.exit_hours > 0 && args.exit_hours <= MAX_EXIT_HOURS,
            PosseError::InvalidExit
        ),
        exit_kind::LISTING => {}
        _ => return err!(PosseError::InvalidExit),
    }

    let rent = rent0()?;
    let vault_info = ctx.accounts.vault.to_account_info();
    #[cfg(not(feature = "mut-i7"))]
    {
        let have = vault_info.lamports();
        if have < rent {
            user_pay(
                &ctx.accounts.system_program.to_account_info(),
                &ctx.accounts.organizer.to_account_info(),
                &vault_info,
                rent - have,
            )?;
        }
    }

    let p = &mut ctx.accounts.posse;
    p.organizer = ctx.accounts.organizer.key();
    p.nonce = args.nonce;
    p.vault_bump = ctx.bumps.vault;
    p.bump = ctx.bumps.posse;
    p.mint = ctx.accounts.mint.key();
    p.seller = args.seller;
    p.royalty_recipient = args.royalty_recipient;
    p.royalty_bps = args.royalty_bps;
    p.target_lamports = args.target_lamports;
    p.max_price_lamports = args.max_price_lamports;
    p.fee_bps = cfg.execution_fee_bps;
    p.created_at = t;
    p.closes_at = args.closes_at;
    p.status = status::OPEN;
    p.raised_lamports = 0;
    p.contributor_count = 0;
    p.exit_kind = args.exit_kind;
    p.exit_day = args.exit_day;
    p.exit_price_lamports = args.exit_price_lamports;
    p.exit_hours = if args.exit_kind == exit_kind::AUCTION {
        args.exit_hours
    } else {
        0
    };
    p.price_lamports = 0;
    p.exec_fee_lamports = 0;
    p.returned_lamports = 0;
    p.bought_at = 0;
    p.shares_issued_at = 0;
    p.custody_rent_payer = Pubkey::default();
    p.settle_fee_bps = cfg.settlement_fee_bps;
    p.funded_at = 0;
    p.final_claims = 0;
    p.vault_rent = rent;
    p.reserved = [0; 64];

    emit_cpi!(PosseCreated {
        posse: p.key(),
        organizer: p.organizer,
        mint: p.mint,
        seller: p.seller,
        target: p.target_lamports,
        max_price: p.max_price_lamports,
        fee_bps: p.fee_bps,
        closes_at: p.closes_at,
        exit_kind: p.exit_kind,
        exit_day: p.exit_day,
        exit_price: p.exit_price_lamports,
        exit_hours: p.exit_hours,
        royalty_bps: p.royalty_bps,
        royalty_recipient: p.royalty_recipient,
        nonce: p.nonce,
    });
    Ok(())
}
