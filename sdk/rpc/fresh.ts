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