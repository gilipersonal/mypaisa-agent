"""Write docs/design/figures/news-share-v5.json, Prototype v5's figures for phases 14 and 16 (MA-291).

Phase 14, news, events and sentiment (in shadow), as ARCHITECTURE 11, 19.3 and 6.3 describe them, on Mon 26 Oct 2026:
- the night's stories, de-duplicated, scored by Haiku through Batches, and matched to each holding by its exposure
  map in code (a story's weight on a holding is the holding's exposure to what the story names; under the floor it
  is dropped), each with the measured past effect of its event type on that holding;
- the events calendar for the Forecaster's next four weeks (Mon 26 Oct to Fri 20 Nov): MPC, FOMC, ECB, CPI, the
  earnings of the top holdings, and an election (19.2), and later the next results of the one share held;
- the daily sentiment index ("News mood"), per holding and for the household, and the tilt it would make in
  shadow: one notch on Buy, Hold, Pause, only when the price pillars lean the same way (6.3).

Phase 16, new kinds of holding (PLAN phase 16; ARCHITECTURE 4.3, 4.4, 4.8, 7):
- how the iShares NASDAQ 100 ETF (Asha's, from Monzo's range) is priced like the funds (MA-98);
- the stock kind, proposed from the templates and approved behind the second check (propose_kind), with its
  cautious temperament: results block changes to a share's call for two sessions;
- Infosys (Arun's NSE share, household-v4) at the Fri 23 Oct close: its valuation snapshot and its earnings
  analysis (MA-99), worked out here from the quarters and the balance sheet, with the fundamentals source not chosen.

It reads household-v4.json and forecaster-v4.json and never changes them; every value it shares with them is checked
against them, and every claim the boards make is asserted over these figures (lesson 38). Every name, story and figure
is illustrative.

Run: python3 docs/design/figures/make_news_share.py   (writes news-share-v5.json beside it)
     then python3 docs/design/figures/make_prototype_v5.py
"""
import datetime as dt
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "news-share-v5.json"
H = json.loads((HERE / "household-v4.json").read_text(encoding="utf-8"))
F = json.loads((HERE / "forecaster-v4.json").read_text(encoding="utf-8"))
ENGINE = HERE / "engine-v5.json"
ENG = json.loads(ENGINE.read_text(encoding="utf-8")) if ENGINE.exists() else None
FX = H["clock"]["fx"]["gbp_inr"]
DAYS = "Mon Tue Wed Thu Fri Sat Sun".split()
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def day(iso: str, year: bool = False) -> str:
    """'2026-10-28' -> 'Wed 28 Oct' (with the year when asked, for a date the boards would otherwise read as 2026 or 2027)."""
    d = dt.date.fromisoformat(iso)
    return f"{DAYS[d.weekday()]} {d.day} {MONTHS[d.month - 1]}" + (f" {d.year}" if year else "")


def check_label(label: str, iso: str) -> None:
    assert label.startswith(day(iso)), f"{label!r} is not {day(iso)!r}"


def asset(rid: str) -> dict:
    return next(a for a in H["assets"] if a["id"] == rid)


# ---------------------------------------------------------------- the clock
assert H["clock"]["today_label"] == "Mon 26 Oct" and H["clock"]["prices_label"] == "Fri 23 Oct close"
assert F["clock"]["next_four_weeks"] == "Mon 26 Oct to Fri 20 Nov"
TODAY, WINDOW_END = "2026-10-26", "2026-11-20"
clock = {
    "today": "Mon 26 Oct 2026", "prices": "Fri 23 Oct close", "brief": "07:15",
    "scored": "Mon 26 Oct 08:32", "sent": "Mon 26 Oct 08:33", "window": F["clock"]["next_four_weeks"],
}

