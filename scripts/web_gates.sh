#!/usr/bin/env bash
# The web app's gates (MA-194), in one place: the jira-flow `web` gate, CI's Web job and a person run the same thing.
#   scripts/web_gates.sh            # every gate
#   scripts/web_gates.sh --offline  # every gate but the dependency audit, which needs the network
# Playwright, axe and Argos are not here: they run only when Arun asks (MA-303, MA-304).
set -euo pipefail
cd "$(dirname "$0")/../web"
pnpm() { corepack pnpm@12.16.1 "$@"; }

step() { printf '\n== %s\n' "$1"; }

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
step "build: adapter-static, the service worker, the CSP"
pnpm --silent build >/dev/null
test -f build/index.html && test -f build/service-worker.js && test -f build/.well-known/apple-app-site-association
grep -q 'http-equiv="content-security-policy"' build/index.html || { echo "the built page has no CSP" >&2; exit 1; }
if [[ "${1:-}" != "--offline" ]]; then
  step "dependencies: pnpm audit, no high or critical advisory"
  pnpm audit --audit-level high
fi
printf '\nweb gates: all passed\n'
