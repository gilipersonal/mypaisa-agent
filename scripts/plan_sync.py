#!/usr/bin/env python3
"""Keep the plan, the designs, Jira, Confluence and the code in step (MA-155, MA-228).

The repo-side half of the plan-sync check. It reads docs/trace.json (the
schema is in .claude/skills/plan-sync/reference/trace-schema.md) against
ARCHITECTURE.md, PLAN.md, the other docs, the boards the trace cites in
docs/design/ (their files and board names; git is their record since MA-296), the roadmap
(scripts/roadmap.py), the Confluence pages rendered from them
(scripts/confluence_docs.py) and the code each story names. The Jira and live
Confluence halves need their MCP tools and live in /plan-sync.

    python3 scripts/plan_sync.py check         # fail on drift (a jira-flow gate and a CI job)
    python3 scripts/plan_sync.py render        # rewrite docs/TRACE.md from the trace
    python3 scripts/plan_sync.py start MA-149  # what a story needs before work starts
    python3 scripts/plan_sync.py selftest      # board names, pr-files and check on mutated records, and the hook's selftest (CI);
                                               # reused while its code and fixtures are unchanged (--force runs it)
    python3 scripts/plan_sync.py pr-files [--base origin/main] [--key MA-n]  # product files this branch changes that
                                               # another story, or no story, claims (CI: --base HEAD^1, the key from
                                               # GITHUB_HEAD_REF; no key there fails closed)
    python3 scripts/plan_sync.py jira-sync query|compare|record  # Jira read incrementally (docs/jira-sync.json; /plan-sync)

Since MA-303 (Arun, 2 Nov 2026: "All the 6 checks currently run on docs/design. Lets stop that"), the design checks on
the boards' content are stopped. Of the boards, check reads that each cited board file and its folder exist, and each
cited board's canvas titles to check its board name (Arun kept that check, 2 Nov 2026), nothing else; through
confluence_docs it also compares the board previews' age with the boards they show. The selftest's board-name cases read
snippets held here (BOARD_SNIPPETS), never the live boards, so editing a board cannot fail it.
"""
from __future__ import annotations

import contextlib
import datetime
import hashlib
import queue
import shutil
import subprocess
import tempfile
import html
import io
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
TRACE = ROOT / "docs" / "trace.json"
TRACE_MD = ROOT / "docs" / "TRACE.md"
ARCH = ROOT / "ARCHITECTURE.md"
PLAN = ROOT / "PLAN.md"
CITING = [ARCH, PLAN, ROOT / "TECH_STACK.md", ROOT / "README.md", ROOT / "docs" / "design" / "README.md"]
KEY = re.compile(r"\bMA-(\d+)\b")
DESIGN_STATES = {"none", "planned", "picked", "todo"}
# Never a board file: the Finder's folder settings (MA-260).
NOT_BOARDS = {".DS_Store"}
CODE_DIRS = ("web", "ios", "src", "infra")  # where product code lives; a file there should belong to a story's code


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
DOORS = r"Browser"


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
    """The board titles a canvas defines (canvas_titles), read once per file."""
    if path not in _captions:
        _captions[path] = canvas_titles(path.read_text(errors="replace"), path.name)
    return _captions[path]


def canvas_titles(text: str, file_name: str) -> set[str]:
    """The board titles a canvas's text defines, exactly: its captions and board names, and each numbered board
    as '<number> · <name>' with the number from the same board ('1 · Portfolio card', never '4 · ...'). `file_name` is
    the canvas's file, whose own name is never a title."""
    t = html.unescape(text)
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
        tag = t[t.rfind("<", 0, m.start()):t.find(">", m.end()) + 1]  # the label's own tag
        cls = re.search(r"""\bclass\s*=\s*(["'])(.*?)\1""", tag)
        if not (cls and "dv-turn" in cls.group(2).split()):  # a turn's label names the turn, not a board
            caps.add(_caption(m.group(1)))
    # A numbered board heading: <a class="dv-tid">1</a><span class="dv-tname">Colour</span> (or dv-oid, dv-oname).
    # The number is the chip's own text ([^<]*), so a chip quoted in prose earlier cannot swallow the page up to a label.
    for m in re.finditer(r'class="dv-(t|o)id"[^>]*>([^<]*)</(?:a|span)>\s*<span class="dv-\1name"[^>]*>(.*?)</span>', t, re.S):
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
    # Not titles: caption prose (long, or a sentence), a canvas's intro label, the canvas's own name.
    own = file_name.removesuffix(".dc.html")

    def title(c: str) -> bool:
        return (bool(re.search(r"\w", c)) and not code.search(c) and len(c) <= 100 and ". " not in c
                and not c.endswith(".") and not re.search(r":\s*intro$", c, re.I) and c != own)

    return {c for c in caps if c and title(c)}


def door(file: str) -> str | None:
    """The door a whole file draws for ('Mini App.dc.html' -> 'Mini App'), when its name says so."""
    m = re.match(rf"^({DOORS})\b", file)
    return m.group(1) if m else None


def board_ok(board: str, file: str, path: Path | None, caps: set[str] | None = None) -> bool:
    """A board name is exactly one of its canvas's titles, or the door the file draws followed by one
    ('Mini App · Holdings' in Mini App.dc.html, whose board is captioned 'Holdings'). The titles are read from `path`,
    or given (`caps`, the selftest's snippets)."""
    caps = captions(path) if caps is None else caps
    if board in caps:
        return True
    m = re.match(rf"^({DOORS}) · (.+)$", board)
    return bool(m and door(file) == m.group(1) and m.group(2) in caps and not re.search(rf"\b({DOORS}) · ", m.group(2)))


def code_errors(row: dict, k: str) -> list[str]:
    """Each code path a row names (an item, or a row in others, R1-a7) matches something in the repo."""
    code = row.get("code", [])
    if not isinstance(code, list) or not all(isinstance(c, str) for c in code):
        return [f"{k}: code must be a list of strs"]
    return [f"{k}: code path {c!r} matches nothing in the repo" for c in code
            if not c or c.startswith("/") or ".." in c or not any(ROOT.glob(c.rstrip("/")))]


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
    for field, kind in (("arch", str), ("labels", str), ("boards", dict), ("open", str), ("undrawn", str), ("code", str)):
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
    # The code: a story that reached review names the repo paths that build it, and each one exists (MA-228).
    errors += code_errors(it, k)
    if it.get("type") == "Story" and status in ("In Review", "Done") and "manual" not in it.get("labels", []) and not it.get("code"):
        errors.append(f"{k}: a Story {status} names no code; list the paths that build it in its code field")
    if it.get("open") and status in ("In Review", "Done"):
        errors.append(f"{k}: {status} with open questions ({'; '.join(it['open'])}); settle them, clear open and say Settled: in the notes first")
    if it.get("undrawn") and status in ("In Review", "Done"):
        errors.append(f"{k}: {status} with screens still undrawn ({'; '.join(it['undrawn'])}); draw them, clear undrawn and say Drawn: in the notes first")
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
            errors.append(f"{k}: board file {proj['dir']}/{b['file']} is not in the repo")
            continue
        if not b.get("board") or not board_ok(b["board"], b["file"], path):
            errors.append(f"{k}: no board captioned {b.get('board')!r} in {proj['dir']}/{b['file']}")
    return errors, warnings


