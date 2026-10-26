# MyPaisa Agent — Build Plan (v4)

How the design in `ARCHITECTURE.md` gets built, in phases that each end with
something you can see at both doors and a test suite that proves it.

v2 moved the holdings registry and the ingestion through the chat to the
front, and added the engine port, the research cards, the dashboard and the
confidence calibration. v3 (MA-161, 25 Oct 2026) moved the chat to one native
iOS app for iPhone and iPad, signed in with Apple or Google, with no Telegram
bot.

v4 (MA-186, 26 Oct 2026) puts the household's whole wealth first, built
together with the agent, layer by layer: everything the family owns and owes
in the UK and India, each member's income and spending, and a Projection of
where it is heading, all registered and kept through the chat, with no forms.
In Arun's words: "Keep the entire structure dynamic. This is not a traditional
transaction SQL structure", and "The UI should only allow editing existing
figures by hand, no creation." So:

- both doors ship in every phase: the web app at desktop and phone width, and
  the iOS app;
- the web app has the chat: a SvelteKit 3 PWA at
  `dashboard(-dev).mypaisapp.com`, streaming over SSE;
- the iOS app is a React Native shell with a native SwiftUI core, because
  "Performance is key … silky smooth like Monzo";
- the phases are numbered in the order they are built: the wealth tracker
  comes first, as phases 2 to 9, and the market side follows as phases 10 to
  20, as already planned.

Status: planning. Nothing is built. The architecture is drawn in Lucid (seven
AWS views and a sequence, linked from `ARCHITECTURE.md`), and two pages walk
through the flows end to end:
[MyPaisa Agent Journey](https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7) and
[MyPaisa Market Agent](https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb)
(MA-141). Every phase is an epic in Jira project MA, and every deliverable
below is a story or task under it. Each phase ends with a demo you can click
at both doors and an update to the agent-journey page, so you can follow the
agent as it is built.

---

## Principles

1. **State first, then maths, then words.** You can record what you hold
   before anything analyses it; analysis works before Claude describes it.
2. **Port, don't reinvent.** The desk's indicator and pillar code is ported
   with its own self-tests as golden files; a port that disagrees with the
   original on its test cases is a bug.
3. **Prove it in shadow.** Stances are logged and graded for 8 weeks before
   they appear in weekday messages.
4. **Layman by default.** Every card ships with its simple top first; the
   technical section is added in the same change, never later.
5. **Cheap to run, cheap to stop.** Budget alarms exist before any paid API
   is called; `/pause` exists before the first scheduled message.
6. **Infrastructure is code; no keys anywhere.**
7. **Both doors in every phase.** Each phase ships at the web app, at desktop
   and phone width, and in the iOS app, and ends in a demo you can click.
8. **Create in the chat, correct in place.** Anything new is created in the
   chat: a card, Confirm and an audit row. An existing figure can be corrected
   in place on any screen. Both go through one write service, and every
   change writes its audit row.
9. **The structure is dynamic: kinds are data.** A new kind, or a new field
   on one, is a versioned spec, not a migration, a form or a screen.

---

## Phase 0 — Foundations at every door

Accounts, keys, CI, Terraform, a local stack and the empty skeletons of both
doors, so every later phase adds screens and flows, not plumbing. This phase
also holds the re-plan and its design round, so every screen of phases 1 to 9
is drawn and picked before it is built.

Yours:

- **The Apple Developer Program (MA-162).** Join ($99 a year, about £76;
  your yes first) and register two app ids, `com.mypaisapp.agent.dev`
  (MyPaisa Dev) and `com.mypaisapp.agent` (MyPaisa), each with Sign in with
  Apple, push and associated domains.
- **Apple's keys and records (MA-164).** An APNs key and a Sign in with Apple
  key per environment, put by hand into `/mypaisa-agent/<env>/apple/apns_key`
  and `.../apple/siwa_key` after the apply that made their parameters (the
  second signs the revocation of a leaving member's Apple token, MA-172); App
  Store Connect records for both apps with you and your wife as internal
  testers; an App Store Connect API key in the GitHub `prod` environment only.
- **Claude API access from the plan (MA-21).** Link a Claude Console
  organisation to your Max or Team plan (claude.ai Settings → Billing → API
  credits; 7 days on the plan first; the link cannot be moved later without
  support). In that organisation make two workspaces, `mypaisa-prod` and
  `mypaisa-dev`, with spend limits of $160 and $40 (together the Max 20x
  plan's $200 monthly credit, the agents' allowance; each limit is the hard
  cap behind that environment's Claude ceiling, `ARCHITECTURE.md` §15.1); no
  payment method and auto-reload off, so the credit is the last stop; and one
  API key in each; put each key into its own environment's SSM path,
  `/mypaisa-agent/dev/anthropic/api_key` and
  `/mypaisa-agent/prod/anthropic/api_key`. The Max 20x plan's monthly API
  credit ($200) then pays for every model call; it covers the Messages API
  and Batches, not Claude Code, and expires each cycle without rolling over.
- **Google's clients and Apple's Services ID (MA-143),** for MA-109's and
  MA-185's sign-in: a Google iOS client and a Google web client per
  environment, and a Sign in with Apple Services ID for the web app. Any Gmail
  account can own the Google Cloud project, no billing account is needed, and
  it has no link to AWS. The consent screen is "External" (a personal Gmail
  cannot choose "Internal") with only the basic email and profile scopes, so
  it can be published without Google's review. The iOS client is for that
  environment's bundle id; the web client (Google Identity Services) has the
  dashboard host as its JavaScript origin; neither secret is used; the ids go
  into that environment's SSM paths after the apply that made the parameters.
  Sign in with Apple needs the app id in the app (MA-162) and a Services ID
  with the dashboard host as its domain on the web.
- **Twelve Data (MA-22).** A free-tier API key into SSM at
  `/mypaisa-agent/dev/twelvedata/api_key` and
  `/mypaisa-agent/prod/twelvedata/api_key`. It is in every chain from day one:
  first for the US lines, the US macro basket, the earnings calendar and the
  FX fallback; second, behind yfinance, for London and Frankfurt closes. The
  source-comparison report shows whether the free tier serves those
  exchanges; nothing to check by hand.
- **The Monzo funds' files (MA-23).** Export the factsheet (PDF) and a
  valuation screenshot for each Monzo fund from the app, ready to send in the
  chat.
- **The data feed, decided.** Free sources first. yfinance (Yahoo Finance,
  unofficial, no key) for the LSE and Xetra closes and the funds' `0P…L` NAV,
  AMFI's NAV file for Indian mutual funds, Twelve Data's free tier for the US
  lines and FX fallback, the issuer pages, FT and the screenshot behind them.
  EODHD is the last resort: switched on only with the admin's approval when no
  free source can serve a holding or its history (Historian £19.99 a month,
  `ARCHITECTURE.md` §19.2).

Claude's:

- **The app icons (MA-20, MA-142)** from the 1c Watcher mark
  (`docs/mark-1024.png`, MA-103): MyPaisa, and MyPaisa Dev with its DEV band.
- **The repository skeleton (MA-24):** `CLAUDE.md` with the working rules;
  uv, ruff, pyright, pytest, pre-commit.
- **The PR gates in GitHub Actions (MA-25):** ruff, pyright, pytest with
  moto, `terraform fmt` and `validate`, tflint, the Terraform security scan,
  gitleaks, pip-audit, `jira-key`, and a plan for both environments on every
  PR touching `infra/`. The web gates join with the web skeleton (MA-194) and
  the iOS gates with the iOS project (MA-166).
- **Terraform bootstrap (MA-26):** `infra/modules/mypaisa` with the two roots
  `infra/dev` and `infra/prod`, each with its own state key in the existing
  state bucket; `infra/bootstrap`, applied once from the laptop, with the
  account's GitHub OIDC provider reused and three roles pinned to this
  repository's numeric id (`ci-plan`, `ci-dev-deploy`, `ci-prod-deploy`);
  `dev` and `prod` GitHub environments, prod needing your approval; the
  developer role with its explicit deny on `env=prod`; the zone and the
  certificate looked up by name (`ARCHITECTURE.md` §18.2); AWS Budgets at £75
  as the backstop behind the app's £50 cap (`ARCHITECTURE.md` §15.2, MA-137).
- **Secrets out of state (MA-159, done):** every secret's SSM parameter made
  by Terraform with a write-only placeholder (`value_wo`, `value_wo_version`;
  Terraform 1.11 or later, `hashicorp/aws` 5.87 or later), then overwritten by
  hand; no secret ever in state (`ARCHITECTURE.md` §14). So every "into SSM"
  item in this phase waits for the apply that makes its parameter (MA-26's,
  and for prod the first release): a value put first makes that apply fail.
- **The release pipeline (MA-107, MA-167):** a merge to `main` builds the
  Lambdas once, deploys dev and runs the smoke tests, sends MyPaisa Dev to
  TestFlight, then deploys prod after your approval behind each Lambda's
  `live` alias, rolling back on a failed smoke test, and sends MyPaisa to
  TestFlight. The nightly drift check follows (MA-108).
- **The web app's skeleton (MA-194):** `web/` in SvelteKit 3.1 (Svelte 5
  runes, adapter-static, Vite 8, TypeScript 6), a pnpm 12 workspace with one
  catalog of versions, as Smart Clearance's frontend is built; a PWA whose
  service worker caches the shell only; Tailwind CSS 4 over the DS v1
  tokens, shadcn-svelte on bits-ui, Lucide icons, TanStack Query, Table,
  Virtual and Form, shadcn-svelte's charts on LayerChart, and the shared
  motion in Motion 14 (MA-229); the association file served as itself by a
  CloudFront Function that sends only page paths to the shell, and the CSP
  carrying SvelteKit's hashes; an empty shell at 390 and 1440 in light and
  dark.
  `web/src/lib/` holds what both doors share, written once: the card types,
  formatting in GBP and INR with lakh and crore, privacy masking and the view
  models, and the api client with its TanStack Query definitions. Its gates:
  svelte-check, eslint, vitest, Playwright screenshots at 390 and 1440 in
  both themes with axe and a pixel parity check against the boards, pnpm
  audit.
- **The iOS app (MA-165, MA-166, MA-167):** `ios/`, a React Native shell
  with a native SwiftUI core, as bong-panjika is built: bare React Native
  0.88 with React 19.3, New Architecture, Hermes, TypeScript, no Expo, its
  native dependencies through Swift Package Manager from day one, never
  CocoaPods; TanStack Query on the shared query definitions, Reanimated,
  Gesture Handler and MMKV on Nitro Modules in the shell (MA-229). The shell owns the
  navigation (the system tab bar through Fabric), the store, the api and SSE
  client, sign-in, push registration and the shared models. Every piece a
  member looks at is SwiftUI, hosted through a Fabric component and fed one
  formatted JSON model: the chat timeline and its cards, the composer, the
  hero and figure rows, the in-place edit, Swift Charts and the sheets. The
  shared TypeScript comes from `web/src/lib/` by path, through Metro's
  `watchFolders` and a `#lib` alias. Liquid Glass and the iOS kit as picked;
  the Warm ledger colour assets generated from `tokens.css`; Dev and Prod
  configurations, with the bundle ids unchanged. A `PERFORMANCE.md` holds the
  benches, measured on the phone: no dropped frames at 120 Hz scrolling the
  chat and the dashboard and as cards arrive, a chart scrub at 120 Hz, and a
  launch budget. Its CI on a macOS runner (MA-166: Jest for the shell;
  XCUITest, snapshot and accessibility checks for the SwiftUI pieces) and the
  TestFlight lanes (MA-167).
- **The local stack (MA-198):** the whole app on the laptop: a moto server for
  DynamoDB, S3 and SQS (no Docker); the handlers behind one local ASGI app,
  the SSE stream included; the SvelteKit dev server and the iOS simulator
  pointed at it; a localhost-only sign-in stub, compiled out of every
  deployed build. The agent runs against the dev Claude key, or in a scripted
  mode that replays recorded conversations, which UI work, the end-to-end
  tests and parity with the prototype use.
- **The seed (MA-110):** dev and the laptop seeded and hydrated with one
  illustrative household of every kind, in the UK and India, with years of
  events (salary history, EMIs paid, valuations, SIPs, statements), from the
  design figure set (`docs/design/figures/household-v4.json`). A generator
  writes it through the write service; `scripts/seed.sh local|dev` loads it,
  the only way dev data is written; one command wipes and reseeds, and it
  refuses to run against prod.
- **The boards (MA-158, MA-160, MA-161):** boards for every story with UI
  drawn ahead of it in Claude Design (MA-158), with the board fixes found by
  its review and MA-156's applied there and copied in (MA-160); since MA-161,
  the iOS app drawn end to end in the MyPaisa iOS v1 project, with the iOS
  kit in MyPaisa DS v1.
- **The re-plan (MA-186):** "Re-plan: whole wealth first, both doors, clean
  phases". Jira's epics and stories, this plan, `ARCHITECTURE.md`,
  `TECH_STACK.md`, the README, the trace and the taxonomy changed together;
  docs only, nothing built.
- **The whole-wealth design (MA-193):** every screen of phases 1 to 9 drawn in
  Claude Design on DS v1, Warm ledger, from one illustrative figure set
  written first (`docs/design/figures/household-v4.json`): the browser boards
  at desktop and at 390 (the phone-web door) in MyPaisa app v1, and iPhone
  and iPad in MyPaisa iOS v1. Two or three options for the web shell with the
  chat, the dashboard, the check-in card and the Projection. Prototype v4, a
  clickable walk-through at desktop, phone web and iPhone: sign in, register,
  correct a figure, a check-in, a statement, the dashboard, the budget, the
  projection, a plan item, Activity. The glitch review in light and dark at
  every size class, and the contrast gate. Your samples (bank and card
  statements, a CAS, a broker export, payslips, an LIC statement) stay
  outside the repo in `~/mypaisa-samples/` and shape the statement boards,
  anonymised; nothing personal is committed. You pick, and only then is
  anything in phases 1 to 9 built.
- **The architecture drawings, redrawn (MA-225):** the Lucid pages and the
  sequence show the SSE stream on the api host, the web app at `dashboard`
  with the chat, Presence, kinds, records, events and views, and one write
  service for the chat's Confirm and an in-place correction.
- **The explainer pages walk the v4 flows (MA-226):** registering anything by
  talking, correcting a figure in place, a check-in, a statement, the month
  close and the Projection with a what-if, in the figures and the look picked
  on MA-193.
- **The boards still to draw (MA-227):** Budget and Assets and Debts on iPad,
  the check-in cards in the web chat, and the new-kind card behind the second
  check, which Arun settled on 26 Oct 2026.
- **The UI stack, and three build questions settled (MA-229):** the web app
  on Smart Clearance's stack (SvelteKit 3, Tailwind CSS 4, shadcn-svelte on
  bits-ui, TanStack Query, Table, Virtual and Form, LayerChart, Motion), the
  iOS shell on bong-panjika's (React Native 0.88, TanStack Query, Reanimated,
  MMKV), each at its latest; Swift Package Manager from day one; the
  association file served by a CloudFront Function; the stream on the api's
  REST API in API Gateway's streaming mode, through the Lambda Web Adapter
  1.1.
