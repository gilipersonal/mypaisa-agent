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
| MA-20 | The dev Telegram bot exists, with its token in SSM and the MyPaisa picture | To Do | §14, §18.1 | picked | Logo.dc.html: 1c Telegram avatar |
| MA-21 | Claude API access is paid from the plan, with dev and prod workspaces and spend limits | To Do | §15.1, §18.1 | none |  |
| MA-22 | A free Twelve Data key is in SSM for the US lines and the FX fallback | To Do | §5.1 | none |  |
| MA-23 | Each Monzo fund's factsheet and a valuation screenshot are ready to send to the bot | To Do | §4.2 | none |  |
| MA-24 | The Python project skeleton exists with its gates and the working rules | To Do | §13, §16 | none |  |
| MA-25 | CI runs every gate, scan and Terraform plan on every pull request, the way smart-clearance does | To Do | §18.4 | none |  |
| MA-26 | Terraform builds dev and prod as two isolated environments in one account, applied only from CI through OIDC | To Do | §18.1, §18.4 | none |  |
| MA-106 | The architecture records two environments, the domains, Cognito sign-in and Terraform-only delivery | Done | §4.5, §9.3, §12, §13, §14, §15, §16 | none |  |
| MA-107 | Releases go from one build to dev, then to prod after Arun approves, with smoke tests and automatic rollback | To Do | §18.4, §20.5 | none |  |
| MA-108 | A nightly check reports any prod change made outside Terraform | To Do | §18.4, §20.5 | none |  |
| MA-112 | The architecture records the $100 Claude budget for prod, its ceiling ladder and the chat-memory rules | Done | §4.5, §8, §9.3, §10, §12, §15, §16, §17, §18 | none |  |
| MA-138 | The architecture records the queues, retries and replay that keep messages and jobs from being lost | Done | §13, §16, §20.5, §21 | none |  |
| MA-141 | The architecture is drawn in Lucid with AWS shapes, the plan and stack documents agree with it, and two explainer pages walk through every flow | Done | §3, §4.2 | none |  |
| MA-142 | The household's prod bot and prod's Twelve Data key exist, each in prod's SSM path beside dev's | To Do | §18.1 | picked | Logo.dc.html: 1c Telegram avatar |
| MA-143 | Each environment has its own Google sign-in client, with its id and secret in SSM, before Cognito is built | To Do | §17, §18.1, §18.3 | none |  |
| MA-150 | The architecture and plan record Indian markets as phase 13 and keep every file a member sends, viewable from the audit log | Done | §4.1, §4.6, §9.3, §14, §16, §22 | none |  |
| MA-155 | Design, plan and Jira stay in sync: every planned screen is drawn, traced to its story, and checked before work starts | In Review |  | none |  |
| MA-157 | The independent review is offered before every merge in this repo, and runs only when Arun says yes | In Review |  | none |  |
| MA-158 | The stories with UI that have no board yet, or only some of their screens, are drawn in Claude Design before any of them starts | To Do |  | none |  |

