# The illustrative household behind the v4 boards (MA-193)

The boards of MA-193 and the clickable prototype draw every figure from one set: `household-v4.json`.
`make_household.py` writes it, so the figures can be checked and a change made in one place. Run:
`python3 make_household.py > household-v4.json`. Lessons 10, 13 and 19: one figure set and one ledger behind every
set of boards, figures that add up, and one clock. The script is a design aid, not the product's engine; the product's
figures come from MA-191's engine and the registry. **Every name, balance and account here is illustrative.**

## The clock

- Today is Mon 26 Oct 2026.
- Prices are at the Fri 23 Oct close.
- £1 = ₹112.50, the ECB reference cross-rate of Fri 23 Oct.
- The prototype's later frames come in date order:
  - Sun 1 Nov: October's budget closes.
  - Thu 5 Nov: the HDFC EMI check-in.
  - Tue 10 Nov: the SIP.
  - Fri 20 Nov: the Barclaycard bill.
  - Mon 14 Dec: the saver matures.

## The household

Arun is the owner and admin; Asha is a member. Their five UK holdings are the iOS boards' own (MA-161). They sum to
£24,110:

| Holding | Owner | Value |
| --- | --- | --- |
| Balanced | Arun | £22,925 |
| NASDAQ 100 ETF | Asha | £512 |
| Robotics ETF | Arun | £304 |
| Silver ETC | Arun | £188 |
| Monzo pot | joint | £181 |

**Other assets**

| Asset | Owner | Value and terms |
| --- | --- | --- |
| Home, Reading | joint | £415,000 (valuation due Fri 30 Oct) |
| Fixed-rate saver | Asha | £10,000 at 4.6%, £10,460 on Mon 14 Dec |
| Workplace pension | Arun | £86,400 |
| SIPP | Asha | £31,250 |
| Flat, Pune | joint | ₹1,10,00,000, rent ₹18,000 a month |
| SBI FD | Arun | ₹5,00,000 at 7.1%, quarterly; ₹5,17,908 now, ₹6,17,538 on Sat 10 Mar 2029 |
| PPF | Arun | ₹6,80,000 |
| LIC endowment | Asha | surrender value ₹3,40,000 |
| Parag Parikh Flexi Cap | Asha | ₹5,61,995 from ₹4,60,000 of SIPs since Jan 2023; XIRR 10.7% |
| Infosys | Arun | ₹1,77,660; no history, so the agent asks |
| NRE savings | Arun | ₹2,15,000 |

**Debts**

| Debt | Balance | Payment | Ends |
| --- | --- | --- | --- |
| Mortgage | £224,353 | £1,456 a month | Oct 2045 (fixed to 30 Jun 2028; £5,000 overpaid on 1 Mar 2024) |
| Car loan | £8,939 | £347 a month | Feb 2029 |
| HDFC home loan | ₹15,13,257 | EMI ₹39,390 | Jul 2030 (the 180th EMI) |
| Barclaycard | £0 after the 1 Oct statement's £1,240 was paid in full on Tue 20 Oct | | |

**Net worth**
- £439,951 before the first record; £444,951 after it (₹5,00,56,988).
- The first record is £5,000 of Monzo savings, registered at 09:41 on Mon 26 Oct.
- After it, by country: UK £338,468, India £106,483.
- After it, by member: Arun £250,868, Asha £194,083.
- At 09:52, after the valuation check-in, Arun corrects the Home valuation in place: £415,000 → £428,000, labelled
  "your estimate".
- After the correction: £457,951 (₹5,15,19,488); by country UK £351,468, India £106,483; by member Arun £257,368,
  Asha £200,583.
- The Pune flat's valuation is overdue since 15 Jul, so it is a check-in on Mon 26 Oct.
- The HDFC balance is ₹14,84,587 after the Thu 5 Nov EMI.
- Sun 1 Nov at 08:44: the Barclaycard statement is confirmed, so its £1,458 is owed (due Fri 20 Nov). Net worth is
  £456,493 (₹5,13,55,462).
- Thu 5 Nov, after the HDFC EMI: £456,747 (₹5,13,84,038); India £106,737; Arun £256,164, Asha £200,583.
- Splits round by largest remainder, so they always sum to the total shown. A frame that moves only one member's
  records lets that member's figure absorb any rounding pound.

**October's budget**
- Income £7,560; EMIs £2,153; SIP £89.
- Spending: £2,682 planned, £2,246 actual.
- Surplus: £2,636 planned, £3,072 actual; a savings rate of 40.6%.
- The Barclaycard statement of Sun 1 Nov (£1,458) and the Monzo October statement sum, line by line, to the actuals.

**The Projection**
- Its runs come from `make_future_plans.py` (MA-264), month by month; they replaced this script's yearly sketch on
  28 Oct 2026. The 26 Oct run at 09:53 (`R26` in `future-plans-v4.json`) starts after the correction, at £457,951.
- **The 26 Oct run's middle path:** £1,508,000 in 2036, £3,697,000 in 2046 and £6,626,000 in
  2056. In 2056, 8 in 10 runs end between £3,419,000 and £11,990,000.
