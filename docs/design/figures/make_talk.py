"""Write docs/design/figures/talk-v5.json: Prototype v5's figures for phases 0, 1 and 8 (MA-291).

The members' sign-ins and devices, every run of Mon 26 Oct with its model calls, tokens and cost, the Claude
meter and the ceiling, the AWS cap, the alert routing, the failed work and its Replay, the audit rows, the files,
what MyPaisa remembers, Search's results and the judges' labels. Every claim the boards make about these figures
is asserted here over the figures themselves (lesson 38), and every value shared with household-v4.json,
future-plans-v4.json or Prototype v4's run r-1235 is checked against them.

Run: python3 docs/design/figures/make_talk.py   (then python3 docs/design/figures/make_prototype_v5.py)
Illustrative figures and names.
"""
import datetime
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
OUT = HERE / "talk-v5.json"
H = json.loads((HERE / "household-v4.json").read_text(encoding="utf-8"))
FP = json.loads((HERE / "future-plans-v4.json").read_text(encoding="utf-8"))

DAY = "2026-10-26"
USD_GBP = 1.30  # ARCHITECTURE 15: costs in dollars, pounds beside them at $1.30 to £1

# The price table Prototype v4's run r-1235 was costed with, a million tokens: input, cache read, output.
PRICES = {"Sonnet 5.5": {"in": 3.0, "cached": 0.30, "out": 15.0}, "Haiku 5.5": {"in": 1.0, "cached": 0.10, "out": 5.0}}


def cost(model, i, c, o):
    p = PRICES[model]
    return (i * p["in"] + c * p["cached"] + o * p["out"]) / 1e6


def money_round(x, dp):
    return float(f"{x:.{dp}f}")


def k(n):
    return f"{n / 1000:.1f}k"


# ---------- the members and how they get in (ARCHITECTURE 4.5) ----------
members = [
    {"id": "arun", "name": "Arun", "full": "Arun Dutta", "role": "owner", "admin": True, "init": "Ar",
     "first_sign_in": "Fri 4 Sep 19:29", "how": "Apple and Google",
     "ways": [["Apple", "since Fri 4 Sep, his first sign-in"], ["Google", "linked Mon 12 Oct"], ["Passkey", "not added"]],
     "apple": "ar•••@icloud.com"},
    {"id": "asha", "name": "Asha", "full": "Asha Dutta", "role": "member", "admin": False, "init": "As",
     "joined": "Sun 6 Sep 10:12", "how": "Apple and Google",
     "ways": [["Apple", "since Sun 6 Sep, from Arun’s invite"], ["Google", "linked Sun 6 Sep"], ["Passkey", "not added"]],
     "apple": "as•••@icloud.com"},
]
for m in members:
    hm = next(x for x in H["members"] if x["id"] == m["id"])
    assert hm["role"] == m["role"] and hm["admin"] == m["admin"] and hm["name"] == m["name"], m["id"]
assert sum(1 for m in members if m["admin"]) == 1, "the household has one admin, the owner"

# Each signed-in iPhone, iPad or foldable is a Device row; a browser on the web app is a session, listed apart.
devices = [
    {"id": "arun_iphone", "member": "arun", "name": "Arun’s iPhone", "model": "iPhone 17 Pro", "icon": "phone_iphone", "door": "ios", "seen": ["2026-10-26T07:58", "2026-10-26T09:37"]},
    {"id": "arun_ipad", "member": "arun", "name": "Arun’s iPad", "model": "iPad Air", "icon": "tablet_mac", "door": "ipad", "seen": ["2026-10-26T07:20"]},
    {"id": "arun_fold", "member": "arun", "name": "Arun’s foldable", "model": "Two-panel foldable", "icon": "devices_fold", "door": "fold", "seen": ["2026-10-24T09:05"]},
    {"id": "arun_iphone13", "member": "arun", "name": "Arun’s old iPhone", "model": "iPhone 13", "icon": "phone_iphone", "door": None, "seen": ["2026-10-04T21:40"], "signed_out": "2026-10-26T09:40"},
    {"id": "asha_iphone", "member": "asha", "name": "Asha’s iPhone", "model": "iPhone 16", "icon": "phone_iphone", "door": None, "seen": ["2026-10-26T08:12", "2026-10-26T10:14"],
     "paused_out": "2026-10-26T10:07", "back_in": "2026-10-26T10:14"},
    {"id": "asha_ipad", "member": "asha", "name": "Asha’s iPad", "model": "iPad mini", "icon": "tablet_mac", "door": None, "seen": ["2026-10-20T21:05"], "paused_out": "2026-10-26T10:07"},
]
browsers = [
    {"id": "arun_chrome", "member": "arun", "name": "Chrome on a MacBook Air", "door": "desk", "via": "Apple", "seen": ["2026-10-26T09:30"]},
    {"id": "arun_safari", "member": "arun", "name": "Safari on an iPhone", "door": "pweb", "via": "Apple", "seen": ["2026-10-25T09:58"]},
]

