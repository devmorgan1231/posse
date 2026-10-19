# Contributing

## Setup

Rust 1.95.0 (pinned in `rust-toolchain.toml`), Solana CLI 3.0.0, Anchor CLI 0.31.1 and Node.js 22.

```bash
npm ci
npm run build
```

## Before opening a pull request

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run typecheck
npm test
```

Changes to the program also need:

```bash
npm run test:mutation
npm run sync-idl
```

- Every change to an instruction comes with a scenario in `tests/program/scenarios.ts`, including the cases the program must reject.
- Account layouts are append-only: new fields go into the reserved tail, existing fields never move.
- Keep amounts in integer lamports and use checked arithmetic.
- Commit messages are plain sentences describing the change.
