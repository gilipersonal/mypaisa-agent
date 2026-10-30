"""Write team-india-v5.json: Prototype v5's figures for phases 18, 19 and 20 (MA-291).

Phase 18, the agent team (ARCHITECTURE §20, §10.8, §24.4): the nine agents with their heartbeats, runs, spend
and status through the morning of Mon 26 Oct; the budgets as shares of prod's $160; the requests on the admin
desk (the data steward's EODHD switch-on, the grader and tuner's risk model v8 over v7, and its rule change for
the analyst, proposed on the graded record); the 31 settings; the learning loop (Friday's grades, Monday's
calibration within its bounds); incident inc-7 and what was fixed on its own; each agent's notes (MA-289).

Phase 19, India (§22): the Indian accounts from household-v4's records, Asha's CAS import (a dry run, one
summary card, Confirm with the second check), the engine's view in shadow.

Phase 20, beyond the chat (PLAN phase 20): the widget's figures (the household total and Friday's move from the
last fetch), Siri's answer, the shared factsheet's reading card, the Shortcut's guided flow and the Live
Activity's steps, with no amounts on the Lock Screen.

Every claim a board makes about these figures is asserted over the figures themselves (lesson 38), and every
value shared with household-v4.json and forecaster-v4.json is read from those files and checked against them.
Illustrative figures and names throughout.

Run: python3 docs/design/figures/make_team_india.py   (then python3 docs/design/figures/make_prototype_v5.py)
--check exits 1 if team-india-v5.json is not what this script makes.
"""
import datetime as dt
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "team-india-v5.json"
H = json.loads((HERE / "household-v4.json").read_text(encoding="utf-8"))
F = json.loads((HERE / "forecaster-v4.json").read_text(encoding="utf-8"))

FX = H["clock"]["fx"]["gbp_inr"]
assert FX == 112.5, "the prototype's one rate is £1 = ₹112.50"
USD_GBP = 1.30          # §15: the plan's dollars at $1.30 to £1
DAY = "2026-10-26"      # Mon 26 Oct, the prototype's today
assert H["clock"]["today"] == DAY and H["clock"]["prices_label"] == "Fri 23 Oct close"
assert F["clock"]["today"] == "Mon 26 Oct 2026" and F["clock"]["close"] == "Fri 23 Oct 2026"


def wd(iso: str) -> str:
    """'2026-10-26T06:10' → 'Mon 26 Oct'; every weekday the boards print comes from here."""
    d = dt.date.fromisoformat(iso[:10])
    return d.strftime("%a ") + str(d.day) + d.strftime(" %b") + ("" if d.year == 2026 and d.month >= 10 else d.strftime(" %Y"))


def t(hm: str, day: str = DAY) -> str:
    return day + "T" + hm


ASSET = {a["id"]: a for a in H["assets"]}
DEBT = {d["id"]: d for d in H["debts"]}

# ======================================================================================================== phase 18
# ---- budgets: shares of prod's $160 (§20.7), spend this cycle to 06:00 Mon 26 Oct -------------------------------
PROD_USD, DEV_USD = 160, 40
assert PROD_USD + DEV_USD == 200, "the plan's $200 a month, $160 prod and $40 dev (§20.7)"
SHARES = [
    # key, label, what, share %, spent $ this cycle
    ("concierge", "Concierge", "The chat, cards, briefs", 55, 26.10),
    ("forecaster", "Forecaster explanations", "Why each forecast says so", 10, 2.90),
    ("scout", "News scout", "Tagging and matching, through Batches", 10, 2.70),
    ("tuner", "Grader and tuner reviews", "The weekly and monthly reviews", 10, 2.20),
    ("desk", "Admin desk", "Your requests in plain words", 5, 0.80),
    ("steward_warden", "Data steward and ops warden", "Requests and incident notes", 5, 0.50),
    ("reserve", "Reserve, the chat first", "Covers the chat before anything else", 5, 0.00),
]
assert sum(s[3] for s in SHARES) == 100, "the shares sum to 100%"
shares = []
for key, label, what, pct, spent in SHARES:
    usd = PROD_USD * pct / 100
    assert spent <= usd, f"{label} is inside its share"
    shares.append({"key": key, "label": label, "what": what, "pct": pct, "usd": usd, "spent": spent, "used": round(spent / usd * 100, 1)})
spent_total = round(sum(s["spent"] for s in shares), 2)
assert spent_total == 35.20
used_pct = round(spent_total / PROD_USD * 100)
assert used_pct == 22 and used_pct < 70, "prod is on its normal step, under 70% (§15.1)"
AWS = {"cap_gbp": 50, "used_gbp": 2.60, "forecast_gbp": 3.10, "month": "October"}
budget = {
    "prod_usd": PROD_USD, "dev_usd": DEV_USD, "usd_gbp": USD_GBP, "cycle": "1 to 31 Oct", "to": "06:00 Mon 26 Oct",
    "shares": shares, "spent_usd": spent_total, "spent_gbp": round(spent_total / USD_GBP, 2), "used_pct": used_pct,
    "ceiling_gbp": round(PROD_USD / USD_GBP), "step": "Normal, under 70%", "aws": AWS,
}

