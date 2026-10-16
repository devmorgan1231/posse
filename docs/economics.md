# Fees and the $POSSE buyback

## Protocol fees

| Fee | Default | Charged on | Paid at |
|---|---|---|---|
| Execution fee | 50 bps (0.5%) | purchase price | `execute_purchase` |
| Settlement fee | 50 bps (0.5%) | sale price | `settle_auction`, `buy_listed` |

Both rates live in `Config`. The deployed config sets `max_fee_bps` to 200 (2%), and the program caps `max_fee_bps` itself at 1000. Each posse copies the rates when it is created, so a later change never affects a posse already open.

The fee wallet receives only these fees. Principal, refunds, over-raise returns and contributor proceeds stay in the vault and go to contributors.

### Worked example

A posse raises 10 SOL and buys at an ask of 9 SOL.

- Execution fee: 9 * 0.5% = 0.045 SOL to the fee wallet.
- Over-raise: 10 - 9 - 0.045 = 0.955 SOL, returned to contributors by share.
- Later the asset sells at auction for 12 SOL with a 5% royalty.
- Royalty: 0.6 SOL. Settlement fee: 0.06 SOL. Net: 11.34 SOL.
- A contributor who chipped 2.5 SOL owns 25% and claims 2.835 SOL of the net plus 0.23875 SOL of the over-raise.

## Buyback and burn

- 30% of every fee that reaches the fee wallet funds market buys of $POSSE. Every token bought is burned in the same run.
- 50% of the launchpad creator fees earned on $POSSE are used the same way: claimed, used to buy $POSSE, and burned.
- A run starts when the pooled amount reaches its threshold or a set interval passes, whichever comes first. Per-run, hourly and daily limits, slippage and price-impact limits apply; anything not spent carries over to the next run.
- Every buy and burn is published with its Solscan transaction on the settlement ledger at https://posse.one.

The buyback worker is an off-chain service. It holds no authority over posse vaults: it acts only on fees that have already been paid out to the fee wallet and on creator fees.
