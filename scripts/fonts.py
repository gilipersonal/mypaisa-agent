#!/usr/bin/env python3
"""The web's self-hosted fonts (MA-340, from MA-301 f 1a, Arun, 2 Nov 2026): no Google Fonts at either the web app or
the boards. The system font comes first (SF Pro on a Mac or an iPhone); where it is not there, Inter, variable WOFF2,
Latin and Latin Extended; and for the rounded figures, where SF Pro Rounded is not there, a small Nunito 800 subset of
the digits, the four currencies' signs (£ $ € ₹) and the marks a figure carries. Icons are Lucide, never a font.

    uv run --no-project --with 'fonttools[woff]==4.60.1' python scripts/fonts.py

reads the pinned Fontsource packages in web/node_modules (`@fontsource-variable/inter`, `@fontsource/nunito`, in the
web catalog) and writes the same font files twice, with a fonts.css beside each:
  - web/static/fonts/, served by the web app at /fonts/ and preloaded by web/src/app.html, with its @font-face rules in
    web/src/lib/styles/fonts.css;
  - docs/design/ds-v1/, flat beside tokens.css, whose `@import url("../ds-v1/fonts.css")` every board loads (the
    boards' folders are published flat, so the files sit beside fonts.css).
web/src/lib/styles/fonts.test.ts holds the two copies equal. Run it again only when a Fontsource version or the
figures change; the output is the same for the same inputs.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "web" / "node_modules"
INTER = MODULES / "@fontsource-variable" / "inter" / "files"
NUNITO = MODULES / "@fontsource" / "nunito" / "files"
WEB_FONTS = ROOT / "web" / "static" / "fonts"
WEB_CSS = ROOT / "web" / "src" / "lib" / "styles" / "fonts.css"
DS = ROOT / "docs" / "design" / "ds-v1"

# Inter's two Latin files as Fontsource cuts them, with their unicode-range, so a page fetches only what it draws.
INTER_FILES = {
    "inter-latin-wght-normal.woff2": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,"
    "U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    "inter-latin-ext-wght-normal.woff2": "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,"
    "U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
}
# A figure: digits, the signs of the four currencies (MA-275), and its separators and marks; each must be in the cut.
# The spaces are kept where Nunito has them; privacy mode's spacers (U+2007, U+2008) are not in Nunito, and a masked
# figure takes them from the next font. Nunito's Latin file has all but the rupee, which is in its Latin Extended file,
# so the subset is two files under one family.
FIGURES = "0123456789£$€+-−%,.:/()"
SPACES = "      "
NUNITO_CUTS = {
    "nunito-figures-latin-800.woff2": ("nunito-latin-800-normal.woff2", FIGURES, SPACES),
    "nunito-figures-rupee-800.woff2": ("nunito-latin-ext-800-normal.woff2", "₹", ""),
}

HEADER = """/* The web's self-hosted fonts (MA-340, MA-301 f 1a): written by scripts/fonts.py, never by hand. The system font
   comes first in the stacks (tokens.css --mp-font, --mp-font-round); these serve where SF Pro is not there. Inter is
   variable, Latin and Latin Extended; Nunito is the figures only, at 800, for the rounded figures. No Google Fonts. */
"""


def ranges(codepoints: list[int]) -> str:
    """A unicode-range for these code points, runs joined (U+0030-0039)."""
    out, cps = [], sorted(set(codepoints))
    i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f"U+{cps[i]:04X}" if i == j else f"U+{cps[i]:04X}-{cps[j]:04X}")
        i = j + 1
    return ",".join(out)


def cut(src: Path, dest: Path, text: str) -> list[int]:
    """Subset src to the glyphs of text, keeping the figure features (tabular and lining), as WOFF2; return what it has."""
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["tnum", "lnum", "kern"]
    opts.hinting = False
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]  # the copyright and licence names stay with the font (SIL OFL 1.1)
    opts.notdef_outline = True
    font = subset.load_font(str(src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, str(dest), opts)
    return sorted(TTFont(str(dest)).getBestCmap())


def face(family: str, weight: str, url: str, fmt: str, unicode_range: str) -> str:
    return (f"@font-face {{\n  font-family: \"{family}\";\n  font-style: normal;\n  font-display: swap;\n"
            f"  font-weight: {weight};\n  src: url(\"{url}\") format(\"{fmt}\");\n  unicode-range: {unicode_range};\n}}\n")


def main() -> int:
    for need in (INTER, NUNITO):
        if not need.is_dir():
            print(f"fonts.py: {need} is missing: run `corepack pnpm@12.16.1 --dir web install` first", file=sys.stderr)
            return 2
    WEB_FONTS.mkdir(parents=True, exist_ok=True)
    faces: list[tuple[str, str, str, str, str]] = []
    for name, urange in INTER_FILES.items():
        shutil.copyfile(INTER / name, WEB_FONTS / name)
        faces.append(("Inter", "100 900", name, "woff2-variations", urange))
    for name, (src, text, optional) in NUNITO_CUTS.items():
        has = cut(NUNITO / src, WEB_FONTS / name, text + optional)
        missing = [c for c in text if ord(c) not in has]
        if missing:
            print(f"fonts.py: {src} lacks {missing!r}", file=sys.stderr)
            return 1
        faces.append(("Nunito", "800", name, "woff2", ranges([cp for cp in has if cp >= 0x20])))
    for name in [*INTER_FILES, *NUNITO_CUTS]:
        shutil.copyfile(WEB_FONTS / name, DS / name)
    WEB_CSS.write_text(HEADER + "\n".join(face(f, w, "/fonts/" + n, t, r) for f, w, n, t, r in faces), encoding="utf-8")
    (DS / "fonts.css").write_text(HEADER + "\n".join(face(f, w, n, t, r) for f, w, n, t, r in faces), encoding="utf-8")
    for name in [*INTER_FILES, *NUNITO_CUTS]:
        print(f"{name}: {(WEB_FONTS / name).stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
