"""Shared canonical figure loader, CSS kit, device/browser shells and 1a cards for MA-279 consolidated v4 boards."""
from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HH = json.loads((ROOT / "docs/design/figures/household-v4.json").read_text())
FP = json.loads((ROOT / "docs/design/figures/future-plans-v4.json").read_text())
FC = json.loads((ROOT / "docs/design/figures/forecaster-v4.json").read_text())
EN = json.loads((ROOT / "docs/design/figures/engine-v5.json").read_text())
TI = json.loads((ROOT / "docs/design/figures/team-india-v5.json").read_text())

MINUS = "−"
LT, DK = "t-light", "t-dark"

FX_INR = float(HH["clock"]["fx"]["gbp_inr"])          # 112.50
FX_USD = float(TI["team"]["budget"]["usd_gbp"])       # 1.30
FX_EUR = 1.17                                         # Fri 23 Oct ECB cross-rate

AF = HH["totals_after_new_record"]
BF = HH["totals_before_new_record"]
BUD = HH["budget_oct"]
NQ = FC["nasdaq"]
BL = FC["balanced"]
TB = TI["team"]["budget"]

# Build-time figure & calendar assertions (Lessons 10, 13, 38, 39)
assert AF["own_gbp"] - AF["owe_gbp"] == AF["net_gbp"] == 444_951
assert AF["by_country_gbp"]["UK"] + AF["by_country_gbp"]["IN"] == AF["net_gbp"]
assert AF["by_member_gbp"]["arun"] + AF["by_member_gbp"]["asha"] == AF["net_gbp"]
assert round(AF["net_gbp"] * FX_INR) == AF["net_inr"] == 50_056_988
assert NQ["similar"]["n"] == 30 and len(NQ["similar"]["ends"]) == 30
assert BL["similar"]["n"] == 30
assert EN["nov6"]["balanced"]["stance"] == "ADD"
for (yr, mo, dy), wd in [
    ((2026, 10, 22), "Thu"),
    ((2026, 10, 23), "Fri"),
    ((2026, 10, 24), "Sat"),
    ((2026, 10, 25), "Sun"),
    ((2026, 10, 26), "Mon"),
    ((2026, 10, 27), "Tue"),
    ((2026, 11, 3), "Tue"),
    ((2026, 11, 6), "Fri"),
    ((2026, 11, 7), "Sat"),
]:
    assert _dt.date(yr, mo, dy).strftime("%a") == wd

NW_SERIES = [
    ("Thu 22 Oct", 439958),
    ("Fri 23 Oct", 440180),
    ("Sat 24 Oct", 440090),
    ("Sun 25 Oct", BF["net_gbp"]),
    ("Mon 26 Oct", AF["net_gbp"]),
]


def fmt_inr_grp(n: int) -> str:
    s = str(abs(n))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.append(head[-2:])
        head = head[:-2]
    if head:
        parts.append(head)
    return ",".join(reversed(parts)) + "," + tail


def money(gbp_val: float, ccy: str = "GBP", sign: bool = False) -> str:
    if ccy == "INR":
        v = round(gbp_val * FX_INR)
        body = f"₹{fmt_inr_grp(v)}"
    elif ccy == "USD":
        v = round(gbp_val * FX_USD)
        body = f"${abs(v):,}"
    elif ccy == "EUR":
        v = round(gbp_val * FX_EUR)
        body = f"€{abs(v):,}"
    else:
        v = round(gbp_val)
        body = f"£{abs(v):,}"
    if v < 0:
        return MINUS + body
    if sign and v > 0:
        return "+" + body
    return body


def pc(v: float, d: int = 0, plus: bool = True) -> str:
    s = f"{abs(v):.{d}f}%"
    return (MINUS if v < 0 else ("+" if plus and v > 0 else "")) + s


def mask(text: str, priv: bool, on_hero: bool = False) -> str:
    if not priv:
        return f'<span class="tnum">{text}</span>'
    # bullets in the mask's transparent ink: the canvas runtime drops a text node of only no-break spaces,
    # which left every mask 0 px tall and invisible
    pad = "•" * max(4, min(8, len(text)))
    cls = "mp-mask mp-mask-h" if on_hero else "mp-mask"
    return f'<span class="{cls}" role="img" aria-label="Hidden"><span aria-hidden="true">{pad}</span></span>'


def ymap(v: float, lo: float, hi: float, pad_t: float = 8.0, pad_b: float = 8.0) -> float:
    span = hi - lo or 1.0
    return round(pad_t + (hi - v) / span * (100.0 - pad_t - pad_b), 2)


