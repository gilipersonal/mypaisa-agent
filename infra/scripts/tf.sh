#!/usr/bin/env bash
# Run terraform against ONE MyPaisa root, so a command can never reach the wrong state (ARCHITECTURE §17.4).
#
#   infra/scripts/tf.sh dev plan -out=dev.tfplan
#   infra/scripts/tf.sh dev show dev.tfplan        # read all of it
#   infra/scripts/tf.sh dev apply dev.tfplan       # only a saved plan file is applied
#   infra/scripts/tf.sh prod plan -out=prod.tfplan
#   infra/scripts/tf.sh bootstrap plan -out=bootstrap.tfplan
#
# Each root names its own state key in its backend block, so the state and the configuration cannot disagree the
# way a shared root with -backend-config and -var-file can (the wealth tracker's tf.sh guards that case). This
# script guards the rest:
#   - after init, the state key the backend holds must be the one the root names, or it stops;
#   - apply takes only a saved plan file: "plan to a file, read all of it, then apply that file";
#   - prod is applied only by CI, from the GitHub prod environment (MA-107): a local apply of prod is refused;
#   - destroy is refused everywhere: the data stores carry prevent_destroy, and nothing here is torn down by hand.
set -euo pipefail

ROOT=${1:-}
[[ $ROOT == dev || $ROOT == prod || $ROOT == bootstrap ]] || {
  echo "usage: $0 <dev|prod|bootstrap> <terraform args...>" >&2
  exit 2
}
shift
CMD=${1:-}
[[ -n $CMD ]] || { echo "usage: $0 $ROOT <terraform args...>" >&2; exit 2; }

DIR="$(cd "$(dirname "$0")/.." && pwd)/$ROOT"
cd "$DIR"

case "$CMD" in
  destroy)
    echo "tf.sh: destroy is refused; nothing in MyPaisa's infrastructure is torn down by hand" >&2
    exit 1
    ;;
  apply)
    if [[ $ROOT == prod && ${GITHUB_ACTIONS:-} != true ]]; then
      echo "tf.sh: prod is applied only by CI, from the GitHub prod environment after Arun approves (MA-107)" >&2
      exit 1
    fi
    # The last argument must be a saved plan file, and no -auto-approve without one.
    last="${!#}"
    if [[ $# -lt 2 || $last == -* || ! -f $last ]]; then
      echo "tf.sh: apply takes a saved plan file: plan -out=<file>, read it with show, then apply <file>" >&2
      exit 1
    fi
    ;;
esac

# The laptop works through the developer role; CI brings its own credentials through OIDC.
if [[ ${GITHUB_ACTIONS:-} != true ]]; then
  export AWS_PROFILE=${AWS_PROFILE:-agent-toolkit}
fi

terraform init -input=false >/dev/null

# The backend the working directory is initialised with must be this root's own key.
want="mypaisa-agent/$ROOT/infra.tfstate"
have=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["backend"]["config"]["key"])' .terraform/terraform.tfstate)
if [[ $have != "$want" ]]; then
  echo "tf.sh: $ROOT is initialised against $have, not $want; run 'terraform init -reconfigure' in $DIR" >&2
  exit 1
fi

echo "terraform [$ROOT] $*" >&2
exec terraform "$@"
