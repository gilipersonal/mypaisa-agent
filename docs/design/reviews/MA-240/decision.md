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

## What changed

All in the design system, copied to the iOS and app projects, so both doors inherit it:

- **`tokens.css`: the page is a size container of its own** (`.mp-shell-main`, `page`): a page under 700 keeps one
  column and stacks its own two-up parts and its head; under 720 the four filters take two columns; under 900 a detail
  card's label goes over its value, the Admin center's section bar scrolls and the Forecaster's four figures go two by
  two. Only with the sidebar and the chat both beside a page under 700 (a laptop from 1024) does its hero figure step
  down to 36. The chat beside the page narrows first on a laptop between 1024 and 1360, to 28% of the window and never
  under 340; a drawer and a phone's chat keep their drawn width.
- **`tokens.css`: fit guards** for the parts drawn on many boards, each acting only where the drawn screen would break:
  rows that scroll really scroll, under their own drawn fade, as iOS's do; the suggested next step wraps when it is
  wider than its row; a card's answers wrap and fill the rows; filter and choice chips wrap; a row's chip keeps its one
  line and never shrinks; an overline and a key-value figure wrap inside their cell; a table's first column keeps
  96 px, a matrix's 140 and the Forecaster's event table its readable columns, and each scrolls inside its card; a
  dialog's fixed matrix scrolls inside the dialog; a file viewer too narrow for its preview and its details side by
  side (under 720) puts the details under the preview and scrolls; a list row's figure goes under its name, at the
  right, when the two no longer fit side by side (on an iPad window narrower than the 11-inch in landscape, before the
  name falls under 7em); a chart's "not run yet" note keeps clear of its axis labels; a schedule's cut name shows its
  ellipsis; iOS's alert keeps inside a narrow screen. On a screen under 360 the hero figure steps down to 36 and its
  strip of three takes two columns, a row's chip line and a card row's answers go under the words, the chat's strip
  puts its change under the figure, a toast wraps inside the margins, a table's headers wrap and the inline title
  keeps clear of the bar's buttons; under 380 the prototype chart's call-out waits for a tap.
- **`tokens.css`: two colour tokens**: `--mp-track` is `#BEC1C8` in light (1.64:1 on the page, 1.54:1 on a fill,
  1.80:1 on a card, and 1.43:1 or more at 25%) and `#485160` in dark (1.81:1 and 1.26:1 dimmed on the hero, every mark
  on it still 3:1); every board's track takes it, edge line included. `--mp-band` is the range band, coral at 40%
  (1.91:1 and 1.27:1 dimmed on the light hero, 1.52:1 on a card).
- **`motion.js`: axis labels thin themselves where they would touch**, as Swift Charts and LayerChart do: on a chart
  narrower than drawn a label within 2 px of the one kept before it, or of the last, is hidden; the first and last
  always stay; a label that fits is never touched. The market mood strip's segment labels thin the same way, its
  colours keeping their legend. It runs under Reduce Motion and `?static=1`, and again whenever an axis changes
  width.

At the drawn sizes a member sees only fixes: the darker track and the range band plain at 25%; the check-in answers on
two rows; the deposit's Matures date, cut at "Sat 10 Mar 202", wrapping in its cell; the Car loan axis's "2026" and
the prototype Projection's "2031", each drawn on its neighbour, thinned; and in Prototype v4 the highlighted next step
(step 9 at every door) and the iPhone door's SBI FD suggestion (step 3), which ran past their rows, wrapping. Every
other frame of every current board is unchanged at its drawn size; `review/MA-240/drawn-changes.json` names each of
these and the diff holds the rest.

## Gates

- `node scripts/board_fit.js` is the measurement above as a gate, in Chromium and WebKit, for any change under
  `docs/design/` (`.claude/jira-flow.json`; `npm ci --prefix scripts` installs its pinned playwright-core). It fails
  closed: a board that does not render, a board with no frame but the pages its allowances name, a frame it cannot
  measure, a missing icon or text font and a template value that never resolved are failures. An ellipsis on a flex
  or grid box draws nothing, so the text it cuts counts as clipped; a label that `motion.js` has to thin at a frame's
  drawn size is a fault, since every drawn axis fits. Its allowances, each with its reason, its frames or elements,
  and the issue that removes it where one does, are in `scripts/board_fit_allow.json`. `--selftest` makes each kind of
  fault in a copy of the mirror (the page not a container, a scroll row that clips, the answers behind a fade, a
  board's own track, an overlap inside a sheet, a board that does not render, a crushed column, a chip cut with no
  ellipsis, the file viewer side by side at 600, a figure cut by an ellipsis, a template value that never resolved)
  and expects the refusal, at the size it must show at where that matters; the unchanged copy passes the same boards.
- `node scripts/board_fit.js --diff d6e243f --expect review/MA-240/drawn-changes.json` is the pixel diff as a command:
  every frame of every current board, and every step of Prototype v4, at its drawn size against `main` before this
  story. A frame that changed and is not named in the file fails, and so does a named change that no longer shows; the
  file's neutral CSS gives the track and the band one grey on both sides, so their new colours cannot hide a change
  in layout. Animations are finished before each picture. What counts as a change is text or a mark that moved,
  appeared or went: both pictures are blurred over 3x3 pixels, a pixel differs only when nothing within one pixel of
  it in the other picture is close, and only whole 3x3 blocks of such pixels count. So the anti-aliasing that moves
  when a box becomes a size container, and a scrolling row landing on whole pixels, are not changes, while a hidden
  label (over 100 such pixels) is. Its selftest makes a copy where a shared rule moves a drawn hero and expects the
  change, and compares an unchanged copy with itself and expects none.
- `scripts/contrast_check.py` measures the track on a card, the page, a fill and the hero, the band on the hero and a
  card, and the accent on a raised fill, in both themes; its selftest refuses the old track on the page and on the
  hero, the old band, and a darker coral on a raised row.

## Review

Round 1 (27 Oct 2026, five lanes in parallel, blind to the making: the design system's CSS, the iOS boards, the web
boards and the prototype, the gates and the records, the icon options) found that several guards changed drawn
boards (a phone-door hero shrunk, a phone drawer narrowed, row chips cut, axis labels hidden by width alone, key-value
grids collapsed, the prototype's date card wrapped), that the gate could pass a board it never measured and missed
overlaps inside sheets and bars and the widths from 600 to 1023, and faults left at 320, 600 and 1024. Each is fixed
above; the fixed list is `review/MA-240/fixed.json`.

## Left, on purpose or for later

- **Home's countries are a pager**: on the UK card the India card peeks past the edge on purpose. **The app
  switcher** in iPhone settings draws other apps past the edge, as iOS does. **The lock screen's clock** has a line box
  that reaches into the date above, as iOS draws it. Each is an allowance, with its reason.
- **The open foldable** draws the chat beside the screen at 880, where the plan's size classes put it in a sheet;
  under 744 its screen column is too narrow. Its redraw is listed undrawn on MA-70, MA-71, MA-78, MA-79 and MA-163, for
  MA-163's design-first round (MA-242, filed for it here, is its duplicate).
- **Wealth's sub-lines**: three end in a figure that their one-line ellipsis cuts; MA-243 puts the figure first.
- **Raised and tinted rows in dark**: the coral accent is 2.8:1 to 2.95:1 dimmed on a few board-specific tints (the
  selected sidebar row, a success or alert tint), against 3:1; on the system's raised fill it passes (3.01:1).
- **Colourful kind icons**: MA-241, option B picked; its build is its own branch.
