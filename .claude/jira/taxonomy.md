# Jira taxonomy for mypaisaa-agent

Site `https://duttaarun2015.atlassian.net`, cloudId `81c51173-bbea-4905-bbc5-1a880fa348bb`, project key `MA`. Written by
`/jira-flow:init` on 2026-10-23; edit it as the backlog grows. The ids the
tools need (transitions, fields) live in `.claude/jira-flow.json`; this file
holds what a person decides: where work goes, how issues are written.

## Hierarchy

| Level | Jira type | Meaning here |
| --- | --- | --- |
| Feature | **Epic** | One shippable capability |
| Story / Task / Bug | Story, Task, Bug | One PR-sized unit of work |
| Subtask | Subtask | Only when a story needs a checklist tracked separately |

The project also has a Jira issue type called Feature; it is not used here. A
feature is filed as an Epic.

## Epics

No epics yet: the project was empty when this file was written. Add a row per
epic as it is created.

| Key | Summary | Labels |
| --- | --- | --- |

Where a change goes, by path (fill this in as the repo's shape settles):

| Path | Epic |
| --- | --- |
| `src/**` | |
| `.github/**`, `.claude/**`, repo docs | |

## Labels

No labels in use yet. `bug` marks bugs; add platform and theme labels here
(and in `jira.labels` in `.claude/jira-flow.json`) as they are chosen.

Bugs are type `Bug` and also carry the `bug` label so one JQL
covers them.

## Statuses and transitions

Ids read from MA-1's transitions by `/jira-flow:init --refresh` on 2026-10-23.

| Status | transitionId | When |
| --- | --- | --- |
| To Do | 11 | created |
| In Progress | 21 | first edit for the story |
| In Review | 31 | PR raised |
| Done | 41 | PR merged (only when asked) |

## Story template

```
As <the user | the developer | the operator> I want <outcome> so that <why>.

**Where.** <paths>
**Acceptance.**
- <observable result 1>
- <observable result 2>
- Gates: <lint/typecheck/test/build ...>; verified on <what>
**Depends on.** <keys, or none>
```

## Bug template (issue type Bug, plus label `bug`)

```
**Where.** <surface, platform, environment>
**Version / build.** <branch or commit, device or runtime, OS version>
**Steps.** 1. ... 2. ...
**Actual.** ...
**Expected.** ...
**Evidence.** <screenshot path, failing test name, log excerpt>
**Suspect.** <file:line if known>
```

## Epic template

```
**Goal.** <one paragraph>
**Where.** <paths>
**Done when.** <the observable end state>
**Rules.** <the .claude/rules and skills that apply>
```

## Comment template (on landing a change)

```
**Change.** <one line>
**Files.** <list, grouped>
**Gates.** <name: result, ...>
**Verified.** <what was looked at; evidence path>
**Open.** <follow-up keys created, or none>
**Branch.** <name> at <short sha>
```

## JQL you will use

- In flight: `project = MA AND status = "In Progress" ORDER BY updated DESC`
- Waiting on merge: `project = MA AND status = "In Review" ORDER BY updated DESC`
- Next up: `project = MA AND status = "To Do" AND issuetype != Epic ORDER BY priority DESC, Rank ASC`
- An epic's children: `project = MA AND parent = MA-<n> ORDER BY status, Rank`
- Bugs: `project = MA AND (issuetype = Bug OR labels = bug) AND statusCategory != Done`
- Duplicate check before creating: `project = MA AND summary ~ "<two or three words>"`
