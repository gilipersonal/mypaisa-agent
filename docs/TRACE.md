# Trace: phase, story, architecture, design

Generated from `docs/trace.json` by `python3 scripts/plan_sync.py render`; do not edit by hand.
The rules are in `.claude/rules/plan-sync.md`.

| Design | Meaning |
| --- | --- |
| picked | Arun picked it; the board is the spec |
| planned | Drawn; put through design-first's options round when the story starts |
| todo | Has UI, not drawn yet |
| none | No UI |

## Phase 0: Prerequisites (MA-9)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-20 | MyPaisa Dev's identity exists: its bundle id, its icon with the DEV band, and its sign-in ids in dev's SSM paths | To Do | §14, §18.1 | planned | iOS kit.dc.html: 10 · App icon |
| MA-21 | Claude API access is paid from the plan, with dev and prod workspaces and spend limits | To Do | §15.1, §18.1 | none |  |
| MA-22 | A free Twelve Data key is in SSM for the US lines and the FX fallback | To Do | §5.1 | none |  |
| MA-23 | Each Monzo fund's factsheet and a valuation screenshot are ready to send in the app | To Do | §4.2 | none |  |
| MA-24 | The Python project skeleton exists with its gates and the working rules | To Do | §13, §16 | none |  |
| MA-25 | CI runs every gate, scan and Terraform plan on every pull request, the way smart-clearance does | To Do | §18.4 | none |  |
| MA-26 | Terraform builds dev and prod as two isolated environments in one account, applied only from CI through OIDC | To Do | §18.1, §18.4 | none |  |
| MA-106 | The architecture records two environments, the domains, Cognito sign-in and Terraform-only delivery | Done | §4.5, §9.3, §12, §13, §14, §15, §16 | none |  |
| MA-107 | Releases go from one build to dev, then to prod after Arun approves, with smoke tests and automatic rollback | To Do | §18.4, §20.5 | none |  |
| MA-108 | A nightly check reports any prod change made outside Terraform | To Do | §18.4, §20.5 | none |  |
| MA-112 | The architecture records the $100 Claude budget for prod, its ceiling ladder and the chat-memory rules | Done | §4.5, §8, §9.3, §10, §12, §15, §16, §17, §18 | none |  |
| MA-138 | The architecture records the queues, retries and replay that keep messages and jobs from being lost | Done | §13, §16, §20.5, §21 | none |  |
| MA-141 | The architecture is drawn in Lucid with AWS shapes, the plan and stack documents agree with it, and two explainer pages walk through every flow | Done | §3, §4.2 | none |  |
| MA-142 | MyPaisa's prod app record exists with the 1c Watcher icon, and prod's Twelve Data key is in prod's SSM path beside dev's | To Do | §18.1 | planned | iOS kit.dc.html: 10 · App icon |
| MA-143 | Each environment has its own Google iOS and web clients and Sign in with Apple's ids, with their ids in SSM, before Cognito is built | To Do | §17, §18.1, §18.3 | none |  |
| MA-150 | The architecture and plan record Indian markets as phase 13 and keep every file a member sends, viewable from the audit log | Done | §4.1, §4.6, §9.3, §14, §16, §22 | none |  |
| MA-155 | Design, plan and Jira stay in sync: every planned screen is drawn, traced to its story, and checked before work starts | Done |  | none |  |
| MA-157 | The independent review is offered before every merge in this repo, and runs only when Arun says yes | Done |  | none |  |
| MA-158 | The stories with UI that have no board yet, or only some of their screens, are drawn in Claude Design before any of them starts | In Review |  | none |  |
| MA-159 | Secret values never reach Terraform state: the SSM parameters use write-only values, not a placeholder with ignore_changes | Done | §14, §18.1, §18.4 | none |  |
| MA-160 | Board fixes found in the reviews of MA-158 and MA-156 are applied in Claude Design and copied into the repo | To Do |  | none |  |
| MA-161 | MyPaisa's chat moves from Telegram to one native iOS app for iPhone and iPad, and the web app stays as a read-only PWA: the plan, the designs and Jira follow | In Progress | §9, §16 | none |  |
| MA-162 | Arun joins the Apple Developer Program ($99 a year) and registers the MyPaisa and MyPaisa Dev app ids with Sign in with Apple, push and associated domains | To Do | §15, §18.1 | none |  |
| MA-164 | An APNs key per environment is in SSM, and the App Store Connect app records, TestFlight testers and API key exist | To Do | §14, §18.4 | none |  |
| MA-165 | The iOS project builds: one SwiftUI app for iPhone and iPad on iOS 26, its packages, the Warm ledger assets and its tests | To Do | §9, §13 | none |  |
| MA-166 | CI builds and tests the iOS app on every pull request that touches it, with snapshot and accessibility checks | To Do | §18.4 | none |  |
| MA-167 | A merge to main sends MyPaisa Dev to TestFlight, and MyPaisa after Arun approves, with an alert before a build expires | To Do | §18.4 | todo |  |

