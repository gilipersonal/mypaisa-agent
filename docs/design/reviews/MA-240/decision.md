# MA-240: every board whole at every size, legible at 25%

## The request

Arun, 27 Oct 2026, asking for an independent UX review of every prototype and design:

> 1. The UI to glitch free, no overflowing or overalapping on different screen sizes.
> 2. Colour tones such that they dont cause issues even during low mobile brightness of 25%,
> 3. The text and overflows should be taken care of, when resizing nothing should break or over flow.

Then: "fix all these glitches across the UX design", and "I want precise measurement and accurate pixel render,
used the best approach to fix all the glitches and review properly". His fourth point, colourful icons for each kind
of holding, asset and debt, is new work: MA-241 (he picked option B on 27 Oct 2026).

## How it was measured

- **Every current board**: MyPaisa iOS v1, the browser boards and Prototype v4 in MyPaisa app v1, and MyPaisa DS v1.
  The superseded record (the Telegram and Mini App boards, the first Prototype, Chat basics and the Currency check
  files) is left out; nothing is built from it. The design system's documentation pages (Foundations, Components,
  Components 2, Logo, the directions page) and Research cards, drawn as Telegram messages, have no device or browser
  frame to resize; they are listed as such, with their reasons, in `scripts/board_fit_allow.json`.
