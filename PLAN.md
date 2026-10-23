# MyPaisa Agent — Build Plan

How the system in `ARCHITECTURE.md` gets built: in phases, each one shippable
on its own, each ending with something you can see in Telegram and a test suite
that proves it. A phase starts only when the one before it meets its exit
criteria.

Status: planning. Nothing is built.

---

## Principles

1. **Maths before words.** Every phase that adds Claude adds it on top of
   numbers that already work without it.
2. **Prove it in shadow first.** Anything that predicts runs logged but unsent
   until its record earns a place in your chat.
3. **Cheap to run, cheap to stop.** Every phase states its expected monthly
   cost; the budget stop is in place before any paid API is called.
4. **Infrastructure is code.** No console changes, no IAM by hand, no stored
   AWS keys.
5. **Small reviewable steps.** Each phase lands as a series of small changes
   with tests, reviewed before deploy.

---

## Phase 0 — Prerequisites

Things that need you, or need doing once, before any code runs.

| Task | Owner | Notes |
| --- | --- | --- |
| Create the bot with BotFather; store the token in SSM `/mypaisa-agent/dev/telegram/bot_token` | You | Never paste the token into chat or code |
| Request Bedrock model access for Opus 5.5, Sonnet 5.5, Haiku 5.5 in `us-east-1` | You | Bedrock console → Model access |
| Find the Monzo fund name, ISIN, units or value | You | Factsheet in the Monzo app |
| Decide: EODHD now or free sources first | You | Can change later without code changes |
| Brave Search API key (free tier) into SSM | You | Needed from phase 4 |
| Repository id for the OIDC trust policy | Claude | Read from the GitHub API |
| Terraform bootstrap: state key, OIDC role for this repo, `dev` GitHub environment | Claude | Uses existing `wealth-tracker-tfstate` bucket, new key |
| AWS Budgets: alert at £40, action at £50 | Claude | In Terraform, first resource applied |

**Exit:** `terraform plan -var-file=envs/dev.tfvars` runs clean from CI through
OIDC; the budget exists; Bedrock access is granted; the bot token is in SSM.

**Cost:** £0.

---

## Phase 1 — Data and signals

Get the numbers right with no LLM involved.

- Repository skeleton: `pyproject.toml`, uv lockfile, ruff, pyright strict,
  pytest, pre-commit hook, `CLAUDE.md` with the working rules.
- `Instrument` model and the first position (the Monzo fund) loaded from a
  YAML seed into DynamoDB.
- Price sources: `fund_nav` (BlackRock NAV by ISIN), `etf_eod` (EODHD or
  yfinance), `ecb_fx`, `calendars` (XLON, XETR, XNYS).
- Proxy basket for the fund from its published top holdings.
- `ingest` Lambda: fetch, write parquet to S3, idempotent per date.
- `signals` Lambda: trend, momentum, volatility and percentile, drawdown,
  drift, local-vs-FX split, proxy-vs-NAV gap, 1-month bootstrap range.
- Container image, ECR repository, Lambdas, Scheduler rules, DynamoDB table,
  S3 bucket, all in Terraform.
- CI: lint, typecheck, test, build image, `terraform plan` on pull requests;
  apply and deploy on `main`.

**Tests:** golden-file tests for every signal against hand-checked fixtures;
property tests for the FX split (local + FX = total); calendar tests across
both clock-change weeks; moto-backed tests for the Lambda handlers.

**Exit:** for 5 consecutive trading days, signals land in DynamoDB by 07:10 and
match a manual spot check.

**Cost:** about £0.10 a month (£16 more if EODHD is chosen).

---

## Phase 2 — Telegram, plain brief

The bot talks, still without Claude.

- Thin Telegram client: `sendMessage`, `sendPhoto`, `sendChatAction`,
  `answerCallbackQuery`, `setWebhook`.
- `webhook` Lambda behind a Function URL: secret-token check, chat_id
  allowlist, `update_id` dedupe, async hand-off.
- `agent` Lambda, first version: renders a fixed-template morning brief from
  signals; handles `/brief`, `/holdings`, `/privacy`.
- 07:15 schedule; quiet hours; privacy mode.
- Dead man's switch at 07:45 and error alarms that message you.

**Tests:** webhook rejects wrong secret and wrong chat; duplicate `update_id`
is dropped; template renders with and without privacy mode; respx-mocked
Telegram calls.

**Exit:** one week of morning briefs arriving on time; a deliberately broken
run produces a failure message instead of silence.

**Cost:** about £0.10.

---

## Phase 3 — Claude briefs and alerts

Claude starts writing, on top of numbers that already work.

- Bedrock client (`AnthropicBedrockMantle`, IAM auth), model routing table,
  prompt caching, refusal fallback to the plain template.
- Number validator: every figure in Claude's text must appear in that turn's
  tool results.
- Sonnet writes the morning brief and the evening wrap.
- Alert rules (red, amber, digest), cooldowns, weekly red budget, quiet hours.
- Haiku alert filter: demotes repeats of what was already sent this week.
- Inline buttons: `Explain`, `Snooze 7d`, `Mute`, `I acted`; decision log.
- Per-day Bedrock token ceiling.

**Tests:** validator catches an invented number; alert state machine
(fire → cooldown → re-arm) with frozen time; recorded Bedrock responses for
deterministic rendering tests.

**Exit:** two weeks of briefs you'd rather read than the plain template; no
alert fired twice inside its cooldown.