# ---- the nine agents (§20.1), their runs and heartbeats through the morning ---------------------------------------
AGENTS = [
    {"id": "concierge", "name": "Concierge", "icon": "support_agent", "share": "concierge",
     "job": "Talks to members in the chat; routes your instructions to the desk",
     "brain": "Sonnet, Haiku for small turns", "alone": "Answers, reads, proposes changes to records with a Confirm card",
     "asks": "Nothing: members confirm their own records",
     "runs": [[t("21:14", "2026-10-25"), "A chat with Asha"], [t("06:10"), "Your question about the team"],
              [t("06:40"), "Friday's grades, for you"], [t("08:26"), "The tuner's reasons, for you"]], "hb": 2},
    {"id": "steward", "name": "Data steward", "icon": "dataset", "share": "steward_warden",
     "job": "Keeps prices flowing from free sources", "brain": "Code; Haiku writes its requests",
     "alone": "Fails over within a chain, retries, fills gaps, labels stale data",
     "asks": "A new or reordered source, any paid feed, a source's terms",
     "runs": [[t("18:20", "2026-10-25"), "Asked you: EODHD Historian (cr-25)"],
              [t("06:00"), "Friday's prices checked; the FT page filled in Balanced"]], "hb": 3},
    {"id": "scout", "name": "News scout", "icon": "newspaper", "share": "scout",
     "job": "Collects news and events, tags them, matches them to holdings", "brain": "Haiku through Batches; code scores",
     "alone": "Tags and matches", "asks": "A new feed or event type",
     "runs": [[t("03:00"), "Stopped at the 8-call guard"], [t("08:31"), "Ran again, without the bad story"]], "hb": 1,
     "silent": [t("03:12"), t("08:31")]},
    {"id": "analyst", "name": "Analyst", "icon": "calculate", "share": None,
     "job": "The rules engine", "brain": "Code only", "alone": "Runs after each close",
     "asks": "Any rule threshold change, through the tuner",
     "runs": [[t("21:20", "2026-10-23"), "Stances after the US close"]], "hb": 4},
    {"id": "forecaster", "name": "Forecaster", "icon": "online_prediction", "share": "forecaster",
     "job": "The models; switches itself off when its record slips", "brain": "Code; Sonnet writes the explanations",
     "alone": "Runs daily; switches itself off", "asks": "Promotions, through the tuner",
     "runs": [[t("06:10", "2026-10-24"), "After Friday's close"]], "hb": 4},
    {"id": "tuner", "name": "Grader and tuner", "icon": "grading", "share": "tuner",
     "job": "Grades daily, calibrates within bounds, proposes changes on evidence", "brain": "Code; Sonnet writes the reviews",
     "alone": "Grades, moves calibration within bounds, rolls back a worse map",
     "asks": "Promoting a challenger, any change to rules or models",
     "runs": [[t("22:10", "2026-10-23"), "Graded Friday's calls"], [t("05:40"), "Calibration refitted"],
              [t("06:40"), "Asked you: risk model v8 (cr-26)"], [t("07:05"), "Asked you: 3 flags for a PAUSE (cr-27)"]],
     "hb": 0, "asking_from": t("06:40")},
    {"id": "warden", "name": "Ops warden", "icon": "engineering", "share": "steward_warden",
     "job": "Runs the daily pipeline and repairs it", "brain": "Code; Haiku summarises incidents",
     "alone": "Retries, catches up, rolls back to the last good version", "asks": "Anything it cannot fix: an incident",
     "runs": [[t("03:27"), "Opened inc-7"], [t("04:00"), "Rolled the news scout back to v13"],
              [t("08:31"), "Ran the news scout again, skipping the story"]], "hb": 2},
    {"id": "keeper", "name": "Budget keeper", "icon": "account_balance_wallet", "share": None,
     "job": "The meter, the ladder and the guards", "brain": "Code only", "alone": "Steps down and back up",
     "asks": "Nothing: ceilings and shares are yours",
     "runs": [[t("06:00"), f"Normal step: {used_pct}% of prod"]], "hb": 0},
    {"id": "desk", "name": "Admin desk", "icon": "admin_panel_settings", "share": "desk",
     "job": "The one channel between the agents and you", "brain": "Code; Haiku turns your words into a request",
     "alone": "Queues, batches, reminds, expires", "asks": "It is the asking",
     "runs": [[t("19:00", "2026-10-25"), "Sunday's digest"], [t("04:01"), "Raised inc-7 to you"],
              [t("06:12"), "cr-25 kept for tonight's digest"], [t("08:29"), "cr-27 decided"]], "hb": 2},
]
assert len(AGENTS) == 9, "nine agents (§20.1)"
share_keys = {s["key"] for s in shares}
for a in AGENTS:
    assert a["share"] is None or a["share"] in share_keys
    assert a["runs"] == sorted(a["runs"]), a["name"] + "'s runs are in time order"
    for at, _ in a["runs"]:
        wd(at)
    a["code_only"] = a["share"] is None
assert {a["share"] for a in AGENTS if a["share"]} == share_keys - {"reserve"}, "every share but the reserve has its agent"
HEARTBEAT = {"every_min": 5, "silent_after_min": 15}
scout = next(a for a in AGENTS if a["id"] == "scout")
opened = dt.datetime.fromisoformat(scout["silent"][0]) + dt.timedelta(minutes=HEARTBEAT["silent_after_min"])
assert opened.strftime("%H:%M") == "03:27", "fifteen minutes without a heartbeat opens the incident"

# ---- the learning loop (§20.4) ------------------------------------------------------------------------------------
# Friday's grades: the four rules-engine calls of Sat 17 Oct's review, graded after Friday's close against waiting:
# a PAUSE holds up if waiting was better (the price fell by the next review); a HOLD if staying in was (it did not).
nq, bal = F["nasdaq"], F["balanced"]
nq_c = {c["day"]: c["c"] for c in nq["candles"]}
bal_n = {n["day"]: n["nav"] for n in bal["nav"]}
assert nq_c["Fri 23 Oct"] == 0 and bal_n["Fri 23 Oct"] == 0, "the figures are percentages from the Fri 23 Oct close"
week = lambda p16: round((1 / (1 + p16 / 100) - 1) * 100, 2)   # Fri 16 Oct close → Fri 23 Oct close
CALLS_17 = [
    {"id": "nasdaq", "name": "NASDAQ 100 ETF", "call": "PAUSE", "move": week(nq_c["Fri 16 Oct"])},
    {"id": "balanced", "name": "Balanced", "call": "HOLD", "move": week(bal_n["Fri 16 Oct"])},
    {"id": "robotics", "name": "Robotics ETF", "call": "HOLD", "move": -2.9},
    {"id": "silver", "name": "Silver ETC", "call": "HOLD", "move": 1.6},
]
for c in CALLS_17:
    c["held"] = c["move"] < 0 if c["call"] == "PAUSE" else c["move"] >= 0
assert CALLS_17[0]["move"] == -4.02 and CALLS_17[1]["move"] == 0.79
held_17 = sum(c["held"] for c in CALLS_17)
assert held_17 == 3
assert nq["rules"]["stance"] == "PAUSE" and nq["rules"]["conf"] == 64 and bal["rules"]["stance"] == "HOLD" and bal["rules"]["conf"] == 71
fc_beat = nq["track"]["fc"]["beat"]
assert nq["track"]["fc"]["week"] == 5 and fc_beat[4] is True and all(fc_beat[:5]), "the Forecaster's week 5 beat both"
# the rolling scoreboard (ScoreDaily, §20.4): graded calls and how many held up; Brier scores from the store
WINDOWS = [["30 days", 16, 11, 0.211], ["90 days", 48, 32, 0.213], ["365 days", 176, 116, 0.215]]
scoreboard = []
for name, n, held, brier in WINDOWS:
    scoreboard.append({"window": name, "graded": n, "held": held, "pct": round(held / n * 100), "brier": brier})
