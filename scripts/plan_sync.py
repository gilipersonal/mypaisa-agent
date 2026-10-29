#!/usr/bin/env python3
"""Keep the plan, the designs, Jira, Confluence and the code in step (MA-155, MA-228).

The repo-side half of the plan-sync check. It reads docs/trace.json (the
schema is in .claude/skills/plan-sync/reference/trace-schema.md) against
ARCHITECTURE.md, PLAN.md, the other docs, the Claude Design mirror, the
roadmap (scripts/roadmap.py), the Confluence pages rendered from them
(scripts/confluence_docs.py) and the code each story names. The Jira, Claude
Design and live Confluence halves need their MCP tools and live in /plan-sync.

    python3 scripts/plan_sync.py check         # fail on drift (a jira-flow gate and a CI job)
    python3 scripts/plan_sync.py render        # rewrite docs/TRACE.md from the trace
    python3 scripts/plan_sync.py start MA-149  # what a story needs before work starts
    python3 scripts/plan_sync.py selftest      # board names, dates and motion roles against known cases, check on a mutated board,
                                               # and scripts/design_sync.py's offline selftest (CI)
"""
from __future__ import annotations

import datetime
import hashlib
import shutil
import subprocess
import tempfile
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
TRACE = ROOT / "docs" / "trace.json"
TRACE_MD = ROOT / "docs" / "TRACE.md"
MIRROR = ROOT / "docs" / "design" / "claude-design.json"
ARCH = ROOT / "ARCHITECTURE.md"
PLAN = ROOT / "PLAN.md"
CITING = [ARCH, PLAN, ROOT / "TECH_STACK.md", ROOT / "README.md", ROOT / "docs" / "design" / "README.md"]
KEY = re.compile(r"\bMA-(\d+)\b")
DESIGN_STATES = {"none", "planned", "picked", "todo"}
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
        own = path.name.removesuffix(".dc.html")

        def title(c: str) -> bool:
            return (bool(re.search(r"\w", c)) and not code.search(c) and len(c) <= 100 and ". " not in c
                    and not c.endswith(".") and not re.search(r":\s*intro$", c, re.I) and c != own)

        _captions[path] = {c for c in caps if c and title(c)}
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
    for c in it.get("code", []):
        if not c or c.startswith("/") or ".." in c or not any(ROOT.glob(c.rstrip("/"))):
            errors.append(f"{k}: code path {c!r} matches nothing in the repo")
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


def mirror_errors(mirror: object) -> list[str]:
    """docs/design/claude-design.json: {project: {"files": {name: {etag, bytes, sha256}}}}."""
    if not isinstance(mirror, dict):
        return ["docs/design/claude-design.json must hold an object"]
    errors = []
    for proj, meta in mirror.items():
        files = meta.get("files") if isinstance(meta, dict) else None
        if not isinstance(files, dict):
            errors.append(f"claude-design.json: {proj} needs a files object")
            continue
        errors += [f"claude-design.json: {proj}/{name} must be an object" for name, e in files.items() if not isinstance(e, dict)]
    return errors


_MONTHS = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
_DAYS = "Mon Tue Wed Thu Fri Sat Sun".split()
_DATE = re.compile(r"\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{4}))?\b")


def _plain(text: str) -> str:
    """A board's text as dates are read in it: a tag becomes a space (so "Thu&nbsp;<b>23 Oct</b>" reads as a date and
    "23 Oct</span>wifi" keeps its word end), and a script's or style's body is read as raw text, never as tags, so a
    comparison such as "i<n" or "a < b" cannot swallow the text after it."""
    out, pos = [], 0
    for m in re.finditer(r"<(script|style)\b[^>]*>(.*?)</\1\s*>", text, re.S | re.I):
        out.append(re.sub(r"<[A-Za-z/!][^>]*>", " ", text[pos:m.start()]))
        out.append(" " + m.group(2) + " ")
        pos = m.end()
    out.append(re.sub(r"<[A-Za-z/!][^>]*>", " ", text[pos:]))
    return html.unescape("".join(out)).replace("\xa0", " ")


