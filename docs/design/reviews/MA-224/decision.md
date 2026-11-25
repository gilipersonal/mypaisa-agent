# MA-224: the plan boards redrawn to "All to cash"

A figure redraw, not an options round. Wed 25 Nov 2026.

## The request, in Arun's words

- 3 Nov 2026 (MA-317, MA-219), the surplus rule: "All to cash". `ARCHITECTURE.md` §6 and §15: each month's surplus
  stays as cash in its own currency, on the base path and the fan alike; nothing is swept into a holding or a loan.
- 25 Nov 2026: "start the Projection page". `python3 scripts/plan_sync.py start MA-224` refused it: the row listed
  "the Projection and Budget forecast figures redrawn to the surplus rule Arun settled on 3 Nov 2026 (all to cash),
  in place of the six-month buffer the boards assume" as still to draw. Asked how to proceed, he chose "Redraw first".
- The same day: "parallelize the work and get it done faster".

## Where it lives

- The round's page: `docs/design/reviews/MA-224/options.html`, published as a private Claude Artifact with root
  `docs/design` and the 14 boards and the shared files they load:
  https://claude.ai/artifact/XgnykUCzfAohsDiyT66Aix (published 25 Nov 2026).
- `tokens.css` here is the snapshot of `docs/design/ds-v1/tokens.css` on the day; it did not change.

## What was done

1. `docs/design/figures/make_future_plans.py` no longer sweeps cash above six months of outgoings into Balanced,
   and in retirement a gap comes out of cash before Balanced is sold. `future-plans-v4.json` is regenerated: 2,173
   figures change and the 236 swept amounts go. The ledger's monthly identity (opening cash + flows = closing cash)
   still holds. `household-v4.json` is unchanged.
2. Every figure on the 14 boards that cite the set (7 in `app-v1/`, 7 in `ios-v1/`) and in the set's README was
   moved to it: traced to its place in the old set and replaced with the new set's value at the same place; fan
   arrays and embedded forecast rows rewritten whole and compared with the set by script; six parallel passes, one
   per board pair and one for the README, for what tracing could not settle and for the words.
3. No layout, class, script logic or chart scale was changed.

## What moved

| Figure | Was | Now |
| --- | --- | --- |
| The 26 Oct run, 2046 middle path | £3,697,000 (8 in 10: £2,548,000 to £5,766,000) | £3,378,000 (£2,980,000 to £4,055,000) |
| The 26 Oct run, 2056 middle path | £6,626,000 (£3,419,000 to £11,990,000) | £5,313,000 (£4,597,000 to £6,356,000) |
| 5 Nov, before the plans, 2046 | £3,897,000 | £3,548,000 |
| 5 Nov, after the plans, 2046 | £2,923,000 (£2,188,000 to £4,058,000) | £2,762,000 (£2,364,000 to £3,439,000) |
| Cash at the end of 2029, fees saved | £35,168 | £70,406 |
| Cash at the end of 2046, fees saved | £26,894 | £1,075,189 |

Unchanged: each year's income, spending and surplus; the 50 months under the £500 floor and the £19,058 gap; the
school fees pot; the wedding's cash below zero from Jun 2027 to Mar 2028; every plan's own amounts. Cash first differs
at the end of 2028.

## Words that were changed

- Budget forecast, the 30-year state (both doors): "Balanced (ISA) pays the rest of the budget, so the surplus sits at
  £0" is now "cash pays the rest of the budget, so the surplus is below £0"; the foot and one note likewise.
- Plans in the chat (web): "each with its own middle path in 2046" is now "each with its run's middle path in 2046
  (R1's and R2's are the same, £2,441,000)"; "moves with each Confirm" is now "runs again with each Confirm".
- Plans in the chat (both doors): the pot's "Against the plan saved" reads "No change" (it was +£5,000); the ISA way
  reads −£20,000 (it was +£2,000).
- The figure set's README: in retirement cash pays any gap, Balanced only once cash has run out.

## For Arun to decide

1. **Two readings of the rule.** A retirement gap comes out of cash first, Balanced only when cash runs out (the old
   set: Balanced pays any gap). One cash figure in pounds, where the plan says "in its own currency".
2. **The wedding's three ways.** "Take it from Balanced (ISA)", ranked first and applied at 21:17, now has the lowest
   2046 figure: £2,840,000, against £2,863,000 (move the extension) and £2,846,000 (pause the pot). They used to tie
   at £3,041,000. Nothing is re-ranked.
3. **The schooling gap's three ways.** Against the plan as saved at 2046: pot level, trim +£108,000, ISA −£20,000.
   The pot no longer moves the Projection's headline; whether the ISA way is still offered is his call.
4. **Chart axes sized for the old figures.** Projection: the 20-year fan reaches 62% of the plot (was 89%), the
   30-year 49% (was 92%). Budget forecast, 30 years: the four retirement years draw as grey bars cut off at the
   −£1k bound, with no break mark.
5. **The cash rate (3%) is not on the Assumptions panel,** and is now what every surplus earns.
6. **The changed words above.**

## The answers

Not given yet.

## Not changed

Prototype v5 and its figure files (rule 5 of `.claude/rules/plan-sync.md`); the dated records of MA-264 and MA-301,
which quote the figures of their day.
