import { ComputeBudgetProgram, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";

export const TX_SIZE_BUDGET = 1030;

export const CU_LIMIT: Record<string, number> = {
  initialize_config: 40_000,
  update_config: 20_000,
  create_posse: 60_000,
  contribute: 60_000,
  withdraw: 40_000,
  list_asset: 90_000,
  cancel_listing: 70_000,
  execute_purchase: 120_000,
  issue_shares: 20_000,
  expire: 20_000,
  start_disposition: 60_000,
  bid: 40_000,
  settle_auction: 130_000,
  buy_listed: 120_000,
  claim_returned: 40_000,
  claim_proceeds: 50_000,
  claim_refund: 40_000,
  close_posse: 50_000,
};