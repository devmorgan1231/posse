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

async function makePosse(
  c: Ctx,
  o: {
    target?: bigint;
    maxPrice?: bigint;
    closesIn?: number;
    exitKind?: 0 | 1;
    exitDay?: number;
    exitPrice?: bigint;
    exitHours?: number;
    royaltyBps?: number;
    royaltyTo?: PublicKey;
    mint?: PublicKey;
    seller?: Keypair;
  } = {},
): Promise<Made> {
  const organizer = await c.chain.wallet(5);
  const seller = o.seller ?? (await c.chain.wallet(5));
  const royalty = await c.chain.wallet(1);
  const mint = o.mint ?? (await c.chain.createNft(seller.publicKey));
  const now = await c.chain.now();
  const closesAt = now + (o.closesIn ?? 7 * 86_400);
  c.nonce += 1n;
  const made = ix.createPosse({
    organizer: organizer.publicKey,
    mint,
    nonce: c.nonce,
    seller: seller.publicKey,
    royaltyRecipient: o.royaltyTo ?? royalty.publicKey,
    royaltyBps: o.royaltyBps ?? 500,
    targetLamports: o.target ?? 10n * SOL,
    maxPriceLamports: o.maxPrice ?? 9n * SOL + SOL / 2n,
    closesAt: BigInt(closesAt),
    exitKind: o.exitKind ?? 0,
    exitDay: o.exitDay ?? 0,
    exitPriceLamports: o.exitPrice ?? 12n * SOL,
    exitHours: o.exitHours ?? ((o.exitKind ?? 0) === 0 ? 1 : 0),
  });
  ok(await tx(c, "create_posse", [made.ix], [organizer], organizer), "create_posse");
  return { posse: made.posse, mint, seller, organizer, royalty, closesAt };
}

const chip = (c: Ctx, who: Keypair, posse: PublicKey, amount: bigint) => tx(c, "contribute", [ix.contribute(who.publicKey, posse, amount)], [who]);
const list = (c: Ctx, seller: Keypair, mint: PublicKey, ask: bigint) => tx(c, "list_asset", [ix.listAsset(seller.publicKey, mint, ask)], [seller]);
const execute = (c: Ctx, caller: Keypair, m: Made, over: { listingSeller?: PublicKey; listingMint?: PublicKey; payTo?: PublicKey; feeWallet?: PublicKey } = {}) =>
  tx(
    c,
    "execute_purchase",
    [
      ix.executePurchase({
        caller: caller.publicKey,
        posse: m.posse,
        feeWallet: over.feeWallet ?? c.feeWallet.publicKey,
        listingSeller: over.listingSeller ?? m.seller.publicKey,
        listingMint: over.listingMint ?? m.mint,
        payTo: over.payTo,
      }),
    ],
    [caller],
  );

async function fund(c: Ctx, m: Made, amounts: bigint[]): Promise<Keypair[]> {
  const ws: Keypair[] = [];
  for (const a of amounts) {
    const w = await c.chain.wallet(Number(a / SOL) + 2);
    ok(await chip(c, w, m.posse, a), "contribute");
    ws.push(w);
  }
  return ws;
}

async function settleIx(c: Ctx, caller: Keypair, m: Made) {
  const p = await posseOf(c, m.posse);
  const d = await dispOf(c, m.posse);
  return ix.settleAuction({ caller: caller.publicKey, posse: m.posse, p, d, feeWallet: c.feeWallet.publicKey });
}