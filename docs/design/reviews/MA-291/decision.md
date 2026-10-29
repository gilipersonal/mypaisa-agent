# MA-291: Prototype v5, the whole journey at every door

## The request, in Arun's words (29 Oct 2026)

"Now I want to build full end to end working prototype for web, mobile and ios with all mocked and stubbed
data. It should cover all the scenarios across all phases from 0 to 20 - including forecast, projection, Stock
shares predictions, forecast, users chatting and entering assets, holdings forecast, buy/sell/add signal, news
and events sentimental analysis results whatever we discussed across all of Jira stories and Confluence pages.

Some of the designs were done 4 days back which had holdings, track record for the holdings. But after merging
wealth and stuffs, it drifted.

I need one consolidated app with stubbed data that runs the entire journery end to end for proper
understanding, Please dont drift from the ideas of
1, Creating an intelligent self learning recommendation system for stocks, shares, ETFs holding etc,
2. It will be based on rules and past data, we would have agents which wll come up with Engines to do those
based on data"

## Arun's choices (29 Oct 2026, asked in the session)

| Question | Pick |
| --- | --- |
| Form | A clickable prototype (Prototype v5) in `docs/design/`, a design record, not product code |
| Screens never drawn, or drawn before the wealth merge | Drawn straight into the prototype in the v4 design, following the picks already made, each marked **Draft, not picked**; no options rounds first |
| Doors | Desktop web, phone web (390), iPhone, iPad and foldable |

The options round of design-first is replaced by these choices (Arun's words win, design-first's precedence 1).
Every screen already picked (shell 1a Chat first and Chat beside, the dashboard 1a Net worth first, the check-in
card 1b Paid as the Confirm, the Projection 1a the fan first, the Forecast tab 1a The answer first, the future
plans' picks on MA-264) is drawn as picked; every other screen carries the Draft chip, and Arun's pick of each
goes into the boards through MA-279.

## The spine: the recommendation loop

Arun's two ideas are the prototype's spine, and every market chapter shows its part of the loop:

1. **Data:** prices and history (phase 10), news, events and sentiment (phase 14, in shadow), a share's
   fundamentals (phase 16), Indian markets (phase 19).
2. **Engines:** the rules engine (indicators, pillars, the holder's cascade, a confidence score: ARCHITECTURE
   §6) and the Forecaster beside it (§19): each holding gets a stance (ADD shown as Buy, HOLD, PAUSE, TRIM,
   REBALANCE, WATCH) with its reasons, never a trade.
3. **Grading:** every call is graded against what prices did (the track record and calibration, phase 13; the
   Forecaster's proof, §19.6), daily.
4. **Learning:** the agent team (phase 18, §20) reads the grades and proposes a change to a rule or a model on
   that evidence; the admin approves it behind the second check, and the change is audited. The household
   learns too (§20.9).

The app never trades: a stance is a signal with its reasons, never a buy or sell button (design-first's
product rules).

## One clock, one ledger

Prototype v4 and MA-281's Forecaster figures share one clock: today is **Mon 26 Oct 2026**, prices are at the
**Fri 23 Oct close**, £1 = ₹112.50, and the Saturday review ran **Sat 24 Oct 09:00**. Prototype v5 keeps it.
The household has used MyPaisa for its investments before Mon 26 Oct (the five UK holdings exist; the
Forecaster is in practice, week 5 of 8); on Mon 26 Oct it registers its first whole-wealth record (v4).

Every step carries its date and time, and every page in every step is drawn from the ledger as of that time
(lessons 13 and 19). The chapters follow the phases 0 to 20, so the journey moves back and forth in time between
chapters; the date on each step says when it is, and the figures are always the ones true at that time.

## Files

- `docs/design/app-v1/Prototype v5.dc.html`: the board (drawn in MyPaisa app v1, mirrored).
- `docs/design/app-v1/prototype-v5*.js`, `prototype-v5.css`: its scripts and styles, on the DS v1 tokens and kit.
- `docs/design/figures/market-v5.json`, written and checked by `make_market.py`: the market side's figures.
- `docs/design/figures/prototype-v5-data.js` is not kept: the board reads `prototype-v5-data.js` in app-v1,
  written from the figure sets by `make_market.py --prototype`.

## Open questions for Arun

1. **The rules engine's chip on the Forecast tab (1a).** The picked board (MA-281) says "Rules engine · Live".
   On the prototype's one clock the rules engine's stances are still in shadow on Mon 26 Oct (week 6 of 8;
   the gate passes at the Saturday review of Sat 7 Nov, phase 15), so the prototype says **In shadow** there and
   switches to Live from Sat 7 Nov. The picked board was drawn for a world where phase 15 had already passed.
   Keep "In shadow" before the gate (the plan's order, ARCHITECTURE §11 and §16), or draw the Forecaster's
   chapter after the gate?
2. **Sonnet 5.5's price.** ARCHITECTURE §24.6 prices its input at $2 a million tokens; Prototype v4's run r-1235
   only adds up at $3 in, $0.30 cached and $15 out. The prototype keeps v4's prices.
3. **The household's learning example.** ARCHITECTURE §20.9's tuner card moves Groceries £450 → £520, which this
   household's £650 Groceries plan and the six-closed-months rule cannot give; the prototype draws £666 → £720 on
   Thu 1 Apr 2027, every claim asserted in `make_wealth.py`. Change §20.9's example to match?

## Where it lives: the repo, not Claude Design

Rule 7 of `.claude/rules/plan-sync.md` has boards drawn in Claude Design and copied here. The claude-design
connector writes only inline file contents, and Prototype v5 is about a megabyte of scripts and figures; with
standalone Claude Design closing on 14 Dec 2026 (MA-259), the prototype is kept in the repo as its own design
record, in `docs/design/prototype-v5/`, outside the three mirrored projects, and published as a private
Artifact for the walk-through (MA-259's option B for this one record). It can be copied into a Design canvas
later if Arun wants one.

## Choices the builders made where the docs leave it open

- Phase 1's sign-in is at Mon 26 Oct 09:30 (Prototype v4's was 09:40), so every later step of that morning is
  signed in; runs r-1232 to r-1234 and r-1240, r-1241 are added around v4's r-1235.
- The Claude ceiling stays at $160: the move to $180 is refused by prod's hard limit, so phase 18's agent shares
  are of $160.
- "I put £200 into Balanced" is a replay of Fri 23 Oct 08:13, already inside Friday's close, so net worth does
  not move twice.
- The agent team's rule change (cr-27) asks a PAUSE on exhaustion alone to need 3 flags, not 2, on the graded
  record (41 calls changed in the held-out years, 27 of them better; 3 in the live weeks); it changes none of
  today's stances. The risk model v8 (cr-26) stays waiting, so the Forecaster's week 5 of 8 is not disturbed.
- The Lock Screen widget's day's move is the engine's own UK moves plus the two Indian holdings' (▲ £55),
  asserted to the penny against `engine-v5.json`.
- A news tilt moves a call at most one notch along Buy · Hold · Pause, in shadow; on Mon 26 Oct only Robotics
  would move.
- From Sat 7 Nov the ledger carries the Fri 6 Nov close (`engine-v5.json`, `fri_6_nov`): net worth £456,940.

## Status

In progress. The glitch review, the gates and the pick are recorded below as they happen.
