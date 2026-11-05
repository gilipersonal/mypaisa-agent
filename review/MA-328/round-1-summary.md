# MA-328 independent review round 1

5 November 2026. Approval: **“lets independent review the findings”**.

**Result: changes required in the report. All ten underlying design findings were retained.** Two blocking omissions and two smaller clarifications were identified. The report corrections have been applied; they have not yet received an independent delta review. No UI source was changed.

The review used two fresh, blind agents in parallel after gates passed:

| Lane | Reviewer | Scope and outcome |
| --- | --- | --- |
| c | `/root/independent_evidence_r1` | Source/evidence validity of F01–F10. Eight supported as written; F07 and F09 needed qualification. No blocking report defects in this lane. |
| d | `/root/independent_ux_r1` | UX conclusions, priority, recorded decisions and implementation handoff. All ten retained; two blocking report omissions and one contained acceptance inconsistency. |

The reviewed source baseline is `b69fb34535f28d3bdea17e2c951c339b2bb7a519`. Because the deliverable is uncommitted, the exact reviewed report and coverage text are preserved in `round-1/handoff.md` and `round-1/coverage.md`, with all 168 input files pinned by [input-manifest.json](round-1/input-manifest.json). The baseline SHA is not a commit of the report. Later review must cover the snapshot-to-current delta and its direct joins, not repeat the whole assessment.

## Report corrections

| ID | Severity / blocking | What the review found | Applied correction |
| --- | --- | --- | --- |
| R1-d1 | P1 / yes | F02 omitted native-vs-web auth contract errors: native passkey first sign-in, incorrect relying-party annotation and failure to distinguish native joining from browser invite landing. | Added an explicit door/action contract table from ARCHITECTURE §4.5. Native first sign-in is Apple/Google; web also permits passkeys; native passkeys serve second checks; browser never joins; annotations use environment dashboard domains. Updated fix instructions and verification acceptance. |
| R1-d2, also reported as R1-c2 | P1 / yes; lane c's narrower observation was P2/nonblocking | F05/F09 did not document the existing composition picks, risking historical options being treated as current competitors. | Added a decision map for MA-163, MA-193, MA-264, MA-279, MA-295 and later product constraints. Added lifecycle classification to coverage. Home is explicitly settled as 1a Net worth first; planned task flows remain planned. |
| R1-d3 | P2 / no | F06 offered a static-annotation alternative while its acceptance required real interaction. | Removed the alternative as a resolution. The interactive scope control must work; deliberate deferral must remain an open limitation. |
| R1-c1 | P2 / no | F07's exact distances lacked a reproducible state and mixed unscaled scroll dimensions with a transformed rectangle distance. | Named the Dashboard/Home step and removed the unsupported precision from the handoff. Retained the source-supported finding that contextual routes are buried below several screens of content. |

Both lanes' reports are preserved in [lane-c.md](round-1/lane-c.md) and [lane-d.md](round-1/lane-d.md). R1-c2 and R1-d2 concern the same report anchor and are tracked under R1-d2, with both lanes recorded in state.

## Per-finding outcome

| Design finding | Independent outcome |
| --- | --- |
| F01 Theme leakage | Retained, P1. Source cause and supplied screenshot independently supported; pixel sample recalculated as 1.6193:1. |
| F02 Auth state mixing | Retained, P1; strengthened with precise existing platform/auth contracts. |
| F03 Requirements prose as UI | Retained, P1, as an interaction-specification gap rather than a production defect. |
| F04 Named but undrawn states | Retained, P1, with its existing limitation to the cited consolidated board. |
| F05 Navigation inconsistency | Retained, P2; distinguish residual selected-source differences from historical alternatives. |
| F06 Inert scope selector | Retained, P2; aligned fix and acceptance. |
| F07 Buried destinations | Retained, P2; qualitative finding supported, exact measurement precision removed. |
| F08 Small primary-action typography | Retained, P2; no claim that all small metadata or target sizes fail. |
| F09 Source precedence | Retained, P2; recorded picks now explicit and lifecycle status preserved. |
| F10 Foldable platform ambiguity | Retained, P2; conditional platform labelling remains appropriate. |

## Gates and limits

Before reviewer start, plan-sync passed (247 items, 0 drift, 61 notes; selftest reused per unchanged-code policy), product file ownership passed, security_scan.sh passed (gitleaks, semgrep, OSV and zizmor under existing configured filters/suppression), and the regression ledger/state checks passed. The complete gate receipt is [gates.json](round-1/gates.json).

The evidence reviewer could not open a fresh isolated Playwright tab because its profile was occupied. The reviewer did not disturb that browser and stopped their own bounded local server, PID 97209. Source and saved-image checks ran; fresh runtime replay, exact prototype dimensions, actual native behavior, physical brightness and hardware interaction were not independently verified. The other lane used source and saved images only.

Two fixed blocking report omissions are recorded in [fixed.json](fixed.json) with semantic manual checks. Their corrections are author-applied, not independently verified yet. The regression runner reports those manual checks for the next approved round. The project checklist records the authentication, lifecycle and measurement lessons; no board-content gate was added.

Round 2 requires a new yes under [.claude/rules/independent-review.md](../../.claude/rules/independent-review.md). Its scope is limited to the corrected report passages, lifecycle coverage, exact governing source sections and the new checklist lessons. This review did not publish designs, implement UI fixes, create a PR, merge or close MA-328.

Post-correction automated checks passed: plan-sync (247 items, 0 drift), product file ownership, full security pipeline under existing configuration, 285 local links, 25 cited source line ranges, 72 source hashes, 161 image hashes, finding totals and whitespace. Regression state validates; fixed-list runner exits 3 with zero failures and two manual semantic checks awaiting the next approved round. [Artifact check receipt](round-1/report-checks-after.json).

Later outcome: round 2 verified the corrections cleanly. See [round-2-summary.md](round-2-summary.md) for the final status; the pending language above records the historical round-1 outcome.
