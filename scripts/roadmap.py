#!/usr/bin/env python3
"""The roadmap: every story's estimate and every phase's dates (MA-228).

docs/roadmap.json holds the inputs (the estimates, the start, the buffer, how much runs side by side, the days off)
and the schedule worked out from them. PLAN.md's Timeline table, the Confluence pages and the phase epics' due dates
in Jira all show that schedule, so a change starts here.

    python3 scripts/roadmap.py write   # work out the schedule, store it, and rewrite PLAN.md's Timeline table
    python3 scripts/roadmap.py check   # fail when an estimate is missing, or the schedule or the table is stale
    python3 scripts/roadmap.py show    # print the schedule
"""
from __future__ import annotations

import datetime
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROADMAP = ROOT / "docs" / "roadmap.json"
TRACE = ROOT / "docs" / "trace.json"
PLAN = ROOT / "PLAN.md"
TABLE_START, TABLE_END = "<!-- roadmap:start -->", "<!-- roadmap:end -->"


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def days_off(rm: dict) -> set[datetime.date]:
    off = {datetime.date.fromisoformat(d) for d in rm.get("bank_holidays", [])}
    for a, b in rm.get("breaks", []):
        d, end = datetime.date.fromisoformat(a), datetime.date.fromisoformat(b)
        while d <= end:
            off.add(d)
            d += datetime.timedelta(days=1)
    return off


def working(d: datetime.date, off: set[datetime.date]) -> bool:
    return d.weekday() < 5 and d not in off


def next_working(d: datetime.date, off: set[datetime.date]) -> datetime.date:
    while not working(d, off):
        d += datetime.timedelta(days=1)
    return d


def add_working(start: datetime.date, n: int, off: set[datetime.date]) -> datetime.date:
    """The last day of n working days that begin on start (itself a working day)."""
    d, left = start, n - 1
    while left > 0:
        d += datetime.timedelta(days=1)
        if working(d, off):
            left -= 1
    return d


def manual(item: dict) -> bool:
    return "manual" in (item.get("labels") or [])


def schedule(rm: dict, trace: dict) -> dict[str, dict]:
    """Each phase in build order: its lane days, Arun's days, working days, start and end ('on_demand' phases have no dates)."""
    off, est = days_off(rm), rm.get("estimates", {})
    rules = rm.get("phases", {})
    out: dict[str, dict] = {}
    day = next_working(datetime.date.fromisoformat(rm["start"]), off)
    for p in sorted(trace["phases"], key=lambda p: p["phase"]):
        n, rule = p["phase"], rules.get(str(p["phase"]), {})
        items = [i for i in trace["items"] if i.get("phase") == n]
        lane = sum(est.get(i["key"], 0) for i in items if not manual(i))
        arun = sum(est.get(i["key"], 0) for i in items if manual(i))
        wdays = math.ceil(lane * (1 + rm["buffer"]) / rm["parallel"]) if lane else 0
        row = {"epic": p["epic"], "title": p["title"], "lane_days": lane, "arun_days": arun, "working_days": wdays}
        if rule.get("on_demand"):
            row["on_demand"] = True
            out[str(n)] = row
            continue
        start = day
        if nb := rule.get("not_before"):
            ref = out.get(str(nb["phase_end"]), {}).get("end")
            if ref:
                earliest = next_working(datetime.date.fromisoformat(ref) + datetime.timedelta(weeks=nb["weeks"]), off)
                start = max(start, earliest)
        end = add_working(start, max(wdays, 1), off)
        row.update(start=start.isoformat(), end=end.isoformat())
        out[str(n)] = row
        day = next_working(end + datetime.timedelta(days=1), off)
    return out


def fmt(iso: str | None) -> str:
    if not iso:
        return ""
    d = datetime.date.fromisoformat(iso)
    return f"{d:%a} {d.day} {d:%b %Y}"


def table(rm: dict) -> str:
    """PLAN.md's Timeline table, from the stored schedule."""
    lines = [TABLE_START,
             "| Phase | Build days | Working days | Starts | Target end |",
             "| --- | --- | --- | --- | --- |"]
    for n, s in rm.get("schedule", {}).items():
        days = f"{s['lane_days']:g}" + (f" (and {s['arun_days']:g} of yours)" if s["arun_days"] else "")
        if s.get("on_demand"):
            lines.append(f"| {n} {s['title']} | {days} | {s['working_days']} | When a new kind is added | |")
        else:
            lines.append(f"| {n} {s['title']} | {days} | {s['working_days']} | {fmt(s['start'])} | {fmt(s['end'])} |")
    lines.append(TABLE_END)
    return "\n".join(lines)


def errors(rm: dict | None = None, trace: dict | None = None, plan_text: str | None = None) -> list[str]:
    rm = rm if rm is not None else load(ROADMAP)
    trace = trace if trace is not None else load(TRACE)
    plan_text = plan_text if plan_text is not None else PLAN.read_text()
    out = []
    for f in ("start", "buffer", "parallel", "estimates"):
        if f not in rm:
            return [f"docs/roadmap.json has no {f}"]
    if not isinstance(rm["parallel"], (int, float)) or rm["parallel"] <= 0:
        return ["docs/roadmap.json: parallel must be a number above 0"]
    keys = {i.get("key") for i in trace.get("items", [])}
    for k in sorted(keys - set(rm["estimates"]), key=lambda k: int(k.split("-")[1])):
        out.append(f"{k} has no estimate in docs/roadmap.json")
    for k in sorted(set(rm["estimates"]) - keys, key=lambda k: int(k.split("-")[1])):
        out.append(f"docs/roadmap.json estimates {k}, which is not a traced story")
    for k, v in rm["estimates"].items():
        if not isinstance(v, (int, float)) or v < 0:
            out.append(f"{k}: estimate {v!r} is not a number of days")
    for d in rm.get("bank_holidays", []):
        if datetime.date.fromisoformat(d).weekday() > 4:
            out.append(f"docs/roadmap.json: bank holiday {d} is a weekend day")
    if out:
        return out
    if rm.get("schedule") != schedule(rm, trace):
        out.append("docs/roadmap.json's schedule is stale: run `python3 scripts/roadmap.py write`")
    elif table(rm) not in plan_text:
        out.append("PLAN.md's Timeline table does not match docs/roadmap.json: run `python3 scripts/roadmap.py write`")
    return out


def write() -> int:
    rm, trace = load(ROADMAP), load(TRACE)
    rm["schedule"] = schedule(rm, trace)
    ROADMAP.write_text(json.dumps(rm, indent=1, ensure_ascii=False) + "\n")
    text = PLAN.read_text()
    if TABLE_START in text and TABLE_END in text:
        a, b = text.index(TABLE_START), text.index(TABLE_END) + len(TABLE_END)
        PLAN.write_text(text[:a] + table(rm) + text[b:])
    else:
        print(f"PLAN.md has no {TABLE_START} block; add one under ## Timeline")
        return 1
    print(f"wrote the schedule to {ROADMAP.relative_to(ROOT)} and PLAN.md's Timeline table")
    return 0


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "write":
        return write()
    if cmd == "show":
        for n, s in schedule(load(ROADMAP), load(TRACE)).items():
            print(f"{n:>2} {s['lane_days']:>5g} {s['working_days']:>4}  {fmt(s.get('start')):>16} -> {fmt(s.get('end')):<16} {s['title']}")
        return 0
    if cmd == "check":
        errs = errors()
        for e in errs:
            print(f"DRIFT: {e}")
        print(f"roadmap: {len(errs)} drift")
        return 1 if errs else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