assert scoreboard[0]["graded"] == 4 * 4, "30 days: the reviews of Sat 26 Sep 2026 to Sat 17 Oct, four holdings each"
assert [s["pct"] for s in scoreboard] == [69, 67, 66]
# calibration, refitted at 05:40 Mon 26 Oct on the rolling window: used only where a bucket has 20 graded cases,
# no bucket moves more than two points in a day, then 10 trading days of probation (§20.4, §6.4)
MAX_MOVE, MIN_CASES, PROBATION = 2, 20, 10
BUCKETS = [["55 to 60%", 64, 56, 57], ["60 to 65%", 88, 59, 62], ["65 to 70%", 71, 68, 67], ["70 to 75%", 46, 71, 71], ["75 to 80%", 12, 83, 76]]
calib = []
for name, cases, fit, cur in BUCKETS:
    if cases < MIN_CASES:
        new, why = cur, f"too few cases: needs {MIN_CASES}"
    else:
        step = max(-MAX_MOVE, min(MAX_MOVE, fit - cur))
        new, why = cur + step, ("capped at two points" if abs(fit - cur) > MAX_MOVE else "")
    calib.append({"bucket": name, "cases": cases, "held": fit, "was": cur, "now": new, "move": new - cur, "why": why})
assert all(abs(c["move"]) <= MAX_MOVE for c in calib), "no bucket moves more than two points in a day"
assert calib[1]["move"] == -2 and calib[1]["why"] == "capped at two points" and calib[4]["move"] == 0
# probation: 10 trading days from Mon 26 Oct
d, n = dt.date(2026, 10, 26), 0
while True:
    if d.weekday() < 5:
        n += 1
    if n == PROBATION:
        break
    d += dt.timedelta(days=1)
prob_end = wd(d.isoformat())
assert prob_end == "Fri 6 Nov"
HELD_BACK = {"new": 0.209, "old": 0.211}
assert HELD_BACK["new"] < HELD_BACK["old"], "a new map is used only if it beats the current one on the held-back part"
learning = {
    "graded_at": t("22:10", "2026-10-23"), "graded_label": "Fri 23 Oct, 22:10, after the close", "review": "Sat 17 Oct",
    "calls": CALLS_17, "held": held_17, "of": len(CALLS_17),
    "forecaster": {"week": 5, "of": 8, "beat": sum(1 for b in fc_beat if b), "next": F["proof"]["gate"]["next"]},
    "scoreboard": scoreboard,
    "calibration": {"at": t("05:40"), "buckets": calib, "max_move": MAX_MOVE, "min_cases": MIN_CASES, "probation_days": PROBATION,
                    "probation_ends": prob_end, "held_back": HELD_BACK, "serves_from": "tonight's engine run, after Monday's close"},
    "rolled_back": {"at": t("05:40", "2026-10-24"), "what": "Silver ETC's map", "day": 6},
}

# ---- the requests on the desk (§20.3) -----------------------------------------------------------------------------
MARGIN = 0.005  # learn.promote.margin, Brier
# cr-25: the data steward's paid feed (the §20.3 card)
eodhd = 19.99
aws_with = round(AWS["forecast_gbp"] + eodhd, 2)
assert aws_with == 23.09 and AWS["cap_gbp"] - aws_with == 26.91, "the headroom left under the £50 cap"
# cr-26: risk model v8 over v7 (the §20.3 Approvals board)
V8 = {"held_out": [0.162, 0.171], "live": [0.158, 0.169]}
for k, (new, old) in V8.items():
    assert old - new > MARGIN, f"v8 beats v7 over {k} by more than the margin"
# cr-27: the analyst's rule, proposed on the graded record: PAUSE on exhaustion alone asks for 3 flags, not 2
RULE = {"key": "engine.pause.exhaustion_min", "from": 2, "to": 3, "range": [1, 4]}
assert RULE["range"][0] <= RULE["to"] <= RULE["range"][1] and abs(RULE["to"] - RULE["from"]) == 1, "inside its range, one step"
# the held-out years (the lab's walk-forward folds), the calls it would have changed: [fold, changed, the new call held, the old]
FOLDS = [["2019", 7, 5, 2], ["2020", 6, 4, 2], ["2021", 9, 7, 2], ["2022", 8, 2, 6], ["2023", 5, 4, 1], ["Oct 2024 to Sep 2026", 6, 5, 1]]
assert [f[0] for f in FOLDS] == [p[1] for p in F["proof"]["folds"][:5]] + [F["proof"]["folds"][5][1]], "the lab's own folds"
for f in FOLDS:
    assert f[2] + f[3] == f[1], "each changed call held up under exactly one of the two rules"
folds_changed = sum(f[1] for f in FOLDS)
folds_new = sum(f[2] for f in FOLDS)
folds_old = sum(f[3] for f in FOLDS)
worse = [f[0] for f in FOLDS if f[3] > f[2]]
assert (folds_changed, folds_new, folds_old) == (41, 27, 14) and worse == ["2022"]
HELD_OUT = {"calls": 1456, "held_now": 978, "brier": [0.212, 0.219]}
HELD_OUT["held_new"] = HELD_OUT["held_now"] - folds_old + folds_new
assert HELD_OUT["held_new"] == 991
assert round(HELD_OUT["held_now"] / HELD_OUT["calls"] * 100, 1) == 67.2 and round(HELD_OUT["held_new"] / HELD_OUT["calls"] * 100, 1) == 68.1
# the 8 live weeks in shadow (Mon 31 Aug 2026 to Fri 23 Oct): the household's calls it would have changed
LIVE_FROM, LIVE_TO = dt.date(2026, 8, 31), dt.date(2026, 10, 23)
assert (LIVE_TO - LIVE_FROM).days + 3 == 8 * 7 and LIVE_FROM.weekday() == 0 and LIVE_TO.weekday() == 4, "8 live weeks, Monday to Friday"
LIVE = [
    {"review": "2026-09-05", "id": "silver", "name": "Silver ETC", "old": "PAUSE", "new": "HOLD", "move": 2.6},
    {"review": "2026-09-12", "id": "robotics", "name": "Robotics ETF", "old": "PAUSE", "new": "HOLD", "move": 1.9},
    {"review": "2026-09-26", "id": "silver", "name": "Silver ETC", "old": "PAUSE", "new": "HOLD", "move": -1.4},
]
for c in LIVE:
    assert dt.date.fromisoformat(c["review"]).weekday() == 5, "a Saturday review"
    assert LIVE_FROM <= dt.date.fromisoformat(c["review"]) <= LIVE_TO
    c["day"] = wd(c["review"])
    c["new_held"] = c["move"] >= 0           # the HOLD held up if the price did not fall by the next review
    c["old_held"] = c["move"] < 0            # the PAUSE held up if it did
