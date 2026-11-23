# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

One dual-country household (UK and India) of non-finance family members, some of them admins. Admins add, correct and delete the household's records through the chat (correcting also in place), answer check-ins, send statements and make plans; every other member views the household overview, their own detail and what others share, and asks questions, across iPhone, iPad, desktop browsers, and mobile browsers (including Android foldables). The owner is always an admin and grants or takes back the role in the chat (MA-308). Admins operate system health, budgets, feature toggles, and member access in the Admin center.

## Product Purpose

MyPaisa Agent is an agentic AI wealth tracker for one household, driven by prompts through one conversational agent alongside a live whole-wealth dashboard. It registers and maintains everything the household owns and owes in GBP (`£`) and INR (`₹`), reconciles statements and monthly check-ins, values holdings from daily prices, measures real returns as XIRR and CAGR from the dated ledger, and forecasts the household's wealth (the Budget forecast and the Projection) from its actual numbers. A team of agents keeps the records, the budget and the forecast current. It tracks the household's goals and the monthly saving each needs, explains what changed and why, compares up to four scenarios side by side, and grades its forecast range against what really happens. It also speaks unasked, quietly: one silent Monday digest for each admin and at most one timely nudge a week, facts from code only. For a big decision an admin can start "plan with me", a deeper session on Claude Opus that ends in one plan card. Sonnet carries the chat, Haiku files and filters, and Opus serves only plan with me. It asks before acting, logs every write to an immutable audit trail, and grades its forecasts against the household's own months. It never predicts a market, never says buy, hold or sell, and never executes trades (MA-307).

## Positioning

A single private household wealth tracker where kinds are dynamic documents rather than rigid SQL transaction tables, every new record is registered and every delete made through conversation rather than multi-field CRUD forms, existing figures can be corrected by an admin in the chat or in place with an audit row, and every return, budget figure and forecast is computed deterministically by code while explained in plain words by Claude.

## Operating Context

- **Doors:** An iOS and iPadOS 26 app (React Native shell with a native SwiftUI core) and a full-featured SvelteKit 3 Progressive Web App at `dashboard.mypaisapp.com` (and `dashboard-dev.mypaisapp.com`), backed by AWS (`us-east-1`) and Anthropic Claude with SSE live delivery.
- **Responsive chat placement:** The chat sits beside every screen from about 1393 pt, a sheet away from about 600 to 1393 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over). An iPhone is always compact in either orientation.
- **Dual-currency reality:** Every total and holding respects UK (`£`, `en-GB` grouping) and India (`₹`, `en-IN` lakh/crore grouping) figures, FX translation notes, and household member attribution.
- **Privacy in shared spaces:** One-tap Privacy mode masks every currency balance, chart callout, scrub tooltip, and accessible label (`••••`) without layout shift so a member can open the app in public or beside family.

## Capabilities and Constraints

- **Only admins write; the chat adds and deletes; the UI corrects in place:** New assets, debts, commitments, statements, and plans are added in an admin's chat, and a record is deleted only there (Confirm, then the second check; the record is marked `deleted`, hidden and restorable, its events, audit rows and files kept; MA-309). An admin can correct an existing figure in the chat or in place where it appears; every write previews a confirmation card and writes an immutable audit row.
- **Several admins, everyone else views:** The owner grants or takes back the admin role in the chat (MA-308); the owner is always an admin. Every other member views the household overview, their own detail and what others share, asks anything, and changes nothing but their own preferences, with no multi-tenant org chrome.
- **Telegram retired:** Early v1/v2 explorations used Telegram and a Telegram Mini App; v3 (MA-161) and v4 (MA-186) retired Telegram completely in favour of the iOS app and the Web PWA.
- **Facts, never advice:** Code computes every figure and Claude never states one it was not given; every cause a reply gives rests on what the code found. A nudge, the Monday digest or a plan card shows facts and options with their figures, never "you should" (MA-314 to MA-322).
- **A wealth tracker only:** Prices exist only to value holdings. There is no market forecast, no stance or buy, add, hold, pause, trim or sell call, no research card, track record, news or sentiment, and no trading or brokerage execution (MA-307, 2 Nov 2026).

## Brand Commitments

- **Name:** MyPaisa (product and app), MyPaisa Agent (system and repository).
- **Visual identity:** MyPaisa DS v1 — **Warm ledger** (chosen by Arun in MA-101), paired with native iOS 26 **Liquid Glass** strictly on navigation/control chrome on iPhone and iPad (MA-161), and crisp Warm ledger paper chrome on the Web PWA (MA-186).
- **Voice:** Plain-spoken, calm, numerate, and direct — written for a smart household member who is not a finance professional, with technical depth available on request ("Show working") and zero hype, urgency theatre, or AI clichés.

## Evidence on Hand

- Architecture & domain specification: `ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `docs/trace.json`.
- Design system & screen boards: `docs/design/ds-v1/`, `docs/design/ios-v1/`, `docs/design/app-v1/`, and the interactive multi-door prototype `docs/design/prototype-v5/` (a design record; nothing checks it since MA-303).
- Canonical household figure set & generators: `docs/design/figures/` (`make_prototype_v5.py`) — every illustrative board uses one reconciled household ledger where lists sum to totals and timestamps advance consistently.
- Automated checks: `scripts/plan_sync.py` keeps Jira, Confluence, the trace and the code in step, and checks that a story's cited boards exist. The six checks on the boards' content (`contrast_check.py`, `board_fit.js`, `a11y_live.js`, `prototype_smoke.js`, the board readers in `plan_sync.py` and the generators' `--check`) were stopped by MA-303 (Arun, 2 Nov 2026: "I need this checks as QA when I ask, but on actual code implemented"); the QA is measured on the built web app by MA-304, QA on request; iOS QA comes after MA-165, with no story yet. svelte-check, eslint and vitest run on every PR touching `web/`; Playwright, axe and Argos run only when Arun asks (a manual run or a `qa` label; MA-303, MA-304).

## Product Principles

1. **Whole wealth first, at every door:** Both the iOS app and the Web PWA give the household full conversational and dashboard parity across UK and India holdings, debts, budgets, and plans.
2. **Code computes, the agent explains:** Financial maths (XIRR, CAGR, schedules, the budget), projections and FX conversions are deterministic and reproducible; the LLM translates intent, cites sources, and explains trade-offs plainly.
3. **Ask before acting, audit everything:** Nothing mutates household state silently; every write shows a clear confirmation card and leaves a permanent, human-readable audit record.
4. **Calm ledger over trading terminal:** Interfaces feel silky smooth like Monzo yet read with the quiet permanence of a private family ledger — never a blinking brokerage cockpit.

## Accessibility & Inclusion

- **Contrast floor:** WCAG 2.2 AA across light (`Warm ledger`) and dark (`Night ledger`) themes, including worst-case composited contrast (`>= 4.5:1` text, `>= 3.0:1` UI marks/tracks) over translucent iOS Liquid Glass (measured on the built web app by MA-304, QA on request; iOS QA comes after MA-165, with no story yet; the board gate `contrast_check.py` was stopped by MA-303).
- **Adaptive & assistive support:** Full Dynamic Type scaling up to Accessibility sizes (`AX1–AX5`) without clipped figures, `>= 44×44` pt/px hit targets, keyboard `:focus-visible` navigation on Web and iPad, `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast: more`, plus complete Privacy Mode redaction across both visual DOM and screen-reader `aria-label` attributes.
