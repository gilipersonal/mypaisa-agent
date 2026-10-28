"""The figures behind the future-plans boards (MA-264): MA-193's household, run forward month by month.

A design aid, not the product's engine (MA-219 is): it fixes the figures the boards show, so they agree with each
other and add up. It reads household-v4.json (MA-193's figure set) and never changes it. Every name, balance and
account is illustrative.

Run: python3 make_future_plans.py > future-plans-v4.json

The clock is Mon 2 Nov 2026, the evening after October closed (Sun 1 Nov) and before Thursday's HDFC EMI. The ledger
starts on 1 Nov 2026 and runs to Dec 2056; the boards show 20 years (to 2046) by default, as MA-261 asks.
Each month the ledger keeps one identity, checked below: opening cash + the month's flows = closing cash.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
H = json.loads((HERE / "household-v4.json").read_text())

FX0 = H["clock"]["fx"]["gbp_inr"]                     # ₹ per £ on Fri 23 Oct 2026
INFL = {"UK": 0.025, "IN": 0.05, "UK health": 0.04, "UK school fees": 0.045}
START = (2026, 11)                                   # the first month the ledger runs
YEARS = 30
N = 12 * (2056 - 2026) + 2                           # Nov 2026 .. Dec 2056
FLOOR = 500                                          # Arun's floor: the monthly surplus he keeps (his setting)
BUFFER_MONTHS = 6                                    # the surplus rule: cash up to 6 months of outgoings (and the year's one-offs), the rest into Balanced
CASH_RATE = 0.03
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def ym(i: int) -> tuple[int, int]:
    k = (START[0] * 12 + START[1] - 1) + i
    return k // 12, k % 12 + 1


def idx(y: int, m: int) -> int:
    return (y * 12 + m - 1) - (START[0] * 12 + START[1] - 1)


def label(i: int) -> str:
    y, m = ym(i)
    return f"{MONTHS[m - 1]} {y}"


def fx(i: int) -> float:
    """GBP/INR drifts each year by the gap between the two countries' inflation (ARCHITECTURE §6.6)."""
    return FX0 * ((1 + INFL["IN"]) / (1 + INFL["UK"])) ** (i / 12)


def inr(x: float) -> str:
    neg = x < 0
    s = f"{int(round(abs(x))):d}"
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    out = "₹" + (",".join(groups + [tail]) if groups else tail)
    return ("−" if neg else "") + out


def gbp(x: float, sign: bool = False) -> str:
    r = round(x)
    if r < 0:
        return f"−£{-r:,}"
    return (f"+£{r:,}" if sign and r > 0 else f"£{r:,}")


def aprils_since_start(i: int) -> int:
    """Pay rises land each April."""
    return sum(1 for k in range(1, i + 1) if ym(k)[1] == 4)


def years_since_2026(i: int) -> int:
    """Prices step up each January."""
    return ym(i)[0] - 2026


# --- the household on Mon 2 Nov 2026 ----------------------------------------------------------------------------
members = {m["id"]: m for m in H["members"]}
A = {a["id"]: a for a in H["assets"]}
D = {d["id"]: d for d in H["debts"]}
G = H["projection"]["assumptions"]
# Arun corrected his salary growth in place, 4.17% → 4.8%, at 10:40 on Mon 26 Oct (the v4 Projection boards, P6)
growth = {"arun": 0.048, "asha": G["salary growth Asha"]}
retire = {"arun": idx(2051, 1), "asha": idx(2053, 1)}           # 60 in 2051 and 2053
CATS = [  # the budget's plan per category, each with its inflation key (MA-261); amounts are take-home spending
    ("Bills and council tax", "UK"), ("Groceries", "UK"), ("Transport", "UK"), ("Insurance", "UK"),
    ("Eating out", "UK"), ("Shopping", "UK"), ("Holidays", "UK"), ("Health", "UK health"),
    ("Subscriptions", "UK"), ("Giving", "UK"), ("Family support, India", "IN"), ("Other", "UK"),
]
plan_gbp = {p["category"]: p["plan"] for p in H["budget_oct"]["plan"]}
FAMILY_INR = 25000                                    # "Family support, India" is paid in rupees: ₹25,000 = £222 today


def assets_at_start():
    v = {k: float(a["value"]) for k, a in A.items()}
    v["home"] = float(H["correction_in_prototype"]["to"])          # corrected in place at 09:52 on Mon 26 Oct
    v["monzo_savings"] = float(H["new_record_in_prototype"]["value"])
    return v


# Each asset: (currency, class for its return, how it ends up in cash, if it does)
ASSET_CLASS = {
    "balanced": ("GBP", "equity_uk"), "nasdaq": ("GBP", "equity_uk"), "robotics": ("GBP", "equity_uk"),
    "silver": ("GBP", "equity_uk"), "home": ("GBP", "property_uk"), "saver": ("GBP", "saver"),
    "pension_arun": ("GBP", "equity_uk"), "sipp_asha": ("GBP", "equity_uk"), "pune": ("INR", "property_in"),
    "sbi_fd": ("INR", "fd"), "ppf": ("INR", "ppf"), "lic": ("INR", "lic"), "ppfas": ("INR", "equity_in"),
    "infosys": ("INR", "equity_in"),
}
CASH_IDS = ("pot", "monzo_savings", "nre")             # the cash the ledger keeps: Monzo pot and savings, NRE savings
RET = {"equity_uk": G["equity_uk (Balanced and ETFs)"], "equity_in": G["equity_in (Parag Parikh)"],
       "property_uk": G["property_uk"], "property_in": G["property_in"], "ppf": 0.071, "lic": 0.06}
