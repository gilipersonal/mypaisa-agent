<div align="center">

<img src="docs/mark.svg" width="96" height="96" alt="The MyPaisa Agent mark">

# MyPaisa Agent

### A private Telegram analyst for one household's investments.

**It watches the holdings, explains every move, scores its own calls, and never trades.**

<a href="https://github.com/gilipersonal/mypaisa-agent/actions/workflows/deploy.yml?query=branch%3Amain"><img alt="CI/CD on main" src="https://img.shields.io/github/actions/workflow/status/gilipersonal/mypaisa-agent/deploy.yml?branch=main&label=CI%2FCD&logo=githubactions&logoColor=white"></a> <a href="#mypaisa-agent"><img alt="Status: design" src="https://img.shields.io/badge/status-design-c98a54"></a> <a href="#mypaisa-agent"><img alt="Budget: GBP 50 a month" src="https://img.shields.io/badge/budget-%C2%A350%20a%20month-5faf7d"></a>

<a href="ARCHITECTURE.md"><img alt="Claude API" src="https://img.shields.io/badge/Claude-API-9184d9?logo=anthropic&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="AWS Lambda: us-east-1" src="https://img.shields.io/badge/AWS%20Lambda-us--east--1-FF9900?logo=awslambda&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="DynamoDB + S3" src="https://img.shields.io/badge/DynamoDB-%2B%20S3-4053D6?logo=amazondynamodb&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Telegram Bot API" src="https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?logo=telegram&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Python: 3.14" src="https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="pandas" src="https://img.shields.io/badge/pandas-engine-150458?logo=pandas&logoColor=white"></a> <a href="ARCHITECTURE.md"><img alt="Terraform: infra" src="https://img.shields.io/badge/Terraform-infra-844FBA?logo=terraform&logoColor=white"></a>