def smooth_d(pts: list[tuple[float, float]]) -> str:
    n = len(pts)
    if n == 0:
        return ""
    if n == 1:
        return f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
    if n == 2:
        return f"M{pts[0][0]:.2f} {pts[0][1]:.2f} L{pts[1][0]:.2f} {pts[1][1]:.2f}"
    dx = [pts[i + 1][0] - pts[i][0] for i in range(n - 1)]
    dy = [pts[i + 1][1] - pts[i][1] for i in range(n - 1)]
    sec = [dy[i] / dx[i] if dx[i] != 0 else 0.0 for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[-1] = sec[0], sec[-1]
    for i in range(1, n - 1):
        m[i] = 0.0 if sec[i - 1] * sec[i] <= 0 else (sec[i - 1] + sec[i]) / 2.0
    for i in range(n - 1):
        if sec[i] == 0:
            m[i] = m[i + 1] = 0.0
        else:
            a, b = m[i] / sec[i], m[i + 1] / sec[i]
            h = (a * a + b * b) ** 0.5
            if h > 3.0:
                t = 3.0 / h
                m[i], m[i + 1] = t * a * sec[i], t * b * sec[i]
    cmds = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for i in range(n - 1):
        h = dx[i]
        c1x, c1y = pts[i][0] + h / 3.0, pts[i][1] + m[i] * h / 3.0
        c2x, c2y = pts[i + 1][0] - h / 3.0, pts[i + 1][1] - m[i + 1] * h / 3.0
        cmds.append(f"C{c1x:.2f} {c1y:.2f} {c2x:.2f} {c2y:.2f} {pts[i + 1][0]:.2f} {pts[i + 1][1]:.2f}")
    return " ".join(cmds)


def ccy_pill_bar(active: str = "GBP", hero: bool = False) -> str:
    items = [("GBP", "£ GBP"), ("INR", "₹ INR"), ("USD", "$ USD"), ("EUR", "€ EUR")]
    cls_wrap = "ccy-pills on-hero" if hero else "ccy-pills"
    btns = "".join(
        f'<button type="button" class="ccy-p{" on" if code == active else ""}" aria-pressed="{"true" if code == active else "false"}">{lbl}</button>'
        for code, lbl in items
    )
    return f'<div class="{cls_wrap}" role="group" aria-label="Display currency">{btns}</div>'


def seg_tablist(items: list[str], on: int = 0, label: str = "Scope") -> str:
    tabs = "".join(
        f'<button type="button" class="mp-seg-i segc{" on" if i == on else ""}" role="tab" aria-selected="{"true" if i == on else "false"}" tabindex="{"0" if i == on else "-1"}">{t}</button>'
        for i, t in enumerate(items)
    )
    return f'<div class="mp-seg" role="tablist" aria-label="{label}">{tabs}</div>'


def card_box(title: str, badge_html: str, inner: str, oncard: bool = False) -> str:
    oc = " oncard" if oncard else ""
    hd = f'<div class="ctl"><span class="mp-hl">{title}</span>{badge_html}</div>' if title else ""
    return f'<div class="mp-card{oc} cpad">{hd}{inner}</div>'


def kv_rows(rows: list[tuple[str, str, str]]) -> str:
    """List of (title, subtitle, right_html) rows inside .rlist."""
    items = []
    for ttl, sub, rht in rows:
        sub_h = f'<div class="mp-foot mp-ink2">{sub}</div>' if sub else ""
        r_h = f'<div class="rright">{rht}</div>' if rht else ""
        items.append(f'<div class="rrow"><div class="rtx"><div class="mp-sub mp-w6">{ttl}</div>{sub_h}</div>{r_h}</div>')
    return '<div class="rlist">' + "".join(items) + "</div>"


def hero_1a(ccy: str = "GBP", priv: bool = False, stale: bool = False, scope_idx: int = 0) -> str:
    net_v = mask(money(AF["net_gbp"], ccy), priv, on_hero=True)
    own_v = mask(money(AF["own_gbp"], ccy), priv, on_hero=True)
    owe_v = mask(money(AF["owe_gbp"], ccy), priv, on_hero=True)
    liq_v = mask(money(AF["liquid_gbp"], ccy), priv, on_hero=True)
    gain_v = mask(money(4993, ccy), priv, on_hero=True)
    lo, hi = 439200.0, 445600.0
    pts = [(round(4.0 + i / (len(NW_SERIES) - 1) * 92.0, 2), ymap(v, lo, hi, 12, 14)) for i, (_, v) in enumerate(NW_SERIES)]
    d_line = smooth_d(pts)
    d_area = f"{d_line} L{pts[-1][0]:.2f} 96 L{pts[0][0]:.2f} 96 Z"
    stale_b = '<span class="mp-chip chip-s prc-h">Prices: Fri 23 Oct close (weekend)</span>' if stale else ""
    return (
        '<div class="mp-hero hero">'
        f'{seg_tablist(["Household", "Me", "Asha"], on=scope_idx, label="Whose wealth")}'
        f'<div class="fx jb ac gap8 wrapr"><span class="mp-over mp-hero-2">Household net worth · Mon 26 Oct</span>{ccy_pill_bar(ccy, hero=True)}</div>'
        f'<div class="fx ac gap10 wrapr"><span class="mp-num-hero tnum">{net_v}</span>'
        f'<span class="mp-sub mp-w6 hup">▲ {gain_v} since Thu 22 Oct</span>{stale_b}</div>'
        '<div class="hpulse">'
        '<div class="fx jb ac gap8 wrapr"><span class="mp-cap mp-hero-2">1A MONZO PULSE · RECORDED LEDGER</span>'
        f'<span class="mp-cap mp-hero-2">{mask(money(439958, ccy) + " to " + money(444951, ccy), priv, on_hero=True)}</span></div>'
        '<div class="mp-chartbox hpulse-box" role="img" aria-label="Recorded household net worth from Thu 22 Oct to Mon 26 Oct">'
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
        '<line class="hgrid" x1="4" x2="96" y1="24" y2="24"></line><line class="hgrid" x1="4" x2="96" y1="78" y2="78"></line>'
        f'<path class="harea" d="{d_area}"></path><path class="hline" d="{d_line}"></path></svg>'
        f'<span class="mp-chartdot hdot-a" style="left:{pts[0][0]}%;top:{pts[0][1]}%"></span>'
        f'<span class="mp-chartdot hdot-a beacon" style="left:{pts[-1][0]}%;top:{pts[-1][1]}%"></span>'
        '<span class="mp-chartlbl al" style="left:94%;top:54%" aria-hidden="true">Oct 26</span></div>'
        '<div class="hpulse-ax"><span>Thu 22 Oct</span><span>Sat 24 Oct</span><span>Mon 26 Oct</span></div></div>'
        '<div class="hsplit3">'
        f'<div><span class="mp-cap mp-hero-2">Own</span><span class="mp-sub mp-w6">{own_v}</span></div>'
        f'<div><span class="mp-cap mp-hero-2">Owe · 36%</span><span class="mp-sub mp-w6">{owe_v}</span></div>'
        f'<div><span class="mp-cap mp-hero-2">Liquid cash</span><span class="mp-sub mp-w6">{liq_v}</span></div></div>'
        '<div class="rate mp-foot mp-hero-2"><span class="ms ms-s" aria-hidden="true">currency_exchange</span>'
        "<span>Fri 23 Oct ECB · £1 = ₹112.50 · $1.30 · €1.17 · figures from the engine</span></div></div>"
    )


def forecaster_1a_card(ccy: str = "GBP", priv: bool = False, uk_fund: bool = False) -> str:
    src = BL if uk_fund else NQ
    name = "Balanced (BlackRock MyMap 5)" if uk_fund else "iShares NASDAQ 100 UCITS ETF"
    data = NQ["candles"]
    fanp = src.get("fan") or NQ["fan"]
    lo, hi = -9.5, 15.5
    n_hist, n_fwd = len(data), len(fanp)
    span = n_hist + n_fwd
    gut, rgut = 9.0, 11.0
    xs = lambda i: round(gut + (i + 0.5) / span * (100.0 - gut - rgut), 2)  # noqa: E731
    x_today = round(gut + n_hist / span * (100.0 - gut - rgut), 2)
    svg = [
        f'<line class="fgrid" x1="{gut}" x2="{100 - rgut}" y1="{ymap(g, lo, hi, 4, 4)}" y2="{ymap(g, lo, hi, 4, 4)}"></line>'
        for g in (-5, 0, 5, 10)
    ]
    for a, b in (("p90", "p10"), ("p75", "p25")):
        top = [(x_today, ymap(0, lo, hi, 4, 4))] + [(xs(n_hist + i), ymap(f[a], lo, hi, 4, 4)) for i, f in enumerate(fanp)]
        bot = [(xs(n_hist + i), ymap(f[b], lo, hi, 4, 4)) for i, f in enumerate(fanp)][::-1] + [(x_today, ymap(0, lo, hi, 4, 4))]
        svg.append(f'<path class="fband" d="{smooth_d(top)} {smooth_d(bot).replace("M", "L", 1)} Z"></path>')
    mid = [(x_today, ymap(0, lo, hi, 4, 4))] + [(xs(n_hist + i), ymap(f["p50"], lo, hi, 4, 4)) for i, f in enumerate(fanp)]
    svg.append(f'<path class="fmid" d="{smooth_d(mid)}"></path>')
    svg.append(f'<line class="ftoday" x1="{x_today}" x2="{x_today}" y1="2" y2="98"></line>')
    for i, c in enumerate(data):
        cls = "up" if c["up"] else "dn"
        x = xs(i)
        yh, yl = ymap(c["h"], lo, hi, 4, 4), ymap(c["l"], lo, hi, 4, 4)
        y1, y2 = ymap(max(c["o"], c["c"]), lo, hi, 4, 4), ymap(min(c["o"], c["c"]), lo, hi, 4, 4)
        svg.append(f'<rect class="cw {cls}" x="{round(x - 0.13, 2)}" y="{yh}" width="0.26" height="{round(max(yl - yh, 0.7), 2)}"></rect>')
        svg.append(f'<rect class="cb {cls}" x="{round(x - 0.44, 2)}" y="{y1}" width="0.88" height="{max(round(y2 - y1, 2), 0.7)}" rx="0.28"></rect>')
    days = [c["day"] for c in data]
    p1, br, sup = days.index("Thu 1 Oct"), days.index("Wed 14 Oct"), days.index("Wed 5 Aug")
    svg.append(f'<line class="pneck" x1="{xs(p1 - 2)}" x2="{xs(br + 1)}" y1="{ymap(NQ["neckline"], lo, hi, 4, 4)}" y2="{ymap(NQ["neckline"], lo, hi, 4, 4)}"></line>')
    svg.append(f'<line class="psup" x1="{xs(sup)}" x2="{x_today}" y1="{ymap(NQ["support"], lo, hi, 4, 4)}" y2="{ymap(NQ["support"], lo, hi, 4, 4)}"></line>')
    ylbls = "".join(f'<span class="yl" style="top:{ymap(g, lo, hi, 4, 4)}%" data-mo="fade">{pc(g)}</span>' for g in (-5, 0, 5, 10))
    f_last = fanp[-1]
    flbls = (
        f'<span class="fl" style="top:{ymap(f_last["p90"], lo, hi, 4, 4)}%" data-mo="fade">{pc(f_last["p90"])}</span>'
        f'<span class="fl" style="top:{ymap(f_last["p10"], lo, hi, 4, 4)}%" data-mo="fade">{pc(f_last["p10"])}</span>'
        f'<span class="tdl" style="left:{x_today}%" data-mo="fade">Fri 23 Oct</span>'
    )
    ax = f'<span style="left:{xs(1)}%">Aug</span><span style="left:{xs(22)}%">Sep</span><span style="left:{xs(43)}%">Oct</span><span style="left:{xs(65)}%">Nov</span>'
    sim = src["similar"]
    h = src.get("headline") or NQ["headline"]
    val_txt = mask(money(22925 if uk_fund else NQ["value_gbp"], ccy), priv)
    up_pct = h.get("up", 58 if uk_fund else 52)
    return (
        '<div class="mp-card oncard cpad">'
        f'<div class="ctl"><span class="mp-hl">{name}</span><span class="mp-chip chip-s mp-pause">Forecaster in practice · wk 5 of 8</span></div>'
        f'<p class="pp mp-foot"><b>{up_pct}% chance of ending 4 weeks higher</b> (8 in 10 runs between {pc(h["lo"])} and {pc(h["hi"])}; fall &gt; 5% risk {h["fall5"]}% vs {h["fall5_usual"]}% usual). Holding value {val_txt}.</p>'
        '<div class="cstats">'
        f'<div class="cstat"><span class="mp-cap mp-ink2">SIMILAR DAYS</span><span class="mp-sub mp-w6 cstat-v">{sim["n"]} since 2015</span><span class="mp-cap mp-ink2">{sim["recovered"]} of {sim["n"]} higher</span></div>'
        f'<div class="cstat"><span class="mp-cap mp-ink2">8 IN 10 FAN</span><span class="mp-sub mp-w6 cstat-v">{pc(h["lo"])} … {pc(h["hi"])}</span><span class="mp-cap mp-ink2">conformal range</span></div>'
        '<div class="cstat"><span class="mp-cap mp-ink2">STANCE</span><span class="mp-sub mp-w6 cstat-v">Buy · 78%</span><span class="mp-cap mp-ink2">view, not advice</span></div></div>'
        f'<div class="mp-chartbox ch-164" role="img" aria-label="{name} 60-day candles with F8 patterns and 4-week conformal fan">'
        f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{"".join(svg)}</svg>{ylbls}{flbls}</div>'
        f'<div class="mp-chartaxis">{ax}</div>'
        '<div class="lgd"><span><i class="sw-up"></i>up</span><span><i class="sw-dn"></i>down</span>'
        '<span><i class="sw-band"></i>8 in 10 fan</span><span><i class="sw-pa"></i>F8 double top</span><span><i class="sw-pb"></i>F8 support −1%</span></div></div>'
    )


def pillars_card() -> str:
    rows = [
        ("Trend (200-day &amp; 50-day)", "+2 · For", 82, True),
        ("Momentum (RSI 54)", "+1 · For", 58, True),
        ("Macro &amp; rates", "+1 · For", 54, True),
        ("Concentration overlap", "−1 · Against", 44, False),
    ]
    bars = []
    for lbl, tag, w, pos in rows:
        fill = "var(--mp-pillar-for)" if pos else "var(--mp-pillar-against)"
        bars.append(
            f'<div><div class="fx jb ac gap8"><span class="mp-foot mp-w6">{lbl}</span><span class="mp-cap mp-ink2 tnum">{tag}</span></div>'
            f'<div class="mp-track mbar" role="img" aria-label="{lbl} {tag}"><span class="mp-track-clip"><span style="width:{w}%;background:{fill}"></span></span></div></div>'
        )
    return card_box("Technical pillars &amp; stance drivers", '<span class="mp-chip chip-s mp-add">Buy · 78%</span>', '<div class="mrows">' + "".join(bars) + "</div>")


BOARD_CSS = """
  html, body { margin: 0; background: #ECEAE6; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif; color: #14171F; }
  a:not([class]) { color: #C2381F; } a:not([class]):hover { color: #8F2915; }
  a.dv-tid:hover, a.plan-k:hover { color: #FFFFFF; }
  .dv-turn { padding: 44px 48px 28px; border-bottom: 1px solid rgba(0,0,0,.08); }
  .dv-thd { display: flex; align-items: baseline; gap: 12px; margin: 0 0 10px; flex-wrap: wrap; }
  .dv-tid { font: 600 11px/14px ui-monospace, Menlo, monospace; padding: 3px 8px; background: #1a1a1a; color: #fff; border-radius: 5px; text-decoration: none; }
  .dv-tname { font: 700 26px/32px -apple-system, "SF Pro Display", "Inter", system-ui, sans-serif; color: #14171F; letter-spacing: -0.02em; }
  .bd .dv-tname { font-size: 22px; line-height: 28px; }
  .dv-intro { max-width: 1120px; font: 15px/22px -apple-system, "SF Pro Text", "Inter", system-ui, sans-serif; color: #3D424D; margin: 0; text-wrap: pretty; }
  .plan { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; max-width: 1120px; box-sizing: border-box; margin: 14px 0 0; padding: 10px 14px; border-radius: 12px; background: #F9F8F6; border: 1px solid rgba(0,0,0,.1); font: 13px/18px -apple-system, system-ui, sans-serif; color: #3D424D; }
  .plan-k { font: 600 11px/14px ui-monospace, Menlo, monospace; padding: 4px 8px; border-radius: 5px; background: #13213A; color: #FFFFFF; text-decoration: none; }
  .idx { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .idx a { font: 600 13px/18px -apple-system, system-ui, sans-serif; color: #14171F; background: rgba(0,0,0,.06); border-radius: 999px; padding: 7px 13px; text-decoration: none; }
  .bd { display: flex; flex-direction: column; gap: 18px; padding: 40px 48px; border-bottom: 1px solid rgba(0,0,0,.06); }
  .bd-keys { font: 600 12px/16px ui-monospace, Menlo, monospace; color: #5A606C; }
  .bd-lead { max-width: 1120px; margin: 0; font: 15px/22px -apple-system, "SF Pro Text", system-ui, sans-serif; color: #3D424D; text-wrap: pretty; }
  .bd-row { display: flex; flex-wrap: wrap; gap: 44px; align-items: flex-start; }
  .bd-note { width: 300px; flex: none; display: flex; flex-direction: column; gap: 10px; font: 14px/20px -apple-system, "SF Pro Text", system-ui, sans-serif; color: #3D424D; text-wrap: pretty; padding-top: 6px; }
  .bd-note p { margin: 0; }
  .bd-note b { color: #14171F; }
  .bd-theme { font: 600 11px/14px ui-monospace, Menlo, monospace; color: #5A606C; margin: 0 0 12px; }
  .recb { font: 700 12px/16px -apple-system, system-ui, sans-serif; color: #FFFFFF; background: #13213A; padding: 3px 10px; border-radius: 999px; }
  .dv-col { display: flex; flex-direction: column; }

  .tnum { font-variant-numeric: tabular-nums; }
  .z1 { position: relative; z-index: 1; }
  .f1 { flex: 1; min-width: 0; }
  .rtx { flex: 1 1 176px; min-width: 0; }
  .pp { margin: 0; text-wrap: pretty; }
  .nowrap { white-space: nowrap; }
  .wrapr { flex-wrap: wrap; }
  .posr { position: relative; }
  .cpad { display: flex; flex-direction: column; gap: 11px; padding: 16px; box-sizing: border-box; }
  .ctl { display: flex; justify-content: space-between; align-items: baseline; gap: 6px 10px; flex-wrap: wrap; }
  .segc { display: grid; place-items: center; }
  .prc-h { color: var(--mp-hero-ink); background: var(--mp-hero-2); }
  .hup { color: var(--mp-hero-up); }
  .t-dark .mp-ink3:not(.mp-mask) { color: var(--mp-ink-2); }
  .mp .mp-mask { line-height: 1; vertical-align: -0.12em; }

  .ccy-pills { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 3px; border-radius: 999px; background: var(--mp-surface-2); }
  .ccy-pills.on-hero { background: var(--mp-hero-2); }
  .ccy-p { font: 600 12px/16px var(--mp-font); padding: 3px 8px; border-radius: 999px; color: var(--mp-ink-2); white-space: nowrap; position: relative; }
  .ccy-p::after { content: ""; position: absolute; inset: -11px -2px; }
  .ccy-pills.on-hero .ccy-p { color: var(--mp-hero-ink-2); }
  .ccy-p.on { background: var(--mp-surface); color: var(--mp-ink); }
  .ccy-pills.on-hero .ccy-p.on { background: var(--mp-hero); color: var(--mp-hero-ink); box-shadow: inset 0 0 0 1px var(--mp-coral); }

  .hero { display: flex; flex-direction: column; gap: 11px; }
  .rate { display: flex; align-items: flex-start; gap: 6px; padding-top: 10px; border-top: 1px solid var(--mp-hero-2); }
  .rate > span:last-child { flex: 1; min-width: 0; }
  .hpulse { background: var(--mp-hero-2); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
  .hpulse-box { height: 54px; }
  .hpulse-box > svg { width: 100%; height: 100%; display: block; }
  .hgrid { stroke: var(--mp-hero-ink-2); stroke-opacity: 0.24; stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
  .harea { fill: var(--mp-coral); fill-opacity: 0.24; }
  .hline { fill: none; stroke: var(--mp-coral); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .mp-chartdot.hdot-a { background: var(--mp-coral); box-shadow: 0 0 0 2px var(--mp-hero); }
  .mp-chartdot.beacon { box-shadow: 0 0 0 2px var(--mp-hero), 0 0 0 6px var(--mp-band); }
  .hpulse-ax { display: flex; justify-content: space-between; font: 500 12px/15px var(--mp-font); color: var(--mp-hero-ink-2); }
  .hsplit3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 8px; }
  .hsplit3 > div { background: var(--mp-hero-2); border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }

  .mrows { display: flex; flex-direction: column; gap: 10px; }
  .mbar { height: 10px; }
  .mbar > .mp-track-clip > span:first-child { display: block; height: 100%; border-radius: 999px; }
  .bartick { position: absolute; top: -2px; bottom: -2px; width: 2.5px; border-radius: 2px; background: var(--mp-ink); box-shadow: 0 0 0 1px var(--mp-surface); pointer-events: none; }
  .rlist { display: flex; flex-direction: column; gap: 8px; }
  .rrow { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 9px 11px; border-radius: 12px; background: var(--mp-surface-2); flex-wrap: wrap; }
  .rright { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; margin-left: auto; font-variant-numeric: tabular-nums; }
  .edit-inline { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: var(--mp-surface-2); box-shadow: inset 0 0 0 1.5px var(--mp-accent); }
  .note-box { display: flex; flex-direction: column; gap: 5px; padding: 10px 12px; border-radius: 12px; background: var(--mp-surface-2); box-shadow: inset 0 0 0 1px var(--mp-line); }
  .btn-save { font: 600 12px/16px var(--mp-font); padding: 7px 12px; min-height: 32px; display: inline-flex; align-items: center; border-radius: 999px; background: var(--mp-accent); color: var(--mp-on-accent); }
  .btn-ghost { font: 600 12px/16px var(--mp-font); padding: 7px 12px; min-height: 32px; display: inline-flex; align-items: center; border-radius: 999px; background: var(--mp-surface); color: var(--mp-ink); box-shadow: inset 0 0 0 1px var(--mp-line); }

  .cstats { display: grid; grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); gap: 8px; }
  .cstat { background: var(--mp-surface-2); border-radius: 11px; padding: 7px 9px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cstat-v { font-variant-numeric: tabular-nums; }
  .ch-164 { height: 164px; }
  .mp-chartbox > svg { width: 100%; height: 100%; display: block; }
  .fgrid { stroke: var(--mp-chart-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .fmid { fill: none; stroke: var(--mp-chart-line); stroke-width: 2; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
  .ftoday { stroke: var(--mp-ink-2); stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
  .cw.up, .cb.up { fill: var(--mp-up); }
  .cw.dn, .cb.dn { fill: var(--mp-down-quiet); }
  .pneck { stroke: var(--mp-chart-4); stroke-width: 1.8; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
  .psup { stroke: var(--mp-chart-2); stroke-width: 1.8; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
  .yl { position: absolute; left: 0; transform: translateY(-100%); padding-bottom: 1px; font: 500 12px/15px var(--mp-font); color: var(--mp-ink-2); white-space: nowrap; pointer-events: none; }
  .fl { position: absolute; right: 0; transform: translateY(-50%); font: 600 12px/15px var(--mp-font); color: var(--mp-ink); white-space: nowrap; pointer-events: none; }
  .tdl { position: absolute; bottom: 2px; transform: translateX(calc(-100% - 4px)); font: 500 12px/15px var(--mp-font); color: var(--mp-ink-2); white-space: nowrap; pointer-events: none; }
  .mp-chartaxis { margin-top: 4px; }
  .lgd { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font: 400 12px/16px var(--mp-font); color: var(--mp-ink-2); }
  .lgd > span { display: inline-flex; align-items: center; gap: 5px; }
  .lgd i { display: inline-block; flex: none; }
  .sw-band { width: 14px; height: 10px; border-radius: 3px; background: var(--mp-band); }
  .sw-up { width: 6px; height: 11px; border-radius: 1px; background: var(--mp-up); }
  .sw-dn { width: 6px; height: 11px; border-radius: 1px; background: var(--mp-down-quiet); }
  .sw-pa { width: 14px; height: 0; border-top: 2px dashed var(--mp-chart-4); }
  .sw-pb { width: 14px; height: 0; border-top: 2px dashed var(--mp-chart-2); }

  .lg > * { position: relative; z-index: 1; }
  .pg { display: flex; flex-direction: column; gap: 14px; padding: 4px 16px 130px; }
  .pg > *, .ipg > * { flex-shrink: 0; }
  .ipg { display: flex; flex-direction: column; gap: 14px; padding: 4px 18px 36px; }
  .g2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
  .scrn.srow { flex-direction: row; }
  .sidebar.sb { width: 240px; box-sizing: border-box; }
  .side-h.sh0 { padding-top: 4px; }
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .insp { width: 320px; flex: none; border-left: 1px solid var(--mp-line); background: var(--mp-bg); display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .largetitle.navt { padding: 0 4px; font-size: 28px; line-height: 34px; }
  .sbar.sbar-r { justify-content: flex-end; }
  .chfadet { position: absolute; left: 0; right: 0; top: 0; height: 140px; z-index: 10; pointer-events: none; background: linear-gradient(180deg, var(--mp-bg) 62%, color-mix(in srgb, var(--mp-bg) 0%, transparent)); }
  .ichat { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 150px; overflow: hidden; }
  .ichat .chat > * { flex: none; }
  .cb20 { bottom: 20px; }
  .gbtn.on { background: var(--mp-hero); color: var(--mp-hero-ink); }
  .tab { font-size: 12px; line-height: 14px; }
  .toptabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 16px; border-bottom: 1px solid var(--mp-line); background: var(--mp-surface); }
  .toptab { font: 600 12px/16px var(--mp-font); padding: 6px 11px; border-radius: 999px; color: var(--mp-ink-2); background: var(--mp-surface-2); position: relative; }
  .toptab::after { content: ""; position: absolute; inset: -8px -3px; }
  .toptab.on { background: var(--mp-hero); color: var(--mp-hero-ink); }
  .sheet-card { margin: 8px 0 0; padding: 14px; border-radius: 18px; background: var(--mp-surface); box-shadow: 0 -4px 24px rgba(0,0,0,.14), inset 0 0 0 1px var(--mp-line); display: flex; flex-direction: column; gap: 10px; }
  .sheet-grab { width: 36px; height: 4px; border-radius: 99px; background: var(--mp-ink-3); align-self: center; }
  @container screen (max-width: 1260px) { .mp.ipad .g2 { grid-template-columns: minmax(0, 1fr); } }
  @container screen (max-width: 1132px) { .mp.ipad .scrn.srow > .insp { display: none; } .mp.ipad .g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @container screen (max-width: 960px) { .mp.ipad .g2 { grid-template-columns: minmax(0, 1fr); } }
  @container screen (max-width: 799px) { .mp.ipad .scrn.srow > .sidebar { display: none; } }
  @container screen (max-width: 720px) { .fold-g2 { grid-template-columns: minmax(0, 1fr) !important; } }

  .bf { position: relative; overflow: hidden; flex: none; border-radius: 14px; box-shadow: 0 0 0 1px rgba(0,0,0,.12), 0 20px 50px rgba(0,0,0,.14); }
  .bf.w1440 { width: 1440px; height: 980px; }
  .bf.w1024 { width: 1024px; height: 820px; }
  .bf.w768 { width: 768px; height: 900px; }
  .bf.w390 { width: 390px; height: 844px; border-radius: 20px; box-shadow: 0 0 0 1px rgba(0,0,0,.14), 0 24px 52px rgba(0,0,0,.18); }
  .bf > .mp-shell { height: 100%; }
  .bf .mp-shell-main { overflow: hidden; position: relative; }
  .bf .mp-pagepad { flex: none; }
  .side { background: var(--mp-bg); border-right: 1px solid var(--mp-line); }
  .brand { padding: 4px 8px 18px; }
  .side-ft { padding: 0 12px 4px; }
  .mp-side-i { cursor: default; }
  .wtabs { position: absolute; left: 0; right: 0; bottom: 0; z-index: 30; }
  .mp-tab:not(.on) { color: var(--mp-ink-2); }
  .wtabs .mp-tab { font-size: 12px; line-height: 14px; }
  .iconbtn.on { background: var(--mp-hero); color: var(--mp-hero-ink); }
  .pstat { display: none; }
  .w390 .pstat { display: flex; position: absolute; left: 0; right: 0; top: 0; height: 34px; z-index: 40; align-items: center; justify-content: center; gap: 6px; padding: 0 16px; font: 500 12px/16px var(--mp-font); color: var(--mp-ink-2); background: var(--mp-surface-2); border-bottom: 1px solid var(--mp-line); }
  .w390 .mp-pagepad { padding-top: 48px; padding-bottom: 92px; }
  .chatcol { display: none; width: 356px; flex: none; flex-direction: column; border-left: 1px solid var(--mp-line); background: var(--mp-bg); position: relative; overflow: hidden; }
  @container app (min-width: 1133px) { .chatcol { display: flex; } }
  .askw { display: none; }
  @container app (min-width: 600px) and (max-width: 1132.98px) { .askw { display: grid; } }
  .chh { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 56px; padding: 8px 12px 8px 20px; border-bottom: 1px solid var(--mp-line); }
  .chl { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; padding: 12px 16px; overflow: hidden; }
  .chl > * { flex: none; }
  .daysep { align-self: center; font: 600 13px/18px var(--mp-font); color: var(--mp-ink-2); }
  .wme { align-self: flex-end; max-width: 84%; background: var(--mp-hero); color: var(--mp-hero-ink); border-radius: 20px 20px 6px 20px; padding: 10px 14px; font: 400 14px/20px var(--mp-font); }
  .wai { display: flex; gap: 10px; align-items: flex-start; }
  .amk { width: 28px; height: 28px; border-radius: 50%; background: var(--mp-hero); display: grid; place-items: center; flex: none; }
  .amk i { width: 11px; height: 11px; border-radius: 50%; background: var(--mp-coral); box-shadow: 0 0 0 3px var(--mp-hero), 0 0 0 4.5px var(--mp-coral); display: block; }
  .waib { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .wtext { font: 400 14px/20px var(--mp-font); color: var(--mp-ink); text-wrap: pretty; }
  .wcard { background: var(--mp-surface); border-radius: var(--mp-r-card); box-shadow: var(--mp-shadow); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
  .kvl { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; font: 400 13px/18px var(--mp-font); flex-wrap: wrap; }
  .kvl > :first-child { color: var(--mp-ink-2); }
  .kvl > :last-child { font-weight: 600; text-align: right; margin-left: auto; font-variant-numeric: tabular-nums; }
  .chcomp { display: flex; flex-direction: column; gap: 8px; padding: 10px 16px 14px; border-top: 1px solid var(--mp-line); }
  .wchips { display: flex; gap: 8px; flex-wrap: wrap; }
  .wchip { min-height: 34px; padding: 0 11px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; font: 600 13px/18px var(--mp-font); background: var(--mp-surface); color: var(--mp-ink); box-shadow: inset 0 0 0 1px var(--mp-line); position: relative; }
  .wchip::after { content: ""; position: absolute; inset: -5px 0; }
  .wchip .ms { font-size: 17px; color: var(--mp-accent); }
  .cfld { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 6px 0 14px; border-radius: 22px; background: var(--mp-surface); box-shadow: inset 0 0 0 1.5px var(--mp-ink-2); }
  .cfld .ph { flex: 1; font: 400 14px/19px var(--mp-font); color: var(--mp-ink-2); }
  .sendb { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--mp-accent); color: var(--mp-on-accent); flex: none; position: relative; }
  .sendb::after { content: ""; position: absolute; inset: -5px; }
  .sendb .ms { font-size: 19px; }
  .mpm { display: block; flex: none; }
  .mpm-coin { fill: var(--mp-hero); }
  .mpm-pound { fill: none; stroke: #FFFFFF; stroke-linecap: round; stroke-linejoin: round; }
  .mpm-dot { fill: var(--mp-coral); }
  .t-dark .mpm-coin { fill: var(--mp-hero-2); }

  .z80 { zoom: 0.8; }
  .dim { position: absolute; inset: 0; background: rgba(5, 8, 14, 0.36); z-index: 45; pointer-events: none; }
  .sysalert > * { position: relative; z-index: 1; }
  .sab { flex: 1; min-height: 44px; border-radius: 999px; display: grid; place-items: center; font: 600 15px/20px var(--mp-font); background: rgba(120, 120, 128, 0.18); color: var(--mp-ink); }
  .sab.iosb { background: var(--mp-accent); color: var(--mp-on-accent); }
  .c-alert { color: var(--mp-alert); }
  .xbtn { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: rgba(120, 120, 128, 0.18); color: var(--mp-ink); position: relative; flex: none; }
  .xbtn::after { content: ""; position: absolute; inset: -8px; }
  .sr-t { background: rgba(120, 120, 128, 0.12); }
  .meter { display: block; }

  .desk { position: absolute; inset: 0; background: linear-gradient(145deg, #1E293B, #0F172A); }
  .deskbar { color: #FFFFFF; position: relative; z-index: 2; }
  .smwin { position: absolute; left: 240px; top: 96px; width: 700px; height: 600px; z-index: 3; background: var(--mp-bg); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 24px 60px rgba(0, 0, 0, 0.5); }
  .wctl { position: absolute; left: 16px; top: 20px; display: flex; gap: 6px; z-index: 25; }
  .wctl > i { width: 12px; height: 12px; border-radius: 50%; display: block; background: var(--mp-ink-3); }
  .toptabs.ttwin { display: flex; flex-wrap: nowrap; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 14px 4px 92px; border-bottom: 0; background: transparent; position: relative; z-index: 20; }
  .ttabs { display: flex; gap: 2px; height: 52px; padding: 4px; border-radius: 999px; box-sizing: border-box; }
  .ttab { height: 44px; padding: 0 16px; border-radius: 999px; display: flex; align-items: center; font: 600 15px/20px var(--mp-font); color: var(--mp-ink); white-space: nowrap; position: relative; z-index: 1; }
  .ttab.on { background: var(--lg-lens); color: var(--mp-accent); }

  .ovl { position: absolute; inset: 0; z-index: 35; display: flex; align-items: center; justify-content: center; padding: 40px; background: rgba(5, 8, 14, 0.52); box-sizing: border-box; }
  .viewer { width: 100%; max-width: 1080px; height: 780px; display: grid; grid-template-columns: minmax(0, 1fr) 380px; border-radius: 20px; overflow: hidden; background: var(--mp-surface); box-shadow: 0 0 0 1px var(--mp-line), 0 28px 72px rgba(0, 0, 0, 0.34); }
  .vprev { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--mp-surface-2); }
  .vbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--mp-line); }
  .vgrp { display: flex; align-items: center; gap: 4px; }
  .vbtn { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--mp-surface); color: var(--mp-ink); box-shadow: inset 0 0 0 1px var(--mp-line); flex: none; }
  .vstage { flex: 1; display: grid; place-items: center; padding: 18px; min-height: 0; }
  .ph-page { width: min(100%, 320px); padding: 18px; border-radius: 12px; background: var(--mp-surface); box-shadow: inset 0 0 0 1px var(--mp-line); display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; }
  .vside { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px 20px; min-height: 0; overflow: hidden; border-left: 1px solid var(--mp-line); }

  .evt { display: grid; grid-template-columns: minmax(0, 1.3fr) 44px minmax(0, 1.4fr) 68px; column-gap: 12px; margin-top: 8px; }
  .tr { display: contents; }
  .eh { font: 600 12px/16px var(--mp-font); letter-spacing: 0.05em; text-transform: uppercase; color: var(--mp-ink-2); padding-bottom: 6px; display: flex; align-items: flex-end; }
  .eh.r, .ec.r { justify-content: flex-end; align-items: flex-end; text-align: right; }
  .ec { min-height: 40px; border-top: 1px solid var(--mp-line); display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px; padding: 5px 0; box-sizing: border-box; min-width: 0; }
  .wks { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  .wk { min-height: 32px; border-radius: 8px; display: grid; place-items: center; font: 600 12px/16px var(--mp-font); color: var(--mp-ink-2); background: var(--mp-surface-2); box-shadow: inset 0 0 0 1px var(--mp-line); white-space: nowrap; }
  .wk.on { color: var(--mp-hold); background: var(--mp-hold-bg); box-shadow: inset 0 0 0 1.5px var(--mp-hold); }
  .shell { position: relative; margin-top: 10px; }
  .shgrid { position: relative; height: 168px; }
  .shgrid > i { position: absolute; left: 0; right: 0; height: 1px; background: var(--mp-chart-grid); }
  .shgrid > i.zero { background: var(--mp-ink-3); }
  .shy { position: absolute; left: 6px; transform: translateY(-100%); margin-top: -2px; font: 500 12px/15px var(--mp-font); color: var(--mp-ink-2); }
  .shover { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
  .shover > div { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; max-width: 300px; padding: 10px 14px; border-radius: 12px; background: var(--mp-surface); box-shadow: inset 0 0 0 1px var(--mp-line); box-sizing: border-box; }
  :where(.mp button) { -webkit-appearance: none; appearance: none; margin: 0; padding: 0; border: 0; background: none; font: inherit; color: inherit; letter-spacing: inherit; text-transform: inherit; text-align: inherit; box-sizing: content-box; cursor: pointer; }
  :where(.mp input.ph) { -webkit-appearance: none; appearance: none; margin: 0; padding: 0; border: 0; background: transparent; font: inherit; color: var(--mp-ink); min-width: 0; width: 100%; outline: none; }
  .mp input.ph::placeholder { color: var(--mp-ink-2); opacity: 1; }
  .cfield > input.ph, .cfld > input.ph { align-self: stretch; }
  .mp input.ph:focus-visible { outline: 2px solid var(--mp-accent); outline-offset: 3px; border-radius: 6px; }
  .ccy-p:focus-visible, .toptab:focus-visible, .ttab:focus-visible, .btn-save:focus-visible, .btn-ghost:focus-visible, .wchip:focus-visible, .sendb:focus-visible, .xbtn:focus-visible, .vbtn:focus-visible, .sab:focus-visible, .hstrip:focus-visible { outline: 2px solid var(--mp-accent); outline-offset: 2px; }
  .sheet.asksheet { left: 0; right: 0; bottom: 24px; margin: 0 auto; width: min(560px, calc(100% - 32px)); max-height: 64%; box-sizing: border-box; overflow: hidden; border-radius: 28px; padding: 10px 18px 18px; gap: 12px; background: var(--mp-bg); box-shadow: var(--mp-shadow), 0 0 0 1px var(--mp-line); }
  .chat.askchat { padding: 0; }
  .sheet.homesheet { top: 200px; padding: 10px 14px 24px; gap: 12px; box-shadow: var(--mp-shadow); }
  .hstrip { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 8px 12px 8px 14px; box-sizing: border-box; border-radius: 16px; background: var(--mp-surface); box-shadow: var(--mp-shadow), inset 0 0 0 1px var(--mp-line); }
  .hstrip > .grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .hstrip > .ms { color: var(--mp-ink-2); font-size: 22px; }
  .dev.dev-ipad-p.dev-ipad-13p { width: 1032px; height: 1376px; }
"""


def mini(css: str) -> str:
    out = []
    for ln in css.strip().splitlines():
        s = ln.strip()
        if not s or s.startswith("/*"):
            continue
        s = re.sub(r"\s*([{};:,>])\s*", r"\1", s).replace(";}", "}")
        out.append(s)
    return "\n" + "\n".join(out) + "\n"


def doc_wrap(title: str, body: str, include_ios: bool = True) -> str:
    ios_link = '        <link rel="stylesheet" href="ios.css" />\n' if include_ios else ""
    motion_rule = "        .mp-chartlbl.al { transform: translate(-100%, -100%) !important; }\n"
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n'
        "  <head>\n"
        '    <meta charset="utf-8" />\n'
        '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        f"    <title>{title}</title>\n"
        '    <script src="./support.js"></script>\n'
        "  </head>\n"
        "  <body>\n"
        "    <x-dc>\n"
        "      <helmet data-dc-atomics>\n"
        '        <meta name="design_doc_mode" content="canvas" />\n'
        '        <link rel="stylesheet" href="tokens.css" />\n'
        f"{ios_link}"
        '        <link rel="stylesheet" href="motion.css" />\n'
        '        <script src="motion.js"></script>\n'
        f"        <style>{mini(BOARD_CSS)}{motion_rule}        </style>\n"
        "      </helmet>\n"
        f"{body}"
        "    </x-dc>\n"
        '    <script type="text/x-dc" data-dc-script data-props="{}">\n'
        "      class Component extends DCLogic { renderVals() { return {}; } }\n"
        "    </script>\n"
        "  </body>\n"
        "</html>\n"
    )


