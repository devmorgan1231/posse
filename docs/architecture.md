# Architecture

```mermaid
flowchart LR
    W["Wallet, the only signer"]
    APP["App"]
    SDK["sdk/"]
    PROG["posse_vault program"]
    CR["Permissionless cranks"]
    RPC["RPC node"]
    IDX["indexer/"]
    OUT["Database and public ledger"]

    APP --> SDK
    SDK -- "build tx" --> W
    W -- "signed tx" --> PROG
    CR --> PROG
    PROG -- "events via emit_cpi" --> RPC
    RPC -- "stale-safe reads" --> SDK
    RPC -- "stale-safe reads" --> IDX
    IDX --> OUT
```

## On-chain program

`programs/posse_vault` is a single Anchor 0.31 program. It holds every lamport and every asset involved in a posse and is the only component that can move them. The instruction set, accounts and state machine are in [protocol.md](protocol.md).

There is no server co-signer in any instruction. A user transaction is signed by the user's wallet alone. Instructions that advance a posse on time are permissionless, so the posse does not depend on any operator being online.

