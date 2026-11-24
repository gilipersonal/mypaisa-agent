#!/usr/bin/env python3
"""The release's checks and its Lambda steps (MA-107, ARCHITECTURE §17.4).

.github/workflows/release.yml calls each subcommand; none of them reads a parameter's value. They drive the AWS CLI
and the GitHub CLI the runner already has, so the release adds no dependency.

  release.py ci-green --sha SHA --repo OWNER/REPO       CI passed on a push of SHA to main, or refuse
  release.py should-ship --sha SHA --repo OWNER/REPO    does SHA change anything prod does not run yet?
  release.py plan-digest PLAN.json [--expect DIGEST]    a digest of a plan's changes; refuse one that differs
  release.py secrets-safe PLAN.json                     a secrets root may create a parameter or change its tags
  release.py values-ready PLAN.json --env prod          a release that ships a Lambda waits for prod's values
  release.py lambdas snapshot|publish|rollback --env E [--snapshot FILE]
  release.py selftest                                   every refusal above, against canned answers

Exit 0 passes, 1 refuses (with the reason on stderr), 2 is a usage error.
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

REGION = "us-east-1"
SSM_PATH = "/mypaisa-agent/{env}/"
ALIAS = "live"

# What a release ships. A commit that changes none of these since the last commit prod ran asks nothing of Arun.
# The iOS app joins with its TestFlight stage (MA-167).
RELEASE_PATHS = [
    "infra/**",
    "backend/**",
    "web/**",
    "scripts/release.py",
    "scripts/smoke.py",
    ".github/workflows/release.yml",
]

# A secrets root may change a parameter's tags in place; any other change to one that exists would send an empty
# value or the placeholder over the value Arun put by hand (.claude/rules/aws-changes.md).
TAG_ATTRIBUTES = {"tags", "tags_all"}

Runner = Callable[[list[str]], Any]


class Refused(Exception):
    """A check said no: the release stops here, with this reason."""


# --- The CLIs --------------------------------------------------------------------------------------------------------


def run_json(cmd: list[str]) -> Any:
    """Run a CLI that answers in JSON; any failure is a refusal (fail closed), never an empty answer."""
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120, check=False)
    if proc.returncode != 0:
        raise Refused(f"{' '.join(cmd[:3])} failed: {proc.stderr.strip()[:500]}")
    out = proc.stdout.strip()
    return json.loads(out) if out else {}


def aws_cli(args: list[str]) -> Any:
    return run_json(["aws", *args, "--region", REGION, "--output", "json"])


def gh_cli(args: list[str]) -> Any:
    return run_json(["gh", "api", *args])


# --- CI is green ------------------------------------------------------------------------------------------------------


def ci_green(sha: str, repo: str, gh: Runner = gh_cli) -> str:
    """A run of CI on a push of exactly this commit to main concluded success."""
    runs = gh([f"repos/{repo}/actions/workflows/ci.yml/runs?head_sha={sha}&event=push&branch=main&per_page=50"])
    found = [r for r in runs.get("workflow_runs", []) if r.get("head_sha") == sha]
    if not found:
        raise Refused(f"no CI run on a push of {sha[:12]} to main: the gates have not run")
    if not any(r.get("conclusion") == "success" for r in found):
        states = ", ".join(sorted({str(r.get("conclusion") or r.get("status")) for r in found}))
        raise Refused(f"CI on {sha[:12]} has not passed ({states}): nothing is deployed")
    return f"CI passed on {sha[:12]}"


# --- Should this commit ship? -----------------------------------------------------------------------------------------


def last_prod_sha(repo: str, gh: Runner = gh_cli) -> str | None:
    """The commit of the latest deployment to the prod environment whose newest status is success."""
    deployments = gh(["--paginate", "--slurp", f"repos/{repo}/deployments?environment=prod&per_page=100"])
    flat = [d for page in deployments for d in page] if deployments and isinstance(deployments[0], list) else deployments
    for dep in sorted(flat or [], key=lambda d: d.get("created_at", ""), reverse=True):
        statuses = gh([f"repos/{repo}/deployments/{dep['id']}/statuses?per_page=1"])
        if statuses and statuses[0].get("state") == "success":
            return dep.get("sha")
    return None


def changed_files(base: str, sha: str) -> list[str] | None:
    """The files that differ between two commits, or None when base is not in this history."""
    known = subprocess.run(["git", "cat-file", "-e", f"{base}^{{commit}}"], capture_output=True, check=False)
    if known.returncode != 0:
        return None
    out = subprocess.run(["git", "diff", "--name-only", base, sha], capture_output=True, text=True, check=True)
    return [line for line in out.stdout.splitlines() if line]


def matches_release_paths(path: str) -> bool:
    for pattern in RELEASE_PATHS:
        if pattern.endswith("/**"):
            if path.startswith(pattern[:-2]):
                return True
        elif fnmatch.fnmatchcase(path, pattern):
            return True
    return False


def should_ship(sha: str, base: str | None, diff: Callable[[str, str], list[str] | None] = changed_files) -> tuple[bool, str]:
    if base is None:
        return True, "prod has never been deployed: this release ships"
    if base == sha:
        return False, f"prod already runs {sha[:12]}"
    files = diff(base, sha)
    if files is None:
        return True, f"prod's commit {base[:12]} is not in this history: this release ships"
    hits = [f for f in files if matches_release_paths(f)]
    if hits:
        shown = ", ".join(hits[:8]) + (f" and {len(hits) - 8} more" if len(hits) > 8 else "")
        return True, f"{len(hits)} released file(s) changed since prod's {base[:12]}: {shown}"
    return False, f"nothing a release ships changed since prod's {base[:12]} ({len(files)} file(s), none released)"


# --- Plans ------------------------------------------------------------------------------------------------------------


def load_plan(path: str) -> dict[str, Any]:
    try:
        plan = json.loads(Path(path).read_text())
    except (OSError, ValueError) as exc:
        raise Refused(f"cannot read the plan {path}: {exc}") from exc
    if not isinstance(plan, dict) or "format_version" not in plan:
        raise Refused(f"{path} is not a plan from 'terraform show -json'")
    return plan


def plan_digest(plan: dict[str, Any]) -> str:
    """What the plan would change: every resource change but the no-ops, and the outputs. Two plans of the same
    configuration against the same state and the same account digest alike; anything that moved in between does not."""
    changes = []
    for rc in plan.get("resource_changes") or []:
        change = rc.get("change") or {}
        if change.get("actions") == ["no-op"]:
            continue
        changes.append(
            {
                "address": rc.get("address"),
                "actions": change.get("actions"),
                "before": change.get("before"),
                "after": change.get("after"),
                "after_unknown": change.get("after_unknown"),
            }
        )
    body = {
        "resource_changes": sorted(changes, key=lambda c: str(c["address"])),
        "output_changes": plan.get("output_changes") or {},
    }
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def resources(module: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not module:
        return []
    found = list(module.get("resources") or [])
    for child in module.get("child_modules") or []:
        found.extend(resources(child))
    return found


def ships_lambda(plan: dict[str, Any]) -> bool:
    """The configuration prod would run after this plan holds a Lambda function."""
    planned = (plan.get("planned_values") or {}).get("root_module")
    return any(r.get("type") == "aws_lambda_function" for r in resources(planned))


def changed_attributes(change: dict[str, Any]) -> set[str]:
    before = change.get("before") or {}
    after = change.get("after") or {}
    unknown = change.get("after_unknown") or {}
    keys = set(before) | set(after) | set(unknown)
    return {k for k in keys if before.get(k) != after.get(k) or unknown.get(k)}


def secrets_safe(plan: dict[str, Any]) -> list[str]:
    """Each change a secrets root may make: create a parameter, or change an existing one's tags. Anything else
    refuses, with every offending change named."""
    allowed, refused = [], []
    for rc in plan.get("resource_changes") or []:
        address = rc.get("address", "?")
        change = rc.get("change") or {}
        actions = change.get("actions") or []
        if actions in (["no-op"], ["read"]):
            continue
        if actions == ["create"]:
            allowed.append(f"create {address}")
        elif actions == ["update"]:
            attrs = changed_attributes(change)
            if attrs and attrs <= TAG_ATTRIBUTES:
                allowed.append(f"retag {address}")
            else:
                refused.append(f"{address} changes {', '.join(sorted(attrs)) or 'nothing it names'}")
        else:
            refused.append(f"{address} would be {' then '.join(actions)}")
    if refused:
        raise Refused(
            "a secrets root may only create a parameter or change its tags; a change to an existing parameter sends "
            "an empty value or the placeholder over the value put by hand (.claude/rules/aws-changes.md): "
            + "; ".join(refused)
        )
    return allowed


# --- Prod's values ----------------------------------------------------------------------------------------------------


def parameter_versions(env: str, aws: Runner = aws_cli) -> dict[str, int]:
    """Every parameter under the environment's path, by name, with its version. DescribeParameters returns the
    metadata only, never a value."""
    answer = aws(
        [
            "ssm",
            "describe-parameters",
            "--parameter-filters",
            f"Key=Path,Option=Recursive,Values={SSM_PATH.format(env=env)}",
        ]
    )
    return {p["Name"]: int(p.get("Version", 0)) for p in answer.get("Parameters", [])}


def values_ready(plan: dict[str, Any], env: str, aws: Runner = aws_cli) -> str:
    """A release that ships a Lambda refuses the environment while any of its parameters is still at version 1, the
    placeholder Terraform wrote (Arun, 24 Nov 2026, MA-107). One that ships none runs against the placeholders."""
    if not ships_lambda(plan):
        return "ships no Lambda: the read-only smoke runs against the placeholders"
    versions = parameter_versions(env, aws)
    if not versions:
        raise Refused(f"ships a Lambda, but no parameter exists under {SSM_PATH.format(env=env)}")
    waiting = sorted(name for name, version in versions.items() if version <= 1)
    if waiting:
        raise Refused(
            f"ships a Lambda while {len(waiting)} {env} parameter(s) still hold Terraform's placeholder (version 1); "
            f"Arun puts their values first: {', '.join(waiting)}"
        )
    return f"ships a Lambda, and all {len(versions)} {env} parameters hold a value put by hand"


# --- The Lambdas' live aliases ----------------------------------------------------------------------------------------


def functions(env: str, aws: Runner = aws_cli) -> list[str]:
    """MyPaisa's Lambda functions in one environment, found by their tags."""
    answer = aws(
        [
            "resourcegroupstaggingapi",
            "get-resources",
            "--resource-type-filters",
            "lambda:function",
            "--tag-filters",
            "Key=app,Values=mypaisa",
            f"Key=env,Values={env}",
        ]
    )
    arns = [m["ResourceARN"] for m in answer.get("ResourceTagMappingList", [])]
    names = sorted(arn.split(":function:", 1)[1].split(":", 1)[0] for arn in arns)
    wrong = [n for n in names if not n.startswith(f"mypaisa-{env}-")]
    if wrong:
        raise Refused(f"functions tagged env={env} carry another environment's name: {', '.join(wrong)}")
    return names


