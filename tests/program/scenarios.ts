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

export async function setup(chain: Chain, log: (s: string) => void): Promise<Ctx> {
  const feeWallet = await chain.wallet(1);
  const c: Ctx = { chain, admin: chain.admin, feeWallet, log, stats: new Map(), nonce: BigInt(Date.now()) * 1000n };
  const intruder = await chain.wallet(2);
  rejects(
    await tx(c, "initialize_config", [ix.initializeConfig(intruder.publicKey, intruder.publicKey, 50, 50, 200)], [intruder], intruder),
    "NotUpgradeAuthority",
    "initialize_config by a non-authority",
  );
  rejects(
    await tx(c, "initialize_config", [ix.initializeConfig(c.admin.publicKey, feeWallet.publicKey, 50, 50, 1001)], [c.admin], c.admin),
    "FeeAboveCap",
    "initialize_config with max fee above the 10% ceiling",
  );
  ok(await tx(c, "initialize_config", [ix.initializeConfig(c.admin.publicKey, feeWallet.publicKey, 50, 50, 200)], [c.admin], c.admin), "initialize_config");
  const cfg = decodeAccount("Config", (await chain.data(pda.config()))!);
  assert.equal(cfg.admin, c.admin.publicKey.toBase58());
  assert.equal(cfg.feeWallet, feeWallet.publicKey.toBase58());
  assert.deepEqual([cfg.executionFeeBps, cfg.settlementFeeBps, cfg.maxFeeBps, cfg.paused], [50, 50, 200, false]);
  log(`config admin=${cfg.admin.slice(0, 6)} fee_wallet=${cfg.feeWallet.slice(0, 6)} exec=50bps settle=50bps max=200bps`);
  return c;
}

