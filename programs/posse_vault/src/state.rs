use anchor_lang::prelude::*;

pub const BPS_DENOM: u64 = 10_000;
pub const MAX_FEE_BPS_CEILING: u16 = 1_000;
pub const MIN_EXIT_PRICE_LAMPORTS: u64 = 10_000_000;
pub const MIN_BID_INCREMENT_LAMPORTS: u64 = 10_000_000;
pub const MAX_EXIT_HOURS: u16 = 720;
pub const SECONDS_PER_DAY: i64 = 86_400;
pub const SECONDS_PER_HOUR: i64 = 3_600;

pub const SEED_CONFIG: &[u8] = b"config";
pub const SEED_POSSE: &[u8] = b"posse";
pub const SEED_VAULT: &[u8] = b"vault";
pub const SEED_CONTRIBUTION: &[u8] = b"contribution";
pub const SEED_LISTING: &[u8] = b"listing";
pub const SEED_DISPOSITION: &[u8] = b"disposition";
pub const SEED_BID_ESCROW: &[u8] = b"bid-escrow";

pub mod status {
    pub const OPEN: u8 = 0;
    pub const RAISING: u8 = 1;
    pub const FUNDED: u8 = 2;
    pub const BOUGHT: u8 = 3;
    pub const HELD: u8 = 4;
    pub const DISPOSING: u8 = 5;
    pub const SETTLED: u8 = 6;
    pub const REFUNDING: u8 = 7;
}

pub mod exit_kind {
    pub const AUCTION: u8 = 0;
    pub const LISTING: u8 = 1;
}

pub mod listing_status {
    pub const OPEN: u8 = 0;
    pub const SOLD: u8 = 1;
    pub const CANCELLED: u8 = 2;
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub fee_wallet: Pubkey,
    pub execution_fee_bps: u16,
    pub settlement_fee_bps: u16,
    pub max_fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
    pub reserved: [u8; 64],
}

#[account]
#[derive(InitSpace)]
pub struct Posse {
    pub organizer: Pubkey,
    pub nonce: u64,
    pub vault_bump: u8,
    pub bump: u8,
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub royalty_recipient: Pubkey,
    pub royalty_bps: u16,
    pub target_lamports: u64,
    pub max_price_lamports: u64,
    pub fee_bps: u16,
    pub created_at: i64,
    pub closes_at: i64,
    pub status: u8,
    pub raised_lamports: u64,
    pub contributor_count: u32,
    pub exit_kind: u8,
    pub exit_day: u16,
    pub exit_price_lamports: u64,
    pub exit_hours: u16,
    pub price_lamports: u64,
    pub exec_fee_lamports: u64,
    pub returned_lamports: u64,
    pub bought_at: i64,
    pub shares_issued_at: i64,
    pub custody_rent_payer: Pubkey,
    pub settle_fee_bps: u16,
    pub funded_at: i64,
    pub final_claims: u32,
    pub vault_rent: u64,
    pub reserved: [u8; 64],
}

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub posse: Pubkey,
    pub contributor: Pubkey,
    pub amount_lamports: u64,
    pub first_at: i64,
    pub returned_claimed: bool,
    pub final_claimed: bool,
    pub bump: u8,
    pub reserved: [u8; 32],
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub ask_lamports: u64,
    pub status: u8,
    pub created_at: i64,
    pub escrow_bump: u8,
    pub bump: u8,
    pub reserved: [u8; 32],
}

#[account]
#[derive(InitSpace)]
pub struct Disposition {
    pub posse: Pubkey,
    pub kind: u8,
    pub starts_at: i64,
    pub ends_at: i64,
    pub reserve_lamports: u64,
    pub high_bid_lamports: u64,
    pub high_bidder: Pubkey,
    pub bid_count: u32,
    pub bid_escrow_bump: u8,
    pub settled: bool,
    pub sale_lamports: u64,
    pub royalty_lamports: u64,
    pub settle_fee_lamports: u64,
    pub net_lamports: u64,
    pub buyer: Pubkey,
    pub settled_at: i64,
    pub bump: u8,
    pub rent_payer: Pubkey,
    pub reserved: [u8; 32],
}
