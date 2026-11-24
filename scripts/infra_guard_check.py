#!/usr/bin/env python3
"""Prove the prod guard does what ARCHITECTURE §17.1 says, and that ci-plan reads no content (§17.4), by asking IAM's
policy simulator (MA-26, MA-25).

    infra/scripts/tf.sh bootstrap plan -out=bootstrap.tfplan
    (cd infra/bootstrap && terraform show -json bootstrap.tfplan) > /tmp/bootstrap.json
    python3 scripts/infra_guard_check.py /tmp/bootstrap.json

It takes the guard policies exactly as the plan would write them, pairs each with an allow-everything policy (the
roles carry AdministratorAccess), and simulates each case below with the context IAM would see. It needs AWS
credentials for iam:SimulateCustomPolicy, which reads nothing in the account. Every case must come out as listed,
or it exits 1: a guard that lets the developer read a prod secret, or refuses Arun's put, fails here; so does a
ci-plan that can read a parameter's value, an object but its two plan states, or a record.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ALLOW_ALL = {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*"}]}


def guard_policies(plan: dict) -> dict[str, str]:
    """The guard documents, by role, from the plan's planned values."""
    found: dict[str, str] = {}
    for res in plan["planned_values"]["root_module"].get("resources", []):
        if res["type"] != "aws_iam_role_policy":
            continue
        name = res["values"].get("name")
        if name == "mypaisa-bootstrap-developer-guard":
            found["developer"] = res["values"]["policy"]
        elif name == "mypaisa-bootstrap-ci-dev-guard":
            found["ci-dev-deploy"] = res["values"]["policy"]
        elif name == "mypaisa-bootstrap-ci-plan-no-contents":
            found["ci-plan"] = res["values"]["policy"]
    missing = {"developer", "ci-dev-deploy", "ci-plan"} - found.keys()
    if missing:
        sys.exit(f"guard check: the plan has no guard policy for {sorted(missing)}")
    return found


def account_of(policy: str) -> str:
    for stmt in json.loads(policy)["Statement"]:
        for arn in stmt.get("Resource", []) if isinstance(stmt.get("Resource"), list) else [stmt.get("Resource", "")]:
            parts = arn.split(":")
            if len(parts) > 4 and parts[4].isdigit():
                return parts[4]
    sys.exit("guard check: no account id in the guard policy")


