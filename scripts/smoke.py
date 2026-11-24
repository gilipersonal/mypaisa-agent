#!/usr/bin/env python3
"""The release's smoke test: read-only checks of what an environment's stack says it holds (MA-107, MA-268).

  smoke.py --env dev|prod --stack-outputs STACK.json --secrets-outputs SECRETS.json [--force-fail]
  smoke.py selftest

STACK.json and SECRETS.json are `terraform output -json` of infra/<env> and infra/<env>-secrets. Every check reads
AWS through describe, get and list calls only: the runner refuses any other call, so the smoke cannot write to prod
(.claude/rules/aws-changes.md). It never reads a parameter's value: DescribeParameters returns names and versions.

Phase 0 checks the stack the first release applies: the table, the buckets and the parameters. The api's health,
its 401 perimeter, the stream, a chat turn and the X-Ray trace join as their phases bring them (MA-268, MA-232),
each from an output the stack then holds. `--force-fail` adds a check that fails, for the test runs that prove a
failed smoke stops the release (in dev) or rolls the aliases back (in prod).

Exit 0 when every check passes, 1 when any fails or cannot run (fail closed), 2 on a usage error.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REGION = "us-east-1"
READ_VERBS = ("describe-", "get-", "list-")
Runner = Callable[[list[str]], Any]


class SmokeError(Exception):
    """A check could not run: a failure, never a skip."""


def aws_cli(args: list[str]) -> Any:
    """The AWS CLI, read-only: a call whose operation is not describe, get or list is refused before it runs."""
    if len(args) < 2 or not args[1].startswith(READ_VERBS):
        raise SmokeError(f"the smoke is read-only and will not run 'aws {' '.join(args[:2])}'")
    proc = subprocess.run(
        ["aws", *args, "--region", REGION, "--output", "json"],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if proc.returncode != 0:
        raise SmokeError(f"aws {' '.join(args[:2])}: {proc.stderr.strip()[:300]}")
    return json.loads(proc.stdout) if proc.stdout.strip() else {}


def read_only(runner: Runner) -> Runner:
    """Wrap any runner in the same read-only rule, so the selftest proves the rule and not only the CLI wrapper."""

    def guarded(args: list[str]) -> Any:
        if len(args) < 2 or not args[1].startswith(READ_VERBS):
            raise SmokeError(f"the smoke is read-only and will not run 'aws {' '.join(args[:2])}'")
        return runner(args)

    return guarded


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def outputs(path: str) -> dict[str, Any]:
    try:
        raw = json.loads(Path(path).read_text())
    except (OSError, ValueError) as exc:
        raise SmokeError(f"cannot read the outputs {path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise SmokeError(f"{path} is not 'terraform output -json'")
    return {k: v.get("value") if isinstance(v, dict) else v for k, v in raw.items()}


def check_table(name: str, protected: bool, aws: Runner) -> list[Check]:
    table = aws(["dynamodb", "describe-table", "--table-name", name]).get("Table", {})
    status = table.get("TableStatus")
    found = [Check(f"table {name}", status == "ACTIVE", f"status {status}")]
    guard = bool(table.get("DeletionProtectionEnabled"))
    found.append(Check(f"table {name} deletion protection", guard == protected, f"{'on' if guard else 'off'}, {'on' if protected else 'off'} expected"))
    backups = aws(["dynamodb", "describe-continuous-backups", "--table-name", name])
    pitr = backups.get("ContinuousBackupsDescription", {}).get("PointInTimeRecoveryDescription", {}).get("PointInTimeRecoveryStatus")
    want = "ENABLED" if protected else "DISABLED"
    found.append(Check(f"table {name} point-in-time recovery", pitr == want, f"{pitr}, {want} expected"))
    return found


def check_bucket(name: str, protected: bool, aws: Runner) -> list[Check]:
    found = []
    block = aws(["s3api", "get-public-access-block", "--bucket", name]).get("PublicAccessBlockConfiguration", {})
    flags = ("BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets")
    open_flags = [f for f in flags if block.get(f) is not True]
    found.append(Check(f"bucket {name} public access blocked", not open_flags, "all four on" if not open_flags else "off: " + ", ".join(open_flags)))

    owner = aws(["s3api", "get-bucket-ownership-controls", "--bucket", name])
    rules = owner.get("OwnershipControls", {}).get("Rules", [])
    enforced = any(r.get("ObjectOwnership") == "BucketOwnerEnforced" for r in rules)
    found.append(Check(f"bucket {name} owner enforced", enforced, "BucketOwnerEnforced" if enforced else f"rules {rules}"))

    enc = aws(["s3api", "get-bucket-encryption", "--bucket", name])
    algos = [
        r.get("ApplyServerSideEncryptionByDefault", {}).get("SSEAlgorithm")
        for r in enc.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
    ]
    found.append(Check(f"bucket {name} encrypted", "AES256" in algos or "aws:kms" in algos, ", ".join(map(str, algos)) or "no rule"))

    versioning = aws(["s3api", "get-bucket-versioning", "--bucket", name]).get("Status")
    if protected:
        found.append(Check(f"bucket {name} versioned", versioning == "Enabled", f"{versioning}, Enabled expected"))

    policy_text = aws(["s3api", "get-bucket-policy", "--bucket", name]).get("Policy", "")
    try:
        statements = json.loads(policy_text).get("Statement", []) if policy_text else []
    except ValueError:
        statements = []
    tls = any(
        s.get("Effect") == "Deny" and "aws:SecureTransport" in json.dumps(s.get("Condition", {})) for s in statements
    )
    found.append(Check(f"bucket {name} TLS only", tls, "denies plain HTTP" if tls else "no TLS-only deny"))
    return found


def check_parameters(names: list[str], aws: Runner) -> list[Check]:
    """Each parameter the secrets root made exists. Names and versions only; a value is never asked for."""
    found = {}
    for i in range(0, len(names), 10):
        chunk = names[i : i + 10]
        answer = aws(["ssm", "describe-parameters", "--parameter-filters", "Key=Name,Option=Equals,Values=" + ",".join(chunk)])
        for p in answer.get("Parameters", []):
            found[p["Name"]] = int(p.get("Version", 0))
    missing = [n for n in names if n not in found]
    placeholders = sorted(n for n, v in found.items() if v <= 1)
    checks = [Check("parameters exist", not missing, f"{len(found)} of {len(names)}" + (": missing " + ", ".join(missing) if missing else ""))]
    checks.append(
        Check(
            "parameters holding a value",
            True,
            f"{len(found) - len(placeholders)} put by hand, {len(placeholders)} still Terraform's placeholder (version 1)",
        )
    )
    return checks


def smoke(env: str, stack: dict[str, Any], secrets: dict[str, Any], aws: Runner, force_fail: bool = False) -> list[Check]:
    aws = read_only(aws)
    protected = env == "prod"
    checks: list[Check] = []

    def run(name: str, fn: Callable[[], list[Check]]) -> None:
        try:
            checks.extend(fn())
        except SmokeError as exc:
            checks.append(Check(name, False, f"could not run: {exc}"))

    table = stack.get("table_name")
    buckets = stack.get("bucket_names") or {}
    params = secrets.get("parameter_names") or []
    if not table:
        checks.append(Check("table", False, "the stack's outputs name no table"))
    else:
        run(f"table {table}", lambda: check_table(table, protected, aws))
    if not buckets:
        checks.append(Check("buckets", False, "the stack's outputs name no bucket"))
    for part, name in sorted(buckets.items()):
        run(f"bucket {name}", lambda name=name: check_bucket(name, protected, aws))
    if not params:
        checks.append(Check("parameters", False, "the secrets root's outputs name no parameter"))
    else:
        run("parameters", lambda: check_parameters(list(params), aws))

    wrong_env = [n for n in [table, *buckets.values()] if n and not str(n).startswith(f"mypaisa-{env}-")]
    wrong_env += [n for n in params if not str(n).startswith(f"/mypaisa-agent/{env}/")]
    if wrong_env:
        checks.append(Check("every name is this environment's", False, ", ".join(map(str, wrong_env))))

    if force_fail:
        checks.append(Check("forced failure (a test run)", False, "--force-fail was given"))
    return checks


def report(env: str, checks: list[Check]) -> str:
    failed = [c for c in checks if not c.ok]
    head = f"### Smoke, {env}: " + (f"{len(failed)} of {len(checks)} failed" if failed else f"all {len(checks)} passed")
    rows = "\n".join(f"| {'✅' if c.ok else '❌'} | {c.name} | {c.detail} |" for c in checks)
    return f"{head}\n\n| | Check | Result |\n| --- | --- | --- |\n{rows}\n"


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if argv[:1] == ["selftest"]:
        return selftest()
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--env", required=True, choices=["dev", "prod"])
    parser.add_argument("--stack-outputs", required=True)
    parser.add_argument("--secrets-outputs", required=True)
    parser.add_argument("--force-fail", action="store_true")
    args = parser.parse_args(argv)

    try:
        stack, secrets = outputs(args.stack_outputs), outputs(args.secrets_outputs)
    except SmokeError as exc:
        print(f"smoke: {exc}", file=sys.stderr)
        return 1
    checks = smoke(args.env, stack, secrets, aws_cli, args.force_fail)
    text = report(args.env, checks)
    print(text)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(text + "\n")
    return 0 if checks and all(c.ok for c in checks) else 1


# --- The selftest -----------------------------------------------------------------------------------------------------


def _good(env: str) -> dict[str, Any]:
    protected = env == "prod"
    policy = json.dumps({"Statement": [{"Effect": "Deny", "Condition": {"Bool": {"aws:SecureTransport": "false"}}}]})
    return {
        "dynamodb describe-table": {"Table": {"TableStatus": "ACTIVE", "DeletionProtectionEnabled": protected}},
        "dynamodb describe-continuous-backups": {
            "ContinuousBackupsDescription": {
                "PointInTimeRecoveryDescription": {"PointInTimeRecoveryStatus": "ENABLED" if protected else "DISABLED"}
            }
        },
        "s3api get-public-access-block": {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            }
        },
        "s3api get-bucket-ownership-controls": {"OwnershipControls": {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}},
        "s3api get-bucket-encryption": {
            "ServerSideEncryptionConfiguration": {"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}
        },
        "s3api get-bucket-versioning": {"Status": "Enabled"} if protected else {},
        "s3api get-bucket-policy": {"Policy": policy},
        "ssm describe-parameters": {
            "Parameters": [
                {"Name": f"/mypaisa-agent/{env}/anthropic/api_key", "Version": 1},
                {"Name": f"/mypaisa-agent/{env}/apple/team_id", "Version": 2},
            ]
        },
    }


def _fake(answers: dict[str, Any], calls: list[list[str]] | None = None) -> Runner:
    def run(args: list[str]) -> Any:
        if calls is not None:
            calls.append(args)
        answer = answers.get(" ".join(args[:2]))
        if isinstance(answer, Exception):
            raise answer
        if answer is None:
            raise SmokeError(f"no answer for {' '.join(args[:2])}")
        return answer

    return run


def _outs(env: str) -> tuple[dict[str, Any], dict[str, Any]]:
    stack = {"table_name": f"mypaisa-{env}-core", "bucket_names": {"site": f"mypaisa-{env}-site", "documents": f"mypaisa-{env}-documents"}}
    secrets = {"parameter_names": [f"/mypaisa-agent/{env}/anthropic/api_key", f"/mypaisa-agent/{env}/apple/team_id"]}
    return stack, secrets


def selftest() -> int:
    results: list[tuple[str, bool]] = []

    def passes(name: str, env: str, answers: dict[str, Any], stack=None, secrets=None, force=False) -> None:
        s, p = _outs(env)
        checks = smoke(env, s if stack is None else stack, p if secrets is None else secrets, _fake(answers), force)
        results.append((name, bool(checks) and all(c.ok for c in checks)))

    def fails(name: str, env: str, answers: dict[str, Any], needle: str, stack=None, secrets=None, force=False) -> None:
        s, p = _outs(env)
        checks = smoke(env, s if stack is None else stack, p if secrets is None else secrets, _fake(answers), force)
        bad = [c for c in checks if not c.ok]
        results.append((name, any(needle in f"{c.name} {c.detail}" for c in bad)))

    def mutate(env: str, key: str, value: Any) -> dict[str, Any]:
        answers = _good(env)
        answers[key] = value
        return answers

    passes("prod: a healthy empty stack", "prod", _good("prod"))
    passes("dev: a healthy empty stack", "dev", _good("dev"))
    fails("prod: the table still creating", "prod", mutate("prod", "dynamodb describe-table", {"Table": {"TableStatus": "CREATING", "DeletionProtectionEnabled": True}}), "status CREATING")
    fails("prod: no deletion protection", "prod", mutate("prod", "dynamodb describe-table", {"Table": {"TableStatus": "ACTIVE", "DeletionProtectionEnabled": False}}), "deletion protection")
    fails("prod: no point-in-time recovery", "prod", mutate("prod", "dynamodb describe-continuous-backups", {"ContinuousBackupsDescription": {"PointInTimeRecoveryDescription": {"PointInTimeRecoveryStatus": "DISABLED"}}}), "point-in-time")
    fails("prod: one public-access flag off", "prod", mutate("prod", "s3api get-public-access-block", {"PublicAccessBlockConfiguration": {"BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": False, "RestrictPublicBuckets": True}}), "BlockPublicPolicy")
    fails("prod: objects owned by writers", "prod", mutate("prod", "s3api get-bucket-ownership-controls", {"OwnershipControls": {"Rules": [{"ObjectOwnership": "ObjectWriter"}]}}), "owner enforced")
    fails("prod: no encryption rule", "prod", mutate("prod", "s3api get-bucket-encryption", {}), "encrypted")
    fails("prod: versioning suspended", "prod", mutate("prod", "s3api get-bucket-versioning", {"Status": "Suspended"}), "versioned")
    fails("prod: no TLS-only deny", "prod", mutate("prod", "s3api get-bucket-policy", {"Policy": json.dumps({"Statement": [{"Effect": "Allow"}]})}), "TLS only")
    fails("prod: a parameter missing", "prod", mutate("prod", "ssm describe-parameters", {"Parameters": [{"Name": "/mypaisa-agent/prod/anthropic/api_key", "Version": 1}]}), "apple/team_id")
    fails("prod: a call that errors fails, never skips", "prod", mutate("prod", "s3api get-bucket-encryption", SmokeError("AccessDenied")), "could not run")
    fails("prod: no table in the outputs", "prod", _good("prod"), "name no table", stack={"bucket_names": {"site": "mypaisa-prod-site"}})
    fails("prod: no bucket in the outputs", "prod", _good("prod"), "name no bucket", stack={"table_name": "mypaisa-prod-core"})
    fails("prod: no parameter in the outputs", "prod", _good("prod"), "name no parameter", secrets={})
    fails("prod: dev's outputs given to prod", "prod", _good("prod"), "this environment's", stack=_outs("dev")[0])
    fails("dev: the forced failure", "dev", _good("dev"), "forced failure", force=True)
    fails("prod: the forced failure", "prod", _good("prod"), "forced failure", force=True)

    # The placeholders are reported, never a failure, in phase 0 (a Lambda's release refuses them before this runs).
    s, p = _outs("prod")
    held = [c for c in smoke("prod", s, p, _fake(_good("prod"))) if c.name == "parameters holding a value"]
    results.append(("prod: placeholders reported, not failed", bool(held) and held[0].ok and "1 still" in held[0].detail))

    # Read-only: every call the smoke made is a describe, get or list, and no call asks for a value.
    calls: list[list[str]] = []
    smoke("prod", s, p, _fake(_good("prod"), calls))
    results.append(("every call reads", bool(calls) and all(c[1].startswith(READ_VERBS) for c in calls)))
    results.append(("no call asks for a value", all("get-parameter" not in c[1] and "--with-decryption" not in c for c in calls)))

    # The rule refuses a write before it reaches the CLI, through the wrapper and through the CLI's own guard.
    def wrote() -> Any:
        raise AssertionError("the write reached the runner")

    for name, guard in (("the wrapper", read_only(lambda _a: wrote())), ("the CLI", aws_cli)):
        try:
            guard(["s3api", "put-bucket-policy", "--bucket", "mypaisa-prod-site"])
            results.append((f"{name} refuses a write", False))
        except SmokeError as exc:
            results.append((f"{name} refuses a write", "read-only" in str(exc)))
        except AssertionError:
            results.append((f"{name} refuses a write", False))

    failed = [name for name, ok in results if not ok]
    for name in failed:
        print(f"FAIL {name}", file=sys.stderr)
    if failed:
        print(f"smoke selftest: {len(failed)} of {len(results)} cases failed", file=sys.stderr)
        return 1
    print(f"smoke selftest: {len(results)} cases, all as expected")
    return 0


if __name__ == "__main__":
    sys.exit(main())
