#!/usr/bin/env python3
"""Fixed stays fixed: re-run every check in a story's review ledger before each review round.

    python3 scripts/review_regress.py MA-155
    python3 scripts/review_regress.py MA-240 --jobs 4            the checks in 4 worker threads, printed in ledger order
    python3 scripts/review_regress.py MA-240 --only r2-23,r2-37  only these entries (an id the ledger lacks is an error)
    python3 scripts/review_regress.py --every --jobs 4           every review/*/fixed.json as one pool, one total
    python3 scripts/review_regress.py --state MA-161             validate review/MA-161/state.json
    python3 scripts/review_regress.py --selftest                 prove the runner's own refusals on temporary ledgers

Reads review/<key>/fixed.json, one entry per blocking finding a review found and a later round fixed (and any owner
decision the review must keep), each with a check that passes while the fix holds (the global rule in ~/.claude/CLAUDE.md, "Fixed stays fixed"). Check types:

- `cmd`: a command that must exit 0 (`"run": "python3 scripts/plan_sync.py selftest"`, through the shell), or
  `"argv": ["python3", "scripts/plan_sync.py", "check"]` (a list, run with no shell); one of the two, never both.
- `cmd_fails`: the same, but the command must exit non-zero (`start` refusing a story).
- `grep`: `file`, or each of `files` (which may hold glob patterns such as `docs/design/app-v1/*.dc.html`, and
  takes the place of `file` when both are given), must contain (`present: true`) or must not contain
  (`present: false`) the regex `pattern`, matched across line breaks (`\\s` spans them), case-insensitively when
  `ignore_case` is true. A missing file, or a glob that matches nothing, is a failure, never a pass.
- `trace`: a row of docs/trace.json (`key`) whose `field` equals `value`, or contains `contains`, or lists a board
  named `board`. A `contains` check on the `undrawn` list may add `or_drawn: {"file": "<file>", "boards": [...]}`: it
  also passes once the screen is drawn, that is, the row is `planned` or `picked` and lists every named board of
  that file (a to-do item that is done is not lost; dropping the board that draws it still fails, whatever else
  stays on the row). It applies to nothing else; an `or_drawn` without a `file` and a non-empty `boards` list fails
  the entry. A `contains` check on a field the row lacks fails.
- `manual`: a check only a person or a tool outside the repo can make (Jira text, a board); it is printed for the
  reviewers, who must look at it.

An entry is never deleted from a ledger. When the owner stops a check, the entry gains `"retired": "<his words and
the story>"`; the runner skips it, prints `RETIRED: <id> - <reason>` and counts it (MA-303 retired the checks on
docs/design this way).

Every command runs in its own process group with a time limit: 600 s, or the entry's `timeout` (seconds). A command
that runs over has its whole group killed (SIGKILL, so a hung browser or a grandchild goes too) and FAILs with
"timed out after N s"; any process a command leaves behind is killed when it ends. A FAIL prints the last 8 lines of
the command's output (stdout and stderr together), indented. Identical commands (the same `run` string, or the same
`argv`) run once per invocation, across stories under `--every`; later entries reuse the result and say so.

Exit codes: 0 every check passed; 1 a check FAILed (a regression: fix it before the round starts), or `--state`
found a fault, or the selftest went wrong; 2 a malformed ledger or a usage error; 3 nothing failed but `manual`
checks remain, for one fresh verifier to look at before any lane starts (`.claude/rules/independent-review.md`).

`--jobs N` (default 1) runs the checks in N threads; each line is still printed in the ledger's order, and the result
is the same as a serial run. `--only <id,id,...>` runs just those entries of one story, to re-check a fix; an id the
ledger does not hold fails the run (exit 2) rather than check nothing. `--every` runs every review/*/fixed.json as one
pool, printing a section per story and one total.

`--state MA-<n>` validates review/MA-<n>/state.json: `rounds` equals the number of `history` entries, numbered 1 to
N with no gap; each round names its `reviewed_sha` (`sha` in the older files); the top `reviewed_sha` is the last
round's; every ledger id `r<k>-...` names round 0 (fixes made before round 1) or a round in the history (owner
decisions such as `o1` or `d1-...` carry no round); more than five rounds only where each round past five records
Arun's word (its `review_approval`, `asked` or `arun`, or a top `note` naming that round). The optional fields
`review_approval`, `gate_results`, `deferred_gates`, `findings`, `next_round` (top level or per round) and
`owner_decisions` are type-checked when present.

`REVIEW_REGRESS_DIR` points the runner at another review folder (the selftest's temporary ledgers); commands still
run from the repo's root.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TIMEOUT = 600
TAIL = 8
CMD = ("cmd", "cmd_fails")
KINDS = CMD + ("grep", "trace", "manual")


def review_dir() -> Path:
    return Path(os.environ["REVIEW_REGRESS_DIR"]) if os.environ.get("REVIEW_REGRESS_DIR") else ROOT / "review"


# ---- commands -------------------------------------------------------------------------------------------------

def cmd_text(c: dict) -> str:
    return c["run"] if "run" in c else " ".join(c["argv"])


def cmd_key(c: dict) -> tuple:
    return ("run", c["run"]) if "run" in c else ("argv", tuple(c["argv"]))


def _killpg(pgid: int) -> None:
    try:
        os.killpg(pgid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def run_command(c: dict) -> dict:
    """Run a cmd entry's command in its own process group; kill the group on timeout and when it ends."""
    limit = c.get("timeout", DEFAULT_TIMEOUT)
    shell = "run" in c
    start = time.monotonic()
    p = subprocess.Popen(c["run"] if shell else c["argv"], shell=shell, cwd=ROOT, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, text=True, errors="replace",
                         start_new_session=True)
    timed_out, out = False, ""
    try:
        out, _ = p.communicate(timeout=limit)
    except subprocess.TimeoutExpired:
        timed_out = True
        _killpg(p.pid)
        try:
            out, _ = p.communicate(timeout=10)
        except subprocess.TimeoutExpired:  # an escaped process holds the pipe open
            p.kill()
            p.stdout.close()
            p.wait()
            out = "(output lost: a process outside the group held the pipe open)"
    _killpg(p.pid)  # whatever the command left running in its group
    return {"rc": p.returncode, "timed_out": timed_out, "timeout": limit, "output": out or "",
            "secs": time.monotonic() - start}