def date_errors(text: str) -> list[str]:
    """Each weekday-and-date on a board ("Fri 23 Oct") whose weekday is wrong (MA-161 review: lesson 10, dates agree).
    The boards are set in October 2026: a date with no year is right if its weekday fits 2026, or 2027 for January
    to September (a date ahead, such as the next results day)."""
    bad = []
    plain = _plain(text)
    for m in _DATE.finditer(plain):
        day, num, mon, year = m.group(1), int(m.group(2)), _MONTHS[m.group(3)], m.group(4)
        years = [int(year)] if year else ([2026, 2027] if mon < 10 else [2026])
        fits = False
        for y in years:
            try:
                fits = fits or _DAYS[datetime.date(y, mon, num).weekday()] == day
            except ValueError:
                pass
        if not fits:
            bad.append(m.group(0))
    return sorted(set(bad))


def agent_tools() -> set[str]:
    """The agent's tools as ARCHITECTURE 8 lists them (its **Tools:** paragraph)."""
    m = re.search(r"\*\*Tools:\*\*(.*?)\n\n", ARCH.read_text(), re.S) if ARCH.exists() else None
    return set(re.findall(r"`([a-z]+(?:_[a-z]+)+)", m.group(1))) if m else set()


def tool_errors(text: str, tools: set[str]) -> list[str]:
    """Each tool a board's run or Activity row names that ARCHITECTURE 8 does not define (MA-161 review, rounds 3 and
    4: read_file, read_image and render_chart survived from the Telegram era beside extract_document and chart_series)."""
    found = set(re.findall(r"\b(?:" + "|".join(_RETIRED_TOOLS) + r")\b", text))  # retired names, refused anywhere
    for ctx in re.findall(r"tools\w*:\s*(\[\[.*?\]\]|'[^']*')|<span>Tools</span><span>([^<]*)", text, re.S):
        found |= set(re.findall(r"\b[a-z]+(?:_[a-z]+)+\b", " ".join(ctx)))
    return sorted(found - tools)


_RETIRED_TOOLS = ("read_file", "read_image", "render_chart")  # Telegram-era names, never the app's


_MOTION_NEEDS = {"label": "mp-chartlbl", "dot": "mp-chartdot"}


def stroke_errors(text: str) -> list[str]:
    """Each <use> that draws a shared SVG def holding a line or a path (a line, path, polyline, polygon, circle or
    ellipse). The copy is drawn from a def outside the chart's own SVG, so the kit's non-scaling-stroke rule never
    reaches it, and under preserveAspectRatio="none" its strokes stretch with the box (MA-281 review, round 1: every
    candle's wick drew wider than its body). In a stretched SVG a shared def holds filled rects only; strokes belong
    in the chart's own SVG. A <use> there of a def the board does not hold is refused too. An SVG scaled evenly (the
    logo, an icon) is not stretched, so its <use> is left alone."""
    defs = {}
    for m in re.finditer(r"""<(g|symbol)\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>""", text):
        depth, i = 1, m.end()
        for t in re.finditer(r"<(/?)(g|symbol)\b[^>]*>", text[i:]):   # to the def's own closing tag, nested groups included
            depth += -1 if t.group(1) else 1
            if depth == 0:
                defs[m.group(2)] = text[i:i + t.start()]
                break
        else:
            defs[m.group(2)] = text[i:]
    bad = []
    # Only an SVG stretched to its box draws a <use> wrong: a mark scaled evenly (a logo, an icon) keeps its strokes.
    stretched = "".join(m.group(1) for m in re.finditer(
        r"""<svg\b[^>]*\spreserveAspectRatio\s*=\s*["']?none["']?[^>]*>(.*?)</svg>""", text, re.S | re.I))
    for m in re.finditer(r"""<use\b[^>]*?\s(?:xlink:)?href\s*=\s*["']?#([^"'\s>]+)""", stretched):
        if "{{" in m.group(1):
            continue  # an id the template fills in cannot be read here
        body = defs.get(m.group(1))
        if body is None:
            bad.append(f"a <use> of #{m.group(1)}, which it does not define")
        elif re.search(r"<(line|path|polyline|polygon|circle|ellipse)\b", body):
            bad.append(f"a <use> of #{m.group(1)}, a shared def that draws lines or paths (draw them in the chart's own SVG)")
    return sorted(set(bad))


