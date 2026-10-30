---
name: plan-sync
description: Keep MyPaisa's plan, designs, Jira, Confluence and code in step. Compare docs/trace.json with Jira (keys, parents, labels, status, the phase epics' due dates), with the boards in docs/design/ (MyPaisa iOS v1, DS v1 and app v1: each file against its record in claude-design.json, and the MyPaisa Boards Artifact's stamp) and with the Confluence space mypaisaa-agent (pages, versions, board previews); record changed boards and republish the Boards Artifact, publish the pages rendered from the repo, fix or file every drift, and render docs/TRACE.md. Use before starting a story ("start MA-n", "pick up MA-n", /jira-flow:work), after any planning or design round, when a phase, story or board is added or changed, or when asked "is the plan in sync", "check drift", "sync design and Jira".
---

# Plan sync

The rule is `.claude/rules/plan-sync.md`; the trace's schema is
`reference/trace-schema.md` in this skill. This skill is the half of the
check that needs Jira, Confluence and the Artifact tool; `scripts/plan_sync.py`
and `scripts/design_sync.py` are the repo-side half and run as gates.

Arguments: `MA-<n>` (one story, before it starts), `--all` (everything; the
default), `--jira`, `--design` or `--confluence` (one side only).

Ids: Jira cloudId `81c51173-bbea-4905-bbc5-1a880fa348bb`, project `MA`,
transitions in `.claude/jira-flow.json`. The board folders in
`docs/trace.json` under `claude_design`, a name kept from when they were
copies of Claude Design's projects (`ios`: MyPaisa iOS v1, the app's screens
since MA-161; `ds`: MyPaisa DS v1; `app`: MyPaisa app v1, the web app's
browser boards, its spec, beside the superseded Mini App and Telegram boards).
The MyPaisa Boards Artifact: https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g.
Load tools with ToolSearch: `mcp__atlassian__searchJiraIssuesUsingJql`,
`mcp__atlassian__editJiraIssue`, `mcp__atlassian__createJiraIssue`,
`mcp__atlassian__addOrEditJiraIssueComment` (the boards are read by
`scripts/design_sync.py`, offline, no tool to load), and for Confluence (space `mypaisaag`, id
`196872`) `mcp__atlassian__getConfluenceContent`,
`mcp__atlassian__createConfluenceContent`,
`mcp__atlassian__updateConfluenceContent` and `mcp__atlassian__executeWrite`
(`createConfluenceAttachment`).

## 0. Where you are

- Run on the story's branch (`MA-<n>-...`), never on `main`; with no story
  branch, create the sync task first (`/jira-flow:plan`) or report only.
- Run `python3 scripts/plan_sync.py check` and keep its output: it is the
  repo-side drift.

## 1. Jira against the trace

Query `project = MA ORDER BY key ASC` (or `key = MA-<n>`), fields summary,
status, issuetype, parent, labels, `responseFields` limited to those, every
page.

| Found | Do |
| --- | --- |
| An issue under a phase epic that is not in the trace | Add its row: epic, phase, sections from its description, `ui`, `design` (`todo` with a note if it has UI and no board) |
| A trace row whose key is not in Jira | Report it; never invent the issue. If PLAN.md describes it, create the issue from the taxonomy template and fix the row's key |
| A parent that disagrees with the trace's phase | PLAN.md decides the phase: move the issue's parent in Jira, comment why |
| Summary, status or labels changed in Jira | Copy them into the row |
| `ui: true` without the `design` label, or the label on a `ui: false` row | Set the label in Jira to match the row; say which way in the report |
| A phase epic missing, or an epic whose PLAN phase is gone | Create or report, never delete |
| An epic's due date that differs from its phase's `end` in `docs/roadmap.json`'s schedule | Set the due date in Jira to the schedule's (an on-demand phase has none); the roadmap decides |

Never delete or close an issue. Creating, editing and commenting need no
asking in this repo (`.claude/rules/ship-autopilot.md`).

## 2. The boards against their record and the Boards Artifact

The boards are drawn in the repo and nowhere else (rule 7, MA-260). One
command compares them with their record, offline (the `design-sync` gate, the
PR hook and CI run it too):

```bash
python3 scripts/design_sync.py check
```

It reads every board folder under `claude_design` and
`docs/design/claude-design.json`, and fails on a board file whose bytes no
longer match its record, a file in a board folder the record does not list, a
recorded file missing, and a MyPaisa Boards Artifact published before the
record last changed (the stamp in `docs/design/boards-artifact.json`). Then,
by hand:

