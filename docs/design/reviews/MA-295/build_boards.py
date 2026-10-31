"""Draw the dashboard & app chart redesign option boards (MA-295) from the canonical v4 figure sets.

Builds three self-contained canvases in docs/design/ from one source of truth (Lesson 13):
  1. docs/design/ds-v1/Chart options.dc.html                DS v1 chart kit comparison (1a, 1b, 1c in Light & Dark + iPhone frames)
  2. docs/design/ios-v1/iPhone v4 · Chart options.dc.html   iOS v1 options (1a, 1b, 1c on iPhone & iPad) + 1a states
  3. docs/design/app-v1/Web v4 · Chart options.dc.html      Web v4 options (1a, 1b, 1c at 1440 & 390) + 1a states

Run:
  python3 docs/design/reviews/MA-295/build_boards.py          (writes all three canvases)
  python3 docs/design/reviews/MA-295/build_boards.py --check  (exits 1 if any canvas differs from the build)
"""
from __future__ import annotations

import html as _html
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HH = json.loads((ROOT / "docs/design/figures/household-v4.json").read_text())
FP = json.loads((ROOT / "docs/design/figures/future-plans-v4.json").read_text())
FC = json.loads((ROOT / "docs/design/figures/forecaster-v4.json").read_text())

MINUS = "−"
LT, DK = "t-light", "t-dark"

# Canonical ledger trajectory from Thu 22 Oct to Mon 26 Oct 09:41 (household-v4.json)
NW_SERIES = [
    ("Thu 22 Oct", 439958, "recorded"),
    ("Fri 23 Oct", 440180, "Fri close"),
    ("Sat 24 Oct", 440090, "weekend FX"),
    ("Sun 25 Oct", HH["totals_before_new_record"]["net_gbp"], "before savings"),
    ("Mon 26 Oct", HH["totals_after_new_record"]["net_gbp"], "+£5,000 Monzo"),
]
AF = HH["totals_after_new_record"]
BUD = HH["budget_oct"]
FAN20 = [r for r in FP["R26"]["fan"] if r["year"] <= 2046]
SURP_R1 = [r for r in FP["forecast"]["R1"]["years"] if 2027 <= r["year"] <= 2046]
SURP_R4 = [r for r in FP["forecast"]["R4"]["years"] if 2027 <= r["year"] <= 2046]
NQ = FC["nasdaq"]


def gbp(n: float, sign: bool = False) -> str:
    v = round(n)
    s = f"£{abs(v):,}"
    if v < 0:
        return MINUS + s
    if sign and v > 0:
        return "+" + s
    return s


def gbp_m(n: float) -> str:
    return f"£{n / 1_000_000:.2f}m"


def pc(v: float, d: int = 0, plus: bool = True) -> str:
    s = f"{abs(v):.{d}f}%"
    return (MINUS if v < 0 else ("+" if plus and v > 0 else "")) + s


def mask(text: str, priv: bool) -> str:
    if not priv:
        return text
    pad = "\u00a0" * max(4, min(8, len(text)))
    return f'<span class="mp-mask" role="img" aria-label="hidden"><span aria-hidden="true">{pad}</span></span>'


def ymap(v: float, lo: float, hi: float, pad_t: float = 8.0, pad_b: float = 8.0) -> float:
    span = hi - lo or 1.0
    return round(pad_t + (hi - v) / span * (100.0 - pad_t - pad_b), 2)


def smooth_d(pts: list[tuple[float, float]]) -> str:
    """Fritsch-Carlson monotone cubic Hermite spline path in SVG viewBox coordinates."""
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
    m[0] = sec[0]
    m[-1] = sec[-1]
    for i in range(1, n - 1):
        if sec[i - 1] * sec[i] <= 0:
            m[i] = 0.0
        else:
            m[i] = (sec[i - 1] + sec[i]) / 2.0
    for i in range(n - 1):
        if sec[i] == 0:
            m[i] = 0.0
            m[i + 1] = 0.0
        else:
            a = m[i] / sec[i]
            b = m[i + 1] / sec[i]
            h = math.hypot(a, b)
            if h > 3.0:
                t = 3.0 / h
                m[i] = t * a * sec[i]
                m[i + 1] = t * b * sec[i]
    cmds = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for i in range(n - 1):
        h = dx[i] / 3.0
        c1x, c1y = pts[i][0] + h, pts[i][1] + m[i] * h
        c2x, c2y = pts[i + 1][0] - h, pts[i + 1][1] - m[i + 1] * h
        cmds.append(f"C{c1x:.2f} {c1y:.2f},{c2x:.2f} {c2y:.2f},{pts[i + 1][0]:.2f} {pts[i + 1][1]:.2f}")
    return " ".join(cmds)


def scrub_attr(points: list[dict], priv: bool = False) -> str:
    if priv:
        return ""
    raw = _html.escape(json.dumps(points, separators=(",", ":")), quote=True)
    return f' data-scrub="{raw}" tabindex="0"'


def scrub_overlay() -> str:
    return (
        '<div class="mp5-scrub" aria-hidden="true">'
        '<span class="mp5-scrub-line"></span>'
        '<span class="mp5-scrub-dot"></span>'
        '<span class="mp5-scrub-pill"></span>'
        "</div>"
    )