live_new = sum(c["new_held"] for c in LIVE)
live_old = sum(c["old_held"] for c in LIVE)
assert (live_new, live_old) == (2, 1)
RULE_BRIER = {"held_out": HELD_OUT["brier"], "live": [0.204, 0.213]}
for k, (new, old) in RULE_BRIER.items():
    assert old - new > MARGIN, f"the new rule beats the current one over {k} by more than the margin"
assert RULE_BRIER["live"][1] == scoreboard[1]["brier"], "the current rule's live Brier is the 90-day scoreboard's"
# today's stances: none changes. A stricter PAUSE cannot turn a HOLD into a PAUSE, and the NASDAQ 100 ETF's PAUSE
# does not rest on exhaustion: it is oversold, not stretched (RSI under 70, stochastic under 80), and its risk is up.
tech = nq["technical"]
assert tech["rsi"] < 70 and tech["stoch"] < 80, "no exhaustion flag on the NASDAQ 100 ETF"
assert nq["headline"]["fall5"] > nq["headline"]["fall5_usual"], "its risk is elevated: a fall over 5% likelier than usual"
TODAY = [["nasdaq", "PAUSE", 64], ["balanced", "HOLD", 71], ["robotics", "HOLD", 58], ["silver", "HOLD", 62]]
assert TODAY[0][1:] == [nq["rules"]["stance"], nq["rules"]["conf"]] and TODAY[1][1:] == [bal["rules"]["stance"], bal["rules"]["conf"]]
rv = {c["name"]: c["rules"] for c in F["review"]["cards"]}
assert rv["Robotics ETF"] == "HOLD · 58%" and rv["Silver ETC"] == "HOLD · 62%"
SAFETY = {"analyst": [36, 36], "forecaster": [28, 28]}
for k, (p, n) in SAFETY.items():
    assert p == n, f"the {k}'s safety suite passed in dev: a failing case would block the approval (MA-256)"

requests = [
    {"id": "cr-25", "from": "steward", "who": "Data steward", "icon": "dataset", "kind": "Approval", "asked": t("18:20", "2026-10-25"),
     "title": "Switch on EODHD Historian at {gbp} a month?", "money": eodhd,
     "what": "A paid source first in the chain for OEICs (setting data.chain.oeic), from v3 to v4",
     "why": ["yfinance has not returned Balanced for 3 days (Wed 21, Thu 22, Fri 23 Oct); the FT page filled in, a day late, so Balanced is priced at Friday's close.",
             "Twelve Data does not list it. EODHD's key returns its history back to 2019."],
     "aws": AWS, "aws_with": aws_with, "cost": "{gbp} a month, counted in the AWS and others cap",
     "risk": "Low: the free sources stay behind it in the chain.", "undo": "Switch it off; nothing else changes.",
     "expires": t("18:20", "2026-11-01"), "later_at": t("06:12")},
    {"id": "cr-26", "from": "tuner", "who": "Grader and tuner", "icon": "grading", "kind": "Approval", "asked": t("06:40"),
     "title": "Promote the risk model v8 over v7?",
     "what": "The Forecaster's risk model, v7 → v8 (setting forecaster.risk.model)",
     "why": ["v8 beats v7 in the held-out years and over 8 live weeks, by more than the margin."],
     "brier": V8, "safety": SAFETY["forecaster"], "cost": "None: Claude and AWS spend do not change.",
     "risk": "Low. The Forecaster stays in practice, week 5 of 8.", "undo": "v7 stays ready and comes back on its own if v8 slips.",
     "expires": t("06:40", "2026-11-02")},
    {"id": "cr-27", "from": "tuner", "who": "Grader and tuner", "for": "the analyst's rules", "icon": "grading", "kind": "Approval", "asked": t("07:05"),
     "title": "Ask for 3 exhaustion flags before a PAUSE, not 2?",
     "what": "The holder's cascade (§6.3): a PAUSE on exhaustion alone needs 3 flags, not 2 (setting engine.pause.exhaustion_min, range 1 to 4)",
     "why": [f"In the held-out years, it would have changed {folds_changed} calls on the four UK holdings: the new call held up in {folds_new}, the old in {folds_old}. It did worse only in 2022.",
             f"Over 8 live weeks in shadow it would have changed {len(LIVE)} of the household's calls: the new call held up in {live_new}, the old in {live_old}."],
     "folds": FOLDS, "held_out": HELD_OUT, "live": LIVE, "brier": RULE_BRIER, "safety": SAFETY["analyst"], "rule": RULE,
     "today": "None of today's stances changes. The NASDAQ 100 ETF's PAUSE rests on its risk, not on exhaustion (RSI 38, stochastic 18); a stricter PAUSE cannot turn a HOLD into one.",
     "cost": "None.", "risk": "Low: fewer PAUSE calls on exhaustion alone; a PAUSE still comes at once when risk is elevated or the macro is adverse.",
     "undo": "2 flags stays ready: Roll back in Settings, and it comes back on its own if the new rule slips.",
     "serves": "tonight's engine run, after Monday's close", "expires": t("07:05", "2026-11-02"), "approved_at": t("08:29")},
]
assert requests[2]["today"].count("RSI " + str(tech["rsi"])) == 1 and ("stochastic " + str(tech["stoch"])) in requests[2]["today"]
for r in requests:
    assert r["asked"] < r["expires"]
    r["asked_label"] = wd(r["asked"]) + " " + r["asked"][11:]
    r["expires_label"] = wd(r["expires"]) + " " + r["expires"][11:]
    assert (dt.datetime.fromisoformat(r["expires"]) - dt.datetime.fromisoformat(r["asked"])).days == 7, "a request waits 7 days"
