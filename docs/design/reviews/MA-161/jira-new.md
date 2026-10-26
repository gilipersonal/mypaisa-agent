# MA-161: the new Jira issues for the iOS app

Filed on 25 Oct 2026, in this order, so the keys are fixed. Each follows `.claude/jira/taxonomy.md`'s template.
The decisions behind them are in `decision.md` beside this file; the trace (`docs/trace.json`) holds their
sections and boards.

---

## MA-162 · Task · phase 0 (MA-9) · labels: manual

**Arun joins the Apple Developer Program ($99 a year) and registers the MyPaisa and MyPaisa Dev app ids with Sign in with Apple, push and associated domains**

As the owner I want the Apple accounts the app needs so that Sign in with Apple, push and TestFlight work.

**Where.** developer.apple.com and App Store Connect (by hand); the ids recorded in `ios/project.yml` and SSM.
**Acceptance.**
- The Apple Developer Program membership is active ($99 a year, about £76; Arun's yes recorded on this issue before paying).
- Two explicit app ids: `com.mypaisapp.agent` (MyPaisa) and `com.mypaisapp.agent.dev` (MyPaisa Dev), each with Sign in with Apple, Push Notifications and Associated Domains (`applinks:console.mypaisapp.com` or `console-dev`, `webcredentials:` as MA-109 decides).
- The team id and both bundle ids are in `/mypaisa-agent/<env>/apple/{team_id,bundle_id}` (not secrets; plain parameters).
- Gates: none (manual); verified by a signed debug build on Arun's iPhone (MA-165).
**Depends on.** none

## MA-163 · Story · phase 1 (MA-10) · labels: design

**The app's shell: tabs on iPhone, a sidebar with the chat beside every screen on iPad and an open foldable, picked from three options**

As a member I want one app that is the chat and the dashboard at once, on whichever Apple device I hold, so that I never hunt for where something is.

**Where.** `ios/MyPaisa/App/` (the scene, `TabView` with `.sidebarAdaptable`, the inspector column), the boards `Shell options.dc.html` and `iPad and foldable.dc.html` in MyPaisa iOS v1.
**Acceptance.**
- Arun picks 1a, 1b or 1c on `Shell options.dc.html` (`/design-first`); the picked shell is built, nothing else.
- iPhone (compact): the Liquid Glass tab bar with the picked tabs and the separate search tab; the tab bar minimises as content scrolls.
- iPad and an open foldable (regular): the sidebar; at over about 900 pt the chat sits beside every screen as a trailing column; under it, the chat opens as a sheet. Split View, Slide Over and Stage Manager windows from 320 pt wide lay out by width alone.
- A rotation, a fold or a window resize keeps the conversation, the scroll position and any guided flow (scene state restoration).
- Hardware keyboard: Return sends, Shift-Return breaks a line, ⌘K the composer, ⌘1 to ⌘5 the sections, ⌘F search, Esc closes a sheet; pointer hover on rows and buttons.
- Gates: the iOS gates (MA-166); snapshot tests of the shell at iPhone, iPad portrait and landscape, one-third Split View and the foldable sizes, light and dark.
**Depends on.** MA-165

## MA-164 · Task · phase 0 (MA-9) · labels: manual

**An APNs key per environment is in SSM, and the App Store Connect app records, TestFlight testers and API key exist**

As the operator I want the keys push and TestFlight need, in the places the rules allow, so that the sender can push and CI can upload builds.

**Where.** App Store Connect, developer.apple.com (Keys), SSM, the GitHub `prod` environment.
**Acceptance.**
- One APNs authentication key (`.p8`) per environment, its value put by hand into `/mypaisa-agent/<env>/apple/apns_key` over the placeholder MA-159's apply made (never before), with `apns_key_id` beside it.
- One Sign in with Apple key (`.p8`) per environment in `/mypaisa-agent/<env>/apple/siwa_key` the same way, with `siwa_key_id`: it signs the request that revokes a leaving member's Apple token (MA-172).
- App Store Connect records for MyPaisa Dev and MyPaisa; Arun and his wife added as App Store Connect users and internal testers of both.
- An App Store Connect API key (App Manager) stored as a secret of the GitHub `prod` environment only, used by MA-167; nowhere else.
- Gates: none (manual); verified by MA-167's first upload and a test push from dev.
**Depends on.** MA-162, MA-26

## MA-165 · Story · phase 0 (MA-9)

**The iOS project builds: one SwiftUI app for iPhone and iPad on iOS 26, its packages, the Warm ledger assets and its tests**

As the developer I want the iOS project's skeleton in the repository so that every later story has a place to land.

**Where.** `ios/project.yml` (XcodeGen), `ios/MyPaisa/` (the app), `ios/Packages/MyPaisaKit` (models, the api client, card decoding, Keychain), `ios/Packages/MyPaisaUI` (the design system: colour assets from `tokens.css`, Dynamic Type styles, the card and glass components), `ios/MyPaisaTests`, `ios/MyPaisaUITests`, `.swift-format`.
**Acceptance.**
- One universal app, iOS and iPadOS 26.0 and later, Swift 6 with strict concurrency, SwiftUI; two configurations (Dev, Prod) with their own bundle ids, icons and base URLs (`api-dev`/`live-dev`, `api`/`live`), chosen by scheme, never by a runtime switch.
- The Warm ledger tokens as an asset catalog (light, dark, increased contrast), generated from `docs/design/ds-v1/tokens.css` by a script so the two never drift; SF Pro and SF Pro Rounded through Dynamic Type styles.
- The app icon from Icon Composer: default, dark, clear and tinted; MyPaisa Dev with its DEV band.
- `xcodebuild test` passes on the simulator; one snapshot test and one UI test exist as the pattern.
- Gates: swift-format lint, `xcodebuild build test` (iPhone and iPad simulators).
**Depends on.** none (MA-162 for a device build)

## MA-166 · Story · phase 0 (MA-9)

**CI builds and tests the iOS app on every pull request that touches it, with snapshot and accessibility checks**

As the developer I want the app's gates to run on every PR so that a broken screen never reaches TestFlight.

**Where.** `.github/workflows/ios.yml`, `.claude/jira-flow.json` (the iOS gates).
**Acceptance.**
- On a PR that touches `ios/`: swift-format lint, build, unit tests, UI tests, snapshot tests (iPhone and iPad, light and dark, Large and AX5 text) and `performAccessibilityAudit()` on every screen's UI test, on a macOS runner; actions pinned to SHAs; `contents: read`.
- macOS minutes measured in the first month and reported on this issue (they count ten to one against the free minutes); Xcode Cloud's 25 free hours a month named as the fallback.
- The jira-flow gates list the iOS gates so `/autoship` runs them locally.
- Gates: the workflow itself on a test PR.
**Depends on.** MA-165, MA-25

## MA-167 · Story · phase 0 (MA-9)

**A merge to main sends MyPaisa Dev to TestFlight, and MyPaisa after Arun approves, with an alert before a build expires**

As the owner I want app releases to go the way the Lambdas do, through CI and my approval, so that nothing reaches the household's phones by hand.

**Where.** `.github/workflows/release.yml` (with MA-107), `ios/fastlane/` or `xcodebuild -exportArchive` with `altool`.
**Acceptance.**
- A merge to `main` that touches `ios/` archives once per configuration; MyPaisa Dev is uploaded to TestFlight after dev's smoke tests pass.
- MyPaisa (prod) is uploaded only after Arun approves in the GitHub `prod` environment, after prod's Lambdas are live, so a new app never meets an old api.
- The api serves `GET /v1/app/minimum-version`; an app older than it asks to update from TestFlight rather than failing.
- TestFlight builds last 90 days: an alert (§15.2) at day 60 if no newer prod build exists.
- Gates: the workflow on a dry run; the minimum-version check tested.
**Depends on.** MA-164, MA-166, MA-107

## MA-168 · Story · phase 1 (MA-10) · labels: design

**Signing in takes one tap with Apple or Google, the session stays in the Keychain, and an invite link opens the app to join**

As a member I want to sign in with the Apple or Google account I already have so that there is no password and no bot to find.

**Where.** `ios/MyPaisa/SignIn/`, `ios/Packages/MyPaisaKit/Auth/`, the boards in `iPhone sign-in.dc.html`.
**Acceptance.**
- The welcome screen shows Apple's and Google's own buttons, per their guidelines, Apple's first; nothing else.
- Sign in with Apple (`ASAuthorizationAppleIDProvider`, scopes none beyond the id) and Google (Google's iOS SDK, PKCE) each return an identity token with the api's nonce; the app exchanges it at `/auth/apple` or `/auth/google` for Cognito tokens (MA-109).
- Tokens in the Keychain, this device only, after first unlock; the refresh token rotates; a five-minute access token is refreshed silently.
- An invite link (`https://console.mypaisapp.com/join/<token>`, MA-73) opens the app on "<Owner> invited you to the <household>" and the sign-in creates the member (MA-32).
- Refused states drawn and built: an account linked to nobody with no invite; a removed member; a paused member (one line, MA-102); an expired or used invite.
- Gates: the iOS gates; UI tests for each state against a stubbed api.
**Depends on.** MA-109, MA-73, MA-165

## MA-169 · Story · phase 1 (MA-10) · labels: design

**The chat in the app shows the conversation, renders every card natively, streams replies and sends text, photos, scans and files**

As a member I want a chat that feels like talking to a careful assistant so that I can keep our records and ask anything without forms.

**Where.** `ios/MyPaisa/Chat/`, `ios/Packages/MyPaisaUI/Cards/`, the boards in `iPhone chat.dc.html` and `iOS kit.dc.html`.
**Acceptance.**
- The conversation: the member's messages in navy bubbles, MyPaisa's words unbubbled beside its mark, cards as Warm ledger cards with their buttons; the history from `GET /v1/chat/turns` and the live connection (MA-30).
- Every card type of MA-174 rendered natively, in `simple` and `technical`, with Swift Charts from the series in the card; Confirm, Edit and Cancel post to `/v1/chat/actions` and are acknowledged at once.
- The composer: Liquid Glass, a + for the camera, a document scan (VisionKit), Photos and Files (PDF, images, xlsx, csv); shortcut chips that change with the conversation; the old `/commands` work when typed.
- Replies stream word by word while MyPaisa writes; cards arrive whole; a typing mark until the first word.
- Guided flows: one question per card, edited in place; Pick a date opens the system date picker; long lists show a short list, More and Type the name.
- Gates: the iOS gates; snapshot tests for every card in both themes and both modes.
**Depends on.** MA-174, MA-30, MA-31, MA-163

## MA-170 · Story · phase 1 (MA-10) · labels: design

**Apple push reaches each member's devices when the app is closed, with no amounts on the lock screen unless they choose**

As a member I want to hear about a finished reply, the brief or an alert when the app is closed so that I do not need to keep it open.

**Where.** `src/mypaisa_agent/handlers/sender` (APNs over HTTP/2 with the token key of MA-164), the `Device` entity, `ios/MyPaisa/Notifications/`, the boards in `iPhone settings.dc.html`.
**Acceptance.**
- The app registers its push token after sign-in (`POST /v1/devices`); a signed-out or removed device's token is deleted.
- The sender pushes a finished message to each of the member's devices with no live connection; the notification opens the chat at that message.
- Interruption levels: a red alert is time-sensitive with sound (still two a week at most, §11); amber and the brief are passive or active as the member's settings say; quiet hours hold, a critical alert excepted.
- No amount on the lock screen unless the member turns on "Show amounts in notifications"; never with privacy mode on.
- Gates: pytest for the sender's APNs payloads and retries (`retry_after`, a dead token removed); the iOS gates.
**Depends on.** MA-164, MA-30

## MA-171 · Story · phase 1 (MA-10) · labels: design

**Privacy in the app: privacy mode hides amounts everywhere, the app switcher shows nothing, and Face ID can lock the app**

As a member I want to open the app in front of other people without showing our money so that privacy mode means what it says.

**Where.** `ios/Packages/MyPaisaUI/Privacy/`, the boards `Privacy mode in the chat`, `Home, privacy on`, `Privacy and Face ID lock`, `App switcher`.
**Acceptance.**
- Privacy mode (a glass toggle on Home and in You, and "/privacy") masks every amount in every card, screen, chart axis and notification, as the DS masks money; percentages stay.
- The app switcher's snapshot shows the mark on the background, never a figure.
- An optional app lock: Face ID or the passcode on open and after five minutes away (LocalAuthentication); it is a local comfort, never the server's second check (MA-76).
- Gates: snapshot tests with privacy on for every screen with money; a UI test that no `£` reaches the accessibility tree with privacy on.
**Depends on.** MA-169

## MA-172 · Story · phase 1 (MA-10) · labels: design

**A member signs out of a device or leaves the household from You, and their sign-in is deleted and Apple's token revoked**

As a member I want to control my own devices and to leave cleanly so that my account is mine to end.

**Where.** `ios/MyPaisa/You/`, `src/mypaisa_agent/handlers/api` (`DELETE /v1/devices/{id}`, `POST /v1/me/leave`), the boards `Leave the household`, `Sign-in methods`.
**Acceptance.**
- You lists my devices (name, model, last seen); I sign one out, or all of them.
- Leave the household (with the second check): my Cognito user is deleted, Apple's refresh token revoked through Apple's REST endpoint, Google's grant revoked; my accounts and their history stay with the household, my audit rows keep my member id and a "left on" date; the owner is told.
- The owner cannot leave while they are the only owner; the screen says so.
- Gates: pytest for the leave path and each refusal; the iOS gates.
**Depends on.** MA-168, MA-76, MA-164 (the Sign in with Apple key)

## MA-173 · Story · phase 1 (MA-10) · labels: design

**Offline, the app shows the last figures with their time, keeps what is typed and sends it once back online**

As a member I want the app to work on a train so that a lost signal never loses a message or shows an old figure as new.

**Where.** `ios/Packages/MyPaisaKit/Store/` (SwiftData, complete file protection), the boards `Offline and retry`, `Home, stale prices`, `Home, loading`.
**Acceptance.**
- The last fetched Home, holdings and conversation are kept on the device (file protection complete) and shown with "as of 08:42" when the network is gone.
- A message typed offline waits with a clock mark and its client id, and is sent once back online; the api's dedupe (MA-31) makes a resend harmless.
- A tap on Confirm offline is refused on the device ("Confirm needs a connection"); nothing is saved by surprise.
- Gates: UI tests with the network link conditioner off and on.
**Depends on.** MA-169

## MA-174 · Story · phase 1 (MA-10)

**Every card is a versioned JSON document the app renders natively, with a plain line for notifications**

As the developer I want one contract between the agent and the app so that a card is written once in Python and drawn natively without guesswork.

**Where.** `src/mypaisa_agent/cards/schema/` (JSON Schema per card type), `ios/Packages/MyPaisaKit/Cards/` (Codable types generated from the schemas).
**Acceptance.**
- Each card type (portfolio, confirm, question, stance, holding-profile, overlap-review, fund-vs-benchmark, bear-vs-bull, scenario, brief, wrap, alert, audit list, preference, admin request) has a JSON Schema with a version; every figure is a typed number from the engine with its unit and currency, never prose.
- Each card carries `simple` and `technical` parts, its actions (with ids and the second-check flag), its series for charts, and a `plain` line for push and VoiceOver.
- An unknown card type or a newer version renders as its `plain` line with "Update MyPaisa to see this card".
- Gates: pytest validates every card the engine emits against its schema; the iOS decoding tests read the same fixtures.
**Depends on.** MA-27

## MA-175 · Epic · phase 14

**The app beyond the chat: widgets, Siri and Shortcuts, the share sheet and Live Activities (later)**

**Goal.** MyPaisa reaches the household outside the app where iOS allows it: a widget on the Home and Lock Screens, the share sheet, Siri and Shortcuts, and a Live Activity for long jobs; privacy mode holds everywhere.
**Where.** `ios/Widgets/`, `ios/ShareExtension/`, `ios/MyPaisa/Intents/`.
**Done when.** Each of its stories is built from boards Arun picked.
**Rules.** `.claude/rules/plan-sync.md`, the design-first skill.

## MA-176 · Story · phase 14 (MA-175) · labels: design

**A Home Screen and Lock Screen widget shows the household's total and the day's move, hidden in privacy mode**

**Where.** `ios/Widgets/`. **Acceptance.** Small and medium Home Screen widgets and a rectangular Lock Screen widget; figures from the last fetch with their time; privacy mode shows the mark and "Hidden"; tinted and clear modes render; a tap opens Home. Boards drawn before it starts. **Depends on.** MA-78

## MA-177 · Story · phase 14 (MA-175) · labels: design

**A factsheet or screenshot shared from Mail, Files or Photos goes to MyPaisa through the share sheet**

**Where.** `ios/ShareExtension/`. **Acceptance.** PDFs and images shared to MyPaisa upload to the documents bucket (MA-148) and open the chat on the reading card; nothing is saved before Confirm; the extension signs in through the shared Keychain group. Boards drawn before it starts. **Depends on.** MA-37

## MA-178 · Story · phase 14 (MA-175) · labels: design

**Siri and Shortcuts answer "How is the portfolio today?" and start a guided flow through App Intents**

**Where.** `ios/MyPaisa/Intents/`. **Acceptance.** App Intents for "How is the portfolio today?" (a snippet with the total and the day's move, masked with privacy on) and "Log money into MyPaisa" (opens the guided flow; never saves without Confirm in the app). Boards drawn before it starts. **Depends on.** MA-169

## MA-179 · Story · phase 14 (MA-175) · labels: design

**A Live Activity follows a long job, such as an import, on the Lock Screen and in the Dynamic Island**

**Where.** `ios/Widgets/LiveActivity/`, the sender's ActivityKit pushes. **Acceptance.** The Excel import (MA-111) and the Indian import (MA-152) show progress and the result; no amounts on the Lock Screen. Boards drawn before it starts. **Depends on.** MA-111

## MA-180 · Story · phase 5 (MA-14) · labels: design

**Search finds a holding, a change, a file or a past answer from anywhere in the app**

**Where.** `ios/MyPaisa/Search/`, `GET /v1/search`. **Acceptance.** The search tab (iPhone) and ⌘F (iPad) search holdings, audit rows, files and the member's own chat turns, within the member's rights (§4.5); results open their screen. Boards drawn before it starts. **Depends on.** MA-78, MA-79

## MA-181 · Story · phase 1 (MA-10) · labels: design

**Every screen works with VoiceOver, Dynamic Type up to AX5, Increase Contrast, Reduce Transparency and Reduce Motion**

**Where.** every view; `ios/MyPaisaUITests/Accessibility/`; the board `11 · Accessibility` in `iOS kit.dc.html`.
**Acceptance.** Every figure has a spoken label ("Balanced, twenty-two thousand nine hundred and twenty-five pounds, up 0.6 percent"); charts have audio graphs (`AXChartDescriptor`); every screen lays out from xSmall to AX5 (figures stack under labels from AX1); 44 pt targets; colour never the only signal; glass turns opaque under Reduce Transparency; motion lands at once under Reduce Motion. Gates: `performAccessibilityAudit()` in every screen's UI test (MA-166). **Depends on.** MA-165

---

## Filed after Arun's corrections the same evening

The web app stays, motion everywhere, the dashboard on the iPad and the foldable, legibility at 25% brightness.
Their full descriptions are on the issues.

- **MA-182** · Story · phase 1 (MA-10) · design: Every component, card and chart moves with one motion system, in the iOS app and the web app, and lands at once under Reduce Motion.
- **MA-183** · Story · phase 5 (MA-14) · design: The web app shows Home, a holding, Overlap and Scorecard read-only in a browser, installable as a PWA.
- **MA-184** · Story · phase 5 (MA-14) · design: The web app's Audit, Files, Activity and Admin center pages work in a browser, with the second check for the owner's actions.
- **MA-185** · Story · phase 5 (MA-14) · design: In a browser a member signs in to the web app with Apple, Google or a passkey, and the session lives in an HttpOnly cookie.
- **MA-181** gains: the screens stay legible in light and dark at 25% brightness, checked by `scripts/contrast_check.py`.
- **MA-78** gains: every dashboard screen also shows on the iPad and the foldable, with the chat beside it.
