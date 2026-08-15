import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { ata, bn, pda, rawIx, type DispositionAccount, type PosseAccount } from "./program";

const pk = (x: PublicKey | string) => (typeof x === "string" ? new PublicKey(x) : x);

export interface CreatePosseParams {
  organizer: PublicKey;
  mint: PublicKey;
  nonce: bigint;
  seller: PublicKey;
  royaltyRecipient: PublicKey;
  royaltyBps: number;
  targetLamports: bigint;
  maxPriceLamports: bigint;
  closesAt: bigint;
  exitKind: 0 | 1;
  exitDay: number;
  exitPriceLamports: bigint;
  exitHours: number;
}

type PosseRef = Pick<PosseAccount, "mint" | "seller" | "royaltyRecipient" | "custodyRentPayer" | "organizer">;

export const ix = {
  initializeConfig(admin: PublicKey, feeWallet: PublicKey, executionFeeBps: number, settlementFeeBps: number, maxFeeBps: number): TransactionInstruction {
    return rawIx(
      "initialize_config",
      { admin, program_data: pda.programData() },
      { fee_wallet: feeWallet, execution_fee_bps: executionFeeBps, settlement_fee_bps: settlementFeeBps, max_fee_bps: maxFeeBps },
    );
  },

  updateConfig(
    admin: PublicKey,
    args: { feeWallet?: PublicKey; executionFeeBps?: number; settlementFeeBps?: number; admin?: PublicKey; paused?: boolean },
  ): TransactionInstruction {
    return rawIx(
      "update_config",
      { admin },
      {
        args: {
          fee_wallet: args.feeWallet ?? null,
          execution_fee_bps: args.executionFeeBps ?? null,
          settlement_fee_bps: args.settlementFeeBps ?? null,
          admin: args.admin ?? null,
          paused: args.paused ?? null,
        },
      },
    );
  },

  createPosse(p: CreatePosseParams): { ix: TransactionInstruction; posse: PublicKey; vault: PublicKey } {
    const posse = pda.posse(p.organizer, p.nonce);
    const vault = pda.vault(posse);
    const i = rawIx(
      "create_posse",
      { organizer: p.organizer, mint: p.mint, posse, vault },
      {
        args: {
          nonce: bn(p.nonce),
          seller: p.seller,
          royalty_recipient: p.royaltyRecipient,
          royalty_bps: p.royaltyBps,
          target_lamports: bn(p.targetLamports),
          max_price_lamports: bn(p.maxPriceLamports),
          closes_at: bn(p.closesAt),
          exit_kind: p.exitKind,
          exit_day: p.exitDay,
          exit_price_lamports: bn(p.exitPriceLamports),
          exit_hours: p.exitHours,
        },
      },
    );
    return { ix: i, posse, vault };
  },

  contribute(contributor: PublicKey, posse: PublicKey, amountLamports: bigint): TransactionInstruction {
    return rawIx(
      "contribute",
      { contributor, posse, vault: pda.vault(posse), contribution: pda.contribution(posse, contributor) },
      { amount: bn(amountLamports) },
    );
  },

  withdraw(contributor: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("withdraw", { contributor, posse, vault: pda.vault(posse), contribution: pda.contribution(posse, contributor) });
  },

  listAsset(seller: PublicKey, mint: PublicKey, askLamports: bigint, sellerToken = ata(seller, mint)): TransactionInstruction {
    const listing = pda.listing(seller, mint);
    return rawIx(
      "list_asset",
      { seller, mint, seller_token: sellerToken, listing, escrow: ata(listing, mint) },
      { ask_lamports: bn(askLamports) },
    );
  },

  cancelListing(seller: PublicKey, mint: PublicKey): TransactionInstruction {
    const listing = pda.listing(seller, mint);
    return rawIx("cancel_listing", { seller, mint, listing, escrow: ata(listing, mint), seller_token: ata(seller, mint) });
  },

  executePurchase(a: {
    caller: PublicKey;
    posse: PublicKey;
    feeWallet: PublicKey;
    listingSeller: PublicKey;
    listingMint: PublicKey;
    payTo?: PublicKey;
  }): TransactionInstruction {
    const listing = pda.listing(a.listingSeller, a.listingMint);
    const vault = pda.vault(a.posse);
    return rawIx("execute_purchase", {
      caller: a.caller,
      posse: a.posse,
      vault,
      listing,
      seller: a.payTo ?? a.listingSeller,
      fee_wallet: a.feeWallet,
      mint: a.listingMint,
      escrow: ata(listing, a.listingMint),
      custody: ata(vault, a.listingMint),
    });
  },

  issueShares(caller: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("issue_shares", { caller, posse });
  },

  expire(caller: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("expire", { caller, posse });
  },

  startDisposition(caller: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("start_disposition", { caller, posse, disposition: pda.disposition(posse) });
  },

  bid(bidder: PublicKey, posse: PublicKey, amountLamports: bigint, prevBidder: PublicKey | null): TransactionInstruction {
    return rawIx(
      "bid",
      { bidder, posse, disposition: pda.disposition(posse), bid_escrow: pda.bidEscrow(posse), prev_bidder: prevBidder },
      { amount: bn(amountLamports) },
    );
  },

  settleAuction(a: { caller: PublicKey; posse: PublicKey; p: PosseRef; d: Pick<DispositionAccount, "bidCount" | "highBidder" | "rentPayer">; feeWallet: PublicKey }): TransactionInstruction {
    const mint = pk(a.p.mint);
    const vault = pda.vault(a.posse);
    const winner = a.d.bidCount > 0 ? pk(a.d.highBidder) : null;
    return rawIx("settle_auction", {
      caller: a.caller,
      posse: a.posse,
      vault,
      disposition: pda.disposition(a.posse),
      bid_escrow: pda.bidEscrow(a.posse),
      disposition_rent_payer: pk(a.d.rentPayer),
      mint,
      custody: ata(vault, mint),
      winner,
      winner_token: winner ? ata(winner, mint) : null,
      royalty_recipient: pk(a.p.royaltyRecipient),
      fee_wallet: a.feeWallet,
      custody_rent_payer: pk(a.p.custodyRentPayer),
    });
  },

  buyListed(a: { buyer: PublicKey; posse: PublicKey; p: PosseRef; feeWallet: PublicKey }): TransactionInstruction {
    const mint = pk(a.p.mint);
    const vault = pda.vault(a.posse);
    return rawIx("buy_listed", {
      buyer: a.buyer,
      posse: a.posse,
      vault,
      disposition: pda.disposition(a.posse),
      mint,
      custody: ata(vault, mint),
      buyer_token: ata(a.buyer, mint),
      royalty_recipient: pk(a.p.royaltyRecipient),
      fee_wallet: a.feeWallet,
      custody_rent_payer: pk(a.p.custodyRentPayer),
    });
  },

  claimReturned(contributor: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("claim_returned", { contributor, posse, vault: pda.vault(posse), contribution: pda.contribution(posse, contributor) });
  },

  claimProceeds(contributor: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("claim_proceeds", {
      contributor,
      posse,
      vault: pda.vault(posse),
      disposition: pda.disposition(posse),
      contribution: pda.contribution(posse, contributor),
    });
  },

  claimRefund(contributor: PublicKey, posse: PublicKey): TransactionInstruction {
    return rawIx("claim_refund", { contributor, posse, vault: pda.vault(posse), contribution: pda.contribution(posse, contributor) });
  },

  closePosse(a: { caller: PublicKey; posse: PublicKey; organizer: PublicKey; feeWallet: PublicKey; dispositionRentPayer: PublicKey | null }): TransactionInstruction {
    return rawIx("close_posse", {
      caller: a.caller,
      posse: a.posse,
      organizer: a.organizer,
      vault: pda.vault(a.posse),
      fee_wallet: a.feeWallet,
      disposition: a.dispositionRentPayer ? pda.disposition(a.posse) : null,
      disposition_rent_payer: a.dispositionRentPayer,
    });
  },
};
