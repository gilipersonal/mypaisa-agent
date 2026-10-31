#!/usr/bin/env python3
"""Every text and control in MyPaisa stays legible in light and dark, even at 25% screen brightness (MA-181).

    python3 scripts/contrast_check.py            # check docs/design/ds-v1/tokens.css; exit 1 on a failure
    python3 scripts/contrast_check.py --report   # print every pair, passing or not
    python3 scripts/contrast_check.py --selftest [case ...]   # mutate copies; each must be refused (a gate and CI)

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
- ui: what is not text but carries meaning (chart lines and marks, bars and meters on their track, a switch's ring,
  selected segments, focus): 3:1, and 1.8:1 at 25%;
- presence: what must be seen but carries no reading (a privacy mask, the empty track of a bar): 1.5:1, and 1.25:1
  at 25%, so it never vanishes into its card.
Text on Liquid Glass is measured on the glass composited over its worst backdrop (the GLASS pairs below).

The dimming model is an assumption, stated so it can be argued with: the panel's light falls to a quarter while the
room's reflected light (the 0.05) does not, which is how a phone at 25% looks indoors. It does not model a dark room
(where dimmed contrast barely falls) or direct sun (which needs full brightness anyway).

The gate fails closed: a missing tokens file, theme block, ios.css or glass fill is a failure, not a skip, and so is
a board folder's copy of tokens.css, ios.css, motion.css or motion.js (docs/design/ios-v1/, app-v1/) that differs from
ds-v1's, since the boards load those copies.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKENS = ROOT / "docs" / "design" / "ds-v1" / "tokens.css"
DIM = 0.25
LIMITS = {"body": (7.0, 4.5), "text": (4.5, 3.0), "ui": (3.0, 1.8), "presence": (1.5, 1.25)}
DESIGN = ROOT / "docs" / "design"
# the files the boards load from their own project; each must be byte-for-byte ds-v1's
COPIES = {"tokens.css": ("ios-v1", "app-v1"), "ios.css": ("ios-v1", "app-v1"), "motion.css": ("ios-v1", "app-v1"), "motion.js": ("ios-v1", "app-v1")}

# (tier, foreground token, background token); both themes
PAIRS = [
    ("body", "ink", "surface"), ("body", "ink", "bg"), ("body", "ink", "surface-2"),
    ("text", "ink-2", "surface"), ("text", "ink-2", "bg"), ("text", "ink-2", "surface-2"),
    ("text", "ink-3", "surface"), ("text", "ink-3", "bg"), ("text", "ink-3", "surface-2"),
    ("body", "hero-ink", "hero"), ("text", "hero-ink-2", "hero"), ("text", "hero-ink-2", "hero-2"),
    ("text", "accent", "surface"), ("text", "accent", "bg"), ("text", "on-accent", "accent"),  # a filled button's short semibold label
    ("text", "accent", "surface-2"),  # a link or a selected label on a raised or selected row (MA-240)
    ("text", "accent", "add-bg"),  # a link on a success tint (MA-240 round 2)
    ("text", "up", "surface"), ("text", "up", "bg"), ("text", "down-quiet", "surface"),
    ("text", "alert", "surface"), ("text", "alert", "alert-bg"), ("text", "on-alert", "alert"),  # a count badge
    ("text", "add", "add-bg"), ("text", "hold", "hold-bg"), ("text", "pause", "pause-bg"),
    ("text", "trim", "trim-bg"), ("text", "reb", "reb-bg"), ("text", "watch", "watch-bg"),
    ("ui", "chart-line", "surface"), ("ui", "chart-2", "surface"), ("ui", "chart-3", "surface"),
    ("ui", "coral", "hero"), ("ui", "meter", "surface-2"), ("ui", "focus", "surface"),
    ("ui", "ink-3", "surface-2"),  # a switch's ring, an empty track's edge
    ("text", "hero-up", "hero"), ("text", "hero-up", "hero-2"),  # a rising month on the hero
    ("ui", "chart-4", "surface"), ("ui", "chart-5", "surface"),
    ("ui", "pillar-for", "surface"), ("ui", "pillar-against", "surface"),
    ("presence", "track", "surface"), ("presence", "mask", "surface"), ("presence", "mask-hero", "hero"),
    ("presence", "track", "bg"), ("presence", "track", "surface-2"), ("presence", "track", "hero"),  # bars sit on the page, a fill and the hero too (MA-240)
    ("presence", "track", "add-bg"),  # a bar on a success tint (MA-240 round 2)
    ("presence", "band", "hero"), ("presence", "band", "surface"),  # a chart's range band, as the Projection draws its 8 in 10 runs (MA-240)
    ("ui", "coral", "band+hero"), ("ui", "chart-line", "band+surface"),  # the line drawn over the band (a ground "a+b" is a over b)
] + [("ui", t, b) for t in ("ccy-usd", "ccy-gbp", "ccy-inr", "ccy-eur", "ccy-jpy", "ccy-other", "asset-shares", "asset-bonds",
                            "asset-silver", "asset-cash", "meter", "chart-line") for b in ("surface", "track")]
# Labels on glass (glass carries labels only, never body copy): the fill composited over the worst backdrop the bar
# keeps its look over. In light that is the darkest, the accent (over the navy hero or a member's bubble iOS turns the
# glass dark and its labels light); in dark it is the brightest, the accent button. The backdrop is read from the
# tokens, so a new accent moves it. Foregrounds named lg-* come from ios.css, the rest from tokens.css.
GLASS_BACKDROP = "accent"
GLASS_TEXT = [("body", "ink"), ("text", "ink-2"), ("text", "lg-accent"), ("text", "lg-up"), ("presence", "lg-mask")]


def blocks_at(css: str, name: str = "a stylesheet") -> list[tuple[str, str, tuple[str, ...]]]:
    """Every rule in a stylesheet as (selector, body, enclosing_blocks), in order: comments dropped, an @import or other
    statement before a selector dropped, and enclosing @media, @supports or parent blocks kept in tuple order."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out, start, sels = [], 0, []
    for i, ch in enumerate(css):
        if ch == "{":
            head = " ".join(css[start:i].split(";")[-1].split())
            sels.append(head)
            start = i + 1
        elif ch == "}":
            if not sels:
                sys.exit(f"contrast: FAIL a '}}' with no block to close in {name}: it cannot be read, so nothing in it is measured")
            head = sels.pop()
            if not head.startswith("@"):
                out.append((head, css[start:i], tuple(sels)))
            start = i + 1
    if sels:
        sys.exit(f"contrast: FAIL a block left open at the end of {name} ('{sels[-1]}'): a browser applies it, so it cannot be skipped")
    return out


