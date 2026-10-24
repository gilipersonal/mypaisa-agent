---
name: plan-sync
description: Keep MyPaisa's plan, designs and Jira in step. Compare docs/trace.json with Jira (keys, parents, labels, status) and with the Claude Design projects MyPaisa app v1 and MyPaisa DS v1 (files, etags, boards), copy changed boards into the repo, fix or file every drift, and render docs/TRACE.md. Use before starting a story ("start MA-n", "pick up MA-n", /jira-flow:work), after any planning or design round, when a phase, story or board is added or changed, or when asked "is the plan in sync", "check drift", "sync design and Jira".
---

# Plan sync

The rule is `.claude/rules/plan-sync.md`; the trace's schema is
`reference/trace-schema.md` in this skill. This skill is the half of the
check that needs Jira and Claude Design; `scripts/plan_sync.py` is the
repo-side half and runs as a gate.

Arguments: `MA-<n>` (one story, before it starts), `--all` (everything; the
default), `--jira` or `--design` (one side only).

Ids: Jira cloudId `81c51173-bbea-4905-bbc5-1a880fa348bb`, project `MA`,
transitions in `.claude/jira-flow.json`. Claude Design projects in
`docs/trace.json` under `claude_design` (`app`: MyPaisa app v1, `ds`: MyPaisa
DS v1). Load tools with ToolSearch: `mcp__atlassian__searchJiraIssuesUsingJql`,
`mcp__atlassian__editJiraIssue`, `mcp__atlassian__createJiraIssue`,
`mcp__atlassian__addOrEditJiraIssueComment`, `mcp__claude-design__list_files`,
`mcp__claude-design__read_file`.

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

Never delete or close an issue. Creating, editing and commenting need no
asking in this repo (`.claude/rules/ship-autopilot.md`).

## 2. Claude Design against the mirror

List both projects with depth -1 and compare with
`docs/design/claude-design.json`.

| Found | Do |
| --- | --- |
| A file whose etag moved | Read it in full (page past 256 KiB with offset/limit), decode `&amp;` `&lt;` `&gt;`, write the repo copy, record the new etag and bytes. Then read its boards' notes (each board names its Jira keys) and update those rows' `boards` |
| A new file | Copy it the same way, add it to the json, map its boards to rows |
| A file gone from Claude Design | Keep the repo copy, report it, and ask Arun whether it was meant |
| A board whose note names a key not in the trace | Report it; fix the note or the trace |

Copy only; never write to Claude Design from this skill. Designs change
through `/design-first`.

## 3. The repo side

- Run `python3 scripts/plan_sync.py render`, then `check` again.
- Fix what the check reports: a missing section (fix the row, or the
  ARCHITECTURE heading if the doc changed), a cited key not traced (add the
  row), a UI row with no board (`todo` plus a note saying which design round
  will draw it).

## 4. For one story about to start (`MA-<n>`)

Run `python3 scripts/plan_sync.py start MA-<n>` after steps 1 to 3 for that
key, and say what it printed:

- `todo` with UI: stop. The story needs `/design-first` before any code.
- `planned`: run `/design-first` on its boards (2 or 3 options, Arun picks),
  then set `picked` and copy the board again.
- `picked`: build to the boards; list them in the plan for `/jira-flow:work`.

## 5. Report

One block: what drifted (Jira, Claude Design, repo), what was fixed, what was
filed (keys), what needs Arun (a missing issue to confirm, a deleted file).
Commit the trace, `TRACE.md` and mirror changes on the story branch as
`MA-<n>: Sync the trace with Jira and Claude Design`; they ship with that
story's PR.