- **The plan in Confluence (MA-228):** the whole plan as a page tree in the
  mypaisaa-agent space, phase by phase and screen by screen, with the board
  previews, the design decisions, the explainers and the roadmap, generated
  from the repo; every story estimated in `docs/roadmap.json`, each phase
  epic's due date set from it; and the plan-sync check widened to Confluence
  and the code, with this repo's hooks.
- **Already done:** the architecture and its records (MA-106, MA-112,
  MA-138, MA-141, MA-150), plan-sync (MA-155) and the opt-in review (MA-157).

**Tests:** the skeleton's gates on the empty project; `terraform validate`
and a plan for both environments; the web shell's Playwright screenshots at
390 and 1440 in both themes, with the association file served, not swallowed
by the fallback (MA-194); the iOS shell's Jest and XCUITest runs and its first
bench (MA-165, MA-166); the scripted journey end to end on the local stack at
both doors (MA-198); the seed refusing to run against prod (MA-110).

**Exit:** `terraform plan` runs clean for dev and prod from CI through OIDC;
the gates run on every PR, the web gates on every PR that touches `web/` and
the iOS gates on every PR that touches `ios/`; the budget exists; dev's
Claude key, Twelve Data key, Google iOS and web client ids, Sign in with
Apple key and its key id, Apple team id, the app's bundle id (the audience
phase 1's sign-in checks), the Services ID for the web app, and the APNs key
and its key id are in SSM, over the placeholders dev's apply made; the empty
shells answer at `dashboard-dev.mypaisapp.com`, from TestFlight (MyPaisa Dev
builds in CI and installs from it) and on the laptop, each with the seed
household loaded. Prod's go in after prod's first apply (the release
workflow, MA-107; which phase holds it is open on MA-107, MA-108 and MA-142),
by the identity MA-21, MA-26, MA-142 and MA-143 name.

**Cost:** £0 in AWS; the Apple Developer Program, $99 a year (MA-162).

---

## Phase 1 — Talk: sign in and chat with the agent at every door

Both of you sign in and talk to MyPaisa on the laptop, in a phone's browser
and on the iPhone, and every run of the agent is visible. Every later phase
speaks through this chat (`ARCHITECTURE.md` §9). The stream is proved first,
with a spike, because both doors are built on it. What the chat records
arrives from phase 2.

- **The stream, proved first (MA-195).** A spike in dev: a Starlette app on
  Uvicorn behind the Lambda Web Adapter 1.1 (`response_stream`), as its own
  build target of the same Dockerfile; the stream on the api host, so the
  session cookie and the authorizer reach it, as a route of the api's REST
  API in API Gateway's streaming mode (MA-229). It passes when the first token delta reaches a browser
  and the iOS app in under a second, a killed connection resumes with nothing
  lost or repeated, and the cost per open hour is measured and put to you
  before any apply.