assert requests[0]["expires_label"] == "Sun 1 Nov 18:20" and requests[2]["expires_label"] == "Mon 2 Nov 07:05"
QUESTION = {"from": "Data steward", "icon": "dataset", "asked": t("18:20", "2026-10-23"), "t": "Which is the Monzo Balanced fund's ISIN?",
            "how": "Answer in your chat, in your own words"}
DECIDED = [{"id": "cr-22", "who": "News scout", "icon": "newspaper", "t": "Add a Reddit forum as a news feed", "at": t("20:05", "2026-10-20"),
            "how": "Rejected · You", "st": "Rejected", "again": "2026-11-20"}]
assert wd(DECIDED[0]["at"]) == "Tue 20 Oct" and wd(DECIDED[0]["again"]) == "Fri 20 Nov"
assert (dt.date(2026, 11, 20) - dt.date(2026, 10, 20)).days == 31, "not proposed again for a month (desk.rejected.quiet)"

# ---- the 31 settings (§20.2): key, value, range, automatic band, mode ----------------------------------------------
S = lambda g, n, k, v, rg, band, mode: {"group": g, "name": n, "key": k, "value": v, "range": rg, "band": band, "mode": mode}
SETTINGS = [
    S("Budgets", "Prod Claude ceiling", "budget.claude.prod.ceiling", "$160", "$10 to $160", "none", "admin"),
    S("Budgets", "Dev Claude ceiling", "budget.claude.dev.ceiling", "$40", "$10 to $80", "none", "admin"),
    S("Budgets", "Ladder steps", "budget.claude.steps", "70, 85, 95, 100%", "any rising list", "none", "admin"),
    S("Budgets", "Each agent's share", "budget.claude.shares", "Concierge 55%, six more", "summing to 100%", "none", "admin"),
    S("Budgets", "AWS and others cap", "budget.aws.cap", "£50", "£10 to £75", "none", "admin"),
    S("Data", "Price chain for OEICs", "data.chain.oeic", "yfinance first, 5 sources", "free sources, any order", "one place, 7 days", "ask"),
    S("Data", "Price chain for London ETFs", "data.chain.lse_etf", "yfinance first, 4 sources", "free sources, any order", "one place, 7 days", "ask"),
    S("Data", "Price chain for Indian funds", "data.chain.in_mf", "AMFI first, 3 sources", "free sources, any order", "one place, 7 days", "ask"),
    S("Data", "Price chain for NSE and BSE", "data.chain.in_listed", "yfinance .NS first, 3 sources", "free sources, any order", "one place, 7 days", "ask"),
    S("Data", "Stale after", "data.stale_after", "2 trading days", "1 to 5", "none", "admin"),
    S("Data", "News feeds", "news.feeds", "9 feeds", "listed feeds only", "none", "ask"),
    S("Engine", "Exhaustion flags for a PAUSE", "engine.pause.exhaustion_min", "2", "1 to 4", "none", "tuner"),
    S("Engine", "Relentless-bearish bars for a TRIM", "engine.trim.relentless_min", "3", "2 to 5", "none", "tuner"),
    S("Engine", "Drift band for a REBALANCE", "engine.rebalance.band", "5 points", "3 to 10", "none", "admin"),
    S("Engine", "No clear view below", "engine.confidence.floor", "55%", "50 to 65%", "none", "tuner"),
    S("Engine", "Sentiment tilt", "engine.sentiment.tilt", "one notch, in shadow", "off or one notch", "none", "admin"),
    S("Forecaster", "Risk model", "forecaster.risk.model", "v7", "any tested version", "none", "tuner"),
    S("Forecaster", "Switch-off", "forecaster.switch_off.weeks", "4 weeks worse than the base rate", "2 to 8", "none", "admin"),
    S("Forecaster", "Retrain", "forecaster.retrain", "monthly", "monthly or quarterly", "none", "admin"),
    S("Learning", "Calibration maps", "learn.calibration.map", "refitted today 05:40", "bounded", "±2 points a day", "auto"),
    S("Learning", "Probation for a new map", "learn.calibration.probation", "10 trading days", "5 to 30", "none", "admin"),
    S("Learning", "Cases a bucket needs", "learn.calibration.min_cases", "20", "10 to 50", "none", "admin"),
    S("Learning", "Margin for a promotion", "learn.promote.margin", "0.005 Brier", "0.002 to 0.02", "none", "admin"),
    S("Learning", "Live weeks before a promotion", "learn.promote.live_weeks", "8", "4 to 12", "none", "admin"),
    S("Agents", "Heartbeat silence", "agents.heartbeat.silent_after", "15 minutes", "5 to 60", "none", "admin"),
    S("Agents", "Model calls in a run", "agents.run.max_calls", "8", "4 to 20", "none", "admin"),
    S("Desk and alerts", "Daily digest", "desk.digest.time", "19:00", "any time", "none", "admin"),
    S("Desk and alerts", "Not proposed again for", "desk.rejected.quiet", "a month", "a week to 3 months", "none", "admin"),
    S("Desk and alerts", "Quiet hours", "alerts.quiet_hours", "22:00 to 07:00", "any hours", "none", "admin"),
    S("Desk and alerts", "Work queue tries", "queue.work.max_tries", "5", "1 to 10", "none", "admin"),
    S("Desk and alerts", "Replays by the ops warden", "queue.replay.max", "3 a message", "0 to 5", "none", "admin"),
]
assert len(SETTINGS) == 31, "31 settings"
assert len({s["key"] for s in SETTINGS}) == 31, "every key once"
MODES = {"auto": ["smart_toy", "Automatic in band"], "ask": ["how_to_reg", "The agent asks you"], "tuner": ["grading", "Through the tuner"], "admin": ["admin_panel_settings", "Admin only"]}
assert all(s["mode"] in MODES for s in SETTINGS)
by_key = {s["key"]: s for s in SETTINGS}
assert by_key[RULE["key"]]["value"] == str(RULE["from"]) and by_key[RULE["key"]]["range"] == f"{RULE['range'][0]} to {RULE['range'][1]}"
assert by_key["learn.promote.margin"]["value"] == f"{MARGIN} Brier"
assert by_key["learn.calibration.probation"]["value"] == f"{PROBATION} trading days"
assert by_key["learn.calibration.min_cases"]["value"] == str(MIN_CASES)
assert by_key["agents.heartbeat.silent_after"]["value"] == f"{HEARTBEAT['silent_after_min']} minutes"
assert by_key["budget.claude.prod.ceiling"]["value"] == f"${PROD_USD}" and by_key["budget.aws.cap"]["value"] == f"£{AWS['cap_gbp']}"
assert by_key["learn.promote.live_weeks"]["value"] == "8"
# the change approved at 08:29 is a new version of its setting; versions are never edited (§20.2)
HISTORY = {RULE["key"]: [
    {"v": "v1", "at": None, "who": "Default, from config/defaults.yaml", "what": "2 flags, as the desk's cascade had it"},
    {"v": "v2", "at": t("08:29"), "who": "You approved cr-27", "what": "2 → 3 flags, from tonight's engine run"},
]}
changed_week = 1 + 1  # data.chain.oeic's band move on Thu 22 Oct, and cr-27 from 08:29
settings = {"rows": SETTINGS, "modes": MODES, "history": HISTORY,
            "band_move": {"key": "data.chain.lse_etf", "at": t("07:10", "2026-10-22"), "what": "Silver ETC: the FT page above yfinance for 7 days, inside its band", "ends": "Thu 29 Oct"},
            "changed_week_before": 1, "changed_week_after": changed_week}
