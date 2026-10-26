---
name: plan-sync
description: Keep MyPaisa's plan, designs, Jira, Confluence and code in step. Compare docs/trace.json with Jira (keys, parents, labels, status, the phase epics' due dates), with the Claude Design projects MyPaisa iOS v1, MyPaisa DS v1 and MyPaisa app v1 (files, etags, boards) and with the Confluence space mypaisaa-agent (pages, versions, board previews); copy changed boards into the repo, publish the pages rendered from the repo, fix or file every drift, and render docs/TRACE.md. Use before starting a story ("start MA-n", "pick up MA-n", /jira-flow:work), after any planning or design round, when a phase, story or board is added or changed, or when asked "is the plan in sync", "check drift", "sync design and Jira".
---

# Plan sync

The rule is `.claude/rules/plan-sync.md`; the trace's schema is
`reference/trace-schema.md` in this skill. This skill is the half of the
check that needs Jira and Claude Design; `scripts/plan_sync.py` is the
repo-side half and runs as a gate.

Arguments: `MA-<n>` (one story, before it starts), `--all` (everything; the
default), `--jira`, `--design` or `--confluence` (one side only).

Ids: Jira cloudId `81c51173-bbea-4905-bbc5-1a880fa348bb`, project `MA`,
transitions in `.claude/jira-flow.json`. Claude Design projects in
`docs/trace.json` under `claude_design` (`ios`: MyPaisa iOS v1, the app's
screens since MA-161; `ds`: MyPaisa DS v1; `app`: MyPaisa app v1, the web app's
browser boards, its spec, beside the superseded Mini App and Telegram boards). Load tools with ToolSearch: `mcp__atlassian__searchJiraIssuesUsingJql`,
`mcp__atlassian__editJiraIssue`, `mcp__atlassian__createJiraIssue`,
`mcp__atlassian__addOrEditJiraIssueComment`, `mcp__claude-design__list_files`,
`mcp__claude-design__read_file`, and for Confluence (space `mypaisaaag`, id
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

## 2. Claude Design against the mirror

List every project under `claude_design` with depth -1 and compare with
`docs/design/claude-design.json`.

| Found | Do |
| --- | --- |
| A file whose etag moved | Read it in full (page past 256 KiB with offset/limit), decode `&amp;` `&lt;` `&gt;`, write the repo copy, record the new etag, bytes and sha256. Then read its boards' notes (each board names its Jira keys) and update those rows' `boards` |
| A new file | Copy it the same way, add it to the json, map its boards to rows |
| A file gone from Claude Design | Keep the repo copy, report it, and ask Arun whether it was meant |
| A board whose note names a key not in the trace | Report it; fix the note or the trace |

Copy only; never write to Claude Design from this skill. Designs change
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
     mirrored file to its boards), then
     `python3 scripts/confluence_docs.py images <captures> <previews>`. Per
     page, `createConfluenceAttachment` returns a short-lived media token;
     upload each file with it to
     `https://duttaarun2015.atlassian.net/wiki/api/v2/content/<page id>/attachment-upload`
     (the `uploadCommand` it returns), and record each returned `fileId`:
     `python3 scripts/confluence_docs.py set-image <name> <fileId> contentId-<page id>`.
     Never write the token to a file or a log.
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
  define (the right name, or the tool added to §8 first); fix the board in
  Claude Design, through `/design-first`, then copy it again; never edit the
  mirrored copy, whose bytes and sha256 must match Claude Design's).

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
  then set `picked` and copy the board again.
- `picked`: build to the boards; list them in the plan for `/jira-flow:work`.

## 5. Report

One block: what drifted (Jira, Claude Design, Confluence, repo), what was fixed, what was
filed (keys), what needs Arun (a missing issue to confirm, a deleted file).
Commit the trace, `TRACE.md` and mirror changes on the story branch as
`MA-<n>: Sync the trace with Jira and Claude Design`; they ship with that
story's PR.
