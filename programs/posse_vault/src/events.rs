use anchor_lang::prelude::*;

#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub fee_wallet: Pubkey,
    pub execution_fee_bps: u16,
    pub settlement_fee_bps: u16,
    pub paused: bool,
}

#[event]
pub struct PosseCreated {
    pub posse: Pubkey,
    pub organizer: Pubkey,
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub target: u64,
    pub max_price: u64,
    pub fee_bps: u16,
    pub closes_at: i64,
    pub exit_kind: u8,
    pub exit_day: u16,
    pub exit_price: u64,
    pub exit_hours: u16,
    pub royalty_bps: u16,
    pub royalty_recipient: Pubkey,
    pub nonce: u64,
}

#[event]
pub struct ChippedIn {
    pub posse: Pubkey,
    pub contributor: Pubkey,
    pub accepted: u64,
    pub new_raised: u64,
    pub contributor_count: u32,
}

#[event]
pub struct Funded {
    pub posse: Pubkey,
    pub raised: u64,
}

#[event]
pub struct Withdrew {
    pub posse: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
    pub new_raised: u64,
}

#[event]
pub struct AssetListed {
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub ask: u64,
}

#[event]
pub struct ListingCancelled {
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct Purchased {
    pub posse: Pubkey,
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub price: u64,
    pub fee: u64,
    pub returned: u64,
    pub at: i64,
}

#[event]
pub struct SharesIssued {
    pub posse: Pubkey,
    pub at: i64,
}

#[event]
pub struct Expired {
    pub posse: Pubkey,
    pub at: i64,
}

#[event]
pub struct DispositionStarted {
    pub posse: Pubkey,
    pub kind: u8,
    pub starts_at: i64,
    pub ends_at: i64,
    pub reserve: u64,
}

#[event]
pub struct BidPlaced {
    pub posse: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub prev_bidder: Pubkey,
    pub prev_refund: u64,
    pub at: i64,
}

#[event]
pub struct Settled {
    pub posse: Pubkey,
    pub buyer: Pubkey,
    pub sale: u64,
    pub royalty: u64,
    pub fee: u64,
    pub net: u64,
    pub at: i64,
}

#[event]
pub struct DispositionFailed {
    pub posse: Pubkey,
    pub at: i64,
}

#[event]
pub struct ReturnedClaimed {
    pub posse: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ProceedsClaimed {
    pub posse: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RefundClaimed {
    pub posse: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PosseClosed {
    pub posse: Pubkey,
    pub dust_to_fee_wallet: u64,
    pub rent_to_organizer: u64,
    pub at: i64,
}