## Phase 1: Registry and Telegram ingestion (MA-10)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-27 | The holdings registry stores members, accounts, holdings and valuations per household | To Do | §4 | none |  |
| MA-28 | Every record change writes a hash-chained audit row in the same transaction | To Do | §4.6 | none |  |
| MA-29 | Every Lambda run leaves a RunRecord, logs, traces and an error alarm | To Do | §10, §4.1 | none |  |
| MA-30 | A thin Telegram client sends rich messages with an HTML fallback, photos and buttons | To Do | §9 | none |  |
| MA-31 | The webhook accepts only Telegram's signed updates and hands them off once | To Do | §3, §18.2, §21.1 | none |  |
| MA-32 | The first person in the chat owns the household and can invite and remove members | To Do | §4.5 | todo |  |
| MA-33 | Each member has their own accounts, and a joint account can have two owners | To Do | §4.1, §4.5 | none |  |
| MA-34 | Design the Portfolio card and the Confirm card before they are built | To Do | §9.2 | picked | Telegram kit.dc.html: 1 · Portfolio card; Telegram kit.dc.html: 5 · Confirm after a factsheet; Telegram kit images.dc.html: I3 · Portfolio summary tile; Telegram chats.dc.html: b · Adding a holding from a factsheet |
| MA-35 | The bot answers onboarding, /add, /update, /privacy, /pause, /resume and /help | To Do | §2, §8, §9.1 | picked | Telegram kit controls.dc.html: 8 · Reply keyboard and command menu; Telegram chats.dc.html: b · Adding a holding from a factsheet |
| MA-36 | The Portfolio card shows the household and each member's holdings | To Do | §9.2 | picked | Telegram kit.dc.html: 1 · Portfolio card; Telegram kit images.dc.html: I3 · Portfolio summary tile; Telegram kit controls.dc.html: 10 · Wide chat: Telegram Desktop, 720 wide; Telegram kit controls.dc.html: 7 · Inline keyboard patterns |
| MA-37 | Sending a factsheet or a valuation screenshot adds or updates a holding after Confirm | To Do | §4.2, §4.6 | picked | Telegram kit.dc.html: 5 · Confirm after a factsheet; Telegram chats.dc.html: b · Adding a holding from a factsheet |
| MA-38 | "I put £200 into Balanced" becomes a transaction after Confirm | To Do | §4.1, §4.2 | picked | Telegram kit controls.dc.html: 6 · Guided flow: one message, edited in place |
| MA-39 | Guided flows with buttons log a transaction, add a holding, update a valuation or change a setting | To Do | §9.1 | picked | Telegram kit controls.dc.html: 6 · Guided flow: one message, edited in place; Telegram kit controls.dc.html: 7 · Inline keyboard patterns; Telegram chats.dc.html: b · Adding a holding from a factsheet |
| MA-40 | "What changed this week?" lists every change with who and when | To Do | §4.6 | todo |  |
| MA-109 | Each environment has its own Cognito sign-in with Telegram, Google and passkeys | To Do | §4.5, §17, §18.3 | none |  |
| MA-110 | Dev is seeded with a synthetic household built around the real Monzo OEICs | To Do | §18.1 | none |  |
| MA-113 | Every Claude call is metered and nothing runs past the monthly ceiling | To Do | §15.1, §15.2 | none |  |
| MA-139 | Each member's messages travel through ordered queues, in and out, are retried with backoff and are never lost | To Do | §21 | none |  |
| MA-140 | Background jobs run from a work queue with retries, and every failure lands in a dead-letter queue that alerts and can be replayed | To Do | §21 | none |  |
| MA-144 | Telegram reaches each environment through api(-dev).mypaisapp.com, and the dev bot runs by long polling on the laptop | To Do | §18.1, §18.2 | none |  |
| MA-148 | Every file and image a member sends is kept in S3 for good, with a Document row and an audit entry that point to it | To Do | §4.1, §4.6, §14 | none |  |
| MA-156 | A transaction can be typed in any currency, and the bot checks it against the holding's own currency and puts a mismatch right before Confirm | To Do | §4.1, §4.7, §5.3, §22.3 | planned | Currency check.dc.html: Telegram · Currency check; Currency check.dc.html: Telegram · Pounds that arrived; Currency check.dc.html: Telegram · ECB rate estimate; Currency check.dc.html: Telegram · No currency named; Currency check.dc.html: Telegram · A rupee holding instead; Currency check.dc.html: Telegram · Currency check, privacy on |

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
| MA-55 | Design the morning brief, evening wrap and alert cards | To Do | §9.2 | picked | Telegram kit.dc.html: 3 · Morning brief and evening wrap; Telegram kit.dc.html: 4 · Alerts; Telegram chats.dc.html: a · Friday’s wrap, then Monday morning: brief, stance, why; Telegram chats.dc.html: c · A red alert after the US close |
| MA-56 | Design the chart house style shared by the chat and the web app | To Do | §9.1, §9.3 | picked | Telegram kit images.dc.html: I1 · Holding history chart; Telegram kit images.dc.html: I2 · Portfolio curve with past stances; Telegram kit images.dc.html: I3 · Portfolio summary tile; Components 2.dc.html: 11 · Charts and tracks |
| MA-57 | The morning brief and evening wrap arrive as cards, with a Technical section and glossary | To Do | §9.2, §11 | picked | Telegram kit.dc.html: 3 · Morning brief and evening wrap; Telegram kit.dc.html: 2 · Stance card; Telegram kit controls.dc.html: 9 · Glossary answer; Telegram chats.dc.html: a · Friday’s wrap, then Monday morning: brief, stance, why |
| MA-58 | Charts in the house style are sent with each card | To Do | §9.2 | picked | Telegram kit images.dc.html: I1 · Holding history chart; Telegram kit images.dc.html: I2 · Portfolio curve with past stances; Telegram kit images.dc.html: I3 · Portfolio summary tile |
| MA-59 | Alerts come in tiers, respect quiet hours and never repeat within their cooldown | To Do | §11 | picked | Telegram kit.dc.html: 4 · Alerts; Telegram chats.dc.html: c · A red alert after the US close |
| MA-60 | Tapping "I acted" records a decision the Saturday review can check | To Do | §9.2, §11 | picked | Telegram chats.dc.html: c · A red alert after the US close |
| MA-61 | A dead man's switch and the error alarms tell the chat when a job did not run | To Do | §10 | todo |  |
| MA-114 | As spend nears the ceiling, the bot steps down to cheaper ways of working before it stops | To Do | §15.1 | planned | Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Spend · Move the ceiling, the consequences; Telegram admin.dc.html: Telegram · Spend steps |

