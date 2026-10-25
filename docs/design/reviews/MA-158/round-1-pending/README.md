# Board fixes from MA-158's review, waiting on MA-160

Review round 1 of PR #35 (MA-158) and PR #34 (MA-156) found board defects. The edits were made and checked (rendered
in Telegram light and dark; the Prototype's 299 screens with no dead target), but these five files are too large for
Claude Design's inline write from a session, so they are not in Claude Design yet. Each `.diff` here is the change
to apply to that file in Claude Design (MyPaisa app v1), against the etag recorded in `docs/design/claude-design.json`
at the time. After applying: copy the file into `docs/design/app-v1/`, update its etag, bytes and sha256, clear the
`undrawn` items that name MA-160, and run the gates. That is MA-160.

| File | Fixes |
| --- | --- |
| Chat basics | Valuation from a screenshot h3 and the new h3b (MA-37); cancelling an invite with a card, Confirm, the second check and an audit row, new b7, b8, c6, c7 (MA-32); no stance line in the week-6 amber alert n4 (MA-59) |
| Research cards | the privacy board's note lists the cards that carry pounds; new 7c, no clear view with privacy on (MA-63, MA-124) |
| Admin center 3 | the routing board's "Include holding values in email" switch, off by default (MA-137); replay counts agree; the Ceiling moved intro |
| Wealth | the Link a Google account refusal, only after a code (MA-77); no em dash as an empty value |
| Prototype | the currency chats click through option 1b's boards (MA-156); new chat screen c-cc6 |

Already in Claude Design and mirrored: `Currency check.dc.html` (boards 1 to 3 and 6 superseded, PR #34),
`Telegram chats.dc.html` and the DS `Telegram kit.dc.html` (the 8-week stance gate in the notes, PR #35).
