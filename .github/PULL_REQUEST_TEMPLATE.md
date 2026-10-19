## Summary

## Changes

## Checklist

- [ ] `cargo fmt --all -- --check` and `cargo clippy --all-targets -- -D warnings` pass
- [ ] `npm run typecheck` and `npm test` pass
- [ ] Program changes: a scenario in `tests/program/scenarios.ts` covers the new behavior and the cases it must reject
- [ ] Program changes: `npm run test:mutation` passes and `npm run sync-idl` was run after `anchor build`
- [ ] Account layouts only append into the reserved tail
- [ ] docs updated where the protocol changed
