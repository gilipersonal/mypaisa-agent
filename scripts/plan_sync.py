#!/usr/bin/env python3
"""Keep the plan, the designs and Jira in step (MA-155).

The repo-side half of the plan-sync check. It reads docs/trace.json (the
schema is in .claude/skills/plan-sync/reference/trace-schema.md) against
ARCHITECTURE.md, PLAN.md, the other docs and the Claude Design mirror. The
Jira and Claude Design halves need their MCP tools and live in /plan-sync.

    python3 scripts/plan_sync.py check         # fail on drift (a jira-flow gate and a CI job)
    python3 scripts/plan_sync.py render        # rewrite docs/TRACE.md from the trace
    python3 scripts/plan_sync.py start MA-149  # what a story needs before work starts
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACE = ROOT / "docs" / "trace.json"
TRACE_MD = ROOT / "docs" / "TRACE.md"
MIRROR = ROOT / "docs" / "design" / "claude-design.json"
ARCH = ROOT / "ARCHITECTURE.md"
PLAN = ROOT / "PLAN.md"
CITING = [ARCH, PLAN, ROOT / "TECH_STACK.md", ROOT / "README.md", ROOT / "docs" / "design" / "README.md"]
KEY = re.compile(r"\bMA-(\d+)\b")
DESIGN_STATES = {"none", "planned", "picked", "todo"}


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        sys.exit(f"plan-sync: {path.relative_to(ROOT)} is missing")
    except json.JSONDecodeError as e:
        sys.exit(f"plan-sync: {path.relative_to(ROOT)} is not valid JSON: {e}")


def arch_sections() -> dict[str, str]:
    """Section number -> heading text, from '## 4. Title' and '### 4.6 Title'."""
    out = {}
    for line in ARCH.read_text().splitlines():
        m = re.match(r"^#{2,3} (\d+(?:\.\d+)?)\.? (.+)$", line)
        if m:
            out[m.group(1)] = m.group(2).strip()
    return out


def known_keys(trace: dict) -> set[str]:
    keys = {i["key"] for i in trace.get("items", [])}
    keys |= {p["epic"] for p in trace.get("phases", [])}
    keys |= {o["key"] for o in trace.get("others", [])}
    return keys


def check(trace: dict) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    sections = arch_sections()
    plan_lines = set(PLAN.read_text().splitlines())
    phases = {p["epic"]: p for p in trace.get("phases", [])}
    by_phase = {p["phase"]: p for p in trace.get("phases", [])}
    projects = trace.get("claude_design", {})
    mirror = load(MIRROR) if MIRROR.exists() else {}

    # Phases: every PLAN.md phase heading has an entry, and every entry's heading exists.
    for line in plan_lines:
        m = re.match(r"^## Phase (\d+)\b", line)
        if m and int(m.group(1)) not in by_phase:
            errors.append(f"PLAN.md has '{line}' but the trace has no phase {m.group(1)}")
    for p in trace.get("phases", []):
        if p.get("plan_heading") not in plan_lines:
            errors.append(f"phase {p['phase']} ({p['epic']}): heading not in PLAN.md: {p.get('plan_heading')!r}")

    # Items.
    seen = set()
    for it in trace.get("items", []):
        k = it.get("key", "?")
        if k in seen:
            errors.append(f"{k}: listed twice")
        seen.add(k)
        ph = phases.get(it.get("epic"))
        if not ph:
            errors.append(f"{k}: epic {it.get('epic')} is not a phase epic")
        elif ph["phase"] != it.get("phase"):
            errors.append(f"{k}: phase {it.get('phase')} but its epic {it['epic']} is phase {ph['phase']}")
        for s in it.get("arch", []):
            if s not in sections:
                errors.append(f"{k}: ARCHITECTURE.md has no section {s}")
        d = it.get("design")
        if d not in DESIGN_STATES:
            errors.append(f"{k}: design must be one of {sorted(DESIGN_STATES)}, not {d!r}")
        if it.get("ui") and d == "none":
            errors.append(f"{k}: has UI but design is 'none'")
        if not it.get("ui") and d not in ("none", None) and not it.get("boards"):
            warnings.append(f"{k}: no UI, yet design is {d!r}")
        if d == "todo":
            if it.get("notes"):
                warnings.append(f"{k}: UI not drawn yet ({it['notes']})")
            else:
                errors.append(f"{k}: UI with no board and no note saying why")
        if d in ("planned", "picked") and not it.get("boards"):
            errors.append(f"{k}: design is {d!r} but no board is listed")
        for b in it.get("boards", []):
            proj = projects.get(b.get("project"))
            if not proj:
                errors.append(f"{k}: board project {b.get('project')!r} is not in claude_design")
                continue
            path = ROOT / proj["dir"] / b.get("file", "")
            if not path.is_file():
                errors.append(f"{k}: board file {proj['dir']}/{b.get('file')} is not in the repo mirror")
            elif b.get("file") not in mirror.get(b["project"], {}).get("files", {}):
                errors.append(f"{k}: {b.get('file')} is not recorded in docs/design/claude-design.json")

    # Every key the docs cite is traced.
    keys = known_keys(trace)
    for doc in CITING:
        if not doc.exists():
            continue
        for n in sorted({int(x) for x in KEY.findall(doc.read_text())}):
            if f"MA-{n}" not in keys:
                errors.append(f"{doc.relative_to(ROOT)} cites MA-{n}, which is not in the trace")

    # The mirror matches what is on disk.
    for proj_key, proj in projects.items():
        for name, meta in mirror.get(proj_key, {}).get("files", {}).items():
            path = ROOT / proj["dir"] / name
            if not path.is_file():
                errors.append(f"mirror: {proj['dir']}/{name} is recorded but missing")
            elif meta.get("bytes") is not None and path.stat().st_size != meta["bytes"]:
                errors.append(f"mirror: {proj['dir']}/{name} is {path.stat().st_size} bytes, recorded {meta['bytes']}; copy it again")

    # The rendered table is current.
    if not TRACE_MD.exists() or TRACE_MD.read_text() != render(trace):
        errors.append("docs/TRACE.md is out of date: run `python3 scripts/plan_sync.py render`")
    return errors, warnings


def render(trace: dict) -> str:
    sections = arch_sections()
    items = trace.get("items", [])
    out = [
        "# Trace: phase, story, architecture, design",
        "",
        "Generated from `docs/trace.json` by `python3 scripts/plan_sync.py render`; do not edit by hand.",
        "The rules are in `.claude/rules/plan-sync.md`.",
        "",
        "| Design | Meaning |",
        "| --- | --- |",
        "| picked | Arun picked it; the board is the spec |",
        "| planned | Drawn; put through design-first's options round when the story starts |",
        "| todo | Has UI, not drawn yet |",
        "| none | No UI |",
        "",
    ]
    for p in sorted(trace.get("phases", []), key=lambda p: p["phase"]):
        rows = sorted((i for i in items if i.get("epic") == p["epic"]), key=lambda i: int(i["key"].split("-")[1]))
        out += [f"## Phase {p['phase']}: {p['title']} ({p['epic']})", ""]
        if not rows:
            out += ["No stories yet.", ""]
            continue
        out += ["| Key | Summary | Status | Architecture | Design | Boards |", "| --- | --- | --- | --- | --- | --- |"]
        for i in rows:
            arch = ", ".join(f"§{s}" for s in i.get("arch", []) if s in sections) or ""
            boards = "; ".join(f"{b['file']}: {b['board']}" for b in i.get("boards", []))
            summary = i.get("summary", "").replace("|", "/")
            out.append(f"| {i['key']} | {summary} | {i.get('status', '')} | {arch} | {i.get('design', '')} | {boards} |")
        out.append("")
    return "\n".join(out)


def start(trace: dict, key: str) -> int:
    it = next((i for i in trace.get("items", []) if i["key"] == key), None)
    if not it:
        print(f"{key} is not in docs/trace.json. Run /plan-sync before starting it.")
        return 1
    sections = arch_sections()
    print(f"{key}: {it.get('summary', '')}")
    print(f"  phase {it.get('phase')} ({it.get('epic')}), {it.get('type')}, {it.get('status')}")
    for s in it.get("arch", []):
        print(f"  ARCHITECTURE.md §{s} {sections.get(s, '(missing)')}")
    for b in it.get("boards", []):
        print(f"  board: {b['file']} · {b['board']}")
    d = it.get("design")
    if it.get("ui") and d == "todo":
        print("  STOP: this story has UI and no board. Design it first (/design-first), then record the board in the trace.")
        return 1
    if it.get("ui") and d == "planned":
        print("  Next: run /design-first on these boards (2 or 3 options, Arun picks), then set design to 'picked'.")
    if it.get("ui") and d == "picked":
        print("  The picked boards are the spec. Build them as drawn; change the boards first if the build must differ.")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("check", "render", "start"):
        print(__doc__)
        return 2
    trace = load(TRACE)
    if argv[1] == "render":
        TRACE_MD.write_text(render(trace))
        print(f"wrote {TRACE_MD.relative_to(ROOT)}")
        return 0
    if argv[1] == "start":
        return start(trace, argv[2]) if len(argv) > 2 else 2
    errors, warnings = check(trace)
    for w in warnings:
        print(f"note: {w}")
    for e in errors:
        print(f"DRIFT: {e}")
    print(f"plan-sync: {len(trace.get('items', []))} items, {len(errors)} drift, {len(warnings)} notes")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
