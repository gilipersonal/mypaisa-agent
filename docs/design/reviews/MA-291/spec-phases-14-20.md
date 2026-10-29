# MA-291 spec: Phases 14 and 16 to 20: news, new kinds, the Forecaster, the agent team, India, beyond the chat

Extracted on 29 Oct 2026 from ARCHITECTURE.md, PLAN.md, docs/trace.json, the figure sets and the boards, as the prototype's source. Quotes are exact; "AR" is ARCHITECTURE.md.

I found a spec for every phase you asked about, but how much is drawn varies a lot. Phase 17 has picked iOS boards. Phases 18 and 19 have only first-generation browser boards, which still need redrawing. Phases 14, 16 and 20 have almost nothing drawn. Quotes are exact; "AR" means ARCHITECTURE.md.

## Phase 14: News, events, sentiment (shadow), epic MA-16

- **What exists.** MA-86 is the news job that collects and de-duplicates articles; MA-87 scores each article into a daily sentiment index; MA-89 is the sentiment tilt. None of the three has a board. MA-88 ("The event calendar and a sentiment line reach the brief and the chat", AR §11) has one board: `ios-v1/iPhone dashboard.dc.html`, "iPhone · Today's brief" (D9). It is first-generation, still needs redrawing in v4 (MA-279), and uses the old clock: "The 07:15 brief · Fri 23 Oct · prices to Thursday's close".
  - The events line reads: "MPC, Thursday 5 Nov, 12:00 The Bank of England's rate decision: it moves the pound, so the 79% you hold abroad."
  - A Technical fold, closed by default, reads: "News mood +0.12 · by Sonnet · r-1184".
- **What "shadow" means.** Sentiment only "tilts the cascade by one notch, in shadow, only when the price pillars agree" (MA-89). AR §6.3 adds: "News alone never triggers a red alert." Calls stay "Shadow until 8 weeks above baseline" (AR §16). Stances are "paper-traded and graded; they appear only in the Saturday review until the record beats the baseline for 8 weeks" (AR §11). In the data, `ModelVersion.status` is `shadow · live · off`; on screen the label is "in practice".
- **Events.** "MPC, FOMC, ECB, CPI, earnings of top holdings" (AR §11); AR §19.2 adds elections. The tools are `get_events` and `get_sentiment`.
- **How sentiment is shown.** As a single number, "News mood +0.12", inside Technical, and as "one line in the brief" (PLAN).
- **Matching news to holdings (built in phase 17 F4, AR §19.3).** Haiku tags each story, through Batches, with the companies, countries, sectors, commodities and central banks it names, plus its event type and direction. Code then weights each story by the holding's exposure to those entities. Results are stored in `ArticleScore` and reach the brief as "3 stories touch your holdings today", each with its holding and the measured past effect.

## Phase 16: New kinds of holding, epic MA-19

