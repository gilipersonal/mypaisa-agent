# MyPaisa Agent — Build Plan (v2)

How the hybrid in `ARCHITECTURE.md` gets built, in phases that each end with
something you can see in Telegram and a test suite that proves it. v2 moves
the holdings registry and the Telegram ingestion to the front, because the
first thing you will do is feed the bot your Monzo funds, and adds the engine
port, the research cards, the Mini App and the confidence calibration.

Status: planning. Nothing is built. The architecture is drawn in Lucid (seven
AWS views and a sequence, linked from `ARCHITECTURE.md`), and two pages walk
through the flows end to end:
[MyPaisa Agent Journey](https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7) and
[MyPaisa Market Agent](https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb)
(MA-141). Every phase is an epic in Jira project MA, and every deliverable
below is a story or task under it.

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

---

## Phase 0 — Prerequisites

| Task | Owner |
| --- | --- |
| Create two bots with BotFather, one for dev and the household's for prod; each token into its own SSM path (`/mypaisa-agent/dev/telegram/bot_token`, `/mypaisa-agent/prod/telegram/bot_token`); the picture with `/setuserpic` from `docs/mark-1024.png` on both | You |
| Link a Claude Console organisation to your Max or Team plan (claude.ai Settings → Billing → API credits; 7 days on the plan first; the link cannot be moved later without support). In that organisation make two workspaces, `mypaisa-prod` and `mypaisa-dev`, with spend limits of $160 and $40 (together the Max 20x plan's $200 monthly credit, the agents' allowance; each limit is the hard cap behind that environment's Claude ceiling, `ARCHITECTURE.md` §15.1); no payment method and auto-reload off, so the credit is the last stop; and one API key in each; put each key into its own environment's SSM path, `/mypaisa-agent/dev/anthropic/api_key` and `/mypaisa-agent/prod/anthropic/api_key`. The Max 20x plan's monthly API credit ($200) then pays for every model call; it covers the Messages API and Batches, not Claude Code, and expires each cycle without rolling over | You |
| Export the factsheet (PDF) and a valuation screenshot for each Monzo fund from the app, ready to send to the bot | You |
| Data feed: decided, free sources first. yfinance (Yahoo Finance, unofficial, no key) for the LSE and Xetra closes and the funds' `0P…L` NAV, Twelve Data's free tier for the US lines and FX fallback, the issuer pages, FT and the screenshot behind them. EODHD is the last resort: switched on only with the admin's approval when no free source can serve a holding or its history (Historian £19.99 a month, `ARCHITECTURE.md` §19.2) | Decided |
| Twelve Data API key (free tier) into SSM at `/mypaisa-agent/dev/twelvedata/api_key` and `/mypaisa-agent/prod/twelvedata/api_key`. It is in every chain from day one: first for the US lines, the US macro basket, the earnings calendar and the FX fallback; second, behind yfinance, for London and Frankfurt closes. The source-comparison report shows whether the free tier serves those exchanges; nothing to check by hand | You |
| Terraform bootstrap (MA-26): `infra/modules/mypaisa` with the two roots `infra/dev` and `infra/prod`, each with its own state key in the existing state bucket; `infra/bootstrap`, applied once from the laptop, with the account's GitHub OIDC provider reused and three roles pinned to this repository's numeric id (`ci-plan`, `ci-dev-deploy`, `ci-prod-deploy`); `dev` and `prod` GitHub environments, prod needing your approval; the developer role with its explicit deny on `env=prod`; the zone and the certificate looked up by name (`ARCHITECTURE.md` §18.2); AWS Budgets at £75 as the backstop behind the app's £50 cap (`ARCHITECTURE.md` §15.2, MA-137) | Claude |
| Secrets out of state (MA-159): every secret's SSM parameter made by Terraform with a write-only placeholder (`value_wo`, `value_wo_version`; Terraform 1.11 or later, `hashicorp/aws` 5.87 or later), then overwritten by hand; no secret ever in state (`ARCHITECTURE.md` §14). So every "into SSM" row above waits for the apply that makes its parameter (MA-26's, and for prod the first release): a value put first makes that apply fail | Claude |
| The PR gates in GitHub Actions (MA-25): ruff, pyright, pytest with moto, `terraform fmt` and `validate`, tflint, the Terraform security scan, gitleaks, pip-audit, `jira-key`, and a plan for both environments on every PR touching `infra/` | Claude |
| A Google OAuth client per environment (MA-109): any Gmail account can own the Google Cloud project, no billing account is needed, and it has no link to AWS. The consent screen is "External" (a personal Gmail cannot choose "Internal") with only the basic email and profile scopes, so it can be published without Google's review. Each client is a "Web application" whose authorised redirect is `https://auth-dev.mypaisapp.com/oauth2/idpresponse` or `https://auth.mypaisapp.com/oauth2/idpresponse`; the client id and secret go into that environment's SSM path | You |
| `CLAUDE.md` with the working rules; the repository skeleton (uv, ruff, pyright, pytest, pre-commit) | Claude |

