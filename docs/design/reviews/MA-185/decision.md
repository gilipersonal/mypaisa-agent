# MA-185: the web app's sign-in, as an options round

An options round. Wed 25 Nov 2026. **Awaiting Arun's pick.**

## The request, in Arun's words

25 Nov 2026:

> Complete all the UX implementation work that we designed using stubbed data for MA end to end - including login
> page, switching between dark/light mode etc.

Asked the same day how to run it, he chose an options round for each planned area before it is built. Sign-in is the
first: MA-185's boards are `planned`, not `picked` (`docs/trace.json`: "The login board was picked with Telegram's
button on it; MA-161 redrew it ..., so it is planned again until Arun looks at it in this story's options round").
Only the option he picks is built, on stubbed data: a stub sign-in that lands on Home, no real sign-in yet.

## Where it lives

- The board: `Web sign-in.dc.html`, one canvas with the three options, `1a`, `1b` and `1c`, and the three side by
  side (`all`). `?embed=<id>` shows one of the four and scales a frame wider than the panel to fit it;
  `?theme=dark` draws the canvas itself in dark (each frame keeps its own theme); `?static=1` stills the motion.
- The round's page: `options.html`, to be published as a private Claude Artifact with root `docs/design`. Link: https://claude.ai/artifact/3Qi16PACWiVmD4WAtYnqAs (published 25 Nov 2026 by the lead).
  The page finds the board from either place: at
  the root of `docs/design`, where the Artifact puts it, and in this folder, when it is opened from the repo on a
  static server. Its script holds both sets of paths as a table and reads none back from the page. The page is plain
  ASCII and declares UTF-8, so a server that sends no charset cannot garble it.
- What the publish needs beside the page, each at its path under `docs/design`:
  `reviews/MA-185/Web sign-in.dc.html`, `ios-v1/support.js`, `ds-v1/tokens.css`, `ds-v1/motion.css`,
  `ds-v1/motion.js`, `ds-v1/fonts.css`, `ds-v1/inter-latin-wght-normal.woff2`,
  `ds-v1/inter-latin-ext-wght-normal.woff2`, `ds-v1/nunito-figures-latin-800.woff2`,
  `ds-v1/nunito-figures-rupee-800.woff2`. The board's runtime loads React from unpkg, as every board does.
- `current/`: today's planned boards, captured from the repo: Browser · Sign in at 1440 and 390, light and dark
  (Web v4 · Shell and chat); Browser · Login, Refusals & Invite Landing at 1440 and 390, and the join page, its
  passkey offer and its used link (Web v4 · Login, invite and responsive). The web app has no sign-in page yet.
- `tokens.css` here is the snapshot of `docs/design/ds-v1/tokens.css` on the day. The round adds and changes no
  token.
- The board was drawn from a generator kept outside the repo, as MA-355's were; the flat file is the record.

## How it was drawn

- One set of words in all three options, so the page is what differs. The paused line is ARCHITECTURE §4.5's, word
  for word. The join page's words are the ones picked on MA-301 e 1a, as `app-v1` carries them today.
- Names and times are the figure set's: `talk-v5.json` (Arun's invite of Sat 5 Sep 18:00, good until Sun 6 Sep
  18:00, used by Asha on Sun 6 Sep at 10:12; Arun signs in to the web app with Apple on Mon 26 Oct at 09:30, with
  Apple since Fri 4 Sep and no passkey) and `household-v4.json` (Home at 09:30, before the 09:41 record: £439,951,
  which is £686,694 owned less £246,743 owed, as the built Home shows it on stubbed figures).
- Every colour is a DS v1 token, with one exception: Apple's and Google's own buttons keep the colours those two
  ask for, as Browser · Sign in draws them today.
- 1c's bones use `--mp-mask` and `--mp-mask-hero`; no new token.
- Icons are Lucide from `ds-v1/lucide.js`, drawn one path per sub-path, so MA-356's fault does not show.

## The options

Recommended first.

