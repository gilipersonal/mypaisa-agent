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
| Create the bot with BotFather; token into SSM; picture with `/setuserpic` from `docs/mark-1024.png` | You |
| Create an Anthropic API key in the Console with a monthly spend limit (£35); put it into SSM at `/mypaisa-agent/dev/anthropic/api_key` | You |
| Export the factsheet (PDF) and a valuation screenshot for each Monzo fund from the app, ready to send to the bot | You |
| Decide: EODHD now or free sources first | You |
| Twelve Data API key (free tier) into SSM; check whether its Basic plan serves LSE and Xetra closes | You |
| Terraform bootstrap: state key, OIDC role pinned to this repository's numeric id, `dev` GitHub environment, AWS Budgets at £40 and £50 | Claude |
| `CLAUDE.md` with the working rules; the repository skeleton (uv, ruff, pyright, pytest, pre-commit) | Claude |

**Exit:** `terraform plan` runs clean from CI through OIDC; the budget
exists; model access is granted; the bot token is in SSM.

**Cost:** £0.

---

## Phase 1 — Registry and Telegram ingestion

What you hold, recorded through the chat, with no analysis yet.

- Registry entities (Portfolio, Member, Invite, Account, Instrument,
  Position, Valuation, Document, Transaction) with `schema_version`; every
  item keyed by the household; a seed command for the first holding.
- Identity: the first person to open the chat becomes the household's
  owner; `/invite` makes a one-time deep link; `/members` lists and removes;
  the webhook resolves `from.id` to a member and ignores everyone else.
  Isolation tests: a member cannot read another household, nor another
  member's detail unless shared.
- Accounts per member (ISA, GIA, SIPP, cash; joint accounts with two
  owners); every holding added lands in the adding member's account.
- Telegram client: `sendMessage` (HTML), rich messages with fallback,
  `sendPhoto`, `editMessageText`, `getFile`, `setMyCommands`, reply keyboard,
  menu button, callback queries.
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

**Tests:** extraction against three real factsheets and three screenshots
(fixtures with expected JSON); webhook security; the invite flow (single
use, expiry, wrong household); the isolation rules; the Confirm state
machine; the guided flows (resume after a day, expiry, skipping fields
already given, two members mid-flow at once); a property test that every
write produces exactly one audit row and the chain verifies; a `RunRecord`
on success and on failure; schema migration on a v0 item.

**Exit:** you and your wife are members from your own phones; each of you
has added holdings from the chat alone; each sees their own detail and the
household overview, and you see hers; a screenshot updates a member's
valuations and both views change; "what changed this week?" lists every
change either of you made, with who and when.

**Cost:** about £0.50 (a few Claude calls).

---

## Phase 2 — Prices and the engine

The maths, ported from the desk and extended.

- Price source chain: yfinance (`0P…L` ids for the funds, tickers for ETFs),
  BlackRock product page, FT tearsheet, EODHD if chosen; ECB FX; calendars.
  Verify which source actually serves the Monzo funds' NAV, and record the
  answer in `docs/RESEARCH.md`.
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

**Tests:** golden files for every indicator and pillar; property test that
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

**Tests:** validator catches an invented number; alert state machine with
frozen time; card rendering from recorded Claude responses; chart snapshot
tests.

**Exit:** two weeks of briefs; no alert fires twice in its cooldown; a
layman reads the top of a card and understands it without the bottom.

**Cost:** about £5 a month.

---

## Phase 4 — Chat, research cards, scenarios

You can ask anything about what you hold.

- The tool loop with strict tools; chat memory; `Ask` keyboard button.
- Cards: `stance`, `holding-profile`, `overlap-review`, `fund-vs-benchmark`,
  `bear-vs-bull` (two calls and a judge), `scenario`.
- Anthropic's server-side `web_search` and `web_fetch`, results treated as
  untrusted text; `/why`.
- Natural-language preferences with Confirm.

**Tests:** each card against fixtures; scripted conversations on recorded
responses; the judge never overrides the cascade's action; search results
containing instructions are not acted on.

**Exit:** ten real questions answered with sources; the overlap review on
your two funds shows the shared holdings and currency exposure.

**Cost:** about £9 a month cumulative.

---

## Phase 5 — The web app: dashboard, audit log, activity (read-only, behind login)

One static app in `web/`, opened as a Mini App from the chat and in a laptop
browser, as `ARCHITECTURE.md` §9.3.

- Built from the five artboards in `docs/design/dashboard/` (Overview, a
  holding, Overlap, Scorecard, the light theme), with a two-column layout at
  laptop width; the Nocturne look, lightweight-charts.
