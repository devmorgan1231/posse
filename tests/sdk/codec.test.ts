import { describe, it } from "node:test";
import { expect } from "./expect";
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { ACCOUNT_LAYOUTS, DecodeError, EVENT_IX_TAG, decodeLayout, discriminator, encodeLayout, enumName, POSSE_STATUS } from "../../indexer/codec";
import { specDecoder } from "../../indexer/decoder";
import { extractEvents } from "../../indexer/chain";
import { encodeAccount, encodeEvent, key, posseData, SOL } from "./helpers";

describe("codec", () => {
  it("discriminators are sha256(namespace:Name)[:8] (anchor)", () => {
    const want = createHash("sha256").update("account:Posse").digest().subarray(0, 8);
    expect(discriminator("account", "Posse").equals(want)).toBe(true);
    expect(EVENT_IX_TAG.toString("hex")).toBe("e445a52e51cb9a1d");
  });
});

describe("event extraction from a transaction", () => {
});
