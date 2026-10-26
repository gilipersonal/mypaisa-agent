# MA-161: MyPaisa becomes one native iOS app

## The request

Arun, 25 Oct 2026:

> Now I need you to redesign everything from Telegram to iOS app. No more telegram login, on Google SSO or iOS
> login. And all make the app into a cool mobile chatbot where they can maintain everything and even see the
> dashboard of the holdings in the household.
>
> Only iOS app is needed and nothing else for now. I need end to end detailed design and UX, all necessary
> documents and html artifacts update them as needed.
>
> The UI design of the iOS app should be placed on claude design and should follow Apple guidelines and liquid
> glass UI.. https://developer.apple.com/design/human-interface-guidelines scalable enough to open in any Apple IOS
> mobile, iPAD OS or Duo. It should closely follow the design styling we are doing for the webapp which has Monzo
> like look and feel.

And, the same evening, in this order:

> as usual create detailed Jira stories and tasks, epics and phases for me to implement it
>
> Make sure all the components and elements (including graphs and charts) have really good animation and motion
> effects all over the app (webapp and iOS)
>
> No we have webapp for the dashboard and admin portal pwa rigjt ? That will still be there for the read only
> dashboard we discussed
>
> The ready only dahsboard should also be shown on the ios tablet duo
>
> Take special care of dark mode and light mode in ios and ipad, the text and compoennt should be clearly visible
> even in 25% mobile brightness

So the iOS app replaces the Telegram bot, not the web app: the web app stays as a read-only PWA for the
dashboard and the Admin center (below), the iOS app shows the dashboard on every iPhone, iPad and foldable, one
motion system runs through both (MA-182), and both stay legible in light and dark at 25% brightness (MA-181).

## What changes, in one table

| Before (to 25 Oct 2026) | From MA-161 |
| --- | --- |
| A Telegram bot per environment (BotFather, a token in SSM, a webhook) | No bot. One SwiftUI app, **MyPaisa**, for iPhone and iPad; a **MyPaisa Dev** build points at dev |
| Sign in with Telegram (`initData`, the Login Widget), Google on a laptop, passkeys in a browser | **Sign in with Apple** and **Sign in with Google**, native, verified in Cognito's custom-auth Lambdas; a passkey optional; no passwords, still |
| The chat in Telegram: rich messages, PNG charts, reply keyboard, `/commands` | The chat in the app: native cards (SwiftUI) from the agent's JSON, Swift Charts from the engine's series, a composer with attachments and shortcut chips; the `/commands` stay as typed shortcuts |
| A read-only web app at `console(-dev).mypaisapp.com`: a Mini App inside Telegram and a laptop browser | The same screens inside the iOS app (Home, a holding, Overlap, Scorecard, Audit and Files, Activity, the Admin center) on every iPhone, iPad and foldable; and the web app kept as a read-only PWA at `console(-dev)` for the dashboard and the Admin center in any browser. No Mini App |
| The second check: Face ID or a PIN in Telegram, a fresh passkey or Google sign-in in the browser | One second check: a fresh Sign in with Apple (a Face ID sheet) or a passkey assertion (Face ID), bound to the action and verified by the server; Google members re-sign in. Never a local-only Face ID |
| Replies through `outbox.fifo` and a `sender` that honours Telegram's limits | The same queue and `sender`, now delivering to the app's live connection (API Gateway WebSocket at `live(-dev).mypaisapp.com`) and, when the app is closed, by Apple push (APNs) |
| Alerts to the web app's Alerts page, Telegram and email | Alerts to the app's Alerts page (Admin center), push and email |
| The Mini App and browser boards; the Telegram kit | The iOS kit in MyPaisa DS v1 and the boards in a new Claude Design project, **MyPaisa iOS v1** |

Everything behind the front door stays: the registry, the audit log, the queues, the engine, the cards' content,
the Claude ceiling and its ladder, the Forecaster, the agent team, India. "Only iOS app is needed and nothing else
for now" is read with Arun's correction: no bot, no Mac app and no Android app; the web app stays for reading and
for the Admin center. The iOS app runs on Apple silicon Macs as "Designed for iPad" only if that is switched on
later; it is off.

