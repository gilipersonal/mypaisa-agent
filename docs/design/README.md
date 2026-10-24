# Design artifacts

The three design pages made during the design phase, kept here as source so
they live with the code. The live, animated versions are Claude artifacts
(private to the account; share from each page's menu):

| File | Live page | What it is |
| --- | --- | --- |
| `architecture.html` | <https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx> | The animated architecture (v3): four scenarios that send a packet hop by hop through Telegram, the webhook, the agent, Claude on Bedrock, the engine and the registry; the agent's tool loop replayed on a worked example; the news-to-stance pipeline; the holdings registry and kind profiles; the engine's pillars, stance cascade and confidence formula; the cards; the weekly schedule; cost against the £50 cap; the repository layout and phases. Opens as a normal web page. |
| `journeys.html` | <https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam> | Eight user journeys played on a phone frame: first open, adding a holding by factsheet and screenshot, the morning brief, asking why, a stance with confidence, a red alert, the Saturday review with the dashboard, and settings by chat. With narration and a "behind the scenes" strip. Opens as a normal web page. |
| `dashboard/` | <https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp> | The design spec for the web app, `web/` in phase 5 (see "The web app: one spec, two sets of boards" below). Today it holds the Mini App boards: five phone-size artboards, Overview, a holding, Overlap, Scorecard, and Overview in the light theme. These are Design-canvas sources (`.dc.html` plus `canvas.json`); they render on the canvas, not as standalone pages, because they reference the canvas runtime (`./support.js`). Their markup and inline styles are the spec. |
| `lucid/` | <https://lucid.app/lucidchart/d03dd3bc-9525-43b2-a16e-8696cbfdab86/edit> | The component diagram in Lucidchart: the household and Telegram zone, every AWS service with the one agent (model routing, the 16 tools), the DynamoDB table with its four entity groups, the scheduled pipeline, and the services outside AWS (Anthropic API, data feeds, CI). `architecture.png` is the rendered page; `architecture.lucid.json` is the Lucid Standard Import file it was created from, re-importable into Lucidchart. Embedded in `ARCHITECTURE.md`. |

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
| Status | drawn: the five phone artboards | to draw: the same pages at laptop width, plus the login page; Audit and Activity for both |
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