def cases(acct: str) -> list[tuple[str, str, str, dict[str, tuple[str, str]], str]]:
    """(role, action, resource, context, expected) with context {key: (type, value)}."""
    prod_param = f"arn:aws:ssm:us-east-1:{acct}:parameter/mypaisa-agent/prod/anthropic/api_key"
    dev_param = f"arn:aws:ssm:us-east-1:{acct}:parameter/mypaisa-agent/dev/anthropic/api_key"
    prod_tag = {"aws:ResourceTag/env": ("string", "prod")}
    dev_tag = {"aws:ResourceTag/env": ("string", "dev")}
    boundary = f"arn:aws:iam::{acct}:policy/mypaisa-dev-boundary"
    state = "arn:aws:s3:::wealth-tracker-tfstate"
    allowed, denied = "allowed", "explicitDeny"
    return [
        # The exception: Arun's put over a parameter Terraform made, and nothing else on prod's parameters.
        ("developer", "ssm:PutParameter", prod_param, {**prod_tag, "ssm:Overwrite": ("boolean", "true")}, allowed),
        ("developer", "ssm:PutParameter", prod_param, {**prod_tag, "ssm:Overwrite": ("boolean", "false")}, denied),
        ("developer", "ssm:GetParameter", prod_param, prod_tag, denied),
        ("developer", "ssm:GetParameters", prod_param, prod_tag, denied),
        ("developer", "ssm:GetParameterHistory", prod_param, prod_tag, denied),
        ("developer", "ssm:DeleteParameter", prod_param, prod_tag, denied),
        ("developer", "ssm:AddTagsToResource", prod_param, prod_tag, denied),
        ("developer", "ssm:LabelParameterVersion", prod_param, prod_tag, denied),
        # A parameter tagged prod outside prod's path gets no put.
        ("developer", "ssm:PutParameter", dev_param, {**prod_tag, "ssm:Overwrite": ("boolean", "true")}, denied),
        # Dev stays open.
        ("developer", "ssm:GetParameter", dev_param, dev_tag, allowed),
        ("developer", "ssm:PutParameter", dev_param, {**dev_tag, "ssm:Overwrite": ("boolean", "true")}, allowed),
        ("developer", "dynamodb:PutItem", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-dev-core", dev_tag, allowed),
        # Prod's data, by name even with no tag in the request.
        ("developer", "dynamodb:GetItem", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-prod-core", {}, denied),
        ("developer", "s3:GetObject", "arn:aws:s3:::mypaisa-prod-documents/a/b.pdf", {}, denied),
        ("developer", "s3:GetObject", "arn:aws:s3:::wealth-tracker-tfstate/mypaisa-agent/prod/infra.tfstate", {}, denied),
        ("developer", "s3:GetObject", "arn:aws:s3:::wealth-tracker-tfstate/mypaisa-agent/dev/infra.tfstate", {}, allowed),
        # The guard cannot be stepped around.
        ("developer", "iam:PutRolePolicy", f"arn:aws:iam::{acct}:role/mypaisa-dev-developer", {}, denied),
        ("developer", "iam:DeleteRolePolicy", f"arn:aws:iam::{acct}:role/mypaisa-dev-developer", {}, denied),
        ("developer", "iam:CreatePolicyVersion", boundary, {}, denied),
        ("developer", "iam:CreateRole", f"arn:aws:iam::{acct}:role/mypaisa-dev-x", {}, denied),
        (
            "developer",
            "iam:CreateRole",
            f"arn:aws:iam::{acct}:role/mypaisa-dev-x",
            {"iam:PermissionsBoundary": ("string", boundary)},
            allowed,
        ),
        ("developer", "iam:CreateAccessKey", f"arn:aws:iam::{acct}:user/anyone", {}, denied),
        # ci-dev-deploy has no exception.
        ("ci-dev-deploy", "ssm:PutParameter", prod_param, {**prod_tag, "ssm:Overwrite": ("boolean", "true")}, denied),
        ("ci-dev-deploy", "ssm:GetParameter", prod_param, prod_tag, denied),
        ("ci-dev-deploy", "dynamodb:PutItem", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-dev-core", dev_tag, allowed),
        # ci-plan reads configuration, never contents (MA-25). Its ReadOnlyAccess is stood in for by allow-everything,
        # so an "allowed" here is the policy that carries the denies not refusing it.
        ("ci-plan", "ssm:GetParameter", prod_param, {}, denied),
        ("ci-plan", "ssm:GetParameter", dev_param, {}, denied),
        ("ci-plan", "ssm:GetParameters", dev_param, {}, denied),
        ("ci-plan", "ssm:GetParametersByPath", f"arn:aws:ssm:us-east-1:{acct}:parameter/mypaisa-agent/prod", {}, denied),
        ("ci-plan", "ssm:GetParameterHistory", prod_param, {}, denied),
        ("ci-plan", "ssm:GetParameter", f"arn:aws:ssm:us-east-1:{acct}:parameter/wealth-tracker/anything", {}, denied),
        ("ci-plan", "ssm:DescribeParameters", "*", {}, allowed),
        ("ci-plan", "kms:Decrypt", f"arn:aws:kms:us-east-1:{acct}:key/any", {}, denied),
        ("ci-plan", "secretsmanager:GetSecretValue", f"arn:aws:secretsmanager:us-east-1:{acct}:secret:any", {}, denied),
        ("ci-plan", "s3:GetObject", f"{state}/mypaisa-agent/dev/infra.tfstate", {}, allowed),
        ("ci-plan", "s3:GetObject", f"{state}/mypaisa-agent/prod/infra.tfstate", {}, allowed),
        ("ci-plan", "s3:GetObject", f"{state}/mypaisa-agent/prod/infra.tfstate.tflock", {}, allowed),
        ("ci-plan", "s3:GetObject", f"{state}/mypaisa-agent/prod/secrets.tfstate", {}, denied),
        ("ci-plan", "s3:GetObject", f"{state}/mypaisa-agent/dev/secrets.tfstate", {}, denied),
        ("ci-plan", "s3:GetObject", f"{state}/mypaisa-agent/bootstrap/infra.tfstate", {}, denied),
        ("ci-plan", "s3:GetObjectVersion", f"{state}/mypaisa-agent/prod/secrets.tfstate", {}, denied),
        ("ci-plan", "s3:GetObject", f"{state}/wealth-tracker/prod.tfstate", {}, denied),
        ("ci-plan", "s3:GetObject", "arn:aws:s3:::mypaisa-prod-documents/a/b.pdf", {}, denied),
        ("ci-plan", "s3:GetBucketPolicy", "arn:aws:s3:::mypaisa-prod-documents", {}, allowed),
        ("ci-plan", "dynamodb:DescribeTable", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-prod-core", {}, allowed),
        ("ci-plan", "dynamodb:Scan", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-prod-core", {}, denied),
        ("ci-plan", "dynamodb:Query", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-prod-core", {}, denied),
        ("ci-plan", "dynamodb:GetItem", f"arn:aws:dynamodb:us-east-1:{acct}:table/mypaisa-prod-core", {}, denied),
        ("ci-plan", "cognito-idp:ListUsers", f"arn:aws:cognito-idp:us-east-1:{acct}:userpool/us-east-1_x", {}, denied),
        ("ci-plan", "cognito-idp:DescribeUserPool", f"arn:aws:cognito-idp:us-east-1:{acct}:userpool/us-east-1_x", {}, allowed),
        ("ci-plan", "logs:FilterLogEvents", f"arn:aws:logs:us-east-1:{acct}:log-group:/aws/lambda/mypaisa-prod-api", {}, denied),
        ("ci-plan", "logs:DescribeLogGroups", "*", {}, allowed),
    ]


def simulate(guard: str, action: str, resource: str, context: dict[str, tuple[str, str]]) -> str:
    # The policies go in as JSON text: the CLI does not expand file:// inside a list argument.
    cmd = [
        "aws", "iam", "simulate-custom-policy",
        "--policy-input-list", json.dumps(ALLOW_ALL), guard,
        "--action-names", action,
        "--resource-arns", resource,
        "--output", "json",
    ]  # fmt: skip
    if context:
        # One flag, every entry after it: the CLI takes a list, and a second flag replaces the first.
        cmd.append("--context-entries")
        cmd += [f"ContextKeyName={k},ContextKeyValues={v},ContextKeyType={kind}" for k, (kind, v) in context.items()]
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if run.returncode != 0:
        sys.exit(f"guard check: the simulator refused {action} on {resource}: {run.stderr.strip()}")
    return json.loads(run.stdout)["EvaluationResults"][0]["EvalDecision"]


def main() -> int:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    plan = json.loads(Path(sys.argv[1]).read_text())
    guards = guard_policies(plan)
    acct = account_of(guards["developer"])
    wrong = 0
    all_cases = cases(acct)
    for role, action, resource, context, want in all_cases:
        got = simulate(guards[role], action, resource, context)
        ok = got == want
        wrong += not ok
        ctx = ", ".join(f"{k}={v}" for k, (_, v) in context.items()) or "no context"
        short = resource.replace(acct, "<acct>")
        print(f"{'ok  ' if ok else 'WRONG'} {role:13} {action:27} {short} [{ctx}] -> {got} (want {want})")
    print(f"guard check: {len(all_cases)} cases, {wrong} wrong")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main())
