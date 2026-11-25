# Ship on autopilot: one question, at the end of the work

**This repo only.** It overrides the ship gate in `.claude/rules/jira-flow.md`
and two rules in the user's global `~/.claude/CLAUDE.md`, "raise, merge and
close only when asked" and "independent review before anything is shown",
for work in `gilipersonal/mypaisa-agent`. Everywhere else those rules stand
unchanged. Arun set this on 2026-10-23 (MA-3, MA-4); the review became
opt-in, offered before every merge, on 2026-10-24 (MA-157).

## The independent review is opt-in, offered before every merge

Arun, 24 Oct 2026 (MA-157): "the rule is made opt-in, you ask to run it for
this repo on any change just before you merge the PR. just for this Repo".

- **Not on its own.** No review sub-agent runs before work is shown, reported
  done or raised as a PR. Check your own work the ordinary way (run the
  gates, look at the result) and go straight on.
- **Offered at every merge.** The merge question also offers the review, in
  the same one question: review it first, then merge, or merge it now. Never
  merge without having offered it.
- **QA is offered in the same question.** Arun, 25 Nov 2026 (MA-361): any agent
  that checks another agent's work, the QA agent included, waits for his yes
  ("Ask me first"). When the story changed something a member sees or runs, the
  merge question also offers a QA pass by `crew:qa` before the merge
  (`.claude/rules/crew.md`). It never runs on its own; after it, the merge
  question comes back with its findings.
