# Protocol

All amounts on chain are lamports (`u64`). All times are the chain Clock `unix_timestamp`. Numbers inside PDA seeds are little-endian. Discriminators follow Anchor: `sha256("account:<Name>")[..8]`, `sha256("event:<Name>")[..8]`, `sha256("global:<snake_name>")[..8]`.

## Accounts

| Account | Seeds | Purpose |
|---|---|---|
| `Config` | `["config"]` | Admin, fee wallet, execution and settlement fee rates, fee cap, pause flag. One per program. |
| `Posse` | `["posse", organizer, nonce]` | The terms of one group purchase and its progress. |
| Vault | `["vault", posse]` | System account with no data that holds the pooled SOL. |
| Custody | ATA of (vault, mint) | Holds the asset after the purchase. |
| `Contribution` | `["contribution", posse, contributor]` | One per contributor per posse. The share record. |
| `Listing` | `["listing", seller, mint]` | A seller's deposited asset and ask. |
| Listing escrow | ATA of (listing, mint) | Holds the listed asset until it is bought or withdrawn. |
| `Disposition` | `["disposition", posse]` | The exit sale: kind, timing, reserve, high bid, settlement amounts. |
| Bid escrow | `["bid-escrow", posse]` | System account holding only the current high bid. |

Every account with data carries a reserved tail so fields can be appended in an upgrade without moving existing ones.

### Posse terms fixed at creation

`mint`, `seller`, `royalty_recipient`, `royalty_bps`, `target_lamports`, `max_price_lamports`, `closes_at`, `exit_kind` (0 auction, 1 fixed price), `exit_day` (hold period in days), `exit_price_lamports` (auction reserve or fixed price, at least 0.01 SOL), `exit_hours` (auction length, 1 to 720), plus `fee_bps` and `settle_fee_bps` copied from `Config`.

Share is never stored. While raising it is `chip / target`; after a purchase it is `chip / raised`, computed at claim time.

