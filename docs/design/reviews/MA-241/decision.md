# MA-241: a colourful icon for every kind of holding, asset and debt

Picked: **B, Settings squircles** (Arun, 27 Oct 2026: “I want to go for option set B for icons”). A was recommended; B
is the spec MA-241 builds. The options were drawn, checked and put through an independent review before the pick.

## The request, in Arun's words (27 Oct 2026)

> "For different Holding type, asset type and debt type, can we dynamically have some colourful icons? Monzo app is
> so beautiful like that, I need something similar."

Today every record row starts with a neutral grey tile holding two letters ("VG", "BA", "FP"). The request is for a
colourful icon chosen by the record's kind, at both doors (the iOS app and the web app).

## The board

- Repo copy: `docs/design/ds-v1/Kind icons.dc.html` (about 40 KB), for the MyPaisa DS v1 project. It is not written to
  Claude Design yet, so there is no claude.ai/design link yet and `docs/design/claude-design.json` does not record it.
  Until it does, `plan_sync.py check` reports the file as an unrecorded mirror file.
- It loads `tokens.css`, `ios.css`, `motion.css`, `motion.js` and `support.js` like the iOS boards do. Each option
  defines its colours as custom properties scoped to its own section (`.oA`, `.oB`, `.oC`). They are proposals. The
  picked option's values move into `tokens.css`, with their gate pairs, before any other board uses them (lesson 11).
- For each option the board shows:
  - the whole set grouped by family, in light and dark;
  - the fallback for a kind that has no icon yet;
  - the Assets list on iPhone, at the top and scrolled on, in light and dark;
  - the Debts list in the web app at desktop width, in light and dark.
- The intro holds the glyph map: every kind with its Material Symbols name (web) and its SF Symbol (app).
- Every figure comes from `docs/design/figures/household-v4.json`, on Mon 26 Oct at 09:41, after the Monzo savings
  record and before the 09:52 Home correction:
  - What you own: £691,694, made of Liquid £37,596 and Locked £654,098.
  - The six section totals: £30,504, £512,778, £7,092, £20,648, £117,650 and £3,022, which add up to £691,694.
  - You owe: £246,743.

## What every option shares

**One glyph per kind, the same at both doors.** The kind decides the glyph and the record never chooses its own.
Products that are the same in two countries share a glyph and the row says which country:
- an OEIC and an Indian mutual fund are both a fund (`donut_large`, `chart.pie`);
- a mortgage and an Indian home loan are both a loan on a home (`key`, `key`).

| Family | Kinds (Material · SF Symbol) |
| --- | --- |
| Cash and savings | Savings account (`account_balance` · `building.columns`), Cash and pots (`payments` · `banknote`) |
| Deposits and schemes | Fixed saver (`lock_clock` · `lock`), Fixed deposit (`hourglass_top` · `hourglass`), Recurring deposit (`event_repeat` · `calendar.badge.clock`), PPF (`verified` · `checkmark.seal`), EPF (`badge` · `person.text.rectangle`), NPS (`wb_twilight` · `sun.horizon`) |
| Investments | Shares (`show_chart` · `chart.line.uptrend.xyaxis`), ETFs (`stacked_line_chart` · `square.stack.3d.up`), Funds (OEIC) and Mutual funds (`donut_large` · `chart.pie`), Bonds and gilts (`description` · `scroll`), Gold and silver (`diamond` · `diamond`) |
| Pensions | Workplace pension (`work` · `briefcase`), SIPP (`beach_access` · `beach.umbrella`) |
| Property | Home (`home` · `house`), Flat or land (`apartment` · `building.2`) |
| Policies | Endowment (LIC) (`umbrella` · `umbrella`) |
| Debts | Mortgage and Home loan (`key` · `key`), Car loan (`directions_car` · `car`), Credit card (`credit_card` · `creditcard`), Personal loan (`request_quote` · `doc.text`) |

The capture checked every Material name: each one renders as a glyph, and none falls back to a word. The SF names are
standard SF Symbols, but they have not been checked on a device. The build adds a test that resolves each one
(below).