VOL = {"equity_uk": 0.16, "equity_in": 0.20, "property_uk": 0.08, "property_in": 0.10}


def emi_schedule():
    """The three loans, month by month: payment and balance after it (in each loan's own currency)."""
    out = {}
    for lid, start_bal, rate, pay, last in (
        ("mortgage", D["mortgage"]["balance"], D["mortgage"]["rate"], D["mortgage"]["payment"], idx(2045, 10)),
        ("car", D["car"]["balance"], D["car"]["rate"], D["car"]["payment"], idx(2029, 2)),
        ("hdfc", D["hdfc"]["balance"], D["hdfc"]["rate"], D["hdfc"]["payment"], idx(2030, 7)),
    ):
        out[lid] = {"bal0": start_bal, "rate": rate, "pay": pay, "last": last}
    return out


LOANS = emi_schedule()


# --- the plans ---------------------------------------------------------------------------------------------------
# Every plan item as ARCHITECTURE §4.1 lists it. Amounts are take-home; `growth` steps up on each anniversary.
EXISTING = [
    {"id": "extension", "what": "Home extension", "effect": "new_flow", "type": "spend", "member_id": "arun",
     "category": "Home", "one_off": True, "start": "2027-06", "amount": 35000, "ccy": "GBP", "growth": None,
     "funded_from": None, "source_text": "A £35,000 extension next June", "status": "active", "version": 1,
     "created": "Sun 25 Oct 20:09"},
    {"id": "bonus", "what": "Asha's annual bonus", "effect": "new_flow", "type": "income", "member_id": "asha",
     "category": "Income", "recurring": "yearly", "start": "2027-03", "end": "2052-03", "amount": 3000, "ccy": "GBP",
     "growth": {"kind": "fixed", "pct": 0.035}, "source_text": "Asha gets about £3,000 bonus every March", "status": "active",
     "version": 2, "created": "Sun 25 Oct 20:15", "corrected": "Mon 26 Oct 10:44, growth none → 3.5% a year (the v4 Projection boards, P7)"},
    {"id": "car2", "what": "Replace the car", "effect": "new_flow", "type": "spend", "member_id": "arun",
     "category": "Transport", "one_off": True, "start": "2031-06", "amount": 25000, "ccy": "GBP", "growth": None,
     "funded_from": None, "source_text": "New car around June 2031, £25k", "status": "active", "version": 1,
     "created": "Sun 25 Oct 20:12"},
]
SCHOOLING = {
    "id": "schooling", "what": "School fees", "effect": "new_flow", "type": "spend", "member_id": "arun",
    "for_member": None, "for_note": "your kid (not a member)", "category": "Education", "recurring": "monthly",
    "start": "2029-01", "end": "2041-07", "amount": 4000, "ccy": "GBP",
    "growth": {"kind": "prior", "key": "UK school fees", "pct": INFL["UK school fees"]},
    "funded_from": None, "source_text": "£4,000 a month from Jan 2029 for my kid's schooling",
    "status": "active", "version": 1,
}


def p_idx(s: str) -> int:
    return idx(int(s[:4]), int(s[5:7]))


