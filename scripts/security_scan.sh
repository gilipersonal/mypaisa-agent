#!/usr/bin/env bash
# The repo's security scans (MA-326), one script for a laptop, CI's Security job and the weekly sweep.
#
#   scripts/security_scan.sh            # every scan
#   scripts/security_scan.sh secrets    # one of: secrets sast deps workflows
#   scripts/security_scan.sh staged     # gitleaks on what is staged (the pre-commit hook)
#
# The repo is public: GitHub's CodeQL default setup and secret scanning with push protection run beside this script, as
# repository settings, not here (MA-346); these tools cover what they do not. Every tool is pinned. gitleaks and osv-scanner are release binaries checked against
# their published SHA-256 before they run; semgrep and zizmor come from PyPI at a fixed version through uvx. A tool that
# cannot be fetched or does not match its checksum fails the scan: nothing is skipped (fails closed).
# The backend's own Bandit rules (ruff S) and pip-audit --strict run in scripts/backend_gates.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

GITLEAKS_VERSION=8.30.1
OSV_VERSION=2.7.0
SEMGREP_VERSION=1.183.0
ZIZMOR_VERSION=1.32.0
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/mypaisa-security"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    GITLEAKS_ASSET="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
    GITLEAKS_SHA=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
    OSV_ASSET=osv-scanner_linux_amd64
    OSV_SHA=160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b ;;
  Darwin-arm64)
    GITLEAKS_ASSET="gitleaks_${GITLEAKS_VERSION}_darwin_arm64.tar.gz"
    GITLEAKS_SHA=b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5
    OSV_ASSET=osv-scanner_darwin_arm64
    OSV_SHA=d4926ef8da134332543be276dff157e4c170f99ad91fc48e89448a8816bdf70b ;;
  *) echo "security_scan: no pinned tools for $(uname -s)-$(uname -m)" >&2; exit 2 ;;
esac

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

# fetch URL FILE SHA: download once into the cache, and refuse a file whose hash is not the pinned one.
fetch() {
  local url=$1 file=$2 want=$3
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/$file" ]] || [[ "$(sha256 "$CACHE/$file")" != "$want" ]]; then
    curl --fail --silent --show-error --location --retry 2 --max-time 120 "$url" --output "$CACHE/$file.part"
    [[ "$(sha256 "$CACHE/$file.part")" == "$want" ]] || { echo "security_scan: $file does not match its pinned SHA-256" >&2; exit 2; }
    mv "$CACHE/$file.part" "$CACHE/$file"
  fi
  echo "$CACHE/$file"
}

step() { printf '\n== %s\n' "$1"; }

scan_secrets() {
  step "secrets: gitleaks ${GITLEAKS_VERSION}, every commit in the history (pre-commit checks what is staged)"
  local archive dir="$CACHE/gitleaks-${GITLEAKS_VERSION}"
  archive=$(fetch "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ASSET}" "$GITLEAKS_ASSET" "$GITLEAKS_SHA")
  mkdir -p "$dir" && tar -xzf "$archive" -C "$dir" gitleaks
  "$dir/gitleaks" git --no-banner --redact --exit-code 1 .
}

scan_staged() {
  local archive dir="$CACHE/gitleaks-${GITLEAKS_VERSION}"
  archive=$(fetch "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ASSET}" "$GITLEAKS_ASSET" "$GITLEAKS_SHA")
  mkdir -p "$dir" && tar -xzf "$archive" -C "$dir" gitleaks
  "$dir/gitleaks" git --pre-commit --staged --no-banner --redact --exit-code 1 .
  exit 0
}

scan_sast() {
  step "sast: semgrep ${SEMGREP_VERSION} (python, fastapi, typescript, javascript, secrets, github-actions) over backend/, web/, scripts/ and .github/"
  uvx "semgrep==${SEMGREP_VERSION}" scan --metrics=off --error --quiet \
    --config p/python --config p/fastapi --config p/typescript --config p/javascript \
    --config p/secrets --config p/github-actions \
    --exclude web/node_modules --exclude web/build --exclude web/.svelte-kit \
    backend web scripts .github
  echo "semgrep: no findings (semgrep does not parse .svelte; eslint's no-eval rules cover those files in the web gate)"
}

scan_deps() {
  step "dependencies: osv-scanner ${OSV_VERSION} over every lockfile"
  local osv
  osv=$(fetch "https://github.com/google/osv-scanner/releases/download/v${OSV_VERSION}/${OSV_ASSET}" "${OSV_ASSET}-${OSV_VERSION}" "$OSV_SHA")
  chmod +x "$osv"
  local args=()
  while IFS= read -r f; do args+=(--lockfile "$f"); done < <(git ls-files '*uv.lock' '*package-lock.json' '*pnpm-lock.yaml' '*Package.resolved')
  [[ ${#args[@]} -gt 0 ]] || { echo "security_scan: no lockfile found" >&2; exit 2; }
  "$osv" scan source "${args[@]}"
}

scan_workflows() {
  step "workflows: zizmor ${ZIZMOR_VERSION} over .github/workflows/"
  uvx "zizmor==${ZIZMOR_VERSION}" --min-severity low .github/workflows/
}

which="${1:-all}"
case "$which" in
  all) scan_secrets; scan_sast; scan_deps; scan_workflows ;;
  secrets) scan_secrets ;; sast) scan_sast ;; deps) scan_deps ;; workflows) scan_workflows ;; staged) scan_staged ;;
  *) echo "usage: $0 [all|secrets|sast|deps|workflows|staged]" >&2; exit 2 ;;
esac
printf '\nsecurity scans: all passed\n'
