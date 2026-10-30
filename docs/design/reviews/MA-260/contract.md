# MA-260: designs local and in Artifacts, Claude Design retired: the lanes' contract

Arun, 30 Oct 2026: "for all future design use Local folder and then Claude Artifact. Claude Design is going away, so
no need to push to claude design". MA-259's option B, now (`docs/design/reviews/MA-259/decision.md`: option B, and
the table "Every place that assumes the old projects or links"). Three lanes change the repo at once; every lane
writes exactly these names, so the rules, the scripts and the docs agree.

## What is true after MA-260

1. **Boards are drawn and edited in the repo.** Their homes stay `docs/design/ios-v1/`, `docs/design/ds-v1/` and
   `docs/design/app-v1/` (the folder names stay; they were Claude Design's three projects); a record that is not a
   board set, such as Prototype v5, has its own folder (`docs/design/prototype-v5/`). Nothing is read from or written
   to Claude Design again: no `mcp__claude-design__*` call, no `/design-login`, no claude.ai/design link in a new
   record. Past review records keep the links they were written with (they are history).
2. **The record.** `docs/design/claude-design.json` keeps its name (scripts, the trace's `claude_design` key and the
   review ledgers name it) and becomes the repo's own record of every board file: per project its `dir` and, per
   file, `bytes` and `sha256`. The `etag` fields and anything only Claude Design gave are dropped. Its `about` says
   so: "The repo's record of every board file since MA-260 (30 Oct 2026); the name is history."
3. **The commands** (`scripts/design_sync.py`, the same file, its Claude Design half removed):
   - `python3 scripts/design_sync.py record`: after drawing or editing boards, writes each file's bytes and sha256
     into the record, adds a new file, and refuses to forget a file that is gone unless asked:
     `record --drop <dir>/<file>`.
   - `python3 scripts/design_sync.py check`: offline and fast; fails on a file whose bytes no longer match its
     record, a file in a board folder the record does not list, a recorded file missing, and a boards Artifact older
     than the record (5).
   - `python3 scripts/design_sync.py selftest`: offline; every refusal the old check made that still means something
     locally is kept (lesson 22), each case mutating a copy and expecting its refusal (lesson 16).
   The `design-sync` gate in `.claude/jira-flow.json`, the PR hook and CI run `check`; it fails closed.
4. **Where Arun looks: private Claude Artifacts.** Each `/design-first` round publishes its options as a private
   Artifact (as MA-291 did: https://claude.ai/artifact/QWqsst7hKcuN5VtYozhucR, a host page that iframes the board
   with its shared files) and gives Arun that link; the link goes into the round's `decision.md` and on the issue.
   Comments Arun leaves on an Artifact are read with the ArtifactComments tool. The pick is recorded as before.
5. **The whole set: the MyPaisa Boards Artifact**, https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g, a viewer
   listing every board by project and opening it beside the list. It is built by
   `python3 scripts/boards_page/build.py docs/design <out-dir>` (writes `<out-dir>/index.html` and
   `<out-dir>/files.json`, the published paths) and republished with the Artifact tool to the same URL (root
   `docs/design`, the files listed) whenever a board changes, before the PR; then
   `python3 scripts/design_sync.py published` stamps `docs/design/boards-artifact.json` (`url`, the record's sha256
   at publish, the date), and `check` fails while the stamp is older than the record ("the MyPaisa Boards Artifact
   was published before these boards changed: rebuild and republish it"). A board's link is
   `https://claude.ai/artifact/G6Dzu3QYtNPVkqyH4q9d6g#<id>`, its id being the viewer's: the project's prefix
   (`ios`, `app`, `ds`) and the file name without `.dc.html`, lower case, every run of other characters one hyphen,
   e.g. `ios-iphone-v4-home` for `ios-v1/iPhone v4 · Home.dc.html`.
6. **The other gates stay:** plan-sync (its mirror checks read the record's sha256 and sizes, no etags), contrast,
   board-fit (it lists the boards from the record, and the repo-only boards), prototype-v5.

## The lanes

| Lane | Files it changes |
| --- | --- |
| Scripts and gates | `scripts/design_sync.py`, `scripts/plan_sync.py` (and its selftest), `.claude/hooks/plan_sync_hook.py`, `.claude/jira-flow.json`, `.github/workflows/plan-sync.yml`, `scripts/board_fit.js`, `scripts/board_fit_allow.json`, `scripts/contrast_check.py`, `scripts/review_regress.py` if it names Claude Design, `review/MA-156/fixed.json`, `review/MA-161/fixed.json`, `review/MA-240/fixed.json` (a check that names Claude Design's sync keeps testing what its fix holds), `docs/design/claude-design.json`, `docs/design/boards-artifact.json` (new) |
| Rules and skills | `.claude/rules/plan-sync.md` (rule 7, the records table, the when-to-run table, what the check fails on, the hooks paragraph), `.claude/rules/independent-review.md` (lesson 9's "a board fix that cannot reach Claude Design", any other mention), `.claude/jira/taxonomy.md`, `.claude/skills/design-first/SKILL.md` (draw in the repo, publish an options Artifact per round, review it, give Arun the link, read Artifact comments), `.claude/skills/plan-sync/SKILL.md` and `reference/trace-schema.md`, `.claude/skills/autoship/SKILL.md` (before every PR: `design_sync.py check`, and the Boards Artifact republished and stamped when boards changed) |
| Docs and links | `README.md`, `docs/design/README.md`, `ARCHITECTURE.md` (the overview's iOS app, §4, §9, §13's stack table), `TECH_STACK.md`, `PLAN.md` (every mention but the MA-259 and MA-260 bullets, which the integrator writes), `docs/RESEARCH.md`, `docs/design/agent-journey.html`, `docs/design/market-agent.html`, `scripts/confluence_docs.py` and `scripts/confluence_images.py` (claude.ai/design links become the Boards Artifact's `#<id>` links; the sync page says what is true now), `scripts/boards_page/` (made a repo tool: an out-dir argument, a docstring, `build.py`'s writes kept out of `scripts/`) |
| Integrator | `docs/trace.json` (MA-260's row, the `claude_design` key's description), `docs/TRACE.md`, `docs/roadmap.json`, `docs/design/reviews/MA-259/decision.md` (the pick), PLAN's MA-259 and MA-260 bullets, Jira, the Confluence pages, the Boards Artifact's publish |

No lane commits; the integrator does. A lane that needs a name or a behaviour another lane owns takes it from this
file; if this file is silent, it says so in its report rather than inventing it.
