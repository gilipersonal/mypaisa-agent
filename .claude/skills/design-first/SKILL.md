---
name: design-first
description: Design before code for any MyPaisa UI or UX change. Use whenever Arun asks to change how MyPaisa looks or flows: the iOS app (ios/, one spec in the MyPaisa iOS v1 Claude Design project, boards for iPhone, iPad and the foldable), the read-only web app (web/, a PWA for the dashboard and the Admin center, from the browser boards in the MyPaisa app v1 project), the chat's cards, buttons and guided flows, the charts (Swift Charts and lightweight-charts in one house style), the motion, the design pages (the agent journey, the market agent) or the mark and the app icon; a new screen, page or card, a redesign, or a change to layout, flow, visuals, copy, charts or motion. Design 2 or 3 options with impeccable, ui-ux-pro-max and dataviz (Qwen-Image for comps) in Claude Design (the MyPaisa DS, MyPaisa iOS and MyPaisa app projects), keeping the record in docs/design/reviews/MA-<n>/; review every page for glitches in light and dark at every size class, legible at 25% brightness; and build only the option Arun picks.
---

# Design first

Every new UI or UX change to MyPaisa is designed before it is built, in four steps. No code under `ios/`, `web/` or
`src/mypaisa_agent/` that changes what a member sees is written until step 4.

