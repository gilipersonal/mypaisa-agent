#!/usr/bin/env python3
"""The Claude Design boards and the repo's mirror of them stay the same (MA-259).

Boards are drawn in Claude Design and copied into docs/design/ (rule 7, .claude/rules/plan-sync.md);
docs/design/claude-design.json records the etag, bytes and sha256 of every copy. This script reads the projects named
under `claude_design` in docs/trace.json through the claude-design connector, by running Claude Code headless
(`claude -p` on Haiku, which may call only list_files and read_file), and takes the connector's own result from Claude
Code's output, so no board passes through a model's hands: the bytes written are the bytes Claude Design holds.

    python3 scripts/design_sync.py check       # fail on any difference between Claude Design, the record and the copies
    python3 scripts/design_sync.py pull        # copy every new or changed file, record it, then check
    python3 scripts/design_sync.py pull --drop app/Old.dc.html   # a file gone from Claude Design that Arun says was meant to go
    python3 scripts/design_sync.py selftest    # offline, against a stand-in Claude Design (plan_sync.py selftest runs it)

It fails closed: a project it cannot list, a result it cannot read, a copy whose decoded length is not the listed size
or whose etag moved while it was read is a failure, and pull then writes nothing. A 403 from the connector means the
login lapsed: run /design-login in an interactive `claude` terminal (not the desktop app). Every file of every project
is mirrored except the `.thumbnail` preview image Claude Design writes itself. A file gone from Claude Design is never
deleted here: check reports it until Arun says it was meant to go, then `pull --drop <project>/<file>` removes the copy
and its record. Standalone Claude Design closes by 14 Dec 2026 (docs/design/reviews/MA-259/decision.md).
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import plan_sync  # noqa: E402

ROOT = plan_sync.ROOT
IGNORED = {".thumbnail"}  # the project's preview image, written by Claude Design itself; the trace schema leaves it out
MCP = {"mcpServers": {"claude-design": {"type": "http", "url": "https://api.anthropic.com/v1/design/mcp"}}}
LIST, READ = "mcp__claude-design__list_files", "mcp__claude-design__read_file"
WRITES = [f"mcp__claude-design__{t}" for t in ("write_files", "delete_files", "copy_files", "finalize_plan", "create_project",
                                               "create_support_js", "put_conversation", "ack_comments", "add_member",
                                               "remove_member", "update_member_role", "update_sharing")]
MODEL = os.environ.get("DESIGN_SYNC_MODEL", "haiku")
# Dollars a headless call may spend. A listing or a read costs about $0.004 on Haiku (28 Oct 2026): the result is saved
# to a file, not shown to the model (MAX_MCP_OUTPUT_TOKENS), so a board's size does not change the price. A call that
# reaches the cap stops, and the step fails closed.
BUDGET = "0.10"
WORKERS = 4
SAVED = re.compile(r"Output has been saved to (/\S+?\.txt)")
LOGIN = "the connector's login lapsed or was refused: run /design-login in an interactive `claude` terminal (not the desktop app), then run this again"


class SyncError(Exception):
    pass


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def decode(body: str) -> str:
    """read_file escapes & < > and nothing else; one pass, so '&amp;lt;' stays '&lt;'."""
    if bad := re.search(r"[<>]|&(?!(?:amp|lt|gt);)", body):
        raise SyncError(f"an unescaped {bad.group(0)!r} in a read_file body: the connector's escaping is not what this script reads")
    return re.sub(r"&(amp|lt|gt);", lambda m: {"amp": "&", "lt": "<", "gt": ">"}[m.group(1)], body)


def unwrap(text: str) -> tuple[dict, str]:
    """A read_file result: its wrapper's attributes, and the decoded body (the file's text, or the window's)."""
    head, sep, rest = text.partition("\n")
    m = re.fullmatch(r"<untrusted-project-content((?:\s+[a-z_]+(?:=\"[^\"]*\")?)*)\s*>", head)
    end = rest.rfind("\n</untrusted-project-content>")
    if not sep or not m or end < 0:
        raise SyncError(f"a read_file result with no untrusted-project-content wrapper: {text[:160]!r}")
    attrs = dict(re.findall(r"([a-z_]+)=\"([^\"]*)\"", m.group(1)))
    if re.search(r"\btruncated_line\b", m.group(1)):
        attrs["truncated_line"] = attrs.get("truncated_line", "")
    return attrs, decode(rest[:end])


