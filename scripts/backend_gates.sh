#!/usr/bin/env bash
# The backend's gates (MA-24), in one place, run inside backend/: the jira-flow gate, CI's Backend job and a person run the same thing.
#   scripts/backend_gates.sh            # every gate
#   scripts/backend_gates.sh --offline  # every gate but the dependency audit, which needs the network
set -euo pipefail
cd "$(dirname "$0")/../backend"

step() { printf '\n== %s\n' "$1"; }

step "lock: uv.lock matches pyproject.toml"
uv lock --check
step "lint: ruff, the local stack included"
uv run ruff check . ../scripts/local
step "format: ruff format (Black-compatible)"
uv run ruff format --check . ../scripts/local
step "types: pyright strict"
uv run pyright
step "layers: api -> services -> repositories -> domain"
uv run lint-imports
step "tests: pytest, branch coverage at least 90%"
uv run pytest --cov --cov-fail-under=90
if [[ "${1:-}" != "--offline" ]]; then
  step "dependencies: pip-audit --strict on every pinned package in uv.lock, by hash"
  req=$(mktemp)
  trap 'rm -f "$req"' EXIT
  uv export --frozen --no-emit-project --format requirements-txt --output-file "$req" --quiet
  uv run pip-audit --strict --disable-pip --require-hashes --progress-spinner off -r "$req"
fi
printf '\nbackend gates: all passed\n'
