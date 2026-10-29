# Research: what to borrow, what to leave

> **25 Oct 2026, MA-161.** The front end moved from a Telegram bot and its
> Mini App to two doors: one native SwiftUI app for iPhone and iPad, with the
> chat, signed in with Apple or Google (`docs/design/reviews/MA-161/decision.md`),
> and the read-only web app in a browser, a PWA for the dashboard and the
> Admin center.
> The Telegram findings below (§3.4, the Delivery row in §4, the Telegram
> sources) are kept as the record of what was learned on 23 Oct 2026; they no
> longer drive the design. The sentences that state the current plan now say
> the app.

Reverse engineering of the two references, plus a survey of what is possible
around them, done on 23 Oct 2026. `ARCHITECTURE.md` and `PLAN.md` are written
from this. Nothing here is built.

The two references answer different questions. **Agentic Trading Desk** is a
short-term *trading* desk: deterministic indicators, a scored decision cascade,
and an execution mandate with a hard guard. **Agent Toolbelt** is a *research*
API: live fundamentals turned into structured, LLM-written verdict cards.
MyPaisa Agent is neither a trader nor a public API; it is a long-term holder's
analyst, driven from a chat by a layman (a Telegram bot when this was
written; a native iOS app since MA-161). So it borrows the desk's discipline
(code computes, the model explains, limits are enforced outside the model) and
the toolbelt's card shapes (verdict, one-liner, evidence, data sources,
generated-at), and drops execution and the SaaS plumbing.

---

## 1. Agentic Trading Desk (Oft3r/agentic-trading-desk)

A Claude Code skill. Ruling principle, quoted: *"the AI fetches data and
interacts with the user; the scripts perform the deterministic calculations;
the user decides and approves execution."* About 1,600 lines in total, pure
Python stdlib, no network inside the maths.

### 1.1 The pieces

| File | What it does | Verdict for us |
| --- | --- | --- |
| `scripts/indicators.py` (270 lines) | EMA 20/50/200 (SMA seed), Wilder RSI-14, MACD 12/26/9 with histogram and its slope, TRIX-15 with EMA-9 signal, Bollinger 20/2 (population σ) with %B, slopes vs 5 bars ago, `bars_since_below_ema20`. Known-answer self-tests. | **Port**, as pandas with the same conventions and the same self-tests as golden files. Add ATR, realised volatility and its percentile, drawdown, 12-1 momentum, which a holder needs and a short-term desk does not. |
| `scripts/score.py` (410 lines) | Three pillars scored −2..+2: Trend (price vs EMA20, EMA20>50, EMA50>200, EMA200 slope), Momentum (RSI zones 45/55, MACD histogram sign, TRIX vs signal), Macro (injected). Flags: exhaustion, relentless-bearish, rebound, death-cross. A decision cascade that differs by `holding` true/false, producing EXIT / TRIM, EXIT, RE-ENTRY, TACTICAL REBOUND, HOLD (ride), HOLD (under review), WAIT, STAY OUT, OBSERVE. Adverse macro tightens framing but never changes the numbers. | **Port the pillars and flags; rewrite the cascade.** Its cycle is "enter on rebound, ride, exit on exhaustion": capital rotation for a trading account. A long-term ISA holder wants ADD / HOLD / PAUSE CONTRIBUTIONS / TRIM / REBALANCE with a horizon, and "exit" should be rare and heavily qualified. The pillar maths and the flag detectors carry over unchanged. |
| `scripts/macro_pillar.py` (374 lines) | Cross-asset regime from eight US ETFs: RSP/SPY (breadth), 10Y−2Y spread (injected, weight redistributed if missing), HYG/LQD (credit), IWM/SPY (size), SPY/TLT (equity vs bonds), XLY/XLP (sector rotation), rolling SPY-TLT correlation (inflationary flag). Weighted composite → regime (Inflationary, Contraction, Broadening, Concentration, Transitional) → pillar −2..+2, capped at −1 in risk-off regimes. | **Port, and add regional baskets.** The US basket stays as is. Add a UK basket (FTSE 100 vs FTSE 250 for size, gilts vs UK equities, sterling credit) and a Europe basket (Euro Stoxx vs small caps, Bunds vs equities), all from UCITS ETFs priced on the LSE and Xetra, and weight each instrument's macro pillar by its look-through regional exposure. |
| `scripts/prepare_inputs.py` (214 lines) | Drops `interpolated` bars, appends today's close from the broker's own timestamps (provisional during the session, final after the close), marks a symbol STALE and excludes it if its last bar is older than the previous close. | **Port the idea, not the Robinhood shape.** The same rules apply to EODHD or yfinance bars and, with a twist, to fund NAVs: a NAV is published the next day, so "today's bar" for a fund is the proxy basket, labelled provisional until the NAV lands. |
| `hooks/mandate-order-guard.sh` + `scripts/session-setup.sh` | A `PreToolUse` hook that denies any order the mandate forbids, outside the model, failing closed; 15 probes at session start prove the guard is alive. | **Borrow the principle, not the hook.** We place no orders, so there is nothing to guard at the broker. The same principle becomes: the call engine's limits (no "sell everything", top-ups capped, protected positions) are enforced in code the model cannot reach, and the system self-tests its maths on every run. |
| `SKILL.md` | The operations manual: guardrails first, the mandate, circuit breakers (down >4% on the day → no buys; data not reconciled → no trades), a self-audit of prior orders at every session start, external context (news, analyst consensus) as reinforcement that never alters a score. | **Borrow the structure** for the agent's system prompt and for `CLAUDE.md`: guardrails first, numbers from code only, external text as context only, circuit breakers on data quality. |

### 1.2 Decisions the desk got right that we keep

- **Indicators are never estimated by the model.** The model receives a
  scorecard JSON and writes words about it.
- **`holding` changes the cascade.** The same chart means different things
  to someone who owns it and someone who does not.
- **Macro is a separate, shared pillar** computed once per run and injected.
- **Partial data is labelled**, never silently scored (`partial: 2/4
  components`).
- **External context never alters the numbers.** News, analyst targets and
  the yield curve are shown next to the scorecard, not mixed into it.
- **Self-tests run every session**; a failing self-test means "do not trust
  the numbers today".

### 1.3 What we leave

- Execution, the mandate's dollar caps, order shapes and the hook. MyPaisa
  cannot trade and will not.
- The short-term rotation philosophy ("accumulating is not the default").
  For an ISA the default *is* accumulating.
- Robinhood-specific input handling and US-only macro.
- "No backtest" as a permanent state. We will not backtest a strategy
  either, but every call is paper-traded and graded, which the desk does not
  do.

---

## 2. Agent Toolbelt (agenttoolbelt.live, marras0914/agent-toolbelt)

A stock-research API for agents, served over REST, an npm SDK, LangChain
tools, an MCP server and GPT Actions. The public site was unreachable from
this environment (the proxy refused the host), so the findings come from the
open-source repository, which contains the docs page (`public/docs.html`) and
every tool's source.

### 2.1 What it offers

| Tool | Input | Output shape | Data behind it |
| --- | --- | --- | --- |
| `stock-thesis` | `ticker`, optional `timeHorizon` ("1-2 years" / "3-5 years" / "5+ years") | `verdict` bullish/neutral/bearish, `oneLiner`, `thesis`, `keyStrengths[]`, `keyRisks[]`, `valuationRead`, `insiderRead`, `watchFor`, `dataSnapshot`, `dataSources{fetchedAt, per-source success}`, `generatedAt` | Polygon (overview, previous close), FMP (profile, key metrics, ratios, income statement, earnings), Finnhub (metrics, recommendations, insiders) |
| `earnings-analysis` | `ticker` | `verdict` strong_compounder/consistent/mixed/volatile/deteriorating, `beatRate`, `revenueTrend`, reads, `rawData{quartersAnalyzed, beatsTotal, upcomingEarnings}` | FMP earnings, Finnhub calendar |
| `insider-signal` | `ticker` | `signal` strong_buy…strong_sell, `confidence` high/medium/low, pressures, `notableTrades[]`, `rawData` counts | Finnhub Form 4 |
| `valuation-snapshot` | `ticker` | `verdict` very_cheap…very_expensive, `buyZone`, `bottomLine`, `metrics{pe, ps, pb, evEbitda, fcfYield, roe, netMargin, debtToEquity}` | FMP, Finnhub, Polygon |
| `bear-vs-bull` | `ticker` | `bullCase[3]{argument, evidence}`, `bearCase[3]`, `verdict` bull_wins…bear_wins, `keyDebate` | as above |
| `compare-stocks`, `moat-analysis` | 2–3 tickers / 1 ticker | winner and per-ticker reads / moat width and durability | as above |
| `portfolio-review` | `holdings[2..20]{ticker, weight or shares}` | concentration (Herfindahl, effective positions), sector exposure, weighted portfolio P/E, FCF yield, ROE, beta (harmonic mean for multiples), overlapping bets, weakest holding, trim candidates, gaps | FMP, Finnhub; prices to turn shares into weights, with unpriced tickers reported rather than dropped |
| `watchlist-scan` | tickers | ranked shortlist with reads | as above |

Pricing is per call ($0.02–0.05 for stock tools), with a free tier, and a
`catalog` endpoint for runtime discovery. The repository also holds a
**watchlist monitor plan**: a daily job that re-fetches each unique ticker
once, runs three rule-based detectors (new insider buy, earnings within 7
days, valuation entered its buy zone), stores alerts, and sends one
LLM-written digest per user *only when something changed*.

### 2.2 Decisions the toolbelt got right that we keep

- **Every card has the same skeleton**: a verdict from a fixed enum, a
  one-liner, structured evidence, a raw-data block, `dataSources` with
  per-source success flags and a fetch time, and `generatedAt`. A layman
  reads the first two lines; a technical reader opens the rest.
- **Every number is computed, every word is synthesised.** `portfolio-review`
  computes HHI, sector weights and harmonic-mean multiples in code and hands
  only judgment to the model. Its comment: *"Handing arithmetic to an LLM
  would make the same input produce drifting numbers."*
- **Missing data is reported, not hidden.** Unpriced tickers come back in an
  `excluded` list with the reason.
- **Monitoring costs scale with unique instruments**, detection is rule-based
  on cached data, and the model is called once per digest, not per item.
- **A verdict track record** is on their roadmap as the moat. It is on ours
  as the point.

### 2.3 What we leave

- US tickers only; fundamentals from Polygon/FMP/Finnhub. Our holdings are
  UK OEICs and UCITS ETFs first; stock fundamentals come later and from a
  provider that covers the LSE and Xetra.
- The SaaS layer: keys, tiers, billing, RapidAPI, email.
- Haiku 4.5 with hand-parsed JSON (`parseLLMJson` strips code fences). We
  use Haiku 5.5 and Sonnet 5.5 with structured outputs, so the parse cannot
  fail.
- "Buy zone" prices for stocks as a headline. Useful for a stock picker;
  for a fund holder the equivalent is "is the price unusual for this fund",
  which the volatility and drawdown signals answer.

### 2.4 What we add on top, for funds and ETFs

The toolbelt's cards assume a company. A MyMap fund or an iShares ETF needs
different cards, built the same way:

| Card | Computed | Synthesised |
| --- | --- | --- |
| `holding-profile` | Kind, cost (OCF), asset allocation, top holdings, regional and currency look-through, benchmark, tracking difference where known | What this holding is for, in one paragraph a layman follows |
| `overlap-review` (the portfolio-review for funds) | Look-through overlap between holdings (MyMap Balanced and an S&P 500 ETF both hold Apple), effective number of positions, currency exposure, bond duration | The bets you are really making, in plain words |
| `fund-vs-benchmark` | Return vs benchmark over 1/3/12 months, tracking difference, cost drag | Whether the fund is doing its job |
| `stance` (the thesis card) | Pillars, flags, confidence, horizon, invalidation | Why, in two sentences, and what would change the view |

---

## 3. The wider landscape

### 3.1 Open-source agent frameworks for finance

| Framework | Shape | What is worth borrowing |
| --- | --- | --- |
| **TradingAgents** (TauricResearch, active, v0.7 in Oct 2026) | Analysts (fundamentals, sentiment, news, technical) run in parallel; a Researcher Team debates bull vs bear for a configurable number of rounds; a Trader proposes; a risk team assesses; a Portfolio Manager approves. Two model tiers: quick-think for analysts and debaters, deep-think for the managers. Decisions go to a memory log used for reflection. Supports Bedrock. | The **bull/bear debate as a cheap two-call pattern** for the weekly review and for any call above a confidence threshold: one call argues for, one against, a third judges with the scorecard in hand. The **two-tier model split** (we already route Haiku/Sonnet/Opus). The **decision memory with reflection**: our scorecard plus "what did I say last time and was I right". Not the eight-agent graph: for one household it is cost without accuracy. |
| **ai-hedge-fund** (virattt) | Investor-persona agents plus Valuation, Sentiment, Fundamentals and Technicals agents; a Risk Manager sets position limits; a Portfolio Manager synthesises. Paper-trading ledger that is hash-chained; an approval step before each decision; a kill switch. Simulated only. | The **hash-chained paper ledger** (tamper-evident record of every call) and the **kill switch** (`/pause` stops all calls and alerts until `/resume`). The approval step maps to our Confirm buttons. |
| **FinRobot** | Equity-research report generation. | Report structure only. |

### 3.2 Market data for UK OEICs, UCITS ETFs and US/EU listings

| Need | Candidates | Status |
| --- | --- | --- |
| OEIC daily NAV by ISIN (the Monzo funds) | Yahoo Finance lists UK funds under Morningstar-style ids such as `0P0001FBCE.L`, which yfinance can read; FT Markets has `markets.ft.com/data/funds/tearsheet/historical?s=<ISIN>:GBP` (history reported as limited to about a month without a subscription); Trustnet and Morningstar fund pages; the BlackRock UK product page itself; Fundology (table, by ISIN) | **To verify in phase 2** with the real ISINs. Expect to combine: yfinance for history, the BlackRock page as the daily check, FT as fallback. No free *API* was found; these are pages. |
| ETF and stock closes on LSE, Xetra, NYSE/Nasdaq | EODHD All World EOD ($19.99/month, 70+ exchanges, ISIN lookup); yfinance (free, unofficial, breaks at times); Alpha Vantage (25 calls/day free); Polygon (US only); Finnhub | **EODHD when paid; yfinance when lean.** Blogs disagree on free-tier coverage of LSE/Xetra; EODHD is the one with a clear European claim. |
| US closes, US macro basket, earnings calendar, FX fallback, ISIN resolution | Twelve Data: free Basic plan, 8 credits a minute and 800 a day, US listings; `/time_series`, `/quote`, `/exchange_rate`, `/earnings_calendar`, `/symbol_search`; identifiers by ISIN, FIGI and MIC code on the main endpoints; 100+ server-side indicators (credits per call); full mutual-fund data only on the $999 Ultra plan; Grow at $79/month in the March 2026 price list (older pages say from $29) adds more markets | **Use the free tier for everything US-listed and as a second source.** Its indicator endpoints are not used in production (the engine must be deterministic and offline-testable) but make a good third-party golden file for the port. Whether Basic includes LSE and Xetra is unconfirmed; if it does, it replaces EODHD. UK OEICs are out of reach on any affordable plan. |
| Fund look-through (top holdings, allocation) | The BlackRock UK product pages list top-10 holdings and allocation tables (HTML, monthly "as of"); iShares ETF pages have holdings downloads; the factsheet PDF the user uploads | **Factsheet first** (Claude reads the PDF), page scrape second. |
| Stock fundamentals (later) | EODHD Fundamentals (covers LSE), FMP, Finnhub (mostly US) | Phase 7, only if a single stock is ever added. |
| FX | ECB daily reference rates | Free, settled. |
| Macro baskets | US: SPY, RSP, IWM, HYG, LQD, TLT, XLY, XLP (as the desk). UK and EU: UCITS equivalents on the LSE/Xetra, chosen in phase 2 | Same price feed as everything else. |
| News | RSS from BoE, Fed, ECB, FT, Reuters, BlackRock; Brave Search API as the on-demand search tool | Free, plus Brave's free tier. |

### 3.3 Claude: what the agent can use

*Decision, 23 Oct 2026: the design uses the Anthropic API directly (key in
SSM, Console spend limit), not Bedrock. Bedrock's model-access form needs a
company name, and the direct API adds server-side web search and Message
Batches. The notes below record what was checked for Bedrock at the time.*

All of these are available on Bedrock for Opus 5.5, Sonnet 5.5 and Haiku 5.5
(checked against the platform table): **PDF input** (the factsheet), **image
input** (a screenshot of the Monzo valuation screen), **structured outputs and
strict tools** (every card is a schema), **prompt caching**, **citations**
(quote the factsheet line a number came from), **adaptive thinking with
effort**. Not on Bedrock: Anthropic's server-side web search and web fetch
(we use Brave and `httpx` as client tools), Message Batches (real-time Haiku
is cheaper anyway), and Bedrock batch inference does not cover the 5.5
models.

That makes the layman's ingestion path possible: *send MyPaisa the
factsheet and a screenshot, it reads both and asks you to confirm*.

### 3.4 Telegram: what a bot can show in 2026

Kept as the record (see the note at the top): since MA-161 the chat, its
cards and charts and the dashboard are drawn natively in the iOS app, and
none of the uses below is planned as written. The interactive dashboard with
lightweight-charts on S3 and CloudFront lives on as the web app, in a browser
rather than inside Telegram.

| Capability | Use here |
| --- | --- |
| **Rich messages** (Bot API 10.1, June 2026: `sendRichMessage` with structured blocks: headings, tables, collapsible sections; 10.2 added media blocks; 10.3, Aug 2026, added in-message buttons and ephemeral parameters; `sendRichMessageDraft` previews in private chats) | The **holdings table** and the **technical details** as a collapsed section under a plain summary. This is the single biggest UX gain for a layman: one message, simple on top, detail on tap. The details come from third-party write-ups; confirm against the official changelog in phase 1 and keep plain HTML messages as the fallback. |
| Inline keyboards and callback queries | Every card's actions: Why?, Technical, Chart, Snooze, Mute, I acted, Confirm |
| Reply keyboard and the bot menu button; command scopes | A persistent four-button keyboard for the layman: Portfolio · Today · Ask · Settings |
| `editMessageText` / `editMessageMedia` | Update a card in place instead of sending a new one |
| `sendPhoto`, `sendMediaGroup` | Charts as PNG; several charts in one album |
| Photo and document uploads from the user (`getFile`) | The factsheet PDF and the valuation screenshot |
| **Mini Apps** (`web_app` buttons; standard HTML/JS in Telegram's WebView; `initData` signed by Telegram) | An interactive dashboard with real charts (TradingView's lightweight-charts), hosted as static files on the wealth tracker's existing S3 + CloudFront; the Function URL validates `initData` before serving data |
| Ephemeral messages (10.2/10.3) | Transient "typing", progress and confirmation prompts that do not clutter the chat |

### 3.5 Confidence scores that mean something

A "confidence 72%" is only worth showing if 72% of the calls made at that
confidence turn out right. The method: the score is computed, not felt.

- **Inputs:** pillar agreement (how many of trend, momentum, macro, risk
  point the same way), signal persistence (how many bars the state has
  held), data quality (bars present, NAV fresh, proxy gap small), and the
  empirical hit-rate of past calls made in the same state bucket once the
  log has enough of them.
- **Calibration:** Brier score and a reliability table in the Saturday
  review (calls at 60–70% confidence: 11 made, 7 right). When a bucket runs
  hot or cold for 8 weeks, the mapping is adjusted and the change is logged.
- **Honesty rule:** below 55% the card says "no clear view" and shows no
  direction.

### 3.6 Regulatory note

