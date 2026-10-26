# Ship on autopilot: the merge is the only question

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
- **Review first** runs the global rule's review (`~/.claude/CLAUDE.md`,
  "Independent review"), in parallel lanes on the delta. Arun, 25 Oct 2026,
  after PR #32's seven one-reviewer rounds: "always use that approach for
  this repo and make it a global rule".
  1. **Gates first:** `python3 scripts/plan_sync.py selftest`, `check`,
     `python3 scripts/contrast_check.py --selftest` and `python3 scripts/contrast_check.py`, the story's other gates, and `python3 scripts/review_regress.py MA-<n>` once
     the story has a ledger. Reviewers spend time only on what no gate measures.
  2. **Lanes, in parallel:** one fresh sub-agent per lane, every Agent call in
     one message, each blind to the making (the requirements, the rules and
     the deliverable, never the maker's notes). The lanes here: (a) scripts and
     checks; (b) the trace against Jira; (c) the spec docs (`ARCHITECTURE.md`,
     `PLAN.md`, `TECH_STACK.md`, `README.md`, the explainer pages); (d) the
     rules and skills; (e) the boards and the design mirror, when the PR
     changes them. Each reports on its part and the joins into it; their
     findings are merged into one list.
  3. **Round 1 covers everything; later rounds cover the delta**
     (the previous round's fixes only: `git diff <previous round's reviewed_sha>..HEAD` and its joins; Arun, 26 Oct 2026), with the gates on the
     whole. A lane with nothing changed sits the round out.
  4. **Fixed stays fixed:** every fixed blocking finding (and any owner decision the review must keep) goes into
     `review/MA-<n>/fixed.json` with a check that passes while the fix holds;
     `scripts/review_regress.py` runs them before each round, and reviewers get
     the list and must not undo any of it. Rounds and the reviewed sha are in
     `review/MA-<n>/state.json`.
  5. **At most five rounds;** if blocking findings remain after the fifth,
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
  reviewed sha, its blocking count, and Arun's word for any round past five)
  and comment the round's result on the issue. The lessons go into
  `.claude/rules/independent-review.md` the same day.

## What changes

| Act | Here |
| --- | --- |
| Create, edit, comment on a Jira issue | do it, no asking |
| Any Jira transition (To Do, In Progress, In Review, Done, back again) | do it, no asking (Done only after the merge, see below) |
| Branch, commit, push an `MA-<n>-<slug>` branch | do it, no asking |
| Raise the pull request (`gh pr create`) | **do it, no asking**, as soon as the story's work is committed and its gates are green |
| Wait for the PR's checks | do it, no asking |
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
  with no board, `.claude/rules/plan-sync.md`). Its Phase 6 goes through `/autoship`, not
  `/jira-flow:ship`.
- `/jira-flow:ship` and `/jira-flow:pr` are not used for ending a story here;
  use `/autoship`. Their "only when the reader asked for a PR" does not apply
  in this repo.
- `.claude/rules/jira-flow.md` lines that say a PR, a close or Done waits for
  the reader's word (habit 5, the ship gate table, "What not to do") are
  overridden by this file; only the merge waits.

## How a story ends here

Use `/autoship` (`.claude/skills/autoship/SKILL.md`). When a story's work is
done, take it to the merge question without stopping: commit, push, raise the
PR, move the issue to In Review, wait for the checks. Then ask exactly once,
naming the PR and its checks:

> MA-7 is ready: PR #21 `[MA-7] ...`, checks green (jira-key, plan-sync). Review it
> first (lanes: scripts, trace, docs, rules; up to five rounds), then merge,
> or merge it into main now? (MA-7 goes to Done after the merge.)

Either yes merges (after a clean review, for the first), closes the issue and
syncs `main`. A no, or no answer, leaves
the PR open and the issue In Review; say so in one line.

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
  (a draft at most), and nothing is merged on a failed check.
- Done still means merged. An issue is never moved to Done for an unmerged
  PR, and issues are never deleted.
- Pushing to `main` directly, force-pushing, and changing branch protection
  stay off limits.
