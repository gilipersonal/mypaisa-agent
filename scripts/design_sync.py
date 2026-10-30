#!/usr/bin/env python3
"""The boards in docs/design/, their record and the MyPaisa Boards Artifact stay the same (MA-260).

Since 30 Oct 2026 the boards are drawn and edited in the repo and nowhere else (MA-259's option B): in the folders
docs/trace.json's `claude_design` names (docs/design/ios-v1/, ds-v1/ and app-v1/; the key, the folders' names and the
record's file name were standalone Claude Design's, and are history). Nothing here reads from or writes to Claude
Design. docs/design/claude-design.json is the repo's record of every file in those folders: per project its `dir` and,
per file, its `bytes` and `sha256`. Arun looks at the whole set in the MyPaisa Boards Artifact (BOARDS_ARTIFACT below),
built by scripts/boards_page/build.py and republished to the same link whenever a board changes, before the PR;
docs/design/boards-artifact.json stamps the record it was published from.

    python3 scripts/design_sync.py record      # after drawing or editing boards: record each file's bytes and sha256, add new files
    python3 scripts/design_sync.py record --drop docs/design/app-v1/Old.dc.html   # forget a recorded file that is meant to be gone
    python3 scripts/design_sync.py check       # offline: the files, their record and the Boards Artifact's stamp agree
    python3 scripts/design_sync.py published   # after republishing the Boards Artifact: stamp it with the record
    python3 scripts/design_sync.py selftest    # each refusal on a mutated copy (plan_sync.py selftest runs it)

`check` (the design-sync gate in .claude/jira-flow.json, the PR hook and CI) fails closed. It fails on a file whose
bytes or sha256 no longer match its record, a file in a board folder the record does not list, a recorded file that is
missing, a record it cannot read or that holds anything but its about line, each project's dir and each file's bytes
and sha256 (an etag left from Claude Design included), a project the trace and the record do not agree on, and a
missing or unreadable stamp, or one older than the record (its record_sha256 is not the record file's sha256 now):
"the MyPaisa Boards Artifact was published before these boards changed: rebuild and republish it". `record` writes
nothing unless it can record every file: a recorded file that is gone stays recorded, and check reports it, until Arun
says it was meant to go and `record --drop <dir>/<file>` (the path from the repo's top, as check prints it) forgets it;
a --drop of a file still on disk, or of one the record does not list, is refused. `published` refuses to stamp boards
that are not recorded. The Finder's .DS_Store is never a board and never recorded. The board-level checks (names,
dates, motion roles, tools, strokes) are scripts/plan_sync.py check's.
"""
from __future__ import annotations

import datetime
import hashlib
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import plan_sync  # noqa: E402

ROOT = plan_sync.ROOT
RECORD = Path("docs/design/claude-design.json")
STAMP = Path("docs/design/boards-artifact.json")
BOARDS_ARTIFACT = "https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g"
ABOUT = "The repo's record of every board file since MA-260 (30 Oct 2026); the name is history."
STAMP_ABOUT = ("The MyPaisa Boards Artifact was last published from docs/design/claude-design.json as it was when its sha256 "
               "was record_sha256; written by `python3 scripts/design_sync.py published` (MA-260).")
STALE = "the MyPaisa Boards Artifact was published before these boards changed: rebuild and republish it"
REPUBLISH = (f"`python3 scripts/boards_page/build.py docs/design <out-dir>`, publish <out-dir>/index.html with the Artifact tool "
             f"to {BOARDS_ARTIFACT} (root docs/design, the files in <out-dir>/files.json), then "
             "`python3 scripts/design_sync.py published`")
NOT_BOARDS = plan_sync.NOT_BOARDS


class SyncError(Exception):
    pass


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as e:
        raise SyncError(f"{path.name} cannot be read: {e}") from None