def result_text(stream: str, tool: str, args: dict, saved_base: Path) -> str:
    """The text one connector call returned, from `claude -p --output-format stream-json --verbose`.

    Claude Code saves a result too long for the model's context to a file and says where; that file holds the result
    exactly (its text, or a JSON list of text blocks)."""
    uses: dict[str, tuple[object, object]] = {}
    results: dict[str, dict] = {}
    final: dict = {}
    for line in stream.splitlines():
        try:
            o = json.loads(line)
        except ValueError:
            continue
        msg = o.get("message") if isinstance(o.get("message"), dict) else {}
        content = msg.get("content") if isinstance(msg.get("content"), list) else []
        if o.get("type") == "assistant":
            uses.update({b["id"]: (b.get("name"), b.get("input")) for b in content if isinstance(b, dict) and b.get("type") == "tool_use"})
        elif o.get("type") == "user":
            results.update({b.get("tool_use_id"): b for b in content if isinstance(b, dict) and b.get("type") == "tool_result"})
        elif o.get("type") == "result":
            final = o
    calls = [i for i, (name, _) in uses.items() if name == tool]
    if len(calls) != 1:
        said = str(final.get("result") or final.get("subtype") or "no result")[:200]
        raise SyncError(f"{tool} was called {len(calls)} times, not once (Claude Code said: {said})")
    if uses[calls[0]][1] != args:
        raise SyncError(f"{tool} was called with {uses[calls[0]][1]}, not {args}")
    block = results.get(calls[0])
    if block is None:
        raise SyncError(f"{tool} returned nothing")
    c = block.get("content")
    text = c if isinstance(c, str) else "".join(x.get("text", "") for x in c or [] if isinstance(x, dict) and x.get("type") == "text")
    if m := SAVED.search(text):
        path = Path(m.group(1))
        if not path.resolve().is_relative_to(saved_base.resolve()) or not path.is_file():
            raise SyncError(f"{tool}: the saved result {path} is not a file under {saved_base}")
        text = path.read_text()
        try:
            blocks = json.loads(text)
        except ValueError:
            return text
        if isinstance(blocks, list) and blocks and all(isinstance(b, dict) and b.get("type") == "text" for b in blocks):
            return "".join(b["text"] for b in blocks)
        return text
    if block.get("is_error") or text.startswith("Error"):
        login = re.search(r"\b(401|403)\b|forbidden|unauthori[sz]ed|log ?in|authenticat", text, re.I)
        raise SyncError(f"{tool}: {text[:300]}" + (f" ({LOGIN})" if login else ""))
    return text


class Headless:
    """Claude Design through the claude-design connector, by Claude Code headless: read-only, one call per request."""

    def __init__(self) -> None:
        self.claude = os.environ.get("DESIGN_SYNC_CLAUDE") or shutil.which("claude")
        # A fixed folder outside the repo, so this repo's hooks and CLAUDE.md stay out of the headless session.
        self.cwd = Path(tempfile.gettempdir()) / "mypaisa-design-sync"
        self.saved_base = Path.home() / ".claude"

    def _call(self, tool: str, args: dict) -> str:
        if not self.claude:
            raise SyncError("the claude CLI is not on PATH; the sync runs Claude Code headless (set DESIGN_SYNC_CLAUDE to its path)")
        self.cwd.mkdir(exist_ok=True)
        prompt = (f"Call the tool {tool} exactly once with exactly these arguments: {json.dumps(args)}. "
                  "Call no other tool, do not read or describe the result, then reply with the single word DONE.")
        cmd = [self.claude, "-p", prompt, "--strict-mcp-config", "--mcp-config", json.dumps(MCP), "--allowedTools", tool,
               "--disallowedTools", *WRITES, "--tools", "", "--permission-mode", "dontAsk", "--no-session-persistence",
               "--output-format", "stream-json", "--verbose", "--model", MODEL, "--max-budget-usd", BUDGET]
        last: SyncError | None = None
        for _ in range(2):  # a model that called the tool wrongly gets one more try; a refused login does not
            try:
                r = subprocess.run(cmd, capture_output=True, text=True, cwd=self.cwd, timeout=240,
                                   env=dict(os.environ, MAX_MCP_OUTPUT_TOKENS="1000"))
            except subprocess.TimeoutExpired:
                last = SyncError(f"{tool} {args} took over 240 s")
                continue
            try:
                return result_text(r.stdout, tool, args, self.saved_base)
            except SyncError as e:
                last = e if r.returncode == 0 else SyncError(f"{e} (claude exited {r.returncode}: {r.stderr.strip()[:200]})")
                if LOGIN in str(e):
                    break
        raise last or SyncError(f"{tool} {args} failed")

    def list(self, project_id: str) -> list[dict]:
        text = self._call(LIST, {"project_id": project_id, "depth": -1})
        try:
            return json.loads(text)
        except ValueError:
            raise SyncError(f"the listing of {project_id} is not JSON: {text[:200]!r}") from None

    def read(self, project_id: str, path: str, offset: int | None = None) -> str:
        return self._call(READ, {"project_id": project_id, "path": path} | ({"offset": offset} if offset else {}))


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as e:
        raise SyncError(f"{path.name} cannot be read: {e}") from None


