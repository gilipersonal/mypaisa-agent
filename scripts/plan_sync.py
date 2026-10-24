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

import hashlib
import html
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
STARTED = {"In Progress", "In Review", "Done"}


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
    keys = {i.get("key") for i in trace.get("items", [])}
    keys |= {p.get("epic") for p in trace.get("phases", [])}
    keys |= {o.get("key") for o in trace.get("others", [])}
    return keys - {None}


_captions: dict[Path, tuple[set[str], set[str]]] = {}
CAPTION_KEYS = r"name|board|cap|title|label|tname|h|lab"
ID_KEYS = r"id|oid|tag|num|n"


def _plain(s: str) -> str:
    """Caption text with its markup and template parts removed: 'Holdings · {{ t.label }}' -> 'Holdings'."""
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\{\{[^}]*\}\}", " ", s)
    return re.sub(r"\s+", " ", s).strip(" ·")


def captions(path: Path) -> tuple[set[str], set[str]]:
    """The board captions a canvas defines, and the board ids it numbers them with."""
    if path not in _captions:
        t = html.unescape(path.read_text(errors="replace"))
        caps, ids = set(), set()
        for q in ("'", '"'):
            for m in re.finditer(rf"\b(?:{CAPTION_KEYS})\s*:\s*{q}((?:[^{q}\\]|\\.)*){q}", t):
                caps.add(m.group(1).replace("\\" + q, q))
            for m in re.finditer(rf"\b(?:{ID_KEYS})\s*:\s*{q}([^{q}]{{1,6}}){q}", t):
                ids.add(m.group(1))
        for cls in ("dv-cap", "dv-sname", "dv-oname", "dv-tname"):
            for m in re.finditer(rf'class="{cls}"[^>]*>(.*?)</(?:p|span|div|a)>', t, re.S):
                caps.add(_plain(m.group(1)))
        for m in re.finditer(r'class="dv-(?:oid|tid)"[^>]*>(.*?)</(?:a|span)>', t, re.S):
            ids.add(_plain(m.group(1)))
        for m in re.finditer(r'<a href="#[^"]*">(.*?)</a>', t, re.S):
            caps.add(_plain(m.group(1)))
        for m in re.finditer(r"\b\w+\s*=\s*'([^'\\\n]{3,120})'", t):
            caps.add(m.group(1))
        for m in re.finditer(r'data-screen-label="([^"]*)"', t):
            caps.add(_plain(m.group(1)))
        _captions[path] = (caps - {""}, ids - {""})
    return _captions[path]


def door(file: str) -> str | None:
    """The door a whole file draws for ('Mini App.dc.html' -> 'Mini App'), when its name says so."""
    m = re.match(r"^(Mini App|Browser|Telegram)\b", file)
    return m.group(1) if m else None


def board_ok(board: str, file: str, path: Path) -> bool:
    """A board name is one of its canvas's captions, optionally after the board's own number
    ('1 · Portfolio card', '1c Telegram avatar') or the door the file draws ('Mini App · Holdings')."""
    caps, ids = captions(path)
    if board in caps:
        return True
    m = re.match(r"^(Mini App|Browser|Telegram) · (.+)$", board)
    if m and door(file) == m.group(1) and m.group(2) in caps:
        return True
    m = re.match(r"^(\S{1,6}?)(?: ·)? (.+)$", board)
    return bool(m and m.group(1) in ids and (m.group(2) in caps or any(c.startswith(m.group(2)) for c in caps)))