# The owner's security log (Members and devices): every sign-in, link, sign-out, pause and restore is an audit row.
for d in devices + browsers:
    assert d["seen"] == sorted(d["seen"]), d["id"]
security = [
    {"t": "2026-09-04T19:29", "who": "arun", "what": "First sign-in, with Apple", "detail": "The first person to sign in owns the household (MA-32): Arun owns the Dutta household."},
    {"t": "2026-09-05T18:00", "who": "arun", "what": "Invited a member", "detail": "A one-time link for the member role, until Sun 6 Sep 18:00."},
    {"t": "2026-09-06T10:12", "who": "asha", "what": "Joined from the invite, with Apple", "detail": "Her member and Cognito user made; the link used."},
    {"t": "2026-10-12T20:31", "who": "arun", "what": "Linked Google", "detail": "A fresh Google sign-in, from You; no second check (MA-77)."},
    {"t": "2026-10-26T09:30", "who": "arun", "what": "Signed in to the web app, with Apple", "detail": "Chrome on a MacBook Air; a laptop he has used before."},
    {"t": "2026-10-26T09:40", "who": "arun", "what": "Signed out Arun’s old iPhone", "detail": "iPhone 13, last seen Sun 4 Oct; from You, no second check: it only takes access away."},
    {"t": "2026-10-26T10:07", "who": "arun", "what": "Paused Asha", "detail": "Checked with Sign in with Apple and Face ID. Sign-in refused; both her devices signed out.", "chk": True},
    {"t": "2026-10-26T10:07", "who": "arun", "what": "Restored Asha", "detail": "Checked with Sign in with Apple and Face ID. She signs in as before.", "chk": True},
    {"t": "2026-10-26T10:14", "who": "asha", "what": "Signed in again on Asha’s iPhone, with Apple", "detail": "After the restore; her iPad signs in when she next opens it."},
]
assert security == sorted(security, key=lambda e: e["t"])

# ---------- the runs of Mon 26 Oct (ARCHITECTURE 10.1: a RunRecord per run) ----------


def call(model, what, i, c, o, s):
    return {"m": model, "what": what, "in": i, "cached": c, "out": o, "s": s}