def blocks(css: str, name: str = "a stylesheet") -> list[tuple[str, str, bool]]:
    """Every rule in a stylesheet as (selector, body, top_level), in order. The one reader behind parse, ios_glass and
    strays, so what is measured and what is refused come from the same view."""
    return [(sel, body, not enc) for sel, body, enc in blocks_at(css, name)]


# The measured blocks: in tokens.css the first top-level ":root, .t-light" and ".t-dark"; in ios.css the first
# top-level ".mp" and dark ".mp". Any other rule that sets one of their colour tokens changes what a screen shows
# without being measured (a second .t-dark wins in the browser; a rule in @media wins at its width).
MEASURED = {"tokens.css": {"t-light": ":root, .t-light", "t-dark": ".t-dark"},
            "ios.css": {"t-light": ".mp", "t-dark": ".t-dark.mp, .t-dark .mp"}}


def measured(name: str) -> dict[str, tuple[int, dict[str, str]]]:
    """{theme: (index of its block, {token: value})} for one stylesheet; a missing block ends the run as a failure."""
    p = DESIGN / "ds-v1" / name
    if not p.exists():
        sys.exit(f"contrast: FAIL docs/design/ds-v1/{name} is missing, so {'text on glass is' if name == 'ios.css' else 'nothing is'} measured")
    rules, found = blocks(p.read_text(), name), {}
    prefix = "mp" if name == "tokens.css" else "lg"
    for theme, sel in MEASURED[name].items():
        want = {" ".join(x.split()) for x in sel.split(",")}  # a selector list matches in any order
        idx = next((k for k, (s, _, top) in enumerate(rules) if top and {" ".join(x.split()) for x in s.split(",")} == want), None)
        if idx is None:
            sys.exit(f"contrast: FAIL no top-level '{sel}' block ({theme}) in docs/design/ds-v1/{name}")
        found[theme] = (idx, dict(re.findall(r"--" + prefix + r"-([\w-]+)\s*:\s*([^;]+);", rules[idx][1])))
    return found