**[Animated architecture](https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx) · [User journeys](https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam) · [Dashboard design](https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp) · [Component diagram](https://lucid.app/lucidchart/d03dd3bc-9525-43b2-a16e-8696cbfdab86/edit) · [Architecture](ARCHITECTURE.md) · [Build plan](PLAN.md) · [Tech stack](TECH_STACK.md) · [Research](docs/RESEARCH.md)**

</div>

---

> [!NOTE]
> **Status: design.** `ARCHITECTURE.md` (v2), `PLAN.md` (v2) and `docs/RESEARCH.md` are written; no code, infrastructure or workflow exists yet.
> The commands below describe the repository as it will be once phase 1 of the plan lands, so that the plan and
> the README agree from the start. The CI badge reports "no status" until the workflow exists.

A private market agent for the MyPaisa household, run from Telegram by people who are not finance people. Each
member of the household talks to the bot from their own phone, manages their own accounts and holdings, and sees
their own detail plus the household overview; the owner sees everyone's. There are no passwords: Telegram is the
identity, and a member joins by tapping a one-time invite link. It keeps the record of what is held (fed by
sending it a factsheet and a screenshot), fetches the closes,
fund prices and exchange rates every weekday, works out what moved and why, and sends a short brief. It alerts on
the few things worth a push, answers questions by calling its own code as tools, shows charts, reads the news
overnight, and takes a stance (add, hold, pause, trim) with a confidence score that it grades later. Every message
is plain on top with the technical detail one tap away. Python does the maths; Claude, through the Anthropic API, does the
words. It holds no broker login and cannot trade.

| Surface | Where | Runs on |
| --- | --- | --- |
| The bot | one private Telegram chat per household member, joined by invite link | `webhook` and `agent` Lambdas, the Anthropic API |
| The schedule | 07:15 and 21:15 UK on weekdays, 08:00 on Saturday | EventBridge Scheduler in `Europe/London` |
| The numbers | DynamoDB (one table) and S3 (parquet) | `ingest` and `engine` Lambdas |
| The records | factsheets and screenshots read into the registry | `docs` Lambda, Claude reading PDFs and images |
| The news | RSS from central banks and the financial press | `news` and `score` Lambdas |
| The dashboard | one read-only web app: a Mini App inside Telegram, and on a laptop behind a Telegram or Google login, no password | its own S3 + CloudFront per environment, a cookie check at the edge, an `api` Lambda that can only read |
| The audit log | every change to the records: who, when, through what, before and after | `AuditEvent` rows in DynamoDB, hash-chained, written with the change; the Audit page and "what changed this week?" |
| What the agent did | every run: its trigger, model calls, tokens, cost, tools and outcome; the schedule board; spend against the cap | `RunRecord` rows in DynamoDB behind the Activity page; CloudWatch, X-Ray and alarms to the chat |
| The destination | this web app becomes MyPaisa, the household wealth tracker: assets of every kind, debts, budget, a forecast with XIRR, reports, in GBP or INR; read-only; every update through the bot | [gilipersonal/wealth-tracker](https://github.com/gilipersonal/wealth-tracker) is the screen reference until then; phase 9 in `PLAN.md`, later and not a priority |

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
| [ARCHITECTURE.md](ARCHITECTURE.md) | How it is built (v2, the hybrid): the four rules (Claude never produces a number; the bot cannot trade; the layman sees the summary, the detail is one tap away; one write path, the bot), what you see in the chat, the system on AWS, the holdings registry and how a holding is added from a factsheet and a screenshot, the price source chain and look-through, the analysis engine ported from the Agentic Trading Desk (indicators, pillars, flags, macro regimes) with a holder's cascade and a computed confidence score, the research cards rebuilt from Agent Toolbelt for funds, the agent and its guardrails, the Telegram front end (rich messages, charts, guided flows with buttons), the web app for the laptop and as a Mini App behind a Telegram or Google login with the audit log and the agent's activity, observability, notifications, the road to the full MyPaisa app (assets, debts, budget, forecast with XIRR), the tech stack, security, cost, decisions and open questions. |
| [PLAN.md](PLAN.md) | How it gets built (v2): the principles, then ten phases from prerequisites through registry and ingestion, the engine port, briefs and charts, chat and cards, the web app, calibration, news, stances going live, MyPaisa on this backend (assets, debts, budget, forecast) and new kinds of holding. Each phase lists what is built, what is tested, an exit criterion you can see in Telegram, and its cost. A reverse-engineering workbook maps every ported source file to its target module. Then the timeline, the definition of done, and the risks. |
| [TECH_STACK.md](TECH_STACK.md) | The stack by layer (application, quality, AWS services, infrastructure and tooling, services outside AWS) with the reason for each choice, and the monthly cost of running `dev` and `prod` side by side: lean, standard and full, what moves the number, and the guard rails. |
| [docs/RESEARCH.md](docs/RESEARCH.md) | What was learned from the two references and the landscape around them: the Agentic Trading Desk file by file (what is ported, what is left), Agent Toolbelt's tools and card shapes, the open-source agent frameworks worth borrowing from, market data for UK OEICs and UCITS ETFs, what Claude can read (PDFs, screenshots), what a Telegram bot can show in 2026, how a confidence score is made honest, and the sources. |
| [The animated architecture](https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx) · [source](docs/design/architecture.html) | The design as an animated page (v3): four scenarios (the morning brief, a question, an alert after the US close, adding a holding) with a packet travelling hop by hop, the agent's tool loop replayed on a worked example, the news-to-stance pipeline, the registry and kind profiles, the engine's pillars, cascade and confidence, the cards, the weekly grid, the cost against the £50 cap, and the repository layout. Private to the account; share from the page. |
| [The user journeys](https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam) · [source](docs/design/journeys.html) | Eight journeys played on a phone frame as Telegram would show them: first open, adding a holding by factsheet and screenshot, the morning brief with its technical section, asking why, a stance with a confidence you can check, a red alert, the Saturday review with the dashboard, and settings by chat. Narrated, with the parts of the system involved lit up at each step. |
| [The Mini App dashboard](https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp) · [source](docs/design/dashboard/) | The read-only dashboard as five phone-size screens on a design canvas: Overview, a holding, Overlap, Scorecard, and the light theme. These are the Mini App boards of the one spec for `web/` in phase 5; the browser boards (laptop, two columns, the login page) join them. [docs/design/README.md](docs/design/README.md) says how the files relate. |
| [The component diagram](https://lucid.app/lucidchart/d03dd3bc-9525-43b2-a16e-8696cbfdab86/edit) · [source](docs/design/lucid/) | Every component on one Lucidchart page: the household and Telegram zone, the AWS services with the one agent (its model routing and 16 tools), the DynamoDB table and its entity groups, the scheduled pipeline, and the services outside AWS. Rendered in `ARCHITECTURE.md`; the import JSON is kept so the page can be recreated. |
| `CLAUDE.md` | Planned, phase 1: the working rules for people and coding agents (the OIDC trust trap, Terraform-only IAM, no keys, the budget, the definition of done). |
| `infra/README.md` | Planned, phase 1: every AWS resource, its cost and what protects it; CI's keyless deploy. |

## What is in the repository

Today: the three documents above and `docs/mark.svg`. After phase 1, by `PLAN.md`:

| Path | What it is |
| --- | --- |
| `src/mypaisa_agent/` | The Python package. `registry/` (instruments, positions, valuations, documents; the kind profiles), `data/` (one `PriceSource` contract and a plugin per feed: yfinance, Twelve Data, EODHD, issuer pages, FT, proxy, screenshot; the chain per kind chosen by configuration per environment, yfinance by default; ECB FX, calendars; input hygiene), `engine/` (indicators, pillars, flags, macro, the holder's cascade, confidence; ported from the Agentic Trading Desk with its self-tests as golden files), `cards/` (stance, holding profile, overlap review, bear vs bull, scenario), `docs/` (factsheet and screenshot extraction through Claude), `news/` and `events/` (RSS, dedupe, scoring; the calendar), `calls/` (the hash-chained ledger, grader, scorecard, calibration), `tools/` (one file per Claude tool), `agent.py` (the tool loop, model routing, caching, the debate), `telegram.py` (rich messages with HTML fallback, buttons, files, Mini App auth), `handlers/` (one entry point per Lambda: webhook, agent, ingest, engine, news, score, docs, api); `audit.py` (the hash-chained audit rows) and `runs.py` (the `RunRecord` per run). |
| `playbooks/` | Prompt files loaded into the agent's context only when a task matches: `read-central-bank-statement`, `map-headline-to-holdings`, `write-stance`, `grade-stance`. Versioned with the code. |
| `web/` | The read-only web app: static HTML with lightweight-charts in the MyPaisa DS v1 "Warm ledger" look, built from the one spec (Mini App and browser boards in the MyPaisa app v1 project in Claude Design; `docs/design/README.md`), plus the Audit and Activity pages; opened as a Mini App in Telegram and in a laptop browser; served from its own S3 + CloudFront with a cookie check at the edge. |
| `tests/` | pytest: golden files for every signal, property tests for the FX split, moto for AWS, respx for HTTP, recorded Claude responses for rendering. |
| `infra/terraform/` | Every AWS resource: the Lambdas and their image, the Scheduler rules, the DynamoDB table, the S3 bucket, SSM parameters, the IAM roles, the budget and the alarms; `envs/dev.tfvars`. |
| `.github/workflows/` | `deploy.yml`: lint, typecheck, tests and `terraform plan` on every pull request; build, apply and deploy from `main` through OIDC. |
| `docs/` | The mark: `mark.svg` for this page, `mark-1024.png` for the bot's Telegram picture (`/setuserpic` in BotFather), `mark-256.png` and `mark-64.png` for anywhere smaller. `docs/RESEARCH.md`, the research note. `docs/design/`, the three design pages as source: the animated architecture, the user journeys, and the dashboard artboards. |
| `Dockerfile` | One container image for every Lambda, arm64, on the AWS Python 3.14 base, since pandas and matplotlib exceed the zip limit. |

## Models

Every model call goes to the Anthropic API through the official Python SDK. The API key lives in SSM Parameter
Store, is read once per cold start, and never appears in code, logs or chat. The key belongs to a workspace in the
Claude Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for every call,
and the workspace's spend limit hard-stops it. Model ids are set per environment in `infra/terraform/envs/*.tfvars`, since
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
above; the system prompt, tool list and rubric cached; a per-day token ceiling; a refusal or an error falls back to
the plain-template brief, so a message is never missed because of a model. Before anything is sent, every number in
the text is checked against that turn's tool results; a number with no source fails the message, which is
regenerated once and then sent as the plain facts. Search results and fetched pages reach the model marked as
untrusted text and are never followed as instructions; there is no tool that can spend money beyond a search query,
delete data, or message anyone but the household's chat.

Web search and web fetch are Anthropic's server-side tools, with citations, at $10 per 1,000 searches; no separate
search provider is needed. The nightly sentiment scoring goes through the Message Batches API at half price, since
latency does not matter overnight.

### How the agent is evaluated

The bot grades itself, and the tests hold the code to it. Planned in phases 5 and 7 of `PLAN.md`:

1. **Forecasts are logged and graded.** Every 1-month range the signals produce is stored with the price at the
   time. When the month ends the outcome is recorded: did the 80% range cover it, and was `P(fall > 5%)` calibrated.
   The Saturday review reports coverage and calibration, or by how much they miss.
2. **Stances are paper-traded.** A stance is stored with its entry price and graded at its horizon: right or wrong,
   the return against doing nothing, and calibration by confidence bucket. Stances stay in shadow (logged, reported on
   Saturday, never pushed) until they beat the baseline for 8 consecutive weeks. The gate is checked in code and
   reported every week either way.
3. **Decisions are logged.** "I acted" on a message writes a decision record. The review compares what was done with
   what the signals said, which is the only honest way to learn whether the bot helps.
4. **The words are tested on recordings.** Unit tests replay recorded Claude responses, so rendering is
   deterministic and never reaches a model. The number validator has its own tests, with an invented figure it must
   catch.
5. **Sentiment is spot-checked.** Phase 6 ends with 30 scored articles read by a person against their scores before
   the index is allowed to tilt a call.

Live-model runs are on request only and print their estimate first.

## Prerequisites

macOS or Linux. Nothing is installed globally except these tools.

| Tool | Version | Needed for | Install |
| --- | --- | --- | --- |
| Git | recent | everything | |
| uv | 0.12 or later | the package, its tests and tools (uv fetches Python 3.14 itself) | `brew install uv` |
| Docker | recent, running | building the Lambda image locally | Docker Desktop, OrbStack or Colima |
| AWS CLI | v2 | every cloud operation, with the `agent-toolkit` profile | `brew install awscli` |
| Terraform | 1.9 or later | `infra/terraform/` only | `brew install terraform` |
| GitHub CLI (`gh`) | recent | pull requests, reading the repository id for the OIDC trust | `brew install gh` |
| jq | any | the scripts | `brew install jq` |

You also need, in the AWS account `545595341442`: a profile that can assume the operator role (`agent-toolkit`)
and the parameters in SSM listed under [Secrets](#secrets). The Anthropic API key comes from
a workspace in the [Claude Console](https://platform.claude.com) organisation linked to your Max or Team plan, with
a spend limit set on the workspace. The Telegram bot is made once
with BotFather.

## Set up from scratch

This is phase 0 of `PLAN.md`. Steps 1 and 2 need nothing but the tools; the rest need the AWS profile.

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

### 3. The Telegram bot

Make the bot with [@BotFather](https://t.me/BotFather) (`/newbot`), turn off group joins (`/setjoingroups`), and put
the token straight into SSM. It is never pasted into a file, a chat or a shell history:

```bash
export AWS_PROFILE=agent-toolkit
read -rs TOKEN && aws ssm put-parameter --name /mypaisa-agent/dev/telegram/bot_token --type SecureString --value "$TOKEN" && unset TOKEN
openssl rand -hex 32 | aws ssm put-parameter --name /mypaisa-agent/dev/telegram/webhook_secret --type SecureString --value "$(cat)"
```

Your `chat_id` arrives with the first message you send the bot after the webhook is set (step 6): the deploy prints
it from the logs, and you store it the same way under `.../telegram/chat_id`. Until it is stored, the bot answers
no one.

### 4. The Anthropic API key

On claude.ai, go to Settings → Billing → API credits and link a Claude Console organisation to your Max or Team
plan (you need 7 days on the plan; the link cannot be moved later without support, so pick the organisation you
will build in). No payment method is needed: the plan's monthly API credit ($100 on Max 5x) pays for the calls. In
that organisation create two workspaces, `mypaisa-prod` with a £35 spend limit and `mypaisa-dev` with £10, and a
key named `mypaisa-agent-dev` in the dev workspace. Put it straight into SSM, as with the bot token:

```bash
read -rs KEY && aws ssm put-parameter --name /mypaisa-agent/dev/anthropic/api_key --type SecureString --value "$KEY" && unset KEY
```

No model access request is needed; the key works immediately.

### 5. Terraform

The state lives beside the wealth tracker's, under its own key. The OIDC role's trust policy is pinned to this
repository's own numeric id, which the first apply reads from GitHub:

```bash
cd infra/terraform
export AWS_PROFILE=agent-toolkit
terraform init
terraform plan  -var-file=envs/dev.tfvars -var="github_repo_id=$(gh api repos/gilipersonal/mypaisa-agent --jq .id)" -out=dev.tfplan
terraform apply dev.tfplan
```

Read the whole plan before applying it. The first apply creates the budget before anything that can spend.

### 6. The webhook and the first brief

```bash
scripts/set-webhook.sh dev                    # setWebhook with the Function URL and the secret from SSM
scripts/run.sh dev ingest && scripts/run.sh dev signals && scripts/run.sh dev brief
```

The brief arrives in the chat as a silent push. From then on the Scheduler runs it.

## Everyday commands

| Task | Command |
| --- | --- |
| Add or change a holding | In the chat: send a factsheet or a screenshot, or type it, then tap Confirm. `seed/positions.yaml` + `scripts/seed.sh dev` only for the first run |
| Run one job now | `scripts/run.sh dev ingest` (also `engine`, `brief`, `wrap`, `news`, `score`, `review`, `grade`) |
| Build the image as CI does | `docker build --platform linux/arm64 -t mypaisa-agent .` |
| Tail a function's logs | `aws logs tail /aws/lambda/mypaisa-agent-dev-agent --follow` |
| Set the webhook again after a URL change | `scripts/set-webhook.sh dev` |
| See this month's spend | `scripts/cost.sh` (AWS Cost Explorer plus the Anthropic usage report by model, against the £50 cap) |
| Grade every forecast and call whose horizon has passed | `scripts/run.sh dev grade` |

## Tests

The gates run in CI on every pull request; run them before pushing:

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest --cov --cov-fail-under=90
cd infra/terraform && terraform fmt -check && terraform validate
```

Live checks run on request only and say what they cost first: a brief against the live API
(`scripts/run.sh dev brief --live`) and the sentiment spot-check set (`scripts/eval.sh sentiment`).

## Working on AWS

Everything in the cloud is one set of resources in the wealth tracker's AWS account, made by Terraform in
`infra/terraform/`, and operated with the AWS CLI and the scripts. The rules: every resource is Terraform, never
made by hand; IAM is never edited in the console; plans are read in full before they are applied; no AWS key exists
anywhere; every secret lives in SSM Parameter Store only; anything that adds cost is asked about first, with its
price.

### The account

| | |
| --- | --- |
| Account | `545595341442`, profile `agent-toolkit` |
| Region | `us-east-1` |
| Terraform state | `s3://wealth-tracker-tfstate`, key `mypaisa-agent/dev/infra.tfstate` |
| Lambda | `webhook`, `agent`, `ingest`, `engine`, `news`, `score`, `docs`, one arm64 container image in ECR |
| Function URL | on `webhook` only, auth `NONE`, protected by the Telegram secret token and the chat allowlist |
| EventBridge Scheduler | `07:00`, `07:15`, `21:00`, `21:15` weekdays; `23:30` daily; `08:00` Saturday; every 3 h for news; all `Europe/London` |
| DynamoDB | one on-demand table, `mypaisa-agent-dev`, with TTL |
| S3 | `mypaisa-agent-dev`: prices and FX as parquet, articles (90-day rule), charts (30-day rule) |
| SSM Parameter Store | `/mypaisa-agent/dev/...`, SecureString, standard tier |
| Claude | the Anthropic API from the `agent`, `docs` and `score` Lambdas; Opus 5.5, Sonnet 5.5, Haiku 5.5; key in SSM |
| IAM | one execution role per function, scoped to its table, bucket and parameters; one OIDC role for CI |
| Monitoring | CloudWatch Logs (14 days), an error alarm per function, the 07:45 dead man's switch, all delivered to the chat |
| Budget | AWS Budgets at £40 (alert) and £50 (disable the Scheduler rules) |

### Access

- **Operators** use the `agent-toolkit` profile. Terraform needs it; nothing else does once deployed.
- **CI** assumes the OIDC role from the `dev` GitHub environment only. The trust policy's subject is
  `repo:gilipersonal@325700199/mypaisa-agent@<repo_id>:environment:dev`; GitHub's immutable subject claims embed
  both numeric ids, so the wealth tracker's policy cannot be copied. On `AccessDenied` from
  `AssumeRoleWithWebIdentity`, read CloudTrail first: it records the exact subject presented.
- The `dev` environment's deployment branch policy is what keeps deploys on `main`; the subject carries no branch.
- Never create an IAM user or an access key for this project.

### Secrets

Terraform creates the parameter names and never holds a value. The values are put with the AWS CLI as in
[Set up](#3-the-telegram-bot), read by each function once per cold start, and never logged.

| Parameter | What it is |
| --- | --- |
| `/mypaisa-agent/dev/telegram/bot_token` | from BotFather |
| `/mypaisa-agent/dev/telegram/webhook_secret` | random, sent by Telegram as `X-Telegram-Bot-Api-Secret-Token` |
| `/mypaisa-agent/dev/telegram/chat_id` | the one chat the bot answers |
| `/mypaisa-agent/dev/twelvedata/api_key` | Twelve Data free tier: US closes, the macro basket, the earnings calendar |
| `/mypaisa-agent/dev/anthropic/api_key` | the Anthropic API key from the `mypaisa-dev` workspace, which has its own spend limit |
| `/mypaisa-agent/dev/eodhd/api_key` | EODHD, if chosen over the free sources |

A secret-scanning step runs on every pull request.

### Releasing

A merge to `main` builds the image, pushes it to ECR, applies Terraform and points every function at the new image.
Roll back by re-applying with the previous image tag (every tag is a commit):

```bash
cd infra/terraform && terraform apply -var-file=envs/dev.tfvars -var="image_tag=<commit>"
```

### Logs and alarms

Each function logs one JSON object a line with a correlation id per update or schedule run.

```bash
aws logs tail /aws/lambda/mypaisa-agent-dev-agent --since 1h
aws logs filter-log-events --log-group-name /aws/lambda/mypaisa-agent-dev-ingest --filter-pattern '{ $.level = "ERROR" }'
```

A failed brief, an error burst or a missed schedule reaches the Telegram chat as a short message with the reason.

### Costs

Under £1 a month on AWS at this traffic: Lambda, DynamoDB, Scheduler, the Function URL and SSM sit inside the
always-free tiers; S3, logs and ECR are pence. Claude is £7 to £21 a month depending on the routing and how much
you chat, sentiment scoring £1.50 to £2.50 through Batches, web search under £1, and EODHD £16 if chosen. Totals:
about £9.50 lean, £32 standard, £42 full, against the £50 cap. `TECH_STACK.md` has the table for dev and prod.

## How work is done here

The rules will live in `CLAUDE.md` from phase 1. In short:

- Every change is a branch from `main` (`feat/<slug>`, `fix/<slug>`) and a pull request; never commit on `main`.
  Pull requests merge with a merge commit and the branch is deleted.
- The phases of `PLAN.md` are built in order; a phase starts when the one before meets its exit criterion.
- Numbers come from code with tests; Claude writes words. A change that lets a model produce a figure is wrong.
- Anything that predicts runs in shadow first and earns its place with a scored record.
- Nothing in the cloud is made by hand; plans are read before they are applied; no key, no secret in a file.
- Every change that calls a paid API states its monthly cost in the pull request.