def judge(c: dict, res: dict) -> tuple[bool, str, list[str]]:
    """A cmd or cmd_fails entry's verdict on a command's result: (ok, what, the output's tail on a failure)."""
    tail = [ln for ln in res["output"].rstrip("\n").splitlines()][-TAIL:]
    if res["timed_out"]:
        return False, f"{cmd_text(c)} (timed out after {res['timeout']} s)", tail
    ok = (res["rc"] == 0) == (c["type"] == "cmd")
    what = cmd_text(c) if ok else f"{cmd_text(c)} (exit {res['rc']}, {'expected 0' if c['type'] == 'cmd' else 'expected non-zero'})"
    return ok, what, ([] if ok else tail)


# ---- the other checks -----------------------------------------------------------------------------------------

def run_check(c: dict) -> tuple[bool | None, str]:
    """One check's verdict: True, False, or None for a manual check; with what it checked. (MA-158's ledger calls this.)"""
    ok, what, _ = _check(c)
    return ok, what


def _check(c: dict) -> tuple[bool | None, str, list[str]]:
    kind = c.get("type")
    if kind in CMD:
        return judge(c, run_command(c))
    if kind == "grep":
        files, missing = [], []
        for f in c.get("files") or [c["file"]]:
            if Path(f).is_absolute() or ".." in Path(f).parts:
                missing.append(f"{f} (paths stay inside the repo)")
                continue
            found = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob(f) if p.is_file()) if any(ch in f for ch in "*?[") else [f]
            if not found or not all((ROOT / x).is_file() for x in found):
                missing.append(f)
            files += found
        if missing:
            return False, f"missing: {', '.join(missing)}", []
        flags = re.M | (re.I if c.get("ignore_case") else 0)
        hits = [f for f in files if re.search(c["pattern"], (ROOT / f).read_text(), flags)]
        want = c.get("present", True)
        ok = len(hits) == len(files) if want else not hits
        detail = f" (lacking in {', '.join(f for f in files if f not in hits)})" if want and not ok else ""
        detail += f" (found in {', '.join(hits)})" if hits and not want else ""
        return ok, f"{len(files)} file(s) {'have' if want else 'lack'} /{c['pattern']}/{detail}", []
    if kind == "trace":
        trace = json.loads((ROOT / "docs" / "trace.json").read_text())
        row = next((i for i in trace.get("items", []) if i.get("key") == c["key"]), None)
        if row is None:
            return False, f"{c['key']} is not in the trace", []
        if "board" in c:
            return any(b.get("board") == c["board"] for b in row.get("boards", [])), f"{c['key']} lists board {c['board']!r}", []
        val = row.get(c["field"])
        drawn = c.get("or_drawn")
        if drawn is not None and not (isinstance(drawn, dict) and isinstance(drawn.get("file"), str)
                                      and isinstance(drawn.get("boards"), list) and drawn["boards"]):
            return False, f"{c['key']}: or_drawn needs a file and a non-empty boards list, got {drawn!r}", []
        if drawn and c.get("field") == "undrawn" and "contains" in c and row.get("design") in ("planned", "picked"):
            have = {(b.get("file"), b.get("board")) for b in row.get("boards", [])}
            if all((drawn["file"], n) in have for n in drawn["boards"]):
                return True, f"{c['key']} drawn: {', '.join(drawn['boards'])} ({drawn['file']})", []
        if "value" in c:
            return val == c["value"], f"{c['key']}.{c['field']} == {c['value']!r}", []
        if val is None:
            return False, f"{c['key']} has no {c['field']}", []
        ok = any(c["contains"] in str(x) for x in val) if isinstance(val, list) else c["contains"] in str(val)
        return ok, f"{c['key']}.{c['field']} contains {c['contains']!r}", []
    if kind == "manual":
        return None, c["what"], []
    return False, f"unknown check type {kind!r}", []