# ---------------------------------------------------------------- the holdings the news is matched to (UK, the engine's)
UK = ["balanced", "nasdaq", "robotics", "silver"]
NAMES = {"balanced": "Balanced", "nasdaq": "NASDAQ 100 ETF", "robotics": "Robotics ETF", "silver": "Silver ETC"}
VALUE = {h: asset(h)["value"] for h in UK}
assert VALUE == {"balanced": 22925, "nasdaq": 512, "robotics": 304, "silver": 188}
# the rules engine's calls at the Fri 23 Oct close (forecaster-v4; contract)
STANCE = {"nasdaq": ("PAUSE", F["nasdaq"]["rules"]["conf"]), "balanced": ("HOLD", F["balanced"]["rules"]["conf"])}
for c in F["review"]["cards"]:
    code, conf = c["rules"].split(" · ")
    key = {"Robotics ETF": "robotics", "Silver ETC": "silver", "NASDAQ 100 ETF": "nasdaq"}[c["name"]]
    STANCE.setdefault(key, (code, int(conf.rstrip("%"))))
assert STANCE == {"nasdaq": ("PAUSE", 64), "balanced": ("HOLD", 71), "robotics": ("HOLD", 58), "silver": ("HOLD", 62)}

# Each holding's exposure map (ARCHITECTURE 19.3), only the entries the night's stories name. A fund or ETF's sector
# and currency weights come from its holdings file (look-through); a commodity ETC's from its fixed list of drivers,
# equally weighted: silver has gold's four (real yields, the dollar, central-bank buying, geopolitical stress) and
# industrial demand, so real yields and the dollar together are 2 of 5.
SILVER_DRIVERS = ["real yields", "the dollar", "central-bank buying", "geopolitical stress", "industrial demand"]
EXPOSURE = {
    "nasdaq": {"chipmakers": 0.19, "US rates": 1.00, "UK shoppers": 0.0, "Gulf shipping": 0.01},
    "robotics": {"chipmakers": 0.16, "US rates": 0.48, "UK shoppers": 0.0, "Gulf shipping": 0.01},
    "balanced": {"chipmakers": 0.03, "US rates": 0.58, "UK shoppers": 0.04, "Gulf shipping": 0.03},
    "silver": {"chipmakers": 0.0, "US rates": 2 / 5, "UK shoppers": 0.0, "Gulf shipping": 1 / 5},
}
EXPOSURE_WHY = {
    "nasdaq": {"chipmakers": "chipmakers are 19% of it (Nvidia, Broadcom and others)", "US rates": "all of it is in US dollars, in US shares"},
    "robotics": {"chipmakers": "chipmakers are 16% of it", "US rates": "48% of it is in US dollars"},
    "balanced": {"US rates": "58% of it is in US dollars underneath, shares and bonds", "UK shoppers": "UK shops are 4% of it", "Gulf shipping": "shipping and energy are 3% of it", "chipmakers": "chipmakers are 3% of it"},
    "silver": {"US rates": "real yields and the dollar are 2 of its 5 drivers", "Gulf shipping": "geopolitical stress is 1 of its 5 drivers"},
}
if ENG:   # the Engine's look-through says the same: Balanced 58% in US dollars, Nvidia 9.1% of the NASDAQ 100 ETF and 2.5% of Balanced
    assert round(EXPOSURE["balanced"]["US rates"] * 100) == ENG["profile"]["usd"] == 58
    nv = next(c for c in ENG["overlap"]["companies"] if c["name"] == "Nvidia")["w"]
    assert nv["nasdaq"] == 9.1 and nv["balanced"] / 100 < EXPOSURE["balanced"]["chipmakers"] + 1e-9 and nv["robotics"] / 100 < EXPOSURE["robotics"]["chipmakers"]
assert abs(EXPOSURE["silver"]["US rates"] - 2 / len(SILVER_DRIVERS)) < 1e-9 and abs(EXPOSURE["silver"]["Gulf shipping"] - 1 / len(SILVER_DRIVERS)) < 1e-9
FLOOR = 0.05