## Phase 1: Registry, sign-in and the app's chat (MA-10)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-27 | The holdings registry stores members, accounts, holdings and valuations per household | To Do | §4 | none |  |
| MA-28 | Every record change writes a hash-chained audit row in the same transaction | To Do | §4.6 | none |  |
| MA-29 | Every Lambda run leaves a RunRecord, logs, traces and an error alarm | To Do | §10, §4.1 | none |  |
| MA-30 | Replies reach the open app over a signed-in live connection, in order and never twice, and the app catches up when it opens | To Do | §9 | none |  |
| MA-31 | The chat API accepts only a signed-in member's messages and taps, and hands each off once | To Do | §3, §18.2, §21.1 | none |  |
| MA-32 | The first person to sign in owns the household and invites and removes members with one-time links | To Do | §4.5 | planned | iPhone sign-in.dc.html: iPhone · Joining from an invite; iPhone admin.dc.html: iPhone · Members and devices; iPhone admin.dc.html: iPhone · Invite a member |
| MA-33 | Each member has their own accounts, and a joint account can have two owners | To Do | §4.1, §4.5 | none |  |
| MA-34 | Design the Portfolio card and the Confirm card before they are built | To Do | §9.2 | planned | iOS kit.dc.html: 6 · Messages and cards; iPhone chat.dc.html: iPhone · Portfolio card; iPhone chat.dc.html: iPhone · Confirm card |
| MA-35 | The chat answers onboarding, add, update, privacy, pause, resume and help, typed or from its shortcut chips | To Do | §2, §8, §9.1 | planned | iPhone sign-in.dc.html: iPhone · First-run setup; iPhone chat.dc.html: iPhone · Chat home; iPhone settings.dc.html: iPhone · You; iPhone settings.dc.html: iPhone · Pause and resume; iPhone dashboard.dc.html: iPhone · Home, empty |
| MA-36 | The Portfolio card shows the household and each member's holdings | To Do | §9.2 | planned | iPhone chat.dc.html: iPhone · Portfolio card; iPhone dashboard.dc.html: iPhone · Home, household |
| MA-37 | A factsheet or valuation screenshot sent from the camera, a scan, Photos or Files adds or updates a holding after Confirm | To Do | §4.2, §4.6 | planned | iPhone chat.dc.html: iPhone · Attach a file; iPhone chat.dc.html: iPhone · Reading a factsheet; iPhone chat.dc.html: iPhone · Factsheet card with amber fields; iPhone chat.dc.html: iPhone · Screenshot valuations, before and after |
| MA-38 | "I put £200 into Balanced" becomes a transaction after Confirm | To Do | §4.1, §4.2 | planned | iPhone chat.dc.html: iPhone · Confirm card |
| MA-39 | Guided flows with buttons log a transaction, add a holding, update a valuation or change a setting | To Do | §9.1 | planned | iPhone chat.dc.html: iPhone · Guided flow: log a transaction |
| MA-40 | "What changed this week?" lists every change with who and when | To Do | §4.6 | planned | iPhone chat.dc.html: iPhone · What changed this week; iPhone audit and activity.dc.html: iPhone · Audit |
| MA-73 | Each environment hosts the console at console(-dev).mypaisapp.com on S3 and CloudFront: the web app (a PWA) and the iOS app's association file and invite page | To Do | §9.4, §18.2 | none |  |
| MA-75 | The api's authorizer checks the access token, the member's status and session epoch on every call and live connection | To Do | §4.5, §9.3 | none |  |
| MA-109 | Each environment has its own Cognito sign-in with Sign in with Apple, Google and passkeys, verified in custom-auth Lambdas | To Do | §4.5, §17, §18.3 | none |  |
| MA-110 | Dev is seeded with a synthetic household built around the real Monzo OEICs | To Do | §18.1 | none |  |
| MA-113 | Every Claude call is metered and nothing runs past the monthly ceiling | To Do | §15.1, §15.2 | none |  |
| MA-139 | Each member's messages travel through ordered queues, in and out, are retried with backoff and are never lost | To Do | §21 | none |  |
| MA-140 | Background jobs run from a work queue with retries, and every failure lands in a dead-letter queue that alerts and can be replayed | To Do | §21 | none |  |
| MA-144 | The app reaches each environment through api(-dev) and live(-dev).mypaisapp.com, and the dev build runs from Xcode against dev | To Do | §18.1, §18.2 | none |  |
| MA-148 | Every file and image a member sends is kept in S3 for good, with a Document row and an audit entry that point to it | To Do | §4.1, §4.6, §14 | none |  |
| MA-156 | A transaction can be typed in any currency, and the chat checks it against the holding's own currency and puts a mismatch right before Confirm | To Do | §4.1, §4.7, §5.3, §22.3 | planned | iPhone chat.dc.html: iPhone · Currency check |
| MA-163 | The app's shell, 1a Chat first: tabs on iPhone, a sidebar on iPad and an open foldable, with the chat beside every screen over about 900 pt and a sheet away from about 600 to 900 pt | To Do | §9, §9.1 | picked | Shell options.dc.html: 1a · Chat first; iPad and foldable.dc.html: iPad · Split View, one third; iPad and foldable.dc.html: iPad · Stage Manager window; iPad and foldable.dc.html: Foldable · Folded; iPad and foldable.dc.html: iPad · Keyboard shortcuts; iOS kit.dc.html: 4 · Tab bar and sidebar |
| MA-168 | Signing in takes one tap with Apple or Google, the session stays in the Keychain, and an invite link opens the app to join | To Do | §4.5 | planned | iPhone sign-in.dc.html: iPhone · Welcome; iPhone sign-in.dc.html: iPhone · Sign in with Apple; iPhone sign-in.dc.html: iPhone · Sign in with Google; iPhone sign-in.dc.html: iPhone · Joining from an invite; iPhone sign-in.dc.html: iPhone · Sign-in refused |
| MA-169 | The chat in the app shows the conversation, renders every card natively, streams replies and sends text, photos, scans and files | To Do | §8, §9.1, §9.2 | planned | iPhone chat.dc.html: iPhone · Chat home; iPhone chat.dc.html: iPhone · Attach a file; iPhone chat.dc.html: iPhone · Streaming reply; iOS kit.dc.html: 5 · Toolbars and the composer; iOS kit.dc.html: 6 · Messages and cards |
| MA-170 | Apple push reaches each member's devices when the app is closed, with no amounts on the lock screen unless they choose | To Do | §9.1, §11, §21 | planned | iPhone settings.dc.html: iPhone · Notifications and quiet hours; iPhone settings.dc.html: iPhone · Lock screen: the morning brief; iPhone settings.dc.html: iPhone · Lock screen: a red alert; iPhone sign-in.dc.html: iPhone · Notifications and Face ID |
| MA-171 | Privacy in the app: privacy mode hides amounts everywhere, the app switcher shows nothing, and Face ID can lock the app | To Do | §9.1, §14 | planned | iPhone chat.dc.html: iPhone · Privacy mode in the chat; iPhone dashboard.dc.html: iPhone · Home, privacy on; iPhone settings.dc.html: iPhone · Privacy and Face ID lock; iPhone settings.dc.html: iPhone · App switcher |
| MA-172 | A member signs out of a device or leaves the household from You, and their sign-in is deleted and Apple's token revoked | To Do | §4.5 | planned | iPhone settings.dc.html: iPhone · You; iPhone settings.dc.html: iPhone · Leave the household; iPhone settings.dc.html: iPhone · Sign-in methods |
| MA-173 | Offline, the app shows the last figures with their time, keeps what is typed and sends it once back online | To Do | §9.1 | planned | iPhone chat.dc.html: iPhone · Offline and retry; iPhone dashboard.dc.html: iPhone · Home, loading; iPhone dashboard.dc.html: iPhone · Home, stale prices |
| MA-174 | Every card is a versioned JSON document the app renders natively, with a plain line for notifications | To Do | §7, §9.2 | none |  |
| MA-181 | Every screen works with VoiceOver, Dynamic Type up to AX5, Increase Contrast, Reduce Transparency and Reduce Motion, and stays legible in light and dark at 25% brightness | To Do | §9.1 | planned | iOS kit.dc.html: 11 · Accessibility |
| MA-182 | Every component, card and chart moves with one motion system, in the iOS app and the web app, and lands at once under Reduce Motion | To Do | §9.1, §9.4 | planned | iOS kit.dc.html: 12 · Motion |