**Exit:** `terraform plan` runs clean for dev and prod from CI through OIDC;
the gates run on every PR; the budget exists; model access is granted; both
bots' tokens, both Claude keys and both Google clients are in SSM.

**Cost:** £0.

---

## Phase 1 — Registry and Telegram ingestion

What you hold, recorded through the chat, with no analysis yet.

- Registry entities (Portfolio, Member, Invite, Account, Instrument,
  Position, Valuation, Document, Transaction) with `schema_version`; every
  item keyed by the household; a seed command for the first holding. The
  fields phase 9 needs (`Account.category`, `ccy`, `institution`,
  `country`; `Instrument.maturity_date`, `rate`; the cashflow types on
  `Transaction`) exist from day one, so no migration stands between the ISA
  and the rest of the household's wealth.
- Identity on AWS from day one (MA-109, `ARCHITECTURE.md` §4.5): a Cognito
  user pool per environment (Essentials) with the `auth(-dev).mypaisapp.com`
  domain; Telegram through custom-auth Lambda triggers over `initData` and
  the Login Widget (constant-time HMAC, five-minute freshness, replay
  refused); Google as a provider; passkeys; five-minute access tokens behind
  an `HttpOnly` cookie and the member's session epoch. The first person to
  open the chat becomes the household's owner; `/invite` makes a one-time
  deep link, and joining creates the member's Cognito user; `/members` lists
  and removes; the webhook resolves `from.id` to a member and ignores
  everyone else.
  Isolation tests: a member cannot read another household, nor another
  member's detail unless shared.
- Accounts per member (ISA, GIA, SIPP, cash; joint accounts with two
  owners); every holding added lands in the adding member's account.
- Telegram client: `sendMessage` (HTML), rich messages with fallback,
  `sendPhoto`, `editMessageText`, `getFile`, `setMyCommands`, reply keyboard,
  menu button, callback queries.
- API Gateway HTTP API at `api(-dev).mypaisapp.com`, with
  `/telegram/webhook` and `/auth/telegram`. On the laptop the dev bot runs by
  long polling against dev, so no webhook is needed to develop.
- `webhook` Lambda (secret token, chat allowlist) that puts each update on
  the `updates.fifo` queue, one lane per member, deduped by `update_id`, and
  the first `agent` Lambda reading it: onboarding, `/add`, `/update`,
  `Portfolio`, `/privacy`, `/pause`, `/resume`, `/help`.
- Queues from day one (MA-139, MA-140, `ARCHITECTURE.md` §21): replies
  through `outbox.fifo` and a `sender` Lambda that honours Telegram's limits;
  background jobs (document reads now, ingest and news as they arrive)
  through the `work` queue and a `worker` Lambda; retries with backoff,
  idempotent handlers, a dead-letter queue behind each with an alarm to the
  chat, and `scripts/redrive.sh` to replay.
- `docs` Lambda: factsheet PDF and screenshot extraction with Claude on
  the Anthropic API (structured outputs, citations, per-field confidence); the Confirm
  / Edit / Cancel card; nothing saved without Confirm.
