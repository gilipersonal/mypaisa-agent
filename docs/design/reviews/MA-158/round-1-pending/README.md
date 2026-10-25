# Board fixes from MA-158's review, waiting on MA-160

Review round 1 of PR #35 (MA-158) and PR #34 (MA-156) found board defects. The edits were made and checked (rendered
in Telegram light and dark; the Prototype's 299 screens with no dead target), but these five files are too large for
Claude Design's inline write from a session, so they are not in Claude Design yet. Each `.diff` here is the change
to apply to that file in Claude Design (MyPaisa app v1), against the etag recorded in `docs/design/claude-design.json`
at the time. After applying: copy the file into `docs/design/app-v1/`, update its etag, bytes and sha256, clear the
`undrawn` items that name MA-160 (MA-32, MA-37, MA-63, MA-69, MA-77, MA-124, MA-130, MA-137, MA-156), say in each
row's notes `Drawn: <the item, as it was listed>`, add `Telegram · Research cards, privacy on` to MA-124's boards
(its 7c and 7d draw MA-124's state), and run the gates. That is MA-160.

| File | Fixes |
| --- | --- |
| Chat basics | Valuation from a screenshot h3 and the new h3b (MA-37); cancelling an invite with a card, Confirm, the second check and an audit row, new b7, b8, c6, c7 (MA-32); no stance line in the week-6 amber alert n4 (MA-69) |
| Research cards | the privacy board's note lists the cards that carry pounds; new 7c and 7d, no clear view with privacy on, its foot on 7d (MA-63, MA-124) |
| Admin center 3 | the routing board's "Include holding values in email" switch, off by default (MA-137); replay counts agree, the digest included (MA-130, MA-137); the Ceiling moved intro |
| Wealth | the Link a Google account refusal, only after a code (MA-77); no em dash as an empty value |
| Prototype | the currency chats click through option 1b's boards (MA-156); new chat screen c-cc6 |

Already in Claude Design and mirrored: `Currency check.dc.html` (boards 1 to 3 and 6 superseded, PR #34),
`Telegram chats.dc.html` and the DS `Telegram kit.dc.html` (the 8-week stance gate in the notes, PR #35).
