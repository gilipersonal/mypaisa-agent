# MA-307: MyPaisa is a wealth tracker only

Arun, 2 Nov 2026: "remove the Holding market forecast and prediction part
completely. Including signs of buy/add/sell call. This is an Agentic AI based
Wealth Tracker only where I can make smart budget expenses and forecast my
wealth growth based on actual numbers like CAGR and XIRR. Everything will be
prompt driven. I can add anything but only via chat. Editing of existing
assets is an option. Even Deletion will have to go throw AI chat. Only admins
can do all these. Others users can view only. I need robust AI agents to do
all this, as the budgeting and forecasting on my wealth will be dynamic. We
need to modify all the designs and documentation and stories accordingly."

His answers the same day:

| Question | Answer |
| --- | --- |
| Editing | Adding and deleting happen only in the chat; an admin may still correct an existing figure in place on a screen, as today (`via: inline_edit`). |
| Admins | Several. The owner grants or takes back the admin role through the chat, with Confirm, the second check and an audit row (MA-308). Admins add, correct and delete; every other member views only (their own preferences aside). The owner is always an admin. |
| Retired stories | Labelled `retired`, commented with his words, moved to Done; they leave PLAN, the trace and the roadmap. |
| Boards | Market-only boards deleted; stance, forecast and Forecaster parts stripped from the rest; shown as one Artifact before the merge. |

## The product now

An agentic AI wealth tracker for one household. Everything is prompt driven:
admins add, correct and delete through the chat (correct also in place); other
members view. A team of agents keeps the records, the budget and the wealth
forecast (the Projection and the Budget forecast) dynamic, from the household's
actual numbers: XIRR and CAGR from the dated ledger, contractual rates,
salaries, debts, commitments and plans. Daily prices exist only to value
holdings. Nothing predicts a market, and nothing says buy, add, hold, pause,
trim or sell.

Deleting (MA-309): only in the chat, admin only, card + Confirm + second
check; the record is marked `deleted` (a status, hidden from every view), its
events, audit rows and files kept for good, restorable through the chat.
Closing (`closed`, `matured`, `sold`) stays separate.

## What goes (retired)

- The rules engine: indicators, pillars, the holder's cascade, the confidence
  score, forecast ranges, macro regimes, the proxy basket (ARCHITECTURE before MA-307: §6.1
  to §6.5, §5.2 look-through as an engine input).
- Stances and every ADD, BUY, HOLD, PAUSE, TRIM, SELL call; stance chips; "I
  acted" and decision records; the Saturday review.
- Research cards (stance, holding profile, overlap, fund vs benchmark, bear vs
  bull, the currency scenario card) (§7).
- Track record, graders and calibration of calls (phase 13).
- News, events and sentiment (phase 14, old §11's news part).
- Stances going live (phase 15).
- The Forecaster (phase 17, §19), and the "stock investment forecast" word.
- The market morning brief and evening wrap.
- In the agent team: grading predictions daily, recalibrating confidence,
  challenger models (E4 to E6).
- In the Indian phase: IN4 (engine and Forecaster for India) and IN3's
  "wrapper-aware suggestions".
- A share's valuation and earnings cards (MA-99).
- The Market Agent explainer page and Prototype v5's engine and forecast
  chapters.

## What stays

Daily prices to value holdings; XIRR and CAGR; the Projection and the Budget
forecast (wealth forecasts, graded against the household's own actuals,
§18.8, old §20.9); budget and statements; check-ins; the audit log; the Admin center;
the agent team (admin desk, data steward for prices, ops warden, budgets,
traces, safety suites, memory notes); alerts (budget, check-ins, failed jobs);
charts in the house style; ask anything about the household's wealth.

## Stories

Retired (labelled, commented, Done, out of the trace): epics MA-11, MA-15,
MA-16, MA-17, MA-117; MA-47, MA-48, MA-49, MA-50, MA-51, MA-52, MA-53,
MA-57, MA-60, MA-63, MA-64, MA-65, MA-66, MA-67, MA-183, MA-78, MA-81,
MA-82, MA-83, MA-84, MA-85, MA-86, MA-87, MA-88, MA-89, MA-90, MA-91,
MA-92, MA-99, MA-118, MA-119, MA-120, MA-121, MA-122, MA-123, MA-124,
MA-125, MA-126, MA-280, MA-281, MA-132, MA-133, MA-134, MA-154.

Moved into phase 5 (Investments, priced; epic MA-189): MA-42, MA-43, MA-45,
MA-46 (prices to value holdings).

Rescoped: MA-55 "Design the alert cards" (no brief or wrap); MA-153 shows
Indian accounts in INR and GBP with a tax flag where UK rules differ (no
suggestions); MA-62 answers about the household's wealth.

New: MA-308 (several admins, others view only; phase 8), MA-309 (delete
through the chat; phase 2).

## Phases, renumbered

| Was | Now | Epic | Title |
| --- | --- | --- | --- |
| 0 to 9 | 0 to 9 | as before | as before |
| 10 | retired | MA-11 | (price stories moved to phase 5) |
| 11 | 10 | MA-12 | Alerts, charts and the Claude client |
| 12 | 11 | MA-13 | Ask anything about the household's wealth |
| 13, 14, 15 | retired | MA-15, MA-16, MA-17 | |
| 16 | 12 | MA-19 | New kinds of holding (when you add one) |
| 17 | retired | MA-117 | |
| 18 | 13 | MA-127 | The agent team: configured, approved, self-healing, self-learning |
| 19 | 14 | MA-147 | Indian holdings and the existing Indian portfolio |
| 20 | 15 | MA-175 | The app beyond the chat: widgets, Siri, the share sheet, Live Activities |

## Boards

Deleted: `ios-v1/iPhone v4 · Forecast.dc.html`,
`ios-v1/iPhone v4 · Forecaster proof and chat.dc.html`,
`app-v1/Web v4 · Forecast.dc.html`, `docs/design/market-agent.html`.
Renamed and stripped: `iPhone v4 · Market, holdings and India` and
`Web v4 · Market, holdings and India` become `… · Holdings and India`.
Stripped of stance chips, stance cards, briefs' market lines, research
cards, scorecards, sentiment, the Forecaster and "I acted": every other
board that shows them.

## ARCHITECTURE's sections, renumbered

| Before MA-307 | Now |
| --- | --- |
| §1 to §5 | unchanged |
| §6.1 to §6.5, §7, §19, §20.4, §22.4 | removed |
| §6.6 | §6 (the wealth maths: XIRR, CAGR, the budget and the Projection) |
| §8, §9, §10, §11, §12, §13, §14, §15, §16, §17, §18 | §7, §8, §9, §10, §11, §12, §13, §14, §15, §16, §17 (subsections keep their numbers) |
| §20.1 to §20.3, §20.5 to §20.9 | §18.1 to §18.3, §18.4 to §18.8 |
| §21 | §19 |
| §22.1 to §22.3, §22.5 | §20.1 to §20.3, §20.4 |
| §23 | §21 |
| §24 | §22 |
