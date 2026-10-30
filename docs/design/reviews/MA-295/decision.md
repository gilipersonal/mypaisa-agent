# MA-295: redesign dashboard and analytical charts (Apple HIG + Monzo craft)

Picked: **1a · Monzo Pulse** (Arun, 30 Oct 2026). **1b · Apple Health Editorial** and **1c · Monzo Modular Bento** stay on the three canvases and in `options.html` as the record.

## The request

On 30 Oct 2026 Arun asked to start the Prototype v5 local demo and redesign MyPaisa's dashboard graphs and charts into
livelier, higher-craft visualizations while conforming to:
- **Apple Human Interface Guidelines — Charting Data** (`https://developer.apple.com/design/human-interface-guidelines`):
  lead with a plain-language takeaway, reveal detail progressively on touch or pointer scrub, use standard marks where
  colour is never the sole signal, hold contrast in Light, Dark and at 25% screen brightness, provide 44pt/44px touch
  targets and plain-language `role="img"` summaries, and mask currency values cleanly in Privacy mode.
- **Monzo App & Monzo's Modular High-Fidelity Web Design System**
  (`https://monzo.com/blog/reimagining-monzo-com-building-a-modular-high-fidelity-web-design-system-that-scales` and
  the Monzo UI reference): tactile banking energy, smooth recorded pulse trajectories, sculpted progress & pot pace
  meters, modular bento stat cards, and responsive progressive disclosure.
- **MyPaisa DS v1 ("Warm ledger")** (`docs/design/ds-v1/tokens.css`, `ios.css`, `motion.css`, `motion.js`), keeping the
  strict Liquid Glass boundary on iOS (glass only on floating controls, never on chart surfaces).

Asked whether to file a Jira story with full plan sync and draw three distinct options across both static `.dc.html`
boards and interactive Prototype v5, Arun answered "yes to both".

## What was wrong with the current charts

Captured in `docs/design/reviews/MA-295/current/` (`01` to `05`):
1. **The Home hero had no visual pulse:** net worth (`£444,951`) sat as static text over flat meters, giving no sense of
   how the recorded ledger moved across the week (`Thu 22 Oct £439,958` to `Mon 26 Oct £444,951`).
2. **Flat, lifeless SVG polylines:** line and fan charts used sharp polygonal segments (`L` commands), thin strokes, no
   endpoint presence, and no interactive scrubbing — hovering or dragging over a 20-year fan or 60-day price chart gave
   no point readout.
3. **Plain progress tracks without visual benchmarks:** budget spending and wealth-mix bars were plain flat fills with
   no visual 100%-plan tick mark on the bar itself.
4. **Disconnected diverging bars and boxy candles:** stance pillars lacked a unified zero spine and visual rhythm, and
   the 60-day market candles used raw sharp rectangles without interactive day-by-day close/range inspection.

## How it was drawn

- **One canonical figure set** (lesson 13): every chart reads directly from `docs/design/figures/household-v4.json`,
  `docs/design/figures/future-plans-v4.json`, and `docs/design/figures/forecaster-v4.json` (`Mon 26 Oct 2026`, prices at
  the `Fri 23 Oct` close, `£1 = ₹112.50`).
- **Zero new colour tokens** (lesson 11, lesson 27): every line, fill, band (`--mp-band`), empty track (`--mp-track`),
  candle (`--mp-up`, `--mp-down-quiet`), pillar (`--mp-pillar-for`, `--mp-pillar-against`) and surface uses the audited
  tokens in `tokens.css`, so Light, Dark and 25%-brightness contrast hold without touching shared stylesheets.
- **Both interactive Prototype v5 and three self-contained `.dc.html` canvases** (MA-260 rule — drawn directly in
  `docs/design/`):
  1. `docs/design/prototype-v5/` now includes a live **`Charts`** toolbar switcher (`A · Pulse`, `B · Editorial`,
     `C · Modular`, `Classic`, plus `?charts=a|b|c|classic`) and pointer/touch scrubbing across all 5 doors (`Desktop`,
     `Phone web`, `iPhone`, `iPad`, `Foldable`), Light & Dark, and Privacy mode.
  2. `docs/design/reviews/MA-295/build_boards.py` deterministically builds:
     - `docs/design/ds-v1/Chart options.dc.html`
     - `docs/design/ios-v1/iPhone v4 · Chart options.dc.html`
     - `docs/design/app-v1/Web v4 · Chart options.dc.html`
  3. `docs/design/reviews/MA-295/options.html` embeds all three options live side by side with synchronized screen,
     door, theme and privacy controls.

## The options

- **1a · Monzo Pulse (recommended; picked on 30 Oct 2026).**
  - Fritsch-Carlson monotone cubic splines (smooth curves that never overshoot real engine values) with a warm coral
    area wash and a double-ring endpoint beacon dot.
  - Recorded 5-day Home hero ledger pulse (`Thu 22 Oct £439,958 → Mon 26 Oct £444,951`), sculpted capsule meters with
    vertical 100%-plan tick marks and `▲`/`▼` variance words, centered zero-spine diverging pillars, rounded candles
    with smooth dual-band conformal fan, and floating pointer/touch scrub pills.
  - **Why recommended and picked:** brings Monzo's tactile warmth and immediate liveliness to the Home dashboard and
    analytical charts while keeping Warm ledger's calm card hierarchy and every Apple HIG accessibility guardrail.
