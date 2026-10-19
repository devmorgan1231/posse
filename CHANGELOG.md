# Changelog

All notable changes to this project are documented in this file. Dates describe source snapshots; they do not imply a published GitHub release.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- The program is split into one module per instruction under `programs/posse_vault/src/instructions/`, each holding its account context and handler. `lib.rs` only delegates. Instruction logic, account layouts and the IDL are unchanged.
- CI runs `cargo clippy -D warnings`, `anchor build` with pinned Solana 3.0.0 and Anchor 0.31.1, an IDL drift check, the LiteSVM program tests and the mutation control suite, in addition to formatting, typecheck and SDK tests.

### Added

- `rust-toolchain.toml`, `.editorconfig`, CODEOWNERS, issue and pull request templates, Dependabot configuration and a code of conduct.

## 0.1.0 source snapshot - 2026-10-19

### Added

- `posse_vault` Anchor program deployed to devnet at `629C4PESAxcsvb82LEtYtVevevEY8HZEidMPf9KcjNNx`, with 18 instructions: `initialize_config`, `update_config`, `create_posse`, `contribute`, `withdraw`, `list_asset`, `cancel_listing`, `execute_purchase`, `issue_shares`, `expire`, `start_disposition`, `bid`, `settle_auction`, `buy_listed`, `claim_returned`, `claim_proceeds`, `claim_refund`, `close_posse`.
- Posse terms (asset mint, seller, maximum price, deadline, exit terms, royalty, fee rates) fixed at creation; purchase only within those terms; full refund when the target is not met by the deadline.
- Exit by timed auction with reserve or by fixed-price sale, with settlement by contribution share.
- Events emitted through `emit_cpi` for every state change.
- TypeScript SDK in `sdk/` with instruction builders, PDA helpers, account readers, error mapping and RPC freshness guards.
- Indexer decoding layer in `indexer/` for accounts and inner-instruction events.
- LiteSVM program test suite (20 tests), SDK test suite (49 tests) and a mutation control suite of 12 seeded faults.

