import { describe, it } from "node:test";
import { expect } from "./expect";
import { PublicKey, type AccountInfo } from "@solana/web3.js";
import { rpcChain } from "../../indexer/chain";
import { CLOCK_SYSVAR_ADDRESS } from "../../sdk/rpc/sentinel";
import { key } from "./helpers";

function clockData(slot: number): Buffer {
  const b = Buffer.alloc(40);
  b.writeBigUInt64LE(BigInt(slot), 0);
  return b;
}
const acc = (data: Buffer, owner = PublicKey.default): AccountInfo<Buffer> => ({ data, owner, lamports: 1, executable: false, rentEpoch: 0 });

type Plan = { kind: "stale" | "behind" | "fresh" | "backwards"; slot: number; value: string };

function scriptedConnection(plan: Plan[]) {
  const calls: { minContextSlot?: number }[] = [];
  const conn = {
    async getMultipleAccountsInfoAndContext(keys: PublicKey[], cfg: { minContextSlot?: number }) {
      calls.push({ minContextSlot: cfg.minContextSlot });
      const p = plan.shift()!;
      if (p.kind === "behind") throw Object.assign(new Error("Minimum context slot has not been reached"), { code: -32016 });
      const clockSlot = p.kind === "stale" ? p.slot - 30_000 : p.slot;
      return {
        context: { slot: p.slot },
        value: keys.map((k) => (k.toBase58() === CLOCK_SYSVAR_ADDRESS ? acc(clockData(clockSlot)) : acc(Buffer.from(p.value)))),
      };
    },
    async getSignatureStatuses() {
      return { context: { slot: 0 }, value: [] };
    },
    async getEpochInfo() {
      return { absoluteSlot: 0, blockHeight: 0 };
    },
  };
  return { conn, calls };
}

const noSleep = async () => {};

describe("indexer chain reader against a lagging node", () => {
  it("drops a lagging-bank answer (Clock sentinel) and returns the fresh one", async () => {
    const { conn, calls } = scriptedConnection([
      { kind: "stale", slot: 41000, value: "old" },
      { kind: "fresh", slot: 41001, value: "new" },
    ]);
    const chain = rpcChain(conn as any, { sleep: noSleep });
    const r = await chain.readAccounts([key()]);
    expect(r.value[0]!.data.toString()).toBe("new");
    expect(calls).toHaveLength(2);
    const s = chain.staleStats();
    expect(s.reads).toBe(2);
    expect(s.stale).toBe(1);
    expect(s.maxLagSlots).toBe(30_000);
  });

  it("waits on -32016 (node below minContextSlot) instead of taking an older answer", async () => {
    const { conn, calls } = scriptedConnection([
      { kind: "fresh", slot: 2000, value: "a" },
      { kind: "behind", slot: 0, value: "" },
      { kind: "fresh", slot: 2001, value: "b" },
    ]);
    const chain = rpcChain(conn as any, { sleep: noSleep });
    await chain.readAccounts([key()]);
    const r = await chain.readAccounts([key()]);
    expect(r.value[0]!.data.toString()).toBe("b");
    expect(calls[1]!.minContextSlot).toBe(2000);
    expect(chain.staleStats().notReached).toBe(1);
  });

  it("rejects a context slot that went backwards and re-reads", async () => {
    const { conn } = scriptedConnection([
      { kind: "fresh", slot: 3000, value: "a" },
      { kind: "fresh", slot: 2990, value: "older" },
      { kind: "fresh", slot: 3002, value: "c" },
    ]);
    const chain = rpcChain(conn as any, { sleep: noSleep });
    await chain.readAccounts([key()]);
    const r = await chain.readAccounts([key()]);
    expect(r.value[0]!.data.toString()).toBe("c");
    expect(r.slot).toBe(3002);
  });

  it("control: a healthy node is read once", async () => {
    const { conn, calls } = scriptedConnection([{ kind: "fresh", slot: 10, value: "x" }]);
    const chain = rpcChain(conn as any, { sleep: noSleep });
    await chain.readAccounts([key()]);
    expect(calls).toHaveLength(1);
    expect(chain.staleStats().stale).toBe(0);
  });

  it("getProgramAccounts below the floor is retried, not trusted", async () => {
    let n = 0;
    const conn = {
      async getProgramAccounts() {
        n++;
        return { context: { slot: n === 1 ? 500 : n === 2 ? 400 : 600 }, value: [{ pubkey: new PublicKey(key()), account: acc(Buffer.alloc(0)) }] };
      },
    };
    const chain = rpcChain(conn as any, { sleep: noSleep });
    await chain.programAccounts(new PublicKey(key()));
    const r = await chain.programAccounts(new PublicKey(key()));
    expect(r.slot).toBe(600);
    expect(n).toBe(3);
  });
});