# ------------------------------------------------------------------ 6 chart builders across modes a, b, c
def hero_block(mode: str, priv: bool = False, compact: bool = False) -> str:
    """Home navy hero with recorded 5-day ledger trajectory (1a spline, 1b editorial rule, 1c proportional bars)."""
    fig = mask(gbp(AF["net_gbp"]), priv)
    gain = mask("+£4,993", priv)
    own_v = mask(gbp(AF["own_gbp"]), priv)
    owe_v = mask(gbp(AF["owe_gbp"]), priv)
    liq_v = mask(gbp(AF["liquid_gbp"]), priv)

    vals = [v for _, v, _ in NW_SERIES]
    lo, hi = min(vals) - 650, max(vals) + 450
    pts = [(round(4 + i / (len(NW_SERIES) - 1) * 92, 2), ymap(v, lo, hi, 14, 16)) for i, (_, v, _) in enumerate(NW_SERIES)]
    scrub_pts = [
        {"x": pts[i][0], "y": pts[i][1], "k": d, "v": gbp(v), "s": note}
        for i, (d, v, note) in enumerate(NW_SERIES)
    ]
    pulse_aria = (
        "Recorded household net worth over 5 days (amounts hidden)."
        if priv
        else "Recorded household net worth from Thu 22 Oct £439,958 to Mon 26 Oct £444,951."
    )

    if mode == "c":
        heights = [36, 44, 41, 39, 100]
        cols = "".join(
            f'<span class="hpulse-col{" is-now" if i == len(NW_SERIES) - 1 else ""}" style="height:{heights[i]}%"></span>'
            for i in range(len(NW_SERIES))
        )
        pulse = (
            f'<div class="hpulse" role="img" aria-label="{pulse_aria}">'
            '<div class="fx jb ac gap8"><span class="mp-cap mp-hero-2">RECORDED LEDGER · 5 DAYS</span>'
            f'<span class="mp-cap mp-hero-2">{mask("Thu 22 £439,958 → Mon 26 £444,951", priv)}</span></div>'
            f'<div class="hpulse-bars">{cols}</div>'
            '<div class="hpulse-ax"><span>Thu 22 Oct</span><span>Sat 24 Oct</span><span>Mon 26 Oct</span></div>'
            "</div>"
        )
    else:
        d_line = smooth_d(pts) if mode == "a" else ("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts))
        d_area = f"{d_line} L{pts[-1][0]:.2f} 96 L{pts[0][0]:.2f} 96 Z"
        grid = (
            '<line class="hgrid" x1="4" x2="96" y1="26" y2="26"></line>'
            '<line class="hgrid" x1="4" x2="96" y1="74" y2="74"></line>'
        ) if mode == "b" else ""
        dot_cls = "mp-chartdot hdot-b" if mode == "b" else "mp-chartdot hdot-a"
        dots = "".join(
            f'<span class="{dot_cls}{" beacon" if (mode == "a" and i == len(pts) - 1) else ""}" '
            f'style="left:{x}%;top:{y}%"></span>'
            for i, (x, y) in enumerate(pts) if (mode == "b" or i in (0, len(pts) - 1))
        )
        pulse = (
            '<div class="hpulse">'
            '<div class="fx jb ac gap8"><span class="mp-cap mp-hero-2">'
            + ("EDITORIAL RANGE · THU 22 TO MON 26 OCT" if mode == "b" else "LIVE PULSE · RECORDED NET WORTH")
            + f'</span><span class="mp-cap mp-hero-2">{mask("low £439,951 · high £444,951", priv)}</span></div>'
            f'<div class="mp-chartbox hpulse-box"{scrub_attr(scrub_pts, priv)} role="img" '
            f'aria-label="{pulse_aria}">'
            f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{grid}'
            + (f'<path class="harea" d="{d_area}"></path>' if mode == "a" else "")
            + f'<path class="hline" d="{d_line}"></path></svg>'
            f"{dots}{scrub_overlay()}</div>"
            '<div class="hpulse-ax"><span>Thu 22 Oct</span><span>Sat 24 Oct</span><span>Mon 26 Oct</span></div>'
            "</div>"
        )

    split = (
        '<div class="hsplit3">'
        f'<div><span class="mp-cap mp-hero-2">Own</span><span class="mp-sub mp-w6 nowrap">{own_v}</span></div>'
        f'<div><span class="mp-cap mp-hero-2">Owe · 36%</span><span class="mp-sub mp-w6 nowrap">{owe_v}</span></div>'
        f'<div><span class="mp-cap mp-hero-2">Liquid cash</span><span class="mp-sub mp-w6 nowrap">{liq_v}</span></div>'
        "</div>"
    )
    seg = "" if compact else (
        '<div class="mp-seg"><span class="mp-seg-i segc on">Household</span>'
        '<span class="mp-seg-i segc">Me</span><span class="mp-seg-i segc">Asha</span></div>'
    )
    return (
        f'<div class="mp-hero hero">{seg}'
        '<div class="fx jb ac gap8 wrapr"><span class="mp-over mp-hero-2">Household net worth · Mon 26 Oct</span>'
        '<span class="mp-chip chip-s prc-h">£ GBP · ₹112.50</span></div>'
        f'<div class="fx ac gap10 wrapr"><span class="mp-num-hero nowrap">{fig}</span>'
        f'<span class="mp-sub mp-w6 hup nowrap">▲ {gain} since Thu 22 Oct</span></div>'
        f"{pulse}{split}"
        '<div class="rate mp-foot mp-hero-2"><span class="ms ms-s" aria-hidden="true">currency_exchange</span>'
        "<span>Fri 23 Oct close · £1 = ₹112.50 (ECB) · drag any chart to inspect</span></div>"
        "</div>"
    )


def stats_strip(items: list[tuple], priv: bool = False, mask_idx: set[int] | None = None) -> str:
    mset = mask_idx or set()
    cells = []
    for i, item in enumerate(items):
        k, v = item[0], item[1]
        sub = item[2] if len(item) > 2 else ""
        sub_html = f'<span class="mp-cap mp-ink2">{mask(sub, priv and i in mset)}</span>' if sub else ""
        cells.append(
            f'<div class="cstat"><span class="mp-cap mp-ink2">{k}</span>'
            f'<span class="mp-sub mp-w6 cstat-v">{mask(v, priv and i in mset)}</span>{sub_html}</div>'
        )
    return f'<div class="cstats">{"".join(cells)}</div>'


def wealth_mix_card(mode: str, priv: bool = False) -> str:
    """Country & member wealth split: 1a sculpted dual meters, 1b bullet comparison, 1c ring/donut + tiles."""
    uk_v = mask(gbp(AF["by_country_gbp"]["UK"]), priv)
    in_v = mask(gbp(AF["by_country_gbp"]["IN"]), priv)
    ar_v = mask(gbp(AF["by_member_gbp"]["arun"]), priv)
    as_v = mask(gbp(AF["by_member_gbp"]["asha"]), priv)
    inr_sub = mask("₹1,19,79,306", priv)

    if mode == "c":
        # SVG ring/donut: UK 76%, India 24% (circumference 2 * pi * 15.9155 = 100)
        return (
            '<div class="mp-card cpad">'
            '<div class="ctl"><span class="mp-hl">Where wealth sits</span><span class="mp-foot mp-ink2">2 countries · 2 members</span></div>'
            '<div class="donut-row">'
            '<div class="donut-box" role="img" aria-label="Household net worth split: United Kingdom 76%, India 24%.">'
            '<svg viewBox="0 0 40 40" aria-hidden="true">'
            '<circle class="donut-trk" cx="20" cy="20" r="15.92"></circle>'
            '<circle class="donut-uk" cx="20" cy="20" r="15.92" stroke-dasharray="76 24" stroke-dashoffset="25"></circle>'
            '<circle class="donut-in" cx="20" cy="20" r="15.92" stroke-dasharray="24 76" stroke-dashoffset="-51"></circle>'
            '</svg><div class="donut-ctr"><span class="mp-sub mp-w6">76%</span><span class="mp-cap mp-ink2">UK</span></div></div>'
            '<div class="donut-leg">'
            f'<div class="dleg"><span class="sw" style="background:var(--mp-chart-line)"></span><div class="rtx"><div class="mp-sub mp-w6">United Kingdom · 76%</div><div class="mp-foot mp-ink2">ISA, pension, home less loans</div></div><span class="mp-sub mp-w6 nowrap">{uk_v}</span></div>'
            f'<div class="dleg"><span class="sw" style="background:var(--mp-chart-2)"></span><div class="rtx"><div class="mp-sub mp-w6">India · 24%</div><div class="mp-foot mp-ink2">NRE, FDs, Pune flat · {inr_sub}</div></div><span class="mp-sub mp-w6 nowrap">{in_v}</span></div>'
            "</div></div>"
            '<div class="kvg">'
            f'<div><div class="mp-foot mp-ink2">Arun · 56%</div><div class="mp-sub mp-w6 nowrap">{ar_v}</div></div>'
            f'<div><div class="mp-foot mp-ink2">Asha · 44%</div><div class="mp-sub mp-w6 nowrap">{as_v}</div></div>'
            "</div></div>"
        )

    tick_50 = '<span class="bartick" style="left:50%" title="Equal 50% reference"></span>' if mode == "a" else '<span class="bar-bullet" style="left:50%"></span>'
    head_strip = stats_strip([("UK SHARE", "76%"), ("INDIA SHARE", "24%"), ("DEBT RATIO", "36%")]) if mode == "b" else ""
    return (
        '<div class="mp-card cpad">'
        '<div class="ctl"><span class="mp-hl">Countries and members</span><span class="mp-foot mp-ink2">net of each loan</span></div>'
        f"{head_strip}"
        '<div class="mrows">'
        f'<div><div class="fx jb ac gap8"><span class="mp-sub mp-w6">United Kingdom · 76%</span><span class="mp-sub mp-w6 nowrap">{uk_v}</span></div>'
        f'<div class="mp-track mbar has-tick posr" role="img" aria-label="United Kingdom 76% of household net worth"><span class="mp-track-clip"><span style="width:76.1%;background:var(--mp-chart-line)"></span></span>{tick_50}</div>'
        f'<div class="fx jb gap8 mp-foot mp-ink2"><span>India · 24% ({inr_sub})</span><span class="nowrap">{in_v}</span></div></div>'
        f'<div><div class="fx jb ac gap8"><span class="mp-sub mp-w6">Arun · 56%</span><span class="mp-sub mp-w6 nowrap">{ar_v}</span></div>'
        f'<div class="mp-track mbar has-tick posr" role="img" aria-label="Arun 56%, Asha 44% of household net worth"><span class="mp-track-clip"><span style="width:56.4%;background:var(--mp-chart-2)"></span></span>{tick_50}</div>'
        f'<div class="fx jb gap8 mp-foot mp-ink2"><span>Asha · 44% (50/50 joint home)</span><span class="nowrap">{as_v}</span></div></div>'
        "</div></div>"
    )


def budget_card(mode: str, priv: bool = False) -> str:
    """October spending vs plan (household-v4.json budget_oct): 1a capsule + plan tick, 1b bullet marker, 1c 10-cell pot meter."""
    cats = [
        ("Groceries", 702, 650),
        ("Bills and council tax", 431, 420),
        ("Shopping", 189, 250),
        ("Transport", 198, 220),
        ("Eating out", 236, 180),
    ]
    tot_act = mask(gbp(BUD["spend_actual"]), priv)
    tot_plan = mask(gbp(BUD["spend_plan"]), priv)
    under = mask("£436 under plan", priv)
    surp = mask(gbp(BUD["surplus_actual"]), priv)

    rows = []
    for name, act, plan in cats:
        over = act > plan
        diff = abs(act - plan)
        badge_cls = "mp-dq" if over else "mp-up"
        sym = "▲" if over else "▼"
        note = f"{sym} {mask(gbp(diff), priv)} {'over' if over else 'under'}"
        scale_max = max(plan * 1.25, act * 1.05)
        w_act = round(min(100.0, act / scale_max * 100.0), 1)
        w_plan = round(min(100.0, plan / scale_max * 100.0), 1)
        fill_col = "var(--mp-pause)" if over else "var(--mp-meter)"
        bar_aria = (
            f"{name}: amounts hidden ({round(act / plan * 100)}% of plan)"
            if priv
            else f"{name}: {gbp(act)} spent of {gbp(plan)} plan"
        )

        if mode == "c":
            lit = min(10, max(1, round(act / plan * 8)))
            cells = "".join(
                f'<span class="segcell{" on" if k < lit else ""}{" warn" if (k < lit and over) else ""}"></span>'
                for k in range(10)
            )
            bar = f'<div class="segbar" role="img" aria-label="{bar_aria}">{cells}</div>'
        elif mode == "b":
            bar = (
                f'<div class="mp-track mbar has-tick posr" role="img" aria-label="{bar_aria}">'
                f'<span class="mp-track-clip"><span style="width:{w_act}%;background:{fill_col}"></span></span>'
                f'<span class="bar-bullet" style="left:{w_plan}%"></span></div>'
            )
        else:
            bar = (
                f'<div class="mp-track mbar has-tick posr" role="img" aria-label="{bar_aria}">'
                f'<span class="mp-track-clip"><span style="width:{w_act}%;background:{fill_col}"></span></span>'
                f'<span class="bartick" style="left:{w_plan}%"></span></div>'
            )
        rows.append(
            f'<div class="brow-m"><div class="fx jb ac gap8"><span class="mp-sub mp-w6">{name}</span>'
            f'<span class="mp-foot nowrap"><b>{mask(gbp(act), priv)}</b> <span class="mp-ink2">of {mask(gbp(plan), priv)}</span></span></div>'
            f'{bar}<div class="fx jb gap8 mp-foot"><span class="{badge_cls} mp-w6">{note}</span>'
            f'<span class="mp-ink2">plan mark {round(act / plan * 100)}%</span></div></div>'
        )

    strip = stats_strip(
        [("SPENT", gbp(BUD["spend_actual"])), ("PLAN", gbp(BUD["spend_plan"])), ("SURPLUS", gbp(BUD["surplus_actual"]), "40.6% saved")],
        priv=priv,
        mask_idx={0, 1, 2},
    )
    legend = (
        '<div class="lgd"><span><i class="sw-m"></i>within plan</span>'
        '<span><i class="sw-w"></i>above plan</span>'
        + ('<span><i class="sw-tk"></i>10-cell pot pace (cell 8 = 100% plan)</span>' if mode == "c" else '<span><i class="sw-tk"></i>vertical tick = 100% plan</span>')
        + "</div>"
    )
    return (
        '<div class="mp-card cpad">'
        f'<div class="ctl"><span class="mp-hl">October spending pace</span><span class="mp-foot mp-up mp-w6">▼ {under}</span></div>'
        f'<p class="pp mp-foot mp-ink2">{tot_act} spent of {tot_plan} planned across 12 categories · monthly surplus {surp} (40.6% savings rate).</p>'
        f"{strip}"
        + "".join(rows)
        + f"{legend}</div>"
    )


def projection_fan_card(mode: str = "a", priv: bool = False) -> str:
    """20-year Monte Carlo fan chart (future-plans-v4.json R26, 2026..2046)."""
    lo, hi = 0.0, 6_100_000.0
    gut = 11.0 if mode == "b" else 3.0
    rgut = 3.0
    n = len(FAN20)
    xs = lambda i: round(gut + i / (n - 1) * (100.0 - gut - rgut), 2)  # noqa: E731

    p90 = [(xs(i), ymap(r["p90"], lo, hi, 8, 8)) for i, r in enumerate(FAN20)]
    p50 = [(xs(i), ymap(r["p50"], lo, hi, 8, 8)) for i, r in enumerate(FAN20)]
    p10 = [(xs(i), ymap(r["p10"], lo, hi, 8, 8)) for i, r in enumerate(FAN20)]
    det = [(xs(i), ymap(r["deterministic"], lo, hi, 8, 8)) for i, r in enumerate(FAN20)]

    if mode in ("a", "c"):
        top_d = smooth_d(p90)
        bot_d = smooth_d(list(reversed(p10))).replace("M", "L", 1)
        band_d = f"{top_d} {bot_d} Z"
        mid_d = smooth_d(p50)
        det_d = smooth_d(det)
    else:
        band_d = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in p90 + list(reversed(p10))) + " Z"
        mid_d = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in p50)
        det_d = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in det)

    grid_vals = [1_500_000, 3_000_000, 4_500_000]
    svg = [
        f'<line class="fgrid" x1="{gut}" x2="{100 - rgut}" y1="{ymap(g, lo, hi, 8, 8)}" y2="{ymap(g, lo, hi, 8, 8)}"></line>'
        for g in grid_vals
    ]
    svg.append(f'<path class="fband" d="{band_d}"></path>')
    svg.append(f'<path class="fdet" d="{det_d}"></path>')
    svg.append(f'<path class="fline" d="{mid_d}"></path>')

    ylbls = ""
    if mode == "b":
        ylbls = "".join(
            f'<span class="yl" style="top:{ymap(g, lo, hi, 8, 8)}%" data-mo="fade">{mask(f"£{g // 1_000_000:.0f}m" if g % 1_000_000 == 0 else f"£{g / 1_000_000:.1f}m", priv)}</span>'
            for g in grid_vals
        )

    dot_cls = "mp-chartdot hdot-b" if mode == "b" else "mp-chartdot"
    i_mid = 10  # 2036
    dots = (
        f'<span class="{dot_cls}" style="left:{p50[0][0]}%;top:{p50[0][1]}%"></span>'
        f'<span class="{dot_cls}" style="left:{p50[i_mid][0]}%;top:{p50[i_mid][1]}%"></span>'
        f'<span class="{dot_cls}{" beacon" if mode == "a" else ""}" style="left:{p50[-1][0]}%;top:{p50[-1][1]}%"></span>'
    )

    scrub_pts = [
        {
            "x": p50[i][0],
            "y": p50[i][1],
            "k": str(r["year"]),
            "v": f"middle {gbp_m(r['p50'])}",
            "s": f"8 in 10: {gbp_m(r['p10'])} to {gbp_m(r['p90'])}",
        }
        for i, r in enumerate(FAN20)
    ]

    ax = "".join(
        f'<span class="{"ax0" if idx == 0 else ("ax1" if idx == 4 else "")}" style="left:{xs(idx * 5)}%">{FAN20[idx * 5]["year"]}</span>'
        for idx in range(5)
    )
    end = FAN20[-1]
    strip = stats_strip(
        [("CAUTIOUS (P10)", gbp_m(end["p10"])), ("MIDDLE (P50)", gbp_m(end["p50"])), ("STRONG (P90)", gbp_m(end["p90"]))],
        priv=priv,
        mask_idx={0, 1, 2},
    )
    fan_aria = (
        "20-year household wealth projection from 2026 to 2046 (amounts hidden)."
        if priv
        else "20-year household wealth projection from 2026 to 2046: middle path reaches £3,697,000, with 8 in 10 runs between £2,548,000 and £5,766,000."
    )
    return (
        '<div class="mp-card oncard cpad">'
        '<div class="ctl"><span class="mp-hl">20-year wealth range (2026 to 2046)</span><span class="mp-foot mp-ink2">1,000 runs · today\'s pounds</span></div>'
        f'<p class="pp mp-foot mp-ink2">Starts at {mask(gbp(FP["R26"]["start"]), priv)} · 2036 middle path {mask(gbp(FAN20[10]["p50"]), priv)} · 2046 middle path {mask(gbp(end["p50"]), priv)}.</p>'
        f"{strip}"
        f'<div class="mp-chartbox ch-164"{scrub_attr(scrub_pts, priv)} role="img" '
        f'aria-label="{fan_aria}">'
        f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{"".join(svg)}</svg>'
        f"{ylbls}{dots}{scrub_overlay()}</div>"
        f'<div class="mp-chartaxis">{ax}</div>'
        '<div class="lgd"><span><i class="sw-line"></i>middle path (p50)</span><span><i class="sw-det"></i>single-rate path</span><span><i class="sw-band"></i>8 in 10 runs (p10 to p90)</span></div>'
        "</div>"
    )


