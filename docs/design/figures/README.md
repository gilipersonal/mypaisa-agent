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
- The fan's p10, p50 and p90 by year to 2056 are from an illustrative engine run. It starts after the correction,
  at £457,951; the 2036 middle path is £1,316,000.
- The assumptions:
  - Parag Parikh's 10.7% XIRR is shrunk to 9.06% (3.8 years of history moves the prior only a little).
  - The FD and the PPF are at their contract rate of 7.1%.
  - Salary growth is 4.17% for Arun (his measured 4.8%, blended with the UK's 3.5%) and 3.5% for Asha.
  - Inflation is 2.5% in the UK and 5% in India.
- The plan items:
  - a home extension, −£35,000 in Jun 2027;
  - Asha's bonus, +£3,000 every March;
  - a new car, −£25,000 in Jun 2031.
- The what-if: £60,000 down on a second flat in Jun 2028 puts 2036's middle path £83,000 lower (£1,233,000).