def item_findings(it: dict, ctx: dict) -> tuple[list[str], list[str]]:
    """What is wrong with one trace row (errors), and what it still waits on (warnings)."""
    errors, warnings = [], []
    k = it.get("key") or "?"
    ph = ctx["phases"].get(it.get("epic"))
    if not ph:
        errors.append(f"{k}: epic {it.get('epic')} is not a phase epic")
    elif ph.get("phase") != it.get("phase"):
        errors.append(f"{k}: phase {it.get('phase')} but its epic {it.get('epic')} is phase {ph.get('phase')}")
    for s in it.get("arch", []):
        if s not in ctx["sections"]:
            errors.append(f"{k}: ARCHITECTURE.md has no section {s}")
    d, ui, status = it.get("design"), bool(it.get("ui")), it.get("status")
    if d not in DESIGN_STATES:
        errors.append(f"{k}: design must be one of {sorted(DESIGN_STATES)}, not {d!r}")
    if ui and d == "none":
        errors.append(f"{k}: has UI but design is 'none'")
    if not ui and d not in ("none", None):
        errors.append(f"{k}: no UI, yet design is {d!r}")
    if ui != ("design" in it.get("labels", [])):
        errors.append(f"{k}: ui is {ui} but the 'design' label is {'missing' if ui else 'set'}; the label marks every story with UI (.claude/jira/taxonomy.md)")
    if d == "todo":
        if status in STARTED:
            errors.append(f"{k}: {status} with UI and no board; draw it first (/design-first)")
        elif it.get("notes"):
            warnings.append(f"{k}: UI not drawn yet ({it['notes']})")
        else:
            errors.append(f"{k}: UI with no board and no note saying why")
    if d == "planned" and status in ("In Review", "Done"):
        errors.append(f"{k}: {status} with boards still 'planned'; Arun picks before code is written (rule 3)")
    if d in ("planned", "picked") and not it.get("boards"):
        errors.append(f"{k}: design is {d!r} but no board is listed")
    for field, what in (("open", "open, must be settled before it starts"), ("undrawn", "screens still to draw before it starts")):
        val = it.get(field, [])
        if not isinstance(val, list) or not all(isinstance(q, str) and q for q in val):
            errors.append(f"{k}: {field} must be a list of strings")
        elif val:
            warnings.append(f"{k}: {what}: {'; '.join(val)}")
    if it.get("undrawn") and not ui:
        errors.append(f"{k}: lists undrawn screens but has no UI")
    for b in it.get("boards", []):
        proj = ctx["projects"].get(b.get("project"))
        if not proj or not b.get("file"):
            errors.append(f"{k}: board {b!r} needs a project from claude_design and a file")
            continue
        path = ROOT / proj["dir"] / b["file"]
        if not path.is_file():
            errors.append(f"{k}: board file {proj['dir']}/{b['file']} is not in the repo mirror")
            continue
        if b["file"] not in ctx["mirror"].get(b["project"], {}).get("files", {}):
            errors.append(f"{k}: {b['file']} is not recorded in docs/design/claude-design.json")
        if not b.get("board") or not board_ok(b["board"], b["file"], path):
            errors.append(f"{k}: no board captioned {b.get('board')!r} in {proj['dir']}/{b['file']}")
    return errors, warnings


def context(trace: dict) -> dict:
    return {
        "sections": arch_sections(),
        "phases": {p.get("epic"): p for p in trace.get("phases", [])},
        "projects": trace.get("claude_design", {}),
        "mirror": load(MIRROR) if MIRROR.exists() else {},
    }


