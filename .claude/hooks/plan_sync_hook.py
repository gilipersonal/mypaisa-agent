#!/usr/bin/env python3
"""This repo's plan-sync hooks (MA-228); .claude/settings.json runs them, in this repo only.

    plan_sync_hook.py after-edit   PostToolUse on Edit|Write|MultiEdit: after an edit to a record (the trace, the
                                   roadmap, PLAN, ARCHITECTURE, the boards and their record, the Confluence pages, the code),
                                   run the check and tell the session about drift the edit introduced
    plan_sync_hook.py before-pr    PreToolUse on Bash: refuse `gh pr create` and `gh pr ready` while the check fails, or
                                   while scripts/design_sync.py check fails: a board in docs/design/ that differs from its
                                   record, or a MyPaisa Boards Artifact published before the boards last changed (MA-260)
    plan_sync_hook.py selftest     offline: each hook finds the checkout a call acts on (a worktree, not main beside it),
                                   and the PR hook refuses while the boards' check fails or cannot run
    plan_sync_hook.py new-work     UserPromptSubmit: when the prompt talks about a new design or feature, remind the
                                   session that it gets a Jira issue and its Confluence page in the same change

Never blocks anything but raising a PR; a hook that cannot run says so and lets the work go on.
"""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path(__file__).resolve().parents[2])
RECORDS = re.compile(r"^(docs/trace\.json|docs/roadmap\.json|docs/confluence|docs/design/|PLAN\.md|ARCHITECTURE\.md|TECH_STACK\.md|README\.md"
                     r"|scripts/(plan_sync|roadmap|confluence_docs|design_sync)\.py|web/|ios/|src/|infra/)")
NEW_WORK = re.compile(r"\b(new (feature|screen|page|flow|design|card|story|kind)|redesign|design (a|the|for|new)|feature|mock-?up|wireframe"
                      r"|ux|ui change|board|add (a|an|the) .{0,40}(screen|page|button|card|chart|flow|tab)|can we (have|add|build)"
                      r"|i (want|need) (a|an|the|to see))\b", re.I)


def checkout(start: str | None) -> Path:
    """The checkout a tool call acts on: the git top level of `start` (the folder a command runs in, or an edited file),
    when it holds this repo's scripts, else the project folder. A worktree's edits and PRs are checked in that worktree,
    against its own scripts and records, never in the main checkout beside it (MA-260: the PR hook checked main's mirror
    while the PR came from a worktree)."""
    if start:
        d = Path(start)
        d = d if d.is_dir() else d.parent
        try:
            top = subprocess.run(["git", "-C", str(d), "rev-parse", "--show-toplevel"], capture_output=True, text=True, timeout=10).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            top = ""
        if top and (Path(top) / "scripts" / "plan_sync.py").is_file():
            return Path(top)
    return ROOT


def pr_checkout(before: str, cwd: str | None) -> Path:
    """The checkout a command raises its PR from: the last `cd` before `gh pr`, else the folder the command runs in."""
    where = cwd
    if cds := [m.end() for m in re.finditer(r"(?:^|[;&|(]|\bthen|\bdo)\s*cd\s+", before)]:
        lex = shlex.shlex(before[cds[-1]:], posix=True, punctuation_chars=True)
        lex.whitespace_split = True
        try:
            where = os.path.expanduser(next(iter(lex), "") or "") or cwd  # the shell's own reading of the path
        except ValueError:  # an unclosed quote: no path to read, so the folder the command runs in
            where = cwd
    if cds and where and cwd and not os.path.isabs(where):
        where = os.path.join(cwd, where)
    return checkout(where)