- **Identity on AWS from day one (MA-109, MA-32, MA-168, `ARCHITECTURE.md`
  §4.5):** a Cognito user pool per environment (Essentials); Sign in with
  Apple and Google, their identity tokens verified by custom-auth Lambda
  triggers (the providers' keys, audience, a five-minute issue time, the
  api's nonce, replay refused); passkeys; five-minute access tokens and
  rotating refresh tokens in the Keychain, and the member's session epoch.
  The first person to sign in becomes the household's owner (MA-32); Invite
  makes a one-time link, `https://dashboard.mypaisapp.com/join/<token>`, sent
  with iOS's share sheet, and joining creates the member's Cognito user;
  Members and devices lists and removes. The links' association file and the
  passkey's relying party sit on the dashboard host, decided in MA-109 before
  the first passkey exists. Isolation tests: a member cannot read another
  household, nor another member's detail unless shared.
- **The dashboard site (MA-73):** `dashboard(-dev).mypaisapp.com` on S3 and
  CloudFront serves the web app, the iOS app's association file and the
  invite page from this phase.
- **The web app's sign-in (MA-185):** sign-in with Apple, Google or a
  passkey in a browser, and the `HttpOnly`, `SameSite=Strict` session cookie
  on the api's host; CORS for that environment's dashboard only. The cookie
  is never widened to `.mypaisapp.com` while the apex still serves the old
  tracker.
- **The second check (MA-76):** a fresh Sign in with Apple or passkey under
  Face ID (a member who signs in only with Google signs in with Google again;
  in a browser a passkey or a fresh sign-in), bound to the action by the
  api's challenge and accepted only within five minutes. It comes with
  sign-in in this phase (Arun, 26 Oct 2026), so approving a new kind can sit
  behind it from phase 2 (MA-197); the Admin center (phase 8) and the imports
  (phase 9) reuse it.
- **The api at `api(-dev).mypaisapp.com` (MA-31, MA-75, MA-144):** `/auth/nonce`, `/auth/apple`,
  `/auth/google`, `/auth/passkey/options` and `/auth/passkey` (the web app's
  passkey sign-in, MA-109), `/v1/chat/messages` and `/v1/chat/actions` (each
  with the client's id), `/v1/chat/turns`, `/v1/uploads` (a presigned upload
  into the documents bucket), `/v1/devices` and `/v1/stream`; the authorizer
  checks the access token or the session cookie, the member's status and
  session epoch on every call and on the stream. The app and the web app
  reach each environment through it, and the dev build runs against dev or
  the laptop.
- **The stream at both doors (MA-30):** Server-Sent Events from
  `/v1/stream` on the api host. Replies stream in as they are written; cards,
  check-ins and `records.changed` arrive on the same stream, so a change
  confirmed on the phone moves the laptop's dashboard. A per-member sequence
  and an event log kept at least seven days: `Last-Event-ID`, or `?after=`
  after a reload, resumes the stream, and anything older gets `resync`. A
  turn buffer per turn carries the token deltas; a heartbeat every 15 s; the
  response ends at about 14 minutes with `retry`. A `Presence` row replaces
  the connection record, and push goes only to devices with no fresh
  presence. The clients read the stream with fetch, not EventSource, so a 401
  refreshes the token and reconnects; one leader tab per browser; the stream
  closes 60 s after the page is hidden; the server re-checks the member's
  status and session epoch every 60 s, so a sign-out lands at once (MA-102).
- **Queues from day one (MA-139, MA-140, `ARCHITECTURE.md` §21):** the chat
  api puts each message on the `updates.fifo` queue, one lane per member,
  deduped by the client id, and the `agent` Lambda reads it (MA-31); replies
  go through `outbox.fifo` and a `sender` Lambda that delivers over the
  stream to every open door, and by Apple push or Web Push to each device
  with no fresh presence (MA-30, MA-170, MA-200); background jobs (document
  reads, then ingest, check-ins and news as they arrive) through the `work`
  queue and a `worker` Lambda; retries with backoff, idempotent handlers, a
  dead-letter queue behind each with an alarm to the owner, and
  `scripts/redrive.sh` to replay.
- **One card format (MA-174):** every card is a versioned JSON document,
  drawn by Svelte components on the web and by SwiftUI in the app, with a
  plain line for notifications; a flow started on the laptop finishes on the
  phone.
- **The app (MA-163, MA-168, MA-169):** the shell Arun picked, 1a Chat first
  (tabs on iPhone; on iPad and an open foldable the sidebar; the chat beside
  every screen over about 900 pt, a sheet away from about 600 to 900 pt, and
  a tab in a compact window (every iPhone, a folded foldable, Slide Over)), built as the React Native shell with SwiftUI
  pieces (MA-165), which the web app follows; the sign-in screen with Apple's
  and Google's buttons; and the chat in a native SwiftUI timeline: the
  conversation, native cards from the agent's JSON, the composer with the
  camera, a document scan, Photos and Files, shortcut chips, the typed
  `/commands`, replies streamed word by word.
- **The iPad and open-foldable layouts (MA-70),** designed first at regular
  width from the MyPaisa iOS v1 boards: sign-in and the shell in this phase;
  each screen's regular-width board is built with that screen.
- **The web app's chat (MA-199):** the same conversation in a browser, beside
  the dashboard at desktop width and a tab at phone width, streamed over SSE;
  every card drawn from its JSON, with its chips and Confirm, Edit and
  Cancel; files and photos through a presigned upload, kept for good
  (MA-148); text typed offline sent once the browser is back online.
- **Activity at every door (MA-196, `ARCHITECTURE.md` §10):** a list of runs
  and one run's detail: its trigger, its steps, each tool call with its time,
  what it proposed, its tokens and its cost, every figure from the
  `RunRecord`.
- **Observability from the first Lambda (MA-29):** a `RunRecord` per run with
  model calls, tokens, cost and tool calls; Powertools Logger, Tracer and
  Metrics wired in the handler base; the error alarm per function to the
  owner.
- **The Claude meter and ceiling (MA-113, `ARCHITECTURE.md` §15.1):** every
  model call costed from the API's usage counts into the cycle's
  `SpendMonth` row, in dollars with pounds beside them; `BudgetSettings`
  seeded at $160 in prod and $40 in dev (the plan's $200 credit), its steps,
  guards and shares all settings; no call past 100% of the ceiling, the card
  going out as its template; the guards per member (60%), per day (three
  times the daily average) and per run (eight model calls); a message to the
  owner at 70% and 100%. Needed here because the `agent` Lambda calls Claude
  from this phase.
- **Chat memory (MA-115, `ARCHITECTURE.md` §8):** every message a `ChatTurn`
  row kept ninety days and never edited; only the current conversation sent;
  a conversation ends after thirty minutes of silence unless a question is
  waiting; a new one starts from the cached fixed part (one-hour TTL) and
  Haiku's one-line notes on recent conversations; past about 50,000 tokens it
  starts afresh from a summary.
- **Every file kept (MA-148):** every file and image a member sends kept in
  S3 for good, before anything reads it, with a `Document` row and an audit
  row; every change made from a file names it.
- **Motion (MA-182):** one motion system for every component and chart, in
  the app and the web app: springs, the glass morphs, figures that roll,
  charts that draw in and scrub, haptics, and Reduce Motion honoured
  (`ARCHITECTURE.md` §9.1).
- **Push, privacy and the rough edges of a phone (MA-170, MA-171, MA-172,
  MA-173, MA-181):** Apple push with no amounts on the lock screen unless
  asked; privacy mode everywhere, the app switcher's blank card and an
  optional Face ID lock; signing out a device and leaving the household; the
  last figures offline with their time and messages sent once back online;
  VoiceOver, Dynamic Type to AX5 and the other accessibility settings on
  every screen; every text and control legible in light and dark at 25% brightness, which
  `scripts/contrast_check.py` measures on every PR (ARCHITECTURE §9.1).
- **Web Push (MA-200):** a reply or a check-in reaches the installed web app
  when it is closed, only on a device with no fresh presence, under the same
  privacy rule as Apple push; the VAPID private key is a write-only SSM
  parameter whose value you put by hand.
- **Your accounts and devices (MA-72):** two-factor authentication on each
  member's Apple Account and Google account, and a passcode with Face ID on
  each device.

**Tests:** the spike's written report (MA-195); the chat api's security (no
token, an expired token, a token from the other environment, a paused
member) and the session cookie (missing, expired, from the other
environment, after sign out everywhere); CORS from another origin; one
member's messages in order while two members run in parallel; a duplicate
message (the same client id) ignored; a failure retried and then
dead-lettered with an alarm; an old message asking first; the invite flow
(single use, expiry, wrong household); the isolation rules; the custom-auth
triggers for Apple and Google (valid, expired, wrong audience, wrong nonce,
tampered, replayed, a removed member) and a dev token refused by prod;
sign-in in a browser by each door (an Apple or Google account linked to
nobody, a removed member, a paused member); the stream (deltas in order and
never twice, a resume from `Last-Event-ID` or `?after=` with nothing lost,
`resync` past the log, a sign-out or a pause reaching an open stream within
60 s, one leader tab); delivery by push (a closed app gets a push, an open
one does not, APNs' `retry-after`, a dead push token removed; Web Push with a
mocked push service); the meter costing recorded `usage` blocks to the cent,
a concurrent add, the 100% stop and each guard, and a cycle rolling over on
the renewal day; the stored history replaying byte for byte, a conversation
closing at thirty minutes but not while a question waits, and
`cache_read_input_tokens` above zero on the second message; a `RunRecord` on
success and on failure, shown in Activity; in the app, Jest for the shell and
XCUITest, snapshot and accessibility checks of every screen and card (iPhone
and iPad, light and dark, Large and AX5, privacy on) (MA-166); in the web
app, svelte-check, vitest, Playwright at 390 and 1440 in both themes, an axe
audit, and the service worker caching no figure.

**Exit:** you and your wife are members, each signed in on your own iPhone
with your own Apple or Google account, and in a browser on the laptop and on
a phone; each of you talks to MyPaisa at all three doors, and a reply streams
in word by word at every open door; a conversation started on the laptop
continues on the phone; Activity shows each run's steps, the tools it called,
its tokens and its cost; a reply that finishes while the app is closed
arrives as a push with no amount on the lock screen; each of you is a Cognito
user in prod; MyPaisa Dev runs on seeded data from TestFlight, and against
the laptop from the simulator; a merge reaches prod, and MyPaisa reaches your
phones, only after your approval.

**Cost:** about £0.50 (a few Claude calls); the stream inside the free tier
at about three open hours a day for four members (one leader tab, closed
when hidden; about $0.012 an open hour at 256 MB), priced by the spike and
put to you before any apply (MA-195); the Apple Developer Program from phase
0.

---

## Phase 2 — The first record: one dynamic structure, one write path

The household's first records, registered by talking and shown at both doors,
in a structure that grows without a migration (`ARCHITECTURE.md` §4).
Anything new is created in the chat, with a card, Confirm and an audit row;
an existing figure is corrected in place where it is shown; both go through
one write service. The simplest kinds come first (savings, cash, a
property's value, a pension's value), so the whole path is proved before the
maths arrives.

- **One dynamic structure (MA-27, `ARCHITECTURE.md` §4.1).** Kinds are data.
  Records are documents: `Record {kind, kind_version, owners[{member,
  share_pct}], country, ccy, liquidity, status, parent_id?, instrument_id?,
  attrs{}}`; an ISA account is a record and its funds are child records;
  `Instrument` stays the shared market reference. History is events: `Event
  {record, type, effective_date, payload{}, source, actor, document_id?}`,
  append-only, hash-chained with the audit log and never edited (a
  correction or a reversal is a new event); current state is the fold of its
  events through the kind's handlers. Figures are views: each record's value
  series, `NetWorth`, the budget month, commitments due and projection runs
  are materialised from events and rebuilt after a spec change, so the
  structure evolves with no migration. `Account`, `Position`, `Liability` and
  `Transaction` fold into Record and Event for the household's own records;
  there is no relational schema. Every item is keyed by the household and
  carries `schema_version`. A record ends as `closed`, `matured` or `sold`,
  never deleted.
- **Kind specs and the draft tools (MA-197, `ARCHITECTURE.md` §8).** A
  versioned kind spec holds its fields (typed; required, optional or derived;
  editable or not), its valuation method, the events it accepts, its
  commitment and check-in templates, its dashboard grouping (class,
  liquidity, country) and how it is presented. The valuation methods and
  event handlers are a fixed, tested code library (last figure, accrual,
  amortising, revolving, market-priced, and the PPF, EPF, NPS, SGB and LIC
  schedules) that specs only combine. The tools: `list_kinds`,
  `describe_kind`, `draft_record(kind, fields: [{name, text}])` and
  `draft_event(record, type, fields)`; code parses and types every value
  against the spec, derives what it can, and returns what is missing or
  uncertain; the draft is hashed in `PendingAction`, and Confirm commits
  exactly that draft. The agent asks only what is missing, one thing at a
  time, with chips, and never asks what it can look up. With `propose_kind`
  (the admin only, enforced in code) the agent proposes a new kind from the
  templates ("Sukanya Samriddhi: accrual at its rate to 21 years"); the admin
  approves it behind the second check (Arun, 26 Oct 2026), and it is
  versioned. No screen, form or tool is added.
- **One write service, and correction in place (MA-201, `ARCHITECTURE.md`
  §1, §9.3).** The chat's Confirm and an in-place correction go through one
  service: validated against the kind, written as an event, with its audit
  row. An existing figure that its kind marks editable (a value, a rate, a
  date, an amount, an assumption) is corrected where it is shown: tap it,
  type the new value, see the before and after, Save; the change is a
  `correction` event with its audit row (`via: inline_edit`). Nothing can be
  created in place. A member corrects their own records' figures and the
  admin anyone's.
- **The api's data routes (MA-74),** behind phase 1's authorizer: each
  member gets only what they may see, the JSON limited to it, and
  `PATCH /v1/records/{id}` accepts a correction only to a figure the kind
  marks editable.
- **The audit log from day one (MA-28, MA-40, `ARCHITECTURE.md` §4.6):** an
  `AuditEvent` row in the same transaction as every record change,
  hash-chained; `get_audit` and "what changed this week?" in the chat.
- **The first kinds (MA-203):** savings, cash, a property's value and a
  pension's value, each registered from one sentence or a screenshot, for any
  member, with joint shares where there are two owners; a property asks for a
  new valuation every six months.
- **Owners and joint shares (MA-33):** each member's records have their
  owners, and a joint record has two owners with their shares; each member
  registers their own, the admin can register for any member, and the card
  names the owner.
- **The chat's commands (MA-35):** onboarding, add, update, privacy, pause,
  resume and help, typed or from their shortcut chips.
- **Guided flows (MA-39):** with chips, for adding a record, logging an
  event, updating a valuation and changing a setting: one question per card,
  the same card edited in place, fields already given skipped; the
  `ask_user` tool and the `PendingAction` row with a day's expiry, holding
  several open flows keyed by flow id, so one flow arriving mid-way does not
  wipe another.
- **Reading a file (MA-37):** the `docs` Lambda reads a factsheet PDF or a
  valuation screenshot sent from the camera, a scan, Photos or Files with
  Claude on the Anthropic API (structured outputs, citations, per-field
  confidence), and the Confirm / Edit / Cancel card adds or updates a record;
  nothing saved without Confirm.
- **Money in any currency (MA-156, `ARCHITECTURE.md` §4.7):** every record
  keeps its currency from the Confirm card that added it; a parser in code
  reads £ $ € ₹, the codes, the words and lakh and crore; an amount in
  another currency than the record's is never saved as it is, and MyPaisa
  asks for the amount that arrived (the ECB-rate estimate joins in phase 3,
  with MA-44); the original amount, rate and source stay on the event.
- **The Confirm card and the Portfolio card, designed first (MA-34).**
- **Cards open their screens (MA-80):** each card opens its dashboard
  screen, and each screen's Ask opens the chat about it; a screen's Update
  opens the chat with the guided flow already started.
- **The first dashboard (MA-208, `ARCHITECTURE.md` §9.3):** the net worth hero
  and the records by class and by member, at both doors, in the shell of
  phase 1; a confirmed change reaches every open door over the stream and the
  figures move; privacy mode hides every amount.

**Tests:** a property test that every write, from the chat or in place,
produces exactly one event and one audit row, and the chain verifies; the
views rebuilt from events matching the running views; a new kind and a new
field added as data, with no migration; a fixture per kind; `draft_record`
typing every value, deriving what it can and listing what is missing;
Confirm committing exactly the hashed draft; every refusal of the write
service (a figure the kind does not mark editable, another member's record);
the Confirm state machine; an expired Confirm refused; the guided flows
(resume after a day, expiry, skipping fields already given, two members
mid-flow at once, two flows open for one member); extraction against three
real factsheets and three screenshots (fixtures with expected JSON); the
currency parser on every form (£ $ € ₹, codes, words, lakh and crore) and a
rupee amount against a pound record never saved as pounds; schema migration
on a v0 item; every data route against each role and member status;
Playwright and XCUITest for the in-place edit; the iOS scroll bench at 120 Hz
with no dropped frames.

**Exit:** you type "£5,000 in Monzo savings" on the iPhone; MyPaisa asks
whose it is and shows the Confirm card, and on Confirm the net worth on the
laptop's dashboard moves with no reload; you correct the figure in place on
the laptop (before and after, then Save) and the phone moves too; "what
changed this week?" lists both changes with who and when.

**Cost:** a few Claude calls per record registered, inside the ceiling;
nothing more in AWS.

---

## Phase 3 — Deposits, policies and two currencies

What grows at a known rate, in both countries, and every figure in pounds or
rupees.

- **Deposits, savers and policies (MA-93):** fixed and recurring deposits,
  UK savers, PPF, EPF, NPS and policies such as LIC, in the UK and India,
  registered through the chat from the kind specs of phase 2 (MA-197); an FD's
  `on_maturity` (renew, renew with interest, pay out); an RD with an annual
  step-up.
- **Wealth maths for what accrues (MA-94, `ARCHITECTURE.md` §6.6):** deposit
  and policy accrual, the maturity timeline and the daily `NetWorth` series,
  to the penny. The loan schedules follow in phase 4 (MA-204) and XIRR in
  phase 5 (MA-212).
- **The old tracker's maths as golden fixtures (MA-105):** the old wealth
  tracker holds no real data (its families are invented and nothing
  persists), but it has well-tested maths and a complete set of screens. Its
  `xirr.ts`, `amortisation.ts`, `forecast.ts`, `budget.ts` and `currency.ts`
  cases are ported as golden fixtures with a parity check, and its screens are
  listed for the Overview (MA-95). The family's real data arrives through the
  chat.
- **ECB rates, rupees included (MA-44):** ECB FX rates and market calendars
  loaded daily, INR in the FX chain; the ECB-rate estimate for an amount in
  the wrong currency (MA-156) joins here.
- **Pounds or rupees (MA-213):** net worth and every figure in GBP or INR, a
  switch per member, with the ECB rate and its date shown; rupees in lakh and
  crore; the two views agree to the penny at the day's rate.
- **What a maturity does (MA-202):** a check-in before and on the maturity
  date asks whether the deposit was renewed, paid out or moved; a renewal,
  with or without the interest, starts a successor record linked to the old
  one; nothing is deleted.

**Tests:** accrual for every deposit and policy kind against fixtures to the
penny, the old tracker's cases included; the maturity timeline; the daily net
worth; the ECB loader on recorded responses, rupees included; the GBP and
INR views of the same household agreeing to the penny at the day's rate, with
lakh and crore grouping; a maturity's check-in before and on the date; a
renewal starting its successor, and nothing deleted; Playwright and XCUITest
for the currency switch.

**Exit:** you register an SBI fixed deposit and a UK saver, a sentence each;
both accrue to the penny and their maturities show on the dashboard; the ₹/£
switch shows the household in rupees, in lakh and crore, or in pounds, with
the ECB rate and its date.

**Cost:** £0: ECB rates are free; nothing more in AWS.

---

## Phase 4 — Debts and check-ins

What the household owes, and the agent asking when something is due, so the
records stay current with a tap, not a form.

- **Loan maths (MA-204, `ARCHITECTURE.md` §6.6):** the EMI, the schedule, the
  interest and principal split, prepayment by term or by EMI, and
  preclosure, to the penny; events replayed in order (a prepayment, a rate
  change, a reset, a drawdown, a charge); the old tracker's amortisation
  cases as golden fixtures (MA-105). Split from MA-94.
- **Loans, mortgages and EMIs (MA-209):** a home loan, a mortgage, a car or a
  personal loan, an EMI and buy-now-pay-later, in the UK and India,
  registered from a sentence; dated terms (a floating-rate reset, a fixed
  rate that ends); a prepayment shortens the term or lowers the EMI, by
  country default; a balance checkpoint starts a loan part-way through
  without its history; closure marks the record closed.
- **Credit cards (MA-210):** each card kept as revolving debt from its
  statements (balance, due date, minimum); a card payment is a transfer, and
  only interest and fees count as spending; the statement's check-in asks
  paid in full, the minimum, or part.
- **Commitments and check-ins (MA-205, `ARCHITECTURE.md` §8):** a
  `Commitment` is any expected, dated money tied to a record or a member (an
  EMI, a card bill, a SIP, rent, a premium, a salary, a maturity, a valuation
  due); a `CheckIn` is one occurrence, keyed by the commitment and its due
  date and created once. A daily worker job decides in code, with no LLM, and
  puts each check-in card on the outbox, with push (no amounts on the lock
  screen, MA-170): "HDFC car loan: was November's EMI paid?" with Paid, Not
  yet, Different amount and Paid off in full. The card shows exactly what a
  tap writes, so Paid is the Confirm, with Undo; Not yet asks again in a few
  days, then shows as overdue; Different amount and Paid off in full open a
  short flow, and Paid off in full closes the record and ends the
  commitment. Several due at once share one card with All paid; for a joint
  record the payer is asked and the other owner told. This replaces the
  one-off reminders.
- **Autopay and the weekly digest (MA-211):** an autopay commitment is assumed
  paid after its grace period unless a statement or the member says
  otherwise, and a weekly digest lists what was assumed, which keeps the agent
  to about ten notifications a week.
- **The Debts and one-loan screens (MA-214, `ARCHITECTURE.md` §9.3, §12):**
  Debts shows the outstanding total, the EMI total and the interest left, by
  member; one loan shows its balance against its plan, the yearly split, the
  end date, prepayment what-ifs from the engine, its events and its files, at
  both doors.

**Tests:** the EMI, the schedule and the split against the old tracker's
amortisation cases to the penny; events replayed in order, with hypothesis;
preclosure and prepayment what-ifs; a loan started from a balance checkpoint;
one check-in per due occurrence, however often the job runs; Paid with Undo;
Not yet asking again, then overdue; Paid off in full closing the record and
ending the commitment; several due on one card; a joint record's payer asked
and the other owner told; no amount on the lock screen; an autopay
commitment assumed paid and listed in the digest; notifications near ten a
week on the seeded household; a card payment counted as a transfer; the Debts
and one-loan screens at both doors.

**Exit:** you register an HDFC car loan from a sentence; MyPaisa computes the
EMI, the schedule and the end date; when the EMI falls due the check-in card
asks whether it was paid, and one tap on Paid records it at every door; "Paid
off in full" closes the loan and ends its commitment.

**Cost:** check-ins are decided in code, with no LLM, so only the
conversations call Claude, inside the ceiling; nothing more in AWS.

---

## Phase 5 — Investments, priced

Shares, funds, bonds and gold in the UK and India, each inside its account,
priced every day from free sources, with its real return.

- **The `PriceSource` contract (MA-41) of `ARCHITECTURE.md` §5.1:** one
  plugin per feed (`yfinance`, `twelvedata`, `eodhd`, `issuer_page`, `ft`,
  `proxy`, `screenshot`, `stale`, and `amfi` for India), a registry that
  imports only the plugins in use, per-plugin identifiers on the instrument,
  and chains per kind set in `infra/<env>/terraform.tfvars` (and a `.env` for
  local). yfinance is the default chain head in every environment; the EODHD
  plugin ships with the others, switched on by putting it first in the chain
  and adding its key.
- **Daily prices, free (MA-207):** each holding priced every day from
  yfinance for listed lines and AMFI's NAV file for Indian mutual funds;
  London lines quoted in pence normalised to pounds; a failed or stale source
  is a normal day, the last price kept and marked. Split from MA-42 and
  MA-151: the fuller chains come in phase 10 (MA-42) and phase 19 (MA-151).
- **Investment kinds (MA-206):** shares, ETFs, OEICs, mutual funds, bonds and
  gold in the UK and India, inside their accounts (ISA, GIA, SIPP, demat, a
  mutual fund folio) as child records; the ISIN, ticker or AMFI scheme code
  found from a factsheet, a screenshot or a name; units and cost recorded;
  joint shares where there are two owners.
- **Plain-English transactions (MA-38):** "I put £200 into Balanced" via a
  strict `propose_change` tool and Confirm.
- **XIRR to the penny (MA-212, `ARCHITECTURE.md` §6.6):** for a holding, an
  account, a member and the household, from the dated ledger, against the
  old tracker's cases (MA-105); nothing returned, with the reason, when it
  cannot be computed. Split from MA-94.
- **No history, no invented return (MA-215):** a holding with no ledger is
  flagged, and the agent asks for past transactions (typed, a statement or a
  CAS) or an estimate; an estimate is labelled wherever the return shows and
  can be corrected in place.
- **SIPs and regular contributions (MA-216):** commitments that write a buy,
  not spending, for each instalment, with an annual step-up; the check-in
  asks whether it went through, was skipped or was stopped.
- **The Portfolio card (MA-36):** the household's and each member's holdings
  as a card at both doors, valued from the day's prices, with the Household /
  Me switch and, for the owner, a tab per member.
- **The Assets and one-asset screens (MA-217, `ARCHITECTURE.md` §9.3, §12):**
  Assets filtered by kind, member, country and maturity window; one asset
  with its value series, XIRR with its working, its events and files, and
  in-place correction of its editable figures, at both doors.

**Tests:** the plugin contract suite on recorded responses for yfinance and
AMFI (pounds, not pence; the stale rule; idempotence per date; a clean
failure when the source is down); XIRR against spreadsheet fixtures to the
penny, the old tracker's cases included, and the reason given when it cannot
be computed, with hypothesis; a typed transaction through Confirm; a fixture
per investment kind, each holding inside its account; an estimate labelled
wherever the return shows; a SIP instalment written as a buy, with its
step-up; the Assets and one-asset screens at both doors.

**Exit:** an ISA fund, an Indian mutual fund and a share are registered
through the chat and priced every day; each shows its XIRR with its working,
or, with no history, the agent asks for past transactions or an estimate.

**Cost:** £0 for prices: yfinance and AMFI's NAV file are free; nothing more
in AWS.

---

## Phase 6 — Budget: statements and monthly check-ins

What comes in and what goes out, each month, per member and for the
household, filled from statements and one short check-in.

- **Budget (MA-96):** each member's income and its history (past years'
  figures, so growth can be measured), from the chat or payslips, stored as
  income commitments; a monthly plan per category, the categories data you
  change by chat, EMIs and card payments from their commitments; the Budget
  screen with plan against actual per category, income, EMIs, the surplus and
  the savings rate, per member and for the household, in GBP or INR. The
  Projection that used to sit with the budget is phase 7.
- **Statements (MA-218):** a bank or card statement sent in the chat (PDF,
  CSV or XLSX; UK and Indian banks and cards), kept in S3 for good; each line
  categorised, the merchant memory first and Haiku for the unknowns; card
  payments, moves between your own accounts and EMIs matched to their
  commitments are recognised as transfers, so nothing counts twice; a
  payment on a statement answers its check-in; one review card by category,
  uncertain lines in amber, and one Confirm. A statement is routine, so it
  takes no second check. The parsers are built from your anonymised samples.
- **The month closed on the 1st (MA-220):** last month's plan against actual;
  the agent asks only for what no statement covered (cash, other banks) and
  closes the month with one Confirm.

**Tests:** statement parsers on anonymised fixtures from UK and Indian banks
and cards, in each format; every line categorised; transfers recognised, so
nothing counts twice; a payment on a statement answering its check-in; one
Confirm writing the month, and the file kept; the month closed on the 1st,
asking only for what was not covered; plan against actual per category, per
member and for the household, in GBP and INR; salary growth measured from
its history.

**Exit:** you send a bank statement in the chat; it comes back categorised,
transfers recognised, uncertain lines in amber, for one Confirm; the Budget
screen shows plan against actual.

**Cost:** Haiku only for the merchants the memory does not know, inside the
ceiling; nothing more in AWS.

---

## Phase 7 — Projection

Where the household's net worth is heading over the years, computed by code
and steered by the agent. **Forecast** stays the market's word (MA-52, the
Forecaster); **Projection** is the household's net worth over time, and
`ForecastAssumptions` becomes `ProjectionAssumptions`.

- **The engine (MA-219, `ARCHITECTURE.md` §6.6):** `wealth/projection.py`
  runs month by month to a horizon (thirty years by default), with a
  today's-money toggle. Its inputs: each record's country, which sets its
  inflation, wage-growth prior and tax drag, with GBP/INR drifting with the
  inflation gap; each member's current net salary, its growth blending the
  member's own measured history with the country's prior, weighted by the
  years of history; returns (contractual rates as given; a market asset's
  observed XIRR shrunk toward a long-run prior per asset class and country,
  by how much history it has; estimates as marked); debts amortising to their
  real end dates and freeing their EMIs; maturities, commitments, the
  budget's spend inflating by country, and the admin's plan items; the
  surplus allocated by a rule; and no locked pension covering a shortfall
  before it unlocks. The deterministic path first, then a Monte Carlo fan
  (p10, p50, p90); each run stored as a `ProjectionRun` with its inputs hash,
  seed, engine version, percentiles and milestones. It ports the old
  tracker's `forecast.ts`, `budget.ts` and `amortisation.ts` with their cases
  as golden fixtures, then extends them.
- **Priors by country (MA-221):** long-run returns per asset class and
  country, inflation per country with category overrides such as education
  and health, and wage growth per country, each versioned with its source;
  set by the admin, every change audited.
- **Plan items (MA-222):** future one-off or recurring income and spends, with
  a start, an end, a currency and a growth rate, created only in the admin's
  chat and corrected in place only by the admin, as are the saved
  assumptions; members see them; every change audited; no second check,
  since they change a plan, not the records.
- **What-ifs and the story (MA-223):** code produces every number; the model
  never does. The agent proposes the assumption set with a reason for each
  figure; answers a what-if ("what if we buy a house in 2028?") by filling a
  typed override whose numbers trace to the member's words or a named preset,
  shown as an unsaved scenario card; explains what drives the curve; and
  raises the trouble flags and milestones code computes. Members ask
  what-ifs but save nothing.
- **The Projection screen (MA-224, `ARCHITECTURE.md` §9.3, §12):** the fan in
  GBP or INR, in today's money or not; milestones on the line (loans ending,
  maturities, plan items); the assumptions panel with each source, editable
  in place by the admin; scenario chips; Ask; at both doors.

