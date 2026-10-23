# Research: what to borrow, what to leave

Reverse engineering of the two references, plus a survey of what is possible
around them, done on 23 Oct 2026. `ARCHITECTURE.md` and `PLAN.md` are written
from this. Nothing here is built.

The two references answer different questions. **Agentic Trading Desk** is a
short-term *trading* desk: deterministic indicators, a scored decision cascade,
and an execution mandate with a hard guard. **Agent Toolbelt** is a *research*
API: live fundamentals turned into structured, LLM-written verdict cards.
MyPaisa Agent is neither a trader nor a public API; it is a long-term holder's
analyst, driven from Telegram by a layman. So it borrows the desk's discipline
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

- Execution, the mandate's dollar caps, order shapes and the hook. The bot
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

### 3.3 Claude on Amazon Bedrock: what the agent can use

All of these are available on Bedrock for Opus 5.5, Sonnet 5.5 and Haiku 5.5
(checked against the platform table): **PDF input** (the factsheet), **image
input** (a screenshot of the Monzo valuation screen), **structured outputs and
strict tools** (every card is a schema), **prompt caching**, **citations**
(quote the factsheet line a number came from), **adaptive thinking with
effort**. Not on Bedrock: Anthropic's server-side web search and web fetch
(we use Brave and `httpx` as client tools), Message Batches (real-time Haiku
is cheaper anyway), and Bedrock batch inference does not cover the 5.5
models.

That makes the layman's ingestion path possible: *send the bot the
factsheet and a screenshot, it reads both and asks you to confirm*.

### 3.4 Telegram: what a bot can show in 2026

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
money and placing no orders, is personal software. The bot still labels every
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
| Delivery | Push per event, Friday review | Digest only when something changed | | Telegram rich messages, Mini App dashboard, PNG charts |

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