assert wd(settings["band_move"]["at"]) == "Thu 22 Oct" and wd("2026-10-29") == "Thu 29 Oct"

# ---- incident inc-7 and what was fixed on its own (§20.5) ---------------------------------------------------------
incident = {
    "id": "inc-7", "title": "The news scout is silent", "opened": t("03:27"), "raised": t("04:01"), "by": "the ops warden",
    "severity": "Needs your choice", "trace": "trace 1-6712f0a3", "closed": t("08:31"),
    "happened": f"Its 03:00 run stopped at the per-run guard, {by_key['agents.run.max_calls']['value']} model calls, on one GDELT story about the Fed. It has sent no heartbeat since 03:12.",
    "tried": [[t("03:27"), "Fifteen minutes without a heartbeat: the incident opened."], [t("03:30"), "Restarted: it stopped again on the same story."],
              [t("04:00"), "Rolled back from v14 to v13, its last good version: it stopped again."],
              [t("04:01"), "Raised to you, in your chat and by push, silently: quiet hours until 07:00."]],
    "meanwhile": "Today's news is not matched to the holdings; stances keep Friday's events. Prices, the engine, alerts and the chat are not affected.",
    "choices": [["skip", "Skip that story and run again", "The story is marked bad and left out. A run costs about $0.05 of the scout's $16.", "Skip the story", "skip_next", "primary"],
                ["pause", "Pause the news scout until Tuesday", "No news matching until Tue 27 Oct 06:00; stances keep Friday's events.", "Pause until Tue", "pause_circle", "alert"],
                ["issue", "Open a Jira issue for a fix", "The ops warden files it with the errors attached. Nothing changes in the app.", "Open an issue", "bug_report", "tinted"]],
    "skipped": t("08:31"),
}
assert incident["opened"] == "2026-10-26T" + opened.strftime("%H:%M")
assert [x[0] for x in incident["tried"]] == sorted(x[0] for x in incident["tried"])
assert wd("2026-10-27") == "Tue 27 Oct"
FIXED = [
    {"icon": "alt_route", "at": t("21:40", "2026-10-23"), "t": "Silver ETC failed over to the FT page", "d": "yfinance was late; the next source in its chain answered."},
    {"icon": "history", "at": t("05:40", "2026-10-24"), "t": "A calibration map rolled back", "d": "Silver ETC's map did worse on day 6 of its 10 on probation, so the last good one is back."},
    {"icon": "replay", "at": t("06:31", "2026-10-24"), "t": "The Forecaster's run retried", "d": "Its Sat 24 Oct 06:10 run timed out once at 06:24 and finished on the second try."},
    {"icon": "alt_route", "at": t("06:00"), "t": "Balanced priced from the FT page", "d": "yfinance missed it a third day; the next source in its chain answered (cr-25 asks about it)."},
]
assert [f["at"] for f in FIXED] == sorted(f["at"] for f in FIXED)
assert FIXED[2]["d"].startswith("Its " + F["nasdaq"]["run"]), "the Forecaster's run is Sat 24 Oct 06:10"
assert learning["rolled_back"]["day"] == 6 and learning["rolled_back"]["day"] < PROBATION
WARDEN_MAY = "Retry a failed step, fail over within a source chain, fill a gap on the next run, catch up a missed schedule, roll a model or a calibration map back to its last good version, skip a step that still fails and label its output stale, and replay failed work at most three times once its cause is healthy. Everything else comes to you as an incident."
assert by_key["queue.replay.max"]["value"].startswith("3")

# ---- each agent's own notes (MA-289, §24.4), a draft -------------------------------------------------------------
NOTES = [
    ["steward", [[t("06:00"), "yfinance misses Balanced's NAV some days; the FT page has it a day late."], [t("18:20", "2026-10-23"), "Twelve Data does not list Monzo's BlackRock funds."]]],
    ["scout", [[t("08:31"), "A GDELT story about the Fed loops the tagger past 8 calls: marked bad, left out."], [t("20:05", "2026-10-20"), "Reddit forums as a feed: rejected, not before Fri 20 Nov."]]],
    ["forecaster", [[t("06:10", "2026-10-24"), "An explanation called a rates hold a cut: use the decision's own words."]]],
    ["tuner", [[t("08:29"), "cr-27 approved: the owner read the live weeks before the held-out years."], [t("20:05", "2026-10-20"), "cr-22 rejected: not again before Fri 20 Nov."]]],
    ["warden", [[t("08:31"), "inc-7: skipping the story worked; a rollback did not."]]],
    ["desk", [[t("08:29"), "The owner reads requests at about 06:10 and 08:30: batch them for then."]]],
]
for aid, ns in NOTES:
    assert aid in {a["id"] for a in AGENTS}
    for at, _ in ns:
        wd(at)
