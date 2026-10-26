"""The illustrative household behind every v4 board (MA-186): one figure set, computed, so the boards agree.

A design aid, not the product's engine: it fixes the figures the boards and the prototype show. Every name, balance
and account is illustrative. Run: python3 make_household.py > household-v4.json
"""
from __future__ import annotations

import json
import math
import random
from datetime import date

FX = 112.50          # ₹ per £, the ECB reference cross-rate of Fri 23 Oct 2026 (illustrative)
TODAY = date(2026, 10, 26)
CLOSE = date(2026, 10, 23)


def months_between(a: date, b: date) -> int:
    return (b.year - a.year) * 12 + (b.month - a.month)


def emi(p: float, annual: float, n: int) -> float:
    r = annual / 12
    return p * r * (1 + r) ** n / ((1 + r) ** n - 1)


def amortise(p: float, annual: float, n: int, start: date, until: date, extra: dict | None = None, pay: float | None = None):
    """Balance after the payments due up to and including `until`; extra = {date: amount} prepayments that shorten the term."""
    r = annual / 12
    pay = round(pay or emi(p, annual, n), 2)
    bal, k, interest_paid, last = p, 0, 0.0, None
    y, m = start.year, start.month
    while bal > 0.005:
        d = date(y, m, start.day)
        if d > until:
            break
        i = bal * r
        principal = min(pay - i, bal)
        bal -= principal
        interest_paid += i
        for when, amt in (extra or {}).items():
            if when.year == y and when.month == m:
                bal -= amt
        k += 1
        last = d
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return round(bal, 2), round(pay, 2), k, round(interest_paid, 2), last


def end_date(p: float, annual: float, n: int, start: date, extra: dict | None = None, pay: float | None = None) -> date:
    _, _, _, _, last = amortise(p, annual, n, start, date(2100, 1, 1), extra, pay)
    return last


def fd_maturity(p: float, annual: float, years: int, per_year: int = 4) -> float:
    return round(p * (1 + annual / per_year) ** (years * per_year))


def xirr(flows: list[tuple[date, float]]) -> float:
    def npv(rate: float) -> float:
        t0 = flows[0][0]
        return sum(v / (1 + rate) ** ((d - t0).days / 365.25) for d, v in flows)
    lo, hi = -0.99, 10.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if npv(mid) > 0:
            lo = mid
        else:
            hi = mid
    return round(mid, 4)


def inr(x: float) -> str:
    """Indian grouping: ₹11,53,620."""
    s = f"{int(round(x)):d}"
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return "₹" + ",".join(groups + [tail]) if groups else "₹" + tail


def gbp(x: float) -> str:
    return f"£{round(x):,}"


# --- Members -----------------------------------------------------------------------------------------------------
members = [
    {"id": "arun", "name": "Arun", "role": "owner", "admin": True, "born": 1991, "retire_at": 60,
     "salary_net_month_gbp": {"2022": 3600, "2023": 3850, "2024": 4100, "2025": 4350, "2026": 4350}},
    {"id": "asha", "name": "Asha", "role": "member", "admin": False, "born": 1993, "retire_at": 60,
     "salary_net_month_gbp": {"2023": 2750, "2024": 2900, "2025": 3050, "2026": 3050}},
]
for m in members:
    s = m["salary_net_month_gbp"]
    ys = sorted(s)
    years = int(ys[-1]) - int(ys[0])
    m["salary_growth_measured"] = round((s[ys[-1]] / s[ys[0]]) ** (1 / years) - 1, 4)

