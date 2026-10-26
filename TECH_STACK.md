# MyPaisa Agent — Tech stack and running cost

The stack as designed in `ARCHITECTURE.md`, by layer, and what it costs to run
as two environments (`dev` and `prod`) in the wealth tracker's AWS account.
Versions are pinned in `pyproject.toml` and `uv.lock` once phase 1 lands; until
then "current" means the latest stable release at the time of writing
(23 Oct 2026).

Status: design. Nothing is built. The architecture is drawn in Lucid, seven
AWS views and a sequence, linked and embedded in `ARCHITECTURE.md`
(24 Oct 2026, MA-141). On 25 Oct 2026 (MA-161) the front end became two
doors: one native SwiftUI app for iPhone and iPad, with the chat, and the
read-only web app in a browser, a PWA for the dashboard and the Admin
center. The Telegram bot left the plan. §2 holds the app's stack and §3 the
web app's.

---

## 1. Application (Python)

| Piece | Choice | Why |
| --- | --- | --- |
| Runtime | Python 3.14 on AWS Lambda, one arm64 container image; handlers `api` (the chat API and the dashboard's reads, for the app and the web app), `live` (the WebSocket connections), `agent`, `sender`, `worker` (running the ingest, engine, news, score, docs and brief jobs by type), the authorizer and the Cognito custom-auth triggers | pandas, numpy and pyarrow exceed the zip limit; Graviton is cheaper; one image means one build |
| Packaging | `uv`, `pyproject.toml`, `uv.lock` | Fast, reproducible installs in CI and in the image |
| Models and validation | pydantic v2 | Tool inputs, the chat API's requests, every registry item, and every card, whose versioned JSON Schema the app's types are generated from (MA-174), with `schema_version` |
| Data maths | pandas, numpy, pyarrow | The engine ported from the Agentic Trading Desk; parquet history in S3 |
| The Forecaster (phase 11, later) | DuckDB over the Parquet lake; scikit-learn, LightGBM, a regime model (hidden Markov) and a volatility model (`arch`); conformal intervals; SHAP for the main drivers | A second engine beside the rules engine (`ARCHITECTURE.md` §19); small data, so it runs in Lambda |
| Calendars and FX | `exchange_calendars`; ECB reference rates for USD, EUR and INR | XLON, XETR, XNYS sessions and holidays; the clock-change weeks; GBP or INR per member |
| HTTP | httpx, with HTTP/2 (`httpx[http2]`) for Apple push | ECB, EODHD, Twelve Data, RSS, product pages; APNs from the `sender` |
| Price feeds | One `PriceSource` contract; a plugin per feed (yfinance, Twelve Data, EODHD, issuer pages, FT, proxy, screenshot); the chain per kind in each environment's Terraform root (`infra/dev`, `infra/prod`), a `.env` for local | yfinance by default and for local development, no key; EODHD by configuration and a key in SSM; every plugin passes the same contract tests on recorded responses |
| News | feedparser, trafilatura | RSS parsing and article text extraction |
| Charts | None on the server | Each card and screen carries its series from the engine; the app draws it in Swift Charts and the web app in lightweight-charts, both in the house style (MA-56, MA-58). Nothing server-side draws a PNG, so matplotlib is not in the image |
| Claude | The `anthropic` Python SDK against the Anthropic API; key in SSM, read once per cold start; the key belongs to a workspace, one per environment, in the Console organisation linked to the Max or Team plan, so the plan's monthly API credit pays for the calls; a spend limit per workspace | Structured outputs, strict tools, prompt caching, PDF and image input, citations, server-side web search and fetch, Message Batches for the nightly scoring |
| Lambda helpers and observability | aws-lambda-powertools (Logger, Tracer, Metrics, idempotency, parameters), boto3; AWS X-Ray | Structured JSON logs with a run id on every line, one trace per run, ten custom metrics; a `RunRecord` per run and an `AuditEvent` per change in DynamoDB, which the Activity and Audit screens read, in the app and the web app |
| The chat API and the live connection | The app posts each message to `/v1/chat/messages` and each tap to `/v1/chat/actions` with a client id, the dedupe key on `updates.fifo`, and gets `202` at once; the `sender` delivers each finished message from `outbox.fifo` to every open connection of the member on the WebSocket API, and by push to each device without one; the agent streams its words while it writes | Nothing depends on a socket staying up: the app asks for everything after its last turn when it opens (MA-30, MA-31) |
| Push | APNs, token-based: a JWT signed with the environment's `.p8` key from SSM, sent over HTTP/2 by the `sender`; interruption levels (a red alert time-sensitive, the rest passive or active as the member chooses); a dead token removed | No certificates to renew; one key per environment (MA-164, MA-170) |
| Identity | Amazon Cognito from day one, one user pool per environment (Essentials): one user per member, with their Apple account, Google account and passkeys linked to it; Sign in with Apple and Google through custom-auth Lambda triggers that check the provider's identity token against its published keys (issuer, audience, expiry, issue time, the api's nonce, no replay); five-minute access tokens sent as a Bearer token, the rotating refresh token in the app's Keychain; in a browser, Sign in with Apple's JS (the environment's Services ID) and Google Identity Services (its Google web client id) through the same exchange, with an `HttpOnly`, `Secure`, `SameSite=Strict` session cookie that page scripts never see (MA-185); one-time invite links that open the app; roles owner / member / viewer | No passwords; one identity however a member arrives; sign out everywhere and pause built in (MA-102, MA-109) |

## 2. The iOS app

| Piece | Choice | Why |
| --- | --- | --- |
| Language and UI | Swift 6 with strict concurrency; SwiftUI; one universal app, **MyPaisa**, for iPhone and iPad on iOS and iPadOS 26 and later, and **MyPaisa Dev** against dev | Liquid Glass and the iOS 26 controls come with the system; one binary lays itself out by size class and width (compact, regular narrow, regular wide), so every iPhone, every iPad window and a foldable fit with no special case |
| Look | MyPaisa DS v1 "Warm ledger" (MA-101) as colour assets (light, dark, increased contrast) generated from `tokens.css` by a script; SF Pro and SF Pro Rounded through Dynamic Type, tabular numerals; SF Symbols; Liquid Glass only on the controls (tab bar, sidebar, toolbars, the composer, chips, menus, sheets), never on content, and carrying labels only; dark tokens tuned so every pair passes the contrast gate at 25% brightness (MA-181) | The app and the design system never drift; the HIG's own materials, used the way it says; clear on a dimmed phone |
| Charts | Swift Charts in the house style (MA-56), drawn from the series in each card; audio graphs through `AXChartDescriptor` | Native, accessible and the same in the chat and on the dashboard; replaces the PNG charts |
| Motion | One motion system with the web app (MA-182): SwiftUI's springs (`.smooth` for content arriving, with a short stagger; `.snappy` for a control answering a touch; `.bouncy` for a success only), glass morphs in a `GlassEffectContainer`, figures as `numericText` transitions, a row zooming into its screen, charts drawing in, haptics; under Reduce Motion a short cross-fade or nothing | Every component and chart moves the same way, and nothing loops |
| Offline cache | SwiftData with complete file protection: the last Home, holdings and conversation, shown with their time | A lost signal shows the last figures as old, never as new, and keeps what is typed (MA-173) |
| Sign-in | AuthenticationServices: Sign in with Apple (`ASAuthorizationAppleIDProvider`) and passkeys; Google Sign-In for iOS (Google's SDK, PKCE); tokens in the Keychain, this device only, after first unlock | Apple's and Google's own buttons, no password; the second check is a fresh, server-verified assertion: Sign in with Apple or a passkey under Face ID, or Google again for a member who signs in only with Google (MA-76, MA-168) |
| App lock | LocalAuthentication: Face ID or the passcode on open, if the member turns it on | A local comfort, never the server's second check (MA-171) |
| Notifications | UserNotifications, with the push token registered after sign-in; no amount on the Lock Screen unless the member turns it on, never with privacy mode on | MA-170 |
| Attachments | VisionKit (document scan), PhotosUI, the Files picker; Quick Look to open a file from the audit log | A factsheet or a screenshot goes in without leaving the chat (MA-37, MA-149) |
| Project | XcodeGen (`ios/project.yml`); Swift packages `MyPaisaKit` (models, the api client, card decoding, the Keychain, the cache) and `MyPaisaUI` (the design system); two configurations, Dev and Prod, chosen by scheme | The project file is generated, so it never conflicts in a merge (MA-165) |
| Distribution | TestFlight internal testing for MyPaisa Dev and MyPaisa; no App Review for internal builds; a build lasts 90 days, so a prod build goes out at least every 60 | MA-167 |
| Beyond the chat (phase 14, later) | WidgetKit, App Intents, a share extension, ActivityKit | MA-175 |

## 3. The web app

| Piece | Choice | Why |
| --- | --- | --- |
| Pages | Home, a holding, Overlap, Scorecard, Audit and Files, Activity, and the owner's Admin center; read-only, no chat: every change is made in the app | The same read-only dashboard for a laptop, an iPad or a phone without the app (MA-183, MA-184) |
| Build | One static app in `web/`: HTML, CSS and JS, no framework; MyPaisa DS v1 "Warm ledger" `tokens.css` and its adaptive shell (two columns at laptop width) | The browser boards in the MyPaisa app v1 Claude Design project are its one spec, picked before MA-161, with the sign-in page redrawn |
| Charts | lightweight-charts (TradingView's open-source charting library), in the house style, from the same series as the app's Swift Charts | Interactive charts without a framework; a holding looks the same at both doors |
| Motion | The shared motion system (MA-182) in CSS transitions, the Web Animations API and View Transitions; `prefers-reduced-motion` lands every step at once | The same choreography as the app's SwiftUI springs |
| PWA | A manifest with the app icon, standalone display, a service worker that caches the shell and never a figure, an install prompt only after a second visit | Installable without a store; nothing of the household's is left on a shared laptop |
| Sign-in | Sign in with Apple's JS, Google Identity Services and passkeys (WebAuthn); the api sets the session cookie; CORS admits only that environment's console | No token is visible to page scripts (MA-185) |
| Hosting | S3 + CloudFront per environment at `console-dev.mypaisapp.com` and `console.mypaisapp.com`, which also serve the iOS app's `apple-app-site-association` file and the invite page | One site for the web app and the links; the shell is public and holds no data (MA-73) |

## 4. Quality

| Piece | Choice |
| --- | --- |
| Lint and format | ruff; swift-format for `ios/`, from Xcode's toolchain (`.swift-format`) |
| Contrast | `python3 scripts/contrast_check.py`: every colour pair in `tokens.css` and the glass fills, in light and dark, at full brightness and with the screen at 25%: primary text 7:1 (4.5:1 dimmed), secondary and coloured text 4.5:1 (3:1 dimmed), meaningful UI (chart marks, bars on their track) 3:1 (1.8:1 dimmed), what must only be seen (a privacy mask, an empty track) 1.5:1 (1.25:1 dimmed); it fails closed, and fails when a board project's copy of `tokens.css`, `ios.css` or the motion files differs from DS v1's; a jira-flow gate (MA-181) |
| Types | pyright, strict; Swift 6 strict concurrency |
| Tests | pytest; hypothesis for property tests (local + FX = total); moto for AWS; respx for HTTP; recorded Claude responses for rendering; golden files from the desk's self-tests for the engine; coverage threshold 90%. For the app: XCTest for unit and UI tests; swift-snapshot-testing for every screen and card at iPhone and iPad sizes, in light and dark, at Large and AX5 text; `performAccessibilityAudit()` in every screen's UI test (MA-166, MA-181). For the web app: Playwright screenshots of every page at phone and laptop widths in both themes, and the session cookie's refusals (MA-183, MA-185) |
| Hooks | pre-commit running lint, format check, typecheck and tests |
| CI | GitHub Actions, as on smart-clearance: on every pull request ruff, pyright, pytest with moto, `terraform fmt` and `validate`, tflint, a security scan of the Terraform, gitleaks, pip-audit, `jira-key`, and a plan for dev and prod; on a pull request that touches `ios/`, the app's gates on a macOS runner (MA-166), and on one that touches `web/`, the Playwright screenshots; on merge to `main` the image built once, dev applied and smoke-tested, then prod after approval in the GitHub `prod` environment with rollback on a failed smoke test, and the app archived once per configuration: MyPaisa Dev to TestFlight after dev's smoke tests, MyPaisa after the same approval (MA-167); a nightly drift check. Actions pinned to commit SHAs, OIDC only (MA-25, MA-107, MA-108) |
| Definition of done | `PLAN.md` → Definition of done |

## 5. AWS services

| Service | Role |
| --- | --- |
| Lambda | The handlers, from one container image, including `sender` (replies out) and `worker` (background jobs by type); from phase 12 one per agent (`ARCHITECTURE.md` §20) |
| SQS | `updates.fifo` (one lane per member), `outbox.fifo` (one lane per member) and `work`, each with a dead-letter queue and an alarm; retries with backoff and replay (`ARCHITECTURE.md` §21); inside the free tier of a million requests a month, or about a dollar |
| Step Functions, EventBridge bus (phase 12) | The daily run as one state machine with retries; agents publish events on `mypaisa-<env>-events`; inside the free tiers at this volume |
| API Gateway HTTP API | One per environment on its custom domain, `api-dev.mypaisapp.com` and `api.mypaisapp.com`: `/auth/nonce`, `/auth/apple`, `/auth/google`, `/auth/passkey/options` and `/auth/passkey`, `/v1/chat/messages` and `/v1/chat/actions` (`202` at once, deduped by the client id), `/v1/...` read-only JSON, `/v1/admin/...` for the owner; a Bearer token from the app, the `HttpOnly` session cookie from the web app; the authorizer checks the token, the member's status and session epoch on every call (MA-75) |
| API Gateway WebSocket API | One per environment, `live-dev.mypaisapp.com` and `live.mypaisapp.com`: the open app's live connection, checked by the authorizer when it connects; the `sender` posts each finished message, and the agent its streamed words, to every connection of the member; $1 per million messages and $0.25 per million connection minutes, pennies at this traffic |
| Cognito | One user pool per environment, Essentials plan, with no hosted domain: the api's `/auth/*` routes call its API; custom-auth triggers verify Sign in with Apple's and Google's identity tokens and passkey assertions (the console's domain is the relying party); free under 10,000 monthly users |
| EventBridge Scheduler | 07:00, 07:15, 21:00, 21:15 on weekdays; 23:30 daily; 08:00 Saturday; every 3 h for news; all in `Europe/London` |
| DynamoDB | One on-demand table per environment; TTL on chat turns, message dedupe, article scores; a `Device` row per signed-in device with its push token |
| S3 | Prices and FX as parquet; documents: every file a member sends, kept for good (private, encrypted, versioned in prod, no expiry rule), opened from the Audit screen through five-minute presigned links (MA-148, MA-149); articles (90-day rule) |
| ECR | The container image, one repository, lifecycle rule keeping the last ten |
| SSM Parameter Store | Standard tier, one path per environment (`/mypaisa-agent/dev/...`, `/mypaisa-agent/prod/...`): as SecureString the APNs key, the Sign in with Apple key, the Anthropic API key, Twelve Data and EODHD keys; as plain String the Apple team id, bundle id, Services ID and key ids and the Google iOS and web client ids (no client secret is used); values put by hand after the first apply, over a write-only placeholder Terraform made (`value_wo`, MA-159), so no value reaches Terraform's state |
| CloudFront + S3 | The console per environment, `console-dev.mypaisapp.com` and `console.mypaisapp.com`: the web app (a PWA), the iOS app's `apple-app-site-association` file (`applinks` for the invite links, `/join/<token>`, and `webcredentials` for passkeys, whose relying party this domain is) and the invite page; strict security headers; the static shell is public and holds no data (MA-73, MA-183) |
| Route 53 + ACM | The `mypaisapp.com` zone and the `*.mypaisapp.com` certificate already exist, owned by the wealth tracker's Terraform; MyPaisa looks them up and adds its six records, `api`, `live` and `console` for each environment (sign-in has no domain of its own) (MA-97 hands the zone over later) |
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
| Environments | `dev` and `prod`, every component twice (`mypaisa-<env>-<part>`, tagged `env`) in account `545595341442`, `us-east-1`; separate apps (MyPaisa Dev and MyPaisa, each with its own bundle id), Apple keys and Services IDs, Claude keys, Google iOS and web clients, consoles, Cognito pools and SSM paths; separate budgets; dev seeded with synthetic data, prod empty at launch; dev's schedules off unless a variable turns them on (`ARCHITECTURE.md` §18) |
| Developer machine | A Mac: uv, Docker (image builds), AWS CLI with the `agent-toolkit` profile through the dev developer role, the AWS MCP for reading, Terraform, tflint, GitHub CLI, pre-commit; Xcode 26 and XcodeGen for `ios/`; Playwright's Chromium, through uv, for `web/` |
| Local run | The code on the laptop against dev in AWS: MyPaisa Dev from Xcode, on a simulator or a device, against `api-dev`, `live-dev` and the dev Cognito pool (MA-144), and the web app from `localhost` against `api-dev`; tests never reach AWS or the Anthropic API |
| Secrets | Never in files, chat, logs or Terraform state; put by hand into each environment's SSM path, over a parameter Terraform made with a write-only placeholder (`value_wo`, never `value`, MA-159); CI holds no AWS keys |
| Diagrams and design pages | Lucidchart, AWS 2024 shapes: `docs/design/lucid/gen_aws_architecture.py` writes the Standard Import JSON for the seven views, and the PNG exports sit beside it; the explainer pages (MyPaisa Agent Journey, MyPaisa Market Agent) are single HTML files in `docs/design/`, published as claude.ai artifacts, in MyPaisa DS v1 "Warm ledger" (MA-101) with the crimson alert of MA-102, and updated for the app in MA-161; the app's boards are in the MyPaisa iOS v1 Claude Design project, mirrored into `docs/design/ios-v1/`, and the web app's browser boards in MyPaisa app v1 (`docs/design/app-v1/`); every board moves with the shared `motion.css` and `motion.js` (MA-182) |

## 7. Services outside AWS

| Service | Plan | Used for |
| --- | --- | --- |
| Anthropic API | Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens; Batches at half price; web search $10 per 1,000; paid from the Max 20x plan's monthly API credit ($200) through the linked Console organisation, with a spend limit per workspace ($160 prod, $40 dev, the hard caps behind the ceilings); no payment method, auto-reload off | Every model call, document extraction, web search and fetch, the nightly scoring |
| Apple Developer Program | $99 a year (about £76), joined after Arun's yes on MA-162 | Sign in with Apple (in the app, and in a browser through a Services ID per environment), push (APNs, free), TestFlight, the two app ids and App Store Connect |
| Google Sign-In for iOS and Google Identity Services | Free | Sign in with Google in the app and in the web app; an iOS client and a web client per environment, their ids (no secret used) in that environment's SSM path; the token verified in Cognito's custom-auth trigger (MA-143) |
| GitHub Actions macOS runners | macOS minutes count ten to one against the account's free minutes; measured in the first month (MA-166); Xcode Cloud's 25 free hours a month, which come with the Developer Program, are the fallback | The app's gates and its TestFlight uploads |
| Twelve Data | Free Basic tier (8 credits a minute, 800 a day) | US closes, the US macro basket, the earnings calendar, FX fallback, ISIN lookup |
| EODHD | Last resort, only on the admin's approval when no free source can serve a holding. Historian (daily prices, 30+ years, 100,000 calls a day, news feed included): £19.99 a month or £199.90 a year. Fundamentals: £59.99 a month (£599.90 a year). All-in-One: £99.99 a month (£999.90 a year). Prices as shown on 24 Oct 2026 | Dependable London and Frankfurt closes by ISIN; UK funds by ISIN under `.EUFUND`; the Forecaster's ten-year back-fill (`ARCHITECTURE.md` §19.2) |
| yfinance | Free, unofficial | Closes and the fund's `0P…L` NAV when running lean |
| ECB reference rates | Free | GBP, USD, EUR daily fixes |
| BlackRock and iShares product pages | Free | Fund NAV check, holdings files for look-through |
| RSS feeds (BoE, Fed, ECB, FT, Reuters, BlackRock) | Free | News |
| FRED and ALFRED, Bank of England, ECB, ONS | Free | The economy as first published: rates, yields, real yields, inflation, jobs; credit spreads (the Forecaster, phase 11) |
| US Energy Information Administration (EIA) | Free | Daily Brent and WTI (the Forecaster) |
| GDELT and the geopolitical risk index | Free | World events and their tone by country and theme (the Forecaster) |
| Fund manager pages (BlackRock, Vanguard) | Free | UK fund prices and holdings files when a feed misses a fund |
| AMFI daily NAV file (phase 13) | Free | Every Indian mutual fund's NAV each day, by scheme code and ISIN (`ARCHITECTURE.md` §22) |
| mfapi.in (phase 13) | Free, community-run | Each Indian scheme's full NAV history; the fallback behind AMFI |
| NSE and BSE bhavcopy (phase 13) | Free for personal use | End-of-day prices for Indian shares and ETFs when yfinance's `.NS`/`.BO` miss |
| RBI database, MOSPI, NSDL (phase 13) | Free | India's rates, yields and inflation as first published; daily foreign portfolio flows |
| Zerodha Kite Connect (phase 13) | ₹500 a month, not chosen | Broker-grade Indian prices and history, only on the admin's approval if the free chain fails |
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
| Lambda, Scheduler, DynamoDB, API Gateway (HTTP and WebSocket), Cognito, SSM, Budgets, APNs | £0 | £0 | £0 | £0 | Inside the free tiers; Cognito Essentials is free under 10,000 monthly users; the HTTP API is $1 per million requests, the WebSocket API $1 per million messages and $0.25 per million connection minutes; APNs is free |
| S3, CloudWatch Logs, ECR | £0.10 | £0.10 | £0.20 | £0.20 | A few hundred MB; ECR $0.10 per GB |
| The console (S3, CloudFront), Route 53 queries, prod's point-in-time recovery and versioning, X-Ray, dashboards, metrics | £0.20 | £0.40 | £0.50 | £0.50 | Mostly inside the free tiers: three dashboards and ten custom metrics are free |
| Claude: briefs, alerts, chat, cards, Saturday review | £1–3 | £7 | £12 | £21 | dev runs the schedule only while testing; tests use recordings |
| Claude: nightly sentiment scoring, via Batches | £0–0.50 | £1.50 | £2.50 | £2.50 | Off in dev by default |
| Claude: factsheet and screenshot extraction | £0.20 | £0.20 | £0.20 | £0.20 | A few documents a month |
| Claude: web search (~60 a month) | £0 | £0.50 | £0.50 | £1 | $10 per 1,000 searches |
| Twelve Data | £0 | £0 | £0 | £0 | Free tier; the same free key in both environments' SSM paths |
| EODHD | £0 | £0 | £20 | £20 | Historian at £19.99 (£16.66 paid yearly); one subscription, shared; dev reads the same feed |
| Domains and certificates | £0 | £0 | £0 | £0 | The zone and the wildcard certificate already exist; six records; ACM is free |
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
| Twelve Data's free tier turning out to cover LSE and Xetra | saves the £20 EODHD line until the Forecaster needs it; standard becomes about £16 |
| Heavier use of "Why?" (web search) | about £1 per 100 extra searches |
| The app's CI running past GitHub's free macOS minutes | measured in the first month; Xcode Cloud's 25 free hours a month are the fallback before anything is paid |

### Guard rails

- The Claude ceiling (`ARCHITECTURE.md` §15.1, §15.2): $160 a month in prod and $40 in dev, the plan's $200 credit, with every step, guard and share a setting the admin changes in the Admin center or, from phase 12, the admin's chat; each agent metered against its share (§20.7); every call metered from the API's usage counts and checked before it is made; a message at 70%, savers at 85%, essentials only at 95%, Claude off at 100% with every card falling back to its template; no member past 60% of it, no day past three times the daily average, no run past eight model calls.
- Anthropic Console: one workspace per environment in the organisation linked to the plan, each with a spend limit that hard-stops its key ($160 prod, $40 dev); the Max 20x plan's $200 credit pays for both, with no payment method and auto-reload off, so the credit is the last stop.
- AWS and others, £50 a month across both environments by default: the app meters it daily from Cost Explorer, alerts at 50%, 80%, 100% and on the forecast, and pauses dev's schedules at 80% and non-essential prod jobs at 100% (never the brief, alerts or chat); AWS Budgets at £75 is the Terraform backstop; paid data feeds count against the cap.
- Alerts to the Admin center's Alerts page (in the app and the web app), push and email (SNS, free up to 1,000 a month), routed by a matrix the admin sets, with quiet hours and cooldowns.
- `/pause` stops everything that speaks or scores.
- The figures are from published free tiers and list prices, not a bill; the
  first month of prod gives the real number.
