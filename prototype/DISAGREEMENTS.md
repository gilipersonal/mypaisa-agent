# MA-290 · where the boards disagreed, and what the demo follows

The demo follows ARCHITECTURE where boards disagree with it or with each other, and names each case here. The demo
ledger's own list (`docs/design/figures/demo-ledger-v4.json`, `disagreements`) holds the twelve settled when it was
written. None of these is a pick for its story: each is settled for real in that story's `/design-first` round or in
MA-279's redraw.

## The doors

- **Where the sidebar starts.** The DS shell (`tokens.css` `.mp-shell`) shows the sidebar from 1024 and the tab bar
  below. The width rule places the chat: beside the page from 1133, a sheet from 600 to 1133, a tab below 600. The
  demo uses both, so from 600 to 1023 a member has the tab bar *and* the chat as a sheet (an Ask button). Prototype v4's
  own container rule put the chat beside the page from 1024; the demo does not use it (lesson 23).
- **The iPad door** uses the web shell's markup in the iOS look (ios.css, the hero's segmented controls), not a
  SwiftUI-faithful sidebar. MA-279 draws the iPad screens once.
- **Pages with no web board** (Register, You, sign-in variants) show the iPhone boards' cards and rows at the web doors.

## Records, check-ins, Activity (lane A)

- **Premium Bonds:** the board approves a kind, not a holding, so the event's payload is the kind; no bond value is
  invented. Its second check is a question card ("Check it's you"), not the passkey sheet.
- **Replays** (the SBI FD, the Pune flat, the HDFC loan part-way, Asha's fund, Infosys) write nothing; each says so.
- **The valuation correction** is a Save card in the chat (Prototype v4 corrects it on the page); the page edit on the
  asset (lane B) writes the same event. The two-valuation card ("Both still right / One by one") is not drawn.
- **Free typing** in a question card is offered as chips ("type the figure" is not drawn).

## Assets, debts, budget, statements (lane B)

- **Interest left** on Debts is worked out (remaining payments times the EMI, less the balance): £110,789 against the
  board's £109,376; HDFC ₹2,48,555 / ₹2,59,274 against ₹2,48,556 / ₹2,59,275.
- **Cancel on the statement review** leaves the two files' rows: files are kept before anything reads them
  (ARCHITECTURE §4.9), so only the statement and EMI rows are not written.
- **A plan correction after the close** applies from November; closed October keeps its figure (Budget B9, B10).
  Asha cannot correct the household's plan.
- The amber lines are asked newest first, one card each.

## Projection, plans, forecast (lane C)

- **The fan** comes from the figure set's runs (R0, R5N, R1 to R4, R26), not Prototype v4's typed-in arrays. Before
  the Thu 5 Nov EMI the base run is R0; after it, R5N.
- **Forecast tables** exist for R0, R1, R2, R4, R7 and the wedding; R3 shows R2's and R5 and R6 show R4's.
- An illustrative plan change does not move the line; the page says so.

## Audit and files (lane D)

- **What Asha sees:** the boards do not say. Following ARCHITECTURE §4.6 and §8, she sees the household's rows, not the
  admin's security rows, and only her own files.
- **Opening a file** writes a `file_open` row (the boards' rule that every opening is itself an audit row).

## Admin center and You (lane E)

- **Telegram** is replaced by push (the Telegram boards are the superseded record).
- **Pausing the owner** has no control; the flow and the applier both refuse it (MA-102).
- **The ceiling** moves $160 → $50 (the browser boards); the iPhone board's $180 raise is not an event.
- **Notification switches** open a chat card to Confirm (Rule 4, as the board says); privacy and the Face ID lock act
  at once.