## Phase 2: Prices and the engine (MA-11)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-41 | One PriceSource contract lets each price feed plug in, chained per kind and per environment | To Do | §5.1 | none |  |
| MA-42 | yfinance, Twelve Data, screenshot and stale plugins price the holdings every day | To Do | §5.1 | none |  |
| MA-43 | The BlackRock page, FT and EODHD plugins back up the free feeds | To Do | §5.1 | none |  |
| MA-44 | ECB FX rates and market calendars are loaded daily | To Do | §5.3 | none |  |
| MA-45 | Input hygiene drops bad bars before anything is scored | To Do | §5.1 | none |  |
| MA-46 | A source-comparison report shows which feed actually serves the Monzo funds' NAV | To Do | §5.1 | none |  |
| MA-47 | A proxy basket from each fund's top holdings estimates the day before the NAV lands | To Do | §5.1, §4.3 | none |  |
| MA-48 | The desk's indicators are ported to pandas and match its own answers | To Do | §6.1 | none |  |
| MA-49 | Trend, Momentum and Risk pillars and the flags score each holding | To Do | §6.2 | none |  |
| MA-50 | The holder's cascade turns the pillars into ADD, HOLD, PAUSE, TRIM, REBALANCE or WATCH with a confidence | To Do | §6 | none |  |
| MA-51 | US, UK and EU macro regimes feed each holding through its look-through weights | To Do | §6.2, §5.2 | none |  |
| MA-52 | Forecast ranges by block bootstrap give each holding a likely range and P(fall greater than 5%) | To Do | §6.5 | none |  |
| MA-53 | The ingest and engine jobs write signals and shadow stances every weekday by 07:10 | To Do | §5, §6.3 | none |  |