- **Rendered as Claude Design renders it**: the mirrored files with their own `support.js`, `?static=1` so motion
  lands at once, waiting until no template hole shows; at the screen's own pixel ratio (3 for the iOS boards, 2 for
  the rest), in Chromium and in WebKit (Safari's engine, whose system font sets wider).
- **Every size a member can have**: an iPhone from 320 (Display Zoom) to 440 and in landscape, an iPad or foldable
  window from 600 to 1366, and the web from 320 to 1920. Below 1024 the web shows the page or the chat, never both,
  so a frame drawn with both is measured there on its page. The iOS kit's specimen panels are components, measured at
  their drawn size. Prototype v4 was walked at every door, theme and step.
- **What counts as a fault**, measured on the layout engine's own boxes: text clipped mid-word by a box that does not
  scroll, text past its box, two lines of text on the same surface touching, a column crushed to a word or two a line,
  a box cut at the screen's edge outside a row that scrolls, an icon shown as its name, a figure cut by an ellipsis,
  and a bar's track that is not the token. A line under a bar, a sheet, a toast, the chat's controls or the system's
  chrome is the scroll edge, not a fault.
- **Colour at 25%**: every text, icon, chart line, bar and track measured against the pixels behind it in the render
  (text hidden, the background read under each glyph; anything under a sheet or a scrim found by hit-testing and set
  aside), in the model of `scripts/contrast_check.py`: full brightness, and each luminance at a quarter with the
  room's 0.05 kept.
- **Nothing drawn moves by accident**: every frame of every board pixel-diffed against `main` at its drawn size, after
  every change to a shared rule, and every frame that changed looked at.

## What was wrong

| Where | At | What |
| --- | --- | --- |
| The web pages with the chat beside them (Web v4 · Dashboard, Assets and debts, Check-ins, Shell and chat, Projection, Budget) | 1024 and 1280 | The page's two columns followed the window, not the page: at 1024 the page column fell to a word per line and the hero ran under the list; at 1280 the hero's figures collided |
| The check-in card (iPhone v4 · Check-ins) | 402 and under | Four answers in one row behind a fade: "Paid off in full", one of the card's four answers, was cut off; at 320 a card row's words spilled past their box |
| Rows that scroll sideways: the composer's shortcuts, the suggestions, the summary pins | every iPhone; the iPad's chat column | Drawn as boxes that clip, so a chip was cut with nothing to scroll; the prototype's highlighted next step was cut mid-sentence at 320 and at 1024 |
| Chart axes (Forecast's folds, Projection, Assets and debts, the Admin meters) | narrower than drawn, and the Car loan axis at its drawn size | Labels on each other |
| Filters, a table's first column, the alert matrices, a detail card's rows, the Admin center's six pages, the Forecaster's four figures | 600 to 1280, and 320 | Four filters crushed to a letter per line; "Balanced" broken mid-word; matrix headers on each other; a detail header a word per line; the section bar cut at the edge |
| The rupee hero, iOS's alerts, the inline title, a schedule table, the Saved toast, the day-change card, a Quick Look page, a 4-column table | 320 | A figure cut by its card, an alert wider than the screen, a title under the bar's buttons, names cut with no ellipsis, boxes off the screen, headers on each other |
| A bar's empty track | 25% brightness | `#CDCFD4` passed on a card but faded on the page (1.42:1) and on a fill (1.33:1); the dark track was 1.24:1 dimmed on the navy hero; two boards mixed their own paler track (1.42:1); the Forecaster's tracks were the fill colour |
| The Projection's range band (8 in 10 runs) | 25% brightness | Drawn with the area's 18%: 1.08:1 dimmed on the hero, almost gone |
| Every iPad board with the chat beside the screen (review round 2) | 900 to 1132 (a 13-inch iPad upright, a wide Split View pane or Stage Manager window) | The sidebar, the screen and the chat side by side left the screen 360 to 480 pt: names a word per line, rupee figures and chips cut; 179 faults |
| The coral accent on dark tints (review round 2) | 25% brightness | 2.8:1 to 2.95:1 dimmed on the selected sidebar row and the success and alert tints, against 3:1 |

## What changed

All in the design system, copied to the iOS and app projects, so both doors inherit it:

- **`tokens.css`: the page is a size container of its own** (`.mp-shell-main`, `page`): a page under 700 keeps one
  column and stacks its own two-up parts and its head; under 720 the four filters take two columns; under 900 a detail
  card's label goes over its value, the Admin center's section bar scrolls and the Forecaster's four figures go two by
  two. Only with the sidebar and the chat both beside a page under 760 (a laptop from 1024) does its hero figure step
  down to 36, a narrow table scroll inside its card and a milestone's figure go under its words; from 700 to 759, in
  two narrow columns, the hero's strip of three goes two by two. The chat beside the page narrows first on a laptop between 1024 and 1360, to 28% of the window and never
  under 340; a drawer and a phone's chat keep their drawn width.
- **`tokens.css`: the iPad's chat is a sheet away from 900 to 1132** (Arun's pick, 27 Oct 2026, review round 2): from
  900 to 1132 (a 13-inch iPad upright, a wide Split View pane or Stage Manager window) the landscape boards put the
  chat column away, the screen takes its room, and the chat opens as a sheet from the sidebar's Chat, as it does from
  600 to 900; it sits beside every screen from about 1133 pt. From 1133 to 1179 (an iPad mini across) the chat column
  is 280, an inspector's narrowest, so the screen keeps the room it has at 1180, and a chat card's value goes under
  its key before it falls under 7em. The width rule reads the same in every
  record: "beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact
  window (every iPhone, a folded foldable, Slide Over)" (ARCHITECTURE 9.1, the design README, PLAN, the journey page,
  the boards' notes, MA-163 and the iPad stories in Jira).
- **`tokens.css`: fit guards** for the parts drawn on many boards, each acting only where the drawn screen would break:
  rows that scroll really scroll, under their own drawn fade, as iOS's do; the suggested next step wraps when it is
  wider than its row; a card's answers wrap and fill the rows; filter and choice chips wrap; a row's chip keeps its one
  line and never shrinks; an overline and a key-value figure wrap inside their cell; a table's first column keeps
  96 px, a matrix's 140 and the Forecaster's event table its readable columns, and each scrolls inside its card; a
  dialog's fixed matrix scrolls inside the dialog; a file viewer too narrow for its preview and its details side by
  side (under 780) puts the details under the preview, wraps its bar and scrolls; a list row's, a milestone's and a
  plan item's figure goes under its name, at the right, when the two no longer fit side by side (from 1133 to 1179 on
  an iPad, before the name falls under 8em); a key-value value of words wraps in its cell while a signed figure and a
  figure with its pencil keep their line; the Forecaster's event table keeps its figures in view while its range plot
  scrolls, and its eight weeks go to two rows of four; Home's countries pager keeps a card inside its screen; a
  notification card keeps inside its window; a chart's "not run yet" note keeps clear of its axis labels; a schedule's
  cut name shows its ellipsis; iOS's alert keeps inside a narrow screen, a zoomed one too. On a screen under 375 the
  hero figure steps down to 36, a table's figures keep their width and the table scrolls inside its card, a
  milestone's figure goes under its words and a list row keeps 9em of name; under 360 the hero's strip of three takes
  two columns, a row's chip line, a list row's figure and a card row's answers go under the words, the chat's strip
  puts its change under the figure, an in-place edit's field takes its own line, a toast wraps inside the margins and
  the inline and Quick Look titles keep clear of the bar's buttons; under 380 the prototype chart's call-out waits for
  a tap.