- Plain-English transactions ("I put £200 into Balanced") via a strict
  `propose_change` tool and Confirm.
- Money in any currency (MA-156, `ARCHITECTURE.md` §4.7): every position
  keeps its currency from the Confirm card that added it; a parser in code
  reads £ $ € ₹, the codes, the words and lakh and crore; an amount in
  another currency than the holding's is never saved as it is, and the bot
  asks for the amount that arrived (the ECB-rate estimate joins in phase 2,
  with MA-44); the original amount, rate and source stay on the transaction.
- Guided flows with buttons for logging a transaction, adding a holding,
  updating a valuation and changing a setting: one question per message,
  the same message edited in place, fields already given skipped; the
  `ask_user` tool and the `PendingAction` row with a day's expiry.
- The audit log from day one: an `AuditEvent` row in the same transaction
  as every record change, hash-chained; `get_audit` and "what changed this
  week?" in the chat.
- Every file and image a member sends kept in S3 for good, before anything
  reads it, with a `Document` row and an audit row; every change made from a
  file names it (MA-148).
- Observability from the first Lambda: a `RunRecord` per run with model
  calls, tokens, cost and tool calls; Powertools Logger, Tracer and Metrics
  wired in the handler base; the error alarm per function to the chat.
- Portfolio card as a table (rich message or HTML), valued from the last
  user-supplied figures, with the Household / Me switch and, for the owner, a
  tab per member.
- The dev seed (MA-110): a synthetic household on Monzo-shaped funds (the
  names, ISINs and factsheets you supply, never your balances), with
  members, accounts, holdings, a year of transactions and valuations; one
  command wipes and reseeds dev, and it refuses to run against prod.
