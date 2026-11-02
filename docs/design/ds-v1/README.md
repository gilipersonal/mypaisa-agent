# MyPaisa DS v1 — "Warm ledger"

**Status: in force.** Arun picked direction 1a, Warm ledger, on 24 Oct 2026 (MA-101). Every MyPaisa screen is
designed in this system from now on; 1b Native clarity and 1c Pot wall stay on the directions page as the record.

The design system for MyPaisa: a household investment app, a chat and a dashboard in one, native on iPhone and
iPad (MA-161), with the dashboard and the Admin center read-only on the web as a PWA. Monzo's warmth on Apple's
Human Interface Guidelines bones, with Liquid Glass as the layer of controls in the app. The repo keeps a copy of
`tokens.css` and the review record in `docs/design/reviews/MA-101/`.

## Files

| File | What |
| --- | --- |
| `tokens.css` | The single source: colour tokens (light and dark), type scale, spacing, radii, motion, component classes, fixed encodings (pillars, currencies, asset mix, meters, privacy masks), the chart pattern, the adaptive layout |
| `ios.css` | The iOS layer over `tokens.css` (MA-161): Liquid Glass (`.lg`, the tinted `.lg-tint`, Reduce Transparency's `.rt`), the device frames, navigation and large titles, the tab bar and sidebar, the chat and its cards, the composer, sheets, menus and alerts, the lock screen and notifications, the app icon, and the canvas furniture the iOS boards share |
| `motion.css`, `motion.js` | The motion system as the boards draw it (MA-182): the curves, durations and stagger, each frame's arrival as it scrolls into view, figures rolling to their value, the sliding lens, a replay chip per frame; `?static=1` for still captures |
| `MyPaisa DS v1.dc.html` | The three directions compared; 1a picked |
| `Foundations.dc.html` | Colour with contrast ratios, type, spacing and radii, motion, icons, voice, layout and size classes |
| `Components.dc.html`, `Components 2.dc.html` | Every component with its states, light and dark; charts, navigation, sheet, toast |
| `iOS kit.dc.html` | The native app's kit, light and dark (MA-161): Liquid Glass layers, colour in the app, type and Dynamic Type, the tab bar and sidebar, toolbars and the composer, messages and cards, buttons, chips and controls, sheets, menus and alerts, charts, the app icon, accessibility (with 25% brightness) and motion |

The iOS app's screens are in the MyPaisa iOS v1 project (MA-161): the shell options, sign-in, the chat, the
dashboard, audit and activity, the Admin center, settings, iPad and the foldable. Those boards are the app's spec.
The web app's browser boards live in MyPaisa app v1 (`docs/design/app-v1/`); the earlier Telegram and Mini App files were retired from the live repo in MA-278.

## Using it

1. Link `tokens.css`. Put `mp` and a theme (`t-light` or `t-dark`) on the root; the app follows the system's
   appearance, the web app `prefers-color-scheme`.
2. On the web, build pages on the adaptive shell: `.mp-app` (a size container) > `.mp-shell` > `.mp-shell-side` (sidebar,
   wide only) + `.mp-shell-main` > `.mp-pagepad` > `.mp-pagehead` + `.mp-cols` > `.mp-col`; `.mp-shell-tabs` is
   the tab bar (compact and regular only). Compact < 600 (one column); regular 600 to 1023 (one column until
   760, then two); wide 1024 and up (sidebar, 1.3 : 1, the list never under 300).
3. In the app's boards, link `ios.css` after `tokens.css` and draw each screen in a `.dev` frame: glass (`.lg`)
   only on the controls, the content solid. The app lays itself out by size class: the glass tab bar when compact,
   the sidebar when regular, the chat beside every screen when wide. The iOS kit shows every part.
4. Use the classes, not new colours: `.mp-hero`, `.mp-card`, `.mp-group` + `.mp-row`, `.mp-chip` + a stance
   (`.mp-add` `.mp-hold` `.mp-pause` `.mp-trim` `.mp-reb` `.mp-watch`), `.mp-btn` variants, `.mp-seg`, `.mp-tabbar`,
   `.mp-side`, `.mp-sheet`, `.mp-mask`, `.mp-track`. Text-only meaning colours: `.mp-up`, `.mp-dq`, `.c-add` … `.c-alert`.
5. Charts: the SVG draws lines and areas only; dots, labels and axis ticks are HTML over it (`.mp-chartbox`,
   `.mp-chartdot`, `.mp-chartlbl`, `.mp-chartaxis`). Never a template value inside SVG `<text>`.
6. Icons: Material Symbols Rounded ligatures (`<span class="ms">home</span>`) on the web, SF Symbols in any
   native port. No emoji.
7. Motion: link `motion.css` and load `motion.js` after the other two; board 12 of the iOS kit gives what each
   moment ships as in SwiftUI and on the web.

## Rules that hold everywhere

- Read-only web; every change is a card and a Confirm tap in the chat. The one exception (MA-102): the owner's
  security actions in the Admin center, behind a fresh check.
- Summary first; the detail one tap away.
- Every figure comes from the engine, never from the model.
- MyPaisa never offers to trade. Stances are "a view, not advice".
- Privacy mode hides pounds, keeps percentages.
- Green means good: gains with ▲ and status-OK marks. Falls are quiet ink with ▼. Red only for alerts that ask
  for action. Never green for a category, a progress bar or a meter.
- WCAG 2.2 AA in both themes; 44 pt targets; colour never the only signal.
- Legible at 25% screen brightness in light and dark (MA-181). `scripts/contrast_check.py` measured every pair on the boards until MA-303 stopped it (Arun, 2 Nov 2026); the floors are now measured on the built web app by MA-304, QA on request; iOS QA comes after MA-165, with no story yet.
- Liquid Glass only on the layer of controls: content is never glass, and glass never sits on glass.
- Motion: transform and opacity only, nothing loops, Reduce Motion lands at once.