runs = [
    {"id": "r-1228", "t": "01:00:00", "end": "01:00:21", "name": "Nightly views", "who": "household", "kind": "job",
     "sub": "Net worth, the budget month and what is due, rebuilt from the events", "calls": [], "tools": []},
    {"id": "r-1229", "t": "07:00:00", "end": "07:00:09", "name": "Prices", "who": "household", "kind": "job",
     "sub": "6 of 6 priced at the Fri 23 Oct close, and the ECB rate", "calls": [], "tools": []},
    {"id": "r-1230", "t": "08:12:05", "end": "08:12:14", "name": "Chat · Asha", "who": "asha", "kind": "chat",
     "words": "When does my saver mature?", "sub": "Her words stay hers; the cost and the tools show",
     "calls": [call("Sonnet 5.5", "chose the tool", 1210, 6140, 70, 1.1), call("Sonnet 5.5", "answered", 1480, 6140, 240, 2.3)],
     "tools": [["get_commitments", 70]],
     "answer": "Your fixed-rate saver at Nationwide matures on Mon 14 Dec, at £10,460 with its interest.",
     "read": ["Asha’s commitments: the saver’s maturity, from the registry (get_commitments)", "Her notes (1) and the household’s (1)"],
     "outcome": "Answered · nothing proposed · nothing retried", "sent": "To Asha’s conversation, over the stream to her iPhone"},
    {"id": "r-1231", "t": "09:00:00", "end": "09:00:02", "name": "Check-ins", "who": "household", "kind": "job",
     "sub": "1 card: 2 valuations, Home, Reading and Flat, Pune · sent with push, no amount", "calls": [], "tools": []},
    {"id": "r-1232", "t": "09:32:04", "end": "09:32:11", "name": "Chat · Arun", "who": "arun", "kind": "chat", "door": "the web app",
     "words": "What are we worth today?",
     "calls": [call("Sonnet 5.5", "chose the tool", 1240, 8460, 58, 1.1), call("Sonnet 5.5", "wrote the answer, and a note", 1720, 8460, 164, 1.9),
               call("Sonnet 5.5", "closed the turn", 96, 10180, 10, 0.4)],
     "tools": [["get_networth", 60], ["memory", 30]],
     "note": "Wants the household’s figure first, then his own",
     "read": ["The household’s net worth view: 16 assets and 4 debts at the Fri 23 Oct close, £1 = ₹112.50 (get_networth)",
              "Arun’s notes (1) and the household’s (1), from the cached notes layer"],
     "outcome": "Answered · a card, nothing proposed · nothing retried", "sent": "To Arun’s conversation at every open door, over the stream; no push, since a door was open"},
    {"id": "r-1233", "t": "09:34:10", "end": "09:34:17", "name": "Chat · Arun", "who": "arun", "kind": "chat", "door": "the web app",
     "words": "What’s due this week?",
     "calls": [call("Sonnet 5.5", "chose the tool", 1260, 8520, 62, 1.2), call("Sonnet 5.5", "wrote the answer", 1650, 8520, 188, 2.6)],
     "tools": [["get_commitments", 80]],
     "read": ["The household’s commitments, Mon 26 Oct to Sun 1 Nov (get_commitments)", "Arun’s notes (2) and the household’s (1)"],
     "outcome": "Answered, streamed word by word · a card · nothing retried", "sent": "To Arun’s conversation at every open door, over the stream"},
    {"id": "r-1234", "t": "09:36:58", "end": "09:37:05", "name": "Chat · Arun", "who": "arun", "kind": "chat", "door": "his iPhone",
     "words": "And the Pune flat?", "typed": "09:35:40",
     "calls": [call("Sonnet 5.5", "chose the tool", 1230, 8690, 60, 1.1), call("Sonnet 5.5", "wrote the answer", 1380, 8690, 142, 2.0)],
     "tools": [["get_commitments", 70]],
     "read": ["Flat, Pune’s valuation check-in (get_commitments)", "Arun’s notes (2) and the household’s (1)"],
     "outcome": "Answered · sent by push, the app closed · nothing retried",
     "sent": "Typed offline at 09:35:40 and sent at 09:36:58 when the connection came back; the reply went by push to his iPhone, with no amount, since MyPaisa was closed there"},
    {"id": "r-1235", "t": "09:40:12", "end": "09:41:20", "name": "Chat · Arun", "who": "arun", "kind": "chat", "door": "the web app",
     "words": "£5,000 in Monzo savings",
     "calls": [call("Sonnet 5.5", "drafted", 2310, 6120, 196, 2.5), call("Sonnet 5.5", "asked whose", 410, 8430, 92, 1.2), call("Sonnet 5.5", "proposed", 1060, 8840, 238, 2.6)],
     "tools": [["draft_record", 80], ["ask_user", 20], ["propose_change", 110]], "wait_s": 61,
     "read": ["The savings account kind’s fields (draft_record)", "Arun’s notes (2) and the household’s (1)"],
     "outcome": "Saved · audit row 09:41 · nothing retried", "sent": "The Confirm card to Arun’s conversation; records.changed to every open door"},
    {"id": "r-1236", "t": "09:41:21", "end": "09:41:23", "name": "Views", "who": "household", "kind": "job",
     "sub": "Rebuilt after the new record; Home moved at every door", "calls": [], "tools": []},
    {"id": "r-1237", "t": "09:43:02", "end": "09:43:09", "name": "Chat · Arun", "who": "arun", "kind": "chat", "door": "the web app",
     "words": "What can we get at quickly now?",
     "calls": [call("Sonnet 5.5", "chose the tool", 1190, 8600, 66, 1.1), call("Sonnet 5.5", "wrote the answer", 1420, 8600, 224, 2.4)],
     "tools": [["get_networth", 60]],
     "read": ["The household’s liquid view (get_networth)", "Arun’s notes (2) and the household’s (1)"],
     "outcome": "Answered · a card · nothing retried", "sent": "To Arun’s conversation at every open door, over the stream"},
    {"id": "r-1238", "t": "09:52:10", "end": "09:52:12", "name": "Views", "who": "household", "kind": "job",
     "sub": "Rebuilt after the correction to Home, Reading; Home moved at every door", "calls": [], "tools": []},
    {"id": "r-1239", "t": "09:53:00", "end": "09:53:04", "name": "Projection", "who": "household", "kind": "job",
     "sub": "The fan rebuilt from £457,951, after the Monzo savings and the home’s new value", "calls": [], "tools": []},
    {"id": "r-1240", "t": "09:59:20", "end": "09:59:27", "name": "Chat · Arun", "who": "arun", "kind": "chat", "door": "the web app",
     "words": "What changed today?",
     "calls": [call("Sonnet 5.5", "chose the tool", 1250, 8740, 64, 1.1), call("Sonnet 5.5", "wrote the answer", 1810, 8740, 176, 2.5)],
     "tools": [["get_audit", 90]],
     "read": ["Today’s audit rows for the household (get_audit)", "Arun’s notes (2) and the household’s (1)"],
     "outcome": "Answered · a card · nothing retried", "sent": "To Arun’s conversation at every open door, over the stream"},
    {"id": "r-1241", "t": "10:12:30", "end": "10:12:33", "name": "Prices · Silver ETC, replayed", "who": "household", "kind": "job",
     "sub": "Replayed by Arun from Failed work; priced at the Fri 23 Oct close, nothing changed", "calls": [], "tools": []},
]
for r in runs:
    r["iso"] = f"{DAY}T{r['t']}"
    r["iso_end"] = f"{DAY}T{r['end']}"
    r["tm"] = r["t"][:5]
    tot = 0.0
    for c in r["calls"]:
        c["cost"] = cost(c["m"], c["in"], c["cached"], c["out"])
        c["cost3"] = f"{c['cost']:.3f}"
        tot += c["cost"]
    r["cost"] = tot
    r["cost3"] = f"{tot:.3f}"
    r["cost2"] = f"{tot:.2f}"
    r["n_in"] = sum(c["in"] for c in r["calls"])
    r["n_out"] = sum(c["out"] for c in r["calls"])
    r["n_cached"] = sum(c["cached"] for c in r["calls"])
    r["tokens"] = r["n_in"] + r["n_out"]
    r["tokK"] = k(r["tokens"]) if r["calls"] else "0"
    r["cachedK"] = k(r["n_cached"]) if r["calls"] else "0"
    r["model_s"] = round(sum(c["s"] for c in r["calls"]), 1)
    r["tool_s"] = round(sum(t[1] for t in r["tools"]) / 1000, 1)
    t0 = datetime.datetime.fromisoformat(r["iso"])
    t1 = datetime.datetime.fromisoformat(r["iso_end"])
    r["dur_s"] = int((t1 - t0).total_seconds())
    models = sorted({c["m"] for c in r["calls"]})
    r["line"] = (f"{', '.join(models)} · {len(r['calls'])} calls · {r['tokK']} tokens" if r["calls"] else f"No model · {r['dur_s']} s")
    r["toolnames"] = ", ".join(t[0] for t in r["tools"])

