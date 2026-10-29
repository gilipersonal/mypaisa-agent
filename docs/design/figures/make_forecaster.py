"""The figures behind the Forecaster's iOS boards (MA-281): MA-193's household, its NASDAQ 100 ETF and its Balanced fund.

A design aid, not the product's engine (MA-119 to MA-124 and MA-280 are): it fixes the figures the boards show, so they
agree with each other and add up, and it checks them against its own data before writing them. It reads
household-v4.json (MA-193's figure set) for the holdings and the clock and never changes it. Every name, balance, price
and forecast is illustrative.

Run: python3 make_forecaster.py > forecaster-v4.json

The clock is household-v4's: Mon 26 Oct 2026, prices at the Fri 23 Oct close. The Forecaster ran on Sat 24 Oct at 06:10
on that close (model version 2026.10, trained on data to 30 Sep); the Saturday review went out at 09:00. Every holding's
Forecaster is in practice, week 5 of 8: weeks 1 to 5 beat both the base rate and the rules engine, weeks 6 to 8 are
graded on Fri 30 Oct, Fri 6 Nov and Fri 13 Nov. In practice it shows on the holding's Forecast tab and in the Saturday
review, labelled so, and in no weekday card or chat answer (Arun, 29 Oct 2026; ARCHITECTURE 19.6). The rules engine is
live (its 8-week gate passed long before, phase 15). Chart figures are percentages from the Fri 23 Oct close, so the
chart needs no price levels.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import random
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
H = json.loads((HERE / "household-v4.json").read_text())
ASSET = {a["id"]: a for a in H["assets"]}

CLOSE = dt.date.fromisoformat(H["clock"]["prices_as_of"])   # Fri 23 Oct 2026, the close every figure is on
HOLIDAYS = {dt.date(2026, 8, 31)}                            # the London Stock Exchange's summer bank holiday
WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
assert H["clock"]["today"] == "2026-10-26" and CLOSE.weekday() == 4


def day(d: dt.date) -> str:
    return f"{WD[d.weekday()]} {d.day} {MO[d.month - 1]}"


def trading_days(end: dt.date, n: int) -> list[dt.date]:
    out, d = [], end
    while len(out) < n:
        if d.weekday() < 5 and d not in HOLIDAYS:
            out.append(d)
        d -= dt.timedelta(days=1)
    return out[::-1]


def forward_days(start: dt.date, n: int) -> list[dt.date]:
    out, d = [], start
    while len(out) < n:
        d += dt.timedelta(days=1)
        if d.weekday() < 5 and d not in HOLIDAYS:
            out.append(d)
    return out


def path(days: list[dt.date], knots: dict[dt.date, float], seed: int, wiggle: float) -> list[float]:
    """Closes through the knots (straight between them), with a little seeded noise that vanishes at each knot."""
    ks = sorted(knots)
    rnd = random.Random(seed)
    out = []
    for d in days:
        a = max([k for k in ks if k <= d], default=ks[0])
        b = min([k for k in ks if k >= d], default=ks[-1])
        if a == b:
            out.append(knots[a])
            continue
        t = (d - a).days / (b - a).days
        base = knots[a] + (knots[b] - knots[a]) * t
        out.append(round(base + rnd.uniform(-wiggle, wiggle) * (1 - abs(2 * t - 1)), 2))
    return out


SUPPORT = -1.15   # the Wed 5 Aug low; no bar trades under it, and Thu 22 Oct comes back to it


def candles(days: list[dt.date], closes: list[float], seed: int, fixed: dict[dt.date, tuple[float, float, float, float]]) -> list[dict]:
    rnd = random.Random(seed)
    out, prev = [], closes[0] - 0.3
    for d, c in zip(days, closes):
        if d in fixed:
            o, h, l, c = fixed[d]
        else:
            o = round(max(prev + rnd.uniform(-0.25, 0.25), SUPPORT), 2)
            h = round(max(o, c) + rnd.uniform(0.1, 0.55), 2)
            l = round(max(min(o, c) - rnd.uniform(0.1, 0.55), SUPPORT), 2)
        out.append({"d": d.isoformat(), "day": day(d), "o": o, "h": h, "l": l, "c": c, "up": c >= o})
        prev = c
    return out


# ---- NASDAQ 100 ETF (Asha's, in her ISA): 60 trading days of candles to Fri 23 Oct ----
D60 = trading_days(CLOSE, 60)
assert dt.date(2026, 8, 31) not in D60 and all(d.weekday() < 5 for d in D60)
NQ_KNOTS = {
    D60[0]: 1.6, dt.date(2026, 8, 5): -1.0, dt.date(2026, 8, 20): 3.1, dt.date(2026, 9, 9): 5.2,
    dt.date(2026, 10, 1): 9.6, dt.date(2026, 10, 5): 6.6, dt.date(2026, 10, 7): 9.7, dt.date(2026, 10, 14): 6.0,
    dt.date(2026, 10, 19): 1.4, dt.date(2026, 10, 20): 0.2, dt.date(2026, 10, 21): -0.6, dt.date(2026, 10, 22): -0.9,
    CLOSE: 0.0,
}
NQ_FIXED = {  # the bars the patterns are read from: (open, high, low, close)
    dt.date(2026, 8, 5): (-0.55, -0.41, SUPPORT, -1.0),  # the support: the period's low
    dt.date(2026, 10, 1): (9.1, 10.0, 8.9, 9.6),         # the double top's first peak
    dt.date(2026, 10, 5): (8.95, 9.43, 6.2, 6.6),        # the trough between the peaks: its low is the neckline
    dt.date(2026, 10, 7): (9.2, 10.1, 9.0, 9.7),         # the second peak
    dt.date(2026, 10, 8): (9.6, 9.75, 8.8, 9.08),        # turns down from it
    dt.date(2026, 10, 14): (6.9, 7.1, 5.8, 6.0),         # the first close under the neckline
    dt.date(2026, 10, 19): (1.0, 1.9, 0.8, 1.4),
    dt.date(2026, 10, 20): (1.8, 2.0, 0.0, 0.2),         # a bearish engulfing; on this ETF it has no edge, so it is not shown
    dt.date(2026, 10, 21): (0.1, 0.4, -0.9, -0.6),
    dt.date(2026, 10, 22): (-0.5, -0.2, SUPPORT, -0.9),  # back to the support, and it holds
    CLOSE: (-0.8, 0.3, -1.0, 0.0),
}
NQ = candles(D60, path(D60, NQ_KNOTS, 7, 0.8), 11, NQ_FIXED)
BY_DAY = {c["day"]: c for c in NQ}

F20 = forward_days(CLOSE, 20)                 # the next four weeks: Mon 26 Oct to Fri 20 Nov


def fan(p10: float, p25: float, p50: float, p75: float, p90: float) -> list[dict]:
    """The likely range widening with the square root of time, to its four-week percentiles."""
    out = []
    for i, d in enumerate(F20, 1):
        s = (i / 20) ** 0.5
        out.append({"d": d.isoformat(), "p10": round(p10 * s, 2), "p25": round(p25 * s, 2), "p50": round(p50 * i / 20, 2),
                    "p75": round(p75 * s, 2), "p90": round(p90 * s, 2)})
    return out


# The double top: the two highest highs, the trough's low between them as the neckline, and the first close under it.
peaks = sorted(NQ, key=lambda c: -c["h"])[:2]
assert sorted(c["day"] for c in peaks) == ["Thu 1 Oct", "Wed 7 Oct"]
i1, i2 = sorted(NQ.index(c) for c in peaks)
NECKLINE = min(c["l"] for c in NQ[i1:i2 + 1])
assert NECKLINE == BY_DAY["Mon 5 Oct"]["l"] == 6.2
first_break = next(c for c in NQ[i2 + 1:] if c["c"] < NECKLINE)
assert first_break["day"] == "Wed 14 Oct"
# The support: no bar trades under it, no close is under -1%, and Thu 22 Oct comes back to it.
assert min(c["l"] for c in NQ) == SUPPORT and min(c["c"] for c in NQ) >= -1.0 and BY_DAY["Thu 22 Oct"]["l"] == SUPPORT
# Every bar is a bar.
for c in NQ:
    assert c["l"] <= min(c["o"], c["c"]) <= max(c["o"], c["c"]) <= c["h"], c

# Similar days (F4): the 30 days since 2015 most like today (ARCHITECTURE 19.4), each drawn from Friday's close over
# the next four weeks (every other trading day); 18 of them ended above where they started.
rnd = random.Random(30)
ENDS = sorted([round(rnd.uniform(-7.5, -0.4), 1) for _ in range(12)] + [round(rnd.uniform(0.3, 1.6), 1) for _ in range(2)]
              + [1.7, 1.9] + [round(rnd.uniform(2.0, 7.0), 1) for _ in range(14)])   # the middle two are 1.7 and 1.9
SIMILAR = []
for k, e in enumerate(ENDS):
    pts = [0.0]
    for i in range(2, 21, 2):
        pts.append(round(e * i / 20 + math.sin(i * 0.9 + k) * 0.7 * (1 - i / 20), 2))
    pts[-1] = e
    SIMILAR.append(pts)
MIDDLE = round(statistics.median(ENDS), 2)
assert len(ENDS) == 30 and sum(1 for e in ENDS if e > 0) == 18 and MIDDLE == 1.8

DRIVERS_NQ = [  # from the usual chance of being up to today's, in points; code's, Claude only names them
    ("Momentum fading", -4), ("US yields rising", -3), ("Chip export news", -2), ("Double top", -2),
    ("Calm credit spreads", +3), ("Support near −1%", +2), ("Earnings season", +1),
]
MOOD_NEXT_NQ = [("Stressed", 71), ("Choppy", 18), ("Falling", 7), ("Calm and rising", 4)]

nasdaq = {
    "name": "NASDAQ 100 ETF", "full": "iShares NASDAQ 100 UCITS ETF", "owner": "Asha", "wrapper": "ISA", "kind": "ETF",
    "value_gbp": ASSET["nasdaq"]["value"],
    "candles": NQ, "fan": fan(-7.0, -3.2, 0.3, 3.4, 6.0),
    "headline": {"up": 52, "fall5": 21, "fall5_usual": 12, "lo": -7, "hi": 6, "mid": 0.3, "inside": "8 times in 10"},
    "rules": {"stance": "PAUSE", "conf": 64, "line": "Keep what you have; delay new money until the next review"},
    "agree": "Both lean cautious: a fall over 5% is likelier than usual, and the rules engine says PAUSE.",
    "mood": {"now": "Stressed", "since": "Sat 3 Oct", "timeline": [("Calm and rising", "Jun"), ("Choppy", "Jul"),
             ("Calm and rising", "Aug"), ("Choppy", "Sep"), ("Stressed", "Oct")], "next": MOOD_NEXT_NQ},
    "similar": {"n": len(ENDS), "since": 2015, "recovered": sum(1 for e in ENDS if e > 0), "mid": MIDDLE,
                "ends": ENDS, "paths": SIMILAR},
    "events": [("Tariffs", 11, -2.6, False), ("Rate surprise", 14, -2.1, False), ("Inflation surprise", 22, -1.4, False),
               ("Conflict", 9, -1.2, False), ("Earnings miss", 31, -0.6, False), ("OPEC+ decision", 16, -0.2, False),
               ("Election", 6, 0.8, True)],
    "neckline": NECKLINE, "support": SUPPORT,
    "patterns": [  # F8 (MA-280): found by code on the daily candles; measured on this ETF since 2015, point in time
        {"name": "Double top", "kind": "chart",
         "where": f"peaks Thu 1 Oct and Wed 7 Oct, neckline +{NECKLINE:.1f}% broken {first_break['day']}",
         "cases": 9, "after": "20 days", "avg": -2.1, "lower": 6, "spread": "−8% … +4%", "edge": True},
        {"name": "Support near −1%", "kind": "chart", "where": "the Wed 5 Aug low, tested Thu 22 Oct",
         "cases": 14, "after": "20 days", "avg": 1.1, "held": 9, "spread": "−5% … +6%", "edge": True},
        {"name": "Bearish engulfing", "kind": "candle", "where": "Tue 20 Oct",
         "cases": 23, "after": "5 days", "avg": -0.3, "lower": 12, "spread": "−4% … +3%", "edge": False},
    ],
    "technical": {"adx": 27, "stoch": 18, "obv": "falling since 7 Oct", "ichimoku": "below the cloud since 15 Oct",
                  "donchian": "20-day low touched Thu 22 Oct", "keltner": "under the middle line",
                  "rsi": 38, "macd": "histogram below 0", "ema": "below EMA 20 and 50; above EMA 200"},
    "drivers": DRIVERS_NQ, "usual_up": 57,
    "track": {"rules": {"held": 31, "of": 46, "what": "calls on this holding held up"},
              "fc": {"week": 5, "of": 8, "beat": [True] * 5 + [None] * 3}},
    "run": "Sat 24 Oct 06:10", "model": "2026.10", "data_to": "30 Sep",
}

# ---- Balanced (Arun's OEIC): one NAV a day, so line patterns only, never candles ----
B60 = D60
TREND = (dt.date(2026, 8, 12), -3.1, dt.date(2026, 10, 9), -1.4)   # the rising trend line through the first and last low


def trend_at(d: dt.date) -> float:
    a, ya, b, yb = TREND
    return ya + (yb - ya) * (B60.index(d) - B60.index(a)) / (B60.index(b) - B60.index(a))


BAL_KNOTS = {B60[0]: -2.6, TREND[0]: TREND[1], dt.date(2026, 9, 3): -1.9, dt.date(2026, 9, 18): round(trend_at(dt.date(2026, 9, 18)), 2),
             dt.date(2026, 10, 2): -0.9, TREND[2]: TREND[3], dt.date(2026, 10, 21): -0.4, CLOSE: 0.0}
BAL = [{"d": d.isoformat(), "day": day(d), "nav": v} for d, v in zip(B60, path(B60, BAL_KNOTS, 3, 0.25))]
BAL_BY_DAY = {b["day"]: b for b in BAL}
for low in ("Wed 12 Aug", "Fri 18 Sep", "Fri 9 Oct"):   # the line passes through all three lows
    d = dt.date.fromisoformat(BAL_BY_DAY[low]["d"])
    assert abs(BAL_BY_DAY[low]["nav"] - trend_at(d)) < 0.01, low
assert all(b["nav"] >= trend_at(dt.date.fromisoformat(b["d"])) - 0.3 for b in BAL[B60.index(TREND[0]):B60.index(TREND[2]) + 1])

balanced = {
    "name": "Balanced", "full": ASSET["balanced"]["name"], "owner": "Arun", "wrapper": "ISA", "kind": "OEIC",
    "value_gbp": ASSET["balanced"]["value"],
    "nav": BAL, "trend": {"from": "Wed 12 Aug", "to": "Fri 9 Oct", "y_from": TREND[1], "y_to": TREND[3]},
    "fan": fan(-3.0, -1.2, 0.8, 2.4, 4.0),
    "headline": {"up": 61, "fall5": 4, "fall5_usual": 5, "lo": -3, "hi": 4, "mid": 0.8, "inside": "8 times in 10"},
    "rules": {"stance": "HOLD", "conf": 71, "line": "Nothing to do"},
    "agree": "Both lean the same way: steady, and the rules engine says HOLD.",
    "mood": {"now": "Calm and rising", "since": "Tue 15 Sep",
             "next": [("Calm and rising", 64), ("Choppy", 27), ("Stressed", 7), ("Falling", 2)]},
    "similar": {"n": 30, "since": 2015, "recovered": 21},
    "events": [("Rate surprise", 14, -0.6, False)],
    "drivers": [("Calm credit spreads", +2), ("Higher lows", +1)], "usual_up": 58,
    "technical": "no candles or volume: its moving averages and the trend line on its price",
    "patterns": [
        {"name": "Higher lows since August", "kind": "line", "where": "a rising trend line through Wed 12 Aug, Fri 18 Sep and Fri 9 Oct",
         "cases": 12, "after": "20 days", "avg": 0.9, "higher": 8, "spread": "−2% … +3%", "edge": True},
    ],
    "track": {"rules": {"held": 11, "of": 14, "what": "HOLD calls held up (ARCHITECTURE 9.2)"},
              "fc": {"week": 5, "of": 8, "beat": [True] * 5 + [None] * 3}},
    "nav_note": "One price a day, a day late (next-day pricing): no candles, so only the line patterns on its price.",
}
assert balanced["value_gbp"] == 22925

for h in (nasdaq, balanced):   # the headline is the fan's four-week end, and the drivers add up
    end = h["fan"][-1]
    assert (end["p10"], end["p90"], end["p50"]) == (h["headline"]["lo"], h["headline"]["hi"], h["headline"]["mid"]), h["name"]
for h in (nasdaq, balanced):
    assert h["usual_up"] + sum(v for _, v in h["drivers"]) == h["headline"]["up"], h["name"]
    assert sum(v for _, v in h["mood"]["next"]) == 100, h["name"]
    assert h["track"]["fc"]["beat"][:h["track"]["fc"]["week"]] == [True] * h["track"]["fc"]["week"], h["name"]

# ---- the chat's cards in the Saturday review, Sat 24 Oct 09:00, all in practice ----
NH = nasdaq["headline"]
review = {
    "when": "Sat 24 Oct 09:00",
    "cards": [
        {"name": nasdaq["name"], "rules": f"{nasdaq['rules']['stance']} · {nasdaq['rules']['conf']}%", "up": NH["up"],
         "fall5": NH["fall5"], "usual": NH["fall5_usual"], "lo": NH["lo"], "hi": NH["hi"],
         "mood": f"{nasdaq['mood']['now']}, since {nasdaq['mood']['since']}",
         "similar": f"{nasdaq['similar']['n']} since 2015; {nasdaq['similar']['recovered']} recovered within 4 weeks",
         "drivers": "momentum fading, US yields rising, chip export news",
         "pattern": "Double top: lower after 20 days in 6 of 9 cases", "state": "agree"},
        {"name": "Robotics ETF", "rules": "HOLD · 58%", "up": 44, "fall5": 34, "usual": 15, "lo": -11, "hi": 7,
         "mood": "Stressed, since Sat 3 Oct", "similar": "30 since 2015; 13 recovered within 4 weeks",
         "drivers": "momentum fading, chip export news", "pattern": "Breakdown below the Sep low: lower after 20 days in 7 of 10",
         "state": "disagree"},
        {"name": "Silver ETC", "rules": "HOLD · 62%", "up": 50, "fall5": 18, "usual": 17,
         "state": "no_view", "why": "Its chances are too close to the usual to count: 50% up, and 18% against a usual 17% for a fall over 5%."},
    ],
}

# ---- the proof page: the lab's first report (the rules engine, 2015 to 2026), the folds, the gate, the switch-off ----
proof = {
    "lab": {"span": "Jan 2015 to Sep 2026", "rows": [
        ("Yearly growth", "8.9%", "9.6%", "7.8%"), ("Worst fall", "−14%", "−31%", "−19%"),
        ("Worst year", "−6% (2022)", "−24% (2022)", "−11% (2022)"), ("Longest below a high", "9 months", "19 months", "13 months"),
        ("Calibration", "70% · 68%", "no calls", "none stated")],
        "cols": ("Rules engine", "Buy and hold", "Trend rule")},
    "folds": [("Fold 1", "2019", True), ("Fold 2", "2020", True), ("Fold 3", "2021", True), ("Fold 4", "2022", False),
              ("Fold 5", "2023", True), ("Final", "Oct 2024 to Sep 2026", True)],
    "models": [("Market mood", "F3", "in practice"), ("Four-week risk", "F3", "in practice"), ("Similar days", "F4", "in practice"),
               ("Event impacts", "F4", "in practice"), ("Patterns", "F8", "in practice"), ("Direction", "F5", "in practice")],
    "gate": {"week": 5, "of": 8, "next": ["Fri 30 Oct", "Fri 6 Nov", "Fri 13 Nov"]},
}
assert sum(1 for f in proof["folds"][:5] if f[2]) == 4
assert proof["lab"]["span"].endswith("Sep 2026") and proof["folds"][-1][1].endswith("Sep 2026")   # nothing past the data
assert [day(d) for d in forward_days(CLOSE, 15)[4::5]][:3] == proof["gate"]["next"]                # the next three Fridays

json.dump({"about": __doc__.strip().splitlines()[0], "clock": {"today": "Mon 26 Oct 2026", "close": day(CLOSE) + " 2026",
           "run": "Sat 24 Oct 06:10", "next_four_weeks": f"{day(F20[0])} to {day(F20[-1])}"},
           "nasdaq": nasdaq, "balanced": balanced, "review": review, "proof": proof},
          sys.stdout, indent=1, ensure_ascii=False)
sys.stdout.write("\n")
