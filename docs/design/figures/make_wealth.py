"""Write docs/design/figures/wealth-v5.json: the few figures Prototype v5's wealth chapters (phases 2 to 7 and 9,
MA-291) need that household-v4.json and future-plans-v4.json do not hold. It reads both sets, never changes them,
and asserts every claim the wealth chapters make over these figures (lesson 38: no asserts on typed-in literals).

- ppfas_sip: Parag Parikh's 46 SIPs, the working behind its 10.7% XIRR (MA-216, MA-217);
- import: the Excel importer's dry run on Fri 6 Nov (MA-111): Infosys's past buys added, the SIPs already there,
  two rows refused with their reasons, and Infosys's XIRR once its buys are in (MA-215);
- tuner: the household learning at March 2027's close, Thu 1 Apr 2027 (MA-276, ARCHITECTURE 20.9): March graded
  against its Budget forecast line, and the tuner's Groceries proposal from six closed months.

Run: python3 docs/design/figures/make_wealth.py   (writes wealth-v5.json beside it)
Illustrative figures and names, a design aid, not the product's engine.
"""
import json
import pathlib
from datetime import date

HERE = pathlib.Path(__file__).resolve().parent
H = json.loads((HERE / "household-v4.json").read_text(encoding="utf-8"))
FP = json.loads((HERE / "future-plans-v4.json").read_text(encoding="utf-8"))
ASSETS = {a["id"]: a for a in H["assets"]}
CLOSE = date(2026, 10, 23)   # prices at the Fri 23 Oct close


def xirr(flows):
    """XIRR by bisection on dated flows (negative in, positive out), actual/365."""
    d0 = flows[0][0]

    def npv(r):
        return sum(a / (1 + r) ** ((d - d0).days / 365.0) for d, a in flows)

    lo, hi = -0.9, 2.0
    assert npv(lo) > 0 > npv(hi)
    for _ in range(200):
        m = (lo + hi) / 2
        if npv(m) > 0:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


def day(d):
    return d.strftime("%a ") + str(d.day) + d.strftime(" %b %Y")


def rhe(x):
    """round half to even, as the figure sets round"""
    return int(round(x))


# ---------- Parag Parikh's SIPs and its XIRR (MA-216, MA-217) ----------
pp = ASSETS["ppfas"]
sip_amount, sip_day = pp["sip"]
sips = []
y, m = 2023, 1
while (y, m) <= (2026, 10):
    sips.append(date(y, m, sip_day))
    m += 1
    if m == 13:
        y, m = y + 1, 1
assert len(sips) * sip_amount == pp["invested"], "the SIPs must add up to what the set says went in"
pp_x = xirr([(d, -sip_amount) for d in sips] + [(CLOSE, pp["value"])])
assert round(pp_x, 3) == round(pp["xirr"], 3), (pp_x, pp["xirr"])
assert abs(pp["units"] * pp["nav"] - pp["value"]) < 1, "units times NAV is the value"
ppfas_sip = {
    "count": len(sips), "amount": sip_amount, "day": sip_day, "first": day(sips[0]), "last": day(sips[-1]),
    "invested": len(sips) * sip_amount, "value": pp["value"], "gain": pp["value"] - len(sips) * sip_amount,
    "xirr": round(pp_x, 4), "xirr_pct": round(pp_x * 100, 1), "next": "Tue 10 Nov", "units": pp["units"], "nav": pp["nav"],
}
assert date(2026, 11, 10).strftime("%a") == "Tue"

# ---------- The Excel importer's dry run, Fri 6 Nov 21:04 (MA-111) ----------
inf = ASSETS["infosys"]
inf_buys = [(date(2022, 3, 14), 50, 1742.30), (date(2023, 3, 15), 40, 1402.65), (date(2024, 6, 10), 30, 1489.20)]
assert sum(u for _, u, _ in inf_buys) == inf["units"], "the buys must make the 120 shares the set holds"
assert abs(inf["units"] * inf["price"] - inf["value"]) < 1
inf_cost = sum(u * p for _, u, p in inf_buys)
inf_x = xirr([(d, -u * p) for d, u, p in inf_buys] + [(CLOSE, inf["value"])])
refused = [
    {"row": 50, "what": "Balanced · " + day(date(2024, 3, 1)) + " · a buy", "amount_inr": 20000,
     "why": "Balanced is held in pounds, so a rupee amount can't go into it"},
    {"row": 51, "what": "NASDAQ 100 ETF · " + day(date(2026, 11, 16)) + " · a buy", "amount_gbp": 100,
     "why": "dated after today, Fri 6 Nov"},
]
assert date(2024, 3, 1).strftime("%a") == "Fri" and date(2026, 11, 16) > date(2026, 11, 6)
rows_total = len(sips) + len(inf_buys) + len(refused)
imp = {
    "file": "mypaisa-history-v1.xlsx", "template": "v1", "sheet": "Transactions", "rows": rows_total,
    "already": len(sips), "already_what": "Parag Parikh's SIPs, matched by each row's fingerprint",
    "add": [{"date": day(d), "units": u, "price": p, "amount": round(u * p, 2)} for d, u, p in inf_buys],
    "add_n": len(inf_buys), "add_cost": round(inf_cost, 2), "refused": refused, "refused_n": len(refused),
    "infosys_xirr_pct": round(inf_x * 100, 1), "infosys_value": inf["value"], "infosys_gain": round(inf["value"] - inf_cost, 2),
    "when": "Fri 6 Nov 21:04", "link": "Fri 6 Nov 21:02, one upload within 15 minutes",
}
assert imp["already"] + imp["add_n"] + imp["refused_n"] == imp["rows"]

