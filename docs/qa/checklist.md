# The QA checklist: lessons from the design-board era

The lessons the independent reviews of the design boards taught (MA-155 to
MA-303), kept with their numbers for the QA of the built code. They are
applied when Arun asks for QA: MA-304 for the web app (Playwright, axe and
Argos, with the 25% contrast floors and the 320 to 1920 width sweep; it
depends on MA-194), and the iOS app's after MA-165, with no story yet. The
active review checklist is in `.claude/rules/independent-review.md`, where
these numbers are pointed here from. Moved out of that rule by MA-306 so it
fits an Antigravity rule (24 KB).

Lessons 1 and 21 are split: their record halves stay in the review rule.

1. **A board is checked against its story's acceptance, line by line**
   (the board half; the record half is lesson 1 in the review rule): every screen or state
   the acceptance needs is drawn as the acceptance asks, including the
   messages a change sends and the failure outcomes (PR #32, rounds 2 to 8:
   MA-35, MA-39, MA-80, MA-116, MA-130, MA-137, MA-145).

(Lessons 2 to 8: in the review rule, `.claude/rules/independent-review.md`.)

9. **Every change drawn on a board shows its card, Confirm and the audit row,
   with the second check where ARCHITECTURE asks for one, cancelling included, and no state is drawn that the
   docs make impossible** (PR #35 round 1: "Leave it out saves the rest" with
   no Confirm; an invite cancelled at once; "already linked" on a page nobody
   is signed in to). A board fix not made in the same change goes into
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
    crimson). A colour a board added went into `tokens.css` as a token, and its
    pair into `contrast_check.py`'s `PAIRS`, before the board used it;
    a label colour on glass went into `ios.css` as an `--lg-*` value and into
    `GLASS_TEXT`. A motion role sits only on the element its keyframe was made for
    (`label` on `.mp-chartlbl`, `dot` on `.mp-chartdot`); until MA-303,
    `plan_sync.py check` refused a `label` or `dot` attribute anywhere else,
    however it was quoted (fix: `fade`), and a board rule giving a `.mp-chartlbl` or `.mp-chartdot`
    variant its own transform without `!important` (fix: `!important`, since
    motion.js gives every chart label and dot the board leaves unmarked its role at run time) (MA-161
    rounds 2 and 3: chart axes and two browser labels moved once the arrival
    settled).

(Lesson 12: in the review rule, `.claude/rules/independent-review.md`.)

13. **One figure set and one ledger behind every set of boards:** before
    boards are drawn, the illustrative household is written once (holdings,
    owners, accounts, day moves, mix, the audit rows with their times, members,
    files and runs, who signs in with what, which devices, the dates people
    joined), and every board takes its figures from it. A board that shows a
    record shows the same record (MA-161 round 1: one £200 buy at three times,
    one cash change by two members on two days, a first sign-in after the
    files it made; `plan_sync.py check` refused a wrong weekday until
    MA-303).

(Lessons 14 to 18: in the review rule, `.claude/rules/independent-review.md`.)

19. **A record drawn at a time changes every frame drawn after it:** a
    figure set has a clock, and a change at 08:41 shows in every later frame
    or comes after the last one (MA-161 round 2: the £200 buy at 08:41 beside
    Home at 9:41 still showing the total before it).

(Lesson 20: in the review rule, `.claude/rules/independent-review.md`.)

21. **A fix to one board is carried to its neighbours the same round**
    (the board half; the story and trace half is lesson 21 in the review rule): the next
    board in the file and every frame drawn after the change (MA-161 round
    3: Foldable · Open fixed, Foldable · Open, Audit left; C15 at 21:12 still
    showing the buy unconfirmed).

(Lessons 22 and 23: in the review rule, `.claude/rules/independent-review.md`.)

24. **A board is measured at every size its class covers, in both engines,
    not only at the size it is drawn:** an iPhone from 320 (Display Zoom) to
    440 and in landscape, an iPad or foldable window from 600 to 1366, and the
    web from 320 to 1920, in Chromium and WebKit at the screen's own pixel
    ratio, and Prototype v4 at every door and step (MA-240: at 1024 with the
    chat beside it, the web pages fell to a word per line; the check-in card
    hid its fourth answer at 402; WebKit's wider system font cut a rupee hero
    at 320). `node scripts/board_fit.js` was the gate until MA-303; it failed closed (a
    board with no frame, a frame it cannot measure, a missing icon or text
    font, a template value that never resolved, which is how MA-241's notes
    rendered blank), and an allowance named its board, its fault, its frames
    and its reason. An ellipsis on a flex or grid box draws nothing, so the
    text it cuts is a clip.

