# Jira is the ledger: every change is a story or a bug, every PR carries its key

Work in this repo is tracked in Jira project **MA** (mypaisaa-agent) at
`https://duttaarun2015.atlassian.net`. The plugin `jira-flow` reads `.claude/jira-flow.json` for the
project's ids and gates; `.claude/jira/taxonomy.md` holds the epics, the path-to-epic
table, the labels and the issue templates. The skills are `/jira-flow:status`,
`/jira-flow:work`, `/jira-flow:plan`, `/jira-flow:bug`, `/jira-flow:track`,
`/jira-flow:pr` and `/jira-flow:ship`.

## The five habits

1. **Start of a session: know the issue.** The SessionStart hook prints the
   branch and the key it carries. If the branch has no `MA-<n>` and work is
   asked for, run `/jira-flow:status` and name the story the work belongs to
   before editing; `/jira-flow:work <key>` picks it up with a plan. If none
   fits, `/jira-flow:plan` creates one. Ask only when the epic is genuinely
   ambiguous.

2. **Work starts: the issue moves, and the plan is checked.** Before editing
   a story, run `python3 scripts/plan_sync.py start MA-<n>` (and `/plan-sync
   MA-<n>`): the story must be in `docs/trace.json`, its ARCHITECTURE sections
   must exist, and a story with UI must have its boards (`.claude/rules/plan-sync.md`).
   When editing begins for a story that is `To Do`, transition it to
   `In Progress`. One story in progress per branch.

3. **Work lands: the issue records it.** Before reporting a change as done,
   run `/jira-flow:track`: it comments on the issue with the files changed,
   the gates run and their result, what was verified, and anything left open.
   A change nobody can find from the Jira issue did not happen.

4. **New work appears: a new issue appears with it.** A follow-up noticed, a
   gap found, a bug hit: create it at once (`/jira-flow:plan` for stories and
   tasks, `/jira-flow:bug` for bugs), link it to the current issue, and say the
   key in the report. Do not keep a to-do list in the conversation; keep it in
   Jira. A planned story also gets its PLAN.md bullet and its `docs/trace.json`
   row in the same change, so the plan, the designs and Jira never drift.

5. **A PR is traced or it is not raised.** Branch `MA-<n>-<slug>`, every
   commit subject `MA-<n>: <what>`, PR title `[MA-<n>] <what>`, PR
   body from `.github/pull_request_template.md` with the issue link. `/jira-flow:pr` does this;
   the plugin's guard hook refuses a commit or push without a key; the
   `jira-key` workflow fails a PR without one. Raising the PR moves the issue to
   `In Review`; it moves to `Done` on merge, only when asked (here: straight after the merge, see ship-autopilot.md).

## The ship gate: nothing is raised, merged or closed unasked

> **Overridden in this repo by `.claude/rules/ship-autopilot.md`:** the PR is
> raised and the issue closed after the merge without asking; only the merge
> into `main` asks. The table below, habit 5's "only when asked" and the
> Done line under "What not to do" are the plugin's defaults.

| Act | Needs asking |
| --- | --- |
| Raise a pull request (`gh pr create`, `gh pr ready`, the GitHub MCP) | **yes** |
| Merge anything (`gh pr merge`, `git merge`, the merge API) | **yes** |
| Move a Jira issue to Done (or any close/resolve transition) | **yes** |
| Branch, edit, commit, push a `MA-<n>-<slug>` branch | no |
| Create a Jira issue, comment on one, move it to In Progress or In Review | no |
| Everything else (build, test, screenshot, bench) | no |

"Asking" means the reader said so **in the turn that is running**, in words
or by answering the checkpoint question `/jira-flow:work` and `/jira-flow:ship`
put to them. A yes given three turns ago, or a plan that mentioned a PR, is
not a yes now. Take the work as far as it goes without those three acts, then
say in one line what is ready and **ask once**, naming everything that would
happen:

> Ready to ship MA-221: branch `MA-221-...` at `abc1234`, gates
> green. Shall I raise the PR, merge it, and close MA-221?

The plugin's `ask-before-ship` hook turns those three acts into a permission
prompt whatever route they are attempted by. It is a backstop, not the rule:
the asking belongs in the report, in words, before a prompt ever appears.

## Naming

- Summaries are outcomes in plain words, no ticket-speak.
- Descriptions follow the templates in `.claude/jira/taxonomy.md`: what and why, where in
  the repo, acceptance criteria, which gates.
- Labels as the taxonomy lists them. Bugs are type `Bug` and also carry the
  `bug` label.
- No em dashes in summaries or descriptions; use hyphens, colons, commas.

## What not to do

- Do not create an issue for a typo-sized change inside a story already in
  progress; comment on that story instead.
- Do not transition to `Done` yourself unless asked (here: after the merge, see ship-autopilot.md); `Done` means merged.
- Do not delete issues. Ever. Say what should be deleted and let the reader
  do it.
- Do not paste secrets, tokens or device identifiers into Jira.