- MA-98 (an iShares ETF priced like the funds) and MA-99 (a share's `valuation-snapshot` and `earnings-analysis` cards, AR §7) have no boards. Their screens are drafts only.
- Rules that apply:
  - A new kind is approved "behind the second check (`propose_kind`)" (AR §4.8).
  - The `stock` temperament is "cautious … earnings dates block changes for two sessions" (AR §4.3).
  - The fundamentals source is "Decide then, not now" (PLAN).

## Phase 17: The Forecaster, epic MA-117

**Figures** (`forecaster-v4.json`). The clock is today Mon 26 Oct, prices at the Fri 23 Oct close, the run on Sat 24 Oct 06:10 with model 2026.10 trained on data to 30 Sep, and the review at 09:00. Every holding is in practice, week 5 of 8, with grading on Fri 30 Oct, 6 Nov and 13 Nov. Charts are percentages from the Fri 23 Oct close.

- **`nasdaq`**
  - Asha, ISA, ETF, £512.
  - 60 candles (31 Jul to 23 Oct) and a 20-day fan.
  - Headline: up 52; fall5 21 (usual 12); range −7…+6; "8 times in 10".
  - Rules engine: PAUSE 64.
  - Mood: Stressed since Sat 3 Oct; next four weeks 71/18/7/4.
  - Similar days: 30 since 2015, 18 recovered, middle +1.8.
  - Seven events (Tariffs 11 cases −2.6 … Election 6 cases +0.8, low confidence).
  - Patterns: Double top and Support near −1% have an edge. Bearish engulfing has no edge and is never shown.
  - Technical set and seven drivers; usual chance up 57; track record rules 31/46, Forecaster weeks W1–W5 ✓.
- **`balanced`**
  - Arun, ISA, OEIC, £22,925.
  - NAV line, no candles.
  - Headline: up 61; fall5 4 (usual 5); range −3…+4.
  - Rules engine: HOLD 71.
  - Mood: Calm and rising since Tue 15 Sep.
  - Similar days: 21 of 30.
  - Pattern: the line pattern "Higher lows since August".
  - Track record: rules 11/14.
- **`review`**: three cards: NASDAQ (agree), Robotics (disagree: HOLD 58 vs fall5 34/15), Silver (no_view).
- **`proof`**: the lab table, six folds (Fold 4, 2022, missed), the models, and the gate.

**Forecast tab, picked 1a "The answer first"** (`iPhone v4 · Forecast`; MA-124 and MA-281; AR §19.7). The door is the holding page, tabs "Overview · Forecast · Track record".

1. **Header.** "iShares NASDAQ 100 UCITS ETF · Asha · ISA · £512".
2. **Hero.** "Next 4 weeks · the Forecaster" with the chip "In practice · week 5 of 8". Three tiles, risk first:
   - "A fall over 5% 21% usually 12%"
   - "Likely range −7% … +6% 8 in 10 end inside"
   - "Up in 4 weeks 52% close to even"
3. **Rules engine.** "The rules engine, beside it PAUSE · 64% Keep what you have; delay new money until the next review." Agreement line: "Both lean cautious: a fall over 5% is likelier than usual, and the rules engine says PAUSE."
4. **Chart.** "The chart, then the next 4 weeks · 60 trading days": candles with the fan, "Double top" and "Support −1%" marked. Legend: "▲ day up ▼ day down · 8 in 10 end inside · the middle · double top, neckline · support". Buttons: "Why? in the chat" and "How it proves itself".
5. **Patterns.** "Patterns on the chart · each measured on this ETF":
   - "Double top · Peaks Thu 1 Oct and Wed 7 Oct, neckline +6.2% broken Wed 14 Oct · Lower 20 days later in 6 of 9 cases since 2015 · average −2.1%"
   - "Support near −1% · The Wed 5 Aug low, tested Thu 22 Oct · Held in 9 of 14 tests since 2015 · average +1.1% after 20 days"
6. **"Why it says so · one tap for each"**:
   - Market mood: "Stressed since Sat 3 Oct · 71% it stays so over the next 4 weeks"
   - Similar days: "30 since 2015 · 18 higher 4 weeks later"
   - Event impacts: "Tariffs weighs most: −2.6% in the 4 weeks after, on average over 11 cases"
   - Main drivers: "From a usual 57% chance of being up to 52%"
   - Technical: "ADX 27 · stochastic 18 · below the cloud since 15 Oct"
7. **"Track records side by side".**
   - "Rules engine Live 31 of 46 calls on this holding held up, graded against waiting"
   - "Forecaster In practice 5 of 5 weeks so far beat both the base rate and the rules engine", then the W1–W8 dots.
8. **Footer.** "Every figure comes from code … Claude only puts them into words. A view, not advice: MyPaisa cannot trade."

Layout by device: on iPad, the sidebar, then the patterns beside the rows under a full-width chart, with the chat alongside from about 1133 pt. On the foldable, closed is the iPhone layout; open (about 880 pt) adds the chat a sheet away behind "Ask".

**Shared boards** (`iPhone v4 · Forecaster proof and chat`):

- **C1, Saturday review card.**
  - Intro: "Your Saturday review. The Forecaster is in practice for every holding, week 5 of 8: until its 8 weeks are up it shows only here and on each holding's Forecast tab, labelled so."
  - Card: "Forecaster · in practice · 4 weeks". Rows in order: Rules engine, Fall over 5% (usually), Chance up, Likely range, Market mood, Similar days, Pattern, Main drivers. Buttons: Why?, Chart, Track record. A "Technical" fold shows the Forecast row the card was read from.
  - Disagree: "The two engines disagree. The rules engine says HOLD; the Forecaster sees a rougher month than usual (34% against a usual 15%)."
  - No clear view: "No clear view · Its chances are too close to the usual to count: 50% up, and 18% against a usual 17% for a fall over 5%." Only Why? and Track record.
- **Chat answer while in practice.** "The Forecaster is still in practice on this ETF, week 5 of 8, so its own view shows only on this holding's Forecast tab and in Saturday's review, labelled in practice, never in the chat."
- **C2, proof page "How it proves itself".** Reached from Track record or the hero's chip.
  - The backtest lab, Jan 2015 to Sep 2026: columns Rules engine, Buy and hold, Trend rule; rows Yearly growth, Worst fall, Worst year, Longest below a high, Calibration.
  - Walk-forward folds, and the final test "Oct 2024 to Sep 2026".
  - The live gate.
  - The switch-off, four states: "In practice now", "Live", "Off: Four weeks worse than the base rate: it switches itself off, and the owner is told", "Retrained monthly".
  - "Models now", all six "in practice".
- **C3, a fund.** Same order; the chart is a price line with "One price a day, a day late (next-day pricing): no candles, so only the line patterns on its price."
- **C4, privacy.** Only the £ value hides: "Nothing else on this screen carries pounds."

**Web Forecast and F7.** `app-v1/Forecast.dc.html` is the web spec, planned until MA-279 redraws it to 1a. It still says "31 similar days", which is to become 30, and its proof page is a "Not run yet" first state. F7 (MA-125) has only Telegram boards (superseded by MA-161): "Both splits add up to the usual £200", and the fourth button is "Something else".

## Phase 18: The agent team, epic MA-127

**The agents (AR §20.1).** The board shows "The agents 9":

| Agent | Job |
| --- | --- |
| Concierge | Talks to members; routes the admin's instructions |
| Data steward | Keeps prices flowing from free sources |
| News scout | Collects, tags and matches news |
| Analyst | The rules engine, code only |
| Forecaster | The models; switches itself off |
| Grader and tuner | Grades daily, calibrates within bounds, proposes promotions |
| Ops warden | Runs and repairs the daily pipeline |
| Budget keeper | The meter, the ladder and the guards |
| Admin desk | The one channel to the admin |

The rule: "Outside its band, it asks."

**Admin desk (MA-130, AR §20.3).** It is owner only and has two doors.

- **The owner's chat.** Example card: "Data steward asks … Switch on EODHD Historian at £19.99 a month? … Undo: switch it off; nothing else changes. [Approve] [Reject] [Why?] [Later]". Agents also ask plain questions with buttons or a typed answer, and the concierge turns the owner's instructions into a request with a Confirm card.
- **The Admin center** (`Admin center 2`): Approvals, Settings, Agents and incidents, Spend.
  - **Approvals.** Lists "Waiting for you" and "Decided last 7 days". Selected request: "Grader and tuner asks … Promote the risk model v8 over v7? … request cr-26", with "What changes / Why / Cost / Risk / Undo / Expires". Brier scores: held-out years 0.162 vs 0.171, 8 live weeks 0.158 vs 0.169. Buttons: Approve, Reject, Why?. After approval: "Approved at 08:29 by You, with your passkey. v8 serves from the next Forecaster run; v7 stays ready." Rejected entry: "not again before 27 Nov".
  - **Second check.** A fresh Sign in with Apple or passkey under Face ID, or Google again; it blocks approval if a safety case fails (MA-256). The board's dialog still says "your passkey on this Mac, or a fresh Google sign-in" and sends messages to Telegram, both flagged to fix.
  - **Settings.** "Every behaviour, as a setting · 31 settings". Each setting shows its value, key, range, band and mode (ask, auto, admin or tuner), plus version history and Roll back.
  - **Agents and incidents.** Heartbeat, last run, spend and status for each agent; "Fifteen minutes without a heartbeat opens an incident." Example incident inc-7, "The news scout is silent": what happened, what was tried, meanwhile, and three choices (Skip the story, Pause until Mon, Open an issue). Also a "Fixed on its own" list.
- **Timing.** Non-urgent requests wait for the daily digest; incidents come at once.

**Learning loop (AR §20.4).**

- Grading runs daily into `ScoreDaily`, rolling over 30, 90 and 365 days.
- Calibration is refitted daily and used only if better, with "no bucket moves more than two points in a day" and "a probation of 10 trading days" with automatic rollback.
- Challengers run "live in shadow"; one is proposed only when it beats the current version in the held-out years and over 8 live weeks by a margin.

**Self-healing (AR §20.5)** covers retries, failover, gap fill, catch-up, rollback, skipping a step and labelling its output stale, and replaying failed work up to three times. Anything else becomes an `Incident`.

**Budgets (AR §20.7)**, as shares of prod's $160: Concierge 55%, Forecaster 10%, News scout 10%, Grader 10%, Admin desk 5%, Steward and warden 5%, Reserve 5%. AWS and others are capped at £50.

**Agents' notes (MA-289, AR §24.4)** have no board yet.

**Household learning (AR §20.9)** is built in phase 9, not 18. Its tuner card is the Groceries £450→£520 example.

## Phase 19: India, epic MA-147

- **Accounts (MA-153, AR §22.3).** `demat`, `mf_folio`, `nre`, `nro`, plus `ppf`, `nps`, `elss` if held.
- **INR and GBP.** "Every Indian figure shows in INR with its GBP value beside it". The total stays in the base currency, with the INR view one tap away.
- **Board** (`India.dc.html`, browser boards "Overview with India", "Holding · Indian fund", "Holding · NSE share"):
  - Holdings are grouped "UK first", then India by account.
  - Wrapper copy: "A demat account in rupees … it cannot go into your ISA, and MyPaisa cannot trade."
  - Tax flag: "May not be a UK reporting fund: check with a tax adviser".
  - "Calls on Indian holdings: none graded yet."
- **CAS import (MA-152, AR §22.2).** A dry run, then "one summary card", then Confirm with the second check, rollback by import id, and every file kept. The password is "never stored, logged or sent". No PAN, address or account number is kept in any record. The board's import flow is Telegram (superseded): "Import 2 funds, 186 transactions from CAS-Oct-2026.pdf".

## Phase 20: Beyond the chat, epic MA-175

None of these has a board; each is "drawn with /design-first before it starts".

- **Widget (MA-176).** Shows "the household's total and the day's move on the Home Screen and the Lock Screen, from the last fetch with its time". In privacy mode it shows "the mark and 'Hidden'".
- **Share sheet (MA-177).** A factsheet or screenshot shared from Mail, Files or Photos opens the chat on the reading card; "nothing is saved before Confirm".
- **Siri and Shortcuts (MA-178).** "How is the portfolio today?" is answered with the total and the day's move. "Log money into MyPaisa" opens the guided flow. Never a write without Confirm in the app.
- **Live Activity (MA-179).** Follows an import on the Lock Screen and in the Dynamic Island, "with no amounts".

## Product rules, and what to mark as draft

**Rules that constrain these screens:**
- Code produces every number; Claude only explains it.
- "MyPaisa cannot trade"; "never says sell everything".
- Risk comes before direction.
- A pattern is shown only "where a pattern's event study shows an edge".
- While in practice, the Forecaster appears only on the Forecast tab and in the Saturday review.
- Privacy mode hides £ and ₹ everywhere.
- No amounts on the lock screen.
- "A view, not advice."
- Disagreement is said in words, not colour.

**Not defined or not drawn (mark as draft):**
- The Forecaster's confidence floor (left to MA-123).
- Each row's sheet, on iPhone and iPad.
- The loading, stale prices, no Forecaster yet, switched off, error, AX5 and Reduce Motion states.
- No clear view with privacy on.
- The proof page on iPad.
- The web Forecast at phone width.
- The iOS Admin center.
- The agents' notes list.
- Every phase 14, 16 and 20 screen.
- F7's iOS split card.
- The drawdown budget (AR §17).

**Board conflicts to resolve rather than copy:**
- The brief board says "by Sonnet"; AR §11 says Haiku scores sentiment.
- Stale phase labels: web Forecast says "phase 11", India says "phase 13", Admin says "Phase 12".
- Admin center 2's clock is Sat 31 Oct and India's is Mon 2 Nov, not the v4 Mon 26 Oct.
- India's figures ("Flexi-cap fund", "Nifty 50 ETF") differ from `household-v4.json` (Parag Parikh ₹5,61,995, Infosys ₹1,77,660, NRE ₹2,15,000, £1 = ₹112.50).

Main files:
- /Users/arundutta/projects/mypaisa-agent/ARCHITECTURE.md
- /Users/arundutta/projects/mypaisa-agent/PLAN.md
- /Users/arundutta/projects/mypaisa-agent/docs/trace.json
- /Users/arundutta/projects/mypaisa-agent/docs/design/figures/forecaster-v4.json
- /Users/arundutta/projects/mypaisa-agent/docs/design/figures/README.md
- /Users/arundutta/projects/mypaisa-agent/docs/design/ios-v1/iPhone v4 · Forecast.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/ios-v1/iPhone v4 · Forecaster proof and chat.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/ios-v1/iPhone dashboard.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/Forecast.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/India.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/Admin center 2.dc.html