# ---------------------------------------------------------------- the night's stories
# Collected overnight from the RSS feeds and GDELT (19.2), de-duplicated (MA-86), scored by Haiku through Batches
# (MA-87, 19.3): each story's entities, its event type (19.4) and the direction it points for each holding it
# reaches (code reads the sign from the exposure map: geopolitical stress lifts silver, as a haven).
# The night's run stopped on one story (the Team's inc-7: the news scout silent from 03:12, the story skipped and the
# run done again at 08:31), so the matches reach the chat after the 07:15 brief, at 08:33, and that story is left out.
COLLECTED, DUPLICATES, SKIPPED = 214, 61, 1
SCORED = COLLECTED - DUPLICATES - SKIPPED
TEAM = HERE / "team-india-v5.json"
if TEAM.exists():
    inc = json.loads(TEAM.read_text(encoding="utf-8"))["team"]["incident"]
    assert inc["id"] == "inc-7" and inc["skipped"] == "2026-10-26T08:31" and "news scout" in inc["title"]
    assert "2026-10-26T08:32" > inc["skipped"], "the night's stories are scored after the run done again"
STORIES = [
    {"id": "chips", "headline": "US adds chipmaking tools to its export curbs on China", "published": "Sat 24 Oct 14:05",
     "event": "Tariffs", "names": "chipmakers", "entities": ["Nvidia", "Broadcom", "Applied Materials", "chipmakers", "US", "China"],
     "direction": {"nasdaq": -0.7, "robotics": -0.7, "balanced": -0.7}},
    {"id": "yields", "headline": "The US 10-year yield ends the week at a three-month high; markets trim bets on a cut on Wednesday",
     "published": "Fri 23 Oct 22:10", "event": "Rate surprise", "names": "US rates",
     "entities": ["Federal Reserve", "US Treasury yields", "US dollar"],
     "direction": {"nasdaq": -0.3, "robotics": -0.3, "balanced": -0.3, "silver": -0.3}},
    {"id": "shipping", "headline": "Attacks on shipping in the Red Sea resume; insurers raise their rates", "published": "Sun 25 Oct 19:40",
     "event": "Conflict", "names": "Gulf shipping", "entities": ["Red Sea", "shipping", "oil", "geopolitical stress"],
     "direction": {"silver": 0.6, "nasdaq": -0.4, "robotics": -0.4, "balanced": -0.4}},
    {"id": "retail", "headline": "UK retail sales beat forecasts in September", "published": "Fri 23 Oct 07:00",
     "event": "none", "names": "UK shoppers", "entities": ["UK", "retailers"], "direction": {"balanced": 0.3}},
]
for s in STORIES:
    d, mon = s["published"].split()[1:3]
    check_label(s["published"], f"2026-{MONTHS.index(mon) + 1:02d}-{int(d):02d}")

# The measured past effect of each event type on each holding: 4 weeks after, the average, over the cases since 2015
# (19.4, event studies). The NASDAQ 100 ETF's and Balanced's are forecaster-v4's own; the Robotics ETF's and the
# Silver ETC's come from the same lab over the same events, so their case counts are the NASDAQ 100 ETF's.
STUDY = {h: {e[0]: {"cases": e[1], "avg": e[2], "low": e[3]} for e in F[h]["events"]} for h in ("nasdaq", "balanced")}
STUDY["robotics"] = {"Tariffs": {"cases": 11, "avg": -3.4, "low": False}, "Rate surprise": {"cases": 14, "avg": -2.6, "low": False}}
STUDY["silver"] = {"Rate surprise": {"cases": 14, "avg": -1.8, "low": False}, "Conflict": {"cases": 9, "avg": 1.9, "low": False}}
for h in ("robotics", "silver"):
    for ev, st in STUDY[h].items():
        assert st["cases"] == STUDY["nasdaq"][ev]["cases"], f"{h} {ev}: the same events, so the same cases"
# Balanced's Rate surprise is forecaster-v4's
assert STUDY["balanced"]["Rate surprise"] == {"cases": 14, "avg": -0.6, "low": False}

stories = []
for s in STORIES:
    matches, dropped = [], []
    for h in UK:
        w = EXPOSURE[h][s["names"]]
        if w <= 0:
            continue
        row = {"holding": h, "name": NAMES[h], "weight": round(w, 2), "direction": s["direction"].get(h, 0.0),
               "via": EXPOSURE_WHY[h].get(s["names"], "")}
        if w >= FLOOR:
            st = STUDY[h].get(s["event"])
            row["past"] = st and {"event": s["event"], **st}
            matches.append(row)
        else:
            dropped.append(row)
    matches.sort(key=lambda r: -r["weight"])
    stories.append({**{k: s[k] for k in ("id", "headline", "published", "event", "entities")},
                    "matches": matches, "under_floor": dropped, "matched": bool(matches),
                    "main": matches[0]["holding"] if matches else None})
