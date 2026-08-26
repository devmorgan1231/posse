import type { SignatureStatus } from "@solana/web3.js";
import { defaultSleep, readBlockHeightFresh, readStatusesFresh, type FreshConnection, type SlotFloor } from "./fresh";

export type TxVerdict =
  | { state: "landed"; signature: string; slot: number }
  | { state: "failed"; signature: string; err: unknown; slot: number }
  | { state: "pending" }
  | { state: "dropped" };

export type SigRef = { signature: string; lastValidBlockHeight: number };

export interface SettleOptions {
  tries?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}