"""The illustrative ledger behind MyPaisa's clickable demo (MA-290): audit rows, Activity runs, files, sign-ins, devices,
the Admin center's data and settings, on the household's own clock.

A design aid, not the product's engine. It adds what household-v4.json and future-plans-v4.json lack, and takes every
figure they hold from them (never retyped). Figures and times that a board or the Prototype v4 prints are transcribed
here, with the board named; anything invented carries "illustrative": true. Where boards disagree, Prototype v4 wins,
then the v4 boards, then the older ones, and the household over all; each choice is in "disagreements".
Run: python3 make_demo_ledger.py > demo-ledger-v4.json   (every assert below must hold, or it fails loudly)
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
H = json.load(open(HERE / "household-v4.json", encoding="utf-8"))
FP = json.load(open(HERE / "future-plans-v4.json", encoding="utf-8"))
ASSETS = {a["id"]: a for a in H["assets"]}
DEBTS = {d["id"]: d for d in H["debts"]}
NEW = H["new_record_in_prototype"]
COR = H["correction_in_prototype"]
STM = H["statements_oct"]
PLANS = FP["plans"]
USD_PER_GBP = 1.30  # the boards' pounds beside dollars imply 1.29 to 1.30 (illustrative)


def ts(d: str, hms: str) -> str:
    return f"{d}T{hms if hms.count(':') == 2 else hms + ':00'}"


def label(at: str) -> str:
    d = datetime.fromisoformat(at)
    return f"{d.strftime('%a')} {d.day} {d.strftime('%b')} {d.strftime('%H:%M')}"


# ---------------------------------------------------------------- the clock
DAYS = [
    {"id": "d0", "date": "2026-10-25", "label": "Sun 25 Oct", "last_frame": "20:15", "note": "the day before the prototype starts: the SBI FD (replayed on Mon) and the first three plan items (Plans tab boards)"},
    {"id": "d1", "date": "2026-10-26", "label": "Mon 26 Oct", "last_frame": "10:44", "note": "Prototype v4's Monday ends at 09:53; the Projection boards add the 10:40 and 10:44 corrections 'after every other frame'"},
    {"id": "d2", "date": "2026-11-01", "label": "Sun 1 Nov", "last_frame": "09:05"},
    {"id": "d3", "date": "2026-11-05", "label": "Thu 5 Nov", "last_frame": "10:26"},
    {"id": "d3e", "date": "2026-11-05", "label": "Thu 5 Nov, evening", "last_frame": "21:22", "note": "future-plans-v4: evening 20:41 to 21:22"},
    {"id": "d4", "date": "2026-11-06", "label": "Fri 6 Nov", "last_frame": "10:05", "note": "the Admin center's day (Browser Admin center 3's 08:28 to 10:05; iPhone admin's 'today' is Fri, renewal Tue 3 Nov)", "illustrative": True},
]
DAY_OF = {}  # event day id from its time: the evening is d3e


def day_id(at: str) -> str:
    d, t = at.split("T")
    if d == "2026-11-05":
        return "d3e" if t >= "17:00:00" else "d3"
    return {x["date"]: x["id"] for x in DAYS if x["id"] != "d3e"}[d]


# ---------------------------------------------------------------- events
EVENTS: list[dict] = []
HOW = {"chat": "in the chat", "inline_edit": "in place", "check_in": "on the check-in", "statement": "in the chat",
       "month_close": "on the check-in", "plan": "in the chat", "admin": "in the Admin center", "sign_in": "", "file": "in the chat"}
NO_RUN = {"sign_in", "fresh_check", "fresh_check_failed"}


def ev(id, at, actor, via, kind, record, field, before, after, ccy, core, run, file=None, how=None, group=None, **extra):
    at = at if at.count(":") == 2 else at + ":00"
    who = {"arun": "Arun", "asha": "Asha"}[actor]
    tail = f"{who} · {label(at)}" + (f" · {how or HOW[via]}" if (how or HOW[via]) else "")
    e = {"id": id, "at": at, "day": day_id(at), "actor": actor, "via": via, "kind": kind, "record": record, "field": field,
         "before": before, "after": after, "ccy": ccy, "summary": f"{core} · {tail}", "run": run, "file": file}
    if group:
        e["group"] = group
    e.update(extra)
    return e


fd = ASSETS["sbi_fd"]
EVENTS += [
    ev("e-fd-register", "2026-10-25T10:03", "arun", "chat", "register", "sbi_fd", "value", None, fd["principal"], "INR",
       "Record added · Fixed deposit · SBI", "r-1196", note="Prototype v4 s3 replays it; Audit row 'Sun 25 Oct, 10:03 · Record added · ₹5,00,000'"),
]
for pid, at, run, core in [
    ("extension", "2026-10-25T20:09", "r-1197", "Plan item added · Home extension, £35,000 in Jun 2027"),
    ("car2", "2026-10-25T20:12", "r-1198", "Plan item added · Replace the car, £25,000 in Jun 2031"),
    ("bonus", "2026-10-25T20:15", "r-1199", "Plan item added · Asha's annual bonus, £3,000 every March from 2027 to 2052"),
]:
    p = next(x for x in PLANS["existing"] if x["id"] == pid)
    EVENTS.append(ev(f"e-plan-{pid}", at, "arun", "plan", "plan_add", pid, "amount", None, p["amount"], p["ccy"], core, run))

EVENTS += [
    ev("e-signin-arun", "2026-10-26T09:30", "arun", "sign_in", "sign_in", None, None, None, None, None,
       "Signed in with Apple · Chrome on MacBook Air · London, UK", None, device="d-arun-mac",
       note="Prototype v4: 'Arun · admin · signed in with Apple'; Admin center 3 draws 09:30 with Google (Prototype wins)"),
    ev("e-monzo-register", "2026-10-26T09:41:20", "arun", "chat", "register", NEW["id"], "value", None, NEW["value"], NEW["ccy"],
       "Record added · Instant access savings · Monzo", "r-1235"),
    ev("e-home-correction", COR["at"] + ":00", "arun", "inline_edit", "correction", COR["record"], COR["field"], COR["from"], COR["to"], "GBP",
       f"Correction · Home, Reading · £{COR['from']:,} → £{COR['to']:,}, your estimate", "r-1238"),
    ev("e-salary-growth", "2026-10-26T10:40", "arun", "inline_edit", "assumption_correct", "arun_salary_growth", "growth", 0.0417, 0.048, None,
       "Arun's salary growth 4.17% → 4.8%", "r-1241", how="edited in place"),
    ev("e-bonus-growth", "2026-10-26T10:44", "arun", "inline_edit", "plan_correct", "bonus", "growth", None, 0.035, None,
       "Plan item corrected · Asha's annual bonus: growth none → 3.5% a year", "r-1242", how="edited in place"),
]

barclay_total = sum(x["amount_gbp"] for x in STM["barclaycard_nov"]["lines"])
monzo = STM["monzo_current_oct"]
EVENTS += [
    ev("e-file-barclay", "2026-11-01T08:40", "arun", "file", "file_received", "barclaycard_nov", None, None, None, None,
       "File kept · barclaycard-2026-11-01.pdf", "r-1262", file="f-barclay"),
    ev("e-file-monzo", "2026-11-01T08:40:05", "arun", "file", "file_received", "monzo_current_oct", None, None, None, None,
       "File kept · monzo-2026-10.csv", "r-1262", file="f-monzo"),
    ev("e-statements", "2026-11-01T08:44", "arun", "statement", "statement_confirm", "budget_oct", "spend", None, barclay_total + monzo["spend"], "GBP",
       f"Statements saved · {len(STM['barclaycard_nov']['lines']) + len(monzo['spend_lines'])} lines in October's budget", "r-1262",
       group="c-statements", files=["f-barclay", "f-monzo"]),
    ev("e-emi-car", "2026-11-01T08:44:01", "arun", "statement", "emi_confirmed", "car", "emi", None, DEBTS["car"]["payment"], "GBP",
       "EMI confirmed · Car loan · Close Brothers · by the Monzo statement", "r-1262", group="c-statements", file="f-monzo",
       note="the same Confirm also confirmed the mortgage's 1 Oct EMI (£1,456.46); the prototype's Audit shows only the car's row"),
    ev("e-month-close", "2026-11-01T09:02", "arun", "month_close", "month_close", "budget_oct", None, None, None, None,
       "October closed · Budget · Nothing else", "r-1263", how="on the check-in"),
    ev("e-emi-paid", "2026-11-05T09:12", "arun", "check_in", "check_in_paid", "hdfc", "emi", None, round(DEBTS["hdfc"]["payment"]), "INR",
       "EMI paid · HDFC home loan", "r-1280", how="on the check-in, with Undo"),
]

sch = PLANS["schooling"]
sal = PLANS["salary_step"]
wed = FP["evening2"]["wedding"]["plan"]
EVENTS += [
    ev("e-school-fees", "2026-11-05T20:43", "arun", "plan", "plan_add", "schooling", "amount", None, sch["amount"], sch["ccy"],
       "Plan item added · School fees, £4,000 a month from Jan 2029 to Jul 2041, 4.5% a year", "r-1290"),
    ev("e-school-pot", "2026-11-05T20:46", "arun", "plan", "plan_add", "school_fees_pot", "amount", None, 690, "GBP",
       "Plan item added · School fees pot, £690 a month from Nov 2026 to Dec 2028, drawn from Jan 2029", "r-1291", how="in the chat · Undo", group="c-pot"),
    ev("e-budget-nov", "2026-11-05T20:46:01", "arun", "plan", "budget_change", "budget_nov", "planned_surplus", 2636, 1946, "GBP",
       "November's budget changed · School fees pot £690 added; planned surplus £2,636 → £1,946", "r-1291", how="in the chat · Undo", group="c-pot"),
    ev("e-salary-step", "2026-11-05T20:53", "arun", "plan", "plan_add", "salary_step", "amount", None, sal["amount"], sal["ccy"],
       "Plan item added · Arun's salary set to £5,500 a month from Sep 2028", "r-1292"),
    ev("e-hdfc-close", "2026-11-05T20:59", "arun", "plan", "plan_add", "hdfc_close", None, None, None, "INR",
       "Plan item added · Close the HDFC home loan with the SBI FD, Mar 2029", "r-1293"),
    ev("e-car-pause", "2026-11-05T21:08", "arun", "inline_edit", "plan_pause", "car2", "status", "active", "paused", None,
       "Plan item paused · Replace the car · v1 → v2", "r-1294", how="in place"),
    ev("e-car-resume", "2026-11-05T21:09", "arun", "inline_edit", "plan_resume", "car2", "status", "paused", "active", None,
       "Plan item resumed · Replace the car · v2 → v3", "r-1295", how="in place"),
    ev("e-school-end", "2026-11-05T21:11", "arun", "inline_edit", "plan_correct", "schooling", "end", "2041-07", "2040-07", None,
       "Plan item corrected · ends Jul 2041 → Jul 2040 · v1 → v2", "r-1296", how="in place"),
    ev("e-car-end", "2026-11-05T21:13", "arun", "inline_edit", "plan_end", "car2", "status", "active", "ended", None,
       "Plan item ended · Replace the car · v3 → v4 · his words \u201cwe\u2019re keeping the car\u201d", "r-1297", how="in place"),
    ev("e-wedding", "2026-11-05T21:16", "arun", "plan", "plan_add", "wedding", "amount", None, wed["amount"], wed["ccy"],
       "Plan item added · Sister's wedding, £20,000 in Mar 2027", "r-1298"),
    ev("e-wedding-cover", "2026-11-05T21:17", "arun", "plan", "plan_add", "wedding_cover", "amount", None, FP["evening2"]["wedding"]["applied"]["option"] and 19871, "GBP",
       "Plan item added · Balanced (ISA) pays the wedding's shortfall, £19,871 in Jun 2027", "r-1299", how="in the chat · Undo"),
    ev("e-wedding-undo", "2026-11-05T21:18", "arun", "plan", "undo", "wedding_cover", "amount", 19871, None, "GBP",
       "Undone · Balanced (ISA) paying the wedding's shortfall", "r-1300"),
]

# Fri 6 Nov: the Admin center (Browser Admin center 2 and 3; times as drawn there)
EVENTS += [
    ev("e-fresh-1", "2026-11-06T08:28", "arun", "admin", "fresh_check", None, None, None, None, None,
       "Fresh check with passkey · good until 08:33", None, how="Passed"),
    ev("e-approve-cr26", "2026-11-06T08:29", "arun", "admin", "admin_approve", "cr-26", "decision", "waiting", "approved", None,
       "Approved · Promote the risk model v8 over v7 · cr-26 · passkey", "r-1314"),
    ev("e-replay", "2026-11-06T08:30", "arun", "admin", "admin_replay", "mypaisa-prod-work", "dead_letters", 1, 0, None,
       "Replayed 1 job · Ingest, NASDAQ 100 ETF · mypaisa-prod-work", "r-1315"),
    ev("e-ceiling", "2026-11-06T08:31", "arun", "admin", "admin_ceiling", "prod_ceiling", "usd", 160, 50, "USD",
       "Prod Claude ceiling $160 → $50", "r-1316"),
    ev("e-fresh-fail", "2026-11-06T09:36", "arun", "admin", "fresh_check_failed", None, None, None, None, None,
       "Fresh check with Google · Google signed in s\u2022\u2022\u2022@gmail.com, not your account. Nothing was changed.", None, how="Failed"),
    ev("e-fresh-2", "2026-11-06T09:38", "arun", "admin", "fresh_check", None, None, None, None, None,
       "Fresh check with passkey", None, how="Passed"),
    ev("e-pause-asha", "2026-11-06T09:40", "arun", "admin", "admin_pause", "asha", "status", "active", "paused", None,
       "Paused Asha's account · signed out everywhere: 2 sessions ended", "r-1317", target="asha"),
    ev("e-restore-asha", "2026-11-06T10:05", "arun", "admin", "admin_restore", "asha", "status", "paused", "active", None,
       "Restored Asha's account · she signs in again on each device, Face ID or her PIN first", "r-1318", target="asha"),
]

# branches: boards' side paths that are not on the main path, kept so a click that leaves it has its rows
BRANCH_EVENTS = {
    "b-emi-undo": [ev("e-emi-undo", "2026-11-05T09:13", "arun", "check_in", "check_in_undo", "hdfc", "emi", round(DEBTS["hdfc"]["payment"]), None, "INR",
                      "Undone · EMI · HDFC home loan · the payment is reversed by a new event; both stay in the audit log", "r-b1", how="on the check-in")],
    "b-paid-off": [ev("e-hdfc-closed", "2026-11-05T09:22", "arun", "check_in", "debt_close", "hdfc", "balance", 1523976, 0, "INR",
                      "Loan closed · HDFC home loan · paid off ₹15,23,976, Thu 5 Nov", "r-b2", how="on the check-in")],
}

# ---------------------------------------------------------------- runs
COST = {}  # filled by runs


def calls(model, n, tokens_in, tokens_out, cached, cost):
    """n model calls adding exactly to the totals (an illustrative split of a board's totals)."""
    each = round(cost / n, 6)
    out = []
    for i in range(n):
        out.append({"model": model, "in": tokens_in // n + (tokens_in % n if i == 0 else 0), "out": tokens_out // n + (tokens_out % n if i == 0 else 0),
                    "cached": cached // n + (cached % n if i == 0 else 0), "cost_usd": each if i else round(cost - each * (n - 1), 6)})
    return out


def run(id, at, trigger, title, steps, mc=None, tools=None, status="done", actor=None, agent=None, duration_s=None, outcome="", illustrative=True, **extra):
    mc = mc or []
    r = {"id": id, "at": at if at.count(":") == 2 else at + ":00", "trigger": trigger, "title": title, "status": status,
         "actor": actor, "agent": agent, "duration_s": duration_s,
         "steps": [{"at": s[0], "label": s[1]} for s in steps], "model_calls": mc,
         "tools": [{"name": t[0], "ms": t[1]} for t in (tools or [])],
         "cost_usd": round(sum(c["cost_usd"] for c in mc), 6), "events": [], "outcome": outcome}
    if illustrative:
        r["illustrative"] = True
    r.update(extra)
    return r


S = "Sonnet 5.5"
RUNS = [
    # d0: the runs behind the Sunday rows (steps illustrative; the rows and times are the boards')
    run("r-1196", "2026-10-25T10:02:40", "chat", 'Chat · Arun, 10:02 · "Fixed deposit in SBI"',
        [("10:02:40", "Arun wrote the FD sentence."), ("10:02:55", "draft_record typed the draft; whose and the interest option asked."), ("10:03:12", "Arun tapped Confirm; the record, its first event and the audit row were saved.")],
        calls(S, 3, 3800, 520, 20000, 0.031), [("draft_record", 85), ("ask_user", 20), ("propose_change", 105)], actor="arun", agent="concierge", duration_s=32),
    run("r-1197", "2026-10-25T20:08:30", "chat", "Chat · Arun, 20:08 · the home extension", [("20:08:30", "Arun asked for a £35,000 extension next June."), ("20:09:05", "Confirm saved the plan item.")],
        calls(S, 2, 2600, 380, 9000, 0.018), [("propose_plan_item", 90)], actor="arun", agent="concierge", duration_s=35),
    run("r-1198", "2026-10-25T20:11:30", "chat", "Chat · Arun, 20:11 · replace the car", [("20:11:30", "Arun asked for a new car around June 2031."), ("20:12:04", "Confirm saved the plan item.")],
        calls(S, 2, 2500, 360, 9000, 0.017), [("propose_plan_item", 88)], actor="arun", agent="concierge", duration_s=34),
    run("r-1199", "2026-10-25T20:14:30", "chat", "Chat · Arun, 20:14 · Asha's bonus", [("20:14:30", "Arun asked to add Asha's bonus."), ("20:15:03", "Confirm saved the plan item.")],
        calls(S, 2, 2700, 400, 9500, 0.019), [("propose_plan_item", 92)], actor="arun", agent="concierge", duration_s=33),
    # d1, as the Prototype v4 Activity page lists them
    run("r-1228", "2026-10-26T01:00:00", "schedule", "Nightly views", [("01:00:00", "Trigger: the nightly schedule."), ("01:00:21", "Net worth, the budget month and what is due, rebuilt from the events.")], duration_s=21, outcome="Done"),
    run("r-1229", "2026-10-26T07:00:00", "schedule", "Prices", [("07:00:00", "Trigger: the 07:00 schedule."), ("07:00:09", "6 of 6 priced at the Fri 23 Oct close, and the ECB rate.")], duration_s=9, outcome="Done"),
    run("r-1232", "2026-10-26T08:12:00", "chat", "Chat · Asha", [("08:12:00", "Asha wrote to MyPaisa; her words stay hers."), ("08:12:07", "get_commitments read the views.")],
        calls(S, 2, 2500, 500, 6000, 0.019), [("get_commitments", 40)], actor="asha", agent="concierge", duration_s=7, outcome="Done"),
    run("r-1233", "2026-10-26T09:00:00", "check_in", "Check-ins", [("09:00:00", "Trigger: the 09:00 check-ins."), ("09:00:02", "1 card, 2 valuations (Home, Reading and Flat, Pune); sent with push, no amount.")], duration_s=2, outcome="Done"),
    run("r-1235", "2026-10-26T09:40:12", "chat", 'Chat · Arun, 09:40 · "£5,000 in Monzo savings"',
        [("09:40:12", "Trigger: Arun wrote \"£5,000 in Monzo savings\"."),
         ("09:40:15", "draft_record: code typed the draft against the savings account kind: Monzo, £5,000 in pounds, UK, instant access. Missing: whose."),
         ("09:40:16", "ask_user: \"Whose is it?\" with Arun, Asha and Joint."), ("09:40:58", "Answer: Arun tapped his own name."),
         ("09:41:01", "propose_change: the draft, hashed and held, owner Arun, all of it. The Confirm card went to the chat."),
         ("09:41:20", "Confirm: Arun tapped Confirm. The write service checked the hash, then saved the record, its first event and the audit row."),
         ("09:41:20", "Stream: records.changed went out; Home moved at every door.")],
        [{"model": S, "label": "drafted", "in": 2310, "cached": 6120, "out": 196, "ms": 2500, "cost_usd": 0.012},
         {"model": S, "label": "asked whose", "in": 410, "cached": 8430, "out": 92, "ms": 1200, "cost_usd": 0.005},
         {"model": S, "label": "proposed", "in": 1060, "cached": 8840, "out": 238, "ms": 2600, "cost_usd": 0.009}],
        [("draft_record", 80), ("ask_user", 20), ("propose_change", 110)], actor="arun", agent="concierge", duration_s=68,
        outcome="Saved · audit row 09:41 · nothing retried", illustrative=False, source="Prototype v4 (prototype-v4-pages.js, the run page)"),
    run("r-1236", "2026-10-26T09:41:21", "event", "Views", [("09:41:21", "Rebuilt after the new record; Home moved at every door.")], duration_s=2, outcome="Done"),
    run("r-1237", "2026-10-26T09:43:00", "chat", 'Chat · Arun · "What can we get at quickly now?"', [("09:43:00", "Arun asked what he can get at quickly."), ("09:43:06", "get_networth read the liquid view.")],
        calls(S, 2, 2300, 600, 7000, 0.022), [("get_networth", 35)], actor="arun", agent="concierge", duration_s=6, outcome="Done"),
    run("r-1238", "2026-10-26T09:52:00", "event", "Views", [("09:52:00", "Rebuilt after the correction to Home, Reading; Home moved at every door.")], duration_s=2, outcome="Done"),
    run("r-1239", "2026-10-26T10:20:00", "chat", "Chat · Arun · what if £60,000 down on a second flat in June 2028",
        [("10:20:00", "Arun asked the what-if."), ("10:20:09", "run_projection ran the override; nothing saved.")],
        calls(S, 3, 3300, 700, 12000, 0.034), [("run_projection", 1400)], actor="arun", agent="concierge", duration_s=11, outcome="Done, not saved"),
    run("r-1241", "2026-10-26T10:40:00", "event", "Views", [("10:40:00", "Rebuilt after Arun's salary growth went from 4.17% to 4.8%; the Projection ran again.")], duration_s=3, outcome="Done"),
    run("r-1242", "2026-10-26T10:44:00", "event", "Views", [("10:44:00", "Rebuilt after Asha's bonus growth went from none to 3.5% a year; the Projection ran again.")], duration_s=3, outcome="Done"),
    # d2
    run("r-1262", "2026-11-01T08:40:00", "statement", "Chat · Arun · October's statements",
        [("08:40:00", "Arun attached barclaycard-2026-11-01.pdf and monzo-2026-10.csv."), ("08:40:04", "Each file kept for good before anything reads it."),
         ("08:40:20", "extract_document read both: 22 lines, 5 recognised, 2 amber (AMZN Mktp, PAYPAL *EBAY)."), ("08:44:00", "Arun picked Shopping and Other, then tapped Confirm; the statements, the car loan's EMI and the card's £1,458 were saved.")],
        calls(S, 4, 9200, 1300, 30000, 0.052), [("extract_document", 2200), ("propose_change", 120)], actor="arun", agent="concierge", duration_s=240, outcome="Saved · audit rows 08:44"),
    run("r-1263", "2026-11-01T09:00:00", "check_in", "Check-ins · close October's budget", [("09:00:00", "Trigger: the month-end check-in, \"Anything not on a statement?\""), ("09:02:00", "Arun tapped Nothing else; October closed.")], duration_s=2, outcome="Closed"),
    run("r-1264", "2026-11-01T09:03:00", "event", "Projection · R0", [("09:03:00", "The engine ran the Projection after October closed (future-plans-v4 R0).")], duration_s=40, outcome="Done"),
    # d3
    run("r-1280", "2026-11-05T09:00:00", "check_in", "Check-ins · HDFC home loan EMI", [("09:00:00", "Trigger: the 09:00 check-in, \"Was November's EMI of ₹39,390 paid?\""), ("09:12:00", "Arun tapped Paid; saved with Undo.")], duration_s=2, outcome="Saved"),
    run("r-1281", "2026-11-05T09:12:05", "event", "Views", [("09:12:05", "Rebuilt after the EMI; Home moved at every door."), ("09:13:00", "The engine's run R5N: the same figures as R0, the EMI was already in November's flows.")], duration_s=3, outcome="Done"),
    run("r-1283", "2026-11-05T10:20:00", "chat", "Chat · Arun · what if £60,000 down on a second flat in June 2028",
        [("10:20:00", "Arun asked the what-if."), ("10:20:09", "run_projection ran it; Arun cancelled the plan item, nothing saved.")],
        calls(S, 3, 3300, 700, 12000, 0.034), [("run_projection", 1400)], actor="arun", agent="concierge", duration_s=11, outcome="Done, not saved"),
    run("r-1284", "2026-11-05T10:26:00", "chat", "Chat · Asha · the same what-if", [("10:26:00", "Asha asked the what-if; every edit control is hidden for her."), ("10:26:08", "run_projection ran it for her; unsaved.")],
        calls(S, 3, 3200, 650, 11500, 0.031), [("run_projection", 1350)], actor="asha", agent="concierge", duration_s=10, outcome="Done, not saved"),
    # d3e, future-plans-v4 runs R1 to R7 and the wedding
    run("r-1290", "2026-11-05T20:41:00", "chat", "Chat · Arun · school fees", [("20:41:00", "Arun: £4,000 a month from Jan 2029 for my kid's schooling."), ("20:41:30", "Three questions answered: until Jul 2041, 4.5% a year, the monthly budget."), ("20:43:00", "Confirm saved the plan item; the engine ran R1.")],
        calls(S, 3, 4200, 800, 16000, 0.041), [("propose_plan_item", 95), ("run_projection", 1500)], actor="arun", agent="concierge", duration_s=140, outcome="Saved"),
    run("r-1291", "2026-11-05T20:43:30", "chat", "Chat · Arun · cover the school fees (option 1)", [("20:43:30", "MyPaisa showed three ways to cover the gap."), ("20:46:00", "Arun confirmed option 1: the pot and November's budget change; the engine ran R2.")],
        calls(S, 2, 2900, 500, 11000, 0.018), [("propose_plan_item", 95)], actor="arun", agent="concierge", duration_s=150, outcome="Saved"),
    run("r-1292", "2026-11-05T20:52:00", "chat", "Chat · Arun · salary to £5,500 from Sep 2028", [("20:52:00", "Arun asked for the salary step."), ("20:53:00", "Confirm saved it; the engine ran R3.")],
        calls(S, 2, 3000, 500, 11000, 0.022), [("propose_plan_item", 90)], actor="arun", agent="concierge", duration_s=60, outcome="Saved"),
    run("r-1293", "2026-11-05T20:58:00", "chat", "Chat · Arun · close HDFC with the SBI FD", [("20:58:00", "Arun asked to close the HDFC loan with the SBI FD when it matures."), ("20:59:00", "Confirm saved it; the engine ran R4.")],
        calls(S, 3, 3900, 700, 15000, 0.036), [("propose_plan_item", 100), ("run_projection", 1450)], actor="arun", agent="concierge", duration_s=62, outcome="Saved"),
    run("r-1294", "2026-11-05T21:08:00", "event", "Views · Replace the car paused", [("21:08:00", "Engine run R5 after the pause.")], duration_s=40, outcome="Done"),
    run("r-1295", "2026-11-05T21:09:00", "event", "Views · Replace the car resumed", [("21:09:00", "Engine run R5b after the resume.")], duration_s=40, outcome="Done"),
    run("r-1296", "2026-11-05T21:11:00", "event", "Views · School fees' end corrected", [("21:11:00", "Engine run R6 after the correction.")], duration_s=40, outcome="Done"),
    run("r-1297", "2026-11-05T21:13:00", "event", "Views · Replace the car ended", [("21:13:00", "Engine run R7 after the end.")], duration_s=40, outcome="Done"),
    run("r-1298", "2026-11-05T21:15:00", "chat", "Chat · Arun · the sister's wedding", [("21:15:00", "Arun: £20,000 for my sister's wedding in Mar 2027."), ("21:16:00", "Confirm saved it; code flagged cash below zero from Jun 2027 and MyPaisa offered three ways to cover it.")],
        calls(S, 3, 4100, 750, 15500, 0.039), [("propose_plan_item", 95), ("run_projection", 1500)], actor="arun", agent="concierge", duration_s=60, outcome="Saved"),
    run("r-1299", "2026-11-05T21:16:30", "chat", "Chat · Arun · cover the wedding from Balanced (ISA)", [("21:16:30", "Arun chose the first way."), ("21:17:00", "Confirm saved the cover.")],
        calls(S, 1, 1800, 300, 6000, 0.008), [("propose_plan_item", 90)], actor="arun", agent="concierge", duration_s=30, outcome="Saved"),
    run("r-1300", "2026-11-05T21:18:00", "event", "Views · the cover undone", [("21:18:00", "Undo wrote a reversal; cash is flagged again; the wedding stays saved.")], duration_s=3, outcome="Done"),
    # d4: background agents and the Admin desk
    run("r-1310", "2026-11-06T03:00:00", "schedule", "News scout · 03:00", [("03:00:00", "Trigger: the 03:00 schedule."), ("03:12:00", "The per-run guard stopped the run at 8 calls; no heartbeat since 03:12.")],
        calls("Haiku 4.5", 8, 9000, 1500, 20000, 0.096), [("web_fetch", 900)], status="failed", agent="news_scout", duration_s=720, outcome="Stopped at the 8-call guard"),
    run("r-1311", "2026-11-06T06:30:00", "schedule", "Forecaster · the daily run", [("06:30:00", "Trigger: the daily run; it timed out once."), ("06:35:00", "Retried; finished on the second try.")],
        calls(S, 2, 3000, 600, 9000, 0.034), [("run_projection", 1400)], agent="forecaster", duration_s=300, outcome="Done on the second try"),
    run("r-1312", "2026-11-06T06:40:00", "schedule", "Grader and tuner · daily grading", [("06:40:00", "Trigger: the daily grading."), ("06:40:30", "Asked the owner to promote the risk model v8 over v7 (cr-26).")],
        calls(S, 2, 3400, 700, 10000, 0.041), [("propose_change", 100)], agent="grader_tuner", duration_s=30, outcome="Asked you"),
    run("r-1313", "2026-11-06T07:00:00", "schedule", "Ingest · NASDAQ 100 ETF", [("07:00:00", "Trigger: the 07:00 ingest."), ("07:52:00", "Timed out at the source 5 times; the job went to the dead-letter queue.")],
        status="failed", agent="data_steward", duration_s=3120, outcome="In the dead-letter queue", tries=5),
    run("r-1314", "2026-11-06T08:29:00", "admin", "Admin desk · approve cr-26", [("08:29:00", "Arun approved: promote the risk model v8 over v7 (passkey).")], agent="admin_desk", duration_s=1, outcome="Approved"),
    run("r-1315", "2026-11-06T08:30:00", "admin", "Ops warden · replay the dead-letter queue", [("08:30:00", "Arun tapped Replay; the fresh check named the queue and the count."), ("08:30:20", "The job ran: the NASDAQ 100 ETF is priced.")],
        status="replayed", agent="ops_warden", duration_s=20, outcome="Replayed 1 job; it ran"),
    run("r-1316", "2026-11-06T08:31:00", "admin", "Admin desk · move the prod ceiling", [("08:31:00", "Arun moved the prod Claude ceiling from $160 to $50; it takes effect on the next model call.")], agent="admin_desk", duration_s=1, outcome="Done"),
    run("r-1317", "2026-11-06T09:40:00", "admin", "Admin desk · pause Asha", [("09:40:00", "Arun paused Asha: signed out everywhere, 2 sessions ended; she and he were told.")], agent="admin_desk", duration_s=1, outcome="Paused"),
    run("r-1318", "2026-11-06T10:05:00", "admin", "Admin desk · restore Asha", [("10:05:00", "Arun restored Asha; she signs in again on each device.")], agent="admin_desk", duration_s=1, outcome="Restored"),
]
BRANCH_RUNS = {
    "b-emi-undo": [run("r-b1", "2026-11-05T09:13:00", "check_in", "Check-ins · Undo the EMI", [("09:13:00", "Arun tapped Undo; a reversal event was written, the card opened again.")], duration_s=2, outcome="Undone")],
    "b-paid-off": [run("r-b2", "2026-11-05T09:19:00", "check_in", "Check-ins · HDFC paid off in full", [("09:19:00", "Something else: Paid off in full."), ("09:20:00", "Final amount: the engine's figure."), ("09:21:00", "Paid on Today."), ("09:22:00", "Confirm closed the loan; its check-ins ended.")], duration_s=180, outcome="Loan closed")],
}

# ---------------------------------------------------------------- files
csv_rows = ["date,description,amount_gbp"] + [f"{l['date']},{l['merchant']},{l['amount_gbp']}" for l in monzo["spend_lines"]] + \
           [f"{l['date']},{l['what']},{l['amount_gbp']}" for l in monzo["recognised"]]
CSV_LINES = len(csv_rows) - 1
FILES = [
    {"id": "f-barclay", "name": "barclaycard-2026-11-01.pdf", "kind": "pdf", "bytes": 486 * 1024, "pages": 4, "received_at": "2026-11-01T08:40:00", "from": "arun", "via": "chat",
     "statement": "barclaycard_nov", "events": [], "source": "Prototype v4 'PDF · 4 pages · 486 KB' (486 KB read as 486 x 1024 bytes)", "lines": len(STM["barclaycard_nov"]["lines"])},
    {"id": "f-monzo", "name": "monzo-2026-10.csv", "kind": "csv", "bytes": len("\n".join(csv_rows).encode()) + 1, "bytes_illustrative": True, "received_at": "2026-11-01T08:40:05", "from": "arun", "via": "chat",
     "statement": "monzo_current_oct", "events": [], "source": "Prototype v4 'CSV · 11 lines'; its size is the CSV the household's own lines make", "lines": CSV_LINES},
]

# ---------------------------------------------------------------- members
MEMBERS = [
    {"id": "arun", "name": "Arun", "role": "owner", "sign_in": ["apple", "google", "passkey"], "joined": "2026-09-04", "status": "active",
     "sign_in_since": {"apple": "2026-09-04", "google": "2026-10-12"},
     "devices": [
         {"id": "d-arun-iphone", "name": "Arun's iPhone", "model": "iPhone 17 Pro", "kind": "iphone", "last_seen": "2026-11-06T09:40", "since": "2026-09-04"},
         {"id": "d-arun-ipad", "name": "Arun's iPad", "model": "iPad Air", "kind": "ipad", "last_seen": "2026-11-06T07:20"},
         {"id": "d-arun-mac", "name": "Chrome on MacBook Air", "kind": "browser", "last_seen": "2026-11-06T10:05", "where": "London, UK"}]},
    {"id": "asha", "name": "Asha", "role": "member", "sign_in": ["apple", "google"], "joined": "2026-09-06", "status": "active",
     "devices": [
         {"id": "d-asha-iphone", "name": "Asha's iPhone", "model": "iPhone 16", "kind": "iphone", "last_seen": "2026-11-06T08:02"},
         {"id": "d-asha-ipad", "name": "Asha's iPad", "model": "iPad mini", "kind": "ipad", "last_seen": "2026-11-03T19:10", "illustrative": True}]},
]

# ---------------------------------------------------------------- spend
RENEWAL_DAY = 3
CEIL0, CEIL1 = 160, 50
STEPS = [70, 85, 95, 100]


def cycle_start(d: str) -> str:
    y, m, dd = map(int, d[:10].split("-"))
    if dd < RENEWAL_DAY:
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return f"{y:04d}-{m:02d}-{RENEWAL_DAY:02d}"


def spent(until: str, cyc: str, key=None) -> float:
    return round(sum(r["cost_usd"] for r in RUNS if r["at"] <= until and cycle_start(r["at"]) == cyc and (key is None or key(r))), 6)


MON_BOARD_SPEND = 18.00  # Prototype v4 Activity "Claude this cycle $18" at Mon 26 Oct 09:53 (iPhone admin: "$18 of $160 · 11%")
MON_AT = "2026-10-26T09:53:00"
base1 = round(MON_BOARD_SPEND - spent(MON_AT, "2026-10-03"), 6)  # cycle 1's spend before the first run listed here
ADM_AT = "2026-11-06T08:28:00"


def snap(as_of, clock, cyc, base, ceiling):
    s = round(base + spent(as_of, cyc), 6)
    return {"as_of": as_of, "clock": clock, "cycle_start": cyc, "base_before_first_listed_run_usd": base, "runs_usd": spent(as_of, cyc), "spent_usd": s,
            "ceiling_usd": ceiling, "pct": round(100 * s / ceiling), "gbp_spent": round(s / USD_PER_GBP), "gbp_ceiling": round(ceiling / USD_PER_GBP)}


SNAP_MON = snap(MON_AT, "d1 09:53, Prototype v4's Activity page", "2026-10-03", base1, CEIL0)
SNAP_ADM = snap(ADM_AT, "d4 08:28, the Admin center's fresh check", cycle_start(ADM_AT), 0.0, CEIL0)


def step_for(s, ceil):
    p = 100 * s / ceil
    return "Normal, under 70%" if p < 70 else "A heads-up" if p < 85 else "Savers" if p < 95 else "Essentials only" if p < 100 else "Templates only"


AGENT_SHARE = [("concierge", "Concierge", "The chat, cards, briefs", 55), ("forecaster", "Forecaster explanations", "", 10), ("news_scout", "News scout", "", 10),
               ("grader_tuner", "Grader and tuner reviews", "", 10), ("admin_desk", "Admin desk", "", 5), ("data_steward", "Data steward and ops warden", "", 5), ("reserve", "Reserve, the chat first", "", 5)]


def agent_spend(key):
    ids = {"data_steward": ("data_steward", "ops_warden")}.get(key, (key,))
    return spent(ADM_AT, SNAP_ADM["cycle_start"], lambda r: r["agent"] in ids)


def after_move(s, new):
    return {"spent_usd": s, "pct_of_new": round(100 * s / new, 1), "step": step_for(s, new), "steps_usd": [round(new * p / 100, 2) for p in STEPS],
            "member_share_usd": round(new * 0.6, 2), "daily_guard_usd": round(3 * new / 30, 2)}


ADMIN = {
    "about": "Admin center data on the demo's Fri 6 Nov (08:28 to 10:05). Spend is the ledger's own runs; every other figure is transcribed from Browser Admin center 2 and 3 and iPhone admin, with Telegram replaced by push (the web app is the spec).",
    "spend": {
        "clock": "d4 08:28, before the ceiling moved at 08:31",
        "cycle": {"renewal_day": RENEWAL_DAY, "start": SNAP_ADM["cycle_start"], "next_renewal": "2026-12-03", "credit_usd": 200, "hard_limit_usd": {"prod": 200, "dev": 200},
                  "console_limits_usd": {"prod": CEIL0, "dev": 40}, "auto_reload": False, "source": "iPhone admin 'renews Tue 3 Nov' and Prototype Activity 'renews 3 Nov'"},
        "snapshots": [SNAP_MON, SNAP_ADM],
        "usd_per_gbp": USD_PER_GBP,
        "prod": {**SNAP_ADM, "step": step_for(SNAP_ADM["spent_usd"], CEIL0), "steps_pct": STEPS, "steps_usd": [CEIL0 * p / 100 for p in STEPS]},
        "dev": {"spent_usd": 6.10, "ceiling_usd": 40, "pct": 15, "illustrative": True, "source": "Admin center 2 and 3 (dev serves synthetic data; its runs are not in this ledger)"},
        "members": [
            {"id": "arun", "spent_usd": spent(ADM_AT, SNAP_ADM["cycle_start"], lambda r: r["actor"] == "arun"), "share_pct": 60, "share_usd": CEIL0 * 0.6},
            {"id": "asha", "spent_usd": spent(ADM_AT, SNAP_ADM["cycle_start"], lambda r: r["actor"] == "asha"), "share_pct": 60, "share_usd": CEIL0 * 0.6},
            {"id": "household_jobs", "spent_usd": spent(ADM_AT, SNAP_ADM["cycle_start"], lambda r: r["actor"] is None), "note": "no member's share"}],
        "agents": [{"id": k, "name": n, "share_pct": p, "ceiling_usd": CEIL0 * p / 100, "spent_usd": agent_spend(k)} for k, n, _, p in AGENT_SHARE],
        "guards": {"member_share_pct": 60, "daily_multiple": 3, "daily_guard_usd": round(3 * CEIL0 / 30, 2), "today_usd": spent(ADM_AT, "2026-11-03", lambda r: r["at"][:10] == "2026-11-06"), "run_calls": 8},
        "ladder": [{"pct": 70, "name": "A heads-up", "does": "One message to you: what is spent, on what, and the days left. Nothing changes."},
                   {"pct": 85, "name": "Savers", "does": "No bull and bear debate, the Saturday review on Sonnet, three Why? searches a day, sentiment scoring paused."},
                   {"pct": 95, "name": "Essentials only", "does": "Chat on Haiku; the brief, the wrap and alerts as plain templates with the engine's numbers."},
                   {"pct": 100, "name": "Templates only", "does": "Claude stops until the renewal or until you raise the ceiling; buttons and guided flows still work."}],
        "after_ceiling_move": {"event": "e-ceiling", "from_usd": CEIL0, "to_usd": CEIL1, **after_move(SNAP_ADM["spent_usd"], CEIL1),
                               "tells": "an audit row and a push to you", "takes_effect": "the next model call"},
        "refused_example": {"asked_usd": 220, "why": "above prod's hard limit, $200; nothing changes", "source": "iPhone admin 'Above the hard limit: refused'"},
    },
    "aws_cap": {"cap_gbp": 50, "range_gbp": [10, 75], "spent_gbp": 3, "pct": 6, "forecast_gbp": 3.20, "steps": [{"pct": 50, "gbp": 25, "does": "You are told; also when the month's forecast passes the cap."},
                {"pct": 80, "gbp": 40, "does": "Dev's schedules pause."}, {"pct": 100, "gbp": 50, "does": "Dev pauses; prod's back-fills, retraining and challengers pause."}],
                "never_stops": "the brief, alerts and the chat", "flags": "none set", "backstop": "AWS Budgets at £75, made by Terraform, shown not editable",
                "paid_feeds": [{"name": "EODHD Historian", "gbp_month": 19.99, "request": "cr-27", "from": "2026-12-01", "illustrative": True}],
                "source": "iPhone admin '£3 of £50 · 6%', 'Forecast £3.20'; Admin center 2 and 3 steps"},
    "alerts": {
        "channels": ["app", "push", "email"],
        "rows": [
            {"id": "a-incident-news", "kind": "incident", "title": "Incident · the news scout is silent", "severity": "critical", "at": "2026-11-06T06:12", "status": "open", "run": "r-1310",
             "sent": "App, push (it rang through quiet hours) and email."},
            {"id": "a-approval-cr26", "kind": "approval", "title": "Approval waiting · Promote the risk model v8 over v7?", "severity": "waiting", "at": "2026-11-06T06:40", "status": "closed at 08:29 by e-approve-cr26",
             "expires": "2026-11-13T06:40", "run": "r-1312", "sent": "App at once; push in tonight's digest; no email, as it is not critical."},
            {"id": "a-failed-work", "kind": "failed_work", "title": "Failed work · prod", "severity": "needs_you", "at": "2026-11-06T07:52", "status": "replayed at 08:30 by e-replay", "run": "r-1313",
             "queue": "mypaisa-prod-work", "count": 1, "oldest": "36 min, since 07:52 (at 08:28)", "reason": "Timeout at the source", "job": "Ingest, NASDAQ 100 ETF", "tried": "5 times, 07:00 to 07:52",
             "effect": "Until it runs, the NASDAQ 100 ETF shows Thursday's close, marked stale."},
            {"id": "a-feed-silver", "kind": "feed_stale", "title": "Data feed stale · Physical Silver", "severity": "closed", "at": "2026-11-05T21:31", "status": "closed",
             "d": "yfinance was late; the chain failed over to FT at 21:40. Fixed on its own."}],
        "routing": [{"kind": "A Claude or AWS step; the forecast over the cap", "severity": "Critical at 100% and over the cap", "app": "all", "push": "all", "email": "all"},
                    {"kind": "An incident; an approval waiting", "severity": "Incidents are critical", "app": "all", "push": "all", "email": "critical"},
                    {"kind": "Failed work; a data feed stale", "severity": "Never critical", "app": "all", "push": "all", "email": "off"},
                    {"kind": "Holding alerts", "severity": "Each member's own", "app": "own", "push": "own", "email": "off"}],
        "quiet_hours": {"from": "22:00", "to": "07:00", "channels": ["push", "email"], "critical_breaks_through": True},
        "cooldown_hours": 6, "cooldown_note": "Failed work: once per queue until it is replayed.",
        "digest": {"at": "19:00", "where": "the app, by push", "holds": "non-urgent alerts, waiting requests, what the system fixed on its own"},
        "email": {"topic": "mypaisa-prod-admin-alerts", "to": "y\u2022\u2022\u2022@gmail.com", "free_per_month": 1000},
        "red_alerts_per_week_each": 2,
        "queues": [{"name": "mypaisa-prod-outbox.fifo", "tries": 5, "backoff": "as long as the sender's retry-after asks"},
                   {"name": "mypaisa-prod-work", "tries": 5, "backoff_s": [30, 1800], "carries": "each ingest, news feed, document read, the engine, each brief"}],
        "source": "Browser Admin center 2 and 3 (Alerts), iPhone admin (alerts); dates moved to the demo's Fri 6 Nov"},
    "approvals": [
        {"id": "cr-26", "from": "Grader and tuner", "title": "Promote the risk model v8 over v7?", "kind": "approval", "created": "2026-11-06T06:40", "expires": "2026-11-13T06:40", "cost": "none", "risk": "low",
         "why": "v8 beats v7 in the held-out years and over 8 live weeks, by more than the margin.", "undo": "v7 stays ready and comes back on its own if v8 slips.",
         "status": "approved", "decided": {"at": "2026-11-06T08:29", "by": "arun", "how": "passkey", "event": "e-approve-cr26"}},
        {"id": "q-isin", "from": "Data steward", "title": "Which is the Monzo Balanced fund's ISIN?", "kind": "question", "created": "2026-11-05T18:20", "status": "waiting"},
        {"id": "cr-27", "from": "Data steward", "title": "Switch on EODHD Historian at £19.99 a month", "kind": "approval", "status": "approved", "decided": {"at": "2026-11-06T08:05", "by": "arun", "how": "Face ID", "event": None}, "illustrative": True},
        {"id": "cr-22", "from": "News scout", "title": "Add a Reddit forum as a news feed", "kind": "approval", "status": "rejected", "decided": {"at": "2026-11-03", "by": "arun", "how": "in the app", "event": None, "not_again_before": "2026-12-03"}, "illustrative": True}],
    "agents": [
        {"id": "concierge", "name": "Concierge", "job": "Talks to members; routes your instructions", "heartbeat": "2026-11-06T08:27", "last": "2026-11-06T08:21", "status": "running"},
        {"id": "data_steward", "name": "Data steward", "job": "Keeps prices flowing from free sources", "heartbeat": "2026-11-06T08:26", "last": "2026-11-06T08:10", "status": "running"},
        {"id": "news_scout", "name": "News scout", "job": "Collects news, matches it to holdings", "heartbeat": "2026-11-06T03:12", "last": "2026-11-06T03:00", "status": "incident"},
        {"id": "analyst", "name": "Analyst", "job": "The rules engine", "heartbeat": "2026-11-06T08:25", "last": "2026-11-05T21:20", "status": "running", "model": "none"},
        {"id": "forecaster", "name": "Forecaster", "job": "The risk and return models", "heartbeat": "2026-11-06T08:25", "last": "2026-11-06T06:30", "status": "running"},
        {"id": "grader_tuner", "name": "Grader and tuner", "job": "Grades daily, calibrates within bounds", "heartbeat": "2026-11-06T08:24", "last": "2026-11-06T06:40", "status": "asked you"},
        {"id": "ops_warden", "name": "Ops warden", "job": "Runs the daily pipeline and repairs it", "heartbeat": "2026-11-06T08:27", "last": "2026-11-06T08:20", "status": "running"},
        {"id": "budget_keeper", "name": "Budget keeper", "job": "The meter, the ladder and the guards", "heartbeat": "2026-11-06T08:28", "last": "2026-11-06T08:28", "status": "running", "model": "none"},
        {"id": "admin_desk", "name": "Admin desk", "job": "Between the agents and you", "heartbeat": "2026-11-06T08:27", "last": "2026-11-06T08:05", "status": "running"}],
    "incidents": [{
        "id": "inc-news-scout", "agent": "news_scout", "title": "The news scout is silent", "opened": "2026-11-06T06:12", "status": "open", "run": "r-1310",
        "tried": [{"at": "03:00", "what": "The per-run guard stopped the run at 8 calls, as it should."}, {"at": "05:00", "what": "The ops warden restarted it: it stopped again on the same story."},
                  {"at": "05:30", "what": "Rolled back from v14 to v13, its last good version: stopped again."}, {"at": "06:12", "what": "Raised to you: app, push (it rang through quiet hours) and email."}],
        "choices": [{"id": "skip", "label": "Skip the story", "does": "The story is marked bad and left out. A run costs about $0.05 of the scout's $16."},
                    {"id": "pause", "label": "Pause until Mon", "does": "No news matching until Mon 06:00; stances keep Thursday's events."},
                    {"id": "issue", "label": "Open an issue", "does": "The ops warden files it with the errors attached. Nothing changes in the app."}],
        "fixed_on_its_own": [{"at": "2026-11-05T21:40", "what": "Physical Silver failed over to FT: yfinance was late; the next source in its chain answered."},
                             {"at": "2026-11-06T05:40", "what": "A calibration map rolled back: Silver's map did worse on its probation, so the last good one is back."},
                             {"at": "2026-11-06T06:35", "what": "The Forecaster's run retried: it timed out once at 06:30 and finished on the second try."}]}],
    "dead_letters": [{"queue": "mypaisa-prod-work", "count": 1, "since": "2026-11-06T07:52", "reason": "Timeout at the source", "job": "Ingest, NASDAQ 100 ETF", "tried": "5 times, 07:00 to 07:52",
                      "run": "r-1313", "replayed_by": "e-replay", "count_after": 0,
                      "again": {"note": "Replayed, and failed again (Admin center 3): back to its queue, 5 more tries; nothing replays on its own, so a replay never loops.", "branch_only": True}}],
    "people": [
        {"id": "arun", "role": "owner", "status": "active", "can_be_paused": False, "sessions": 3},
        {"id": "asha", "role": "member", "status": "active", "can_be_paused": True, "sessions": 0, "history": [
            {"event": "e-pause-asha", "status": "paused", "sessions_ended": 2, "devices_signed_out": ["d-asha-iphone", "d-asha-ipad"]},
            {"event": "e-restore-asha", "status": "active", "by": "arun", "note": "only the owner's Restore lets a paused member back in (MA-102, settled 29 Oct 2026)"}]}],
    "invites": [{"role": "member", "single_use": True, "lasts_hours": 24, "source": "iPhone admin, A4 (MA-32)"}],
    "settings_registry": [
        {"group": "Budgets", "name": "Prod Claude ceiling", "key": "budget.claude.prod.ceiling", "value": "$160", "after_events": "$50 at 08:31 (e-ceiling)", "range": "$10 to $160", "mode": "admin"},
        {"group": "Budgets", "name": "Ladder steps", "key": "budget.claude.steps", "value": "70, 85, 95, 100%", "range": "any rising list", "mode": "admin"},
        {"group": "Budgets", "name": "AWS and others cap", "key": "budget.aws.cap", "value": "£50", "range": "£10 to £75", "mode": "admin"},
        {"group": "Data", "name": "Price chain for OEICs", "key": "data.chain.oeic", "value": "EODHD first, 6 sources", "range": "free sources, any order", "band": "one place, 7 days", "mode": "ask"},
        {"group": "Data", "name": "Price chain for London ETFs", "key": "data.chain.lse_etf", "value": "yfinance first, 4 sources", "range": "free sources, any order", "band": "one place, 7 days", "mode": "ask"},
        {"group": "Engine and learning", "name": "Exhaustion flags for PAUSE", "key": "engine.pause.exhaustion_min", "value": "2", "range": "1 to 4", "mode": "tuner"},
        {"group": "Engine and learning", "name": "Calibration maps", "key": "learn.calibration.map", "value": "refitted today 05:40", "band": "±2 points a day", "mode": "auto"},
        {"group": "Engine and learning", "name": "Probation for a new map", "key": "learn.calibration.probation", "value": "10 trading days", "range": "5 to 30", "mode": "admin"},
        {"group": "Alerts and queues", "name": "Red alerts a week, each member", "key": "alerts.red.per_week", "value": "2", "range": "0 to 5", "mode": "admin"},
        {"group": "Alerts and queues", "name": "Work queue tries", "key": "queue.work.max_tries", "value": "5", "range": "1 to 10", "mode": "admin"},
        {"group": "Alerts and queues", "name": "Replays by the ops warden", "key": "queue.replay.max", "value": "3 a message", "range": "0 to 5", "mode": "admin"}],
}

# ---------------------------------------------------------------- jobs (Activity's schedules, as at d4 08:28)
JOBS = [
    {"name": "Nightly views", "last": "2026-11-06T01:00", "next": "2026-11-07T01:00", "status": "ok"},
    {"name": "Prices", "last": "2026-11-06T07:00", "next": "2026-11-06T21:00", "status": "ok"},
    {"name": "Morning brief", "last": "2026-11-06T07:15", "next": "2026-11-09T07:15", "status": "ok", "note": "weekdays; Fri 6 Nov to Mon 9 Nov"},
    {"name": "Check-ins", "last": "2026-11-06T09:00", "next": "2026-11-10T09:00", "status": "ok", "note": "the next due is the Parag Parikh SIP on Tue 10 Nov", "illustrative": True},
    {"name": "Evening wrap", "last": "2026-11-05T21:15", "next": "2026-11-06T21:15", "status": "ok"},
    {"name": "Ingest, NASDAQ 100 ETF", "last": "2026-11-06T07:52", "next": "2026-11-06T08:30", "status": "failed", "note": "in the dead-letter queue until e-replay at 08:30"},
    {"name": "News scout", "last": "2026-11-06T03:00", "next": "2026-11-07T03:00", "status": "late", "note": "stopped at the 8-call guard; silent since 03:12"},
    {"name": "Weekly digest", "last": "2026-10-31T09:00", "next": "2026-11-07T09:00", "status": "ok", "note": "Saturdays"},
]

# ---------------------------------------------------------------- settings (iPhone settings, sign-in; Prototype's privacy switch)
SET_COMMON = {"privacy_mode": False, "show_amounts_in_notifications": False, "face_id_lock": {"on": True, "ask_again_after_minutes": 5},
              "mode": "simple", "base_currency": "GBP", "display_currency_pair": ["GBP", "INR"],
              "notifications": {"brief": "07:15 weekdays", "wrap": "21:15", "red_alerts": "time-sensitive, with sound, at most two a week", "amber": "silent", "weekly_digest": "Saturdays",
                                "quiet_hours": {"from": "22:00", "to": "07:00"}},
              "paused": False}
SETTINGS = {
    "arun": {**SET_COMMON, "household_pause": {"can_pause_or_resume": True, "paused": False}, "admin_center": True, "second_check": "Sign in with Apple, then Face ID",
             "source": "iPhone settings, iPhone sign-in, Prototype v4 'You' page"},
    "asha": {**SET_COMMON, "household_pause": {"can_pause_or_resume": False, "paused": False}, "admin_center": False, "second_check": "Sign in with Apple, then Face ID or her PIN",
             "illustrative": True, "source": "the same screens as Arun's, as a member sees them (iPhone settings: only the owner pauses; a member can leave)"},
}

# ---------------------------------------------------------------- disagreements
DISAGREEMENTS = [
    {"what": "Arun's sign-in methods", "boards": "Prototype v4 'signed in with Apple'; iPhone settings Apple, Google linked 12 Oct, passkey 'Not added'; Admin center 3 passkey 'Yes, on this Mac', Google at 09:30",
     "chosen": "apple + google + passkey: Apple first (Prototype), Google as linked on both v4 boards, passkey as the Admin center's fresh checks need one; the sign-in event is Apple"},
    {"what": "Who pauses whom", "boards": "Admin center 3 draws the owner pausing and restoring their own account (09:50, 10:03)",
     "chosen": "dropped: MA-102's settled answer (29 Oct 2026) is that the owner cannot pause their own account and only the owner's Restore lets a paused member back in; asserted in the script"},
    {"what": "Telegram", "boards": "Browser Admin center 2 and 3 route alerts, approvals and digests through Telegram", "chosen": "push: the Telegram boards are the superseded record (plan-sync.md); channels are app, push, email as iPhone admin has them"},
    {"what": "Cycle spend on Mon 26 Oct", "boards": "Admin center 2 and 3: prod $41.20 of $160 (their own clock, Sat 31 Oct); Prototype v4 and iPhone admin: $18 of $160, 11%",
     "chosen": "$18 at Mon 26 Oct 09:53 (Prototype); the ledger's runs add to a base derived from it; the Admin center's day is Fri 6 Nov, in the next cycle, so its spend is the ledger's runs alone"},
    {"what": "Renewal day", "boards": "Admin center 2: Claude stops 'until 1 Nov'; Admin center 3's dialog offers the 15th; Prototype and iPhone admin: renews Tue 3 Nov", "chosen": "Tue 3 Nov, the 3rd of each month; the 15th is a dialog option, not applied"},
    {"what": "The ceiling move", "boards": "Browser Admin center 2: $160 to $50; iPhone admin: $160 to $180 at 09:40, past the credit", "chosen": "$160 to $50 at 08:31 (the web app's Admin center); the iPhone's $180 and the refused $220 are in admin.spend as examples, not events"},
    {"what": "The Admin center's day", "boards": "Browser Admin center 2 and 3: Sat 31 Oct; iPhone admin: Fri 23 Oct", "chosen": "Fri 6 Nov (iPhone admin's weekday kept; its renewal Tue 3 Nov kept); every Admin date moved to it, expiries kept as '7 days after'"},
    {"what": "Pause time and sessions", "boards": "Admin center 3: paused 09:40, restored 10:05, 3 sessions; iPhone admin: paused 09:38, 2 devices", "chosen": "09:40 and 10:05 (the browser's), 2 sessions (the 4 devices of the v4 boards, so Asha has two)"},
    {"what": "The EMI Undo", "boards": "Prototype v4 main path: Paid at 09:12 and the audit keeps it; Browser Check-ins draws Undo at 09:13", "chosen": "main path as Prototype v4; the Undo row is branch b-emi-undo, with the paid-off-in-full branch b-paid-off (Prototype v4's p1 to p5)"},
    {"what": "Files", "boards": "Audit and files, iPhone audit and activity: balanced-factsheet.pdf, screenshots, cas-statement-sep.pdf (older wealth-era boards)", "chosen": "only the two statements the household story has; the older files belong to no event here"},
    {"what": "Monzo CSV size", "boards": "Prototype v4 says 'CSV · 11 lines' with no size", "chosen": "size computed from the household's own 11 lines (illustrative bytes)"},
    {"what": "School fees' middle path", "boards": "future-plans conversation: -£1,317,000 at 20:43; the Plans in the chat page: -£1,312,000 with the pot", "chosen": "the conversation's wording at 20:43; the pot's row is its own event at 20:46"},
]

# ---------------------------------------------------------------- link events to runs and files
for r in RUNS:
    r["events"] = [e["id"] for e in EVENTS if e["run"] == r["id"]]
for br, rs in BRANCH_RUNS.items():
    for r in rs:
        r["events"] = [e["id"] for e in BRANCH_EVENTS[br] if e["run"] == r["id"]]
for f in FILES:
    f["events"] = [e["id"] for e in EVENTS if e.get("file") == f["id"] or f["id"] in e.get("files", [])]
BRANCHES = [
    {"id": "b-emi-undo", "after": "e-emi-paid", "what": "Undo on the HDFC EMI card (Browser Check-ins K2, 4 of 4: 09:13). A reversal event, never a delete; Home rolls back to the figure before the EMI; Paid saves it again.",
     "events": BRANCH_EVENTS["b-emi-undo"], "runs": BRANCH_RUNS["b-emi-undo"]},
    {"id": "b-paid-off", "instead_of": "e-emi-paid", "what": "Prototype v4's side branch at the 09:00 check-in: Something else, Paid off in full, the engine's figure, Today, Confirm; the loan closes (p1 to p5, 09:04 to 09:22). Taken instead of Paid.",
     "events": BRANCH_EVENTS["b-paid-off"], "runs": BRANCH_RUNS["b-paid-off"]},
]

OUT = {
    "about": "The demo's ledger (MA-290): audit rows, Activity runs, files, sign-ins, devices, the Admin center's data and settings, on household-v4.json's clock. A design aid; every figure is illustrative. "
             "Times carry seconds so no two events tie; a row's minute is the boards'. Events with run null (sign-in, fresh checks) are security-log rows with no run.",
    "clock": {"today": "2026-10-26", "days": [{k: v for k, v in d.items()} for d in DAYS]},
    "members": MEMBERS, "events": EVENTS, "runs": RUNS, "files": FILES, "jobs": JOBS, "admin": ADMIN, "settings": SETTINGS, "branches": BRANCHES,
    "disagreements": DISAGREEMENTS,
}

# ================================================================ asserts, over the data itself
WK = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}


def weekday_ok(txt: str, year=2026):
    m = re.match(r"(\w{3}) (\d{1,2}) (\w{3})", txt)
    d = datetime.strptime(f"{m.group(2)} {m.group(3)} {year}", "%d %b %Y")
    return WK[m.group(1)] == d.weekday() and d.date()


ids = [e["id"] for e in EVENTS]
assert len(set(ids)) == len(ids), "duplicate event ids"
ats = [e["at"] for e in EVENTS]
assert all(a < b for a, b in zip(ats, ats[1:])), "events not in strictly increasing order: " + str([(a, b) for a, b in zip(ats, ats[1:]) if a >= b])
dayby = {d["id"]: d for d in DAYS}
for d in DAYS:
    assert weekday_ok(d["label"]) == date.fromisoformat(d["date"]), f"weekday of {d['label']} is not {d['date']}"
for e in EVENTS + [x for v in BRANCH_EVENTS.values() for x in v]:
    d = dayby[e["day"]]
    assert e["at"][:10] == d["date"], f"{e['id']} day {e['day']} does not match its date"
    assert e["at"][11:16] <= d["last_frame"], f"{e['id']} at {e['at']} is after day {d['id']}'s last frame {d['last_frame']}"
    assert (e["day"] == "d3e") == (e["at"][:10] == "2026-11-05" and e["at"][11:] >= "17:00:00")
    assert e["actor"] in ("arun", "asha")
    for lab in re.findall(r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} \w{3} \d\d:\d\d", e["summary"]):
        assert lab == label(e["at"]), f"{e['id']}: summary time {lab} is not its own"
    assert (e["run"] is None) == (e["kind"] in NO_RUN), f"{e['id']}: run null only for security-log kinds"
runs = {r["id"]: r for r in RUNS}
assert len(runs) == len(RUNS), "duplicate run ids"
files = {f["id"]: f for f in FILES}
evs = {e["id"]: e for e in EVENTS}
for e in EVENTS:
    if e["run"]:
        assert e["run"] in runs, f"{e['id']} names run {e['run']}, which does not exist"
        assert e["id"] in runs[e["run"]]["events"]
        assert runs[e["run"]]["at"] <= e["at"], f"run {e['run']} starts after its event {e['id']}"
    if e["file"]:
        assert e["file"] in files and e["id"] in files[e["file"]]["events"]
    for fid in e.get("files", []):
        assert fid in files
for r in RUNS:
    for x in r["events"]:
        assert x in evs and evs[x]["run"] == r["id"]
    assert abs(r["cost_usd"] - sum(c["cost_usd"] for c in r["model_calls"])) < 1e-9
    assert r["status"] in ("done", "failed", "replayed")
for f in FILES:
    assert f["events"] and all(x in evs for x in f["events"])
for br in BRANCHES:
    for e in br["events"]:
        assert e["run"] in [r["id"] for r in br["runs"]]
    for r in br["runs"]:
        assert all(x in [e["id"] for e in br["events"]] for x in r["events"]) and r["events"]
assert len({r["id"] for r in RUNS} | {r["id"] for b in BRANCHES for r in b["runs"]}) == len(RUNS) + sum(len(b["runs"]) for b in BRANCHES)
# one event per Confirm the figures move on (a Confirm that writes two audit rows shares a group, and says so)
groups = {}
for e in EVENTS:
    if e.get("group"):
        groups.setdefault(e["group"], []).append(e)
assert {k: len(v) for k, v in groups.items()} == {"c-statements": 2, "c-pot": 2}
for k, v in groups.items():
    assert len({x["run"] for x in v}) == 1 and len({x["at"][:16] for x in v}) == 1
single = [e for e in EVENTS if e["kind"] in ("register", "correction", "check_in_paid", "month_close", "plan_add") and not e.get("group")]
assert len({(e["run"], e["kind"]) for e in single}) == len(single), "two events for one Confirm"
# the household's own figures
reg = evs["e-monzo-register"]
assert reg["after"] == NEW["value"] and reg["record"] == NEW["id"] and reg["at"][:16] == NEW["registered"]
cor = evs["e-home-correction"]
assert (cor["before"], cor["after"], cor["record"], cor["field"]) == (COR["from"], COR["to"], COR["record"], COR["field"]) and cor["at"][:16] == COR["at"]
assert evs["e-fd-register"]["after"] == fd["principal"] and fd["ccy"] == "INR"
assert evs["e-statements"]["after"] == 2246, evs["e-statements"]["after"]
assert len(STM["barclaycard_nov"]["lines"]) + len(monzo["spend_lines"]) == 22
assert CSV_LINES == 11 == len(monzo["spend_lines"]) + len(monzo["recognised"])
assert evs["e-emi-car"]["after"] == DEBTS["car"]["payment"] == 346.55
assert evs["e-emi-paid"]["after"] == 39390 == round(DEBTS["hdfc"]["payment"])
assert evs["e-wedding"]["after"] == 20000 and evs["e-salary-step"]["after"] == 5500 and evs["e-school-fees"]["after"] == 4000
assert evs["e-budget-nov"]["before"] - evs["e-budget-nov"]["after"] == 690 == evs["e-school-pot"]["after"] - 0
assert evs["e-wedding-cover"]["after"] == 19871 == -FP["evening2"]["wedding"]["cash_short"][1] and evs["e-wedding-undo"]["before"] == 19871
assert PLANS["existing"][1]["created"].startswith("Sun 25 Oct 20:15") and label(evs["e-plan-bonus"]["at"]) == "Sun 25 Oct 20:15"
assert FP["clock"]["evening"] == "20:41 to 21:22"
for pid, who in [("e-school-fees", "20:43"), ("e-school-pot", "20:46"), ("e-salary-step", "20:53"), ("e-hdfc-close", "20:59"), ("e-car-pause", "21:08"), ("e-car-resume", "21:09"),
                 ("e-school-end", "21:11"), ("e-car-end", "21:13"), ("e-wedding", "21:16"), ("e-wedding-cover", "21:17"), ("e-wedding-undo", "21:18")]:
    assert evs[pid]["at"][11:16] == who, pid
# the household's totals move at the events that move them
assert H["totals_after_statement_sun_1_nov"]["net_gbp"] == 456493 and H["totals_after_hdfc_emi_thu_5_nov"]["net_gbp"] == 456747
# admin: the spend is the ledger's runs
assert abs(SNAP_MON["spent_usd"] - MON_BOARD_SPEND) < 0.005 and base1 > 0
assert abs(SNAP_ADM["spent_usd"] - sum(r["cost_usd"] for r in RUNS if r["at"] <= ADM_AT and r["at"] >= SNAP_ADM["cycle_start"])) < 1e-9
sp = ADMIN["spend"]
assert abs(sum(m["spent_usd"] for m in sp["members"]) - sp["prod"]["spent_usd"]) < 1e-9, "members do not add to the cycle's spend"
assert abs(sum(a["spent_usd"] for a in sp["agents"]) - sp["prod"]["spent_usd"]) < 1e-9, "agents do not add to the cycle's spend"
assert sum(a["share_pct"] for a in sp["agents"]) == 100 and sum(a["ceiling_usd"] for a in sp["agents"]) == CEIL0
assert sp["guards"]["daily_guard_usd"] == 16.0 and sp["after_ceiling_move"]["member_share_usd"] == 30.0 and sp["after_ceiling_move"]["daily_guard_usd"] == 5.0
assert sp["after_ceiling_move"]["steps_usd"] == [35.0, 42.5, 47.5, 50.0] and sp["prod"]["steps_usd"] == [112.0, 136.0, 152.0, 160.0]
assert sp["prod"]["pct"] < 70 and sp["prod"]["step"].startswith("Normal"), "the ceiling's consequences text assumes the Normal step"
assert max(0, sp["after_ceiling_move"]["spent_usd"]) < CEIL1 * 0.7
act = [r for r in RUNS if r["at"][:10] == "2026-10-26" and r["at"] <= MON_AT and r["cost_usd"]]
assert round(sum(r["cost_usd"] for r in act), 2) == 0.07, "Prototype v4's Activity says $0.07 so far"
assert [round(r["cost_usd"], 2) for r in act] == [0.02, 0.03, 0.02]
assert evs["e-ceiling"]["before"] == CEIL0 and evs["e-ceiling"]["after"] == CEIL1
assert ADMIN["spend"]["cycle"]["start"] == "2026-11-03" and cycle_start("2026-11-02") == "2026-10-03"
assert "08:33" > evs["e-ceiling"]["at"][11:16] > "08:28", "the ceiling moves inside the fresh check's five minutes"
# people: the owner is never the target of a pause; only the owner restores
pauses = [e for e in EVENTS if e["kind"] == "admin_pause"]
restores = [e for e in EVENTS if e["kind"] == "admin_restore"]
assert pauses and all(e.get("target") == "asha" and MEMBERS[0]["role"] == "owner" for e in pauses)
assert all(e["actor"] == "arun" for e in pauses + restores) and all(e["record"] != "arun" for e in pauses)
assert [p for p in ADMIN["people"] if p["id"] == "arun"][0]["can_be_paused"] is False
assert all(not (e["kind"] == "admin_pause" and e["record"] == "arun") for e in EVENTS)
assert evs["e-pause-asha"]["at"] < evs["e-restore-asha"]["at"] and MEMBERS[1]["status"] == "active"
# sign-ins and devices
for m in MEMBERS:
    assert m["devices"] and all(re.match(r"\d{4}-\d\d-\d\dT\d\d:\d\d$", d["last_seen"]) for d in m["devices"])
    assert date.fromisoformat(m["joined"]).weekday() == {"arun": 4, "asha": 6}[m["id"]], "Arun joined on a Fri, Asha on a Sun (iOS boards)"
dev = {d["id"] for m in MEMBERS for d in m["devices"]}
assert evs["e-signin-arun"]["device"] in dev and len(dev) == 5
# the spend page never outruns the clock it is shown at
assert SNAP_ADM["as_of"] < evs["e-fresh-1"]["at"] + "z" and SNAP_ADM["as_of"][:16] == evs["e-fresh-1"]["at"][:16]

print(json.dumps(OUT, indent=1, ensure_ascii=False))
