# Independent review in this repo

The global rule (`~/.claude/CLAUDE.md`, "Independent review before anything is
shown") sets how every review runs: gates first, fresh and blind reviewers in
parallel lanes, round 1 on everything and later rounds on the delta, a fixed
list with a regression runner, at most five rounds. This file is where the repo
specialises it, as the global rule asks; where the two differ, this file wins.

## When a review runs

Only when Arun says so. It is offered in the merge question
(`.claude/rules/ship-autopilot.md`, "The independent review is opt-in", MA-157):
"merge it" or "merge now" merges with no review; a bare "yes", or any answer
that asks for the review, means review first, then merge on a clean round.
Arun can also ask for a reviewer at any other time.

## How it runs here

As `ship-autopilot.md` "Review first" says, and `/autoship` step 3 does:

- **Gates:** `python3 scripts/plan_sync.py selftest`, `check`, the story's
  other gates, and `python3 scripts/review_regress.py MA-<n>`.
- **Lanes:** scripts and checks; the trace against Jira; the spec docs
  (`ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `README.md`, the explainer
  pages); the rules and skills; the boards and the design mirror when they
  change. All in one message, each blind to the making.
- **The ledger** is per story: `review/MA-<n>/fixed.json` (each fixed blocking
  finding, and any owner decision the review must keep, with a check that tests
  the behaviour, not the code's text; a story with no ledger yet has nothing to
  re-check, and the runner says so) and
  `review/MA-<n>/state.json` (rounds, the reviewed sha, Arun's word for any
  round past five). `scripts/review_regress.py MA-<n>` runs the checks; a
  `manual` check is one the reviewers must look at.

## Lessons from reviews (the checklist)

Added the day each was learned; reviewers check every item.

1. **A board is checked against its story's acceptance, line by line.** Every
   screen or state the acceptance needs is drawn on a listed board or named in
   the row's `undrawn` list, including the messages a change sends and the
   failure outcomes (PR #32, rounds 2 to 8: MA-35, MA-39, MA-80, MA-116,
   MA-130, MA-137, MA-145).
2. **A wording change is searched across line breaks and in every page** that
   repeats the docs, the explainer pages included (PR #32 round 8: "an
   admin's" split over a line in PLAN.md; the Journey page's Rule 4 card).
3. **A fixed-list check tests what the fix does.** A grep on code text passes
   while the fix is broken; mutate a copy and expect the refusal (PR #32
   round 8).
4. **A board name is checked against what the canvas shows:** its captions,
   and a number from the chip the canvas prints, never a hidden id (PR #32
   rounds 2 to 7; the selftest holds the cases).
5. **An owner decision changes every record at once:** the docs, the trace,
   the Jira descriptions (not only summaries or comments), the boards and the
   explainer pages (PR #32: one admin; read only except for admin).