def intro_turn(tag: str, title: str, intro: str, keys_str: str, arch_str: str, links: list[tuple[str, str]]) -> str:
    plan_html = (
        f'<b>Jira</b><span class="plan-k">MA-279</span><span>{keys_str}</span>'
        f'<b>Spec</b><span>{arch_str}</span>'
        '<b>Picked</b><span>1a Unified Whole-Wealth Ledger &amp; Header 4-Currency Pill (31 Oct 2026) · 1a Chat first · 1a Monzo Pulse</span>'
    )
    nav = '<nav class="idx" aria-label="Boards">' + "".join(f'<a href="#{a}">{t}</a>' for a, t in links) + "</nav>"
    return (
        f'      <section class="dv-turn" id="intro" data-screen-label="{title}: intro">\n'
        f'        <div class="dv-thd"><a class="dv-tid" href="#intro">{tag}</a><span class="dv-tname">{title}</span></div>\n'
        f'        <p class="dv-intro">{intro}</p>\n'
        f'        <div class="plan">{plan_html}</div>\n'
        f"        {nav}\n"
        "      </section>\n"
    )


def board_section(num: str, name: str, keys: str, lead: str, frames: list[str], notes: list[tuple[str, str]], anchor: str = "") -> str:
    nt = "".join(f"<p><b>{a}</b> {b}</p>" for a, b in notes)
    aid = anchor or f"b{num}"
    return (
        f'      <section class="bd" id="{aid}" data-screen-label="{num} · {name}">\n'
        f'        <div class="dv-thd"><span class="dv-tid">{num}</span><span class="dv-tname">{name}</span><span class="recb">1a Picked · v4</span><span class="bd-keys">{keys}</span></div>\n'
        f'        <p class="bd-lead">{lead}</p>\n'
        '        <div class="bd-row">\n'
        + "\n".join("          " + f for f in frames)
        + f'\n          <div class="bd-note">{nt}</div>\n'
        "        </div>\n"
        "      </section>\n"
    )


