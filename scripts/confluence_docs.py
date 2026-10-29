#!/usr/bin/env python3
"""The build plan in Confluence, generated from the repo's records (MA-228).

Confluence (space mypaisaa-agent) is the fifth record beside PLAN.md and ARCHITECTURE.md, Jira, the Claude Design
boards and the code (.claude/rules/plan-sync.md). Every page is rendered here from docs/trace.json, PLAN.md,
ARCHITECTURE.md, docs/roadmap.json, the design decision records and the design mirror, written to docs/confluence/<page>.html, and
published through the Atlassian MCP by /plan-sync. docs/confluence.json records each page's id, the version
published and the hash of the HTML sent, and each board preview's media id and the boards it shows.

    python3 scripts/confluence_docs.py write                 # render every page into docs/confluence/
    python3 scripts/confluence_docs.py check                 # fail on a stale or unpublished page or preview
    python3 scripts/confluence_docs.py pending               # the pages and previews that need publishing
    python3 scripts/confluence_docs.py images CAPTURES OUT   # compose the board previews from captured boards
    python3 scripts/confluence_docs.py set-page SLUG ID VERSION [published]  # record a page created, or published
    python3 scripts/confluence_docs.py set-image NAME MEDIA COLLECTION # record an uploaded preview
    python3 scripts/confluence_docs.py app-prompt NAME       # the prompt a Maui app (roadmap-gantt, decision-cards) is made from
    python3 scripts/confluence_docs.py set-app NAME ID URL   # record a Maui app made from that prompt
    python3 scripts/confluence_docs.py set-database NAME ID [published]  # record the story explorer database
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import roadmap  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TRACE = ROOT / "docs" / "trace.json"
MIRROR = ROOT / "docs" / "design" / "claude-design.json"
PLAN = ROOT / "PLAN.md"
MANIFEST = ROOT / "docs" / "confluence.json"
PAGES = ROOT / "docs" / "confluence"
REVIEWS = ROOT / "docs" / "design" / "reviews"

JIRA = "https://duttaarun2015.atlassian.net"
CLOUD_ID = "81c51173-bbea-4905-bbc5-1a880fa348bb"
GITHUB = "https://github.com/gilipersonal/mypaisa-agent/blob/main/"
DESIGN = "https://claude.ai/design/p/{id}?file={file}"
ARTIFACTS = {
    "Inside MyPaisa": "https://claude.ai/artifact/NQecwzUjudjq1Kigri13g5",
    "MyPaisa Architecture v4": "https://claude.ai/artifact/QputM7CuDn3Zv5s7TGyGL9",
    "MyPaisa Agent Journey": "https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7",
    "MyPaisa Market Agent": "https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb",
    "MyPaisa Guardrails and Evals": "https://claude.ai/artifact/K4esevpFaFVYQKk2QAw3bT",
}
GUARDRAILS_GIFS = [  # (gif in docs/design/guardrails-evals, tab title, caption): the explainer's diagrams, animated (MA-258)
    ("01-fences.gif", "Five fences", "Three requests meet the five fences; only the first reaches the member, as a card that saves nothing until Confirm."),
    ("02-policy-gate.gif", "The policy gate", "The gate's five checks run twice: a draft passes; a web fetch after reading a statement is refused."),
    ("03-tested-on-change.gif", "Tested on change", "A docs change runs T0; a prompt change adds T1; a model change runs T2 before a release may ship it."),
    ("04-watched-live.gif", "Watched live", "Every run is checked by code; flagged runs and a random 10% are judged overnight; only a rate leaving its band alerts."),
    ("05-judges-calibrated.gif", "The judges", "The admin's labels fill toward 50 of each; a judge is active only while both rates stay above 0.8."),
    ("06-growth.gif", "Growth", "A new tool arrives without its cases and the coverage check refuses it; with its cases it passes."),
]
STACK_GIFS = [  # (gif in docs/design/tech-stack-observability, tab title, caption): the stack & observability block diagrams, animated (MA-265)
    ("01-e2e-trace-fastapi.gif", "1 · E2E trace & FastAPI", "One W3C trace and request ID flow from the browser or iPhone through FastAPI (Mangum and Uvicorn + LWA), the FIFO queues, the agent's Claude GenAI spans and SSE back to the door."),
    ("02-observability-surfaces-cost.gif", "2 · Surfaces & £2.50/mo cost", "Every run feeds the in-app Activity screen (£0), the 8-panel CloudWatch Watch Tower and Transaction Search, and the owner's alerts, for £2.46/month in prod."),
    ("03-frontend-sveltekit-stack.gif", "3 · Web stack (SvelteKit 3)", "SvelteKit 3.1, Svelte 5 runes, Tailwind CSS 4.3, shadcn-svelte, LayerChart and TanStack Query/Table/Virtual/Form sit over web/src/lib/, whose OpenAPI types come straight from FastAPI."),
    ("04-ios-rn-swiftui-stack.gif", "4 · iOS stack (RN + SwiftUI)", "React Native 0.88 handles state, offline MMKV caching and SSE in TypeScript; every visible screen, card and chart is Swift 6 SwiftUI at 120 Hz across the Fabric C++ bridge."),
    ("05-backend-fastapi-dynamodb.gif", "5 · FastAPI & DynamoDB", "FastAPI serves both REST and SSE; a thin typed repository on Pydantic v2, boto3 and mypy-boto3-dynamodb handles single-table DynamoDB at £0/mo, whereas DocumentDB would cost £75–£110/mo."),
    ("06-agent-framework-architecture.gif", "6 · Agent loop & frameworks", "The thin custom loop on the official Anthropic SDK scores 10/10 across MyPaisa's seven criteria, borrowing PydanticAI's @tool RunContext pattern and using Step Functions + EventBridge in Phase 18."),
]
CICD_GIFS = [  # (gif in docs/design/cicd-security-regression, tab title, caption): the CI/CD, security, smoke & regression block diagrams, animated (MA-272)
    ("01-cicd-pipeline-dev-prod.gif", "1 · CI/CD pipeline (dev & prod)", "One arm64 container build on AWS CodeBuild is scanned with trivy image, pushed to ECR, auto-deployed to dev with smoke and X-Ray trace checks, and promoted by exact sha256 digest to prod after Arun approves."),
    ("02-vulnerability-7-gates.gif", "2 · 7-layer security gate", "Seven open-source and free-tier security gates (gitleaks, ruff Bandit S + semgrep, pip-audit + pnpm audit + trivy fs, tflint + trivy config, trivy image + ECR scan, T0 taint/PII check, live 401/CSP + Monday sweep) block High/Critical CVEs at £0/month."),
    ("03-smoke-and-rollback.gif", "3 · Smoke & <5s rollback", "scripts/smoke.py runs a full synthetic chat and X-Ray trace check in dev and a strictly read-only health/auth/alarm probe in prod (zero writes to prod tables), rewinding Lambda :live aliases in under five seconds on any fault."),
    ("04-regression-pyramid-and-costs.gif", "4 · 5-layer regression & £0/mo cost", "The five-layer regression pyramid across Phases 0 to 20 and the Option D hybrid runner strategy keep both GitHub Actions (<2,000 free mins) and AWS CodeBuild (<100 free arm64 mins) at £0.00/month."),
]
MAESTRO_GIFS = [  # (gif in docs/design/maestro-ios-ipados-testing, tab title, caption): the local Maestro & private 90-day TestFlight block diagrams, animated (MA-274)
    ("01-local-maestro-pool-mcp-cli.gif", "1 · Cloned pool & MCP isolation", "One Maestro owner per simulator prevents XCTest driver teardowns: interactive MCP sessions stay on standard Xcode simulators while scripts/maestro_local.py drives five cloned flock-locked simulators against stub (£0) or dev-live AWS."),
    ("02-rn-swiftui-fabric-selectors.gif", "2 · RN + SwiftUI mp.* selectors", "One shared mp.* ID schema generates web/src/lib/test-ids.ts and TestIDs.swift, while .accessibilityElement(children: .contain), UITabBarItem IDs and MYPAISA_STATIC_MOTION=1 keep SwiftUI and Liquid Glass controls deterministic."),
    ("03-ios-ipados-4band-matrix.gif", "3 · 4-band width & rotation matrix", "Maestro tests all four width sub-bands (<600 pt compact, 600–899 pt top bar + sheet, 900–1132 pt MA-240 sidebar + sheet, and ≥1133 pt three-column chat-beside) and rotates iPads mid-flow with zero lost input."),
    ("04-simctl-capabilities-phases.gif", "4 · simctl & Phases 0–20 (£0/mo)", "xcrun simctl and host staging drive Face ID match/fail, APNs lock-screen push notifications, Universal Links, Photos images, Local File Provider PDFs/workbooks and AX5 across Phases 0 to 20 locally on Apple Silicon at £0.00/month instead of £42–£65/month on GitHub macos-15."),
    ("05-private-testflight-90day-beta.gif", "5 · Private 90-day TestFlight beta", "testFlightInternalTestingOnly = true hard-locks MyPaisa off the public App Store while silent TestFlight Automatic Updates, least-privilege App Store Connect roles and a day-60 keepalive renew the 90-day (3-month) install window indefinitely."),
]
LUCID = [  # (png in docs/design/lucid, title, Lucid document, ARCHITECTURE sections)
    ("01-overview.png", "System overview", "4ae817c6-847f-45f8-a10c-4509971c9c09", "§3"),
    ("02-environments.png", "Environments, domains and delivery", "350c6593-a915-495f-88f1-a781b3ed1c5b", "§18"),
    ("03-identity.png", "Identity and sign-in", "c23040ec-b253-47e2-a614-612dab962292", "§4.5"),
    ("04-queues.png", "Queues, retries and replay", "ddc9bde5-18d4-468b-af6e-c1f86d7d7647", "§21"),
    ("05-data.png", "Where the data lives", "674e3574-9c79-403c-9157-72769a8d5fce", "§20.6"),
    ("06-market-agent.png", "The market agent and the learning loop", "6f1b4c75-353c-49e5-b6e7-29fd2c18d356", "§19, §22"),
    ("07-agents-caps.png", "The agent team, settings, caps and alerts", "3c1a6c63-dd6b-4d6e-bd15-c2ea8fed15d4", "§15.2, §20"),
    ("08-add-holding-sequence.png", "Adding a record (sequence)", "b50d49fd-c941-44a0-b623-7d3e99b57fd8", "§4.2, §4.10"),
    ("09-observability.png", "One trace from the door to the model", "3692ebe8-3794-4ff5-9658-83a8da565dfb", "§10"),
]
# The screen areas, each a page; every board file a story cites belongs to exactly one.
AREAS = [
    ("shell", "Shell, chat and sign-in",
     "The frame every screen sits in and the conversation that drives it: the web app's chat beside the page, the iPhone's tabs, the iPad and foldable layouts, signing in, You and the settings.",
     ["Web v4 · Shell and chat.dc.html", "Browser 2.dc.html", "Shell options.dc.html", "iPhone chat.dc.html",
      "iPhone sign-in.dc.html", "iPhone settings.dc.html", "iPad and foldable.dc.html"]),
    ("home", "Home and the dashboard",
     "Net worth first, across the UK and India: the Overview in the browser, Home on iPhone and iPad, and the market views a holding opens.",
     ["Web v4 · Dashboard.dc.html", "iPhone v4 · Home.dc.html", "iPhone dashboard.dc.html", "Responsive.dc.html",
      "Browser.dc.html", "Wealth.dc.html", "India.dc.html"]),
    ("register", "Registering and check-ins",
     "Anything new is created in the chat: a sentence, a screenshot or a statement, the questions only for what is missing, a Confirm card and the audit row. Check-ins ask when a payment, a maturity or a valuation is due, and one tap records it.",
     ["iPhone v4 · Register.dc.html", "iPhone v4 · Check-ins.dc.html", "Web v4 · Check-ins.dc.html"]),
    ("assets", "Assets and debts",
     "Every record the household owns or owes, one asset and one loan, the event timeline, XIRR with its working, and a figure corrected in place.",
     ["Web v4 · Assets and debts.dc.html", "iPhone v4 · Assets and debts.dc.html", "iPad v4 · Budget, assets and debts.dc.html"]),
    ("budget", "Budget and statements",
     "Each member's income, a plan per category, plan against actual, statements read and categorised, and the month closed on the 1st.",
     ["Web v4 · Budget.dc.html", "iPhone v4 · Budget.dc.html"]),
    ("projection", "Projection and Forecast",
     "The Projection of the household's net worth over the years (the fan, its milestones and the editable assumptions), its Plans and Budget forecast tabs, a plan made in the admin's chat with the budget rearranged on Confirm (MA-264's options, Arun's picks 1a, 2a and 3a, and their states), and the Forecaster's view of a holding on the market side.",
     ["Web v4 · Projection.dc.html", "iPhone v4 · Projection.dc.html", "Web v4 · Budget forecast.dc.html",
      "iPhone v4 · Budget forecast.dc.html", "Web v4 · Plans in the chat.dc.html", "iPhone v4 · Plans in the chat.dc.html",
      "Web v4 · Plans tab.dc.html", "iPhone v4 · Plans tab.dc.html", "Web v4 · Budget forecast 1a states.dc.html",
      "iPhone v4 · Budget forecast 1a states.dc.html", "Web v4 · Plans in the chat 2a states.dc.html",
      "iPhone v4 · Plans in the chat 2a states.dc.html", "Web v4 · Plans tab 3a states.dc.html",
      "iPhone v4 · Plans tab 3a states.dc.html", "Forecast.dc.html"]),
    ("audit", "Activity, Audit and files",
     "What the agent did and what it cost, every change with who and when, and the file behind it.",
     ["iPhone audit and activity.dc.html", "Audit and files.dc.html"]),
    ("admin", "The Admin center",
     "The owner's controls, behind the second check: people and their devices, the Claude and AWS caps, alerts and replay.",
     ["Admin center 2.dc.html", "Admin center 3.dc.html", "iPhone admin.dc.html"]),
    ("system", "The design system, the mark and the iOS kit",
     "Warm ledger (MA-101): the tokens, the components, the chart style, the mark (MA-103), the iOS kit on Liquid Glass (MA-161) and the options for a colourful icon for each kind of holding, asset and debt (MA-241). The Telegram kit is kept as the record MA-161 superseded.",
     ["Foundations.dc.html", "Components.dc.html", "Components 2.dc.html", "MyPaisa DS v1.dc.html", "iOS kit.dc.html",
      "Logo.dc.html", "Kind icons.dc.html", "Telegram kit.dc.html", "Telegram kit controls.dc.html", "Telegram kit images.dc.html"]),
]
SUPERSEDED_FILES = {"Telegram kit.dc.html", "Telegram kit controls.dc.html", "Telegram kit images.dc.html"}
DOORS = [  # (key, heading, test on the board name and project)
    ("web", "Web app: desktop", lambda b, p: b.startswith("Browser · ") and not b.endswith(", phone")),
    ("phone", "Web app: phone (390)", lambda b, p: b.startswith("Browser · ") and b.endswith(", phone")),
    ("iphone", "iOS app: iPhone", lambda b, p: b.startswith("iPhone · ")),
    ("ipad", "iOS app: iPad and foldable", lambda b, p: b.startswith(("iPad · ", "Foldable · "))),
    ("web", "Web app: desktop", lambda b, p: p == "app"),
    ("iphone", "iOS app: iPhone", lambda b, p: p == "ios"),
    ("system", "Design system", lambda b, p: True),
]
DOOR_NAMES = {"web": "Web app: desktop", "phone": "Web app: phone (390)", "iphone": "iOS app: iPhone",
              "ipad": "iOS app: iPad and foldable", "system": "Design system"}
SHEET_MAX = 16  # boards in one phase preview; a screen area's file takes up to FILE_SHEET_MAX
FILE_SHEET_MAX = 24
PLATFORMS = {"web": ("web", "phone"), "ios": ("iphone", "ipad"), "system": ("system",)}
PLATFORM_NAMES = {"web": "The web app", "ios": "The iOS app", "system": "The design system"}
LAYOUT = "sheet-v1"  # bump to recompose every preview
DECISIONS = ["MA-193", "MA-161", "MA-156", "MA-102", "MA-103", "MA-101"]
# The parts of a decision record copied to Confluence: the request, the options, the boards and the pick.
DECISION_PARTS = ("The request", "What changes, in one table", "Where the designs are", "The boards", "The options",
                  "Three shells", "The Admin center: two options", "Decisions", "Points to settle", "Open questions", "The pick")
STATUS_COLOUR = {"Done": "green", "In Review": "blue", "In Progress": "yellow", "To Do": "neutral"}
DESIGN_COLOUR = {"picked": "green", "planned": "blue", "todo": "red", "none": "neutral"}


# ---------- small helpers ----------

def load(path: Path) -> dict:
    return json.loads(path.read_text())


def esc(s: object) -> str:
    return html.escape(str(s), quote=True)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def key_n(k: str) -> int:
    return int(k.split("-")[1])


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:70]


def jira(key: str) -> str:
    return f'<a href="{JIRA}/browse/{key}" data-card-appearance="inline"></a>'


def jira_text(key: str) -> str:
    return f'<a href="{JIRA}/browse/{key}">{key}</a>'


def lozenge(text: str, colour: str) -> str:
    return f'<span data-type="status" data-color="{colour}">{esc(text)}</span>'


def date(iso: str | None) -> str:
    return f'<time datetime="{iso}">{roadmap.fmt(iso)}</time>' if iso else ""


def design_url(trace: dict, project: str, file: str) -> str:
    pid = trace["claude_design"][project]["id"]
    return DESIGN.format(id=pid, file=urllib.parse.quote_plus(file))


def gh(path: str) -> str:
    return GITHUB + urllib.parse.quote(path)


def gh_anchor(heading: str) -> str:
    """GitHub's anchor for a markdown heading."""
    h = re.sub(r"[^\w\- ]", "", heading.strip().lower())
    return h.replace(" ", "-")


