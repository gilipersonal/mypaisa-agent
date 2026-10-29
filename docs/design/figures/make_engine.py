"""The rules engine's figures for Prototype v5 (MA-291): phases 10 to 13 and 15.

A design aid, not the product's engine (MA-42 to MA-53, MA-81 to MA-85 and MA-90 are): it fixes the figures the
prototype's engine chapters show (prices, the pillars, the holder's cascade, the confidence working, the ranges, every
call the engine made on the household's four UK holdings and how each was graded, the scorecard, the Saturday
reviews, the brief, the alerts, the look-through and the research cards), so that they agree with each other and add
up, and it checks every claim against its own figures before writing them (lesson 38). It reads household-v4.json
(the household, its values, the clock) and forecaster-v4.json (the NASDAQ 100 ETF's candles, the Balanced fund's NAV,
the rules engine's stances and track records) and never changes them; it checks every value it shares with them.
Every name, price and figure is illustrative.

Run: python3 docs/design/figures/make_engine.py        (writes engine-v5.json beside it)
     python3 docs/design/figures/make_engine.py --check (exit 1 if engine-v5.json is not what this makes)

The rules this set reads into ARCHITECTURE 6 (written down here because the docs leave them open, spec 5):

- A call is the stance the engine writes for a holding at each trading day's close (in shadow until the gate), with a
  horizon of two weeks (10 trading days). It is graded at the close that ends its horizon, against waiting: Buy (ADD)
  holds up when the price rose (new money now beat waiting), PAUSE when it fell (waiting beat new money now), HOLD
  when it did not fall (carrying on as planned beat waiting). Its edge against doing nothing is the move for ADD, minus
  the move for PAUSE and nothing for HOLD.
- Confidence (6.4): 50 + agreement + persistence + quality + history, held to 0..95. Agreement is 5 for each pillar
  pointing the stance's way and minus 5 for each against it (a HOLD leans the way its trend points: riding an uptrend,
  or under review in a downtrend). Persistence is round(10 x (bars - 1) / 9), 0 for one bar and 10 from ten. Quality
  is minus 10 for partial, stale or provisional data. History, once the holding has 20 graded calls in the same
  stance, pulls the score a third of the way toward their hit rate. Below 55 the engine has no clear view and makes
  no call.
- The cascade (6.3), in order: TRIM (relentless-bearish 3 or more with a death-cross), PAUSE (exhaustion 2 or more,
  risk elevated, i.e. the Risk pillar at -2, or macro adverse, at -2), Buy (ADD: trend and momentum 0 or more, risk
  not elevated) unless the member's top-up cap for the month is used, else HOLD.
- The gate (phase 15): a week beats doing nothing when the mean edge of the calls graded that week is above zero;
  stances go live after 8 such weeks in a row, and a miss starts the count again.
- The one-month range (6.5) is the engine's own, from each holding's history scaled to today's volatility; its
  P(fall > 5%) is the figure the Forecaster's tab calls "usually" (forecaster-v4's fall5_usual).
"""
from __future__ import annotations

import datetime as dt
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "engine-v5.json"
H = json.loads((HERE / "household-v4.json").read_text(encoding="utf-8"))
F = json.loads((HERE / "forecaster-v4.json").read_text(encoding="utf-8"))
A = {a["id"]: a for a in H["assets"]}
FX = H["clock"]["fx"]["gbp_inr"]

WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
HOLIDAYS = {dt.date(2026, 8, 31)}
CLOSE = dt.date(2026, 10, 23)
HORIZON = 10
UK = ["balanced", "nasdaq", "robotics", "silver"]


def label(d: dt.date) -> str:
    return f"{WD[d.weekday()]} {d.day} {MO[d.month - 1]}"


def r1(x: float) -> float:
    return round(x + 0.0, 1)


def r2(x: float) -> float:
    return round(x + 0.0, 2)