def parse() -> dict[str, dict[str, str]]:
    """{theme: {token: value}} for the light root and .t-dark blocks of tokens.css."""
    return {theme: vals for theme, (_, vals) in measured("tokens.css").items()}


def rgba(v: str) -> tuple[float, float, float, float]:
    v = v.strip()
    if v.startswith("#"):
        h = v[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) not in (6, 8):
            raise ValueError(v)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
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


def ios_glass(theme: str) -> dict[str, str]:
    """ios.css's --lg-* values for a theme, from its measured block; anything missing ends the run as a failure."""
    vals = {"lg-" + k: v for k, v in measured("ios.css")[theme][1].items()}
    if "lg-fill" not in vals:
        sys.exit(f"contrast: FAIL no --lg-fill for {theme} in docs/design/ds-v1/ios.css")
    return vals


_NAMED = ("transparent currentcolor white black red green blue yellow orange purple pink brown grey gray silver gold navy "
          "teal maroon olive lime aqua cyan magenta fuchsia coral crimson salmon tomato indigo violet beige ivory khaki "
          "lavender plum orchid tan wheat linen snow azure mintcream honeydew seashell whitesmoke gainsboro lightgray "
          "lightgrey darkgray darkgrey dimgray dimgrey slategray slategrey lightslategray darkslategray steelblue "
          "royalblue midnightblue skyblue firebrick darkred darkgreen darkblue chartreuse turquoise sienna peru chocolate").split()
_COLOUR = re.compile(r"#[0-9A-Fa-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|var\(--(?:mp|lg)-|\b(?:"
                     + "|".join(_NAMED) + r")\b(?![\w-])", re.I)


DARK_MEDIA = {
    "tokens.css": {":root:not(.t-light):not(.t-dark)"},
    "ios.css": {":root:not(.t-light):not(.t-dark) .mp", ":root:not(.t-light):not(.t-dark).mp"},
}
_HOVER_GUARDED_BOARDS = {
    "Chart options.dc.html", "Foundations.dc.html", "Components.dc.html", "Components 2.dc.html",
    "Kind icons.dc.html", "MyPaisa DS v1.dc.html",
    "Web v4 · Projection.dc.html", "iPhone v4 · Projection.dc.html",
    "Web v4 · Budget forecast.dc.html", "iPhone v4 · Budget forecast.dc.html",
    "Web v4 · Budget forecast 1a states.dc.html", "iPhone v4 · Budget forecast 1a states.dc.html",
    "Web v4 · Plans in the chat.dc.html", "iPhone v4 · Plans in the chat.dc.html",
    "Web v4 · Plans in the chat 2a states.dc.html", "iPhone v4 · Plans in the chat 2a states.dc.html",
    "Web v4 · Plans tab.dc.html", "iPhone v4 · Plans tab.dc.html",
    "Web v4 · Plans tab 3a states.dc.html", "iPhone v4 · Plans tab 3a states.dc.html",
}