def motion_errors(text: str) -> list[str]:
    """Each element a board gives the label or dot motion role without the class whose transform that role's keyframe
    ends on: the arrival would leave it moved by half its size or more (MA-161 review, round 2: chart axes and a dot
    shifted off their cards once the motion settled, correct only with ?static=1)."""
    bad = []
    for m in re.finditer(r"<[a-z][\w-]*\b[^>]*\sdata-mo\s*=\s*[\"']?(label|dot)\b[^>]*>", text):
        cls = re.search(r"""\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""", m.group(0))
        names = (cls.group(1) or cls.group(2) or cls.group(3) or "").split() if cls else []
        if _MOTION_NEEDS[m.group(1)] not in names:
            bad.append(f'data-mo="{m.group(1)}" on class "{" ".join(names)}" (use data-mo="fade")')
    # motion.js gives every .mp-chartlbl and .mp-chartdot its role at run time, and the arrival's keyframe overrides
    # any transform that is not !important. So on a board that loads motion.js, refuse a transform that reaches a chart
    # label or dot other than the one its keyframe ends on: through a rule naming the class in any order or position,
    # a rule for another class the element carries, or an inline style.
    if "motion.js" not in text:
        return sorted(set(bad))
    ends = {"mp-chartlbl": "translate(-50%,-100%)", "mp-chartdot": "translate(-50%,-50%)"}
    carried, static, templated = {}, set(), set()
    for m in re.finditer(r"<[a-z][\w-]*\b[^>]*>", text):
        cls = re.search(r"""\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""", m.group(0))
        raw = (cls.group(1) or cls.group(2) or cls.group(3) or "") if cls else ""
        names = [n for n in re.sub(r"\{\{.*?\}\}", " ", raw).split()]
        static |= set(names)
        for base in ends:
            if base in names and "{{" in raw:
                templated.add(base)  # a class given by the template (Browser's {{ m.pos }}) cannot be read here
            if base in names:
                for n in names:
                    if n != base:
                        carried.setdefault(n, base)
                st = re.search(r"""\sstyle\s*=\s*["']([^"']*)""", m.group(0))
                if st and re.search(r"(?<![\w-])transform\s*:", st.group(1)) and "!important" not in st.group(1):
                    bad.append(f"an inline transform on a .{base} (add !important to that transform)")
    for m in re.finditer(r"([^{}]*)\{([^{}]*)\}", "\n".join(re.findall(r"<style\b[^>]*>(.*?)</style>", text, re.S | re.I))):
        sel = " ".join(m.group(1).split(";")[-1].split())
        decl = re.search(r"(?<![\w-])transform\s*:\s*([^;}]*)", m.group(2))
        if not decl or "!important" in decl.group(1):
            continue
        val = decl.group(1).replace(" ", "")
        for part in sel.split(","):
            last = part.strip().split()[-1] if part.strip() else ""
            classes = set(re.findall(r"\.([\w-]+)", last))
            hit = [b for b in ends if b in part] + [carried[c] for c in classes if c in carried]
            if not hit and templated and re.fullmatch(r"(?:\.[\w-]+)+", part.strip()) and not classes & static:
                hit = sorted(templated)  # a class-only rule for a class no element carries in the markup: the template's
            for base in hit:
                if val != ends[base]:
                    bad.append(f"its own transform on '{part.strip()}', which reaches a .{base} (add !important to that transform)")
    return sorted(set(bad))


def disk_errors(projects: dict, mirror: dict, root: Path = ROOT) -> list[str]:
    """The copies on disk against docs/design/claude-design.json: nothing unrecorded, nothing missing, every copy's bytes
    and sha256 as recorded. scripts/design_sync.py checks the record against Claude Design and calls this too."""
    errors = []
    for proj_key, proj in projects.items():
        if not isinstance(proj, dict) or not isinstance(proj.get("dir"), str):
            errors.append(f"claude_design.{proj_key} needs a dir")
            continue
        recorded = mirror.get(proj_key, {}).get("files", {})
        base = root / proj["dir"]
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
    return errors


