# The trace: `docs/trace.json`

One file ties every planned piece of work to where it is described and where
it is drawn. `scripts/plan_sync.py check` reads it against the repo;
`/plan-sync` reads it against Jira and Claude Design. `docs/TRACE.md` is
rendered from it (`python3 scripts/plan_sync.py render`) and never edited by
hand.

```json
{
  "version": 1,
  "updated": "2026-10-24",
  "claude_design": {
    "app": {"id": "0bf02ae1-2de2-42a8-98ff-96046b2a26d7", "name": "MyPaisa app v1", "dir": "docs/design/app-v1"},
    "ds":  {"id": "2f7310cd-e56a-4d13-8339-8fc637249c9a", "name": "MyPaisa DS v1",  "dir": "docs/design/ds-v1"},
    "ios": {"id": "43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8", "name": "MyPaisa iOS v1", "dir": "docs/design/ios-v1"}
  },
  "phases": [
    {"phase": 0, "epic": "MA-9", "title": "Prerequisites", "plan_heading": "## Phase 0 — Prerequisites"}
  ],
  "items": [
    {
      "key": "MA-149",
      "type": "Story",
      "epic": "MA-14",
      "phase": 5,
      "summary": "The Audit page opens the original file behind each change ...",
      "status": "To Do",
      "labels": ["design"],
      "arch": ["4.6", "9.3"],
      "ui": true,
      "design": "planned",
      "boards": [
        {"project": "ios", "file": "iPhone audit and activity.dc.html", "board": "iPhone · Audit, a change from a file"}
      ],
      "notes": ""
    }
  ]
}
```

## Fields

| Field | Meaning |
| --- | --- |
| `phases[]` | One row per PLAN.md phase: its number, its Jira epic, its title, and the exact PLAN.md heading line |
| `items[].key` | The Jira key. Every story, task and bug under a phase epic is listed; epics are listed only in `phases` |
| `type` | `Story`, `Task` or `Bug`, as in Jira |
| `epic`, `phase` | The parent epic and its phase number; they must agree with `phases` |
| `summary`, `status`, `labels` | As in Jira when the trace was last synced (`/plan-sync` refreshes them). `labels` holds `design` exactly when `ui` is true |
| `arch` | The ARCHITECTURE.md sections the work follows, as numbers (`"4.6"`, `"19.7"`, `"22"`); each must be a heading |
| `ui` | `true` when the work changes what a member sees: a screen, card, button, flow, chart or notification in the iOS app, or a page of the web app |
| `design` | `none` (no UI), `planned` (a board exists, not yet put through design-first's options round), `picked` (Arun picked an option; the board is the spec), `todo` (UI with no board yet; a failure unless `notes` says why) |
| `boards[]` | Where the screens are drawn: `project` is a key of `claude_design`, `file` a file in that project (mirrored under its `dir`), `board` the board's name on the canvas (`iPhone · Home, household`, `Foldable · Open`, `Browser · Audit`) |
| `notes` | Anything a reader needs: why a UI item has no board yet, which option was picked, what supersedes what |
| `open` | Optional list of questions that must be settled before the work starts, such as a board that disagrees with the docs. `start` refuses while it is not empty; settle it with Arun, change the boards, docs and Jira together, then clear it, and say in the notes `Settled: <the question's words up to its first colon>` with the answer (the review ledgers look for it) |
| `undrawn` | Optional list of screens the story needs that have no board yet, when some of its screens are drawn, or board fixes made but not yet in Claude Design (each naming the issue that lands them, such as MA-160). `start` refuses while it is not empty; draw them (MA-158, `/design-first`), add their boards, then clear each item, and say in the notes `Drawn: <the item, as it was listed>` with the board that draws it (the review ledgers look for it) |
| `code` | Optional list of the repo paths that build the story, globs allowed (`web/src/lib/chat/**`, `ios/MyPaisa/Chat/`, `src/mypaisa/agent/tools.py`). Required once a Story is In Review or Done; every path must match something. A file under `web/`, `ios/`, `src/` or `infra/` that no story claims is reported (MA-228) |
| `others[]` | Issues with no phase epic (repo tooling such as MA-1 to MA-8, a superseded task): `key`, `type`, `summary`, `status`, `notes`. Listed so the docs may cite them; they carry no sections or boards |

## The mirror: `docs/design/claude-design.json`

Every file in every Claude Design project under `claude_design`, except the project's `.thumbnail` preview image, is copied, decoded, into its `dir`
with the etag Claude Design reported when it was copied:

```json
{"ios": {"files": {"iPhone chat.dc.html": {"etag": "1792971901594793", "bytes": 96715, "sha256": "…"}}},
 "ds":  {"files": {"tokens.css": {"etag": "1792972941065279", "bytes": 24316, "sha256": "…"}}},
 "app": {"files": {"Browser.dc.html": {"etag": "1792976170240588", "bytes": 55222, "sha256": "…"}}}}
```

A file whose Claude Design etag differs from the recorded one has changed
there and must be copied again (and its boards checked against the trace).
`python3 scripts/design_sync.py pull` copies and records every such file;
`check` fails while any file is new, changed or gone on either side (MA-259).

## The roadmap: `docs/roadmap.json`

Every traced story's estimate in build days (`estimates`, keyed by Jira key; `0` for work already done), the
calendar's settings (`start`, `buffer`, `parallel`, `bank_holidays`, `breaks`, and per-phase rules: `not_before`,
`on_demand`), and the `schedule` worked out from them by `python3 scripts/roadmap.py write`: per phase its build days,
Arun's days (tasks labelled `manual`), working days, start and target end. PLAN.md's Timeline table between
`<!-- roadmap:start -->` and `<!-- roadmap:end -->` is rendered from the schedule, and each phase epic's due date in
Jira is its target end (MA-228).

## Confluence: `docs/confluence.json` and `docs/confluence/`

`docs/confluence/<page>.html` is each page exactly as published, rendered by `python3 scripts/confluence_docs.py write`.
`docs/confluence.json` records the space, then per page its Confluence `id`, the `version` last published and the
`sha256` of the HTML published (empty until the page is first published), and per board preview its owning `page`, its
`media` id and `collection`, and the `source` hash of the boards and layout it was composed from (MA-228).