# ---- the ledger -----------------------------------------------------------------------------------------------

def entry_faults(e) -> list[str]:
    """What makes an entry malformed (exit 2), checked before anything runs."""
    if not isinstance(e, dict):
        return [f"an entry is not an object: {e!r:.60}"]
    eid = e.get("id")
    if not isinstance(eid, str) or not eid:
        return [f"an entry has no id: {json.dumps(e)[:80]}"]
    out = []
    if "retired" in e and not (isinstance(e["retired"], str) and e["retired"].strip()):
        out.append(f"{eid}: retired must be the owner's words, a non-empty string")
    c = e.get("check")
    if not isinstance(c, dict):
        return out + [f"{eid}: no check object"]
    kind = c.get("type")
    if kind not in KINDS:
        return out + [f"{eid}: unknown check type {kind!r}"]
    if kind in CMD:
        has_run, has_argv = "run" in c, "argv" in c
        if has_run == has_argv:
            out.append(f"{eid}: a {kind} check takes run or argv, exactly one")
        elif has_run and not (isinstance(c["run"], str) and c["run"].strip()):
            out.append(f"{eid}: run must be a non-empty string")
        elif has_argv and not (isinstance(c["argv"], list) and c["argv"] and all(isinstance(a, str) for a in c["argv"])):
            out.append(f"{eid}: argv must be a non-empty list of strings")
        t = c.get("timeout", DEFAULT_TIMEOUT)
        if isinstance(t, bool) or not isinstance(t, (int, float)) or t <= 0:
            out.append(f"{eid}: timeout must be a positive number of seconds, got {t!r}")
    elif kind == "grep" and not (isinstance(c.get("pattern"), str) and (c.get("files") or c.get("file"))):
        out.append(f"{eid}: a grep check needs a pattern and a file or files")
    elif kind == "trace" and not (isinstance(c.get("key"), str) and ("board" in c or "field" in c)):
        out.append(f"{eid}: a trace check needs a key and a field or a board")
    elif kind == "manual" and not isinstance(c.get("what"), str):
        out.append(f"{eid}: a manual check needs what")
    return out


def load_ledger(path: Path) -> tuple[list, list[str]]:
    try:
        entries = json.loads(path.read_text(encoding="utf-8"))
    except ValueError as err:
        return [], [f"{path}: not JSON ({err})"]
    if not isinstance(entries, list):
        return [], [f"{path}: the ledger must be a list of entries"]
    faults, seen = [], set()
    for e in entries:
        faults += entry_faults(e)
        if isinstance(e, dict) and isinstance(e.get("id"), str):
            if e["id"] in seen:
                faults.append(f"{e['id']}: the id is used twice")
            seen.add(e["id"])
    return entries, [f"{path.parent.name}: {f}" for f in faults]