def projects(root: Path) -> dict[str, dict]:
    projs = load(root / "docs" / "trace.json").get("claude_design")
    if not isinstance(projs, dict) or not projs or not all(
            isinstance(p, dict) and all(isinstance(p.get(f), str) and p.get(f) for f in ("id", "name", "dir")) for p in projs.values()):
        raise SyncError("docs/trace.json's claude_design must name each project's id, name and dir")
    return projs


def listing(conn, proj: dict) -> dict[str, dict]:
    """A project's files as Claude Design lists them, the preview image left out: {path: {etag, size}}."""
    try:
        entries = conn.list(proj["id"])
    except SyncError as e:
        raise SyncError(f"cannot list {proj['name']} ({proj['id']}): {e}") from None
    if not isinstance(entries, list):
        raise SyncError(f"the listing of {proj['name']} is not a list")
    files = {}
    for e in entries:
        if not isinstance(e, dict) or not isinstance(e.get("path"), str) or e.get("type") not in ("file", "directory"):
            raise SyncError(f"the listing of {proj['name']} has an entry this script cannot read: {e!r}")
        if e["type"] == "directory":
            raise SyncError(f"the listing of {proj['name']} rolled {e['path']} up as a directory; depth -1 lists every file")
        if not isinstance(e.get("etag"), str) or not e["etag"] or not isinstance(e.get("size"), int):
            raise SyncError(f"the listing of {proj['name']} gives {e['path']} no etag or size")
        if e["path"] not in IGNORED:
            files[e["path"]] = {"etag": e["etag"], "size": e["size"]}
    return files


def listings(conn, projs: dict) -> dict[str, dict[str, dict]]:
    with concurrent.futures.ThreadPoolExecutor(WORKERS) as pool:
        futures = {k: pool.submit(listing, conn, p) for k, p in projs.items()}
    out, errors = {}, []
    for k, f in futures.items():
        try:
            out[k] = f.result()
        except SyncError as e:
            errors.append(str(e))
    if errors:
        raise SyncError("; ".join(errors))
    return out


def drift(projs: dict, mirror: dict, live: dict, root: Path) -> list[str]:
    """Every difference between Claude Design, docs/design/claude-design.json and the copies on disk."""
    errors = [f"design: claude-design.json records {k}, which docs/trace.json's claude_design does not name"
              for k in mirror if k not in projs]
    for key, proj in projs.items():
        rec, files, d = mirror.get(key, {}).get("files", {}), live[key], proj["dir"]
        for p in sorted(set(files) - set(rec)):
            errors.append(f"design: {d}/{p} is new in Claude Design ({proj['name']}); run `python3 scripts/design_sync.py pull`")
        for p in sorted(set(rec) - set(files)):
            errors.append(f"design: {d}/{p} is gone from Claude Design ({proj['name']}); the copy is kept: ask Arun, and once he "
                          f"says it was meant, `python3 scripts/design_sync.py pull --drop {key}/{p}`")
        for p in sorted(set(rec) & set(files)):
            if files[p]["etag"] != rec[p].get("etag"):
                errors.append(f"design: {d}/{p} changed in Claude Design (etag {rec[p].get('etag')} -> {files[p]['etag']}); "
                              "run `python3 scripts/design_sync.py pull`")
            elif files[p]["size"] != rec[p].get("bytes"):
                errors.append(f"design: {d}/{p} is {files[p]['size']} bytes in Claude Design, recorded {rec[p].get('bytes')} at the "
                              "same etag; run `python3 scripts/design_sync.py pull`")
    return errors + [f"design: {e}" for e in plan_sync.disk_errors(projs, mirror, root)]


