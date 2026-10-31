# MA-279: one consolidated v4 design at every door (web, iPhone, iPad and foldable)

Picked: **1a · Unified Whole-Wealth Ledger & Header 4-Currency Pill** (Arun, 31 Oct 2026). **1b · Jurisdiction-Split Tabs** and **1c · Bento Command Deck** stay on both option canvases and in `options.html` as the record. Local review page:
`docs/design/reviews/MA-279/options.html` (`http://localhost:8765/reviews/MA-279/options.html`, per MA-297 for rounds
run in Google Antigravity).

## The request

On 29 Oct 2026 (MA-279, after MA-278 retired the Telegram and Mini App boards), Arun asked for **one consolidated v4
design across every live door** — web (`dashboard.mypaisapp.com`, desktop `1440` and phone `390`), iPhone (`320..440` pt
and landscape), iPad and the foldable (`600..1366` pt) — so that every screen is drawn once on the whole-wealth
(`£444,951`) household ledger and zero active stories cite the first-generation (`£24,110`) market-only boards.

## What was split in the current boards

Captured in `docs/design/reviews/MA-279/current/` (`01` to `04`):
1. **Sixteen first-generation (`£24,110`) board files remained alongside the `v4` (`£444,951`) boards:** 7 in
   `docs/design/ios-v1/` (`iPhone chat`, `iPhone dashboard`, `iPhone settings`, `iPhone sign-in`, `iPhone admin`,
   `iPhone audit and activity`, `iPad and foldable`) and 9 in `docs/design/app-v1/` (`Browser`, `Browser 2`, `Wealth`,
   `India`, `Responsive`, `Forecast`, `Admin center 2`, `Admin center 3`, `Audit and files`).
2. **Stale labels, 2-currency controls, and missing Web v4 surfaces:** the first-generation boards still drew `ADD`
   chips instead of `Buy` / `BUY` (MA-64, MA-91), a 2-currency `GBP`/`INR` toggle instead of all four currencies
   (`GBP`, `INR`, `USD`, `EUR`, MA-213), no whole-wealth Web Register (`MA-197`, `MA-202`, `MA-206`, `MA-211`,
   `MA-216`), and the pre-MA-281 Web Forecast (`MA-124`, `MA-125`) without F8 candle patterns, 30 similar days,
   Forecaster in practice, or the Proof lab.

## How the options were drawn

- **One canonical figure set** (Lessons 10, 13, 38, 39): `docs/design/reviews/MA-279/build_options.py` reads directly
  from `household-v4.json` (`Mon 26 Oct 2026`, `Fri 23 Oct` close, `own £691,694 − owe £246,743 = net £444,951`,
  `UK £338,468 + India £106,483 = £444,951`), `forecaster-v4.json` (`30` similar days since 2015, week 5 of 8
  practice gate, `8.9%` Proof lab), `engine-v5.json` (`Balanced` -> `Buy · 78%`), and `team-india-v5.json` (`Parag
  Parikh` CAMS 46 SIPs `₹5,61,995`, Claude `$35.20` of `$50` / `$160`, AWS `£2.60` of `£50`), asserting every total at
  build time.
- **Four currencies from Fri 23 Oct ECB rates** (`MA-213`, ARCHITECTURE §5.3, §12): `£1 = ₹112.50 · $1.30 · €1.17`
  (`£444,951` = `₹5,00,56,988` = `$578,436` = `€520,593`), with Indian lakh/crore grouping for `INR`.
- **Pure DS v1 ("Warm ledger") tokens** (`docs/design/ds-v1/tokens.css`, `ios.css`, `motion.css`, `motion.js`), zero new
  colour tokens, `1a · Chat first` shell (`MA-163`), and `1a · Monzo Pulse` charts (`MA-295`).
- **Two self-contained option canvases + localhost comparison hub (`MA-297`):**
  - `docs/design/ios-v1/iPhone v4 · Consolidated options.dc.html`
  - `docs/design/app-v1/Web v4 · Consolidated options.dc.html`
  - `docs/design/reviews/MA-279/options.html` (`http://localhost:8765/reviews/MA-279/options.html`)

## The options