SB_ICONS = '<span class="sbar-ic"><span class="ms" aria-hidden="true">signal_cellular_alt</span><span class="ms" aria-hidden="true">wifi</span><span class="ms" aria-hidden="true">battery_horiz_075</span></span>'
IOS_TABS = [("chat_bubble", "Chat"), ("home", "Home"), ("insights", "Activity"), ("account_circle", "You")]
IOS_SIDE = [("chat_bubble", "Chat"), ("home", "Home"), ("list_alt", "Register"), ("savings", "Budget"), ("trending_up", "Forecast"), ("history", "Audit"), ("admin_panel_settings", "Admin")]
WEB_NAV = [("home", "Overview"), ("list_alt", "Register"), ("savings", "Budget"), ("candlestick_chart", "Forecast"), ("fact_check", "Audit & Files"), ("admin_panel_settings", "Admin")]
STAGE_TABS = ("Chat", "Home", "Holdings", "Activity", "Audit")
WEB_TABS = [("chat_bubble", "Chat"), ("home", "Overview"), ("list_alt", "Register"), ("candlestick_chart", "Forecast"), ("menu", "More")]


def _tab_attrs(on: bool) -> str:
    """A tab in a role=tablist: the selected one takes the focus (roving tabindex), the arrow keys move it."""
    return f'role="tab" aria-selected="{"true" if on else "false"}" tabindex="{"0" if on else "-1"}"'