ids = [int(r["id"][2:]) for r in runs]
assert ids == sorted(ids) and len(set(ids)) == len(ids), "run ids rise with time"
assert [r["iso"] for r in runs] == sorted(r["iso"] for r in runs), "runs in time order"

# r-1235 is Prototype v4's run: every figure the v4 boards show for it holds here.
R = next(r for r in runs if r["id"] == "r-1235")
assert [c["cost3"] for c in R["calls"]] == ["0.012", "0.005", "0.009"], [c["cost3"] for c in R["calls"]]
assert R["cost3"] == "0.026" and R["cost2"] == "0.03"
assert (R["n_in"], R["n_out"], R["tokK"], R["cachedK"]) == (3780, 526, "4.3k", "23.4k")
assert R["dur_s"] == 68 and R["model_s"] == 6.3 and R["tool_s"] == 0.2
assert int(R["dur_s"] - R["model_s"] - R["tool_s"]) == R["wait_s"] == 61  # 61.5 s, shown as 61 s
nr = H["new_record_in_prototype"]
assert nr["registered"] == "2026-10-26T09:41" and nr["value"] == 5000 and nr["owners"] == [["arun", 100]]
assert R["words"] == f"£{nr['value']:,} in Monzo savings"
# v4's Activity rows: Asha's run and the liquid question keep their models, calls, tokens and costs.
assert next(r for r in runs if r["id"] == "r-1230")["line"] == "Sonnet 5.5 · 2 calls · 3.0k tokens"
assert next(r for r in runs if r["id"] == "r-1237")["line"] == "Sonnet 5.5 · 2 calls · 2.9k tokens"
for rid in ("r-1230", "r-1237", "r-1232", "r-1233", "r-1234", "r-1240"):
    assert next(r for r in runs if r["id"] == rid)["cost2"] == "0.02", rid
