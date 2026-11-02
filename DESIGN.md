---
name: MyPaisa Warm Ledger
description: Monzo warmth (navy hero card, coral/terracotta accent, rounded figures, plain words) on Apple HIG bones and Warm ledger paper.
colors:
  primary: "#C2381F"
  coral: "#FF6B4F"
  on-primary: "#FFFFFF"
  hero: "#13213A"
  hero-raised: "#1C2E4D"
  hero-ink: "#FFFFFF"
  hero-ink-secondary: "#B7C2D6"
  hero-up: "#8BE8AC"
  ground: "#F6F4F1"
  canvas-backdrop: "#ECEAE6"
  surface: "#FFFFFF"
  surface-raised: "#F0EDE8"
  ink: "#14171F"
  ink-secondary: "#4E5462"
  ink-tertiary: "#646A78"
  hairline: "#E4E0DA"
  chart-grid: "#ECE8E2"
  track: "#BEC1C8"
  privacy-mask: "#D0C9BE"
  privacy-mask-hero: "#3A5284"
  positive: "#1D7A3E"
  positive-soft: "#E2F2E7"
  alert: "#B5123F"
  alert-soft: "#FCE4EA"
  stance-hold: "#2453C9"
  stance-hold-soft: "#E5ECFB"
  stance-pause: "#8A5300"
  stance-pause-soft: "#FCEED6"
  stance-trim: "#B13A22"
  stance-trim-soft: "#FBE5DF"
  stance-rebalance: "#6B3FB8"
  stance-rebalance-soft: "#EEE7FA"
  currency-usd: "#2453C9"
  currency-gbp: "#4E5462"
  currency-inr: "#8A5300"
  currency-eur: "#6B3FB8"
  focus-ring: "#2453C9"
  night-ground: "#0A0F18"
  night-surface: "#151C27"
  night-surface-raised: "#1E2633"
  night-ink: "#F3F5F8"
  night-ink-secondary: "#C5CCD7"
  night-ink-tertiary: "#ADB6C4"
  night-hairline: "#283141"
  night-primary: "#FFAF9B"
  night-coral: "#FF7A5E"
typography:
  display:
    fontFamily: "ui-rounded, SF Pro Rounded, Nunito, -apple-system, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1.09
    letterSpacing: "-0.03em"
  display-compact:
    fontFamily: "ui-rounded, SF Pro Rounded, Nunito, -apple-system, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.11
    letterSpacing: "-0.03em"
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.21
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.21
    letterSpacing: "-0.02em"
  title-2:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: "-0.015em"
  title-3:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.29
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: "-0.01em"
  callout:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.31
    letterSpacing: "-0.01em"
  subheadline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "-0.01em"
  compact-ui:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.38
    letterSpacing: "0"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0"
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0"
  icon-sm:
    fontFamily: "Material Symbols Rounded"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
  icon-md:
    fontFamily: "Material Symbols Rounded"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1
  icon-lg:
    fontFamily: "Material Symbols Rounded"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  bar: "3px"
  tail: "6px"
  seg: "8px"
  inner: "9px"
  ctl: "10px"
  nav: "12px"
  row: "14px"
  sheet: "16px"
  panel: "18px"
  card: "20px"
  bubble: "22px"
  hero: "24px"
  dock: "26px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s8: "32px"
  s10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.row}"
    padding: "0 20px"
    height: "50px"
  button-tinted:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    padding: "0 20px"
    height: "50px"
  button-plain:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.row}"
    padding: "0 8px"
    height: "44px"
  card-ledger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  card-hero:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.hero}"
    padding: "20px"
  chip-stance:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: MyPaisa Warm Ledger

## Overview

**Creative North Star: "The Private Family Ledger"**

MyPaisa DS v1 ("Warm ledger", MA-101) combines Monzo's approachable warmth — a deep navy hero account card (`hero`), a crisp terracotta/coral accent (`primary`, `coral`), rounded hero numerals, and plain-spoken language — with Apple Human Interface Guidelines structure: Dynamic Type Large defaults (`17px` body), grouped inset lists, `>= 44×44` targets, semantic light and dark tokens, and legibility held even at `25%` mobile screen brightness (MA-181; measured on the built web app by MA-304, QA on request; iOS QA comes after MA-165, with no story yet; MA-303 stopped the board gate).