def projects(root: Path) -> dict[str, dict]:
    """The board folders, from docs/trace.json's claude_design: {key: {dir, ...}}; each dir under docs/design/."""
    projs = load(root / "docs" / "trace.json").get("claude_design")
    if not isinstance(projs, dict) or not projs or not all(
            isinstance(p, dict) and isinstance(p.get("dir"), str) and re.fullmatch(r"docs/design/[^/.][^/]*", p["dir"])
            for p in projs.values()):
        raise SyncError("docs/trace.json's claude_design must name each board folder's dir, a folder in docs/design/")
    return projs


def files_on_disk(root: Path, d: str) -> dict[str, Path]:
    base = root / d
    return {f.relative_to(base).as_posix(): f for f in sorted(base.rglob("*"))
            if f.is_file() and f.name not in NOT_BOARDS} if base.is_dir() else {}


def entry(path: Path) -> dict:
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def dump(record: dict) -> str:
    """The record as record writes it: the about line, then each project's dir and its files in name order."""
    out = {"about": record.get("about", ABOUT)}
    for k in sorted(k for k in record if k != "about"):
        out[k] = {"dir": record[k]["dir"], "files": dict(sorted(record[k]["files"].items()))}
    return json.dumps(out, indent=2, ensure_ascii=False) + "\n"


