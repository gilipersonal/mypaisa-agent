---
name: autoship
description: Take an MA story in this repo from finished work to a pushed branch without asking, then ask once whether to run plan-sync and the security scan, raise the PR and merge into main, offering QA and the independent review first; on a yes, sync, scan, raise the PR, review if asked, merge, move the issue to Done and sync main. Use when a story's work is done, when asked to "ship", "autoship", "raise the PR", or "finish MA-n" in mypaisa-agent.
---

# Autoship an MA story

The project rule `.claude/rules/ship-autopilot.md` allows everything here
without asking except plan-sync, the security scan, the PR that waits on them,
and the merge, which are named together in one question. In this repo this skill replaces
`/jira-flow:ship` and `/jira-flow:pr`, and `/jira-flow:work`'s last phase
ends here. Never push to `main` directly; the merge goes through the PR. Read `.claude/jira-flow.json` for the ids:
`jira.cloudId`, `jira.transitions` (inReview 31, done 41), `git.baseBranch`,
`git.prTemplate`, `gates`.

Request: $ARGUMENTS

## 1. The facts

```bash
git branch --show-current
git status --short
git log --oneline origin/main..HEAD
gh pr list --head "$(git branch --show-current)" --json number,url,state
```

The key comes from the argument, else the branch (`MA-<n>-...`). On `main`
with no key: stop and say which story the work belongs to (`/jira-flow:status`).
Uncommitted files that belong to another story are left alone and named.

## 2. To the door, without asking

Plan-sync and the security scan run only on Arun's yes, asked once at the end of the work (`.claude/rules/ship-autopilot.md`, "Plan-sync and the security scan ask first").

1. **Gates.** Run each gate in `gates` whose `paths` the branch touches,
   except `plan-sync` and `security`, which wait for the yes (section 3). A
   red gate stops here: report it, raise nothing. No gates configured: say
   "no gates configured". The records' generators still run here, since they
   write files and check nothing: `python3 scripts/roadmap.py write`,
   `python3 scripts/plan_sync.py render`, `python3 scripts/confluence_docs.py write`.
2. **No review yet.** The independent review from `~/.claude/CLAUDE.md` is
   opt-in in this repo and offered in the one question (section 3,
   `ship-autopilot.md`); go straight on unless Arun asked for a reviewer.
3. **Commit** this story's files, subject `MA-<n>: <what>`, no attribution.
4. **Push**: `git push -u origin <branch>`.

## 3. The one question

Ask once, in words, naming everything still waiting on Arun: plan-sync (with
the Confluence pages `python3 scripts/confluence_docs.py pending` lists, and
`/plan-sync MA-<n>` too when the story changed a board, a phase or a story),
the security scan, the PR, a QA pass by `crew:qa` when the story changed
something a member sees or runs, the review, and the merge:

> MA-<n> is ready on `<branch>` at `<sha>`, gates green (<names>). Run
> plan-sync (publish <n> pages) and the security scan, raise the PR and wait
> for its checks, then review it first (lanes: <the lanes the branch
> touches>; one round, each later round asked first) and merge, or merge it
> into main straight after the checks? (MA-<n> goes to Done after the merge.)

A bare "yes" means review first, after the sync, the scan and the PR; "merge
it" or "merge now" means sync, scan, PR and merge with no review
(`ship-autopilot.md`). A yes
covers only what the question names.

Use the turn's next-step question (or `AskUserQuestion` when there is none)
with "Review, then merge" and "Merge now" (and "Not now" where the question
allows a third answer). Do not sync, scan, raise the PR or merge on anything
but a yes given in the turn that is running. On a no: the branch stays
pushed with no PR, the issue stays In Progress, and the report says what was
not synced or scanned.

## 3a. On the yes: sync, scan, PR, checks

1. **Plan-sync:** `/plan-sync --confluence` publishes every page the change
   re-rendered (and `/plan-sync MA-<n>` when the question named it), then the
   `plan-sync` gate
   (`python3 scripts/plan_sync.py selftest && python3 scripts/plan_sync.py check && python3 scripts/plan_sync.py pr-files`;
   locally the selftest is reused while plan-sync's code and fixtures are
   unchanged; CI runs it every time). Its `check` keeps the trace, the docs,
   the recorded Confluence pages and the code in step, and checks that every
   board a story cites is on disk; Jira is compared by `/plan-sync`;
   `pr-files` checks that every product file the branch changes is claimed by
   its story. No gate measures the boards themselves (Arun, 2 Nov 2026,
   MA-303: "All the 6 checks currently run on docs/design. Lets stop that."):
   plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303).
2. **The security scan:** the `security` gate (`scripts/security_scan.sh`).
3. A red result stops here: report it, raise nothing. Commit and push what
   the sync changed (`docs/confluence.json`, `docs/jira-sync.json`).
4. **Raise the PR** (skip if one is open): title `[MA-<n>] <summary>`, body
   from `.github/pull_request_template.md` with the Jira link, acceptance
   criteria ticked, gates, what was verified, follow-ups. Keep `gh pr create`
   visible in the command.
