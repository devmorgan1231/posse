import bs58 from "bs58";

export const CLOCK_SYSVAR_ADDRESS = "SysvarC1ock11111111111111111111111111111111";
export const MAX_CLOCK_LAG_SLOTS = 150;

export function maxClockLagSlots(env: Record<string, string | undefined> = process.env): number {
  const n = Number((env.RPC_MAX_CLOCK_LAG_SLOTS ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : MAX_CLOCK_LAG_SLOTS;
}
export const SENTINEL_RETRIES = 5;
const MAX_KEYS = 100;

export function clockSlotOf(data: Uint8Array): number | null {
  if (data.length < 8) return null;
  return Number(new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(0, true));
}

export function isStaleSnapshot(contextSlot: number, clockSlot: number | null, maxLag = maxClockLagSlots()): boolean {
  return clockSlot === null || contextSlot - clockSlot > maxLag;
}

export class StaleRpcSnapshot extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lagSlots: number | null,
  ) {
    super(`every RPC answer came from a lagging node (${attempts} reads, last lag ${lagSlots ?? "?"} slots)`);
    this.name = "StaleRpcSnapshot";
  }
}

type JsonObject = Record<string, unknown>;
type UiAccount = { data?: unknown } & JsonObject;
type GmaResult = { context: { slot: number } & JsonObject; value: (UiAccount | null)[] };

export interface SentinelPlan {
  params: [string[], JsonObject];
  clockSlot(result: GmaResult): number | null;
  rebuild(result: GmaResult): { result: unknown } | { error: { code: number; message: string } };
}

const isObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null && !Array.isArray(v);
const isKey = (v: unknown): v is string => typeof v === "string" && v.length > 0;

function pick(config: JsonObject, fields: string[]): JsonObject {
  const out: JsonObject = {};
  for (const f of fields) if (config[f] !== undefined) out[f] = config[f];
  return out;
}

function clockSlotFromUi(acc: UiAccount | null | undefined): number | null {
  if (!acc) return null;
  const d = acc.data;
  try {
    if (typeof d === "string") return clockSlotOf(bs58.decode(d));
    if (Array.isArray(d) && typeof d[0] === "string") {
      if (d[1] === "base64") return clockSlotOf(Buffer.from(d[0], "base64"));
      if (d[1] === "base58") return clockSlotOf(bs58.decode(d[0]));
      return null;
    }
    if (isObject(d) && isObject(d.parsed) && isObject(d.parsed.info) && typeof d.parsed.info.slot === "number") {
      return d.parsed.info.slot;
    }
  } catch {
    return null;
  }
  return null;
}

const DECODABLE = new Set(["base64", "base58", "binary", "jsonParsed"]);

function clockReadable(config: JsonObject): boolean {
  if (config.encoding !== undefined && !(typeof config.encoding === "string" && DECODABLE.has(config.encoding))) return false;
  if (config.dataSlice === undefined || config.dataSlice === null) return true;
  const s = config.dataSlice;
  return isObject(s) && s.offset === 0 && typeof s.length === "number" && s.length >= 8;
}

function clockAt(index: number) {
  return (r: GmaResult) => clockSlotFromUi(r.value[index]);
}

export function planSentinelRead(method: string, params: unknown): SentinelPlan | null {
  if (!Array.isArray(params)) return null;
  const [first, rawConfig] = params as [unknown, unknown];
  if (params.length > 2 || (rawConfig !== undefined && !isObject(rawConfig))) return null;
  const config: JsonObject = rawConfig ?? {};

  switch (method) {
    case "getBalance": {
      if (!isKey(first)) return null;
      const up = { ...pick(config, ["commitment", "minContextSlot"]), encoding: "base64", dataSlice: { offset: 0, length: 8 } };
      return {
        params: [[first, CLOCK_SYSVAR_ADDRESS], up],
        clockSlot: clockAt(1),
        rebuild: (r) => {
          const acc = r.value[0];
          return { result: { context: r.context, value: acc && typeof acc.lamports === "number" ? acc.lamports : 0 } };
        },
      };
    }
    case "getAccountInfo": {
      if (!isKey(first) || !clockReadable(config)) return null;
      const up = { ...config, encoding: config.encoding ?? "binary" };
      return {
        params: [[first, CLOCK_SYSVAR_ADDRESS], up],
        clockSlot: clockAt(1),
        rebuild: (r) => ({ result: { context: r.context, value: r.value[0] ?? null } }),
      };
    }
    case "getMultipleAccounts": {
      if (!Array.isArray(first) || !first.every(isKey) || first.length === 0 || first.length >= MAX_KEYS) return null;
      if (!clockReadable(config)) return null;
      const n = first.length;
      return {
        params: [[...(first as string[]), CLOCK_SYSVAR_ADDRESS], config],
        clockSlot: clockAt(n),
        rebuild: (r) => ({ result: { context: r.context, value: r.value.slice(0, n) } }),
      };
    }
    case "getTokenAccountBalance": {
      if (!isKey(first)) return null;
      const up = { ...pick(config, ["commitment", "minContextSlot"]), encoding: "jsonParsed" };
      return {
        params: [[first, CLOCK_SYSVAR_ADDRESS], up],
        clockSlot: clockAt(1),
        rebuild: (r) => {
          const acc = r.value[0];
          if (!acc) return { error: { code: -32602, message: "Invalid param: could not find account" } };
          const d = acc.data;
          const amount =
            isObject(d) && isObject(d.parsed) && d.parsed.type === "account" && isObject(d.parsed.info) ? d.parsed.info.tokenAmount : undefined;
          if (!isObject(amount)) return { error: { code: -32602, message: "Invalid param: not a Token account" } };
          return { result: { context: r.context, value: amount } };
        },
      };
    }
    default:
      return null;
  }
}