## Phase 4: Chat, research cards, scenarios (MA-13)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-62 | You can ask the bot anything about your holdings and it answers from its tools | To Do | §8 | picked | Telegram chats.dc.html: a · Friday’s wrap, then Monday morning: brief, stance, why; Telegram kit controls.dc.html: 8 · Reply keyboard and command menu |
| MA-63 | Design the research cards: stance, holding profile, overlap, fund vs benchmark, bear vs bull, scenario | To Do | §7, §9.2 | picked | Telegram kit.dc.html: 2 · Stance card |
| MA-64 | The stance and holding-profile cards explain each holding and what would change the view | To Do | §7, §9.2 | picked | Telegram kit.dc.html: 2 · Stance card; Telegram chats.dc.html: a · Friday’s wrap, then Monday morning: brief, stance, why |
| MA-65 | The overlap review and fund-vs-benchmark cards show what your funds share and how they compare | To Do | §7, §5.2 | todo |  |
| MA-66 | Bear vs bull argues both sides in two calls and a judge, bounded to one round | To Do | §7, §8 | todo |  |
| MA-67 | "What if the pound falls 10%?" gets a scenario card from the look-through exposure | To Do | §2, §9.2, §5.2 | todo |  |
| MA-68 | The bot searches the web for sources and never follows instructions it finds there | To Do | §8, §14 | none |  |
| MA-69 | "Stop pinging me under 2%" sets a preference after Confirm | To Do | §2, §4.6 | todo |  |
| MA-115 | The chat sends Claude only the current conversation, kept short, with notes on recent ones | To Do | §8 | none |  |

