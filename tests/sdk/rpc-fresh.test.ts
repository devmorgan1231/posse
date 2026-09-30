import { describe, it } from "node:test";
import { expect } from "./expect";
import { PublicKey, type AccountInfo, type SignatureStatus } from "@solana/web3.js";
import { readAccountFresh, readBlockHeightFresh, readStatusesFresh, SlotFloor, StaleReadError, type FreshConnection } from "../../sdk/rpc/fresh";
import { StaleRpcSnapshot } from "../../sdk/rpc/sentinel";
import { resolveSignatures } from "../../sdk/rpc/settle";

const KEY = new PublicKey("11111111111111111111111111111112");
const noSleep = async () => {};

const clockData = (slot: number) => {
  const b = Buffer.alloc(40);
  b.writeBigUInt64LE(BigInt(slot));
  return b;
};
const acct = (lamports: number, data = Buffer.alloc(8)): AccountInfo<Buffer> => ({ lamports, data, owner: KEY, executable: false, rentEpoch: 0 });

type Answer = { ctx: number; clock: number; lamports: number } | { code: number };

function scriptedConnection(answers: Answer[]) {
  const asked: (number | undefined)[] = [];
  let i = 0;
  const conn = {
    async getMultipleAccountsInfoAndContext(keys: PublicKey[], cfg?: { minContextSlot?: number }) {
      asked.push(cfg?.minContextSlot);
      const a = answers[Math.min(i++, answers.length - 1)]!;
      if ("code" in a) throw Object.assign(new Error("Minimum context slot has not been reached"), { code: a.code });
      const value = keys.map((k, j) => (j === keys.length - 1 && k.toBase58().startsWith("SysvarC1ock") ? acct(1, clockData(a.clock)) : acct(a.lamports)));
      return { context: { slot: a.ctx }, value };
    },
  } as unknown as FreshConnection;
  return { conn, asked };
}

describe("fresh reads (4 defenses)", () => {
  it("passes minContextSlot = floor and raises the floor", async () => {
    const f = scriptedConnection([{ ctx: 100, clock: 100, lamports: 7 }]);
    const floor = new SlotFloor();
    floor.raise(90);
    const r = await readAccountFresh(f.conn, floor, KEY, { sleep: noSleep });
    expect(r).toMatchObject({ slot: 100 });
    expect(r.value?.lamports).toBe(7);
    expect(f.asked).toEqual([90]);
    expect(floor.slot).toBe(100);
  });

  it("-32016 (node behind minContextSlot) -> waits and retries, never takes an old answer", async () => {
    const f = scriptedConnection([{ code: -32016 }, { code: -32016 }, { ctx: 120, clock: 120, lamports: 9 }]);
    const r = await readAccountFresh(f.conn, new SlotFloor(), KEY, { sleep: noSleep });
    expect(r.value?.lamports).toBe(9);
    expect(f.asked).toHaveLength(3);
  });

  it("context.slot going backwards is discarded and re-read", async () => {
    const floor = new SlotFloor();
    floor.raise(200);
    const f = scriptedConnection([{ ctx: 150, clock: 150, lamports: 1 }, { ctx: 201, clock: 201, lamports: 2 }]);
    const r = await readAccountFresh(f.conn, floor, KEY, { sleep: noSleep });
    expect(r.value?.lamports).toBe(2);
  });

  it("Clock sentinel: fresh context.slot on an old bank is discarded", async () => {
    const f = scriptedConnection([{ ctx: 50_000, clock: 20_000, lamports: 1 }, { ctx: 50_001, clock: 50_000, lamports: 2 }]);
    const r = await readAccountFresh(f.conn, new SlotFloor(), KEY, { sleep: noSleep });
    expect(r.value?.lamports).toBe(2);
  });

  it("gives up with a typed error when every answer is stale", async () => {
    const f = scriptedConnection([{ ctx: 50_000, clock: 20_000, lamports: 1 }]);
    await expect(readAccountFresh(f.conn, new SlotFloor(), KEY, { sleep: noSleep, attempts: 3 })).rejects.toBeInstanceOf(StaleRpcSnapshot);
    const g = scriptedConnection([{ ctx: 10, clock: 10, lamports: 1 }]);
    const floor = new SlotFloor();
    floor.raise(99);
    await expect(readAccountFresh(g.conn, floor, KEY, { sleep: noSleep, attempts: 2 })).rejects.toBeInstanceOf(StaleReadError);
  });

  it("control: without the floor and the sentinel the stale answer is accepted (the guards are what protect)", async () => {
    const f = scriptedConnection([{ ctx: 50_000, clock: 20_000, lamports: 1 }]);
    const r = await readAccountFresh(f.conn, new SlotFloor(), KEY, { sleep: noSleep, clock: false });
    expect(r.value?.lamports).toBe(1);
  });
});

function statusConn(script: { statuses: ((SignatureStatus | null)[] | { slot: number; value: (SignatureStatus | null)[] })[]; height: number }) {
  let n = 0;
  let clock = 1000;
  const conn = {
    async getSignatureStatuses(_s: string[]) {
      const s = script.statuses[Math.min(n++, script.statuses.length - 1)]!;
      const r = Array.isArray(s) ? { slot: ++clock, value: s } : s;
      return { context: { slot: r.slot }, value: r.value };
    },
    async getEpochInfo() {
      return { absoluteSlot: ++clock, blockHeight: script.height, epoch: 1, slotIndex: 1, slotsInEpoch: 432_000 };
    },
  } as unknown as FreshConnection;
  return { conn, reads: () => n };
}

const st = (over: Partial<SignatureStatus>): SignatureStatus => ({ slot: 10, confirmations: 1, err: null, confirmationStatus: "confirmed", ...over });

describe("settle (no negative verdict from one read)", () => {
  it("landed as soon as a signature is confirmed without error", async () => {
    const c = statusConn({ statuses: [[null], [st({})]], height: 1 });
    const floor = new SlotFloor();
    expect(await resolveSignatures(c.conn, floor, ["sigA"], 100, { sleep: noSleep })).toMatchObject({ state: "landed", signature: "sigA" });
  });

  it("processed-only is not final; unseen with a valid blockhash stays pending", async () => {
    const c = statusConn({ statuses: [[st({ confirmationStatus: "processed", err: { InstructionError: [0, "x"] } })]], height: 50 });
    expect(await resolveSignatures(c.conn, new SlotFloor(), ["sigA"], 100, { sleep: noSleep })).toEqual({ state: "pending" });
  });

  it("dropped only after several reads, an expired blockhash and one more empty read", async () => {
    const c = statusConn({ statuses: [[null]], height: 101 });
    expect(await resolveSignatures(c.conn, new SlotFloor(), ["sigA"], 100, { sleep: noSleep, tries: 4 })).toEqual({ state: "dropped" });
    expect(c.reads()).toBe(5);
  });
});