- **`tokens.css`: two colour tokens**: `--mp-track` is `#BEC1C8` in light (1.64:1 on the page, 1.54:1 on a fill,
  1.80:1 on a card, and 1.43:1 or more at 25%) and `#485160` in dark (1.81:1 and 1.26:1 dimmed on the hero, every mark
  on it still 3:1); every board's track takes it, edge line included (a meter that holds a track is its frame and
  keeps its own look). `--mp-band` is the range band, coral at 39% in light and 37% in dark (1.87:1 and 1.26:1 dimmed
  on the light hero, 1.50:1 on a card; 1.86:1 and 1.28:1 on the dark hero), so the line drawn over it keeps 3:1
  (3.06:1 on band and hero in both themes); every board's band takes it, on the hero and on a card. The dark accent is
  `#FFAF9B` (was `#FF9A82`): 9.66:1 and 3.51:1 dimmed on a card, 3.32:1 dimmed on the add tint, and on round 1's
  board tints 3.15:1 to 3.32:1 dimmed by the same measure.
- **`motion.js`: axis labels thin themselves where they would touch**, as Swift Charts and LayerChart do: on a chart
  narrower than drawn a label within 2 px of the one kept before it, or of the last, is hidden; the first and last
  always stay; a label that fits is never touched. The market mood strip's segment labels thin the same way, its
  colours keeping their legend. It runs under Reduce Motion and `?static=1`, and again whenever an axis changes
  width.

