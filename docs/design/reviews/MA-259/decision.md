# MA-259: where the boards live once standalone Claude Design closes

## The request, in Arun's words (28 Oct 2026)

"On Claude Code, I should be able to sync my claude design with the docs/design ones;
they should not drift."

The sync is done (`python3 scripts/design_sync.py pull` and `check`, rule 7 of
`.claude/rules/plan-sync.md`). This record is the other half: standalone Claude Design
(claude.ai/design) closes by 14 Dec 2026, and everything that reads the boards there
stops with it. **The choice is Arun's; nothing is migrated until he picks.**

## What changes on 14 Dec 2026

From Anthropic's article "Migrate from standalone Claude Design to Claude"
(support.claude.com, article 17440474, read 28 Oct 2026):

- The standalone site turns read-only on 14 Dec 2026; no new projects. The originals are
  deleted some time after, under the retention rules.
- An owner can **Move to Claude**, one project or several; it is rolling out gradually to
  paid plans. A moved project becomes an **artifact** in Claude, and the standalone copy
  turns read-only for everyone at once; that cannot be undone. Chats and comments stay
  behind and go when the site closes; public links stop working.
- Every project can be downloaded first as a .zip (Share, Project HTML, Project archive).
- The article says nothing about the claude-design connector or Claude Code. The
  connector's own guidance says a call on a project that has closed or moved is refused,
  so `design_sync.py`, `/plan-sync --design` and `/design-first` stop working for a
  project on the day it moves, or on 14 Dec at the latest. `design_sync.py check` then
  fails closed, so every PR waits until this is settled.

What Claude has instead, as seen from Claude Code today:

- The **Design** Artifact type (a canvas): its files are `project/canvas.json` (the boards
  and where each sits) and one `project/<name>.dc.html` per artboard, in the same Design
  Component format our boards are written in (`<x-dc>`, `<helmet>`, `./support.js`, which
  the type serves itself). An artboard is one frame of at most 8,000 px a side; a path's
  segments may hold only letters, digits, `_`, `.` and `-`.
- Claude Code's own **Artifact** tool reads and writes these with no connector and no
  login of its own: `list` (scope files), `read` with `path` or `paths` (saved straight to
  a local file, byte for byte), and `publish` with `files`. It is there in a session and in
  headless `claude -p`. (The `DesignSync` tool only syncs a local component library with a
  design-system project; it does not reach boards.)
- The **Design System** type keeps a system as `tokens.json`, a README and component
  previews: a different shape from DS v1's `tokens.css`, `ios.css` and kit boards.

## What any option must deal with

- **Names.** 42 of the 88 mirrored files, and 32 of the 40 board files the trace cites
  (412 board references), have names a canvas refuses: spaces, `·` and commas
  (`iPhone chat.dc.html`, `iPad v4 · Budget, assets and debts.dc.html`). Wherever the
  boards go on a canvas, they are renamed, and every record that names them changes in
  the same change.
- **Size.** Each of our files is one long page of boards, 1,100 to 1,300 px wide; a
  page taller than 8,000 px becomes more than one artboard. To be measured on the first
  move (`node scripts/board_fit.js` already renders every page).
- **The attached design system.** Each project carries
  `_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/`, the system Claude Design
  attaches; it is not ours and none of our boards loads it. A canvas keeps an installed
  system under `project/ds/<folder>/`; ours would be left out.
- **What is lost in every option:** the chats and the comments made in Claude Design.
  The decisions they led to are already in `docs/design/reviews/` and on the Jira stories.

## The options

### A. Move the projects into Claude and keep syncing from them

Arun downloads each project's .zip, then moves MyPaisa iOS v1, DS v1 and app v1 with Move
to Claude. Claude Design stays where the boards are drawn, now as Design canvases;
`design_sync.py` reads them with the Artifact tool instead of the connector, and the
repo stays the reviewed copy.

- **Arun:** about 15 minutes, once Move to Claude reaches his account.
- **Claude:** about 2.5 days. Rename to canvas-safe names (if the move does not) and
  change every record that names a board: about 1 day. `design_sync.py` on the Artifact
  tool, its selftest re-pointed, `claude-design.json` holding each canvas's url and
  version in place of etags: half a day. `/design-first` drawing on a canvas
  (`project/canvas.json`, publish under `project/`): half a day. Rules, skills, README,
  ARCHITECTURE, TECH_STACK, PLAN and the Confluence pages: half a day.
- **For:** Arun keeps a canvas to look at, comment on and pick from, inside Claude.
- **Against:** depends on a move that is rolling out gradually and whose conversion of our
  long multi-board pages is unknown until one is moved; a moved project cannot be moved
  back; while a canvas is the source, a hand edit there and an edit in the repo can cross.

### B. The repo mirror becomes the only record

The boards are written in `docs/design/` and nowhere else. They already render from the
repo (the board-fit gate and the Confluence previews do it); Arun sees each option round
as screenshots in the PR and on Confluence, or as one page published for him. The
connector, the etags and `design_sync.py`'s live half are retired; git is the history.
The Claude Design projects are downloaded and left to close.

- **Arun:** none, beyond downloading the three .zip files if he wants them.
- **Claude:** about 1 day: `/design-first` draws in the repo and publishes a preview
  page per round; `plan_sync.py` keeps the sha256 check and drops the etags;
  `design_sync.py` keeps its repo-side half; rules, skills and docs.
- **For:** nothing outside the repo to drift from; works the same after 14 Dec; every
  change is reviewed in a PR; the cheapest.