**Tests:** the engine against the old tracker's forecast and budget cases as
golden fixtures; debts amortising to their real end dates; a locked pension
never covering a shortfall before it unlocks; the shrinkage weight on
hand-computed cases; a Monte Carlo run reproduced from its stored seed; the
override validator refusing a number traced to neither the member's words
nor a named preset; plan items and saved assumptions refused to a member, in
the chat and in place; the Projection screen at both doors.

**Exit:** the Projection screen shows the fan with its milestones; you ask a
what-if and see an unsaved scenario; as the admin you add a plan item through
the chat and correct an assumption in place, each with its audit row.

**Cost:** the engine is code; only the assumptions, the what-ifs and the
narration call Claude, inside the ceiling; nothing more in AWS.

---

## Phase 8 — Audit, search and the Admin center at every door

Audit and Files, Search and the Admin center (members and devices, the second
check, the ceiling, caps and alerts, replay), at both doors, at
`dashboard(-dev).mypaisapp.com` and in the app. The dashboard's screens are
built with their records in phases 2 to 9.

- Built from the boards in MyPaisa iOS v1 and MyPaisa app v1
  (`docs/design/README.md`), on iPhone, iPad, the foldable and in a browser;
  Warm ledger (MA-101) on Liquid Glass; Swift Charts in the app and
  shadcn-svelte's charts on LayerChart on the web.
