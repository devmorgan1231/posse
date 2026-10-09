#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
OUT="${MUTANT_DIR:-target/mutants}"
declare -A EXPECT=(
  [i1]="seller / asset swap"
  [i2]="admin cannot rug"
  [i3]="happy auction"
  [i4]="asset authenticity"
  [i5]="admin cannot rug"
  [i6]="admin cannot rug"
  [i7]="not met -> refund"
  [i8]="happy auction"
  [i9]="happy auction"
  [i10]="happy auction"
  [i11]="withdraw: allowed while raising"
  [i12]="happy auction"
)
caught=0; total=0; rows=()
for m in ${ONLY:-i1 i2 i3 i4 i5 i6 i7 i8 i9 i10 i11 i12}; do
  total=$((total+1))
  dir="$OUT/$m"; mkdir -p "$dir"
  if ! cargo build-sbf --manifest-path programs/posse_vault/Cargo.toml --features "mut-$m" --sbf-out-dir "$dir" >"$dir/build.log" 2>&1; then
    rows+=("$m build-failed"); continue
  fi
  POSSE_SO="$dir/posse_vault.so" npx tsx --test tests/program/litesvm.test.ts > "$dir/litesvm.log" 2>&1
  fails=$(grep -E '^not ok' "$dir/litesvm.log" | sed -E 's/^not ok [0-9]+ - //')
  n=$(printf '%s\n' "$fails" | grep -c . || true)
  if printf '%s\n' "$fails" | grep -qF "${EXPECT[$m]}"; then
    caught=$((caught+1)); rows+=("$m caught failing=$n expected='${EXPECT[$m]}'")
  else
    rows+=("$m missed failing=$n expected='${EXPECT[$m]}'")
  fi
done
printf '  %s\n' "${rows[@]}"
verdict=FAIL; [ "$caught" = "$total" ] && verdict=PASS
echo "mutation mutants=$total caught=$caught verdict=$verdict"
[ "$verdict" = PASS ]