def strays() -> list[str]:
    """Every rule outside the measured blocks that sets an --mp-* or --lg-* token either named in the measured blocks
    or holding a colour in any form (hex, rgb, hsl, hwb, lab, lch, oklab, oklch, color(), color-mix(), or a var() of
    another token): it would paint without being measured. tokens.css, ios.css and motion.css are all read, for both
    prefixes, and a duplicate or @media copy of a measured block counts as outside — save the one system-theme mirror
    @media (prefers-color-scheme: dark) in tokens.css and ios.css, which must match its measured .t-dark block."""
    bad = []
    found = {"tokens.css": measured("tokens.css"), "ios.css": measured("ios.css")}
    names = {("mp" if f == "tokens.css" else "lg") + "-" + k for f, fd in found.items() for _, vals in fd.values() for k in vals}
    for name in ("tokens.css", "ios.css", "motion.css"):
        path = DESIGN / "ds-v1" / name
        if not path.exists():
            continue
        keep = {idx for idx, _ in found.get(name, {}).values()}
        own = {"tokens.css": "mp", "ios.css": "lg"}.get(name)
        seen_dark_media = False
        for k, (sel, body, enc) in enumerate(blocks_at(path.read_text(), name)):
            top = not enc
            if k in keep:
                # a measured block is read for its own prefix only: the other file's tokens set here would go unmeasured
                for tok in re.findall(r"--((?:mp|lg)-[\w-]+)\s*:", body):
                    if not tok.startswith(own + "-"):
                        bad.append(f"--{tok} is set in {name} under '{sel}', a block measured only for --{own}-* tokens")
                continue
            sel_set = {" ".join(x.split()) for x in sel.split(",")}
            if (name in DARK_MEDIA and not seen_dark_media
                    and enc == ("@media (prefers-color-scheme: dark)",) and sel_set == DARK_MEDIA[name]):
                seen_dark_media = True
                for tok in re.findall(r"--((?:mp|lg)-[\w-]+)\s*:", body):
                    if not tok.startswith(own + "-"):
                        bad.append(f"--{tok} is set in {name} under '{sel}', a block measured only for --{own}-* tokens")
                dark_vals = {tk: tv.strip() for tk, tv in found[name]["t-dark"][1].items()}
                decls = [(tk, tv.strip()) for tk, tv in re.findall(r"--" + own + r"-([\w-]+)\s*:\s*([^;}]+)", body)]
                media_vals = dict(decls)
                if len(decls) != len(media_vals) or media_vals != dark_vals:
                    dups = {tk for tk, _ in decls if sum(1 for k2, _ in decls if k2 == tk) > 1}
                    diff = sorted(dups | (set(dark_vals) ^ set(media_vals)) | {tk for tk in dark_vals if media_vals.get(tk) != dark_vals[tk]})
                    bad.append(f"@media (prefers-color-scheme: dark) in {name} disagrees with its measured .t-dark block ({', '.join('--' + own + '-' + tk for tk in diff)})")
                continue
            for tok, val in re.findall(r"--((?:mp|lg)-[\w-]+)\s*:\s*([^;]*)", body):
                if tok in names or _COLOUR.search(val):
                    where = sel if top else f"{sel} (inside @media or @supports)"
                    bad.append(f"--{tok} is set in {name} under '{where}', outside the blocks the gate measures")
    return bad


def token_refs_and_hovers() -> list[str]:
    """Every var(--mp-*) and var(--lg-*) reference in ds-v1, ios-v1, app-v1 and prototype-v5 must name a token defined
    in ds-v1/{tokens,ios,motion}.css, and shared stylesheets / updated boards must scope bare a:hover colour rules with
    :not([class]) so link hover never overrides a filled button's label contrast (MA-298)."""
    bad, defined = [], set()
    for f in ("tokens.css", "ios.css", "motion.css"):
        p = DESIGN / "ds-v1" / f
        if p.exists():
            txt = re.sub(r"/\*.*?\*/", "", p.read_text(), flags=re.S)
            defined.update(re.findall(r"--((?:mp|lg)-[\w-]+)\s*:", txt))
    for sub in ("ds-v1", "ios-v1", "app-v1", "prototype-v5"):
        folder = DESIGN / sub
        if not folder.exists():
            continue
        for p in sorted(folder.rglob("*")):
            if not p.is_file() or p.suffix not in (".css", ".html", ".js"):
                continue
            if sub in ("ios-v1", "app-v1") and p.name in COPIES:
                continue
            txt = p.read_text()
            rel = f"docs/design/{sub}/{p.relative_to(folder).as_posix()}"
            for tok in sorted(set(re.findall(r"var\(--((?:mp|lg)-[\w-]+)\s*[,)]", txt)) - defined):
                bad.append(f"{rel} references undefined token --{tok}")
            if p.suffix == ".css" or p.name in _HOVER_GUARDED_BOARDS:
                styles = txt if p.suffix == ".css" else "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", txt, flags=re.S | re.I))
                for sel, body, _ in blocks_at(styles, rel):
                    if re.search(r"(?:^|;|\s)color\s*:", body):
                        for part in (s.strip() for s in sel.split(",")):
                            if re.search(r"(?:^|\s)a:hover\b", part) and ":not([class])" not in part:
                                bad.append(f"{rel} has unscoped '{part}' setting color (use a:not([class]):hover so button links keep their contrast)")
    return bad