def snapshot(env: str, aws: Runner = aws_cli) -> dict[str, str]:
    """The version each function's live alias points to now: what a rollback goes back to."""
    taken = {}
    for name in functions(env, aws):
        try:
            alias = aws(["lambda", "get-alias", "--function-name", name, "--name", ALIAS])
        except Refused as exc:
            raise Refused(f"{name} has no '{ALIAS}' alias to deploy behind: {exc}") from exc
        taken[name] = str(alias["FunctionVersion"])
    return taken


def publish(env: str, aws: Runner = aws_cli) -> dict[str, str]:
    """Publish each function's code as a new version and move its live alias to it."""
    moved = {}
    for name in functions(env, aws):
        aws(["lambda", "wait", "function-updated-v2", "--function-name", name])
        version = str(aws(["lambda", "publish-version", "--function-name", name])["Version"])
        aws(["lambda", "update-alias", "--function-name", name, "--name", ALIAS, "--function-version", version])
        moved[name] = version
    return moved


def rollback(taken: dict[str, str], aws: Runner = aws_cli) -> dict[str, str]:
    """Every live alias back to the version the snapshot holds. A failure on one does not stop the others."""
    failed = []
    for name, version in sorted(taken.items()):
        try:
            aws(["lambda", "update-alias", "--function-name", name, "--name", ALIAS, "--function-version", version])
        except Refused as exc:
            failed.append(f"{name}: {exc}")
    if failed:
        raise Refused("rollback left some aliases where they were: " + "; ".join(failed))
    return taken