## The web app, kept (MA-183, MA-184, MA-185)

One static app in `web/` at `console(-dev).mypaisapp.com`, installable as a PWA on a laptop, an iPad or a phone:
Home, a holding, Overlap, Scorecard, Audit and Files, Activity and, for the owner, the Admin center. No chat:
every change is a card and Confirm in the iOS app. Sign in with Apple (JS, the environment's Services ID), Google
(Google Identity Services, the web client id) or a passkey, through the same custom-auth exchange; the api sets an
`HttpOnly`, `Secure`, `SameSite=Strict` session cookie; CORS for that console only; the service worker caches the
shell, never a figure. Its spec is the browser boards in MyPaisa app v1, picked before MA-161, with the sign-in
page redrawn for Apple, Google and a passkey; it gets the same motion and the same legibility as the app. The
console also serves the iOS app's `apple-app-site-association` file, so an invite or a holding link opens the app
on a phone that has it and the web page anywhere else.

## The dashboard on iPad and the foldable

"The read only dashboard should also be shown on the ios tablet duo": every dashboard screen (Home, a holding,
Overlap, Scorecard, Audit and Files, Activity, the Admin center) is drawn at regular width on iPad and on an open
foldable, with the chat beside it; folded, the same screens fall back to the compact layout without losing their
place.

## Motion (MA-182)

One motion system for every component and chart, in the app and the web app. SwiftUI's `.smooth` for content
arriving, `.snappy` for controls, `.bouncy` only for success; a 45 ms stagger, at most eight; glass morphs in a
`GlassEffectContainer`; figures as `numericText` that count up once and afterwards roll only their changed digits;
charts drawn in under a mask, scrubbed with a glass lollipop and a selection haptic; messages pushed in from the
bottom; a holding row zooming into its screen; haptics for success, warning, selection and send. Nothing loops,
and under Reduce Motion everything becomes a short cross-fade or lands at once. On the canvas the boards share
`motion.css` and `motion.js` (in all three projects): each frame plays its arrival when it scrolls into view, with a
replay chip; `?static=1` stops it for still captures. The iOS kit's `12 · Motion` board holds the spec.

## Legible at 25% brightness (MA-181)

`scripts/contrast_check.py` measures every colour pair the screens use, in light and dark, at full brightness and
at a simulated 25% (each luminance times 0.25, plus 0.05 of room glare): body text 7:1 and 4.5:1 dimmed, other
text 4.5:1 and 3:1, meaningful non-text 3:1 and 1.8:1. It runs in the plan-sync gate and in CI. Light mode passed
already; dark mode's secondary and tertiary text, the accent, the alert crimson and the Hold, Rebalance and Watch
chips were lifted to pass (`tokens.css`), and glass got a denser fill (`ios.css`). Rules on every board: no
tertiary grey for anything a member must read and never on glass; nothing under 12 pt; no light or thin weights;
no hairline as the only edge of a control; glass carries labels only, and iOS turns it dark over dark content.

## Devices and size classes ("any Apple iOS mobile, iPadOS or Duo")

The app is one universal binary for **iOS and iPadOS 26 and later** (Liquid Glass arrived with iOS 26; every
household device runs it). It never asks which device it is on; it lays itself out by **size class and window
width**, so it fits every iPhone, every iPad in every multitasking size, and a two-panel or foldable device
("Duo", read here as a foldable or dual-screen Apple device, folded or open) without a special case:

| Width | Where | Layout |
| --- | --- | --- |
| Compact (under about 600 pt) | iPhone in portrait; iPhone landscape on the smaller models; iPad Slide Over and one-third Split View; a foldable when folded | Tab bar at the bottom (Liquid Glass); one column; sheets for detail; the chat is a tab |
| Regular, narrow (about 600 to 900 pt) | iPad portrait; two-thirds Split View; a foldable open; a Stage Manager window | Sidebar that collapses to a tab bar at the top (`sidebarAdaptable`); the screen and the chat side by side when the window is wide enough, otherwise the chat as a sheet |
| Regular, wide (over about 900 pt) | iPad landscape; a large Stage Manager window | Sidebar, the screen, and the chat as a trailing column beside every screen (an inspector), so a member reads Home and talks to MyPaisa at once |

A fold, a rotation or a window resize keeps the conversation, the scroll position and any guided flow in place
(scene state restoration). Dynamic Type from xSmall to AX5 reflows every card (figures stack under labels from
AX1); hit targets stay 44 pt; Reduce Transparency, Increase Contrast and Reduce Motion are honoured by the system
materials and by every custom view. Hardware keyboard on iPad: Return sends, Shift-Return breaks a line, ⌘K
focuses the composer, ⌘1 to ⌘5 the sections, ⌘F search, Esc closes a sheet; pointer hover on rows and buttons.

## The look: Warm ledger on Liquid Glass

"Closely follow the design styling we are doing for the webapp which has Monzo like look and feel": MyPaisa DS v1,
Warm ledger (MA-101), stays the system. Its tokens become the app's colour assets (light, dark, and increased
contrast); its type scale already is Apple's Dynamic Type at the Large size; its components already follow the
HIG's grouped lists, segmented controls, sheets and 44 pt targets. What MA-161 adds is the layer Apple calls
Liquid Glass, used the way the HIG says:

