# QA and testing in MyPaisa

How the checks fit together (MA-362). The rule is `.claude/rules/testing.md`:
what runs where, which agent, and what guards it. The checklist of lessons is
`docs/qa/checklist.md`. A per-story plan starts from `docs/qa/test-plan-template.md`.

Arun, 26 Nov 2026: "No AXE testing should be done on local". Argos and axe run on
GitHub only when he asks; everything else runs on the laptop, by a dedicated crew agent.

## The test pyramid

| Layer | Tool | Command | Runs | Agent |
| --- | --- | --- | --- | --- |
| Unit | Vitest (web), Jest (ios shell), XCTest (ios), pytest (backend) | `scripts/web_gates.sh`, `scripts/ios_gates.sh`, the backend gate | Laptop; CI runs the Linux ones | The lead, at the join |
| Component | Vitest with Testing Library (web), SwiftUI previews and snapshot tests (ios) | the same gates | Laptop | The lead |
| Functional e2e, web | Playwright in `web/e2e` | `pnpm --dir web test:e2e`, `pnpm --dir web test:e2e:smoke` | Laptop | `crew:qa-web` |
| Functional e2e, iOS | Maestro flows in `.maestro/` | `python3 scripts/maestro_local.py run` | Laptop, pool simulators | `crew:qa-ios` |
| Visual and accessibility, web | Argos (screenshots, ARIA snapshots) and axe, WCAG 2.2 AA | `gh workflow run qa-web.yml -r <branch>` | GitHub only, on Arun's ask | The lead starts it; `crew:qa-web` reads the results |
| Visual and accessibility, iOS | Swift snapshot tests; XCUITest `performAccessibilityAudit()` | `scripts/ios_gates.sh` | Laptop | The lead, `crew:qa-ios` |
| Exploratory | Playwright MCP (web), Maestro MCP (iOS), against `checklist.md` | by the agent | Laptop | `crew:qa-web`, `crew:qa-ios` |

The specs and flows are written by `crew:tester` from the real view hierarchy.
axe is never run on the laptop; no agent runs it or another accessibility engine locally.

## Running each layer locally

- **Unit and gates:** `scripts/web_gates.sh` (add `--offline` to skip the audit),
  `scripts/ios_gates.sh` (`--no-xcode` off a Mac), the backend gate in `.claude/jira-flow.json`.
- **Web e2e:** start the local stack on :8787 and `pnpm --dir web preview`, then
  `pnpm --dir web test:e2e:smoke` (under 2 minutes, `@smoke`) or `test:e2e` (all
  `@regression` too). `@sweep` adds widths 320 to 1920.
- **iOS e2e:** `python3 scripts/maestro_local.py doctor`, then `setup-pool`, `build`,
  `run`. `check-syntax` lints flows with no device. JUnit goes to
  `qa-output/maestro/<ts>/`. One Maestro owner per simulator: `MP-QA-iPhone`,
  `MP-QA-iPad`, `MP-QA-Fold` for `crew:qa-ios` lanes; `MP-Interactive` for the lead
  and the Maestro MCP.
- **Web visual and accessibility:** only on GitHub, and only when Arun asks. Never
  run `axe-core` or any accessibility engine on the laptop.
- Any iOS build or Swift analysis runs on the laptop, never on GitHub Actions.

## The QA flow

On Arun's word (QA runs only when he asks; asking is the yes):

1. The lead starts the local stack and the pool (`maestro_local.py setup-pool`, `build`).
2. One wave, within the caps in `.claude/crew.json` (10 agents; qa-web 4, qa-ios 3):
   `crew:qa-web` lanes by app area, `crew:qa-ios` lanes one per pool simulator. If he
   asked for visuals, the lead runs `qa-web.yml` and one `crew:qa-web` lane reads Argos and axe.
3. At the join the lead writes `review/MA-<n>/qa.md`, files each failure as a Jira bug
   linked to the story, comments on the story, and the merge question comes back.

## Where to read more

- Rule: `.claude/rules/testing.md`
- Lessons applied by QA: `docs/qa/checklist.md`
- Per-story plan: `docs/qa/test-plan-template.md`
- Gates: `scripts/web_gates.sh`, `scripts/ios_gates.sh`
