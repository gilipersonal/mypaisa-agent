# MA-193: the whole-wealth screens at every door, and a clickable prototype

## The request, in Arun's words (26 Oct 2026)

> "Primary goal is to have a dashboard where I can see all my assests across counytries currently UK and India"
>
> "they will be driven via chatbot, with me asking and registering by asking the agents or providing agents with the
> information. For EMIs/Loans, the agent will ask me if the month's payment is done or if the user says its paid up
> full then it will close it. There will be no forms for me to fill."
>
> "The Forecast screen we have in Wealth Tracker should be renamed as Projection"
>
> "The UI should only allow editing existing figures by hand, no creation."
>
> "Performance is key and apps should be silky smooth like Monzo App."
>
> "For now just design and create JIRA stories and break into and clean phases, dont build anything"

The re-plan behind it is MA-186 (PR #37): the decisions D1 to D12, the phases renumbered, and 32 new stories.

## One figure set first

`docs/design/figures/household-v4.json`, from `make_household.py`, as lesson 13 asks.

- **The clock:** Mon 26 Oct 2026; prices at the Fri 23 Oct close; £1 = ₹112.50.
- **The household:** Arun (admin) and Asha.
- **Kept from the iOS boards:** their five UK holdings, £24,110.
- **The rest:** property, a saver, pensions, a Pune flat, an SBI FD, a PPF, an LIC policy, a mutual fund, a share,
  NRE savings, a mortgage, a car loan, an HDFC home loan and a card.
- **Net worth over the day:**
  - £439,951 to start;
  - £444,951 after the first record (09:41);
  - £457,951 after the Home correction (09:52).
- October's budget and statements add up line by line. The Projection starts from £457,951.

**Corrections made during the round, so every board agrees:**
- The Home correction is fixed at £428,000. One board had derived £421,000.
- The Projection starts after the correction (lesson 19).
- The card bill was paid in full on Tue 20 Oct, so the statement confirms the car loan's autopay instead.
- The HDFC loan ends with its 180th EMI in Jul 2030. A residue under ₹1 had counted as one more payment.
- Lesson 19, the later frames:
  - Once Sunday's card statement is confirmed at 08:44, its £1,458 is owed, so net worth is £456,493.
  - After Thursday's EMI it is £456,747.
  - Splits round by largest remainder so they always sum to the total shown.

## The boards (Claude Design)

**MyPaisa app v1** (browser, desktop 1440 and phone web 390, light and dark):
- [Web v4 · Shell and chat](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Shell+and+chat.dc.html)
  (MA-199, MA-208, MA-200, MA-185, MA-196)
- [Web v4 · Dashboard](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Dashboard.dc.html)
  (MA-208, MA-213, MA-95, MA-201)
- [Web v4 · Assets and debts](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Assets+and+debts.dc.html)
  (MA-217, MA-212, MA-215, MA-214, MA-204, MA-209, MA-210, MA-201)
- [Web v4 · Budget](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Budget.dc.html)
  (MA-96, MA-218, MA-220)
- [Web v4 · Projection](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Web+v4+%C2%B7+Projection.dc.html)
  (MA-224, MA-222, MA-223, MA-221, MA-219)
- [Prototype v4](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Prototype+v4.dc.html): the
  clickable walk-through.
  - **The top bar:**
    - the door switch (desktop at 1440, phone web at 390, iPhone);
    - light and dark;
    - privacy;
    - who is viewing (Arun or Asha);
    - Restart;
    - the ten steps, each one a jump target.
  - **The journey:**
    1. sign in;
    2. register £5,000 of savings, with net worth moving live;
    3. replay how the SBI FD was registered;
    4. the valuation check-in, then the Home value corrected in place to £428,000;
    5. Activity;
    6. Sunday's statements and the month close;
    7. Thursday's HDFC EMI check-in, with a "paid off in full" side branch;
    8. the Projection;
    9. a what-if and the plan items;
    10. Asha's view.
  - **Typing:** steps 2, 4 and 8 ask for a typed value, and "Type it for me" fills each one in.
  - **Built from:** the recommended options below (1a, 1a, 1b, 1a).

**MyPaisa iOS v1** (iPhone, and iPad where drawn; light and dark):
- [iPhone v4 · Home](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Home.dc.html)
- [iPhone v4 · Register](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Register.dc.html)
- [iPhone v4 · Check-ins](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Check-ins.dc.html)
- [iPhone v4 · Assets and debts](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Assets+and+debts.dc.html)
- [iPhone v4 · Budget](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Budget.dc.html)
- [iPhone v4 · Projection](https://claude.ai/design/p/43fdf88b-4960-4a4b-a4f1-fc653fcb7ab8?file=iPhone+v4+%C2%B7+Projection.dc.html)

## The options

| Question | Options | Recommended, and why |
| --- | --- | --- |
| The web shell with the chat | 1a Chat beside · 1b Chat first · 1c Ask bar | **1a**: it is the iPad's 1a at the laptop. A Confirm in the chat column moves the page beside it, and at 390 it uses the iPhone's tab bar. 1b shrinks the dashboard to a strip; 1c's drawer covers the figures a Confirm changes. |
| The dashboard (Overview) | 1a Net worth first · 1b Two countries · 1c What's next | **1a**: it reads the same at every width (the total, what it is made of, what is due). Each country keeps its own currency inside one card. The due list stays short because check-ins arrive in the chat. |
| The check-in card | 1a chips in one row · 1b Paid as the Confirm · 1c a compact row | **1b**: Paid looks like every other Confirm button. "Paid off in full", which closes a loan, cannot be hit by accident. It fits at any text size, and 1c's rows are reused for several check-ins due at once. |
| The Projection | 1a the fan first · 1b a story first · 1c decades | **1a**: it is the screen ARCHITECTURE §6.6 lists: the fan, milestones on the line, assumptions with sources, scenario chips and Ask. |

The other screens (registration, correction, check-in outcomes, statements, the month close, Budget, Assets, Debts,
plan items, what-ifs, Activity) are drawn once each, in the recommended styles.

## Points to settle

- **MA-197 (open on the trace and the story):** does approving a new kind need the second check? ARCHITECTURE
  §4.5's list does not name it.
- **Not drawn this round:**
  - iPad boards for Budget and for Assets and Debts (the dashboard has its iPad board);
  - the phone-web keyboard;
  - a rupee mark and country colours in `tokens.css`. Countries show as text chips, "UK · £" and "India · ₹".

## The pick

Arun, 26 Oct 2026, picked the recommended option each time:

| Question | Pick | Stories now `picked` |
| --- | --- | --- |
| The web shell with the chat | **1a Chat beside** | MA-199 |
| The dashboard | **1a Net worth first** | MA-208, MA-95, MA-213 |
| The check-in card | **1b Paid as the Confirm** | MA-205 |
| The Projection | **1a the fan first** | MA-224 |

**The rows:**
- Each picked row lists only the picked option and the states drawn in its style.
- The options not picked stay on MA-193's row as the record.
- Every other story drawn this round stays `planned`, drawn in the picked styles. Its own options round runs when it
  starts (plan-sync rule 3).

**What the pick supersedes:**
- On the trace rows:
  - `Wealth.dc.html`'s Household overview, Assets, An asset, Debts, A loan, Budget and Forecast;
  - the investment-only Home boards drawn for MA-78 before MA-186.
- The iPad and foldable layouts stay on MA-70.
- MA-161's ledger entry o5 now accepts the v4 iPad board for MA-208.

The prototype is built from these picks.
