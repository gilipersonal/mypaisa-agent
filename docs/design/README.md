# Design artifacts

The design pages and diagrams, kept here as source so they live with the
code. The live versions are Claude artifacts and Lucid documents (private to
the account; share from each page's menu):

| File | Live page | What it is |
| --- | --- | --- |
| `inside-mypaisa.html` | <https://claude.ai/artifact/NQecwzUjudjq1Kigri13g5> | **Inside MyPaisa** (MA-239): the whole architecture in plain words, with animations, for someone who is not technical. The four promises; the parts as a small office, coloured by what they are (screens, plumbing, AI, plain code, storage); the admin's journey in nine steps, each on an animated phone (signing in with Apple, the three setup questions, inviting a member, adding a record by talking, sending a factsheet, the dashboard with a correction in place that moves the laptop, a check-in, a statement and October's budget, a what-if with the Projection); a map of the system that plays one message through it in four journeys (a question, a file, a check-in, a failure and its replay); the nine agents of phase 13 and the admin desk's approval behind Face ID; the safety nets; the two environments; a day with MyPaisa. Figures from `figures/household-v4.json`. Warm ledger theme, light and dark; each step plays once in view and replays on demand, and every element rests in its final state without motion. |
| `architecture-v4.html` | <https://claude.ai/artifact/QputM7CuDn3Zv5s7TGyGL9> | **MyPaisa Architecture v4** (MA-244): the same architecture, technical and animated, on AWS-style service icons drawn in the page (no logo files are loaded). A stack summary; a system map of the two doors, the AWS account in `us-east-1` (API Gateway, the api, agent, sender, worker and stream Lambdas, the three SQS queues and their dead-letter queues, DynamoDB, the S3 lake and documents bucket, SSM, Cognito, CloudFront, the Scheduler, CloudWatch and SNS, and phase 13's Step Functions and EventBridge bus), Apple push and Web Push, the free data sources and the Anthropic API with Opus, Sonnet and Haiku, which plays five journeys hop by hop (a question, a factsheet, a check-in, the 07:15 brief, a failure and its replay) and inspects any part; one message as an OpenTelemetry trace with its GenAI span attributes; the concierge's Claude tool loop and its tools; the nine agents around the bus with the kind of agent each is, its models, what it does on its own, what it asks the admin and its budget share; the three models, what each is routed to and its price, with an interactive spend ladder and the guards; where the data lives; dev, prod and the release pipeline; the guardrails. Timings, tokens, costs and the bus events are illustrative. Warm ledger theme, light and dark; the journeys play once in view and on demand, and with reduced motion they step without moving. |
| `agent-journey.html` | <https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7> | **MyPaisa Agent Journey** (MA-141, India added in MA-155, updated for the iOS app in MA-161, the v4 flows added in MA-226): twenty-four flows end to end, from the invite and signing in with Apple or Google through adding a holding, logging money, the 07:15 brief, a red alert, a question, the dashboard in the app and the web app, the Admin center, failures and replay, the spend ladder, the first of the month, money in any currency, the Indian portfolio import, the household in INR and GBP and India's day, then registering anything by talking, correcting a figure in place, a check-in, a statement, the month close, and the Projection with a what-if. Each flow is a numbered path across five lanes (member, the app, AWS, Claude, external data), the app's screens the member sees, its safeguards and the Jira stories that build it. Warm ledger theme, light and dark. |
| `guardrails-evals.html` | <https://claude.ai/artifact/K4esevpFaFVYQKk2QAw3bT> | **MyPaisa Guardrails and Evals** (MA-258, from ARCHITECTURE §21, MA-245): how the agents are guarded and tested, with a Plain words / Technical switch: the five fences, the policy gate, the tests on change (T0, T1, T2), watching live, the judges and their calibration, growth through the manifest, what runs on a timer, the cost and the stories. Six animated diagrams; their GIFs (`guardrails-evals/`, captured frame by frame from the page) are on the Confluence page Guardrails and evals. |
| `tech-stack-observability.html` | [Confluence](https://duttaarun2015.atlassian.net/wiki/spaces/mypaisaaag/pages/197090) | **MyPaisa Tech Stack and Observability** (MA-265, MA-266, from `docs/RESEARCH.md` §6, `TECH_STACK.md` and `ARCHITECTURE.md` §3, §4.8, §7, §8.4, §9): the four-layer implementation stack, FastAPI, DynamoDB versus DocumentDB, the agent framework comparison, and end-to-end tracing and LLM observability with costing, with a Plain words / Technical switch. Six animated block diagrams; their GIFs (`tech-stack-observability/`, captured frame by frame from the page) are on the Confluence page Tech stack, FastAPI, DynamoDB, agents and end-to-end observability. |
| `cicd-security-regression.html` | [Confluence](https://duttaarun2015.atlassian.net/wiki/spaces/mypaisaaag/pages/197090) | **MyPaisa CI/CD, Security, Smoke and Regression** (MA-267 to MA-272, from `docs/RESEARCH.md` §7 and `ARCHITECTURE.md` §17.4): the GitHub Actions + AWS CodeBuild arm64 + ECR delivery pipeline for `dev` and `prod`, the seven-layer vulnerability scanning gate, the phase-progressive smoke runner (`scripts/smoke.py`) with `< 5 s` auto-rollback, the five-layer regression pyramid (`scripts/regression.py` across Phases 0 to 15), and the runner cost model (Option D at £0/month), with a Plain words / Technical switch. Four animated block diagrams; their GIFs (`cicd-security-regression/`, captured frame by frame from the page) are on the Confluence page CI/CD, vulnerability scanning, smoke and regression architecture. |
| `maestro-ios-ipados-testing.html` | [Confluence](https://duttaarun2015.atlassian.net/wiki/spaces/mypaisaaag/pages/197090) | **MyPaisa Local iOS/iPadOS Maestro Testing & Private TestFlight** (MA-167, MA-273, MA-274, from `docs/RESEARCH.md` §8 and `ARCHITECTURE.md` §8.1, §8.5, §17.4): the one-owner-per-device cloned simulator pool (`scripts/maestro_local.py`) beside interactive Maestro MCP, the React Native 0.88 Fabric + Swift 6 SwiftUI `mp.*` selector contract, the four-sub-band adaptive width and live-rotation matrix (`<600 pt` compact, `600–899 pt` sheet, `900–1132 pt` 13-inch upright MA-240 sheet, `>=1133 pt` 3-column chat-beside), the `xcrun simctl` Face ID / APNs / Universal Links / `AX5` capability playbook and Phase 0–20 rollout at £0/month, and the private 90-day (3-month) evergreen TestFlight household beta plan (`testFlightInternalTestingOnly = true`, silent automatic updates, day-60 keepalive renewal, zero App Store listing), with a Plain words / Technical switch. Five animated block diagrams; their GIFs (`maestro-ios-ipados-testing/`, captured frame by frame from the page) are on the Confluence page Local iOS and iPadOS Maestro testing and private TestFlight beta plan. |
| `aws-vpc-enterprise-lockdown.html` | [Confluence](https://duttaarun2015.atlassian.net/wiki/spaces/mypaisaaag/pages/197090) | **MyPaisa Optional AWS VPC Enterprise Lockdown, Data Perimeter & Costing** (MA-283, MA-284, from `docs/RESEARCH.md` §9, `PLAN.md` Phase 0 & Phase 15, and `ARCHITECTURE.md` §13, §14, §17.1, §17.4): the optional end-of-roadmap seven-layer AWS VPC enterprise lockdown blueprint (`enable_vpc_lockdown = false` by default, decided last after Phase 15), covering dual-stack non-overlapping `dev` and `prod` VPCs with VPC Block Public Access and zero-egress Isolated subnets, CloudFront OAC + Pro WAF + API Gateway mTLS origin lock (vs CloudFront VPC Origin + Internal ALB), free S3 and DynamoDB Gateway Endpoints with three-way `aws:SourceVpce` Data Perimeter `Deny` policies and bounded presigned upload/Audit preview carve-outs, Route 53 Resolver DNS Firewall default-deny allowlists + Graviton `t4g.nano` `fck-nat`/Envoy TLS-SNI egress proxies, private `arm64` CodeBuild runners, the four serverless VPC operational gotchas, the five-step zero-lockout rollout, and deterministic `us-east-1` costing across Option 1 (£729.91/month), Option 2A/2B (£149.01 and £70.39/month), and **preferred Option 3** (+£13.32/month in 3A, or +£24.86/month in preferred 3B inside the £50/month AWS cap), with a Plain words / Technical switch. Four animated block diagrams; their GIFs (`aws-vpc-enterprise-lockdown/`, captured frame by frame from the page) are on the Confluence page Optional AWS VPC enterprise lockdown, data perimeter and costing. |
| `argos-visual-a11y.html` | [Confluence](https://duttaarun2015.atlassian.net/wiki/spaces/mypaisaaag/pages/197090) | **MyPaisa Web Visual Regression & WCAG 2.2 AA Accessibility Pipeline with Argos CI** (MA-194, MA-269, from `docs/RESEARCH.md` §10, `TECH_STACK.md` §3 & §4, and `ARCHITECTURE.md` §8.4 & §17.4): the SvelteKit 3 (`web/`) visual regression, YAML `ariaSnapshot` accessibility tree diffing, and fail-closed `@axe-core/playwright` WCAG 2.2 AA pipeline on GitHub Actions (`ubuntu-24.04-arm`, 1x, Tokenless GitHub App OIDC), covering the "One Helper, Four Gates" `auditAndCapture()` fixture at `390x844` and `1440x900` in Light and Dark, the five engineering cost guardrails (including light-theme-only `ariaSnapshot` deduplication that saves 50% of ARIA quota), and the monthly snapshot quota math (~3,600 snapshots/month = 72% of Argos CI's 5,000/month £0 Free Hobby cap), with a Plain words / Technical switch. Four animated block diagrams; their GIFs (`argos-visual-a11y/`, captured frame by frame from the page) are on the Confluence page Web visual regression, ARIA snapshot diffing and WCAG 2.2 AA accessibility pipeline with Argos CI. |
| `lucid/` | [8 views and a sequence](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) | The architecture in Lucidchart on AWS 2024 shapes (MA-141), one document per view: 1 system overview, 2 environments and delivery, 3 identity and sign-in, 4 queues and replay, 5 data stores, 6 the market agent and the learning loop (from before MA-307), 7 the agent team, caps and alerts, 9 one trace from the door to the model (MA-236), plus the sequence of adding a record and correcting it in place. `01-overview.png` to `09-observability.png` are the exports embedded in `ARCHITECTURE.md`, which links each document; `aws-architecture.lucid.json` is the Lucid Standard Import file for the eight views, written by `gen_aws_architecture.py` (`python3 gen_aws_architecture.py out.json`, then import one page per document). |
| `ios-v1/` | [MyPaisa iOS v1](ios-v1/) | **The app's screens** (MA-161). Every file of MyPaisa iOS v1, each board in light and dark: `Shell options` (1a Chat first, 1b Ask from anywhere, 1c One timeline, on iPhone and iPad; Arun picked 1a on 26 Oct 2026), `iPhone sign-in`, `iPhone chat`, `iPhone dashboard`, `iPhone audit and activity`, `iPhone admin`, `iPhone settings`, and `iPad and foldable`. The shell is picked; the other boards are planned, drawn ahead of their stories. They are drawn and edited here (until 30 Oct 2026 they were drawn in standalone Claude Design and copied here), kept in git (MA-296); each board names its Jira keys, and `docs/trace.json` says which story follows which board (see "Two front doors" below). |
| `ds-v1/` | [MyPaisa DS v1](ds-v1/) | **The design system**: tokens, foundations, components, the mark, and since MA-161 the iOS kit (`iOS kit.dc.html`: the Liquid Glass layers, colour assets, Dynamic Type, the tab bar and sidebar, toolbars and the composer, messages and cards, sheets and menus, charts, the app icon, accessibility) and `ios.css`, the kit's classes over `tokens.css`; the shared motion, `motion.css` and `motion.js`, which every board loads (MA-182; the kit's `12 · Motion` board draws it). The earlier Telegram kit was retired from the live repo in MA-278 (git history keeps it). |
| `app-v1/` | [MyPaisa app v1](app-v1/) | **The web app's boards.** The browser boards in MyPaisa app v1, kept in git: picked before MA-161, with the sign-in page redrawn for Apple, Google and a passkey (MA-184, MA-185), and drawn with the chat and the whole-wealth screens, at desktop and at phone width (390), on MA-193. The earlier Mini App, Telegram and Nocturne (`dashboard/`) files were retired from the live repo in MA-278 (git history keeps them); where Arun had picked a flow there (MA-156's 1b currency check, the Portfolio and Confirm cards of MA-34, the alert cards of MA-55, the chart house style of MA-56), the iOS and web boards carry that pick's content and order. |
| `architecture.html` | <https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx> | Earlier: the animated architecture (v3), from before the queues, the identity design and the agent team. Kept for reference; superseded by `architecture-v4.html` (MA-244). The Lucid views and the pages above are current. |
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
  charts, the dashboard on iPhone, iPad and a foldable, and the Admin
  center. Its spec is the MyPaisa iOS v1 boards (`ios-v1/`).
- **The web app**, a SvelteKit 3 PWA in `web/` at
  `dashboard(-dev).mypaisapp.com`: the chat, the dashboard and the Admin
  center in a browser on a laptop, an iPad or a phone. Its spec is the
  browser boards in MyPaisa app v1 (`app-v1/`), at desktop and at phone
  width (390).

The screens, the figures, the cards, the look, the motion and rule 4 are
shared: only admins write; anything new is added, and a record deleted, only
in the chat, and an existing figure the kind marks editable is corrected in
the chat or in place on any screen; every other member views only (MA-308,
MA-309). Since MA-307 (2 Nov 2026) no board shows a stance, a market
forecast, a research card or a buy, hold or sell call. A screen changed at one
door is changed at the other in the same design round, so the two never
drift. The whole-wealth boards for both doors, and a clickable prototype at
desktop, phone web and iPhone, are drawn on MA-193.

## The iOS app: one spec, every size class

The app has one design spec, the MyPaisa iOS v1 boards, not a spec per
device. Every piece a member looks at is SwiftUI, hosted in the React Native
shell (MA-165), so each board maps onto SwiftUI views. It never asks which device it is on; it lays itself out by size
class and window width, so every iPhone, every iPad window and a foldable,
folded or open, fit with no special case:

| | Compact | Regular, narrow | Regular, wide | Regular, widest |
| --- | --- | --- | --- | --- |
| Width | under about 600 pt, and every iPhone | about 600 to 900 pt | about 900 to 1133 pt | from about 1133 pt |
| Where | every iPhone, in portrait or landscape; iPad Slide Over and one-third Split View; a foldable, folded | iPad in portrait; two-thirds Split View; a foldable, open; a Stage Manager window | a 13-inch iPad upright; a wide Split View pane or Stage Manager window | iPad in landscape, from the iPad mini up; a large Stage Manager window |
| Layout | the Liquid Glass tab bar at the bottom; one column; sheets for detail; the chat is a tab | a sidebar that collapses to a tab bar at the top; the chat as a sheet (beside the screen only from about 1133 pt) | the sidebar and the screen; the chat as a sheet, from the sidebar's Chat | the sidebar, the screen, and the chat as a column beside every screen |
| Boards | the `iPhone` files | `iPad and foldable` | the landscape boards, the chat column put away (`tokens.css`, MA-240) | `iPad and foldable`, `iPad v4` |

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
a filled content button, not glass. The tokens and the iOS kit live in
MyPaisa DS v1, in `ds-v1/`.

Every board is drawn in light and dark, and the boards for Dynamic Type up
to AX5 and for privacy mode show what changes. A screen changed at one size
class is checked at the others in the same design round. Name the boards by
screen, with the device first where a file holds more than one
(`iPad · Home with the chat beside it`, `Foldable · Folded`).

## The web app: the browser boards

A SvelteKit 3 app in `web/`, at `dashboard.mypaisapp.com` (`dashboard-dev`
for dev), installable as a PWA (`ARCHITECTURE.md` §8.4): the chat, Home and
the dashboard as it grows phase by phase (net worth, assets and one asset,
debts and one loan, Budget, Projection), Audit and Files, Activity, Search
and the Admin center, on Tailwind CSS 4 over the tokens with
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
  pair in `ds-v1/tokens.css` and the glass fills stays legible in light and
  dark, at full brightness and dimmed to 25%; the dark tokens are tuned for
  it. No tertiary grey for anything a member must read, and glass carries
  labels only. A bar's empty track is the `--mp-track` token on every board
  (MA-240).
- **Whole at every size** (MA-240): Arun asked, on 27 Oct 2026, that nothing
  overflow or overlap at any screen size and nothing break on a resize. Each
  board draws a screen at one size, and is drawn to stay whole through every
  size its class covers (an iPhone from 320 (Display Zoom) to 440 and in
  landscape, an iPad or foldable window from 600 to 1366, and the web from
  320 to 1920). The fit guards live in `tokens.css`: the page is a size
  container of its own, so with the chat beside it the page's width, not the
  window's, sets its columns; rows that scroll really scroll, a card's
  answers wrap, a hero figure shrinks to fit, and a list row's figure goes
  under its name. In `motion.js`, a narrow chart's axis labels thin where
  they would touch.
- **No checks on the boards' content** (MA-303): Arun, 2 Nov 2026: "All the
  6 checks currently run on docs/design. Lets stop that. I need this checks
  as QA when I ask, but on actual code implemented (probably using
  playwright and Argos CI tool)." `contrast_check.py`, `board_fit.js` (and
  its drawn-size diff), `a11y_live.js`, `prototype_smoke.js`, the board
  readers in `plan_sync.py` and the generators' `--check` no longer run, and
  nothing checks Prototype v5. Plan-sync still checks that a story's cited
  board file exists, that a UI story has a board before it starts, and that a
  board name matches its canvas. The QA is measured on the built web app by
  MA-304, QA on request, with the 25% brightness floors and the 320 to 1920
  width sweep; iOS QA comes after MA-165 (the iOS shell), with no story yet.
  svelte-check, eslint and vitest run on every PR touching `web/`;
  Playwright, axe and Argos run only when Arun asks (a manual run or a `qa`
  label; MA-303, MA-304).

**Retired Telegram and Nocturne files.** In MA-278 (31 Oct 2026), the earlier Mini App, Telegram and Nocturne (`dashboard/`) files and frames were removed from the live design folders so every live board is for the iOS app or the web app in a browser; git history preserves the retired record.

**The explainer pages.** `agent-journey.html` was
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
- the boards are drawn and edited here, in `ios-v1/`, `ds-v1/` and `app-v1/`
  (MA-260; Arun, 30 Oct 2026: "for all future design use Local folder and then
  Claude Artifact. Claude Design is going away, so no need to push to claude
  design"). Until then they were drawn in standalone Claude Design and copied
  here byte for byte (MA-259); nothing is read from or written to it again.
  Git is their only record (MA-296): there is no record file to update after
  drawing and no whole-set Artifact to republish;
- each design round's options are published as a private Claude Artifact,
  whose link Arun gets and comments on;
- `python3 scripts/plan_sync.py check` runs before every PR and in CI, and
  `python3 scripts/plan_sync.py start MA-<n>` before a story starts.
