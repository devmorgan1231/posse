import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { ata, bn, pda, rawIx, type DispositionAccount, type PosseAccount } from "./program";

const pk = (x: PublicKey | string) => (typeof x === "string" ? new PublicKey(x) : x);

export interface CreatePosseParams {
  organizer: PublicKey;
  mint: PublicKey;
  nonce: bigint;
  seller: PublicKey;
  royaltyRecipient: PublicKey;
  royaltyBps: number;
  targetLamports: bigint;
  maxPriceLamports: bigint;
  closesAt: bigint;
  exitKind: 0 | 1;
  exitDay: number;
  exitPriceLamports: bigint;
  exitHours: number;
}