matched = [s for s in stories if s["matched"]]
assert len(matched) == 3, "the brief says 3 stories touch your holdings today"
assert [s["id"] for s in matched] == ["chips", "yields", "shipping"]
for s in matched:
    assert s["matches"][0]["past"], f"{s['id']}: its main holding has a measured past effect"
# the chip story reaches the NASDAQ 100 ETF through its chipmakers' weight, and the Robotics ETF; Balanced is under the floor
chips = stories[0]
assert [m["holding"] for m in chips["matches"]] == ["nasdaq", "robotics"] and chips["under_floor"][0]["holding"] == "balanced"
assert chips["matches"][0]["past"] == {"event": "Tariffs", "cases": 11, "avg": -2.6, "low": False}
shipping = stories[2]
assert [m["holding"] for m in shipping["matches"]] == ["silver"] and shipping["main"] == "silver"
assert {m["holding"] for m in shipping["under_floor"]} == {"nasdaq", "robotics", "balanced"}
assert stories[3]["matches"] == [] and stories[3]["under_floor"][0]["weight"] < FLOOR

# ---------------------------------------------------------------- the daily sentiment index (News mood), in shadow
idx = {}
for h in UK:
    pairs = [(m["weight"], m["direction"]) for s in matched for m in s["matches"] if m["holding"] == h]
    idx[h] = round(sum(w * d for w, d in pairs) / sum(w for w, _ in pairs), 2) if pairs else 0.0
house = round(sum(VALUE[h] * idx[h] for h in UK) / sum(VALUE.values()), 2)
assert idx == {"nasdaq": -0.36, "robotics": -0.4, "balanced": -0.3, "silver": 0.0}, idx
assert house == -0.3, house

# three weeks of indices (PLAN phase 14's exit), each weekday from Mon 5 Oct to today, the last today's
d0 = dt.date(2026, 10, 5)
weekdays = [d0 + dt.timedelta(days=i) for i in range(22) if (d0 + dt.timedelta(days=i)).weekday() < 5]
HISTORY = [0.14, 0.11, 0.08, 0.02, -0.04, -0.09, -0.12, -0.18, -0.16, -0.21, -0.19, -0.24, -0.22, -0.27, -0.25, house]
assert len(weekdays) == len(HISTORY) == 16 and weekdays[-1].isoformat() == TODAY
history = [{"d": w.isoformat(), "day": day(w.isoformat()), "v": v} for w, v in zip(weekdays, HISTORY)]

# The tilt (6.3, MA-89): sentiment may move a call one notch, on Buy · Hold · Pause, only when the price pillars do not
# contradict it; in shadow it is written and graded, never shown in a call. The price pillars' lean is the rules
# engine's trend and momentum together (the Engine's figure set, when it is there, must say the same).
NOTCH = ["ADD", "HOLD", "PAUSE"]
LEAN = {"nasdaq": -1, "robotics": -1, "balanced": 1, "silver": 0}
LEAN_WHY = {"nasdaq": "trend and momentum both lean down", "robotics": "momentum is fading", "balanced": "trend and momentum lean up",
            "silver": "trend and momentum point different ways"}
if ENG:
    for h, lean in LEAN.items():
        p = ENG["now"][h]["pillars"]
        s = p["trend"] + p["momentum"]
        assert (s > 0) - (s < 0) == lean, f"{h}: the Engine's trend and momentum lean {s}, the tilt says {lean}"
        assert (ENG["now"][h]["stance"], ENG["now"][h]["conf"]) == STANCE[h]
