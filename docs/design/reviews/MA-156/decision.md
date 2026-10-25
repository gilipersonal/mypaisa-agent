# MA-156: money in any currency, checked against the holding's currency

## The request, in Arun's words (24 Oct 2026)

> "On the telegram App, I should be able to add transactions using Any currency for any fund and chatbot to
> figure what the base currency of the holdings, If the holdings are in GBP and I try to invest INR to GBP
> holding, chat should be able to correct me."

The spec is `ARCHITECTURE.md` §4.7, with §4.1 (the Position and Transaction rows), §5.3 and §22.3. Designed in
MyPaisa DS v1, "Warm ledger" (MA-101). Every figure is illustrative: ₹20,000, £176.10, Balanced's NAV of £18.57
and the Nifty 50 index fund are made up, and £1 = ₹112.50 is the ECB reference rate of Friday 23 Oct, the one
illustrative rate every MyPaisa board uses.

## Where the designs are

| Page | What |
| --- | --- |
| [Currency check options](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Currency+check+options.dc.html) | This round: the three options side by side, then each option's cards in Telegram light and dark |
| [Currency check](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Currency+check.dc.html) | The six boards drawn ahead of the story on 24 Oct 2026 (MA-155), kept unchanged as the starting point |
| [MA-156 design review](https://claude.ai/artifact/GfNnLMaQ1WsyC2vypvCJGe) | The review page (`board.html` here): the question, the three first cards, the comparison and every step with its notes |

Both Claude Design files are in the MyPaisa app v1 project; the options file is mirrored at
`docs/design/app-v1/Currency check options.dc.html` with its etag in `docs/design/claude-design.json`.

**How it looks now.** No app exists yet, so the current screens are the planned boards, captured from Claude
Design into `current/` (`b0` the notes, `b1` to `b6` the six boards).

## The open point this round settles

With privacy on, planned board 6b hid both amounts but kept the rate (₹113.57 per £), and the member's own
messages, which Telegram draws, still show what was typed. Rate plus one amount gives the other, so the hidden
figure could be worked out. Each option settles it its own way; the privacy rule can travel, so a pick can take
one option's flow with another's rule.

## The options

| Id | Name | In one line | Privacy and the rate |
| --- | --- | --- | --- |
| 1a | Four ways on | The planned flow: the bot stops, says why and asks how to record it, a button for each way (pounds that arrived, the ECB rate, a rupee holding, cancel); each way leads to its own Confirm card | Hide what is yours, keep what is public: a rate worked out from the member's figures is hidden; the ECB rate stays with its date |
| 1b | Ask again, in pounds (recommended) | The correction is the guided flow's amount question asked again in the holding's currency, "How many pounds arrived?"; type them or send the screenshot, the ECB estimate is one tap with its figure on the button, a rupee holding is named, then Confirm | No amount and no rate on the card: only words, currencies and dates; Show amounts reveals one card |
| 1c | Correct inside Confirm | Straight to the Confirm card, the correction as its first line, the ECB estimate filled in, Recorded and You typed one under the other; Exact pounds, a rupee holding and Cancel as buttons | Tidy the message away: with privacy on the bot deletes the member's message with the amount once read (a bot may delete incoming messages in its private chat within 48 hours) and says so; the rate stays |

**Why 1b.** It is one pattern, not a new card: the guided flow's own "How much, in pounds?" (§9.2) asked again
in the holding's currency. The exact figure leads, the estimate is one tap with its figure in view before it is
chosen, and Confirm stays a separate, deliberate tap. It works unchanged before the daily ECB rates load (MA-44):
the estimate button is simply left out. Its privacy rule is one line to build and to test, and it holds when the
card is seen without the member's messages (a forwarded card, a screenshot of one card).

**Trade-offs.**

- **1a** is the least to redraw and puts every way on a button, but adds a card and a tap, and its privacy rule
  depends on the reader knowing which rates are public: with the typed ₹20,000 in view, the public ECB rate gives
  the pounds away.
- **1b** leaves typing the pounds as a way on without a button (the card says so), hides even the public ECB rate,
  and cannot hide what the member typed.
- **1c** has the fewest taps and is the only option where nothing on screen gives the amount away, but the
  estimate is the default, so a reflex Confirm saves an estimate; before MA-44 it needs 1b's question as a second
  design; and deleting a member's messages is new behaviour in MyPaisa that reaches every device.

**Shown for each option** (Telegram light and dark): the correction card, the Confirm card with two currencies,
and privacy on. 1b, the recommended one, also shows the ECB estimate, privacy on for the question and for
Confirm, and technical mode with its fold open. No currency named (planned board 4) and a rupee holding instead
(planned board 5) are the same in every option and stay as drawn. The picked option gets its remaining states
before the build: the HTML fallback, a long holding name, two or more rupee holdings, the "$" that needs asking,
pounds typed against a rupee holding (phase 13), and the screenshot path.

**The product's rules hold in all three.** Nothing is saved before Confirm and the second check (MA-102). The
converted figure and the implied rate are the engine's, at the ECB rate with its date, and the copy says "worked
out by MyPaisa's engine". No button buys or sells. The summary comes first. Telegram text carries no colour, so
the words carry the correction.

## What the build would touch (after the pick)

- `src/mypaisa_agent/`: the amount and currency parser, the `propose_change` tool, the log-a-transaction flow,
  the correction and Confirm cards, and how privacy mode renders a money card (and, for 1c, deleting the
  member's message).
- The registry: `Position.ccy` and the Transaction's `orig_amount`, `orig_ccy`, `fx_rate`, `fx_source`, `fx_date`.
- `ARCHITECTURE.md` §4.7 (the correction row and the privacy line), the boards in Claude Design (Currency check
  updated to the pick), `docs/trace.json` (MA-156 to `picked`, its boards) and `docs/TRACE.md`.

## Review for glitches

Every phone was rendered from Claude Design and read in Telegram light and dark (29 phones: 3 at a glance, 26 in
the options). Found and fixed before this record:

- The no-break space that keeps a figure with its unit was a plain space, so "about / 9.6 units" broke across
  lines; it is a real no-break space again, as in the planned file.
- Captions above the phones were cut with an ellipsis at 390 wide; they were shortened.
- The at-a-glance note sat under three phones and left half the row empty; it moved into the row's rule line.
- Technical mode clipped the first message under Telegram's header; the chat now opens at the question card.
- 1c's privacy card had lost "Nothing is saved until you confirm"; it is back. Its units broke the Recorded line,
  so they moved to the quieter line.
- The review page: a long chip ran past the hero at 390 wide and now wraps; a colour-mix tint on the
  recommended column read as unmeasurable and became a token.

Checked after the fixes: no raw template values, no cut buttons or captions, every Telegram button 44 px or
taller, no console errors, no sideways scroll at 1440. The review page was measured in light and dark at 1440 and
390: every text node meets WCAG AA, no image fails to load, no sideways scroll. (The outgoing bubbles' tails sit
past their bubble by design.)

## The pick

- Pick: **1b, Ask again, in pounds**, as drawn, with its own privacy rule (no amount and no rate on the card).
- Date: 25 Oct 2026.
- In Arun's words: asked "Which option for MA-156's currency correction should be built?", he chose "1b Ask again,
  in pounds (Recommended)".

Before the build, 1b gets its remaining states drawn: the HTML fallback, a long holding name, two or more rupee
holdings, the "$" that needs asking, pounds typed against a rupee holding, the screenshot path; and, found in the
review of PR #34, the ECB estimate's Confirm card with privacy on, the question card before the daily rates load (no
estimate button), privacy on for planned boards 4 and 5, the Technical details fold with privacy on, what Cancel
leaves on screen, the answer to "Which currency is Balanced in?" and the audit row with both amounts. They are the
trace row's `undrawn` list, so `start MA-156` refuses until they are. The HTML fallback is drawn for 1b only,
after the pick, rather than for every option. When one is drawn, its board goes on the row and the notes say
`Drawn: <the state>`.

The build waits for MA-24's skeleton and MA-38's typed transactions (phase 0 and 1). The estimate button joins when
MA-44 loads the daily ECB rates (phase 2); until then it is left out and the question is the same.

Boards 1 to 3 and 6 of `Currency check.dc.html` are the superseded starting point (their notes say so); its boards
4 and 5 stay part of the spec.