def key_order(key: str) -> tuple[int, str]:
    m = KEY.fullmatch(key or "")
    return (int(m.group(1)), "") if m else (10**9, key or "")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(trace: dict) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    ctx = context(trace)
    plan_lines = set(PLAN.read_text().splitlines())
    by_phase = {p.get("phase"): p for p in trace.get("phases", [])}

    # Phases: every PLAN.md phase heading has an entry, and every entry's heading exists.
    for line in plan_lines:
        m = re.match(r"^## Phase (\d+)\b", line)
        if m and int(m.group(1)) not in by_phase:
            errors.append(f"PLAN.md has '{line}' but the trace has no phase {m.group(1)}")
    for p in trace.get("phases", []):
        if not p.get("epic"):
            errors.append(f"phase {p.get('phase')}: no epic")
        if p.get("plan_heading") not in plan_lines:
            errors.append(f"phase {p.get('phase')} ({p.get('epic')}): heading not in PLAN.md: {p.get('plan_heading')!r}")

    # Items, and the rows outside the phases.
    seen = set()
    for it in trace.get("items", []):
        k = it.get("key")
        if not k:
            errors.append(f"an item has no key: {str(it)[:80]}")
            continue
        if k in seen:
            errors.append(f"{k}: listed twice")
        seen.add(k)
        e, w = item_findings(it, ctx)
        errors += e
        warnings += w
    for o in trace.get("others", []):
        if not o.get("key"):
            errors.append(f"an entry in others has no key: {str(o)[:80]}")
        elif o["key"] in seen:
            errors.append(f"{o['key']}: in both items and others")

    # Every key the docs cite is traced.
    keys = known_keys(trace)
    for doc in CITING:
        if not doc.exists():
            continue
        for n in sorted({int(x) for x in KEY.findall(doc.read_text())}):
            if f"MA-{n}" not in keys:
                errors.append(f"{doc.relative_to(ROOT)} cites MA-{n}, which is not in the trace")

    # The mirror matches what is on disk, and nothing on disk is unrecorded.
    for proj_key, proj in ctx["projects"].items():
        recorded = ctx["mirror"].get(proj_key, {}).get("files", {})
        base = ROOT / proj["dir"]
        if base.is_dir():
            for f in sorted(base.rglob("*")):
                rel = f.relative_to(base).as_posix()
                if f.is_file() and rel not in recorded:
                    errors.append(f"mirror: {proj['dir']}/{rel} is not recorded in docs/design/claude-design.json")
        for name, meta in recorded.items():
            path = base / name
            if not path.is_file():
                errors.append(f"mirror: {proj['dir']}/{name} is recorded but missing")
            elif meta.get("bytes") is not None and path.stat().st_size != meta["bytes"]:
                errors.append(f"mirror: {proj['dir']}/{name} is {path.stat().st_size} bytes, recorded {meta['bytes']}; copy it again")
            elif meta.get("sha256") and sha256(path) != meta["sha256"]:
                errors.append(f"mirror: {proj['dir']}/{name} differs from the copy recorded in claude-design.json; copy it again")

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
        rows = sorted((i for i in items if i.get("epic") == p["epic"]), key=lambda i: key_order(i.get("key", "")))
        out += [f"## Phase {p['phase']}: {p['title']} ({p['epic']})", ""]
        if not rows:
            out += ["No stories yet.", ""]
            continue
        out += ["| Key | Summary | Status | Architecture | Design | Boards |", "| --- | --- | --- | --- | --- | --- |"]
        for i in rows:
            arch = ", ".join(f"§{s}" for s in i.get("arch", []) if s in sections) or ""
            boards = "; ".join(f"{b.get('file', '?')}: {b.get('board', '?')}" for b in i.get("boards", []))
            summary = i.get("summary", "").replace("|", "/")
            out.append(f"| {i.get('key', '?')} | {summary} | {i.get('status', '')} | {arch} | {i.get('design', '')} | {boards} |")
        out.append("")
    return "\n".join(out)


def start(trace: dict, key: str) -> int:
    it = next((i for i in trace.get("items", []) if i.get("key") == key), None)
    if not it:
        other = next((o for o in trace.get("others", []) if o.get("key") == key), None)
        if other:
            print(f"{key}: {other.get('summary', '')}")
            print(f"  outside the phases ({other.get('notes', '')}); no sections or boards to check.")
            return 0
        print(f"{key} is not in docs/trace.json. Run /plan-sync before starting it.")
        return 1
    ctx = context(trace)
    print(f"{key}: {it.get('summary', '')}")
    print(f"  phase {it.get('phase')} ({it.get('epic')}), {it.get('type')}, {it.get('status')}")
    for s in it.get("arch", []):
        print(f"  ARCHITECTURE.md §{s} {ctx['sections'].get(s, '(missing)')}")
    for b in it.get("boards", []):
        print(f"  board: {b.get('file')} · {b.get('board')}")
    if it.get("notes"):
        print(f"  notes: {it['notes']}")
    errors, _ = item_findings(it, ctx)
    for e in errors:
        print(f"  DRIFT: {e}")
    if errors:
        print("  STOP: fix the row (or the doc, the board or Jira it disagrees with) before the story starts.")
        return 1
    if it.get("open"):
        for q in it["open"]:
            print(f"  open: {q}")
        print("  STOP: settle the open questions with Arun, change the boards, docs and Jira to match, then clear them from the trace.")
        return 1
    if it.get("undrawn"):
        for q in it["undrawn"]:
            print(f"  undrawn: {q}")
        print("  STOP: draw these screens first (/design-first), add their boards to the row, then clear undrawn.")
        return 1
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
        if len(argv) < 3:
            print("usage: python3 scripts/plan_sync.py start MA-<n>")
            return 2
        return start(trace, argv[2])
    errors, warnings = check(trace)
    for w in warnings:
        print(f"note: {w}")
    for e in errors:
        print(f"DRIFT: {e}")
    print(f"plan-sync: {len(trace.get('items', []))} items, {len(errors)} drift, {len(warnings)} notes")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