Regulated investment advice in the UK is a matter for firms advising others.
A tool a person builds and runs for their own household, holding no client
money and placing no orders, is personal software. MyPaisa still labels every
stance "a view, not advice", suggests only ISA-safe actions, and never says
"sell everything".

---

## 4. What the hybrid becomes

| Layer | From the desk | From the toolbelt | From the frameworks | Ours |
| --- | --- | --- | --- | --- |
| Data | Input hygiene: stale and interpolated bars, provisional closes | Per-source success flags, unpriced reported | | OEIC NAV + proxy basket, FX split, three exchanges' calendars |
| Maths | Indicators, pillars, flags, macro regime | HHI, look-through overlap, weighted metrics | | Volatility percentile, drawdown, forecast ranges, calibration |
| Decision | Flags and the holder/flat split | Verdict enums, buy-zone idea → "unusual price" | Bull/bear debate, risk limits in code | A holder's cascade (ADD / HOLD / PAUSE / TRIM / REBALANCE), confidence score, horizon, invalidation |
| Words | Context never alters scores | Card skeleton: verdict, one-liner, evidence, sources | Two model tiers, reflection memory | Layman mode by default, technical on tap |
| Guardrails | Fail-closed guard, circuit breakers, self-tests, self-audit | Caps on inputs, excluded lists | Kill switch, hash-chained ledger | No trading, no keys, protected positions, cost ceilings |
| Delivery | Push per event, Friday review | Digest only when something changed | | The iOS app: the chat with native cards and Swift Charts, the dashboard beside it, Apple push; the same dashboard read-only in the web app, with lightweight-charts (Telegram rich messages, a Mini App dashboard and PNG charts until MA-161) |

---

## 5. Guardrails and evals for the agents (27 Oct 2026, MA-245)

Researched for `ARCHITECTURE.md` §23, from Anthropic's own engineering posts
and docs, the main evaluation vendors' write-ups, the work on calibrating LLM
judges, the OWASP and NIST frameworks (NIST AI 600-1, the generative AI
profile) and the FCA's October 2026 remarks.
Arun's starting point was that daily offline evals cost money, repeat the
same score and breed alert fatigue. The sources agree with him.

### 5.1 What an eval is, and when it runs

