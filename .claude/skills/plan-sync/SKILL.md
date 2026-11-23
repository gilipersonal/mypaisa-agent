---
name: plan-sync
description: Keep MyPaisa's plan, designs, Jira, Confluence and code in step. Compare docs/trace.json with Jira (keys, parents, labels, status, the phase epics' due dates; incrementally, from docs/jira-sync.json, or all of it with --all), with the board files the trace cites in docs/design/ (their files and board names) and with the Confluence space mypaisaa-agent (pages, versions, read-back hashes, board previews); publish the pages rendered from the repo, fix or file every drift in one table, and render docs/TRACE.md; plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). Use before starting a story ("start MA-n", "pick up MA-n", /jira-flow:work), after any planning or design round, when a phase, story or board is added or changed, or when asked "is the plan in sync", "check drift", "sync design and Jira".
---

# Plan sync

The rule is `.claude/rules/plan-sync.md`; the trace's schema is
`reference/trace-schema.md` in this skill. This skill is the half of the
check that needs Jira and Confluence; `scripts/plan_sync.py` is the
repo-side half and runs as a gate.

Arguments: `MA-<n>` (one story, before it starts), none (the default: Jira
read incrementally, Confluence and the repo in full), `--all` (the full
sweep, Jira included: weekly, or when unsure), `--jira`, `--design` or
`--confluence` (one side only).

Since MA-303, plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). Arun, 2 Nov 2026: "All the 6 checks currently run on docs/design.
Lets stop that... Plan Sync is for keeping the Jira, confluence and
implementation in sync. We can keep that but it needs to faster and smart.
No need to any check on prototype v5." What stays of the designs is the
trace's link to them: a cited board file exists, its folder exists, its
board name is one of its canvas's titles, and a UI story has a board before
it starts. A board edit can leave a Confluence preview stale until the
preview is composed again (2b): that is Confluence sync, not a check on the
board. The checks that left the boards come back as QA on the built code when
Arun asks: MA-304 for the web app, and the iOS app's after MA-165, with no
story yet.

Ids: Jira cloudId `81c51173-bbea-4905-bbc5-1a880fa348bb`, project `MA`,
transitions in `.claude/jira-flow.json`. The board folders in
`docs/trace.json` under `claude_design`, a name kept from when they were
copies of Claude Design's projects (`ios`: MyPaisa iOS v1, the app's screens
since MA-161; `ds`: MyPaisa DS v1; `app`: MyPaisa app v1, the web app's
browser boards, its spec, beside the superseded Mini App and Telegram boards).
Load tools with ToolSearch: `mcp__atlassian__searchJiraIssuesUsingJql`,
`mcp__atlassian__editJiraIssue`, `mcp__atlassian__createJiraIssue`,
`mcp__atlassian__addOrEditJiraIssueComment` (the boards are read by
`scripts/plan_sync.py`, offline, no tool to load), and for Confluence (space `mypaisaag`, id
`196872`) `mcp__atlassian__getConfluenceContent`,
`mcp__atlassian__createConfluenceContent`,
`mcp__atlassian__updateConfluenceContent` and `mcp__atlassian__executeWrite`
(`createConfluenceAttachment`).

## 0. Where you are

- Run on the story's branch (`MA-<n>-...`), never on `main`; with no story
  branch, create the sync task first (`/jira-flow:plan`) or report only.
- Run `python3 scripts/plan_sync.py check` and keep its output: it is the
  repo-side drift. On a story branch, also run
  `python3 scripts/plan_sync.py pr-files`: it lists the product files the
  branch changes (committed, uncommitted and untracked, under `web/`, `ios/`,
  `backend/`, `infra/`) that another story's `code` claims, or no story claims.

## 1. Jira against the trace

Jira is read incrementally (MA-303). `docs/jira-sync.json` records the last
sync's time, the keys still drifting (`pending`), and per key a short hash of
what Jira said (summary, parent, labels, status, due date) and of the
trace's row.