def context(trace: dict) -> dict:
    return {
        "sections": arch_sections(),
        "phases": {p.get("epic"): p for p in trace.get("phases", [])},
        "projects": trace.get("claude_design", {}),
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
    else:
        for name, proj in trace.get("claude_design", {}).items():
            if not isinstance(proj, dict) or not isinstance(proj.get("dir"), str):
                errors.append(f"claude_design.{name} must be an object with a text dir")
    for p in trace.get("phases", []) if isinstance(trace.get("phases"), list) else []:
        if isinstance(p, dict) and not (isinstance(p.get("phase"), int) and all(isinstance(p.get(f), str) for f in ("epic", "title", "plan_heading"))):
            errors.append(f"phases: {str(p)[:80]} needs a number and text epic, title and plan_heading")
    for o in trace.get("others", []) if isinstance(trace.get("others"), list) else []:
        if isinstance(o, dict) and not isinstance(o.get("key"), str):
            errors.append(f"others: {str(o)[:80]} needs a text key")
    return errors


def board_files(projects: dict, root: Path = ROOT) -> tuple[list[Path], list[str]]:
    """Every board page in the folders docs/trace.json's claude_design names (the key's name is history: the boards
    have been drawn in the repo since MA-260, and git has been their only record since MA-296). Fails closed: a
    project with no dir, or a dir that is not a folder in the repo, is drift, never a skip."""
    files, errors = [], []
    for proj_key, proj in projects.items():
        if not isinstance(proj, dict) or not isinstance(proj.get("dir"), str):
            errors.append(f"claude_design.{proj_key} needs a dir")
            continue
        base = root / proj["dir"]
        if not base.is_dir():
            errors.append(f"boards: docs/trace.json's claude_design names {proj_key}, whose folder {proj['dir']} is not in the repo")
            continue
        files += [f for f in sorted(base.rglob("*.html")) if f.is_file() and f.name not in NOT_BOARDS]
    return files, errors


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
        else:
            errors += code_errors(o, o["key"])

    # Every key the docs cite is traced.
    keys = known_keys(trace)
    for doc in CITING:
        if not doc.exists():
            continue
        for n in sorted({int(x) for x in KEY.findall(doc.read_text())}):
            if f"MA-{n}" not in keys:
                errors.append(f"{doc.relative_to(ROOT)} cites MA-{n}, which is not in the trace")

    # The board folders the trace names exist. A board's content is not read here: the design check that reads it went
    # with MA-303 (Arun, 2 Nov 2026: "All the 6 checks currently run on docs/design. Lets stop that"); the trace-to-design
    # sync stays, in item_findings (a cited board file exists and its board name is one of its canvas's titles).
    errors += board_files(ctx["projects"])[1]

    # The rendered table is current.
    if not TRACE_MD.exists() or TRACE_MD.read_text() != render(trace):
        errors.append("docs/TRACE.md is out of date: run `python3 scripts/plan_sync.py render`")

    # The roadmap, and the Confluence pages rendered from all of it (MA-228).
    try:
        import confluence_docs  # noqa: PLC0415
        import roadmap  # noqa: PLC0415
    except ImportError as e:  # fails closed: a check that cannot run is a failure, never a skip
        errors.append(f"the roadmap and Confluence checks cannot run: {e}")
    else:
        errors += [f"roadmap: {e}" for e in roadmap.errors(trace=trace)]
        errors += confluence_docs.errors()

    # Product code that no story claims.
    claimed = [c.rstrip("/") for it in code_rows(trace) if isinstance(it.get("code"), list) for c in it["code"] if isinstance(c, str)]
    for d in CODE_DIRS:
        for f in sorted((ROOT / d).rglob("*")) if (ROOT / d).is_dir() else []:
            rel = f.relative_to(ROOT).as_posix()
            if f.is_file() and not any(claims(c, rel) for c in claimed):
                warnings.append(f"code: {rel} belongs to no story's code paths")
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
    epic = next((p for p in trace.get("phases", []) if p.get("epic") == key), None)
    if epic:
        print(f"{key} is the phase {epic.get('phase')} epic ({epic.get('title', '')}); start one of its stories, not the epic.")
        return 1
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
        print("  STOP: settle the open questions with Arun, change the boards, docs and Jira to match, then clear each from the trace"
              " and say in the notes 'Settled: <the question's words up to its first colon>' with the answer.")
        return 1
    if it.get("undrawn"):
        for q in it["undrawn"]:
            print(f"  undrawn: {q}")
        print("  STOP: draw these screens first (/design-first), or land the pending fix an item names; add their boards to the"
              " row, then clear each item and say in the notes 'Drawn: <the item, as it was listed>'.")
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
    ("ds", "Foundations.dc.html", "1 · Colour", True), ("ds", "Foundations.dc.html", "2 · Type", True),
    ("ds", "Foundations.dc.html", "4 · Colour", False), ("ds", "Foundations.dc.html", "1 · Type", False),
    ("ds", "Foundations.dc.html", "2 · T", False), ("ds", "Foundations.dc.html", "Light", False),
    ("ds", "Logo.dc.html", "1c Chat avatar", True), ("ds", "Logo.dc.html", "1c · Watcher", True),
    ("ds", "Logo.dc.html", "1a Chat avatar", True), ("ds", "Logo.dc.html", "1 Chat avatar", False),
    ("ds", "Logo.dc.html", "1 sign-in", False), ("ds", "Logo.dc.html", "1 intro", False),
    ("app", "Web v4 · Login, invite and responsive.dc.html", "Browser · Responsive Overview & PWA · 1024", True),
    ("app", "Web v4 · Market, holdings and India.dc.html", "Browser · Market, Overlap & India · Desktop Light", True),
    ("app", "Web v4 · Login, invite and responsive.dc.html", "Mini App · Overview", False),
    ("app", "Web v4 · Login, invite and responsive.dc.html", "Mini App · Login", False),
    ("app", "Web v4 · Chat and guided flows.dc.html", "Telegram · Currency check", False),
    ("app", "Web v4 · Chat and guided flows.dc.html", "Every holding has one currency", False),
    ("app", "Web v4 · Admin center.dc.html", "Browser · Admin · Spend & AWS Cap · Desktop Light", True),
    ("app", "Web v4 · Admin center.dc.html", "Prod", False),
    ("app", "Web v4 · Admin center.dc.html", " ", False), ("app", "Web v4 · Admin center.dc.html", " · ", False),
    ("app", "Web v4 · Admin center.dc.html", "Note:", False),
    ("app", "Web v4 · Admin center.dc.html", "Web v4 · Admin center:", False),
    ("app", "Web v4 · Market, holdings and India.dc.html", "Browser · Market, Overlap & India · Phone 390", True),
    ("app", "Web v4 · Market, holdings and India.dc.html", "Demat account", False),
    ("app", "Web v4 · Market, holdings and India.dc.html", "MF folio · Fund house A", False),
    ("app", "Web v4 · Forecast.dc.html", "Browser · Forecaster · Proof & States · Desktop", True),
    ("app", "Web v4 · Forecast.dc.html", "Balanced", False),
    ("app", "Web v4 · Forecast.dc.html", "f2 Balanced", False),
    ("app", "Web v4 · Forecast.dc.html", "NASDAQ 100 ETF", False),
    ("app", "Web v4 · Login, invite and responsive.dc.html", "' + w.label.replace(/", False),
    ("app", "Web v4 · Login, invite and responsive.dc.html", " + lapScr.name : ", False),
    ("app", "Web v4 · Admin center.dc.html", "Browser · Browser · Admin · Spend & AWS Cap · Desktop Light", False),
    ("app", "Web v4 · Admin center.dc.html", "9 · Spend, $160 hard limit, ceiling moves and AWS cap (Desktop and 390)", False),
    ("app", "Web v4 · Audit, activity and files.dc.html", "2 · Files PDF viewer modal and extracted records (CAS-Oct-2026.pdf)", True),
    ("app", "Web v4 · Market, holdings and India.dc.html", "in-b2 · Browser · Market, Overlap & India · Desktop Light", False),
    ("app", "Web v4 · Login, invite and responsive.dc.html", "why · Why? sheet", False),
    ("app", "Web v4 · Market, holdings and India.dc.html", "1 · Market holdings (Buy / BUY, technical), Overlap, Scorecard and India (Desktop and 390)", True),
    ("app", "Web v4 · Admin center.dc.html", "2 · People, alert routing, failed-work Replay, approvals and agent notes (Desktop Dark and 390)", True),
    ("app", "Web v4 · Admin center.dc.html", "Browser · a Browser · Admin · Spend & AWS Cap · Desktop Light", False),
    ("app", "Web v4 · Audit, activity and files.dc.html", "Browser · B5 Browser · Audit, Activity & Files · Desktop Light", False),
    ("app", "Web v4 · Admin center.dc.html", "Web v4 · Admin center: intro", False),
    ("app", "Web v4 · Admin center.dc.html", "Browser · Web v4 · Admin center: intro", False),
    ("app", "Web v4 · Forecast.dc.html", "Web v4 · Forecast: intro", False),
    ("app", "Web v4 · Admin center.dc.html", "Web v4 · Admin center", False),
    ("ds", "MyPaisa DS v1.dc.html", "In the app's chat, the stance card pairs the chart, the plain-English call and its action chips.", False),
    ("ds", "MyPaisa DS v1.dc.html", "1a · Warm ledger", True),
    ("app", "Web v4 · Login, invite and responsive.dc.html", "Browser · Browser boards 1 to 4", False),
    # MA-161 / MA-279: the iOS boards. An option chip quoted in prose before its label must not hide the label.
    ("ios", "Shell options.dc.html", "1a · Chat first", True), ("ios", "Shell options.dc.html", "1c · One timeline", True),
    ("ios", "Shell options.dc.html", "1d · Chat first", False),
    ("ios", "iPhone v4 · Chat and guided flows.dc.html", "iPhone · Chat home & Home sheet · Light", True),
    ("ios", "iPhone v4 · Chat and guided flows.dc.html", "Chat home & Home sheet · Light", False),
    ("ios", "iPhone v4 · Chat and guided flows.dc.html", "iPad · Chat home & Home sheet · Light", False),
    ("ios", "iPad v4 · Adaptive shell and foldable.dc.html", "Foldable · Open 880 pt · Home & Chat sheet", True),
    ("ds", "iOS kit.dc.html", "12 · Motion", True),
]