- The assumptions:
  - Parag Parikh's 10.7% XIRR is shrunk to 9.06% (3.8 years of history moves the prior only a little).
  - The FD and the PPF are at their contract rate of 7.1%.
  - Salary growth is 4.17% for Arun (his measured 4.8%, blended with the UK's 3.5%) until he sets 4.8% at 10:40, and
    3.5% for Asha.
  - Inflation is 2.5% in the UK and 5% in India.
- The plan items:
  - a home extension, −£35,000 in Jun 2027;
  - Asha's bonus, +£3,000 every March (growing 3.5% a year from Arun's correction at 10:44);
  - a new car, −£25,000 in Jun 2031.
- **The what-if** (10:20): £60,000 down on a second flat in Jun 2028 puts 2036's middle path at £1,417,000,
  £91,000 lower. Code flags cash £14,462 below zero in Jun 2028, back above zero in
  Nov 2028.

# The future plans (MA-264): `future-plans-v4.json`

`make_future_plans.py` reads `household-v4.json` (it never changes it) and runs the household forward month by month
from 1 Nov 2026 to Dec 2056, as MA-261's engine is described (ARCHITECTURE §6.6). Run:
`python3 make_future_plans.py > future-plans-v4.json` (about 40 seconds: 300 Monte Carlo paths per scenario). Like the
first set, it is a design aid, not MA-219's engine; every name and figure is illustrative.

## The clock

One evening, Thu 5 Nov 2026, 20:41 to 21:22. The HDFC EMI was answered Paid at 09:12 (net worth £456,747), and Prototype
v4's Projection steps ran that morning. Arun moved the evening here from Thu 5 Nov on 28 Oct 2026, so the prototype's
Thursday comes before the plans. Every board of MA-264 shares this clock.

- **The evening's base run** is R5N, Thu 5 Nov 09:13, after the EMI was confirmed. It has R0's figures (Sun 1 Nov
  09:03), since the EMI was already in November's flows.
- **Prototype v4's Projection** shows R5N. Its what-if at 10:20 (`what_if_5nov`) puts 2036's middle path at
  £1,446,000 against £1,539,000, £93,000 lower. Code flags cash
  £15,377 below zero in Jun 2028, back above zero in Nov 2028.

Two corrections drawn on the v4 Projection boards on Mon 26 Oct hold here (lesson 19): Arun's salary growth is 4.8% (he
set it at 10:40), and Asha's bonus grows 3.5% a year (corrected at 10:44).

## The ledger

- **Income:** each member's take-home, rising each April (Arun 4.8%, Asha 3.5%); the Pune rent in rupees, rising 5%
  each April; Asha's bonus each March. From 60 (Arun in Jan 2051, Asha in Jan 2053) a pension pays 4% of its pot a
  year, and Balanced pays any gap.
- **Spending:** October's plan per category (£2,682 a month), each category with its inflation key, stepping up each
  January: UK 2.5%, UK health 4% (Health), India 5% (Family support, ₹25,000 a month).
- **Commitments:** the three EMIs to their end dates (car Feb 2029, HDFC Jul 2030, mortgage Oct 2045), the Parag
  Parikh SIP (₹10,000), LIC's premium (₹42,000 each March to 2030).
- **Plans:** the extension (−£35,000, Jun 2027), Asha's bonus, the new car (−£25,000, Jun 2031); one-offs are paid
  from cash.
- **Cash:** the Monzo pot, the Monzo savings and the NRE savings (£7,092 on 1 Nov), plus the maturities (the saver in
  Dec 2026, the SBI FD in Mar 2029, the PPF and LIC in Mar 2031). October's card statement (£1,458) is paid from it
  in November. Cash earns 3%.
- **The surplus rule:** cash keeps six months of outgoings plus the one-offs due in the next twelve months; the rest
  goes into Balanced (ISA) each month.
- **Arun's floor:** a surplus of £500 a month (his setting). A month below it is flagged while anyone in the
  household earns a salary (to Dec 2052); in retirement only cash running out is flagged (Arun, 28 Oct 2026).
- **FX:** £1 = ₹112.50 on 1 Nov, drifting 2.44% a year (the inflation gap); each rupee flow converts at its month's
  rate.
- **Checked:** every month, opening cash + its flows = closing cash; every year's lines (rounded by largest
  remainder) sum to its surplus; no option leaves cash below zero.
- **How a figure is rounded.** Each group of lines (income by member, spending by category, the EMIs) is rounded by
  largest remainder to its group's total, and a surplus shown is the sum of its shown lines. So a total can sit £1 or £2
  from its exact figure rounded on its own, and the lines on a board always add up. The floor and cash flags use the
  exact figures. A month the pot tops up to exactly £500 can therefore show £498 to £501, and it is not flagged. The
  boards fold such months into their year, and say "no month is flagged" rather than "£500 or more every month".

## The evening

1. **20:41** Arun: "£4,000 a month from Jan 2029 for my kid's schooling". MyPaisa asks three things with chips:
   until when (Jul 2041), how the fees grow (4.5% a year, the UK school-fees prior), paid from where (the monthly
   budget).