tilt = []
for h in ["nasdaq", "robotics", "balanced", "silver"]:
    code, conf = STANCE[h]
    news = idx[h]
    sign = (news > 0) - (news < 0)
    if sign == 0:
        out, why = code, "the news cancels out: nothing to tilt"
    elif LEAN[h] != sign:
        out, why = code, f"the news leans {'down' if sign < 0 else 'up'}, but {LEAN_WHY[h]}: no tilt"
    else:
        i = max(0, min(len(NOTCH) - 1, NOTCH.index(code) - sign))
        out = NOTCH[i]
        why = (f"the news and the price pillars both lean {'down' if sign < 0 else 'up'}: one notch, "
               + (f"{code} would be {out}" if out != code else f"and {code} is already as far as a tilt goes"))
    tilt.append({"holding": h, "name": NAMES[h], "stance": code, "conf": conf, "news": news, "lean": LEAN[h], "would_be": out, "why": why})
T = {t["holding"]: t for t in tilt}
assert T["robotics"]["would_be"] == "PAUSE" and T["robotics"]["stance"] == "HOLD"
assert T["nasdaq"]["would_be"] == "PAUSE" and T["balanced"]["would_be"] == "HOLD" and T["silver"]["would_be"] == "HOLD"
assert sum(t["would_be"] != t["stance"] for t in tilt) == 1, "one call would move, in shadow"

# ---------------------------------------------------------------- the events calendar, the next four weeks
def past(h: str, ev: str) -> dict:
    st = STUDY[h][ev]
    return {"holding": h, "name": NAMES[h], "event": ev, **st}


ABROAD = ENG["overlap"]["abroad_pct"] if ENG else 79   # the Engine's look-through: the share of the £24,110 held abroad underneath
assert ABROAD == 79
EVENTS = [
    {"d": "2026-10-28", "tm": "18:00", "kind": "FOMC", "t": "FOMC: the Fed's rate decision",
     "touches": ["nasdaq", "robotics", "balanced", "silver"], "why": "it moves US rates and the dollar, under all four of your funds and ETFs",
     "past": past("nasdaq", "Rate surprise")},
    {"d": "2026-10-28", "tm": "after the US close", "kind": "Earnings", "t": "Results: Microsoft, Alphabet and Meta",
     "touches": ["nasdaq"], "why": "three of the NASDAQ 100 ETF's top holdings, 18% of it", "past": past("nasdaq", "Earnings miss")},
    {"d": "2026-10-29", "tm": "13:15", "kind": "ECB", "t": "ECB: the euro area's rate decision",
     "touches": ["balanced", "robotics"], "why": "it moves the euro, under Balanced's European shares and bonds", "past": past("balanced", "Rate surprise")},
    {"d": "2026-10-29", "tm": "after the US close", "kind": "Earnings", "t": "Results: Apple and Amazon",
     "touches": ["nasdaq"], "why": "two of the NASDAQ 100 ETF's top holdings, 14% of it", "past": past("nasdaq", "Earnings miss")},
    {"d": "2026-11-03", "tm": "all day", "kind": "Election", "t": "US midterm elections",
     "touches": ["nasdaq", "robotics"], "why": "US shares and the dollar", "past": past("nasdaq", "Election")},
    {"d": "2026-11-05", "tm": "12:00", "kind": "MPC", "t": "MPC: the Bank of England's rate decision",
     "touches": ["balanced", "nasdaq", "robotics", "silver"], "why": f"it moves the pound, so the {ABROAD}% of your funds and ETFs held abroad underneath, and every rupee",
     "past": past("balanced", "Rate surprise")},
    {"d": "2026-11-12", "tm": "13:30", "kind": "CPI", "t": "US inflation (CPI), October",
     "touches": ["nasdaq", "robotics", "silver"], "why": "it moves US rates", "past": past("nasdaq", "Inflation surprise")},
    {"d": "2026-11-18", "tm": "after the US close", "kind": "Earnings", "t": "Results: Nvidia",
     "touches": ["nasdaq", "robotics"], "why": "the NASDAQ 100 ETF's largest holding, 9% of it, and a chipmaker the Robotics ETF holds",
     "past": past("nasdaq", "Earnings miss")},
]
for e in EVENTS:
    assert TODAY <= e["d"] <= WINDOW_END, e
    e["day"] = day(e["d"])