- The Claude meter and ceiling (MA-113, `ARCHITECTURE.md` §15.1): every
  model call costed from the API's usage counts into the cycle's
  `SpendMonth` row, in dollars with pounds beside them; `BudgetSettings`
  seeded at $160 in prod and $40 in dev (the plan's $200 credit), its steps,
  guards and shares all settings;
  no call past 100% of the ceiling, the card going out as its template; the
  guards per member (60%), per day (three times the daily average) and per
  run (eight model calls); a message to the owner at 70% and 100%. Needed
  here because the `docs` and `agent` Lambdas call Claude from this phase.
- The release pipeline (MA-107): a merge to `main` builds the Lambdas once,
  deploys dev and runs the smoke tests, then deploys prod after your approval
  behind each Lambda's `live` alias, rolling back on a failed smoke test. The
  nightly drift check follows (MA-108).

**Tests:** extraction against three real factsheets and three screenshots
(fixtures with expected JSON); webhook security; one member's messages in
order while two members run in parallel; a duplicate update ignored; a
failure retried and then dead-lettered with an alarm; a replayed old update
asking first; an expired Confirm refused; the invite flow (single
use, expiry, wrong household); the isolation rules; the Confirm state
machine; the guided flows (resume after a day, expiry, skipping fields
already given, two members mid-flow at once); the currency parser on every
form (£ $ € ₹, codes, words, lakh and crore) and a rupee amount against a
pound holding never saved as pounds; the custom-auth triggers
(valid, expired, tampered, replayed, a removed member) and a dev token
refused by prod; the meter costing recorded `usage` blocks to the cent, a
concurrent add, the 100% stop and each guard, and a cycle rolling over on the
renewal day; a property test that every
write produces exactly one audit row and the chain verifies; a `RunRecord`
on success and on failure; schema migration on a v0 item.

**Exit:** you and your wife are members from your own phones; each of you
has added holdings from the chat alone; each sees their own detail and the
household overview, and you see hers; a screenshot updates a member's
valuations and both views change; "what changed this week?" lists every
change either of you made, with who and when; each of you is a Cognito user
in prod; the dev bot runs from your laptop on seeded data; a merge reaches
prod only after your approval.

**Cost:** about £0.50 (a few Claude calls).

---

## Phase 2 — Prices and the engine

The maths, ported from the desk and extended.

- The `PriceSource` contract of `ARCHITECTURE.md` §5.1: one plugin per
  feed (`yfinance`, `twelvedata`, `eodhd`, `issuer_page`, `ft`, `proxy`,
  `screenshot`, `stale`), a registry that imports only the plugins in use,
  per-plugin identifiers on the instrument, and chains per kind set in
  `infra/<env>/terraform.tfvars` (and a `.env` for local). yfinance is the default
  chain head in every environment; the EODHD plugin ships with the others,
  switched on by putting it first in the chain and adding its key.
- Price source chain: yfinance (`0P…L` ids for the funds, tickers for ETFs),
  BlackRock product page, FT tearsheet; Twelve Data for the US lines; ECB FX;
  calendars. EODHD is not in the chain unless phase 2 shows the free sources
  missing or misreporting London closes.
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

## Phase 3 — Briefs, alerts, charts, technical mode

Claude starts writing on top of numbers that already work.

- Anthropic client with the key from SSM, model routing, caching, refusal
  fallback, number validator.
- Morning brief and evening wrap as cards; the Technical section on every
  card; `/technical` mode; glossary buttons.
- Charts: one house style; holding history with stance horizon shaded;
  portfolio curve; sent with the card.
- Alert tiers, cooldowns, weekly red budget, quiet hours, Haiku repeat
  filter; `I acted` and the decision log; dead man's switch and error alarms
  to the chat.
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

## Phase 4 — Chat, research cards, scenarios

You can ask anything about what you hold.

- The tool loop with strict tools, `tool_choice` always `auto`; `Ask`
  keyboard button.
- Chat memory (MA-115, `ARCHITECTURE.md` §8): every message a `ChatTurn` row
  kept ninety days and never edited; only the current conversation sent; a
  conversation ends after thirty minutes of silence unless a question is
  waiting; a new one starts from the cached fixed part (one-hour TTL) and
  Haiku's one-line notes on recent conversations; past about 50,000 tokens it
  starts afresh from a summary.
- Cards: `stance`, `holding-profile`, `overlap-review`, `fund-vs-benchmark`,
  `bear-vs-bull` (two calls and a judge), `scenario`.
- Anthropic's server-side `web_search` and `web_fetch`, results treated as
  untrusted text; `/why`.
- Natural-language preferences with Confirm.

**Tests:** each card against fixtures; scripted conversations on recorded
responses; the stored history replaying byte for byte; a conversation
closing at thirty minutes but not while a question waits;
`cache_read_input_tokens` above zero on the second message; the judge never
overrides the cascade's action; search results
containing instructions are not acted on.

**Exit:** ten real questions answered with sources; the overlap review on
your two funds shows the shared holdings and currency exposure.

**Cost:** about £9 a month cumulative.

---

## Phase 5 — The web app: dashboard, audit log, activity (read-only, behind login)

One static app in `web/`, opened as a Mini App from the chat and in a laptop
browser, as `ARCHITECTURE.md` §9.3.

- Built from the one design spec in `docs/design/dashboard/`: the Mini App
  boards (the five phone artboards: Overview, a holding, Overlap, Scorecard,
  the light theme) and the browser boards (the same pages in two columns at
  laptop width, and the login page), as `docs/design/README.md` describes;
  the MyPaisa DS v1 "Warm ledger" look (MA-101), lightweight-charts.
- Two new pages: **Audit** (the §4.6 log, filtered by member, record and
  date, before and after, a link to the run, and the file behind a change
  opened through a five-minute link, with a Files view, MA-149) and **Activity** (the §10 runs
  with their model calls, tokens, cost, tools and outcome; the schedule
  board with last and next run and price freshness; this month's spend
  against the ceiling and the step it is on; the last seven days of alarms).
- The Admin center's **Spend** section (MA-116), designed first like every
  screen: this cycle's spend by member, feature, agent and model against the
  ceiling, the step and the days left; the owner sets the ceiling (from $10
  to the hard limit), the member share, the renewal day and the hard limit,
  each behind the fresh check (MA-102), each an audit row and a message to
  the owner; a ceiling that takes prod and dev together past the plan's credit
  warns that the extra needs a card and needs an explicit yes, and one
  above the hard limit is refused with the steps to raise the Console limit
  first.
- **Caps and alerts** (MA-137, `ARCHITECTURE.md` §15.2), in the same
  section: the Claude ladder's steps and guards; the AWS and others cap (£50),
  its steps (50%, 80%, 100%, forecast) and actions (dev pauses first; the
  brief, alerts and chat never stop), metered daily from Cost Explorer; the
  AWS Budgets backstop at £75 in Terraform; one alert router to the web app's
  Alerts page, the admin's Telegram chat and email through SNS (1,000 a month
  free), with quiet hours, cooldowns and a digest; "failed work" alerts from
  the dead-letter queues carry a [Replay] button (§21, MA-145).
