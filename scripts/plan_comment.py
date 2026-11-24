#!/usr/bin/env python3
"""Write the Terraform plan comment CI posts on a pull request (MA-25, ARCHITECTURE §17.4).

    python3 scripts/plan_comment.py <head sha> <plan-dev.txt> <plan-prod.txt> > plan-comment.md
    python3 scripts/plan_comment.py --selftest

Each file is `terraform show -no-color` of a saved plan, named plan-<root>.txt. The comment starts with a marker, so
CI updates its one comment on every push; it gives each root's summary line, then the plan in a fold, cut to fit
GitHub's 65,536-character limit with a line saying so. The plans are of infra/dev and infra/prod, which hold no SSM
parameter, and ci-plan can read no parameter's value (MA-25), so no secret can be in them.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

MARKER = "<!-- mypaisa-terraform-plan -->"
LIMIT = 65_000  # GitHub's comment limit is 65,536 characters; the rest is headroom for the markup.
SUMMARY = re.compile(r"^(Plan: \d+ to add, \d+ to change, \d+ to destroy\.|No changes\..*)$", re.MULTILINE)


def summary(text: str) -> str:
    """The plan's own summary line; a plan without one is refused, never shown as clean."""
    found = SUMMARY.search(text)
    if not found:
        raise ValueError("no 'Plan: ...' or 'No changes.' line: not the output of terraform show on a plan")
    return found.group(1)


def comment(sha: str, plans: dict[str, str]) -> str:
    head = [MARKER, f"### Terraform plan for `{sha[:12]}`", ""]
    head += [f"- **{root}**: {summary(text)}" for root, text in plans.items()]
    head += [
        "",
        "Planned by `mypaisa-ci-plan`, which reads configuration and never a parameter's value or a record. "
        "The SSM parameters are in `infra/dev-secrets` and `infra/prod-secrets`, which no pull request plans.",
        "",
    ]
    out = "\n".join(head)
    budget = (LIMIT - len(out)) // max(len(plans), 1)
    for root, text in plans.items():
        fold_open = f"<details><summary>{root}</summary>\n\n```\n"
        fold_close = "\n```\n\n</details>\n"
        room = budget - len(fold_open) - len(fold_close) - 120
        body = text.rstrip("\n")
        if len(body) > room:
            body = body[: max(room, 0)].rstrip("\n") + f"\n\n... cut: {len(text) - room} more characters in the job's log"
        out += fold_open + body + fold_close
    return out


def selftest() -> int:
    ok = 0
    plan = "  # aws_s3_bucket.x will be created\n\nPlan: 3 to add, 0 to change, 0 to destroy.\n"
    clean = "No changes. Your infrastructure matches the configuration.\n"
    cases: list[tuple[str, bool]] = []

    c = comment("0123456789abcdef", {"dev": plan, "prod": clean})
    cases.append(("starts with the marker", c.startswith(MARKER)))
    cases.append(("dev's summary line", "- **dev**: Plan: 3 to add, 0 to change, 0 to destroy." in c))
    cases.append(("prod's summary line", "- **prod**: No changes. Your infrastructure matches the configuration." in c))
    cases.append(("the sha, short", "`0123456789ab`" in c and "0123456789abcdef" not in c))

    try:
        comment("0" * 40, {"dev": "Error: something\n"})
        cases.append(("an output with no summary is refused", False))
    except ValueError:
        cases.append(("an output with no summary is refused", True))

    huge = "x" * 200_000 + "\nPlan: 1 to add, 0 to change, 0 to destroy.\n"
    c = comment("0" * 40, {"dev": huge, "prod": huge})
    cases.append(("a huge plan fits GitHub's limit", len(c) <= 65_536))
    cases.append(("a cut plan says so", c.count("... cut:") == 2))
    cases.append(("a cut plan still gives its summary", c.count("Plan: 1 to add") == 2))

    for name, passed in cases:
        ok += passed
        print(f"{'ok  ' if passed else 'FAIL'} {name}")
    print(f"plan_comment selftest: {ok} of {len(cases)}")
    return 0 if ok == len(cases) else 1


def main(argv: list[str]) -> int:
    if argv[1:] == ["--selftest"]:
        return selftest()
    if len(argv) < 3:
        sys.exit(__doc__)
    sha, files = argv[1], [Path(f) for f in argv[2:]]
    plans = {}
    for f in files:
        root = f.stem.removeprefix("plan-")
        plans[root] = f.read_text()
    try:
        sys.stdout.write(comment(sha, plans))
    except ValueError as err:
        sys.exit(f"plan_comment: {err}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