## Phase 5: The web app: dashboard, audit log, activity (read-only, behind login) (MA-14)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-70 | Design the browser boards: Overview, a holding, Overlap, Scorecard and the login page at laptop width | To Do | §9.3 | picked | Browser.dc.html: Browser · Overview; Browser.dc.html: Browser · A holding (NASDAQ 100); Browser.dc.html: Browser · Overlap; Browser.dc.html: Browser · Track record; Browser 2.dc.html: Browser · Login; Responsive.dc.html: Responsive · one Overview, five widths |
| MA-71 | Design the Audit and Activity pages on both sets of boards | To Do | §9.3, §10 | picked | Browser 2.dc.html: Browser · Activity; Browser 2.dc.html: Browser · Audit; Mini App.dc.html: Mini App · Activity (pushed from More); Mini App.dc.html: Mini App · Audit (pushed from More) |
| MA-72 | The Google sign-in client, the bot's web domain and two-step verification are set up | To Do | §4.5, §18.3 | none |  |
| MA-73 | The web app is hosted on its own S3 and CloudFront per environment, with security headers | To Do | §9.3, §18.2 | none |  |
| MA-74 | A read-only api Lambda serves each member only what they may see | To Do | §4.5, §9.3 | none |  |
| MA-75 | The Mini App signs a member in from Telegram through Cognito, and the api checks the session on every request | To Do | §4.5, §9.3 | none |  |
| MA-76 | In a browser a member signs in with Telegram, Google or a passkey through Cognito, with no password | To Do | §4.5, §9.3 | picked | Browser 2.dc.html: Browser · Login |
| MA-77 | A member links their Google account to their Cognito identity with a six-digit code sent from their own phone | To Do | §4.5 | todo |  |
| MA-78 | Overview, a holding, Overlap and Scorecard work in the Mini App and in the browser | To Do | §9.3 | picked | Mini App.dc.html: Mini App · Overview; Mini App.dc.html: Mini App · Overview · scrolled; Mini App.dc.html: Mini App · Overview · privacy on; Mini App.dc.html: Mini App · Holdings; Mini App.dc.html: Mini App · A holding (pushed from Holdings); Mini App.dc.html: Mini App · A holding · scrolled; Mini App.dc.html: Mini App · Why? sheet; Mini App.dc.html: Mini App · Overlap; Mini App.dc.html: Mini App · Track record; Mini App.dc.html: Mini App · More; Browser.dc.html: Browser · Overview; Browser.dc.html: Browser · A holding (NASDAQ 100); Browser.dc.html: Browser · Overlap; Browser.dc.html: Browser · Track record; Responsive.dc.html: Responsive · one Overview, five widths; Prototype.dc.html: Prototype phone |
| MA-79 | The Audit and Activity pages show every change and every run, with what it cost | To Do | §4.6, §9.3, §10 | picked | Browser 2.dc.html: Browser · Activity; Browser 2.dc.html: Browser · Audit; Mini App.dc.html: Mini App · Activity (pushed from More); Mini App.dc.html: Mini App · Audit (pushed from More) |
| MA-80 | The Portfolio card opens the Mini App, and /web sends the laptop address | To Do | §9.1, §9.3, §18.2 | picked | Telegram kit.dc.html: 1 · Portfolio card; Telegram kit controls.dc.html: 7 · Inline keyboard patterns |
| MA-101 | A new MyPaisa design system, after Monzo's warmth and Apple's HIG, with the dashboard, Mini App and Telegram components prototyped | Done | §9.3, §13, §17 | picked | MyPaisa DS v1.dc.html: 1a · Warm ledger; Foundations.dc.html: 1 · Colour; Foundations.dc.html: 2 · Type; Foundations.dc.html: 3 · Space, shape, elevation; Foundations.dc.html: 4 · Layout and size classes; Foundations.dc.html: 5 · Motion; Foundations.dc.html: 6 · Iconography; Foundations.dc.html: 7 · Voice; Components.dc.html: 1 · Buttons; Components.dc.html: 2 · Chips; Components.dc.html: 3 · Segmented control and switch; Components.dc.html: 4 · Grouped rows; Components.dc.html: 5 · Hero card; Components.dc.html: 6 · Summary and stat cards; Components.dc.html: 7 · Privacy mask; Components 2.dc.html: 8 · Navigation; Components 2.dc.html: 9 · Sheet and toast; Components 2.dc.html: 10 · List states; Components 2.dc.html: 11 · Charts and tracks; Telegram kit.dc.html: 0 · Telegram kit: the rules; Telegram kit.dc.html: 1 · Portfolio card; Telegram kit.dc.html: 2 · Stance card; Telegram kit.dc.html: 3 · Morning brief and evening wrap; Telegram kit.dc.html: 4 · Alerts; Telegram kit.dc.html: 5 · Confirm after a factsheet; Telegram kit controls.dc.html: 6 · Guided flow: one message, edited in place; Telegram kit controls.dc.html: 7 · Inline keyboard patterns; Telegram kit controls.dc.html: 8 · Reply keyboard and command menu; Telegram kit controls.dc.html: 9 · Glossary answer; Telegram kit controls.dc.html: 10 · Wide chat: Telegram Desktop, 720 wide; Telegram kit images.dc.html: I1 · Holding history chart; Telegram kit images.dc.html: I2 · Portfolio curve with past stances; Telegram kit images.dc.html: I3 · Portfolio summary tile |
| MA-102 | The owner can sign out any member's Telegram or browser session from the Admin center, and Telegram sessions need a second check | In Progress | §1, §4.5 | picked | Admin center.dc.html: A · People first; Admin center.dc.html: A at 390 · phone browser; Admin center.dc.html: Flow 1 · Fresh check; Admin center.dc.html: Flow 2 · Pause confirmation; Admin center.dc.html: Flow 3 · After the pause; Admin center.dc.html: Flow 4 · This browser; Admin center.dc.html: Flow 5.1 · Pause your own account: the fresh check; Admin center.dc.html: Flow 5.2 · Pause your own account: the warning; Admin center.dc.html: Flow 5.3 · Signed out, paused; Admin center.dc.html: Flow 6 · Admin under More; Telegram second check.dc.html: 1 · Set up the second check, the first time; Telegram second check.dc.html: 2 · Locked after 12 hours; Telegram second check.dc.html: 3 · A change needs the check; Telegram second check.dc.html: 4 · A new device; Telegram second check.dc.html: 5 · Signed out everywhere, and paused |
| MA-103 | MyPaisa has a new mark in Warm ledger that animates once when the app opens | Done | §9.3 | picked | Logo.dc.html: 1c · Watcher; Logo.dc.html: 1c Telegram avatar |
| MA-116 | The owner moves the Claude ceiling up or down in the Admin center | To Do | §15.1, §15.2 | planned | Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Spend · Move the ceiling, the fresh check; Admin center 2.dc.html: Browser · Admin · Spend · Move the ceiling, the consequences; Telegram admin.dc.html: Telegram · Spend steps |
| MA-137 | The admin sets the AWS and Claude caps and their alert thresholds in the Admin center, and alerts reach the web app, Telegram and email | To Do | §15.2 | planned | Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Alerts; Admin center 2.dc.html: Browser · Admin · Alerts · Replayed; Telegram admin.dc.html: Telegram · Failed work alert |
| MA-145 | A failed-work alert carries a Replay button that puts the dead-lettered work back on its queue | To Do | §15.2, §21.3 | planned | Admin center 2.dc.html: Browser · Admin · Alerts; Admin center 2.dc.html: Browser · Admin · Alerts · Replay, the fresh check; Admin center 2.dc.html: Browser · Admin · Alerts · Replayed; Telegram admin.dc.html: Telegram · Failed work alert |
| MA-149 | The Audit page opens the original file behind each change, through a short-lived link only the right member can use | To Do | §4.6, §9.3 | planned | Audit and files.dc.html: Browser · Audit with files; Audit and files.dc.html: Browser · File viewer; Audit and files.dc.html: Browser · Files; Audit and files.dc.html: Mini App · Audit and file; Audit and files.dc.html: Telegram · Source button |