1. `python3 scripts/plan_sync.py jira-sync query` prints the JQL to run,
   and saves it:
   `project = MA AND (updated >= "<the day before the last sync>" OR key in
   (<pending, and rows changed in the repo since>))`, or the full
   `project = MA ORDER BY key ASC` when there is no last sync, the list would
   be long, or `--all` is given. For one story, `key = MA-<n>`. Note the time
   before the query runs.
2. Run it (`searchJiraIssuesUsingJql`, fields summary, status, issuetype,
   parent, labels, duedate, `responseFields` limited to those, every page) and
   write the issues to a scratch file as a JSON list of `{key, summary,
   parent, labels, status, duedate}` (`parent` the parent's key).
3. `python3 scripts/plan_sync.py jira-sync compare <file>` (add `--all` on
   the full sweep, so a trace key Jira lacks is reported too) prints the
   drift table below, rows in key order. Fix each row as the table says.
4. When fixed, `python3 scripts/plan_sync.py jira-sync record <file> --at
   <the time noted in 1>` (with `--all` on the full sweep): clean issues get
   their hashes, drifting ones stay in `pending` and are read again next
   time, and `last_sync` moves on only when the file answers the query `query`
   saved; a narrower read, such as one story's `key = MA-<n>`, records only
   its own keys and never moves `last_sync` (lesson 43). Commit `docs/jira-sync.json` with the
   trace.

`/plan-sync --all` is the full sweep: weekly, or whenever a sync was missed
or the record is in doubt. Only it finds a trace row whose issue is gone.

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

## 2. The boards

The boards are drawn in the repo and nowhere else, and git is their only
record (rule 7, MA-260, MA-296). The MyPaisa Boards Artifact is built by
`scripts/boards_page/build.py` and published again whenever a board changes,
then recorded with `python3 scripts/artifacts_sync.py record "MyPaisa Boards"
<version>`; check fails while any artifact in `docs/design/artifacts.json` is
older than its sources (MA-324). `python3 scripts/plan_sync.py check` checks
only the trace's link to them: each cited board file exists, each folder
under `claude_design` exists, and each board name is one of its canvas's
titles; plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). Arun judges the boards by
eye in each design round. Then, by hand, against the branch's changes
(`git diff main --stat -- docs/design/`):

| Found | Do |
| --- | --- |
| A board file changed or new | Read its diff. If nobody can say where it came from, ask Arun. Read its boards' notes (each board names its Jira keys) and update those rows' `boards`; a new file's boards are mapped to rows the same way |
| A board file deleted | Ask Arun whether it was meant. If it was, every row that names its boards is changed in the same change (check refuses a cited board that is gone) |
| A board whose note names a key not in the trace | Report it; fix the note or the trace |

Map only; never redraw a board from this skill. Designs change
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
     Then read the page back: save getConfluenceContent's whole reply (detail
     full, html) to a scratch file, the JSON exactly as it came, not just its
     body, and record it:
     `python3 scripts/confluence_docs.py set-readback <slug> <file>`. The
     check refuses a page whose read-back differs from what was sent, so a
     publish that Confluence changed or dropped is caught, and a page
     published but not read back fails the check (MA-303; pages published
     before the receipts are notes, lesson 44).
     Big pages are best sent by sub-agents, a few pages each, each given the
     file paths and ids; check afterwards that every page in `pending` is
     gone.
3. `python3 scripts/confluence_docs.py check` is clean.

### Publish in parallel, as much as possible

Arun, 23 Nov 2026 (MA-301): "save this as a rule / skill that confluence publish will be done as much parallel as
possible". A publish is split into lanes that run at the same time; only the recording is serial, because
`docs/confluence.json` is one file and two writers would lose each other's entries.

