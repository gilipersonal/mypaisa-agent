# Plan sync: the plan, the designs and Jira move together

Arun, 24 Oct 2026 (MA-155): "All the design and jira planned phase items should
be in sync so that when I start the work it does [not] drift."

Four records describe the same planned work. They are kept in step, and a
check says so before any story starts and before any PR.

| Record | Where | Holds |
| --- | --- | --- |
| The plan | `PLAN.md` (phases), `ARCHITECTURE.md` (how), `TECH_STACK.md` (with what) | What is built, in which phase, to which design |
| Jira | project MA: a phase epic per PLAN phase, a story or task per deliverable | Who does what, and its status |
| The designs | Claude Design: MyPaisa app v1 (screens, Prototype) and MyPaisa DS v1 (the system); copied into `docs/design/app-v1/` and `docs/design/ds-v1/` with their etags in `docs/design/claude-design.json` | What a member sees |
| The trace | `docs/trace.json`, rendered to `docs/TRACE.md` | Which story follows which ARCHITECTURE section and which boards |

The schema is `.claude/skills/plan-sync/reference/trace-schema.md`.

## The rules

1. **Every PLAN phase is an epic; every deliverable is a story or task.** A
   bullet added to PLAN.md gets its Jira issue and its trace row in the same
   change. A Jira issue created on its own gets its PLAN bullet and trace row
   the same day.
2. **Every story with UI has a board before it starts.** `ui: true` with
   `design: "todo"` may sit in the backlog with a note saying why; it may not
   start. `python3 scripts/plan_sync.py start MA-<n>` refuses it.
3. **A board is planned until Arun picks.** Boards drawn ahead of their story
   are `planned`. When the story starts, `/design-first` puts them through its
   options round; the pick sets `picked`, and only then is code written.
4. **Picked boards are the spec.** If the build has to differ, change the board
   first (and the trace), then the code. Never let the code be the only place
   a design decision lives.
5. **Change one, change all, in one PR.** A change to a planned screen updates
   the board in Claude Design, its repo copy and etag, the trace row, the
   ARCHITECTURE section and the Jira story together. A change to scope updates
   PLAN, ARCHITECTURE, the trace and Jira together.
6. **Claude Design is edited there, copied here.** Boards are drawn in Claude
   Design; the repo copy is refreshed by `/plan-sync` whenever an etag moves.
   The repo copy is what a PR reviews and what the check reads.

## When to run what

| When | Run | What must be true |
| --- | --- | --- |
| Starting a story (`/jira-flow:work`, or by hand) | `python3 scripts/plan_sync.py start MA-<n>`, then `/plan-sync MA-<n>` | The story is traced, its sections exist, its boards exist and are current; a UI story's design is `planned` (run `/design-first`) or `picked` |
| Before every PR | the `plan-sync` gate in `.claude/jira-flow.json` (`python3 scripts/plan_sync.py check`) | No drift; `docs/TRACE.md` is rendered |
| On every PR, in CI | `.github/workflows/plan-sync.yml` | The same check |
| After planning (a new phase, a new story, a design round) | `/plan-sync` | Jira, Claude Design and the trace agree; drift is fixed or filed |
| Weekly, or when unsure | `/plan-sync --all` | The whole backlog and both Claude Design projects agree with the trace |

## What the check fails on

- A PLAN phase with no trace phase, or a trace phase whose heading is not in PLAN.md.
- A story whose epic is not a phase epic, or whose phase disagrees with its epic.
- An ARCHITECTURE section the trace cites that does not exist.
- A key cited in ARCHITECTURE, PLAN, TECH_STACK or the READMEs that is not in the trace.
- A UI story with no board and no note; a `planned` or `picked` story with no board.
- A board file missing from the repo mirror or from `claude-design.json`; a mirrored file whose size no longer matches.
- `docs/TRACE.md` not rendered from the current trace.

Jira-side drift (a key, parent, label or status that differs from the trace)
and Claude Design drift (an etag that moved) need their MCP tools, so
`/plan-sync` checks those.