## Phase 6: Track record and calibration (MA-15)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-81 | The forecast grader checks whether the ranges and P(fall greater than 5%) came true | To Do | §6.5 | none |  |
| MA-82 | The stance grader scores every call against doing nothing, with a reliability table | To Do | §6.4 | none |  |
| MA-83 | Confidence learns from its own track record, recalibrated only after 8 weeks | To Do | §6.4 | none |  |
| MA-84 | /scorecard shows the track record in the chat and on the dashboard | To Do | §6.4, §9.3 | picked | Browser.dc.html: Browser · Track record; Mini App.dc.html: Mini App · Track record |
| MA-85 | The Saturday review on Opus reflects on the last four weeks | To Do | §8, §11 | todo |  |

## Phase 7: News, events, sentiment (shadow) (MA-16)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-86 | The news job collects and de-duplicates articles about what you hold | To Do | §11 | none |  |
| MA-87 | Each article is scored and rolled into a daily sentiment index | To Do | §11 | none |  |
| MA-88 | The event calendar and a sentiment line reach the brief and the chat | To Do | §11 | todo |  |
| MA-89 | Sentiment tilts the cascade by one notch, in shadow, only when the price pillars agree | To Do | §6.3, §11 | none |  |

## Phase 8: Stances go live (MA-17)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-90 | The go-live gate checks in code that stances beat the baseline for 8 weeks running | To Do | §1, §6.4 | none |  |
| MA-91 | Stance chips appear on the Portfolio card and in the brief, and /calls lists them | To Do | §6.3, §9.2 | picked | Telegram kit.dc.html: 1 · Portfolio card; Telegram kit.dc.html: 3 · Morning brief and evening wrap |
| MA-92 | A guardrail review proves there is no path to "sell everything" | To Do | §1, §6.3 | none |  |

