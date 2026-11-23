#!/usr/bin/env python3
"""The whole architecture and every journey, recorded in full in Confluence (MA-257).

Arun, 27 Oct 2026: "All the architeture and journeys that we created, can we do a detailed confluence documentation
with animations and effects, make it really colourful and engaging and detailed. I need full record of everything".

The record is a tree of pages under the hub, generated like every other page (plan-sync rule 8): scripts/confluence_docs.py
lists them in pages() and renders them through render_body. Their words are the records' own: ARCHITECTURE.md section by
section, in full, every section on exactly one page (or on the page another story gives it, ELSEWHERE); and the explainer
pages in docs/design/ (Architecture v4, Inside MyPaisa, the Agent Journey and the first journeys), read
for their text and their data. Confluence runs no script, so the motion comes as GIFs and the rest as stills, captured
from those pages by scripts/confluence_capture.js from the recipes in MEDIA. Each picture's source is its page's hash and
its recipe, so an explainer page that changes asks for a new capture, as a board that changes asks for a new preview.

    python3 scripts/confluence_record.py recipes [NAME ...]   # the capture recipes, as JSON, for confluence_capture.js
    python3 scripts/confluence_record.py uploads              # each picture still to upload: its page, its id and its file
"""
from __future__ import annotations

import functools
import hashlib
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import confluence_docs as cd  # noqa: E402

ROOT = cd.ROOT
DESIGN = ROOT / "docs" / "design"
V4, INSIDE, FLOWS, FIRST = (f"docs/design/{n}.html" for n in
                            ("architecture-v4", "inside-mypaisa", "agent-journey", "journeys"))
CAPTURE = "capture-v1"  # bump to capture every picture again
ELSEWHERE = {"21": "guardrails"}  # an ARCHITECTURE section that another page carries in full (MA-245)


class RecordError(Exception):
    """A record page cannot be made from the records as they are; the check reports it."""


# ---------- the explainer pages, read as a small tree ----------

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP = {"script", "style", "svg", "button", "template", "noscript", "select", "textarea", "canvas"}
BLOCK = {"p", "div", "section", "article", "header", "footer", "figure", "figcaption", "ul", "ol", "li", "table", "pre",
         "blockquote", "aside", "main", "nav", "dl", "dt", "dd", "details", "summary", "form", "hr",
         "h1", "h2", "h3", "h4", "h5", "h6"}


class Node:
    __slots__ = ("tag", "attrs", "kids", "parent")

    def __init__(self, tag: str, attrs: dict, parent: Node | None) -> None:
        self.tag, self.attrs, self.kids, self.parent = tag, attrs, [], parent

    def cls(self) -> list[str]:
        return (self.attrs.get("class") or "").split()

    def walk(self):
        for k in self.kids:
            if isinstance(k, Node):
                yield k
                yield from k.walk()

    def find_all(self, tag: str | None = None, cls: str | None = None, id: str | None = None, **attrs) -> list[Node]:  # noqa: A002
        return [n for n in self.walk() if (tag is None or n.tag == tag) and (cls is None or cls in n.cls())
                and (id is None or n.attrs.get("id") == id) and all(n.attrs.get(k.replace("_", "-")) == v for k, v in attrs.items())]

    def find(self, *a, **kw) -> Node | None:
        got = self.find_all(*a, **kw)
        return got[0] if got else None

    def need(self, *a, **kw) -> Node:
        if (got := self.find(*a, **kw)) is None:
            raise RecordError(f"no element {a} {kw} inside <{self.tag} {self.attrs.get('id') or ' '.join(self.cls())}>")
        return got

    def children(self, tag: str | None = None, cls: str | None = None) -> list[Node]:
        return [k for k in self.kids if isinstance(k, Node) and (tag is None or k.tag == tag) and (cls is None or cls in k.cls())]

    def text(self) -> str:
        out = []
        for k in self.kids:
            if isinstance(k, str):
                out.append(k)
            elif k.tag not in SKIP:
                out.append(k.text() if k.tag not in BLOCK else f" {k.text()} ")
        return " ".join("".join(out).split())


class _Builder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):  # noqa: ANN001
        n = Node(tag, {k: v or "" for k, v in attrs}, self.cur)
        self.cur.kids.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):  # noqa: ANN001
        self.cur.kids.append(Node(tag, {k: v or "" for k, v in attrs}, self.cur))

    def handle_endtag(self, tag):  # noqa: ANN001
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):  # noqa: ANN001
        self.cur.kids.append(data)


@functools.lru_cache(maxsize=None)
def _parsed(path: Path, stamp: float) -> Node:
    b = _Builder()
    b.feed(path.read_text())
    return b.root


def dom(path: str, root: Path = ROOT) -> Node:
    p = root / path
    if not p.exists():
        raise RecordError(f"{path} is missing")
    return _parsed(p, p.stat().st_mtime)


def select(root: Node, selector: str) -> Node | None:
    """The first element a capture recipe's selector names: descendant steps of a tag, an #id, .classes and
    :nth-of-type(n), the forms the recipes use."""
    steps = []
    for part in selector.split():
        m = re.fullmatch(r"([a-z][a-z0-9]*)?(?:#([\w-]+))?((?:\.[\w-]+)*)(?::nth-of-type\((\d+)\))?", part)
        if not m:
            raise RecordError(f"cannot read the selector step {part!r} in {selector!r}")
        steps.append((m.group(1), m.group(2), [c for c in m.group(3).split(".") if c], int(m.group(4)) if m.group(4) else None))

    def fits(n: Node, step: tuple) -> bool:
        tag, id_, classes, nth = step
        if (tag and n.tag != tag) or (id_ and n.attrs.get("id") != id_) or not all(c in n.cls() for c in classes):
            return False
        return nth is None or (n.parent is not None and [k for k in n.parent.children() if k.tag == n.tag].index(n) + 1 == nth)

    found = [root]
    for step in steps:
        found = [n for f in found for n in f.walk() if fits(n, step)]
        found = list(dict.fromkeys(found))
    return found[0] if found else None


def markup(n: Node | str) -> str:
    """A subtree written out in one canonical form, so the same markup always hashes the same."""
    if isinstance(n, str):
        return n
    attrs = "".join(f" {k}={v!r}" for k, v in sorted(n.attrs.items()))
    return f"<{n.tag}{attrs}>" + "".join(markup(k) for k in n.kids) + f"</{n.tag}>"


def clean(s: str) -> str:
    return " ".join(s.split())


def inl(n: Node | str) -> str:
    """A node's content as Confluence inline HTML: text, code, strong, em and links out."""
    if isinstance(n, str):
        return cd.esc(n)
    if n.tag in SKIP:
        return ""
    if n.tag == "code":
        return f"<code>{cd.esc(n.text())}</code>"
    inner = "".join(inl(k) for k in n.kids)
    if n.tag in ("b", "strong"):
        return f"<strong>{inner}</strong>" if inner.strip() else inner
    if n.tag in ("em", "i"):
        return f"<em>{inner}</em>" if inner.strip() else inner
    if n.tag == "a":
        href = n.attrs.get("href", "")
        return f'<a href="{cd.esc(href)}">{inner}</a>' if href.startswith("http") else inner
    if n.tag == "br":
        return " "
    return f" {inner} " if n.tag in BLOCK else inner


def line(n: Node | None) -> str:
    return clean(inl(n)) if n is not None else ""


def blocks(n: Node, shift: int = 0, skip: tuple[str, ...] = (), drop: tuple = ()) -> str:
    """A node's content as Confluence blocks: headings, paragraphs, lists and tables; containers are read through.
    `skip` names classes to leave out, `drop` the nodes themselves (a heading the page has already written)."""
    out: list[str] = []
    buf: list[str] = []

    def flush() -> None:
        s = clean("".join(buf))
        buf.clear()
        if s:
            out.append(f"<p>{s}</p>")

    for k in n.kids:
        if isinstance(k, str) or k.tag not in BLOCK:
            if not (isinstance(k, Node) and k.tag in SKIP):
                buf.append(inl(k))
            continue
        flush()
        if any(c in k.cls() for c in skip) or k.attrs.get("aria-hidden") == "true" or any(k is d for d in drop):
            continue
        t = k.tag
        if re.fullmatch(r"h[1-6]", t):
            lvl = max(2, min(6, int(t[1]) + shift))
            if s := line(k):
                out.append(f"<h{lvl}>{s}</h{lvl}>")
        elif t in ("p", "figcaption", "summary", "dt", "dd"):
            if s := line(k):
                out.append(f"<p>{s}</p>")
        elif t in ("ul", "ol"):
            items = [s for li in k.children("li") if (s := line(li))]
            if items:
                out.append(f"<{t}>" + "".join(f"<li>{s}</li>" for s in items) + f"</{t}>")
        elif t == "table":
            out.append(table_of(k))
        elif t == "pre":
            out.append(f"<pre><code>{cd.esc(k.text())}</code></pre>")
        elif t != "hr":
            if any(isinstance(c, Node) and c.tag in BLOCK for c in k.kids):
                out.append(blocks(k, shift, skip, drop))
            elif s := line(k):
                out.append(f"<p>{s}</p>")
    flush()
    return "".join(out)


def table_of(t: Node) -> str:
    rows = [[(c.tag, line(c)) for c in tr.children() if c.tag in ("th", "td")] for tr in t.find_all("tr")]
    rows = [r for r in rows if r]
    if not rows:
        return ""
    head = rows[0] if all(tag == "th" for tag, _ in rows[0]) else None
    body = rows[1:] if head else rows
    out = '<table data-layout="full-width">'
    if head:
        out += "<thead><tr>" + "".join(f"<th>{s}</th>" for _, s in head) + "</tr></thead>"
    return out + "<tbody>" + "".join("<tr>" + "".join(f"<td>{s}</td>" for _, s in r) + "</tr>" for r in body) + "</tbody></table>"


# ---------- the explainer pages' data, read from their scripts ----------