assert [e["kind"] for e in EVENTS].count("Earnings") == 3
assert {"MPC", "FOMC", "ECB", "CPI", "Earnings", "Election"} <= {e["kind"] for e in EVENTS}, "ARCHITECTURE 11 and 19.2's calendar"
assert EVENTS[5]["day"] == "Thu 5 Nov" and EVENTS[5]["tm"] == "12:00"
assert EVENTS[4]["past"]["low"] is True and EVENTS[4]["past"]["cases"] < 8, "an election: under 8 cases, low confidence"
# the top holdings named sum to the weights the rows give: Microsoft 8%, Alphabet 6%, Meta 4%; Apple 8%, Amazon 6%; Nvidia 9%
TOP = {"Microsoft": 0.083, "Alphabet": 0.064, "Meta": 0.036, "Apple": 0.080, "Amazon": 0.055, "Nvidia": 0.091}
if ENG:
    for c in ENG["overlap"]["companies"]:
        if c["name"] in TOP:
            assert round(TOP[c["name"]] * 100, 1) == c["w"]["nasdaq"], c["name"]
assert round((TOP["Microsoft"] + TOP["Alphabet"] + TOP["Meta"]) * 100) == 18
assert round((TOP["Apple"] + TOP["Amazon"]) * 100) == 14 and round(TOP["Nvidia"] * 100) == 9

# ---------------------------------------------------------------- phase 16: the ETF priced like the funds (MA-98)
NQ = asset("nasdaq")
etf = {
    "id": "nasdaq", "full": F["nasdaq"]["full"], "owner": "Asha", "wrapper": "ISA", "value_gbp": NQ["value"], "kind": "etf",
    "isin": "IE00B53SZB19", "line": "CNX1", "venue": "London", "ccy": "GBP", "other_line": "CNDX, in US dollars",
    "chain": ["yfinance (CNX1.L)", "Twelve Data's free tier", "iShares' own page"], "fallback": "the last price, marked stale",
    "paid": "EODHD only if every free source fails and the admin approves",
    "check": "iShares' NAV each day: more than 0.2% apart is shown on Activity",
    "look_through": "iShares' holdings file, daily: US large-cap shares, about half in the top ten, all in US dollars",
    "charge": "0.30% a year", "added": "from Monzo's “Build your own” range: /add read the ISIN and the ticker off its factsheet and asked which line",
    "like_funds": "the same chain, checks and flags as Balanced: a late or disagreeing price is marked provisional and shown on Activity, never guessed",
    "priced": "Fri 23 Oct close",
}
assert etf["value_gbp"] == F["nasdaq"]["value_gbp"] == 512 and F["nasdaq"]["kind"] == "ETF"
if ENG:   # the Engine's chain for the same ETF: yfinance, Twelve Data, the issuer's page, then stale
    I = ENG["instruments"]["nasdaq"]
    assert I["isin"] == etf["isin"] and I["ticker"] == etf["line"] and I["chain"] == ["yfinance", "twelvedata", "issuer_page", "stale"]
    assert any(c["k"] == "nasdaq" and "0.2%" in c["t"] for c in ENG["compare"])

# ---------------------------------------------------------------- phase 16: the stock kind, behind the second check
kind = {
    "kind": "stock", "version": 1, "proposed": "Sun 25 Oct 17:41", "approved": "Sun 25 Oct 17:42", "by": "Arun",
    "check": "a fresh Sign in with Apple, with Face ID", "tool": "propose_kind",
    "rows": [
        ["Price", "the exchange's close, daily (NSE for Infosys)"],
        ["Look-through", "the company itself: its sector, its country, its currency"],
        ["Engine", "every pillar, and Valuation; the valuation and earnings cards"],
        ["Temperament", "cautious: single-name risk raises the bar for Buy, and results block changes to its call for two sessions"],
        ["Events", "bought, sold, dividend, split, bonus"],
    ],
}
check_label(kind["approved"], "2026-10-25")

