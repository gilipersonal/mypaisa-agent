# MyPaisa Agent — Architecture (v2, the hybrid)

A private analyst for one household's investments, run entirely from a
Telegram chat by someone who is not a finance person. It keeps the record of
what is held and what it is worth, computes what moved and why, takes a stance
with a confidence score, explains it plainly, goes technical on request, asks
before it acts, and grades itself. A read-only web app behind a login shows
the same figures on a laptop, with the audit log of every change and a record
of what the agent did and spent. It runs on AWS in account `545595341442`,
`us-east-1`, with Claude through the Anthropic API. It never trades.

v2 folds in what `docs/RESEARCH.md` found in the Agentic Trading Desk and
Agent Toolbelt: the desk's deterministic indicator and pillar engine and its
discipline, the toolbelt's card shapes and portfolio review, and the layman's
Telegram front end both of them lack. v1 (prices, briefs, alerts, chat, news,
calls on Lambda) stands underneath; sections that have not changed are kept
short.

The design is drawn and explained in these places (24 Oct 2026, MA-141):

- **The architecture, in Lucid**, on AWS 2024 shapes, one Lucid document per
  view. They are private to the account; share them from each document's
  menu. The PNG exports embedded below, the Lucid Standard Import JSON and the
  script that generates it are in `docs/design/lucid/`.

  | View | Lucid document | Drawn in |
  | --- | --- | --- |
  | 1 System overview | [open](https://lucid.app/lucidchart/c67e066b-141a-4b94-a860-b0501c6632ee/edit) | §3 |
  | 2 Environments, domains and delivery | [open](https://lucid.app/lucidchart/60bffe0d-133b-489c-ae02-526a987252fc/edit) | §18 |
  | 3 Identity and sign-in | [open](https://lucid.app/lucidchart/9376b624-efcc-4f56-96a9-9a00e9b8fa24/edit) | §4.5 |
  | 4 Queues, retries and replay | [open](https://lucid.app/lucidchart/3077ebaa-b165-4936-933c-d68109de8544/edit) | §21 |
  | 5 Where the data lives | [open](https://lucid.app/lucidchart/a86198f7-d101-4550-9402-3348f08c5eb5/edit) | §20.6 |
  | 6 The market agent and the learning loop | [open](https://lucid.app/lucidchart/35e7ddc4-3aa4-46bf-b301-dadb0cde0b48/edit) | §19, §22 |
  | 7 The agent team, settings, caps and alerts | [open](https://lucid.app/lucidchart/d8bc9ec7-ef1f-41fd-b372-7b8feea22b1a/edit) | §15.2, §20 |
  | Adding a holding (sequence) | [open](https://lucid.app/lucidchart/06ed33f1-7704-4e57-9d91-baeb317ac271/edit) | §4.2 |

- **[MyPaisa Agent Journey](https://claude.ai/artifact/Mg2VPWVEAdbJPfeivYZ5J7)**:
  twelve flows end to end (invite, sign-in, adding a holding, logging money,
  the morning brief, a red alert, a question, the web app, the Admin center,
  failures and replay, the spend ladder, the first of the month), each across
  the member, Telegram, AWS, Claude and data lanes, with what the member sees,
  the safeguards and the Jira stories that build it.
- **[MyPaisa Market Agent](https://claude.ai/artifact/M1yBdJaBe1FmE7sv1V6wLb)**:
  the market side end to end: free data, the rules engine, news matched to
  holdings, the Forecaster's five models, both engines side by side, the
  daily learning loop, the strategy layer, how it proves itself,
  self-healing and the budgets.
- Earlier pages, kept for reference: the
  [animated architecture](https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx)
  (v3, before the queues and the agent team), the
  [first user journeys](https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam)
  and the [dashboard screens](https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp).

Sources for the pages are in `docs/design/`; both new pages use MyPaisa DS v1,
"Warm ledger" (MA-101), with the crimson alert of MA-102, in light and dark.

Status: design only.

**Destination.** The web app is the future MyPaisa, the household wealth
tracker: assets of every kind (property, deposits, policies, pensions,
equities), debts, budget, a thirty-year forecast with XIRR, reports, in GBP
or INR. All of it read-only; every update comes through the bot. The current
[wealth-tracker](https://github.com/gilipersonal/wealth-tracker) repository
is the reference for those screens until they are rebuilt here with a new
design, and §12 is the road. None of that is a priority before phase 8. The
data model is shaped for it now, so that the ISA built in phase 1 and the
whole household's wealth later are the same records, not a migration.

---

## 1. The two rules, and two more

1. **Claude never produces a number.** Every figure comes from code with
   tests. Claude chooses what to say and how to say it.
2. **The bot cannot trade.** No broker login, no orders. It suggests only
   ISA-safe actions.
3. **The layman sees the summary; the detail is one tap away.** Every message
   has a plain top and a technical underside. Nothing technical is shown
   unasked.
4. **One write path.** Every change to the records, whatever the screen, goes
   through the bot: a card, a Confirm tap, an audit row. The web app, today
   and when it becomes the full MyPaisa, is read-only by construction for the
   household's records. Arun, 24 Oct 2026: "Dashboard will be read only
   (except for admin)". The one exception is the owner's Admin center, which
   acts on the admin's own settings and operations, each behind a fresh check
   and an audit row (§9.3).

---

## 2. What it does, as the user sees it

| You | The bot |
| --- | --- |
| Open the chat for the first time | A three-step setup: base currency, what you hold (send a factsheet or a screenshot, or type it), how often to be told things. You become the household's owner. |
| Send `/invite` | A one-time link. Your wife taps it on her phone; she is a member of the same household, with her own chat, her own accounts and her own preferences |
| Tap **Household** or **Me** on the Portfolio card | The household overview across every member and account, or your own accounts in detail. As owner you can open any member's detail; a member sees their own and the household totals |
| Send a factsheet PDF | Reads it, shows a card: name, ISIN, cost, what it holds, where it invests; you tap Confirm |
| Send a screenshot of your Monzo valuations | Reads the values, matches them to holdings, updates the records, shows a before/after card; you tap Confirm |
| Type "I put £200 into Balanced today" | Logs a contribution, adjusts units, confirms |
| Type "I put ₹20,000 into Balanced" | Balanced is in pounds, so the bot says so and asks for the pounds that arrived, offers the day's ECB rate as an estimate, or a holding in rupees instead; nothing is saved until Confirm (§4.7) |
| Type "I want to log a transaction" | Asks one thing at a time, with buttons: bought or sold, which holding, how much, when; skips whatever you already said; a Confirm card at the end |
| Open the web app on your laptop | Log in with Telegram (a tap in the Telegram app) or with Google (the Gmail account linked to you), no password either way; the same dashboard, plus the audit log of every change and what the agent did and spent; read-only |
| Tap **Portfolio** | One table: each holding, value, day and month change, a stance chip (Add · Hold · Pause · Trim), confidence; a total line in GBP |
| Tap **Today** | The morning brief: what moved, why, anything to do |
| Tap a holding | Its card: value and history chart, stance with confidence and horizon, "Why?", "Technical", "What if?" |
| Tap **Technical** | A collapsed section opens: pillars, indicators, flags, macro regime, data quality, as numbers |
| Ask "should I add to Balanced this month?" | A stance card: ADD / HOLD / PAUSE with confidence, two reasons, what would change it, and the track record of that kind of call |
| Ask "what if the pound falls 10%?" | A scenario card from the look-through currency exposure |
| Tap **I acted** on a card | A decision record; the Saturday review compares it with what the signals said |
| Say "stop pinging me under 2%" | A preference card to confirm; saved |
| `/pause` | Everything stops until `/resume`; the kill switch |

Silence is a feature: about ten messages a week, two with sound at most.

---

## 3. System context

Page 1 of the Lucid architecture ([open](https://lucid.app/lucidchart/c67e066b-141a-4b94-a860-b0501c6632ee/edit)): the household's doors on
the left, the chat path along the top (API Gateway, the webhook, the updates
queue, the agent, the outbox, the sender), the web app and sign-in below it,
the background jobs, the stores, and the failure path to the admin's email.
The other six pages zoom into one part each and are drawn in their sections.

![System overview, Lucid page 1](docs/design/lucid/01-overview.png)

One container image and a handful of handlers: `webhook`, `agent`, `sender`,
`worker` (which runs each background job by its type: ingest, engine, news,
scoring, documents, briefs), `api`, the authorizer and the Cognito triggers.
Nothing waits on anything else directly:
your messages, the bot's replies and every background job travel through SQS
queues that retry them and keep what still fails (§21). The agent Lambda is
the only one that talks to you in the chat. The api Lambda is the only one the web app talks
to, and apart from the owner's admin actions in the Admin center (§9.3: the
security actions, the ceiling and caps, replays, agents' requests and
settings, incidents), each behind a fresh check, it can only read. Dev and prod are two copies of all of this (§18). Every other Lambda produces data they read, and
every one of them writes a `RunRecord` saying what it did (§10).

---

## 4. State: the holdings registry

The user said holdings will change and the system must save all state. The
registry is designed so that adding a new kind of thing adds data, not code.

### 4.1 Entities (DynamoDB, single table)

| Entity | Key fields | Notes |
| --- | --- | --- |
| **Portfolio** (household) | `id`, `name`, `base_ccy`, `created_by`, `budget_tokens_per_day` | The tenant. Every other item's partition key starts with the portfolio id. |
| **Member** | `portfolio_id`, `tg_user_id`, `display_name`, `role` (`owner` · `member` · `viewer`), `share_detail` (let other members see my accounts), `prefs` (thresholds, quiet hours, ping budget, privacy mode, simple/technical), `joined_at`, `invited_by`, `google_sub?`, `google_email?`, `google_linked_at?` | A person, identified by their Telegram account, with a Google account linked to it for the laptop. One chat with the bot per member. |
| **Invite** | `portfolio_id`, `token`, `role`, `created_by`, `expires_at`, `used_by?` | Single use, 24-hour expiry, bound to one portfolio and role. |
| **Account** | `portfolio_id`, `id`, `name`, `category` (`investment` · `cash` · `deposit` · `policy` · `pension` · `property` · `debt`), `type` (`ISA` · `GIA` · `SIPP` · `cash` · `fixed_deposit` · `policy` · `pension` · `property` · `mortgage` · `loan` · `card`), `ccy`, `institution` (`Monzo`, `LIC`, a bank, …), `country`, `owners[]` (member ids; two for a joint account) | A tax wrapper, a pot, a property or a loan belonging to one or two members. Finances are managed here, per member. Phase 1 uses `investment` and `cash`; the other categories wait for §12 but the field exists from day one. |
| **Instrument** | `id`, `kind` (`oeic` · `etf` · `stock` · `bond_etf` · `commodity_etc` · `cash` · later `property` · `deposit` · `policy` · `pension` · `debt`), `name`, `isin`, `sedol?`, `listing?` {MIC, ticker, ccy}, `yahoo_symbol?`, `base_ccy`, `exposure` {regions %, currencies %, asset classes %}, `benchmark?`, `ocf`, `price_sources[]` (ordered chain), `proxy?` (weighted basket), `country?`, `institution?`, `maturity_date?`, `rate?`, `schema_version` | The thing. Identifiers are optional because an OEIC has an ISIN and no ticker, a stock has both, cash has neither, a property has an address and a deposit has a maturity date. |
| **Position** | `account_id`, `instrument_id`, `units`, `ccy` (the currency it is bought and valued in, as the platform shows it), `avg_cost_gbp`, `target_weight?`, `protected` (never suggested for trim), `opened_at` | What is held, inside one member's account. The same instrument may sit in two members' accounts; the household view adds them up. Money logged against it is checked against `ccy` (§4.7). |
| **Valuation** | `instrument_id`, `date`, `price`, `price_ccy`, `fx_to_gbp`, `units`, `value_gbp`, `source` (`nav` · `close` · `proxy` · `user_screenshot` · `user_typed` · `formula`), `provisional` | The time series the wealth tracker reads. User-supplied values are kept alongside computed ones; a gap between them is a signal (wrong units, a fee, a late NAV). |
| **Document** | `document_id`, `kind` (`factsheet` · `kiid` · `annual_report` · `screenshot` · `cas` · `broker_export` · `spreadsheet` · `other`), `s3_key`, `sha256`, `mime`, `bytes`, `original_name`, `sent_by`, `sent_at`, `message_id`, `instrument_id?`, `import_id?`, `as_of`, `extracted` (JSON, with the source line for each figure), `confirmed_by_user` | **One row for every file a member sends, kept in S3 for good** (§4.6, MA-148). The factsheet is the source of look-through until a better feed exists. |
| **Transaction** | `position_id` or `liability_id`, `date`, `type` (`buy` · `sell` · `dividend` · `fee` · `interest` · `rent` · `repayment` · `prepayment` · `rate_change` · `maturity`), `units?`, `amount`, `ccy` (always the position's), `amount_gbp`, `orig_amount?`, `orig_ccy?`, `fx_rate?`, `fx_source?` (`as_credited` · `ecb` · `statement`), `fx_date?` | The dated cashflow ledger. From "I put £200 in", or extracted from a screenshot. XIRR, payoff curves and the forecast are computed from it, so every money movement is recorded with its date from day one. |
| **Liability** | `account_id`, `kind` (`mortgage` · `loan` · `card`), `principal`, `rate`, `term_months`, `started_at`, `emi`, `schedule[]` (computed), `ccy` | A debt: the balance against the original plan, the interest and principal split, the payoff date; its events are Transactions. Later, §12. |
| **NetWorth** | `portfolio_id`, `date`, `assets_gbp`, `debts_gbp`, by member, by category, by currency, by country | Computed daily by the engine from Valuation and Liability; the series the overview and the forecast chart read. Later, §12. |
| **Budget**, **ForecastAssumptions** | per member; per portfolio | Monthly income and planned spend with EMIs and surplus; the growth, contribution and surplus-allocation assumptions the thirty-year projection runs on. Later, §12. |
| **Signal** | `instrument_id`, `date`, indicators, pillars, flags, forecast range, data quality | From the engine. |
| **Stance** (call) | `instrument_id`, `made_at`, `action`, `horizon_days`, `confidence`, `reasons[]`, `invalidated_if[]`, `entry_px`, `state_bucket`, `graded` | Paper-traded and graded. |
| **Forecast** | `instrument_id`, `date`, `horizon_days` (20), `p_up`, `p_fall_5`, `range` {p10, p50, p90}, `mood`, `analogs` {count, recovered}, `events[]`, `drivers[]`, `model_version`, `graded` | One per holding per day from the Forecaster (§19), later; graded like a stance. |
| **Setting**, **ConfigVersion** | `key`, `value`, `schema` (type, range), `auto_band`, `approval` (`auto` · `admin`), `version`, `updated_by` (an admin or an agent), `reason`; one `ConfigVersion` row per change, never edited | Every behaviour the admin controls (§20.2). |
| **ChangeRequest** | `id`, `agent`, `setting` or `action`, `from`, `to`, `why`, `evidence` (S3 key), `cost`, `risk`, `undo`, `urgency`, `status` (`proposed` · `approved` · `rejected` · `expired` · `applied` · `rolled_back`), `decided_by`, `via` (`telegram` · `web`), `expires_at` | An agent's request for an admin's approval (§20.3). |
| **AdminQuestion**, **Incident** | the agent, the question or what happened, what was tried, the options, the answer or decision, timestamps | What agents need from an admin, and what they could not fix themselves (§20.3, §20.5). |
| **ScoreDaily** | `model`, `instrument_id`, `mood`, `date`, the day's graded count, hit rate, Brier score, log loss, range coverage, rolling 30, 90 and 365-day values | The learning loop's daily scoreboard (§20.4); the full outcomes live in S3. |
| **CalibrationMap** | `model`, `version`, `buckets[]` (said vs seen), `fitted_on`, `window`, `status` (`probation` · `live` · `rolled_back`) | The map from raw confidence to calibrated confidence (§20.4). |
| **ModelVersion** | `name`, `version`, `trained_at`, `data_through`, `s3_key`, `walk_forward` {brier, log_loss, vs_base_rate}, `live` {brier, weeks, vs_rules_engine}, `status` (`shadow` · `live` · `off`) | Which Forecaster model made a forecast, how it tested, and whether it may be shown (§19.6). |
| **MacroRegime** | `date`, per-basket composites and regimes | Shared by all instruments. |
| **AlertState**, **Decision**, **ChatTurn** | per member | A member's chat memory, decisions and alert cooldowns are their own. `ChatTurn` is one row per message, holding the model's content blocks exactly as returned, kept ninety days (§8). |
| **BudgetSettings** | `portfolio_id`, `ceiling_usd` (prod $160, dev $40: the Max 20x plan's $200 credit), `steps[]` (70, 85, 95, 100), `daily_guard_x` (3), `run_max_calls` (8), `hard_limit_usd` (the Console workspace limit, typed in to match it), `agent_shares{}` (§20.7), `member_share_pct` (60), `cycle_start_day` (the day the plan's credit renews), `updated_by`, `updated_at` | The Claude ceiling the owner moves in the Admin center; every change is an audit row (§15.1). |
| **AwsSpendMonth**, **AlertRule**, **Alert** | AWS and others: month to date by service and `env`, the forecast, `cap_gbp`, `steps[]`, `actions{}`, `step`; alert routing: type × severity → web, Telegram, email, quiet hours, cooldown; each alert sent, where and when | The AWS meter and caps, and the alert router (§15.2). |
| **SpendMonth** | `portfolio_id`, `cycle` (its start date), `total_usd`, `by_member{}`, `by_feature{}`, `by_agent{}`, `by_model{}`, `by_day{}`, `step` | The running meter for one cycle, added to atomically after every model call and read before every call (§15.1). |
| **SentimentIndex**, **ArticleScore**, **WebhookSeen** | per portfolio or global | |
| **PendingAction** | `member_id`, `kind` (`log_transaction` · `add_holding` · `update_valuation` · `settings` · `confirm`), `step`, `collected` (the answers so far), `message_id`, `expires_at` (24 h) | The state of a guided flow: what the bot is waiting for from this member. The next message or tap resumes it; expiry clears it. |
| **AuditEvent** | `portfolio_id`, `ts`, `seq`, `actor` (a member id, or `system:ingest`, `system:engine`, `system:migration`), `via` (`typed` · `button` · `screenshot` · `factsheet` · `cas` · `broker_export` · `agent_proposal` · `schedule` · `migration`), `document_id?` (the file a change came from), `entity`, `entity_id`, `action` (`create` · `update` · `delete` · `confirm` · `reject`), `before`, `after`, `run_id`, `prev_hash`, `hash` | Append-only, one row per change to the records, written in the same transaction as the change. Hash-chained like the calls ledger, so a missing or edited row shows. See §4.6. |
| **RunRecord** | `run_id`, `function`, `trigger` (`message` · `callback` · `schedule:<name>` · `alarm`), `member_id?`, `started_at`, `finished_at`, `status`, `model_calls[]` (model, input, output and cached tokens, cost, ms), `tool_calls[]` (name, ms, ok, error), `messages_sent`, `outcome`, `error?` | What one run of any Lambda did and cost. 90-day TTL. The web app's Activity page and the cost guard rails read these. See §10. |

Signals and macro regimes are per instrument and shared by everyone who holds
it; stances are per position, because the horizon, the drift from target and
the "holding" flag belong to one member's account.

Every item carries `schema_version`; a migration is a Lambda that rewrites
items of an older version, run once from a script, never by hand.

### 4.2 Adding a holding, from Telegram

Every hop goes through a queue (§21): the update waits in the member's lane,
the document read is a job on the work queue run by the worker, and every
reply goes out through the outbox. The sequence in Lucid:
[open](https://lucid.app/lucidchart/06ed33f1-7704-4e57-9d91-baeb317ac271/edit).

![Adding a holding from Telegram, Lucid sequence](docs/design/lucid/08-add-holding-sequence.png)

Any field Claude is unsure of is shown in amber and asked about. A holding is
never saved without the Confirm tap. The same path handles an ETF (ISIN and
ticker from the factsheet), a share (ticker and exchange), or cash.

### 4.3 Kind profiles

A `kind` is a bundle of defaults, so a new holding of a known kind needs no
code. The profiles live in configuration, versioned with the registry.

| Kind | Price chain | Look-through | Engine | Cascade temperament |
| --- | --- | --- | --- | --- |
| `oeic` (a UK fund such as the Monzo BlackRock ones) | fund NAV chain (§5.1), proxy basket intraday | factsheet, then the product page | all pillars; macro from exposure weights | patient: ADD on steady trend, PAUSE on exhaustion |
| `etf` (UCITS or US-listed) | exchange close (EODHD, Twelve Data, yfinance), issuer NAV as check | issuer's holdings download (daily for iShares) | all pillars; macro from exposure weights | patient |
| `stock` | exchange close | the company itself; sector, country, currency | adds the Valuation pillar and the stock cards | cautious: single-name risk raises the bar for ADD; earnings dates block changes for two sessions |
| `bond_etf` | exchange close | duration, credit quality, currency from the holdings file | trend and momentum downweighted; risk pillar reads duration × rate moves | slow |
| `commodity_etc` (a metal, oil, or a basket) | exchange close; spot price as check | the metal and its pricing currency (usually USD) | no valuation; risk pillar weighted ×2; macro from dollar strength and real yields, not the equity basket | slowest to ADD, quickest to PAUSE; drawdown alerts at a wider band (12%) because 8% is a normal week for silver |
| `cash` | FX only | the currency | none | n/a; it is the thing contributions come from |
| `property`, `deposit`, `policy`, `pension` (later, §12) | none; the last user figure, or a formula (a deposit accrues at its rate to maturity, a policy follows its schedule) | the asset itself: country, currency, institution | no pillars; XIRR from the ledger; maturity and growth-rate panels | n/a; the bot asks for a valuation when one is overdue and announces a maturity before it lands |
| `debt` (`mortgage` · `loan` · `card`; later, §12) | none; the balance from the schedule and the logged events | the lender; currency | no pillars; interest split, payoff date, prepayment what-ifs | n/a; the bot asks when an EMI, a rate change or a preclosure is due |

Adding a kind that is not here (a bond, a gilt held directly, crypto) means
writing a profile and, if needed, a price plugin. Nothing else changes.

### 4.4 Worked example: today's holdings

Everything held through Monzo, in GBP, as it would sit in the registry. Rows
are what the bot would record after the factsheet and screenshot path; figures
marked ~ are examples.

| Instrument | Kind | ISIN | Listing recorded | Price chain | Exposure | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BlackRock MyMap (Monzo "Balanced") | `oeic` | from the factsheet | none (daily NAV) | yfinance `0P…L` → BlackRock page → FT → proxy → screenshot | ~66% shares, ~34% bonds; mostly USD under the hood | the proxy basket comes from its top holdings |
| iShares NASDAQ 100 UCITS ETF (Acc) | `etf` | IE00B53SZB19 | XLON `CNX1` GBP (the USD line is `CNDX`) | EODHD → Twelve Data (US line `QQQ` as a check) → yfinance `CNX1.L` | 100% USD, US large-cap tech, ~50% in the top ten | charge 0.30% |
| iShares Automation & Robotics UCITS ETF (Acc) | `etf` | IE00BYZK4552 | XLON `RBTX` GBP (USD line `RBOT`) | EODHD → yfinance `RBTX.L` | global, roughly equal-weighted small and mid caps; USD, JPY, EUR, TWD | charge 0.40%; overlaps the NASDAQ ETF in a few names (computed, not assumed) |
| iShares Physical Silver ETC | `commodity_etc` | IE00B4NCWG09 | XLON `ISLN` GBP (USD line `SSLN`) | EODHD → yfinance `ISLN.L`; silver spot × GBP/USD as the check | silver, USD-priced | not a fund: a debt security backed by bars in a vault; charge ~0.20% |
| Monzo pot | `cash` | — | — | — | GBP | where contributions come from |

Three things this example teaches the design:

- **The ISIN is shared by the USD and GBP lines**; only the ticker differs.
  The registry stores the listing separately, and the bot asks which line
  when the factsheet does not say (Monzo most likely holds the GBP line).
- **London GBP lines are often quoted in pence (GBX)** by Yahoo and some
  feeds. The price plugin normalises to pounds or every valuation is off by
  100×; a test asserts it.
- **Every holding here is a dollar asset in a sterling wrapper.** One move
  in GBP/USD moves all of them, so the FX line in the brief is a
  portfolio-level item, and the US macro basket matters far more than the
  UK one for this portfolio.

The platform fee Monzo charges on top of each product's own charge is part
of the cost drag in `fund-vs-benchmark`; it is a preference (percentage per
year), set once per account.

### 4.5 Identity, members and views


![Identity and sign-in, Lucid page 3](docs/design/lucid/03-identity.png)

Page 3: the doors in, the Telegram custom auth, Cognito, the session cookie, the authorizer, and the owner's sign-out and pause. [Open it in Lucid](https://lucid.app/lucidchart/9376b624-efcc-4f56-96a9-9a00e9b8fa24/edit).
**There are no passwords.** Telegram authenticates every person who talks to
the bot, and it signs the identity it hands to the Mini App. On a laptop,
Google can vouch for the person instead, through a Google account linked to
the member once, from the chat. "Login" is: which Telegram or Google account
is this, which member is it linked to, and which household is that member in.

**One identity store, on AWS from day one** (Arun, 24 Oct 2026; MA-109). Each
environment has its own Amazon Cognito user pool, `mypaisa-dev-users` and
`mypaisa-prod-users` (Essentials plan, free under 10,000 monthly users), with
one user per member: that member's Telegram id, Google account and passkeys
are all linked to the same Cognito user. There are still no passwords:
password sign-in and self sign-up are off, and a user is created only when
someone joins through `/invite`.

| Where | How the member is identified |
| --- | --- |
| The chat | Every update carries `from.id`, a stable numeric Telegram user id. The webhook already accepts only updates signed by Telegram (secret token); the old single-chat allowlist becomes a `Member` lookup. A known id acts as the member whose Cognito user it is linked to; an unknown id gets silence, and a paused member gets one line and nothing else (MA-102). |
| The Mini App | Telegram signs `initData` (an HMAC over the user and a timestamp, keyed by the bot token). The api's `/auth/telegram` route hands it to Cognito's custom-auth Lambdas, which check the signature in constant time, an age under five minutes and no replay, then issue that member's tokens. Inside Telegram the second check is Face ID or a PIN (MA-102); passkeys belong to browsers. |
| The web app in a browser | Cognito, three ways: the Telegram Login Widget (verified by the same custom-auth Lambdas), Sign in with Google (Cognito's Google provider, through the environment's sign-in domain `auth(-dev).mypaisapp.com`), or a passkey (WebAuthn). A Google account that is not linked to any member is refused, whatever its address. |
| Every door | Access tokens last five minutes and are refreshed by the api, never held by page scripts. Sign out everywhere and pause use Cognito's own calls (`AdminUserGlobalSignOut`, `AdminDisableUser`) together with the member's session epoch, so they take effect on the next request (MA-102). |

**Joining.** The owner sends `/invite` (optionally `/invite viewer`). The bot
replies with a one-time deep link, `t.me/<bot>?start=<token>`, single use,
24-hour expiry, bound to this household and that role. The invitee opens it
on their own phone, becomes a member, and gets the three setup questions. The
owner removes a member with `/members`; a member who changes Telegram account
is simply re-invited. Private chats only: the bot ignores groups.

**Linking a Google account.** Each member links one Google account, from
their own phone, so that both identities are proven by the person who owns
them: on the web, Sign in with Google for an account not yet linked shows a
six-digit code that lasts ten minutes; the member sends `/link <code>` to the
bot from their own Telegram chat; the bot links that Google identity to the
member's Cognito user and stores Google's stable account id (`sub`) and the
address on that member and confirms in both places. The
owner can also link on a member's behalf by address from `/members`, and
unlink from the same place; unlinking logs that account out everywhere.
`sub` is the key, the address is for display, so a renamed Gmail still works
and an address handed to someone else does not. Every link, unlink and web
login is an audit row.

**Roles.**

| Role | Can |
| --- | --- |
| owner | Invite and remove members, change any account or holding, set the household budget and settings, see every member's detail |
| member | Add, change and remove holdings in their own accounts; see the household overview; see their own detail; opt in to sharing their detail with the household |
| viewer | Read the household overview and whatever members share; nothing else |

**Views.** The Portfolio card and the dashboard have a switch: **Household**
(every account, every member, one total) and **Me** (my accounts). The owner,
and any member whose detail is shared, appear as further tabs. A member's
brief covers their own accounts plus one household line; the owner's brief
covers the household with a line per member. Alerts go to whoever owns the
account, and to the owner as well if the owner asks.

**Isolation.** Every item is keyed by the household, every tool call carries
the calling member as a principal, and the registry layer refuses a read or
write outside that member's rights. One DynamoDB table cannot enforce that
with IAM alone, so it is enforced in code and covered by tests ("member A can
never read household B; a member cannot read another member's detail unless
shared"). Each member's chat memory, decisions, preferences and cooldowns are
their own. The monthly Claude ceiling is the household's (§15.1), and no
member may spend more than their share of it (60% by default), so one chatty
member cannot spend the household's allowance.

**Scope.** Two members in one household is personal software. Several
unrelated households using a bot that says "ADD, 64% confidence" starts to
look like investment advice to the public, which is regulated in the UK. The
model supports more households; using it that way is a separate decision
about wording and scope, not a technical one.

### 4.6 The audit log

Every change to the records leaves a row. Not a log line that may or may not
be there, a row in the same DynamoDB transaction as the change, so a change
without its audit row cannot happen. Each row says who (the member, or the
system job), when, through what (a typed sentence, a button, a screenshot, a
factsheet, a proposal from the agent, a schedule), which record, what it was
before and what it is after, and which run made it. Rows are chained by hash,
the same way the stance ledger is, so a deleted or edited row breaks the chain
and the weekly check says so.

What counts as a change: holdings, positions, transactions, accounts,
members and invites, preferences, and every valuation a person supplied. The
nightly computed valuations and signals are a time series, not audit rows;
they are already dated and sourced, and logging each one would bury the rows
that matter.

Who sees what follows the roles in §4.5: a member sees the rows for their own
accounts and for the household-level records; the owner sees every row. The
rows are readable in two places: the Audit page of the web app, with filters
by member, record and date, and from the chat with a question such as "what
changed this week?", which the agent answers through `get_audit`. Rows are
never deleted; at a few hundred a year they cost nothing to keep.

**Every file is kept, and opens from the log** (Arun, 24 Oct 2026: "all
the files and images I send should be stored on S3 and I should be able to
view that in audit logs"). Every file or image a member sends (a factsheet,
a screenshot, a CAS statement, a broker export, a spreadsheet) is copied to
`s3://mypaisa-<env>-documents/<household>/<member>/<yyyy>/<mm>/` before
anything reads it, whatever happens next, with a `Document` row and an audit
row of its own; every change made from it carries its `document_id`
(MA-148). Nothing is deleted after reading: the bucket has no expiry rule,
and prod's is versioned and protected from destruction. On the Audit page a
row made from a file shows its kind, name and size, a thumbnail for an
image, and Open; a Files view lists every file with the changes it fed
(MA-149). Open is a presigned link valid five minutes, given only after the
authorizer checks the role: a member opens their own files, the owner any,
a viewer none; each opening is itself an audit row. In the chat a change
card's Source button sends the original back.

### 4.7 Money in any currency, checked against the holding (MA-156)

Arun, 24 Oct 2026: "On the telegram App, I should be able to add
transactions using Any currency for any fund and chatbot to figure what the
base currency of the holdings, If the holdings are in GBP and I try to invest
INR to GBP holding, chat should be able to correct me."

Every holding has one currency: the one it is bought and valued in, as the
platform shows it (`Position.ccy`). It is read from the factsheet or the
screenshot when the holding is added and shown on that Confirm card, so it is
confirmed once and never guessed again. A fund's own base currency
(`Instrument.base_ccy`, often USD) can differ from the share class a member
holds (GBP); the position's currency is the one that counts here.

| The member types | The bot |
| --- | --- |
| "I put 200 into Balanced" | No currency named: the holding's is assumed, and the Confirm card says "£200, in pounds as Balanced is" |
| "I put £200 into Balanced" | Same currency: the card as in §4.2, then Confirm |
| "I put ₹20,000 into Balanced" | Saves nothing yet. "Balanced is held in pounds (GBP), so it can't take rupees directly; the rupees were changed to pounds on the way." Buttons: **Pounds that arrived** (type it, or send the platform's confirmation), **Use the ECB rate** (an estimate, marked so), **A rupee holding** (listed when there is one), **Cancel** |
| "1.5 lakh into my Nifty 50 index fund" (phase 13) | An INR holding, so ₹1,50,000 with no question; pounds typed against it get the same correction the other way |
| "Which currency is Balanced in?" | "Pounds (GBP), from the factsheet you sent on 3 March" |

- **Reading amounts is code.** A parser reads symbols (£ $ € ₹), codes
  (GBP, USD, EUR, INR and every currency the ECB publishes), words (pounds,
  dollars, euros, rupees, Rs) and Indian number words (lakh, crore). Claude
  only fills the fields when the wording is free; the figure is always the
  member's own, echoed back for Confirm. "$" means US dollars unless the
  member holds another dollar, when the bot asks which.
- **A converted figure is never Claude's.** "Pounds that arrived" records
  the member's figure and keeps the rupee amount and the implied rate beside
  it. "Use the ECB rate" is the engine's conversion at the ECB reference rate
  for that day, or the last one published before it at a weekend or an ECB
  holiday (§5.3), with the rate and its date on the card. The ECB publishes
  each currency against the euro, so pounds to rupees is the engine's cross
  of the two euro rates of that day. It is marked an
  estimate until a statement, a screenshot or the next valuation confirms it.
  The button appears once the daily rates are loaded (MA-44, phase 2);
  before then the bot asks for the amount that arrived.
- **Stored in the holding's currency, with the original kept.** The
  Transaction's `amount` and `ccy` are the position's; `orig_amount`,
  `orig_ccy`, `fx_rate`, `fx_source` and `fx_date` keep what was typed and
  how it became the recorded figure. The audit row (§4.6) shows both, and a
  screenshot or statement it came from is its `document_id`.
- **Every pair, both ways, every door.** The same check runs on a typed
  message, the guided flow, a screenshot, and a CAS or broker line (§22.2)
  whose currency differs from the holding's. Privacy mode hides both amounts.
- **Designed first.** The correction card, its buttons and the Confirm card
  with two currencies are drawn as `Currency check.dc.html` in Claude Design
  and put through design-first when MA-156 starts.

---

## 5. Data layer

### 5.1 Price sources: one plugin per feed, a chain per kind, chosen by configuration

Every feed is a plugin behind one small contract, and which plugins run, in
which order, is configuration per environment. Yahoo Finance (`yfinance`,
free, no key) is the default everywhere and the only feed local development
needs. Switching to EODHD is a setting plus a key in SSM, not a code
change, and it is a last resort: free sources first (yfinance, Twelve Data's
free tier, free websites where their terms allow), EODHD only when the data
steward shows a free source cannot serve a holding and an admin approves
(§20.3).

**The contract.** A plugin implements:

```python
class PriceSource(Protocol):
    name: str                                   # "yfinance" · "eodhd" · "twelvedata" · "issuer_page" · "ft" · "proxy" · "screenshot"
    def supports(self, instrument: Instrument) -> bool: ...
    def daily_bars(self, instrument: Instrument, since: date) -> Bars: ...   # native currency, with source, fetched_at, provisional
    def latest(self, instrument: Instrument) -> Quote | None: ...
    def fx(self, pair: str, since: date) -> Rates | None: ...                 # optional
```

Each plugin owns its own identifiers on the instrument (`identifiers`
holds the Yahoo symbol, the EODHD code, the Twelve Data symbol and the ISIN
side by side), its key in SSM (`/mypaisa-agent/<env>/<plugin>/api_key`),
its rate limit, its GBX-to-GBP normalisation, its freshness rule, and its
recorded fixtures. The ingest job sees only `Bars`, never a vendor shape.
A plugin that is not in any chain is never imported, so a missing key is
not an error.

**Chains by configuration.** The chain per kind lives in
each environment's Terraform root (`infra/dev/terraform.tfvars`,
`infra/prod/terraform.tfvars`) and reaches the Lambdas as one
environment variable, with a per-instrument override in
`Instrument.price_sources[]` for the odd case:

```hcl
# infra/dev/terraform.tfvars (local uses the same shape from a .env file)
price_chains = {
  oeic      = ["yfinance", "issuer_page", "ft", "proxy", "screenshot"]
  lse_etf   = ["yfinance", "twelvedata", "issuer_page", "stale"]
  us_etf    = ["twelvedata", "yfinance", "stale"]
  cash      = ["ecb", "twelvedata"]
}
# infra/prod/terraform.tfvars, once EODHD is chosen: put it first and add its key
#   lse_etf = ["eodhd", "yfinance", "twelvedata", "issuer_page", "stale"]
#   us_etf  = ["twelvedata", "eodhd", "yfinance", "stale"]
```

The first plugin that answers with fresh data wins, and the brief says
which one did. `stale` is the last entry everywhere: the previous close,
labelled, never silently reused.

| Kind | Default chain (local, dev, and prod until switched) | With EODHD | Freshness |
| --- | --- | --- | --- |
| OEIC (Monzo's BlackRock funds) | yfinance on the fund's `0P…L` id · BlackRock UK product page · FT tearsheet · proxy basket · last user screenshot | only if approved: EODHD by ISIN under `.EUFUND` (many UK funds are listed; how far back each fund's history goes is checked with the free key first), then the default chain | NAV once a day, published next morning; proxy intraday, labelled provisional |
| ETF or ETC on LSE / Xetra | yfinance · Twelve Data (free tier, if it serves the exchange) · issuer NAV (iShares publishes daily) · stale | eodhd · yfinance · Twelve Data · issuer NAV · stale | Each exchange close; GBX normalised to GBP |
| ETF or stock on NYSE / Nasdaq | Twelve Data (free tier) · yfinance · stale | twelvedata · eodhd · yfinance · stale | 21:00 UK close |
| Stock on LSE / Xetra | as ETF on LSE / Xetra | as ETF on LSE / Xetra | same |
| Commodity ETC | as its listing, plus the metal's spot price × FX as a sanity check | same | same |
| Cash | ECB, Twelve Data as fallback | same | |

**Proving a plugin.** Every plugin passes the same contract test suite on
recorded responses: the same instrument and date range give the same `Bars`
shape, pounds not pence, the stale rule, idempotence per date, and a clean
failure when the vendor is down. Tests never touch the network; a deliberate
command refreshes the recordings. When two plugins are configured for the
same instrument the ingest job records both, and the Activity page (§9.3)
shows where they disagree (a close more than 0.2% apart, a missing day, a
late correction). That report is how the "free first, EODHD if London
closes prove unreliable" decision of phase 2 is made with numbers rather
than impressions.

Twelve Data's free tier (8 credits a minute, 800 a day) is used for
everything it serves: first in the chain for the US lines, the US macro
basket, the earnings calendar and the FX fallback, and second for London and
Frankfurt closes from day one. Whether the free tier actually returns LSE
and Xetra bars is not known; the chain simply skips a plugin that answers
nothing, and the source-comparison report shows what it served. If it does
serve them, EODHD is unnecessary. The daily credit budget is enforced in the
plugin: the ingest job spends at most 200 a day, so the agent's own calls
(symbol search, the earnings calendar on demand) never run the tier dry.

Input hygiene, from the desk: drop interpolated bars, append today's close only
when the session has traded, mark a series STALE when its last bar is older
than the previous session and exclude it from scoring (the circuit breaker).
Every job is idempotent per date.

### 5.2 Look-through

From the factsheet (and later the product page): asset allocation, top
holdings, regional and currency split. It drives three things: the **proxy
basket** for a fund's intraday read, the **currency split** of each move, and
the **overlap review** across holdings. Refreshed when a new factsheet is
uploaded or monthly from the page.

### 5.3 FX, calendars, time

GBP base; USD, EUR and INR, all published daily by the ECB. Each member can
read figures in GBP or INR; the stored value is always both the native
amount and its GBP equivalent on the day. Money typed in one currency for a
holding in another is checked and converted as in §4.7. Exchange calendars XLON, XETR,
XNYS. All schedules in `Europe/London`.

---

## 6. The analysis engine (deterministic, ported from the desk)

### 6.1 Indicators

EMA 20/50/200 (SMA seed), Wilder RSI-14, MACD 12/26/9 with histogram slope,
TRIX-15 with EMA-9 signal, Bollinger 20/2 with %B, slopes vs 5 bars,
`bars_since_below_ema20`; plus ATR-14, realised volatility (20-day and EWMA)
and its 3-year percentile, drawdown from the 1-year high, 12-1 momentum,
proxy-vs-NAV gap. The desk's known-answer self-tests become golden-file tests
and also run at the start of every engine run; a failing self-test blocks
scoring that day and tells you.

### 6.2 Pillars (−2..+2 each)

| Pillar | Inputs | Source |
| --- | --- | --- |
| Trend | price vs EMA20, EMA20>EMA50, EMA50>EMA200, EMA200 slope; partial components labelled | desk |
| Momentum | RSI zones (45/55), MACD histogram sign, TRIX vs signal | desk |
| Macro | the cross-asset regime of the basket(s) the instrument is exposed to, weighted by look-through; US basket as the desk (RSP/SPY, HYG/LQD, IWM/SPY, SPY/TLT, XLY/XLP, SPY-TLT correlation, 10Y−2Y when available); UK and EU baskets from UCITS equivalents; for a commodity ETC, dollar strength and real yields instead of the equity basket | desk + ours |
| Risk | volatility percentile, drawdown depth, proxy gap, bars present, NAV age | ours |
| Valuation (stocks only, later) | P/E, P/S, FCF yield, EV/EBITDA vs sector; cheap…expensive | toolbelt |

Flags, from the desk: exhaustion, relentless-bearish, rebound, death-cross.

### 6.3 The holder's cascade

The desk's cascade rotates capital; ours accumulates with care. `holding` is
always true for a position and false for a watchlist item.

| Action | When | Framing |
| --- | --- | --- |
| **ADD** | Holding; trend ≥ 0 and momentum ≥ 0, or a rebound with healthy structure after a drawdown; risk not elevated | Make this month's contribution here, or bring it forward |
| **HOLD** | Default for a holding with no triggers | Nothing to do |
| **PAUSE** | Holding; exhaustion ≥ 2 or risk elevated or adverse macro | Keep what you have; delay new money until the next review |
| **TRIM** | Holding; drift above target by more than the band, or relentless-bearish ≥ 3 with a death-cross, and the position is not protected | Rebalance toward target; never "sell everything" |
| **REBALANCE** | Portfolio-level drift beyond the band | Move the next contributions, not the holdings, unless drift is large |
| **WAIT / WATCH** | Not holding; a candidate | No entry trigger yet; the trigger that would change it |

Adverse macro and elevated risk tighten the framing and lower confidence; they
never change the pillar numbers. Sentiment may tilt the action one notch only
when the price pillars do not contradict it. News alone never triggers a red
alert.

### 6.4 Confidence score

`confidence = clamp(0.5 + agreement + persistence + quality + history, 0, 0.95)`

- **agreement**: pillars pointing the same way (+0.05 each, −0.05 each
  against)
- **persistence**: bars the state has held (0 for 1 bar, up to +0.10 for 10+)
- **quality**: −0.10 if partial components, stale or provisional data, or a
  proxy gap over 1%
- **history**: the empirical hit-rate of past stances in the same state
  bucket, once 20 or more exist, pulling the score toward it

Shown as a percentage; below 55% the card says "no clear view". Calibrated
weekly (Brier score, reliability table by bucket); the mapping changes only
after 8 weeks of evidence and the change is logged. From phase 12 the
learning loop grades every day and moves the map daily within small bounds,
with an automatic rollback; changes to the rules themselves still need
evidence and an admin's approval (§20.4).

### 6.5 Forecast ranges

1-month return distribution by volatility-scaled block bootstrap on the
instrument's own history: 10/50/90th percentiles and `P(fall > 5%)`.

### 6.6 Wealth maths (later, §12)

The same rule applies: code computes, Claude explains. For the full MyPaisa
the engine gains a `wealth/` module, deterministic and tested against known
answers:

- **XIRR** on the dated cashflow ledger of a position, an account, a member
  or the household, with the current value as the closing flow: Newton's
  method with a bisection fallback, matched to a spreadsheet's XIRR on
  fixture ledgers to the penny, and the same ledger the tracker's asset page
  shows.
- **Deposits and policies**: accrual at the stated rate to maturity, the
  maturity timeline (next twelve months, open-ended), what a maturing sum
  could do next.
- **Debts**: the EMI, the schedule, the interest and principal split per
  year, the balance curve against the original plan, prepayment and
  preclosure what-ifs.
- **Net worth**: the daily series by member, category, currency and country;
  the crossover of assets over debts.
- **The forecast**: a thirty-year projection from stated assumptions
  (growth per category, contributions, surplus allocation, maturities,
  EMIs ending), month by month, with the assumptions shown beside the curve
  and every change to them an audit row.

---

## 7. Research cards (from the toolbelt, rebuilt for funds)

Every card: a verdict from a fixed enum, a one-liner, evidence, a raw-data
block, `dataSources` with per-source success and `fetchedAt`, `generatedAt`.
Numbers computed, words synthesised, output via structured outputs.

| Card | For | Verdict enum |
| --- | --- | --- |
| `stance` | any holding | ADD · HOLD · PAUSE · TRIM · REBALANCE · WATCH, with confidence and horizon |
| `holding-profile` | fund, ETF | what it is, cost, where it invests, role in the portfolio |
| `overlap-review` | the portfolio | HHI, effective positions, look-through overlap, currency exposure, duration; weakest link; gaps |
| `fund-vs-benchmark` | fund, ETF | on_track · lagging · ahead, with tracking difference and cost drag |
| `bear-vs-bull` | any | bull_wins · slight_bull · too_close · slight_bear · bear_wins, three arguments each with evidence |
| `scenario` | the portfolio | impact of index and FX shocks from look-through |
| `valuation-snapshot`, `earnings-analysis` | stocks only, later | as the toolbelt |

---

## 8. The agent

One Claude tool loop (Sonnet 5.5 for chat and cards, Haiku 5.5 for filters
and scoring, Opus 5.5 for the Saturday review), with strict tools over the
registry, the engine and the cards, through the Anthropic API with the key in
SSM. Prompt caching on the system prompt, the tool list and the card rubrics.
Anthropic's server-side web search and web fetch (with citations) serve the
"Why?" button and the Saturday review; the nightly sentiment scoring goes
through the Message Batches API at half price. Refusal or error falls back to
the plain template.

**It asks before it acts, and asks when it is unsure.** The agent behaves like
a careful assistant rather than a form. When a request is missing something
it needs, it asks for that one thing, with buttons when the answer is from a
short list (which holding, bought or sold, today or yesterday) and a typed
reply otherwise. It never asks for what it can look up, and it skips every
question the sentence already answered: "I put £200 into Balanced today" goes
straight to the Confirm card. Every write is shown before it is saved. A
change that touches several records, such as a rebalance, is first proposed
as a plan with one Confirm, then carried out step by step, each step audited.
It also asks on its own account: on the first of the month whether the usual
contribution went in, after 35 days without a valuation whether a screenshot
is due, and when two members hold the same instrument whether a joint account
is meant. The mechanics are the `ask_user` tool, which ends the turn with a
question and its buttons, and a `PendingAction` row that records what the
bot is waiting for; the next message or tap from that member resumes the
flow, and a day of silence clears it.

**Chat memory: keep it all, send little** (MA-115). Every message is kept,
one `ChatTurn` row each, for ninety days; only the current conversation is
sent to Claude. A conversation ends after thirty minutes of silence or when a
guided flow finishes, but stays open while the bot waits on an `ask_user`
answer (up to the `PendingAction`'s day). A new conversation starts from the
fixed part (system prompt, tools, card rubrics; cached with the one-hour TTL,
since household messages often come more than five minutes apart) and a few
one-line notes on the member's recent conversations, written by Haiku when
each one closed. The notes come after the cached part, so both members share
one cached copy of it. Nothing else from old chats is sent: the agent looks
up what it needs (`get_audit`, `get_portfolio`, `get_stances`), as it never
asks for what it can look up. A conversation that passes about 50,000 tokens
starts afresh from a summary. Re-sending whole histories would cost 7p to 85p
a message after a month and keep growing; this way a message costs about
1.5p to 3p on Sonnet.

**Two rules the loop keeps, from the API as it is now.** History is
append-only: each response's content is stored exactly as returned and an
earlier turn is never edited or trimmed, because the 5.5 models tie their
thinking to the conversation and an edited history is refused on newer
accounts; a conversation is shortened only by starting a new one. And no tool
call is forced: `tool_choice` stays `auto` (forcing one is an error on Sonnet
5.5 and Opus 5.5), tools are `strict: true`, and the prompt says which tool
to use.

**Borrowed patterns:** the bull/bear debate as two calls plus a judge for any
stance above 70% confidence and for the weekly review; a reflection step that
reads the last four weeks of stances and their grades before writing the
review; a per-run self-audit that lists what the bot told you this week so it
does not repeat itself.

**Tools:** `get_portfolio`, `get_holding(id)`, `get_signals(id)`,
`get_history(id, days)`, `get_macro`, `run_scenario`, `get_events`,
`get_sentiment`, `get_stances`, `get_scorecard`, `web_search` and `web_fetch`
(Anthropic's server tools), `extract_document(s3_key, schema)`, `propose_change(entity,
patch)` (saved only after Confirm), `log_decision`, `render_chart(spec)`, `ask_user(question, options[])` (ends
the turn with a question; the answer resumes it through `PendingAction`) and
`get_audit(filter)` (what changed, for "what did I change last week?").

**Guardrails in code, not prompt:** no tool can trade, spend beyond a search
query, delete data, or message anyone but your chat. Protected positions are
filtered before the cascade runs. The monthly Claude ceiling with its
ladder and guards (§15.1), the weekly red budget and quiet hours are enforced
by the agent Lambda. `/pause` sets a flag
every scheduled run checks first.

---

## 9. Telegram front end

### 9.1 Navigation for a layman

- **Reply keyboard**, always visible: `Portfolio` · `Today` · `Ask` · `Settings`.
- **Menu button** with the commands: `/add`, `/update`, `/why`, `/whatif`,
  `/calls`, `/scorecard`, `/technical`, `/privacy`, `/pause`, `/help`; for
  the owner also `/invite` and `/members`.
- **Household and Me** on the Portfolio card: one tap switches between the
  household overview and your own accounts; the owner also gets a tab per
  member.
- **Cards** are rich messages where supported (Bot API 10.1+): a heading, a
  short table, buttons, and a collapsed **Technical details** section. Where
  rich messages are unavailable, the same card is HTML with a `Technical`
  button that edits the message in place.
- **Charts** as PNG (matplotlib, one house style, GBP axis, the stance
  horizon shaded), sent with the card; albums for the portfolio.
- **Glossary on tap**: any term in a technical section (RSI, drawdown, EMA)
  has a one-line explanation behind a button.
- **Two modes**: `simple` (default) and `technical` (every card expanded).
  Switch per message with the button or globally with `/technical`.
- **Guided flows**: logging a transaction, adding a holding, updating a
  valuation and changing a setting each run as a short series of questions
  with buttons, one per message, editing the same message in place so the
  chat stays tidy. Anything already said is skipped. Long lists (many
  holdings) become a short list plus "More" and "Type the name". A flow that
  gets no answer for a day is dropped quietly.

### 9.2 Example cards

```
📊 Portfolio · Thu 23 Oct · £24,110  ▲0.4% today  ▲2.1% month
───────────────────────────────────────────
Balanced (Monzo)    £22,925  ▲0.6%   HOLD   71%
Cash (Monzo pot)     £1,185   —       —
───────────────────────────────────────────
Nothing to do this week. Next review Saturday.
[Today] [Balanced ▸] [Technical ▾] [Ask]
```

```
Balanced (BlackRock MyMap 5) · £22,925
Stance: HOLD · 2 weeks · confidence 71%
Why: steady uptrend; volatility normal; pound moves explain most of
this week's wobble.
Would change if: a 5% fall from here, or UK inflation surprises on Wed.
Your track record on HOLD calls: 14 made, 11 held up.
[Why?] [What if?] [Technical ▾] [I acted]
   ▾ Technical details
   Trend +2 (price>EMA20, EMA20>50>200, EMA200↑)
   Momentum +1 (RSI 58, MACD hist>0, TRIX mixed)
   Macro US +1 Broadening · UK 0 Transitional
   Risk 0 (vol 48th pct, drawdown −1.9%, NAV 1 day old, proxy gap 0.3%)
   Range 1m: −4.8% … +4.1% · P(fall>5%) 8%
   Data: yfinance 0P…L ✓ · ECB ✓ · BlackRock page ✓ (22 Oct)
```

A guided flow, each reply editing the same message:

```
You:  I want to log a transaction
Bot:  What kind?                      [Bought] [Sold] [Dividend] [Fee]
You:  (Bought)
Bot:  Into which holding?             [Balanced] [NASDAQ 100] [Robotics]
                                      [Silver] [Something new]
You:  (Balanced)
Bot:  How much, in pounds?            [£100] [£200] [£500] [Type an amount]
You:  (£200)
Bot:  When?                           [Today] [Yesterday] [Pick a date]
You:  (Today)
Bot:  Bought £200 of Balanced (Monzo) on 23 Oct · about 10.8 units at NAV 18.57
      [Confirm] [Edit] [Cancel]
```

### 9.3 The web app: on a laptop and inside Telegram

One static app (MyPaisa DS v1, "Warm ledger", picked on MA-101; lightweight-charts),
built from the one design spec in Claude Design (`docs/design/README.md`), which has a set
of boards for each door (Mini App boards for the phone, browser boards for the
laptop; `docs/design/README.md`). It has two front doors to the same pages:

| Door | Who opens it | How the member is identified |
| --- | --- | --- |
| **Mini App**, from the `web_app` button on the Portfolio card, at `console.mypaisapp.com` | a member on their phone, inside Telegram | Telegram's signed `initData`, exchanged for Cognito tokens through the custom-auth Lambdas (§4.5) |
| **Browser**, at `console.mypaisapp.com`, with Telegram | a member on a laptop | the Telegram Login Widget: one tap, confirmed in the Telegram app on their phone, no password; verified by the same custom-auth Lambdas (HMAC keyed by the bot token, five-minute freshness, no replay) |
| **Browser**, the same address, with Google or a passkey | a member on a laptop, or anywhere Telegram is not to hand | Cognito's Google provider (the Google account linked to the member, §4.5), or a passkey registered after the first sign-in. Nothing else from Google is used or stored. |

Every door ends the same way: the api at `api.mypaisapp.com` sets a session
cookie for its own host (thirty days on a laptop, a day inside Telegram;
`HttpOnly`, `Secure`, `SameSite=Strict`), with the member's Cognito tokens
behind it, access tokens of five minutes refreshed by the api. The console and
the api are the same site, so the cookie travels with the console's calls and
no token is ever visible to page scripts; CORS admits only that environment's
console (and `localhost` in dev). The static shell is public and holds no
data: every figure comes from the api, whose authorizer checks the session,
the member's status and session epoch on every call, so removing or pausing a
member locks them out at once.

The pages, all read-only:

- **Overview, a holding, Overlap, Scorecard**: as the boards, with the
  Household / Me / member switch from §4.5. Two columns at laptop width.
- **Audit**: the audit log of §4.6, newest first, filtered by member, record
  and date; each row shows before and after and links to the run that made
  it, and a row made from a file opens that file; a **Files** view lists every
  file sent (MA-149).
- **Activity**: what the agent and the jobs did (§10). Each run with its
  trigger, the model calls and their tokens and cost, the tools it called
  and how long they took, what it sent, and any error; a board of the
  scheduled jobs with their last and next run and the freshness of each
  holding's price; this month's Claude spend against the ceiling and the step it is on; alarms from
  the last seven days.

There is no write path for the household's records. The api's data routes
are GET only, the app has no form that posts, and every change still goes
through a card and a Confirm tap in the chat, where it is audited. The
exceptions are the owner's admin settings and operations in the Admin center
(Arun, 24 Oct 2026: "Dashboard will be read only (except for admin)"): the
security actions (sign out, pause, restore, unlink; MA-102); the Claude
ceiling, the caps and their alert thresholds (§15.1, §15.2, MA-116, MA-137);
replaying dead-lettered work (§21.3, MA-145); approving or rejecting an
agent's request and rolling a setting back (§20.2, §20.3, MA-130); and
choosing how an incident ends (§20.5, MA-135). Each is behind a fresh check
with a passkey or Google, writes an audit row, and none changes the
household's records.
Privacy mode hides pounds here too. Each environment has its own S3 bucket and
CloudFront distribution for the app (`console-dev` and `console`), and its own
API Gateway HTTP API on a custom domain (`api-dev` and `api`), §18.

---

## 10. Observability: what the agent did, and what it cost

Three readers, three surfaces, one source of truth.

| Reader | Surface | What it answers |
| --- | --- | --- |
| You, in the web app | the Activity page (§9.3) and the Audit page (§4.6) | What did the bot do today, what did it call, what did it cost, what changed and who changed it |
| Whoever operates it, in AWS | one CloudWatch dashboard per environment, Logs Insights, X-Ray | Where did a run fail, which tool is slow, is a schedule late |
| The chat | alarms delivered as messages to the owner | Something needs a person: a job did not run, Claude spend has reached a step of the ladder (§15.1), a feed is stale |

**The source of truth is the `RunRecord`.** Every Lambda, not only the
agent, writes one row per run when it finishes, success or failure: the
trigger, start and end, every model call with its model, input, output and
cached tokens and the cost computed from the price table, every tool call
with its duration and outcome, what was sent to whom, the outcome, and the
error if there was one. The agent also keeps the inputs and outputs of each
tool call, truncated, so "why did it say that" has an answer. Token counts
come from the API's own `usage` fields, so the cost shown is what will be
billed, reconciled weekly against the Anthropic Console. Rows expire after
ninety days.

**Logs, traces, metrics** come from Lambda Powertools, already in the stack:

- Structured JSON logs with the `run_id`, the member and the Telegram update
  id on every line, kept fourteen days, with saved Logs Insights queries for
  errors by function, slowest tool, tokens by day.
- One X-Ray trace per run, from the webhook through the agent to the
  Anthropic API, DynamoDB, S3 and Telegram, so a slow brief shows which hop
  was slow. Within the free tier at this volume.
- Ten custom metrics, the free allowance: runs, errors, model cost per day,
  tokens per day, tool latency, Telegram send failures, price freshness in
  days, schedule lateness, audit chain check, pending flows. One dashboard
  per environment shows them; the first three dashboards are free.

**Alarms**, each delivered to the owner's chat: an error in any function; the
07:45 dead man's switch when the brief has not gone out; each step of the
Claude ladder and the daily guard (§15.1); any holding's price older than two days; a burst of
rejected webhook calls; the audit chain failing its weekly check. Alarms are
also `RunRecord` rows of trigger `alarm`, so the Activity page lists them.

**Cost of watching** is inside the free tiers: fourteen-day logs, sampled
traces, ten metrics, one dashboard, and `RunRecord` rows that are a few
kilobytes each. Observability that costs more than the thing it watches has
failed; the budget line for it in §15 is pennies.

---

## 11. Notifications, news, calls

As v1, now per member: the 07:15 brief is written once for the household and
once for each member who wants one, each in their own preferences; the 21:15
wrap goes to whoever's accounts moved; tiered alerts (red with sound, max two
a week per member; amber silent; digest), cooldowns, quiet hours, Haiku
repeat filter, all per member. News from RSS, scored nightly by Haiku into a sentiment index;
event calendar (MPC, FOMC, ECB, CPI, earnings of top holdings). Stances are
paper-traded and graded; they appear only in the Saturday review until the
record beats the baseline for 8 weeks, then in weekday cards.

---

## 12. The road to MyPaisa, the wealth tracker (later, not a priority)

The web app of §9.3 grows into the household's whole wealth tracker. The
current wealth-tracker repository, a Next.js static export that resolves
everything from fixtures and has no backend, is the reference for what that
means; its screens are rebuilt here, on this backend, with a new design, and
the old repository is retired when the new app covers it. What stays fixed:

| | |
| --- | --- |
| **Read-only, everywhere** | No screen writes the household's records; the Admin center holds only the owner's admin settings and operations (§9.3): the security actions, the ceiling and caps, replays, agents' requests and settings, incidents, each behind a fresh check. Every property valuation, EMI, rent, maturity, prepayment and assumption change is a guided flow in the bot (§9.1), with a Confirm tap and an audit row; years of history come in through the Excel importer, sent to the bot (MA-111). The api's data routes stay GET only. |
| **One backend** | The same DynamoDB table, entities (§4.1), identity (§4.5), audit log (§4.6) and observability (§10). The ISA of phase 1 and the household's property, deposits, policies, pensions and loans are rows of the same shapes. |
| **One identity** | The members and roles of §4.5, with figures masked for a `viewer` as the tracker masks them for a standard user. Telegram, Google or a passkey to log in, through each environment's Cognito pool. |
| **Two currencies** | GBP and INR side by side, from the ECB's daily rates, chosen per member; USD and EUR for the holdings that trade in them. |
| **Numbers from code** | XIRR, schedules, net worth and the forecast from §6.6; Claude writes the words around them and answers "why is my net worth down this month?" from the same tools. |

The screens, from the tracker's own list, and what each reads:

| Screen | Reads | New in the bot |
| --- | --- | --- |
| Overview | `NetWorth` by member, category, country; maturing next; largest assets | nothing new; the Portfolio card grows into it |
| Assets, one asset | `Account`, `Position`, `Valuation`, the XIRR ledger from `Transaction`, documents | "add a property", "FD matured", "update the house valuation", "log the rent" |
| Debts, one loan | `Liability`, its `Transaction` events, the schedule, the audit rows | "add a loan", "prepaid £2,000", "rate changed to 6.1%", "preclose" |
| Budget | `Budget` per member, EMIs from `Liability` | "my salary is now …", "plan £400 a month for …" |
| Forecast | `ForecastAssumptions`, the projection from §6.6 | "assume 5% on property", "retire at 60" |
| Reports | composition by type and institution; exports | nothing; exports are GET |
| Access, Settings | `Member`, `Invite`, preferences | `/invite`, `/members`, `/settings`, already there |

Order of work in `PLAN.md` phase 9: the kinds and their bot flows first
(assets and debts), then the wealth maths and the forecast, then the
redesigned screens, then budget and reports, then retiring the old
repository. Each step ships read-only pages over data that the bot already
maintains, so nothing is shown that cannot be changed from the chat.

---

## 13. Tech stack (changes from v1 in bold)

| Layer | Choice |
| --- | --- |
| Language, packaging, checks, tests | Python 3.14, uv, ruff, pyright strict, pytest, hypothesis, moto, respx |
| Data | pandas, numpy, pyarrow; **exchange_calendars**; **feedparser, trafilatura** |
| **Engine** | **The desk's indicator and pillar logic ported to pandas with golden tests; macro baskets per region** |
| Claude | **the `anthropic` SDK against the Anthropic API, key in SSM**; structured outputs; server-side web search and fetch; Message Batches; **PDF and image input for documents** |
| **Documents** | **S3 + Claude extraction with citations; no OCR library** |
| Charts | matplotlib (Agg) for PNG; **lightweight-charts in the web app** |
| Telegram | Thin client on httpx; **rich messages with HTML fallback; `initData` and Login Widget verification in Cognito's custom-auth Lambdas** |
| **Identity** | **Amazon Cognito (Essentials), one user pool per environment: Telegram custom auth, Google, passkeys; five-minute access tokens** |
| Runtime | Lambda container image, arm64; **handlers `webhook`, `agent`, `sender`, `worker` (each job by its type), `api`, the authorizer and the Cognito triggers** |
| **Queues** | **SQS: a FIFO queue in (one lane per member), a FIFO queue out (one lane per chat), a work queue for background jobs, and a dead-letter queue behind each, with alarms and replay (§21)** |
| Scheduling, storage, secrets, infra, CI | EventBridge Scheduler, DynamoDB + S3, SSM, Terraform only, GitHub Actions with OIDC; **dev and prod as two isolated copies in one account (§18)** |
| **Web app hosting** | **S3 + CloudFront per environment at `console(-dev).mypaisapp.com`; API Gateway HTTP API at `api(-dev).mypaisapp.com`; scheduled Lambdas have no public endpoint** |
| **Observability** | **Powertools Logger, Tracer and Metrics; X-Ray; one CloudWatch dashboard and the alarms per environment; `RunRecord` and `AuditEvent` in DynamoDB behind the app's Activity and Audit pages** |
| **Caps and alerts** | **The app's meters and steps (§15); Cost Explorer read once a day for the AWS meter; AWS Budgets at £75 as the backstop; SNS `mypaisa-<env>-admin-alerts` for the admin's email** |
| **Orchestration (phase 12)** | **Step Functions for the daily run; an EventBridge custom bus, `mypaisa-<env>-events`, between the agents (§20)** |
| **Design and diagrams** | **Lucidchart on the AWS 2024 shapes, generated by `docs/design/lucid/gen_aws_architecture.py`; explainer pages as claude.ai artifacts in MyPaisa DS v1, "Warm ledger" (MA-101)** |

---

## 14. Security and privacy

As v1 (no keys, IAM in Terraform, OIDC pinned to this repository's ids,
webhook secret, chat allowlist, dedupe, untrusted text), plus: uploaded
every file a member sends is kept for good in a private, encrypted bucket
and opens only through five-minute links after a role check (§4.6, MA-148,
MA-149); extracted figures carry their source line, and extracted records
never keep a PAN, an address or an account number; a protected PDF's
password is never stored; privacy mode hides pounds in every card and in the Mini App; the
Mini App serves nothing without a valid, recent `initData` signature.

The web app adds: identity is Cognito's, one pool per environment (§4.5). The
Telegram Login payload and `initData` are verified in Cognito's custom-auth
Lambdas (HMAC keyed by the bot token, compared in constant time, `auth_date`
within five minutes, replay refused); Google comes through Cognito's Google
provider and is mapped to a member through the identity linked to their
Cognito user, never by address; passkeys are WebAuthn with a relying-party id
fixed per environment before anyone registers. The session cookie is
`HttpOnly`, `Secure`, `SameSite=Strict`, set by the api for its own host, with
five-minute access tokens behind it; the api's authorizer checks the session,
the member's status and session epoch on every call; tokens from one
environment are refused by the other. CORS admits only that environment's
console. The Admin center's owner actions need a fresh check within five
minutes (MA-102). Responses carry a strict Content-Security-Policy; the audit
log is append-only and hash-chained.

The two environments share one AWS account and are kept apart by IAM: every
Lambda role reaches only its own environment's resources; the developer's role
works in dev and an explicit deny keeps it out of anything tagged `env=prod`;
prod changes only through CI from `main`, after approval (§18). Secret values
live only in SSM, set by hand; Terraform creates the parameters and ignores
their values. The
family should turn on Telegram's two-step verification, since a Telegram
account is now the key to both the chat and the web app.

---

## 15. Cost (monthly, at $1.30 to £1)

| Line | Lean | Standard | Full |
| --- | ---: | ---: | ---: |
| AWS, both environments, including the web app, API Gateway, Cognito (free under 10,000 monthly users), X-Ray and the dashboards | £0.50 | £0.70 | £1 |
| Claude: briefs, alerts, chat, cards, Saturday review | £7 | £12 | £21 |
| Claude: sentiment scoring, via Batches | £1.50 | £2.50 | £2.50 |
| Claude: document extraction (a few PDFs and screenshots a month) | £0.20 | £0.20 | £0.20 |
| Claude: web search (~60 a month at $10 per 1,000) | £0.50 | £0.50 | £1 |
| Market data (EODHD Historian, £19.99 a month) | £0 | £20 | £20 |
| **Total, one member** | **£9.70** | **£36** | **£46** |
| Each further member (their briefs and chat) | +£2 | +£3 | +£5 |

Two members on the standard setup: about £39. The Claude lines are paid by
the monthly API credit that comes with the Max 20x plan ($200 a month,
about £154), spent through a Console organisation linked to the plan;
at these figures dev and prod together stay inside it, so the model's cash
cost is £0. The agents' allowance is the Max 20x plan's credit, $200 a month
(about £154) across prod and dev, $160 and $40 by default, each a ceiling the
admin moves (§15.1); AWS and other services have their own cap, £50 by
default (§15.2). Stock fundamentals (EODHD
Fundamentals) would add £59.99 a month (£49.99 paid yearly), or the
All-in-One plan at £99.99 would replace both, and are not planned unless a
single share is added; EODHD's prices as shown on its pricing page on 24 Oct
2026. A second *household* would add roughly a full set (£10–34),
since data feeds are shared but model calls are not.

### 15.1 The Claude budget and its ceiling

Arun, 24 Oct 2026 (MA-112): "I have on prod a budget of $100 per month ... It
should be configurable for me to move the ceiling up/down from Admin portal."
Raised the same day (MA-127, MA-137): "Claude Spend Budget will be £200, I
have Max x20 plan which give me that. Threshold to be set and kept
configurable which I can control from Web portal Admin." AWS and others
"will be separate £50".

**The allowance is the plan's credit.** The Max 20x plan's API credit is
$200 a month, about £154 at $1.30, rather than £200; the defaults stay
inside it so nothing reaches a card: a prod ceiling of $160 and a dev
ceiling of $40, each a setting the admin moves. Ceilings are in dollars, as
the credit and the Console are; the Admin center shows pounds beside them at
the day's ECB rate. With no payment method and auto-reload off, the credit
itself is the last stop. Going past $200 (to a full £200, about $260, say)
means adding a card on the Console organisation, and the Admin center asks
for an explicit yes before a ceiling may pass the credit.

**What $160 buys.** Two members are expected to spend about $24 a month on
the standard setup and $39 on the full one (the Claude lines above, in
dollars, about £18 to £30), plus a few pounds once the Forecaster and the
agents of §20 run. The ceiling is a guard against a bad month or a runaway
loop, not a ration.

| Line, two members | Standard | Full |
| --- | ---: | ---: |
| Briefs, alerts, chat, cards, Saturday review | $20 | $34 |
| Sentiment scoring, via Batches | $3 | $3 |
| Document extraction | $0.25 | $0.25 |
| Web search | $0.65 | $1.30 |
| **Expected** | **$24** | **$39** |
| **Prod ceiling** | **$160** | **$160** |

**The ceiling, set by the admin.** `BudgetSettings` holds the monthly
ceiling ($160 in prod, $40 in dev), the steps of the ladder (70%, 85%, 95%,
100%), each member's share (60%), the daily guard (three times the daily
average), the calls per run (eight), each agent's
share (§20.7), and the day the plan's credit renews, which starts each
cycle. The admin moves the ceiling up or down in the Admin center (MA-116),
or from phase 12 in the admin's Telegram chat (§20.3): admins only, behind
the fresh check (MA-102), with an audit row and a Telegram message to the
admin; it takes effect on the next model call. Lowering it below what is already
spent puts the bot straight onto the step that implies, and the Admin center
says which before Confirm. The chat can report spend (`get_spend`) but not
change it.

**The meter** (MA-113). Every model call's cost is worked out from the API's
own `usage` counts and the price table: input, output and thinking, cache
writes and reads, web searches, Batches at half price. It is added to the
cycle's `SpendMonth` row with an atomic add, by member, feature, agent,
model and day, and written on the `RunRecord` as before. Before every call the agent
reads that row, one item, and the step decides whether and how the call is
made. The meter is reconciled weekly against the Console (§10).

**The ladder** (MA-113, MA-114):

| Spent this cycle | What happens |
| --- | --- |
| under 70% | Normal. |
| 70% | One message to the owner: what is spent, on what, and the days left. Nothing changes. |
| 85% | Savers: the bull/bear debate is skipped, the Saturday review runs on Sonnet instead of Opus, "Why?" searches are limited to three a day, and the nightly sentiment scoring pauses (stances keep the last index). The owner is told. |
| 95% | Essentials only: chat answers on Haiku; the brief, the wrap and alerts go out as their plain templates with the engine's numbers; reading a factsheet or screenshot still works. The owner is told. |
| 100% | Claude stops until the cycle renews or the owner raises the ceiling. Every card goes out as its plain template, buttons and guided flows work as before, and a typed message gets one line saying free text is back on the renewal day. |

Alerts are never dropped at any step: a template needs no model. Raising the
ceiling moves the bot back up the ladder at the next call.

**Guards under the ladder**, so one bad hour cannot spend a month:

- **Per member:** no member spends more than their share of the ceiling; past
  it, that member's chat runs at the 95% step for the rest of the cycle.
- **Per day:** no day spends more than three times the cycle's daily average
  (about $16 a day at a $160 ceiling); past it, the rest of the day runs at the 95%
  step.
- **Per run:** at most eight model calls in one run; a loop that reaches it
  stops and says so.

**The backstop is the Console.** Each workspace's spend limit in the Claude
Console is set by hand to its hard limit ($160 for prod and $40 for dev to
start) and stops the key outright if the meter is ever wrong. The Admin
center moves the ceiling anywhere from $10 to that hard limit; to go higher, raise the Console limit
first and then type the new hard limit into the Admin center. The app holds
no Console admin key, so it cannot change the Console itself.

**One credit, two environments.** The plan's $200 credit pays for both
workspaces, and the two workspace limits ($160 and $40) add up to it, so
neither environment can eat the other's share.

### 15.2 Caps and alerts, set by the admin in the Admin center (MA-137)


![The agent team, settings, caps and alerts, Lucid page 7](docs/design/lucid/07-agents-caps.png)

Page 7: the two caps, the meters, the alert router and where each alert goes; the agent team and the settings service of §20 sit above them. [Open it in Lucid](https://lucid.app/lucidchart/d8bc9ec7-ef1f-41fd-b372-7b8feea22b1a/edit).
Every threshold below is a setting the admin changes in the Admin center's
Spend and Alerts pages (and, from phase 12, from the admin's chat, §20.3),
behind the fresh check, each change an audit row and a Telegram message.

**Claude.** The ceiling per environment, the ladder's steps (any ascending
list; 70%, 85%, 95% and 100% by default), what each step does (§15.1), the
member share, the daily guard, the calls per run and each agent's share
(§20.7). Hard stops behind them: the Console workspace limits, then the
credit itself.

**AWS and others.** AWS has no true spending cap, so the app caps by acting:

| Setting | Default |
| --- | --- |
| Monthly cap for AWS and paid data feeds, both environments | £50 |
| Alert steps | 50%, 80%, 100%, and when the month's forecast passes the cap |
| At 80% | Dev's schedules pause |
| At 100% | Dev pauses; prod's non-essential jobs (back-fills, retraining, challengers) pause; the brief, alerts and the chat never stop |

The meter reads Cost Explorer once a day (month to date by service and by the
`env` tag, and the month's forecast), about $0.01 a request, into
`AwsSpendMonth`; AWS's own figures lag by up to a day, and the page says
so. The actions are flags the jobs read, as `/pause` is, never changes to AWS
resources, so Terraform stays the only thing that changes infrastructure.
Behind them sits one AWS Budgets cost budget at a hard limit (£75 by
default, set in dollars), made by Terraform and not from the web: it alerts
on actual and forecast spend, and its action stops dev's schedules.
Monitoring is free, and so are the first two action-enabled budgets; raising
the hard limit is a pull request.

**Alerts.** One router sends every alert by a matrix the admin sets:

| Alert | Web app | Telegram | Email |
| --- | --- | --- | --- |
| Claude or AWS step reached, forecast over the cap | yes | yes | yes |
| Incident, an approval waiting (§20.3) | yes | yes | critical only |
| Data feed stale, a job failed | yes | yes | no |
| Holding alerts (§11) | members' own, as today | members' own, as today | no |

- **Web app:** an Alerts page in the Admin center and a badge, admins only for
  system alerts.
- **Telegram:** the admin's own chat; critical with sound, the rest silent.
- **Email:** through Amazon SNS, a topic `mypaisa-<env>-admin-alerts` with the
  admin's address subscribed (put in SSM by hand, the subscription made by
  Terraform, confirmed once by clicking the link AWS sends). The first 1,000
  email notifications a month are free, far more than this needs. Email
  carries system alerts only, never a holding's value, unless the admin
  turns that on.

Each channel has quiet hours that a critical alert may break through, every
alert has a cooldown so it is not repeated, and non-urgent alerts can go to
a daily digest instead.

---

## 16. Decisions (v2)

| Decision | Choice | Reason |
| --- | --- | --- |
| Engine | Port the desk's maths, rewrite its cascade | The maths is sound and self-tested; the cascade is for traders |
| Files | Every file a member sends kept in S3 for good, with a `Document` row, linked from the audit log and opened from the Audit page (MA-148, MA-149) | Arun, 24 Oct 2026: "all the files and images I send should be stored on S3 and I should be able to view that in audit logs"; replaces deleting screenshots after extraction |
| Indian markets | Phase 13 (§22, MA-147): AMFI, mfapi.in, yfinance `.NS`/`.BO` and the bhavcopy, free first; the existing portfolio imported from a CAS or a broker export | Arun's Indian mutual funds and shares, to be fed later |
| Research cards | Toolbelt shapes, fund-first content | Same skeleton reads well; funds need different questions |
| Orchestration | One tool loop + a two-call debate, not an agent graph | One household; cost without accuracy otherwise |
| Ingestion | Factsheet PDF + screenshot through Claude, Confirm before save | The only path a layman will actually use |
| Front end | Telegram rich messages + PNG charts + one read-only web app, as a Mini App in Telegram and in a laptop browser | Simple by default, technical on tap, interactive when wanted; the laptop gets the audit log and the agent's activity |
| Confidence | Computed from agreement, persistence, quality, history; calibrated weekly | A number that is checked, not felt |
| Calls | Shadow until 8 weeks above baseline | Prove value before it reaches the chat |
| The kill switch's name | `/pause` and `/resume`, kept though PAUSE is also a stance; the stance only appears on a holding's card with its confidence, never as a command (Arun, 24 Oct 2026, MA-35) | One word everyone already uses for stopping. Three different things share it: `/pause` is the household's kill switch, a flag every scheduled run checks first (§2, §8); the Admin center's Pause of a member disables that person's sign-in through Cognito and signs them out until the owner restores them (MA-102, §4.5); the PAUSE stance is a view on one holding |
| Money in any currency | Each position has one currency; an amount typed in another is never saved as it is: the bot names the holding's currency and asks for the amount that arrived, or offers the ECB rate as a marked estimate; the original amount, rate and source are kept on the transaction (MA-156, 24 Oct 2026) | Rupees are never recorded as pounds; the number stays the member's or the engine's, never Claude's |
| Identity | Amazon Cognito from day one, one user pool per environment: Telegram (custom auth over `initData` and the Login Widget), Google and passkeys linked to one user per member; invites by one-time link; replaces the earlier "Cognito only later" (MA-106, 24 Oct 2026) | No passwords; one identity however you arrive; sign-out, pause and MFA come built in; free at this scale |
| Tenancy | Household as the tenant, accounts per member, isolation in code with tests | Finances are managed per member; the household view is a sum, not a shared pot |
| Claude access | The Anthropic API, through a Console organisation linked to the Max or Team plan so its monthly API credit pays for the calls; one workspace per environment with its own spend limit; the key in SSM | Same per-token prices as Bedrock, no model-access form, the server tools and Batches come with it, and the plan's credit makes the model free at this volume |
| Web search | Anthropic's server-side web search and fetch | Citations built in; one fewer key to manage |
| Batch scoring | Message Batches for the nightly sentiment scoring | Half price; overnight latency is fine |
| Data feeds | One `PriceSource` contract, a plugin per feed, the chain per kind a setting; yfinance and Twelve Data's free tier first, free websites where their terms allow, EODHD only as a last resort on an admin's approval | Local development is free and keyless; a paid feed is a configuration change, not a code change; two configured feeds can be compared before one is trusted |
| Conversation | Guided flows with buttons, one question per message, `ask_user` and a `PendingAction` row with a day's expiry; Confirm before every write; a plan with one Confirm for multi-record changes | A layman answers taps, not forms; nothing is saved by surprise |
| Audit | An append-only, hash-chained `AuditEvent` in the same transaction as every record change; an Audit page and `get_audit` | A change without an audit row cannot happen; the chain shows tampering |
| Observability | A `RunRecord` per run of every Lambda, with tokens and cost from the API's own counts; Powertools logs, X-Ray, ten metrics, one dashboard per environment; alarms to the chat; an Activity page | What the agent did and spent is visible without opening the AWS console, inside the free tiers |
| Web app auth | An `HttpOnly`, `SameSite=Strict` session cookie on the api's host with five-minute Cognito access tokens behind it; the static shell is public and holds no data; the api's authorizer checks session, status and epoch on every call | No token in page scripts; sign-out and pause take effect on the next request |
| Google sign-in | Cognito's Google provider, one OAuth client per environment; a Google account linked to a member by a code typed into the chat | One identity per member across Telegram, Google and passkeys; the link is proven from the member's own phone |
| Environments | One AWS account, every component twice (`mypaisa-dev-*`, `mypaisa-prod-*`), isolated by IAM and tags; separate bots, Claude keys and SSM paths; dev holds synthetic data, prod starts empty (§18) | Arun's choice (24 Oct 2026): one account to run, two environments that cannot touch each other |
| Claude budget | The agents' allowance is the Max 20x plan's $200 monthly credit across prod and dev ($160 and $40 by default, each a ceiling the admin moves); AWS and others have their own cap (£50); every step, action and alert route set in the Admin center (§15.2); a ladder steps down at 85% and 95% and stops at 100%, with guards per member, per day and per run; the Console workspace limit is the hard backstop (§15.1, MA-112) | Arun's budget (24 Oct 2026); the bot degrades to templates rather than going silent, and a runaway loop cannot spend a month |
| Chat memory | Every message kept ninety days, only the current conversation sent, with notes on recent ones; history append-only (§8, MA-115) | Pennies a message instead of a cost that grows every day |
| Delivery | Terraform only; the AWS MCP reads; GitHub CI builds once, deploys dev, then prod after approval, with smoke tests and rollback; a nightly drift check (§18) | Every change is reviewed, repeatable and visible; nothing in prod changes by hand |
| Forecaster | A second engine, phase 11, beside the rules engine and never replacing it: market mood and risk first, direction last; shown for a holding only after 8 live weeks beating the base rate and the rules engine; switches itself off when its record slips (§19, MA-117) | Arun's goal is fewer deep falls and steady growth; risk can be forecast, short-term direction mostly cannot, and an engine that has not proved itself should not speak |
| Queues | SQS between every part that could fail: updates in and replies out through FIFO queues with one lane per member or chat, background jobs through a work queue, retries with backoff, idempotent handlers, a dead-letter queue behind each with an alarm and replay (§21, MA-138) | Arun: "resilient and self heal with retries from Queues"; nothing a member sends, nothing the bot sends and no day's work is lost to a bad minute somewhere else |
| Agent team | Narrow agents (data, news, the rules engine, the Forecaster, grading and tuning, operations, the chat, the admin desk), each with its own tools, model and budget share; every behaviour a setting; any change outside a setting's automatic band only on an admin's approval, in Telegram or the web; daily grading and bounded daily recalibration; self-repair within bounds, an incident otherwise (§20, MA-127) | Arun's goals: everything configurable, nothing changed without asking, a system that learns from its own record and fixes what it safely can |
| Destination | The web app becomes MyPaisa, the whole wealth tracker, read-only, with the bot as the only write path; the current tracker repository is the screen reference and is retired when covered; the data model carries the extra kinds, categories and cashflow types from phase 1 | One backend, one audit trail, one identity, one place to secure writes; a migration avoided by adding empty fields now |

## 17. Open questions

- The Monzo fund's exact name and ISIN (factsheet in the app); whether the holdings sit in the Stocks & Shares ISA or a general account; the Monzo platform fee on your plan.
- Whether yfinance returns history for the fund's `0P…L` id; otherwise which page becomes the daily source.
- Whether Twelve Data's free tier serves LSE and Xetra daily closes (if so, EODHD is not needed); answered by the source-comparison report in the first weeks of phase 2, since it sits second in the London chain from day one.
- Rich messages: confirm block types and limits against the official Bot API changelog before relying on tables.
- UK and EU macro basket constituents (UCITS tickers) and their weights.
- A Google OAuth client per environment, created in the Google Cloud Console with the redirect `https://auth(-dev).mypaisapp.com/oauth2/idpresponse`; the consent screen needs only the basic profile and email scopes, so no Google verification review applies. Its secret goes into that environment's SSM path by hand (MA-109).
- The passkey relying-party id for each environment, fixed before anyone registers a passkey (MA-109).
- For the Forecaster (§19): the drawdown budget and how much yearly growth may be given up to cut the deepest falls (F7); whether share-level fundamentals are worth their cost; each data source's terms for personal use.
- Whether Claude spend should ever go past the plan's $200 credit (a full £200 is about $260; the extra needs a card); and whether a second person is made an admin (§20.3).
- The day the plan's API credit renews each month, so the ceiling's cycle starts on it; and whether to buy Console credits if the prod ceiling is ever raised past what the $100 credit covers with dev's share taken out (§15.1).
- Whether the CloudFront free flat-rate plan covers the two consoles' distributions beside the tracker's; if not, they run on pay-as-you-go, which at this traffic is pennies.
- For §12: which members report in INR (the redesigned screens use MyPaisa DS v1, picked on MA-101); and when the apex `mypaisapp.com` moves from the old tracker to a redirect to the console (MA-97). Decisions for phase 9, not now.

## 18. Environments, domains and delivery


![Environments, domains and delivery, Lucid page 2](docs/design/lucid/02-environments.png)

Page 2: one account, what is shared in it, dev and prod side by side with their own keys, and how a change reaches each. [Open it in Lucid](https://lucid.app/lucidchart/60bffe0d-133b-489c-ae02-526a987252fc/edit).
Arun's decisions, 24 Oct 2026 (MA-106): "I will be developing local, from day 1
I need the auth to be fixed using AWS tech"; one AWS account with every
component twice; dev seeded with synthetic data, prod a clean slate; everything
on AWS through Terraform, read with the AWS MCP; prod deployed only by GitHub
CI; `console-dev.mypaisapp.com` and `console.mypaisapp.com` for the web app.

### 18.1 Two environments, one account

One AWS account (`us-east-1`), every component twice. Names are
`mypaisa-<env>-<part>` and every resource carries the tag `env`. Nothing is
shared between the two except the account, the DNS zone and the certificate.

| Part | dev | prod |
| --- | --- | --- |
| DynamoDB (registry, transactions, audit) | `mypaisa-dev-*`, synthetic data | `mypaisa-prod-*`, empty at launch; deletion protection and point-in-time recovery |
| S3 (console, exports, imports) | `mypaisa-dev-*` | `mypaisa-prod-*`, versioned |
| Lambdas, API, schedules | `mypaisa-dev-*`; the schedules are off unless switched on | `mypaisa-prod-*` |
| Cognito user pool | `mypaisa-dev-users` | `mypaisa-prod-users` |
| Secrets, SSM | `/mypaisa-agent/dev/...` | `/mypaisa-agent/prod/...` |
| Telegram bot | its own dev bot | the household's bot |
| Claude API key and ceiling | its own workspace key; a $40 ceiling | its own workspace key; a $160 ceiling the admin moves, with the Console limit as the hard backstop (§15.1) |
| Google OAuth client | its own | its own |

**Kept apart by IAM, not by trust.** Each Lambda's role names only its own
environment's resources. The developer's role works in dev; an explicit deny
keeps it out of anything tagged `env=prod`, so a slip on a laptop cannot touch
the household's data. Tokens from one pool are refused by the other
environment's api.

**Local development** runs the code on the laptop against dev in AWS: the dev
bot by long polling (no webhook needed), the console from `localhost` against
`api-dev`, the dev Cognito pool for sign-in. There is no local copy of AWS.

**Data.** Dev is seeded with synthetic data shaped on real Monzo funds (the
names, ISINs and factsheets Arun supplies, never his balances) by a seed
script that can wipe and reseed (MA-110). Prod starts empty and fills only
through the app: the bot's guided flows, and for years of history the Excel
importer (§18.5). No script writes to prod tables.

### 18.2 Domains

`mypaisapp.com` is registered in Route 53. The zone, the registration and the
certificate (the apex and `*.mypaisapp.com`, in `us-east-1`) belong to the
wealth tracker's Terraform (`wealth-tracker/infra/terraform/dns/`, its own
state). MyPaisa looks them up by name and creates only its own six records; the
apex keeps serving the old tracker until MA-97 hands the zone over and turns
the apex into a redirect to the console.

| Name | What | dev | prod |
| --- | --- | --- | --- |
| Console | S3 + CloudFront, the web app and the Mini App | `console-dev.mypaisapp.com` | `console.mypaisapp.com` |
| API | API Gateway HTTP API custom domain: `/v1/...`, `/v1/admin/...`, `/telegram/webhook`, `/auth/telegram` | `api-dev.mypaisapp.com` | `api.mypaisapp.com` |
| Sign-in | Cognito custom domain: Google's redirect, the hosted endpoints | `auth-dev.mypaisapp.com` | `auth.mypaisapp.com` |

The scheduled Lambdas (the brief, the wrap, the refreshers) have no public
address. The console and the api share the site `mypaisapp.com`, so the
session cookie is `SameSite=Strict` and still travels with the console's calls.

### 18.3 Identity

§4.5 and §14 hold the detail. In short: one Cognito user pool per environment,
Essentials plan; one user per member, with their Telegram id, Google account
and passkeys linked to it; Telegram through custom-auth Lambda triggers that
verify `initData` and the Login Widget; five-minute access tokens behind an
`HttpOnly` cookie; sign-out everywhere and pause through Cognito and the
member's session epoch (MA-102). Built in phase 1, so every later piece starts
signed in (MA-109).

### 18.4 Delivery

**Terraform only.** `infra/modules/mypaisa` holds the whole stack once;
`infra/dev` and `infra/prod` call it with their own settings and keep separate
state (`mypaisa-agent/<env>/infra.tfstate` in the existing state bucket). A
change is planned to a file, the plan is read, and that file is applied.
Prod resources that hold data carry `prevent_destroy`. Secret values are put in
SSM by hand; Terraform creates the parameters and ignores their values. The
AWS MCP is for reading (describe, logs, metrics, costs) and never changes a
resource (`.claude/rules/aws-changes.md`).

**GitHub CI, as on smart-clearance** (MA-25, MA-107):

| Stage | When | What |
| --- | --- | --- |
| Gates | every PR | ruff, pyright, pytest (AWS faked with moto), `terraform fmt` and `validate`, tflint, a security scan of the Terraform, gitleaks, pip-audit, the `jira-key` check |
| Plan | every PR touching `infra/` | `terraform plan` for dev and prod, posted on the PR |
| Build | merge to `main` | the Lambda packages built once and stored by digest; the same build goes to both environments |
| Dev | after the build | apply dev, deploy, smoke tests against `api-dev` |
| Prod | after dev passes and Arun approves in the GitHub `prod` environment | apply prod, deploy behind each Lambda's `live` alias, smoke tests, automatic rollback to the previous version on failure |
| Drift | nightly | `terraform plan` for both environments; any difference is a message in the chat (MA-108) |

CI reaches AWS through the account's GitHub OIDC provider with three roles:
`ci-plan` (read only, any branch), `ci-dev-deploy` (`main` only) and
`ci-prod-deploy` (`main` and the `prod` environment only). These roles, and
the developer role, live in a small root of their own, `infra/bootstrap`,
applied once from the laptop, since CI cannot assume a role that does not
exist yet. Actions are pinned
to commit SHAs, workflows hold `contents: read` unless a step needs more, and
runs of the same workflow on the same branch never overlap.

### 18.5 Hydrating prod: the Excel importer

Prod starts empty, and years of past investments are needed for XIRR. They come
in through one versioned Excel template (MA-111), sent to the bot as a file:

1. The bot reads the workbook and checks it against the template's version:
   sheets, columns, types, dates, currencies, known holdings.
2. A dry run shows what would be added, what is already there (matched by a
   fingerprint of each row, so sending the same file twice adds nothing) and
   every row it refuses, with the reason.
3. Confirm, with the second check (MA-102), writes the rows in batches, each
   with its audit row, under one import id.
4. Any import can be rolled back by its id.

The same importer works in dev against the synthetic data, so it is tested
before it ever touches prod. It is built in phase 9, after the wealth
tracker's data is mapped (MA-105).

---

## 19. The Forecaster: a second engine beside the rules engine (phase 11, later)


![The market agent and the learning loop, Lucid page 6](docs/design/lucid/06-market-agent.png)

Page 6: free data in, the rules engine and the Forecaster side by side, calibration, the card, and the daily learning loop of §20.4 below them. [Open it in Lucid](https://lucid.app/lucidchart/35e7ddc4-3aa4-46bf-b301-dadb0cde0b48/edit).
Arun, 24 Oct 2026 (MA-117): "My target is to minimize loss and grow money
over time steadily ... another agent which will give really predictive
recommendation side by side with the one you are building ... I want this
view of web dashboard as well as integration with my Telegram app."

The rules engine of §6 stays as it is: transparent, fixed rules that a person
can check by hand. The Forecaster is a second engine beside it that learns
from ten years of history, gives its own view of each holding, and is graded
on the same track record. It never replaces the rules engine and never trades.
(It is not the thirty-year wealth forecast of §12, which projects stated
assumptions.)

### 19.1 What can and cannot be forecast

| Can | Cannot |
| --- | --- |
| How rough the next few weeks will be, and the chance of a deep fall: calm and rough spells cluster, so risk is far more forecastable than direction | Tomorrow's up or down: short-term moves are mostly noise, and a tool claiming 80 to 90% accuracy has learned its past by heart |
| The market's mood (calm and rising, choppy, stressed, falling) | Rare shocks: wars and pandemics have too few past cases for confident numbers |
| What usually followed days like today, and how a holding moved after past events of a kind | Candles or opening prices for OEICs: they price once a day and deal at the next day's price |
| A modest, honest edge on direction over weeks, not days | Anything faster than the household can act on |

So the horizon is four weeks (20 trading days), the first aim is avoiding deep
falls, and direction is the last and least trusted piece.

### 19.2 Data, as it was known on each day (F1, MA-119)

Ten years, from 2015 or inception, in Parquet in the `mypaisa-<env>-lake`
bucket and queried with DuckDB (the same copy as MA-104):

| Kind | What | Chosen source | Cost |
| --- | --- | --- | --- |
| Shares, ETFs, commodity ETCs | Daily open, high, low, close and volume; the top constituents of each fund and the index it tracks | yfinance first, Twelve Data's free tier second; EODHD Historian (30+ years, 100,000 calls a day, its news feed included) only if approved | Free; EODHD £19.99 a month (£199.90 a year) only if approved |
| UK funds (OEICs) | The daily price (one a day, no candles) | Yahoo's `0P…` id; the fund manager's page (BlackRock, Vanguard); EODHD by ISIN under `.EUFUND` only if approved | Free; inside the EODHD line if approved |
| Commodity drivers | Gold, silver, Brent and WTI futures; daily Brent and WTI | yfinance; the US Energy Information Administration (EIA) | Free |
| Economy | Policy rates, 2-year and 10-year yields, real yields, inflation, unemployment, each as first published | FRED with its ALFRED archive; Bank of England; ECB; ONS | Free |
| Market stress | VIX, high-yield and investment-grade credit spreads, the dollar index | yfinance, FRED | Free |
| World events | Daily event counts and tone by country and theme; the geopolitical risk index | GDELT; the Caldara and Iacoviello GPR index | Free |
| News | Stories on the household's holdings, their countries and sectors | GDELT; the RSS feeds of §11; EODHD's news feed only if EODHD is approved | Free |
| Calendars | Central bank decisions, inflation releases, earnings of top holdings, elections | The banks' and the ONS's published calendars; earnings dates from EODHD or yfinance | Free |

**When EODHD is taken: only when it has to be** (Arun, 24 Oct 2026). Both
engines run on yfinance, Twelve Data's free tier and free websites where
their terms allow. EODHD is switched on only when the data steward (§20.1)
shows that no free source can serve a named holding (or its ten-year
history) and an admin approves the request, which shows the evidence, the
£19.99 a month and the headroom in the £50 line for AWS and others. Before
it asks, it tries EODHD's free key on that holding and records what comes
back. A paid feed not needed for 60 days is proposed for cancellation. Share-level
fundamentals (£59.99 a month, or £99.99 for the All-in-One plan) only if
shares are added and their cards are wanted.

**Not chosen**, with the reason: Morningstar and FE fundinfo (the industry's
UK fund data, sold on business licences); Twelve Data Grow ($79 a month; UK
funds only on Pro at $229) while EODHD covers both; Alpha Vantage premium
(from $49.99) and Marketaux (about $29) for news sentiment, while Claude Haiku
tags the news (§19.3), with Marketaux the fallback if that tagging falls
short; EODHD itself, until a free source fails (above).

**Shares come from another platform.** Monzo offers only BlackRock funds and
ETFs, gold and silver among them, and no individual shares; a share would be
held on another platform, in an `Account` with its own `institution`, and
reaches the bot the same way (a statement, a screenshot or a typed line).

Every row carries the date it became known, and revisions are added rather
than overwritten, so a backtest of 2018 sees only what was known in 2018. A
daily refresh runs after the close; a gap or a stale feed is an alarm in the
chat. Each source's terms are recorded; the use is personal.

### 19.3 Matching news and events to the holdings (F1, F4; MA-119, MA-122)

**Every holding has an exposure map**, kept on the instrument's `exposure`
(§4) and refreshed on its own clock:

| Kind | What it is exposed to | Refreshed |
| --- | --- | --- |
| OEIC or ETF | Its top holdings, countries, sectors and currencies, from the factsheet and the holdings file (look-through, §5.2) | Monthly; iShares files daily |
| Share | The company, its sector, its main markets, its main suppliers and rivals | Each quarter's results |
| Commodity ETC | Its drivers. Gold: real yields, the dollar, central-bank buying, geopolitical stress. Silver: gold's drivers and industrial demand. Oil: OPEC+ decisions, stockpiles, supply from the Middle East and Russia, world growth | A fixed list, reviewed yearly |
| Cash | Its interest rate and currency | With the rate |

**Each day's stories are tagged.** The news of §19.2 goes to Claude Haiku
through Batches, which tags each story with the companies, countries,
sectors, commodities and central banks it names, its event type (§19.4) and
the direction it points. The tags are checked weekly on a labelled sample.

**Relevance is worked out in code**: a story's weight on a holding is the
holding's exposure to the entities the story names. A chip-export story
reaches a NASDAQ fund through its chipmakers' weight; an OPEC+ cut reaches an
oil holding through its first driver; a surprise from the Fed reaches gold
through real yields and the dollar. Stories under a floor are dropped; the
rest are stored on `ArticleScore` (`entities[]`, `event_type`, `matches[]`).

**Where the matches go**: into the event-impact lookup (how this holding
moved after past events of that type), into the direction forecast as
features, and into the morning brief ("3 stories touch your holdings
today", each with its holding and the measured past effect). Code produces
every number; news alone never raises a red alert (§6.3).

### 19.4 The models (F3 to F5, MA-121 to MA-123)

| Model | Answers | Method | Trust |
| --- | --- | --- | --- |
| Market mood | Calm and rising, choppy, stressed or falling, with its probability | A regime model over cross-asset features, smoothed so it does not flip daily | Good |
| Risk | Four-week volatility and the chance of a fall over 5%, per holding | A volatility model and gradient-boosted trees, combined and calibrated | Good |
| Similar days | What followed the 30 days since 2015 most like today, after 5, 20 and 60 days | Nearest neighbours over a feature vector, the last 20 days left out | Good, and easy to explain |
| Event impacts | How this holding moved after past rate surprises, inflation surprises, elections, conflict, tariffs, pandemics, earnings misses, OPEC+ decisions | Event studies: average move, spread, number of cases, confidence interval; under 8 cases marked low confidence | Fair |
| Direction | The chance of being up in four weeks, the likely range (10th, 50th, 90th percentile) and the main drivers | Gradient-boosted trees combined with the four above, calibrated; conformal intervals for the range | Modest |

Claude's part is the same as everywhere (§1): it files each day's news under
the event types (Haiku, through Batches) and explains the result. Every
number, the event impacts included, comes from code.

### 19.5 The strategy layer: where the goal is won (F7, MA-125)

Forecasts become suggestions about the money the household already moves:
contributions always continue; new money tilts away from holdings in a
stressed or falling mood or with a high chance of a deep fall; a trend
filter; rebalancing within bands; and a drawdown budget the owner sets. It
never says sell everything, stays ISA-safe, and only suggests (§1). It shows
as the suggested split on the first-of-the-month contribution prompt, beside
the rules engine's.

### 19.6 How it proves itself (F2, MA-120)

- **A backtest lab** replays any strategy one day at a time over the ten
  years, with fees, next-day pricing for OEICs and monthly contributions, and
  reports yearly growth, the worst fall, the worst year, time below a
  previous high and the calls' calibration, against buy-and-hold with
  monthly contributions and a simple trend rule. Its first report is the
  rules engine itself, years before its live track record could say as much.
- **Walk-forward tests** train on the past and test on the years after, with
  a gap so no window overlaps; the last two years are held back for a final
  test. A model that does not beat the base rate there is not used.
- **Practice first.** Every forecast is a `Forecast` row, graded when its four
  weeks are up. For each holding the Forecaster appears in weekday cards only
  after 8 live weeks beating both the base rate and the rules engine; until
  then it appears only in the Saturday review, labelled "in practice".
- **It switches itself off** when its live record is worse than the base rate
  for four weeks, and the owner is told. Models are retrained monthly; each
  version is a `ModelVersion` row with its test scores.

### 19.7 How it is shown (F6, MA-124)

In Telegram, beside the rules engine (illustrative figures):

```
NASDAQ 100 ETF
Rules engine   PAUSE · 64%
Forecaster     next 4 weeks
  Chance up          52%
  Chance of −5%      21%   (usually 12%)
  Likely range       −7% … +6%
  Market mood        Stressed, since 3 Oct
  Similar days       31 since 2015; 18 recovered within 4 weeks
  Main drivers       momentum fading, US yields rising, chip export news
[Why?] [Chart] [Track record]
```

When the two engines disagree, the card says so; below the confidence floor
it says "no clear view". In the web app, a Forecast page per holding: a fan
chart of the likely range, the mood timeline, the similar days drawn over
today's chart, the event-impact table, the main drivers, candles for ETFs and
shares, and both engines' track records side by side. Both are designed first
(design-first), with privacy mode and both themes.

### 19.8 Where it runs and what it costs

The data is small (a few thousand days for a few dozen series), so daily
forecasts run in a Lambda from the same image, and the monthly retrain runs
in a Lambda too (up to 15 minutes and 10 GB), moving to a Fargate task only
if it outgrows that; the one-off GDELT backfill runs as such a task. Models
are files in S3 behind their `ModelVersion` rows. The data is free; EODHD Historian (£19.99 a month)
only if a free source fails and an admin approves (§19.2), inside the £50
line for AWS and others; compute is a few dollars a month; Haiku filing the news is
well under a dollar a month, inside the Claude ceiling of §15.1.

### 19.9 Order

F1 (data) and F2 (the lab) can start any time after phase 2, and F2's first
report tests the rules engine. F3 and F4 follow, F5 after them, F6 once the
web app and the track record exist (phases 5 and 6), F7 after F2 and F3. F2,
F3 and F7 do most of the work for the goal; F5 is the least reliable piece.
The bounds of §4.5 hold: this is software for one household; sharing its
calls with other households would start to look like regulated advice.

---

## 20. The agent team: configured, approved, self-healing, self-learning (phase 12, later)

Arun, 24 Oct 2026 (MA-127): "Keep everything configurable which I can
control by Admin Web portal or telegram bots (only for admin) talking to
Agents. The Agents should be able to ask me what is needed and ask for my
approval for any kind of changes ... recalibrate and tuning you algorithms
on daily basis ... This should be self healing and self learning system ...
For any kind of issues, connect with the admin for approval ... This app is
just for my household."

Three rules hold for every agent. **Code decides, Claude explains**: models
and rules produce every number and decision; Claude tags, writes, asks and
answers. **Nothing changes without a trace**: every behaviour is a setting,
and every change is a version and an audit row. **Outside its band, it
asks**: an agent may act on its own only inside the automatic band its
settings allow; anything else is a request to an admin.

### 20.1 The agents

| Agent | Its job | Brain | On its own | Asks an admin |
| --- | --- | --- | --- | --- |
| **Concierge** (the `agent` Lambda) | Talks to members in the chat; routes an admin's instructions to the admin desk | Sonnet, Haiku for small turns | Answers, reads, proposes changes to records with a Confirm card (§8) | n/a: members confirm their own records |
| **Data steward** | Keeps prices and data flowing from free sources; watches freshness, gaps, disagreement and free quotas | Code; Haiku writes its requests | Fails over within the chain, retries, fills gaps, labels stale data | A new or reordered source, any paid feed, a source's terms |
| **News scout** | Collects news and events, tags them, matches them to holdings (§19.3) | Haiku through Batches; code scores | Tags and matches | A new feed or event type |
| **Analyst** | The rules engine (§6) | Code only | Runs daily | Any rule threshold change (through the tuner) |
| **Forecaster** | The models of §19 | Code; Sonnet writes the explanations | Runs daily; switches itself off when its record slips | Promotions (through the tuner) |
| **Grader and tuner** | The learning loop (§20.4) | Code; Sonnet writes the weekly and monthly reviews | Grades daily, moves calibration within bounds, rolls back a worse map | Promoting a challenger, any change to rules or models |
| **Ops warden** | Runs the daily pipeline and repairs it (§20.5) | Code; Haiku summarises incidents | Retries, catches up, rolls back to the last good version | Anything it cannot fix: an incident |
| **Budget keeper** | The meter, the ladder and the guards (§15.1) | Code | Steps down and back up | Ceilings and shares are the admin's |
| **Admin desk** | The one channel between agents and admins (§20.3) | Code; Haiku turns an admin's words into a request | Queues, batches, reminds, expires | It is the asking |

Each agent is a Lambda with its own role, tools, model routing and budget
share. They do not call each other directly: they publish events on the
`mypaisa-<env>-events` EventBridge bus and leave work in DynamoDB, and the
daily pipeline is a Step Functions state machine (§20.5). No agent can
trade, read a secret, delete data or apply infrastructure: secrets are put
in SSM by hand, and infrastructure changes only through Terraform and CI
(`.claude/rules/aws-changes.md`); an agent can at most open a Jira issue
proposing one.

### 20.2 Settings: one store for every behaviour (E1, MA-129)

Every behaviour the household might want to change is a `Setting`: the data
source chains, rule thresholds and model parameters, horizons, schedules,
alert budgets, ceilings and agent shares, and the learning loop's own
bounds. Each has a schema with an allowed range, an **automatic band**
(how far an agent may move it without asking; often zero), and an approval
rule. Defaults live in `config/defaults.yaml`, validated in CI; the live
values in DynamoDB, one `ConfigVersion` row per change, never edited, with
a daily snapshot to S3. One settings service makes every change and enforces
the schema, the range and the approval rule, so no agent can write a
setting directly. Lambdas read settings through a cache of a minute at
most. Secrets stay in SSM and infrastructure in Terraform: a setting may
name a secret, never hold one.

### 20.3 The admin desk: Telegram and the web, admins only (E2, MA-130)

Admins are the owner and anyone the owner makes an admin; members and
viewers never see the desk. Both doors show the same queue:

- **In Telegram**, in the admin's own chat with the bot. A request arrives as
  a card, for example:

  ```
  Data steward asks
  yfinance has not returned Balanced for 3 days; Twelve Data does not list it.
  EODHD's free key returns its history back to 2019.
  Switch on EODHD Historian at £19.99 a month?
  AWS and others: £3 of £50 used this month.
  Undo: switch it off; nothing else changes.
  [Approve] [Reject] [Why?] [Later]
  ```

- **In the web**, the Admin center's Approvals, Settings, Agents and
  Incidents pages (designed first).

Approving needs the second check: Face ID or the PIN in Telegram, the fresh
check in the browser (MA-102). Deciding in one door updates the other. Each
request says what changes, from and to, why with its evidence, the cost and
the budget left, the risk and the undo, and when it expires. Agents also ask
plain questions ("Which fund is the Monzo Balanced fund's ISIN?") with
buttons or a typed answer that resumes their work. Admins give instructions
in their own words ("put Twelve Data first for London", "raise dev to £50",
"why did the Forecaster go quiet on silver?"); the concierge turns an
instruction into the same request with a Confirm card, and a question into an
answer from the agent concerned. Non-urgent requests wait for one daily
digest; incidents come at once; a rejected request is not proposed again
for the period its setting names. Every decision is audited.

### 20.4 The learning loop: grade daily, calibrate daily, change rules on evidence (E4 to E6, MA-132 to MA-134)

Every prediction is kept exactly as it was made, with the versions of its
model and settings and the date its inputs were known, and graded against
what prices actually did:

1. **Grade, every day.** After the close, each prediction whose horizon has
   passed gets its outcome: the realised return, hit or miss, Brier score,
   log loss, whether it fell inside its range. A late price correction adds
   a regraded outcome; nothing is overwritten. `ScoreDaily` keeps the
   scoreboard per model, holding and market mood, rolling over 30, 90 and
   365 days.
2. **Calibrate, every day, within bounds.** The calibration map of the rules
   engine and of each Forecaster model is refitted on a rolling window. A new
   map is used only if it beats the current one on the held-back part of the
   window, only where a bucket has enough graded cases, and no bucket moves
   more than two points in a day. It then serves a probation of 10 trading
   days and is rolled back on its own if it does worse.
3. **Change rules and models on evidence, with approval.** Challengers (the
   monthly retrain, other parameters, rule thresholds within their ranges)
   are tested over ten years and run live in shadow. One that beats the
   current version in the held-out years and over 8 live weeks, by more than
   a margin, is proposed on the admin desk with the scores side by side.
   After a promotion the old version stays ready and is restored on its own
   if the new one slips.
4. **Report.** A line in the admin's daily digest, the scoreboard in the
   Saturday review, and a monthly note on what changed and why.

Why not retune the rules themselves every day: a day's outcomes are mostly
noise, and a system that chases yesterday learns noise. Calibration moves a
little every day; structure moves only on weeks of evidence. That is how
accuracy and, above all, honest confidence grow over the years.

### 20.5 Self-healing (E7, MA-135)

The daily run (ingest, engine, Forecaster, grade, calibrate, brief) is one
Step Functions state machine with retries and backoff on every step and
idempotent writes, its jobs carried by the queues of §21. When a dead-letter
queue fills, the ops warden finds the cause (Telegram, the Anthropic API, a
data source, a deploy) and, once it is healthy again, replays the messages
at most three times with growing gaps; a message that fails the same way
again becomes an incident with its errors attached. What the system fixes on its own, and tells the admin in
the digest: a failed step retried; a source failed over within its chain; a
gap filled on the next run; a missed schedule caught up; a model or a
calibration map rolled back to its last good version; a step that still
fails skipped, its output labelled stale. Everything else is an `Incident`
on the admin desk with what happened, what was tried and the choices. Every
agent reports a heartbeat, and a silent one is an incident. The 07:45 dead
man's switch, the nightly drift check (MA-108) and the Lambda rollback
(MA-107) stay as they are.

### 20.6 Where the data lives


![Where the data lives, Lucid page 5](docs/design/lucid/05-data.png)

Page 5: the one DynamoDB table and its entity groups, the S3 lake and its prefixes, DuckDB, the documents and web buckets, and SSM. [Open it in Lucid](https://lucid.app/lucidchart/a86198f7-d101-4550-9402-3348f08c5eb5/edit).
**S3**, the record, in the `mypaisa-<env>-lake` bucket, versioned, in
Parquet, queried with DuckDB:

| Prefix | What | Kept |
| --- | --- | --- |
| `raw/<source>/dt=` | Each source's answer as fetched, for replay | 90 days in Standard, then Infrequent Access; GDELT's raw files 30 days, its daily aggregates for good |
| `curated/` | Prices, the economy, events and news matches, with the date each was known | For good |
| `features/dt=` | Each day's feature snapshot | For good |
| `predictions/model=/dt=` | Every stance and forecast as made | For good |
| `outcomes/model=/dt=` | Every grade | For good |
| `models/<name>/<version>/`, `calibration/` | Model files, training notes, test reports, calibration maps | For good |
| `reports/`, `config/snapshots/` | Backtests, reviews, the daily settings snapshot | For good |

**DynamoDB**, the state, small and fast: `Setting` and `ConfigVersion`,
`ChangeRequest`, `AdminQuestion` and `Incident`, `ScoreDaily`,
`CalibrationMap`, `ModelVersion`, the latest `Forecast` and `Stance` rows,
`BudgetSettings` and `SpendMonth`, beside the registry of §4. A household's
whole history stays in the low gigabytes, so storage costs pennies.

### 20.7 Budgets for the team (E8, MA-136)

**Claude: the plan's $200 a month for the agents** across both environments
($160 prod, $40 dev by default; §15.1). Each agent has a share of its environment's
ceiling, metered by agent; the defaults, each a setting:

| Agent | Share |
| --- | ---: |
| Concierge (the chat, cards, briefs) | 55% |
| Forecaster explanations | 10% |
| News scout | 10% |
| Grader and tuner reviews | 10% |
| Admin desk | 5% |
| Data steward and ops warden | 5% |
| Reserve, the chat first | 5% |

An agent past its share drops to its 95% step (§15.1); the reserve covers
the chat before anything else.

**AWS and other services: £50 a month** across both environments by default,
with its steps, actions and alerts set in the Admin center (§15.2). Paid data
feeds (none by default) are recorded as subscriptions against the same cap, so a request to switch
one on shows the headroom left. Expected use is a few pounds: Lambda,
DynamoDB, Step Functions and EventBridge sit inside their free tiers at this
volume.

### 20.8 Order

The settings store (E1) and the admin desk (E2) are useful long before the
rest and can come forward once the web app and the second check exist
(phases 5 and MA-102). The data steward (E3) follows phase 2's sources;
grading and calibration (E4, E5) can start as soon as there are graded
stances (phase 6); challengers (E6) need the Forecaster (phase 11); the ops
warden (E7) and the agent budgets (E8) come with them. One household, its
admins, and nothing shared: the bounds of §4.5 stand.

---

## 21. Queues: nothing lost, everything retried (MA-138)


![Queues, retries and replay, Lucid page 4](docs/design/lucid/04-queues.png)

Page 4: the three queues and their consumers, the idempotency records, the retry rules, and the failure path from the dead-letter queues to replay. [Open it in Lucid](https://lucid.app/lucidchart/3077ebaa-b165-4936-933c-d68109de8544/edit).
Arun, 24 Oct 2026: "Add SQS, the system should be resilient and self heal
with retries from Queues."

Every place where one part hands work to another goes through an SQS queue.
A queue holds the work until it succeeds, retries it with backoff when it
fails, and keeps it in a dead-letter queue when it has failed too often, so
a bad minute at Telegram, at the Anthropic API or at a data source costs a
delay, never a message or a day's work.

### 21.1 The queues

| Queue | Carries | Lanes | Consumer | Tries, then |
| --- | --- | --- | --- | --- |
| `mypaisa-<env>-updates.fifo` | Every Telegram update the webhook accepts | One per member's chat (message group); Telegram's `update_id` dedupes | `agent` | 3 within about a minute, then its dead-letter queue, and the member is told it was kept |
| `mypaisa-<env>-outbox.fifo` | Every message, photo and edit the bot sends | One per chat, so a brief's messages arrive in order | `sender` | 5, honouring Telegram's `retry_after`, then its dead-letter queue |
| `mypaisa-<env>-work` | Background jobs: each instrument's ingest, each news feed, each document read, the engine, each brief, scoring | None needed | `worker` (the same image, running each job by its type) | 5, backoff from 30 seconds to 30 minutes, then its dead-letter queue |

The webhook only checks Telegram's secret, queues the update and answers at
once, so Telegram never times out. Each member's messages are handled one
at a time and in order, while members run in parallel; that keeps a guided
flow and the append-only chat history (§8) in step. Answers to button taps
are sent at once rather than queued, so the tap stops spinning. The
scheduler puts jobs on the work queue (each schedule has its own retry
policy and dead-letter queue), a finished job can queue the next (ingest,
then engine, then brief), and from phase 12 the Step Functions run of §20.5
drives the same jobs.

### 21.2 Rules every consumer keeps

- **Idempotent.** Every handler records what it has done (Powertools
  idempotency, keyed by `update_id`, message id, or job id and date), so a
  retry or a replay never does anything twice.
- **Backoff, not hammering.** A failed message comes back after a growing
  wait; the work queue's maximum concurrency keeps yfinance, Twelve Data's
  free tier (8 calls a minute) and the other free sources inside their
  limits; reserved concurrency on the agent keeps Claude calls and spend in
  bounds (§15.1).
- **Fail fast on what cannot succeed.** A malformed update, an unknown chat or
  an instrument with no source goes straight to the dead-letter queue with its
  reason, instead of using up its tries.
- **Never silent.** The brief, the wrap and alerts are always attempted; if
  their inputs are late they go out labelled stale.
- **Settings.** Tries, backoff, concurrency and the replay limits are
  settings (§15.2, §20.2).

### 21.3 Dead-letter queues and replay

Each queue, and the scheduler, has a dead-letter queue. Messages stay there
14 days, SQS's limit, and a copy goes to `raw/dlq/` in S3 for good. Each
dead-letter queue has an alarm the moment it holds anything, which reaches
the admin through the alert router (§15.2) as "failed work".

Replay moves dead-lettered messages back to their queue:

| From | How |
| --- | --- |
| Phase 1 (MA-139, MA-140) | `scripts/redrive.sh <queue>` |
| Phase 5 (MA-137, MA-145) | A [Replay] button on the alert, in the Admin center and the admin's Telegram chat |
| Phase 12 (MA-135, MA-146) | The ops warden replays on its own once the cause is healthy again, at most three times per message with growing gaps; a message that fails the same way again becomes an incident |

Replays are safe: handlers are idempotent; an update more than an hour old is
answered "still want this?" rather than acted on; and a Confirm tap whose
`PendingAction` has expired is refused, so an old tap can never save a
change by surprise.

### 21.4 Cost

SQS's free tier is a million requests a month. The household sends and
receives a few thousand messages and jobs a month; the larger part is the
Lambda service polling the three queues while they are empty, which counts
as requests too. Dev's queue triggers are switched off while dev's schedules
are, so the expected cost is nothing to about a dollar a month, measured in
the first month and inside the AWS cap of §15.2. The dead-letter alarms cost
a few pence each beyond CloudWatch's ten free alarms.

---

## 22. Indian markets: shares, ETFs and mutual funds (phase 13, later)

Arun, 24 Oct 2026 (MA-147): "If later I want to add Indian market in the mix
will it work? ... I also have some existing portfolio of MF and stock in
India market which I will feed later." It works without changing the core:
currency, country and the kind of holding are data (§4), every feed is a
plugin in a chain (§5.1), and the INR view is already planned (phase 9).
India adds plugins, two kinds, account types, a macro basket and an
importer.

### 22.1 Sources, free first (IN1, MA-151)

| Holding | First (free) | Fallback (free) | Paid, only on the admin's approval |
| --- | --- | --- | --- |
| Indian mutual funds | AMFI's daily NAV file for every scheme, the official industry source, matched by AMFI scheme code and ISIN | mfapi.in (free JSON with each scheme's full NAV history; community-run, so a fallback and the history source, not the record); a screenshot | none needed |
| NSE and BSE shares and ETFs | yfinance with `.NS`, then `.BO` tickers: daily candles and ten years of history | The exchanges' own bhavcopy end-of-day files, free to download for personal use; stale last | Twelve Data's Grow plan ($79 a month; its free tier has no NSE or BSE); Zerodha Kite Connect at ₹500 a month with history, if the member has a Zerodha account |
| Look-through of funds | The fund houses' monthly portfolio disclosures, which SEBI requires | The factsheet | none |
| INR exchange rate | The ECB's daily reference rate (it includes INR) | The RBI/FBIL reference rate | none |
| Economy and stress | RBI's database (policy rate, yields), MOSPI's inflation, India VIX, NSDL's daily foreign portfolio investor flows | FRED's India series | none |
| News and events | Economic Times, Mint and Business Standard by RSS; NSE company announcements; GDELT's India coverage | none | none |

Two new kinds: `in_mutual_fund`, one NAV a day and no candles, like a UK
OEIC; and `in_listed`, an NSE or BSE share or ETF with daily candles. NSE
and BSE close at 15:30 IST (10:00 or 11:00 UK time) and AMFI's NAVs arrive
by the UK evening, so the jobs run on the work queue after those times and
the 07:15 brief carries India's previous day. NSE's trading holidays come
from the exchange's calendar.

### 22.2 The existing Indian portfolio, imported once (IN2, MA-152)

| What the member holds | The file to send | What it gives |
| --- | --- | --- |
| Mutual funds, every fund house | The detailed Consolidated Account Statement (CAS) PDF from CAMS, KFintech or MF Central | Every folio and scheme, units, and every purchase, SIP, switch and redemption since inception, so cost and XIRR are right from day one |
| Shares, ETFs and funds in demat | The NSDL or CDSL CAS, or the broker's holdings and tradebook export (for example Zerodha Console's CSV) | Holdings and quantities by ISIN, and the trades from the tradebook |
| Anything else | A screenshot or a typed line | One holding at a time, as for the UK funds |

The files are parsed by code (an open-source CAS parser, pinned and tested
on synthetic statements); Claude reads only a file the parsers cannot. Each
holding is matched by ISIN: a fund to its AMFI scheme code, a share or ETF
to its `.NS` or `.BO` listing; anything unmatched is listed, never guessed.
The import has the Excel importer's safety (§18.5, MA-111): a dry run, one
summary card, fingerprints so the same statement never adds twice, Confirm
with the second check, rollback by import id, and an audit row per change
that names the file it came from. The file itself is kept in S3 like every
other (§4.6, MA-148). A protected PDF's password is typed once into the
Mini App, used in memory and never stored, logged or sent; or the member
sends an unlocked copy. The records never keep the PAN, the address or an
account number, though the file is kept as sent.

### 22.3 Accounts, currency and suggestions (IN3, MA-153)

New account types `demat`, `mf_folio`, `nre` and `nro` (and `ppf`, `nps`,
`elss` if one is held), each with country `IN` and currency INR. Every
Indian figure shows in INR with its GBP value beside it; the household
total is in the base currency with the INR view one tap away (MA-94).
Rupees typed against a pound holding, or pounds against an Indian one, get
the correction of §4.7 (MA-156).
Privacy mode hides rupees as it hides pounds. "ISA-safe" becomes
"wrapper-aware": a suggestion names only actions that suit the account it is
about, and the bot still never trades. For a UK resident many Indian funds
are not UK "reporting funds", so gains may be taxed differently; the bot
flags those holdings in plain words and says to check with a tax adviser.
It never gives tax advice. The cards and pages are designed first.

### 22.4 The engine and the Forecaster (IN4, MA-154)

An India basket joins the UK, EU and US ones in the macro pillar (§6.2):
the Nifty 50 against Indian government bonds, India VIX, the rupee against
the dollar, foreign portfolio investor flows and the RBI's policy rate. The
news scout reads the Indian feeds, and the exposure maps come from the fund
houses' monthly disclosures. The calendars add the RBI's policy dates,
India's inflation releases, NSE holidays and results season. The Forecaster
(§19) and its lab take the Indian holdings on the same terms: nothing is
shown until its gates are passed.

### 22.5 Cost and order

On the free path India costs nothing beyond a few more jobs a day inside the
free tiers. A paid feed is a request to the admin with its price, counted
inside the £50 cap (§15.2). IN1 comes first; IN2 needs IN1, the Excel
importer (MA-111) and file keeping (MA-148); IN3 needs both; IN4 needs IN1
and, for the Forecaster, phase 11.
