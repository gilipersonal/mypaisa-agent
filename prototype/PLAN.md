# Plan: a clickable end-to-end demo prototype of MyPaisa (`prototype/`)

## Context

Arun wants a working prototype to demo the whole app end to end, built from the design boards, with stubbed data.

What exists today:
- **No product code.** `web/`, `ios/` and `src/` don't exist yet.
- **Prototype v4 (MA-193, Done).** A guided, scripted 10-step walk-through at three doors (desktop web, phone web, iPhone). It covers about 8 pages, uses hard-coded figures, and runs only inside the Claude Design runtime, which pulls React from unpkg.
- **Static boards.** Most current boards are still pictures: Register variants, Budget forecast, Plans, Admin center, Settings, Audit and Files, and iPad.

Arun chose (29 Oct 2026):
- **Form:** a standalone demo app in its own folder, not product code. Boards that are only `planned` are used as drawn; this does not pick them for their own stories.
- **Scope:** whole wealth plus admin, phases 0 to 9. The market side is out (Forecaster, India, Overlap, Scorecard, research cards).
- **Doors:** desktop web 1440, phone web 390, iPhone 402 and iPad (1180, with a width slider).
- **Chat, both modes:** free roam with scripted chat flows, plus a presenter mode on top.

The outcome is one static app Arun can open offline and click through, either freely or step by step as a talk track. Every Confirm moves the figures, writes the audit row and adds a run.

## Where it lives

**On your machine, in the repo; not in Claude Design.** The work happens in a separate worktree, `~/projects/mypaisa-agent-MA-<n>`, on branch `MA-<n>-demo-prototype`. That branch is pushed to GitHub and goes to a PR like every story, so it is local and in git.

- **Claude Design is read, never written.** The boards and their mirror in `docs/design/` are what the prototype is built from. Nothing is created or changed in any Claude Design project.
- **Running it:**
  - `npm --prefix prototype run dev` serves it on `http://127.0.0.1:<port>`;
  - `npm --prefix prototype run build` makes `prototype/dist/`, a static folder that runs offline from any local static server.
- **Hosting is out of scope:** no public URL and no hosting (GitHub Pages, S3, Claude Design) unless you ask.

## Stack

A new top-level folder, `prototype/`, built with Vite 8, Svelte 5 runes and TypeScript, using npm.

- **Styling:** no Tailwind. Vite aliases `@ds` → `docs/design/ds-v1/` and `@fig` → `docs/design/figures/`, so `tokens.css`, `ios.css`, `motion.css` and `motion.js` are imported unchanged and never fork.
- **Board CSS:** each board's own `<style>` rules are copied into `prototype/src/styles/boards/<file>.css`. A header records the source file and its sha256 from `docs/design/claude-design.json`. `prototype/boards.lock.json` lets a gate catch any board changed since the copy.
- **Offline fonts:** a small Vite plugin removes the Google Fonts `@import` from `tokens.css` at build time. Fontsource serves Inter, Nunito and Material Symbols Rounded locally.
- **Routing and build:** a hash router of about 60 lines. `npm run build` writes `prototype/dist`, which opens from any static host.
- **Kept from `docs/design/app-v1/prototype-v4.js`:**
  - the formatters (`gbp`; `inr` with lakh/crore and half-to-even rounding);
  - the privacy masking;
  - the chart maths and the SVG charts (fan, what-if, Home value, HDFC amortisation);
  - the hint copy.

## Data: one figure set, plus a new ledger

- **Imported directly:** `docs/design/figures/household-v4.json` and `future-plans-v4.json`. The plans file is lazy-loaded on the Projection and Plans routes.
- **New generator:** `docs/design/figures/make_demo_ledger.py` writes `demo-ledger-v4.json`, the data the set lacks. It reads the other two files and never changes them. It is transcribed from the boards' literals (Admin center 2 and 3, Browser 2, Audit and files, iPhone admin, settings and audit), on the same clock (Mon 26 Oct → Sun 1 Nov → Thu 5 Nov → the evening). It holds:
  - members' sign-in methods, devices and joined dates;
  - an audit row for every Confirm;
  - Activity runs (model calls, tools, cost) and the jobs board;
  - the files (the Barclaycard PDF and the Monzo CSV);
  - the Admin data: ceiling and spend, caps, the AWS cap, alert routing and quiet hours, approvals, agents, incidents, dead letters, people;
  - the settings.

  The figures README gets a section on it.
