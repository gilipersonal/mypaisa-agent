# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

One dual-country household (UK and India) managed by non-finance family members and one household admin. Members review whole-wealth positions, answer monthly commitment check-ins, inspect statements, and explore long-horizon plans across iPhone, iPad, desktop browsers, and mobile browsers (including Android foldables). Only the single household admin operates system health, budgets, feature toggles, and member access in the Admin center.

## Product Purpose

MyPaisa Agent is a private household wealth keeper and market analyst driven through one conversational agent alongside a live whole-wealth dashboard. It registers and maintains everything the household owns and owes in GBP (`£`) and INR (`₹`), reconciles statements and monthly check-ins, computes deterministic projections and market-stance cards with confidence scores, asks before acting, logs every write to an immutable audit trail, and grades its own calls over time. It never executes trades.

## Positioning

A single private household ledger and analyst where kinds are dynamic documents rather than rigid SQL transaction tables, every new record is registered through conversation rather than multi-field CRUD forms, existing figures can be corrected in place through a confirmed write card with an audit row, and all projections and technical stances are computed deterministically by code while explained in plain words by Claude.

## Operating Context

- **Doors:** An iOS and iPadOS 26 app (React Native shell with a native SwiftUI core) and a full-featured SvelteKit 3 Progressive Web App at `dashboard.mypaisapp.com` (and `dashboard-dev.mypaisapp.com`), backed by AWS (`us-east-1`) and Anthropic Claude with SSE live delivery.
- **Responsive chat placement:** The chat sits beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over). An iPhone is always compact in either orientation.
- **Dual-currency reality:** Every total and holding respects UK (`£`, `en-GB` grouping) and India (`₹`, `en-IN` lakh/crore grouping) figures, FX translation notes, and household member attribution.
- **Privacy in shared spaces:** One-tap Privacy mode masks every currency balance, chart callout, scrub tooltip, and accessible label (`••••`) without layout shift so a member can open the app in public or beside family.

## Capabilities and Constraints

- **Chat creates; UI corrects in place:** New assets, debts, commitments, statements, and plans are created in the chat. Existing figures can be corrected in place where they appear; every write previews a confirmation card and writes an immutable audit row (with a second check on destructive or admin actions).
- **One household admin:** Exactly one member holds the admin role (`Admin center` on Web and iOS); other household members have full whole-wealth visibility and conversational/in-place workflows as governed by household permissions, with no multi-tenant org chrome.
- **Telegram retired:** Early v1/v2 explorations used Telegram and a Telegram Mini App; v3 (MA-161) and v4 (MA-186) retired Telegram completely in favour of the iOS app and the Web PWA.
- **No trading or brokerage execution:** The market agent researches, scores confidence across deterministic pillars, tracks accuracy (`Proof`), and alerts, but never places orders.

## Brand Commitments

- **Name:** MyPaisa (product and app), MyPaisa Agent (system and repository).
- **Visual identity:** MyPaisa DS v1 — **Warm ledger** (chosen by Arun in MA-101), paired with native iOS 26 **Liquid Glass** strictly on navigation/control chrome on iPhone and iPad (MA-161), and crisp Warm ledger paper chrome on the Web PWA (MA-186).
- **Voice:** Plain-spoken, calm, numerate, and direct — written for a smart household member who is not a finance professional, with technical depth available on request ("Show working") and zero hype, urgency theatre, or AI clichés.

## Evidence on Hand

- Architecture & domain specification: `ARCHITECTURE.md`, `PLAN.md`, `TECH_STACK.md`, `docs/trace.json`.
- Design system & screen boards: `docs/design/ds-v1/`, `docs/design/ios-v1/`, `docs/design/app-v1/`, and interactive multi-door verification harness `docs/design/prototype-v5/`.
- Canonical household figure set & generators: `docs/design/figures/` (`make_prototype_v5.py`, `make_forecaster.py`) — every illustrative board uses one reconciled household ledger where lists sum to totals and timestamps advance consistently.
- Automated design gates: `scripts/contrast_check.py` (WCAG AA + Liquid Glass worst-case contrast), `scripts/board_fit.js` (multi-viewport Chromium + WebKit overflow/overlap/pixel-diff gate), `scripts/prototype_smoke.js` (21-chapter × 5-door + Privacy Mode smoke gate), and `scripts/plan_sync.py`.

## Product Principles

1. **Whole wealth first, at every door:** Both the iOS app and the Web PWA give the household full conversational and dashboard parity across UK and India holdings, debts, budgets, and plans.
2. **Code computes, the agent explains:** Financial maths, projections, FX conversions, and indicator pillars are deterministic and reproducible; the LLM translates intent, cites sources, and explains trade-offs plainly.
3. **Ask before acting, audit everything:** Nothing mutates household state silently; every write shows a clear confirmation card and leaves a permanent, human-readable audit record.
4. **Calm ledger over trading terminal:** Interfaces feel silky smooth like Monzo yet read with the quiet permanence of a private family ledger — never a blinking brokerage cockpit.

## Accessibility & Inclusion

- **Contrast floor:** WCAG 2.2 AA across light (`Warm ledger`) and dark (`Night ledger`) themes, including worst-case composited contrast (`>= 4.5:1` text, `>= 3.0:1` UI marks/tracks) over translucent iOS Liquid Glass (`scripts/contrast_check.py`).
- **Adaptive & assistive support:** Full Dynamic Type scaling up to Accessibility sizes (`AX1–AX5`) without clipped figures, `>= 44×44` pt/px hit targets, keyboard `:focus-visible` navigation on Web and iPad, `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast: more`, plus complete Privacy Mode redaction across both visual DOM and screen-reader `aria-label` attributes.
