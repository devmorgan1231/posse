import { PublicKey, type AccountInfo, type Connection, type VersionedTransactionResponse } from "@solana/web3.js";
import bs58 from "bs58";
import { readAccountsFresh, SlotFloor, StaleReadError, MIN_CONTEXT_SLOT_NOT_REACHED, defaultSleep, type FreshConnection } from "../sdk/rpc/fresh";
import { CLOCK_SYSVAR_ADDRESS, clockSlotOf, maxClockLagSlots } from "../sdk/rpc/sentinel";
import { EVENT_IX_TAG } from "./codec";

export interface SigInfo {
  signature: string;
  slot: number;
  err: unknown;
  blockTime: number | null;
}

export interface RawEvent {
  ixIndex: number;
  data: Buffer;
}

export interface TxEvents {
  signature: string;
  slot: number;
  blockTime: number | null;
  failed: boolean;
  events: RawEvent[];
}

export interface IndexerChain {
  floor: SlotFloor;
  programAccounts(programId: PublicKey): Promise<{ accounts: { key: string; head: Buffer }[]; slot: number }>;
  readAccounts(keys: string[]): Promise<{ value: (AccountInfo<Buffer> | null)[]; slot: number }>;
  signaturesSince(programId: PublicKey, until: string | null, max: number): Promise<SigInfo[]>;
  transactionEvents(programId: PublicKey, signature: string): Promise<TxEvents | null>;
  staleStats(): StaleStats;
}

export interface StaleStats {
  reads: number;
  stale: number;
  notReached: number;
  maxLagSlots: number;
}

export function countingConnection(conn: FreshConnection, stats: StaleStats): FreshConnection {
  const maxLag = maxClockLagSlots();
  return {
    getSignatureStatuses: (...a: Parameters<FreshConnection["getSignatureStatuses"]>) => conn.getSignatureStatuses(...a),
    getEpochInfo: (...a: Parameters<FreshConnection["getEpochInfo"]>) => conn.getEpochInfo(...a),
    async getMultipleAccountsInfoAndContext(keys, cfg) {
      stats.reads++;
      try {
        const r = await conn.getMultipleAccountsInfoAndContext(keys, cfg);
        const last = keys[keys.length - 1];
        if (last && last.toBase58() === CLOCK_SYSVAR_ADDRESS) {
          const c = r.value[keys.length - 1];
          const clockSlot = c ? clockSlotOf(c.data) : null;
          const lag = clockSlot === null ? Infinity : r.context.slot - clockSlot;
          if (Number.isFinite(lag) && lag > stats.maxLagSlots) stats.maxLagSlots = lag;
          if (lag > maxLag) stats.stale++;
        }
        return r;
      } catch (e) {
        if ((e as { code?: number } | null)?.code === MIN_CONTEXT_SLOT_NOT_REACHED) stats.notReached++;
        throw e;
      }
    },
  } as FreshConnection;
}

export async function retryStale<T>(fn: () => Promise<T>, stats?: StaleStats, attempts = 5, baseMs = 300, sleep = defaultSleep): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const behind = e instanceof StaleReadError || (e as { code?: number } | null)?.code === MIN_CONTEXT_SLOT_NOT_REACHED;
      if (!behind || i >= attempts - 1) throw e;
      if (stats) stats.notReached++;
      await sleep(baseMs * 2 ** i);
    }
  }
}

const CHUNK = 99;

export function extractEvents(programId: PublicKey, tx: VersionedTransactionResponse): RawEvent[] {
  const out: RawEvent[] = [];
  const meta = tx.meta;
  if (!meta) return out;
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: meta.loadedAddresses ?? undefined });
  const pid = programId.toBase58();
  for (const group of meta.innerInstructions ?? []) {
    group.instructions.forEach((ix, j) => {
      const prog = keys.get(ix.programIdIndex);
      if (!prog || prog.toBase58() !== pid) return;
      const data = Buffer.from(bs58.decode(ix.data));
      if (data.length >= 16 && data.subarray(0, 8).equals(EVENT_IX_TAG)) out.push({ ixIndex: group.index * 1000 + j, data: data.subarray(8) });
    });
  }
  if (out.length) return out;
  const stack: string[] = [];
  (meta.logMessages ?? []).forEach((line, i) => {
    const inv = /^Program (\S+) invoke \[\d+\]$/.exec(line);
    if (inv) return void stack.push(inv[1]!);
    if (/^Program (\S+) (success|failed)/.test(line)) return void stack.pop();
    if (line.startsWith("Program data: ") && stack[stack.length - 1] === pid) {
      out.push({ ixIndex: 100_000 + i, data: Buffer.from(line.slice(14), "base64") });
    }
  });
  return out;
}

export function rpcChain(conn: Connection, opts: { floor?: SlotFloor; stats?: StaleStats; sleep?: (ms: number) => Promise<void> } = {}): IndexerChain {
  const floor = opts.floor ?? new SlotFloor();
  const stats: StaleStats = opts.stats ?? { reads: 0, stale: 0, notReached: 0, maxLagSlots: 0 };
  const fresh = countingConnection(conn, stats);
  return {
    floor,
    staleStats: () => ({ ...stats }),
    programAccounts: (programId) => retryStale(async () => {
      const r = (await conn.getProgramAccounts(programId, {
        commitment: "confirmed",
        withContext: true,
        minContextSlot: floor.slot,
        dataSlice: { offset: 0, length: 8 },
      })) as unknown as { context: { slot: number }; value: { pubkey: PublicKey; account: { data: Buffer } }[] };
      floor.observe(r.context.slot, "getProgramAccounts");
      return { accounts: r.value.map((a) => ({ key: a.pubkey.toBase58(), head: Buffer.from(a.account.data) })), slot: r.context.slot };
    }, stats, 5, 300, opts.sleep),
    async readAccounts(keys) {
      const value: (AccountInfo<Buffer> | null)[] = [];
      let slot = floor.slot;
      for (let i = 0; i < keys.length; i += CHUNK) {
        const part = keys.slice(i, i + CHUNK).map((k) => new PublicKey(k));
        const r = await readAccountsFresh(fresh, floor, part, opts.sleep ? { sleep: opts.sleep } : {});
        value.push(...r.value);
        slot = Math.max(slot, r.slot);
      }
      return { value, slot };
    },
    async signaturesSince(programId, until, max) {
      const all: SigInfo[] = [];
      let before: string | undefined;
      for (;;) {
        const page = await retryStale(
          () => conn.getSignaturesForAddress(programId, { limit: 1000, before, until: until ?? undefined, minContextSlot: floor.slot }, "confirmed"),
          stats,
          5,
          300,
          opts.sleep,
        );
        for (const s of page) all.push({ signature: s.signature, slot: s.slot, err: s.err, blockTime: s.blockTime ?? null });
        if (page.length < 1000 || all.length >= 200_000) break;
        before = page[page.length - 1]!.signature;
      }
      return all.reverse().slice(0, max);
    },
    async transactionEvents(programId, signature) {
      const tx = await conn.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (!tx) return null;
      floor.raise(tx.slot);
      return { signature, slot: tx.slot, blockTime: tx.blockTime ?? null, failed: tx.meta?.err != null, events: tx.meta?.err == null ? extractEvents(programId, tx) : [] };
    },
  };
}
