# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's private vulnerability reporting: open the Security tab of this repository and choose "Report a vulnerability". Do not open a public issue for a security problem.

Include the affected instruction or module, the conditions needed, and a reproduction if you have one. A LiteSVM scenario in `tests/program/scenarios.ts` is the most useful form.

We will confirm receipt and keep you updated until the issue is resolved.

## Scope

- The `posse_vault` program in `programs/posse_vault`
- The client in `sdk/` and the decoding layer in `indexer/`

Of most interest: any path that moves vault SOL or a held asset to an account other than the ones fixed by the posse terms, any way to change terms after creation, any way to block refunds or claims, and any rounding that pays out more than the pool.

## Design references

- [docs/security-model.md](docs/security-model.md): invariants, attacks, mutation testing
- [docs/protocol.md](docs/protocol.md): accounts, instructions, state machine
