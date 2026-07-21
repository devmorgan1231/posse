use anchor_lang::prelude::*;

#[error_code]
pub enum PosseError {
    #[msg("signer is not the program upgrade authority")]
    NotUpgradeAuthority,
    #[msg("signer is not the config admin")]
    NotAdmin,
    #[msg("fee bps above the cap")]
    FeeAboveCap,
    #[msg("new posses and chips are paused")]
    Paused,
    #[msg("asset mint must have 0 decimals")]
    NotNftDecimals,
    #[msg("asset mint can still mint more (supply != 1 and mint authority set)")]
    NotNftSupply,
    #[msg("invalid amount")]
    InvalidAmount,
    #[msg("deadline must be in the future")]
    DeadlineInPast,
    #[msg("invalid exit terms")]
    InvalidExit,
    #[msg("royalty bps above 10000")]
    InvalidRoyalty,
    #[msg("posse status does not allow this")]
    BadStatus,
    #[msg("deadline passed")]
    DeadlinePassed,
    #[msg("deadline not reached")]
    DeadlineNotReached,
    #[msg("posse is full")]
    NoHeadroom,
    #[msg("listing is not open")]
    ListingNotOpen,
    #[msg("listing mint does not match the posse mint")]
    MintMismatch,
    #[msg("listing seller does not match the posse seller")]
    SellerMismatch,
    #[msg("ask is above the posse max price")]
    PriceAboveMax,
    #[msg("raised does not cover price + fee")]
    Unaffordable,
    #[msg("escrow does not hold exactly one asset")]
    EscrowEmpty,
    #[msg("account does not match the recorded recipient")]
    RecipientMismatch,
    #[msg("fee wallet does not match config")]
    FeeWalletMismatch,
    #[msg("exit hold period not over")]
    HoldNotOver,
    #[msg("wrong disposition kind")]
    WrongKind,
    #[msg("auction not live")]
    AuctionNotLive,
    #[msg("bid below reserve")]
    BidBelowReserve,
    #[msg("bid below the minimum increment")]
    BidIncrementTooSmall,
    #[msg("previous bidder account missing or wrong")]
    PrevBidderMismatch,
    #[msg("auction has not ended")]
    AuctionNotEnded,
    #[msg("already settled")]
    AlreadySettled,
    #[msg("already claimed")]
    AlreadyClaimed,
    #[msg("nothing to claim")]
    NothingToClaim,
    #[msg("contributions still unclaimed")]
    ClaimsOutstanding,
    #[msg("disposition account missing or wrong")]
    DispositionMismatch,
    #[msg("vault would drop below its rent reserve")]
    VaultRentBreach,
    #[msg("seller does not hold the asset")]
    SellerHasNoAsset,
    #[msg("arithmetic overflow")]
    MathOverflow,
    #[msg("winner token account missing or wrong")]
    WinnerAccountMismatch,
    #[msg("only the organizer may crank (mutation control build)")]
    MutantOrganizerOnly,
}