2. **20:42** The impact card. The middle path moves:
   - 2031: £866,000 → £701,000;
   - 2036: £1,539,000 → £1,002,000;
   - 2046: £3,897,000 → £2,580,000 (−£1,317,000).

   The surplus is below the floor in 50 months, Jan 2029 to Feb 2035, at worst −£903 in Jan 2029. Cash stays above
   zero.
3. **20:43** Confirm saves it, with its audit row. The plan leaves the household short, so code works out the
   options, and the agent ranks them. Each one covers the £19,058 gap:
   1. A School fees pot from this month: £690 a month, Nov 2026 to Dec 2028 (£17,940); November's planned surplus
      £2,636 → £1,946. 2046: £2,585,000.
   2. Holidays £400 → £150, Eating out £180 → £100, Shopping £250 → £150 a month, from Jan 2029 to Jul 2041, and
      £5,458 from Balanced in 2029 to 2031. 2046: £2,703,000.
   3. £19,058 from Balanced over 2029 to 2035, £9,090 of it in 2029. 2046: £2,582,000.

   Two more: start the fees in Jan 2032 instead (only if the date can move), or pause the SIP (it covers £3,436, not
   enough on its own).
4. **20:46** Arun confirms the pot: two audit rows (the plan item, and November's budget), each with Undo.
5. **20:52** and **20:58**, for the picked option's later states:
   - "my salary goes to £5,500 a month from Sep 2028" (a change_flow; his take-home would be £4,778 by then);
   - "close my HDFC loan with the SBI FD when it matures" (a record_event: ₹6,17,538 clears the ₹5,93,849 balance in
     Mar 2029, ₹23,689 is left over, and the ₹39,390 EMI stops 16 months early).

## Against MA-193's Projection boards

MA-193's fan was sketched yearly, with October's surplus growing a flat 3% a year: £2,769,000 in 2046. This ledger grows
pay, prices and each commitment month by month. Since MA-264 every run the boards show is the ledger's, the 26 Oct run
included, so the v4 Projection boards, Prototype v4 and the Agent Journey take their Projection figures from `R26`
and `what_if_26`.

MA-261's sentences are used as this household would say them, keeping lesson 13:
- the school fees verbatim;
- the salary step at £5,500, not £8,000, which would nearly double Arun's take-home;
- the loan closed is the HDFC loan, with the SBI FD; the household has no SBI home loan, and ₹2 crore is thirteen
  times the HDFC balance.

## The rest of the evening (the picked options' states)

**On the Plans tab (21:08 to 21:13)**, each step a new run:

| Time | What happens | 2046 middle path |
| --- | --- | --- |
| 21:08 | Arun pauses Replace the car | £2,977,000 |
| 21:09 | He resumes it, back to 21:05's run | £2,923,000 |
| 21:11 | He corrects School fees' end in place, Jul 2041 → Jul 2040 (version 2) | £3,037,000 |
| 21:13 | He ends Replace the car ("we're keeping the car") | £3,091,000 |

**The wedding (21:15 to 21:18).** Arun: "£20,000 for my sister's wedding in Mar 2027". It is a one-off with no source, so it is paid
from the surplus and then cash.

- Saved at 21:16, it takes 2046's middle path to £3,040,000.
- Cash goes £19,871 below zero in Jun 2027, when the extension is paid, and is back above zero in
  Mar 2028. This is the rearrangement offered for cash, not for the floor.
- The ways code finds, each keeping cash at zero or above and the surplus at the floor:
  1. Take it from Balanced (ISA) when cash runs short: Balanced (ISA) pays £19,871 in Jun 2027. 2046: £3,041,000.
  2. Move the home extension to Mar 2028. 2046: £3,041,000.
  3. Pause the School fees pot until Jun 2027, and take the rest from Balanced: Balanced (ISA) pays £14,302 in Jun 2027. 2046: £3,038,000.
- At 21:17 Arun applies the first way. At 21:18 he undoes it: the wedding stays saved, and cash is flagged again.
- At 21:20 Asha sees that state: the Budget forecast with the cash flag, the Plans tab without pencils, and in her own
  chat the ways, with nothing she can apply.

# The prototype's figure sets (MA-291, cut by MA-307)

`make_prototype_v5.py` joins `household-v4.json`, `future-plans-v4.json`, `talk-v5.json`, `wealth-v5.json`,
`team-india-v5.json` and `prices-v5.json` into Prototype v5's data file. MA-307 (Arun, 2 Nov 2026) made MyPaisa a
wealth tracker only, so the Forecaster's figures (`forecaster-v4.json`, MA-281), the engine's and the news and share
sets went with their scripts; git history keeps them. `prices-v5.json` is the price part of the old engine set, the
prices that value the holdings. `talk-v5.json` and `team-india-v5.json` were cut by hand to match the prototype, so
`make_talk.py` would put the market rows back, and `make_team_india.py`, which still reads the deleted Forecaster and
engine sets, cannot run, until each is cut the same way.
