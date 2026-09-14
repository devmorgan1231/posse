import { Keypair } from "@solana/web3.js";
import { ACCOUNT_LAYOUTS, EVENT_LAYOUTS, discriminator, encodeLayout, type AccountName, type Decoded, type EventName } from "../../indexer/codec";

export const key = () => Keypair.generate().publicKey.toBase58();
export const SOL = (n: number) => BigInt(Math.round(n * 1e9));

export function encodeAccount(name: AccountName, data: Decoded, reserved = 64): Buffer {
  return Buffer.concat([discriminator("account", name), encodeLayout(ACCOUNT_LAYOUTS[name], data), Buffer.alloc(reserved)]);
}

export function encodeEvent(name: EventName, data: Decoded): Buffer {
  return Buffer.concat([discriminator("event", name), encodeLayout(EVENT_LAYOUTS[name], data)]);
}

export function posseData(o: Partial<Record<string, bigint | number | string | boolean>> & { organizer: string; mint: string; seller: string }): Decoded {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return {
    nonce: BigInt(1), vaultBump: 255, bump: 254, royaltyRecipient: o.seller, royaltyBps: 500,
    targetLamports: SOL(10), maxPriceLamports: SOL(10), feeBps: 50, createdAt: now - BigInt(3600), closesAt: now + BigInt(86400 * 3),
    status: 0, raisedLamports: BigInt(0), contributorCount: 0, exitKind: 0, exitDay: 30, exitPriceLamports: SOL(12), exitHours: 48,
    priceLamports: BigInt(0), execFeeLamports: BigInt(0), returnedLamports: BigInt(0), boughtAt: BigInt(0), sharesIssuedAt: BigInt(0),
    custodyRentPayer: o.organizer, settleFeeBps: 50, fundedAt: BigInt(0), finalClaims: 0, vaultRent: BigInt(890880),
    ...o,
  } as Decoded;
}