def check(trace: dict) -> tuple[list[str], list[str]]:
    errors, warnings = shape_errors(trace) or mirror_errors(load(MIRROR) if MIRROR.exists() else {}), []
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

    # The mirror matches what is on disk, and nothing on disk is unrecorded (Claude Design's side: scripts/design_sync.py).
    errors += disk_errors(ctx["projects"], ctx["mirror"])
    for proj_key, proj in ctx["projects"].items():
        if not isinstance(proj, dict) or not isinstance(proj.get("dir"), str):
            continue
        for name in ctx["mirror"].get(proj_key, {}).get("files", {}):
            path = ROOT / proj["dir"] / name
            if path.is_file() and name.endswith(".html"):
                for d in date_errors(path.read_text()):
                    errors.append(f"board date: {proj['dir']}/{name} says {d!r}, a wrong weekday")
                for d in tool_errors(path.read_text(), ctx.setdefault("tools", agent_tools())):
                    errors.append(f"board tool: {proj['dir']}/{name} names {d!r}, which ARCHITECTURE 8's Tools do not define")
                for d in motion_errors(path.read_text()):
                    errors.append(f"board motion: {proj['dir']}/{name} has {d}: the settled arrival would move it")
                for d in stroke_errors(path.read_text()):
                    errors.append(f"board stroke: {proj['dir']}/{name} has {d}: its strokes stretch with the chart")

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
    claimed = [c.rstrip("/") for it in trace.get("items", []) for c in it.get("code", []) if isinstance(c, str)]
    for d in CODE_DIRS:
        for f in sorted((ROOT / d).rglob("*")) if (ROOT / d).is_dir() else []:
            rel = f.relative_to(ROOT).as_posix()
            if f.is_file() and not any(f.match(c) or rel == c or rel.startswith(c + "/") for c in claimed):
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
# Tool names the check must accept and refuse against a stand-in list (MA-161 review, round 4, e1).
TOOL_CASES = [
    ("tools: [['get_portfolio', '140 ms'], ['chart_series', '80 ms']]", True), ("tools: 'extract_document, propose_change'", True),
    ("tools: [['render_chart', '80 ms']]", False), ("<span>Tools</span><span>read_image, propose_change</span>", False),
    ("toolsW: 'get_signals, render_chart'", False), ("line: 'Sonnet · 2 calls · read_image'", False),
]

# Motion roles the check must accept and refuse (MA-161 review, round 2, e3).
STROKE_CASES = [  # MA-281 review, round 1: a shared def under a stretched viewBox
    ('<svg><defs><g id="c"><rect class="cb" x="1" y="1" width="1" height="2"></rect></g></defs></svg><svg viewBox="0 0 100 100" preserveAspectRatio="none"><use href="#c"></use></svg>', True),
    ('<svg><defs><g id="c"><line class="wk" x1="1" x2="1" y1="0" y2="9"></line></g></defs></svg><svg viewBox="0 0 100 100" preserveAspectRatio="none"><use href="#c"></use></svg>', False),
    ('<svg><defs><g id="c"><path d="M0 0 L9 9"></path></g></defs></svg><svg preserveAspectRatio="none"><use xlink:href="#c"></use></svg>', False),
    ("<svg><defs><g id='c'><g><rect></rect></g><polyline points='0,0 1,1'></polyline></g></defs></svg><svg preserveAspectRatio='none'><use href='#c'></use></svg>", False),
    ('<svg><defs><symbol id="c"><circle r="2"></circle></symbol></defs></svg><svg preserveAspectRatio=none><use href="#c"></use></svg>', False),
    ('<svg preserveAspectRatio="none"><use href="#nowhere"></use></svg>', False),
    ('<svg preserveAspectRatio="none"><path class="sim" d="M0 0 L9 9"></path></svg>', True),
    ('<svg><defs><g id="mark"><path d="M0 0 L9 9"></path></g></defs></svg><svg viewBox="0 0 24 24"><use href="#mark"></use></svg>', True),
    ('<svg preserveAspectRatio="none"><use href="#m{{ t.id }}"></use></svg>', True),
]
MOTION_CASES = [
    ('<span class="mp-chartlbl" data-mo="label">', True), ('<div class="mp-chartdot x" data-mo="dot">', True),
    ('<div class="hax" data-mo="label">', False), ('<div data-mo="dot" class="edot">', False),
    ('<div class="gut" data-mo="fade">', True), ('<p data-mo="label">', False),
    ("<div class='hax' data-mo='label'>", False), ('<div class=hax data-mo=label>', False),
    ('<div data-class="mp-chartlbl" class="hax" data-mo="label">', False),
    ('<script src="motion.js"></script><style>.mp-chartlbl.al { transform: translate(-100%, -100%); }</style>', False),
    ('<script src="motion.js"></script><style>.mp-chartlbl.al { transform: translate(-100%, -100%) !important; }</style>', True),
    ('<script src="motion.js"></script><style>.al.mp-chartlbl { transform: translate(-100%, 0); }</style>', False),
    ('<script src="motion.js"></script><style>.pbox .mp-chartdot { transform: scale(2); }</style>', False),
    ('<script src="motion.js"></script><style>.mp-chartlbl:last-child { transform: none; }</style>', False),
    ('<script src="motion.js"></script><style>.lbl-ul { transform: translate(0, 0); }</style><span class="mp-chartlbl lbl-ul">', False),
    ('<script src="motion.js"></script><span class="mp-chartdot" style="transform: scale(2)">', False),
    ('<script src="motion.js"></script><style>.mp-chartlbl { transform: translate(-50%, -100%); }</style>', True),
    ('<script src="motion.js"></script><span class="mp-chartlbl lbl-h {{ l.cls }}">', True),
    ('<script src="motion.js"></script><style>.al { transform: translate(-100%, -100%); }</style><span class="mp-chartlbl {{ m.pos }}">', False),
    ('<script src="motion.js"></script><style>.al { transform: translate(-100%, -100%) !important; }</style><span class="mp-chartlbl {{ m.pos }}">', True),
    ('<style>.mp-chartlbl.al { transform: translate(-100%, -100%); }</style>', True),  # no motion.js: nothing animates, so nothing moves it
]