def arch_link(sec: str, sections: dict[str, str]) -> str:
    head = sections.get(sec)
    if not head:
        return esc(f"§{sec}")
    return f'<a href="{gh("ARCHITECTURE.md")}#{gh_anchor(head)}">§{esc(sec)}</a>'


def arch_sections() -> dict[str, str]:
    out = {}
    for line in (ROOT / "ARCHITECTURE.md").read_text().splitlines():
        if m := re.match(r"^#{2,4} (\d+(?:\.\d+)*)\.? (.*)$", line):
            out[m.group(1)] = line.lstrip("#").strip()
    return out


GUARDRAILS = ("23", "Guardrails and evals")  # the ARCHITECTURE section the guardrails page shows, and its title (MA-245)


def arch_text(num: str) -> tuple[str, str]:
    """ARCHITECTURE.md's top-level section NUM: its heading's title and its body, up to the next top-level heading
    (any `#` or `##` heading outside a code fence, numbered or not). ("", "") when there is no such section."""
    lines = (ROOT / "ARCHITECTURE.md").read_text().splitlines()
    start = next((k for k, line in enumerate(lines) if re.match(rf"^## {re.escape(num)}\.? ", line)), None)
    if start is None:
        return "", ""
    body, fenced = [], False
    for line in lines[start + 1:]:
        if line.startswith("```"):
            fenced = not fenced
        elif not fenced and re.match(r"^#{1,2} ", line):
            break
        body.append(line)
    title = re.sub(rf"^## {re.escape(num)}\.? ", "", lines[start]).strip()
    return title, "\n".join(body).strip().rstrip("-").strip()


def guardrails_errors(ctx: "Ctx") -> list[str]:
    """The guardrails page fails closed: its section must be there, be the guardrails section, have a body, and be cited."""
    num, want = GUARDRAILS
    title, body = arch_text(num)
    if not title:
        return [f"confluence: guardrails page: ARCHITECTURE.md has no section {num}"]
    out = []
    if not title.startswith(want):
        out.append(f"confluence: guardrails page: ARCHITECTURE §{num} is not {want!r} (it reads {title[:60]!r})")
    if not re.search(rf"(?m)^### {re.escape(num)}\.1 ", body):
        out.append(f"confluence: guardrails page: ARCHITECTURE §{num} has no body (no §{num}.1)")
    if not any(a == num or a.startswith(num + ".") for i in ctx.items for a in i.get("arch") or []):
        out.append(f"confluence: guardrails page: no story in the trace cites §{num}")
    return out


def plan_sections() -> dict[int, str]:
    """PLAN.md's phase sections, without their heading, by phase number."""
    text, out = PLAN.read_text(), {}
    for part in re.split(r"(?m)^## ", text)[1:]:
        if m := re.match(r"Phase (\d+)\b", part):
            body = part.split("\n", 1)[1] if "\n" in part else ""
            out[int(m.group(1))] = body.split("\n---")[0].strip()
    return out


# ---------- a small markdown reader, for PLAN.md and the decision records ----------

def inline(s: str) -> str:
    codes: list[str] = []

    def keep(m: re.Match) -> str:
        codes.append(f"<code>{esc(m.group(1))}</code>")
        return f"\x00{len(codes) - 1}\x00"

    s = re.sub(r"`([^`]+)`", keep, s)
    s = esc(s)
    s = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", lambda m: f'<a href="{esc(gh(m.group(2)))}">{m.group(1) or "image"}</a>', s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{m.group(2) if m.group(2).startswith("http") else esc(gh(m.group(2)))}">{m.group(1)}</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], s)


def md(text: str, shift: int = 1) -> str:
    """Markdown to Confluence HTML: headings, paragraphs, nested lists, tables, quotes and code blocks."""
    lines, out, i = text.splitlines(), [], 0

    def para(buf: list[str]) -> None:
        if buf:
            out.append(f"<p>{inline(' '.join(x.strip() for x in buf))}</p>")
            buf.clear()

    buf: list[str] = []
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            para(buf)
            j = i + 1
            while j < len(lines) and not lines[j].startswith("```"):
                j += 1
            out.append(f"<pre><code>{esc(chr(10).join(lines[i + 1:j]))}</code></pre>")
            i = j + 1
            continue
        if m := re.match(r"^(#{1,6}) (.*)$", line):
            para(buf)
            n = min(6, len(m.group(1)) + shift)
            out.append(f"<h{n}>{inline(m.group(2))}</h{n}>")
        elif re.match(r"^\s*---+\s*$", line):
            para(buf)
        elif line.startswith("|"):
            para(buf)
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], [r for r in rows[1:] if not all(re.match(r"^:?-+:?$", c) for c in r)]
            t = "<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
            t += "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(t + "</tbody></table>")
            continue
        elif line.startswith(">"):
            para(buf)
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(lines[i][1:].strip())
                i += 1
            paras = [p for p in "\n".join(q).split("\n\n") if p.strip()]
            out.append("<blockquote>" + "".join(f"<p>{inline(' '.join(p.split()))}</p>" for p in paras) + "</blockquote>")
            continue
        elif re.match(r"^\s*(?:[-*]|\d+\.) ", line):
            para(buf)
            j = i
            while j < len(lines) and (re.match(r"^\s*(?:[-*]|\d+\.) ", lines[j]) or (lines[j].startswith("  ") and lines[j].strip())):
                j += 1
            out.append(md_list(lines[i:j]))
            i = j
            continue
        elif not line.strip():
            para(buf)
        else:
            buf.append(line)
        i += 1
    para(buf)
    return "".join(out)


def md_list(lines: list[str]) -> str:
    items: list[tuple[int, bool, list[str]]] = []  # (indent, ordered, text lines)
    for line in lines:
        if m := re.match(r"^(\s*)([-*]|\d+\.) (.*)$", line):
            items.append((len(m.group(1)), m.group(2)[0].isdigit(), [m.group(3)]))
        elif items:
            items[-1][2].append(line.strip())

    def build(start: int, indent: int) -> tuple[str, int]:
        ordered = items[start][1]
        tag = "ol" if ordered else "ul"
        parts, k = [], start
        while k < len(items) and items[k][0] >= indent:
            if items[k][0] > indent:
                sub, k = build(k, items[k][0])
                parts[-1] = parts[-1][:-5] + sub + "</li>"
                continue
            parts.append(f"<li>{inline(' '.join(items[k][2]))}</li>")
            k += 1
        return f"<{tag}>" + "".join(parts) + f"</{tag}>", k

    html_out, k = "", 0
    while k < len(items):
        block, k = build(k, items[k][0])
        html_out += block
    return html_out


# ---------- the model ----------

class Ctx:
    def __init__(self) -> None:
        self.trace = load(TRACE)
        self.rm = load(roadmap.ROADMAP)
        self.mirror = load(MIRROR)
        self.manifest = load(MANIFEST) if MANIFEST.exists() else {"pages": {}, "images": {}}
        self.sections = arch_sections()
        self.plan = plan_sections()
        self.items = self.trace["items"]
        self.by_key = {i["key"]: i for i in self.items}
        self.phases = sorted(self.trace["phases"], key=lambda p: p["phase"])
        self.schedule = self.rm.get("schedule", {})
        self.file_area = {f: a[0] for a in AREAS for f in a[3]}
        self.cites: dict[tuple[str, str, str], list[dict]] = {}
        for it in self.items + self.trace.get("others", []):
            for b in it.get("boards") or []:
                self.cites.setdefault((b["project"], b["file"], b["board"]), []).append(it)

    def page_url(self, slug_: str) -> str | None:
        pid = self.manifest.get("pages", {}).get(slug_, {}).get("id")
        return f"{JIRA}/wiki/spaces/{self.manifest.get('space', {}).get('key', 'mypaisaaag')}/pages/{pid}" if pid else None

    def link(self, slug_: str, text: str) -> str:
        url = self.page_url(slug_)
        return f'<a href="{url}">{esc(text)}</a>' if url else esc(text)

    def file_sha(self, project: str, file: str) -> str:
        return self.mirror.get(project, {}).get("files", {}).get(file, {}).get("sha256", "")


def door_of(board: str, project: str) -> str:
    for key, _, test in DOORS:
        if test(board, project):
            return key
    return "system"


def board_state(ctx: Ctx, ref: tuple[str, str, str]) -> str:
    if ref[1] in SUPERSEDED_FILES:
        return "superseded"
    states = {i.get("design") for i in ctx.cites.get(ref, [])}
    return "picked" if "picked" in states else "planned" if "planned" in states else "drawn"


def phase_slug(n: int) -> str:
    return f"phase-{n:02d}"


