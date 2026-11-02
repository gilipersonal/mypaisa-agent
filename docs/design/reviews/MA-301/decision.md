# MA-301: the deep scan's redesign items, as an options round

Not picked yet. Every board here is an option until Arun picks; none is in `ios-v1/` or `app-v1/`.

## The request

Arun, 2 Nov 2026: "complete the tasks from antigravity for the UI WORK ... push them to claude artifact". The tasks
come from the impeccable deep scan (`docs/handoffs/2026-10-31-impeccable-deep-scan.md` and its report). The bug and
conformance fixes on picked boards are MA-300 (no options round). The items that change a design are this round:
P2-2, P2-3 (three items), P2-4, P2-5 and P1-7.

## Where it lives

- The host page: `docs/design/reviews/MA-301/options.html`, published as a private Claude Artifact with root
  `docs/design` (each iframe's `src` is the board's path under `docs/design`, with `?embed=<option>` to show one
  option). The Artifact's link: https://claude.ai/artifact/YCuDtgRHdMHtj6Xewte6g5 (published 2 Nov 2026).
- The boards, one canvas per item, in `docs/design/reviews/MA-301/`, written by `build_boards.py` (run it, or
  `--check` to fail when a written board differs). They load `../../ios-v1/support.js` and `../../ds-v1/tokens.css`,
  `ios.css`, `motion.css` and `motion.js`.
- `current/`: the boards as drawn today (the Plans tab header, statement review I2 at rest and at its Confirm, the
  web sign-in and invite at 390). The flatter-cards canvas draws today's nesting itself (section "Now").
- `tokens.css`: the snapshot of `ds-v1/tokens.css` this round was drawn on. No token was added.

## How it was drawn

- One figure set (lessons 10, 13, 19, 38): `household-v4.json` (Mon 26 Oct: £444,951, ▲ £4,993 since Thu 22 Oct;
  the statements of Sun 1 Nov: 22 lines, £2,246), `future-plans-v4.json` (Thu 5 Nov 21:05, run R4 of 20:59: £2,923,000
  in 2046, 8 in 10 between £2,188,000 and £4,058,000) and `talk-v5.json` (Arun's invite of Sat 5 Sep 18:00, used by
  Asha on Sun 6 Sep 10:12). `build_boards.py` asserts each claim over the figures: the sums, the category totals
  against `budget_oct`, the top three holdings by value, and every weekday.
- Tokens only: every colour on the boards is a `--mp-*` or `--lg-*` variable; no raw hex.
- The width rule as written: the chat beside every screen from about 1133 pt (px on the web), a sheet below.
- iPhone frames in the 1a Chat first shell; web frames with the sidebar, the page and the chat beside at 1440 (and
  1180, 1280, 1366 for item c), and the phone's browser at 390.

## The options (recommended first)

### a · Projection and Plans header (P2-3)

- **1a One picker, one lens (recommended).** One segmented picker (Net worth · Plans · Budget forecast) and one
  44 pt lens reading "20 yrs · £ GBP · Nominal" that opens one menu (Horizon, Currency, Money). Ten controls become
  four. Glass menu on iOS, a paper popover on the web. Trade-off: the horizon takes two taps.
- 1b The title is the picker; horizon chips under the fan; money as a corner button. Trade-off: a title menu is
  easy to miss.