## Phase 3: Briefs, alerts, charts, technical mode (MA-12)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-54 | The Anthropic client routes, caches and refuses to let Claude invent a number | To Do | §1, §8 | none |  |
| MA-55 | Design the morning brief, evening wrap and alert cards | To Do | §9.2 | planned | iPhone dashboard.dc.html: iPhone · Today's brief; iPhone chat.dc.html: iPhone · Red alert card; iPhone settings.dc.html: iPhone · Lock screen: the morning brief |
| MA-56 | Design the chart house style shared by the chat's cards and the dashboard, in Swift Charts | To Do | §9.1, §9.3 | planned | iOS kit.dc.html: 9 · Charts |
| MA-57 | The morning brief and evening wrap arrive as cards, with a Technical section and glossary | To Do | §9.2, §11 | planned | iPhone dashboard.dc.html: iPhone · Today's brief; iPhone settings.dc.html: iPhone · Lock screen: the morning brief |
| MA-58 | Charts in the house style are drawn in each card from the engine's series | To Do | §9.2 | planned | iOS kit.dc.html: 9 · Charts; iPhone dashboard.dc.html: iPhone · Holding |
| MA-59 | Alerts come in tiers as push and in the chat, respect quiet hours and never repeat within their cooldown | To Do | §11 | planned | iPhone chat.dc.html: iPhone · Red alert card; iPhone settings.dc.html: iPhone · Lock screen: a red alert; iPhone settings.dc.html: iPhone · Notifications and quiet hours |
| MA-60 | Tapping "I acted" records a decision the Saturday review can check | To Do | §9.2, §11 | planned | iPhone chat.dc.html: iPhone · Stance card, technical open |
| MA-61 | A dead man's switch and the error alarms tell the owner, in the app and by push, when a job did not run | To Do | §10 | planned | iPhone admin.dc.html: iPhone · Admin center |
| MA-114 | As spend nears the ceiling, the bot steps down to cheaper ways of working before it stops | To Do | §15.1 | planned | iPhone chat.dc.html: iPhone · Ceiling reached: templates only; iPhone admin.dc.html: iPhone · Spend and the ceiling; Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Spend · Move the ceiling, the consequences |

## Phase 4: Chat, research cards, scenarios (MA-13)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-62 | You can ask MyPaisa anything about your holdings and it answers from its tools | To Do | §8 | planned | iPhone chat.dc.html: iPhone · Streaming reply |
| MA-63 | Design the research cards: stance, holding profile, overlap, fund vs benchmark, bear vs bull, scenario | To Do | §7, §9.2 | planned | iPhone chat.dc.html: iPhone · Stance card, technical open; iPhone dashboard.dc.html: iPhone · Why? sheet; iPhone dashboard.dc.html: iPhone · What if? sheet; iPhone dashboard.dc.html: iPhone · Overlap |
| MA-64 | The stance and holding-profile cards explain each holding and what would change the view | To Do | §7, §9.2 | planned | iPhone chat.dc.html: iPhone · Stance card, technical open; iPhone dashboard.dc.html: iPhone · Holding; iPhone dashboard.dc.html: iPhone · Holding, technical; iPhone dashboard.dc.html: iPhone · Why? sheet |
| MA-65 | The overlap review and fund-vs-benchmark cards show what your funds share and how they compare | To Do | §7, §5.2 | planned | iPhone dashboard.dc.html: iPhone · Overlap |
| MA-66 | Bear vs bull argues both sides in two calls and a judge, bounded to one round | To Do | §7, §8 | todo |  |
| MA-67 | "What if the pound falls 10%?" gets a scenario card from the look-through exposure | To Do | §2, §9.2, §5.2 | planned | iPhone dashboard.dc.html: iPhone · What if? sheet |
| MA-68 | The bot searches the web for sources and never follows instructions it finds there | To Do | §8, §14 | none |  |
| MA-69 | "Stop pinging me under 2%" sets a preference after Confirm | To Do | §2, §4.6 | planned | iPhone chat.dc.html: iPhone · Preference card; iPhone settings.dc.html: iPhone · Notifications and quiet hours |
| MA-115 | The chat sends Claude only the current conversation, kept short, with notes on recent ones | To Do | §8 | none |  |