- Two new pages: **Audit** (the §4.6 log, filtered by member, record and
  date, before and after, a link to the run) and **Activity** (the §10 runs
  with their model calls, tokens, cost, tools and outcome; the schedule
  board with last and next run and price freshness; this month's spend
  against the cap; the last seven days of alarms).
- The `api` Lambda: GET routes only, plus the login endpoints; `initData`
  validation, Telegram Login Widget verification and Google ID token
  verification (signature against Google's keys, audience, expiry, verified
  address, member found by `sub`); the signed session cookie; membership
  and role checked on every call; JSON limited to what that member may see.
- Linking a Google account: the six-digit code shown on the web, `/link
  <code>` in the chat from the member's own phone, `google_sub` and
  `google_email` on the Member; link and unlink from `/members` for the
  owner; every link, unlink and web login an audit row.
- Hosting in Terraform: the app's S3 bucket and CloudFront distribution per
  environment; the api Lambda's Function URL (IAM auth) as the `/api/*`
  origin through CloudFront; the CloudFront Function that checks the cookie
  at the edge, with the signing secret in KeyValueStore put there by a
  command; security headers.
- `web_app` button on the Portfolio card; a `/web` command that sends the
  laptop address.
- You: `/setdomain` in BotFather with the app's hostname, once per
  environment; a Google OAuth client id in the Google Cloud Console, the id
  into SSM; two-step verification on each member's Telegram and Google
  accounts. Any Gmail account can own the Google Cloud project, no billing
  account is needed, and the project has no link to AWS. The consent screen
  is "External" (a personal Gmail cannot choose "Internal"), with only the
  basic email and profile scopes, so it can be published without Google's
  review; in "Testing" only listed test users can sign in, which also works
  for one person. The client is a "Web application" whose authorised
  JavaScript origins are the dev and prod hostnames and `http://localhost:8000`;
  one client with all three origins is enough. The id is public, not a secret;
  the flow used has no client secret at all.

**Tests:** `initData`, Login Widget and Google ID token verification
(valid, expired, tampered, wrong audience, unverified address, a Google
account linked to nobody, a member of another household, a removed member);
the link code (right code, wrong code, expired, used twice, sent from the
wrong chat); the cookie check
in the CloudFront Function through `aws cloudfront test-function`; every
route against each role; JSON shape; the Audit page showing a change made in
the chat within a minute; Playwright screenshots at phone and laptop widths
in both themes.

**Exit:** you open it on your laptop, log in with Telegram and then with
Google, and see the same numbers as the chat either way; the Audit page shows the change you just made from the
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

## Phase 9 — Wealth tracker integration (later, not a priority)

- Read-only role for the tracker's backend over Position and Valuation.
- Cognito for the tracker's own login (email, passkey, Google, MFA); a
  one-time code sent to the bot links a Cognito user to a member.
- Mapping to the tracker's `Holding` shape, with `owners` from the account's
  members; the tracker shows the bot's values.

**Exit:** one set of numbers in both places, and the same people.

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
| 0 Prerequisites | half a day, mostly yours | Week 1 |
| 1 Registry and ingestion | 4 days | Weeks 1–2 |
| 2 Prices and engine | 5 days | Weeks 2–3 |
| 3 Briefs, alerts, charts, technical mode | 3 days | Week 4 |
| 4 Chat, cards, scenarios | 4 days | Weeks 5–6 |
| 5 Web app: dashboard, audit, activity | 5 days | Weeks 7–8 |
| 6 Track record | 2 days, then runs on its own | Week 8 |
| 7 News and sentiment | 3 days | Week 9 |
| 8 Stances live | after 8 weeks of shadow | Week 17+ |
| 9 Tracker integration | 1–2 days | When wanted |

---

## Definition of done (every change)

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest --cov --cov-fail-under=90
cd infra/terraform && terraform fmt -check && terraform validate
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
| Cost overrun | Budgets alert and stop; daily token ceiling; `/pause` |
| Prompt injection via news or a PDF | Untrusted text marked; no dangerous tools exist; Confirm on every write |
| A session cookie stolen from a laptop | Signed, `HttpOnly`, `Secure`, thirty-day expiry; the API is read-only; membership re-checked on every call; the owner removes a member or rotates the secret |
| Observability that costs more than the app | Ten metrics, one dashboard, sampled traces, fourteen-day logs, `RunRecord` rows that expire after ninety days |
| OIDC trust mismatch on first deploy | Pin this repository's ids; read CloudTrail |
