import { BorshCoder, BN, type Idl } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction, type AccountMeta } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";
import idlJson from "./idl/posse_vault.json";

export const IDL = idlJson as unknown as Idl & { address: string };
export const POSSE_VAULT_PROGRAM_ID = new PublicKey(idlJson.address);
export const BPF_LOADER_UPGRADEABLE_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
export const coder = new BorshCoder(IDL);

export const BPS_DENOM = BigInt(10_000);
export const MIN_EXIT_PRICE_LAMPORTS = BigInt(10_000_000);
export const MIN_BID_INCREMENT_LAMPORTS = BigInt(10_000_000);
export const MAX_EXIT_HOURS = 720;
export const DEFAULT_EXECUTION_FEE_BPS = 50;
export const DEFAULT_SETTLEMENT_FEE_BPS = 50;
export const DEFAULT_MAX_FEE_BPS = 200;

export const POSSE_STATUS = ["open", "raising", "funded", "bought", "held", "disposing", "settled", "refunded"] as const;
export type PosseStatusName = (typeof POSSE_STATUS)[number];
export const STATUS = { OPEN: 0, RAISING: 1, FUNDED: 2, BOUGHT: 3, HELD: 4, DISPOSING: 5, SETTLED: 6, REFUNDING: 7 } as const;
export const EXIT_KIND = { AUCTION: 0, LISTING: 1 } as const;
export const LISTING_STATUS = ["open", "sold", "cancelled"] as const;

export function statusName(raw: number): PosseStatusName {
  const s = POSSE_STATUS[raw];
  if (!s) throw new Error(`unknown posse status ${raw}`);
  return s;
}

const enc = (s: string) => new TextEncoder().encode(s);
export function u64le(n: bigint | number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
  return b;
}