# --- Debts -------------------------------------------------------------------------------------------------------
mort_extra = {date(2024, 3, 1): 5000.0}
mort_bal, mort_pay, mort_n, mort_int, _ = amortise(265000, 0.0439, 300, date(2021, 7, 1), date(2026, 10, 1), mort_extra)
mort_end = end_date(265000, 0.0439, 300, date(2021, 7, 1), mort_extra)
car_bal, car_pay, car_n, car_int, _ = amortise(14500, 0.069, 48, date(2025, 3, 20), date(2026, 10, 20))
car_end = end_date(14500, 0.069, 48, date(2025, 3, 20))
hl_bal, hl_pay, hl_n, hl_int, _ = amortise(4000000, 0.085, 180, date(2015, 8, 5), date(2026, 10, 5))
hl_end = end_date(4000000, 0.085, 180, date(2015, 8, 5))
hl_bal_nov, _, _, _, _ = amortise(4000000, 0.085, 180, date(2015, 8, 5), date(2026, 11, 5))  # after the Thu 5 Nov EMI
card_bal = 1240.0

debts = [
    {"id": "mortgage", "kind": "mortgage", "name": "Mortgage · Nationwide", "country": "UK", "ccy": "GBP",
     "owners": [["arun", 50], ["asha", 50]], "principal": 265000, "rate": 0.0439, "rate_note": "fixed to 30 Jun 2028, then the lender's variable rate",
     "term_months": 300, "first_payment": "2021-07-01", "payment_day": 1, "payment": mort_pay,
     "overpaid": [["2024-03-01", 5000, "shortens the term"]], "balance": mort_bal, "balance_after": "2026-10-01",
     "payments_made": mort_n, "ends": mort_end.isoformat(), "autopay": True},
    {"id": "car", "kind": "car_loan", "name": "Car loan · Close Brothers", "country": "UK", "ccy": "GBP",
     "owners": [["arun", 100]], "principal": 14500, "rate": 0.069, "term_months": 48, "first_payment": "2025-03-20",
     "payment_day": 20, "payment": car_pay, "balance": car_bal, "balance_after": "2026-10-20", "payments_made": car_n,
     "ends": car_end.isoformat(), "autopay": True},
    {"id": "hdfc", "kind": "home_loan", "name": "Home loan · HDFC (Pune flat)", "country": "IN", "ccy": "INR",
     "owners": [["arun", 100]], "principal": 4000000, "rate": 0.085, "term_months": 180, "first_payment": "2015-08-05",
     "payment_day": 5, "payment": hl_pay, "balance": hl_bal, "balance_after": "2026-10-05", "balance_after_nov_emi": hl_bal_nov, "payments_made": hl_n,
     "ends": hl_end.isoformat(), "autopay": False, "linked": "pune"},
    {"id": "card", "kind": "credit_card", "name": "Barclaycard", "country": "UK", "ccy": "GBP", "owners": [["arun", 100]],
     "statement": {"date": "2026-10-01", "balance": card_bal, "minimum": 25.0, "due": "2026-10-20", "paid": "in full"},
     "next_statement": {"date": "2026-11-01", "due": "2026-11-20"}, "balance": 0.0,
     "balance_note": "the 1 Oct statement's £1,240 was paid in full on Tue 20 Oct; the next statement comes on Sun 1 Nov", "autopay": False},
]

# --- Assets ------------------------------------------------------------------------------------------------------
fd_mat = fd_maturity(500000, 0.071, 3)
fd_accrued = round(500000 * (1 + 0.071 / 4) ** (math.floor(months_between(date(2026, 3, 10), TODAY) / 3)))
mf_flows = []
y, mth = 2023, 1
while (y, mth) <= (2026, 10):
    mf_flows.append((date(y, mth, 10), -10000.0))
    mth += 1
    if mth > 12:
        y, mth = y + 1, 1
mf_units, mf_nav = 6437.512, 87.30
mf_value = round(mf_units * mf_nav)
mf_xirr = xirr(mf_flows + [(CLOSE, float(mf_value))])

