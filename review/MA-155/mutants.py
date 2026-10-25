#!/usr/bin/env python3
"""The fixed list's behaviour checks must catch their fix being undone (lesson 3, .claude/rules/independent-review.md).

    python3 review/MA-155/mutants.py

For each mutant, builds a scratch copy of the repo with scripts/plan_sync.py changed to undo one fix, runs the
ledger entry that guards it there, and requires that entry to fail. Exits 0 only if every guard catches its mutant.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = json.loads((ROOT / "review" / "MA-155" / "fixed.json").read_text())
CHECKS = {e["id"]: e["check"] for e in LEDGER}

# (the ledger entry that must catch it, the text to change in plan_sync.py, what to change it to)
MUTANTS = [
    ("r2-B3", '    if errors:\n        print("  STOP: fix the row', '    if False:\n        print("  STOP: fix the row'),
    ("r3-B4", '    if it.get("undrawn") and status in ("In Review", "Done"):', '    if False:'),
    ("r3-B4", '    if it.get("undrawn") and status in ("In Review", "Done"):', '    if it.get("undrawn") and status == "Done":'),
    # These keep the guarded text and change only what it does, so a guard that reads code text misses them.
    ("r2-B3", 'before the story starts.")\n        return 1\n    if it.get("open"):', 'before the story starts.")\n        return 0\n    if it.get("open"):'),
    ("r3-B4", '        errors.append(f"{k}: {status} with screens still undrawn', '        str(f"{k}: {status} with screens still undrawn'),
    ("r2-B1", '    if it.get("undrawn"):\n        for q in it["undrawn"]:', '    if False:\n        for q in it["undrawn"]:'),
    ("r2-B1", "<the item, as it was listed>'.\")\n        return 1", "<the item, as it was listed>'.\")\n        return 0"),
]


def run_in(root: Path, source: str, entry: str) -> int:
    for name in ("ARCHITECTURE.md", "PLAN.md", "TECH_STACK.md", "README.md", "docs", "review"):
        (root / name).symlink_to(ROOT / name)
    (root / "scripts").mkdir()
    (root / "scripts" / "plan_sync.py").write_text(source)
    return subprocess.run(CHECKS[entry]["run"], shell=True, cwd=root, capture_output=True, text=True).returncode


def main() -> int:
    source = (ROOT / "scripts" / "plan_sync.py").read_text()
    missed = 0
    # Control: on the unchanged script each guard passes in the same scaffold, so a "caught" below is the mutant's doing.
    for entry in sorted({e for e, _, _ in MUTANTS}):
        with tempfile.TemporaryDirectory() as tmp:
            if run_in(Path(tmp), source, entry) != 0:
                print(f"CONTROL FAILED: {entry} fails on the unchanged script; fix the guard or the scaffold")
                missed += 1
    for entry, old, new in MUTANTS:
        if source.count(old) != 1:
            print(f"STALE: the mutant for {entry} no longer applies; update review/MA-155/mutants.py")
            missed += 1
            continue
        with tempfile.TemporaryDirectory() as tmp:
            caught = run_in(Path(tmp), source.replace(old, new), entry) != 0
        print(f"{'caught' if caught else 'MISSED'} {entry}: {new.strip()[:60]}")
        missed += not caught
    print(f"mutants: {len(MUTANTS)}, missed {missed}")
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