def fetch(conn, proj: dict, path: str, entry: dict) -> bytes:
    """One file, byte for byte, window by window past read_file's 256 KiB cap; its length and etag as listed."""
    parts, offset = [], None
    while True:
        attrs, body = unwrap(conn.read(proj["id"], path, offset))
        if attrs.get("path") != path:
            raise SyncError(f"{path}: read_file answered for {attrs.get('path')!r}")
        if attrs.get("etag") != entry["etag"]:
            raise SyncError(f"{path} changed while it was copied (etag {entry['etag']} listed, {attrs.get('etag')} read); run pull again")
        if "truncated_line" in attrs:
            raise SyncError(f"{path} has a line over read_file's 256 KiB cap, which it cannot return whole")
        parts.append(body)
        if "lines" not in attrs:
            break
        try:
            first, last = (int(n) for n in attrs["lines"].split("-"))
            total = int(attrs["total_lines"])
        except (KeyError, ValueError):
            raise SyncError(f"{path}: a window this script cannot read: lines={attrs.get('lines')!r} total_lines={attrs.get('total_lines')!r}") from None
        if first != (offset or 1) or last < first:
            raise SyncError(f"{path}: asked for line {offset or 1}, read_file returned lines {first}-{last}")
        if last >= total:
            break
        offset = last + 1
    data = "".join(parts).encode()
    if len(data) != entry["size"]:
        raise SyncError(f"{path}: decoded {len(data)} bytes, Claude Design lists {entry['size']}")
    return data


def _dump(mirror: dict) -> str:
    return json.dumps({k: {**v, "files": dict(sorted(v.get("files", {}).items()))} for k, v in mirror.items()},
                      indent=2, ensure_ascii=False) + "\n"


def report(lines: list[str], errors: list[str], live: dict | None, out=print) -> int:
    for ln in lines:
        out(ln)
    for e in errors:
        out(f"DRIFT: {e}")
    files = sum(len(v) for v in (live or {}).values())
    out(f"design-sync: {len(live or {})} projects, {files} files in Claude Design, {len(errors)} drift")
    return 1 if errors else 0


def check(conn, root: Path = ROOT, out=print) -> int:
    try:
        projs = projects(root)
        mirror = load(root / "docs" / "design" / "claude-design.json")
        live = listings(conn, projs)
    except SyncError as e:
        return report([], [f"design: {e}"], None, out)
    return report([], drift(projs, mirror, live, root), live, out)