- The `api` Lambda behind `api(-dev).mypaisapp.com`: GET routes only for
  the household's data, plus the Admin center's owner-only admin actions,
  each behind a fresh check (`ARCHITECTURE.md` §9.3): the security actions
  (MA-102), the ceiling and caps with their alert routing (MA-116, MA-137)
  and replaying failed work (MA-145) in this phase; deciding agents' requests,
  rolling a setting back and closing an incident (MA-130, MA-135) join in
  phase 12; sign-in through the Cognito pool built in
  phase 1 (Telegram, Google, passkey); the `HttpOnly`, `SameSite=Strict`
  session cookie with five-minute access tokens behind it; session, status,
  epoch and role checked on every call; CORS for that environment's console
  only; JSON limited to what that member may see.
- Linking a Google account: the six-digit code shown on the web, `/link
  <code>` in the chat from the member's own phone, `google_sub` and
  `google_email` on the Member; link and unlink from `/members` for the
  owner; every link, unlink and web login an audit row.
- Hosting in Terraform: the app's S3 bucket and CloudFront distribution per
  environment at `console-dev.mypaisapp.com` and `console.mypaisapp.com`,
  with their records in the existing zone and the existing wildcard
  certificate; security headers. The shell is public and holds no data.
- `web_app` button on the Portfolio card; a `/web` command that sends the
  laptop address.
- You: `/setdomain` in BotFather for the Login Widget, the dev bot with
  `console-dev.mypaisapp.com` and the household's bot with
  `console.mypaisapp.com`; two-step verification on each member's Telegram
  and Google accounts. The Google clients exist from phase 0.

**Tests:** sign-in by each door (a Google account linked to nobody, a
member of another household, a removed member, a paused member); the link
code (right code, wrong code, expired, used twice, sent from the wrong
chat); the cookie (missing, expired, from the other environment, after sign
out everywhere); CORS from another origin; every route against each role; JSON shape; the Audit page showing a change made in
the chat within a minute; Playwright screenshots at phone and laptop widths
in both themes.

**Exit:** you open `console.mypaisapp.com` on your laptop, log in with
Telegram, then Google, then a passkey, and see the same numbers as the chat
each way; the Audit page shows the change you just made from the
chat, with who and when; the Activity page shows the run that made it, with
what it cost; your wife sees her own view from her phone; a removed member
cannot get in.

**Cost:** £0.

---

## Phase 6 — Track record and calibration

- Forecast grader (range coverage, `P(fall>5%)` calibration).
- Stance grader: outcome at horizon, return vs doing nothing, by state
  bucket and confidence bucket; Brier score; reliability table.
- Confidence v1 with the history term; the 8-week recalibration rule with a
  logged change.
- `get_scorecard`, `/scorecard`; the Saturday review on Opus with the
  reflection step over the last four weeks.

**Tests:** grader on synthetic histories; calibration maths on hand-computed
cases; recalibration only after 8 weeks of evidence.

**Exit:** four Saturday reviews delivered; the reliability table shows
whether 70% means 70%.

**Cost:** about £12 a month cumulative.

---

## Phase 7 — News, events, sentiment (shadow)

- `news` and `score` Lambdas, event calendar, sentiment index, one line in
  the brief, `get_events` and `get_sentiment` tools.
