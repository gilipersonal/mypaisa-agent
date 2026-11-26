#!/usr/bin/env bash
# The web app's gates (MA-194), in one place: the jira-flow `web` gate, CI's Web job and a person run the same thing.
#   scripts/web_gates.sh            # every gate
#   scripts/web_gates.sh --offline  # every gate but the dependency audit, which needs the network
#   scripts/web_gates.sh --check-axe <web folder>  # only the one-axe-importer check, on that folder (its selftest uses it)
# Playwright, axe and Argos do not run here (MA-303, MA-304, MA-362); only the check that axe has one importer does. Playwright functional tests run locally, by crew:qa-web, only when Arun asks.
# axe and Argos run only in .github/workflows/qa-web.yml on GitHub, started only when Arun asks; axe never runs on the laptop.
set -euo pipefail
cd "$(dirname "$0")/../web"
pnpm() { corepack pnpm@12.16.1 "$@"; }

step() { printf '\n== %s\n' "$1"; }

# axe is imported in web/e2e/fixtures/qa.ci.ts alone, which refuses to run off GitHub Actions (MA-304, MA-362: "No AXE
# testing should be done on local"). Every form an import takes counts (from, a bare import, import(), require()), of
# @axe-core/* and of axe-core itself, in e2e/, src/ and the folder's own top-level files. It fails closed: a folder it
# cannot read, or a grep that errors, fails; and it first finds a string it knows is there in each folder, so a read that
# sees nothing fails rather than passing (lesson 49). scripts/web_gates_selftest.sh plants each fault and expects it.
axe_check() {
  local root=${1%/} rc out known f
  local imports="(^|[^[:alnum:]_$.])(from|import|require)[[:space:]]*[(]?[[:space:]]*['\"\`](@axe-core/[^'\"\`]+|axe-core(/[^'\"\`]*)?)['\"\`]"
  local -a files=()
  for f in e2e src; do
    [[ -d "$root/$f" ]] || { echo "axe check: no $f/ under $root" >&2; return 1; }
  done
  # The known strings: the suite imports Playwright's test, and the app imports its own #lib.
  for f in "e2e:from ['\"]@playwright/test['\"]" "src:from ['\"]#lib/"; do
    set +e
    known=$(grep -rlE -- "${f#*:}" "$root/${f%%:*}" | wc -l | tr -d ' ')
    set -e
    [[ "$known" -ge 1 ]] || { echo "axe check: read nothing under ${f%%:*}/ (no file matched a string known to be there)" >&2; return 1; }
  done
  while IFS= read -r f; do files+=("$f"); done < <(find "$root" -maxdepth 1 -type f \( -name '*.ts' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.mts' -o -name '*.cts' \))
  set +e
  out=$(grep -rlE -- "$imports" "$root/e2e" "$root/src" ${files[@]+"${files[@]}"})
  rc=$?
  set -e
  (( rc <= 1 )) || { echo "axe check: grep failed (exit $rc) reading $root" >&2; return 1; }
  local count
  count=$(printf '%s\n' "$out" | grep -c . || true)
  if [[ "$count" != 1 || "$out" != "$root/e2e/fixtures/qa.ci.ts" ]]; then
    echo "axe check: axe must be imported in e2e/fixtures/qa.ci.ts alone; $count file(s) import it:" >&2
    [[ -z "$out" ]] || printf '  %s\n' "${out//$root\//}" >&2
    return 1
  fi
  echo "axe check: one importer, e2e/fixtures/qa.ci.ts"
}

if [[ "${1:-}" == "--check-axe" ]]; then
  axe_check "${2:?--check-axe needs the web folder to check}"
  exit
fi

step "install: pnpm-lock.yaml as committed"
pnpm install --frozen-lockfile --silent
step "api types: src/lib/api-types.d.ts matches backend/openapi.json"
fresh=$(mktemp)
trap 'rm -f "$fresh"' EXIT
pnpm --silent exec openapi-typescript ../backend/openapi.json -o "$fresh" >/dev/null
cmp -s "$fresh" src/lib/api-types.d.ts || { echo "api-types.d.ts is stale: run pnpm --dir web api:types" >&2; exit 1; }
step "types: svelte-check (strict, warnings fail), the service worker's own project"
pnpm --silent check
pnpm --silent exec tsc --noEmit -p tsconfig.sw.json
step "lint: eslint (typescript-eslint strict and stylistic, svelte), no warnings"
pnpm --silent lint
step "format: prettier"
pnpm --silent format:check
step "tests: vitest, 90% coverage of src/lib"
pnpm --silent test:coverage
step "axe: imported in e2e/fixtures/qa.ci.ts alone, and the check's selftest (MA-304, MA-362)"
axe_check "$PWD"
../scripts/web_gates_selftest.sh
step "build: adapter-static, the service worker, the CSP"
pnpm --silent build >/dev/null
for f in index.html service-worker.js manifest.webmanifest .well-known/apple-app-site-association; do
  test -f "build/$f" || { echo "the build has no $f" >&2; exit 1; }
done
csp=$(grep -o 'http-equiv="content-security-policy" content="[^"]*"' build/index.html || true)
script_src=$(printf '%s' "$csp" | grep -o "script-src [^;\"]*" || true)
[[ -n "$script_src" ]] || { echo "the built page has no CSP script-src" >&2; exit 1; }
[[ "$script_src" == *"'sha256-"* ]] || { echo "the CSP's script-src carries no SvelteKit hash: $script_src" >&2; exit 1; }
[[ "$script_src" != *"unsafe-inline"* ]] || { echo "the CSP's script-src allows unsafe-inline: $script_src" >&2; exit 1; }
step "fonts: from the app's own origin, preloaded, never from Google (MA-340)"
font_src=$(printf '%s' "$csp" | grep -o "font-src [^;\"]*" || true)
[[ "$font_src" == "font-src 'self'" ]] || { echo "the CSP's font-src is not 'self' alone: ${font_src:-none}" >&2; exit 1; }
style_src=$(printf '%s' "$csp" | grep -o "style-src [^;\"]*" || true)
[[ -n "$style_src" && "$style_src" != *"http"* ]] || { echo "the CSP's style-src names another host: ${style_src:-none}" >&2; exit 1; }
google=$( (grep -rlE 'fonts\.(googleapis|gstatic)\.com' build || true) | wc -l | tr -d ' ')
[[ "$google" == 0 ]] || { echo "the build names Google Fonts in $google file(s)" >&2; exit 1; }
preloads=$( (grep -o 'as="font"' build/index.html || true) | wc -l | tr -d ' ')
[[ "$preloads" == 2 ]] || { echo "the built page preloads $preloads fonts, not the two" >&2; exit 1; }
for f in inter-latin-wght-normal.woff2 inter-latin-ext-wght-normal.woff2 nunito-figures-latin-800.woff2 nunito-figures-rupee-800.woff2; do
  test -s "build/fonts/$f" || { echo "the build has no fonts/$f" >&2; exit 1; }
done
step "the local stack's sign-in stub is not in the build (MA-198)"
! grep -rl 'auth/local' build >/dev/null || { echo "the build carries the local sign-in stub" >&2; exit 1; }
if [[ "${1:-}" != "--offline" ]]; then
  step "dependencies: pnpm audit, no high or critical advisory"
  pnpm audit --audit-level high
fi
printf '\nweb gates: all passed\n'
