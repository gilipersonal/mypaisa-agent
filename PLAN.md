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
| Request Bedrock model access for Opus 5.5, Sonnet 5.5, Haiku 5.5 in `us-east-1` | You |
| Export the factsheet (PDF) and a valuation screenshot for each Monzo fund from the app, ready to send to the bot | You |
| Decide: EODHD now or free sources first | You |
| Twelve Data API key (free tier) into SSM; check whether its Basic plan serves LSE and Xetra closes | You |
| Brave Search API key (free tier) into SSM | You |
| Terraform bootstrap: state key, OIDC role pinned to this repository's numeric id, `dev` GitHub environment, AWS Budgets at £40 and £50 | Claude |
| `CLAUDE.md` with the working rules; the repository skeleton (uv, ruff, pyright, pytest, pre-commit) | Claude |

**Exit:** `terraform plan` runs clean from CI through OIDC; the budget
exists; model access is granted; the bot token is in SSM.

**Cost:** £0.

---

## Phase 1 — Registry and Telegram ingestion

What you hold, recorded through the chat, with no analysis yet.

- Registry entities (Instrument, Position, Valuation, Document, Transaction,
  Preferences) with `schema_version`; a seed command for the first holding.
- Telegram client: `sendMessage` (HTML), rich messages with fallback,
  `sendPhoto`, `editMessageText`, `getFile`, `setMyCommands`, reply keyboard,
  menu button, callback queries.
- `webhook` Lambda (secret token, chat allowlist, dedupe, async hand-off) and
  the first `agent` Lambda: onboarding, `/add`, `/update`, `Portfolio`,
  `/privacy`, `/pause`, `/resume`, `/help`.
- `docs` Lambda: factsheet PDF and screenshot extraction with Claude on
  Bedrock (structured outputs, citations, per-field confidence); the Confirm
  / Edit / Cancel card; nothing saved without Confirm.
- Plain-English transactions ("I put £200 into Balanced") via a strict
  `propose_change` tool and Confirm.
- Portfolio card as a table (rich message or HTML), valued from the last
  user-supplied figures.

**Tests:** extraction against three real factsheets and three screenshots
(fixtures with expected JSON); webhook security; the Confirm state machine;
schema migration on a v0 item.

**Exit:** both Monzo funds and your cash pot are in the registry from the
chat alone; a screenshot updates the valuations and the card shows the
change.

**Cost:** about £0.50 (a few Bedrock calls).

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

- Bedrock client, model routing, caching, refusal fallback, number validator.
- Morning brief and evening wrap as cards; the Technical section on every
  card; `/technical` mode; glossary buttons.
- Charts: one house style; holding history with stance horizon shaded;
  portfolio curve; sent with the card.
- Alert tiers, cooldowns, weekly red budget, quiet hours, Haiku repeat
  filter; `I acted` and the decision log; dead man's switch and error alarms
  to the chat.

**Tests:** validator catches an invented number; alert state machine with
frozen time; card rendering from recorded Bedrock responses; chart snapshot
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
- `search_news` (Brave) and `fetch_page` as untrusted-text tools; `/why`.
- Natural-language preferences with Confirm.

**Tests:** each card against fixtures; scripted conversations on recorded
responses; the judge never overrides the cascade's action; search results
containing instructions are not acted on.

**Exit:** ten real questions answered with sources; the overlap review on
your two funds shows the shared holdings and currency exposure.

**Cost:** about £9 a month cumulative.

---

## Phase 5 — Mini App dashboard

- Built from the five artboards in `docs/design/dashboard/` (Overview, a
  holding, Overlap, Scorecard, the light theme).
- Static page on the wealth tracker's S3 + CloudFront under a new path, in
  the Nocturne look, with lightweight-charts: portfolio curve, per-holding
  history with stance markers, overlap map, scorecard.
- Function URL route that validates Telegram's `initData` (HMAC, max age)
  and serves read-only JSON.
- `web_app` button on the Portfolio card.

**Tests:** `initData` validation (valid, expired, tampered); JSON shape;
Playwright screenshot of the page in both themes.

**Exit:** the dashboard opens from the chat on your phone and shows the same
numbers as the cards.

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

## Phase 9 — Wealth tracker integration

- Read-only role for the tracker's backend over Position and Valuation.
- Mapping to the tracker's `Holding` shape; the tracker shows the bot's
  values.

**Exit:** one set of numbers in both places.

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
| 5 Mini App | 3 days | Week 7 |
| 6 Track record | 2 days, then runs on its own | Week 7 |
| 7 News and sentiment | 3 days | Week 8 |
| 8 Stances live | after 8 weeks of shadow | Week 16+ |
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
API is touched.

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
| OIDC trust mismatch on first deploy | Pin this repository's ids; read CloudTrail |