- Sentiment tilt in the cascade, one notch, only when price pillars agree.

**Exit:** three weeks of indices; 30 scored articles spot-checked.

**Cost:** about £17 a month cumulative (£37 with EODHD).

---

## Phase 8 — Stances go live

- The go-live gate: 8 consecutive weeks above baseline, checked in code,
  reported every Saturday.
- Stance chips on the Portfolio card and in the brief; `/calls`.
- Guardrail review: no "sell everything" path exists; protected positions
  filtered; top-up suggestions capped by your preference.

**Exit:** the gate passes, or the review says why it has not and stances stay
in the Saturday review.

**Cost:** about £20 a month cumulative (£40 with EODHD).

---

## Phase 9 — MyPaisa: the whole wealth tracker on this backend (later, not a priority)

The web app becomes the household's wealth tracker, as `ARCHITECTURE.md`
§12: assets of every kind, debts, budget, forecast with XIRR, reports, in
GBP or INR; read-only; every update through the bot. The current
wealth-tracker repository is the screen reference. In order, each step
shipping read-only pages over data the bot already maintains:

1. **Kinds and flows.** The `property`, `deposit`, `policy`, `pension` and
   `debt` kinds with their profiles; `Liability`; INR in the FX chain; the
   guided flows for adding a property, a deposit, a policy, a pension and a
   loan, logging rent, interest, a maturity, an EMI, a prepayment, a rate
   change and a preclosure; valuation reminders when a figure is overdue;
   maturity announcements.
2. **History import.** The Excel importer (MA-111, `ARCHITECTURE.md`
   §18.5): one versioned template sent to the bot, a dry run, Confirm with
   the second check, batch writes with audit rows, a fingerprint so a file
   sent twice adds nothing, and rollback by import id. Tested on dev's
   synthetic data first, then used to hydrate prod with the past
   investments XIRR needs, after the tracker's data is mapped (MA-105).
3. **Wealth maths.** The `wealth/` module of §6.6: XIRR against spreadsheet
   fixtures to the penny, deposit accrual, the loan schedule and interest
   split, the daily `NetWorth` series, the maturity timeline.
4. **Screens, redesigned.** Overview, Assets and one asset, Debts and one
   loan, on the web app and in the Mini App, from a new design in the
   MyPaisa DS v1 system; the Portfolio card grows into the overview.
5. **Forecast and budget.** `ForecastAssumptions` and `Budget` with their
   flows ("assume 5% on property", "my salary is now …"); the thirty-year
   projection; the Budget and Forecast screens.
6. **Reports, exports, retirement.** Composition by type and institution,
   exports as GET routes; the zone moves from the old tracker's Terraform to
   this repository's and the apex `mypaisapp.com` redirects to the console
   (MA-97).
7. **Any question about the money (MA-104, `ARCHITECTURE.md` §12.1).** A
   nightly export of the household's ledger to Parquet in S3, and a
   `query_ledger_sql` tool that runs read-only DuckDB over that household's
   files only, for questions the structured `query_ledger` tool (MA-62)
   cannot express; the figures come from the result, and the SQL is shown
   under Technical; designed first.

**Tests:** XIRR, schedule and projection fixtures with known answers; the
importer (a wrong template version, a bad row, the same file twice, a
rollback); every
new flow's Confirm path and audit row; the viewer's masked figures; the
INR and GBP views of the same household agreeing to the penny at the day's
rate.

**Exit:** the household's whole wealth is on the new app, every figure was
entered through the bot, and the old tracker can be switched off.

**Cost:** about £1 a month more in Claude for the extra flows; nothing in
AWS.

---

## Phase 10 — New kinds of holding (when you add one)

Adding an iShares ETF from Monzo's "Build your own" range or, later, a share:

- The `/add` path already handles it (ISIN and ticker from the factsheet).
- A price source for the listing (EODHD or yfinance), already in the chain.
- For a share: the `valuation-snapshot` and `earnings-analysis` cards and a
  fundamentals source that covers the LSE; £59.99 a month more (£49.99 paid
  yearly) if EODHD Fundamentals is used. Decide then, not now.