## Phase 5: The dashboard and the Admin center, in the app and the web app (read-only, behind sign-in) (MA-14)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-70 | Design the iPad and open-foldable layouts: Home, a holding, Overlap, Scorecard and sign-in at regular width | To Do | §9.3 | planned | iPad and foldable.dc.html: iPad · Home with the chat beside it; iPad and foldable.dc.html: iPad · Holding, portrait; iPad and foldable.dc.html: Foldable · Open; iPad and foldable.dc.html: iPhone · Landscape; iPad and foldable.dc.html: iPad · Overlap and Scorecard |
| MA-71 | Design the Audit and Activity screens on iPhone and iPad | To Do | §9.3, §10 | planned | iPhone audit and activity.dc.html: iPhone · Audit; iPhone audit and activity.dc.html: iPhone · Activity; iPad and foldable.dc.html: iPad · Audit and Activity; iPad and foldable.dc.html: Foldable · Open, Audit |
| MA-72 | Each member's Apple Account and Google account use two-factor authentication, and each device has a passcode and Face ID | To Do | §4.5, §18.3 | none |  |
| MA-74 | A read-only api Lambda serves each member only what they may see | To Do | §4.5, §9.3 | none |  |
| MA-76 | The second check: a fresh Sign in with Apple or passkey under Face ID, or Google again for a Google-only member, bound to the action and verified by the server | To Do | §4.5, §9.3 | planned | iPhone admin.dc.html: iPhone · Second check; iPhone settings.dc.html: iPhone · Sign-in methods |
| MA-77 | A member adds a second sign-in, Apple or Google, or a passkey, to their identity from You | To Do | §4.5 | planned | iPhone settings.dc.html: iPhone · Sign-in methods |
| MA-78 | Home, a holding, Overlap and Scorecard work in the app on iPhone and iPad | To Do | §9.3 | planned | iPhone dashboard.dc.html: iPhone · Home, household; iPhone dashboard.dc.html: iPhone · Home, me; iPhone dashboard.dc.html: iPhone · Holding; iPhone dashboard.dc.html: iPhone · Overlap; iPhone dashboard.dc.html: iPhone · Scorecard; iPad and foldable.dc.html: iPad · Home with the chat beside it |
| MA-79 | The Audit and Activity screens show every change and every run, with what it cost | To Do | §4.6, §9.3, §10 | planned | iPhone audit and activity.dc.html: iPhone · Audit; iPhone audit and activity.dc.html: iPhone · Activity; iPhone audit and activity.dc.html: iPhone · A run |
| MA-80 | Each card opens its dashboard screen, and each screen's Ask opens the chat about it | To Do | §9.1, §9.3, §18.2 | planned | iPhone chat.dc.html: iPhone · Portfolio card; iPhone dashboard.dc.html: iPhone · Holding |
| MA-101 | A new MyPaisa design system, after Monzo's warmth and Apple's HIG, with the dashboard, Mini App and Telegram components prototyped | Done | §9.3, §13, §17 | picked | MyPaisa DS v1.dc.html: 1a · Warm ledger; Foundations.dc.html: 1 · Colour; Foundations.dc.html: 2 · Type; Foundations.dc.html: 3 · Space, shape, elevation; Foundations.dc.html: 4 · Layout and size classes; Foundations.dc.html: 5 · Motion; Foundations.dc.html: 6 · Iconography; Foundations.dc.html: 7 · Voice; Components.dc.html: 1 · Buttons; Components.dc.html: 2 · Chips; Components.dc.html: 3 · Segmented control and switch; Components.dc.html: 4 · Grouped rows; Components.dc.html: 5 · Hero card; Components.dc.html: 6 · Summary and stat cards; Components.dc.html: 7 · Privacy mask; Components 2.dc.html: 8 · Navigation; Components 2.dc.html: 9 · Sheet and toast; Components 2.dc.html: 10 · List states; Components 2.dc.html: 11 · Charts and tracks; Telegram kit.dc.html: 0 · Telegram kit: the rules; Telegram kit.dc.html: 1 · Portfolio card; Telegram kit.dc.html: 2 · Stance card; Telegram kit.dc.html: 3 · Morning brief and evening wrap; Telegram kit.dc.html: 4 · Alerts; Telegram kit.dc.html: 5 · Confirm after a factsheet; Telegram kit controls.dc.html: 6 · Guided flow: one message, edited in place; Telegram kit controls.dc.html: 7 · Inline keyboard patterns; Telegram kit controls.dc.html: 8 · Reply keyboard and command menu; Telegram kit controls.dc.html: 9 · Glossary answer; Telegram kit controls.dc.html: 10 · Wide chat: Telegram Desktop, 720 wide; Telegram kit images.dc.html: I1 · Holding history chart; Telegram kit images.dc.html: I2 · Portfolio curve with past stances; Telegram kit images.dc.html: I3 · Portfolio summary tile |
| MA-102 | The owner can sign out or pause any member's devices from the Admin center, behind the second check | In Progress | §1, §4.5 | planned | iPhone admin.dc.html: iPhone · Members and devices; iPhone admin.dc.html: iPhone · A member: sign out, pause, restore; iPhone admin.dc.html: iPhone · Second check; iPhone sign-in.dc.html: iPhone · Sign-in refused; iPad and foldable.dc.html: iPad · Admin center; Admin center 3.dc.html: Browser · Admin · People · Your account paused, after signing back in; Admin center 3.dc.html: Browser · Admin · People · Your account restored; Admin center 3.dc.html: Browser · Admin · People · Restore Asha, the confirmation; Admin center 3.dc.html: Browser · Admin · People · Asha restored; Admin center 3.dc.html: Browser · Admin · People · A failed fresh check; Admin center 3.dc.html: Browser · Admin · People · A household with only the owner |
| MA-103 | MyPaisa has a new mark in Warm ledger that animates once when the app opens | Done | §9.3 | picked | Logo.dc.html: 1c · Watcher; Logo.dc.html: 1c Telegram avatar |
| MA-116 | The owner moves the Claude ceiling up or down in the Admin center | To Do | §15.1, §15.2 | planned | iPhone admin.dc.html: iPhone · Spend and the ceiling; iPhone admin.dc.html: iPhone · Move the ceiling; iPhone admin.dc.html: iPhone · Second check; iPad and foldable.dc.html: iPad · Admin center; Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Spend · Move the ceiling, the fresh check; Admin center 2.dc.html: Browser · Admin · Spend · Move the ceiling, the consequences; Admin center 3.dc.html: Browser · Admin · Spend · Change the guards: member share, daily guard, calls per run; Admin center 3.dc.html: Browser · Admin · Spend · Change the renewal day; Admin center 3.dc.html: Browser · Admin · Spend · Type the hard limit; Admin center 3.dc.html: Browser · Admin · Spend · Move the ceiling past the credit, the explicit yes; Admin center 3.dc.html: Browser · Admin · Spend · Move the ceiling above the hard limit, refused |
| MA-137 | The admin sets the AWS and Claude caps and their alert thresholds in the Admin center, and alerts reach the app, push and email | To Do | §15.2 | planned | iPhone admin.dc.html: iPhone · Admin center; iPhone admin.dc.html: iPhone · Caps and alerts; iPhone admin.dc.html: iPhone · Alert routing; iPhone settings.dc.html: iPhone · Lock screen: a red alert; Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Alerts; Admin center 2.dc.html: Browser · Admin · Alerts · Replayed; Admin center 3.dc.html: Browser · Admin · Spend · Change the guards: member share, daily guard, calls per run; Admin center 3.dc.html: Browser · Admin · Spend · Type the hard limit; Admin center 3.dc.html: Browser · Admin · Spend · Move the ceiling past the credit, the explicit yes; Admin center 3.dc.html: Browser · Admin · Spend · Change the ladder's steps; Admin center 3.dc.html: Browser · Admin · Spend · Change the AWS cap, its steps and actions; Admin center 3.dc.html: Browser · Admin · Alerts · Change the routing; Admin center 3.dc.html: Browser · Admin · Alerts · Change quiet hours, cooldowns and the digest; Admin center 3.dc.html: Browser · Admin · Alerts · Change the queues' retries and backoff; Admin center 3.dc.html: Browser · Admin · Alerts · The AWS cap's steps and the forecast, with their flags; Admin center 3.dc.html: Browser · Admin · Alerts · Replayed, and failed again |
| MA-145 | A failed-work alert carries a Replay button that puts the dead-lettered work back on its queue | To Do | §15.2, §21.3 | planned | iPhone admin.dc.html: iPhone · Failed work and Replay; Admin center 2.dc.html: Browser · Admin · Alerts; Admin center 2.dc.html: Browser · Admin · Alerts · Replay, the fresh check; Admin center 2.dc.html: Browser · Admin · Alerts · Replayed; Admin center 3.dc.html: Browser · Admin · Alerts · Replayed, and failed again |
| MA-149 | The Audit screen opens the original file behind each change, through a short-lived link only the right member can use | To Do | §4.6, §9.3 | planned | iPhone audit and activity.dc.html: iPhone · Audit, a change from a file; iPhone audit and activity.dc.html: iPhone · Files; iPhone audit and activity.dc.html: iPhone · File preview; Audit and files.dc.html: Browser · Audit with files; Audit and files.dc.html: Browser · File viewer; Audit and files.dc.html: Browser · Files |
| MA-180 | Search finds a holding, a change, a file or a past answer from anywhere in the app | To Do | §9.3 | todo |  |
| MA-183 | The web app shows Home, a holding, Overlap and Scorecard read-only in a browser, installable as a PWA | To Do | §9.3, §9.4 | picked | Browser.dc.html: Browser · Overview; Browser.dc.html: Browser · A holding (NASDAQ 100); Browser.dc.html: Browser · Overlap; Browser.dc.html: Browser · Track record; Responsive.dc.html: Responsive · one Overview, five widths |
| MA-184 | The web app's Audit, Files, Activity and Admin center pages work in a browser, with the second check for the owner's actions | To Do | §4.6, §9.4, §15.1, §15.2 | planned | Browser 2.dc.html: Browser · Activity; Browser 2.dc.html: Browser · Audit; Audit and files.dc.html: Browser · Audit with files; Audit and files.dc.html: Browser · Files; Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Alerts |
| MA-185 | In a browser a member signs in to the web app with Apple, Google or a passkey, and the session lives in an HttpOnly cookie | To Do | §4.5, §9.4, §14 | planned | Browser 2.dc.html: Browser · Login |

