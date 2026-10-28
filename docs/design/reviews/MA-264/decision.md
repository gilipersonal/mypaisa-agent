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

To be filled from the drawing lanes' reports.

## The options

| Question | Options | Recommended, and why |
| --- | --- | --- |
| The Budget forecast tab (MA-262) | 1a The surplus first · 1b Year by year · 1c The ledger table | **1a**: like the Projection's 1a, the shape comes first. Where the budget gets tight shows at a glance against the floor, and each year's lines and months are one tap away. |
| A plan made in the admin's chat (MA-222, MA-263) | 2a A card per step · 2b One card that grows · 2c Compare side by side | **2a**: every card in the chat already works this way (one job, one Confirm, an audit row). It keeps §6.6's order, plan first and then the rearrangement, reads at AX5, and gives each card one plain line for push and VoiceOver. |
| The Plans tab (MA-224) | 3a Bars on a timeline · 3b A timeline down the page | **3a**: ARCHITECTURE asks for "each plan on a timeline", and the overlaps (the pot running into the fees, the HDFC loan ending as they start) show at once. |

## Points to settle

1. **Arun's floor (open on MA-263 and MA-262).** §6.6 says a rearrangement is offered when "the surplus [falls] below
   the admin's floor", but no record says where the floor is set or what it starts at. The boards draw £500 a month as
   Arun's setting, among the Projection's assumptions, which are the admin's alone. Is that where it lives, and is
   that its default?
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

Waiting for Arun.