---

## Phase 11 — The Forecaster: a second engine beside the rules engine (later)

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
- **F6, the side-by-side view (MA-124).** Designed first: the Telegram card
  beside the rules engine's call, with disagreement flagged, and a Forecast
  page per holding in the web app; shown for a holding only after 8 live
  weeks beating the base rate and the rules engine, in the Saturday review
  until then.
- **F7, risk-steered money (MA-125).** Contributions continue, tilted away
  from stressed holdings, with a trend filter, rebalancing bands and a
  drawdown budget the owner sets; shown as the suggested split on the
  first-of-the-month prompt.

**Order.** F1 and F2 can start any time after phase 2, and F2 tests the rules
engine early. F3 and F4 next (F4 needs phase 7's news), then F5; F6 needs
phases 5 and 6; F7 needs F2 and F3.

**Tests:** no feature used before the date it was known; a strategy that peeks
at tomorrow caught by the lab; walk-forward folds with a gap and the last two
years held out; calibration curves; a known-answer backtest to the penny; the
event study against a hand-worked example; the switch-off; the card and the
page from fixtures, with Playwright screenshots.

**Exit:** over ten years of walk-forward tests and 8 live weeks, the risk
forecasts beat the base rate; the steered contributions cut the worst fall and
the time underwater against buy-and-hold, within the growth trade-off you
set; both engines' views and records sit side by side in Telegram and the web
app.

**Cost:** the data is free apart from EODHD Historian, £19.99 a month; compute
a few dollars a month; Haiku filing the news under a dollar, inside the
Claude ceiling.

---

## Phase 12 — The agent team: configured, approved, self-healing, self-learning (later)

The bot becomes a small team of agents with narrow jobs, every behaviour a
setting the admin controls, every change outside a setting's band the
admin's approval in Telegram or the web, every prediction graded daily, and
repairs made where they are safe, as `ARCHITECTURE.md` §20. Epic MA-127. For
one household and its one admin, the owner.

- **E1, settings (MA-129).** Every behaviour a versioned `Setting` with a
  schema, a range, an automatic band and an approval rule; defaults in
  `config/defaults.yaml`; one settings service; a minute's cache; a daily
  snapshot to S3.
- **E2, the admin desk (MA-130).** Agents' requests and questions, and
  the admin's instructions, in the admin's Telegram chat and the Admin center
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

**Order.** E1 and E2 can come forward once the web app and the second check
exist (phase 5, MA-102); E3 after phase 2; E4 and E5 once stances are graded
(phase 6); E6 with the Forecaster (phase 11); E7 and E8 alongside.

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

## Phase 13 — Indian markets and the existing Indian portfolio (later)

`ARCHITECTURE.md` §22, epic MA-147. Indian mutual funds, NSE and BSE shares
and ETFs beside the UK holdings, free sources first, and the household's
existing Indian portfolio loaded once with its whole history.

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
  phase 11.

**Tests:** synthetic CAS statements and broker exports import exactly once;
an unmatched ISIN is listed, not guessed; each Indian chain falls through to
stale; INR and GBP views agree with the FX of the day; golden tests for the
India basket.

**Exit:** a member sends their CAS and broker export, taps Confirm once, and
the Indian holdings with their history appear in the brief and the web app
in INR and GBP, with the files they came from open from the Audit page.

**Cost:** £0 on the free path; a paid feed only on the admin's approval.

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

---

## Timeline (indicative)

| Phase | Effort | Calendar |
| --- | --- | --- |
| 0 Prerequisites | 1 day, half of it yours | Week 1 |
| 1 Registry, ingestion, identity, both environments | 7 days | Weeks 1–3 |
| 2 Prices and engine | 5 days | Weeks 2–3 |
| 3 Briefs, alerts, charts, technical mode | 3 days | Week 4 |
| 4 Chat, cards, scenarios | 4 days | Weeks 5–6 |
| 5 Web app: dashboard, audit, activity | 5 days | Weeks 7–8 |
| 6 Track record | 2 days, then runs on its own | Week 8 |
| 7 News and sentiment | 3 days | Week 9 |
| 8 Stances live | after 8 weeks of shadow | Week 17+ |
| 9 MyPaisa: assets, debts, budget, forecast | 4–6 weeks | After phase 8, when wanted |
| 10 New kinds of holding | a day or two each | When a new kind is added |
| 11 The Forecaster | 8–12 weeks | F1 and F2 any time after phase 2; the rest after phase 7, when wanted |
| 12 The agent team | 6–8 weeks | E1 and E2 after phase 5; the rest with phases 6 and 11, when wanted |
| 13 Indian markets and the Indian portfolio | 3–4 weeks | IN1 after phase 2; IN2 after phase 1's importer; IN4's forecasts with phase 11, when wanted |

---

## Definition of done (every change)

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest --cov --cov-fail-under=90
terraform fmt -check -recursive infra
for env in dev prod; do terraform -chdir=infra/$env validate; done
tflint --recursive
```

Plus: golden tests for any engine change; a card change ships with both its
simple and technical rendering; no secret anywhere; cost stated when a paid
API is touched; every new write path produces its audit row and every new
handler writes its `RunRecord`, both covered by tests.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| No reliable daily NAV source for the Monzo funds | Four-deep source chain; proxy basket; the screenshot path always works |
| Factsheet extraction misreads a figure | Per-field confidence, citations, amber fields, Confirm before save |
| The ported engine drifts from the original | Golden tests from the desk's own self-tests |
| A holder's cascade that is too eager to ADD | PAUSE on exhaustion or elevated risk; top-ups capped; shadow mode first |
| Confidence numbers that are not calibrated | Weekly reliability table; recalibration rule; "no clear view" below 55% |
| Rich messages behave differently than the write-ups say | HTML fallback on day one |
| Alert fatigue | Weekly red budget, cooldowns, repeat filter |
| An agent changes something it should not | One settings service enforcing schema, range and band; approval with the second check for anything outside the band; every change a version and an audit row; secrets and infrastructure out of agents' reach |
| Self-tuning chases noise | Calibration moves at most two points a day with a probation and rollback; rules and models change only on weeks of evidence and the admin's approval |
| Too many requests for the admin | Automatic bands for safe changes, a daily digest, incidents only when urgent, rejected requests not repeated within their period |
| A Forecaster model that learned the past by heart | Walk-forward tests with a gap, the last two years held out, calibration checks, 8 live weeks before it is shown, and a switch-off when its record slips |
| Look-ahead: a backtest that saw the future | Every row stamped with the date it was known; the lab refuses a strategy that peeks at tomorrow |
| Two engines disagreeing confuses the household | Both shown side by side with their track records; the disagreement is said out loud; the rules engine stays the default |
| A message or a job is lost when something fails | Every hand-off through an SQS queue with retries and backoff; idempotent handlers; a dead-letter queue behind each with an alarm, a copy in S3, and replay by script, button or the ops warden |
| Cost overrun | The Claude ceiling's ladder steps down at 85% and 95% and stops at 100%; guards per member, per day and per run; the Console workspace limit as the hard backstop; AWS Budgets for AWS; `/pause` |
| Prompt injection via news or a PDF | Untrusted text marked; no dangerous tools exist; Confirm on every write |
| A session cookie stolen from a laptop | `HttpOnly`, `Secure`, `SameSite=Strict`, five-minute access tokens behind it; the data routes are read-only; status and epoch re-checked on every call; the owner signs the member out everywhere or pauses them (MA-102) |
| A change meant for dev reaches prod | Separate state per environment; the developer role denied on `env=prod`; prod applied only by CI after your approval; the nightly drift check |
| An import writes bad history into prod | Dry run first; fingerprints stop duplicates; Confirm with the second check; rollback by import id; tested on dev first |
| Observability that costs more than the app | Ten metrics, one dashboard, sampled traces, fourteen-day logs, `RunRecord` rows that expire after ninety days |
| OIDC trust mismatch on first deploy | Pin this repository's ids; read CloudTrail |
