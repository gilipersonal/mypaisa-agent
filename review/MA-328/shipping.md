# MA-328 PR packaging

5 November 2026. User request: “can you push all this and raise a PR please”.

The report, coverage, evidence, both independent-review rounds and checklist lessons were copied byte-for-byte into an isolated worktree at the same `b69fb34` source baseline. The round-2 delivery-manifest hashes still match. The original checkout and its unrelated `.claude/launch.json`, `AGENTS.md` and `screenshots/` were left untouched. Statements in the assessment/review records about no commit or PR describe their original delivery; this packaging step follows the subsequent explicit request.

Repository bookkeeping adds MA-328 to `docs/trace.json`'s non-phase `others` register, and removes the inappropriate Jira `manual`/`design` labels: this is an agent-produced report with a PR, not a manual account task or a new UI implementation. The trace is In Progress; the Jira issue moves one step to In Review when the PR opens, as the repository permits. Rendering `docs/TRACE.md` produces no change for this non-phase entry.

The first staged-file Gitleaks scan flagged the `tokens.css` SHA-256 in the evidence source manifest as a generic API key. The value was recomputed from the source bytes and matched. `.gitleaks.toml` extends all default rules and adds one exception requiring all of: the generic-api-key rule, the exact evidence manifest path, and the exact checksum. No directory or entire rule is excluded.

The exception was exercised through temporary staged Git repositories: the exact checksum at the exact path passed; the same checksum elsewhere was still detected; a different synthetic hash at the evidence path was still detected. The actual staged scan then passed with no leaks. A preliminary directory-mode fixture used absolute paths and did not exercise the relative Git-path condition; the staged-Git fixtures match the repository's actual scanning route.

Shipping verification:

- Plan-sync selftest ran fresh in the worktree: 57 board-name cases, 18 PR-file cases, 4 cache cases, 11 Jira-sync cases, 41 mutated records, plus hook checks; zero wrong.
- Plan-sync check: 247 phase items, zero drift, 61 existing notes; the non-phase MA-328 register entry is additional.
- PR-file ownership check: MA-328 recognized; zero product source files changed.
- Security pipeline: gitleaks, semgrep, OSV and zizmor passed under existing dependency filters and workflow suppression; the staged scan also passed after the exact checksum exception.
- Review state validates. The fixed-list runner reports two semantic manual entries, not failures; both were verified HELD by the fresh round-2 verifier and the exact reviewed content remains unchanged.
- Staged source/document whitespace check passed. The three retained `.diff` receipts are excluded from that whitespace check because their blank context lines require the unified-diff space prefix; their bytes are preserved.

No UI implementation, merge, issue closure or design publication is included in this PR request.
