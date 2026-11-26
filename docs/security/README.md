# MyPaisa security records

Arun, 26 Nov 2026 (MA-363): "I need a framework/Agent setup to do Security/Vulnerability using the best
skills/plugins you have", and "I want all things to be done locally done my dedicated agents". This folder holds
the records. The rule is `.claude/rules/security.md`; the procedure is the `/sec-check` skill
(`.claude/skills/sec-check/SKILL.md`).

## What is here

| File | Holds |
| --- | --- |
| `threat-model.md` | Assets, actors and nine trust boundaries (STRIDE), each row marked built or planned, the findings F1 to F12 (Jira MA-366), the open questions for Arun, the accepted risks, and when to update it |
| `standards-map.md` | ASVS 5.0 L2, MASVS 2.x L1, the OWASP Top 10 for LLM 2025 and for Agentic 2026, and CIS AWS: what checks each today, by path, and what is missing |
| `scanner-gaps.md` | What `scripts/security_scan.sh` and the gates do not see, and what to add; the `ios` mode and the Swift rules |
| `sweeps.json` | The registry of verified sweeps: five zones and the sweeps run so far |

The scanners themselves are `scripts/security_scan.sh` (modes `all`, `secrets`, `sast`, `deps`, `workflows`, `ios`,
`staged`, `selftest`, `swift-proof`) and `scripts/security_scan_selftest.sh`.

## The layers

1. **Deterministic scans, no agent.** In CI on every PR and push to `main`: `scripts/security_scan.sh` on Linux
   (gitleaks, semgrep without Swift, osv-scanner, zizmor), CodeQL for actions, JavaScript and TypeScript and
   Python, Dependabot, secret scanning with push protection. Every Monday at 04:00 UTC the same scans run again.
   On the laptop the same script also runs semgrep's Swift rules and the `ios` mode; no Swift analysis runs on
   GitHub (MA-166).
2. **Agent passes, on the laptop, on Arun's yes.** `/sec-check` runs `crew:sec-scan` (one per scan mode),
   `crew:security` (the changed zones against the threat model), `claude-security:scan` (the branch diff, alone),
   and `crew:sec-verify` (one per real finding, to prove or drop it). `/sec-check --phase` and
   `/sec-check --sweep <zone>` are the periodic passes.

## When each runs

| Cadence | What | Who runs it |
| --- | --- | --- |
| Every PR | `scripts/security_scan.sh` on Linux, CodeQL (actions, JavaScript and TypeScript, Python), Dependabot's weekly grouped updates, and the weekly Monday sweep | CI, on its own |
| End of every story | `/sec-check`: the scans for what the change touches, then the agent passes | The lead, on Arun's yes, asked once at the end of the work with plan-sync and the PR (`.claude/rules/ship-autopilot.md`) |
| Phase exit | The threat model refreshed by `crew:security`; `claude-security:attack-surface-analysis` before the first prod release | The lead, on Arun's yes (`/sec-check --phase`) |
| Monthly | `verified-security-sweep` over one zone, rotating through the five in `sweeps.json` | The lead, on Arun's yes (`/sec-check --sweep <zone>`) |

Every local scan and every agent pass waits for Arun's yes. CI and the hooks run as configured.

## Where findings go

- A confirmed finding becomes a Jira Bug (labels `bug` and `security`, priority from severity), linked to the story
  that found it. Findings that are design gaps are listed in the threat model with their story.
- A fixed blocking finding gets a check in `review/MA-<n>/fixed.json` that passes while the fix holds, and the
  regression runner (`python3 scripts/review_regress.py MA-<n>`) re-runs it (`.claude/rules/independent-review.md`).
- A finding names a file, a line and a rule. It never carries a secret's value.
- The first twelve findings are one Jira task, MA-366.