25. **A shared fix is pixel-diffed against main at every drawn size:** a
    guard meant for a narrow screen must leave every board as drawn, and each
    frame that changes is looked at and named as intended (MA-240: a hero
    figure that shrank at 402, a global word-break that split a table's
    header, a longer fade over rows that did not overflow and a chip that
    wrapped at its drawn width were all caught by the diff, not by a scan).
    The diff runs again after every later change to a shared rule, before
    any review: MA-240's round 1 found a phone-door hero shrunk, a phone
    drawer narrowed, chips cut, axis labels hidden and grids collapsed, all
    added after the last diff. It was a command until MA-303, `node scripts/board_fit.js
    --diff <main before the story> --expect review/MA-<n>/drawn-changes.json`:
    the file names each drawn change the story means and why, a change it
    does not name fails, and so does a named one that no longer shows. A
    label that motion.js must thin at a frame's drawn size is a fault too.
    Once it has merged, its ledger's diff adds `--since <the story's
    merge>`: a board a later story redraws is left out by name and its own
    story's diff answers for it, while every other board is still compared
    through the shared files (MA-282).

26. **Text on text is judged by the surfaces the two lines sit on, never by
    class names:** a line under a bar, a sheet, a toast or the chat's
    controls is the scroll edge; two lines on the same surface touching is a
    fault, inside a sheet or a glass bar too (MA-240 round 1: a class list
    that matched `alert` and `.lg` let overlaps inside sheets and bars pass;
    a mutated board proved it). A column crushed to a word or two a line is a
    fault even when nothing clips. Inside a chart, a painted note, call-out or
    label pill floating over the chart's own labels is no such edge: the label
    under it is covered, a fault (MA-240 round 2: the Proof note and a
    call-out passed as "under-layer").

27. **A token is checked where a board applies it, not where it is
    defined:** `contrast_check.py` measured the new range band while no board
    drew it, since each board filled its band with its own 18% (MA-240 round
    2). The board gate then refused a band or a track drawn in anything but
    its token, and a token's selftest case mutated a board, not the token.

28. **A drawn-size diff runs at the screen's own pixel ratio, in both
    engines, and greys out a colour only where a check proves the colour is
    applied:** at ratio 1 in Chromium alone, round 1's diff passed an alert
    that WebKit's zoom set off the screen, and its neutral CSS greyed the
    meter's frame and the band on both sides, so a frame whose box changed
    and a band that never reached a board both passed (MA-240 round 2).

29. **A gate measures what a member can reach, not what the first viewport
    shows:** the content below the fold (scrolled to its end) and above the
    top (a page a board anchors to the bottom of its box), the widths
    between its samples (each container query's threshold, one below and
    at it), a zoomed frame's own box, and every frame of a board, the Stage
    Manager window included (MA-240 round 2: each was a blind spot).

30. **A fault across a whole band of widths is an owner's decision, not an
    allowance or a guard per screen:** from 900 to 1132 pt every iPad board
    failed (179 faults) because three columns left the screen 360 to 480 pt;
    Arun chose where the chat goes, and the rule changed in every record at
    once (MA-240 round 2).

31. **A guard that answers a band is retired when the band is settled:** the
    iPad guards for 1024 to 1179 pt (a name's 8em, a key-value card's one
    column) were narrowed or removed once the chat left those widths, and the
    gate showed they were not needed (MA-240 round 2).

(Lessons 32 to 36: in the review rule, `.claude/rules/independent-review.md`.)

37. **A chart draws every stroke in its own SVG:** a shared def drawn with
    `<use>` into a chart stretched by `preserveAspectRatio="none"` escapes the
    kit's non-scaling-stroke rule, so its strokes stretch with the box. In
    MA-281 round 1, every candle's wick drew wider than its body, and both
    board gates passed. A shared def in a stretched chart holds filled shapes
    only; `plan_sync.py check` refused one that drew lines or paths until
    MA-303.

38. **A figure set checks its own data, not typed-in numbers** (lesson 3, for
    the design aids). In MA-281 round 1, `make_forecaster.py` asserted
    `57 + … == 52` on literals while the neckline sat above the trough, a
    close broke it a day before the stated break, a bar opened under its low,
    and the similar days' middle was +1.7% against the +1.8% shown. Each claim
    a board makes about the figures is asserted over the figures themselves.

39. **Every part the acceptance names is in a frame, and no frame states a
    rule the docs lack:** a part below the fold gets its own scrolled frame,
    and a stage, a count or a rule on a board comes from ARCHITECTURE. In
    MA-281 round 1:
    - nothing showed the picked option's track records, the fund's rows, or
      the "no clear view" card;
    - the proof page invented a shadow stage and a monthly restart;
    - similar days were counted 31 against §19.4's 30 (numbered before MA-307; that section went with the Forecaster).
