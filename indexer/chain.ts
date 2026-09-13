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