# MA-303 (R1-a4): the board-name cases read these snippets, never the live boards, so editing a board cannot fail the
# selftest. Each holds, from its board as drawn on 2 Nov 2026, the markup that makes each case's titles and the
# markup a refused case could be mistaken for; each gives every case the answer its board gave.
BOARD_SNIPPETS = {
    'Foundations.dc.html': "\n".join([
        '<a class="dv-tid" href="#colour">1</a><span class="dv-tname">Colour</span>',
        '<a class="dv-tid" href="#type">2</a><span class="dv-tname">Type</span>',
        '<a class="dv-tid" href="#space">3</a><span class="dv-tname">Space, shape, elevation</span>',
        '<a class="dv-tid" href="#layout">4</a><span class="dv-tname">Layout and size classes</span>',
        '<a class="dv-tid" href="#motion">5</a><span class="dv-tname">Motion</span>',
        '<a class="dv-tid" href="#icons">6</a><span class="dv-tname">Iconography</span>',
        '<a class="dv-tid" href="#voice">7</a><span class="dv-tname">Voice</span>',
        '<span class="dv-tname">Colour</span>',
        '<span class="dv-tname">Type</span>',
        '<section class="dv-turn" id="colour" data-screen-label="Foundations 1: Colour">',
        '<section class="dv-turn" id="type" data-screen-label="Foundations 2: Type">',
        '<div class="pane {{ t.cls }}" data-screen-label="Type {{ t.label }}">',
        '<nav class="dv-idx" aria-label="Foundations">',
        '          <a href="#colour">1 · Colour</a><a href="#type">2 · Type</a><a href="#space">3 · Space, sh'
        'ape, elevation</a><a href="#layout">4 · Layout and size classes</a><a href="#motion">5 · Motion</a><'
        'a href="#icons">6 · Iconography</a><a href="#voice">7 · Voice</a>',
        '        </nav>',
        "{ label: 'Light', cls: 'mp t-light', sel: '.mp.t-light' }",
    ]),
    'Logo.dc.html': "\n".join([
        '<a class="dv-oid" href="#{{ o.id }}">{{ o.id }}',
        '<a class="dv-tid" href="#t1">1</a><span class="dv-tname">MyPaisa logo: three animated marks</span>',
        '<a class="dv-oid" href="#{{ o.id }}">{{ o.id }}</a><span class="dv-oname">{{ o.name }}</span>',
        "make('1a', {",
        "                name: 'Stance line'",
        "make('1b', {",
        "                name: 'Ruled pound'",
        "make('1c', {",
        "                name: 'Watcher'",
        '<div class="avpnl mp {{ t.cls }} mk-n" data-screen-label="{{ o.id }} Chat avatar {{ t.label }}">',
    ]),
    'Web v4 · Login, invite and responsive.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">WEB</a><span class="dv-tname">MyPaisa app v1 · Web v4 Login, invite '
        'and responsive</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Login, second sign-in refusals and /join/<token>'
        ' invite landing (Desktop and 390)</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">Responsive whole-wealth Overview and installed P'
        'WA (1440, 1024 and 390)</span>',
        '<span class="dv-tname">MyPaisa app v1 · Web v4 Login, invite and responsive</span>',
        '<span class="dv-tname">Login, second sign-in refusals and /join/<token> invite landing (Desktop and '
        '390)</span>',
        '<span class="dv-tname">Responsive whole-wealth Overview and installed PWA (1440, 1024 and 390)</span'
        '>',
        '<section class="dv-turn" id="intro" data-screen-label="MyPaisa app v1 · Web v4 Login, invite and res'
        'ponsive: intro">',
        '<section class="bd" id="b1" data-screen-label="1 · Login, second sign-in refusals and /join/<token> '
        'invite landing (Desktop and 390)">',
        '<div class="dv-col" data-screen-label="Browser · Login, Refusals & Invite Landing · Desktop">',
        '<div class="dv-col" data-screen-label="Browser · Login, Refusals & Invite Landing · Phone 390">',
        '<section class="bd" id="b2" data-screen-label="2 · Responsive whole-wealth Overview and installed PW'
        'A (1440, 1024 and 390)">',
        '<div class="dv-col" data-screen-label="Browser · Responsive Overview & PWA · 1024">',
        '<div class="dv-col" data-screen-label="Browser · Responsive Overview · Phone 390">',
    ]),
    'Web v4 · Market, holdings and India.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">WEB</a><span class="dv-tname">MyPaisa app v1 · Web v4 Market, holdin'
        'gs and India</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Market holdings (Buy / BUY, technical), Overlap,'
        ' Scorecard and India (Desktop and 390)</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">Whole-wealth Reports and 4-currency USD view (Li'
        'ght and Privacy mode, Desktop and 390)</span>',
        '<div class="dv-col" data-screen-label="Browser · Market, Overlap & India · Desktop Light">',
        '<div class="dv-col" data-screen-label="Browser · Market, Overlap & India · Phone 390">',
        '<div class="dv-col" data-screen-label="Browser · Reports in USD ($578,436) · Desktop">',
        '<div class="dv-col" data-screen-label="Browser · Reports · Privacy on · Phone 390">',
    ]),
    'Web v4 · Chat and guided flows.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">WEB</a><span class="dv-tname">MyPaisa app v1 · Web v4 Chat, currency'
        ' check and You</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Guided flows and currency check 1b (Desktop and '
        '390)</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">You preferences, research cards and member What-'
        'if card (Desktop and 390)</span>',
        '<p class="dv-cap">Every holding has one currency. The check asks before it changes one.</p>',
    ]),
    'Web v4 · Admin center.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">WEB</a><span class="dv-tname">MyPaisa app v1 · Web v4 Admin center</'
        'span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Spend, $160 hard limit, ceiling moves and AWS ca'
        'p (Desktop and 390)</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">People, alert routing, failed-work Replay, appro'
        'vals and agent notes (Desktop Dark and 390)</span>',
        '<span class="dv-tname">MyPaisa app v1 · Web v4 Admin center</span>',
        '<span class="dv-tname">Spend, $160 hard limit, ceiling moves and AWS cap (Desktop and 390)</span>',
        '<section class="dv-turn" id="intro" data-screen-label="MyPaisa app v1 · Web v4 Admin center: intro">',
        '<section class="bd" id="b1" data-screen-label="1 · Spend, $160 hard limit, ceiling moves and AWS cap'
        ' (Desktop and 390)">',
        '<div class="dv-col" data-screen-label="Browser · Admin · Spend & AWS Cap · Desktop Light">',
        '<div class="dv-col" data-screen-label="Browser · Admin · Spend & AWS Cap · Phone 390">',
        '<div class="dv-col" data-screen-label="Browser · Admin · People, Routing & Replay · Desktop Dark">',
        '<div class="dv-col" data-screen-label="Browser · Admin · People, Routing & Replay · Phone 390 Dark">',
    ]),
    'Web v4 · Forecast.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">WEB</a><span class="dv-tname">MyPaisa app v1 · Web v4 Forecast (MA-2'
        '81 1a)</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Holding · Forecast · 1a the answer first (NASDAQ'
        ' 100 and UK fund, Desktop and 390)</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">Forecaster · Proof, switch-off, no clear view (L'
        'ight and Privacy) and monthly split (Desktop and 390)</span>',
        '<span class="dv-tname">MyPaisa app v1 · Web v4 Forecast (MA-281 1a)</span>',
        '<section class="dv-turn" id="intro" data-screen-label="MyPaisa app v1 · Web v4 Forecast (MA-281 1a):'
        ' intro">',
        '<div class="dv-col" data-screen-label="Browser · Forecaster · Proof & States · Desktop">',
    ]),
    'Web v4 · Audit, activity and files.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">WEB</a><span class="dv-tname">MyPaisa app v1 · Web v4 Audit, activit'
        'y and files</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Audit ledger, Activity run inspector, Files PDF '
        'viewer and Search (Desktop and 390)</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">Files PDF viewer modal and extracted records (CA'
        'S-Oct-2026.pdf)</span>',
        '<div class="dv-col" data-screen-label="Browser · Audit, Activity & Files · Desktop Light">',
        '<div class="dv-col" data-screen-label="Browser · Audit, Activity & Files · Desktop Dark">',
        '<div class="dv-col" data-screen-label="Browser · Audit, Activity & Files · Phone 390">',
        '<div class="dv-col" data-screen-label="Browser · Audit with files · PDF viewer open">',
    ]),
    'MyPaisa DS v1.dc.html': "\n".join([
        '<a class="dv-tid" href="#t1">1</a><span class="dv-tname">MyPaisa DS v1: three directions</span>',
        '<a class="dv-oid" href="#1a">1a</a><span class="dv-oname">Warm ledger</span>',
        '<a class="dv-oid" href="#1b">1b</a><span class="dv-oname">Native clarity</span>',
        '<a class="dv-oid" href="#1c">1c</a><span class="dv-oname">Pot wall</span>',
        '<p class="dv-cap" style="margin-top: 10px; max-width: 390px; white-space: normal">In the app\'s chat,'
        ' the stance card pairs the chart, the plain-English call and its action chips.</p>',
    ]),
    'Shell options.dc.html': "\n".join([
        '<a class="dv-tid" href="#t1">1</a><span class="dv-tname">The app\'s shell: three ways the chat and th'
        'e dashboard meet</span>',
        # The trap MA-279 fixed: option chips quoted in prose before the labels must not swallow the page up to one.
        '<p>The boards are drawn in <a class="dv-oid" href="#1a">1a</a>\'s shell, which Arun picked on 26 Oct 2026;'
        ' <a class="dv-oid" href="#1b">1b</a> and <a class="dv-oid" href="#1c">1c</a> stay as the record.</p>',
        '<div class="dv-olabel">',
        '<a class="dv-oid" href="#1a">1a</a><span class="dv-oname">Chat first</span>',
        '<a class="dv-oid" href="#1b">1b</a><span class="dv-oname">Ask from anywhere</span>',
        '<p>Ask is a tap further away than in <a class="dv-oid" href="#1a">1a</a>: open the accessory, then type.</p>',
        '<a class="dv-oid" href="#1c">1c</a><span class="dv-oname">One timeline</span>',
        '<span class="dv-oname">Chat first</span>',
        '<div class="dv-col" data-screen-label="1a Chat first · iPhone · {{ t.label }}">',
        '<div class="dv-col" data-screen-label="1a Chat first · iPad">',
    ]),
    'iPhone v4 · Chat and guided flows.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">iOS</a><span class="dv-tname">MyPaisa iOS v1 · Chat and guided flows'
        ' (v4)</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">Chat home, streaming reply and household strip</'
        'span>',
        '<span class="dv-tid">2</span><span class="dv-tname">Guided flows: log transaction, add holding, upda'
        'te valuation and change setting</span>',
        '<span class="dv-tid">3</span><span class="dv-tname">Currency check (1b) and screenshot valuations</s'
        'pan>',
        '<span class="dv-tid">4</span><span class="dv-tname">Research and stance cards (Buy and BUY), alerts,'
        ' monthly split and commands</span>',
        '<div class="dv-col" data-screen-label="iPhone · Chat home & Home sheet · Light">',
        '<div class="dv-col" data-screen-label="iPhone · Guided flows & long-list picker · Light">',
        '<div class="dv-col" data-screen-label="iPhone · Currency check 1b & screenshot confirm · Light">',
        '<div class="dv-col" data-screen-label="iPhone · Stance cards, alerts & commands · Light">',
    ]),
    'iPad v4 · Adaptive shell and foldable.dc.html': "\n".join([
        '<a class="dv-tid" href="#intro">iPad & Foldable</a><span class="dv-tname">MyPaisa iOS v1 · Adaptive '
        'iPad and foldable shell (v4)</span>',
        '<span class="dv-tid">1</span><span class="dv-tname">iPad Wide (from 1133 pt, chat beside): Home, For'
        'ecaster Proof, Audit and Admin</span>',
        '<span class="dv-tid">2</span><span class="dv-tname">iPad Portrait (820 pt) and Foldable Open (880 pt'
        '): top tab bar and Chat sheet</span>',
        '<span class="dv-tid">3</span><span class="dv-tname">Foldable Folded (380 pt) and iPhone Landscape: c'
        'ompact bottom tab bar</span>',
        '<span class="dv-tid">4</span><span class="dv-tname">iPad 13-inch portrait (1032 pt): sidebar, Ask in'
        ' the bar and the chat as a sheet</span>',
        '<div class="dv-col" data-screen-label="Foldable · Open 880 pt · Home & Chat sheet">',
    ]),
    'iOS kit.dc.html': "\n".join([
        '<section class="bd" id="b12" data-screen-label="12 · Motion">',
        '<nav class="dv-idx" aria-label="Boards"><a href="#b1">1 · Liquid Glass layers</a><a href="#b2">2 · C'
        'olour in the app</a><a href="#b3">3 · Type and Dynamic Type</a><a href="#b4">4 · Tab bar and sidebar'
        '</a><a href="#b5">5 · Toolbars and the composer</a><a href="#b6">6 · Messages and cards</a><a href="'
        '#b7">7 · Buttons, chips and controls</a><a href="#b8">8 · Sheets, menus and alerts</a><a href="#b9">'
        '9 · Charts</a><a href="#b10">10 · App icon</a><a href="#b11">11 · Accessibility</a><a href="#b12">12'
        ' · Motion</a></nav>',
    ]),
}