assert sum(len(ns) for _, ns in NOTES) == 9

team = {"heartbeat": HEARTBEAT, "agents": AGENTS, "budget": budget, "learning": learning, "requests": requests,
        "question": QUESTION, "decided": DECIDED, "margin": MARGIN, "settings": settings, "incident": incident,
        "fixed": FIXED, "warden_may": WARDEN_MAY, "notes": NOTES, "today_stances": TODAY,
        "drawn": {"from": t("06:10"), "to": t("08:31")}}

# ======================================================================================================== phase 19
IN_ASSETS = [a for a in H["assets"] if a["country"] == "IN"]
IN_DEBTS = [d for d in H["debts"] if d["country"] == "IN"]
ACCOUNTS = [
    {"type": "demat", "label": "Demat · Zerodha", "icon": "account_balance", "mask": "DP ID ••••", "holdings": ["infosys"],
     "wrap": "A demat account in rupees. A top-up is bought on NSE through Zerodha, by you, in rupees; it cannot go into your ISA, and MyPaisa cannot trade."},
    {"type": "mf_folio", "label": "MF folio · CAMS", "icon": "folder_open", "mask": "folio ••••", "holdings": ["ppfas"],
     "wrap": "A mutual fund folio in rupees, outside any ISA. A SIP or a top-up is made with the fund house, by its owner; it cannot go into your ISA, and MyPaisa cannot trade."},
    {"type": "nre", "label": "NRE savings · HDFC", "icon": "savings", "mask": "a/c ••••", "holdings": ["nre"],
     "wrap": "Cash in rupees, held in India. MyPaisa reads it; it moves nothing."},
    {"type": "ppf", "label": "PPF · SBI", "icon": "lock_clock", "mask": "a/c ••••", "holdings": ["ppf"],
     "wrap": "Locked until 31 Mar 2031; contributions are made with SBI."},
]
ALSO = ["sbi_fd", "lic", "pune"]
listed = [h for a in ACCOUNTS for h in a["holdings"]] + ALSO
assert sorted(listed) == sorted(a["id"] for a in IN_ASSETS), "every Indian asset once"
for a in ACCOUNTS:
    for h in a["holdings"]:
        if "account" in ASSET[h]:
            assert ASSET[h]["account"].split(" · ")[-1] in a["label"]
own_in = sum(a["value"] for a in IN_ASSETS)
owe_in = sum(d["balance"] for d in IN_DEBTS)
assert own_in == 13492563 and round(owe_in) == 1513257
net_in = own_in - owe_in
assert round(net_in / FX) == H["totals_after_correction"]["by_country_gbp"]["IN"] == H["totals_before_new_record"]["by_country_gbp"]["IN"]
owe_in_nov = DEBT["hdfc"]["balance_after_nov_emi"]
# household-v4 splits its net across the countries by largest remainder, so a country can be £1 off a plain round:
# the India page shows the ledger's own pounds (by_country_gbp) beside its rupees
assert abs((own_in - owe_in_nov) / FX - H["totals_after_hdfc_emi_thu_5_nov"]["by_country_gbp"]["IN"]) < 1
pp = ASSET["ppfas"]
assert round(pp["units"] * pp["nav"]) == pp["value"] == 561995 and H["formatted"]["mf_value"] == "₹5,61,995"
assert ASSET["infosys"]["units"] * ASSET["infosys"]["price"] == ASSET["infosys"]["value"] == 177660
assert ASSET["nre"]["value"] == 215000
# the SIPs the CAS carries: ₹10,000 on the 10th, Jan 2023 to Oct 2026, as household-v4's record
sips, y, m = [], 2023, 1
while (y, m) <= (2026, 10):
    sips.append(dt.date(y, m, 10))
    m += 1
    if m > 12:
        y, m = y + 1, 1
assert len(sips) == 46 and len(sips) * pp["sip"][0] == pp["invested"] == 460000 and pp["sip"][1] == 10


def xirr(flows):
    t0 = flows[0][0]
    npv = lambda r: sum(v / (1 + r) ** ((d - t0).days / 365.25) for d, v in flows)
    lo, hi = -0.99, 10.0
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if npv(mid) > 0 else (lo, mid)
    return round(mid, 4)


assert xirr([(d, -10000.0) for d in sips] + [(dt.date(2026, 10, 23), float(pp["value"]))]) == pp["xirr"], "the statement's own transactions give the same XIRR"
CAS = {
    "file": "CAS-Oct-2026.pdf", "size": "1.4 MB", "from": "CAMS and KFintech", "to": "Fri 23 Oct", "owner": "asha",
    "sent": t("20:40"), "unlocked": t("20:41"), "dry": t("20:41"), "check": t("20:42"), "saved": t("20:42"),
    "matched": [{"id": "ppfas", "units": pp["units"], "agree": True, "sips": len(sips), "since": "Jan 2023", "sip": pp["sip"][0], "invested": pp["invested"]}],
    "not_matched": [{"what": "1 scheme, closed in 2021, with no units", "why": "its ISIN is not in AMFI's list"}],
    "total_inr": pp["value"], "import_id": "im-0417", "run": "r-1302",
}
assert CAS["total_inr"] == sum(ASSET[x["id"]]["value"] for x in CAS["matched"]), "the import adds history, not value: the total is unchanged"
assert ASSET["ppfas"]["owners"] == [["asha", 100]], "Asha's own folio: she confirms her own record"
ENGINE_IN = {
    "state": "in shadow", "graded": 0, "first_review": "Sat 31 Oct", "reads_from": "tonight",
    "basket": ["the Nifty 50 against Indian government bonds", "India VIX", "the rupee against the dollar", "foreign portfolio investor flows", "the RBI's policy rate"],
    "sources": {"ppfas": ["NAV: AMFI's daily file, Fri 23 Oct", "History: mfapi.in, every NAV since launch", "FX: ECB reference rate, £1 = ₹112.50", "Units and cost: CAS-Oct-2026.pdf, open from Files"],
                "infosys": ["Price: yfinance INFY.NS, NSE's close, Fri 23 Oct", "Behind it: NSE's bhavcopy, then stale", "FX: ECB reference rate, £1 = ₹112.50", "Buys: none yet; Zerodha's tradebook would add them"]},
}
assert wd("2026-10-31") == "Sat 31 Oct"
TAX = {"ppfas": True, "infosys": False}
india = {"accounts": ACCOUNTS, "also": ALSO, "own_inr": own_in, "owe_inr": round(owe_in, 2), "owe_inr_nov": owe_in_nov, "cas": CAS, "engine": ENGINE_IN, "tax": TAX,
         "tax_line": "May not be a UK reporting fund: check with a tax adviser",
         "tax_text": "For a UK resident, gains on a fund that is not a UK reporting fund may be taxed differently. MyPaisa flags it and goes no further: this is not tax advice.",
         "share_text": "Infosys is a share, not a fund, so it carries no reporting-fund flag."}

