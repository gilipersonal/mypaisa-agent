---
name: design-first
description: Design before code for any MyPaisa UI or UX change. Use whenever Arun asks for a change to how MyPaisa looks or flows, on the web app and Mini App dashboard (web/, the artboards in docs/design/dashboard/), the Telegram cards, buttons and guided flows, the chat's PNG charts, the design pages (architecture, journeys) or the mark; such as a new page or card, a redesign, or a change to layout, flow, visuals, copy hierarchy, charts or motion. Design 2 or 3 options with impeccable, ui-ux-pro-max and dataviz (Qwen-Image for comps); save them in docs/design/reviews/MA-<n>/; publish a review board as a claude.ai artifact; and build only the option Arun picks.
---

# Design first

Every new UI or UX change to MyPaisa is designed before it is built, in four steps. No code under `web/` or
`src/mypaisa_agent/` that changes what a member sees is written until step 4.

1. **Design 2 or 3 options** with the design tools.
2. **Save them in `docs/design/reviews/MA-<n>/`** and commit them on the issue's branch. `docs/design/` is the source
   of truth for designs.
3. **Publish** one review board as a claude.ai artifact and give Arun the link.
4. **Arun picks one option.** Build only that option, and only after the pick, made in the current request.

Changes that touch no design skip this: a typo, a broken link, data, a backend change a member never sees, or a bug
with one obvious fix. When unsure whether something is a design change, treat it as one.

## 0. Ticket, branch and context

- Find or create the MA issue for the request and move it to In Progress (21). Creating, commenting on and moving
  issues need no asking (`.claude/rules/jira-flow.md`, `.claude/rules/ship-autopilot.md`).
- Create the branch `MA-<n>-<slug>` from `main` now, so the designs can be committed. The build continues on the same
  branch after the pick.
- Read the context:
  - `ARCHITECTURE.md`: the four rules (§1), the Telegram front end (§9: navigation, the example cards, guided
    flows) and the web app (§9.3);
  - `PLAN.md`, the phase the surface belongs to (phase 5 for the web app);
  - `docs/design/README.md` and the surface's existing design: the dashboard artboards in `docs/design/dashboard/`
    (`Main`, `Holding`, `Overlap`, `Scorecard`, `Light` `.dc.html`, laid out by `canvas.json`), `journeys.html` for the
    chat, `architecture.html` for the explainer;
  - earlier reviews for the same surface in `docs/design/reviews/`.
- Capture how the screens involved look now into `docs/design/reviews/MA-<n>/current/`:
  - once `web/` exists, serve it (`python3 -m http.server 8000 --directory web`, the origin Google sign-in allows)
    and screenshot with Playwright at 390 and 1440 wide, in dark and light;
  - before that, the dashboard artboards are the current screens: screenshot them from the live dashboard artifact
    (`docs/design/README.md` has the link), since the `.dc.html` files only render on the design canvas;
  - for the chat, screenshot the matching journey in `journeys.html`, or the card as the bot sends it.

## 1. Design 2 or 3 options

### Tools by surface

| Surface | Lead | Also |
| --- | --- | --- |
| Web app and Mini App (`web/`; Overview, a holding, Overlap, Scorecard, Audit, Activity, the login page) | `impeccable`, Operate mode (`shape`, `layout`, `critique`) | `ui-ux-pro-max` for UX rules (`python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<outcome>" --domain ux`); `redesign-existing-projects` to audit a page that exists; `qwengen-bf16` for a comp from a screenshot of the current screen |
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
  2. `ARCHITECTURE.md` and `PLAN.md`, then the artboards in `docs/design/dashboard/`, which are the web app's spec.
  3. The Nocturne look, the wealth tracker's design system (its `frontend/src/app/globals.css`), as the artboards
     already use it: the ink `#161826`, surfaces `#232532` on `#3f424d` borders, the violet accent `#b5abfc`, Inter
     with tabular figures.
  4. impeccable.
  5. The other skills.

  A skill's defaults (its fonts, palettes, card styles) never override the artboards or Nocturne.
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
  - Web app options show the main page in dark and light, at phone width (390, as the Mini App) and laptop width
    (two columns).
  - Chat options show the card in Telegram's dark and light themes, in `simple` and `technical` mode, and the HTML
    fallback when the change touches the card's layout.
  - The picked option gets its remaining states (empty, loading, stale prices, error, a long holding name, many
    holdings with "More") before the build starts.