assets = [
    # The five UK holdings of the iOS boards, unchanged (they sum to £24,110).
    {"id": "balanced", "kind": "oeic", "name": "Balanced (BlackRock MyMap 5)", "account": "ISA · Monzo", "country": "UK", "ccy": "GBP", "owners": [["arun", 100]], "value": 22925, "liquidity": "liquid"},
    {"id": "nasdaq", "kind": "etf", "name": "NASDAQ 100 ETF", "account": "ISA", "country": "UK", "ccy": "GBP", "owners": [["asha", 100]], "value": 512, "liquidity": "liquid"},
    {"id": "robotics", "kind": "etf", "name": "Robotics ETF", "account": "GIA", "country": "UK", "ccy": "GBP", "owners": [["arun", 100]], "value": 304, "liquidity": "liquid"},
    {"id": "silver", "kind": "commodity_etc", "name": "Silver ETC", "account": "GIA", "country": "UK", "ccy": "GBP", "owners": [["arun", 100]], "value": 188, "liquidity": "liquid"},
    {"id": "pot", "kind": "cash", "name": "Monzo pot", "account": "Cash · Monzo", "country": "UK", "ccy": "GBP", "owners": [["arun", 50], ["asha", 50]], "value": 181, "liquidity": "liquid"},
    # The rest of the household's wealth.
    {"id": "home", "kind": "property", "name": "Home, Reading", "country": "UK", "ccy": "GBP", "owners": [["arun", 50], ["asha", 50]], "value": 415000, "valued": "2026-04-30", "valuation_due": "2026-10-30", "bought": ["2021-06-18", 330000], "liquidity": "locked"},
    {"id": "saver", "kind": "fixed_saver", "name": "Fixed-rate saver · Nationwide", "country": "UK", "ccy": "GBP", "owners": [["asha", 100]], "value": 10000, "rate": 0.046, "opened": "2025-12-14", "matures": "2026-12-14", "at_maturity": 10460, "on_maturity": "ask", "liquidity": "locked until 14 Dec 2026"},
    {"id": "pension_arun", "kind": "workplace_pension", "name": "Workplace pension · Aviva", "country": "UK", "ccy": "GBP", "owners": [["arun", 100]], "value": 86400, "valued": "2026-09-30", "unlocks_at": 57, "liquidity": "locked until 57"},
    {"id": "sipp_asha", "kind": "sipp", "name": "SIPP · Vanguard", "country": "UK", "ccy": "GBP", "owners": [["asha", 100]], "value": 31250, "valued": "2026-09-30", "unlocks_at": 57, "liquidity": "locked until 57"},
    {"id": "pune", "kind": "property", "name": "Flat, Pune", "country": "IN", "ccy": "INR", "owners": [["arun", 50], ["asha", 50]], "value": 11000000, "valued": "2026-01-15", "valuation_due": "2026-07-15", "bought": ["2015-07-01", 6500000], "rent_month": 18000, "liquidity": "locked"},
    {"id": "sbi_fd", "kind": "fixed_deposit", "name": "Fixed deposit · SBI", "country": "IN", "ccy": "INR", "owners": [["arun", 100]], "principal": 500000, "value": fd_accrued, "rate": 0.071, "compounding": "quarterly", "opened": "2026-03-10", "matures": "2029-03-10", "at_maturity": fd_mat, "on_maturity": "ask", "liquidity": "locked until 10 Mar 2029"},
    {"id": "ppf", "kind": "ppf", "name": "PPF · SBI", "country": "IN", "ccy": "INR", "owners": [["arun", 100]], "value": 680000, "rate": 0.071, "credited": "2026-03-31", "matures": "2031-03-31", "liquidity": "locked until 31 Mar 2031"},
    {"id": "lic", "kind": "endowment", "name": "LIC Jeevan Anand", "country": "IN", "ccy": "INR", "owners": [["asha", 100]], "value": 340000, "value_note": "surrender value", "premium_year": 42000, "premium_due": "2027-03-28", "matures": "2031-03-28", "sum_assured": 1000000, "liquidity": "locked until 28 Mar 2031"},
    {"id": "ppfas", "kind": "mutual_fund", "name": "Parag Parikh Flexi Cap · Direct Growth", "account": "MF folio · CAMS", "country": "IN", "ccy": "INR", "owners": [["asha", 100]], "units": mf_units, "nav": mf_nav, "value": mf_value, "sip": [10000, 10], "invested": int(-sum(v for _, v in mf_flows)), "xirr": mf_xirr, "liquidity": "liquid"},
    {"id": "infosys", "kind": "share", "name": "Infosys", "account": "Demat · Zerodha", "country": "IN", "ccy": "INR", "owners": [["arun", 100]], "units": 120, "price": 1480.50, "value": round(120 * 1480.50), "xirr": None, "xirr_note": "no history yet: the agent asks for past buys or an estimate", "liquidity": "liquid"},
    {"id": "nre", "kind": "savings_account", "name": "NRE savings · HDFC", "country": "IN", "ccy": "INR", "owners": [["arun", 100]], "value": 215000, "liquidity": "liquid"},
]