- **The generator asserts over its own data** (lesson 38):
  - spend equals the sum of run costs;
  - every row's run and file exist;
  - rows are in clock order, and no row comes after the frame that shows it (lesson 19);
  - every weekday matches its date;
  - the owner is never paused, and only the owner restores;
  - there is exactly one row per Confirm.
- **Totals are computed from the records, never copied.** A vitest replays the canonical actions and asserts each of the five `totals_*` snapshots in `household-v4.json`.

## State, actions and the chat engine

- **State:** `prototype/src/state/model.ts` and `reduce.ts` (pure), wrapped in `store.svelte.ts` (`$state`, with an action log). It covers:
  - the clock, viewer (Arun or Asha), door, iPad width, theme, privacy, currency (GBP or INR) and today's money;
  - the records with their event history, the audit log, runs, check-ins, budget and statements;
  - plans, the projection run, the admin state, the chat thread, a side branch and the UI (toast, Undo).
- **Actions:**
  - sign in and out;
  - register (each variant on the Register board);
  - check-ins: paid, Undo, not yet, a different amount, paid off;
  - correcting a figure in place;
  - statements: attach, categorise, Confirm, close the month;
  - plans: a what-if, save, pause, resume, correct, end, apply a rearrangement;
  - admin operations, each behind the fresh second check: the ceiling, caps, routing, Replay, approvals, pausing or restoring a member, an invite, signing out a device;
  - Cancel and Reset.
- **Guards from ARCHITECTURE:**
  - Rule 4: anything new is created in the chat; a screen can only correct a figure in place.
  - Asha can read everything but change only her own records, and has no Admin center.
  - The owner cannot pause themselves, and only the owner restores a paused member.
  - An admin action without its second check is refused.
- **The clock only moves forward.** Moving it applies the canonical events in between, stamped with their figure-set times.
- **Side branches:** flows the figure set has no totals for run in a side branch, with a banner and "Back to the walk":
  - HDFC paid off in full;
  - Premium Bonds;
  - the SIP and the card bill;
  - the saver maturing;
  - a failed second check.
- **Chat engine:** `prototype/src/chat/dsl.ts` defines flows as data. Beat types: `me`, `ai` (streamed), `think`, `ask` (one card per question with chips, edited in place), `card`, `confirm` (Confirm/Edit/Cancel), `effect`, `nav`, `banner`.
  - Suggested-prompt chips come from each flow's `needs()`.
  - Typed text or a slash command (`/add`, `/whatif`, `/privacy`, `/help`, …) starts a matching flow. Anything else gets a canned reply.
  - `?fast=1` and Reduce Motion skip the streaming.
  - Free roam and presenter mode run the same flows.

## Routes and doors

- **URL:** `#/{door}/{page}?step=&theme=&viewer=&priv=&ccy=&w=`
- **Pages:**
  - `signin`, `chat`, `home`
  - `assets`, `assets/:id`, `debts`, `debts/:id`
  - `budget`, `budget/statement/:id`
  - `projection?tab=networth|plans|forecast`
  - `activity`, `activity/run/:id`
  - `audit`, `files`, `files/:id`
  - `admin/:section`, `you/:section`, `search`
- **Width rule:** one pure function, `layoutFor(door, w)`, returns the nav (tabs, sidebar with a top bar, or sidebar) and where the chat goes (tab, sheet or column). It follows the rule word for word: "beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over)". It is unit-tested at 599, 600, 1132 and 1133.
- **Frames:**
  - web: browser chrome, shell 1a with the chat beside;
  - phone: tabs Chat, Home, Activity, You;
  - iPhone: shell 1a Chat first, the glass strip and the Liquid Glass tab bar;
  - iPad: frame with a width slider from 320 to 1366.

  Frames scale to fit the window. They use `.brw`, `.dev` and `.pframe`, so `scripts/board_fit_page.js` can measure them unchanged.
- **Pages with no web board** (Register, Settings): the web shows the iPhone cards in the chat and the iPhone You screen at 390. Each one is noted for MA-279, the redesign round.

## Presenter mode