At the drawn sizes a member sees only fixes: the darker track and the range band plain at 25%, and the lighter dark
accent (the iOS kit's colour table shows its new value); the check-in answers on
two rows; the deposit's Matures date, cut at "Sat 10 Mar 202", wrapping in its cell; the Car loan axis's "2026" and
the prototype Projection's "2031", each drawn on its neighbour, thinned; and in Prototype v4 the highlighted next step
(step 9 at every door) and the iPhone door's SBI FD suggestion (step 3), which ran past their rows, wrapping. Every
other frame of every current board is unchanged at its drawn size; `review/MA-240/drawn-changes.json` names each of
these and the diff holds the rest.

## Gates

- `node scripts/board_fit.js` is the measurement above as a gate, in Chromium and WebKit at the screen's own pixel
  ratio, for any change under `docs/design/` (`.claude/jira-flow.json`; `npm ci --prefix scripts` installs its pinned
  playwright-core). Each frame is measured through its class's sizes and one pixel below and at every container
  query's threshold that styles it, and at each size whole: as set, at every step of each vertical scroller, and
  grown to its content's height where the frame clips it; a frame drawn under zoom or a scale is measured at the size
  it shows. Two lines touch only when they sit on the same surface, found by what paints behind them, so a wrapper
  raised over a sheet or a strip is on that glass. It fails closed: a board that does not render, a board with no
  frame but the pages its allowances name, a frame it cannot measure, a missing icon or text font, a template value
  that never resolved and a container query it cannot read are failures; since the boards fetch React and their fonts
  over the network, such a board is tried once more first, and a fault in it fails both times. An ellipsis on a flex
  or grid box draws nothing, so the text it cuts counts as clipped; a bar's track or a range band drawn in anything
  but its token is a fault; a label that `motion.js` has to thin at a frame's drawn size is a fault, since every drawn
  axis fits. Its allowances, each with its reason, its frames, sizes or elements, the widths below which it holds
  (`below`) and the issue that removes it where one does, are in `scripts/board_fit_allow.json`. `--selftest` makes
  each kind of fault in a copy of the mirror and expects the refusal, at the size it must show at where that matters:
  the page not a container, a scroll row that clips, the answers behind a fade, a board's own track, a band that is
  not the token, an overlap inside a sheet and between a sheet's siblings, a strip's figure on its label, a board that
  does not render, a crushed column and one below the fold, a chip cut with no ellipsis, the file viewer side by side
  at 600, the Stage Manager window's tabs at 600, iOS's alert past a zoomed screen, a figure cut by an ellipsis, a
  template value that never resolved and a page with no frame; the unchanged copy passes the same boards.
- `node scripts/board_fit.js --diff d6e243f --expect review/MA-240/drawn-changes.json` is the pixel diff as a command:
  every frame of every current board, and every step of Prototype v4, at its drawn size against `main` before this
  story, in Chromium and WebKit at the screen's own pixel ratio, as drawn, at every step of each vertical scroller and
  grown to its content's height. A frame that changed and is not named in the file fails, and so does a named change
  that no longer shows; the file's neutral CSS gives the track, the band and the accent one grey on both sides, so
  their new colours cannot hide a change in layout (the gate checks that every board's track and band take their
  tokens). Animations are finished before each picture. Both pictures are blurred over 3x3 pixels, each tile of 4 CSS
  pixels a side that differs is matched against the other picture moved up to one CSS pixel either way, in quarter
  pixels, and a picture has changed when more than 16 pixels still differ: so content that lands a fraction of a
  pixel apart is not a change, while one changed glyph (101 pixels and more at 3x), a 1 px rule taken away and a 2 px
  move are. Its selftest makes copies where a shared rule moves a drawn frame, takes a hairline away, changes one
  glyph and moves a box by 2 px, and expects each change, and compares an unchanged copy with itself and expects none.
- `scripts/contrast_check.py` measures the track on a card, the page, a fill, the add tint and the hero, the band on
  the hero and a card, the coral and the chart line on the band over the hero and over a card (a stacked ground,
  `band+hero`), and the accent on a raised fill and the add tint, in both themes; its selftest refuses the old track on
  the page and on the hero, the old band, a band that hides the line, a darker coral on a raised row and the old dark
  accent on the add tint.

## Review

Round 1 (27 Oct 2026, five lanes in parallel, blind to the making: the design system's CSS, the iOS boards, the web
boards and the prototype, the gates and the records, the icon options) found that several guards changed drawn
boards (a phone-door hero shrunk, a phone drawer narrowed, row chips cut, axis labels hidden by width alone, key-value
grids collapsed, the prototype's date card wrapped), that the gate could pass a board it never measured and missed
overlaps inside sheets and bars and the widths from 600 to 1023, and faults left at 320, 600 and 1024. Each is fixed
above; the fixed list is `review/MA-240/fixed.json`.

Round 2 (27 Oct 2026, six lanes on round 1's fixes and their joins: the shared CSS and motion, the iOS boards, the web
boards and the prototype, the gates, the records, the kind icons board) found 44 blocking findings: drawn regressions
(the iPad meter's frame given the track, iOS's alert off a zoomed screen in WebKit, a signed figure split in the iPad's
loan card, the band token reaching no board); blind spots in the gate (zoomed frames, content below the fold, widths
between its samples, the Stage Manager window, a diff at ratio 1 in Chromium alone whose neutral CSS hid the band and
the meter, wrappers raised over glass taken for surfaces); and records (MA-241's pick, MA-244's status, the
Inside MyPaisa page, an accent pair under 3:1 at 25% with no issue). The rebuilt gate then found the iPad from 900
to 1132 failing on every board; Arun chose the chat as a sheet there. Each is fixed above; the fixed list holds them
as r2-1 onwards.

## Left, on purpose or for later

- **Home's countries are a pager**: on the UK card the India card peeks past the edge on purpose. **The app
  switcher** in iPhone settings draws other apps past the edge, as iOS does. **The lock screen's clock** has a line box
  that reaches into the date above, as iOS draws it. Each is an allowance, with its reason.
- **The open foldable** draws the chat beside the screen at 880, where the plan's size classes put it in a sheet;
  under 744 its screen column is too narrow. Its redraw is listed undrawn on MA-70, MA-71, MA-78, MA-79 and MA-163, for
  MA-163's design-first round (MA-242, filed for it here, is its duplicate).
- **Wealth's sub-lines**: three end in a figure that their one-line ellipsis cuts; MA-243 puts the figure first.
- **The iPad from 900 to 1133 with the chat's sheet open**: the landscape boards show it closed there (the chat column
  put away); the sheet itself is drawn at 820 on iPad · Holding, portrait. The open sheet over a landscape screen is
  listed undrawn on MA-163 and MA-70, for MA-163's design-first round.
- **The web pages at a phone's width**: the desktop-only planned boards (Forecast, Admin center 2 and 3, Browser,
  Browser 2, Wealth) draw no page under 600, and their frames break there; they are allowed below 600, and the page
  at a phone's width is listed undrawn on each of their stories.
- **Colourful kind icons**: MA-241, option B picked; its open questions and the states still to draw are on its trace
  row; its build is its own branch.
