# MA-291 spec: Phases 10 to 13 and 15: prices, briefs, research, track record, stances live

Extracted on 29 Oct 2026 from ARCHITECTURE.md, PLAN.md, docs/trace.json, the figure sets and the boards, as the prototype's source. Quotes are exact; "AR" is ARCHITECTURE.md.

I found 31 stories across phases 10 to 15, plus three that sit beside them (MA-114, MA-183, MA-78). Every one is still To Do. The UI stories are "planned" on the first-generation boards or "todo". Each one that cites a first-generation board lists MA-279's redraw as undrawn work. The Telegram boards are superseded by MA-161, and MA-291 says any screen not yet drawn goes into the prototype "marked Draft".

## 1. Screens by phase

**Phase 10, Prices and the engine** (MA-42 to MA-53, §5.1, §6). No story here has a UI (all `ui:false`). Two things still show:
- **Activity, price freshness and source comparison** (§9.3, PLAN p10 Maestro, MA-273). The Activity page "lists disagreements" between feeds. The iPhone Activity board shows "Schedule and price freshness", e.g. "Balanced · Thu NAV" and "Cash · no price".
- **Home, stale prices** (MA-42, MA-173): "Two prices are from Wednesday", "Today's move waits for fresh prices", "How MyPaisa finds a price". A failed source marks the valuation "provisional".
- From here on, stances are written daily but stay in shadow. Confidence v0 has no history term.

