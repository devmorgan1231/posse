import fs from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";
import { expect } from "./expect";
import { ACCOUNT_LAYOUTS, EVENT_LAYOUTS, type AccountName, type Decoded, type EventName } from "../../indexer/codec";
import { idlDecoder, loadDecoder, specDecoder, type VaultDecoder } from "../../indexer/decoder";
import { encodeAccount, encodeEvent, key } from "./helpers";

const idlPath = path.resolve(__dirname, "../../sdk/idl/posse_vault.json");
const haveIdl = fs.existsSync(idlPath);

function sample(layout: readonly (readonly [string, string])[], seed: number): Decoded {
  const out: Decoded = {};
  layout.forEach(([name, t], i) => {
    const n = seed * 31 + i;
    if (t === "pubkey") out[name] = key();
    else if (t === "bool") out[name] = n % 2 === 0;
    else if (t === "u8") out[name] = n % 7;
    else if (t === "u16") out[name] = (n * 97) % 65535;
    else if (t === "u32") out[name] = n * 1009;
    else if (t === "u64") out[name] = BigInt(n) * BigInt(1_000_000_007);
    else out[name] = BigInt(1_700_000_000 + n);
  });
  return out;
}

describe("IDL decoder == spec codec", { skip: !haveIdl }, () => {
  const idl = haveIdl ? JSON.parse(fs.readFileSync(idlPath, "utf8")) : {};
  const fromSpec = specDecoder();
  let fromIdl: VaultDecoder;
  before(async () => {
    fromIdl = await idlDecoder(idl);
  });

  it("loadDecoder picks the checked-in IDL", async () => {
    const d = await loadDecoder({}, path.resolve(__dirname, "../.."));
    expect(d.source).toBe("idl");
    expect(d.idlAddress).toBe(idl.address);
  });

  for (const name of Object.keys(ACCOUNT_LAYOUTS) as AccountName[]) {
    it(`account ${name}`, () => {
      const v = sample(ACCOUNT_LAYOUTS[name], name.length);
      const bytes = encodeAccount(name, v, 64);
      expect(fromIdl.accountDiscriminator(name).equals(fromSpec.accountDiscriminator(name))).toBe(true);
      const a = fromIdl.decodeAccount(bytes);
      const b = fromSpec.decodeAccount(bytes);
      expect(a?.name).toBe(name);
      expect(a?.data).toEqual(b?.data);
    });
  }

  for (const name of Object.keys(EVENT_LAYOUTS) as EventName[]) {
    it(`event ${name}`, () => {
      const v = sample(EVENT_LAYOUTS[name], name.length + 3);
      const bytes = encodeEvent(name, v);
      const a = fromIdl.decodeEvent(bytes);
      const b = fromSpec.decodeEvent(bytes);
      expect(a?.name).toBe(name);
      expect(a?.data).toEqual(b?.data);
    });
  }

  it("every IDL account and event has a spec layout (no event type the indexer cannot read)", () => {
    const accounts = (idl.accounts as { name: string }[]).map((a) => a.name).sort();
    const events = (idl.events as { name: string }[]).map((e) => e.name).sort();
    expect(accounts).toEqual(Object.keys(ACCOUNT_LAYOUTS).sort());
    expect(events).toEqual(Object.keys(EVENT_LAYOUTS).sort());
  });
});
