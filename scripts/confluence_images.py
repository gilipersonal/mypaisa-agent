#!/usr/bin/env python3
"""Board previews and the roadmap picture for the Confluence pages (MA-228).

Called by `python3 scripts/confluence_docs.py images CAPTURES OUT`. CAPTURES is the folder the board capture writes
(.claude/skills/plan-sync/scripts/capture_boards.js: one PNG per board and an index.json); OUT receives one PNG per
preview the pages need and whose boards changed since it was uploaded. Needs Pillow; the gates never import it.
"""
from __future__ import annotations

import datetime
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import confluence_docs as cd
import roadmap

BG, CARD, LINE, INK, INK2, INK3 = "#F6F4F1", "#FFFFFF", "#E4E0DA", "#14171F", "#4E5462", "#646A78"
HERO, CORAL, ACCENT, BLUE, AMBER, VIOLET, GREEN = "#13213A", "#FF6B4F", "#C2381F", "#2453C9", "#8A5300", "#6B3FB8", "#1D7A3E"
STATE = {"picked": GREEN, "planned": BLUE, "superseded": INK3, "drawn": INK3}
WIDTH, PAD, GAP = 1720, 40, 40
FONT = "/System/Library/Fonts/SFNS.ttf"


def font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default(size)


def fit(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, width: int) -> list[str]:
    """Wrap text to width, at most two lines."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    if len(lines) > 2:
        lines = lines[:2]
        while draw.textlength(lines[1] + "…", font=f) > width and lines[1]:
            lines[1] = lines[1][:-1]
        lines[1] += "…"
    return lines


def tile(src: Path | None, w: int, max_h: int, title: str, sub: str, state: str) -> Image.Image:
    f1, f2 = font(22), font(17)
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    lines = fit(probe, title, f1, w - 32)
    cap_h = 20 + 30 * len(lines) + 30
    if src and src.exists():
        im = Image.open(src).convert("RGB")
        h = round(im.height * w / im.width)
        im = im.resize((w, h), Image.LANCZOS)
        cut = h > max_h
        if cut:
            im = im.crop((0, 0, w, max_h))
            fade = Image.new("RGBA", (w, 120))
            for y in range(120):
                ImageDraw.Draw(fade).line([(0, y), (w, y)], fill=(246, 244, 241, int(255 * y / 120)))
            im.paste(fade, (0, max_h - 120), fade)
    else:
        im, cut = Image.new("RGB", (w, 240), BG), False
        ImageDraw.Draw(im).text((24, 100), "Not captured: open it in Claude Design", font=f2, fill=INK3)
    card = Image.new("RGB", (w, im.height + cap_h), CARD)
    card.paste(im, (0, 0))
    d = ImageDraw.Draw(card)
    y = im.height + 14
    if cut:
        d.text((16, im.height - 34), "continues in Claude Design", font=f2, fill=INK2)
    d.line([(0, im.height), (w, im.height)], fill=LINE, width=2)
    for ln in lines:
        d.text((16, y), ln, font=f1, fill=INK)
        y += 30
    d.rounded_rectangle([16, y + 4, 16 + 12, y + 16], radius=6, fill=STATE.get(state, INK3))
    d.text((36, y), sub, font=f2, fill=INK2)
    return card


def sheet(title: str, subtitle: str, groups: list[tuple[str, list[tuple[Path | None, str, str, str]]]]) -> Image.Image:
    """Groups of tiles under a heading each: (heading, [(png, board, line under it, state)])."""
    inner = WIDTH - 2 * PAD
    rows: list[tuple[str, object]] = []
    for heading, tiles in groups:
        narrow = heading.startswith(("iOS app: iPhone", "Web app: phone"))
        cols = 4 if narrow else 2
        w = (inner - (cols - 1) * GAP) // cols
        max_h = 1100 if narrow else 900
        made = [tile(p, w, max_h, b, sub, st) for p, b, sub, st in tiles]
        rows.append(("h", heading))
        for k in range(0, len(made), cols):
            rows.append(("r", (made[k:k + cols], w)))
    hf, sf, gf = font(34), font(20), font(26)
    height = PAD + 50 + 34 + 20
    for kind, v in rows:
        height += 56 if kind == "h" else max(t.height for t in v[0]) + GAP
    out = Image.new("RGB", (WIDTH, height + PAD), BG)
    d = ImageDraw.Draw(out)
    d.text((PAD, PAD), title, font=hf, fill=INK)
    d.text((PAD, PAD + 48), subtitle, font=sf, fill=INK2)
    y = PAD + 50 + 34 + 20
    for kind, v in rows:
        if kind == "h":
            d.text((PAD, y + 10), v, font=gf, fill=HERO)
            y += 56
            continue
        tiles, w = v
        for k, t in enumerate(tiles):
            x = PAD + k * (w + GAP)
            d.rounded_rectangle([x - 1, y - 1, x + w, y + t.height], radius=14, outline=LINE, width=2)
            out.paste(t, (x, y))
        y += max(t.height for t in tiles) + GAP
    return out


def board_tiles(ctx: cd.Ctx, captures: Path, index: dict, boards: list) -> list[tuple[str, list]]:
    groups: dict[str, list] = {}
    for p, f, b in boards:
        rec = index.get(f"{ctx.trace['claude_design'][p]['dir']}/{f}::{b}", {})
        png = captures / rec["file"] if rec.get("found") else None
        keys = ", ".join(i["key"] for i in ctx.cites.get((p, f, b), []))
        st = cd.board_state(ctx, (p, f, b))
        groups.setdefault(cd.DOOR_NAMES[cd.door_of(b, p)], []).append((png, b, f"{st} · {keys}", st))
    return [(h, groups[h]) for h in cd.DOOR_NAMES.values() if h in groups]


def roadmap_png(ctx: cd.Ctx) -> Image.Image:
    s = ctx.schedule
    dated = {n: v for n, v in s.items() if v.get("start")}
    first = datetime.date.fromisoformat(min(v["start"] for v in dated.values())).replace(day=1)
    last = datetime.date.fromisoformat(max(v["end"] for v in dated.values()))
    months = []
    d = first
    while d <= last:
        months.append(d)
        d = (d.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
    left, top, row_h = 560, 150, 52
    W = WIDTH + 280
    H = top + row_h * len(s) + 120
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    span = (months[-1].replace(day=28) + datetime.timedelta(days=4)).replace(day=1) - first
    x_of = lambda day: left + (W - left - PAD) * ((day - first).days / span.days)  # noqa: E731
    dr.text((PAD, PAD), "MyPaisa: the journey from phase 0 to phase 20", font=font(38), fill=INK)
    dr.text((PAD, PAD + 50), f"From {roadmap.fmt(ctx.rm['start'])}, in build order. Estimated story by story in docs/roadmap.json.",
            font=font(21), fill=INK2)
    for m in months:
        x = x_of(m)
        dr.line([(x, top - 10), (x, H - 80)], fill=LINE, width=1)
        label = m.strftime("%b") + (f" {m.year}" if m.month == 1 or m == months[0] else "")
        dr.text((x + 4, top - 36), label, font=font(17), fill=INK3)
    colours = {range(0, 2): HERO, range(2, 10): ACCENT, range(10, 21): BLUE}
    for k, (n, v) in enumerate(s.items()):
        y = top + k * row_h
        col = next(c for r, c in colours.items() if int(n) in r)
        title = f"{n} · {v['title']}"
        f = font(19)
        while dr.textlength(title, font=f) > left - PAD - 20:
            title = title[:-2]
        dr.text((PAD, y + 12), title if title.endswith(v["title"][-3:]) else title + "…", font=f, fill=INK)
        if v.get("on_demand"):
            dr.text((left + 10, y + 12), "on demand: built when a new kind of holding is added", font=font(17), fill=INK3)
            continue
        a, b = datetime.date.fromisoformat(v["start"]), datetime.date.fromisoformat(v["end"])
        x0, x1 = x_of(a), max(x_of(b), x_of(a) + 8)
        dr.rounded_rectangle([x0, y + 8, x1, y + row_h - 8], radius=10, fill=col)
        lab = f"{a.day} {a:%b} – {b.day} {b:%b %Y}"
        tw = dr.textlength(lab, font=font(16))
        if x1 + 10 + tw < W - PAD:
            dr.text((x1 + 10, y + 15), lab, font=font(16), fill=INK2)
        else:
            dr.text((x0 - 10 - tw, y + 15), lab, font=font(16), fill=INK2)
    yk = H - 60
    for k, (t, c) in enumerate((("Foundations and talk (0 to 1)", HERO), ("The whole wealth (2 to 9)", ACCENT), ("The market side (10 to 20)", BLUE))):
        x = PAD + k * 420
        dr.rounded_rectangle([x, yk, x + 28, yk + 22], radius=6, fill=c)
        dr.text((x + 40, yk), t, font=font(19), fill=INK2)
    return im


def compose(ctx: cd.Ctx, captures: Path, out: Path) -> int:
    out.mkdir(parents=True, exist_ok=True)
    index = json.loads((captures / "index.json").read_text())
    have = ctx.manifest.get("images", {})
    made = []
    for name, w in cd.wanted_images(ctx).items():
        if have.get(name, {}).get("media") and have[name].get("source") == w["source"]:
            continue
        if "boards" in w:
            if name.startswith("phase-"):
                n, plat = int(name.split("-")[1]), name.split("-")[2].split(".")[0]
                p = next(p for p in ctx.phases if p["phase"] == n)
                title = f"Phase {n} · {p['title']}"
                sub = f"{cd.PLATFORM_NAMES[plat]}: each story's first board, light and dark, from Claude Design"
            else:
                f = w["boards"][0][1]
                title, sub = f.removesuffix(".dc.html"), f"{ctx.trace['claude_design'][w['boards'][0][0]]['name']} · every board a story cites"
            sheet(title, sub, board_tiles(ctx, captures, index, w["boards"])).save(out / name, quality=86, optimize=True)
        elif "file" in w:
            shutil.copy(w["file"], out / name)
        elif "capture" in w:
            continue  # a capture of an explainer page: scripts/confluence_capture.js makes it (MA-257), never this
        else:
            roadmap_png(ctx).save(out / name, optimize=True)
        made.append({"name": name, "page": w["page"], "bytes": (out / name).stat().st_size})
    print(json.dumps(made, indent=1))
    return 0