def privacy_btn(priv: bool = False) -> str:
    eye = "visibility_off" if priv else "visibility"
    cls = "gbtn lg on" if priv else "gbtn lg"
    return f'<button type="button" class="{cls}" aria-label="Privacy mode" aria-pressed="{"true" if priv else "false"}"><span class="ms z1" aria-hidden="true">{eye}</span></button>'


CUR = ' aria-current="page"'
ASK_BTN = '<button type="button" class="gtext lg" aria-haspopup="dialog"><span class="ms z1" aria-hidden="true">chat_bubble</span><span class="z1">Ask</span></button>'


def composer_bar(placeholder: str = "Ask MyPaisa") -> str:
    return (
        '<div class="cbar"><button type="button" class="cplus lg" aria-label="Attach"><span class="ms z1" aria-hidden="true">add</span></button>'
        f'<span class="cfield lg"><input class="ph" type="text" placeholder="{placeholder}" aria-label="{placeholder}" />'
        '<button type="button" class="csend mp-ink2 z1" aria-label="Dictate"><span class="ms" aria-hidden="true">mic</span></button></span></div>'
    )


def ask_sheet(q: str, a: str, label: str = "Ask MyPaisa") -> str:
    """The chat as a sheet (a sheet away from about 600 to 1133 pt): solid, never glass, one sheet at a time."""
    return (
        '<div class="dim"></div>'
        f'<div class="sheet asksheet" role="dialog" aria-modal="true" aria-label="{label}">'
        '<span class="sheet-grab" aria-hidden="true"></span>'
        f'<div class="sheet-h"><span class="mp-hl">{label}</span><button type="button" class="xbtn" aria-label="Close"><span class="ms" aria-hidden="true">close</span></button></div>'
        f'<div class="chat askchat"><div class="daysep">Mon 26 Oct</div><div class="me">{q}</div>'
        f'<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="ai-text">{a}</div></div></div></div>'
        f"{composer_bar()}</div>"
    )


