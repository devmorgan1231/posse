# Security model

## Invariants

| # | Invariant | Enforced by |
|---|---|---|
| I1 | Vault SOL can only go to the fixed seller and fee wallet (purchase), back to a contributor (withdraw, refund, share claims), or as dust and rent at close. No instruction takes a free recipient. | Account constraints on every payee; `execute_purchase` checks the listing seller and mint against the posse. |
| I2 | Posse terms are fixed at creation. Config changes never reach existing posses. | Each posse stores its own fee rates and terms; no instruction edits them. |
| I3 | Cranks are permissionless. | `execute_purchase`, `issue_shares`, `expire`, `start_disposition`, `settle_auction`, `close_posse` accept any signer and check only state and time. |
| I4 | The asset is authentic: decimals 0, exactly one token moved, supply 1 or no mint authority, matching mint and seller. | Checks in `create_posse`, `list_asset` and `execute_purchase`. |
| I5 | Fees never exceed the cap. | `update_config` rejects rates above `max_fee_bps`; `max_fee_bps` itself is capped at 1000. |
| I6 | Pause never blocks withdrawals, refunds, claims or settlement. | In the default build the pause check exists only in `create_posse` and `contribute`. |
| I7 | The vault keeps its rent-exempt minimum. | Every vault transfer leaves the reserve in place. |
| I8 | Custody and escrow rent stay outside the pool. | Rent is paid by the caller that creates those accounts and returned to it when they close. |
| I9 | The bid escrow holds only the current high bid. | `bid` refunds the previous bidder in the same transaction. |
| I10 | A posse is never over-funded. | `contribute` clamps to the remaining headroom. |
| I11 | No withdrawal after Funded. | `withdraw` requires Open or Raising. |
| I12 | Rounding never overpays. | Shares use floor division; the sum of payouts is at most the pool and dust goes out only at close. |

