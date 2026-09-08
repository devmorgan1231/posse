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

export async function idlDecoder(idl: IdlLike): Promise<VaultDecoder> {
  const { BorshCoder } = await import("@coral-xyz/anchor");
  const coder = new BorshCoder(idl as any);
  const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const accountByDisc = new Map<string, { idlName: string; name: string }>();
  for (const a of idl.accounts ?? []) {
    const d = a.discriminator ? Buffer.from(a.discriminator) : discriminator("account", pascal(a.name));
    accountByDisc.set(hex(d), { idlName: a.name, name: pascal(a.name) });
  }
  const known = new Set<string>(ACCOUNT_NAMES);
  return {
    source: "idl",
    idlAddress: idl.address ?? null,
    accountDiscriminator(name) {
      for (const [d, a] of accountByDisc) if (a.name === name) return Buffer.from(d, "hex");
      return discriminator("account", name);
    },
    decodeAccount(data) {
      if (data.length < 8) return null;
      const a = accountByDisc.get(hex(data.subarray(0, 8)));
      if (!a || !known.has(a.name)) return null;
      try {
        return { name: a.name as AccountName, data: normalize(coder.accounts.decode(a.idlName, data)) };
      } catch (e) {
        throw new DecodeError(`IDL account ${a.name}: ${(e as Error).message}`);
      }
    },
    decodeEvent(data) {
      let ev: { name: string; data: Record<string, unknown> } | null;
      try {
        ev = coder.events.decode(data.toString("base64")) as typeof ev;
      } catch (e) {
        throw new DecodeError(`IDL event: ${(e as Error).message}`);
      }
      if (!ev) return null;
      return { name: pascal(ev.name), data: normalize(ev.data) };
    },
  };
}

export function idlCandidates(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): string[] {
  const list = [env.POSSE_IDL_PATH, "sdk/idl/posse_vault.json"].filter(Boolean) as string[];
  return list.map((p) => path.resolve(cwd, p));
}