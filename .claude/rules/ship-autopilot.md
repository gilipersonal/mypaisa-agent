# Ship on autopilot: the merge is the only question

**This repo only.** It overrides the ship gate in `.claude/rules/jira-flow.md`
and two rules in the user's global `~/.claude/CLAUDE.md`, "raise, merge and
close only when asked" and "independent review before anything is shown",
for work in `gilipersonal/mypaisa-agent`. Everywhere else those rules stand
unchanged. Arun set this on 2026-10-23 (MA-3, MA-4).

## No independent review here

The separate-reviewer pass from `~/.claude/CLAUDE.md` is switched off in this
repo: no review sub-agent before work is shown, reported done or shipped, and
no re-review round. Check your own work the ordinary way (run the gates, look
at the result) and go straight on. A reviewer runs only when Arun asks for one.

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
| Sync local `main`, delete the merged branch | do it, no asking |

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
  drops 1 and 5. It still stops on a red gate or a failed check. Its Phase 6 goes through `/autoship`, not
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

> MA-7 is ready: PR #21 `[MA-7] ...`, checks green (jira-key). Merge it into
> main? (MA-7 goes to Done after the merge.)

A yes merges, closes the issue and syncs `main`. A no, or no answer, leaves
the PR open and the issue In Review; say so in one line.

## What does not change

- Every branch, commit and PR still carries its `MA-<n>` key.
- A red gate or a failed check stops the run: no PR is raised on a red gate
  (a draft at most), and nothing is merged on a failed check.
- Done still means merged. An issue is never moved to Done for an unmerged
  PR, and issues are never deleted.
- Pushing to `main` directly, force-pushing, and changing branch protection
  stay off limits.