| | What it is | Trade-off |
| --- | --- | --- |
| **1a · One card, everything in place** (recommended) | One card on the warm ground holds every moment: signing in, a refusal, the passkey offer, the invite, offline. The join page picked on MA-301 is already this card and does not change. A refusal is said inside the card and the buttons stay live where they were. | No welcome: the page says nothing about what MyPaisa is. On a laptop most of the window is plain ground. |
| 1b · The navy door | The window in two halves, as today's planned sign-in page. The navy half says what this is: the household's line on signing in, the invitation itself on an invite link. The other half is the way in. | Half the window repeats one line at every sign-in. On a phone the navy pushes the buttons into the lower half. The picked join page changes shape, though not its words. A paused member's one line sits beside an empty navy half. |
| 1c · A sheet over the app | The app is already there as bones (the sidebar with the mark, the page as blank blocks, no figure and no name), and signing in is a sheet over it, the size and corner of the chat's sheet. Once in, the sheet drops and the blocks fill. | Blank blocks before sign-in can read as a page that failed to load; a refused or paused person is left looking at an app they cannot open; the shell must draw with no session; the largest build. |

Why 1a: one part draws five pages, so they cannot drift; the newest pick (the join page) stays exactly as it is;
after a refusal the right button is still under the thumb; it is the smallest build, for the stub now and for real
sign-in later; and it is the same page at every width and in the installed app's own window.

### What each would change if picked

- **1a:** the web app gains one sign-in card, used by a sign-in route and a join route. Web v4 · Login, invite and
  responsive: section 1 redrawn as these pages, section 3 kept. Web v4 · Shell and chat: Browser · Sign in and
  Browser · Sign in, phone retired, with their trace lines.
- **1b:** a two-pane sign-in layout with a welcome for each moment. Web v4 · Login, invite and responsive:
  sections 1 and 3 both redrawn. Web v4 · Shell and chat: Browser · Sign in kept and updated.
- **1c:** the web shell learns to draw signed out and gains a sign-in sheet beside the chat's. Web v4 · Login,
  invite and responsive: sections 1 and 3 both redrawn. Web v4 · Shell and chat gains the signed-out shell and
  loses Browser · Sign in.

## The same in all three

- Apple's and Google's own buttons, Apple's first, then a passkey. No password, and nothing to type (§4.5).
- Nothing about a household shows before sign-in: no figure, no name. Only an invite link names one.
- A paused member gets §4.5's one line and nothing else.
- The join page keeps what MA-301 e 1a picked: who invited you, what a member can do, two live buttons, how long
  the link lasts, and no passkey before the member exists.
- Offline reads as the chat sheet's own banner does. A cancelled Apple or Google window leaves the page as it was.
- The mark is still on these pages. It arrives once, in the sidebar, when Home first paints after sign-in
  (ds-v1 · Mark in motion).

## For Arun to settle with the pick

1. **A removed member.** ARCHITECTURE gives a paused member one line and says nothing for a removed one. Drawn: a
   removed member meets the "isn't linked to MyPaisa" page, because their account is linked to no member any more.
   Should they get a line of their own?
2. **How often the passkey is offered.** Drawn once per browser, straight after the first Apple or Google sign-in
   there; Not now is remembered on that browser, and You still offers it.
3. **"Get MyPaisa for iPhone".** Today's planned sign-in page ends with this link. It is left off: the app comes
   by TestFlight invite, and the page says nothing else to a stranger. Back in, or out?
4. **Google's button.** All three draw Google's own mark and colours, where the picked join page draws a tinted
   button with a blue G. Drawn as Google's own everywhere, the join page included.

## Not drawn, not checked

- An expired link (it reads as the used one, with the time it ended); a passkey this device does not hold; the
  session ending while the app is open; the second check in a browser (MA-76); adding a second sign-in from You
  (MA-77: the refusal only points to it).
- 1920 wide, and the pages in the installed app's own window (no browser bar). The narrowest frame drawn is the
  invite at 320.
- Keyboard focus is the design system's own ring on every button; no frame draws it.
- Contrast and 25% brightness (QA on the built code, MA-304); WebKit and Firefox (looked at in Chromium only);
  motion at full frame rate.
- The Apple and Google buttons are drawn at 50 px. Google's own rendered button is 40 px at its largest, under the
  44 px target, so the story that brings real sign-in settles whether Google's button is rendered by Google or
  drawn to its guidelines. To be confirmed against Google's documentation then.

## The pick

Awaiting Arun's pick.
