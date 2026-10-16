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

