# MA-240: every board whole at every size, legible at 25%

## The request

Arun, 27 Oct 2026, asking for an independent UX review of every prototype and design:

> 1. The UI to glitch free, no overflowing or overalapping on different screen sizes.
> 2. Colour tones such that they dont cause issues even during low mobile brightness of 25%,
> 3. The text and overflows should be taken care of, when resizing nothing should break or over flow.

Then: "fix all these glitches across the UX design", and "I want precise measurement and accurate pixel render,
used the best approach to fix all the glitches and review properly". His fourth point, colourful icons for each kind
of holding, asset and debt, is new work: MA-241.

## How it was measured

- **Every current board**: MyPaisa iOS v1, the browser boards and Prototype v4 in MyPaisa app v1, and MyPaisa DS v1.
  The superseded record (the Telegram and Mini App boards, the first Prototype) is left out; nothing is built from it.
- **Rendered as Claude Design renders it**: the mirrored files with their own `support.js`, `?static=1` so motion
  lands at once, waiting until no template hole shows; at the screen's own pixel ratio (3 for the iOS boards, 2 for
  the rest), in Chromium and in WebKit (Safari's engine, whose system font sets wider).
- **Every size a member can have**: each device and browser frame resized through its class: an iPhone at 320
  (Display Zoom on an SE), 375 by 667 and 812, 390, 402 and 440, and in landscape; iPad mini, Air and Pro 13 in
  both orientations and the regular, narrow range from 700 to 900; the web at 1024, 1280, 1440 and 1920 and its
  phone door from 320 to 430. Prototype v4 was walked at every door, theme and step.
- **What counts as a fault**, measured on the layout engine's own boxes: text clipped mid-word by a box that does
  not scroll, text past its box, text on text, a box cut at the screen's edge outside a row that scrolls, an icon
  shown as its name, a figure cut by an ellipsis. Text scrolled or paged out of view, and text under a glass bar,
  a sheet or the system's lock screen, is the scroll edge, not a fault.
- **Colour at 25%**: every text, icon, chart line, bar and track measured against the pixels behind it in the
  render (text hidden, the background read under each glyph; anything under a sheet or a scrim found by hit-testing
  and set aside), in the model of `scripts/contrast_check.py`: full brightness, and each luminance at a quarter with
  the room's 0.05 kept.
- **Nothing drawn moves by accident**: every frame of every board pixel-diffed against `main` at its drawn size,
  and every frame that changed looked at.

## What was wrong

| Where | At | What |
| --- | --- | --- |
| The web pages with the chat beside them (Web v4 · Dashboard, Assets and debts, Check-ins, Shell and chat, Projection, Budget) | 1024 and 1280 | The page's two columns followed the window, not the page: at 1024 the page column fell to a word per line and the hero ran under the list; at 1280 the hero's figures collided |
| The check-in card (iPhone v4 · Check-ins) | 402 and under | Four answers in one row behind a fade: "Paid off in full", one of the card's four answers, was cut off |
| Rows that scroll sideways: the composer's shortcuts, the suggestions, the summary pins | every iPhone; the iPad's chat column | Drawn as boxes that clip, so a chip was cut with nothing to scroll; the prototype's highlighted next step was cut mid-sentence at 320 and at 1024 |
| Chart axes (Forecast's folds, Projection, Assets and debts) | narrower than drawn | Year labels on each other |
| Filters, a table's first column, the alert matrix, a key-value cell | 1024, 1280, 320 | Four filters crushed to a letter per line; "Balanced" broken mid-word; matrix headers on each other; a date cut by 6 px at the drawn 1440 |
| The rupee hero | 320, WebKit | ₹5,00,56,988 cut by the card |
| The Saved toast, the day-change card, a Quick Look page, the kit's composer | 320 | Ran off the screen |
| A bar's empty track | 25% brightness | `#CDCFD4` passed on a card but faded on the page (1.42:1) and on a fill (1.33:1); the dark track was 1.24:1 dimmed on the navy hero; two boards mixed their own paler track (1.42:1) |

## What changed, all in `tokens.css` (DS v1, copied to the iOS and app projects)

- **The page is a size container of its own** (`.mp-shell-main`, `page`): with the chat beside it, a page under 700
  keeps one column, a page under 600 stacks its head, and four filters need 720; the chat column gives way first,
  380 down to 300.
- **Fit guards** for the parts drawn on many boards: rows that scroll really scroll, under their own drawn fade, as
  iOS's do; the suggested next step wraps and is read whole; a card's answers wrap and fill the rows; filter and
  choice chips wrap; a row's chip line wraps before the chip runs under the figure; an overline and a key-value
  figure wrap before they are cut; a table's first column keeps 96 px and the matrix's 140, scrolling inside the
  card; a link under a row's title breaks inside the row; toasts, the day-change card, a Quick Look page and the
  kit's composer stay inside the screen; a narrow axis keeps its ends and every other label.
- **On a screen under 360** (the iPhone's frame and the web app's root are named containers) the hero's figure steps
  down from 44 to 36, as SwiftUI's `minimumScaleFactor` would, and a hero's strip of three takes two columns. Every
  drawn screen is wider, so every drawn hero is unchanged.
- **The track**: `--mp-track` is `#BEC1C8` in light (1.64:1 on the page, 1.54:1 on a fill, 1.80:1 on a card, and
  1.43:1 or more at 25%) and `#485160` in dark (1.81:1 and 1.26:1 dimmed on the hero, every mark on it still 3:1);
  the boards' own paler mixes now take the token, edge line included.

What a member sees on the drawn boards changes only where it was wrong: the check-in card's answers sit on two rows,
tracks are plainly there, the chips' rows scroll. Every other drawn frame is unchanged at its drawn size.

## Gates added

- `scripts/contrast_check.py` measures the track on the page, on a fill and on the hero, both themes, and its
  selftest refuses the old light track on the page and the old dark track on the hero.
- `node scripts/board_fit.js` is the measurement above as a gate, in Chromium and WebKit, for any change under
  `docs/design/` (`.claude/jira-flow.json`). Its allowances, each with its reason, are in
  `scripts/board_fit_allow.json`; `--selftest` makes each fault this review found in a copy of the mirror (the
  page not a container, a scroll row that clips, the answers behind a fade, a board's own track) and expects the
  refusal.

## Left, on purpose or for later

- **Home's countries are a pager**: the India card peeks past the edge on purpose. **The app switcher** in iPhone
  settings draws other apps past the edge, as iOS does. Both are allowances, with their reasons.
- **The open foldable** draws the chat beside the screen at 880, where the plan's size classes put it in a sheet;
  at 700 its screen column clips. MA-242 redraws Foldable · Open and Foldable · Open, Audit to the plan.
- **Colourful kind icons**: MA-241, options for Arun's pick.
