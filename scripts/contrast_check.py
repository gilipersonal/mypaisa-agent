#!/usr/bin/env python3
"""Every text and control in MyPaisa stays legible in light and dark, even at 25% screen brightness (MA-181).

    python3 scripts/contrast_check.py            # check docs/design/ds-v1/tokens.css; exit 1 on a failure
    python3 scripts/contrast_check.py --report   # print every pair, passing or not

Arun, 25 Oct 2026: "Take special care of dark mode and light mode in ios and ipad, the text and component should be
clearly visible even in 25% mobile brightness."

Two measures for each pair of colours a screen puts together, in both themes:
- WCAG 2.2's contrast ratio, (L1 + 0.05) / (L2 + 0.05), at full brightness;
- the same ratio with the screen at 25%: each colour's luminance is scaled by 0.25 while the 0.05 that stands for
  reflected room light stays, (0.25 L1 + 0.05) / (0.25 L2 + 0.05). Dimming hurts low-luminance pairs most, which is
  why dark mode's secondary text is the first to go.

Tiers, the stricter of each pair of limits applies:
- body: primary text, labels on filled buttons, figures: 7:1, and 4.5:1 at 25%;
- text: secondary text, captions, coloured text (gains, alerts, stances, links): 4.5:1, and 3:1 at 25%;
- ui: what is not text but carries meaning (chart lines, meters, a switch's ring, selected segments, focus): 3:1,
  and 1.8:1 at 25%.
Text on Liquid Glass is measured on the glass composited over its worst backdrop (glass.* pairs below).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKENS = ROOT / "docs" / "design" / "ds-v1" / "tokens.css"
DIM = 0.25
LIMITS = {"body": (7.0, 4.5), "text": (4.5, 3.0), "ui": (3.0, 1.8)}

# (tier, foreground token, background token); both themes
PAIRS = [
    ("body", "ink", "surface"), ("body", "ink", "bg"), ("body", "ink", "surface-2"),
    ("text", "ink-2", "surface"), ("text", "ink-2", "bg"), ("text", "ink-2", "surface-2"),
    ("text", "ink-3", "surface"), ("text", "ink-3", "bg"), ("text", "ink-3", "surface-2"),
    ("body", "hero-ink", "hero"), ("text", "hero-ink-2", "hero"), ("text", "hero-ink-2", "hero-2"),
    ("text", "accent", "surface"), ("text", "accent", "bg"), ("text", "on-accent", "accent"),  # a filled button's short semibold label
    ("text", "up", "surface"), ("text", "up", "bg"), ("text", "down-quiet", "surface"),
    ("text", "alert", "surface"), ("text", "alert", "alert-bg"), ("text", "on-alert", "alert"),  # a count badge
    ("text", "add", "add-bg"), ("text", "hold", "hold-bg"), ("text", "pause", "pause-bg"),
    ("text", "trim", "trim-bg"), ("text", "reb", "reb-bg"), ("text", "watch", "watch-bg"),
    ("ui", "chart-line", "surface"), ("ui", "chart-2", "surface"), ("ui", "chart-3", "surface"),
    ("ui", "coral", "hero"), ("ui", "meter", "surface-2"), ("ui", "focus", "surface"),
    ("ui", "ink-3", "surface-2"),  # a switch's ring, an empty track's edge
]
# Labels on glass (glass carries labels only, never body copy): the fill composited over the darkest backdrop a bar
# keeps its light look over (the coral accent; over the navy hero or a member's bubble iOS turns the glass dark and
# its labels light), and in dark mode over the brightest content under it (the accent button).
GLASS = {
    "t-light": {"fill": "lg-fill", "backdrop": "#C2381F", "text": [("text", "ink"), ("text", "ink-2")]},
    "t-dark": {"fill": "lg-fill", "backdrop": "#FF9A82", "text": [("text", "ink"), ("text", "ink-2")]},
}


def parse(css: str) -> dict[str, dict[str, str]]:
    """{theme: {token: value}} for the light root and .t-dark blocks of tokens.css (and ios.css's glass fills)."""
    themes = {}
    for name, sel in (("t-light", r":root,\s*\.t-light\s*\{"), ("t-dark", r"\.t-dark\s*\{")):
        m = re.search(sel + r"(.*?)\n\}", css, re.S)
        if not m:
            sys.exit(f"contrast: no {name} block in {TOKENS.relative_to(ROOT)}")
        themes[name] = dict(re.findall(r"--mp-([\w-]+):\s*([^;]+);", m.group(1)))
    return themes


def rgba(v: str) -> tuple[float, float, float, float]:
    v = v.strip()
    if v.startswith("#"):
        h = v[1:]
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0
    m = re.match(r"rgba?\(([^)]+)\)", v)
    if not m:
        raise ValueError(v)
    parts = [float(x) for x in m.group(1).replace("/", ",").split(",")]
    return parts[0], parts[1], parts[2], parts[3] if len(parts) > 3 else 1.0


def over(fg: tuple, bg: tuple) -> tuple[float, float, float, float]:
    a = fg[3]
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3)) + (1.0,)


def lum(c: tuple) -> float:
    def ch(x: float) -> float:
        x /= 255
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def ratio(a: tuple, b: tuple, k: float = 1.0) -> float:
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (k * la + 0.05) / (k * lb + 0.05)


def ios_glass(theme: str) -> str | None:
    p = ROOT / "docs" / "design" / "ds-v1" / "ios.css"
    if not p.exists():
        return None
    css = p.read_text()
    block = re.search(r"\.mp \{(.*?)\n\}", css, re.S) if theme == "t-light" else re.search(r"\.t-dark\.mp, \.t-dark \.mp \{(.*?)\n\}", css, re.S)
    m = block and re.search(r"--lg-fill:\s*([^;]+);", block.group(1))
    return m.group(1) if m else None


def main(argv: list[str]) -> int:
    report = "--report" in argv
    themes = parse(TOKENS.read_text())
    bad = 0
    for theme, tok in themes.items():
        surface = rgba(tok["surface"])
        rows = []
        for tier, f, b in PAIRS:
            if f not in tok or b not in tok:
                rows.append((tier, f"{f} on {b}", None, None, "missing token"))
                continue
            bg = over(rgba(tok[b]), surface)
            fg = over(rgba(tok[f]), bg)
            rows.append((tier, f"{f} on {b}", ratio(fg, bg), ratio(fg, bg, DIM), ""))
        fill = ios_glass(theme)
        if fill:
            glass = over(rgba(fill), rgba(GLASS[theme]["backdrop"]))
            for tier, f in GLASS[theme]["text"]:
                fg = rgba(tok[f])
                rows.append((tier, f"{f} on glass over {GLASS[theme]['backdrop']}", ratio(fg, glass), ratio(fg, glass, DIM), ""))
        for tier, name, full, dim, why in rows:
            lo_full, lo_dim = LIMITS[tier]
            ok = full is not None and full >= lo_full and dim >= lo_dim
            bad += not ok
            if report or not ok:
                figs = "" if full is None else f"{full:5.2f}:1, {dim:4.2f}:1 at 25%"
                print(f"{'ok  ' if ok else 'FAIL'} {theme:7} {tier:4} {name:34} {figs} (needs {lo_full}, {lo_dim}){' ' + why if why else ''}")
    print(f"contrast: {bad} pair{'s' if bad != 1 else ''} below the limits")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