- **The script:** `prototype/src/presenter/script.ts` holds about 21 steps. Each has a chapter, door, route, clock, flow, guide line and a talk line for Arun.
- **Top bar,** ported from v4: Door, Theme, Privacy, Viewer, Currency, Restart, step chips grouped by chapter, the guide line, "Type it for me", Continue, and the pulsing next control.
- **Jumping** to a step resets and replays the earlier steps' actions, so it is deterministic.
- **Chapters:**
  - **Mon 26 Oct:**
    - sign in and first-run setup;
    - Monzo £5,000 (£439,951 → £444,951);
    - the SBI FD replay, with Register variants as branches;
    - a valuation check-in and correcting Home to £428,000 (£457,951);
    - Activity and run r-1235;
    - Audit.
  - **Sun 1 Nov:** the statements (PDF and CSV), the amber lines, the EMI confirmed by the statement, the month close and Budget; then Files and the file viewer.
  - **Thu 5 Nov:**
    - several check-ins due; HDFC Paid, then Undo; Debts and the HDFC loan;
    - Projection R5N: fan, assumptions, rupees and today's money;
    - the £60k what-if.
  - **Thu 5 Nov, evening:** school fees through plans in the chat; the salary step and the HDFC loan closed with the FD; Budget forecast 1a; the Plans tab 3a (pause, resume, correct, end); the wedding (cash flag, ways, apply, Undo).
  - **Admin and You:**
    - spend and moving the ceiling with the second check; alerts and Replay; approvals; caps and the AWS cap;
    - pausing and restoring Asha, and a failed second check;
    - You: sign-in methods, notifications and quiet hours, privacy;
    - Asha's view.
  - **iPad:** the chat beside at 1180, a sheet below 1133 and tabs below 600.

## The screens and their boards

All are under `docs/design/`, current v4 only.

| Area | Web (app-v1) | iPhone (ios-v1) | iPad | State |
|---|---|---|---|---|
| Sign-in | Web v4 · Shell and chat (Sign in); Browser 2 (Login) | iPhone sign-in | iPad and foldable | planned |
| Shell, chat | Web v4 · Shell and chat (1a, streaming, Confirm, offline, Web Push) | Shell options 1a; iPhone chat | iPad and foldable | shell picked |
| Home | Web v4 · Dashboard | iPhone v4 · Home | iPad · Whole wealth | picked |
| Register | (iPhone cards) | iPhone v4 · Register | as iPhone | planned |
| Check-ins | Web v4 · Check-ins | iPhone v4 · Check-ins | – | 1b picked |
| Assets, debts | Web v4 · Assets and debts | iPhone v4 · Assets and debts | iPad v4 · Budget, assets and debts | planned |
| Budget, statements | Web v4 · Budget | iPhone v4 · Budget | iPad v4 · Budget… | planned |
| Budget forecast | Web v4 · Budget forecast (+1a states) | iPhone v4 · Budget forecast (+states) | – | picked |
| Projection | Web v4 · Projection | iPhone v4 · Projection | iPad Net worth tab | picked |
| Plans | Web v4 · Plans in the chat / Plans tab (+states) | iPhone v4 equivalents | iPad Plans tab | picked |
| Activity, Audit, Files | Audit and files; Browser 2; Shell and chat (Activity, A run) | iPhone audit and activity | iPad Audit and Activity | planned |
| Admin center | Admin center 2 and 3 (browser boards only) | iPhone admin | iPad Admin center | planned |
| You / Settings | (iPhone at 390) | iPhone settings | – | planned |

**Excluded:** every superseded file (Telegram, Mini App, `Prototype.dc.html`, Chat basics, Currency check, Research cards, `Admin center.dc.html`, `dashboard/`) and the market side.

When boards disagree with each other or with ARCHITECTURE, the prototype follows ARCHITECTURE. The disagreement is named in `prototype/DISAGREEMENTS.md` and in the trace row's notes.

## Repo process (the plan-sync and jira-flow rules)

1. **Separate worktree.** Branch `MA-<n>-demo-prototype` in its own git worktree from `main`. The uncommitted MA-284 work on the current branch stays untouched.
2. **Records, in one change:**
   - a Jira story under MA-9 (label `design`);
   - its PLAN.md bullet in Phase 0;
   - its `docs/trace.json` row: `ui: true`, the boards above, code `prototype/**` and `docs/design/figures/make_demo_ledger.py` / `demo-ledger-v4.json`, arch §9;
   - the estimate of 20 build days in `docs/roadmap.json`.

   Then run `roadmap.py write`, `plan_sync.py render` and `confluence_docs.py write`, and publish with `/plan-sync --confluence`.