The system is **adaptive across two native materials** built on one token sheet (`docs/design/ds-v1/tokens.css`). On iPhone and iPad (`docs/design/ds-v1/ios.css`), navigation bars, floating tab pills, toolbars, partial sheets, and the chat composer float in iOS 26 **Liquid Glass** above Warm ledger content. On the Web PWA and Android foldables, Liquid Glass and iOS sheet grabbers step aside completely for crisp Warm ledger paper chrome, hairline dividers, and keyboard-first focus rings.

**Key Characteristics:**
- Warm stone-paper ground (`ground`) and white ledger cards/groups (`surface`) anchored by a single deep navy hero card (`hero`) for top-level net worth or projection totals.
- Dual-brightness contrast discipline: every foreground/background pair passes WCAG 2.2 AA (`7:1` body, `4.5:1` secondary text, `3:1` UI marks) and remains legible under the indoor `25%` screen-dimming model.
- Rounded hero figures (`SF Pro Rounded` / `Nunito`) paired with clean tabular system numerals (`font-variant-numeric: tabular-nums`) across GBP (`£`) and INR (`₹`).
- Strict material boundary: Liquid Glass carries floating controls on iOS/iPadOS only, never content cards and never Web PWA chrome.
- Layout-stable Privacy Mode (`privacy-mask` / `••••`) that redacts every currency balance, chart callout, scrub tooltip, and accessible `aria-label` in place.

## Colors

Warm stone-paper neutrals contrasted against a single deep navy hero card, terracotta/coral action and primary chart strokes, quiet everyday drawdowns (never alarm red for routine market dips), and fixed semantic encodings for stances, currencies, and asset classes.

### Primary
- **Terracotta Accent** (`primary`): Filled primary buttons (`.mp-btn-primary`), text links, active navigation labels, and primary chart strokes on light cards (`night-primary` lifts on dark surfaces so links hold at `25%` brightness).
- **Coral Signal** (`coral`): Chart lines, active dots, and brand marks on the dark `hero` card; never used for small text on light paper.
- **Navy Hero Card** (`hero`, `hero-raised`, `hero-ink`, `hero-ink-secondary`, `hero-up`): Signature account/net-worth summary card inspired by Monzo's account card.

### Secondary
- **Hold / Focus / Meter Blue** (`stance-hold` / `focus-ring` / `currency-usd`): Hold stance chips, secondary comparison series (`--mp-chart-2`), spend/budget meters, USD currency marks, and `3px` `:focus-visible` outlines.
- **Sterling Slate & Rupee Amber** (`currency-gbp`, `currency-inr`): Fixed currency encodings (`>= 3:1` on both `surface` and `track`, including at `25%` brightness).

### Tertiary
- **Emerald Gain** (`positive`, `positive-soft`): Positive gains (`▲`), Add stance chips (`--mp-add`), and funded states. Everyday downward moves use quiet slate (`ink-secondary` with `▼`), never alarm red.
- **Alert Crimson** (`alert`, `alert-soft`): Red-tier system alerts, overdue warnings, and destructive confirmations only — kept visually distinct from `primary` terracotta.
- **Pause Amber, Trim Rust & Rebalance Violet** (`stance-pause`, `stance-trim`, `stance-rebalance`): Fixed stance chips and multi-series chart strokes (`--mp-chart-4`, `--mp-chart-5`).

