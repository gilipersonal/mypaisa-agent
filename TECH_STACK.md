# MyPaisa Agent — Tech stack and running cost

The stack as designed in `ARCHITECTURE.md`, by layer, and what it costs to run
as two environments (`dev` and `prod`) in the wealth tracker's AWS account.
Versions are pinned in `pyproject.toml` and `uv.lock` once the Python skeleton
lands (phase 0, MA-24), and in each door's `package.json` and lockfile once
its skeleton lands; until then "current" means the latest stable release at
the time of writing (26 Oct 2026).

Status: design. Nothing is built. The architecture is drawn in Lucid, seven
AWS views and a sequence, linked and embedded in `ARCHITECTURE.md`
(24 Oct 2026, MA-141). On 25 Oct 2026 (MA-161) the front end became two
doors, the iOS app and the web app in a browser, and the Telegram bot left
the plan. On 26 Oct 2026 (MA-186) the plan was re-ordered to build the
household's whole wealth first, in phases 0 to 20, with both doors in every
phase: the web app became a full door with the chat, a SvelteKit 3 PWA at
`dashboard(-dev).mypaisapp.com`; the iOS app became a React Native shell
with a native SwiftUI core, as bong-panjika is built; and replies reach both
doors over Server-Sent Events (SSE) on the api host, in place of the
WebSocket API. §2 holds the app's stack and §3 the web app's.

---

## 1. Application (Python)