# Registered in the prototype on Mon 26 Oct at 09:41: the first record.
new_record = {"id": "monzo_savings", "kind": "savings_account", "name": "Instant access savings · Monzo", "country": "UK", "ccy": "GBP", "owners": [["arun", 100]], "value": 5000, "liquidity": "liquid", "registered": "2026-10-26T09:41"}


def to_gbp(x: float, ccy: str) -> float:
    return x if ccy == "GBP" else x / FX


def totals(include_new: bool):
    rows = assets + ([new_record] if include_new else [])
    own = sum(to_gbp(a["value"], a["ccy"]) for a in rows)
    owe = sum(to_gbp(d["balance"], d["ccy"]) for d in debts)
    by_country = {c: round(sum(to_gbp(a["value"], a["ccy"]) for a in rows if a["country"] == c) - sum(to_gbp(d["balance"], d["ccy"]) for d in debts if d["country"] == c)) for c in ("UK", "IN")}
    by_member = {}
    for mm in ("arun", "asha"):
        a = sum(to_gbp(x["value"], x["ccy"]) * p / 100 for x in rows for o, p in x["owners"] if o == mm)
        d = sum(to_gbp(x["balance"], x["ccy"]) * p / 100 for x in debts for o, p in x["owners"] if o == mm)
        by_member[mm] = round(a - d)
    net = round(own) - round(owe)
    by_country["IN"] = net - by_country["UK"]          # the split always sums to the total shown
    by_member["asha"] = net - by_member["arun"]
    liquid = sum(to_gbp(a["value"], a["ccy"]) for a in rows if a["liquidity"] == "liquid")
    return {"own_gbp": round(own), "owe_gbp": round(owe), "net_gbp": net, "net_inr": round(net * FX),
            "by_country_gbp": by_country, "by_member_gbp": by_member, "liquid_gbp": round(liquid)}


before = totals(False)
after = totals(True)

# Corrected in place in the prototype at 09:52 on Mon 26 Oct, after the valuation check-in: Home £415,000 -> £428,000.
correction = {"record": "home", "field": "value", "from": 415000, "to": 428000, "at": "2026-10-26T09:52", "via": "inline_edit",
              "label": "your estimate"}
_home = next(a for a in assets if a["id"] == "home")
_home["value"] = correction["to"]
after_correction = totals(True)
_home["value"] = correction["from"]

# --- Budget (monthly plan, October actuals) ------------------------------------------------------------------------
plan = [
    ["Bills and council tax", 420], ["Groceries", 650], ["Transport", 220], ["Insurance", 85], ["Eating out", 180],
    ["Shopping", 250], ["Holidays", 400], ["Health", 60], ["Subscriptions", 45], ["Giving", 50],
    ["Family support, India", 222], ["Other", 100],
]
actual_oct = {"Bills and council tax": 431, "Groceries": 702, "Transport": 198, "Insurance": 85, "Eating out": 236,
              "Shopping": 189, "Holidays": 0, "Health": 24, "Subscriptions": 45, "Giving": 50,
              "Family support, India": 222, "Other": 64}