- **Visible.** Every option is something Arun can look at:
  - **a comp:** a Qwen-Image render, from a screenshot of the current screen as reference or from scratch, with its
    prompt sidecar;
  - **an HTML mockup:** for the web app, static HTML and CSS in the Nocturne tokens, the way `web/` will be built (no
    framework), with lightweight-charts for any chart; for the chat, a phone frame in Telegram's look, as
    `journeys.html` draws it; clickable where the flow is the point;
  - **a chart:** the matplotlib PNG or the lightweight-charts page itself, not a drawing of one.
- **Motion.** Prototype it in the mockup with what the build will ship: CSS transitions and the Web Animations API.
  - Animate transform and opacity first.
  - Nothing loops forever.
  - Under `prefers-reduced-motion` every step lands in its final state at once.
  - Inside Telegram, follow the Mini App's `colorScheme` and `themeParams` for light and dark.
- **Accessibility.** WCAG 2.2 AA: contrast measured on the real background, 44 px targets in the web app, visible
  focus, and colour never the only signal (keep the ▲ ▼ beside the green and red).
- **Illustrative data.** Every figure, member and holding on a design is illustrative and labelled so. Never the
  household's real balances, names or accounts.

## 2. Save in docs/design

`docs/design/` is the source of truth for designs. Every design created or edited is saved under
`docs/design/reviews/MA-<n>/` and committed on the issue's branch: the options, the comps, the mockups, the review
board and the record of the pick. impeccable's `.impeccable/` folder is tool state only; copy its mock-ups here. Claude
artifacts hold published copies, never the only copy.

```
docs/design/reviews/MA-<n>/
  board.html        the review board; opens as a normal page
  decision.md       the request in Arun's words, the options, the pick and its date
  current/          screenshots of the screens as they are now (WebP)
  option-a/         that option's comps (WebP with a .prompt.json sidecar), mockup.html, chart PNGs
  option-b/
  option-c/
```

The board holds:
- the request;
- the current screens;
- each option with its rationale, trade-offs and what the code change would touch (`web/`, `telegram.py`, `cards/`,
  the chart style);
- the recommended option;
- any open question.

Keep the board and mockups self-contained, as the existing design pages are: inline CSS, Google Fonts (Inter,
JetBrains Mono) and nothing else from the network, images by relative path. Commit and push before publishing.

## 3. Publish for review and get the pick

- **Publish** `board.html` as a private claude.ai artifact (the `Artifact` tool), titled `MA-<n> design review`, with
  the option images as its supporting files. Dashboard options that are artboards can go on a design canvas like the
  dashboard's own; never overwrite the live dashboard artifact for a review.
- **Asking.**
  1. Give Arun the artifact link, and comment it on the MA issue.
  2. Ask for the pick with `AskUserQuestion`: one choice per option, the recommended one first, plus "None of these:
     rework".
  3. Read comments left on the artifact with `ArtifactComments`, and answer them once they are handled.
- **The pick.** Record it in `decision.md` and on the MA issue.
  - "None of these", or feedback, means another round: back to step 1, saved over the same folder and republished to
    the same artifact.

## 4. Build the picked option

- **When.** Only after Arun picks an option in the current request. Build that option only.
- **How.** On the same branch:
  1. Update the spec first when the pick changes it: the artboards in `docs/design/dashboard/`, or the example cards
     in `ARCHITECTURE.md` §9.2. Republishing the live dashboard artifact is Arun's call; ask.
  2. Build with impeccable, comp-led when the pick includes an approved comp: `web/` for the web app,
     `telegram.py` and `cards/` for the chat, the house chart style for charts.
  3. Run the gates in `.claude/jira-flow.json` (none until `pyproject.toml` lands; then
     `uv run ruff check . && uv run pyright && uv run pytest`).
  4. Check the result against the picked option: Playwright screenshots of the web app at phone and laptop widths in
     both themes (`PLAN.md` phase 5's test), or the card as the bot sends it.
- **Then ship with `/autoship`.** In this repo the PR, In Review and the checks go without asking; only the merge into
  `main` asks (`.claude/rules/ship-autopilot.md`).
- **Afterwards.** The designs stay in `docs/design/reviews/`. Whether the published review artifact stays is Arun's
  call.
