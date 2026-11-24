#!/usr/bin/env bash
# The infra gate (MA-26, MA-25): every Terraform root is formatted and valid, offline, with no AWS credentials;
# tflint finds nothing; trivy finds no HIGH or CRITICAL misconfiguration; and tf.sh refuses what it must.
# `terraform plan` needs credentials and runs through infra/scripts/tf.sh, and in CI's Plan job, not here.
#
# tflint and trivy are release binaries pinned here and checked against their published SHA-256 before they run, as
# scripts/security_scan.sh does: a tool that cannot be fetched or does not match fails the gate (fails closed).
set -euo pipefail
cd "$(dirname "$0")/.."

command -v terraform >/dev/null || { echo "infra gate: terraform is not installed" >&2; exit 1; }

TFLINT_VERSION=0.66.0
TRIVY_VERSION=0.76.2
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/mypaisa-infra"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    TFLINT_ASSET=tflint_linux_amd64.zip
    TFLINT_SHA=22be11cadc25cd02401e94c0ccc91aa63467debb8485c2a755d98f4c0a9d1e2e
    TRIVY_ASSET="trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz"
    TRIVY_SHA=bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf ;;
  Darwin-arm64)
    TFLINT_ASSET=tflint_darwin_arm64.zip
    TFLINT_SHA=859b26af07ead7e65cee7eec9d050b2e2571dc28395b7a39191cae088cd67803
    TRIVY_ASSET="trivy_${TRIVY_VERSION}_macOS-ARM64.tar.gz"
    TRIVY_SHA=ae7ea358326960406b703c77b2ac490190797d80b306b5b50c2a27221da0a5b8 ;;
  *) echo "infra gate: no pinned tools for $(uname -s)-$(uname -m)" >&2; exit 2 ;;
esac

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

# fetch URL FILE SHA: download once into the cache, and refuse a file whose hash is not the pinned one.
fetch() {
  local url=$1 file=$2 want=$3
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/$file" ]] || [[ "$(sha256 "$CACHE/$file")" != "$want" ]]; then
    curl --fail --silent --show-error --location --retry 2 --max-time 120 "$url" --output "$CACHE/$file.part"
    [[ "$(sha256 "$CACHE/$file.part")" == "$want" ]] || { echo "infra gate: $file does not match its pinned SHA-256" >&2; exit 2; }
    mv "$CACHE/$file.part" "$CACHE/$file"
  fi
  echo "$CACHE/$file"
}

terraform fmt -check -recursive -diff infra

roots=(infra/bootstrap infra/dev infra/prod infra/dev-secrets infra/prod-secrets)
for root in "${roots[@]}"; do
  # A throwaway data dir, so the gate never touches a root's real .terraform (its backend stays as it was).
  data=$(mktemp -d)
  TF_DATA_DIR=$data terraform -chdir="$root" init -backend=false -input=false >/dev/null
  TF_DATA_DIR=$data terraform -chdir="$root" validate -no-color
  rm -rf "$data"
done

# tflint over every root and module, with the ruleset built into tflint (infra/.tflint.hcl): nothing to download.
archive=$(fetch "https://github.com/terraform-linters/tflint/releases/download/v${TFLINT_VERSION}/${TFLINT_ASSET}" "$TFLINT_ASSET" "$TFLINT_SHA")
tflint_dir="$CACHE/tflint-${TFLINT_VERSION}"
mkdir -p "$tflint_dir" && unzip -oq "$archive" tflint -d "$tflint_dir"
"$tflint_dir/tflint" --chdir=infra --recursive --config="$PWD/infra/.tflint.hcl" --format=compact

# trivy's misconfiguration checks over infra/: any HIGH or CRITICAL finding fails. An accepted finding goes in
# infra/.trivyignore with its reason, never a lower severity bar.
archive=$(fetch "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/${TRIVY_ASSET}" "$TRIVY_ASSET" "$TRIVY_SHA")
trivy_dir="$CACHE/trivy-${TRIVY_VERSION}"
mkdir -p "$trivy_dir" && tar -xzf "$archive" -C "$trivy_dir" trivy
"$trivy_dir/trivy" config --quiet --cache-dir "$CACHE/trivy-cache" --severity HIGH,CRITICAL --exit-code 1 \
  --ignorefile infra/.trivyignore infra

# The plan comment CI posts refuses an output with no summary and fits GitHub's limit (MA-25).
python3 scripts/plan_comment.py --selftest >/dev/null

# The release's checks and its smoke refuse what they must, each against canned answers (MA-107).
python3 scripts/release.py selftest
python3 scripts/smoke.py selftest

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
expect_refused "prod-secrets is applied only by CI" prod-secrets apply prod-secrets.tfplan
expect_refused "apply takes a saved plan file" dev apply
expect_refused "apply takes a saved plan file" dev apply -auto-approve
expect_refused "destroy is refused" dev destroy
expect_refused "usage:" staging plan

echo "infra gate: ${#roots[@]} roots formatted and valid; tflint and trivy clean; tf.sh refuses 6 of 6 cases"