class _JS:
    """A reader for the literal JavaScript the explainer pages keep their data in: objects, arrays, strings, numbers.
    A value it does not read (a call, a name) comes back as None, so the data around it still reads."""

    def __init__(self, src: str, at: int) -> None:
        self.s, self.i = src, at

    def ws(self) -> None:
        while self.i < len(self.s):
            if self.s[self.i].isspace():
                self.i += 1
            elif self.s.startswith("//", self.i):
                self.i = self.s.find("\n", self.i) if "\n" in self.s[self.i:] else len(self.s)
            elif self.s.startswith("/*", self.i):
                self.i = self.s.index("*/", self.i) + 2
            else:
                return

    def value(self):  # noqa: ANN201
        self.ws()
        c = self.s[self.i]
        if c == "{":
            return self.obj()
        if c == "[":
            return self.arr()
        if c in "\"'`":
            return self.string()
        if m := re.compile(r"-?\d+(?:\.\d+)?(?:e-?\d+)?").match(self.s, self.i):
            self.i = m.end()
            return float(m.group()) if any(x in m.group() for x in ".e") else int(m.group())
        for word, v in (("true", True), ("false", False), ("null", None)):
            if self.s.startswith(word, self.i) and not self.s[self.i + len(word)].isalnum():
                self.i += len(word)
                return v
        return self.skip()

    def skip(self) -> None:
        depth = 0
        while self.i < len(self.s):
            c = self.s[self.i]
            if c in "\"'`":
                self.string()
                continue
            if c in "([{":
                depth += 1
            elif c in ")]}":
                if depth == 0:
                    return None
                depth -= 1
            elif c == "," and depth == 0:
                return None
            self.i += 1
        return None

    def string(self) -> str:
        q, self.i, out = self.s[self.i], self.i + 1, []
        esc = {"n": "\n", "t": "\t", "r": "", "\\": "\\", "'": "'", '"': '"', "`": "`", "/": "/"}
        while self.s[self.i] != q:
            c = self.s[self.i]
            if c == "\\":
                n = self.s[self.i + 1]
                if n == "u":
                    out.append(chr(int(self.s[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                out.append(esc.get(n, n))
                self.i += 2
                continue
            out.append(c)
            self.i += 1
        self.i += 1
        return "".join(out)

    def obj(self) -> dict:
        self.i += 1
        out = {}
        while True:
            self.ws()
            if self.s[self.i] == "}":
                self.i += 1
                return out
            if self.s[self.i] in "\"'":
                k = self.string()
            else:
                m = re.compile(r"[A-Za-z_$][\w$]*").match(self.s, self.i)
                if not m:
                    raise RecordError(f"cannot read a key at {self.s[self.i:self.i + 40]!r}")
                k, self.i = m.group(), m.end()
            self.ws()
            if self.s[self.i] != ":":
                raise RecordError(f"no ':' after key {k!r}")
            self.i += 1
            out[k] = self.value()
            self.ws()
            if self.s[self.i] == ",":
                self.i += 1

    def arr(self) -> list:
        self.i += 1
        out = []
        while True:
            self.ws()
            if self.s[self.i] == "]":
                self.i += 1
                return out
            out.append(self.value())
            self.ws()
            if self.s[self.i] == ",":
                self.i += 1


@functools.lru_cache(maxsize=None)
def _js(path: str, name: str, stamp: float):  # noqa: ANN202
    src = (ROOT / path).read_text()
    m = re.search(rf"(?:var|const|let)\s+{re.escape(name)}\s*=\s*", src)
    if not m:
        raise RecordError(f"{path} no longer defines {name}")
    try:
        return _JS(src, m.end()).value()
    except (IndexError, ValueError) as e:
        raise RecordError(f"{path}: cannot read {name}: {e}") from e


def js(path: str, name: str):  # noqa: ANN201
    return _js(path, name, (ROOT / path).stat().st_mtime)


# ---------- ARCHITECTURE.md, cut into its sections ----------

@functools.lru_cache(maxsize=None)
def _arch(stamp: float) -> tuple[list[str], list[dict]]:
    lines = (ROOT / "ARCHITECTURE.md").read_text().splitlines()
    heads, fence = [], False
    for i, ln in enumerate(lines):
        if ln.startswith("```"):
            fence = not fence
        if not fence and (m := re.match(r"^(#{2,4}) (\d+(?:\.\d+)*)\.? (.*)$", ln)):
            heads.append({"num": m.group(2), "level": len(m.group(1)), "title": m.group(3).strip(), "line": i})
    for k, h in enumerate(heads):
        nxt = heads[k + 1]["line"] if k + 1 < len(heads) else len(lines)
        h["own_end"] = nxt  # its own text runs to the next heading of any level
        later = [x["line"] for x in heads[k + 1:] if x["level"] <= h["level"]]
        h["end"] = later[0] if later else len(lines)
    return lines, heads


def arch() -> tuple[list[str], list[dict]]:
    return _arch((ROOT / "ARCHITECTURE.md").stat().st_mtime)


def arch_head(num: str) -> dict:
    h = next((h for h in arch()[1] if h["num"] == num), None)
    if h is None:
        raise RecordError(f"ARCHITECTURE.md has no section {num}")
    return h


def arch_span(spec: str) -> tuple[int, int]:
    """The lines a spec names: "8" is §8 with its subsections, "4/" is §4's own text before its first subsection."""
    h = arch_head(spec.rstrip("/"))
    return (h["line"], h["own_end"] if spec.endswith("/") else h["end"])


def arch_md(specs: list[str]) -> str:
    lines = arch()[0]
    return "\n\n".join("\n".join(lines[a:b]).strip().rstrip("-").strip() for a, b in map(arch_span, specs))


def preamble_md() -> str:
    lines, heads = arch()
    return "\n".join(lines[1:heads[0]["line"]]).strip().rstrip("-").strip()


def spec_nums(specs: list[str]) -> set[str]:
    """Every section number a page holds: its specs and, for a whole section, every subsection under it."""
    heads = arch()[1]
    out = set()
    for s in specs:
        a, b = arch_span(s)
        out |= {h["num"] for h in heads if a <= h["line"] < b}
    return out


# ---------- the pages ----------

# The architecture, one page per area: (slug, emoji, panel icon, colour, title, intro, sections, pictures, explainers)
ARCH = [
    ("rec-a-rules", "🧭", ":compass:", "#DEEBFF", "The rules, what MyPaisa does, and the system around it",
     "The four rules every flow keeps, what the household sees, and the system context: the two doors, the AWS account, the Anthropic API and the free data sources.",
     ["1", "2", "3"], ["v4-question", "inside-cast"], ["Inside MyPaisa", "MyPaisa Architecture v4"]),
    ("rec-a-registry", "🗂️", ":card_index_dividers:", "#E3FCEF", "The holdings registry and the data model",
     "One DynamoDB table of entities, kinds as data, records as documents and their history as events, the audit log, and money in any currency checked against the holding.",
     ["4/", "4.1", "4.2", "4.3", "4.4", "4.6", "4.7", "4.8"], ["v4-state"], ["MyPaisa Architecture v4"]),
    ("rec-a-identity", "🔐", ":closed_lock_with_key:", "#FFEBE6", "Identity, members and views",
     "Signing in with Apple, Google or a passkey, the household and its members, invites, the second check, sessions and what each member may see.",
     ["4.5"], ["inside-step-1", "inside-step-3"], ["Inside MyPaisa", "MyPaisa Agent Journey"]),
    ("rec-a-writing", "✍️", ":pencil:", "#FFFAE6", "Commitments, check-ins and writing",
     "The promises the household keeps (EMIs, SIPs, bills, maturities), the check-ins code decides on, and the one way anything is written, by admins only: add and delete in the chat, correct in the chat or in place.",
     ["4.9", "4.10"], ["v4-checkin", "v4-file"], ["MyPaisa Architecture v4", "MyPaisa Agent Journey"]),
    ("rec-a-engine", "📡", ":bar_chart:", "#EAE6FF", "Prices and FX, to value what the household holds",
     "One plugin per price feed, a chain per kind, look-through, FX and calendars: prices exist only to value the holdings, and nothing predicts a market (MA-307).",
     ["5"], [], []),
    ("rec-a-wealth", "🧮", ":abacus:", "#E3FCEF", "The wealth maths",
     "Net worth, XIRR and CAGR, the budget, the month close and the Projection: the maths of phases 2 to 7, ported from the wealth tracker and computed by code.",
     ["6"], ["inside-step-6", "inside-step-9"], ["Inside MyPaisa"]),
    ("rec-a-agent", "🤖", ":robot:", "#FFEBE6", "The agent: one tool loop, its tools and its models",
     "The concierge's Claude tool loop: the cached prefix, the strict tools, the guided flows, which model answers what, and how a run is bounded.",
     ["7"], ["v4-loop", "v4-models"], ["MyPaisa Architecture v4", "MyPaisa Agent Journey"]),
    ("rec-a-apps", "📱", ":iphone:", "#DEEBFF", "The two doors: the iOS app and the web app",
     "The shell, the chat and the size classes, the cards, the dashboard inside the app, the web app in a browser, and the iOS app's build: a React Native shell with a native SwiftUI core.",
     ["8"], ["inside-step-4", "inside-step-5"], ["Inside MyPaisa", "MyPaisa Agent Journey"]),
    ("rec-a-observability", "🔭", ":telescope:", "#E6FCFF", "Observability: one trace from the door to the model",
     "The RunRecord, one OpenTelemetry trace end to end, the model and tool spans, the metrics, the alarms and who hears them, and the agent team's view.",
     ["9"], ["v4-trace"], ["MyPaisa Architecture v4"]),
    ("rec-a-notify", "🔔", ":bell:", "#FFFAE6", "Notifications, the road from the wealth tracker, and the stack",
     "Alerts and check-ins by push; the road from the old wealth tracker to MyPaisa with any question answered from a read-only SQL copy; and the tech stack.",
     ["10", "11", "12"], ["inside-step-7"], ["Inside MyPaisa"]),
    ("rec-a-security", "🛡️", ":shield:", "#FFEBE6", "Security and privacy",
     "What is enforced in code, what never leaves the account, privacy mode, secrets, and what a member's data is used for.",
     ["13"], ["v4-rules", "inside-safety"], ["MyPaisa Architecture v4", "Inside MyPaisa"]),
    ("rec-a-cost", "💷", ":pound:", "#E3FCEF", "Cost, the Claude budget, caps and alerts",
     "The monthly cost at $1.30 to £1, the Claude budget and its ceiling with the spend ladder, and the caps and alerts the admin sets in the Admin center.",
     ["14"], ["v4-models"], ["MyPaisa Architecture v4"]),
    ("rec-a-decisions", "📜", ":scroll:", "#F4F5F7", "The decisions and the open questions",
     "Every architecture decision with its reason, and the questions still open.",
     ["15", "16"], [], []),
    ("rec-a-delivery", "🚀", ":rocket:", "#EAE6FF", "Environments, domains and delivery",
     "Dev and prod in one account, the domains, identity per environment, Terraform only with prod through CI, and hydrating prod with the Excel importer.",
     ["17"], ["v4-delivery", "inside-homes"], ["MyPaisa Architecture v4", "Inside MyPaisa"]),
    ("rec-a-team", "👥", ":busts_in_silhouette:", "#FFFAE6", "The agent team",
     "Agents that never call each other: one store for every setting, the admin desk, self-healing, where the data lives and the team's budgets.",
     ["18"], ["v4-team", "inside-agents"], ["MyPaisa Architecture v4", "Inside MyPaisa"]),
    ("rec-a-queues", "📬", ":incoming_envelope:", "#DEEBFF", "Queues and live delivery",
     "Nothing lost, everything retried: the three queues, the rules every consumer keeps, dead-letter queues and replay, and live delivery over SSE.",
     ["19"], ["v4-failure", "inside-tour-fail"], ["MyPaisa Architecture v4", "Inside MyPaisa"]),
    ("rec-a-india", "🇮🇳", ":flag_in:", "#FFFAE6", "Indian holdings",
     "Indian shares, ETFs and mutual funds beside the UK ones: free sources first to value them, the existing portfolio imported once, and accounts in INR and GBP.",
     ["20"], [], ["MyPaisa Agent Journey"]),
    ("rec-a-memory", "🧠", ":brain:", "#E6FCFF", "Caching and memory for every agent",
     "Every agent gets both from the one runner: each call cached in one frozen order with a lifetime per route and checks that catch a broken cache, and Claude's memory tool on MyPaisa's own store, a member's notes theirs alone, never a figure, a record, a setting or a secret.",
     ["22"], [], []),
]
FLOW_GROUPS = [  # (slug, emoji, colour, title, flow ids), in the Agent Journey's own order
    ("rec-j-flows-join", "🔑", "#FFEBE6", "Joining and signing in", ["invite", "signin"]),
    ("rec-j-flows-add", "➕", "#E3FCEF", "Adding a holding and logging money", ["holding", "money"]),
    ("rec-j-flows-day", "🌅", "#FFFAE6", "The day's prices: every holding valued", ["prices"]),
    ("rec-j-flows-see", "💬", "#DEEBFF", "Asking, and seeing it at every door", ["ask", "dashboard", "ipad", "web"]),
    ("rec-j-flows-run", "🛠️", "#EAE6FF", "Running it: the Admin center, failures, the ladder and the month", ["admin", "failure", "ladder", "monthly"]),
    ("rec-j-flows-india", "🇮🇳", "#FFFAE6", "India in the picture", ["currency", "india-import", "inr", "india-day"]),
    ("rec-j-flows-wealth", "🏡", "#E3FCEF", "The household's whole wealth, by talking", ["register", "correct", "checkin", "statement", "month-close", "projection"]),
]
JOURNEY_PAGES = [  # (slug, emoji, panel icon, colour, title, parent)
    ("rec-j-v4", "🛰️", ":satellite_orbital:", "#DEEBFF", "Nine journeys through AWS, hop by hop", "rec-journeys"),
    ("rec-j-v4-parts", "🧩", ":jigsaw:", "#EAE6FF", "Architecture v4: every part, the trace, the loop, the agents and the models", "rec-journeys"),
    ("rec-j-inside", "🏠", ":house:", "#FFFAE6", "Inside MyPaisa: the admin's journey in nine steps", "rec-journeys"),
    ("rec-j-inside-more", "✉️", ":envelope_with_arrow:", "#E3FCEF", "Inside MyPaisa: one message, the agent team, the safety nets and a day", "rec-journeys"),
    ("rec-j-flows", "🧭", ":compass:", "#FFEBE6", "The Agent Journey: twenty-three flows end to end", "rec-journeys"),
    ("rec-j-first", "📟", ":pager:", "#F4F5F7", "The first journeys, on the Telegram bot (kept for reference)", "rec-journeys"),
]
MODEL_COLOUR = {"opus": "purple", "sonnet": "red", "haiku": "green", "haiku-batch": "green", "code": "neutral"}
MODEL_NAME = {"opus": "Opus 5.5", "sonnet": "Sonnet 5.5", "haiku": "Haiku 5.5", "haiku-batch": "Haiku 5.5 · Batches", "code": "Code"}
CAT_COLOUR = {"compute": ("#FFF0E6", "Compute"), "int": ("#FFE6F2", "App integration"), "mgmt": ("#FFE6F2", "Management"),
              "db": ("#F7E6FA", "Database"), "storage": ("#EDF5E1", "Storage"), "net": ("#EFE8FF", "Networking, delivery"),
              "sec": ("#FDE7EA", "Identity"), "door": ("#E6EEFF", "A door"), "ext": ("#F4F5F7", "Outside AWS")}
LANE_COLOUR = {"Member": "#FFEBE6", "App": "#DEEBFF", "AWS": "#FFFAE6", "Claude": "#EAE6FF", "External": "#F4F5F7", "Note": "#E3FCEF"}


def pages() -> list[tuple[str, str, str]]:
    """The record's pages, parents first: (slug, title, parent slug)."""
    out = [("rec", "📘 The record: the whole architecture and every journey", "hub"),
           ("rec-arch", "🏛️ The architecture, area by area", "rec")]
    out += [(slug, f"{e} {spec_label(secs)} · {title}", "rec-arch") for slug, e, _, _, title, _, secs, _, _ in ARCH]
    out.append(("rec-journeys", "🧭 The journeys, end to end", "rec"))
    for slug, e, _, _, title, parent in JOURNEY_PAGES:
        out.append((slug, f"{e} {title}", parent))
        if slug == "rec-j-flows":
            out += [(g[0], f"{g[1]} Flows · {g[3]}", "rec-j-flows") for g in FLOW_GROUPS]
    out.append(("rec-drawings", "🏗️ The Lucid drawings, and how they are made", "rec"))
    return out


def spec_label(specs: list[str]) -> str:
    nums = [s.rstrip("/") for s in specs]
    tops = []
    for n in nums:
        t = n if "." in n and n.split(".")[0] not in [x for x in nums if "." not in x] else n.split(".")[0]
        if t not in tops:
            tops.append(t)
    if len(tops) == 1:
        return f"§{tops[0]}"
    return f"§{tops[0]} to §{tops[-1]}"


def is_record(slug: str) -> bool:
    return slug == "rec" or slug.startswith(("rec-",))


# ---------- the pictures ----------

V4_JOURNEYS = ("question", "goal", "plan", "file", "delete", "checkin", "value", "digest", "failure")  # the SCEN ids of architecture-v4.html, in its order


def _v4_journey(sid: str) -> dict:
    return {"src": V4, "kind": "gif", "target": "#map .stage", "actions": [{"click": f'#tabs .tab[data-id="{sid}"]'}],
            "until": "document.querySelector('#play span').textContent === 'Replay'", "max": 70000, "hold": 2500, "width": 960}


def _inside_step(n: int) -> dict:
    sel = f"#journey article.step:nth-of-type({n}) .stage"
    return {"src": INSIDE, "kind": "gif", "target": sel, "actions": [{"press": sel + " [data-replay]"}], "hide": [".topbar", "[data-replay]"],
            "until": "animations", "min": 2500, "max": 20000, "hold": 2000, "fps": 10}


def _inside_tour(k: str) -> dict:
    return {"src": INSIDE, "kind": "gif", "target": "#inside .wrap", "actions": [{"click": f'.tour[data-tour="{k}"]'}],
            "until": "document.getElementById('play').textContent === 'Play again'", "max": 70000, "hold": 2500, "width": 900, "fps": 6}


MEDIA: dict[str, dict] = {
    "mark": {"src": "docs/mark-animated.svg", "kind": "gif", "target": "svg", "viewport": [360, 360], "until": "animations",
             "min": 600, "max": 4000, "hold": 2500, "width": 200, "fps": 20, "show": 18, "hide": []},
    **{f"v4-{k}": _v4_journey(k) for k in V4_JOURNEYS},
    "v4-hero": {"src": V4, "kind": "png", "target": "section.hero"},
    "v4-trace": {"src": V4, "kind": "gif", "target": "#tracebox", "until": "animations", "min": 2000, "max": 12000, "hold": 2500, "width": 960,
                 "actions": [{"js": "(() => { const t = document.getElementById('tracebox'); t.classList.remove('play'); void t.offsetWidth; t.classList.add('play'); })()"}]},
    "v4-loop": {"src": V4, "kind": "gif", "target": "#loop .card.loop", "record": 7000, "width": 960, "fps": 10},
    "v4-team": {"src": V4, "kind": "gif", "target": "#bus", "record": 9000, "width": 960, "fps": 10},
    "v4-models": {"src": V4, "kind": "png", "target": "#models"},
    "v4-state": {"src": V4, "kind": "png", "target": "#state"},
    "v4-delivery": {"src": V4, "kind": "png", "target": "#delivery"},
    "v4-rules": {"src": V4, "kind": "png", "target": "#rules"},
    "inside-hero": {"src": INSIDE, "kind": "png", "target": "section.hero"},
    "inside-cast": {"src": INSIDE, "kind": "png", "target": "#cast"},
    **{f"inside-step-{n}": _inside_step(n) for n in range(1, 10)},
    **{f"inside-tour-{k}": _inside_tour(k) for k in ("ask", "file", "checkin", "fail")},
    "inside-agents": {"src": INSIDE, "kind": "gif", "target": "#agents .stage", "actions": [{"press": "#agents .stage [data-replay]"}], "hide": [".topbar", "[data-replay]"],
                      "until": "animations", "min": 2500, "max": 20000, "hold": 2000, "fps": 10},
    "inside-safety": {"src": INSIDE, "kind": "png", "target": "#safety"},
    "inside-homes": {"src": INSIDE, "kind": "png", "target": "#homes"},
    "inside-day": {"src": INSIDE, "kind": "png", "target": "#day"},
    **{f"flow-{f}": {"src": FLOWS, "kind": "png", "target": f"#{f} .mocks"} for g in FLOW_GROUPS for f in g[4]},
    "first-phone": {"src": FIRST, "kind": "gif", "target": ".stage", "record": 26000, "width": 900, "fps": 6, "hold": 1500},
}
for _name, _m in MEDIA.items():
    _m.setdefault("viewport", [1280, 900])
    _m.setdefault("hide", [".topbar"])


def media_ext(name: str) -> str:
    return "gif" if MEDIA[name]["kind"] == "gif" else "png"


def media_file(name: str) -> str:
    return f"{name}.{media_ext(name)}"


def drawn_from(m: dict, root: Path = ROOT) -> str:
    """What a picture is drawn from: the markup of its target, and the page's styles and scripts. A change anywhere
    else on the page leaves the picture as it was; a target that is gone fails the check."""
    src = root / m["src"]
    if not src.exists():
        return "missing"
    if src.suffix == ".svg":
        return hashlib.sha256(src.read_bytes()).hexdigest()
    page = dom(m["src"], root)
    target = select(page, m["target"])
    if target is None:
        raise RecordError(f"{m['src']} has no {m['target']}, which a picture of the record is captured from")
    drawn = [markup(target)] + [markup(n) for n in page.walk() if n.tag in ("style", "script")]
    return cd.sha("\x00".join(drawn))


def media_source(name: str, root: Path = ROOT) -> str:
    return cd.sha(json.dumps([CAPTURE, MEDIA[name], drawn_from(MEDIA[name], root)], sort_keys=True, ensure_ascii=False))


def lucid_refs(text: str) -> list[str]:
    return re.findall(r"!\[[^\]]*\]\(docs/design/lucid/([\w.-]+\.png)\)", text)


def page_media(slug: str) -> list[str]:
    """The captured pictures a page shows, in order."""
    for s, *_, media, _ in ARCH:
        if s == slug:
            return list(media)
    if slug == "rec":
        return ["mark", "v4-question"]
    if slug == "rec-arch":
        return ["v4-hero"]
    if slug == "rec-journeys":
        return ["inside-tour-ask"]
    if slug == "rec-j-v4":
        return [f"v4-{k}" for k in V4_JOURNEYS]
    if slug == "rec-j-v4-parts":
        return ["v4-trace", "v4-loop", "v4-team", "v4-models", "v4-state", "v4-delivery", "v4-rules"]
    if slug == "rec-j-inside":
        return ["inside-hero", "inside-cast"] + [f"inside-step-{n}" for n in range(1, 10)]
    if slug == "rec-j-inside-more":
        return [f"inside-tour-{k}" for k in ("ask", "file", "checkin", "fail")] + ["inside-agents", "inside-safety", "inside-homes", "inside-day"]
    if slug == "rec-j-first":
        return ["first-phone"]
    if g := next((g for g in FLOW_GROUPS if g[0] == slug), None):
        return [f"flow-{f}" for f in g[4]]
    return []


def page_lucid(slug: str) -> list[str]:
    for s, *_, secs, _, _ in ARCH:
        if s == slug:
            return lucid_refs(arch_md(secs))
    if slug == "rec-arch":
        return lucid_refs(preamble_md()) + ["01-overview.png"]
    if slug == "rec-drawings":
        return [png for png, *_ in cd.LUCID]
    return []


def img_name(slug: str, what: str) -> str:
    return f"{slug}--{what}"


def wanted_images(ctx: cd.Ctx) -> dict[str, dict]:
    out: dict[str, dict] = {}
    sources = {}
    for m in MEDIA:
        try:
            sources[m] = media_source(m)
        except RecordError as e:  # errors() reports it; the picture stays stale until its page is fixed
            sources[m] = f"unreadable: {e}"
    for slug, _, _ in pages():
        for m in page_media(slug):
            out[img_name(slug, media_file(m))] = {"page": slug, "capture": m, "source": sources[m]}
        for png in dict.fromkeys(page_lucid(slug)):
            f = DESIGN / "lucid" / png
            src = hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else "missing"
            out[img_name(slug, f"lucid-{png}")] = {"page": slug, "file": f, "source": cd.sha(json.dumps([src]))}
    return out


def gallery(ctx: cd.Ctx, slug: str, media: list[str]) -> str:
    """Pictures in order: a wide one across the page, phone-sized ones two to a row."""
    out, phones = [], []
    for m in media + [""]:
        if m and (m.startswith("inside-step-") or m == "inside-agents"):
            phones.append(pic(ctx, slug, m, media_caption(m)))
            continue
        if phones:
            out.append(cols(phones, 2))
            phones = []
        if m:
            out.append(pic(ctx, slug, m, media_caption(m)))
    return "".join(out)


def pic(ctx: cd.Ctx, slug: str, media: str, caption: str, width: int | None = None) -> str:
    return cd.image(ctx, img_name(slug, media_file(media)), caption, width or MEDIA[media].get("show", 100))


def lucid_pic(ctx: cd.Ctx, slug: str, png: str, caption: str) -> str:
    return cd.image(ctx, img_name(slug, f"lucid-{png}"), caption, 100)


# ---------- page parts ----------

def toc(level: int = 3) -> str:
    params = {"macroParams": {"maxLevel": {"value": str(level)}, "minLevel": {"value": "2"}},
              "macroMetadata": {"schemaVersion": {"value": "1"}, "title": "Table of Contents"}}
    return (f'<div data-type="extension" data-extension-key="toc" data-extension-type="com.atlassian.confluence.macro.core" '
            f"data-parameters='{cd.esc(json.dumps(params))}'></div>")


def footer() -> str:
    return ('<hr><p style="font-size: 14px"><em>Generated by scripts/confluence_record.py (MA-257) from ARCHITECTURE.md and the explainer '
            "pages in docs/design/, with the pictures captured from those pages. Change those, not this page: /plan-sync copies an edit "
            "made here back to the repo, or the next publish overwrites it.</em></p>")


def cols(cells: list[str], n: int = 2) -> str:
    """A row of columns, n to a row; an odd cell out is padded with an empty column."""
    kind = {2: "layout-two-equal", 3: "layout-three-equal"}[n]
    out = []
    for k in range(0, len(cells), n):
        row = cells[k:k + n] + ["<p></p>"] * (n - len(cells[k:k + n]))
        out.append(f'<section data-type="{kind}">' + "".join(f'<div data-type="column">{c}</div>' for c in row) + "</section>")
    return "".join(out)


def card(url: str, appearance: str = "block") -> str:
    return f'<p><a href="{url}" data-card-appearance="{appearance}"></a></p>'


def model_chip(k: str) -> str:
    return cd.lozenge(MODEL_NAME.get(k, k), MODEL_COLOUR.get(k, "neutral"))


def code_lines(s: str) -> str:
    return "<br>".join(f"<code>{cd.esc(x)}</code>" for x in s.split("\n") if x.strip())


def link_md(md_text: str, ctx: cd.Ctx, slug: str) -> str:
    """ARCHITECTURE's markdown as Confluence HTML, each Lucid drawing shown where the text puts it."""
    keep: list[tuple[str, str]] = []

    def stash(m: re.Match) -> str:
        keep.append((m.group(2), m.group(1)))
        return f"\x01{len(keep) - 1}\x01"

    def dedent(m: re.Match) -> str:  # a fence indented inside a list, which the shared reader takes for prose
        pad = len(m.group(1))
        return "\n".join(x[pad:] if x[:pad].isspace() else x for x in m.group(0).split("\n"))

    text = re.sub(r"(?ms)^( +)```[^\n]*\n.*?^\1```[ \t]*$", dedent, md_text)
    text = re.sub(r"(?m)^!\[([^\]]*)\]\(docs/design/lucid/([\w.-]+\.png)\)[ \t]*$", stash, text)
    out = cd.md(text, shift=0)
    out = re.sub(r"<p>\x01(\d+)\x01</p>", lambda m: lucid_pic(ctx, slug, keep[int(m.group(1))][0], keep[int(m.group(1))][1]), out)
    if "\x01" in out:
        raise RecordError(f"a Lucid drawing on {slug} is not on a line of its own")
    return out


def items_for(ctx: cd.Ctx, specs: list[str]) -> list[dict]:
    nums = spec_nums(specs)
    whole = {s for s in specs if not s.endswith("/")}
    exact = {s.rstrip("/") for s in specs if s.endswith("/")}

    def hit(a: str) -> bool:
        return a in nums or a in exact or any(a.startswith(w + ".") for w in whole)
    its = [i for i in ctx.items if any(hit(a) for a in i.get("arch") or [])]
    return sorted(its, key=lambda i: (i.get("phase", 0), cd.key_n(i["key"])))


def guardrails_note(ctx: cd.Ctx) -> str:
    """A pointer to the guardrails and evals page (MA-245, MA-258), once the space has it; the record never redraws them."""
    if not ctx.manifest.get("pages", {}).get("guardrails", {}).get("id"):
        return ""
    return cd.cpanel("#E3FCEF", ":shield:", f"<p><strong>🛡️ The guardrails and evals</strong> have a page of their own, with their own "
                     f"explainer and diagrams: {ctx.link('guardrails', 'Guardrails and evals')} (ARCHITECTURE §{cd.GUARDRAILS[0]}).</p>")


def explainer_cards(names: list[str]) -> str:
    return cols([f"<h4>{cd.esc(n)}</h4>" + card(cd.ARTIFACTS[n]) for n in names], 2) if names else ""


# ---------- the architecture pages ----------

def render_arch_page(ctx: cd.Ctx, entry: tuple) -> str:
    slug, emo, icon, colour, title, intro, secs, media, explainers = entry
    nums = sorted(spec_nums(secs), key=lambda s: [int(x) for x in s.split(".")])
    items = items_for(ctx, secs)
    phases = sorted({i.get("phase") for i in items if i.get("phase") is not None})
    chips = " ".join(cd.lozenge(f"§{n}", "blue" if "." not in n else "neutral") for n in nums)
    out = [cd.cpanel(colour, icon, f"<p><strong>{emo} {cd.esc(spec_label(secs))} · {cd.esc(title)}</strong></p><p>{cd.esc(intro)}</p><p>{chips}</p>"),
           cols([cd.cpanel("#EAE6FF", ":straight_ruler:", f"<p><strong>{len(nums)} section{'s' if len(nums) != 1 else ''}</strong></p><p>ARCHITECTURE.md as written, in full, below.</p>"),
                 cd.cpanel("#E3FCEF", ":jigsaw:", f"<p><strong>{len(items)} stor{'ies' if len(items) != 1 else 'y'}</strong></p><p>"
                           + (f"Cite these sections, in phases {', '.join(str(p) for p in phases)}." if phases else "No story cites these sections yet.") + "</p>"),
                 cd.cpanel("#FFFAE6", ":frame_photo:", f"<p><strong>{len(media) + len(page_lucid(slug))} pictures</strong></p><p>{pictures_line(slug, media)}</p>")], 3)]
    if media:
        out.append("<h2>🎬 See it move</h2>" if any(MEDIA[m]["kind"] == "gif" for m in media) else "<h2>🖼️ See it</h2>")
        out.append(gallery(ctx, slug, media))
    if slug in ("rec-a-security", "rec-a-agent", "rec-a-team"):
        out.append(guardrails_note(ctx))
    out += ["<p><strong>📖 Contents</strong></p>", toc(3), link_md(arch_md(secs), ctx, slug)]
    out.append("<h2>🧩 The stories that build it</h2>")
    if items:
        out.append(f"<p>Every story whose trace row cites {cd.esc(spec_label(secs))}, with its estimate, status and design. "
                   + cd.jql_link("project = MA AND key in (" + ", ".join(i["key"] for i in items) + ") ORDER BY key", "Open them in Jira") + ".</p>")
        out.append(cd.story_rows(ctx, items))
    else:
        out.append("<p>No story's trace row cites these sections.</p>")
    if explainers:
        out += ["<h2>🔗 The explainer pages</h2>", explainer_cards(explainers)]
    out.append(f'<p>The source: <a href="{cd.gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>, '
               + ", ".join(cd.arch_link(n, ctx.sections) for n in [s.rstrip("/") for s in secs]) + ".</p>")
    return "".join(out) + footer()


def pictures_line(slug: str, media: list[str]) -> str:
    gifs = sum(1 for m in media if MEDIA[m]["kind"] == "gif")
    parts = [f"{gifs} animated" if gifs else "", f"{len(media) - gifs} still" if len(media) > gifs else ""]
    caught = " and ".join(p for p in parts if p)
    lucid = len(page_lucid(slug))
    out = [f"{caught}, captured from the explainer pages" if caught else "",
           f"{lucid} Lucid drawing{'s' if lucid != 1 else ''} where the text puts {'them' if lucid != 1 else 'it'}" if lucid else ""]
    return cd.esc("; ".join(o for o in out if o) + ".") if any(out) else "The text alone."


MEDIA_CAPTION = {
    "mark": "The mark arriving: the coin, the orbit and the coral dot that comes to rest at half past one",
    "v4-question": "A question, typed on the iPhone and answered at both doors, hop by hop (Architecture v4)",
    "v4-goal": "A goal: code solves what £40,000 by Sep 2028 takes, and one Confirm saves it (Architecture v4)",
    "v4-plan": "Plan with me: an admin's /plan runs on Opus in its own loop and ends in one plan card (Architecture v4)",
    "v4-file": "A factsheet sent from the iPhone becomes a holding, with one Confirm (Architecture v4)",
    "v4-checkin": "Code decides an EMI is due; an admin taps Paid on the push (Architecture v4)",
    "v4-value": "The nightly run: prices in only to value the holdings, XIRR and CAGR, the Projection again, and the insight job (Architecture v4)",
    "v4-digest": "The Monday digest: facts from code, worded by Haiku and Sonnet, silent, to the admins only (Architecture v4)",
    "v4-delete": "A delete in the chat: a card, Confirm, the second check and an audit row, the files kept (Architecture v4)",
    "v4-failure": "A statement job meets an overloaded API: retried, kept, alarmed, replayed once (Architecture v4)",
    "v4-hero": "Architecture v4: from a tap at either door to Claude and back, on AWS",
    "v4-trace": "One message is one trace, from the finger to the last word (Architecture v4)",
    "v4-loop": "One Claude tool loop, with code doing every sum (Architecture v4)",
    "v4-team": "Six agents that never call each other, around one event bus (Architecture v4)",
    "v4-models": "Three Claude models, each where it earns its cost, and the spend ladder (Architecture v4)",
    "v4-state": "One table for state, one lake for the record, one store for secrets (Architecture v4)",
    "v4-delivery": "Terraform only, one image, prod after a person says yes (Architecture v4)",
    "v4-rules": "Enforced in code, not in the prompt (Architecture v4)",
    "inside-hero": "Inside MyPaisa: from the first tap to a team of agents",
    "inside-cast": "MyPaisa as a small, well-run office (Inside MyPaisa)",
    "inside-agents": "An agent asks; the admin approves with Face ID (Inside MyPaisa)",
    "inside-safety": "What stops it going wrong (Inside MyPaisa)",
    "inside-homes": "Two copies on AWS, and one careful way to change them (Inside MyPaisa)",
    "inside-day": "A day with MyPaisa: mostly quiet, on time, and there when you ask (Inside MyPaisa)",
    "first-phone": "The first journeys, played on the Telegram bot's phone frame (kept for reference)",
}


def media_caption(m: str) -> str:
    if m in MEDIA_CAPTION:
        return MEDIA_CAPTION[m]
    if m.startswith("inside-step-"):
        n = int(m.rsplit("-", 1)[1])
        return f"Step {n}: {inside_steps()[n - 1]['title']} (Inside MyPaisa)"
    if m.startswith("inside-tour-"):
        return f"One message through MyPaisa: {TOURS[m.rsplit('-', 1)[1]]} (Inside MyPaisa)"
    if m.startswith("flow-"):
        return f"What the member sees: {flow(m[5:])['title']} (Agent Journey)"
    return m


# ---------- the root, the architecture index and the drawings ----------

def render_rec(ctx: cd.Ctx) -> str:
    _, heads = arch()
    tops = [h for h in heads if h["level"] == 2]
    flows = [f for g in FLOW_GROUPS for f in g[4]]
    gifs = sum(1 for m in MEDIA.values() if m["kind"] == "gif")
    out = [
        cd.cpanel("#DEEBFF", ":blue_book:", "<p><strong>📘 The whole architecture, and every journey, in one place</strong></p>"
                  "<p>Everything MyPaisa is designed to be, recorded in full: ARCHITECTURE.md section by section, the nine journeys that play "
                  "through AWS hop by hop, the admin's nine steps in plain words, the agent flows, the first "
                  "journeys, and the Lucid drawings. Nothing is built yet; this is the design every phase is built to.</p>"
                  "<p>Arun, 27 Oct 2026 (MA-257): <em>\"I need full record of everything.\"</em></p>"),
        pic(ctx, "rec", "mark", media_caption("mark")), pic(ctx, "rec", "v4-question", media_caption("v4-question")),
        cols([cd.cpanel("#EAE6FF", ":classical_building:", f"<h3>{ctx.link('rec-arch', '🏛️ The architecture')}</h3>"
                        f"<p>{len(tops)} sections of ARCHITECTURE.md on {len(ARCH)} pages, every word, with the Lucid drawings where the text puts them "
                        "and the stories that build each part.</p>"),
              cd.cpanel("#E3FCEF", ":compass:", f"<h3>{ctx.link('rec-journeys', '🧭 The journeys')}</h3>"
                        f"<p>Nine journeys through AWS, nine steps of the admin's journey, four tours of one message, {len(flows)} agent flows "
                        "and the first journeys.</p>"),
              cd.cpanel("#FFFAE6", ":building_construction:", f"<h3>{ctx.link('rec-drawings', '🏗️ The drawings')}</h3>"
                        f"<p>The {len(cd.LUCID)} Lucid drawings on AWS shapes, what each explains, and how they are generated.</p>")], 3),
        "<h2>🎨 How to read it</h2><ul>"
        f"<li>🎬 <strong>The {gifs} animations</strong> are captured from the explainer pages and play here as they do there; the live pages "
        "are a click away, and play every journey on demand.</li>"
        "<li>🟦 <strong>The colours</strong> follow the parts: blue for the doors and the plumbing, green for the money, purple for the models, amber for the agents, red for safety.</li>"
        "<li>🧩 <strong>Every area</strong> ends with the Jira stories that build it, live from the trace.</li>"
        + (f"<li>🛡️ <strong>The guardrails and evals</strong> (§21) are on {ctx.link('guardrails', 'their own page')}, with their own explainer.</li>"
           if ctx.manifest.get("pages", {}).get("guardrails", {}).get("id") else "") +
        "<li>🔁 <strong>It stays in step.</strong> These pages are generated from the repo; a change to ARCHITECTURE.md or an explainer page "
        "shows here at the next publish, and the check fails until it does.</li></ul>",
        "<h2>✨ The live, interactive pages</h2>",
        cols([f"<h4>{cd.esc(t)}</h4>" + card(u) for t, u in cd.ARTIFACTS.items()], 2),
        "<h2>📚 Every page of the record</h2>",
        '<div data-type="extension" data-extension-key="children" data-extension-type="com.atlassian.confluence.macro.core" '
        "data-parameters='{\"macroParams\":{\"all\":{\"value\":\"true\"},\"depth\":{\"value\":\"3\"}},\"macroMetadata\":{\"schemaVersion\":{\"value\":\"2\"},\"title\":\"Children Display\"}}'></div>",
    ]
    return "".join(out) + footer()


def section_page(ctx: cd.Ctx, num: str) -> str:
    """Where §num is recorded: the record page that holds it, or the page another story gives it."""
    top = num.split(".")[0]
    for slug, emo, _, _, title, _, secs, _, _ in ARCH:
        if num in spec_nums(secs):
            return ctx.link(slug, f"{emo} {title}")
    if top in ELSEWHERE:
        return ctx.link(ELSEWHERE[top], "The guardrails page")
    return ""


def render_rec_arch(ctx: cd.Ctx) -> str:
    _, heads = arch()
    colour = {s: c for s, _, _, c, *_ in ARCH}
    out = [cd.cpanel("#EAE6FF", ":classical_building:", "<p><strong>🏛️ ARCHITECTURE.md, area by area, in full</strong></p>"
                     f"<p>Every section of <a href=\"{cd.gh('ARCHITECTURE.md')}\">ARCHITECTURE.md</a> is on exactly one page below, as written, with "
                     "its tables, its decisions and the Lucid drawings where the text puts them. The map says which page holds which section.</p>"),
           pic(ctx, "rec-arch", "v4-hero", media_caption("v4-hero")),
           "<h2>🗺️ The map of the sections</h2>"
           '<table data-layout="full-width"><thead><tr><th>Section</th><th>Heading</th><th>Recorded on</th></tr></thead><tbody>']
    for h in heads:
        if h["level"] > 3:
            continue
        slug = next((s for s, *_, secs, _, _ in ARCH if h["num"] in spec_nums(secs)), None)
        where = section_page(ctx, h["num"])
        num = f"<strong>§{cd.esc(h['num'])}</strong>" if h["level"] == 2 else f"§{cd.esc(h['num'])}"
        out.append("<tr>" + cd.cell(num, colour.get(slug) if h["level"] == 2 else None)
                   + f"<td>{cd.inline(h['title'])}</td><td>{where}</td></tr>")
    out.append("</tbody></table>")
    out += ["<h2>🌐 The system, at a glance</h2>", lucid_pic(ctx, "rec-arch", "01-overview.png", "System overview, Lucid page 1"),
            "<h2>📜 Before section 1: what MyPaisa is</h2>",
            "<p>ARCHITECTURE.md's opening, as written.</p>", link_md(preamble_md(), ctx, "rec-arch")]
    return "".join(out) + footer()


def gen_doc() -> str:
    src = (DESIGN / "lucid" / "gen_aws_architecture.py").read_text()
    m = re.search(r'^"""(.*?)"""', src, re.S | re.M)
    if not m:
        raise RecordError("docs/design/lucid/gen_aws_architecture.py has no docstring")
    return m.group(1).strip()


def render_rec_drawings(ctx: cd.Ctx) -> str:
    out = [cd.cpanel("#FFFAE6", ":building_construction:", "<p><strong>🏗️ The architecture, drawn in Lucid on AWS shapes</strong></p>"
                     "<p>Nine drawings: eight views made by a generator and one sequence. Each is kept in the repo as a PNG, embedded in "
                     "ARCHITECTURE.md where its section explains it, and open as a live Lucid document (MA-141, redrawn for v4 on MA-225, "
                     "the trace added on MA-236).</p>"), toc(2)]
    for k, (png, title, doc, secs) in enumerate(cd.LUCID):
        nums = re.findall(r"§([\d.]+)", secs)
        where = ", ".join(section_page(ctx, n) or cd.esc(f"§{n}") for n in nums)
        out += [f"<h2>{'🔀' if png.startswith('08-') else '🖼️'} {cd.esc(title)}</h2>", lucid_pic(ctx, "rec-drawings", png, title),
                f"<p>{cd.lozenge(secs, 'blue')} explained on {where} · "
                f'<a href="{cd.gh("docs/design/lucid/" + png)}">the PNG</a> · <a href="https://lucid.app/lucidchart/{doc}/edit" data-card-appearance="inline"></a></p>']
    puml = (DESIGN / "lucid" / "08-add-holding-sequence.puml").read_text()
    out += ["<h2>⚙️ How they are made</h2>",
            cd.cpanel("#F4F5F7", ":gear:", f'<p><a href="{cd.gh("docs/design/lucid/gen_aws_architecture.py")}">gen_aws_architecture.py</a> writes '
                      f'<a href="{cd.gh("docs/design/lucid/aws-architecture.lucid.json")}">aws-architecture.lucid.json</a>, the Lucid Standard Import '
                      "file for the eight views; each is imported as one Lucid document and exported as the PNG here. Its own account of it:</p>"
                      f"<pre><code>{cd.esc(gen_doc())}</code></pre>"),
            "<h3>The sequence: adding a record, and correcting it in place</h3>"
            f'<p>Drawn from <a href="{cd.gh("docs/design/lucid/08-add-holding-sequence.puml")}">08-add-holding-sequence.puml</a>:</p>'
            f"<details><summary>The PlantUML source</summary><pre><code>{cd.esc(puml)}</code></pre></details>"]
    return "".join(out) + footer()


# ---------- the journeys index ----------

def render_rec_journeys(ctx: cd.Ctx) -> str:
    scen = js(V4, "SCEN")
    steps = inside_steps()
    rows = [("rec-j-v4", "Architecture v4", f"{len(scen)} journeys", ", ".join(s["name"] for s in scen)),
            ("rec-j-v4-parts", "Architecture v4", f"{len(js(V4, 'N'))} parts, {len(js(V4, 'AG'))} agents, {len(js(V4, 'MC'))} models",
             "Every part on the map, one trace, the tool loop and its tools, the agents, the models and the ladder, the data, delivery, the guardrails"),
            ("rec-j-inside", "Inside MyPaisa", f"{len(steps)} steps", ", ".join(s["title"] for s in steps)),
            ("rec-j-inside-more", "Inside MyPaisa", f"{len(TOURS)} tours", "One message through MyPaisa (" + ", ".join(TOURS.values()) + "), the agent team, the safety nets, the two homes, a day"),
            ("rec-j-flows", "The Agent Journey", f"{sum(len(g[4]) for g in FLOW_GROUPS)} flows", "; ".join(g[3] for g in FLOW_GROUPS)),
            ("rec-j-first", "The first journeys", f"{len(first_journeys())} journeys", ", ".join(j["title"] for j in first_journeys()))]
    titles = {s: t for s, t, _ in pages()}
    colour = {s: c for s, _, _, c, _, _ in JOURNEY_PAGES}
    out = [cd.cpanel("#E3FCEF", ":compass:", "<p><strong>🧭 Every journey, end to end</strong></p><p>The journeys MyPaisa was designed through, from the "
                     "explainer pages in docs/design/, with their own words, their data and their animations: what the member taps, what comes "
                     "back, and what happens behind it on AWS and in Claude.</p>"),
           pic(ctx, "rec-journeys", "inside-tour-ask", media_caption("inside-tour-ask")),
           '<table data-layout="full-width"><thead><tr><th>Page</th><th>From</th><th>Holds</th><th>What</th></tr></thead><tbody>']
    for slug, src, n, what in rows:
        out.append("<tr>" + cd.cell(ctx.link(slug, titles[slug]), colour[slug]) + f"<td>{cd.esc(src)}</td><td>{cd.esc(n)}</td><td>{cd.esc(what)}</td></tr>")
    out.append("</tbody></table>")
    out += ["<h2>✨ The live pages</h2>", cols([f"<h4>{cd.esc(t)}</h4>" + card(u) for t, u in cd.ARTIFACTS.items()], 2)]
    return "".join(out) + footer()


# ---------- Architecture v4 ----------

def sec_head(root: Node, sel_id: str) -> tuple[str, str, str]:
    s = root.need("section", id=sel_id)
    head = s.need(cls="sec-head")
    return line(head.find(cls="eyebrow")), line(head.find("h2")), "".join(f"<p>{line(p)}</p>" for p in head.children("p") if "eyebrow" not in p.cls())


def render_v4(ctx: cd.Ctx) -> str:
    root = dom(V4)
    hero = root.need("section", cls="hero")
    _, h2, intro = sec_head(root, "map")
    emoji = {"question": "❓", "goal": "🎯", "plan": "🧭", "file": "📄", "delete": "🗑️", "checkin": "✅", "value": "🌙", "digest": "📬", "failure": "🧯"}
    out = [cd.cpanel("#DEEBFF", ":satellite_orbital:", f"<p><strong>🛰️ {line(hero.find('h1'))}</strong></p>" + "".join(f"<p>{line(p)}</p>" for p in hero.find_all("p", cls="lede")[:1])
                     + f'<p>From <a href="{cd.gh(V4)}">architecture-v4.html</a> (MA-244), live at <a href="{cd.ARTIFACTS["MyPaisa Architecture v4"]}">MyPaisa Architecture v4</a>, '
                     "where each journey plays on demand and any part can be inspected.</p>"),
           f"<h2>🗺️ {h2}</h2>{intro}", legend(), toc(2)]
    scen = js(V4, "SCEN")
    if tuple(s["id"] for s in scen) != V4_JOURNEYS:
        raise RecordError(f"{V4}: its journeys are {[s['id'] for s in scen]}, not V4_JOURNEYS; update the record's pictures and captions with them")
    for s in scen:
        out.append(f"<h2>{emoji.get(s['id'], '•')} {cd.esc(s['name'])}: {len(s['steps'])} steps</h2>")
        out.append(cd.cpanel("#F4F5F7", ":arrow_forward:", f"<p><strong>{cd.esc(s['sum'])}</strong></p>"))
        out.append(pic(ctx, "rec-j-v4", f"v4-{s['id']}", media_caption(f"v4-{s['id']}")))
        out.append('<table data-layout="full-width"><thead><tr><th>#</th><th>Step</th><th>What happens</th><th>On the wire</th><th>Model</th></tr></thead><tbody>')
        for i, st in enumerate(s["steps"], 1):
            bg = "#FFEBE6" if st.get("f") else None
            out.append("<tr>" + cd.cell(f"<strong>{i}</strong>", bg) + cd.cell(f"<strong>{cd.esc(st['t'])}</strong>", bg)
                       + cd.cell(cd.esc(st["d"]), bg) + cd.cell(code_lines(st.get("c", "")), bg)
                       + cd.cell(model_chip(st["m"]) if st.get("m") else "", bg) + "</tr>")
        out.append("</tbody></table>")
    out.append(f"<p>Every part these journeys touch, the trace, the tool loop, the agents and the models: {ctx.link('rec-j-v4-parts', 'Architecture v4, every part')}.</p>")
    return "".join(out) + footer()


def legend() -> str:
    return "<p>" + " ".join(cd.lozenge(n, c) for n, c in (("Compute", "yellow"), ("App integration", "red"), ("Database", "purple"), ("Storage", "green"),
                                                         ("Networking, delivery", "purple"), ("Identity", "red"), ("Anthropic", "yellow"),
                                                         ("A failure path", "red"))) + "</p>"


def render_v4_parts(ctx: cd.Ctx) -> str:
    root = dom(V4)
    slug = "rec-j-v4-parts"
    out = [cd.cpanel("#EAE6FF", ":jigsaw:", "<p><strong>🧩 Every part of Architecture v4</strong></p><p>The system map's parts as its inspector describes them, one message "
                     "as an OpenTelemetry trace, the concierge's tool loop and its tools, the agents with the kind of agent each is and the model "
                     "it uses, the two Claude models and the spend ladder, where the data lives, delivery and the guardrails.</p>"
                     f'<p>From <a href="{cd.gh(V4)}">architecture-v4.html</a> (MA-244). Timings, tokens, costs and the bus events are illustrative.</p>'), toc(2)]
    out.append("<h2>🗺️ Every part on the map</h2><p>As the map's inspector tells it, part by part.</p>"
               '<table data-layout="full-width"><thead><tr><th>Part</th><th>Kind</th><th>What it does</th><th>Facts</th></tr></thead><tbody>')
    for k, n in js(V4, "N").items():
        cat = n.get("cat") or ("door" if n.get("door") else "ext")
        bg, kind = CAT_COLOUR.get(cat, ("#F4F5F7", cat))
        out.append("<tr>" + cd.cell(f"<strong>{cd.esc(n.get('name', k))}</strong><br>{cd.esc(n.get('sub', ''))}", bg) + f"<td>{cd.esc(kind)}</td>"
                   f"<td>{cd.esc(n.get('info', ''))}</td><td>" + ("<ul>" + "".join(f"<li>{cd.esc(f)}</li>" for f in n.get("facts") or []) + "</ul>" if n.get("facts") else "") + "</td></tr>")
    out.append("</tbody></table>")
    _, h2, intro = sec_head(root, "trace")
    out += [f"<h2>🧵 {h2}</h2>{intro}", pic(ctx, slug, "v4-trace", media_caption("v4-trace")),
            '<table data-layout="full-width"><thead><tr><th>Span</th><th>Service</th><th>From, to (ms)</th><th>Attributes</th></tr></thead><tbody>']
    kc = {"door": "#DEEBFF", "net": "#EFE8FF", "compute": "#FFF0E6", "int": "#FFE6F2", "queue": "#FFE6F2", "db": "#F7E6FA", "model": "#FFEBE6", "tool": "#E3FCEF"}
    for sp in js(V4, "SPANS"):
        attrs = "<br>".join(f"<code>{cd.esc(a)}</code>: {cd.esc(v)}" for a, v in (sp.get("a") or {}).items())
        out.append("<tr>" + cd.cell(("&nbsp;" * 4 * sp.get("d", 0)) + f"<strong>{cd.esc(sp['n'])}</strong>", kc.get(sp.get("k"))) +
                   f"<td>{cd.esc(sp.get('svc', ''))}</td><td>{sp['s']} to {sp['e']}" + (f", first token at {sp['ttft']}" if sp.get("ttft") else "") + f"</td><td>{attrs}</td></tr>")
    out.append("</tbody></table>")
    _, h2, intro = sec_head(root, "loop")
    out += [f"<h2>🔁 {h2}</h2>{intro}", pic(ctx, slug, "v4-loop", media_caption("v4-loop")),
            '<table data-layout="full-width"><thead><tr><th>Tools</th><th>Rule</th><th>The tools</th></tr></thead><tbody>']
    for t in js(V4, "TOOLS"):
        out.append(f"<tr><td><strong>{cd.esc(t['h'])}</strong></td><td>{cd.esc(t['p'])}</td><td>{' '.join(f'<code>{cd.esc(x)}</code>' for x in t['l'])}</td></tr>")
    out.append("</tbody></table>")
    _, h2, intro = sec_head(root, "team")
    kind = {"loop": ("Claude tool loop", "red"), "code": ("Code decides, Claude writes or tags", "yellow"), "none": ("Code only, no model", "neutral")}
    out += [f"<h2>👥 {h2}</h2>{intro}", pic(ctx, slug, "v4-team", media_caption("v4-team")),
            '<table data-layout="full-width"><thead><tr><th>Agent</th><th>Kind</th><th>Models</th><th>Its job</th><th>On its own</th><th>Asks the admin</th><th>Budget share</th></tr></thead><tbody>']
    for a in js(V4, "AG"):
        kn, kc2 = kind.get(a.get("kind"), (a.get("kind"), "neutral"))
        share = a.get("shareNote") or (f"{a['share']}% of the ceiling" if a.get("share") else "no Claude share")
        out.append(f"<tr><td><strong>{cd.esc(a['name'])}</strong><br>{cd.esc(a.get('type', ''))}</td><td>{cd.lozenge(kn, kc2)}</td>"
                   f"<td>{' '.join(model_chip(b) for b in a.get('brain') or [])}</td><td>{cd.esc(a.get('job', ''))}</td><td>{cd.esc(a.get('own', ''))}</td>"
                   f"<td>{cd.esc(a.get('ask', ''))}</td><td>{cd.esc(share)}</td></tr>")
    out.append("</tbody></table>")
    _, h2, intro = sec_head(root, "models")
    mcol = {"opus": "#EAE6FF", "sonnet": "#FFEBE6", "haiku": "#E3FCEF"}
    out += [f"<h2>🧠 {h2}</h2>{intro}",
            cols([cd.cpanel(mcol.get(m["k"], "#F4F5F7"), ":sparkles:", f"<h3>{cd.esc(m['name'])}</h3><p><code>{cd.esc(m['id'])}</code></p>"
                            f"<p><strong>{cd.esc(m['role'])}</strong></p><ul>" + "".join(f"<li>{cd.esc(u)}</li>" for u in m["uses"]) + f"</ul><p>{cd.esc(m['price'])}</p>")
                  for m in js(V4, "MC")], 3),
            "<h3>🪜 The spend ladder</h3>"
            '<table data-layout="full-width"><thead><tr><th>From</th><th>Step</th><th>What happens</th></tr></thead><tbody>']
    ladder = {"s100": "#FFEBE6", "s95": "#FFF0E6", "s85": "#FFFAE6", "s70": "#DEEBFF", "s0": "#E3FCEF"}
    for p, k, name, what in js(V4, "STEPS"):
        out.append("<tr>" + cd.cell(f"<strong>{p}%</strong> of the ceiling", ladder.get(k)) + f"<td>{cd.esc(name)}</td><td>{cd.esc(what)}</td></tr>")
    out.append("</tbody></table><h3>🍰 Each agent's share of the ceiling</h3><table><thead><tr><th>Who</th><th>Share</th></tr></thead><tbody>")
    for who, share, _ in js(V4, "SHARES"):
        out.append(f"<tr><td>{cd.esc(who)}</td><td>{share}%</td></tr>")
    out += ["</tbody></table>", pic(ctx, slug, "v4-models", media_caption("v4-models"))]
    for sid, emo in (("state", "🗄️"), ("delivery", "🚀"), ("rules", "🛡️")):
        sec = root.need("section", id=sid)
        _, h2, intro = sec_head(root, sid)
        out += [f"<h2>{emo} {h2}</h2>{intro}", pic(ctx, slug, f"v4-{sid}", media_caption(f"v4-{sid}")),
                blocks(sec.need(cls="wrap"), shift=1, skip=("sec-head",)), guardrails_note(ctx) if sid == "rules" else ""]
    return "".join(out) + footer()


# ---------- Inside MyPaisa ----------

TOURS = {"ask": "you ask a question", "file": "you send a file", "checkin": "MyPaisa asks you", "fail": "something fails"}
BEHIND_COLOUR = {"cat-door": "#DEEBFF", "cat-pipe": "#EAE6FF", "cat-ai": "#FFEBE6", "cat-code": "#E3FCEF", "cat-store": "#FFFAE6"}


def inside_steps() -> list[dict]:
    root = dom(INSIDE)
    out = []
    for art in root.need("section", id="journey").find_all("article", cls="step"):
        copy = art.need(cls="copy")
        behind = copy.find("ul", cls="behind")
        out.append({"n": art.need(cls="num").text(), "title": copy.need("h2").text(),
                    "tags": [c.text() for c in copy.find_all(cls="chipx")],
                    "paras": [line(p) for p in copy.children("p")],
                    "behind": [(next((c for c in li.cls() if c.startswith("cat-")), ""), line(li)) for li in (behind.children("li") if behind else []) if "bh" not in li.cls()],
                    "caption": line(art.find("figcaption")) or line(art.find(cls="cap"))})
    if len(out) != 9:
        raise RecordError(f"{INSIDE}: the admin's journey has {len(out)} steps, not nine; update the record's pictures")
    return out


def render_inside(ctx: cd.Ctx) -> str:
    root = dom(INSIDE)
    slug = "rec-j-inside"
    hero = root.need("section", cls="hero")
    promises = next(s for s in root.find_all("section") if not s.attrs.get("id") and "hero" not in s.cls())
    out = [cd.cpanel("#FFFAE6", ":house:", f"<p><strong>🏠 {line(hero.find('h1'))}</strong></p>" + "".join(f"<p>{line(p)}</p>" for p in hero.find_all("p")[:2])
                     + f'<p>From <a href="{cd.gh(INSIDE)}">inside-mypaisa.html</a> (MA-239), the whole architecture in plain words, live at '
                     f'<a href="{cd.ARTIFACTS["Inside MyPaisa"]}">Inside MyPaisa</a>.</p>'),
           pic(ctx, slug, "inside-hero", media_caption("inside-hero")), toc(2),
           "<h2>🤝 The promises</h2>", blocks(promises, shift=1),
           "<h2>🏢 The cast</h2>", pic(ctx, slug, "inside-cast", media_caption("inside-cast")),
           blocks(root.need("section", id="cast"), shift=1)]
    j = root.need("section", id="journey")
    out += [f"<h2>🚶 {line(j.need('h2'))}</h2>", "".join(f"<p>{line(p)}</p>" for p in j.need(cls="sec-head").children("p"))]
    tagc = ["blue", "purple", "green", "yellow"]
    for k, st in enumerate(inside_steps(), 1):
        left = (f"<h3>{st['n']} · {cd.esc(st['title'])}</h3><p>" + " ".join(cd.lozenge(t, tagc[i % 4]) for i, t in enumerate(st["tags"])) + "</p>"
                + "".join(f"<p>{p}</p>" for p in st["paras"]))
        behind = "<h4>Behind the screen</h4><table><tbody>" + "".join(
            "<tr>" + cd.cell(b, BEHIND_COLOUR.get(c)) + "</tr>" for c, b in st["behind"]) + "</tbody></table>" if st["behind"] else ""
        out.append(cols([left + behind, pic(ctx, slug, f"inside-step-{k}", media_caption(f"inside-step-{k}"))], 2))
    out.append(f"<p>Next: {ctx.link('rec-j-inside-more', 'one message through MyPaisa, the agent team, the safety nets and a day')}.</p>")
    return "".join(out) + footer()


def render_inside_more(ctx: cd.Ctx) -> str:
    root = dom(INSIDE)
    slug = "rec-j-inside-more"
    tours = js(INSIDE, "T")
    eng = root.need("section", id="inside")
    out = [cd.cpanel("#E3FCEF", ":envelope_with_arrow:", "<p><strong>✉️ Inside MyPaisa, the rest of the way</strong></p><p>One message played through the system in four "
                     "tours, the agent team of phase 13 and the admin's approval, what stops it going wrong, the two homes on AWS, and a day with MyPaisa.</p>"
                     f'<p>From <a href="{cd.gh(INSIDE)}">inside-mypaisa.html</a> (MA-239).</p>'), toc(2),
           f"<h2>✉️ {line(eng.find('h2'))}</h2>", "".join(f"<p>{line(p)}</p>" for p in eng.find(cls="sec-head").children("p") if "eyebrow" not in p.cls())]
    temoji = {"ask": "❓", "file": "📄", "checkin": "🔔", "fail": "🧯"}
    for k, name in TOURS.items():
        out += [f"<h3>{temoji[k]} When {cd.esc(name)}: {len(tours[k])} steps</h3>", pic(ctx, slug, f"inside-tour-{k}", media_caption(f"inside-tour-{k}")),
                '<table data-layout="full-width"><thead><tr><th>#</th><th>Step</th><th>What happens</th><th>Behind it</th></tr></thead><tbody>']
        for i, st in enumerate(tours[k], 1):
            bg = "#FFEBE6" if st.get("bad") else None
            out.append("<tr>" + cd.cell(f"<strong>{i}</strong>", bg) + cd.cell(f"<strong>{cd.esc(st['t'])}</strong>", bg) + cd.cell(cd.esc(st["b"]), bg)
                       + cd.cell(f"<code>{cd.esc(st.get('x', ''))}</code>", bg) + "</tr>")
        out.append("</tbody></table>")
    for sid, emo, media in (("agents", "👥", "inside-agents"), ("safety", "🛟", "inside-safety"), ("homes", "🏘️", "inside-homes"), ("day", "☀️", "inside-day")):
        sec = root.need("section", id=sid)
        out += [f"<h2>{emo} {line(sec.find('h2'))}</h2>", pic(ctx, slug, media, media_caption(media)),
                blocks(sec, shift=1, skip=("eyebrow",), drop=(sec.find("h2"),))]
    return "".join(out) + footer()


# ---------- the Agent Journey ----------

@functools.lru_cache(maxsize=None)
def _flows(stamp: float) -> dict[str, dict]:
    root = dom(FLOWS)
    out = {}
    for sec in root.find_all("section", cls="flow"):
        head = sec.need(cls="flow-h")
        out[sec.attrs["id"]] = {"n": head.need(cls="flow-n").text(), "title": head.need("h2").text(), "lede": line(head.find("p", cls="lede")),
                                "chips": [(c.text(), line(c)) for c in head.find_all(cls="chip")], "node": sec}
    return out


def flows() -> dict[str, dict]:
    return _flows((ROOT / FLOWS).stat().st_mtime)


def flow(fid: str) -> dict:
    f = flows().get(fid)
    if f is None:
        raise RecordError(f"{FLOWS} has no flow #{fid}; update FLOW_GROUPS in scripts/confluence_record.py")
    return f


def lane_of(li: Node) -> str:
    lanes = li.attrs.get("data-lanes", "")
    first = lanes.split(" to ")[0].split(" (")[0].strip()
    return {"Member": "Member", "App": "App", "AWS": "AWS", "Claude": "Claude", "External": "External", "Note": "Note"}.get(first, "AWS")


def path_table(seq: Node) -> str:
    rows = []
    n = 0
    for li in seq.children("li"):
        body = li.find(cls="lb") or li.find(cls="box") or li
        lane = lane_of(li)
        if lane != "Note":
            n += 1
        who = li.attrs.get("data-lanes", "")
        rows.append("<tr>" + cd.cell(f"<strong>{n if lane != 'Note' else '✎'}</strong>", LANE_COLOUR[lane])
                    + cd.cell(cd.esc(who), LANE_COLOUR[lane]) + f"<td>{line(body)}</td></tr>")
    return ('<table data-layout="full-width"><thead><tr><th>#</th><th>Lanes</th><th>What happens</th></tr></thead><tbody>' + "".join(rows) + "</tbody></table>")


def flow_blocks(ctx: cd.Ctx, slug: str, fid: str) -> str:
    f = flow(fid)
    sec: Node = f["node"]
    out = [f"<h2>{cd.esc(f['n'])} · {cd.esc(f['title'])}</h2>",
           cd.cpanel("#F4F5F7", ":round_pushpin:", f"<p>{f['lede']}</p><p>" + " ".join(
               cd.lozenge(t, "blue" if t.startswith("Phase") else "purple") if len(t) < 30 else f"<em>{h}</em>" for t, h in f["chips"]) + "</p>")]
    blocks_after = [k for k in sec.kids if isinstance(k, Node) and "flow-h" not in k.cls()]
    for k in blocks_after:
        if k.tag == "h3":
            t = k.text()
            emo = "🛡️" if t.startswith("Safeguards") else "🧩" if t == "Built by" else "🛤️" if t.lower().startswith("the path") else "👀" if " see" in t else "📌"
            out.append(f"<h3>{emo} {line(k)}</h3>")
            continue
        if "seq-card" in k.cls():
            for r in [k] if k.find("ol", cls="seq") else []:
                route = r.find("p", cls="route")
                if route:
                    out.append(f"<p><strong>{line(route)}</strong></p>")
                for seq in r.find_all("ol", cls="seq"):
                    out.append(path_table(seq))
        elif "mocks" in k.cls():
            out.append(pic(ctx, slug, f"flow-{fid}", media_caption(f"flow-{fid}")))
            caps = [line(c) for c in k.find_all("figcaption")]
            if caps:
                out.append("<ul>" + "".join(f"<li>{c}</li>" for c in caps) + "</ul>")
        elif "sgs" in k.cls():
            cells = [cd.cpanel("#E3FCEF", ":shield:", f"<p><strong>{line(c.find('b'))}</strong></p><p>{line(c.find('span'))}</p>") for c in k.find_all(cls="sgc")]
            out.append(cols(cells, 2))
        elif "keys" in k.cls():
            keys = [(a.need("b").text(), line(a.find("span"))) for a in k.find_all("a", cls="key")]
            if bad := [key for key, _ in keys if not re.fullmatch(r"MA-\d+", key)]:
                raise RecordError(f"{FLOWS} flow #{fid} is built by {', '.join(bad)}, which is no Jira key")
            out.append("<table><tbody>" + "".join(f"<tr><td>{cd.jira(key)}</td><td>{what}</td></tr>" for key, what in keys) + "</tbody></table>")
        else:
            out.append(blocks(k, shift=1) if any(isinstance(c, Node) for c in k.kids) or k.tag != "div" else "")
    return "".join(out)


def render_flows(ctx: cd.Ctx) -> str:
    root = dom(FLOWS)
    hero = root.need("section", cls="hero")
    out = [cd.cpanel("#FFEBE6", ":compass:", f"<p><strong>🧭 {line(hero.find('h1'))}</strong></p>" + "".join(f"<p>{line(p)}</p>" for p in hero.find_all("p")[:3])
                     + f'<p>From <a href="{cd.gh(FLOWS)}">agent-journey.html</a> (MA-141, India in MA-155, the iOS app in MA-161, the v4 flows in MA-226), '
                     f'live at <a href="{cd.ARTIFACTS["MyPaisa Agent Journey"]}">MyPaisa Agent Journey</a>.</p>'), toc(2)]
    heads = root.find_all("h2", cls="sec-h")
    for h in heads[:3]:
        out.append(f"<h2>{'📏' if 'rules' in h.text() else '📖' if 'read' in h.text() else '🛡️'} {line(h)}</h2>")
        sib = h.parent.kids
        i = sib.index(h) + 1
        while i < len(sib) and not (isinstance(sib[i], Node) and sib[i].tag == "h2"):
            n = sib[i]
            if isinstance(n, Node):
                if "grid" in n.cls():
                    cards = n.children(cls="card")
                    cells = []
                    for c in cards:
                        lane = next((LANE_COLOUR[k] for k, cls_ in (("Member", "dm"), ("App", "dp"), ("AWS", "da"), ("Claude", "dc"), ("External", "de"))
                                     if c.find("i", cls=cls_)), "#F4F5F7")
                        tag = line(c.find("p", cls="tag"))
                        cells.append(cd.cpanel(lane if "lanecard" in c.cls() else "#EAE6FF", ":small_blue_diamond:",
                                               (f"<p><strong>{tag}</strong></p>" if tag else "") + f"<h4>{line(c.find('h3'))}</h4>"
                                               + "".join(f"<p>{line(p)}</p>" for p in c.children("p") if "tag" not in p.cls())))
                    out.append(cols(cells, 2))
                elif "sgs" in n.cls():
                    out.append(cols([cd.cpanel("#E3FCEF", ":shield:", f"<p><strong>{line(c.find('b'))}</strong></p><p>{line(c.find('span'))}</p>")
                                     for c in n.find_all(cls="sgc")], 2))
                else:
                    out.append(blocks(n, shift=1) if n.tag != "p" else f"<p>{line(n)}</p>")
            i += 1
    out.append("<h2>🗂️ The twenty-three flows</h2>"
               '<table data-layout="full-width"><thead><tr><th>#</th><th>Flow</th><th>When</th><th>Recorded on</th></tr></thead><tbody>')
    titles = {s: t for s, t, _ in pages()}
    for g in FLOW_GROUPS:
        for fid in g[4]:
            f = flow(fid)
            out.append("<tr>" + cd.cell(f"<strong>{cd.esc(f['n'])}</strong>", g[2]) + f"<td><strong>{cd.esc(f['title'])}</strong><br>{f['lede']}</td>"
                       f"<td>{'<br>'.join(h for _, h in f['chips'])}</td><td>{ctx.link(g[0], titles[g[0]])}</td></tr>")
    out.append("</tbody></table>")
    missing = set(flows()) - {f for g in FLOW_GROUPS for f in g[4]}
    if missing:
        raise RecordError(f"{FLOWS} has flows on no record page: {', '.join(sorted(missing))}; add them to FLOW_GROUPS")
    return "".join(out) + footer()


def render_flow_group(ctx: cd.Ctx, g: tuple) -> str:
    slug, emo, colour, title, fids = g
    out = [cd.cpanel(colour, ":compass:", f"<p><strong>{emo} {cd.esc(title)}</strong></p><p>{len(fids)} of the Agent Journey's flows, each as a numbered path across "
                     "five lanes (the member, the app, AWS, Claude and external data), the screens the member sees, the safeguards on the path and "
                     f"the Jira stories that build it.</p><p>" + " ".join(cd.lozenge(lane, c) for lane, c in (("Member", "red"), ("App and web app", "blue"),
                                                                                                        ("AWS", "yellow"), ("Claude", "purple"),
                                                                                                        ("External data", "neutral"), ("A note", "green"))) + "</p>"),
           toc(2)]
    out += [flow_blocks(ctx, slug, fid) for fid in fids]
    out.append(f"<p>All twenty-three: {ctx.link('rec-j-flows', 'the Agent Journey')}.</p>")
    return "".join(out) + footer()


# ---------- the first journeys ----------

def first_journeys() -> list[dict]:
    j = js(FIRST, "J")
    if not j:
        raise RecordError(f"{FIRST} has no journeys")
    return j


def strip_tags(s: str) -> str:
    """A string the first journeys' script builds HTML from, as plain text."""
    text = re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", " ", s or ""))
    return cd.esc(" ".join(html.unescape(text).split()))


def render_first(ctx: cd.Ctx) -> str:
    slug = "rec-j-first"
    root = dom(FIRST)
    out = [cd.cpanel("#F4F5F7", ":pager:", f"<p><strong>📟 {line(root.find('h1'))}</strong></p><p>{line(root.find('p', cls='lede'))}</p>"),
           '<div data-type="panel-warning"><p><strong>Kept for reference.</strong> Eight user journeys on a phone frame, in the Nocturne look, from '
           f'23 Oct 2026 (<a href="{cd.gh(FIRST)}">journeys.html</a>). Superseded by the Agent Journey ({ctx.link("rec-j-flows", "its twenty-three flows")}); '
           "the Telegram bot they show was superseded by the iOS app (MA-161), and the web app was kept beside it.</p></div>",
           pic(ctx, slug, "first-phone", media_caption("first-phone")), toc(2)]
    for j in first_journeys():
        out.append(f"<h2>📱 {strip_tags(j.get('title'))}</h2><p><em>{strip_tags(j.get('sub'))}</em> · at {cd.esc(j.get('clock', ''))}</p><ol>")
        for st in j.get("steps") or []:
            say = st.get("t") or st.get("title") or st.get("tap") or st.get("sys") or st.get("name") or ""
            what = ("You tap " if st.get("tap") else "You send " if st.get("u") else "MyPaisa: " if st.get("b") else "")
            out.append(f"<li>{('<strong>' + what + strip_tags(say) + '</strong> ') if say else ''}{strip_tags(st.get('note'))}</li>")
        out.append("</ol>")
    for h in root.find_all("h2"):
        sib = h.parent.kids
        nxt = [k for k in sib[sib.index(h) + 1:] if isinstance(k, Node)]
        body = []
        for k in nxt:
            if k.tag == "h2":
                break
            if "strip" in k.cls() or k.find(cls="strip"):
                days = k.find_all(cls="d")
                body.append("<table><tbody>" + "".join("<tr>" + cd.cell(f"<strong>{line(d.find('b'))}</strong>", "#DEEBFF") + "<td>"
                                                       + "<br>".join(line(s) for s in d.children("span")) + "</td></tr>" for d in days) + "</tbody></table>")
            elif "timeline" in k.cls():
                body.append("<table><tbody>" + "".join("<tr>" + cd.cell(f"<strong>{line(t.find('b'))}</strong>", "#E3FCEF")
                                                       + f"<td>{line(t.find('div'))}</td></tr>" for t in k.find_all(cls="tl")) + "</tbody></table>")
            elif "rules" in k.cls():
                body.append(cols([cd.cpanel("#EAE6FF", ":pushpin:", f"<p><strong>{line(r.find('b'))}</strong></p><p>{clean(''.join(inl(x) for x in r.kids if not (isinstance(x, Node) and x.tag == 'b')))}</p>")
                                  for r in k.find_all(cls="rule")], 2))
            else:
                body.append(f"<p>{line(k)}</p>" if k.tag == "p" else blocks(k, shift=1))
        out.append(f"<h2>🗓️ {line(h)}</h2>" + "".join(body))
    return "".join(out) + footer()


# ---------- wiring ----------

def render(ctx: cd.Ctx, slug: str) -> str:
    try:
        if slug == "rec":
            return render_rec(ctx)
        if slug == "rec-arch":
            return render_rec_arch(ctx)
        if slug == "rec-drawings":
            return render_rec_drawings(ctx)
        if slug == "rec-journeys":
            return render_rec_journeys(ctx)
        if entry := next((a for a in ARCH if a[0] == slug), None):
            return render_arch_page(ctx, entry)
        if g := next((g for g in FLOW_GROUPS if g[0] == slug), None):
            return render_flow_group(ctx, g)
        return {"rec-j-v4": render_v4, "rec-j-v4-parts": render_v4_parts, "rec-j-inside": render_inside, "rec-j-inside-more": render_inside_more,
                "rec-j-flows": render_flows, "rec-j-first": render_first}[slug](ctx)
    except (RecordError, KeyError, StopIteration, AttributeError, TypeError) as e:
        raise RecordError(f"record page {slug}: {type(e).__name__}: {e}") from e


def errors(ctx: cd.Ctx, slugs: set[str]) -> list[str]:
    """Every ARCHITECTURE section on exactly one record page, or on the page ELSEWHERE gives it."""
    out = []
    for m in MEDIA:
        try:
            media_source(m)
        except RecordError as e:
            out.append(f"confluence: picture {m}: {e}")
    _, heads = arch()
    held: dict[str, list[str]] = {}
    for slug, *_, secs, _, _ in ARCH:
        try:
            for a, b in map(arch_span, secs):
                for h in heads:
                    if a <= h["line"] < b:
                        held.setdefault(h["num"], []).append(slug)
        except RecordError as e:
            out.append(f"confluence: {e}; fix ARCH in scripts/confluence_record.py")
    for h in heads:
        top = h["num"].split(".")[0]
        where = held.get(h["num"], [])
        if top in ELSEWHERE:
            if ELSEWHERE[top] not in slugs:
                out.append(f"confluence: ARCHITECTURE §{h['num']} belongs on the {ELSEWHERE[top]} page, which the generator does not make")
            if where:
                out.append(f"confluence: ARCHITECTURE §{h['num']} is on {', '.join(where)} and on the {ELSEWHERE[top]} page")
        elif len(where) != 1:
            out.append(f"confluence: ARCHITECTURE §{h['num']} is on {len(where)} record pages ({', '.join(where) or 'none'}); "
                       "give it exactly one in ARCH in scripts/confluence_record.py")
    return out


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "recipes":
        names = argv[2:] or list(MEDIA)
        print(json.dumps({n: {**MEDIA[n], "out": media_file(n)} for n in names}, indent=1, ensure_ascii=False))
        return 0
    if cmd == "uploads":
        ctx = cd.Ctx()
        imgs = ctx.manifest.get("images", {})
        for name, w in wanted_images(ctx).items():
            if imgs.get(name, {}).get("source") != w["source"]:
                pid = ctx.manifest.get("pages", {}).get(w["page"], {}).get("id", "")
                print(f"{name}\t{w['page']}\t{pid}\t{w['capture'] + '.' + media_ext(w['capture']) if 'capture' in w else w['file'].relative_to(ROOT)}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