- **Two layers.** Content (the navy hero card, the warm cards, the lists, the charts, the chat's messages) stays
  solid Warm ledger. Liquid Glass is the layer of controls that floats above it: the tab bar, the sidebar,
  toolbars and their buttons, the composer, the shortcut chips, menus, partial-height sheets and the search
  field. Glass never sits on glass, and content is never made of glass.
- **Tint with intent.** Glass is clear by default; only the primary action of a control group is tinted, in the
  coral accent (Send, the composer's primary chip). Confirm on a card is a content button (filled accent), not
  glass. Red stays for alerts that ask for action and for destructive actions.
- **Scroll edge and concentricity.** Content scrolls under the glass bars with the system's scroll-edge effect;
  corners are concentric with the device and the sheet (cards 20 pt, the hero 24 pt, rows 14 pt, as the tokens
  say).
- **Type.** SF Pro (the system font) through Dynamic Type text styles; SF Pro Rounded, heavy, for the hero
  figures, as the tokens' `--mp-font-round`; tabular numerals for every figure; SF Symbols for icons (the web's
  Material Symbols were their stand-in).
- **The mark and the icon.** The 1c Watcher mark (MA-103) becomes the app icon in Apple's layered format: default,
  dark, clear and tinted. MyPaisa Dev carries a small "DEV" band so the two are never confused. The mark's one-time
  animation (MA-103) plays on the launch screen's hand-off, once per cold start, and lands at once under Reduce
  Motion.
- **Motion.** The system's: sheet detents, navigation pushes, glass morphing between the composer and its
  expanded state, numbers counting to their value once. Nothing loops.

## Three shells for Arun's pick (`Shell options.dc.html`)

Every option has the same screens; they differ in what the app opens to and how the chat and the dashboard meet.

| | 1a Chat first (recommended) | 1b Ask from anywhere | 1c One timeline |
| --- | --- | --- | --- |
| Opens to | The chat, with the household's total and day's move in a glass strip at the top | Home, the dashboard | The chat; there is nothing else |
| Tabs (iPhone) | Chat · Home · Activity · You (Search as the system's separate search tab) | Home · Holdings · Activity · You, with the composer as the tab bar's bottom accessory on every tab | None: a glass rail of pinned live cards (Portfolio, Today, Alerts, Spend) above the conversation |
| The dashboard | Its own tab; pulling the strip down opens it as a sheet over the chat | The app itself | Each pinned card opens its screen as a sheet |
| The chat | Its own tab; every screen's Ask opens it about that screen | The bottom accessory expands to the full chat, carrying the screen's context ("Ask about Balanced") | Always on screen |
| iPad and an open foldable | Sidebar · the screen · the chat beside it | Sidebar · the screen · the chat beside it | The conversation with the pinned cards as a column beside it |
| Why | Arun asked for "a cool mobile chatbot ... and even see the dashboard": the chat is the front door and the figures are one swipe away; every change starts where it is made | The most native iOS 26 pattern (Music's mini player); best when the household mostly reads | The purest chatbot; Audit, Activity and the Admin center become sheets, which is cramped for the owner |

The recommendation is **1a**. The flow boards are drawn in 1a's shell; every screen on them is shared by the
three options, so a different pick changes the frame around the screens, not the screens.

## The boards (Claude Design)

MyPaisa DS v1 gains **`iOS kit.dc.html`** (the Liquid Glass layers, colour assets, Dynamic Type, the tab bar and
sidebar, toolbars and the composer, messages and cards, buttons and chips, sheets and menus, charts, the app icon,
accessibility, motion) and **`ios.css`**, the kit's classes over `tokens.css`. The screens are in the new project
**MyPaisa iOS v1**, mirrored into `docs/design/ios-v1/`:

| File | Boards (each drawn in light and dark) |
| --- | --- |
| `Shell options.dc.html` | 1a Chat first, 1b Ask from anywhere, 1c One timeline: iPhone and iPad each |
| `iPhone sign-in.dc.html` | Welcome; Sign in with Apple; Sign in with Google; Joining from an invite; First-run setup; Notifications and Face ID; Sign-in refused |
| `iPhone chat.dc.html` | Chat home; Portfolio card; Stance card, technical open; Guided flow: log a transaction; Confirm card; Attach a file; Reading a factsheet; Factsheet card with amber fields; Screenshot valuations, before and after; Currency check; What changed this week; Red alert card; Preference card; Streaming reply; Offline and retry; Ceiling reached: templates only; Privacy mode in the chat |
| `iPhone dashboard.dc.html` | Home, household; Home, me; Holding; Holding, technical; Why? sheet; What if? sheet; Overlap; Scorecard; Today's brief; Home, privacy on; Home, empty; Home, loading; Home, stale prices |
| `iPhone audit and activity.dc.html` | Audit; Audit, a change from a file; Files; File preview; Activity; A run |
| `iPhone admin.dc.html` | Admin center; Members and devices; A member: sign out, pause, restore; Invite a member; Second check; Spend and the ceiling; Move the ceiling; Caps and alerts; Alert routing; Failed work and Replay |
| `iPhone settings.dc.html` | You; Privacy and Face ID lock; Notifications and quiet hours; Sign-in methods; Pause and resume; Leave the household; Lock screen: the morning brief; Lock screen: a red alert; App switcher |
| `iPad and foldable.dc.html` | iPad · Home with the chat beside it; iPad · Holding, portrait; iPad · Overlap and Scorecard; iPad · Audit and Activity; iPad · Admin center; iPad · Split View, one third; iPad · Stage Manager window; Foldable · Open; Foldable · Open, Audit; Foldable · Folded; iPad · Keyboard shortcuts; iPhone · Landscape |
| MyPaisa app v1 (the web app) | the browser boards kept as the web app's spec (Browser, Browser 2 with the sign-in page redrawn, Responsive, Audit and files, Admin center 1 to 3, Forecast, Wealth, India), now with the shared motion |

The boards are **planned** (`.claude/rules/plan-sync.md`): drawn ahead of their stories, put through
`/design-first` when each story starts. The Telegram kit, the Mini App, Browser and Telegram boards, and the
Prototype in MyPaisa app v1 are kept as the record and are superseded; nothing is built from them. Where Arun
already picked a flow (MA-156's 1b currency check, the Portfolio and Confirm cards of MA-34, the brief and alert
cards of MA-55, the chart house style of MA-56), the iOS boards carry that pick's content and order into the app;
the row's notes say so, and its design is `planned` again until Arun has seen the iOS rendering.

All figures, names and holdings on the boards are illustrative.

## How it works underneath

**Identity** (`ARCHITECTURE.md` §4.5). Each environment keeps its own Cognito user pool. The app shows Apple's and
Google's own buttons. Sign in with Apple runs natively (`ASAuthorizationAppleIDProvider`) and returns Apple's
identity token, with the SHA-256 of a one-time nonce from the api inside it; Google runs through Google's iOS SDK
(an `ASWebAuthenticationSession` with PKCE) and returns Google's ID token. The app sends the token to
`/auth/apple` or `/auth/google`; the api starts Cognito's custom auth for the member that provider account is
linked to, and the verify trigger checks the token against Apple's or Google's published keys: issuer, audience
(the app's bundle id, or the environment's Google iOS client id), expiry, an issue time under five minutes, the
nonce, and no replay. An account linked to nobody is refused, unless it carries a valid invite, which creates the
member. Access tokens last five minutes; the refresh token (rotated on use) and the rest live in the Keychain,
this device only, after first unlock. The api's authorizer checks the token, the member's status and session
epoch on every HTTP call and on every live connection. Each signed-in device is a `Device` row (name, model,
last seen, push token), so the owner signs out one device or all of them (MA-102).

**The second check** (MA-76, MA-102). A Confirm that needs it (an Admin center action, an import, rolling back)
asks the server for a challenge bound to that action, then gets a fresh assertion: Sign in with Apple again (iOS
shows a Face ID sheet) or, where the member added one, a passkey (Face ID); a Google-only member signs in with
Google again. The server accepts the action only with an assertion under five minutes old whose nonce is that
challenge. A local Face ID check alone never authorises anything on the server.

**The chat** (§8, §9, §21). The app posts each message to `POST /v1/chat/messages` with a client id (the dedupe key
on `updates.fifo`, one lane per member) and gets `202` at once. Files go first to a presigned upload into the
documents bucket (kept for good, MA-148), then the message names them. Taps on a card's buttons post to
`/v1/chat/actions` and are acknowledged at once. The agent streams its words to the open app over the live
connection while it writes; cards arrive whole, from the agent's JSON, with every figure from code. The `sender`
reads `outbox.fifo` (one lane per member) and delivers each finished message to every live connection of that
member, and by push to each device without one. On opening, the app asks for everything after the last turn it
has, so nothing depends on a socket staying up. Typed while offline: kept on the device with its client id and
sent once back online; a figure shown offline carries its time.

**Push** (§11). Token-based APNs (a `.p8` key per environment in SSM). The 07:15 brief and the wrap are ordinary
notifications; a red alert is time-sensitive with sound (still two a week at most); amber is passive. A
notification never shows an amount on the lock screen unless the member turns that on; with privacy mode on it
never does.

**The dashboard** (§9). Read-only by construction, as before: the data routes are GET; a screen's Update or Ask
opens the chat with the right guided flow already started; the only writes outside the chat are the owner's
Admin center actions, each behind the second check and an audit row.

**Domains** (§18.2). `api(-dev)` (HTTP API), `live(-dev)` (WebSocket API), `auth(-dev)` (Cognito, the passkey
relying party's home until MA-109 fixes the id), and `console(-dev).mypaisapp.com`, S3 and CloudFront: the web
app, and the `apple-app-site-association` file for the invite links (`https://console.mypaisapp.com/join/<token>`);
it holds no data.

## Delivery and cost

- **Apple Developer Program**, $99 a year (about £76 at $1.30): needed for Sign in with Apple, push, TestFlight
  and the app ids. Arun's call; it is the one new cost, and MA-162 asks for it.
- **Distribution**: TestFlight internal testing for both apps (MyPaisa Dev and MyPaisa); Arun and his wife are
  App Store Connect users; no App Review for internal builds. A build lasts 90 days, so a release goes out at
  least every 60, and an alert says when one is due.
- **CI**: GitHub Actions on a macOS runner for PRs that touch `ios/` (build, unit and UI tests on the simulator,
  snapshot tests in light and dark at three sizes and AX5, the accessibility audit, swift-format); a merge to
  `main` sends MyPaisa Dev to TestFlight; MyPaisa (prod) goes after Arun approves in the GitHub `prod`
  environment, as the Lambdas do. The App Store Connect API key is a secret of that environment only. macOS
  minutes count ten to one against the account's free minutes; measured in the first month, and Xcode Cloud's 25
  free hours a month (with the Developer Program) are the fallback if they run out.
- **Keys**: per environment, an APNs key (push) and a Sign in with Apple key (it signs the revocation of a
  leaving member's Apple token), each put by hand into SSM after the apply that made its parameter (MA-164).
- **AWS**: the WebSocket API is $1 per million messages and $0.25 per million connection minutes; APNs is free;
  the CloudFront site for the links is inside the free tier. Pennies, inside the £50 cap.

## Open questions for Arun

- The shell: 1a, 1b or 1c (the pick for MA-163).
- Joining the Apple Developer Program at $99 a year (MA-162).
- "Duo": read as a foldable or two-panel Apple device; the layouts follow width, so any such device is covered.
  Say if it meant something else.

## What the build will touch

`ios/` (new: the Xcode project, the `MyPaisaKit` and `MyPaisaUI` packages, the app and its tests),
`src/mypaisa_agent/handlers/{api,sender}` and the Cognito triggers, `infra/` (the WebSocket API, the `app` site,
APNs and Apple parameters; the console's bucket and the Telegram parameters never made), `.github/workflows/`
(the iOS gates and the TestFlight lanes).

## Glitches found and fixed

Each lane rendered its boards in light and dark, at every size they claim, with motion settled, with `?static=1`,
and with the dark frames dimmed to 35%, and fixed what it found before reporting.

- **Figures that did not add up.** The brief listed five holdings summing to £25,914 under a £24,110 total; caught
  by the dashboard lane before any board shipped. Every board now uses holdings that sum (£22,925 + £512 + £304 +
  £188 + £181), and lesson 10 joins `.claude/rules/independent-review.md`.
- **A weekday that did not exist.** 23 Oct 2026 is a Friday; every board, ARCHITECTURE's example card and the
  dates around it now follow the 2026 calendar.
- **Shell options on iPad.** Option 1a's centre column clipped its segmented control and overlapped its holdings;
  1b's holdings list stretched into an empty block; the Portfolio card carried a stance a portfolio cannot have.
- **Legibility at 25% brightness.** 16 colour pairs failed the new gate: dark mode's secondary and tertiary text,
  accent, alert and three stance chips, and labels on glass in both themes. Tokens and glass were tuned until all
  pass; the dark count badge (white on the lifted crimson, about 2:1) got its own ink; chart labels went from 11 to
  12 px, and the chat's timestamps from 12 px tertiary to 13 px secondary.
- **Motion that moved the wrong thing.** The arrival keyframes reset the transform that centres chart dots and
  labels; they now keep it. A red alert's mark pulsed twice; it pulses once.
- **The repo's own checker.** `scripts/plan_sync.py` let an option chip quoted in prose swallow the page up to the
  real label, so `1a · Chat first` was not found; the pattern now reads the chip's own text, and the selftest holds
  the iOS cases.
- **The mirror.** Claude Design's preview endpoint injects a style and a script into every page; the mirror strips
  exactly that block and keeps a file only when its size equals Claude Design's own count.
- **The journey page.** It had no charset (£ and ▲ broke when served locally), and its `.toc` class also hid the
  eleven AWS-to-Claude arrows; both fixed.

Raised as open questions under plan-sync rule 6 (on the trace and as Jira comments): who may resume a pause and
whether the first-run answers need a Confirm (MA-35), and where a member leaves the household (MA-172).

## The pick

Waiting for Arun.
