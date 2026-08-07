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
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const bytesEqual = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const find = (seeds: Uint8Array[], program = POSSE_VAULT_PROGRAM_ID) => PublicKey.findProgramAddressSync(seeds, program);

export const pda = {
  config: () => find([enc("config")])[0],
  posse: (organizer: PublicKey, nonce: bigint | number) => find([enc("posse"), organizer.toBytes(), u64le(nonce)])[0],
  vault: (posse: PublicKey) => find([enc("vault"), posse.toBytes()])[0],
  contribution: (posse: PublicKey, contributor: PublicKey) => find([enc("contribution"), posse.toBytes(), contributor.toBytes()])[0],
  listing: (seller: PublicKey, mint: PublicKey) => find([enc("listing"), seller.toBytes(), mint.toBytes()])[0],
  disposition: (posse: PublicKey) => find([enc("disposition"), posse.toBytes()])[0],
  bidEscrow: (posse: PublicKey) => find([enc("bid-escrow"), posse.toBytes()])[0],
  eventAuthority: () => find([enc("__event_authority")])[0],
  programData: () => find([POSSE_VAULT_PROGRAM_ID.toBytes()], BPF_LOADER_UPGRADEABLE_ID)[0],
};

export const ata = (owner: PublicKey, mint: PublicKey) => getAssociatedTokenAddressSync(mint, owner, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

type IdlIxAccount = { name: string; writable?: boolean; signer?: boolean; optional?: boolean; address?: string; pda?: unknown };
type IdlIx = { name: string; accounts: IdlIxAccount[]; args: { name: string }[] };
const IX_BY_NAME = new Map<string, IdlIx>((IDL.instructions as unknown as IdlIx[]).map((i) => [i.name, i]));

const DEFAULTS: Record<string, () => PublicKey> = {
  event_authority: pda.eventAuthority,
  program: () => POSSE_VAULT_PROGRAM_ID,
  config: pda.config,
  system_program: () => SYSTEM_PROGRAM_ID,
  token_program: () => TOKEN_PROGRAM_ID,
  associated_token_program: () => ASSOCIATED_TOKEN_PROGRAM_ID,
};

export function rawIx(name: string, accounts: Record<string, PublicKey | null | undefined>, args: Record<string, unknown> = {}): TransactionInstruction {
  const ix = IX_BY_NAME.get(name);
  if (!ix) throw new Error(`unknown instruction ${name}`);
  const keys: AccountMeta[] = ix.accounts.map((a) => {
    const given = accounts[a.name];
    if (given === null && a.optional) return { pubkey: POSSE_VAULT_PROGRAM_ID, isSigner: false, isWritable: false };
    const pk = given ?? (a.address ? new PublicKey(a.address) : DEFAULTS[a.name]?.());
    if (!pk) throw new Error(`${name}: account ${a.name} missing`);
    return { pubkey: pk, isSigner: !!a.signer, isWritable: !!a.writable };
  });
  const data = coder.instruction.encode(name, args);
  return new TransactionInstruction({ programId: POSSE_VAULT_PROGRAM_ID, keys, data });
}

export const bn = (n: bigint | number) => new BN(n.toString());

function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (BN.isBN(v)) return BigInt((v as BN).toString());
  if (v instanceof PublicKey || (typeof v === "object" && v !== null && "toBase58" in v && typeof (v as PublicKey).toBase58 === "function")) {
    return (v as PublicKey).toBase58();
  }
  if (Array.isArray(v)) return v.map(normalize);
  if (v instanceof Uint8Array) return v;
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k === "reserved") continue;
      out[k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())] = normalize(x);
    }
    return out;
  }
  return v;
}

export interface ConfigAccount {
  admin: string;
  feeWallet: string;
  executionFeeBps: number;
  settlementFeeBps: number;
  maxFeeBps: number;
  paused: boolean;
  bump: number;
}
export interface PosseAccount {
  organizer: string;
  nonce: bigint;
  vaultBump: number;
  bump: number;
  mint: string;
  seller: string;
  royaltyRecipient: string;
  royaltyBps: number;
  targetLamports: bigint;
  maxPriceLamports: bigint;
  feeBps: number;
  createdAt: bigint;
  closesAt: bigint;
  status: number;
  raisedLamports: bigint;
  contributorCount: number;
  exitKind: number;
  exitDay: number;
  exitPriceLamports: bigint;
  exitHours: number;
  priceLamports: bigint;
  execFeeLamports: bigint;
  returnedLamports: bigint;
  boughtAt: bigint;
  sharesIssuedAt: bigint;
  custodyRentPayer: string;
  settleFeeBps: number;
  fundedAt: bigint;
  finalClaims: number;
  vaultRent: bigint;
}
export interface ContributionAccount {
  posse: string;
  contributor: string;
  amountLamports: bigint;
  firstAt: bigint;
  returnedClaimed: boolean;
  finalClaimed: boolean;
  bump: number;
}