<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mark-animated-dark.svg">
  <img src="docs/mark-animated.svg" width="96" height="96" alt="The MyPaisa mark: a navy coin with a pound sign, a thin orbit around it, and one coral dot keeping watch">
</picture>

# MyPaisa Agent

### A private iPhone and iPad analyst for one household's investments.

**It watches the holdings, explains every move, scores its own calls, and never trades.**

<a href="https://github.com/gilipersonal/mypaisa-agent/actions/workflows/deploy.yml?query=branch%3Amain"><img alt="CI/CD on main" src="https://img.shields.io/github/actions/workflow/status/gilipersonal/mypaisa-agent/deploy.yml?branch=main&label=CI%2FCD&logo=githubactions&logoColor=white"></a> <a href="#mypaisa-agent"><img alt="Status: design" src="https://img.shields.io/badge/status-design-c98a54"></a> <a href="#mypaisa-agent"><img alt="Budget: GBP 50 a month" src="https://img.shields.io/badge/budget-%C2%A350%20a%20month-5faf7d"></a>

<a href="ARCHITECTURE.md"><img alt="Claude API" src="https://img.shields.io/badge/Claude-API-9184d9?logo=anthropic&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="AWS Lambda: us-east-1" src="https://img.shields.io/badge/AWS%20Lambda-us--east--1-FF9900?logo=awslambda&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="DynamoDB + S3" src="https://img.shields.io/badge/DynamoDB-%2B%20S3-4053D6?logo=amazondynamodb&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="SwiftUI: iOS and iPadOS 26" src="https://img.shields.io/badge/SwiftUI-iOS%20%26%20iPadOS%2026-F05138?logo=swift&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Python: 3.14" src="https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="pandas" src="https://img.shields.io/badge/pandas-engine-150458?logo=pandas&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Terraform: infra" src="https://img.shields.io/badge/Terraform-infra-844FBA?logo=terraform&logoColor=white"></a>

**[Agent journey](https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7) · [Market agent](https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb) · [AWS architecture in Lucid](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) · [iOS app design](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8) · [Architecture](ARCHITECTURE.md) · [Build plan](PLAN.md) · [Tech stack](TECH_STACK.md) · [Research](docs/RESEARCH.md)**

</div>

---

> [!NOTE]
> **Status: design.** `ARCHITECTURE.md` (v2), `PLAN.md` (v2) and `docs/RESEARCH.md` are written; no code, infrastructure or workflow exists yet.
> On 25 Oct 2026 (MA-161) the front end moved from a Telegram bot to two doors: one native app for iPhone and iPad, with the chat,
> and the read-only web app in a browser for the dashboard and the Admin center.
> The commands below describe the repository as it will be once phase 1 of the plan lands, so that the plan and
> the README agree from the start. The CI badge reports "no status" until the workflow exists.

A private market agent for the MyPaisa household, run from one native app on iPhone and iPad by people who are not
finance people. Each member of the household talks to MyPaisa in the app's chat on their own device, manages their
own accounts and holdings, and sees their own detail plus the household overview; the owner sees everyone's. There
are no passwords: a member signs in with Apple or Google, and joins by tapping a one-time invite link that opens the
app. The same read-only dashboard, and the owner's Admin center, also open in a browser as an installable web app.
It keeps the record of what is held (fed by sending it a factsheet and a screenshot from the camera, a scan,
Photos or Files), fetches the closes,
fund prices and exchange rates every weekday, works out what moved and why, and sends a short brief. It alerts on
the few things worth a push, answers questions by calling its own code as tools, shows charts, reads the news
overnight, and takes a stance (add, hold, pause, trim) with a confidence score that it grades later. Every message
is plain on top with the technical detail one tap away. Python does the maths; Claude, through the Anthropic API, does the
words. It holds no broker login and cannot trade.

