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
Arun can also ask for a reviewer at any other time. **Each round needs its own yes**
(Arun, 25 Oct 2026: "ask me before the reviews please"): a yes covers one round;
after fixing a round, report it and ask before the next.

## How it runs here

As `ship-autopilot.md` "Review first" says, and `/autoship` step 3 does:

- **Gates:** `python3 scripts/plan_sync.py selftest`, `check`,
  `python3 scripts/contrast_check.py --selftest` and `python3 scripts/contrast_check.py`, the story's other gates, and `python3 scripts/review_regress.py MA-<n>`.
- **Lanes:** scripts and checks; the trace against Jira; the spec docs
  (`ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `README.md`, the explainer
  pages); the rules and skills; the boards and the design mirror when they
  change. All in one message, each blind to the making.
- **Scope of each round** (Arun, 26 Oct 2026: "make sure for each review round
  you are only reviewing the fixes made in previous round, MAX 5 rounds"):
  round 1 reviews everything; every later round reviews only the fixes made
  since the previous round, `git diff <previous reviewed_sha>..HEAD`, and their
  direct joins, never the whole PR again. Five rounds at most, unless Arun
  asks for more (ship-autopilot's round-6 question); the range of each is
  recorded in `state.json`.
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
    pair into `scripts/contrast_check.py`'s `PAIRS`, before the board uses it;
    a label colour on glass goes into `ios.css` as an `--lg-*` value and into
    `GLASS_TEXT`. A motion role sits only on the element its keyframe was made for
    (`label` on `.mp-chartlbl`, `dot` on `.mp-chartdot`); `plan_sync.py check`
    refuses a `label` or `dot` attribute anywhere else, however it is quoted
    (fix: `fade`), and a board rule giving a `.mp-chartlbl` or `.mp-chartdot`
    variant its own transform without `!important` (fix: `!important`, since
    motion.js gives every chart label and dot its role at run time) (MA-161
    rounds 2 and 3: chart axes and two browser labels moved once the arrival
    settled).
12. **A gate fails closed, and its selftest proves it bites:** a file it cannot
    find, a block or selector it cannot parse, or a value in a form it does not
    read is a failure, never a skip; and every fault a review found in it is a
    selftest case that mutates a copy and expects the refusal (MA-161 round 1:
    `contrast_check.py` skipped the glass when `ios.css` was missing or its
    dark selector reordered, read an 8-digit hex as opaque, never compared the
    board projects' copies, and measured only three chart colours and the
    meter: never chart-4 or chart-5, the currency and asset marks, the
    pillars, the marks on a bar's track, the track, the masks or the hero's
    gain;
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
    says which part stays (MA-161 round 1: forty-nine trace notes called the browser
    boards superseded after Arun kept the web app; MA-161's own summary said
    the plan moved "from the web").
15. **Every record of a flow writes the same rows at the same step:** the
    sequence diagrams, the journey page and ARCHITECTURE agree on when each
    row is written and what a cancel leaves (MA-161 round 1: Lucid's sequence
    wrote the `Document` row only at Confirm, against §4.6's "before anything
    reads it"); and a domain, relying party or secret a doc names is checked
    against what the platform allows (a passkey's relying party must be the
    page's own domain or a parent of it, so `auth.` could not serve the
    `console.` page without a related-origins file).
16. **A selftest proves the gate, not its harness:** each case names the
    failure it expects, and the harness makes no failure of its own (MA-161
    round 2: the contrast selftest copied the files before mutating them, so
    every case failed on "copies differ", and a gate with round 1's fixes
    reverted still passed all eleven).
17. **A fix's check searches every phrasing of the fault,** in every record
    (lesson 2), not only the sentence the reviewer quoted (MA-161 round 2:
    r1-c2's search matched three phrasings of the old width rule; seven more
    sentences in ARCHITECTURE, PLAN and decision.md said the same).
18. **A closed list is closed only after every record that grants the
    thing is read, and an open question is recorded on every story it
    decides** (MA-161 round 2: "and nothing else" left out the admin's chat;
    MA-35's and MA-77's questions also decide MA-171 and MA-76).
19. **A record drawn at a time changes every frame drawn after it:** a
    figure set has a clock, and a change at 08:41 shows in every later frame
    or comes after the last one (MA-161 round 2: the £200 buy at 08:41 beside
    Home at 9:41 still showing the total before it).
20. **A check reads every form the thing can take:** a date beside a tag or
    after a `<` in a script, a token in a second block or inside `@media`, a
    role in single quotes, or a chart label's variant transform that motion.js
    would override at run time, an arrow drawn
    `->>` or `<-` (MA-161 round 3: the round-2 date reader glued "Oct" to the
    next element and lost thirteen dates; the stray check passed a second
    `.t-dark`; motion.js moved two browser labels the board never marked).
21. **A fix to one board or story is carried to its neighbours the same
    round:** the next board in the file, every story built from the same
    boards, and every frame drawn after the change (MA-161 round 3: Foldable ·
    Open fixed, Foldable · Open, Audit left; the web Admin center's old check
    listed on four of ten stories; C15 at 21:12 still showing the buy
    unconfirmed).
22. **A rewritten check keeps every refusal the old one made:** before a
    check is narrowed or rebuilt, its old cases are run against the new code
    and stay in its selftest (MA-161 round 4: round 3's stray reader dropped
    a new colour token and an --mp-* token in ios.css, both refused before).
23. **A rule repeated across records is one phrase, copied word for word:**
    the width rule was reworded in each record four rounds running, and each
    rewording missed a case (compact windows, the iPhone, a folded foldable);
    it now reads the same everywhere: "beside every screen over about 900 pt,
    a sheet away from about 600 to 900 pt, and a tab in a compact window
    (every iPhone, a folded foldable, Slide Over)".
