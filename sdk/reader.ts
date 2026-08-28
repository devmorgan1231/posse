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

export class PosseReader {
  readonly floor: SlotFloor;
  constructor(
    private readonly conn: FreshConnection,
    floor?: SlotFloor,
    private readonly opts: FreshOptions = {},
  ) {
    this.floor = floor ?? new SlotFloor();
  }

  raise(slot: number) {
    this.floor.raise(slot);
  }

  async many<K extends AccountName>(kind: K, keys: PublicKey[]): Promise<{ value: (AccountTypes[K] | null)[]; slot: number }> {
    const r = await readAccountsFresh(this.conn, this.floor, keys, this.opts);
    const value = r.value.map((acc) => {
      if (!acc) return null;
      const k = accountKind(acc.data);
      if (k !== kind) throw new Error(`expected ${kind} account, got ${k ?? "unknown discriminator"}`);
      return decodeAccount(kind, acc.data);
    });
    return { value, slot: r.slot };
  }

  async one<K extends AccountName>(kind: K, key: PublicKey): Promise<Snapshot<AccountTypes[K]>> {
    const r = await this.many(kind, [key]);
    return { value: r.value[0] ?? null, slot: r.slot };
  }

  config() {
    return this.one("Config", pda.config());
  }
  posse(posse: PublicKey) {
    return this.one("Posse", posse);
  }
  contribution(posse: PublicKey, contributor: PublicKey) {
    return this.one("Contribution", pda.contribution(posse, contributor));
  }
  listing(seller: PublicKey, mint: PublicKey) {
    return this.one("Listing", pda.listing(seller, mint));
  }
  disposition(posse: PublicKey) {
    return this.one("Disposition", pda.disposition(posse));
  }

  async posseView(posse: PublicKey, contributor?: PublicKey) {
    const keys = [posse, pda.vault(posse), pda.disposition(posse)];
    if (contributor) keys.push(pda.contribution(posse, contributor));
    const r = await readAccountsFresh(this.conn, this.floor, keys, this.opts);
    const [p, v, d, c] = r.value;
    return {
      slot: r.slot,
      posse: p ? decodeAccount("Posse", p.data) : null,
      vaultLamports: v ? BigInt(v.lamports) : BigInt(0),
      disposition: d ? decodeAccount("Disposition", d.data) : null,
      contribution: c ? decodeAccount("Contribution", c.data) : null,
    };
  }

  settle(signatures: (string | SigRef)[], lastValidBlockHeight: number, opts?: SettleOptions): Promise<TxVerdict> {
    return resolveSignatures(this.conn, this.floor, signatures, lastValidBlockHeight, opts);
  }
}
