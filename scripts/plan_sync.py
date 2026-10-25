#!/usr/bin/env python3
"""Keep the plan, the designs and Jira in step (MA-155).

The repo-side half of the plan-sync check. It reads docs/trace.json (the
schema is in .claude/skills/plan-sync/reference/trace-schema.md) against
ARCHITECTURE.md, PLAN.md, the other docs and the Claude Design mirror. The
Jira and Claude Design halves need their MCP tools and live in /plan-sync.

    python3 scripts/plan_sync.py check         # fail on drift (a jira-flow gate and a CI job)
    python3 scripts/plan_sync.py render        # rewrite docs/TRACE.md from the trace
    python3 scripts/plan_sync.py start MA-149  # what a story needs before work starts
    python3 scripts/plan_sync.py selftest      # the board-name check against known good and bad names (CI)
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


_captions: dict[Path, set[str]] = {}
DOORS = r"Mini App|Browser|Telegram"


BOARD_MARKERS = {"anchor", "keys", "arch", "intro", "notes", "desc", "frames", "msgs", "phones", "screens"}


def _caption(s: str) -> str | None:
    """A caption's text, or None when it is not one. Markup is dropped; a template is allowed only as a
    trailing theme suffix ('Holdings · {{ t.label }}' -> 'Holdings'), and a label ending in ':' is not a title."""
    s = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()
    if "{{" in s:
        m = re.match(r"^(.*?\S)\s*(?:·\s*)?(?:\{\{[^}]*\}\}\s*)+$", s)
        if not m or "{{" in m.group(1):
            return None
        s = m.group(1)
    s = s.strip(" ·")
    return s if re.search(r"\w", s) and not s.endswith(":") else None


def captions(path: Path) -> set[str]:
    """The board titles a canvas defines, exactly: its captions and board names, and each numbered board
    as '<number> · <name>' with the number from the same board ('1 · Portfolio card', never '4 · ...')."""
    if path not in _captions:
        t = html.unescape(path.read_text(errors="replace"))
        caps, option_ids = set(), set()

        def pair(n: str, name: str, option: bool = False) -> None:
            """A numbered board: its name, and the name after its own number, unless the name already starts with it."""
            n, name = (n or "").strip(), (name or "").strip()
            if n and name and len(n) <= 6:
                if option:
                    option_ids.add(n)
                caps.add(name)
                if not re.match(rf"^{re.escape(n)}\b", name):
                    caps.update({f"{n} · {name}", f"{n} {name}"})

        for cls in ("dv-cap", "dv-sname", "dv-oname", "dv-tname"):
            for m in re.finditer(rf'class="{cls}"[^>]*>(.*?)</(?:p|span|div|a)>', t, re.S):
                caps.add(_caption(m.group(1)))
        for m in re.finditer(r'data-screen-label="([^"]*)"', t):
            caps.add(_caption(m.group(1)))
        # A numbered board heading: <a class="dv-tid">1</a><span class="dv-tname">Colour</span> (or dv-oid, dv-oname).
        for m in re.finditer(r'class="dv-(t|o)id"[^>]*>(.*?)</(?:a|span)>\s*<span class="dv-\1name"[^>]*>(.*?)</span>', t, re.S):
            pair(_caption(m.group(2)), _caption(m.group(3)))
        # The canvas's own index of boards: <a href="#colour">1 · Colour</a>.
        for m in re.finditer(r'<nav class="dv-idx"[^>]*>(.*?)</nav>', t, re.S):
            caps.update(_caption(x) for x in re.findall(r"<a [^>]*>(.*?)</a>", m.group(1), re.S))
        # Boards listed as data. Only an object that is a board (it has one of a board's own fields: anchor,
        # keys, notes, intro, ...) gives its cap, name, or number and name: { id: '1', anchor: 'k1', name: ... }.
        lit = r"'((?:[^'\\\n]|\\.)*)'"
        # The field a board's number comes from is the one the canvas prints in its number chip,
        # <a class="dv-oid">{{ g.tag }}</a>; a hidden id is only an anchor. No chip, no numbered titles.
        shown = set(re.findall(r'class="dv-(?:o|t)id"[^>]*>\s*\{\{\s*\w+\.(\w+)\s*\}\}', t))
        for m in re.finditer(r"\{([^{}\[\]]{0,800})", t):
            head = m.group(1)
            if not BOARD_MARKERS & set(re.findall(r"\b(\w+)\s*:", head)):
                continue
            fields = {k: v.replace("\\'", "'") for k, v in re.findall(rf"\b(id|tag|tid|name|cap|board)\s*:\s*{lit}", head)}
            if "board" in fields:  # the object's title is its board field; its name is something else (a holding)
                continue
            caps.update(fields.get(k) for k in ("cap", "name"))
            for f in shown & set(fields):
                pair(fields[f], fields.get("name"), option=True)
        for m in re.finditer(rf"\b\w+\(\s*'([^'\n]{{1,6}})'\s*,\s*\{{\s*name\s*:\s*{lit}", t):  # make('1c', { name: 'Watcher' })
            pair(m.group(1), m.group(2).replace("\\'", "'"), option=True)
        # A board field names a board wherever it is: board: 'Browser · Holding · Forecast'.
        caps.update(m.group(1) for m in re.finditer(rf"\bboard\s*:\s*{lit}", t))
        # A title built from an option's number: data-screen-label="{{ o.id }} Telegram avatar {{ t.label }}",
        # expanded only with the numbers of the options the canvas lists (1a, 1b, 1c), never its section numbers.
        for m in re.finditer(r'data-screen-label="\{\{\s*\w+\.id\s*\}\}([^"]*)"', t):
            rest = _caption(m.group(1))
            if rest:
                caps.update(f"{n} {rest}" for n in option_ids)
        # A board title kept in a constant: const B1 = 'Telegram · Currency check'.
        caps.update(m.group(1) for m in re.finditer(rf"\b\w+\s*=\s*'((?:{DOORS}) · [^'\\\n]+)'", t))
        # Script fragments are not titles: "' + w.label.replace(/", " + lapScr.name : ".
        code = re.compile(r"['\"]\s*\+|\+\s*['\"]|\+\s*\w+\.\w|\.replace\(|\?\s*\w+\.\w")
        # A caption paragraph is prose, not a title: a title is short and has no sentence in it.
        _captions[path] = {c for c in caps if c and re.search(r"\w", c) and not code.search(c) and len(c) <= 100 and ". " not in c}
    return _captions[path]


def door(file: str) -> str | None:
    """The door a whole file draws for ('Mini App.dc.html' -> 'Mini App'), when its name says so."""
    m = re.match(rf"^({DOORS})\b", file)
    return m.group(1) if m else None


def board_ok(board: str, file: str, path: Path) -> bool:
    """A board name is exactly one of its canvas's titles, or the door the file draws followed by one
    ('Mini App · Holdings' in Mini App.dc.html, whose board is captioned 'Holdings')."""
    caps = captions(path)
    if board in caps:
        return True
    m = re.match(rf"^({DOORS}) · (.+)$", board)
    return bool(m and door(file) == m.group(1) and m.group(2) in caps and not re.search(rf"\b({DOORS}) · ", m.group(2)))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def item_findings(it: dict, ctx: dict) -> tuple[list[str], list[str]]:
    """What is wrong with one trace row (errors), and what it still waits on (warnings)."""
    errors, warnings = [], []
    k = it.get("key") if isinstance(it.get("key"), str) else "?"
    for field in ("key", "summary", "status", "type", "epic", "design"):
        if not isinstance(it.get(field), str) or not it.get(field):
            errors.append(f"{k}: {field} is required and must be text")
            return errors, warnings
    if not isinstance(it.get("ui"), bool) or not isinstance(it.get("phase"), int) or isinstance(it.get("phase"), bool):
        errors.append(f"{k}: ui must be true or false and phase a number")
        return errors, warnings
    if it.get("notes") is not None and not isinstance(it.get("notes"), str):
        errors.append(f"{k}: notes must be text")
        return errors, warnings
    for field, kind in (("arch", str), ("labels", str), ("boards", dict), ("open", str), ("undrawn", str)):
        val = it.get(field, [])
        if not isinstance(val, list) or not all(isinstance(x, kind) for x in val):
            errors.append(f"{k}: {field} must be a list of {kind.__name__}s")
            return errors, warnings
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
        if status in ("In Review", "Done"):
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
        if it.get(field):
            warnings.append(f"{k}: {what}: {'; '.join(it[field])}")
    if it.get("undrawn") and not ui:
        errors.append(f"{k}: lists undrawn screens but has no UI")
    if it.get("open") and status in ("In Review", "Done"):
        errors.append(f"{k}: {status} with open questions ({'; '.join(it['open'])}); settle them and clear open first")
    if it.get("undrawn") and status in ("In Review", "Done"):
        errors.append(f"{k}: {status} with screens still undrawn ({'; '.join(it['undrawn'])}); draw them and clear undrawn first")
    for b in it.get("boards", []):
        if not isinstance(b.get("project"), str):
            errors.append(f"{k}: board {b!r} needs a project from claude_design")
            continue
        proj = ctx["projects"].get(b["project"])
        if not proj or not isinstance(proj.get("dir"), str) or not isinstance(b.get("file"), str) or not isinstance(b.get("board"), str):
            errors.append(f"{k}: board {b!r} needs a project from claude_design (with a dir), a file and a board name")
            continue
        path = ROOT / proj["dir"] / b["file"]
        if not path.is_file():
            errors.append(f"{k}: board file {proj['dir']}/{b['file']} is not in the repo mirror")
            continue
        meta = ctx["mirror"].get(b["project"], {}).get("files", {}).get(b["file"])
        if meta is None:
            errors.append(f"{k}: {b['file']} is not recorded in docs/design/claude-design.json")
        elif (meta.get("bytes") is not None and path.stat().st_size != meta["bytes"]) or (meta.get("sha256") and sha256(path) != meta["sha256"]):
            errors.append(f"{k}: {proj['dir']}/{b['file']} differs from the copy recorded in claude-design.json; copy it again")
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


def shape_errors(trace: dict) -> list[str]:
    """The trace's own shape: lists of objects where objects belong. Every other check assumes it."""
    errors = []
    if not isinstance(trace, dict):
        return ["docs/trace.json must hold an object"]
    for field in ("phases", "items", "others"):
        val = trace.get(field, [])
        if not isinstance(val, list):
            errors.append(f"{field} must be a list")
        else:
            errors += [f"{field}: an entry is not an object: {str(x)[:80]}" for x in val if not isinstance(x, dict)]
    if not isinstance(trace.get("claude_design", {}), dict):
        errors.append("claude_design must be an object")
    for p in trace.get("phases", []) if isinstance(trace.get("phases"), list) else []:
        if isinstance(p, dict) and not (isinstance(p.get("phase"), int) and all(isinstance(p.get(f), str) for f in ("epic", "title", "plan_heading"))):
            errors.append(f"phases: {str(p)[:80]} needs a number and text epic, title and plan_heading")
    for o in trace.get("others", []) if isinstance(trace.get("others"), list) else []:
        if isinstance(o, dict) and not isinstance(o.get("key"), str):
            errors.append(f"others: {str(o)[:80]} needs a text key")
    return errors


