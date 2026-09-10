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