def _row(t: dict, key: str) -> dict:
    return next(i for i in t["items"] if i["key"] == key)


def _set(t: dict, key: str, **kw: object) -> dict:
    _row(t, key).update(kw)
    return t


# MA-228: the roadmap, the Confluence pages and the code paths, each mutated in a copy of the repo and refused by check.
# (what the case breaks, the file it changes, how, and the words check must print)
RECORD_CASES = [
    ("an ARCHITECTURE section on no record page", "ARCHITECTURE.md", lambda t: t + "\n\n## 99. A section nobody records\n\nText.\n",
     r"ARCHITECTURE §99 is on 0 record pages"),
    ("an explainer page changed after its pictures were captured", "docs/design/architecture-v4.html",
     lambda h: h.replace('name:"A question"', 'name:"A question asked"', 1), r"preview rec-j-v4--v4-question\.gif is older than its boards"),
    ("a flow the record names gone from the Agent Journey", "docs/design/agent-journey.html",
     lambda h: h.replace('id="invite"', 'id="invite-gone"', 1), r"has no flow #invite"),
    ("a Story Done with no code", "docs/trace.json", lambda t: _set(t, "MA-36", status="Done"), r"MA-36: a Story Done names no code"),
    ("a code path that does not exist", "docs/trace.json", lambda t: _set(t, "MA-36", code=["web/src/no-such-file.ts"]),
     r"MA-36: code path 'web/src/no-such-file.ts' matches nothing"),
    ("a story with no estimate", "docs/roadmap.json", lambda r: (r["estimates"].pop("MA-36"), r)[1], r"MA-36 has no estimate"),
    ("an estimate changed without the schedule", "docs/roadmap.json", lambda r: (r["estimates"].update({"MA-36": 40}), r)[1],
     r"roadmap: docs/roadmap.json's schedule is stale"),
    ("a Confluence page edited by hand in the repo", "docs/confluence/phase-05.html", lambda h: h.replace("</table>", "<p>x</p></table>", 1),
     r"docs/confluence/phase-05\.html is stale"),
    ("a page changed but not published", "docs/confluence.json", lambda m: (m["pages"]["phase-05"].update({"sha256": "0"}), m)[1],
     r"'Phase 5 · Investments, priced' changed in the repo but is not published"),
    ("an interactive app older than its inputs", "docs/confluence.json",
     lambda m: (m.setdefault("apps", {}).update({"roadmap-gantt": {"page": "roadmap", "id": "x", "url": "https://example.invalid/app", "source": "0"}}), m)[1],
     r"app roadmap-gantt is older than its inputs"),
    ("the story explorer's rows edited by hand", "docs/confluence/stories.csv", lambda c: c.replace("MA-20,", "MA-20x,", 1),
     r"docs/confluence/stories\.csv is stale"),
    ("a page renamed but not published", "docs/confluence.json", lambda m: (m["pages"]["phase-05"].update({"title": "Phase 5 · An old name"}), m)[1],
     r"'Phase 5 · Investments, priced' was renamed in the repo but is still titled 'Phase 5 · An old name'"),
    ("the story explorer changed but not published", "docs/confluence.json",
     lambda m: (m["databases"]["stories"].update({"sha256": "0"}), m)[1], r"database stories changed in the repo but is not published"),
    # MA-245 review, round 1: the guardrails page shows ARCHITECTURE 23 and must fail closed when it cannot.
    ("ARCHITECTURE 23 retitled, so the guardrails page would show another section", "ARCHITECTURE.md",
     lambda s: s.replace("## 23. Guardrails and evals", "## 23. Something else", 1),
     r"guardrails page: ARCHITECTURE §23 is not 'Guardrails and evals'"),
    ("ARCHITECTURE 23's body emptied", "ARCHITECTURE.md",
     lambda s: re.sub(r"(?ms)^(## 23\. [^\n]*\n).*?(?=^## |\Z)", r"\1", s), r"guardrails page: ARCHITECTURE §23 has no body"),
    ("ARCHITECTURE 23 edited, its page not rewritten", "ARCHITECTURE.md", lambda s: s.replace("a random 10%", "a random 20%", 1),
     r"docs/confluence/guardrails\.html is stale"),
    ("the guardrails page with no Confluence id", "docs/confluence.json", lambda m: (m["pages"].pop("guardrails"), m)[1],
     r"'Guardrails and evals: how the agents are guarded and tested' has no Confluence id"),
    # MA-274 review, round 1: the research-backed Confluence pages (stack, cicd, maestro) fail closed when docs/RESEARCH.md or their section is missing, retitled or empty.
    ("docs/RESEARCH.md missing, so research-backed Confluence pages fail closed", "docs/RESEARCH.md", None,
     r"confluence: docs/RESEARCH\.md is missing"),
    ("RESEARCH 8 missing, so the maestro page fails closed", "docs/RESEARCH.md",
     lambda s: s.replace("## 8. ", "## 88. ", 1),
     r"maestro page: docs/RESEARCH\.md has no section 8"),
    ("RESEARCH 8 retitled, so the maestro page would show another section", "docs/RESEARCH.md",
     lambda s: s.replace("## 8. Local iOS & iPadOS testing strategy with Maestro", "## 8. Something else", 1),
     r"maestro page: docs/RESEARCH\.md §8 is not 'Local iOS & iPadOS testing strategy with Maestro'"),
    ("RESEARCH 8's body emptied", "docs/RESEARCH.md",
     lambda s: re.sub(r"(?ms)^(## 8\. [^\n]*\n).*", r"\1", s),
     r"maestro page: docs/RESEARCH\.md §8 has no body"),
    ("the maestro page with no Confluence id", "docs/confluence.json", lambda m: (m["pages"].pop("maestro"), m)[1],
     r"'Local iOS and iPadOS Maestro testing and private TestFlight beta plan' has no Confluence id"),
    ("RESEARCH 9 missing, so the vpc page fails closed", "docs/RESEARCH.md",
     lambda s: s.replace("## 9. ", "## 99. ", 1),
     r"vpc page: docs/RESEARCH\.md has no section 9"),
    ("RESEARCH 9 retitled, so the vpc page would show another section", "docs/RESEARCH.md",
     lambda s: s.replace("## 9. Optional AWS VPC enterprise lockdown", "## 9. Something else", 1),
     r"vpc page: docs/RESEARCH\.md §9 is not 'Optional AWS VPC enterprise lockdown'"),
    ("RESEARCH 9's body emptied", "docs/RESEARCH.md",
     lambda s: re.sub(r"(?ms)^(## 9\. [^\n]*\n).*", r"\1", s),
     r"vpc page: docs/RESEARCH\.md §9 has no body"),
    ("the vpc page with no Confluence id", "docs/confluence.json", lambda m: (m["pages"].pop("vpc"), m)[1],
     r"'Optional AWS VPC enterprise lockdown, data perimeter and costing' has no Confluence id"),
    ("RESEARCH 10 missing, so the argos page fails closed", "docs/RESEARCH.md",
     lambda s: s.replace("## 10. ", "## 100. ", 1),
     r"argos page: docs/RESEARCH\.md has no section 10"),
    ("RESEARCH 10 retitled, so the argos page would show another section", "docs/RESEARCH.md",
     lambda s: s.replace("## 10. Web visual regression, ARIA snapshot diffing", "## 10. Something else", 1),
     r"argos page: docs/RESEARCH\.md §10 is not 'Web visual regression, ARIA snapshot diffing'"),
    ("RESEARCH 10's body emptied", "docs/RESEARCH.md",
     lambda s: re.sub(r"(?ms)^(## 10\. [^\n]*\n).*", r"\1", s),
     r"argos page: docs/RESEARCH\.md §10 has no body"),
    ("the argos page with no Confluence id", "docs/confluence.json", lambda m: (m["pages"].pop("argos"), m)[1],
     r"'Web visual regression, ARIA snapshot diffing and WCAG 2.2 AA accessibility pipeline with Argos CI' has no Confluence id"),
    ("a preview older than its boards", "docs/confluence.json",
     lambda m: (next(v for k, v in m["images"].items() if k.startswith("phase-05")).update({"source": "0"}), m)[1],
     r"preview phase-05-\S+ is older than its boards"),
    # MA-296: the boards are read from their folders, with no record beside them; a cited board gone, or a board folder
    # gone, is still refused (MA-260's "a recorded board file gone", kept as lesson 22 asks).
    ("a cited board file gone", "docs/design/ds-v1/Chart options.dc.html", None,
     r"MA-295: board file docs/design/ds-v1/Chart options\.dc\.html is not in the repo"),
    # R1-a7: a row in others may name code too, and its paths are checked as an item's are.
    ("a row in others whose code path does not exist", "docs/trace.json",
     lambda t: (t["others"][0].update(code=["web/src/no-such-other.ts"]), t)[1], r"MA-\d+: code path 'web/src/no-such-other\.ts' matches nothing"),
    ("a board folder the trace names gone", "docs/trace.json", lambda m: (m["claude_design"]["ds"].update(dir="docs/design/ds-v0"), m)[1],
     r"boards: docs/trace\.json's claude_design names ds, whose folder docs/design/ds-v0 is not in the repo"),
]

