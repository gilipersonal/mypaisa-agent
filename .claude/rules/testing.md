# Testing: every check has a place, an agent and a guard

Arun, 26 Nov 2026 (MA-362), in six asks:

1. "I would be using Argos CI for visual regression and Accessibility testing on Github pipeline"
2. "I need a framework for performing QA feature/functionaility testing of the application."
3. "For iOS testing, I will use maestro.dev on local (preferrably an MCP may be), setup the best framework."
4. "No AXE testing should be done on local"
5. "CodeQL Swift check, lets turn it off. We dont need to do any iOS build on Github actions ..., all testing and quality check will be done on local."
6. A security framework (MA-363, its own rule).

And: "I want all things to be done locally done my dedicated agents, update the
Crew SubAgents if needed with proper models and effort and concurrency (max 10)".
His answers: Argos and axe run on GitHub "Only When I ask, create a manual
triggered CI"; axe in CI, with Argos ARIA snapshots; the ubuntu `ios-shell` job
stays; iOS visual regression stays local. This file is how it fits this repo. It
changes no other rule: when QA, a review, plan-sync or the scan runs stays as
`.claude/rules/ship-autopilot.md` and `.claude/rules/crew.md` say.

## The checks

| Check | Runs | Agent | When |
| --- | --- | --- | --- |
| Unit tests: Vitest (web), Jest (ios shell), XCTest (ios), pytest (backend) | Laptop, in the story's gate (`scripts/web_gates.sh`, `scripts/ios_gates.sh`, the backend gate); CI runs the Linux ones, Jest included in `ios-shell` | The lead, at the join | Every story, no asking |
| Web functional e2e: Playwright in `web/e2e`, `pnpm --dir web test:e2e` (Chromium and WebKit, 390x844 and 1440x900, light and dark; `@sweep` 320 to 1920 opt-in), `test:e2e:smoke` | Laptop | `crew:qa-web` (Opus, high) | Arun asks for QA |
| Web exploratory QA: the Playwright MCP, against `docs/qa/checklist.md` | Laptop | `crew:qa-web` | Arun asks for QA |
| Web visual and ARIA snapshots (Argos) and accessibility (axe, WCAG 2.2 AA, fail closed) | GitHub only: `.github/workflows/qa-web.yml`, `workflow_dispatch` | The lead starts it (`gh workflow run qa-web.yml -r <branch>`); one `crew:qa-web` lane reads Argos and the axe results | Arun asks for visuals or accessibility |
| iOS functional: Maestro flows in `.maestro/`, `scripts/maestro_local.py run`, and the Maestro MCP | Laptop, simulators `MP-QA-iPhone`, `MP-QA-iPad`, `MP-QA-Fold` | `crew:qa-ios` (Opus, high), one lane per simulator | Arun asks for QA |
| iOS accessibility: XCUITest `performAccessibilityAudit()` in `scripts/ios_gates.sh` | Laptop | The lead, in the ios gate | Every iOS story |
| iOS visual: Swift snapshot tests | Laptop | `crew:qa-ios` | Arun asks for QA |
| Writing Playwright specs and Maestro flows from the real view hierarchy | Laptop | `crew:tester` (Opus, high) | When a story needs its tests |
| Any iOS build or Swift analysis (build, test, CodeQL Swift) | Laptop only, never GitHub Actions | The lead and `crew:qa-ios` | As the work needs |
| Security | See `.claude/rules/security.md` (MA-363); `crew:sec-scan`, `crew:sec-verify` | | Arun's yes |

Nothing in the QA rows runs unasked. Asking for QA himself is the yes: "run QA
on the Plans page" starts it at once.

## axe never runs on the laptop

Arun, MA-362: "No AXE testing should be done on local". Four things hold it:

- **One importer.** `axe-core` is imported only in `web/e2e/fixtures/qa.ci.ts`.
  `scripts/web_gates.sh` counts the importers and fails unless there is exactly one.
- **A guard.** `qa.ci.ts` refuses to run outside GitHub Actions.
- **No agent runs an accessibility engine.** No crew agent, skill or audit does:
  not `crew:qa-web`, not `crew:ux-auditor`, not the design-skills accessibility
  audit, not an impeccable audit. They read CI's results (the Argos build and the
  axe report that `qa-web.yml` leaves), and judge by eye or by the Playwright and
  Maestro flows.
- **iOS has its own check:** `performAccessibilityAudit()` in the ios gate, not axe.

## Tests trace to the acceptance

- A test's title starts `MA-<n> AC<k>:`, naming the story and the acceptance line
  it proves; a case id is `MA-<n>-AC<k>-<m>`.
- Selectors come only from `web/src/lib/test-ids.ts` and
  `ios/MyPaisaCore/Testing/TestIDs.swift`. Each element a flow taps has an `mp.*`
  id in both; `scripts/ios_gates.sh` checks the two match.
- Tags: `@smoke` is the set that runs under 2 minutes; `@regression` is the rest.

## The QA flow

On Arun's word, the lead:

1. Starts the local stack on :8787 and `pnpm --dir web preview`, and runs
   `scripts/maestro_local.py setup-pool` and `build`.
2. Starts one wave, within the caps in `.claude/crew.json` (10 live agents; qa-web 4,
   qa-ios 3): `crew:qa-web` lanes by app area, and `crew:qa-ios` lanes, one per pool
   simulator.
3. If he asked for visuals, runs `qa-web.yml`; one `crew:qa-web` lane reads Argos
   and the axe results.
4. At the join writes `review/MA-<n>/qa.md`, files each failure as a Jira bug linked
   to the story, comments on the story, and puts the merge question again with QA's
   findings (`.claude/rules/crew.md`). QA's yes covers one pass, not the merge.

## One Maestro owner per simulator

A Maestro CLI run reinstalls the driver and breaks a live MCP session on that
device. So each simulator has one owner at a time: `MP-QA-*` belong to `crew:qa-ios`
lanes (the CLI), `MP-Interactive` to the lead and the Maestro MCP. Showing the app
to Arun stays in Xcode; Maestro drives simulators only for tests.

## Where results go

- `review/MA-<n>/qa.md`: the QA report (the template is `docs/qa/test-plan-template.md`).
- `qa-output/` (gitignored): Playwright traces and reports, Maestro JUnit and
  screenshots in `qa-output/maestro/<ts>/`.
- Argos: the build `qa-web.yml` sends; the axe report is that run's artifact.
- Jira: a bug per failure, linked to the story, and a comment on the story.

See `docs/qa/README.md` for how to run each layer.
