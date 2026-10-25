# MyPaisa DS v1 — "Warm ledger"

**Status: in force.** Arun picked direction 1a, Warm ledger, on 24 Oct 2026 (MA-101). Every MyPaisa screen is
designed in this system from now on; 1b Native clarity and 1c Pot wall stay on the directions page as the record.

The design system for MyPaisa: a household investment dashboard that opens as a Telegram Mini App on a phone and
in a laptop browser, plus the Telegram bot's cards. Monzo's warmth on Apple's Human Interface Guidelines bones.
The repo keeps a copy of `tokens.css` and the review record in `docs/design/reviews/MA-101/`.

## Files

| File | What |
| --- | --- |
| `tokens.css` | The single source: colour tokens (light and dark), type scale, spacing, radii, motion, component classes, fixed encodings (pillars, currencies, asset mix, meters, privacy masks), the chart pattern, the Telegram classes, the adaptive layout |
| `MyPaisa DS v1.dc.html` | The three directions compared; 1a picked |
| `Foundations.dc.html` | Colour with contrast ratios, type, spacing and radii, motion, icons, voice, layout and size classes |
| `Components.dc.html`, `Components 2.dc.html` | Every component with its states, light and dark; charts, navigation, sheet, toast |
| `Telegram kit.dc.html`, `Telegram kit controls.dc.html`, `Telegram kit images.dc.html` | The bot's messages, buttons, keyboards, guided flows and the PNG images it sends |

Screens live in the MyPaisa app v1 project (Mini App, Browser, Browser 2, Responsive, Prototype, Telegram chats,
and from MA-102 the Admin center and the Telegram second check). Those boards are the web app's spec.

## Using it

1. Link `tokens.css`. Put `mp` and a theme (`t-light` or `t-dark`) on the root; the Mini App sets the theme
   from Telegram's `colorScheme`, the browser from `prefers-color-scheme`.
2. Build pages on the adaptive shell: `.mp-app` (a size container) > `.mp-shell` > `.mp-shell-side` (sidebar,
   wide only) + `.mp-shell-main` > `.mp-pagepad` > `.mp-pagehead` + `.mp-cols` > `.mp-col`; `.mp-shell-tabs` is
   the tab bar (compact and regular only). Compact < 600 (one column); regular 600 to 1023 (one column until
   760, then two); wide 1024 and up (sidebar, 1.3 : 1, the list never under 300).
3. Use the classes, not new colours: `.mp-hero`, `.mp-card`, `.mp-group` + `.mp-row`, `.mp-chip` + a stance
   (`.mp-add` `.mp-hold` `.mp-pause` `.mp-trim` `.mp-reb` `.mp-watch`), `.mp-btn` variants, `.mp-seg`, `.mp-tabbar`,
   `.mp-side`, `.mp-sheet`, `.mp-mask`, `.mp-track`. Text-only meaning colours: `.mp-up`, `.mp-dq`, `.c-add` … `.c-alert`.
4. Charts: the SVG draws lines and areas only; dots, labels and axis ticks are HTML over it (`.mp-chartbox`,
   `.mp-chartdot`, `.mp-chartlbl`, `.mp-chartaxis`). Never a template value inside SVG `<text>`.
5. Icons: Material Symbols Rounded ligatures (`<span class="ms">home</span>`) on the web, SF Symbols in any
   native port. No emoji.

## Rules that hold everywhere

- Read-only web; every change is a card and a Confirm tap in the chat. The one exception (MA-102): the owner's
  security actions in the Admin center, behind a fresh check.
- Summary first; the detail one tap away.
- Every figure comes from the engine, never from the model.
- The bot never offers to trade. Stances are "a view, not advice".
- Privacy mode hides pounds, keeps percentages.
- Green means good: gains with ▲ and status-OK marks. Falls are quiet ink with ▼. Red only for alerts that ask
  for action. Never green for a category, a progress bar or a meter.
- WCAG 2.2 AA in both themes; 44 pt targets; colour never the only signal.
- Motion: transform and opacity only, nothing loops, Reduce Motion lands at once.