**Phase 11, Briefs, alerts, charts, technical mode** (§9.2, §11)
- **Morning brief, as a card and the Today screen** (MA-55, MA-57). Header: "The 07:15 brief · Fri 23 Oct · prices to Thursday's close". The answer comes first ("Nothing to do this week."), then "What moved", then the events line (MA-88, phase 14), then Technical (GBP/USD from ECB; "Prices 5 of 5 fresh · self-test ✓ 07:04"; news mood). Until the gate it carries no stance line (MA-57 notes).
- **Lock screen, morning brief**: "Morning brief". By default it shows no amounts: "Nothing to do this week. Balanced is steady." With Show amounts on: "Household £24,110, ▲ £96 · 0.4% today. …".
- **Evening wrap, 21:15**: not drawn on iPhone (in MA-57's undrawn list). The only wording is one line on the red-alert board: "Evening wrap. The household closed at £23,524, ▼ £786 today: …".
- **Red alert card** (MA-59). Fields: "Red alert"; headline "Balanced is 5.2% below its high"; "Why:"; "What would help:"; budget line "Red alert 1 of your 2 this week. No more on Balanced for 3 days unless it falls another 3%."; buttons Why? · I acted · Mute for a week.
- **Lock screen, red alert**: "Time Sensitive", "Tap to see why.", no amount.
- **Amber alert**: "Worth a look: Silver ETC fell 1.4% yesterday, past your 1% line. Nothing to do." with "Amber · no sound".
- **Notifications settings**: "Morning brief / 07:15 on weekdays"; "Evening wrap / 21:15, when your accounts move"; "Weekly digest / Saturdays"; "Red alerts / Time sensitive, with sound"; "Amber alerts / Silent"; "Quiet hours / 22:00 to 07:00 · only a critical alert rings"; banner "Changes are made in the chat."
- **Stance card with its Technical fold, and I acted** (MA-60, MA-64). The follow-up steps after I acted ("what did you do?", "decision logged") exist only on Telegram boards, so on iOS they are Draft.
- **Charts** (MA-56, MA-58): one house style; holding history with the stance horizon shaded; portfolio curve; ranges 1M 3M 1Y 5Y; an audio graph for VoiceOver.
- **Technical mode**: `simple` by default; `technical` expands every card. It can be set per card from its fold, or everywhere from You or `/technical`. The glossary opens on a tap.
- **Spend ladder** (MA-114, §15.1): the "Ceiling reached: templates only" board reads "Morning brief · 23 Oct · plain" and "The plain brief: the engine's figures, without words, until 3 Nov."
- **Dead man's switch** (MA-61, §10): at 07:45, to the owner in the Admin center and by push.

**Phase 12, Ask anything** (§7, §8)
- **Streaming reply** (MA-62): "Stance card · waiting for the engine's figures" ("never half a card").
- **Holding screen** (MA-183, MA-64, at every door):
  - Top: "Stance · in shadow | next 2 weeks | HOLD · 71% | Nothing to do"; "Would change if"; "HOLD on Balanced: 9 calls, 7 held up. A view, not advice."
  - Buttons: Why? · What if? · Ask about Balanced · Update value.
  - Technical: "Pillars, −2 to +2", Indicators, "Flags and the macro regime", "Data quality and range", the confidence sum, Sources.
- **Why? sheet**: "Why HOLD?" with three reasons, each with its source. A web quote is labelled "From the web · … · quoted", with the note "Web results are quoted with their source, never followed". Button "Ask more in the chat".
- **What if? sheet** (MA-67): "What if the pound falls 10%?"; "Try another | Pound +10% | Shares −20% | Your own"; "nothing is green and there is no ▲".
- **Research cards** (MA-63 to MA-66): holding profile, overlap review, fund vs benchmark ("✓ On track"), and bear vs bull ("Judge: slight bull." / "The stance stays HOLD 71%."). The last has a savers state at 85%: "Not argued this time." Fund vs benchmark and bear vs bull are listed as not drawn on iPhone.
- **Preference card** (MA-69): "New preference · check it"; "No alerts for moves under 2% in a day"; "What it changes:"; "Still comes:"; Confirm / Cancel.
- **Web holding page** (Browser B2), PAUSE wording: "Keep what you have; hold this month's top-up until the trend settles. Not a reason to sell." and "Cascade: holding → exhaustion ≥ 2 and risk elevated → PAUSE".

**Phase 13, Track record and calibration**
- **Scorecard, titled "Track record"** (MA-84, MA-78, §6.4, §9.3):
  - Subtitle: "Every stance, graded against doing nothing · 6 weeks", a gate meter "week 6 of 8", four stat tiles.
  - The calibration chart is "Said vs seen" on iPhone and "Does 64% mean 64%?" on the web.
  - The web board has a Recent stances table (Holding | Stance | Outcome) with Held up / Open / Missed, and the note "Held up means the move went the way the stance said, against waiting."
- **`/scorecard` card** (Research cards B8): buttons "Calls ▸ · Technical ▾ · Open dashboard"; glossary chips "Brier? Range?".
- **Overlap** (MA-65, MA-78): "Effective positions", "In US dollars … underneath", "Five companies are in both".
- **Saturday review** (MA-85, §8, §11): design is `todo`, with no iOS board. The only structure drawn is on the Telegram board (B9):
  - First message: "*Saturday review* · 4 weeks to Fri 30 Oct", then "My calls:", then "Your decisions and the signals".
  - Second message: "Does 70% mean 70%?", with the go-live week.
  - A Forecaster section, labelled "in practice".
- The graders (MA-81 to MA-83) have no UI.

**Phase 15, Stances go live**
- **Go-live gate** (MA-90): checked in code and "reported every Saturday". No UI.
- **Live stance chips on the Portfolio card and in the brief** (MA-91): design `todo`. The undrawn list names "the live stance chip", "the /calls list", and "the Buy label for ADD". The Telegram B12 board draws both states:
  - Before the gate: "Stances in practice: week 6 of 8. Until 8, only the Saturday review shows them."
  - After the gate: a Stance column, plus "Stances live: 8 weeks beating doing nothing. A view, not advice."
- **`/calls`** (B13): "Recent calls", Holding | Date | Call | Outcome, with "*Held up:* did better than doing nothing over its horizon. *Open:* still inside it".
- **Guardrail review** (MA-92): no UI.

## 2. Vocabularies

- **Stances** (§6.3):

  | Stance | For | Framing |
  | --- | --- | --- |
  | **ADD, shown as Buy** | a holding | "Buy more: make this month's contribution here, or bring it forward" |
  | **HOLD** | a holding | "Nothing to do" |
  | **PAUSE** | a holding | "Keep what you have; delay new money until the next review" |
  | **TRIM** | a holding | "Rebalance toward target; never 'sell everything'" |
  | **REBALANCE** | the portfolio | "Move the next contributions, not the holdings" |
  | **BUY** | a candidate not held | "Start a position with new money, from the next contribution" |
  | **WAIT / WATCH** | a candidate not held | "The trigger that would change it to BUY" |

  "Every card says **Buy** for ADD and for BUY" (MA-275). TRIM is the only call that sells, and only part.
- **Pillars**, each −2 to +2: Trend, Momentum, Macro, Risk, and Valuation (stocks only, later). Flags: exhaustion, relentless-bearish, rebound, death-cross. Macro regime words on the boards: "Broadening", "Transitional".
- **Confidence** (§6.4): `clamp(0.5 + agreement + persistence + quality + history, 0, 0.95)`, shown as a percentage. Below 55% the card says "no clear view". The board shows the working as "71% = 50 + 15 agree + 8 persist − 2 history".
- **Forecast range** (§6.5): over one month, the 10th/50th/90th percentiles and `P(fall > 5%)`. Board wording: "Range 1m: −4.8% … +4.1% · P(fall>5%) 8%".
- **Alert tiers** (§11): red (sound, at most two a week per member), amber (silent), and the digest. Plus cooldowns, quiet hours and the Haiku repeat filter. "News alone never triggers a red alert."
- **Brief and wrap**: the 07:15 brief has "what moved, why, anything to do" (§2), written once for the household and once per member. The 21:15 wrap goes "to whoever's accounts moved".
- **Research card types** (§7): every card has "a verdict from a fixed enum, a one-liner, evidence, a raw-data block, `dataSources` … `fetchedAt`, `generatedAt`".
  - `stance`: ADD · HOLD · PAUSE · TRIM · REBALANCE · WATCH
  - `fund-vs-benchmark`: on_track · lagging · ahead
  - `bear-vs-bull`: bull_wins · slight_bull · too_close · slight_bear · bear_wins
  - `holding-profile`, `overlap-review`, `scenario`: no enum
- **Scorecard metrics**, as the docs name them: "range coverage, `P(fall>5%)` calibration", "outcome at horizon, return vs doing nothing, by state bucket and confidence bucket; Brier score; reliability table" (PLAN 13). `ScoreDaily` adds hit rate, log loss, and rolling 30, 90 and 365-day values.
  - Board tiles: "Held up", "Vs doing nothing", "Inside the range / 80% range", "Brier score … 0.25 a coin toss".
- **Saturday review**: runs on Opus, "with the reflection step over the last four weeks". It "compares [I acted] with what the signals said" (§2). It holds the scoreboard (§20.4) and is the only place shadow stances appear (§11). At 85% of the ceiling it drops to Sonnet.
- **Commands**: `/why` `/whatif` `/calls` `/scorecard` `/technical` `/privacy` `/pause`. `/pause` is the kill switch. The PAUSE stance "only appears on a holding's card with its confidence, never as a command" (§16).

## 3. Product rules

- "Claude never produces a number." "The app cannot trade … only ISA-safe actions" (§1).
- "The layman sees the summary; the detail is one tap away … Nothing technical is shown unasked."
- Create in the chat, correct in place. The dashboard is read-only, and preferences change only through a Confirm card.
- "a view, not advice" on every view, and "No Buy or Sell anywhere". This needs reconciling with the new "Buy" label (see section 5).
- Shadow until 8 consecutive weeks above the baseline (§11, §16; PLAN principle 3).
- Protected positions are filtered before the cascade. Top-ups are capped by the member's preference.
- Privacy mode "hides pounds in every card, every screen and every notification", and keeps percentages.
- No amounts on the lock screen unless the member turns that on, and never with privacy on.
- About ten notifications a week, at most two with sound.
- Web text is quoted and never followed. The judge "never overrides the cascade's action".
- Sentiment may tilt the action one notch, only when the price pillars agree.
- Ladder: at 85% the debate is skipped, the review drops to Sonnet, Why? gets three searches a day and sentiment pauses. At 95% the brief, wrap and alerts go out as templates. Alerts are never dropped.
- Red marks the tier only, and green is only for a gain shown with ▲. These are board rules, not docs rules.

## 4. Figures on the first-generation boards

- **iPhone boards** (`iPhone dashboard`, `iPhone chat`). The UK holdings match household-v4 apart from small label differences. Total £24,110 on Fri 23 Oct:

  | Holding | Owner | Value | Day |
  | --- | --- | --- | --- |
  | Balanced | Arun · ISA · Monzo | £22,925 | ▲0.6% (£127) |
  | NASDAQ 100 ETF | Asha · ISA | £512 | ▼3.1% |
  | Robotics ETF | Arun · GIA | £304 | ▼3.4% |
  | Silver ETC | Arun · GIA | £188 | ▼2.0% |
  | Cash | Joint · Monzo pot | £181 | — |

  - Household: ▲£96, 0.4% today. This month is "▲ 2.1%" on the chat cards and "▲ 2.4%" on the holding screen.
  - Balanced stance: HOLD 71%, 2 weeks, "9 calls, 7 held up". §9.2 says "14 made, 11 held up", and `forecaster-v4.json` says 11 of 14.
  - Balanced Technical: Trend +2, Momentum +1, Macro +1, Risk 0; range −4.8% … +4.1%; P(fall > 5%) 8%.
  - Scorecard: 20 of 31 held up (65% on iPhone, 64% on the web); +0.7%; 79% inside the range; Brier 0.21. Reliability: 55–60% gives 7 of 12 (58%), 60–70% gives 10 of 16 (63%), 70%+ gives 3 of 3.
  - Red alert, Mon 26 Oct: £23,524, ▼£786.
  - Scenario: +£2,124. Overlap: 1.1 effective positions of 5; 59% in USD.
- **`Browser.dc.html`** uses a different household (£25,800):

  | Holding | Value | Stance |
  | --- | --- | --- |
  | Balanced | £18,640 | HOLD 71% |
  | NASDAQ 100 | £4,210 | PAUSE 61% |
  | Automation & Robotics | £1,730 | ADD 58% |
  | Physical Silver | £820 | PAUSE 58% |
  | Cash pot | £400 | — |

  - NASDAQ 100 Technical: pillars +2 / −1 / +1 / −2; P(fall > 5%) 14%; "3 made, 2 right".
  - Overlap: 1.6 of 4; 84% in dollars.
  - Recent calls: Silver PAUSE 58% (14 Oct) Held up; Balanced HOLD 71% (6 Oct) Held up; NASDAQ ADD 64% (29 Sep) Open; Robotics ADD 61% (22 Sep) Missed; NASDAQ HOLD 66% (15 Sep) Held up.
- **`Research cards.dc.html`**: £29,140 on Fri 30 Oct. NASDAQ is £4,210, Silver £820 and Cash £1,185, with no Robotics. After the gate (13 Nov): Balanced HOLD 72%, NASDAQ HOLD 63%, Silver PAUSE 58%. The "no clear view" example is Silver at 52%.
- **`forecaster-v4.json`** holds v4 rules-engine stances (phase 17 figures): NASDAQ PAUSE 64% (31 of 46), Balanced HOLD 71%, Robotics HOLD 58%, Silver HOLD 62%. Saturday review Sat 24 Oct, 09:00.
- **`Wealth.dc.html`** has no stance content of its own. Its sidebar groups the market pages as "Investing (Holdings, Overlap, Track record)".
- **Wording that has gone stale**:
  - "In shadow until phase 8": the gate is now phase 15.
  - ADD shown as "ADD" rather than "Buy".
  - §2 still lists chips as "Add · Hold · Pause · Trim", and the iPad board writes "Hold · 71%".
- **Indian holdings**: no market-side board includes Parag Parikh or Infosys. The Indian engine comes in phase 19 (§22.4).

## 5. Open or undefined (mark these Draft)

- **Where a stance may show before the gate.** §11 says "only in the Saturday review", but PLAN 12 and MA-183 put "Stance · in shadow" on the holding screen. Whether a stance card answers a chat question before the gate is unclear.
- **Buy versus "No Buy … anywhere".** The boards' no-button rule now has to sit beside the Buy label. §7's enum lacks BUY and WAIT.
- **What fires a red or amber alert, and Mute for a week.** No thresholds are defined beyond `prefs.thresholds`. The boards use 5.2% from high, "your 8% alert", "your 12% alert" and a 1% amber line. Mute isn't in the docs.
- **The baseline.** It is only "doing nothing", and "held up" has no formal definition.
- **Stance horizons.** Only `horizon_days` exists; the boards use 2, 4 and 6 weeks.
- **Verdicts for holding-profile and overlap-review** (MA-63 options round).
- **Screens with no board**: the evening wrap card, the Saturday review on iOS, I acted's follow-up steps, `/calls`, the live chip, fund vs benchmark and bear vs bull on iPhone, and the web pages at 390 wide.
- **Pre-gate brief.** The brief's exact sections and what the wrap contains beyond "what moved" are not fixed.
- **Which research cards carry pounds under privacy**: pending (MA-63, MA-160).
- **Freshness alarm.** The board says the alarm fires "once any price passes two days old". PLAN says the 07:45 alarm fires only "when every source has failed for two days".
- **UK and EU macro baskets** are an open question (§17).

## Files
- /Users/arundutta/projects/mypaisa-agent/ARCHITECTURE.md
- /Users/arundutta/projects/mypaisa-agent/PLAN.md
- /Users/arundutta/projects/mypaisa-agent/docs/trace.json
- /Users/arundutta/projects/mypaisa-agent/docs/design/ios-v1/iPhone dashboard.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/ios-v1/iPhone chat.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/ios-v1/iPhone settings.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/Browser.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/Research cards.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/Wealth.dc.html
- /Users/arundutta/projects/mypaisa-agent/docs/design/figures/household-v4.json
- /Users/arundutta/projects/mypaisa-agent/docs/design/figures/forecaster-v4.json