def pull(conn, root: Path = ROOT, drop: tuple[str, ...] = (), out=print) -> int:
    """Copy every file that is new, changed, or not as recorded on disk; write nothing unless every copy is whole."""
    mirror_path = root / "docs" / "design" / "claude-design.json"
    try:
        projs = projects(root)
        mirror = load(mirror_path)
        live = listings(conn, projs)
    except SyncError as e:
        return report(["pull: nothing written"], [f"design: {e}"], None, out)
    todo = []
    for key, proj in projs.items():
        rec = mirror.get(key, {}).get("files", {})
        for p, e in live[key].items():
            r, path = rec.get(p) or {}, root / proj["dir"] / p
            if (r.get("etag") != e["etag"] or r.get("bytes") != e["size"] or not path.is_file()
                    or path.stat().st_size != r.get("bytes") or plan_sync.sha256(path) != r.get("sha256")):
                todo.append((key, p, e))
    problems, drops = [], []
    for d in drop:
        key, _, p = d.partition("/")
        if key not in projs or p not in mirror.get(key, {}).get("files", {}):
            problems.append(f"--drop {d}: no such recorded file (use <project>/<file>, the project one of {', '.join(projs)})")
        elif p in live[key]:
            problems.append(f"--drop {d}: still in Claude Design, so it is not dropped")
        else:
            drops.append((key, p))
    with concurrent.futures.ThreadPoolExecutor(WORKERS) as pool:
        futures = {(k, p): pool.submit(fetch, conn, projs[k], p, e) for k, p, e in todo}
    copies = {}
    for (k, p), f in futures.items():
        try:
            copies[(k, p)] = f.result()
        except SyncError as e:
            problems.append(f"{projs[k]['dir']}/{p}: {e}")
    if problems:
        return report(["pull: nothing written"], [f"design: {e}" for e in problems], live, out)
    lines = []
    for (k, p), data in copies.items():
        path, old = root / projs[k]["dir"] / p, mirror.get(k, {}).get("files", {}).get(p)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        new = {"etag": live[k][p]["etag"], "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        mirror.setdefault(k, {}).setdefault("files", {})[p] = new
        lines.append(f"copied {projs[k]['dir']}/{p}: " + (f"etag {old.get('etag')} -> {new['etag']}, {old.get('bytes')} -> {new['bytes']} bytes"
                                                         if old else f"new, {new['bytes']} bytes"))
    for k, p in drops:
        (root / projs[k]["dir"] / p).unlink(missing_ok=True)
        del mirror[k]["files"][p]
        lines.append(f"dropped {projs[k]['dir']}/{p}: gone from Claude Design, and Arun said it was meant to go")
    if copies or drops:
        mirror_path.write_text(_dump(mirror))
    lines.append(f"pull: {len(copies)} copied, {len(drops)} dropped")
    return report(lines, drift(projs, mirror, live, root), live, out)


# ----------------------------------------------------------------------------------------------------------- selftest

class Fake:
    """A stand-in Claude Design, built from the repo's own mirror, answering as the connector does (escaping, the
    wrapper, windows past a cap). `reads` makes a read answer differently from the listing; `sizes` makes the listing
    give another size; `down` refuses to list a project, as a lapsed login does."""

    def __init__(self, projs: dict, mirror: dict, root: Path) -> None:
        self.ids = {k: p["id"] for k, p in projs.items()}
        self.files = {p["id"]: {name: [meta["etag"], (root / p["dir"] / name).read_text()]
                                for name, meta in mirror[k]["files"].items()} for k, p in projs.items()}
        for files in self.files.values():
            files[".thumbnail"] = ["1", "\x89PNG preview, never copied"]
        self.reads: dict[str, tuple[str, str]] = {}
        self.sizes: dict[str, int] = {}
        self.down: set[str] = set()
        self.cap: int | None = None

    def text(self, key: str, path: str) -> str:
        return self.files[self.ids[key]][path][1]

    def move(self, key: str, path: str, text: str | None = None) -> None:
        """The file changes in Claude Design: a new etag, and new text."""
        etag, old = self.files[self.ids[key]][path]
        self.files[self.ids[key]][path] = ["9" + etag, old + "/* moved */\n" if text is None else text]

    def list(self, project_id: str) -> list[dict]:
        if project_id in self.down:
            raise SyncError(f"Error: 403 Forbidden ({LOGIN})")
        return [{"path": p, "type": "file", "size": self.sizes.get(p, len(t.encode())), "etag": e} for p, (e, t) in self.files[project_id].items()]

    def read(self, project_id: str, path: str, offset: int | None = None) -> str:
        etag, text = self.reads.get(path) or self.files[project_id][path]
        note = "\n(The body above is HTML-entity-escaped: &amp; &lt; &gt; stand for & < >.)"
        if self.cap is None or (offset is None and len(text.encode()) <= self.cap):
            return f'<untrusted-project-content path="{path}" etag="{etag}">\n{escape(text)}\n</untrusted-project-content>{note}'
        lines, start = text.splitlines(keepends=True), offset or 1
        chunk, size, last = "", 0, start - 1
        for ln in lines[start - 1:]:
            if size + len(ln.encode()) > self.cap:
                break
            chunk, size, last = chunk + ln, size + len(ln.encode()), last + 1
        if last < start:  # one line alone over the cap: read_file returns part of it and says so
            return (f'<untrusted-project-content path="{path}" etag="{etag}" lines="{start}-{start}" total_lines="{len(lines)}" '
                    f'truncated_line>\n{escape(lines[start - 1][:self.cap])}\n</untrusted-project-content>{note}')
        return (f'<untrusted-project-content path="{path}" etag="{etag}" lines="{start}-{last}" total_lines="{len(lines)}">\n'
                f'{escape(chunk)}\n</untrusted-project-content>{note}')


def _stream(tool: str, args: dict, content: object, is_error: bool = False, calls: int = 1) -> str:
    """What `claude -p --output-format stream-json --verbose` prints around one connector call."""
    out = [{"type": "system", "subtype": "init"}]
    for i in range(calls):
        out.append({"type": "assistant", "message": {"content": [{"type": "tool_use", "id": f"t{i}", "name": tool, "input": args}]}})
        out.append({"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": f"t{i}", "content": content, "is_error": is_error}]}})
    out.append({"type": "result", "subtype": "success", "result": "DONE"})
    return "\n".join(json.dumps(o) for o in out)


