#!/usr/bin/env python3
"""The MyPaisa Boards Artifact: every board in one page, listed by board set and opened beside the list (MA-260).

Since 30 Oct 2026 the boards are drawn and edited in the repo, in docs/design/ios-v1/, app-v1/ and ds-v1/ (the
folders were standalone Claude Design's three projects; the names stay), and Arun reviews them as private Claude
Artifacts. This builds the page that holds the whole set:

    python3 scripts/boards_page/build.py docs/design <out-dir>

It writes two files into <out-dir>, never beside this script:
  - index.html: viewer.html (beside this script, the template) with the list of boards filled in;
  - files.json: every file the page needs, as its path under docs/design, in the Artifact tool's `files` list form.
The boards and the files they load (tokens.css, ios.css, motion.css, motion.js, support.js and the rest) are
published byte for byte from their folders; only the viewer is written here. Each folder's _ds/ (the system Claude
Design attached, which no board loads) and dot files are left out. Prototype v5 (docs/design/prototype-v5/) is a
design record, not a board set, with its own Artifact, so it is not listed.

How the integrator publishes it, whenever a board changes and before the PR: the Artifact tool, action publish, with
file_path <out-dir>/index.html, root docs/design, files the list in <out-dir>/files.json, and url
https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g, so the link stays the same; then
`python3 scripts/design_sync.py published` stamps docs/design/boards-artifact.json.

A board's own link is https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g#<id>, its id from board_id() below: the
folder's prefix (ios, app, ds) and the file name without .dc.html, lower case, every run of other characters one
hyphen (ios-v1/iPhone v4 · Home.dc.html is #ios-iphone-v4-home). scripts/confluence_docs.py links boards the same
way, and this build fails if the two ever give a board different ids.
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

PROJECTS = [
    ("ios-v1", "MyPaisa iOS v1", "The app's screens for iPhone, iPad and the foldable."),
    ("app-v1", "MyPaisa app v1", "The web app's browser boards, and the superseded Mini App and Telegram boards."),
    ("ds-v1", "MyPaisa DS v1", "The design system: foundations, components, the kits, icons and the mark."),
]

ORDER = {
    "ios-v1": ["iPhone v4", "iPad and foldable", "iPhone, first round", "Shell"],
    "app-v1": ["Web v4", "Browser boards", "Prototype v4", "Mini App and Telegram (superseded)"],
    "ds-v1": ["System", "Kits, icons and mark", "Telegram kit (superseded)"],
}


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
    t = re.sub(r"^MyPaisa (app|DS) v1: ", "", title).strip()
    if name.startswith("PrototypeV4"):
        part = name[len("PrototypeV4"):]
        return "Part: " + {"Chat": "chat", "Pages": "pages", "Phone": "phone frame", "Web": "web frame"}.get(part, part)
    if not t:
        t = name
    t = re.sub(r"^(iPhone v4|iPad v4|Web v4) · ", "", t)
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


def same_ids_as_confluence(boards: list[dict]) -> None:
    """The Confluence pages link each board by its id; fail if the generator's rule gives any board another one."""
    sys.path.insert(0, str(SCRIPTS))
    import confluence_docs  # noqa: PLC0415

    differ = [(b["path"], b["id"], confluence_docs.board_id(b["project"], b["file"])) for b in boards
              if confluence_docs.board_id(b["project"], b["file"]) != b["id"]]
    if differ:
        raise SystemExit("build.py: scripts/confluence_docs.py gives these boards other ids: "
                         + "; ".join(f"{p} is #{a} here, #{c} there" for p, a, c in differ))


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        print("usage: python3 scripts/boards_page/build.py <design-dir> <out-dir>", file=sys.stderr)
        return 2
    design, out = Path(argv[1]).resolve(), Path(argv[2]).resolve()
    if out == SCRIPTS or SCRIPTS in out.parents:
        print(f"build.py: write the page outside scripts/, not into {out}", file=sys.stderr)
        return 2
    boards, files = collect(design)
    same_ids_as_confluence(boards)
    data = {
        "projects": [{"id": p, "name": n, "blurb": d, "groups": ORDER[p]} for p, n, d in PROJECTS],
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
