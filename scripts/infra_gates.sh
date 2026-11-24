#!/usr/bin/env bash
# The infra gate (MA-26): every Terraform root is formatted and valid, offline, with no AWS credentials, and
# tf.sh refuses what it must. `terraform plan` needs credentials and runs through infra/scripts/tf.sh (and in CI,
# MA-25), not here.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v terraform >/dev/null || { echo "infra gate: terraform is not installed" >&2; exit 1; }

terraform fmt -check -recursive -diff infra

roots=(infra/bootstrap infra/dev infra/prod)
for root in "${roots[@]}"; do
  # A throwaway data dir, so the gate never touches a root's real .terraform (its backend stays as it was).
  data=$(mktemp -d)
  TF_DATA_DIR=$data terraform -chdir="$root" init -backend=false -input=false >/dev/null
  TF_DATA_DIR=$data terraform -chdir="$root" validate -no-color
  rm -rf "$data"
done

# tf.sh refuses, before it touches terraform or AWS: a prod apply outside CI, an apply without a plan file, destroy.
tf=infra/scripts/tf.sh
expect_refused() {
  local want=$1; shift
  local out
  if out=$(env -u GITHUB_ACTIONS "$tf" "$@" 2>&1); then
    echo "infra gate: tf.sh $* ran; it must be refused" >&2
    exit 1
  fi
  grep -q -- "$want" <<<"$out" || { echo "infra gate: tf.sh $* failed without saying '$want': $out" >&2; exit 1; }
}
expect_refused "prod is applied only by CI" prod apply prod.tfplan
expect_refused "apply takes a saved plan file" dev apply
expect_refused "apply takes a saved plan file" dev apply -auto-approve
expect_refused "destroy is refused" dev destroy
expect_refused "usage:" staging plan

echo "infra gate: ${#roots[@]} roots formatted and valid; tf.sh refuses 5 of 5 cases"
