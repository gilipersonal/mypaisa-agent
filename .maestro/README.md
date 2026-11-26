# .maestro/: the iOS app's Maestro flows

The functional tests for the MyPaisa iOS app (MA-273), run on the laptop by `crew:qa-ios` lanes, one per
pool simulator. The rule is `.claude/rules/testing.md`; how every layer fits is `docs/qa/README.md`.

```
.maestro/
  config.yaml                    the workspace: flows from flows/**, tags, execution order
  subflows/launch.yaml           opens MyPaisa Dev and waits for the shell; every flow starts with it
  flows/shell/smoke.yaml         the shell opens, the hero draws, each tab answers (smoke)
  flows/shell/accessibility_smoke.yaml   every wired element carries a label (regression)
```

## How to run

Always through the runner, which picks the simulator, installs the build, passes the env and writes the
JUnit report to `qa-output/maestro/<ts>-<device>/`:

```bash
python3 scripts/maestro_local.py run --device MP-QA-iPhone --tags smoke
```

```bash
python3 scripts/maestro_local.py check-syntax
```

`check-syntax` needs no device. The first run on a fresh checkout goes `doctor`, `setup-pool`, `build`,
then `run` (see `docs/qa/README.md`).

### The env a flow gets

| Name | Value | Used for |
| --- | --- | --- |
| `APP_ID` | `com.mypaisapp.agent.dev` (MyPaisa Dev) | `appId` and `launchApp` |
| `API_URL` | `http://localhost:8787`, the local stack | `MYPAISA_API_URL` |
| `VIEWPORT_WIDTH` | a debug width in pt, or empty | `MYPAISA_VIEWPORT_WIDTH`, only when set |

`subflows/launch.yaml` always turns motion off (`MYPAISA_STATIC_MOTION=1`) and keeps the app's state
(`clearState: false`); a flow that needs a clean app clears it itself.

Maestro 2.11 launches an iOS app with `xcrun simctl launch`. Its `arguments:` reach the app as launch
arguments (`-MYPAISA_API_URL <url>`, readable from `UserDefaults.standard`), not as environment. The app
reads its `MYPAISA_*` settings from the process environment, which simctl fills from the Maestro process's
`SIMCTL_CHILD_<NAME>` variables. So the runner exports `SIMCTL_CHILD_MYPAISA_API_URL`,
`SIMCTL_CHILD_MYPAISA_STATIC_MOTION` and `SIMCTL_CHILD_MYPAISA_VIEWPORT_WIDTH` as well as passing `-e`;
the launch subflow sends the arguments too, so the flows hold whichever the app reads.

## Conventions

- **Titles trace to the acceptance.** A flow's `name` starts `MA-<n> AC<k>:`; each assertion's `label`
  starts with its case id, `MA-<n>-AC<k>-<m>`.
- **Selectors are `mp.*` ids** from `ios/MyPaisaCore/Testing/TestIDs.swift` (mirrored in
  `web/src/lib/test-ids.ts`; `scripts/ios_gates.sh` holds the two equal). Text is used only where no id
  exists yet, with a comment saying so, and the missing id is filed for the app.
- **Selectors are read from the real hierarchy**, `maestro hierarchy` or the Maestro MCP's
  `inspect_screen` on the device, never guessed from a screenshot.
- **No fixed sleeps.** Wait on a condition: `extendedWaitUntil` with an id, or an assertion's own wait.
- **Tags.** One suite tag: `smoke` (the set that runs under 2 minutes) or `regression` (the rest). Then the
  device tags the flow holds on: `iphone`, `ipad`, `foldable`. Maestro's `--include-tags` is an OR, so
  `smoke,iphone` would run every iPhone flow; the runner selects by suite tag and leaves out a flow that
  lacks the device's tag.
- **One area per folder:** `flows/<area>/<what>.yaml`; shared steps go in `subflows/` and run with `runFlow`.
- **Synthetic data only.** A flow reads what the local stack's seeds hold; no real names or figures.

## One owner per device

A Maestro CLI run reinstalls its driver on the simulator, which breaks a live Maestro MCP session there.
So each simulator has one owner at a time:

| Simulator | Owner |
| --- | --- |
| `MP-QA-iPhone`, `MP-QA-iPad`, `MP-QA-Fold` | one `crew:qa-ios` lane each, through `scripts/maestro_local.py` (the CLI) |
| `MP-Interactive` | the lead, through the Maestro MCP |

Never point the CLI at `MP-Interactive`, and never run two lanes on one simulator. Showing the app to Arun
stays in Xcode; Maestro drives simulators only for tests.

## What Maestro does not check

Traits, hints, reading order, hit-target size, contrast and Dynamic Type are XCUITest's
`performAccessibilityAudit()` in `ShellUITests`, run by `scripts/ios_gates.sh`. No accessibility engine runs
from these flows. Visual regression is the Swift snapshot tests.
