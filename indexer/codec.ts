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

export const EVENT_IX_TAG = Buffer.from(createHash("sha256").update("anchor:event").digest().subarray(0, 8)).reverse();

export class DecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecodeError";
  }
}

export function decodeLayout(layout: Layout, data: Buffer, offset = 0): Decoded {
  const need = offset + layoutSize(layout);
  if (data.length < need) throw new DecodeError(`short data: ${data.length} < ${need}`);
  const out: Decoded = {};
  let o = offset;
  for (const [name, t] of layout) {
    switch (t) {
      case "pubkey":
        out[name] = bs58.encode(data.subarray(o, o + 32));
        break;
      case "u8":
        out[name] = data.readUInt8(o);
        break;
      case "bool": {
        const b = data.readUInt8(o);
        if (b > 1) throw new DecodeError(`bool ${name} = ${b}`);
        out[name] = b === 1;
        break;
      }
      case "u16":
        out[name] = data.readUInt16LE(o);
        break;
      case "u32":
        out[name] = data.readUInt32LE(o);
        break;
      case "u64":
        out[name] = data.readBigUInt64LE(o);
        break;
      case "i64":
        out[name] = data.readBigInt64LE(o);
        break;
    }
    o += SIZE[t];
  }
  return out;
}

export function encodeLayout(layout: Layout, v: Decoded): Buffer {
  const buf = Buffer.alloc(layoutSize(layout));
  let o = 0;
  for (const [name, t] of layout) {
    const x = v[name];
    switch (t) {
      case "pubkey": {
        const b = bs58.decode(String(x));
        if (b.length !== 32) throw new Error(`pubkey ${name}`);
        buf.set(b, o);
        break;
      }
      case "u8":
        buf.writeUInt8(Number(x), o);
        break;
      case "bool":
        buf.writeUInt8(x ? 1 : 0, o);
        break;
      case "u16":
        buf.writeUInt16LE(Number(x), o);
        break;
      case "u32":
        buf.writeUInt32LE(Number(x), o);
        break;
      case "u64":
        buf.writeBigUInt64LE(BigInt(x as bigint), o);
        break;
      case "i64":
        buf.writeBigInt64LE(BigInt(x as bigint), o);
        break;
    }
    o += SIZE[t];
  }
  return buf;
}