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

  it("round-trips a Posse account with a reserved tail and reads only the known prefix", () => {
    const org = key();
    const d = posseData({ organizer: org, mint: key(), seller: key(), raisedLamports: SOL(7.25), status: 1, contributorCount: 3 });
    const dec = specDecoder().decodeAccount(encodeAccount("Posse", d, 128));
    expect(dec?.name).toBe("Posse");
    expect(dec?.data.raisedLamports).toBe(SOL(7.25));
    expect(dec?.data.organizer).toBe(org);
    expect(dec?.data.contributorCount).toBe(3);
  });

  it("unknown discriminator -> null; short data under a known discriminator -> DecodeError", () => {
    const dec = specDecoder();
    expect(dec.decodeAccount(Buffer.alloc(64, 7))).toBeNull();
    const short = Buffer.concat([discriminator("account", "Posse"), Buffer.alloc(10)]);
    expect(() => dec.decodeAccount(short)).toThrow(DecodeError);
    expect(dec.decodeEvent(encodeEvent("Funded", { posse: key(), raised: SOL(10) }))?.name).toBe("Funded");
  });

  it("bool bytes other than 0/1 are rejected (layout drift shows up as a failure, not a value)", () => {
    const l = ACCOUNT_LAYOUTS.Contribution;
    const buf = encodeLayout(l, { posse: key(), contributor: key(), amountLamports: BigInt(1), firstAt: BigInt(1), returnedClaimed: false, finalClaimed: false, bump: 1 });
    buf[32 + 32 + 8 + 8] = 9;
    expect(() => decodeLayout(l, buf)).toThrow(DecodeError);
  });
});

describe("event extraction from a transaction", () => {
});
