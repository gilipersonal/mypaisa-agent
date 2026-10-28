# MA-264: the future-plans screens at every door

## The request

On 28 Oct 2026, after MA-261 (PR #56) recorded future plans by talking: "start the design of the new screens".

MA-261 recorded these words of Arun's (28 Oct 2026):
- Say what is coming, for example "£4,000 a month from Jan 2029 for my kid's schooling".
- Be asked what is missing.
- See the budget and the Projection recalculated, audited and editable.
- Rearranging works "just like claude does": proposed, then applied on Confirm, this month's budget included.

Its stories have no boards yet:
- MA-262: the Budget forecast tab.
- MA-263: the budget rearranged on the admin's Confirm.

Its updated stories list screens still to draw:
- MA-222: the questions, the impact card, the change_flow and record_event effects, pause and end, the audit row.
- MA-223: what-ifs with the three effects.
- MA-224: the horizon chips, the Plans tab, plan-item milestones, 390 and iPad.
- MA-96: the budget's chat flows and inflation keys.

## One figure set first

`docs/design/figures/future-plans-v4.json`, from `make_future_plans.py`, as lesson 13 asks; the README beside it
says how every figure is made and checked.

- **The clock.** One evening, Mon 2 Nov 2026, 20:41 to 21:05. October has closed; net worth is £456,493.
- **Carried from the v4 boards (lesson 19):** Arun's salary growth of 4.8% (corrected at 10:40 on Mon 26 Oct) and
  Asha's bonus growing 3.5% a year (corrected at 10:44).
- **The ledger.** It runs month by month from 1 Nov 2026 to Dec 2056. Every month, opening cash plus its flows equals
  closing cash, and every year's lines sum to its surplus.
- **The school fees.** £4,000 a month from Jan 2029 to Jul 2041, rising 4.5% a year, paid from the monthly budget.
  - The middle path in 2046 moves from £3,897,000 to £2,580,000.
  - The surplus falls below Arun's £500 floor in 50 months, Jan 2029 to Feb 2035; the gap is £19,058. Cash stays
    above zero.
- **The ways to cover it.** Code works out three, and each covers every month:
  1. A School fees pot from this month: £690 a month to Dec 2028. November's planned surplus goes from £2,636 to
     £1,946.
  2. Trim Holidays, Eating out and Shopping from Jan 2029, with £5,458 from Balanced.
  3. £19,058 from Balanced.

  There are two more: start the fees in Jan 2032 instead, or pause the SIP.

## The boards (Claude Design)

Drawn on 28 Oct 2026, in three lanes that ran at once, each from `brief.md` and the figure set. Every option is drawn
at four doors (desktop 1440 with the chat beside, phone web 390, iPhone, iPad landscape 1180 with the chat beside),
in light and dark.

| Question | MyPaisa app v1 (desktop and 390) | MyPaisa iOS v1 (iPhone and iPad) |
| --- | --- | --- |
| 1. The Budget forecast tab | [Web v4 · Budget forecast](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Budget+forecast.dc.html) | [iPhone v4 · Budget forecast](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Budget+forecast.dc.html) |
| 2. A plan made in the admin's chat | [Web v4 · Plans in the chat](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Plans+in+the+chat.dc.html) | [iPhone v4 · Plans in the chat](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Plans+in+the+chat.dc.html) |
| 3. The Plans tab | [Web v4 · Plans tab](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Plans+tab.dc.html) | [iPhone v4 · Plans tab](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Plans+tab.dc.html) |

**What each file holds.**

- **Budget forecast:** 1a, 1b and 1c, each in light and dark (12 frames a file).
  - Desktop and 390 show the tab at 20:43, with the chat beside it holding the saved plan and "Ways to cover it".
  - iPhone and iPad show the same tab.
- **Plans in the chat:** 2a, 2b and 2c (21 frames a file):
  - 20:41 the questions;
  - 20:42 the impact;
  - 20:43 the ways to cover it, then scrolled, in dark;
  - 20:46 applied, in technical mode;
  - the ways at the other door.
- **Plans tab:** 3a and 3b at 21:05, each in light and dark, plus one plan opened per option: School fees on 3a,
  Close the HDFC home loan on 3b (10 frames a file).

**Where a board departs from the brief.** Each departure is said on its board.

- **1a charts each year's leanest month, not its total.** The £500 floor is monthly, so a bar can be compared with it
  exactly: 2033 clears £9,000 in the year but still drops under £500 in January and February. The axis stops at
  £4,000 a month; 2042 to 2046 run past it and are drawn with a break.
- **1c on a phone scrolls sideways,** with the year column fixed, and opens a cell's trace in a sheet. The iPhone's
  sheet keeps glass for its chrome only; its figures sit on a solid card.
- **2a's impact chart marks the flagged years with ▼** instead of a floor line, because its bars are yearly totals.
- **2b merges the two Confirms,** against §6.6's order (plan first, then the rearrangement). Its one audit pair at
  20:46 carries −£1,312,000, the pot applied against the plan before the fees (£2,585,000 − £3,897,000).
- **The plan sheets on 3a and 3b are solid,** since they hold the admin's words and figures (glass carries labels
  only).