## Phase 6: Track record and calibration (MA-15)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-81 | The forecast grader checks whether the ranges and P(fall greater than 5%) came true | To Do | §6.5 | none |  |
| MA-82 | The stance grader scores every call against doing nothing, with a reliability table | To Do | §6.4 | none |  |
| MA-83 | Confidence learns from its own track record, recalibrated only after 8 weeks | To Do | §6.4 | none |  |
| MA-84 | /scorecard shows the track record in the chat and on the dashboard | To Do | §6.4, §9.3 | planned | iPhone dashboard.dc.html: iPhone · Scorecard; Browser.dc.html: Browser · Track record |
| MA-85 | The Saturday review on Opus reflects on the last four weeks | To Do | §8, §11 | todo |  |

## Phase 7: News, events, sentiment (shadow) (MA-16)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-86 | The news job collects and de-duplicates articles about what you hold | To Do | §11 | none |  |
| MA-87 | Each article is scored and rolled into a daily sentiment index | To Do | §11 | none |  |
| MA-88 | The event calendar and a sentiment line reach the brief and the chat | To Do | §11 | planned | iPhone dashboard.dc.html: iPhone · Today's brief |
| MA-89 | Sentiment tilts the cascade by one notch, in shadow, only when the price pillars agree | To Do | §6.3, §11 | none |  |

