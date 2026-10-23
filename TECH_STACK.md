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
| Runtime | Python 3.14 on AWS Lambda, one arm64 container image, seven handlers (`webhook`, `agent`, `ingest`, `engine`, `news`, `score`, `docs`) | pandas and matplotlib exceed the zip limit; Graviton is cheaper; one image means one build |
| Packaging | `uv`, `pyproject.toml`, `uv.lock` | Fast, reproducible installs in CI and in the image |
| Models and validation | pydantic v2 | Tool inputs, Telegram updates, every registry item, with `schema_version` |
| Data maths | pandas, numpy, pyarrow | The engine ported from the Agentic Trading Desk; parquet history in S3 |
| Calendars | `exchange_calendars` | XLON, XETR, XNYS sessions and holidays; the clock-change weeks |
| HTTP | httpx | Telegram, ECB, EODHD, Twelve Data, Brave, RSS, product pages |
| News | feedparser, trafilatura | RSS parsing and article text extraction |
| Charts | matplotlib (Agg backend) | PNG charts for `sendPhoto`, one house style |
| Claude | `anthropic[bedrock]`, the `AnthropicBedrockMantle` client | Messages API on Amazon Bedrock with IAM auth; structured outputs, strict tools, prompt caching, PDF and image input, citations |
| Lambda helpers | aws-lambda-powertools, boto3 | Structured logging, idempotency, parameters |
| Telegram | A thin client on httpx, no framework | Webhook-only, one user; rich messages with HTML fallback, inline and reply keyboards, files, callback queries, `editMessageText` |
| Mini App | Static HTML, CSS and JS; lightweight-charts (TradingView's open-source charting library); Telegram `initData` validated by HMAC in the Function URL | Interactive charts without a framework; the artboards in `docs/design/dashboard/` are the spec |

## 2. Quality

| Piece | Choice |
| --- | --- |
| Lint and format | ruff |
| Types | pyright, strict |
| Tests | pytest; hypothesis for property tests (local + FX = total); moto for AWS; respx for HTTP; recorded Bedrock responses for rendering; golden files from the desk's self-tests for the engine; coverage threshold 90% |
| Hooks | pre-commit running lint, format check, typecheck and tests |
| CI | GitHub Actions: lint, typecheck, tests and `terraform plan` on every pull request; build the image, apply and deploy on merge to `main`, authenticated by OIDC |
| Definition of done | `PLAN.md` → Definition of done |

## 3. AWS services

| Service | Role |
| --- | --- |
| Lambda | The seven handlers, from one container image |
| Lambda Function URL | The Telegram webhook (secret-token header, chat allowlist, dedupe) and the Mini App's read-only JSON endpoint (`initData` check) |
| EventBridge Scheduler | 07:00, 07:15, 21:00, 21:15 on weekdays; 23:30 daily; 08:00 Saturday; every 3 h for news; all in `Europe/London` |
| DynamoDB | One on-demand table per environment; TTL on chat turns, webhook dedupe, article scores |
| S3 | Prices and FX as parquet; documents (private, lifecycle rule); articles (90-day rule); charts (30-day rule) |
| ECR | The container image, one repository, lifecycle rule keeping the last ten |
| Bedrock | Claude Haiku 5.5, Sonnet 5.5 and Opus 5.5 on global inference profiles; model access requested per model in `us-east-1` |
| SSM Parameter Store | SecureString, standard tier: bot token, webhook secret, chat id, Twelve Data, Brave and EODHD keys |
| CloudFront + S3 | The Mini App under a new path on the wealth tracker's existing distribution (free flat-rate plan) |
| CloudWatch | Logs with 14-day retention; an error alarm per function; the 07:45 dead man's switch; alarms delivered to the chat |
| AWS Budgets | prod: alert at £40, disable the Scheduler rules at £50; dev: cap at £10 |
| IAM | One execution role per function (its table, bucket, SSM path and model ARNs), one OIDC role for CI pinned to this repository's numeric id; all in Terraform, nothing by hand |

## 4. Infrastructure and tooling

| Piece | Choice |
| --- | --- |
| Infrastructure as code | Terraform ≥ 1.9; state in `s3://wealth-tracker-tfstate` under `mypaisa-agent/<env>/infra.tfstate`; one `envs/<env>.tfvars` per environment |
| Environments | `dev` and `prod` as separate resource sets in account `545595341442`, `us-east-1`; separate Telegram bots; separate budgets; dev's schedules off unless a variable turns them on |
| Developer machine | uv, Docker (image builds), AWS CLI with the `agent-toolkit` profile, Terraform, GitHub CLI, pre-commit |
| Local run | Handlers invoked directly with sample Telegram updates and recorded responses; tests never reach AWS or Bedrock |
| Secrets | Never in files, chat or logs; put with the AWS CLI into SSM; CI holds no AWS keys |

## 5. Services outside AWS

| Service | Plan | Used for |
| --- | --- | --- |
| Telegram Bot API | Free | The chat, files, rich messages, the Mini App |
| Twelve Data | Free Basic tier (8 credits a minute, 800 a day) | US closes, the US macro basket, the earnings calendar, FX fallback, ISIN lookup |
| EODHD | All World EOD, $19.99/month or $199/year, when chosen | Dependable London and Frankfurt closes by ISIN |
| yfinance | Free, unofficial | Closes and the fund's `0P…L` NAV when running lean |
| ECB reference rates | Free | GBP, USD, EUR daily fixes |
| BlackRock and iShares product pages | Free | Fund NAV check, holdings files for look-through |
| RSS feeds (BoE, Fed, ECB, FT, Reuters, BlackRock) | Free | News |
| Brave Search API | Free tier | "Why?" questions and the Saturday review |

---

## 6. Monthly cost, dev and prod

At $1.30 to £1. The AWS free tiers are per account, so `dev` and `prod` share
them; at this traffic (about 6,000 Lambda invocations a month in prod, a few
hundred in dev) the infrastructure is pennies either way. What costs money is
Bedrock and the data feed, and both scale with how much each environment
actually runs.

| Line | dev | prod, lean | prod, standard | prod, full | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Lambda, Scheduler, DynamoDB, Function URL, SSM, Budgets | £0 | £0 | £0 | £0 | Inside the always-free tiers |
| S3, CloudWatch Logs, ECR | £0.10 | £0.10 | £0.20 | £0.20 | A few hundred MB; ECR $0.10 per GB |
| Bedrock: briefs, alerts, chat, cards, Saturday review | £1–3 | £7 | £12 | £21 | dev runs the schedule only while testing; tests use recordings |
| Bedrock: nightly sentiment scoring | £0–1 | £3 | £5 | £5 | Off in dev by default |
| Bedrock: factsheet and screenshot extraction | £0.20 | £0.20 | £0.20 | £0.20 | A few documents a month |
| Twelve Data, Brave Search | £0 | £0 | £1 | £2 | One key shared by both environments |
| EODHD | £0 | £0 | £16 | £16 | One subscription, shared; dev reads the same feed |
| Mini App hosting | £0 | £0 | £0 | £0 | The tracker's CloudFront, flat-rate free plan |
| **Total** | **£2–5** | **£10** | **£34** | **£44** | |

Both environments together: about **£12–15 a month lean, £36–39 standard**,
under the £50 cap. There is no one-off cost and no reserved commitment;
stopping an environment is `terraform destroy` on it.

### What moves the number

| Change | Effect per month |
| --- | ---: |
| Another ETF or fund | about £0.10 |
| A single share with the valuation and earnings cards (EODHD Fundamentals) | about £46; decide only if a share is added |
| Doubling chat use | £4–8 |
| EODHD on the annual plan | saves about £3 |
| Twelve Data's free tier turning out to cover LSE and Xetra | saves the £16 EODHD line; standard becomes about £18 |
| Regional Bedrock inference profiles instead of global | about +10% on the Bedrock lines |

### Guard rails

- AWS Budgets: prod alerts at £40 and disables the schedules at £50; dev is capped at £10.
- A per-day Bedrock token ceiling in the agent.
- `/pause` stops everything that speaks or scores.
- The figures are from published free tiers and list prices, not a bill; the
  first month of prod gives the real number.