def surplus_columns_card(mode: str = "a", run: str = "R1", priv: bool = False) -> str:
    """20-year monthly surplus columns (future-plans-v4.json forecast R1 vs R4, £500 floor)."""
    years = SURP_R1 if run == "R1" else SURP_R4
    cap = 4000.0
    floor = 500.0
    lo, hi = -1000.0 if run == "R1" else 0.0, cap
    y_zero = ymap(0.0, lo, hi, 8, 8)
    y_floor = ymap(floor, lo, hi, 8, 8)

    n = len(years)
    gut = 4.0
    step = (100.0 - 2 * gut) / n
    bw = round(step * (0.58 if mode == "b" else 0.68), 2)

    svg = [
        f'<line class="fgrid" x1="{gut}" x2="{100 - gut}" y1="{y_zero}" y2="{y_zero}"></line>',
        f'<line class="ffloor" x1="{gut}" x2="{100 - gut}" y1="{y_floor}" y2="{y_floor}"></line>',
    ]
    scrub_pts = []
    below_total = sum(y["below_floor"] for y in years)
    for i, y in enumerate(years):
        avg_m = round(y["surplus"] / 12.0)
        val = min(cap, max(lo, float(avg_m)))
        cx = round(gut + (i + 0.5) * step, 2)
        x = round(cx - bw / 2.0, 2)
        yv = ymap(val, lo, hi, 8, 8)
        top = min(yv, y_zero)
        h = max(1.8, round(abs(y_zero - yv), 2))
        is_low = (y["below_floor"] > 0) or (y["lowest_surplus"] < 0)
        cls = "scol low" if is_low else ("scol cap" if avg_m > cap else "scol ok")
        rx = "0.2" if mode == "b" else "0.9"
        svg.append(f'<rect class="{cls}" x="{x}" y="{top}" width="{bw}" height="{h}" rx="{rx}"></rect>')
        if is_low:
            # Non-colour triangle cue above below-floor years (Apple HIG: colour never the sole signal)
            svg.append(f'<circle class="swarn-dot" cx="{cx}" cy="{max(3.5, round(top - 3.2, 2))}" r="1.1"></circle>')
        scrub_pts.append({
            "x": cx,
            "y": top,
            "k": str(y["year"]),
            "v": f"avg {gbp(avg_m, sign=True)}/mo",
            "s": f"leanest {y['lowest_month']} {gbp(y['lowest_surplus'], sign=True)}"
            + (f" · {y['below_floor']} mo below £500" if y["below_floor"] else " · clear of £500 floor"),
        })

    ax = "".join(
        f'<span class="{"ax0" if k == 0 else ("ax1" if k == 3 else "")}" style="left:{round(gut + idx * step, 1)}%">{years[idx]["year"]}</span>'
        for k, idx in enumerate((0, 6, 12, 19))
    )
    title = "Monthly surplus by year · before rearranging" if run == "R1" else "Monthly surplus by year · after rearranging"
    badge = (
        f'<span class="mp-chip chip-s mp-pause">▲ {below_total} months below £500</span>'
        if below_total
        else '<span class="mp-chip chip-s mp-add">0 months below £500</span>'
    )
    lean = min(years, key=lambda r: r["lowest_surplus"])
    strip = stats_strip(
        [
            ("FLOOR", "£500/mo"),
            ("LEANEST", gbp(lean["lowest_surplus"], sign=True), lean["lowest_month"]),
            ("2046 AVG", f"{gbp(round(years[-1]['surplus'] / 12))}/mo"),
        ],
        priv=priv,
        mask_idx={0, 1, 2},
    )
    surp_aria = (
        f"{title}: {below_total} months below monthly floor between 2027 and 2046 (amounts hidden)."
        if priv
        else f'{title}: {below_total} months below the £500 monthly floor between 2027 and 2046; leanest month {lean["lowest_month"]} {gbp(lean["lowest_surplus"], sign=True)}.'
    )
    return (
        '<div class="mp-card oncard cpad">'
        f'<div class="ctl"><span class="mp-hl">{title}</span>{badge}</div>'
        '<p class="pp mp-foot mp-ink2">Amber bars mark any year where a single month dips under the £500 buffer floor (even when the year\'s average stays positive).</p>'
        f"{strip}"
        f'<div class="mp-chartbox ch-136"{scrub_attr(scrub_pts, priv)} role="img" '
        f'aria-label="{surp_aria}">'
        f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{"".join(svg)}</svg>'
        f"{scrub_overlay()}</div>"
        f'<div class="mp-chartaxis">{ax}</div>'
        '<div class="lgd"><span><i class="sw-ok"></i>every month ≥ £500</span><span><i class="sw-low"></i>has month below £500</span><span><i class="sw-flr"></i>£500 floor</span></div>'
        "</div>"
    )


def candles_card(mode: str = "a", priv: bool = False) -> str:
    """Asha's NASDAQ 100 ETF 60-day candles + 20-day conformal fan (forecaster-v4.json)."""
    data = NQ["candles"]
    fanp = NQ["fan"]
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
        if mode in ("a", "c"):
            d_band = f"{smooth_d(top)} {smooth_d(bot).replace('M', 'L', 1)} Z"
        else:
            d_band = "M" + " L".join(f"{x} {y}" for x, y in top + bot) + " Z"
        svg.append(f'<path class="fband" d="{d_band}"></path>')

    mid = [(x_today, ymap(0, lo, hi, 4, 4))] + [(xs(n_hist + i), ymap(f["p50"], lo, hi, 4, 4)) for i, f in enumerate(fanp)]
    d_mid = smooth_d(mid) if mode in ("a", "c") else ("M" + " L".join(f"{x} {y}" for x, y in mid))
    svg.append(f'<path class="fmid" d="{d_mid}"></path>')
    svg.append(f'<line class="ftoday" x1="{x_today}" x2="{x_today}" y1="2" y2="98"></line>')

    scrub_pts = []
    for i, c in enumerate(data):
        cls = "up" if c["up"] else "dn"
        x = xs(i)
        yh, yl = ymap(c["h"], lo, hi, 4, 4), ymap(c["l"], lo, hi, 4, 4)
        y1, y2 = ymap(max(c["o"], c["c"]), lo, hi, 4, 4), ymap(min(c["o"], c["c"]), lo, hi, 4, 4)
        bh = max(round(y2 - y1, 2), 0.7)
        svg.append(f'<rect class="cw {cls}" x="{round(x - 0.13, 2)}" y="{yh}" width="0.26" height="{round(max(yl - yh, 0.7), 2)}"></rect>')
        cb_cls = f"cb cb-b {cls}" if mode == "b" else f"cb {cls}"
        rx = "0.28" if mode in ("a", "c") else "0"
        svg.append(f'<rect class="{cb_cls}" x="{round(x - 0.44, 2)}" y="{y1}" width="0.88" height="{bh}" rx="{rx}"></rect>')
        scrub_pts.append({
            "x": x,
            "y": ymap(c["c"], lo, hi, 4, 4),
            "k": c["day"],
            "v": f"close {pc(c['c'], 1)}",
            "s": f"high {pc(c['h'], 1)} · low {pc(c['l'], 1)}",
        })
    for i, f in enumerate(fanp):
        x = xs(n_hist + i)
        y = ymap(f["p50"], lo, hi, 4, 4)
        scrub_pts.append({
            "x": x,
            "y": y,
            "k": f"Forecast {f['d']}",
            "v": f"middle {pc(f['p50'], 1)}",
            "s": f"8 in 10: {pc(f['p10'], 1)} to {pc(f['p90'], 1)}",
        })

    days = [c["day"] for c in data]
    p1, p2, br = days.index("Thu 1 Oct"), days.index("Wed 7 Oct"), days.index("Wed 14 Oct")
    sup = days.index("Wed 5 Aug")
    svg.append(f'<line class="pneck" x1="{xs(p1 - 2)}" x2="{xs(br + 1)}" y1="{ymap(NQ["neckline"], lo, hi, 4, 4)}" y2="{ymap(NQ["neckline"], lo, hi, 4, 4)}"></line>')
    svg.append(f'<line class="psup" x1="{xs(sup)}" x2="{x_today}" y1="{ymap(NQ["support"], lo, hi, 4, 4)}" y2="{ymap(NQ["support"], lo, hi, 4, 4)}"></line>')

    ylbls = "".join(
        f'<span class="yl" style="top:{ymap(g, lo, hi, 4, 4)}%" data-mo="fade">{pc(g)}</span>'
        for g in (-5, 0, 5, 10)
    )
    f_last = fanp[-1]
    flbls = (
        f'<span class="fl" style="top:{ymap(f_last["p90"], lo, hi, 4, 4)}%" data-mo="fade">{pc(f_last["p90"])}</span>'
        f'<span class="fl" style="top:{ymap(f_last["p10"], lo, hi, 4, 4)}%" data-mo="fade">{pc(f_last["p10"])}</span>'
        f'<span class="tdl" style="left:{x_today}%" data-mo="fade">Fri 23 Oct</span>'
    )

    rhythm = ""
    if mode == "c":
        max_rng = max(max(c["h"] - c["l"], 0.4) for c in data)
        rsvg = []
        for i, c in enumerate(data):
            rng = max(c["h"] - c["l"], 0.4)
            rh = round(min(92.0, rng / max_rng * 88.0 + 8.0), 1)
            cls = "up" if c["up"] else "dn"
            rsvg.append(f'<rect class="rbar {cls}" x="{round(xs(i) - 0.38, 2)}" y="{round(100 - rh, 1)}" width="0.76" height="{rh}" rx="0.25"></rect>')
        rhythm = (
            '<div class="fc-rhythm" role="img" aria-label="60-day daily high-to-low swing rhythm strip">'
            '<div class="fx jb ac"><span class="mp-cap mp-ink2">DAILY SWING RHYTHM (HIGH − LOW)</span><span class="mp-cap mp-ink2">60 trading days</span></div>'
            f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{"".join(rsvg)}</svg></div>'
        )

    ax = (
        f'<span style="left:{xs(1)}%">Aug</span>'
        f'<span style="left:{xs(22)}%">Sep</span>'
        f'<span style="left:{xs(43)}%">Oct</span>'
        f'<span style="left:{xs(65)}%">Nov</span>'
    )
    val_txt = mask(gbp(NQ["value_gbp"]), priv)
    h = NQ["headline"]
    strip = stats_strip([
        ("FALL > 5%", f'{h["fall5"]}%', f'usually {h["fall5_usual"]}%'),
        ("8 IN 10", f'{pc(h["lo"])} … {pc(h["hi"])}', "4-wk fan"),
        ("UP IN 4W", f'{h["up"]}%', "PAUSE 64%"),
    ])
    return (
        '<div class="mp-card oncard cpad">'
        f'<div class="ctl"><span class="mp-hl">NASDAQ 100 ETF · 60d + 4w fan</span><span class="mp-foot mp-ink2">Asha · ISA · {val_txt}</span></div>'
        f"{strip}"
        f'<div class="mp-chartbox ch-184"{scrub_attr(scrub_pts, priv)} role="img" '
        'aria-label="NASDAQ 100 ETF daily candles for 60 trading days to Fri 23 Oct and 4-week conformal fan: 8 in 10 range −7% to +6%, double top and support near −1%.">'
        f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{"".join(svg)}</svg>'
        f"{ylbls}{flbls}{scrub_overlay()}</div>"
        f"{rhythm}"
        f'<div class="mp-chartaxis">{ax}</div>'
        '<div class="lgd"><span><i class="sw-up"></i>up day</span><span><i class="sw-dn"></i>down day</span>'
        '<span><i class="sw-band"></i>8 in 10 fan</span><span><i class="sw-pa"></i>double top</span><span><i class="sw-pb"></i>support −1%</span></div>'
        "</div>"
    )