1. **Design 2 or 3 options** with the design tools, **in Claude Design** (Arun, 23 Oct 2026: "The designs needs to
   be all done on claude design, including the design system and the screens"). The design system lives in the
   MyPaisa DS project, the screens in the MyPaisa iOS project (the app) and the MyPaisa app project (the web app's
   browser boards); the record stays in `docs/design/reviews/MA-<n>/`.
2. **Review every page for glitches** before Arun sees it (Arun, MA-101: "Make sure the designs are reviewed properly
   for any kind of glitches, this app will be adaptive and responsive"): render it, look at it in light and dark and
   at every size class, fix, look again.
3. **Give Arun the Claude Design links** and ask for the pick.
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
  - `ARCHITECTURE.md`: the four rules (§1), the iOS app (§9: the shell, the size classes and the motion in §9.1, the
    chat's cards and guided flows, the dashboard screens and the Admin center), the web app (§9.4), identity and the
    second check (§4.5) and push (§11);
  - `PLAN.md`, the phase the surface belongs to (phase 1 for sign-in, the chat, the motion and legibility; phase 5 for
    the dashboard and the Admin center, in the app and the web app; phase 14 for widgets, Siri and the share sheet);
  - `docs/design/README.md` and the surface's existing design: for the app, the one spec in the MyPaisa iOS v1 Claude
    Design project (`Shell options`, the `iPhone` files, `iPad and foldable`) and the iOS kit in MyPaisa DS v1; for
    the web app, the browser boards in the MyPaisa app v1 project (`Browser · ...`, picked before MA-161, the sign-in
    page redrawn); the Mini App and Telegram boards there and the Nocturne artboards in `docs/design/dashboard/` are
    the superseded record, read only for a flow Arun already picked; `agent-journey.html` and `market-agent.html`
    for the explainers;
  - earlier reviews for the same surface in `docs/design/reviews/` (`MA-161/decision.md` for the shell, the size
    classes and Liquid Glass).
- Capture how the screens involved look now into `docs/design/reviews/MA-<n>/current/`:
  - until `ios/` and `web/` exist, the boards are the current screens: screenshot them from Claude Design
    (`render_preview`), since the `.dc.html` files only render on the design canvas; a screen with no board yet has
    no current look, so say so on the board;
  - once `ios/` exists, run the app on the simulator and screenshot it with
    `xcrun simctl io booted screenshot <file>.png`: iPhone 17 Pro and iPad Air 11", in light and dark
    (`xcrun simctl ui booted appearance light`, then `dark`), at the Large text size and at AX5
    (`xcrun simctl ui booted content_size large`, then `accessibility-extra-extra-extra-large`);
  - once `web/` exists, serve it (`python3 -m http.server 8000 --directory web`, the origin dev's api and Google web
    client allow) and screenshot it with Playwright at 390 and 1440 wide, in dark and light;
  - for a card, the same: its board, or the card as the app draws it.

## 1. Design 2 or 3 options

### Tools by surface

| Surface | Lead | Also |
| --- | --- | --- |
| The iOS app, `ios/`: one app, one spec in the MyPaisa iOS v1 project, every size class. Boards for **iPhone** (compact) and for **iPad and the foldable** (regular, narrow and wide), each in light and dark, with Dynamic Type up to AX5 and privacy mode wherever they change a screen: the shell, sign-in, the chat, Home, a holding, Overlap, Scorecard, Audit and Files, Activity, the Admin center and You | `impeccable`, Operate mode (`shape`, `layout`, `critique`) | `ui-ux-pro-max` for UX rules (`python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<outcome>" --domain ux`, and `--stack swiftui` for SwiftUI patterns); Apple's Human Interface Guidelines for every control; `redesign-existing-projects` to audit a screen that exists; `qwengen-bf16` for a comp from a screenshot of the current screen |
| The web app, `web/`: the read-only dashboard and the Admin center in a browser, a PWA, no chat. **Browser** boards in the MyPaisa app v1 project (laptop, two columns; the adaptive shell below it; the sign-in page), for Home, a holding, Overlap, Scorecard, Audit and Files, Activity and the Admin center | `impeccable`, Operate mode (`shape`, `layout`, `critique`) | `ui-ux-pro-max --domain ux`; `redesign-existing-projects` to audit a page that exists; `qwengen-bf16` for a comp from a screenshot of the current page |
| The chat's cards, buttons and guided flows: native SwiftUI views drawn from the card JSON of MA-174 (`src/mypaisa_agent/cards/`, `ios/Packages/MyPaisaUI/Cards/`), in `simple` and `technical` | `impeccable` (`clarify`, `distill`) on the card's text and hierarchy | `ui-ux-pro-max --domain ux` for the flow; `design-skills:ux-writing` for button labels and one-line copy |
| Charts: Swift Charts in the app and lightweight-charts in the web app, one house style (MA-56), in the chat's cards and on the dashboard | `dataviz` | Validate palettes with its script; one palette at both doors, so a holding looks the same everywhere |
| Design pages (`docs/design/agent-journey.html`, `market-agent.html`; the earlier `architecture.html` and `journeys.html`) | `impeccable` | `high-end-visual-design` and `design-taste-frontend` are allowed here, and only here |
| The mark (`docs/mark.svg` and its PNGs) and the app icon | `impeccable` | `qwengen-bf16` for drafts; the shipped mark stays SVG; the app icon is made from it in Icon Composer (default, dark, clear and tinted; the DEV band on MyPaisa Dev) |

The taste skills are for landing pages and showcases, not dashboards or multi-step product UI. Keep them off the app,
the web app and the chat. `ltx-clip` makes video assets only, never interface motion.

### Rules

- **Precedence.**
  1. Arun's words.
  2. `ARCHITECTURE.md` and `PLAN.md`, then the boards: MyPaisa iOS v1 for the app, and the browser boards in MyPaisa
     app v1 for the web app; each door's one spec.
  3. The design system in force: **MyPaisa DS v1** ("Warm ledger", picked by Arun on 24 Oct 2026, MA-101): `tokens.css`,
     the shared motion (`motion.css`, `motion.js`) and the iOS kit (`iOS kit.dc.html`, `ios.css`) in the MyPaisa DS v1
     Claude Design project, copied into `docs/design/ds-v1/` (the only source; `docs/design/reviews/MA-101/tokens.css` is the record of the first pick, before MA-181 tuned both themes for 25% brightness, and a `tokens.css` in any other `reviews/` folder is a snapshot of its round, never a source);
     then Apple's Human Interface Guidelines, which the kit follows. The Mini App and Telegram boards in MyPaisa app
     v1, the Telegram kit and the Nocturne artboards in `docs/design/dashboard/` are superseded (MA-161).
  4. impeccable.
  5. The other skills.

  A skill's defaults (its fonts, palettes, card styles) never override the artboards or the design system.
- **The product's rules hold in every design** (`ARCHITECTURE.md`):
  - **read-only dashboard:** the dashboard screens are read-only at both doors; no control on Home, a holding,
    Overlap, Scorecard, Audit, Files or Activity writes the household's records, and the web app has no chat. In the
    app, a screen's Update or Ask opens the chat with the right guided flow, and every change is a card and a Confirm
    tap in the chat, with its audit row. The one exception is the owner's Admin center, in the app and the web app,
    whose admin settings and operations each sit behind the second check (in the app a fresh Sign in with Apple or
    passkey under Face ID, in a browser a passkey or a fresh sign-in; bound to the action and verified by the server,
    MA-76) and an audit row (`ARCHITECTURE.md` §9.3, §9.4; Arun: "read only (except for admin)");
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
  - every colour pair passes `python3 scripts/contrast_check.py`, at full brightness and with the screen dimmed to 25%
    (primary text and figures 7:1, and 4.5:1 dimmed; secondary and coloured text 4.5:1, and 3:1 dimmed; a chart line,
    a meter, a switch's ring or focus 3:1, and 1.8:1 dimmed); a new token or a new pairing goes into the gate before
    a board uses it;
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
  - A dashboard or Admin center screen is also in the web app: its options show the browser board too (laptop, two
    columns, the app's own navigation), changed in the same round, so the two doors never drift; a change that only
    fits one door says why on the board.
  - Chat options show the card in the app's chat in dark and light, in `simple` and `technical` mode, and its `plain`
    line (what push and VoiceOver read, MA-174) when the change touches the card's content.
  - The picked option gets its remaining states (empty, loading, stale prices, error, a long holding name, many
    holdings with "More") before the build starts.
- **Visible.** Every option is something Arun can look at:
  - **a comp:** a Qwen-Image render, from a screenshot of the current screen as reference or from scratch, with its
    prompt sidecar;
  - **a mockup in Claude Design:** a `.dc.html` board that links the design system's `tokens.css` and the shared
    `motion.css` and `motion.js`: for the app, with `ios.css` and the iOS kit's classes in an iPhone or iPad frame with
    the system's bars, so each part maps onto a SwiftUI view; for the web app, with the design system's classes in a
    browser frame, the way `web/` will be built (no framework); clickable where the flow is the point;
  - **a chart:** the real thing, not a drawing of one: Swift Charts on the simulator once `ios/` exists, the
    lightweight-charts page in the web app; until then, a board drawn with the kit's chart classes from the shape of
    the engine's series.
- **Motion** (MA-182; `ARCHITECTURE.md` §9.1): one motion system for every component and chart, at both doors, drawn
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
  - Light and dark follow the system's appearance (`prefers-color-scheme` on a board and in the web app); glass turns
    opaque under Reduce Transparency, and Increase Contrast uses the high-contrast colour assets.
- **Accessibility.** WCAG 2.2 AA and the HIG: contrast measured on the real background, glass included, and at 25%
  brightness (above); 44 pt targets in the app and 44 px in the web app; a spoken label for every figure and an audio
  graph for every chart; a visible focus ring with a hardware keyboard on iPad and in the browser; and colour never the
  only signal (keep the ▲ ▼ beside the green and red) (MA-181).
- **Illustrative data.** Every figure, member and holding on a design is illustrative and labelled so. Never the
  household's real balances, names or accounts.
- **Adaptive.**
  - In the app, every screen lays itself out by size class and window width, never by device: compact under about
    600 pt (the tab bar, one column, sheets for detail, the chat a tab), regular narrow about 600 to 900 pt (a sidebar
    that collapses to a tab bar at the top; the chat as a sheet, beside the screen only over about 900 pt), regular wide over about 900 pt (the sidebar, the screen, and the chat as a column beside it). That covers
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

- **Claude Design** holds the designs (load the `mcp__claude-design__*` tools, call `get_claude_design_prompt` and
  `read_design_skill` `hifi-design` first). The design system is the **MyPaisa DS vN** project (`tokens.css`,
  `ios.css`, `motion.css` and `motion.js`, the directions page, Foundations, Components, the iOS kit); the app's
  screens are the **MyPaisa iOS vN** project (`Shell options`, the `iPhone` files, `iPad and foldable`); the web app's
  browser boards are in the **MyPaisa app v1** project, whose Mini App and Telegram boards, with the Telegram kit, are
  the superseded record (MA-161). A significant revision is a new file or a new vN, never an overwrite of what Arun
  picked from.
- **`tokens.css` and the motion files are copied** from the DS project into the iOS and app projects, and `ios.css`
  into the iOS project, after every change (`copy_files`), then all of them are mirrored into the repo; a snapshot of
  `tokens.css` goes into `docs/design/reviews/MA-<n>/` at the end of the round, as its record. `docs/design/ds-v1/`
  is the source; once `ios/` exists, its colour assets are generated from it (MA-165). A token change is measured
  before it is copied: mirror the DS change and run `python3 scripts/contrast_check.py --report`, where every pair
  must pass and only the copies not yet made may fail; after `copy_files` and a re-mirror the whole gate
  (`--selftest`, then the plain run) passes.
- **The record** in `docs/design/reviews/MA-<n>/`, committed on the issue's branch: `decision.md` (the request in
  Arun's words, the Claude Design links, the options with rationale and trade-offs, what the build would touch, the
  glitches found and fixed, the pick and its date) and `tokens.css`.

## 3. Review for glitches, then get the pick

- **Glitch review, every time.** Render each page (`render_preview`), screenshot it section by section in light and
  dark and at every size class it claims, click through anything interactive, and read every image: clipped or
  touching text, icons showing as words, misalignment, overflow, empty halves, light/dark differences, contrast,
  text a dimmed screen would lose (the contrast gate), glass on glass, text clipped at AX5, targets under 44 pt (44 px
  on the web), motion that loops or ignores Reduce Motion, charts out of line, numbers that disagree between pages or
  between the two doors. Fix and look again. When Arun asks for
  it (as on MA-101), fresh reviewers that did not make the pages do this pass too, the way every review here runs
  (`.claude/rules/independent-review.md`: gates first, parallel lanes, the delta after round 1, the fixed list), and
  their blockers are fixed before Arun sees the work.
- **Asking.**
  1. Give Arun the claude.ai/design links (never a serve URL), and comment them on the MA issue.
  2. Ask for the pick with `AskUserQuestion`: one choice per option, the recommended one first, plus "None of these:
     rework".
  3. Read comments left in Claude Design (`list_comments`), and acknowledge them once handled.
- **The pick.** Record it in `decision.md` and on the MA issue. Then keep the plan in sync (`.claude/rules/plan-sync.md`):
  in `docs/trace.json` set the story's `design` to `picked` and list the picked boards (each board's note names its
  Jira keys), clear each `undrawn` item this round drew and say `Drawn: <the item, as it was listed>` in the notes; run `/plan-sync MA-<n>` to copy the changed Claude Design files into `docs/design/ios-v1/`, `app-v1/` or `ds-v1/`
  with their etags; then `python3 scripts/plan_sync.py render` and `check`.
  - "None of these", or feedback, means another round: back to step 1, in the same projects as new files or a new vN.

## 4. Build the picked option

- **When.** Only after Arun picks an option in the current request. Build that option only.
- **How.** On the same branch:
  1. Update the spec first when the pick changes it: the boards at every size class in the MyPaisa iOS v1 Claude
     Design project and the browser boards in MyPaisa app v1, or the example cards in `ARCHITECTURE.md` §9.2.
     Republishing an explainer page's artifact is Arun's call; ask.
  2. Build with impeccable, comp-led when the pick includes an approved comp: `ios/` for the app (SwiftUI, with
     `MyPaisaUI` for the design system), `web/` for the web app (no framework, lightweight-charts), `cards/` and
     `ios/Packages/MyPaisaUI/Cards/` for the chat's cards, the house chart style for charts, and the shared motion at
     both doors.
  3. Run the gates in `.claude/jira-flow.json` (the plan-sync gate with `python3 scripts/contrast_check.py` now;
     once `pyproject.toml` lands, `uv run ruff check . && uv run pyright && uv run pytest`; once `ios/` exists, the
     iOS gates of MA-166: swift-format lint, `xcodebuild test` on the iPhone and iPad simulators with the snapshot
     tests and `performAccessibilityAudit()`; once `web/` exists, its Playwright screenshots).
  4. Check the result against the picked option, beside the picked boards: simulator screenshots
     (`xcrun simctl io booted screenshot`) on iPhone 17 Pro and iPad Air 11", in light and dark, at Large and AX5
     text; Playwright screenshots of the web app at phone and laptop widths in both themes (`PLAN.md` phase 5's
     test); or the card as the app draws it.
- **Then ship with `/autoship`.** In this repo the PR, In Review and the checks go without asking; only the merge into
  `main` asks (`.claude/rules/ship-autopilot.md`).
- **Afterwards.** The designs stay in their Claude Design projects and the record in `docs/design/reviews/`.
