#!/usr/bin/env python3
"""MA-261 r1-c4, on the fix's own behaviour (MA-282): a UI story with no boards yet is never listed as back end.

    python3 review/MA-261/check_r1_c4.py        (from the repo's root, as scripts/review_regress.py runs it)

Builds scripts/confluence_docs.py's records from the current trace, then, in memory only, takes each phase's first UI
story (not a manual task) to the state MA-262 and MA-263 were in when the fault was found: design "todo", no boards.
It renders each phase page and the story explorer from that, and requires every such story under "Screens still to
draw (/design-first)" on its phase page and tagged "Still to draw" in stories.csv, and never under "Back end, agent
and infrastructure (no screen)" or tagged "Back end". Each phase's first story with no screen and no boards must stay
under Back end on both, so a renderer that lists everything as still to draw fails too. Nothing is written to disk.
It fails when it finds fewer than five such phases or no back-end story, so it cannot pass on an empty trace.
"""
import csv
import re
import sys

sys.path.insert(0, "scripts")
import confluence_docs as c  # noqa: E402

BACK = "Back end, agent and infrastructure (no screen)"
TODO = "Screens still to draw (/design-first)"

ctx = c.Ctx()
ui, back, bad = [], [], []
for p in ctx.phases:
    items = [i for i in ctx.items if i.get("phase") == p["phase"] and "manual" not in (i.get("labels") or [])]
    u = next((i for i in items if i.get("ui")), None)
    b = next((i for i in items if not i.get("ui") and not i.get("boards")), None)
    if u is None:
        continue
    u.update(design="todo", boards=[])
    ui.append(u["key"])
    page = c.render_phase(ctx, p)

    def row(name: str) -> str:
        m = re.search("<tr><td>" + re.escape(name) + "</td><td>(.*?)</td></tr>", page)
        return m.group(1) if m else ""

    if f">{u['key']}<" not in row(TODO) or f">{u['key']}<" in row(BACK):
        bad.append(f"{u['key']} (no boards yet) on the phase {p['phase']} page")
    if b:
        back.append(b["key"])
        if f">{b['key']}<" not in row(BACK):
            bad.append(f"{b['key']} (no screen) on the phase {p['phase']} page")

rows = list(csv.reader(c.stories_csv(ctx).split("<data>\n")[1].split("</data>")[0].splitlines()))
doors = {r[0].rsplit("/", 1)[1]: r[rows[0].index("Doors")] for r in rows[1:]}
bad += [f"{k} (no boards yet) in stories.csv: {doors.get(k, 'missing')}" for k in ui if doors.get(k) != "Still to draw"]
bad += [f"{k} (no screen) in stories.csv: {doors.get(k, 'missing')}" for k in back if doors.get(k) != "Back end"]
if len(ui) < 5 or not back:
    bad.append(f"only {len(ui)} UI stories and {len(back)} back-end stories to test")
for e in bad:
    print("FAIL", e)
print(f"r1-c4: {len(ui)} UI stories with no boards and {len(back)} back-end stories placed, {len(bad)} wrong")
sys.exit(1 if bad else 0)
