"""Draw the Forecaster's iOS boards (MA-281) from docs/design/figures/forecaster-v4.json.

A design aid: it writes two Claude Design canvases into the iOS mirror, byte for byte what is then sent to Claude Design
(MyPaisa iOS v1), so every frame takes its figures from one set (lesson 13) and the gates can measure them first:

  docs/design/ios-v1/iPhone v4 · Forecast.dc.html                 the options round: 1a, 1b and 1c on iPhone and iPad
  docs/design/ios-v1/iPhone v4 · Forecaster proof and chat.dc.html the screens every option shares

Run: python3 docs/design/reviews/MA-281/build_boards.py           (writes both canvases)
     python3 docs/design/reviews/MA-281/build_boards.py --check   (fails if the mirror's copies are not what it builds)
The boards use the kit as it is (tokens.css, ios.css, motion.css and motion.js); every colour is a token.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
FIG = json.loads((ROOT / "docs/design/figures/forecaster-v4.json").read_text())
N, B, R, P = FIG["nasdaq"], FIG["balanced"], FIG["review"], FIG["proof"]
OUT = ROOT / "docs/design/ios-v1"
MINUS = "−"


def sg(v: float, d: int = 0, plus: bool = True) -> str:
    s = f"{abs(v):.{d}f}"
    return (MINUS if v < 0 else ("+" if plus and v > 0 else "")) + s


def pc(v: float, d: int = 0, plus: bool = True) -> str:
    return sg(v, d, plus) + "%"


# ------------------------------------------------------------------ charts
DEFS: dict[str, str] = {}  # the SVG every chart of a canvas shares, drawn once and used by each chart


def defs_block() -> str:
    body = "".join(f'<g id="{k}">{v}</g>' for k, v in DEFS.items())
    return f'      <svg class="mp sdefs" width="0" height="0" aria-hidden="true"><defs>{body}</defs></svg>\n'


def ymap(v: float, lo: float, hi: float) -> float:
    return round((hi - v) / (hi - lo) * 100, 1)


def candle_chart(kind: str = "candles", layer: str = "patterns", h: int = 200, legend: bool = True, fund: bool = False) -> str:
    """The last 60 trading days and the next four weeks. kind: candles (an ETF) or line (a fund's daily price).
    layer: patterns (the patterns F8 found), similar (similar days over today's chart), range (the fan alone).

    The SVG stretches to its box (preserveAspectRatio none), so every stroked mark is drawn in the chart's own SVG, where
    the kit's non-scaling-stroke rule reaches it; the candles a canvas shares through <use> are filled rects only."""
    data = B["nav"] if fund else N["candles"]
    fanp = B["fan"] if fund else N["fan"]
    lo, hi = (-5.5, 4.5) if fund else (-9.5, 15.5)
    grid = [-4, -2, 0, 2, 4] if fund else [-5, 0, 5, 10]
    n_hist, n_fwd = len(data), len(fanp)
    span = n_hist + n_fwd
    gut, rgut = 9, 11  # the y labels' gutter on the left and the range's end labels' gutter on the right, both clear of marks
    xs = lambda i: round(gut + (i + 0.5) / span * (100 - gut - rgut), 2)  # noqa: E731
    x_today = round(gut + n_hist / span * (100 - gut - rgut), 2)
    assert xs(span - 1) < 100 - rgut
    svg = []
    for g in grid:
        svg.append(f'<line class="fgrid" x1="{gut}" x2="{100 - rgut}" y1="{ymap(g, lo, hi)}" y2="{ymap(g, lo, hi)}"></line>')
    # the fan: the 8 in 10 band, the middle half over it, and the middle
    if layer != "similar":
        for a, b in (("p90", "p10"), ("p75", "p25")):
            top = [(x_today, ymap(0, lo, hi))] + [(xs(n_hist + i), ymap(f[a], lo, hi)) for i, f in enumerate(fanp)]
            bot = [(xs(n_hist + i), ymap(f[b], lo, hi)) for i, f in enumerate(fanp)][::-1] + [(x_today, ymap(0, lo, hi))]
            svg.append('<path class="fband" d="M' + " L".join(f"{x} {y}" for x, y in top + bot) + ' Z"></path>')
        mid = [(x_today, ymap(0, lo, hi))] + [(xs(n_hist + i), ymap(f["p50"], lo, hi)) for i, f in enumerate(fanp)]
    else:
        mid = [(x_today, ymap(0, lo, hi))] + [(xs(n_hist + i - 1), ymap(N["similar"]["mid"] * i / n_fwd, lo, hi)) for i in range(2, n_fwd + 1, 2)]
    svg.append('<path class="fmid" d="M' + " L".join(f"{x} {y}" for x, y in mid) + '"></path>')
    svg.append(f'<line class="ftoday" x1="{x_today}" x2="{x_today}" y1="0" y2="100"></line>')
    lbl = []
    if fund:
        pts = " L".join(f"{xs(i)} {ymap(d['nav'], lo, hi)}" for i, d in enumerate(data))
        svg.append(f'<path class="navl" d="M{pts}"></path>')
        if layer == "patterns":  # the rising trend line through the three higher lows (the figure set checks it passes through them)
            t = B["trend"]
            days = [d["day"] for d in data]
            a, b = days.index(t["from"]), days.index(t["to"])
            slope = (t["y_to"] - t["y_from"]) / (b - a)
            y_end = t["y_from"] + slope * (n_hist - 1 - a)
            svg.append(f'<line class="ptrend" x1="{xs(a)}" x2="{xs(n_hist - 1)}" y1="{ymap(t["y_from"], lo, hi)}" y2="{ymap(y_end, lo, hi)}"></line>')
            lbl.append(f'<span class="pmk pmk-b" style="left: {xs(a + 12)}%; top: {ymap(t["y_from"] + slope * 12 - 0.55, lo, hi)}%" data-mo="fade">Higher lows</span>')
    else:
        if "nq-candles" not in DEFS:  # filled rects only: a body and a thin wick per bar
            g = []
            for i, c in enumerate(data):
                cls = "up" if c["up"] else "dn"
                x = xs(i)
                yh, yl = ymap(c["h"], lo, hi), ymap(c["l"], lo, hi)
                g.append(f'<rect class="cw {cls}" x="{round(x - 0.12, 2)}" y="{yh}" width="0.24" height="{round(max(yl - yh, 0.6), 1)}"></rect>')
                y1, y2 = ymap(max(c["o"], c["c"]), lo, hi), ymap(min(c["o"], c["c"]), lo, hi)
                g.append(f'<rect class="cb {cls}" x="{round(x - 0.42, 2)}" y="{y1}" width="0.84" height="{max(round(y2 - y1, 1), 0.6)}"></rect>')
            DEFS["nq-candles"] = "".join(g)
        svg.append('<use href="#nq-candles"></use>')
        if layer == "patterns":
            days = [c["day"] for c in data]
            p1, p2, br = days.index("Thu 1 Oct"), days.index("Wed 7 Oct"), days.index("Wed 14 Oct")
            sup = days.index("Wed 5 Aug")
            neck, support = N["neckline"], N["support"]
            svg.append(f'<line class="pneck" x1="{xs(p1 - 2)}" x2="{xs(br + 1)}" y1="{ymap(neck, lo, hi)}" y2="{ymap(neck, lo, hi)}"></line>')
            svg.append(f'<line class="psup" x1="{xs(sup)}" x2="{x_today}" y1="{ymap(support, lo, hi)}" y2="{ymap(support, lo, hi)}"></line>')
            lbl.append(f'<span class="pmk pmk-a" style="left: {round((xs(p1) + xs(p2)) / 2, 2)}%; top: {ymap(12.6, lo, hi)}%" data-mo="fade">Double top</span>')
            lbl.append(f'<span class="ptick" style="left: {xs(p1)}%; top: {ymap(10.3, lo, hi)}%"></span><span class="ptick" style="left: {xs(p2)}%; top: {ymap(10.4, lo, hi)}%"></span>')
            lbl.append(f'<span class="pmk pmk-b" style="left: {xs(22)}%; top: {ymap(support - 0.9, lo, hi)}%" data-mo="fade">Support −1%</span>')
        if layer == "similar":  # the 30 similar days from the figure set, each from Friday's close, every other trading day
            for pts in N["similar"]["paths"]:
                xy = [(x_today, ymap(pts[0], lo, hi))] + [(xs(n_hist + i - 1), ymap(v, lo, hi)) for i, v in zip(range(2, n_fwd + 1, 2), pts[1:])]
                svg.append('<path class="sim" d="M' + " L".join(f"{x} {y}" for x, y in xy) + '"></path>')
    for g in grid:
        lbl.append(f'<span class="yl" style="top: {ymap(g, lo, hi)}%" data-mo="fade">{pc(g)}</span>')
    f_last = fanp[-1]
    if layer != "similar":
        lbl.append(f'<span class="fl" style="top: {ymap(f_last["p90"], lo, hi)}%" data-mo="fade">{pc(f_last["p90"])}</span>')
        lbl.append(f'<span class="fl" style="top: {ymap(f_last["p10"], lo, hi)}%" data-mo="fade">{pc(f_last["p10"])}</span>')
    else:
        lbl.append(f'<span class="fl" style="top: {ymap(N["similar"]["mid"], lo, hi)}%" data-mo="fade">{pc(N["similar"]["mid"], 1)}</span>')
    lbl.append(f'<span class="tdl" style="left: {x_today}%" data-mo="fade">Fri 23 Oct close</span>')
    first = {}
    for i, c in enumerate(data):
        m = c["day"].split()[-1]
        first.setdefault(m, i)
    items = list(first.items())
    months = [(m, i) for k, (m, i) in enumerate(items) if i < n_hist - 6 and (k + 1 == len(items) or items[k + 1][1] - i >= 4)]  # a month of a day or two gets no label
    ax = [f'<span style="left: {xs(i)}%">{m}</span>' for m, i in months]
    nov = next(i for i, f in enumerate(fanp) if f["d"].startswith("2026-11"))   # Mon 2 Nov, the first trading day of November
    ax.append(f'<span style="left: {xs(n_hist + nov)}%">Nov</span>')
    who = "Balanced" if fund else "NASDAQ 100 ETF"
    if layer == "similar":
        s = N["similar"]
        aria = (f"{who}: daily candles for the last 60 trading days to Fri 23 Oct, then the {s['n']} most similar days since {s['since']} "
                f"drawn from Friday's close over four weeks: {s['recovered']} ended higher, the middle {pc(s['mid'], 1)}.")
    else:
        what = "a fund's daily price" if fund else "daily candles"
        aria = (f"{who}: {what} for the last 60 trading days to Fri 23 Oct, then the next four weeks: "
                f"8 times in 10 it ends between {pc(f_last['p10'])} and {pc(f_last['p90'])}, the middle {pc(f_last['p50'], 1)}.")
    leg = []
    if legend:
        if fund:
            leg = ['<span><i class="sw-navl"></i>Price, once a day</span>']
        else:
            leg = ['<span><i class="sw-up"></i>▲ day up</span>', '<span><i class="sw-dn"></i>▼ day down</span>']
        leg += (['<span><i class="sw-band"></i>8 in 10 end inside</span>'] if layer != "similar" else []) + ['<span><i class="sw-mid"></i>the middle</span>']
        if layer == "patterns" and not fund:
            leg += ['<span><i class="sw-pa"></i>double top, neckline</span>', '<span><i class="sw-pb"></i>support</span>']
        if layer == "patterns" and fund:
            leg += ['<span><i class="sw-pb"></i>trend line</span>']
        if layer == "similar":
            leg += ['<span><i class="sw-sim"></i>each similar day, after</span>']
    return (f'<div class="fcw" style="--ch: {h}px"><div class="mp-chartbox fcbox" role="img" aria-label="{aria}">'
            f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{"".join(svg)}</svg>{"".join(lbl)}</div>'
            f'<div class="mp-chartaxis" aria-hidden="true">{"".join(ax)}</div>'
            + (f'<div class="lgd oncard">{"".join(leg)}</div>' if leg else "") + "</div>")


# ------------------------------------------------------------------ pieces
def chip_practice(on_hero: bool = False) -> str:
    return f'<span class="mp-chip {"prc-h" if on_hero else "mp-neutral"}"><span class="ms ms-s">science</span>In practice · week 5 of 8</span>'


def stance_chip(s: str, c: int) -> str:
    cls = {"PAUSE": "mp-pause", "HOLD": "mp-hold"}[s]
    return f'<span class="mp-chip {cls}">{s} · {c}%</span>'


def three_figs(h: dict, compact: bool = False) -> str:
    cells = [
        ("A fall over 5%", f'{h["fall5"]}%', f'usually {h["fall5_usual"]}%'),
        ("Likely range", f'{pc(h["lo"])} … {pc(h["hi"])}', "8 in 10 end inside"),  # nowrap in .f3n
        ("Up in 4 weeks", f'{h["up"]}%', "close to even" if abs(h["up"] - 50) <= 5 else ("more likely than not" if h["up"] > 50 else "less likely than not")),
    ]
    return '<div class="fig3' + (" cpt" if compact else "") + '">' + "".join(
        f'<div class="f3c"><span class="mp-foot mp-hero-2">{a}</span><span class="f3n">{b}</span><span class="mp-foot mp-hero-2">{c}</span></div>'
        for a, b, c in cells) + "</div>"


def rules_line(h: dict, rules: dict, agree: str, on_hero: bool = True) -> str:
    c2 = "mp-hero-2" if on_hero else "mp-ink2"
    return (f'<div class="rl{" rl-h" if on_hero else ""}"><div class="fx ac jb gap8 wrapr"><span class="mp-foot {c2}">The rules engine, beside it</span>{stance_chip(rules["stance"], rules["conf"])}</div>'
            f'<span class="mp-sub">{rules["line"]}.</span><span class="agree mp-foot"><span class="ms ms-s">compare_arrows</span>{agree}</span></div>')


def pattern_rows(fund: bool = False) -> str:
    pats = B["patterns"] if fund else N["patterns"]
    rows = []
    for p in pats:
        if not p["edge"]:
            continue
        if "lower" in p:
            res = f'Lower {p["after"]} later in {p["lower"]} of {p["cases"]} cases since 2015 · average {pc(p["avg"], 1)}'
        elif "held" in p:
            res = f'Held in {p["held"]} of {p["cases"]} tests since 2015 · average {pc(p["avg"], 1)} after {p["after"]}'
        else:
            res = f'Higher {p["after"]} later in {p["higher"]} of {p["cases"]} cases since 2015 · average {pc(p["avg"], 1)}'
        mk = "mk-pa" if p["name"] == "Double top" else "mk-pb"
        rows.append(f'<div class="mp-row rowc"><span class="mk"><i class="{mk}"></i></span><span class="grow"><span class="mp-sub mp-w6">{p["name"]}</span>'
                    f'<span class="mp-foot mp-ink2">{p["where"][0].upper() + p["where"][1:]}</span><span class="mp-foot">{res}</span></span><span class="ms chev">chevron_right</span></div>')
    return '<div class="mp-group">' + "".join(rows) + "</div>"


def summary_rows(fund: bool = False) -> str:
    """One row per model, each opening its sheet (the sheets are drawn before MA-124 starts). A pattern with no edge is
    never shown (ARCHITECTURE 19.4)."""
    x = B if fund else N
    m, s = x["mood"], x["similar"]
    ev = x["events"][0]
    tech = x["technical"] if fund else f'ADX {N["technical"]["adx"]} · stochastic {N["technical"]["stoch"]} · {N["technical"]["ichimoku"]}'
    rows = [
        ("mood", "Market mood", f'{m["now"]} since {m["since"]} · {m["next"][0][1]}% it stays so over the next 4 weeks'),
        ("history", "Similar days", f'{s["n"]} since {s["since"]} · {s["recovered"]} higher 4 weeks later'),
        ("event", "Event impacts", f'{ev[0]} weighs most: {pc(ev[2], 1)} in the 4 weeks after, on average over {ev[1]} cases'),
        ("tune", "Main drivers", f'From a usual {x["usual_up"]}% chance of being up to {x["headline"]["up"]}%'),
        ("candlestick_chart" if not fund else "show_chart", "Technical", tech),
    ]
    return '<div class="mp-group">' + "".join(
        f'<div class="mp-row rowc"><span class="mp-icontile mp-neutral"><span class="ms ms-s">{i}</span></span><span class="grow"><span class="mp-sub mp-w6">{a}</span>'
        f'<span class="mp-foot mp-ink2">{b}</span></span><span class="ms chev">chevron_right</span></div>' for i, a, b in rows) + "</div>"


def tracks(fund: bool = False) -> str:
    tr = (B if fund else N)["track"]
    beat = tr["fc"]["beat"]
    graded = [b for b in beat if b is not None]
    wk = "".join(f'<span class="wkc {"ok" if b else "tbd"}">{"✓ " if b else ""}W{k + 1}</span>' for k, b in enumerate(beat))
    return (f'<div class="trk"><div class="mp-card tc"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">Rules engine</span><span class="mp-chip mp-neutral">Live</span></div>'
            f'<span class="mp-num-l">{tr["rules"]["held"]} of {tr["rules"]["of"]}</span><span class="mp-foot mp-ink2">{tr["rules"]["what"].split(" (")[0]}, graded against waiting</span></div>'
            f'<div class="mp-card tc"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">Forecaster</span><span class="mp-chip mp-neutral">In practice</span></div>'
            f'<span class="mp-num-l">{sum(graded)} of {len(graded)}</span><span class="mp-foot mp-ink2">weeks so far beat both the base rate and the rules engine</span><div class="wks">{wk}</div></div></div>')


def footer() -> str:
    return (f'<p class="pp mp-foot mp-ink2 endn">Every figure comes from code: the Forecast row of {N["run"]} (model {N["model"]}, trained on data to {N["data_to"]}). '
            'Claude only puts them into words. A view, not advice: MyPaisa cannot trade. Illustrative figures (forecaster-v4.json).</p>')


def ask_chips(extra: str = "") -> str:
    return ('<div class="chiprow"><span class="cbtn"><span class="ms">chat_bubble</span>Why? in the chat</span>'
            '<span class="cbtn"><span class="ms">fact_check</span>How it proves itself</span>' + extra + "</div>")


def seg_tabs(on: str = "Forecast") -> str:
    return '<div class="mp-seg" role="group" aria-label="Holding">' + "".join(
        f'<button class="mp-seg-i{" on" if t == on else ""}" aria-pressed="{"true" if t == on else "false"}">{t}</button>' for t in ("Overview", "Forecast", "Track record")) + "</div>"


def meta(priv: bool = False, fund: bool = False) -> str:
    amount = f'£{(B if fund else N)["value_gbp"]:,}'
    v = f'<span class="mp-mask">{amount}</span>' if priv else amount
    who = f'{B["full"]} · Arun · ISA' if fund else f'{N["full"]} · Asha · ISA'
    return f'<div class="mp-foot mp-ink2 meta">{who} · {v}</div>'


def mood_bar() -> str:
    m = N["mood"]
    col = {"Calm and rising": "mc-1", "Choppy": "mc-2", "Stressed": "mc-3", "Falling": "mc-4"}
    tl = "".join(f'<span class="mseg {col[a]}" style="flex: 1"></span>' for a, _ in m["timeline"])
    tlab = "".join(f'<span>{b}</span>' for _, b in m["timeline"])
    nxt = "".join(f'<span class="mseg {col[a]}" style="flex: {v}"></span>' for a, v in m["next"])
    rows = "".join(f'<div class="kv"><span class="fx ac gap8"><i class="msw {col[a]}"></i>{a}</span><span>{v}%</span></div>' for a, v in m["next"])
    return (f'<div class="mp-card mc"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">Market mood</span><span class="mp-chip mp-pause">{m["now"]} · since {m["since"]}</span></div>'
            f'<span class="mp-foot mp-ink2">US shares, the last 120 trading days, smoothed so it does not flip daily</span><div class="mbar">{tl}</div><div class="mlab mp-foot mp-ink2">{tlab}</div>'
            f'<span class="mp-over mp-ink2">The next 4 weeks</span><div class="mbar">{nxt}</div>{rows}</div>')


def drivers_card() -> str:
    rows = "".join(
        f'<div class="drv"><span class="mp-sub">{a}</span><span class="dbar mp-track"><i class="{"dfor" if v > 0 else "dag"}" style="{"left: 50%" if v > 0 else "right: 50%"}; width: {abs(v) * 10}%"></i></span>'
        f'<span class="mp-sub mp-w6 dv">{sg(v)} {"pt" if abs(v) == 1 else "pts"}</span></div>' for a, v in N["drivers"])
    return (f'<div class="mp-card"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">Main drivers</span><span class="lgd"><span><i class="sw-for"></i>lifts</span><span><i class="sw-ag"></i>lowers</span></span></div>'
            f'<span class="mp-foot mp-ink2">From a usual {N["usual_up"]}% chance of being up to {N["headline"]["up"]}% today, in points</span>{rows}</div>')


def events_card(n: int = 7) -> str:
    rows = "".join(
        f'<div class="evr"><span class="mp-sub">{a}{" <span class=\"mp-chip mp-neutral lowc\">low confidence</span>" if low else ""}</span><span class="mp-foot mp-ink2 evn">{c} cases</span>'
        f'<span class="mp-sub mp-w6 {"mp-up" if v > 0 else "mp-dq"}">{"▲" if v > 0 else "▼"} {pc(v, 1)}</span></div>' for a, c, v, low in N["events"][:n])
    return (f'<div class="mp-card"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">Event impacts</span><span class="mp-foot mp-ink2">4 weeks after, since 2015</span></div>'
            f'<span class="mp-foot mp-ink2">How this ETF moved in the 4 weeks after each kind of event, on average</span>{rows}</div>')


def similar_card(chart: bool = True) -> str:
    s = N["similar"]
    body = candle_chart(layer="similar", h=150) if chart else ""
    return (f'<div class="mp-card oncard"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">Similar days</span><span class="mp-foot mp-ink2">since {s["since"]}</span></div>'
            f'<span class="mp-foot mp-ink2">{s["n"]} days since {s["since"]} looked most like today; {s["recovered"]} recovered within 4 weeks. The middle of what followed: {pc(s["mid"], 1)}.</span>{body}</div>')


def technical_card() -> str:
    t = N["technical"]
    rows = [("Trend strength (ADX)", f'{t["adx"]}, a trend'), ("Stochastic", f'{t["stoch"]}, near oversold'), ("On-balance volume", t["obv"]),
            ("Ichimoku", t["ichimoku"]), ("Donchian (20 days)", t["donchian"]), ("Keltner", t["keltner"]), ("RSI and MACD", f'RSI {t["rsi"]} · MACD {t["macd"]}'),
            ("Averages", t["ema"])]
    return ('<div class="mp-card"><span class="mp-hl">Technical</span><span class="mp-foot mp-ink2">The wider set the Forecaster reads (F8), beside the rules engine’s</span>'
            + "".join(f'<div class="kv kvw"><span>{a}</span><span>{b}</span></div>' for a, b in rows) + "</div>")


# ------------------------------------------------------------------ the three options' Forecast tab
def body_1a(priv: bool = False, scrolled: bool = False, wide: bool = False) -> str:
    h = N["headline"]
    hero = (f'<div class="mp-hero heroF"><div class="fx ac jb gap8 wrapr"><span class="mp-over mp-hero-2">Next 4 weeks · the Forecaster</span>{chip_practice(True)}</div>'
            f'{three_figs(h)}{rules_line(h, N["rules"], N["agree"])}</div>')
    chart = (f'<div class="mp-card oncard"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">The chart, then the next 4 weeks</span><span class="mp-foot mp-ink2">60 trading days</span></div>'
             f'{candle_chart()}</div>')
    pats = f'<div class="sech"><span class="mp-over mp-ink2">Patterns on the chart</span><span class="mp-foot mp-ink2">each measured on this ETF</span></div>{pattern_rows()}'
    more = f'<div class="sech"><span class="mp-over mp-ink2">Why it says so</span><span class="mp-foot mp-ink2">one tap for each</span></div>{summary_rows()}'
    tr = f'<div class="sech"><span class="mp-over mp-ink2">Track records</span><span class="mp-foot mp-ink2">side by side</span></div>{tracks()}'
    if wide:
        return f'{meta(priv)}{seg_tabs()}{hero}{chart}{ask_chips()}<div class="g2"><div class="dv-col gap14">{pats}</div><div class="dv-col gap14">{more}{tr}</div></div>{footer()}'
    return f'{meta(priv)}{seg_tabs()}{hero}{chart}{ask_chips()}{pats}{more}{tr}{footer()}'


def body_1b(layer: str = "patterns", wide: bool = False) -> str:
    h = N["headline"]
    strip = ('<div class="stat3">' + "".join(
        f'<div class="st"><span class="mp-foot mp-ink2">{a}</span><span class="stn">{b}</span><span class="mp-foot mp-ink2">{c}</span></div>' for a, b, c in [
            ("Fall over 5%", f'{h["fall5"]}%', f'usually {h["fall5_usual"]}%'), ("Likely range", f'{pc(h["lo"])} … {pc(h["hi"])}', "8 in 10 inside"),
            ("Up in 4 weeks", f'{h["up"]}%', "close to even")]) + "</div>")
    rules = (f'<div class="rrow"><span class="mp-foot mp-ink2">Rules engine</span>{stance_chip("PAUSE", 64)}<span class="mp-foot agree2"><span class="ms ms-s">compare_arrows</span>both cautious</span>{chip_practice()}</div>')
    lay = '<div class="mp-seg" role="group" aria-label="Layer">' + "".join(
        f'<button class="mp-seg-i{" on" if k == layer else ""}" aria-pressed="{"true" if k == layer else "false"}">{t}</button>'
        for k, t in (("range", "Range"), ("patterns", "Patterns"), ("similar", "Similar"), ("events", "Events"))) + "</div>"
    ch_layer = "range" if layer == "events" else layer
    chart = f'<div class="mp-card oncard tall">{lay}{candle_chart(layer=ch_layer, h=250 if not wide else 300)}</div>'
    if layer == "patterns":
        panel = f'<div class="sech"><span class="mp-over mp-ink2">On the chart now</span><span class="mp-foot mp-ink2">2 with an edge</span></div>{pattern_rows()}'
    elif layer == "similar":
        s = N["similar"]
        panel = (f'<div class="mp-card"><span class="mp-hl">{s["recovered"]} of {s["n"]} recovered within 4 weeks</span><span class="mp-foot mp-ink2">The {s["n"]} days since {s["since"]} most like today, '
                 f'each drawn from Friday’s close. The middle of what followed: {pc(s["mid"], 1)}.</span></div>{mood_bar()}')
    else:
        panel = events_card()
    rest = f'<div class="sech"><span class="mp-over mp-ink2">The rest</span><span class="mp-foot mp-ink2">one tap for each</span></div>{summary_rows()}{tracks()}'
    if wide:
        return f'{meta()}{seg_tabs()}{strip}{rules}{chart}<div class="g2"><div class="dv-col gap14">{panel}</div><div class="dv-col gap14">{rest}</div></div>{footer()}'
    return f'{meta()}{seg_tabs()}{strip}{rules}{chart}{panel}{rest}{footer()}'


def qa(q: str, a: str, sub: str, open_: str = "", icon: str = "help") -> str:
    return (f'<div class="mp-card qa{" open" if open_ else ""}"><div class="qh"><span class="mp-icontile mp-neutral"><span class="ms ms-s">{icon}</span></span><span class="grow"><span class="mp-sub mp-w6">{q}</span>'
            f'<span class="qan">{a}</span><span class="mp-foot mp-ink2">{sub}</span></span><span class="ms chev">{"expand_less" if open_ else "expand_more"}</span></div>{open_}</div>')


def body_1c(open_q: str = "chart", wide: bool = False) -> str:
    h = N["headline"]
    s, ev = N["similar"], N["events"][0]
    hero = (f'<div class="mp-hero heroF"><div class="fx ac jb gap8 wrapr"><span class="mp-over mp-hero-2">Next 4 weeks · the Forecaster</span>{chip_practice(True)}</div>'
            f'<p class="story">Rougher weeks than usual look likely. Up or down is close to even.</p>'
            f'<span class="mp-foot mp-hero-2"><span class="nw">{h["fall5"]}% chance of a fall over 5%</span> (usually {h["fall5_usual"]}%) · <span class="nw">{pc(h["lo"])} … {pc(h["hi"])}</span> likely · {h["up"]}% up</span></div>')
    chart_open = f'<div class="qb">{candle_chart(h=170)}{pattern_rows()}</div>' if open_q == "chart" else ""
    sim_open = f'<div class="qb">{candle_chart(layer="similar", h=150)}</div>' if open_q == "similar" else ""
    agree_open = f'<div class="qb">{rules_line(h, N["rules"], N["agree"], on_hero=False)}</div>' if open_q == "agree" else ""
    qs = [
        qa("How rough could the next 4 weeks be?", f'{h["fall5"]}% chance of a fall over 5%', f'usually {h["fall5_usual"]}%; the likely range is <span class="nw">{pc(h["lo"])} … {pc(h["hi"])}</span>', icon="waves"),
        qa("What is the chart showing?", "A double top, and support near −1%", "2 patterns with an edge on this ETF", chart_open, icon="candlestick_chart"),
        qa("Which way is it leaning?", f'{h["up"]}% chance of being up', f'close to even; from a usual {N["usual_up"]}%, momentum fading weighs most', icon="explore"),
        qa("What happened on days like today?", f'{s["recovered"]} of {s["n"]} recovered within 4 weeks', f'the middle of what followed: {pc(s["mid"], 1)}', sim_open, icon="history"),
        qa("What usually follows news like this?", f'{ev[0]}: {pc(ev[2], 1)} on average', f'over {ev[1]} cases since 2015; the mood is stressed since Sat 3 Oct', icon="event"),
        qa("Do the two engines agree?", "Yes: both lean cautious", "the rules engine says PAUSE · 64%", agree_open, icon="compare_arrows"),
        qa("How good has it been?", "5 of 5 weeks so far beat both", "in practice, week 5 of 8; the rules engine’s calls held up 31 of 46 times", icon="fact_check"),
    ]
    if wide:
        op = [q for q in qs if " open" in q[:40]]
        rest = [q for q in qs if q not in op]
        return f'{meta()}{seg_tabs()}{hero}{"".join(op)}<div class="g2"><div class="dv-col gap14">{"".join(rest[:3])}</div><div class="dv-col gap14">{"".join(rest[3:])}</div></div>{ask_chips()}{footer()}'
    return f'{meta()}{seg_tabs()}{hero}{"".join(qs)}{ask_chips()}{footer()}'


def body_fund(wide: bool = False) -> str:
    h = B["headline"]
    hero = (f'<div class="mp-hero heroF"><div class="fx ac jb gap8 wrapr"><span class="mp-over mp-hero-2">Next 4 weeks · the Forecaster</span>{chip_practice(True)}</div>'
            f'{three_figs(h)}{rules_line(h, B["rules"], B["agree"])}</div>')
    chart = (f'<div class="mp-card oncard"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">The price, then the next 4 weeks</span><span class="mp-foot mp-ink2">60 trading days</span></div>'
             f'{candle_chart(kind="line", fund=True)}<div class="note inl"><span class="ms">info</span><span class="mp-foot mp-ink2">{B["nav_note"]}</span></div></div>')
    pats = f'<div class="sech"><span class="mp-over mp-ink2">Patterns on its price</span><span class="mp-foot mp-ink2">line patterns only</span></div>{pattern_rows(fund=True)}'
    more = f'<div class="sech"><span class="mp-over mp-ink2">Why it says so</span><span class="mp-foot mp-ink2">one tap for each</span></div>{summary_rows(fund=True)}'
    tr = f'<div class="sech"><span class="mp-over mp-ink2">Track records</span><span class="mp-foot mp-ink2">side by side</span></div>{tracks(fund=True)}'
    return f'{meta(fund=True)}{seg_tabs()}{hero}{chart}{ask_chips()}{pats}{more}{tr}{footer()}'


# ------------------------------------------------------------------ frames
SB = '<span class="sbar-ic"><span class="ms">signal_cellular_alt</span><span class="ms">wifi</span><span class="ms">battery_horiz_075</span></span>'
TABS = [("chat_bubble", "Chat"), ("home", "Home"), ("insights", "Activity"), ("account_circle", "You")]


def tabdock(on: str = "Home") -> str:
    return ('<div class="edge-bot"></div><div class="tabdock"><div class="tabs lg">' + "".join(
        f'<span class="tab{" on" if l == on else ""}"><span class="ms">{i}</span>{l}</span>' for i, l in TABS) + '</div><span class="tabsearch lg"><span class="ms z1">search</span></span></div>')


def iphone(cap: str, theme: str, body: str, title: str = "NASDAQ 100 ETF", off: int = 0, priv: bool = False, back: str = "Assets") -> str:
    eye = "visibility_off" if priv else "visibility"
    small = off > 0
    nav = (f'<div class="nav"><span class="gbtn lg" aria-label="Back to {back}"><span class="ms z1">chevron_left</span></span>'
           + (f'<span class="navc">{title}</span>' if small else "") +
           f'<span class="gbtn lg" aria-label="Privacy mode" aria-pressed="{"true" if priv else "false"}"><span class="ms z1">{eye}</span></span></div>')
    lt = "" if small else f'<div class="largetitle lt2">{title}</div>'
    fade = '<div class="fadet"></div>' if small else ""
    return (f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div><div class="dev dev-iphone mp {theme}"><div class="island"></div><div class="scrn">'
            f'<div class="sbar"><span>9:41</span>{SB}</div>{nav}{lt}<div class="scroll">{fade}<div class="pg" style="margin-top: -{off}px">{body}</div></div>{tabdock()}</div></div></div>')


SIDE = [("chat_bubble", "Chat"), ("home", "Home"), ("donut_small", "Assets"), ("credit_card", "Debts"), ("savings", "Budget"), ("trending_up", "Projection"), ("insights", "Activity"), ("history", "Audit")]


def chat_column(q: str, a: str, chips: tuple[str, str] = ("Why?", "Track record")) -> str:
    return ('<div class="insp"><div class="sbar sbar-r"><span class="sbar-ic"><span class="ms">wifi</span><span class="ms">battery_horiz_075</span></span></div>'
            '<div class="nav"><span class="mp-hl">Chat</span><span class="gbtn lg"><span class="ms z1">edit_square</span></span></div><div class="chfadet"></div>'
            f'<div class="ichat"><div class="chat"><div class="daysep">Today</div><div class="me">{q}</div><div class="me-time">09:38</div>'
            f'<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="ai-text">{a}</div></div></div></div></div><div class="edge-bot"></div>'
            f'<div class="composer cb20"><div class="chips"><span class="gchip lg"><span class="ms">help</span><span>{chips[0]}</span></span><span class="gchip lg"><span class="ms">fact_check</span><span>{chips[1]}</span></span></div>'
            '<div class="cbar"><span class="cplus lg"><span class="ms z1">add</span></span><span class="cfield lg"><span class="ph">Ask about this holding</span><span class="csend mp-ink2 z1"><span class="ms">mic</span></span></span></div></div></div>')


CHAT_Q = "Why is my NASDAQ ETF on PAUSE?"
CHAT_A = (f"The rules engine says {N['rules']['stance']} · {N['rules']['conf']}%: {N['rules']['line'][0].lower() + N['rules']['line'][1:]}. "
          "Why? opens its pillars. The Forecaster is still in practice on this ETF, week 5 of 8, so its own view shows only on this "
          "holding’s Forecast tab and in Saturday’s review, labelled in practice, never in the chat. A view, not advice.")


def ipad(cap: str, theme: str, body: str, title: str = "NASDAQ 100 ETF") -> str:
    side = "".join(f'<span class="side-i{" on" if l == "Assets" else ""}"><span class="ms">{i}</span>{l}</span>' for i, l in SIDE)
    return (f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div><div class="dev dev-ipad-l mp ipad {theme}"><div class="scrn srow">'
            f'<div class="sidebar sb lg"><div class="side-h sh0">MyPaisa</div>{side}<div class="side-h">Asha</div><span class="side-i"><span class="ms">account_circle</span>You</span></div>'
            f'<div class="main"><div class="sbar"><span>9:41 Mon 26 Oct</span><span></span></div>'
            f'<div class="nav"><span class="navl"><span class="gbtn lg" aria-label="Back to Assets"><span class="ms z1">chevron_left</span></span><span class="largetitle navt">{title}</span></span>'
            '<span class="navr"><span class="gbtn lg" aria-label="Privacy mode" aria-pressed="false"><span class="ms z1">visibility</span></span></span></div>'
            f'<div class="scroll"><div class="ipg" style="margin-top: @@OFF@@">{body}</div></div><div class="edge-bot"></div></div>{chat_column(CHAT_Q, CHAT_A)}</div></div></div>')


def fold(cap: str, theme: str, body: str, open_: bool) -> str:
    if not open_:
        return (f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div><div class="dev dev-fold-shut mp {theme}"><div class="island"></div><div class="scrn">'
                f'<div class="sbar"><span>9:41</span>{SB}</div><div class="nav"><span class="gbtn lg" aria-label="Back to Assets"><span class="ms z1">chevron_left</span></span>'
                f'<span class="gbtn lg" aria-label="Privacy mode" aria-pressed="false"><span class="ms z1">visibility</span></span></div><div class="largetitle lt2">NASDAQ 100 ETF</div>'
                f'<div class="scroll"><div class="pg">{body}</div></div>{tabdock()}</div></div></div>')
    top = "".join(f'<span class="ttab{" on" if l == "Home" else ""}"><span class="ms">{i}</span>{l}</span>' for i, l in TABS)
    return (f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div><div class="dev dev-fold-open mp {theme}"><div class="scrn">'
            f'<div class="sbar"><span>9:41</span>{SB}</div><div class="toptabs"><div class="tabs lg ttabs">{top}</div></div>'
            f'<div class="nav"><span class="navl"><span class="gbtn lg" aria-label="Back to Assets"><span class="ms z1">chevron_left</span></span><span class="largetitle navt">NASDAQ 100 ETF</span></span>'
            '<span class="navr"><span class="gbtn lg" aria-label="Privacy mode" aria-pressed="false"><span class="ms z1">visibility</span></span><span class="gtext lg"><span class="ms z1">chat_bubble</span><span class="z1">Ask</span></span></span></div>'
            f'<div class="scroll"><div class="ipg">{body}</div></div><div class="edge-bot"></div></div></div></div>')


# ------------------------------------------------------------------ frames that share one screen (light, dark, scrolled)
LISTS: dict[str, list[dict]] = {}  # each shared group's frames, given to the canvas's template by its logic class


def group(name: str, frames: list[tuple[str, str, int]], device: str) -> str:
    """One screen drawn once for several frames: (caption, theme, scroll offset). device holds the {{ t.* }} holes."""
    LISTS[name] = [{"anchor": f"{name}-{k}", "cap": cap, "c": th, "off": f"-{off}px" if off else "0px", "small": off > 0, "large": off == 0}
                   for k, (cap, th, off) in enumerate(frames)]
    return f'<sc-for list="{{{{ {name} }}}}" as="t" hint-placeholder-count="{len(frames)}">{device}</sc-for>'


def iphone_t(body: str, title: str = "NASDAQ 100 ETF", priv: bool = False, back: str = "Assets") -> str:
    eye = "visibility_off" if priv else "visibility"
    nav = (f'<div class="nav"><span class="gbtn lg" aria-label="Back to {back}"><span class="ms z1">chevron_left</span></span>'
           f'<sc-if value="{{{{ t.small }}}}"><span class="navc">{title}</span></sc-if>'
           f'<span class="gbtn lg" aria-label="Privacy mode" aria-pressed="{"true" if priv else "false"}"><span class="ms z1">{eye}</span></span></div>')
    return ('<div class="dv-col" data-screen-label="{{ t.cap }}"><div class="bd-theme">{{ t.cap }}</div><div class="dev dev-iphone mp {{ t.c }}"><div class="island"></div><div class="scrn">'
            f'<div class="sbar"><span>9:41</span>{SB}</div>{nav}<sc-if value="{{{{ t.large }}}}"><div class="largetitle lt2">{title}</div></sc-if>'
            f'<div class="scroll"><sc-if value="{{{{ t.small }}}}"><div class="fadet"></div></sc-if><div class="pg" style="margin-top: {{{{ t.off }}}}">{body}</div></div>{tabdock()}</div></div></div>')


def ipad_t(body: str, title: str = "NASDAQ 100 ETF") -> str:
    one = ipad("@@CAP@@", "@@TH@@", body, title)
    return one.replace("@@CAP@@", "{{ t.cap }}").replace("@@TH@@", "{{ t.c }}").replace("@@OFF@@", "{{ t.off }}")


def logic() -> str:
    def lit(v):
        if isinstance(v, bool):
            return "true" if v else "false"
        return "'" + str(v).replace("\\", "\\\\").replace("'", "\\'") + "'"
    rows = []
    for name, frames in LISTS.items():
        objs = ", ".join("{ " + ", ".join(f"{k}: {lit(v)}" for k, v in f.items()) + " }" for f in frames)
        rows.append(f"          {name}: [{objs}],")
    return "\n".join(rows)


# ------------------------------------------------------------------ the chat's card and the proof page
def chat_card(c: dict, tech: bool = False) -> str:
    if c["state"] == "no_view":
        return (f'<div class="ccard"><div class="ccard-h"><span class="mp-over mp-ink2">Forecaster · in practice · 4 weeks</span><span class="mp-hl">{c["name"]}</span></div>'
                f'<div class="ccard-b"><div class="kv"><span>Rules engine</span><span>{c["rules"]}</span></div><div class="nov"><span class="ms">blur_on</span><span class="mp-sub mp-w6">No clear view</span></div>'
                f'<p class="pp mp-foot mp-ink2">{c["why"]}</p></div><div class="ccard-acts"><span class="cbtn">Why?</span><span class="cbtn">Track record</span></div></div>')
    flag = ""
    if c["state"] == "disagree":
        flag = (f'<div class="dis"><span class="ms ms-s">call_split</span><span class="mp-foot"><b>The two engines disagree.</b> The rules engine says HOLD; the Forecaster sees a rougher month '
                f'than usual ({c["fall5"]}% against a usual {c["usual"]}%).</span></div>')
    rows = [("Rules engine", c["rules"]), ("Fall over 5%", f'{c["fall5"]}% (usually {c["usual"]}%)'), ("Chance up", f'{c["up"]}%'),
            ("Likely range", f'<span class="nw">{pc(c["lo"])} … {pc(c["hi"])}</span>'), ("Market mood", c["mood"]), ("Similar days", c["similar"]), ("Pattern", c["pattern"]), ("Main drivers", c["drivers"])]
    kv = "".join(f'<div class="kv kvw"><span>{a}</span><span>{b}</span></div>' for a, b in rows)
    techb = ""
    if tech:
        techb = ('<div class="ccard-tech"><span>Forecast row · NASDAQ 100 ETF · Sat 24 Oct 06:10 · model 2026.10 · trained on data to 30 Sep</span>'
                 '<span>direction 0.52 (calibrated, conformal range p10 −7.0 · p50 +0.3 · p90 +6.0)</span><span>risk P(fall &gt; 5%) 0.21 · base rate 0.12</span>'
                 '<span>mood stressed 0.71 · choppy 0.18 · falling 0.07 · calm 0.04</span><span>pattern double top · n 9 · 20d mean −2.1% · 6 of 9 lower</span>'
                 '<span>gate week 5 of 8 · W1 to W5 beat base rate and rules engine</span></div>')
    return (f'<div class="ccard"><div class="ccard-h"><span class="mp-over mp-ink2">Forecaster · in practice · 4 weeks</span><span class="mp-hl">{c["name"]}</span></div>'
            f'<div class="ccard-b">{flag}{kv}</div>{techb}<div class="ccard-acts"><span class="cbtn">Why?</span><span class="cbtn">Chart</span><span class="cbtn">Track record</span></div>'
            f'<div class="ccard-fold"><span>Technical</span><span class="ms">{"expand_less" if tech else "expand_more"}</span></div></div>')


def chat_frame(cap: str, theme: str, cards: list[str], off: int = 0, lead: bool = True) -> str:
    head = ('<div class="daysep">Sat 24 Oct</div><div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="ai-text">Your Saturday review. The Forecaster is in '
            'practice for every holding, week 5 of 8: until its 8 weeks are up it shows only here and on each holding’s Forecast tab, labelled so.</div>' if lead else
            '<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body">')
    return (f'<div class="dv-col" data-screen-label="{cap}"><div class="bd-theme">{cap}</div><div class="dev dev-iphone mp {theme}"><div class="island"></div><div class="scrn">'
            f'<div class="sbar"><span>9:41</span>{SB}</div><div class="strip lg"><div class="ai-mark z1"><i></i></div><div class="fx col f1 z1"><span class="mp-foot mp-ink2">Saturday review</span>'
            f'<span class="mp-hl">Sat 24 Oct, 09:00</span></div><span class="ms z1 mp-ink2">keyboard_arrow_down</span></div>'
            f'<div class="scroll"><div class="fadet thin"></div><div class="chat cpad" style="margin-top: -{off}px">{head}{"".join(cards)}</div></div></div></div>'
            '<div class="edge-bot"></div><div class="composer cmpb"><div class="chips"><span class="gchip lg"><span class="ms">help</span><span>Why?</span></span><span class="gchip lg"><span class="ms">fact_check</span><span>Track record</span></span></div>'
            '<div class="cbar"><span class="cplus lg"><span class="ms z1">add</span></span><span class="cfield lg"><span class="ph">Ask MyPaisa</span><span class="csend mp-ink2 z1"><span class="ms">mic</span></span></span></div></div>'
            f'{tabdock("Chat")}</div></div></div>')


def body_proof() -> str:
    lab = P["lab"]
    th = "".join(f'<span class="mp-foot mp-w6">{c}</span>' for c in ["", *lab["cols"]])
    rows = "".join('<div class="lr">' + "".join(f'<span class="mp-foot{" mp-w6" if k == 0 else ""}">{v}</span>' for k, v in enumerate(r)) + "</div>" for r in lab["rows"])
    folds = "".join(f'<div class="fr"><span class="mp-sub mp-w6">{a}</span><span class="mp-foot mp-ink2">tests {b}</span><span class="mp-sub {"mp-up" if ok else "mp-dq"}">{"✓ beat" if ok else "✗ missed"}</span></div>' for a, b, ok in P["folds"])
    wk = "".join(f'<span class="wkc {"ok" if b else "tbd"}">{"✓ " if b else ""}W{k + 1}</span>' for k, b in enumerate(N["track"]["fc"]["beat"]))
    steps = [("science", "In practice", "Graded every week; shown only on the holding’s Forecast tab and in the Saturday review, labelled in practice.", True),
             ("visibility", "Live", "After 8 live weeks beating both the base rate and the rules engine: the weekday cards too.", False),
             ("power_settings_new", "Off", "Four weeks worse than the base rate: it switches itself off, and the owner is told.", False),
             ("autorenew", "Retrained monthly", "Each version is a ModelVersion row with its test scores.", False)]
    st = "".join(f'<div class="mp-row rowc"><span class="mp-icontile mp-neutral"><span class="ms ms-s">{i}</span></span><span class="grow"><span class="mp-sub mp-w6">{a}{" <span class=\"mp-chip mp-neutral\">now</span>" if now else ""}</span>'
                 f'<span class="mp-foot mp-ink2">{b}</span></span></div>' for i, a, b, now in steps)
    mods = "".join(f'<div class="kv"><span>{a} · {b}</span><span>{c}</span></div>' for a, b, c in P["models"])
    return (f'<div class="mp-foot mp-ink2 meta">A lab first, practice next, and an off switch · <span class="nw">NASDAQ 100 ETF</span></div>'
            f'<div class="mp-card"><span class="mp-over mp-ink2">The backtest lab · {lab["span"]}</span><span class="mp-hl">Its first report: the rules engine over ten years</span>'
            '<span class="mp-foot mp-ink2">Replayed one day at a time, with fees, next-day prices for funds and monthly contributions, against buy-and-hold and a simple trend rule. Calibration: the chance it said, then how often it came true.</span>'
            f'<div class="lt"><div class="lr lh">{th}</div>{rows}</div></div>'
            f'<div class="mp-card"><span class="mp-hl">Walk-forward tests</span><span class="mp-foot mp-ink2">Trained on the past, tested on the year after, with a gap; the last two years held back for one final test. Four-week risk shown.</span>{folds}'
            '<span class="mp-foot mp-ink2">A model that does not beat the base rate in the final test is not used.</span></div>'
            f'<div class="mp-card"><div class="fx ac jb gap8 wrapr"><span class="mp-hl">The live gate</span>{chip_practice()}</div><span class="mp-foot mp-ink2">8 live weeks beating both, graded each Friday: next on {", ".join(P["gate"]["next"])}.</span><div class="wks">{wk}</div></div>'
            f'<div class="sech"><span class="mp-over mp-ink2">The switch-off</span><span class="mp-foot mp-ink2">its status now</span></div><div class="mp-group">{st}</div>'
            f'<div class="mp-card"><span class="mp-hl">Models now</span><span class="mp-foot mp-ink2">version {N["model"]} · trained on data to {N["data_to"]}</span>{mods}</div>'
            '<p class="pp mp-foot mp-ink2 endn">Every figure comes from code: the lab’s report and the Forecast rows. Illustrative figures (forecaster-v4.json).</p>')


# ------------------------------------------------------------------ the canvases
CSS = """
          html, body { margin: 0; background: #ECEAE6; }
          a { color: #C2381F; } a:hover { color: #8F2915; }
          .dv-turn { padding: 44px 48px 24px; border-bottom: 1px solid rgba(0,0,0,.08); }
          .dv-thd { display: flex; align-items: baseline; gap: 12px; margin: 0 0 10px; flex-wrap: wrap; }
          .dv-tid { font: 600 11px/14px ui-monospace, Menlo, monospace; padding: 3px 8px; background: #1a1a1a; color: #fff; border-radius: 5px; text-decoration: none; }
          .dv-tname { font: 700 26px/32px -apple-system, "SF Pro Display", system-ui, sans-serif; color: #14171F; letter-spacing: -0.02em; }
          .bd .dv-tname { font-size: 22px; line-height: 28px; }
          .dv-intro { max-width: 1100px; font: 15px/22px -apple-system, "SF Pro Text", system-ui, sans-serif; color: #3D424D; margin: 0; text-wrap: pretty; }
          .plan { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; max-width: 1100px; box-sizing: border-box; margin: 14px 0 0; padding: 10px 14px; border-radius: 12px; background: #F9F8F6; border: 1px solid rgba(0,0,0,.1); font: 13px/18px -apple-system, system-ui, sans-serif; color: #3D424D; }
          .plan-k { font: 600 11px/14px ui-monospace, Menlo, monospace; padding: 4px 8px; border-radius: 5px; background: #13213A; color: #FFFFFF; }
          .bd { border-bottom: 1px solid rgba(0,0,0,.06); }
          .bd-note p { margin: 0; }
          .bd-lead { max-width: 1100px; margin: 0; font: 15px/22px -apple-system, "SF Pro Text", system-ui, sans-serif; color: #3D424D; text-wrap: pretty; }
          .recb { font: 700 12px/16px -apple-system, system-ui, sans-serif; color: #FFFFFF; background: #1D7A3E; padding: 3px 10px; border-radius: 999px; }
          .nopk { font: 700 12px/16px -apple-system, system-ui, sans-serif; color: #3D424D; background: #DCD9D3; padding: 3px 10px; border-radius: 999px; }
          .dv-col { display: flex; flex-direction: column; }
          .gap14 { gap: 14px; }
          .z1 { position: relative; z-index: 1; }
          .f1 { flex: 1; min-width: 0; }
          .pp { margin: 0; text-wrap: pretty; }
          .lg > * { position: relative; z-index: 1; }
          .wrapr { flex-wrap: wrap; }
          .pg { display: flex; flex-direction: column; gap: 14px; padding: 4px 16px 130px; }
          .pg > *, .ipg > * { flex-shrink: 0; }
          .ipg { display: flex; flex-direction: column; gap: 14px; padding: 4px 18px 40px; }
          .lt2 { padding-bottom: 2px; }
          .navc { position: absolute; left: 70px; right: 70px; text-align: center; font: 600 17px/22px var(--mp-font); pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .fadet { position: absolute; left: 0; right: 0; top: 0; height: 34px; z-index: 5; background: linear-gradient(180deg, var(--mp-bg), color-mix(in srgb, var(--mp-bg) 0%, transparent)); }
          .fadet.thin { height: 14px; }
          .meta { padding: 0 4px; margin-top: -6px; text-wrap: pretty; }
          .sech { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 0 4px 0 16px; margin-bottom: -6px; flex-wrap: wrap; }
          .chiprow { display: flex; gap: 8px; flex-wrap: wrap; }
          .rowc { padding-top: 10px; padding-bottom: 10px; min-height: 54px; }
          .grow { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
          .chev { color: var(--mp-ink-2); font-size: 20px; flex: none; }
          .note { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 14px; background: var(--mp-surface); }
          .note.inl { background: var(--mp-surface-2); margin-top: 10px; }
          .note .ms { font-size: 18px; color: var(--mp-ink-2); margin-top: 1px; flex: none; }
          .endn { padding: 0 8px; }
          .sdefs { position: absolute; width: 0; height: 0; overflow: hidden; }
          .nw { white-space: nowrap; }
          .pg .mp-card, .ipg .mp-card { display: flex; flex-direction: column; gap: 6px; }
          .pg .mp-card.qa, .ipg .mp-card.qa { gap: 0; }
          .kvw > :first-child { flex: none; max-width: 42%; }
          /* the hero */
          .heroF { display: flex; flex-direction: column; gap: 14px; padding: 18px 18px 16px; }
          .prc-h { color: var(--mp-hero-ink); background: var(--mp-hero-2); }
          .fig3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
          .f3c { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
          .f3n { font-family: var(--mp-font-round); font-weight: 800; font-size: 24px; line-height: 28px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
          .f3c:nth-child(2) .f3n { font-size: 19px; white-space: nowrap; }
          .heroF { container-type: inline-size; }
          @container (max-width: 300px) { .f3c:nth-child(2) .f3n { font-size: 16px; } .f3n { font-size: 22px; } }
          .fig3 { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr) minmax(0, 0.9fr); }
          .rl { display: flex; flex-direction: column; gap: 6px; }
          .rl-h { border-top: 1px solid var(--mp-hero-2); padding-top: 12px; }
          .agree { display: inline-flex; align-items: center; gap: 6px; }
          .agree .ms { font-size: 16px; }
          .story { margin: 0; font: 700 21px/27px var(--mp-font); letter-spacing: -0.01em; text-wrap: pretty; }
          /* the chart */
          .fcw { position: relative; margin-top: 18px; }
          .fcbox > svg { height: var(--ch); }
          .fgrid { stroke: var(--mp-chart-grid); stroke-width: 1; }
          .mp .fmid { fill: none; stroke: var(--mp-chart-line); stroke-width: 2; stroke-dasharray: 4 3; }
          .ftoday { stroke: var(--mp-ink-2); stroke-width: 1; stroke-dasharray: 2 3; }
          .cw.up { fill: var(--mp-up); } .cw.dn { fill: var(--mp-down-quiet); }
          .cb.up { fill: var(--mp-up); } .cb.dn { fill: var(--mp-down-quiet); }
          .navl { fill: none; stroke: var(--mp-ink); stroke-width: 2; stroke-linejoin: round; }
          .pneck { stroke: var(--mp-chart-4); stroke-width: 2; stroke-dasharray: 5 3; }
          .psup, .ptrend { stroke: var(--mp-chart-2); stroke-width: 2; stroke-dasharray: 5 3; }
          .sim { fill: none; stroke: var(--mp-chart-2); stroke-width: 1; stroke-opacity: 0.55; }
          .yl { position: absolute; left: 0; transform: translateY(-100%); padding-bottom: 1px; font: 500 11px/14px var(--mp-font); color: var(--mp-ink-2); white-space: nowrap; }
          .fl { position: absolute; right: 0; transform: translateY(-50%); font: 600 11px/14px var(--mp-font); color: var(--mp-ink); white-space: nowrap; }
          .tdl { position: absolute; bottom: 2px; transform: translateX(calc(-100% - 4px)); font: 500 11px/14px var(--mp-font); color: var(--mp-ink-2); white-space: nowrap; }
          .pmk { position: absolute; transform: translate(-50%, -100%); font: 600 11px/14px var(--mp-font); padding: 1px 6px; border-radius: 6px; background: var(--mp-surface); white-space: nowrap; }
          .pmk-a { color: var(--mp-ink); box-shadow: inset 0 0 0 1.5px var(--mp-chart-4); }
          .pmk-b { color: var(--mp-ink); box-shadow: inset 0 0 0 1.5px var(--mp-chart-2); transform: translate(-50%, 0); }
          .ptick { position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: var(--mp-surface); box-shadow: 0 0 0 2px var(--mp-chart-4); }
          .mp-chartaxis { margin-top: 6px; }
          .mp-chartaxis > .ax0 { transform: none; }
          .lgd { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font: 400 12px/16px var(--mp-font); color: var(--mp-ink-2); margin-top: 8px; }
          .lgd > span { display: inline-flex; align-items: center; gap: 5px; }
          .lgd i { display: inline-block; flex: none; }
          .sw-up { width: 6px; height: 12px; border-radius: 1px; background: var(--mp-up); }
          .sw-dn { width: 6px; height: 12px; border-radius: 1px; background: var(--mp-down-quiet); }
          .sw-band { width: 16px; height: 11px; border-radius: 3px; background: var(--mp-band); }
          .sw-mid { width: 16px; height: 0; border-top: 2px dashed var(--mp-chart-line); }
          .sw-pa { width: 16px; height: 0; border-top: 2px dashed var(--mp-chart-4); }
          .sw-pb { width: 16px; height: 0; border-top: 2px dashed var(--mp-chart-2); }
          .sw-sim { width: 16px; height: 0; border-top: 1px solid var(--mp-chart-2); }
          .sw-navl { width: 16px; height: 0; border-top: 2px solid var(--mp-ink); }
          .sw-for { width: 12px; height: 8px; border-radius: 2px; background: var(--mp-pillar-for); }
          .sw-ag { width: 12px; height: 8px; border-radius: 2px; background: var(--mp-pillar-against); }
          .mk { width: 16px; display: inline-flex; justify-content: center; flex: none; align-self: flex-start; margin-top: 9px; }
          .mk-pa { width: 14px; height: 0; border-top: 2px dashed var(--mp-chart-4); }
          .mk-pb { width: 14px; height: 0; border-top: 2px dashed var(--mp-chart-2); }
          /* the pieces below */
          .mc { display: flex; flex-direction: column; gap: 8px; }
          .mbar { display: flex; gap: 2px; height: 12px; border-radius: 999px; overflow: hidden; }
          .mseg { display: block; height: 100%; }
          .mc-1 { background: var(--mp-chart-3); } .mc-2 { background: var(--mp-chart-2); } .mc-3 { background: var(--mp-chart-4); } .mc-4 { background: var(--mp-chart-5); }
          .msw { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
          .mlab { display: flex; justify-content: space-between; }
          .kv { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font: 400 15px/20px var(--mp-font); }
          .kv > :first-child { color: var(--mp-ink-2); }
          .kv > :last-child { font-weight: 600; text-align: right; }
          .kvw { padding: 6px 0; border-top: 1px solid var(--mp-line); }
          .drv { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) 56px; align-items: center; gap: 10px; min-height: 30px; }
          .dbar { position: relative; height: 8px; }
          .dbar > i { position: absolute; top: 0; bottom: 0; display: block; }
          .dfor { background: var(--mp-pillar-for); } .dag { background: var(--mp-pillar-against); }
          .dv { text-align: right; font-variant-numeric: tabular-nums; }
          .evr { display: grid; grid-template-columns: minmax(0, 1fr) auto 72px; align-items: center; gap: 10px; min-height: 36px; border-top: 1px solid var(--mp-line); }
          .evr > :last-child { text-align: right; font-variant-numeric: tabular-nums; }
          .lowc { font-size: 11px; padding: 1px 6px; margin-left: 4px; }
          .trk { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .tc { display: flex; flex-direction: column; gap: 6px; padding: 14px; }
          .wks { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
          .wkc { font: 600 12px/16px var(--mp-font); padding: 3px 6px; border-radius: 6px; }
          .wkc.ok { color: var(--mp-hold); background: var(--mp-hold-bg); }
          .wkc.tbd { color: var(--mp-ink-2); background: var(--mp-surface-2); }
          .g2 { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 14px; align-items: start; }
          /* 1b */
          .stat3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
          .st { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 14px; background: var(--mp-surface); min-width: 0; }
          .stn { font-family: var(--mp-font-round); font-weight: 800; font-size: 20px; line-height: 24px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
          .st:nth-child(2) .stn { font-size: 16px; white-space: nowrap; }
          .stat3 { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr) minmax(0, 0.9fr); }
          .rrow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 0 4px; }
          .agree2 { display: inline-flex; align-items: center; gap: 4px; color: var(--mp-ink-2); }
          .agree2 .ms { font-size: 16px; }
          .tall { display: flex; flex-direction: column; gap: 0; }
          /* 1c */
          .qa { padding: 0; overflow: hidden; }
          .qh { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; }
          .qh .chev { margin-top: 4px; }
          .qan { font-family: var(--mp-font-round); font-weight: 800; font-size: 19px; line-height: 24px; letter-spacing: -0.01em; text-wrap: pretty; margin-top: 2px; }
          .qb { display: flex; flex-direction: column; gap: 12px; padding: 0 16px 16px; border-top: 1px solid var(--mp-line); }
          .qb .fcw { margin-top: 14px; }
          .qb .mp-group { background: var(--mp-surface-2); }
          /* the iPad and the foldable */
          .scrn.srow { flex-direction: row; }
          .sidebar.sb { width: 240px; box-sizing: border-box; }
          .side-h.sh0 { padding-top: 4px; }
          .main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; overflow: hidden; }
          .insp { width: 320px; flex: none; border-left: 1px solid var(--mp-line); background: var(--mp-bg); display: flex; flex-direction: column; position: relative; overflow: hidden; }
          .largetitle.navt { padding: 0 4px; font-size: 28px; line-height: 34px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
          .navl { display: flex; align-items: center; gap: 4px; min-width: 0; }
          .navr { display: flex; gap: 8px; flex: none; }
          .sbar.sbar-r { justify-content: flex-end; }
          .chfadet { position: absolute; left: 0; right: 0; top: 0; height: 150px; z-index: 10; pointer-events: none; background: linear-gradient(180deg, var(--mp-bg) 62%, color-mix(in srgb, var(--mp-bg) 0%, transparent)); }
          .ichat { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 150px; overflow: hidden; }
          .ichat .chat > * { flex: none; }
          .cb20 { bottom: 20px; }
          .toptabs { display: flex; justify-content: center; padding: 2px 16px 6px; position: relative; z-index: 16; }
          .ttabs { flex: none; height: 52px; gap: 2px; }
          .ttab { min-height: 44px; padding: 0 16px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; font: 600 15px/20px var(--mp-font); color: var(--lg-ink); }
          .ttab .ms { font-size: 20px; }
          .ttab.on { color: var(--lg-accent); background: var(--lg-lens); }
          /* the chat's cards */
          .cpad { padding: 10px 14px 210px; display: flex; flex-direction: column; gap: 14px; }
          .cmpb { bottom: 102px; }
          .dis { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: var(--mp-pause-bg); color: var(--mp-ink); }
          .dis .ms { color: var(--mp-pause); margin-top: 1px; }
          .nov { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--mp-surface-2); }
          .nov .ms { color: var(--mp-ink-2); font-size: 20px; }
          /* the proof page */
          .lt { display: flex; flex-direction: column; margin-top: 8px; }
          .lr { display: grid; grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(0, 1fr)); gap: 8px; padding: 8px 0; border-top: 1px solid var(--mp-line); align-items: baseline; }
          .lr.lh { border-top: 0; color: var(--mp-ink-2); }
          .fr { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; padding: 8px 0; border-top: 1px solid var(--mp-line); }
          .t-dark .mp-ink3 { color: var(--mp-ink-2); }
          a.dv-tid:hover, a.plan-k:hover { color: #fff; }
"""

def mini(css: str) -> str:
    """One rule a line, no indent: the same CSS, smaller to send."""
    import re as _re
    out = []
    for ln in css.strip().splitlines():
        ln = _re.sub(r"\s*([{};:,>])\s*", r"\1", ln.strip()).replace(";}", "}")
        out.append(ln)
    return "\n" + "\n".join(out) + "\n"


HEAD = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <script src="./support.js"></script>
  </head>
  <body>
    <x-dc>
      <helmet data-dc-atomics>
        <meta name="design_doc_mode" content="canvas" />
        <link rel="stylesheet" href="tokens.css" />
        <link rel="stylesheet" href="ios.css" />
        <link rel="stylesheet" href="motion.css" />
        <script src="motion.js"></script>
        <style>{css}        </style>
      </helmet>
"""
TAIL = """    </x-dc>
    <script type="text/x-dc" data-dc-script data-props='{}'>
      class Component extends DCLogic {
        renderVals() {
          return {
@@LISTS@@
          };
        }
      }
    </script>
  </body>
</html>
"""


def board(num: str, name: str, keys: str, lead: str, frames: list[str], notes: list[tuple[str, str]], rec: bool = False, anchor: str = "", tag: str = "") -> str:
    nt = "".join(f"<p><b>{a}</b> {b}</p>" for a, b in notes)
    return (f'      <section class="bd" id="{anchor or num}">\n        <div class="dv-thd"><span class="dv-tid">{num}</span><span class="dv-tname">{name}</span>'
            + ('<span class="recb">Picked · Arun, 29 Oct 2026</span>' if rec else "") + (f'<span class="nopk">{tag}</span>' if tag else "") + f'<span class="bd-keys">{keys}</span></div>\n'
            f'        <p class="bd-lead">{lead}</p>\n        <div class="bd-row">\n' + "\n".join("          " + f for f in frames)
            + f'\n          <div class="bd-note">{nt}</div>\n        </div>\n      </section>\n')


def turn(tid: str, name: str, intro: str, plan: str) -> str:
    return (f'      <section class="dv-turn" id="intro" data-screen-label="{name}: intro">\n        <div class="dv-thd"><a class="dv-tid" href="#intro">{tid}</a><span class="dv-tname">{name}</span></div>\n'
            f'        <p class="dv-intro">{intro}</p>\n        <div class="plan">{plan}</div>\n      </section>\n')


PLAN = ('<b>Jira</b><span class="plan-k">MA-281</span><span>this round</span><span class="plan-k">MA-124</span><span>F6, the side-by-side view</span>'
        '<span class="plan-k">MA-280</span><span>F8, patterns</span><span class="plan-k">MA-121</span><span class="plan-k">MA-122</span><span class="plan-k">MA-123</span><span>the models</span>'
        '<span class="plan-k">MA-120</span><span>the lab</span><b>Spec</b><span>ARCHITECTURE §19.4, §19.6, §19.7, §9.1, §9.3</span><b>Figures</b><span>docs/design/figures/forecaster-v4.json</span>')

LT, DK = "t-light", "t-dark"


def options_file() -> str:
    DEFS.clear()
    LISTS.clear()
    intro = ("The stock Forecaster (ARCHITECTURE §19) on a holding’s screen, drawn for the app for the first time, in shell 1a with the Liquid Glass tab bar, "
             "and on iPad with the sidebar and the chat beside it. Asha’s NASDAQ 100 ETF, at the Fri 23 Oct close, the Forecaster in practice, week 5 of 8. "
             "Three answers to one screen: <b>1a</b> the answer first, then the chart and its patterns, then why; <b>1b</b> the chart is the screen, with a layer for "
             "each model; <b>1c</b> the questions a member asks, each answered in one line and opened in place. Every option keeps the rules engine’s call beside the "
             "Forecaster’s, risk before direction (the goal is fewer deep falls), and the patterns F8 finds on the candles (MA-280), only where they show an edge. "
             "Figures are illustrative and come from one set. Arun picked <b>1a</b> on 29 Oct 2026; 1b and 1c stay here as the record.")
    out = [HEAD.format(title="iPhone v4 · Forecast", css=mini(CSS)), turn("F", "iPhone and iPad · a holding’s Forecast: three options", intro, PLAN)]
    out.append(board("1a", "The answer first", "MA-124 · MA-280 · §19.7",
                     "A navy hero with the three figures, risk first, and the rules engine’s call under them; then the candles with the fan of the next four weeks and the "
                     "patterns marked on them; the patterns, each with what followed it on this ETF; then one row for each model and the two track records.",
                     [group("a1", [("iPhone · Forecast · 1a · Light", LT, 0), ("iPhone · Forecast · 1a · Dark", DK, 0), ("iPhone · Forecast · 1a · scrolled", LT, 620), ("iPhone · Forecast · 1a · scrolled to the track records", LT, 1230)], iphone_t(body_1a())),
                      group("a2", [("iPad · Forecast · 1a · Light", LT, 0), ("iPad · Forecast · 1a · Dark", DK, 0), ("iPad · Forecast · 1a · scrolled", LT, 600)], ipad_t(body_1a(wide=True)))],
                     [("Picked (Arun, 29 Oct 2026), as recommended:", "it answers the member’s question in the first screen, the summary first and the detail a tap away, as every other v4 screen does; the chart and its patterns sit just under it."),
                      ("Risk first.", "The chance of a fall over 5% leads, then the likely range, then direction, the order of §19.4’s trust and of the goal."),
                      ("Patterns.", "Only patterns whose event study on this ETF shows an edge are marked and listed (ARCHITECTURE 19.4); one with no edge, such as Tue 20 Oct’s bearish engulfing, is not shown at all."),
                      ("Each row", "opens its sheet: the mood timeline, similar days over today’s chart, the event-impact table, the drivers and the wider technical set (each sheet is drawn before MA-124 starts)."),
                      ("iPad", "puts the patterns beside the rows under a full-width chart; the chat sits beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over).")], rec=True))
    out.append(board("1b", "The chart is the screen", "MA-124 · MA-280 · §19.7",
                     "Three small figures and the rules engine’s call in one strip, then a tall chart with a layer for each model: Range, Patterns, Similar days, Events. "
                     "The layer changes what is drawn on the candles and the panel under them.",
                     [group("b1", [("iPhone · Forecast · 1b · Patterns · Light", LT, 0), ("iPhone · Forecast · 1b · Patterns · Dark", DK, 0)], iphone_t(body_1b("patterns"))),
                      iphone("iPhone · Forecast · 1b · Similar · Light", LT, body_1b("similar")),
                      group("b2", [("iPad · Forecast · 1b · Light", LT, 0), ("iPad · Forecast · 1b · Dark", DK, 0)], ipad_t(body_1b("patterns", wide=True)))],
                     [("For", "a member who reads charts: everything the models say is on the candles, one layer at a time."),
                      ("Against:", "the answer is three small tiles; a layman has to know what a layer is before the screen tells them anything."),
                      ("iPad", "puts the layer’s panel beside the chart.")], tag="Not picked"))
    out.append(board("1c", "Questions, answered", "MA-124 · MA-280 · §19.7",
                     "The Forecaster’s view as the questions a member asks, each answered in one line with its figure; a tap opens the answer in place, with its chart.",
                     [group("c1", [("iPhone · Forecast · 1c · the chart open · Light", LT, 0), ("iPhone · Forecast · 1c · the chart open · Dark", DK, 0)], iphone_t(body_1c("chart"))),
                      iphone("iPhone · Forecast · 1c · similar days open · Light", LT, body_1c("similar"), off=380),
                      group("c2", [("iPad · Forecast · 1c · Light", LT, 0), ("iPad · Forecast · 1c · Dark", DK, 0)], ipad_t(body_1c("chart", wide=True)))],
                     [("For", "the plainest reading: a sentence first, then one answer per question, each with the number it rests on."),
                      ("Against:", "the chart is one tap down, and the figures are read in a list rather than side by side."),
                      ("The sentence", "is fixed wording chosen by code from the figures, never written by the model (§1).")], tag="Not picked"))
    out.append(defs_block())
    out.append('      <section class="dv-turn" id="next"><p class="dv-intro">Next: 1a’s remaining states (loading, stale prices, a holding with no Forecaster yet, the Forecaster switched off, AX5 and Reduce Motion) and each row’s sheet are drawn before MA-124 starts; the web app’s Forecast follows 1a in MA-279. '
               'The screens every option shares (the chat’s card, the proof page, a fund, privacy and the foldable) are on iPhone v4 · Forecaster proof and chat.</p></section>\n')
    out.append(TAIL.replace("@@LISTS@@", logic()))
    return "".join(out)


def shared_file() -> str:
    DEFS.clear()
    LISTS.clear()
    intro = ("What every option of iPhone v4 · Forecast shares, drawn in the style of 1a, which Arun picked on 29 Oct 2026: the Forecaster’s card in the chat beside the rules engine, "
             "with the two engines agreeing, disagreeing and “no clear view”; the proof page; a fund, which has no candles; privacy mode; and the foldable, folded and open.")
    out = [HEAD.format(title="iPhone v4 · Forecaster proof and chat", css=mini(CSS)), turn("G", "iPhone · the Forecaster’s card, its proof, a fund and the foldable", intro, PLAN)]
    c = R["cards"]
    out.append(board("C1", "The chat’s card, in the Saturday review", "MA-124 · §19.7",
                     "While it is in practice the Forecaster speaks only in the Saturday review and on a holding’s Forecast tab, labelled so. Each card puts the rules engine’s "
                     "call first; a disagreement is flagged in words; a view too close to the usual says “no clear view”.",
                     [chat_frame("iPhone · Saturday review · the engines agree · Light", LT, [chat_card(c[0])]),
                      chat_frame("iPhone · Saturday review · the engines disagree · Dark", DK, [chat_card(c[1]), chat_card(c[2])], lead=False),
                      chat_frame("iPhone · Saturday review · no clear view · Light", LT, [chat_card(c[2])], lead=False),
                      chat_frame("iPhone · Saturday review · technical open · Light", LT, [chat_card(c[0], tech=True)], off=330)],
                     [("Disagreement", "is a sentence, not a colour: the amber note says which way each engine leans."),
                      ("No clear view", "is drawn when the chances sit too close to the usual to count; the confidence floor itself is MA-123’s to set (§19.7)."),
                      ("Technical", "shows the Forecast row the card was read from, as every card’s fold does.")]))
    out.append(board("C2", "How the Forecaster proves itself", "MA-120 · MA-123 · §19.6",
                     "Reached from the Track record tab or the Forecast tab’s chip: the lab’s first report (the rules engine over ten years), the walk-forward tests, the live "
                     "gate and the switch-off.",
                     [group("p1", [("iPhone · Forecaster · Proof · Light", LT, 0), ("iPhone · Forecaster · Proof · Dark", DK, 0), ("iPhone · Forecaster · Proof · scrolled", LT, 560), ("iPhone · Forecaster · Proof · the switch-off", LT, 1060)], iphone_t(body_proof(), title="How it proves itself", back="NASDAQ 100 ETF"))],
                     [("The lab ran first.", "A model reaches practice only after its walk-forward tests, so the page has figures, unlike the web board’s first state."),
                      ("Fold 4 missed", "(2022) and is shown as missed; the final test, the last two years to Sep 2026, decides."),
                      ("The stages", "are ARCHITECTURE 19.6’s: in practice (the Forecast tab and the Saturday review only, Arun, 29 Oct 2026), live after 8 weeks beating both, off after four weeks worse than the base rate, retrained monthly.")]))
    out.append(board("C3", "A fund: line patterns on its price, never candles", "MA-280 · §19.1 · §19.4",
                     "Arun’s Balanced fund prices once a day, a day late, so the chart is its price line with the same fan, and F8 reads only the line patterns on it.",
                     [group("f1", [("iPhone · Forecast · a fund · Light", LT, 0), ("iPhone · Forecast · a fund · Dark", DK, 0), ("iPhone · Forecast · a fund · scrolled", LT, 1040)], iphone_t(body_fund(), title="Balanced"))],
                     [("Same screen,", "same order: only the chart and its patterns change.")]))
    out.append(board("C4", "Privacy mode", "MA-124 · §9.1",
                     "Privacy hides pounds: the holding’s value under its name. The forecast is in percentages, so it stays; the app switcher shows only the mark.",
                     [iphone("iPhone · Forecast · privacy on · Dark", DK, body_1a(priv=True), priv=True)],
                     [("Nothing else", "on this screen carries pounds.")]))
    out.append(board("C5", "The foldable, folded and open", "MA-124 · §9.1",
                     "One layout by window width: folded it is compact, as on iPhone; open (about 880 pt) it is regular narrow, with the tabs at the top and the chat a sheet away (Ask).",
                     [fold("Foldable · Forecast · folded · Light", LT, body_1a(), open_=False), fold("Foldable · Forecast · open · Light", LT, body_1a(wide=True), open_=True)],
                     [("Open,", "the chart and its patterns sit beside the rows, as on iPad; the fold keeps the scroll.")]))
    out.append(defs_block())
    out.append(TAIL.replace("@@LISTS@@", logic()))
    return "".join(out)


def lines(html: str) -> str:
    """Break after each block or SVG element, never inside a line of text, so no line runs to thousands of characters."""
    import re as _re
    return _re.sub(r"(</div>|</section>|</sc-for>|</sc-if>|</line>|</rect>|</path>|</use>|</g>)(?=<)", r"\1\n", html)


if __name__ == "__main__":
    import sys
    built = {"iPhone v4 · Forecast.dc.html": lines(options_file()), "iPhone v4 · Forecaster proof and chat.dc.html": lines(shared_file())}
    if sys.argv[1:] == ["--check"]:   # the mirror's copies are what this builds from the figure set, byte for byte
        stale = [name for name, text in built.items() if not (OUT / name).is_file() or (OUT / name).read_text() != text]
        print("build_boards: " + (f"{', '.join(stale)} not what the figure set builds" if stale else "both canvases match the build"))
        sys.exit(1 if stale else 0)
    for name, text in built.items():
        (OUT / name).write_text(text)
    print("wrote", OUT / "iPhone v4 · Forecast.dc.html", OUT / "iPhone v4 · Forecaster proof and chat.dc.html")