def check(trace: dict) -> tuple[list[str], list[str]]:
    errors, warnings = shape_errors(trace), []
    if errors:
        return errors, warnings
    ctx = context(trace)
    plan_lines = set(PLAN.read_text().splitlines())
    by_phase = {p.get("phase"): p for p in trace.get("phases", [])}

    # Phases: every PLAN.md phase heading has an entry, and every entry's heading exists.
    for line in plan_lines:
        m = re.match(r"^## Phase (\d+)\b", line)
        if m and int(m.group(1)) not in by_phase:
            errors.append(f"PLAN.md has '{line}' but the trace has no phase {m.group(1)}")
    numbers = [p.get("phase") for p in trace.get("phases", [])]
    for n in sorted({n for n in numbers if numbers.count(n) > 1}, key=str):
        errors.append(f"phase {n} is listed twice in the trace")
    plan_numbers = [int(m.group(1)) for line in PLAN.read_text().splitlines() if (m := re.match(r"^## Phase (\d+)\b", line))]
    for n in sorted({n for n in plan_numbers if plan_numbers.count(n) > 1}):
        errors.append(f"PLAN.md has two '## Phase {n}' headings")
    for p in trace.get("phases", []):
        for field in ("epic", "title"):
            if not p.get(field):
                errors.append(f"phase {p.get('phase')}: no {field}")
        if p.get("plan_heading") not in plan_lines:
            errors.append(f"phase {p.get('phase')} ({p.get('epic')}): heading not in PLAN.md: {p.get('plan_heading')!r}")

    # Items, and the rows outside the phases.
    seen = set()
    for it in trace.get("items", []):
        k = it.get("key")
        if not isinstance(k, str) or not k:
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
        if not isinstance(proj, dict) or not isinstance(proj.get("dir"), str):
            errors.append(f"claude_design.{proj_key} needs a dir")
            continue
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
    for p in sorted(trace.get("phases", []), key=lambda p: (str(type(p.get("phase"))), p.get("phase") or 0)):
        rows = sorted((i for i in items if i.get("epic") == p["epic"]), key=lambda i: key_order(i.get("key", "")))
        out += [f"## Phase {p.get('phase')}: {p.get('title', '')} ({p.get('epic', '')})", ""]
        if not rows:
            out += ["No stories yet.", ""]
            continue
        out += ["| Key | Summary | Status | Architecture | Design | Boards |", "| --- | --- | --- | --- | --- | --- |"]
        for i in rows:
            arch = ", ".join(f"§{s}" for s in (i.get("arch") if isinstance(i.get("arch"), list) else []) if s in sections) or ""
            boards = "; ".join(f"{b.get('file', '?')}: {b.get('board', '?')}" for b in (i.get("boards") if isinstance(i.get("boards"), list) else []) if isinstance(b, dict))
            summary = str(i.get("summary") or "").replace("|", "/")
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