def _record(root: Path) -> dict:
    return json.loads((root / "docs/design/claude-design.json").read_text())


def _as_listed(key: str, path: str):
    """After: the copy on disk is the stand-in's text exactly, and its record says so."""
    def ok(root: Path, before: str, fake: Fake) -> bool:
        want = fake.text(key, path).encode()
        rec = _record(root)[key]["files"].get(path, {})
        disk = root / projects(root)[key]["dir"] / path
        return (disk.is_file() and disk.read_bytes() == want and rec.get("bytes") == len(want)
                and rec.get("sha256") == hashlib.sha256(want).hexdigest() and rec.get("etag") == fake.files[fake.ids[key]][path][0])
    return ok


def _kept(key: str, path: str, wanted: bool = True):
    """After: the copy and its record are both still there (or, wanted False, both gone)."""
    def ok(root: Path, before: str, fake: Fake) -> bool:
        there = (path in _record(root)[key]["files"], (root / projects(root)[key]["dir"] / path).exists())
        return there == (wanted, wanted)
    return ok


def _unchanged(root: Path, before: str, fake: Fake) -> bool:
    return (root / "docs/design/claude-design.json").read_text() == before


def _cases() -> list[tuple]:
    """(what the case breaks, how it mutates the stand-in or the repo, pull's --drop, the command, its exit code, the
    words it must print, what must hold after). Each runs on a fresh copy."""
    tricky = "a &lt; b & c <x> &amp; &gt; \u20b9 1,00,000\n" * 3

    def disk(root: Path, rel: str, text: str) -> None:
        (root / rel).write_text(text)

    def short(f: Fake) -> None:  # the read returns one byte fewer than the listing gives
        f.move("app", "support.js", tricky)
        f.reads["support.js"] = (f.files[f.ids["app"]]["support.js"][0], tricky[:-1])

    def raced(f: Fake) -> None:  # the file moves again between the listing and the read
        f.move("app", "support.js")
        f.reads["support.js"] = ("77", f.text("app", "support.js"))

    def raw(f: Fake) -> None:  # the connector stops escaping a <
        f.move("app", "support.js", tricky)
        orig = f.read
        f.read = lambda *a: orig(*a).replace("&lt;x", "<x", 1)

    def capped(f: Fake, cap: int) -> None:
        f.cap = cap
        f.move("ios", "iPad and foldable.dc.html")

    return [
        ("nothing: Claude Design and the mirror the same", lambda f, r: None, (), "check", 0, r", 0 drift", _unchanged),
        ("an etag moved in Claude Design", lambda f, r: f.move("app", "support.js"), (), "check", 1,
         r"app-v1/support\.js changed in Claude Design", _unchanged),
        ("a file new in Claude Design", lambda f, r: f.files[f.ids["app"]].__setitem__("New board.dc.html", ["5", "<p>new</p>\n"]), (),
         "check", 1, r"app-v1/New board\.dc\.html is new in Claude Design", _unchanged),
        ("a file gone from Claude Design", lambda f, r: f.files[f.ids["app"]].pop("Mini App.dc.html"), (), "check", 1,
         r"app-v1/Mini App\.dc\.html is gone from Claude Design", _unchanged),
        ("a listed size that disagrees at the same etag", lambda f, r: f.sizes.__setitem__("motion.css", 7), (), "check", 1,
         r"motion\.css is 7 bytes in Claude Design, recorded \d+ at the same etag", _unchanged),
        ("a copy edited in the repo", lambda f, r: disk(r, "docs/design/ios-v1/motion.css", "/* edited */\n"), (), "check", 1,
         r"ios-v1/motion\.css is \d+ bytes, recorded \d+; copy it again", _unchanged),
        ("a file in the mirror nobody recorded", lambda f, r: disk(r, "docs/design/ds-v1/stray.css", "a{}\n"), (), "check", 1,
         r"ds-v1/stray\.css is not recorded", _unchanged),
        ("a project Claude Design will not list (a lapsed login)", lambda f, r: f.down.add(f.ids["ios"]), (), "check", 1,
         r"cannot list MyPaisa iOS v1 .*design-login", _unchanged),
        ("pull: a changed file copied byte for byte, entities and all", lambda f, r: f.move("app", "support.js", tricky), (), "pull", 0,
         r"copied docs/design/app-v1/support\.js: etag .*, 0 drift", _as_listed("app", "support.js")),
        ("pull: a new file in a new folder", lambda f, r: f.files[f.ids["ios"]].__setitem__("_ds/x/new.css", ["5", tricky]), (), "pull", 0,
         r"copied docs/design/ios-v1/_ds/x/new\.css: new, \d+ bytes.*, 0 drift", _as_listed("ios", "_ds/x/new.css")),
        ("pull: a copy edited in the repo is copied again", lambda f, r: disk(r, "docs/design/ios-v1/motion.css", "/* edited */\n"), (),
         "pull", 0, r"copied docs/design/ios-v1/motion\.css.*, 0 drift", _as_listed("ios", "motion.css")),
        ("pull: a body one byte short", lambda f, r: short(f), (), "pull", 1, r"nothing written.*decoded \d+ bytes, Claude Design lists \d+",
         _unchanged),
        ("pull: a file that changed while it was read", lambda f, r: raced(f), (), "pull", 1, r"nothing written.*changed while it was copied",
         _unchanged),
        ("pull: a file gone from Claude Design is kept", lambda f, r: f.files[f.ids["app"]].pop("Mini App.dc.html"), (), "pull", 1,
         r"Mini App\.dc\.html is gone from Claude Design", _kept("app", "Mini App.dc.html")),
        ("pull --drop: Arun said it was meant to go", lambda f, r: f.files[f.ids["app"]].pop("Mini App.dc.html"), ("app/Mini App.dc.html",),
         "pull", 0, r"dropped docs/design/app-v1/Mini App\.dc\.html.*, 0 drift", _kept("app", "Mini App.dc.html", False)),
        ("pull --drop: a file still in Claude Design", lambda f, r: None, ("app/Mini App.dc.html",), "pull", 1,
         r"nothing written.*still in Claude Design", _unchanged),
        ("pull: a file past the cap, window by window", lambda f, r: capped(f, 4096), (), "pull", 0,
         r"copied docs/design/ios-v1/iPad and foldable\.dc\.html.*, 0 drift", _as_listed("ios", "iPad and foldable.dc.html")),
        ("pull: a line longer than the cap", lambda f, r: capped(f, 40), (), "pull", 1, r"nothing written.*a line over", _unchanged),
        ("pull: a body with a raw <", lambda f, r: raw(f), (), "pull", 1, r"nothing written.*unescaped '<'", _unchanged),
    ]