# Board dates the check must accept and refuse (MA-161 review, round 1: e3's timeline and lesson 10).
DATE_CASES = [
    ("Fri 23 Oct", True), ("Fri, 2 Oct", True), ("Sun 4 Oct", True), ("Mon 26 Oct 21:16", True),
    ("Thu 29 Apr", True),            # next April's results day, 2027
    ("Thu 23 Oct", False), ("Tue 20 Oct 2025", False), ("Wed 28 Oct", True), ("Sat 31 Oct", True),
    ("Fri 31 Sep", False), ("Thursday 22 October", True), ("Thursday 23 October", False),
    ("Thu&nbsp;23 Oct", False), ("Fri&nbsp;23 Oct", True), ("Thu <b>23 Oct</b>", False), ("Thu 23rd Oct", False),
    ('<span>9:41 Thu 23 Oct</span><span class="ms">wifi</span>', False), ("a < b; 'Thu 23 Oct'; c > d", False),
    ("<script>for(i=0;i<days.length;i++){s='Thu 23 Oct'} if(a>b){}</script>", False),
]

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
    ("app", "Telegram admin.dc.html", "Telegram admin: intro", False),
    ("app", "Telegram admin.dc.html", "Telegram · Telegram admin: intro", False),
    ("app", "Currency check.dc.html", "Currency check: intro", False), ("app", "Admin center 2.dc.html", "Admin center 2", False),
    ("ds", "MyPaisa DS v1.dc.html", "Telegram draws the bubble and buttons; MyPaisa owns the PNG, the words and their order.", False),
    ("ds", "MyPaisa DS v1.dc.html", "1a · Warm ledger", True),
    ("app", "Browser.dc.html", "Browser · Browser boards 1 to 4", False), ("app", "Mini App.dc.html", "Mini App · Mini App screens", False),
    # MA-161: the iOS boards. An option chip quoted in prose before its label must not hide the label.
    ("ios", "Shell options.dc.html", "1a · Chat first", True), ("ios", "Shell options.dc.html", "1c · One timeline", True),
    ("ios", "Shell options.dc.html", "1d · Chat first", False), ("ios", "iPhone chat.dc.html", "iPhone · Chat home", True),
    ("ios", "iPhone chat.dc.html", "Chat home", False), ("ios", "iPhone chat.dc.html", "iPad · Chat home", False),
    ("ios", "iPad and foldable.dc.html", "Foldable · Open", True), ("ds", "iOS kit.dc.html", "12 · Motion", True),
]


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
     lambda s: re.sub(r"(?ms)^(## 23\. [^\n]*\n).*", r"\1", s), r"guardrails page: ARCHITECTURE §23 has no body"),
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
    ("a preview older than its boards", "docs/confluence.json",
     lambda m: (next(v for k, v in m["images"].items() if k.startswith("phase-05")).update({"source": "0"}), m)[1],
     r"preview phase-05-\S+ is older than its boards"),
]