assert next(r for r in runs if r["id"] == "r-1232")["line"] == "Sonnet 5.5 · 3 calls · 3.3k tokens"
# the 09:53 projection run is future-plans-v4's R26, from the net worth after the correction
assert FP["R26"]["when"] == "Mon 26 Oct 09:53" and FP["R26"]["start"] == H["totals_after_correction"]["net_gbp"] == 457951
assert "£457,951" in next(r for r in runs if r["id"] == "r-1239")["sub"]
# Asha's saver: household-v4's maturity
saver = next(a for a in H["assets"] if a["id"] == "saver")
assert saver["owners"] == [["asha", 100]]
assert "£10,460" in next(r for r in runs if r["id"] == "r-1230")["answer"]

# Every tool a run names is one ARCHITECTURE 8's Tools paragraph defines (plan_sync's tool check, applied here).
arch = (ROOT / "ARCHITECTURE.md").read_text(encoding="utf-8")
m = re.search(r"\*\*Tools:\*\*(.*?)\n\n", arch, re.S)
tools8 = set(re.findall(r"`([a-z]+(?:_[a-z]+)*)", m.group(1)))
for r in runs:
    for t in r["tools"]:
        assert t[0] in tools8, f"{r['id']} names {t[0]}, which ARCHITECTURE 8 does not define"
assert "memory" in tools8

# ---------- the Claude meter and the ceiling (ARCHITECTURE 15.1) ----------
CEIL, DEV, HARD, CREDIT = 160, 40, 160, 200
STEPS = [70, 85, 95, 100]
SHARE = 60
cycle_start, renews = datetime.date(2026, 10, 3), datetime.date(2026, 11, 3)
cycle_days = (renews - cycle_start).days
assert renews.strftime("%a") == "Tue" and cycle_days == 31
base = {"arun": 9.30, "asha": 4.08, "jobs": 4.50}  # the cycle to the end of Sun 25 Oct, from the meter's rows


def spend_at(iso):
    s = dict(base)
    for r in runs:
        if r["iso_end"] <= iso and r["calls"]:
            s[r["who"] if r["who"] in ("arun", "asha") else "jobs"] += r["cost"]
    parts = {k2: money_round(v, 2) for k2, v in s.items()}
    total = round(sum(parts.values()), 2)
    exact = sum(s.values())
    assert abs(total - exact) < 0.015, (iso, total, exact)
    # Activity lists each run's cost to the tenth of a cent, so "so far" is the sum of the costs it lists (lesson 10)
    done = [r for r in runs if r["iso_end"] <= iso and r["calls"]]
    today = round(sum(float(r["cost3"]) for r in done), 3)
    assert abs(today - sum(r["cost"] for r in done)) < 0.0015 * max(1, len(done)), (iso, today)
    return {"t": iso, "arun": parts["arun"], "asha": parts["asha"], "jobs": parts["jobs"], "total": total, "today": today,
            "pct": round(total / CEIL * 100), "dollars": round(total)}


snap_times = sorted({r["iso_end"] for r in runs if r["calls"]} | {f"{DAY}T00:00:00"})
spend_snaps = [spend_at(t) for t in snap_times]
for s in spend_snaps:
    assert s["dollars"] == 18 and s["pct"] == 11, s  # "$18 of $160 · 11%", as Prototype v4's Activity shows all morning
    assert s["total"] / CEIL * 100 < STEPS[0], "Normal, under 70%"
ladder = [{"p": "Under 70%", "t": "Normal", "d": "Sonnet for chat, Opus for the Saturday review.", "at": None}] + [
    {"p": f"{p}%", "t": t, "d": d, "at": CEIL * p // 100} for p, t, d in [
        (70, "A heads-up", "One message to you. Nothing changes."),
        (85, "Savers", "No debate; three Why? searches a day; notes only when asked."),
        (95, "Essentials only", "Chat on Haiku; the rest as templates; notes read, none written."),
        (100, "Templates only", "Claude stops until Tue 3 Nov, or until you raise the ceiling.")]]
assert [x["at"] for x in ladder[1:]] == [112, 136, 152, 160]
share_usd = CEIL * SHARE // 100
daily_avg = CEIL / cycle_days
guard_day = 3 * daily_avg
assert share_usd == 96 and round(guard_day) == 15
# Moving the ceiling: prod's hard limit is the Console's $160, so $180 is refused with the way round (MA-116);
# nothing changes, and the agent team's shares of prod's $160 (phase 18) stand.
move = {"typed": 180, "from": CEIL, "hard": HARD, "min": 10, "refused": 180 > HARD,
        "past_credit_if_allowed": 180 + DEV - CREDIT, "gbp_typed": round(180 / USD_GBP)}
assert move["refused"] and move["past_credit_if_allowed"] == 20 and CEIL + DEV == CREDIT
evals_judges = round(CEIL * 0.03, 2)
assert evals_judges == 4.80