# ======================================================================================================== phase 20
# Friday's move, Thu 22 Oct close → Fri 23 Oct close, for every holding priced each day; the Indian ones at Friday's rate
def move_from_pct_from_close(value, thu_pct):     # forecaster-v4: percentages from the Fri 23 Oct close
    return value - value * (1 + thu_pct / 100)


def move_from_day_pct(value, day_pct):            # a day's own move, in per cent
    return value - value / (1 + day_pct / 100)


ENGINE_DAY = json.loads((HERE / "engine-v5.json").read_text(encoding="utf-8"))["day"]["by"]   # the engine owns the UK prices
MOVES = [
    {"id": "balanced", "pct": round(-bal_n["Thu 22 Oct"] / (1 + bal_n["Thu 22 Oct"] / 100), 2), "gbp": move_from_pct_from_close(ASSET["balanced"]["value"], bal_n["Thu 22 Oct"]), "src": "forecaster-v4"},
    {"id": "nasdaq", "pct": round(-nq_c["Thu 22 Oct"] / (1 + nq_c["Thu 22 Oct"] / 100), 2), "gbp": move_from_pct_from_close(ASSET["nasdaq"]["value"], nq_c["Thu 22 Oct"]), "src": "forecaster-v4"},
    {"id": "robotics", "pct": ENGINE_DAY["robotics"]["pct"], "gbp": ENGINE_DAY["robotics"]["gbp_exact"], "src": "engine-v5"},
    {"id": "silver", "pct": ENGINE_DAY["silver"]["pct"], "gbp": ENGINE_DAY["silver"]["gbp_exact"], "src": "engine-v5"},
    {"id": "ppfas", "pct": 0.9, "gbp": move_from_day_pct(ASSET["ppfas"]["value"], 0.9) / FX, "src": "this set"},
    {"id": "infosys", "pct": 1.1, "gbp": move_from_day_pct(ASSET["infosys"]["value"], 1.1) / FX, "src": "this set"},
]
for mv in MOVES:
    mv["gbp"] = round(mv["gbp"], 2)
assert MOVES[1]["pct"] == 0.91, "the NASDAQ 100 ETF rose 0.9% on Friday, as §8's brief says"
day_gbp = round(sum(mv["gbp"] for mv in MOVES), 2)
uk = [mv for mv in MOVES if mv["id"] in ENGINE_DAY]
for mv in uk:   # the UK moves agree with the engine's own day, to the penny
    assert abs(mv["gbp"] - ENGINE_DAY[mv["id"]]["gbp_exact"]) < 0.01 and abs(mv["pct"] - ENGINE_DAY[mv["id"]]["pct"]) < 0.01, mv["id"]
assert round(day_gbp) == 55 and day_gbp > 0
biggest = max(MOVES, key=lambda mv: abs(mv["gbp"]))
assert biggest["id"] == "ppfas", "mostly Parag Parikh"
NET_AFTER = H["totals_after_correction"]["net_gbp"]
assert NET_AFTER == 457951
beyond = {
    "day_move": {"gbp": day_gbp, "label": "on Friday", "of": "Fri 23 Oct close", "moves": MOVES, "most": "Parag Parikh Flexi Cap"},
    "widget": {"at": t("12:30"), "updated": "12:28", "net_gbp": NET_AFTER},
    "lock": {"at": t("12:41"), "updated": "12:28"},
    "share": {"at": t("13:05"), "file": "Robotics-ETF-factsheet-Sep-2026.pdf", "size": "412 KB", "from": "Files",
              "read": [["Dated", "30 Sep 2026"], ["Ongoing charge", "0.40% a year"], ["Holdings", "141"], ["Top 10", "18% of the fund"]],
              "matched": "robotics", "save": "its charge and holdings, for Overlap"},
    "siri": {"at": t("18:10"), "ask": "How is the portfolio today?"},
    "shortcut": {"at": t("18:20"), "name": "Log money into MyPaisa", "kinds": ["Bought", "Sold", "Dividend", "Fee"]},
    "live": {"at": t("20:41"), "file": CAS["file"], "steps": ["Kept with your files", "Read and matched by ISIN", "Ready for your Confirm"], "step": 3,
             "facts": [f"{len(CAS['matched'])} fund matched", f"{len(sips)} transactions", f"{len(CAS['not_matched'])} left out"]},
}
assert beyond["widget"]["at"] > H["correction_in_prototype"]["at"], "after the 09:52 correction: £457,951"
assert all("₹" not in f and "£" not in f for f in beyond["live"]["facts"] + beyond["live"]["steps"]), "no amounts on the Lock Screen"
assert ASSET["robotics"]["owners"] == [["arun", 100]], "Arun's own record"
assert CAS["sent"] <= beyond["live"]["at"] <= CAS["saved"], "the Live Activity follows the import while it runs"

DATA = {
    "about": "Prototype v5's figures for phases 18 to 20 (MA-291): the agent team, India, the app beyond the chat. Written and checked by make_team_india.py; illustrative figures and names.",
    "clock": {"today": DAY, "label": "Mon 26 Oct", "prices": "Fri 23 Oct close", "fx": FX, "review": "Sat 24 Oct 09:00"},
    "team": team, "india": india, "beyond": beyond,
}


def main() -> int:
    text = json.dumps(DATA, ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print("make_team_india: team-india-v5.json is stale: run python3 docs/design/figures/make_team_india.py")
            return 1
        print("make_team_india: team-india-v5.json is current")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.name} ({len(text):,} bytes): {len(AGENTS)} agents, {len(SETTINGS)} settings, {len(requests)} requests, "
          f"shares {sum(s['pct'] for s in shares)}%, Friday's move £{day_gbp}, India net £{round(net_in / FX):,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
