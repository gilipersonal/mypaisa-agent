# MA-161: what changes on the existing Jira issues

The keys stay; what each delivers moves from Telegram and the web to the iOS app. Summaries here are the new
ones; the trace (`docs/trace.json`) carries them, and each issue's description is rewritten to match (lesson 5 of
`.claude/rules/independent-review.md`: the descriptions too, not only the summaries). Done issues keep their
history and are not rewritten (MA-101, MA-103, MA-106, MA-112, MA-118, MA-126, MA-128, MA-138, MA-141, MA-150,
MA-155, MA-157, MA-159; MA-6 and the other tooling issues outside the phases).

## Phases (epics)

| Epic | Phase | New title in PLAN.md and the trace | Epic summary in Jira |
| --- | --- | --- | --- |
| MA-10 | 1 | Registry, sign-in and the app's chat | The household signs in to the app and records what it holds through the chat |
| MA-12 | 3 | Briefs, alerts, charts, technical mode (unchanged) | Brief, wrap, alerts and charts in the app |
| MA-14 | 5 | The dashboard and the Admin center, in the app and the web app (read-only, behind sign-in) | The dashboard and the Admin center, in the app and the web app |
| MA-175 | 14 | The app beyond the chat: widgets, Siri, the share sheet, Live Activities (later) | (new) |

## Stories and tasks

| Key | Phase | New summary | What changed |
| --- | --- | --- | --- |
| MA-20 | 0 | MyPaisa Dev's identity exists: its bundle id, its icon with the DEV band, and its sign-in ids in dev's SSM paths | Was the dev Telegram bot and its picture |
| MA-23 | 0 | Each Monzo fund's factsheet and a valuation screenshot are ready to send in the app | "to the bot" |
| MA-142 | 0 | MyPaisa's prod app record exists with the 1c Watcher icon, and prod's Twelve Data key is in prod's SSM path beside dev's | Was the household's prod bot; the open question on who puts prod's values stays |
| MA-143 | 0 | Each environment has its own Google iOS and web clients and Sign in with Apple's ids, with their ids in SSM, before Cognito is built | Was a web Google OAuth client with a redirect and a secret; the iOS client and Google Identity Services need no secret |
| MA-30 | 1 | Replies reach the open app over a signed-in live connection, in order and never twice, and the app catches up when it opens | Was a thin Telegram client |
| MA-31 | 1 | The chat API accepts only a signed-in member's messages and taps, and hands each off once | Was the Telegram webhook |
| MA-32 | 1 | The first person to sign in owns the household and invites and removes members with one-time links | "in the chat"; invites are universal links |
| MA-35 | 1 | The chat answers onboarding, add, update, privacy, pause, resume and help, typed or from its shortcut chips | Was "the bot answers /add ..." |
| MA-37 | 1 | A factsheet or valuation screenshot sent from the camera, a scan, Photos or Files adds or updates a holding after Confirm | Was "sending" in Telegram |
| MA-73 | 1 (from 5) | Each environment hosts the console at console(-dev).mypaisapp.com on S3 and CloudFront: the web app (a PWA) and the iOS app's association file and invite page | The same site, now also serving the iOS app's links; moves to phase 1, which the invites need |
| MA-75 | 1 (from 5) | The api's authorizer checks the access token, the member's status and session epoch on every call and live connection | Was the Mini App's Telegram sign-in; moves to phase 1, which the chat needs |
| MA-109 | 1 | Each environment has its own Cognito sign-in with Sign in with Apple, Google and passkeys, verified in custom-auth Lambdas | Was Telegram, Google and passkeys |
| MA-144 | 1 | The app reaches each environment through api(-dev) and live(-dev).mypaisapp.com, and the dev build runs from Xcode against dev | Was Telegram reaching the api, the dev bot by long polling |
| MA-156 | 1 | A transaction can be typed in any currency, and the chat checks it against the holding's own currency and puts a mismatch right before Confirm | "the bot"; 1b's pick carried into the app |
| MA-56 | 3 | Design the chart house style shared by the chat's cards and the dashboard, in Swift Charts | Was PNG in the chat and lightweight-charts on the web |
| MA-58 | 3 | Charts in the house style are drawn in each card from the engine's series | Was PNGs sent with each card |
| MA-59 | 3 | Alerts come in tiers as push and in the chat, respect quiet hours and never repeat within their cooldown | Telegram's sound and silence become push interruption levels |
| MA-61 | 3 | A dead man's switch and the error alarms tell the owner, in the app and by push, when a job did not run | "tell the chat" |
| MA-62 | 4 | You can ask MyPaisa anything about your holdings and it answers from its tools | "the bot" |
| MA-70 | 5 | Design the iPad and open-foldable layouts: Home, a holding, Overlap, Scorecard and sign-in at regular width | Was the browser boards |
| MA-71 | 5 | Design the Audit and Activity screens on iPhone and iPad | Was both sets of web boards |
| MA-72 | 5 | Each member's Apple Account and Google account use two-factor authentication, and each device has a passcode and Face ID | Was the Google web client, the bot's web domain and Telegram's two-step |
| MA-74 | 5 | A read-only api Lambda serves each member only what they may see | Unchanged summary; the description drops the cookie and CORS, adds the Bearer token |
| MA-76 | 5 | The second check: a fresh Sign in with Apple or passkey under Face ID, or Google again for a Google-only member, bound to the action and verified by the server | Was the browser sign-in with Telegram, Google or a passkey |
| MA-77 | 5 | A member adds a second sign-in, Apple or Google, or a passkey, to their identity from You | Was the six-digit code linking Google from Telegram |
| MA-78 | 5 | Home, a holding, Overlap and Scorecard work in the app on iPhone and iPad | Was the Mini App and the browser |
| MA-79 | 5 | The Audit and Activity screens show every change and every run, with what it cost | "pages" |
| MA-80 | 5 | Each card opens its dashboard screen, and each screen's Ask opens the chat about it | Was the Mini App button and /web |
| MA-102 | 5 | The owner can sign out or pause any member's devices from the Admin center, behind the second check | Was Telegram or browser sessions; its open question stays, reworded for Apple and Google |
| MA-137 | 5 | The admin sets the AWS and Claude caps and their alert thresholds in the Admin center, and alerts reach the app, push and email | "the web app, Telegram and email"; its open question stays |
| MA-149 | 5 | The Audit screen opens the original file behind each change, through a short-lived link only the right member can use | "page" |
| MA-93 | 9 | Property, deposits, policies, pensions and loans can be added and updated through the chat | "the bot" |
| MA-111 | 9 | The owner fills prod's history from an Excel workbook sent in the chat | "to the bot" |
| MA-124 | 11 | F6: the Forecaster's view appears beside the rules engine in the chat and on the dashboard | "in Telegram and the web app" |
| MA-130 | 12 | E2: an admin desk in the owner's chat and the Admin center where agents ask questions and seek approval, and the admin gives instructions | "in Telegram" |

Every other open story keeps its summary; its description is checked for Telegram, the Mini App, the browser and
the web app and rewritten where it names them. Stories whose Telegram or web boards are superseded and whose iOS
boards are not drawn yet (phases 6 to 13) go to design `todo` in the trace with a note: drawn for iOS before they
start (`/design-first`).

## After Arun's corrections

The web app stays (MA-183, MA-184, MA-185 filed); MA-181's summary gains "and stays legible in light and dark at
25% brightness"; MA-78 shows every screen on the iPad and the foldable too; MA-76, MA-102, MA-116, MA-137, MA-145
and MA-149 cover the Admin center in both the app and the web app; MA-80 adds the /web reply.
