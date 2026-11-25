---
name: design-first
description: Design before code for any MyPaisa UI or UX change. Use whenever Arun asks to change how MyPaisa looks or flows: the iOS app (ios/, a React Native shell whose every visible piece is SwiftUI, one spec in the MyPaisa iOS v1 boards in docs/design/ios-v1/, for iPhone, iPad and the foldable), the web app (web/, a SvelteKit 3 PWA with the chat, the dashboard and the Admin center, at desktop and phone width (390), from the browser boards in MyPaisa app v1, docs/design/app-v1/), the chat's cards, buttons, guided flows and in-place corrections, the charts (Swift Charts and the web's LayerChart in one house style), the motion, the design pages (the agent journey) or the mark and the app icon; a new screen, page or card, a redesign, or a change to layout, flow, visuals, copy, charts or motion. Design 2 or 3 options with impeccable, ui-ux-pro-max and dataviz (Qwen-Image for comps), drawn in the repo as .dc.html boards on MyPaisa DS v1 (docs/design/), keeping the record in docs/design/reviews/MA-<n>/; publish the round as a private Claude Artifact, give Arun its link and let him judge it by eye (no gate measures the boards: plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303)); and build only the option Arun picks.
---

# Design first

Every new UI or UX change to MyPaisa is designed before it is built, in four steps. No code under `ios/`, `web/` or
`backend/src/mypaisa_agent/` that changes what a member sees is written until step 4.

