#!/usr/bin/env python3
"""The MyPaisa Boards Artifact: every board in one page, listed by board set and opened beside the list.

MA-296 retired this page on 30 Oct 2026; MA-324 brought it back on 3 Nov 2026 (Arun: "All artifacts and design should
be in sync with local"). The boards are drawn and edited in the repo, in docs/design/ios-v1/, app-v1/ and ds-v1/; this
builds the page that holds the whole set:

    python3 scripts/boards_page/build.py docs/design <out-dir>

It writes two files into <out-dir>, outside the repo (the scratchpad):
  - index.html: viewer.html (beside this script, the template) with the list of boards filled in;
  - files.json: every file the page needs, as its path under docs/design, in the Artifact tool's `files` list form.
The boards and the files they load (tokens.css, ios.css, motion.css, motion.js, support.js and the rest) are
published byte for byte from their folders; only the viewer is written here. Each folder's _ds/ and dot files are left
out. Prototype v5 (docs/design/prototype-v5/) has its own Artifact, so it is not listed. The sets' folders and names
come from docs/trace.json `claude_design`.

How it is published, whenever a board changes and before the PR: the Artifact tool, action publish, with file_path
<out-dir>/index.html, root docs/design, files the list in <out-dir>/files.json (and null for each live path no longer
in it: list the live files first), and url https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g, so the link stays the
same; then `python3 scripts/artifacts_sync.py record "MyPaisa Boards" <version>`. Until then `plan_sync.py check`
reports the artifact as older than its sources (docs/design/artifacts.json).

A board's own link is https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g#<id>, its id from board_id() below: the
folder's prefix (ios, app, ds) and the file name without .dc.html, lower case, every run of other characters one
hyphen (ios-v1/iPhone v4 · Home.dc.html is #ios-iphone-v4-home).
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
BOARDS_URL = "https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g"

# The sets' folders and names come from docs/trace.json `claude_design` (dir, name); the blurbs and group order stay here.
BLURBS = {
    "ios-v1": "The app's screens for iPhone, iPad and the foldable.",
    "app-v1": "The web app's browser boards, and Prototype v4.",
    "ds-v1": "The design system: foundations, components, the iOS kit, chart options, icons and the mark.",
}
SET_ORDER = ["ios-v1", "app-v1", "ds-v1"]

ORDER = {
    "ios-v1": ["iPhone v4", "iPad and foldable", "iPhone, first round", "Shell"],
    "app-v1": ["Web v4", "Browser boards", "Prototype v4", "Mini App and Telegram (superseded)"],
    "ds-v1": ["System", "Kits, icons and mark", "Telegram kit (superseded)"],
}


def projects_from_trace(repo: Path) -> list[tuple[str, str, str]]:
    cd = json.loads((repo / "docs/trace.json").read_text(encoding="utf-8"))["claude_design"]
    found = {Path(v["dir"]).name: v["name"] for v in cd.values()}
    if set(found) != set(SET_ORDER):
        raise SystemExit(f"build.py: trace claude_design names {sorted(found)}, expected {SET_ORDER}")
    return [(p, found[p], BLURBS[p]) for p in SET_ORDER]


PROJECTS: list[tuple[str, str, str]] = []


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def board_id(folder: str, file: str) -> str:
    """The viewer's id for a board file: `ios-iphone-v4-home` for ios-v1, `iPhone v4 · Home.dc.html`."""
    return slug(Path(folder).name.split("-")[0] + " " + file.removesuffix(".dc.html"))


def group_of(proj: str, name: str) -> str:
    if proj == "ios-v1":
        if name.startswith("iPhone v4"):
            return "iPhone v4"
        if name.startswith("iPad"):
            return "iPad and foldable"
        if name.startswith("iPhone"):
            return "iPhone, first round"
        return "Shell"
    if proj == "app-v1":
        if name.startswith("Web v4"):
            return "Web v4"
        if name.startswith("PrototypeV4") or name == "Prototype v4":
            return "Prototype v4"
        if name.startswith(("Telegram", "Mini App")) or name == "Prototype":
            return "Mini App and Telegram (superseded)"
        return "Browser boards"
    if name.startswith("Telegram kit"):
        return "Telegram kit (superseded)"
    if name in ("Foundations", "Components", "Components 2", "MyPaisa DS v1"):
        return "System"
    return "Kits, icons and mark"