- 1c One row of chips. Trade-off: scrolls and cuts on iPhone; views and settings look alike.
- Build would touch: iPhone v4 · Projection, iPhone v4 · Plans tab (and its 3a states), Web v4 · Projection,
  Web v4 · Plans tab; ARCHITECTURE §9.3 (the Projection's controls).

### b · The statement Confirm (P2-3; I2 on iPhone v4 · Budget)

- **1a Questions first, then a short Confirm (recommended).** One question card per uncertain merchant (AMZN Mktp
  £165, PAYPAL *EBAY £42), the guess as the first chip; then a compact Confirm card (total, two sources, By category
  and Not spending folded). Rule 4 kept: one Confirm writes all, the saved card has Undo, a saved line is corrected
  in place (Was Other → Shopping, Save). Trade-off: two more messages; §4.9's "one review card" wording changes.
- 1b One card, folded. Trade-off: Confirm sits under the questions; still taller than a screen.
- 1c A short card, the review on a sheet. Trade-off: a modal step outside the conversation.
- Build would touch: iPhone v4 · Budget (I2, I3), Web v4 · Budget (Browser · Statement review), ARCHITECTURE §4.9
  and the table row "Send a bank or card statement", the card JSON (MA-174) for the question card.

### c · Desktop 1133 to 1392 px (P2-3)

- **1a The page decides its columns; the chat folds (recommended).** One column until the page itself is 760 px
  (today 700); the chat stays beside from 1133 px with a fold button to a 64 px rail (⌘\), remembered per member.
  Page width: 576 px at 1180, 676 at 1280, 762 at 1366. Trade-off: one long column until 1364 px with the chat open.
- 1b The sidebar folds to a 76 px rail below 1393 px. Trade-off: icons without words; the web's navigation changes
  with the window.
- 1c The chat beside only from 1393 px, a drawer below. Trade-off: changes MA-240's width rule for the web; an
  owner decision across every record (lesson 30).
- Build would touch: `tokens.css` page-container thresholds (700 → 760) and the 1024 to 1359 chat width rule,
  Web v4 · Shell and chat, Web v4 · Dashboard, Prototype v5's desktop door; the MA-240 guards for 700 to 759 retire.

### d · Flatter cards and shorter overlines (P2-2)

- **1a Hairlines, sentence-case labels (recommended).** One surface per card; inside it rows and stats split by
  hairlines; the hero's own, owe and liquid in three hairline-ruled columns; the pulse on the hero itself;
  sentence-case labels ("Net worth · Mon 26 Oct", "Top holdings", "Coming up"). No new token.
- 1b Grouped inset lists with headers outside. Trade-off: reads as settings on the web.
- 1c Open sections, no cards below the hero. Trade-off: weaker at 25% brightness in dark; far from Warm ledger.
- Build would touch: `.hsplit3`, `.cstat`, `.kvg`, `.rrow`, `.f3c`, `.mp-over` use across the v4 boards; DESIGN.md
  (Cards, Elevation).

### e · A browser-only /join/<token> (P2-5)

- **1a One page, two live buttons (recommended).** Who invited you, the household, what a member can do; Continue
  with Apple and Continue with Google; how long the link lasts; "Already in the household? Sign in". No app copy, no
  dimmed button, no passkey before the member exists: the passkey is offered right after joining. States drawn: the
  invite (390 light and dark, 1440), after Apple (the passkey offer), the link already used.
- 1b Three short steps. Trade-off: one more tap; a Continue that only turns the page.
- 1c The invite as the chat's first message. Trade-off: a chat that cannot be typed into before sign-in.
- Build would touch: Web v4 · Login, invite and responsive; iPhone v4 · Sign-in and invite (its browser fallback);
  Prototype v5's team chapter join; ARCHITECTURE §4.5 Joining (the browser path, said plainly).

### f · Type and icon stack (P2-4)

- **1a Platform type, Lucide on the web (recommended).** SF Pro, SF Pro Rounded and SF Symbols in the app; on the
  web the system font, then self-hosted Inter variable WOFF2, a small self-hosted Nunito figures subset, and Lucide
  icons as inline SVG. No Google Fonts @import, no ligature icon font.
- 1b Inter everywhere (bundled in the app). Trade-off: the app stops looking native; square hero figures.
- 1c Today's look, self-hosted (Nunito and Material Symbols at both doors). Trade-off: ligature icons still show as
  words when the font fails; Material icons in the app.
- Build would touch: `tokens.css` line 9 and the font stacks, TECH_STACK (Look and components), DESIGN.md
  (Typography, icons), every board's `.ms` (redrawn per board as it is next touched).

### g · The Cmd+K palette (P1-7)

- **1a One palette: go, find, or ask (recommended).** Empty: pages (⌘1 to ⌘4), chat flows, two settings. Typed:
  "Ask MyPaisa: …" first (Return sends it to the chat), then records and flows. Nothing is created in it.
- 1b ⌘K is the chat (as on iPad today), with places suggested above the composer.
- 1c Search only; questions on ⌘J.
- Build would touch: Web v4 · Shell and chat; ARCHITECTURE §9.1 (⌘K on iPad) and §9.4.
- Open question for Arun if 1a is picked: does the iPad's ⌘K become the same palette (its first row the question),
  so the key means one thing at both doors?

## Glitches found and fixed (step 2)

Rendered every board in Chromium and WebKit with `?static=1`, light and dark, at its drawn sizes (iPhone 402 x 874;
browser 390, 1180, 1280, 1366, 1440), and read every frame; a script also measured text under 12 px, targets under
44 px, clipped text and text outside its frame.

- The statement chat drew its messages from the top, so Confirm sat under the composer: the chat is now anchored to
  the bottom, as a chat scrolls.
- A third composer chip ran off the iPhone's edge: two chips.
- The web chat column frame left its composer mid-height: the column fills its frame.
- The saved statement card ran four screens tall in the correction frame: it now shows three lines around the one
  being corrected, in date order (Sun 25 Oct, Tue 27 Oct, Tue 27 Oct).
- The Projection's web chat was dated Mon 26 Oct on a Thu 5 Nov page (lesson 19): a Thu 5 Nov exchange about run R4.
- A web card claimed what "moves" the Projection most, a statement the engine does not make (lesson 39): it now
  explains Nominal and today's money from the plan's inflation settings (UK 2.5%, India 5%).
- "Top holdings" listed NASDAQ (£512) third, while Infosys (£1,579) is larger; the counts "13 in all · 7 in India"
  were not in the figure set: the top three by value, "3 of 7", asserted in the builder.
- The width labels on item c's frames covered page text: moved into the browser bar.
- The scrolled iPhone frames put Privacy and Ask at the left: the nav keeps them right.
- The passkey step on the desktop sat left of an empty column: centred alone.
- The 1b title menu on the web was 41 px tall: 44.
- Budget and Assets shared the Lucide wallet icon: Budget is chart-pie.

## Gates

- `python3 docs/design/reviews/MA-301/build_boards.py --check`: clean.
- `python3 scripts/contrast_check.py`: 0 pairs below the limits or copies out of step (no token changed).
- `python3 scripts/plan_sync.py check`: 265 items, 45 notes, 5 drift, all Confluence pages and the stories database
  changed in the repo but not yet published (the lead publishes with `/plan-sync`); nothing from this round's boards,
  which sit outside the board folders the check reads.
- `node scripts/board_fit.js`: not run here (the lead runs it); these boards live outside the three board folders,
  so it needs them named, as MA-295's and MA-279's were not.

## Not verified

- Dynamic Type at AX5 and Privacy mode are not drawn in this round; the picked option gets them before the build.
- SF Symbols are named, not drawn (browsers cannot draw them); the iPhone frames use the boards' Material stand-ins.
- Chromium cannot draw `ui-rounded`, so its iPhone frames show Nunito where WebKit shows SF Pro Rounded.

## The pick

_Pending: one per item, recorded here with its date, then in `docs/trace.json` (MA-301 `design: picked`)._
