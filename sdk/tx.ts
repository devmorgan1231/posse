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

export interface BuildTxOptions {
  feePayer: PublicKey;
  recentBlockhash: string;
  cuLimit?: number;
  cuPriceMicroLamports?: number;
  actions?: string[];
}

export function buildPosseTx(ixs: TransactionInstruction[], o: BuildTxOptions): Transaction {
  const limit = o.cuLimit ?? (o.actions?.length ? o.actions.reduce((s, a) => s + (CU_LIMIT[a] ?? 60_000), 0) : 200_000);
  const tx = new Transaction({ feePayer: o.feePayer, recentBlockhash: o.recentBlockhash });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: Math.min(limit, 1_400_000) }));
  if ((o.cuPriceMicroLamports ?? 0) > 0) tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: o.cuPriceMicroLamports! }));
  tx.add(...ixs);
  return tx;
}