## Phase 8: Stances go live (MA-17)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-90 | The go-live gate checks in code that stances beat the baseline for 8 weeks running | To Do | §1, §6.4 | none |  |
| MA-91 | Stance chips appear on the Portfolio card and in the brief, and /calls lists them | To Do | §6.3, §9.2 | todo |  |
| MA-92 | A guardrail review proves there is no path to "sell everything" | To Do | §1, §6.3 | none |  |

## Phase 9: MyPaisa: the whole wealth tracker on this backend (later, not a priority) (MA-18)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-93 | Property, deposits, policies, pensions and loans can be added and updated through the chat | To Do | §12 | todo |  |
| MA-94 | Wealth maths: XIRR to the penny, deposit accrual, loan schedules and a daily net worth | To Do | §6.6 | none |  |
| MA-95 | Design and build the Overview, Assets and Debts screens for the whole household | To Do | §12, §9.3 | planned | Wealth.dc.html: Browser · Household overview; Wealth.dc.html: Browser · Assets; Wealth.dc.html: Browser · An asset; Wealth.dc.html: Browser · Debts; Wealth.dc.html: Browser · A loan |
| MA-96 | Forecast and budget: a thirty-year projection and a monthly budget set by chat | To Do | §6.6, §12 | planned | Wealth.dc.html: Browser · Budget; Wealth.dc.html: Browser · Forecast |
| MA-97 | Reports and exports replace the old wealth tracker, which is then retired | To Do | §12 | planned | Wealth.dc.html: Browser · Reports |
| MA-104 | Any question about the household's money gets an answer from a read-only SQL copy of the ledger | To Do | §12.1, §8 | todo |  |
| MA-105 | The old wealth tracker's holdings and debts come into MyPaisa once, checked by the owner | To Do | §18.5 | todo |  |
| MA-111 | The owner fills prod's history from an Excel workbook sent in the chat | To Do | §12, §18.5, §22.2, §22.5 | todo |  |

## Phase 10: New kinds of holding (when you add one) (MA-19)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-98 | An iShares ETF from Monzo's "Build your own" range is added and priced like the funds | To Do | §4.3, §5.1 | none |  |
| MA-99 | A share gets valuation and earnings cards, with a fundamentals source chosen then | To Do | §4.3, §7, §17 | todo |  |