- **Audit (MA-71, MA-79, MA-149):** the §4.6 log, filtered by member, record
  and date, before and after, a link to the run, and the file behind a change
  opened through a five-minute link (Quick Look in the app), with a Files
  view, at every door. Activity, at every door from phase 1 (MA-196), gains
  the schedule board with last and next run and price freshness, this
  month's spend against the ceiling and the step it is on, and the last seven
  days of alarms (MA-71).
- **Search (MA-180):** finds a record, a change, a file or a past answer from
  anywhere.
- The Admin center's **Spend** section (MA-116), designed first like every
  screen: this cycle's spend by member, feature, agent and model against the
  ceiling, the step and the days left; the owner sets the ceiling (from $10
  to the hard limit), the member share, the renewal day and the hard limit,
  each behind the second check (MA-76, MA-102), each an audit row and a
  message to the owner; a ceiling that takes prod and dev together past the
  plan's credit warns that the extra needs a card and needs an explicit yes,
  and one above the hard limit is refused with the steps to raise the Console
  limit first.
- **Caps and alerts** (MA-137, `ARCHITECTURE.md` §15.2), in the same
  section: the Claude ladder's steps and guards; the AWS and others cap (£50),
  its steps (50%, 80%, 100%, forecast) and actions (dev pauses first; the
  brief, alerts and chat never stop), metered daily from Cost Explorer; the
  AWS Budgets backstop at £75 in Terraform; one alert router to the app's
  Alerts screen, push to the admin's devices and email through SNS (1,000 a
  month free), with quiet hours, cooldowns and a digest; "failed work" alerts
  from the dead-letter queues carry a Replay button (§21, MA-145).
- The Admin center's owner-only admin actions in the `api` Lambda, behind the
  authorizer of phase 1 and each behind the second check
  (`ARCHITECTURE.md` §9.3): the security actions (MA-102), the ceiling and
  caps with their alert routing (MA-116, MA-137) and replaying failed work
  (MA-145) in this phase; deciding agents' requests, rolling a setting back
  and closing an incident (MA-130, MA-135) join in phase 18; JSON limited to
  what that member may see.
- **The owner's security actions (MA-102):** signing out or pausing any
  member's devices from the Admin center.
- More than one way in (MA-77): a member adds a second sign-in, Apple or
  Google, or a passkey, from You; the owner can unlink one from the Admin
  center; every link, unlink and sign-in an audit row.
- **The web app's Audit, Files and Admin center (MA-184):** the same pages in
  a browser, from the browser boards in MyPaisa app v1, with the second check
  a passkey or a fresh sign-in for the owner's actions.
- **Already done:** the Warm ledger design system (MA-101) and the mark
  (MA-103).

