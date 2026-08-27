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

const isFinal = (s: SignatureStatus) => s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized";

function landedOrFailed(sigs: string[], statuses: (SignatureStatus | null)[], deadUnseen: (i: number) => boolean = () => false): TxVerdict | null {
  const ok = statuses.findIndex((s) => s !== null && s.err === null && isFinal(s));
  if (ok >= 0) return { state: "landed", signature: sigs[ok]!, slot: statuses[ok]!.slot };
  let firstFailed = -1;
  for (let i = 0; i < sigs.length; i++) {
    const s = statuses[i];
    if (s && s.err !== null && isFinal(s)) {
      if (firstFailed < 0) firstFailed = i;
      continue;
    }
    if (!s && deadUnseen(i)) continue;
    return null;
  }
  if (firstFailed < 0) return null;
  const f = statuses[firstFailed]!;
  return { state: "failed", signature: sigs[firstFailed]!, err: f.err, slot: f.slot };
}