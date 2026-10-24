# MA-103: a new MyPaisa mark that animates once when the app opens

## The request, in Arun's words (24 Oct 2026)

> "I need you to create really good motion animated log of the app"

Read as **logo**. Today's `docs/mark.svg` is the Nocturne-era violet mark (a pound coin with a market line
breaking out of it, watched from an orbit). It no longer fits MyPaisa DS v1, "Warm ledger", picked on MA-101.

## Where the designs are

[Logo](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Logo.dc.html), in the MyPaisa DS v1
project in Claude Design. Every option shows:
- the mark from 512 to 16 px, in light and dark;
- the app icon and Telegram's circle crop at 160, 64 and 32 px;
- horizontal and stacked lockups with a clear-space rule;
- the live intro with Replay, and a six-frame storyboard;
- the mark at work: the Mini App opening in Telegram, the sign-in page, the chat list, the chat header and a
  browser tab.

`logo-intros.mp4` and `logo-intros.gif` in this folder record the three intros side by side, light and dark.

## The options

| Id | Name | The idea | The motion |
| --- | --- | --- | --- |
| 1a | Stance line (recommended) | The navy coin is the hero card; the coral line every chart draws crosses it and ends in the ringed stance dot on the rim | The coin settles, the line draws left to right from the coin's edge, the stance lands with one small overshoot; done by 1180 ms |
| 1b | Ruled pound | A drawn £ over a coral rule: the bookkeeper's "total, checked" | The stem is written, the crossbar and foot rise, the rule is drawn last; done by 1160 ms |
| 1c | Watcher | Today's coin and £ with a thin orbit, the old mark's idea in the new colours | One coral dot travels two thirds of the orbit, slows, and rests at half past one; done by 1180 ms |

**Why 1a.** It is built only from what MyPaisa already shows, so the brand and the product say the same thing,
and the intro is the product in one second: a line drawn calmly, then one view placed. It needs no £, so it
stays right if the household ever holds more than sterling. 1c is the safe evolution of today's coin, but its
dot can read as an unread badge on an avatar. 1b is the sharpest at 16 px, but a bare £ beside the wordmark
reads like a price, so its lockups need a tile.

All three animate with transform, opacity and line drawing only, on the system's easing
(cubic-bezier(0.22, 1, 0.36, 1)). They play once, never loop, and show the final frame at once under Reduce
Motion. 32 and 16 px use a separate small cut with heavier strokes and fewer parts.

## Review for glitches

- The page was rendered in a headless browser and measured: no sideways scroll at 1440 (fixed: the cards and
  notes had run to 1808), no holes, nothing cut, no errors.
- Each intro was captured frame by frame by seeking its animations; the storyboard frames are the real
  animation paused at each time.
- Fixed: 1a's line poked past the coin's left edge at large sizes; it now starts on the rim at every size.

## Open

- On dark browser tabs the 1a coin is quiet even with the favicon's lighter tone.
- After the pick: replace `docs/mark.svg` and its PNGs (the bot's Telegram picture with `/setuserpic`, 1024,
  256 and 64), the web app's favicon, the sign-in page and the Mini App opening.

## The pick

**1c, Watcher.** Arun, 24 Oct 2026: "1c". Today's coin and £, with a thin orbit and one coral dot that travels
two thirds of it once and comes to rest at half past one: the agent keeping watch. 1a and 1b stay on the Logo
page, marked "Not picked".

The pick replaces `docs/mark.svg` and its PNGs, and the coin in every Claude Design screen (the sidebar, the
sign-in page, the bot's avatar in Telegram's chat list and header). The note against 1c, that its dot can read
as an unread badge on a small round avatar, is checked again on the chat list once the new mark is in place.
