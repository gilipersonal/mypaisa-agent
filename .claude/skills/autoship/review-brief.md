# The reviewer brief

Every reviewer in this repo gets this brief, filled in by the coordinator, and
nothing else (`.claude/rules/independent-review.md`, MA-303). One brief per
lane, every lane started in one message. The same brief, cut to its `manual`
items, goes to the one verifier that an exit 3 from
`python3 scripts/review_regress.py MA-<n>` calls for.

## What the reviewer gets

1. **The story and its acceptance.** The key (`MA-<n>`), the PR number, the
   summary, and the acceptance criteria word for word from the Jira story.
2. **The rules.** Every file in `.claude/rules/`, and the lessons in
   `.claude/rules/independent-review.md`; the reviewer checks every lesson
   that touches its files.
3. **The exact file list** for its lane:
   - round 1: every file the PR changes in the lane;
   - from round 2: only `git diff <previous reviewed_sha>..HEAD` (the sha is
     in `review/MA-<n>/state.json`) and its direct joins: the callers and
     callees of a changed function, the spec a changed file builds to
     (its ARCHITECTURE section, its trace row, its boards), and the docs that
     cite it. Never the whole PR again.
4. **The fixed list.** Every entry in `review/MA-<n>/fixed.json`, with this
   line: "These are fixed and held by a check. Never propose undoing any of
   it." A retired entry is listed as retired, with Arun's words.
5. **Never the maker's notes.** No plan, reasoning, summary of the work or
   earlier round's discussion. The reviewer reads the files as a stranger.

## The lanes

(a) scripts and checks; (b) the trace against Jira; (c) the spec docs
(`ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `README.md`, the explainer
pages); (d) the rules and skills; (f) the code (`web/`, `ios/`, `backend/`,
`infra/`), once the story has code. The boards' lane (e) left the review with
MA-303, so no reviewer judges a board; Arun does, by eye. A lane with nothing
in the round's files sits the round out.

## What the reviewer returns

Give the reviewer this, word for word:

> Report only what no gate measures. For each finding: id
> (R<round>-<lane letter><n>), severity P0-P3, blocking yes/no, file:line,
> evidence, the correction.

- **Severity:** P0 breaks the product, loses data or leaks it; P1 breaks the
  story's acceptance or a rule; P2 is wrong but contained; P3 is polish.
- **Blocking** is the reviewer's call: yes when the PR must not merge with it.
- **Evidence** is what was read or run and what it showed: the quoted line,
  the command and its output. A finding with no evidence is not a finding.
- **The correction** is the smallest change that fixes it, and the records it
  must change together (lesson 5).
- No finding says "add a gate on the boards": the owner retired those (MA-303).

## What the coordinator does with the findings

- Merges the lanes into one list. Two lanes that report at the same
  `file:line` become one finding under one id, naming both lanes.
- Records each in `review/MA-<n>/state.json` under `findings[]` (`id`,
  `severity`, `blocking`, `lane`, `anchor`, `evidence`, `status`), with the
  round's `review_approval`, `gate_results`, `deferred_gates` and
  `next_round`, and the round's `range` (the `git diff` range it covered),
  then runs `python3 scripts/review_regress.py --state MA-<n>`. Those
  per-round fields are type-checked whenever present and required on every
  round from MA-303's own rounds on; `--state` may run before round 1, since
  a story with no state file has had no rounds yet.
- Fixes the blocking findings, adds each to `fixed.json` with a check that
  tests what the fix does (lesson 3), and asks Arun before the next round.
  A ledger entry's id is the finding's, `r<round>-<lane letter><n>` (as
  `r1-d2`), matched in any case, so `R1-d2` names the same entry; an owner
  decision carries no round (`o1`).
- Turns a finding a command could have caught into a check the same day, and
  a new lesson into `.claude/rules/independent-review.md`.