# ---- running ledgers ------------------------------------------------------------------------------------------

def run_ledgers(stories: list[tuple[str, list[dict], int]], jobs: int, every: bool) -> int:
    """Run (key, entries, ledger size) stories as one pool, print in ledger order, return the exit code."""
    pool = ThreadPoolExecutor(max_workers=jobs)
    first_of: dict[tuple, tuple[Future, str]] = {}
    plan = []  # per story: [(entry, future or None, the entry whose command this reuses)]
    for key, entries, _ in stories:
        rows = []
        for e in entries:
            if "retired" in e:
                rows.append((e, None, None))
                continue
            c = e["check"]
            if c["type"] in CMD:
                k = cmd_key(c)
                if k in first_of:
                    rows.append((e, first_of[k][0], first_of[k][1]))
                    continue
                fut = pool.submit(run_command, c)
                first_of[k] = (fut, f"{key} {e['id']}" if every else e["id"])
                rows.append((e, fut, None))
            else:
                rows.append((e, pool.submit(_check, c), None))
        plan.append(rows)

    tot = {"checks": 0, "run": 0, "retired": 0, "passed": 0, "failed": 0, "manual": 0, "reused": 0}
    try:
        for (key, entries, size), rows in zip(stories, plan):
            n = {k: 0 for k in tot}
            if every:
                print(f"\n== {key} ({len(entries)} checks)", flush=True)
            for e, fut, dup in rows:
                n["checks"] += 1
                if fut is None:
                    n["retired"] += 1
                    print(f"RETIRED: {e['id']} - {e['retired']}", flush=True)
                    continue
                c = e["check"]
                if c["type"] in CMD:
                    ok, what, tail = judge(c, fut.result())
                    if dup:
                        n["reused"] += 1
                        what += f"; same command as {dup}, run once"
                else:
                    ok, what, tail = fut.result()
                if ok is None:
                    n["manual"] += 1
                    print(f"MANUAL {e['id']}: {e['finding']} [{what}]", flush=True)
                    continue
                n["run"] += 1
                n["passed" if ok else "failed"] += 1
                print(f"{'ok    ' if ok else 'FAIL  '} {e['id']}: {e['finding']} [{what}]", flush=True)
                for ln in tail:
                    print(f"        | {ln}", flush=True)
            scope = f" (--only: {len(entries)} of {size})" if len(entries) != size else ""
            print(f"review-regress {key}: {n['checks']} checks{scope}: {n['run']} run ({n['passed']} passed, "
                  f"{n['failed']} failed), {n['retired']} retired, {n['manual']} manual"
                  + (f", {n['reused']} reused a command already run" if n["reused"] else ""), flush=True)
            for k in tot:
                tot[k] += n[k]
    finally:
        pool.shutdown(wait=True, cancel_futures=True)
    if every:
        print(f"\nreview-regress, every ledger ({len(stories)} stories): {tot['checks']} checks: {tot['run']} run "
              f"({tot['passed']} passed, {tot['failed']} failed), {tot['retired']} retired, {tot['manual']} manual; "
              f"{len(first_of)} distinct commands run, {tot['reused']} reused")
    if tot["failed"]:
        return 1
    return 3 if tot["manual"] else 0


# ---- the state file -------------------------------------------------------------------------------------------

SHA = re.compile(r"^[0-9a-f]{7,40}$")
FINDING_ID = re.compile(r"^R(\d+)-[a-z]+\d+$")
STATUS = re.compile(r"^(open|fixed|wontfix|deferred\b.*\bMA-\d+\b.*)$", re.S)
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _nonempty(v) -> bool:
    return isinstance(v, str) and bool(v.strip())