**Cost:** about £5 a month.

---

## Phase 4 — Chat with tools

You can ask questions.

- Tool loop with `strict` tool definitions: `get_positions`, `get_signals`,
  `get_history`, `run_scenario`, `get_events`, `search_news` (Brave),
  `fetch_article`, `update_pref` (with Confirm button), `log_decision`.
- Chat memory: last 20 turns with tool results, 30-day TTL.
- `/why`, `/whatif`, `/prefs`, `/mute` commands, plus free text.
- Charts on request.

**Tests:** each tool against fixtures; a scripted conversation replayed against
recorded Bedrock responses; `update_pref` never writes without the Confirm
callback; search results containing instructions are not acted on.

**Exit:** ten real questions answered correctly with sources; a preference
changed by plain English and confirmed.

**Cost:** about £9 a month cumulative.

---

## Phase 5 — Track record

The bot starts grading itself.

- Forecast log for every 1-month range made in phase 1 onward.
- Grader: at each horizon, record outcome, coverage of the 80% range, and
  `P(fall > 5%)` calibration.
- `get_scorecard` tool; Saturday review on Opus with the scorecard, the week's
  decisions and what the signals said.

**Tests:** grader on synthetic histories with known outcomes; calibration maths
against hand-computed cases.

**Exit:** first four Saturday reviews delivered; 80% ranges cover roughly 80%
of outcomes, or the review says by how much they don't.

**Cost:** about £12 a month cumulative.

---

## Phase 6 — News, events and sentiment (shadow)

The bot reads the news, but only reports what it reads.

- `news` Lambda: RSS sources, text extraction, dedupe, instrument tagging,
  S3 storage with a 90-day lifecycle.
- Event calendar: MPC, FOMC, ECB, CPI, NFP, earnings for the fund's top ten
  holdings.
- `score` Lambda at 23:30: Haiku with a strict JSON schema, cached rubric,
  bounded concurrency.
- Sentiment index per instrument per day, novelty-weighted and decayed.
- One line in the brief ("news tone this week: slightly negative, 3 sources on
  BoE") and an events line ("FOMC Wednesday").
- `get_events`, `get_sentiment` tools.

**Tests:** dedupe on near-identical headlines; tagging on fixture articles;
schema validation on every score; index roll-up maths.

**Exit:** three weeks of daily indices; spot-check of 30 scored articles shows
the scores are reasonable.

**Cost:** about £17 a month cumulative (£33 with EODHD).

---

## Phase 7 — Calls (shadow, then live)

The bot takes a stance.

- Call engine: price-signal base stance, sentiment tilt only when it agrees,
  event-driven horizon and range; Sonnet writes reasons and invalidation rules.
- Paper-trade log with entry price; grading at the horizon; return vs doing
  nothing; calibration by confidence bucket.
- Calls in the Saturday review only, marked "shadow".
- **Go-live gate:** calls start appearing in weekday messages only after 8
  consecutive weeks above the baseline. The gate is checked automatically and
  reported every Saturday.
- `/calls` command and `get_calls` tool.

**Tests:** call engine never sets a stance that contradicts the price signals
from sentiment alone; grading on synthetic outcomes; the go-live gate on
constructed histories.

**Exit:** 8 weeks of graded shadow calls and a clear decision: go live, or
keep in shadow and say why.

**Cost:** about £20 a month cumulative (£36 with EODHD).

---

## Phase 8 — Wealth tracker integration (optional)

- A read-only IAM role the wealth tracker's backend can assume to read
  `INSTR#*` items.
- The tracker's investments screen shows the same values the bot reports.

**Exit:** one set of numbers in both places.

---

## Timeline (indicative)

| Phase | Effort | Calendar |
| --- | --- | --- |
| 0 Prerequisites | half a day, mostly yours | Week 1 |
| 1 Data and signals | 3–4 days | Weeks 1–2 |
| 2 Telegram, plain brief | 2 days | Week 3 |
| 3 Claude briefs and alerts | 3 days | Weeks 3–4 |
| 4 Chat with tools | 3–4 days | Weeks 5–6 |
| 5 Track record | 2 days | Week 6, then runs on its own |
| 6 News and sentiment | 3–4 days | Weeks 7–8 |
| 7 Calls | 3 days, then 8 weeks of shadow | Weeks 9–17 |
| 8 Integration | 1–2 days | When wanted |

---

## Definition of done (every change)

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest --cov --cov-fail-under=90
cd infra/terraform && terraform fmt -check && terraform validate
```

- New behaviour has tests; Lambda handlers are tested with moto, HTTP with respx.
- No secret, key or token in code, logs, test fixtures or chat.
- Cost impact stated in the change description if it calls a paid API.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| yfinance breaks or is rate-limited | EODHD fallback; stale data is labelled, never hidden |
| Fund NAV published late | Proxy basket carries the morning; NAV corrects later |
| Claude invents a figure | Number validator; plain-template fallback |
| Alert fatigue | Weekly red budget, cooldowns, Haiku repeat filter |
| Sentiment adds noise, not signal | Shadow mode and an automatic go-live gate |
| Cost overrun | Budgets alert and stop, per-day token ceiling |
| Prompt injection via news | Tool results marked untrusted; no dangerous tools exist |
| OIDC trust mismatch on first deploy | Pin this repository's numeric ids; read CloudTrail on AccessDenied |
| Bedrock model access not granted in region | Checked in phase 0 exit criteria |