def copies() -> list[str]:
    """Each board folder's copy of a shared file that is missing or differs from ds-v1's."""
    bad = []
    for name, projects in COPIES.items():
        src = DESIGN / "ds-v1" / name
        for proj in projects:
            dst = DESIGN / proj / name
            if not src.exists() or not dst.exists() or dst.read_bytes() != src.read_bytes():
                bad.append(f"docs/design/{proj}/{name}")
    return bad


# Faults the gate must refuse, each made on a copy of the files (MA-161 review, round 1, findings a1 to a3). The copy
# first gets ds-v1's shared files in every board folder, so a case tests the gate, not the copies' state today.
SELFTEST = {  # case: (file, pattern, replacement, the FAIL line it must produce; a None pattern deletes the file)
    "dark-glass-thin-reordered": ("ds-v1/ios.css", r"\.t-dark\.mp, \.t-dark \.mp \{\n  --lg-fill: [^;]+;", ".t-dark .mp, .t-dark.mp {\n  --lg-fill: rgba(24, 30, 40, 0.05);", r"t-dark .* on glass"),
    "light-glass-thin": ("ds-v1/ios.css", r"(\.mp \{\n(?:.*\n)*?  --lg-fill: )[^;]+;", r"\1rgba(255, 255, 255, 0.30);", r"t-light .* on glass"),
    "hex8-alpha": ("ds-v1/tokens.css", r"(\.t-dark \{(?:.*\n)*?  --mp-ink-3: #[0-9A-Fa-f]{6})", r"\g<1>40", r"t-dark .* ink-3 on"),
    "ios-css-missing": ("ds-v1/ios.css", None, None, r"ios\.css is missing"),
    "glass-accent-low": ("ds-v1/ios.css", r"--lg-accent: #[0-9A-Fa-f]{6};", "--lg-accent: #E0806C;", r"lg-accent on glass"),
    "glass-mask-vanishes": ("ds-v1/ios.css", r"--lg-mask: #[0-9A-Fa-f]{6};", "--lg-mask: #F2F0EC;", r"t-light .* lg-mask on glass"),
    "copy-differs": ("ios-v1/tokens.css", r"(\.t-dark \{(?:.*\n)*?  --mp-ink-2: )#[0-9A-Fa-f]{6}", r"\1#3A4250", r"ios-v1/tokens\.css differs"),
    "copy-differs-app-ios": ("app-v1/ios.css", r"--lg-accent: #[0-9A-Fa-f]{6};", "--lg-accent: #E0806C;", r"app-v1/ios\.css differs"),  # MA-193: the prototype's copy
    "mark-lost-on-track": ("ds-v1/tokens.css", r"--mp-ccy-other: #[0-9A-Fa-f]{6};", "--mp-ccy-other: #B4B6BC;", r"ccy-other on track"),
    "track-vanishes": ("ds-v1/tokens.css", r"(:root,\s*\.t-light\s*\{(?:.*\n)*?  --mp-track: )#[0-9A-Fa-f]{6}", r"\1#F4F4F6", r"t-light .* track on surface"),
    "track-on-page": ("ds-v1/tokens.css", r"(:root,\s*\.t-light\s*\{(?:.*\n)*?  --mp-track: )#[0-9A-Fa-f]{6}", r"\1#CDCFD4", r"t-light .* track on bg"),  # MA-240: passed on a card, faded on the page
    "track-on-hero": ("ds-v1/tokens.css", r"(\.t-dark \{(?:.*\n)*?  --mp-track: )#[0-9A-Fa-f]{6}", r"\1#454E5C", r"t-dark .* track on hero"),
    "accent-on-raised": ("ds-v1/tokens.css", r"(\.t-dark \{(?:.*\n)*?  --mp-accent: )#[0-9A-Fa-f]{6}", r"\1#FF8E74", r"t-dark .* accent on surface-2"),  # MA-240: a darker coral falls under 3:1 dimmed on a raised row
    "band-vanishes": ("ds-v1/tokens.css", r"(:root,\s*\.t-light\s*\{(?:.*\n)*?  --mp-band: )rgba\([^)]*\)", r"\1rgba(255, 107, 79, 0.18)", r"t-light .* band on hero"),  # MA-240: the 8 in 10 band at the old area's 18%
    "band-hides-line": ("ds-v1/tokens.css", r"(\.t-dark\s*\{(?:.*\n)*?  --mp-band: )rgba\([^)]*\)", r"\1rgba(255, 122, 94, 0.55)", r"t-dark .* coral on band\+hero"),  # MA-240 round 2: a band so strong the line over it fades
    "accent-on-tint": ("ds-v1/tokens.css", r"(\.t-dark\s*\{(?:.*\n)*?  --mp-accent: )#[0-9A-Fa-f]{6}", r"\1#FF9A82", r"t-dark .* accent on add-bg"),  # MA-240 round 2: the old dark accent on a success tint
    "mask-vanishes": ("ds-v1/tokens.css", r"(\.t-dark \{(?:.*\n)*?  --mp-mask: )#[0-9A-Fa-f]{6}", r"\1#1A222F", r"t-dark .* mask on surface"),
    "hero-gain-dim": ("ds-v1/tokens.css", r"(:root,\s*\.t-light\s*\{(?:.*\n)*?  --mp-hero-up: )#[0-9A-Fa-f]{6}", r"\1#2E8F52", r"t-light .* hero-up on hero"),
    "stray-glass-block": ("ds-v1/ios.css", r"\Z", "\n.t-light .mp { --lg-fill: rgba(255, 255, 255, 0.30); }\n", r"--lg-fill .* outside"),
    "stray-token-block": ("ds-v1/tokens.css", r"\Z", "\n.t-dark .mp { --mp-ink-3: #5A6372; }\n", r"--mp-ink-3 .* outside"),
    "stray-duplicate-dark": ("ds-v1/tokens.css", r"\Z", "\n.t-dark { --mp-ink-3: #3A4250; }\n", r"--mp-ink-3 .*'\.t-dark', outside"),
    "stray-media-glass": ("ds-v1/ios.css", r"\Z", "\n@media (min-width: 700px) { .mp { --lg-fill: rgba(255,255,255,0.30); } }\n", r"--lg-fill .*inside @media"),
    "stray-var-value": ("ds-v1/tokens.css", r"\Z", "\n.t-dark .mp-card { --mp-ink-2: var(--mp-line); }\n", r"--mp-ink-2 .* outside"),
    "stray-new-token": ("ds-v1/tokens.css", r"\Z", "\n.t-dark .mp-card { --mp-warn: #3A4250; }\n", r"--mp-warn .* outside"),
    "stray-mp-in-ios": ("ds-v1/ios.css", r"\Z", "\n.t-dark .mp { --mp-ink-3: #3A4250; }\n", r"--mp-ink-3 is set in ios\.css"),
    "stray-brace": ("ds-v1/tokens.css", r"\Z", "\n.x { color: red; } }\n.t-dark { --mp-ink-3: #3A4250; }\n", r"no block to close"),
    "unclosed-block": ("ds-v1/tokens.css", r"\Z", "\n.t-dark { --mp-ink-3: #3A4250;\n", r"left open at the end"),
    "stray-in-measured-ios": ("ds-v1/ios.css", r"(\.t-dark\.mp, \.t-dark \.mp \{\n)", r"\1  --mp-ink-3: #3A4250;\n", r"--mp-ink-3 .* measured only for --lg-"),
    "stray-named-colour": ("ds-v1/tokens.css", r"\Z", "\n.t-dark .mp-card { --mp-glow: white; }\n", r"--mp-glow .* outside"),
    "stray-in-motion": ("ds-v1/motion.css", r"\Z", "\n@media (prefers-reduced-motion: reduce) { .t-dark .mp { --mp-ink-3: #3A4250; } }\n", r"--mp-ink-3 is set in motion\.css"),
    "chart-4-dim": ("ds-v1/tokens.css", r"--mp-chart-4: #[0-9A-Fa-f]{6};", "--mp-chart-4: #E4C9A0;", r"t-light .* chart-4 on surface"),
    "chart-5-dim": ("ds-v1/tokens.css", r"--mp-chart-5: #[0-9A-Fa-f]{6};", "--mp-chart-5: #D9CBEF;", r"t-light .* chart-5 on surface"),
    "pillar-for-dim": ("ds-v1/tokens.css", r"--mp-pillar-for: #[0-9A-Fa-f]{6};", "--mp-pillar-for: #C9D6F5;", r"t-light .* pillar-for on surface"),
    "pillar-against-dim": ("ds-v1/tokens.css", r"--mp-pillar-against: #[0-9A-Fa-f]{6};", "--mp-pillar-against: #EBD9BC;", r"t-light .* pillar-against on surface"),
    "asset-lost": ("ds-v1/tokens.css", r"--mp-asset-bonds: #[0-9A-Fa-f]{6};", "--mp-asset-bonds: #D2D0D8;", r"t-light .* asset-bonds on (surface|track)"),
    "currency-on-surface": ("ds-v1/tokens.css", r"--mp-ccy-usd: #[0-9A-Fa-f]{6};", "--mp-ccy-usd: #D6E0F7;", r"t-light .* ccy-usd on surface"),
    "ccy-inr-dim": ("ds-v1/tokens.css", r"--mp-ccy-inr: #[0-9A-Fa-f]{6};", "--mp-ccy-inr: #EBD9BC;", r"t-light .* ccy-inr on (surface|track)"),
    "dark-media-mismatch": ("ds-v1/tokens.css", r"(@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\.t-light\):not\(\.t-dark\) \{\s*--mp-bg: )#[0-9A-Fa-f]{6};", r"\1#111827;", r"prefers-color-scheme: dark.*tokens\.css disagrees.*--mp-bg"),
    "undefined-var-token": ("ds-v1/tokens.css", r"\Z", "\n.x { color: var(--mp-uk); }\n", r"ds-v1/tokens\.css references undefined token --mp-uk"),
    "unscoped-a-hover": ("ds-v1/tokens.css", r"\Z", "\na:hover { color: var(--mp-accent); }\n", r"ds-v1/tokens\.css has unscoped 'a:hover' setting color"),
}