- **On iPad at 1180 with the chat beside,** 3a's card is under 560 pt, so each lane sits under its plan's name.
- **By 21:05 the pot is mostly unused.** Once the salary step and the HDFC closure are saved, the pot tops up only
  £1,361 (Jan and Feb 2029), and £17,238 stays in it. The boards say so; a later state may offer to end it early.

## The glitch review

Each lane rendered every frame in light and dark with `?static=1`, looked at each one, and ran board-fit in Chromium
and WebKit. The maker then looked again at the recommended options at every door, and ran the impeccable detector on
all six files.

**Found by the lanes, and fixed:**
- frames clipping their content;
- a class attribute that began with a template value and lost the frame's classes, at three places;
- 1c's popover clipping as the window narrowed, and its phone sheet hiding the whole table;
- a "runs past 2046" arrow hidden behind a bar;
- a dialog's transform the sheet keyframe would override;
- a read-only figure clipping at 320;
- 3b's spine breaking at each year;
- cards taller than a phone, so the chat's cards were compacted and each frame scrolled to its step;
- 2046's figures touching in the 392 px chat column;
- a row class named `plan` picking up the canvas's Jira-line style, unreadable in dark.

**Found in review, and fixed:**
- **The figure set disagreed with itself** on Jan 2029: −£904 in one field, −£903 from the month's own lines. Every
  leanest month is now its month's rounded lines summed. Lane 1's chart moved by £1 in seven years.
- **Asha's bonus** now uses the words the v4 boards already draw.
- **The canvas's id chips** failed contrast on hover.
- **A selected timeline row** was marked with a left stripe; the background alone marks it now.
- **Nested cards:** 2029's figures were tiles inside a card; they are now rows.
- **Long all-caps overlines** that carried figures are now short labels, with the figures in a sentence-case line.
- **The Net worth tab's list** was headed "Coming up"; it now says "Milestones", as the picked 1a does.
- **Six board names were built in script,** so the plan check could not read them; they are now literal.

**False positives, recorded in `.impeccable/config.json` with their reasons, scoped to these six files:**
- the kit's own controls flagged as cramped (segments, glass buttons, icon tiles, chips);
- the canvas's 10 px id chips and the tab bar's 10 pt labels;
- the canvas titles' leading and backdrop;
- frames clipping their screens;
- the selected tab's underline;
- on iOS, the device bezel's shadow from `ios.css`.

## The options

| Question | Options | Recommended, and why |
| --- | --- | --- |
| The Budget forecast tab (MA-262) | 1a The surplus first · 1b Year by year · 1c The ledger table | **1a**: like the Projection's 1a, the shape comes first. Where the budget gets tight shows at a glance against the floor, and each year's lines and months are one tap away. |
| A plan made in the admin's chat (MA-222, MA-263) | 2a A card per step · 2b One card that grows · 2c Compare side by side | **2a**: every card in the chat already works this way (one job, one Confirm, an audit row). It keeps §6.6's order, plan first and then the rearrangement, reads at AX5, and gives each card one plain line for push and VoiceOver. |
| The Plans tab (MA-224) | 3a Bars on a timeline · 3b A timeline down the page | **3a**: ARCHITECTURE asks for "each plan on a timeline", and the overlaps (the pot running into the fees, the HDFC loan ending as they start) show at once. |

