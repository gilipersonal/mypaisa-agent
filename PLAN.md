# MyPaisa Agent — Build Plan (v2)

How the hybrid in `ARCHITECTURE.md` gets built, in phases that each end with
something you can see in Telegram and a test suite that proves it. v2 moves
the holdings registry and the Telegram ingestion to the front, because the
first thing you will do is feed the bot your Monzo funds, and adds the engine
port, the research cards, the Mini App and the confidence calibration.

Status: planning. Nothing is built.

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
| Link a Claude Console organisation to your Max or Team plan (claude.ai Settings → Billing → API credits; 7 days on the plan first; the link cannot be moved later without support). In that organisation make two workspaces, `mypaisa-prod` and `mypaisa-dev`, with spend limits of $100 and $10 (prod's is the hard limit behind the Claude ceiling, `ARCHITECTURE.md` §15.1), and one API key in each; put each key into its own environment's SSM path, `/mypaisa-agent/dev/anthropic/api_key` and `/mypaisa-agent/prod/anthropic/api_key`. The plan's monthly API credit ($100 on Max 5x) then pays for every model call; it covers the Messages API and Batches, not Claude Code, and expires each cycle without rolling over | You |
| Export the factsheet (PDF) and a valuation screenshot for each Monzo fund from the app, ready to send to the bot | You |
| Data feed: decided, free sources first. yfinance (Yahoo Finance, unofficial, no key) for the LSE and Xetra closes and the funds' `0P…L` NAV, Twelve Data's free tier for the US lines and FX fallback, the issuer pages, FT and the screenshot behind them. EODHD waits for phase 2 and is taken only if the London closes prove unreliable in the first weeks | Decided |
| Twelve Data API key (free tier) into SSM at `/mypaisa-agent/dev/twelvedata/api_key` and `/mypaisa-agent/prod/twelvedata/api_key`. It is in every chain from day one: first for the US lines, the US macro basket, the earnings calendar and the FX fallback; second, behind yfinance, for London and Frankfurt closes. The source-comparison report shows whether the free tier serves those exchanges; nothing to check by hand | You |
| Terraform bootstrap (MA-26): `infra/modules/mypaisa` with the two roots `infra/dev` and `infra/prod`, each with its own state key in the existing state bucket; `infra/bootstrap`, applied once from the laptop, with the account's GitHub OIDC provider reused and three roles pinned to this repository's numeric id (`ci-plan`, `ci-dev-deploy`, `ci-prod-deploy`); `dev` and `prod` GitHub environments, prod needing your approval; the developer role with its explicit deny on `env=prod`; the zone and the certificate looked up by name (`ARCHITECTURE.md` §18.2); AWS Budgets at £40 and £50 | Claude |
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
- `webhook` Lambda (secret token, chat allowlist, dedupe, async hand-off) and
  the first `agent` Lambda: onboarding, `/add`, `/update`, `Portfolio`,
  `/privacy`, `/pause`, `/resume`, `/help`.
- `docs` Lambda: factsheet PDF and screenshot extraction with Claude on
  the Anthropic API (structured outputs, citations, per-field confidence); the Confirm
  / Edit / Cancel card; nothing saved without Confirm.
- Plain-English transactions ("I put £200 into Balanced") via a strict
  `propose_change` tool and Confirm.
- Guided flows with buttons for logging a transaction, adding a holding,
  updating a valuation and changing a setting: one question per message,
  the same message edited in place, fields already given skipped; the
  `ask_user` tool and the `PendingAction` row with a day's expiry.
- The audit log from day one: an `AuditEvent` row in the same transaction
  as every record change, hash-chained; `get_audit` and "what changed this
  week?" in the chat.
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
  `SpendMonth` row; `BudgetSettings` seeded at $100 in prod and $10 in dev;
  no call past 100% of the ceiling, the card going out as its template; the
  guards per member (60%), per day (three times the daily average) and per
  run (eight model calls); a message to the owner at 70% and 100%. Needed
  here because the `docs` and `agent` Lambdas call Claude from this phase.
- The release pipeline (MA-107): a merge to `main` builds the Lambdas once,
  deploys dev and runs the smoke tests, then deploys prod after your approval
  behind each Lambda's `live` alias, rolling back on a failed smoke test. The
  nightly drift check follows (MA-108).

**Tests:** extraction against three real factsheets and three screenshots
(fixtures with expected JSON); webhook security; the invite flow (single
use, expiry, wrong household); the isolation rules; the Confirm state
machine; the guided flows (resume after a day, expiry, skipping fields
already given, two members mid-flow at once); the custom-auth triggers
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

**Cost:** £0.10 (£16 more with EODHD).

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
  date, before and after, a link to the run) and **Activity** (the §10 runs
  with their model calls, tokens, cost, tools and outcome; the schedule
  board with last and next run and price freshness; this month's spend
  against the ceiling and the step it is on; the last seven days of alarms).
- The Admin center's **Spend** section (MA-116), designed first like every
  screen: this cycle's spend by member, feature and model against the
  ceiling, the step and the days left; the owner sets the ceiling (from $10
  to the hard limit), the member share, the renewal day and the hard limit,
  each behind the fresh check (MA-102), each an audit row and a message to
  the owner; a ceiling above the hard limit is refused with the steps to
  raise the Console limit first.
- The `api` Lambda behind `api(-dev).mypaisapp.com`: GET routes only for
  the household's data, plus the Admin center's owner-only security actions
  behind a fresh check (MA-102); sign-in through the Cognito pool built in
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

**Cost:** about £17 a month cumulative (£33 with EODHD).

---

## Phase 8 — Stances go live

- The go-live gate: 8 consecutive weeks above baseline, checked in code,
  reported every Saturday.
- Stance chips on the Portfolio card and in the brief; `/calls`.
- Guardrail review: no "sell everything" path exists; protected positions
  filtered; top-up suggestions capped by your preference.

**Exit:** the gate passes, or the review says why it has not and stances stay
in the Saturday review.

**Cost:** about £20 a month cumulative (£36 with EODHD).

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
  fundamentals source that covers the LSE; about £46 a month more if EODHD
  Fundamentals is used. Decide then, not now.

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
| Cost overrun | The Claude ceiling's ladder steps down at 85% and 95% and stops at 100%; guards per member, per day and per run; the Console workspace limit as the hard backstop; AWS Budgets for AWS; `/pause` |
| Prompt injection via news or a PDF | Untrusted text marked; no dangerous tools exist; Confirm on every write |
| A session cookie stolen from a laptop | `HttpOnly`, `Secure`, `SameSite=Strict`, five-minute access tokens behind it; the data routes are read-only; status and epoch re-checked on every call; the owner signs the member out everywhere or pauses them (MA-102) |
| A change meant for dev reaches prod | Separate state per environment; the developer role denied on `env=prod`; prod applied only by CI after your approval; the nightly drift check |
| An import writes bad history into prod | Dry run first; fingerprints stop duplicates; Confirm with the second check; rollback by import id; tested on dev first |
| Observability that costs more than the app | Ten metrics, one dashboard, sampled traces, fourteen-day logs, `RunRecord` rows that expire after ninety days |
| OIDC trust mismatch on first deploy | Pin this repository's ids; read CloudTrail |