def label_of(name: str, title: str) -> str:
    t = re.sub(r"^MyPaisa (iOS|app|DS) v1(: | · )", "", title).strip()
    t = re.sub(r" \(v4\)$", "", t)
    if name.startswith("PrototypeV4"):
        part = name[len("PrototypeV4"):]
        return "Part: " + {"Chat": "chat", "Pages": "pages", "Phone": "phone frame", "Web": "web frame"}.get(part, part)
    if not t:
        t = name
    t = re.sub(r"^(iPhone v4|iPad v4|Web v4)( ·)? ", "", t)
    return t if t.startswith(("iPad", "iPhone", "iOS")) else t[0].upper() + t[1:]


def collect(design: Path) -> tuple[list[dict], list[str]]:
    """Every board, sorted as the viewer lists it, and every file the page publishes (paths under design)."""
    boards, files = [], []
    for proj, _, _ in PROJECTS:
        folder = design / proj
        if not folder.is_dir():
            raise SystemExit(f"build.py: no board folder {folder}")
        for f in sorted(folder.iterdir()):
            if f.name.startswith(".") or f.is_dir():
                continue  # .DS_Store; _ds/ is the system Claude Design attached, which no board loads
            files.append(f"{proj}/{f.name}")
            if not f.name.endswith(".dc.html"):
                continue
            name = f.name.removesuffix(".dc.html")
            m = re.search(r"<title>([^<]*)", f.read_text(encoding="utf-8"))
            boards.append({
                "id": board_id(proj, f.name),
                "project": proj,
                "group": group_of(proj, name),
                "label": label_of(name, html.unescape(m.group(1)) if m else ""),
                "file": f.name,
                "path": f"{proj}/{f.name}",
            })
    key = {p: i for i, (p, _, _) in enumerate(PROJECTS)}
    boards.sort(key=lambda b: (key[b["project"]], ORDER[b["project"]].index(b["group"]),
                               b["label"].startswith("Part:"), b["label"].lower()))
    if len({b["id"] for b in boards}) != len(boards):
        raise SystemExit("build.py: two boards share an id")
    return boards, files


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        print("usage: python3 scripts/boards_page/build.py <design-dir> <out-dir>", file=sys.stderr)
        return 2
    design, out = Path(argv[1]).resolve(), Path(argv[2]).resolve()
    if out.is_relative_to(SCRIPTS.parent):
        print(f"build.py: write the page outside the repo, not into {out}", file=sys.stderr)
        return 2
    PROJECTS[:] = projects_from_trace(design.parent.parent)
    boards, files = collect(design)
    used = {(b["project"], b["group"]) for b in boards}
    data = {
        "projects": [{"id": p, "name": n, "blurb": d, "groups": [g for g in ORDER[p] if (p, g) in used]}
                     for p, n, d in PROJECTS],
        "boards": boards,
    }
    page = (HERE / "viewer.html").read_text(encoding="utf-8")
    if page.count("/*BOARDS*/null") != 1:
        print("build.py: viewer.html has no single /*BOARDS*/null to fill", file=sys.stderr)
        return 1
    page = page.replace("/*BOARDS*/null", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page, encoding="utf-8")
    (out / "files.json").write_text(json.dumps([{"path": p} for p in files], ensure_ascii=False, indent=0) + "\n",
                                    encoding="utf-8")
    parts = sum(1 for b in boards if b["label"].startswith("Part:"))
    print(f"{len(boards)} board files ({parts} of them Prototype v4's parts), {len(files)} files to publish, "
          f"written to {out}; publish to {BOARDS_URL}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