| Found | Do |
| --- | --- |
| A board file changed or new | Read its diff (`git diff`). If a design round drew it, `python3 scripts/design_sync.py record`; if nobody can say where it came from, ask Arun. Read its boards' notes (each board names its Jira keys) and update those rows' `boards`; a new file's boards are mapped to rows the same way |
| A recorded file missing | Ask Arun whether it was meant. If it was, `python3 scripts/design_sync.py record --drop <dir>/<file>` forgets it, and every row that names its boards is changed in the same change |
| The Boards Artifact older than the record | `python3 scripts/boards_page/build.py docs/design <out-dir>` (an out-dir outside the repo, such as the session's scratchpad); read the Boards Artifact with the Artifact tool (`action: read`, its URL), then publish `<out-dir>/index.html` to that URL with `root: docs/design` and `files` from `<out-dir>/files.json`; then `python3 scripts/design_sync.py published` |
| A board whose note names a key not in the trace | Report it; fix the note or the trace |

Record and publish only; never redraw a board from this skill. Designs change
through `/design-first`.

## 2b. Confluence against `docs/confluence.json`

The pages are generated (rule 8); this side publishes them and catches edits
made in Confluence.

1. For each page in `docs/confluence.json`, read its version
   (`getConfluenceContent`, `detail: summary`). A version above the one
   recorded means someone edited it there: read it (`detail: full`, html),
   say what changed, carry the change into the record it belongs to (the
   trace, PLAN, ARCHITECTURE, a decision record, the roadmap), never into
   `docs/confluence/` by hand; then it is republished below.
2. `python3 scripts/confluence_docs.py pending` lists what to do:
   - `create`: create the page under its parent's id (`contentWidth: wide`, a
     one-line placeholder body), then
     `python3 scripts/confluence_docs.py set-page <slug> <id> 1`.
   - `images`: previews to upload. When a board changed, capture the boards
     first: `node .claude/skills/plan-sync/scripts/capture_boards.js <repo> <want.json> <captures>`
     (`PLAYWRIGHT_CORE` names a playwright-core install; want.json maps each
     board file to its boards), then
     `python3 scripts/confluence_docs.py images <captures> <previews>`. Per
     page, `createConfluenceAttachment` returns a short-lived media token;
     upload each file with it to
     `https://duttaarun2015.atlassian.net/wiki/api/v2/content/<page id>/attachment-upload`
     (the `uploadCommand` it returns), and record each returned `fileId`:
     `python3 scripts/confluence_docs.py set-image <name> <fileId> contentId-<page id>`.
     Never write the token to a file or a log.
   - `databases`: the story explorer (`docs/confluence/stories.csv`, a
     create envelope). With no id, create it (`contentType: database`,
     `format: csv`, the file exactly, under the hub) and
     `set-database stories <id> published`. With an id, read its rows
     (`content_format: csv`), send the edit envelope that turns them into
     the file's rows (the database guide's edit workflow, `edit_entry` for
     changed rows, `add_entry` and `delete_entry` for the rest; the update
     needs `context.content` set to the CSV just read, or it is refused), then
     `set-database stories <id> published`. The server reads an `edit_entry`'s
     row number against the rows as they are before the batch, whatever the
     guide says about post-batch indices: put the edits first and the adds
     after them (MA-259, where post-batch numbers were refused as "Entry not
     found").
   - `apps`: the Maui apps (`roadmap-gantt` on the roadmap, `decision-cards`
     on the decisions page), made with `createConfluenceMauiApp` (or
     `editConfluenceMauiApp` once made) from
     `python3 scripts/confluence_docs.py app-prompt <name>` exactly, then
     `set-app <name> <maui id> <url>`. They cost Rovo credits and need
     Confluence's AI features on; until they are made the pages show the
     native cards and the still picture, and the check asks nothing.
     **Not made, by Arun's decision** (26 Oct 2026, MA-228): Confluence
     stays on the Free plan, where AI is off, and the native decision cards
     and the still roadmap picture stand in for the apps. Leave the `apps`
     list in `pending` alone, and make them only if Arun moves Confluence to
     a paid plan and asks for them.
   - then `python3 scripts/confluence_docs.py write`, and `pending` again.
   - `publish`: for each page, read it (`getConfluenceContent`, `detail: full`)
     for its snapshot token, send `docs/confluence/<slug>.html` exactly as
     the body (`format: html`, `versionMessage` naming the story), and
     record what is live:
     `python3 scripts/confluence_docs.py set-page <slug> <id> <new version> published`.
     Big pages are best sent by sub-agents, a few pages each, each given the
     file paths and ids; check afterwards that every page in `pending` is
     gone.
3. `python3 scripts/confluence_docs.py check` is clean.

Never delete a page or an attachment. A page the generator no longer makes
is reported and archived by Arun.

## 3. The repo side

- Run `python3 scripts/roadmap.py write` when an estimate, a phase or a story
  changed (every traced story needs an estimate in `docs/roadmap.json`), then
  `python3 scripts/plan_sync.py render`, `python3 scripts/confluence_docs.py write`,
  and `check` again.
- Fix what the check reports: a missing section (fix the row, or the
  ARCHITECTURE heading if the doc changed), a cited key not traced (add the
  row), a UI row with no board (`todo` plus a note saying which design round
  will draw it), a board date with a wrong weekday or a board motion role on
  the wrong element (`fade` in place of `label` or `dot`, or `!important` on a
  chart label's or dot's own transform), or a tool ARCHITECTURE §8 does not
  define (the right name, or the tool added to §8 first). A board is fixed in
  its folder, through `/design-first`, then recorded with
  `python3 scripts/design_sync.py record`.

## 4. For one story about to start (`MA-<n>`)

Run `python3 scripts/plan_sync.py start MA-<n>` after steps 1 to 3 for that
key, and say what it printed:

- `open` questions: stop. Ask Arun to settle each one, then change the
  boards, the docs and the story to match, clear it from `open`, and say
  `Settled: <the question's words up to its first colon>` in the row's notes with the answer.
- `undrawn` screens: stop. Draw them first (`/design-first`, MA-158), or land
  the pending fix an item names (MA-160); add their boards to the row, clear
  each item, and say `Drawn: <the item, as it was listed>` in the notes. The review
  ledgers look for these two notes.
- `todo` with UI: stop. The story needs `/design-first` before any code.
- `planned`: run `/design-first` on its boards (2 or 3 options, Arun picks),
  then set `picked` and record the boards (`python3 scripts/design_sync.py record`).
- `picked`: build to the boards; list them in the plan for `/jira-flow:work`.

## 5. Report

One block: what drifted (Jira, the boards, Confluence, repo), what was fixed, what was
filed (keys), what needs Arun (a missing issue to confirm, a deleted file).
Commit the trace, `TRACE.md`, the board record and the Boards Artifact's stamp on
the story branch as `MA-<n>: Sync the trace with Jira and the boards`; they ship
with that story's PR.