def pages(ctx: Ctx) -> list[tuple[str, str, str | None]]:
    """Every page: (slug, title, parent slug), parents first."""
    out = [("home", "mypaisaa-agent", None),
           ("hub", "MyPaisa: the build plan", "home"),
           ("roadmap", "Roadmap: the journey from phase 0 to phase 20", "hub"),
           ("phases", "The phases, one page each", "hub")]
    out += [(phase_slug(p["phase"]), f"Phase {p['phase']} · {p['title']}", "phases") for p in ctx.phases]
    out.append(("screens", "Screens, area by area", "hub"))
    out += [(f"screens-{a[0]}", f"Screens · {a[1]}", "screens") for a in AREAS]
    out += [("decisions", "Design decisions and the UX choices kept", "hub"),
            ("guardrails", "Guardrails and evals: how the agents are guarded and tested", "hub"),
            ("stack", "Tech stack, FastAPI, DynamoDB, agents and end-to-end observability", "hub"),
            ("cicd", "CI/CD, vulnerability scanning, smoke and regression architecture", "hub"),
            ("maestro", "Local iOS and iPadOS Maestro testing and private TestFlight beta plan", "hub"),
            ("explainers", "Explainers, the prototype and the architecture drawings", "hub"),
            ("sync", "How the plan, Jira, the designs, Confluence and the code stay in step", "hub")]
    import confluence_record  # noqa: PLC0415  (the architecture and journeys record, MA-257)
    out += confluence_record.pages()
    return out


# ---------- the board previews ----------

def phase_sheets(ctx: Ctx, n: int) -> list[tuple[str, str, list[tuple[str, str, str]]]]:
    """A phase's preview images, one per platform (the web app, the iOS app, the design system): each story's first
    board there (a desktop board before a phone one, an iPhone board before an iPad one), SHEET_MAX to an image."""
    picks: dict[str, list[tuple[str, str, str]]] = {k: [] for k in PLATFORMS}
    for it in sorted((i for i in ctx.items if i.get("phase") == n), key=lambda i: key_n(i["key"])):
        boards = [(b["project"], b["file"], b["board"]) for b in it.get("boards") or []]
        for plat, doors in PLATFORMS.items():
            for d in doors:
                ref = next((r for r in boards if door_of(r[2], r[0]) == d), None)
                if ref:
                    if ref not in picks[plat]:
                        picks[plat].append(ref)
                    break
    out = []
    for plat, refs in picks.items():
        for k in range(0, len(refs), SHEET_MAX):
            suffix = f"-{k // SHEET_MAX + 1}" if len(refs) > SHEET_MAX else ""
            out.append((f"{phase_slug(n)}-{plat}{suffix}.jpg", plat, refs[k:k + SHEET_MAX]))
    return out


def file_sheets(ctx: Ctx, area: str) -> list[tuple[str, str, list[tuple[str, str, str]]]]:
    out = []
    for f in next(a for a in AREAS if a[0] == area)[3]:
        boards = sorted({ref for ref in ctx.cites if ref[1] == f}, key=lambda r: (list(DOOR_NAMES).index(door_of(r[2], r[0])), r[2]))
        for k in range(0, len(boards), FILE_SHEET_MAX):
            part = boards[k:k + FILE_SHEET_MAX]
            suffix = f"-{k // FILE_SHEET_MAX + 1}" if len(boards) > FILE_SHEET_MAX else ""
            out.append((f"screens-{area}-{slug(f.removesuffix('.dc.html'))}{suffix}.jpg", f, part))
    return out


def lucid_images() -> list[tuple[str, Path]]:
    return [(f"lucid-{png}", ROOT / "docs" / "design" / "lucid" / png) for png, *_ in LUCID]


def wanted_images(ctx: Ctx) -> dict[str, dict]:
    """Every image a page shows: its page, and the source hash that says when it must be redrawn."""
    out: dict[str, dict] = {}
    for p in ctx.phases:
        for name, _, boards in phase_sheets(ctx, p["phase"]):
            out[name] = {"page": phase_slug(p["phase"]), "boards": boards}
    for a in AREAS:
        for name, _, boards in file_sheets(ctx, a[0]):
            out[name] = {"page": f"screens-{a[0]}", "boards": boards}
    for name, path in lucid_images():
        out[name] = {"page": "explainers", "file": path}
    for gif, _, _ in GUARDRAILS_GIFS:
        out[f"guardrails-{gif}"] = {"page": "guardrails", "file": ROOT / "docs" / "design" / "guardrails-evals" / gif}
    for gif, _, _ in STACK_GIFS:
        out[f"stack-{gif}"] = {"page": "stack", "file": ROOT / "docs" / "design" / "tech-stack-observability" / gif}
    for gif, _, _ in CICD_GIFS:
        out[f"cicd-{gif}"] = {"page": "cicd", "file": ROOT / "docs" / "design" / "cicd-security-regression" / gif}
    for gif, _, _ in MAESTRO_GIFS:
        out[f"maestro-{gif}"] = {"page": "maestro", "file": ROOT / "docs" / "design" / "maestro-ios-ipados-testing" / gif}
    import confluence_record  # noqa: PLC0415
    record = confluence_record.wanted_images(ctx)  # their sources are worked out there: a capture's recipe and its page
    # the pictures draw each phase's title and dates only, so an estimate that moves no date redraws nothing
    drawn = {n: {k: v.get(k) for k in ("title", "start", "end", "on_demand")} for n, v in ctx.schedule.items()}
    out["roadmap.png"] = {"page": "hub", "schedule": drawn}
    out["journey.png"] = {"page": "roadmap", "schedule": drawn}
    for name, w in out.items():
        if "boards" in w:
            src = [LAYOUT] + [[p, f, b, ctx.file_sha(p, f), board_state(ctx, (p, f, b))] for p, f, b in w["boards"]]
        elif "file" in w:
            src = [hashlib.sha256(w["file"].read_bytes()).hexdigest() if w["file"].exists() else "missing"]
        else:
            src = [LAYOUT, w["schedule"]]
        w["source"] = sha(json.dumps(src, sort_keys=True, ensure_ascii=False))
    out.update(record)
    return out


def image(ctx: Ctx, name: str, caption: str = "", width: int = 100) -> str:
    rec = ctx.manifest.get("images", {}).get(name, {})
    if not rec.get("media"):
        return f'<div data-type="panel-note"><p>Preview <code>{esc(name)}</code> is still to upload.</p></div>'
    cap = f"<figcaption>{esc(caption)}</figcaption>" if caption else ""
    return (f'<figure data-type="media-single" data-layout="center" data-width="{width}" data-width-type="percentage">'
            f'<div data-type="media" data-media-type="file" data-id="{esc(rec["media"])}" data-collection="{esc(rec["collection"])}" '
            f'data-alt="{esc(name)}"></div>{cap}</figure>')


# ---------- the interactive parts: two Maui apps and the story database ----------

# Every design pick, for the flip cards on the decisions page; each fact is from its decision record or the trace.
DECISION_CARDS = [
    ("MA-193", "26 Oct 2026", "The web app's shell, with the chat", ["1a Chat beside", "1b Chat first", "1c Ask bar"], "1a Chat beside",
     "It is the iPad's 1a at the laptop: a Confirm in the chat column moves the page beside it, and at 390 it uses the iPhone's tab bar."),
    ("MA-193", "26 Oct 2026", "The dashboard (the Overview)", ["1a Net worth first", "1b Two countries", "1c What's next"], "1a Net worth first",
     "It reads the same at every width: the total, what it is made of, what is due. Each country keeps its own currency inside one card."),
    ("MA-193", "26 Oct 2026", "The check-in card", ["1a Chips in one row", "1b Paid as the Confirm", "1c A compact row"], "1b Paid as the Confirm",
     "Paid looks like every other Confirm button, and \"Paid off in full\", which closes a loan, cannot be hit by accident."),
    ("MA-193", "26 Oct 2026", "The Projection", ["1a The fan first", "1b A story first", "1c Decades"], "1a The fan first",
     "It is the screen ARCHITECTURE 6.6 lists: the fan, milestones on the line, assumptions with sources, scenario chips and Ask."),
    ("MA-197", "26 Oct 2026", "Does approving a new kind of record need the second check?", ["Yes, the second check", "No"], "Yes, the second check",
     "A new kind changes what every member can register, so the admin approves it behind the second check."),
    ("MA-76", "26 Oct 2026", "When does the second check arrive?", ["Phase 1, with sign-in", "Phase 8, with the Admin center"], "Phase 1, with sign-in",
     "It comes with sign-in, so approving a new kind can sit behind it from phase 2."),
    ("MA-161", "26 Oct 2026", "The iOS app's shell", ["1a Chat first", "1b Ask from anywhere", "1c One timeline"], "1a Chat first",
     "The chat is the front door and the figures are one swipe away; every change starts where it is made."),
    ("MA-156", "25 Oct 2026", "Money typed in another currency", ["1a Four ways on", "1b Ask again, in pounds", "1c Correct inside Confirm"],
     "1b Ask again, in pounds", "One pattern, not a new card: the guided flow's own amount question, asked again in the holding's currency."),
    ("MA-102", "24 Oct 2026", "The Admin center", ["A People first", "B Sessions first"], "A People first",
     "Signing out, pausing and unlinking all act on a person, so the person comes first."),
    ("MA-103", "24 Oct 2026", "MyPaisa's mark", ["1a Stance line", "1b Ruled pound", "1c Watcher"], "1c Watcher",
     "Today's coin and £ with a thin orbit and one coral dot that comes to rest at half past one: the agent keeping watch."),
    ("MA-101", "24 Oct 2026", "The design system", ["1a Warm ledger", "1b Native clarity", "1c Pot wall"], "1a Warm ledger",
     "Monzo's warmth on Apple's bones: the summary reads in one glance, with one coral accent on a navy hero card."),
]
APP_PAGE = {"roadmap-gantt": "roadmap", "decision-cards": "decisions"}


def app_prompt(ctx: Ctx, name: str) -> str:
    """The self-contained prompt each Maui app is generated from; its hash says when the app must be made again."""
    if name == "roadmap-gantt":
        lines, prev = [], None
        for p in ctx.phases:
            r = ctx.schedule.get(str(p["phase"]), {})
            if r.get("on_demand"):
                continue
            dep = f"; starts after Phase {prev} ends" if prev is not None else ""
            lines.append(f"- Phase {p['phase']} · {p['title']} | start {r['start']} | end {r['end']} | group: {group(p['phase'])[1]} "
                         f"| epic {p['epic']} | {r['lane_days']:g} build days{dep}")
            prev = p["phase"]
        miles = "\n".join(f"- {ctx.schedule[str(n)]['end']}: {what}" for n, what in (
            (0, "Empty shells at every door"), (2, "The first record, moving live"), (4, "Debts kept by check-ins"),
            (7, "The Projection"), (9, "The whole wealth on prod; the old tracker retired"), (15, "Stances go live"), (20, "The app beyond the chat")))
        return ("Make an interactive Gantt chart of MyPaisa's build roadmap. Do not show any visible title on the app or the chart.\n"
                "One task per phase, in this order, with exactly these labels, dates and groups; each phase starts after the one before it ends. "
                "Colour the bars by group (three groups: Foundations and talk, The whole wealth, The market side) with a legend. On hover, show the epic "
                "key, the build days and the dates. Keep the axis in months.\n" + "\n".join(lines) +
                "\nMilestones (diamonds on their date, with these labels):\n" + miles +
                "\nPhase 16 (New kinds of holding) is built on demand and has no dates; leave it out.")
    if name == "decision-cards":
        cards = "\n".join(f"- Front: {q} ({k}, {d}). Back: options: {'; '.join(o)}. Picked: {pick}. Why: {why}"
                          for k, d, q, o, pick, why in DECISION_CARDS)
        return ("Make flip cards, one per design decision below, in this order. Do not show any visible title on the app. The front of each card "
                "shows the question and, smaller, the Jira key and the date. The back lists the options, marks the picked one clearly, and gives "
                "the reason in one line. Keep every label and word as given.\n" + cards)
    raise KeyError(name)


def decision_cards() -> str:
    """Every pick as a card that opens on a click: the question on the front, the options with the pick marked and the reason inside."""
    cards = []
    for k, d, q, opts, pick, why in DECISION_CARDS:
        body = ("<ul>" + "".join(f"<li>{'✅ <strong>' + esc(o) + '</strong>' if o == pick else '▫️ ' + esc(o)}</li>" for o in opts) + "</ul>"
                + f'<div data-type="panel-custom" data-icon=":white_check_mark:" data-color="#E3FCEF"><p><strong>Picked: {esc(pick)}.</strong> {esc(why)}</p></div>'
                + f'<p style="font-size: 14px">{jira_text(k)} · {esc(d)}</p>')
        cards.append(f"<details><summary>🎯 {esc(q)}</summary>{body}</details>")
    rows = [cards[k:k + 3] for k in range(0, len(cards), 3)]
    return "".join('<section data-type="layout-three-equal">' + "".join(f'<div data-type="column">{c}</div>' for c in r + ["<p></p>"] * (3 - len(r)))
                   + "</section>" for r in rows)


def app_source(ctx: Ctx, name: str) -> str:
    return sha(app_prompt(ctx, name))


def app_embed(ctx: Ctx, name: str, height: int) -> str:
    rec = ctx.manifest.get("apps", {}).get(name, {})
    if not rec.get("url"):
        return ""
    params = {"macroParams": {"width": {"value": "1000"}, "alignment": {"value": "center"}, "url": {"value": rec["url"]},
                              "alwaysShowTitle": {"value": "false"}, "height": {"value": str(height)}},
              "macroMetadata": {"schemaVersion": {"value": "1"}, "title": "native-embed:maui"}}
    return (f'<div data-type="extension" data-extension-key="native-embed:maui" data-extension-type="com.atlassian.confluence.macro.core" '
            f"data-layout=\"default\" data-parameters='{esc(json.dumps(params))}'></div>")