def optional_faults(where: str, d: dict, round_no: int | None) -> list[str]:
    out = []
    if "review_approval" in d and not _nonempty(d["review_approval"]):
        out.append(f"{where}: review_approval must be Arun's words, a non-empty string")
    if "gate_results" in d:
        g = d["gate_results"]
        if isinstance(g, list):
            for i, r in enumerate(g):
                if not (isinstance(r, dict) and (_nonempty(r.get("command")) or _nonempty(r.get("gate"))) and "result" in r):
                    out.append(f"{where}: gate_results[{i}] needs a command (or gate) and a result")
        elif isinstance(g, dict):
            if not all(isinstance(k, str) and isinstance(v, (str, bool, int, dict, list)) for k, v in g.items()):
                out.append(f"{where}: gate_results maps each gate to its result")
        else:
            out.append(f"{where}: gate_results must be a list or an object")
    if "deferred_gates" in d:
        g = d["deferred_gates"]
        if not (isinstance(g, list) and all(_nonempty(x) or isinstance(x, dict) for x in g)):
            out.append(f"{where}: deferred_gates must be a list of gates (strings or objects), each with why")
    if "findings" in d:
        fs = d["findings"]
        if not isinstance(fs, list):
            out.append(f"{where}: findings must be a list")
        else:
            for i, f in enumerate(fs):
                at = f"{where}: findings[{i}]"
                if not isinstance(f, dict):
                    out.append(f"{at} is not an object")
                    continue
                m = FINDING_ID.match(f.get("id", "")) if isinstance(f.get("id"), str) else None
                if not m:
                    out.append(f"{at}: id must read R<round>-<lane letter><n>, as R2-a3, got {f.get('id')!r}")
                elif round_no is not None and int(m.group(1)) != round_no:
                    out.append(f"{at}: id {f['id']} is not round {round_no}'s")
                if f.get("severity") not in ("P0", "P1", "P2", "P3"):
                    out.append(f"{at}: severity must be P0 to P3, got {f.get('severity')!r}")
                if not isinstance(f.get("blocking"), bool):
                    out.append(f"{at}: blocking must be true or false")
                lane = f.get("lane")
                if not (_nonempty(lane) or (isinstance(lane, list) and lane and all(_nonempty(x) for x in lane))):
                    out.append(f"{at}: lane must be a lane letter or a list of them")
                for k in ("anchor", "evidence"):
                    if not _nonempty(f.get(k)):
                        out.append(f"{at}: {k} must be a non-empty string")
                if not (isinstance(f.get("status"), str) and STATUS.match(f["status"])):
                    out.append(f"{at}: status must be open, fixed, wontfix or deferred with its issue key, got {f.get('status')!r}")
    if "next_round" in d and not (d["next_round"] is None or _nonempty(d["next_round"]) or isinstance(d["next_round"], dict)):
        out.append(f"{where}: next_round must be a string, an object or null")
    if "owner_decisions" in d:
        od = d["owner_decisions"]
        if not isinstance(od, list):
            out.append(f"{where}: owner_decisions must be a list")
        else:
            for i, x in enumerate(od):
                ok = (isinstance(x, dict) and isinstance(x.get("date"), str) and DATE.match(x["date"])
                      and isinstance(x.get("story"), str) and re.match(r"^MA-\d+$", x["story"])
                      and _nonempty(x.get("what")) and _nonempty(x.get("words")))
                if not ok:
                    out.append(f"{where}: owner_decisions[{i}] needs date (YYYY-MM-DD), story (MA-<n>), what and words")
    return out


def state_faults(key: str) -> list[str]:
    folder = review_dir() / key
    path = folder / "state.json"
    if not path.is_file():
        return [f"no state file ({path})"]
    try:
        s = json.loads(path.read_text(encoding="utf-8"))
    except ValueError as err:
        return [f"state.json is not JSON ({err})"]
    if not isinstance(s, dict):
        return ["state.json must be an object"]
    out = []
    hist = s.get("history")
    if not isinstance(hist, list) or not all(isinstance(h, dict) for h in hist):
        return out + ["history must be a list of rounds (objects)"]
    rounds = s.get("rounds")
    nums = [h.get("round") for h in hist]
    if nums != list(range(1, len(hist) + 1)):
        out.append(f"history rounds are numbered {nums}, not 1 to {len(hist)} in order")
    if isinstance(rounds, bool) or not isinstance(rounds, int) or rounds != len(hist):
        out.append(f"rounds is {rounds!r} but the history holds {len(hist)} rounds")
    shas = []
    for i, h in enumerate(hist, 1):
        sha = h.get("reviewed_sha", h.get("sha"))
        if not (isinstance(sha, str) and SHA.match(sha)):
            out.append(f"round {h.get('round', i)} has no reviewed_sha (got {sha!r})")
        shas.append(sha)
        out += optional_faults(f"round {h.get('round', i)}", h, h.get("round") if isinstance(h.get("round"), int) else None)
    if "reviewed_sha" in s and shas and s["reviewed_sha"] != shas[-1]:
        out.append(f"reviewed_sha {s['reviewed_sha']!r} is not the last round's ({shas[-1]!r})")
    note = s.get("note") if isinstance(s.get("note"), str) else ""
    for i, h in enumerate(hist, 1):
        if i <= 5:
            continue
        own = any(_nonempty(h.get(k)) for k in ("review_approval", "asked", "arun"))
        noted = "Arun" in note and re.search(rf"\bround {i}\b", note)
        if not (own or noted):
            out.append(f"round {i} is past five with no record of Arun's word (review_approval, asked, arun, or the note)")
    out += optional_faults("state", s, None)
    ledger = folder / "fixed.json"
    if ledger.is_file():
        entries, faults = load_ledger(ledger)
        out += faults
        for e in entries:
            m = re.match(r"^r(\d+)-", e.get("id", "") if isinstance(e, dict) else "")
            if m and int(m.group(1)) != 0 and int(m.group(1)) > len(hist):
                out.append(f"ledger id {e['id']} names round {m.group(1)}, which the history does not hold")
    return out


