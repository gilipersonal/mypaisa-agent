# MyPaisa Agent — Tech stack and running cost

The stack as designed in `ARCHITECTURE.md`, by layer, and what it costs to run
as two environments (`dev` and `prod`) in the wealth tracker's AWS account.
Versions are pinned in `pyproject.toml` and `uv.lock` once phase 1 lands; until
then "current" means the latest stable release at the time of writing
(23 Oct 2026).

Status: design. Nothing is built.

---

## 1. Application (Python)

| Piece | Choice | Why |
| --- | --- | --- |
| Runtime | Python 3.14 on AWS Lambda, one arm64 container image, eight handlers (`webhook`, `agent`, `ingest`, `engine`, `news`, `score`, `docs`, `api`) | pandas and matplotlib exceed the zip limit; Graviton is cheaper; one image means one build |
| Packaging | `uv`, `pyproject.toml`, `uv.lock` | Fast, reproducible installs in CI and in the image |
| Models and validation | pydantic v2 | Tool inputs, Telegram updates, every registry item, with `schema_version` |
| Data maths | pandas, numpy, pyarrow | The engine ported from the Agentic Trading Desk; parquet history in S3 |
| Calendars and FX | `exchange_calendars`; ECB reference rates for USD, EUR and INR | XLON, XETR, XNYS sessions and holidays; the clock-change weeks; GBP or INR per member |
| HTTP | httpx | Telegram, ECB, EODHD, Twelve Data, RSS, product pages |
| Price feeds | One `PriceSource` contract; a plugin per feed (yfinance, Twelve Data, EODHD, issuer pages, FT, proxy, screenshot); the chain per kind in each environment's Terraform root (`infra/dev`, `infra/prod`), a `.env` for local | yfinance by default and for local development, no key; EODHD by configuration and a key in SSM; every plugin passes the same contract tests on recorded responses |
| News | feedparser, trafilatura | RSS parsing and article text extraction |
| Charts | matplotlib (Agg backend) | PNG charts for `sendPhoto`, one house style |
| Claude | The `anthropic` Python SDK against the Anthropic API; key in SSM, read once per cold start; the key belongs to a workspace, one per environment, in the Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for the calls; a spend limit per workspace | Structured outputs, strict tools, prompt caching, PDF and image input, citations, server-side web search and fetch, Message Batches for the nightly scoring |
| Lambda helpers and observability | aws-lambda-powertools (Logger, Tracer, Metrics, idempotency, parameters), boto3; AWS X-Ray | Structured JSON logs with a run id on every line, one trace per run, ten custom metrics; a `RunRecord` per run and an `AuditEvent` per change in DynamoDB, which the web app's Activity and Audit pages read |
| Telegram | A thin client on httpx, no framework | A webhook in AWS, long polling for the dev bot on the laptop; rich messages with HTML fallback, inline and reply keyboards, files, callback queries, `editMessageText`, deep links for invites |
| Identity | Amazon Cognito from day one, one user pool per environment (Essentials): one user per member, with their Telegram id, Google account and passkeys linked to it; Telegram through custom-auth Lambda triggers over `initData` and the Login Widget; Google as a provider; five-minute access tokens behind an `HttpOnly`, `SameSite=Strict` cookie; one-time invite links; roles owner / member / viewer | No passwords; one identity however a member arrives; sign out everywhere and pause built in (MA-102, MA-109) |
| Web app (laptop and Mini App) | One static app in HTML, CSS and JS; lightweight-charts (TradingView's open-source charting library); the dashboard pages plus Audit, Activity and the owner's Admin center; served at `console(-dev).mypaisapp.com`, with read-only JSON from the `api` Lambda at `api(-dev).mypaisapp.com` | Interactive charts without a framework; the Mini App and browser boards in `docs/design/dashboard/` are its one spec; the same files serve a phone inside Telegram and a laptop browser |

## 2. Quality

| Piece | Choice |
| --- | --- |
| Lint and format | ruff |
| Types | pyright, strict |
| Tests | pytest; hypothesis for property tests (local + FX = total); moto for AWS; respx for HTTP; recorded Claude responses for rendering; golden files from the desk's self-tests for the engine; coverage threshold 90% |
| Hooks | pre-commit running lint, format check, typecheck and tests |
| CI | GitHub Actions, as on smart-clearance: on every pull request ruff, pyright, pytest with moto, `terraform fmt` and `validate`, tflint, a security scan of the Terraform, gitleaks, pip-audit, `jira-key`, and a plan for dev and prod; on merge to `main` the image built once, dev applied and smoke-tested, then prod after approval in the GitHub `prod` environment with rollback on a failed smoke test; a nightly drift check. Actions pinned to commit SHAs, OIDC only (MA-25, MA-107, MA-108) |
| Definition of done | `PLAN.md` → Definition of done |

## 3. AWS services

| Service | Role |
| --- | --- |
| Lambda | The eight handlers, from one container image |
| API Gateway HTTP API | One per environment on its custom domain, `api-dev.mypaisapp.com` and `api.mypaisapp.com`: `/telegram/webhook` (secret-token header, dedupe), `/auth/telegram`, `/v1/...` read-only JSON, `/v1/admin/...` for the owner |
| Cognito | One user pool per environment, Essentials plan, on `auth-dev.mypaisapp.com` and `auth.mypaisapp.com`; custom-auth triggers for Telegram, Google as a provider, passkeys; free under 10,000 monthly users |
| EventBridge Scheduler | 07:00, 07:15, 21:00, 21:15 on weekdays; 23:30 daily; 08:00 Saturday; every 3 h for news; all in `Europe/London` |
| DynamoDB | One on-demand table per environment; TTL on chat turns, webhook dedupe, article scores |
| S3 | Prices and FX as parquet; documents (private, lifecycle rule); articles (90-day rule); charts (30-day rule) |
| ECR | The container image, one repository, lifecycle rule keeping the last ten |
| SSM Parameter Store | SecureString, standard tier, one path per environment (`/mypaisa-agent/dev/...`, `/mypaisa-agent/prod/...`): bot token, webhook secret, the Anthropic API key, Twelve Data and EODHD keys, the Google OAuth client secret; values put by hand, Terraform creates the parameters and ignores their values |
| CloudFront + S3 | The web app on its own bucket and distribution per environment, `console-dev.mypaisapp.com` and `console.mypaisapp.com`; the shell is public and holds no data |
| Route 53 + ACM | The `mypaisapp.com` zone and the `*.mypaisapp.com` certificate already exist, owned by the wealth tracker's Terraform; MyPaisa looks them up and adds its six records (MA-97 hands the zone over later) |
| X-Ray | One trace per run from the webhook through the agent to the Anthropic API, DynamoDB, S3 and Telegram; inside the free tier at this volume |
| CloudWatch | Logs with 14-day retention and saved Logs Insights queries; ten custom metrics and one dashboard per environment; an error alarm per function; the 07:45 dead man's switch; cost, freshness and audit-chain alarms; all delivered to the chat |
| AWS Budgets | prod: alert at £40, disable the Scheduler rules at £50; dev: cap at £10 |
| IAM | One execution role per function and environment (only its own table, bucket and SSM path); three OIDC roles for CI pinned to this repository's numeric id (`ci-plan`, `ci-dev-deploy` on `main`, `ci-prod-deploy` on `main` and the `prod` environment); a developer role for dev with an explicit deny on anything tagged `env=prod`; all in Terraform, nothing by hand |

## 4. Infrastructure and tooling

| Piece | Choice |
| --- | --- |
| Infrastructure as code | Terraform ≥ 1.9, the only way anything in AWS changes; `infra/modules/mypaisa` holds the stack once and the roots `infra/dev` and `infra/prod` call it; `infra/bootstrap` makes the CI and developer roles once; state in `s3://wealth-tracker-tfstate` under `mypaisa-agent/<env>/infra.tfstate`; plan to a file, read it, apply that file; prod applied only by CI; `prevent_destroy` on prod's data (`.claude/rules/aws-changes.md`) |
| Environments | `dev` and `prod`, every component twice (`mypaisa-<env>-<part>`, tagged `env`) in account `545595341442`, `us-east-1`; separate Telegram bots, Claude keys, Google clients, Cognito pools and SSM paths; separate budgets; dev seeded with synthetic data, prod empty at launch; dev's schedules off unless a variable turns them on (`ARCHITECTURE.md` §18) |
| Developer machine | uv, Docker (image builds), AWS CLI with the `agent-toolkit` profile through the dev developer role, the AWS MCP for reading, Terraform, tflint, GitHub CLI, pre-commit |
| Local run | The code on the laptop against dev in AWS: the dev bot by long polling, the console from `localhost` against `api-dev`, the dev Cognito pool for sign-in; tests never reach AWS or the Anthropic API |
| Secrets | Never in files, chat, logs or Terraform state; put by hand into each environment's SSM path; CI holds no AWS keys |

## 5. Services outside AWS

| Service | Plan | Used for |
| --- | --- | --- |
| Anthropic API | Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens; Batches at half price; web search $10 per 1,000; paid from the Max or Team plan's monthly API credit ($100 on Max 5x) through the linked Console organisation, with a spend limit per workspace (£35 prod, £10 dev) | Every model call, document extraction, web search and fetch, the nightly scoring |
| Telegram Bot API | Free | The chat, files, rich messages, the Mini App, the Login Widget for the laptop |
| Google OAuth | Free | Sign in with Google through Cognito's Google provider; one OAuth client per environment, its secret in that environment's SSM path |
| Twelve Data | Free Basic tier (8 credits a minute, 800 a day) | US closes, the US macro basket, the earnings calendar, FX fallback, ISIN lookup |
| EODHD | All World EOD, $19.99/month or $199/year, when chosen | Dependable London and Frankfurt closes by ISIN |
| yfinance | Free, unofficial | Closes and the fund's `0P…L` NAV when running lean |
| ECB reference rates | Free | GBP, USD, EUR daily fixes |
| BlackRock and iShares product pages | Free | Fund NAV check, holdings files for look-through |
| RSS feeds (BoE, Fed, ECB, FT, Reuters, BlackRock) | Free | News |

---

## 6. Monthly cost, dev and prod

At $1.30 to £1. The AWS free tiers are per account, so `dev` and `prod` share
them; at this traffic (about 6,000 Lambda invocations a month in prod, a few
hundred in dev) the infrastructure is pennies either way. What costs money is
Claude and the data feed, and both scale with how much each environment
actually runs.

| Line | dev | prod, lean | prod, standard | prod, full | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Lambda, Scheduler, DynamoDB, API Gateway, Cognito, SSM, Budgets | £0 | £0 | £0 | £0 | Inside the free tiers; Cognito Essentials is free under 10,000 monthly users; API Gateway is $1 per million requests |
| S3, CloudWatch Logs, ECR | £0.10 | £0.10 | £0.20 | £0.20 | A few hundred MB; ECR $0.10 per GB |
| Web app (S3, CloudFront), Route 53 queries, prod's point-in-time recovery and versioning, X-Ray, dashboards, metrics | £0.20 | £0.40 | £0.50 | £0.50 | Mostly inside the free tiers: three dashboards and ten custom metrics are free |
| Claude: briefs, alerts, chat, cards, Saturday review | £1–3 | £7 | £12 | £21 | dev runs the schedule only while testing; tests use recordings |
| Claude: nightly sentiment scoring, via Batches | £0–0.50 | £1.50 | £2.50 | £2.50 | Off in dev by default |
| Claude: factsheet and screenshot extraction | £0.20 | £0.20 | £0.20 | £0.20 | A few documents a month |
| Claude: web search (~60 a month) | £0 | £0.50 | £0.50 | £1 | $10 per 1,000 searches |
| Twelve Data | £0 | £0 | £0 | £0 | Free tier; the same free key in both environments' SSM paths |
| EODHD | £0 | £0 | £16 | £16 | One subscription, shared; dev reads the same feed |
| Domains and certificates | £0 | £0 | £0 | £0 | The zone and the wildcard certificate already exist; six records; ACM is free |
| **Total** | **£2–4** | **£9.70** | **£32** | **£42** | |

Both environments together: about **£12–14 a month lean, £34–36 standard**,
under the £50 cap. There is no one-off cost and no reserved commitment;
stopping an environment is `terraform destroy` on it.

### What moves the number

| Change | Effect per month |
| --- | ---: |
| Another household member (their briefs and chat) | £2–5 |
| Another ETF or fund | about £0.10 |
| A single share with the valuation and earnings cards (EODHD Fundamentals) | about £46; decide only if a share is added |
| Doubling chat use | £4–8 |
| EODHD on the annual plan | saves about £3 |
| Twelve Data's free tier turning out to cover LSE and Xetra | saves the £16 EODHD line; standard becomes about £18 |
| Heavier use of "Why?" (web search) | about £1 per 100 extra searches |

### Guard rails

- Anthropic Console: one workspace per environment in the organisation linked to the plan, each with a spend limit (£35 prod, £10 dev) that hard-stops its key; the plan's credit ($100 a month on Max 5x) is the whole model budget, auto-reload stays off, and when the credit is exhausted the API stops until the next cycle, which the dead man's switch reports.
- AWS Budgets: prod alerts at £40 and disables the schedules at £50; dev is capped at £10.
- A per-day Claude token ceiling in the agent, and one per household.
- `/pause` stops everything that speaks or scores.
- The figures are from published free tiers and list prices, not a bill; the
  first month of prod gives the real number.
