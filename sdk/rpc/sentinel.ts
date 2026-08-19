import bs58 from "bs58";

export const CLOCK_SYSVAR_ADDRESS = "SysvarC1ock11111111111111111111111111111111";
export const MAX_CLOCK_LAG_SLOTS = 150;

export function maxClockLagSlots(env: Record<string, string | undefined> = process.env): number {
  const n = Number((env.RPC_MAX_CLOCK_LAG_SLOTS ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : MAX_CLOCK_LAG_SLOTS;
}
export const SENTINEL_RETRIES = 5;
const MAX_KEYS = 100;

export function clockSlotOf(data: Uint8Array): number | null {
  if (data.length < 8) return null;
  return Number(new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(0, true));
}

export function isStaleSnapshot(contextSlot: number, clockSlot: number | null, maxLag = maxClockLagSlots()): boolean {
  return clockSlot === null || contextSlot - clockSlot > maxLag;
}

export class StaleRpcSnapshot extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lagSlots: number | null,
  ) {
    super(`every RPC answer came from a lagging node (${attempts} reads, last lag ${lagSlots ?? "?"} slots)`);
    this.name = "StaleRpcSnapshot";
  }
}