<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mark-animated-dark.svg">
  <img src="docs/mark-animated.svg" width="96" height="96" alt="The MyPaisa mark: a navy coin with a pound sign, a thin orbit around it, and one coral dot keeping watch">
</picture>

# MyPaisa Agent

### A private agent for one household's whole wealth, in the UK and India, at every door.

**You tell it what you own and owe; it keeps the record, asks when something is due, explains every move, and never trades.**

<a href="https://github.com/gilipersonal/mypaisa-agent/actions/workflows/ci.yml?query=branch%3Amain"><img alt="CI on main" src="https://img.shields.io/github/actions/workflow/status/gilipersonal/mypaisa-agent/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white"></a> <a href="#mypaisa-agent"><img alt="Status: design" src="https://img.shields.io/badge/status-design-c98a54"></a> <a href="#mypaisa-agent"><img alt="Budget: GBP 50 a month" src="https://img.shields.io/badge/budget-%C2%A350%20a%20month-5faf7d"></a>

<a href="ARCHITECTURE.md"><img alt="Claude API" src="https://img.shields.io/badge/Claude-API-9184d9?logo=anthropic&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="AWS Lambda: us-east-1" src="https://img.shields.io/badge/AWS%20Lambda-us--east--1-FF9900?logo=awslambda&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="DynamoDB + S3" src="https://img.shields.io/badge/DynamoDB-%2B%20S3-4053D6?logo=amazondynamodb&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="React Native and SwiftUI: iOS and iPadOS 26" src="https://img.shields.io/badge/React%20Native%20%2B%20SwiftUI-iOS%20%26%20iPadOS%2026-F05138?logo=swift&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="SvelteKit 3: the web app" src="https://img.shields.io/badge/SvelteKit%203-web%20app-FF3E00?logo=svelte&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Python: 3.14" src="https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="pandas" src="https://img.shields.io/badge/pandas-engine-150458?logo=pandas&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Terraform: infra" src="https://img.shields.io/badge/Terraform-infra-844FBA?logo=terraform&logoColor=white"></a>