def _fixture(tmp: Path) -> tuple[Path, Fake]:
    root = tmp / "repo"
    (root / "docs" / "design").mkdir(parents=True)
    projs = projects(ROOT)
    (root / "docs" / "trace.json").write_text(json.dumps({"claude_design": projs}))
    shutil.copy(ROOT / "docs" / "design" / "claude-design.json", root / "docs" / "design" / "claude-design.json")
    for p in projs.values():
        shutil.copytree(ROOT / p["dir"], root / p["dir"])
    return root, Fake(projs, load(root / "docs" / "design" / "claude-design.json"), root)


def _readings(tmp: Path) -> tuple[int, int]:
    """Reading Claude Code's output, and decoding read_file's escaping: (cases, wrong)."""
    bad = 0
    args = {"project_id": "p", "depth": -1}
    base = tmp / "claude"
    saved = base / "tool-results" / "mcp-claude-design-read_file-1.txt"
    saved.parent.mkdir(parents=True)
    saved.write_text('<untrusted-project-content path="a" etag="1">\nx &amp;lt; y\n</untrusted-project-content>')
    blocks = base / "tool-results" / "blocks.txt"
    blocks.write_text(json.dumps([{"type": "text", "text": "[1, 2]"}]))
    outside = tmp / "elsewhere.txt"
    outside.write_text("x")
    streams = [
        ("an inline result", _stream(LIST, args, [{"type": "text", "text": "[]"}]), "[]"),
        ("a result saved to a file", _stream(LIST, args, f"Error: result (9 characters) exceeds maximum allowed tokens. Output has been saved to {saved} in chunks", True),
         saved.read_text()),
        ("a saved list of text blocks", _stream(LIST, args, f"Output has been saved to {blocks}", True), "[1, 2]"),
        ("a 403", _stream(LIST, args, "Error: 403 Forbidden", True), SyncError("design-login")),
        ("no call made", _stream(LIST, args, "", calls=0), SyncError("called 0 times")),
        ("two calls made", _stream(LIST, args, "[]", calls=2), SyncError("called 2 times")),
        ("other arguments", _stream(LIST, {"project_id": "p"}, "[]"), SyncError("was called with")),
        ("a saved file outside Claude Code's folder", _stream(LIST, args, f"Output has been saved to {outside}", True), SyncError("is not a file under")),
    ]
    for what, stream, want in streams:
        try:
            got = result_text(stream, LIST, args, base)
            ok = not isinstance(want, SyncError) and got == want
        except SyncError as e:
            got, ok = str(e), isinstance(want, SyncError) and str(want) in str(e)
        if not ok:
            bad += 1
            print(f"FAIL: design-sync reading {what}: got {str(got)[:120]!r}")
    decodes = [("a &amp;lt; b", "a &lt; b"), ("&lt;&gt;&amp;", "<>&"), ("\u20b9 1,00,000", "\u20b9 1,00,000")]
    for body, want in decodes:
        if decode(body) != want:
            bad += 1
            print(f"FAIL: design-sync decoded {body!r} as {decode(body)!r}, not {want!r}")
    return len(streams) + len(decodes), bad