def stamp_errors(root: Path) -> list[str]:
    """The Boards Artifact's stamp against the record as it is on disk."""
    if not (root / RECORD).is_file():
        return [f"boards: {RECORD} is missing, so no stamp can match it"]
    try:
        stamp = load(root / STAMP)
    except SyncError as e:
        if not (root / STAMP).exists():
            return [f"boards: {STAMP} is missing: publish the MyPaisa Boards Artifact ({REPUBLISH})"]
        return [f"boards: {e}"]
    if not isinstance(stamp, dict):
        return [f"boards: {STAMP} must hold an object"]
    errors = []
    if stamp.get("url") != BOARDS_ARTIFACT:
        errors.append(f"boards: {STAMP} stamps {stamp.get('url')!r}, not the MyPaisa Boards Artifact ({BOARDS_ARTIFACT})")
    if not isinstance(stamp.get("record_sha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", stamp["record_sha256"]):
        errors.append(f"boards: {STAMP} has no record_sha256")
    try:
        datetime.date.fromisoformat(stamp.get("date"))
    except (TypeError, ValueError):
        errors.append(f"boards: {STAMP} has no date (YYYY-MM-DD)")
    if not errors and stamp["record_sha256"] != plan_sync.sha256(root / RECORD):
        errors.append(f"boards: {STALE} ({REPUBLISH})")
    return errors


def record_errors(root: Path) -> tuple[dict, dict, list[str]]:
    """The trace's board folders, the record, and every way the files on disk differ from it (plan_sync.disk_errors)."""
    projs, record = projects(root), load(root / RECORD)
    errors = plan_sync.mirror_errors(record)
    return projs, record, errors or plan_sync.disk_errors(projs, record, root)


def report(lines: list[str], errors: list[str], files: int | None, out=print) -> int:
    for ln in lines:
        out(ln)
    for e in errors:
        out(f"DRIFT: {e}")
    out(f"design-sync: {'?' if files is None else files} files recorded, {len(errors)} drift")
    return 1 if errors else 0


def check(root: Path = ROOT, out=print) -> int:
    try:
        _, record, errors = record_errors(root)
    except SyncError as e:
        return report([], [f"boards: {e}"], None, out)
    files = sum(len(v.get("files", {})) for k, v in record.items() if k != "about" and isinstance(v, dict))
    return report([], errors + stamp_errors(root), files, out)


def _drop_target(arg: str, projs: dict) -> tuple[str, str] | None:
    """`--drop docs/design/app-v1/Old.dc.html` (or `app-v1/Old.dc.html`): the project key and the file's name in it."""
    path = arg if arg.startswith("docs/") else f"docs/design/{arg}"
    for k, p in projs.items():
        if path.startswith(p["dir"] + "/"):
            return k, path[len(p["dir"]) + 1:]
    return None


def record(root: Path = ROOT, drop: tuple[str, ...] = (), out=print) -> int:
    """Record every file in every board folder; write nothing unless every recorded file is there or dropped as asked."""
    path = root / RECORD
    try:
        projs, old = projects(root), load(path)
    except SyncError as e:
        return report(["record: nothing written"], [f"boards: {e}"], None, out)
    problems = plan_sync.mirror_errors(old, strict=False)
    problems += [f"claude-design.json records {k}, which docs/trace.json's claude_design does not name; name it there, or remove "
                 "it from the record by hand" for k in (old if isinstance(old, dict) else {}) if k != "about" and k not in projs]
    if problems:
        return report(["record: nothing written"], [f"boards: {e}" for e in problems], None, out)
    drops = set()
    for d in drop:
        t = _drop_target(d, projs)
        if t is None or t[1] not in old.get(t[0], {}).get("files", {}):
            problems.append(f"--drop {d}: no such recorded file (use <dir>/<file>, the dir one of {', '.join(p['dir'] for p in projs.values())})")
        elif (root / projs[t[0]]["dir"] / t[1]).exists():
            problems.append(f"--drop {d}: still in the repo, so it is not dropped (delete it first, if it is meant to go)")
        else:
            drops.add(t)
    new, lines, counts = {"about": ABOUT}, [], {"new": 0, "changed": 0, "dropped": 0}
    for k, p in projs.items():
        was, disk = old.get(k, {}).get("files", {}), files_on_disk(root, p["dir"])
        for name in sorted(set(was) - set(disk)):
            if (k, name) in drops:
                counts["dropped"] += 1
                lines.append(f"dropped {p['dir']}/{name}: gone from the repo, and dropped as asked")
            else:
                problems.append(f"{p['dir']}/{name} is recorded but gone from the repo; restore it, or if it was meant to go, "
                                f"`python3 scripts/design_sync.py record --drop {p['dir']}/{name}`")
        files = {}
        for name, f in disk.items():
            files[name] = e = entry(f)
            before = was.get(name) or {}
            if not before:
                counts["new"] += 1
                lines.append(f"recorded {p['dir']}/{name}: new, {e['bytes']} bytes")
            elif (before.get("bytes"), before.get("sha256")) != (e["bytes"], e["sha256"]):
                counts["changed"] += 1
                lines.append(f"recorded {p['dir']}/{name}: " + (f"{before.get('bytes')} -> {e['bytes']} bytes" if before.get("bytes") != e["bytes"]
                                                               else "the same size, a new sha256"))
        new[k] = {"dir": p["dir"], "files": files}
    if problems:
        return report(["record: nothing written"], [f"boards: {e}" for e in problems], None, out)
    text = dump(new)
    rewritten = text != path.read_text()
    if rewritten:
        path.write_text(text)
    lines.append(f"record: {counts['new']} new, {counts['changed']} changed, {counts['dropped']} dropped"
                 + ("" if rewritten else "; the record is unchanged"))
    _, _, errors = record_errors(root)  # by construction nothing, unless a file moved while it was read
    lines += [f"next: {e.removeprefix('boards: ')}" for e in stamp_errors(root)]  # the stamp is published's, after the republish
    return report(lines, errors, sum(len(v["files"]) for k, v in new.items() if k != "about"), out)


def published(root: Path = ROOT, today: str | None = None, out=print) -> int:
    """Stamp docs/design/boards-artifact.json with the record the Boards Artifact was just published from."""
    try:
        _, _, errors = record_errors(root)
    except SyncError as e:
        errors = [f"boards: {e}"]
    if errors:
        return report(["published: nothing stamped; the Boards Artifact is built from the files on disk, so record them first "
                       "(`python3 scripts/design_sync.py record`), republish, then stamp"], errors, None, out)
    digest = plan_sync.sha256(root / RECORD)
    stamp = {"about": STAMP_ABOUT, "url": BOARDS_ARTIFACT, "record_sha256": digest,
             "date": today or datetime.date.today().isoformat()}
    (root / STAMP).write_text(json.dumps(stamp, indent=2) + "\n")
    return report([f"published: stamped {STAMP}: {BOARDS_ARTIFACT}, the record {digest[:12]}, {stamp['date']}"], [],
                  sum(len(v["files"]) for k, v in load(root / RECORD).items() if k != "about"), out)


# ----------------------------------------------------------------------------------------------------------- selftest
# Each case mutates a fresh copy of the board folders, a record and a stamp built for the copy (by this harness, not by
# record or published), runs one command and expects its exit code, its words and what must hold after. The first case
# proves the copy itself makes no drift, so a refusal is the command's and not the harness's (lesson 16); the words of
# a refusal end with the drift count where one fault is made, so a case passes on its own fault only.

TRICKY = "a &lt; b & c <x> &amp; &gt; ₹ 1,00,000\n" * 3


def _write(root: Path, rel: str, text: str) -> None:
    (root / rel).parent.mkdir(parents=True, exist_ok=True)
    (root / rel).write_text(text)


def _edit_record(root: Path, change, restamp: bool = True) -> None:
    """Change the copy's record by hand, then (restamp) stamp it again, so only the change itself can be refused."""
    rec = json.loads((root / RECORD).read_text())
    change(rec)
    (root / RECORD).write_text(json.dumps(rec, indent=2, ensure_ascii=False) + "\n")
    if restamp:
        _stamp(root)


def _stamp(root: Path, **kw: object) -> None:
    digest = hashlib.sha256((root / RECORD).read_bytes()).hexdigest()
    (root / STAMP).write_text(json.dumps({"url": BOARDS_ARTIFACT, "record_sha256": digest, "date": "2026-10-30"} | kw) + "\n")


def _entry(path: Path) -> dict:
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def _same_size(root: Path, rel: str) -> None:
    """An edit that keeps the file's size: its first letter swapped for another."""
    data = bytearray((root / rel).read_bytes())
    i = next(i for i, b in enumerate(data) if chr(b).isalpha())
    data[i] = ord("Q") if data[i] != ord("Q") else ord("R")
    (root / rel).write_bytes(bytes(data))


def _unchanged(root: Path, before: dict) -> bool:
    return all((root / p).read_bytes() == b for p, b in before.items())


def _recorded(rel: str):
    """After: the record holds the file's bytes and sha256 exactly, as this harness reads them."""
    def ok(root: Path, before: dict) -> bool:
        k = next(k for k, p in projects(root).items() if rel.startswith(p["dir"] + "/"))
        return json.loads((root / RECORD).read_text())[k]["files"].get(rel.split("/", 3)[3]) == _entry(root / rel)
    return ok


def _listed(rel: str, wanted: bool):
    def ok(root: Path, before: dict) -> bool:
        k = next(k for k, p in projects(root).items() if rel.startswith(p["dir"] + "/"))
        return (rel.split("/", 3)[3] in json.loads((root / RECORD).read_text())[k]["files"]) == wanted
    return ok


def _stamped(root: Path, before: dict) -> bool:
    s = json.loads((root / STAMP).read_text())
    lines: list[str] = []
    return (s.get("url") == BOARDS_ARTIFACT and s.get("date") == "2026-10-31"
            and s.get("record_sha256") == hashlib.sha256((root / RECORD).read_bytes()).hexdigest() and check(root, lines.append) == 0)


def _migrated(root: Path, before: dict) -> bool:
    """After an old record: the same files, sizes and hashes, the dirs and the about line, and no etag anywhere."""
    old, new, projs = json.loads(before[RECORD].decode()), json.loads((root / RECORD).read_text()), projects(root)
    same = all({n: {"bytes": e["bytes"], "sha256": e["sha256"]} for n, e in old[k]["files"].items()} == new[k]["files"]
               and new[k]["dir"] == projs[k]["dir"] for k in old)
    return same and new.get("about") == ABOUT and "etag" not in (root / RECORD).read_text() and set(new) == set(old) | {"about"}


A = "docs/design/app-v1"
MINI, SUPPORT, MOTION = f"{A}/Mini App.dc.html", f"{A}/support.js", "docs/design/ios-v1/motion.css"


def _cases() -> list[tuple]:
    """(what the case breaks, how it mutates the copy, the command and its arguments, its exit code, the words it must
    print, what must hold after)."""
    def etags(rec: dict) -> None:  # the record as MA-259 wrote it: an etag on every file, no dirs, no about line
        rec.pop("about")
        for v in rec.values():
            v.pop("dir")
            for i, e in enumerate(v["files"].values()):
                e["etag"] = str(1792975804472508 + i)

    return [
        ("nothing: the files, the record and the stamp agree", lambda r: None, ("check",), 0, r"\d+ files recorded, 0 drift", _unchanged),
        # The record against the files (kept from MA-259's check: a copy edited, a file nobody recorded, a file gone).
        ("a board edited without recording it", lambda r: _write(r, MOTION, (r / MOTION).read_text() + "/* edited */\n"), ("check",), 1,
         r"ios-v1/motion\.css is \d+ bytes, recorded \d+; record it.*, 1 drift", _unchanged),
        ("a board edited without recording it, its size the same", lambda r: _same_size(r, MOTION), ("check",), 1,
         r"ios-v1/motion\.css differs from its record .*the same size.*, 1 drift", _unchanged),
        ("a file in a board folder the record does not list", lambda r: _write(r, "docs/design/ds-v1/x/stray.css", "a{}\n"), ("check",), 1,
         r"ds-v1/x/stray\.css is not recorded.*, 1 drift", _unchanged),
        ("a recorded file missing", lambda r: (r / MINI).unlink(), ("check",), 1,
         r"app-v1/Mini App\.dc\.html is recorded but missing; .*record --drop docs/design/app-v1/Mini App\.dc\.html.*, 1 drift", _unchanged),
        ("a record whose size disagrees with the file, its sha256 the same",
         lambda r: _edit_record(r, lambda m: m["ios"]["files"]["motion.css"].update(bytes=7)), ("check",), 1,
         r"ios-v1/motion\.css is \d+ bytes, recorded 7.*, 1 drift", _unchanged),
        # The record itself, which fails closed (new in MA-260).
        ("a record entry with no sha256", lambda r: _edit_record(r, lambda m: m["ios"]["files"]["motion.css"].pop("sha256")), ("check",), 1,
         r"ios/motion\.css needs its sha256.*, 1 drift", _unchanged),
        ("a record still carrying an etag", lambda r: _edit_record(r, lambda m: m["ios"]["files"]["motion.css"].update(etag="1")), ("check",), 1,
         r"ios/motion\.css has fields the record does not keep \(etag\).*, 1 drift", _unchanged),
        ("a record that cannot be read", lambda r: _write(r, str(RECORD), "{"), ("check",), 1, r"claude-design\.json cannot be read", _unchanged),
        ("a project the trace does not name", lambda r: _edit_record(r, lambda m: m.update(old={"dir": "docs/design/old-v1", "files": {}})),
         ("check",), 1, r"records old, which docs/trace\.json's claude_design does not name.*, 1 drift", _unchanged),
        ("a project whose dir the trace and the record disagree on", lambda r: _edit_record(r, lambda m: m["ds"].update(dir="docs/design/ds-v2")),
         ("check",), 1, r"gives ds the dir 'docs/design/ds-v2', docs/trace\.json's claude_design 'docs/design/ds-v1'.*, 1 drift", _unchanged),
        ("a project the trace names and the record lacks", lambda r: _edit_record(r, lambda m: m.pop("ds")), ("check",), 1,
         r"names ds, which claude-design\.json does not record", _unchanged),
        ("a trace with no board folders", lambda r: _write(r, "docs/trace.json", "{}"), ("check",), 1, r"claude_design must name each", _unchanged),
        ("a Finder .DS_Store is no board", lambda r: _write(r, "docs/design/ios-v1/.DS_Store", "x"), ("check",), 0, r", 0 drift", _unchanged),
        # The Boards Artifact's stamp (new in MA-260).
        ("the stamp missing", lambda r: (r / STAMP).unlink(), ("check",), 1, r"boards-artifact\.json is missing: publish.*, 1 drift", _unchanged),
        ("the stamp older than the record (a board changed and recorded since)",
         lambda r: _write(r, MOTION, "/* moved */\n") or _edit_record(r, lambda m: m["ios"]["files"].__setitem__("motion.css", _entry(r / MOTION)), restamp=False),
         ("check",), 1, rf"{re.escape(STALE)} \(.*, 1 drift", _unchanged),
        ("a stamp for another Artifact", lambda r: _stamp(r, url="https://claude.ai/artifact/other"), ("check",), 1,
         r"stamps 'https://claude\.ai/artifact/other', not the MyPaisa Boards Artifact.*, 1 drift", _unchanged),
        ("a stamp with no date", lambda r: _stamp(r, date="soon"), ("check",), 1, r"has no date.*, 1 drift", _unchanged),
        ("a stamp that cannot be read", lambda r: _write(r, str(STAMP), "{"), ("check",), 1, r"boards-artifact\.json cannot be read.*, 1 drift",
         _unchanged),
        # record
        ("record: an edited board recorded exactly, entities and the rupee too", lambda r: _write(r, SUPPORT, TRICKY), ("record",), 0,
         rf"recorded {re.escape(SUPPORT)}: \d+ -> \d+ bytes\nrecord: 0 new, 1 changed, 0 dropped\nnext: {re.escape(STALE)}.*, 0 drift", _recorded(SUPPORT)),
        ("record: an edit that keeps the size", lambda r: _same_size(r, MOTION), ("record",), 0,
         rf"recorded {re.escape(MOTION)}: the same size, a new sha256\n.*, 0 drift", _recorded(MOTION)),
        ("record: a new file in a new folder", lambda r: _write(r, "docs/design/ios-v1/_ds/x/new.css", TRICKY), ("record",), 0,
         r"recorded docs/design/ios-v1/_ds/x/new\.css: new, \d+ bytes\nrecord: 1 new, 0 changed.*, 0 drift", _recorded("docs/design/ios-v1/_ds/x/new.css")),
        ("record: nothing changed, nothing written", lambda r: None, ("record",), 0, r"record: 0 new, 0 changed, 0 dropped; the record is unchanged\n"
         r"design-sync: \d+ files recorded, 0 drift$", _unchanged),
        ("record: a Finder .DS_Store is not recorded", lambda r: _write(r, "docs/design/ios-v1/.DS_Store", "x"), ("record",), 0,
         r"record: 0 new, 0 changed, 0 dropped; the record is unchanged", _listed("docs/design/ios-v1/.DS_Store", False)),
        ("record: a recorded file gone is kept, and nothing written though another changed",
         lambda r: (r / MINI).unlink() or _write(r, SUPPORT, TRICKY), ("record",), 1,
         r"nothing written.*Mini App\.dc\.html is recorded but gone from the repo; .*--drop docs/design/app-v1/Mini App\.dc\.html", _unchanged),
        ("record --drop: a file gone, and meant to go", lambda r: (r / MINI).unlink(), ("record", "--drop", MINI), 0,
         rf"dropped {re.escape(MINI)}: gone from the repo, and dropped as asked\nrecord: 0 new, 0 changed, 1 dropped.*, 0 drift", _listed(MINI, False)),
        ("record --drop: the path inside docs/design", lambda r: (r / MINI).unlink(), ("record", "--drop", "app-v1/Mini App.dc.html"), 0,
         r"record: 0 new, 0 changed, 1 dropped", _listed(MINI, False)),
        ("record --drop: a file still in the repo", lambda r: None, ("record", "--drop", MINI), 1, r"nothing written.*still in the repo", _unchanged),
        ("record --drop: a file the record does not list", lambda r: None, ("record", "--drop", f"{A}/Nope.dc.html"), 1,
         r"nothing written.*--drop docs/design/app-v1/Nope\.dc\.html: no such recorded file", _unchanged),
        ("record: an old record, with etags and no dirs, rewritten with every size and hash kept",
         lambda r: _edit_record(r, etags, restamp=False), ("record",), 0, r"record: 0 new, 0 changed, 0 dropped\n", _migrated),
        ("record: a project the trace does not name is not forgotten",
         lambda r: _edit_record(r, lambda m: m.update(old={"dir": "docs/design/old-v1", "files": {"a.css": {"bytes": 1, "sha256": "0" * 64}}})),
         ("record",), 1, r"nothing written.*records old, which docs/trace\.json's claude_design does not name", _unchanged),
        ("record: a record that cannot be read", lambda r: _write(r, str(RECORD), "{"), ("record",), 1, r"nothing written.*cannot be read", _unchanged),
        # published
        ("published: stamps the record, and check passes",
         lambda r: _write(r, SUPPORT, TRICKY) or _edit_record(r, lambda m: m["app"]["files"].__setitem__("support.js", _entry(r / SUPPORT)), restamp=False),
         ("published",), 0, r"published: stamped docs/design/boards-artifact\.json: https://claude\.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g", _stamped),
        ("published: a board not recorded is not stamped", lambda r: _write(r, SUPPORT, TRICKY), ("published",), 1,
         r"nothing stamped.*app-v1/support\.js is \d+ bytes, recorded \d+", _unchanged),
    ]


def _fixture(tmp: Path) -> Path:
    """A copy of the board folders with a record and a stamp this harness builds itself, so the selftest proves the
    commands whatever state the repo's own record is in."""
    root = tmp / "repo"
    projs = projects(ROOT)
    (root / "docs" / "design").mkdir(parents=True)
    (root / "docs" / "trace.json").write_text(json.dumps({"claude_design": projs}))
    rec: dict = {"about": ABOUT}
    for k, p in projs.items():
        shutil.copytree(ROOT / p["dir"], root / p["dir"], ignore=shutil.ignore_patterns(*NOT_BOARDS))
        base = root / p["dir"]
        rec[k] = {"dir": p["dir"], "files": {f.relative_to(base).as_posix(): {"bytes": len(f.read_bytes()), "sha256": hashlib.sha256(f.read_bytes()).hexdigest()}
                                             for f in sorted(base.rglob("*")) if f.is_file()}}
    (root / RECORD).write_text(json.dumps(rec, indent=2, ensure_ascii=False) + "\n")
    _stamp(root)
    return root


def selftest() -> int:
    cases, bad = _cases(), 0
    for what, mutate, args, code_wanted, words, after in cases:
        with tempfile.TemporaryDirectory() as t:
            try:
                root = _fixture(Path(t))
            except (SyncError, OSError, ValueError, KeyError) as e:
                print(f"FAIL: the design-sync selftest cannot build its copy of the boards: {e}")
                return 1
            mutate(root)
            before = {p: (root / p).read_bytes() for p in (RECORD, STAMP) if (root / p).exists()}
            lines: list[str] = []
            try:
                code = run(list(args), root, lines.append, today="2026-10-31")
            except Exception as e:  # noqa: BLE001 - a crash is a failure the case names, not one that stops the selftest
                code = f"a crash ({type(e).__name__}: {e})"
            text = "\n".join(lines)
            if code != code_wanted or not re.search(words, text, re.S) or not after(root, before):
                bad += 1
                print(f"FAIL: design-sync {' '.join(args)} on {what}: exit {code}, wanted {code_wanted} and {words!r}; got: {text[-400:]!r}")
    print(f"design-sync selftest: {len(cases)} mutated copies, {bad} wrong")
    return 1 if bad else 0


def run(args: list[str], root: Path = ROOT, out=print, today: str | None = None) -> int | None:
    """One command, or None when the arguments are not one."""
    cmd, rest = (args[0] if args else ""), args[1:]
    if cmd == "record" and len(rest) % 2 == 0 and all(a == "--drop" for a in rest[::2]):
        return record(root, tuple(rest[1::2]), out)
    if not rest and cmd == "check":
        return check(root, out)
    if not rest and cmd == "published":
        return published(root, today, out)
    return None


def main(argv: list[str]) -> int:
    if argv[1:] == ["selftest"]:
        return selftest()
    code = run(argv[1:])
    if code is None:
        print(__doc__)
        return 2
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv))