### Neutral
- **Warm Grouped Ground** (`ground` / `night-ground`): Screen background behind grouped lists and ledger cards.
- **Linen Board Backdrop** (`canvas-backdrop`): Multi-frame `.dc.html` design canvas backdrop (`.ios-canvas`); never rendered inside an app screen.
- **Ledger Surface & Raised Fill** (`surface`, `surface-raised` / `night-surface`, `night-surface-raised`): Cards, grouped inset rows, segmented tracks, and neutral chips.
- **Primary, Secondary & Tertiary Ink** (`ink`, `ink-secondary`, `ink-tertiary`): `17.9:1`, `7.6:1`, and `5.4:1` on light `surface` (lifted to `night-ink-secondary` and `night-ink-tertiary` in dark mode so dimmed `25%` brightness still exceeds `3.1:1`).
- **Ledger Hairline, Empty Bar Track & Privacy Masks** (`hairline`, `track`, `privacy-mask`, `privacy-mask-hero`): Structural `1px` dividers, clearly visible empty meter troughs, and unmistakable redacted balance pills.

### Named Rules
**The Quiet Drawdown Rule.** Green (`positive` with `▲`) is reserved for gains, while routine daily market dips use quiet secondary ink (`ink-secondary` with `▼`); crimson (`alert`) appears only on genuine red-tier alerts and destructive actions.

**The 25% Brightness Rule.** Every colour token lives in the top-level `:root, .t-light` and `.t-dark` blocks of `tokens.css` (and `.mp` / `.t-dark .mp` in `ios.css`) and must stay legible both at `100%` and at `25%` indoor screen luminance. The `contrast_check.py` gate that measured this on the boards was stopped by MA-303 (Arun, 2 Nov 2026); the rule is now measured on the built web app by MA-304, QA on request; iOS QA comes after MA-165, with no story yet.

## Typography