**The gates, on 28 Oct 2026 after the last change:**
- board-fit: 46 boards in Chromium and WebKit, 0 faults;
- plan-sync: selftest 0 wrong; check clean but for the Confluence pages and board previews still to publish (they are
  published with the pick's changes, before any PR);
- contrast: selftest 0 cases wrong, 0 pairs below the limits;
- design-sync: 3 projects, 94 files, 0 drift;
- impeccable: 0 findings on all six boards.

## Points to settle

1. **Arun's floor. Settled 28 Oct 2026.** §6.6 offers a rearrangement when "the surplus [falls] below the admin's
   floor", but no record said where the floor is set or what it starts at. Arun's answer: a monthly surplus kept
   among the Projection's assumptions, £500 to start, the admin's alone, corrected in place like any assumption.
   ARCHITECTURE §6.6 and §9.3, PLAN's MA-262 and MA-263 bullets, the trace rows and the Jira descriptions now say so.
2. **The Projection's figures move.** MA-193's Projection boards come from a yearly sketch: October's surplus growing a
   flat 3% a year, £2,769,000 in 2046. This ledger runs pay, prices and commitments month by month, and its 2046
   middle path before the fees is £3,897,000. The v4 Projection boards keep the 26 Oct run until MA-224's remaining
   states are drawn from this set; then they move to it.
3. **MA-261's examples, in this household's figures (lesson 13).**
   - The school fees are kept word for word.
   - The salary step is £5,500, not £8,000, which would nearly double Arun's take-home.
   - The loan closed is the HDFC home loan, with the SBI FD. The household has no SBI home loan, and ₹2 crore is
     thirteen times the HDFC balance.
4. **The surplus rule.** §6.6 says the surplus "is allocated by a rule" without saying which. The figures assume one:
   cash keeps six months of outgoings plus the next twelve months' one-offs, and the rest goes into Balanced. The
   engine's rule is MA-219's to set.
5. **The first tab's name.** ARCHITECTURE names the Plans and Budget forecast tabs; the boards call the fan's tab
   "Net worth".

## The pick

Arun, 28 Oct 2026, picked the recommended option each time, and settled the floor as drawn:

| Question | Pick | Stories now `picked` |
| --- | --- | --- |
| The Budget forecast tab | **1a The surplus first** | MA-262 |
| A plan made in the admin's chat | **2a A card per step** | MA-263, MA-222 |
| The Plans tab | **3a Bars on a timeline** | MA-224 (already picked for its screen, 1a the fan first) |
| Arun's floor | **£500 a month, among the Projection's assumptions** | settled on MA-262 and MA-263 |

**The rows:**
- Each picked story lists the picked boards. The options not picked stay on MA-264's row as the record.
- MA-222's question card and impact card are drawn by 2a; MA-224's Plans tab is drawn by 3a. Both carry `Drawn:` notes.
- Each picked story lists its remaining states in `undrawn`, so `start` refuses it until they are drawn. That is the
  next round of MA-264:
  - MA-262: privacy; INR, today's money and the other horizons; Asha's view; the tab after a rearrangement, and its
    loading, empty and error states; 1a's trace on iOS.
  - MA-263: a member asking; Undo; the Budget screen's November with the pot's line; the two more ways opened; a
    rearrangement offered because cash would go below zero.
  - MA-222: pause, resume and end in place; the change_flow and record_event effects; the audit row; refusals.
    MA-193's single plan-item card is marked superseded in its own notes.
  - MA-224: the horizon chips on the Net worth tab; plan-item milestones; the Net worth tab at 390 and on iPad;
    Asha's view and privacy; the v4 Projection boards' figures moved to this figure set.

**What the pick supersedes:** for a new plan item, 2a replaces the single plan-item card drawn on MA-193 (`iPhone ·
Chat, adding a plan item`, `Browser · Plan item in the chat, phone`). The questions card and the impact card now come
before Confirm. Those boards' own notes say so in the next round, when the v4 Projection boards are redrawn from this
figure set.
