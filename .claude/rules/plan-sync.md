# Plan sync: the plan, the designs, Jira, Confluence and the code move together

Arun, 24 Oct 2026 (MA-155): "All the design and jira planned phase items should
be in sync so that when I start the work it does [not] drift." And on 26 Oct
2026 (MA-228): the Confluence documents, the Jira stories, the Claude designs
and the actual code stay the same and do not drift, in this repo only; and
whenever a new design or feature is discussed, it gets its Jira issue and its
feature or phase document in Confluence.

And on 2 Nov 2026 (MA-303): "All the 6 checks currently run on docs/design.
Lets stop that... Plan Sync is for keeping the Jira, confluence and
implementation in sync. We can keep that but it needs to faster and smart.
No need to any check on prototype v5." So plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). What stays
of the boards is the trace's link to them (a cited file and its board name
exist, a UI story has a board before it starts); plan-sync keeps Jira,
Confluence and the code in step. A board edit can leave a Confluence preview
stale until the preview is composed again: that is Confluence sync, not a
check on the board.

These records describe the same planned work. They are kept in step, and a
check says so before any story starts and before any PR.

| Record | Where | Holds |
| --- | --- | --- |
| The plan | `PLAN.md` (phases), `ARCHITECTURE.md` (how), `TECH_STACK.md` (with what), `docs/roadmap.json` (each story's estimate, each phase's dates) | What is built, in which phase, to which design, and when |
| Jira | project MA: a phase epic per PLAN phase, a story or task per deliverable; each phase epic's due date is its target end | Who does what, its status, and when |
| The designs | The repo, three board folders: `docs/design/ios-v1/` (MyPaisa iOS v1, the app's screens, from MA-161), `docs/design/ds-v1/` (MyPaisa DS v1, the system and its iOS kit) and `docs/design/app-v1/` (MyPaisa app v1, the web app's browser boards, its spec; its Mini App and Telegram boards are the superseded record), git their only record; a record that is not a board set in its own folder (`docs/design/prototype-v5/`). Arun sees each design round's options as a private Claude Artifact, or as a local page for a round run in Antigravity | What a member sees |
| The trace | `docs/trace.json`, rendered to `docs/TRACE.md` | Which story follows which ARCHITECTURE section and which boards, and which code builds it |
| Confluence | Space mypaisaa-agent: the hub, the roadmap, a page per phase, a page per screen area, the design decisions, the explainers. Rendered by `scripts/confluence_docs.py` into `docs/confluence/`; page ids, versions and previews in `docs/confluence.json` | The plan as one readable tree, phase by phase and screen by screen |
| The code | `web/`, `ios/`, `src/`, `infra/`, named per story in the trace's `code` paths | What was built, traced to its story |

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
   the board in its folder, the
   trace row, the ARCHITECTURE section and the Jira story together. A change to
   scope updates PLAN, ARCHITECTURE, the trace and Jira together.