spend = {"ceiling": CEIL, "dev_ceiling": DEV, "hard": HARD, "dev_hard": 40, "credit": CREDIT, "evals_limit": 30, "evals_run": 10,
         "judges_usd": evals_judges, "steps": STEPS, "share": SHARE, "share_usd": share_usd, "guard_day_usd": round(guard_day),
         "calls_per_run": 8, "renews": "Tue 3 Nov", "cycle": "Sat 3 Oct to Mon 2 Nov", "cycle_days": cycle_days,
         "days_left": (renews - datetime.date(2026, 10, 26)).days, "usd_gbp": USD_GBP,
         "ceiling_gbp": round(CEIL / USD_GBP), "ladder": ladder, "move": move, "snaps": spend_snaps}
assert spend["days_left"] == 8 and spend["ceiling_gbp"] == 123

# ---------- AWS and others, and the alerts (ARCHITECTURE 15.2) ----------
aws = {"cap": 50, "spent": 3, "forecast": 3.20, "backstop": 75, "read": "daily at 06:00",
       "steps": [{"p": 50, "d": "You are told; again when the month’s forecast passes the cap."},
                 {"p": 80, "d": "Dev’s schedules pause."},
                 {"p": 100, "d": "Dev pauses; so do prod’s back-fills, retraining and challengers."}]}
for s in aws["steps"]:
    s["at"] = aws["cap"] * s["p"] // 100
assert [s["at"] for s in aws["steps"]] == [25, 40, 50] and round(aws["spent"] / aws["cap"] * 100) == 6
assert aws["forecast"] < aws["steps"][0]["at"], "no step reached, the forecast included"
routing = [
    {"t": "Claude spend", "s": "Critical at 100%", "app": "Always", "push": "All", "email": "All"},
    {"t": "AWS spend and its forecast", "s": "Critical at 100%", "app": "Always", "push": "All", "email": "All"},
    {"t": "Failed work, a job failed", "s": "Never critical", "app": "Always", "push": "All", "email": "Off"},
    {"t": "A data feed stale", "s": "Never critical", "app": "Always", "push": "All", "email": "Off"},
    {"t": "A TestFlight build at day 60", "s": "Never critical", "app": "Always", "push": "All", "email": "All"},
    {"t": "Holding alerts", "s": "Each member’s own", "app": "Own", "push": "Own", "email": "Off"},
]
quiet = {"push": "22:00 to 07:00", "email": "22:00 to 07:00, held, then sent at 07:00", "cooldown_h": 6, "digest": "19:00"}
failed = {"queue": "mypaisa-prod-work", "job": "Prices · Silver ETC", "when": "Fri 23 Oct 21:52", "tries": 5,
          "window": "21:00 to 21:52", "reason": "the price source timed out", "alarm": "Fri 23 Oct 21:52, in the app and by push, quietly",
          "since": "The 07:00 run today priced Silver ETC at the Fri 23 Oct close, so nothing is stale.",
          "replayed": "2026-10-26T10:12", "ran": next(r for r in runs if r["id"] == "r-1241")["iso"]}
assert failed["replayed"][:16] <= failed["ran"][:16]