# ---- selftest -------------------------------------------------------------------------------------------------

def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    r = subprocess.run(["ps", "-o", "stat=", "-p", str(pid)], capture_output=True, text=True)
    return bool(r.stdout.strip()) and not r.stdout.strip().startswith("Z")


def selftest() -> int:
    wrong, cases = [], 0
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        rev = t / "review"

        def ledger(key: str, entries: list, state: dict | None = None) -> None:
            (rev / key).mkdir(parents=True, exist_ok=True)
            (rev / key / "fixed.json").write_text(json.dumps(entries))
            if state is not None:
                (rev / key / "state.json").write_text(json.dumps(state))

        def run(*args: str) -> subprocess.CompletedProcess:
            env = dict(os.environ, REVIEW_REGRESS_DIR=str(rev))
            return subprocess.run([sys.executable, str(Path(__file__).resolve()), *args], env=env, cwd=ROOT,
                                  capture_output=True, text=True, timeout=120)

        def case(name: str, ok: bool, out: str = "") -> None:
            nonlocal cases
            cases += 1
            if not ok:
                wrong.append(name)
                print(f"WRONG {name}\n" + "\n".join(f"        | {ln}" for ln in out.splitlines()[-12:]))
            else:
                print(f"ok    {name}")

        # 1. a timeout kills the sleeping child and its grandchild, fails, and says why
        cp, gp = t / "child.pid", t / "grandchild.pid"
        ledger("MA-T1", [{"id": "r1-1", "finding": "sleeps", "check": {
            "type": "cmd", "timeout": 1,
            "run": f"echo $$ > {cp}; sh -c 'echo $$ > {gp}; exec sleep 300' & sleep 300"}}])
        start = time.monotonic()
        r = run("MA-T1")
        took = time.monotonic() - start
        pids = [int(p.read_text()) for p in (cp, gp) if p.is_file()]
        deadline = time.monotonic() + 5
        while any(_alive(p) for p in pids) and time.monotonic() < deadline:
            time.sleep(0.1)
        case("a timeout kills the child and the grandchild and FAILs",
             r.returncode == 1 and "timed out after 1 s" in r.stdout and len(pids) == 2
             and not any(_alive(p) for p in pids) and took < 30, r.stdout + r.stderr)

        # 2. an identical command runs once, within a story and across stories under --every
        shutil.rmtree(rev, ignore_errors=True)
        counter = t / "count"
        same = {"type": "cmd", "run": f"echo x >> {counter}"}
        ledger("MA-T2", [{"id": "r1-1", "finding": "a", "check": same}, {"id": "r1-2", "finding": "b", "check": same}])
        ledger("MA-T3", [{"id": "r1-1", "finding": "c", "check": same},
                         {"id": "r1-2", "finding": "d", "check": {"type": "cmd", "argv": [sys.executable, "-c", "pass"]}}])
        r = run("--every", "--jobs", "3")
        runs = len(counter.read_text().splitlines()) if counter.is_file() else 0
        case("a duplicate command runs once, and later entries say so",
             r.returncode == 0 and runs == 1 and r.stdout.count("run once") == 2, r.stdout + r.stderr)
        shutil.rmtree(rev, ignore_errors=True)

        # 3. a retired entry is skipped, printed and counted
        marker = t / "retired-ran"
        ledger("MA-T4", [{"id": "r1-1", "finding": "kept", "check": {"type": "cmd", "argv": [sys.executable, "-c", "pass"]}},
                         {"id": "r1-2", "finding": "stopped", "retired": "Arun: stop it", "check": {"type": "cmd", "run": f"touch {marker}"}}])
        r = run("MA-T4")
        case("a retired entry is skipped, printed and counted",
             r.returncode == 0 and not marker.exists() and "RETIRED: r1-2 - Arun: stop it" in r.stdout
             and "1 retired" in r.stdout, r.stdout + r.stderr)

        # 4. exit 3 when nothing failed but a manual check remains; exit 1 with the output's tail on a failure
        ledger("MA-T5", [{"id": "r1-1", "finding": "passes", "check": {"type": "cmd", "run": "true"}},
                         {"id": "r1-2", "finding": "by eye", "check": {"type": "manual", "what": "look at it"}}])
        r = run("MA-T5")
        case("a manual check left over exits 3", r.returncode == 3 and "1 manual" in r.stdout, r.stdout + r.stderr)
        ledger("MA-T6", [{"id": "r1-1", "finding": "fails", "check": {"type": "cmd", "run": "for i in 1 2 3 4 5 6 7 8 9 10; do echo line$i; done; exit 4"}},
                         {"id": "r1-2", "finding": "by eye", "check": {"type": "manual", "what": "look"}}])
        r = run("MA-T6")
        case("a FAIL exits 1 and prints the last 8 lines of its output",
             r.returncode == 1 and "| line10" in r.stdout and "| line3" in r.stdout and "| line2\n" not in r.stdout
             and "FAIL" in r.stdout, r.stdout + r.stderr)
        ledger("MA-T7", [{"id": "r1-1", "finding": "both", "check": {"type": "cmd", "run": "true", "argv": ["true"]}}])
        r = run("MA-T7")
        case("a malformed entry exits 2 before anything runs", r.returncode == 2, r.stdout + r.stderr)

        # 5. --state accepts a whole history, and refuses a gap, a ledger round it lacks, and a sixth round unasked
        good = {"rounds": 2, "reviewed_sha": "bbbbbbb",
                "history": [{"round": 1, "reviewed_sha": "aaaaaaa"}, {"round": 2, "sha": "bbbbbbb"}],
                "owner_decisions": [{"date": "2026-11-02", "story": "MA-303", "what": "x", "words": "y"}]}
        ledger("MA-T8", [{"id": "r2-1", "finding": "f", "check": {"type": "manual", "what": "w"}},
                         {"id": "r0-1", "finding": "f", "check": {"type": "manual", "what": "w"}},
                         {"id": "o1", "finding": "f", "check": {"type": "manual", "what": "w"}}], good)
        r = run("--state", "MA-T8")
        case("--state accepts a whole history", r.returncode == 0, r.stdout + r.stderr)
        gap = dict(good, history=[{"round": 1, "reviewed_sha": "aaaaaaa"}, {"round": 3, "reviewed_sha": "bbbbbbb"}])
        ledger("MA-T9", [], gap)
        r = run("--state", "MA-T9")
        case("--state refuses a gap in the round numbers", r.returncode == 1 and "not 1 to 2" in r.stdout, r.stdout + r.stderr)
        ledger("MA-T10", [{"id": "r3-1", "finding": "f", "check": {"type": "manual", "what": "w"}}], good)
        r = run("--state", "MA-T10")
        case("--state refuses a ledger id naming a round the history lacks", r.returncode == 1 and "r3-1" in r.stdout, r.stdout + r.stderr)
        six = {"rounds": 6, "history": [{"round": i, "reviewed_sha": "abcdef1"} for i in range(1, 7)]}
        ledger("MA-T11", [], six)
        r = run("--state", "MA-T11")
        case("--state refuses a sixth round with no word from Arun", r.returncode == 1 and "round 6" in r.stdout, r.stdout + r.stderr)
        six["history"][5]["review_approval"] = "Arun: run round 6"
        ledger("MA-T11", [], six)
        r = run("--state", "MA-T11")
        case("--state accepts a sixth round Arun asked for", r.returncode == 0, r.stdout + r.stderr)
        bad = dict(good, history=[{"round": 1, "reviewed_sha": "aaaaaaa"},
                                  {"round": 2, "reviewed_sha": "bbbbbbb", "findings": [{"id": "R2-a1", "severity": "P5"}]}])
        ledger("MA-T12", [], bad)
        r = run("--state", "MA-T12")
        case("--state type-checks a finding", r.returncode == 1 and "severity" in r.stdout, r.stdout + r.stderr)
    print(f"review-regress selftest: {cases} cases, {len(wrong)} wrong")
    return 1 if wrong else 0