DATABASES = {"stories": ("Story explorer: every story, filterable", "hub")}


def csv_cell(v: object) -> str:
    v = "" if v is None else str(v)
    if v == "":
        return '""'
    return '"' + v.replace('"', '""') + '"' if any(c in v for c in ',"\n') else v


def stories_csv(ctx: Ctx) -> str:
    """The story explorer, as the CSV Confluence builds a database from: fields, views, then one row per story."""
    door_tag = {"web": "Web desktop", "phone": "Web phone", "iphone": "iPhone", "ipad": "iPad", "system": "Design system"}
    design_tag = {"picked": "Picked", "planned": "Planned", "todo": "To draw", "none": "No screens"}
    fields = [("Story", "jira-work-item", f"cloud_id:{CLOUD_ID}"), ("What it delivers", "text", ""), ("Phase", "tag", ""),
              ("Group", "tag", ""), ("Type", "tag", ""), ("Status", "tag", ""), ("Design", "tag", ""), ("Doors", "tag", ""),
              ("Est days", "number", "number_format:number"), ("Boards", "number", "number_format:number"),
              ("Phase ends", "date", ""), ("Phase page", "confluence-page-link", "")]
    views = [("All stories", "table", "", "", ""), ("By phase", "board:Phase", "", "", ""),
             ("By design state", "board:Design", "", "", ""), ("Still to do", "table", "['Status' is not 'Done']", "", "")]
    out = ["<fields>", "field_name,type,configuration"]
    out += [f"{f[0]},{f[1]}," + (f'"{f[2]}"' if f[2] else "") for f in fields]  # a field's configuration: quoted, or an empty cell
    out += ["</fields>", "<views>", "view_name,layout,filters,sorts,hidden_fields"]
    out += [",".join([csv_cell(v[0]), csv_cell(v[1])] + [f'"{x}"' for x in v[2:]]) for v in views]
    out += ["</views>", "<data>", ",".join(f[0] for f in fields)]
    for p in ctx.phases:
        r = ctx.schedule.get(str(p["phase"]), {})
        for it in sorted((i for i in ctx.items if i.get("phase") == p["phase"]), key=lambda i: key_n(i["key"])):
            doors = sorted({door_of(b["board"], b["project"]) for b in it.get("boards") or []}, key=list(DOOR_NAMES).index)
            tags = [door_tag[d] for d in doors] or (["Still to draw"] if it.get("ui") else (["Back end"] if "manual" not in (it.get("labels") or []) else ["Yours"]))
            row = [f"{JIRA}/browse/{it['key']}", it["summary"], f"Phase {p['phase']}", group(p["phase"])[1], it["type"],
                   it.get("status", ""), design_tag.get(it.get("design", "none"), "No screens"), "|".join(tags),
                   f"{ctx.rm['estimates'].get(it['key'], 0):g}", len(it.get("boards") or []), r.get("end") or "",
                   ctx.page_url(phase_slug(p["phase"])) or ""]
            out.append(",".join(csv_cell(x) for x in row))
    out.append("</data>")
    return "\n".join(out) + "\n"


def database_url(ctx: Ctx, name: str) -> str | None:
    did = ctx.manifest.get("databases", {}).get(name, {}).get("id")
    return f"{JIRA}/wiki/spaces/{ctx.manifest.get('space', {}).get('key', 'mypaisaaag')}/database/{did}" if did else None


def explorer_link(ctx: Ctx) -> str:
    url = database_url(ctx, "stories")
    return f'<a href="{url}">the story explorer</a>' if url else "the story explorer"


# ---------- page parts ----------

GROUPS = [  # (phases, name, panel colour, cell colour, emoji shortname)
    (range(0, 2), "Foundations and talk", "#EAE6FF", "#EAE6FF", ":bricks:"),
    (range(2, 10), "The whole wealth", "#E3FCEF", "#E3FCEF", ":moneybag:"),
    (range(10, 21), "The market side", "#DEEBFF", "#DEEBFF", ":chart_with_upwards_trend:"),
]
PHASE_EMOJI = ["🧱", "💬", "🗂️", "🏦", "🧾", "📈", "🧮", "🔭", "🛡️", "🏠", "⚙️", "📰", "❓", "🎯", "🗞️", "🚦", "🧩", "🔮", "🤖", "🇮🇳", "📱"]
STATUS_CELL = {"Done": "#E3FCEF", "In Review": "#DEEBFF", "In Progress": "#FFFAE6"}
DESIGN_CELL = {"picked": "#E3FCEF", "planned": "#DEEBFF", "todo": "#FFEBE6"}


def group(n: int) -> tuple:
    return next(g for g in GROUPS if n in g[0])


def emoji(n: int) -> str:
    return PHASE_EMOJI[n] if 0 <= n < len(PHASE_EMOJI) else "•"


def cpanel(colour: str, icon: str, body: str) -> str:
    return f'<div data-type="panel-custom" data-icon="{icon}" data-color="{colour}">{body}</div>'


def tabs(parts: list[tuple[str, str]]) -> str:
    """Confluence's native tabs: (title, body) each; a body holds blocks, tables and macros, never an expand."""
    meta = {"tabs": [{"id": f"tab{k + 1}", "title": t} for k, (t, _) in enumerate(parts)]}
    frames = "".join(f'<div data-type="extension-frame">{b}</div>' for _, b in parts)
    return (f'<div data-type="multi-bodied-extension" data-extension-key="native-tabs" data-extension-type="com.atlassian.confluence.native" '
            f"data-parameters='{esc(json.dumps(meta))}'>{frames}</div>")


def toc() -> str:
    return ('<div data-type="extension" data-extension-key="toc" data-extension-type="com.atlassian.confluence.macro.core" '
            "data-parameters='{\"macroParams\":{\"maxLevel\":{\"value\":\"2\"}},\"macroMetadata\":{\"schemaVersion\":{\"value\":\"1\"},\"title\":\"Table of Contents\"}}'></div>")


def status_of(items: list[dict]) -> tuple[str, str]:
    live = [i for i in items if (i.get("status") != "Done")]
    if not items or not live:
        return ("Done", "green") if items else ("No stories", "neutral")
    if any(i.get("status") in ("In Progress", "In Review") for i in items) or any(i.get("status") == "Done" for i in items):
        return ("In progress", "yellow")
    return ("Not started", "neutral")


def jira_macro(jql: str) -> str:
    params = {"macroParams": {"jqlQuery": {"value": jql}, "showSummary": {"value": "true"}},
              "macroMetadata": {"schemaVersion": {"value": "1"}, "title": "Jira"}}
    return (f'<div data-type="extension" data-extension-key="jira" data-extension-type="com.atlassian.confluence.macro.core" '
            f"data-layout=\"wide\" data-parameters='{esc(json.dumps(params))}'></div>")


def jql_link(jql: str, text: str) -> str:
    return f'<a href="{JIRA}/issues/?jql={urllib.parse.quote(jql)}">{esc(text)}</a>'


def footer(ctx: Ctx) -> str:
    return ('<hr><p style="font-size: 14px"><em>Generated from the repo by scripts/confluence_docs.py (MA-228) from docs/trace.json, '
            "PLAN.md, docs/roadmap.json, the design decision records and the Claude Design mirror. Change those, not this page: "
            "/plan-sync copies an edit made here back to the repo, or the next publish overwrites it.</em></p>")


def cell(text: str, colour: str | None) -> str:
    return f'<td data-background="{colour}">{text}</td>' if colour else f"<td>{text}</td>"


def story_rows(ctx: Ctx, items: list[dict]) -> str:
    rows = ['<table data-layout="full-width"><thead><tr><th>Story</th><th>What it delivers</th><th>Type</th><th>Days</th>'
            "<th>Status</th><th>Design</th><th>Boards</th><th>Architecture</th></tr></thead><tbody>"]
    for it in items:
        est = ctx.rm["estimates"].get(it["key"], 0)
        who = " (yours)" if "manual" in (it.get("labels") or []) else ""
        st, dz = it.get("status", ""), it.get("design", "none")
        arch = ", ".join(f"§{esc(a)}" for a in it.get("arch") or [])
        rows.append(f"<tr><td>{jira(it['key'])}</td><td>{esc(it['summary'])}</td><td>{esc(it['type'])}{who}</td><td>{est:g}</td>"
                    + cell(lozenge(st, STATUS_COLOUR.get(st, "neutral")), STATUS_CELL.get(st))
                    + cell(lozenge(dz, DESIGN_COLOUR.get(dz, "neutral")), DESIGN_CELL.get(dz))
                    + f"<td>{len(it.get('boards') or []) or ''}</td><td>{arch}</td></tr>")
    return "".join(rows) + "</tbody></table>"


def arch_used(ctx: Ctx, items: list[dict]) -> str:
    secs = sorted({a for i in items for a in i.get("arch") or []}, key=lambda s: [int(x) for x in s.split(".")])
    if not secs:
        return "<p>No architecture sections are cited.</p>"
    return "<ul>" + "".join(f"<li>{arch_link(s, ctx.sections)} {esc(ctx.sections.get(s, '').split(' ', 1)[-1])}</li>" for s in secs) + "</ul>"


def exit_line(ctx: Ctx, n: int) -> str:
    body = ctx.plan.get(n, "")
    m = re.search(r"\*\*Exit:\*\*(.*?)(?:\n\n|$)", body, re.S)
    return " ".join(m.group(1).split()) if m else ""


# ---------- the pages ----------

def render_home(ctx: Ctx) -> str:
    """The space's home page: what the space is, the way in, and Confluence's own search and recent changes."""
    s = ctx.schedule
    return (cpanel("#DEEBFF", ":house:", "<p><strong>MyPaisa's build plan, phase by phase and screen by screen.</strong> One household's whole "
                   "wealth across the UK and India, kept through a chat at every door: the web app and the iOS app.</p>"
                   f"<p>Start at {ctx.link('hub', 'MyPaisa: the build plan')}, or go straight to {ctx.link('roadmap', 'the roadmap')}, "
                   f"{ctx.link('phases', 'the phases')} or {ctx.link('screens', 'the screens')}. Phase 0 starts on {date(ctx.rm['start'])}; "
                   f"the whole wealth is due by {date(s.get('9', {}).get('end'))}.</p>")
            + "<h2>Search this space</h2><p>"
            '<span data-type="inline-extension" data-extension-key="livesearch" data-extension-type="com.atlassian.confluence.macro.core" '
            "data-parameters='{\"macroParams\":{\"spaceKey\":{\"value\":\"currentSpace()\"}},\"macroMetadata\":{\"schemaVersion\":{\"value\":\"1\"},\"title\":\"Live search\"}}'></span></p>"
            "<h2>Recently updated</h2>"
            '<div data-type="extension" data-extension-key="recently-updated" data-extension-type="com.atlassian.confluence.macro.core" '
            "data-parameters='{\"macroParams\":{\"types\":{\"value\":\"page,whiteboard,database\"},\"max\":{\"value\":\"10\"},\"theme\":{\"value\":\"concise\"},\"hideHeading\":{\"value\":\"true\"}},\"macroMetadata\":{\"schemaVersion\":{\"value\":\"1\"},\"title\":\"Recent updates\"}}'></div>"
            + footer(ctx))


