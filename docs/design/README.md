# Design artifacts

The design pages and diagrams, kept here as source so they live with the
code. The live versions are Claude artifacts and Lucid documents (private to
the account; share from each page's menu):

| File | Live page | What it is |
| --- | --- | --- |
| `inside-mypaisa.html` | <https://claude.ai/artifact/NQecwzUjudjq1Kigri13g5> | **Inside MyPaisa** (MA-239): the whole architecture in plain words, with animations, for someone who is not technical. The four promises; the parts as a small office, coloured by what they are (screens, plumbing, AI, plain code, storage); the admin's journey in nine steps, each on an animated phone (signing in with Apple, the three setup questions, inviting a member, adding a record by talking, sending a factsheet, the dashboard with a correction in place that moves the laptop, a check-in, a statement and October's budget, a what-if with the Projection); a map of the system that plays one message through it in four journeys (a question, a file, a check-in, a failure and its replay); the nine agents of phase 18 and the admin desk's approval behind Face ID; the safety nets; the two environments; a day with MyPaisa. Figures from `figures/household-v4.json`. Warm ledger theme, light and dark; each step plays once in view and replays on demand, and every element rests in its final state without motion. |
| `architecture-v4.html` | <https://claude.ai/artifact/QputM7CuDn3Zv5s7TGyGL9> | **MyPaisa Architecture v4** (MA-244): the same architecture, technical and animated, on AWS-style service icons drawn in the page (no logo files are loaded). A stack summary; a system map of the two doors, the AWS account in `us-east-1` (API Gateway, the api, agent, sender, worker and stream Lambdas, the three SQS queues and their dead-letter queues, DynamoDB, the S3 lake and documents bucket, SSM, Cognito, CloudFront, the Scheduler, CloudWatch and SNS, and phase 18's Step Functions and EventBridge bus), Apple push and Web Push, the free data sources and the Anthropic API with Opus, Sonnet and Haiku, which plays five journeys hop by hop (a question, a factsheet, a check-in, the 07:15 brief, a failure and its replay) and inspects any part; one message as an OpenTelemetry trace with its GenAI span attributes; the concierge's Claude tool loop and its tools; the nine agents around the bus with the kind of agent each is, its models, what it does on its own, what it asks the admin and its budget share; the three models, what each is routed to and its price, with an interactive spend ladder and the guards; where the data lives; dev, prod and the release pipeline; the guardrails. Timings, tokens, costs and the bus events are illustrative. Warm ledger theme, light and dark; the journeys play once in view and on demand, and with reduced motion they step without moving. |
| `agent-journey.html` | <https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7> | **MyPaisa Agent Journey** (MA-141, India added in MA-155, updated for the iOS app in MA-161, the v4 flows added in MA-226): twenty-four flows end to end, from the invite and signing in with Apple or Google through adding a holding, logging money, the 07:15 brief, a red alert, a question, the dashboard in the app and the web app, the Admin center, failures and replay, the spend ladder, the first of the month, money in any currency, the Indian portfolio import, the household in INR and GBP and India's day, then registering anything by talking, correcting a figure in place, a check-in, a statement, the month close, and the Projection with a what-if. Each flow is a numbered path across five lanes (member, the app, AWS, Claude, external data), the app's screens the member sees, its safeguards and the Jira stories that build it. Warm ledger theme, light and dark. |
| `market-agent.html` | <https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb> | **MyPaisa Market Agent** (MA-141, India woven through in MA-155, updated for the iOS app in MA-161): the market side end to end: what can be forecast, free data as it was known each day, the rules engine with its pillars, cascade and confidence, news matched to holdings, the Forecaster's five models, both engines side by side, the daily learning loop, the strategy layer, how it proves itself, self-healing and the budgets, with a section on India (sources, the India basket, FX, the import, cost and order). Warm ledger theme, light and dark; no script. |
| `lucid/` | [8 views and a sequence](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) | The architecture in Lucidchart on AWS 2024 shapes (MA-141), one document per view: 1 system overview, 2 environments and delivery, 3 identity and sign-in, 4 queues and replay, 5 data stores, 6 the market agent and the learning loop, 7 the agent team, caps and alerts, 9 one trace from the door to the model (MA-236), plus the sequence of adding a record and correcting it in place. `01-overview.png` to `09-observability.png` are the exports embedded in `ARCHITECTURE.md`, which links each document; `aws-architecture.lucid.json` is the Lucid Standard Import file for the eight views, written by `gen_aws_architecture.py` (`python3 gen_aws_architecture.py out.json`, then import one page per document). |
| `ios-v1/` | [MyPaisa iOS v1](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8) | **The app's screens, in Claude Design, copied here** (MA-161). Every file of the MyPaisa iOS v1 project, each board in light and dark: `Shell options` (1a Chat first, 1b Ask from anywhere, 1c One timeline, on iPhone and iPad; Arun picked 1a on 26 Oct 2026), `iPhone sign-in`, `iPhone chat`, `iPhone dashboard`, `iPhone audit and activity`, `iPhone admin`, `iPhone settings`, and `iPad and foldable`. The shell is picked; the other boards are planned, drawn ahead of their stories. They are drawn in Claude Design and copied here by `/plan-sync`, with the etag each file was copied at in `claude-design.json`; each board names its Jira keys, and `docs/trace.json` says which story follows which board (see "Two front doors" below). |
| `ds-v1/` | [MyPaisa DS v1](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a) | **The design system, copied here**: tokens, foundations, components, the mark, and since MA-161 the iOS kit (`iOS kit.dc.html`: the Liquid Glass layers, colour assets, Dynamic Type, the tab bar and sidebar, toolbars and the composer, messages and cards, sheets and menus, charts, the app icon, accessibility) and `ios.css`, the kit's classes over `tokens.css`; the shared motion, `motion.css` and `motion.js`, which every board loads (MA-182; the kit's `12 · Motion` board draws it). The Telegram kit stays as the superseded record. |
| `app-v1/` | [MyPaisa app v1](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7) | **The web app's boards, and the superseded record.** Every file of the MyPaisa app v1 project (the Mini App and Browser boards, the Admin center, the Telegram chats and second check, the boards planned on 24 Oct 2026, and the Prototype), decoded, with the etag it was copied at in `claude-design.json`. The browser boards (named `Browser · ...` on the canvas) stay the web app's spec: picked before MA-161, with the sign-in page redrawn for Apple, Google and a passkey (MA-184, MA-185), and drawn again with the chat and the whole-wealth screens, at desktop and at phone width (390), on MA-193. The Mini App boards, the Telegram chats and the Prototype's Telegram flows are the superseded record; nothing is built from them. Where Arun picked a flow there (MA-156's 1b currency check, the Portfolio and Confirm cards of MA-34, the brief and alert cards of MA-55, the chart house style of MA-56), the iOS boards carry that pick's content and order into the app. |
| `dashboard/` | <https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp> | **The superseded record**, older still: the first design spec for the web app, before the Warm ledger browser boards in `app-v1/` replaced it. Five phone-size Mini App artboards in the Nocturne look: Overview, a holding, Overlap, Scorecard, and Overview in the light theme. These are Design-canvas sources (`.dc.html` plus `canvas.json`); they render on the canvas, not as standalone pages, because they reference the canvas runtime (`./support.js`). |
| `architecture.html` | <https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx> | Earlier: the animated architecture (v3), from before the queues, the identity design and the agent team. Kept for reference; superseded by `architecture-v4.html` (MA-244). The Lucid views and the four pages above are current. |
| `journeys.html` | <https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam> | Earlier: eight user journeys on a phone frame, in the Nocturne look. Superseded by `agent-journey.html`; kept for reference. |