# ---------- The household learns: March graded, Groceries tuned, Thu 1 Apr 2027 (MA-276) ----------
W = FP["forecast"]["W"]["months_2027"]
assert [m["month"] for m in W[:4]] == ["Jan 2027", "Feb 2027", "Mar 2027", "Apr 2027"]
oct_g = [c for c in H["budget_oct"]["plan"] if c["category"] == "Groceries"][0]
plan_2026 = oct_g["plan"]
months = [("Oct 2026", plan_2026, oct_g["actual"]), ("Nov 2026", plan_2026, 698), ("Dec 2026", plan_2026, 741),
          ("Jan 2027", W[0]["spend"]["Groceries"], 712), ("Feb 2027", W[1]["spend"]["Groceries"], 705),
          ("Mar 2027", W[2]["spend"]["Groceries"], 719)]
uk = FP["settings"]["inflation_keys"]["UK"]
assert W[0]["spend"]["Groceries"] == rhe(plan_2026 * (1 + uk)), "January's plan is October's grown by the UK key"
over = [a - p for _, p, a in months]
n_over = sum(1 for o in over if o > 0)
mean_over = sum(over) / len(over)
in_2027 = [a * (1 + uk) if mo.endswith("2026") else a for mo, _, a in months]
proposal = 5 * rhe(sum(in_2027) / len(in_2027) / 5)
plan_2027 = W[3]["spend"]["Groceries"]
step = FP["settings"].get("tuner_step", 0.10)
assert proposal <= plan_2027 * (1 + step), "one step at a time"
err_plan = sum(abs(o) for o in over)
err_new = sum(abs(a - (proposal / (1 + uk) if mo.endswith("2026") else proposal)) for mo, _, a in months)
closer = err_plan - err_new
margin = 50
assert len(months) >= 6 and closer > margin, "proposed only with 6 closed months, and only if it forecasts better by the margin"
apr = W[3]
surplus_now = apr["surplus"]
surplus_new = surplus_now - (proposal - plan_2027)
# March graded against its line of the Budget forecast (the run current on 1 Mar)
mar = W[2]
mar_actual_spend = dict(mar["spend"])
mar_actual_spend.update({"Groceries": 719, "Eating out": 207, "Holidays": 0, "Other": 96})
gaps = sorted(((k, mar_actual_spend[k] - mar["spend"][k]) for k in mar["spend"] if mar_actual_spend[k] != mar["spend"][k]),
              key=lambda kv: -abs(kv[1]))
spend_f, spend_a = sum(mar["spend"].values()), sum(mar_actual_spend.values())
assert spend_f == mar["spend_total"], "the forecast's lines add up to its total"
surplus_a = mar["surplus"] - (spend_a - spend_f)
tuner = {
    "when": "Thu 1 Apr 2027", "closed": len(months), "months": [{"m": mo, "plan": p, "actual": a} for mo, p, a in months],
    "n_over": n_over, "mean_over": rhe(mean_over), "plan_now": plan_2027, "plan_2026": plan_2026, "proposal": proposal,
    "closer": rhe(closer), "err_plan": err_plan, "err_new": rhe(err_new), "margin": margin, "step_pct": round(step * 100),
    "surplus_month": "Apr 2027", "surplus_now": surplus_now, "surplus_new": surplus_new,
    "march": {"forecast_spend": spend_f, "actual_spend": spend_a, "forecast_surplus": mar["surplus"], "actual_surplus": surplus_a,
              "gaps": [{"cat": k, "gap": g, "forecast": mar["spend"][k], "actual": mar_actual_spend[k]} for k, g in gaps],
              "income": mar["income_total"], "emis": mar["emis_total"]},
}
assert date(2027, 4, 1).strftime("%a") == "Thu"
assert tuner["march"]["actual_surplus"] - tuner["march"]["forecast_surplus"] == -sum(g for _, g in gaps)

OUT = {
    "about": "Prototype v5's wealth figures (MA-291) that the v4 sets do not hold: written by make_wealth.py from "
             "household-v4.json and future-plans-v4.json, every claim asserted over them. Illustrative.",
    "ppfas_sip": ppfas_sip, "import": imp, "tuner": tuner,
}

if __name__ == "__main__":
    p = HERE / "wealth-v5.json"
    p.write_text(json.dumps(OUT, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("wrote", p.name, "· ppfas XIRR", ppfas_sip["xirr_pct"], "· Infosys XIRR", imp["infosys_xirr_pct"],
          "· tuner", plan_2027, "→", proposal, "closer by", rhe(closer), "· Apr surplus", surplus_now, "→", surplus_new)
