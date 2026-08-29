import { createHash } from "node:crypto";
import bs58 from "bs58";

export type FieldType = "pubkey" | "u8" | "bool" | "u16" | "u32" | "u64" | "i64";
export type Layout = readonly (readonly [string, FieldType])[];
export type Decoded = Record<string, string | number | boolean | bigint>;

const SIZE: Record<FieldType, number> = { pubkey: 32, u8: 1, bool: 1, u16: 2, u32: 4, u64: 8, i64: 8 };

export const layoutSize = (l: Layout) => l.reduce((s, [, t]) => s + SIZE[t], 0);

export function discriminator(namespace: "account" | "event" | "global", name: string): Buffer {
  return createHash("sha256").update(`${namespace}:${name}`).digest().subarray(0, 8);
}