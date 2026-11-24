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