## Phase 11: The Forecaster: a second engine beside the rules engine (later) (MA-117)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-118 | The architecture records the Forecaster, a second engine beside the rules engine | Done | §16, §17, §19 | none |  |
| MA-119 | F1: ten years of point-in-time market, economy and world-event data sit in one queryable store | To Do | §19.2 | none |  |
| MA-120 | F2: a backtest lab replays any strategy over ten years, starting with today's rules engine | To Do | §6 | none |  |
| MA-121 | F3: the Forecaster names the market's mood and forecasts the next four weeks' risk | To Do | §19.4 | none |  |
| MA-122 | F4: similar past days and a library of event impacts explain what usually happened next | To Do | §19.3, §19.4 | none |  |
| MA-123 | F5: a calibrated four-week direction forecast combines the models, with an honest confidence | To Do | §19.4 | none |  |
| MA-124 | F6: the Forecaster's view appears beside the rules engine in the chat and on the dashboard | To Do | §19.7 | planned | Forecast.dc.html: Browser · Holding · Forecast; Forecast.dc.html: Browser · Holding · Forecast · UK fund; Forecast.dc.html: Browser · Forecaster · Proof |
| MA-125 | F7: monthly money and rebalancing are steered by risk to cut deep falls while growing steadily | To Do | §19.5 | todo |  |
| MA-126 | The Forecaster's data sources, their prices and the news-to-holdings matching are written down | Done | §5.1, §15, §19, §19.2, §19.3 | none |  |

## Phase 12: The agent team: configured, approved, self-healing, self-learning (later) (MA-127)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-128 | The architecture records the agent team, the settings and approvals, the learning loop, self-healing and the new budgets | Done | §5.1, §6.4, §15, §15.1, §16, §17, §18.1, §19.2, §20 | none |  |
| MA-129 | E1: every behaviour is a versioned setting with bounds, and nothing changes it except through the settings service | To Do | §20.2 | none |  |
| MA-130 | E2: an admin desk in the owner's chat and the Admin center where agents ask questions and seek approval, and the admin gives instructions | To Do | §20.3 | planned | Admin center 2.dc.html: Browser · Admin · Approvals; Admin center 2.dc.html: Browser · Admin · Approvals · Approve, the fresh check; Admin center 2.dc.html: Browser · Admin · Approvals · Approved; Admin center 2.dc.html: Browser · Admin · Settings |
| MA-131 | E3: a data steward keeps prices flowing from free sources, repairs gaps, and asks before adding a paid one | To Do | §5.1, §19.2, §20 | none |  |
| MA-132 | E4: every prediction is stored as made and graded every day against what prices actually did | To Do | §20.4, §20.6 | none |  |
| MA-133 | E5: confidence is recalibrated every day within safe bounds, and rolled back on its own if it gets worse | To Do | §20.4 | none |  |
| MA-134 | E6: challenger models and rule changes run beside the current ones and are promoted only on evidence and the admin's approval | To Do | §20.4 | none |  |
| MA-135 | E7: an ops warden runs the daily pipeline, repairs what it safely can and opens an incident for the admin when it cannot | To Do | §20.5 | planned | Admin center 2.dc.html: Browser · Admin · Agents and incidents |
| MA-136 | E8: each agent has its share of the $200 Claude credit, and AWS and other services stay inside their cap | To Do | §15.2, §20.7 | planned | Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Agents and incidents |
| MA-146 | The ops warden replays dead-lettered work on its own once the cause is healthy, and opens an incident if it fails again | To Do | §20.5, §21.3 | none |  |

## Phase 13: Indian markets and the existing Indian portfolio (later) (MA-147)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-151 | IN1: Indian mutual funds, shares and ETFs are priced every day from free sources, with ten years of history | To Do | §5.1, §22 | none |  |
| MA-152 | IN2: The existing Indian portfolio is imported from a CAS statement or a broker export, with every past transaction, after one Confirm | To Do | §18.5, §22 | todo |  |
| MA-153 | IN3: Indian accounts show in INR and GBP, with wrapper-aware suggestions and a tax flag where UK rules differ | To Do | §4.1, §9, §22 | planned | India.dc.html: Browser · Overview with India; India.dc.html: Browser · Holding · Indian fund; India.dc.html: Browser · Holding · NSE share |
| MA-154 | IN4: The engine and the Forecaster read Indian markets through an India basket, Indian news and the RBI's calendar | To Do | §6.2, §19.2, §19.3, §22 | none |  |

## Phase 14: The app beyond the chat: widgets, Siri, the share sheet, Live Activities (later) (MA-175)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-176 | A Home Screen and Lock Screen widget shows the household's total and the day's move, hidden in privacy mode | To Do | §9 | todo |  |
| MA-177 | A factsheet or screenshot shared from Mail, Files or Photos goes to MyPaisa through the share sheet | To Do | §4.2, §9 | todo |  |
| MA-178 | Siri and Shortcuts answer "How is the portfolio today?" and start a guided flow through App Intents | To Do | §9 | todo |  |
| MA-179 | A Live Activity follows a long job, such as an import, on the Lock Screen and in the Dynamic Island | To Do | §9, §18.5 | todo |  |
