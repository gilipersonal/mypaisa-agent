#!/usr/bin/env python3
"""Fixed stays fixed: re-run every check in a story's review ledger before each review round.

    python3 scripts/review_regress.py MA-155

Reads review/<key>/fixed.json, one entry per blocking finding a review found and a later round fixed, each with a
check that passes while the fix holds (the global rule in ~/.claude/CLAUDE.md, "Fixed stays fixed"). Check types:

- `cmd`: a shell command that must exit 0 (`"run": "python3 scripts/plan_sync.py selftest"`).
- `cmd_fails`: a shell command that must exit non-zero (`start` refusing a story).
- `grep`: `file` must contain (`present: true`) or must not contain (`present: false`) the regex `pattern`.
- `trace`: a row of docs/trace.json (`key`) whose `field` equals `value`, or contains `contains`, or lists a board
  named `board`.
- `manual`: a check only a person or a tool outside the repo can make (Jira text, a board); it is printed for the
  reviewers, who must look at it.

A failure is a regression: fix it before the round starts.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_check(c: dict) -> tuple[bool | None, str]:
    kind = c.get("type")
    if kind in ("cmd", "cmd_fails"):
        r = subprocess.run(c["run"], shell=True, cwd=ROOT, capture_output=True, text=True)
        ok = (r.returncode == 0) == (kind == "cmd")
        return ok, c["run"]
    if kind == "grep":
        text = (ROOT / c["file"]).read_text()
        found = re.search(c["pattern"], text, re.M) is not None
        return found == c.get("present", True), f"{c['file']} {'has' if c.get('present', True) else 'lacks'} /{c['pattern']}/"
    if kind == "trace":
        trace = json.loads((ROOT / "docs" / "trace.json").read_text())
        row = next((i for i in trace.get("items", []) if i.get("key") == c["key"]), None)
        if row is None:
            return False, f"{c['key']} is not in the trace"
        if "board" in c:
            return any(b.get("board") == c["board"] for b in row.get("boards", [])), f"{c['key']} lists board {c['board']!r}"
        val = row.get(c["field"])
        if "value" in c:
            return val == c["value"], f"{c['key']}.{c['field']} == {c['value']!r}"
        return any(c["contains"] in str(x) for x in (val or [])) if isinstance(val, list) else c["contains"] in str(val), \
            f"{c['key']}.{c['field']} contains {c['contains']!r}"
    if kind == "manual":
        return None, c["what"]
    return False, f"unknown check type {kind!r}"


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    ledger = ROOT / "review" / argv[1] / "fixed.json"
    entries = json.loads(ledger.read_text())
    failed = 0
    for e in entries:
        ok, what = run_check(e["check"])
        mark = "MANUAL" if ok is None else ("ok    " if ok else "BROKEN")
        failed += ok is False
        print(f"{mark} {e['id']}: {e['finding']} [{what}]")
    print(f"review-regress {argv[1]}: {len(entries)} fixed findings, {failed} broken")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
