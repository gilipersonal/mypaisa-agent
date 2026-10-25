#!/usr/bin/env python3
"""Fixed stays fixed: re-run every check in a story's review ledger before each review round.

    python3 scripts/review_regress.py MA-155

Reads review/<key>/fixed.json, one entry per blocking finding a review found and a later round fixed (and any owner
decision the review must keep), each with a check that passes while the fix holds (the global rule in ~/.claude/CLAUDE.md, "Fixed stays fixed"). Check types:

- `cmd`: a shell command that must exit 0 (`"run": "python3 scripts/plan_sync.py selftest"`).
- `cmd_fails`: a shell command that must exit non-zero (`start` refusing a story).
- `grep`: `file`, or each of `files` (which may hold glob patterns such as `docs/design/app-v1/*.dc.html`, and
  takes the place of `file` when both are given), must contain (`present: true`) or must not contain
  (`present: false`) the regex `pattern`, matched across line breaks (`\\s` spans them), case-insensitively when
  `ignore_case` is true. A missing file, or a glob that matches nothing, is a failure, never a pass.
- `trace`: a row of docs/trace.json (`key`) whose `field` equals `value`, or contains `contains`, or lists a board
  named `board`. A `contains` check on the `undrawn` list may add `or_drawn: {"file": "<file>", "boards": [...]}`: it
  also passes once the screen is drawn, that is, the row is `planned` or `picked` and lists every named board of
  that file (a to-do item that is done is not lost; dropping the board that draws it still fails, whatever else
  stays on the row). It applies to nothing else; an `or_drawn` without a `file` and a non-empty `boards` list fails
  the entry. A `contains` check on a field the row lacks fails.
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
        files, missing = [], []
        for f in c.get("files") or [c["file"]]:
            if Path(f).is_absolute() or ".." in Path(f).parts:
                missing.append(f"{f} (paths stay inside the repo)")
                continue
            found = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob(f) if p.is_file()) if any(ch in f for ch in "*?[") else [f]
            if not found or not all((ROOT / x).is_file() for x in found):
                missing.append(f)
            files += found
        if missing:
            return False, f"missing: {', '.join(missing)}"
        flags = re.M | (re.I if c.get("ignore_case") else 0)
        hits = [f for f in files if re.search(c["pattern"], (ROOT / f).read_text(), flags)]
        want = c.get("present", True)
        ok = len(hits) == len(files) if want else not hits
        detail = f" (lacking in {', '.join(f for f in files if f not in hits)})" if want and not ok else ""
        detail += f" (found in {', '.join(hits)})" if hits and not want else ""
        return ok, f"{len(files)} file(s) {'have' if want else 'lack'} /{c['pattern']}/{detail}"
    if kind == "trace":
        trace = json.loads((ROOT / "docs" / "trace.json").read_text())
        row = next((i for i in trace.get("items", []) if i.get("key") == c["key"]), None)
        if row is None:
            return False, f"{c['key']} is not in the trace"
        if "board" in c:
            return any(b.get("board") == c["board"] for b in row.get("boards", [])), f"{c['key']} lists board {c['board']!r}"
        val = row.get(c["field"])
        drawn = c.get("or_drawn")
        if drawn is not None and not (isinstance(drawn, dict) and isinstance(drawn.get("file"), str)
                                      and isinstance(drawn.get("boards"), list) and drawn["boards"]):
            return False, f"{c['key']}: or_drawn needs a file and a non-empty boards list, got {drawn!r}"
        if drawn and c.get("field") == "undrawn" and "contains" in c and row.get("design") in ("planned", "picked"):
            have = {(b.get("file"), b.get("board")) for b in row.get("boards", [])}
            if all((drawn["file"], n) in have for n in drawn["boards"]):
                return True, f"{c['key']} drawn: {', '.join(drawn['boards'])} ({drawn['file']})"
        if "value" in c:
            return val == c["value"], f"{c['key']}.{c['field']} == {c['value']!r}"
        if val is None:
            return False, f"{c['key']} has no {c['field']}"
        return any(c["contains"] in str(x) for x in val) if isinstance(val, list) else c["contains"] in str(val), \
            f"{c['key']}.{c['field']} contains {c['contains']!r}"
    if kind == "manual":
        return None, c["what"]
    return False, f"unknown check type {kind!r}"


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    ledger = ROOT / "review" / argv[1] / "fixed.json"
    if not ledger.is_file():
        print(f"review-regress {argv[1]}: no ledger yet (review/{argv[1]}/fixed.json); nothing fixed to re-check")
        return 0
    entries = json.loads(ledger.read_text())
    failed = manual = 0
    for e in entries:
        ok, what = run_check(e["check"])
        mark = "MANUAL" if ok is None else ("ok    " if ok else "BROKEN")
        failed += ok is False
        manual += ok is None
        print(f"{mark} {e['id']}: {e['finding']} [{what}]")
    print(f"review-regress {argv[1]}: {len(entries)} fixed findings, {failed} broken, {manual} for the reviewers to check by eye")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