def ios_tabdock(on: str = "Home") -> str:
    tabs = "".join(
        f'<button type="button" class="tab{" on" if l == on else ""}" {_tab_attrs(l == on)}><span class="ms" aria-hidden="true">{i}</span>{l}</button>'
        for i, l in IOS_TABS
    )
    return f'<div class="edge-bot"></div><nav class="tabdock" aria-label="Primary"><div class="tabs lg" role="tablist">{tabs}</div><button type="button" class="tabsearch lg" aria-label="Search"><span class="ms z1" aria-hidden="true">search</span></button></nav><div class="homebar"></div>'


def iphone_frame(cap: str, theme: str, body: str, title: str = "Home", tab: str = "Home", priv: bool = False, dev_cls: str = "dev-iphone", overlay: str = "") -> str:
    nav = f'<header class="nav"><span></span><span class="fx gap8">{privacy_btn(priv)}{ASK_BTN}</span></header>'
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="dev {dev_cls} mp {theme}"><div class="island"></div><div class="scrn">'
        f'<div class="sbar"><span>9:41</span>{SB_ICONS}</div>{nav}'
        f'<div class="largetitle">{title}</div>'
        f'<main class="scroll"><div class="pg">{body}</div></main>{ios_tabdock(tab)}{overlay}</div></div></div>'
    )