- **1a · Unified Whole-Wealth Ledger & Header 4-Currency Pill (recommended).**
  - One calm whole-wealth ledger (`£444,951`, UK 76% + India 24% sculpted capsule meter) with a single compact
    4-currency pill (`£ GBP · ₹ INR · $ USD · € EUR`) in the header/hero, progressive-disclosure `Buy` / `BUY` and
    `MA-281 1a` Forecaster cards (`30` similar days, F8 candle patterns, Forecaster in practice, Proof lab), in-place
    `before → after` corrections (`via: inline_edit`, zero Add buttons), and a dedicated Admin Center behind Face ID /
    passkey.
  - **Why recommended:** keeps iPhone (`320..440` pt), iPad/foldable (`600..1366` pt) and Web (`320..1920` px) on one
    identical, uncluttered information architecture, keeps cross-border UK + India overlap in one view, and isolates
    owner-only spend and replay controls behind their second check.
- **1b · Jurisdiction-Split Tabs (`All | UK | India`) & Always-Open Inspector.**
  - Adds a top jurisdiction scope bar (`All · UK · India`) above a secondary FX strip, keeps Technical pillars and ISIN /
    PDF provenance blocks permanently expanded on holding rows, and folds owner spend banners onto Audit and You.
  - **Trade-off:** handy for India-only browsing, at the cost of stacked top bars on compact phones, split cross-border
    overlap, taller rows, and owner spend noise on everyday member screens.
- **1c · Bento Command Deck (4-Currency Matrix & Pinned Action Rail).**
  - Displays `GBP`, `INR`, `USD` and `EUR` simultaneously inside a 4-currency hero matrix, arranges Register holdings,
    Overlap, candidate `BUY` calls and Forecaster stats into `2×2` bento tiles at rest, and pins a guided-flow shortcut
    rail above every page.
  - **Trade-off:** high density on a `1440` monitor or `13"` iPad, at the cost of crowding compact phones under Dynamic
    Type and duplicating the Chat composer's own guided-flow shortcut chips.

## What the Step 2B build touches once Arun picks

- **Consolidated `v4` board suite (`docs/design/ios-v1/` and `docs/design/app-v1/`):** deterministically generates the
  full whole-wealth `v4` screen set in the picked direction across Sign-in & Invite, Chat & Guided Flows, Whole-Wealth
  Home/Overview (4 currencies + Privacy), Web & iOS Register (with check-ins & inline corrections), Market & India
  (`Buy` / `BUY`, Technical, Overlap, Scorecard, Brief/Wrap, CAMS/NSE/NRE/PPF), Web Forecast `1a` (F8 patterns, 30
  similar days, Forecaster in practice, Proof lab, UK fund & candidate track records, "no clear view" card),
  Activity/Audit/Files/Search, You & Preferences, Admin Center, and iPad/Foldable size classes.
- **Retirement of the 16 remaining first-generation (`£24,110`) board files** via `git rm`, leaving one `v4` board per
  screen per door.
- **Trace, PLAN & Confluence sync:** updates all 63 citing rows in `docs/trace.json` (clearing `MA-279` `undrawn` items
  with `Drawn: ...` notes), re-renders `docs/TRACE.md`, recomposes and uploads updated Confluence previews, and
  republishes all affected Confluence pages (`0 drift`).

## Checks run before Arun sees the options

- `python3 docs/design/reviews/MA-279/build_options.py --check`
- `node scripts/board_fit.js --only "Consolidated options" --jobs 4` (Chromium and WebKit across `320..1920`, `0 faults`)
- `python3 scripts/contrast_check.py --selftest` and `python3 scripts/contrast_check.py`
- `python3 scripts/plan_sync.py selftest`
- Visual inspection of `http://localhost:8765/reviews/MA-279/options.html` in Light and Dark via Playwright screenshot.

## The pick

**1a · Unified Whole-Wealth Ledger & Header 4-Currency Pill**, picked by Arun on 31 Oct 2026 after reviewing the live
`http://localhost:8765/reviews/MA-279/options.html` comparison page across iOS and Web.

- Both option canvases (`docs/design/ios-v1/iPhone v4 · Consolidated options.dc.html` and
  `docs/design/app-v1/Web v4 · Consolidated options.dc.html`) and `docs/design/reviews/MA-279/options.html` mark `1a`
  and its `S1` / `W1` states **Picked · 31 Oct 2026**, and `1b` and `1c` **Not picked · record**.
- Step 2B builds the complete consolidated `1a` whole-wealth `v4` board suite (`13` canvases across `docs/design/ios-v1/`
  and `docs/design/app-v1/`, generated by `docs/design/reviews/MA-279/build_consolidated_v4.py`), retires the 16
  remaining first-generation (`£24,110`) board files, updates all 63 referencing trace rows, and syncs Confluence (`0 drift`).
