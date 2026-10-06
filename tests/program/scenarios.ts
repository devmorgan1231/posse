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

function ok(r: SendResult, what: string): SendResult {
  if (!r.ok) assert.fail(`${what} failed: ${errorName(r.code)} ${r.err.slice(0, 200)} | ${r.logs.slice(-4).join(" | ")}`);
  return r;
}

function rejects(r: SendResult, expected: string | number, what: string) {
  const code = typeof expected === "number" ? expected : POSSE_ERRORS[expected];
  assert.ok(code !== undefined, `unknown error name ${expected}`);
  assert.equal(r.ok, false, `${what}: expected rejection ${expected}, but it succeeded`);
  assert.equal(r.code, code, `${what}: expected ${expected} (${code}), got ${errorName(r.code)} | ${r.err.slice(0, 160)}`);
}

async function posseOf(c: Ctx, k: PublicKey): Promise<PosseAccount> {
  const d = await c.chain.data(k);
  assert.ok(d, "posse account missing");
  return decodeAccount("Posse", d);
}
async function dispOf(c: Ctx, posse: PublicKey): Promise<DispositionAccount> {
  const d = await c.chain.data(pda.disposition(posse));
  assert.ok(d, "disposition missing");
  return decodeAccount("Disposition", d);
}
async function rentOf(c: Ctx, k: PublicKey): Promise<bigint> {
  return c.chain.rentExempt((await c.chain.data(k))?.length ?? 0);
}
const delta = async (c: Ctx, k: PublicKey, f: () => Promise<unknown>) => {
  const b = await c.chain.lamports(k);
  await f();
  return (await c.chain.lamports(k)) - b;
};

async function assertVault(c: Ctx, posse: PublicKey, pool: bigint, what: string) {
  const p = await posseOf(c, posse);
  const v = await c.chain.lamports(pda.vault(posse));
  assert.ok(p.vaultRent > 0n, `${what}: vault rent reserve not recorded`);
  assert.equal(v, p.vaultRent + pool, `${what}: vault ${v} != rent ${p.vaultRent} + pool ${pool}`);
}

interface Made {
  posse: PublicKey;
  mint: PublicKey;
  seller: Keypair;
  organizer: Keypair;
  royalty: Keypair;
  closesAt: number;
}