- **Lanes do the sending, the coordinator does the recording.** A sub-agent uploads or publishes and returns what it
  got (a preview's `fileId`, a page's new version and the path of its saved read-back). The coordinator alone runs
  `set-image`, `set-page`, `set-readback` and `set-database`, one after another. No lane runs `confluence_docs.py`
  or edits a repo file.
- **Capture once, compose once.** One `capture_boards.js` run for every stale preview (its want-list built from
  `pending`'s images and `wanted_images`), then one `images` run. If the pinned playwright-core's Chromium is not on
  the machine, point `PLAYWRIGHT_CORE` at a local playwright-core whose Chromium is (MA-301 used 1.63.0 with
  `chromium_headless_shell-1243`), rather than downloading a browser.
- **Uploads in parallel lanes,** about 25 to 30 previews each, split by page so one page's previews stay in one lane.
  Each lane: `createConfluenceAttachment` per file, run its `uploadCommand` as returned (the token in that one command
  and nowhere else), and return `{name, page_id, fileId}`. Record each lane's ids as it lands, then `write`.
- **Pages publish as soon as their content is final.** A page whose previews are all recorded (or that shows none)
  does not wait for the other lanes' uploads: after `write`, start its publish lane at once.
- **Publish lanes balanced by bytes,** about 200 KB of page per lane, the biggest pages first, six lanes for a
  full-site publish. Each lane, per page: read the live version (`detail: summary`) and stop if it is above the one
  recorded (an edit made in Confluence, carried back by hand); send `docs/confluence/<slug>.html` exactly, with its
  title and a `versionMessage` naming the story; read it back (`detail: full`, html) and save the whole reply,
  copying the harness's saved output file when the reply was too big to show. Each lane gets `reference/publish-lane-brief.md` (in this skill) and its list.
- **The coordinator works while the lanes run:** the story explorer database (`databases`), the gates that do not
  read Confluence (`pr-files`, the story's own gates), the artifacts, the commit. Then it records each lane's
  results as they land, and runs `pending` and `check` once all have.
- **A lane that fails one page** reports it and goes on; the coordinator re-runs that page alone. Never resend a
  whole lane for one page.

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
  will draw it), a cited board file or board name that is gone (fix the row,
  or redraw the board through `/design-first`), or a code path that matches
  nothing.
- Fix what `pr-files` reports: a file another story claims is either added
  to this story's `code` (shared work) or moved to its own story's branch; a
  file no story claims is added to this story's `code`.
- `python3 scripts/plan_sync.py selftest` runs only when its code or its
  fixtures changed: it hashes `scripts/plan_sync.py`, `confluence_docs.py`,
  `confluence_record.py`, `roadmap.py`, `.claude/hooks/plan_sync_hook.py` and
  the files its cases read, and reuses a pass recorded in
  `review/.cache/plan_sync_selftest.json` in the last 7 days
  (`selftest REUSED`). `selftest --force` always runs it.

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
  then set `picked`.
- `picked`: build to the boards; list them in the plan for `/jira-flow:work`.

## 5. Report

Drift is reported as one table, Jira, Confluence, the boards and the repo
together:

| Item | Field | Repo | Jira or Confluence | Wins, and why | Fix |
| --- | --- | --- | --- | --- | --- |
| MA-20 | status | To Do | Done | Jira: it holds who does what and its status | copied into the row |
| MA-9 | due date | 2027-01-06 | 2026-12-20 | the roadmap: dates come from estimates (rule 9) | due date set in Jira |
| phase-05 | page | v14, sha 3f2a | v15, edited there | the repo: Confluence is generated (rule 8) | the edit carried into PLAN.md, page republished |

`jira-sync compare` prints the Jira rows in this shape; add the Confluence,
board and repo rows to it. Then one line each: what was fixed, what was
filed (keys), what needs Arun (a missing issue to confirm, a deleted file).
Commit the trace and `TRACE.md` on
the story branch as `MA-<n>: Sync the trace with Jira and the boards`; they ship
with that story's PR.