**Display / Rounded Figure Font:** `SF Pro Rounded` on Apple platforms, `Nunito` fallback (`ui-rounded, "SF Pro Rounded", "Nunito", -apple-system, system-ui, sans-serif`)
**UI & Body Font:** `SF Pro Text` on Apple platforms, `Inter` fallback (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif`)
**Technical / Audit Mono Font:** `SF Mono` (`ui-monospace, "SF Mono", Menlo, monospace`) for expandable technical working (`.ccard-tech`) and audit hashes

**Character:** Apple's Dynamic Type "Large" scale (`17px` body) keeps everyday reading effortless on mobile and desktop alike, while rounded `800`-weight hero figures give net-worth milestones tactile warmth without sacrificing tabular column alignment.

### Hierarchy
- **Display Hero Figure (`.mp-num-hero`, `.mp-num-l`)** (`800`, `44px/48px` and `28px/32px`, tracking `-0.03em` / `-0.02em`, `tabular-nums`): Primary net-worth and milestone totals (stepping to `36px/40px` below `375px` so long rupee totals never clip).
- **Large Title & Headlines (`.mp-large`, `.mp-t1`, `.mp-t2`, `.mp-t3`)** (`700`–`600`, `34px/41px`, `28px/34px`, `22px/28px`, `20px/25px`): Top-level navigation large titles and section headers.
- **Headline & Body (`.mp-hl`, `.mp-body`, `.mp-callout`, `.mp-sub`)** (`600` / `400`, `17px/22px`, `16px/21px`, `15px/20px`): Grouped row titles, conversational messages, and card subtitles.
- **Footnote & Caption (`.mp-foot`, `.mp-cap`)** (`400`, `13px/18px`, `12px/16px`, tracking `0`): Supporting row metadata, FX notes, axis ticks, and timestamps (`10px/12px` semibold used strictly on iOS system tab bar labels `.tab` / `.mp-tab`).

### Named Rules
**The Tabular Numerals Rule.** `.mp` sets `font-variant-numeric: tabular-nums` globally so every currency figure, delta, percentage, share count, and scrub readout aligns without horizontal jitter.

**The No-Clip Reflow Rule.** Flex and grid cells never rely on `text-overflow: ellipsis` for financial figures; below narrow container thresholds (`374px`, `359px`, `699px`), key-value pairs and table columns wrap or scroll horizontally inside their card. The `board_fit.js` gate that measured this on the boards was stopped by MA-303; the rule is now measured on the built web app by MA-304, QA on request, with the 320 to 1920 width sweep.

## Layout

Spacing runs on a `4px` grid (`s1` = `4px` through `s10` = `40px`). Layout adapts by **container inline-size** (`container: app / inline-size` and `container: page / inline-size` on Web; `container: screen / inline-size` on iOS/foldable frames) rather than device sniffing.

Chat placement obeys one canonical rule across all surfaces: **beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over).** An iPhone is always compact in either orientation.

- **Compact (`< 600px`):** Single column, `14px 16px 104px` page padding, bottom tab navigation (`5` slots on Web `<= 1023px`: `Home`, `Assets`, `Projection`, `Chat`, `More`; floating Liquid Glass tab pill + `Search` orb on iPhone).
- **Regular (`600px`–`1023px` Web / `600pt`–`1132pt` iPad & Foldable Open):** `20px 24px` gutters, two-column card grids from `760px` where each column keeps `>= 340px`, inspector chat hidden below `1133pt` so the ledger keeps full room, and chat opened as a sheet via `Ask` / `Chat`.
- **Wide (`>= 1024px` Web / `>= 1133pt` iPad):** `248px` Web sidebar (`280px` iPad glass sidebar), main page capped at `1180px` (`1.3fr : 1fr` columns when the page container itself is `>= 700px`, collapsing cleanly to `1` column when the docked `340px`–`380px` chat column narrows the page below `700px`).

## Elevation & Depth

Content cards sit on warm paper (`ground`) with soft ambient contact lift (`--mp-shadow: 0 1px 2px rgba(20, 23, 31, 0.06), 0 8px 24px rgba(20, 23, 31, 0.06)`), while grouped lists (`.mp-group`) stay flat and separate rows with `0.5px`-scaled inset `hairline` dividers.

### Shadow & Material Vocabulary
- **Warm Ledger Card Shadow (`--mp-shadow`):** Soft two-layer ambient shadow on `.mp-card`, `.ccard`, and active `.mp-side-i.on` rail items.
- **iOS Liquid Glass (`.lg` in `ios.css`):** `--lg-fill` (`rgba(255, 255, 255, 0.86)` light / `rgba(24, 30, 40, 0.86)` dark) with `backdrop-filter: blur(18px) saturate(190%)`, specular inner rim (`--lg-edge`), and floating lift (`--lg-lift`). Under `@media (prefers-reduced-transparency: reduce)` or `.rt`, `.lg` resolves to opaque `--mp-surface` with `backdrop-filter: none`.

### Named Rules
**The Content-Off-Glass Rule.** Content (the navy hero, ledger cards, grouped rows, charts, and chat messages) is never glass, glass never sits on glass, and the Web PWA never renders iOS Liquid Glass (`.lg`) or `.sheet-grab` handles. Labels on iOS glass use `ink` or `ink-secondary`, never `ink-tertiary`.

## Shapes

Corner radii step concentrically from inner controls to outer containers: `10px` (`ctl`) on segmented controls and icon tiles; `14px` (`row`) on grouped inset lists and `.mp-btn` buttons; `16px` (`sheet`) on bottom sheets; `20px` (`card`) on ledger and chat cards; `24px` (`hero`) on the navy hero card; and `999px` (`pill`) on stance chips, progress tracks, floating glass pills, and chat action buttons.

Charts draw SVG strokes with `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke` directly inside each chart's SVG (never stretching stroked `<defs>` via `<use>`), while dots, callouts, and axis labels render as sharp HTML overlays positioned in percentages. Progress tracks (`.mp-track`) clip inner fills while `.has-tick` + `.mp-track-clip` let `100%` plan benchmark ticks overhang cleanly without right-edge clipping.

## Components

### Buttons
- **Shape & Sizing:** `14px` radius (`50px` min-height on `.mp-btn`, `44px` on `.mp-btn-small` and `.mp-btn-plain`; `999px` capsule `44px` min-height on chat card `.cbtn`).
- **Variants:** `.mp-btn-primary` (`primary` `#C2381F` fill, `on-primary` `#FFFFFF` label), `.mp-btn-tinted` (`surface-raised` fill, `ink` label), `.mp-btn-plain` (transparent fill, `primary` label).
- **Hover, Active & Focus:** `:hover` preserves explicit foreground contrast (`color: var(--mp-on-accent)` on primary buttons so link hover rules never bleed in); `:active` scales gently to `0.97`; `:focus-visible` renders `3px solid` `focus-ring` (`#2453C9` light / `#8FB2FF` dark) at `2px` offset.

### Chips
- **Stance & Filter Chips (`.mp-chip`, `.gchip`):** `999px` capsule, `13px/18px` semibold on semantic washes (`.mp-add`, `.mp-hold`, `.mp-pause`, `.mp-trim`, `.mp-reb`, `.mp-watch`, `.mp-neutral`). Interactive compact chips expand their touch area to `>= 44px` via invisible `::after` hit-slop without altering visual height.

### Cards / Containers
- **Navy Hero (`.mp-hero`):** `24px` radius, `20px` padding, `hero` (`#13213A`) fill, `hero-ink` figures, `hero-up` gain pills, and coral sparkline/fan bands (`--mp-band`).
- **Ledger & Chat Cards (`.mp-card`, `.ccard`, `.mp-group`):** `20px` card radius (`14px` grouped list radius), `surface` fill, `16px` padding. Chat cards append `.ccard-acts` confirmation buttons and an optional `.ccard-fold` / `.ccard-tech` monospace working drawer.

### Inputs / Fields
- **Chat Composer (`.cfield` / Web composer):** `>= 48px` capsule input paired with `48px` attachment button (`.cplus`) and `>= 44×44` hit-area send/voice trigger (`.csend`), plus horizontal shortcut chips above.

### Navigation
- **Web Desktop (`>= 1024px`):** `248px` `.mp-side` rail with `Search` trigger, grouped routes (`Home`, `Assets`, `Debts`, `Budget`, `Projection`, `Reports`, `Holdings`, `Forecast`, `Proof`, `Household`, `Activity`, and `Admin center`), and `.mp-side-i.on` elevated in `surface` with `primary` icon.
- **Web Compact (`<= 1023px`):** Clean `48px` mobile web top bar + 5-tab bottom bar (`Home`, `Assets`, `Projection`, `Chat`, `More`), where `More` opens a Warm ledger drawer (`Escape`-dismissible) containing `Search` and all remaining routes.
- **iOS & iPadOS:** Floating Liquid Glass `.tabdock` + `.tabsearch` orb on compact iPhone; `280px` floating glass `.sidebar` on iPad (`Ask` sheet from `600pt`–`1132pt`; docked inspector chat from `1133pt`).

## Do's and Don'ts

### Do:
- **Do** route every displayed currency value, chart `aria-label`, and scrub tooltip through Privacy Mode masking (`privacy-mask` / `••••` / `aria-label="Hidden"`) when Privacy is active.
- **Do** put `aria-hidden="true"` on every decorative `.ms` Material Symbols ligature span and provide explicit `aria-label` attributes on icon-only controls.
- **Do** keep all colour tokens inside the top-level `:root, .t-light` and `.t-dark` blocks (mirrored identically in `@media (prefers-color-scheme: dark)` for unforced roots) and sync `ds-v1/{tokens.css,ios.css,motion.css,motion.js}` byte-for-byte to `ios-v1/` and `app-v1/` by hand (no gate measures the copies since MA-303).
- **Do** support keyboard `:focus-visible`, `Escape` dismissal on modals/sheets, and `pointerup` / `ArrowLeft` / `ArrowRight` on interactive `[data-scrub]` charts.

### Don't:
- **Don't** leak iOS Liquid Glass (`.lg`), `.sheet-grab` handles, or fake `44px` iPhone notch padding onto Web PWA screens.
- **Don't** write unscoped `a:hover` rules on boards that override `.mp-btn-primary` text colour, or reference undefined CSS variables (`--mp-uk`, `--mp-in`).
- **Don't** clip `100%` plan benchmark ticks inside `overflow: hidden` tracks — use `.has-tick` with an inner `.mp-track-clip` / `.bar-clip` fill wrapper.
- **Don't** draw stroked chart paths inside `<defs>` referenced via `<use>` on `preserveAspectRatio="none"` SVGs, or introduce multi-field CRUD creation forms outside the chat.
