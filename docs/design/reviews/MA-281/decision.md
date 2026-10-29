# MA-281: the stock Forecaster's screens in the app

## The request

On 29 Oct 2026 Arun asked to "show me the iOS and desktop UX designs for Stock forecasting here". The stock
Forecaster (`ARCHITECTURE.md` §19, phase 17) turned out to have browser boards only (MyPaisa app v1,
`Forecast.dc.html`, drawn on 24 Oct before the shell pick) and no iOS board: its iOS screens were undrawn on MA-124.
Asked whether to finish MA-275's publishing first or draw the iOS boards first, he chose "Draw iOS boards first".

What the boards must show (§19.4, §19.6, §19.7, PLAN phase 17):
- the Forecaster's view of a holding beside the rules engine's call, with disagreement flagged and "no clear view"
  below the confidence floor;
- the fan of the likely range, the mood timeline, the similar days over today's chart, the event-impact table, the
  main drivers, candles for ETFs and shares, and both engines' track records side by side;
- the patterns F8 finds on the candles (MA-280, Arun's "Algorithm and pattern driven. feeding on candle and all sorts of
  technical charts"), only where a pattern's event study shows an edge, and a fund's line patterns only;
- while it is in practice (its first 8 live weeks), only on the holding's Forecast tab and in the Saturday review,
  labelled so, and in no weekday card or chat answer. Arun settled this on 29 Oct 2026, in review round 1; until then
  §19.6 and PLAN F6 said the Saturday review only, and they now say this;
- privacy mode and both themes.

## How it was drawn

- **One figure set** (lesson 13): `docs/design/figures/forecaster-v4.json`, from `make_forecaster.py`, on MA-193's
  household and its clock (Mon 26 Oct 2026, prices at the Fri 23 Oct close). Asha's NASDAQ 100 ETF (£512) carries the
  candles and the patterns; Arun's Balanced fund (£22,925) is the fund with no candles. The figures are the browser
  board's where it has them (52%, 21% against a usual 12%, −7% … +6%, Stressed since Sat 3 Oct, 30 similar days (as §19.4
  counts them) and 18 recovered, PAUSE · 64%), so the two doors agree; the browser board's 31 becomes 30 in MA-279.
- **The boards are generated** from the figure set by `build_boards.py` in this folder, using only the kit
  (`tokens.css`, `ios.css`, `motion.css`, `motion.js`) and its tokens: candles in `--mp-up` and `--mp-down-quiet`,
  the range in `--mp-band`, the patterns in `--mp-chart-4` and `--mp-chart-2`, the drivers in the pillar tokens. No
  new colour, so `contrast_check.py` needs no new pair.
- **Shell 1a** (MA-163): on iPhone, pushed from Assets with the Liquid Glass tab bar; on iPad landscape (1180), the
  sidebar, the screen and the chat beside it (from about 1133 pt); the foldable folded (compact) and open (regular
  narrow, the tabs at the top and the chat a sheet away).

## The options

Claude Design, MyPaisa iOS v1:

| Canvas | What it holds |
| --- | --- |
| [iPhone v4 · Forecast](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Forecast.dc.html) | 1a, 1b and 1c, each on iPhone and iPad in light and dark |
| [iPhone v4 · Forecaster proof and chat](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Forecaster+proof+and+chat.dc.html) | The chat's card in the Saturday review (agree, disagree, no clear view, technical open), the proof page, a fund, privacy mode, the foldable |

The canvases were built by `build_boards.py`, gated in the mirror first, sent to Claude Design and copied back with
`design_sync.py pull`; the copies matched the build byte for byte. A frame pair (light and dark, or scrolled) shares one
screen through the canvas's own template (`sc-for` over the frames its logic class lists), so the files stay small.

- **1a · The answer first (recommended).** A navy hero with three figures, risk first: the chance of a fall over 5%,
  the likely range, then the chance of being up. The rules engine's call sits under them, with a line saying whether
  the two agree. Next come the candles with the fan and the patterns marked on them, and the patterns with what
  followed each on this ETF. Then one row per model, each opening its sheet, and the two track records.
  - Why recommended: it answers the question on the first screen, summary first and detail a tap away, like every
    other v4 screen. Risk leads because the goal is fewer deep falls.
- **1b · The chart is the screen.** Three small figures and the rules engine's call in a strip, then a tall chart with
  a layer per model: Range, Patterns, Similar, Events. The layer changes what is drawn and the panel under it.
  - For: a member who reads charts. Against: a layman has to learn the layers before the screen tells them anything.
- **1c · Questions, answered.** A sentence first ("Rougher weeks than usual look likely. Up or down is close to
  even."), then the questions a member asks, each answered in one line with its figure and opened in place with its
  chart.
  - For: the plainest reading. Against: the chart is a tap down, and the figures are read in a list.
  - The sentence is fixed wording code picks from the figures (§1).

Shared by every option, drawn in 1a's style and restyled to the pick:
- **The chat's card (§19.7):** the rules engine first; a disagreement in words (Robotics ETF: HOLD against a 34%
  chance of a fall over 5%); "no clear view" (Silver ETC, 50% and 18% against a usual 17%).