def stage_manager_frame(cap: str, theme: str, body: str) -> str:
    tabs = "".join(
        f'<button type="button" class="ttab{" on" if t == "Home" else ""}" {_tab_attrs(t == "Home")}>{t}</button>'
        for t in STAGE_TABS
    )
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="dev dev-ipad-l mp ipad {theme}">'
        '<div class="desk"></div>'
        f'<div class="sbar deskbar"><span>9:41 Mon 26 Oct</span><span class="sbar-ic"><span class="ms" aria-hidden="true">wifi</span><span class="ms" aria-hidden="true">battery_horiz_075</span></span></div>'
        f'<div class="dev dev-window mp smwin {theme}">'
        '<div class="wctl"><i class="w-r"></i><i class="w-y"></i><i class="w-g"></i></div>'
        f'<div class="toptabs ttwin"><button type="button" class="gbtn lg" aria-label="Sidebar"><span class="ms z1" aria-hidden="true">view_sidebar</span></button>'
        f'<div class="ttabs lg" role="tablist" aria-label="Sections">{tabs}</div>'
        '<button type="button" class="gbtn lg" aria-label="Search"><span class="ms z1" aria-hidden="true">search</span></button></div>'
        f'<header class="nav"><span class="largetitle navt">Home</span><span class="fx gap8">{privacy_btn()}{ASK_BTN}</span></header>'
        f'<main class="scroll"><div class="ipg">{body}</div></main>'
        "</div></div></div>"
    )


def ipad_frame(cap: str, theme: str, left_col: str, right_col: str, hero: str = "", title: str = "Home", side_on: str = "Home", chat_msg: tuple[str, str] = ("Check our whole-wealth ledger and Balanced's Buy stance.", "Household net worth is £444,951 (₹5,00,56,988). Balanced shows Buy (78%); new records are created here with Confirm."), dev_cls: str = "dev-ipad-l", overlay: str = "") -> str:
    side = "".join(
        f'<button type="button" class="side-i{" on" if l == side_on else ""}"{CUR if l == side_on else ""}><span class="ms" aria-hidden="true">{i}</span>{l}</button>'
        for i, l in IOS_SIDE
    )
    chat = (
        '<aside class="insp" aria-label="Chat"><div class="sbar sbar-r"><span class="sbar-ic"><span class="ms" aria-hidden="true">wifi</span><span class="ms" aria-hidden="true">battery_horiz_075</span></span></div>'
        '<div class="nav"><span class="mp-hl">Chat</span><button type="button" class="gbtn lg" aria-label="New conversation"><span class="ms z1" aria-hidden="true">edit_square</span></button></div>'
        '<div class="chfadet"></div>'
        f'<div class="ichat"><div class="chat"><div class="daysep">Mon 26 Oct</div><div class="me">{chat_msg[0]}</div>'
        f'<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="ai-text">{chat_msg[1]}</div></div></div></div></div>'
        '<div class="edge-bot"></div>'
        '<div class="composer cb20"><div class="chips"><button type="button" class="gchip lg"><span class="ms" aria-hidden="true">receipt_long</span><span>Log transaction</span></button><button type="button" class="gchip lg"><span class="ms" aria-hidden="true">currency_exchange</span><span>Currency check</span></button></div>'
        f"{composer_bar()}</div></aside>"
    )
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="dev {dev_cls} mp ipad {theme}"><div class="scrn srow">'
        f'<nav class="sidebar sb lg" aria-label="Sections"><div class="side-h sh0">MyPaisa</div>{side}<div class="side-h">Household</div><button type="button" class="side-i"><span class="ms" aria-hidden="true">account_circle</span>You</button></nav>'
        f'<main class="main"><div class="sbar"><span>9:41 Mon 26 Oct</span><span></span></div>'
        f'<div class="nav"><span class="largetitle navt">{title}</span><span class="fx gap8">{privacy_btn()}{ASK_BTN}</span></div>'
        f'<div class="scroll"><div class="ipg">{hero}<div class="g2"><div class="dv-col" style="gap:14px">{left_col}</div><div class="dv-col" style="gap:14px">{right_col}</div></div></div></div>'
        f'<div class="edge-bot"></div></main>{chat}{overlay}</div></div></div>'
    )