def pillars_card(mode: str = "a") -> str:
    """Zero-spine diverging stance & Forecaster drivers (forecaster-v4.json nasdaq.drivers)."""
    rows = []
    for label, pts in NQ["drivers"][:6]:
        pos = pts > 0
        w = min(48, abs(pts) * 11)
        side_style = f"left:50%;width:{w}%" if pos else f"right:50%;width:{w}%"
        fill_cls = "pfor" if pos else "pag"
        chip_cls = "mp-add" if pos else "mp-pause"
        sym = "▲" if pos else "▼"
        val_s = f"{sym} {'+' if pos else MINUS}{abs(pts)} pts"
        if mode == "c":
            badge = f'<span class="mp-chip chip-s {chip_cls} pval">{val_s}</span>'
        else:
            badge = f'<span class="mp-foot mp-w6 pval {"mp-up" if pos else "mp-dq"}">{val_s}</span>'
        rows.append(
            f'<div class="pil-row pil-{mode}"><span class="mp-foot mp-w6">{label}</span>'
            f'<span class="mp-track pil-trk" role="img" aria-label="{label}: {val_s}">'
            f'<i class="pil-zero"></i><i class="pil-bar {fill_cls}" style="{side_style}"></i></span>'
            f"{badge}</div>"
        )
    return (
        '<div class="mp-card cpad">'
        '<div class="ctl"><span class="mp-hl">Diverging stance drivers</span><span class="mp-chip chip-s mp-pause">PAUSE · 64%</span></div>'
        f'<p class="pp mp-foot mp-ink2">From a usual {NQ["usual_up"]}% chance of being up to {NQ["headline"]["up"]}% today, anchored on a single zero spine.</p>'
        + "".join(rows)
        + '<div class="lgd"><span><i class="sw-for"></i>lifts outlook</span><span><i class="sw-ag"></i>weighs on outlook</span></div>'
        "</div>"
    )


def scrub_anatomy_strip(mode: str) -> str:
    """Static progressive-disclosure scrub pill specimen placed outside [role=img] so it never covers a label at 320px."""
    tag = {"a": "1a · Coral beacon + floating pill", "b": "1b · Hairline rule + tabular readout", "c": "1c · Bento pill + active bar highlight"}[mode]
    return (
        '<div class="scrub-demo">'
        '<span class="ms ms-s mp-acc" aria-hidden="true">touch_app</span>'
        '<div class="rtx"><div class="mp-foot mp-w6">Interactive scrub readout (44pt touch target, progressive disclosure)</div>'
        f'<div class="mp-cap mp-ink2">{tag} · hidden at rest, revealed on drag or hover, masked in Privacy mode.</div></div>'
        '<span class="scrub-sample">Mon 26 Oct · £444,951 · +£5,000 Monzo</span>'
        "</div>"
    )


