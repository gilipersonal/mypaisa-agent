# MA-101: a new MyPaisa design system, and the screens

## The request, in Arun's words (23 Oct 2026)

> "I need designs now for the dashboard and miniapp, a new design system based on Monzo app
> (https://monzo.com) and https://developer.apple.com/design/human-interface-guidelines. Based on the plan
> and research, come up with the best screen design prototype (light and dark mode) and also components
> that will come up on telegram app."
>
> "The designs needs to be all done on claude design, including the design system and the screens."
>
> "Make sure the designs are reviewed properly for any kind of glitches, this app will be adaptive and
> responsive."

## Where the designs are

Claude Design is the home for these designs (Arun's instruction). This folder keeps the record and the
design system's single source of truth, `tokens.css`, a copy of the one in both projects.

| Project | What | Link |
| --- | --- | --- |
| MyPaisa DS v1 | The three directions side by side; Foundations; Components; the Telegram kit; `tokens.css` | <https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a> |
| MyPaisa app v1 | Mini App screens (light, dark); Browser pages; Responsive (390, 768, 1024, 1440); clickable Prototype with motion; Telegram chat journeys | <https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7> |

## The options

| Id | Name | In one line |
| --- | --- | --- |
| 1a | Warm ledger (recommended) | Monzo's warmth on Apple's bones: a navy hero card, one coral accent, rounded figures, grouped inset lists, Apple's type sizes and tab bar |
| 1b | Native clarity | Apple's Wallet and Stocks: system colours, a large-title number, no hero card, blue as the only accent |
| 1c | Pot wall | Monzo turned up: a coral block, every holding a coloured pot tile |

**Why 1a:** the summary reads in one glance (one number, one line, one chart, then "Nothing to do this
week"); falls are quiet ink with ▼ and red is kept for alerts that ask for action; it feels native inside
Telegram on an iPhone; it carries enough MyPaisa character without copying Monzo. 1b reads like a settings
screen and hides stances; 1c spends colour on decoration and sits closest to Monzo's own look.

## The system (1a) in short

- Colour: warm ground `#F6F4F1` / `#0A0F18`, white / `#151C27` surfaces, ink `#14171F` / `#F3F5F8`, navy hero
  `#13213A` / `#1A2944`, coral `#FF6B4F` for marks, `#C2381F` / `#FF7A5E` for text and buttons, six stance
  pairs. Every text pair measured WCAG 2.2 AA in both themes.
- Type: the system font (SF Pro on Apple), Apple's Dynamic Type sizes (34 / 28 / 22 / 20 / 17 / 16 / 15 / 13
  / 12), SF Pro Rounded for hero figures, tabular figures everywhere.
- Shape: 4 pt grid; radii chip 999, control 10, row 14, card 20, hero 24, sheet 16; 44 pt targets.
- Motion: ease (0.22, 1, 0.36, 1) and the iOS sheet curve (0.32, 0.72, 0, 1); 120 / 200 / 350 / 420 / 600 /
  700 ms; transform and opacity only; nothing loops; Reduce Motion lands at once.
- Adaptive: one markup, three size classes by container width: compact under 600 (one column, tab bar),
  regular 600 to 1023 (two columns, tab bar), wide 1024 and up (sidebar, 1.3 : 1 columns, capped at 1180).
- Telegram: Telegram draws bubbles, buttons and keyboards; MyPaisa owns the words, their order, the buttons
  offered, and the PNG images it sends (chart and summary cards in the hero navy with the coral line).

## Review for glitches

Every page was rendered and screenshotted in light and dark, and the prototype was clicked through
(push, back, sheet open and close, dark, privacy). Glitches found and fixed: icons tinted with a stance class
drew a coloured strip; the 3–6 px gaps did nothing (Claude Design's atomic gaps start at 8), so legends
touched their labels; Activity and Audit lost the tab bar; the Why? sheet sat over empty cards; flex
squashed the hero card inside a scrolling screen; a desktop scrollbar showed inside the phone; at 1440 the
four stat cards squeezed into the narrow column; at 1024 the list column was too tight.

## The pick

Pending: Arun to choose 1a, 1b, 1c or "none of these". Recorded here and on MA-101 when made.