# ---------------------------------------------------------------- phase 16: Infosys, valuation and earnings (MA-99)
INF = asset("infosys")
assert INF["units"] * INF["price"] == INF["value"] == 177660 and INF["owners"] == [["arun", 100]] and INF["ccy"] == "INR"
SHARES_CR = 415.3                       # shares outstanding, crore
QUARTERS = [                            # (quarter, results day, revenue ₹ crore, EPS ₹, consensus EPS ₹)
    ("Q3 FY25", "2025-01-16", 41764, 15.43, 15.10),
    ("Q4 FY25", "2025-04-17", 40925, 16.98, 16.20),
    ("Q1 FY26", "2025-07-17", 42279, 16.43, 16.05),
    ("Q2 FY26", "2025-10-16", 44490, 17.76, 17.95),
    ("Q3 FY26", "2026-01-15", 45120, 16.10, 17.30),
    ("Q4 FY26", "2026-04-16", 44610, 17.20, 17.05),
    ("Q1 FY27", "2026-07-16", 46050, 16.30, 16.10),
    ("Q2 FY27", "2026-10-15", 47620, 16.70, 16.50),
]
quarters = []
for q, d, rev, eps, est in QUARTERS:
    assert dt.date.fromisoformat(d).weekday() == 3, f"{q}: results on a Thursday"
    quarters.append({"q": q, "d": d, "day": day(d, year=d < "2026-10-01"), "revenue_cr": rev, "eps": eps, "est": est, "beat": eps > est})
last4, prev4 = QUARTERS[-4:], QUARTERS[-8:-4]
eps_ttm = round(sum(q[3] for q in last4), 2)
rev_ttm, rev_prev = sum(q[2] for q in last4), sum(q[2] for q in prev4)
mcap_cr = INF["price"] * SHARES_CR
profit_cr = eps_ttm * SHARES_CR
BVPS, NET_CASH_CR, EBITDA_MARGIN, FCF_CR, DEBT_CR = 235.0, 40000, 0.24, 31500, 8800
equity_cr = BVPS * SHARES_CR
metrics = {
    "pe": round(INF["price"] / eps_ttm, 1),
    "ps": round(mcap_cr / rev_ttm, 2),
    "pb": round(INF["price"] / BVPS, 1),
    "ev_ebitda": round((mcap_cr - NET_CASH_CR) / (rev_ttm * EBITDA_MARGIN), 1),
    "fcf_yield": round(FCF_CR / mcap_cr * 100, 1),
    "roe": round(profit_cr / equity_cr * 100),
    "net_margin": round(profit_cr / rev_ttm * 100, 1),
    "debt_to_equity": round(DEBT_CR / equity_cr, 2),
}
SECTOR = {"pe": 24.0, "ps": 3.6, "ev_ebitda": 15.0, "fcf_yield": 4.6}   # Indian IT services, the median of the largest five
assert eps_ttm == 66.3 and metrics["pe"] == 22.3 and metrics["ps"] == 3.35 and metrics["ev_ebitda"] == 13.1
assert metrics["fcf_yield"] == 5.1 and metrics["roe"] == 28 and metrics["net_margin"] == 15.0 and metrics["pb"] == 6.3
# the verdict, in code: each measure against the sector (a yield the other way up), and the mean of the four
rel = {k: (metrics[k] / SECTOR[k]) if k != "fcf_yield" else (SECTOR[k] / metrics[k]) for k in SECTOR}
mean_rel = sum(rel.values()) / len(rel)
SCALE = [("very_cheap", 0.70), ("cheap", 0.85), ("fair", 1.15), ("expensive", 1.30), ("very_expensive", 99)]
verdict = next(v for v, top in SCALE if mean_rel < top)
assert verdict == "fair" and all(r < 1 for r in rel.values()), "fair, and a little below the sector on every measure"
PILLAR = {"very_cheap": 2, "cheap": 1, "fair": 0, "expensive": -1, "very_expensive": -2}
beats = sum(q["beat"] for q in quarters)
growth = round((rev_ttm / rev_prev - 1) * 100, 1)
e_verdict = ("strong_compounder" if beats >= 7 and growth > 10 else "consistent" if beats >= 6 and growth > 0
             else "mixed" if beats >= 4 else "volatile" if growth > 0 else "deteriorating")