5. **Trace it**: comment "PR raised: <url> from `<branch>` at `<sha>`." on
   the issue, then `transitionJiraIssue` id 31 (In Review).
6. **Checks**: `gh run list --commit <HEAD sha>` for every run on this HEAD:
   CI, jira-key, and CodeQL (`codeql.yml`; MA-346, MA-351), then
   `gh run watch <id> --exit-status` for each. If none has started after a
   minute, look once more; give up after 30 minutes (CodeQL's three Linux
   jobs, actions, javascript-typescript and python, stop at 20; Swift is not
   analysed on GitHub, MA-166) and say so. A failed
   check stops here: report it with the failing step.
7. Then the review, if the yes asked for it (below), or straight to section 4.

On "Review, then merge": run the review as `.claude/rules/ship-autopilot.md`
says, in parallel lanes, each lane as `crew:reviewer` (`.claude/rules/crew.md`).

1. **Gates first:** the configured gates (plan-sync and the scan on the yes
   that named them), then
   `python3 scripts/review_regress.py MA-<n>` and
   `python3 scripts/review_regress.py --state MA-<n>` (it may run before
   round 1: no state file means no rounds yet). A FAIL is fixed before
   any reviewer starts. Exit 3 means every command passed but `manual`
   checks remain: start one fresh verifier sub-agent with those items, the
   rules and the files they name (never the maker's notes); a broken item is
   fixed first, like a FAIL.
2. **Lanes:** one fresh sub-agent per lane in a single message: (a) scripts
   and checks; (b) the trace against Jira; (c) the spec docs; (d) the rules
   and skills; (f) the code, once the story has code. A lane with nothing in
   the round's files sits it out. Brief each from
   `.claude/skills/autoship/review-brief.md`: the PR number, the issue key,
   its lane's files, the story's acceptance criteria, the repo's rules and
   lessons, and `review/MA-<n>/fixed.json` (fixes it must not undo), never
   the maker's notes; round 1 covers everything, later rounds the delta since
   `reviewed_sha` in `review/MA-<n>/state.json` and its direct joins.
3. **Merge their findings** into one list, two lanes at the same `file:line`
   under one id naming both, and record them in `state.json` (the fields are
   in `.claude/rules/independent-review.md`). Fix the blocking ones on the
   branch, add each (and any owner decision the review must keep) to
   `review/MA-<n>/fixed.json` with a check, push, wait for the checks.
4. **Ask before the next round:** report the round and ask "Run round N on
   round N-1's fixes, then merge on a clean round, or merge now?" (each round
   needs its own yes, `ship-autopilot.md`). At most five rounds, then stop and
   ask Arun whether to go on, listing what is left and what each fix costs.
   The question names the merge ("Fix them, run round 6, then merge on a
   clean round?"), so his yes covers both (`ship-autopilot.md`); a yes to a
   question that does not name the merge is not a yes to merge. A clean round
   goes straight to section 4 below; put the non-blocking findings in the report
   and on the issue.

## 4. After a yes (and a clean review, if one was asked for), without asking again

Arun's "merge it" covers every step below, branch deletion included
(`ship-autopilot.md`, "Merge it" is the whole yes). Ask nothing more.

1. `gh pr checks <n>` lists every check passed and none pending, CodeQL's
   `Analyze (<language>)` included (MA-346; auto-merge once merged #114 with a
   check still running), then `gh pr merge <n> --merge --delete-branch
   --subject "MA-<n>: Merge PR #<n>: <title>"`. The permission prompt that
   follows is the backstop; it is expected.
2. Comment "Merged as <PR url> (<short sha>)." on the issue, then
   `transitionJiraIssue` id 41 (Done).
3. Clean tree only: `git fetch origin --prune`, `git checkout main`,
   `git pull --ff-only`. A dirty tree is left as it is and the report says
   `main` is behind.
4. Delete the story's branch wherever it is left, without asking:
   `git ls-remote --exit-code --heads origin <branch>` finds it on GitHub, then
   `gh api -X DELETE repos/gilipersonal/mypaisa-agent/git/refs/heads/<branch>`
   (never `git push --delete`: jira-flow's guard refuses any push from `main`);
   locally, once `main` is checked out,
   `git branch -d <branch>`, or `git branch -D <branch>` when `-d` refuses.
   Only an `MA-*` branch, never `main`.
5. Clear the work state if one exists (`.git/jira-flow/MA-<n>.json`):
   `bash "$(ls -d ~/.claude/plugins/cache/jira-flow/jira-flow/*/ | sort -V | tail -1)lib/state.sh" clear MA-<n>`.

After a no to the merge (once a PR is open): leave the PR open and the issue
In Review, and say so in one line.

## Report

```
PR:    <url> [MA-<n>] ...  merged <sha> (checks: jira-key ok, plan-sync ok; gates: <names>; review: clean in <n> rounds | unreviewed, Arun said merge now)
Jira:  MA-<n> Done (comments: PR raised, merged)
Base:  main at <sha>, checkout synced
```