1. **Design 2 or 3 options** with the design tools, **in the repo** (Arun, 30 Oct 2026, MA-260: "for all future
   design use Local folder and then Claude Artifact. Claude Design is going away, so no need to push to claude
   design"; until then the boards were drawn in Claude Design). The design system lives in `docs/design/ds-v1/`
   (MyPaisa DS v1), the screens in `docs/design/ios-v1/` (MyPaisa iOS v1, the app) and `docs/design/app-v1/` (MyPaisa
   app v1, the web app's browser boards); the record stays in `docs/design/reviews/MA-<n>/`.
2. **No gates on the boards** (Arun, 2 Nov 2026, MA-303: "All the 6 checks currently run on docs/design. Lets stop
   that."). Open each board once to see that it loads, in light and dark, then go on; Arun judges the round by eye.
   plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). The glitch review at every size class (MA-101) and the board gates are retired; the same checks come
   back as QA on the built code when Arun asks: MA-304 for the web app (Playwright, axe and Argos, with the 25%
   contrast floors and the 320 to 1920 width sweep; it depends on MA-194), and the iOS app's after MA-165, with no
   story yet.
3. **Publish the round as a private Claude Artifact**, give Arun its link and ask for the pick. A round run in
   Google Antigravity, which cannot publish a Claude Artifact, shows its options as a local page instead (MA-297).
4. **Arun picks one option.** Build only that option, and only after the pick, made in the current request.

Changes that touch no design skip this: a typo, a broken link, data, a backend change a member never sees, or a bug
with one obvious fix. When unsure whether something is a design change, treat it as one.

## 0. Ticket, branch and context

- Find or create the MA issue for the request and move it to In Progress (21). Creating, commenting on and moving
  issues need no asking (`.claude/rules/jira-flow.md`, `.claude/rules/ship-autopilot.md`).
- Create the branch `MA-<n>-<slug>` from `main` now, so the designs can be committed. The build continues on the same
  branch after the pick.
- Run `python3 scripts/plan_sync.py start MA-<n>`: it names the story's ARCHITECTURE sections and its boards. It refuses a story with no board (`todo`) or with screens still `undrawn`; inside design-first that refusal is expected, because drawing them is this round's work. Its other refusals (a missing section, a board file, an open question) are not, and stop the round. Boards
  drawn ahead of the story (`design: "planned"`) are the starting point for the options, not a pick
  (`.claude/rules/plan-sync.md`).
- Read the context:
  - `ARCHITECTURE.md`: the four rules (§1), the iOS app (§8: the shell, the size classes and the motion in §8.1, the
    chat's cards and guided flows, the dashboard screens and the Admin center), the web app (§8.4), identity and the
    second check (§4.5) and push (§10);
  - `PLAN.md`, the phase the surface belongs to (phase 1 for sign-in, the chat at both doors, Activity, the motion and
    legibility; the wealth phases 2 to 9 for the dashboard screens, each in the phase of the record it shows; phase 8
    for Audit, Search and the Admin center; phase 15 for widgets, Siri and the share sheet);
  - `docs/design/README.md` and the surface's existing design: for the app, the one spec in MyPaisa iOS v1
    (`docs/design/ios-v1/`: `Shell options`, the `iPhone` files, `iPad and foldable`) and the iOS kit in MyPaisa DS v1
    (`docs/design/ds-v1/`); for the web app, the browser boards in MyPaisa app v1 (`docs/design/app-v1/`:
    `Browser · ...`, at desktop and at 390; the whole-wealth boards and the clickable prototype are drawn on MA-193);
    the Mini App and Telegram boards in `app-v1/` and the Nocturne artboards in `docs/design/dashboard/` are the
    superseded record, read only for a flow Arun already picked; `agent-journey.html`
    for the explainers;
  - earlier reviews for the same surface in `docs/design/reviews/` (`MA-161/decision.md` for the shell, the size
    classes and Liquid Glass).
- Capture how the screens involved look now into `docs/design/reviews/MA-<n>/current/`:
  - until `ios/` and `web/` exist, the boards are the current screens: screenshot them from the repo, served on
    localhost (a board loads `support.js` and its shared files by relative path, so it needs a server, not
    `file://`), with Playwright or `node .claude/skills/plan-sync/scripts/capture_boards.js <repo> <want.json> <out>`;
    a screen with no board yet has no current look, so say so on the board;
  - once `ios/` exists, run the app on the simulator and screenshot it with
    `xcrun simctl io booted screenshot <file>.png`: iPhone 17 Pro and iPad Air 11", in light and dark
    (`xcrun simctl ui booted appearance light`, then `dark`), at the Large text size and at AX5
    (`xcrun simctl ui booted content_size large`, then `accessibility-extra-extra-extra-large`);
  - once `web/` exists, serve it with the SvelteKit dev server (`corepack pnpm@12.16.1 --dir web dev`, on `localhost:5173`, the origin
    dev's api and Google web client allow) or `vite preview` for the built app, and screenshot it with Playwright at
    390 and 1440 wide, in dark and light;
  - for a card, the same: its board, or the card as the app draws it.

## 1. Design 2 or 3 options

### Tools by surface

| Surface | Lead | Also |
| --- | --- | --- |
| The iOS app, `ios/`: one app, one spec in MyPaisa iOS v1 (`docs/design/ios-v1/`), every size class; a React Native shell whose every visible piece is SwiftUI, hosted through Fabric and fed one JSON model. Boards for **iPhone** (compact) and for **iPad and the foldable** (regular, narrow and wide), each in light and dark, with Dynamic Type up to AX5 and privacy mode wherever they change a screen: the shell, sign-in, the chat, Home and the dashboard's screens (net worth, assets and one asset, debts and one loan, Budget, Projection), a holding, Audit and Files, Activity, Search, the Admin center and You | `impeccable`, Operate mode (`shape`, `layout`, `critique`) | `ui-ux-pro-max` for UX rules (`python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<outcome>" --domain ux`, and `--stack swiftui` for SwiftUI patterns); Apple's Human Interface Guidelines for every control; `redesign-existing-projects` to audit a screen that exists; `qwengen-bf16` for a comp from a screenshot of the current screen |
| The web app, `web/`: a SvelteKit 3 PWA with the chat, the dashboard and the Admin center in a browser. **Browser** boards in MyPaisa app v1 (`docs/design/app-v1/`) at desktop (laptop, two columns) and at phone width (390, the adaptive shell), and the sign-in page, for the chat, Home and the dashboard's screens, a holding, Audit and Files, Activity, Search and the Admin center | `impeccable`, Operate mode (`shape`, `layout`, `critique`) | `ui-ux-pro-max --domain ux`, and `--stack svelte` for Svelte patterns; `redesign-existing-projects` to audit a page that exists; `qwengen-bf16` for a comp from a screenshot of the current page |
| The chat's cards, buttons and guided flows: SwiftUI views in the app and Svelte components in the web app, both drawn from the card JSON of MA-174 (`backend/src/mypaisa_agent/cards/`, the card types in `web/src/lib/`, the card pieces in `ios/` and `web/`), in `simple` and `technical` | `impeccable` (`clarify`, `distill`) on the card's text and hierarchy | `ui-ux-pro-max --domain ux` for the flow; `design-skills:ux-writing` for button labels and one-line copy |
| Charts: Swift Charts in the app and shadcn-svelte's charts on LayerChart in the web app, one house style (MA-56), in the chat's cards and on the dashboard | `dataviz` | Validate palettes with its script; one palette at both doors, so a holding looks the same everywhere |
| Design pages (`docs/design/agent-journey.html`; the earlier `architecture.html` and `journeys.html`) | `impeccable` | `high-end-visual-design` and `design-taste-frontend` are allowed here, and only here |
| The mark (`docs/mark.svg` and its PNGs) and the app icon | `impeccable` | `qwengen-bf16` for drafts; the shipped mark stays SVG; the app icon is made from it in Icon Composer (default, dark, clear and tinted; the DEV band on MyPaisa Dev) |

The taste skills are for landing pages and showcases, not dashboards or multi-step product UI. Keep them off the app,
the web app and the chat. `ltx-clip` makes video assets only, never interface motion.

### Rules

- **Precedence.**
  1. Arun's words.
  2. `ARCHITECTURE.md` and `PLAN.md`, then the boards: MyPaisa iOS v1 for the app, and the browser boards in MyPaisa
     app v1 for the web app; each door's one spec.
  3. The design system in force: **MyPaisa DS v1** ("Warm ledger", picked by Arun on 24 Oct 2026, MA-101): `tokens.css`,
     the shared motion (`motion.css`, `motion.js`) and the iOS kit (`iOS kit.dc.html`, `ios.css`), drawn in Claude
     Design until 30 Oct 2026 and copied into `docs/design/ds-v1/` (the only source; drawn there and nowhere else since
     MA-260; `docs/design/reviews/MA-101/tokens.css` is the record of the first pick, before MA-181 tuned both themes for 25% brightness, and a `tokens.css` in any other `reviews/` folder is a snapshot of its round, never a source);
     then Apple's Human Interface Guidelines, which the kit follows. The Mini App and Telegram boards in MyPaisa app
     v1, the Telegram kit and the Nocturne artboards in `docs/design/dashboard/` are superseded (MA-161).
  4. impeccable.
  5. The other skills.

  A skill's defaults (its fonts, palettes, card styles) never override the artboards or the design system.
- **The product's rules hold in every design** (`ARCHITECTURE.md`):
  - **create in the chat, correct in place** (rule 4, rewritten on 26 Oct 2026, MA-186; Arun: "The UI should only
    allow editing existing figures by hand, no creation"): anything new (a record, an event, a kind, a plan item) is
    created only in the chat, at either door, as a card, a Confirm tap and its audit row; a screen's Update or Ask
    opens the chat with the right guided flow. An existing figure the kind marks editable (a value, a rate, a date,
    an amount or an assumption) can be corrected in place on any screen: tap it, type the new value, a before → after
    line appears with Save, and Save writes a `correction` event with its audit row (`via: inline_edit`). Both paths
    run through one write service, checked against the kind spec and audited. Nothing is created in place: no Add
    button, form or empty row on a dashboard screen, and no delete on any screen: deleting happens only in the chat
    (MA-309). Only admins write (MA-307, MA-308, Arun, 2 Nov 2026: "Only admins can do all these. Others users can
    view only."): an admin adds, corrects and deletes; every other member sees no Save, no Update and no check-in
    buttons, and the chat refuses their writes politely. Plan items and saved projection assumptions are admins' too. Show the correction's states (the
    tap, the before → after line with Save, the saved figure) wherever a design puts an editable figure. The Admin
    center stays the exception: admin settings and operations, in the app and the web app, each sit
    behind the second check (in the app a fresh Sign in with Apple or passkey under Face ID, or Google again for a
    member who signs in only with Google; in a browser a passkey or a fresh sign-in; bound to the action and verified
    by the server, MA-76) and an audit row (`ARCHITECTURE.md` §8.3, §8.4). Arun's "read only (except for admin)" of
    24 Oct 2026 is superseded by the in-place correction; its admin exception stands;
  - **the summary first:** the layman sees the summary, the detail is one tap away (the `Technical` section, `Why?`);
    show both `simple` and `technical` modes where a card has them;
  - **Claude never produces a number:** every figure on a design is the engine's or the registry's, and the copy never
    implies the model worked it out;
  - **the app cannot trade:** no design offers to buy or sell;
  - **privacy mode** hides pounds in every card, screen, page, chart axis and notification, and the app switcher shows
    only the mark; show that state for any screen with money on it.
- **Liquid Glass, the way the HIG says** (MA-161, `docs/design/reviews/MA-161/decision.md`):
  - content (the navy hero card, the warm cards, the lists, the charts, the chat's messages) stays solid Warm ledger;
    glass is only the layer of controls that floats above it: the tab bar, the sidebar, toolbars and their buttons,
    the composer, the shortcut chips, menus, partial-height sheets and the search field;
  - glass never sits on glass, and content is never glass;
  - glass is clear by default; only the primary action of a control group is tinted, in coral (Send, the composer's
    primary chip); Confirm on a card is a filled content button, not glass; red stays for alerts that ask for action
    and for destructive actions;
  - content scrolls under the glass bars with the system's scroll-edge effect; corners are concentric with the device
    and the sheet (cards 20 pt, the hero 24 pt, rows 14 pt, as the tokens say);
  - SF Pro through Dynamic Type text styles, SF Pro Rounded heavy for the hero figures, tabular numerals for every
    figure, SF Symbols for icons.
- **Legible at 25% brightness** (MA-181; Arun, 25 Oct 2026: "the text and component should be clearly visible even in
  25% mobile brightness"), in light and in dark, in the app and the web app:
  - every colour pair meets these, at full brightness and with the screen dimmed to 25% (primary text and figures
    7:1, and 4.5:1 dimmed; secondary and coloured text 4.5:1, and 3:1 dimmed; a chart line, a meter, a switch's ring
    or focus 3:1, and 1.8:1 dimmed); they are targets for the design and are measured on the built code when Arun
    asks for QA (MA-304 for the web app; the iOS app's after MA-165, with no story yet), not by a gate on the boards
    (MA-303);
  - no tertiary grey (`--mp-ink-3`) for anything a member must read: a figure, a label, a caption that carries
    meaning; it is for decoration and dividers only;
  - glass carries labels only, never body copy, and is measured over its worst backdrop.
- **2 or 3 options, every time.**
  - Each option is a complete answer to the request, different in a way that matters: structure, flow, emphasis or
    treatment. Never the same idea in two colours.
  - Mark one as recommended, and say why.
  - App options show the main screen on iPhone (compact) and on iPad (regular, wide), in dark and light, in the shell
    Arun picked, 1a Chat first (26 Oct 2026, MA-163): the iPhone board in the Liquid Glass tab bar with the safe areas, the
    iPad board with the sidebar and the chat beside the screen. A screen changed at one size class is changed at the
    others in the same round, so they never drift; a change that only fits one says why on the board. One spec, never
    a design doc per device (`docs/design/README.md`, MA-161).
  - Every screen is at both doors: its options show the browser boards too, at desktop (laptop, two columns, the web
    app's own navigation) and at phone width (390), changed in the same round, so the two doors never drift; a change
    that only fits one door says why on the board.
  - Chat options show the card in the chat at both doors (the app's SwiftUI and the web app's Svelte) in dark and
    light, in `simple` and `technical` mode, and its `plain` line (what push and VoiceOver read, MA-174) when the change
    touches the card's content.
  - The picked option gets its remaining states (empty, loading, stale prices, error, a long holding name, many
    holdings with "More") before the build starts.
- **Visible.** Every option is something Arun can look at:
  - **a comp:** a Qwen-Image render, from a screenshot of the current screen as reference or from scratch, with its
    prompt sidecar;
  - **a mockup in the repo:** a `.dc.html` board that links the design system's `tokens.css` and the shared
    `motion.css` and `motion.js`: for the app, with `ios.css` and the iOS kit's classes in an iPhone or iPad frame with
    the system's bars, so each part maps onto a SwiftUI view; for the web app, with the design system's classes in a
    browser frame at desktop and at 390, so each part maps onto a Svelte component over the same tokens; clickable
    where the flow is the point;
  - **a chart:** the real thing, not a drawing of one: Swift Charts on the simulator once `ios/` exists, the
    LayerChart chart in the web app; until then, a board drawn with the kit's chart classes from the shape of
    the engine's series.
- **Motion** (MA-182; `ARCHITECTURE.md` §8.1): one motion system for every component and chart, at both doors, drawn
  on the iOS kit's `12 · Motion` board. Every board loads `motion.css` and `motion.js` and uses their classes, so it
  moves the way the build will.
  - Content moves, the glass bars stay put. Cards and rows arrive with a soft spring and a 45 ms stagger (at most
    eight); a control answers a touch with a snappy spring; only a success (Saved, Face ID passed) bounces.
  - Figures count up once when they first appear, then roll only their changed digits; charts draw in under a mask,
    their dots and labels landing after; a holding row zooms into its screen; a red alert's mark pulses once.
  - In SwiftUI: `.smooth`, `.snappy` and `.bouncy`, a `GlassEffectContainer` for the glass morphs, `numericText`
    content transitions, `navigationTransition(.zoom)`, and haptics (success, warning, selection, a light impact on
    Send). In the web app: CSS transitions, the Web Animations API and View Transitions, with the same timings.
  - Animate transform and opacity first.
  - Nothing loops forever.
  - Under Reduce Motion (`prefers-reduced-motion` on a board and in the web app) every movement becomes a short
    cross-fade or lands in its final state at once.
  - Light and dark follow the system's appearance (`prefers-color-scheme` in the web app and on a board frame that names no theme; a frame with
    `t-light` or `t-dark` keeps it, MA-329); glass turns
    opaque under Reduce Transparency, and Increase Contrast uses the high-contrast colour assets.
- **Accessibility.** WCAG 2.2 AA and the HIG: contrast measured on the real background, glass included, and at 25%
  brightness (above); 44 pt targets in the app and 44 px in the web app; a spoken label for every figure and an audio
  graph for every chart; a visible focus ring with a hardware keyboard on iPad and in the browser; and colour never the
  only signal (keep the ▲ ▼ beside the green and red) (MA-181).
- **Illustrative data.** Every figure, member and holding on a design is illustrative and labelled so. Never the
  household's real balances, names or accounts.
- **Adaptive.**
  - In the app, every screen lays itself out by size class and window width, never by device, except that an iPhone
    is always compact: compact under about 600 pt and on every iPhone (the tab bar, one column, sheets for detail, the chat a tab), regular narrow about 600 to 900 pt (a sidebar
    that collapses to a tab bar at the top; the chat as a sheet, beside the screen only from about 1393 pt), regular wide about 900 to 1393 pt (the sidebar and the screen; the chat as a sheet, from the sidebar's Chat), and from about 1393 pt the sidebar, the screen, and the chat as a column beside it, which no iPad's own screen reaches (the 13-inch is 1376 pt across; MA-301 c 1c, Arun, 2 Nov 2026). On the web, from 1024 px the chat is a sheet over the page at every width, never beside it (MA-355 a 1a, Arun, 25 Nov 2026). That covers
    every iPhone, every iPad window (Split View, Slide Over, Stage Manager) and a foldable, folded or open. Dynamic
    Type from xSmall to AX5 reflows every card (figures stack under labels from AX1); a fold, a rotation or a resize
    keeps the conversation, the scroll and any guided flow. Show at least one screen at all three size classes
    (`iPad and foldable`).
  - In the web app, every page is built on the design system's adaptive shell (`.mp-app` container, `.mp-shell`,
    `.mp-cols`): compact under 600 (one column, tab bar), regular 600 to 1023 (tab bar; one column until 760, then
    two), wide 1024 and up (sidebar, two columns, the list never under 300, capped at 1180).
  - On every board: no fixed pixel column widths, and fluid charts with labels and dots in HTML over the SVG (never a
    template value inside SVG `<text>`, which does not render).

## 2. Where designs live, and the record

- **The repo holds the designs**, under `docs/design/`, and nowhere else (rule 7 of `.claude/rules/plan-sync.md`).
  The design system is `ds-v1/`, **MyPaisa DS vN** (`tokens.css`, `ios.css`, `motion.css` and `motion.js`, the
  directions page, Foundations, Components, the iOS kit); the app's screens are `ios-v1/`, **MyPaisa iOS vN**
  (`Shell options`, the `iPhone` files, `iPad and foldable`); the web app's browser boards are `app-v1/`, **MyPaisa
  app v1**, whose Mini App and Telegram boards, with the Telegram kit in `ds-v1/`, are the superseded record (MA-161).
  The folders keep the names of the Claude Design projects they were copied from until 30 Oct 2026. A significant
  revision is a new file or a new vN, never an overwrite of what Arun picked from.
- **Drawing a board.** Each option is a `.dc.html` file in the folder of the surface it draws, started from the
  nearest board there, so it keeps the frames, the kit's classes and the shared files it loads by relative path:
  `./support.js` (the board runtime each folder carries), `tokens.css`, `motion.css`, `motion.js` and,
  for the app, `ios.css`. A design that is not a board set, such as a prototype, gets its own folder under
  `docs/design/` and loads the shared files from a board folder (`../app-v1/tokens.css`, as `prototype-v5/` does).
  No check runs on a prototype (MA-303).
- **Only the board folders and the design system change.** A picked design is carried into `ios-v1/`, `app-v1/` and
  `ds-v1/` and nowhere else: Prototype v5 is not updated, and its artifact is not republished (Arun, 23 Nov 2026,
  MA-301: "no need to update Prototype v5, just the ios-v1 and app-v1 and design system updates are all that is
  needed.. make it a rule"; `.claude/rules/plan-sync.md`, rule 5).
- **No record to write.** Git is the boards' only record (MA-296): there is no record file to update after drawing.
  A file removed on purpose takes every trace row that names its boards with it, in the same change
  (`python3 scripts/plan_sync.py check` refuses a cited board that is gone).
- **`tokens.css` and the motion files are copied** from `ds-v1/` into `ios-v1/` and `app-v1/`, with `ios.css`, byte
  for byte, after every change: each board loads the copy beside it. The web app holds its own copy in
  `web/src/lib/styles/` (`tokens.css` without its Google Fonts `@import`, which `web/src/app.html` makes, and
  `motion.css`), equal by `tokens.test.ts` in the web gate: copy it there too (MA-194). A snapshot of
  `tokens.css` goes into `docs/design/reviews/MA-<n>/` at the end of the round, as its record. `docs/design/ds-v1/`
  is the source; once `ios/` exists, its colour assets are generated from it (MA-165).
- **Where Arun looks: a private Claude Artifact per round** in Claude Code, **a local page** in Antigravity. Each round
  is published as an Artifact (step 3) and its link goes in the round's `decision.md`; a round run in Antigravity
  shows the same host page on localhost instead, and `decision.md` names its path (MA-297). When a board changes, the whole-set MyPaisa Boards Artifact is published
  again (MA-324): `python3 scripts/boards_page/build.py docs/design <scratchpad>/boards`, then the publish its
  docstring gives, then `python3 scripts/artifacts_sync.py record "MyPaisa Boards" <version>`; `plan_sync.py check`
  fails until then. A board is otherwise linked by its file in the repo.
- **The record** in `docs/design/reviews/MA-<n>/`, committed on the issue's branch: `decision.md` (the request in
  Arun's words, the round's Artifact link or, for a round run in Antigravity, its local page, the options with rationale and trade-offs, what the build would touch,
  the pick and its date), the round's host page (`options.html`, step 3) and `tokens.css`.

## 3. Publish the round, then get the pick

- **No gates on the boards** (Arun, 2 Nov 2026, MA-303: "All the 6 checks currently run on docs/design. Lets stop
  that."). Before publishing, run `python3 scripts/plan_sync.py check`, which keeps the trace, the docs, the recorded
  Confluence pages and the code in step, and finds every board a story cites on disk; Jira is compared by
  `/plan-sync`. plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). Open each board
  once to see that it loads, in light and dark. Arun judges the round by eye, and no reviewer lane looks at boards
  (`.claude/rules/independent-review.md`).
- **Publish the round** as a private Claude Artifact, the way MA-291 published Prototype v5
  (`docs/design/reviews/MA-291/decision.md`, "Where it lives"):
  1. Write a host page, `docs/design/reviews/MA-<n>/options.html`, that names the request, lists the options (the
     recommended one first, and why) and opens each option's boards in an iframe whose source is the board's path
     under `docs/design` (`ios-v1/<file>.dc.html`), the path it is published at. Load the `artifact-design` skill
     before writing it, as the Artifact tool asks.
  2. Publish it with the Artifact tool: `file_path` the host page, `root: docs/design`, and `files` listing every
     board the round shows and every file those boards load (`support.js`, `tokens.css`, `motion.css`, `motion.js`,
     `ios.css`, any image or font), each at its path under `docs/design`; `icon` on the first publish, and a
     one-sentence `description`. A later round on the same story republishes the same host page to the same link.
- **Asking.**
  1. Give Arun the Artifact's link (`https://claude.ai/artifact/...`; never a claude.ai/design link or a localhost
     URL), write it into `decision.md`, and comment it on the MA issue. In Antigravity, see "A round run in
     Antigravity" below instead.
  2. Ask for the pick with `AskUserQuestion`: one choice per option, the recommended one first, plus "None of these:
     rework".
  3. Read the comments Arun leaves on the Artifact with the ArtifactComments tool (load it with ToolSearch), and
     answer each once handled; a comment that asks for a change is feedback, which means another round (below).
- **A round run in Antigravity** (Arun, 30 Oct 2026, MA-297: rounds there use "local page"). Antigravity cannot
  publish a Claude Artifact, so the host page is shown locally and everything else about the round stays the same:
  1. Write the same host page, `docs/design/reviews/MA-<n>/options.html`, but link each board relative to the page
     (`../../ios-v1/<file>.dc.html`), as MA-295's does.
  2. Serve `docs/design/` on localhost (`python3 -m http.server 8765 -d docs/design`), give Arun
     `http://localhost:8765/reviews/MA-<n>/options.html`, write the page's repo path into `decision.md`, and comment
     it on the MA issue.
  3. Ask for the pick in words, one choice per option, the recommended one first, plus "None of these: rework". His
     comments come in the conversation, not on an Artifact.
- **The pick.** Record it in `decision.md` and on the MA issue. Then keep the plan in sync (`.claude/rules/plan-sync.md`):
  in `docs/trace.json` set the story's `design` to `picked` and list the picked boards (each board's note names its
  Jira keys), clear each `undrawn` item this round drew and say `Drawn: <the item, as it was listed>` in the notes;
  then `python3 scripts/plan_sync.py render` and `check`.
  - "None of these", or feedback, means another round: back to step 1, in the same folders as new files or a new
    vN, published again to the round's Artifact (or shown again on the round's local page in Antigravity).

## 4. Build the picked option

- **When.** Only after Arun picks an option in the current request. Build that option only.
- **How.** On the same branch:
  1. Update the spec first when the pick changes it: the boards at every size class in `docs/design/ios-v1/` and the
     browser boards in `docs/design/app-v1/`, the design system in `docs/design/ds-v1/`, or the example
     cards in `ARCHITECTURE.md` §8.2; never Prototype v5 (23 Nov 2026, above). Republishing an explainer page's
     artifact is Arun's call; ask.
  2. Build with impeccable, comp-led when the pick includes an approved comp: `ios/` for the app (the React Native
     shell in TypeScript, and every piece a member looks at in SwiftUI, hosted through a Fabric component and fed one
     JSON model), `web/` for the web app (SvelteKit 3, Tailwind CSS 4, shadcn-svelte, TanStack, LayerChart; MA-229), `cards/` and the card pieces at both doors
     (SwiftUI in `ios/`, Svelte components in `web/`, the card types in `web/src/lib/`) for the chat's cards, the house
     chart style for charts, and the shared motion at both doors.
  3. Run the gates in `.claude/jira-flow.json` (the plan-sync gate now;
     once `pyproject.toml` lands, `uv run ruff check . && uv run pyright && uv run pytest`; once `ios/` exists, the
     iOS gates of MA-166: eslint and Jest for the shell, swift-format lint, `xcodebuild test` on the iPhone and iPad
     simulators with XCUITest, the snapshot tests and `performAccessibilityAudit()`, and the `PERFORMANCE.md` benches
     on the phone for a change that moves or scrolls; once `web/` exists, svelte-check, eslint, vitest and its
     Playwright screenshots).
  4. Check the result against the picked option, beside the picked boards: simulator screenshots
     (`xcrun simctl io booted screenshot`) on iPhone 17 Pro and iPad Air 11", in light and dark, at Large and AX5
     text; Playwright screenshots of the web app at 390 and 1440 in both themes; or the card as each door draws it.
- **Then ship with `/autoship`.** In this repo the PR, In Review and the checks go without asking; only the merge into
  `main` asks (`.claude/rules/ship-autopilot.md`).
- **Afterwards.** The boards stay in `docs/design/`, with git as their record, and the round's record in
  `docs/design/reviews/`.