assert beats == 6 and growth == 8.2 and e_verdict == "consistent"
# results come after the close; the stock temperament blocks changes to the call for the two sessions after
NEXT = "2027-01-14"
def sessions_after(iso: str, n: int = 2) -> list:
    out, d = [], dt.date.fromisoformat(iso)
    while len(out) < n:
        d += dt.timedelta(days=1)
        if d.weekday() < 5:
            out.append(d.isoformat())
    return out
blocked = sessions_after(NEXT)
assert [day(b) for b in blocked] == ["Fri 15 Jan", "Mon 18 Jan"] and day(NEXT) == "Thu 14 Jan"
last_blocked = sessions_after(QUARTERS[-1][1])
assert [day(b) for b in last_blocked] == ["Fri 16 Oct", "Mon 19 Oct"]
infosys = {
    "id": "infosys", "name": "Infosys", "exchange": "NSE", "owner": "Arun", "account": INF["account"],
    "units": INF["units"], "price": INF["price"], "value_inr": INF["value"], "value_gbp": round(INF["value"] / FX),
    "priced": "Fri 23 Oct close", "registered": "Sun 25 Oct 17:43", "generated": "Sun 25 Oct 17:43",
    "valuation": {"verdict": verdict, "scale": [v for v, _ in SCALE], "pillar": PILLAR[verdict], "metrics": metrics, "sector": SECTOR,
                  "sector_name": "Indian IT services (the median of the five largest)", "mean_rel": round(mean_rel, 2),
                  "one_liner": "Priced a little below Indian IT services on every measure: fair, not cheap."},
    "earnings": {"verdict": e_verdict, "scale": ["strong_compounder", "consistent", "mixed", "volatile", "deteriorating"],
                 "quarters": quarters, "beats": beats, "of": len(quarters), "eps_ttm": eps_ttm, "revenue_ttm_cr": rev_ttm,
                 "revenue_growth": growth, "last": {"q": QUARTERS[-1][0], "day": day(QUARTERS[-1][1]), "blocked": [day(b) for b in last_blocked]},
                 "next": {"day": day(NEXT), "note": "expected, to be confirmed by the company", "blocked": [day(b) for b in blocked]},
                 "one_liner": f"Beat the estimate in {beats} of the last {len(quarters)} quarters; revenue up {growth}% on the year before."},
    "sources": {"price": "NSE's close, Fri 23 Oct (yfinance INFY.NS)", "fundamentals": "not chosen yet: PLAN phase 16 decides the source when this card is built (EODHD Fundamentals would be £59.99 a month)"},
}
assert infosys["value_gbp"] == 1579

# the rules engine's calls go live when the gate passes (the Engine's figure set); until then they are in shadow
rules_live_from = ENG["gate"]["live_from"] if ENG else "Mon 9 Nov"
assert rules_live_from == "Mon 9 Nov"
check_label(rules_live_from, "2026-11-09")

# ---------------------------------------------------------------- write
out = {
    "about": "Prototype v5's news, events and sentiment (phase 14) and its new kinds of holding (phase 16), MA-291. Illustrative.",
    "clock": {**clock, "rules_live_from": rules_live_from, "rules_live_iso": "2026-11-09"},
    "news": {"collected": COLLECTED, "duplicates": DUPLICATES, "skipped": SKIPPED, "skipped_why": "the story the night's run stopped on, left out at 08:31 (inc-7)", "scored": SCORED, "floor": FLOOR, "matched": len(matched),
             "by": "Haiku, through Batches", "stories": stories, "study": STUDY},
    "sentiment": {"today": house, "by_holding": idx, "history": history, "tilt": tilt, "notch": NOTCH,
                  "weights": "each holding by its value at the Fri 23 Oct close"},
    "events": EVENTS,
    "later": [{"d": NEXT, "day": day(NEXT), "kind": "Earnings", "t": "Results: Infosys", "touches": ["infosys"],
               "why": "your one share; results block changes to its call for the two sessions after: " + " and ".join(day(b) for b in blocked)}],
    "etf": etf,
    "kind": kind,
    "infosys": infosys,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote {OUT.name}: {len(matched)} stories matched of {SCORED} scored, News mood {house:+.2f}, {len(EVENTS)} events, Infosys {verdict}, {e_verdict}")