6. **A disagreement is an open question, not a guess.** When a board, a doc
   and Jira say different things and the plan does not settle it, record it
   in the row's `open` list and as a comment on the story. `start` refuses
   the story until Arun settles it and every record is changed to match;
   then clear it and say in the row's notes `Settled: <the question's words up
   to its first colon>` with the answer (a drawn `undrawn` item likewise gets
   `Drawn: <the item, as it was listed>`). When the plan does settle it
   (ARCHITECTURE.md says so plainly), change the board to match the plan
   instead, and name the disagreement and the plan's answer in the notes.
7. **Boards are drawn in the repo; each round is shown as an Artifact.**
   Boards are drawn and edited in their folders under `docs/design/` and
   nowhere else; git is their only record, and a PR reviews them. There is
   no record file to update and no whole-set Artifact to republish (MA-296,
   Arun, 30 Oct 2026: "I dont need claude-design sync anymore"):
   `python3 scripts/plan_sync.py check` finds the boards the trace cites on
   disk; plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303).
   Arun reviews each `/design-first` round as a private Claude Artifact: the
   round publishes its options as one and gives him its link. A round run in
   Google Antigravity, which cannot publish a Claude Artifact, shows the same
   options page on localhost instead, and its `decision.md` names the page
   (MA-297, Arun, 30 Oct 2026). A board is
   linked by its file in the repo (on GitHub, in Confluence). The MyPaisa
   Boards Artifact, `scripts/design_sync.py`, `scripts/boards_page/`,
   `docs/design/claude-design.json` and `docs/design/boards-artifact.json`
   were retired by MA-296. Until 30 Oct 2026 the boards were drawn in Claude
   Design and copied here with their etags (MA-259). Standalone Claude Design
   closes by 14 Dec 2026, so Arun moved the drawing into the repo (30 Oct
   2026, MA-260: "for all future design use Local folder and then Claude
   Artifact. Claude Design is going away, so no need to push to claude
   design"; `docs/design/reviews/MA-259/decision.md`, option B). The folders
   and the trace's `claude_design` key keep their names, and nothing is read
   from or written to Claude Design again.
8. **Confluence is generated here, published there.** Every page is rendered
   from the records above by `python3 scripts/confluence_docs.py write` and
   published by `/plan-sync`. Never edit the content in Confluence: an edit
   made there is copied back into the record it came from, and the next
   publish overwrites the page. Board previews are composed from the
   boards in the repo and uploaded again when a board changes.
9. **Dates come from estimates.** Every traced story has an estimate in
   `docs/roadmap.json`; `python3 scripts/roadmap.py write` works out each
   phase's dates and rewrites PLAN.md's Timeline table. Each phase epic in
   Jira carries the phase's target end as its due date. A date moves only
   by changing an estimate or a setting there.
10. **Code is traced to its story.** A story's `code` lists the repo paths
    that build it (globs allowed). A Story In Review or Done names its code,
    and every path must exist; a file under `web/`, `ios/`, `src/` or
    `infra/` that no story claims is reported. A picked board is the spec
    the code is built to (rule 4); a UI story's PR shows its screens beside
    their boards.

## New work: Jira and Confluence in the same change

Whenever a new design or feature is discussed, it is recorded before it is
built, in one change:

- its Jira story or task under its phase epic (`/jira-flow:plan`), with the
  `design` label if it has screens;
- its PLAN.md bullet and its trace row (rule 1), with its estimate in
  `docs/roadmap.json`;
- its place on its Confluence phase page, which the generator draws from the
  row (a new phase gets its epic, its PLAN section and its own page),
  published by `/plan-sync`;
- boards in the repo before any code (`/design-first`, rule 2).

A hook reminds the session when a prompt talks about a new design or feature
(`.claude/hooks/plan_sync_hook.py new-work`).

## When to run what

| When | Run | What must be true |
| --- | --- | --- |
| Starting a story (`/jira-flow:work`, or by hand) | `/plan-sync MA-<n>` (refreshes the row from Jira), then `python3 scripts/plan_sync.py start MA-<n>` | The story is traced, its sections exist, its cited board files and board names exist; a UI story's design is `planned` (run `/design-first`) or `picked`; no `open` question |
| After any change to a record | `python3 scripts/roadmap.py write` (when an estimate or a phase changed), `python3 scripts/plan_sync.py render`, `python3 scripts/confluence_docs.py write`, then `/plan-sync --confluence` to publish the changed pages and record their read-back | The check is clean; the hook after each edit to a record reports new drift at once (an edit to a board runs nothing) |
| Before every PR (`/autoship` step 1) | `/plan-sync --confluence`, `python3 scripts/plan_sync.py pr-files`, then the `plan-sync` gate in `.claude/jira-flow.json` (`python3 scripts/plan_sync.py selftest && python3 scripts/plan_sync.py check && python3 scripts/plan_sync.py pr-files`) | No drift; every product file the branch changes is claimed by its story; `docs/TRACE.md` is rendered. The selftest runs only when its code or fixtures changed since a pass in the last 7 days (`selftest REUSED`); `selftest --force` always runs it. CI has no cache and runs it on every PR (about 9 s) |
| On every PR, in CI | `.github/workflows/plan-sync.yml` | The same checks, offline, with nothing to sign in to: the `plan-sync` gate |
| After planning (a new phase, a new story, a design round) | `/plan-sync` | Jira (read incrementally, from `docs/jira-sync.json`), the trace's boards and the trace agree; drift is fixed or filed |
| Weekly, or when unsure | `/plan-sync --all` | The whole backlog, read in full from Jira, and every board folder under `claude_design` agree with the trace |

## What the check fails on

- A PLAN phase with no trace phase, or a trace phase whose heading is not in PLAN.md.
- A story whose epic is not a phase epic, or whose phase disagrees with its epic.
- An ARCHITECTURE section the trace cites that does not exist.
- A key cited in ARCHITECTURE, PLAN, TECH_STACK or the READMEs that is not in the trace.
- A UI story with no board and no note; a UI story with no board that is In Review or Done; a `planned` or `picked` story with no board; a story with no UI and a design state or undrawn screens.
- A `planned` story that is In Review or Done: code came before Arun's pick (rule 3). A story In Review or Done with screens still `undrawn` or questions still `open`.
- `ui` and the `design` label disagreeing: the label marks exactly the stories with UI (`.claude/jira/taxonomy.md`).
- A board file a story cites missing from its board folder; a board folder the trace's `claude_design` names missing from the repo; a board name that is not exactly one of its canvas's titles (a caption, or a numbered board as `<number> · <name>` with its own number), optionally after the door the whole file draws.
- A key in both `items` and `others`; a row, phase or entry that is not an object; a row with no key, summary, status or type; a phase with no epic or title; a field of the wrong type.
- `docs/TRACE.md` not rendered from the current trace.
- A traced story with no estimate in `docs/roadmap.json`, an estimate for an untraced key, a schedule not worked out from the current estimates, or PLAN.md's Timeline table not matching it (MA-228).
- A Confluence page in `docs/confluence/` not rendered from the current records, a page with no Confluence id, a page changed in the repo but not published, a file there the generator does not make, a board preview not uploaded or older than its boards, a cited board file in no screen area, an interactive app older than the data it was made from, or the story explorer database (`docs/confluence/stories.csv`) stale or not published (MA-228); a page whose read-back, recorded after publishing, differs from what was sent, or a page published under the receipts but never read back (pages published before the receipts are listed as notes) (MA-303).
- A Story In Review or Done that names no `code`, or a `code` path that matches nothing (MA-228).

Since MA-303, plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). The weekday-and-date,
tool-name, motion-role, chart-label transform, shared-stroke and Telegram checks
on the boards went, with `contrast_check.py`, `board_fit.js`, `a11y_live.js` and
`prototype_smoke.js`. Arun judges each design round by eye. The same checks
come back as QA on the built code when Arun asks: MA-304 for the web app
(Playwright, axe and Argos, with the 25% contrast floors and the 320 to 1920
width sweep; it depends on MA-194), and the iOS app's after MA-165, with no
story yet.

`python3 scripts/plan_sync.py pr-files [--base <ref>]` (default: the merge-base
with `origin/main`) is the branch's own check, run before every PR: it lists the
files the branch changes under `web/`, `ios/`, `src/` and `infra/` (committed,
uncommitted and untracked; a rename is its old path and its new one), maps each
to the trace rows whose `code` claims it (a path, a folder, or a glob where `*`
stays in a folder and `**` spans folders), and fails, on a branch with an MA key,
on a file claimed only by another story, or by none. A deletion no story claims
is no fault. On CI's checkout, a detached merge commit with no branch, the key
comes from `GITHUB_HEAD_REF`; on CI with no key it fails closed (exit 2), and
CI passes `--base HEAD^1`, the merge commit's first parent (lesson 42).

A UI story with no board, or with screens still to draw (`undrawn`), may sit
in the backlog with a note (rule 2); the check lists it as a note and `start`
refuses it. That keeps the check green while the boards are still to draw
(MA-158), and keeps the story from starting. A story In Progress may still
have no board, or `undrawn` screens, while its own design-first round draws
them (design-first moves it to In Progress first; MA-102 is such a round); it
may not reach In Review until they are drawn and the row says so.

`python3 scripts/plan_sync.py selftest` runs the board-name check against
names it must accept and names it must refuse (every case the reviews of PR
#32 raised), `pr-files` against known cases and on a throwaway branch, and the
hook's selftest; the jira-flow gate and CI run it before the check. `start` also runs every row check
above on the story's own row, so a missing section or board stops it too.
The selftest also mutates a copy of the repo for each MA-228 check (a Story
Done with no code, a code path that does not exist, a missing estimate, an
estimate changed without the schedule, a page edited by hand, a page not
published, a preview older than its boards) and expects check to refuse it.
When MA-296 retired the boards' record, the refusal that still means
something without it was kept (lesson 22 of
`.claude/rules/independent-review.md`), each case mutating a copy and
expecting its refusal (lesson 16): a cited board file gone, and a board
folder the trace names gone. The record's own refusals (a file edited after
it was recorded, a size that disagrees, a file the record does not list, a
stamp older than the record) went with the record. MA-303 retired the date,
motion-role, tool, stroke and Telegram cases with the checks they tested, and
the mutated board that proved them inside `check`; every other case stays. The
mutated records now run on one clone of the repo per worker, four at once, each
case's file put back after it and the copy checked clean before the next; and
the selftest is reused while its code and fixtures hash as they did at a pass
recorded in the last 7 days (`review/.cache/plan_sync_selftest.json`, not
committed; `selftest --force` always runs).

Three hooks in `.claude/settings.json` (this repo only) hold the line between
checks: after an edit to a record the check runs and new drift is reported at
once, while an edit to a board in `docs/design/` runs nothing (MA-303); raising a PR (`gh pr create`, `gh pr ready`) is refused while the check
fails, exits without saying why, or cannot run; and a prompt about a new design or feature
brings the New work rule above into the session (`.claude/hooks/plan_sync_hook.py`). Each hook checks
the checkout the call acts on: the folder a command runs in (or the last `cd`
before `gh pr`), or the edited file's own checkout, so a PR raised from a
worktree is checked in that worktree, with its own scripts, not in the main
checkout beside it (MA-260); `plan_sync_hook.py selftest`, run by
`plan_sync.py selftest`, holds the cases.

Jira-side drift (a key, parent, label or status that differs from the trace,
or an epic's due date that differs from the roadmap) and Confluence drift (a
page whose live version moved past the one recorded, because someone edited
it there) need their MCP tools, so `/plan-sync` checks those. Jira is read
incrementally: `docs/jira-sync.json` records the last sync and a short hash
per key, so a normal `/plan-sync` asks only for the issues updated since, the
keys still drifting and the rows changed in the repo, and `/plan-sync --all`
reads the whole backlog (weekly, or when unsure). `jira-sync query` saves the
JQL it prints, and `record` moves the last sync only for a file that answers
that query; a narrower read, such as one story's, records only its own keys
(lesson 43). Drift is reported as one
table: the item, the repo's value, Jira's or Confluence's, which wins and why,
and the fix. The boards need
no tool: they live only in the repo, so `scripts/plan_sync.py check` reads
the cited ones offline, and the same command works in a session, in the gate, in the
PR hook and in CI. `/autoship` runs `/plan-sync --confluence` and the gate
before every PR.
A status the trace records lags Jira by one step at most: Done is set after
the merge, so the next `/plan-sync` brings it in.