def render_hub(ctx: Ctx) -> str:
    s = ctx.schedule
    wealth_end = s.get("9", {}).get("end")
    last = max((v.get("end") for v in s.values() if v.get("end")), default=None)
    total = sum(v["lane_days"] for v in s.values())
    counts: dict[str, int] = {}
    for it in ctx.items:
        counts[it.get("status", "")] = counts.get(it.get("status", ""), 0) + 1
    ui = sum(1 for i in ctx.items if i.get("ui"))
    pid = {k: v["id"] for k, v in ctx.trace["claude_design"].items()}
    out = [
        cpanel("#DEEBFF", ":house:", "<p><strong>MyPaisa</strong> keeps one household's whole wealth across the UK and India, registered and kept "
               "through a chat, with no forms: what the family owns and owes, each member's income and spending, a Projection of where it is "
               "heading, and later a market agent for the investments. Every phase ships at both doors at once: the web app (a SvelteKit 3 "
               "PWA at dashboard.mypaisapp.com, desktop and phone) and the iOS app (a React Native shell with a native SwiftUI core, iPhone "
               "and iPad).</p>"),
        '<section data-type="layout-three-equal">'
        + "".join(f'<div data-type="column">{cpanel(c, i, body)}</div>' for c, i, body in (
            ("#EAE6FF", ":calendar_spiral:", f"<h3>{len(ctx.phases)} phases</h3><p>From {date(ctx.rm['start'])}. The whole wealth by {date(wealth_end)}, "
             f"everything by {date(last)}.</p>"),
            ("#E3FCEF", ":white_check_mark:", f"<h3>{len(ctx.items)} stories</h3><p>"
             + ", ".join(f"{v} {esc(k)}" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])) + f"; {total:g} build days.</p>"),
            ("#FFFAE6", ":art:", f"<h3>{len(ctx.cites)} boards</h3><p>{ui} stories have screens, drawn in Claude Design before anything is built.</p>")))
        + "</section>",
        "<h2>🗺️ The journey</h2>", image(ctx, "roadmap.png", "The phases in build order"),
        f"<p>{ctx.link('roadmap', 'The roadmap')} has each phase's dates, exit demo and your tasks, and how the dates are worked out. "
        f"Every story is in {explorer_link(ctx)}, filterable by phase, door, status and design state.</p>",
        "<h2>🧭 Where to look</h2>",
        '<section data-type="layout-three-equal">'
        + "".join(f'<div data-type="column">{cpanel(c, i, f"<h3>{ctx.link(sl, t)}</h3><p>{esc(d)}</p>")}</div>' for sl, t, d, c, i in (
            ("roadmap", "Roadmap", "When each phase starts and ends, its exit demo, your tasks before it.", "#EAE6FF", ":calendar:"),
            ("phases", "The phases", "One page each: the epic, every story with its estimate, status and design, the screens at each door, the plan as written.", "#E3FCEF", ":books:"),
            ("screens", "Screens", "Every board, area by area, with the stories that build it and the option picked.", "#FFFAE6", ":frame_photo:")))
        + "</section>"
        '<section data-type="layout-three-equal">'
        + "".join(f'<div data-type="column">{cpanel(c, i, f"<h3>{ctx.link(sl, t)}</h3><p>{esc(d)}</p>")}</div>' for sl, t, d, c, i in (
            ("decisions", "Design decisions", "Every design round: the question, the options drawn, the pick and why.", "#FFEBE6", ":dart:"),
            ("explainers", "Explainers", "The Inside MyPaisa, Architecture v4, Agent Journey, Market Agent and Guardrails and Evals pages, the clickable prototype, the architecture drawings.", "#E6FCFF", ":movie_camera:"),
            ("sync", "Staying in step", "How this space, Jira, the boards, the plan and the code are kept the same.", "#F4F5F7", ":link:")))
        + "</section>",
        cpanel("#E3FCEF", ":shield:", f"<h3>{ctx.link('guardrails', 'Guardrails and evals')}</h3><p>How every agent is guarded in code, "
               "tested on every change and never on a calendar, watched live, and how the admin calibrates the judges (MA-245).</p>"),
        cpanel("#DEEBFF", ":hammer_and_wrench:", f"<h3>{ctx.link('stack', 'Tech stack, FastAPI, DynamoDB, agents and end-to-end observability')}</h3><p>"
               "The four-layer implementation stack (SvelteKit 3, TanStack and shadcn-svelte; React Native 0.88 and SwiftUI; Python 3.14, FastAPI and "
               "single-table DynamoDB versus DocumentDB; the agent framework comparison) and end-to-end tracing and LLM observability with monthly costing (MA-265, MA-266).</p>"),
        cpanel("#FFFAE6", ":rocket:", f"<h3>{ctx.link('cicd', 'CI/CD, vulnerability scanning, smoke and regression architecture')}</h3><p>"
               "The GitHub Actions + AWS CodeBuild arm64 + ECR delivery pipeline for dev and prod, the seven-layer vulnerability scanning gate, the "
               "phase-progressive smoke runner with &lt;5s auto-rollback, the five-layer regression pyramid across Phases 0 to 20, and the £0/month Option D runner cost model (MA-267 to MA-272).</p>"),
        cpanel("#EAE6FF", ":iphone:", f"<h3>{ctx.link('maestro', 'Local iOS and iPadOS Maestro testing and private TestFlight beta plan')}</h3><p>"
               "The local Apple Silicon Maestro architecture (cloned simulator pool with flock isolation from interactive MCP), the React Native 0.88 + SwiftUI "
               "selector contract, the four-sub-band iOS and iPadOS adaptive matrix, the phase-by-phase rollout across Phases 0 to 20 at £0/month, and the "
               "100% private 90-day (3-month) evergreen TestFlight household beta plan (MA-167, MA-273, MA-274).</p>"),
        "<h2>🔗 The records behind it</h2><ul>"
        f'<li><strong>Jira</strong>: <a href="{JIRA}/jira/software/projects/MA/boards">project MA</a>, a phase epic per phase; '
        + jql_link("project = MA AND issuetype = Epic ORDER BY duedate", "the epics by due date") + "</li>"
        f'<li><strong>The plan</strong>: <a href="{gh("PLAN.md")}">PLAN.md</a>, <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>, '
        f'<a href="{gh("TECH_STACK.md")}">TECH_STACK.md</a>, <a href="{gh("docs/TRACE.md")}">the trace</a>, <a href="{gh("docs/roadmap.json")}">the estimates</a></li>'
        f'<li><strong>Claude Design</strong>: <a href="https://claude.ai/design/p/{pid["app"]}">MyPaisa app v1</a> (the web app), '
        f'<a href="https://claude.ai/design/p/{pid["ios"]}">MyPaisa iOS v1</a> (iPhone and iPad), <a href="https://claude.ai/design/p/{pid["ds"]}">MyPaisa DS v1</a> (the design system)</li>'
        + "".join(f'<li><strong>{esc(t)}</strong>: <a href="{u}" data-card-appearance="inline"></a></li>' for t, u in ARTIFACTS.items())
        + "</ul>",
        '<h2>📚 Every page</h2><div data-type="extension" data-extension-key="children" data-extension-type="com.atlassian.confluence.macro.core" '
        "data-parameters='{\"macroParams\":{\"all\":{\"value\":\"true\"},\"depth\":{\"value\":\"2\"}},\"macroMetadata\":{\"schemaVersion\":{\"value\":\"2\"},\"title\":\"Children Display\"}}'></div>",
    ]
    return "".join(out) + footer(ctx)


def render_roadmap(ctx: Ctx) -> str:
    s, rm = ctx.schedule, ctx.rm
    out = [
        cpanel("#EAE6FF", ":calendar_spiral:", f'<p>Every story is estimated in build days in <a href="{gh("docs/roadmap.json")}">docs/roadmap.json</a>, '
               "and the dates are worked out from those estimates. PLAN.md's Timeline and each phase epic's due date in Jira show the same dates. "
               "To move a date, change an estimate there and run <code>python3 scripts/roadmap.py write</code>.</p>"),
        toc(), "<h2>🗺️ The journey</h2>", app_embed(ctx, "roadmap-gantt", 680),
        "<details><summary>The same journey as a still picture</summary>" + image(ctx, "journey.png", "The phases in build order, from the roadmap's schedule") + "</details>",
        f"<p>Every story, filterable by phase, door, status and design state: {explorer_link(ctx)}.</p>",
        "<h2>🚩 Milestones</h2><ul data-type=\"decision-list\">",
    ]
    for n, what in ((0, "Empty shells at every door, with the seed household"), (1, "Talking to the agent at three doors, replies streaming"),
                    (2, "The first record registered by chat, moving live"), (4, "Debts kept current by check-ins"),
                    (7, "The Projection, with a what-if"), (9, "The whole wealth on prod; the old tracker retired"),
                    (15, "Stances go live after the shadow weeks"), (20, "The app beyond the chat")):
        out.append(f'<li data-type="decision-item" data-state="DECIDED">{emoji(n)} {date(s.get(str(n), {}).get("end"))}: phase {n}, {esc(what)}</li>')
    out.append("</ul><h2>📅 Phase by phase</h2>"
               '<table data-layout="full-width"><thead><tr><th>Phase</th><th>Epic</th><th>Build days</th><th>Working days</th><th>Starts</th>'
               "<th>Target end</th><th>Exit demo</th></tr></thead><tbody>")
    for p in ctx.phases:
        n, r = p["phase"], s.get(str(p["phase"]), {})
        g = group(n)
        when = (cell(date(r.get("start")), None) + cell(date(r.get("end")), None) if not r.get("on_demand")
                else '<td colspan="2">When a new kind is added</td>')
        out.append("<tr>" + cell(f"{emoji(n)} {ctx.link(phase_slug(n), 'Phase ' + str(n) + ' · ' + p['title'])}", g[3])
                   + f"<td>{jira(p['epic'])}</td><td>{r.get('lane_days', 0):g}</td><td>{r.get('working_days', 0)}</td>{when}"
                   f"<td>{inline(exit_line(ctx, n))}</td></tr>")
    out.append("</tbody></table>")
    out.append("<h2>🧮 How the dates are worked out</h2><ul>"
               "<li><strong>Build days.</strong> A story's estimate covers every door it touches. Claude builds, Arun reviews and tests.</li>"
               f"<li><strong>Buffer.</strong> Each phase adds {rm['buffer']:.0%} for review rounds, the demo and fixes.</li>"
               f"<li><strong>Side by side.</strong> The web app and the iOS app are built in parallel, so a phase's working days are its build days with the buffer, divided by {rm['parallel']:g}.</li>"
               "<li><strong>Days off.</strong> English bank holidays and a Christmas break each year.</li>"
               f"<li><strong>Order.</strong> Build order from {date(rm['start'])}. Phase 15 waits for 8 weeks of shadow stances after phase 10; phase 16 is built when a new kind of holding is added.</li>"
               "<li><strong>Your tasks</strong> (label manual) run beside the build and are due before their phase starts.</li></ul>")
    manual = [i for i in ctx.items if "manual" in (i.get("labels") or []) and i.get("status") != "Done"]
    if manual:
        out.append("<h2>🙋 Your tasks, and when each is needed</h2><table><thead><tr><th>Task</th><th>What</th><th>Needed by</th></tr></thead><tbody>")
        for it in sorted(manual, key=lambda i: (i["phase"], key_n(i["key"]))):
            out.append(f"<tr><td>{jira(it['key'])}</td><td>{esc(it['summary'])}</td>"
                       + cell(f"Phase {it['phase']} starts, {date(s.get(str(it['phase']), {}).get('start'))}", "#FFFAE6") + "</tr>")
        out.append("</tbody></table>")
    out.append("<h2>🔗 In Jira</h2><p>Each phase epic carries its target end as its due date, so Jira's timeline shows the same journey: "
               + jql_link("project = MA AND issuetype = Epic ORDER BY duedate", "the epics by due date") + ".</p>"
               + jira_macro("project = MA AND issuetype = Epic ORDER BY duedate"))
    return "".join(out) + footer(ctx)


def render_phases(ctx: Ctx) -> str:
    out = [cpanel("#E3FCEF", ":books:", "<p>One page per phase, in build order. Each has the phase epic, every story with its estimate, status "
                  "and design state, the screens it builds at each door, the plan as PLAN.md writes it, and the epic live from Jira.</p>"
                  f"<p>To filter every story at once, by phase, door, status or design state, open {explorer_link(ctx)}.</p>")]
    for g in GROUPS:
        out.append(f"<h2>{esc(g[1])}</h2>"
                   '<table data-layout="full-width"><thead><tr><th>Phase</th><th>Status</th><th>Stories</th><th>With screens</th><th>Build days</th>'
                   "<th>Target end</th></tr></thead><tbody>")
        for p in (p for p in ctx.phases if p["phase"] in g[0]):
            items = [i for i in ctx.items if i.get("phase") == p["phase"]]
            st, col = status_of(items)
            r = ctx.schedule.get(str(p["phase"]), {})
            end = date(r.get("end")) if not r.get("on_demand") else "When a new kind is added"
            out.append("<tr>" + cell(f"{emoji(p['phase'])} {ctx.link(phase_slug(p['phase']), 'Phase ' + str(p['phase']) + ' · ' + p['title'])}", g[3])
                       + f"<td>{lozenge(st, col)}</td><td>{len(items)}</td><td>{sum(1 for i in items if i.get('ui'))}</td>"
                       f"<td>{r.get('lane_days', 0):g}</td><td>{end}</td></tr>")
        out.append("</tbody></table>")
    return "".join(out) + footer(ctx)


def render_phase(ctx: Ctx, p: dict) -> str:
    n = p["phase"]
    g = group(n)
    items = sorted((i for i in ctx.items if i.get("phase") == n), key=lambda i: key_n(i["key"]))
    r = ctx.schedule.get(str(n), {})
    st, col = status_of(items)
    when = (f"{date(r.get('start'))} to {date(r.get('end'))}" if not r.get("on_demand") else "built when a new kind is added")
    ui = [i for i in items if i.get("ui")]
    out = [cpanel(g[2], g[4], f"<p><strong>{emoji(n)} {esc(g[1])}</strong> · epic {jira(p['epic'])} · {lozenge(st, col)} · {when}</p>"
                  f"<p>{r.get('lane_days', 0):g} build days, {r.get('working_days', 0)} working days · {len(items)} stories, {len(ui)} with screens</p>")]
    if ex := exit_line(ctx, n):
        out.append(f'<div data-type="panel-success"><p><strong>Exit demo.</strong> {inline(ex)}</p></div>')
    for it in items:
        for q in it.get("open") or []:
            out.append(f'<div data-type="panel-warning"><p>{jira_text(it["key"])}, open question: {inline(q)}</p></div>')
        for u in it.get("undrawn") or []:
            out.append(f'<div data-type="panel-note"><p>{jira_text(it["key"])}, still to draw: {inline(u)}</p></div>')
    doors: dict[str, list[str]] = {}
    for it in items:
        ds = {door_of(b["board"], b["project"]) for b in it.get("boards") or []} or {
            "manual" if "manual" in (it.get("labels") or []) else ("todo" if it.get("ui") else "back")
        }
        for d in ds:
            doors.setdefault(d, []).append(it["key"])
    door_tab = "<table><thead><tr><th>Where</th><th>Stories</th></tr></thead><tbody>" + "".join(
        f"<tr><td>{esc(name)}</td><td>{', '.join(jira_text(k) for k in sorted(set(doors[d]), key=key_n))}</td></tr>"
        for d, name in list(DOOR_NAMES.items()) + [
            ("todo", "Screens still to draw (/design-first)"),
            ("back", "Back end, agent and infrastructure (no screen)"),
            ("manual", "Your tasks"),
        ]
        if doors.get(d)) + "</tbody></table>"
    sheets = phase_sheets(ctx, n)
    screens = ("<p>Each story's first board at each door, as drawn in Claude Design, light and dark. Every board, with its file, is on "
               + ", ".join(ctx.link(f"screens-{a}", t) for a, t in phase_areas(ctx, n)) + ".</p>"
               + "".join(f"<h3>{esc(PLATFORM_NAMES[plat])}</h3>" + image(ctx, name, f"{PLATFORM_NAMES[plat]}: {len(b)} boards") for name, plat, b in sheets)
               if sheets else "<p>This phase has no screens.</p>")
    parts = [("Stories", story_rows(ctx, items)), ("Screens", screens), ("At every door", door_tab)]
    if body := ctx.plan.get(n, ""):
        parts.append(("The plan", md(body, shift=2)))
    parts += [("Architecture", arch_used(ctx, items)),
              ("Live in Jira", jira_macro(f"parent = {p['epic']} ORDER BY key") + f"<p>{jql_link('parent = ' + p['epic'] + ' ORDER BY key', 'Open the epic in Jira')}</p>")]
    out.append(tabs(parts))
    return "".join(out) + footer(ctx)


