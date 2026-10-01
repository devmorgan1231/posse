import { readFileSync } from "node:fs";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createFreezeAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { POSSE_VAULT_PROGRAM_ID, BPF_LOADER_UPGRADEABLE_ID, decodeEventIxData, errorCode, pda } from "../../sdk/index.ts";

export interface SendResult {
  ok: boolean;
  code: number | null;
  logs: string[];
  cu: number;
  err: string;
  sig: string | null;
  bytes: number;
  events: { name: string; data: Record<string, unknown> }[];
}

export interface NftOpts {
  decimals?: number;
  amount?: bigint;
  keepMintAuthority?: boolean;
  freezeAuthority?: Keypair | null;
}

export interface Chain {
  kind: "litesvm";
  admin: Keypair;
  send(ixs: TransactionInstruction[], signers: Keypair[], feePayer?: Keypair): Promise<SendResult>;
  sendConcurrent(batch: { ixs: TransactionInstruction[]; signers: Keypair[]; feePayer?: Keypair }[]): Promise<SendResult[]>;
  now(): Promise<number>;
  warpTo(unix: number): Promise<void>;
  lamports(pk: PublicKey): Promise<bigint>;
  data(pk: PublicKey): Promise<Buffer | null>;
  tokenBal(tokenAccount: PublicKey): Promise<bigint>;
  fundSol(pk: PublicKey, sol: number): Promise<void>;
  rentExempt(bytes: number): Promise<bigint>;
  createNft(owner: PublicKey, o?: NftOpts): Promise<PublicKey>;
  transferToken(from: Keypair, mint: PublicKey, to: PublicKey, amount?: bigint): Promise<void>;
  freeze(authority: Keypair, mint: PublicKey, tokenAccount: PublicKey): Promise<void>;
  wallet(sol?: number): Promise<Keypair>;
}

const SOL = 1_000_000_000n;

function uniqSigners(feePayer: Keypair, signers: Keypair[]): Keypair[] {
  return [feePayer, ...signers].filter((k, i, arr) => arr.findIndex((x) => x.publicKey.equals(k.publicKey)) === i);
}

function nftHelpers(chainRef: () => Chain, payer: Keypair) {
  const mintAuth = Keypair.generate();
  return {
    mintAuth,
    async createNft(owner: PublicKey, o: NftOpts = {}) {
      const chain = chainRef();
      const m = Keypair.generate();
      const rent = await chain.rentExempt(MINT_SIZE);
      const ownerAta = getAssociatedTokenAddressSync(m.publicKey, owner, true);
      const ixs: TransactionInstruction[] = [
        SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: m.publicKey, lamports: Number(rent), space: MINT_SIZE, programId: TOKEN_PROGRAM_ID }),
        createInitializeMint2Instruction(m.publicKey, o.decimals ?? 0, mintAuth.publicKey, o.freezeAuthority ? o.freezeAuthority.publicKey : null),
        createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ownerAta, owner, m.publicKey),
        createMintToInstruction(m.publicKey, ownerAta, mintAuth.publicKey, o.amount ?? 1n),
      ];
      if (!o.keepMintAuthority) ixs.push(createSetAuthorityInstruction(m.publicKey, mintAuth.publicKey, AuthorityType.MintTokens, null));
      const r = await chain.send(ixs, [m, mintAuth]);
      if (!r.ok) throw new Error(`createNft failed: ${r.err} ${r.logs.slice(-3).join(" | ")}`);
      return m.publicKey;
    },
    async transferToken(from: Keypair, mint: PublicKey, to: PublicKey, amount = 1n) {
      const chain = chainRef();
      const src = getAssociatedTokenAddressSync(mint, from.publicKey, true);
      const dst = getAssociatedTokenAddressSync(mint, to, true);
      const r = await chain.send(
        [createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, dst, to, mint), createTransferInstruction(src, dst, from.publicKey, amount)],
        [from],
      );
      if (!r.ok) throw new Error(`transferToken failed: ${r.err}`);
    },
    async freeze(authority: Keypair, mint: PublicKey, tokenAccount: PublicKey) {
      const r = await chainRef().send([createFreezeAccountInstruction(tokenAccount, mint, authority.publicKey)], [authority]);
      if (!r.ok) throw new Error(`freeze failed: ${r.err}`);
    },
  };
}

