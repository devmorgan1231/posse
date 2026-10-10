#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -s target/idl/posse_vault.json ] || { echo "target/idl/posse_vault.json missing: run anchor build first"; exit 1; }
cp target/idl/posse_vault.json sdk/idl/posse_vault.json
cp target/types/posse_vault.ts sdk/idl/posse_vault.ts
echo "idl synced: sdk/idl/posse_vault.json sdk/idl/posse_vault.ts"
