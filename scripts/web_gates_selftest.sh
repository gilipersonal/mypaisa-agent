#!/usr/bin/env bash
# The web gate's axe check, proved to bite (MA-304, MA-362; lessons 12, 16 and 49 of .claude/rules/independent-review.md).
# Each case copies web/e2e, web/src and web's top-level files into a fresh folder, plants one fault, runs the gate's own
# check on it (scripts/web_gates.sh --check-axe) and expects the failure it names; the untouched copy must pass, so the
# harness makes no failure of its own. scripts/web_gates.sh runs this after the check; run it alone the same way.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
web="$here/../web"
gate="$here/web_gates.sh"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
passed=0
failed=0

fresh() {
  local dir="$work/$1"
  mkdir -p "$dir"
  cp -R "$web/e2e" "$web/src" "$dir/"
  find "$web" -maxdepth 1 -type f \( -name '*.ts' -o -name '*.js' -o -name '*.json' \) -exec cp {} "$dir/" \;
  printf '%s' "$dir"
}

# expect <case> <dir> <pass|text the failure must say>
expect() {
  local name=$1 dir=$2 want=$3 out rc
  set +e
  out=$("$gate" --check-axe "$dir" 2>&1)
  rc=$?
  set -e
  if [[ "$want" == pass ]]; then
    if (( rc == 0 )); then passed=$((passed + 1)); else failed=$((failed + 1)); printf 'FAIL %s: expected a pass, got exit %s:\n%s\n' "$name" "$rc" "$out"; fi
  elif (( rc != 0 )) && [[ "$out" == *"$want"* ]]; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    printf 'FAIL %s: expected a failure saying "%s", got exit %s:\n%s\n' "$name" "$want" "$rc" "$out"
  fi
}

many='axe must be imported in e2e/fixtures/qa.ci.ts alone'

d=$(fresh clean); expect "the tree as it is" "$d" pass

d=$(fresh second-in-e2e)
printf "import AxeBuilder from '@axe-core/playwright';\nexport const a = AxeBuilder;\n" >"$d/e2e/specs/planted.spec.ts"
expect "a second importer in e2e" "$d" "2 file(s) import it"

d=$(fresh second-in-src)
printf "import axe from 'axe-core';\nexport const a = axe;\n" >"$d/src/lib/planted.ts"
expect "axe-core itself, imported in src" "$d" "2 file(s) import it"

d=$(fresh dynamic)
printf "export const load = () => import('@axe-core/playwright');\n" >"$d/e2e/pages/planted.ts"
expect "a dynamic import()" "$d" "2 file(s) import it"

d=$(fresh bare)
printf "import '@axe-core/playwright';\n" >"$d/e2e/pages/planted.ts"
expect "a bare side-effect import" "$d" "2 file(s) import it"

d=$(fresh required)
printf "const axe = require(\"axe-core\");\nmodule.exports = axe;\n" >"$d/planted.cjs"
expect "a require() in a top-level file" "$d" "2 file(s) import it"

d=$(fresh zero)
sed -i.bak -e "s#@axe-core/playwright#@example/not-axe#g" "$d/e2e/fixtures/qa.ci.ts" && rm -f "$d/e2e/fixtures/qa.ci.ts.bak"
expect "no importer at all" "$d" "0 file(s) import it"

d=$(fresh gone)
rm "$d/e2e/fixtures/qa.ci.ts"
expect "qa.ci.ts deleted" "$d" "0 file(s) import it"

d=$(fresh moved)
mv "$d/e2e/fixtures/qa.ci.ts" "$d/e2e/fixtures/qa.ts"
expect "the one importer is another file" "$d" "$many"

d=$(fresh no-src)
rm -rf "$d/src"
expect "src/ missing" "$d" "no src/ under"

d=$(fresh blind-e2e)
find "$d/e2e" -type f -exec sed -i.bak -e "s#@playwright/test#@example/test#g" {} \; && find "$d/e2e" -name '*.bak' -delete
expect "a read of e2e/ that sees nothing" "$d" "read nothing under e2e/"

printf 'web gates selftest: %s passed, %s failed\n' "$passed" "$failed"
(( failed == 0 ))
