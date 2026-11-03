"""Keep every published MyPaisa artifact in step with the repo (MA-324).

Arun, 3 Nov 2026: "All artifacts and design should be in sync with local." docs/design/artifacts.json records each
artifact: its url, the repo files it is published from (published path -> repo path), the hash of those files when it
was last published, and its version. `plan_sync.py check` fails when a synced artifact's sources no longer hash as
recorded: the repo moved on and the artifact was not republished. A retired artifact, or a dated design round kept as a
record, is listed with its status and never compared.

A source may be a folder glob ("ios-v1/": "docs/design/ios-v1/*"): every file in it but dot files is published under
that prefix, so a board added, renamed or removed moves the hash too. `inputs` lists the files a generated page is built
from (a builder and its template); they are hashed with the sources.

    python3 scripts/artifacts_sync.py check                 # what is stale (exit 1 if any)
    python3 scripts/artifacts_sync.py record NAME VERSION   # after publishing NAME, record its sources' hash and version
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "docs" / "design" / "artifacts.json"
STATUSES = ("synced", "retired", "record")


def load(path: Path | None = None) -> dict:
    return json.loads((path or MANIFEST).read_text())


def expand(sources: dict[str, str], root: Path = ROOT) -> dict[str, str]:
    """Published path -> repo path, with each folder glob expanded to the files it matches today."""
    out = {}
    for pub, src in sources.items():
        if "*" not in src:
            out[pub] = src
            continue
        for f in sorted(root.glob(src)):
            if f.is_file() and not f.name.startswith("."):
                out[pub + f.name] = str(f.relative_to(root))
    return out


def sources_sha(sources: dict[str, str], root: Path = ROOT, inputs: list[str] | tuple = ()) -> str:
    """One hash over every source file, in published-path order, and every input: a changed, added, removed or renamed
    file moves it."""
    files = expand(sources, root)
    files.update({f"<input>{i}": i for i in inputs})
    h = hashlib.sha256()
    for pub in sorted(files):
        src = root / files[pub]
        h.update(pub.encode() + b"\0" + files[pub].encode() + b"\0")
        h.update(src.read_bytes() if src.is_file() else b"<missing>")
        h.update(b"\0")
    return h.hexdigest()


def errors(path: Path | None = None, root: Path = ROOT) -> list[str]:
    path = path or MANIFEST
    if not path.exists():
        return [f"artifacts: {path.relative_to(root)} is missing (MA-324)"]
    try:
        m = load(path)
    except ValueError as e:
        return [f"artifacts: {path.name} is not JSON: {e}"]
    out = []
    for a in m.get("artifacts", []):
        name, status = a.get("name", "?"), a.get("status")
        if status not in STATUSES:
            out.append(f"artifacts: {name}: status {status!r} is not one of {STATUSES}")
            continue
        if status != "synced":
            continue
        sources = a.get("sources") or {}
        if not sources:
            out.append(f"artifacts: {name}: a synced artifact names no sources")
            continue
        for pub, src in sources.items():
            if "*" in src and not any(f.is_file() for f in root.glob(src)):
                out.append(f"artifacts: {name}: source {src} (published as {pub}*) matches no file in the repo")
            elif "*" not in src and not (root / src).is_file():
                out.append(f"artifacts: {name}: source {src} (published as {pub}) is not in the repo")
        for i in a.get("inputs") or []:
            if not (root / i).is_file():
                out.append(f"artifacts: {name}: input {i} is not in the repo")
        if a.get("sources_sha256") != sources_sha(sources, root, a.get("inputs") or []):
            out.append(f"artifacts: {name} ({a.get('url')}) is older than its sources in the repo: republish it, "
                       f"then `python3 scripts/artifacts_sync.py record {name!r} <version>`")
    return out


def record(name: str, version: str) -> int:
    m = load()
    a = next((x for x in m.get("artifacts", []) if x.get("name") == name), None)
    if a is None:
        print(f"artifacts_sync: no artifact named {name!r} in {MANIFEST.name}")
        return 2
    import datetime  # noqa: PLC0415
    a["sources_sha256"] = sources_sha(a.get("sources") or {}, ROOT, a.get("inputs") or [])
    a["version"] = version
    a["published_at"] = datetime.date.today().isoformat()
    MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
    print(f"artifacts_sync: recorded {name} at {version}")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[1] == "check":
        errs = errors()
        for e in errs:
            print(e)
        print(f"artifacts_sync: {len(errs)} stale or broken")
        return 1 if errs else 0
    if len(argv) == 4 and argv[1] == "record":
        return record(argv[2], argv[3])
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