- **Review first** runs the global rule's review (`~/.claude/CLAUDE.md`,
  "Independent review"), in parallel lanes on the delta. Arun, 25 Oct 2026,
  after PR #32's seven one-reviewer rounds: "always use that approach for
  this repo and make it a global rule".
  1. **Gates first:** the `plan-sync` gate (on the yes that named it: Plan-sync and the security scan run only on Arun's yes, asked once at the end of the work (`.claude/rules/ship-autopilot.md`, "Plan-sync and the security scan ask first")),
     `python3 scripts/plan_sync.py selftest && python3 scripts/plan_sync.py check && python3 scripts/plan_sync.py pr-files`
     (locally the selftest is reused while plan-sync's code and fixtures are unchanged; CI runs it every time, about 9 s), the story's
     other gates, and `python3 scripts/review_regress.py MA-<n>` once the
     story has a ledger; `--state MA-<n>` validates its state file, and may
     run before round 1 (no state file means no rounds yet). No gate
     measures the boards (Arun, 2 Nov 2026, MA-303: "All the 6 checks
     currently run on docs/design. Lets stop that."): plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303). An exit 3 from the
     runner (every command passed, `manual` checks left) sends those items
     to one fresh verifier sub-agent before the lanes start. Reviewers spend
     time only on what no gate measures.
  2. **Lanes, in parallel:** one fresh sub-agent per lane, every Agent call in
     one message, each blind to the making (the requirements, the rules and
     the deliverable, never the maker's notes), briefed from
     `.claude/skills/autoship/review-brief.md`. The lanes here: (a) scripts
     and checks; (b) the trace against Jira; (c) the spec docs
     (`ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `README.md`, the
     explainer pages); (d) the rules and skills; (f) the code (`web/`, `ios/`,
     `backend/`, `infra/`), once the story has code. The boards' lane (e) left the
     review with MA-303. Each reports on its part and the joins into it; their
     findings are merged into one list, two lanes' findings at the same
     `file:line` under one id.
  3. **Round 1 covers everything; later rounds cover the delta**
     (the previous round's fixes only: `git diff <previous round's reviewed_sha>..HEAD` and its joins; Arun, 26 Oct 2026), with the gates on the
     whole. A lane with nothing changed sits the round out.
  4. **Fixed stays fixed:** every fixed blocking finding (and any owner decision the review must keep) goes into
     `review/MA-<n>/fixed.json` with a check that passes while the fix holds;
     `scripts/review_regress.py` runs them before each round, and reviewers get
     the list and must not undo any of it. Rounds and the reviewed sha are in
     `review/MA-<n>/state.json`.
  5. **Each round needs its own yes** (Arun, 25 Oct 2026: "ask me before the
     reviews please"): after fixing a round, report it and ask "Run round N on
     round N-1's fixes, then merge on a clean round, or merge now?"; his yes
     covers that one round and the merge after it if it is clean.
  6. **At most five rounds;** if blocking findings remain after the fifth,
     stop and ask Arun whether to go on, listing them and what each fix costs.
     The question names the merge ("Fix them, run round 6, then merge on a
     clean round?"), so his yes covers both, as the merge question's does.
  A clean round (no blocking findings in any lane) leads straight to the
  merge: "review it first, then merge" is the yes. The non-blocking findings
  go into the report and onto the issue.
- **Merge now** merges with no review.
- Arun can ask for a reviewer at any other time too; it runs the same way
  (gates first, parallel lanes, the delta after round 1, the fixed list).
- After each round, update `review/MA-<n>/state.json` (the round, the
  reviewed sha, Arun's words that allowed it, the gate results, the findings
  and the next round; the fields are in `.claude/rules/independent-review.md`)
  and comment the round's result on the issue. The lessons go into
  `.claude/rules/independent-review.md` the same day.

## Plan-sync and the security scan ask first

Arun, 25 Nov 2026 (MA-361): "ask me before running plan-sync and security scan
like we do for independent review". The global rule (`~/.claude/CLAUDE.md`,
"Plan-sync and the security scan: ask me first") holds here too, and it is
stricter than the autopilot: this section is where the two meet.

- **What waits for the yes:** the `/plan-sync` skill in any form (Jira,
  Confluence, the boards, a publish); `scripts/plan_sync.py` `check`,
  `selftest`, `pr-files`, `start` and `jira-sync` when run as a step of the
  work; the `plan-sync` and `security` gates in `.claude/jira-flow.json`
  (also when `/jira-flow:work` or a review would run them);
  `scripts/security_scan.sh`, `/security-review`, the claude-security skills and
  any other scan for vulnerabilities, secrets or dependency advisories.
- **What does not wait:** the records' generators, which write files and
  check nothing (`python3 scripts/roadmap.py write`,
  `python3 scripts/plan_sync.py render`, `python3 scripts/confluence_docs.py write`);
  the story's other gates (backend, web, ios, infra); and what runs on its own:
  the plan-sync hook after an edit to a record, the PR hook that runs
  `plan_sync.py check` on `gh pr create`, and CI, which runs both on every PR.
- **The question moves before the PR.** The PR hook and CI refuse a PR while
  plan-sync fails, and the pages a change re-renders must be published before
  it passes; so the one question comes when the story's work is committed and
  pushed and its other gates are green, before the PR. It names everything
  waiting on Arun at once: plan-sync (with the pages it would publish), the
  security scan, the PR, QA and the review where they apply, and the merge:

  > MA-7 is ready on `MA-7-...` at `abc1234`, gates green (backend, web).
  > Run plan-sync (publish 3 pages) and the security scan, raise the PR and
  > wait for its checks, then review it first (lanes: scripts, docs; one
  > round, each later round asked first) and merge, or merge it into main
  > straight after the checks? (MA-7 goes to Done after the merge.)

  A yes covers what the question names, once, and nothing it does not name.
  "Sync and merge" (or "merge it") runs plan-sync and the scan, raises the
  PR and merges on green checks with no review; a bare "yes", or any answer
  that asks for the review, reviews first. A later run of either needs its
  own yes, so a review round's question names them again when the round
  would run them.
- **A no,** or no answer: nothing is synced or scanned and no PR is raised.
  The branch stays pushed and the issue In Progress; the report says plainly
  that the work is not synced, not scanned and has no PR, and lists the gates
  that did run.
- **Starting a story** (`/plan-sync MA-<n>` and `plan_sync.py start`) asks too.
  The question is put once, before the first edit, naming both; on a no the
  story may still be worked, and the report says it was not checked against
  Jira and Confluence before it started.

## What changes

| Act | Here |
| --- | --- |
| Create, edit, comment on a Jira issue | do it, no asking |
| Any Jira transition (To Do, In Progress, In Review, Done, back again) | do it, no asking (Done only after the merge, see below) |
| Branch, commit, push an `MA-<n>-<slug>` branch | do it, no asking |
| Run plan-sync or the security scan (see "Plan-sync and the security scan ask first") | **ask once**, at the end of the work, in the one question |
| Raise the pull request (`gh pr create`) | on the yes to the one question, once plan-sync and the scan it named have passed; no further asking |
| Wait for the PR's checks (every one, CodeQL's `Analyze (<language>)` included, MA-346) | do it, no asking |
| Merge the PR into `main` (`gh pr merge`, `git merge`, the merge API) | **ask once**, in words, and wait for a yes in the turn that is running |
| Move the issue to Done | **do it, no asking**, straight after the merge lands (the order is the rule, not a question) |
| Delete the merged `MA-*` branch, on GitHub and locally, however it has to be done | do it, no asking (covered by the merge's yes, see below) |
| Sync local `main` | do it, no asking |

`ship.askBefore` in `.claude/jira-flow.json` is `["merge"]`, so the plugin's
`ask-before-ship` hook prompts only on the merge. `.claude/settings.json`
allows the routine commands and Jira writes and puts the merge commands on
`ask`, so a permission prompt appears for the merge whatever the session's
permission mode.

`settings.json` also **denies** pushing to `main` from any branch
(`git push origin X:main`, `git push origin X main`) and force-pushing, so the
merge cannot be side-stepped. The merge is asked twice by design: once in
words, then the permission prompt as the backstop.

## The plugin's skills here

The jira-flow skills ignore `ship.askBefore` and ask on their own; in this
repo their asking is replaced:

- `/jira-flow:work` runs through without its checkpoints: skip Checkpoints
  1, 3 and 5 and take the recommended option each time (approve the plan,
  build every step, post the tracking comment and file the follow-ups).
  `work.checkpoint` is `phase`, which only drops Checkpoint 3; this rule
  drops 1 and 5. It still stops on a red gate or a failed check, and on
  `python3 scripts/plan_sync.py start MA-<n>` refusing the story (a UI story
  with no board, `.claude/rules/plan-sync.md`). Its gate runs leave out the
  `plan-sync` and `security` gates until the yes names them. Its Phase 6 goes through `/autoship`, not
  `/jira-flow:ship`.
- `/jira-flow:ship` and `/jira-flow:pr` are not used for ending a story here;
  use `/autoship`. Their "only when the reader asked for a PR" does not apply
  in this repo.
- `.claude/rules/jira-flow.md` lines that say a PR, a close or Done waits for
  the reader's word (habit 5, the ship gate table, "What not to do") are
  overridden by this file; only the merge waits.

## How a story ends here

Use `/autoship` (`.claude/skills/autoship/SKILL.md`). When a story's work is
done, take it to the one question without stopping: run the story's other
gates, commit, push. Then ask exactly once, naming plan-sync, the security
scan, the PR, any QA and the review, and the merge (the example is under
"Plan-sync and the security scan ask first"). On a yes: run plan-sync and the
scan, raise the PR, move the issue to In Review, wait for the checks, then
review if asked and merge.

Plan-sync and the security scan run only on Arun's yes, asked once at the end of the work (`.claude/rules/ship-autopilot.md`, "Plan-sync and the security scan ask first").

Either yes merges (after a clean review, for the first), closes the issue and
syncs `main`. A no, or no answer, leaves the branch pushed with no PR and the
issue In Progress; say so in one line, naming what was not synced or scanned.

### "Merge it" is the whole yes

Arun's rule, 2026-10-23 (MA-7): "I'll just say merge it. If you need to delete
the branch, delete the branch. Don't ask me." His "merge it" (or a yes to the
merge question) covers every step after the merge, with no further question in
words. What each answer means (Arun, 25 Oct 2026, so the repo and the global
rule agree): "merge it" or "merge now" merges with no review; a bare "yes", or
any answer that asks for the review, means review first, then merge on a clean
review (MA-157); anything else leaves the PR open:

- merge the PR;
- delete the story's `MA-*` branch on GitHub and locally, however it has to
  be done: `gh pr merge --delete-branch`, else `gh api -X DELETE
  repos/gilipersonal/mypaisa-agent/git/refs/heads/<branch>` (not `git push
  --delete`, which jira-flow's guard refuses on `main`), else
  `git branch -D <branch>` when `-d` refuses;
- comment on the issue and move it to Done;
- sync local `main` and clear the work state.

Only the story's own `MA-*` branch is deleted this way; `main` never is.

## What does not change

- Every branch, commit and PR still carries its `MA-<n>` key.
- A red gate or a failed check stops the run: no PR is raised on a red gate
  (a draft at most), and nothing is merged on a failed check, or while one is
  pending: `gh pr checks <n>` lists every check passed, CodeQL's included
  (`.github/workflows/codeql.yml`; MA-346, MA-351).
- Done still means merged. An issue is never moved to Done for an unmerged
  PR, and issues are never deleted.
- Pushing to `main` directly, force-pushing, and changing branch protection
  stay off limits.
