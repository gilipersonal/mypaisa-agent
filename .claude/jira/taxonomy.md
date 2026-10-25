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

One epic per phase of `PLAN.md` (MA-100, then MA-117, MA-127 and MA-147 as
phases 11 to 13 were planned). Every story under an epic is in
`docs/trace.json` with its ARCHITECTURE sections and its boards
(`.claude/rules/plan-sync.md`). MA-1 to MA-8 came before the epics and have
none.

| Key | Phase | Summary |
| --- | --- | --- |
| MA-9 | 0 | Accounts, keys, CI and the repo skeleton; standalone docs and design tasks |
| MA-10 | 1 | The household records what it holds through the chat |
| MA-11 | 2 | Daily prices and the ported engine |
| MA-12 | 3 | Brief, wrap, alerts and charts in Telegram |
| MA-13 | 4 | Chat and research cards |
| MA-14 | 5 | The web app, Mini App and browser, the Admin center |
| MA-15 | 6 | Track record and calibration |
| MA-16 | 7 | News, events and sentiment in shadow |
| MA-17 | 8 | Stances go live |
| MA-18 | 9 | MyPaisa, the whole wealth tracker (later) |
| MA-19 | 10 | New kinds of holding (when one is added) |
| MA-117 | 11 | The Forecaster beside the rules engine (later) |
| MA-127 | 12 | The agent team: configured, approved, self-healing, self-learning (later) |
| MA-147 | 13 | Indian markets and the existing Indian portfolio (later) |

Where a change goes, by path. A path that serves several phases goes to the
epic of the story at hand; the table is the default.

| Path | Epic |
| --- | --- |
| `pyproject.toml`, `.github/**`, `infra/bootstrap/`, `CLAUDE.md` | MA-9 |
| `infra/modules/mypaisa/`, `infra/dev/`, `infra/prod/` | MA-9, then the story that adds the resource |
| `src/mypaisa_agent/registry/`, `audit.py`, `runs.py`, `telegram.py`, `handlers/{webhook,agent,sender,worker}`, the docs job, the queues | MA-10 |
| `src/mypaisa_agent/prices/`, `data/`, `engine/` | MA-11 |
| the Anthropic client and validator, `cards/{brief,wrap}`, `alerts/`, charts | MA-12 |
| `tools/`, research `cards/` | MA-13 |
| `web/`, `handlers/api`, the authorizer, web hosting, the Admin center | MA-14 |
| `calls/`, scoring | MA-15 |
| `news/`, `events/` | MA-16 |
| `wealth/` | MA-18 |
| `forecaster/`, the backtest lab | MA-117 |
| `agents/`, settings, the admin desk, Step Functions | MA-127 |
| `importers/` for Indian statements, the Indian price plugins | MA-147 |
| `docs/design/app-v1/`, `docs/design/ds-v1/`, `docs/trace.json` | the story whose boards they are; sync work under MA-9 |
| `.claude/**`, repo docs outside a phase | MA-9 (a standalone Task) |

## Labels

`bug` marks bugs. Two theme labels (also in `jira.labels.themes` in
`.claude/jira-flow.json`):

| Label | Means |
| --- | --- |
| `manual` | Arun does it by hand (an account, a key, an export); no PR |
| `design` | The story changes what a member sees: `ui: true` in the trace, boards in Claude Design (or a note, and MA-158, while they are still to draw), and `/design-first` before code |

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