**[Inside MyPaisa](https://claude.ai/artifact/NQecwzUjudjq1Kigri13g5) · [Architecture v4](https://claude.ai/artifact/Ns3DLFTCvnLcBxJvRvygBo) · [Agent journey](https://claude.ai/artifact/HPcNrDt2TvR2hdMBzjFE9u) · [AWS architecture in Lucid](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) · [Design boards](docs/design/) · [Architecture](ARCHITECTURE.md) · [Build plan](PLAN.md) · [Tech stack](TECH_STACK.md) · [Research](docs/RESEARCH.md)**

</div>

---

> [!NOTE]
> **Status: design.** `ARCHITECTURE.md`, `PLAN.md` and `docs/RESEARCH.md` are written; no code, infrastructure or workflow exists yet.
> On 25 Oct 2026 (MA-161) the front end moved from a Telegram bot to two doors, the iOS app and the web app.
> On 26 Oct 2026 (MA-186) the plan was re-ordered: the household's whole wealth comes first, built layer by layer with
> the agent in phases 0 to 9, each phase shipped at both doors, then phases 10 to 15. The web
> app is a full door with the chat, at `dashboard.mypaisapp.com`, and the iOS app is a React Native shell with a
> native SwiftUI core.
> On 2 Nov 2026 (MA-307) the market side was retired: MyPaisa is a wealth tracker only.
> The commands below describe the repository as it will be once phases 0 and 1 of the plan land, so that the plan and
> the README agree from the start. The CI badge reports "no status" until the workflow exists.

A private agent for the MyPaisa household's whole wealth, in the UK and India, used by people who are not finance
people. Each member talks to MyPaisa in the chat on their own device, at every door: the iOS app on iPhone and iPad,
and the web app in a browser on a laptop or a phone. A conversation started on the laptop finishes on the phone.
Everything is registered by talking, with no forms: savings and cash, fixed deposits and policies, property,
pensions, shares, funds and bonds, loans, mortgages and cards, and each member's income and spending. The agent asks
only what is missing, shows a Confirm card with the figures code computed, and writes an audit row. It asks on its
own when something is due ("HDFC home loan: was November's EMI paid?") and one tap records it; a bank or card
statement sent in the chat fills the budget. Everything is prompt driven, and only admins write: an admin adds and
deletes only in the chat and corrects an existing figure in the chat or in place on a screen; every other member
views only (MA-308, MA-309). Each member sees the household in GBP, INR, USD or EUR. There are no passwords: a member
signs in with Apple or Google, and joins by tapping a one-time invite link. Prices are fetched every weekday only to
value what the household holds; the real return of each holding, account and member is XIRR and CAGR from the dated
ledger. A team of agents keeps the records, the budget, the Budget forecast and the Projection current from those
actual numbers. It alerts on the few things worth a push (a budget running over, a check-in left open, a job that
failed), sends each admin one quiet card on Monday mornings (what changed last week and why, what is due in the next
fortnight, and anything else worth knowing, said as facts) with at most one timely nudge a week, tracks the
household's goals and what each needs, compares plans side by side, answers any question about the household's
wealth by calling its own code as tools, and shows charts. For a big decision an admin can start a slower "plan with
me" session on Opus. It never predicts a market and never says buy, hold or sell. Every message is plain on top with the technical detail
one tap away. Python does the maths; Claude, through the Anthropic API, does the words. It holds no broker login and
cannot trade.

| Surface | Where | Runs on |
| --- | --- | --- |
| The app | **MyPaisa**, one app for iPhone and iPad on iOS and iPadOS 26: a React Native shell with a native SwiftUI core (every piece a member looks at is SwiftUI), in the Warm ledger look with Liquid Glass on its controls; **MyPaisa Dev** points at dev; both installed through TestFlight | `ios/`, signed in with Apple or Google through each environment's Cognito pool |
| The web app | the same household in a browser at `dashboard.mypaisapp.com` (`dashboard-dev` for dev): a SvelteKit 3 PWA for a laptop, an iPad or a phone, with the chat, the dashboard and the Admin center, signed in with Apple, Google or a passkey | `web/` on its own S3 + CloudFront per environment, the same `api` with an `HttpOnly` session cookie; Web Push when installed |
| The chat | one private conversation per household member, at both doors, joined by invite link: cards drawn by SwiftUI in the app and by Svelte components in the browser from one card JSON, charts in Swift Charts and in shadcn-svelte's charts on LayerChart, text, photos, scans, statements and files; replies stream in as they are written; push when a door is closed | `api`, `agent`, `sender` and `stream` Lambdas, the REST API and its SSE stream on `api(-dev).mypaisapp.com`, Apple push (APNs) and Web Push, the Anthropic API |
| The records | every asset and debt is a record of a kind defined as data, its history a chain of events, its figures views folded from them; a new kind is a spec an admin approves behind the second check, not a new screen; a delete marks the record `deleted`, hidden and restorable, its history kept (MA-309) | one write service for the chat's Confirm and an in-place correction, admins only, checked against the kind and audited; the `docs` job, Claude reading statements, PDFs and images |
| The check-ins | when an EMI, a card bill, a SIP, a premium, a salary, a maturity or a valuation is due, the agent asks in the chat and one tap records it; a statement that shows the payment answers it | the daily `worker` job, decided in code with no model; push with no amounts on the lock screen |
| The schedule | 07:00 and 21:00 UK on weekdays for prices, the daily check-in job | EventBridge Scheduler in `Europe/London` |
| Goals and insights | goals with the monthly saving each needs, the date it is reached and its chance; what changed and why, split into saving, markets, currency and the rest; up to four scenarios side by side; from phase 10, a silent Monday digest card for each admin and at most one timely nudge a week, facts only, never "you should" (`ARCHITECTURE.md` §6.1 to §6.3, §10.1) | `wealth/goals.py`, `wealth/attribution.py` and the scenario workspace in code; the `worker`'s nightly `insights` job finds, Haiku writes each finding's line and Sonnet the digest |
| The numbers | DynamoDB (one table) and S3 (parquet) | the `worker`'s price ingest, the nightly views and the Projection runs |
| The dashboard | the household's whole wealth at both doors, growing phase by phase: net worth in GBP, INR, USD or EUR, assets and one asset, debts and one loan, what is due, Budget, Projection, then Audit and Files, Activity, Search and the Admin center; an admin adds and deletes in the chat and corrects an existing figure in the chat or in place (tap it, type, Save), and every other member views; in the app, tabs on iPhone and a sidebar on iPad and an open foldable, with the chat beside every screen from about 1393 pt, a sheet away from about 600 to 1393 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over) | an `api` Lambda behind API Gateway: the reads, and `PATCH /v1/records/{id}` for the figures a kind marks editable, through the one write service with an audit row; the admins' settings and operations in the Admin center, each behind the second check; Cognito for sign-in |
| The audit log | every change to the records: who, when, through what, before and after; a correction is a new event, never an edit | `AuditEvent` rows in DynamoDB, hash-chained, written with the change; the Audit screen and "what changed this week?" |
| What the agent did | every run, from phase 1: its trigger, model calls, tokens, cost, tools and outcome; the schedule board; Claude spend against the ceiling | `RunRecord` rows in DynamoDB behind the Activity screen at every door; one OpenTelemetry trace per message from the door to the model and back in X-Ray and CloudWatch, the model and tool spans in the open GenAI conventions, and alarms to the owner in the app and by push (`ARCHITECTURE.md` §9) |
| The old wealth tracker | `mypaisapp.com` holds no real data (two invented families; nothing persists); its tested maths are ported as golden fixtures (MA-105) and its screens into the dashboard; in phase 9 `mypaisapp.com` points to `dashboard.mypaisapp.com` and the old tracker is switched off (MA-97) | [gilipersonal/wealth-tracker](https://github.com/gilipersonal/wealth-tracker) is the screen reference until then |

Kinds are data, so a new kind of asset or debt, or a new field on one, is a spec the agent proposes and the admin
approves behind the second check, never a new form. The first holding is the household's Monzo ISA, a BlackRock MyMap
fund, priced to value it; ETFs, shares, bond ETFs and commodity ETCs in GBP, USD or EUR slot in as price-source plugins.

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
| [ARCHITECTURE.md](ARCHITECTURE.md) | How it is built: the four rules (Claude never produces a number; the app cannot trade; the layman sees the summary, the detail is one tap away; only admins write, adding and deleting in the chat and correcting in the chat or in place, through one write service), what you see at each door, the system on AWS, the dynamic structure (kinds as data, records as documents, history as events, figures as views) and how anything is registered by talking, check-ins, the budget from statements and monthly check-ins, the Projection and the Budget forecast, XIRR and CAGR, the price source chain that values holdings, the agent and its guardrails, the iOS app (a React Native shell with a native SwiftUI core: the chat with native cards, charts and guided flows; the dashboard screens with the audit log and the agent's activity; the Admin center; Sign in with Apple or Google; push), the web app (the chat, the dashboard and the Admin center in a browser, a SvelteKit PWA), live delivery over SSE, one motion system for both, observability, notifications, the tech stack, security, cost, decisions and open questions. |
| [PLAN.md](PLAN.md) | How it gets built: the principles, then sixteen phases, 0 to 15, in the order they are built, each shipped at both doors and ending in a demo you can click: foundations at every door; talking to the agent (sign-in, the chat, streaming, Activity); the first record (one dynamic structure, one write path); deposits, policies and four currencies; debts and check-ins; investments, priced; the budget from statements and monthly check-ins; the Projection; audit, search and the Admin center; the whole dashboard, with the old wealth tracker retired; then alerts, charts and the Claude client, asking anything about the household's wealth, new kinds of holding, the agent team that is configured, approved, self-healing and self-learning, Indian holdings, and the app beyond the chat (widgets, Siri, the share sheet, Live Activities). Every phase is an epic in Jira and every deliverable a story under it. Each phase lists what is built, what is tested, an exit criterion you can see at both doors, and its cost. A reverse-engineering workbook maps every ported source file to its target module. Then the timeline, the definition of done, and the risks. |
| [TECH_STACK.md](TECH_STACK.md) | The stack by layer (application, the iOS app, the web app, quality, AWS services, infrastructure and tooling, services outside AWS) with the reason for each choice, and the monthly cost of running `dev` and `prod` side by side: lean, standard and full, what moves the number, and the guard rails. |
| [docs/RESEARCH.md](docs/RESEARCH.md) | What was learned from the two references and the landscape around them: the Agentic Trading Desk file by file (what is ported, what is left), Agent Toolbelt's tools and card shapes, the open-source agent frameworks worth borrowing from, market data for UK OEICs and UCITS ETFs, what Claude can read (PDFs, screenshots), what a Telegram bot could show in 2026 (kept as the record; the front end moved to the iOS app in MA-161), how a confidence score is made honest, end-to-end AWS and LLM observability with FastAPI and costing, DynamoDB versus DocumentDB and the Python DynamoDB libraries, the agent framework comparison, the four-layer implementation stack (MA-265), the CI/CD pipeline, seven-layer vulnerability scanning, smoke suite, phase-wise regression matrix and GitHub Actions runner cost analysis (MA-267 to MA-272), the local iOS and iPadOS Maestro testing strategy across Phases 0 to 15 and private 90-day TestFlight household beta plan (MA-167, MA-273, MA-274), and the sources. |
| [Inside MyPaisa](https://claude.ai/artifact/NQecwzUjudjq1Kigri13g5) · [source](docs/design/inside-mypaisa.html) | The whole architecture in plain words, with animations, for someone who is not technical (MA-239): the parts as a small office (the front desk, the in-tray, the concierge, the calculator, the ledger, the filing cabinet, the postman); the admin's journey in nine steps, each on an animated phone, from signing in with Apple through the setup, inviting the family, adding a record by talking, sending a factsheet, the dashboard and a correction in place, a check-in and a statement, to the chatbot answering a what-if; a map that plays one message through the system (a question, a file, a check-in, a failure and its replay); the agent team and the admin desk; the safety nets; the two environments; and a day with MyPaisa. |
| [MyPaisa Architecture v4](https://claude.ai/artifact/Ns3DLFTCvnLcBxJvRvygBo) · [source](docs/design/architecture-v4.html) | The same architecture, technical and animated (MA-244): a system map on AWS-style service icons, from the two doors through API Gateway, the Lambdas, the three SQS queues, DynamoDB and S3 to the Anthropic API, that plays nine journeys hop by hop (a question, a goal, plan with me on Opus, a factsheet, a delete, a check-in, the nightly run, the Monday digest, a failure and its replay) with an inspector for every part, in eight chapters (rebuilt by MA-325); one message as an OpenTelemetry trace with its GenAI spans; the concierge's Claude tool loop and its tools; the six agents around the EventBridge bus, the kind of agent each is and the models it uses; the routing across Sonnet, Haiku and Opus (only for an admin's plan with me) with an interactive spend ladder and each agent's share of the ceiling; the planning and explaining tools and the nightly insight job; where the data lives; dev, prod and the release pipeline; and the guardrails. |
| [MyPaisa Agent Journey](https://claude.ai/artifact/HPcNrDt2TvR2hdMBzjFE9u) · [source](docs/design/agent-journey.html) | Twenty-three flows end to end: joining by invite, signing in with Apple or Google, adding a holding, logging money in plain words, the daily prices that value the holdings, a question, the dashboard in the app, on the iPad and in the web app, the Admin center, what happens when something fails, the spend ladder, the first-of-the-month prompt, money in any currency, the Indian import, the household in INR and GBP, and India's day; and, since MA-226, the whole-wealth flows: registering anything by talking, correcting a figure in place, a check-in, a statement, the month close, and the Projection with a what-if. Each is a numbered path across the member, the app, AWS, Claude and data lanes, with the screens the member sees, its safeguards and the Jira stories that build it. Updated for the iOS app in MA-161 and for v4 in MA-226. |
| [MyPaisa Guardrails and Evals](https://claude.ai/artifact/K4esevpFaFVYQKk2QAw3bT) · [source](docs/design/guardrails-evals.html) | How the agents are guarded and tested (MA-245, MA-258), in plain words or technical detail at a switch: the five fences from least agency to the limits, the policy gate before every tool call, the T0, T1 and T2 tests run on change and never on a timer, every live run checked by code and a few judged overnight, the admin's calibration of the judges, and growth through the manifest; six animated diagrams, also on the Confluence page Guardrails and evals as GIFs (`docs/design/guardrails-evals/`). |
| [MyPaisa Tech Stack and Observability](docs/design/tech-stack-observability.html) · [source](docs/design/tech-stack-observability.html) | The four-layer implementation stack, FastAPI, DynamoDB versus DocumentDB, the agent framework comparison, and end-to-end tracing and LLM observability with costing (MA-265, MA-266), in plain words or technical detail at a switch: one trace from the door through FastAPI (`api` and `stream`), the queues and the agent to Claude and back; the three observability surfaces and the £2.50-a-month CloudWatch budget; the SvelteKit 3 web app stack; the React Native 0.88 and SwiftUI iOS stack; the Python 3.14, FastAPI and single-table DynamoDB backend (why DocumentDB is rejected); and the six agent framework options compared; six animated block diagrams, also on the Confluence page Tech stack, FastAPI, DynamoDB, agents and end-to-end observability as GIFs (`docs/design/tech-stack-observability/`). |
| [MyPaisa CI/CD, Security, Smoke and Regression](docs/design/cicd-security-regression.html) · [source](docs/design/cicd-security-regression.html) | The CI/CD pipeline (`dev` and `prod`), seven-layer vulnerability scanning, phase-progressive smoke suite (`scripts/smoke.py`), five-layer regression pyramid (`scripts/regression.py` across Phases 0 to 15), and the GitHub Actions versus AWS CodeBuild runner cost analysis (MA-267 to MA-272), in plain words or technical detail at a switch; four animated block diagrams, also on the Confluence page CI/CD, vulnerability scanning, smoke and regression architecture as GIFs (`docs/design/cicd-security-regression/`). |
| [MyPaisa Local iOS/iPadOS Maestro Testing & Private TestFlight](docs/design/maestro-ios-ipados-testing.html) · [source](docs/design/maestro-ios-ipados-testing.html) | Local iOS and iPadOS testing with Maestro on Apple Silicon (one-owner-per-device cloned simulator pool `scripts/maestro_local.py`, React Native 0.88 Fabric + Swift 6 SwiftUI `mp.*` selector contract, the four-sub-band adaptive width and rotation matrix, `xcrun simctl` Face ID / APNs / Universal Links / `AX5` capabilities, Phase 0 to 15 rollout at £0/month) and private 90-day (3-month) evergreen TestFlight household beta testing (`testFlightInternalTestingOnly = true`, day-60 keepalive renewal, zero App Store listing; MA-167, MA-273, MA-274), in plain words or technical detail at a switch; five animated block diagrams, also on Confluence as GIFs (`docs/design/maestro-ios-ipados-testing/`). |
| [The AWS architecture in Lucid](https://lucid.app/lucidchart/4ae817c6-847f-45f8-a10c-4509971c9c09/edit) · [source](docs/design/lucid/) | Eight views on AWS shapes, one Lucid document each (overview, environments and delivery, identity, queues and replay, data stores, the market agent and learning loop (from before MA-307), the agent team with caps and alerts, one trace from the door to the model) and the sequence of adding a record and correcting it in place. Embedded and linked in `ARCHITECTURE.md`; the import JSON and the script that writes it are kept so every view can be recreated. |
| [The boards](docs/design/) | The boards are drawn, edited and kept in the repo, git their only record (MA-296), and each design round is reviewed as a private Claude Artifact (MA-260; until 30 Oct 2026 they were drawn in standalone Claude Design and copied in). The [MyPaisa Boards](https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g) Artifact shows the whole set and is published again whenever a board changes (MA-324). MyPaisa iOS v1 holds the app's screens, each in light and dark: the three shell options (Arun picked 1a, Chat first, on 26 Oct 2026), iPhone sign-in, chat, dashboard, audit and activity, admin and settings, and iPad and the foldable. Drawn ahead of their stories (planned); the iOS kit and `ios.css` are in MyPaisa DS v1 (`docs/design/ds-v1/`). The web app's spec is the browser boards in MyPaisa app v1 (`docs/design/app-v1/`), at desktop and at phone width (390); the earlier Telegram, Mini App and Nocturne files were retired from the live repo in MA-278 (git history keeps them). The whole-wealth boards for both doors and a clickable prototype are drawn on MA-193. [docs/design/README.md](docs/design/README.md) says how the files relate. |
| [The build plan in Confluence](https://duttaarun2015.atlassian.net/wiki/spaces/mypaisaaag/pages/197090) · [source](docs/confluence/) | The whole plan as one tree in Confluence (MA-228): the roadmap with every phase's dates, a page per phase (its epic, every story with its estimate, status and design state, the screens at each door as previews, the plan as written, the epic live from Jira), a page per screen area with every board, the design decisions and the options kept, and the explainers and architecture drawings. Generated from the repo by `scripts/confluence_docs.py`; never edited in Confluence. |
| Earlier pages | The [animated architecture](https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx) (v3) and the [first user journeys](https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam), from before the queues and the agent team; kept for reference. |
| `CLAUDE.md` | Planned, phase 0 (MA-24): the working rules for people and coding agents (the OIDC trust trap, Terraform-only IAM, no keys, the budget, the definition of done). |
| `infra/README.md` | Planned, phase 0 (MA-26): every AWS resource, its cost and what protects it; CI's keyless deploy. |

## What is in the repository

Today: the documents above, the boards in `docs/design/` and the plan's checks in `scripts/`. As `PLAN.md`
builds it, phase by phase:

| Path | What it is |
| --- | --- |
| `backend/` | The backend, on its own (Arun, 3 Nov 2026, MA-24: "I need to code to be structured backend/ web/ ios/ infra/"): `pyproject.toml` and `uv.lock` (uv, Python 3.14), the package in four layers (api controllers, services, repositories, a pure domain; `ARCHITECTURE.md` §12.1), its tests, and `CLAUDE.md` with its working rules. Every gate runs with `scripts/backend_gates.sh`. |
| `backend/src/mypaisa_agent/` | The Python package. `registry/` (the kind specs, records and events, and the views folded from them; instruments; documents; the typed single-table DynamoDB repository on Pydantic v2, `boto3` and `mypy-boto3-dynamodb`, MA-265), `wealth/` (accrual, loan schedules, XIRR, CAGR, the budget and the Projection, ported from the old wealth tracker's tested maths), `importers/statements/` (bank and card statements, every line categorised and transfers recognised), `data/` (one `PriceSource` contract and a plugin per feed, to value holdings: yfinance, Twelve Data, EODHD, issuer pages, FT, screenshot; the chain per kind chosen by configuration per environment, yfinance by default; ECB FX, calendars; input hygiene), `cards/` (the Confirm card, the alert cards, scenario; each card a versioned JSON document that the app draws in SwiftUI and the web app in Svelte, MA-174), `docs/` (factsheet and screenshot extraction through Claude), `tools/` (one file per Claude tool), `agent.py` (the tool loop, model routing, caching), `handlers/` (one entry point per Lambda: api on FastAPI behind Mangum for the chat, the dashboard's reads and the in-place corrections, from the app and the web app; stream on FastAPI and Uvicorn through the Lambda Web Adapter for the SSE stream, MA-266; agent; sender, to the open doors and by Apple push and Web Push; worker for the price ingest, docs, the check-ins and the alerts; the authorizer and the Cognito triggers that verify Apple's and Google's tokens); `audit.py` (the hash-chained audit rows) and `runs.py` (the `RunRecord` per run). |
| `backend/playbooks/` | Prompt files loaded into the agent's context only when a task matches. Versioned with the code. |
| `backend/evals/` | Planned, phase 0 (MA-246): the eval cases as Inspect AI datasets on the seed household, their scorers and judges, the recordings T0 replays, and the safety, regression and capability suites; the manifest of every agent and tool is `backend/src/mypaisa_agent/manifest.py` (`ARCHITECTURE.md` §21). |
| `ios/` | The app (MA-165), a bare React Native 0.88 app with a native SwiftUI core, built the way bong-panjika is, its native dependencies through Swift Package Manager (MA-229): `package.json` and `src/`, the TypeScript shell (navigation through the system's tab bar and sidebar, the store, the api and SSE client with TanStack Query, sign-in, push registration, the offline store (MA-173); the shared models and query definitions imported from `web/src/lib/` by path); the Xcode project with the SwiftUI pieces, each hosted through a Fabric component and fed one JSON model (the chat timeline and its cards, the composer, the hero and the figure rows, inline edit, Swift Charts, sheets), in MyPaisa DS v1 "Warm ledger" (colour assets generated from `tokens.css`, Dynamic Type styles, the Liquid Glass controls); `PERFORMANCE.md` with its benches; Jest and XCUITest; from phase 15, the widgets and the share extension. Two configurations chosen by scheme: MyPaisa Dev against dev, MyPaisa against prod. Built from the MyPaisa iOS v1 boards (`docs/design/ios-v1/`, `docs/design/README.md`). |
| `web/` | The web app (MA-194, MA-199, MA-184, MA-185): SvelteKit 3 with Svelte 5 and `adapter-static`, a pnpm workspace on Smart Clearance's stack (Tailwind CSS 4 over the DS tokens, shadcn-svelte on bits-ui, TanStack Query, Table, Virtual and Form; MA-229), in the MyPaisa DS v1 "Warm ledger" look, built from the browser boards in MyPaisa app v1 (`docs/design/app-v1/`) at desktop and at 390 (`docs/design/README.md`), with shadcn-svelte's charts on LayerChart and the shared motion (Motion 14, Svelte transitions, View Transitions; MA-182): the chat, Home and the dashboard as it grows, Audit and Files, Activity, Search and the Admin center; `src/lib/` holds the card types, formatting and view models that the iOS app's shell imports too; a PWA whose service worker caches the shell only and never a figure, with Web Push once installed; served from its own S3 + CloudFront at `dashboard-dev.mypaisapp.com` and `dashboard.mypaisapp.com`, which also serve the iOS app's `apple-app-site-association` file and the invite page (MA-73). |
| `.maestro/` | Planned, phase 0 (MA-273): the local iOS and iPadOS Maestro E2E workspace (`config.yaml`, `subflows/`, `scripts/` for `xcrun simctl` Face ID / APNs / network toggling via `maestro_local.py`'s localhost bridge, `fixtures/` for Photos `addMedia` images and Local File Provider PDFs/workbooks, `screenshots/` and `flows/p00_*.yaml` to `p15_*.yaml`), driven locally across an isolated cloned simulator pool by `scripts/maestro_local.py` at £0/month and checked one file per invocation by `python3 scripts/maestro_local.py check-syntax` on Linux CI (`docs/RESEARCH.md` §8). |
| `backend/tests/` | pytest: golden files for the wealth maths (the old tracker's cases, MA-105), property tests for the FX split, moto for AWS, respx for HTTP, recorded Claude responses for rendering. |
| `scripts/` | The plan's checks today (`plan_sync.py`, `confluence_docs.py`, `roadmap.py`, `review_regress.py`; the checks on the boards' content were stopped by MA-303); from phase 0, the local stack in `scripts/local/` (MA-198), the seed (`scripts/seed.sh local` or `dev`, which loads the design figure set's illustrative household through the write service, MA-110), `scripts/security_scan.py` (MA-267), `scripts/smoke.py` (MA-268), `scripts/regression.py` (MA-269), and `scripts/maestro_local.py` (MA-273). |
| `infra/` | Every AWS resource, Terraform only: `modules/mypaisa` holds the stack once (the Lambdas and their images, the REST API with its streaming route, Cognito, the Scheduler rules, DynamoDB, S3, the web app's S3 and CloudFront, the DNS records, the IAM roles, the budget and the alarms); `dev/` and `prod/` call it with their own settings and state; `modules/secrets` holds every SSM parameter, called by `dev-secrets/` and `prod-secrets/` with state of their own, so the plan on a pull request never reads one (MA-25); `bootstrap/` makes, once, the CI roles, the CodeBuild runner that builds the images and the ECR repository they go to (MA-237). `ARCHITECTURE.md` §17. |
| `.github/workflows/` | The gates and a plan for both environments on every pull request, the iOS gates on a macOS runner when it touches `ios/` (MA-166), and `scripts/web_gates.sh` (lockfile, api types, svelte-check, eslint, prettier, vitest, the build with its CSP, pnpm audit) runs in CI's Web job on every PR; Playwright, axe and Argos run only when Arun asks (a manual run or a `qa` label; MA-303, MA-304); from `main`, build once, deploy dev, then prod after approval, and send MyPaisa Dev (`environment: dev`, Arun only) to TestFlight, then MyPaisa (`environment: prod`, Household Beta) after the same approval, plus `testflight-keepalive.yml` renewing the 90-day TestFlight lease at day 60 (MA-167); a nightly drift check; all through OIDC. |
| `docs/` | The mark, "Watcher" (MA-103): `mark.svg` and `mark-dark.svg` for light and dark grounds, `mark-animated.svg` and `mark-animated-dark.svg` for this page (the intro plays once, and Reduce Motion shows the final frame), `mark-small.svg` for 32 px and below and the favicon, `mark-icon.svg` and `mark-1024.png`, the source of the app icon (made in Icon Composer: default, dark, clear and tinted, MA-165), `mark-256.png` and `mark-64.png` for anywhere smaller. `docs/RESEARCH.md`, the research note. `docs/design/`, the design pages as source and the boards, drawn there (MA-260), the iOS boards in `ios-v1/` among them. |
| `Dockerfile` | The container images for every Lambda, arm64, on the AWS Python 3.14 base, since pandas, numpy and pyarrow exceed the zip limit; the stream is its own build target, run through the Lambda Web Adapter. |

## Models

Every model call goes to the Anthropic API through the official Python SDK. The API key lives in SSM Parameter
Store, is read once per cold start, and never appears in code, logs or chat. The key belongs to a workspace in the
Claude Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for every call,
and the workspace's spend limit hard-stops it. Model ids are set per environment in `infra/dev` and `infra/prod`, since
they move with Anthropic's releases; the first set is below.

| Route | Model | Effort | What the model is asked for |
| --- | --- | --- | --- |
| Alert filter | Haiku 5.5, `anthropic.claude-haiku-5-5` | low | Which of today's alert candidates say something new against what was sent this week. The thresholds and cooldowns are code. |
| Alert text | Sonnet 5.5, `anthropic.claude-sonnet-5-5` | low | A few lines in the household's context: a budget over its plan, a check-in overdue, a job that failed. Every figure comes from the tool results. |
| Document extraction | Sonnet 5.5 | medium | The facts on a factsheet PDF or a valuation screenshot, as strict JSON with the source line and a confidence per field; shown on a Confirm card before anything is saved. |
| Statement lines | Haiku 5.5 | low | The category of each line on a bank or card statement that merchant memory does not know, as strict JSON; transfers between the household's own accounts are recognised in code, and one review card holds every line before one Confirm. |
| Chat and cards | Sonnet 5.5 | medium | Registering anything by talking, through `draft_record` and `draft_event` (code types every value against the kind and computes what it can); an answer to a question, built by calling the tools (`get_networth`, `get_commitments`, `get_budget`, `run_projection`, `get_portfolio`, `propose_change`, and the rest in `ARCHITECTURE.md` §7); the words over the goal solver, the scenario workspace and what changed and why (`solve_goal`, `compare_scenarios`, `explain_change`, `get_calendar`, `get_projection`, `get_returns`, and from phase 11 `get_wealth`, one read for five, §7.1), every figure and every cause from a tool result. |
| The insight job | Haiku 5.5 for each finding's line, Sonnet 5.5 for the Monday digest | low | From phase 10: code finds what matters in the household's own numbers (budget drift, idle cash, a goal off its glide path, a maturity or a rate change soon, a salary not credited, an allowance's year end) and scores it; the models only word it, as facts, never "you should" (`ARCHITECTURE.md` §10.1). |
| Plan with me | Opus 5.5, `anthropic.claude-opus-5-5` | high | From phase 11, only when an admin starts it (`/plan`): a deeper session for a big decision in a loop of its own, with the read and planning tools only, ending in one plan card whose every change takes the admin's Confirm; at most 5% of prod's ceiling, about $0.40 a session (`ARCHITECTURE.md` §7.2). |

**Guardrails on every call:** tools with `strict` schemas and `tool_choice: auto`; adaptive thinking with the effort
above; the system prompt, tool list and rubric cached; the monthly Claude ceiling ($160 in prod and $40 in dev, the Max 20x plan's $200 credit, moved by the admin) with its ladder and guards; a refusal or an error falls back to
the plain template, so a message is never missed because of a model. Before anything is sent, every number in
the text is checked against the tool results and the member's own words; a number with no source fails the message,
which is regenerated once and then sent as the plain facts. Every third-party text (a file, a statement, a fetched
page, a search result) reaches the model only as labelled data and is never followed as an instruction;
files are read by an extractor with no tools, and a conversation that has read such text loses every tool that sends
data out. Every call of our own tools passes a policy gate in code against the agent's manifest, and the server-side
web tools run only in a call that holds no household figure; there is no tool that can spend money beyond a search
query, erase data (a delete only marks a record `deleted`, in an admin's chat), or message anyone but the member it
is answering (`ARCHITECTURE.md` §7, §21.2).

Web search and web fetch are Anthropic's server-side tools, with citations, at $10 per 1,000 searches; no separate
search provider is needed. The overnight judges go through the Message Batches API at half price, since latency does
not matter overnight.

### How the agent is evaluated

MyPaisa is guarded in code, tested on every change, watched live, and grades its forecasts against the household's
own months (`ARCHITECTURE.md` §21,
MA-245). What it must never do is made impossible in code, not asked of the prompt: one manifest per agent and tool, a
policy gate before every call of our own tools, third-party text only as labelled data, files read by an extractor
with no tools, and every figure checked against the tool results and the member's own words. Then:

1. **Every change is tested before it merges.** Eval cases on the seed household, graded by code first, run on every
   pull request: recorded replays always (T0, free); the affected cases live, three trials each, when a prompt, a tool,
   a guard, the agent loop, the model routing, a kind template or the SDK changes (T1, in a Console workspace of their
   own, at most $10 a run and $30 a month, a run stopped by its cap marked incomplete); and the full suite on a new
   model before it reaches prod (T2). The golden set never runs on a timer: what it tests changes only through a pull
   request, and what changes without one is the online checks' to watch.
2. **Every live run is checked.** Code checks every run for free; every flagged run and a random 10% are judged
   overnight on Haiku through Batches; only a rate that leaves its band raises an alert. Transcripts are stored only in
   our AWS account; the judges send them to the Anthropic API on the same terms as the chat, and no evaluation service
   stores them.
3. **The admin calibrates the judges,** monthly and on every change, each label behind the second check; a judge
   below 0.8 on its true-positive or true-negative rate drops to advisory, and a real failure becomes a permanent case.

The household's own forecasts are graded too (`PLAN.md` phase 9, MA-276):

1. **Each closed month is graded.** At each month close, that month's line of the Budget forecast is compared with
   what happened, each gap traced to its input. A change to a run rate, an inflation figure or a salary's growth is
   proposed only from at least 6 closed months, a step at a time, and applied only on an admin's Confirm.
2. **The words are tested on recordings.** Unit tests replay recorded Claude responses, so rendering is
   deterministic and never reaches a model. The figure check (MA-248) has its own tests, with an invented, a
   mis-currencied and a mis-scaled figure it must catch.

Unit tests never reach a model; live-model runs are the eval tiers above, capped, and a run that would pass its cap
asks first with its estimate.

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
| Node | an LTS release | `web/` (SvelteKit) and the iOS app's React Native shell | `brew install node` |
| Xcode | 26 or later | `ios/`: the iOS and iPadOS 26 SDK, the simulators, and swift-format, which comes in its toolchain (`xcrun swift-format`) | the Mac App Store |
| Maestro | 2.11 or later (with OpenJDK 17+) | `.maestro/`: local multi-simulator iOS and iPadOS E2E flows across all four width sub-bands (`scripts/maestro_local.py`, MA-273) | `brew install openjdk && curl -fsSL "https://get.maestro.mobile.dev" \| bash` |
| pnpm | 12 | the web app's workspace | `corepack enable` |
| Playwright's Chromium | with `web/`'s packages | the web app's QA on request (MA-304) at phone (390) and laptop (1440) widths, in both themes | `npx playwright install chromium`, in `web/` |
| playwright-core 1.63 with Chromium | pinned in `scripts/package.json` | `scripts/confluence_capture.js`, the board previews for Confluence | `npm ci --prefix scripts`, then `npx --prefix scripts playwright-core install chromium` |

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
```

The tests run on fixtures and recordings and never reach AWS or a model.

### 3. The Apple and Google accounts

Nothing here goes into AWS. Each id waits for step 4's apply to make its parameter, and goes in at step 5.

- **The Apple Developer Program** (MA-162): $99 a year, joined after Arun's yes on MA-162.
- **Two app ids**, explicit, in Certificates, Identifiers & Profiles: `com.mypaisapp.agent` (MyPaisa) and
  `com.mypaisapp.agent.dev` (MyPaisa Dev). Each has Sign in with Apple, enabled as a primary app id; Push
  Notifications; and Associated Domains (`applinks:dashboard.mypaisapp.com`, or `applinks:dashboard-dev.mypaisapp.com`
  for MyPaisa Dev, with `webcredentials:` for passkeys as MA-109 decides). The bundle id is the audience the verify
  trigger checks on Apple's identity token (`ARCHITECTURE.md` §4.5). Note it and the team id for step 5.
- **A Services ID per environment** (MA-143, MA-162), for Sign in with Apple in the web app: in Identifiers, grouped
  with that environment's app id as its primary app id, with `dashboard.mypaisapp.com` (or `dashboard-dev.mypaisapp.com`)
  as its domain and return URL. It is the audience the verify trigger checks on a token from a browser. Note it for
  step 5.
- **App Store Connect and TestFlight** (MA-164, MA-167): an app record for MyPaisa Dev (Internal Group `"Dev Dogfood"`,
  Arun only) and one for MyPaisa (Internal Group `"Household Beta"`, Arun plus household members invited in App Store
  Connect with least-privilege `Customer Support` or `Marketing` roles scoped strictly to `MyPaisa`, never `MyPaisa Dev`),
  so TestFlight reaches them privately (`testFlightInternalTestingOnly = true`) with no Beta App Review and no public App
  Store listing. An App Store Connect `.p8` API key goes into the `main`-only GitHub `dev` and `prod` environments as a
  secret (MA-26, unreachable from pull-request branches and never stored on disk), and nowhere else; the release and
  day-60 keepalive workflows use it to upload `MyPaisa Dev` in `environment: dev` and `MyPaisa` in `environment: prod`
  after Arun's approval (MA-167).
- **Two Google clients per environment** (MA-143): in the Google Cloud console, an OAuth client of type iOS for
  that environment's bundle id, and one of type Web application with `https://dashboard.mypaisapp.com` (or
  `https://dashboard-dev.mypaisapp.com`, and `http://localhost:5173`, the SvelteKit dev server, for local work on dev)
  as its JavaScript origin.
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
(`ARCHITECTURE.md` §17.4).

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
is denied anything tagged `env=prod` but one thing: the developer role's one exception to its `env=prod` deny is
`ssm:PutParameter` on `/mypaisa-agent/prod/*`, for Arun to put prod's secret values by hand; it never reads,
decrypts, deletes or tags a prod parameter, and Claude never runs it (Arun, 24 Nov 2026, MA-26). Each environment has its own app, keys, Services ID and Google clients, so nothing done
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

Dev's Web Push key (MA-200) goes in the same way, once the apply has made its parameter: a VAPID key pair, made once
(`npx web-push generate-vapid-keys`), whose private half is the SecureString and whose public half the web app
carries.

### 7. The app

```bash
npm ci --prefix ios                           # the shell's packages, from the lockfile
npx --prefix ios react-native spm            # the native pieces, through Swift Package Manager (MA-229)
npm test --prefix ios                         # Jest: the shell
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPhone 17 Pro"
python3 scripts/maestro_local.py setup-pool && python3 scripts/maestro_local.py run --up-to-phase 0
open ios/MyPaisa.xcodeproj                    # run MyPaisa Dev on a simulator or on your own iPhone or iPad
```

MyPaisa Dev talks to `api-dev.mypaisapp.com`, its stream included (MA-144), or to the local stack on the laptop
(MA-198); the scheme picks the environment, never a switch inside the app. A build on your own device needs the
Developer Program and the app ids of step 3. The first person to sign in owns dev's household and invites the
others with one-time links (MA-32). Smoothness is measured on the phone, not the simulator: `ios/PERFORMANCE.md`
holds the budgets and the benches.

The household gets the app privately through TestFlight Internal Testing (`testFlightInternalTestingOnly = true`,
`ITSAppUsesNonExemptEncryption = false`, zero public App Store listing): a merge to `main` that touches `ios/` sends
MyPaisa Dev (`environment: dev`, Arun only) there after dev's smoke check passes, and MyPaisa (`environment: prod`,
`"Household Beta"`) after your approval in the GitHub `prod` environment and prod's read-only smoke check (MA-167).
Each TestFlight build runs for 90 days (3 months) with silent Automatic Updates preserving the Keychain and the offline store, renewed
at day 60 by `testflight-keepalive.yml` (or Xcode Cloud's 25 free compute hours a month) and guarded by a day-60 alert
and a day-75 `itms-beta://` update banner (`docs/RESEARCH.md` §8.8).

### 8. The web app

```bash
corepack pnpm@12.16.1 --dir web install --frozen-lockfile   # the web app's packages, from the lockfile
corepack pnpm@12.16.1 --dir web dev          # the SvelteKit dev server on localhost:5173; /v1 goes to the local backend on :8000
scripts/web_gates.sh                          # every web gate, as CI's Web job runs them
corepack pnpm@12.16.1 --dir web exec playwright install chromium   # once (MA-304)
corepack pnpm@12.16.1 --dir web test:e2e   # QA on request (MA-304): Playwright, every page at 390 and 1440, light and dark
```

Dev's api admits `http://localhost:5173`, and so does dev's Google web client, so signing in with Apple, Google or
a passkey works locally against dev (MA-185). Deployed, the web app is `dashboard-dev.mypaisapp.com` and
`dashboard.mypaisapp.com`, a PWA that a laptop, an iPad or a phone can install. It has the chat: anything new is
created there, and an existing figure is corrected in place on its screen, as in the app.

### 9. The seed, or the whole app on the laptop

```bash
scripts/seed.sh dev                           # dev's illustrative household, from the design figure set (MA-110)
```

The seed is the only way data is written into dev (prod is filled only through the app). To run everything on the
laptop instead, the local stack (MA-198, `scripts/local/`) starts a moto server for DynamoDB, S3 and SQS, the
handlers behind one local app with the stream, the SvelteKit dev server and the simulator pointed at localhost, with
a sign-in stub that answers only on localhost and an agent that replays recorded conversations; `scripts/seed.sh
local` loads the same household.

### 10. The first prices (phase 5)

```bash
scripts/run.sh dev ingest
```

The day's prices value every holding, and the dashboard's figures move at both doors. From then on the Scheduler runs
it.

## Everyday commands

| Task | Command |
| --- | --- |
| Add, correct or delete anything (admins) | In the chat, at either door: say it, or send a statement, a factsheet or a screenshot (camera, scan, Photos or Files), then tap Confirm (a delete also asks for the second check); correct an existing figure in place on its screen. In dev, `scripts/seed.sh dev --reset` wipes and reseeds the illustrative household; it refuses to run against prod |
| Run one job now | `scripts/run.sh dev ingest` (and each of the `worker`'s other job types: the check-ins, the nightly views, the Projection runs) |
| Build the image as CI does | `docker build --platform linux/arm64 -t mypaisa-agent .` |
| Tail a function's logs | `aws logs tail /aws/lambda/mypaisa-dev-agent --follow` |
| Build and test the app as CI does | `npm ci --prefix ios && npx --prefix ios react-native spm && npm test --prefix ios && xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPhone 17 Pro"` |
| Screenshot the booted simulator | `xcrun simctl io booted screenshot shot.png` |
| Serve the web app locally | `corepack pnpm@12.16.1 --dir web dev` (the SvelteKit dev server on `localhost:5173`, `/v1` proxied to the backend on `:8000`) |
| Run the whole app on the laptop | the local stack in `scripts/local/` (MA-198), then `scripts/seed.sh local` |
| Replay failed messages or jobs from a dead-letter queue | `scripts/redrive.sh dev updates` (also `outbox`, `work`, `scheduler`) |
| See this month's spend | `scripts/cost.sh` (AWS Cost Explorer plus the Anthropic usage report by model, against the Claude ceiling and the AWS budget) |

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
python3 scripts/maestro_local.py check-syntax             # from phase 0 (MA-273): checks every .maestro/ YAML + TestIDs parity
```

`plan_sync.py` keeps the plan, the trace, Jira's keys, the roadmap, the Confluence pages and the code in step
(MA-155, MA-228). For the boards it checks only that a story's cited board file exists, that a UI story has a board
before it starts, and that a board name matches its canvas; git is the boards' only record (MA-296). It also fails while a published
artifact is older than the repo files it is published from (`docs/design/artifacts.json`,
`scripts/artifacts_sync.py`, MA-324). Its `selftest`
breaks copies on purpose and expects the refusal; CI runs it on every PR (about 9 s); locally it is reused while plan-sync's code and fixtures are unchanged.

The checks on the boards' content (`board_fit.js`, `a11y_live.js`, `prototype_smoke.js`, `contrast_check.py`,
the board readers in `plan_sync.py` and the generators' `--check`) were stopped by MA-303. Arun, 2 Nov 2026: "All
the 6 checks currently run on docs/design. Lets stop that. I need this checks as QA when I ask, but on actual code
implemented". The QA is measured on the built web app by MA-304, QA on request, with the 25% brightness floors
and the 320 to 1920 width sweep; iOS QA comes after MA-165 (the iOS shell), with no story yet.

`scripts/web_gates.sh` (lockfile, api types, svelte-check, eslint, prettier, vitest, the build with its CSP, pnpm audit) runs in CI's Web job on every PR; Playwright, axe and Argos run only when Arun asks (a manual run or a `qa` label; MA-303, MA-304). The PR gates:

```bash
scripts/web_gates.sh
```

The QA, when Arun asks (MA-304): Playwright's flows and screenshots of every page at phone and laptop widths, in light
and dark, with axe before each capture, Argos's diffs and the sign-in cookie's refusals (MA-185, MA-304):

```bash
corepack pnpm@12.16.1 --dir web test:e2e
```

A pull request that touches `ios/` also runs the app's gates on a macOS runner (MA-166) and locally across the five
cloned Apple Silicon simulators via `scripts/maestro_local.py` (MA-273):

```bash
npm run lint --prefix ios && npm test --prefix ios
xcrun swift-format lint --strict --recursive ios
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPhone 17 Pro"
xcodebuild test -project ios/MyPaisa.xcodeproj -scheme "MyPaisa Dev" -destination "platform=iOS Simulator,name=iPad Air 11-inch (M3)"
python3 scripts/maestro_local.py run --up-to-phase <N>
```

They cover eslint and Jest for the shell, XCUITest for the flows and `⌘*` hardware keyboard shortcuts, snapshot tests
of every SwiftUI piece in light and dark at Large and AX5 text, `performAccessibilityAudit()` in every screen's UI
test, and local Maestro multi-simulator flows across the width sub-bands (`<600`, `600–899`, `900–1392 pt`; no iPad's own screen reaches the `1393 pt` where the chat sits beside, MA-301),
Face ID (`BiometricKit_Sim`), APNs push, Universal Links, Photos/Files and offline queue flush at £0/month. The
`ios/PERFORMANCE.md` benches run on the phone, before a change and after it, not in CI.

Live checks run on request and say what they cost first: an alert written against the live API. The eval tiers are the exception, run by CI on the changes that need them and capped (`ARCHITECTURE.md` §21.3).

## Working on AWS

Everything in the cloud is two sets of resources, dev and prod, in the wealth tracker's AWS account, made by
Terraform in `infra/` and read with the AWS MCP and the CLI. The rules (`.claude/rules/aws-changes.md`): every
resource is Terraform, never made by hand; the AWS MCP reads and never changes; IAM is never edited in the console;
plans are read in full before they are applied; prod is applied only by CI; no AWS key exists anywhere; every secret
lives in SSM Parameter Store only, put by hand (the App Store Connect `.p8` API key, a secret of the `main`-only GitHub
`dev` and `prod` environments, is the one outside AWS; MA-26, MA-164); anything that adds cost is asked about first, with its price.

### The account

| | |
| --- | --- |
| Account | `545595341442`, profile `agent-toolkit` |
| Region | `us-east-1` |
| Terraform state | `s3://wealth-tracker-tfstate`, keys `mypaisa-agent/dev/infra.tfstate` and `mypaisa-agent/prod/infra.tfstate` |
| Names | `mypaisa-<env>-<part>`, every resource tagged `env` |
| SQS | `mypaisa-<env>-updates.fifo`, `-outbox.fifo` and `-work`, each with a dead-letter queue and an alarm; replay with `scripts/redrive.sh` (`ARCHITECTURE.md` §19) |
| Lambda | `api` (the chat API, the dashboard's reads and the in-place corrections, for the app and the web app), `stream` (the SSE stream, through the Lambda Web Adapter, its own build target), `agent`, `sender` (to the open doors, by Apple push and by Web Push), `worker` (the price ingest, docs, check-ins and alerts by job type), the authorizer and the Cognito auth triggers, arm64 container images from one Dockerfile in ECR, a `live` alias per function |
| API Gateway | per environment, a REST API on `api-dev.mypaisapp.com` and `api.mypaisapp.com` (`/auth/nonce`, `/auth/apple`, `/auth/google`, `/auth/passkey/options`, `/auth/passkey`, `/v1/chat/...`, `GET /v1/...`, `PATCH /v1/records/{id}` for the figures a kind marks editable, `/v1/admin/...` for admins), and the stream, `GET /v1/stream`, a route of the same REST API in API Gateway's streaming mode, through the Lambda Web Adapter (MA-229, measured by MA-195); no WebSocket API; the authorizer checks every call and the stream (MA-75) |
| Cognito | a user pool per environment, reached only through the api's `/auth/*` routes (no hosted domain): Sign in with Apple and Google, from the app and from a browser, and passkeys with the dashboard's domain as their relying party, all verified in custom-auth triggers (MA-109) |
| CloudFront + S3 | the web app on `dashboard-dev.mypaisapp.com` and `dashboard.mypaisapp.com`: the SvelteKit PWA, the iOS app's `apple-app-site-association` file and the invite page; the static shell holds no data (MA-73) |
| DNS | the `mypaisapp.com` zone and wildcard certificate belong to the wealth tracker's Terraform until phase 9 moves them here (MA-97); MyPaisa adds four records (`api` and `dashboard` for each environment) |
| EventBridge Scheduler | `07:00` and `21:00` weekdays for prices; `23:30` daily; the daily check-in job; all `Europe/London` |
| DynamoDB | on-demand tables per environment, with TTL; prod's with deletion protection and point-in-time recovery |
| S3 | per environment: prices and FX as parquet, imports; prod's versioned |
| SSM Parameter Store | `/mypaisa-agent/dev/...` and `/mypaisa-agent/prod/...`, SecureString, standard tier |
| Claude | the Anthropic API from the `agent`, `docs` and `worker` Lambdas; Sonnet 5.5 and Haiku 5.5, and Opus 5.5 only for an admin's plan with me; key in SSM |
| IAM | one execution role per function and environment, scoped to its own table, bucket and parameters; three OIDC roles for CI; a developer role with an explicit deny on `env=prod` |
| Monitoring and tracing | OpenTelemetry on every Lambda (the AWS Lambda Layer for OpenTelemetry in the image) to X-Ray with Transaction Search and Application Signals: one trace per message from the door to the model and back, with no prompt, figure or name in it; CloudWatch Logs (14 days), sixteen metrics, one dashboard per environment, and the alarms of `ARCHITECTURE.md` §9.6 (errors, the queues, the 07:45 dead man's switch, the Claude ladder, freshness, the audit chain), delivered to the admin's email and to the owner in the app and by push (MA-29, MA-61); about £2.50 a month in prod (§9.9) |
| Budget | Claude for the agents: the Max 20x plan's $200 credit, $160 prod and $40 dev. AWS and others: £50 across both environments, metered daily from Cost Explorer, with AWS Budgets at £75 as the Terraform backstop. Every cap, step, action and alert route is set in the Admin center (`ARCHITECTURE.md` §14.2) |
| Alerts | The Admin center's Alerts page, in the app and the web app; push; and email through the SNS topic `mypaisa-<env>-admin-alerts` (address in SSM, confirmed once) |

### Access

- **Operators** use the `agent-toolkit` profile through the developer role, which works in dev and is denied
  anything tagged `env=prod`. Reading prod goes through the AWS MCP, read-only: describe, list, logs,
  metrics, costs and Terraform state, never a record or a secret.
- **CI** assumes one of four OIDC roles: `ci-plan` (read only, any pull request; denied every parameter value, every
  object but the plan states, every item, user and log line, MA-25), `ci-evals` (the evals job on a pull
  request, reading only the evals workspace's key, `/mypaisa-agent/dev/anthropic/evals_key`; MA-250), `ci-dev-deploy`
  (`main` only) and `ci-prod-deploy` (`main` and the `prod` GitHub environment only). The trust policies' subjects embed this
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
| `.../twelvedata/api_key` | Twelve Data free tier: US closes and the FX fallback, to value holdings |
| `.../anthropic/api_key` | the Anthropic API key from that environment's workspace, which has its own spend limit |
| `/mypaisa-agent/dev/anthropic/evals_key` | dev only: the key of the `mypaisa-evals` workspace ($30 limit), read only by the `ci-evals` role for the live evals (`ARCHITECTURE.md` §21.3) |
| `.../google/client_id` | that environment's Google iOS client id, the audience on Google's ID tokens from the app (a plain String; an iOS client has no secret) |
| `.../google/web_client_id` | that environment's Google web client id, the audience on Google's ID tokens from the web app (a plain String; no secret is used) |
| `.../webpush/vapid_key` | that environment's Web Push VAPID private key, for push to the installed web app (MA-200); its public half is not a secret |
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

A failed job, an error burst or a missed schedule reaches the owner in the app and by push as a short message with the reason.

### Costs

Under £1 a month on AWS for both environments at this traffic: Lambda, DynamoDB, Scheduler, API Gateway, Cognito
and SSM sit inside the free tiers; the SSE stream is a running Lambda while a door has it open, about $0.012 an open
hour, inside the free tier at the household's use; Apple push and Web Push are free; S3, CloudFront, logs and ECR are pence. Claude is about £9 to £32 a month for one member depending on the routing,
how much you chat and how often an admin plans with Opus (the chat and cards £7 to £21; goals, scenarios and what
changed £1 to £3; the insight job and tax-year dates under £1; plan with me up to £6.15, its 5% cap), web search under
£1, and EODHD £20 only if a free source fails and you approve it. Two members are expected to spend about $30 a month
of Claude on the standard setup and $48 on the full one (`ARCHITECTURE.md` §14.1). Totals for one member, with the
Apple Developer Program's $99 a year (about £76, £6.35 a month, MA-162) included: about £20 lean, £51 standard, £64
full; two members on the standard setup, about £54 (`ARCHITECTURE.md` §14). The agents' Claude allowance is the Max
20x plan's $200 credit ($160 prod, $40 dev) and AWS and others have £50; you set every cap and threshold in the Admin
center, and alerts reach the app, the web app, push and email. Outside the monthly figures: the macOS minutes CI uses
for the app, which count ten to one against GitHub's free minutes (measured in the first month, MA-166).
`TECH_STACK.md` has the table for dev and prod.

## How work is done here

The rules will live in `CLAUDE.md` from phase 0 (MA-24). In short:

- Every change is a branch from `main` (`feat/<slug>`, `fix/<slug>`) and a pull request; never commit on `main`.
  Pull requests merge with a merge commit and the branch is deleted.
- The phases of `PLAN.md` are built in order, each at both doors; a phase starts when the one before meets its exit
  criterion.
- Numbers come from code with tests; Claude writes words. A change that lets a model produce a figure is wrong.
- Nothing predicts a market; every forecast is the household's own, from its actual numbers, and is graded against
  its own months.
- Nothing in the cloud is made by hand; plans are read before they are applied; no key, no secret in a file.
- Every change that calls a paid API states its monthly cost in the pull request.