| Piece | Choice | Why |
| --- | --- | --- |
| Runtime | Python 3.14 on AWS Lambda, arm64 container images from one Dockerfile. One image holds the handlers `api` (the chat API, the dashboard's reads and the in-place corrections, for the app and the web app), `agent`, `sender`, `worker` (running the ingest, engine, news, score, docs, brief and check-in jobs, the nightly views and the projection runs, by type), the authorizer and the Cognito custom-auth triggers. The stream handler, `stream` (the SSE stream at `/v1/stream`), is Python run through the Lambda Web Adapter, built as its own target of the same Dockerfile, since the adapter would take over the other handlers [verify in the phase 1 spike, MA-195] | pandas, numpy and pyarrow exceed the zip limit; Graviton is cheaper; one Dockerfile means one build |
| Packaging | `uv`, `pyproject.toml`, `uv.lock` | Fast, reproducible installs in CI and in the image |
| Models and validation | pydantic v2 | Tool inputs, the chat API's requests, every kind spec, record and event, and every card, whose versioned JSON Schema the app's and the web app's TypeScript types are generated from (MA-174), with `schema_version` |
| Data maths | pandas, numpy, pyarrow | The engine ported from the Agentic Trading Desk; the wealth maths (accrual, loan schedules, XIRR, the Projection) ported from the old wealth tracker's tested TypeScript, its cases kept as golden fixtures (MA-105); parquet history in S3 |
| The Forecaster (phase 17) | DuckDB over the Parquet lake; scikit-learn, LightGBM, a regime model (hidden Markov) and a volatility model (`arch`); conformal intervals; SHAP for the main drivers | A second engine beside the rules engine (`ARCHITECTURE.md` §19); small data, so it runs in Lambda |
| Calendars and FX | `exchange_calendars`; ECB reference rates for USD, EUR and INR | XLON, XETR, XNYS sessions and holidays; the clock-change weeks; GBP or INR per member |
| HTTP | httpx, with HTTP/2 (`httpx[http2]`) for Apple push | ECB, EODHD, Twelve Data, RSS, product pages; APNs from the `sender` |
| Price feeds | One `PriceSource` contract; a plugin per feed (yfinance, Twelve Data, EODHD, issuer pages, FT, proxy, screenshot, AMFI's NAV file); the chain per kind in each environment's Terraform root (`infra/dev`, `infra/prod`), a `.env` for local. Phase 5 brings the minimal chain, yfinance for listed lines and AMFI's NAV file for Indian mutual funds (MA-207); phase 10 completes the chains (MA-42) and phase 19 adds the Indian history and sources (MA-151) | yfinance by default and for local development, no key; EODHD by configuration and a key in SSM; every plugin passes the same contract tests on recorded responses |
| News | feedparser, trafilatura | RSS parsing and article text extraction |
| Charts | None on the server | Each card and screen carries its series from the engine; the app draws it in Swift Charts and the web app in lightweight-charts, both in the house style (MA-56, MA-58). Nothing server-side draws a PNG, so matplotlib is not in the image |
| Claude | The `anthropic` Python SDK against the Anthropic API; key in SSM, read once per cold start; the key belongs to a workspace, one per environment, in the Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for the calls; a spend limit per workspace | Structured outputs, strict tools, prompt caching, PDF and image input, citations, server-side web search and fetch, Message Batches for the nightly scoring |
| Lambda helpers and observability | aws-lambda-powertools (Logger, Tracer, Metrics, idempotency, parameters), boto3; AWS X-Ray | Structured JSON logs with a run id on every line, one trace per run, ten custom metrics; a `RunRecord` per run and an `AuditEvent` per change in DynamoDB, which the Activity and Audit screens read, in the app and the web app |
| The chat API and the stream | Both doors post each message to `/v1/chat/messages` and each tap to `/v1/chat/actions` with a client id, the dedupe key on `updates.fifo`, and get `202` at once. Replies, cards, check-ins and `records.changed` come back over SSE from `GET /v1/stream` on the api host, so the session cookie reaches it: a per-member sequence and an event log kept seven days or more, resumed from `Last-Event-ID` or `?after=` after a reload (anything older gets `resync`); the agent's words from a per-turn buffer updated about every 200 ms; a heartbeat every 15 s, and each response ends at about 14 minutes with `retry`; a `Presence` row per open door in place of a connection, and push only to a device with no fresh presence. Both clients read the stream with `fetch`, not `EventSource`, so a 401 refreshes the token and reconnects; one leader tab per browser, closed 60 s after the page is hidden; the server re-checks the member's status and session epoch every 60 s | Nothing depends on a connection staying up: a door asks for everything after its last event when it opens (MA-30, MA-31; the spike, MA-195) |
| Push | APNs, token-based: a JWT signed with the environment's `.p8` key from SSM, sent over HTTP/2 by the `sender`; Web Push to the installed web app, signed with the environment's VAPID key from SSM (MA-200); interruption levels (a red alert time-sensitive, the rest passive or active as the member chooses); a dead token or subscription removed | No certificates to renew; one key of each per environment (MA-164, MA-170) |
| Identity | Amazon Cognito from day one, one user pool per environment (Essentials): one user per member, with their Apple account, Google account and passkeys linked to it; Sign in with Apple and Google through custom-auth Lambda triggers that check the provider's identity token against its published keys (issuer, audience, expiry, issue time, the api's nonce, no replay); five-minute access tokens sent as a Bearer token, the rotating refresh token in the app's Keychain; in a browser, Sign in with Apple's JS (the environment's Services ID) and Google Identity Services (its Google web client id) through the same exchange, with an `HttpOnly`, `Secure`, `SameSite=Strict` session cookie on the api host that page scripts never see (MA-185); one-time invite links at `https://dashboard.mypaisapp.com/join/<token>` that open the app; roles owner / member / viewer | No passwords; one identity however a member arrives; sign out everywhere and pause built in (MA-102, MA-109) |

## 2. The iOS app

A React Native shell with a native SwiftUI core, the way bong-panjika's
`frontend-native-apple/` is built (MA-165): the shell owns the page and the
plumbing, and every piece a member looks at is SwiftUI.

| Piece | Choice | Why |
| --- | --- | --- |
| The shell | React Native 0.87, bare (the Community CLI), New Architecture, Hermes, TypeScript in strict mode, no Expo; one universal app, **MyPaisa**, for iPhone and iPad on iOS and iPadOS 26 and later, and **MyPaisa Dev** against dev. The shell owns the navigation (the system `UITabBar` and the sidebar, through Fabric), the store, the api and SSE client, sign-in orchestration, push registration and the shared models | One TypeScript layer shared with the web app; the system's own bars, not a JavaScript imitation of them |
| The core | SwiftUI (Swift 6, strict concurrency) for every piece a member looks at, each hosted through a Fabric component and fed one formatted JSON model: the chat timeline and its cards, the composer, the hero and the figure rows, inline edit, the charts, the sheets. Each piece sizes itself and reports its height, and its events come back the same way | "Performance is key … silky smooth like Monzo" (Arun, 26 Oct 2026); Liquid Glass and the iOS 26 controls come with the system; one binary lays itself out by size class and width (compact, regular narrow, regular wide), so every iPhone, every iPad window and a foldable fit with no special case |
| Shared TypeScript | The card types, the formatting (lakh and crore, privacy masking) and the view models are written once in `web/src/lib/` and imported by path, through Metro's `watchFolders` and a `#lib` alias; nothing is copied (MA-194) | A card or a figure reads the same at both doors, and a model that changes breaks both typechecks the same day |
| Look | MyPaisa DS v1 "Warm ledger" (MA-101) as colour assets (light, dark, increased contrast) generated from `tokens.css` by a script; SF Pro and SF Pro Rounded through Dynamic Type, tabular numerals; SF Symbols; Liquid Glass only on the controls (tab bar, sidebar, toolbars, the composer, chips, menus, sheets), never on content, and carrying labels only; dark tokens tuned so every pair passes the contrast gate at 25% brightness (MA-181) | The app and the design system never drift; the HIG's own materials, used the way it says; clear on a dimmed phone |
| Charts | Swift Charts in the house style (MA-56), drawn from the series in each card, as a SwiftUI piece; audio graphs through `AXChartDescriptor` | Native, accessible and the same in the chat and on the dashboard; replaces the PNG charts |
| Motion | One motion system with the web app (MA-182): SwiftUI's springs (`.smooth` for content arriving, with a short stagger; `.snappy` for a control answering a touch; `.bouncy` for a success only), glass morphs in a `GlassEffectContainer`, figures as `numericText` transitions, a row zooming into its screen, charts drawing in, haptics; under Reduce Motion a short cross-fade or nothing; the shell animates only transform and opacity | Every component and chart moves the same way, and nothing loops |
| Smoothness | A `PERFORMANCE.md` in `ios/` with budgets and benches, measured on the phone, never the simulator: 0 dropped frames at 120 Hz scrolling the chat and the dashboard and as cards arrive, a chart scrub at 120 Hz, a launch budget; each bench a launch argument, run before a change and after it | Smoothness is a number with a test, as on bong-panjika (MA-165) |
| Offline cache | The shell's store, kept on the device with complete file protection: the last Home, records and conversation, shown with their time | A lost signal shows the last figures as old, never as new, and keeps what is typed (MA-173) |
| Sign-in | AuthenticationServices: Sign in with Apple (`ASAuthorizationAppleIDProvider`) and passkeys; Google Sign-In for iOS (Google's SDK, PKCE); tokens in the Keychain, this device only, after first unlock; native modules the shell calls | Apple's and Google's own buttons, no password; the second check is a fresh, server-verified assertion: Sign in with Apple or a passkey under Face ID, or Google again for a member who signs in only with Google (MA-76, MA-168) |
| App lock | LocalAuthentication: Face ID or the passcode on open, if the member turns it on | A local comfort, never the server's second check (MA-171) |
| Notifications | UserNotifications, with the push token registered after sign-in; no amount on the Lock Screen unless the member turns it on, never with privacy mode on | MA-170 |
| Attachments | VisionKit (document scan), PhotosUI, the Files picker; Quick Look to open a file from the audit log | A statement, a factsheet or a screenshot goes in without leaving the chat (MA-37, MA-149) |
| Project | `ios/`: the React Native app (`package.json`, the TypeScript shell in `src/`) and its Xcode workspace, with the SwiftUI pieces and their Fabric component specs; two configurations, Dev and Prod, chosen by scheme. CocoaPods builds it today; the move from CocoaPods to Swift Package Manager must be settled before CocoaPods trunk goes read-only on 2 Dec 2026 [verify that React Native 0.87 allows it] | One workspace for the shell and the native pieces, as on bong-panjika (MA-165) |
| Tests | Jest with the React Native preset for the shell; XCUITest for the flows; snapshot and accessibility checks for the SwiftUI pieces; the `PERFORMANCE.md` benches on the phone | MA-166 |
| Distribution | TestFlight internal testing for MyPaisa Dev and MyPaisa; no App Review for internal builds; a build lasts 90 days, so a prod build goes out at least every 60 | MA-167 |
| Beyond the chat (phase 20, later) | WidgetKit, App Intents, a share extension, ActivityKit | MA-175 |

## 3. The web app

| Piece | Choice | Why |
| --- | --- | --- |
| Pages | The chat; Home and the dashboard as it grows phase by phase (net worth, assets and one asset, debts and one loan, Budget, Projection); Audit and Files, Activity, Search and the owner's Admin center; from phase 12 a holding's market view, and from phase 13 Overlap and Scorecard. Anything new is created in the chat; an existing figure the kind marks editable is corrected in place, through the one write service, with its audit row | A full door for a laptop, an iPad or a phone, with or without the app; both doors ship in every phase (MA-199, MA-184) |
| Build | SvelteKit 3 (3.1.0 on npm) with Svelte 5 runes and `adapter-static`, a single-page app in `web/`, in TypeScript; MyPaisa DS v1 "Warm ledger" `tokens.css` and its adaptive shell (two columns at laptop width); the card types, formatting and view models in `web/src/lib/`, which the iOS app's shell imports by path; the fallback page never swallows `/.well-known/apple-app-site-association`, and the CSP carries SvelteKit's script hashes (MA-194) | The browser boards in the MyPaisa app v1 Claude Design project, at desktop and at phone width (390), are its one spec |
| The chat | Svelte components draw every card from the same versioned card JSON as the app's SwiftUI (MA-174); replies stream in over SSE; text and files go in from the composer (MA-199) | A flow started on the laptop finishes on the phone |
| Charts | lightweight-charts (TradingView's open-source charting library), in the house style, from the same series as the app's Swift Charts | Interactive charts, light enough for a phone; a holding looks the same at both doors |
| Motion | The shared motion system (MA-182) in CSS transitions, the Web Animations API and View Transitions; `prefers-reduced-motion` lands every step at once | The same choreography as the app's SwiftUI springs |
| PWA | A manifest with the app icon, standalone display, a service worker that caches the shell only and never a figure, an install prompt only after a second visit; Web Push to the installed app when it is closed (MA-200) | Installable without a store; nothing of the household's is left on a shared laptop |
| Performance | INP at most 200 ms and LCP at most 2.5 s on a mid-range phone; 60 fps scrolling | The phone-width door is as smooth as the app |
| Sign-in | Sign in with Apple's JS, Google Identity Services and passkeys (WebAuthn); the api sets the session cookie; CORS admits only that environment's dashboard host | No token is visible to page scripts (MA-185) |
| Hosting | S3 + CloudFront per environment at `dashboard-dev.mypaisapp.com` and `dashboard.mypaisapp.com`, which also serve the iOS app's `apple-app-site-association` file and the invite page (`/join/<token>`) | One site for the web app and the links; the shell is public and holds no data (MA-73) |

## 4. Quality

| Piece | Choice |
| --- | --- |
| Lint and format | ruff; svelte-check and eslint for `web/`; eslint for the iOS app's TypeScript shell; swift-format for its SwiftUI pieces, from Xcode's toolchain (`.swift-format`) |
| Contrast | `python3 scripts/contrast_check.py`: every colour pair in `tokens.css` and the glass fills, in light and dark, at full brightness and with the screen at 25%: primary text 7:1 (4.5:1 dimmed), secondary and coloured text 4.5:1 (3:1 dimmed), meaningful UI (chart marks, bars on their track) 3:1 (1.8:1 dimmed), what must only be seen (a privacy mask, an empty track) 1.5:1 (1.25:1 dimmed); it fails closed, and fails when a board project's copy of `tokens.css`, `ios.css` or the motion files differs from DS v1's; a jira-flow gate (MA-181) |
| Types | pyright, strict; TypeScript, strict, in both doors (svelte-check for `web/`); Swift 6 strict concurrency |
| Tests | pytest; hypothesis for property tests (local + FX = total); moto for AWS; respx for HTTP; recorded Claude responses for rendering; golden files from the desk's self-tests for the engine, and from the old wealth tracker's tests for the wealth maths (MA-105); coverage threshold 90%. For the app: Jest for the shell; XCUITest for the flows; XCTest and swift-snapshot-testing for every SwiftUI piece and card at iPhone and iPad sizes, in light and dark, at Large and AX5 text; `performAccessibilityAudit()` in every screen's UI test; the `PERFORMANCE.md` benches on the phone (MA-165, MA-166, MA-181). For the web app: vitest for the shared TypeScript and the components; Playwright for the flows and screenshots of every page at 390 and 1440 in both themes, and the session cookie's refusals (MA-183, MA-185) |
| Hooks | pre-commit running lint, format check, typecheck and tests |
| CI | GitHub Actions, as on smart-clearance: on every pull request ruff, pyright, pytest with moto, `terraform fmt` and `validate`, tflint, a security scan of the Terraform, gitleaks, pip-audit, `jira-key`, and a plan for dev and prod; on a pull request that touches `ios/`, the app's gates on a macOS runner (MA-166), and on one that touches `web/`, svelte-check, eslint, vitest and Playwright; on merge to `main` the image built once, dev applied and smoke-tested, then prod after approval in the GitHub `prod` environment with rollback on a failed smoke test, and the app archived once per configuration: MyPaisa Dev to TestFlight after dev's smoke tests, MyPaisa after the same approval (MA-167); a nightly drift check. Actions pinned to commit SHAs, OIDC only (MA-25, MA-107, MA-108) |
| Definition of done | `PLAN.md` → Definition of done |

## 5. AWS services

| Service | Role |
| --- | --- |
| Lambda | The handlers, from one Dockerfile, including `sender` (replies out), `worker` (background jobs by type) and `stream` (the SSE stream, through the Lambda Web Adapter, its own build target; reserved concurrency of about 20); from phase 18 one per agent (`ARCHITECTURE.md` §20) |
| SQS | `updates.fifo` (one lane per member), `outbox.fifo` (one lane per member) and `work`, each with a dead-letter queue and an alarm; retries with backoff and replay (`ARCHITECTURE.md` §21); inside the free tier of a million requests a month, or about a dollar |
| Step Functions, EventBridge bus (phase 18) | The daily run as one state machine with retries; agents publish events on `mypaisa-<env>-events`; inside the free tiers at this volume |
| API Gateway HTTP API | One per environment on its custom domain, `api-dev.mypaisapp.com` and `api.mypaisapp.com`: `/auth/nonce`, `/auth/apple`, `/auth/google`, `/auth/passkey/options` and `/auth/passkey`, `/v1/chat/messages` and `/v1/chat/actions` (`202` at once, deduped by the client id), `GET /v1/...` JSON, `PATCH /v1/records/{id}` for the figures a kind marks editable (the in-place correction, through the one write service, audited), `/v1/admin/...` for the owner; a Bearer token from the app, the `HttpOnly` session cookie from the web app; the authorizer checks the token, the member's status and session epoch on every call and on the stream (MA-75) |
| The stream (SSE) | `GET /v1/stream` on the same api host, so the session cookie reaches it, with no API Gateway WebSocket API. Either a REST API stage with response streaming on the same custom domain, or CloudFront routing that path to the `stream` function's URL; the phase 1 spike decides (MA-195) [verify both]. Its event log and `Presence` rows sit in the one DynamoDB table |
| Cognito | One user pool per environment, Essentials plan, with no hosted domain: the api's `/auth/*` routes call its API; custom-auth triggers verify Sign in with Apple's and Google's identity tokens and passkey assertions (the dashboard's domain is the relying party, as MA-109 decides); free under 10,000 monthly users |
| EventBridge Scheduler | 07:00, 07:15, 21:00, 21:15 on weekdays; 23:30 daily; 08:00 Saturday; every 3 h for news; the daily check-in job; all in `Europe/London` |
| DynamoDB | One on-demand table per environment: the household's kind specs, records, events and views as documents, with no relational schema; TTL on chat turns, message dedupe, article scores and the stream's event log (seven days or more); a `Device` row per signed-in device with its push token or Web Push subscription, and a `Presence` row per open door |
| S3 | Prices and FX as parquet; documents: every file a member sends, kept for good (private, encrypted, versioned in prod, no expiry rule), opened from the Audit screen through five-minute presigned links (MA-148, MA-149); articles (90-day rule) |
| ECR | The container image, one repository, lifecycle rule keeping the last ten |
| SSM Parameter Store | Standard tier, one path per environment (`/mypaisa-agent/dev/...`, `/mypaisa-agent/prod/...`): as SecureString the APNs key, the Sign in with Apple key, the Web Push VAPID private key (MA-200), the Anthropic API key, Twelve Data and EODHD keys; as plain String the Apple team id, bundle id, Services ID and key ids and the Google iOS and web client ids (no client secret is used); values put by hand after the first apply, over a write-only placeholder Terraform made (`value_wo`, MA-159), so no value reaches Terraform's state |
| CloudFront + S3 | The web app per environment, `dashboard-dev.mypaisapp.com` and `dashboard.mypaisapp.com`: the SvelteKit PWA, the iOS app's `apple-app-site-association` file (`applinks` for the invite links, `/join/<token>`, and `webcredentials` for passkeys, whose relying party this domain is) and the invite page; strict security headers, the CSP with SvelteKit's script hashes; the static shell is public and holds no data (MA-73) |
| Route 53 + ACM | The `mypaisapp.com` zone and the `*.mypaisapp.com` certificate already exist, owned by the wealth tracker's Terraform; MyPaisa looks them up and adds its four records, `api` and `dashboard` for each environment (sign-in has no domain of its own). In phase 9 MA-97 moves the zone into this repo, points `mypaisapp.com` at `dashboard.` and retires the old tracker; until then the session cookie is never widened to `.mypaisapp.com` |
| X-Ray | One trace per run from the chat API through the agent to the Anthropic API, DynamoDB, S3, and the `sender`'s delivery to the app and APNs; inside the free tier at this volume |
| CloudWatch | Logs with 14-day retention and saved Logs Insights queries; ten custom metrics and one dashboard per environment; an error alarm per function; the 07:45 dead man's switch; cost, freshness and audit-chain alarms; all delivered to the owner in the app and by push (MA-61) |
| AWS Budgets | The backstop, in Terraform: one cost budget at the hard limit (£75 by default, in dollars) alerting on actual and forecast spend, with an action that stops dev's schedules; monitoring and the first two action-enabled budgets are free. The working cap (£50) and its steps are app settings (`ARCHITECTURE.md` §15.2) |
| Cost Explorer | Read once a day: month-to-date cost by service and `env` tag, and the forecast, for the app's AWS meter; about $0.01 a request |
| SNS | `mypaisa-<env>-admin-alerts`: the admin's email subscribed (address in SSM, subscription by Terraform); the first 1,000 email notifications a month are free |
| IAM | One execution role per function and environment (only its own table, bucket and SSM path); three OIDC roles for CI pinned to this repository's numeric id (`ci-plan`, `ci-dev-deploy` on `main`, `ci-prod-deploy` on `main` and the `prod` environment); a developer role for dev with an explicit deny on anything tagged `env=prod`; all in Terraform, nothing by hand |

## 6. Infrastructure and tooling

| Piece | Choice |
| --- | --- |
| Infrastructure as code | Terraform ≥ 1.11 and the `hashicorp/aws` provider ≥ 5.87 (write-only arguments such as `value_wo`, so no secret reaches state; MA-159), the only way anything in AWS changes; `infra/modules/mypaisa` holds the stack once and the roots `infra/dev` and `infra/prod` call it; `infra/bootstrap` makes the CI and developer roles once; state in `s3://wealth-tracker-tfstate` under `mypaisa-agent/<env>/infra.tfstate`; plan to a file, read it, apply that file; prod applied only by CI; `prevent_destroy` on prod's data (`.claude/rules/aws-changes.md`) |
| Environments | `dev` and `prod`, every component twice (`mypaisa-<env>-<part>`, tagged `env`) in account `545595341442`, `us-east-1`; separate apps (MyPaisa Dev and MyPaisa, each with its own bundle id), Apple keys and Services IDs, Claude keys, Google iOS and web clients, web app hosts, Cognito pools and SSM paths; separate budgets; dev seeded with the illustrative household of the design figure set (MA-110), prod empty at launch and filled only through the app; dev's schedules off unless a variable turns them on (`ARCHITECTURE.md` §18) |
| Developer machine | A Mac: uv, Docker (image builds), AWS CLI with the `agent-toolkit` profile through the dev developer role, the AWS MCP for reading, Terraform, tflint, GitHub CLI, pre-commit; Node for `web/` and the iOS app's shell, with Playwright's Chromium; Xcode 26 and CocoaPods (until the move to Swift Package Manager) for `ios/` |
| Local run | Two ways. The whole app on the laptop (MA-198): a moto server for DynamoDB, S3 and SQS (no Docker), the handlers behind one local ASGI app with SSE, the SvelteKit dev server, the iOS simulator pointed at localhost, and a sign-in stub that answers only on localhost and is compiled out of every deployed build; the agent runs against dev's Claude key or in a scripted mode that replays recorded conversations, for UI work, the end-to-end tests and parity with the prototype. Or the doors on the laptop against dev in AWS: MyPaisa Dev on a simulator or a device, and the web app from `localhost`, against `api-dev` and the dev Cognito pool (MA-144). Tests never reach AWS or the Anthropic API |
| Secrets | Never in files, chat, logs or Terraform state; put by hand into each environment's SSM path, over a parameter Terraform made with a write-only placeholder (`value_wo`, never `value`, MA-159); CI holds no AWS keys |
| Diagrams and design pages | Lucidchart, AWS 2024 shapes: `docs/design/lucid/gen_aws_architecture.py` writes the Standard Import JSON for the seven views, and the PNG exports sit beside it; the explainer pages (MyPaisa Agent Journey, MyPaisa Market Agent) are single HTML files in `docs/design/`, published as claude.ai artifacts, in MyPaisa DS v1 "Warm ledger" (MA-101) with the crimson alert of MA-102, and updated for the app in MA-161; the app's boards are in the MyPaisa iOS v1 Claude Design project, mirrored into `docs/design/ios-v1/`, and the web app's browser boards, at desktop and at 390, in MyPaisa app v1 (`docs/design/app-v1/`); the whole-wealth boards and the clickable prototype are drawn on MA-193; every board moves with the shared `motion.css` and `motion.js` (MA-182) |

## 7. Services outside AWS

| Service | Plan | Used for |
| --- | --- | --- |
| Anthropic API | Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens; Batches at half price; web search $10 per 1,000; paid from the Max 20x plan's monthly API credit ($200) through the linked Console organisation, with a spend limit per workspace ($160 prod, $40 dev, the hard caps behind the ceilings); no payment method, auto-reload off | Every model call, document extraction, web search and fetch, the nightly scoring |
| Apple Developer Program | $99 a year (about £76), joined after Arun's yes on MA-162 | Sign in with Apple (in the app, and in a browser through a Services ID per environment), push (APNs, free), TestFlight, the two app ids and App Store Connect |
| Web Push (VAPID) | Free | Push to the installed web app through the browser's own push service; the VAPID private key in each environment's SSM path (MA-200) |
| Google Sign-In for iOS and Google Identity Services | Free | Sign in with Google in the app and in the web app; an iOS client and a web client per environment, their ids (no secret used) in that environment's SSM path; the token verified in Cognito's custom-auth trigger (MA-143) |
| GitHub Actions macOS runners | macOS minutes count ten to one against the account's free minutes; measured in the first month (MA-166); Xcode Cloud's 25 free hours a month, which come with the Developer Program, are the fallback | The app's gates and its TestFlight uploads |
| Twelve Data | Free Basic tier (8 credits a minute, 800 a day) | US closes, the US macro basket, the earnings calendar, FX fallback, ISIN lookup |
| EODHD | Last resort, only on the admin's approval when no free source can serve a holding. Historian (daily prices, 30+ years, 100,000 calls a day, news feed included): £19.99 a month or £199.90 a year. Fundamentals: £59.99 a month (£599.90 a year). All-in-One: £99.99 a month (£999.90 a year). Prices as shown on 24 Oct 2026 | Dependable London and Frankfurt closes by ISIN; UK funds by ISIN under `.EUFUND`; the Forecaster's ten-year back-fill (`ARCHITECTURE.md` §19.2) |
| yfinance | Free, unofficial | Closes and the fund's `0P…L` NAV when running lean |
| ECB reference rates | Free | GBP, USD, EUR and INR daily fixes (from phase 3, MA-44) |
| BlackRock and iShares product pages | Free | Fund NAV check, holdings files for look-through |
| RSS feeds (BoE, Fed, ECB, FT, Reuters, BlackRock) | Free | News |
| FRED and ALFRED, Bank of England, ECB, ONS | Free | The economy as first published: rates, yields, real yields, inflation, jobs; credit spreads (the Forecaster, phase 17); inflation and wage growth for the Projection's priors (phase 7) |
| US Energy Information Administration (EIA) | Free | Daily Brent and WTI (the Forecaster) |
| GDELT and the geopolitical risk index | Free | World events and their tone by country and theme (the Forecaster) |
| Fund manager pages (BlackRock, Vanguard) | Free | UK fund prices and holdings files when a feed misses a fund |
| AMFI daily NAV file (phase 5) | Free | Every Indian mutual fund's NAV each day, by scheme code and ISIN: the minimal pricing in phase 5 (MA-207), with the history and the other sources in phase 19 (`ARCHITECTURE.md` §22) |
| mfapi.in (phase 19) | Free, community-run | Each Indian scheme's full NAV history; the fallback behind AMFI |
| NSE and BSE bhavcopy (phase 19) | Free for personal use | End-of-day prices for Indian shares and ETFs when yfinance's `.NS`/`.BO` miss |
| RBI database, MOSPI, NSDL (phase 19) | Free | India's rates, yields and inflation as first published; daily foreign portfolio flows |
| Zerodha Kite Connect (phase 19) | ₹500 a month, not chosen | Broker-grade Indian prices and history, only on the admin's approval if the free chain fails |
| Marketaux | About $29 a month, not chosen | Fallback for per-company news sentiment if Claude Haiku's tagging falls short |

---

## 8. Monthly cost, dev and prod

At $1.30 to £1. The AWS free tiers are per account, so `dev` and `prod` share
them; at this traffic (about 6,000 Lambda invocations a month in prod, a few
hundred in dev) the infrastructure is pennies either way. What costs money is
Claude and the data feed, and both scale with how much each environment
actually runs.

| Line | dev | prod, lean | prod, standard | prod, full | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Lambda, Scheduler, DynamoDB, API Gateway, Cognito, SSM, Budgets, APNs, Web Push | £0 | £0 | £0 | £0 | Inside the free tiers; Cognito Essentials is free under 10,000 monthly users; the HTTP API is $1 per million requests; APNs and Web Push are free |
| The stream (SSE) | £0 | £0 | £0 | £0 | Each open stream is a running Lambda: about $0.012 per open hour at 256 MB. One leader tab per browser, the stream closed 60 s after a page is hidden, push instead of a stream when a door is closed, and reserved concurrency of about 20 keep it small: even at about 3 open hours a day for each of 4 members (about 324,000 GB-seconds a month, of the 400,000 free that it shares with the other functions) it stays inside the free tier. Its idle cost is measured in the phase 1 spike (MA-195) and confirmed with Arun before any apply |
| S3, CloudWatch Logs, ECR | £0.10 | £0.10 | £0.20 | £0.20 | A few hundred MB; ECR $0.10 per GB |
| The web app (S3, CloudFront), Route 53 queries, prod's point-in-time recovery and versioning, X-Ray, dashboards, metrics | £0.20 | £0.40 | £0.50 | £0.50 | Mostly inside the free tiers: three dashboards and ten custom metrics are free |
| Claude: briefs, alerts, chat, cards, Saturday review | £1–3 | £7 | £12 | £21 | dev runs the schedule only while testing; tests use recordings |
| Claude: nightly sentiment scoring, via Batches | £0–0.50 | £1.50 | £2.50 | £2.50 | Off in dev by default |
| Claude: factsheet and screenshot extraction | £0.20 | £0.20 | £0.20 | £0.20 | A few documents a month |
| Claude: web search (~60 a month) | £0 | £0.50 | £0.50 | £1 | $10 per 1,000 searches |
| Twelve Data | £0 | £0 | £0 | £0 | Free tier; the same free key in both environments' SSM paths |
| EODHD | £0 | £0 | £20 | £20 | Historian at £19.99 (£16.66 paid yearly); one subscription, shared; dev reads the same feed |
| Domains and certificates | £0 | £0 | £0 | £0 | The zone and the wildcard certificate already exist; four records; ACM is free |
| **Total** | **£2–4** | **£9.70** | **£36** | **£46** | |

Both environments together: about **£12–14 a month lean, £38–40 standard**.
The agents' Claude allowance is the Max 20x plan's $200 monthly credit (about
£154) across both environments ($160 prod, $40 dev by default), each ceiling
moved by the admin; expected use for two members is about $24 to $39
(`ARCHITECTURE.md` §15.1). AWS and other services have their own cap, £50 by
default (§15.2). EODHD is counted only if a free source
fails and the admin approves it. There is no one-off cost and
no reserved commitment;
stopping an environment is `terraform destroy` on it. The one yearly cost
is the Apple Developer Program, $99 (about £76, or £6.35 a month), outside
this table and shared by both apps (MA-162); the macOS minutes the app's CI
uses are measured in the first month (MA-166).

### What moves the number

| Change | Effect per month |
| --- | ---: |
| Another household member (their briefs and chat) | £2–5 |
| Another ETF or fund | about £0.10 |
| A single share with the valuation and earnings cards (EODHD Fundamentals) | £59.99 (£49.99 paid yearly), or £80 more for the All-in-One plan in place of Historian; decide only if a share is added |
| Doubling chat use | £4–8 |
| EODHD on the annual plan | saves about £3 |
| The stream open past the free tier (more members, or longer than about 3 hours a day each) | about $0.012 per open hour (256 MB), about $4.30 a month at the use above |
| Twelve Data's free tier turning out to cover LSE and Xetra | saves the £20 EODHD line until the Forecaster needs it; standard becomes about £16 |
| Heavier use of "Why?" (web search) | about £1 per 100 extra searches |
| The app's CI running past GitHub's free macOS minutes | measured in the first month; Xcode Cloud's 25 free hours a month are the fallback before anything is paid |

### Guard rails

- The Claude ceiling (`ARCHITECTURE.md` §15.1, §15.2): $160 a month in prod and $40 in dev, the plan's $200 credit, with every step, guard and share a setting the admin changes in the Admin center or, from phase 18, the admin's chat; each agent metered against its share (§20.7); every call metered from the API's usage counts and checked before it is made; a message at 70%, savers at 85%, essentials only at 95%, Claude off at 100% with every card falling back to its template; no member past 60% of it, no day past three times the daily average, no run past eight model calls.
- Anthropic Console: one workspace per environment in the organisation linked to the plan, each with a spend limit that hard-stops its key ($160 prod, $40 dev); the Max 20x plan's $200 credit pays for both, with no payment method and auto-reload off, so the credit is the last stop.
- AWS and others, £50 a month across both environments by default: the app meters it daily from Cost Explorer, alerts at 50%, 80%, 100% and on the forecast, and pauses dev's schedules at 80% and non-essential prod jobs at 100% (never the brief, alerts or chat); AWS Budgets at £75 is the Terraform backstop; paid data feeds count against the cap.
- Alerts to the Admin center's Alerts page (in the app and the web app), push and email (SNS, free up to 1,000 a month), routed by a matrix the admin sets, with quiet hours and cooldowns.
- `/pause` stops everything that speaks or scores.
- The figures are from published free tiers and list prices, not a bill; the
  first month of prod gives the real number.
