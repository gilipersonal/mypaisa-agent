# Design artifacts

The design pages and diagrams, kept here as source so they live with the
code. The live versions are Claude artifacts and Lucid documents (private to
the account; share from each page's menu):

| File | Live page | What it is |
| --- | --- | --- |
| `agent-journey.html` | <https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7> | **MyPaisa Agent Journey** (MA-141, India added in MA-155, updated for the iOS app in MA-161): eighteen flows end to end, from the invite and signing in with Apple or Google through adding a holding, logging money, the 07:15 brief, a red alert, a question, the dashboard in the app and the web app, the Admin center, failures and replay, the spend ladder, the first of the month, money in any currency, the Indian portfolio import, the household in INR and GBP and India's day. Each flow is a numbered path across five lanes (member, the app, AWS, Claude, external data), the app's screens the member sees, its safeguards and the Jira stories that build it. Warm ledger theme, light and dark. |
| `market-agent.html` | <https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb> | **MyPaisa Market Agent** (MA-141, India woven through in MA-155, updated for the iOS app in MA-161): the market side end to end: what can be forecast, free data as it was known each day, the rules engine with its pillars, cascade and confidence, news matched to holdings, the Forecaster's five models, both engines side by side, the daily learning loop, the strategy layer, how it proves itself, self-healing and the budgets, with a section on India (sources, the India basket, FX, the import, cost and order). Warm ledger theme, light and dark; no script. |
| `lucid/` | [7 views and a sequence](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) | The architecture in Lucidchart on AWS 2024 shapes (MA-141), one document per view: 1 system overview, 2 environments and delivery, 3 identity and sign-in, 4 queues and replay, 5 data stores, 6 the market agent and the learning loop, 7 the agent team, caps and alerts, plus the adding-a-holding sequence. `01-overview.png` to `08-add-holding-sequence.png` are the exports embedded in `ARCHITECTURE.md`, which links each document; `aws-architecture.lucid.json` is the Lucid Standard Import file for the seven views, written by `gen_aws_architecture.py` (`python3 gen_aws_architecture.py out.json`, then import one page per document). |
| `ios-v1/` | [MyPaisa iOS v1](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8) | **The app's screens, in Claude Design, copied here** (MA-161). Every file of the MyPaisa iOS v1 project, each board in light and dark: `Shell options` (1a Chat first, 1b Ask from anywhere, 1c One timeline, on iPhone and iPad; Arun picked 1a on 26 Oct 2026), `iPhone sign-in`, `iPhone chat`, `iPhone dashboard`, `iPhone audit and activity`, `iPhone admin`, `iPhone settings`, and `iPad and foldable`. The shell is picked; the other boards are planned, drawn ahead of their stories. They are drawn in Claude Design and copied here by `/plan-sync`, with the etag each file was copied at in `claude-design.json`; each board names its Jira keys, and `docs/trace.json` says which story follows which board (see "Two front doors" below). |
| `ds-v1/` | [MyPaisa DS v1](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a) | **The design system, copied here**: tokens, foundations, components, the mark, and since MA-161 the iOS kit (`iOS kit.dc.html`: the Liquid Glass layers, colour assets, Dynamic Type, the tab bar and sidebar, toolbars and the composer, messages and cards, sheets and menus, charts, the app icon, accessibility) and `ios.css`, the kit's classes over `tokens.css`; the shared motion, `motion.css` and `motion.js`, which every board loads (MA-182; the kit's `12 · Motion` board draws it). The Telegram kit stays as the superseded record. |
| `app-v1/` | [MyPaisa app v1](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7) | **The web app's boards, and the superseded record.** Every file of the MyPaisa app v1 project (the Mini App and Browser boards, the Admin center, the Telegram chats and second check, the boards planned on 24 Oct 2026, and the Prototype), decoded, with the etag it was copied at in `claude-design.json`. The browser boards (named `Browser · ...` on the canvas) stay the web app's spec: picked before MA-161, with the sign-in page redrawn for Apple, Google and a passkey (MA-183, MA-184, MA-185). The Mini App boards, the Telegram chats and the Prototype's Telegram flows are the superseded record; nothing is built from them. Where Arun picked a flow there (MA-156's 1b currency check, the Portfolio and Confirm cards of MA-34, the brief and alert cards of MA-55, the chart house style of MA-56), the iOS boards carry that pick's content and order into the app. |
| `dashboard/` | <https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp> | **The superseded record**, older still: the first design spec for the web app, before the Warm ledger browser boards in `app-v1/` replaced it. Five phone-size Mini App artboards in the Nocturne look: Overview, a holding, Overlap, Scorecard, and Overview in the light theme. These are Design-canvas sources (`.dc.html` plus `canvas.json`); they render on the canvas, not as standalone pages, because they reference the canvas runtime (`./support.js`). |
| `architecture.html` | <https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx> | Earlier: the animated architecture (v3), from before the queues, the identity design and the agent team. Kept for reference; the Lucid views and the two pages above are current. |
| `journeys.html` | <https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam> | Earlier: eight user journeys on a phone frame, in the Nocturne look. Superseded by `agent-journey.html`; kept for reference. |

All figures on these pages are illustrative. Nothing is built; see `PLAN.md`.

The pages use Google Fonts (Inter, JetBrains Mono) and nothing else from the
network. Both standalone pages follow the viewer's light or dark theme.

## Two front doors

Decided on 2026-10-25 (MA-161; `reviews/MA-161/decision.md`), and corrected
the same day: Arun, "we have webapp for the dashboard and admin portal pwa
right? That will still be there for the read only dashboard". MyPaisa has
two front doors to the same records:

- **The iOS app**, one SwiftUI app for iPhone and iPad on iOS and iPadOS 26:
  the chat, where the household keeps its records, its cards and charts,
  the dashboard on iPhone, iPad and a foldable, and the owner's Admin
  center. Its spec is the MyPaisa iOS v1 project (`ios-v1/`).
- **The web app**, a read-only PWA in `web/` at `console(-dev).mypaisapp.com`:
  the dashboard and the Admin center in a browser on a laptop, an iPad or a
  phone, with no chat. Its spec is the browser boards in MyPaisa app v1
  (`app-v1/`).

The screens, the figures, the cards, the look, the motion and the read-only
rule are shared. A dashboard screen changed at one door is changed at the
other in the same design round, so the two never drift.

## The iOS app: one spec, every size class

The app has one design spec, the MyPaisa iOS v1 project, not a spec per
device. It never asks which device it is on; it lays itself out by size
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

One static app in `web/`, at `console.mypaisapp.com` (`console-dev` for dev),
installable as a PWA (`ARCHITECTURE.md` §9.4): Home, a holding, Overlap,
Scorecard, Audit and Files, Activity and the owner's Admin center, read-only,
with lightweight-charts and the shared motion in CSS, the Web Animations API
and View Transitions. Its spec is the browser boards in MyPaisa app v1,
which Arun picked before MA-161 (MA-70, MA-71, MA-78, MA-79); the sign-in
page is redrawn for Apple, Google and a passkey (MA-185), and the Admin
center's boards stay planned until their story starts (MA-184). Two columns
at laptop width, MyPaisa DS v1's adaptive shell below it. Name the boards by
door and page (`Browser · Overview`).

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