def mutate(root: Path, rel: str | None, pat: str | None, rep: str | None, before_copy: bool) -> bool:
    """Make one fault in the copy under root. A DS v1 file is changed first and then copied into every board project,
    as copying a DS v1 change into the board folders does, so the copies agree and only the fault itself can fail the gate;
    a board folder's own copy is changed after the copy, so it differs."""
    design = root / "docs" / "design"
    ok = True
    if rel and before_copy:
        ok = _apply(design / rel, pat, rep)
    for f, projects in COPIES.items():
        src = design / "ds-v1" / f
        for proj in projects:
            (design / proj).mkdir(parents=True, exist_ok=True)
            dst = design / proj / f
            if src.exists():
                shutil.copy(src, dst)
            elif dst.exists():
                dst.unlink()
    if rel and not before_copy:
        ok = _apply(design / rel, pat, rep)
    return ok


def _apply(target: Path, pat: str | None, rep: str | None) -> bool:
    if pat is None:
        target.unlink()
        return True
    new, n = re.subn(pat, rep, target.read_text(), count=1)
    target.write_text(new)
    return n == 1


def selftest(cases: list[str]) -> int:
    bad = 0
    for name in cases or list(SELFTEST) + ["baseline"]:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "scripts").mkdir()
            shutil.copy(__file__, root / "scripts" / "contrast_check.py")
            for f in COPIES:
                (root / "docs" / "design" / "ds-v1").mkdir(parents=True, exist_ok=True)
                shutil.copy(DESIGN / "ds-v1" / f, root / "docs" / "design" / "ds-v1" / f)
            expect = None
            if name != "baseline":
                if name not in SELFTEST:
                    print(f"selftest: no case {name!r}")
                    bad += 1
                    continue
                rel, pat, rep, expect = SELFTEST[name]
                if not mutate(root, rel, pat, rep, before_copy=rel.startswith("ds-v1/")):
                    print(f"FAIL selftest {name}: the mutation found nothing to change in {rel}")
                    bad += 1
                    continue
            else:
                mutate(root, None, None, None, before_copy=True)
            r = subprocess.run([sys.executable, "-I", str(root / "scripts" / "contrast_check.py")], capture_output=True, text=True)
            fails = [line for line in (r.stdout + r.stderr).splitlines() if "FAIL" in line]
            if expect is None:
                ok, why = r.returncode == 0, f"exit {r.returncode}"
            else:
                # refused for the right reason: the expected FAIL line, and no stray copy failure from the harness
                hit = any(re.search(expect, line) for line in fails)
                stray = not name.startswith("copy-differs") and any("differs from docs/design/ds-v1/" in line for line in fails)
                ok, why = r.returncode == 1 and hit and not stray, f"exit {r.returncode}, expected /{expect}/ {'found' if hit else 'not found'}{', copies out of step' if stray else ''}"
            bad += not ok
            print(f"{'ok  ' if ok else 'FAIL'} selftest {name}: {'passes' if expect is None else 'refused for the right reason'}" if ok
                  else f"FAIL selftest {name}: {why}\n{(r.stdout + r.stderr)[-400:]}")
    print(f"contrast selftest: {bad} case{'s' if bad != 1 else ''} wrong")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    if "--selftest" in argv:
        return selftest(argv[argv.index("--selftest") + 1:])
    report = "--report" in argv
    themes = parse()
    bad = 0
    for theme, tok in themes.items():
        surface = rgba(tok["surface"])
        rows = []
        for tier, f, b in PAIRS:
            if f not in tok or any(x not in tok for x in b.split("+")):
                rows.append((tier, f"{f} on {b}", None, None, "missing token"))
                continue
            bg = surface
            for layer in reversed(b.split("+")):   # "band+hero": the band composited over the hero
                bg = over(rgba(tok[layer]), bg)
            fg = over(rgba(tok[f]), bg)
            rows.append((tier, f"{f} on {b}", ratio(fg, bg), ratio(fg, bg, DIM), ""))
        lg = ios_glass(theme)
        backdrop = tok[GLASS_BACKDROP].strip()
        glass = over(rgba(lg["lg-fill"]), rgba(backdrop))
        for tier, f in GLASS_TEXT:
            v = lg.get(f) if f.startswith("lg-") else tok.get(f)
            if v is None:
                rows.append((tier, f"{f} on glass", None, None, "missing token"))
                continue
            fg = over(rgba(v), glass)
            rows.append((tier, f"{f} on glass over {backdrop}", ratio(fg, glass), ratio(fg, glass, DIM), ""))
        for tier, name, full, dim, why in rows:
            lo_full, lo_dim = LIMITS[tier]
            ok = full is not None and full >= lo_full and dim >= lo_dim
            bad += not ok
            if report or not ok:
                figs = "" if full is None else f"{full:5.2f}:1, {dim:4.2f}:1 at 25%"
                print(f"{'ok  ' if ok else 'FAIL'} {theme:7} {tier:4} {name:34} {figs} (needs {lo_full}, {lo_dim}){' ' + why if why else ''}")
    for why in strays():
        bad += 1
        print(f"FAIL {why}")
    for why in token_refs_and_hovers():
        bad += 1
        print(f"FAIL {why}")
    for path in copies():
        bad += 1
        print(f"FAIL {path} differs from docs/design/ds-v1/ (copy it from there)")
    print(f"contrast: {bad} pair{'s' if bad != 1 else ''} below the limits or copies out of step")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