- **Terms** (Anthropic, *Demystifying evals for AI agents*, Jan 2026). A
  *task* is one case with its success criteria; a *trial* is one attempt;
  a *grader* scores one aspect; the *outcome* is the state the agent leaves
  (the record in the database, not the agent's word that it saved one).
  Graders come in three kinds: code (fast, cheap, exact, brittle), model
  (flexible, needs calibrating) and people (the gold standard, slow).
  Grade the outcome where possible; check the transcript for how tools were
  used. Start with 20 to 50 tasks drawn from real failures.
- **Capability and regression suites.** Capability cases start failing;
  regression cases sit near 100%; a capability case that saturates
  graduates. **pass@k** (one of k trials succeeds) suits a tool where one
  good answer is enough; **pass^k** (all k succeed) suits anything that
  writes or faces a person, and falls fast: 75% a trial is about 42% over
  three.
- **Statistics.** Report a standard error with every score, compare
  versions as paired differences, and treat a gap smaller than the measured
  noise as no gap (Anthropic, *A statistical approach to model evals*,
  2024; *Infrastructure noise*, 2026).
- **Offline against online.** Offline evals run a fixed set before a
  release and can gate it; online evals score live traffic and cannot
  (Inngest, 2026; LangChain, 2026; Hamel Husain and Shreya Shankar's evals
  FAQ, 2026). Claude model ids are pinned snapshots, so a fixed set rerun
  against unchanged code and an unchanged id measures only noise; what
  changes without a pull request is the traffic, which online checks see.
- **Sampling.** Cheap code checks on every run; model judges on every
  flagged run plus a random 5 to 10%, the random share to catch what the
  flags miss; people on the riskiest and oddest runs; confirmed failures
  promoted into the golden set (LangChain, Langfuse, LangSmith, Braintrust,
  Hamel Husain).

### 5.2 Judges and their calibration

- Build judges from an expert's own pass or fail verdicts with a written
  critique ("critique shadowing"), one binary judge per failure mode, and
  measure each against held-out labels by its true-positive and
  true-negative rates, not raw agreement, which flatters when failures are
  rare (Hamel Husain, *Using LLM-as-a-judge*, 2024, updated 2026). About 100
  labels per failure mode give a usable interval; fewer than about 60 do
  not.
- Criteria drift: people discover what they mean by "good" by grading
  outputs, so the rubric is revised as the labels come in (Shankar et al.,
  *Who validates the validators?*, 2024). Cohen's kappa is reported beside
  raw agreement, not instead of it (Arize, 2026).
- No source fixes a cadence. The common rule is calibration on every change
  to a judge, a prompt, a tool or the model, and on a spike, plus a regular
  spot check: monthly here (Arun, 27 Oct 2026).

### 5.3 Guardrails for an agent with tools

- **Architecture before detection.** Least agency; authorisation enforced in
  the system the tool calls, never in the model (complete mediation); a
  person approves high-impact actions (OWASP Top 10 for LLM Applications
  2025, LLM06 Excessive Agency; OWASP Top 10 for Agentic Applications 2026).
- **The lethal trifecta.** Private data, untrusted content and a way to send
  data out, together, make an agent exploitable; remove one leg (Simon
  Willison, 2025). The dual-LLM pattern, the six patterns of Beurer-Kellner
  et al. (2025) and Google DeepMind's CaMeL (2025) do it by design: the model
  that reads untrusted text cannot act, and untrusted data cannot choose
  which tools run.
- **Anthropic's advice for indirect injection.** Put third-party content
  only in tool results, say in the tool's description where it came from,
  JSON-encode it, never put instructions inside a tool result, give least
  privilege, and red-team the agent with poisoned documents. Even with
  Anthropic's latest defences, about 1 to 2% of injection attempts succeed
  against its models in browser use (Anthropic, Nov 2025), so detection is
  a layer, never the defence.
- **Agent SDK hooks** run before every tool call, can deny or rewrite it,
  and fail closed on a timeout; MyPaisa's loop is its own, but the policy
  gate takes the same shape.
- **Hosted guardrails** (AWS Bedrock Guardrails' contextual grounding and
  automated reasoning, NeMo Guardrails, Llama Guard, LlamaFirewall) were
  weighed and left out: the figure check in code is exact where grounding
  scores are approximate, and each adds a per-call price or a model to run.

### 5.4 Personal finance

- Models handle simple lookups well and multi-step calculations badly
  (FAITH, 2025), and cannot reliably spot their own numeric errors (PHANTOM,
  NeurIPS 2025). So code computes every figure and a deterministic check ties every
  figure in a reply to a tool result, after normalising units and currency.
- UK FCA: regulated advice is a personal recommendation on a particular
  investment, made by way of business (PERG 8, PERG 2.3). A household's own
  tool is outside that perimeter on our reading (§3.6; not legal advice).
  The FCA's 19 Oct 2026 remarks ask AI tools for clear, proportionate
  disclaimers on financial answers; "a view, not advice" stays on every
  stance card.
- Forecasts are scored when they resolve: Brier score with its reliability
  diagram, against a base rate (§3.5 above; `ARCHITECTURE.md` §20.4).

### 5.5 Tools

Inspect AI (UK AISI, open source, Python: datasets, solvers, scorers,
repeated trials) fits the Python stack and wraps our own agent loop.
promptfoo (YAML, Node, OWASP red-team presets) and DeepEval were the
alternatives; hosted platforms (Langfuse Cloud, Braintrust, LangSmith) were
left out because their dashboards would need the household's transcripts
outside AWS (Arun, 27 Oct 2026). The OpenTelemetry GenAI conventions are
still in development, so the `RunRecord` stays the source of truth (§10).

---

## 6. End-to-end AWS & LLM observability with FastAPI, DynamoDB vs DocumentDB, Python libraries, and agent frameworks (MA-265)

Researched 28 Oct 2026 (`MA-265`, `MA-266`) to answer four questions end to end:

1. **How AWS monitoring, tracing, request IDs and LLM observability work across every component, including the FastAPI REST APIs (`handlers/api` and `handlers/stream`), with a complete costing analysis** — and what is already planned in the repo.
2. **The detailed implementation tech stack across all four layers:** (a) Web front end (`SvelteKit 3.1`, `TanStack`, `shadcn-svelte`, `Tailwind CSS 4.3`), (b) Native iOS app (`React Native 0.88` bare + `Swift 6 SwiftUI` core on Fabric), (c) Python backend (`Python 3.14`, `FastAPI`, `Pydantic v2`, DynamoDB single-table repository), and (d) Agents.
3. **Database & Python library choice:** Are we using Amazon DocumentDB? Why or why not, with a technical and cost comparison, and which Python libraries are best for DynamoDB.
4. **Agent framework choice:** Which agent frameworks exist (`anthropic` SDK custom loop, `PydanticAI`, `AWS Strands Agents`, `LangGraph`, `Claude Agent SDK`, `CrewAI` / `AutoGen`), how they compare against MyPaisa's rules, and what we recommend.

The interactive explainer page with six animated block diagrams is [`docs/design/tech-stack-observability.html`](design/tech-stack-observability.html), mirrored to Confluence on the page **Tech stack, FastAPI, DynamoDB, agents and end-to-end observability**.

### 6.1 End-to-end AWS monitoring, tracing, request IDs & LLM observability (including FastAPI REST APIs)

#### What is already planned in the repository (`ARCHITECTURE.md` §10)

The observability design is recorded in `ARCHITECTURE.md` §10 (`MA-230`, drawn on Lucid page 9 in `MA-236`) and broken into seven build stories across Phases 0, 1 and 18:

| Story | Phase | Status | What is already planned |
| --- | --- | --- | --- |
| `MA-230` | Phase 0 | Done | `ARCHITECTURE.md` §10: three readers (Activity screen, CloudWatch dashboard + Transaction Search + GenAI Observability, and chat/push + SNS alarms), correlation keys, OpenTelemetry on every Lambda, privacy boundary, and £2.50/month cost ceiling. |
| `MA-236` | Phase 0 | Done | Lucid architecture page 9 (`docs/design/lucid/09-observability.png`): one W3C trace from the door to the model and back, and where spans, logs, metrics and `RunRecord` rows live. |
| `MA-231` | Phase 0 | To Do | Terraform watch tower (`infra/modules/mypaisa/observability.tf`) created before the first Lambda runs: explicit CloudWatch log groups (14-day retention), X-Ray **Transaction Search** (`aws/spans`, 30-day retention, 100% unsampled ingestion), **CloudWatch Application Signals**, the 8-panel CloudWatch dashboard (`mypaisa-<env>`), saved Logs Insights queries, `mypaisa-<env>-admin-alerts` SNS topic, and infrastructure alarms. |
| `MA-29` | Phase 1 | To Do | Lambda handler base (`src/mypaisa_agent/runs.py`): `aws-lambda-powertools` `Logger` and `Metrics` (Embedded Metric Format in `MyPaisa/Agent`), OpenTelemetry Python SDK unzipped into `/opt`, and one `RunRecord` item in DynamoDB per run (90-day TTL) with per-function error alarms. |
| `MA-232` | Phase 1 | To Do | End-to-end W3C `traceparent` propagation from both doors through API Gateway, `api`, SQS `updates.fifo` (`AWSTraceHeader`), `agent`, Anthropic API, DynamoDB, S3, SQS `outbox.fifo`, `sender`, and back over SSE `stream` and push; `x-mypaisa-trace-id` response header; CI privacy leak test; post-deploy X-Ray smoke test. |
| `MA-233` | Phase 1 | To Do | OpenTelemetry GenAI semantic conventions (`gen_ai.*` and `mypaisa.*` attributes) on every `chat <model>` and `tool <name>` span, feeding CloudWatch Generative AI Observability and CloudWatch Omni, plus a weekly token/cost reconciliation job against `SpendMonth` and `RunRecord`. |
| `MA-234` | Phase 1 | To Do | Client-side telemetry (`POST /v1/telemetry`) reporting `ClientFirstWord`, `ClientErrors` and `ClientCrashes` with `trace_id` and `run_id` and zero user content. |
| `MA-196` | Phase 1 | To Do | The in-app **Activity** screen at both doors reading `RunRecord` rows in plain English (what the agent read, which tools it called, what it proposed, tokens, cache hits, latency and cost). |
| `MA-235` | Phase 18 | To Do | Multi-agent trace continuity across AWS Step Functions and EventBridge (`mypaisa-<env>-events`), per-agent `OTEL_SERVICE_NAME`, replay links (`replays_run_id`), and `AgentHeartbeat` metrics. |

#### How the FastAPI REST APIs (`handlers/api` and `handlers/stream`) fit into the trace and request-ID flow (`MA-266`)

Both HTTP entry points on `api(-dev).mypaisapp.com` run **FastAPI** (`MA-266`):

1. **`handlers/api` (buffered REST routes):** FastAPI wrapped in **`Mangum(app, lifespan="off")`** behind API Gateway REST API proxy integration (`POST /v1/chat/messages`, `POST /v1/chat/actions`, `GET /v1/chat/turns`, `GET /v1/records`, `PATCH /v1/records/{id}`, `POST /v1/uploads`, `POST /v1/telemetry`, `/v1/admin/*`, `/v1/auth/*`). Mangum translates the API Gateway REST event into an ASGI scope in-process with zero sidecar overhead, keeping cold start under 300 ms (`MA-232`).
2. **`handlers/stream` (Server-Sent Events route):** FastAPI (`StreamingResponse` with `media_type="text/event-stream"`) running on **Uvicorn behind AWS Lambda Web Adapter 1.1** (`AWS_LWA_INVOKE_MODE=response_stream`) on API Gateway REST API's streaming route `GET /v1/stream` (`responseTransferMode: STREAM`, up to 15 minutes, 15-second heartbeat).
3. **`scripts/local/` (laptop dev server, `MA-198`):** Mounts both FastAPI routers into a single local Uvicorn ASGI process backed by `moto`.

Every request through FastAPI carries four correlated identifiers from the door to the database and back:

| Identifier | Where it is minted | Header / field on the wire | Purpose |
| --- | --- | --- | --- |
| **`trace_id` & `span_id`** | Door (`web/src/lib/obs/` or `ios/src/obs/`) per user action | Request: `traceparent: 00-<32-hex-trace-id>-<16-hex-span-id>-01`<br>Response: `x-mypaisa-trace-id: <32-hex-trace-id>` | Ties the browser/iOS tap, API Gateway, FastAPI route, SQS hop, `agent` loop, Claude call, DynamoDB write, `sender`, and SSE delivery into one X-Ray / Transaction Search trace. |
| **`request_id`** | API Gateway REST API per HTTP call (`$context.requestId` / Lambda `aws_request_id`) | Request context: `event.requestContext.requestId` / `x-amzn-requestid`<br>Response: `x-request-id: <uuid>` | Identifies the exact HTTP invocation in the API Gateway JSON access log (`/aws/apigateway/mypaisa-<env>-api`) and FastAPI route logs, even when a client retries the same `client_message_id`. |
| **`client_message_id`** | Door (UUID v7 per chat send or button tap) | Request header `x-client-message-id` and body `client_id` | SQS `MessageDeduplicationId` on `updates.fifo` so a network retry within 5 minutes is deduplicated without running the agent twice. |
| **`run_id`** | Handler base (`runs.py`, ULID per agent/job/write execution) | `RunRecord.run_id`, `StreamEvent.run_id`, log key `run_id`, span attribute `mypaisa.run_id` | The human-visible run key shown in the **Activity** screen (`MA-196`) and stored on every `AuditEvent` and `RunRecord`. |

**FastAPI `CorrelationMiddleware` and OpenTelemetry ASGI instrumentation (`MA-266`):**

1. **Incoming hop at API Gateway:** API Gateway REST API has X-Ray active tracing enabled. It honours the incoming `traceparent` header, logs `{request_id, extended_request_id, trace_id, ip, route_key, http_method, status, response_latency_ms, integration_latency_ms, authorizer_latency_ms, authorizer_error}` to `/aws/apigateway/mypaisa-<env>-api`, and forwards the request to Lambda.
2. **OpenTelemetry FastAPI instrumentation (`opentelemetry-instrumentation-fastapi`):** `FastAPIInstrumentor.instrument_app(app)` wraps the ASGI app and creates an internal span named after the parameterized FastAPI route (`POST /v1/chat/messages`, `PATCH /v1/records/{id}`, `GET /v1/stream`) with `http.route`, `http.request.method`, and `http.response.status_code`. Because `http.route` uses the route template rather than the raw URL path, CloudWatch Application Signals aggregates latency (`p50`/`p95`/`p99`) and fault rates cleanly per endpoint without cardinality explosion.
3. **`CorrelationMiddleware` (`src/mypaisa_agent/api/middleware.py`):**
   - Extracts `trace_id` and `span_id` from the current OpenTelemetry context, `request_id` from `request.scope.get("aws.context").aws_request_id` (or `x-amzn-requestid` on the Uvicorn LWA stream handler), `client_message_id` from `x-client-message-id`, `door` (`ios` | `web`) and `app_version` from `x-mypaisa-door` / `x-mypaisa-version`, and the verified `member_id` from the Lambda authorizer context (`requestContext.authorizer.member_id`).
   - Computes `member = sha256(member_id)[:8]` and calls `logger.append_keys(trace_id=..., span_id=..., request_id=..., run_id=..., member=..., client_message_id=..., route=..., door=..., app_version=..., env=..., build=...)` on `aws-lambda-powertools` `Logger`.
   - Sets span attributes `mypaisa.request_id`, `mypaisa.member`, `mypaisa.door`, and `mypaisa.client_message_id` on the active OpenTelemetry span.
   - Adds `x-mypaisa-trace-id` and `x-request-id` to **every** HTTP response (`200`, `202`, `400`, `401`, `403`, `422`, `500`), including custom FastAPI exception handlers for `RequestValidationError` (`422`) and unhandled exceptions (`500`), so a failed request in Safari or the iOS app always has both IDs for instant lookup in Logs Insights or Transaction Search.
4. **Queue hand-off (`api` -> `updates.fifo` -> `agent`):** When `POST /v1/chat/messages` puts the message onto `mypaisa-<env>-updates.fifo`, `opentelemetry-instrumentation-botocore` injects the W3C context into SQS `AWSTraceHeader` and message attributes (`traceparent`, `run_id`, `request_id`). The `agent` Lambda's handler base extracts that context so its root span (`agent.turn`) is a child of `POST /v1/chat/messages` in the same trace.
5. **LLM & tool spans inside `agent` (`MA-233`):**
   - Each `anthropic` SDK streaming call opens a `CLIENT` span `chat claude-sonnet-4-6` (or `chat claude-opus-4-7` / `chat claude-haiku-4-5`) with OpenTelemetry GenAI attributes: `gen_ai.operation.name="chat"`, `gen_ai.provider.name="anthropic"`, `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.response.id` (Anthropic's `msg_...`), `gen_ai.response.finish_reasons`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cache_creation.input_tokens`, plus `mypaisa.agent`, `mypaisa.run_id`, `mypaisa.spend_step`, `mypaisa.time_to_first_token_ms`, `mypaisa.cost_usd`, `mypaisa.prompt_version`, `mypaisa.fallback_from`, and `mypaisa.refused`.
   - Each tool call opens an `INTERNAL` span `tool <name>` with `gen_ai.operation.name="execute_tool"`, `gen_ai.tool.name`, `gen_ai.tool.call.id`, `mypaisa.policy_decision` (`allow` | `deny`), `mypaisa.tool.status`, `mypaisa.tool.input_bytes`, and `mypaisa.tool.output_bytes`, wrapping the child DynamoDB `Query`/`TransactWriteItems` or S3 `GetObject`/`PutObject` spans.
6. **SSE `stream` span lifecycle (`handlers/stream`):** Because `GET /v1/stream` stays open up to 15 minutes (`STREAM` mode), keeping one HTTP span open for 15 minutes would skew latency percentiles and hold spans in memory. Instead, FastAPI on `stream` emits:
   - a short **`GET /v1/stream handshake`** span (authorizer check, `Last-Event-ID` / `?after=` catch-up query on DynamoDB, and initial `TurnBuffer` flush, typically `< 40 ms`); and
   - a **`stream.deliver`** child span per delivered `StreamEvent`, linked to the originating turn's `trace_id` and `run_id`, flushed immediately through the Lambda OpenTelemetry collector extension.

#### Costing analysis for end-to-end AWS & LLM observability

All telemetry stays inside our single AWS account (`545595341442`, `us-east-1`). Below is the monthly cost breakdown across **`dev`**, **`prod` (household baseline: ~1,500 runs/month, ~50 runs/day)**, and **`prod` (heavy stress: 5,000 runs/month)**, using `us-east-1` pricing converted at £0.80/$:

| Observability component | AWS service & billing unit | Free tier (per AWS account) | `dev` (~200 runs/mo) | `prod` baseline (~1,500 runs/mo) | `prod` heavy (~5,000 runs/mo) | How cost is kept low |
| --- | --- | --- | --- | --- | --- | --- |
| **Structured JSON logs** (`api`, `stream`, `agent`, `sender`, `jobs`, `auth`, API Gateway access logs) | CloudWatch Logs standard ingestion ($0.50/GB) + 14-day storage ($0.03/GB-mo) | **5 GB/mo** ingestion + **5 GB** storage free | ~30 MB (**£0.00**) | ~200 MB (**£0.08**) | ~650 MB (**£0.26**) | `INFO` level only (`DEBUG` off in prod), no prompt/reply bodies logged, 14-day retention (`MA-231`). |
| **OpenTelemetry spans** (FastAPI routes, SQS hops, `chat <model>`, `tool <name>`, DynamoDB, S3, APNs) | CloudWatch **Transaction Search** (`aws/spans` log group): **$0.35/GB** ingested (30-day retention included) | None on `aws/spans` ($0.35/GB from byte 1) | ~20 MB (**£0.01**) | ~150 MB (~25k spans, **£0.05**) | ~500 MB (~85k spans, **£0.14**) | 100% unsampled (`parentbased_always_on`) costs pennies via Transaction Search ($0.35/GB vs classic X-Ray's $5.00/M traces above free tier). |
| **X-Ray trace map & smoke tests** | AWS X-Ray traces recorded ($5.00/M above free tier) & retrieved ($0.50/M above free tier) | **100,000 traces/mo** recorded + **1,000,000** retrieved free | ~500 traces (**£0.00**) | ~3,500 traces (**£0.00**) | ~12,000 traces (**£0.00**) | Well within the 100k/mo perpetual free tier. |
| **Application Signals & GenAI Observability** (per-FastAPI-route SLOs + model latency/token views) | CloudWatch Application Signals ($1.50/M signals) | 30-day trial, then metered per signal | ~15k signals (**£0.02**) | ~100k signals (**£0.12**) | ~300k signals (**£0.36**) | Only low-cardinality dimensions (`service.name`, `http.route`, `gen_ai.request.model`). |
| **Custom metrics via Powertools EMF** (`MyPaisa/Agent`: tokens, cost, TTFT, cache hit %, figure-check catches, client telemetry) | CloudWatch custom metrics ($0.30/metric/mo; EMF suppresses separate `PutMetricData` API fees) | **10 metrics/mo** free | 15 metrics, 10 free = 5 billed (shared across account) | **15 metrics** (5 billed above 10 free = **£1.20**) | **15 metrics** (**£1.20**) | Strict dimension whitelist (`env`, `agent`, `model`, `tool`, `door`); `run_id`, `member` and `record_id` are **never** metric dimensions (§10.5). |
| **CloudWatch Alarms** (per-function errors, DLQ depth, latency p95, spend 80%/100%, cache hit `<50%`, refusal/tool-error spikes, 1 composite alarm) | Standard alarms ($0.10/metric-alarm/mo) + composite alarm ($0.50/mo) | **10 alarm metrics/mo** free | 6 dev alarms (inside free tier, **£0.00**) | ~20 standard + 1 composite (**~£1.00**) | ~20 standard + 1 composite (**~£1.00**) | High-resolution (10-second) alarms are not used; standard 60-second evaluation is sufficient. |
| **CloudWatch Dashboard** (`mypaisa-<env>`, 8 panels) | CloudWatch Dashboards ($3.00/mo above 3) | **3 dashboards/mo** free (up to 50 metrics each) | 1 dashboard (**£0.00**) | 1 dashboard (**£0.00**) | 1 dashboard (**£0.00**) | Two dashboards total (`dev` + `prod`), inside the 3-dashboard free tier. |
| **In-app Activity ledger** (`RunRecord` items in DynamoDB, 90-day TTL) | DynamoDB single-table (`mypaisa-<env>`, ~2 KB per `RunRecord`) | **25 GB** storage + **25 WCU / 25 RCU** free | ~1 MB (**£0.00**) | ~10 MB / 90 days (**£0.00**) | ~30 MB / 90 days (**£0.00**) | Stored in the same single table as household records with automatic 90-day TTL expiry. |
| **Logs Insights queries** (on-demand debugging & weekly token reconciliation) | CloudWatch Logs Insights ($0.005/GB scanned) | Included in usage | < 0.5 GB scanned (**£0.00**) | ~2 GB scanned/mo (**£0.01**) | ~5 GB scanned/mo (**£0.02**) | Narrowed by explicit log group and time window. |
| **Total monthly observability cost** | — | — | **~£0.03 / month** | **~£2.46 / month** (rounded to **£2.50/mo** in §10.9) | **~£2.98 / month** | Leaves **> £47/mo** of headroom inside the £50/mo AWS cap (`ARCHITECTURE.md` §14). |

**Why native AWS CloudWatch + OpenTelemetry + DynamoDB `RunRecord` beats external LLM observability SaaS for MyPaisa:**

| Option | Monthly cost | Data residency & privacy | Covers FastAPI + SQS + DynamoDB + APNs + Claude in one trace? | Powers the household's in-app Activity screen? | Verdict |
| --- | --- | --- | --- | --- | --- |
| **AWS CloudWatch + X-Ray Transaction Search (`aws/spans`) + GenAI Observability + DynamoDB `RunRecord` (Chosen)** | **~£2.50/mo** | 100% inside AWS account `545595341442` (`us-east-1`), zero prompts/figures in spans | **Yes** — one W3C trace across API Gateway, FastAPI, SQS, Lambda, Claude, DynamoDB, S3 and APNs | **Yes** — `RunRecord` rows are queried directly by `GET /v1/runs` (`MA-196`) | **Selected (`MA-230`–`MA-236`, `MA-265`)** |
| **LangSmith (Plus)** | $39/seat/mo (~£31/mo) + trace overages | Sends trace metadata/payloads to LangChain's US cloud | LLM/tool spans only; does not trace API Gateway, SQS FIFO or DynamoDB natively | No (requires separate store) | **Rejected** — 12x cost and external SaaS dependency |
| **Langfuse (Cloud Hobby/Core or Self-Hosted)** | Cloud: $0–$29/mo; Self-hosted: ClickHouse + Postgres + Redis (~$40+/mo on AWS) | Cloud sends data outside AWS; self-hosted breaks serverless budget | Good OTel GenAI support, but separate UI from AWS alarms and API Gateway | No | **Rejected** — extra vendor or stateful cluster to run |
| **Datadog LLM Observability + APM** | $31/host + $50+/mo LLM observability minimum | External SaaS | Yes, via Datadog Lambda extension | No | **Rejected** — blows past the £50/mo AWS budget |
| **Arize Phoenix (Self-Hosted)** | Container hosting cost ($15–$30/mo) | Inside AWS if self-hosted | LLM/eval focus; not an infra/SQS/API Gateway alarm system | No | **Rejected** — Inspect AI (`MA-246`) + CloudWatch GenAI Observability already cover evals and spans at £0 extra |

---

### 6.2 Database architecture: why DynamoDB single-table (not Amazon DocumentDB) & which Python libraries to use (`MA-265`, `MA-27`, `MA-28`)

#### Are we doing Amazon DocumentDB? No — DynamoDB single-table + S3 Parquet + DuckDB

Because `ARCHITECTURE.md` §4.1 describes **records as documents** (`Record.attrs`, `Event.payload`, and versioned `Kind` specs stored as nested JSON structures), it is natural to ask whether we should use **Amazon DocumentDB** (AWS's MongoDB-compatible document database) instead of **Amazon DynamoDB**.

We evaluated Amazon DocumentDB (both Instance-based and Serverless) against our **single-table DynamoDB design (`mypaisa-<env>`) + nightly S3 Parquet + DuckDB (`ARCHITECTURE.md` §4 & §12.1)**:

| Criterion | Amazon DynamoDB single-table + S3 Parquet + DuckDB (Chosen) | Amazon DocumentDB (Instance-based or Serverless) | Winner & why |
| --- | --- | --- | --- |
| **Monthly cost (`dev` + `prod`)** | **£0.00/mo** inside the AWS Free Tier (25 GB storage + 25 WCU/25 RCU perpetual free tier; or ~£0.30/mo on-demand). S3 Parquet + DuckDB inside Lambda costs **£0.01/mo**. | **Instance-based:** smallest `db.t4g.medium` is ~$56/mo per cluster = **~£90/mo** for `dev` + `prod`.<br>**DocumentDB Serverless:** minimum 0.5 DCU continuous is ~$43/mo per active cluster + VPC endpoints / NAT Gateway ($32/mo) = **~£75–£110/mo**. | **DynamoDB** — DocumentDB alone costs **1.5x to 2x our entire £50/mo AWS cap** (`ARCHITECTURE.md` §14). |
| **Storing nested JSON documents (`Kind`, `Record`, `Event`)** | Native `M` (Map) and `L` (List) document attributes up to **400 KB per item** (our largest `Record` or `Event` is 2–8 KB; raw PDFs/screenshots live in S3 `documents`). Validated by Pydantic v2 + `Kind` spec before write. | BSON documents up to 16 MB with secondary indexes on arbitrary nested paths. | **Tie for our item sizes** — every MyPaisa `Record`, `Event` and `PlanItem` is 1–8 KB, and its query keys (`kind`, `status`, `date`, `member`, `record_id`) are promoted to `PK`/`SK`/`GSI1`/`GSI2` (`§4.7`). |
| **Atomic multi-item writes & hash-chained `AuditEvent` (`§4.6`)** | Native **`TransactWriteItems`** commits up to **100 items** atomically (`Record` + `Event` + `View` + `AuditEvent` with `ConditionExpression: hash = :prev_hash`) in `< 10 ms` over stateless HTTPS. | Multi-document ACID transactions require a replica-set session, pinned TCP connection, and retry loops on transient write conflicts. | **DynamoDB** — `TransactWriteItems` is stateless, single-RPC, and enforces the `AuditEvent` hash chain via `ConditionExpression`. |
| **Atomic spend counter (`SpendMonth`, `§8.4`)** | Native `UpdateItem` with `ADD spend_usd :delta` and `ConditionExpression: spend_usd <= :ceiling` in a single atomic operation. | `findOneAndUpdate({$inc: ...})`, requires an open MongoDB socket. | **DynamoDB** |
| **Serverless Lambda fit & cold starts** | Stateless HTTPS calls via IAM execution role; **no VPC required**; `< 5 ms` single-digit latency; scales to zero and bursts without connection limits. | Must run inside a **VPC**; Lambdas need ENIs + VPC endpoints (or NAT Gateway) and must manage TCP/TLS connection pools across `api`, `stream`, `agent`, `sender` and `jobs` containers. | **DynamoDB** — zero VPC complexity, zero NAT fees, faster cold starts. |
| **The 6 household query patterns (`MA-27`) + analytical SQL (`MA-104`)** | All 6 operational queries (`§4.1`: last month's transactions, member's transactions this year, one holding's history, dividends/fees in range, valuation history, changes by member) are **single-partition `Query` calls** (`0 Scan`, enforced by test). Complex multi-year joins and `query_ledger_sql` run in **DuckDB over S3 Parquet** in `< 200 ms`. | Rich ad-hoc `$match` / `$lookup` aggregation pipelines on the live transactional store. | **DynamoDB + DuckDB** — operational reads stay `< 5 ms` and analytical SQL runs on columnar Parquet in DuckDB (`query_ledger_sql`, `§8`) at £0/mo. |
| **Local testing & CI (`MA-198`, `MA-246`)** | **`moto`** emulates DynamoDB `Query`, GSIs, and `TransactWriteItems` in-process inside `pytest` in milliseconds — no Docker container needed for unit/replay tests. | Requires a live MongoDB / DocumentDB container or incompatible mock in every CI job. | **DynamoDB** |

#### Which Python libraries to use for DynamoDB (`src/mypaisa_agent/registry/`)

We evaluated the four main Python approaches for building the single-table DynamoDB layer on **Python 3.14 + Pydantic v2 + strict `pyright`**:

| Library / approach | How it works | Pros | Cons for MyPaisa's single-table design | Verdict |
| --- | --- | --- | --- | --- |
| **1. Thin Typed Single-Table Repository on `Pydantic v2` + `boto3` (`TypeSerializer` / `TypeDeserializer`) + `mypy-boto3-dynamodb` (`boto3-stubs[dynamodb]`)** | Domain entities (`Kind`, `Record`, `Event`, `Commitment`, `PlanItem`, `View`, `AuditEvent`, `RunRecord`, `SpendMonth`) are pure **Pydantic v2** `BaseModel` classes. A 250-line repository in `src/mypaisa_agent/registry/` maps each entity to its `PK`/`SK`/`GSI1PK`/`GSI1SK`, converts `float`/`Decimal` at the wire boundary via `TypeSerializer`/`TypeDeserializer`, and provides a `TransactWriteUnit` builder that requires an `AuditEvent` on every mutation. | - **Single source of truth:** the same Pydantic v2 models validate FastAPI requests, agent tool outputs, and DynamoDB items.<br>- **Polymorphic `Query` native:** one `Query(PK="HH#mypaisa", SK begins_with "REC#")` or partition fetch returns heterogeneous items dispatched by `TypeAdapter` on `entity_type`.<br>- **100% strict `pyright`:** `boto3-stubs[dynamodb]` types every `QueryInputTypeDef` and `TransactWriteItemsInputTypeDef`.<br>- **Zero ORM overhead** on Lambda cold start. | We write ~250 lines of explicit key-builder and serializer code in `registry/repo.py` (tested by `MA-27`, `MA-28` and `MA-270`). | **Recommended & Selected (`MA-27`, `MA-28`, `MA-265`, `MA-270`)** |
| **2. `PynamoDB`** | Declarative ORM (`class RecordModel(Model): pk = UnicodeAttribute(hash_key=True)`). | Familiar Django/SQLAlchemy-style model syntax; built-in `TransactWrite` context manager. | - Assumes one `Model` class per table or awkward discriminator subclasses.<br>- Duplicates every Pydantic v2 model into a second `PynamoDB` class.<br>- Fights dynamic user-defined `Kind` schemas (`§4.8`) whose fields are data, not static Python class attributes. | **Not recommended** — fights single-table polymorphism and dynamic `Kind` specs. |
| **3. `aioboto3`** | Async wrapper around `aiobotocore` / `boto3`. | Non-blocking `await table.query(...)` inside async FastAPI handlers. | - `aiobotocore` pins narrow `botocore` versions that frequently conflict with `boto3` and `aws-lambda-powertools`.<br>- In Lambda (1 vCPU per concurrent request for `api` and `agent`), regional DynamoDB calls take `2–5 ms`; synchronous `boto3` (or `anyio.to_thread.run_sync` in `stream`) is simpler, faster to import, and 100% compatible with `moto` and `aws-lambda-powertools`. | **Not recommended** — version pinning friction with `botocore`/`powertools`. |
| **4. `dydantic` / `pydantic-dynamodb`** | Third-party wrappers binding Pydantic models to DynamoDB tables. | Less boilerplate for single-model tables. | - Small maintainer base; lags behind Pydantic v2.11+ and Python 3.14.<br>- No first-class support for multi-entity `TransactWriteItems` with hash-chained `AuditEvent` preconditions. | **Not recommended** |

**How the recommended DynamoDB repository works in code (`src/mypaisa_agent/registry/`):**

1. **Key builders (`registry/keys.py`):** Pure functions (`rk_record(record_id)`, `rk_event(ts, event_id)`, `gsi1_member_tx(member_id, ts)`, `gsi2_kind_record(kind_id, record_id)`) so no handler ever constructs a raw `"HH#mypaisa"` or `"REC#..."` string by hand.
2. **Wire serializer (`registry/serde.py`):** Converts Pydantic v2 models (`model_dump(mode="python")`) to DynamoDB attribute maps using `boto3.dynamodb.types.TypeSerializer`, turning Python `Decimal` / `int` into DynamoDB `N` and rejecting raw IEEE `float` on money fields so rounding drift can never enter the table.
3. **Scan guard (`registry/client.py`):** Wraps `DynamoDBClient` (`mypy_boto3_dynamodb.DynamoDBClient`) and raises `ForbiddenScanError` if `.scan()` or `. scan_paginator()` is ever called (`MA-27` acceptance criterion).
4. **Atomic unit of work (`registry/uow.py`):** `TransactWriteUnit` collects `put_record(...)`, `append_event(...)`, and `put_view(...)` operations, computes the new `AuditEvent` SHA-256 hash from the current `HEAD` audit row, attaches `ConditionExpression="attribute_not_exists(PK) OR #h = :prev_hash"`, and executes one `client.transact_write_items(TransactItems=...)` call (`MA-28`).

---

### 6.3 Agent frameworks: options, trade-offs & recommendation (`MA-265`)

#### What MyPaisa's agent layer requires (`ARCHITECTURE.md` §8, §20, §23)

Any agent runtime we choose must satisfy ten hard architectural constraints already settled in `ARCHITECTURE.md`:

1. **Direct Anthropic API (`api.anthropic.com`)** so development and evals draw from Arun's **Claude Max 20x Console credit** and production uses features Bedrock lags on (`ARCHITECTURE.md` §8.1, `docs/RESEARCH.md` §4.1).
2. **Explicit `cache_control` breakpoints** (`ephemeral`; at most three, the chat's fixed part on the 1h TTL, with the request's automatic caching for the tail and a lifetime per route, `ARCHITECTURE.md` §24.1, MA-286) on the stable system prompt, tool definitions, household profile, and `Kind` catalog so multi-turn conversations and 15-minute jobs achieve `> 60%` cache-read hit rates (`§8.4`).
3. **Claude 5.5 thinking blocks & cryptographic signatures** preserved verbatim and append-only across tool-use turns within a run (`§8.2`).
4. **Constrained decoding (`strict: true`) on every tool schema + isolated server-side `web_search_20260209` / `web_fetch_20260209`** inside dedicated tool-less `search_web` / `fetch_page` sub-calls so untrusted web content never shares an API request with household write tools (`§23.2`, lesson 32).
5. **Anthropic Message Batches API** (50% discount) for overnight non-urgent workloads (`narrator` morning brief prose, `archivist` conversation notes, and the 3 LLM judges in `MA-252`).
6. **Deterministic pre-tool `PolicyGate` in Python (`§23.2`)** checking five invariants (manifest allowlist, member role, household partition, schema/date bounds, per-run caps + untrusted-content taint narrowing) *before* any tool executes, and **`FigureCheck` (`§23.2`, `MA-248`)** checking every number in the final reply against tool outputs before sending.
7. **Stateless pause & resume across hours (`PendingAction`, `§8.2`):** When the agent calls `ask_user` or proposes a Confirm card (`draft_record`, `propose_plan_item`, `propose_budget_rearrangement`), the Lambda must **not** block waiting for a human; it writes a `PendingAction` row to DynamoDB and exits cleanly, and the next SQS message hours later resumes from that state.
8. **OpenTelemetry GenAI spans (`gen_ai.*` + `mypaisa.*`) and `RunRecord` (`§10.1`, `§10.3`)** with exact per-call cache-read/write tokens, TTFT, stop reason, and cost.
9. **Inspect AI (`T0` deterministic replay + `T1` golden set + `T2` full suite, `§23.3`, `MA-246`)** replaying recorded conversations with zero network in CI.
10. **Phase 18 nine-agent architecture (`§20`):** Only two agents (`concierge` and `research`) run an open-ended LLM tool loop; four (`ingestion`, `planner`, `sentinel`, `narrator`) are **deterministic Python pipelines that call Claude once for structured extraction or prose**; and three (`market_data`, `quant`, `archivist`) are **100% deterministic Python with zero LLM calls**, orchestrated by **AWS Step Functions** and **Amazon EventBridge (`mypaisa-<env>-events`)**, each in its own Lambda with its own IAM role.

#### Comparison of the six agent framework options

| Framework | 1. Direct Anthropic API + 1h cache + Batches | 2. Thinking block signatures & `strict: true` | 3. Pre-tool `PolicyGate` & post-reply `FigureCheck` | 4. Stateless `PendingAction` pause/resume on Lambda | 5. OTel `gen_ai.*` spans & `RunRecord` | 6. Lambda cold start & dependency weight | 7. Fit for Phase 18 (Step Functions + EventBridge) | Overall score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Option 1 (Recommended): Thin Custom Loop on official `anthropic` Python SDK + Pydantic v2 + Step Functions & EventBridge** | **Native (10/10)** — first-day support for `cache_control` (1h), `strict: true`, server-side web search, PDF document blocks, and Message Batches. | **Exact (10/10)** — `response.content` blocks (including signed `thinking` blocks) are appended unchanged. | **Native (10/10)** — `PolicyGate.check()` runs at the exact `tool_use` dispatch point; `FigureCheck.verify()` runs before `outbox.fifo` enqueue. | **Native (10/10)** — `ask_user` or `draft_*` serializes `PendingAction` to DynamoDB and returns immediately. | **Exact (10/10)** — wraps `client.messages.stream` directly to capture TTFT, cache tokens, and `msg_id`. | **Fastest (10/10)** — only `anthropic` + `pydantic` + `httpx` (~15 MB, `< 250 ms` cold start). | **Exact (10/10)** — Step Functions + EventBridge handle multi-agent workflows with per-Lambda IAM roles. | **10 / 10 (Recommended)** |
| **Option 2: `PydanticAI` (`pydantic-ai`)** | **Good (7/10)** — supports `AnthropicModel`, but fine-grained 1h `cache_control` per content block, isolated server-side `web_search` sub-calls, and Message Batches require dropping down to the raw `anthropic` client anyway. | **Good (8/10)** — Pydantic v2 tool schemas are clean (`@agent.tool`, `RunContext[Deps]`), though message history maps through PydanticAI's generic `ModelMessage` AST. | **Good (8/10)** — tool wrappers can call `PolicyGate`, and `@agent.result_validator` can run `FigureCheck`. | **Fair (6/10)** — assumes an in-process loop unless manually exited via custom exception/result type. | **Good (8/10)** — built-in Logfire/OTel GenAI spans, though custom `mypaisa.*` attributes and `RunRecord` still need our wrapper. | **Light (8/10)** — moderate dependency tree (~35 MB). | **Good (8/10)** — works inside individual Lambdas, while Step Functions still does orchestration. | **7.9 / 10 (Runner-up; borrow `RunContext[Deps]` pattern)** |
| **Option 3: AWS Strands Agents SDK (`strands-agents`)** | **Weak for direct API (5/10)** — built primarily for Amazon Bedrock Converse API; direct Anthropic API features (1h cache, server-side web search, Message Batches, Console credits) are second-class. | **Fair (6/10)** — normalizes messages to Bedrock Converse format. | **Good (7/10)** — supports tool interceptors/callbacks. | **Fair (6/10)** — session state persistence exists, but tailored to conversational memory rather than Confirm-card `PendingAction` rows. | **Strong (9/10)** — native AWS OTel GenAI spans for CloudWatch GenAI Observability. | **Light (8/10)** — lightweight AWS package. | **Strong (9/10)** — AWS reference patterns for Lambda + Step Functions. | **7.1 / 10 (Best if on Bedrock, not direct Anthropic API)** |
| **Option 4: `LangGraph` (`langgraph` + `langchain-anthropic`)** | **Weak (5/10)** — `ChatAnthropic` wraps the SDK in `BaseMessage` abstractions that frequently lag or mangle block-level `cache_control`, server-side tools, and Message Batches. | **Fragile (5/10)** — converting `AIMessage` back and forth has historically broken Claude thinking signatures and citations. | **Good (7/10)** — graph nodes can run pre-tool and post-reply checks. | **Strong but redundant (8/10)** — `interrupt()` + checkpointer pauses graphs, but requires a custom DynamoDB checkpointer that duplicates `PendingAction`. | **Fair (6/10)** — built for LangSmith first; OTel conversion adds another layer. | **Heavy (4/10)** — `langchain-core` + `langgraph` pull 70+ packages, adding 150–300 ms to Lambda cold start. | **Redundant (5/10)** — in-process graph orchestration duplicates AWS Step Functions and EventBridge. | **5.7 / 10 (Not recommended)** |
| **Option 5: `Claude Agent SDK` (`claude-agent-sdk`)** | **Good (8/10)** — official Anthropic SDK, but aimed at interactive CLI / container coding agents. | **Strong (9/10)** — native Claude message handling. | **Strong (9/10)** — its `PreToolUse` hook model inspired our `PolicyGate` (`§23.2`). | **Weak on Lambda (4/10)** — designed around a stateful long-running process/session rather than stateless per-turn SQS Lambda invocations. | **Fair (6/10)** — requires custom OTel + `RunRecord` wiring. | **Medium (6/10)** — bundles local process/MCP runtime helpers we do not use. | **Weak (5/10)** — subagents run inside one process, losing per-agent IAM roles on AWS. | **6.7 / 10 (Borrow hook design, do not run in Lambda)** |
| **Option 6: `CrewAI` / `AutoGen` / `Agno`** | **Poor (3/10)** — high-level prompt wrappers obscure Anthropic-specific features and caching. | **Poor (4/10)** — free-text inter-agent chat loses strict schema guarantees. | **Poor (3/10)** — chatty agent-to-agent loops make deterministic figure checking and taint tracking hard. | **Poor (3/10)** — assumes in-memory multi-agent conversation. | **Fair (5/10)** — generic OTel plugins, noisy spans from internal agent chatter. | **Heavy (3/10)** — large dependency trees. | **Poor (2/10)** — runs all agents in one process, violating least-privilege IAM per agent (`§20.2`). | **3.3 / 10 (Rejected)** |

#### Recommendation (`MA-265`)

We recommend **Option 1: a thin, explicit ~300-line Python agent loop (`AnthropicAgentRunner`, `MA-271`) built directly on the official `anthropic` Python SDK + Pydantic v2, orchestrated across agents by AWS Step Functions and Amazon EventBridge** (`ARCHITECTURE.md` §8 & §20), while **adopting `PydanticAI`'s typed `RunContext[Deps]` decorator pattern** for our tool definitions (`src/mypaisa_agent/agent/tools.py`).

Why this combination gives MyPaisa the best of both worlds:

1. **Zero abstraction tax on Claude features:** We pass raw Anthropic content blocks (`text`, `thinking` with `signature`, `tool_use`, `tool_result`, `document` PDF blocks, and `cache_control={"type": "ephemeral", "ttl": "1h"}`) directly to `anthropic.Anthropic().messages.stream(...)` and `client.messages.batches.create(...)`.
2. **FastAPI-grade developer ergonomics for tools (borrowed from PydanticAI):** Every tool is a Python function decorated with `@tool(name="...", read_only=True, agents=("concierge",))` whose arguments are a **Pydantic v2 `BaseModel`**, exported to Anthropic with `strict: true` JSON Schema (`anthropic.transform_schema(Model)`), and receiving a typed `RunContext` (`household_id`, `member_id`, `role`, `registry`, `tracer`, `tainted`).
3. **Deterministic guardrails sit directly in the loop (`§23.2`):**
   ```
   stream Claude turn -> append thinking & text deltas to TurnBuffer (SSE)
     -> if stop_reason == "tool_use":
          for each tool_use block:
            1. PolicyGate.check(ctx, tool_name, tool_input)   # 5 deterministic rules + taint check
            2. if tool is ask_user or draft_*/propose_*:
                 save PendingAction to DynamoDB -> emit CardEvent -> exit Lambda cleanly
            3. execute typed Python tool under OTel span "tool <name>"
          loop (up to max_turns=6)
     -> when stop_reason == "end_turn":
          FigureCheck.verify(reply_text, tool_results, user_words)
          write RunRecord + Conversation turn -> enqueue to outbox.fifo
   ```
4. **Hardware-grade multi-agent isolation in Phase 18:** Instead of an in-memory multi-agent framework (`CrewAI` / `LangGraph`) where all agents share one IAM role and chat in prose, Phase 18 uses **AWS Step Functions** (for the 06:30 / 21:05 daily brief pipeline) and **Amazon EventBridge (`mypaisa-<env>-events`)** (for reactive events), with each agent running in its own Lambda under its own least-privilege IAM role (`§20.2`).

---

### 6.4 Detailed four-layer implementation stack (`MA-265`, `MA-266`)

#### Layer 1: Web Front End (`web/`) — SvelteKit 3.1, TanStack, `shadcn-svelte`, Tailwind CSS 4.3

| Area | Package & version | How it is used in MyPaisa (`MA-194`, `MA-73`, `MA-199`, `MA-208`, `MA-266`) |
| --- | --- | --- |
| **App framework & build** | `@sveltejs/kit` **3.1**, `svelte` **5.57** (runes: `$state`, `$derived`, `$effect`), `@sveltejs/adapter-static` **3.1**, `vite` **8.3**, `typescript` **6.0**, `pnpm` **12** workspace catalog | Static SPA + PWA served from S3 + CloudFront (`dashboard(-dev).mypaisapp.com`), with a CloudFront Function routing extension-less page paths to `/index.html` while serving `/.well-known/apple-app-site-association` directly. |
| **Design tokens & styling** | `tailwindcss` **4.3** (`@tailwindcss/vite`), `docs/design/shared/tokens.css` (DS v1 **Warm ledger**) | CSS-first `@theme` mapping every Tailwind utility (`bg-surface`, `text-ink`, `border-rule`, `text-gain`, `text-loss`, `font-mono` tabular numerals) onto the Warm ledger light/dark tokens (`#FAF8F3` warm ivory / `#0E1014` obsidian, `#155E4B` forest emerald, `#9E6B18` brass). |
| **UI component primitives** | `shadcn-svelte` **1.7** on `bits-ui` **2.20**, `lucide-svelte` (`@lucide/svelte`), `tailwind-variants`, `clsx`, `tailwind-merge` | Accessible headless primitives (sheets, dialogs, popovers, command palette, tabs, segmented controls, tooltips, toast alerts) owned in `web/src/lib/components/ui/` and styled to match the Claude Design boards. |
| **Server state & live SSE cache** | `@tanstack/svelte-query` **6.3** (`@tanstack/query-core`) | Holds every server read (`records`, `views`, `turns`, `runs`, `projection`, `scorecards`). The SSE client (`GET /v1/stream`) writes incoming `StreamEvent` deltas and confirmed record changes directly into `queryClient.setQueryData(...)`, so every open tab updates in real time without polling. |
| **Tables & virtualized lists** | `@tanstack/table-core` **9.3**, `@tanstack/svelte-virtual` **3.13** | Powers sorting, owner/country/currency filtering, and column pinning on Assets & Debts, Statement lines, Audit log, and Activity runs; virtualizes the chat timeline and statement imports with thousands of rows at 60 fps. |
| **In-place correction & settings forms** | `@tanstack/svelte-form` **1.33** + `zod` **4.0** | Powers in-place cell editing on editable `Kind` fields (`PATCH /v1/records/{id}`, `MA-74`, `MA-201`) and Admin center settings with optimistic updates and schema validation. (Remember Rule 1: creation happens in the chat, never via creation forms.) |
| **Charts** | `layerchart` **2.9** (`shadcn-svelte` charts on D3 scales) + `lightweight-charts` **5.2** (TradingView) | LayerChart renders the wealth breakdown, allocation rings, 20-year Projection fan/stack, and Budget forecast bars in DS v1 tokens; `lightweight-charts` is loaded lazily only on market holding price/candlestick views (Phases 10+). |
| **Motion system** | `motion` **14** + Svelte transitions + `docs/design/shared/motion.css` | Shared arrival stagger, spring sheets, and tabular figure roll (`MA-182`), snapping immediately under `prefers-reduced-motion: reduce`. |
| **Shared contract & codegen (`web/src/lib/`)** | `openapi-typescript` **7.x** + generated Pydantic card schemas (`MA-174`, `MA-266`) | Generates `web/src/lib/api-types.d.ts` from FastAPI's OpenAPI 3.1 schema and shares query keys, fetchers, W3C `traceparent` generator, GBP, INR, USD and EUR formatters (rupees in `lakh`/`crore`), and privacy masks with the iOS React Native shell. |
| **Quality gates** | `svelte-check`, `eslint` **10**, `vitest` **5** + `@testing-library/svelte`, `@playwright/test` **1.64** + `@axe-core/playwright` | Type-check, unit tests, WCAG 2.1 AA axe checks, board-fit checks across 320–1920 px in Chromium and WebKit, and pixel parity checks against the Claude Design boards. |

#### Layer 2: Native iOS App (`ios/`) — React Native 0.88 Bare Shell + Swift 6 SwiftUI Core

| Area | Technology & version | How it is used in MyPaisa (`MA-165`, `MA-166`, `MA-163`, `MA-168`–`MA-173`, `MA-181`) |
| --- | --- | --- |
| **TypeScript shell & runtime** | `react-native` **0.88** (bare, **New Architecture** only: Fabric C++ renderer, TurboModules, JSI, **Hermes** bytecode engine, `react` **19.3**, `typescript` **6.0**, no Expo) | Runs the shared TypeScript data layer (`#lib` -> `web/src/lib/`), auth token refresh, SSE `GET /v1/stream` client, offline queue, and navigation coordinator off the main UI thread. |
| **Native dependency manager** | **Swift Package Manager (`react-native spm`)** + Xcode 17 (`iOS 26` SDK) | Zero CocoaPods (ahead of CocoaPods trunk going read-only on 2 Dec 2026, `MA-229`). Every native module builds through SPM. |
| **State & encrypted offline cache** | `@tanstack/react-query` **5.105** + `react-native-mmkv` **4.3** (on **Nitro Modules** JSI) | Persists the TanStack Query cache into AES-256-GCM MMKV storage whose key lives in the iOS Keychain (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`), so the app opens in `< 50 ms` offline showing last-known figures with their timestamp (`MA-173`). |
| **Native gestures & worklets** | `react-native-reanimated` **4.7** (`react-native-worklets` **0.13**), `react-native-gesture-handler` **3.4** | Drives 120 Hz ProMotion sheet detents (`600–1132 pt` chat sheet on iPad/foldable) and swipe gestures. |
| **Native SwiftUI visual core (`ios/MyPaisaCore/`)** | **Swift 6.1** (strict concurrency, `@MainActor`, `@Observable`), **SwiftUI**, **Swift Charts**, **Liquid Glass** (`.glassEffect()` on navigation bars, tab bars, and floating controls only) | Every screen and chat card a member looks at is a native SwiftUI view hosted inside a thin Fabric component (`UIHostingController`), reading Warm ledger tokens compiled from `tokens.css`. Never puts Liquid Glass on data cards or tables (`ARCHITECTURE.md` §9.2). |
| **Apple platform frameworks** | `AuthenticationServices` (Sign in with Apple + Passkeys), `LocalAuthentication` (Face ID app lock & second check `MA-76`), `VisionKit` (`VNDocumentCameraViewController` for statement scans `MA-37`), `UserNotifications` (APNs `MA-170`), `WidgetKit` | Native iOS security, biometric re-authentication bound to `PendingAction` nonce, camera document scanning, and privacy screen-blanking in the app switcher (`MA-171`). |
| **Quality gates** | `SwiftLint`, `XCTest`, `swift-snapshot-testing` (`PointFree`), `XCUIAccessibilityAudit`, Maestro flows (`.maestro/`) | Snapshot tests in light/dark + Dynamic Type `AX5`, VoiceOver accessibility audit, and 120 Hz scroll/cold-start benchmarks (`MA-165`, `MA-166`). |

#### Layer 3: Python Backend (`src/mypaisa_agent/`) — Python 3.14, FastAPI, Pydantic v2, DynamoDB & DuckDB

| Area | Package & version | How it is used in MyPaisa (`MA-24`, `MA-27`, `MA-28`, `MA-29`, `MA-30`, `MA-31`, `MA-266`) |
| --- | --- | --- |
| **Language & toolchain** | **Python 3.14** (`arm64` Graviton3 Lambda container image), `uv` **0.11**, `ruff` **0.15**, `pyright` **1.1.408** (strict mode) | Single multi-target `Dockerfile` (`public.ecr.aws/lambda/python:3.14-arm64`) built on AWS CodeBuild `arm64` (`MA-237`) and deployed by image digest via Terraform. |
| **REST API & SSE streaming** | `fastapi` **0.115+**, `pydantic` **2.11+**, `mangum` **0.19+**, `uvicorn` **0.34+**, **AWS Lambda Web Adapter 1.1** (`public.ecr.aws/awsguru/lambda-adapter:1.1.0-aarch64`) | `handlers/api` runs FastAPI via `Mangum` for buffered REST endpoints (`< 300 ms` cold start). `handlers/stream` runs FastAPI `StreamingResponse` on `Uvicorn` behind Lambda Web Adapter 1.1 (`AWS_LWA_INVOKE_MODE=response_stream`) for `GET /v1/stream`. Exports `openapi.json` for `openapi-typescript` (`MA-266`). |
| **DynamoDB single-table layer** | `boto3` **1.38+**, `boto3-stubs[dynamodb,s3,sqs,ssm,sns,events,stepfunctions]` (`mypy-boto3-dynamodb`) | Typed single-table repository (`src/mypaisa_agent/registry/`) with `TypeSerializer`/`TypeDeserializer`, `Decimal`-only money serialization, `ForbiddenScanError` guard, and `TransactWriteUnit` enforcing the hash-chained `AuditEvent` (`MA-27`, `MA-28`). |
| **Analytical & quantitative engine** | `duckdb` **1.2+**, `pyarrow` **19+**, `pandas` **2.2+**, `numpy` **2.2+** | Runs `query_ledger_sql` over nightly S3 Parquet snapshots (`MA-104`), deterministic 20-year monthly cash-flow & net-worth projections (`MA-222`–`MA-224`, `MA-262`, `MA-263`), XIRR/TWRR, and portfolio factor/overlap math (`§5`, `§6`, `§12`). |
| **Observability & logging** | `aws-lambda-powertools` **3.x** (`Logger`, `Metrics`), `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-botocore`, `opentelemetry-instrumentation-httpx`, AWS OTel Lambda Layer (`/opt`) | Structured JSON logs with `trace_id`, `span_id`, `request_id`, `run_id` and `member` hash; EMF metrics in `MyPaisa/Agent`; W3C `traceparent` propagation and GenAI spans (`gen_ai.*`, `mypaisa.*`) to `aws/spans` Transaction Search (`MA-29`, `MA-232`, `MA-233`, `MA-266`). |
| **Testing & verification** | `pytest` **9**, `hypothesis` **6** (property-based tests on financial math, audit hash chain, and `FigureCheck`), `moto[dynamodb,s3,sqs,ssm]` **5**, `respx` | `>= 90%` test coverage gate; property tests on every financial calculation and `TransactWriteUnit`; in-memory OTel leak test proving zero PII/figures in spans or logs (`MA-232`). |

---

## 7. CI/CD pipeline, seven-layer vulnerability scanning, smoke suite, phase-wise regression matrix & GitHub Actions runner cost analysis (`MA-267` to `MA-272`)

Arun, 28 Oct 2026 (`MA-272`): track setup and tech-debt stories for the stack and observability foundations (`MA-267` to `MA-271`), design a phase-wise plan for vulnerability scanning, the smoke test suite and the regression test suite across Phases 0 to 20, design the GitHub Actions + AWS CodeBuild (`arm64`) + ECR CI/CD pipeline for `dev` and `prod`, and analyse the expected costs and runner alternatives for running regression and smoke suites on GitHub Actions.

### 7.1 Setup, tech-debt & testing stories (`MA-267` to `MA-272`)

To ensure every architectural choice from `MA-265` and the CI/CD, security, smoke, and regression suites has an explicit build owner in Jira and `docs/trace.json`, six stories complement the existing Phase 0–2 foundations (`MA-24`, `MA-25`, `MA-26`, `MA-29`, `MA-107`, `MA-108`, `MA-165`–`MA-167`, `MA-194`, `MA-198`, `MA-231`–`MA-238`, `MA-246`–`MA-252`, `MA-266`):

| Key | Phase & Epic | Summary | What it closes |
| --- | --- | --- | --- |
| **`MA-267`** | Phase 0 (`MA-9`) | Every pull request, container build and weekly schedule runs the seven-layer vulnerability gate across secrets, SAST, dependencies, Terraform and arm64 ECR images | Adds multi-language SAST (`ruff` Bandit `S`, `semgrep`, `eslint-plugin-security`), iOS Swift `Package.resolved` OSV scanning, `trivy image` + ECR scan-on-push blocking Critical/High CVEs on both `lambda` and `stream` arm64 targets, and a weekly Monday 04:00 UTC CVE sweep + grouped Dependabot updates. |
| **`MA-268`** | Phase 0 (`MA-9`) | A phase-progressive smoke runner checks every deployment in `dev` and `prod`, protects `prod` from synthetic writes, verifies the X-Ray trace in `dev`, and rolls back `prod` on failure | Builds `scripts/smoke.py --env dev|prod --up-to-phase <N>` with full synthetic chat/SSE/X-Ray round-trip verification in `dev`, strictly read-only health/auth/KMS/alarm checks in `prod` (preserving `.claude/rules/aws-changes.md`), and `< 5 s` automatic Lambda `:live` alias + CloudFront rollback. |
| **`MA-269`** | Phase 0 (`MA-9`) | A five-layer regression pyramid and path-filtered CI runner test units, OpenAPI contracts, `moto` integration, golden maths, web and iOS UI, and `T0` agent replays inside the free minute tiers | Builds `scripts/regression.py` across Layers 1–5 and implements the **Option D** path-filtered GitHub Actions + AWS CodeBuild runner strategy so monthly CI cost stays at **£0.00/month**. |
| **`MA-270`** | Phase 2 (`MA-187`) | A typed DynamoDB single-table repository wraps `boto3` `TypeSerializer`, `mypy-boto3-dynamodb` and `TransactWriteUnit` with Pydantic v2 marshaling, scan guard and signed cursor pagination | Implements the concrete Python DynamoDB data-access setup selected in `§6.2` (`keys.py`, `serde.py`, `client.py`, `uow.py`, `pagination.py`) ahead of `MA-27` and `MA-28`. |
| **`MA-271`** | Phase 1 (`MA-10`) | A typed `AnthropicAgentRunner` loop manages prompt caching (three explicit breakpoints and automatic caching for the tail, `ARCHITECTURE.md` §24.1), the Pydantic v2 tool registry, policy and figure hooks, and `gen_ai` OpenTelemetry spans | Implements the concrete custom agent loop selected in `§6.3` (`runner.py`, `tools.py`, `cache.py`) connecting `MA-31`, `MA-233`, `MA-247`, and `MA-248`. |
| **`MA-272`** | Phase 0 (`MA-9`) | The CI/CD pipeline, seven-layer vulnerability scanning, smoke suite, phase-wise regression matrix and GitHub Actions runner cost analysis are recorded in the plan and Confluence with block diagrams | Records this design across `docs/RESEARCH.md` §7, `ARCHITECTURE.md` §18.4, `PLAN.md`, `docs/design/cicd-security-regression.html`, and the Confluence page *CI/CD, vulnerability scanning, smoke and regression architecture*. |

---

### 7.2 Seven-layer vulnerability scanning architecture (`MA-267`)

Every commit, pull request, AWS CodeBuild container build, and weekly schedule passes through seven zero-cost open-source security gates (`scripts/security_scan.py`):

| Gate | Tooling | Where it runs | What it blocks (fail-closed criteria) | Cost |
| --- | --- | --- | --- | --- |
| **1. Secrets detection** | `gitleaks` v8+ | Local `pre-commit` + GitHub Actions `pr-gates.yml` (commit range) | Any AWS key, Anthropic API key, JWT, private key, APNs `.p8`, or high-entropy secret in source, tests, or fixtures. | **£0** |
| **2. Static Application Security Testing (SAST)** | Python: `ruff` (`S` / Bandit rules) + `semgrep` (`p/python`, `p/fastapi`)<br>Web/RN: `eslint-plugin-security` + `semgrep` (`p/typescript`)<br>iOS: `semgrep` (`p/swift`) | GitHub Actions `pr-gates.yml` on `ubuntu-24.04-arm` (`1x`) | Injection patterns, unsafe deserialization (`pickle`, `yaml.load`), `eval`, hardcoded credentials, missing auth dependency on protected FastAPI routes, insecure Keychain or WebView flags in Swift. | **£0** |
| **3. Software Composition Analysis (SCA)** | Python: `uv lock --check` + `pip-audit --strict`<br>Web/RN: `pnpm audit --audit-level=high`<br>iOS: `trivy fs --scanners vuln --severity HIGH,CRITICAL ios/Package.resolved` | `pr-gates.yml` + weekly Monday 04:00 UTC schedule | Any Python wheel, npm package, or Swift Package Manager dependency with a known **Critical** or **High** CVE in PyPI, npm, or OSV. | **£0** |
| **4. Infrastructure-as-Code (Terraform)** | `terraform fmt -check`, `terraform validate`, `tflint`, **`trivy config --severity HIGH,CRITICAL infra/`** + repo SSM rule | `pr-gates.yml` | Any unencrypted DynamoDB/S3/SQS/LogGroup resource, missing S3 `PublicAccessBlock`, wildcard IAM permissions, or any `aws_ssm_parameter` (`SecureString`) not using `value_wo` and `value_wo_version` (`MA-159`). | **£0** |
| **5. Container image CVE scan (`arm64`)** | **`trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed`** + **Amazon ECR Basic Scanning on push** | Inside AWS CodeBuild `arm1.small` right after building `lambda` and `stream` targets (`MA-237`), before ECR promotion | Any OS (`amzn2023`) or Python layer CVE rated **Critical** or **High** with an upstream fix in either `mypaisa:lambda-<sha>` or `mypaisa:stream-<sha>`. | **£0** (ECR Basic Scan is free) |
| **6. LLM & data-boundary security gate** | Inspect AI `T0` security suite (`MA-247`, `MA-249`) + OTel PII-leak scanner (`MA-232`) | `pr-gates.yml` on every PR | Prompt injection via untrusted PDF/web text attempting to invoke a write or exfiltration tool, cross-household key access, missing refusal on trade/tax advice, or any financial figure/PII appearing in logs or OTel spans. | **£0** (`T0` uses recorded cassettes) |
| **7. Live API & security-header scan** | `scripts/smoke.py --security` (TLS, HSTS, CSP with SvelteKit hashes, CORS, `HttpOnly; Secure; SameSite=Strict` cookies, OpenAPI `401` perimeter) | Post-deploy in `release.yml` (`dev` & `prod`) + weekly schedule | Any protected route in `/openapi.json` that fails to return `401` without credentials, permissive CORS, or missing CSP/HSTS headers on CloudFront. | **£0** |

---

### 7.3 Phase-progressive smoke test suite & `prod` read-only safety (`MA-268`)

`scripts/smoke.py --env dev|prod --up-to-phase <N>` completes in **under 45 seconds** and runs automatically in `.github/workflows/release.yml` after `dev` deploys and immediately after `prod`'s Lambda `:live` aliases flip.

Because `.claude/rules/aws-changes.md` and `ARCHITECTURE.md` §18.1 forbid any script from writing synthetic records into `prod` DynamoDB tables, **`dev` and `prod` execute distinct smoke profiles**:

| Check | `dev` (`--env dev`, synthetic household) | `prod` (`--env prod`, household data protected) |
| --- | --- | --- |
| **1. Build & SHA parity** | `GET https://api-dev.mypaisapp.com/v1/health` returns `200`, `git_sha == $GITHUB_SHA`, `env == "dev"`. | `GET https://api.mypaisapp.com/v1/health` returns `200`, `git_sha == $GITHUB_SHA`, `env == "prod"`. |
| **2. Deep read-only infra probe** | `GET /v1/health?deep=1` (authenticated with CI smoke HMAC header) runs read-only `DescribeTable`, `HeadBucket`, `GetQueueAttributes`, and SSM/KMS placeholder check. | Same read-only `GET /v1/health?deep=1` probe against `prod` resources — **zero writes**. |
| **3. Web door & Universal Links** | Fetches `https://dashboard-dev.mypaisapp.com`, asserts HTTP `200`, HSTS/CSP headers, and valid `.well-known/apple-app-site-association` JSON. | Same against `https://dashboard.mypaisapp.com`. |
| **4. OpenAPI `401` auth perimeter** | Calls every protected operation in `/openapi.json` without credentials and asserts `401`; mints a token for the synthetic `dev` smoke member via Cognito `AdminInitiateAuth`. | Calls every protected operation in `/openapi.json` without credentials and asserts `401`; verifies Cognito OIDC discovery & passkey challenge endpoint return `200` — **never mints or mutates a `prod` user**. |
| **5. FastAPI SSE stream (`stream` Lambda)** | Opens `GET /v1/stream` with the synthetic `dev` member token, asserts `200 text/event-stream`, receives the initial `hello`/heartbeat frame in `< 2 s`, and reads `x-mypaisa-trace-id`. | Asserts unauthenticated `GET /v1/stream` returns `401` and `GET /v1/health/stream` returns `200` with `git_sha == $GITHUB_SHA`. |
| **6. Synthetic chat turn & queue round-trip** | Posts a deterministic zero-cost `smoke-ping` turn to `POST /v1/chat/messages`, receives the streamed reply over `/v1/stream`, and verifies the `RunRecord` in `mypaisa-dev`. | **Skipped in `prod`** — never writes synthetic turns, events, or `RunRecord` items into `prod`. |
| **7. End-to-end X-Ray trace & alarm check (`MA-232`)** | Polls `aws xray batch-get-traces --trace-ids <x-mypaisa-trace-id>` (up to 20 s) and asserts one unbroken trace across `api` $\rightarrow$ `SQS` $\rightarrow$ `agent` $\rightarrow$ `sender` with zero PII. | Verifies the `/v1/health?deep=1` trace in X-Ray and asserts CloudWatch alarm `mypaisa-prod-lambda-errors` remains `OK` across the 60 s post-cutover window. |

**Automatic rollback (`< 5 seconds`):** Before flipping `prod`'s `:live` aliases, `release.yml` records the current version number of each Lambda (`PREV_VERSIONS`) and the current `mypaisa-prod-web` S3 manifest. If `scripts/smoke.py --env prod` exits non-zero, the workflow immediately runs `aws lambda update-alias --function-name <fn> --name live --function-version <prev>` across all Lambdas, restores the S3 web manifest, invalidates CloudFront, and publishes a P1 rollback alert to the owner's SNS topic (`MA-107`, `MA-268`).

---

### 7.4 Five-layer regression test pyramid & phase-wise rollout matrix (Phases 0 to 20, `MA-269`)

#### The five regression layers (`scripts/regression.py`)

1. **Layer 1 — Unit, Property-Based (`hypothesis`) & OpenAPI Contract Gate (`~20 s` on Linux `1x`, every PR):** `ruff`, `pyright` (strict), `pytest` unit + Hypothesis property tests (currency minor units, tax bands, loan schedules, hash chains), `svelte-check`, `vitest`, iOS `Jest` (TypeScript shell & card schemas), `openapi-typescript` zero-diff verification against FastAPI's `app.openapi()` (`MA-266`), and `python3 scripts/maestro_local.py check-syntax` + `TestIDs.swift` <-> `web/src/lib/test-ids.ts` parity (`MA-273`).
2. **Layer 2 — Local Full-Stack Integration (`moto` + FastAPI ASGI, `~30 s` on Linux `1x`, every PR):** Runs the full `api` $\rightarrow$ `updates.fifo` $\rightarrow$ `agent` $\rightarrow$ `TransactWriteUnit` (`mypaisa-local`) $\rightarrow$ `outbox.fifo` $\rightarrow$ `sender` $\rightarrow$ `stream` SSE pipeline in-process against the seeded synthetic household (`MA-110`, `MA-198`).
3. **Layer 3 — Deterministic Agent Replay (`T0`) & Golden Maths Fixtures (`~45 s` on Linux `1x`, every PR):** Replays recorded multi-turn conversations through `AnthropicAgentRunner`, `PolicyGate` (`MA-247`), `FigureCheck` (`MA-248`), the red-team refusal suite (`MA-249`), and the OTel PII-leak test (`MA-232`) with zero network calls (`MA-246`), plus the **646 wealth-tracker golden test cases** (`MA-105`) and **11 Agentic Trading Desk indicator golden fixtures** (`MA-34`).
4. **Layer 4 — Web & iOS Visual, Responsive & Accessibility Regression (path-gated on PRs + `main`, plus local Apple Silicon Maestro):**
   - **Web & Boards (`ubuntu-24.04-arm`, `1x`):** `node scripts/board_fit.js` across 320–1920 px in Chromium and WebKit (`MA-240`), `python3 scripts/contrast_check.py` at 100% and 25% brightness, and Playwright (`390x844` and `1440x900`, light and dark, `prefers-reduced-motion`, `@axe-core/playwright` WCAG 2.2 AA).
   - **iOS Native (`macos-15` or self-hosted Mac, path-gated to `ios/**` and `cards/**`, plus local Apple Silicon Maestro):** `XCTest`, `XCUITest` (including hardware keyboard `Cmd+*` shortcuts), `swift-snapshot-testing` (iPhone & iPad, light & dark, Large & Dynamic Type `AX5`, privacy mode on), and `XCUIAccessibilityAudit` (`MA-166`, `MA-181`), paired locally on Apple Silicon with `python3 scripts/maestro_local.py run --up-to-phase <N>` across the five cloned `MyPaisa-Maestro-*` simulators (`MA-273`, `MA-274`).
5. **Layer 5 — Change-Gated Live LLM Evals (`T1` & `T2`, `MA-250`, `MA-251`):**
   - **`T1`:** ~40 golden tasks $\times$ 3 trials on the `evals` workspace ($10/run cap, $30/mo cap) only when a PR touches a prompt, tool, guard, agent loop, model route, `Kind` template, or the Anthropic SDK.
   - **`T2`:** Full suite $\times$ 5 trials before a release promotes a changed model ID to `prod`.

#### Phase-wise testing rollout matrix (Phases 0 to 20)

| Phase | Phase focus | Regression additions (L1–L5) | Smoke additions (`scripts/smoke.py`) | Security / vulnerability additions |
| --- | --- | --- | --- | --- |
| **Phase 0** | Foundations, skeletons & watch tower (`MA-9`) | L1: `plan_sync.py`, `contrast_check.py`, `board_fit.js`, Python/Web/iOS skeletons, OpenAPI contract check, `maestro_local.py check-syntax` + `TestIDs` parity (`MA-273`).<br>L2: `moto` local stack (`MA-198`) + synthetic seed (`MA-110`).<br>L3: Inspect AI harness + manifest coverage gate (`MA-246`).<br>L4 (local): `maestro_local.py` cloned pool + `p00_shell_smoke.yaml` (`MA-273`); `ExportOptions-Internal.plist` (`MA-167`). | `--up-to-phase 0`: `/v1/health`, `/v1/health?deep=1`, CloudFront headers, watch tower log groups & alarms (`MA-231`). | All 7 security gates active (`gitleaks`, `ruff S`, `semgrep`, `pip-audit`, `pnpm audit`, `trivy config`, `trivy image`, ECR scan); `testFlightInternalTestingOnly` & Release `#if DEBUG` strip check (`MA-167`, `MA-273`). |
| **Phase 1** | Talk: sign-in, chat, SSE streaming & guardrails (`MA-10`) | L1/L2: Cognito Apple/Google/passkey custom-auth triggers, session epoch revocation, second check (`MA-76`), SQS FIFO ordering & DLQ replay (`MA-139`/`140`), `RunRecord` & OTel spans (`MA-29`/`232`/`233`/`266`/`271`), `GET /v1/app/minimum-version` (`MA-167`/`266`).<br>L3: `PolicyGate` (`MA-247`), `FigureCheck` (`MA-248`), refusal suite (`MA-249`).<br>L4: Playwright, XCUITest & local Maestro (`p01` 4-band rotation, invite link, SSE, push; `MA-273`) for sign-in, chat, SSE resume, VoiceOver & AX5 (`MA-181`).<br>L5: `T0` replay + `T1` 40-task golden set (`MA-250`). | `--up-to-phase 1`: Synthetic `dev` sign-in, `/v1/stream` SSE handshake, round-trip chat turn, X-Ray full trace check (`api` $\rightarrow$ SQS $\rightarrow$ `agent` $\rightarrow$ `sender`), unauthenticated `401` scan across all `/v1/*` routes. | OTel PII-leak gate in CI (`MA-232`); untrusted-text taint tool narrowing check (`MA-247`); S3 presigned upload KMS & MIME check (`MA-148`). |
| **Phase 2** | First record: dynamic structure & one write path (`MA-187`) | L1: Hypothesis property tests on `Kind` specs, `Decimal` minor units, and `AuditEvent` SHA-256 chain (`MA-27`, `MA-28`, `MA-270`).<br>L2: `TransactWriteUnit` atomicity; Confirm/Cancel card state machine; inline edit (`MA-201`).<br>L4: Home & Wealth screens at 320–1920 px. | `--up-to-phase 2`: Read-only check that initial `Kind` specs (`savings`, `cash`, `property`, `pension`) exist and `dev` audit hash-chain verifier passes. | Cross-household & cross-member visibility isolation fuzzing (`MA-33`, `MA-74`). |
| **Phase 3–4** | Deposits, policies, four currencies, debts & check-ins (`MA-188`, `MA-192`) | L1/L3: Compound deposit accrual, PPF/EPF/NPS/SGB/LIC schedules, loan amortisation & early-closure maths (`MA-105`), GBP/INR dual-currency rollups, monthly check-in batching. | `--up-to-phase 4`: Read-only check on `dev` seed's GBP/INR totals and commitment schedule endpoints. | Bounds validation on interest rates, tenors, and FX rates to prevent overflow/DoS. |
| **Phase 5–7** | Investments priced, Budget statements & 20-Year Projection (`MA-189`, `MA-190`, `MA-191`) | L2: Statement PDF/CSV parser pipeline (`Document` row written before extraction, lesson 15), transfer deduplication.<br>L3: **646 wealth-tracker golden cases** (XIRR, TWRR, 20-year monthly Projection + budget rearrangement `MA-262`/`263`); untrusted PDF statement prompt-injection `T0` cases. | `--up-to-phase 7`: `dev` smoke queries `/v1/projection` and `/v1/budget` for the synthetic household and asserts deterministic figure vectors. | Polyglot/malformed PDF rejection; strict taint isolation when parsing bank/card statements (`MA-247`). |
| **Phase 8–9** | Audit, search, Admin center & full dashboard cutover (`MA-14`, `MA-18`) | L2: DuckDB-over-Parquet `query_ledger_sql` (`MA-104`), Excel history importer dry-run/commit/rollback (`MA-111`), Admin center approvals behind second check (`MA-76`).<br>L4: Admin center & full dashboard Playwright/XCUITest suite. | `--up-to-phase 9`: Read-only audit chain verification & Admin health summary endpoint check. | SQL read-only sandbox check on `query_ledger_sql` (DuckDB `access_mode='READ_ONLY'`, no file/network extensions). |
| **Phase 10–17** | Market engine, briefs, research cards, news, stances & Forecaster (`MA-11`–`MA-17`, `MA-118`) | L3: **11 trading-desk golden indicator fixtures** (RSI, MACD, Bollinger, ATR, ADX, Supertrend, Ichimoku, pillars, cascade, confidence calibration) verified to $10^{-6}$; Forecaster walk-forward grading (`MA-120`). | `--up-to-phase 17`: Price source chain health check & indicator calculation latency check (`< 150 ms`). | SSRF allowlist guard on market/news fetchers; strict compliance refusal gate ensuring zero buy/sell imperative language (`MA-249`). |
| **Phase 18–20** | Autonomous agent team, Indian markets & iOS extensions (`MA-127`, `MA-151`, `MA-169`) | L2: Step Functions state machine & EventBridge `traceparent` propagation (`MA-235`), per-agent IAM least-privilege boundaries, CAS importer & Indian lakh/crore parity, WidgetKit/Share Extension XCUITests. | `--up-to-phase 20`: Step Functions definition check, agent heartbeat metrics in CloudWatch (`MA-235`), dual-currency `£`/`₹` parity check. | Per-agent tool allowlist enforcement (`MA-247`: `market_data`, `quant`, `research` cannot call write tools); CAS password never logged. |

---

### 7.5 Deep cost analysis & runner alternatives for GitHub Actions vs AWS CodeBuild (`MA-269`, `MA-272`)

#### 2026 GitHub Actions & AWS CodeBuild pricing mechanics

| Runner environment | Included monthly free quota (private repo) | Minute multiplier | Overage rate (after free quota) | Architectural note |
| --- | --- | --- | --- | --- |
| **GitHub Linux x64 (`ubuntu-latest`)** | **2,000 mins/mo** (GitHub Free)<br>**3,000 mins/mo** (GitHub Pro) | **1x** | **$0.008 / min** (~£0.0063/min) | 1 wall-clock minute = 1 quota minute. |
| **GitHub Linux Arm64 (`ubuntu-24.04-arm`)** | Shares the 2,000 / 3,000 mins/mo pool | **1x** | **$0.005 / min** (~£0.0040/min) | **37% cheaper overage** and matches AWS Lambda Graviton3 `arm64` natively. |
| **GitHub macOS Apple Silicon (`macos-15` M1)** | Shares the 2,000 / 3,000 mins/mo pool | **10x** | **$0.080 / min** (~£0.0630/min) | **1 wall-clock minute burns 10 quota minutes!** Just **200 real minutes** (twenty 10-minute Xcode simulator runs) exhausts the entire 2,000-minute monthly free tier. |
| **AWS CodeBuild Linux Arm64 (`arm1.small`, 2 vCPU, 3 GB)** | **100 build mins/mo** (Always Free tier) | **1x** | **$0.0034 / min** (~£0.0027/min) | **Less than half the cost of GitHub Linux** past the free tier, with native Graviton `arm64` and local VPC/ECR speed (`MA-237`). |
| **Self-hosted runner on developer Mac (`[self-hosted, macOS, ARM64]`)** | **Unlimited** | **0x** | **$0.00 / min** | **Zero GitHub minutes billed**, warm Xcode `DerivedData` cache (`~90 s` iOS build vs `~8 min` cold on GitHub). |

#### Monthly workload model (40 PRs / ~60 PR pushes + 25 merges to `main` + 30 nightly/weekly runs)

| CI job / suite | Wall-clock duration | Runner class |
| --- | --- | --- |
| **Fast Linux PR gates** (`ruff`, `pyright`, `pytest` L1–L3, `moto` ASGI, `T0` replay, `gitleaks`, `semgrep`, `pip-audit`, `trivy config`, `terraform plan`) | **~2.5 min** (with `uv` & `pnpm` cache) | Linux `arm64` (`1x`) |
| **Web & board visual/a11y regression** (`Playwright` 390/1440 light/dark + `axe-core` + `board_fit.js`) | **~3.5 min** | Linux `arm64` (`1x`) |
| **iOS TypeScript shell & card tests** (`Jest` + card JSON schema parity + `eslint`) | **~1.0 min** | Linux `arm64` (`1x`) |
| **iOS native SwiftUI build + `XCTest` / `XCUITest` / Snapshot / AX5** (Xcode Simulator) | **~8.0 min** (with SPM cache on `macos-15`) | macOS (`10x` on GitHub = **80 billed mins/run**) |
| **Docker multi-stage `arm64` build (`lambda` + `stream`) + `trivy image` + ECR push** | **~2.5 min** | AWS CodeBuild `arm1.small` |
| **Release deploy + smoke suite (`scripts/smoke.py --env dev` & `prod`)** | **~2.5 min** (`dev`), **~2.0 min** (`prod`) | Linux `arm64` (`1x`) |
| **Nightly Terraform drift (`MA-108`) + weekly CVE sweep (`MA-267`)** | **~1.5 min**/night + **~4.0 min**/week | Linux `arm64` (`1x`) |

#### Comparison of the four runner strategies

| Strategy | How regression & smoke suites run | Real Linux mins/mo | Real macOS mins/mo | Billed GitHub mins/mo (incl. 10x macOS) | AWS CodeBuild mins/mo | Expected monthly CI cost |
| --- | --- | --- | --- | --- | --- | --- |
| **Option A: Naive "run everything on every PR" on GitHub-hosted runners** | Every PR push (60/mo) and `main` merge (25/mo) runs Linux gates, Playwright, and macOS Xcode `XCUITest` on GitHub-hosted runners. | ~680 mins (`680` billed) | ~680 mins (**`6,800` billed**) | **7,480 billed mins** (5,480 over free tier) | ~63 mins (Free) | **~$44 / £35 per month** (wasted on running Xcode Simulator on PRs that never touched `ios/`) |
| **Option B: Path-filtered + tiered GitHub-hosted runners only** | Linux fast gates on every PR (60/mo); Playwright + `board_fit.js` only when `web/**`, `cards/**`, or `docs/design/**` change (~25 runs/mo + `main`); iOS `Jest` on Linux (`1x`); macOS `XCUITest` on `macos-15` only when `ios/**` native Swift changes + TestFlight merges (~15 runs/mo). | ~450 mins (`450` billed) | ~120 mins (`1,200` billed) | **1,650 billed mins** (inside 2,000 free quota) | ~63 mins (Free) | **£0.00 / month** (or ~£4/mo in an unusually heavy iOS month) |
| **Option C: Offload Linux regression + Docker + smoke to AWS CodeBuild (`arm1.small`)** | GitHub Actions triggers AWS CodeBuild `arm1.small` for Docker builds, full `pytest` + Playwright regression, and `dev`/`prod` smoke tests; GitHub runs lightweight orchestration and path-gated `macos-15`. | ~120 mins (`120` billed) | ~120 mins (`1,200` billed) | **1,320 billed mins** (inside 2,000 free quota) | ~420 mins (100 free + 320 @ $0.0034/min) | **~$1.09 / £0.85 per month** on AWS CodeBuild, **£0.00** on GitHub |
| **Option D (Selected): Hybrid path-filtered GitHub `ubuntu-24.04-arm` + AWS CodeBuild `arm1.small` (Docker) + split iOS testing** | 1. **Docker builds + `trivy image`:** AWS CodeBuild `arm1.small` on `main` merges (~63 mins/mo $\le$ 100 free mins, `MA-237`).<br>2. **Every PR on GitHub `ubuntu-24.04-arm` (`1x`):** L1–L3 `pytest`/`moto`/`T0`/security/TF plan + iOS `Jest` (~2.5 min/PR).<br>3. **Path-gated Playwright (`1x`):** Only when `web/**`, `cards/**`, or `docs/design/**` change.<br>4. **Native SwiftUI `XCUITest`:** Path-gated to `ios/**` changes, with optional local/self-hosted Mac runner label or `macos-15` within the remaining 1,550 free minutes. | ~450 mins (`450` billed) | 0–120 mins (`0–1,200` billed) | **450 to 1,650 billed mins** (`< 2,000` free quota) | ~63 mins (`< 100` free quota) | **£0.00 / month** across both GitHub Actions and AWS CodeBuild |

---

## 8. Local iOS & iPadOS testing strategy with Maestro, phase-wise rollout, and private 90-day TestFlight beta plan (MA-167, MA-273, MA-274)

Arun asked on 29 Oct 2026 (`MA-273`, `MA-274`) for:
1. A detailed strategy and phase-by-phase plan for **local iOS and iPadOS end-to-end testing using Maestro** on this Apple Silicon Mac across Phases 0 to 20.
2. How to keep **MyPaisa privately installed on physical iPhones and iPads for 3 months (90 days) — and rolling indefinitely — using TestFlight** for household beta testing without ever publishing the app to the public App Store (`MA-162`, `MA-164`, `MA-167`).

### 8.1 Local Apple Silicon architecture, Maestro MCP vs. CLI one-owner-per-device rule & cloned simulator pool

Verified on this Apple Silicon Mac on 29 Oct 2026:
- **Maestro CLI & Studio:** `maestro 2.11.0` (`~/.maestro/bin/maestro`), `Maestro Studio 0.9.5`, `openjdk 25.0.4.1`.
- **Maestro MCP server:** connected (`maestro`: `list_devices`, `inspect_screen`, `take_screenshot`, `run`, `cheat_sheet`, `open_maestro_viewer` on `http://127.0.0.1:10001/`).
- **Xcode & runtimes:** `Xcode 27.0 (Build 27A266a)` with local iOS and iPadOS simulator runtimes `26.5`, `27.0`, `27.1` (including `iPhone Duo`) and `27.2`, covering every iPhone (`375 pt`, `402 pt`, `440 pt`), foldable (`iPhone Duo`), and iPad (`744 x 1133 pt` mini, `820 x 1180 pt` iPad, `834 x 1210 pt` 11-inch Pro, `1032 x 1376 pt` 13-inch Pro).

#### The "one Maestro owner per device" isolation rule

Every `maestro --device <UDID> test` CLI invocation uninstalls, reinstalls and restarts the XCTest driver (`maestro-driver-ios`) on that target simulator. If an interactive `maestro` MCP server (or another session's Maestro process) is already attached to that same simulator UDID, the CLI run tears down its XCTest socket (`TimeoutException: Device <UDID> became unreachable during setPermissions`), and `launchApp: { clearState: true, clearKeychain: true }` wipes the developer's interactive login and cached household state.

To eliminate device collisions permanently, `scripts/maestro_local.py` (`MA-273`) enforces **strict simulator pool separation**:

1. **Interactive pool (Xcode's standard simulators, owned by `maestro` MCP & Simulator.app):** used by developers and coding agents for live `inspect_screen` hierarchy checks, ad-hoc `run` YAML steps, and visual debugging in Maestro Viewer (`127.0.0.1:10001`).
2. **Automated CLI pool (five dedicated cloned simulators, owned exclusively by `scripts/maestro_local.py`):** created once by `python3 scripts/maestro_local.py setup-pool` via `xcrun simctl clone`:
   - `MyPaisa-Maestro-iPhone-375` (`iPhone 11 Pro`, compact narrow + Display Zoom `320 pt` override)
   - `MyPaisa-Maestro-iPhone-402` (`iPhone 18 Pro`, standard iPhone portrait `402 pt` & landscape `874 pt`)
   - `MyPaisa-Maestro-iPad-834` (`iPad Pro 11-inch (M5)`, portrait `834 pt` sheet-away & landscape `1210 pt` chat-beside)
   - `MyPaisa-Maestro-iPad-1032` (`iPad Pro 13-inch (M5)`, upright portrait `1032 pt` `MA-240` sheet-away band)
   - `MyPaisa-Maestro-iPad-1376` (`iPad Pro 13-inch (M5)`, landscape `1376 pt` 3-column chat-beside band)
   - Optional `MyPaisa-Maestro-Duo` (`iPhone Duo` under `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer` when installed).
3. **Headless boot & per-UDID `flock` mutex:** `scripts/maestro_local.py` boots only the needed cloned UDIDs headlessly via `xcrun simctl boot <UDID>` (without opening GUI windows in `Simulator.app`), sets `xcrun simctl status_bar <UDID> override --time "09:41" --batteryState charged --batteryLevel 100` for deterministic screenshots, and acquires an exclusive `fcntl.flock` lock at `/tmp/mypaisa-maestro-<UDID>.lock` before invoking `maestro --device <UDID> test`.

| Workflow | Tooling | Target simulator | When to use |
| --- | --- | --- | --- |
| **Authoring & debugging a screen or card** | `maestro` MCP (`inspect_screen`, `run`, `take_screenshot`, `open_maestro_viewer`) | Standard Xcode simulator (`iPhone 18 Pro`, `iPad Pro 11-inch`) | Exploring the SwiftUI accessibility hierarchy, tuning `TestIDs.swift`, checking Liquid Glass contrast or fixing a layout bug interactively |
| **Automated phase & regression suite** | `python3 scripts/maestro_local.py run --up-to-phase <N>` (`maestro` CLI) | Cloned `MyPaisa-Maestro-*` pool (`flock`-locked, headless) | Pre-PR local verification of `ios/` changes, 4-sub-band responsive layout checks, `simctl` system capability flows, and JUnit + HTML reports |
| **Every pull request on Linux CI** | `python3 scripts/maestro_local.py check-syntax` (invoking `maestro check-syntax` one file at a time across `.maestro/subflows/*.yaml` and `.maestro/flows/*.yaml`) + `TestIDs` parity check | None (`ubuntu-24.04-arm`, `1x`, ~3 seconds) | Fast static validation that every YAML subflow and flow parses cleanly (`maestro check-syntax` accepts a single file argument per invocation) and every `mp.*` ID referenced in `.maestro/` exists in `TestIDs.swift` and `test-ids.ts` |

### 8.2 React Native 0.88 Fabric + Swift 6 SwiftUI + Liquid Glass accessibility & selector contract

MyPaisa's iOS app (`ARCHITECTURE.md` §9.5, `MA-165`, `MA-229`) uses a **bare React Native 0.88 TypeScript shell** (New Architecture, Fabric, Hermes, `UITabBar` / sidebar navigation, TanStack Query, SSE client, MMKV store) hosting **Swift 6 SwiftUI views** across Fabric C++ components for every visible piece (chat timeline, Warm Ledger cards, composer, hero, figure rows, inline edit, Swift Charts, sheets).

Because Maestro on iOS reads the live `XCTest` accessibility tree (`XCUIElement`), hybrid React Native + SwiftUI apps suffer from three classic pitfalls unless designed around an explicit contract:
1. **SwiftUI container merging:** by default, SwiftUI `Button`, `NavigationLink` and grouped `VStack`/`HStack` cards merge their children into one combined accessibility element, hiding `[Confirm]`, `[Edit]`, `[Cancel]` and the `Technical` disclosure button from Maestro.
2. **Liquid Glass collapsing labels:** iOS 26's Liquid Glass `UITabBar` shrinks unselected or scrolled tab items to icon-only pills, breaking text-based `tapOn: "Home"` selectors after a timeline scroll.
3. **Spring & `numericText` digit-roll races:** SwiftUI's `.smooth` arrival springs and `numericText` rolling counters (`MA-182`) cause transient mid-roll strings if Maestro asserts figures while an animation is in flight.

MyPaisa enforces five mandatory selector rules from Phase 0 (`MA-165`, `MA-273`):

| Rule | Implementation in `ios/` and `web/src/lib/` | Why Maestro needs it |
| --- | --- | --- |
| **1. Shared canonical selector dictionary (`mp.*`)** | One schema generates `web/src/lib/test-ids.ts` (used by SvelteKit `data-testid` and Playwright) and `ios/MyPaisaCore/Testing/TestIDs.swift` (used by React Native `testID` and SwiftUI `.accessibilityIdentifier()`), checked for 1:1 parity in L1 unit gates (`mp.tab.chat`, `mp.nav.sidebar`, `mp.chat.composer`, `mp.card.confirm.accept`, `mp.card.technical-fold`, `mp.hero.net-worth`, `mp.admin.second-check`). | Renaming a test ID without updating `.maestro/flows/` fails the fast 3-second Linux PR gate before a simulator even boots. |
| **2. `.accessibilityElement(children: .contain)` on every card & row** | Every SwiftUI Warm Ledger card, guided-flow chip group, inline-edit row and partial sheet applies `.accessibilityElement(children: .contain)` + `.accessibilityIdentifier(TestIDs.Card.confirm)` on the outer container, never `.combine`. | Preserves both the card container ID and every child button (`mp.card.confirm.accept`, `mp.card.confirm.cancel`, `mp.card.technical-fold`) as distinct tappable nodes in `maestro hierarchy`. |
| **3. Swift Charts dual exposure (`AXChartDescriptor` + summary value)** | Every Swift Chart (`MA-56`) exposes `AXChartDescriptor` for VoiceOver audio graphs and sets `.accessibilityIdentifier(TestIDs.Chart.netWorth)` plus `.accessibilityValue("Latest £444,951, horizon 12 months")` on its wrapper (`household-v4.json`, Lesson 13). | Allows Maestro `assertVisible` to verify rendered chart bounds and deterministic data summaries without brittle OCR on curved SVG/Metal paths, while `XCUITest` audits full `AXChartDescriptor` compliance. |
| **4. Liquid Glass `UITabBarItem` & toolbar IDs** | Fabric's native `UITabBarItem` and `UIBarButtonItem` instances set `.accessibilityIdentifier` (`mp.tab.chat`, `mp.tab.home`, `mp.tab.activity`, `mp.tab.you`, `mp.tab.search`, `mp.strip.household`). | `tapOn: { id: "mp.tab.home" }` succeeds regardless of whether iOS 26's Liquid Glass bar is expanded or collapsed after scrolling. |
| **5. Deterministic motion flag (`MYPAISA_STATIC_MOTION=1`)** | Functional Maestro flows launch with `arguments: { MYPAISA_STATIC_MOTION: "1" }`, which disables spring travel and `numericText` digit rolling (the native equivalent of `?static=1` on the Claude Design boards, Lesson 11). Dedicated `@motion` flows omit it and test `Reduce Motion` (`xcrun simctl`). | Eliminates flaky `waitForAnimationToEnd` timeouts and mid-roll number mismatches across 100% of functional flows while still testing real spring choreography in `@motion` flows. |

### 8.3 iOS & iPadOS four-sub-band adaptive width, orientation & multitasking matrix

Per `ARCHITECTURE.md` §9.1 and Lesson 23 (`MA-163`, `MA-240`), the app lays itself out strictly by window width (with the single exception that an iPhone is always compact in either orientation): **beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over)**.

`scripts/maestro_local.py` verifies all four width sub-bands, live orientation changes, and multitasking boundaries:

| Sub-band | Window width | Cloned simulator / harness | Orientation / mode | Mandatory Maestro assertions (`assertVisible` / `assertNotVisible`) |
| --- | --- | --- | --- | --- |
| **Band 1: Compact** | `< 600 pt` (and every iPhone in any orientation) | `MyPaisa-Maestro-iPhone-375`, `MyPaisa-Maestro-iPhone-402` (+ `iPhone 18 Pro Max` `440 pt`, `Duo` folded, and `MYPAISA_VIEWPORT_WIDTH=320` Display Zoom / Slide Over & `599` 1/3 Split View) | `PORTRAIT` and `LANDSCAPE_LEFT` | `mp.nav.tab-bar` **visible**; `mp.nav.sidebar` **notVisible**; `mp.chat.trailing-column` **notVisible**; on iPhone `setOrientation: LANDSCAPE_LEFT`, `mp.nav.tab-bar` stays **visible** (the iPhone landscape exception, Lesson 23); tapping `mp.strip.household` opens Home sheet. |
| **Band 2: Regular, narrow** | `600 to 899 pt` | `MyPaisa-Maestro-iPad-834` (`834 x 1210 pt`) in `PORTRAIT` (`834 pt`), `iPad mini` `PORTRAIT` (`744 pt`), `Duo` unfolded (`~880 pt`), and `MYPAISA_VIEWPORT_WIDTH=600` & `899` (2/3 Split View) | `PORTRAIT` | Collapsed top bar `mp.nav.top-tabs` **visible**; `mp.chat.trailing-column` **notVisible**; tapping `mp.action.ask` opens `mp.chat.sheet` over the screen without losing underlying scroll position. |
| **Band 3: Regular, wide (`MA-240`)** | `900 to 1132 pt` | `MyPaisa-Maestro-iPad-1032` (`1032 x 1376 pt` 13-inch iPad upright) and `MYPAISA_VIEWPORT_WIDTH=900` & `1132` (Stage Manager) | `PORTRAIT` | `mp.nav.sidebar` **visible** beside the screen; `mp.chat.trailing-column` **notVisible** (preventing the 360 to 480 pt crushed middle column caught in `MA-240`); tapping `Chat` or `Ask` opens `mp.chat.sheet`. |
| **Band 4: Regular, widest** | `>= 1133 pt` | `MyPaisa-Maestro-iPad-834` in `LANDSCAPE_LEFT` (`1210 pt`), `MyPaisa-Maestro-iPad-1376` in `LANDSCAPE_LEFT` (`1376 pt`), `iPad mini` landscape (`1133 pt`), and `MYPAISA_VIEWPORT_WIDTH=1133` | `LANDSCAPE_LEFT` | All three columns simultaneously **visible**: `mp.nav.sidebar` + active dashboard screen + `mp.chat.trailing-column`; `mp.chat.sheet` **notVisible**. |
| **Live transition continuity** | `834 <-> 1210 pt` and `1032 <-> 1376 pt` | `MyPaisa-Maestro-iPad-834` & `MyPaisa-Maestro-iPad-1032` | Mid-flow `PORTRAIT -> LANDSCAPE_LEFT -> PORTRAIT` | In Phase 1, type an unsubmitted question in `mp.chat.composer` inside `mp.chat.sheet` in portrait, rotate past `1133 pt` to landscape, assert the draft appears intact inside `mp.chat.trailing-column` with zero reload, and rotate back; from Phase 2, repeat mid-step inside an active guided-flow card (`Log money`) and tap `Confirm`. |

*Note on deterministic iPadOS Split View / Slide Over boundary testing:* Apple's `xcrun simctl` has no public CLI command to drag iPadOS multitasking dividers reliably without fragile coordinate drags on SpringBoard. In `#if DEBUG` builds only, `MyPaisa Dev` honours `MYPAISA_VIEWPORT_WIDTH=<points>` in `launchApp.arguments`, constraining the root SwiftUI scene container and horizontal size class to exact boundary widths (`320`, `599`, `600`, `899`, `900`, `1132`, `1133 pt`), mirroring `scripts/board_fit.js` (`MA-240`, Lesson 29).

### 8.4 Dual backend modes: hermetic local FastAPI + SSE stub vs. live api-dev + X-Ray trace check

`scripts/maestro_local.py` runs the same `.maestro/` workspace in two backend modes:

1. **Mode A — Hermetic local stub (`--mode stub`, default for 95% of runs, offline, £0.00):**
   - In Phase 0 (`p00_shell_smoke.yaml`), `--mode stub` serves the Phase 0 shell health/bootstrap stub; from Phase 1 (`MA-198`, `MA-266`, `MA-246`), `scripts/maestro_local.py` starts the local FastAPI `api` + `stream` Uvicorn server backed by in-memory `moto` DynamoDB/S3/SQS seeded with `docs/design/figures/household-v4.json` (`MA-110`, Lesson 13) and T0 deterministic recorded Claude SSE streams.
   - Passes `MYPAISA_API_URL: "http://127.0.0.1:8787"`, `MYPAISA_AUTH_STUB: "owner_arun"` (or `"member_asha"`, `"viewer_guest"`), and `MYPAISA_STATIC_MOTION: "1"` via `launchApp.arguments`.
   - **Compile-time safety fence:** `MYPAISA_API_URL`, `MYPAISA_AUTH_STUB` and `MYPAISA_VIEWPORT_WIDTH` are compiled strictly inside `#if DEBUG` in Swift and `__DEV__` in React Native; an L1 security check verifies those symbols do not exist in the Release `MyPaisa` binary.
   - **Offline cache & queue-flush simulation (`MA-173`):** never toggles macOS Wi-Fi (which would disrupt the developer's Mac). Instead, a Maestro `runScript` step calls `http://127.0.0.1:8787/__test/network?mode=offline` so the local server drops SSE and returns connection errors; the flow asserts cached Home figures display their `"as of"` badge, `Confirm` buttons disable cleanly, a typed chat message queues locally in MMKV, and restoring `?mode=online` flushes the message and resumes `/v1/stream` from `Last-Event-ID`.
2. **Mode B — Live `dev` AWS integration (`--mode dev-live`, pre-release & post-deploy check, active from Phase 1):**
   - Launches `com.mypaisapp.agent.dev` (`MyPaisa Dev`) pointed at `https://api-dev.mypaisapp.com` with a short-lived Cognito dev test session minted via `agent-toolkit`.
   - Executes `@smoke-dev` flows (real API Gateway TLS, Cognito authorizer, `/v1/stream` response streaming, live chat turn, Activity screen `RunRecord`), extracts `x-mypaisa-trace-id` from the Activity run detail sheet, and calls `scripts/smoke.py --verify-trace <trace_id>` (`MA-232`, `MA-268`) to confirm an unbroken mobile-to-Lambda-to-Claude X-Ray trace.

### 8.5 Native iOS & iPadOS system capability simulation playbook (xcrun simctl + Maestro)

Maestro's native YAML commands cover taps, swipes, permissions, orientation, image/video `addMedia` into Photos, and deep links; for `.pdf` / `.xlsx` document picker files (`addMedia` supports images and videos only) and Apple system daemons outside XCTest (Face ID `BiometricKit`, simulated APNs payloads, Dynamic Type `AX5`, light/dark appearance), `scripts/maestro_local.py` stages files into the simulator's Local File Provider container before launch and exposes a localhost control bridge (`http://127.0.0.1:8788/__simctl/*`) that Maestro's sandboxed GraalJS `runScript` calls via `http.post` to run `xcrun simctl` on the active cloned `<UDID>`:

| iOS / iPadOS capability | Story | How `scripts/maestro_local.py` & Maestro drive it locally | What the flow asserts |
| --- | --- | --- | --- |
| **Face ID second check & App Lock (match & mismatch)** | `MA-76`, `MA-102`, `MA-171` | Before launch, `xcrun simctl spawn <UDID> notifyutil -s com.apple.BiometricKit.enrollmentChanged 1` and `notifyutil -p com.apple.BiometricKit.enrollmentChanged`; when `mp.admin.second-check-sheet` prompts, `runScript: scripts/biometrics.js` posts to the host bridge to fire `notifyutil -p com.apple.BiometricKit_Sim.pearl.nomatch` (or `fingerTouch.nomatch`) first, then `com.apple.BiometricKit_Sim.pearl.match` on retry | Mismatch refuses the Admin center change and writes zero `AuditEvent`; retry match completes the fresh server-verified assertion and appends the hash-chained `AuditEvent`. |
| **Universal Links & one-time household invite** | `MA-73`, `MA-102`, `MA-168` | `openLink: { link: "https://dashboard-dev.mypaisapp.com/join/tok_invite_asha", autoVerify: true }` | Opens straight into `mp.auth.invite-sheet` (`Joining from an invite`); expired or already-used token shows the clean refusal card. |
| **APNs push & Lock Screen privacy redaction** | `MA-170`, `MA-181` | App enables Privacy Mode (`/privacy`), presses `Home`, and `runScript: scripts/push.js` posts to the host bridge to run `xcrun simctl push <UDID> com.mypaisapp.agent.dev fixtures/push_emi_checkin.apns` | Notification banner displays `"HDFC home loan EMI: November check-in due"` with **zero currency amounts** on the Lock Screen; tapping the banner opens the exact check-in card in the chat. |
| **Photos, VisionKit scan stub & PDF/workbook Files** | `MA-37`, `MA-148`, `MA-149`, `MA-208` | `addMedia: ["fixtures/monzo_isa_valuation.png"]` for Photos images; `scripts/maestro_local.py` copies `.pdf` statements/CAS and `.xlsx` workbooks directly into the simulator's `com.apple.FileProvider.LocalStorage` (`On My iPhone` / `On My iPad`) container before launch, then Maestro taps `mp.chat.attach` -> Photos / Files | File uploads to S3 (`Document` row written before extraction, Lesson 15), extraction Confirm card renders with source-line citations, and tapping the row in `Audit` opens native `Quick Look`. |
| **Dynamic Type (`xSmall` to `AX5`) & Dark / 25% brightness** | `MA-181`, `MA-240` | `xcrun simctl ui <UDID> content_size accessibility-extra-extra-extra-large` (`AX5`) and `xcrun simctl ui <UDID> appearance dark` | Multi-column figure rows stack vertically at `AX5` without clipping `[Confirm]`, `[Edit]` or rupee/pound heroes; `assertScreenshot` (`98%` threshold) guards Warm Ledger dark contrast. |
| **iPad hardware keyboard keys & `Cmd+*` shortcuts** | `MA-163`, `MA-166` | Maestro `pressKey` (`Enter`, `Backspace`, `Tab`) on `MyPaisa-Maestro-iPad-1376`; `Cmd+*` modifier shortcuts run in `XCUITest` via `XCUIKeyModifierCommand` (Maestro `pressKey` has no `Command` modifier) | `Enter` submits composer turns in Maestro; `XCUITest` verifies `Cmd+K` focuses `mp.chat.composer`, `Cmd+1` to `Cmd+5` switch sections, and `Cmd+F` opens Search. |

### 8.6 `.maestro/` workspace blueprint, tag taxonomy & concrete YAML flow templates

Planned repository layout (`MA-273` ships the workspace, `TestIDs` parity gate and `p00_shell_smoke.yaml` in Phase 0; `p01..p20` join phase by phase):

```text
.maestro/
  config.yaml                         # appId defaults, executionOrder, includeTags, excludeTags, global env defaults
  subflows/
    launch_seeded.yaml                # launchApp with MYPAISA_API_URL, MYPAISA_AUTH_STUB, MYPAISA_STATIC_MOTION=1
    sign_in_owner.yaml                # Sign in as Arun (owner) or verify existing Keychain session
    sign_in_member.yaml               # Sign in as Asha (member, household overview + own detail only)
    assert_compact_shell.yaml         # Assert <600pt tab bar visible, sidebar & trailing chat hidden
    assert_sheet_shell.yaml           # Assert 600-1132pt chat sheet behaviour, trailing chat hidden
    assert_beside_shell.yaml          # Assert >=1133pt 3-column sidebar + screen + trailing chat visible
  scripts/
    biometrics.js                     # http.post to maestro_local.py host bridge -> simctl BiometricKit_Sim.pearl.match/.nomatch
    push.js                           # http.post to maestro_local.py host bridge -> xcrun simctl push <UDID>
    network_mode.js                   # http.post to local FastAPI stub /__test/network?mode=offline|online
  fixtures/
    push_emi_checkin.apns             # Simulated APNs check-in payload (HDFC home loan EMI, redacted & unredacted)
    push_red_alert.apns               # Time-sensitive red alert payload
    monzo_isa_valuation.png           # Synthetic screenshot fixture injected via Maestro addMedia into Photos
    barclays_oct_statement.pdf        # Synthetic statement PDF staged by maestro_local.py into Local File Provider
  screenshots/                        # Golden baselines for assertScreenshot (light/dark, 402pt/834pt/1032pt/1376pt)
  flows/
    p00_shell_smoke.yaml              # Phase 0: boot, Warm Ledger tokens, empty shell across all 4 width bands
    p01_signin_chat_sse_4band.yaml    # Phase 1: Apple/Google sign-in, invite link, SSE stream, 4-band rotation, push
    p02_register_record_edit.yaml     # Phase 2: register savings by chat, Confirm, audit row, inline edit moves SSE
    p03_deposits_fx_currencies.yaml   # Phase 3: FD/RD/PPF, GBP/INR/USD/EUR switch, lakh/crore, currency mismatch 1b
    p04_debts_checkins_push.yaml      # Phase 4: loan registration, APNs due check-in tap -> Paid, offline queue
    p05_investments_priced.yaml       # Phase 5: ISA/SIP/RSU, XIRR fold, valuation screenshot addMedia
    p06_budget_statements.yaml        # Phase 6: Files PDF statement upload, category review card, month close
    p07_projection_plans.yaml         # Phase 7: Projection fan scrub, 1a Budget forecast, 2a chat plan, 3a Plans tab
    p08_audit_search_admin_faceid.yaml# Phase 8: Quick Look file preview, Search tab, Admin Center Face ID 2nd check
    p09_full_wealth_accessibility.yaml# Phase 9: whole-wealth journey at AX5 Dynamic Type + Dark + Privacy Mode
    p10_to_p20_market_and_widgets.yaml# Phases 10-20: briefs, Swift Charts, stances, agents, India CAS, widgets/share
```

#### Concrete flow template 1 — iPad 4-sub-band width rule & live mid-draft rotation (`p01_ipad_rotation_continuity.yaml`)

```yaml
appId: com.mypaisapp.agent.dev
tags:
  - p01
  - layout-4band
  - smoke
---
- setOrientation: PORTRAIT
- runFlow: ../subflows/launch_seeded.yaml
# On iPad Pro 13-inch upright (1032 pt, Band 3 MA-240): sidebar + screen visible, chat trailing column hidden
- assertVisible:
    id: "mp.nav.sidebar"
- assertNotVisible:
    id: "mp.chat.trailing-column"
- tapOn:
    id: "mp.sidebar.chat"
- assertVisible:
    id: "mp.chat.sheet"
# Type an unsubmitted Phase 1 chat draft inside the portrait sheet
- tapOn:
    id: "mp.chat.composer"
- inputText: "How does our household summary look today?"
# Rotate live past 1133 pt (1376 pt landscape, Band 4): sheet morphs into trailing column with draft intact
- setOrientation: LANDSCAPE_LEFT
- assertNotVisible:
    id: "mp.chat.sheet"
- assertVisible:
    id: "mp.chat.trailing-column"
- assertVisible: "How does our household summary look today?"
# Rotate back to 1032 pt upright: trailing column returns to sheet without losing the composer draft
- setOrientation: PORTRAIT
- assertVisible:
    id: "mp.chat.sheet"
- assertVisible: "How does our household summary look today?"
```

*(In Phase 2, `p02_register_record_edit.yaml` extends the same `1032 pt <-> 1376 pt` rotation check to an active guided-flow card mid-step before tapping `Confirm`.)*

#### Concrete flow template 2 — Admin Center Face ID second check (mismatch refusal then match & audit row)

```yaml
appId: com.mypaisapp.agent.dev
tags:
  - p08
  - biometrics
---
- runFlow: ../subflows/launch_seeded.yaml
- tapOn:
    id: "mp.tab.you"
- tapOn:
    id: "mp.you.admin-center"
- tapOn:
    id: "mp.admin.claude-ceiling-edit"
- eraseText
- inputText: "150"
- tapOn:
    id: "mp.admin.save-with-second-check"
- assertVisible:
    id: "mp.admin.second-check-sheet"
# 1. Simulate Face ID failure -> change must be refused and ceiling must remain $160
- runScript:
    file: ../scripts/biometrics.js
    env:
      RESULT: "fail"
- assertVisible:
    id: "mp.admin.second-check-failed"
- tapOn:
    id: "mp.admin.second-check-retry"
# 2. Simulate Face ID match -> server verifies assertion and writes AuditEvent
- runScript:
    file: ../scripts/biometrics.js
    env:
      RESULT: "match"
- assertVisible: "\\$150"
- tapOn:
    id: "mp.admin.view-audit-row"
- assertVisible: ".*Claude monthly ceiling: \\$160 -> \\$150.*"
```

### 8.7 Phase-wise Maestro rollout plan (Phases 0 to 20) & local-vs-CI cost analysis (£0.00/month)

Every phase adds its Maestro flows alongside the SwiftUI pieces it ships (`plan-sync` rule 10 traces each story's `.maestro/flows/p<NN>_*.yaml` path):

| Phase | Epic | New local Maestro iOS & iPadOS flows added | Simulators & capabilities exercised | Local wall-clock |
| --- | --- | --- | --- | --- |
| **Phase 0** | `MA-9` | `scripts/maestro_local.py` cloned pool (`setup-pool`, `run`, `check-syntax`, `selftest`), `TestIDs.swift` <-> `test-ids.ts` generator, `p00_shell_smoke.yaml` (Warm Ledger light/dark, empty shell across all 4 width bands, `assertScreenshot` baseline). | All 5 cloned simulators (`375`, `402`, `834`, `1032`, `1376 pt`), light & dark | ~45 s |
| **Phase 1** | `MA-10` | Sign in with Apple/Google stub, Universal Link `/join/<token>` invite (`openLink`), 1a Chat-first shell, streaming SSE reply, `PORTRAIT <-> LANDSCAPE_LEFT` rotation continuity, APNs push (`simctl push`), Activity `RunRecord` + `--mode dev-live` X-Ray trace check. | iPhone `402` (portrait + landscape), iPad `834`, `1032`, `1376`, `openLink`, `simctl push` | ~1.5 min |
| **Phase 2** | `MA-187` | Register first savings record by talking, missing-field guided chip card, `[Confirm]` vs `[Cancel]` (asserting zero write on Cancel, Lesson 9), hash-chained Audit row, in-place figure correction (`PATCH /v1/records/{id}`), currency mismatch `1b` card (`MA-156`). | iPhone `402`, iPad `1376` chat-beside (seeing Home total move live on Confirm) | +45 s |
| **Phase 3** | `MA-188` | Fixed/recurring deposits, PPF, life policy, GBP, INR, USD and EUR display switch (`lakh`/`crore` formatting for rupees), privacy mask (`••••`) across hero, cards and sheets. | iPhone `375` (`320 pt` Display Zoom rupee hero fit, Lesson 24), iPhone `402` | +35 s |
| **Phase 4** | `MA-192` | Mortgage, loan and credit-card registration, simulated APNs EMI check-in push -> one-tap `Paid, ₹39,390` (`HDFC home loan EMI`), offline cache & queued message flush (`MA-173`). | iPhone `402`, `simctl push`, local stub `offline -> online` toggle | +45 s |
| **Phase 5** | `MA-189` | Monzo ISA, SIP, pension and RSU registration, `addMedia` valuation screenshot extraction -> Confirm card, holding screen XIRR Technical fold. | iPhone `402`, iPad `834`, `addMedia` Photos picker | +40 s |
| **Phase 6** | `MA-190` | Local File Provider PDF bank/card statement upload via native `Files` picker, multi-line category review card, internal transfer detection, 1st-of-month budget close check-in. | iPhone `402`, iPad `1032` upright (`MA-240`), Local File Provider `Files` picker | +45 s |
| **Phase 7** | `MA-191` | Projection fan chart scrub, editable assumptions, `1a` Budget forecast tab, `2a` chat future-plan flow with budget rearrangement on Confirm, `3a` Plans tab (`MA-264`). | iPhone `402`, iPad `1376` 3-column (chat what-if moving Projection fan live) | +50 s |
| **Phase 8** | `MA-14` | Audit log filter + `Quick Look` original file preview (`MA-149`), iOS 26 Search tab, Admin Center behind Face ID `BiometricKit` match & mismatch (`MA-76`, `MA-137`, `MA-145` DLQ Replay; `Cmd+*` keyboard shortcuts run in `XCUITest`). | iPhone `402`, iPad `1376`, `BiometricKit_Sim.pearl` match/fail, Quick Look | +50 s |
| **Phase 9** | `MA-18` | Full whole-wealth cross-band sweep (`320 pt` to `1376 pt`), Dynamic Type `AX5` audit across every tab/sheet, Dark Mode 25% brightness `assertScreenshot`, Local File Provider Excel hydration workbook upload (`MA-111`). | All 5 cloned simulators + `Duo`, `AX5`, Light & Dark, Privacy Mode | +1.5 min |
| **Phases 10–15** | `MA-11`..`MA-17` | Weekday 07:15 brief & 21:15 wrap cards, time-sensitive red alert push, Swift Charts horizon shading & Technical glossary tap, Holding Profile / Overlap / Bear-vs-Bull / Scenario cards, Scorecard & live stances. | iPhone `402`, iPad `1376`, `simctl push`, Swift Charts `AXChartDescriptor` | +1.5 min |
| **Phases 16–19** | `MA-19`..`MA-147` | New holding kind spec approval behind Face ID, Forecaster dual-engine card (`MA-117`), Phase 18 9-agent incident/budget desk (`MA-127`), India CAMS/KFintech CAS PDF import via Local File Provider & NSE/AMFI INR/GBP views (`MA-147`). | iPhone `402`, iPad `1376`, Local File Provider CAS PDF, `BiometricKit_Sim` | +1.2 min |
| **Phase 20** | `MA-175` | Home Screen / Lock Screen WidgetKit snapshots, Share Sheet extension (`Share a statement or screenshot to MyPaisa` from Safari/Files via Maestro system UI flow), App Intents / Siri shortcut deep links, Live Activities. | iPhone `402` (`appId: com.apple.mobilesafari` -> Share Sheet -> `MyPaisa Dev`) | +1.0 min |

#### Cost comparison: why full Maestro multi-simulator runs belong locally on Apple Silicon

| Execution venue for the 5-simulator Maestro matrix | Per-run wall-clock | Billed CI minutes / run | Monthly cost (40 PRs / ~60 runs) | Verdict |
| --- | --- | --- | --- | --- |
| **GitHub Actions `macos-15` (`10x` minute multiplier)** | ~15–22 min (cold simulator boot + XCTest driver install x 5 devices) | **150 to 220 billed mins / run** | **~£42 to £65 / month** over the 2,000 free minute quota | **Rejected** for full multi-device Maestro matrices — burns the entire monthly free tier in ~10 PRs. |
| **Maestro Cloud (`maestro cloud`)** | ~6 min (parallel cloud iOS VMs) | Hosted SaaS plan | **$250+ / month** (~£195/mo) | **Rejected** — 4x the entire £50/month MyPaisa infrastructure budget (`ARCHITECTURE.md` §15.2). |
| **Selected (`MA-273`): Local Apple Silicon cloned pool (`scripts/maestro_local.py`) + Linux CI `maestro_local.py check-syntax` (`1x`) + path-gated `XCTest` (`MA-269`)** | **~2 min smoke / ~8 min full** (warm `DerivedData` + pre-cloned simulators on M-series Mac); **3 s** on Linux CI | **0.05 billed mins / PR** on `ubuntu-24.04-arm` (`1x`) | **£0.00 / month** | **Selected** — instant local feedback across all 4 width bands, zero cloud simulator bills, and GitHub free minutes stay untouched. |

### 8.8 Keeping MyPaisa installed for 3 months (and rolling indefinitely) via private TestFlight & household beta testing (MA-162, MA-164, MA-167)

Arun also asked on 29 Oct 2026: *"how I can get the app kept installed for 3 months using TestFlight and beta test and keep it private and do beta testing"*.

#### Why TestFlight is the exact mechanism for a 3-month (90-day) untethered install

| iOS installation method | How long the app stays runnable on iPhone / iPad | Privacy & operational trade-offs |
| --- | --- | --- |
| **Free personal Xcode cable install** (no $99/yr program) | **7 days only** — hard-crashes on launch on day 8 until plugged back into the Mac and re-signed; no APNs push, no Sign in with Apple, no Associated Domains | Unusable for daily household wealth tracking or family devices. |
| **Ad Hoc provisioning profile** ($99/yr program) | Up to certificate/profile expiry (1 year), **but** requires manually collecting every family iPhone/iPad hardware UDID, regenerating profiles on new devices, and hosting an `.ipa` manifest with no automatic background updates or screenshot feedback | High manual friction; no silent background updates or native beta feedback sheet. |
| **TestFlight Internal Testing (`MA-162`, `MA-164`, `MA-167` — Selected)** | **90 days (3 months) per uploaded build**, untethered anywhere in the world — and **every new build uploaded resets the 90-day clock back to 90 days** silently in the background via TestFlight Automatic Updates | **Zero App Review wait** (live in ~3–5 minutes), **100% private** (`testFlightInternalTestingOnly`), silent updates keep Keychain & MMKV data intact, built-in screenshot feedback & crash logs, included in the $99/yr Apple Developer Program (**£0 extra**). |

#### Four layers that keep the app 100% private (never on the public App Store)

1. **Zero obligation to ever publish on the App Store:** Creating the `MyPaisa` (`com.mypaisapp.agent`) and `MyPaisa Dev` (`com.mypaisapp.agent.dev`) app records in App Store Connect (`MA-164`) creates **no public listing** and makes nothing searchable on the App Store. You never fill out public App Store distribution or click *Submit for Review*; private household apps can live on TestFlight Internal Testing indefinitely.
2. **Cryptographic Internal-Only lock (`testFlightInternalTestingOnly = true`):** Every archive exported for TestFlight uses `ios/ExportOptions-Internal.plist` (shown below). When `testFlightInternalTestingOnly` is `<true/>`, Apple's ingestion servers permanently lock that binary to **Internal Testing only**: it **cannot** be added to an External Testing group, **cannot** generate a public TestFlight invitation link, and **cannot** be submitted to the public App Store, even by mistake in the web console. Setting `<key>ITSAppUsesNonExemptEncryption</key><false/>` in `Info.plist` (MyPaisa uses only standard OS HTTPS/TLS and CryptoKit/WebAuthn) clears Apple's Export Compliance gate automatically so builds go live in 3 to 5 minutes with **zero Beta App Review** (human Apple reviewers never open or test internal builds).
3. **Least-privilege App Store Connect roles & `main`-only GitHub environments (`MA-26`, `MA-164`, `MA-167`):**
   - An Individual Apple Developer Program account ($99/year, `MA-162`) lets Arun invite up to **50 additional users** in **App Store Connect -> Users and Access** (up to 100 internal testers per app, up to **30 devices** — iPhones and iPads — per tester).
   - Invite each household member's Apple ID email with the **`Customer Support`** or **`Marketing`** role, **scoped strictly to the `MyPaisa` app** (never `Admin` or `Developer`, and zero visibility into `MyPaisa Dev`, signing certificates, or API keys).
   - Two isolated internal groups run side-by-side on Arun's devices, backed by the `.p8` App Store Connect API key (`MA-164`) stored in the `main`-only GitHub `dev` and `prod` environments (`MA-26`, unreachable from pull-request branches and never written to disk):
     - **`MyPaisa Dev` (`com.mypaisapp.agent.dev` -> Internal Group `"Dev Dogfood"`, Arun only):** auto-uploaded in `environment: dev` on merges to `main` after `dev` smoke tests pass; talks exclusively to `api-dev.mypaisapp.com` (synthetic seed household).
     - **`MyPaisa` (`com.mypaisapp.agent` -> Internal Group `"Household Beta"`, Arun + invited family members):** uploaded in `environment: prod` only after Arun approves `prod` and `prod` read-only smoke tests pass; talks to `api.mypaisapp.com`.
4. **Double Lock — Apple ID distribution lock + MyPaisa Cognito invite lock:** Even if someone gained access to an invited device's TestFlight app, the app itself has no self-signup (`ARCHITECTURE.md` §4.5 & §9.3, `MA-102`, `MA-109`, `MA-168`): `api.mypaisapp.com` refuses every Sign in with Apple or Google token unless that identity belongs to the owner or redeemed a single-use, 24-hour `/join/<token>` household invite link created by the owner.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
    <key>testFlightInternalTestingOnly</key>
    <true/>
</dict>
</plist>
```

#### Keeping the app installed for 3 months — and rolling seamlessly past 90 days with zero data loss

1. **First install (one-time 2-minute setup per family iPhone / iPad):**
   - Install Apple's free **TestFlight** app from the App Store, accept the App Store Connect email invite, tap **Install** on `MyPaisa`, and ensure **Automatic Updates -> On** is enabled on the app's TestFlight page.
   - From that moment, the installed build runs for a full **90 days (3 months)** with full APNs push, Sign in with Apple, passkeys, Universal Links and Face ID.
2. **Silent in-place renewal (Keychain & offline MMKV preserved):**
   - Whenever CI uploads a newer monotonic build number (`CFBundleVersion`, e.g., `20261215.1`), App Store Connect's *"Enable automatic distribution"* pushes it immediately to the Internal Group, and iOS silently updates `MyPaisa` overnight when the device is locked on Wi-Fi.
   - Because the bundle identifier (`com.mypaisapp.agent`) and Apple Team ID remain identical, **iOS preserves the Keychain refresh token, passkey credentials, push token, and MMKV offline store** across every update, while resetting the build expiration clock back to **90 full days remaining**.
3. **Automated Day-60 Evergreen Keepalive + Day-75 In-App Safety Net (`MA-167`, staged cleanly across Phases 0, 1 and 8):**
   - During active phase development, merges touching `ios/` naturally reset the 90-day timer every few days or weeks.
   - Once the app stabilises (so 60 days might pass with zero `ios/` commits), a scheduled keepalive check on `main` (`.github/workflows/testflight-keepalive.yml` querying App Store Connect REST API `GET /v1/builds?filter[app]=<id>&sort=-uploadedDate` in `environment: dev` with the `.p8` App Store Connect API key from `MA-164` — or a monthly scheduled **Xcode Cloud** workflow using the **25 free compute hours/month** included with the $99/yr Apple Developer Program, costing **0 GitHub Actions macOS minutes**) checks the age of the live `MyPaisa` and `MyPaisa Dev` builds.
   - At **day 60** (30 days before Apple's 90-day cutoff), if no newer build was uploaded, the workflow archives `main` with an incremented `CFBundleVersion` and uploads it (`MyPaisa Dev` in `environment: dev`; `MyPaisa` in `environment: prod` after Arun's approval, or automatically via Xcode Cloud) with `testFlightInternalTestingOnly = true`, renewing the 3-month lease and notifying Arun.
   - **Belt-and-braces backstop (`MA-167`, `MA-266`, `MA-137`):** In **Phase 0 (`MA-167`)**, if a live build reaches day 60 unrefreshed, the check publishes an alert email via `MA-231`'s watch-tower SNS topic (`mypaisa-<env>-admin-alerts`), and on device launch the app checks its compiled `MYPAISA_BUILD_EPOCH` so from **day 75** (`<= 15 days left`, e.g., if a family member turned off TestFlight Automatic Updates) it displays a dismissible Warm Ledger expiry banner with a one-tap `itms-beta://` button opening TestFlight directly. In **Phase 1 (`MA-266`)**, FastAPI (`handlers/api`) adds `GET /v1/app/minimum-version` for the hard minimum-version update prompt; and in **Phase 8 (`MA-137`, `ARCHITECTURE.md` §15.2)**, the day-60 TestFlight build-age alert joins the Admin center's alert router (app, push and email).

#### Structured household beta testing & zero-SDK diagnostics loop

1. **Stage 1 — Local Maestro gate (`£0/mo`):** Before opening a PR on `ios/`, `python3 scripts/maestro_local.py run --up-to-phase <N>` verifies the change across all 5 cloned simulators (compact, sheet-away, 13-inch upright `MA-240`, 3-column chat-beside, Face ID, push, `AX5`).
2. **Stage 2 — `MyPaisa Dev` physical-device dogfooding (Arun only):** Merge to `main` deploys `dev`, passes `scripts/smoke.py --env dev`, and auto-pushes `MyPaisa Dev` to Arun's iPhone and iPad via TestFlight (~5 min). Arun verifies real 120 Hz ProMotion scrolling/chart scrubbing (`ios/PERFORMANCE.md` benches), real Face ID hardware, cellular handoff and real APNs delivery against synthetic dev data.
3. **Stage 3 — `MyPaisa` Household Beta promotion:** Arun approves the GitHub `prod` environment; `prod` Lambdas deploy and pass read-only smoke checks first (`MA-268`), then `MyPaisa` uploads to the `"Household Beta"` Internal Group so a new app never meets an old API (`MA-167`).
4. **Native TestFlight feedback & crash/hang telemetry (no third-party SDKs):**
   - **Screenshot + note feedback:** Taking a screenshot on iPhone or iPad (Side + Volume Up) inside a TestFlight build surfaces iOS's native **"Share Beta Feedback"** button — family testers can circle a visual glitch and type a note that lands straight in App Store Connect and Xcode Organizer (and is queryable via App Store Connect API `/v1/betaFeedbackScreenshotSubmissions`). *Household privacy rule:* toggle **Privacy Mode** on first (`/privacy` or header pill, masking amounts as `••••`) before sending a TestFlight screenshot so real balances are never sent to Apple's feedback portal.
   - **Crash, hang & MetricKit reports:** `xcodebuild -exportArchive` uploads `dSYM` debug symbols automatically; symbolicated crash stacks, main-thread hangs, 120 Hz scroll hitches and launch-time regressions appear natively in **Xcode Organizer** at **£0/month**, without adding Sentry, Firebase Crashlytics or any third-party telemetry SDK that could touch household PII.

---

## Sources

- Agentic Trading Desk: <https://github.com/Oft3r/agentic-trading-desk> (README, SKILL.md, `scripts/*.py`, `hooks/mandate-order-guard.sh`)
- Agent Toolbelt: <https://github.com/marras0914/agent-toolbelt> (README, `public/docs.html`, `src/tools/*.ts`, `docs/watchlist-monitor-plan.md`); the live site <https://www.agenttoolbelt.live/docs.html> was unreachable from the build environment
- TradingAgents: <https://github.com/TauricResearch/TradingAgents>
- ai-hedge-fund: <https://github.com/virattt/ai-hedge-fund>
- Monzo Investments: <https://monzo.com/blog/monzo-investments-is-here-leave-the-hard-work-to-us>, <https://moneyweek.com/investments/etfs/monzo-launches-etf-investing>, <https://moneytothemasses.com/news/monzo-launches-new-build-your-own-etf-investment-option-in-partnership-with-blackrock>
- BlackRock MyMap: <https://www.blackrock.com/uk/solutions/mymap>, <https://www.blackrock.com/uk/individual/products/308828/>
- Yahoo Finance UK fund ids: <https://finance.yahoo.com/quote/0P0001FBCE.L/>
- FT fund tearsheets (forum reference): <https://forum.portfolio-performance.info/t/import-quotes-for-fund-json-or-url/27102>
- EODHD: <https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds>
- Twelve Data: <https://twelvedata.com/docs>, <https://twelvedata.com/pricing>, <https://twelvedata.com/news/march-2026-updates>
- The iShares lines held through Monzo: <https://www.hl.co.uk/shares/shares-search-results/i/ishares-nasdaq-100-ucits-etf-acc>, <https://www.ishares.com/ch/privatkunden/de/produkte/284219/ishares-automation-robotics-ucits-etf-usd-acc-fund>, <https://app.getquin.com/database/IE00BYZK4552>
- Telegram Mini Apps: <https://core.telegram.org/bots/webapps>; rich messages (third-party write-ups): <https://autogram.ninja/en/blog/telegram-sendrichmessage-explained>, <https://www.unifyport.ai/blog/telegram-bot-api-10-2-upgrade-checklist/>, <https://blog.cosine.ren/en/post/telegram-rich-messages-integration/>
- MCP market-data servers compared: <https://dev.to/kevin_menesesgonzlez/the-7-best-mcp-servers-for-stock-market-data-2026-389l>, <https://marketxls.com/blog/best-financial-data-mcp-servers-ai-market-data>
- Bedrock feature availability: the Claude Platform availability table bundled with the Claude API skill used during this research
- Anthropic on evals and agents: <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>, <https://www.anthropic.com/engineering/building-effective-agents>, <https://www.anthropic.com/engineering/writing-tools-for-agents>, <https://www.anthropic.com/research/statistical-approach-to-model-evals>, <https://www.anthropic.com/engineering/infrastructure-noise>
- Anthropic on guardrails: <https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks>, <https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations>, <https://www.anthropic.com/research/prompt-injection-defenses>, <https://code.claude.com/docs/en/agent-sdk/permissions>, <https://code.claude.com/docs/en/agent-sdk/hooks>, <https://platform.claude.com/docs/en/about-claude/models/overview>
- Offline and online evals: <https://www.inngest.com/blog/online-vs-offline-ai-evals-when-to-use-each>, <https://www.langchain.com/resources/agent-evals>, <https://langfuse.com/docs/evaluation/get-started/online.md>, <https://docs.langchain.com/langsmith/rules>, <https://www.braintrust.dev/docs/core/logs/score>
- Judges: <https://hamel.dev/blog/posts/llm-judge/>, <https://hamel.dev/blog/posts/evals-faq/>, <https://arxiv.org/abs/2404.12272>, <https://arxiv.org/html/2406.12624v2>, <https://arize.com/blog/measuring-human-llm-judge-alignment.md>
- Security: <https://genai.owasp.org/llm-top-10/>, <https://genai.owasp.org/llmrisk/llm062025-excessive-agency/>, <https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/>, <https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/>, <https://arxiv.org/abs/2506.08837>, <https://arxiv.org/abs/2503.18813>, <https://arxiv.org/html/2403.14720v1>, <https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html>, <https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf>
- Finance: <https://arxiv.org/html/2508.05201>, <https://mlanthology.org/neurips/2025/ji2025neurips-phantom>, <https://handbook.fca.org.uk/handbook/PERG/8/30B.html>, <https://www.fca.org.uk/news/speeches/building-future-finance-age-ai>
- Tools: <https://inspect.aisi.org.uk>, <https://www.promptfoo.dev/docs/usage/command-line/>, <https://deepeval.com/docs/metrics-tool-correctness>, <https://langfuse.com/pricing>, <https://www.braintrust.dev/pricing>
- Maestro & iOS/iPadOS local testing & TestFlight: <https://docs.maestro.dev>, <https://developer.apple.com/testflight/>, <https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-internal-testers/>, <https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases>
