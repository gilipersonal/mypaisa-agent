# Test plan: MA-<n> <story summary>

The plan for one story (MA-362). Copy it to `review/MA-<n>/test-plan.md` when the
story's tests are written; the report at the end goes to `review/MA-<n>/qa.md`.
The rule is `.claude/rules/testing.md`. axe never runs on the laptop: accessibility
cases for the web are CI's (`qa-web.yml`, on Arun's ask); for iOS they are
`performAccessibilityAudit()` in the ios gate.

## Story

- **Key:** MA-<n>
- **Branch and sha:** `MA-<n>-<slug>` at `<sha>`
- **Acceptance:** one line per criterion, numbered AC1, AC2, ... as the Jira story lists them.

## Cases

One row per case. The id is `MA-<n>-AC<k>-<m>`, and the spec's title starts `MA-<n> AC<k>:`.
Layer is unit, component, functional e2e, visual, accessibility or exploratory.
Selectors come only from `web/src/lib/test-ids.ts` and `ios/MyPaisaCore/Testing/TestIDs.swift`.

| AC | Case id | Layer | Automated spec or Maestro flow path | Manual steps | Widths / devices | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC1 | MA-<n>-AC1-1 | functional e2e | `web/e2e/specs/<area>/<name>.spec.ts` | none | 390x844, 1440x900, light and dark | pass, fail or not run |
| AC1 | MA-<n>-AC1-2 | functional e2e | `.maestro/flows/<area>/<name>.yaml` | none | MP-QA-iPhone, MP-QA-iPad, MP-QA-Fold | |
| AC2 | MA-<n>-AC2-1 | exploratory | none | the steps, one per line | | |

Every acceptance line has at least one case. A tag: `@smoke` (the set under 2
minutes) or `@regression`.

## Report (goes to `review/MA-<n>/qa.md`)

- **Run:** date, who asked, the sha, the agents and lanes (`crew:qa-web` by area,
  `crew:qa-ios` by simulator), and whether `qa-web.yml` was run and its link.
- **Result by acceptance:** AC | cases run | passed | failed | not run, and why.
- **Failures:** each with its case id, evidence (trace, screenshot, JUnit path in
  `qa-output/`), and the Jira bug filed and linked to the story.
- **Argos and axe (only if Arun asked for visuals):** the Argos build, the axe
  report, and what each found. Read from CI, never run on the laptop.
- **Not covered:** plainly, with the reason.
- **Verdict:** ready to merge, or fix first, with the findings that block.