# ---------- the audit log (ARCHITECTURE 4.6) ----------
files = [
    {"id": "monzo-pot", "name": "monzo-pot.png", "kind": "Screenshot", "ext": "PNG", "kb": 142, "by": "asha", "sent": "2026-10-22T19:01",
     "icon": "image", "img": True, "fed": [{"rec": "Monzo pot", "what": "Valuation", "before": 120, "after": 181, "t": "2026-10-22T19:02", "run": "r-1170"}],
     "shows": "the Monzo pot as Asha’s Monzo app showed it"},
    {"id": "silver-factsheet", "name": "silver-etc-factsheet.pdf", "kind": "Factsheet", "ext": "PDF", "kb": 1126, "pages": 4, "by": "arun", "sent": "2026-10-21T21:14",
     "icon": "description", "img": False, "fed": [{"rec": "Silver ETC", "what": "Yearly fee", "before_t": "not known", "after_t": "0.20% a year", "t": "2026-10-21T21:15", "run": "r-1139"}],
     "shows": "iShares Physical Silver ETC’s factsheet, 30 September"},
    {"id": "balanced-factsheet", "name": "balanced-factsheet.pdf", "kind": "Factsheet", "ext": "PDF", "kb": 1229, "pages": 6, "by": "arun", "sent": "2026-10-18T11:20",
     "icon": "description", "img": False, "fed": [{"rec": "Balanced", "what": "Yearly fee", "t": "2026-10-18T11:22", "run": "r-1088"},
                                                    {"rec": "Balanced", "what": "Its top ten holdings", "t": "2026-10-18T11:22", "run": "r-1088"}],
     "shows": "BlackRock MyMap 5’s factsheet, 30 September"},
]
pot = next(a for a in H["assets"] if a["id"] == "pot")
assert files[0]["fed"][0]["after"] == pot["value"] == 181 and pot["owners"] == [["arun", 50], ["asha", 50]]
files_mb = round(sum(f["kb"] for f in files) / 1024, 1)
assert files_mb == 2.4
corr = H["correction_in_prototype"]
assert (corr["record"], corr["from"], corr["to"], corr["at"], corr["via"], corr["label"]) == ("home", 415000, 428000, "2026-10-26T09:52", "inline_edit", "your estimate")
audit = [
    {"t": "2026-10-26T10:01", "who": "arun", "rec": "File opened", "icon": "visibility", "what": "Opened monzo-pot.png",
     "note": "a five-minute link, until 10:06", "via": "Open, from Audit", "run": None, "acct": "joint"},
    {"t": "2026-10-26T09:52", "who": "arun", "rec": "Correction", "icon": "edit", "what": "Home, Reading", "before": corr["from"], "after": corr["to"],
     "note": "your estimate", "via": "in place (inline edit)", "run": None, "acct": "joint"},
    {"t": "2026-10-26T09:41", "who": "arun", "rec": "Record added", "icon": "add_circle", "what": "Instant access savings · Monzo", "before": None, "after": nr["value"],
     "via": "a typed message, then Confirm", "run": "r-1235", "acct": "arun"},
    {"t": "2026-10-26T09:32", "who": "mypaisa", "rec": "Memory note", "icon": "bookmark", "what": "A note in Arun’s notes",
     "note": "“Wants the household’s figure first, then his own”", "via": "memory.write, in Arun’s run", "run": "r-1232", "acct": "arun"},
    {"t": "2026-10-25T10:03", "who": "arun", "rec": "Record added", "icon": "add_circle", "what": "Fixed deposit · SBI", "before": None, "after_inr": 500000,
     "note": "at 7.1%, quarterly, to Sat 10 Mar 2029", "via": "a typed message, then Confirm", "run": "r-1219", "acct": "arun"},
    {"t": "2026-10-22T19:02", "who": "asha", "rec": "Valuation", "icon": "image", "what": "Monzo pot", "before": 120, "after": 181,
     "via": "a screenshot, then Confirm", "run": "r-1170", "file": "monzo-pot", "acct": "joint"},
    {"t": "2026-10-21T21:15", "who": "arun", "rec": "Fee", "icon": "description", "what": "Silver ETC’s yearly fee", "before_t": "not known", "after_t": "0.20% a year",
     "via": "a factsheet, then Confirm", "run": "r-1139", "file": "silver-factsheet", "acct": "arun"},
    {"t": "2026-10-21T20:05", "who": "asha", "rec": "Preference", "icon": "tune", "what": "Quiet hours, 22:00 to 07:00", "before_t": "off", "after_t": "on",
     "via": "a button, then Confirm", "run": "r-1133", "acct": "asha"},
]
assert audit == sorted(audit, key=lambda e: e["t"], reverse=True), "newest first"
sbi = next(a for a in H["assets"] if a["id"] == "sbi_fd")
assert audit[4]["after_inr"] == sbi["principal"] and abs(sbi["rate"] - 0.071) < 1e-9 and sbi["matures"] == "2029-03-10"
assert datetime.date(2029, 3, 10).strftime("%a") == "Sat"
for e in audit:
    if e.get("file"):
        assert any(f["id"] == e["file"] for f in files), e
    if e.get("run"):
        n = int(e["run"][2:])
        assert e["t"][:10] != DAY or any(r["id"] == e["run"] for r in runs), e
assert audit[3]["note"].strip("“”") == next(r for r in runs if r["id"] == "r-1232")["note"]

# ---------- what MyPaisa remembers (ARCHITECTURE 24.2, 24.3; MA-288, draft) ----------
notes = {
    "arun": [{"t": "2026-10-26T09:32", "text": "Wants the household’s figure first, then his own", "run": "r-1232"},
             {"t": "2026-10-14T20:40", "text": "Likes the Technical part folded away unless he asks", "run": "r-0973"}],
    "asha": [{"t": "2026-10-20T21:02", "text": "Prefers short answers, with the detail one tap away", "run": "r-1118"}],
    "household": [{"t": "2026-10-03T10:15", "text": "Calls the Monzo pot ‘the joint pot’", "run": "r-0811"}],
}
for who, ns in notes.items():
    for n in ns:
        assert not re.search(r"[0-9£₹$€%]", n["text"]), f"a note never holds a figure: {n['text']}"

