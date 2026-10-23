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

One epic per phase of `PLAN.md`, created on 2026-10-23 (MA-100). Each epic's
stories are numbered in build order, and each names what it depends on. MA-1 to
MA-8 came before the epics and have none.

| Key | Summary | Labels |
| --- | --- | --- |
| MA-9 | Phase 0: accounts, keys, CI and the repo skeleton | |
| MA-10 | Phase 1: the household records what it holds through the chat | |
| MA-11 | Phase 2: daily prices and the ported engine | |
| MA-12 | Phase 3: brief, wrap, alerts and charts in Telegram | |
| MA-13 | Phase 4: chat and research cards | |
| MA-14 | Phase 5: the web app, Mini App and browser | |
| MA-15 | Phase 6: track record and calibration | |
| MA-16 | Phase 7: news, events and sentiment in shadow | |
| MA-17 | Phase 8: stances go live | |
| MA-18 | Phase 9: MyPaisa, the whole wealth tracker (later) | |
| MA-19 | Phase 10: new kinds of holding (when one is added) | |

Where a change goes, by path. A path that serves several phases goes to the
epic of the story at hand; the table is the default.

| Path | Epic |
| --- | --- |
| `pyproject.toml`, `.github/**`, `infra/terraform/` bootstrap, `CLAUDE.md` | MA-9 |
| `src/mypaisa_agent/registry/`, `audit.py`, `runs.py`, `telegram.py`, `docs/`, `handlers/{webhook,agent,docs}` | MA-10 |
| `src/mypaisa_agent/data/`, `engine/`, `handlers/{ingest,engine}` | MA-11 |
| `agent.py` client and validator, `cards/{brief,wrap}`, `alerts/`, charts | MA-12 |
| `tools/`, research `cards/` | MA-13 |
| `web/`, `docs/design/dashboard/`, `handlers/api`, web hosting in `infra/terraform/` | MA-14 |
| `calls/` | MA-15 |
| `news/`, `events/`, `handlers/{news,score}` | MA-16 |
| `wealth/` | MA-18 |
| `.claude/**`, repo docs outside a phase | no epic (a standalone Task) |

## Labels

`bug` marks bugs. Two theme labels (also in `jira.labels.themes` in
`.claude/jira-flow.json`):

| Label | Means |
| --- | --- |
| `manual` | Arun does it by hand (an account, a key, an export); no PR |
| `design` | A design-first story: options, a review board and a pick, before the build story |

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
