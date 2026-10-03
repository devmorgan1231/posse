import assert from "node:assert/strict";
import { Keypair, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
  POSSE_ERRORS,
  STATUS,
  ata,
  decodeAccount,
  errorName,
  feeOf,
  ix,
  pda,
  shareOf,
  type DispositionAccount,
  type PosseAccount,
} from "../../sdk/index.ts";
import type { Chain, SendResult } from "./chain.ts";

const SOL = 1_000_000_000n;
const ACCOUNT_NOT_INITIALIZED = 3012;
const TX_BUDGET = 1030;

export interface Ctx {
  chain: Chain;
  admin: Keypair;
  feeWallet: Keypair;
  log: (s: string) => void;
  stats: Map<string, { n: number; maxBytes: number; maxCu: number }>;
  nonce: bigint;
}

type Scenario = [string, (c: Ctx) => Promise<void>];

async function tx(c: Ctx, label: string, ixs: TransactionInstruction[], signers: Keypair[], feePayer?: Keypair): Promise<SendResult> {
  const r = await c.chain.send(ixs, signers, feePayer);
  const s = c.stats.get(label) ?? { n: 0, maxBytes: 0, maxCu: 0 };
  s.n++;
  s.maxBytes = Math.max(s.maxBytes, r.bytes);
  if (r.ok) s.maxCu = Math.max(s.maxCu, r.cu);
  c.stats.set(label, s);
  return r;
}