def fold_or_portrait_frame(cap: str, theme: str, dev_cls: str, body: str, title: str = "Home", active_tab: str = "Home", overlay: str = "") -> str:
    top_tabs = "".join(
        f'<button type="button" class="toptab{" on" if t == active_tab else ""}" {_tab_attrs(t == active_tab)}>{t}</button>'
        for t in ("Home", "Register", "Budget", "Forecast", "Audit", "Admin", "You")
    )
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="dev {dev_cls} mp {theme}"><div class="scrn">'
        f'<div class="sbar"><span>9:41 Mon 26 Oct</span>{SB_ICONS}</div>'
        f'<nav class="toptabs" role="tablist" aria-label="Sections">{top_tabs}</nav>'
        f'<header class="nav"><span class="largetitle navt">{title}</span><span class="fx gap8">{privacy_btn()}{ASK_BTN}</span></header>'
        f'<main class="scroll"><div class="ipg">{body}</div></main><div class="homebar"></div>{overlay}</div></div></div>'
    )


def browser_frame(
    cap: str,
    theme: str,
    width_cls: str,
    hero: str,
    col1: str,
    col2: str,
    title: str = "Whole-wealth Overview",
    nav_on: str = "Overview",
    ccy: str = "GBP",
    priv: bool = False,
    chat_q: str = "Show our whole-wealth register, India folios and NASDAQ 4-week forecast.",
    chat_a: str = "",
    overlay: str = "",
) -> str:
    side_items = "".join(
        f'<button type="button" class="mp-side-i{" on" if lb == nav_on else ""}"{CUR if lb == nav_on else ""}><span class="ms{" ms-fill" if lb == nav_on else ""}" aria-hidden="true">{ic}</span>{lb}</button>'
        for ic, lb in WEB_NAV
    )
    tab_on = nav_on if nav_on in ("Overview", "Register", "Forecast") else "More"
    tabs = "".join(
        f'<button type="button" class="mp-tab{" on" if lb == tab_on else ""}" {_tab_attrs(lb == tab_on)}><span class="ms{" ms-fill" if lb == tab_on else ""}" aria-hidden="true">{ic}</span>{lb}</button>'
        for ic, lb in WEB_TABS
    )
    eye = "visibility_off" if priv else "visibility"
    eye_cls = "iconbtn on" if priv else "iconbtn"
    nw_chat = mask(money(AF["net_gbp"], ccy), priv)
    ans = chat_a or f"Recorded net worth is {nw_chat} across UK and India. Balanced shows Buy (78%); NASDAQ 100 ETF sits on 30 similar days since 2015 (18 of 30 higher)."
    mark_svg = (
        '<svg class="mpm" width="32" height="32" viewBox="0 0 48 48" aria-hidden="true">'
        '<path class="mpm-coin" d="M40.65 16.71 A19.5 19.5 0 1 1 31.29 7.35 A6.8 6.8 0 0 0 40.65 16.71 Z"></path>'
        '<g class="mpm-pound" stroke-width="3.84"><path d="M27.96 20.65 C27.65 18.1 25.98 16.55 23.74 16.55 C21.2 16.55 19.53 18.35 19.53 20.89 L19.53 28.83 C19.53 30.75 18.85 31.99 17.3 33.05"></path>'
        '<path d="M17.3 33.05 L29.2 33.05"></path><path d="M16.8 25.73 L24.86 25.73"></path></g>'
        '<circle class="mpm-dot" cx="37.07" cy="10.93" r="5.4"></circle></svg>'
    )
    chat = (
        '<aside class="chatcol" aria-label="Chat">'
        '<div class="chh"><span class="mp-hl">Chat</span><button type="button" class="iconbtn" aria-label="New conversation"><span class="ms" aria-hidden="true">edit_square</span></button></div>'
        '<div class="chl"><div class="daysep">Mon 26 Oct</div>'
        f'<div class="wme">{chat_q}</div>'
        f'<div class="wai"><div class="amk"><i></i></div><div class="waib"><div class="wtext">{ans}</div>'
        '<div class="wcard"><span class="mp-over mp-ink2">Consolidated v4 ledger · Mon 26 Oct</span>'
        f'<div class="kvl"><span>Net worth ({ccy})</span><span>{nw_chat}</span></div>'
        '<div class="kvl"><span>Balanced stance</span><span>Buy · 78%</span></div>'
        '<div class="kvl"><span>NASDAQ similar days</span><span>30 since 2015</span></div></div></div></div></div>'
        '<div class="chcomp">'
        '<div class="wchips"><button type="button" class="wchip"><span class="ms" aria-hidden="true">receipt_long</span>Log buy</button><button type="button" class="wchip"><span class="ms" aria-hidden="true">currency_exchange</span>FX check</button></div>'
        '<div class="cfld"><input class="ph" type="text" placeholder="Ask MyPaisa or start a guided flow" aria-label="Ask MyPaisa or start a guided flow" /><button type="button" class="sendb" aria-label="Send"><span class="ms" aria-hidden="true">arrow_upward</span></button></div></div></aside>'
    )
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="bf {width_cls} mp mp-app {theme}" data-mo-frame-root="1">'
        '<div class="pstat" aria-hidden="true"><span class="ms ms-s" aria-hidden="true">lock</span><span>dashboard.mypaisapp.com</span></div>'
        '<div class="mp-shell">'
        f'<nav class="mp-side mp-shell-side side" aria-label="MyPaisa"><div class="fx ac gap12 brand">{mark_svg}<span class="mp-hl">MyPaisa</span></div>{side_items}<div style="flex:1"></div><div class="mp-foot mp-ink2 side-ft">Arun · owner<br />dashboard.mypaisapp.com</div></nav>'
        '<main class="mp-shell-main"><div class="mp-pagepad">'
        f'<header class="mp-pagehead"><div><div class="mp-large">{title}</div><div class="mp-foot mp-ink2">Mon 26 Oct 2026 · Fri 23 Oct ECB · £1 = ₹112.50 · $1.30 · €1.17</div></div>'
        f'<div class="fx ac gap8 wrapr">{ccy_pill_bar(ccy, hero=False)}'
        '<button type="button" class="iconbtn askw" aria-label="Open the chat" aria-haspopup="dialog"><span class="ms" aria-hidden="true">chat_bubble</span></button>'
        f'<button type="button" class="{eye_cls}" aria-label="Privacy mode" aria-pressed="{"true" if priv else "false"}"><span class="ms" aria-hidden="true">{eye}</span></button></div></header>'
        f'{hero}<div class="mp-cols"><div class="mp-col">{col1}</div><div class="mp-col">{col2}</div></div>'
        f"</div></main>{chat}</div>"
        f'<nav class="mp-tabbar mp-shell-tabs wtabs" role="tablist" aria-label="Sections">{tabs}</nav>{overlay}</div></div>'
    )