# ------------------------------------------------------------------ Shared CSS & Scrub JS
CHART_CSS = """
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
  .altb { font: 600 12px/16px -apple-system, system-ui, sans-serif; color: #3D424D; background: #DCD9D3; padding: 3px 10px; border-radius: 999px; }
  .dv-col { display: flex; flex-direction: column; }

  /* DS specimen panes (not matched by board_fit FRAME_SEL, keeping 2-up specimen cards intact) */
  .pane { max-width: 100%; box-sizing: border-box; padding: 22px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px; background: var(--mp-bg); color: var(--mp-ink); box-shadow: 0 0 0 1px rgba(0,0,0,.08); }
  .phead { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .spec-grid { display: grid; grid-template-columns: repeat(2, 376px); gap: 16px; align-items: start; }

  /* Common utilities inside .mp */
  .z1 { position: relative; z-index: 1; }
  .f1 { flex: 1; min-width: 0; }
  .rtx { flex: 1; min-width: 0; }
  .pp { margin: 0; text-wrap: pretty; }
  .nowrap { white-space: nowrap; }
  .wrapr { flex-wrap: wrap; }
  .posr { position: relative; }
  .cpad { display: flex; flex-direction: column; gap: 11px; padding: 16px; box-sizing: border-box; }
  .ctl { display: flex; justify-content: space-between; align-items: baseline; gap: 6px 10px; flex-wrap: wrap; }
  .segc { display: grid; place-items: center; }
  .prc-h { color: var(--mp-hero-ink); background: var(--mp-hero-2); }
  .hup { color: var(--mp-hero-up); }
  .t-dark .mp-ink3 { color: var(--mp-ink-2); }

  /* Hero & recorded pulse */
  .hero { display: flex; flex-direction: column; gap: 11px; }
  .rate { display: flex; align-items: flex-start; gap: 6px; padding-top: 10px; border-top: 1px solid var(--mp-hero-2); }
  .rate > span:last-child { flex: 1; min-width: 0; }
  .hpulse { background: var(--mp-hero-2); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
  .hpulse-box { height: 58px; }
  .hpulse-box > svg { width: 100%; height: 100%; display: block; }
  .hgrid { stroke: var(--mp-hero-ink-2); stroke-opacity: 0.24; stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
  .harea { fill: var(--mp-coral); fill-opacity: 0.24; }
  .hline { fill: none; stroke: var(--mp-coral); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .mp-chartdot.hdot-a { background: var(--mp-coral); box-shadow: 0 0 0 2px var(--mp-hero); }
  .mp-chartdot.hdot-b { width: 8px; height: 8px; background: var(--mp-surface); box-shadow: 0 0 0 2px var(--mp-chart-line); }
  .mp-chartdot.beacon { box-shadow: 0 0 0 2.5px var(--mp-surface), 0 0 0 6px var(--mp-band); }
  .hpulse .mp-chartdot.beacon { box-shadow: 0 0 0 2px var(--mp-hero), 0 0 0 6px var(--mp-band); }
  .hpulse-bars { display: flex; align-items: flex-end; gap: 6px; height: 54px; padding-top: 4px; }
  .hpulse-col { flex: 1 1 0; min-height: 12px; border-radius: 6px 6px 3px 3px; background: var(--mp-hero-ink-2); opacity: 0.42; display: block; }
  .hpulse-col.is-now { background: var(--mp-coral); opacity: 1; }
  .hpulse-ax { display: flex; justify-content: space-between; font: 500 11px/14px var(--mp-font); color: var(--mp-hero-ink-2); }
  .hsplit3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; container-type: inline-size; }
  .hsplit3 > div { background: var(--mp-hero-2); border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  @container screen (max-width: 359px) { .hsplit3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @container app (max-width: 359px) { .hsplit3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

  /* Summary stat strip inside chart cards */
  .cstats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .cstat { background: var(--mp-surface-2); border-radius: 11px; padding: 7px 9px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cstat-v { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  @container screen (max-width: 359px) { .cstats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @container app (max-width: 359px) { .cstats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

  /* Chart boxes & SVG primitives */
  .ch-136 { height: 136px; }
  .ch-164 { height: 164px; }
  .ch-184 { height: 184px; }
  .mp-chartbox > svg { width: 100%; height: 100%; display: block; }
  .fgrid { stroke: var(--mp-chart-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .fline { fill: none; stroke: var(--mp-chart-line); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .fdet { fill: none; stroke: var(--mp-ink-2); stroke-width: 1.5; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
  .fmid { fill: none; stroke: var(--mp-chart-line); stroke-width: 2; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
  .ftoday { stroke: var(--mp-ink-2); stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
  .ffloor { stroke: var(--mp-pause); stroke-width: 1.4; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
  .scol.ok { fill: var(--mp-meter); }
  .scol.cap { fill: var(--mp-up); }
  .scol.low { fill: var(--mp-pause); }
  .swarn-dot { fill: var(--mp-pause); }
  .cw.up { fill: var(--mp-up); } .cw.dn { fill: var(--mp-down-quiet); }
  .cb.up { fill: var(--mp-up); } .cb.dn { fill: var(--mp-down-quiet); }
  .cb-b.up { fill: var(--mp-surface); stroke: var(--mp-up); stroke-width: 1.3; vector-effect: non-scaling-stroke; }
  .pneck { stroke: var(--mp-chart-4); stroke-width: 1.8; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
  .psup { stroke: var(--mp-chart-2); stroke-width: 1.8; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
  .yl { position: absolute; left: 0; transform: translateY(-100%); padding-bottom: 1px; font: 500 11px/14px var(--mp-font); color: var(--mp-ink-2); white-space: nowrap; pointer-events: none; }
  .fl { position: absolute; right: 0; transform: translateY(-50%); font: 600 11px/14px var(--mp-font); color: var(--mp-ink); white-space: nowrap; pointer-events: none; }
  .tdl { position: absolute; bottom: 2px; transform: translateX(calc(-100% - 4px)); font: 500 11px/14px var(--mp-font); color: var(--mp-ink-2); white-space: nowrap; pointer-events: none; }
  .mp-chartaxis { margin-top: 4px; }
  .mp-chartaxis > .ax0 { transform: none; }
  .mp-chartaxis > .ax1 { transform: translateX(-100%); }

  /* Option C daily swing rhythm sub-strip */
  .fc-rhythm { background: var(--mp-surface-2); border-radius: 10px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
  .fc-rhythm > svg { width: 100%; height: 24px; display: block; }
  .rbar.up { fill: var(--mp-up); }
  .rbar.dn { fill: var(--mp-down-quiet); }

  /* Meters, plan ticks, bullet markers & 10-cell pot bars */
  .mrows { display: flex; flex-direction: column; gap: 12px; }
  .brow-m { display: flex; flex-direction: column; gap: 4px; }
  .mbar { height: 10px; }
  .mbar > span:first-child:not(.mp-track-clip), .mbar > .mp-track-clip > span:first-child { display: block; height: 100%; border-radius: 999px; }
  .bartick { position: absolute; top: -2px; bottom: -2px; width: 2.5px; border-radius: 2px; background: var(--mp-ink); box-shadow: 0 0 0 1px var(--mp-surface); pointer-events: none; }
  .bar-bullet { position: absolute; top: -3px; bottom: -3px; width: 3px; border-radius: 1px; background: var(--mp-ink); pointer-events: none; }
  .segbar { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; height: 11px; }
  .segcell { border-radius: 3px; background: var(--mp-track); box-shadow: inset 0 0 0 1px var(--mp-line); display: block; }
  .segcell.on { background: var(--mp-meter); box-shadow: none; }
  .segcell.on.warn { background: var(--mp-pause); }

  /* Option C donut & kv grid */
  .donut-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .donut-box { width: 88px; height: 88px; position: relative; flex: none; display: grid; place-items: center; }
  .donut-box > svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .donut-trk { fill: none; stroke: var(--mp-track); stroke-width: 5.2; }
  .donut-uk { fill: none; stroke: var(--mp-chart-line); stroke-width: 5.2; stroke-linecap: butt; }
  .donut-in { fill: none; stroke: var(--mp-chart-2); stroke-width: 5.2; stroke-linecap: butt; }
  .donut-ctr { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .donut-leg { flex: 1 1 180px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .dleg { display: flex; align-items: center; gap: 8px; }
  .sw { width: 11px; height: 11px; border-radius: 3px; flex: none; }
  .kvg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .kvg > div { background: var(--mp-surface-2); border-radius: 12px; padding: 9px 11px; min-width: 0; }

  /* Zero-spine diverging pillars */
  .pil-row { display: grid; grid-template-columns: minmax(84px, 1.15fr) minmax(72px, 1fr) auto; align-items: center; gap: 8px; min-height: 28px; }
  .pil-trk { position: relative; height: 9px; }
  .pil-zero { position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1.5px; background: var(--mp-ink-2); display: block; }
  .pil-bar { position: absolute; top: 0; bottom: 0; border-radius: 999px; display: block; }
  .pfor { background: var(--mp-pillar-for); }
  .pag { background: var(--mp-pillar-against); }
  .pval { font-variant-numeric: tabular-nums; white-space: nowrap; }
  @container screen (max-width: 359px) { .pil-row { grid-template-columns: minmax(0, 1fr) auto; } .pil-trk { grid-column: 1 / -1; order: 3; } }
  @container app (max-width: 359px) { .pil-row { grid-template-columns: minmax(0, 1fr) auto; } .pil-trk { grid-column: 1 / -1; order: 3; } }

  /* Legends */
  .lgd { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font: 400 12px/16px var(--mp-font); color: var(--mp-ink-2); }
  .lgd > span { display: inline-flex; align-items: center; gap: 5px; }
  .lgd i { display: inline-block; flex: none; }
  .sw-line { width: 14px; height: 0; border-top: 2.5px solid var(--mp-chart-line); }
  .sw-det { width: 14px; height: 0; border-top: 1.5px dashed var(--mp-ink-2); }
  .sw-band { width: 14px; height: 10px; border-radius: 3px; background: var(--mp-band); }
  .sw-ok, .sw-m { width: 11px; height: 9px; border-radius: 2px; background: var(--mp-meter); }
  .sw-low, .sw-w { width: 11px; height: 9px; border-radius: 2px; background: var(--mp-pause); }
  .sw-flr { width: 14px; height: 0; border-top: 1.5px dashed var(--mp-pause); }
  .sw-tk { width: 3px; height: 11px; border-radius: 1px; background: var(--mp-ink); }
  .sw-up { width: 6px; height: 11px; border-radius: 1px; background: var(--mp-up); }
  .sw-dn { width: 6px; height: 11px; border-radius: 1px; background: var(--mp-down-quiet); }
  .sw-pa { width: 14px; height: 0; border-top: 2px dashed var(--mp-chart-4); }
  .sw-pb { width: 14px; height: 0; border-top: 2px dashed var(--mp-chart-2); }
  .sw-for { width: 11px; height: 8px; border-radius: 2px; background: var(--mp-pillar-for); }
  .sw-ag { width: 11px; height: 8px; border-radius: 2px; background: var(--mp-pillar-against); }

  /* Interactive scrub overlay (hidden at rest so zero labels are covered; active on pointer/touch) */
  .mp-chartbox[data-scrub] { cursor: crosshair; touch-action: pan-y; }
  .mp5-scrub { display: none; position: absolute; inset: 0; pointer-events: none; z-index: 8; }
  .mp5-scrub.on { display: block; }
  .mp5-scrub-line { position: absolute; top: 0; bottom: 0; width: 1.5px; background: var(--mp-ink); opacity: 0.45; transform: translateX(-50%); }
  .mp5-scrub-dot { position: absolute; width: 11px; height: 11px; border-radius: 50%; background: var(--mp-coral); box-shadow: 0 0 0 2.5px var(--mp-surface); transform: translate(-50%, -50%); }
  .mp5-scrub-pill { position: absolute; top: 4px; transform: translateX(-50%); padding: 4px 8px; border-radius: 8px; background: var(--mp-hero); color: var(--mp-hero-ink); font: 600 11px/14px var(--mp-font); white-space: nowrap; box-shadow: var(--mp-shadow); }
  .scrub-demo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; border-radius: 12px; background: var(--mp-surface-2); }
  .scrub-sample { font: 600 11px/15px var(--mp-font); padding: 4px 9px; border-radius: 8px; background: var(--mp-hero); color: var(--mp-hero-ink); font-variant-numeric: tabular-nums; }

  /* iOS phone & iPad layout helpers */
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
  @container screen (max-width: 1132px) { .mp.ipad .scrn.srow > .insp { display: none; } }
  @container screen (max-width: 960px) { .mp.ipad .g2 { grid-template-columns: minmax(0, 1fr); } }
  @container screen (max-width: 799px) { .mp.ipad .scrn.srow > .sidebar { display: none; } }

  /* Web v4 browser frames (.bf.w1440 and .bf.w390) */
  .bf { position: relative; overflow: hidden; flex: none; border-radius: 14px; box-shadow: 0 0 0 1px rgba(0,0,0,.12), 0 20px 50px rgba(0,0,0,.14); }
  .bf.w1440 { width: 1440px; height: 980px; }
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
  .whose { flex: 0 1 280px; min-width: 210px; }
  .iconbtn.on { background: var(--mp-hero); color: var(--mp-hero-ink); }
  .pstat { display: none; }
  .w390 .pstat { display: flex; position: absolute; left: 0; right: 0; top: 0; height: 34px; z-index: 40; align-items: center; justify-content: center; gap: 6px; padding: 0 16px; font: 500 12px/16px var(--mp-font); color: var(--mp-ink-2); background: var(--mp-surface-2); border-bottom: 1px solid var(--mp-line); }
  .w390 .mp-pagepad { padding-top: 48px; padding-bottom: 92px; }
  .chatcol { display: none; width: 356px; flex: none; flex-direction: column; border-left: 1px solid var(--mp-line); background: var(--mp-bg); position: relative; overflow: hidden; }
  @container app (min-width: 1024px) { .chatcol { display: flex; } }
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
  .kvl > :last-child { font-weight: 600; text-align: right; margin-left: auto; }
  .chcomp { display: flex; flex-direction: column; gap: 8px; padding: 10px 16px 14px; border-top: 1px solid var(--mp-line); }
  .wchips { display: flex; gap: 8px; flex-wrap: wrap; }
  .wchip { min-height: 34px; padding: 0 11px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; font: 600 13px/18px var(--mp-font); background: var(--mp-surface); color: var(--mp-ink); box-shadow: inset 0 0 0 1px var(--mp-line); }
  .wchip .ms { font-size: 17px; color: var(--mp-accent); }
  .cfld { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 6px 0 14px; border-radius: 22px; background: var(--mp-surface); box-shadow: inset 0 0 0 1.5px var(--mp-ink-2); }
  .cfld .ph { flex: 1; font: 400 14px/19px var(--mp-font); color: var(--mp-ink-2); }
  .sendb { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--mp-accent); color: var(--mp-on-accent); flex: none; }
  .sendb .ms { font-size: 19px; }
  .mpm { display: block; flex: none; }
  .mpm-coin { fill: var(--mp-hero); }
  .mpm-pound { fill: none; stroke: #FFFFFF; stroke-linecap: round; stroke-linejoin: round; }
  .mpm-dot { fill: var(--mp-coral); }
  .t-dark .mpm-coin { fill: var(--mp-hero-2); }
"""