**One colour per family.** There are seven families. Two kinds in Investments take their own colour instead of blue:
Bonds and gilts, and Gold and silver. Their asset class already has a chart colour, so they keep it. That gives nine
colour classes:

| Class | Light | Dark | Source |
| --- | --- | --- | --- |
| Cash and savings: amber | #8A5300 | #F6BC4F | = `--mp-asset-cash` |
| Deposits and schemes: teal | #017272 | #57D4D4 | new |
| Investments: blue | #2453C9 | #8FB2FF | = `--mp-asset-shares` |
| Bonds: violet | #6B3FB8 | #B79CFF | = `--mp-asset-bonds` |
| Gold and silver: grey | #646A78 | #969FAE | = `--mp-asset-silver` |
| Pensions: orchid | #8C399E | #E495F0 | new |
| Property: sky | #1B709E | #8BCDF8 | new |
| Policies: plum | #782F53 | #D49FB7 | new |
| Debts: slate | #254A6E | #86B0D5 | new |

- **What is ruled out.** No family is green, because green means a gain. None is red or coral, because red is for
  alerts and coral is the accent. Debts are slate, which is calm and is the furthest colour from the alert crimson.
- **How the new colours were chosen.** They were placed in OKLCH as far from each other, and from the reserved
  colours, as the hue wheel allows. Nine families and four reserved colours crowd the wheel, so some pairs end up
  close.
- **The closest pairs.** In light the closest pair is 0.076 in OKLab. In dark it is 0.062, between gold and silver
  and debts. For comparison, the design system's own blue and violet are 0.073 apart in dark. Some close pairs do
  share a screen (deposits and property, 0.076; bonds and pensions, 0.077 in light and 0.072 in dark, all on Assets);
  their glyphs differ, and the section heading names the family. In A's dark set, investments, gold and silver,
  debts and property are four pale cool tones 0.062 to 0.076 apart, and at 25% investments, silver and debts nearly
  merge; B's vivid fills keep these apart.
- **Nearest to a meaning colour.** In dark, the policies plum is 0.069 from the alert pink. It is shown as an open
  question below.

## The options

### A. Filled circles, in the charts' own colours (recommended; not picked)

Monzo's approach: the family colour fills a circle, with a white glyph on it.
- **Light:** each fill is the class colour from the table above. For the four classes that already have a chart
  colour, the fill is that `--mp-asset-*` value exactly. The validator checks all eight of those values (four
  classes in two themes) for both A and C.
