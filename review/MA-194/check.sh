#!/usr/bin/env bash
# The fixed-stays-fixed checks for MA-194's review (review/MA-194/fixed.json). Each one proves what its fix does: a
# gate check breaks a copy of the web app and expects the refusal (lessons 3, 12, 16); a code check runs the tests that
# hold the behaviour. Run one: review/MA-194/check.sh <name>.
set -euo pipefail
cd "$(dirname "$0")/../.."
pnpm() { corepack pnpm@12.16.1 "$@"; }

# locked CMD...: runs CMD holding this checkout's lock on web/ (MA-345). review_regress.py --jobs runs checks at once;
# pnpm 12 installs before an exec when node_modules is missing, and vitest writes Vite's optimizer cache under
# node_modules/.vite, so two checks working in web/ at once raced on both (Review tooling on PR #113). Every command that
# runs in web/ itself, or copies it, takes the lock. An flock goes when its holder dies, so a check its runner kills on a
# timeout never leaves it held.
lock="$(git rev-parse --absolute-git-dir)/mypaisa-web-check.lock"
locked() {
  python3 -I -c 'import fcntl, subprocess, sys
with open(sys.argv[1], "w") as f:
    fcntl.flock(f, fcntl.LOCK_EX)
    sys.exit(subprocess.call(sys.argv[2:]))' "$lock" "$@"
}

# copy: a throwaway copy of the web app (node_modules cloned, not reinstalled) with the gate script and the schema.
copy() {
  local dir; dir=$(mktemp -d)
  mkdir -p "$dir/scripts" "$dir/backend"
  cp scripts/web_gates.sh "$dir/scripts/"
  cp backend/openapi.json "$dir/backend/"
  mkdir -p "$dir/docs/design/ds-v1" && cp docs/design/ds-v1/tokens.css docs/design/ds-v1/motion.css "$dir/docs/design/ds-v1/"
  locked cp -c -R web "$dir/web" 2>/dev/null || locked cp -R web "$dir/web"
  rm -rf "$dir/web/build" "$dir/web/.svelte-kit"
  echo "$dir"
}

# refuses DIR WORDS: the gate must fail in DIR and say WORDS.
refuses() {
  local out
  if out=$(bash "$1/scripts/web_gates.sh" --offline 2>&1); then echo "the web gate passed: $2" >&2; return 1; fi
  grep -qE -- "$2" <<<"$out" || { echo "the web gate failed, but not with: $2" >&2; tail -5 <<<"$out" >&2; return 1; }
}

case "${1:-}" in
  csp-unsafe-inline)  # R1-a1: script-src that allows unsafe-inline fails the gate
    d=$(copy); trap 'rm -rf "$d"' EXIT
    sed -i.bak "s/'script-src': \['self'\]/'script-src': ['self', 'unsafe-inline']/" "$d/web/vite.config.ts"
    grep -q "unsafe-inline']" "$d/web/vite.config.ts"
    refuses "$d" "allows unsafe-inline|carries no SvelteKit hash" ;;
  clean-copy)  # the harness makes no failure of its own (lesson 16): an untouched copy passes the gate
    d=$(copy); trap 'rm -rf "$d"' EXIT
    bash "$d/scripts/web_gates.sh" --offline >/dev/null ;;
  csp-no-manifest)  # R1-a1: a build with no manifest fails the gate
    d=$(copy); trap 'rm -rf "$d"' EXIT
    rm "$d/web/static/manifest.webmanifest"
    refuses "$d" "no manifest.webmanifest" ;;
  dependabot-web)  # R1-a2 / R1-b1: a Dependabot PR on web/'s lockfiles passes pr-files as MA-326's
    python3 - <<'P'
import json, sys
sys.path.insert(0, "scripts")
import plan_sync as ps
t = json.load(open("docs/trace.json"))
items = t["items"] + t.get("others", [])
files = ["web/package.json", "web/pnpm-lock.yaml", "web/pnpm-workspace.yaml", "backend/uv.lock", "backend/pyproject.toml"]
assert ps.pr_findings(files, items, "MA-326") == ([], []), ps.pr_findings(files, items, "MA-326")
P
    ;;
  service-worker)  # R1-f1, R1-f2, R1-f3: the page is stored, the fallback is for navigations only
    (cd web && locked corepack pnpm@12.16.1 --silent exec vitest run src/lib/sw/shell.test.ts)
    grep -q "shellFiles(" web/src/service-worker.ts && grep -q "kind === 'page'" web/src/service-worker.ts ;;
  dark-variant)  # R1-f4: Tailwind's dark: follows the system unless .t-light forces light
    d=$(copy); trap 'rm -rf "$d"' EXIT
    (cd "$d/web" && pnpm --silent build >/dev/null)
    css=$(cat "$d"/web/build/_app/immutable/assets/*.css)
    grep -q "prefers-color-scheme:dark" <<<"$css" && grep -q ":not(.t-light)" <<<"$css" ;;
  money-compact)  # R1-f7: compact amounts move up a unit when rounding reaches it
    (cd web && locked corepack pnpm@12.16.1 --silent exec vitest run src/lib/formatting/money.test.ts -t "moves up a unit") ;;
  targets)  # R1-f5, R1-f6: the skip link and the shell's button keep 44 px targets
    grep -q "focus:min-h-11" web/src/lib/components/shell/AppShell.svelte
    grep -q 'class="min-h-11"' web/src/lib/components/shell/ApiStatus.svelte ;;
  *) echo "usage: $0 clean-copy|csp-unsafe-inline|csp-no-manifest|dependabot-web|service-worker|dark-variant|money-compact|targets" >&2; exit 2 ;;
esac
echo "ok: $1"