- **1b · Apple Health Editorial (not picked; kept on the canvases as the record).**
  - Crisp editorial hairline grids and explicit left Y-axis benchmarks at rest, a three-stat summary header strip
    (`LOW / LATEST / HIGH` or `SPENT / PLAN / SURPLUS`) above each plot, jewel-like hollow dots, bullet-graph plan
    markers, and hollow-up / filled-down candles (pairing fill state with colour per Apple HIG).
  - **Trade-off:** highest resting typographic precision, quieter and less warm on the Home hero than `1a`.
- **1c · Monzo Modular Bento (not picked; kept on the canvases as the record).**
  - Proportional 5-day recorded column bars (`36%..100%`) in the Home hero, a ring/donut UK-India composition tile
    (`76% UK · 24% India`), 10-cell quantized Monzo pot pace meters, chip-badged diverging pillars, and a 24px **Daily
    Swing Rhythm Sub-Strip** (`high − low`) beneath the 60-day market candles.
  - **Trade-off:** high modular card variety and countable blocks, though 10-cell meters quantize visual progress into
    ~10% steps at rest (exact pounds remain in the row header).

## What the build touches (1a · Monzo Pulse picked)

- **Tokens and contrast gate:** zero new colour tokens needed — every spline, area wash, conformal band (`--mp-band`),
  empty track (`--mp-track`), 100%-plan tick, rounded candle (`--mp-up`, `--mp-down-quiet`) and zero-spine pillar
  (`--mp-pillar-for`, `--mp-pillar-against`) uses the audited tokens in `docs/design/ds-v1/tokens.css`, measured by
  `scripts/contrast_check.py` at full and 25% brightness.
- **Consolidated whole-wealth boards (`MA-279`):** when `MA-279` draws every whole-wealth screen once across web and
  iOS, its charts use `1a · Monzo Pulse` (`Chart options.dc.html`, `iPhone v4 · Chart options.dc.html`, and
  `Web v4 · Chart options.dc.html`).
- **The iOS app (`ios/`, phases 1 to 17; `MA-56`, `MA-181`, `MA-182`):** Swift Charts (`LineMark` with
  `.interpolationMethod(.monotone)`, `AreaMark` warm coral wash and conformal range `--mp-band`, double-ring endpoint
  beacon `PointMark`, sculpted capsule `BarMark` meters with `RuleMark` 100%-plan ticks, zero-spine diverging `BarMark`
  pillars, rounded `RectangleMark` candles, `chartXSelection` glass lollipop scrub with selection haptic, and
  `AXChartDescriptorRepresentable` audio graphs).
- **The web app (`web/`, phases 1 to 17; `MA-229`):** shadcn-svelte charts on LayerChart 2.9 for dashboard splines,
  conformal fans, sculpted capsule meters with 100%-plan ticks, monthly surplus columns and zero-spine pillars, plus
  lightweight-charts 5.2 for the 60-day rounded market candles and F8 pattern overlays, with 44 px pointer/touch scrub
  targets, `role="img"` spoken summaries, and `.mp-mask` privacy suppression.
- **Remaining screen-level states in each build phase:** empty/zero-history series, loading skeleton, stale-price badge,
  error state, AX5 Dynamic Type stacked stat headers, and `prefers-reduced-motion` instant-settle are built and tested
  on each phase's own UI story (`MA-181`, `MA-182`, `MA-56`, `MA-124`, and the phases 2 to 9 wealth screens).

## Checks run before Arun sees it

- `python3 docs/design/figures/make_prototype_v5.py --check`
- `python3 docs/design/reviews/MA-295/build_boards.py --check`
- `node scripts/prototype_smoke.js --selftest`, `node scripts/prototype_smoke.js`, and `node scripts/prototype_smoke.js --priv`
- `node scripts/board_fit.js --only "Chart options"` and `node scripts/board_fit.js --only "Prototype v5"` (Chromium and WebKit across `320..1920`)
- `python3 scripts/contrast_check.py --selftest` and `python3 scripts/contrast_check.py`
- `python3 scripts/plan_sync.py selftest` and `python3 scripts/plan_sync.py check`
- `python3 scripts/design_sync.py selftest`, `python3 scripts/design_sync.py record`, and `python3 scripts/design_sync.py check` (Boards Artifact stamp left for Claude Code per MA-260)
- `impeccable detect --json` across `prototype-v5`, `ds-v1`, `ios-v1`, and `app-v1`
- Visual inspection of 2x PNG captures across Light, Dark, all three options, scrubbing, and Privacy mode in `docs/design/reviews/MA-295/proposed/`.

## The pick

**1a · Monzo Pulse**, picked by Arun on 30 Oct 2026 after inspecting the live `localhost:8765` comparison hub, Prototype
v5 across doors, and the 2x before/after screenshots.

- All three canvases (`docs/design/ds-v1/Chart options.dc.html`, `docs/design/ios-v1/iPhone v4 · Chart options.dc.html`,
  and `docs/design/app-v1/Web v4 · Chart options.dc.html`) mark `1a` and its `S1..S3` / `W1..W2` states **Picked**, and
  `1b` and `1c` **Not picked** (kept on the canvases as the record).
- Prototype v5 defaults to `charts: 'a'` (`1a · Monzo Pulse`) across all five doors while keeping `B`, `C`, and
  `Classic` in the toolbar for reference.
- Recorded across `ARCHITECTURE.md` (§9.1, §9.4, §16, §19.7), `PLAN.md` (Phase 0 `MA-295` and Phase 11 `MA-56`),
  `docs/trace.json` (`MA-295` set to `design: "picked"` with `1a` and its state boards; `MA-279` and `MA-56` updated),
  `docs/TRACE.md`, Jira `MA-295`, and Confluence.