# ---------- Search (MA-180, draft): "Monzo", as Arun at 10:03 ----------
liq_before, liq_after = H["totals_before_new_record"]["liquid_gbp"], H["totals_after_new_record"]["liquid_gbp"]
assert liq_after - liq_before == nr["value"] == 5000 and liq_after == 37596
search = {"q": "Monzo", "t": "2026-10-26T10:03",
          "records": [{"id": "monzo_savings", "name": nr["name"], "who": "Arun", "v": nr["value"], "s": "Savings · UK · from Mon 26 Oct 09:41"},
                      {"id": "pot", "name": pot["name"], "who": "Joint", "v": pot["value"], "s": "Cash · Monzo · no price"},
                      {"id": "balanced", "name": "Balanced (BlackRock MyMap 5)", "who": "Arun", "v": next(a for a in H["assets"] if a["id"] == "balanced")["value"], "s": "ISA · Monzo"}],
          "answer": {"t": "09:43", "q": "What can we get at quickly now?", "hit": "…the new Monzo savings, the Monzo pot, the NRE account in India…", "run": "r-1237"}}
assert all(any(a["id"] == x["id"] for a in H["assets"]) or x["id"] == nr["id"] for x in search["records"])

# ---------- the judges' labels (MA-255, draft) ----------
evals = {"sample": "October’s sample", "offered": "Thu 1 Oct", "runs": 30, "labelled": 22,
         "modes": [{"t": "Figures match the tools", "pass": 19, "fail": 3}, {"t": "Answers what was asked", "pass": 20, "fail": 2},
                   {"t": "Plain words, no jargon", "pass": 21, "fail": 1}, {"t": "No advice, no trade", "pass": 22, "fail": 0}],
         "acts_at": 50, "floor": 0.8, "now": "r-1233"}
for md in evals["modes"]:
    assert md["pass"] + md["fail"] == evals["labelled"] and md["pass"] < evals["acts_at"], md
assert evals["labelled"] < evals["runs"]

out = {
    "about": "Prototype v5's figures for phases 0, 1 and 8 (MA-291), written by make_talk.py. Illustrative figures and names.",
    "clock": {"today": DAY, "label": "Mon 26 Oct", "phase1": "09:29 to 09:40", "phase8": "09:59 to 10:15"},
    "prices": PRICES, "usd_gbp": USD_GBP, "members": members, "devices": devices, "browsers": browsers, "security": security,
    "runs": runs, "spend": spend, "aws": aws, "routing": routing, "quiet": quiet, "failed": failed, "audit": audit,
    "files": files, "files_mb": files_mb, "notes": notes, "search": search, "evals": evals,
    "envs": [{"env": "prod", "app": "MyPaisa", "web": "dashboard.mypaisapp.com", "api": "api.mypaisapp.com", "data": "the household’s own records",
              "ship": "a release reaches it only after Arun’s approval, through GitHub CI", "tf": "Household Beta"},
             {"env": "dev", "app": "MyPaisa Dev", "web": "dashboard-dev.mypaisapp.com", "api": "api-dev.mypaisapp.com", "data": "synthetic data, from the seed scripts",
              "ship": "every merge to main deploys it first", "tf": "Dev Dogfood"}],
}
text = json.dumps(out, ensure_ascii=False, indent=1)

# Every weekday and date the set names agrees with October 2026 (plan_sync's date check, applied here).
_D = re.compile(r"\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{4}))?\b")
MON = {m2: i + 1 for i, m2 in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
for mm in _D.finditer(text):
    yrs = [int(mm.group(4))] if mm.group(4) else ([2026, 2027] if MON[mm.group(3)] < 10 else [2026])
    assert any(datetime.date(y, MON[mm.group(3)], int(mm.group(2))).strftime("%a") == mm.group(1) for y in yrs), mm.group(0)
assert "—" not in text, "no em dashes"

if "--check" in sys.argv:
    ok = OUT.exists() and OUT.read_text(encoding="utf-8") == text + "\n"
    print("make_talk: talk-v5.json is " + ("current" if ok else "stale"))
    sys.exit(0 if ok else 1)
OUT.write_text(text + "\n", encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)}: {len(runs)} runs, {len(audit)} audit rows, {len(files)} files, spend ${spend_snaps[-1]['total']:.2f} of ${CEIL}")