income = members[0]["salary_net_month_gbp"]["2026"] + members[1]["salary_net_month_gbp"]["2026"] + round(18000 / FX)
emis = round(mort_pay + car_pay + hl_pay / FX)
spend_plan = sum(v for _, v in plan)
spend_actual = sum(actual_oct.values())
sip_gbp = round(10000 / FX)
budget = {"month": "2026-10", "income_gbp": income, "emis_gbp": emis, "sip_gbp": sip_gbp,
          "plan": [{"category": c, "plan": v, "actual": actual_oct[c]} for c, v in plan],
          "spend_plan": spend_plan, "spend_actual": spend_actual,
          "surplus_plan": income - emis - sip_gbp - spend_plan, "surplus_actual": income - emis - sip_gbp - spend_actual}
budget["savings_rate_actual"] = round(budget["surplus_actual"] / income, 3)

# --- Projection (illustrative engine run: deterministic path plus a fan) --------------------------------------------
PRIORS = {"equity_uk": (0.06, 0.16), "equity_in": (0.09, 0.20), "bond": (0.035, 0.06), "property_uk": (0.03, 0.08),
          "property_in": (0.05, 0.10), "cash": (0.03, 0.01)}
INFLATION = {"UK": 0.025, "IN": 0.05}
WAGE = {"UK": 0.035}
plan_items = [
    {"id": "extension", "what": "Home extension", "ccy": "GBP", "amount": -35000, "when": "2027-06", "repeat": None},
    {"id": "bonus", "what": "Asha's annual bonus", "ccy": "GBP", "amount": 3000, "when": "2027-03", "repeat": "yearly", "until": "2052-03"},
    {"id": "car2", "what": "Replace the car", "ccy": "GBP", "amount": -25000, "when": "2031-06", "repeat": None},
]


def shrink(observed: float, years: float, prior: float, sigma: float, tau: float = 0.02) -> float:
    w = (years / sigma ** 2) / (years / sigma ** 2 + 1 / tau ** 2)
    return round(w * observed + (1 - w) * prior, 4)


assumed = {
    "equity_in (Parag Parikh)": shrink(mf_xirr, 3.8, *PRIORS["equity_in"]),
    "equity_uk (Balanced and ETFs)": PRIORS["equity_uk"][0],
    "property_uk": PRIORS["property_uk"][0], "property_in": PRIORS["property_in"][0],
    "fixed deposit (contract)": 0.071, "PPF (contract)": 0.071,
    "salary growth Arun": round(0.5 * members[0]["salary_growth_measured"] + 0.5 * WAGE["UK"], 4),
    "salary growth Asha": round(0.5 * members[1]["salary_growth_measured"] + 0.5 * WAGE["UK"], 4),
}


def project(paths: int = 400, years: int = 30, seed: int = 7, extra: list | None = None):
    rnd = random.Random(seed)
    items = plan_items + (extra or [])
    base = after_correction
    start = base["net_gbp"]
    out = []
    for p in range(paths):
        liquid = base["liquid_gbp"]
        locked = base["own_gbp"] - base["liquid_gbp"]
        debt = base["owe_gbp"]
        series = []
        for yr in range(1, years + 1):
            shock = rnd.gauss(0, 1) if p else 0.0
            r_liq = 0.055 + (0.12 * shock if p else 0)
            r_lock = 0.035 + (0.05 * shock if p else 0)
            surplus = budget["surplus_plan"] * 12 * (1.03 ** yr) * (0 if yr > 25 else 1)
            for it in items:
                y0 = int(it["when"][:4]) - 2026
                if it["repeat"] == "yearly" and y0 <= yr <= int(it.get("until", "2100")[:4]) - 2026:
                    surplus += it["amount"]
                elif it["repeat"] is None and y0 == yr:
                    surplus += it["amount"]
            liquid = liquid * (1 + r_liq) + surplus
            locked = locked * (1 + r_lock)
            debt = max(0.0, debt - (emis * 12 * 0.62))
            series.append(liquid + locked - debt)
        out.append(series)
    det = out[0]
    fan = []
    for yr in range(years):
        col = sorted(s[yr] for s in out[1:])
        q = lambda f: round(col[int(f * (len(col) - 1))] / 1000) * 1000
        fan.append({"year": 2026 + yr + 1, "p10": q(0.10), "p50": q(0.50), "p90": q(0.90), "deterministic": round(det[yr] / 1000) * 1000})
    return start, fan


