# MyPaisa Agent — Build Plan (v5)

How the design in `ARCHITECTURE.md` gets built, in phases that each end with
something you can see at both doors and a test suite that proves it.

v2 moved the holdings registry and the ingestion through the chat to the
front, and added the dashboard. v3 (MA-161, 25 Oct 2026) moved the chat to
one native iOS app for iPhone and iPad, signed in with Apple or Google, with
no Telegram bot.

v4 (MA-186, 26 Oct 2026) put the household's whole wealth first, built
together with the agent, layer by layer: everything the family owns and owes
in the UK and India, each member's income and spending, and a Projection of
where it is heading, all registered and kept through the chat, with no forms.
In Arun's words: "Keep the entire structure dynamic. This is not a traditional
transaction SQL structure", and "The UI should only allow editing existing
figures by hand, no creation."

v5 (MA-307, 2 Nov 2026) makes MyPaisa a wealth tracker only. In Arun's words:
"This is an Agentic AI based Wealth Tracker only where I can make smart
budget expenses and forecast my wealth growth based on actual numbers like
CAGR and XIRR. Everything will be prompt driven." The market side is retired
whole: no rules engine, no stances and no buy, add, hold, pause, trim or sell
call, no research cards, track record, news or Forecaster. So:

- both doors ship in every phase: the web app at desktop and phone width, and
  the iOS app;
- the web app has the chat: a SvelteKit 3 PWA at
  `dashboard(-dev).mypaisapp.com`, streaming over SSE;
- the iOS app is a React Native shell with a native SwiftUI core, because
  "Performance is key … silky smooth like Monzo";
- everything is prompt driven: only admins write, adding and deleting only in
  the chat and correcting in the chat or in place; every other member views
  only (MA-308, MA-309);
- a team of agents keeps the records, the budget and the wealth forecast (the
  Projection and the Budget forecast) current from the household's actual
  numbers: XIRR and CAGR from the dated ledger, rates, salaries, debts,
  commitments and plans; daily prices exist only to value holdings;
- the phases are numbered in the order they are built: the wealth tracker
  as phases 2 to 9, then alerts and charts, asking anything, new kinds, the
  agent team, Indian holdings and the app beyond the chat as phases 10 to 15.