# ---- command line ---------------------------------------------------------------------------------------------

def parse(argv: list[str]) -> dict:
    o = {"key": None, "jobs": 1, "only": None, "every": False, "state": None, "selftest": False, "err": None}
    rest = list(argv[1:])
    while rest:
        a = rest.pop(0)
        if a in ("--jobs", "--only", "--state"):
            if not rest:
                o["err"] = f"{a} needs a value"
                return o
            v = rest.pop(0)
            if a == "--jobs":
                if not v.isdigit() or int(v) < 1:
                    o["err"] = f"--jobs takes a whole number from 1, got {v!r}"
                    return o
                o["jobs"] = int(v)
            elif a == "--only":
                o["only"] = [x.strip() for x in v.split(",") if x.strip()]
                if not o["only"]:
                    o["err"] = "--only needs at least one id"
                    return o
            else:
                o["state"] = v
        elif a == "--every":
            o["every"] = True
        elif a == "--selftest":
            o["selftest"] = True
        elif a.startswith("-"):
            o["err"] = f"unknown option {a}"
            return o
        elif o["key"] is None:
            o["key"] = a
        else:
            o["err"] = f"one story at a time, got {o['key']} and {a} (--every runs them all)"
            return o
    modes = sum(bool(x) for x in (o["key"], o["every"], o["state"], o["selftest"]))
    if modes > 1:
        o["err"] = "give one of a story key, --every, --state MA-<n> or --selftest"
    elif o["only"] and not o["key"]:
        o["err"] = "--only works on one story's ledger"
    return o