export async function liteSvmChain(soPath: string): Promise<Chain> {
  const { LiteSVM, FailedTransactionMetadata } = await import("litesvm");
  const { address, getTransactionDecoder, lamports } = await import("@solana/kit");
  const svm = new LiteSVM();
  const a = (pk: PublicKey) => address(pk.toBase58());
  const admin = Keypair.generate();
  const payer = Keypair.generate();
  svm.addProgramWithLoader(a(POSSE_VAULT_PROGRAM_ID), readFileSync(soPath), a(BPF_LOADER_UPGRADEABLE_ID));
  const pd = pda.programData();
  const acc = svm.getAccount(a(pd));
  if (!acc.exists) throw new Error("ProgramData missing after upgradeable load");
  const pdData = new Uint8Array(acc.data);
  pdData[12] = 1;
  pdData.set(admin.publicKey.toBytes(), 13);
  svm.setAccount({ ...acc, data: pdData });
  const fund = (pk: PublicKey, n: bigint) => {
    const r = svm.airdrop(a(pk), lamports(n));
    if (!r || r instanceof FailedTransactionMetadata) throw new Error(`airdrop failed: ${r}`);
  };
  {
    const c0 = svm.getClock();
    c0.unixTimestamp = BigInt(Math.floor(Date.now() / 1000));
    svm.setClock(c0);
  }
  fund(payer.publicKey, 100_000n * SOL);
  fund(admin.publicKey, 1_000n * SOL);

  const run = (tx: Transaction, expire = true): SendResult => {
    const wire = tx.serialize();
    const keys = tx.compileMessage().accountKeys;
    const res = svm.sendTransaction(getTransactionDecoder().decode(wire));
    if (expire) svm.expireBlockhash();
    if (res instanceof FailedTransactionMetadata) {
      const logs = res.meta().logs();
      const err = String(res.toString());
      return { ok: false, code: errorCode(logs, err), logs, cu: Number(res.meta().computeUnitsConsumed()), err, sig: null, bytes: wire.length, events: [] };
    }
    const events: SendResult["events"] = [];
    for (const group of res.innerInstructions()) {
      for (const inner of group) {
        const ci = inner.instruction();
        const pid = keys[ci.programIdIndex()];
        if (!pid || !pid.equals(POSSE_VAULT_PROGRAM_ID)) continue;
        const ev = decodeEventIxData(ci.data());
        if (ev) events.push(ev);
      }
    }
    return { ok: true, code: null, logs: res.logs(), cu: Number(res.computeUnitsConsumed()), err: "", sig: bs58.encode(tx.signature!), bytes: wire.length, events };
  };

  let chain: Chain;
  const nft = nftHelpers(() => chain, payer);
  fund(nft.mintAuth.publicKey, 10n * SOL);
  chain = {
    kind: "litesvm",
    admin,
    async send(ixs, signers, feePayer = payer) {
      const tx = new Transaction({ feePayer: feePayer.publicKey, recentBlockhash: svm.latestBlockhash() }).add(...ixs);
      tx.sign(...uniqSigners(feePayer, signers));
      return run(tx);
    },
    async sendConcurrent(batch) {
      const bh = svm.latestBlockhash();
      const txs = batch.map((b) => {
        const fp = b.feePayer ?? payer;
        const tx = new Transaction({ feePayer: fp.publicKey, recentBlockhash: bh }).add(...b.ixs);
        tx.sign(...uniqSigners(fp, b.signers));
        return tx;
      });
      const out = txs.map((t) => run(t, false));
      svm.expireBlockhash();
      return out;
    },
    async now() {
      return Number(svm.getClock().unixTimestamp);
    },
    async warpTo(unix) {
      const c = svm.getClock();
      c.unixTimestamp = BigInt(unix);
      svm.setClock(c);
    },
    async lamports(pk) {
      return BigInt(svm.getBalance(a(pk)) ?? 0n);
    },
    async data(pk) {
      const acc = svm.getAccount(a(pk));
      return acc.exists ? Buffer.from(acc.data) : null;
    },
    async tokenBal(pk) {
      const d = await chain.data(pk);
      return d ? d.readBigUInt64LE(64) : 0n;
    },
    async fundSol(pk, sol) {
      fund(pk, BigInt(Math.round(sol * 1e9)));
    },
    async rentExempt(bytes) {
      return BigInt(svm.minimumBalanceForRentExemption(BigInt(bytes)));
    },
    async wallet(sol = 100) {
      const k = Keypair.generate();
      fund(k.publicKey, BigInt(Math.round(sol * 1e9)));
      return k;
    },
    createNft: nft.createNft,
    transferToken: nft.transferToken,
    freeze: nft.freeze,
  };
  return chain;
}
