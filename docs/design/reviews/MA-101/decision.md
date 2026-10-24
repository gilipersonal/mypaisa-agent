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
  regular 600 to 1023 (tab bar; one column until 760, then two equal columns), wide 1024 and up
  (sidebar 248, 1.3 : 1 columns with the list never under 300, capped at 1180).
- Telegram: Telegram draws bubbles, buttons and keyboards; MyPaisa owns the words, their order, the buttons
  offered, and the PNG images it sends (chart and summary cards in the hero navy with the coral line).

## Review for glitches

Every page was rendered and screenshotted in light and dark, and the prototype was clicked through
(push, back, sheet open and close, dark, privacy). Glitches found and fixed: icons tinted with a stance class
drew a coloured strip; the 3–6 px gaps did nothing (Claude Design's atomic gaps start at 8), so legends
touched their labels; Activity and Audit lost the tab bar; the Why? sheet sat over empty cards; flex
squashed the hero card inside a scrolling screen; a desktop scrollbar showed inside the phone; at 1440 the
four stat cards squeezed into the narrow column; at 1024 the list column was too tight.

### Round 2: independent review (Arun asked for it on MA-101)

Two fresh reviewers, neither of which made any page, rendered every page in light and dark at every
width it claims, clicked the prototype through, and measured contrast, targets and overflow.

- **Design system project** (directions, Foundations, Components, Telegram kit): 31 findings.
  Blockers: chart labels drawn as SVG text from data never render, so axes, months, stance pills and
  "your 8% alert" were blank. Buttons wrapped. A hero chart was clipped. Charts spilled out of their cards.
  Stat figures broke across lines.
- **App project** (Mini App, Browser, Responsive, Prototype, Telegram chats): 49 findings. Blockers: the
  same invisible chart labels; the phone frame on Responsive cut off its own last row; the regular size
  class broke at 600 to 760 (two 266 px columns, overprinted table headers, one-letter names).

What changed in `tokens.css` (this folder) as a result:

- Regular stays one column until each of two can be about 340 wide (760). Wide is 1.3 : 1 with the list
  never under 300. The sidebar is border-box.
- A charts block: the SVG draws lines and areas only; dots, labels and axis ticks are HTML over it
  (`.mp-chartbox`, `.mp-chartdot`, `.mp-chartlbl`, `.mp-chartaxis`).
- Fixed encodings shared by every page: technical pillars (blue for, amber against), currencies, the
  spend meter, the hero area fill. Green is for gains only.
- `.mp-track` keeps the empty part of a bar visible in dark. Links follow the theme. The dark selected
  segment is lighter than its track, as on iOS. Tabs share the bar, so five fit at 320. Sheets clear the
  home indicator. Buttons, big figures and Telegram buttons never wrap.

One data story for every page, so no two screens disagree:

- Track record: 20 of 31 stances held up (the buckets add to 20), over 6 graded weeks.
- NASDAQ 100: ▼ 1.2% on Friday, ▼ 3.1% this week, ▼ 8.4% from its high. That is just past the 8%
  alert, which the chart now shows crossed. The PAUSE horizon is the next 2 weeks, drawn ahead of the
  last close, with past stances (HOLD, ADD) marked where they were made.
- The asset mix is worked out from the holdings' values. The evening wrap is at 21:05. Run ids rise
  with time. Nothing before sign-in names a household member.

Navigation now follows Apple's guidelines. Holdings and More are list roots. A pushed page keeps the tab
it came from, and Back names where it goes. The More tab uses a menu icon, since Telegram draws its own
··· at the top right.

Green means good: gains with ▲, and status-OK marks (Done, verified, "Nothing to do this week"). It is
never a category, a progress bar or a meter. Asset mix, currencies, pillars and meters have their own
tokens. Privacy placeholders have their own colour, so they stay visible in dark.

**Checked after the fixes** (24 Oct 2026). Every page was rendered in a headless browser at 1440, in light
and dark. Boards that claim to adapt were reflowed to 1440, 1024, 768, 600 and 390. Measured on each:
no sideways scroll, no clipped or overprinted text, no blank chart labels or pills, no raw template
values, icons drawn as glyphs. In the prototype, a push keeps both screens on screen mid-slide, Why?
opens without dimming Telegram's header, and the tabs keep their place.

| Page | Project | What it holds |
| --- | --- | --- |
| [MyPaisa DS v1](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=MyPaisa+DS+v1.dc.html) | DS | The three directions, Mini App and browser, light and dark |
| [Foundations](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Foundations.dc.html) | DS | Colour, type, spacing, radii, motion, size classes |
| [Components](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Components.dc.html), [Components 2](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Components+2.dc.html) | DS | Buttons, lists, hero, stats, charts, navigation, sheet, toast |
| [Telegram kit](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Telegram+kit.dc.html), [controls](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Telegram+kit+controls.dc.html), [images](https://claude.ai/design/p/2f7310cd-e56a-4d13-8339-8fc637249c9a?file=Telegram+kit+images.dc.html) | DS | Cards, buttons, guided flows, the PNG chart and summary images |
| [Mini App](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Mini+App.dc.html) | App | Every Mini App screen, light and dark, scrolled and privacy states |
| [Browser](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Browser.dc.html), [Browser 2](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Browser+2.dc.html) | App | Overview, a holding, Overlap, Track record, Activity, Audit, Login |
| [Responsive](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Responsive.dc.html) | App | One Overview at 390, 600, 768, 1024 and 1440 |
| [Prototype](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Prototype.dc.html) | App | Clickable phone: tabs, push and back, the Why? sheet, dark, privacy |
| [Telegram chats](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Telegram+chats.dc.html) | App | The chat journeys: wrap, brief, stance, guided flow, red alert |

## The pick

Pending: Arun to choose 1a, 1b, 1c or "none of these". Recorded here and on MA-101 when made.