start_net, fan = project()
# A what-if the boards show: "What if we put £60,000 down on a second flat in June 2028?" (unsaved; numbers from the member's words).
what_if = {"asked": "What if we put £60,000 down on a second flat in June 2028?", "override": {"what": "Second flat deposit", "ccy": "GBP", "amount": -60000, "when": "2028-06", "repeat": None}}
_, what_if_fan = project(extra=[what_if["override"]])
what_if["fan"] = what_if_fan
what_if["delta_p50_2036"] = next(b["p50"] for b in what_if_fan if b["year"] == 2036) - next(b["p50"] for b in fan if b["year"] == 2036)

# October's statements: every spending line, summing exactly to the budget's actuals; transfers and EMIs recognised.
rnd_s = random.Random(11)
MERCHANTS = {
    "Bills and council tax": [("Reading Borough Council", "monzo"), ("Octopus Energy", "monzo"), ("Thames Water", "monzo")],
    "Groceries": [("Tesco", "card"), ("Sainsbury's", "card"), ("Waitrose", "card"), ("Lidl", "card")],
    "Transport": [("Shell", "card"), ("GWR", "card")],
    "Insurance": [("Aviva home insurance", "monzo")],
    "Eating out": [("Dishoom", "card"), ("Pizza Express", "card"), ("Pret", "card")],
    "Shopping": [("John Lewis", "card"), ("AMZN Mktp", "card")],
    "Holidays": [],
    "Health": [("Boots", "card")],
    "Subscriptions": [("Netflix", "card"), ("Spotify", "card")],
    "Giving": [("Oxfam", "monzo")],
    "Family support, India": [("Wise · to Pune", "monzo")],
    "Other": [("PAYPAL *EBAY", "card"), ("Post Office", "card")],
}
lines = []
for cat, total in actual_oct.items():
    ms = MERCHANTS[cat]
    if not ms or total == 0:
        continue
    cuts = sorted(rnd_s.sample(range(1, total), len(ms) - 1)) if len(ms) > 1 else []
    parts = [b - a for a, b in zip([0] + cuts, cuts + [total])]
    for (merchant, src), amt in zip(ms, parts):
        day = rnd_s.randint(2, 30)
        lines.append({"date": f"2026-10-{day:02d}", "merchant": merchant, "amount_gbp": amt, "category": cat, "source": src,
                      "sure": merchant not in ("AMZN Mktp", "PAYPAL *EBAY")})
lines.sort(key=lambda l: l["date"])
card_total = sum(l["amount_gbp"] for l in lines if l["source"] == "card")
monzo_spend = sum(l["amount_gbp"] for l in lines if l["source"] == "monzo")
statements = {
    "barclaycard_nov": {"statement": "2026-11-01", "due": "2026-11-20", "balance": card_total, "minimum": 25,
                        "lines": [l for l in lines if l["source"] == "card"]},
    "monzo_current_oct": {"period": "2026-10", "spend_lines": [l for l in lines if l["source"] == "monzo"], "spend": monzo_spend,
                          "recognised": [
                              {"date": "2026-10-01", "what": "Mortgage · Nationwide", "amount_gbp": round(mort_pay, 2), "as": "EMI, matched to its commitment"},
                              {"date": "2026-10-20", "what": "Car loan · Close Brothers", "amount_gbp": round(car_pay, 2), "as": "EMI, matched to its commitment"},
                              {"date": "2026-10-20", "what": "Barclaycard payment", "amount_gbp": card_bal, "as": "card payment: a transfer, not spending"},
                              {"date": "2026-10-28", "what": "Salary · Arun", "amount_gbp": 4350, "as": "income"},
                              {"date": "2026-10-26", "what": "To Instant access savings · Monzo", "amount_gbp": 5000, "as": "a move between your own accounts"},
                          ]},
}
assert card_total + monzo_spend == spend_actual, (card_total, monzo_spend, spend_actual)
milestones = [
    {"when": "2026-12-14", "what": "Asha's fixed-rate saver matures", "amount": gbp(10460)},
    {"when": "2028-06-30", "what": "Mortgage fixed rate ends"},
    {"when": car_end.isoformat(), "what": "Car loan paid off", "frees": gbp(car_pay) + " a month"},
    {"when": "2029-03-10", "what": "SBI FD matures", "amount": inr(fd_mat)},
    {"when": hl_end.isoformat(), "what": "HDFC home loan paid off", "frees": inr(hl_pay) + " a month"},
    {"when": "2031-03-28", "what": "LIC policy matures"},
    {"when": mort_end.isoformat(), "what": "Mortgage paid off", "frees": gbp(mort_pay) + " a month"},
    {"when": "2051-01-01", "what": "Arun retires at 60"},
]

