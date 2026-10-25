# Design artifacts

The design pages and diagrams, kept here as source so they live with the
code. The live versions are Claude artifacts and Lucid documents (private to
the account; share from each page's menu):

| File | Live page | What it is |
| --- | --- | --- |
| `agent-journey.html` | <https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7> | **MyPaisa Agent Journey** (MA-141, India added in MA-155): sixteen flows end to end, from the invite and sign-in through adding a holding, logging money, the 07:15 brief, a red alert, a question, the web app, the Admin center, failures and replay, the spend ladder, the first of the month, money in any currency, the Indian portfolio import, the household in INR and GBP and India's day. Each flow is a numbered path across five lanes (member, Telegram, AWS, Claude, external data), the Telegram and web screens the member sees, its safeguards and the Jira stories that build it. Warm ledger theme, light and dark. |
| `market-agent.html` | <https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb> | **MyPaisa Market Agents** (MA-141, India woven through in MA-155): the market side end to end: what can be forecast, free data as it was known each day, the rules engine with its pillars, cascade and confidence, news matched to holdings, the Forecaster's five models, both engines side by side, the daily learning loop, the strategy layer, how it proves itself, self-healing and the budgets, with a section on India (sources, the India basket, FX, the import, cost and order). Warm ledger theme, light and dark; no script. |
| `lucid/` | [7 views and a sequence](https://lucid.app/lucidchart/c67e066b-141a-4b94-a860-b0501c6632ee/edit) | The architecture in Lucidchart on AWS 2024 shapes (MA-141), one document per view: 1 system overview, 2 environments and delivery, 3 identity and sign-in, 4 queues and replay, 5 data stores, 6 the market agent and the learning loop, 7 the agent team, caps and alerts, plus the adding-a-holding sequence. `01-overview.png` to `08-add-holding-sequence.png` are the exports embedded in `ARCHITECTURE.md`, which links each document; `aws-architecture.lucid.json` is the Lucid Standard Import file for the seven views, written by `gen_aws_architecture.py` (`python3 gen_aws_architecture.py out.json`, then import one page per document). |
| `app-v1/` | [MyPaisa app v1](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7) | **The screens, in Claude Design, copied here.** Every file of the MyPaisa app v1 project (the Mini App and Browser boards, the Admin center, the Telegram chats and second check, the boards planned on 24 Oct 2026, and the Prototype), decoded, with the etag it was copied at in `claude-design.json`. Boards are drawn in Claude Design and copied here by `/plan-sync`; each board names its Jira keys. `docs/trace.json` says which story follows which board (MA-155). |
| `ds-v1/` | [MyPaisa DS v1](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a) | **The design system, copied here**: tokens, foundations, components, the Telegram kit, the mark. |
| `dashboard/` | <https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp> | The design spec for the web app, `web/` in phase 5 (see "The web app: one spec, two sets of boards" below). Today it holds the Mini App boards: five phone-size artboards, Overview, a holding, Overlap, Scorecard, and Overview in the light theme. These are Design-canvas sources (`.dc.html` plus `canvas.json`); they render on the canvas, not as standalone pages, because they reference the canvas runtime (`./support.js`). Their markup and inline styles are the spec. |
| `architecture.html` | <https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx> | Earlier: the animated architecture (v3), from before the queues, the identity design and the agent team. Kept for reference; the Lucid views and the two pages above are current. |
| `journeys.html` | <https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam> | Earlier: eight user journeys on a phone frame, in the Nocturne look. Superseded by `agent-journey.html`; kept for reference. |

All figures on these pages are illustrative. Nothing is built; see `PLAN.md`.

The pages use Google Fonts (Inter, JetBrains Mono) and nothing else from the
network. Both standalone pages follow the viewer's light or dark theme.

## The web app: one spec, two sets of boards

Decided on 2026-10-23 (MA-6). The web app is one static app in `web/` with two
front doors to the same pages (`ARCHITECTURE.md` §9.3): the **Mini App**, opened
from the chat inside Telegram, and the **browser**, the same app at its own
address on a laptop. It has one design spec, `dashboard/`, not a design doc per
door. The pages, the figures, the cards, the look and the read-only
rule are shared; only the layout and the frame around it differ, so each door
gets its own set of boards in the same spec:

| | Mini App boards | Browser boards |
| --- | --- | --- |
| Status | drawn in Warm ledger in MyPaisa app v1 (`app-v1/Mini App.dc.html`), with the boards planned on 24 Oct 2026 | drawn in MyPaisa app v1 (`app-v1/Browser.dc.html`, `Browser 2.dc.html`), with the Admin center and the boards planned on 24 Oct 2026 |
| Width | about 390, phone, one column | laptop, two columns |
| Header and back | Telegram's own header and `BackButton`; no app header | the app's own navigation |
| Theme | Telegram's `colorScheme` and `themeParams` | the system's light or dark setting |
| Sign-in | none to design: Telegram signs `initData` | the login page: Telegram Login Widget and Sign in with Google |
| Also | safe-area insets, expand to full height, an optional `MainButton` | hover, keyboard focus, wider tables for Audit and Activity |

**The look is MyPaisa DS v1, "Warm ledger"** (Arun picked it on 2026-10-24,
MA-101; `reviews/MA-101/decision.md`). Its `tokens.css` lives in the MyPaisa DS
v1 project in Claude Design, with a copy in `reviews/MA-101/`. The boards drawn
in it, Mini App and browser, live in the MyPaisa app v1 project in Claude Design
and are now the spec; the Nocturne artboards in `dashboard/` are kept as the
earlier record and superseded by them.

A page changed on one set of boards is changed on the other in the same design
round, so the two doors never drift. Name the boards by door and page
(`Mini App · Overview`, `Browser · Overview`) on the canvas.

## Keeping the designs, the plan and Jira in step

Since 24 Oct 2026 (MA-155) the boards, the plan and Jira are one record
(`.claude/rules/plan-sync.md`):

- every story with screens has its boards before it starts, named in
  `docs/trace.json` and rendered in `docs/TRACE.md`;
- boards drawn ahead of their story are **planned**; `/design-first` puts them
  through its options round when the story starts, and the pick makes them
  **picked**, the spec;
- the Claude Design files are copied into `app-v1/` and `ds-v1/` with their
  etags; `/plan-sync` copies them again whenever one moves;
- `python3 scripts/plan_sync.py check` runs before every PR and in CI, and
  `python3 scripts/plan_sync.py start MA-<n>` before a story starts.