def record_cases() -> int:
    bad = 0
    for what, rel, mutate, words in RECORD_CASES:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "scripts").mkdir()
            for script in ("plan_sync.py", "roadmap.py", "confluence_docs.py", "confluence_record.py"):
                if (Path(__file__).parent / script).exists():
                    shutil.copy(Path(__file__).parent / script, root / "scripts" / script)
            for f in ("ARCHITECTURE.md", "PLAN.md", "TECH_STACK.md", "README.md"):
                if (ROOT / f).exists():
                    shutil.copy(ROOT / f, root / f)
            shutil.copytree(ROOT / "docs", root / "docs")
            target = root / rel
            if not target.exists():
                bad += 1
                print(f"FAIL: the case {what!r} needs {rel}")
                continue
            if mutate is None:
                target.unlink()
            elif rel.endswith(".json"):
                target.write_text(json.dumps(mutate(json.loads(target.read_text())), indent=1, ensure_ascii=False) + "\n")
            else:
                target.write_text(mutate(target.read_text()))
            r = subprocess.run([sys.executable, "-I", str(root / "scripts" / "plan_sync.py"), "check"], capture_output=True, text=True)
            if r.returncode == 0 or not re.search(words, r.stdout):
                bad += 1
                print(f"FAIL: check passed {what} (exit {r.returncode}; wanted {words!r})")
    return bad