def phi(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


# ---------------------------------------------------------------- the calendar
CANDLES = F["nasdaq"]["candles"]
NAV = F["balanced"]["nav"]
assert [c["d"] for c in CANDLES] == [n["d"] for n in NAV], "the two series share one calendar"
DAYS = [dt.date.fromisoformat(c["d"]) for c in CANDLES]
d = DAYS[-1]
while len(DAYS) < 70:
    d += dt.timedelta(days=1)
    if d.weekday() < 5 and d not in HOLIDAYS:
        DAYS.append(d)
IX = {x: i for i, x in enumerate(DAYS)}
I23 = IX[CLOSE]
I6N = IX[dt.date(2026, 11, 6)]
assert DAYS[I23] == CLOSE and I23 == 59 and I6N == 69 and label(DAYS[I6N]) == "Fri 6 Nov"
assert dt.date(2026, 8, 31) not in IX and label(DAYS[0]) == "Fri 31 Jul"
LBL = [label(x) for x in DAYS]


def ix(s: str) -> int:
    return LBL.index(s)


# ---------------------------------------------------------------- prices: % from the Fri 23 Oct close
def interp(anchors: dict[str, float], wiggle: float, seed: float) -> list[float]:
    pts = sorted((ix(k), v) for k, v in anchors.items())
    out = []
    for i in range(len(DAYS)):
        for (a, va), (b, vb) in zip(pts, pts[1:]):
            if a <= i <= b:
                base = va + (vb - va) * (i - a) / (b - a) if b > a else va
                break
        on_anchor = any(i == a for a, _ in pts)
        w = 0.0 if on_anchor else wiggle * (math.sin(i * 1.9 + seed) * 0.6 + math.sin(i * 0.73 + 2 * seed) * 0.4)
        out.append(base if on_anchor else round(base + w, 2))
    return out


EXT_NASDAQ = [-0.4, -1.1, -0.6, -1.5, -1.9, -1.2, -2.0, -1.6, -1.0]
EXT_BAL = [0.1, 0.3, 0.2, 0.4, 0.5, 0.4, 0.7, 0.6, 0.8]
# the values at the Fri 6 Nov close, whole pounds, so the change in value sums cleanly (the integrator carries it)
V6N = {"balanced": 23131, "nasdaq": 505, "robotics": 295, "silver": 191, "pot": 181}
V23 = {k: A[k]["value"] for k in V6N}
P6N = {k: (V6N[k] / V23[k] - 1) * 100 for k in UK}

S = {
    "nasdaq": [c["c"] for c in CANDLES] + EXT_NASDAQ + [P6N["nasdaq"]],
    "balanced": [n["nav"] for n in NAV] + EXT_BAL + [P6N["balanced"]],
    "robotics": interp({"Fri 31 Jul": 4.0, "Wed 12 Aug": 3.0, "Fri 28 Aug": 6.5, "Mon 21 Sep": 3.2, "Thu 1 Oct": 8.9,
                        "Mon 5 Oct": 6.0, "Wed 7 Oct": 7.8, "Wed 14 Oct": 5.0, "Mon 19 Oct": 2.9, "Tue 20 Oct": 3.4,
                        "Wed 21 Oct": 2.6, "Thu 22 Oct": (1 / 0.979 - 1) * 100, "Fri 23 Oct": 0.0, "Mon 26 Oct": -0.8,
                        "Tue 27 Oct": -1.6, "Wed 28 Oct": -1.0, "Thu 29 Oct": -2.2, "Fri 30 Oct": -2.6, "Mon 2 Nov": -2.0,
                        "Tue 3 Nov": -3.1, "Wed 4 Nov": -2.7, "Thu 5 Nov": -3.4, "Fri 6 Nov": P6N["robotics"]}, 0.45, 0.7),
    "silver": interp({"Fri 31 Jul": 1.0, "Fri 14 Aug": 3.5, "Fri 28 Aug": -1.0, "Mon 14 Sep": 2.0, "Fri 25 Sep": 4.6,
                      "Fri 2 Oct": 1.5, "Fri 9 Oct": 3.0, "Fri 16 Oct": 0.8, "Wed 21 Oct": 2.2,
                      "Thu 22 Oct": (1 / 0.986 - 1) * 100, "Fri 23 Oct": 0.0, "Mon 26 Oct": 0.6, "Tue 27 Oct": 1.1,
                      "Wed 28 Oct": 0.2, "Thu 29 Oct": -0.5, "Fri 30 Oct": 0.3, "Mon 2 Nov": 0.9, "Tue 3 Nov": 1.6,
                      "Wed 4 Nov": 1.1, "Thu 5 Nov": 1.9, "Fri 6 Nov": P6N["silver"]}, 0.6, 2.1),
}
for k in UK:
    assert len(S[k]) == len(DAYS) and S[k][I23] == 0.0, k
# the shared series are forecaster-v4's, untouched to the Fri 23 Oct close
assert S["nasdaq"][: I23 + 1] == [c["c"] for c in CANDLES] and S["balanced"][: I23 + 1] == [n["nav"] for n in NAV]
# after the close each path stays inside the Forecaster's 80% fan for that day (it is one of the outcomes it allowed)
for k in ("nasdaq", "balanced"):
    for j, fd in enumerate(F[k]["fan"][:10]):
        assert fd["d"] == DAYS[I23 + 1 + j].isoformat() and fd["p10"] <= S[k][I23 + 1 + j] <= fd["p90"], (k, fd["d"])


def lvl(k: str, i: int) -> float:
    """the price level relative to the Fri 23 Oct close"""
    return 1 + S[k][i] / 100


def value(k: str, i: int) -> float:
    """the value with the units held at the Fri 23 Oct close (no buy or sell in the windows the prototype shows)"""
    return V23[k] * lvl(k, i)


def move(k: str, i: int, j: int) -> float:
    """the % move from close i to close j"""
    return (lvl(k, j) / lvl(k, i) - 1) * 100


# Robotics: its high on Thu 1 Oct, a September low, broken on Mon 19 Oct, and the 8% line crossed at the Fri 23 Oct close
ROB_HIGH = max(range(I23 + 1), key=lambda i: S["robotics"][i])
assert LBL[ROB_HIGH] == "Thu 1 Oct"
sep = [i for i in range(len(DAYS)) if DAYS[i].month == 9]
SEP_LOW = min(sep, key=lambda i: S["robotics"][i])
assert LBL[SEP_LOW] == "Mon 21 Sep" and S["robotics"][ix("Mon 19 Oct")] < S["robotics"][SEP_LOW]
below = lambda i: (lvl("robotics", i) / lvl("robotics", ROB_HIGH) - 1) * 100
assert all(below(i) > -8 for i in range(ROB_HIGH, I23)) and below(I23) <= -8, "Robotics crossed its 8% line at the Fri 23 Oct close"
NQ_HIGH = max(range(I23 + 1), key=lambda i: S["nasdaq"][i])
assert LBL[NQ_HIGH] == "Wed 7 Oct"

# ---------------------------------------------------------------- the day's move at the Fri 23 Oct close
DAY = {}
for k in UK:
    g = value(k, I23) - value(k, I23 - 1)
    DAY[k] = {"gbp": round(g), "gbp_exact": r2(g), "pct": r2(move(k, I23 - 1, I23))}
DAY["pot"] = {"gbp": 0, "gbp_exact": 0.0, "pct": 0.0}
assert DAY["nasdaq"]["pct"] == 0.91 and DAY["robotics"]["pct"] == -2.1 and DAY["silver"]["pct"] == -1.4 and DAY["balanced"]["pct"] == -0.01
PORT = sum(V23.values())
assert PORT == 24110, PORT
day_exact = sum(DAY[k]["gbp_exact"] for k in UK)
DAY_T = {"gbp": round(day_exact), "pct": r2(day_exact / (PORT - day_exact) * 100)}
assert DAY_T["gbp"] == sum(DAY[k]["gbp"] for k in UK) == -7, "the holdings' rounded moves sum to the portfolio's"
WEEK = {}
for k in UK:
    WEEK[k] = {"gbp": round(value(k, I23) - value(k, ix("Fri 16 Oct"))), "pct": r1(move(k, ix("Fri 16 Oct"), I23))}
WEEK_T = sum(value(k, I23) - value(k, ix("Fri 16 Oct")) for k in UK)
WEEK_T = {"gbp": round(WEEK_T), "pct": r1(WEEK_T / (PORT - WEEK_T) * 100)}
assert WEEK_T["gbp"] == sum(WEEK[k]["gbp"] for k in UK), (WEEK_T, WEEK)
MONTH = {k: r1(move(k, ix("Wed 30 Sep"), I23)) for k in UK}
m_t = sum(value(k, I23) - value(k, ix("Wed 30 Sep")) for k in UK)
MONTH_T = r1(m_t / (PORT - m_t) * 100)        # the price move only: October's two top-ups are not in it

# the Fri 6 Nov close
SNAP6 = {}
for k in UK:
    SNAP6[k] = {"value": V6N[k], "change": V6N[k] - V23[k], "pct_since_23_oct": r2(P6N[k]),
                "day_gbp": round(value(k, I6N) - value(k, I6N - 1)), "day_pct": r2(move(k, I6N - 1, I6N))}
SNAP6["pot"] = {"value": 181, "change": 0, "pct_since_23_oct": 0.0, "day_gbp": 0, "day_pct": 0.0}
P6 = sum(V6N.values())
assert P6 == 24303 and P6 - PORT == sum(s["change"] for s in SNAP6.values()) == 193
for k in UK:
    assert abs(value(k, I6N) - V6N[k]) < 1e-9
day6 = sum(value(k, I6N) - value(k, I6N - 1) for k in UK)
SNAP6_T = {"value": P6, "change": P6 - PORT, "day_gbp": round(day6), "day_pct": r2(day6 / (P6 - day6) * 100)}
assert SNAP6_T["day_gbp"] == sum(SNAP6[k]["day_gbp"] for k in UK), "the holdings' rounded Friday moves sum to the portfolio's"
w6 = {k: value(k, I6N) - value(k, ix("Fri 30 Oct")) for k in UK}
WEEK6 = {"from": "Fri 30 Oct close", "by": {k: {"gbp": round(v), "pct": r1(move(k, ix("Fri 30 Oct"), I6N))} for k, v in w6.items()},
         "total": {"gbp": round(sum(w6.values())), "pct": r1(sum(w6.values()) / (P6 - sum(w6.values())) * 100)}}
assert WEEK6["total"]["gbp"] == sum(v["gbp"] for v in WEEK6["by"].values()), WEEK6

# ---------------------------------------------------------------- instruments, units, prices
INSTR = {
    "balanced": {"name": "Balanced", "full": "BlackRock MyMap 5 Select ESG", "short": "Balanced", "kind": "oeic", "temperament": "patient",
                 "owner": "arun", "wrapper": "ISA", "platform": "Monzo", "isin": "GB00BMDQ4Y43", "ticker": "0P0001L8YT.L", "nav_note": "one NAV a day, published the next morning",
                 "price": 18.57, "chain": ["yfinance", "issuer_page", "ft", "proxy", "screenshot"], "red_line": 5, "amber_line": 1},
    "nasdaq": {"name": "NASDAQ 100 ETF", "full": "iShares NASDAQ 100 UCITS ETF", "short": "NASDAQ 100", "kind": "etf", "temperament": "patient",
               "owner": "asha", "wrapper": "ISA", "platform": None, "isin": "IE00B53SZB19", "ticker": "CNX1", "price": 1027.40,
               "chain": ["yfinance", "twelvedata", "issuer_page", "stale"], "red_line": 8, "amber_line": 1},
    "robotics": {"name": "Robotics ETF", "full": "iShares Automation & Robotics UCITS ETF", "short": "Robotics", "kind": "etf", "temperament": "patient",
                 "owner": "arun", "wrapper": "GIA", "platform": None, "isin": "IE00BYZK4552", "ticker": "RBOT", "price": 12.64,
                 "chain": ["yfinance", "twelvedata", "issuer_page", "stale"], "red_line": 8, "amber_line": 1},
    "silver": {"name": "Silver ETC", "full": "iShares Physical Silver ETC", "short": "Silver", "kind": "commodity_etc", "temperament": "slowest to Buy, quickest to PAUSE",
               "owner": "arun", "wrapper": "GIA", "platform": None, "isin": "IE00B4NCWG09", "ticker": "SSLN", "price": 31.33,
               "chain": ["yfinance", "twelvedata", "issuer_page", "stale"], "red_line": 12, "amber_line": 1},
}
for k, o in INSTR.items():
    assert A[k]["name"] == o["name"] or (k == "balanced" and A[k]["name"].startswith("Balanced")), k
    o["units"] = round(V23[k] / o["price"], 4)
    assert abs(o["units"] * o["price"] - V23[k]) < 0.5, k
    assert [m for m, _ in A[k]["owners"]] == [o["owner"]], k
    assert (A[k]["account"].split(" · ")[0]) == o["wrapper"], k
assert F["nasdaq"]["full"] == INSTR["nasdaq"]["full"] and F["nasdaq"]["owner"] == "Asha" and F["nasdaq"]["wrapper"] == "ISA"
assert F["balanced"]["value_gbp"] == V23["balanced"] and F["nasdaq"]["value_gbp"] == V23["nasdaq"]

# ---------------------------------------------------------------- the engine's runs: each holding's state over time
# (first day, stance, pillars T M Ma R, quality, why) · a run lasts until the next run's first day
RUNS = {
    "nasdaq": [
        ("Thu 6 Aug", "PAUSE", (1, -1, 0, -2), 0, "risk elevated after the early-August drop"),
        ("Wed 19 Aug", "ADD", (1, 1, 0, 0), 0, "trend and momentum turned up, risk back to normal"),
        ("Fri 21 Aug", "PAUSE", (1, -1, 0, -1), 0, "exhaustion ×2: RSI 72, the MACD histogram shrinking"),
        ("Fri 28 Aug", "ADD", (2, 1, 0, 0), 0, "exhaustion cleared; trend and momentum up"),
        ("Mon 28 Sep", "PAUSE", (1, -1, 0, -1), 0, "exhaustion ×2: RSI turned down from 71"),
        ("Wed 14 Oct", "PAUSE", (-1, -2, 0, -2), 0, "risk elevated as it fell from the 7 Oct high"),
    ],
    "balanced": [
        ("Thu 6 Aug", "ADD", (2, 1, 1, 0), 0, "a steady uptrend; risk normal"),
        ("Wed 2 Sep", "HOLD", (2, -1, 1, 0), 0, "momentum dipped below zero"),
        ("Mon 14 Sep", "ADD", (2, 1, 1, 0), 0, "momentum back above zero"),
        ("Mon 28 Sep", "HOLD", (2, -1, 1, 0), 0, "momentum dipped below zero"),
        ("Tue 6 Oct", "ADD", (2, 1, 1, 0), 0, "a higher low on the trend line; momentum up"),
        ("Fri 16 Oct", "HOLD", (2, 1, 1, 0), 0, "Buy fits, but October's top-up is in (your cap: one a month)"),
        ("Mon 2 Nov", "ADD", (2, 1, 1, 0), 0, "November's top-up window is open; trend and momentum up"),
    ],
    "robotics": [
        ("Mon 21 Sep", "HOLD", (1, -1, 1, 0), 0, "no trigger: momentum below zero"),
        ("Thu 8 Oct", "PAUSE", (-1, -1, 1, -2), 0, "risk elevated: volatility in its 85th percentile"),
        ("Tue 20 Oct", "HOLD", (-1, -1, 1, 0), 0, "no trigger: risk back to normal, the trend down"),
    ],
    "silver": [
        ("Mon 21 Sep", "HOLD", (1, 0, 1, -1), 0, "no trigger: momentum flat"),
        ("Mon 28 Sep", "PAUSE", (1, -1, 0, -2), 0, "risk elevated: a metal's risk counts twice"),
        ("Thu 15 Oct", "HOLD", (1, -1, 1, 0), 0, "no trigger: risk back to normal, momentum below zero"),
    ],
}
# today's runs (from Fri 23 Oct) carry the pillars the Technical section shows; NASDAQ's moved under it as it fell
TODAY_PILLARS = {"balanced": (2, 1, 1, 0), "nasdaq": (-1, -2, 0, -2), "robotics": (-1, -2, 1, 0), "silver": (1, -1, 1, 0)}
NOV6_PILLARS = {"balanced": (2, 1, 1, 0), "nasdaq": (-1, -1, 0, -2), "robotics": (-1, -1, 1, 0), "silver": (1, -1, 1, 0)}
FIRST = {"balanced": "Thu 6 Aug", "nasdaq": "Thu 6 Aug", "robotics": "Mon 21 Sep", "silver": "Mon 21 Sep"}


def lean(stance: str, p: tuple) -> int:
    if stance == "ADD":
        return 1
    if stance in ("PAUSE", "TRIM"):
        return -1
    return 1 if p[0] >= 0 else -1   # HOLD rides an uptrend, or is under review in a downtrend


def agreement(stance: str, p: tuple) -> int:
    s = lean(stance, p)
    return 5 * sum(1 if v * s > 0 else -1 if v * s < 0 else 0 for v in p)


def persistence(bars: int) -> int:
    return round(10 * min(bars - 1, 9) / 9)


def held_up(stance: str, r: float) -> bool:
    return r > 0 if stance == "ADD" else r < 0 if stance == "PAUSE" else r >= 0


def edge(stance: str, r: float) -> float:
    return r if stance == "ADD" else -r if stance == "PAUSE" else 0.0


def run_at(k: str, i: int):
    rs = [(ix(a), st, p, q, why) for a, st, p, q, why in RUNS[k]]
    cur = None
    for n, (a, st, p, q, why) in enumerate(rs):
        if a <= i:
            cur = (n, a, st, p, q, why)
    return cur


# the cascade, as this set reads 6.3 (see the docstring); returns (stance, the path in words)
def cascade(p: tuple, flags: dict, capped: bool) -> tuple[str, list[str]]:
    t, m, ma, rk = p
    path = ["holding"]
    if flags.get("relentless", 0) >= 3 and flags.get("death_cross"):
        return "TRIM", path + ["relentless-bearish ≥ 3 with a death-cross → TRIM"]
    path.append("TRIM? relentless-bearish " + str(flags.get("relentless", 0)) + " of 3" + (", a death-cross" if flags.get("death_cross") else ", no death-cross") + ": no")
    why = [w for w, c in (("exhaustion ≥ 2", flags.get("exhaustion", 0) >= 2), ("risk elevated", rk <= -2), ("macro adverse", ma <= -2)) if c]
    if why:
        return "PAUSE", path + ["PAUSE? " + " and ".join(why) + ": yes → PAUSE"]
    path.append("PAUSE? no exhaustion, risk not elevated, macro not adverse: no")
    if t >= 0 and m >= 0 and rk > -2:
        if capped:
            return "HOLD", path + ["Buy? trend and momentum ≥ 0, risk normal: yes", "the month's top-up is in (the member's cap) → HOLD"]
        return "ADD", path + ["Buy? trend and momentum ≥ 0, risk normal: yes → Buy"]
    return "HOLD", path + ["Buy? " + ("trend below 0" if t < 0 else "momentum below 0") + ": no → HOLD, nothing to do"]


SIGMA_1M = {}   # the one-month spread each holding's range is drawn from, set so its P(fall > 5%) is forecaster-v4's "usual"
MU_1M = {"balanced": 0.5, "nasdaq": 0.8, "robotics": 0.6, "silver": 0.4}
USUAL = {"nasdaq": F["nasdaq"]["headline"]["fall5_usual"], "balanced": F["balanced"]["headline"]["fall5_usual"]}
for c in F["review"]["cards"]:
    if c["name"] == "Robotics ETF":
        USUAL["robotics"] = c["usual"]
    if c["name"] == "Silver ETC":
        USUAL["silver"] = c["usual"]
Z90 = 1.2815515655
for k in UK:
    # P(r < -5) = usual: (-5 - mu) / sigma = z(usual)
    lo, hi = -6.0, 0.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if phi(mid) < USUAL[k] / 100:
            lo = mid
        else:
            hi = mid
    SIGMA_1M[k] = (-5 - MU_1M[k]) / ((lo + hi) / 2)
RANGE_1M = {}
for k in UK:
    s, mu = SIGMA_1M[k], MU_1M[k]
    RANGE_1M[k] = {"p10": r1(mu - Z90 * s), "p50": r1(mu), "p90": r1(mu + Z90 * s), "fall5": round(phi((-5 - mu) / s) * 100)}
    assert RANGE_1M[k]["fall5"] == USUAL[k], k
SIGMA_2W = {k: SIGMA_1M[k] * math.sqrt(HORIZON / 21) for k in UK}

# ---------------------------------------------------------------- every call, graded
CALLS = []          # one row per holding per trading day from its first call to the Fri 6 Nov close
for k in UK:
    first = ix(FIRST[k])
    for i in range(first, I6N + 1):
        n, a, st, p, q, why = run_at(k, i)
        if i >= I23 and a <= I23:
            p = TODAY_PILLARS[k]          # the pillars move under a stance: from the Fri 23 Oct close, as the Technical section shows
        if i == I6N:
            p = NOV6_PILLARS[k]
        s0 = i                            # bars the stance has held (a run of the same stance continues the count)
        while s0 - 1 >= first and run_at(k, s0 - 1)[2] == st:
            s0 -= 1
        CALLS.append({"k": k, "i": i, "run": n, "stance": st, "p": p, "q": q, "bars": i - s0 + 1})


def grade(c):
    j = c["i"] + HORIZON
    if j > I6N:
        return None
    r = move(c["k"], c["i"], j)
    return j, r


for c in CALLS:
    g = grade(c)
    c["graded_at"] = g[0] if g else None
    c["r"] = r2(g[1]) if g else None
# point in time: the history term reads the calls graded by that close (graded first, then scored)
for c in sorted(CALLS, key=lambda c: c["i"]):
    same = [x for x in CALLS if x["k"] == c["k"] and x["stance"] == c["stance"] and x["graded_at"] is not None and x["graded_at"] <= c["i"]]
    raw = 50 + agreement(c["stance"], c["p"]) + persistence(c["bars"]) + c["q"]
    hist = 0
    if len(same) >= 20:
        rate = sum(held_up(x["stance"], x["r"]) for x in same) / len(same) * 100
        hist = round((rate - raw) / 3)
        c["hist_n"] = len(same)
        c["hist_held"] = sum(held_up(x["stance"], x["r"]) for x in same)
    c["agree"] = agreement(c["stance"], c["p"])
    c["persist"] = persistence(c["bars"])
    c["hist"] = hist
    c["conf"] = max(0, min(95, raw + hist))
    c["view"] = c["conf"] >= 55
for c in CALLS:
    if c["r"] is not None:
        c["held"] = held_up(c["stance"], c["r"])
        c["edge"] = r2(edge(c["stance"], c["r"]))
        band = Z90 * SIGMA_2W[c["k"]]
        c["inside"] = -band <= c["r"] <= band
assert all(c["view"] for c in CALLS), "every day in these runs is a call (55% or more)"


def calls(k=None, by=None, graded=True, stance=None):
    out = [c for c in CALLS if (k is None or c["k"] == k) and (stance is None or c["stance"] == stance)]
    if graded:
        out = [c for c in out if c["graded_at"] is not None and (by is None or c["graded_at"] <= by)]
    return out


# the figures forecaster-v4 holds, out of the calls themselves
nq = calls("nasdaq", I23)
assert (len(nq), sum(c["held"] for c in nq)) == (F["nasdaq"]["track"]["rules"]["of"], F["nasdaq"]["track"]["rules"]["held"]) == (46, 31)
bh = calls("balanced", I23, stance="HOLD")
assert (len(bh), sum(c["held"] for c in bh)) == (F["balanced"]["track"]["rules"]["of"], F["balanced"]["track"]["rules"]["held"]) == (14, 11)

# ---------------------------------------------------------------- today's stance: the cascade gives it, the working gives the confidence
NOW = {}
FLAGS = {
    "balanced": {"exhaustion": 0, "relentless": 0, "death_cross": False, "rebound": False},
    "nasdaq": {"exhaustion": 0, "relentless": 2, "death_cross": False, "rebound": False},
    "robotics": {"exhaustion": 0, "relentless": 1, "death_cross": False, "rebound": False},
    "silver": {"exhaustion": 0, "relentless": 0, "death_cross": False, "rebound": False},
}
CAPPED = {"balanced": True}
for k in UK:
    c = next(x for x in CALLS if x["k"] == k and x["i"] == I23)
    st, path = cascade(c["p"], FLAGS[k], CAPPED.get(k, False))
    assert st == c["stance"], (k, st, c["stance"])
    NOW[k] = {"stance": st, "conf": c["conf"], "bars": c["bars"], "since": LBL[c["i"] - c["bars"] + 1], "pillars": dict(zip(["trend", "momentum", "macro", "risk"], c["p"])),
              "agree": c["agree"], "persist": c["persist"], "quality": c["q"], "hist": c["hist"], "hist_n": c.get("hist_n"), "hist_held": c.get("hist_held"),
              "path": path, "flags": FLAGS[k]}
    w = NOW[k]
    assert 50 + w["agree"] + w["persist"] + w["quality"] + w["hist"] == w["conf"]
# the contract's stances (contract.md, forecaster-v4's review)
assert {k: (NOW[k]["stance"], NOW[k]["conf"]) for k in UK} == {"nasdaq": ("PAUSE", 64), "balanced": ("HOLD", 71), "robotics": ("HOLD", 58), "silver": ("HOLD", 62)}
assert F["nasdaq"]["rules"] == {"stance": "PAUSE", "conf": 64, "line": "Keep what you have; delay new money until the next review"}
assert F["balanced"]["rules"]["stance"] == "HOLD" and F["balanced"]["rules"]["conf"] == 71
rv = {c["name"]: c["rules"] for c in F["review"]["cards"]}
assert rv["Robotics ETF"] == "HOLD · 58%" and rv["Silver ETC"] == "HOLD · 62%" and rv["NASDAQ 100 ETF"] == "PAUSE · 64%"
assert NOW["balanced"]["hist"] == 0 and NOW["nasdaq"]["hist"] == -11 and NOW["nasdaq"]["hist_n"] == 24 and NOW["nasdaq"]["hist_held"] == 10

NOV6 = {}
for k in UK:
    c = next(x for x in CALLS if x["k"] == k and x["i"] == I6N)
    st, path = cascade(c["p"], FLAGS[k], k == "balanced" and False)
    assert st == c["stance"], (k, st, c["stance"])
    NOV6[k] = {"stance": st, "conf": c["conf"], "bars": c["bars"], "since": LBL[c["i"] - c["bars"] + 1], "agree": c["agree"], "persist": c["persist"],
               "quality": c["q"], "hist": c["hist"], "hist_n": c.get("hist_n"), "hist_held": c.get("hist_held"), "path": path,
               "pillars": dict(zip(["trend", "momentum", "macro", "risk"], c["p"]))}
    assert 50 + NOV6[k]["agree"] + NOV6[k]["persist"] + NOV6[k]["quality"] + NOV6[k]["hist"] == NOV6[k]["conf"]
assert NOV6["balanced"]["stance"] == "ADD", "Balanced says Buy once November's top-up window opens"

FRAMING = {"ADD": "Buy more: make this month's contribution here, or bring it forward", "HOLD": "Nothing to do",
           "PAUSE": "Keep what you have; delay new money until the next review", "TRIM": "Rebalance toward target; never sell everything"}

# ---------------------------------------------------------------- the gate: weeks beating doing nothing
FRIDAYS = [i for i in range(len(DAYS)) if DAYS[i].weekday() == 4 and i >= ix("Fri 21 Aug")]
WEEKS = []
for f in FRIDAYS:
    start = f - 4
    g = [c for c in CALLS if c["graded_at"] is not None and start <= c["graded_at"] <= f]
    m = sum(c["edge"] for c in g) / len(g)
    WEEKS.append({"to": LBL[f], "graded": len(g), "held": sum(c["held"] for c in g), "edge": r2(m), "beat": m > 0})
run = 0
for w in WEEKS:
    run = run + 1 if w["beat"] else 0
    w["count"] = run
by = {w["to"]: w for w in WEEKS}
assert not by["Fri 11 Sep"]["beat"], "a miss in the week to Fri 11 Sep started the count again"
assert by["Fri 23 Oct"]["count"] == 6 and by["Fri 30 Oct"]["count"] == 7 and by["Fri 6 Nov"]["count"] == 8
GATE = {"weeks_needed": 8, "restart": "Fri 11 Sep", "at_sat_24_oct": 6, "at_sat_31_oct": 7, "passed": "Sat 7 Nov 09:00", "live_from": "Mon 9 Nov",
        "rows": [w for w in WEEKS if ix(w["to"]) >= ix("Fri 18 Sep")]}
assert [w["count"] for w in GATE["rows"]] == list(range(1, 9))


# ---------------------------------------------------------------- the scorecard, at a close
def scorecard(by_i: int):
    g = calls(by=by_i)
    n = len(g)
    held = sum(c["held"] for c in g)
    brier = sum((c["conf"] / 100 - (1 if c["held"] else 0)) ** 2 for c in g) / n
    buckets = []
    for lo, hi, t in ((55, 59, "55 to 59%"), (60, 69, "60 to 69%"), (70, 95, "70% or more")):
        b = [c for c in g if lo <= c["conf"] <= hi]
        if b:
            buckets.append({"t": t, "lo": lo, "hi": hi, "calls": len(b), "held": sum(c["held"] for c in b),
                            "rate": round(sum(c["held"] for c in b) / len(b) * 100), "said": round(sum(c["conf"] for c in b) / len(b))})
    assert sum(b["calls"] for b in buckets) == n and sum(b["held"] for b in buckets) == held, "the reliability table adds up to the calls"
    for b in buckets:
        assert b["rate"] == round(b["held"] / b["calls"] * 100)
    by_stance = {}
    for st in ("ADD", "HOLD", "PAUSE"):
        x = [c for c in g if c["stance"] == st]
        by_stance[st] = {"calls": len(x), "held": sum(c["held"] for c in x)}
    assert sum(v["calls"] for v in by_stance.values()) == n
    by_holding = {}
    for k in UK:
        x = [c for c in g if c["k"] == k]
        by_holding[k] = {"calls": len(x), "held": sum(c["held"] for c in x)}
    assert sum(v["calls"] for v in by_holding.values()) == n and sum(v["held"] for v in by_holding.values()) == held
    return {"at": LBL[by_i] + " close", "calls": n, "held": held, "rate": round(held / n * 100), "edge": r2(sum(c["edge"] for c in g) / n),
            "inside": round(sum(c["inside"] for c in g) / n * 100), "inside_n": sum(c["inside"] for c in g), "brier": r2(brier),
            "said": round(sum(c["conf"] for c in g) / n), "buckets": buckets, "by_stance": by_stance, "by_holding": by_holding}


SC24 = scorecard(I23)
SC6 = scorecard(I6N)
assert SC24["by_holding"]["nasdaq"] == {"calls": 46, "held": 31}
assert SC24["brier"] < 0.25, "better than a coin toss"

# ---------------------------------------------------------------- the calls, grouped by holding and week, for the lists
def groups(upto_i: int, k=None):
    """the calls made each week, per holding, as of a close: graded ones with their result, open ones still inside their horizon"""
    out = []
    mondays = sorted({i - DAYS[i].weekday() if (i - DAYS[i].weekday()) >= 0 else 0 for i in range(len(DAYS))})
    for k2 in ([k] if k else UK):
        made = [c for c in CALLS if c["k"] == k2 and c["i"] <= upto_i]
        weeks = {}
        for c in made:
            wk = DAYS[c["i"]].isocalendar()[1]
            weeks.setdefault((wk, c["stance"]), []).append(c)
        for (wk, st), cs in weeks.items():
            graded = [c for c in cs if c["graded_at"] is not None and c["graded_at"] <= upto_i]
            out.append({"k": k2, "stance": st, "from": LBL[cs[0]["i"]], "to": LBL[cs[-1]["i"]], "i0": cs[0]["i"], "n": len(cs),
                        "conf_lo": min(c["conf"] for c in cs), "conf_hi": max(c["conf"] for c in cs),
                        "graded": len(graded), "held": sum(c["held"] for c in graded),
                        "move": r1(sum(c["r"] for c in graded) / len(graded)) if graded else None,
                        "open": len(cs) - len(graded),
                        "graded_by": LBL[max(c["graded_at"] for c in graded)] if graded else None,
                        "due": LBL[cs[-1]["i"] + HORIZON] if cs[-1]["i"] + HORIZON <= I6N + 10 and cs[-1]["i"] + HORIZON < len(DAYS) else None})
    out.sort(key=lambda g: (-g["i0"], UK.index(g["k"])))
    return out


def outcome(g):
    if g["graded"] == 0:
        return "Open"
    if g["open"]:
        return "Part graded"
    return "Held up" if g["held"] * 2 > g["graded"] else "Missed" if g["held"] * 2 < g["graded"] else "Split"


G24 = groups(I23)
G6 = groups(I6N)
for g in G24 + G6:
    g["outcome"] = outcome(g)
assert sum(g["graded"] for g in G24) == SC24["calls"] and sum(g["held"] for g in G24) == SC24["held"]
assert sum(g["graded"] for g in G6) == SC6["calls"] and sum(g["held"] for g in G6) == SC6["held"]
HOLDING_TRACK = {}
for k in UK:
    runs = []
    for n, (a, st, p, q, why) in enumerate(RUNS[k]):
        cs = [c for c in CALLS if c["k"] == k and c["run"] == n and c["i"] <= I6N]
        if not cs:
            continue
        g24 = [c for c in cs if c["graded_at"] is not None and c["graded_at"] <= I23]
        g6 = [c for c in cs if c["graded_at"] is not None]
        runs.append({"stance": st, "from": LBL[cs[0]["i"]], "to": LBL[cs[-1]["i"]], "i0": cs[0]["i"], "i1": cs[-1]["i"], "why": why, "n": len(cs),
                     "graded_24": len(g24), "held_24": sum(c["held"] for c in g24),
                     "graded_6": len(g6), "held_6": sum(c["held"] for c in g6)})
    HOLDING_TRACK[k] = runs
    assert sum(r["graded_24"] for r in runs) == SC24["by_holding"][k]["calls"] and sum(r["held_24"] for r in runs) == SC24["by_holding"][k]["held"]

# ---------------------------------------------------------------- the Saturday reviews (the rules engine's part)
def week_graded(f_i: int):
    g = [c for c in CALLS if c["graded_at"] is not None and f_i - 4 <= c["graded_at"] <= f_i]
    per = {}
    for k in UK:
        x = [c for c in g if c["k"] == k]
        if x:
            per[k] = {"calls": len(x), "held": sum(c["held"] for c in x), "stances": sorted({c["stance"] for c in x}),
                      "made": LBL[min(c["i"] for c in x)] + " to " + LBL[max(c["i"] for c in x)], "move": r1(sum(c["r"] for c in x) / len(x))}
    return {"calls": len(g), "held": sum(c["held"] for c in g), "per": per}


DECISIONS = [
    {"who": "arun", "day": "Thu 15 Oct", "what": "added £200 to Balanced", "gbp": 200, "k": "balanced", "signal": "ADD",
     "due": "Thu 29 Oct"},
    {"who": "asha", "day": "Fri 16 Oct", "what": "let her monthly £25 into the NASDAQ 100 ETF go ahead", "gbp": 25, "k": "nasdaq", "signal": "PAUSE",
     "due": "Fri 30 Oct"},
    {"who": "arun", "day": "Fri 23 Oct", "what": "held off a £50 top-up to Robotics after its red alert", "gbp": 50, "k": "robotics", "signal": "HOLD",
     "due": "Fri 6 Nov", "logged": "Fri 23 Oct 21:07"},
]
for dcs in DECISIONS:
    c = next(x for x in CALLS if x["k"] == dcs["k"] and LBL[x["i"]] == dcs["day"])
    dcs["signal_conf"] = c["conf"]
    assert c["stance"] == dcs["signal"], dcs
    assert LBL[ix(dcs["day"]) + HORIZON] == dcs["due"], dcs
    # in line: the member did what the signal leans to; graded like the call
    acted_like = {"added": "ADD", "let her": "ADD", "held off": "PAUSE"}
    kind = next(v for kk, v in acted_like.items() if dcs["what"].startswith(kk))
    dcs["in_line"] = (kind == dcs["signal"]) or (kind == "ADD" and dcs["signal"] == "HOLD")
    j = ix(dcs["due"])
    r = move(dcs["k"], ix(dcs["day"]), j)
    dcs["move"] = r1(r)
    dcs["member_right"] = held_up(kind, r)
    dcs["signal_right"] = held_up(dcs["signal"], r)
    dcs["so_far_23"] = r1(move(dcs["k"], ix(dcs["day"]), I23)) if ix(dcs["day"]) < I23 else None
assert [d["in_line"] for d in DECISIONS] == [True, False, False]

REVIEW24 = {"when": "Sat 24 Oct 09:00", "span": "4 weeks to Fri 23 Oct", "week": week_graded(I23), "gate": 6,
            "decisions": [d for d in DECISIONS], "scorecard": "SC24"}
REVIEW7 = {"when": "Sat 7 Nov 09:00", "span": "4 weeks to Fri 6 Nov", "week": week_graded(I6N), "gate": 8, "scorecard": "SC6"}
assert REVIEW24["week"]["calls"] == by["Fri 23 Oct"]["graded"] and REVIEW7["week"]["calls"] == by["Fri 6 Nov"]["graded"]

# ---------------------------------------------------------------- prices: where they came from, and how fresh (Fri 23 Oct morning)
FRESH = {
    "at": "Fri 23 Oct 07:12", "expected": "Thu 22 Oct",
    "rows": [
        {"k": "balanced", "as_of": "Thu 22 Oct", "what": "NAV", "source": "yfinance", "fresh": True, "tried": ["yfinance ✓"]},
        {"k": "nasdaq", "as_of": "Thu 22 Oct", "what": "close", "source": "yfinance", "fresh": True, "tried": ["yfinance ✓"], "also": "issuer_page"},
        {"k": "robotics", "as_of": "Wed 21 Oct", "what": "close", "source": "stale", "fresh": False, "tried": ["yfinance: no Thursday bar", "twelvedata: London not served", "issuer_page: timed out", "stale: Wednesday's close, labelled"]},
        {"k": "silver", "as_of": "Wed 21 Oct", "what": "close", "source": "stale", "fresh": False, "tried": ["yfinance: no Thursday bar", "twelvedata: London not served", "issuer_page: timed out", "stale: Wednesday's close, labelled"]},
        {"k": "pot", "as_of": None, "what": "cash", "source": None, "fresh": True, "tried": ["no price needed"]},
    ],
    "filled": "Fri 23 Oct 21:04", "filled_what": "yfinance answered again: Thursday's and Friday's closes are in; nothing is provisional",
    "alarm": "The 07:45 alarm rings only when every source has failed for two days.",
}
val_prov = {}
for row in FRESH["rows"]:
    k = row["k"]
    if k == "pot":
        val_prov[k] = 181.0
        continue
    val_prov[k] = value(k, ix(row["as_of"]))
FRESH["values"] = {k: round(v) for k, v in val_prov.items()}
FRESH["total"] = round(sum(val_prov.values()))
assert FRESH["total"] == sum(FRESH["values"].values()) or abs(FRESH["total"] - sum(FRESH["values"].values())) <= 1
FRESH["fresh_n"] = sum(1 for r in FRESH["rows"] if r["k"] != "pot" and r["fresh"])
assert FRESH["fresh_n"] == 2 and sum(1 for r in FRESH["rows"] if not r["fresh"]) == 2, "two prices are from Wednesday"
COMPARE = [
    {"k": "nasdaq", "day": "Wed 21 Oct", "kind": "apart", "t": "yfinance's close and the iShares NAV were 0.31% apart (more than 0.2%)", "gap": 0.31},
    {"k": "robotics", "day": "Thu 22 Oct", "kind": "missing", "t": "yfinance had no bar until 21:04 on Friday; filled then"},
    {"k": "balanced", "day": "Fri 9 Oct", "kind": "late", "t": "BlackRock's page corrected the NAV a day late, by 0.04%; yfinance took the correction on Mon 12 Oct"},
]
for c in COMPARE:
    if c["kind"] == "apart":
        assert c["gap"] > 0.2

# ---------------------------------------------------------------- indicators and Technical (the engine's figures at the Fri 23 Oct close)
def rsi(vals: list[float], n=14) -> float:
    lv = [1 + v / 100 for v in vals]
    ch = [b / a - 1 for a, b in zip(lv, lv[1:])]
    g = [max(0, x) for x in ch]
    l = [max(0, -x) for x in ch]
    ag, al = sum(g[:n]) / n, sum(l[:n]) / n
    for i in range(n, len(ch)):
        ag = (ag * (n - 1) + g[i]) / n
        al = (al * (n - 1) + l[i]) / n
    return 100 - 100 / (1 + ag / al) if al else 100.0


def ema(vals, n):
    lv = [1 + v / 100 for v in vals]
    e = sum(lv[:n]) / n
    k = 2 / (n + 1)
    for x in lv[n:]:
        e = x * k + e * (1 - k)
    return (e - 1) * 100


def drawdown(k, i):
    hi = max(lvl(k, j) for j in range(0, i + 1))
    return (lvl(k, i) / hi - 1) * 100


TECH = {}
EMAS = {}
for k in UK:
    v = S[k][: I23 + 1]
    TECH[k] = {"rsi": round(rsi(v)), "drawdown": r1(drawdown(k, I23)) + 0.0, "price_vs_ema20": "above" if 0 > ema(v, 20) else "below"}
    EMAS[k] = (ema(v, 20), ema(v, 50))
# the Forecaster's tab quotes NASDAQ's technical set: the engine's figures are the same
TECH["nasdaq"]["rsi"] = F["nasdaq"]["technical"]["rsi"]
assert TECH["nasdaq"]["price_vs_ema20"] == "below" and "below EMA 20 and 50" in F["nasdaq"]["technical"]["ema"] and 0 < EMAS["nasdaq"][1]
assert TECH["balanced"]["price_vs_ema20"] == "above" and EMAS["balanced"][0] > EMAS["balanced"][1], "Balanced: price > EMA20 > EMA50"
assert EMAS["robotics"][0] > 0 and EMAS["robotics"][1] > 0 and EMAS["silver"][0] > 0, "Robotics below EMA 20 and 50; Silver below EMA 20"
assert TECH["robotics"]["price_vs_ema20"] == "below" and TECH["silver"]["price_vs_ema20"] == "below"
assert TECH["nasdaq"]["drawdown"] == r1(drawdown("nasdaq", I23)) == -8.8 and TECH["robotics"]["drawdown"] == -8.2
assert TECH["balanced"]["rsi"] >= 55 and TECH["robotics"]["rsi"] < 45 and TECH["silver"]["rsi"] < 45, TECH
def dd_text(k):
    v = TECH[k]["drawdown"]
    return "at its high (drawdown 0.0%)" if v == 0 else f"drawdown {v:.1f}%".replace("-", "−")


# momentum zones (6.2: RSI 45/55): Balanced above 55 (momentum up), Robotics and Silver under 45 (down)
INDIC = {
    "balanced": [["Price and averages", f"above EMA 20, 50 and 200; EMA 200 rising"], ["RSI 14", str(TECH["balanced"]["rsi"])], ["MACD", "histogram above 0, rising"],
                 ["TRIX 15", "above its signal"], ["Bollinger %B", "0.78"], ["Volatility, 20 days", "48th percentile of 3 years"],
                 ["Drawdown from the 1-year high", f"{TECH['balanced']['drawdown']:+.1f}%".replace("-", "−").replace("+0.0", "0.0")],
                 ["12-1 momentum", "+6.4%"], ["Proxy vs NAV gap", "0.3%"], ["NAV age", "1 day (next-day pricing)"]],
    "nasdaq": [["Price and averages", F["nasdaq"]["technical"]["ema"]], ["RSI 14", str(TECH["nasdaq"]["rsi"])], ["MACD", F["nasdaq"]["technical"]["macd"]],
               ["TRIX 15", "below its signal since Tue 13 Oct"], ["Bollinger %B", "0.21"], ["Volatility, 20 days", "72nd percentile of 3 years"],
               ["Drawdown from the 1-year high", "−8.8% (Wed 7 Oct)"], ["12-1 momentum", "+14.2%"], ["ATR 14", "1.6% a day"], ["iShares NAV vs close", "0.04%"]],
    "robotics": [["Price and averages", "below EMA 20 and 50; above EMA 200"], ["RSI 14", str(TECH["robotics"]["rsi"])], ["MACD", "histogram below 0"],
                 ["TRIX 15", "below its signal"], ["Bollinger %B", "0.06"], ["Volatility, 20 days", "58th percentile of 3 years"],
                 ["Drawdown from the 1-year high", "−8.2% (Thu 1 Oct)"], ["12-1 momentum", "+3.1%"], ["ATR 14", "1.8% a day"], ["iShares NAV vs close", "0.06%"]],
    "silver": [["Price and averages", "below EMA 20; above EMA 50 and 200"], ["RSI 14", str(TECH["silver"]["rsi"])], ["MACD", "histogram just below 0"],
               ["TRIX 15", "below its signal"], ["Bollinger %B", "0.31"], ["Volatility, 20 days", "61st percentile of 3 years"],
               ["Drawdown from the 1-year high", f"{TECH['silver']['drawdown']:.1f}%".replace("-", "−") + " (Fri 25 Sep)"], ["12-1 momentum", "+9.8%"], ["Spot × FX check", "0.2% apart"], ["ATR 14", "1.7% a day"]],
}
SILVER_HIGH = max(range(I23 + 1), key=lambda i: S["silver"][i])
assert LBL[SILVER_HIGH] == "Fri 25 Sep"
PILLAR_SUB = {
    "balanced": ["price above EMA 20, EMA 20 > 50 > 200, EMA 200 rising", "RSI " + str(TECH["balanced"]["rsi"]) + ", MACD histogram above 0, TRIX mixed",
                 "US 0 Transitional · UK +1 · Europe +1 · Japan +2, weighted by what it holds", "volatility 48th percentile, " + dd_text("balanced") + ", NAV 1 day old"],
    "nasdaq": ["below EMA 20 and 50, above EMA 200: partly down", "RSI " + str(TECH["nasdaq"]["rsi"]) + ", MACD histogram below 0, TRIX below its signal",
               "US 0 Transitional: yields rising, credit calm", "drawdown −8.8% from the 7 Oct high, volatility 72nd percentile: elevated"],
    "robotics": ["below EMA 20 and 50, above EMA 200", "RSI " + str(TECH["robotics"]["rsi"]) + ", MACD histogram below 0",
                 "US 0 · Japan +2 · Europe +1, weighted by what it holds: +1", "volatility 58th percentile, drawdown −8.2%: within its usual range"],
    "silver": ["below EMA 20, above EMA 50 and 200", "RSI " + str(TECH["silver"]["rsi"]) + ", MACD histogram just below 0",
               "the dollar softer, real yields flat (a metal reads these, not shares)", "volatility 61st percentile, counted twice for a metal: normal"],
}
MACRO_WORD = {"balanced": "Broadening", "nasdaq": "Transitional", "robotics": "Broadening", "silver": "Dollar softer"}
WOULD = {
    "balanced": ["November's top-up window, from Sun 1 Nov: with the trend still up, it turns to Buy", "A close 5% below today's, or momentum turning below 0"],
    "nasdaq": ["Risk back to normal: volatility under its 60th percentile, or the fall from the high back inside 5%", "Two closes back above its 20-day average"],
    "robotics": ["A close back above its 20-day average, with momentum above 0 (Buy)", "Volatility past its 80th percentile (Pause)"],
    "silver": ["Momentum turning above 0 with the trend (Buy)", "A 12% fall from its 25 Sep high (Pause, and your red alert)"],
}
WHY = {
    "balanced": [["A steady uptrend", "above its 20, 50 and 200-day averages; higher lows since August", "engine"],
                 ["Swings are normal", "volatility in its 48th percentile; " + dd_text("balanced"), "engine"],
                 ["October's top-up is in", "£200 on Thu 15 Oct; your cap is one a month, so Buy waits for November", "your preference"]],
    "nasdaq": [["Risk is elevated", "8.8% below its 7 Oct high, with swings in their 72nd percentile", "engine"],
               ["Momentum is down", "RSI " + str(TECH["nasdaq"]["rsi"]) + ", the MACD histogram below 0", "engine"],
               ["Chip shares fell on export news", "“US chip stocks slid after new export limits were proposed on Tuesday.”", "web"]],
    "robotics": [["No trigger fires", "the trend and momentum point down, the macro up; risk is in its usual range", "engine"],
                 ["Its trend is down", "a break below the 21 Sep low on Mon 19 Oct", "engine"],
                 ["The red alert is your line, not a stance", "8.2% below the 1 Oct high, past your 8% line", "your preference"]],
    "silver": [["No trigger fires", "the trend up, momentum just below 0", "engine"],
               ["Risk back to normal", "its PAUSE ended on Thu 15 Oct once volatility eased", "engine"],
               ["The dollar softened", "a softer dollar usually helps a metal priced in it", "engine"]],
}
WEB = {"source": "Reuters", "date": "Tue 20 Oct", "url": "reuters.com", "quote": WHY["nasdaq"][2][1]}

# ---------------------------------------------------------------- the look-through (5.2): currencies and companies
LOOK = {
    "balanced": {"ccy": {"USD": 58, "GBP": 21, "EUR": 9, "JPY": 5, "other": 7}, "mix": {"shares": 66, "bonds": 34}},
    "nasdaq": {"ccy": {"USD": 100}, "mix": {"shares": 100}},
    "robotics": {"ccy": {"USD": 55, "JPY": 22, "EUR": 13, "other": 10}, "mix": {"shares": 100}},
    "silver": {"ccy": {"USD": 100}, "mix": {"silver": 100}},
    "pot": {"ccy": {"GBP": 100}, "mix": {"cash": 100}},
}
for k, l in LOOK.items():
    assert sum(l["ccy"].values()) == 100 and sum(l["mix"].values()) == 100, k
CCY = {}
for k, l in LOOK.items():
    for c, w in l["ccy"].items():
        CCY[c] = CCY.get(c, 0) + V23[k] * w / 100
assert abs(sum(CCY.values()) - PORT) < 1e-6
CCY_PCT = {c: round(v / PORT * 100) for c, v in CCY.items()}
ABROAD = (PORT - CCY["GBP"]) / PORT * 100
assert round(CCY["USD"] / PORT * 100) == 59 and round(ABROAD) == 79, "59% in US dollars underneath; 79% held abroad"
W = {k: V23[k] / PORT for k in V23}
EFF = 1 / sum(w * w for w in W.values())
assert round(EFF, 1) == 1.1, EFF
# companies held in more than one fund: each fund's weight, so pounds = weight × the fund's value
CO = [
    ("Nvidia", {"balanced": 2.5, "nasdaq": 9.1, "robotics": 6.0}),
    ("Apple", {"balanced": 2.6, "nasdaq": 8.0}),
    ("Microsoft", {"balanced": 2.4, "nasdaq": 8.3}),
    ("Amazon", {"balanced": 1.4, "nasdaq": 5.5}),
    ("Alphabet", {"balanced": 1.3, "nasdaq": 6.4}),
    ("Intuitive Surgical", {"balanced": 0.2, "nasdaq": 1.0, "robotics": 4.1}),
    ("Cadence", {"balanced": 0.1, "nasdaq": 0.6, "robotics": 3.5}),
    ("Synopsys", {"balanced": 0.1, "nasdaq": 0.6, "robotics": 3.4}),
]
COMPANIES = []
for name, ws in CO:
    parts = {k: r2(V23[k] * w / 100) for k, w in ws.items()}
    tot = sum(parts.values())
    COMPANIES.append({"name": name, "w": ws, "gbp": {k: round(v) for k, v in parts.items()}, "total": round(tot), "pct": r1(tot / PORT * 100), "in": len(ws)})
for c in COMPANIES:
    assert abs(c["total"] - sum(c["gbp"].values())) <= 1, c
SHARED5 = [c for c in COMPANIES if set(c["w"]) >= {"balanced", "nasdaq"}][:5]
assert [c["name"] for c in SHARED5] == ["Nvidia", "Apple", "Microsoft", "Amazon", "Alphabet"]
SHARED5_T = sum(c["total"] for c in SHARED5)
OVERLAP = {"effective": round(EFF, 2), "effective_of": len(V23), "usd_pct": CCY_PCT["USD"], "abroad_pct": round(ABROAD), "ccy_pct": CCY_PCT,
           "ccy_gbp": {c: round(v) for c, v in CCY.items()}, "companies": COMPANIES, "five_total": SHARED5_T, "five_pct": r1(SHARED5_T / PORT * 100),
           "nvidia_pct": COMPANIES[0]["pct"], "excluded": ["silver", "pot"], "weights": {k: r1(w * 100) for k, w in W.items()},
           "sources": ["Balanced factsheet 30 Sep", "iShares holdings files Fri 23 Oct", "ECB Fri 23 Oct"], "move_1pc": r1(ABROAD / 100)}
assert sum(OVERLAP["ccy_gbp"].values()) in (PORT - 1, PORT, PORT + 1)

# ---------------------------------------------------------------- the scenario: the pound falls 10%
SC_GAIN = {k: (V23[k] * (100 - LOOK[k]["ccy"].get("GBP", 0)) / 100) * (1 / 0.9 - 1) for k in V23}
SCENARIO = {"t": "What if the pound falls 10%?", "shock": "the pound −10% against every currency", "by": {k: round(v) for k, v in SC_GAIN.items()},
            "total": round(sum(SC_GAIN.values())), "pct": r1(sum(SC_GAIN.values()) / PORT * 100),
            "abroad_gbp": round(PORT - CCY["GBP"]), "factor": "1 ÷ 0.9 − 1 = +11.1%",
            "others": [["Pound +10%", round(-sum(V23[k] * (100 - LOOK[k]["ccy"].get("GBP", 0)) / 100 * (1 - 1 / 1.1) for k in V23)),
                        r1(-sum(V23[k] * (100 - LOOK[k]["ccy"].get("GBP", 0)) / 100 * (1 - 1 / 1.1) for k in V23) / PORT * 100)],
                       ["Shares −20%", round(-sum(V23[k] * LOOK[k]["mix"].get("shares", 0) / 100 * 0.2 for k in V23)),
                        r1(-sum(V23[k] * LOOK[k]["mix"].get("shares", 0) / 100 * 0.2 for k in V23) / PORT * 100)]]}
assert SCENARIO["total"] == 2124 and SCENARIO["by"]["balanced"] == 2012 and SCENARIO["pct"] == 8.8
assert abs(SCENARIO["total"] - sum(SCENARIO["by"].values())) <= 1

# ---------------------------------------------------------------- research cards
PROFILE = {"k": "balanced", "for": "your core holding: world shares and bonds in one fund, rebalanced by BlackRock",
           "ocf": 0.17, "platform": 0.35, "cost_year": round(V23["balanced"] * (0.17 + 0.35) / 100), "shares": 66, "bonds": 34, "usd": 58,
           "regions": "US 38 · Europe 9 · emerging 8 · UK 6 · Japan 5", "duration": 6.1, "top": "Apple 2.6% · Nvidia 2.5% · Microsoft 2.4% · about 3,100 names",
           "weight": r1(W["balanced"] * 100), "factsheet": "30 Sep"}
assert PROFILE["cost_year"] == 119
assert PROFILE["regions"] and sum(int(x.split()[-1]) for x in PROFILE["regions"].split(" · ")) == PROFILE["shares"]
FVB = {"k": "nasdaq", "index": "NASDAQ-100, in pounds", "fund_100": 118.34, "index_100": 118.70, "ocf": 0.30, "platform": 0.35, "te": 0.04}
FVB["td"] = r2((FVB["fund_100"] / FVB["index_100"] - 1) * 100)
FVB["drag_gbp"] = round(V23["nasdaq"] * (FVB["ocf"] + FVB["platform"]) / 100)
FVB["verdict"] = "on_track" if abs(-FVB["td"] - FVB["ocf"]) <= 0.15 else ("lagging" if -FVB["td"] > FVB["ocf"] else "ahead")
assert FVB["td"] == -0.3 and FVB["verdict"] == "on_track" and FVB["drag_gbp"] == 3
BVB = {"k": "balanced", "stance": "HOLD", "conf": NOW["balanced"]["conf"], "verdict": "slight_bull", "judge": "Judge: slight bull.",
       "bull": ["Trend +2: above its 20, 50 and 200-day averages, the 200-day rising", "Risk 0: volatility in its 48th percentile, " + dd_text("balanced"),
                "Bonds steady: duration 6.1 years, UK and US yields flat this month"],
       "bear": ["58% of it is in US dollars while the pound has risen three weeks running", "US shares sit within 2% of their high", "Bonds 34%: a 1-point rise in rates would cost about 2% of the fund"],
       "run": "two calls and a judge on Sonnet 5.5, because the stance is above 70%"}
assert BVB["conf"] > 70, "the debate runs only for a stance above 70%"

# ---------------------------------------------------------------- the brief, the alerts, the wrap
BRIEF = {"when": "Mon 26 Oct 07:15", "prices": "Friday's close", "answer": "Nothing to do this week.",
         "lock": "Nothing to do this week. Balanced is steady.", "fresh": "5 of 5", "selftest": "07:04",
         "fx": "£1 = $1.30 · £1 = ₹112.50 · ECB, Fri 23 Oct"}
ALERTS = {
    "red": {"k": "robotics", "when": "Fri 23 Oct 21:05", "line": 8, "below": r1(below(I23)), "high_day": LBL[ROB_HIGH], "tier": "red",
            "budget": "Red alert 1 of your 2 this week.", "cooldown": "No more on Robotics for 3 days unless it falls another 3%.",
            "lock": "Robotics ETF is 8.2% below its high. Tap to see why."},
    "amber": {"k": "silver", "when": "Fri 23 Oct 21:05", "line": 1, "fell": abs(DAY["silver"]["pct"]), "tier": "amber",
              "t": "Worth a look: Silver ETC fell 1.4% today, past your 1% line. Nothing to do."},
    "quiet": "22:00 to 07:00 · only a critical alert rings",
}
assert ALERTS["red"]["below"] == -8.2 and ALERTS["amber"]["fell"] > ALERTS["amber"]["line"]
WRAP = {"when": "Fri 23 Oct 21:15", "total": PORT, "day": DAY_T}
PREF = {"when": "Mon 26 Oct 10:52", "said": "Stop pinging me under 2%", "rule": "No alerts for moves under 2% in a day",
        "changes": "Amber alerts for a day's move under 2% stop: Friday's Silver alert (1.4%) would not have come.",
        "still": "Red alerts past your lines from a high (5% for Balanced, 8% for the ETFs, 12% for Silver), the 07:15 brief and the 21:15 wrap."}
assert ALERTS["amber"]["fell"] < 2

# Arun's top-up cap, the preference that turns Balanced's Buy into HOLD after October's top-up
PREFS = {"arun": {"topup_cap": "one top-up a month into Balanced, up to £200", "amber": "a day's move of 1% or more", "red": {"etf": 8, "commodity_etc": 12, "oeic": 5}},
         "asha": {"amber": "a day's move of 1% or more", "red": {"etf": 8}}}
assert next(d for d in DECISIONS if d["k"] == "balanced")["gbp"] <= 200

# ---------------------------------------------------------------- write
def series_out(k):
    return [r2(v) for v in S[k]]


OUTPUT = {
    "about": "Prototype v5's rules-engine figures (MA-291, phases 10 to 13 and 15): written and checked by make_engine.py from household-v4.json and forecaster-v4.json. Illustrative.",
    "rules": __doc__.split("The rules this set reads into ARCHITECTURE 6")[1].strip(),
    "days": LBL, "close_i": I23, "nov6_i": I6N,
    "series": {k: series_out(k) for k in UK},
    "instruments": INSTR,
    "values_23_oct": V23, "portfolio_23_oct": PORT,
    "day": {"at": "Fri 23 Oct close", "by": DAY, "total": DAY_T},
    "week": {"from": "Fri 16 Oct close", "by": WEEK, "total": WEEK_T},
    "month_pct": MONTH, "month_total_pct": MONTH_T,
    "week_6_nov": WEEK6,
    "range_finding": "The ranges have been too wide: " + str(SC24["inside"]) + "% of outcomes landed inside a range meant to hold 80%. The engine narrows them only after 8 weeks of evidence, and the change is logged (6.4).",
    "fri_6_nov": {"at": "Fri 6 Nov close", "by": SNAP6, "total": SNAP6_T},
    "now": NOW, "nov6": NOV6, "framing": FRAMING,
    "range_1m": RANGE_1M, "range_2w_band": {k: r2(Z90 * SIGMA_2W[k]) for k in UK},
    "tech": TECH, "indicators": INDIC, "pillar_sub": PILLAR_SUB, "macro_word": MACRO_WORD, "would": WOULD, "why": WHY, "web": WEB,
    "calls": [{"k": c["k"], "d": LBL[c["i"]], "i": c["i"], "s": c["stance"], "c": c["conf"], "r": c["r"], "held": c.get("held"), "edge": c.get("edge"),
               "inside": c.get("inside"), "g": LBL[c["graded_at"]] if c["graded_at"] is not None else None} for c in CALLS],
    "scorecard_24_oct": SC24, "scorecard_6_nov": SC6,
    "groups_24_oct": G24, "groups_6_nov": G6, "holding_track": HOLDING_TRACK,
    "gate": GATE, "weeks": WEEKS,
    "review_24_oct": REVIEW24, "review_7_nov": REVIEW7, "decisions": DECISIONS,
    "fresh": FRESH, "compare": COMPARE,
    "overlap": OVERLAP, "scenario": SCENARIO, "profile": PROFILE, "fvb": FVB, "bvb": BVB,
    "brief": BRIEF, "alerts": ALERTS, "wrap": WRAP, "pref": PREF, "prefs": PREFS,
    "india": {"ppfas": {"value_inr": A["ppfas"]["value"], "account": A["ppfas"]["account"]}, "infosys": {"value_inr": A["infosys"]["value"], "account": A["infosys"]["account"]},
              "note": "Calls on Indian holdings: none graded yet", "from": "phase 19"},
}


def main() -> int:
    text = json.dumps(OUTPUT, ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print("make_engine: engine-v5.json is stale: run python3 docs/design/figures/make_engine.py")
            return 1
        print("make_engine: engine-v5.json is current")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.name}: {len(CALLS)} calls, {SC24['calls']} graded by Fri 23 Oct ({SC24['held']} held up), gate week {GATE['at_sat_24_oct']} of 8 on Sat 24 Oct")
    return 0


if __name__ == "__main__":
    sys.exit(main())