def phase_areas(ctx: Ctx, n: int) -> list[tuple[str, str]]:
    files = {b["file"] for i in ctx.items if i.get("phase") == n for b in i.get("boards") or []}
    return [(a[0], a[1]) for a in AREAS if files & set(a[3])]


AREA_ICON = {"shell": ":speech_balloon:", "home": ":house:", "register": ":pencil:", "assets": ":bank:", "budget": ":abacus:",
             "projection": ":crystal_ball:", "audit": ":mag:", "admin": ":shield:", "system": ":art:"}


def render_screens(ctx: Ctx) -> str:
    out = [cpanel("#FFFAE6", ":frame_photo:", "<p>Every board a story cites, area by area. A board is <strong>picked</strong> when Arun chose it in a "
                  "design round (it is the spec), <strong>planned</strong> when it is drawn ahead of its story and goes through its own options "
                  "round when the story starts, and <strong>superseded</strong> when a later decision replaced it.</p>"),
           "<table><thead><tr><th>Area</th><th>Files</th><th>Boards</th><th>Picked</th><th>Planned</th></tr></thead><tbody>"]
    for a in AREAS:
        refs = [r for r in ctx.cites if r[1] in a[3]]
        states = [board_state(ctx, r) for r in refs]
        out.append(f"<tr><td>{ctx.link('screens-' + a[0], a[1])}</td><td>{len(a[3])}</td><td>{len(refs)}</td>"
                   + cell(str(states.count("picked")), "#E3FCEF") + cell(str(states.count("planned")), "#DEEBFF") + "</tr>")
    out.append("</tbody></table><h2>The Claude Design projects</h2><ul>" + "".join(
        f'<li><a href="https://claude.ai/design/p/{v["id"]}">{esc(v["name"])}</a></li>' for v in ctx.trace["claude_design"].values()) + "</ul>")
    return "".join(out) + footer(ctx)


def render_area(ctx: Ctx, area: tuple) -> str:
    key, title, intro, files = area
    out = [cpanel("#FFFAE6", AREA_ICON.get(key, ":frame_photo:"), f"<p>{esc(intro)}</p>")]
    parts = []
    for f in files:
        refs = sorted((r for r in ctx.cites if r[1] == f), key=lambda r: (list(DOOR_NAMES).index(door_of(r[2], r[0])), r[2]))
        if not refs:
            continue
        project = refs[0][0]
        body = [f'<p><a href="{design_url(ctx.trace, project, f)}">Open in Claude Design</a> · {esc(ctx.trace["claude_design"][project]["name"])}'
                + (" · superseded by MA-161, kept as the record" if f in SUPERSEDED_FILES else "") + "</p>"]
        body += [image(ctx, name, f"{f.removesuffix('.dc.html')}: {len(b)} boards") for name, ff, b in file_sheets(ctx, key) if ff == f]
        body.append("<table><thead><tr><th>Board</th><th>State</th><th>Stories</th><th>Phase</th></tr></thead><tbody>")
        for r in refs:
            its = ctx.cites.get(r, [])
            st = board_state(ctx, r)
            phases = sorted({i.get("phase") for i in its if i.get("phase") is not None})
            body.append(f"<tr><td>{esc(r[2])}</td>" + cell(esc(st), DESIGN_CELL.get(st)) + f"<td>{', '.join(jira_text(i['key']) for i in its)}</td>"
                        f"<td>{', '.join(ctx.link(phase_slug(n), str(n)) for n in phases)}</td></tr>")
        body.append("</tbody></table>")
        parts.append((f.removesuffix(".dc.html").replace("v4 · ", "v4 "), "".join(body)))
    out.append(tabs(parts) if len(parts) > 1 else "".join(b for _, b in parts))
    return "".join(out) + footer(ctx)


def render_decisions(ctx: Ctx) -> str:
    out = [cpanel("#FFEBE6", ":dart:", "<p>Every design round ends in a decision record in the repo: the request in Arun's words, the options "
                  "drawn, the one recommended and why, and the pick. Picked boards are the spec (plan-sync rule 4); the options not picked stay "
                  "drawn as the record. Each tab holds a record's request, options, boards and pick; the full record is linked.</p>"),
           "<h2>🃏 Every pick at a glance</h2>", app_embed(ctx, "decision-cards", 720), decision_cards(), "<h2>📜 The records</h2>"]
    parts = []
    for k in DECISIONS:
        path = REVIEWS / k / "decision.md"
        if not path.exists():
            continue
        text = path.read_text()
        title = text.splitlines()[0].lstrip("# ").strip()
        rest = text.split("\n", 1)[1] if "\n" in text else ""
        secs = [sec for sec in re.split(r"(?m)^(?=## )", rest) if sec.startswith("## ") and sec[3:].startswith(DECISION_PARTS)]
        body = (f"<p>{jira(k)} · <a href=\"{gh(str(path.relative_to(ROOT)))}\">the full record</a></p><h2>{esc(title)}</h2>"
                + "".join(f"<h3>{inline(sec.splitlines()[0][3:])}</h3>{md(sec.split(chr(10), 1)[1], shift=3)}" for sec in secs))
        parts.append((k, body))
    out.append(tabs(parts))
    return "".join(out) + footer(ctx)


def render_explainers(ctx: Ctx) -> str:
    app = ctx.trace["claude_design"]["app"]["id"]
    out = [cpanel("#E6FCFF", ":movie_camera:", "<p>The pages and drawings that explain MyPaisa end to end. The Claude pages are private to "
                  "Arun's Claude account and open after signing in to claude.ai; the Lucid drawings open in Lucid.</p>"),
           "<h2>📖 The explainer pages</h2>"
           f'<p>Kept in the repo as <a href="{gh("docs/design/inside-mypaisa.html")}">inside-mypaisa.html</a> (the whole architecture in plain words, MA-239), '
           f'<a href="{gh("docs/design/architecture-v4.html")}">architecture-v4.html</a> (the same architecture, technical and animated, MA-244), '
           f'<a href="{gh("docs/design/agent-journey.html")}">agent-journey.html</a>, '
           f'<a href="{gh("docs/design/market-agent.html")}">market-agent.html</a>, '
           f'<a href="{gh("docs/design/guardrails-evals.html")}">guardrails-evals.html</a> (the guardrails and the evals, plain or technical, animated, MA-258), '
           f'<a href="{gh("docs/design/tech-stack-observability.html")}">tech-stack-observability.html</a> (the implementation stack, FastAPI, DynamoDB vs DocumentDB, agent frameworks and end-to-end observability, MA-265; see {ctx.link("stack", "Tech stack, FastAPI, DynamoDB, agents and end-to-end observability")}), '
           f'<a href="{gh("docs/design/cicd-security-regression.html")}">cicd-security-regression.html</a> (the CI/CD pipeline, seven-layer security gate, smoke suite, phase-wise regression pyramid and runner cost analysis, MA-267 to MA-272; see {ctx.link("cicd", "CI/CD, vulnerability scanning, smoke and regression architecture")}) and '
           f'<a href="{gh("docs/design/maestro-ios-ipados-testing.html")}">maestro-ios-ipados-testing.html</a> (the local iOS and iPadOS Maestro testing strategy, four-sub-band adaptive matrix, phase-wise rollout and private 90-day TestFlight beta plan, MA-167, MA-273, MA-274; see {ctx.link("maestro", "Local iOS and iPadOS Maestro testing and private TestFlight beta plan")}); '
           'the first five are also published as Claude artifacts below, while the stack, CI/CD and Maestro explainers embed their animated block diagrams directly on their Confluence pages.</p>',
           "".join('<section data-type="layout-two-equal">' + "".join(
               f'<div data-type="column"><h3>{esc(t)}</h3><p><a href="{u}" data-card-appearance="block"></a></p></div>' for t, u in pair)
               + "</section>" for pair in (list(ARTIFACTS.items())[k:k + 2] for k in range(0, len(ARTIFACTS), 2))),
           "<h2>🖱️ The clickable prototype</h2><p>Prototype v4 walks the whole journey at desktop, phone web and iPhone: sign in, register, "
           "correct a figure, a check-in, a statement, the dashboard, the budget, the Projection, a plan item and Activity (MA-193).</p>"
           f'<p><a href="{DESIGN.format(id=app, file=urllib.parse.quote_plus("Prototype v4.dc.html"))}" data-card-appearance="block"></a></p>',
           "<h2>🏗️ The architecture drawings</h2>"
           f'<p>Drawn in Lucid on AWS shapes (MA-141, redrawn for v4 on MA-225, the trace added on MA-236). Each tab has the drawing, kept in the repo as a PNG, and its live '
           f'Lucid document; <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a> explains each one.</p>']
    out.append(tabs([(title if png.startswith("08-") else f"{k + 1} {title}",
                      image(ctx, f"lucid-{png}", title, 100) + f'<p>{esc(secs)} · <a href="https://lucid.app/lucidchart/{doc}/edit" data-card-appearance="inline"></a></p>')
                     for k, (png, title, doc, secs) in enumerate(LUCID)]))
    return "".join(out) + footer(ctx)


def render_sync(ctx: Ctx) -> str:
    rule = gh(".claude/rules/plan-sync.md")
    out = [
        cpanel("#F4F5F7", ":link:", '<p>Arun, 24 Oct 2026 (MA-155): "All the design and jira planned phase items should be in sync so that when I start '
               'the work it does [not] drift." And on 26 Oct 2026 (MA-228): the Confluence documents, the Jira stories, the Claude designs and the code '
               f'stay the same. The rule is <a href="{rule}">.claude/rules/plan-sync.md</a>.</p>'),
        "<h2>📒 The five records</h2><table><thead><tr><th>Record</th><th>Where</th><th>Holds</th></tr></thead><tbody>"
        f'<tr><td data-background="#EAE6FF">The plan</td><td><a href="{gh("PLAN.md")}">PLAN.md</a>, <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>, '
        f'<a href="{gh("TECH_STACK.md")}">TECH_STACK.md</a>, <a href="{gh("docs/roadmap.json")}">docs/roadmap.json</a></td><td>What is built, in which phase, to which design, and when</td></tr>'
        '<tr><td data-background="#DEEBFF">Jira</td><td>Project MA: an epic per phase, a story or task per deliverable</td><td>Who does what, its status, each epic\'s due date</td></tr>'
        '<tr><td data-background="#FFFAE6">The designs</td><td>Claude Design (MyPaisa app v1, iOS v1, DS v1), copied into docs/design/ with their etags by <code>python3 scripts/design_sync.py pull</code></td><td>What a member sees</td></tr>'
        '<tr><td data-background="#E3FCEF">Confluence</td><td>This space, rendered from the repo into docs/confluence/</td><td>The plan as one readable tree, phase by phase and screen by screen</td></tr>'
        f'<tr><td data-background="#FFEBE6">The code</td><td>web/, ios/, src/, infra/, and each story\'s code paths in <a href="{gh("docs/trace.json")}">the trace</a></td><td>What was built, traced to its story</td></tr>'
        "</tbody></table>",
        "<h2>🔁 What keeps them the same</h2><ul>"
        "<li><strong>One source each.</strong> Estimates and dates live in docs/roadmap.json; stories, boards and code paths in docs/trace.json; the words in PLAN.md and ARCHITECTURE.md. Every page here is generated from them.</li>"
        "<li><strong>The check.</strong> <code>python3 scripts/plan_sync.py check</code> runs on every PR and in CI. It fails when a page in docs/confluence/ is stale or unpublished, a board preview is older than its board, the roadmap or PLAN's Timeline is stale, a board or a section a story cites is missing, or a story In Review or Done names no code, or code that does not exist.</li>"
        "<li><strong>The live side.</strong> <code>/plan-sync</code> compares each page's version here, each epic's due date and every story's key, epic, labels and status in Jira, and every board's etag in Claude Design, and fixes or files what differs.</li>"
        "<li><strong>The designs, live</strong> (MA-259). <code>python3 scripts/design_sync.py check</code> lists the three Claude Design projects and fails on any file new, changed or gone on either side; <code>pull</code> copies the changes byte for byte and records their etags. It runs before every PR, as a gate and in the PR hook; CI cannot reach Claude Design, so it runs the offline selftest. Standalone Claude Design closes by 14 Dec 2026; the options for what replaces it are in docs/design/reviews/MA-259/decision.md, for Arun to pick.</li>"
        "<li><strong>The hooks</strong>, in this repo only. After an edit to a record, the check runs and reports drift at once. Raising a PR with drift is refused. When a new design or feature is discussed, the session is reminded to file its Jira issue and its Confluence page in the same change.</li></ul>",
        "<h2>🆕 New work</h2>"
        + cpanel("#E3FCEF", ":seedling:", "<p>A new design or feature gets, in the same change: its Jira story or task under its phase epic, its PLAN.md "
                 "bullet, its trace row and its estimate in docs/roadmap.json, and its place on its phase page here. A new phase gets its epic, its "
                 "PLAN section and its own page. Boards come before code (/design-first), and the picked boards are the spec.</p>"),
    ]
    return "".join(out) + footer(ctx)


