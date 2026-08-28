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

export async function resolveSignatures(
  conn: FreshConnection,
  floor: SlotFloor,
  signatures: (string | SigRef)[],
  lastValidBlockHeight: number,
  opts: SettleOptions = {},
): Promise<TxVerdict> {
  if (signatures.length === 0) throw new Error("resolveSignatures: no signatures");
  const refs: SigRef[] = signatures.map((x) => (typeof x === "string" ? { signature: x, lastValidBlockHeight } : x));
  const sigs = refs.map((r) => r.signature);
  const tries = Math.max(1, opts.tries ?? 4);
  const interval = opts.intervalMs ?? 2000;
  const sleep = opts.sleep ?? defaultSleep;
  for (let i = 0; i < tries; i++) {
    const { value } = await readStatusesFresh(conn, floor, sigs, { sleep });
    const v = landedOrFailed(sigs, value);
    if (v) {
      if (v.state === "landed") floor.raise(v.slot);
      return v;
    }
    if (i < tries - 1) await sleep(interval);
  }
  const height = await readBlockHeightFresh(conn, floor, { sleep });
  const expired = (i: number) => height > refs[i]!.lastValidBlockHeight;
  const { value } = await readStatusesFresh(conn, floor, sigs, { sleep });
  const v = landedOrFailed(sigs, value, expired);
  if (v) {
    if (v.state === "landed") floor.raise(v.slot);
    return v;
  }
  return refs.every((_, i) => expired(i)) && value.every((s) => s === null) ? { state: "dropped" } : { state: "pending" };
}