SELFTEST_SCRIPTS = ("plan_sync.py", "roadmap.py", "confluence_docs.py", "confluence_record.py")
WORKERS = 4  # the mutated-record cases run on this many copies of the repo at once


def _clone(dst: Path) -> None:
    """A copy of the records the mutated-record cases run `check` on: the scripts, the root docs and docs/. On macOS
    docs/ is an APFS clone (`cp -c`), which shares its blocks with the original until a case writes; elsewhere, or if
    the clone fails, a plain copy."""
    if dst.exists():
        shutil.rmtree(dst)
    (dst / "scripts").mkdir(parents=True)
    for script in SELFTEST_SCRIPTS:
        if (Path(__file__).parent / script).exists():
            shutil.copy(Path(__file__).parent / script, dst / "scripts" / script)
    for f in ("ARCHITECTURE.md", "PLAN.md", "TECH_STACK.md", "README.md"):
        if (ROOT / f).exists():
            shutil.copy(ROOT / f, dst / f)
    if sys.platform == "darwin" and subprocess.run(["cp", "-c", "-R", str(ROOT / "docs"), str(dst / "docs")], capture_output=True).returncode == 0:
        return
    shutil.rmtree(dst / "docs", ignore_errors=True)
    shutil.copytree(ROOT / "docs", dst / "docs")


def _digest(path: Path) -> str | None:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def _record_case(case: tuple, worker: dict) -> str | None:
    """One mutated-record case on a worker's copy: the copy is checked clean first (every file an earlier case touched
    hashes as it was cloned, else the copy is cloned again), the case's file is mutated, check runs, and the file is put
    back whatever happens. Returns the failure line, or None."""
    what, rel, mutate, words = case
    root = worker["dir"]
    if any(_digest(root / r) != h for r, h in worker["clean"].items()):
        _clone(root)
        worker["clean"] = {}
    target = root / rel
    if not target.exists():
        return f"FAIL: the case {what!r} needs {rel}"
    original = target.read_bytes()
    worker["clean"].setdefault(rel, hashlib.sha256(original).hexdigest())
    try:
        if mutate is None:
            target.unlink()
        elif rel.endswith(".json"):
            target.write_text(json.dumps(mutate(json.loads(target.read_text())), indent=1, ensure_ascii=False) + "\n")
        else:
            target.write_text(mutate(target.read_text()))
        r = subprocess.run([sys.executable, "-I", str(root / "scripts" / "plan_sync.py"), "check"], capture_output=True, text=True)
    except Exception as e:  # noqa: BLE001 - a case that cannot be set up is a failure, never a skip
        return f"FAIL: the case {what!r} could not run: {type(e).__name__}: {e}"
    finally:
        target.write_bytes(original)
    if r.returncode == 0 or not re.search(words, r.stdout):
        return f"FAIL: check passed {what} (exit {r.returncode}; wanted {words!r})"
    return None


def record_cases(cases: list | None = None, workers: int = WORKERS) -> int:
    """Every RECORD_CASES case, across `workers` copies of the repo at once (MA-303: one clone per worker, each case's
    file restored after it, in place of a fresh copy of docs/ per case). Failures print in the cases' own order."""
    cases = RECORD_CASES if cases is None else cases
    n = max(1, min(workers, len(cases)))
    with tempfile.TemporaryDirectory() as tmp:
        pool: queue.Queue = queue.Queue()
        crew = [{"dir": Path(tmp) / f"w{i}", "clean": {}} for i in range(n)]
        with ThreadPoolExecutor(n) as ex:
            list(ex.map(lambda w: _clone(w["dir"]), crew))
            for w in crew:
                pool.put(w)

            def run(case: tuple) -> str | None:
                w = pool.get()  # each copy serves one case at a time
                try:
                    return _record_case(case, w)
                finally:
                    pool.put(w)

            results = list(ex.map(run, cases))
    for line in results:
        if line:
            print(line)
    return sum(1 for line in results if line)


# MA-303: which product files a branch changes, and whose story claims each. (paths, the trace's code rows, the branch's
# key, the deleted paths) -> (files claimed by another story only, files no story claims).
PR_ITEMS = [
    {"key": "MA-10", "code": ["web/src/lib/chat/**", "ios/MyPaisa/Chat/"]},
    {"key": "MA-11", "code": ["src/mypaisa/agent/tools.py", "infra/*.tf"]},
    {"key": "MA-12", "code": ["web/src/lib/chat/shared.ts"]},
    {"key": "MA-13", "code": ["web/**/legacy.ts"]},
]
PR_CASES = [
    (["web/src/lib/chat/a/b.ts"], "MA-10", set(), [], []),
    (["web/src/lib/chat/shared.ts"], "MA-10", set(), [], []),                       # shared with MA-12, ours too
    (["web/src/lib/chat/shared.ts"], "MA-11", set(), [("web/src/lib/chat/shared.ts", ["MA-10", "MA-12"])], []),
    (["ios/MyPaisa/Chat/View.swift", "ios/MyPaisa/ChatX.swift"], "MA-10", set(), [], ["ios/MyPaisa/ChatX.swift"]),
    (["infra/main.tf", "infra/mod/main.tf"], "MA-11", set(), [], ["infra/mod/main.tf"]),  # * stays in its folder
    (["src/mypaisa/agent/tools.py.bak"], "MA-11", set(), [], ["src/mypaisa/agent/tools.py.bak"]),
    (["web/legacy.ts", "web/a/b/legacy.ts"], "MA-13", set(), [], []),                # **/ spans no folder or many
    (["docs/trace.json", "scripts/plan_sync.py", "README.md"], "MA-10", set(), [], []),  # not product code
    (["web/gone.ts"], "MA-10", {"web/gone.ts"}, [], []),                             # a deletion nobody claims is no fault
    (["src/mypaisa/agent/tools.py"], "MA-10", {"src/mypaisa/agent/tools.py"}, [("src/mypaisa/agent/tools.py", ["MA-11"])], []),
]

# pr_files on a detached merge commit, as CI runs it: (what, the trace, --key, the environment, the exit it must give).
PR_RUN_CASES = [
    ("a detached HEAD with GITHUB_HEAD_REF set refuses an unclaimed file", {"items": PR_ITEMS}, None,
     {"GITHUB_HEAD_REF": "MA-10-x", "CI": "true"}, 1),
    ("a detached HEAD in CI with no key fails closed", {"items": PR_ITEMS}, None, {"CI": "true"}, 2),
    ("a detached HEAD outside CI with no key reports and passes", {"items": PR_ITEMS}, None, {}, 0),
    ("--key on a detached HEAD refuses an unclaimed file", {"items": PR_ITEMS}, "MA-10", {}, 1),
    ("--key that is no MA key fails closed", {"items": PR_ITEMS}, "main", {"CI": "true"}, 2),
    # R1-a7: a row in others with code claims its files as an item does.
    ("a row in others with code claims its files", {"items": [], "others": [{"key": "MA-20", "code": ["web/"]}]}, "MA-20", {}, 0),
    ("a row in others with code is another story's", {"items": [], "others": [{"key": "MA-20", "code": ["web/"]}]}, "MA-10", {}, 1),
]


def claims(path: str, rel: str) -> bool:
    """Whether a story's code path covers a repo file: the path itself, a folder above it, or a glob (`*` and `?` within
    a folder, `**` across folders); a glob that names a folder covers what is in it."""
    path = path.rstrip("/")
    if not re.search(r"[*?]", path):
        return rel == path or rel.startswith(path + "/")
    rx = "".join({"**/": "(?:.*/)?", "**": ".*", "*": "[^/]*", "?": "[^/]"}.get(t, re.escape(t))
                 for t in re.split(r"(\*\*/|\*\*|\*|\?)", path))
    return re.fullmatch(rx + r"(?:/.*)?", rel) is not None


def pr_findings(files: list[str], items: list, key: str | None, deleted: set[str] = frozenset()) -> tuple[list, list]:
    """The product files (under web/, ios/, src/, infra/) a branch changes that a story other than its own claims, with
    their owners, and those no story claims (a deletion no story claims is no fault)."""
    others, unclaimed = [], []
    for f in files:
        if not f.startswith(tuple(d + "/" for d in CODE_DIRS)):
            continue
        owners = sorted({it["key"] for it in items if isinstance(it, dict) and isinstance(it.get("key"), str)
                         and isinstance(it.get("code"), list) and any(isinstance(c, str) and claims(c, f) for c in it["code"])},
                        key=key_order)
        if not owners:
            if f not in deleted:
                unclaimed.append(f)
        elif key and key not in owners:
            others.append((f, owners))
    return others, unclaimed