def render_guardrails(ctx: Ctx) -> str:
    """ARCHITECTURE 23 as written, with the stories that build it from the trace."""
    num = GUARDRAILS[0]
    items = [i for i in ctx.items if any(a == num or a.startswith(num + ".") for a in i.get("arch") or [])]
    items.sort(key=lambda i: (i["phase"], key_n(i["key"])))
    out = [
        cpanel("#E3FCEF", ":shield:", '<p>Arun, 27 Oct 2026 (MA-245): guardrails and an evals strategy for agents that are highly dynamic and will '
               "grow. What an agent must never do is made impossible in code; every change is tested before it merges, never on a timer; every live "
               "run is checked by code and a few are judged overnight; the admin calibrates the judges monthly and on every change. "
               f'The source is {arch_link(num, ctx.sections)} of <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>; the research is '
               f'<a href="{gh("docs/RESEARCH.md")}">docs/RESEARCH.md</a> §5, its sources in the list at the end.</p>'),
        toc(),
        "<h2>🎞️ The diagrams</h2>"
        f'<p>Animated, from the explainer page, which says the same in plain words or in technical detail: '
        f'<a href="{ARTIFACTS["MyPaisa Guardrails and Evals"]}" data-card-appearance="inline"></a> '
        f'(<a href="{gh("docs/design/guardrails-evals.html")}">docs/design/guardrails-evals.html</a>, MA-258).</p>',
        tabs([(title, image(ctx, f"guardrails-{gif}", caption, 100)) for gif, title, caption in GUARDRAILS_GIFS]),
        md(arch_text(num)[1], shift=-1),
        f"<h2>🧩 The stories</h2><p>Every story that cites §{num} in the trace, in build order, with its estimate, status and design.</p>",
        story_rows(ctx, items),
        jira_macro("project = MA AND key in (" + ", ".join(i["key"] for i in items) + ") ORDER BY key") if items else "",
    ]
    return "".join(out) + footer(ctx)


RESEARCH_SECTIONS = [  # (page slug, docs/RESEARCH.md section number, expected heading prefix)
    ("stack", "6", "End-to-end AWS & LLM observability"),
    ("cicd", "7", "CI/CD pipeline, seven-layer vulnerability scanning"),
    ("maestro", "8", "Local iOS & iPadOS testing strategy with Maestro"),
]


def research_section(num: str) -> tuple[str, str]:
    """docs/RESEARCH.md's top-level section NUM: its heading's title and its body, up to the next top-level heading
    (any `#` or `##` heading outside a code fence). ("", "") when docs/RESEARCH.md or section NUM is missing."""
    path = ROOT / "docs" / "RESEARCH.md"
    if not path.exists():
        return "", ""
    lines = path.read_text().splitlines()
    start = next((k for k, line in enumerate(lines) if re.match(rf"^## {re.escape(num)}\.? ", line)), None)
    if start is None:
        return "", ""
    body, fenced = [], False
    for line in lines[start + 1:]:
        if line.startswith("```"):
            fenced = not fenced
        elif not fenced and re.match(r"^#{1,2} ", line):
            break
        body.append(line)
    title = re.sub(rf"^## {re.escape(num)}\.? ", "", lines[start]).strip()
    return title, "\n".join(body).strip().rstrip("-").strip()


def research_text(num: str) -> str:
    """docs/RESEARCH.md's top-level section NUM, without its ## heading."""
    return research_section(num)[1]


def research_errors() -> list[str]:
    """The research-backed pages (stack, cicd, maestro) fail closed when docs/RESEARCH.md or their section is missing, retitled or empty."""
    path = ROOT / "docs" / "RESEARCH.md"
    if not path.exists():
        return ["confluence: docs/RESEARCH.md is missing"]
    out = []
    for page_slug, num, want in RESEARCH_SECTIONS:
        title, body = research_section(num)
        if not title:
            out.append(f"confluence: {page_slug} page: docs/RESEARCH.md has no section {num}")
            continue
        if not title.startswith(want):
            out.append(f"confluence: {page_slug} page: docs/RESEARCH.md §{num} is not {want!r} (it reads {title[:60]!r})")
        if not re.search(rf"(?m)^### {re.escape(num)}\.1 ", body):
            out.append(f"confluence: {page_slug} page: docs/RESEARCH.md §{num} has no body (no §{num}.1)")
    return out


def render_stack(ctx: Ctx) -> str:
    """The four-layer implementation stack, FastAPI, DynamoDB vs DocumentDB, agent frameworks, and end-to-end observability with costing (MA-265, MA-266)."""
    keys = {"MA-265", "MA-266", "MA-270", "MA-271", "MA-24", "MA-194", "MA-165", "MA-198", "MA-230", "MA-231", "MA-195", "MA-31", "MA-30", "MA-29", "MA-232", "MA-233", "MA-234", "MA-196", "MA-27", "MA-28"}
    items = [i for i in ctx.items if i["key"] in keys]
    items.sort(key=lambda i: (i["phase"], key_n(i["key"])))
    sec6 = research_text("6")
    out = [
        cpanel("#DEEBFF", ":hammer_and_wrench:", '<p>Arun, 28 Oct 2026 (MA-265, MA-266): end-to-end AWS monitoring, tracing and LLM/API observability '
               "(including the FastAPI REST and SSE APIs) with a full monthly costing analysis, together with the detailed implementation stack across "
               "all four layers: the web front end (SvelteKit 3, TanStack, shadcn-svelte), the native iOS app (React Native 0.88 shell and Swift 6 "
               "SwiftUI core), the Python 3.14 backend (FastAPI, Pydantic v2, single-table DynamoDB versus DocumentDB, and the Python DynamoDB library "
               "comparison), and the agent framework evaluation and recommendation. "
               f'The sources are <a href="{gh("docs/RESEARCH.md")}">docs/RESEARCH.md</a> §6, <a href="{gh("TECH_STACK.md")}">TECH_STACK.md</a>, and '
               f'{arch_link("3", ctx.sections)}, {arch_link("4.8", ctx.sections)}, {arch_link("8", ctx.sections)}, {arch_link("9.4", ctx.sections)} and '
               f'{arch_link("10", ctx.sections)} of <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>; the interactive explainer page is '
               f'<a href="{gh("docs/design/tech-stack-observability.html")}">docs/design/tech-stack-observability.html</a>.</p>'),
        toc(),
        "<h2>🎞️ Block diagrams (animated)</h2>"
        f'<p>Six animated block diagrams captured from <a href="{gh("docs/design/tech-stack-observability.html")}">docs/design/tech-stack-observability.html</a> '
        "(MA-265): browse them in the tabs below, or beside each section further down.</p>",
        tabs([(title, image(ctx, f"stack-{gif}", caption, 100)) for gif, title, caption in STACK_GIFS]),
        "<h2>📡 1. End-to-end tracing, Request IDs &amp; FastAPI observability</h2>",
        image(ctx, "stack-01-e2e-trace-fastapi.gif", STACK_GIFS[0][2], 100),
        "<h2>💷 2. Observability surfaces &amp; £2.50/month cost analysis</h2>",
        image(ctx, "stack-02-observability-surfaces-cost.gif", STACK_GIFS[1][2], 100),
        "<h2>🌐 3. Web front-end stack (SvelteKit 3, TanStack, shadcn-svelte)</h2>",
        image(ctx, "stack-03-frontend-sveltekit-stack.gif", STACK_GIFS[2][2], 100),
        "<h2>📱 4. iOS app stack (React Native 0.88 shell + Swift 6 SwiftUI core)</h2>",
        image(ctx, "stack-04-ios-rn-swiftui-stack.gif", STACK_GIFS[3][2], 100),
        "<h2>🐍 5. Python 3.14 backend, FastAPI &amp; DynamoDB vs DocumentDB</h2>",
        image(ctx, "stack-05-backend-fastapi-dynamodb.gif", STACK_GIFS[4][2], 100),
        "<h2>🤖 6. Agent loop architecture &amp; framework comparison</h2>",
        image(ctx, "stack-06-agent-framework-architecture.gif", STACK_GIFS[5][2], 100),
        "<h2>📖 Full research, architecture &amp; costing record (docs/RESEARCH.md §6)</h2>",
        md(sec6, shift=-1),
        "<h2>🧩 The stories that build it</h2><p>Every story in the trace that records or builds the stack and observability, in phase order.</p>",
        story_rows(ctx, items),
        jira_macro("project = MA AND key in (" + ", ".join(i["key"] for i in items) + ") ORDER BY key") if items else "",
    ]
    return "".join(out) + footer(ctx)


def render_cicd(ctx: Ctx) -> str:
    """The CI/CD pipeline, seven-layer vulnerability scanning, smoke suite, phase-wise regression matrix and GitHub Actions runner cost analysis (MA-267 to MA-272)."""
    keys = {"MA-267", "MA-268", "MA-269", "MA-270", "MA-271", "MA-272", "MA-273", "MA-274", "MA-24", "MA-25", "MA-26", "MA-107", "MA-108", "MA-110", "MA-164", "MA-165", "MA-166", "MA-167", "MA-194", "MA-198", "MA-231", "MA-232", "MA-237", "MA-238", "MA-246", "MA-247", "MA-248", "MA-249", "MA-250", "MA-251", "MA-266"}
    items = [i for i in ctx.items if i["key"] in keys]
    items.sort(key=lambda i: (i["phase"], key_n(i["key"])))
    sec7 = research_text("7")
    out = [
        cpanel("#FFFAE6", ":rocket:", '<p>Arun, 28 Oct 2026 (MA-267 to MA-272): the end-to-end GitHub Actions + AWS CodeBuild arm64 + ECR delivery '
               "pipeline for dev and prod, the seven-layer open-source vulnerability scanning gate, the phase-progressive smoke runner "
               "(<code>scripts/smoke.py</code>) with prod read-only safety and under-five-second Lambda <code>:live</code> alias rollback, the five-layer "
               "regression pyramid (<code>scripts/regression.py</code>) across Phases 0 to 20, and the GitHub Actions versus AWS CodeBuild runner cost "
               "analysis showing how Option D stays at £0.00 a month inside both free tiers. "
               f'The sources are <a href="{gh("docs/RESEARCH.md")}">docs/RESEARCH.md</a> §7 and '
               f'{arch_link("18.4", ctx.sections)} of <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>; the interactive explainer page is '
               f'<a href="{gh("docs/design/cicd-security-regression.html")}">docs/design/cicd-security-regression.html</a>.</p>'),
        toc(),
        "<h2>🎞️ Block diagrams (animated)</h2>"
        f'<p>Four animated block diagrams captured from <a href="{gh("docs/design/cicd-security-regression.html")}">docs/design/cicd-security-regression.html</a> '
        "(MA-272): browse them in the tabs below, or beside each section further down.</p>",
        tabs([(title, image(ctx, f"cicd-{gif}", caption, 100)) for gif, title, caption in CICD_GIFS]),
        "<h2>🚀 1. End-to-end CI/CD delivery pipeline (GitHub Actions, AWS CodeBuild arm64, ECR, dev &amp; prod)</h2>",
        image(ctx, "cicd-01-cicd-pipeline-dev-prod.gif", CICD_GIFS[0][2], 100),
        "<h2>🛡️ 2. Seven-layer vulnerability scanning gate (MA-267)</h2>",
        image(ctx, "cicd-02-vulnerability-7-gates.gif", CICD_GIFS[1][2], 100),
        "<h2>🧪 3. Phase-progressive smoke suite, prod read-only safety &amp; &lt;5s auto-rollback (MA-268)</h2>",
        image(ctx, "cicd-03-smoke-and-rollback.gif", CICD_GIFS[2][2], 100),
        "<h2>📐 4. Five-layer regression pyramid (Phases 0–20) &amp; £0/month runner cost analysis (MA-269)</h2>",
        image(ctx, "cicd-04-regression-pyramid-and-costs.gif", CICD_GIFS[3][2], 100),
        "<h2>📖 Full architecture, phase-wise matrix &amp; runner costing record (docs/RESEARCH.md §7)</h2>",
        md(sec7, shift=-1),
        "<h2>🧩 The stories that build it</h2><p>Every story in the trace that records or builds CI/CD, vulnerability scanning, smoke tests, regression suites and the repository/agent foundations, in phase order.</p>",
        story_rows(ctx, items),
        jira_macro("project = MA AND key in (" + ", ".join(i["key"] for i in items) + ") ORDER BY key") if items else "",
    ]
    return "".join(out) + footer(ctx)


