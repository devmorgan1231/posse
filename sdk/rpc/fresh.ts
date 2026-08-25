import { PublicKey, type AccountInfo, type Commitment, type Connection, type SignatureStatus } from "@solana/web3.js";
import { CLOCK_SYSVAR_ADDRESS, clockSlotOf, isStaleSnapshot, maxClockLagSlots, StaleRpcSnapshot } from "./sentinel";

export const MIN_CONTEXT_SLOT_NOT_REACHED = -32016;

export type FreshConnection = Pick<Connection, "getMultipleAccountsInfoAndContext" | "getSignatureStatuses" | "getEpochInfo">;

export class StaleReadError extends Error {
  constructor(
    public readonly what: string,
    public readonly slot: number,
    public readonly floor: number,
  ) {
    super(`stale ${what}: context.slot ${slot} < ${floor}`);
    this.name = "StaleReadError";
  }
}

export class SlotFloor {
  private value = 0;
  get slot(): number {
    return this.value;
  }
  raise(slot: number): void {
    if (slot > this.value) this.value = slot;
  }
  observe(slot: number, what: string): void {
    if (slot < this.value) throw new StaleReadError(what, slot, this.value);
    this.value = slot;
  }
}

export interface FreshOptions {
  commitment?: Commitment;
  attempts?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
  clock?: boolean;
  maxLagSlots?: number;
}

export const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isRetryable(e: unknown): boolean {
  if (e instanceof StaleReadError || e instanceof StaleRpcSnapshot) return true;
  return (e as { code?: number } | null)?.code === MIN_CONTEXT_SLOT_NOT_REACHED;
}

async function withRetry<T>(fn: () => Promise<T>, opts: FreshOptions): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 6);
  const backoff = opts.backoffMs ?? 400;
  const sleep = opts.sleep ?? defaultSleep;
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isRetryable(e)) throw e;
      if (i >= attempts - 1) throw e;
      await sleep(backoff * 2 ** i);
    }
  }
}

const CLOCK_KEY = new PublicKey(CLOCK_SYSVAR_ADDRESS);
const MAX_KEYS = 100;

export async function readAccountsFresh(
  conn: FreshConnection,
  floor: SlotFloor,
  keys: PublicKey[],
  opts: FreshOptions = {},
): Promise<{ value: (AccountInfo<Buffer> | null)[]; slot: number }> {
  const commitment = opts.commitment ?? "confirmed";
  const clock = opts.clock !== false;
  if (keys.length > (clock ? MAX_KEYS - 1 : MAX_KEYS)) throw new Error(`readAccountsFresh: at most ${clock ? MAX_KEYS - 1 : MAX_KEYS} keys`);
  return withRetry(async () => {
    const all = clock ? [...keys, CLOCK_KEY] : keys;
    const r = await conn.getMultipleAccountsInfoAndContext(all, { commitment, minContextSlot: floor.slot });
    if (clock) {
      const c = r.value[keys.length];
      const clockSlot = c ? clockSlotOf(c.data) : null;
      if (isStaleSnapshot(r.context.slot, clockSlot, opts.maxLagSlots ?? maxClockLagSlots())) {
        throw new StaleRpcSnapshot(1, clockSlot === null ? null : r.context.slot - clockSlot);
      }
    }
    floor.observe(r.context.slot, "getMultipleAccounts");
    return { value: r.value.slice(0, keys.length), slot: r.context.slot };
  }, opts);
}

export async function readAccountFresh(
  conn: FreshConnection,
  floor: SlotFloor,
  key: PublicKey,
  opts: FreshOptions = {},
): Promise<{ value: AccountInfo<Buffer> | null; slot: number }> {
  const r = await readAccountsFresh(conn, floor, [key], opts);
  return { value: r.value[0] ?? null, slot: r.slot };
}

export async function readStatusesFresh(
  conn: FreshConnection,
  floor: SlotFloor,
  signatures: string[],
  opts: FreshOptions = {},
): Promise<{ value: (SignatureStatus | null)[]; slot: number }> {
  return withRetry(async () => {
    const r = await conn.getSignatureStatuses(signatures, { searchTransactionHistory: true });
    floor.observe(r.context.slot, "getSignatureStatuses");
    return { value: r.value, slot: r.context.slot };
  }, opts);
}