# --- The commands -----------------------------------------------------------------------------------------------------


def summary(line: str) -> None:
    """Say it in the log, and in the run's summary when there is one."""
    print(line)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line + "\n\n")


def output(name: str, value: str) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(f"{name}={value}\n")


def cmd_lambdas(args: argparse.Namespace) -> None:
    if args.action == "snapshot":
        taken = snapshot(args.env)
        Path(args.snapshot).write_text(json.dumps(taken, indent=2, sort_keys=True))
        summary(f"**{args.env}**: {len(taken)} live alias(es) recorded for a rollback" if taken else f"**{args.env}**: no Lambda yet: nothing to roll back to")
    elif args.action == "publish":
        moved = publish(args.env)
        if moved:
            summary(f"**{args.env}**: live moved to " + ", ".join(f"{n} v{v}" for n, v in moved.items()))
        else:
            summary(f"**{args.env}**: no Lambda yet: no version to publish, no alias to move")
    else:
        try:
            taken = json.loads(Path(args.snapshot).read_text())
        except (OSError, ValueError) as exc:
            raise Refused(f"cannot read the snapshot {args.snapshot}: {exc}") from exc
        rollback(taken)
        summary(
            f"**{args.env}**: rolled back: " + ", ".join(f"{n} to v{v}" for n, v in sorted(taken.items()))
            if taken
            else f"**{args.env}**: no Lambda: nothing to roll back"
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("ci-green")
    p.add_argument("--sha", required=True)
    p.add_argument("--repo", required=True)

    p = sub.add_parser("should-ship")
    p.add_argument("--sha", required=True)
    p.add_argument("--repo", required=True)

    p = sub.add_parser("plan-digest")
    p.add_argument("plan")
    p.add_argument("--expect")

    p = sub.add_parser("secrets-safe")
    p.add_argument("plan")

    p = sub.add_parser("values-ready")
    p.add_argument("plan")
    p.add_argument("--env", required=True, choices=["dev", "prod"])

    p = sub.add_parser("lambdas")
    p.add_argument("action", choices=["snapshot", "publish", "rollback"])
    p.add_argument("--env", required=True, choices=["dev", "prod"])
    p.add_argument("--snapshot", help="the snapshot file: written by snapshot, read by rollback")

    sub.add_parser("selftest")

    args = parser.parse_args(argv)
    if args.cmd == "lambdas" and args.action in ("snapshot", "rollback") and not args.snapshot:
        parser.error(f"lambdas {args.action} needs --snapshot FILE")

    try:
        if args.cmd == "ci-green":
            summary(ci_green(args.sha, args.repo))
        elif args.cmd == "should-ship":
            ship, why = should_ship(args.sha, last_prod_sha(args.repo))
            output("ship", "true" if ship else "false")
            summary(why)
        elif args.cmd == "plan-digest":
            digest = plan_digest(load_plan(args.plan))
            output("digest", digest)
            if args.expect is not None and digest != args.expect:
                raise Refused(
                    f"this plan ({digest[:12]}) is not the one Arun reviewed ({args.expect[:12]}): something changed "
                    "in prod or in its state since; run the release again and read its new plan"
                )
            summary(f"plan digest {digest[:12]}" + (" matches the plan Arun reviewed" if args.expect else ""))
        elif args.cmd == "secrets-safe":
            allowed = secrets_safe(load_plan(args.plan))
            summary(f"secrets root: {len(allowed)} change(s), each a create or a retag" + (": " + "; ".join(allowed) if allowed else ""))
        elif args.cmd == "values-ready":
            plan = load_plan(args.plan)
            output("ships_lambda", "true" if ships_lambda(plan) else "false")
            summary(values_ready(plan, args.env))
        elif args.cmd == "lambdas":
            cmd_lambdas(args)
        else:
            return selftest()
    except Refused as exc:
        print(f"release: refused: {exc}", file=sys.stderr)
        summary(f"**Refused:** {exc}")
        return 1
    return 0


# --- The selftest -----------------------------------------------------------------------------------------------------


def _plan(changes: list[tuple[str, list[str], dict, dict]], lambdas: int = 0) -> dict[str, Any]:
    return {
        "format_version": "1.2",
        "resource_changes": [
            {"address": a, "change": {"actions": acts, "before": b, "after": af, "after_unknown": {}}}
            for a, acts, b, af in changes
        ],
        "planned_values": {
            "root_module": {
                "child_modules": [
                    {"resources": [{"type": "aws_lambda_function", "name": f"f{i}"} for i in range(lambdas)]}
                ]
            }
        },
    }


class FakeAws:
    """Canned answers by the CLI's service and operation; every call is recorded."""

    def __init__(self, answers: dict[str, Any]) -> None:
        self.answers = answers
        self.calls: list[list[str]] = []

    def __call__(self, args: list[str]) -> Any:
        self.calls.append(args)
        key = " ".join(args[:2])
        if key == "lambda get-alias" or key == "lambda update-alias":
            key = f"{key} {args[args.index('--function-name') + 1]}"
        answer = self.answers.get(key, self.answers.get(" ".join(args[:2])))
        if isinstance(answer, Exception):
            raise answer
        if answer is None:
            raise Refused(f"unexpected call: {' '.join(args)}")
        return answer


def selftest() -> int:
    cases: list[tuple[str, Callable[[], Any], str | None]] = []

    def expect(name: str, fn: Callable[[], Any], refusal: str | None = None) -> None:
        cases.append((name, fn, refusal))

    # ci-green
    def gh_runs(*runs: tuple[str, str]) -> Runner:
        return lambda _args: {"workflow_runs": [{"head_sha": s, "conclusion": c, "status": "completed"} for s, c in runs]}

    expect("ci-green: a passing run on the commit", lambda: ci_green("a" * 40, "o/r", gh_runs(("a" * 40, "success"))))
    expect("ci-green: no run", lambda: ci_green("a" * 40, "o/r", gh_runs()), "no CI run")
    expect("ci-green: a failed run", lambda: ci_green("a" * 40, "o/r", gh_runs(("a" * 40, "failure"))), "has not passed")
    expect("ci-green: a run still going", lambda: ci_green("a" * 40, "o/r", lambda _a: {"workflow_runs": [{"head_sha": "a" * 40, "conclusion": None, "status": "in_progress"}]}), "has not passed")
    expect("ci-green: another commit's pass", lambda: ci_green("a" * 40, "o/r", gh_runs(("b" * 40, "success"))), "no CI run")

    # should-ship
    def ship(sha: str, base: str | None, files: list[str] | None) -> bool:
        return should_ship(sha, base, lambda _b, _s: files)[0]

    expect("should-ship: never deployed", lambda: _true(ship("s", None, [])))
    expect("should-ship: prod already runs it", lambda: _true(not ship("s", "s", ["infra/x.tf"])))
    expect("should-ship: an infra change", lambda: _true(ship("s", "b", ["docs/a.md", "infra/dev/main.tf"])))
    expect("should-ship: the workflow itself", lambda: _true(ship("s", "b", [".github/workflows/release.yml"])))
    expect("should-ship: the smoke runner", lambda: _true(ship("s", "b", ["scripts/smoke.py"])))
    expect("should-ship: docs only", lambda: _true(not ship("s", "b", ["docs/a.md", "PLAN.md", "scripts/plan_sync.py"])))
    expect("should-ship: prod's commit unknown", lambda: _true(ship("s", "b", None)))
    expect("should-ship: a lookalike path", lambda: _true(not ship("s", "b", ["infrastructure.md", "webhooks.md"])))

    # plan-digest
    base = _plan([("module.m.aws_s3_bucket.this[\"site\"]", ["create"], {}, {"bucket": "x"})])
    same = _plan([("module.m.aws_s3_bucket.this[\"site\"]", ["create"], {}, {"bucket": "x"})])
    moved = _plan([("module.m.aws_s3_bucket.this[\"site\"]", ["create"], {}, {"bucket": "y"})])
    noop = _plan(
        [
            ("module.m.aws_s3_bucket.this[\"site\"]", ["create"], {}, {"bucket": "x"}),
            ("module.m.aws_dynamodb_table.core", ["no-op"], {"a": 1}, {"a": 1}),
        ]
    )
    expect("plan-digest: the same plan twice", lambda: _true(plan_digest(base) == plan_digest(same)))
    expect("plan-digest: a value moved", lambda: _true(plan_digest(base) != plan_digest(moved)))
    expect("plan-digest: no-ops do not count", lambda: _true(plan_digest(base) == plan_digest(noop)))
    expect("plan-digest: an output changed", lambda: _true(plan_digest(base) != plan_digest({**base, "output_changes": {"x": {"after": 1}}})))

    # secrets-safe
    p = "module.secrets.aws_ssm_parameter.this[\"anthropic/api_key\"]"
    old = {"name": "/mypaisa-agent/prod/anthropic/api_key", "value_wo_version": 1, "description": "d", "tags": {}}
    expect("secrets-safe: a new parameter", lambda: secrets_safe(_plan([(p, ["create"], {}, old)])))
    expect("secrets-safe: nothing to do", lambda: secrets_safe(_plan([(p, ["no-op"], old, old)])))
    expect("secrets-safe: a new tag", lambda: secrets_safe(_plan([(p, ["update"], old, {**old, "tags": {"x": "1"}, "tags_all": {"x": "1"}})])))
    expect("secrets-safe: the placeholder bumped", lambda: secrets_safe(_plan([(p, ["update"], old, {**old, "value_wo_version": 2})])), "value_wo_version")
    expect("secrets-safe: a description changed", lambda: secrets_safe(_plan([(p, ["update"], old, {**old, "description": "e"})])), "description")
    expect("secrets-safe: a tag and the description", lambda: secrets_safe(_plan([(p, ["update"], old, {**old, "tags": {"x": "1"}, "description": "e"})])), "description")
    expect("secrets-safe: replaced", lambda: secrets_safe(_plan([(p, ["delete", "create"], old, old)])), "delete then create")
    expect("secrets-safe: created before destroyed", lambda: secrets_safe(_plan([(p, ["create", "delete"], old, old)])), "create then delete")
    expect("secrets-safe: deleted", lambda: secrets_safe(_plan([(p, ["delete"], old, None)])), "would be delete")
    expect("secrets-safe: an update that names nothing", lambda: secrets_safe(_plan([(p, ["update"], old, old)])), "nothing it names")

    # values-ready
    def params(**versions: int) -> FakeAws:
        return FakeAws({"ssm describe-parameters": {"Parameters": [{"Name": f"/mypaisa-agent/prod/{k}", "Version": v} for k, v in versions.items()]}})

    expect("values-ready: no Lambda, placeholders", lambda: values_ready(_plan([], lambdas=0), "prod", params(a=1, b=1)))
    expect("values-ready: a Lambda, every value put", lambda: values_ready(_plan([], lambdas=1), "prod", params(a=2, b=5)))
    expect("values-ready: a Lambda, one placeholder", lambda: values_ready(_plan([], lambdas=1), "prod", params(a=2, b=1)), "/mypaisa-agent/prod/b")
    expect("values-ready: a Lambda, no parameters", lambda: values_ready(_plan([], lambdas=1), "prod", params()), "no parameter exists")
    expect("values-ready: the SSM call fails", lambda: values_ready(_plan([], lambdas=1), "prod", FakeAws({"ssm describe-parameters": Refused("AccessDenied")})), "AccessDenied")
    no_values = FakeAws({"ssm describe-parameters": {"Parameters": [{"Name": "/mypaisa-agent/prod/a", "Version": 2}]}})
    values_ready(_plan([], lambdas=1), "prod", no_values)
    expect("values-ready: never asks for a value", lambda: _true(all("get-parameter" not in " ".join(c) and "--with-decryption" not in c for c in no_values.calls)))

    # lambdas
    none = FakeAws({"resourcegroupstaggingapi get-resources": {"ResourceTagMappingList": []}})
    expect("lambdas: none to snapshot", lambda: _true(snapshot("prod", none) == {}))
    expect("lambdas: none to publish", lambda: _true(publish("prod", none) == {}))
    expect("lambdas: an empty rollback", lambda: _true(rollback({}, none) == {}))

    arn = "arn:aws:lambda:us-east-1:1:function:mypaisa-prod-api"
    two = {
        "resourcegroupstaggingapi get-resources": {"ResourceTagMappingList": [{"ResourceARN": arn}, {"ResourceARN": arn.replace("api", "agent")}]},
        "lambda get-alias mypaisa-prod-api": {"FunctionVersion": "7"},
        "lambda get-alias mypaisa-prod-agent": {"FunctionVersion": "3"},
        "lambda wait": {},
        "lambda publish-version": {"Version": "8"},
        "lambda update-alias mypaisa-prod-api": {},
        "lambda update-alias mypaisa-prod-agent": {},
    }
    expect("lambdas: snapshot reads every live alias", lambda: _true(snapshot("prod", FakeAws(two)) == {"mypaisa-prod-agent": "3", "mypaisa-prod-api": "7"}))
    published = FakeAws(two)
    publish("prod", published)
    expect("lambdas: publish moves live to the new version", lambda: _true([c for c in published.calls if c[1] == "update-alias"] == [
        ["lambda", "update-alias", "--function-name", "mypaisa-prod-agent", "--name", "live", "--function-version", "8"],
        ["lambda", "update-alias", "--function-name", "mypaisa-prod-api", "--name", "live", "--function-version", "8"],
    ]))
    expect("lambdas: publish waits for the code before it publishes", lambda: _true(
        [c[1] for c in published.calls if c[0] == "lambda"][:3] == ["wait", "publish-version", "update-alias"]))
    rolled = FakeAws(two)
    rollback({"mypaisa-prod-api": "7", "mypaisa-prod-agent": "3"}, rolled)
    expect("lambdas: rollback restores every alias", lambda: _true(sorted(c[3] + "@" + c[7] for c in rolled.calls) == ["mypaisa-prod-agent@3", "mypaisa-prod-api@7"]))
    expect("lambdas: rollback goes on past a failure, then says so", lambda: rollback(
        {"mypaisa-prod-api": "7", "mypaisa-prod-agent": "3"},
        FakeAws({**two, "lambda update-alias mypaisa-prod-agent": Refused("throttled")})), "mypaisa-prod-agent")
    expect("lambdas: a function with no live alias", lambda: snapshot("prod", FakeAws({**two, "lambda get-alias mypaisa-prod-api": Refused("ResourceNotFound")})), "no 'live' alias")
    expect("lambdas: a dev function tagged prod", lambda: functions("prod", FakeAws({"resourcegroupstaggingapi get-resources": {"ResourceTagMappingList": [{"ResourceARN": arn.replace("prod", "dev")}]}})), "another environment's name")

    # The plan file itself.
    expect("load-plan: not a plan", lambda: _load_text('{"a": 1}'), "is not a plan")
    expect("load-plan: not JSON", lambda: _load_text("terraform [prod] show"), "cannot read the plan")

    failed = 0
    for name, fn, refusal in cases:
        try:
            fn()
            ok = refusal is None
            got = "passed"
        except Refused as exc:
            ok = refusal is not None and refusal in str(exc)
            got = f"refused: {exc}"
        except AssertionError:
            ok, got = False, "the expectation did not hold"
        if not ok:
            failed += 1
            want = f"a refusal naming '{refusal}'" if refusal else "a pass"
            print(f"FAIL {name}: wanted {want}, got {got}", file=sys.stderr)
    refusals = sum(1 for _, _, r in cases if r)
    if failed:
        print(f"release selftest: {failed} of {len(cases)} cases failed", file=sys.stderr)
        return 1
    print(f"release selftest: {len(cases)} cases, {refusals} of them refusals, all as expected")
    return 0


def _true(value: bool) -> bool:
    if not value:
        raise AssertionError
    return value


def _load_text(text: str) -> dict[str, Any]:
    import tempfile

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        fh.write(text)
    try:
        return load_plan(fh.name)
    finally:
        os.unlink(fh.name)


if __name__ == "__main__":
    sys.exit(main())
