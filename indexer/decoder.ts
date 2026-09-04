import fs from "node:fs";
import path from "node:path";
import {
  ACCOUNT_LAYOUTS,
  ACCOUNT_NAMES,
  DecodeError,
  EVENT_LAYOUTS,
  EVENT_NAMES,
  decodeLayout,
  discriminator,
  type AccountName,
  type Decoded,
} from "./codec";

export interface DecodedAccount {
  name: AccountName;
  data: Decoded;
}
export interface DecodedEvent {
  name: string;
  data: Decoded;
}

export interface VaultDecoder {
  readonly source: "spec" | "idl";
  readonly idlAddress: string | null;
  accountDiscriminator(name: AccountName): Buffer;
  decodeAccount(data: Buffer): DecodedAccount | null;
  decodeEvent(data: Buffer): DecodedEvent | null;
}

const hex = (b: Buffer) => b.toString("hex");

export function specDecoder(): VaultDecoder {
  const accounts = new Map(ACCOUNT_NAMES.map((n) => [hex(discriminator("account", n)), n] as const));
  const events = new Map(EVENT_NAMES.map((n) => [hex(discriminator("event", n)), n] as const));
  return {
    source: "spec",
    idlAddress: null,
    accountDiscriminator: (name) => discriminator("account", name),
    decodeAccount(data) {
      if (data.length < 8) return null;
      const name = accounts.get(hex(data.subarray(0, 8)));
      if (!name) return null;
      return { name, data: decodeLayout(ACCOUNT_LAYOUTS[name], data, 8) };
    },
    decodeEvent(data) {
      if (data.length < 8) return null;
      const name = events.get(hex(data.subarray(0, 8)));
      if (!name) return null;
      return { name, data: decodeLayout(EVENT_LAYOUTS[name], data, 8) };
    },
  };
}

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function norm(v: unknown): string | number | boolean | bigint {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint" || typeof v === "string") return v;
  const o = v as { toBase58?: () => string; toString?: (r?: number) => string; constructor?: { name?: string } };
  if (typeof o.toBase58 === "function") return o.toBase58();
  if (o.constructor?.name === "BN" || (typeof (v as { toArray?: unknown }).toArray === "function" && typeof o.toString === "function")) {
    return BigInt(o.toString!(10));
  }
  if (typeof v === "object") {
    const keys = Object.keys(v as object);
    if (keys.length === 1) return keys[0]!.toLowerCase();
  }
  throw new DecodeError(`unsupported IDL value ${String(v)}`);
}

function normalize(obj: Record<string, unknown>): Decoded {
  const out: Decoded = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) || v instanceof Uint8Array) continue;
    out[camel(k)] = norm(v);
  }
  return out;
}

interface IdlLike {
  address?: string;
  accounts?: { name: string; discriminator?: number[] }[];
  events?: { name: string; discriminator?: number[] }[];
}