export const SCENARIOS: Scenario[] = [
  [
    "happy auction: chip -> funded (clamp) -> list -> execute -> shares -> auction (outbid refund) -> settle -> claims (floor) -> close",
    async (c) => {
      const m = await makePosse(c, { target: 10n * SOL + 7n, maxPrice: 9n * SOL + SOL / 2n, royaltyBps: 500, exitPrice: 12n * SOL, exitHours: 2 });
      let p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.OPEN);
      assert.equal(p.feeBps, 50);
      assert.equal(p.settleFeeBps, 50);
      await assertVault(c, m.posse, 0n, "after create");

      const raw = (await c.chain.data(m.posse))!;
      assert.equal(new PublicKey(raw.subarray(8, 40)).toBase58(), p.organizer);
      assert.equal(raw.readBigUInt64LE(40), p.nonce);
      assert.equal(new PublicKey(raw.subarray(50, 82)).toBase58(), p.mint);
      assert.equal(new PublicKey(raw.subarray(82, 114)).toBase58(), p.seller);
      assert.equal(raw.readBigUInt64LE(148), p.targetLamports);
      assert.equal(raw.readUInt8(182), p.status);

      const A = await c.chain.wallet(10);
      const B = await c.chain.wallet(10);
      const C = await c.chain.wallet(10);
      const r1 = ok(await chip(c, A, m.posse, 3n * SOL + 1n), "chip A");
      assert.deepEqual(r1.events.map((e) => e.name), ["ChippedIn"]);
      p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.RAISING);
      ok(await chip(c, B, m.posse, 4n * SOL + 3n), "chip B");
      const cRent = await c.chain.rentExempt(8 + 115);
      const dC = await delta(c, C.publicKey, async () => {
        const r = ok(await chip(c, C, m.posse, 5n * SOL), "chip C");
        assert.deepEqual(r.events.map((e) => e.name), ["ChippedIn", "Funded"]);
        assert.equal(r.events[0]!.data.accepted, 3n * SOL + 3n);
      });
      assert.equal(dC, -(3n * SOL + 3n) - cRent, "C paid exactly the headroom + contribution rent");
      p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.FUNDED);
      assert.equal(p.raisedLamports, p.targetLamports);
      assert.equal(p.contributorCount, 3);
      await assertVault(c, m.posse, p.raisedLamports, "funded");

      const ask = 9n * SOL;
      ok(await list(c, m.seller, m.mint, ask), "list_asset");
      const K = await c.chain.wallet(5);
      const fee = feeOf(ask, 50);
      const sellerBefore = await c.chain.lamports(m.seller.publicKey);
      const feeBefore = await c.chain.lamports(c.feeWallet.publicKey);
      const listingRent = await rentOf(c, pda.listing(m.seller.publicKey, m.mint));
      const escrowRent = await rentOf(c, ata(pda.listing(m.seller.publicKey, m.mint), m.mint));
      const ex = ok(await execute(c, K, m), "execute_purchase");
      assert.deepEqual(ex.events.map((e) => e.name), ["Purchased"]);
      assert.equal((await c.chain.lamports(m.seller.publicKey)) - sellerBefore, ask + listingRent + escrowRent, "seller got exactly the ask + its rents back");
      assert.equal((await c.chain.lamports(c.feeWallet.publicKey)) - feeBefore, fee, "fee wallet got exactly 0.5%");
      assert.equal(await c.chain.tokenBal(ata(pda.vault(m.posse), m.mint)), 1n, "vault custody holds the asset");
      assert.equal(await c.chain.data(pda.listing(m.seller.publicKey, m.mint)), null, "listing closed");
      p = await posseOf(c, m.posse);
      const returned = p.raisedLamports - ask - fee;
      assert.deepEqual([p.status, p.priceLamports, p.execFeeLamports, p.returnedLamports], [STATUS.BOUGHT, ask, fee, returned]);
      assert.equal(p.custodyRentPayer, K.publicKey.toBase58());
      await assertVault(c, m.posse, returned, "bought");

      ok(await tx(c, "issue_shares", [ix.issueShares(K.publicKey, m.posse)], [K]), "issue_shares");
      p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.HELD);
      assert.ok(p.sharesIssuedAt > 0n);
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "start_disposition");
      let d = await dispOf(c, m.posse);
      assert.equal(d.reserveLamports, 12n * SOL);
      assert.equal(d.endsAt - d.startsAt, 2n * 3600n);

      const X = await c.chain.wallet(30);
      const Y = await c.chain.wallet(30);
      rejects(await tx(c, "bid", [ix.bid(X.publicKey, m.posse, 12n * SOL - 1n, null)], [X]), "BidBelowReserve", "bid below reserve");
      ok(await tx(c, "bid", [ix.bid(X.publicKey, m.posse, 12n * SOL, null)], [X]), "bid X");
      rejects(await tx(c, "bid", [ix.bid(Y.publicKey, m.posse, 12n * SOL + SOL / 20n, X.publicKey)], [Y]), "BidIncrementTooSmall", "bid under increment");
      rejects(await tx(c, "bid", [ix.bid(Y.publicKey, m.posse, 13n * SOL, Y.publicKey)], [Y]), "PrevBidderMismatch", "bid naming the wrong previous bidder");
      const dX = await delta(c, X.publicKey, async () => {
        ok(await tx(c, "bid", [ix.bid(Y.publicKey, m.posse, 12n * SOL + SOL / 5n, X.publicKey)], [Y]), "bid Y outbids X");
      });
      assert.equal(dX, 12n * SOL, "X refunded exactly its bid in the outbid tx");
      assert.equal(await c.chain.lamports(pda.bidEscrow(m.posse)), 12n * SOL + SOL / 5n, "escrow holds only the high bid");
      d = await dispOf(c, m.posse);
      assert.deepEqual([d.highBidder, d.highBidLamports, d.bidCount], [Y.publicKey.toBase58(), 12n * SOL + SOL / 5n, 2]);

      rejects(await tx(c, "settle_auction", [await settleIx(c, K, m)], [K]), "AuctionNotEnded", "settle before end");
      await c.chain.warpTo(Number(d.endsAt));
      rejects(await tx(c, "bid", [ix.bid(X.publicKey, m.posse, 14n * SOL, Y.publicKey)], [X]), "AuctionNotLive", "bid after end");
      ok(await tx(c, "stray", [(await import("@solana/web3.js")).SystemProgram.transfer({ fromPubkey: X.publicKey, toPubkey: pda.bidEscrow(m.posse), lamports: 1 })], [X]), "stray lamport");

      const sale = 12n * SOL + SOL / 5n;
      const royalty = feeOf(sale, 500);
      const sfee = feeOf(sale, 50);
      const net = sale - royalty - sfee;
      const custodyRent = await rentOf(c, ata(pda.vault(m.posse), m.mint));
      const royBefore = await c.chain.lamports(m.royalty.publicKey);
      const feeBefore2 = await c.chain.lamports(c.feeWallet.publicKey);
      const dK = await delta(c, K.publicKey, async () => {
        const r = ok(await tx(c, "settle_auction", [await settleIx(c, K, m)], [K]), "settle_auction");
        assert.ok(r.events.some((e) => e.name === "Settled"));
      });
      assert.equal(dK, custodyRent - (await c.chain.rentExempt(165)), "custody rent went back to its payer, not into the vault");
      assert.equal(await c.chain.tokenBal(ata(Y.publicKey, m.mint)), 1n, "winner holds the asset");
      assert.equal(await c.chain.data(ata(pda.vault(m.posse), m.mint)), null, "custody closed");
      assert.equal((await c.chain.lamports(m.royalty.publicKey)) - royBefore, royalty, "royalty paid");
      assert.equal((await c.chain.lamports(c.feeWallet.publicKey)) - feeBefore2, sfee, "settlement fee paid");
      d = await dispOf(c, m.posse);
      assert.deepEqual([d.settled, d.saleLamports, d.royaltyLamports, d.settleFeeLamports, d.netLamports], [true, sale, royalty, sfee, net]);
      p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.SETTLED);
      await assertVault(c, m.posse, returned + net + 1n, "settled (+1 stray lamport)");

      rejects(
        await tx(c, "close_posse", [ix.closePosse({ caller: K.publicKey, posse: m.posse, organizer: m.organizer.publicKey, feeWallet: c.feeWallet.publicKey, dispositionRentPayer: K.publicKey })], [K]),
        "ClaimsOutstanding",
        "close before claims",
      );
      let paid = 0n;
      for (const [w, amt] of [
        [A, 3n * SOL + 1n],
        [B, 4n * SOL + 3n],
        [C, 3n * SOL + 3n],
      ] as const) {
        const expected = shareOf(returned, amt, p.raisedLamports) + shareOf(net, amt, p.raisedLamports);
        const dw = await delta(c, w.publicKey, async () => {
          const r = ok(await tx(c, "claim_proceeds", [ix.claimProceeds(w.publicKey, m.posse)], [w]), "claim_proceeds");
          assert.deepEqual(r.events.map((e) => e.name), ["ReturnedClaimed", "ProceedsClaimed"]);
        });
        assert.equal(dw, expected + cRent, "payout = floor share + contribution rent back");
        paid += expected;
      }
      rejects(await tx(c, "claim_proceeds", [ix.claimProceeds(A.publicKey, m.posse)], [A]), ACCOUNT_NOT_INITIALIZED, "second claim_proceeds");
      const dust = returned + net - paid;
      assert.ok(dust >= 0n && dust < 6n, `dust ${dust} must be < 2 pools x contributor count`);
      await assertVault(c, m.posse, dust + 1n, "after claims");

      const orgBefore = await c.chain.lamports(m.organizer.publicKey);
      const vaultRent = p.vaultRent;
      const posseRent = await rentOf(c, m.posse);
      const r = ok(
        await tx(c, "close_posse", [ix.closePosse({ caller: K.publicKey, posse: m.posse, organizer: m.organizer.publicKey, feeWallet: c.feeWallet.publicKey, dispositionRentPayer: K.publicKey })], [K]),
        "close_posse",
      );
      assert.equal(r.events.find((e) => e.name === "PosseClosed")!.data.dustToFeeWallet, dust + 1n);
      assert.equal((await c.chain.lamports(m.organizer.publicKey)) - orgBefore, vaultRent + posseRent, "organizer got vault rent + posse rent");
      assert.equal(await c.chain.lamports(pda.vault(m.posse)), 0n);
      assert.equal(await c.chain.data(m.posse), null);
      assert.equal(await c.chain.data(pda.disposition(m.posse)), null);
      c.log(`auction: raised=${p.raisedLamports} price=${ask} fee=${fee} returned=${returned} sale=${sale} royalty=${royalty} sfee=${sfee} net=${net} dust=${dust}`);
    },
  ],

  [
    "happy listing exit: hold period -> start -> buy_listed -> claim_returned then claim_proceeds -> close",
    async (c) => {
      const m = await makePosse(c, { target: 6n * SOL, maxPrice: 5n * SOL, exitKind: 1, exitDay: 2, exitPrice: 8n * SOL, royaltyBps: 600 });
      const [A, B] = await fund(c, m, [2n * SOL, 4n * SOL]);
      ok(await list(c, m.seller, m.mint, 5n * SOL), "list");
      const K = await c.chain.wallet(5);
      ok(await execute(c, K, m), "execute");
      let p = await posseOf(c, m.posse);
      const returned = p.returnedLamports;
      assert.equal(returned, 6n * SOL - 5n * SOL - feeOf(5n * SOL, 50));
      ok(await tx(c, "issue_shares", [ix.issueShares(K.publicKey, m.posse)], [K]), "issue");
      rejects(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "HoldNotOver", "start before exit_day");
      await c.chain.warpTo(Number(p.boughtAt) + 2 * 86_400);
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "start");
      const shareA = shareOf(returned, 2n * SOL, 6n * SOL);
      const dA1 = await delta(c, A!.publicKey, async () => ok(await tx(c, "claim_returned", [ix.claimReturned(A!.publicKey, m.posse)], [A!]), "claim_returned"));
      assert.equal(dA1, shareA);
      rejects(await tx(c, "claim_returned", [ix.claimReturned(A!.publicKey, m.posse)], [A!]), "AlreadyClaimed", "second claim_returned");
      const buyer = await c.chain.wallet(20);
      p = await posseOf(c, m.posse);
      rejects(await tx(c, "claim_proceeds", [ix.claimProceeds(A!.publicKey, m.posse)], [A!]), "BadStatus", "claim_proceeds before settlement");
      ok(await tx(c, "buy_listed", [ix.buyListed({ buyer: buyer.publicKey, posse: m.posse, p, feeWallet: c.feeWallet.publicKey })], [buyer]), "buy_listed");
      assert.equal(await c.chain.tokenBal(ata(buyer.publicKey, m.mint)), 1n);
      rejects(await tx(c, "buy_listed", [ix.buyListed({ buyer: buyer.publicKey, posse: m.posse, p, feeWallet: c.feeWallet.publicKey })], [buyer]), ACCOUNT_NOT_INITIALIZED, "second buy_listed (custody closed)");
      const d = await dispOf(c, m.posse);
      const net = 8n * SOL - feeOf(8n * SOL, 600) - feeOf(8n * SOL, 50);
      assert.equal(d.netLamports, net);
      const cRent = await c.chain.rentExempt(8 + 115);
      const dA2 = await delta(c, A!.publicKey, async () => ok(await tx(c, "claim_proceeds", [ix.claimProceeds(A!.publicKey, m.posse)], [A!]), "claim A"));
      assert.equal(dA2, shareOf(net, 2n * SOL, 6n * SOL) + cRent, "A: proceeds only (returned already taken)");
      const dB = await delta(c, B!.publicKey, async () => ok(await tx(c, "claim_proceeds", [ix.claimProceeds(B!.publicKey, m.posse)], [B!]), "claim B"));
      assert.equal(dB, shareOf(returned, 4n * SOL, 6n * SOL) + shareOf(net, 4n * SOL, 6n * SOL) + cRent, "B: returned + proceeds");
      ok(
        await tx(c, "close_posse", [ix.closePosse({ caller: K.publicKey, posse: m.posse, organizer: m.organizer.publicKey, feeWallet: c.feeWallet.publicKey, dispositionRentPayer: K.publicKey })], [K]),
        "close",
      );
      assert.equal(await c.chain.lamports(pda.vault(m.posse)), 0n);
    },
  ],

  [
    "not met -> refund: funded but ask above max -> execute rejected -> deadline -> expire -> full refunds -> double claim rejected -> close",
    async (c) => {
      const m = await makePosse(c, { target: 5n * SOL, maxPrice: 4n * SOL, closesIn: 3600 });
      const amounts = [1n * SOL + 11n, 2n * SOL + 13n, 2n * SOL - 24n];
      const ws = await fund(c, m, amounts);
      ok(await list(c, m.seller, m.mint, 4n * SOL + 1n), "list above max");
      const K = await c.chain.wallet(2);
      rejects(await execute(c, K, m), "PriceAboveMax", "execute with ask above max");
      rejects(await tx(c, "claim_refund", [ix.claimRefund(ws[0]!.publicKey, m.posse)], [ws[0]!]), "BadStatus", "refund before the deadline");
      rejects(await tx(c, "expire", [ix.expire(K.publicKey, m.posse)], [K]), "DeadlineNotReached", "expire before the deadline");
      await c.chain.warpTo(m.closesAt + 1);
      ok(await tx(c, "expire", [ix.expire(K.publicKey, m.posse)], [K]), "expire");
      assert.equal((await posseOf(c, m.posse)).status, STATUS.REFUNDING);
      rejects(await execute(c, K, m), "BadStatus", "execute after expiry");
      const cRent = await c.chain.rentExempt(8 + 115);
      let pool = 5n * SOL;
      for (let i = 0; i < ws.length; i++) {
        const d = await delta(c, ws[i]!.publicKey, async () => {
          const r = ok(await tx(c, "claim_refund", [ix.claimRefund(ws[i]!.publicKey, m.posse)], [ws[i]!]), "claim_refund");
          assert.deepEqual(r.events.map((e) => e.name), ["RefundClaimed"]);
        });
        assert.equal(d, amounts[i]! + cRent, "refund = full chip + contribution rent");
        pool -= amounts[i]!;
        await assertVault(c, m.posse, pool, `after refund ${i}`);
      }
      rejects(await tx(c, "claim_refund", [ix.claimRefund(ws[0]!.publicKey, m.posse)], [ws[0]!]), ACCOUNT_NOT_INITIALIZED, "second refund");
      ok(await tx(c, "cancel_listing", [ix.cancelListing(m.seller.publicKey, m.mint)], [m.seller]), "cancel_listing");
      assert.equal(await c.chain.tokenBal(ata(m.seller.publicKey, m.mint)), 1n);
      const p = await posseOf(c, m.posse);
      const orgBefore = await c.chain.lamports(m.organizer.publicKey);
      const posseRent = await rentOf(c, m.posse);
      ok(await tx(c, "close_posse", [ix.closePosse({ caller: K.publicKey, posse: m.posse, organizer: m.organizer.publicKey, feeWallet: c.feeWallet.publicKey, dispositionRentPayer: null })], [K]), "close");
      assert.equal((await c.chain.lamports(m.organizer.publicKey)) - orgBefore, p.vaultRent + posseRent, "organizer got its rents back (I7)");
    },
  ],

  [
    "refund auto-flip: first claim after the deadline flips to Refunding without expire",
    async (c) => {
      const m = await makePosse(c, { target: 3n * SOL, closesIn: 600 });
      const [A] = await fund(c, m, [1n * SOL]);
      await c.chain.warpTo(m.closesAt + 1);
      const r = ok(await tx(c, "claim_refund", [ix.claimRefund(A!.publicKey, m.posse)], [A!]), "claim_refund");
      assert.deepEqual(r.events.map((e) => e.name), ["Expired", "RefundClaimed"]);
      assert.equal((await posseOf(c, m.posse)).status, STATUS.REFUNDING);
    },
  ],

  [
    "price change: seller relists above max (rejected) then lower (executes at the lower ask exactly)",
    async (c) => {
      const m = await makePosse(c, { target: 5n * SOL, maxPrice: 4n * SOL });
      await fund(c, m, [5n * SOL]);
      ok(await list(c, m.seller, m.mint, 3n * SOL), "list at 3");
      ok(await tx(c, "cancel_listing", [ix.cancelListing(m.seller.publicKey, m.mint)], [m.seller]), "cancel");
      ok(await list(c, m.seller, m.mint, 6n * SOL), "relist at 6");
      const K = await c.chain.wallet(2);
      rejects(await execute(c, K, m), "PriceAboveMax", "execute after the price went up");
      ok(await tx(c, "cancel_listing", [ix.cancelListing(m.seller.publicKey, m.mint)], [m.seller]), "cancel");
      ok(await list(c, m.seller, m.mint, 3n * SOL + SOL / 2n), "relist at 3.5");
      const dS = await delta(c, m.seller.publicKey, async () => ok(await execute(c, K, m), "execute"));
      const p = await posseOf(c, m.posse);
      assert.equal(p.priceLamports, 3n * SOL + SOL / 2n);
      assert.ok(dS >= 3n * SOL + SOL / 2n && dS < 3n * SOL + SOL / 2n + SOL / 100n, "seller paid the current ask (+ its rents), nothing more");
      assert.equal(p.returnedLamports, 5n * SOL - p.priceLamports - feeOf(p.priceLamports, 50));
    },
  ],

  [
    "unaffordable: ask <= max but raised < ask + fee is rejected",
    async (c) => {
      const m = await makePosse(c, { target: 4n * SOL, maxPrice: 4n * SOL });
      await fund(c, m, [4n * SOL]);
      ok(await list(c, m.seller, m.mint, 4n * SOL), "list at 4 (fee makes it 4.02)");
      rejects(await execute(c, await c.chain.wallet(1), m), "Unaffordable", "execute without room for the fee");
    },
  ],

  [
    "duplicate execution: second execute is rejected, seller paid once",
    async (c) => {
      const m = await makePosse(c, { target: 5n * SOL, maxPrice: 4n * SOL });
      await fund(c, m, [5n * SOL]);
      ok(await list(c, m.seller, m.mint, 4n * SOL), "list");
      const K = await c.chain.wallet(2);
      const both = await c.chain.sendConcurrent([
        { ixs: [ix.executePurchase({ caller: K.publicKey, posse: m.posse, feeWallet: c.feeWallet.publicKey, listingSeller: m.seller.publicKey, listingMint: m.mint })], signers: [K], feePayer: K },
        { ixs: [ix.executePurchase({ caller: K.publicKey, posse: m.posse, feeWallet: c.feeWallet.publicKey, listingSeller: m.seller.publicKey, listingMint: m.mint })], signers: [K] },
      ]);
      assert.equal(both.filter((r) => r.ok).length, 1, "exactly one execute landed");
      const loser = both.find((r) => !r.ok)!;
      assert.ok(loser.code === ACCOUNT_NOT_INITIALIZED || loser.code === POSSE_ERRORS.BadStatus, `second execute rejected (${errorName(loser.code)})`);
      const p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.BOUGHT);
      assert.equal(await c.chain.lamports(pda.vault(m.posse)), p.vaultRent + p.returnedLamports);
      rejects(await execute(c, K, m), ACCOUNT_NOT_INITIALIZED, "execute again with the listing gone");
    },
  ],

  [
    "seller / asset swap: wrong payee, asset moved to another seller, different asset, wrong fee wallet -- all rejected",
    async (c) => {
      const m = await makePosse(c, { target: 5n * SOL, maxPrice: 4n * SOL });
      await fund(c, m, [5n * SOL]);
      const K = await c.chain.wallet(2);
      const attacker = await c.chain.wallet(5);
      ok(await list(c, m.seller, m.mint, 4n * SOL), "list");
      rejects(await execute(c, K, m, { payTo: attacker.publicKey }), "RecipientMismatch", "execute paying a different wallet");
      rejects(await execute(c, K, m, { feeWallet: attacker.publicKey }), "FeeWalletMismatch", "execute with a different fee wallet");
      const other = await c.chain.createNft(m.seller.publicKey);
      ok(await list(c, m.seller, other, 1n * SOL), "list other asset");
      rejects(await execute(c, K, m, { listingMint: other }), "MintMismatch", "execute a listing of another mint");
      ok(await tx(c, "cancel_listing", [ix.cancelListing(m.seller.publicKey, m.mint)], [m.seller]), "cancel");
      await c.chain.transferToken(m.seller, m.mint, attacker.publicKey);
      ok(await list(c, attacker, m.mint, 1n * SOL), "attacker lists the asset");
      rejects(await execute(c, K, m, { listingSeller: attacker.publicKey }), "SellerMismatch", "execute a listing by another seller");
      rejects(await execute(c, K, m, { listingSeller: attacker.publicKey, payTo: m.seller.publicKey }), "SellerMismatch", "execute another seller's listing paying the posse seller");
      const p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.FUNDED);
      await assertVault(c, m.posse, 5n * SOL, "nothing left the vault");
    },
  ],

  [
    "deadline boundary: chip and execute at closes_at pass; one second later execute fails and refunds open",
    async (c) => {
      const m = await makePosse(c, { target: 2n * SOL, maxPrice: 1n * SOL, closesIn: 900 });
      await fund(c, m, [1n * SOL]);
      ok(await list(c, m.seller, m.mint, 1n * SOL), "list");
      await c.chain.warpTo(m.closesAt);
      const [last] = await fund(c, m, [1n * SOL]);
      assert.equal((await posseOf(c, m.posse)).status, STATUS.FUNDED);
      const K = await c.chain.wallet(2);
      rejects(await tx(c, "expire", [ix.expire(K.publicKey, m.posse)], [K]), "DeadlineNotReached", "expire at closes_at");
      rejects(await tx(c, "claim_refund", [ix.claimRefund(last!.publicKey, m.posse)], [last!]), "BadStatus", "refund at closes_at");
      ok(await execute(c, K, m), "execute exactly at closes_at");

      const m2 = await makePosse(c, { target: 2n * SOL, maxPrice: 1n * SOL, closesIn: 900 });
      const [w] = await fund(c, m2, [2n * SOL]);
      ok(await list(c, m2.seller, m2.mint, 1n * SOL), "list 2");
      await c.chain.warpTo(m2.closesAt + 1);
      rejects(await execute(c, K, m2), "DeadlinePassed", "execute one second after closes_at");
      rejects(await chip(c, await c.chain.wallet(2), m2.posse, 1n), "BadStatus", "chip into a funded posse");
      ok(await tx(c, "claim_refund", [ix.claimRefund(w!.publicKey, m2.posse)], [w!]), "refund after the deadline");

      const m3 = await makePosse(c, { target: 2n * SOL, closesIn: 900 });
      await c.chain.warpTo(m3.closesAt + 1);
      rejects(await chip(c, await c.chain.wallet(2), m3.posse, 1n * SOL), "DeadlinePassed", "chip after closes_at");
    },
  ],

  [
    "concurrent chips: two wallets take the last headroom at once -- raised lands exactly on target (no over-funding)",
    async (c) => {
      const m = await makePosse(c, { target: 5n * SOL });
      await fund(c, m, [1n * SOL]);
      const D = await c.chain.wallet(10);
      const E = await c.chain.wallet(10);
      const rs = await c.chain.sendConcurrent([
        { ixs: [ix.contribute(D.publicKey, m.posse, 4n * SOL)], signers: [D] },
        { ixs: [ix.contribute(E.publicKey, m.posse, 4n * SOL)], signers: [E] },
      ]);
      const p = await posseOf(c, m.posse);
      assert.equal(p.raisedLamports, 5n * SOL, "raised == target");
      assert.equal(p.status, STATUS.FUNDED);
      const landed = rs.filter((r) => r.ok);
      assert.ok(landed.length >= 1);
      const accepted = landed.reduce((s, r) => s + (r.events.find((e) => e.name === "ChippedIn")?.data.accepted as bigint), 0n);
      assert.equal(accepted, 4n * SOL, "the two chips together took exactly the 4 SOL of headroom");
      for (const r of rs.filter((r) => !r.ok)) assert.equal(r.code, POSSE_ERRORS.BadStatus, "a chip after funding is rejected");
      await assertVault(c, m.posse, 5n * SOL, "vault holds exactly the target");
    },
  ],

  [
    "refund race: the same contribution claimed twice at once pays once",
    async (c) => {
      const m = await makePosse(c, { target: 5n * SOL, closesIn: 600 });
      const [A] = await fund(c, m, [2n * SOL]);
      await c.chain.warpTo(m.closesAt + 1);
      const other = await c.chain.wallet(1);
      const before = await c.chain.lamports(A!.publicKey);
      const rs = await c.chain.sendConcurrent([
        { ixs: [ix.claimRefund(A!.publicKey, m.posse)], signers: [A!], feePayer: other },
        { ixs: [ix.claimRefund(A!.publicKey, m.posse)], signers: [A!] },
      ]);
      assert.equal(rs.filter((r) => r.ok).length, 1, "exactly one refund landed");
      const cRent = await c.chain.rentExempt(8 + 115);
      assert.equal((await c.chain.lamports(A!.publicKey)) - before, 2n * SOL + cRent, "paid once");
      await assertVault(c, m.posse, 0n, "vault back to its rent reserve");
    },
  ],

  [
    "withdraw: allowed while raising, refused once funded (I11)",
    async (c) => {
      const m = await makePosse(c, { target: 3n * SOL });
      const [A, B] = await fund(c, m, [1n * SOL, 1n * SOL]);
      const cRent = await c.chain.rentExempt(8 + 115);
      const dA = await delta(c, A!.publicKey, async () => ok(await tx(c, "withdraw", [ix.withdraw(A!.publicKey, m.posse)], [A!]), "withdraw while raising"));
      assert.equal(dA, 1n * SOL + cRent);
      let p = await posseOf(c, m.posse);
      assert.deepEqual([p.raisedLamports, p.contributorCount], [1n * SOL, 1]);
      await fund(c, m, [2n * SOL]);
      p = await posseOf(c, m.posse);
      assert.equal(p.status, STATUS.FUNDED);
      rejects(await tx(c, "withdraw", [ix.withdraw(B!.publicKey, m.posse)], [B!]), "BadStatus", "withdraw after funding");
      await assertVault(c, m.posse, 3n * SOL, "funded vault intact");
    },
  ],

  [
    "auction without bids: settle returns to Held, disposition restarts and sells",
    async (c) => {
      const m = await makePosse(c, { target: 3n * SOL, maxPrice: 2n * SOL, exitPrice: 1n * SOL, exitHours: 1 });
      const [A] = await fund(c, m, [3n * SOL]);
      ok(await list(c, m.seller, m.mint, 2n * SOL), "list");
      const K = await c.chain.wallet(5);
      ok(await execute(c, K, m), "execute");
      ok(await tx(c, "issue_shares", [ix.issueShares(K.publicKey, m.posse)], [K]), "issue");
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "start");
      let d = await dispOf(c, m.posse);
      await c.chain.warpTo(Number(d.endsAt));
      const dK = await delta(c, K.publicKey, async () => {
        const r = ok(await tx(c, "settle_auction", [await settleIx(c, K, m)], [K]), "settle with no bids");
        assert.deepEqual(r.events.map((e) => e.name), ["DispositionFailed"]);
      });
      assert.ok(dK > 0n, "disposition rent returned to its payer");
      assert.equal((await posseOf(c, m.posse)).status, STATUS.HELD);
      assert.equal(await c.chain.data(pda.disposition(m.posse)), null);
      assert.equal(await c.chain.tokenBal(ata(pda.vault(m.posse), m.mint)), 1n, "asset still in custody");
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "restart");
      const X = await c.chain.wallet(5);
      ok(await tx(c, "bid", [ix.bid(X.publicKey, m.posse, 1n * SOL, null)], [X]), "bid");
      d = await dispOf(c, m.posse);
      await c.chain.warpTo(Number(d.endsAt));
      ok(await tx(c, "settle_auction", [await settleIx(c, K, m)], [K]), "settle");
      assert.equal(await c.chain.tokenBal(ata(X.publicKey, m.mint)), 1n);
      ok(await tx(c, "claim_proceeds", [ix.claimProceeds(A!.publicKey, m.posse)], [A!]), "claim");
    },
  ],

  [
    "frozen asset: a frozen custody account refunds the winning bid and returns to Held",
    async (c) => {
      const freezer = await c.chain.wallet(1);
      const seller = await c.chain.wallet(5);
      const mint = await c.chain.createNft(seller.publicKey, { freezeAuthority: freezer });
      const m = await makePosse(c, { target: 3n * SOL, maxPrice: 2n * SOL, exitPrice: 1n * SOL, mint, seller });
      await fund(c, m, [3n * SOL]);
      ok(await list(c, m.seller, m.mint, 2n * SOL), "list");
      const K = await c.chain.wallet(5);
      ok(await execute(c, K, m), "execute");
      ok(await tx(c, "issue_shares", [ix.issueShares(K.publicKey, m.posse)], [K]), "issue");
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "start");
      const X = await c.chain.wallet(5);
      ok(await tx(c, "bid", [ix.bid(X.publicKey, m.posse, 1n * SOL, null)], [X]), "bid");
      await c.chain.freeze(freezer, m.mint, ata(pda.vault(m.posse), m.mint));
      const d = await dispOf(c, m.posse);
      await c.chain.warpTo(Number(d.endsAt));
      const dX = await delta(c, X.publicKey, async () => ok(await tx(c, "settle_auction", [await settleIx(c, K, m)], [K]), "settle frozen"));
      assert.equal(dX, 1n * SOL, "winning bid refunded");
      assert.equal((await posseOf(c, m.posse)).status, STATUS.HELD);
    },
  ],

  [
    "admin cannot rug: fee cap (I5), fee change does not reach existing posses (I2), pause never blocks claims (I6), non-admin rejected",
    async (c) => {
      const stranger = await c.chain.wallet(1);
      rejects(await tx(c, "update_config", [ix.updateConfig(stranger.publicKey, { executionFeeBps: 10 })], [stranger], stranger), "NotAdmin", "update by non-admin");
      rejects(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { executionFeeBps: 201 })], [c.admin], c.admin), "FeeAboveCap", "fee above max");
      rejects(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { settlementFeeBps: 5000 })], [c.admin], c.admin), "FeeAboveCap", "settlement fee above max");

      const m = await makePosse(c, { target: 5n * SOL, maxPrice: 4n * SOL });
      const mRefund = await makePosse(c, { target: 5n * SOL, closesIn: 600 });
      const [R] = await fund(c, mRefund, [1n * SOL]);
      await fund(c, m, [5n * SOL]);
      ok(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { executionFeeBps: 200, settlementFeeBps: 200 })], [c.admin], c.admin), "raise fees to the cap");
      ok(await list(c, m.seller, m.mint, 4n * SOL), "list");
      ok(await execute(c, await c.chain.wallet(1), m), "execute");
      const p = await posseOf(c, m.posse);
      assert.equal(p.execFeeLamports, feeOf(4n * SOL, 50), "fee is the 0.5% snapshot, not the new 2%");
      assert.equal(p.settleFeeBps, 50);

      ok(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { paused: true })], [c.admin], c.admin), "pause");
      const org = await c.chain.wallet(2);
      c.nonce += 1n;
      const mint = await c.chain.createNft(org.publicKey);
      const blocked = ix.createPosse({
        organizer: org.publicKey, mint, nonce: c.nonce, seller: org.publicKey, royaltyRecipient: org.publicKey, royaltyBps: 0,
        targetLamports: SOL, maxPriceLamports: SOL, closesAt: BigInt((await c.chain.now()) + 3600), exitKind: 1, exitDay: 0, exitPriceLamports: SOL, exitHours: 0,
      });
      rejects(await tx(c, "create_posse", [blocked.ix], [org], org), "Paused", "create while paused");
      rejects(await chip(c, await c.chain.wallet(2), mRefund.posse, SOL), "Paused", "chip while paused");
      await c.chain.warpTo(mRefund.closesAt + 1);
      ok(await tx(c, "claim_refund", [ix.claimRefund(R!.publicKey, mRefund.posse)], [R!]), "refund while paused");
      ok(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { paused: false, executionFeeBps: 50, settlementFeeBps: 50 })], [c.admin], c.admin), "unpause");
    },
  ],

  [
    "pause does not block claim_returned / claim_proceeds (I6)",
    async (c) => {
      const m = await makePosse(c, { target: 6n * SOL, maxPrice: 5n * SOL, exitKind: 1, exitPrice: 2n * SOL });
      const [A] = await fund(c, m, [6n * SOL]);
      ok(await list(c, m.seller, m.mint, 5n * SOL), "list");
      const K = await c.chain.wallet(5);
      ok(await execute(c, K, m), "execute");
      ok(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { paused: true })], [c.admin], c.admin), "pause");
      ok(await tx(c, "claim_returned", [ix.claimReturned(A!.publicKey, m.posse)], [A!]), "claim_returned while paused");
      ok(await tx(c, "issue_shares", [ix.issueShares(K.publicKey, m.posse)], [K]), "issue while paused");
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "start while paused");
      const buyer = await c.chain.wallet(5);
      ok(await tx(c, "buy_listed", [ix.buyListed({ buyer: buyer.publicKey, posse: m.posse, p: await posseOf(c, m.posse), feeWallet: c.feeWallet.publicKey })], [buyer]), "buy while paused");
      ok(await tx(c, "claim_proceeds", [ix.claimProceeds(A!.publicKey, m.posse)], [A!]), "claim_proceeds while paused");
      ok(await tx(c, "update_config", [ix.updateConfig(c.admin.publicKey, { paused: false })], [c.admin], c.admin), "unpause");
    },
  ],

  [
    "asset authenticity (I4): fungible mint and re-mintable supply are refused",
    async (c) => {
      const org = await c.chain.wallet(3);
      const fungible = await c.chain.createNft(org.publicKey, { decimals: 6, amount: 1_000_000n });
      c.nonce += 1n;
      const args = (mint: PublicKey) => ({
        organizer: org.publicKey, mint, nonce: c.nonce, seller: org.publicKey, royaltyRecipient: org.publicKey, royaltyBps: 0,
        targetLamports: SOL, maxPriceLamports: SOL, closesAt: BigInt(0), exitKind: 1 as const, exitDay: 0, exitPriceLamports: SOL, exitHours: 0,
      });
      const now = BigInt(await c.chain.now());
      rejects(await tx(c, "create_posse", [ix.createPosse({ ...args(fungible), closesAt: now + 3600n }).ix], [org], org), "NotNftDecimals", "create on a 6-decimal mint");
      const remintable = await c.chain.createNft(org.publicKey, { amount: 2n, keepMintAuthority: true });
      rejects(await tx(c, "create_posse", [ix.createPosse({ ...args(remintable), closesAt: now + 3600n }).ix], [org], org), "NotNftSupply", "create on a re-mintable mint");
      rejects(await list(c, org, remintable, SOL), "NotNftSupply", "list a re-mintable mint");
      rejects(await tx(c, "create_posse", [ix.createPosse({ ...args((await c.chain.createNft(org.publicKey))), closesAt: now - 1n }).ix], [org], org), "DeadlineInPast", "deadline in the past");
      rejects(
        await tx(c, "create_posse", [ix.createPosse({ ...args(await c.chain.createNft(org.publicKey)), closesAt: now + 3600n, exitPriceLamports: 1n }).ix], [org], org),
        "InvalidExit",
        "exit price below the floor",
      );
    },
  ],

  [
    "recipient that cannot receive: a tiny royalty to an empty account is skipped and stays with the contributors",
    async (c) => {
      const empty = Keypair.generate().publicKey;
      const m = await makePosse(c, { target: 2n * SOL, maxPrice: 1n * SOL, exitKind: 1, exitPrice: 10_000_000n, royaltyBps: 500, royaltyTo: empty });
      const [A] = await fund(c, m, [2n * SOL]);
      ok(await list(c, m.seller, m.mint, 1n * SOL), "list");
      const K = await c.chain.wallet(5);
      ok(await execute(c, K, m), "execute");
      ok(await tx(c, "issue_shares", [ix.issueShares(K.publicKey, m.posse)], [K]), "issue");
      ok(await tx(c, "start_disposition", [ix.startDisposition(K.publicKey, m.posse)], [K]), "start");
      const buyer = await c.chain.wallet(2);
      ok(await tx(c, "buy_listed", [ix.buyListed({ buyer: buyer.publicKey, posse: m.posse, p: await posseOf(c, m.posse), feeWallet: c.feeWallet.publicKey })], [buyer]), "buy");
      const d = await dispOf(c, m.posse);
      assert.equal(d.royaltyLamports, 0n, "royalty skipped");
      assert.equal(d.netLamports, 10_000_000n - feeOf(10_000_000n, 50));
      assert.equal(await c.chain.lamports(empty), 0n);
      ok(await tx(c, "claim_proceeds", [ix.claimProceeds(A!.publicKey, m.posse)], [A!]), "claim");
    },
  ],

  [
    "every app transaction fits the 1030-byte budget",
    async (c) => {
      const rows = [...c.stats.entries()].filter(([k]) => k !== "stray").sort();
      for (const [k, s] of rows) c.log(`tx ${k} n=${s.n} max_bytes=${s.maxBytes} max_cu=${s.maxCu}`);
      const worst = rows.reduce((a, [, s]) => Math.max(a, s.maxBytes), 0);
      c.log(`tx_max_bytes=${worst} budget=${TX_BUDGET}`);
      for (const [k, s] of rows) assert.ok(s.maxBytes <= TX_BUDGET, `${k} is ${s.maxBytes} B > ${TX_BUDGET}`);
    },
  ],
];
