#!/usr/bin/env python3
"""MA-301: the deep scan's redesign items, drawn as a /design-first options round.

Writes seven option canvases into docs/design/reviews/MA-301/ (options until Arun picks; nothing here is a spec):

  a · Projection header.dc.html      one segmented picker and one 44 pt lens menu (P2-3)
  b · Statement Confirm.dc.html      merchant questions apart from a compact Confirm (P2-3)
  c · Desktop three panes.dc.html    1133 to 1392 px: one column until the page is wide enough; a chat that folds (P2-3)
  d · Flatter cards.dc.html          hairlines instead of card-in-card; short sentence-case overlines (P2-2)
  e · Web join.dc.html               a browser-only /join/<token> (P2-5)
  f · Type and icons.dc.html         self-hosted type and icon stacks (P2-4)
  g · Command palette.dc.html        Cmd+K on the web desktop (P1-7)

Every figure comes from docs/design/figures/ (household-v4.json, future-plans-v4.json, talk-v5.json) and is asserted
over those figures (lesson 38). Colours are tokens from ds-v1/tokens.css and ios.css only. Run:

  python3 docs/design/reviews/MA-301/build_boards.py          # write the boards
  python3 docs/design/reviews/MA-301/build_boards.py --check  # fail if a written board differs from what this makes
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
DESIGN = HERE.parent.parent
FIG = DESIGN / "figures"
HH = json.loads((FIG / "household-v4.json").read_text())
FP = json.loads((FIG / "future-plans-v4.json").read_text())
TALK = json.loads((FIG / "talk-v5.json").read_text())

MINUS = "−"


# ---------------------------------------------------------------- figures, asserted over the set (lessons 10, 13, 38)
def gbp(v: float, dp: int = 0) -> str:
    s = f"{abs(v):,.{dp}f}"
    return ("−" if v < 0 else "") + "£" + s


def inr(v: float) -> str:
    n = str(int(round(abs(v))))
    if len(n) > 3:
        head, tail = n[:-3], n[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        n = ",".join(parts) + "," + tail
    return "₹" + n


def wd(iso: str) -> str:
    d = dt.date.fromisoformat(iso)
    return d.strftime("%a ") + str(d.day) + d.strftime(" %b")


AFTER = HH["totals_after_new_record"]          # Mon 26 Oct, after the Monzo savings (09:41)
BEFORE = HH["totals_before_new_record"]
NW = AFTER["net_gbp"]
assert NW == 444951 and AFTER["own_gbp"] - AFTER["owe_gbp"] == NW
assert sum(AFTER["by_country_gbp"].values()) == NW
UK, IN = AFTER["by_country_gbp"]["UK"], AFTER["by_country_gbp"]["IN"]
UK_PCT, IN_PCT = round(UK / NW * 100), round(IN / NW * 100)
assert UK_PCT + IN_PCT == 100
OWE_PCT = round(AFTER["owe_gbp"] / AFTER["own_gbp"] * 100)
# the 5-day recorded pulse (MA-295's series): Thu 22 Oct to Mon 26 Oct 09:41
PULSE = [("2026-10-22", 439958), ("2026-10-23", 440180), ("2026-10-24", 440090),
         ("2026-10-25", BEFORE["net_gbp"]), ("2026-10-26", NW)]
CHANGE = PULSE[-1][1] - PULSE[0][1]
assert CHANGE == 4993 and NW - BEFORE["net_gbp"] == 5000 and BEFORE["net_gbp"] - PULSE[0][1] == -7
FX = HH["clock"]["fx"]["gbp_inr"]
assert FX == 112.5
assert inr(AFTER["net_inr"]) == "₹5,00,56,988"

# the statements of Sun 1 Nov (statements_oct): 22 lines, two in amber
ST = HH["statements_oct"]
BC = ST["barclaycard_nov"]
MZ = ST["monzo_current_oct"]
BC_SUM = sum(l["amount_gbp"] for l in BC["lines"])
MZ_SUM = sum(l["amount_gbp"] for l in MZ["spend_lines"])
assert BC_SUM == BC["balance"] == 1458 and MZ_SUM == MZ["spend"] == 788
LINES = BC["lines"] + MZ["spend_lines"]
assert len(LINES) == 22 and len(BC["lines"]) == 16 and len(MZ["spend_lines"]) == 6
SPEND = BC_SUM + MZ_SUM
assert SPEND == HH["budget_oct"]["spend_actual"] == 2246
UNSURE = [l for l in LINES if not l["sure"]]
assert [l["merchant"] for l in UNSURE] == ["PAYPAL *EBAY", "AMZN Mktp"]
AMZN = next(l for l in UNSURE if l["merchant"] == "AMZN Mktp")
EBAY = next(l for l in UNSURE if l["merchant"] == "PAYPAL *EBAY")
CATS: dict[str, int] = {}
for l in LINES:
    CATS[l["category"]] = CATS.get(l["category"], 0) + l["amount_gbp"]
CATS_SORTED = sorted(CATS.items(), key=lambda kv: -kv[1])
assert len(CATS) == 11 and sum(CATS.values()) == SPEND
for row in HH["budget_oct"]["plan"]:
    assert CATS.get(row["category"], 0) == row["actual"], row
RECOG = MZ["recognised"]
assert len(RECOG) == 5
NW_REVIEW, NW_SAVED = "£457,951", gbp(HH["totals_after_statement_sun_1_nov"]["net_gbp"])
assert NW_SAVED == "£456,493"

# the Projection on Thu 5 Nov, run R4 (20:59): 20 years to 2046
R4 = FP["runs"]["R4"]
FAN = [r for r in R4["fan"] if r["year"] <= 2046]
F = {r["year"]: r for r in FAN}
assert (F[2046]["p10"], F[2046]["p50"], F[2046]["p90"]) == (2188000, 2923000, 4058000)
TODAY_NW = FP["clock"]["net_worth_today"]
UK_INFL = f"{FP['settings']['inflation_keys']['UK'] * 100:.1f}%"
IN_INFL = f"{FP['settings']['inflation_keys']['India'] * 100:.0f}%"
assert (UK_INFL, IN_INFL) == ("2.5%", "5%")
assert TODAY_NW == 456747 and FP["clock"]["day_label"] == "Thu 5 Nov"
assert wd("2026-11-05") == "Thu 5 Nov"

# the invite (talk-v5.json): Arun invited a member on Sat 5 Sep 18:00; the link held until Sun 6 Sep 18:00;
# Asha joined with Apple on Sun 6 Sep 10:12
SEC = {s["what"]: s for s in TALK["security"]}
INV, JOIN = SEC["Invited a member"], SEC["Joined from the invite, with Apple"]
assert INV["t"] == "2026-09-05T18:00" and JOIN["t"] == "2026-09-06T10:12"
assert wd("2026-09-05") == "Sat 5 Sep" and wd("2026-09-06") == "Sun 6 Sep"

for iso, label in [("2026-10-22", "Thu 22 Oct"), ("2026-10-26", "Mon 26 Oct"), ("2026-11-01", "Sun 1 Nov"),
                   ("2026-10-27", "Tue 27 Oct"), ("2026-10-25", "Sun 25 Oct"), ("2026-10-23", "Fri 23 Oct"),
                   ("2026-10-24", "Sat 24 Oct"), ("2026-12-14", "Mon 14 Dec"), ("2026-11-10", "Tue 10 Nov"),
                   ("2026-10-30", "Fri 30 Oct"), ("2026-10-20", "Tue 20 Oct")]:
    assert wd(iso) == label, (iso, label)
assert AMZN["date"] == "2026-10-27" and EBAY["date"] == "2026-10-25"


# ---------------------------------------------------------------- icons
LUCIDE = {  # Lucide (ISC licence) paths, drawn inline as the web build would with @lucide/svelte
    "house": '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "wallet": '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    "landmark": '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    "trending-up": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    "chart-pie": '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
    "chart-line": '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
    "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    "message-circle": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "eye": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "arrow-up": '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    "circle-user": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
    "ellipsis": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
}


def lu(name: str, size: int = 20, cls: str = "") -> str:
    return (f'<svg class="lu {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{LUCIDE[name]}</svg>')


def ms(name: str, cls: str = "") -> str:
    return f'<span class="ms {cls}" aria-hidden="true">{name}</span>'


MARK = ('<svg class="mpm" width="{s}" height="{s}" viewBox="0 0 48 48" aria-hidden="true"><path class="mpm-coin" d="M40.65 16.71 '
        'A19.5 19.5 0 1 1 31.29 7.35 A6.8 6.8 0 0 0 40.65 16.71 Z"></path><g class="mpm-pound" stroke-width="3.84"><path d="M27.96 '
        '20.65 C27.65 18.1 25.98 16.55 23.74 16.55 C21.2 16.55 19.53 18.35 19.53 20.89 L19.53 28.83 C19.53 30.75 18.85 31.99 17.3 '
        '33.05"></path><path d="M17.3 33.05 L29.2 33.05"></path><path d="M16.8 25.73 L24.86 25.73"></path></g><circle class="mpm-dot" '
        'cx="37.07" cy="10.93" r="5.4"></circle></svg>')


def mark(s: int = 32) -> str:
    return MARK.replace("{s}", str(s))


# ---------------------------------------------------------------- the canvas
CSS_BASE = r"""
html,body{margin:0;background:var(--mp-surface-2);color:var(--mp-ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif}
a:not([class]){color:var(--mp-accent)}
.dv-turn{padding:44px 48px 28px;border-bottom:1px solid var(--mp-line)}
.dv-thd{display:flex;align-items:baseline;gap:12px;margin:0 0 10px;flex-wrap:wrap}
.dv-tid{font:600 12px/16px ui-monospace,Menlo,monospace;padding:3px 8px;background:var(--mp-ink);color:var(--mp-bg);border-radius:5px;text-decoration:none}
.dv-tname{font:700 26px/32px -apple-system,"SF Pro Display","Inter",system-ui,sans-serif;letter-spacing:-0.02em}
.bd .dv-tname{font-size:22px;line-height:28px}
.dv-intro,.bd-lead{max-width:1120px;font:15px/22px -apple-system,"SF Pro Text","Inter",system-ui,sans-serif;color:var(--mp-ink-2);margin:0;text-wrap:pretty}
.plan{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;max-width:1120px;box-sizing:border-box;margin:14px 0 0;padding:10px 14px;border-radius:12px;background:var(--mp-surface);border:1px solid var(--mp-line);font:13px/18px -apple-system,system-ui,sans-serif;color:var(--mp-ink-2)}
.plan-k{font:600 12px/16px ui-monospace,Menlo,monospace;padding:3px 8px;border-radius:5px;background:var(--mp-hero);color:var(--mp-hero-ink);text-decoration:none}
.idx{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.idx a{font:600 13px/18px -apple-system,system-ui,sans-serif;color:var(--mp-ink);background:var(--mp-surface);border-radius:999px;padding:10px 14px;text-decoration:none;box-shadow:inset 0 0 0 1px var(--mp-line)}
.bd{display:flex;flex-direction:column;gap:18px;padding:40px 48px;border-bottom:1px solid var(--mp-line)}
.bd-keys{font:600 12px/16px ui-monospace,Menlo,monospace;color:var(--mp-ink-2)}
.bd-row{display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start}
.bd-note{width:300px;flex:none;display:flex;flex-direction:column;gap:10px;font:14px/20px -apple-system,"SF Pro Text",system-ui,sans-serif;color:var(--mp-ink-2);text-wrap:pretty;padding-top:6px}
.bd-note p{margin:0}.bd-note b{color:var(--mp-ink)}
.bd-theme{font:600 12px/16px ui-monospace,Menlo,monospace;color:var(--mp-ink-2);margin:0 0 14px;max-width:100%}
.recb{font:700 12px/16px -apple-system,system-ui,sans-serif;color:var(--mp-on-accent);background:var(--mp-accent);padding:3px 10px;border-radius:999px}
.altb{font:600 12px/16px -apple-system,system-ui,sans-serif;color:var(--mp-ink-2);background:var(--mp-surface);padding:3px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--mp-line)}
.dv-col{display:flex;flex-direction:column;min-width:0}
.nowrap{white-space:nowrap}.f1{flex:1;min-width:0}.z1{position:relative;z-index:1}.tr{text-align:right}
.fx{display:flex}.col{flex-direction:column}.ac{align-items:center}.ab{align-items:baseline}.jb{justify-content:space-between}.wrap{flex-wrap:wrap}
.g4{gap:4px}.g6{gap:6px}.g8{gap:8px}.g10{gap:10px}.g12{gap:12px}.g16{gap:16px}
.pp{margin:0;text-wrap:pretty}
.lg>*{position:relative;z-index:1}
/* the mark */
.mpm{display:block;flex:none}.mpm-coin{fill:var(--mp-hero)}.mpm-pound{fill:none;stroke:var(--mp-hero-ink);stroke-linecap:round;stroke-linejoin:round}.mpm-dot{fill:var(--mp-coral)}
.t-dark .mpm-coin{fill:var(--mp-hero-2)}
.lu{display:block;flex:none}
.kbd{margin-left:auto;font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);background:var(--mp-surface-2);border-radius:6px;padding:2px 6px;flex:none}
/* the iPhone page */
.pg{display:flex;flex-direction:column;gap:14px;padding:4px 16px 140px}
.pg>*{flex-shrink:0}
.navr{display:flex;gap:8px;flex:none}
.gbtn.on{background:var(--mp-hero);color:var(--mp-hero-ink)}
/* the browser frames: a laptop window and the phone's browser */
.bf{position:relative;overflow:hidden;flex:none;border-radius:14px;box-shadow:0 0 0 1px var(--mp-line),var(--mp-shadow);background:var(--mp-bg);color:var(--mp-ink);display:flex;flex-direction:column}
.bf.w1440{width:1440px;height:900px}.bf.w1392{width:1392px;height:860px}.bf.w1366{width:1366px;height:860px}.bf.w1280{width:1280px;height:820px}.bf.w1180{width:1180px;height:820px}.bf.w1133{width:1133px;height:820px}
.bf.w390{width:390px;height:844px;border-radius:22px}
.bbar{height:40px;flex:none;display:flex;align-items:center;gap:10px;padding:0 14px;background:var(--mp-surface-2);border-bottom:1px solid var(--mp-line)}
.bdots{display:flex;gap:6px}.bdots i{width:10px;height:10px;border-radius:50%;background:var(--mp-track);display:block}
.burl{flex:1;max-width:520px;margin:0 auto;height:28px;border-radius:8px;background:var(--mp-surface);display:flex;align-items:center;justify-content:center;gap:6px;font:500 13px/18px var(--mp-font);color:var(--mp-ink-2);white-space:nowrap;overflow:hidden;padding:0 10px}
.burl .ms{font-size:16px}
.w390 .bbar{height:44px;padding:0 12px}.w390 .bdots{display:none}.w390 .burl{max-width:none}
.xshell{flex:1;min-height:0;display:flex}
.xside{width:248px;flex:none;box-sizing:border-box;padding:18px 14px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--mp-line);background:var(--mp-bg)}
.xside .mp-side-i{cursor:default}
.xbrand{display:flex;align-items:center;gap:10px;padding:2px 8px 16px}
.xside-ft{margin-top:auto;padding:0 12px 4px}
.xmain{flex:1;min-width:0;position:relative;overflow:hidden;container:xmain / inline-size;display:flex;flex-direction:column}
.xpad{padding:24px 28px 40px;display:flex;flex-direction:column;gap:18px;max-width:1180px;box-sizing:border-box;width:100%;margin:0 auto}
.xhead{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 16px;flex-wrap:wrap}
.xhead>:first-child{min-width:min(100%,12em)}
.xcols{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:start}
.xcol{display:flex;flex-direction:column;gap:18px;min-width:0}
@container xmain (min-width:760px){.xcols{grid-template-columns:minmax(0,1.3fr) minmax(300px,1fr)}}
.xchat{width:356px;flex:none;display:flex;flex-direction:column;border-left:1px solid var(--mp-line);background:var(--mp-bg);position:relative;overflow:hidden}
.xchh{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:56px;padding:6px 8px 6px 18px;border-bottom:1px solid var(--mp-line)}
.xchl{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;gap:12px;padding:12px 16px;overflow:hidden}
.xchl>*{flex:none}
.wme{align-self:flex-end;max-width:84%;background:var(--mp-hero);color:var(--mp-hero-ink);border-radius:20px 20px 6px 20px;padding:10px 14px;font:400 15px/20px var(--mp-font)}
.wai{display:flex;gap:10px;align-items:flex-start}
.amk{width:28px;height:28px;border-radius:50%;background:var(--mp-hero);display:grid;place-items:center;flex:none}
.amk i{width:11px;height:11px;border-radius:50%;background:var(--mp-coral);box-shadow:0 0 0 3px var(--mp-hero),0 0 0 4.5px var(--mp-coral);display:block}
.waib{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.wtext{font:400 15px/21px var(--mp-font);color:var(--mp-ink);text-wrap:pretty}
.xcomp{display:flex;flex-direction:column;gap:8px;padding:10px 16px 14px;border-top:1px solid var(--mp-line)}
.wchips{display:flex;gap:8px;flex-wrap:wrap}
.wchip{min-height:44px;padding:0 12px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;font:600 13px/18px var(--mp-font);background:var(--mp-surface);color:var(--mp-ink);box-shadow:inset 0 0 0 1px var(--mp-line);box-sizing:border-box}
.wchip .ms{font-size:18px;color:var(--mp-accent)}
.cfld{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 6px 0 16px;border-radius:24px;background:var(--mp-surface);box-shadow:inset 0 0 0 1.5px var(--mp-ink-2);box-sizing:border-box}
.cfld .ph{flex:1;font:400 15px/20px var(--mp-font);color:var(--mp-ink-2)}
.sendb{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--mp-accent);color:var(--mp-on-accent);flex:none}
.sendb .ms{font-size:20px}
/* the phone's browser: a top bar and the five tabs */
.xtop{height:52px;flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 8px 0 16px;border-bottom:1px solid var(--mp-line);background:var(--mp-bg)}
.xscroll{flex:1;min-height:0;overflow:hidden;position:relative}
.xppad{padding:14px 16px 24px;display:flex;flex-direction:column;gap:14px}
.xtabs{flex:none;display:flex;justify-content:space-around;padding:4px 4px 18px;background:var(--mp-surface);border-top:1px solid var(--mp-line)}
.xtab{flex:1 1 0;min-width:0;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--mp-ink-2);font:600 12px/14px var(--mp-font)}
.xtab.on{color:var(--mp-accent)}
.xtab .ms{font-size:24px}
.xtab.on .ms{font-variation-settings:"FILL" 1,"wght" 500,"opsz" 24}
/* shared content parts */
.hero{display:flex;flex-direction:column;gap:12px}
.hup{color:var(--mp-hero-up)}
.hpulse-box{height:56px}
.mp-chartbox>svg{width:100%;height:100%;display:block}
.harea{fill:var(--mp-hero-area)}
.hline{fill:none;stroke:var(--mp-coral);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.hband{fill:var(--mp-band)}
.hgrid{stroke:var(--mp-hero-ink-2);stroke-opacity:.28;stroke-width:1;stroke-dasharray:2 3;vector-effect:non-scaling-stroke}
.mp-chartdot.beacon{box-shadow:0 0 0 2px var(--mp-hero),0 0 0 6px var(--mp-band)}
.hax{display:flex;justify-content:space-between;font:500 12px/16px var(--mp-font);color:var(--mp-hero-ink-2)}
.mbar{height:10px}
.mbar>.mp-track-clip>span{display:block;height:100%;border-radius:999px;background:var(--mp-chart-line)}
.ccy{font-variant-numeric:tabular-nums}
.hl-rows>*+*{border-top:1px solid var(--mp-line)}
.hrow{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 0;box-sizing:border-box}
.hrow .rt{display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin-left:auto;text-align:right}
.chev{color:var(--mp-ink-2);font-size:20px}
.dlink{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;font:600 15px/20px var(--mp-font);color:var(--mp-accent)}
.overs{font:600 13px/18px var(--mp-font);color:var(--mp-ink-2);letter-spacing:0;text-transform:none}
.mp-hero .overs{color:var(--mp-hero-ink-2)}
.edinl{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:12px;background:var(--mp-surface-2);box-shadow:inset 0 0 0 1.5px var(--mp-accent)}
.edwas{font:400 15px/20px var(--mp-font)}
.edwas s{color:var(--mp-ink-2)}
.amb-row{display:flex;flex-direction:column;gap:8px;padding:10px 0;border-top:1px solid var(--mp-line)}
.ccard .ccard-b>.hl-rows{margin:0}
.qchips{display:flex;flex-wrap:wrap;gap:8px}
.qchip{min-height:44px;padding:0 14px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;font:600 15px/20px var(--mp-font);background:var(--mp-surface-2);color:var(--mp-ink);box-sizing:border-box}
.qchip.on{background:var(--mp-accent);color:var(--mp-on-accent)}
.ans{display:flex;align-items:center;gap:8px;font:400 15px/20px var(--mp-font);color:var(--mp-ink-2)}
.ans .ms{color:var(--mp-up);font-size:18px}
"""

EMBED_JS = r"""
(function () {
  var q = new URLSearchParams(location.search), e = q.get('embed');
  document.documentElement.classList.add('t-light');
  if (e) document.documentElement.setAttribute('data-embed', e);
})();
"""


def embed_css(ids: list[str]) -> str:
    rules = ["html[data-embed] section.dv-turn{display:none}", "html[data-embed] section.bd{display:none}",
             "html[data-embed] section.bd{padding:16px 20px;border-bottom:0}"]
    for i in ids:
        rules.append(f'html[data-embed="{i}"] section.bd[id="{i}"]{{display:flex}}')
    return "\n".join(rules)


def page(title: str, css: str, intro: str, sections: list[tuple[str, str]]) -> str:
    ids = [i for i, _ in sections]
    idx = "".join(f'<a href="#{escape(i)}">{escape(n)}</a>' for i, n in [(i, n) for i, n in SECTION_NAMES if i in ids])
    body = "\n".join(s for _, s in sections)
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(title)}</title>
    <script src="../../ios-v1/support.js"></script>
  </head>
  <body>
    <x-dc>
      <helmet data-dc-atomics>
        <meta name="design_doc_mode" content="canvas" />
        <link rel="stylesheet" href="../../ds-v1/tokens.css" />
        <link rel="stylesheet" href="../../ds-v1/ios.css" />
        <link rel="stylesheet" href="../../ds-v1/motion.css" />
        <script src="../../ds-v1/motion.js"></script>
        <script>{EMBED_JS}</script>
        <style>{CSS_BASE}
{css}
{embed_css(ids)}
        </style>
      </helmet>
      <section class="dv-turn" id="intro" data-screen-label="{escape(title)}: intro">
        <div class="dv-thd"><a class="dv-tid" href="#intro">MA-301</a><span class="dv-tname">{escape(title)}</span></div>
        {intro}
        <nav class="idx" aria-label="Options">{idx}</nav>
      </section>
{body}
    </x-dc>
  </body>
</html>
"""


SECTION_NAMES: list[tuple[str, str]] = []


def section(sid: str, tag: str, name: str, badge: str, keys: str, lead: str, frames: list[str], notes: list[tuple[str, str]]) -> tuple[str, str]:
    SECTION_NAMES.append((sid, f"{tag} · {name}"))
    b = f'<span class="recb">{escape(badge)}</span>' if badge.startswith("Recommended") else f'<span class="altb">{escape(badge)}</span>'
    nt = "".join(f"<p><b>{escape(k)}</b> {v}</p>" for k, v in notes)
    return sid, f"""      <section class="bd" id="{sid}" data-screen-label="{escape(tag)} · {escape(name)}">
        <div class="dv-thd"><span class="dv-tid">{escape(tag)}</span><span class="dv-tname">{escape(name)}</span>{b}<span class="bd-keys">{escape(keys)}</span></div>
        <p class="bd-lead">{lead}</p>
        <div class="bd-row">
{"".join(frames)}
          <div class="bd-note">{nt}</div>
        </div>
      </section>"""


def intro_block(paras: list[str], plan: str) -> str:
    return "".join(f'<p class="dv-intro">{p}</p>' for p in paras) + f'<div class="plan">{plan}</div>'


# ---------------------------------------------------------------- frames
SBAR_IC = '<span class="sbar-ic">' + ms("signal_cellular_alt") + ms("wifi") + ms("battery_horiz_075") + "</span>"


def iphone(cap: str, theme: str, clock: str, *, nav: str, title: str | None, body: str, tabs: str | None = "home",
           overlay: str = "", scroll_cls: str = "", pg_style: str = "", chat: str | None = None) -> str:
    tabbar = ""
    if tabs:
        items = [("chat", "chat_bubble", "Chat"), ("home", "home", "Home"), ("activity", "notifications", "Activity"), ("you", "account_circle", "You")]
        tabbar = ('<div class="tabdock"><div class="tabs lg">' + "".join(
            f'<span class="tab{" on" if k == tabs else ""}">{ms(i)}{l}</span>' for k, i, l in items) +
            '</div><span class="tabsearch lg" aria-label="Search">' + ms("search") + "</span></div>")
    lt = f'<div class="largetitle">{escape(title)}</div>' if title else ""
    content = chat if chat is not None else f'<div class="scroll {scroll_cls}"><div class="pg" style="{pg_style}">{body}</div><div class="edge-bot"></div></div>'
    return (f'          <div class="dv-col"><div class="bd-theme">{escape(cap)}</div><div class="dev dev-iphone mp {theme}" data-screen-label="{escape(cap)}">'
            f'<div class="island"></div><div class="scrn"><div class="sbar"><span>{clock}</span>{SBAR_IC}</div>{nav}{lt}{content}{overlay}{tabbar}'
            f'<div class="homebar"></div></div></div></div>\n')


def nav_back(right: str = "") -> str:
    return (f'<div class="nav"><span class="gbtn lg" aria-label="Back">{ms("chevron_left")}</span><span class="navr">{right}</span></div>')


EYE = f'<span class="gbtn lg" aria-label="Privacy mode" aria-pressed="false">{ms("visibility")}</span>'
ASK = f'<span class="gtext lg">{ms("chat_bubble")}<span>Ask</span></span>'

SIDE_ITEMS = [("home", "Home", "house"), ("account_balance_wallet", "Assets", "wallet"), ("credit_card", "Debts", "landmark"),
              ("savings", "Budget", "chart-pie"), ("trending_up", "Projection", "trending-up"), ("candlestick_chart", "Forecast", "chart-line"),
              ("history", "Activity", "history")]


def side(active: str, icons: str = "ms", rail: bool = False) -> str:
    out = []
    for icon, label, luc in SIDE_ITEMS:
        ic = lu(luc, 20) if icons == "lucide" else ms(icon, "ms-fill" if label == active else "")
        if rail:
            out.append(f'<span class="mp-side-i railb{" on" if label == active else ""}" aria-label="{label}" title="{label}">{ic}</span>')
        else:
            out.append(f'<span class="mp-side-i{" on" if label == active else ""}">{ic}{label}</span>')
    if rail:
        return (f'<aside class="xside xrail" aria-label="MyPaisa"><div class="xbrand">{mark(30)}</div>{"".join(out)}'
                f'<span class="mp-side-i railb" aria-label="Search, ⌘K" title="Search">{ms("search")}</span></aside>')
    srch = lu("search", 20) if icons == "lucide" else ms("search")
    return (f'<aside class="xside" aria-label="MyPaisa"><div class="xbrand">{mark(30)}<span class="mp-hl">MyPaisa</span></div>'
            f'<span class="mp-side-i">{srch}Search<span class="kbd">⌘K</span></span>{"".join(out)}'
            f'<div class="mp-foot mp-ink2 xside-ft">Arun · admin</div></aside>')


def chat_col(msgs: str, *, collapse: bool = True, width: str = "", extra_cls: str = "") -> str:
    btn = (f'<button class="iconbtn" aria-label="Fold the chat away">{ms("right_panel_close")}</button>' if collapse else "")
    st = f' style="width:{width}"' if width else ""
    return (f'<aside class="xchat {extra_cls}"{st} aria-label="Chat"><div class="xchh"><span class="mp-hl">Chat</span>{btn}</div>'
            f'<div class="xchl">{msgs}</div><div class="xcomp"><div class="wchips"><span class="wchip">{ms("payments")}Log money</span>'
            f'<span class="wchip">{ms("receipt_long")}Send a statement</span></div><div class="cfld"><span class="ph">Ask MyPaisa</span>'
            f'<span class="sendb" aria-label="Send">{ms("arrow_upward")}</span></div></div></aside>')


def wai(text: str, card: str = "") -> str:
    return f'<div class="wai"><span class="amk"><i></i></span><div class="waib"><div class="wtext">{text}</div>{card}</div></div>'


MON26_CHAT = (f'<div class="daysep">Mon 26 Oct</div><div class="wme">How much did we add since Thursday?</div>'
              + wai(f"{gbp(CHANGE)} since Thu 22 Oct: the Monzo savings you registered at 09:41 ({gbp(5000)}), less {gbp(7)} of price moves."))


THU5_CHAT = ('<div class="daysep">Thu 5 Nov</div><div class="wme">Does closing the HDFC loan change 2046?</div>'
             + wai(f"Not in the middle path: it stays {gbp(F[2046]['p50'])} in run R4 (20:59), the same as after your salary step at 20:53."))


def browser(cap: str, theme: str, wcls: str, url: str, inner: str) -> str:
    return (f'          <div class="dv-col"><div class="bd-theme">{escape(cap)}</div><div class="bf {wcls} mp {theme}" data-mo-frame-root="1" '
            f'data-screen-label="{escape(cap)}"><div class="bbar"><span class="bdots"><i></i><i></i><i></i></span><span class="burl">'
            f'{ms("lock")}{escape(url)}</span></div>{inner}</div></div>\n')


def phone_tabs(active: str) -> str:
    items = [("home", "Home"), ("account_balance_wallet", "Assets"), ("trending_up", "Projection"), ("chat_bubble", "Chat"), ("menu", "More")]
    return '<nav class="xtabs" aria-label="Sections">' + "".join(
        f'<span class="xtab{" on" if l == active else ""}">{ms(i)}{l}</span>' for i, l in items) + "</nav>"


def phone_top(title: str, right: str = "") -> str:
    return f'<div class="xtop"><span class="fx ac g8">{mark(26)}<span class="mp-hl">{escape(title)}</span></span><span class="fx ac g4">{right}</span></div>'


EYEBTN = f'<button class="iconbtn" aria-label="Privacy mode" aria-pressed="false">{ms("visibility")}</button>'


# ---------------------------------------------------------------- the Home hero and the pulse, drawn from the series
def pulse_svg() -> tuple[str, list[tuple[float, float]]]:
    vals = [v for _, v in PULSE]
    lo, hi = min(vals), max(vals)
    pts = []
    for i, v in enumerate(vals):
        x = 4 + i * 92 / (len(vals) - 1)
        y = 84 - (v - lo) / (hi - lo) * 64
        pts.append((x, y))
    # monotone-ish: a smooth curve through the points with horizontal tangents (never overshoots)
    d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        mx = (x0 + x1) / 2
        d += f" C{mx:.2f} {y0:.2f} {mx:.2f} {y1:.2f} {x1:.2f} {y1:.2f}"
    area = d + f" L{pts[-1][0]:.2f} 100 L{pts[0][0]:.2f} 100 Z"
    svg = (f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="harea" d="{area}"></path>'
           f'<path class="hline" d="{d}"></path></svg>')
    return svg, pts


def pulse_block(flat: bool) -> str:
    svg, pts = pulse_svg()
    x, y = pts[-1]
    box = (f'<div class="mp-chartbox hpulse-box" role="img" aria-label="Household net worth, recorded: {gbp(PULSE[0][1])} on Thu 22 Oct, '
           f'{gbp(NW)} on Mon 26 Oct.">{svg}<span class="mp-chartdot beacon" style="left:{x:.1f}%;top:{y:.1f}%"></span></div>'
           '<div class="hax"><span>Thu 22 Oct</span><span>Sat 24 Oct</span><span>Mon 26 Oct</span></div>')
    if flat:
        return f'<div class="fx col g6 hpflat">{box}</div>'
    return f'<div class="hpulse-old"><div class="fx jb ac g8 wrap"><span class="mp-cap mp-hero-2">RECORDED LEDGER · 5 DAYS</span><span class="mp-cap mp-hero-2">{gbp(PULSE[0][1])} to {gbp(NW)}</span></div>{box}</div>'


SPLIT = [("Own", gbp(AFTER["own_gbp"])), (f"Owe · {OWE_PCT}%", gbp(AFTER["owe_gbp"])), ("Liquid cash", gbp(AFTER["liquid_gbp"]))]
assert OWE_PCT == 36


def home_hero(style: str) -> str:
    """style: 'now' (today's nested boxes and long all-caps overline), 'flat' (1a), 'group' (1b), 'open' (1c)"""
    seg = '<div class="mp-seg" role="group" aria-label="Whose"><button class="mp-seg-i on" aria-pressed="true">Household</button><button class="mp-seg-i" aria-pressed="false">Me</button><button class="mp-seg-i" aria-pressed="false">Asha</button></div>'
    if style == "now":
        over = '<span class="mp-over mp-hero-2">Household net worth · Mon 26 Oct</span>'
        split = '<div class="hsplit3-old">' + "".join(f'<div><span class="mp-cap mp-hero-2">{k.upper()}</span><span class="mp-sub mp-w6 nowrap">{v}</span></div>' for k, v in SPLIT) + "</div>"
        pulse = pulse_block(False)
    else:
        over = '<span class="overs">Net worth · Mon 26 Oct</span>'
        split = '<div class="hsplit-flat">' + "".join(f'<div><span class="mp-foot mp-hero-2">{k}</span><span class="mp-sub mp-w6 nowrap">{v}</span></div>' for k, v in SPLIT) + "</div>"
        pulse = pulse_block(True)
    return (f'<div class="mp-hero hero">{seg}{over}<div class="fx ab g10 wrap"><span class="mp-num-hero nowrap">{gbp(NW)}</span>'
            f'<span class="mp-sub mp-w6 hup nowrap">▲ {gbp(CHANGE)} since Thu 22 Oct</span></div>{pulse}{split}'
            f'<div class="mp-foot mp-hero-2">£1 = ₹112.50, ECB, Fri 23 Oct · figures from the engine</div></div>')


HOLD = [("Balanced", "Arun · ISA", gbp(22925), "Buy · 78%", "mp-add"),
        ("Parag Parikh Flexi Cap", "Asha · SIP · XIRR 10.7%", inr(561995), gbp(561995 / FX), None),
        ("Infosys", "Arun · NSE", inr(177660), gbp(177660 / FX), None)]
# the seven market holdings: five UK (summing to £24,110) and two in India; the top three by value
_MKT = [22925, 512, 304, 188, 181, 561995 / FX, 177660 / FX]
assert sum(_MKT[:5]) == 24110 and sorted(_MKT, reverse=True)[:3] == [22925, 561995 / FX, 177660 / FX]
assert gbp(177660 / FX) == "£1,579"
assert gbp(561995 / FX) == "£4,996"
NEXT = [("event", "Home, Reading: valuation due", "Fri 30 Oct", ""), ("account_balance", "HDFC home loan EMI", "Thu 5 Nov", inr(39390)),
        ("autorenew", "Parag Parikh SIP", "Tue 10 Nov", inr(10000))]


def where_card(style: str) -> str:
    bar = (f'<div class="mp-track mbar" role="img" aria-label="United Kingdom {UK_PCT}% of household net worth, India {IN_PCT}%">'
           f'<span class="mp-track-clip"><span style="width:{UK / NW * 100:.1f}%"></span></span></div>')
    head = ('<span class="mp-over mp-ink2">WHOLE-WEALTH REGISTER · UK AND INDIA</span>' if style == "now" else '<span class="mp-hl">Where it is</span>')
    rows = (f'<div class="fx jb ab g8"><span class="mp-sub mp-w6">United Kingdom · {UK_PCT}%</span><span class="mp-sub mp-w6 nowrap">{gbp(UK)}</span></div>'
            f'{bar}<div class="fx jb ab g8"><span class="mp-sub mp-w6">India · {IN_PCT}%</span><span class="mp-sub mp-w6 nowrap">{gbp(IN)}</span></div>')
    return f'<div class="mp-card cpad">{head}{rows}</div>' if style != "open" else f'<div class="opensec">{head}{rows}</div>'


def holdings_card(style: str) -> str:
    def right(v, chip, cls, sub):
        c = f'<span class="mp-chip chip-s {cls}">{chip}</span>' if chip else (f'<span class="mp-foot mp-ink2 nowrap">{sub}</span>' if sub else "")
        return f'<div class="rt"><span class="mp-sub mp-w6 nowrap">{v}</span>{c}</div>'
    if style == "now":
        rows = "".join(f'<div class="rrow-old"><div class="f1"><div class="mp-sub mp-w6">{n}</div><div class="mp-foot mp-ink2">{s}</div></div>{right(v, c, k, None if c else next((h[3] for h in HOLD if h[2] == v), ""))}</div>' for n, s, v, c, k in HOLD)
        stats = ('<div class="cstats-old"><div><span class="mp-cap mp-ink2">HOLDINGS</span><span class="mp-sub mp-w6">7</span></div>'
                 '<div><span class="mp-cap mp-ink2">IN INDIA</span><span class="mp-sub mp-w6">2</span></div></div>')
        return f'<div class="mp-card cpad"><span class="mp-over mp-ink2">TOP HOLDINGS BY VALUE · MON 26 OCT</span>{stats}<div class="fx col g8">{rows}</div></div>'
    rows = "".join(f'<div class="hrow"><div class="f1"><div class="mp-sub mp-w6">{n}</div><div class="mp-foot mp-ink2">{s}</div></div>{right(v, c, k, None if c else next((h[3] for h in HOLD if h[2] == v), ""))}<span class="ms chev" aria-hidden="true">chevron_right</span></div>' for n, s, v, c, k in HOLD)
    if style == "group":
        return f'<div class="grp"><div class="grp-h">Top holdings</div><div class="mp-group">{rows}</div></div>'
    head = '<div class="fx jb ab g8"><span class="mp-hl">Top holdings</span><span class="mp-foot mp-ink2">3 of 7, by value</span></div>'
    body = f'<div class="hl-rows">{rows}</div>'
    return f'<div class="mp-card cpad">{head}{body}</div>' if style != "open" else f'<div class="opensec">{head}{body}</div>'


def next_card(style: str) -> str:
    rows = "".join(f'<div class="hrow"><span class="mp-icontile mp-neutral">{ms(i, "ms-s")}</span><div class="f1"><div class="mp-sub mp-w6">{t}</div><div class="mp-foot mp-ink2">{d}</div></div>'
                   f'<span class="mp-sub mp-w6 nowrap">{v}</span></div>' for i, t, d, v in NEXT)
    if style == "now":
        tiles = "".join(f'<div class="ntile-old"><span class="mp-cap mp-ink2">{d.upper()}</span><span class="mp-sub mp-w6">{t}</span><span class="mp-foot mp-ink2">{v}</span></div>' for i, t, d, v in NEXT)
        return f'<div class="mp-card cpad"><span class="mp-over mp-ink2">COMING UP IN THE NEXT FOURTEEN DAYS</span><div class="ntiles-old">{tiles}</div></div>'
    head = '<span class="mp-hl">Coming up</span>'
    if style == "group":
        return f'<div class="grp"><div class="grp-h">Coming up</div><div class="mp-group grows">{rows}</div></div>'
    return f'<div class="mp-card cpad">{head}<div class="hl-rows">{rows}</div></div>' if style != "open" else f'<div class="opensec">{head}<div class="hl-rows">{rows}</div></div>'


CSS_HOME = r"""
.cpad{display:flex;flex-direction:column;gap:10px;padding:16px;box-sizing:border-box}
/* today: boxes inside boxes */
.hpulse-old{background:var(--mp-hero-2);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.hsplit3-old{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.hsplit3-old>div{background:var(--mp-hero-2);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
.rrow-old{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:var(--mp-surface-2)}
.rrow-old .rt{display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin-left:auto}
.cstats-old{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.cstats-old>div{background:var(--mp-surface-2);border-radius:11px;padding:7px 10px;display:flex;flex-direction:column;gap:2px}
.ntiles-old{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px}
.ntile-old{background:var(--mp-surface-2);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
/* 1a: hairlines */
.hsplit-flat{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--mp-hero-2);padding-top:12px}
.hsplit-flat>div{display:flex;flex-direction:column;gap:2px;min-width:0;padding:0 12px}
.hsplit-flat>div:first-child{padding-left:0}
.hsplit-flat>div+div{border-left:1px solid var(--mp-hero-2)}
@container screen (max-width:359px){.hsplit-flat{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:10px}.hsplit-flat>div:nth-child(3){border-left:0;padding-left:0}}
/* 1b: grouped lists, section headers outside */
.grp{display:flex;flex-direction:column;gap:6px}
.grp-h{font:600 13px/18px var(--mp-font);color:var(--mp-ink-2);padding:0 4px 0 16px}
.grp .mp-group{padding:0 16px}
.grp .hrow+.hrow{border-top:1px solid var(--mp-line)}
.grp-card{background:var(--mp-surface);border-radius:var(--mp-r-row);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
/* 1c: open sections, no cards */
.opensec{display:flex;flex-direction:column;gap:10px;padding:6px 4px 0}
.opensec+.opensec{border-top:1px solid var(--mp-line);padding-top:18px}
"""


# ================================================================ a · the Projection header
def fan_chart(on_hero: bool = True, h: int = 150) -> str:
    years = [2026, 2031, 2036, 2041, 2046]
    top = F[2046]["p90"] * 1.02
    def xy(i, v):
        return 4 + i * 92 / (len(years) - 1), 96 - v / top * 90
    up = [xy(i, F[y]["p90"]) for i, y in enumerate(years)]
    lo = [xy(i, F[y]["p10"]) for i, y in enumerate(years)]
    mid = [xy(i, F[y]["p50"]) for i, y in enumerate(years)]
    def curve(pts):
        d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            mx = (x0 + x1) / 2
            d += f" C{mx:.2f} {y0:.2f} {mx:.2f} {y1:.2f} {x1:.2f} {y1:.2f}"
        return d
    band = curve(up) + " L" + " L".join(f"{x:.2f} {y:.2f}" for x, y in reversed(lo)) + " Z"
    x, y = mid[-1]
    svg = (f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line class="hgrid" x1="0" x2="100" y1="50" y2="50"></line>'
           f'<path class="hband" d="{band}"></path><path class="hline" d="{curve(mid)}"></path></svg>')
    ax = "".join(f"<span>{y}</span>" for y in years)
    return (f'<div class="mp-chartbox" style="height:{h}px" role="img" aria-label="Net worth to 2046: the middle path reaches {gbp(F[2046]["p50"])}; '
            f'8 in 10 runs end between {gbp(F[2046]["p10"])} and {gbp(F[2046]["p90"])}.">{svg}'
            f'<span class="mp-chartdot beacon" style="left:{x:.1f}%;top:{y:.1f}%"></span></div><div class="hax">{ax}</div>')


def proj_hero() -> str:
    return (f'<div class="mp-hero hero"><span class="overs">Middle path in 2046</span><div class="fx ab g10 wrap"><span class="mp-num-hero nowrap">{gbp(F[2046]["p50"])}</span></div>'
            f'<div class="mp-sub mp-hero-2">8 in 10 runs end between {gbp(F[2046]["p10"])} and {gbp(F[2046]["p90"])}</div>{fan_chart()}'
            f'<div class="mp-foot mp-hero-2">From today’s {gbp(TODAY_NW)} · run R4, Thu 5 Nov 20:59 · figures from the engine</div></div>')


MILES = [("savings", "Asha’s fixed-rate saver matures", "Mon 14 Dec 2026", gbp(10460)),
         ("percent", "Mortgage fixed rate ends", "30 Jun 2028", ""),
         ("directions_car", "Car loan paid off", "Feb 2029", f"frees {gbp(347)} a month")]


def miles_card() -> str:
    rows = "".join(f'<div class="hrow"><span class="mp-icontile mp-neutral">{ms(i, "ms-s")}</span><div class="f1"><div class="mp-sub mp-w6">{t}</div>'
                   f'<div class="mp-foot mp-ink2">{d}</div></div><span class="mp-foot mp-ink2 nowrap tr">{v}</span></div>' for i, t, d, v in MILES)
    return f'<div class="mp-card cpad"><span class="mp-hl">Milestones</span><div class="hl-rows">{rows}</div></div>'


PTABS = ["Net worth", "Plans", "Budget forecast"]


def ptab_seg(on: str = "Net worth", cls: str = "") -> str:
    return (f'<div class="mp-seg ptabs {cls}" role="tablist" aria-label="Projection">' + "".join(
        f'<button class="mp-seg-i{" on" if t == on else ""}" role="tab" aria-selected="{"true" if t == on else "false"}">{t}</button>' for t in PTABS) + "</div>")


def lens_btn(web: bool = False, open_: bool = False) -> str:
    cls = "lensw" if web else "lens"
    return (f'<button class="{cls}{" open" if open_ else ""}" aria-haspopup="menu" aria-expanded="{"true" if open_ else "false"}" '
            f'aria-label="View: 20 years, pounds, nominal">{ms("tune", "ms-s")}<span>20 yrs · £ GBP · Nominal</span>{ms("expand_more", "ms-s")}</button>')


def lens_menu(web: bool) -> str:
    def grp(h, items, on):
        return (f'<div class="lm-h">{h}</div>' + "".join(
            f'<div class="{"menu-i" if not web else "pm-i"}"><span>{t}</span>{ms("check") if t == on else ""}</div>' for t in items))
    body = (grp("Horizon", ["5 yrs", "10 yrs", "20 yrs", "30 yrs"], "20 yrs") + '<div class="menu-sep"></div>' +
            grp("Currency", ["£ GBP", "₹ INR"], "£ GBP") + '<div class="menu-sep"></div>' + grp("Money", ["Nominal", "Today’s money"], "Nominal"))
    if web:
        return f'<div class="pmenu" role="menu" aria-label="View">{body}</div>'
    return f'<div class="menu lg lmenu" role="menu" aria-label="View">{body}</div>'


CSS_A = CSS_HOME + r"""
.ptabs .mp-seg-i{padding:0 4px;white-space:nowrap}
.lens{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 10px;border-radius:12px;border:0;background:var(--mp-surface);color:var(--mp-ink);font:600 15px/20px var(--mp-font);box-shadow:inset 0 0 0 1px var(--mp-line);cursor:pointer;align-self:flex-start;max-width:100%}
.lens>span:nth-child(2){white-space:nowrap;overflow:hidden;text-overflow:clip}
.lens .ms{color:var(--mp-accent)}
.lens.open{box-shadow:inset 0 0 0 2px var(--mp-accent)}
.ctl1{display:flex;flex-direction:column;gap:10px}
.lmenu{left:16px;top:262px;width:250px}
.lm-h{font:600 13px/18px var(--mp-font);color:var(--mp-ink-2);padding:8px 14px 2px;position:relative;z-index:1}
.lmenu .menu-i{min-height:44px}
.lmenu .menu-i .ms{color:var(--lg-accent)}
/* the web: the same picker and lens on paper, the lens a popover */
.lensw{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 10px;border-radius:10px;border:0;background:var(--mp-surface);color:var(--mp-ink);font:600 15px/20px var(--mp-font);box-shadow:inset 0 0 0 1px var(--mp-line);cursor:pointer;white-space:nowrap}
.lensw .ms{color:var(--mp-accent)}
.lensw.open{box-shadow:inset 0 0 0 2px var(--mp-focus)}
.wctl{display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:relative}
.wctl .ptabs{min-width:340px}
.pmenu{position:absolute;right:0;top:52px;width:240px;z-index:20;background:var(--mp-surface);border-radius:14px;box-shadow:0 0 0 1px var(--mp-line),0 16px 40px rgba(20,23,31,.16);padding:6px;display:flex;flex-direction:column}
.pm-i{min-height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-radius:8px;font:400 15px/20px var(--mp-font)}
.pm-i .ms{color:var(--mp-accent);font-size:20px}
.pm-i:hover{background:var(--mp-surface-2)}
.pmenu .menu-sep{height:1px;background:var(--mp-line);margin:4px 8px}
.pmenu .lm-h{padding:8px 12px 2px}
.xg2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;align-items:start}
/* 1b: the title is the picker; horizon chips under the chart */
.ttlmenu{display:inline-flex;align-items:center;gap:4px;min-height:44px;font:700 34px/41px var(--mp-font);letter-spacing:-0.02em;padding:2px 20px 8px;color:var(--mp-ink)}
.ttlmenu .ms{font-size:26px;color:var(--mp-accent)}
.hzchips{display:flex;gap:6px;flex-wrap:wrap}
.hzc{min-height:44px;min-width:56px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:600 15px/20px var(--mp-font);color:var(--mp-hero-ink-2);background:var(--mp-hero-2);box-sizing:border-box}
.hzc.on{background:var(--mp-hero-ink);color:var(--mp-hero)}
.cornerbtn{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 12px;border-radius:999px;background:var(--mp-hero-2);color:var(--mp-hero-ink);font:600 15px/20px var(--mp-font);align-self:flex-start;box-sizing:border-box}
/* 1c: one row of chips */
.chiprow{display:flex;gap:8px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,black calc(100% - 24px),transparent);mask-image:linear-gradient(90deg,black calc(100% - 24px),transparent)}
.pchip{min-height:44px;padding:0 14px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;font:600 15px/20px var(--mp-font);background:var(--mp-surface);color:var(--mp-ink);box-shadow:inset 0 0 0 1px var(--mp-line);white-space:nowrap;flex:none;box-sizing:border-box}
.pchip.on{background:var(--mp-hero);color:var(--mp-hero-ink);box-shadow:none}
.pchip .ms{font-size:18px;color:var(--mp-accent)}
.pchip.on .ms{color:var(--mp-hero-ink)}
.vsep{width:1px;align-self:stretch;margin:8px 2px;background:var(--mp-line);flex:none}
"""


def board_a() -> str:
    SECTION_NAMES.clear()
    secs = []
    # ---- 1a
    body_1a = f'<div class="ctl1">{ptab_seg()}{lens_btn()}</div>{proj_hero()}{miles_card()}'
    body_1a_open = f'<div class="ctl1">{ptab_seg()}{lens_btn(open_=True)}</div>{proj_hero()}{miles_card()}'
    nav = nav_back(EYE + ASK)
    fr = [iphone("iPhone · 1a at rest · Light", "t-light", "21:05", nav=nav, title="Projection", body=body_1a),
          iphone("iPhone · 1a the lens open · Dark", "t-dark", "21:05", nav=nav, title="Projection", body=body_1a_open,
                 overlay=lens_menu(False))]
    def web_proj(ctl: str, theme: str, wcls: str, cap: str, menu: bool = False) -> str:
        main = (f'<main class="xmain"><div class="xpad"><header class="xhead"><div><div class="mp-large">Projection</div>'
                f'<div class="mp-foot mp-ink2">Thu 5 Nov · run R4 at 20:59</div></div><div class="wctl">{ctl}{lens_menu(True) if menu else ""}</div></header>'
                f'{proj_hero()}<div class="xg2">{miles_card()}<div class="mp-card cpad"><span class="mp-hl">Nominal or today’s money</span><p class="pp mp-sub">'
                f'Nominal shows each year’s pounds as they will be then. Today’s money takes out inflation ({UK_INFL} a year in the UK, {IN_INFL} in India), so 2046 reads in 2026’s pounds.</p></div></div></div></main>')
        return browser(cap, theme, wcls, "dashboard.mypaisapp.com/projection",
                       f'<div class="xshell">{side("Projection")}{main}{chat_col(THU5_CHAT)}</div>')
    ctl_w = f'{ptab_seg()}{lens_btn(web=True, open_=True)}'
    fr.append(web_proj(ctl_w, "t-light", "w1440", "Browser · 1a the lens open · Desktop 1440 · Light", menu=True))
    ph = (f'{phone_top("Projection", EYEBTN)}<div class="xscroll"><div class="xppad"><div class="ctl1">{ptab_seg()}{lens_btn(web=True)}</div>{proj_hero()}{miles_card()}</div></div>{phone_tabs("Projection")}')
    fr.append(browser("Browser · 1a at rest · Phone 390 · Dark", "t-dark", "w390", "dashboard.mypaisapp.com/projection", ph))
    secs.append(section("1a", "1a", "One picker, one lens", "Recommended", "MA-301 · P2-3 · MA-264 · MA-240",
                        "The three views stay one segmented picker; horizon, currency and money collapse into one 44 pt lens that says what you are "
                        "looking at, <b>20 yrs · £ GBP · Nominal</b>, and opens one menu. Ten controls become four tappable things: three segments and the lens.",
                        fr, [("Why recommended:", "the answer (the middle path, the range) moves up a whole row on iPhone, and the lens still names the view, so a member never wonders which horizon or money they see."),
                             ("iOS:", "a SwiftUI <code>Picker(.segmented)</code> and a <code>Menu</code> with three <code>Picker</code> sections, the menu on Liquid Glass (a menu is a control, so glass is right); the content stays solid."),
                             ("Web:", "shadcn-svelte <code>Tabs</code> and a <code>DropdownMenu</code> with radio groups, on paper, never glass; ⌘ shortcuts unchanged."),
                             ("Figures:", f"run R4 of Thu 5 Nov 20:59 (future-plans-v4.json): {gbp(F[2046]['p50'])} in 2046, 8 in 10 between {gbp(F[2046]['p10'])} and {gbp(F[2046]['p90'])}; today {gbp(TODAY_NW)}."),
                             ("Trade-off:", "changing the horizon takes two taps instead of one; it is the least-changed setting on the page.")]))
    # ---- 1b
    hero_b = (f'<div class="mp-hero hero"><div class="fx jb ac g8 wrap"><span class="overs">Middle path in 2046</span><span class="cornerbtn" role="button" aria-label="Money: pounds, nominal">£ · Nominal{ms("expand_more", "ms-s")}</span></div>'
              f'<span class="mp-num-hero nowrap">{gbp(F[2046]["p50"])}</span><div class="mp-sub mp-hero-2">8 in 10 runs end between {gbp(F[2046]["p10"])} and {gbp(F[2046]["p90"])}</div>{fan_chart()}'
              f'<div class="hzchips" role="group" aria-label="Horizon">' + "".join(f'<span class="hzc{" on" if h == "20 yrs" else ""}" role="button" aria-pressed="{"true" if h == "20 yrs" else "false"}">{h}</span>' for h in ["5 yrs", "10 yrs", "20 yrs", "30 yrs"]) +
              f'</div><div class="mp-foot mp-hero-2">From today’s {gbp(TODAY_NW)} · run R4, Thu 5 Nov 20:59</div></div>')
    tl = f'<div class="ttlmenu" role="button" aria-haspopup="menu" aria-label="Projection: Net worth. Change view">Net worth{ms("expand_more")}</div>'
    fr = [iphone("iPhone · 1b at rest · Light", "t-light", "21:05", nav=nav, title=None, body=hero_b + miles_card(), overlay="",
                 pg_style="padding-top:0").replace('<div class="scroll ', tl + '<div class="scroll ', 1),
          iphone("iPhone · 1b at rest · Dark", "t-dark", "21:05", nav=nav, title=None, body=hero_b + miles_card(),
                 pg_style="padding-top:0").replace('<div class="scroll ', tl + '<div class="scroll ', 1)]
    mainb = (f'<main class="xmain"><div class="xpad"><header class="xhead"><div class="ttlmenu" style="padding:0" role="button" aria-haspopup="menu">Net worth{ms("expand_more")}</div></header>'
             f'{hero_b}<div class="xg2">{miles_card()}</div></div></main>')
    fr.append(browser("Browser · 1b at rest · Desktop 1440 · Light", "t-light", "w1440", "dashboard.mypaisapp.com/projection",
                      f'<div class="xshell">{side("Projection")}{mainb}{chat_col(THU5_CHAT)}</div>'))
    secs.append(section("1b", "1b", "The title is the picker; the controls sit on the chart", "Not recommended", "MA-301 · P2-3",
                        "The view becomes the title’s menu (Net worth ▾), horizon chips sit under the fan they change, and money is one corner button on the hero. Nothing sits between the title and the answer.",
                        fr, [("Strength:", "the least chrome of the three; each control sits on the thing it changes."),
                             ("Trade-off:", "a title menu is easy to miss, so Plans and Budget forecast are one hidden tap away; four horizon chips on the navy hero add weight there; the iPad sidebar already says Projection, so the title menu repeats it."),
                             ("Rule 4:", "unchanged: plan items are still created in the chat, the chart’s figures corrected in place.")]))
    # ---- 1c
    chips = ('<div class="chiprow" role="toolbar" aria-label="View">' + "".join(f'<span class="pchip{" on" if t == "Net worth" else ""}">{t}</span>' for t in PTABS) +
             '<span class="vsep"></span>' + "".join(f'<span class="pchip">{t}{ms("expand_more")}</span>' for t in ["20 yrs", "£ GBP", "Nominal"]) + "</div>")
    fr = [iphone("iPhone · 1c at rest · Light", "t-light", "21:05", nav=nav, title="Projection", body=chips + proj_hero() + miles_card()),
          iphone("iPhone · 1c at rest · Dark", "t-dark", "21:05", nav=nav, title="Projection", body=chips + proj_hero() + miles_card())]
    mainc = (f'<main class="xmain"><div class="xpad"><header class="xhead"><div><div class="mp-large">Projection</div><div class="mp-foot mp-ink2">Thu 5 Nov · run R4 at 20:59</div></div></header>'
             f'{chips}{proj_hero()}<div class="xg2">{miles_card()}</div></div></main>')
    fr.append(browser("Browser · 1c at rest · Desktop 1440 · Dark", "t-dark", "w1440", "dashboard.mypaisapp.com/projection",
                      f'<div class="xshell">{side("Projection")}{mainc}{chat_col(THU5_CHAT)}</div>'))
    secs.append(section("1c", "1c", "One row of chips", "Not recommended", "MA-301 · P2-3",
                        "Every control becomes a chip in one row: the three views, then a divider, then horizon, currency and money, each a menu. One row instead of two, at both doors.",
                        fr, [("Strength:", "every setting is visible and one tap away, as the web’s filter rows already work."),
                             ("Trade-off:", "six chips do not fit an iPhone, so the row scrolls and Nominal is cut at 402 pt (drawn faded); the views and the settings look alike, though one changes the page and the others change the figures.")]))
    intro = intro_block([
        "The deep scan (P2-3) counted ten controls above the Projection and Plans answers: three tabs, four horizons, two currencies and the today’s-money switch, stacked in two rows on iPhone and as tabs plus segments on the web. "
        "Each option keeps every setting and every rule (Rule 4: plans are created in the chat; figures corrected in place) and changes only how the header asks.",
        f"Drawn on Thu 5 Nov at 21:05, after run R4 (20:59): the household’s {gbp(TODAY_NW)} today, 20 years to 2046. iPhone in the 1a Chat first shell (Home tab, Projection pushed), the web with the chat beside the page from 1133 px."],
        '<span class="plan-k">MA-301</span><span>From the deep scan’s P2-3. ARCHITECTURE.md §9.1, §9.3, §9.4; boards it would change: iPhone v4 · Projection, iPhone v4 · Plans tab, Web v4 · Projection, Web v4 · Plans tab.</span><b>Options until Arun picks.</b><span>Illustrative figures from future-plans-v4.json.</span>')
    return page("MA-301 · a · Projection header", CSS_A, intro, secs)


# ================================================================ b · the statement Confirm
def files_bubble() -> str:
    f = "".join(f'<div class="file"><span class="ftile">{ms("description", "ms-s")}</span><span class="fmeta"><span class="fname">{n}</span>'
                f'<span class="mp-foot mp-hero-2">{s}</span></span></div>' for n, s in [("barclaycard-2026-11-01.pdf", "PDF · Barclaycard"), ("monzo-2026-10.csv", "CSV · Monzo")])
    return f'<div class="me mf">{f}<div class="mft">October’s statements</div></div>'


def ccard(over: str, title: str, body: str, acts: list[tuple[str, str]] | None = None, fold: str = "", over_icon: str = "") -> str:
    oi = ms(over_icon, "ms-s ms-fill c-add") if over_icon else ""
    a = ("<div class=\"ccard-acts\">" + "".join(f'<button class="cbtn {c}" type="button">{t}</button>' for t, c in acts) + "</div>") if acts else ""
    return (f'<div class="ccard"><div class="ccard-h"><span class="overs fx ac g6">{oi}{over}</span><span class="mp-hl">{title}</span></div>'
            f'<div class="ccard-b">{body}</div>{a}{fold}</div>')


def ai(text: str = "", card: str = "") -> str:
    t = f'<div class="ai-text">{text}</div>' if text else ""
    return f'<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body">{t}{card}</div></div>'


def q_card(line: dict, guess: str, other: list[str], answered: str | None = None) -> str:
    why = {"AMZN Mktp": "Amazon Marketplace sells most things.", "PAYPAL *EBAY": "A PayPal payment to eBay."}[line["merchant"]]
    head = f'{line["merchant"]} · {gbp(line["amount_gbp"])}'
    sub = f'<div class="mp-foot mp-ink2">Barclaycard · {wd(line["date"])} · question {1 if line is AMZN else 2} of 2</div>'
    if answered:
        return ccard("Statement · one to check", head, f'{sub}<div class="ans">{ms("check_circle", "ms-fill")}<span>{answered}. MyPaisa will remember it.</span></div>')
    chips = "".join(f'<span class="qchip{" on" if i == 0 else ""}" role="button">{c}</span>' for i, c in enumerate([guess] + other))
    return ccard("Statement · one to check", head, f'{sub}<p class="pp mp-sub">{why} Is it <b>{guess}</b>?</p><div class="qchips">{chips}</div>')


def summary_rows(open_cats: bool, edit: bool = False, saved: bool = False) -> str:
    rows = (f'<div class="hrow"><span class="mp-icontile mp-neutral">{ms("credit_card", "ms-s")}</span><div class="f1"><div class="mp-sub mp-w6">Barclaycard</div>'
            f'<div class="mp-foot mp-ink2">Sun 1 Nov · 16 lines</div></div><span class="mp-sub mp-w6 nowrap">{gbp(BC_SUM)}</span></div>'
            f'<div class="hrow"><span class="mp-icontile mp-neutral">{ms("account_balance", "ms-s")}</span><div class="f1"><div class="mp-sub mp-w6">Monzo current account</div>'
            f'<div class="mp-foot mp-ink2">October · 6 spending lines</div></div><span class="mp-sub mp-w6 nowrap">{gbp(MZ_SUM)}</span></div>')
    disc_cat = f'<div class="dlink" role="button" aria-expanded="{"true" if open_cats else "false"}"><span>By category · 11</span>{ms("expand_less" if open_cats else "expand_more")}</div>'
    disc_rec = f'<div class="dlink" role="button" aria-expanded="false"><span>Not spending, recognised · 5</span>{ms("expand_more")}</div>'
    return f'<div class="hl-rows">{rows}</div>{cats_block(edit) if open_cats else disc_cat}{disc_rec}'


def confirm_card(open_cats: bool = False) -> str:
    body = summary_rows(open_cats) + '<p class="pp mp-foot mp-ink2">Both files are kept for good. Nothing is saved until you tap Confirm.</p>'
    return ccard("October’s statements · check them", f"Spending {gbp(SPEND)} in 22 lines", body,
                 [("Confirm", "cbtn-primary"), ("Edit", ""), ("Cancel", "cbtn-ghost")])


def cats_block(edit: bool) -> str:
    items = []
    for c, v in CATS_SORTED:
        if edit and c == "Other":
            items.append(f'<div class="edinl"><span class="mp-foot mp-ink2">PAYPAL *EBAY · {gbp(EBAY["amount_gbp"])} · {wd(EBAY["date"])}</span>'
                         f'<span class="edwas">Was <s>Other</s> → <b>Shopping</b></span><div class="fx g8 wrap"><button class="cbtn cbtn-primary" type="button">Save</button>'
                         f'<button class="cbtn cbtn-ghost" type="button">Cancel</button></div></div>')
        items.append(f'<div class="crow2"><span class="mp-sub">{c}</span><span class="mp-sub mp-w6 nowrap">{gbp(v)}</span></div>')
    return f'<div class="dlink" role="button" aria-expanded="true"><span>By category · 11</span>{ms("expand_less")}</div><div class="cats">{"".join(items)}</div>'


def saved_card(edit: bool) -> str:
    fix = ""
    if edit:
        fix = (f'<div class="dlink" role="button" aria-expanded="true"><span>The 22 lines</span>{ms("expand_less")}</div>'
               f'<div class="edinl"><span class="mp-foot mp-ink2">PAYPAL *EBAY · {gbp(EBAY["amount_gbp"])} · {wd(EBAY["date"])}</span>'
               f'<span class="edwas">Was <s>Other</s> → <b>Shopping</b></span><div class="fx g8 wrap"><button class="cbtn cbtn-primary" type="button">Save</button>'
               f'<button class="cbtn cbtn-ghost" type="button">Cancel</button></div><span class="mp-foot mp-ink2">Save writes a correction with its audit row, and MyPaisa remembers eBay as Shopping.</span></div>'
               f'<div class="crow2"><span class="mp-sub">Waitrose · Tue 27 Oct</span><span class="mp-sub mp-w6 nowrap">{gbp(81)} · Groceries</span></div>'
               f'<div class="crow2"><span class="mp-sub">AMZN Mktp · {wd(AMZN["date"])}</span><span class="mp-sub mp-w6 nowrap">{gbp(AMZN["amount_gbp"])} · Shopping</span></div>')
    body = (f'<div class="kv"><span>Spending</span><span>{gbp(SPEND)} · 11 categories</span></div><div class="kv"><span>Not counted</span><span>5 lines, recognised</span></div>'
            f'<div class="kv"><span>Remembered</span><span>AMZN Mktp is Shopping, PAYPAL *EBAY is Other</span></div>' + fix)
    fold = f'<div class="ccard-fold quiet"><span class="fx ac g8">{ms("history", "ms-s")}Saved · in the audit log</span><span class="mp-foot mp-ink2">08:44</span></div>'
    return ccard("October’s statements · saved", "22 lines in October’s budget", body, [("Undo", "cbtn-ghost")], fold, over_icon="check_circle")


def chat_frame(cap: str, theme: str, clock: str, msgs: str, top: int, nw: str) -> str:
    strip = (f'<div class="strip lg"><div class="ai-mark z1"><i></i></div><div class="fx col f1 z1"><span class="mp-foot mp-ink2">Household · prices to Fri 23 Oct</span>'
             f'<span class="strip-n">{nw}</span></div><span class="ms z1 mp-ink2" aria-hidden="true">keyboard_arrow_down</span></div>')
    comp = (f'<div class="composer cmp"><div class="chips"><span class="gchip lg">{ms("receipt_long")}<span>Send a statement</span></span>'
            f'<span class="gchip lg">{ms("payments")}<span>Log money</span></span></div>'
            f'<div class="cbar"><span class="cplus lg">{ms("add")}</span><span class="cfield lg"><span class="ph">Ask MyPaisa</span>'
            f'<span class="csend lg-tint">{ms("arrow_upward")}</span></span></div></div>')
    chat = f'{strip}<div class="scroll"><div class="chat cb" style="position:absolute;left:0;right:0;bottom:{206 + top}px">{msgs}</div><div class="edge-top"></div></div>{comp}'
    return iphone(cap, theme, clock, nav="", title=None, body="", tabs="chat", chat=chat)


def web_chat_frame(cap: str, theme: str, msgs: str) -> str:
    inner = chat_col(msgs)
    return (f'          <div class="dv-col"><div class="bd-theme">{escape(cap)}</div><div class="bf wcol mp {theme}" data-mo-frame-root="1" '
            f'data-screen-label="{escape(cap)}">{inner}</div></div>\n')


CSS_B = CSS_HOME + r"""
.cb{padding-bottom:20px}
.composer.cmp{bottom:104px}
.strip{margin-top:2px}
.mf{display:flex;flex-direction:column;gap:6px;padding:8px}
.file{display:flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;border-radius:14px;background:var(--mp-hero-2);min-width:0}
.ftile{width:36px;height:40px;border-radius:8px;display:grid;place-items:center;flex:none;background:var(--mp-hero);color:var(--mp-coral)}
.fmeta{display:flex;flex-direction:column;min-width:0}
.fname{font:600 15px/20px var(--mp-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mft{font:400 15px/20px var(--mp-font);padding:2px 6px 2px}
.ccard .hrow{min-height:52px}
.crow2{display:flex;justify-content:space-between;align-items:baseline;gap:10px;min-height:36px;padding:6px 0;border-top:1px solid var(--mp-line);box-sizing:border-box}
.cats{display:flex;flex-direction:column}
.ccard .dlink{border-top:1px solid var(--mp-line)}
.ccard .edinl{margin:6px 0}
.amb-tag{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:0 6px;font:600 13px/20px var(--mp-font);background:var(--mp-pause-bg);color:var(--mp-pause)}
.bf.wcol{width:380px;height:844px;border-radius:14px}
.bf.wcol .xchat{width:100%;border-left:0;flex:1;min-height:0}
.wcard{background:var(--mp-surface);border-radius:var(--mp-r-card);box-shadow:var(--mp-shadow);display:flex;flex-direction:column;overflow:hidden}
.wcol .ccard-h,.wcol .ccard-b,.wcol .ccard-acts{padding-left:14px;padding-right:14px}
/* 1c: the review on a sheet */
.sheet .stp{display:flex;gap:6px}.sheet .stp i{flex:1;height:4px;border-radius:2px;background:var(--mp-track);display:block}.sheet .stp i.on{background:var(--mp-accent)}
.sheet{top:auto}
.sheetcard{background:var(--mp-surface);border-radius:20px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.wdlg{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:rgba(5,8,14,.42)}
.wdlg>div{width:340px;max-height:92%;overflow:hidden;background:var(--mp-surface);border-radius:20px;box-shadow:var(--mp-shadow);padding:16px;display:flex;flex-direction:column;gap:10px}
"""


def board_b() -> str:
    SECTION_NAMES.clear()
    secs = []
    me = '<div class="me">Here are October’s statements.</div>'
    lead_ai = ai("Read: 22 lines of spending, 5 that are not spending. Two merchants I am not sure of, so one question each first.")
    q1a = q_card(AMZN, "Shopping", ["Health", "Something else…"], answered="Shopping")
    q2 = q_card(EBAY, "Other", ["Shopping", "Something else…"])
    q2a = q_card(EBAY, "Other", ["Shopping", "Something else…"], answered="Other")
    # ---- 1a
    m1 = files_bubble() + lead_ai + ai(card=q1a) + ai(card=q2)
    m2 = ai(card=q2a) + ai("Then this is everything, in one card.", confirm_card())
    m3 = ai(card=confirm_card(open_cats=True))
    m4 = ai(card=saved_card(edit=True))
    fr = [chat_frame("iPhone · 1a one question at a time · 08:41 · Light", "t-light", "08:41", m1, 0, NW_REVIEW),
          chat_frame("iPhone · 1a the compact Confirm · 08:42 · Dark", "t-dark", "08:42", m2, 0, NW_REVIEW),
          chat_frame("iPhone · 1a By category opened · 08:43 · Light", "t-light", "08:43", m3, 0, NW_REVIEW),
          chat_frame("iPhone · 1a saved, Undo, Was → Save · 08:46 · Dark", "t-dark", "08:46", m4, 0, NW_SAVED),
          web_chat_frame("Browser · 1a the chat beside the page at 1440 (the column alone) · Light", "t-light",
                         '<div class="daysep">Sun 1 Nov</div>' + wai("Then this is everything, in one card.", confirm_card()))]
    secs.append(section("1a", "1a", "Questions first, then a short Confirm", "Recommended", "MA-301 · P2-3 · MA-218 · Rule 4",
                        f"The two merchants MyPaisa is unsure of come first, one question card each with the guess as the first chip (the guided-flow pattern of §9.1). "
                        f"Then one compact Confirm card: the total, the two sources, and By category and Not spending folded. The card fits one screen; nothing is saved until Confirm.",
                        fr, [("Why recommended:", "it is the guided-flow rule the app already follows (one question per card, edited in place) and leaves the Confirm card short enough to read whole: four rows instead of four screens."),
                             ("Rule 4 kept:", "Confirm writes all 22 lines with the merchant memory and audit rows; the saved card has Undo; a saved line’s category is corrected in place: Was Other → Shopping, then Save writes a correction event (via inline_edit)."),
                             ("Figures:", f"statements_oct: Barclaycard 16 lines {gbp(BC_SUM)}, Monzo 6 spending lines {gbp(MZ_SUM)}, {gbp(SPEND)} in all across 11 categories; AMZN Mktp {gbp(AMZN['amount_gbp'])} on {wd(AMZN['date'])}, PAYPAL *EBAY {gbp(EBAY['amount_gbp'])} on {wd(EBAY['date'])}."),
                             ("What changes in the spec:", "ARCHITECTURE §4.9’s “one review card by category with the uncertain lines in amber” becomes “a question per uncertain line, then one review card”."),
                             ("Trade-off:", "two more messages in the conversation; a member who wants every line still opens By category.")]))
    # ---- 1b
    def amb(line, guess):
        return (f'<div class="amb-row"><div class="fx jb ab g8"><span class="mp-sub mp-w6">{line["merchant"]}</span><span class="mp-sub mp-w6 nowrap">{gbp(line["amount_gbp"])}</span></div>'
                f'<div class="mp-foot mp-ink2">Barclaycard · {wd(line["date"])} · <span class="amb-tag">{guess}?</span></div>'
                f'<div class="qchips"><span class="qchip on" role="button">Keep {guess}</span><span class="qchip" role="button">Change</span></div></div>')
    bb = (f'<div class="hl-rows"><div class="hrow"><span class="mp-icontile mp-neutral">{ms("credit_card", "ms-s")}</span><div class="f1"><div class="mp-sub mp-w6">Barclaycard and Monzo</div>'
          f'<div class="mp-foot mp-ink2">16 + 6 spending lines</div></div><span class="mp-sub mp-w6 nowrap">{gbp(SPEND)}</span></div></div>'
          f'<div class="dlink" style="border-top:1px solid var(--mp-line)"><span>Two to check</span>{ms("expand_less")}</div>{amb(AMZN, "Shopping")}{amb(EBAY, "Other")}'
          f'<div class="dlink" style="border-top:1px solid var(--mp-line)"><span>By category · 11</span>{ms("expand_more")}</div>'
          f'<div class="dlink" style="border-top:1px solid var(--mp-line)"><span>Not spending, recognised · 5</span>{ms("expand_more")}</div>'
          '<p class="pp mp-foot mp-ink2">Nothing is saved until you tap Confirm.</p>')
    card_b = ccard("October’s statements · check them", f"Spending {gbp(SPEND)} in 22 lines", bb, [("Confirm", "cbtn-primary"), ("Edit", ""), ("Cancel", "cbtn-ghost")])
    fr = [chat_frame("iPhone · 1b one card, two to check open · 08:41 · Light", "t-light", "08:41", files_bubble() + ai("22 lines read. Two to check, in the card.", card_b), 0, NW_REVIEW),
          chat_frame("iPhone · 1b one card, two to check open · 08:41 · Dark", "t-dark", "08:41", files_bubble() + ai("22 lines read. Two to check, in the card.", card_b), 0, NW_REVIEW),
          chat_frame("iPhone · 1b saved, Undo, Was → Save · 08:46 · Light", "t-light", "08:46", ai(card=saved_card(edit=True)), 0, NW_SAVED),
          web_chat_frame("Browser · 1b the chat beside the page at 1440 (the column alone) · Dark", "t-dark", '<div class="daysep">Sun 1 Nov</div>' + wai("22 lines read. Two to check, in the card.", card_b))]
    secs.append(section("1b", "1b", "One card, folded", "Not recommended", "MA-301 · P2-3 · MA-218 · Rule 4",
                        "Keeps §4.9’s one review card, but folds it: the total on top, the two to check open with Keep and Change, By category and the recognised lines closed until tapped.",
                        fr, [("Strength:", "no change to the spec’s one card; everything stays in one place."),
                             ("Trade-off:", "the questions still sit inside a card with Confirm under them, so a member can Confirm past them; with Two to check open it is still taller than one screen; chips inside a card inside the chat nest one more level.")]))
    # ---- 1c
    short = ccard("October’s statements", f"Spending {gbp(SPEND)} in 22 lines", '<p class="pp mp-sub">Two lines to check before it is saved.</p>', [("Review", "cbtn-primary"), ("Cancel", "cbtn-ghost")])
    sheet = (f'<div class="dim"></div><div class="sheet lg"><div class="sheet-grab"></div><div class="sheet-h"><span class="mp-hl">Check 1 of 3 · Two lines</span>'
             f'<span class="gbtn lg" aria-label="Close">{ms("close")}</span></div><div class="stp"><i class="on"></i><i></i><i></i></div>'
             f'<div class="sheetcard">{amb(AMZN, "Shopping")}{amb(EBAY, "Other")}</div><button class="mp-btn mp-btn-primary" type="button">Next: by category</button></div>')
    css_inline = ""
    fr = [chat_frame("iPhone · 1c a short card in the chat · 08:41 · Light", "t-light", "08:41", files_bubble() + ai("22 lines read.", short), 0, NW_REVIEW),
          chat_frame("iPhone · 1c the review on a sheet · 08:41 · Dark", "t-dark", "08:41", files_bubble() + ai("22 lines read.", short), 0, NW_REVIEW).replace('<div class="homebar">', sheet + '<div class="homebar">'),
          web_chat_frame("Browser · 1c the review in a dialog at 1440 (the column alone) · Light", "t-light", '<div class="daysep">Sun 1 Nov</div>' + wai("22 lines read.", short)).replace(
              '</aside></div></div>', f'</aside><div class="wdlg"><div><span class="mp-hl">Check 1 of 3 · Two lines</span>{amb(AMZN, "Shopping")}{amb(EBAY, "Other")}<button class="mp-btn mp-btn-primary" type="button">Next: by category</button></div></div></div></div>')]
    secs.append(section("1c", "1c", "A short card, the review on a sheet", "Not recommended", "MA-301 · P2-3 · MA-218",
                        "The chat holds one short card with Review; the review runs as three steps on a partial sheet (a dialog on the web): two to check, by category, then Confirm.",
                        fr, [("Strength:", "the conversation stays one line long; the steps are big and clear."),
                             ("Trade-off:", "a modal step outside the conversation, which the chat-first shell avoids elsewhere; a sheet over the chat hides what the member said; the sheet is glass, so its content needs a solid card inside it (drawn) to keep content off glass.")]))
    intro = intro_block([
        "On iPhone v4 · Budget, board I2 draws October’s statement review as one card four screens tall: the sources, the two uncertain merchants in amber, eleven categories as tiles and five recognised lines, with Confirm at the very bottom (deep scan P2-3). "
        "Each option keeps Rule 4: one Confirm writes everything with its audit rows, the saved card has Undo, and a saved figure is corrected in place (Was X → Save).",
        f"Drawn on Sun 1 Nov from 08:41, the board’s own clock: Arun sends barclaycard-2026-11-01.pdf and monzo-2026-10.csv from the Chat tab. The household strip shows {NW_REVIEW} before Confirm and {NW_SAVED} after it, as I2 does."],
        '<span class="plan-k">MA-301</span><span class="plan-k">MA-218</span><span>ARCHITECTURE.md §4.9, §4.10, §9.1 (guided flows); boards it would change: iPhone v4 · Budget I2, Web v4 · Budget (Browser · Statement review).</span><b>Options until Arun picks.</b><span>Illustrative figures from household-v4.json.</span>')
    return page("MA-301 · b · Statement Confirm", CSS_B, intro, secs)


# ================================================================ c · the desktop three panes, 1133 to 1392
def overview_main(fold_btn: bool = False) -> str:
    hold = holdings_card("flat")
    return (f'<main class="xmain"><div class="xpad"><header class="xhead"><div><div class="mp-large">Home</div><div class="mp-foot mp-ink2">Mon 26 Oct · prices to Fri 23 Oct</div></div>'
            f'<div class="fx ac g8">{EYEBTN}</div></header><div class="xcols"><div class="xcol">{home_hero("flat")}{where_card("flat")}</div>'
            f'<div class="xcol">{hold}{next_card("flat")}</div></div></div></main>')


def rail_chat() -> str:
    return (f'<aside class="xrailchat" aria-label="Chat, folded"><button class="iconbtn" aria-label="Open the chat">{ms("right_panel_open")}</button>'
            f'<span class="rbadge" aria-label="1 new reply">1</span><span class="rlbl">Chat</span></aside>')


CSS_C = CSS_HOME + r"""
.kbd{margin-left:auto;font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);background:var(--mp-surface-2);border-radius:6px;padding:2px 6px}
.xrailchat{width:64px;flex:none;border-left:1px solid var(--mp-line);background:var(--mp-bg);display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0}
.rbadge{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--mp-accent);color:var(--mp-on-accent);font:700 12px/22px var(--mp-font);text-align:center;box-sizing:border-box}
.rlbl{font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);writing-mode:vertical-rl;transform:rotate(180deg);margin-top:6px}
.xrail{width:76px;padding:18px 10px;align-items:center}
.xrail .xbrand{padding:2px 0 16px}
.railb{width:52px;justify-content:center;padding:0}
.drawer{position:absolute;top:0;right:0;bottom:0;width:380px;box-shadow:-16px 0 40px rgba(20,23,31,.18);z-index:20}
.drawer .xchat{width:100%;height:100%}
.chatbtn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:12px;background:var(--mp-accent);color:var(--mp-on-accent);font:600 15px/20px var(--mp-font)}
.wlbl{flex:none;font:600 12px/16px ui-monospace,Menlo,monospace;padding:3px 8px;border-radius:6px;background:var(--mp-ink);color:var(--mp-bg)}
"""


def board_c() -> str:
    SECTION_NAMES.clear()
    secs = []
    def frame(cap, theme, w, inner, label):
        return browser(cap, theme, w, "dashboard.mypaisapp.com/", f'<div class="xshell">{inner}</div>').replace('</span></div><div class="xshell">', f'</span><span class="wlbl">{label}</span></div><div class="xshell">', 1)
    # ---- 1a
    fr = [frame("Browser · 1a at 1180: the page keeps one column (576 px), chat beside · Light", "t-light", "w1180", side("Home") + overview_main() + chat_col(MON26_CHAT), "1180 · page 576 · one column"),
          frame("Browser · 1a at 1280, chat folded to a rail: two columns (968 px) · Dark", "t-dark", "w1280", side("Home") + overview_main() + rail_chat(), "1280 · chat folded · page 968 · two columns"),
          frame("Browser · 1a at 1366: two columns once the page reaches 760 (762 px) · Light", "t-light", "w1366", side("Home") + overview_main() + chat_col(MON26_CHAT), "1366 · page 762 · two columns")]
    secs.append(section("1a", "1a", "The page decides its columns; the chat folds", "Recommended", "MA-301 · P2-3 · MA-240",
                        "The page is its own size container: one column until it is 760 px wide (today the switch is at 700, so 700 to 759 px gave two columns of about 340 px). "
                        "The chat keeps its place beside every page from 1133 px, with a fold button in its header: folded, it is a 64 px rail with a badge, and the member’s choice is remembered.",
                        fr, [("Why recommended:", "it keeps the width rule exactly (“beside every screen from about 1133 pt”) and fixes the squeeze where it happens, in the page; folding is the member’s choice, never the window’s."),
                             ("The arithmetic:", "sidebar 248 + chat 356: the page is 576 px at 1180, 676 at 1280 and 762 at 1366, so two columns arrive at 1364 px with the chat open, at 1076 with it folded."),
                             ("Build:", "<code>container: page</code> already exists on <code>.mp-shell-main</code>; the threshold moves from 700 to 760 and the chat column gets a fold button (⌘\\ toggles it) and a rail; MA-240’s guards for 700 to 759 retire (lesson 31)."),
                             ("Trade-off:", "between 1133 and 1363 px with the chat open the page is one long column; the hero and the lists stack.")]))
    # ---- 1b
    fr = [frame("Browser · 1b at 1180: the sidebar becomes a rail; page 748 px, one column · Light", "t-light", "w1180", side("Home", rail=True) + overview_main() + chat_col(MON26_CHAT), "1180 · rail 76 · page 748 · one column"),
          frame("Browser · 1b at 1280: page 848 px, two columns · Dark", "t-dark", "w1280", side("Home", rail=True) + overview_main() + chat_col(MON26_CHAT), "1280 · rail 76 · page 848 · two columns")]
    secs.append(section("1b", "1b", "The sidebar folds to a rail below 1393 px", "Not recommended", "MA-301 · P2-3",
                        "Between 1133 and 1392 px the 248 px sidebar becomes a 76 px icon rail (names on hover and focus), giving the page 172 px back; the chat column stays as it is.",
                        fr, [("Strength:", "two columns from about 1188 px with the chat open; nothing for the member to do."),
                             ("Trade-off:", "icons without words for twelve sections (Proof, Overlap and Scorecard are hard to tell apart by icon); the window’s width changes the navigation, which the iPad does not do; a second rule to keep in step with the iPad sidebar.")]))
    # ---- 1c
    drawer = f'<div class="drawer">{chat_col(MON26_CHAT)}</div>'
    main_btn = overview_main().replace(f'<div class="fx ac g8">{EYEBTN}</div>', f'<div class="fx ac g8">{EYEBTN}<span class="chatbtn">{ms("chat_bubble", "ms-s")}Chat</span></div>')
    fr = [frame("Browser · 1c at 1280: no chat column; the page is 1032 px, two columns · Light", "t-light", "w1280", side("Home") + main_btn, "1280 · page 1032 · two columns"),
          frame("Browser · 1c at 1280: Chat opens as a drawer over the page · Dark", "t-dark", "w1280", side("Home") + main_btn + drawer, "1280 · chat as a drawer")]
    secs.append(section("1c", "1c", "The chat beside only from 1393 px", "Not recommended · an owner decision", "MA-301 · P2-3 · MA-240 · lesson 30",
                        "Below 1393 px the chat is a drawer from a Chat button (the iPad’s sheet, on the web); from 1393 it sits beside the page.",
                        fr, [("Strength:", "the widest page of the three; no squeeze at all."),
                             ("Trade-off:", "it changes the width rule Arun set on 27 Oct 2026 (MA-240) for the web, so the doors would differ: “beside every screen from about 1133 pt” would hold only on iPad. A 13-inch MacBook Air at 1280 would lose the chat beside the page. Lesson 30: a band-wide change is Arun’s decision, made in every record at once.")]))
    intro = intro_block([
        "At laptop widths from 1133 to 1392 px the web shows three panes: the 248 px sidebar, the page and the 356 px chat. The page falls to 529 to 788 px, and from 700 px the dashboard splits into two columns of about 340 px, which is where the deep scan found the squeeze (P2-3).",
        "Each frame is drawn at its real width with Home on Mon 26 Oct (the household’s figures after the Monzo savings at 09:41). The label at the bottom of each frame gives the page’s width and its columns."],
        '<span class="plan-k">MA-301</span><span>ARCHITECTURE.md §9.1 (the width rule), §9.4; tokens.css’s page container and the 1024 to 1359 px chat width; boards it would change: Web v4 · Shell and chat, Web v4 · Dashboard, Prototype v5 (desktop door).</span><b>Options until Arun picks.</b><span>Illustrative figures from household-v4.json.</span>')
    return page("MA-301 · c · Desktop three panes", CSS_C, intro, secs)


# ================================================================ d · flatter cards
def home_iphone(cap: str, theme: str, style: str, scrolled: bool = False) -> str:
    if style == "group":
        body = home_hero("flat") + f'<div class="grp"><div class="grp-h">Where it is</div><div class="grp-card">{where_card("open").replace("<span class=\"mp-hl\">Where it is</span>", "")}</div></div>' + \
            holdings_card("group").replace('class="hrow"', 'class="hrow"') + next_card("group")
    elif style == "open":
        body = home_hero("flat") + where_card("open") + holdings_card("open") + next_card("open")
    else:
        body = home_hero(style) + where_card(style) + holdings_card(style) + next_card(style)
    if scrolled:
        nav = f'<div class="nav"><span></span><span class="nav-title navc">Home</span><span class="navr">{EYE}{ASK}</span></div>'
        return iphone(cap, theme, "9:41", nav=nav, title=None, body=body, pg_style="margin-top:-420px")
    nav = f'<div class="nav"><span></span><span class="navr">{EYE}{ASK}</span></div>'
    return iphone(cap, theme, "9:41", nav=nav, title="Home", body=body)


def home_web(cap: str, theme: str, style: str, w: str = "w1440") -> str:
    if style == "group":
        left = home_hero("flat") + f'<div class="grp"><div class="grp-h">Where it is</div><div class="grp-card">{where_card("open").replace("<span class=\"mp-hl\">Where it is</span>", "")}</div></div>'
        right = holdings_card("group") + next_card("group")
    elif style == "open":
        left, right = home_hero("flat") + where_card("open"), holdings_card("open") + next_card("open")
    else:
        left, right = home_hero(style) + where_card(style), holdings_card(style) + next_card(style)
    main = (f'<main class="xmain"><div class="xpad"><header class="xhead"><div><div class="mp-large">Home</div><div class="mp-foot mp-ink2">Mon 26 Oct · prices to Fri 23 Oct</div></div>'
            f'{EYEBTN}</header><div class="xcols"><div class="xcol">{left}</div><div class="xcol">{right}</div></div></div></main>')
    return browser(cap, theme, w, "dashboard.mypaisapp.com/", f'<div class="xshell">{side("Home")}{main}{chat_col(MON26_CHAT)}</div>')


CSS_D = CSS_HOME + r"""
.kbd{margin-left:auto;font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);background:var(--mp-surface-2);border-radius:6px;padding:2px 6px}
.grp .mp-group .hrow{padding:8px 0}
.opensec .hl-rows{border-top:1px solid var(--mp-line)}
.opensec .mp-hl{font-size:20px;line-height:25px}
.navc{position:absolute;left:0;right:0;text-align:center;pointer-events:none;font:600 17px/22px var(--mp-font)}
"""


def board_d() -> str:
    SECTION_NAMES.clear()
    secs = []
    secs.append(section("now", "Now", "Today’s nesting, for comparison", "Today", "P2-2",
                        "Boxes inside the hero (the pulse, own, owe, liquid), tinted boxes inside the cards, and all-caps overlines up to 40 characters that wrap on iPhone.",
                        [home_iphone("iPhone · today · Light", "t-light", "now"), home_web("Browser · today · Desktop 1440 · Light", "t-light", "now")],
                        [("What the scan counted:", "about 340 boxes inside boxes and 53 overlines over 30 characters across the boards (P2-2)."),
                         ("Drawn here:", "the same figures as the options, so only the treatment differs.")]))
    secs.append(section("1a", "1a", "Hairlines, sentence-case labels", "Recommended", "MA-301 · P2-2",
                        "One surface per card. Inside it, rows and stats are split by 1 px hairlines, never boxed; the hero’s own, owe and liquid sit in three columns with hairline rules; the pulse sits on the hero itself. Overlines become sentence case and short (“Net worth · Mon 26 Oct”, “Top holdings”, “Coming up”).",
                        [home_iphone("iPhone · 1a · Light", "t-light", "flat"), home_iphone("iPhone · 1a · scrolled to the lists · Dark", "t-dark", "flat", scrolled=True),
                         home_web("Browser · 1a · Desktop 1440 · Light", "t-light", "flat"), home_web("Browser · 1a · Desktop 1440 · Dark", "t-dark", "flat")],
                        [("Why recommended:", "it keeps Warm ledger’s cards (the brand’s shape) and removes only the second layer; the eye finds figures in a column of rows faster than in a grid of tiles."),
                         ("Build:", "<code>.hsplit3</code>, <code>.cstat</code>, <code>.kvg</code>, <code>.rrow</code> and <code>.f3c</code> lose their fill and radius and gain a hairline; <code>.mp-over</code> stays for the rare true overline and a new sentence-case label (13 px, 600) takes the rest. The hairline is <code>--mp-line</code> (on the hero, <code>--mp-hero-2</code>): no new token."),
                         ("Trade-off:", "denser screens (the Admin center) lose some grouping; they get sub-headings instead.")]))
    secs.append(section("1b", "1b", "Grouped lists, headers outside", "Not recommended", "MA-301 · P2-2",
                        "Below the hero every section becomes an iOS grouped inset list: the section’s name above it in sentence case, its rows inside one plain group with no shadow, as Settings and Health draw them.",
                        [home_iphone("iPhone · 1b · Light", "t-light", "group"), home_iphone("iPhone · 1b · scrolled to the lists · Dark", "t-dark", "group", scrolled=True),
                         home_web("Browser · 1b · Desktop 1440 · Light", "t-light", "group")],
                        [("Strength:", "the most native look on iPhone; no card needs a title inside it."),
                         ("Trade-off:", "on the web two columns of grouped lists read as a settings page, not a dashboard; Monzo’s warmth (lifted cards) goes flat; charts need a group of their own.")]))
    secs.append(section("1c", "1c", "Open sections, no cards below the hero", "Not recommended", "MA-301 · P2-2",
                        "Only the hero stays a card. Every other section sits on the page, its title at 20 pt and a hairline between sections, like an editorial page.",
                        [home_iphone("iPhone · 1c · Light", "t-light", "open"), home_iphone("iPhone · 1c · scrolled to the lists · Dark", "t-dark", "open", scrolled=True),
                         home_web("Browser · 1c · Desktop 1440 · Light", "t-light", "open")],
                        [("Strength:", "the calmest page; the hero stands alone."),
                         ("Trade-off:", "content without a surface reads weaker at 25% brightness in dark (the page and the text are closer than a card and its text); on wide screens the two columns lose their edges; a big change from Warm ledger as picked (MA-101).")]))
    intro = intro_block([
        "The deep scan (P2-2) found cards inside cards across the boards: tinted boxes in the hero and in ledger cards, and long all-caps overlines (“HOUSEHOLD NET WORTH · MON 26 OCT”) that wrap on iPhone. These samples draw iPhone Home and the web’s Home (dashboard) with the same figures in each option.",
        f"Mon 26 Oct 9:41, after the Monzo savings: {gbp(NW)} ({inr(AFTER['net_inr'])}), ▲ {gbp(CHANGE)} since Thu 22 Oct, UK {UK_PCT}% and India {IN_PCT}%."],
        '<span class="plan-k">MA-301</span><span>DESIGN.md (Cards, Elevation), tokens.css .mp-over; boards it would change: every v4 board with .hsplit3, .cstat, .kvg, .rrow, .f3c or a long overline (iPhone and Web v4 · Home and Dashboard first).</span><b>Options until Arun picks.</b><span>Illustrative figures from household-v4.json.</span>')
    return page("MA-301 · d · Flatter cards", CSS_D, intro, secs)


# ================================================================ e · the browser-only /join/<token>
APPLE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.88 1.15 9.13.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.4-.92-2.42-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z"/></svg>'
GOOGLE = '<span class="gmark" aria-hidden="true">G</span>'
INV_UNTIL = "Sun 6 Sep 18:00"


def join_card(state: str = "ready") -> str:
    if state == "used":
        return (f'<div class="jcard"><div class="fx ac g10">{mark(40)}<span class="mp-hl">MyPaisa</span></div><h1 class="jh">This invite has been used</h1>'
                '<p class="pp mp-body mp-ink2">Each invite works once. This one was used on Sun 6 Sep at 10:12.</p>'
                '<p class="pp mp-sub mp-ink2">If you are in the Dutta household, sign in. If you need to join, ask Arun for a new link: he makes it in the Admin center, and it lasts 24 hours.</p>'
                '<a class="mp-btn mp-btn-primary jbtn" href="#">Sign in</a></div>')
    if state == "passkey":
        return (f'<div class="jcard"><div class="fx ac g10">{mark(40)}<span class="mp-hl">MyPaisa</span></div><div class="jdone">{ms("check_circle", "ms-fill")}<span>You’re in the Dutta household</span></div>'
                '<h1 class="jh">Sign in faster next time?</h1><p class="pp mp-body mp-ink2">Add a passkey for this browser: next time it is your fingerprint, face or screen lock, no password.</p>'
                f'<button class="mp-btn mp-btn-primary jbtn" type="button">{ms("passkey")}Add a passkey</button><button class="mp-btn mp-btn-plain jbtn" type="button">Not now</button>'
                '<p class="pp mp-foot mp-ink2">You can add one later from You. Next: three short questions, then your household.</p></div>')
    return (f'<div class="jcard"><div class="fx ac g10">{mark(40)}<span class="mp-hl">MyPaisa</span></div>'
            '<h1 class="jh">Arun invited you to the Dutta household</h1>'
            '<p class="pp mp-body mp-ink2">As a member you see the household’s whole wealth, and you register and correct your own records, in the chat or on any page.</p>'
            f'<div class="jbtns"><button class="mp-btn jbtn japple" type="button">{APPLE}Continue with Apple</button>'
            f'<button class="mp-btn mp-btn-tinted jbtn jgoogle" type="button">{GOOGLE}Continue with Google</button></div>'
            f'<p class="pp mp-foot mp-ink2">This link works once, until {INV_UNTIL}. After you join you can add a passkey for this browser.</p>'
            '<div class="jfoot"><a class="mp-link" href="#">Already in the household? Sign in</a></div></div>')


def join_desktop(card: str, side_txt: bool = True) -> str:
    aside = ('<div class="jside"><span class="overs">What you’ll see</span><ul class="jlist">'
             f'<li>{ms("account_balance", "ms-s")}<span>Everything the household owns and owes, in pounds and rupees, in one place.</span></li>'
             f'<li>{ms("chat_bubble", "ms-s")}<span>A chat that answers questions and records what you tell it, asking before it saves anything.</span></li>'
             f'<li>{ms("visibility_off", "ms-s")}<span>Privacy mode, to hide every amount when someone is looking.</span></li></ul>'
             '</div>') if side_txt else ""
    return f'<div class="jpage jdesk"><div class="jwrap{"" if side_txt else " jone"}">{card}{aside}</div></div>'


CSS_E = r"""
.jpage{flex:1;min-height:0;overflow:hidden;display:flex;justify-content:center;background:var(--mp-bg)}
.jphone{padding:24px 20px}
.jdesk{align-items:center;padding:40px}
.jwrap{display:grid;grid-template-columns:minmax(0,440px) minmax(0,360px);gap:56px;align-items:center}
.jwrap.jone{grid-template-columns:minmax(0,440px)}
.jcard{display:flex;flex-direction:column;gap:16px;background:var(--mp-surface);border-radius:var(--mp-r-card);box-shadow:var(--mp-shadow);padding:24px;box-sizing:border-box;width:100%}
.jphone .jcard{background:transparent;box-shadow:none;padding:4px 0}
.jh{margin:0;font:700 28px/34px var(--mp-font);letter-spacing:-0.02em;text-wrap:balance}
.jbtns{display:flex;flex-direction:column;gap:10px}
.jbtn{width:100%;box-sizing:border-box;gap:10px}
.japple{background:var(--mp-ink);color:var(--mp-bg)}
.japple:hover{color:var(--mp-bg)}
.gmark{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--mp-surface);color:var(--mp-hold);font:800 14px/1 var(--mp-font);box-shadow:inset 0 0 0 1px var(--mp-line)}
.jfoot{display:flex;flex-direction:column;gap:6px;padding-top:4px;border-top:1px solid var(--mp-line)}
.jfoot a{display:inline-flex;align-items:center;min-height:44px;font:600 15px/20px var(--mp-font)}
.jside{display:flex;flex-direction:column;gap:14px}
.jlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.jlist li{display:flex;gap:10px;align-items:flex-start;font:400 16px/22px var(--mp-font)}
.jlist .ms{color:var(--mp-accent);margin-top:2px}
.jdone{display:flex;align-items:center;gap:8px;font:600 15px/20px var(--mp-font);color:var(--mp-up)}
.jsteps{display:flex;gap:6px}.jsteps i{flex:1;height:4px;border-radius:2px;background:var(--mp-track);display:block}.jsteps i.on{background:var(--mp-accent)}
.jrole{display:flex;flex-direction:column;gap:4px;padding:12px 0;border-top:1px solid var(--mp-line);border-bottom:1px solid var(--mp-line)}
/* 1c: the join inside the chat */
.jchat{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;gap:12px;padding:16px;overflow:hidden;background:var(--mp-bg)}
.jchat .ccard{max-width:520px}
.jdesk .jchat{max-width:640px;width:100%;margin:0 auto}
"""


def board_e() -> str:
    SECTION_NAMES.clear()
    secs = []
    url = "dashboard.mypaisapp.com/join/8Kq2…"
    ph = lambda card: f'<div class="jpage jphone">{card}</div>'
    fr = [browser("Browser · 1a the invite · Phone 390 · Light · Sun 6 Sep 10:11", "t-light", "w390", url, ph(join_card())),
          browser("Browser · 1a the invite · Phone 390 · Dark", "t-dark", "w390", url, ph(join_card())),
          browser("Browser · 1a the invite · Desktop 1440 · Light", "t-light", "w1440", url, join_desktop(join_card())),
          browser("Browser · 1a after Apple: a passkey for this browser · Desktop 1440 · Dark · 10:12", "t-dark", "w1440", "dashboard.mypaisapp.com/welcome", join_desktop(join_card("passkey"), side_txt=False)),
          browser("Browser · 1a the link used before · Phone 390 · Light", "t-light", "w390", url, ph(join_card("used")))]
    secs.append(section("1a", "1a", "One page, two live buttons", "Recommended", "MA-301 · P2-5 · MA-73 · MA-185",
                        "The invite says who invited you, to which household and what a member can do, then two working buttons: Continue with Apple and Continue with Google. "
                        "No passkey button before you exist (a passkey is added after joining, on the next screen), no “open the app” copy, no dimmed buttons. One line says how long the link lasts.",
                        fr, [("Why recommended:", "every control on the page works, in any browser; it is the fewest steps to a member, and the passkey is offered at the one moment it can be made."),
                             ("Spec kept:", "§4.5 Joining: the invitee’s Apple or Google sign-in creates the member and Cognito user, then the three setup questions; single use, 24 hours, bound to the household and role. The browser still opens the iOS app on an iPhone that has it (the association file); this page is what everyone else sees."),
                             ("Figures:", f"talk-v5.json: Arun invited a member on Sat 5 Sep at 18:00, the link held until {INV_UNTIL}, and Asha joined with Apple on Sun 6 Sep at 10:12. The used-link frame is that link opened again later."),
                             ("States drawn:", "the invite, after joining (the passkey offer), the link already used. The expired link reads the same with “This invite has expired” and the time it ended; Apple or Google cancelled leaves the invite page as it was.")]))
    s1 = (f'<div class="jcard"><div class="jsteps"><i class="on"></i><i></i><i></i></div><div class="fx ac g10">{mark(40)}<span class="mp-hl">MyPaisa</span></div>'
          '<h1 class="jh">You’re invited</h1><p class="pp mp-body mp-ink2">Arun invited you to the Dutta household.</p>'
          '<div class="jrole"><span class="mp-sub mp-w6">As a member</span><span class="mp-sub mp-ink2">See the household’s whole wealth; register and correct your own records.</span></div>'
          f'<button class="mp-btn mp-btn-primary jbtn" type="button">Continue</button><p class="pp mp-foot mp-ink2">Works once, until {INV_UNTIL}.</p></div>')
    s2 = (f'<div class="jcard"><div class="jsteps"><i class="on"></i><i class="on"></i><i></i></div><h1 class="jh">How will you sign in?</h1>'
          '<p class="pp mp-body mp-ink2">Pick the account you will use every time. You can add the other one later.</p>'
          f'<div class="jbtns"><button class="mp-btn jbtn japple" type="button">{APPLE}Continue with Apple</button><button class="mp-btn mp-btn-tinted jbtn jgoogle" type="button">{GOOGLE}Continue with Google</button></div></div>')
    fr = [browser("Browser · 1b step 1, the invite · Phone 390 · Light", "t-light", "w390", url, ph(s1)),
          browser("Browser · 1b step 2, how you sign in · Phone 390 · Dark", "t-dark", "w390", url, ph(s2)),
          browser("Browser · 1b step 1 · Desktop 1440 · Light", "t-light", "w1440", url, join_desktop(s1))]
    secs.append(section("1b", "1b", "Three short steps", "Not recommended", "MA-301 · P2-5",
                        "The same content as 1a in three screens with a progress bar: the invite and the role, then how you sign in, then the passkey offer.",
                        fr, [("Strength:", "each screen has one decision; the role is read before any sign-in."),
                             ("Trade-off:", "one more tap for everyone, and a Continue that does nothing but turn the page; more screens to keep in step with the iOS app’s join.")]))
    msg = (f'<div class="jchat"><div class="daysep">Sun 6 Sep</div>' + wai("Hello. Arun invited you to the Dutta household on MyPaisa. I keep the household’s accounts and answer questions about them.",
            ccard("Invite · member", "Join the Dutta household",
                  f'<p class="pp mp-sub mp-ink2">Members see the whole household and record their own things. This link works once, until {INV_UNTIL}.</p>',
                  None, f'<div class="ccard-acts" style="flex-direction:column"><button class="mp-btn jbtn japple" type="button">{APPLE}Continue with Apple</button><button class="mp-btn mp-btn-tinted jbtn jgoogle" type="button">{GOOGLE}Continue with Google</button></div>')) + "</div>")
    fr = [browser("Browser · 1c the invite as the chat’s first message · Phone 390 · Light", "t-light", "w390", url, msg),
          browser("Browser · 1c · Desktop 1440 · Dark", "t-dark", "w1440", url, f'<div class="jpage jdesk" style="align-items:stretch">{msg}</div>')]
    secs.append(section("1c", "1c", "The invite is the chat’s first message", "Not recommended", "MA-301 · P2-5",
                        "The join page is the web chat: MyPaisa’s first message explains the invite, and its card carries the two sign-in buttons. After joining, the three setup questions continue in the same conversation.",
                        fr, [("Strength:", "the member meets the chat-first product from the first second, and the setup questions follow on naturally."),
                             ("Trade-off:", "a chat that cannot be typed into yet (no session, no stream before sign-in) looks broken; the role is in small print inside a card; the invite needs its own unauthenticated chat view, which nothing else uses.")]))
    intro = intro_block([
        "An invite link, <code>https://dashboard.mypaisapp.com/join/&lt;token&gt;</code>, opens the iOS app on an iPhone that has it and the web page anywhere else (§9.4). The deep scan (P2-5) found today’s page written for the app: “open in the MyPaisa app” copy and dimmed Google and passkey buttons, so a member who only uses a browser meets a page that half works.",
        "Each option is drawn at phone width (390) and on a laptop (1440), in light and dark, with a working Apple and Google sign-in. Asha’s own invite is the example: sent Sat 5 Sep 18:00, used Sun 6 Sep 10:12."],
        '<span class="plan-k">MA-301</span><span>ARCHITECTURE.md §4.5 (Joining, the second check), §9.4 (one site, two jobs); boards it would change: Web v4 · Login, invite and responsive, iPhone v4 · Sign-in and invite (its browser fallback).</span><b>Options until Arun picks.</b><span>Illustrative names and times from talk-v5.json.</span>')
    return page("MA-301 · e · Web join", CSS_E + CSS_HOME, intro, secs)


# ================================================================ f · type and icons
STACKS = {
    "1a": {"ui": '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
           "fig": 'ui-rounded, "SF Pro Rounded", "Nunito", -apple-system, system-ui, sans-serif', "web_icons": "lucide", "ios_icons": "sf"},
    "1b": {"ui": '"Inter", system-ui, sans-serif', "fig": '"Inter", system-ui, sans-serif', "web_icons": "lucide", "ios_icons": "sf"},
    "1c": {"ui": '"Inter", system-ui, sans-serif', "fig": '"Nunito", system-ui, sans-serif', "web_icons": "ms", "ios_icons": "ms"},
}


def specimen(opt: str) -> str:
    s = STACKS[opt]
    names = {"1a": ("SF Pro on Apple devices; Inter (self-hosted, variable WOFF2) elsewhere", "SF Pro Rounded on Apple; Nunito 800 (self-hosted, digits and £ ₹ only) elsewhere", "Lucide on the web, SF Symbols in the app"),
             "1b": ("Inter everywhere, the app included (bundled, scaled with Dynamic Type)", "Inter Display 800, tabular", "Lucide on the web, SF Symbols in the app"),
             "1c": ("Inter on the web, SF Pro in the app (today’s stack)", "Nunito 800 at both doors (bundled in the app)", "Material Symbols Rounded at both doors (self-hosted subset; bundled in the app)")}[opt]
    if s["web_icons"] == "lucide":
        icons = "".join(f'<span class="icell">{lu(n, 24)}<span>{n}</span></span>' for n in ["house", "wallet", "trending-up", "message-circle", "search", "eye", "history", "circle-user"])
    else:
        icons = "".join(f'<span class="icell">{ms(n)}<span>{n}</span></span>' for n in ["home", "account_balance_wallet", "trending_up", "chat_bubble", "search", "visibility", "history", "account_circle"])
    sf = ""
    if s["ios_icons"] == "sf":
        sf = '<div class="mp-foot mp-ink2">In the app: <code>house.fill</code>, <code>wallet.bifold</code>, <code>chart.line.uptrend.xyaxis</code>, <code>bubble.left.fill</code>, <code>magnifyingglass</code>, <code>eye</code>, <code>clock.arrow.circlepath</code>, <code>person.crop.circle</code>.</div>'
    return (f'<div class="dv-col"><div class="bd-theme">Specimen · {opt} · type and icons</div><div class="spec mp t-light" style="--sp-ui:{s["ui"]};--sp-fig:{s["fig"]}">'
            f'<div class="sp-k">Text</div><div class="sp-ui"><div class="sp-t1">Household net worth</div><div class="sp-b">Prices to Fri 23 Oct. Tap a figure to correct it.</div></div><div class="mp-foot mp-ink2">{names[0]}</div>'
            f'<div class="sp-k">Figures</div><div class="sp-fig">{gbp(NW)}</div><div class="sp-fig sp-fig2">{inr(AFTER["net_inr"])}</div><div class="mp-foot mp-ink2">{names[1]}</div>'
            f'<div class="sp-k">Icons</div><div class="icons">{icons}</div><div class="mp-foot mp-ink2">{names[2]}</div>{sf}</div></div>')


def home_f_iphone(opt: str, theme: str) -> str:
    s = STACKS[opt]
    body = home_hero("flat") + holdings_card("flat")
    cap = f"iPhone · {opt} · Home · {'Light' if theme == 't-light' else 'Dark'}"
    nav = f'<div class="nav"><span></span><span class="navr">{EYE}{ASK}</span></div>'
    out = iphone(cap, theme, "9:41", nav=nav, title="Home", body=body)
    return out.replace('class="dev dev-iphone mp', f'style="--mp-font:{escape(s["ui"])};--mp-font-round:{escape(s["fig"])}" class="dev dev-iphone mp', 1)


def home_f_web(opt: str, theme: str, w: str) -> str:
    s = STACKS[opt]
    if w == "w390":
        inner = (f'{phone_top("Home", EYEBTN)}<div class="xscroll"><div class="xppad">{home_hero("flat")}{holdings_card("flat")}</div></div>{phone_tabs("Home")}')
        if s["web_icons"] == "lucide":
            inner = inner.replace(phone_tabs("Home"), '<nav class="xtabs" aria-label="Sections">' + "".join(
                f'<span class="xtab{" on" if l == "Home" else ""}">{lu(i, 24)}{l}</span>' for i, l in [("house", "Home"), ("wallet", "Assets"), ("trending-up", "Projection"), ("message-circle", "Chat"), ("ellipsis", "More")]) + "</nav>")
            inner = inner.replace(EYEBTN, f'<button class="iconbtn" aria-label="Privacy mode" aria-pressed="false">{lu("eye", 22)}</button>')
    else:
        main = (f'<main class="xmain"><div class="xpad"><header class="xhead"><div><div class="mp-large">Home</div><div class="mp-foot mp-ink2">Mon 26 Oct · prices to Fri 23 Oct</div></div>'
                f'{EYEBTN if s["web_icons"] == "ms" else "<button class=iconbtn aria-label=Privacy>" + lu("eye", 22) + "</button>"}</header><div class="xcols"><div class="xcol">{home_hero("flat")}</div><div class="xcol">{holdings_card("flat")}</div></div></div></main>')
        inner = f'<div class="xshell">{side("Home", icons=s["web_icons"])}{main}</div>'
    cap = f"Browser · {opt} · Home · {'Desktop 1280' if w != 'w390' else 'Phone 390'} · {'Light' if theme == 't-light' else 'Dark'}"
    out = browser(cap, theme, w, "dashboard.mypaisapp.com/", inner)
    return out.replace('class="bf ', f'style="--mp-font:{escape(s["ui"])};--mp-font-round:{escape(s["fig"])}" class="bf ', 1)


CSS_F = CSS_HOME + r"""
.kbd{margin-left:auto;font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);background:var(--mp-surface-2);border-radius:6px;padding:2px 6px}
.spec{width:360px;box-sizing:border-box;background:var(--mp-surface);border-radius:20px;box-shadow:var(--mp-shadow);padding:20px;display:flex;flex-direction:column;gap:8px;color:var(--mp-ink)}
.sp-k{font:600 13px/18px var(--sp-ui);color:var(--mp-ink-2);padding-top:8px;border-top:1px solid var(--mp-line)}
.sp-k:first-child{border-top:0;padding-top:0}
.sp-ui{font-family:var(--sp-ui);display:flex;flex-direction:column;gap:4px}
.sp-t1{font-weight:700;font-size:22px;line-height:28px;letter-spacing:-0.015em}
.sp-b{font-size:17px;line-height:22px}
.sp-fig{font-family:var(--sp-fig);font-weight:800;font-size:40px;line-height:44px;letter-spacing:-0.03em;font-variant-numeric:tabular-nums}
.sp-fig2{font-size:28px;line-height:32px}
.icons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 6px}
.icell{display:flex;flex-direction:column;align-items:center;gap:4px;font:400 12px/16px var(--mp-font);color:var(--mp-ink-2);text-align:center;word-break:break-word}
.icell .lu,.icell .ms{color:var(--mp-ink);font-size:24px}
.mp-side-i .lu{color:var(--mp-ink-2)}
.mp-side-i.on .lu{color:var(--mp-accent)}
.xtab .lu{margin-bottom:1px}
.iconbtn .lu{color:var(--mp-ink)}
"""


def board_f() -> str:
    SECTION_NAMES.clear()
    secs = []
    for opt, name, badge, lead, notes in [
        ("1a", "Platform type, Lucide on the web", "Recommended",
         "Each door uses its platform’s own type and icons: SF Pro, SF Pro Rounded and SF Symbols in the app; on the web the system font first (SF Pro on a Mac or iPhone), then self-hosted Inter, the figures in SF Pro Rounded or a small self-hosted Nunito, and Lucide icons as inline SVG. Google Fonts and the Material Symbols font are gone.",
         [("Why recommended:", "it is what TECH_STACK already names (Lucide, Fontsource where SF Pro is not on the system), Apple’s guidelines ask for SF Symbols in the app, and no icon can ever show as a word (a ligature font failing to load draws “visibility” as text)."),
          ("Weight:", "Inter variable WOFF2 (Latin, about 48 KB) and a Nunito figures subset (about 8 KB), preloaded; Lucide icons are tree-shaken SVG (about 0.3 KB each). No render-blocking @import (P2-4)."),
          ("Trade-off:", "the web looks slightly different on Windows and Android (Inter) than on Apple (SF Pro); the boards keep Material Symbols as stand-ins until each board is redrawn.")]),
        ("1b", "Inter everywhere", "Not recommended",
         "One face at both doors: Inter, self-hosted on the web and bundled in the app, scaled with Dynamic Type; the hero figures in Inter Display 800. Icons as in 1a.",
         [("Strength:", "the product looks the same on every device and in every screenshot."),
          ("Trade-off:", "the app stops looking native (Apple’s guidelines prefer SF Pro, and Dynamic Type works best with it); the rounded hero figures, a Monzo-like warmth Arun picked in MA-101, turn square; a 300 KB family to bundle.")]),
        ("1c", "Today’s look, self-hosted", "Not recommended",
         "Keep Nunito figures and Material Symbols Rounded, but self-host both and use the same icons in the app as on the web.",
         [("Strength:", "no visual change anywhere; the fastest to do."),
          ("Trade-off:", "a ligature icon font still draws words when it fails to load; Material icons in the app go against Apple’s guidelines (SF Symbols) and lose their weight matching with Dynamic Type; two icon vocabularies remain in the code (the Svelte stack ships Lucide).")]),
    ]:
        fr = [specimen(opt), home_f_iphone(opt, "t-light"), home_f_web(opt, "t-light", "w1280"), home_f_web(opt, "t-dark", "w390")]
        secs.append(section(opt, opt, name, badge, "MA-301 · P2-4 · MA-229", lead, fr, notes))
    intro = intro_block([
        "Today every board loads Inter, Nunito and Material Symbols Rounded from Google Fonts through an @import at the top of tokens.css, which blocks the first paint, and draws every icon (the app’s too) as a Material ligature (deep scan P2-4). These options choose what the build ships at each door.",
        "One sample screen per door, Home on Mon 26 Oct, with a specimen card per option. Chromium cannot draw ui-rounded, so where an option names SF Pro Rounded the board draws Nunito; SF Symbols are named in the specimen and drawn with the board’s stand-in glyphs in the iPhone frames."],
        '<span class="plan-k">MA-301</span><span>TECH_STACK.md (Look and components), DESIGN.md (Typography), tokens.css line 9; ARCHITECTURE.md §9.1 (SF Pro, SF Symbols).</span><b>Options until Arun picks.</b><span>Illustrative figures from household-v4.json.</span>')
    return page("MA-301 · f · Type and icons", CSS_F, intro, secs)


# ================================================================ g · the Cmd+K palette
def palette(opt: str, query: str) -> str:
    def row(icon, t, sub="", kbd="", on=False):
        k = f'<span class="kbd">{kbd}</span>' if kbd else ""
        s = f'<span class="mp-foot mp-ink2">{sub}</span>' if sub else ""
        return f'<div class="prow{" on" if on else ""}" role="option" aria-selected="{"true" if on else "false"}">{ms(icon, "ms-s")}<span class="fx col f1"><span class="mp-sub">{t}</span>{s}</span>{k}</div>'
    q = escape(query)
    field = (f'<div class="pfield">{ms("search")}<span class="{"txt" if query else "ph"}">{q or "Search, go to, or ask MyPaisa"}</span><span class="kbd">esc</span></div>')
    if opt == "1a":
        if query:
            groups = (f'<div class="pgh">Ask</div>{row("chat_bubble", f"Ask MyPaisa: “{q}”", "Opens the chat with this question", "↵", True)}'
                      f'<div class="pgh">Records</div>{row("account_balance", "HDFC home loan", f"Debt · {inr(1513257)} · EMI {inr(39390)} · Jul 2030")}'
                      f'{row("event", "HDFC EMI check-in", "Thu 5 Nov · due")}'
                      f'<div class="pgh">Do it in the chat</div>{row("payments", "Record an HDFC payment", "Starts the guided flow in the chat")}')
        else:
            groups = (f'<div class="pgh">Go to</div>{row("home", "Home", "", "⌘1", True)}{row("account_balance_wallet", "Assets", "", "⌘2")}{row("trending_up", "Projection", "", "⌘3")}{row("savings", "Budget", "", "⌘4")}'
                      f'<div class="pgh">Do it in the chat</div>{row("receipt_long", "Send a statement", "Starts the guided flow in the chat")}{row("payments", "Log money", "Starts the guided flow in the chat")}'
                      f'<div class="pgh">Settings</div>{row("visibility_off", "Privacy mode", "", "⇧⌘H")}{row("dark_mode", "Appearance", "System")}')
        return f'<div class="pal" role="dialog" aria-label="Command palette">{field}<div class="plist" role="listbox">{groups}</div><div class="pfoot"><span>↑↓ to move</span><span>↵ to open</span><span>⌘K anywhere</span></div></div>'
    if opt == "1c":
        groups = (f'<div class="pgh">Records</div>{row("account_balance", "HDFC home loan", f"Debt · {inr(1513257)}", "", True)}{row("event", "HDFC EMI check-in", "Thu 5 Nov")}'
                  f'<div class="pgh">Pages</div>{row("credit_card", "Debts")}') if query else (
                  f'<div class="pgh">Recent</div>{row("account_balance", "HDFC home loan", "Debt", "", True)}{row("trending_up", "Projection")}{row("savings", "Budget")}')
        return f'<div class="pal" role="dialog" aria-label="Search">{field.replace("Search, go to, or ask MyPaisa", "Search records and pages")}<div class="plist" role="listbox">{groups}</div><div class="pfoot"><span>Questions go to the chat, ⌘J</span></div></div>'
    return ""


CSS_G = CSS_HOME + r"""
.kbd{margin-left:auto;font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);background:var(--mp-surface-2);border-radius:6px;padding:2px 6px;flex:none}
.scrimw{position:absolute;inset:0;z-index:20;background:rgba(5,8,14,.36);display:flex;justify-content:center;align-items:flex-start;padding-top:120px}
.pal{width:640px;max-width:calc(100% - 48px);background:var(--mp-surface);border-radius:16px;box-shadow:0 0 0 1px var(--mp-line),0 24px 60px rgba(5,8,14,.28);overflow:hidden;display:flex;flex-direction:column}
.pfield{display:flex;align-items:center;gap:10px;min-height:56px;padding:0 16px;border-bottom:1px solid var(--mp-line);font:400 17px/22px var(--mp-font)}
.pfield .ph{flex:1;color:var(--mp-ink-2)}.pfield .txt{flex:1;color:var(--mp-ink)}
.pfield .ms{color:var(--mp-ink-2)}
.plist{padding:6px;display:flex;flex-direction:column;max-height:430px;overflow:hidden}
.pgh{font:600 13px/18px var(--mp-font);color:var(--mp-ink-2);padding:10px 10px 4px}
.prow{display:flex;align-items:center;gap:12px;min-height:44px;padding:6px 10px;border-radius:10px;box-sizing:border-box}
.prow .ms{color:var(--mp-accent)}
.prow.on{background:var(--mp-surface-2);box-shadow:inset 3px 0 0 transparent}
.pfoot{display:flex;gap:16px;padding:10px 16px;border-top:1px solid var(--mp-line);font:400 13px/18px var(--mp-font);color:var(--mp-ink-2)}
/* 1b: Cmd+K focuses the chat beside the page */
.xchat.focus .cfld{box-shadow:inset 0 0 0 2px var(--mp-focus)}
.sugg{display:flex;flex-direction:column;gap:2px;padding:6px;background:var(--mp-surface);border-radius:14px;box-shadow:0 0 0 1px var(--mp-line),var(--mp-shadow)}
"""


def board_g() -> str:
    SECTION_NAMES.clear()
    secs = []
    def desk(theme, w, overlay, cap, chat=MON26_CHAT, chat_cls=""):
        return browser(cap, theme, w, "dashboard.mypaisapp.com/", f'<div class="xshell">{side("Home")}{overview_main()}{chat_col(chat, extra_cls=chat_cls)}</div>{overlay}')
    fr = [desk("t-light", "w1440", f'<div class="scrimw">{palette("1a", "")}</div>', "Browser · 1a ⌘K, nothing typed · Desktop 1440 · Light"),
          desk("t-dark", "w1440", f'<div class="scrimw">{palette("1a", "hdfc")}</div>', "Browser · 1a typing “hdfc” · Desktop 1440 · Dark")]
    secs.append(section("1a", "1a", "One palette: go, find, or ask", "Recommended", "MA-301 · P1-7 · MA-229",
                        "⌘K opens one palette over any page. Empty, it lists the pages (with ⌘1 to ⌘4), the guided flows that start in the chat, and two settings. Typed, the first row is always “Ask MyPaisa: …” (Return sends it to the chat), then matching records and flows.",
                        fr, [("Why recommended:", "one key for everything a member does with a keyboard; the question path keeps the chat first, and nothing is created in the palette: a flow row opens the chat’s guided flow (Rule 4)."),
                             ("iPad:", "today ⌘K focuses the composer on iPad (§9.1). With this pick the iPad gets the same palette, whose first row is the composer’s question, so the key means one thing at both doors; recorded as an open question for Arun."),
                             ("Build:", "shadcn-svelte <code>Command</code> in a <code>Dialog</code> (already named in TECH_STACK), records from the search index (phase 8), Escape closes, focus returns to where it was, 44 px rows, the list read by screen readers as a listbox."),
                             ("Figures:", f"the HDFC home loan from household-v4.json: {inr(1513257)}, EMI {inr(39390)}, ends Jul 2030; its check-in on Thu 5 Nov.")]))
    sugg = (f'<div class="sugg"><div class="pgh">Go to</div><div class="prow on">{ms("credit_card", "ms-s")}<span class="mp-sub f1">Debts · HDFC home loan</span><span class="kbd">⇥</span></div>'
            f'<div class="prow">{ms("event", "ms-s")}<span class="mp-sub f1">HDFC EMI check-in · Thu 5 Nov</span></div></div>')
    chat_b = MON26_CHAT + sugg
    fr = [desk("t-light", "w1440", "", "Browser · 1b ⌘K focuses the chat; typing “hdfc” suggests places · Desktop 1440 · Light", chat=chat_b, chat_cls="focus").replace('<span class="ph">Ask MyPaisa</span>', '<span class="ph" style="color:var(--mp-ink)">hdfc</span>'),
          desk("t-dark", "w1440", "", "Browser · 1b · Desktop 1440 · Dark", chat=chat_b, chat_cls="focus").replace('<span class="ph">Ask MyPaisa</span>', '<span class="ph" style="color:var(--mp-ink)">hdfc</span>')]
    secs.append(section("1b", "1b", "⌘K is the chat", "Not recommended", "MA-301 · P1-7",
                        "As on iPad today, ⌘K puts the cursor in the chat beside the page; as you type, two or three places that match appear above the composer, Tab goes there, Return asks.",
                        fr, [("Strength:", "matches the iPad exactly; no new surface."),
                             ("Trade-off:", "below 1133 px the chat is a tab or a sheet, so ⌘K opens it first; going to a page through the chat composer is unexpected for a web user; no palette for settings.")]))
    fr = [desk("t-light", "w1440", f'<div class="scrimw">{palette("1c", "")}</div>', "Browser · 1c ⌘K search only, recent items · Desktop 1440 · Light"),
          desk("t-dark", "w1440", f'<div class="scrimw">{palette("1c", "hdfc")}</div>', "Browser · 1c typing “hdfc” · Desktop 1440 · Dark")]
    secs.append(section("1c", "1c", "Search only; questions go to the chat", "Not recommended", "MA-301 · P1-7",
                        "⌘K opens a search of records and pages only, with recent items when empty. Asking stays in the chat, on its own key (⌘J).",
                        fr, [("Strength:", "the simplest palette; one job."),
                             ("Trade-off:", "two keys to learn; ⌘K means something different than on iPad; a member who types a question into it gets no answer.")]))
    intro = intro_block([
        "TECH_STACK names a command palette (shadcn-svelte’s Command on bits-ui) but no board draws it (deep scan P1-7). These options draw ⌘K on the web at laptop width, over Home on Mon 26 Oct, with the chat beside the page.",
        "Every option keeps the chat first and creation in the chat: a palette row can open a guided flow in the chat, never a form."],
        '<span class="plan-k">MA-301</span><span>TECH_STACK.md (Look and components), ARCHITECTURE.md §9.1 (⌘K on iPad), §9.4; boards it would change: Web v4 · Shell and chat.</span><b>Options until Arun picks.</b><span>Illustrative figures from household-v4.json.</span>')
    return page("MA-301 · g · Command palette", CSS_G, intro, secs)


# ================================================================ the host page (step 3): options.html, published with root docs/design
ITEMS = [
    ("a", "a · Projection header", "Projection and Plans: ten controls above the answer",
     "P2-3. Three tabs, four horizons, two currencies and a switch sit in two rows above the Projection and the Plans tab on iPhone, and as tabs plus segments on the web.",
     [("1a", "One picker, one lens", True, "One segmented picker for the three views and one 44 pt lens, “20 yrs · £ GBP · Nominal”, that opens a single menu. The answer moves up a row; the lens still names the view.", "Changing the horizon takes two taps instead of one."),
      ("1b", "The title is the picker", False, "The view becomes the title’s menu, horizon chips sit under the fan, money is a corner button on the hero.", "A title menu is easy to miss; Plans and Budget forecast hide behind it; chips add weight to the navy hero."),
      ("1c", "One row of chips", False, "All six choices as chips in one row, three views then three menus.", "The row scrolls on iPhone and cuts Nominal; views and settings look alike.")]),
    ("b", "b · Statement Confirm", "The statement review: one card four screens tall",
     "P2-3. Board I2 on iPhone v4 · Budget draws October’s statements as one Confirm card with sources, two amber merchants, eleven category tiles and five recognised lines, Confirm at the very bottom.",
     [("1a", "Questions first, then a short Confirm", True, "Each uncertain merchant gets its own question card (the guided-flow pattern), then a compact Confirm with By category and Not spending folded. Confirm, Undo and Was X → Save are kept.", "Two more messages in the chat; §4.9’s “one review card” wording changes."),
      ("1b", "One card, folded", False, "Keeps one card: the total, Two to check open with Keep and Change, the rest folded.", "A member can Confirm past the questions; still taller than a screen with them open."),
      ("1c", "A short card, the review on a sheet", False, "A one-line card with Review; three steps on a partial sheet (a dialog on the web).", "A modal step outside the conversation; the sheet hides the chat.")]),
    ("c", "c · Desktop three panes", "Laptop widths 1133 to 1392 px: three panes squeeze the page",
     "P2-3. With the 248 px sidebar and the 356 px chat, the page falls to 529 to 788 px and splits into two narrow columns from 700 px.",
     [("1a", "The page decides its columns; the chat folds", True, "One column until the page itself is 760 px; the chat stays beside from 1133 px with a fold button to a 64 px rail, remembered per member.", "Between 1133 and 1363 px with the chat open the page is one long column."),
      ("1b", "The sidebar folds to a rail", False, "The sidebar becomes a 76 px icon rail below 1393 px.", "Icons without words for twelve sections; the web’s navigation changes with the window, the iPad’s does not."),
      ("1c", "The chat beside only from 1393 px", False, "Below 1393 px the chat is a drawer from a Chat button.", "Changes Arun’s width rule (MA-240) for the web only; an owner decision for every record.")]),
    ("d", "d · Flatter cards", "Cards inside cards and long all-caps overlines",
     "P2-2. About 340 boxes inside boxes and 53 overlines over 30 characters, drawn here on iPhone Home and the web’s Home with the same figures.",
     [("1a", "Hairlines, sentence-case labels", True, "One surface per card; rows and stats split by 1 px hairlines; the pulse sits on the hero; short sentence-case labels. No new token.", "Dense screens (the Admin center) need sub-headings instead of boxes."),
      ("1b", "Grouped lists, headers outside", False, "Below the hero, iOS grouped inset lists with section names above them.", "Reads as a settings page on the web; Monzo’s lifted warmth goes flat."),
      ("1c", "Open sections, no cards", False, "Only the hero stays a card; sections sit on the page between hairlines.", "Weaker at 25% brightness in dark; a large change from Warm ledger as picked.")]),
    ("e", "e · Web join", "/join/<token> in a browser",
     "P2-5. The invite page assumes the app: “open in the MyPaisa app” copy and dimmed Google and passkey buttons for someone who only uses a browser.",
     [("1a", "One page, two live buttons", True, "Who invited you, to which household, what a member can do; Continue with Apple and Continue with Google; a passkey offered right after joining; the used link drawn too.", "None of note; the expired link reuses the used-link layout."),
      ("1b", "Three short steps", False, "The invite, then how you sign in, then the passkey offer, with a progress bar.", "One more tap for everyone; a Continue that only turns the page."),
      ("1c", "The invite is the chat’s first message", False, "The join page is the web chat; the invite card carries the sign-in buttons.", "A chat that cannot be typed into before sign-in looks broken.")]),
    ("f", "f · Type and icons", "The type and icon stack",
     "P2-4. tokens.css loads Inter, Nunito and Material Symbols from Google Fonts through a render-blocking @import, and every icon, the app’s too, is a Material ligature.",
     [("1a", "Platform type, Lucide on the web", True, "SF Pro, SF Pro Rounded and SF Symbols in the app; on the web the system font, then self-hosted Inter and a small Nunito figures subset, with Lucide SVG icons.", "The web differs slightly on Windows and Android (Inter) from Apple (SF Pro)."),
      ("1b", "Inter everywhere", False, "One face at both doors, bundled in the app, square hero figures; icons as 1a.", "The app stops looking native; the rounded hero figures picked in MA-101 go."),
      ("1c", "Today’s look, self-hosted", False, "Keep Nunito and Material Symbols, self-hosted, at both doors.", "A ligature font still draws words when it fails; Material in the app goes against Apple’s guidelines.")]),
    ("g", "g · Command palette", "⌘K on the web desktop",
     "P1-7. TECH_STACK names a command palette, but no board draws it.",
     [("1a", "One palette: go, find, or ask", True, "⌘K opens one palette: pages, chat flows and settings when empty; typed, “Ask MyPaisa: …” first, then records and flows. Nothing is created in it.", "iPad’s ⌘K focuses the composer today; recorded as an open question."),
      ("1b", "⌘K is the chat", False, "As on iPad, ⌘K focuses the chat beside the page, which suggests places as you type.", "Below 1133 px the chat must open first; no palette for settings."),
      ("1c", "Search only", False, "⌘K searches records and pages; questions stay in the chat on ⌘J.", "Two keys; ⌘K means something else than on iPad.")]),
]


def options_html() -> str:
    def src(file: str, oid: str) -> str:
        from urllib.parse import quote
        return "reviews/MA-301/" + quote(file) + "?embed=" + oid
    files = {k[0]: k for k in BOARDS}
    secs, nav = [], []
    for key, file_stem, head, problem, opts in ITEMS:
        file = next(f for f in BOARDS if f.startswith(key + " ·"))
        nav.append(f'<a href="#{key}">{escape(key)} · {escape(file_stem.split(" · ", 1)[1])}</a>')
        tabs = "".join(
            f'<button type="button" role="tab" id="t-{key}-{oid}" aria-selected="{"true" if i == 0 else "false"}" data-src="{escape(src(file, oid))}" '
            f'data-panel="{key}" data-opt="{oid}">{oid} · {escape(name)}{" <span class=rec>Recommended</span>" if rec else ""}</button>'
            for i, (oid, name, rec, why, cost) in enumerate(opts))
        cards = "".join(
            f'<div class="opt{" on" if i == 0 else ""}" data-panel="{key}" data-opt="{oid}"><p class="why"><b>{oid} · {escape(name)}.</b> {escape(why)}</p>'
            f'<p class="cost"><b>Trade-off:</b> {escape(cost)}</p></div>' for i, (oid, name, rec, why, cost) in enumerate(opts))
        first = opts[0][0]
        secs.append(f"""<section class="item" id="{key}">
  <div class="ihead"><span class="ikey">{key}</span><div><h2>{escape(head)}</h2><p class="prob">{escape(problem)}</p></div></div>
  <div class="tabs" role="tablist" aria-label="Options for {escape(head)}">{tabs}</div>
  <div class="opts">{cards}</div>
  <div class="frame"><iframe id="f-{key}" title="{escape(file_stem)} options" loading="lazy" src="{escape(src(file, first))}"></iframe></div>
  <p class="open"><a id="o-{key}" href="{escape(src(file, first))}" target="_blank" rel="noopener">Open this option’s board on its own</a> · the whole canvas: <a href="{escape("reviews/MA-301/" + __import__("urllib.parse").parse.quote(file))}" target="_blank" rel="noopener">{escape(file)}</a></p>
</section>""")
    return f"""<title>MyPaisa Deep Scan Options</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: one reading column of items, each with its options as tabs over a framed board. Warm ledger tokens (MyPaisa DS v1). */
:root {{
  --bg: #F6F4F1; --surface: #FFFFFF; --fill: #F0EDE8; --line: #E4E0DA; --ink: #14171F; --ink2: #4E5462;
  --accent: #C2381F; --on-accent: #FFFFFF; --hero: #13213A; --hero-ink: #FFFFFF; --hero-ink2: #B7C2D6; --good: #1D7A3E; --good-bg: #E2F2E7; --focus: #2453C9;
  --ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
  --round: ui-rounded, "SF Pro Rounded", "Nunito", -apple-system, system-ui, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #0A0F18; --surface: #151C27; --fill: #1E2633; --line: #283141; --ink: #F3F5F8; --ink2: #C5CCD7;
  --accent: #FFAF9B; --on-accent: #1A0B06; --hero: #1A2944; --hero-ink: #FFFFFF; --hero-ink2: #B7C2D6; --good: #5BDB8B; --good-bg: #16301F; --focus: #8FB2FF; color-scheme: dark }} }}
:root[data-theme="dark"] {{
  --bg: #0A0F18; --surface: #151C27; --fill: #1E2633; --line: #283141; --ink: #F3F5F8; --ink2: #C5CCD7;
  --accent: #FFAF9B; --on-accent: #1A0B06; --hero: #1A2944; --hero-ink: #FFFFFF; --hero-ink2: #B7C2D6; --good: #5BDB8B; --good-bg: #16301F; --focus: #8FB2FF; color-scheme: dark }}
body {{ background: var(--bg); color: var(--ink); font: 16px/1.5 var(--ui); }}
.wrap {{ max-width: 1240px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; gap: 28px; }}
.top {{ background: var(--hero); color: var(--hero-ink); border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 12px; }}
.top .k {{ font: 600 13px/18px var(--mono); color: var(--hero-ink2); }}
.top h1 {{ margin: 0; font: 800 34px/40px var(--round); letter-spacing: -0.02em; text-wrap: balance; }}
.top p {{ margin: 0; max-width: 70ch; color: var(--hero-ink2); }}
.top q {{ color: var(--hero-ink); }}
.nav {{ display: flex; flex-wrap: wrap; gap: 8px; }}
.nav a {{ color: var(--hero-ink); background: rgba(255,255,255,.1); border-radius: 999px; padding: 10px 14px; text-decoration: none; font: 600 14px/20px var(--ui); }}
.nav a:focus-visible, .tabs button:focus-visible, .open a:focus-visible {{ outline: 3px solid var(--focus); outline-offset: 2px; }}
.item {{ display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 16px; }}
.ihead {{ display: flex; gap: 14px; align-items: flex-start; }}
.ikey {{ flex: none; width: 40px; height: 40px; border-radius: 12px; background: var(--hero); color: var(--hero-ink); display: grid; place-items: center; font: 800 20px/1 var(--round); }}
.ihead > div {{ min-width: 0; }}
h2 {{ margin: 0; font: 700 22px/28px var(--ui); letter-spacing: -0.015em; text-wrap: balance; }}
.prob {{ margin: 4px 0 0; color: var(--ink2); max-width: 75ch; }}
.tabs {{ display: flex; flex-wrap: wrap; gap: 8px; }}
.tabs button {{ min-height: 44px; padding: 0 14px; border-radius: 12px; border: 0; background: var(--surface); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line); font: 600 15px/20px var(--ui); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }}
.tabs button[aria-selected="true"] {{ background: var(--accent); color: var(--on-accent); box-shadow: none; }}
.rec {{ font: 700 12px/16px var(--ui); padding: 2px 8px; border-radius: 999px; background: var(--good-bg); color: var(--good); }}
.opts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }}
.opt {{ background: var(--surface); border-radius: 16px; padding: 12px 14px; box-shadow: inset 0 0 0 1px var(--line); min-width: 0; }}
.opt.on {{ box-shadow: inset 0 0 0 2px var(--accent); }}
.opt p {{ margin: 0; font-size: 15px; line-height: 21px; }}
.opt .cost {{ margin-top: 6px; color: var(--ink2); }}
.frame {{ border-radius: 16px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--line); background: var(--fill); }}
.frame iframe {{ display: block; width: 100%; height: min(980px, 88vh); border: 0; }}
.open {{ margin: 0; font-size: 14px; color: var(--ink2); }}
.open a {{ color: var(--accent); }}
.foot {{ color: var(--ink2); font-size: 14px; border-top: 1px solid var(--line); padding-top: 16px; }}
@media (max-width: 520px) {{ .top h1 {{ font-size: 28px; line-height: 34px; }} .frame iframe {{ height: 80vh; }} }}
</style>
<div class="wrap">
  <header class="top">
    <span class="k">MA-301 · design-first options round · Mon 2 Nov 2026</span>
    <h1>The deep scan’s redesign items, as options</h1>
    <p>Arun asked to <q>complete the tasks from antigravity for the UI WORK</q> and to <q>push them to claude artifact</q>. Seven items from the deep scan need a choice before anything is built. Each has two or three options, the recommended one first; pick one per item.</p>
    <p>Boards are drawn in MyPaisa DS v1 (Warm ledger) in light and dark, at the sizes each item covers, with every figure from the one illustrative household. They scroll sideways inside their frame at desktop sizes.</p>
    <nav class="nav" aria-label="Items">{"".join(nav)}</nav>
  </header>
  {"".join(secs)}
  <p class="foot">Nothing here is built. After the picks, the chosen boards move into ios-v1 and app-v1 and the trace marks MA-301 picked. Illustrative figures and names only.</p>
</div>
<script>
(function () {{
  document.querySelectorAll('.tabs button').forEach(function (b) {{
    b.addEventListener('click', function () {{
      var k = b.getAttribute('data-panel'), o = b.getAttribute('data-opt');
      document.querySelectorAll('.tabs button[data-panel="' + k + '"]').forEach(function (x) {{ x.setAttribute('aria-selected', x === b ? 'true' : 'false'); }});
      document.querySelectorAll('.opt[data-panel="' + k + '"]').forEach(function (x) {{ x.classList.toggle('on', x.getAttribute('data-opt') === o); }});
      var f = document.getElementById('f-' + k), a = document.getElementById('o-' + k);
      f.src = b.getAttribute('data-src'); a.href = b.getAttribute('data-src');
    }});
  }});
  var h = (location.hash || '').slice(1);
  if (h && document.getElementById(h)) document.getElementById(h).scrollIntoView();
}})();
</script>
"""


BOARDS = {
    "a · Projection header.dc.html": board_a,
    "b · Statement Confirm.dc.html": board_b,
    "c · Desktop three panes.dc.html": board_c,
    "d · Flatter cards.dc.html": board_d,
    "e · Web join.dc.html": board_e,
    "f · Type and icons.dc.html": board_f,
    "g · Command palette.dc.html": board_g,
}


def main() -> int:
    check = "--check" in sys.argv
    bad = 0
    for name, fn in BOARDS.items():
        html = fn()
        p = HERE / name
        if check:
            if not p.exists() or p.read_text() != html:
                print(f"stale: {name}")
                bad += 1
        else:
            p.write_text(html)
            print(f"wrote {name} ({len(html):,} bytes)")
    oh = options_html()
    op = HERE / "options.html"
    if check:
        if not op.exists() or op.read_text() != oh:
            print("stale: options.html")
            bad += 1
    else:
        op.write_text(oh)
        print(f"wrote options.html ({len(oh):,} bytes)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
