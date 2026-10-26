#!/usr/bin/env python3
"""This repo's plan-sync hooks (MA-228); .claude/settings.json runs them, in this repo only.

    plan_sync_hook.py after-edit   PostToolUse on Edit|Write|MultiEdit: after an edit to a record (the trace, the
                                   roadmap, PLAN, ARCHITECTURE, the design mirror, the Confluence pages, the code),
                                   run the check and tell the session about drift the edit introduced
    plan_sync_hook.py before-pr    PreToolUse on Bash: refuse `gh pr create` and `gh pr ready` while the check fails
    plan_sync_hook.py new-work     UserPromptSubmit: when the prompt talks about a new design or feature, remind the
                                   session that it gets a Jira issue and its Confluence page in the same change

Never blocks anything but raising a PR; a hook that cannot run says so and lets the work go on.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path(__file__).resolve().parents[2])
RECORDS = re.compile(r"^(docs/trace\.json|docs/roadmap\.json|docs/confluence|docs/design/|PLAN\.md|ARCHITECTURE\.md|TECH_STACK\.md|README\.md"
                     r"|scripts/(plan_sync|roadmap|confluence_docs)\.py|web/|ios/|src/|infra/)")
NEW_WORK = re.compile(r"\b(new (feature|screen|page|flow|design|card|story|kind)|redesign|design (a|the|for|new)|feature|mock-?up|wireframe"
                      r"|ux|ui change|board|add (a|an|the) .{0,40}(screen|page|button|card|chart|flow|tab)|can we (have|add|build)"
                      r"|i (want|need) (a|an|the|to see))\b", re.I)


def drift() -> tuple[int, list[str]]:
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts" / "plan_sync.py"), "check"], capture_output=True, text=True, cwd=ROOT, timeout=120)
    return r.returncode, [ln[len("DRIFT: "):] for ln in r.stdout.splitlines() if ln.startswith("DRIFT: ")]


def say(event: str, text: str) -> None:
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}))


def after_edit(data: dict) -> int:
    path = (data.get("tool_input") or {}).get("file_path") or ""
    try:
        rel = Path(path).resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return 0
    if not RECORDS.match(rel):
        return 0
    _, lines = drift()
    seen_file = Path(tempfile.gettempdir()) / f"mypaisa-plan-sync-{hashlib.sha256(str(ROOT).encode()).hexdigest()[:12]}.json"
    try:
        seen = set(json.loads(seen_file.read_text()))
    except (OSError, ValueError):
        seen = set()
    new = [ln for ln in lines if ln not in seen]
    try:
        seen_file.write_text(json.dumps(lines))
    except OSError:
        pass
    if new:
        more = f" (and {len(new) - 8} more)" if len(new) > 8 else ""
        say("PostToolUse", f"plan-sync: editing {rel} left {len(lines)} drift; new since the last edit{more}:\n- " + "\n- ".join(new[:8])
            + "\nFix it in the records (python3 scripts/roadmap.py write, python3 scripts/confluence_docs.py write, /plan-sync to "
              "publish to Confluence and Jira) before the PR (.claude/rules/plan-sync.md).")
    return 0


def before_pr(data: dict) -> int:
    cmd = (data.get("tool_input") or {}).get("command") or ""
    # an actual invocation: at the start of a line or after a shell separator, not the words inside a heredoc or a quote
    if not re.search(r"(?m)(?:^|[;&|(]|\bthen|\bdo)\s*(?:\w+=\S+\s+)*gh\s+pr\s+(?:create|ready)\b", cmd):
        return 0
    code, lines = drift()
    if code == 0:
        return 0
    print(f"plan-sync check reports {len(lines)} drift; the plan, Jira, the designs, Confluence and the code must agree before a PR "
          "(.claude/rules/plan-sync.md). First items:\n- " + "\n- ".join(lines[:10]), file=sys.stderr)
    return 2


def new_work(data: dict) -> int:
    if NEW_WORK.search(data.get("prompt") or ""):
        say("UserPromptSubmit", "This repo's rule (.claude/rules/plan-sync.md, New work): a new design or feature gets, in the same change, its "
            "Jira story or task under its phase epic, its PLAN.md bullet, its trace row with an estimate in docs/roadmap.json, and its place "
            "on its Confluence phase page (python3 scripts/confluence_docs.py write, then /plan-sync to publish); a new phase gets its epic, "
            "PLAN section and Confluence page. Boards come before code (/design-first). If this prompt is not about new work, ignore this.")
    return 0


def main(argv: list[str]) -> int:
    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}
    try:
        return {"after-edit": after_edit, "before-pr": before_pr, "new-work": new_work}[argv[1]](data)
    except (KeyError, IndexError):
        print(__doc__, file=sys.stderr)
        return 0
    except (OSError, subprocess.SubprocessError) as e:
        print(f"plan-sync hook could not run: {e}", file=sys.stderr)
        return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
