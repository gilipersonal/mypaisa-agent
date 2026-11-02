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

- **Gates:** the `plan-sync` gate,
  `python3 scripts/plan_sync.py selftest && python3 scripts/plan_sync.py check && python3 scripts/plan_sync.py pr-files`
  (locally the selftest is reused while plan-sync's code and fixtures are unchanged; CI runs it every time, about 9 s), the story's
  other gates in `.claude/jira-flow.json`, and
  `python3 scripts/review_regress.py MA-<n>`. No gate runs on the boards
  (Arun, 2 Nov 2026, MA-303: "All the 6 checks currently run on docs/design.
  Lets stop that. I need this checks as QA when I ask, but on actual code
  implemented"). `board_fit.js` with its drawn-size diff, `a11y_live.js`,
  `prototype_smoke.js`, `contrast_check.py`, plan_sync's board-content readers
  and the generators' `--check` are gone; plan-sync reads each board a trace row cites only for its canvas titles, to check the board's name, and compares each Confluence preview's age with the boards it shows; nothing else on a board is read or checked (Arun, 2 Nov 2026, MA-303).
  Arun judges a design round by eye. The same checks come back as QA on the
  built code when Arun asks: MA-304 for the web app (Playwright, axe and
  Argos, with the 25% contrast floors and the 320 to 1920 width sweep; it
  depends on MA-194), and the iOS app's after MA-165, with no story yet.
- **The runner's exits.** `review_regress.py` skips a ledger entry marked
  `retired` and counts it; every command has a timeout, and its process group
  is killed when it runs over; a FAIL shows the tail of its output; identical
  commands run once. Exit 0 means every check passed. Exit 3 means every
  command passed but `manual` checks remain: one fresh verifier sub-agent,
  blind to the making, looks at those items and reports each held or broken,
  before any lane starts. `--every` runs every story's ledger as one pool.
- **Lanes:** (a) scripts and checks; (b) the trace against Jira; (c) the spec
  docs (`ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `README.md`, the
  explainer pages); (d) the rules and skills; (f) the code (`web/`, `ios/`,
  `src/`, `infra/`), once a story has code. All in one message, each blind to
  the making. The boards' lane (e) left the review with MA-303; its letter is
  not reused, so old findings keep their ids.
- **Scope of each round** (Arun, 26 Oct 2026: "make sure for each review round
  you are only reviewing the fixes made in previous round, MAX 5 rounds"):
  round 1 reviews everything; every later round reviews only the fixes made
  since the previous round, `git diff <previous reviewed_sha>..HEAD`, and their
  direct joins, never the whole PR again. Five rounds at most, unless Arun
  asks for more (ship-autopilot's round-6 question); the range of each is
  recorded in `state.json` as the round's `range`.
- **The ledger** is per story: `review/MA-<n>/fixed.json` (each fixed blocking
  finding, and any owner decision the review must keep, with a check that tests
  the behaviour, not the code's text; a story with no ledger yet has nothing to
  re-check, and the runner says so) and
  `review/MA-<n>/state.json`. `scripts/review_regress.py MA-<n>` runs the
  checks; a `manual` check is one the exit-3 verifier looks at. A check is
  never deleted from the ledger; the owner retires it (lesson 41).
- **The state file**, `review/MA-<n>/state.json`, holds for each round:
  `round`, `reviewed_sha` and `range`, the `git diff` range it covered;
  `review_approval`, Arun's words that allowed the round (and any round past
  five); `gate_results`,
  each gate's command and result; `deferred_gates`, any gate not run and why;
  `findings[]`, each with `id` (`R<round>-<lane letter><n>`, as `R2-a3`),
  `severity` (P0 to P3), `blocking` (true or false), `lane`, `anchor`
  (`file:line`), `evidence` and `status` (open, fixed, wontfix, or deferred
  with its issue key); and `next_round`, what the next round covers.
  `python3 scripts/review_regress.py --state MA-<n>` validates it, and a round
  does not start on a state file it refuses. It may run before round 1: a
  story with no state file has had no rounds yet, and that passes. The
  per-round fields (`range`, `review_approval`, `gate_results`,
  `deferred_gates`, `findings`, `next_round`) are type-checked whenever
  present, and required on every round from MA-303's own rounds on; older
  stories' rounds may lack them.
- **Ledger ids.** An entry in `fixed.json` for a fixed finding has the id
  `r<round>-<lane letter><n>` (as `r1-d2`), matched in any case, so `R1-d2`
  names the same entry; round 0 holds fixes made before round 1, and an owner
  decision carries no round (`o1`). Every round a ledger id names must be in
  the state file's history.

## The reviewer brief

Every reviewer gets the brief in `.claude/skills/autoship/review-brief.md`:
the story and its acceptance, these rules and the lessons below, the exact
file list (from round 2, the delta and its direct joins), the fixed list with
"never propose undoing any of it", and never the maker's notes. A reviewer
reports only what no gate measures, each finding as id, severity, blocking,
`file:line`, evidence and the correction. The coordinator merges two lanes'
findings at the same `file:line` into one id, naming both lanes.

## Lessons from reviews (the checklist)

Added the day each was learned; reviewers check every item. Each keeps its
number, so a reference to it holds wherever it now sits.

1. **Every screen or state a story's acceptance needs is on a board its
   trace row lists, or named in the row's `undrawn` list,** including the
   messages a change sends and the failure outcomes (PR #32, rounds 2 to 8:
   MA-35, MA-39, MA-80, MA-116, MA-130, MA-137, MA-145). This is the record
   half of lesson 1, checked on the trace row and the board names; the half
   that judged what a board draws against the acceptance is under the
   QA checklist, `docs/qa/checklist.md` (MA-303).

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
   (`or_drawn` names the file and the boards), the fixed text in its
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

(Lessons 9 to 11: in `docs/qa/checklist.md`.)

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
    its `--selftest` held those cases until MA-303 retired the gate; the
    lesson holds for every gate that remains).

(Lesson 13: in `docs/qa/checklist.md`.)

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

(Lesson 19: in `docs/qa/checklist.md`.)

20. **A check reads every form the thing can take:** a date beside a tag or
    after a `<` in a script, a token in a second block or inside `@media`, a
    role in single quotes, or a chart label's variant transform that motion.js
    would override at run time, an arrow drawn
    `->>` or `<-` (MA-161 round 3: the round-2 date reader glued "Oct" to the
    next element and lost thirteen dates; the stray check passed a second
    `.t-dark`; motion.js moved two browser labels the board never marked).

21. **A fix to one story is carried to every story built from the same
    boards the same round,** in each one's trace row and Jira story (MA-161
    round 3: the web Admin center's old check listed on four of ten
    stories). This is the story and trace half of lesson 21; the half that
    carried a fix across boards and frames is in `docs/qa/checklist.md`
    below (MA-303).

22. **A rewritten check keeps every refusal the old one made:** before a
    check is narrowed or rebuilt, its old cases are run against the new code
    and stay in its selftest (MA-161 round 4: round 3's stray reader dropped
    a new colour token and an --mp-* token in ios.css, both refused before).

23. **A rule repeated across records is one phrase, copied word for word:**
    the width rule was reworded in each record four rounds running, and each
    rewording missed a case (compact windows, the iPhone, a folded foldable);
    it now reads the same everywhere: "beside every screen from about 1133 pt,
    a sheet away from about 600 to 1133 pt, and a tab in a compact window
    (every iPhone, a folded foldable, Slide Over)". An iPhone is always
    compact, in either orientation, the one exception to "the window's width,
    never the device" (round 5: the table had said only the smaller iPhones in
    landscape, while the shell and the landscape board draw every iPhone with
    its tab bar). The phrase moved from "over about 900 pt" to "from about 1133 pt" on
    27 Oct 2026 (Arun, MA-240), in every record at once: from 900 to 1133 pt
    the screen between the sidebar and the chat fell to about 360 to 480 pt.

(Lessons 24 to 31: in `docs/qa/checklist.md`.)

32. **A guard is checked against where it can act:** a gate in our own loop
    cannot see a tool that runs inside one API request (Anthropic's server-side
    `web_search` and `web_fetch`); such a tool is kept apart by what the call
    holds, not by the gate (MA-245 round 1).

33. **A taint lasts as long as the text it marks:** untrusted text in an
    append-only history, a conversation note or a summary carries on past the
    run that read it, so the guard covers the conversation and what is drawn
    from it (MA-245 round 1).

34. **A story is checked against what its phase can build:** a phase-1 eval
    graded on records phase 2 makes, an alert through phase 8's router, a
    refusal hidden in a file phase 2 first reads; each later piece is named in
    the story that brings it (MA-245 round 1).

35. **A cap is checked against what it must pay for:** cases times trials
    times messages times the price of a message, before the cap is written
    down; what a run stopped by its cap means is written down with it
    (MA-245 round 1: $2 against a run of $5 to $15).

36. **An API combination is checked against the API:** citations cannot be
    combined with structured outputs, and a PDF reaches the model as a document
    block, not as text in a tool result (MA-245 round 1).

(Lessons 37 to 39: in `docs/qa/checklist.md`.)

40. **A check pinned to a past commit compares only what its fix holds:**
    never a whole file or every board as it was then, which later work
    changes on purpose. In MA-282, four checks failed on main while their
    fixes held:
    - a whole-page diff against d6e243f, once MA-245 and MA-261 changed
      Inside MyPaisa's words (the fix kept only its track colours);
    - the drawn-size diff, once MA-261, MA-264 and MA-281 redrew boards;
    - a grep for two stories under "Screens still to draw", once MA-264
      drew them (lesson 6: the renderer is tested on a story taken back to
      no boards).

41. **A check is retired only by the owner's word, recorded on the entry,
    never deleted;** the runner counts retired checks so none vanish unseen
    (MA-303). A retired entry keeps its check and adds `retired` with Arun's
    words and the date; lesson 22 still holds for a check that is narrowed
    or rebuilt rather than retired. The ledger checks that ran one of the six
    deleted design checks are retired this way (Arun, 2 Nov 2026: "All the
    6 checks currently run on docs/design. Lets stop that.").

42. **A gate that reads the branch must work on CI's checkout:** a pull
    request is a detached merge commit, so the key comes from
    `GITHUB_HEAD_REF` and a missing key fails closed (MA-303 round 1:
    pr-files could never fail in CI).

43. **An incremental sync moves its mark only for a read that answers the
    query it saved; a narrower read records only its own keys** (MA-303
    round 1: one story's read skipped two weeks of Jira).

44. **A receipt is required once the publish path writes one:** a page
    published under receipts with no read-back fails the check, only older
    pages are notes (MA-303 round 1).

45. **A retirement takes only the part of a check that ran a retired gate:**
    a check whose records half still guards a rule is narrowed, not retired
    (MA-303 round 1: the width-rule phrase lost its only guard).

46. **An owner decision that stops a check is carried to every record that
    runs or promises it, Jira descriptions and trace notes included, in the
    same change** (MA-303 round 1).

## The lessons from the design-board era

Lessons 1 (its board half), 9 to 11, 13, 19, 21 (its board half), 24 to 31
and 37 to 39 are kept, with their numbers, in `docs/qa/checklist.md`: the
checklist for QA on the built code, which runs when Arun asks (MA-304 for the
web app; the iOS app's after MA-165). They moved there so this rule stays
under the 24 KB an Antigravity rule can hold (MA-306); nothing applies them
to boards.