def render_maestro(ctx: Ctx) -> str:
    """The local iOS and iPadOS Maestro testing strategy, four-sub-band device matrix, phase-wise rollout and private 90-day TestFlight beta plan (MA-167, MA-273, MA-274)."""
    keys = {"MA-20", "MA-107", "MA-110", "MA-137", "MA-142", "MA-162", "MA-163", "MA-164", "MA-165", "MA-166", "MA-167", "MA-168", "MA-170", "MA-171", "MA-173", "MA-181", "MA-182", "MA-194", "MA-198", "MA-232", "MA-240", "MA-266", "MA-268", "MA-269", "MA-273", "MA-274"}
    items = [i for i in ctx.items if i["key"] in keys]
    items.sort(key=lambda i: (i["phase"], key_n(i["key"])))
    sec8 = research_text("8")
    out = [
        cpanel("#EAE6FF", ":iphone:", '<p>Arun, 29 Oct 2026 (MA-167, MA-273, MA-274): the local iOS and iPadOS testing strategy on Apple Silicon '
               "with Maestro (<code>scripts/maestro_local.py</code>, five cloned simulators guarded by <code>flock</code> so automated runs never collide "
               "with interactive Maestro MCP sessions, one shared <code>mp.*</code> ID schema across Playwright and SwiftUI, four adaptive width sub-bands "
               "and live rotation across 1133 pt, <code>xcrun simctl</code> and host Local File Provider bridges for Face ID, APNs push, Universal Links, Photos images, PDFs/workbooks and AX5, and a "
               "phase-by-phase rollout across Phases 0 to 20 at £0.00/month), together with the 100% private 90-day (3-month) evergreen TestFlight "
               "household beta plan (<code>testFlightInternalTestingOnly = true</code>, least-privilege App Store Connect roles, silent overnight updates "
               "preserving Keychain and MMKV, and a day-60 keepalive rebuild). "
               f'The sources are <a href="{gh("docs/RESEARCH.md")}">docs/RESEARCH.md</a> §8, <a href="{gh("TECH_STACK.md")}">TECH_STACK.md</a> §2 and §4, and '
               f'{arch_link("9.1", ctx.sections)}, {arch_link("9.5", ctx.sections)} and {arch_link("18.4", ctx.sections)} of <a href="{gh("ARCHITECTURE.md")}">ARCHITECTURE.md</a>; '
               f'the interactive explainer page is <a href="{gh("docs/design/maestro-ios-ipados-testing.html")}">docs/design/maestro-ios-ipados-testing.html</a>.</p>'),
        toc(),
        "<h2>🎞️ Block diagrams (animated)</h2>"
        f'<p>Five animated block diagrams captured from <a href="{gh("docs/design/maestro-ios-ipados-testing.html")}">docs/design/maestro-ios-ipados-testing.html</a> '
        "(MA-274): browse them in the tabs below, or beside each section further down.</p>",
        tabs([(title, image(ctx, f"maestro-{gif}", caption, 100)) for gif, title, caption in MAESTRO_GIFS]),
        "<h2>🖥️ 1. Local Apple Silicon Maestro pool, MCP isolation &amp; dual backend modes</h2>",
        image(ctx, "maestro-01-local-maestro-pool-mcp-cli.gif", MAESTRO_GIFS[0][2], 100),
        "<h2>🧬 2. React Native 0.88 Fabric + Swift 6 SwiftUI + Liquid Glass selector contract</h2>",
        image(ctx, "maestro-02-rn-swiftui-fabric-selectors.gif", MAESTRO_GIFS[1][2], 100),
        "<h2>📐 3. Four-sub-band iOS &amp; iPadOS adaptive width &amp; live rotation matrix (MA-240)</h2>",
        image(ctx, "maestro-03-ios-ipados-4band-matrix.gif", MAESTRO_GIFS[2][2], 100),
        "<h2>⚙️ 4. xcrun simctl system capability bridges &amp; Phases 0–20 rollout at £0.00/month</h2>",
        image(ctx, "maestro-04-simctl-capabilities-phases.gif", MAESTRO_GIFS[3][2], 100),
        "<h2>✈️ 5. Private 90-day (3-month) TestFlight Internal Testing &amp; evergreen beta lifecycle</h2>",
        image(ctx, "maestro-05-private-testflight-90day-beta.gif", MAESTRO_GIFS[4][2], 100),
        "<h2>📖 Full strategy, phase-wise plan &amp; private 90-day TestFlight guide (docs/RESEARCH.md §8)</h2>",
        md(sec8, shift=-1),
        "<h2>🧩 The stories that build it</h2><p>Every story in the trace that records or builds local iOS and iPadOS Maestro testing and private 90-day TestFlight distribution, in phase order.</p>",
        story_rows(ctx, items),
        jira_macro("project = MA AND key in (" + ", ".join(i["key"] for i in items) + ") ORDER BY key") if items else "",
    ]
    return "".join(out) + footer(ctx)


BLOCK_END = re.compile(r"(</(?:p|h[1-6]|table|thead|tbody|tr|ul|ol|li|div|figure|section|blockquote|pre)>)")


def render(ctx: Ctx, slug_: str) -> str:
    """A page's HTML, one block per line so it reads and diffs well; Confluence ignores the line breaks."""
    return BLOCK_END.sub(r"\1\n", render_body(ctx, slug_))


def render_body(ctx: Ctx, slug_: str) -> str:
    import confluence_record  # noqa: PLC0415
    if confluence_record.is_record(slug_):
        return confluence_record.render(ctx, slug_)
    if slug_ == "home":
        return render_home(ctx)
    if slug_ == "hub":
        return render_hub(ctx)
    if slug_ == "roadmap":
        return render_roadmap(ctx)
    if slug_ == "phases":
        return render_phases(ctx)
    if slug_.startswith("phase-"):
        return render_phase(ctx, next(p for p in ctx.phases if phase_slug(p["phase"]) == slug_))
    if slug_ == "screens":
        return render_screens(ctx)
    if slug_.startswith("screens-"):
        return render_area(ctx, next(a for a in AREAS if f"screens-{a[0]}" == slug_))
    return {"decisions": render_decisions, "guardrails": render_guardrails, "stack": render_stack, "cicd": render_cicd, "maestro": render_maestro, "explainers": render_explainers, "sync": render_sync}[slug_](ctx)


# ---------- check and the commands ----------

def errors(ctx: Ctx | None = None) -> list[str]:
    ctx = ctx or Ctx()
    out: list[str] = []
    cited = {r[1] for r in ctx.cites}
    for f in sorted(cited - set(ctx.file_area)):
        out.append(f"confluence: board file {f!r} is cited by a story but belongs to no screen area in scripts/confluence_docs.py AREAS")
    if out:
        return out
    model = pages(ctx)
    out += guardrails_errors(ctx)
    out += research_errors()
    import confluence_record  # noqa: PLC0415
    out += confluence_record.errors(ctx, {s for s, _, _ in model})
    recorded = ctx.manifest.get("pages", {})
    for slug_, title, _ in model:
        path = PAGES / f"{slug_}.html"
        try:
            want = render(ctx, slug_)
        except confluence_record.RecordError as e:
            out.append(f"confluence: {e}")
            continue
        rec = recorded.get(slug_, {})
        if not rec.get("id"):
            out.append(f"confluence: page {title!r} has no Confluence id in docs/confluence.json; create it with /plan-sync")
        if not path.exists() or path.read_text() != want:
            out.append(f"confluence: docs/confluence/{slug_}.html is stale: run `python3 scripts/confluence_docs.py write`")
        elif rec.get("sha256") != sha(want):
            out.append(f"confluence: page {title!r} changed in the repo but is not published: publish it with /plan-sync")
    for f in PAGES.glob("*.html") if PAGES.exists() else []:
        if f.stem not in {s for s, _, _ in model}:
            out.append(f"confluence: docs/confluence/{f.name} is no page the generator makes; remove it (and archive its page)")
    for name, page in APP_PAGE.items():
        rec = ctx.manifest.get("apps", {}).get(name, {})
        if rec.get("url") and rec.get("source") != app_source(ctx, name):
            out.append(f"confluence: app {name} is older than its inputs: make it again from app-prompt {name}")
    for name in DATABASES:
        path, want = PAGES / f"{name}.csv", stories_csv(ctx)
        rec = ctx.manifest.get("databases", {}).get(name, {})
        if not path.exists() or path.read_text() != want:
            out.append(f"confluence: docs/confluence/{name}.csv is stale: run `python3 scripts/confluence_docs.py write`")
        elif not rec.get("id"):
            out.append(f"confluence: database {name} has no Confluence id in docs/confluence.json; create it with /plan-sync")
        elif rec.get("sha256") != sha(want):
            out.append(f"confluence: database {name} changed in the repo but is not published: update its rows with /plan-sync")
    images = ctx.manifest.get("images", {})
    for name, w in wanted_images(ctx).items():
        rec = images.get(name, {})
        if not rec.get("media"):
            out.append(f"confluence: preview {name} is not uploaded to its page ({w['page']})")
        elif rec.get("source") != w["source"]:
            out.append(f"confluence: preview {name} is older than its boards or inputs: compose it again and upload it")
    return out


def pending(ctx: Ctx) -> dict:
    model = pages(ctx)
    rec = ctx.manifest.get("pages", {})
    imgs = ctx.manifest.get("images", {})
    return {
        "create": [{"slug": s, "title": t, "parent": p} for s, t, p in model if not rec.get(s, {}).get("id")],
        "publish": [{"slug": s, "title": t, "id": rec.get(s, {}).get("id")} for s, t, _ in model
                    if (PAGES / f"{s}.html").exists() and rec.get(s, {}).get("sha256") != sha((PAGES / f"{s}.html").read_text())],
        "images": [{"name": n, "page": w["page"], "page_id": rec.get(w["page"], {}).get("id")} for n, w in wanted_images(ctx).items()
                   if not imgs.get(n, {}).get("media") or imgs[n].get("source") != w["source"]],
        "apps": [{"name": n, "page": pg, "page_id": rec.get(pg, {}).get("id")} for n, pg in APP_PAGE.items()
                 if ctx.manifest.get("apps", {}).get(n, {}).get("source") != app_source(ctx, n)],
        "databases": [{"name": n, "title": t, "parent_id": rec.get(par, {}).get("id"), "id": ctx.manifest.get("databases", {}).get(n, {}).get("id")}
                      for n, (t, par) in DATABASES.items()
                      if ctx.manifest.get("databases", {}).get(n, {}).get("sha256") != sha(stories_csv(ctx))],
    }


def save_manifest(m: dict) -> None:
    MANIFEST.write_text(json.dumps(m, indent=1, ensure_ascii=False) + "\n")


def update_manifest(change) -> None:  # noqa: ANN001
    """Read, change and write docs/confluence.json under a lock, so publishers running side by side lose nothing."""
    import fcntl  # noqa: PLC0415
    import tempfile  # noqa: PLC0415
    with open(Path(tempfile.gettempdir()) / "mypaisa-confluence-manifest.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        m = load(MANIFEST)
        change(m)
        save_manifest(m)


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "write":
        ctx = Ctx()
        PAGES.mkdir(parents=True, exist_ok=True)
        for slug_, _, _ in pages(ctx):
            (PAGES / f"{slug_}.html").write_text(render(ctx, slug_))
        (PAGES / "stories.csv").write_text(stories_csv(ctx))
        print(f"wrote {len(pages(ctx))} pages to {PAGES.relative_to(ROOT)}")
        return 0
    if cmd == "check":
        errs = errors()
        for e in errs:
            print(f"DRIFT: {e}")
        print(f"confluence: {len(errs)} drift")
        return 1 if errs else 0
    if cmd == "pending":
        print(json.dumps(pending(Ctx()), indent=1, ensure_ascii=False))
        return 0
    if cmd == "images" and len(argv) == 4:
        import confluence_images  # noqa: PLC0415  (Pillow is needed only here)
        return confluence_images.compose(Ctx(), Path(argv[2]), Path(argv[3]))
    if cmd == "set-page" and len(argv) in (5, 6):
        # set-page SLUG ID VERSION [published]: "published" says the page now shows docs/confluence/SLUG.html
        ctx = Ctx()
        slug_, pid, version = argv[2], argv[3], int(argv[4])
        path = PAGES / f"{slug_}.html"
        published = len(argv) == 6 and argv[5] == "published" and path.exists()
        rec = {"id": pid, "title": dict((s, t) for s, t, _ in pages(ctx))[slug_], "version": version,
               "sha256": sha(path.read_text()) if published else ""}
        update_manifest(lambda m: m.setdefault("pages", {}).__setitem__(slug_, rec))
        return 0
    if cmd == "app-prompt" and len(argv) == 3:
        print(app_prompt(Ctx(), argv[2]))
        return 0
    if cmd == "set-app" and len(argv) == 5:
        # set-app NAME MAUI_ID URL: the app made from the current app-prompt
        rec = {"page": APP_PAGE[argv[2]], "id": argv[3], "url": argv[4], "source": app_source(Ctx(), argv[2])}
        update_manifest(lambda m: m.setdefault("apps", {}).__setitem__(argv[2], rec))
        return 0
    if cmd == "set-database" and len(argv) in (4, 5):
        # set-database NAME ID [published]: "published" says the database now holds docs/confluence/NAME.csv's rows
        path = PAGES / f"{argv[2]}.csv"
        rec = {"id": argv[3], "title": DATABASES[argv[2]][0],
               "sha256": sha(path.read_text()) if len(argv) == 5 and argv[4] == "published" and path.exists() else ""}
        update_manifest(lambda m: m.setdefault("databases", {}).__setitem__(argv[2], rec))
        return 0
    if cmd == "set-image" and len(argv) == 5:
        w = wanted_images(Ctx())[argv[2]]
        rec = {"page": w["page"], "media": argv[3], "collection": argv[4], "source": w["source"]}
        update_manifest(lambda m: m.setdefault("images", {}).__setitem__(argv[2], rec))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