def changed_files(base: str, cwd: Path = ROOT) -> tuple[str, list[str], set[str]]:
    """The files a branch changes since its merge-base with `base`: committed, uncommitted and untracked; and which of
    them are deleted. Raises CalledProcessError when git cannot say."""
    def git(*a: str) -> str:
        return subprocess.run(["git", "-C", str(cwd), *a], capture_output=True, text=True, check=True).stdout
    mb = git("merge-base", "HEAD", base).strip()
    # --no-renames: a rename is its old path deleted and its new path added, so neither hides behind the other
    changed = git("diff", "--name-only", "--no-renames", "-z", mb).split("\0")
    deleted = git("diff", "--name-only", "--no-renames", "--diff-filter=D", "-z", mb).split("\0")
    untracked = git("ls-files", "--others", "--exclude-standard", "-z").split("\0")
    return mb, sorted({f for f in changed + untracked if f}), {f for f in deleted if f}


def branch_key(cwd: Path = ROOT, env: dict | None = None) -> str | None:
    """The MA key the checked-out branch carries. On a detached HEAD (a pull_request run in CI checks out the merge
    commit, MA-303 R1-a1) the branch is the PR's head, from GITHUB_HEAD_REF."""
    env = os.environ if env is None else env
    r = subprocess.run(["git", "-C", str(cwd), "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True)
    name = r.stdout.strip()
    if name in ("", "HEAD"):
        name = env.get("GITHUB_HEAD_REF") or ""
    m = re.match(r"(MA-\d+)\b", name)
    return m.group(1) if m else None


def code_rows(trace: dict) -> list:
    """The trace's rows that may name code: its items, and the rows in others (R1-a7: a row there with code counts the same)."""
    return [r for f in ("items", "others") for r in (trace.get(f) or []) if isinstance(r, dict)]


def pr_files(trace: dict, base: str, key: str | None = None, cwd: Path = ROOT, env: dict | None = None) -> int:
    """Exit 1 when the branch's own story changes product code another story, or none, claims. In CI it fails closed
    (exit 2) when no key can be found: no key would pass every file."""
    env = os.environ if env is None else env
    if key is not None and not re.fullmatch(r"MA-\d+", key):
        print(f"pr-files: --key needs MA-<n>, not {key!r}")
        return 2
    key = key or branch_key(cwd, env)
    if not key and env.get("CI"):
        print("pr-files: no MA key on the branch, in GITHUB_HEAD_REF or in --key; in CI that fails closed")
        return 2
    try:
        mb, files, deleted = changed_files(base, cwd)
    except (OSError, subprocess.CalledProcessError) as e:  # fails closed
        print(f"pr-files: git cannot say what changed since {base}: {getattr(e, 'stderr', '') or e}".strip())
        return 2
    others, unclaimed = pr_findings(files, code_rows(trace), key, deleted)
    code = [f for f in files if f.startswith(tuple(d + "/" for d in CODE_DIRS))]
    print(f"pr-files: {len(code)} product files changed on {key or 'a branch with no MA key'} since {mb[:7]} ({base})")
    for f, owners in others:
        print(f"  OTHER: {f} is claimed by {', '.join(owners)}, not {key}: add it to {key}'s code, or move it to its own story's branch")
    for f in unclaimed:
        print(f"  UNCLAIMED: {f} belongs to no story's code paths: add it to {key or 'its story'}'s code in docs/trace.json")
    print(f"pr-files: {len(others)} claimed by another story, {len(unclaimed)} claimed by none")
    return 1 if key and (others or unclaimed) else 0


def pr_selftest() -> int:
    """pr_findings against known cases, and changed_files on a throwaway repo (committed, uncommitted, untracked)."""
    bad = 0
    for files, key, deleted, want_others, want_unclaimed in PR_CASES:
        got = pr_findings(files, PR_ITEMS, key, deleted)
        if got != (want_others, want_unclaimed):
            bad += 1
            print(f"FAIL: pr-files {files} on {key}: {got}, should be {(want_others, want_unclaimed)}")
    with tempfile.TemporaryDirectory() as t:
        repo = Path(t)

        def git(*a: str) -> None:
            subprocess.run(["git", "-C", t, "-c", "user.name=t", "-c", "user.email=t@t", *a], capture_output=True, check=True)
        git("init", "-q", "-b", "main")
        for f in ("web/a.ts", "web/gone.ts", "web/edit.ts"):
            (repo / f).parent.mkdir(parents=True, exist_ok=True)
            (repo / f).write_text("x\n")
        git("add", "-A")
        git("commit", "-qm", "base")
        git("checkout", "-qb", "MA-10-x")
        (repo / "web" / "committed.ts").write_text("x\n")
        git("add", "-A")
        git("commit", "-qm", "MA-10: c")
        (repo / "web" / "edit.ts").write_text("y\n")
        (repo / "web" / "gone.ts").unlink()
        (repo / "web" / "new.ts").write_text("x\n")
        _, files, deleted = changed_files("main", repo)
        want = (["web/committed.ts", "web/edit.ts", "web/gone.ts", "web/new.ts"], {"web/gone.ts"})
        if (files, deleted) != want or branch_key(repo, {}) != "MA-10":
            bad += 1
            print(f"FAIL: pr-files on a throwaway branch saw {files}, deleted {deleted}, key {branch_key(repo, {})}; should be {want}, MA-10")
        # R1-a1: CI checks out the PR's merge commit, detached, and compares it with its first parent (--base HEAD^1);
        # the key comes from GITHUB_HEAD_REF or --key, and in CI no key fails closed. Every web/ file here is unclaimed.
        git("add", "-A")
        git("commit", "-qm", "MA-10: rest")
        git("checkout", "-q", "main")
        git("merge", "-q", "--no-ff", "-m", "MA-10: merge", "MA-10-x")
        git("checkout", "-q", "--detach")
        for what, trace, key, env, want in PR_RUN_CASES:
            with contextlib.redirect_stdout(io.StringIO()):
                got = pr_files(trace, "HEAD^1", key, repo, env)
            if got != want:
                bad += 1
                print(f"FAIL: pr-files, {what}: exit {got}, should be {want}")
    return bad


# MA-303: Jira compared incrementally. docs/jira-sync.json records the last sync and, per key, a short hash of what
# Jira said (summary, parent, labels, status, due date) and of the trace's row, so a normal /plan-sync reads only the
# issues updated since, the keys still drifting, and the rows changed in the repo; `--all` reads everything.
JIRA_SYNC = ROOT / "docs" / "jira-sync.json"


def _short(values: list) -> str:
    return hashlib.sha256(json.dumps(values, ensure_ascii=False).encode()).hexdigest()[:12]


def jira_hash(issue: dict) -> str:
    return _short([issue.get("summary"), issue.get("parent"), sorted(issue.get("labels") or []), issue.get("status"), issue.get("duedate")])


def repo_rows(trace: dict) -> dict[str, dict]:
    """What the repo says of each key Jira holds: stories and tasks from items and others, epics with their due date."""
    sched = load(ROOT / "docs" / "roadmap.json").get("schedule", {}) if (ROOT / "docs" / "roadmap.json").exists() else {}
    rows = {}
    for it in trace.get("items", []):
        rows[it["key"]] = {"summary": it.get("summary"), "parent": it.get("epic"), "labels": sorted(it.get("labels", [])),
                           "status": it.get("status"), "ui": it.get("ui")}
    for o in trace.get("others", []):
        rows[o["key"]] = {"summary": o.get("summary"), "status": o.get("status"), "other": True}
    for p in trace.get("phases", []):
        rows[p["epic"]] = {"epic": True, "duedate": (sched.get(str(p.get("phase"))) or {}).get("end")}
    return rows


def jira_drift(issues: list[dict], trace: dict, full: bool) -> list[tuple[str, ...]]:
    """One row per disagreement: (item, field, repo value, Jira value, which wins and why, the fix)."""
    rows, epics = repo_rows(trace), {p["epic"] for p in trace.get("phases", [])}
    out = []
    for i in issues:
        k, r = i.get("key"), rows.get(i.get("key"))
        if r is None:
            where = "items, under its phase" if i.get("parent") in epics else "others"
            out.append((k, "row", "not in the trace", str(i.get("summary")), "Jira: the issue exists", f"add its row to {where} (/plan-sync step 1)"))
            continue
        if r.get("epic"):
            if (i.get("duedate") or None) != (r.get("duedate") or None):
                out.append((k, "due date", str(r.get("duedate")), str(i.get("duedate")), "the roadmap: dates come from estimates (rule 9)",
                            "set the epic's due date in Jira to the schedule's end"))
            continue
        for f in ("summary", "status"):
            if i.get(f) != r.get(f):
                out.append((k, f, str(r.get(f)), str(i.get(f)), "Jira: it holds who does what and its status", "copy Jira's value into the row"))
        if r.get("other"):
            continue
        if i.get("parent") != r.get("parent"):
            out.append((k, "parent", str(r.get("parent")), str(i.get("parent")), "the plan: PLAN.md decides the phase",
                        "move the issue's parent in Jira and comment why"))
        jl, rl = sorted(i.get("labels") or []), r.get("labels", [])
        if ("design" in jl) != bool(r.get("ui")):
            out.append((k, "design label", f"ui {str(r.get('ui')).lower()}", "set" if "design" in jl else "missing",
                        "the trace: the label marks exactly the stories with UI", "set the label in Jira to match ui"))
        if [x for x in jl if x != "design"] != [x for x in rl if x != "design"]:
            out.append((k, "labels", ", ".join(rl), ", ".join(jl), "Jira", "copy Jira's labels into the row"))
    if full:
        seen = {i.get("key") for i in issues}
        for k, r in rows.items():
            if k not in seen:
                out.append((k, "issue", "in the trace", "not in Jira", "neither: never invent an issue",
                            "report it; if PLAN.md describes it, create the issue and fix the row's key"))
    return sorted(out, key=lambda row: (key_order(row[0]), row[1]))


JIRA_SYNC_EMPTY = {"version": 1, "last_sync": None, "pending": [], "missing": [], "query": None, "issues": {}}


def jira_sync(trace: dict, argv: list[str], path: Path = JIRA_SYNC, now: str | None = None) -> int:
    """query: print the JQL to read, and save it (its kind, the keys it names, its time) in docs/jira-sync.json.
    compare: the drift in a file of issues read. record: `--for-query` records a file that answers the saved query
    whole and moves last_sync to the query's time; `--keys MA-n,...` records only those keys and never moves it (R1-a2).
    A trace key Jira does not have is kept in `missing`, out of the query's key list, and reported (R1-a3)."""
    try:
        rec = json.loads(path.read_text()) if path.exists() else {}
    except ValueError as e:
        print(f"jira-sync: {path.name} is not valid JSON: {e}")
        return 2
    for k, v in JIRA_SYNC_EMPTY.items():
        rec.setdefault(k, json.loads(json.dumps(v)))
    full = "--all" in argv
    act = argv[0] if argv else ""
    rows = repo_rows(trace)
    missing = set(rec.get("missing") or [])

    def save() -> None:
        path.write_text(json.dumps(rec, indent=1, ensure_ascii=False) + "\n")

    def hashes(i: dict) -> dict:
        return {"jira": jira_hash(i), "repo": _short(sorted(rows[i["key"]].items()))}

    if act == "query":
        # The keys to read whatever their date: those still drifting, and the rows the repo changed (or never synced),
        # less the keys Jira is known not to have.
        moved = sorted(({k for k, r in rows.items() if rec["issues"].get(k, {}).get("repo") != _short(sorted(r.items()))}
                        | set(rec.get("pending", []))) - missing, key=key_order)
        at = now or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
        if full or not rec.get("last_sync") or len(moved) > 100:  # the full sweep: asked for, never synced, or cheaper than a long list
            jql, kind, moved = "project = MA ORDER BY key ASC", "full", []
        else:
            since = (datetime.date.fromisoformat(rec["last_sync"][:10]) - datetime.timedelta(days=1)).isoformat()  # a day early: any timezone
            keys = f' OR key in ({", ".join(moved)})' if moved else ""
            jql, kind = f'project = MA AND (updated >= "{since}"{keys}) ORDER BY key ASC', "incremental"
        rec["query"] = {"jql": jql, "kind": kind, "keys": moved, "at": at}
        save()
        print(jql)
        if missing:
            print(f"jira-sync: kept out of the query, the trace has and Jira does not: {', '.join(sorted(missing, key=key_order))}", file=sys.stderr)
        return 0
    if act not in ("compare", "record") or len(argv) < 2:
        print("usage: plan_sync.py jira-sync query [--all] | compare <issues.json> [--all]"
              " | record <issues.json> --for-query | record <issues.json> --keys MA-n[,MA-m]")
        return 2
    try:
        issues = json.loads(Path(argv[1]).read_text())
    except (OSError, ValueError) as e:
        print(f"jira-sync: cannot read {argv[1]}: {e}")
        return 2
    if not isinstance(issues, list) or not all(isinstance(i, dict) and isinstance(i.get("key"), str) for i in issues):
        print(f"jira-sync: {argv[1]} must hold a list of issues, each with a key")
        return 2
    got = {i["key"] for i in issues}
    if act == "compare":
        drift = jira_drift(issues, trace, full)
        unchanged = sum(1 for i in issues if rec["issues"].get(i["key"], {}).get("jira") == jira_hash(i))
        print(f"jira-sync: {len(issues)} issues read, {unchanged} unchanged since the last sync, {len(drift)} drift")
        if still := sorted(missing - got, key=key_order):
            print(f"jira-sync: missing in Jira (in the trace, kept out of the query): {', '.join(still)}")
        if drift:
            print("| Item | Field | Repo | Jira | Wins, and why | Fix |\n| --- | --- | --- | --- | --- | --- |")
            for row in drift:
                print("| " + " | ".join(c.replace("|", "/") for c in row) + " |")
        return 1 if drift else 0
    if "--keys" in argv:
        # A read of a few keys: those keys' hashes only; last_sync stays, since the read says nothing of the rest.
        raw = argv[argv.index("--keys") + 1] if argv.index("--keys") + 1 < len(argv) else ""
        keys = {k.strip() for k in raw.split(",") if k.strip()}
        if not keys or not all(re.fullmatch(r"MA-\d+", k) for k in keys):
            print("jira-sync record --keys needs MA-n[,MA-m]")
            return 2
        if absent := sorted(keys - got, key=key_order):
            print(f"jira-sync: {argv[1]} does not hold {', '.join(absent)}; nothing recorded")
            return 2
        drifting = {row[0] for row in jira_drift([i for i in issues if i["key"] in keys], trace, False)}
        for i in issues:
            if i["key"] in keys and i["key"] in rows and i["key"] not in drifting:
                rec["issues"][i["key"]] = hashes(i)
        rec["pending"] = sorted((set(rec.get("pending", [])) - keys) | (drifting & keys), key=key_order)
        rec["missing"] = sorted(missing - keys, key=key_order)
        save()
        print(f"jira-sync: recorded {len(keys - drifting)} of {len(keys)} keys; last_sync stays {rec.get('last_sync')}")
        return 0
    if "--for-query" not in argv:
        print("jira-sync record needs --for-query (the file answers the saved query whole) or --keys MA-n[,MA-m] (only those keys)")
        return 2
    q = rec.get("query")
    if not isinstance(q, dict) or q.get("kind") not in ("full", "incremental") or not isinstance(q.get("keys"), list):
        print("jira-sync: no saved query to answer; run `jira-sync query` and read what it prints")
        return 2
    full = q["kind"] == "full"
    if not full and (absent := sorted(set(q["keys"]) - got, key=key_order)):
        print(f"jira-sync: {argv[1]} does not answer the saved query: it lacks {', '.join(absent)}, which the query names; "
              "nothing recorded (a key Jira does not have: record a full read, `query --all`, and it is kept in missing)")
        return 2
    if full and (lost := sorted(set(rec["issues"]) - got, key=key_order)):
        print(f"jira-sync: {argv[1]} is no full read: it lacks {', '.join(lost[:10])}, which Jira held at the last sync; nothing recorded")
        return 2
    at = q.get("at") or ""
    if not re.match(r"\d{4}-\d{2}-\d{2}", at):
        print("jira-sync: the saved query has no time; run `jira-sync query` again")
        return 2
    drift = jira_drift(issues, trace, full)
    rec["missing"] = sorted({k for k in rows if k not in got} if full else missing - got, key=key_order)
    drifting = {row[0] for row in drift} - set(rec["missing"])
    for i in issues:
        if i["key"] not in drifting and i["key"] in rows:
            rec["issues"][i["key"]] = hashes(i)
    rec["pending"] = sorted(drifting | ({k for k in rec.get("pending", []) if k not in got} if not full else set()), key=key_order)
    rec["last_sync"] = at
    rec["query"] = None  # answered: the next record needs a query of its own
    save()
    print(f"jira-sync: recorded {len(got - drifting)} issues at {at}; {len(rec['pending'])} still drifting"
          + (f"; missing in Jira: {', '.join(rec['missing'])}" if rec["missing"] else ""))
    return 0


def jira_selftest() -> tuple[int, int]:
    """R1-a2, R1-a3: record moves last_sync only for a file that answers the saved query, a one-key record never does,
    and a trace key Jira lacks is kept in missing, out of the query. On a small trace and a throwaway record."""
    trace = {"phases": [{"phase": 1, "epic": "MA-1", "title": "P", "plan_heading": "## Phase 1"}],
             "items": [{"key": k, "summary": k, "epic": "MA-1", "labels": [], "status": "To Do", "ui": False} for k in ("MA-10", "MA-11")],
             "others": [{"key": "MA-20", "summary": "MA-20", "status": "Done"}]}

    def issue(k: str) -> dict:
        r = repo_rows(trace)[k]
        return {"key": k, "duedate": r["duedate"]} if r.get("epic") else \
            {"key": k, "summary": r["summary"], "parent": r.get("parent"), "labels": r.get("labels", []), "status": r["status"]}
    bad = 0
    with tempfile.TemporaryDirectory() as t:
        path, answer = Path(t) / "jira-sync.json", Path(t) / "issues.json"

        def run(argv: list[str], keys: list[str] | None = None, now: str | None = None) -> tuple[int, str, dict]:
            if keys is not None:
                answer.write_text(json.dumps([issue(k) for k in keys]))
            out = io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
                code = jira_sync(trace, [argv[0], str(answer), *argv[1:]] if argv[0] != "query" else argv, path, now)
            return code, out.getvalue(), json.loads(path.read_text()) if path.exists() else {}
        steps = [
            ("the first query is a full read", lambda: run(["query"], now="2026-11-01T10:00:00+00:00"),
             lambda c, o, r: c == 0 and o.startswith("project = MA ORDER BY") and r["query"]["kind"] == "full"),
            ("a full answer moves last_sync and keeps a trace key Jira lacks in missing",
             lambda: run(["record", "--for-query"], ["MA-1", "MA-10", "MA-20"]),
             lambda c, o, r: c == 0 and r["last_sync"] == "2026-11-01T10:00:00+00:00" and r["missing"] == ["MA-11"] and not r["pending"]),
            ("a known-missing key stays out of the query", lambda: (trace["items"][0].update(summary="MA-10 renamed"),
                                                                    run(["query"], now="2026-11-02T10:00:00+00:00"))[1],
             lambda c, o, r: c == 0 and "key in (MA-10)" in o and "MA-11" not in o and r["query"]["keys"] == ["MA-10"]),
            ("a partial file is refused and leaves last_sync", lambda: run(["record", "--for-query"], ["MA-20"]),
             lambda c, o, r: c == 2 and r["last_sync"] == "2026-11-01T10:00:00+00:00" and r["query"]),
            ("a one-key record leaves last_sync", lambda: run(["record", "--keys", "MA-10"], ["MA-10"]),
             lambda c, o, r: c == 0 and r["last_sync"] == "2026-11-01T10:00:00+00:00" and r["issues"]["MA-10"]["jira"] == jira_hash(issue("MA-10"))),
            ("a one-key record of a key the file lacks is refused", lambda: run(["record", "--keys", "MA-20"], ["MA-10"]),
             lambda c, o, r: c == 2),
            ("compare reports a key Jira lacks", lambda: run(["compare"], ["MA-10"]), lambda c, o, r: "missing in Jira" in o and "MA-11" in o),
            ("a file that answers the saved query moves last_sync to the query's time", lambda: run(["record", "--for-query"], ["MA-10"]),
             lambda c, o, r: c == 0 and r["last_sync"] == "2026-11-02T10:00:00+00:00" and r["query"] is None and r["missing"] == ["MA-11"]),
            ("the same query recorded twice is refused", lambda: run(["record", "--for-query"], ["MA-10"]), lambda c, o, r: c == 2),
            ("a record that says neither --for-query nor --keys is refused", lambda: run(["record"], ["MA-10"]), lambda c, o, r: c == 2),
            ("a full answer lacking an issue Jira held is refused", lambda: (run(["query", "--all"]), run(["record", "--for-query"], ["MA-1", "MA-10"]))[1],
             lambda c, o, r: c == 2 and r["last_sync"] == "2026-11-02T10:00:00+00:00"),
        ]
        for what, act, ok in steps:
            try:
                good = ok(*act())
            except Exception as e:  # noqa: BLE001 - a case that cannot run is wrong, never skipped
                good, what = False, f"{what} ({type(e).__name__}: {e})"
            if not good:
                bad += 1
                print(f"FAIL: jira-sync, {what}")
    return bad, len(steps)


# The inputs the selftest's result depends on: its code, and the fixtures its cases read or mutate (MA-303).
SELFTEST_CODE = ("scripts/plan_sync.py", "scripts/confluence_docs.py", "scripts/confluence_record.py", "scripts/roadmap.py",
                 ".claude/hooks/plan_sync_hook.py")
SELFTEST_CACHE = ROOT / "review" / ".cache" / "plan_sync_selftest.json"
SELFTEST_DAYS = 7  # a recorded pass older than this is run again


def selftest_inputs(trace: dict) -> list[str]:
    fixtures = {rel for _, rel, _, _ in RECORD_CASES} | {"docs/trace.json"}  # the board-name cases read BOARD_SNIPPETS, here
    return list(SELFTEST_CODE) + sorted(fixtures - set(SELFTEST_CODE))


def selftest_digest(trace: dict) -> str:
    h = hashlib.sha256()
    for rel in selftest_inputs(trace):
        h.update(f"{rel}\0{_digest(ROOT / rel) or 'missing'}\0".encode())
    return h.hexdigest()


def _cache(path: Path | None = None, now: datetime.datetime | None = None) -> list[dict]:
    """The recorded passes still fresh: made between SELFTEST_DAYS ago and now. A time in the future is no pass (R1-a6)."""
    try:
        entries = json.loads((path or SELFTEST_CACHE).read_text()).get("passes", [])
    except (OSError, ValueError, AttributeError):
        return []
    now = now or datetime.datetime.now(datetime.timezone.utc)
    fresh = []
    for e in entries if isinstance(entries, list) else []:
        try:
            if datetime.timedelta(0) <= now - datetime.datetime.fromisoformat(e["time"]) <= datetime.timedelta(days=SELFTEST_DAYS):
                fresh.append(e)
        except (KeyError, TypeError, ValueError):
            pass
    return fresh


def reused(digest: str, force: bool, env: dict | None = None, path: Path | None = None) -> dict | None:
    """The fresh recorded pass for these inputs, unless the run is forced: `--force`, or PLAN_SYNC_SELFTEST_FORCE=1 in
    the environment (review_regress.py sets it, so the ledger's checks run the selftest again; R1-a106)."""
    env = os.environ if env is None else env
    if force or env.get("PLAN_SYNC_SELFTEST_FORCE") == "1":
        return None
    return next((e for e in _cache(path) if e.get("sha256") == digest), None)


def cache_selftest() -> tuple[int, int]:
    """R1-a6: a pass recorded in the future, or too long ago, is not reused, and the environment's force runs it again."""
    bad = 0
    now = datetime.datetime.now(datetime.timezone.utc)
    cases = [
        ("a pass an hour ago is reused", now - datetime.timedelta(hours=1), {}, True),
        ("a pass a day in the future is not reused", now + datetime.timedelta(days=1), {}, False),
        ("a pass eight days ago is not reused", now - datetime.timedelta(days=8), {}, False),
        ("PLAN_SYNC_SELFTEST_FORCE=1 runs it again", now - datetime.timedelta(hours=1), {"PLAN_SYNC_SELFTEST_FORCE": "1"}, False),
    ]
    with tempfile.TemporaryDirectory() as t:
        path = Path(t) / "cache.json"
        for what, at, env, want in cases:
            path.write_text(json.dumps({"passes": [{"sha256": "d", "time": at.isoformat(timespec="seconds"), "result": "PASS"}]}))
            if (reused("d", False, env, path) is not None) != want:
                bad += 1
                print(f"FAIL: selftest cache, {what}: {'reused' if not want else 'not reused'}")
    return bad, len(cases)


def selftest(trace: dict, force: bool = False) -> int:
    if bad_shape := shape_errors(trace):
        for e in bad_shape:
            print(f"DRIFT: {e}")
        return 1
    digest = selftest_digest(trace)
    if hit := reused(digest, force):
        print(f"selftest REUSED (code unchanged since {hit['time']}); `selftest --force` runs it again")
        return 0
    bad = 0
    titles: dict[str, set[str]] = {}
    for _, file, board, want in BOARD_CASES:
        if file not in BOARD_SNIPPETS:  # fails closed: a case with no snippet is wrong, never skipped
            bad += 1
            print(f"FAIL: the board-name case {board!r} needs a snippet of {file} in BOARD_SNIPPETS")
            continue
        got = board_ok(board, file, None, titles.setdefault(file, canvas_titles(BOARD_SNIPPETS[file], file)))
        if got != want:
            bad += 1
            print(f"FAIL: {board!r} in {file}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    bad += pr_selftest()
    cache_bad, cache_n = cache_selftest()
    jira_bad, jira_n = jira_selftest()
    bad += cache_bad + jira_bad
    bad += record_cases()
    # MA-260: the PR and edit hooks check the checkout a call acts on, a worktree included (it prints its own line).
    hook = ROOT / ".claude" / "hooks" / "plan_sync_hook.py"
    r = subprocess.run([sys.executable, "-I", str(hook), "selftest"], capture_output=True, text=True) if hook.is_file() else None
    print(r.stdout.strip() if r else "FAIL: the plan-sync hook selftest cannot run: .claude/hooks/plan_sync_hook.py is missing")
    bad += 0 if r and r.returncode == 0 else 1
    print(f"plan-sync selftest: {len(BOARD_CASES)} board names, {len(PR_CASES) + 1 + len(PR_RUN_CASES)} pr-files cases, "
          f"{cache_n} cache cases, {jira_n} jira-sync cases and {len(RECORD_CASES)} mutated records, {bad} wrong")
    if not bad:
        entries = [e for e in _cache() if e.get("sha256") != digest][-19:]
        entries.append({"sha256": digest, "time": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "result": "PASS"})
        try:
            SELFTEST_CACHE.parent.mkdir(parents=True, exist_ok=True)
            SELFTEST_CACHE.write_text(json.dumps({"about": "plan_sync.py selftest passes by input hash (MA-303); not committed",
                                                  "passes": entries}, indent=1) + "\n")
        except OSError as e:
            print(f"note: the selftest passed but its cache could not be written: {e}")
    return 1 if bad else 0


COMMANDS = ("check", "render", "start", "selftest", "pr-files", "jira-sync")


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(__doc__)
        return 2
    trace = load(TRACE)
    if argv[1] in ("render", "start", "pr-files", "jira-sync") and (bad := shape_errors(trace)):
        for e in bad:
            print(f"DRIFT: {e}")
        return 1
    if argv[1] == "render":
        TRACE_MD.write_text(render(trace))
        print(f"wrote {TRACE_MD.relative_to(ROOT)}")
        return 0
    if argv[1] == "selftest":
        return selftest(trace, force="--force" in argv[2:])
    if argv[1] == "pr-files":
        base = argv[argv.index("--base") + 1] if "--base" in argv[2:] and argv.index("--base") + 1 < len(argv) else "origin/main"
        if "--key" in argv[2:] and argv.index("--key") + 1 >= len(argv):
            print("pr-files: --key needs MA-<n>")
            return 2
        return pr_files(trace, base, argv[argv.index("--key") + 1] if "--key" in argv[2:] else None)
    if argv[1] == "jira-sync":
        return jira_sync(trace, argv[2:])
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
    items = trace.get("items") if isinstance(trace, dict) and isinstance(trace.get("items"), list) else []
    print(f"plan-sync: {len(items)} items, {len(errors)} drift, {len(warnings)} notes")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