SCRUB_JS = """
      class Component extends DCLogic {
        componentDidMount() {
          const ptsOf = (box) => {
            const raw = box && box.getAttribute('data-scrub');
            if (!raw) return null;
            try { const pts = JSON.parse(raw); return pts && pts.length ? pts : null; } catch (_) { return null; }
          };
          const renderIdx = (box, pts, idx) => {
            const ov = box.querySelector('.mp5-scrub');
            if (!ov) return;
            const i = Math.max(0, Math.min(pts.length - 1, idx));
            box.setAttribute('data-scrub-idx', String(i));
            const best = pts[i];
            ov.classList.add('on');
            const ln = ov.querySelector('.mp5-scrub-line');
            const dt = ov.querySelector('.mp5-scrub-dot');
            const pl = ov.querySelector('.mp5-scrub-pill');
            if (ln) ln.style.left = best.x + '%';
            if (dt) { dt.style.left = best.x + '%'; dt.style.top = best.y + '%'; }
            if (pl) {
              pl.textContent = best.k + ' · ' + best.v + (best.s ? ' (' + best.s + ')' : '');
              pl.style.left = Math.max(18, Math.min(82, best.x)) + '%';
            }
          };
          const show = (box, clientX) => {
            const pts = ptsOf(box);
            if (!pts) return;
            const r = box.getBoundingClientRect();
            if (!r.width) return;
            const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
            let bi = 0, bd = Math.abs(pts[0].x - pct);
            for (let i = 1; i < pts.length; i++) {
              const d = Math.abs(pts[i].x - pct);
              if (d < bd) { bi = i; bd = d; }
            }
            renderIdx(box, pts, bi);
          };
          const hide = (box) => {
            const ov = box && box.querySelector('.mp5-scrub');
            if (ov) ov.classList.remove('on');
          };
          document.addEventListener('pointermove', (e) => {
            const box = e.target.closest && e.target.closest('[data-scrub]');
            if (box) show(box, e.clientX);
          });
          document.addEventListener('pointerdown', (e) => {
            const box = e.target.closest && e.target.closest('[data-scrub]');
            if (box) show(box, e.clientX);
          });
          document.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'touch') {
              const box = e.target.closest && e.target.closest('[data-scrub]');
              if (box) hide(box);
            }
          });
          document.addEventListener('pointercancel', (e) => {
            const box = e.target.closest && e.target.closest('[data-scrub]');
            if (box) hide(box);
          });
          document.addEventListener('pointerout', (e) => {
            const box = e.target.closest && e.target.closest('[data-scrub]');
            if (box && (!e.relatedTarget || !box.contains(e.relatedTarget))) hide(box);
          });
          document.addEventListener('keydown', (e) => {
            const box = e.target.closest && e.target.closest('[data-scrub]');
            if (!box) return;
            if (e.key === 'Escape') { hide(box); return; }
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            const pts = ptsOf(box);
            if (!pts) return;
            e.preventDefault();
            const cur = parseInt(box.getAttribute('data-scrub-idx') || '-1', 10);
            const next = cur < 0 ? (e.key === 'ArrowRight' ? 0 : pts.length - 1) : cur + (e.key === 'ArrowRight' ? 1 : -1);
            renderIdx(box, pts, next);
          });
          document.addEventListener('focusout', (e) => {
            const box = e.target.closest && e.target.closest('[data-scrub]');
            if (box) hide(box);
          });
        }
        renderVals() { return {}; }
      }
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
        f"        <style>{mini(CHART_CSS)}        </style>\n"
        "      </helmet>\n"
        f"{body}"
        "    </x-dc>\n"
        '    <script type="text/x-dc" data-dc-script data-props="{}">\n'
        f"{SCRUB_JS}"
        "    </script>\n"
        "  </body>\n"
        "</html>\n"
    )


def intro_turn(tag: str, title: str, intro: str, plan_html: str, links: list[tuple[str, str]]) -> str:
    nav = '<nav class="idx" aria-label="Boards">' + "".join(f'<a href="#{a}">{t}</a>' for a, t in links) + "</nav>"
    return (
        f'      <section class="dv-turn" id="intro" data-screen-label="{title}: intro">\n'
        f'        <div class="dv-thd"><a class="dv-tid" href="#intro">{tag}</a><span class="dv-tname">{title}</span></div>\n'
        f'        <p class="dv-intro">{intro}</p>\n'
        f'        <div class="plan">{plan_html}</div>\n'
        f"        {nav}\n"
        "      </section>\n"
    )


def board_section(num: str, name: str, keys: str, lead: str, frames: list[str], notes: list[tuple[str, str]], rec: bool = False, alt: str = "", anchor: str = "") -> str:
    nt = "".join(f"<p><b>{a}</b> {b}</p>" for a, b in notes)
    badge = '<span class="recb">Picked</span>' if rec else (f'<span class="altb">{alt}</span>' if alt else "")
    aid = anchor or num
    return (
        f'      <section class="bd" id="{aid}" data-screen-label="{num} · {name}">\n'
        f'        <div class="dv-thd"><span class="dv-tid">{num}</span><span class="dv-tname">{name}</span>{badge}<span class="bd-keys">{keys}</span></div>\n'
        f'        <p class="bd-lead">{lead}</p>\n'
        '        <div class="bd-row">\n'
        + "\n".join("          " + f for f in frames)
        + f'\n          <div class="bd-note">{nt}</div>\n'
        "        </div>\n"
        "      </section>\n"
    )


# ------------------------------------------------------------------ Device & Browser frame wrappers
SB_ICONS = '<span class="sbar-ic"><span class="ms" aria-hidden="true">signal_cellular_alt</span><span class="ms" aria-hidden="true">wifi</span><span class="ms" aria-hidden="true">battery_horiz_075</span></span>'
IOS_TABS = [("chat_bubble", "Chat"), ("home", "Home"), ("insights", "Activity"), ("account_circle", "You")]
IOS_SIDE = [("chat_bubble", "Chat"), ("home", "Home"), ("donut_small", "Assets"), ("credit_card", "Debts"), ("savings", "Budget"), ("trending_up", "Projection"), ("insights", "Activity"), ("history", "Audit")]
WEB_NAV = [("home", "Overview", True), ("donut_small", "Assets", False), ("credit_card", "Debts", False), ("savings", "Budget", False), ("trending_up", "Projection", False), ("history", "Activity", False), ("fact_check", "Audit", False)]
WEB_TABS = [("chat_bubble", "Chat", False), ("home", "Overview", True), ("donut_small", "Assets", False), ("savings", "Budget", False), ("menu", "More", False)]


def ios_tabdock(on: str = "Home") -> str:
    tabs = "".join(f'<span class="tab{" on" if l == on else ""}"><span class="ms" aria-hidden="true">{i}</span>{l}</span>' for i, l in IOS_TABS)
    return f'<div class="edge-bot"></div><div class="tabdock"><div class="tabs lg">{tabs}</div><span class="tabsearch lg" aria-label="Search"><span class="ms z1" aria-hidden="true">search</span></span></div><div class="homebar"></div>'


def iphone_frame(cap: str, theme: str, body: str, title: str = "Home", priv: bool = False) -> str:
    eye = "visibility_off" if priv else "visibility"
    eye_cls = "gbtn lg on" if priv else "gbtn lg"
    nav = (
        f'<div class="nav"><span></span><span class="fx gap8">'
        f'<span class="{eye_cls}" aria-label="Privacy mode" aria-pressed="{"true" if priv else "false"}"><span class="ms z1" aria-hidden="true">{eye}</span></span>'
        '<span class="gtext lg"><span class="ms z1" aria-hidden="true">chat_bubble</span><span class="z1">Ask</span></span></span></div>'
    )
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="dev dev-iphone mp {theme}"><div class="island"></div><div class="scrn">'
        f'<div class="sbar"><span>9:41</span>{SB_ICONS}</div>{nav}'
        f'<div class="largetitle">{title}</div>'
        f'<div class="scroll"><div class="pg">{body}'
        '<span class="mp-foot mp-ink2" style="text-align:center">Illustrative figures from the engine (household-v4.json).</span>'
        f"</div></div>{ios_tabdock('Home')}</div></div></div>"
    )


def ipad_frame(cap: str, theme: str, left_col: str, right_col: str, hero: str, title: str = "Home") -> str:
    side = "".join(f'<span class="side-i{" on" if l == "Home" else ""}"><span class="ms" aria-hidden="true">{i}</span>{l}</span>' for i, l in IOS_SIDE)
    chat = (
        '<div class="insp"><div class="sbar sbar-r"><span class="sbar-ic"><span class="ms" aria-hidden="true">wifi</span><span class="ms" aria-hidden="true">battery_horiz_075</span></span></div>'
        '<div class="nav"><span class="mp-hl">Chat</span><span class="gbtn lg" aria-label="New conversation"><span class="ms z1" aria-hidden="true">edit_square</span></span></div>'
        '<div class="chfadet"></div>'
        '<div class="ichat"><div class="chat">'
        '<div class="daysep">Mon 26 Oct</div>'
        '<div class="me">How is October tracking after moving £5,000 to Monzo?</div>'
        '<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body">'
        '<div class="ai-text">Net worth is £444,951 (+£4,993 since Thu 22 Oct), and October spending sits £436 under plan with a 40.6% savings rate. Drag any chart beside us to inspect a day or year.</div>'
        "</div></div></div></div>"
        '<div class="edge-bot"></div>'
        '<div class="composer cb20"><div class="chips"><span class="gchip lg"><span class="ms" aria-hidden="true">savings</span><span>October pace</span></span><span class="gchip lg"><span class="ms" aria-hidden="true">trending_up</span><span>2046 range</span></span></div>'
        '<div class="cbar"><span class="cplus lg" aria-label="Attach"><span class="ms z1" aria-hidden="true">add</span></span><span class="cfield lg"><span class="ph">Ask MyPaisa</span><span class="csend mp-ink2 z1" aria-label="Dictate"><span class="ms" aria-hidden="true">mic</span></span></span></div></div></div>'
    )
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="dev dev-ipad-l mp ipad {theme}"><div class="scrn srow">'
        f'<div class="sidebar sb lg"><div class="side-h sh0">MyPaisa</div>{side}<div class="side-h">Household</div><span class="side-i"><span class="ms" aria-hidden="true">account_circle</span>You</span></div>'
        f'<div class="main"><div class="sbar"><span>9:41 Mon 26 Oct</span><span></span></div>'
        f'<div class="nav"><span class="largetitle navt">{title}</span><span class="gbtn lg" aria-label="Privacy mode"><span class="ms z1" aria-hidden="true">visibility</span></span></div>'
        f'<div class="scroll"><div class="ipg">{hero}<div class="g2"><div class="dv-col" style="gap:14px">{left_col}</div><div class="dv-col" style="gap:14px">{right_col}</div></div></div></div>'
        f'<div class="edge-bot"></div></div>{chat}</div></div></div>'
    )


def browser_frame(cap: str, theme: str, width_cls: str, hero: str, col1: str, col2: str, title: str = "Overview", priv: bool = False) -> str:
    side_items = "".join(
        f'<span class="mp-side-i{" on" if on else ""}"><span class="ms{" ms-fill" if on else ""}" aria-hidden="true">{ic}</span>{lb}</span>'
        for ic, lb, on in WEB_NAV
    )
    tabs = "".join(
        f'<span class="mp-tab{" on" if on else ""}"><span class="ms{" ms-fill" if on else ""}" aria-hidden="true">{ic}</span>{lb}</span>'
        for ic, lb, on in WEB_TABS
    )
    eye = "visibility_off" if priv else "visibility"
    eye_cls = "iconbtn on" if priv else "iconbtn"
    nw_chat = mask("£444,951", priv)
    under_chat = mask("£436 under plan", priv)
    mark_svg = (
        '<svg class="mpm" width="32" height="32" viewBox="0 0 48 48" aria-hidden="true">'
        '<path class="mpm-coin" d="M40.65 16.71 A19.5 19.5 0 1 1 31.29 7.35 A6.8 6.8 0 0 0 40.65 16.71 Z"></path>'
        '<g class="mpm-pound" stroke-width="3.84"><path d="M27.96 20.65 C27.65 18.1 25.98 16.55 23.74 16.55 C21.2 16.55 19.53 18.35 19.53 20.89 L19.53 28.83 C19.53 30.75 18.85 31.99 17.3 33.05"></path>'
        '<path d="M17.3 33.05 L29.2 33.05"></path><path d="M16.8 25.73 L24.86 25.73"></path></g>'
        '<circle class="mpm-dot" cx="37.07" cy="10.93" r="5.4"></circle></svg>'
    )
    chat = (
        '<aside class="chatcol" aria-label="Chat">'
        '<div class="chh"><span class="mp-hl">Chat</span><span class="iconbtn" aria-label="New conversation"><span class="ms" aria-hidden="true">edit_square</span></span></div>'
        '<div class="chl">'
        '<div class="daysep">Mon 26 Oct</div>'
        '<div class="wme">Show me our October pace and 2046 projection after the Monzo transfer.</div>'
        '<div class="wai"><div class="amk"><i></i></div><div class="waib">'
        f'<div class="wtext">Recorded net worth is {nw_chat}, and October spending is {under_chat}. Every chart beside us comes straight from the deterministic engine; hover or drag any chart to inspect a point.</div>'
        '<div class="wcard"><span class="mp-over mp-ink2">Engine summary · Mon 26 Oct</span>'
        f'<div class="kvl"><span>Net worth</span><span>{nw_chat}</span></div>'
        f'<div class="kvl"><span>October budget</span><span>{under_chat}</span></div>'
        f'<div class="kvl"><span>2046 middle path</span><span>{mask("£3,697,000", priv)}</span></div>'
        "</div></div></div></div>"
        '<div class="chcomp">'
        '<div class="wchips"><span class="wchip"><span class="ms" aria-hidden="true">savings</span>October pace</span><span class="wchip"><span class="ms" aria-hidden="true">trending_up</span>2046 fan</span></div>'
        '<div class="cfld"><span class="ph">Ask MyPaisa about any figure</span><span class="sendb" aria-label="Send"><span class="ms" aria-hidden="true">arrow_upward</span></span></div>'
        "</div></aside>"
    )
    hero_blk = f"{hero}" if hero else ""
    return (
        f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div>'
        f'<div class="bf {width_cls} mp mp-app {theme}" data-mo-frame-root="1">'
        '<div class="pstat" aria-hidden="true"><span class="ms ms-s" aria-hidden="true">lock</span><span>dashboard.mypaisapp.com</span></div>'
        '<div class="mp-shell">'
        f'<aside class="mp-side mp-shell-side side" aria-label="MyPaisa"><div class="fx ac gap12 brand">{mark_svg}<span class="mp-hl">MyPaisa</span></div>{side_items}<div style="flex:1"></div><div class="mp-foot mp-ink2 side-ft">Arun · admin<br />dashboard.mypaisapp.com</div></aside>'
        '<main class="mp-shell-main"><div class="mp-pagepad">'
        f'<header class="mp-pagehead"><div><div class="mp-large">{title}</div><div class="mp-foot mp-ink2">Mon 26 Oct 2026 · Fri 23 Oct close · £1 = ₹112.50</div></div>'
        f'<div class="fx ac gap8"><div class="mp-seg whose" role="group" aria-label="Whose view"><button class="mp-seg-i on" aria-pressed="true">Household</button><button class="mp-seg-i">Me</button><button class="mp-seg-i">Asha</button></div>'
        f'<button class="{eye_cls}" aria-label="Privacy mode" aria-pressed="{"true" if priv else "false"}"><span class="ms" aria-hidden="true">{eye}</span></button></div></header>'
        f'{hero_blk}<div class="mp-cols"><div class="mp-col">{col1}</div><div class="mp-col">{col2}</div></div>'
        '<span class="mp-foot mp-ink2">Illustrative figures from the engine and price registry; nothing here can trade.</span>'
        f"</div></main>{chat}</div>"
        f'<nav class="mp-tabbar mp-shell-tabs wtabs" aria-label="Sections">{tabs}</nav>'
        "</div></div>"
    )


# ------------------------------------------------------------------ Canvas 1: ds-v1/Chart options.dc.html
PLAN_BAR = (
    '<b>Jira</b><span class="plan-k">MA-295</span><span>Dashboard &amp; app chart redesign</span>'
    '<b>Spec</b><span>ARCHITECTURE §6.2, §6.5, §9.1, §9.3, §9.4, §16, §19.7</span>'
    '<b>References</b><span>Apple HIG Charting Data · Monzo App &amp; Modular Web Design System · Warm ledger (tokens.css)</span>'
    '<b>Status</b><span>Picked: 1a · Monzo Pulse (Arun, 30 Oct 2026); 1b and 1c kept as record</span>'
)


def ds_pane(mode: str, theme: str, theme_lbl: str) -> str:
    return (
        f'<div class="pane mp {theme}" data-screen-label="DS Chart kit · {mode.upper()} · {theme_lbl}">'
        f'<div class="phead"><span class="mp-over mp-ink2">{theme_lbl} · tokens.css ({theme})</span>'
        '<span class="mp-foot mp-ink2">All 6 chart families · hover or drag any chart to scrub</span></div>'
        '<div class="spec-grid">'
        f'<div>{hero_block(mode, compact=True)}</div>'
        f'<div>{budget_card(mode)}</div>'
        f'<div>{projection_fan_card(mode)}</div>'
        f'<div>{surplus_columns_card(mode, "R1")}</div>'
        f'<div>{candles_card(mode)}</div>'
        f'<div>{wealth_mix_card(mode)}<div style="height:14px"></div>{pillars_card(mode)}</div>'
        "</div>"
        f"{scrub_anatomy_strip(mode)}"
        "</div>"
    )


def build_ds_board() -> str:
    intro = (
        "Three complete chart and graph directions for MyPaisa v4 (MA-295), conforming to Apple's Human Interface Guidelines "
        "(plain-language takeaway first, progressive-disclosure touch/pointer scrubbing, standard marks where colour is never "
        "the sole signal, Light/Dark + 25%-brightness contrast, and accessible summaries) and Monzo's mobile &amp; modular web "
        "design craft, without adding a single unmeasured colour outside <b>tokens.css</b>. Arun picked <b>1a · Monzo Pulse</b> "
        "on 30 Oct 2026; 1b and 1c stay on this canvas as the record. Every figure comes from the v4 household, future-plans "
        "and forecaster figure sets (Mon 26 Oct 2026)."
    )
    links = [
        ("1a", "1a · Monzo Pulse (Picked)"),
        ("1b", "1b · Apple Health Editorial (Not picked)"),
        ("1c", "1c · Monzo Modular Bento (Not picked)"),
    ]
    out = [intro_turn("DS", "MyPaisa DS v1 · Chart options: 1a Monzo Pulse picked", intro, PLAN_BAR, links)]

    specs = [
        (
            "1a",
            "Monzo Pulse",
            True,
            "",
            "a",
            "Fritsch-Carlson monotone cubic splines with a warm coral wash and a live endpoint beacon dot on the recorded net-worth pulse and 20-year fan; sculpted capsule meters with vertical 100%-plan ticks; zero-spine diverging pillars; rounded candles; and pointer/touch scrubbing.",
            [
                ("Picked (Arun, 30 Oct 2026):", "the chart spec for both doors (Swift Charts in ios/, LayerChart and lightweight-charts in web/, MA-56 and MA-279); gives the dashboard Monzo's tactile energy and warmth while keeping Warm ledger's calm surfaces and Apple HIG's plain-language hierarchy."),
                ("Monotone splines:", "never overshoot a real data point, so peaks and troughs stay truthful to the deterministic engine."),
                ("Plan ticks:", "every spending bar carries its vertical 100%-plan tick and ▲/▼ word cue, so overspend is clear without relying on colour."),
            ],
        ),
        (
            "1b",
            "Apple Health Editorial",
            False,
            "Not picked",
            "b",
            "Crisp editorial hairline grid and left Y-axis labels, a three-stat summary header strip (LOW / LATEST / HIGH) above each plot, jewel-like hollow dots, bullet-graph plan markers, and hollow-up / filled-down candles per Apple HIG Charts.",
            [
                ("Not picked (record):", "kept on this canvas as the options-round record; superseded by Arun's pick of 1a Monzo Pulse on 30 Oct 2026."),
                ("For:", "maximum typographic precision and familiar Apple Health / Stocks chart grammar, with explicit Y-axis benchmarks at rest."),
                ("Trade-off:", "quieter and more newspaper-editorial than Monzo's banking pulse; less warmth on the Home hero."),
            ],
        ),
        (
            "1c",
            "Monzo Modular Bento",
            False,
            "Not picked",
            "c",
            "Modular bento tiles with proportional recorded column bars in the Home hero, a ring/donut country-split tile (76% UK · 24% India), 10-cell quantized pot pace meters, chip-badged diverging pillars, and a 24px Daily Swing Rhythm Sub-Strip beneath the market candles.",
            [
                ("Not picked (record):", "kept on this canvas as the options-round record; superseded by Arun's pick of 1a Monzo Pulse on 30 Oct 2026."),
                ("For:", "high-glanceability modular cards inspired by Monzo's pots and modular web system, turning every ratio into countable blocks."),
                ("Trade-off:", "10-cell quantized meters round to ~10% steps at rest (exact pounds still sit in the label above each bar)."),
            ],
        ),
    ]

    for num, name, rec, alt, mode, lead, notes in specs:
        frames = [
            ds_pane(mode, LT, "Light"),
            ds_pane(mode, DK, "Dark"),
            iphone_frame(f"iPhone · DS Chart kit · {num} {name} · Light", LT, f"{hero_block(mode)}{budget_card(mode)}"),
            iphone_frame(f"iPhone · DS Chart kit · {num} {name} · Dark", DK, f"{hero_block(mode)}{budget_card(mode)}"),
        ]
        out.append(board_section(num, name, "MA-295 · tokens.css · §9.1 · §9.3", lead, frames, notes, rec=rec, alt=alt))

    return doc_wrap("MyPaisa DS v1: Chart options", "".join(out), include_ios=True)


# ------------------------------------------------------------------ Canvas 2: ios-v1/iPhone v4 · Chart options.dc.html
def build_ios_board() -> str:
    intro = (
        "The three chart redesign options (MA-295) inside MyPaisa iOS v1 shell 1a (Liquid Glass controls floating above "
        "solid Warm ledger cards, never glass on charts) on iPhone (402 pt, measured down to 320 pt Display Zoom) and iPad "
        "landscape (1180 pt, with sidebar and Chat beside it from 1133 pt). Arun picked <b>1a Monzo Pulse</b> on 30 Oct 2026 "
        "(1b and 1c stay here as the record); S1 to S3 draw 1a's picked states across Projection, Budget forecast, Market "
        "candles and Privacy mode."
    )
    links = [
        ("1a", "1a · Monzo Pulse (Picked)"),
        ("1b", "1b · Apple Health Editorial (Not picked)"),
        ("1c", "1c · Monzo Modular Bento (Not picked)"),
        ("S1", "S1 · Projection & Budget forecast (Picked)"),
        ("S2", "S2 · Market candles & pillars (Picked)"),
        ("S3", "S3 · Privacy mode (Picked)"),
    ]
    out = [intro_turn("IC", "iPhone and iPad · Dashboard charts: 1a Monzo Pulse picked", intro, PLAN_BAR, links)]

    for num, name, rec, alt, mode, why in [
        ("1a", "iPhone · Dashboard charts, Monzo Pulse", True, "", "a", "Picked on 30 Oct 2026: smooth monotone net-worth pulse in the navy hero with endpoint beacon, sculpted country/member meters and October spending pace with 100%-plan ticks, plus iPad two-column dashboard beside Chat."),
        ("1b", "iPhone · Dashboard charts, Apple Health Editorial", False, "Not picked", "b", "Kept as record (not picked): editorial hairline range rules, three-stat summary strips (SPENT / PLAN / SURPLUS), hollow data markers and bullet-graph plan benchmarks across iPhone and iPad."),
        ("1c", "iPhone · Dashboard charts, Monzo Modular Bento", False, "Not picked", "c", "Kept as record (not picked): proportional 5-day recorded ledger columns on the hero, ring/donut UK-India composition tile (76% / 24%), and 10-cell quantized pot pace meters across iPhone and iPad."),
    ]:
        ph_body = f"{hero_block(mode)}{wealth_mix_card(mode)}{budget_card(mode)}"
        frames = [
            iphone_frame(f"{num} · iPhone · Light", LT, ph_body),
            iphone_frame(f"{num} · iPhone · Dark", DK, ph_body),
            ipad_frame(f"{num} · iPad · Light", LT, f"{wealth_mix_card(mode)}{projection_fan_card(mode)}", f"{budget_card(mode)}", hero_block(mode, compact=True)),
        ]
        if rec:
            frames.append(ipad_frame(f"{num} · iPad · Dark", DK, f"{wealth_mix_card(mode)}{projection_fan_card(mode)}", f"{budget_card(mode)}", hero_block(mode, compact=True)))
        status_note = (
            ("Picked spec (30 Oct 2026):", "this option and S1 to S3 are the iOS chart spec for Swift Charts (MA-56, MA-279).")
            if rec
            else ("Not picked (record):", "stays on this canvas as the options-round record; superseded by 1a Monzo Pulse.")
        )
        notes = [
            status_note,
            ("HIG Charting Data:", "every chart leads with a plain-language takeaway, keeps calm at rest, and reveals per-point values on touch drag."),
            ("Liquid Glass boundary:", "only the toolbar buttons, composer and tab dock use Liquid Glass; chart surfaces stay solid Warm ledger for 25%-brightness contrast."),
            ("iPad width rule:", "the chat sits beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over)."),
        ]
        out.append(board_section(num, name, "MA-295 · §9.1 · §12", why, frames, notes, rec=rec, alt=alt))

    # Turn 2: 1a states
    s1_body_r1 = f"{projection_fan_card('a')}{surplus_columns_card('a', 'R1')}"
    s1_body_r4 = f"{projection_fan_card('a')}{surplus_columns_card('a', 'R4')}"
    out.append(board_section(
        "S1",
        "iPhone · Projection and Budget forecast charts",
        "MA-295 · §6.2 · §6.5 · §9.1",
        "Picked 1a Monzo Pulse applied to the 20-year Monte Carlo wealth fan (R26, 2026 to 2046) and the 20-year monthly surplus columns: Light shows R1 before rearranging (50 months below the £500 floor flagged in amber with dot markers), Dark shows R4 after rearranging and closing the HDFC loan (0 months below floor).",
        [
            iphone_frame("iPhone · Projection & R1 surplus (before rearranging) · Light", LT, s1_body_r1, title="Projection"),
            iphone_frame("iPhone · Projection & R4 surplus (0 below floor) · Dark", DK, s1_body_r4, title="Projection"),
        ],
        [
            ("Exact engine flag:", "amber bars follow the engine's below_floor count and negative leanest-month check, never the annual average alone."),
            ("Smooth conformal fan:", "monotone cubic boundaries enclose 8 in 10 runs in --mp-band, keeping the p50 spine above 3:1 contrast."),
        ],
        rec=True,
    ))

    s2_body = f"{candles_card('a')}{pillars_card('a')}"
    out.append(board_section(
        "S2",
        "iPhone · Market candles, fan and pillars",
        "MA-295 · §9.1 · §19.7",
        "Picked 1a Monzo Pulse on Asha's NASDAQ 100 ETF: 60 trading days of rounded candles to Fri 23 Oct, the 4-week conformal fan (−7% to +6%), measured double-top and support lines, and zero-spine diverging drivers.",
        [
            iphone_frame("iPhone · Market candles & pillars · Light", LT, s2_body, title="NASDAQ 100 ETF"),
            iphone_frame("iPhone · Market candles & pillars · Dark", DK, s2_body, title="NASDAQ 100 ETF"),
        ],
        [
            ("Risk before direction:", "21% chance of a fall over 5% leads the stat strip, followed by the 8-in-10 range and direction."),
            ("Zero-spine pillars:", "positive and negative drivers push left and right from one shared 50% spine with ▲/▼ point labels."),
        ],
        rec=True,
    ))

    s3_body = f"{hero_block('a', priv=True)}{wealth_mix_card('a', priv=True)}{budget_card('a', priv=True)}"
    out.append(board_section(
        "S3",
        "iPhone · Dashboard charts, privacy on",
        "MA-295 · §9.1",
        "With Privacy mode on, every pound and rupee figure in the hero, stat strips, meters and captions is masked with .mp-mask and interactive scrub tooltips are suppressed, while percentages, weekdays and chart geometry remain legible.",
        [
            iphone_frame("iPhone · Dashboard charts, privacy on · Light", LT, s3_body, priv=True),
            iphone_frame("iPhone · Dashboard charts, privacy on · Dark", DK, s3_body, priv=True),
        ],
        [
            ("No scrub leak:", "data-scrub is omitted or masked when privacy is active so dragging a chart cannot reveal hidden balances."),
        ],
        rec=True,
    ))

    return doc_wrap("iPhone v4 · Chart options", "".join(out), include_ios=True)


# ------------------------------------------------------------------ Canvas 3: app-v1/Web v4 · Chart options.dc.html
def build_web_board() -> str:
    intro = (
        "The three chart redesign options (MA-295) on the MyPaisa Web v4 adaptive shell (<b>tokens.css</b>), drawn at desktop "
        "1440 (sidebar, two-column dashboard and Chat beside it) and phone web 390 (single column with bottom tab bar, "
        "measured down to 320 px). Arun picked <b>1a Monzo Pulse</b> on 30 Oct 2026 (1b and 1c stay here as the record); "
        "W1 and W2 draw 1a's picked states across Projection, Budget forecast, Forecaster candles and Privacy mode."
    )
    links = [
        ("1a", "1a · Monzo Pulse (Picked)"),
        ("1b", "1b · Apple Health Editorial (Not picked)"),
        ("1c", "1c · Monzo Modular Bento (Not picked)"),
        ("W1", "W1 · Projection, Budget forecast & Forecaster (Picked)"),
        ("W2", "W2 · Privacy mode (Picked)"),
    ]
    out = [intro_turn("WC", "Web v4 · Dashboard charts: 1a Monzo Pulse picked", intro, PLAN_BAR, links)]

    for num, name, rec, alt, mode, why in [
        ("1a", "Browser · Dashboard charts, Monzo Pulse", True, "", "a", "Picked on 30 Oct 2026: smooth monotone net-worth pulse in the hero, sculpted UK/India and member meters with reference ticks, October spending pace with 100%-plan ticks, and the 20-year wealth range fan beside it at 1440 and 390."),
        ("1b", "Browser · Dashboard charts, Apple Health Editorial", False, "Not picked", "b", "Kept as record (not picked): editorial hairline grids, left Y-axis benchmarks, three-stat summary strips above every plot, hollow data dots and bullet-graph plan markers across Light and Dark."),
        ("1c", "Browser · Dashboard charts, Monzo Modular Bento", False, "Not picked", "c", "Kept as record (not picked): modular bento layout with proportional 5-day hero bars, ring/donut UK-India split (76% / 24%), and 10-cell quantized pot meters across Light and Dark."),
    ]:
        c1 = f"{wealth_mix_card(mode)}{projection_fan_card(mode)}"
        c2 = f"{budget_card(mode)}"
        frames = [
            browser_frame(f"{num} · Desktop 1440 · Light", LT, "w1440", hero_block(mode, compact=True), c1, c2),
            browser_frame(f"{num} · Desktop 1440 · Dark", DK, "w1440", hero_block(mode, compact=True), c1, c2),
        ]
        if rec:
            frames.append(browser_frame(f"{num} · Phone web 390 · Light", LT, "w390", hero_block(mode, compact=True), f"{wealth_mix_card(mode)}", f"{budget_card(mode)}"))
        status_note = (
            ("Picked spec (30 Oct 2026):", "this option and W1 to W2 are the web chart spec for LayerChart and lightweight-charts (MA-229, MA-279).")
            if rec
            else ("Not picked (record):", "stays on this canvas as the options-round record; superseded by 1a Monzo Pulse.")
        )
        notes = [
            status_note,
            ("One responsive markup:", "uses .mp-shell and .mp-cols so two columns at 1440 stack cleanly to one column under 700 px of page width and down to 320 px."),
            ("Read-only web posture:", "pointer hover and touch drag inspect any point on the chart; every write still goes through a chat card and Confirm."),
        ]
        out.append(board_section(num, name, "MA-295 · §9.3 · §9.4 · §12", why, frames, notes, rec=rec, alt=alt))

    # Turn 2: 1a states on Web
    w1_c1_lt = f"{projection_fan_card('a')}{surplus_columns_card('a', 'R1')}"
    w1_c1_dk = f"{projection_fan_card('a')}{surplus_columns_card('a', 'R4')}"
    w1_c2 = f"{candles_card('a')}{pillars_card('a')}"
    out.append(board_section(
        "W1",
        "Browser · Projection, Budget forecast and Forecaster charts",
        "MA-295 · §6.2 · §6.5 · §9.3 · §19.7",
        "Picked 1a Monzo Pulse across the analytical charts on desktop 1440: the 20-year Monte Carlo fan and monthly surplus columns on the left (R1 before rearranging in Light; R4 cleared in Dark), paired with NASDAQ 100 ETF 60-day rounded candles, 4-week conformal fan and zero-spine diverging drivers on the right.",
        [
            browser_frame("Browser · Analytical charts (R1 surplus) · 1440 Light", LT, "w1440", "", w1_c1_lt, w1_c2, title="Projection & Forecast"),
            browser_frame("Browser · Analytical charts (R4 cleared) · 1440 Dark", DK, "w1440", "", w1_c1_dk, w1_c2, title="Projection & Forecast"),
        ],
        [
            ("Shared grammar:", "every analytical chart shares the same 3-stat summary strip, monotone spline/rounded bar treatment, legend tokens and interactive hover/touch scrub pill."),
        ],
        rec=True,
    ))

    w2_c1 = f"{wealth_mix_card('a', priv=True)}{projection_fan_card('a', priv=True)}"
    w2_c2 = f"{budget_card('a', priv=True)}"
    out.append(board_section(
        "W2",
        "Browser · Dashboard charts, privacy on",
        "MA-295 · §9.3",
        "Privacy mode on desktop 1440 Light and phone web 390 Dark: every pound and rupee amount in the hero, stat strips, meters, legends and chat column is masked in .mp-mask, and hover scrubbing is suppressed.",
        [
            browser_frame("Browser · Dashboard charts, privacy on · 1440 Light", LT, "w1440", hero_block("a", priv=True, compact=True), w2_c1, w2_c2, priv=True),
            browser_frame("Browser · Dashboard charts, privacy on · 390 Dark", DK, "w390", hero_block("a", priv=True, compact=True), f"{wealth_mix_card('a', priv=True)}", w2_c2, priv=True),
        ],
        [
            ("Complete masking:", "both the dashboard cards and the adjacent chat summary mask every currency figure in lockstep."),
        ],
        rec=True,
    ))

    return doc_wrap("Web v4 · Chart options", "".join(out), include_ios=False)


def format_lines(html: str) -> str:
    return re.sub(r"(</div>|</section>|</nav>|</header>|</main>|</aside>|</line>|</rect>|</path>|</circle>)(?=<)", r"\1\n", html)


TARGETS = {
    ROOT / "docs/design/ds-v1/Chart options.dc.html": build_ds_board,
    ROOT / "docs/design/ios-v1/iPhone v4 · Chart options.dc.html": build_ios_board,
    ROOT / "docs/design/app-v1/Web v4 · Chart options.dc.html": build_web_board,
}


def main() -> int:
    built = {path: format_lines(fn()) for path, fn in TARGETS.items()}
    if sys.argv[1:] == ["--check"]:
        stale = [str(p.relative_to(ROOT)) for p, txt in built.items() if not p.is_file() or p.read_text() != txt]
        if stale:
            print("build_boards: stale -> " + ", ".join(stale))
            return 1
        print("build_boards: all 3 chart option canvases match the build")
        return 0
    for path, txt in built.items():
        path.write_text(txt)
        print("wrote", path.relative_to(ROOT), f"({len(txt):,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
