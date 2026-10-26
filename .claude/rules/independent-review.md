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

- **Gates:** `python3 scripts/plan_sync.py selftest`, `check`,
  `python3 scripts/contrast_check.py --selftest` and `python3 scripts/contrast_check.py`, the story's other gates, and `python3 scripts/review_regress.py MA-<n>`.
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
6. **A fixed-list check on a to-do list passes once the item is done, and only
   then.** "Still listed as undrawn" broke the moment MA-158 drew the screens.
   The check is "listed, or that item's own evidence": the boards that draw it
   (`or_drawn` names the file and the boards), the fixed text in its mirrored
   board, or the row's notes saying `Drawn: <the item, as it was listed>` or
   `Settled: <the question's words up to its first colon>` (the trace schema's
   convention; its needle is the item's or question's opening words). Never a
   Jira status, a count of boards, or "the whole list is empty" (MA-158, PR #35
   rounds 1 to 3).
7. **A new precondition is checked in every record that lists steps or
   prerequisites:** the README's set-up and prerequisites, PLAN's rows and
   phase exit, the explainer pages' phase lists, Jira's "Depends on", and the
   install commands (PR #33 rounds 1 and 2: secrets put before the apply that
   makes their parameters; Terraform 1.9, then `brew install terraform`, left
   in the README).
8. **A pick supersedes the drawn flow everywhere at once:** ARCHITECTURE, both
   explainer pages, the Prototype's links, the superseded boards' notes, the
   picked boards' own notes, the decision record's dependencies, the trace
   row's notes and the Jira story (PR #34
   rounds 1 and 2: 1a's buttons left on the Journey and Market pages; boards 4
   and 5 still "Planned" and pointing into 1a).
9. **Every change drawn on a board shows its card, Confirm and the audit row,
   with the second check where ARCHITECTURE asks for one, cancelling included, and no state is drawn that the
   docs make impossible** (PR #35 round 1: "Leave it out saves the rest" with
   no Confirm; an invite cancelled at once; "already linked" on a page nobody
   is signed in to). A board fix that cannot reach Claude Design goes into
   each affected story's `undrawn` list, naming the issue that carries it
   (MA-160).
10. **Illustrative figures add up, on every board and across boards:** a list
    sums to the total above it, a holding shows the same value on every board
    that shows it, and the dates and weekdays on a set of boards agree with
    each other (and with the year, where one is shown) (MA-161: the brief for the iOS boards listed five holdings summing to
    £25,914 under a £24,110 total; a drawing lane caught it before any board
    shipped).
11. **A shared stylesheet or script is checked on every board that uses it,
    settled and with `?static=1`:** a change to `tokens.css`, `ios.css` or the
    motion files lands on every board at once (MA-161: the arrival keyframes
    reset the transform that centres chart dots, labels and axis rows; the
    figure roll flattened privacy masks; white badge text failed on the dark
    crimson). A colour a board adds goes into `tokens.css` as a token, and its
    pair into `scripts/contrast_check.py`'s `PAIRS`, before the board uses it.
12. **A gate fails closed, and its selftest proves it bites:** a file it cannot
    find, a block or selector it cannot parse, or a value in a form it does not
    read is a failure, never a skip; and every fault a review found in it is a
    selftest case that mutates a copy and expects the refusal (MA-161 round 1:
    `contrast_check.py` skipped the glass when `ios.css` was missing or its
    dark selector reordered, read an 8-digit hex as opaque, never compared the
    board projects' copies, and measured no chart, bar or mask colour;
    `--selftest` now holds those cases).
13. **One figure set and one ledger behind every set of boards:** before
    boards are drawn, the illustrative household is written once (holdings,
    owners, accounts, day moves, mix, the audit rows with their times, members,
    files and runs, who signs in with what, which devices, the dates people
    joined), and every board takes its figures from it. A board that shows a
    record shows the same record (MA-161 round 1: one £200 buy at three times,
    one cash change by two members on two days, a first sign-in after the
    files it made; `plan_sync.py check` now refuses a wrong weekday).
14. **"Superseded" names exactly what is superseded:** when an owner keeps part
    of the old plan, every note, summary and description that retires the rest
    says which part stays (MA-161 round 1: forty trace notes called the browser
    boards superseded after Arun kept the web app; MA-161's own summary said
    the plan moved "from the web").
15. **Every record of a flow writes the same rows at the same step:** the
    sequence diagrams, the journey page and ARCHITECTURE agree on when each
    row is written and what a cancel leaves (MA-161 round 1: Lucid's sequence
    wrote the `Document` row only at Confirm, against §4.6's "before anything
    reads it"); and a domain, relying party or secret a doc names is checked
    against what the platform allows (a passkey's relying party must be the
    page's own domain or a parent of it, so `auth.` could never serve the
    `console.` page).