**Tests:** the second check (a fresh assertion, one six minutes old, one for
another action, a replayed one, a Google member's re-sign-in); adding and
unlinking a second sign-in (the right account, one linked to another member,
unlinking the last one refused); every route against each role and each
member status; a token from the other environment; JSON shape; the Audit
screen showing a change made in the chat or in place within a minute; Search
finding a record, a change, a file and a past answer; snapshot tests of every
screen on iPhone, iPad and the foldable sizes in both themes, at Large and
AX5, with privacy on, and the accessibility audit; in the web app,
Playwright screenshots at 390 and 1440 in both themes.

**Exit:** you open the Admin center on your iPhone, on the laptop and in a
phone's browser; moving the ceiling asks for the second check and leaves an
audit row; the Audit screen shows the change you just made, with who and
when, and opens the file behind it; your wife sees her own view; a removed
member cannot get in.

**Cost:** £0.

---

## Phase 9 — The whole dashboard, and the old wealth tracker retired

The household's whole wealth on prod, complete at every door, and the old
tracker at `mypaisapp.com` switched off.

- **The Overview, complete (MA-95, `ARCHITECTURE.md` §12):** the hero (net
  worth in GBP or INR, switchable per member, with the ECB rate and its date,
  and the change since last month); liquid now, at maturity, and locked-in
  upside; where it sits; what is owed, and how it runs off; this month's cash
  flow; invested against owed, and where they cross; by member, and by
  country; maturing next; where growth comes from; the largest assets; and
  what is due (EMIs, maturities, open check-ins); from the old tracker's
  screen list (MA-105), at every door.
- **Reports, exports and the cutover (MA-97):** composition by type and
  institution, exports as GET routes; at cutover the apex `mypaisapp.com`
  redirects to `dashboard.mypaisapp.com`, the old tracker's `dev.` and prod
  distributions are retired, and the zone moves from the old tracker's
  Terraform to this repository's.
- **History import (MA-111, `ARCHITECTURE.md` §18.5):** one versioned Excel
  template sent in the chat, a dry run, Confirm with the second check, batch
  writes through the write service with audit rows, a fingerprint so a file
  sent twice adds nothing, and rollback by import id. Tested on dev's
  synthetic data first, then used to hydrate prod with the past investments
  XIRR needs. Prod is filled only through the app: the chat, statements and
  this importer.
- **Any question about the money (MA-104, `ARCHITECTURE.md` §12.1):** a
  nightly export of the household's events and views to Parquet in S3, and a
  `query_ledger_sql` tool that runs read-only DuckDB over that household's
  files only, for questions the structured `query_ledger` tool (MA-62)
  cannot express; the figures come from the result, and the SQL is shown
  under Technical; designed first.

**Tests:** the importer (a wrong template version, a bad row, the same file
twice, a rollback); every Overview figure matching the screen behind it; the
viewer's masked figures; the INR and GBP views of the same household
agreeing to the penny at the day's rate; `query_ledger_sql` reading only that
household's files; the apex redirect and the old distributions' retirement in
the Terraform plan.

**Exit:** the household's whole wealth is on prod, every figure entered
through the chat, statements or the Excel importer, and corrected in place
where needed; `mypaisapp.com` opens the dashboard, and the old tracker is
switched off.

**Cost:** about £1 a month more in Claude for the wealth phases' flows;
nothing more in AWS.

---

## Phase 10 — Prices and the engine

The maths, ported from the desk and extended. The `PriceSource` contract
(MA-41) and the minimal yfinance pricing (MA-207) landed in phase 5, so the
holdings are already valued every day; this phase completes the chains
(MA-42) and builds the engine on them.

- Price source chain: yfinance (`0P…L` ids for the funds, tickers for ETFs),
  BlackRock product page, FT tearsheet; Twelve Data for the US lines; ECB FX
  and calendars from phase 3 (MA-44). EODHD is not in the chain unless this
  phase shows the free sources missing or misreporting London closes.
- The source-comparison report: when two plugins are configured for an
  instrument, both are recorded and the Activity page lists disagreements;
  run yfinance against EODHD's free trial for the first month and decide
  from the numbers. Verify which source actually serves the Monzo funds' NAV, and record
  the answer in `docs/RESEARCH.md`. yfinance is unofficial and can break
  without notice, so the ingest job treats a failed or stale source as a
  normal day: it falls through the chain, marks the valuation provisional,
  and the 07:45 alarm fires only when every source has failed for two days.
- Proxy basket from the factsheet's top holdings; proxy-vs-NAV gap.
- Input hygiene: interpolated bars, provisional closes, STALE exclusion.
- `indicators`: the desk's stack ported to pandas, plus ATR, realised vol and
  percentile, drawdown, 12-1 momentum. Golden tests from the desk's
  self-tests (constant-series EMA, monotonic RSI, MACD = EMA12 − EMA26, flat
  %B) and from hand-checked fixtures.
- `pillars`: Trend, Momentum, Risk; `flags`; the holder's cascade;
  confidence v0 (agreement + persistence + quality, no history yet).
- `macro`: the desk's US basket ported; UK and EU baskets defined; per-instrument
  macro from look-through weights.
- Forecast ranges by block bootstrap.
- `ingest` and `engine` Lambdas on the 07:00 / 21:00 schedule; Signals and
  Stances written daily (stances in shadow).

**Tests:** the plugin contract suite, run against every plugin on recorded
responses (same `Bars` shape, pounds not pence, the stale rule, idempotence
per date, a clean failure when the vendor is down), with the recordings
refreshed only by a deliberate command; golden files for every indicator and pillar; property test that
local + FX = total; cascade cases for each action; macro regime cases from
the desk's synthetic generator; self-test gate.

**Exit:** five trading days of signals landing by 07:10 that match a manual
spot check; the desk's own test cases pass on the port.

**Cost:** £0.10 (£20 more with EODHD Historian).

---

## Phase 11 — Briefs, alerts, charts, technical mode

Claude starts writing on top of numbers that already work.

- Anthropic client with the key from SSM, model routing, caching, refusal
  fallback, number validator.
- Morning brief and evening wrap as cards, and by push; the Technical section
  on every card; `/technical` mode; the glossary on a tap.
- Charts: one house style in Swift Charts (MA-56); holding history with
  stance horizon shaded; portfolio curve; drawn in the card from the
  engine's series.
- Alert tiers, cooldowns, weekly red budget, quiet hours, Haiku repeat
  filter; alert tiers as push interruption levels (red time-sensitive with
  sound, amber passive); `I acted` and the decision log; dead man's switch and
  error alarms to the owner, in the app and by push.
- The ladder's lower steps (MA-114): at 85% of the ceiling the debate is
  skipped, the Saturday review drops to Sonnet, "Why?" is limited to three
  searches a day and sentiment scoring pauses; at 95% chat runs on Haiku and
  the brief, wrap and alerts go out as templates; alerts are never dropped.

**Tests:** validator catches an invented number; alert state machine with
frozen time; spend driven through each step of the ladder with frozen time,
checking which calls are made and on which model; card rendering from recorded Claude responses; chart snapshot
tests.

**Exit:** two weeks of briefs; no alert fires twice in its cooldown; a
layman reads the top of a card and understands it without the bottom.

**Cost:** about £5 a month.

---

## Phase 12 — Ask anything: research cards and scenarios

You can ask anything about what you hold.

- The tool loop with strict tools, `tool_choice` always `auto`; the
  composer's shortcut chips and each screen's Ask.
- Cards: `stance`, `holding-profile`, `overlap-review`, `fund-vs-benchmark`,
  `bear-vs-bull` (two calls and a judge), `scenario`.
- Anthropic's server-side `web_search` and `web_fetch`, results treated as
  untrusted text; `/why`.
- Natural-language preferences with Confirm.
- A holding's market view, its stance, signals and Technical section, shows
  at every door, on the one-asset screen of phase 5 (MA-183).

**Tests:** each card against fixtures; scripted conversations on recorded
responses; the judge never overrides the cascade's action; search results
containing instructions are not acted on.

**Exit:** ten real questions answered with sources; the overlap review on
your two funds shows the shared holdings and currency exposure.

**Cost:** about £9 a month cumulative.

---

## Phase 13 — Track record and calibration

- Forecast grader (range coverage, `P(fall>5%)` calibration).
- Stance grader: outcome at horizon, return vs doing nothing, by state
  bucket and confidence bucket; Brier score; reliability table.
- Confidence v1 with the history term; the 8-week recalibration rule with a
  logged change.
- `get_scorecard`, `/scorecard`; the Saturday review on Opus with the
  reflection step over the last four weeks.
- Overlap and Scorecard work at every door: iPhone, iPad, the foldable and
  the browser (MA-78).

**Tests:** grader on synthetic histories; calibration maths on hand-computed
cases; recalibration only after 8 weeks of evidence.

**Exit:** four Saturday reviews delivered; the reliability table shows
whether 70% means 70%.

**Cost:** about £12 a month cumulative.

---

## Phase 14 — News, events, sentiment (shadow)

- `news` and `score` Lambdas, event calendar, sentiment index, one line in
  the brief, `get_events` and `get_sentiment` tools.
- Sentiment tilt in the cascade, one notch, only when price pillars agree.

**Exit:** three weeks of indices; 30 scored articles spot-checked.

**Cost:** about £17 a month cumulative (£37 with EODHD).

---

## Phase 15 — Stances go live

- The go-live gate: 8 consecutive weeks above baseline, checked in code,
  reported every Saturday.
- Stance chips on the Portfolio card and in the brief; `/calls`.
- Guardrail review: no "sell everything" path exists; protected positions
  filtered; top-up suggestions capped by your preference.

**Exit:** the gate passes, or the review says why it has not and stances stay
in the Saturday review.

**Cost:** about £20 a month cumulative (£40 with EODHD).

---

## Phase 16 — New kinds of holding (when you add one)

Adding an iShares ETF from Monzo's "Build your own" range or, later, a share:

- The `/add` path already handles it (ISIN and ticker from the factsheet).
- A price source for the listing (EODHD or yfinance), already in the chain.
- For a share: the `valuation-snapshot` and `earnings-analysis` cards and a
  fundamentals source that covers the LSE; £59.99 a month more (£49.99 paid
  yearly) if EODHD Fundamentals is used. Decide then, not now.

---

## Phase 17 — The Forecaster: a second engine beside the rules engine

A second engine that learns from ten years of history and gives its own view
of each holding beside the rules engine, graded on the same track record, as
`ARCHITECTURE.md` §19. Epic MA-117. The goal is Arun's: fewer deep falls and
steady growth, so market mood and risk come first and direction last.

- **F1, data (MA-119).** Ten years, from 2015, of prices (each holding, the
  funds' top constituents, the indexes they track), the economy (FRED, Bank
  of England, ECB), market stress (VIX, credit spreads, dollar, oil, gold),
  world events (GDELT counts and tone, the geopolitical risk index) and the
  calendars, in Parquet with DuckDB; every row stamped with the date it was
  known; a daily refresh with a stale-feed alarm. Sources and prices as
  `ARCHITECTURE.md` §19.2: free first, EODHD Historian (£19.99 a month) for
  London, UK funds by ISIN and the back-fill, its free key tried on each fund
  first. Each holding's exposure map: a fund's holdings, countries, sectors
  and currencies; a share's company, sector, markets, suppliers and rivals; a
  commodity's drivers.
- **F2, the backtest lab (MA-120).** Any strategy replayed day by day with
  fees, OEIC next-day pricing and monthly contributions; worst fall, worst
  year, time underwater, growth and calibration against buy-and-hold and a
  trend rule. First report: today's rules engine over ten years.
- **F3, mood and risk (MA-121).** The market's mood each day and, per
  holding, four-week volatility and the chance of a fall over 5%, calibrated;
  in shadow.
- **F4, similar days and event impacts (MA-122).** The 30 most similar days
  since 2015 and what followed; the measured effect of rate and inflation
  surprises, elections, conflict, tariffs, pandemics and earnings misses on
  each holding; Haiku tags each day's news with the companies, countries,
  sectors, commodities and central banks it names, its event type and its
  direction, and code scores each story against each holding's exposure map,
  so the brief can say which stories touch which holdings (§19.3).
- **F5, direction (MA-123).** The chance of being up in four weeks, the
  likely range and its drivers, combined with F3 and F4 and calibrated;
  monthly retraining; model versions with their test scores; it switches
  itself off when its live record slips.
- **F6, the side-by-side view (MA-124).** Designed first: the chat's card
  beside the rules engine's call, with disagreement flagged, and a Forecast
  screen per holding in the app; shown for a holding only after 8 live
  weeks beating the base rate and the rules engine, in the Saturday review
  until then.
- **F7, risk-steered money (MA-125).** Contributions continue, tilted away
  from stressed holdings, with a trend filter, rebalancing bands and a
  drawdown budget the owner sets; shown as the suggested split on the
  first-of-the-month prompt.

**Order.** F1 and F2 can start any time after phase 10, and F2 tests the
rules engine early. F3 and F4 next (F4 needs phase 14's news), then F5; F6
needs a holding's market view (phase 12, MA-183) and the track record (phase
13); F7 needs F2 and F3.

**Tests:** no feature used before the date it was known; a strategy that peeks
at tomorrow caught by the lab; walk-forward folds with a gap and the last two
years held out; calibration curves; a known-answer backtest to the penny; the
event study against a hand-worked example; the switch-off; the card and the
screen from fixtures, with snapshot tests.

**Exit:** over ten years of walk-forward tests and 8 live weeks, the risk
forecasts beat the base rate; the steered contributions cut the worst fall and
the time underwater against buy-and-hold, within the growth trade-off you
set; both engines' views and records sit side by side in the chat and on the
dashboard.

**Cost:** the data is free apart from EODHD Historian, £19.99 a month; compute
a few dollars a month; Haiku filing the news under a dollar, inside the
Claude ceiling.

---

## Phase 18 — The agent team: configured, approved, self-healing, self-learning

MyPaisa becomes a small team of agents with narrow jobs, every behaviour a
setting the admin controls, every change outside a setting's band the
admin's approval in the chat or the Admin center, every prediction graded daily, and
repairs made where they are safe, as `ARCHITECTURE.md` §20. Epic MA-127. For
one household and its one admin, the owner.

- **E1, settings (MA-129).** Every behaviour a versioned `Setting` with a
  schema, a range, an automatic band and an approval rule; defaults in
  `config/defaults.yaml`; one settings service; a minute's cache; a daily
  snapshot to S3.
- **E2, the admin desk (MA-130).** Agents' requests and questions, and
  the admin's instructions, in the admin's chat and the Admin center
  (Approvals, Settings, Agents, Incidents); approval with the second check;
  a daily digest, incidents at once; designed first.
- **E3, the data steward (MA-131).** yfinance, Twelve Data's free tier and
  free websites first, with failover, gap repair and disagreement checks;
  EODHD only on an approved request showing the evidence and the price.
- **E4, the prediction store and daily grading (MA-132).** Every prediction
  kept as made in S3 and graded after each close; `ScoreDaily` in DynamoDB.
- **E5, daily calibration (MA-133).** Maps refitted daily on a rolling
  window, at most two points a day per bucket, used only when better, on 10
  days' probation with automatic rollback.
- **E6, challengers (MA-134).** Retrains, parameters and rule thresholds
  tried over ten years and in shadow; promoted only on evidence and the
  admin's approval; the old version restored if the new one slips.
- **E7, the ops warden (MA-135).** The daily run as one Step Functions state
  machine with retries; safe repairs on its own; an incident for the rest;
  heartbeats from every agent; dead-lettered work
  replayed on its own once its cause is healthy, at most three times, then an
  incident (MA-146).
- **E8, budgets for the team (MA-136).** Each agent's share of the plan's
  $200 Claude credit, metered by agent; paid feeds recorded as subscriptions
  against the AWS and others cap of MA-137.

**Order.** E1 and E2 can come forward once the Admin center and the second
check exist (phase 8, MA-102); E3 after phase 10; E4 and E5 once stances are
graded (phase 13); E6 with the Forecaster (phase 17); E7 and E8 alongside.

**Tests:** a member cannot reach the desk; approval without the second check
is refused; an agent cannot move a setting outside its band; grading never
runs before a horizon; calibration's daily step limit and rollback;
a challenger that does not beat the current version is never proposed;
injected failures at each pipeline step recover idempotently or open an
incident; metering by agent.

**Exit:** a month in which every change was either inside its band or
approved by the admin, every prediction was graded, calibration stayed
within tolerance, every failure was repaired or raised, and spend stayed
inside the $200 credit for the agents and the cap for AWS and others.

**Cost:** inside the two budgets; Step Functions, EventBridge and the extra
DynamoDB items sit in their free tiers at this volume.

---

## Phase 19 — Indian markets and the existing Indian portfolio

`ARCHITECTURE.md` §22, epic MA-147. Indian mutual funds, NSE and BSE shares
and ETFs beside the UK holdings, free sources first, and the household's
existing Indian portfolio loaded once with its whole history. The minimal
AMFI NAV pricing landed in phase 5 (MA-207), so Indian mutual funds are valued
every day from then; IN1 adds the history and the other sources.

- **IN1, Indian prices (MA-151).** The `amfi`, `mfapi` and `bhavcopy`
  plugins; yfinance with `.NS` and `.BO`; the kinds `in_mutual_fund` and
  `in_listed`; INR from the ECB with the RBI/FBIL rate behind it; NSE's
  holiday calendar; jobs after the Indian close.
- **IN2, the import (MA-152).** The detailed CAS from CAMS, KFintech or MF
  Central, the NSDL or CDSL CAS, and a broker's holdings and tradebook
  export; parsed in code, matched by ISIN, a dry run, one summary card,
  Confirm with the second check, rollback by import id; every file kept
  (MA-148); no PAN, address or account number in any record.
- **IN3, accounts and views (MA-153).** `demat`, `mf_folio`, `nre`, `nro`;
  INR with GBP beside it; wrapper-aware suggestions; the reporting-fund tax
  flag; rupees and pounds checked against each holding's currency both ways
  (MA-156); designed first.
- **IN4, the engine and the Forecaster (MA-154).** The India basket, Indian
  news and disclosures, the RBI's calendar; the Forecaster's gates as in
  phase 17.

**Tests:** synthetic CAS statements and broker exports import exactly once;
an unmatched ISIN is listed, not guessed; each Indian chain falls through to
stale; INR and GBP views agree with the FX of the day; golden tests for the
India basket.

**Exit:** a member sends their CAS and broker export, taps Confirm once, and
the Indian holdings with their history appear in the brief and on the dashboard
in INR and GBP, with the files they came from open from the Audit page.

**Cost:** £0 on the free path; a paid feed only on the admin's approval.

---

## Phase 20 — The app beyond the chat: widgets, Siri, the share sheet, Live Activities

MyPaisa reaches the household outside the app where iOS allows it (MA-175).
Each story is designed first; privacy mode holds everywhere.

- **A widget (MA-176):** the household's total and the day's move on the
  Home Screen and the Lock Screen, from the last fetch with its time; privacy
  mode shows the mark and "Hidden".
- **The share sheet (MA-177):** a factsheet or a screenshot shared from Mail,
  Files or Photos goes to MyPaisa and opens the chat on the reading card;
  nothing is saved before Confirm.
- **Siri and Shortcuts (MA-178):** "How is the portfolio today?" answered
  with the total and the day's move; "Log money into MyPaisa" opens the
  guided flow; never a write without Confirm in the app.
- **A Live Activity (MA-179):** an import (MA-111, MA-152) followed on the
  Lock Screen and in the Dynamic Island, with no amounts.

**Tests:** each widget, intent and the share extension from fixtures, in
light, dark, tinted and clear, with privacy on; the extension signs in
through the shared Keychain group and refuses when signed out.

**Exit:** the widget on your Lock Screen shows the household's day without
opening the app, and hides it when privacy mode is on.

**Cost:** £0.

---

## Reverse-engineering workbook

What is ported from where, so the work can be checked against the original.

| Source file | Target module | Port notes |
| --- | --- | --- |
| desk `scripts/indicators.py` | `engine/indicators.py` | Same seeds and smoothing; pandas vectorised; the four known-answer tests become golden files |
| desk `scripts/score.py` (`score_trend`, `score_momentum`, `_flags`) | `engine/pillars.py`, `engine/flags.py` | Unchanged logic; `partial` labelling kept |
| desk `scripts/score.py` (`decide`) | `engine/cascade.py` | Rewritten for a holder (ADD / HOLD / PAUSE / TRIM / REBALANCE / WATCH); the desk's two self-test scenarios kept as "must not produce ADD" / "must produce PAUSE or TRIM" cases |
| desk `scripts/macro_pillar.py` | `engine/macro.py` | US basket as is; `Basket` becomes a config with UK and EU entries; regime rules unchanged |
| desk `scripts/prepare_inputs.py` | `data/hygiene.py` | Rules kept; Robinhood field names replaced by our bar schema; fund NAV lag handled |
| desk `SKILL.md` guardrails and circuit breakers | the agent's system prompt, `CLAUDE.md`, `engine/selftest.py` | Numbers from code only; stale data → no scoring; self-test every run |
| toolbelt `src/tools/portfolio-review.ts` | `cards/overlap_review.py` | HHI, effective positions, harmonic-mean multiples; weights from values; `excluded` list; look-through overlap added |
| toolbelt `src/tools/stock-thesis.ts`, `bear-vs-bull.ts`, `valuation-snapshot.ts` | `cards/stance.py`, `cards/bear_vs_bull.py`, `cards/valuation.py` (later) | Card skeleton and enums; prompts rewritten for funds; structured outputs instead of fence-stripping |
| toolbelt `docs/watchlist-monitor-plan.md` | `alerts/` | Rule-based detectors on cached data; one digest per change set; state table of "what we last saw" |
| TradingAgents debate | `cards/bear_vs_bull.py` | Two calls and a judge, bounded to one round |
| ai-hedge-fund ledger and kill switch | `calls/ledger.py`, `/pause` | Hash-chained stance log; a flag every schedule checks |
| wealth-tracker `xirr.ts`, `amortisation.ts`, `forecast.ts`, `budget.ts`, `currency.ts` | `wealth/` (XIRR, schedules, accrual, budget, `projection.py`) | Their test cases become golden fixtures with a parity check (MA-105); the old tracker holds no real data, so nothing is imported; its screen list feeds the Overview (MA-95) |
| bong-panjika `frontend-native-apple/`, its `swiftui-first` and `native-apple` skills | `ios/` | The React Native shell with a native SwiftUI core, adapted (MA-165) |

---

## Timeline (estimated)

Every story is estimated in `docs/roadmap.json` (MA-228), and the dates below
are worked out from those estimates by `python3 scripts/roadmap.py write`. The
same dates are in Confluence (the Roadmap page) and on each phase epic in
Jira. To change a date, change an estimate or a setting there and run that
command; never edit this table by hand.

How the dates are worked out:

- **Build days.** A story's estimate is in build days, covering every door it
  touches. Claude builds and you review and test.
- **Buffer.** Each phase adds 20% for review rounds, its demo and fixes.
- **Side by side.** The web app and the iOS app are built in parallel, as you
  asked. So a phase's working days are its build days with the buffer,
  divided by 1.5.
- **Days off.** English bank holidays and a Christmas break are skipped.
- **Order.** The phases run in build order from Mon 2 Nov 2026, and phase 15
  waits for 8 weeks of shadow stances after phase 10.
- **Your tasks.** Tasks labelled `manual` are yours (the accounts and keys).
  They run beside the build and are due before their phase starts.

<!-- roadmap:start -->
| Phase | Build days | Working days | Starts | Target end |
| --- | --- | --- | --- | --- |
| 0 Foundations at every door | 31 (and 3 of yours) | 25 | Mon 2 Nov 2026 | Fri 4 Dec 2026 |
| 1 Talk: sign in and chat with the agent at every door | 81 (and 0.5 of yours) | 65 | Mon 7 Dec 2026 | Tue 16 Mar 2027 |
| 2 The first record: one dynamic structure, one write path | 45 | 36 | Wed 17 Mar 2027 | Mon 10 May 2027 |
| 3 Deposits, policies and two currencies | 18 | 15 | Tue 11 May 2027 | Tue 1 Jun 2027 |
| 4 Debts and check-ins | 19 | 16 | Wed 2 Jun 2027 | Wed 23 Jun 2027 |
| 5 Investments, priced | 23 | 19 | Thu 24 Jun 2027 | Tue 20 Jul 2027 |
| 6 Budget: statements and monthly check-ins | 12 | 10 | Wed 21 Jul 2027 | Tue 3 Aug 2027 |
| 7 Projection | 18 | 15 | Wed 4 Aug 2027 | Tue 24 Aug 2027 |
| 8 Audit, search and the Admin center at every door | 24 | 20 | Wed 25 Aug 2027 | Wed 22 Sep 2027 |
| 9 The whole dashboard, and the old wealth tracker retired | 14 | 12 | Thu 23 Sep 2027 | Fri 8 Oct 2027 |
| 10 Prices and the engine | 22 | 18 | Mon 11 Oct 2027 | Wed 3 Nov 2027 |
| 11 Briefs, alerts, charts, technical mode | 17 | 14 | Thu 4 Nov 2027 | Tue 23 Nov 2027 |
| 12 Ask anything: research cards and scenarios | 19 | 16 | Wed 24 Nov 2027 | Wed 15 Dec 2027 |
| 13 Track record and calibration | 13 | 11 | Thu 16 Dec 2027 | Mon 10 Jan 2028 |
| 14 News, events, sentiment (shadow) | 8 | 7 | Tue 11 Jan 2028 | Wed 19 Jan 2028 |
| 15 Stances go live | 5 | 4 | Thu 20 Jan 2028 | Tue 25 Jan 2028 |
| 16 New kinds of holding (when you add one) | 5 | 4 | When a new kind is added | |
| 17 The Forecaster: a second engine beside the rules engine | 32 | 26 | Wed 26 Jan 2028 | Wed 1 Mar 2028 |
| 18 The agent team: configured, approved, self-healing, self-learning | 23 | 19 | Thu 2 Mar 2028 | Tue 28 Mar 2028 |
| 19 Indian markets and the existing Indian portfolio | 14 | 12 | Wed 29 Mar 2028 | Thu 13 Apr 2028 |
| 20 The app beyond the chat: widgets, Siri, the share sheet, Live Activities | 10 | 8 | Tue 18 Apr 2028 | Thu 27 Apr 2028 |
<!-- roadmap:end -->

**Starting parts earlier.** Parts of phases 17 to 20 can start sooner if you
want them:

- F1 and F2 any time after phase 10;
- E1 and E2 after phase 8;
- IN1 after phase 10, and IN2 after phase 9's importer (MA-111);
- phase 20 after phase 9.

The table dates them in build order.

---

## Definition of done (every change)

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest --cov --cov-fail-under=90
terraform fmt -check -recursive infra
for env in dev prod; do terraform -chdir=infra/$env validate; done
tflint --recursive
# when web/ changed (MA-194): svelte-check, eslint, vitest, Playwright at 390 and 1440 in both themes, npm audit
(cd web && npm run check && npm run lint && npm test && npm run test:e2e && npm audit)
# when ios/ changed (MA-165, MA-166): eslint and Jest for the shell; XCUITest, snapshot and accessibility checks for the SwiftUI pieces
npm run lint --prefix ios && npm test --prefix ios
xcrun swift-format lint --strict --recursive ios
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)'
```

Plus: golden tests for any engine or wealth maths change, the old tracker's
cases included; a card change ships with both its simple and technical
rendering at both doors, and a screen change its Playwright screenshots and
its snapshot tests in both themes; the web budgets hold (INP ≤ 200 ms and
LCP ≤ 2.5 s on a mid phone, 60 fps scroll), and so do the iOS benches in
`PERFORMANCE.md` (no dropped frames at 120 Hz); no secret anywhere; cost
stated when a paid API is touched; every new write path, the in-place
correction included, produces its event and its audit row, and every new
handler writes its `RunRecord`, both covered by tests.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| No reliable daily NAV source for the Monzo funds | Four-deep source chain; proxy basket; the screenshot path always works |
| Factsheet extraction misreads a figure | Per-field confidence, citations, amber fields, Confirm before save |
| The ported engine drifts from the original | Golden tests from the desk's own self-tests |
| The wealth maths drifts from the old tracker's | Its tested cases as golden fixtures with a parity check (MA-105); XIRR, schedules and accrual to the penny |
| A kind spec writes something the code cannot value | Specs only combine a fixed, tested library of valuation methods and event handlers; a new kind is approved by the admin behind the second check and versioned; views rebuild from events with no migration (MA-197) |
| An in-place correction changes what it should not | Only the figures a kind marks editable, by the record's owner or the admin; one write service; a correction is a new event with its audit row, never an edit (MA-201, MA-74) |
| A Projection read as a promise | Every figure from the engine, never the model; estimates marked; every assumption with its source; the fan, not one line (MA-219, MA-223) |
| A holder's cascade that is too eager to ADD | PAUSE on exhaustion or elevated risk; top-ups capped; shadow mode first |
| Confidence numbers that are not calibrated | Weekly reliability table; recalibration rule; "no clear view" below 55% |
| The SSE stream costs more than planned while idle | Each open stream is a running Lambda, about $0.012 an open hour at 256 MB; one leader tab per browser, the stream closed 60 s after the page is hidden, reserved concurrency of about 20; the spike measures the cost per open hour, and it is put to you before any apply (MA-195) |
| CocoaPods trunk goes read-only on 2 Dec 2026 | Settled (MA-229): the iOS project starts on Swift Package Manager with React Native 0.88 (opt-in, hardened in 0.88) and never uses CocoaPods; a native library that cannot build with it is replaced (MA-165) |
| The React Native shell is not smooth enough | Every piece a member looks at is SwiftUI, fed one formatted model; `PERFORMANCE.md` benches on the phone: no dropped frames at 120 Hz scrolling the chat and the dashboard and as cards arrive, a chart scrub at 120 Hz, a launch budget (MA-165) |
| The web app's fallback swallows the iOS association file | Settled (MA-229): there is no S3 error-page fallback; a CloudFront Function sends only extension-less page paths to the shell, and the file is served as itself with `Content-Type: application/json`, with a test for it (MA-73, MA-194) |
| A new app meets an old api, or a TestFlight build expires | The api states its minimum app version and an older app asks to update; prod's Lambdas go live before the prod app; an alert at day 60 of a build's 90 (MA-167) |
| A card the app does not know yet | Every card carries a plain line; an unknown type or newer version shows it with "Update MyPaisa to see this card" (MA-174) |
| Alert fatigue, or too many check-ins | Weekly red budget, cooldowns, repeat filter; autopay assumed and a weekly digest, about ten notifications a week (MA-211) |
| An agent changes something it should not | One settings service enforcing schema, range and band; approval with the second check for anything outside the band; every change a version and an audit row; secrets and infrastructure out of agents' reach |
| Self-tuning chases noise | Calibration moves at most two points a day with a probation and rollback; rules and models change only on weeks of evidence and the admin's approval |
| Too many requests for the admin | Automatic bands for safe changes, a daily digest, incidents only when urgent, rejected requests not repeated within their period |
| A Forecaster model that learned the past by heart | Walk-forward tests with a gap, the last two years held out, calibration checks, 8 live weeks before it is shown, and a switch-off when its record slips |
| Look-ahead: a backtest that saw the future | Every row stamped with the date it was known; the lab refuses a strategy that peeks at tomorrow |
| Two engines disagreeing confuses the household | Both shown side by side with their track records; the disagreement is said out loud; the rules engine stays the default |
| A message or a job is lost when something fails | Every hand-off through an SQS queue with retries and backoff; idempotent handlers; a dead-letter queue behind each with an alarm, a copy in S3, and replay by script, button or the ops warden |
| Cost overrun | The Claude ceiling's ladder steps down at 85% and 95% and stops at 100%; guards per member, per day and per run; the Console workspace limit as the hard backstop; AWS Budgets for AWS; `/pause` |
| Prompt injection via news, a PDF or a statement | Untrusted text marked; no dangerous tools exist; Confirm on every write |
| A phone lost or stolen | Tokens in the Keychain on that device only; five-minute access tokens; the data routes only read, apart from corrections to the figures a kind marks editable, each an audit row; status and epoch re-checked on every call and on the stream; the owner signs that device out or pauses the member (MA-102); the optional Face ID lock (MA-171); every admin action needs the second check |
| A change meant for dev reaches prod | Separate state per environment; the developer role denied on `env=prod`; prod applied only by CI after your approval; the nightly drift check |
| An import writes bad history into prod | Dry run first; fingerprints stop duplicates; Confirm with the second check; rollback by import id; tested on dev first |
| Observability that costs more than the app | Ten metrics, one dashboard, sampled traces, fourteen-day logs, `RunRecord` rows that expire after ninety days |
| OIDC trust mismatch on first deploy | Pin this repository's ids; read CloudTrail |