- **The proof page (§19.6, named in §19.7 since Arun kept it in review round 1):** the lab's first report (the rules engine over ten years against buy-and-hold and a trend
  rule), the walk-forward folds (fold 4, 2022, missed; the final test, Oct 2024 to Sep 2026, passed), the live gate (week 5 of 8, next on
  Fri 30 Oct, Fri 6 Nov, Fri 13 Nov), the switch-off in §19.6's stages (in practice, live, off, retrained monthly) and the models
  now. A model reaches practice only after its tests, so the page has figures, unlike the web board's first state.
- **A fund:** the Balanced fund's daily price line with the same fan; its one line pattern, higher lows since August,
  on a trend line through all three lows; a row per model and both track records (the rules engine's 11 of 14 HOLD
  calls, §9.2).
- **Privacy mode:** only the holding's value is masked; the forecast is in percentages.

## Checks run before Arun sees it

- Each frame captured and looked at in light and dark (`.claude/skills/plan-sync/scripts/capture_boards.js`). Fixed:
  y labels under the candles (now a gutter), the range figure breaking across lines, a month label of one day, the
  chat frames' unbalanced markup, run-in headings in the proof page's cards.
- `node scripts/board_fit.js --only "iPhone v4 · Forecast"` in Chromium and WebKit, at every size each frame's class
  covers.
- `python3 scripts/contrast_check.py --selftest` and the plain run; `python3 scripts/plan_sync.py selftest` and
  `check`; `python3 scripts/design_sync.py check` after the copy.

## Not drawn yet

These are listed on MA-124's trace row (moved there from MA-281 at the pick) and drawn before MA-124 starts:
- the picked option's remaining states: loading, stale prices, a holding with no Forecaster yet, the Forecaster
  switched off, AX5 and Reduce Motion; an error, a long holding name, and the Forecast tab of a holding with no
  clear view;
- each summary row's sheet;
- the proof page on iPad.

The web app's Forecast boards are redrawn to MA-281's 1a in MA-279, with 30 similar days.

## The pick

**1a · The answer first**, Arun, 29 Oct 2026 ("Pick 1a"), after a side-by-side comparison of the three.

- The canvases mark 1a picked, and 1b and 1c not picked; they stay as the record.
- The shared screens are drawn in 1a's style already, so they stand as drawn.
- `ARCHITECTURE.md` §19.7 names the picked screen and PLAN's MA-281 bullet records the pick.
- In the trace, MA-281 is `picked` with 1a's boards and the shared boards.
- MA-124 lists the same boards as its app spec. Its iOS and F8-pattern undrawn items are cleared with `Drawn:` notes.
  1a's remaining states and each row's sheet move to MA-124's undrawn list, so MA-124 cannot start before they are
  drawn. The proof screen on iPad also stays listed there.
- The web app's Forecast boards stay planned until MA-279 redraws them to MA-281's 1a.

## Review round 1

Arun asked for the review at the merge question ("Yes"). Three lanes ran at once, each blind to the making: the boards
and the design mirror, the trace with Jira and the spec, and the scripts with the generated pages. They found 33
blocking findings, many the same in two lanes; every one is fixed, and each fix is in `review/MA-281/fixed.json` with a
check that tests what the fix does.

- **Arun's two decisions** (29 Oct 2026). While the Forecaster is in practice it also shows on the holding's Forecast
  tab, labelled in practice: §19.6, the glossary, PLAN F6, the risk table, the Market Agent page and MA-124 say so. The
  proof page stays: §19.7 names it, and MA-124's open question is settled.
- **The candles.** Drawn through a shared SVG def, the wicks escaped the kit's non-scaling-stroke rule and drew wider
  than the bodies. Wicks are now thin filled rects, and every stroked mark sits in the chart's own SVG.
  `plan_sync.py check` now refuses a stretched chart's `<use>` of a def that draws lines or paths, and its selftest
  proves it on a mutated board.
- **The figures.** The neckline is the trough's low (+6.2%, broken first on Wed 14 Oct). The support (−1.15%) holds
  on every bar, and no bar's open sits under its low. There are 30 similar days with a middle of +1.8%, drawn from the
  figure set. The final test ends in Sep 2026. The fund's trend line passes through its three lows. `make_forecaster.py`
  asserts each of these over its own data, not over typed-in numbers.
- **The frames.** New frames show 1a's track records on iPhone and iPad, the fund's patterns, rows and records, the
  "no clear view" card, and the proof page's switch-off and models.
- **The words.** The proof page uses §19.6's stages only. A pattern with no edge is not shown (§19.4). PAUSE reads as
  §6.3 does. A weekday chat answer carries no Forecaster figures while it is in practice. The range's end labels sit
  in a gutter clear of the fan. The "Nov" tick sits on Mon 2 Nov.