# Board names the check must accept (True) or refuse (False), from the reviews of PR #32.
BOARD_CASES = [
    ("ds", "Telegram kit.dc.html", "1 · Portfolio card", True), ("ds", "Telegram kit.dc.html", "2 · Stance card", True),
    ("ds", "Telegram kit.dc.html", "4 · Portfolio card", False), ("ds", "Telegram kit.dc.html", "1 · Stance card", False),
    ("ds", "Telegram kit.dc.html", "2 · S", False), ("ds", "Telegram kit.dc.html", "Light", False),
    ("ds", "Logo.dc.html", "1c Telegram avatar", True), ("ds", "Logo.dc.html", "1c · Watcher", True),
    ("ds", "Foundations.dc.html", "1 · Colour", True),
    ("app", "Mini App.dc.html", "Mini App · Overview · scrolled", True), ("app", "Mini App.dc.html", "Mini App · Track record", True),
    ("app", "Mini App.dc.html", "Browser · Holdings", False), ("app", "Browser 2.dc.html", "Mini App · Login", False),
    ("app", "Currency check.dc.html", "Telegram · Currency check", True), ("app", "Currency check.dc.html", "Browser · Confirm", False),
    ("app", "Currency check.dc.html", "Every holding has one currency", False),
    ("app", "Admin center 2.dc.html", "Browser · Admin · Settings", True), ("app", "Admin center 2.dc.html", "Prod", False),
    ("app", "Telegram admin.dc.html", " ", False), ("app", "Telegram admin.dc.html", " · ", False), ("app", "Telegram admin.dc.html", "Note:", False),
    ("app", "Telegram chats.dc.html", "Telegram chats:", False),
    ("app", "India.dc.html", "Mini App · Overview with India", True), ("app", "India.dc.html", "Demat account", False),
    ("app", "India.dc.html", "MF folio · Fund house A", False),
    ("app", "Forecast.dc.html", "Browser · Forecaster · Proof", True), ("app", "Forecast.dc.html", "Balanced", False),
    ("app", "Forecast.dc.html", "f2 Balanced", False), ("app", "Forecast.dc.html", "NASDAQ 100 ETF", False),
    ("ds", "Logo.dc.html", "1a Telegram avatar", True), ("ds", "Logo.dc.html", "1 Telegram avatar", False),
    ("ds", "Logo.dc.html", "1 sign-in", False), ("ds", "Logo.dc.html", "1 intro", False),
    ("app", "Prototype.dc.html", "' + w.label.replace(/", False), ("app", "Prototype.dc.html", " + lapScr.name : ", False),
    ("app", "Telegram admin.dc.html", "Telegram · Approval request", True),
    ("app", "Telegram admin.dc.html", "Telegram · Telegram · Approval request", False),
    ("app", "Admin center.dc.html", "B · B · Sessions first", False),
    ("app", "Admin center 2.dc.html", "sp1 · Browser · Admin · Spend · Move the ceiling, the fresh check", False),
    ("app", "Audit and files.dc.html", "F1 · Browser · Audit with files", True),
    ("app", "India.dc.html", "in-b2 · Browser · Holding · Indian fund", False),
    ("app", "Mini App.dc.html", "why · Why? sheet", False),
    ("app", "India.dc.html", "B · Browser · Holding · Indian fund", True),
    ("app", "Admin center 2.dc.html", "AL.1 · Browser · Admin · Alerts · Replay, the fresh check", True),
    ("app", "Telegram admin.dc.html", "Telegram · a Telegram · Approval request", False),
    ("app", "Browser 2.dc.html", "Browser · B5 Browser · Activity", False),
]


def selftest(trace: dict) -> int:
    dirs = {k: v.get("dir") for k, v in trace.get("claude_design", {}).items()}
    bad = 0
    for proj, file, board, want in BOARD_CASES:
        got = board_ok(board, file, ROOT / dirs[proj] / file)
        if got != want:
            bad += 1
            print(f"FAIL: {board!r} in {file}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    print(f"plan-sync selftest: {len(BOARD_CASES)} board names, {bad} wrong")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("check", "render", "start", "selftest"):
        print(__doc__)
        return 2
    trace = load(TRACE)
    if argv[1] in ("render", "start") and (bad := shape_errors(trace)):
        for e in bad:
            print(f"DRIFT: {e}")
        return 1
    if argv[1] == "render":
        TRACE_MD.write_text(render(trace))
        print(f"wrote {TRACE_MD.relative_to(ROOT)}")
        return 0
    if argv[1] == "selftest":
        return selftest(trace)
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