## Phase 9: MyPaisa: the whole wealth tracker on this backend (later, not a priority) (MA-18)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-93 | Property, deposits, policies, pensions and loans can be added and updated through the bot | To Do | §12 | todo |  |
| MA-94 | Wealth maths: XIRR to the penny, deposit accrual, loan schedules and a daily net worth | To Do | §6.6 | none |  |
| MA-95 | Design and build the Overview, Assets and Debts screens for the whole household | To Do | §12, §9.3 | todo |  |
| MA-96 | Forecast and budget: a thirty-year projection and a monthly budget set by chat | To Do | §6.6, §12 | todo |  |
| MA-97 | Reports and exports replace the old wealth tracker, which is then retired | To Do | §17, §18.2 | todo |  |
| MA-104 | Any question about the household's money gets an answer from a read-only SQL copy of the ledger | To Do | §19.2 | none |  |
| MA-105 | The old wealth tracker's holdings and debts come into MyPaisa once, checked by the owner | To Do | §18.5 | todo |  |
| MA-111 | The owner fills prod's history from an Excel workbook sent to the bot | To Do | §12, §18.5, §22.2, §22.5 | todo |  |

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
| MA-124 | F6: the Forecaster's view appears beside the rules engine in Telegram and the web app | To Do | §19.7 | planned | Forecast.dc.html: Browser · Holding · Forecast; Forecast.dc.html: Browser · Holding · Forecast · UK fund; Forecast.dc.html: Mini App · Holding · Forecast; Forecast.dc.html: Telegram · Side-by-side card; Forecast.dc.html: Browser · Forecaster · Proof |
| MA-125 | F7: monthly money and rebalancing are steered by risk to cut deep falls while growing steadily | To Do | §19.5 | planned | Forecast.dc.html: Telegram · First of the month split |
| MA-126 | The Forecaster's data sources, their prices and the news-to-holdings matching are written down | Done | §5.1, §15, §19, §19.2, §19.3 | none |  |

## Phase 12: The agent team: configured, approved, self-healing, self-learning (later) (MA-127)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-128 | The architecture records the agent team, the settings and approvals, the learning loop, self-healing and the new budgets | Done | §5.1, §6.4, §15, §15.1, §16, §17, §18.1, §19.2, §20 | none |  |
| MA-129 | E1: every behaviour is a versioned setting with bounds, and nothing changes it except through the settings service | To Do | §20.2 | none |  |
| MA-130 | E2: an admin desk in Telegram and the Admin center where agents ask questions and seek approval, and admins give instructions | To Do | §20.3 | planned | Admin center 2.dc.html: Browser · Admin · Approvals; Admin center 2.dc.html: Browser · Admin · Approvals · Approve, the fresh check; Admin center 2.dc.html: Browser · Admin · Approvals · Approved; Telegram admin.dc.html: Telegram · Approval request; Admin center 2.dc.html: Browser · Admin · Settings |
| MA-131 | E3: a data steward keeps prices flowing from free sources, repairs gaps, and asks before adding a paid one | To Do | §5.1, §19.2, §20 | none |  |
| MA-132 | E4: every prediction is stored as made and graded every day against what prices actually did | To Do | §20.4, §20.6 | none |  |
| MA-133 | E5: confidence is recalibrated every day within safe bounds, and rolled back on its own if it gets worse | To Do | §20.4 | none |  |
| MA-134 | E6: challenger models and rule changes run beside the current ones and are promoted only on evidence and the admin's approval | To Do | §20.4 | none |  |
| MA-135 | E7: an ops warden runs the daily pipeline, repairs what it safely can and opens an incident for the admin when it cannot | To Do | §20.5 | planned | Admin center 2.dc.html: Browser · Admin · Agents and incidents; Telegram admin.dc.html: Telegram · Incident |
| MA-136 | E8: each agent has its share of the $200 Claude credit, and AWS and other services stay inside their cap | To Do | §15.2, §20.7 | planned | Admin center 2.dc.html: Browser · Admin · Spend; Admin center 2.dc.html: Browser · Admin · Agents and incidents |
| MA-146 | The ops warden replays dead-lettered work on its own once the cause is healthy, and opens an incident if it fails again | To Do | §20.5, §21.3 | none |  |

## Phase 13: Indian markets and the existing Indian portfolio (later) (MA-147)

| Key | Summary | Status | Architecture | Design | Boards |
| --- | --- | --- | --- | --- | --- |
| MA-151 | IN1: Indian mutual funds, shares and ETFs are priced every day from free sources, with ten years of history | To Do | §5.1, §22 | none |  |
| MA-152 | IN2: The existing Indian portfolio is imported from a CAS statement or a broker export, with every past transaction, after one Confirm | To Do | §18.5, §22 | planned | India.dc.html: Telegram · CAS import |
| MA-153 | IN3: Indian accounts show in INR and GBP, with wrapper-aware suggestions and a tax flag where UK rules differ | To Do | §4.1, §9, §22 | planned | India.dc.html: Mini App · Overview with India; India.dc.html: Browser · Overview with India; India.dc.html: Browser · Holding · Indian fund; India.dc.html: Browser · Holding · NSE share; India.dc.html: Telegram · Brief with India |
| MA-154 | IN4: The engine and the Forecaster read Indian markets through an India basket, Indian news and the RBI's calendar | To Do | §6.2, §19.2, §19.3, §22 | none |  |