Status: planning. Nothing is built. The architecture is drawn in Lucid (eight
AWS views and a sequence, linked from `ARCHITECTURE.md`), and a page walks
through the flows end to end:
[MyPaisa Agent Journey](https://claude.ai/artifact/HPcNrDt2TvR2hdMBzjFE9u)
(MA-141), and [Inside MyPaisa](https://claude.ai/artifact/NQecwzUjudjq1Kigri13g5) explains the whole of it in
plain words, from the first screen to the chatbot and the agent team
(MA-239), and [MyPaisa Architecture v4](https://claude.ai/artifact/Ns3DLFTCvnLcBxJvRvygBo) draws it technically, with
every agent and the Claude model it uses (MA-244), [MyPaisa Guardrails and Evals](https://claude.ai/artifact/K4esevpFaFVYQKk2QAw3bT) shows how the agents are guarded and tested, plainly or technically (MA-258), and [MyPaisa Tech Stack and Observability](docs/design/tech-stack-observability.html) sets out the four-layer implementation stack, FastAPI, DynamoDB versus DocumentDB, the agent framework comparison, and end-to-end tracing and LLM observability with costing (MA-265). Every phase is an epic in Jira project MA, and every deliverable
below is a story or task under it. Each phase ends with a demo you can click
at both doors and an update to the agent-journey page, so you can follow the
agent as it is built.

---

## Principles

1. **State first, then maths, then words.** You can record what you hold
   before anything analyses it; analysis works before Claude describes it.
2. **Port, don't reinvent.** The old wealth tracker's maths (XIRR,
   schedules, accrual, budget, the forecast) is ported with its own tests as
   golden files; a port that disagrees with the original on its test cases
   is a bug.
3. **Actual numbers, never a market call.** Every figure and every forecast
   comes from the household's own records: XIRR and CAGR from the dated
   ledger, rates, salaries, debts, commitments and plans. Prices only value
   what is held; nothing predicts a market or says buy, hold or sell.
   Options code computes from the household's own cash flows (pause or
   reduce a SIP, trim a category) are shown as options, never as calls
   (`ARCHITECTURE.md` §1, rule 2).
4. **Layman by default.** Every card ships with its simple top first; the
   technical section is added in the same change, never later.
5. **Cheap to run, cheap to stop.** Budget alarms exist before any paid API
   is called; `/pause` exists before the first scheduled message.
6. **Infrastructure is code; no keys anywhere.**
7. **Both doors in every phase.** Each phase ships at the web app, at desktop
   and phone width, and in the iOS app, and ends in a demo you can click.
8. **Only admins write; everyone else views.** An admin adds and deletes
   only in the chat (a card, Confirm, the second check for a delete, an audit
   row) and corrects an existing figure in the chat or in place on a screen.
   A delete marks the record `deleted`, restorable, its history kept. Every
   other member views only, their own preferences aside. All of it goes
   through one write service, and every change writes its audit row
   (MA-308, MA-309).
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
- **Apple's keys and records (MA-164, MA-167).** An APNs key and a Sign in with Apple
  key per environment, put by hand into `/mypaisa-agent/<env>/apple/apns_key`
  and `.../apple/siwa_key` after the apply that made their parameters (the
  second signs the revocation of a leaving member's Apple token, MA-172); App
  Store Connect records for both apps (`MyPaisa Dev` Internal Group `"Dev Dogfood"`
  for you alone, and `MyPaisa` Internal Group `"Household Beta"` with your wife
  and household members invited under least-privilege `Customer Support` or
  `Marketing` roles scoped strictly to `MyPaisa`, never `MyPaisa Dev`); an App
  Store Connect `.p8` API key stored in the `main`-only GitHub `dev` and `prod`
  environments (MA-26, unreachable from pull-request branches and never written
  to disk).
- **Claude API access from the plan (MA-21).** Link a Claude Console
  organisation to your Max or Team plan (claude.ai Settings → Billing → API
  credits; 7 days on the plan first; the link cannot be moved later without
  support). In that organisation make two workspaces, `mypaisa-prod` and
  `mypaisa-dev`, with spend limits of $160 and $40 (together the Max 20x
  plan's $200 monthly credit, the agents' allowance; each limit is the hard
  cap behind that environment's Claude ceiling, `ARCHITECTURE.md` §14.1), and
  a third, `mypaisa-evals`, with a limit of $30 for the live evals, on top of
  the two (`ARCHITECTURE.md` §21.7; its key goes to
  `/mypaisa-agent/dev/anthropic/evals_key`); no payment method and
  auto-reload off, so the credit is the last stop; and one API key in each; put each key into its own environment's SSM path,
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
  first for the US lines and the FX fallback; second, behind yfinance, for London and Frankfurt closes. The
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
  free source can serve a holding or its history (Historian £19.99 a month).

Claude's:

- **The app icons (MA-20, MA-142)** from the 1c Watcher mark
  (`docs/mark-1024.png`, MA-103): MyPaisa, and MyPaisa Dev with its DEV band.
- **The repository skeleton (MA-24, `ARCHITECTURE.md` §12.1):** the code in
  four top-level folders, `backend/`, `web/`, `ios/` and `infra/`, the
  backend a uv project of its own; `CLAUDE.md` with the working rules; the package in four layers whose imports point one
  way (api controllers, services, repositories as ports, a pure domain),
  enforced by import-linter; the gates in one script (`uv lock --check`,
  ruff lint and format, pyright strict, the layers, pytest at 90% branch
  coverage, pip-audit), run by pre-commit, jira-flow and CI's Backend job;
  a FastAPI app factory with `/v1/health` and `/v1/health/ready` and errors
  as RFC 9457 problems; uv, ruff, pyright, pytest, pre-commit; FastAPI, Mangum,
  `opentelemetry-instrumentation-fastapi` and `boto3-stubs[dynamodb,s3,sqs,ssm,cognito-idp]`
  pinned in `pyproject.toml` (MA-265).
- **The PR gates, seven-layer vulnerability scanning and the five-layer
  regression pyramid (MA-25, MA-267, MA-269, MA-273, `docs/RESEARCH.md` §7, §8):** on
  every PR (`ubuntu-24.04-arm`, 1x), ruff (lint + Bandit `S` SAST), pyright,
  `semgrep` across Python, TypeScript and Swift, pytest (`scripts/regression.py`
  L1 unit + Hypothesis property tests, L2 full-stack local ASGI with moto, L3
  golden financial maths and OTel PII-leak check), `openapi-typescript`
  zero-diff contract check (MA-266), `python3 scripts/maestro_local.py check-syntax`
  and `TestIDs.swift` ↔ `web/src/lib/test-ids.ts` selector parity (MA-273),
  `terraform fmt` and `validate`, tflint,
  `trivy config --severity HIGH,CRITICAL infra/`, gitleaks, `pip-audit --strict`,
  `pnpm audit --audit-level=high`, `trivy fs` on `ios/Package.resolved`,
  `jira-key`, the iOS TypeScript shell `Jest` tests, and a Terraform plan for
  both environments on every PR touching `infra/`. The web gates (`scripts/web_gates.sh`) run on
  every PR (MA-194), Playwright, axe and Argos run only when Arun asks (MA-304), and the
  native SwiftUI Xcode Simulator gates (`macos-15` or a self-hosted Mac runner,
  paired locally on Apple Silicon with `scripts/maestro_local.py`, MA-273)
  join on PRs touching `ios/` or `cards/` (MA-166), keeping monthly CI inside
  the 2,000 free GitHub minutes (`docs/RESEARCH.md` §7.5, §8.7). A weekly Monday
  04:00 UTC schedule and grouped Dependabot updates catch newly disclosed CVEs
  when no code changes (MA-267).
- **The scans for what exists today (MA-326, `ARCHITECTURE.md` §17.4):** you
  asked, 3 Nov 2026, "make sure the CI is perfect...running all the scans as
  per best practices". `scripts/security_scan.sh`, run by CI's Security job on
  every PR and push to `main` and by a sweep every Monday at 04:00 UTC:
  gitleaks over the whole history (and staged changes in pre-commit), semgrep
  over `backend/`, `web/`, `scripts/` and the workflows, osv-scanner over every
  lockfile, zizmor over the workflows, each tool pinned and checksum-checked;
  `pip-audit --strict` in the backend's gates; grouped weekly Dependabot
  updates. MA-194 added web's TypeScript
  rules, its lockfile and pnpm audit; MA-267 keeps eslint-plugin-security for
  web, iOS, Terraform and the images.
- **CodeQL is part of CI (MA-346, `ARCHITECTURE.md` §17.4):** you asked, 24 Nov
  2026, "make codeQL check part of this ci process", and kept GitHub's default
  setup. The repo is public, so it is free: CodeQL analyses the workflows,
  JavaScript and TypeScript, Python and Swift on every PR, every push to `main`
  and weekly, and secret scanning with push protection is on. A merge waits for
  CodeQL's checks like every other; no CodeQL job is added to `ci.yml`. The
  default setup gave way to CodeQL's own workflow in MA-351, below.
- **CI bundles the iOS app (MA-327, `ARCHITECTURE.md` §17.4):** the iOS shell
  job builds the app's JavaScript with Metro on Linux, since Jest and tsc pass on
  a toolchain Metro refuses, as Dependabot's Babel 8 showed (PR #96). Dependabot
  skips Babel majors until React Native moves.
- **A new advisory in React Native's CLI (MA-342):** GHSA-474x-hrwr-fgx4 in
  fast-xml-parser 5.11.2, which React Native's CLI pins, turned every PR's
  security scan red on 23 Nov 2026; a pnpm override lifts it to 5.12. It is dev
  tooling only, never shipped.
- **Prettier 3.10 and the skip link (MA-343):** Dependabot's web group (PR #113)
  moves prettier to 3.10.1, whose Svelte printer wraps the shell's skip link
  differently, so the web gate failed on it. The link is printed the new way,
  which 3.9 accepts too, so the change lands before the bump.
- **Hermes moves with React Native (MA-344):** the same group raised
  `hermes-compiler` apart from `react-native`, which still names the older one,
  so the iOS gate found two compilers. Dependabot now leaves `hermes-compiler`
  alone; it is pinned by hand when React Native moves.
- **Review tooling takes turns in web/ (MA-345):** two of MA-194's
  fixed-finding checks ran vitest in `web/` at the same moment, under the
  regression runner's four workers, and raced on pnpm's install and Vite's
  cache, so Review tooling failed at random. They now take one lock per
  checkout.
- **Terraform bootstrap (MA-26):** `infra/modules/mypaisa` with the two roots
  `infra/dev` and `infra/prod`, each with its own state key in the existing
  state bucket; `infra/bootstrap`, applied once from the laptop, with the
  account's GitHub OIDC provider reused and three roles pinned to this
  repository's numeric id (`ci-plan`, `ci-dev-deploy`, `ci-prod-deploy`);
  `dev` and `prod` GitHub environments, prod needing your approval; the
  developer role with its explicit deny on `env=prod`, its one exception
  `ssm:PutParameter` on `/mypaisa-agent/prod/*` for you to put prod's
  secret values by hand (MA-26); the SSM parameters in roots of their own,
  `infra/dev-secrets` and `infra/prod-secrets`, so `ci-plan` never plans one
  and is denied every parameter value and every record (MA-25); the zone and the
  certificate looked up by name (`ARCHITECTURE.md` §17.2); AWS Budgets at £75
  as the backstop behind the app's £50 cap (`ARCHITECTURE.md` §14.2, MA-137).
- **The watch tower (MA-231, `ARCHITECTURE.md` §9):** each environment's
  log groups and their retention, Transaction Search and Application Signals
  (one setting for the account, owned by dev's root; dev's first month
  measured and put to you before the first Lambda reaches prod), the
  dashboard with its eight panels, the saved queries, the alarm topic and the
  alarms that need no code, in `infra/modules/mypaisa/observability.tf`,
  before the first Lambda runs; proved live on dev by a throwaway probe
  Lambda until the real images land.
- **Secrets out of state (MA-159, done):** every secret's SSM parameter made
  by Terraform with a write-only placeholder (`value_wo`, `value_wo_version`;
  Terraform 1.11 or later, `hashicorp/aws` 5.87 or later), then overwritten by
  hand; no secret ever in state (`ARCHITECTURE.md` §13). So every "into SSM"
  item in this phase waits for the apply that makes its parameter (MA-26's,
  and for prod the first release): a value put first makes that apply fail.
- **The images, built on GitHub's arm64 runner (MA-237):** CI's `Images` job
  builds the Dockerfile's `lambda` and `stream` targets natively on GitHub's
  `ubuntu-24.04-arm` runner, free and unlimited now the repository is public
  (Arun, 24 Nov 2026: "MA-237, can we do the builds on Github ? We are public
  now"), and on a push to `main` pushes them to the one ECR repository as
  `lambda-<sha>` and `stream-<sha>` through `mypaisa-ci-image`, with their
  digests in the run's summary; a pull request that changes the Dockerfile or
  the lock builds them without pushing. ECR keeps the last five images of each
  target. No CodeBuild, so MA-238 (connecting GitHub to CodeBuild) is retired.
- **The release pipeline and phase-progressive smoke runner (MA-107, MA-167,
  MA-268):** a merge to `main` builds the Lambdas once on GitHub's
  arm64 runner and scans both targets with `trivy image --exit-code 1
  --severity HIGH,CRITICAL --ignore-unfixed` (MA-237, MA-267), deploys dev and
  runs `python3 scripts/smoke.py --env dev --up-to-phase <N>` (health, deep
  read-only probe, OpenAPI `401` perimeter, synthetic sign-in, `/v1/stream`
  SSE, scripted chat turn, `RunRecord` and unbroken X-Ray trace, MA-232,
  MA-268), sends MyPaisa Dev to TestFlight, then deploys prod with the exact
  same ECR `sha256` digests after your approval behind each Lambda's `live`
  alias, running `python3 scripts/smoke.py --env prod` (strictly read-only,
  zero synthetic writes to prod tables) and shifting every `live` alias back
  to its previous version in under five seconds on failure, before syncing
  prod's web app and sending MyPaisa to TestFlight. Its first run, in this
  phase, applies prod's empty stack; from the first release that ships a
  Lambda (phase 1), it refuses prod while any `/mypaisa-agent/prod/*`
  parameter is still at version 1, the placeholder Terraform wrote, which
  `DescribeParameters` shows without reading a value (Arun, 24 Nov 2026).
  Built in this phase (MA-107): the release starts when CI passes on `main`
  and asks nothing when a commit changes nothing it ships; prod's plan is in
  the run's summary before you approve, and the apply refuses a plan that is
  not the one you read; a secrets root may only create a parameter or change
  its tags. Its Lambda stages are proved on the first Lambda (MA-347).
  The nightly drift check and Monday CVE sweep follow (MA-108, MA-267).
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
  formatting in GBP, INR, USD and EUR (rupees in lakh and crore), privacy masking and the view
  models, and the api client with its TanStack Query definitions and
  `api-types.d.ts` generated from FastAPI's `app.openapi()` by
  `openapi-typescript` (MA-265, MA-266). Built on 3 Nov 2026 as you asked
  ("best practices ... proper structured SvelteKit project, Tailwind,
  ShadeCDN and TanStack"): `scripts/web_gates.sh` runs every gate below, plus
  prettier, the build with its CSP and service worker, and the api types
  checked against `backend/openapi.json`, which a backend test holds equal to
  the app. Its gates:
  svelte-check, eslint, vitest and pnpm audit; `scripts/web_gates.sh` (lockfile, api types, svelte-check, eslint, prettier, vitest, the build with its CSP, pnpm audit) runs in CI's Web job on every PR; Playwright, axe and Argos run only
  when Arun asks (a manual run or a `qa` label; MA-303, MA-304). That QA is
  MA-304's: Playwright 1.64 at `390x844` and `1440x900` in both themes
  through one `auditAndCapture()` fixture (`@axe-core/playwright` WCAG 2.2 AA
  fail-closed before capture, keyboard focus/landmark checks, and **Argos
  CI** `@argos-ci/playwright` Tokenless OIDC cloud visual PNG diffs in both
  themes plus a light-theme-deduplicated YAML `ariaSnapshot` accessibility
  tree diff inside the 5,000/month £0 Free Hobby tier, `docs/RESEARCH.md`
  §10), the 25% brightness floors, the 320 to 1920 width sweep and a pixel
  parity check against the picked boards.
- **The iOS app (MA-165, MA-166, MA-167, MA-273, MA-274, `ARCHITECTURE.md` §8.1,
  §8.5, §14.2, §17.4):** `ios/`, a React Native shell
  with a native SwiftUI core, as bong-panjika is built: bare React Native
  0.88 with React 19.3, New Architecture, Hermes, TypeScript, no Expo, its
  native dependencies through Swift Package Manager from day one, never
  CocoaPods; TanStack Query on the shared query definitions, Reanimated,
  Gesture Handler in the shell; MA-173 settles the offline store, since MMKV on
  Nitro Modules cannot build with Swift Package Manager (MA-229, MA-165). The shell owns the
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
  XCUITest including `⌘*` keyboard shortcuts, snapshot and accessibility checks
  for the SwiftUI pieces), its local multi-simulator Maestro workspace `.maestro/`
  and cloned simulator runner `scripts/maestro_local.py` across all four adaptive
  width sub-bands, `TestIDs.swift` ↔ `test-ids.ts` parity and `xcrun simctl` plus
  Local File Provider capabilities at £0/month with
  `python3 scripts/maestro_local.py check-syntax` on Linux CI (MA-273, MA-274;
  `docs/RESEARCH.md` §8), and its private TestFlight Internal Testing lanes
  (`testFlightInternalTestingOnly = true`, `ITSAppUsesNonExemptEncryption = false`,
  `MyPaisa Dev` uploaded in `environment: dev` for you alone and `MyPaisa` in
  `environment: prod` for `"Household Beta"` after your approval, 90-day /
  3-month untethered household installs renewed silently in place via Automatic
  Updates and a day-60 evergreen keepalive rebuild without ever listing on the
  public App Store, plus a day-60 SNS alert from phase 0 joining §14.2's alert
  router in phase 8, a day-75 `itms-beta://` banner from phase 0 and
  `GET /v1/app/minimum-version` on FastAPI from phase 1; MA-167, MA-266,
  `docs/RESEARCH.md` §8.8).
- **The local stack (MA-198):** the whole app on the laptop: a moto server for
  DynamoDB, S3 and SQS (no Docker); the FastAPI `api` and `stream` apps and
  worker handlers mounted behind one local Uvicorn ASGI app, the SSE stream
  included (MA-265, MA-266); the SvelteKit dev server and the iOS simulator
  pointed at it; a localhost-only sign-in stub, compiled out of every
  deployed build. The agent runs against the dev Claude key, or in a scripted
  mode that replays recorded conversations, which UI work, the end-to-end
  tests and parity with the prototype use. Until phase 1, `scripts/local/`
  carries stand-ins for the chat api and the stream on §19's wire, which
  MA-30 and MA-31 replace.
- **The seed (MA-110):** dev and the laptop seeded and hydrated with one
  illustrative household of every kind, in the UK and India, with years of
  events (salary history, EMIs paid, valuations, SIPs, statements), from the
  design figure set (`docs/design/figures/household-v4.json`). A generator
  writes it through the write service; `scripts/seed.sh local|dev` loads it,
  the only way dev data is written; one command wipes and reseeds, and it
  refuses to run against prod.
- **The boards (MA-158, MA-160, MA-161):** boards for every story with UI
  drawn ahead of it in Claude Design (MA-158), with the board fixes found by
  its review and MA-156's applied to them, in the repo since MA-260 (MA-160);
  since MA-161, the iOS app drawn end to end in the MyPaisa iOS v1 boards,
  with the iOS kit in MyPaisa DS v1.
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
  iOS shell on bong-panjika's (React Native 0.88, TanStack Query, Reanimated),
  each at its latest; Swift Package Manager from day one; the
  association file served by a CloudFront Function; the stream on the api's
  REST API in API Gateway's streaming mode, through the Lambda Web Adapter
  1.1.
- **The plan in Confluence (MA-228):** the whole plan as a page tree in the
  mypaisaa-agent space, phase by phase and screen by screen, with the board
  previews, the design decisions, the explainers and the roadmap, generated
  from the repo; every story estimated in `docs/roadmap.json`, each phase
  epic's due date set from it; and the plan-sync check widened to Confluence
  and the code, with this repo's hooks.
- **Tracing and LLM observability, recorded (MA-230, MA-236):** one trace
  from the door through the api, the queues and the agent to the model and
  back, OpenTelemetry on every Lambda, model and tool spans in the open
  conventions, sixteen metrics, the alarms and what is never recorded
  (`ARCHITECTURE.md` §9); the Lucid page that draws it (MA-236).
- **The architecture in plain words (MA-239):** Inside MyPaisa, an animated
  page that walks the admin from the sign-in screen to the chatbot and the
  agent team, plays one message through the system, and shows the safety
  nets, for anyone in the family to read; its source is
  `docs/design/inside-mypaisa.html`.
- **Whole at every size (MA-240):** every board checked by machine at every
  size a member can have (an iPhone from 320 (Display Zoom) to 440 and in
  landscape, an iPad or foldable window from 600 to 1366, and the web from 320
  to 1920), in Chromium and WebKit
  at the screen's own pixel ratio, with every text, icon and mark measured on
  its real pixels at full brightness and at 25%; the fixes live in the design
  system (the page as its own size container, the fit guards in `tokens.css`,
  a bar's track plain on every background), so both doors inherit them.
- **Colourful kind icons (MA-241):** each kind of holding, asset and debt
  leads its row with its own colourful icon, the same at both doors, named in
  the kind's data (§4.8) so a new kind brings its icon; three options drawn in
  Claude Design, and Arun picked B, Settings squircles (27 Oct 2026). Its
  change to the colour tokens also settles the two pairs MA-240's review left
  at the limit: the dark track on the success tint and the light accent on the
  alert tint, each measured at 25% by the contrast gate.
- **Wealth's sub-lines, figure first (MA-243):** three one-line sub-lines on
  Wealth reordered so their ellipsis never cuts a figure. (MA-242, filed for
  the open foldable's chat, duplicates the redraw MA-163 already carries.)
- **The technical architecture page (MA-244):** MyPaisa Architecture v4, an
  animated page that plays nine journeys through the AWS services hop by
  hop (a question, a goal, plan with me on Opus, a factsheet, a delete, a
  check-in, the nightly run, the Monday digest, a failure and its replay,
  since MA-325 rebuilt it after MA-307 and MA-323), traces one message from the door
  to the model, and shows the six agents, the kind of agent each is and
  which of Sonnet, Haiku and Opus it uses (Opus only for an admin's plan
  with me, since MA-323), with the spend ladder and each agent's share; its
  source is `docs/design/architecture-v4.html`.
- **Guardrails and evals, recorded (MA-245, `ARCHITECTURE.md` §21):**
  guarded in code before the prompt, tested on every change and never on a
  calendar, every live run checked by code and a few judged overnight, the
  judges calibrated by the admin monthly and on every change; nothing new
  ships without its cases. Arun's choices (27 and 28 Oct 2026): monthly
  calibration, production transcripts stored only in our AWS account,
  Inspect AI, live evals in a Console workspace of their own capped at $10 a
  run and $30 a month on top of the two ceilings, its key read from SSM by a
  `ci-evals` role, and each label and each new case behind the second check.
- **One manifest and the eval harness (MA-246, `ARCHITECTURE.md` §21.3,
  §21.5):** every agent and tool declared once (its model route, its side
  effect, who may call it, its scope, its limits, its eval tags); eval cases
  as Inspect AI datasets on the seed household, graded by code first; T0 on
  every pull request, the recorded conversations of MA-198 replayed through
  the agent loop and its guards with no network; and a coverage check that
  refuses a tool, agent, prompt or kind template with no safety case, or with
  no capability or regression case.
- **The guardrails and evals, explained (MA-258):** a page of its own,
  [MyPaisa Guardrails and Evals](https://claude.ai/artifact/K4esevpFaFVYQKk2QAw3bT), plain or technical at a switch,
  with six animated diagrams that are also on the Confluence page Guardrails
  and evals as GIFs (Arun, 28 Oct 2026); and Inside MyPaisa's safety nets,
  Architecture v4's guardrails and its tool list, and the agent journey's
  safeguards drawn from `ARCHITECTURE.md` §21, each page published again.
- **The whole record in Confluence (MA-257):** the architecture and every
  journey as pages under the hub, colourful and animated: `ARCHITECTURE.md`
  area by area in full, with the Lucid drawings where the text puts them and
  the stories that build each part; the journeys of Architecture v4 hop
  by hop, Inside MyPaisa's nine steps, the Agent Journey's twenty-three flows
  and the first journeys, in their own words; the GIFs and
  stills captured from the explainer pages. Generated by
  `scripts/confluence_record.py`, like every page in the space.
- **The boards and the repo, the same (MA-259, MA-260):** the boards were
  drawn in standalone Claude Design and copied into `docs/design/` byte for
  byte (MA-259). Standalone Claude Design closes by 14 Dec 2026, and on
  30 Oct 2026 you chose: "for all future design use Local folder and then
  Claude Artifact. Claude Design is going away, so no need to push to claude
  design". So the boards are drawn in the repo, their folders kept, and
  you review each design round as a private Claude Artifact (MA-260;
  `docs/design/reviews/MA-259/decision.md`). Since MA-296 (30 Oct 2026, "I
  dont need claude-design sync anymore") git is the boards' only record:
  no record file, no whole-set Boards Artifact to republish (MA-324
  brought that Artifact back on 3 Nov 2026, kept in step with the repo), and
  `python3 scripts/plan_sync.py check` read every board as it is on disk
  until MA-303; it now reads only each cited board's canvas titles.
- **The future-plans design (MA-264):** the screens MA-261's future plans
  need, drawn before anything is built, from one figure set
  (`docs/design/figures/future-plans-v4.json`: MA-193's household with its
  plans and a month-by-month budget forecast ledger). Two or three options,
  at desktop, 390, iPhone and iPad in light and dark, for the Budget forecast
  tab (MA-262), a plan made in the admin's chat with its questions, its
  impact and, when it leaves the household short, the rearrangement applied
  on Confirm (MA-222, MA-263), and the Plans tab (MA-224). You pick; the
  picked option's remaining states are drawn before those stories start.
- **Your core requirements, recorded (MA-275, `ARCHITECTURE.md` §5.3, §6,
  §18.8):** your asks of 29 Oct 2026 written down. Every asset
  tracked across the UK and India, the US and Europe later, in four
  currencies (GBP, INR, USD, EUR; MA-213). The Budget forecast
  (deterministic, worked out from the household's inputs, to the penny) and
  the Projection (the same path, then a fan) are two things; and the whole
  app learns from the household's own data, its forecasts graded at every
  month close and each member's needs learned from use (MA-276, MA-277,
  phase 9). Everything through the chat and its controls, every change and
  every run audited. Docs only; the questions still open are on the stories
  they decide. MA-307 removed the third, the stock investment forecast.
- **Caching and memory for every agent, planned (MA-285, `ARCHITECTURE.md`
  §22):** your ask of 29 Oct 2026 written down. Every agent calls Claude
  through the one runner, so its caching and its memory come from there:
  each call marked for the cache in one frozen order, with a lifetime per
  route and checks that catch a broken cache; and Claude's memory tool on
  MyPaisa's own store, a member's notes theirs alone, never a figure, a
  record, a setting or a secret. Built in phase 1 (MA-286, MA-287, MA-288)
  and for the agent team in phase 13 (MA-289). Docs only. Your answers of
  29 Oct 2026: a member's notes theirs alone, kept until forgotten, written by
  the agent on its own and shown in Activity, and never past the cost: the
  notes ride the cache under hard caps and the ladder (`ARCHITECTURE.md`
  §22.6).
- **No Telegram left in the live designs (MA-278):** as you said on 29 Oct
  2026, nothing for Telegram: the Telegram-only files, the Mini App and the
  Nocturne artboards moved out of the three live projects into an archive
  project (nothing destroyed) and dropped from the repo copy; the Telegram
  and Mini App rules taken out of `tokens.css`; every trace row naming an iOS
  or web board; MA-68 and MA-114 saying "the agent"; and `plan_sync.py check`
  refusing a Telegram or Mini App frame in a live board file until MA-303
  stopped the checks on the boards' content. It settles
  MA-160's question the same way.
- **One consolidated design (MA-279):** every screen a story needs drawn
  once, in the v4 design and the picked shell, on the whole-wealth household,
  at every door: the web app at desktop and 390, iPhone, iPad and the
  foldable, in light and dark; money in the four currencies. The first
  boards of 24 and 25 Oct (drawn on the investments-only household, before
  the shell pick) are redrawn and retired, Home is drawn once, and the seven
  stories with no web board get theirs, with a web Register. Each story then
  names one board per screen.
- **Prototype v5, the whole journey (MA-291):** your ask of 29 Oct 2026,
  one clickable walk-through of every phase, 0 to 15, at the web app on
  desktop and at 390, the iPhone, and the iPad and foldable, in light and
  dark, with privacy mode and both members' views, all from stubbed
  figures: MA-193's household. Its market engine and stock forecast chapters
  went with MA-307; what remains walks the household's whole wealth. A design record kept in
  the repo (`docs/design/prototype-v5/`, outside the three board folders),
  not product code, walked through as a private Artifact. The
  screens never drawn, or drawn before the wealth merge, are drawn into it
  in the v4 design and the picks already made, each marked Draft, not
  picked; your picks from it go into the boards through MA-279.
- **The implementation stack, FastAPI, DynamoDB vs DocumentDB, the agent
  framework options, and end-to-end FastAPI and LLM observability with
  costing (MA-265, `docs/RESEARCH.md` §6, `TECH_STACK.md`):** the full
  four-layer stack recorded across `web/` (SvelteKit 3.1, Svelte 5 runes,
  Tailwind CSS 4.3, shadcn-svelte 1.7 on bits-ui 2.20, TanStack Query 6.3,
  Table 9.3, Virtual 3.13 and Form 1.33, LayerChart 2.9, Motion 14, `openapi-typescript`), `ios/` (bare React Native 0.88 on
  New Architecture, Fabric and Hermes with Swift Package Manager, TanStack
  Query 5.105, Reanimated 4.7, the offline store MA-173 settles, and a Swift 6
  strict-concurrency SwiftUI core with Swift Charts at 120 Hz and Liquid
  Glass on controls), the Python 3.14 backend (FastAPI on Mangum for `api`
  and Uvicorn behind Lambda Web Adapter 1.1 for `stream`, Pydantic v2, and a
  typed single-table DynamoDB repository on `boto3` `TypeSerializer` /
  `TypeDeserializer` + `mypy-boto3-dynamodb` + `TransactWriteUnit`, why
  DocumentDB is rejected at £75 to £110 a month versus £0 in DynamoDB's free
  tier), the six agent framework options compared with a thin custom loop on
  the official `anthropic` SDK + Pydantic v2 + Step Functions and EventBridge
  recommended, and end-to-end request-id, W3C `traceparent` and OpenTelemetry
  GenAI observability across FastAPI, SQS, Claude and SSE costed at £0.03 a
  month in dev and £2.46 a month in prod (`docs/design/tech-stack-observability.html`
  and the Confluence page Tech stack, FastAPI, DynamoDB, agents and
  end-to-end observability).
- **The CI/CD pipeline, seven-layer vulnerability scanning, smoke suite,
  phase-wise regression matrix and GitHub Actions runner cost analysis
  (MA-267, MA-268, MA-269, MA-272, `docs/RESEARCH.md` §7, `ARCHITECTURE.md`
  §17.4):** the seven open-source security gates across secrets, SAST,
  dependencies, Terraform and arm64 ECR images (`scripts/security_scan.py` and
  the weekly Monday CVE sweep, MA-267); the phase-progressive smoke runner
  (`scripts/smoke.py --env dev|prod --up-to-phase <N>`) with full synthetic
  round-trip and X-Ray trace assertion in dev, read-only health/auth/alarm
  verification in prod and under-five-second Lambda `live` alias rollback
  (MA-268); the five-layer regression pyramid (`scripts/regression.py`) and
  phase-wise test rollout from Phase 0 to Phase 15, including the SvelteKit 3
  (`web/`) visual regression, ARIA snapshot diffing and WCAG 2.2 AA
  accessibility pipeline with **Argos CI**, Playwright 1.64 and
  `@axe-core/playwright` (`auditAndCapture()` fixture at `390x844` and `1440x900`
  in both themes, Tokenless GitHub App OIDC, and light-only `ariaSnapshot`
  deduplication keeping usage at ~3,600 snapshots/month inside the 5,000/month
  £0 Free Hobby cap, `docs/RESEARCH.md` §10, `docs/design/argos-visual-a11y.html`,
  MA-194, MA-269); and the 2026
  GitHub Actions versus AWS CodeBuild runner cost model showing how Option D
  (GitHub `ubuntu-24.04-arm` for the Linux gates, Playwright + Argos CI only
  when Arun asks (MA-303, MA-304), and split iOS testing to avoid the 10x
  macOS multiplier trap) stays at £0.00 a month; its CodeBuild `arm1.small`
  for the Docker builds is superseded: since the repository went public the
  images build on GitHub's free `ubuntu-24.04-arm` runner too (MA-237, Arun,
  24 Nov 2026)
  (`docs/design/cicd-security-regression.html`, `docs/design/argos-visual-a11y.html`
  and their Confluence pages, MA-272).
- **A plan made by ci-plan sees every Lambda's environment (MA-349, bug):**
  ci-plan could not decrypt a function's environment, so its plans showed it
  changed on every function, and the release's digest check would refuse
  each prod release that ships a Lambda; fixed before MA-347 by letting
  ci-plan decrypt through Lambda only (Arun's pick, option 1).
- **Dependabot keeps the images on Python 3.14 and uv 0.12 (MA-350, bug):**
  its first docker run moved the Lambda base to Python 3.15 and uv to 0.13;
  the images now take only new digests and patch releases of the lines the
  backend is tested on, and a new line moves with its own story.
- **CodeQL scans Swift only when Swift changes (MA-351):** the Swift scan
  spends about 18 minutes building the app from cold and 10 waiting for a
  macOS runner on every pull request; an advanced-setup workflow runs it
  only when `ios/` changes (and on `main` and weekly), building only the two
  Swift packages the old scan ended up compiling; other languages as before.
- **The research pages show the counted cost of watching (MA-348):** the
  observability and VPC research pages, the Architecture v4 explainer's
  CloudWatch card, their Confluence pages, previews and GIF
  captions carry MA-231's counted figures (sixteen metrics; prod about £2.70
  a month and dev's alarms about £1.80), and each VPC option's total starts
  from the £5.50 AWS line.
- **The optional AWS VPC enterprise lockdown, seven-layer data perimeter and
  three-tier costing, recorded (MA-284, MA-283, `docs/RESEARCH.md` §9,
  `ARCHITECTURE.md` §13, §14, §17.1, §17.4):** the complete seven-layer
  enterprise VPC blueprint, the four serverless VPC operational gotchas
  (Hyperplane ENI sharing, in-container ADOT X-Ray export, `cognito-idp`
  PrivateLink vs Apple/Google JWKS egress, and presigned S3 upload / five-minute
  Audit links under `aws:SourceVpce` Data Perimeter `Deny` rules), the
  five-step zero-lockout rollout, and deterministic `us-east-1` costing across
  Option 1 Bank-Grade Hub-and-Spoke (£729.91/month), Option 2A/2B AWS-Managed
  Serverless NAT Gateway VPC (£149.01/month and £70.39/month), and **preferred
  Option 3** Lean Zero-Trust VPC (+£13.32/month in 3A, or +£24.86/month in
  preferred 3B with CloudFront Pro bundled AWS WAF on `prod`, keeping total AWS
  spend at ~£16.82 to ~£28.36/month inside the £50/month AWS cap), decided last
  after Phase 15 (`docs/design/aws-vpc-enterprise-lockdown.html` and the
  Confluence page Optional AWS VPC enterprise lockdown, data perimeter and
  costing).
- **Review checks on their fix's own evidence (MA-282):** four fixed-finding
  checks that went stale on main once later work moved on (MA-240's
  drawn-size diff and Inside MyPaisa's track colours, MA-261's undrawn
  stories on the phase pages) test what each fix does again, so
  `scripts/review_regress.py` reports nothing broken on any ledger in
  `review/`, and each still fails on a copy with its fault put back.
- **Livelier dashboard and analytical charts (MA-295):** your ask of 30 Oct
  2026 to redesign the dashboard graphs and charts into livelier, higher-craft
  visualizations conforming to Apple's Human Interface Guidelines for charting
  data and Monzo's mobile and modular web design system, on Warm ledger
  (`tokens.css`, with zero new colour tokens). Three options drawn from the
  canonical household and future-plans figure sets across DS v1
  (`Chart options.dc.html`), iPhone and iPad (`iPhone v4 · Chart options.dc.html`),
  the browser at 1440 and 390 (`Web v4 · Chart options.dc.html`), and live
  inside Prototype v5 (`Charts: A · Pulse | B · Editorial | C · Modular | Classic`
  with pointer and touch scrubbing across all five doors, light, dark and
  privacy mode): **1a Monzo Pulse** (picked by you on 30 Oct 2026: monotone
  cubic splines with warm coral wash and endpoint beacon, sculpted capsule
  meters with 100%-plan ticks and touch/pointer scrub callouts), with **1b Apple Health Editorial** and
  **1c Monzo Modular Bento** kept on the canvases as the record
  (`docs/design/reviews/MA-295/options.html` and `decision.md`). Carried into
  the consolidated boards (MA-279) and the Swift Charts and LayerChart builds
  (MA-56).
- **The design system, Impeccable context, Prototype v5 and design gates hardened
  (MA-298):** `PRODUCT.md` and `DESIGN.md` written at the repo root so every
  Impeccable check and design round knows Warm ledger, its dual-currency figures,
  Rule 4 governance, iOS Liquid Glass boundaries (floating controls only, never
  content or the web app) and the chat-beside adaptive rule (1133 pt then; 1393 pt since MA-301); blanket
  per-file wildcard suppressions cleaned in `.impeccable/config.json` and the
  dead `_ds/modernist-*` boilerplate removed; undefined `--mp-uk`/`--mp-in`
  tokens fixed to `--mp-ccy-gbp`/`--mp-ccy-inr` across `Chart options.dc.html`,
  protruding 100%-plan benchmark ticks unclipped, `a:hover` button contrast
  preserved, system preference queries (`prefers-color-scheme: dark`,
  `prefers-reduced-transparency: reduce`, `prefers-contrast: more`), `:focus-visible`
  and 44x44 hit areas added to `ds-v1` without moving untouched drawn frames;
  Privacy Mode redacted across DOM text, `aria-label` summaries and interactive
  chart scrubbers; `Prototype v5`'s `<=1023px` web `More` drawer and `Search`,
  plain Warm ledger web modals (`Escape`, backdrop and close), and icon
  `aria-hidden` completed; and `contrast_check.py` plus `prototype_smoke.js`
  widened with selftest mutations to refuse regressions.
- **SvelteKit 3 web visual regression, ARIA snapshot diffing and WCAG 2.2 AA
  accessibility pipeline with Argos CI, recorded (MA-299, MA-194, MA-269,
  `docs/RESEARCH.md` §7.4 and §10, `ARCHITECTURE.md` §8.4 and §17.4,
  `TECH_STACK.md` §3 and §4):** the `auditAndCapture(page, name, opts)` "One
  Helper, Four Gates" Playwright 1.64 fixture in `web/` (deterministic
  `prefers-reduced-motion` and font stabilization, fail-closed
  `@axe-core/playwright` 4.14 WCAG 2.2 Level A & AA audit in both themes before
  capture, landmark and keyboard `:focus-visible` assertions, and
  `@argos-ci/playwright` 6.4 visual PNG regression at 390 and 1440 in Light and
  Dark plus light-deduplicated YAML `ariaSnapshot` accessibility tree diffing)
  and the five pipeline cost guardrails keeping monthly volume at ~3,600
  snapshots/month (72% of Argos CI's 5,000/month Free Hobby cap) at
  **£0.00/month**, with interactive explainer `docs/design/argos-visual-a11y.html`,
  four animated GIFs, and the Confluence page Web visual regression, ARIA
  snapshot diffing and WCAG 2.2 AA accessibility pipeline with Argos CI.
- **The Impeccable deep scan's remaining fixes (MA-300):** every P0, P1 and
  P3 finding MA-298, MA-278 and MA-279 left open, checked against the boards as
  they are now and fixed on the picked boards: Privacy Mode leaks and clipped
  ticks in the Chart options boards and Prototype v5, button hover contrast,
  iPhone Home's links to Budget, Assets and debts and Projection, the foldable
  open at 880 pt, real buttons, inputs, switches and dialogs, Liquid Glass kept
  to floating controls, 44 pt targets and touch scrub, `rem` type and the 12 px
  floor, `Ask` on iPad, the motion and JS performance fixes, and the gates
  widened to catch each one again.
- **The deep scan's redesign items, as an options round (MA-301):** a calmer
  Projection and Plans header, a lighter statement Confirm, flatter cards and
  shorter overlines, a browser-only `/join/<token>` sign-in, a self-hosted type
  and icon stack and the `Cmd+K` palette, drawn as options and published as a
  private Claude Artifact for Arun to pick before anything is built. Picked on
  2 Nov 2026 and carried into the boards and the design system on 23 Nov: the
  title is the picker, questions before one Confirm, the chat beside only from
  about 1393 (so a sheet on every iPad, a drawer on a smaller laptop), one
  surface per card, a browser joins, platform type with Lucide on the web, and
  one `⌘K` palette at both doors.
- **The web app and the boards drop Google Fonts (MA-340):** self-hosted Inter
  and a Nunito figures subset, Lucide icons in the web app, and Lucide on the
  boards in place of Material Symbols, as MA-301's f 1a picked.
- **The Maestro iPad plan's bands follow the 1393 rule (MA-341):** the testing
  page's band GIF redrawn for three iPad bands, the beside band at the debug
  width only.
- **Four changes Arun asked for while designing, as an options round (MA-355):**
  the desktop web chat as a sheet over the page, like the iPad's; Home's
  Household, Me and Asha as a dropdown, with the currency, Light or Dark and
  Hide amounts controls at the top right; interactive Home charts (where it
  sits, what we owe, invested against owed, where growth comes from); and the
  mark animated in the sidebar. Drawn as 2 or 3 options an item and published
  as a private Claude Artifact for Arun to pick before anything is built
  (Arun, 25 Nov 2026). Picked the same day, 1a of each: the iPad's sheet at
  every desktop width from 1024 px, closed by a click outside and opened by
  `⌘J` on a Mac (so the web's chat is never beside the page, superseding
  MA-301's column from 1393); four labelled pills at the top right, with the
  iOS appearance in You; a double ring and Invested against owed, where
  invested is everything but property and the chips are 5, 10, 20 and 30
  years; and the mark that moves when MyPaisa starts on a message or saves a
  change.
- **The boards' icons draw as Lucide draws them (MA-356):** `scripts/board_icons.py`
  joined an icon's elements into one path, so Projection, Audit, the close mark
  and other multi-path icons came out broken on every board; each sub-path
  starts from its own point, a check fails on one that does not, and the
  previews and the Boards artifact are published again. Found on MA-355.
- **Prototype v4's controls at 44 pt (MA-302), closed:** the card actions, links,
  suggestion chips, segmented control and composer that MA-300's live
  accessibility gate found under 44x44. Closed by Arun on 2 Nov 2026:
  Prototype v4 is superseded and its gate deleted; tap targets on the built
  web app are MA-304's.
- **A light board stays light in a dark browser (MA-329):** finding F01 of
  MA-328. The nearest frame that names a theme decides its glass, so a light
  frame keeps light glass when the browser is dark, and a frame that names none
  follows the browser. A selected control keeps its tint under Reduce
  Transparency and Increase Contrast. Boards and Prototype v5 only: the real
  apps do not load `ios.css`.
- **The boards' glass, hardened and polished (MA-330):** F01's last step,
  `/impeccable harden` then `/impeccable polish`, once MA-331 to MA-339 have
  landed.
- **The sign-in boards show one state each (MA-331):** F02 of MA-328. Signed-out
  screens offer only signed-out actions, and each sign-in and invite state is
  drawn at both doors, as ARCHITECTURE §4.5 allows.
- **Settings, Admin and Activity draw the task (MA-332):** F03. Each screen
  draws its action, next state, cancellation and error, in place of a paragraph
  about them.
- **Holdings' states are drawn (MA-333):** F04. Loading, a non-trading day, stale
  prices and a failed fetch each have a named frame.
- **One compact web navigation (MA-334):** F05. Chat, Home, Assets, Projection
  and More across the boards, the design system and `DESIGN.md`, with Budget
  under More, reopening no pick. Assets covers everything owned, and Holdings
  means investments only.
- **Prototype v5's Home scope selector works (MA-335):** F06.
- **Prototype v5 reaches Assets and Debts from Home's first summary (MA-336):**
  F07, as the Home board already draws.
- **Agreed type for primary actions and instructions (MA-337):** F08, after
  MA-331 and MA-332.
- **A current-spec map (MA-338):** F09. Each screen's one composition, chart and
  material, with Proposed, Picked and Implemented kept apart. Foundations follows
  the design-first rule on tertiary ink.
- **Each foldable example names its door (MA-339):** F10. The Foldable frame is
  an Apple adaptive frame of the iOS app; Android's foldable stays a separate,
  labelled web example. Its OS, posture, material and navigation agree.
- **Stop the checks on the design boards; plan-sync and the review ledger
  faster and smarter (MA-303):** the six checks on `docs/design/` stopped
  (Arun, 2 Nov 2026: "I need this checks as QA when I ask, but on actual code
  implemented"), nothing checks Prototype v5, and 104 ledger checks retired;
  plan-sync's selftest is reused locally while its code and fixtures are
  unchanged; CI runs it on every PR (about 9 s); Jira is compared since the
  last sync, Confluence is read back by hash, and a PR's files are checked
  against the stories that claim them. Plan-sync keeps its board-name check:
  it reads each cited board's canvas titles only. QA on the code moves to
  MA-304; MA-302 is closed (Prototype v4 superseded).
- **QA on request for the web app (MA-304):** Playwright functional tests
  on the built web app, run on the laptop by `crew:qa-web`; Argos's
  screenshots and ARIA snapshots and axe, with the 25% contrast floors and
  the 320 to 1920 width sweep, run only in `qa-web.yml`, a GitHub workflow
  started by hand when Arun asks, and axe never on the laptop (Arun, 26 Nov
  2026, MA-362); `scripts/web_gates.sh` (lockfile, api types, svelte-check, eslint, prettier, vitest, the build with its CSP, pnpm audit) runs in CI's Web job on every PR.
  Depends on MA-194.
- **One CI workflow, its jobs in parallel (MA-305):** CI runs Plan sync,
  Plan-sync selftest, Review tooling (every ledger and state file), Confluence
  receipts and Workflow lint side by side, as mypaisaa-prediction does
  (Arun, 2 Nov 2026); a superseded run is cancelled, actions are pinned to
  commit SHAs, and a description edit no longer reruns the checks. jira-key
  stays its own workflow. Web, Backend and iOS jobs join with MA-24, MA-194
  and MA-165.
- **The review rule fits Antigravity (MA-306):** the design-board lessons
  move, with their numbers, from `.claude/rules/independent-review.md` to
  `docs/qa/checklist.md`, the checklist MA-304's QA applies, so the rule
  stays under the 24 KB an Antigravity rule holds (Arun, 2 Nov 2026).
- **MyPaisa is a wealth tracker only (MA-307):** Arun, 2 Nov 2026: "remove
  the Holding market forecast and prediction part completely. Including
  signs of buy/add/sell call." The rules engine, stances and every buy,
  add, hold, pause, trim or sell call, the research cards, the track record,
  news and sentiment, the Forecaster and the market brief are retired, with
  their stories and phases 10, 13, 14, 15 and 17; the rest renumbered.
  Prices stay only to value holdings. Only admins write: adding and deleting
  only in the chat, correcting in the chat or in place; every other member
  views only (MA-308, MA-309). The plan, the architecture, the boards, the
  trace, Jira and Confluence changed together
  (`docs/design/reviews/MA-307/decision.md`).
- **What MA-307 left to tidy (MA-310 to MA-313):** Prototype v5's phases 10
  to 12 drawn again (MA-310); `make_talk.py` and `make_team_india.py` made to
  write the wealth-only figures (MA-311); the Lucid drawing's market page 6
  removed (MA-312); the explainer GIFs captured again from the rewritten
  pages (MA-313).
- **The agentic review's upgrades, recorded (MA-323, `ARCHITECTURE.md` §1,
  §4.1, §6.1 to §6.5, §7.1, §7.2, §10.1, §14, §18.6, §18.8, §21.3):** you
  asked, 2 Nov 2026, for "super intelligent agentic ai based wealth tracker
  and forecasting engine, interactive chat based conversations", and picked
  the review's P1 and P2 whole ("Need all of the above") and plan with me
  for Opus. Each upgrade is a tool, a view or a worker job on the concierge
  and the worker, with no new agent, and its story sits in its phase:
  MA-315 (5), MA-314, MA-317 and MA-318 (7), MA-319 and MA-320 (9), MA-316
  (10), MA-321 and MA-322 (11). The same change rewords rule 2 (a call on a
  holding drawn from a market view, against options code computes from
  cash flows), re-anchors the dead man's switch (the views and the
  Projection current by 07:00, check-ins sent by 09:00 outside quiet
  hours), records the surplus rule as an open question (settled on 3 Nov 2026:
  all to cash), re-derives the
  Claude lines (about $30 to $48 a month for two members) and re-cuts the
  agents' shares (concierge 70%, the insight job and plan with me 10%).
- **Every published artifact in step with the repo (MA-324):** you asked,
  3 Nov 2026, "All artifacts and design should be in sync with local".
  `docs/design/artifacts.json` lists every MyPaisa artifact, the repo files
  it is published from and their hash at its last publish;
  `python3 scripts/artifacts_sync.py check`, run inside `plan_sync.py
  check`, fails while a synced artifact is older than its sources. The
  Prototype v5 and MyPaisa Boards artifacts were published again from the
  repo, and the Agent Journey, whose artifact no longer existed, was
  published as a new one with every link moved to it.
- **Architecture v4 rebuilt and published again (MA-325):** its artifact
  was deleted by mistake on 3 Nov 2026 and a deleted link cannot come back.
  You asked for it rebuilt "properly based on latest findings ... more
  engaging": the page now follows the architecture after MA-307 and MA-323
  (Opus on the map for plan with me only, the overnight judges on Batches,
  §14.1's ladder, `get_wealth`), plays nine journeys with a goal, plan with
  me and the Monday digest added, in eight chapters, and is published at
  [MyPaisa Architecture v4](https://claude.ai/artifact/Ns3DLFTCvnLcBxJvRvygBo);
  every link, record page and picture drawn from it moved with it.
- **The crew knows this repo (MA-361):** you asked, 25 Nov 2026, for a team
  of subagents that does the dev work in lanes, 10 at most, picked by
  judgement from a plain prompt. The team is the `crew` plugin
  (`~/projects/crew-plugin`, 18 agents on Fable, Opus, Sonnet and Haiku,
  quality first), enabled here. `.claude/crew.json` tells it this repo's
  areas, rules files, gates, flows, shared files and limits, and copies none
  of them; `.claude/rules/crew.md` records your decisions. A QA pass by
  `crew:qa` is offered beside the review in the merge question and never
  runs on its own ("Ask me first"). The same day you asked that plan-sync and
  the security scan ask first too, like the review: they run only on your
  yes, and the one question at the end of a story now comes before the PR,
  naming plan-sync, the scan, the PR, QA, the review and the merge
  (`.claude/rules/ship-autopilot.md`).
- **Every test has a place and an agent (MA-362, `ARCHITECTURE.md` §15,
  §17.4):** you asked, 26 Nov 2026, for Argos on GitHub for visual
  regression and accessibility, a QA framework for functional testing,
  Maestro for iOS on the laptop, no axe on the laptop, no iOS build on
  GitHub Actions, and "all things to be done locally done my dedicated
  agents", the crew updated with "proper models and effort and concurrency
  (max 10)". `.claude/rules/testing.md` names, for each check, where it runs
  and which crew agent runs it; the crew plugin 0.2.0 adds `qa-web`,
  `qa-ios`, `sec-scan` and `sec-verify` and a hook that refuses an eleventh
  live crew agent.
- **A security framework run by agents (MA-363, `ARCHITECTURE.md` §13,
  §17.4):** you asked, 26 Nov 2026, for "a framework/Agent setup to do
  Security/Vulnerability using the best skills/plugins". MA-326's scanners
  stay; semgrep's Swift rules replace CodeQL Swift (MA-166), a local `ios`
  mode checks ATS, entitlements and the Release app for secrets, and
  `/sec-check` runs `crew:sec-scan`, `crew:security`, `claude-security:scan`
  and `crew:sec-verify` in waves on your yes, against OWASP ASVS, MASVS and
  a threat model in `docs/security/`.
- **Already done:** the architecture and its records (MA-106, MA-112,
  MA-138, MA-141, MA-150), plan-sync (MA-155) and the opt-in review (MA-157).

**Tests:** the skeleton's gates on the empty project; `terraform validate`
and a plan for both environments; the web shell at 390 and 1440 in both
themes, with the association file served, not swallowed by the fallback
(MA-194), its Playwright screenshots taken when Arun asks (MA-304); the iOS shell's Jest and XCUITest runs, its first
bench (MA-165, MA-166), `maestro_local.py selftest`, `maestro_local.py check-syntax`,
`TestIDs.swift` ↔ `test-ids.ts` parity and `p00_shell_smoke.yaml` across the five
cloned Apple Silicon simulators (`375`, `402`, `834`, `1032`, `1376 pt`, MA-273),
and `ExportOptions-Internal.plist` (`testFlightInternalTestingOnly = true`) plus
Release `#if DEBUG` strip checks (MA-167); the scripted journey end to end on
the local stack at both doors (MA-198); the seed refusing to run against prod
(MA-110); the dev dashboard rendering with every widget bound, and a test
invocation of the skeleton Lambda showing in Transaction Search within five
minutes (MA-231); the coverage check refusing a copy with a tool, then a
prompt, that has no case (MA-246).

**Exit:** `terraform plan` runs clean for dev and prod from CI through OIDC;
the gates run on every PR, the web gates on every PR that touches `web/` and
the iOS gates on every PR that touches `ios/`; the budget exists; dev's
Claude key, Twelve Data key, Google iOS and web client ids, Sign in with
Apple key and its key id, Apple team id, the app's bundle id (the audience
phase 1's sign-in checks), the Services ID for the web app, and the APNs key
and its key id are in SSM, over the placeholders dev's apply made; the empty
shells answer at `dashboard-dev.mypaisapp.com`, from TestFlight (MyPaisa Dev
builds in CI and installs from it) and on the laptop, each with the seed
household loaded. The release workflow's first run, after your
approval, applies prod's empty stack, `infra/prod` and `infra/prod-secrets`
(MA-107, in this phase; Arun, 24 Nov 2026), and prod's values go in after it,
by the identity MA-21, MA-26, MA-142 and MA-143 name; the nightly drift check
watches prod from then on (MA-108). Dev's dashboard, alarms
and saved queries exist, and a test invocation shows as a trace (MA-231).

**Cost:** pennies in AWS (dev's watch tower while it sleeps, `ARCHITECTURE.md`
§9.9); the Apple Developer Program, $99 a year (MA-162).

---

## Phase 1 — Talk: sign in and chat with the agent at every door

Both of you sign in and talk to MyPaisa on the laptop, in a phone's browser
and on the iPhone, and every run of the agent is visible. Every later phase
speaks through this chat (`ARCHITECTURE.md` §8). The stream is proved first,
with a spike, because both doors are built on it. What the chat records
arrives from phase 2.

- **The stream, proved first (MA-195).** A spike in dev: the `stream` FastAPI
  app (`StreamingResponse`, MA-266) on Uvicorn behind the Lambda Web Adapter
  1.1 (`response_stream`), as its own build target of the same Dockerfile;
  the stream on the api host, so the session cookie and the authorizer reach
  it, as a route of the api's REST API in API Gateway's streaming mode
  (MA-229). It passes when the first token delta reaches a browser and the
  iOS app in under a second, a killed connection resumes with nothing lost or
  repeated, and the cost per open hour is measured and put to you before any
  apply.
- **The FastAPI REST application and correlation middleware (MA-266,
  `ARCHITECTURE.md` §8.4, §9.2, §9.3):** `handlers/api` on FastAPI behind
  Mangum (`lifespan="off"`) and `handlers/stream` on FastAPI behind Uvicorn
  and the Lambda Web Adapter 1.1; typed Pydantic v2 `RequestModel` and
  `ResponseModel` classes for every `/auth/*` and `/v1/*` route;
  `CorrelationMiddleware` binding `trace_id`, `span_id`, `request_id` (API
  Gateway's `aws_request_id` or `x-request-id`), `client_message_id`,
  `run_id`, `household_id` and `member_id` onto the Powertools Logger and the
  active OpenTelemetry span and echoing `x-mypaisa-trace-id` and
  `x-request-id` on every response and stream handshake;
  `opentelemetry-instrumentation-fastapi` setting `http.route` on every span
  for CloudWatch Application Signals; and `pnpm --dir web api:types` generating
  `web/src/lib/api-types.d.ts` from `app.openapi()` for both doors.
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
- **The api at `api(-dev).mypaisapp.com` (MA-31, MA-75, MA-144, MA-266):** `/auth/nonce`, `/auth/apple`,
  `/auth/google`, `/auth/passkey/options` and `/auth/passkey` (the web app's
  passkey sign-in, MA-109), `/v1/chat/messages` and `/v1/chat/actions` (each
  with the client's id), `/v1/chat/turns`, `/v1/uploads` (a presigned upload
  into the documents bucket), `/v1/devices` and `/v1/stream`, served by the
  FastAPI application with typed Pydantic v2 schemas and correlation headers
  (MA-266); the authorizer
  checks the access token or the session cookie, the member's status and
  session epoch on every call and on the stream. The app and the web app
  reach each environment through it, and the dev build runs against dev or
  the laptop.
- **The stream at both doors (MA-30, MA-266):** Server-Sent Events from
  `/v1/stream` on the api host, served by the FastAPI `stream` app on Uvicorn
  behind the Lambda Web Adapter 1.1. Replies stream in as they are written; cards,
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
- **Queues from day one (MA-139, MA-140, `ARCHITECTURE.md` §19):** the chat
  api puts each message on the `updates.fifo` queue, one lane per member,
  deduped by the client id, and the `agent` Lambda reads it (MA-31); replies
  go through `outbox.fifo` and a `sender` Lambda that delivers over the
  stream to every open door, and by Apple push or Web Push to each device
  with no fresh presence (MA-30, MA-170, MA-200); background jobs (document
  reads, then ingest and check-ins as they arrive) through the `work`
  queue and a `worker` Lambda; retries with backoff, idempotent handlers, a
  dead-letter queue behind each with an alarm to the owner, and
  `scripts/redrive.sh` to replay.
- **One card format (MA-174):** every card is a versioned JSON document,
  drawn by Svelte components on the web and by SwiftUI in the app, with a
  plain line for notifications; a flow started on the laptop finishes on the
  phone.
- **The app (MA-163, MA-168, MA-169):** the shell Arun picked, 1a Chat first
  (tabs on iPhone; on iPad and an open foldable the sidebar; the chat beside
  every screen from about 1393 pt, a sheet away from about 600 to 1393 pt, and
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
  MA-199 builds all of it against a fake local stream; **wiring the web
  chat to the backend (MA-352)** puts it on the real chat API (MA-31), SSE
  stream (MA-30), card JSON (MA-174) and presigned upload (MA-148), and
  checks it on dev (Arun, 24 Nov 2026: "Split MA-199").
- **The Command-K palette (MA-353):** Command-K anywhere, or Search at the top
  of the sidebar, opens one palette over the page to go to a page, find a
  record or ask, its first row sending the question to the chat; nothing is
  created in it (MA-301 g 1a). Found while building MA-199, which leaves the
  sidebar's Search row to it.
- **The web chat as a sheet (MA-357):** from 600 px the web app's chat opens
  over the page as the iPad's does, 600 px wide and centred in the window both
  ways with the page dimmed behind it, centred in the page area beside the sidebar where it shows, at desktop and tablet widths and never
  as a column beside the page (centred, Arun, 25 Nov 2026); from the sidebar's Chat, a page's Ask or Update, or `⌘J` on a Mac;
  closed by Esc, its close button, its grabber or a click outside. Picked on
  MA-355 (a 1a); it supersedes MA-301's column from 1393 and drawer below it.
- **The mark moves when MyPaisa works (MA-360):** it arrives once when the app
  opens, makes one lap when MyPaisa starts on a message and swells once with
  a ring when a change is saved, and is still otherwise; a fade in place under
  Reduce Motion. Picked on MA-355 (d 1a), on MA-103's mark.
- **The page and the chat are the widths Shell 1a draws (MA-354, bug):**
  Home's holding cards fill the page column as the board's content does,
  and the chat column keeps its 1 px border outside its width, as the
  board's content-box CSS draws it; measured against the board at 1440,
  1280 and 390.
- **Activity at every door (MA-196, `ARCHITECTURE.md` §9):** a list of runs
  and one run's detail: its trigger, its steps, each tool call with its time,
  what it proposed, its tokens and its cost, every figure from the
  `RunRecord`.
- **Observability from the first Lambda (MA-29, `ARCHITECTURE.md` §9):** a
  `RunRecord` per run with its trace id, model calls, tokens, cost and tool
  calls; Powertools Logger and Metrics and OpenTelemetry (the AWS Lambda
  Layer for OpenTelemetry in the image) wired in the handler base, with the
  correlation keys on every log line and span; the error alarm per function
  to the owner.
- **The release's Lambda stages, proved on the first Lambda (MA-347):** the
  release built in phase 0 (MA-107) takes the image digest MA-237's build
  pushed, deploys it to dev and the same digest to prod; a test run with a
  forced prod smoke failure moves every `live` alias back; a release that
  ships a Lambda while a prod parameter is still at version 1 stops before
  prod; a failed prod smoke reaches the owner in the app and by push; and
  each deploy writes its `RunRecord`.
- **One trace from the door to the model and back (MA-232, MA-266):** both doors send
  a `traceparent` with every action; FastAPI's `CorrelationMiddleware` and
  `opentelemetry-instrumentation-fastapi` on `api` and `stream`, the queues,
  the agent, the sender and push continue it and echo `x-mypaisa-trace-id`
  and `x-request-id`, so one message is one trace from
  the tap to the push; every `StreamEvent` and push payload carries its
  `run_id` and `trace_id`; the leak test proves no prompt, figure, name or
  token reaches CloudWatch, and the dev smoke test asserts the trace.
- **Every model call a span, and the typed `AnthropicAgentRunner` loop
  (MA-233, MA-271, `ARCHITECTURE.md` §7, §9.3):** `backend/src/mypaisa_agent/agent/`
  runs the ~250-line async tool-use loop on `anthropic.AsyncAnthropic` with the
  prompt-cache assembler (at most three explicit `cache_control` breakpoints,
  on the tools and system prompt together, the household's layer and the
  notes, and the request's automatic caching for the tail; §22.1) and the
  `@tool` Pydantic v2 schema registry (MA-271); one wrapper on every Anthropic call
  sets the open GenAI attributes and MyPaisa's own (cost, feature, agent, the
  ladder's step, cache hit, time to the first token, refusal, fallback), and
  each tool call is a span with its outcome and sizes; the model panel shows
  spend against the ceiling, tokens, the cache-read share, refusals and
  fallbacks, with their alarms; the spans appear in CloudWatch's generative
  AI views.
- **The doors report what they saw (MA-234):** the time to the first word, a
  resume or resync, an api error, a crash or a hang, each with its trace id
  and no content, in one batch to `POST /v1/telemetry`; the client panel and
  its alarms.
- **Guarded from the first word (MA-247, MA-248, MA-249, `ARCHITECTURE.md`
  §21.2):** a policy gate in code before every call of our own tools (the
  agent's manifest, the member's role and household, typed arguments with an
  amount as the member's own text for code to parse, the run's limits),
  failing closed, and taking every tool that sends data out from a
  conversation that has read untrusted text, with its notes and summaries;
  Anthropic's server tools only in a call that holds no household figure;
  every figure a reply states checked against the tool results and the
  member's own words, then regenerated once or replaced by the plain template (the chat's half of
  MA-54's validator, brought forward from phase 10); and a plain refusal,
  with the reason, for a trade, a call to buy or sell, tax advice or another
  household's data.
- **Tested on change, watched live (MA-250, MA-251, MA-252,
  `ARCHITECTURE.md` §21.3, §21.4):** the chat's golden set, about 40 tasks on
  the seed household graded by code first, runs live in the evals workspace
  (T1, three trials, at most $10 a run and $30 a month, a run stopped by its
  cap marked incomplete) on every pull request that changes a prompt, a tool,
  a guard, the agent loop, the model routing, a kind template or the SDK, and
  never on a timer; its key is read from SSM by the `ci-evals` role, applied
  in `infra/bootstrap` when you ask; a model change waits for the full suite,
  five trials on the new id, before the release takes it to prod (T2); every
  live run's checks and the member's signals land in its `RunRecord`, every
  flagged run and a random 10% are judged overnight on Haiku through
  Batches, and only a rate that leaves its band raises an alert, on the
  owner's outbox until phase 8's alert router. The judges stay advisory until
  phase 8.
- **The Claude meter and ceiling (MA-113, `ARCHITECTURE.md` §14.1):** every
  model call costed from the API's usage counts into the cycle's
  `SpendMonth` row, in dollars with pounds beside them; `BudgetSettings`
  seeded at $160 in prod and $40 in dev (the plan's $200 credit), its steps,
  guards and shares all settings; no call past 100% of the ceiling, the card
  going out as its template; the guards per member (60%), per day (three
  times the daily average) and per run (eight model calls); a message to the
  owner at 70% and 100%. Needed here because the `agent` Lambda calls Claude
  from this phase.
- **Chat memory (MA-115, `ARCHITECTURE.md` §7):** every message a `ChatTurn`
  row kept ninety days and never edited; only the current conversation sent;
  a conversation ends after thirty minutes of silence unless a question is
  waiting; a new one starts from the cached fixed part (one-hour TTL) and
  Haiku's one-line notes on recent conversations; past about 50,000 tokens it
  starts afresh from a summary.
- **Every agent's calls cached (MA-286, `ARCHITECTURE.md` §22.1):** the
  runner marks every request of every agent, so none forgets: tools sorted
  and serialised the same way every time, then the system prompt, with no
  date, name, id or figure before the cache; the date, the member and the
  ladder's step after it, as a system message; a lifetime per route in each
  agent's manifest (the chat's fixed part an hour, a run's calls five
  minutes); one model per loop. A byte test fails the build when a prefix
  would change between two members or two days, T1 expects a cache read on
  the second identical call, and the model panel's cache-read share per
  agent alarms once when it falls out of its band.
- **Every agent's memory (MA-287, `ARCHITECTURE.md` §22.2, §22.3, §22.5):**
  Claude's memory tool on MyPaisa's own `MemoryNote` rows, for every agent
  the runner builds; a member's notes read only in that member's runs, the
  household's in everyone's, the agent's own in its runs; every command
  through the policy gate; no amount, rate, account number, id, token or
  secret (refused in code), no record and no setting; a run that read a file
  or a page writes nothing; each write an audit row and one line in
  Activity; leaving the household deletes the member's notes. Within the
  budget (§22.6): the notes loaded once into the cached layer, at most 2,000
  tokens a member per agent, 1,000 for the household, two writes a run,
  costed as their own `memory` feature, written only on request from the 85%
  step and not at all from 95%. Long runs drop old tool results with
  server-side context editing, and the history is never edited.
- **What MyPaisa remembers (MA-288, `ARCHITECTURE.md` §22.3):** in You, at
  both doors, the member's own notes, each corrected in place with Save or
  forgotten with Confirm, and the household's, which an admin corrects or
  forgets; nothing added there. Drawn with
  `/design-first`, in one round with MA-277's list of what was learned,
  before it starts.
- **Every file kept (MA-148):** every file and image a member sends kept in
  S3 for good, before anything reads it, with a `Document` row and an audit
  row; every change made from a file names it.
- **Motion (MA-182):** one motion system for every component and chart, in
  the app and the web app: springs, the glass morphs, figures that roll,
  charts that draw in and scrub, haptics, and Reduce Motion honoured
  (`ARCHITECTURE.md` §8.1).
- **Push, privacy and the rough edges of a phone (MA-170, MA-171, MA-172,
  MA-173, MA-181):** Apple push with no amounts on the lock screen unless
  asked; privacy mode everywhere, the app switcher's blank card and an
  optional Face ID lock; signing out a device and leaving the household; the
  last figures offline with their time and messages sent once back online;
  VoiceOver, Dynamic Type to AX5 and the other accessibility settings on
  every screen; every text and control legible in light and dark at 25% brightness
  (ARCHITECTURE §8.1), measured on the built web app by MA-304, QA on request
  (iOS QA comes after MA-165, with no story yet); MA-303 stopped
  `scripts/contrast_check.py`, which measured it on the boards.
- **Web Push (MA-200):** a reply or a check-in reaches the installed web app
  when it is closed, only on a device with no fresh presence, under the same
  privacy rule as Apple push; the VAPID private key is a write-only SSM
  parameter whose value you put by hand.
- **Your accounts and devices (MA-72):** two-factor authentication on each
  member's Apple Account and Google account, and a passcode with Face ID on
  each device.

**Tests:** the spike's written report (MA-195); the FastAPI route schemas,
`x-mypaisa-trace-id` and `x-request-id` correlation headers, OpenTelemetry
`http.route` span attributes and `openapi-typescript` schema parity (MA-266);
the chat api's security (no
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
`cache_read_input_tokens` above zero on the second message; every agent's
request byte-identical before its first breakpoint across two members and
two days, and a manifest with no cache lifetime refused (MA-286); a note
recalled in the member's next conversation and never in another member's, an
amount, an account number and a token refused, a run that read a file
writing nothing, and each write an audit row (MA-287); a `RunRecord` on
success and on failure, shown in Activity; one message's trace from `api` to
`sender` through the X-Ray API in dev, with the model, tool and push spans on
it (MA-232); the leak test, no prompt, reply, amount, name, token or account
number in any span, log line or metric, in CI; a model call's span costed to
the cent from a recorded `usage` block (MA-233); a telemetry batch over the
limit, or with content, refused (MA-234); the policy gate refusing each
mutated call, and the safety suite's injection, escalation and refusal
cases passing all three trials (MA-247, MA-249); an invented, a
mis-currencied and a mis-scaled figure caught (MA-248); T1 selecting only the
affected cases on a fixture pull request and marking a run stopped at its cap
incomplete (MA-250); a fixture model-id change holding a release until T2
passes (MA-251); a rate pushed past its band alerting once, and a flagged run
judged overnight (MA-252); in the app, Jest for the shell and
XCUITest, snapshot and accessibility checks of every screen and card (iPhone
and iPad, light and dark, Large and AX5, privacy on) (MA-166) plus local Maestro
`p01` flows across all four width sub-bands, `1032 ↔ 1376 pt` mid-draft rotation,
Universal Link `/join/<token>`, simulated APNs push and `--mode dev-live` X-Ray
trace verification (MA-273), and `GET /v1/app/minimum-version` prompt check
(MA-167, MA-266); in the web
app, svelte-check, vitest, Playwright at 390 and 1440 in both themes, an axe
audit, and the service worker caching no figure.

**Exit:** you and your wife are members, each signed in on your own iPhone
with your own Apple or Google account, and in a browser on the laptop and on
a phone; each of you talks to MyPaisa at all three doors, and a reply streams
in word by word at every open door; a conversation started on the laptop
continues on the phone; Activity shows each run's steps, the tools it called,
its tokens and its cost, and the trace of any message, from the tap to the
push, opens from its run id in CloudWatch with no prompt, figure or name in
it; a reply that finishes while the app is closed
arrives as a push with no amount on the lock screen; each of you is a Cognito
user in prod; MyPaisa Dev runs on seeded data from TestFlight, and against
the laptop from the simulator; a merge reaches prod, and MyPaisa reaches your
phones, only after your approval; a pull request that changes the chat's
prompt shows its golden-set result before it can merge, and Activity
lists the runs the judges read overnight; you ask MyPaisa to remember
something, it uses it in your next conversation and not in your wife's, and
you see it in You and make it forget; the model panel shows every agent's
cache reads.

**Cost:** about £0.50 (a few Claude calls), and about £2.70 a month of
CloudWatch in prod for the spans, Application Signals and the metrics and
alarms past the free ten, with dev's alarms about £1.80 more
(`ARCHITECTURE.md` §9.9), dev's first month measured first; the
stream inside the free tier
at about three open hours a day for four members (one leader tab, closed
when hidden; about $0.012 an open hour at 256 MB), priced by the spike and
put to you before any apply (MA-195); the Apple Developer Program from phase
0; the live evals at most $30 a month in their own workspace, and the
overnight judges under $1 a month in prod (`ARCHITECTURE.md` §21.7).

---

## Phase 2 — The first record: one dynamic structure, one write path

The household's first records, registered by talking and shown at both doors,
in a structure that grows without a migration (`ARCHITECTURE.md` §4).
Only admins write. Anything new is added in an admin's chat, with a card,
Confirm and an audit row; an existing figure is corrected in the chat or in
place where it is shown; a record is deleted only in the chat; all three go
through one write service. Every other member views only. The simplest kinds come first (savings, cash, a
property's value, a pension's value), so the whole path is proved before the
maths arrives.

- **One dynamic structure and the typed DynamoDB repository (MA-27, MA-265,
  MA-270, `ARCHITECTURE.md` §4.1, §4.8).** Kinds are data.
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
  there is no relational schema and no DocumentDB cluster (`docs/RESEARCH.md`
  §6.2): `backend/src/mypaisa_agent/registry/` (`keys.py`, `serde.py`, `client.py`,
  `uow.py`, `pagination.py`, MA-270) is a thin typed
  repository on Pydantic v2 (`model_dump(mode="json")`,
  `model_validate()`), `boto3`'s `TypeSerializer` and `TypeDeserializer`,
  `mypy-boto3-dynamodb` (`boto3-stubs[dynamodb]`), a `ForbiddenScanError`
  client guard, HMAC-signed cursor pagination, and a `TransactWriteUnit`
  builder. Every item is keyed by the household and
  carries `schema_version`. A record ends as `closed`, `matured` or `sold`;
  a record an admin deletes is marked `deleted` (MA-309), never erased.
- **Kind specs and the draft tools (MA-197, `ARCHITECTURE.md` §7).** A
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
  §1, §8.3).** The chat's Confirm and an in-place correction go through one
  service: validated against the kind, written as an event, with its audit
  row. An existing figure that its kind marks editable (a value, a rate, a
  date, an amount, an assumption) is corrected where it is shown: tap it,
  type the new value, see the before and after, Save; the change is a
  `correction` event with its audit row (`via: inline_edit`). Nothing can be
  created or deleted in place. Only an admin corrects, on any record; every
  other member views only (MA-308).
- **The api's data routes (MA-74),** behind phase 1's authorizer: each
  member gets only what they may see, the JSON limited to it, and
  `PATCH /v1/records/{id}` accepts a correction only from an admin and only
  to a figure the kind marks editable.
- **Delete through the chat (MA-309, `ARCHITECTURE.md` §4.1, §4.6):** only
  in an admin's chat: the agent shows the record on a card, Confirm, then the
  second check; the record is marked `deleted`, a status hidden from every
  view, its events, audit rows and files kept for good, and restorable
  through the chat the same way. Closing (`closed`, `matured`, `sold`) stays
  separate.
- **The audit log from day one (MA-28, MA-40, MA-265, `ARCHITECTURE.md` §4.6):** an
  `AuditEvent` row in the same `transact_write_items` call as every record
  change (`TransactWriteUnit` in `registry/repository.py`),
  hash-chained; `get_audit` and "what changed this week?" in the chat.
- **The first kinds (MA-203):** savings, cash, a property's value and a
  pension's value, each registered from one sentence or a screenshot, for any
  member, with joint shares where there are two owners; a property asks for a
  new valuation every six months.
- **Owners and joint shares (MA-33):** each member's records have their
  owners, and a joint record has two owners with their shares; an admin
  registers a record for any member, and the card names the owner.
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
  Claude on the Anthropic API (structured outputs with each field's source
  line and confidence), and the Confirm / Edit / Cancel card adds or updates a record;
  nothing saved without Confirm.
- **A file is data, never an instruction (MA-253, `ARCHITECTURE.md`
  §21.2):** `extract_document` runs as its own model call with no tools, the
  file as a labelled document or image block (a sheet's or a statement's
  lines JSON-encoded) and only the strict schema out, each field with its
  source line, checked by code; a red-team set of poisoned statements,
  factsheets and merchant names proves no instruction in a file reaches a
  tool or a reply, and each later importer (CAS, Excel) adds its own poisoned
  cases.
- **Kinds bring their own cases (MA-254, `ARCHITECTURE.md` §21.5):** each
  kind's field spec generates draft cases (phrasings, the four currencies, dates,
  a missing field), graded by code, so a new kind or field is tested in the
  evals job before the admin approves it; the golden set's registering,
  Confirm, cancel and correcting cases join here, graded on the draft and the
  records it leaves.
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
- **The first dashboard (MA-208, `ARCHITECTURE.md` §8.3):** the net worth hero
  and the records by class and by member, at both doors, in the shell of
  phase 1; a confirmed change reaches every open door over the stream and the
  figures move; privacy mode hides every amount.
- **The header's controls (MA-358):** at the top right of every page, whose
  view as a dropdown (Household, Me, each member), the currency, Light or
  Dark and Hide amounts as labelled pills, carried from page to page; one row
  under the title on a phone, toolbar buttons on iPad, and the iOS appearance
  as a setting in You. Picked on MA-355 (b 1a); the hero's currency switch
  goes.

**Tests:** a property test that every write, from the chat or in place,
produces exactly one event and one audit row, and the chain verifies; the
views rebuilt from events matching the running views; a new kind and a new
field added as data, with no migration; a fixture per kind; `draft_record`
typing every value, deriving what it can and listing what is missing;
Confirm committing exactly the hashed draft; every refusal of the write
service (a figure the kind does not mark editable);
a write from a member who is not an admin, in the chat or in place; a
delete marking the record `deleted`, hidden from every view and restored
through the chat, with its events, audit rows and files kept (MA-309);
the Confirm state machine; an expired Confirm refused; the guided flows
(resume after a day, expiry, skipping fields already given, two members
mid-flow at once, two flows open for one member); extraction against three
real factsheets and three screenshots (fixtures with expected JSON); the
currency parser on every form (£ $ € ₹, codes, words, lakh and crore) and a
rupee amount against a pound record never saved as pounds; schema migration
on a v0 item; every data route against each role and member status;
Playwright and XCUITest for the in-place edit, plus local Maestro `p02` flows
(registering by chat, Confirm vs Cancel, inline edit moving SSE across iPhone `402`
and iPad `1376`, and currency mismatch `1b`, MA-273); the iOS scroll bench at 120 Hz
with no dropped frames; every poisoned file passing all three trials with no
tool reached (MA-253); each kind's generated cases in the regression suite
(MA-254).

**Exit:** you type "£5,000 in Monzo savings" on the iPhone; MyPaisa asks
whose it is and shows the Confirm card, and on Confirm the net worth on the
laptop's dashboard moves with no reload; you correct the figure in place on
the laptop (before and after, then Save) and the phone moves too; "what
changed this week?" lists both changes with who and when.

**Cost:** a few Claude calls per record registered, inside the ceiling;
nothing more in AWS.

---

## Phase 3 — Deposits, policies and four currencies

What grows at a known rate, in both countries, and every figure in pounds,
rupees, dollars or euros.

- **Deposits, savers and policies (MA-93):** fixed and recurring deposits,
  UK savers, PPF, EPF, NPS and policies such as LIC, in the UK and India,
  registered through the chat from the kind specs of phase 2 (MA-197); an FD's
  `on_maturity` (renew, renew with interest, pay out); an RD with an annual
  step-up.
- **Wealth maths for what accrues (MA-94, `ARCHITECTURE.md` §6):** deposit
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
- **Four currencies (MA-213):** net worth and every figure in GBP, INR, USD
  or EUR (your ask of 29 Oct 2026, MA-275), a switch per member, with the ECB
  rate and its date shown; rupees in lakh and crore; the four views agree to
  the penny at the day's rate. Records are in the UK and India today; one in
  the US or the euro area is added as data (its kinds and priors) when it is
  needed.
- **What a maturity does (MA-202):** a check-in before and on the maturity
  date asks whether the deposit was renewed, paid out or moved; a renewal,
  with or without the interest, starts a successor record linked to the old
  one; nothing is deleted.

**Tests:** accrual for every deposit and policy kind against fixtures to the
penny, the old tracker's cases included; the maturity timeline; the daily net
worth; the ECB loader on recorded responses, rupees included; the GBP, INR,
USD and EUR views of the same household agreeing to the penny at the day's
rate, with lakh and crore grouping for rupees; a maturity's check-in before and on the date; a
renewal starting its successor, and nothing deleted; Playwright, XCUITest and
local Maestro `p03` flows (`320 pt` Display Zoom rupee hero fit, the currency
switch across GBP, INR, USD and EUR with lakh/crore grouping and privacy
masks, MA-273) for the currency switch.

**Exit:** you register an SBI fixed deposit and a UK saver, a sentence each;
both accrue to the penny and their maturities show on the dashboard; the
currency switch shows the household in pounds, rupees in lakh and crore,
dollars or euros, with the ECB rate and its date.

**Cost:** £0: ECB rates are free; nothing more in AWS.

---

## Phase 4 — Debts and check-ins

What the household owes, and the agent asking when something is due, so the
records stay current with a tap, not a form.

- **Loan maths (MA-204, `ARCHITECTURE.md` §6):** the EMI, the schedule, the
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
- **Commitments and check-ins (MA-205, `ARCHITECTURE.md` §7):** a
  `Commitment` is any expected, dated money tied to a record or a member (an
  EMI, a card bill, a SIP, rent, a premium, a salary, a maturity, a valuation
  due); a `CheckIn` is one occurrence, keyed by the commitment and its due
  date and created once. A daily worker job decides in code, with no LLM, and
  puts each check-in card on the outbox, with push (no amounts on the lock
  screen, MA-170): "HDFC home loan: was November's EMI paid?" with Paid, Not
  yet, Different amount and Paid off in full. The card shows exactly what a
  tap writes, so Paid is the Confirm, with Undo; Not yet asks again in a few
  days, then shows as overdue; Different amount and Paid off in full open a
  short flow, and Paid off in full closes the record and ends the
  commitment. Several due at once share one card with All paid. A tap writes
  a record, so check-ins go to the admins and only an admin answers one
  (MA-307); a member who is not an admin sees that one is pending, with no
  buttons. This replaces the one-off reminders.
- **Autopay and the weekly digest (MA-211):** an autopay commitment is assumed
  paid after its grace period unless a statement or an admin says
  otherwise, and a weekly digest lists what was assumed, which keeps the agent
  to about ten notifications a week.
- **The Debts and one-loan screens (MA-214, `ARCHITECTURE.md` §8.3, §11):**
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
and one-loan screens at both doors, including local Maestro `p04` simulated APNs
EMI check-in tap (`Paid, ₹39,390`) and offline queue flush (MA-273).

**Exit:** you register an HDFC home loan from a sentence; MyPaisa computes the
EMI, the schedule and the end date; when the EMI falls due the check-in card
asks whether it was paid, and one tap on Paid records it at every door; "Paid
off in full" closes the loan and ends its commitment.

**Cost:** check-ins are decided in code, with no LLM, so only the
conversations call Claude, inside the ceiling; nothing more in AWS.

---

## Phase 5 — Investments, priced

Shares, funds, bonds and gold in the UK and India, each inside its account,
priced every day from free sources, with its real return: XIRR and CAGR from
the dated ledger. Prices exist only to value what the household holds.

- **The `PriceSource` contract (MA-41) of `ARCHITECTURE.md` §5.1:** one
  plugin per feed (`yfinance`, `twelvedata`, `eodhd`, `issuer_page`, `ft`,
  `screenshot`, `stale`, and `amfi` for India), a registry that
  imports only the plugins in use, per-plugin identifiers on the instrument,
  and chains per kind set in `infra/<env>/terraform.tfvars` (and a `.env` for
  local). yfinance is the default chain head in every environment; the EODHD
  plugin ships with the others, switched on by putting it first in the chain
  and adding its key.
- **Daily prices, free (MA-207):** each holding priced every day from
  yfinance for listed lines and AMFI's NAV file for Indian mutual funds;
  London lines quoted in pence normalised to pounds; a failed or stale source
  is a normal day, the last price kept and marked. Split from MA-42 and
  MA-151: the fuller chain follows below (MA-42) and India's in phase 14
  (MA-151).
- **The price chain (MA-42):** yfinance (`0P…L` ids for the funds, tickers
  for ETFs), Twelve Data for the US lines, the screenshot plugin and the
  `stale` rule; ECB FX and calendars from phase 3 (MA-44). yfinance is
  unofficial and can break without notice, so the ingest job treats a failed
  or stale source as a normal day: it falls through the chain, marks the
  valuation provisional, and the 07:45 alarm fires only when every source has
  failed for two days.
- **Backups for the free feeds (MA-43):** the BlackRock product page, the FT
  tearsheet and the EODHD plugin. EODHD is not in the chain unless the free
  sources are shown missing or misreporting London closes.
- **Input hygiene (MA-45):** interpolated bars, provisional closes and stale
  prices dropped or marked before any holding is valued.
- **The source-comparison report (MA-46):** when two plugins are configured
  for an instrument, both are recorded and the Activity page lists
  disagreements; yfinance is run against EODHD's free trial for the first
  month and the choice made from the numbers. Which source actually serves
  the Monzo funds' NAV is verified and recorded in `docs/RESEARCH.md`.
- **Investment kinds (MA-206):** shares, ETFs, OEICs, mutual funds, bonds and
  gold in the UK and India, inside their accounts (ISA, GIA, SIPP, demat, a
  mutual fund folio) as child records; the ISIN, ticker or AMFI scheme code
  found from a factsheet, a screenshot or a name; units and cost recorded;
  joint shares where there are two owners.
- **Plain-English transactions (MA-38):** "I put £200 into Balanced" via a
  strict `propose_change` tool and Confirm.
- **XIRR to the penny (MA-212, `ARCHITECTURE.md` §6):** for a holding, an
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
  Me switch and, for an admin, a tab per member.
- **The Assets and one-asset screens (MA-217, `ARCHITECTURE.md` §8.3, §11):**
  Assets filtered by kind, member, country and maturity window; one asset
  with its value series, XIRR with its working, its events and files, and
  in-place correction of its editable figures, at both doors.
- **What changed and why (MA-315, `ARCHITECTURE.md` §6.2, §7.1, §21.2):**
  the `Attribution` view splits any change in net worth, by member, record,
  class and country, into saved, markets, currency, accrual, revaluations,
  corrections and other, worked out day by day so the parts add up to the
  penny, with where the saving went beside it; `explain_change` returns
  them; the claim check holds every "because" in a reply to a part a tool
  returned. The Overview's "where growth comes from" reads it in phase 9
  (MA-95); designed first.

**Tests:** the plugin contract suite, run against every plugin on recorded
responses (same `Bars` shape, pounds not pence, the stale rule, idempotence
per date, a clean failure when the source is down), with the recordings
refreshed only by a deliberate command; the chain falling through to stale;
input hygiene on recorded bad bars; the source-comparison report on two
recorded feeds; XIRR against spreadsheet fixtures to the
penny, the old tracker's cases included, and the reason given when it cannot
be computed, with hypothesis; a typed transaction through Confirm; a fixture
per investment kind, each holding inside its account; an estimate labelled
wherever the return shows; a SIP instalment written as a buy, with its
step-up; the Assets and one-asset screens at both doors, including local Maestro
`p05` Photos `addMedia` valuation screenshot extraction and XIRR Technical fold
(MA-273).

**Exit:** an ISA fund, an Indian mutual fund and a share are registered
through the chat and priced every day; each shows its XIRR with its working,
or, with no history, the agent asks for past transactions or an estimate.

**Cost:** £0 for prices: yfinance, Twelve Data's free tier and AMFI's NAV
file are free (£20 a month more only if EODHD Historian is chosen on the
report's evidence); nothing more in AWS.

---

## Phase 6 — Budget: statements and monthly check-ins

What comes in and what goes out, each month, per member and for the
household, filled from statements and one short check-in.

- **Budget (MA-96, `ARCHITECTURE.md` §4.1, §6, §11):** each member's income and its history (past years'
  figures, so growth can be measured), from the chat or payslips, stored as
  income commitments; a monthly plan per category, the categories data you
  change by chat, EMIs and card payments from their commitments; the Budget
  screen with plan against actual per category, income, EMIs, the surplus and
  the savings rate, per member and for the household, in GBP, INR, USD or EUR. Income
  commitments accept dated future changes and each category carries its
  inflation key, so phase 7's plan items can change them (MA-261); every
  amount is take-home, with no tax maths. The Projection that used to sit
  with the budget is phase 7.
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
member and for the household, in each of the four currencies; salary growth measured from
its history; local Maestro `p06` Local File Provider PDF statement upload via
`Files` picker, category review card and month close on iPhone `402` and iPad
`1032` upright (MA-273).

**Exit:** you send a bank statement in the chat; it comes back categorised,
transfers recognised, uncertain lines in amber, for one Confirm; the Budget
screen shows plan against actual.

**Cost:** Haiku only for the merchants the memory does not know, inside the
ceiling; nothing more in AWS.

---

## Phase 7 — Projection

Where the household's net worth is heading over the years, computed by code
and steered by the agent, from the household's actual numbers. Two words,
one engine (`ARCHITECTURE.md` §6, MA-275): the **Budget forecast** is
deterministic, worked out from the household's inputs to the penny (MA-262);
the **Projection** is the household's net worth over time, the same path and
then a fan; and `ForecastAssumptions` becomes `ProjectionAssumptions`.
Nothing here predicts a market.

- **The engine (MA-219, `ARCHITECTURE.md` §6):** `wealth/projection.py`
  runs month by month to a horizon (twenty years by default; 5, 10, 20 or
  30), with a today's-money toggle, money in `Decimal`. Its inputs: each record's country, which sets its
  inflation and wage-growth prior, each currency drifting against GBP with
  its inflation gap; each member's current net salary, its growth blending the
  member's own measured history with the country's prior, weighted by the
  years of history; returns (contractual rates as given; a market asset's
  observed XIRR shrunk toward a long-run prior per asset class and country,
  by how much history it has; estimates as marked); debts amortising to their
  real end dates and freeing their EMIs; maturities, commitments, the
  budget's spend inflating by country, and the admin's plan items;
  the surplus kept as cash in its currency (Arun, 3 Nov 2026: "All to cash", `ARCHITECTURE.md` §15);
  and no locked pension covering a shortfall
  before it unlocks. The deterministic path first, then a Monte Carlo fan
  (p10, p50, p90); each run stored as a `ProjectionRun` with its inputs hash,
  seed, engine version, percentiles and milestones. It ports the old
  tracker's `forecast.ts`, `budget.ts` and `amortisation.ts` with their cases
  as golden fixtures, then extends them. Since MA-261 it also applies a plan
  item's three effects (a new flow; a change to an existing flow, such as a
  salary, a SIP or a budget category, from a date; an event on a record, such
  as a loan prepaid or closed, freeing its EMI), steps growth up on each
  anniversary of a plan's start, pays a one-off from where it names (the
  surplus and cash first when it names nothing, a flag if they run short),
  and puts out a budget forecast ledger and a trace of the flows behind every
  figure.
- **Priors by country (MA-221):** long-run returns per asset class and
  country, inflation per country with category overrides such as education
  and health, and wage growth per country, each versioned with its source;
  set by an admin, every change audited.
- **Plan items: future plans by talking (MA-222, MA-261, `ARCHITECTURE.md` §4.1, §4.5, §4.10, §6, §7):** the admin says
  what is coming ("£4,000 a month from Jan 2029 for my kid's schooling", "my
  salary goes to £8,000 a month from Sep 2028", "₹2 cr to close my SBI home
  loan"); the agent asks only for what is missing, at most three questions
  with chips (whose, until when, how it grows, paid from where), and shows an
  impact card from the engine (net worth at 5, 10 and 20 years, the surplus
  each year, the first month cash would go negative, new milestones) for one
  Confirm. One-off or recurring, with a start, an end, a currency and a growth
  rate; every amount take-home. Created only in the admin's chat and
  corrected, paused or ended in place only by the admin, as are the saved
  assumptions; members see them; every change audited with the admin's own
  words and the Projection run before and after; no second check, since they
  change a plan, not the records.
- **The Budget forecast (MA-262, `ARCHITECTURE.md` §6, §8.3, §11):** each year to the horizon, expandable to
  its months: income by member, spend by category, EMIs, each plan item, the
  surplus, the savings rate and closing cash, in GBP, INR, USD or EUR; any figure
  opens the flows that make it; the months below the admin's floor flagged
  by code; at both doors.
- **Rearranging the budget (MA-263, `ARCHITECTURE.md` §4.5, §4.10, §6, §7, §11):** when a plan leaves cash below zero or
  the surplus below the admin's floor (a monthly surplus kept among the
  Projection's assumptions, £500 to start, the admin's alone, holding while
  anyone in the household earns a salary; in retirement only cash running
  out is flagged; Arun, 28 Oct 2026, MA-264), code works out the options (trim a
  category from a date, pause a SIP, move a plan's start, draw from a named
  pool, change the surplus rule) and the agent ranks and explains them, each
  as an unsaved scenario card; the admin's Confirm applies one, as Claude
  proposes a change and you accept it: plan items from their dates and, where
  it touches this month, the current month's budget plan, each with its audit
  row and Undo.
- **What-ifs and the story (MA-223, `ARCHITECTURE.md` §6, §7):** code produces every number; the model
  never does. The agent proposes the assumption set with a reason for each
  figure; answers a what-if ("what if we buy a house in 2028?") by filling a
  typed override whose numbers trace to the member's words or a named preset,
  shown as an unsaved scenario card; explains what drives the curve, from the
  engine's trace; and raises the trouble flags and milestones code computes.
  Members ask what-ifs but save nothing.
- **The Projection screen (MA-224, `ARCHITECTURE.md` §6, §8.3, §11):** the fan in
  GBP, INR, USD or EUR, in today's money or not, opening at 20 years with 5, 10, 20 and
  30 to choose; milestones on the line (loans ending, maturities, plan
  items); the assumptions panel with each source, editable in place by the
  admin; a Plans tab (each plan on a timeline, corrected in place by the
  admin, with a pause toggle and Add in chat) and a Budget forecast tab;
  scenario chips; Ask; at both doors.
- **Home's interactive charts (MA-359, `ARCHITECTURE.md` §6, §8.3):** what we
  own and owe as one double ring on one scale, its lists the legend and the
  table; and invested against owed to 5, 10, 20 or 30 years, with the month
  one passes the other and where the growth comes from (held today, saved
  from income, growth and interest). Invested is everything owned except
  property. The engine returns the monthly series and the split. Picked on
  MA-355 (c 1a).
- **Goals and the goal solver (MA-314, `ARCHITECTURE.md` §6.1, §4.1,
  §7.1):** "£40,000 for a car deposit by Sep 2028" kept as a goal; the
  solver, on the base path, gives where it stands, the date reached at
  today's saving, the monthly saving that reaches it on time (a bisection
  on a `change_flow` amount), the other levers as options, and from the fan
  the chance; goals sharing a pool solved in priority order; `solve_goal`
  for everyone, a goal saved only by an admin with Confirm; goals as
  milestones and a Goals list on the Projection screen; designed first.
- **The scenario workspace (MA-317, `ARCHITECTURE.md` §6.3, §4.1, §7.1):**
  up to four what-ifs beside the base in one `compare_scenarios` call (net
  worth at 5, 10 and 20 years, the leanest month, each goal's date and
  chance); a scenario saved by name and promoted to plan items with one
  Confirm, by an admin. Only admins save scenarios; every member may ask
  and see a what-if, never saved (Arun, 3 Nov 2026: "Admins only").
  Designed first.
- **A richer Monte Carlo (MA-318, `ARCHITECTURE.md` §6.4):** the fan draws
  class returns, CPI in the UK and India and GBP/INR together, correlated
  and fat-tailed, with inflation flowing into spend and salaries, sequence
  risk in drawdown years and the chance of running short; every volatility
  and correlation a versioned prior with its source; a sensitivity table of
  the five inputs that move the 20-year figure most, drawn as a tornado;
  designed first.

**Tests:** the engine against the old tracker's forecast and budget cases as
golden fixtures; debts amortising to their real end dates; a locked pension
never covering a shortfall before it unlocks; the shrinkage weight on
hand-computed cases; a Monte Carlo run reproduced from its stored seed; the
override validator refusing a number traced to neither the member's words
nor a named preset; plan items and saved assumptions refused to a member, in
the chat and in place; golden fixtures for the three sentences above (the
schooling, the salary step, the loan closed and its EMI freed); every month,
opening cash plus its flows equals closing cash; a paused plan changes
nothing; the goal-seek's options on hand-computed cases; eval cases for the
three sentences and ambiguous ones (no end date, "about 2 cr", a loan that
does not exist); the Projection screen at both doors, including local Maestro
`p07` fan scrub, `1a` Budget forecast, `2a` chat plan rearrangement and `3a`
Plans tab on iPhone `402` and iPad `1376` (MA-273).

**Exit:** the Projection screen shows the fan with its milestones; you ask a
what-if and see an unsaved scenario; as the admin you say "£4,000 a month
from Jan 2029 for my kid's schooling", answer the agent's questions, confirm,
and see the Budget forecast and the fan move; you accept a rearrangement and
see this month's budget change; you correct a plan item and an assumption in
place; each with its audit row.

**Cost:** the engine, the goal solver, the scenario workspace and the fan
are code; only the assumptions, the what-ifs, the narration and the words
over goals and scenarios call Claude, inside the ceiling (goals, scenarios
and what changed: about £2.70 a month on the standard setup,
`ARCHITECTURE.md` §14); nothing more in AWS.

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
  ceiling, the step and the days left; an admin sets the ceiling (from $10
  to the hard limit), the member share, the renewal day and the hard limit,
  each behind the second check (MA-76, MA-102), each an audit row and a
  message to the admins; a ceiling that takes prod and dev together past the
  plan's credit warns that the extra needs a card and needs an explicit yes,
  and one above the hard limit is refused with the steps to raise the Console
  limit first.
- **Caps and alerts** (MA-137, `ARCHITECTURE.md` §14.2), in the same
  section: the Claude ladder's steps and guards; the AWS and others cap (£50),
  its steps (50%, 80%, 100%, forecast) and actions (dev pauses first;
  alerts and chat never stop), metered daily from Cost Explorer; the
  AWS Budgets backstop at £75 in Terraform; one alert router to the app's
  Alerts screen, push to the admin's devices and email through SNS (1,000 a
  month free), with quiet hours, cooldowns and a digest; "failed work" alerts
  from the dead-letter queues carry a Replay button (§19, MA-145).
- The Admin center's admin actions in the `api` Lambda, behind the
  authorizer of phase 1 and each behind the second check
  (`ARCHITECTURE.md` §8.3; the security actions are the owner's alone, MA-102): the security actions (MA-102), the ceiling and
  caps with their alert routing (MA-116, MA-137) and replaying failed work
  (MA-145) in this phase; deciding agents' requests, rolling a setting back
  and closing an incident (MA-130, MA-135) join in phase 13; JSON limited to
  what that member may see.
- **Several admins, everyone else views (MA-308):** the owner grants or
  takes back the admin role in the chat, with Confirm, the second check and
  an audit row; the owner is always an admin. Admins add, correct and delete;
  every other member views only, their own preferences aside, at every door
  and in every route.
- **The owner's security actions (MA-102):** signing out or pausing any
  member's devices from the Admin center. A paused member's sign-in is
  refused with one line until the owner restores them, and the owner cannot
  pause their own account (your call, 29 Oct 2026).
- More than one way in (MA-77): a member adds a second sign-in, Apple or
  Google, or a passkey, from You, with a fresh sign-in on the new account
  and no second check (your call, 29 Oct 2026); the owner can unlink one
  from the Admin center; every link, unlink and sign-in an audit row.
- **The judges, calibrated by the admin (MA-255, `ARCHITECTURE.md` §21.5):**
  each month, and whenever a judge, a prompt, a tool or the model changes,
  the Admin center offers about 30 runs with their transcripts and verdicts;
  the admin marks pass or fail per failure mode with a one-line critique,
  behind the second check; labels accumulate, each keeping its run's
  transcript; a judge acts once it has 50 pass and 50 fail labels, and one
  below 0.8 on its true-positive or true-negative rate drops to advisory; a
  run marked failed becomes a regression case once rewritten onto the seed
  household and confirmed behind the second check; the eval caps are seen
  and moved here. Designed first with `/design-first`.
- **The web app's Audit, Files and Admin center (MA-184):** the same pages in
  a browser, from the browser boards in MyPaisa app v1, with the second check
  a passkey or a fresh sign-in for the admins' actions.
- **Already done:** the Warm ledger design system (MA-101) and the mark
  (MA-103).

**Tests:** the second check (a fresh assertion, one six minutes old, one for
another action, a replayed one, a Google member's re-sign-in); adding and
unlinking a second sign-in (the right account, one linked to another member,
unlinking the last one refused); granting and taking back the admin role,
only by the owner, with the second check, and the owner never losing it
(MA-308); every write route refused to a member who is not an admin; every
route against each role and each member status; a token from the other environment; JSON shape; the Audit
screen showing a change made in the chat or in place within a minute; Search
finding a record, a change, a file and a past answer; a judge below 0.8 on
its true-positive or true-negative rate dropping to advisory, and a labelled failure becoming a case on the seed
household (MA-255); snapshot tests of every
screen on iPhone, iPad and the foldable sizes in both themes, at Large and
AX5, with privacy on, and the accessibility audit, plus local Maestro `p08`
Quick Look file preview, Search tab and Admin center `BiometricKit_Sim` Face ID
second-check mismatch refusal and retry match (MA-273); in the web app,
Playwright screenshots at 390 and 1440 in both themes.

**Exit:** you open the Admin center on your iPhone, on the laptop and in a
phone's browser; moving the ceiling asks for the second check and leaves an
audit row; the Audit screen shows the change you just made, with who and
when, and opens the file behind it; your wife sees the household and, until
you make her an admin, changes nothing; a removed member cannot get in.

**Cost:** £0.

---

## Phase 9 — The whole dashboard, and the old wealth tracker retired

The household's whole wealth on prod, complete at every door, and the old
tracker at `mypaisapp.com` switched off.

- **The Overview, complete (MA-95, `ARCHITECTURE.md` §11):** the hero (net
  worth in GBP, INR, USD or EUR, switchable per member, with the ECB rate and its date,
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
- **History import (MA-111, `ARCHITECTURE.md` §17.5):** one versioned Excel
  template sent in the chat, from the app, the web app, or Claude Code on
  your laptop through a one-time upload link you open in the app (your pick,
  29 Oct 2026), a dry run, Confirm with the second check, batch
  writes through the write service with audit rows, a fingerprint so a file
  sent twice adds nothing, and rollback by import id. Tested on dev's
  synthetic data first, then used to hydrate prod with the past investments
  XIRR needs. Prod is filled only through the app: the chat, statements and
  this importer.
- **Any question about the money (MA-104, `ARCHITECTURE.md` §11.1):** a
  nightly export of the household's events and views to Parquet in S3, and a
  `query_ledger_sql` tool that runs read-only DuckDB over that household's
  files only, for questions the structured `query_ledger` tool (MA-62)
  cannot express; the figures come from the result, and the SQL is shown
  under Technical; designed first.
- **The household starts to learn, straight after the whole wealth (your
  pick, 29 Oct 2026; `ARCHITECTURE.md` §18.2, §18.8).** Straight after the
  whole wealth, so the Budget forecast and the Projection learn from your own
  months as early as they can:
  - **E1, settings (MA-129).** Every behaviour a versioned `Setting` with a
    schema, a range, an automatic band and an approval rule; defaults in
    `config/defaults.yaml`; one settings service; a minute's cache; a daily
    snapshot to S3.
  - **E9, the household's forecasts graded and tuned (MA-276,
    `ARCHITECTURE.md` §18.8).** At each month close, that month's line of the
    Budget forecast is graded against what happened, each gap traced to its
    input. The tuner proposes a category's run rate, a category's own
    inflation or a member's salary growth from at least 6 closed months, a
    step at a time, and the admin's Confirm applies it as a new version of the
    assumptions; the records, the plan and the arithmetic never move. The
    Budget forecast tab shows each month's forecast beside its actual;
    designed first.
  - **E10, each member's needs learned from use (MA-277, `ARCHITECTURE.md`
    §18.8).** From each member's own taps, answers, corrections and mutes,
    never from text a file or a page brought in: the composer's chips
    ordered on their own inside a band; a merchant's
    category, an alert threshold, a quiet hour or a usual answer proposed as a
    card for that member's Confirm; a field corrected after a file kept as a
    case; You lists what was learned, with a reset; designed first.
  E10 starts with what exists by then (the chat's chips, the merchant
  memory, check-in answers, corrections after a file) and learns the alerts
  once phase 10 brings them.
- **The fan graded (MA-319, `ARCHITECTURE.md` §18.8):** at each month close,
  whether actual net worth and each goal's pools landed inside the p10 to
  p90 of the runs made 1, 3 and 12 months earlier, the coverage rate and
  each point's PIT; goals graded against their glide paths; a return or
  inflation prior proposed only when the band has missed over at least 12
  points, a step at a time, on the admin's Confirm; the band's record on the
  Projection's assumptions panel and in the tuner's note; designed first.
- **Tax-year facts and dates (MA-320, `ARCHITECTURE.md` §6.5, §7.1):** the
  UK tax year, the ISA and pension allowances and the Self Assessment
  deadline as versioned facts with their gov.uk sources; each member's ISA
  allowance used and left from the ledger; `get_calendar` for the dates in
  a window; never tax advice; India's year and 80C follow in phase 14;
  designed first.

**Tests:** the importer (a wrong template version, a bad row, the same file
twice, a rollback); every Overview figure matching the screen behind it; the
viewer's masked figures; the GBP, INR, USD and EUR views of the same
household agreeing to the penny at the day's rate; an agent unable to move
a setting outside its band (MA-129); a month's grade read back the same from
its stored run, no assumption proposed before 6 closed months or applied
without the admin's Confirm, text a file or a page brought in teaching E10
nothing, and one member's learning never reaching another (MA-276, MA-277); `query_ledger_sql` reading only that
household's files; the apex redirect and the old distributions' retirement in
the Terraform plan; local Maestro `p09` whole-wealth cross-band sweep (`320` to
`1376 pt`), Dynamic Type `AX5`, Dark 25%-brightness `assertScreenshot` and Local
File Provider Excel workbook upload (MA-273).

**Exit:** the household's whole wealth is on prod, every figure entered
through the chat, statements or the Excel importer, and corrected in place
where needed; each closed month graded against its Budget forecast; `mypaisapp.com` opens the dashboard, and the old tracker is
switched off.

**Cost:** about £1 a month more in Claude for the wealth phases' flows;
nothing more in AWS.

---

## Phase 10 — Alerts, charts and the Claude client

Claude writes on top of numbers that already work, and the household hears
when something needs it: a budget running over, a check-in left open, a job
that did not run.

- Anthropic client with the key from SSM, model routing, caching, refusal
  fallback; alerts and cards through the figure check the chat has had since
  phase 1 (MA-54, MA-248).
- The alert cards, designed first (MA-55): a budget category over its plan,
  a check-in overdue, a maturity or a valuation due, a failed job; the
  Technical section on every card; `/technical` mode; the glossary on a tap.
- Charts: one house style, 1a Monzo Pulse (MA-295, MA-56), in Swift Charts
  and LayerChart; a holding's value series, the net worth curve, the budget
  against its plan and the Projection's fan, drawn in the card from the
  views' series (MA-58).
- Alert tiers, cooldowns, weekly red budget, quiet hours, Haiku repeat
  filter; alert tiers as push interruption levels (red time-sensitive with
  sound, amber passive) (MA-59); dead man's switch and error alarms to the
  owner, in the app and by push (MA-61).
- The ladder's lower steps (MA-114): at 85% of the ceiling web searches are
  limited to three a day; at 95% chat runs on Haiku and alerts go out as
  templates; alerts are never dropped.
- **Quiet nudges and a Monday digest (MA-316, `ARCHITECTURE.md` §10.1):** a
  nightly insight job with detectors in code (budget drift, idle cash, a
  goal off its glide path, a maturity or a rate change coming, a
  prepayment's impact, an unusual spend, a salary not credited, a rupee
  move, an allowance's year end), each finding scored and fingerprinted;
  one silent digest card on Monday morning per admin and at most one timely
  nudge a week; muted kinds learned by E10; facts only, never "should";
  designed first.

**Tests:** the figure check catching an invented number in an alert and a
card; alert state machine with frozen time; spend driven through each step of
the ladder with frozen time, checking which calls are made and on which
model; card rendering from recorded Claude responses; chart snapshot tests
and local Maestro `p10` alert cards, time-sensitive red alert push, Swift
Charts `AXChartDescriptor` summary and Technical glossary tap (MA-273).

**Exit:** two weeks of alerts in which none fires twice in its cooldown; a
layman reads the top of a card and understands it without the bottom.

**Cost:** about £3.60 a month, the insight job's lines and its Monday
digest about £0.60 of it (`ARCHITECTURE.md` §14).

---

## Phase 11 — Ask anything about the household's wealth

You can ask anything about what the household owns, owes, earns and spends,
and where it is heading, and the answer comes from the records (MA-62).

- The tool loop with strict tools, `tool_choice` always `auto`; the
  composer's shortcut chips and each screen's Ask.
- Answers from the household's own tools: `query_ledger` and
  `query_ledger_sql` (MA-104) for the records and their history, XIRR and
  CAGR from the dated ledger, the budget month, the Budget forecast and the
  Projection; a `scenario` card for a what-if, unsaved, from phase 7's
  engine. Nothing predicts a market, and nothing says buy, hold or sell.
- Anthropic's server-side `web_search` and `web_fetch`, only to look up a
  holding's public details when it is added (its ISIN, its listing, its fund
  house's page; `ARCHITECTURE.md` §7), never to explain a move in value:
  results treated as untrusted text under phase 1's rule, given only to a
  call that holds no household figure, and a conversation that has read them
  narrowed by the policy gate (MA-68, MA-247). A move in value is explained
  from code's own figures: the FX change and the holding's currency split.
- Natural-language preferences with Confirm.
- **Reasoning-quality evals and leaner tools (MA-321, `ARCHITECTURE.md`
  §21.3, §21.4, §7.1):** capability cases graded against the engine (goal
  solving, attribution, three-way comparisons, ambiguous plans), judges for
  faithful causes, asking only what is missing and fact not advice, rule 2's
  safety cases on both sides, and trajectory metrics in every run; the five
  overlapping reads merged into `get_wealth`, with `get_projection` and
  `get_returns` added.
- **Plan with me (MA-322, `ARCHITECTURE.md` §7.2):** an admin starts a
  deeper planning session (retirement, education, a house) on Opus 5.5 in
  its own loop, with the read and planning tools only; it ends in one plan
  card whose every change takes the admin's Confirm; at most 5% of the
  ceiling, waiting from the 85% step; designed first.

**Tests:** each card against fixtures; scripted conversations on recorded
responses; every figure in an answer traced to a tool result; a question
asking for a buy or sell call answered with the household's numbers and a
plain refusal of the call; search results containing instructions are not
acted on; local Maestro `p11` question, answer and Scenario card flows across
iPhone and iPad (MA-273).

**Exit:** ten real questions about the household's wealth answered from its
records, each figure with its working under Technical.

**Cost:** about £10 a month cumulative, plan with me on Opus about £3.85 of
it on the standard setup and never more than its 5% of the ceiling
(`ARCHITECTURE.md` §7.2, §14).

---

## Phase 12 — New kinds of holding (when you add one)

Adding an iShares ETF from Monzo's "Build your own" range or, later, a share:

- The `/add` path already handles it (ISIN and ticker from the factsheet).
- A price source for the listing (EODHD or yfinance), already in the chain.
- Its value, XIRR and CAGR from the dated ledger, like every other holding.

**Tests:** kind spec approval behind the second check, price-source chain
verification, and local Maestro `p12` new holding kind registration and card
rendering (MA-273).

---

## Phase 13 — The agent team: configured, approved, self-healing, self-learning

MyPaisa becomes a small team of agents with narrow jobs that keep the
records, the budget and the Projection current: every behaviour a setting
an admin controls, every change outside a setting's band an admin's approval
in the chat or the Admin center, and repairs made where they are safe, as
`ARCHITECTURE.md` §18. Epic MA-127. For one household and its admins (the
owner always one of them, MA-308).

- **E2, the admin desk (MA-130).** Agents' requests and questions, and
  each admin's instructions, in the admins' chat and the Admin center
  (Approvals, Settings, Agents, Incidents); approval with the second check;
  a daily digest, incidents at once; designed first.
- **E3, the data steward (MA-131).** yfinance, Twelve Data's free tier and
  free websites first, with failover, gap repair and disagreement checks;
  EODHD only on an approved request showing the evidence and the price.
- **E7, the ops warden (MA-135).** The daily run as one Step Functions state
  machine with retries; safe repairs on its own; an incident for the rest;
  heartbeats from every agent; dead-lettered work
  replayed on its own once its cause is healthy, at most three times, then an
  incident (MA-146).
- **E7, one trace (MA-235).** The daily run is one trace from the tick to
  the last alert's push: Step Functions and the event bus carry it, each agent is
  a service on the map, a replay links to the run it repeats, an incident
  names its trace, and every heartbeat is a metric (`ARCHITECTURE.md` §9.8).
- **E8, budgets for the team (MA-136).** Each agent's share of the plan's
  $200 Claude credit, metered by agent; paid feeds recorded as subscriptions
  against the AWS and others cap of MA-137.
- **Each agent guarded and tested on its own (MA-256, `ARCHITECTURE.md`
  §21.5).** Every agent of the team has its own manifest entry and safety
  suite; a `ChangeRequest` that changes a prompt, a rule, a threshold or a
  model carries the affected suites' results from dev, and a failing safety
  case blocks its approval.
- **Each agent's own notes (MA-289, `ARCHITECTURE.md` §22.4):** every agent
  of the team keeps notes on its own work through phase 1's memory: a
  source's quirks, an incident and the fix that worked, why you approved or
  rejected a request, so a rejected one is not proposed again within its
  period; read at the start of each run, never a setting, and listed in the
  Admin center for you to read, correct or clear behind the second check.

**Order.** E1, the settings store, is built in phase 9 with E9 and E10, the
household's learning (your pick, 29 Oct 2026); E2 can come forward once the
Admin center and the second check exist (phase 8, MA-102); E3 after phase 5's
price chain; E7 and E8 alongside.

**Tests:** a member who is not an admin cannot reach the desk; approval
without the second check is refused; an agent cannot move a setting outside
its band; injected failures at each pipeline step recover idempotently or open an
incident, and the trace shows the step and the incident names it (MA-235);
metering by agent; local Maestro `p13` Admin desk Approvals, Settings, Agents
and Incidents flows behind `BiometricKit_Sim` Face ID (MA-273).

**Exit:** a month in which every change was either inside its band or
approved by an admin, every closed month was graded against its Budget
forecast, every failure was repaired or raised, and spend stayed
inside the $200 credit for the agents and the cap for AWS and others.

**Cost:** inside the two budgets; Step Functions, EventBridge and the extra
DynamoDB items sit in their free tiers at this volume.

---

## Phase 14 — Indian holdings and the existing Indian portfolio

`ARCHITECTURE.md` §20, epic MA-147. Indian mutual funds, NSE and BSE shares
and ETFs valued beside the UK holdings, free sources first, and the household's
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
  INR with GBP beside it; a tax flag where UK rules differ (the
  reporting-fund flag); rupees and pounds checked against each holding's
  currency both ways (MA-156); no suggestions; designed first. With it,
  India's financial year, its return date and section 80C (only for a
  member filing under the old regime) join MA-320's tax-year facts as
  versioned facts with their sources (`ARCHITECTURE.md` §6.5).

**Tests:** synthetic CAS statements and broker exports import exactly once;
an unmatched ISIN is listed, not guessed; each Indian chain falls through to
stale; INR and GBP views agree with the FX of the day; local Maestro `p14` Local File Provider CAMS/KFintech CAS PDF
import behind Face ID and INR/GBP demat/folio views (MA-273).

**Exit:** an admin sends a member's CAS and broker export, taps Confirm once,
and the Indian holdings with their history appear on the dashboard
in INR and GBP, with the files they came from open from the Audit page.

**Cost:** £0 on the free path; a paid feed only on the admin's approval.

---

## Phase 15 — The app beyond the chat: widgets, Siri, the share sheet, Live Activities

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
- **Optional AWS VPC enterprise lockdown and data perimeter (MA-283, decided last):**
  once Phase 15 is done, Arun decides whether to keep the £3.50/month
  serverless IAM/tag baseline or turn on `enable_vpc_lockdown` across `dev` and
  `prod` in `us-east-1` (`MA-284`, `docs/RESEARCH.md` §9): preferred Option 3
  (`+£13.32/month` in leanest 3A, or `+£24.86/month` in 3B with CloudFront Pro
  bundled AWS WAF on `prod`, keeping total AWS spend ~£16.82–£28.36/month
  inside the £50/month AWS cap, versus Option 2B `£70.39/month`, Option 2A
  `£149.01/month` and Option 1 `£729.91/month`) adds dual-stack VPCs with VPC
  Block Public Access, zero-egress Isolated subnets for deterministic and
  quarantined functions, free S3 and DynamoDB Gateway Endpoints with three-way
  `aws:SourceVpce` Data Perimeter `Deny` policies, IPv6 EIGW, auto-healing
  Graviton `t4g.nano` `fck-nat` / Envoy TLS-SNI egress proxies, Route 53
  Resolver DNS Firewall default-deny allowlists, private `arm64` CodeBuild
  runners, S3 v5 VPC Flow Logs and GuardDuty in a five-step zero-lockout
  rollout.

**Tests:** each widget, intent and the share extension from fixtures, in
light, dark, tinted and clear, with privacy on; the extension signs in
through the shared Keychain group and refuses when signed out; local Maestro
`p15` Safari/Files Share Sheet to `MyPaisa Dev`, App Intents deep links and
WidgetKit snapshot checks (MA-273).

**Exit:** the widget on your Lock Screen shows the household's day without
opening the app, and hides it when privacy mode is on.

**Cost:** £0 (or +£13.32/month for Option 3A / +£24.86/month for preferred
Option 3B if the optional `MA-283` VPC lockdown is switched on last, staying
inside the £50/month AWS cap).

---

## Reverse-engineering workbook

What is ported from where, so the work can be checked against the original.

| Source file | Target module | Port notes |
| --- | --- | --- |
| desk `scripts/prepare_inputs.py` | `data/hygiene.py` | Rules kept for valuing holdings (MA-45); Robinhood field names replaced by our bar schema; fund NAV lag handled |
| desk `SKILL.md` guardrails and circuit breakers | the agent's system prompt, `CLAUDE.md` | Numbers from code only; a stale price is marked, never used as fresh |
| toolbelt `docs/watchlist-monitor-plan.md` | `alerts/` | Rule-based detectors on cached data; one digest per change set; state table of "what we last saw" |
| ai-hedge-fund kill switch | `/pause` | A flag every schedule checks |
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
- **Order.** The phases run in build order from Mon 2 Nov 2026.
- **Your tasks.** Tasks labelled `manual` are yours (the accounts and keys).
  They run beside the build and are due before their phase starts.

<!-- roadmap:start -->
| Phase | Build days | Working days | Starts | Target end |
| --- | --- | --- | --- | --- |
| 0 Foundations at every door | 61.25 (and 3 of yours) | 49 | Mon 2 Nov 2026 | Mon 18 Jan 2027 |
| 1 Talk: sign in and chat with the agent at every door | 114.75 (and 0.5 of yours) | 92 | Tue 19 Jan 2027 | Tue 1 Jun 2027 |
| 2 The first record: one dynamic structure, one write path | 53 | 43 | Wed 2 Jun 2027 | Fri 30 Jul 2027 |
| 3 Deposits, policies and four currencies | 18 | 15 | Mon 2 Aug 2027 | Fri 20 Aug 2027 |
| 4 Debts and check-ins | 19 | 16 | Mon 23 Aug 2027 | Tue 14 Sep 2027 |
| 5 Investments, priced | 32 | 26 | Wed 15 Sep 2027 | Wed 20 Oct 2027 |
| 6 Budget: statements and monthly check-ins | 12.5 | 10 | Thu 21 Oct 2027 | Wed 3 Nov 2027 |
| 7 Projection | 36.5 | 30 | Thu 4 Nov 2027 | Wed 15 Dec 2027 |
| 8 Audit, search and the Admin center at every door | 29 | 24 | Thu 16 Dec 2027 | Thu 27 Jan 2028 |
| 9 The whole dashboard, and the old wealth tracker retired | 28 | 23 | Fri 28 Jan 2028 | Tue 29 Feb 2028 |
| 10 Alerts, charts and the Claude client | 15 | 12 | Wed 1 Mar 2028 | Thu 16 Mar 2028 |
| 11 Ask anything about the household's wealth | 9 | 8 | Fri 17 Mar 2028 | Tue 28 Mar 2028 |
| 12 New kinds of holding (when you add one) | 2 | 2 | When a new kind is added | |
| 13 The agent team: configured, approved, self-healing, self-learning | 20 | 16 | Wed 29 Mar 2028 | Fri 21 Apr 2028 |
| 14 Indian holdings and the existing Indian portfolio | 11 | 9 | Mon 24 Apr 2028 | Fri 5 May 2028 |
| 15 The app beyond the chat: widgets, Siri, the share sheet, Live Activities | 10 | 8 | Mon 8 May 2028 | Wed 17 May 2028 |
<!-- roadmap:end -->

**Starting parts earlier.** Parts of phases 13 to 15 can start sooner if you
want them:

- E1, E9 and E10 in phase 9; E2 after phase 8;
- IN1 after phase 5, and IN2 after phase 9's importer (MA-111);
- phase 15 after phase 9.

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
# when web/ changed (MA-194): `scripts/web_gates.sh` (lockfile, api types, svelte-check, eslint, prettier, vitest, the build with its CSP, pnpm audit) runs in CI's Web job on every PR; Playwright, axe and Argos run only when Arun asks (a manual run or a `qa` label; MA-303, MA-304)
scripts/web_gates.sh
# QA on request (MA-304): Playwright 1.64 + @axe-core/playwright WCAG 2.2 AA + Argos CI visual & ARIA snapshots at 390 and 1440 in both themes
corepack pnpm@12.16.1 --dir web test:e2e
# when ios/ changed (MA-165, MA-166, MA-273): eslint and Jest for the shell; XCUITest, snapshot and accessibility checks; Maestro syntax + local 5-simulator matrix
python3 scripts/maestro_local.py check-syntax
npm run lint --prefix ios && npm test --prefix ios
xcrun swift-format lint --strict --recursive ios
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)'
python3 scripts/maestro_local.py run --up-to-phase <N>
```

Plus: golden tests for any wealth maths change (XIRR, CAGR, schedules,
accrual, the budget and the Projection), the old tracker's cases included; a card change ships with both its simple and technical
rendering at both doors, and a screen change its snapshot tests in both
themes (its Playwright screenshots when Arun asks for QA, MA-304); the web budgets hold (INP ≤ 200 ms and
LCP ≤ 2.5 s on a mid phone, 60 fps scroll), and so do the iOS benches in
`PERFORMANCE.md` (no dropped frames at 120 Hz); no secret anywhere; cost
stated when a paid API is touched; every new write path, the in-place
correction and the delete included, is refused to a member who is not an
admin and produces its event and its audit row, and every new
handler writes its `RunRecord` and continues the trace it was handed, both
covered by tests, with the leak test green (`ARCHITECTURE.md` §9.3); every
new tool, agent, prompt or kind ships with its manifest entry, a safety
case, and a capability or regression case, and every incident or review finding becomes a case
the same day; a phase whose stories touch an agent ends with 30 of its new
runs read by a person and their failure modes turned into checks or cases
(`ARCHITECTURE.md` §21).

---

## Risks

| Risk | Mitigation |
| --- | --- |
| No reliable daily NAV source for the Monzo funds | The source chain and its backups (MA-42, MA-43); the screenshot path always works; a stale price kept and marked |
| Factsheet extraction misreads a figure | Per-field confidence and source line, amber fields, Confirm before save |
| The wealth maths drifts from the old tracker's | Its tested cases as golden fixtures with a parity check (MA-105); XIRR, schedules and accrual to the penny |
| A kind spec writes something the code cannot value | Specs only combine a fixed, tested library of valuation methods and event handlers; a new kind is approved by the admin behind the second check and versioned; views rebuild from events with no migration (MA-197) |
| An in-place correction changes what it should not | Only the figures a kind marks editable, and only by an admin; one write service; a correction is a new event with its audit row, never an edit (MA-201, MA-74, MA-308) |
| A record deleted by mistake, or a member who should only view changing something | Delete only in an admin's chat, behind Confirm and the second check; the record marked `deleted`, its events, audit rows and files kept, restorable through the chat (MA-309); every write route refuses a member who is not an admin, and only the owner grants or takes back the role (MA-308) |
| The agent drifts into market advice | No tool, card or prompt produces a call; a request for one gets the household's own numbers and a plain refusal, with an eval case for it (MA-307) |
| A Projection read as a promise | Every figure from the engine, never the model; estimates marked; every assumption with its source; the fan, not one line (MA-219, MA-223) |
| The SSE stream costs more than planned while idle | Each open stream is a running Lambda, about $0.012 an open hour at 256 MB; one leader tab per browser, the stream closed 60 s after the page is hidden, reserved concurrency of about 20; the spike measures the cost per open hour, and it is put to you before any apply (MA-195) |
| CocoaPods trunk goes read-only on 2 Dec 2026 | Settled (MA-229): the iOS project starts on Swift Package Manager with React Native 0.88 (opt-in, hardened in 0.88) and never uses CocoaPods; a native library that cannot build with it is replaced (MA-165) |
| The React Native shell is not smooth enough | Every piece a member looks at is SwiftUI, fed one formatted model; `PERFORMANCE.md` benches on the phone: no dropped frames at 120 Hz scrolling the chat and the dashboard and as cards arrive, a chart scrub at 120 Hz, a launch budget (MA-165) |
| The web app's fallback swallows the iOS association file | Settled (MA-229): there is no S3 error-page fallback; a CloudFront Function sends only extension-less page paths to the shell, and the file is served as itself with `Content-Type: application/json`, with a test for it (MA-73, MA-194) |
| A new app meets an old api, or a TestFlight build expires | From phase 1 the FastAPI api states its minimum app version (`GET /v1/app/minimum-version`, MA-266) and an older app asks to update; prod's Lambdas go live and pass read-only smoke before the prod app uploads; `testflight-keepalive.yml` (or Xcode Cloud's 25 free compute hours a month) rebuilds at day 60 of a build's 90, backed by a day-60 alert and a day-75 `itms-beta://` update banner (MA-167) |
| A card the app does not know yet | Every card carries a plain line; an unknown type or newer version shows it with "Update MyPaisa to see this card" (MA-174) |
| Alert fatigue, or too many check-ins | Weekly red budget, cooldowns, repeat filter; autopay assumed and a weekly digest, about ten notifications a week (MA-211) |
| An agent changes something it should not | One settings service enforcing schema, range and band; approval with the second check for anything outside the band; every change a version and an audit row; secrets and infrastructure out of agents' reach |
| Self-tuning chases noise | The household's tuner proposes a change only from at least 6 closed months, a step at a time, applied only on an admin's Confirm (MA-276) |
| Too many requests for the admins | Automatic bands for safe changes, a daily digest, incidents only when urgent, rejected requests not repeated within their period |
| A message or a job is lost when something fails | Every hand-off through an SQS queue with retries and backoff; idempotent handlers; a dead-letter queue behind each with an alarm, a copy in S3, and replay by script, button or the ops warden |
| Cost overrun | The Claude ceiling's ladder steps down at 85% and 95% and stops at 100%; guards per member, per day and per run; the Console workspace limit as the hard backstop; AWS Budgets for AWS; `/pause` |
| Prompt injection via a web page, a PDF or a statement | Third-party text only as labelled data; files read by a quarantined extractor with no tools; a conversation that has read such text, with its notes and summaries, loses every tool that sends data out; the server tools only in a call with no household figure; no dangerous tools exist; Confirm on every write; a red-team suite on every change (`ARCHITECTURE.md` §21.2) |
| An eval suite that cries wolf, or a judge that drifts | Never run on a timer; alerts only when a rate leaves its band; judges calibrated by the admin monthly and on every change, and one below 0.8 on its true-positive or true-negative rate drops to advisory (`ARCHITECTURE.md` §21.4, §21.5) |
| A phone lost or stolen | Tokens in the Keychain on that device only; five-minute access tokens; the data routes only read, apart from corrections to the figures a kind marks editable, each an audit row and each only for an admin; status and epoch re-checked on every call and on the stream; the owner signs that device out or pauses the member (MA-102); the optional Face ID lock (MA-171); every admin action needs the second check |
| A change meant for dev reaches prod | Separate state per environment; the developer role denied on `env=prod`; prod applied only by CI after your approval; the nightly drift check |
| An import writes bad history into prod | Dry run first; fingerprints stop duplicates; Confirm with the second check; rollback by import id; tested on dev first |
| Observability that costs more than the app | Sixteen metrics with no dimensions, one dashboard, fourteen-day logs, thirty-day spans at $0.35 per GB with an ingestion alarm, `RunRecord` rows that expire after ninety days; about £2.70 a month in prod and £1.80 of dev's alarms, dev measured first (`ARCHITECTURE.md` §9.9) |
| A prompt or a figure in CloudWatch | Nothing of the conversation leaves DynamoDB: no prompt, reply, figure, name or token on any span, log line or metric; member ids hashed; the leak test in CI (MA-232); dev's capture of the synthetic household behind a setting prod refuses (§9.4) |
| OIDC trust mismatch on first deploy | Pin this repository's ids; read CloudTrail |