- **Against:** no canvas. No pan and zoom across a set of boards, no comments pinned to a
  board, no editing a board by hand on a canvas; design-first loses Claude Design's own
  prompts and preview renderer and leans on the repo's.

### C. The repo is the source, and each project is a Design canvas published from it (recommended)

The boards are written in the repo, as in B, then published one way to one Design canvas
per project with the Artifact tool. Arun looks, comments and picks on the canvas in
Claude. `design_sync.py check` compares each canvas's published files with the repo and
fails if either side moved: an edit Arun makes by hand on a canvas is pulled into the
repo (`read` writes it to disk byte for byte), never lost or overwritten.

- **Arun:** none; or 15 minutes if he would rather Move the projects (A's first step) and
  have their canvases adopted as the published copies.
- **Claude:** about 2 days. The rename and every record with it: about 1 day. Each
  canvas's `canvas.json` generated from the mirror (where each board sits), the three
  canvases created and filled: a quarter day. `design_sync.py` on the Artifact tool, both
  ways, and its selftest: half a day. `/design-first` and the records: a quarter to half a
  day.
- **For:** this is how a Design artifact is filled anyway (files published from a local
  folder), so the repo becoming that folder costs least and drifts least; it does not
  wait on Move to Claude or depend on how a move converts our pages; Arun keeps a canvas
  in Claude; the check, the selftest and the PR hook carry over with the connector
  swapped for the Artifact tool.
- **Against:** new canvases start without the old comments and chats (a move loses them
  too); the canvases' links are new, so every link to claude.ai/design changes once.

### Not choosing

After 14 Dec the projects are read-only, the connector refuses them, `design_sync.py
check` fails closed and blocks every PR, and the originals are deleted after the
retention period. The repo keeps every byte (this PR brought it up to date), so nothing
is lost, but no board can be redrawn until one of the above is in place.

## Recommendation

**C**, done before 1 Dec 2026 so a fortnight is left for anything a move or a rename
turns up. It keeps the boards in Claude, where Arun looks at them, and makes the repo the
one place they are written, which is what removes drift rather than detecting it. If Move
to Claude reaches the account first and converts a project cleanly, its canvas can serve
as C's published copy instead of a new one.

## Every place that assumes the old projects or links

Counted on 28 Oct 2026 (`claude.ai/design`, `claude-design`, `Claude Design`,
`/design-login` or `claude_design`), outside the mirrored boards themselves:

| Where | What assumes them |
| --- | --- |
| `.claude/rules/plan-sync.md` | The records table, rule 7, the before-PR row, the hooks, what the check fails on |
| `.claude/rules/independent-review.md` (lesson 9), `.claude/jira/taxonomy.md` (the `design` label) | "A board fix that cannot reach Claude Design"; boards in Claude Design |
| `.claude/skills/plan-sync/SKILL.md`, its `reference/trace-schema.md` | The Claude Design side, the mirror's etags |
| `.claude/skills/design-first/SKILL.md` | Drawing in the three projects with the `mcp__claude-design__*` tools, `copy_files`, `render_preview`, `list_comments`, giving Arun claude.ai/design links |
| `.claude/skills/autoship/SKILL.md` | `/plan-sync --design` before every PR |
| `.claude/jira-flow.json` | The `design-sync` gate |
| `.claude/hooks/plan_sync_hook.py`, `.claude/settings.json` | The PR hook runs `design_sync.py check` |
| `.github/workflows/plan-sync.yml` | The comment on what CI cannot reach |
| `scripts/design_sync.py` | The connector, headless; the project ids from the trace |
| `scripts/plan_sync.py` | The mirror's record (`claude-design.json`), board names per canvas |
| `scripts/confluence_docs.py`, `scripts/confluence_images.py` | `https://claude.ai/design/p/{id}?file={file}` links on every screen-area page, the hub and the sync page |
| `scripts/contrast_check.py`, `scripts/board_fit.js`, `scripts/board_fit_allow.json` | Board file names, and the copies of `tokens.css` and `ios.css` in each project |
| `docs/trace.json` | `claude_design` (the three ids and dirs), and 412 board references to 40 files |
| `docs/design/claude-design.json` | Every file's etag |
| `docs/design/README.md`, `README.md` | The three projects' links and how the mirror is kept |
| `ARCHITECTURE.md` (the overview's iOS app, §4, §9 twice and §13's stack table), `PLAN.md` (phase 0: the boards, the whole-wealth design, the kind icons), `TECH_STACK.md` (the build and design rows) | "Drawn in Claude Design", the project names |
| `docs/design/agent-journey.html`, `docs/design/market-agent.html` | Links to the boards |
| `docs/design/reviews/` (MA-101, 102, 103, 156, 158, 161, 193, 240, 241) and `review/` (MA-156, 161, 240 `fixed.json`) | The Claude Design links of each round; fixed-list checks that name board files |
| `docs/confluence/` (hub, phases 0 to 20, the screen areas, decisions, explainers, sync, the record pages, `stories.csv`) | Generated from the above; republished once the generator changes |
| `~/.claude/CLAUDE.md`, "Missing a capability" | Nothing: it is about the aitmpl catalog and names no design tool |

Under every option, the board files' new names and links change all of these in one
change (`.claude/rules/plan-sync.md`, rule 5), with the check and the selftest proving
none was missed.

## The pick

Not yet made. Asked on 28 Oct 2026. The work is MA-260 (To Do, estimated at C's two
days, due before 1 Dec 2026); it starts once Arun picks.
