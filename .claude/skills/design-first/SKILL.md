---
name: design-first
description: Design before code for any MyPaisa UI or UX change. Use whenever Arun asks for a change to how MyPaisa looks or flows, on the web app (web/, one spec in the MyPaisa app v1 Claude Design project with Mini App boards for Telegram and browser boards for the laptop), the Telegram cards, buttons and guided flows, the chat's PNG charts, the design pages (architecture, journeys) or the mark; such as a new page or card, a redesign, or a change to layout, flow, visuals, copy hierarchy, charts or motion. Design 2 or 3 options with impeccable, ui-ux-pro-max and dataviz (Qwen-Image for comps) in Claude Design (the MyPaisa DS and MyPaisa app projects), keeping the record in docs/design/reviews/MA-<n>/; review every page for glitches in light and dark at every size class; and build only the option Arun picks.
---

# Design first

Every new UI or UX change to MyPaisa is designed before it is built, in four steps. No code under `web/` or
`src/mypaisa_agent/` that changes what a member sees is written until step 4.

1. **Design 2 or 3 options** with the design tools, **in Claude Design** (Arun, 23 Oct 2026: "The designs needs to
   be all done on claude design, including the design system and the screens"). The design system lives in the
   MyPaisa DS project, the screens in the MyPaisa app project; the record stays in `docs/design/reviews/MA-<n>/`.
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
- Run `python3 scripts/plan_sync.py start MA-<n>`: it names the story's ARCHITECTURE sections and its boards. Boards
  drawn ahead of the story (`design: "planned"`) are the starting point for the options, not a pick
  (`.claude/rules/plan-sync.md`).
- Read the context:
  - `ARCHITECTURE.md`: the four rules (§1), the Telegram front end (§9: navigation, the example cards, guided
    flows) and the web app (§9.3);
  - `PLAN.md`, the phase the surface belongs to (phase 5 for the web app);
  - `docs/design/README.md` and the surface's existing design: for the web app, the one spec in the MyPaisa app v1
    Claude Design project (Mini App, Browser, Browser 2, Responsive, Prototype; the Nocturne artboards in
    `docs/design/dashboard/` are superseded); Telegram chats there and `journeys.html` for the chat; `architecture.html`
    for the explainer;
  - earlier reviews for the same surface in `docs/design/reviews/`.
- Capture how the screens involved look now into `docs/design/reviews/MA-<n>/current/`:
  - once `web/` exists, serve it (`python3 -m http.server 8000 --directory web`, the origin Google sign-in allows)
    and screenshot with Playwright at 390 and 1440 wide, in dark and light;
  - before that, the spec's boards are the current screens: screenshot them from the live dashboard artifact
    (`docs/design/README.md` has the link), since the `.dc.html` files only render on the design canvas; a page with
    no browser board yet has no current laptop screen, so say so on the board;
  - for the chat, screenshot the matching journey in `journeys.html`, or the card as the bot sends it.

## 1. Design 2 or 3 options

### Tools by surface

| Surface | Lead | Also |
| --- | --- | --- |
| The web app, `web/`: one app, one spec, two sets of boards. **Mini App** boards (inside Telegram, phone) and **browser** boards (laptop, two columns, the login page), for Overview, a holding, Overlap, Scorecard, Audit and Activity | `impeccable`, Operate mode (`shape`, `layout`, `critique`) | `ui-ux-pro-max` for UX rules (`python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<outcome>" --domain ux`); `redesign-existing-projects` to audit a page that exists; `qwengen-bf16` for a comp from a screenshot of the current screen |
| Telegram cards, buttons and guided flows (`src/mypaisa_agent/telegram.py`, `cards/`) | `impeccable` (`clarify`, `distill`) on the card's text and hierarchy | `ui-ux-pro-max --domain ux` for the flow; `design-skills:ux-writing` for button labels and one-line copy |
| Charts in the chat (matplotlib PNG, one house style, `render_chart`) | `dataviz` | Validate palettes with its script; render each option with matplotlib from illustrative data |
| Charts in the web app (lightweight-charts) | `dataviz` | The same palette as the chat's charts, so a holding looks the same in both |
| Design pages (`docs/design/architecture.html`, `journeys.html`) | `impeccable` | `high-end-visual-design` and `design-taste-frontend` are allowed here, and only here |
| The mark (`docs/mark.svg` and its PNGs) | `impeccable` | `qwengen-bf16` for drafts; the shipped mark stays SVG |

The taste skills are for landing pages and showcases, not dashboards or multi-step product UI. Keep them off the web
app and the chat. `ltx-clip` makes video assets only, never interface motion.

### Rules

- **Precedence.**
  1. Arun's words.
  2. `ARCHITECTURE.md` and `PLAN.md`, then the boards in the MyPaisa app v1 Claude Design project, the web app's one spec.
  3. The design system in force: **MyPaisa DS v1** ("Warm ledger", picked by Arun on 24 Oct 2026, MA-101): `tokens.css`
     in the MyPaisa DS v1 Claude Design project, a copy in `docs/design/reviews/MA-101/`. Its boards in the MyPaisa
     app v1 project are the spec; the older Nocturne artboards in `docs/design/dashboard/` are superseded.
  4. impeccable.
  5. The other skills.

  A skill's defaults (its fonts, palettes, card styles) never override the artboards or the design system.
- **The product's rules hold in every design** (`ARCHITECTURE.md`):
  - **read-only web:** no form, button or link in the web app writes anything; a change is always a card and a
    Confirm tap in the chat;
  - **the summary first:** the layman sees the summary, the detail is one tap away (the `Technical` section, `Why?`);
    show both `simple` and `technical` modes where a card has them;
  - **Claude never produces a number:** every figure on a design is the engine's or the registry's, and the copy never
    implies the model worked it out;
  - **the bot cannot trade:** no design offers to buy or sell;
  - **privacy mode** hides pounds in every card and in the web app; show that state for any screen with money on it.
- **2 or 3 options, every time.**
  - Each option is a complete answer to the request, different in a way that matters: structure, flow, emphasis or
    treatment. Never the same idea in two colours.
  - Mark one as recommended, and say why.
  - Web app options show the main page on both sets of boards, in dark and light: the Mini App board (390 wide,
    inside Telegram's header, no app header, Telegram's `BackButton`, safe-area insets) and the browser board (laptop,
    two columns, the app's own navigation). A page changed for one door is changed for the other in the same round,
    so the two never drift; a change that only fits one door says why on the board. One spec, never a design doc per
    door (`docs/design/README.md`, MA-6).
  - Chat options show the card in Telegram's dark and light themes, in `simple` and `technical` mode, and the HTML
    fallback when the change touches the card's layout.
  - The picked option gets its remaining states (empty, loading, stale prices, error, a long holding name, many
    holdings with "More") before the build starts.
- **Visible.** Every option is something Arun can look at:
  - **a comp:** a Qwen-Image render, from a screenshot of the current screen as reference or from scratch, with its
    prompt sidecar;
  - **a mockup in Claude Design:** a `.dc.html` page that links the design system's `tokens.css` and uses its
    classes, the way `web/` will be built (no framework); for the chat, a phone frame in Telegram's look; clickable
    where the flow is the point;
  - **a chart:** the matplotlib PNG or the lightweight-charts page itself, not a drawing of one.
- **Motion.** Prototype it in the mockup with what the build will ship: CSS transitions and the Web Animations API.
  - Animate transform and opacity first.
  - Nothing loops forever.
  - Under `prefers-reduced-motion` every step lands in its final state at once.
  - Light and dark follow Telegram's `colorScheme` and `themeParams` on the Mini App boards, and the system's
    `prefers-color-scheme` on the browser boards.
- **Accessibility.** WCAG 2.2 AA: contrast measured on the real background, 44 px targets in the web app, visible
  focus, and colour never the only signal (keep the ▲ ▼ beside the green and red).
- **Illustrative data.** Every figure, member and holding on a design is illustrative and labelled so. Never the
  household's real balances, names or accounts.
- **Adaptive.** Every web page is built on the design system's adaptive shell (`.mp-app` container, `.mp-shell`,
  `.mp-cols`): compact under 600 (one column, tab bar), regular 600 to 1023 (tab bar; one column until 760, then two),
  wide 1024 and up (sidebar, two columns, the list never under 300, capped at 1180). No fixed pixel column widths;
  charts fluid, with labels and dots in HTML over the SVG (never a template value inside SVG `<text>`, which does not
  render). Show at least one page at all three size classes (the app project's Responsive page).

## 2. Where designs live, and the record

- **Claude Design** holds the designs (load the `mcp__claude-design__*` tools, call `get_claude_design_prompt` and
  `read_design_skill` `hifi-design` first). The design system is the **MyPaisa DS vN** project (`tokens.css`, the
  directions page, Foundations, Components, the Telegram kit); the screens are the **MyPaisa app vN** project (Mini
  App, Browser, Responsive, Prototype, Telegram chats). A significant revision is a new file or a new vN, never an
  overwrite of what Arun picked from.
- **`tokens.css` is copied** from the DS project into the app project after every change (`copy_files`), and into
  `docs/design/reviews/MA-<n>/` in the repo, so the repo always has the system's source.
- **The record** in `docs/design/reviews/MA-<n>/`, committed on the issue's branch: `decision.md` (the request in
  Arun's words, the Claude Design links, the options with rationale and trade-offs, what the build would touch, the
  glitches found and fixed, the pick and its date) and `tokens.css`.

## 3. Review for glitches, then get the pick

- **Glitch review, every time.** Render each page (`render_preview`), screenshot it section by section in light and
  dark and at every size class it claims, click through anything interactive, and read every image: clipped or
  touching text, icons showing as words, misalignment, overflow, empty halves, light/dark differences, contrast,
  targets under 44 px, charts out of line, numbers that disagree between pages. Fix and look again. When Arun asks for
  it (as on MA-101), a fresh reviewer that did not make the pages does this pass too, and its blockers are fixed
  before Arun sees the work.
- **Asking.**
  1. Give Arun the claude.ai/design links (never a serve URL), and comment them on the MA issue.
  2. Ask for the pick with `AskUserQuestion`: one choice per option, the recommended one first, plus "None of these:
     rework".
  3. Read comments left in Claude Design (`list_comments`), and acknowledge them once handled.
- **The pick.** Record it in `decision.md` and on the MA issue. Then keep the plan in sync (`.claude/rules/plan-sync.md`):
  in `docs/trace.json` set the story's `design` to `picked` and list the picked boards (each board's note names its
  Jira keys); run `/plan-sync MA-<n>` to copy the changed Claude Design files into `docs/design/app-v1/` with their
  etags; then `python3 scripts/plan_sync.py render` and `check`.
  - "None of these", or feedback, means another round: back to step 1, in the same projects as new files or a new vN.

## 4. Build the picked option

- **When.** Only after Arun picks an option in the current request. Build that option only.
- **How.** On the same branch:
  1. Update the spec first when the pick changes it: both sets of boards in the MyPaisa app v1 Claude Design project,
     or the example cards in `ARCHITECTURE.md` §9.2. Republishing the live dashboard artifact is Arun's call; ask.
  2. Build with impeccable, comp-led when the pick includes an approved comp: `web/` for the web app,
     `telegram.py` and `cards/` for the chat, the house chart style for charts.
  3. Run the gates in `.claude/jira-flow.json` (none until `pyproject.toml` lands; then
     `uv run ruff check . && uv run pyright && uv run pytest`).
  4. Check the result against the picked option: Playwright screenshots of the web app at phone and laptop widths in
     both themes (`PLAN.md` phase 5's test), or the card as the bot sends it.
- **Then ship with `/autoship`.** In this repo the PR, In Review and the checks go without asking; only the merge into
  `main` asks (`.claude/rules/ship-autopilot.md`).
- **Afterwards.** The designs stay in their Claude Design projects and the record in `docs/design/reviews/`.
