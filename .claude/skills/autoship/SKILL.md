---
name: autoship
description: Take an MA story in this repo from finished work to an open PR without asking, then ask once whether to merge into main; on a yes, merge, move the issue to Done and sync main. Use when a story's work is done, when asked to "ship", "autoship", "raise the PR", or "finish MA-n" in mypaisa-agent.
---

# Autoship an MA story

The project rule `.claude/rules/ship-autopilot.md` allows everything here
without asking except the merge. In this repo this skill replaces
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

1. **Gates.** Run each gate in `gates` whose `paths` the branch touches. A
   red gate stops here: report it, raise nothing (offer a draft at most).
   No gates configured: say "no gates configured".
2. **No review.** The independent review from `~/.claude/CLAUDE.md` is
   switched off in this repo (`ship-autopilot.md`); go straight on unless
   Arun asked for a reviewer.
3. **Commit** this story's files, subject `MA-<n>: <what>`, no attribution.
4. **Push**: `git push -u origin <branch>`.
5. **Raise the PR** (skip if one is open): title `[MA-<n>] <summary>`, body
   from `.github/pull_request_template.md` with the Jira link, acceptance
   criteria ticked, gates, what was verified, follow-ups. Keep `gh pr create`
   visible in the command.
6. **Trace it**: comment "PR raised: <url> from `<branch>` at `<sha>`." on
   the issue, then `transitionJiraIssue` id 31 (In Review).
7. **Checks**: `gh run list --branch <branch>` for the run on this HEAD, then
   `gh run watch <id> --exit-status`. If none has started after a minute,
   look once more; give up after 20 minutes and say so. A failed check stops
   here: report it with the failing step.

## 3. The one question

Ask once, in words, naming everything:

> MA-<n> is ready: PR #<n> `[MA-<n>] ...`, checks green (<names>). Merge it
> into main? (MA-<n> goes to Done after the merge.)

Use the turn's next-step question (or `AskUserQuestion` when there is none)
with "Merge it" first and "Not now" second. Do not merge on anything but a
yes given in the turn that is running.

## 4. After a yes, without asking again

Arun's "merge it" covers every step below, branch deletion included
(`ship-autopilot.md`, "Merge it" is the whole yes). Ask nothing more.

1. `gh pr merge <n> --merge --delete-branch`. The permission prompt that
   follows is the backstop; it is expected.
2. Comment "Merged as <PR url> (<short sha>)." on the issue, then
   `transitionJiraIssue` id 41 (Done).
3. Clean tree only: `git fetch origin --prune`, `git checkout main`,
   `git pull --ff-only`. A dirty tree is left as it is and the report says
   `main` is behind.
4. Delete the story's branch wherever it is left, without asking:
   `git ls-remote --exit-code --heads origin <branch>` finds it on GitHub, then
   `git push origin --delete <branch>`; locally, once `main` is checked out,
   `git branch -d <branch>`, or `git branch -D <branch>` when `-d` refuses.
   Only an `MA-*` branch, never `main`.
5. Clear the work state if one exists (`.git/jira-flow/MA-<n>.json`):
   `bash "$(ls -d ~/.claude/plugins/cache/jira-flow/jira-flow/*/ | sort -V | tail -1)lib/state.sh" clear MA-<n>`.

After a no: leave the PR open and the issue In Review, and say so in one line.

## Report

```
PR:    <url> [MA-<n>] ...  merged <sha> (checks: jira-key ok)
Jira:  MA-<n> Done (comments: PR raised, merged)
Base:  main at <sha>, checkout synced
```