3. **Decision record:** `docs/design/reviews/MA-<n>/decision.md` records today's four choices as this story's pick (design `picked`). It also states that the prototype draws planned boards as drawn and picks none of them for their own stories.
4. **Gates:**
   - a new `prototype` gate in `.claude/jira-flow.json`, on paths `prototype/**`, `docs/design/figures/**`, the ds-v1 CSS and `motion.js`;
   - a CI workflow, `.github/workflows/prototype.yml`;
   - the existing plan-sync, contrast and design-sync gates.
5. **Shipping:** `/autoship` raises the PR. The merge question offers the review first.

## Milestones (20 build days, each one clickable)

| Milestone | Days | What it delivers |
|---|---|---|
| M0 | 1.5 | Worktree; Jira, PLAN, trace, roadmap, Confluence; decision record; `make_demo_ledger.py` with its asserts |
| M1 | 3 | Skeleton, router, 4 doors, `layoutFor`, top bar, offline fonts, Home with computed totals, theme, privacy, ₹ |
| M2 | 3.5 | Chat engine and DSL, cards, every Register variant, check-ins, correction in place, Activity and a run |
| M3 | 3 | Assets and debts (one asset, one loan), Budget, statements, categorising, month close, correcting a plan amount |
| M4 | 3.5 | Projection charts and assumptions, what-ifs, plans in the chat, Plans tab states, Budget forecast, the wedding |
| M5 | 3 | Audit, Files and the viewer, Admin center with the second check, people, You/Settings, sign-in variants, Asha's view |
| M6 | 2.5 | The full presenter script, iPad slider, the walk and fit gates, CI, polish, `/plan-sync` |

## Verification

- **Static checks:** `npm --prefix prototype run check` (svelte-check and `tsc --noEmit`).
- **`npm --prefix prototype test`** (vitest) covers:
  - the reducer and its guards;
  - every flow reaching Confirm and Cancel;
  - totals against the five `totals_*` snapshots;
  - `layoutFor` at the edge widths;
  - lakh/crore and GBP formatting, and the privacy masks;
  - jumping to a step giving the same state as walking to it;
  - one audit row per Confirm.
- **`npm --prefix prototype run walk`** uses playwright-core from `scripts/`. It serves `dist/` on 127.0.0.1 and walks every presenter step at every door, in both themes, in Chromium and WebKit; the iPad also runs at 599, 600, 1132 and 1133. It injects `scripts/board_fit_page.js` and fails on:
  - any clipping or overlap fault, respecting `scripts/board_fit_allow.json`;
  - a console error;
  - any request off 127.0.0.1, so the demo runs offline;
  - a missing font.
- **Colours:** `prototype/scripts/colours.mjs` refuses any colour not in `tokens.css` or `ios.css`. A new one goes into `tokens.css` and `contrast_check.py` PAIRS first.
- **Other checks:**
  - `python3 docs/design/figures/make_demo_ledger.py | diff - docs/design/figures/demo-ledger-v4.json` (asserts pass, no diff);
  - the `boards.lock.json` drift check;
  - `plan_sync.py selftest && check`, `contrast_check.py --selftest && contrast_check.py`, `design_sync.py check`.
- **Every new check gets a selftest** that mutates a copy and expects the refusal (lesson 12).
- **By hand:** `npm --prefix prototype run dev`, then walk presenter mode at every door, and free-roam each area as Arun and as Asha.
- **Long Playwright runs:** each gets a hard time limit with `perl -e 'alarm shift; exec @ARGV' <s> …`, and stray-sweep runs after them.

## Open points (settled as the work runs, not before)

- **Figures the set doesn't hold** (Premium Bonds, the SIP, the card bill, the saver, paid off in full) stay as side branches unless Arun wants the figure set extended.
- **Clock seam:** the salary correction on Monday must show as the before value in Thursday's Projection edit. This is checked against R5N.
- **Deploying beyond the local `dist/`** (GitHub Pages, S3) is out of scope. Anything that publishes or costs money needs Arun's yes.
- **MA-279's redesign** will supersede the pages with no web board. Each is one `boards/*.css` swap.