- **Dark:** the fill is the dark class colour and the glyph is dark ink (#0A0F18). The design system already follows
  this rule for the accent button and the alert badge.
- **The tokens:** nine `--mp-kind-*` tokens per theme, plus one `--mp-on-kind`.

**Why it is recommended.**
- **At 25% brightness:** a solid circle gives the strongest signal of the three options. Its glyphs never fall
  below 5.42:1 at full brightness or 2.65:1 dimmed, against limits of 3 and 1.8. Its tiles, measured on the card and
  on the page, never fall below 4.94:1 or 2.57:1 dimmed, against limits of 1.5 and 1.25.
- **The simulation agrees.** The 25% sheets (see "Evidence" below) show that A's families stay easy to tell apart in
  both themes. C's dark tiles nearly disappear.
- **With the navy hero and Warm ledger:** small solid circles below the hero look like Monzo's coloured circles below
  its card. They echo the hero's solid navy, and the coral accent stays the only warm red on screen.
- **In dark:** the fills lift to the charts' dark colours, so a list never turns into a row of dark holes.
- **It needs the least new design.** A holding is the same colour in its row as in the asset-class mix (shares, bonds,
  silver, cash). Not everywhere: Home's and the Dashboard's liquidity bar draws Liquid, Fixed and Locked in blue,
  violet and amber, the same hues A gives investments, bonds and cash, so under A that bar would need its own colours.

**Trade-offs.**
- It is the loudest of the three options. Seventeen coloured circles make a busy list, so colour stays on the lead
  tile and never reaches the name or the figure.
- In dark, A does not look like Monzo's dark mode: the fills are pastel with dark glyphs, where Monzo keeps white
  glyphs. Option B shows the white-glyph look.
- A two-letter monogram also passes the stricter text tier in 15 of A's 18 tile colours.

### B. Settings squircles, one vivid set for both themes

The iOS Settings approach:
- a rounded square (36 pt with radius 10, which is the shape the row lead already has);
- a brighter version of each class hue;
- a gentle gradient from top to bottom;
- a white glyph.

The same fills are drawn in light and dark, as Apple's own icons are.

**Best when the lists should feel like part of the system.** The tiles drop into every list without changing shape.

**Trade-offs.**
- **They do not match the charts.** The colours are not the chart colours, so a holding is one blue in its row and a
  different blue in the mix.
- **Its glyph margin at 25% is close to A's.** B's worst glyph on a vivid fill is 3.35:1 at full brightness and
  2.59:1 dimmed (property, light, at the gradient's lighter top stop); A's worst is 2.65:1 dimmed and C's 2.03:1. A
  monogram passes the text tier in only 4 of 36 stops. Separation is measured at one stop; at the top stop investments
  and property are 0.084 apart in OKLab.
- **Debts had to be dark.** To keep debts apart from property's sky blue, B's slate is deep. That leaves the weakest
  tile on the dark card: 2.20:1 at full brightness and 1.35:1 dimmed.
- **A texture Warm ledger lacks.** Warm ledger uses no gradient anywhere else.
- **They look like app icons.** Rows of glossy squares start to resemble a home screen.

### C. Soft tint, with the glyph in the charts' colour

The Apple Wallet and Health approach: a tile tinted with the family hue, and the glyph drawn in the chart colour
itself.
- **Light:** the tint is a mix of the vivid hue into the white card.
- **Dark:** the tint is a mix of the vivid hue into the dark card.
- **Strength:** each tint is the lightest that still passes presence (1.5:1 and 1.25:1) on both the card and the page.

This is the calmest option and the closest to the stance chips Warm ledger already has. The figures stay the loudest
thing in each row.

**Trade-offs.**
- **It is the least like Monzo.**
- **Mid pastels, not whispers.** To stay visible on the page at 25%, the tints must be mid pastels rather than pale
  whispers. Even so, the tiles sit at the limit: they fall to 1.54:1 at full brightness (investments on the light
  page) and 1.27:1 dimmed (bonds on the dark card).
- **Families are harder to tell apart at 25%.** The colour lives only in the glyph's strokes. The glyphs fall to
  3.18:1 at full brightness (property, light) and 2.03:1 dimmed (gold and silver, dark).
- **Monograms only reach the ui tier.** A monogram passes the ui tier, but never the text tier. It cannot, because a
  tint dark enough for text contrast would fail presence on the page.

## The kind spec: the proposed data shape

The `presentation` of a kind (ARCHITECTURE.md §4.1 and §4.8) gains two fields: a `family` and an `icon`.

```json
{
  "kind": "fixed_deposit",
  "version": 3,
  "presentation": {
    "family": "deposits",
    "icon": { "sf": "hourglass", "material": "hourglass_top" }
  }
}
```

- **`family`** is required. It is one of a closed list: `cash`, `deposits`, `investments`, `pensions`, `property`,
  `policies`, `debts`. The colour comes from the family, so a spec never holds a hex value.
  - The one exception is a kind whose `grouping.class` already has a chart colour (bonds, commodities). It takes that
    class's colour, so a holding matches the mix.
  - New colours are added only to `tokens.css`, never to a spec.
- **`icon`** is optional. It has two fields:
  - `sf`, an SF Symbol name, drawn in the app with the `.fill` variant;
  - `material`, a Material Symbols Rounded name, drawn on the web with FILL 1.
- **`icon_by`** is an optional addition. It lets one kind vary its glyph by one of the record's fields, still from the
  kind's data. Property uses it by `use`: `home` gives house; `let` and `land` give building.2, the board's "Flat or
  land".
  `{ "field": "use", "values": { "home": {...}, "let": {...} }, "default": {...} }`.
- **When an icon is set.** The agent proposes the family and the icon along with the rest of a new kind
  (`propose_kind`). The admin's approval card shows the tile, so a kind is approved with its icon.

## The fallback rule

1. When a kind has no `icon`, or has one that a door cannot draw, the record shows its family's tile with a
   two-letter monogram from the kind's label. "Cannot draw" means the app's `UIImage(systemName:)` returns nil, or the
   web's ligature does not render.
   - The monogram is the first letter of each of the label's first two words: "Sukanya Samriddhi" gives SS,
     "Premium Bonds" gives PB, "Gold loan" gives GL.
   - A one-word label gives its first two letters: "Gilts" gives GI.
2. A kind cannot be approved without a `family`, so the next fallback should never be needed. It is defensive only:
   - if a renderer meets a kind with no family, it draws today's neutral tile;
   - it also logs the kind, so the spec can be fixed.

## What the build would touch, once an option is picked

- **Tokens.** `tokens.css` gains:
  - `--mp-kind-cash`, `-deposits`, `-investments`, `-bonds`, `-metals`, `-pensions`, `-property`, `-policies` and
    `-debts`, in both themes, with the bonds, metals, investments and cash values equal to the `--mp-asset-*` ones;
  - `--mp-on-kind` for A, or the tint and glyph pair for C.
- **The gate.** The pairs go into `scripts/contrast_check.py` `PAIRS`:
  - ui pairs for the glyph on each tile;
  - presence pairs for each tile on the surface and on the page;
  - a selftest case that mutates one of them and expects the refusal.

  The tokens are then copied to `ios-v1` and `app-v1`.
- **The specimens.** A tile class (`.mp-kindtile`) replaces the monogram `.mp-row-lead` in the Components and iOS kit
  specimens.
- **Every board that draws a record row**, changed in one change (rule 5):
  - iPhone v4 · Assets and debts, Home, the iPad boards;
  - Web v4 · Assets and debts, Web v4 · Dashboard;
  - the Prototype v4 pages.

  Their trace rows move together.
- **ARCHITECTURE.md:**
  - §4.1, where the Kind's `presentation` gains `family`, `icon` and `icon_by`;
  - §4.8, where the kind specs carry their icon;
  - §9.1 and §9.4, where the tile appears in rows at both doors.
- **The kind specs** of phases 2 to 5 (MA-27, MA-28, MA-197 and the kinds after them): each gets its presentation.
- **The app.** A SwiftUI `KindTile`:
  - a circle or rounded rectangle, with `Image(systemName:)` and `.symbolVariant(.fill)`;
  - sized with `@ScaledMetric`, up to 1.5× at AX5;
  - `accessibilityHidden(true)`, because the row's label already names the kind;
  - colours from the generated colour assets (MA-165).
- **The web.** A Svelte `KindTile` on Material Symbols Rounded.
- **Two gates the review asks for**, so a missing glyph is caught by a command:
  - an XCTest that every kind's `sf` name resolves with `UIImage(systemName:)`;
  - a Playwright check that every `material` name renders as a glyph and not as a word (its width stays within 1.35×
    the font size, as this round's capture checked).

## Open questions for the build (B picked; none blocks the board)

These were raised by the independent review of the options (27 Oct 2026) and are Arun's to settle before MA-241's
build:

- **Four glyphs that may mislead.** Personal loan's `request_quote` draws a $ in a £ and ₹ household (proposed:
  `signature` · `signature`); shares' `show_chart` always trends up and is the sidebar's Projection icon (proposed:
  `candlestick_chart` · `chart.line.flattrend.xyaxis`); PPF's `verified` reads as a status in an app built on Confirm
  (proposed: `shield` · `shield`); gold and silver is a diamond (proposed: `workspace_premium` · `medal`). NPS's
  `wb_twilight` looks like a bell at 20 px, and SIPP and endowment are two umbrellas.
- **NPS's family.** NPS is a pension scheme, filed here under deposits and schemes (teal) because it arrives with
  them in phase 3; its colour could follow its asset class instead. Better still, the family could be derived from
  the kind's `grouping.class` through one fixed map, so the colour has one source.
- **"Holding type" may mean the account.** ISA, GIA, Demat and MF folio records (§4.8) get no tile here.
- **A kind the agent proposes after release.** An unknown Material name renders as its word inside the tile; the
  build checks `icon.sf` and `icon.material` against the pinned font's and the SDK's name lists when a kind is
  proposed and approved, and takes the monogram path for anything unknown.
- **The remaining states** design-first asks of a pick before the build: a long holding name, many holdings with
  More, a stale price, loading and empty, each with the new tile.

The questions asked before the pick follow, as they were.

1. **The dark glyph in A.** In dark, A uses the design system's rule of a lifted fill with a dark glyph. Arun may
   prefer Monzo's white glyphs in dark; that is B's look, and it could be applied to A's circles.
2. **The deposits section's name.** The Assets screen's section is called "Deposits and PPF" on P1. The family is
   "Deposits and schemes", because EPF and NPS will join it. The section could be renamed when they arrive.
3. **Shared glyphs.** Funds share one glyph, and so do mortgages and home loans, across the two countries. They could
   get one glyph each if Arun wants them told apart by icon.
4. **Policies in dark.** The dark policies plum is a dusty rose, 0.069 in OKLab from the dark alert pink. It is the
   closest any family comes to a meaning colour.
5. **SF names to confirm on a device:** `beach.umbrella`, `scroll`, `calendar.badge.clock`,
   `person.text.rectangle`, `sun.horizon`.

## Checks run

- **Contrast.** `contrast.txt` in this folder lists every pair for every option and theme, at full brightness and at
  25%: 54 pairs each for A and C, and 108 for B, which is measured at both gradient stops. Every pair passes. It also
  records how far apart the families are, and confirms the values that must equal the charts' colours. It is written
  by a validator that reads the colours back from the board itself, so what is drawn is what is measured.
- **The capture.** It rendered with `?static=1` in Chromium at 2×, with these results:
  - no icon fell back to a word;
  - no text runs off a frame or is clipped;
  - no two items in a row overlap;
  - no `{{ }}` was left unrendered;
  - there were no console errors.
- **Board checks.** `plan_sync.py`'s board checks (dates and weekdays, tools and motion roles) pass on the new board.
  `contrast_check.py` is unaffected, because the board sets no `--mp-*` token.

## Glitches found and fixed this round

- **Family notes on B.** The family notes said "the cash colour in every mix" on B, whose colours are not the charts'.
  The notes now name only the hue.
- **The hero's rate line.** It wrapped "£1 / = ₹112.50" across two lines. The rate now keeps together.
- **The glyph map.** Its empty last cell showed a grey block. The map now shows each glyph and draws its own cell
  lines.
- **B's slate.** Brightened like the rest, it came within 0.047 in OKLab of property's sky. B's debts are now a deep
  slate (0.088 from sky), which is still visible on the dark card.

## Evidence

The screenshots are kept in the session scratchpad, not in the repo: the sets, the phones, the browser rows, and two
sheets that simulate 25% brightness (`dim25-lists.png`, `dim25-sets.png`). The simulation uses contrast_check.py's
model: each pixel's luminance is multiplied by 0.25 and the room's 0.05 is added.

## The pick

**B, Settings squircles**, Arun, 27 Oct 2026: “I want to go for option set B for icons”. Recorded in
`docs/trace.json` (MA-241, design `picked`, board `B · Settings squircles, one vivid set for both themes`) and on the
issue. The build is MA-241's own branch: B's nine pairs into `tokens.css` with their gate pairs, the kind spec's
`icon` and `family`, then every record row at both doors.