| Surface | Where | Runs on |
| --- | --- | --- |
| The app | **MyPaisa**, one SwiftUI app for iPhone and iPad on iOS and iPadOS 26, in the Warm ledger look with Liquid Glass on its controls; **MyPaisa Dev** points at dev; both installed through TestFlight | `ios/`, signed in with Apple or Google through each environment's Cognito pool |
| The chat | one private conversation per household member in the app, joined by invite link: cards drawn natively, charts in Swift Charts, text, photos, scans and files; push when the app is closed | `api`, `agent` and `sender` Lambdas, the HTTP and WebSocket APIs on `api(-dev)` and `live(-dev).mypaisapp.com`, Apple push (APNs), the Anthropic API |
| The schedule | 07:15 and 21:15 UK on weekdays, 08:00 on Saturday | EventBridge Scheduler in `Europe/London` |
| The numbers | DynamoDB (one table) and S3 (parquet) | `ingest` and `engine` Lambdas |
| The records | factsheets and screenshots read into the registry | `docs` Lambda, Claude reading PDFs and images |
| The news | RSS from central banks and the financial press | `news` and `score` Lambdas |
| The dashboard | read-only, at both doors: Home, a holding, Overlap, Scorecard, Audit and Files, Activity and the owner's Admin center; in the app, tabs on iPhone and a sidebar on iPad and an open foldable, with the chat beside every screen in a window over about 900 pt and a sheet in a narrower one | an `api` Lambda behind API Gateway that only reads the household's records (the owner's admin settings and operations in the Admin center are the one exception, each behind the second check; none changes a record), Cognito for sign-in |
| The web app | the same dashboard and Admin center in a browser at `console.mypaisapp.com`: a read-only PWA for a laptop, an iPad or a phone, signed in with Apple, Google or a passkey; no chat, so every change is still made in the app | `web/` on its own S3 + CloudFront per environment, reading the same `api` with an `HttpOnly` session cookie |
| The audit log | every change to the records: who, when, through what, before and after | `AuditEvent` rows in DynamoDB, hash-chained, written with the change; the Audit screen and "what changed this week?" |
| What the agent did | every run: its trigger, model calls, tokens, cost, tools and outcome; the schedule board; Claude spend against the ceiling | `RunRecord` rows in DynamoDB behind the Activity screen; CloudWatch, X-Ray and alarms to the owner in the app and by push |
| The destination | this app becomes MyPaisa, the household wealth tracker: assets of every kind, debts, budget, a forecast with XIRR, reports, in GBP or INR; read-only screens; every update through the chat | [gilipersonal/wealth-tracker](https://github.com/gilipersonal/wealth-tracker) is the screen reference until then; phase 9 in `PLAN.md`, later and not a priority |

The first holding is the household's Monzo ISA, a BlackRock MyMap fund. Holdings are a generic model: ETFs, shares,
bond ETFs and commodity ETCs in GBP, USD or EUR slot in as price-source plugins.

## Contents

- [Documentation](#documentation)
- [What is in the repository](#what-is-in-the-repository)
- [Models](#models)
  - [How the agent is evaluated](#how-the-agent-is-evaluated)
- [Prerequisites](#prerequisites)
- [Set up from scratch](#set-up-from-scratch)
- [Everyday commands](#everyday-commands)
- [Tests](#tests)
- [Working on AWS](#working-on-aws)
- [How work is done here](#how-work-is-done-here)

## Documentation

| Document | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How it is built (v2, the hybrid): the four rules (Claude never produces a number; the app cannot trade; the layman sees the summary, the detail is one tap away; one write path, the chat), what you see in the app, the system on AWS, the holdings registry and how a holding is added from a factsheet and a screenshot, the price source chain and look-through, the analysis engine ported from the Agentic Trading Desk (indicators, pillars, flags, macro regimes) with a holder's cascade and a computed confidence score, the research cards rebuilt from Agent Toolbelt for funds, the agent and its guardrails, the iOS app (the chat with native cards, charts and guided flows; the read-only dashboard screens with the audit log and the agent's activity; the Admin center; Sign in with Apple or Google; push), the web app (the same read-only dashboard and Admin center in a browser, a PWA), one motion system for both, observability, notifications, the road to the full MyPaisa app (assets, debts, budget, forecast with XIRR), the tech stack, security, cost, decisions and open questions. |
| [PLAN.md](PLAN.md) | How it gets built (v2): the principles, then fifteen phases, 0 to 14: prerequisites (the Apple accounts and the iOS project among them), registry, sign-in and the app's chat, the engine port, briefs and charts, chat and cards, the dashboard and the Admin center in the app and the web app, calibration, news, stances going live, MyPaisa on this backend (assets, debts, budget, forecast), new kinds of holding, the Forecaster beside the rules engine, the agent team that is configured, approved, self-healing and self-learning, Indian markets, and the app beyond the chat (widgets, Siri, the share sheet, Live Activities). Every phase is an epic in Jira and every deliverable a story under it. Each phase lists what is built, what is tested, an exit criterion you can see in the app, and its cost. A reverse-engineering workbook maps every ported source file to its target module. Then the timeline, the definition of done, and the risks. |
| [TECH_STACK.md](TECH_STACK.md) | The stack by layer (application, the iOS app, quality, AWS services, infrastructure and tooling, services outside AWS) with the reason for each choice, and the monthly cost of running `dev` and `prod` side by side: lean, standard and full, what moves the number, and the guard rails. |
| [docs/RESEARCH.md](docs/RESEARCH.md) | What was learned from the two references and the landscape around them: the Agentic Trading Desk file by file (what is ported, what is left), Agent Toolbelt's tools and card shapes, the open-source agent frameworks worth borrowing from, market data for UK OEICs and UCITS ETFs, what Claude can read (PDFs, screenshots), what a Telegram bot could show in 2026 (kept as the record; the front end moved to the iOS app in MA-161), how a confidence score is made honest, and the sources. |
| [MyPaisa Agent Journey](https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7) · [source](docs/design/agent-journey.html) | Eighteen flows end to end: joining by invite, signing in with Apple or Google, adding a holding, logging money in plain words, the 07:15 brief, a red alert, a question, the dashboard in the app and the web app, the Admin center, what happens when something fails, the spend ladder, the first-of-the-month prompt, money in any currency, the Indian import, the household in INR and GBP, and India's day. Each is a numbered path across the member, the app, AWS, Claude and data lanes, with the screens the member sees, its safeguards and the Jira stories that build it. Updated for the iOS app in MA-161. |
| [MyPaisa Market Agent](https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb) · [source](docs/design/market-agent.html) | How MyPaisa reads the market: what can and cannot be forecast, free data as it was known each day, the rules engine, news matched to holdings, the Forecaster's five models, both engines side by side, the daily learning loop, the strategy layer, how it proves itself, self-healing and the budgets. |
| [The AWS architecture in Lucid](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) · [source](docs/design/lucid/) | Seven views on AWS shapes, one Lucid document each (overview, environments and delivery, identity, queues and replay, data stores, the market agent and learning loop, the agent team with caps and alerts) and the adding-a-holding sequence. Embedded and linked in `ARCHITECTURE.md`; the import JSON and the script that writes it are kept so every view can be recreated. |
| [MyPaisa iOS v1](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8) · [source](docs/design/ios-v1/) | The app's screens as boards in Claude Design, each in light and dark: the three shell options (Arun picked 1a, Chat first, on 26 Oct 2026), iPhone sign-in, chat, dashboard, audit and activity, admin and settings, and iPad and the foldable. Drawn ahead of their stories (planned); the iOS kit and `ios.css` are in MyPaisa DS v1. The web app's spec is the browser boards in [MyPaisa app v1](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7) (`docs/design/app-v1/`), picked before MA-161, with the sign-in page redrawn; its Mini App and Telegram boards and `docs/design/dashboard/` are the superseded record. [docs/design/README.md](docs/design/README.md) says how the files relate. |
| Earlier pages | The [animated architecture](https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx) (v3) and the [first user journeys](https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam), from before the queues and the agent team; kept for reference. |
| `CLAUDE.md` | Planned, phase 1: the working rules for people and coding agents (the OIDC trust trap, Terraform-only IAM, no keys, the budget, the definition of done). |
| `infra/README.md` | Planned, phase 1: every AWS resource, its cost and what protects it; CI's keyless deploy. |

## What is in the repository

Today: the three documents above and `docs/mark.svg`. After phase 1, by `PLAN.md`:

| Path | What it is |
| --- | --- |
| `src/mypaisa_agent/` | The Python package. `registry/` (instruments, positions, valuations, documents; the kind profiles), `data/` (one `PriceSource` contract and a plugin per feed: yfinance, Twelve Data, EODHD, issuer pages, FT, proxy, screenshot; the chain per kind chosen by configuration per environment, yfinance by default; ECB FX, calendars; input hygiene), `engine/` (indicators, pillars, flags, macro, the holder's cascade, confidence; ported from the Agentic Trading Desk with its self-tests as golden files), `cards/` (stance, holding profile, overlap review, bear vs bull, scenario; each card a versioned JSON document the app draws natively, MA-174), `docs/` (factsheet and screenshot extraction through Claude), `news/` and `events/` (RSS, dedupe, scoring; the calendar), `calls/` (the hash-chained ledger, grader, scorecard, calibration), `tools/` (one file per Claude tool), `agent.py` (the tool loop, model routing, caching, the debate), `handlers/` (one entry point per Lambda: api for the chat and the dashboard's reads, from the app and the web app; live for the WebSocket connections; agent; sender, to the open app and by Apple push; worker for ingest, engine, news, score, docs and the briefs; the authorizer and the Cognito triggers that verify Apple's and Google's tokens); `audit.py` (the hash-chained audit rows) and `runs.py` (the `RunRecord` per run). |
| `playbooks/` | Prompt files loaded into the agent's context only when a task matches: `read-central-bank-statement`, `map-headline-to-holdings`, `write-stance`, `grade-stance`. Versioned with the code. |
| `ios/` | The app (MA-165): `project.yml` for XcodeGen; `MyPaisa/` (the shell, sign-in, the chat, the dashboard screens, the Admin center, You, notifications); `Packages/MyPaisaKit` (models, the api client, card decoding, the Keychain, the SwiftData cache); `Packages/MyPaisaUI` (MyPaisa DS v1 "Warm ledger" in SwiftUI: colour assets generated from `tokens.css`, Dynamic Type styles, the cards and the Liquid Glass controls); `MyPaisaTests` and `MyPaisaUITests`; from phase 14, `Widgets/` and `ShareExtension/`. Two configurations chosen by scheme: MyPaisa Dev against dev, MyPaisa against prod. Built from the boards in the MyPaisa iOS v1 project in Claude Design (`docs/design/README.md`). |
| `web/` | The read-only web app (MA-183, MA-184, MA-185): static HTML, CSS and JS in the MyPaisa DS v1 "Warm ledger" look, built from the browser boards in the MyPaisa app v1 project in Claude Design (`docs/design/README.md`), with lightweight-charts and the shared motion (CSS, the Web Animations API, View Transitions; MA-182): Home, a holding, Overlap, Scorecard, Audit and Files, Activity and the owner's Admin center, no chat; a PWA whose service worker caches the shell and never a figure; served from its own S3 + CloudFront at `console-dev.mypaisapp.com` and `console.mypaisapp.com`, which also serve the iOS app's `apple-app-site-association` file and the invite page (MA-73). |
| `tests/` | pytest: golden files for every signal, property tests for the FX split, moto for AWS, respx for HTTP, recorded Claude responses for rendering. |
| `infra/` | Every AWS resource, Terraform only: `modules/mypaisa` holds the stack once (the Lambdas and their image, the HTTP and WebSocket APIs, Cognito, the Scheduler rules, DynamoDB, S3, the console's S3 and CloudFront, the DNS records, SSM parameters, the IAM roles, the budget and the alarms); `dev/` and `prod/` call it with their own settings and state; `bootstrap/` makes the CI roles once. `ARCHITECTURE.md` §18. |
| `.github/workflows/` | The gates and a plan for both environments on every pull request, the iOS gates on a macOS runner when it touches `ios/` (MA-166), and Playwright's screenshots when it touches `web/`; from `main`, build once, deploy dev, then prod after approval, and send MyPaisa Dev to TestFlight, then MyPaisa after the same approval (MA-167); a nightly drift check; all through OIDC. |
| `docs/` | The mark, "Watcher" (MA-103): `mark.svg` and `mark-dark.svg` for light and dark grounds, `mark-animated.svg` and `mark-animated-dark.svg` for this page (the intro plays once, and Reduce Motion shows the final frame), `mark-small.svg` for 32 px and below and the favicon, `mark-icon.svg` and `mark-1024.png`, the source of the app icon (made in Icon Composer: default, dark, clear and tinted, MA-165), `mark-256.png` and `mark-64.png` for anywhere smaller. `docs/RESEARCH.md`, the research note. `docs/design/`, the design pages as source and the Claude Design mirrors, the iOS boards in `ios-v1/` among them. |
| `Dockerfile` | One container image for every Lambda, arm64, on the AWS Python 3.14 base, since pandas, numpy and pyarrow exceed the zip limit. |

## Models

Every model call goes to the Anthropic API through the official Python SDK. The API key lives in SSM Parameter
Store, is read once per cold start, and never appears in code, logs or chat. The key belongs to a workspace in the
Claude Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for every call,
and the workspace's spend limit hard-stops it. Model ids are set per environment in `infra/dev` and `infra/prod`, since
they move with Anthropic's releases; the first set is below.

| Route | Model | Effort | What the model is asked for |
| --- | --- | --- | --- |
| Alert filter | Haiku 5.5, `anthropic.claude-haiku-5-5` | low | Which of today's alert candidates say something new against what was sent this week. The thresholds and cooldowns are code. |
| Article scoring | Haiku 5.5 | low | For one article: the instruments it touches, direction, magnitude, horizon, novelty, event, confidence, and the sentence that says so, as strict JSON. The index is summed in code. |
| Morning brief, evening wrap, alert text | Sonnet 5.5, `anthropic.claude-sonnet-5-5` | low | Six lines in the household's context from the day's signals. Every figure comes from the tool results. |
| Document extraction | Sonnet 5.5 | medium | The facts on a factsheet PDF or a valuation screenshot, as strict JSON with the source line and a confidence per field; shown on a Confirm card before anything is saved. |
| Chat and cards | Sonnet 5.5 | medium | An answer to a question, built by calling the tools (`get_portfolio`, `get_signals`, `run_scenario`, `search_news`, `propose_change`, and the rest in `ARCHITECTURE.md`); the research cards. |
| Stances | Sonnet 5.5 | medium | The reasons and the invalidation rule for a stance the cascade has set. The stance, horizon, confidence and entry price are code. Above 70% confidence, a two-call bull-versus-bear debate with a judge. |
| Saturday review | Opus 5.5, `anthropic.claude-opus-5-5` | high | The week in context, with the scorecard, the decisions logged and the events ahead. |

**Guardrails on every call:** tools with `strict` schemas and `tool_choice: auto`; adaptive thinking with the effort
above; the system prompt, tool list and rubric cached; the monthly Claude ceiling ($160 in prod and $40 in dev, the Max 20x plan's $200 credit, moved by the admin) with its ladder and guards; a refusal or an error falls back to
the plain-template brief, so a message is never missed because of a model. Before anything is sent, every number in
the text is checked against that turn's tool results; a number with no source fails the message, which is
regenerated once and then sent as the plain facts. Search results and fetched pages reach the model marked as
untrusted text and are never followed as instructions; there is no tool that can spend money beyond a search query,
delete data, or message anyone but the household's members in the app.

Web search and web fetch are Anthropic's server-side tools, with citations, at $10 per 1,000 searches; no separate
search provider is needed. The nightly sentiment scoring goes through the Message Batches API at half price, since
latency does not matter overnight.

### How the agent is evaluated

MyPaisa grades itself, and the tests hold the code to it. Planned in phases 5 and 7 of `PLAN.md`:

1. **Forecasts are logged and graded.** Every 1-month range the signals produce is stored with the price at the
   time. When the month ends the outcome is recorded: did the 80% range cover it, and was `P(fall > 5%)` calibrated.
   The Saturday review reports coverage and calibration, or by how much they miss.
2. **Stances are paper-traded.** A stance is stored with its entry price and graded at its horizon: right or wrong,
   the return against doing nothing, and calibration by confidence bucket. Stances stay in shadow (logged, reported on
   Saturday, never pushed) until they beat the baseline for 8 consecutive weeks. The gate is checked in code and
   reported every week either way.
3. **Decisions are logged.** "I acted" on a message writes a decision record. The review compares what was done with
   what the signals said, which is the only honest way to learn whether MyPaisa helps.
4. **The words are tested on recordings.** Unit tests replay recorded Claude responses, so rendering is
   deterministic and never reaches a model. The number validator has its own tests, with an invented figure it must
   catch.
5. **Sentiment is spot-checked.** Phase 6 ends with 30 scored articles read by a person against their scores before
   the index is allowed to tilt a call.

Live-model runs are on request only and print their estimate first.

## Prerequisites

macOS, since Xcode runs only there; the Python side and Terraform also run on Linux. Nothing is installed globally
except these tools.

| Tool | Version | Needed for | Install |
| --- | --- | --- | --- |
| Git | recent | everything | |
| uv | 0.12 or later | the package, its tests and tools (uv fetches Python 3.14 itself) | `brew install uv` |
| Docker | recent, running | building the Lambda image locally | Docker Desktop, OrbStack or Colima |
| AWS CLI | v2 | every cloud operation, with the `agent-toolkit` profile | `brew install awscli` |
| Terraform | 1.11 or later | `infra/` only | `brew install hashicorp/tap/terraform` (Terraform is no longer in Homebrew's core) |
| GitHub CLI (`gh`) | recent | pull requests, reading the repository id for the OIDC trust | `brew install gh` |
| jq | any | the scripts | `brew install jq` |
| tflint | recent | the Terraform lint in [Tests](#tests) | `brew install tflint` |
| Xcode | 26 or later | `ios/`: the iOS and iPadOS 26 SDK, the simulators, and swift-format, which comes in its toolchain (`xcrun swift-format`) | the Mac App Store |
| XcodeGen | recent | writing `ios/MyPaisa.xcodeproj` from `ios/project.yml` | `brew install xcodegen` |
| Playwright's Chromium | with uv | the web app's screenshots at phone and laptop widths, in both themes | `uv run playwright install chromium` |

You also need, in the AWS account `545595341442`, a profile that can assume the operator role (`agent-toolkit`).
The SSM parameters listed under [Secrets](#secrets) are not a prerequisite: step 4's apply makes dev's (prod's are made
by its first release), and steps 5 and 6 put dev's values in. The Anthropic API key comes from
a workspace in the [Claude Console](https://platform.claude.com) organisation linked to your Max or Team plan, with
a spend limit set on the workspace. The app needs a membership of the Apple Developer Program ($99 a year, about
£76), its one new cost, joined only after Arun's yes is recorded on MA-162; Sign in with Apple, push, TestFlight and
the two app ids all depend on it. Each environment has its own Google iOS and web clients and its own Sign in with Apple
Services ID (`PLAN.md`, phase 0; MA-143), and the Twelve Data key comes from a free account at twelvedata.com. An iPhone or iPad on iOS 26 is needed only for a
build on a device.

## Set up from scratch

This is phase 0 of `PLAN.md`. Steps 1 and 2 need nothing but the tools; step 3 needs the Apple and Google accounts
and puts nothing into AWS; the rest need the AWS profile.

### 1. Clone

```bash
git clone https://github.com/gilipersonal/mypaisa-agent.git && cd mypaisa-agent
```

### 2. The package and its checks

```bash
uv sync                                       # Python 3.14 and every dependency, from the lockfile
uv run ruff check . && uv run pyright && uv run pytest
python3 scripts/contrast_check.py             # every colour pair legible in light and dark, even at 25% brightness (MA-181)
```

The tests run on fixtures and recordings and never reach AWS or a model.

### 3. The Apple and Google accounts

Nothing here goes into AWS. Each id waits for step 4's apply to make its parameter, and goes in at step 5.

- **The Apple Developer Program** (MA-162): $99 a year, joined after Arun's yes on MA-162.
- **Two app ids**, explicit, in Certificates, Identifiers & Profiles: `com.mypaisapp.agent` (MyPaisa) and
  `com.mypaisapp.agent.dev` (MyPaisa Dev). Each has Sign in with Apple, enabled as a primary app id; Push
  Notifications; and Associated Domains (`applinks:console.mypaisapp.com`, or `applinks:console-dev.mypaisapp.com`
  for MyPaisa Dev, with `webcredentials:` for passkeys as MA-109 decides). The bundle id is the audience the verify
  trigger checks on Apple's identity token (`ARCHITECTURE.md` §4.5). Note it and the team id for step 5.
- **A Services ID per environment** (MA-143, MA-162), for Sign in with Apple in the web app: in Identifiers, grouped
  with that environment's app id as its primary app id, with `console.mypaisapp.com` (or `console-dev.mypaisapp.com`)
  as its domain and return URL. It is the audience the verify trigger checks on a token from a browser. Note it for
  step 5.
- **App Store Connect and TestFlight** (MA-164): an app record for MyPaisa Dev and one for MyPaisa, and the
  household's members added as App Store Connect users and as internal testers of both, so TestFlight reaches them
  with no App Review. An App Store Connect API key (App Manager) goes into the GitHub `prod` environment as a secret,
  and nowhere else; the release workflow uses it to upload builds (MA-167).
- **Two Google clients per environment** (MA-143): in the Google Cloud console, an OAuth client of type iOS for
  that environment's bundle id, and one of type Web application with `https://console.mypaisapp.com` (or
  `https://console-dev.mypaisapp.com`, and `http://localhost:8000` for local work on dev) as its JavaScript origin.
  Neither has a redirect to set or a secret in use: the iOS SDK uses PKCE, and Google Identity Services hands the
  page an ID token that the verify trigger checks by its audience. Note both ids for step 5.

The Apple keys wait for step 5, so no key file sits on the disk while the apply runs.

### 4. Terraform

The state lives beside the wealth tracker's, one key per environment. The CI roles' trust policies are pinned to
this repository's own numeric id. They are made once from the laptop, since CI cannot assume a role that does not
exist yet; after that, dev is applied from the laptop or by CI, and prod only by CI:

```bash
export AWS_PROFILE=agent-toolkit
REPO_ID=$(gh api repos/gilipersonal/mypaisa-agent --jq .id)
terraform -chdir=infra/bootstrap init && terraform -chdir=infra/bootstrap plan -var="github_repo_id=$REPO_ID" -out=boot.tfplan
terraform -chdir=infra/bootstrap apply boot.tfplan
terraform -chdir=infra/dev init && terraform -chdir=infra/dev plan -out=dev.tfplan
terraform -chdir=infra/dev apply dev.tfplan
```

Read the whole plan before applying it. The first apply creates the budget before anything that can spend, and
every secret's SSM parameter with a write-only placeholder (`value_wo`), so no value ever reaches Terraform's state.
The values go in next, over those placeholders (steps 5 and 6); a value put before its parameter exists makes the
apply fail. Prod is applied by the release workflow after your approval in the GitHub `prod` environment
(`ARCHITECTURE.md` §18.4).

### 5. The sign-in ids and the Apple keys

Now that the apply has made their parameters, make dev's two Apple keys (MA-164), in Certificates, Identifiers &
Profiles, Keys: one with the Apple Push Notifications service, and one with Sign in with Apple, which signs the
request that revokes a leaving member's Apple token (MA-172). Apple lets you download each `.p8` file once, named
`AuthKey_<key id>.p8`. Put each straight into SSM, over the placeholder the apply made, and delete the file; a key
is never pasted into a chat or a shell history. The key ids, the team id, the bundle id, the Services ID and the
two Google client ids are not secrets, so they are plain Strings (MA-20, MA-143); the parameter names are MA-26's:

```bash
export AWS_PROFILE=agent-toolkit
P8=~/Downloads/AuthKey_ABC123DEFG.p8          # the push key Apple gave you; its name carries the key's id
aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/apns_key --type SecureString --value "file://$P8" && rm "$P8" && unset P8
read -r ID && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/apns_key_id --type String --value "$ID" && unset ID
P8=~/Downloads/AuthKey_HIJ456KLMN.p8          # the Sign in with Apple key, for revoking a leaver's token (MA-172)
aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/siwa_key --type SecureString --value "file://$P8" && rm "$P8" && unset P8
read -r ID && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/siwa_key_id --type String --value "$ID" && unset ID
read -r ID && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/team_id --type String --value "$ID" && unset ID
aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/bundle_id --type String --value com.mypaisapp.agent.dev
read -r ID && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/apple/services_id --type String --value "$ID" && unset ID
read -r ID && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/google/client_id --type String --value "$ID" && unset ID
read -r ID && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/google/web_client_id --type String --value "$ID" && unset ID
```

Do the same for prod under `/mypaisa-agent/prod/...`, with prod's own keys, Services ID and Google clients and the
bundle id `com.mypaisapp.agent`, once prod's first release has made those parameters (MA-142). The developer role
is denied anything tagged `env=prod`, so the identity that puts prod's values is still to be named (open on MA-21,
MA-26, MA-142 and MA-143). Each environment has its own app, keys, Services ID and Google clients, so nothing done
in dev reaches the household.

### 6. The Anthropic API key

On claude.ai, go to Settings → Billing → API credits and link a Claude Console organisation to your Max or Team
plan (you need 7 days on the plan; the link cannot be moved later without support, so pick the organisation you
will build in). No payment method is needed: the Max 20x plan's monthly API credit ($200) pays for the calls; leave auto-reload off. In
that organisation create two workspaces, `mypaisa-prod` with a $160 spend limit and `mypaisa-dev` with $40 (the hard caps behind the app's ceilings), and a
key in each, `mypaisa-agent-dev` and `mypaisa-agent-prod`. Put each straight into its own environment's path, as
with the push key:

```bash
read -rs KEY && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/anthropic/api_key --type SecureString --value "$KEY" && unset KEY
```

The prod key goes into `/mypaisa-agent/prod/anthropic/api_key` the same way, once prod's first release has made the
parameter, by the identity still to be named (open on MA-21, MA-26, MA-142 and MA-143).

No model access request is needed; the key works immediately.

Dev's Twelve Data key (MA-22) goes in the same way:

```bash
read -rs KEY && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/twelvedata/api_key --type SecureString --value "$KEY" && unset KEY
```

Prod's goes in the same way after prod's first release has made its parameter.

### 7. The app

```bash
xcodegen generate --spec ios/project.yml      # writes ios/MyPaisa.xcodeproj
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPhone 17 Pro"
open ios/MyPaisa.xcodeproj                    # run MyPaisa Dev on a simulator or on your own iPhone or iPad
```

MyPaisa Dev talks to `api-dev.mypaisapp.com` and `live-dev.mypaisapp.com` (MA-144); the scheme picks the
environment, never a switch inside the app. A build on your own device needs the Developer Program and the app ids
of step 3. The first person to sign in owns dev's household and invites the others with one-time links (MA-32).

The household gets the app through TestFlight: a merge to `main` that touches `ios/` sends MyPaisa Dev there, and
MyPaisa after your approval in the GitHub `prod` environment (MA-167). A TestFlight build lasts 90 days, so an alert
at day 60 says when a new prod build is due.

### 8. The web app

```bash
python3 -m http.server 8000 --directory web   # in one terminal: the web app on localhost, against api-dev
uv run playwright install chromium            # once
uv run pytest tests/web                       # Playwright: every page at phone (390) and laptop (1440) widths, light and dark
```

Dev's api admits `http://localhost:8000`, and so does dev's Google web client, so signing in with Apple, Google or
a passkey works locally against dev (MA-185). Deployed, the web app is `console-dev.mypaisapp.com` and
`console.mypaisapp.com`, a PWA that a laptop, an iPad or a phone can install. It reads and never writes: every
change is made in the app's chat.

### 9. The first brief

```bash
scripts/run.sh dev ingest && scripts/run.sh dev signals && scripts/run.sh dev brief
```

The brief arrives in the app's chat, and by push when the app is closed. From then on the Scheduler runs it.

## Everyday commands

| Task | Command |
| --- | --- |
| Add or change a holding | In the app's chat: send a factsheet or a screenshot (camera, scan, Photos or Files), or type it, then tap Confirm. In dev, `scripts/seed.sh dev --reset` wipes and reseeds the synthetic household; it refuses to run against prod |
| Run one job now | `scripts/run.sh dev ingest` (also `engine`, `brief`, `wrap`, `news`, `score`, `review`, `grade`) |
| Build the image as CI does | `docker build --platform linux/arm64 -t mypaisa-agent .` |
| Tail a function's logs | `aws logs tail /aws/lambda/mypaisa-dev-agent --follow` |
| Build and test the app as CI does | `xcodegen generate --spec ios/project.yml && xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPhone 17 Pro"` |
| Screenshot the booted simulator | `xcrun simctl io booted screenshot shot.png` |
| Serve the web app locally against dev | `python3 -m http.server 8000 --directory web` |
| See every colour pair at full and 25% brightness | `python3 scripts/contrast_check.py --report` |
| Replay failed messages or jobs from a dead-letter queue | `scripts/redrive.sh dev updates` (also `outbox`, `work`, `scheduler`) |
| See this month's spend | `scripts/cost.sh` (AWS Cost Explorer plus the Anthropic usage report by model, against the Claude ceiling and the AWS budget) |
| Grade every forecast and call whose horizon has passed | `scripts/run.sh dev grade` |

## Tests

The gates run in CI on every pull request; run them before pushing:

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest --cov --cov-fail-under=90
terraform fmt -check -recursive infra
for env in dev prod; do terraform -chdir=infra/$env validate; done
tflint --recursive
python3 scripts/plan_sync.py selftest && python3 scripts/plan_sync.py check
python3 scripts/contrast_check.py --selftest && python3 scripts/contrast_check.py
```

`plan_sync.py` keeps the plan, the trace, Jira's keys and the Claude Design mirror in step (MA-155), and refuses a
board date with a wrong weekday. `contrast_check.py` measures every colour pair in `docs/design/ds-v1/tokens.css`
and the glass fills, in light and dark, at full brightness and with the screen at 25%, so text and controls stay
clear on a dimmed phone (MA-181); it fails closed, and fails when a board project's copy differs from DS v1's. Each
`selftest` breaks copies on purpose and expects the refusal.

A pull request that touches `web/` also takes Playwright screenshots of every page at phone and laptop widths, in
light and dark, and checks the sign-in cookie's refusals (MA-183, MA-185):

```bash
uv run pytest tests/web
```

A pull request that touches `ios/` also runs the app's gates on a macOS runner (MA-166):

```bash
xcrun swift-format lint --strict --recursive ios
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPhone 17 Pro"
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPad Air 11-inch (M3)"
```

They cover the unit and UI tests, snapshot tests of every screen in light and dark at Large and AX5 text, and
`performAccessibilityAudit()` in every screen's UI test.

Live checks run on request only and say what they cost first: a brief against the live API
(`scripts/run.sh dev brief --live`) and the sentiment spot-check set (`scripts/eval.sh sentiment`).

## Working on AWS

Everything in the cloud is two sets of resources, dev and prod, in the wealth tracker's AWS account, made by
Terraform in `infra/` and read with the AWS MCP and the CLI. The rules (`.claude/rules/aws-changes.md`): every
resource is Terraform, never made by hand; the AWS MCP reads and never changes; IAM is never edited in the console;
plans are read in full before they are applied; prod is applied only by CI; no AWS key exists anywhere; every secret
lives in SSM Parameter Store only, put by hand (the App Store Connect API key, a secret of the GitHub `prod`
environment, is the one outside AWS); anything that adds cost is asked about first, with its price.

### The account

| | |
| --- | --- |
| Account | `545595341442`, profile `agent-toolkit` |
| Region | `us-east-1` |
| Terraform state | `s3://wealth-tracker-tfstate`, keys `mypaisa-agent/dev/infra.tfstate` and `mypaisa-agent/prod/infra.tfstate` |
| Names | `mypaisa-<env>-<part>`, every resource tagged `env` |
| SQS | `mypaisa-<env>-updates.fifo`, `-outbox.fifo` and `-work`, each with a dead-letter queue and an alarm; replay with `scripts/redrive.sh` (`ARCHITECTURE.md` §21) |
| Lambda | `api` (the chat API and the dashboard's reads, for the app and the web app), `live` (the WebSocket connections), `agent`, `sender` (to the open app and by Apple push), `worker` (ingest, news, score, docs, engine and briefs by job type), the authorizer and the Cognito auth triggers, one arm64 container image in ECR, a `live` alias per function |
| API Gateway | per environment, an HTTP API on `api-dev.mypaisapp.com` and `api.mypaisapp.com` (`/auth/nonce`, `/auth/apple`, `/auth/google`, `/auth/passkey/options`, `/auth/passkey`, `/v1/chat/...`, the read-only `/v1/...`, `/v1/admin/...` for the owner) and a WebSocket API on `live-dev.mypaisapp.com` and `live.mypaisapp.com` for the open app; the authorizer checks every call and connection (MA-75) |
| Cognito | a user pool per environment, reached only through the api's `/auth/*` routes (no hosted domain): Sign in with Apple and Google, from the app and from a browser, and passkeys with the console's domain as their relying party, all verified in custom-auth triggers (MA-109) |
| CloudFront + S3 | the console on `console-dev.mypaisapp.com` and `console.mypaisapp.com`: the web app (a PWA), the iOS app's `apple-app-site-association` file and the invite page; the static shell holds no data (MA-73, MA-183) |
| DNS | the `mypaisapp.com` zone and wildcard certificate belong to the wealth tracker's Terraform; MyPaisa adds six records (`api`, `live` and `console` for each environment) |
| EventBridge Scheduler | `07:00`, `07:15`, `21:00`, `21:15` weekdays; `23:30` daily; `08:00` Saturday; every 3 h for news; all `Europe/London` |
| DynamoDB | on-demand tables per environment, with TTL; prod's with deletion protection and point-in-time recovery |
| S3 | per environment: prices and FX as parquet, articles (90-day rule), imports; prod's versioned |
| SSM Parameter Store | `/mypaisa-agent/dev/...` and `/mypaisa-agent/prod/...`, SecureString, standard tier |
| Claude | the Anthropic API from the `agent`, `docs` and `score` Lambdas; Opus 5.5, Sonnet 5.5, Haiku 5.5; key in SSM |
| IAM | one execution role per function and environment, scoped to its own table, bucket and parameters; three OIDC roles for CI; a developer role with an explicit deny on `env=prod` |
| Monitoring | CloudWatch Logs (14 days), an error alarm per function, the 07:45 dead man's switch, all delivered to the owner in the app and by push (MA-61) |
| Budget | Claude for the agents: the Max 20x plan's $200 credit, $160 prod and $40 dev. AWS and others: £50 across both environments, metered daily from Cost Explorer, with AWS Budgets at £75 as the Terraform backstop. Every cap, step, action and alert route is set in the Admin center (`ARCHITECTURE.md` §15.2) |
| Alerts | The Admin center's Alerts page, in the app and the web app; push; and email through the SNS topic `mypaisa-<env>-admin-alerts` (address in SSM, confirmed once) |

### Access

- **Operators** use the `agent-toolkit` profile through the developer role, which works in dev and is denied
  anything tagged `env=prod`. Reading prod goes through the AWS MCP, read-only: describe, list, logs,
  metrics, costs and Terraform state, never a record or a secret.
- **CI** assumes one of three OIDC roles: `ci-plan` (read only, any pull request), `ci-dev-deploy` (`main` only) and
  `ci-prod-deploy` (`main` and the `prod` GitHub environment only). The trust policies' subjects embed this
  repository's numeric ids, e.g. `repo:gilipersonal@325700199/mypaisa-agent@<repo_id>:environment:prod`, so the
  wealth tracker's policies cannot be copied. On `AccessDenied` from `AssumeRoleWithWebIdentity`, read CloudTrail
  first: it records the exact subject presented.
- The `prod` environment needs your approval and allows deploys from `main` only; the subject carries no branch.
- Never create an IAM user or an access key for this project.

### Secrets

Terraform creates each parameter with a write-only placeholder and never holds a value. The values are put over it
with the AWS CLI, after the apply that made the parameter, as in
[Set up](#5-the-sign-in-ids-and-the-apple-keys), read by each function once per cold start, and never logged.

Each environment has its own set, under `/mypaisa-agent/dev/...` and `/mypaisa-agent/prod/...`:

| Parameter | What it is |
| --- | --- |
| `.../apple/apns_key` | that environment's APNs authentication key (`.p8`), for the `sender`'s token-based push (MA-164) |
| `.../apple/apns_key_id` | its key id (a plain String, not a secret) |
| `.../apple/siwa_key` | that environment's Sign in with Apple key (`.p8`), which signs the request that revokes a leaving member's Apple token (MA-164, MA-172) |
| `.../apple/siwa_key_id` | its key id (a plain String) |
| `.../apple/team_id` | the Apple Developer team id (a plain String) |
| `.../apple/bundle_id` | that environment's app, the audience on Apple's identity tokens from the app (a plain String) |
| `.../apple/services_id` | that environment's Services ID, the audience on Apple's identity tokens from the web app (a plain String) |
| `.../twelvedata/api_key` | Twelve Data free tier: US closes, the macro basket, the earnings calendar |
| `.../anthropic/api_key` | the Anthropic API key from that environment's workspace, which has its own spend limit |
| `.../google/client_id` | that environment's Google iOS client id, the audience on Google's ID tokens from the app (a plain String; an iOS client has no secret) |
| `.../google/web_client_id` | that environment's Google web client id, the audience on Google's ID tokens from the web app (a plain String; no secret is used) |
| `.../eodhd/api_key` | EODHD, if chosen over the free sources |

A secret-scanning step runs on every pull request.

### Releasing

A merge to `main` builds the image once and pushes it to ECR by digest, applies dev, deploys and runs the smoke
tests against `api-dev`; then it waits for your approval in the GitHub `prod` environment, applies prod and moves
each function's `live` alias to the new version. A failed smoke test moves the alias back on its own. To roll back
by hand, re-run the release workflow for the previous commit; prod is never applied from a laptop.

When the merge touches `ios/`, the same run archives the app once per configuration: MyPaisa Dev goes to TestFlight
after dev's smoke tests pass, and MyPaisa after your approval, once prod's Lambdas are live, so a new app never meets
an old api. An app older than the api's minimum version asks to update from TestFlight (MA-167).

### Logs and alarms

Each function logs one JSON object a line with a correlation id per update or schedule run.

```bash
aws logs tail /aws/lambda/mypaisa-dev-agent --since 1h
aws logs filter-log-events --log-group-name /aws/lambda/mypaisa-dev-ingest --filter-pattern '{ $.level = "ERROR" }'
```

A failed brief, an error burst or a missed schedule reaches the owner in the app and by push as a short message with the reason.

### Costs

Under £1 a month on AWS for both environments at this traffic: Lambda, DynamoDB, Scheduler, API Gateway, Cognito
and SSM sit inside the free tiers; the WebSocket API is $1 per million messages and $0.25 per million connection
minutes, and Apple push is free; S3, CloudFront, logs and ECR are pence. Claude is £7 to £21 a month depending on the routing and how much
you chat, sentiment scoring £1.50 to £2.50 through Batches, web search under £1, and EODHD £20 only if a free source fails and you approve it. Totals:
about £9.70 lean, £36 standard, £46 full. The agents' Claude allowance is the Max 20x plan's $200 credit ($160 prod, $40 dev) and AWS and
others have £50; you set every cap and threshold in the Admin center, and alerts reach the app, the web app, push and email. Outside the monthly figures: the Apple Developer Program at $99 a year
(about £76, MA-162), and the macOS minutes CI uses for the app, which count ten to one against GitHub's free minutes
(measured in the first month, MA-166). `TECH_STACK.md` has the table for dev and prod.

## How work is done here

The rules will live in `CLAUDE.md` from phase 1. In short:

- Every change is a branch from `main` (`feat/<slug>`, `fix/<slug>`) and a pull request; never commit on `main`.
  Pull requests merge with a merge commit and the branch is deleted.
- The phases of `PLAN.md` are built in order; a phase starts when the one before meets its exit criterion.
- Numbers come from code with tests; Claude writes words. A change that lets a model produce a figure is wrong.
- Anything that predicts runs in shadow first and earns its place with a scored record.
- Nothing in the cloud is made by hand; plans are read before they are applied; no key, no secret in a file.
- Every change that calls a paid API states its monthly cost in the pull request.
