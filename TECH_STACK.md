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
| News | feedparser, trafilatura | RSS parsing and article text extraction |
| Charts | matplotlib (Agg backend) | PNG charts for `sendPhoto`, one house style |
| Claude | The `anthropic` Python SDK against the Anthropic API; key in SSM, read once per cold start; the key belongs to a workspace, one per environment, in the Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for the calls; a spend limit per workspace | Structured outputs, strict tools, prompt caching, PDF and image input, citations, server-side web search and fetch, Message Batches for the nightly scoring |
| Lambda helpers and observability | aws-lambda-powertools (Logger, Tracer, Metrics, idempotency, parameters), boto3; AWS X-Ray | Structured JSON logs with a run id on every line, one trace per run, ten custom metrics; a `RunRecord` per run and an `AuditEvent` per change in DynamoDB, which the web app's Activity and Audit pages read |
| Telegram | A thin client on httpx, no framework | Webhook-only; rich messages with HTML fallback, inline and reply keyboards, files, callback queries, `editMessageText`, deep links for invites |
| Identity | Telegram user id in the chat; signed `initData` in the Mini App; the Telegram Login Widget or Sign in with Google in a laptop browser, each member linked to one Google account by a code typed into the chat; a signed session cookie checked at the CloudFront edge; one-time invite links; roles owner / member / viewer; Amazon Cognito only if a separate login is ever wanted | No passwords to build or phish; one person, two proofs of identity, the same member either way |
| Web app (laptop and Mini App) | One static app in HTML, CSS and JS; lightweight-charts (TradingView's open-source charting library); the dashboard pages plus Audit and Activity; read-only JSON from the `api` Lambda | Interactive charts without a framework; the artboards in `docs/design/dashboard/` are the spec; the same files serve a phone inside Telegram and a laptop browser |

## 2. Quality

| Piece | Choice |
| --- | --- |
| Lint and format | ruff |
| Types | pyright, strict |
| Tests | pytest; hypothesis for property tests (local + FX = total); moto for AWS; respx for HTTP; recorded Claude responses for rendering; golden files from the desk's self-tests for the engine; coverage threshold 90% |
| Hooks | pre-commit running lint, format check, typecheck and tests |
| CI | GitHub Actions: lint, typecheck, tests and `terraform plan` on every pull request; build the image, apply and deploy on merge to `main`, authenticated by OIDC |
| Definition of done | `PLAN.md` → Definition of done |

## 3. AWS services

| Service | Role |
| --- | --- |
| Lambda | The eight handlers, from one container image |
| Lambda Function URL | The Telegram webhook (secret-token header, chat allowlist, dedupe) and the Mini App's read-only JSON endpoint (`initData` check) |
| EventBridge Scheduler | 07:00, 07:15, 21:00, 21:15 on weekdays; 23:30 daily; 08:00 Saturday; every 3 h for news; all in `Europe/London` |
| DynamoDB | One on-demand table per environment; TTL on chat turns, webhook dedupe, article scores |
| S3 | Prices and FX as parquet; documents (private, lifecycle rule); articles (90-day rule); charts (30-day rule) |
| ECR | The container image, one repository, lifecycle rule keeping the last ten |
| SSM Parameter Store | SecureString, standard tier: bot token, webhook secret, the Anthropic API key, Twelve Data and EODHD keys, the session signing secret; the Google OAuth client id as a plain parameter |
| CloudFront + S3 | The web app on its own bucket and distribution per environment, on the free flat-rate plan; the `api` Lambda's Function URL (IAM auth) as a second origin under `/api/*` |
| CloudFront Functions + KeyValueStore | The session cookie check at the edge on every request; the signing secret in KeyValueStore, put there by a command, not by Terraform |
| X-Ray | One trace per run from the webhook through the agent to the Anthropic API, DynamoDB, S3 and Telegram; inside the free tier at this volume |
| CloudWatch | Logs with 14-day retention and saved Logs Insights queries; ten custom metrics and one dashboard per environment; an error alarm per function; the 07:45 dead man's switch; cost, freshness and audit-chain alarms; all delivered to the chat |
| AWS Budgets | prod: alert at £40, disable the Scheduler rules at £50; dev: cap at £10 |
| IAM | One execution role per function (its table, bucket, SSM path and model ARNs), one OIDC role for CI pinned to this repository's numeric id; all in Terraform, nothing by hand |

## 4. Infrastructure and tooling

| Piece | Choice |
| --- | --- |
| Infrastructure as code | Terraform ≥ 1.9; state in `s3://wealth-tracker-tfstate` under `mypaisa-agent/<env>/infra.tfstate`; one `envs/<env>.tfvars` per environment |
| Environments | `dev` and `prod` as separate resource sets in account `545595341442`, `us-east-1`; separate Telegram bots; separate budgets; dev's schedules off unless a variable turns them on |
| Developer machine | uv, Docker (image builds), AWS CLI with the `agent-toolkit` profile, Terraform, GitHub CLI, pre-commit |
| Local run | Handlers invoked directly with sample Telegram updates and recorded responses; tests never reach AWS or the Anthropic API |
| Secrets | Never in files, chat or logs; put with the AWS CLI into SSM; CI holds no AWS keys |

## 5. Services outside AWS

| Service | Plan | Used for |
| --- | --- | --- |
| Anthropic API | Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens; Batches at half price; web search $10 per 1,000; paid from the Max or Team plan's monthly API credit ($100 on Max 5x) through the linked Console organisation, with a spend limit per workspace (£35 prod, £10 dev) | Every model call, document extraction, web search and fetch, the nightly scoring |
| Telegram Bot API | Free | The chat, files, rich messages, the Mini App, the Login Widget for the laptop |
| Google Identity Services | Free | Sign in with Google on the laptop; one OAuth client id per environment, no client secret; the ID token is verified in the `api` Lambda against Google's published keys |
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
| Lambda, Scheduler, DynamoDB, Function URL, SSM, Budgets | £0 | £0 | £0 | £0 | Inside the always-free tiers |
| S3, CloudWatch Logs, ECR | £0.10 | £0.10 | £0.20 | £0.20 | A few hundred MB; ECR $0.10 per GB |
| Web app (S3, CloudFront free plan, edge function, KeyValueStore), X-Ray, dashboard, metrics | £0.10 | £0.20 | £0.30 | £0.30 | Inside the free tiers: three dashboards and ten custom metrics are free |
| Claude: briefs, alerts, chat, cards, Saturday review | £1–3 | £7 | £12 | £21 | dev runs the schedule only while testing; tests use recordings |
| Claude: nightly sentiment scoring, via Batches | £0–0.50 | £1.50 | £2.50 | £2.50 | Off in dev by default |
| Claude: factsheet and screenshot extraction | £0.20 | £0.20 | £0.20 | £0.20 | A few documents a month |
| Claude: web search (~60 a month) | £0 | £0.50 | £0.50 | £1 | $10 per 1,000 searches |
| Twelve Data | £0 | £0 | £0 | £0 | Free tier; one key shared by both environments |
| EODHD | £0 | £0 | £16 | £16 | One subscription, shared; dev reads the same feed |
| Mini App hosting | £0 | £0 | £0 | £0 | The tracker's CloudFront, flat-rate free plan |
| **Total** | **£2–4** | **£9.50** | **£32** | **£42** | |

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