def plan_amount(p: dict, i: int) -> float:
    """What a plan item moves in month i, in its own currency: + for income, − for spend; 0 outside its dates."""
    if p.get("status") == "paused":
        return 0.0
    s = p_idx(p["start"])
    e = p_idx(p["end"]) if p.get("end") else None
    if i < s or (e is not None and i > e):
        return 0.0
    if p.get("one_off"):
        if i != s:
            return 0.0
        amt = p["amount"]
    elif p.get("recurring") == "yearly":
        if (i - s) % 12:
            return 0.0
        amt = p["amount"]
    else:
        amt = p["amount"]
    g = p.get("growth")
    if g:
        amt *= (1 + g["pct"]) ** ((i - s) // 12)
    return amt if p["type"] == "income" else -amt


# --- one run of the ledger -----------------------------------------------------------------------------------------
def run(plans: list[dict], changes: list[dict] | None = None, shocks: list[dict] | None = None, horizon: int = N):
    """The month-by-month ledger and the net-worth path. `changes` are change_flow items (a category trimmed, the SIP
    paused, a plan moved, a pool drawn); `shocks` (Monte Carlo) replace each year's return for the market classes."""
    changes = changes or []
    v = assets_at_start()
    cash = sum(v.pop(k) for k in ("pot", "monzo_savings")) + v.pop("nre") / FX0
    loans = {k: {"bal": l["bal0"], **l} for k, l in LOANS.items()}
    card_owed = float(H["statements_oct"]["barclaycard_nov"]["balance"])          # due Fri 20 Nov
    pots = {}                                                                     # named pools a rearrangement builds
    months, nw = [], []
    for i in range(horizon):
        y, m = ym(i)
        f = fx(i)
        row = {"i": i, "label": label(i), "y": y, "m": m, "fx": round(f, 4), "opening_cash": cash}
        # income, by member
        inc = {}
        for mid in ("arun", "asha"):
            base = members[mid]["salary_net_month_gbp"]["2026"]
            sal = base * (1 + growth[mid]) ** aprils_since_start(i)
            for c in changes:
                if c["kind"] == "salary" and c["member"] == mid and i >= p_idx(c["from"]):
                    sal = c["to"] * (1 + growth[mid]) ** sum(1 for k in range(p_idx(c["from"]) + 1, i + 1) if ym(k)[1] == 4)
            if i >= retire[mid]:
                sal = 0.0
            inc[mid] = sal
        inc["rent"] = 18000 * (1 + INFL["IN"]) ** aprils_since_start(i) / f
        for pid, who in (("pension_arun", "arun"), ("sipp_asha", "asha")):
            if i >= retire[who]:
                draw = v[pid] * 0.04 / 12
                v[pid] -= draw
                inc[f"pension_{who}"] = draw
        # spending, by category, each inflating by its key from each January
        spend = {}
        for cat, key in CATS:
            base = FAMILY_INR / f if cat == "Family support, India" else plan_gbp[cat]
            amt = base * (1 + INFL[key]) ** years_since_2026(i) if key != "IN" else FAMILY_INR * (1 + INFL["IN"]) ** years_since_2026(i) / f
            for c in changes:
                if c["kind"] == "trim" and c["category"] == cat and p_idx(c["from"]) <= i <= p_idx(c.get("until", "2099-12")):
                    amt = c["to"] * (1 + INFL[key]) ** years_since_2026(i)
            spend[cat] = amt
        # the commitments: EMIs, the SIP, the LIC premium
        emis = {}
        for lid, l in loans.items():
            if l["bal"] > 0.5 and i <= l["last"]:
                r = l["rate"] / 12
                interest = l["bal"] * r
                pay = min(l["pay"], l["bal"] + interest)
                l["bal"] = l["bal"] + interest - pay
                if i == l["last"]:
                    l["bal"] = 0.0                       # the last payment clears any residue (MA-193's rule)
                emis[lid] = pay / f if lid == "hdfc" else pay
        sip_on = not any(c["kind"] == "pause_sip" and p_idx(c["from"]) <= i <= p_idx(c["until"]) for c in changes)
        sip = 10000 / f if sip_on and i < retire["asha"] else 0.0
        premium = 42000 / f if m == 3 and 2027 <= y <= 2030 else 0.0
        # the plan items: recurring ones belong to the budget's surplus; one-offs are paid from the surplus, then cash
        rec, one = {}, {}
        for p in plans:
            if p["effect"] != "new_flow":
                continue                                  # a change_flow or record_event acts through `changes`
            moved = next((c for c in changes if c["kind"] == "move" and c["plan"] == p["id"]), None)
            q = dict(p, start=moved["to"], end=moved.get("end", p.get("end"))) if moved else p
            a = plan_amount(q, i)
            if a:
                (one if p.get("one_off") else rec)[p["id"]] = a / (f if p["ccy"] == "INR" else 1)
        income = sum(inc.values()) + sum(a for a in rec.values() if a > 0)
        outgo = sum(spend.values()) + sum(emis.values()) + sip + premium - sum(a for a in rec.values() if a < 0)
        surplus = income - outgo
        # named pools: a pot saved from the budget, drawn to keep the surplus at the floor
        pot_in, pot_draw = 0.0, 0.0
        def pot_amount(c):
            return sum(a for f0, u0, a in c["steps"] if p_idx(f0) <= i <= p_idx(u0)) if c["kind"] == "save_pot" else 0.0
        for c in changes:
            pot_in += pot_amount(c)
            if c["kind"] in ("save_pot", "draw_pool") and p_idx(c["draw_from"]) <= i < min(retire.values()):
                pots.setdefault(c["id"], 0.0)
                need = max(0.0, FLOOR - (surplus - pot_in))
                if c["kind"] == "draw_pool":
                    src = c["pool"]
                    take = min(need, v[src])
                    v[src] -= take
                else:
                    take = min(need, pots[c["id"]])
                    pots[c["id"]] -= take
                pot_draw += take
        for c in changes:
            if c["kind"] == "save_pot":
                pots.setdefault(c["id"], 0.0)
                pots[c["id"]] = pots[c["id"]] * (1 + CASH_RATE / 12) + pot_amount(c)
        retired_draw = 0.0
        if i >= min(retire.values()) and surplus - pot_in + pot_draw < 0:
            retired_draw = min(-(surplus - pot_in + pot_draw), v["balanced"])   # retirement: investments pay the gap
            v["balanced"] -= retired_draw
        surplus_after = surplus - pot_in + pot_draw + retired_draw
        # maturities into cash
        mat = {}
        if (y, m) == (2026, 12):
            mat["saver"] = float(A["saver"]["at_maturity"])
            v["saver"] = 0.0
        if (y, m) == (2029, 3):
            mat["sbi_fd"] = 617538 / f
            v["sbi_fd"] = 0.0
        if (y, m) == (2031, 3):
            mat["ppf"] = v["ppf"] / f
            mat["lic"] = v["lic"] / f
            v["ppf"] = v["lic"] = 0.0
        closed = {}
        for c in changes:
            if c["kind"] == "close_loan" and i == p_idx(c["when"]):
                l = loans[c["loan"]]
                pay_inr = min(l["bal"], c["amount_inr"])
                l["bal"] -= pay_inr
                if l["bal"] < 0.5:
                    l["bal"], l["last"] = 0.0, i
                closed[c["loan"]] = -pay_inr / f
        settle = -card_owed if i == 0 else 0.0
        one_total = sum(one.values())
        interest = max(cash, 0.0) * CASH_RATE / 12
        cash = cash + surplus_after + one_total + sum(mat.values()) + sum(closed.values()) + settle + interest
        # the surplus rule: cash above six months of outgoings, plus the one-offs due in the next twelve months,
        # goes into Balanced, so a planned one-off is not paid by selling investments
        due = 0.0
        for p in plans:
            if p["effect"] == "new_flow" and p.get("one_off") and p["type"] == "spend" and i < p_idx(p["start"]) <= i + 12:
                due += p["amount"]
        target = BUFFER_MONTHS * outgo + due
        invested = max(0.0, cash - target)
        cash -= invested
        # the assets grow; the SIP buys Parag Parikh; LIC premiums add to its value
        for k, (ccy, cls) in ASSET_CLASS.items():
            if k not in v or v[k] == 0:
                continue
            if cls in ("saver", "fd"):
                rate = 0.046 if cls == "saver" else 0.071
                v[k] *= (1 + rate / (12 if cls == "saver" else 4)) if (cls == "saver" or m in (3, 6, 9, 12)) else 1
                continue
            yr = shocks[y - 2026][cls] if shocks and cls in VOL else RET.get(cls, RET.get("equity_uk"))
            v[k] *= (1 + yr) ** (1 / 12)
        v["balanced"] += invested
        v["ppfas"] += 10000 if sip else 0
        v["lic"] += 42000 if premium else 0
        own = sum(val / (f if ASSET_CLASS[k][0] == "INR" else 1) for k, val in v.items()) + cash + sum(pots.values())
        owe = sum(l["bal"] / (f if k == "hdfc" else 1) for k, l in loans.items()) + (card_owed if i == -1 else 0)
        net = own - owe
        row.update({"income": inc, "plans_income": {k: a for k, a in rec.items() if a > 0}, "spend": spend,
                    "emis": emis, "sip": sip, "premium": premium, "plans_spend": {k: a for k, a in rec.items() if a < 0},
                    "surplus_before_pool": surplus, "pot_in": pot_in, "pot_draw": pot_draw, "retired_draw": retired_draw, "surplus": surplus_after,
                    "one_offs": one, "maturities": mat, "closed": closed, "settle": settle, "interest": interest, "invested": invested,
                    "closing_cash": cash, "pots": dict(pots), "net_worth": net, "income_total": income})
        # the ledger's identity, every month
        flows = surplus_after + one_total + sum(mat.values()) + sum(closed.values()) + settle + interest - invested
        assert abs(row["opening_cash"] + flows - cash) < 1e-6
        months.append(row)
        nw.append(net)
    return months, nw


def start_net() -> float:
    v = assets_at_start()
    own = sum(val / (FX0 if (k in ASSET_CLASS and ASSET_CLASS[k][0] == "INR") or k == "nre" else 1) for k, val in v.items())
    owe = D["mortgage"]["balance"] + D["car"]["balance"] + D["hdfc"]["balance"] / FX0 + H["statements_oct"]["barclaycard_nov"]["balance"]
    return round(own) - round(owe)


# --- the scenarios ----------------------------------------------------------------------------------------------
SALARY_STEP = {"id": "salary_step", "what": "Arun's salary steps up", "effect": "change_flow", "type": "income",
               "member_id": "arun", "category": "Income", "start": "2028-09", "amount": 5500, "ccy": "GBP",
               "target_ref": {"commitment": "Salary · Arun", "how": "set to"},
               "growth": {"kind": "member", "pct": growth["arun"], "note": "his own growth, from the next April"},
               "source_text": "my salary goes to £5,500 a month from Sep 2028", "status": "active", "version": 1}
HDFC_CLOSE = {"id": "hdfc_close", "what": "Close the HDFC home loan", "effect": "record_event", "type": "spend",
              "member_id": "arun", "category": "Debt", "start": "2029-03", "one_off_event": True, "ccy": "INR",
              "target_ref": {"record": "Home loan · HDFC (Pune flat)", "how": "prepay the balance"},
              "funded_from": "Fixed deposit · SBI, at maturity", "source_text": "close my HDFC loan with the SBI FD when it matures",
              "status": "active", "version": 1}
FD_AT_MATURITY = 617538


def changes_for(*names):
    out = []
    for n in names:
        if n == "salary_step":
            out.append({"kind": "salary", "member": "arun", "from": "2028-09", "to": 5500})
        if n == "hdfc_close":
            out.append({"kind": "close_loan", "loan": "hdfc", "when": "2029-03", "amount_inr": FD_AT_MATURITY})
    return out


def caused_gap(base_ms, ms):
    """The months a plan pushes below the floor (and the base did not), before anyone retires."""
    last = min(retire.values())
    return [(r["i"], FLOOR - r["surplus"]) for r, b in zip(ms, base_ms)
            if r["i"] < last and r["surplus"] < FLOOR - 0.5 and b["surplus"] >= FLOOR - 0.5]


def pot_change(first: int, second: int) -> list[dict]:
    return [{"kind": "save_pot", "id": "school_pot", "draw_from": "2029-01",
             "steps": [("2026-11", "2027-06", first), ("2027-07", "2028-12", second)]}]


def goal_seek_pot(plans, base_ms):
    """A pot from this month: the least flat amount that covers every month the fees push below the floor and never
    leaves cash below zero (the extension is paid from cash in Jun 2027). Two steps only if no flat amount fits."""
    def ok(a, b):
        ms, _ = run(plans, pot_change(a, b))
        return not caused_gap(base_ms, ms) and all(r["closing_cash"] >= 0 for r in ms)
    for a in range(10, 3000, 10):
        ms, _ = run(plans, pot_change(a, a))
        if any(r["closing_cash"] < 0 for r in ms[:idx(2027, 7)]):
            break
        if ok(a, a):
            return a, a
    first = max(a for a in range(0, 3000, 10) if all(r["closing_cash"] >= 0 for r in run(plans, pot_change(a, 0))[0][:idx(2027, 7)]))
    second = next(b for b in range(0, 3000, 10) if ok(first, b))
    return first, second


def mc_shocks(paths=300, seed=7):
    rnd = random.Random(seed)
    out = [None]                      # path 0: the deterministic run
    for _ in range(paths):
        out.append([{c: rnd.gauss(RET[c], VOL[c]) for c in VOL} for _y in range(YEARS + 1)])
    return out


SHOCKS = mc_shocks()


def fan(plans, changes=None):
    det_ms, det = run(plans, changes)
    ends = [idx(y, 12) for y in range(2026, 2057)]
    cols = {y: [] for y in range(2026, 2057)}
    for sh in SHOCKS[1:]:
        _, nw = run(plans, changes, sh)
        for y, k in zip(range(2026, 2057), ends):
            cols[y].append(nw[k])
    rows = []
    for y in range(2026, 2057):
        c = sorted(cols[y])
        q = lambda f: int(round(c[int(f * (len(c) - 1))] / 1000) * 1000)
        rows.append({"year": y, "p10": q(0.10), "p50": q(0.50), "p90": q(0.90), "deterministic": int(round(det[idx(y, 12)] / 1000) * 1000)})
    return det_ms, rows


def lr_round(parts: dict, total: float) -> dict:
    """Round each part so the parts sum to the rounded total (largest remainder; signs kept)."""
    t = round(total)
    fl = {k: math.floor(v) for k, v in parts.items()}
    left = t - sum(fl.values())
    for k in sorted(parts, key=lambda k: parts[k] - fl[k], reverse=True)[:max(left, 0)]:
        fl[k] += 1
    return fl


NAMES = {"arun": "Arun", "asha": "Asha", "rent": "Pune rent", "pension_arun": "Arun's pension", "pension_asha": "Asha's pension",
         "bonus": "Asha's bonus", "mortgage": "Mortgage · Nationwide", "car": "Car loan · Close Brothers", "hdfc": "Home loan · HDFC",
         "schooling": "School fees", "extension": "Home extension", "car2": "Replace the car", "saver": "Fixed-rate saver",
         "sbi_fd": "Fixed deposit · SBI", "ppf": "PPF · SBI", "lic": "LIC Jeevan Anand"}


def ledger_rows(ms, rows_of):
    """Sum months into one row, every list rounded so it sums to the total shown; the surplus is the sum of its lines."""
    def tot(key, sub=None):
        acc = {}
        for r in rows_of:
            for k, v in r[key].items():
                acc[k] = acc.get(k, 0.0) + v
        return acc
    inc = tot("income")
    inc.update({k: v for k, v in tot("plans_income").items()})
    spend = tot("spend")
    emis = tot("emis")
    plans = tot("plans_spend")
    sip = sum(r["sip"] for r in rows_of)
    prem = sum(r["premium"] for r in rows_of)
    pot_in = sum(r["pot_in"] for r in rows_of)
    pot_draw = sum(r["pot_draw"] for r in rows_of)
    ret_draw = sum(r["retired_draw"] for r in rows_of)
    inc_r = lr_round({NAMES.get(k, k): v for k, v in inc.items() if abs(v) > 0.004}, sum(inc.values()))
    sp_r = lr_round(spend, sum(spend.values()))
    em_r = lr_round({NAMES[k]: v for k, v in emis.items()}, sum(emis.values())) if emis else {}
    pl_r = {NAMES.get(k, k): round(v) for k, v in plans.items()}
    lines = {"income": sum(inc_r.values()), "spend": -sum(sp_r.values()), "emis": -sum(em_r.values()), "sip": -round(sip),
             "premium": -round(prem), "plans": sum(pl_r.values()), "to_pot": -round(pot_in), "from_pot": round(pot_draw),
             "from_investments": round(ret_draw)}
    surplus = sum(lines.values())
    one = {}
    for r in rows_of:
        for k, v in r["one_offs"].items():
            one[NAMES.get(k, k)] = one.get(NAMES.get(k, k), 0) + v
    mat = {}
    for r in rows_of:
        for k, v in r["maturities"].items():
            mat[NAMES.get(k, k)] = mat.get(NAMES.get(k, k), 0) + v
    closed = {}
    for r in rows_of:
        for k, v in r["closed"].items():
            closed[NAMES.get(k, k)] = closed.get(NAMES.get(k, k), 0) + v
    below = [r for r in rows_of if r["surplus"] < FLOOR - 0.5]
    fxs = [r["fx"] for r in rows_of]
    return {
        "income": inc_r, "income_total": sum(inc_r.values()),
        "spend": sp_r, "spend_total": sum(sp_r.values()),
        "emis": em_r, "emis_total": sum(em_r.values()), "sip": round(sip), "premium": round(prem),
        "plans": pl_r, "to_pot": round(pot_in), "from_pot": round(pot_draw), "from_investments": round(ret_draw),
        "surplus": surplus,
        "savings_rate": round(surplus / sum(inc_r.values()), 3) if inc_r else None,
        "one_offs": {k: round(v) for k, v in one.items()}, "maturities": {k: round(v) for k, v in mat.items()},
        "loans_closed": {k: round(v) for k, v in closed.items()},
        "invested": round(sum(r["invested"] for r in rows_of)), "opening_cash": round(rows_of[0]["opening_cash"]),
        "closing_cash": round(rows_of[-1]["closing_cash"]),
        "below_floor": len(below), "below_floor_months": [r["label"] for r in below],
        "lowest_month": min(rows_of, key=lambda r: r["surplus"])["label"], "lowest_surplus": round(min(r["surplus"] for r in rows_of)),
        "cash_negative": next((r["label"] for r in rows_of if r["closing_cash"] < 0), None),
        "fx_avg": round(sum(fxs) / len(fxs), 2), "deflator": round(1 / (1 + INFL["UK"]) ** (rows_of[-1]["y"] - 2026), 4),
    }


def forecast(ms, last_year=2056):
    years = []
    for y in range(2026, last_year + 1):
        rows = [r for r in ms if r["y"] == y]
        row = ledger_rows(ms, rows)
        row["year"] = y
        row["span"] = "Nov–Dec" if y == 2026 else "Jan–Dec"
        years.append(row)
    return years


def month_rows(ms, y):
    out = []
    for r in [r for r in ms if r["y"] == y]:
        row = ledger_rows(ms, [r])
        row["month"] = r["label"]
        out.append(row)
    return out


def at(fan_rows, y, key="p50"):
    return next(r[key] for r in fan_rows if r["year"] == y)


def build():
    S0 = EXISTING
    S1 = EXISTING + [SCHOOLING]
    ms0, fan0 = fan(S0)
    ms1, fan1 = fan(S1)
    gap = caused_gap(ms0, ms1)
    gap_total = round(sum(g for _, g in gap))
    gap_by_year = {}
    for i, g in gap:
        gap_by_year[ym(i)[0]] = gap_by_year.get(ym(i)[0], 0) + g
    # the options the goal-seek works out (ARCHITECTURE §6.6, item 7)
    pot = goal_seek_pot(S1, ms0)
    o_pot = pot_change(*pot)
    trims = [{"kind": "trim", "category": "Holidays", "to": 150, "from": "2029-01", "until": "2041-07"},
             {"kind": "trim", "category": "Eating out", "to": 100, "from": "2029-01", "until": "2041-07"},
             {"kind": "trim", "category": "Shopping", "to": 150, "from": "2029-01", "until": "2041-07"}]
    o_trim = trims + [{"kind": "draw_pool", "id": "isa_gap", "pool": "balanced", "draw_from": "2029-01"}]
    o_isa = [{"kind": "draw_pool", "id": "isa_gap", "pool": "balanced", "draw_from": "2029-01"}]
    options = []
    for oid, ch in (("pot", o_pot), ("trim", o_trim), ("isa", o_isa)):
        ms, fn = fan(S1, ch)
        assert not caused_gap(ms0, ms), oid
        assert all(r["closing_cash"] >= 0 for r in ms), oid
        drawn = round(sum(r["pot_draw"] for r in ms if r["i"] < min(retire.values())))
        options.append({"id": oid, "ms": ms, "fan": fn, "drawn": drawn, "changes": ch})
    # more options: the earliest January the fees could start without breaking the floor; the SIP paused
    move_to = None
    for y in range(2029, 2042):
        moved = [{"kind": "move", "plan": "schooling", "to": f"{y}-01", "end": "2041-07"}]
        ms, _ = run(S1, moved)
        if not caused_gap(ms0, ms):
            move_to = y
            break
    sip_ms, _ = run(S1, [{"kind": "pause_sip", "from": "2029-01", "until": "2041-07"}])
    sip_gap = round(sum(g for _, g in caused_gap(ms0, sip_ms)))
    # the picked option applied (the agent's first, which Arun confirms on the boards), then the later plans
    msA, fanA = options[0]["ms"], options[0]["fan"]
    S3c = o_pot + changes_for("salary_step")
    ms3, fan3 = fan(S1 + [SALARY_STEP], S3c)
    S4c = S3c + changes_for("hdfc_close")
    ms4, fan4 = fan(S1 + [SALARY_STEP, HDFC_CLOSE], S4c)
    return locals()


def yearly(ms):
    return {r["y"]: r for r in ms}


if __name__ == "__main__" and "--probe" in sys.argv:
    B = build()
    print("gap", B["gap_total"], {k: round(v) for k, v in B["gap_by_year"].items()}, "pot", B["pot"], "move_to", B["move_to"], "sip_gap", B["sip_gap"])
    for name, fn in (("S0", B["fan0"]), ("S1", B["fan1"]), ("pot", B["options"][0]["fan"]), ("trim", B["options"][1]["fan"]), ("isa", B["options"][2]["fan"]), ("S3", B["fan3"]), ("S4", B["fan4"])):
        print(name, [(y, at(fn, y), at(fn, y, "deterministic")) for y in (2031, 2036, 2046, 2056)])
    for o in B["options"]:
        print(o["id"], "drawn", o["drawn"])


def money_pair(fn, y):
    return {"p10": at(fn, y, "p10"), "p50": at(fn, y), "p90": at(fn, y, "p90")}


def main():
    B = build()
    fan0, fan1 = B["fan0"], B["fan1"]
    opt = {o["id"]: o for o in B["options"]}
    yrs = (2031, 2036, 2046)
    s1y, s0y = {r["year"]: r for r in forecast(B["ms1"], 2046)}, {r["year"]: r for r in forecast(B["ms0"], 2046)}
    gap_months = [label(i) for i, _ in B["gap"]]

    def effect(ms, fn):
        f = {r["year"]: r for r in forecast(ms, 2046)}
        return {"surplus_by_year": {y: f[y]["surplus"] for y in range(2027, 2047)},
                "below_floor_months": sum(f[y]["below_floor"] for y in range(2026, 2047)),
                "middle_path": {y: at(fn, y) for y in yrs},
                "vs_plan_saved": {y: at(fn, y) - at(fan1, y) for y in yrs}}

    pot1, pot2 = B["pot"]
    pot_total = pot1 * 8 + pot2 * 18
    out = {
        "about": "The future-plans boards' figures (MA-264): MA-193's household (household-v4.json), run forward month by month "
                 "from 1 Nov 2026 by make_future_plans.py, a design aid and not the product's engine (MA-219). Illustrative.",
        "clock": {"day": "2026-11-02", "day_label": "Mon 2 Nov", "evening": "20:41 to 21:05",
                  "why": "after October closed (Sun 1 Nov, 09:02) and before Thursday's HDFC EMI; one evening, so every frame shares one clock",
                  "net_worth_today": H["totals_after_statement_sun_1_nov"]["net_gbp"], "fx": FX0},
        "settings": {"floor_gbp_month": FLOOR, "floor_note": "Arun's floor: the monthly surplus he keeps (his setting)",
                     "surplus_rule": "Cash up to 6 months of outgoings, plus the one-offs due in the next 12 months; the rest into Balanced (ISA) each month",
                     "inflation_keys": {"UK": INFL["UK"], "UK health": INFL["UK health"], "India": INFL["IN"], "UK school fees": INFL["UK school fees"]},
                     "categories": [{"category": c, "inflation_key": {"IN": "India"}.get(k, k), "plan_today": (FAMILY_INR if c.startswith("Family") else plan_gbp[c]), "ccy": "INR" if c.startswith("Family") else "GBP"} for c, k in CATS],
                     "horizon_default_years": 20, "horizon_choices": [5, 10, 20, 30], "cash_rate": CASH_RATE,
                     "retirement": "Arun 60 in Jan 2051, Asha in Jan 2053; a pension pays 4% of its pot a year; in retirement Balanced pays any gap"},
        "plans": {"existing": EXISTING, "schooling": SCHOOLING, "salary_step": SALARY_STEP, "hdfc_close": HDFC_CLOSE},
        "conversation": [
            {"t": "20:41", "who": "Arun", "says": SCHOOLING["source_text"]},
            {"t": "20:41", "who": "MyPaisa", "asks": [
                {"slot": "until when", "q": "Until when?", "chips": ["Jul 2041", "For 10 years", "No end date"], "answer": "Jul 2041"},
                {"slot": "how it grows", "q": "How do the fees grow?", "chips": ["4.5% a year, UK school fees", "No growth", "Another rate"], "answer": "4.5% a year, UK school fees"},
                {"slot": "paid from where", "q": "Paid from where?", "chips": ["The monthly budget", "A pool you name"], "answer": "The monthly budget"},
            ], "known": {"amount": "£4,000 a month", "from": "Jan 2029", "whose": "the household's, paid by Arun's budget", "for": "your kid (not a member)", "category": "Education, new"}},
            {"t": "20:42", "who": "MyPaisa", "card": "impact"},
            {"t": "20:43", "who": "Arun", "taps": "Confirm", "audit": "Plan item added · School fees, £4,000 a month from Jan 2029 to Jul 2041, 4.5% a year · Arun · Mon 2 Nov 20:43 · in the chat · 2046 middle path " + gbp(at(fan1, 2046) - at(fan0, 2046))},
            {"t": "20:43", "who": "MyPaisa", "card": "rearrange"},
            {"t": "20:46", "who": "Arun", "taps": "Confirm option 1", "audit": [
                (f"Plan item added · School fees pot, £{pot1:,} a month from Nov 2026 to Dec 2028, drawn from Jan 2029 · Arun · Mon 2 Nov 20:46 · in the chat · Undo"
                 if pot1 == pot2 else
                 f"Plan item added · School fees pot, £{pot1:,} a month from Nov 2026 to Jun 2027, then £{pot2:,} to Dec 2028, drawn from Jan 2029 · Arun · Mon 2 Nov 20:46 · in the chat · Undo"),
                f"November's budget changed · School fees pot £{pot1:,} added; planned surplus £2,636 → £{2636 - pot1:,} · Arun · Mon 2 Nov 20:46 · in the chat · Undo"]},
            {"t": "20:52", "who": "Arun", "says": SALARY_STEP["source_text"]},
            {"t": "20:58", "who": "Arun", "says": HDFC_CLOSE["source_text"]},
        ],
        "runs": {
            "R0": {"when": "Sun 1 Nov 09:03", "after": "October closed", "plans": [p["id"] for p in EXISTING], "fan": fan0},
            "R1": {"when": "Mon 2 Nov 20:43", "after": "School fees saved", "plans": [p["id"] for p in EXISTING] + ["schooling"], "fan": fan1},
            "R2": {"when": "Mon 2 Nov 20:46", "after": "the school fees pot applied", "fan": opt["pot"]["fan"]},
            "R3": {"when": "Mon 2 Nov 20:53", "after": "Arun's salary step saved", "fan": B["fan3"]},
            "R4": {"when": "Mon 2 Nov 20:59", "after": "the HDFC loan's closure saved", "fan": B["fan4"]},
        },
        "impact": {
            "plan": "schooling", "middle_path_before": {y: at(fan0, y) for y in yrs}, "middle_path_after": {y: at(fan1, y) for y in yrs},
            "change": {y: at(fan1, y) - at(fan0, y) for y in yrs},
            "surplus_by_year_before": {y: s0y[y]["surplus"] for y in range(2027, 2047)},
            "surplus_by_year_after": {y: s1y[y]["surplus"] for y in range(2027, 2047)},
            "below_floor_months": len(gap_months), "first_below_floor": gap_months[0], "last_below_floor": gap_months[-1],
            "lowest_month": min(B["ms1"][:240], key=lambda r: r["surplus"])["label"], "lowest_surplus": round(min(r["surplus"] for r in B["ms1"][:240])),
            "cash_negative": next((r["label"] for r in B["ms1"] if r["closing_cash"] < 0), None),
            "new_milestones": [{"when": "2029-01", "what": "School fees start", "amount": "£4,000 a month"},
                               {"when": "2041-07", "what": "School fees end", "frees": gbp(plan_amount(SCHOOLING, idx(2041, 7)) * -1) + " a month"}],
        },
        "rearrange": {
            "gap_total": B["gap_total"], "gap_by_year": {y: round(v) for y, v in B["gap_by_year"].items()},
            "first": gap_months[0], "last": gap_months[-1], "months": len(gap_months),
            "options": [
                {"id": "pot", "rank": 1, "title": "Start a school fees pot this month",
                 "levers": ["draw from a named pool"], "touches_this_month": True,
                 "changes": ([f"Nov 2026 to Dec 2028: £{pot1:,} a month into a School fees pot, this month's budget included (planned surplus £2,636 → £{2636 - pot1:,}); £{pot_total:,} in all"]
                             if pot1 == pot2 else
                             [f"Nov 2026 to Jun 2027: £{pot1:,} a month, this month's budget included (planned surplus £2,636 → £{2636 - pot1:,})",
                              f"Jul 2027 to Dec 2028, after the extension is paid: £{pot2:,} a month (£{pot_total:,} in all)"])
                            + [f"From Jan 2029: the pot tops the surplus up to your £500 floor when the fees push it below, until {gap_months[-1]}"],
                 "why": "It uses the room in today's budget before the fees start, still leaves cash for the extension in June, and keeps your spending and investing from 2029 as they are.",
                 "effect": effect(opt["pot"]["ms"], opt["pot"]["fan"]), "drawn": opt["pot"]["drawn"]},
                {"id": "trim", "rank": 2, "title": "Spend less on holidays, eating out and shopping from Jan 2029",
                 "levers": ["trim a category from a date", "draw from a named pool"], "touches_this_month": False,
                 "changes": ["Holidays £400 → £150 a month, Jan 2029 to Jul 2041 (today's money)",
                             "Eating out £180 → £100 a month, same dates", "Shopping £250 → £150 a month, same dates",
                             f"Balanced (ISA) covers what the trims do not: {gbp(opt['trim']['drawn'])}, " + ", ".join(sorted({label(r['i'])[-4:] for r in opt['trim']['ms'] if r['pot_draw'] > 0.5}))],
                 "why": "The highest net worth of the three, for £430 a month less to spend (today's money) for twelve and a half years.",
                 "effect": effect(opt["trim"]["ms"], opt["trim"]["fan"]), "drawn": opt["trim"]["drawn"]},
                {"id": "isa", "rank": 3, "title": "Take the gap from Balanced (ISA)",
                 "levers": ["draw from a named pool"], "touches_this_month": False,
                 "changes": [f"Balanced (ISA) pays {gbp(opt['isa']['drawn'])} over {gap_months[0][-4:]} to {gap_months[-1][-4:]}, {gbp(B['gap_by_year'][2029])} of it in 2029"],
                 "why": "Nothing you spend changes; the investments you would have kept pay for it.",
                 "effect": effect(opt["isa"]["ms"], opt["isa"]["fan"]), "drawn": opt["isa"]["drawn"]},
            ],
            "more": [
                {"title": f"Start the fees in Jan {B['move_to']} instead", "lever": "move a plan's start",
                 "note": "Covers it, but only if the start date can move; school dates usually can't."},
                {"title": "Pause the Parag Parikh SIP (₹10,000 a month) from Jan 2029", "lever": "pause or reduce a SIP",
                 "note": f"Covers {gbp(B['gap_total'] - B['sip_gap'])} of {gbp(B['gap_total'])}; not enough on its own."},
            ],
            "applied": "pot",
        },
        "forecast": {
            "R1": {"years": forecast(B["ms1"], 2056), "months_2029": month_rows(B["ms1"], 2029)},
            "R2": {"years": forecast(opt["pot"]["ms"], 2056), "months_2029": month_rows(opt["pot"]["ms"], 2029),
                   "months_2026": month_rows(opt["pot"]["ms"], 2026)},
            "R4": {"years": forecast(B["ms4"], 2056), "months_2029": month_rows(B["ms4"], 2029)},
            "R0": {"years": forecast(B["ms0"], 2056)},
        },
        "later": {
            "salary_step": {"middle_path_before": {y: at(opt["pot"]["fan"], y) for y in yrs}, "middle_path_after": {y: at(B["fan3"], y) for y in yrs},
                            "arun_take_home_aug_2028": round(B["ms1"][idx(2028, 8)]["income"]["arun"]), "set_to": 5500},
            "hdfc_close": {"balance_mar_2029_inr": None, "fd_inr": FD_AT_MATURITY,
                           "middle_path_before": {y: at(B["fan3"], y) for y in yrs}, "middle_path_after": {y: at(B["fan4"], y) for y in yrs}},
        },
    }
    # the HDFC balance the FD clears, and what is left over
    close = B["ms4"][idx(2029, 3)]["closed"]["hdfc"] * -1 * B["ms4"][idx(2029, 3)]["fx"]
    out["later"]["hdfc_close"]["balance_mar_2029_inr"] = round(close)
    out["later"]["hdfc_close"]["left_over_inr"] = round(FD_AT_MATURITY - close)
    out["later"]["hdfc_close"]["frees_inr_a_month"] = round(LOANS["hdfc"]["pay"])
    out["later"]["hdfc_close"]["emis_saved"] = 16
    # checks the boards rely on (lesson 10): every year's lines sum to its surplus; the ledger closes
    for key in ("R1", "R2", "R4", "R0"):
        for r in out["forecast"][key]["years"]:
            lines = r["income_total"] - r["spend_total"] - r["emis_total"] - r["sip"] - r["premium"] + sum(r["plans"].values()) - r["to_pot"] + r["from_pot"] + r["from_investments"]
            assert lines == r["surplus"], (key, r["year"])
    print(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == "__main__" and "--probe" not in sys.argv:
    main()
