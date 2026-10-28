# MA-264: the brief every drawing lane works from

The options round for the screens MA-261's future plans need. Every figure comes from
`docs/design/figures/future-plans-v4.json` (written by `make_future_plans.py`; its README says how). Nothing on a board
is worked out by hand: take each figure from the JSON, and where a board must derive one (a sum, an axis), derive it
in the board's script from the JSON's figures and say how in the board's notes.

## The clock and the people

- Mon 2 Nov 2026, one evening, 20:41 to 21:05; status bars and audit rows use these times.
- Arun, the household's one admin, does the planning. Asha is a member; she is not drawn this round, except where an
  option needs the member's view to make sense.
- Net worth today: £456,493 (after Sunday's card statement).
- The runs:
  - R1 at 20:43, after the school fees are saved;
  - R2 at 20:46, after the pot is applied;
  - R4 at 20:59, after the salary step and the HDFC closure.

## The three questions

| # | Question | Stories | Options | Projects and files |
| --- | --- | --- | --- | --- |
| 1 | The Budget forecast tab | MA-262 (MA-224's tab) | 1a, 1b, 1c | app: `Web v4 · Budget forecast.dc.html`; ios: `iPhone v4 · Budget forecast.dc.html` (iPhone and iPad frames) |
| 2 | A plan made in the admin's chat: the questions, the impact, the ways to cover a shortfall, and Confirm | MA-222, MA-263, MA-223 | 2a, 2b, 2c | app: `Web v4 · Plans in the chat.dc.html`; ios: `iPhone v4 · Plans in the chat.dc.html` |
| 3 | The Plans tab | MA-224, MA-222 | 3a, 3b | app: `Web v4 · Plans tab.dc.html`; ios: `iPhone v4 · Plans tab.dc.html` |

Projects:
- app (MyPaisa app v1) is `0bf02ae1-2de2-42a8-98ff-96046b2a26d7`;
- ios (MyPaisa iOS v1) is `43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8`.

Both already hold `support.js`, `tokens.css`, `ios.css`, `motion.css` and `motion.js`.

## The options

### 1. The Budget forecast tab (R1, 20:43, after the fees are saved and before Arun rearranges)

All three show the same figures:
- R1's years 2026 (Nov–Dec) to 2046 at 20 years, in GBP, not in today's money;
- the flagged years 2029 to 2035 (below Arun's £500 floor: 11 months a year in 2029 to 2032, Jan and Feb in 2033 to
  2035);
- a way into the chat's rearrangement ("Ways to cover it", which opens the chat with the card);
- each figure opening its flows (the trace).

The options differ in what comes first.

- **1a The surplus first (recommended).**
  - A bar chart of each year's surplus to the horizon, with Arun's floor as a line and the flagged years marked by
    shape and colour (▼ and the alert colour, never colour alone).
  - Under it, the selected year: 2029, the first flagged year. It shows as lines that add up to its surplus:
    - income by member;
    - spending by category, collapsed to a total with "12 categories";
    - EMIs;
    - the SIP and the LIC premium;
    - each plan;
    - the surplus, the savings rate and closing cash.
  - "Show the months" expands 2029 into its twelve months.
  - Why recommended: like the Projection's 1a, the shape comes first. Where the budget gets tight shows at a glance,
    and the detail is one tap away.
- **1b Year by year.**
  - A list of years, each row with its surplus, savings rate and closing cash, and a flag chip on 2029 to 2035.
  - 2029 is expanded in place to its lines, and "Months" goes one level deeper.
  - The summary first, then the list.
- **1c The ledger table.**
  - A table: years as rows, columns income, spending, EMIs, plans, surplus, savings rate and closing cash.
  - The year column is sticky, and flagged rows are marked.
  - A cell opens its trace in a popover (desktop) or a sheet (phone).
  - At 390 and on iPhone the table scrolls sideways with the year column fixed; say on the board what that costs.

### 2. A plan made in the admin's chat (20:41 to 20:46)

The conversation is the JSON's `conversation`, `impact` and `rearrange`. Three steps:
- **A.** 20:41: Arun's words, then the questions (at most three, with chips).
- **B.** 20:42: the answers, then the impact card with Confirm:
  - the middle path at 2031, 2036 and 2046, before → after;
  - the surplus each year, with the floor;
  - "below your £500 floor in 50 months, Jan 2029 to Feb 2035";
  - cash stays above zero;
  - the new milestones.
- **C.** 20:43: Confirm saved the plan (its audit row). The shortfall card offers the three ranked options with their
  changes, effect and "why", and the two more. Confirm applies the one picked. At 20:46 the applied state follows: the
  two audit rows with Undo, and November's planned surplus £2,636 → £1,946.

The options:
- **2a A card per step (recommended).**
  - The questions card, the impact card and the ways-to-cover-it card are three cards, each with one job and one
    Confirm.
  - The options sit in the third card as three stacked option blocks, each with its own Confirm (filled content
    button), plus "Two more ways" folded.
  - Why recommended: it is how every card in the chat already works (one job, Confirm, an audit row), it reads at AX5,
    and each card has one plain line for push and VoiceOver.
- **2b One card that grows.**
  - One plan card that fills in as Arun answers: each slot ticks from a question to its answer.
  - The impact appears inside it, then a "Cover the gap" section with the options as a single choice (radio rows).
  - One Confirm at the bottom saves the plan and the picked option together, so the plan item and the rearrangement
    land in one audit pair.
  - Say on the board that this merges two Confirms, against §6.6's order, plan first and then the rearrangement.
- **2c Compare side by side.**
  - The impact card, then the options as a comparison: three columns on the desktop chat and on iPad (the chat
    column is narrow, so measure it), and a horizontal pager on the phone.
  - The rows are what changes, the lowest month, the months below the floor, and 2046's middle path.
  - Apply sits under each column.

Simple and technical: each card has the Technical fold. Draw one card in technical mode in each option: the engine's
run id and time, the inputs hash, "every figure from the engine; your words: …".

### 3. The Plans tab (R4, 21:05: all seven plans saved)

The plans:

| Plan | Effect | Amount and dates |
| --- | --- | --- |
| Home extension | new_flow, one-off | −£35,000, Jun 2027 |
| Asha's annual bonus | new_flow, yearly | +£3,000 each March 2027 to 2052, grows 3.5% a year; version 2, corrected 26 Oct |
| School fees pot | the rearrangement | £690 a month Nov 2026 to Dec 2028, drawn Jan 2029 to Feb 2035 |
| Arun's salary | change_flow | set to £5,500 a month from Sep 2028 |
| School fees | new_flow, monthly | −£4,000 a month Jan 2029 to Jul 2041, 4.5% a year |
| Close the HDFC home loan | record_event | with the SBI FD in Mar 2029: ₹5,93,849 cleared, ₹23,689 left over, the ₹39,390 EMI ends 16 months early |
| Replace the car | new_flow, one-off | −£25,000, Jun 2031 |

Every row:
- shows the admin's own words (source_text) on a second line, or in Technical;
- carries its figures as pills (the admin corrects them in place);
- has Pause and End in a menu.

"Add in chat" opens the chat, since nothing is created on the tab.

The options:
- **3a Bars on a timeline (recommended).**
  - Each plan is a row with its name and a bar across the years: recurring plans as bars, one-offs and events as
    marks, a change as a step.
  - The axis runs 2026 to 2046 at 20 years, with today marked.
  - A tap opens the plan's sheet: the pills, its words, Pause, End, its audit history.
  - Why recommended: ARCHITECTURE asks for "each plan on a timeline", and the overlaps (the pot running into the
    fees, the HDFC loan ending as they start) show at once.
- **3b A timeline down the page.**
  - A vertical, chronological feed: 2026 the pot starts, 2027 the extension, 2028 the salary, 2029 the fees start
    and the HDFC loan closes, 2031 the car, 2035 the pot runs out, 2041 the fees end.
  - Each entry is a card with its pills.
  - It reads like a story, but a recurring plan shows only at its start and end.

## The Projection's chrome (questions 1 and 3; the same in every option)

- **The title:** "Projection", reached from Home (iOS: pushed, Home selected in the glass tab bar; web: the sidebar's
  Projection).
- **The tabs:** three. Copy the labels exactly: **Net worth · Plans · Budget forecast**. iOS and 390 use `mp-seg`,
  full width, under the large title; desktop and iPad use underline tabs under the page title. The tab on screen is
  selected.
- **The horizon:** 5, 10, 20 or 30 years, opening at 20 (MA-261). iOS and 390 use `mp-seg` with "5 yrs", "10 yrs",
  "20 yrs" and "30 yrs" on their own row; desktop and iPad put them in the page's control row.
- **The money:** £ GBP · ₹ INR, and Today's money, the 1a ctl row as drawn on `iPhone v4 · Projection`. iOS and 390
  put it on the row under the horizon; desktop and iPad put it in the same control row.
- **Below the chrome:** the tab's content. A flag uses the alert colour with ▼ and words. "Ways to cover it" is a
  content button that opens the chat with the rearrangement card (§6.6, item 7).

## Doors and frames

- **Web (MyPaisa app v1):**
  - desktop at 1440, in shell 1a Chat beside: copy the frame, sidebar, page and chat column from
    `Web v4 · Projection.dc.html` and `Web v4 · Shell and chat.dc.html`;
  - phone web at 390: the adaptive shell, with the tab bar and the chat as a tab.
- **iOS (MyPaisa iOS v1):**
  - iPhone, the `dev dev-iphone` frame of `iPhone v4 · Projection.dc.html`;
  - iPad landscape at 1180 × 820, with the sidebar, the screen and the chat beside from 1133 pt: copy the frame from
    `iPad v4 · Budget, assets and debts.dc.html`.
- **Themes:** every option's main frame at every door, in light and dark.
- **Board names:** a board's name is `<door> · <screen>, <option name>`, for example
  `Browser · Budget forecast 1a, the surplus first` or `iPhone · Budget forecast 1a, the surplus first`. A board with
  iPhone and iPad frames takes the door of its first frame and names the iPad frame in its caption
  (`iPad · Budget forecast 1a, the surplus first · Light`). Frame captions are `<board name> · Light` or `· Dark`
  (with a step, `<board name> · 20:42, the impact · Light`).
- **The file:** an intro section first, as the v4 files have: the request, the clock, the Jira keys, and the plan line.
- **Notes:** each board ends in short notes. Say where the figures come from, what the option costs, and anything that
  differs from the plan (rule 6).

## The rules every board keeps

These are design-first's rules and the checklist in `.claude/rules/independent-review.md`.

- **Writing:** create in the chat, correct in place. Nothing is created on a tab; Pause and End are the admin's, and
  so are a plan's corrections. Members see but save nothing.
- **Figures:** every figure is the engine's (the JSON's); copy never implies the model worked a number out. The
  summary comes first, the detail one tap away; Technical folds on cards.
- **Trading:** the app cannot trade. No buy or sell anywhere; "take from Balanced" is a plan's funding, not an order.
- **Privacy:** not drawn this round, but leave room: no figure in a place a mask could not sit.
- **Liquid Glass:** only on controls (tab bar, sidebar, toolbars, composer, chips, menus, partial sheets). Content is
  solid Warm ledger; no glass on glass; Confirm on a card is a filled content button.
- **Colours:** use the tokens and kit classes only (`tokens.css`, `ios.css`, `motion.css`). No new colour or token.
  If a board needs one, stop and say so in the report, since it needs the contrast gate first (lesson 11). No
  `--mp-ink-3` for anything that must be read.
- **Motion:** use `motion.css` and `motion.js` and their roles. Never put `label` or `dot` on an element without
  `mp-chartlbl` or `mp-chartdot` (`plan_sync.py check` refuses it); use `fade`.
- **Charts:** labels and dots in HTML over the SVG; no template value inside SVG `<text>`. Bars and tracks use their
  tokens (board_fit refuses others). The house chart style is the Projection boards'.
- **Dates and figures:** every date with a weekday agrees (Mon 2 Nov 2026). Every list sums to the total shown (the
  JSON's rows already do). A figure shown on two boards is the same figure.
- **Targets and type:** 44 pt targets in the app and 44 px on the web; tabular numerals; SF Pro through the kit's text
  styles.
- **Layout:** no fixed pixel column widths; fluid charts; the web pages built on `.mp-app`, `.mp-shell` and
  `.mp-cols`, as the v4 web boards are.

## How a lane works, and what it must not touch

1. Load the Claude Design prompt (`get_claude_design_prompt`) and `read_design_skill hifi-design`. Read the v4 board
   your option grows from, in full, in the repo mirror.
2. Write the board locally first, at `docs/design/app-v1/<file>` or `docs/design/ios-v1/<file>`. Then:
   - run `node scripts/board_fit.js --engine chromium --only "<file stem>"` until it reports 0 faults, then the same
     with `--engine webkit`;
   - screenshot every frame in light and dark with Playwright (a local static server on `docs/design/`, `?static=1`)
     and look at each image.
3. Upload it with `write_files` (new file: `if_match: "0"`) and check it with `render_preview`. Keep the `open_url`
   for the report; never give anyone a `serve_url`.
4. Do not run `design_sync.py pull`, and do not edit `tokens.css`, `ios.css`, the motion files, `support.js`,
   `docs/trace.json`, PLAN, ARCHITECTURE or another lane's files. The maker of the round records the boards in the
   trace and pulls once, at the end.
5. **Report:**
   - each file;
   - each board's exact name and its frames' exact captions;
   - the `open_url`s;
   - the board-fit results in both engines;
   - anything you could not draw, or that disagrees with the plan.