def selftest(trace: dict) -> int:
    if bad_shape := shape_errors(trace):
        for e in bad_shape:
            print(f"DRIFT: {e}")
        return 1
    dirs = {k: v.get("dir") for k, v in trace.get("claude_design", {}).items()}
    bad = 0
    for proj, file, board, want in BOARD_CASES:
        if proj not in dirs or not (ROOT / dirs[proj] / file).is_file():
            bad += 1
            print(f"DRIFT: selftest needs {proj}/{file}, which the trace or the mirror does not have")
            continue
        got = board_ok(board, file, ROOT / dirs[proj] / file)
        if got != want:
            bad += 1
            print(f"FAIL: {board!r} in {file}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    for text, want in DATE_CASES:
        got = not date_errors(text)
        if got != want:
            bad += 1
            print(f"FAIL: date {text!r}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    stand_in = {"get_portfolio", "chart_series", "extract_document", "propose_change"}
    for text, want in TOOL_CASES:
        got = not tool_errors(text, stand_in)
        if got != want:
            bad += 1
            print(f"FAIL: tools {text!r}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    if not {"extract_document", "chart_series", "propose_change"} <= agent_tools():
        bad += 1
        print("FAIL: ARCHITECTURE 8's Tools paragraph could not be read")
    for text, want in STROKE_CASES:
        got = not stroke_errors(text)
        if got != want:
            bad += 1
            print(f"FAIL: stroke {text!r}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    for text, want in MOTION_CASES:
        got = not motion_errors(text)
        if got != want:
            bad += 1
            print(f"FAIL: motion {text!r}: {'accepted' if got else 'refused'}, should be {'accepted' if want else 'refused'}")
    # The date check bites inside `check` itself: a copy of the repo with one mirrored board given a wrong weekday
    # (its bytes and sha256 recorded, so only the date is wrong) must be refused, naming the board date.
    board = "docs/design/ios-v1/iPhone chat.dc.html"
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "scripts").mkdir()
        for script in ("plan_sync.py", "roadmap.py", "confluence_docs.py", "confluence_record.py"):
            if (Path(__file__).parent / script).exists():  # a lone copy of this file still runs its board cases
                shutil.copy(Path(__file__).parent / script, root / "scripts" / script)
        for f in ("ARCHITECTURE.md", "PLAN.md", "TECH_STACK.md", "README.md"):
            if (ROOT / f).exists():
                shutil.copy(ROOT / f, root / f)
        shutil.copytree(ROOT / "docs", root / "docs")
        target = root / board
        text = target.read_text() if target.exists() else ""
        if "Fri 23 Oct" not in text or 'data-mo="fade"' not in text:
            bad += 1
            print(f"FAIL: the mutated-board selftest needs 'Fri 23 Oct' and a data-mo=\"fade\" in {board}")
        else:
            text = text.replace("Fri 23 Oct", "Thu 23 Oct", 1)
            text = re.sub(r'data-mo="fade"', 'data-mo="label"', text, count=1)  # a label role on a non-label element
            target.write_text(text)
            m = json.loads((root / "docs/design/claude-design.json").read_text())
            rec = m["ios"]["files"][Path(board).name]
            rec["bytes"], rec["sha256"] = target.stat().st_size, sha256(target)
            tools_board = root / "docs/design/ios-v1/iPhone audit and activity.dc.html"
            if tools_board.exists() and "chart_series" in tools_board.read_text():
                tools_board.write_text(tools_board.read_text().replace("chart_series", "render_chart", 1))  # a tool §8 lacks
                rec = m["ios"]["files"][tools_board.name]
                rec["bytes"], rec["sha256"] = tools_board.stat().st_size, sha256(tools_board)
            else:
                bad += 1
                print("FAIL: the mutated-board selftest needs 'chart_series' in iPhone audit and activity.dc.html")
            stroke_board = root / "docs/design/ios-v1/iPhone v4 · Forecast.dc.html"
            if stroke_board.exists() and '<rect class="cw' in stroke_board.read_text():
                stroke_board.write_text(stroke_board.read_text().replace('<rect class="cw', '<line class="cw', 1))  # a stroked wick in the shared def
                rec = m["ios"]["files"][stroke_board.name]
                rec["bytes"], rec["sha256"] = stroke_board.stat().st_size, sha256(stroke_board)
            else:
                bad += 1
                print("FAIL: the mutated-board selftest needs a shared candle def (<rect class=\"cw\") in iPhone v4 · Forecast.dc.html")
            (root / "docs/design/claude-design.json").write_text(json.dumps(m, indent=2) + "\n")
            r = subprocess.run([sys.executable, "-I", str(root / "scripts" / "plan_sync.py"), "check"], capture_output=True, text=True)
            for what in ("board date", "board motion", "board tool", "board stroke"):
                if r.returncode == 0 or what not in r.stdout:
                    bad += 1
                    print(f"FAIL: check passed a board with a wrong {what.split()[1]} (exit {r.returncode})")
    bad += record_cases()
    # MA-260: the PR and edit hooks check the checkout a call acts on, a worktree included (it prints its own line).
    hook = ROOT / ".claude" / "hooks" / "plan_sync_hook.py"
    r = subprocess.run([sys.executable, "-I", str(hook), "selftest"], capture_output=True, text=True) if hook.is_file() else None
    print(r.stdout.strip() if r else "FAIL: the plan-sync hook selftest cannot run: .claude/hooks/plan_sync_hook.py is missing")
    bad += 0 if r and r.returncode == 0 else 1
    # MA-259: Claude Design against the mirror, offline, against a stand-in built from the mirror (it prints its own line).
    try:
        import design_sync  # noqa: PLC0415
    except ImportError as e:  # fails closed, as the roadmap and Confluence checks do
        bad += 1
        print(f"FAIL: the design-sync selftest cannot run: {e}")
    else:
        bad += design_sync.selftest()
    # The review ledgers read this line: keep "tool names and one mutated board, <n> wrong" as it is.
    print(f"plan-sync selftest: {len(BOARD_CASES)} board names, {len(DATE_CASES)} dates, {len(MOTION_CASES)} motion roles, {len(STROKE_CASES)} shared strokes, {len(TOOL_CASES)} tool names and one mutated board, {bad} wrong, counting {len(RECORD_CASES)} mutated records")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("check", "render", "start", "selftest"):
        print(__doc__)
        return 2
    trace = load(TRACE)
    if argv[1] in ("render", "start") and (bad := shape_errors(trace) or (argv[1] == "start" and mirror_errors(load(MIRROR) if MIRROR.exists() else {}))):
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
    items = trace.get("items") if isinstance(trace, dict) and isinstance(trace.get("items"), list) else []
    print(f"plan-sync: {len(items)} items, {len(errors)} drift, {len(warnings)} notes")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