def main(argv: list[str]) -> int:
    o = parse(argv)
    if o["err"]:
        print(f"review-regress: {o['err']}", file=sys.stderr)
        return 2
    if o["selftest"]:
        return selftest()
    if o["state"]:
        faults = state_faults(o["state"])
        for f in faults:
            print(f"fault  {o['state']}: {f}")
        print(f"review-regress --state {o['state']}: " + (f"{len(faults)} fault(s)" if faults else "ok"))
        return 1 if faults else 0
    if o["every"]:
        paths = sorted(review_dir().glob("*/fixed.json"))
        stories, faults = [], []
        for p in paths:
            entries, f = load_ledger(p)
            faults += f
            stories.append((p.parent.name, entries, len(entries)))
        if faults:
            print("review-regress: malformed ledger(s), nothing run:\n  " + "\n  ".join(faults), file=sys.stderr)
            return 2
        return run_ledgers(stories, o["jobs"], every=True)
    key, only = o["key"], o["only"]
    if key is None:
        print(__doc__)
        return 2
    path = review_dir() / key / "fixed.json"
    if not path.is_file():
        if only:
            print(f"review-regress {key}: --only names {', '.join(only)} but there is no ledger (review/{key}/fixed.json)", file=sys.stderr)
            return 2
        print(f"review-regress {key}: no ledger yet (review/{key}/fixed.json); nothing fixed to re-check")
        return 0
    entries, faults = load_ledger(path)
    if faults:
        print("review-regress: malformed ledger, nothing run:\n  " + "\n  ".join(faults), file=sys.stderr)
        return 2
    total = len(entries)
    if only:
        ids = {e["id"] for e in entries}
        unknown = [i for i in only if i not in ids]
        if unknown:
            print(f"review-regress {key}: --only names ids the ledger does not hold: {', '.join(unknown)}", file=sys.stderr)
            return 2
        entries = [e for e in entries if e["id"] in set(only)]
    return run_ledgers([(key, entries, total)], o["jobs"], every=False)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
