use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod util;

pub use instructions::*;

declare_id!("629C4PESAxcsvb82LEtYtVevevEY8HZEidMPf9KcjNNx");

#[program]
pub mod posse_vault {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_wallet: Pubkey,
        execution_fee_bps: u16,
        settlement_fee_bps: u16,
        max_fee_bps: u16,
    ) -> Result<()> {
        initialize_config::handler(
            ctx,
            fee_wallet,
            execution_fee_bps,
            settlement_fee_bps,
            max_fee_bps,
        )
    }

    pub fn update_config(ctx: Context<UpdateConfig>, args: UpdateConfigArgs) -> Result<()> {
        update_config::handler(ctx, args)
    }

    pub fn create_posse(ctx: Context<CreatePosse>, args: CreatePosseArgs) -> Result<()> {
        create_posse::handler(ctx, args)
    }

    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        contribute::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        withdraw::handler(ctx)
    }

    pub fn list_asset(ctx: Context<ListAsset>, ask_lamports: u64) -> Result<()> {
        list_asset::handler(ctx, ask_lamports)
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        cancel_listing::handler(ctx)
    }

    pub fn execute_purchase(ctx: Context<ExecutePurchase>) -> Result<()> {
        execute_purchase::handler(ctx)
    }

    pub fn issue_shares(ctx: Context<Crank>) -> Result<()> {
        issue_shares::handler(ctx)
    }

    pub fn expire(ctx: Context<Crank>) -> Result<()> {
        expire::handler(ctx)
    }

    pub fn start_disposition(ctx: Context<StartDisposition>) -> Result<()> {
        start_disposition::handler(ctx)
    }

    pub fn bid(ctx: Context<Bid>, amount: u64) -> Result<()> {
        bid::handler(ctx, amount)
    }

    pub fn settle_auction(ctx: Context<SettleAuction>) -> Result<()> {
        settle_auction::handler(ctx)
    }

    pub fn buy_listed(ctx: Context<BuyListed>) -> Result<()> {
        buy_listed::handler(ctx)
    }

    pub fn claim_returned(ctx: Context<ClaimReturned>) -> Result<()> {
        claim_returned::handler(ctx)
    }

    pub fn claim_proceeds(ctx: Context<ClaimProceeds>) -> Result<()> {
        claim_proceeds::handler(ctx)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        claim_refund::handler(ctx)
    }

    pub fn close_posse(ctx: Context<ClosePosse>) -> Result<()> {
        close_posse::handler(ctx)
    }
}