All figures on these pages are illustrative. Nothing is built; see `PLAN.md`.

The pages use Google Fonts (Inter, JetBrains Mono, and for Inside MyPaisa
and Architecture v4 Nunito, the design system's rounded face) and nothing else from the network.
The standalone pages follow the viewer's light or dark theme.

## Two front doors

Decided on 2026-10-25 (MA-161; `reviews/MA-161/decision.md`), when the web
app was kept beside the iOS app, and made equal on 2026-10-26 (MA-186): the
web app is a full door with the chat, and every phase ships at both doors.
MyPaisa has two front doors to the same records:

- **The iOS app**, one app for iPhone and iPad on iOS and iPadOS 26, a React
  Native shell whose every visible piece is SwiftUI, as bong-panjika is
  built: the chat, where the household keeps its records, its cards and
  charts, the dashboard on iPhone, iPad and a foldable, and the owner's Admin
  center. Its spec is the MyPaisa iOS v1 project (`ios-v1/`).
- **The web app**, a SvelteKit 3 PWA in `web/` at
  `dashboard(-dev).mypaisapp.com`: the chat, the dashboard and the Admin
  center in a browser on a laptop, an iPad or a phone. Its spec is the
  browser boards in MyPaisa app v1 (`app-v1/`), at desktop and at phone
  width (390).

The screens, the figures, the cards, the look, the motion and rule 4 are
shared: anything new is created in the chat, and an existing figure the kind
marks editable is corrected in place on any screen. A screen changed at one
door is changed at the other in the same design round, so the two never
drift. The whole-wealth boards for both doors, and a clickable prototype at
desktop, phone web and iPhone, are drawn on MA-193.

## The iOS app: one spec, every size class

The app has one design spec, the MyPaisa iOS v1 project, not a spec per
device. Every piece a member looks at is SwiftUI, hosted in the React Native
shell (MA-165), so each board maps onto SwiftUI views. It never asks which device it is on; it lays itself out by size
class and window width, so every iPhone, every iPad window and a foldable,
folded or open, fit with no special case:

| | Compact | Regular, narrow | Regular, wide |
| --- | --- | --- | --- |
| Width | under about 600 pt, and every iPhone | about 600 to 900 pt | over about 900 pt |
| Where | every iPhone, in portrait or landscape; iPad Slide Over and one-third Split View; a foldable, folded | iPad in portrait; two-thirds Split View; a foldable, open; a Stage Manager window | iPad in landscape; a large Stage Manager window |
| Layout | the Liquid Glass tab bar at the bottom; one column; sheets for detail; the chat is a tab | a sidebar that collapses to a tab bar at the top; the chat as a sheet (beside the screen only over about 900 pt) | the sidebar, the screen, and the chat as a column beside every screen |
| Boards | the `iPhone` files | `iPad and foldable` | `iPad and foldable` |

**The shell is 1a, Chat first** (Arun's pick, 26 Oct 2026, MA-163).
`Shell options` draws the three that were offered, each on iPhone and iPad:
1a Chat first, 1b Ask from anywhere and 1c One timeline. They share every screen and differ in what the app opens to
and how the chat and the dashboard meet. The flow boards are drawn in 1a's
shell; a different pick changes the frame around the screens, not the
screens (MA-163).

**The look is MyPaisa DS v1, "Warm ledger", on Liquid Glass.** Arun picked
Warm ledger on 2026-10-24 (MA-101; `reviews/MA-101/decision.md`). Content
(the navy hero card, the warm cards, the lists, the charts, the chat's
messages) stays solid Warm ledger. Liquid Glass is only the layer of
controls that floats above it: the tab bar, the sidebar, toolbars, the
composer, the shortcut chips, menus, partial-height sheets and the search
field. Glass never sits on glass, and content is never glass. Only the
primary action of a control group is tinted, in coral; Confirm on a card is
a filled content button, not glass. The tokens and the iOS kit live in the
MyPaisa DS v1 project, copied into `ds-v1/`.

Every board is drawn in light and dark, and the boards for Dynamic Type up
to AX5 and for privacy mode show what changes. A screen changed at one size
class is checked at the others in the same design round. Name the boards by
screen, with the device first where a file holds more than one
(`iPad · Home with the chat beside it`, `Foldable · Folded`).

## The web app: the browser boards

A SvelteKit 3 app in `web/`, at `dashboard.mypaisapp.com` (`dashboard-dev`
for dev), installable as a PWA (`ARCHITECTURE.md` §9.4): the chat, Home and
the dashboard as it grows phase by phase (net worth, assets and one asset,
debts and one loan, Budget, Projection), Audit and Files, Activity, Search
and the owner's Admin center, on Tailwind CSS 4 over the tokens with
shadcn-svelte components and LayerChart charts, and the shared motion in
Motion 14, Svelte transitions and View Transitions (MA-229). Its spec is the browser
boards in MyPaisa app v1, at desktop and at phone width (390). Arun picked
the first of them before MA-161 (MA-70, MA-71, MA-78, MA-79); the sign-in
page is redrawn for Apple, Google and a passkey (MA-185); the chat and the
whole-wealth screens are drawn on MA-193; and the Admin center's boards stay
planned until their story starts (MA-184). Two columns at laptop width,
MyPaisa DS v1's adaptive shell below it. Name the boards by door and page
(`Browser · Overview`).

## Motion and legibility, on every board

- **Motion** (MA-182): one motion system for every component and chart, at
  both doors. Every board in MyPaisa iOS v1 and MyPaisa app v1 loads the
  shared `motion.css` and `motion.js`, so it moves the way the build will:
  SwiftUI's springs and glass morphs in the app, CSS, the Web Animations API
  and View Transitions in the web app. Nothing loops, and under Reduce
  Motion every step lands at once.
- **Legible at 25% brightness** (MA-181): Arun, "the text and component
  should be clearly visible even in 25% mobile brightness". Every colour
  pair in `ds-v1/tokens.css` and the glass fills passes
  `python3 scripts/contrast_check.py` in light and dark, at full brightness
  and dimmed to 25%; the dark tokens are tuned for it. No tertiary grey for
  anything a member must read, and glass carries labels only.

**The superseded record.** The Mini App boards, the Telegram chats and the
Prototype's Telegram flows in MyPaisa app v1 (`app-v1/`), the Telegram kit in
`ds-v1/`, and the Nocturne artboards in `dashboard/` are kept as the record;
nothing is built from them. Where Arun had picked a flow on them, the story's
design is `planned` again until he has seen its iOS rendering.

**The explainer pages.** `agent-journey.html` and `market-agent.html` were
updated for the app in MA-161: the brief, the alerts and the replies arrive
in the app and by push, the dashboard is in the app and the web app, and
the admin decides in the Admin center or the owner's chat.

## Keeping the designs, the plan and Jira in step

Since 24 Oct 2026 (MA-155) the boards, the plan and Jira are one record
(`.claude/rules/plan-sync.md`):

- every story with screens has its boards before it starts, named in
  `docs/trace.json` and rendered in `docs/TRACE.md`;
- boards drawn ahead of their story are **planned**; `/design-first` puts them
  through its options round when the story starts, and the pick makes them
  **picked**, the spec;
- the Claude Design files are copied into `ios-v1/`, `ds-v1/` and `app-v1/`
  with their etags; `/plan-sync` copies them again whenever one moves;
- `python3 scripts/plan_sync.py check` runs before every PR and in CI, and
  `python3 scripts/plan_sync.py start MA-<n>` before a story starts.
