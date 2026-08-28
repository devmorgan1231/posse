import { PublicKey } from "@solana/web3.js";
import { readAccountsFresh, SlotFloor, type FreshConnection, type FreshOptions } from "./rpc/fresh";
import { resolveSignatures, type SettleOptions, type SigRef, type TxVerdict } from "./rpc/settle";
import { accountKind, decodeAccount, pda, type AccountName, type AccountTypes } from "./program";

export { SlotFloor };
export type { FreshConnection, TxVerdict, SigRef };

export interface Snapshot<T> {
  value: T | null;
  slot: number;
}