def selftest() -> int:
    """Offline: the hooks find the checkout a call acts on, and the PR hook refuses a PR while the boards' check fails
    (MA-260), in throwaway repos; plan_sync.py selftest runs it."""
    bad = 0
    with tempfile.TemporaryDirectory() as t:
        main, wt, other = Path(t) / "main", Path(t) / "main" / ".claude" / "worktrees" / "a b", Path(t) / "plain"
        for repo in (main, wt):
            (repo / "scripts").mkdir(parents=True)
            (repo / "scripts" / "plan_sync.py").write_text("")
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
        other.mkdir()
        cases = [
            ("the command's folder", pr_checkout("", str(wt)), wt),
            ("a file deep in a worktree", checkout(str(wt / "scripts" / "plan_sync.py")), wt),
            ("cd into a worktree from main", pr_checkout(f'cd "{wt}" && ', str(main)), wt),
            ("cd into main from a worktree", pr_checkout(f"cd {main}; ", str(wt)), main),
            ("the last cd wins", pr_checkout(f"cd {main} && cd '{wt}' && ", str(other)), wt),
            ("a relative cd", pr_checkout("cd .claude/worktrees/'a b' && ", str(main)), wt),
            ("a folder that is no checkout of this repo", pr_checkout("", str(other)), ROOT),
            ("no folder at all", pr_checkout("", None), ROOT),
        ]
        for what, got, want in cases:
            if got.resolve() != want.resolve():
                bad += 1
                print(f"FAIL: plan-sync hook, {what}: chose {got}, not {want}")
        # The PR hook runs the boards' offline check in that checkout and fails closed (MA-260): a stand-in check that
        # passes, one that reports drift, one that exits without a word, and none at all.
        gate = Path(t) / "gate"
        (gate / "scripts").mkdir(parents=True)
        (gate / "scripts" / "plan_sync.py").write_text("import sys\nsys.exit(0)\n")
        subprocess.run(["git", "init", "-q", str(gate)], check=True)
        raise_pr, ready_pr = "gh pr " + "create -t x", "git add -A && gh pr " + "ready 7"
        stand_ins = [
            ("a clean check", "import sys\nprint('design-sync: 1 files recorded, 0 drift')\nsys.exit(0)\n", raise_pr, 0),
            ("a board out of its record", "import sys\nprint('DRIFT: boards: x is 2 bytes, recorded 1')\nsys.exit(1)\n", raise_pr, 2),
            ("a check that exits without a word", "import sys\nsys.exit(3)\n", ready_pr, 2),
            ("no check at all", None, raise_pr, 2),
            ("a command that raises no PR", "import sys\nsys.exit(1)\n", "echo notes > notes.txt", 0),
        ]
        for what, body, cmd, want in stand_ins:
            ds = gate / "scripts" / "design_sync.py"
            ds.unlink(missing_ok=True)
            if body is not None:
                ds.write_text(body)
            with contextlib.redirect_stderr(io.StringIO()):
                got = before_pr({"tool_input": {"command": cmd}, "cwd": str(gate)})
            if got != want:
                bad += 1
                print(f"FAIL: plan-sync hook, the PR hook on {what}: exit {got}, not {want}")
    print(f"plan-sync hook selftest: {len(cases)} checkouts and {len(stand_ins)} PR-hook checks, {bad} wrong")
    return 1 if bad else 0


def drift(root: Path = ROOT) -> tuple[int, list[str]]:
    r = subprocess.run([sys.executable, "-I", str(root / "scripts" / "plan_sync.py"), "check"], capture_output=True, text=True, cwd=root, timeout=120)
    return r.returncode, [ln[len("DRIFT: "):] for ln in r.stdout.splitlines() if ln.startswith("DRIFT: ")]


def design_drift(root: Path = ROOT) -> tuple[int, list[str]]:
    """The boards against their record and the Boards Artifact's stamp, offline (MA-260). Fails closed: a check that
    cannot run, or exits without saying why, is drift too."""
    try:
        r = subprocess.run([sys.executable, "-I", str(root / "scripts" / "design_sync.py"), "check"], capture_output=True, text=True,
                           cwd=root, timeout=120)
    except subprocess.TimeoutExpired:
        return 1, ["boards: the check took over 120 s"]
    lines = [ln[len("DRIFT: "):] for ln in r.stdout.splitlines() if ln.startswith("DRIFT: ")]
    return r.returncode, lines or ([f"boards: the check exited {r.returncode}: {(r.stderr or r.stdout).strip()[-300:]}"] if r.returncode else [])


def say(event: str, text: str) -> None:
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}))


def after_edit(data: dict) -> int:
    path = (data.get("tool_input") or {}).get("file_path") or ""
    root = checkout(path)
    try:
        rel = Path(path).resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return 0
    if not RECORDS.match(rel):
        return 0
    _, lines = drift(root)
    seen_file = Path(tempfile.gettempdir()) / f"mypaisa-plan-sync-{hashlib.sha256(str(root).encode()).hexdigest()[:12]}.json"
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
    if not (m := re.search(r"(?m)(?:^|[;&|(]|\bthen|\bdo)\s*(?:\w+=\S+\s+)*gh\s+pr\s+(?:create|ready)\b", cmd)):
        return 0
    root = pr_checkout(cmd[:m.start()], data.get("cwd"))
    code, lines = drift(root)
    if code != 0:
        print(f"plan-sync check reports {len(lines)} drift; the plan, Jira, the designs, Confluence and the code must agree before a PR "
              "(.claude/rules/plan-sync.md). First items:\n- " + "\n- ".join(lines[:10]), file=sys.stderr)
        return 2
    code, lines = design_drift(root)
    if code == 0:
        return 0
    print(f"design-sync check reports {len(lines)} drift: before a PR every board in docs/design/ matches its record and the MyPaisa "
          "Boards Artifact was published after the last change. After a board edit: `python3 scripts/design_sync.py record`, rebuild "
          "and republish the Boards Artifact, then `python3 scripts/design_sync.py published` (.claude/rules/plan-sync.md, rule 7). "
          "First items:\n- " + "\n- ".join(lines[:10]), file=sys.stderr)
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
        data = {} if argv[1:2] == ["selftest"] else json.load(sys.stdin)
    except ValueError:
        data = {}
    try:
        if argv[1:2] == ["selftest"]:
            return selftest()
        return {"after-edit": after_edit, "before-pr": before_pr, "new-work": new_work}[argv[1]](data)
    except (KeyError, IndexError):
        print(__doc__, file=sys.stderr)
        return 0
    except (OSError, subprocess.SubprocessError) as e:
        print(f"plan-sync hook could not run: {e}", file=sys.stderr)
        return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
