#!/usr/bin/env python3
"""MA-282's four rewritten checks must still catch their fault (lessons 3, 16 and 22, .claude/rules/independent-review.md).

    python3 review/MA-282/mutants.py [name ...]

For each mutant, checks out HEAD into a scratch git worktree, puts one old fault back there, runs the ledger entry
that guards it (as review/<key>/fixed.json has it at HEAD) inside that worktree, and requires the entry to fail with
the output its fault makes, not for some other reason. The worktree is removed afterwards, whatever happens. Exits 0
only if every mutant is caught. The board diff (MA-240 r0-6 and r1-3, one command) takes a while: it is the full
ledger command, in Chromium and WebKit. Set PLAYWRIGHT_CORE when the scratch worktree cannot find playwright-core
(scripts/node_modules is not in git); it defaults to this checkout's own copy.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = ["docs/design/ds-v1/tokens.css", "docs/design/ios-v1/tokens.css", "docs/design/app-v1/tokens.css"]
PAGE = "docs/design/inside-mypaisa.html"
CD = "scripts/confluence_docs.py"
PAGE_FIX = ('"manual" if "manual" in (it.get("labels") or []) else ("todo" if it.get("ui") else "back")',
            '"manual" if "manual" in (it.get("labels") or []) else "back"')
CSV_FIX = ('(["Still to draw"] if it.get("ui") else (["Back end"] if "manual" not in (it.get("labels") or []) else ["Yours"]))',
           '(["Back end"] if "manual" not in (it.get("labels") or []) else ["Yours"])')
# round 1's guard (6ab6601): a hero figure on any page under 700 steps down, a phone door's included
HERO = "\n@container page (max-width: 699px) { .mp .mp-num-hero { font-size: 36px; line-height: 40px; } }\n"

# name: (ledger, entry ids it must break, [(file, old, new)], what the failing output must show)
MUTANTS = {
    "c4-both": ("MA-261", ["r1-c4"], [(CD, *PAGE_FIX), (CD, *CSV_FIX)],
                r"FAIL MA-\d+ \(no boards yet\) on the phase \d+ page[\s\S]*FAIL MA-\d+ \(no boards yet\) in stories\.csv: Back end"),
    "c4-page": ("MA-261", ["r1-c4"], [(CD, *PAGE_FIX)], r"FAIL MA-\d+ \(no boards yet\) on the phase \d+ page"),
    "c4-csv": ("MA-261", ["r1-c4"], [(CD, *CSV_FIX)], r"FAIL MA-\d+ \(no boards yet\) in stories\.csv: Back end"),
    "35-round1": ("MA-240", ["r2-35"], [(PAGE, "--track:#CDCFD4", "--track:#BEC1C8"), (PAGE, "--track:#454E5C", "--track:#485160")],
                  r"\] \['#BEC1C8', '#485160', '#485160'\]"),
    "35-light": ("MA-240", ["r2-35"], [(PAGE, "--track:#CDCFD4", "--track:#BEC1C8")], r"\] \['#BEC1C8', '#454E5C', '#454E5C'\]"),
    "diff-hero": ("MA-240", ["r0-6", "r1-3"], [(f, r"\Z", HERO) for f in TOKENS],
                  r"FAIL (app|ios|ds)-v1/(?!Prototype v4|Web v4 · Projection|iPhone v4 · Projection)[^\n]*· \d+ pixels[\s\S]*board-fit diff: \d+ boards against d6e243f, \d+ frames changed, [1-9]\d* not meant"),
}


def mutate(wt: Path, edits: list[tuple[str, str, str]]) -> None:
    for f, old, new in edits:
        p = wt / f
        s = p.read_text()
        if old == r"\Z":
            p.write_text(s + new)
            continue
        if old not in s:
            raise SystemExit(f"mutants: the mutation does not apply to {f}: {old[:60]!r}")
        p.write_text(s.replace(old, new))


def main(argv: list[str]) -> int:
    names = argv[1:] or list(MUTANTS)
    for n in names:
        if n not in MUTANTS:
            print(f"mutants: no mutant {n} (the mutants: {', '.join(MUTANTS)})")
            return 2
    env = dict(os.environ, PLAYWRIGHT_CORE=os.environ.get("PLAYWRIGHT_CORE") or str(ROOT / "scripts" / "node_modules" / "playwright-core"))
    wrong = 0
    for n in names:
        key, ids, edits, want = MUTANTS[n]
        checks = {e["id"]: e["check"] for e in json.loads((ROOT / "review" / key / "fixed.json").read_text())}
        runs = {checks[i]["run"] for i in ids}
        with tempfile.TemporaryDirectory(prefix="ma282-") as tmp:
            wt = Path(tmp) / "wt"
            subprocess.run(["git", "-C", str(ROOT), "worktree", "add", "--detach", "-q", str(wt), "HEAD"], check=True)
            try:
                mutate(wt, edits)
                for run in runs:
                    r = subprocess.run(run, shell=True, cwd=wt, capture_output=True, text=True, env=env)
                    out = r.stdout + r.stderr
                    ok = r.returncode not in (0, 2) and re.search(want, out) is not None
                    wrong += not ok
                    shown = [ln for ln in out.splitlines() if ln.startswith(("FAIL", "r1-c4", "board-fit diff", "["))][:4]
                    print(f"{'ok  ' if ok else 'WRONG'} {n} ({key} {', '.join(ids)}): exit {r.returncode}, "
                          f"{'caught for the right reason' if ok else 'not caught as expected'}")
                    for ln in shown:
                        print(f"       {ln[:220]}")
            finally:
                subprocess.run(["git", "-C", str(ROOT), "worktree", "remove", "--force", str(wt)], check=False)
    print(f"mutants: {len(names)} put back, {wrong} not caught")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