def selftest() -> int:
    """Each case mutates a fresh copy (the stand-in Claude Design, or the repo) and expects its exit code and words; the
    first case proves the copy itself makes no drift, so a refusal is the check's and not the harness's."""
    cases = _cases()
    with tempfile.TemporaryDirectory() as t:
        readings, bad = _readings(Path(t))
    for what, mutate, drop, command, code_wanted, words, after in cases:
        with tempfile.TemporaryDirectory() as t:
            try:
                root, fake = _fixture(Path(t))
            except (SyncError, OSError, UnicodeDecodeError, KeyError) as e:
                print(f"FAIL: the design-sync selftest cannot build its stand-in from the mirror: {e}")
                return 1
            mutate(fake, root)
            before = (root / "docs/design/claude-design.json").read_text()
            lines: list[str] = []
            try:
                code = check(fake, root, lines.append) if command == "check" else pull(fake, root, drop, lines.append)
            except Exception as e:  # noqa: BLE001 - a crash is a failure the case names, not one that stops the selftest
                code, lines = f"a crash ({type(e).__name__}: {e})", lines
            text = "\n".join(lines)
            if code != code_wanted or not re.search(words, text, re.S) or not after(root, before, fake):
                bad += 1
                print(f"FAIL: design-sync {command} on {what}: exit {code}, wanted {code_wanted} and {words!r}; got: {text[-300:]!r}")
    print(f"design-sync selftest: {len(cases)} mutated copies and {readings} readings, {bad} wrong")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "selftest":
        return selftest()
    drop = tuple(argv[i + 1] for i, a in enumerate(argv) if a == "--drop" and i + 1 < len(argv))
    if cmd not in ("check", "pull") or (drop and cmd != "pull") or len(argv) != 2 + 2 * len(drop):
        print(__doc__)
        return 2
    return check(Headless()) if cmd == "check" else pull(Headless(), drop=drop)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