out = {
    "about": "Illustrative household for the v4 boards and prototype (MA-186). Every name and figure is illustrative.",
    "clock": {"today": TODAY.isoformat(), "today_label": "Mon 26 Oct", "prices_as_of": CLOSE.isoformat(), "prices_label": "Fri 23 Oct close",
              "fx": {"gbp_inr": FX, "source": "ECB reference cross-rate, Fri 23 Oct"}},
    "members": members, "assets": assets, "debts": debts, "new_record_in_prototype": new_record,
    "totals_before_new_record": before, "totals_after_new_record": after,
    "correction_in_prototype": correction, "totals_after_correction": after_correction,
    "budget_oct": budget,
    "statements_oct": statements,
    "what_if": what_if,
    "check_ins": [
        {"when": "2026-10-26T09:00", "what": "Valuation due: Home, Reading", "record": "home", "asks": "Is £415,000 still about right?"},
        {"when": "2026-10-26T09:00", "what": "Valuation overdue since 15 Jul: Flat, Pune", "record": "pune", "asks": "Is ₹1,10,00,000 still about right?"},
        {"when": "2026-11-01T09:00", "what": "Close October's budget", "asks": "Anything not on a statement?"},
        {"when": "2026-11-05T09:00", "what": "HDFC home loan EMI", "record": "hdfc", "amount": inr(hl_pay), "asks": "Was November's EMI paid?"},
        {"when": "2026-11-10T09:00", "what": "Parag Parikh SIP", "record": "ppfas", "amount": inr(10000), "asks": "Did November's SIP go through?"},
        {"when": "2026-11-20T09:00", "what": "Barclaycard bill", "record": "card", "asks": "Paid in full, the minimum, or part?"},
        {"when": "2026-12-14T09:00", "what": "Fixed-rate saver matures", "record": "saver", "amount": gbp(10460), "asks": "Renewed, paid out or moved?"},
    ],
    "autopay_digest_week": {"week_of": "2026-10-19", "assumed_paid": [["Mortgage · Nationwide", gbp(mort_pay), "1 Oct"], ["Car loan · Close Brothers", gbp(car_pay), "20 Oct"]]},
    "projection": {"start_net_gbp": start_net, "horizon_years": 30, "assumptions": assumed, "inflation": INFLATION,
                   "priors": {k: {"return": v[0], "volatility": v[1]} for k, v in PRIORS.items()}, "plan_items": plan_items,
                   "fan": fan, "milestones": milestones, "engine_note": "illustrative run for the boards; the product's engine is MA-191's"},
    "formatted": {"net_before": gbp(before["net_gbp"]), "net_after": gbp(after["net_gbp"]), "net_after_inr": inr(after["net_inr"]), "net_after_correction": gbp(after_correction["net_gbp"]), "net_after_correction_inr": inr(after_correction["net_inr"]),
                  "mortgage_payment": gbp(mort_pay), "car_payment": gbp(car_pay), "hdfc_emi": inr(hl_pay),
                  "fd_maturity": inr(fd_mat), "fd_value": inr(fd_accrued), "mf_value": inr(mf_value), "infosys_value": inr(120 * 1480.50)},
}
print(json.dumps(out, indent=1, ensure_ascii=False, default=str))
