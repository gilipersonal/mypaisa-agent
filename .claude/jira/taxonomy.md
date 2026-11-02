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

One epic per phase of `PLAN.md` (MA-100), numbered in the order the phases
are built since the re-plan of 26 Oct 2026 (MA-186): MA-9 to MA-19 from the
first plan, MA-127, MA-147 and MA-175 as the later phases were planned, and
MA-187, MA-188, MA-192, MA-189, MA-190 and MA-191 for the whole-wealth phases
2 to 7. MA-307 (2 Nov 2026) retired the market side: its epics MA-11, MA-15,
MA-16, MA-17 and MA-117 are labelled `retired` and Done, and the later phases
renumbered 10 to 15. Every phase ships at both doors, the web app and
the iOS app. Every story under an epic is in `docs/trace.json` with its
ARCHITECTURE sections and its boards (`.claude/rules/plan-sync.md`). MA-1 to
MA-8 came before the epics and have none.

| Key | Phase | Summary |
| --- | --- | --- |
| MA-9 | 0 | Accounts, keys, CI, a local stack and both doors' skeletons; standalone docs and design tasks |
| MA-10 | 1 | The household signs in and talks to the agent at every door, and every run is visible |
| MA-187 | 2 | The first record: one dynamic structure (kinds, records, events, views) and one write path |
| MA-188 | 3 | Deposits, policies and four currencies |
| MA-192 | 4 | Debts and check-ins |
| MA-189 | 5 | Investments, priced |
| MA-190 | 6 | Budget: statements and monthly check-ins |
| MA-191 | 7 | Projection: the household's net worth over the years |
| MA-14 | 8 | Audit, Search and the Admin center at every door, behind the second check |
| MA-18 | 9 | The whole wealth dashboard on prod; the old wealth tracker retired |
| MA-12 | 10 | Alerts, charts and the Claude client |
| MA-13 | 11 | Ask anything about the household's wealth |
| MA-19 | 12 | New kinds of holding (when one is added) |
| MA-127 | 13 | The agent team: configured, approved, self-healing, self-learning |
| MA-147 | 14 | Indian holdings and the existing Indian portfolio |
| MA-175 | 15 | The app beyond the chat: widgets, Siri and Shortcuts, the share sheet and Live Activities (later) |

Where a change goes, by path. A path that serves several phases goes to the
epic of the story at hand; the table is the default. `ios/` is the React
Native app: the Xcode workspace in `ios/`, the TypeScript shell in `ios/src/`,
and the SwiftUI pieces, each hosted through a Fabric component, in
`ios/<App>/`.

| Path | Epic |
| --- | --- |
| `pyproject.toml`, `.github/**`, `infra/bootstrap/`, `CLAUDE.md` | MA-9 |
| `infra/modules/mypaisa/`, `infra/dev/`, `infra/prod/` | MA-9, then the story that adds the resource |
| `ios/`: the app's skeleton and configurations, the shell's skeleton in `ios/src/`, the first SwiftUI piece and its Fabric host, `PERFORMANCE.md` and its benches (MA-165), the tests and lint config, the iOS CI and the TestFlight lanes in `.github/workflows/` | MA-9 |
| `web/`: the SvelteKit skeleton and its CI, and the shared TypeScript in `web/src/lib/` | MA-9 |
| `scripts/local/` (the local stack and its scripted agent), `scripts/seed.sh` and the seed from the design figure set (MA-110) | MA-9 |
| `audit.py`, `runs.py`, `handlers/{api,agent,sender,worker}` for the chat and push, the stream handler (SSE), the Cognito triggers, the docs job, the queues; the web app's hosting at `dashboard(-dev)`, the association file and the invite page (MA-73) | MA-10 |
| the chat at both doors: in `ios/src/` sign-in, the api and SSE client, push and You, and in `ios/<App>/` the chat's SwiftUI pieces (the timeline and its cards, the composer); in `web/` the chat, its sign-in and session cookie and its PWA files (Web Push); `src/mypaisa_agent/cards/schema/`; Activity at every door; the shared motion (MA-182) | MA-10 |
| `src/mypaisa_agent/registry/` (kinds, records, events and views), the write service and its admin-only check, delete through the chat (MA-309), the read and `PATCH` routes of `handlers/api` | MA-187 |
| `wealth/` accrual | MA-188 |
| `wealth/` schedules (loans and cards), the commitments and check-ins | MA-192 |
| `wealth/` XIRR and CAGR; `src/mypaisa_agent/prices/` and `data/` (the price plugins, the chain, input hygiene and the source-comparison report, to value holdings) | MA-189 |
| `importers/statements/` (bank and card statements), the budget | MA-190 |
| `wealth/` projection, its priors | MA-191 |
| a dashboard screen or page at either door (a SwiftUI piece in `ios/`, a route in `web/`) | the story's phase: the first dashboard MA-187, assets MA-189, debts MA-192, Budget MA-190, Projection MA-191, the complete Overview MA-18 |
| the Anthropic client and validator, the alert cards, `alerts/`, charts | MA-12 |
| `tools/` for asking about the household's wealth, the `scenario` card | MA-13 |
| Audit and Files, Search and the Admin center at both doors; the admin role and its grant through the chat (MA-308) | MA-14 |
| reports and exports, the cutover from the old wealth tracker (MA-97), the Excel history importer (MA-111), the read-only SQL copy (MA-104) | MA-18 |
| `agents/`, settings, the admin desk, Step Functions | MA-127 |
| `importers/` for Indian portfolio statements (a CAS, a broker export), the Indian price plugins beyond the minimal NAV pricing | MA-147 |
| the widgets, the share extension and the App Intents in `ios/` | MA-175 |
| `docs/design/ios-v1/`, the browser boards in `docs/design/app-v1/`, `docs/design/ds-v1/`, `docs/trace.json` | the story whose boards they are; sync work under MA-9 |
| the Mini App and Telegram boards in `docs/design/app-v1/`, `docs/design/dashboard/` | the superseded record (MA-161); no new work |
| `.claude/**`, repo docs outside a phase | MA-9 (a standalone Task) |

## Labels

`bug` marks bugs. Three theme labels (also in `jira.labels.themes` in
`.claude/jira-flow.json`):

| Label | Means |
| --- | --- |
| `manual` | Arun does it by hand (an account, a key, an export); no PR |
| `design` | The story changes what a member sees: `ui: true` in the trace, boards in `docs/design/` (or a note, and MA-158, while they are still to draw), and `/design-first` before code |
| `retired` | Closed without being built by an owner decision (MA-307); labelled, commented with the owner's words and moved to Done, and out of PLAN, the trace and the roadmap |

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
