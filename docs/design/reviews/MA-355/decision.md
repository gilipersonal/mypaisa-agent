# MA-355: four changes Arun asked for while designing

An options round. Wed 25 Nov 2026.

## The request, in Arun's words

25 Nov 2026, with five reference pictures:

> Since we are desiging I want a few more changes
> 1. The web /pwa desktop version chat should look like [picture 1: the iPad board's chat as a sheet over the page]
> 2. The homepage should show show these [picture 2: Household | Me | Asha] as dropdowns. There should be light/dark
>    switch on top right corner, along with ability to switch currencies. See reference [picture 3: the pills "₹ INR",
>    "Light", "Hide amounts"]. The mobile and iOS, use your best judjement, show me 2-3 design as per rule.
> 3. On the home page, I need some more interactive charts like [pictures 4 and 5: Where it sits, What we owe,
>    Invested vs owed, Where growth comes from]. They should be interactive, think of best solutions
> 4. Make the logo animated on top left corner. It should be engaging. Use your best skills for designing to get this
>    things done.

## Where it lives

- The boards, one per item, each with options `1a`, `1b`, `1c` (`?embed=<id>` shows one):
  `a · Desktop chat sheet.dc.html`, `b · Home header controls.dc.html`, `c · Home charts.dc.html`,
  `d · Animated mark.dc.html`, in this folder.
- The round's page: `options.html`, published as a private Claude Artifact with root `docs/design`: 
  https://claude.ai/artifact/CLEEGezfb8aaiEBfeSKKJ6 (published 25 Nov 2026).
- `current/`: the web app's Home as built today (MA-208, on stubbed figures), at 1440 and 390, light and dark. The
  desktop chat today is the column beside the page; the mark today is still.
- `tokens.css` here is the snapshot of `docs/design/ds-v1/tokens.css` on the day; the round changes no token.
- Each board was drawn by its own lane, in parallel (Arun: "parallelize the work"), from a generator kept outside the
  repo; the boards are flat files and are the record.

## The options

Recommended first in each item.

### a · The desktop web chat, as a sheet

| | What it is | Trade-off |
| --- | --- | --- |
| **1a · The iPad's sheet, at every desktop width** | The picture as drawn: 600 px, centred, a grabber and "Chat", the page dimmed, the sidebar in view. From 1024 px the chat is always this sheet, never a column. | The page cannot be read or corrected while the chat is open. The rule "beside every screen from about 1393" would hold nowhere, so it changes in every record that states it. |
| 1b · A sheet at the side; the page stays live | The same sheet docked right, no dimming: beside the page from about 1393 px, over its right edge from 1024 to 1392 px. | The furthest from the picture; a plan card is about 300 px wide. The smallest build; no rule changes. |
| 1c · An ask bar on every page; the sheet rises from it | A composer at the foot of every page; typing raises a 720 px sheet over the page's column. | The bar covers the foot of every page; it is the ask bar passed over on MA-193. |

His to settle with the pick: whether the 1393 px rule goes on the web; whether a click on the dimmed page closes the
sheet; whether `⌘J` is wanted (it exists nowhere today).

### b · Home's header controls

| | What it is | Trade-off |
| --- | --- | --- |
| **1a · Four labelled pills, top right** | His reference in Warm ledger: Household ▾, £ GBP ▾, Light ▾, Hide amounts, at the top right of the head. Phone web: one row under the title, menus as bottom sheets. iPhone: the row under the large title, the eye in the bar. iPad: toolbar buttons. | The widest head, about 530 px (fits on one line at a 1393 px window). The currency switch leaves the hero. |
| 1b · The title is whose view; three small controls | The title becomes Household ▾; £ ▾, a sun and moon switch and the eye at the top right. | Icons say less than his labelled reference; the title no longer says Home; on phone web the light and dark switch moves to More. |
| 1c · One View lens, and the eye | One pill opens one panel with whose view, the currencies and the appearance; the eye stays outside. | Every change is two clicks; no light or dark switch in sight. |

His to settle: whether whose view is carried from page to page (drawn as yes); whether iOS gets an appearance
override at all (drawn in You, Appearance); dollars and euros are named in the menus but every frame stays in pounds,
because the figure set holds only £1 = ₹112.50.

### c · Interactive charts on Home

| | What it is | Trade-off |
| --- | --- | --- |
| **1a · Two cards that answer each other** | A double ring (what we own by kind outside, what we owe inside, on one scale) with its lists as legend and tap targets; and Invested against owed with one row of horizon chips for the crossing line and the growth split. | The double ring needs a one-line key; each card carries more than one idea. |
| 1b · Four cards, as in the pictures | His four cards one for one, in Warm ledger. | The ring of what we owe is one colour (the mortgage is 90.9%); the two time cards can disagree on horizon; four more cards on a phone. |
| 1c · Bars, no rings | Bars by kind and by loan on one scale; what we owe as a run-off line; the crossing and growth charts as in 1b. | Not the rings he asked for; Home looks much as it does now. |

**Figures not in the figure set.** `household-v4.json` gives what we own and owe by kind. The invested and owed lines
and the growth split are in neither set: `future-plans-v4.json` holds net worth per year and each year's cash. For
this board they were worked out by re-running the ledger's own rules month by month (the re-run matches the set's net
worth for every year to 2056, the 1 Nov run's closing cash, and the HDFC balance in Mar 2029) and are marked as
derived on the board. If 1a or 1b is picked, `make_future_plans.py` gains those series first and the picked board
cites the set, so no figure on a picked board is worked out outside it.

His to settle: what "invested" adds up (drawn as everything owned except property: £178,916 today against £246,743
owed, passing it in Jun 2028); whether "where growth comes from" looks forward by horizon, as in his picture, or back,
as the plan's Attribution view does (ARCHITECTURE §6.2, MA-315); chips of 5, 10, 20 and 30 years or his 5, 10, 15 and
20; three growth parts instead of his four.

### d · The mark, animated

| | What it is | Trade-off |
| --- | --- | --- |
| **1a · Watcher at work** | The arrival when the app opens (1,120 ms), then one lap of the dot when MyPaisa starts on a message and one swell with a coral ring when a change is saved. Still otherwise. | The lap happens top left while the eyes are in the chat; it needs wiring to the chat's events. |
| 1b · Arrives once | Only the arrival, once per load: MA-103's pick, built for the sidebar. | Engaging for about a second a visit. |
| 1c · Answers the pointer | The arrival, then one lap on hover or keyboard focus; the mark becomes a link to Home. | Most people never hover a logo; on touch it is 1b; the movement means nothing. |

All three add one easing to `motion.css` (the `.smooth` spring sampled, so the dot leaves from rest). Under Reduce
Motion nothing travels: a 150 ms fade in place. Nothing loops.

## Found along the way

- `docs/design/ds-v1/lucide.js` draws some icons wrongly on every board: a later sub-path that opens with a relative
  `m` starts from the wrong point (`trending-up`, `x`, `sun`, `clipboard-check` and others). Three lanes found it; the
  round's boards correct their own copies inline. Filed as MA-356.
- A static privacy mask made only of figure spaces is dropped by the canvas runtime; the round's boards add a word
  joiner inside each mask.

## Not checked

Motion at full frame rate (the screenshots are taken with motion off; the mark's board has Play again); contrast and
25% brightness (QA on the built code, MA-304); WebKit; iPad and foldable frames for the charts.

## The pick

Arun, Wed 25 Nov 2026, asked item by item on the round's page:

- **a · the desktop web chat:** 1a, the iPad's sheet at every desktop width.
- **b · Home's header controls:** 1a, four labelled pills at the top right.
- **c · interactive Home charts:** 1a, two cards that answer each other.
- **d · the mark:** 1a, watcher at work.

His answers the same day to what the boards left to him:

- **The chat sheet closes** on a click on the dimmed page, as on Esc, the close button and the grabber; **`⌘J`** opens
  and closes the chat on a Mac, with no shortcut on Windows (Ctrl+J is the browser's Downloads).
- **iOS appearance:** System, Light or Dark as a setting in You, Appearance, System by default; nothing added to the
  iPhone's bar.
- **"Invested"** is everything owned except property (cash, deposits, investments and pensions): £178,916 today,
  passing what is owed in Jun 2028.
- **The horizon chips** are the Projection's own: 5, 10, 20 and 30 years; the card opens at 5.

Two more answers the same day, to what the mark's boards raised (asked on the PR):

- **The dim.** The chat sheet dims the page, not the sidebar, so the mark's lap and ring are seen beside the open chat.
  The Chat sheet board and the mark's web frames draw the sidebar dimmed; they are redrawn before MA-357 and MA-360
  start, and both rows list it.
- **The iOS chat's mark.** The coin mark sits beside each of MyPaisa's messages on iPhone and iPad, in place of the
  ringed dot; the iOS kit and the chat boards are redrawn with it before MA-360 starts.

Carried as drawn, with no question put: the 1393 px rule goes on the web (it is what a 1a says); whose view and the
currency are carried from page to page; "where growth comes from" looks forward by horizon, as in his picture, in
three parts; one easing is added to `motion.css`; on the web only the sidebar's mark moves.

Nothing is built until the picked boards are carried into `app-v1/`, `ios-v1/` and `ds-v1/` with their remaining
states, and the records that state a changed rule are changed with them (rule 5 of `.claude/rules/plan-sync.md`).
