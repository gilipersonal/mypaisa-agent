# Prototype v5: the builders' contract (MA-291)

> Integration, 30 Oct 2026: the files were built in `docs/design/app-v1/` and then moved to `docs/design/prototype-v5/`
> (see decision.md, "Where it lives"); `docs/design/reviews/MA-291/smoke.js` became the gate `scripts/prototype_smoke.js`,
> which also reads every frame for wrong weekdays, undefined tools, em dashes and Telegram. Paths below are as built.

Five builders draw the chapters at once. Read `decision.md` first (Arun's words, his choices, the spine,
the clock), then your spec file, then this. The core (controller, kit, styles, board) is written and tested;
build on it, never around it.

## Files: each builder writes only its own

| Builder | Phases | Chapter file (app-v1/) | Figure set (figures/) | Pages it registers |
| --- | --- | --- | --- | --- |
| Talk | 0, 1, 8 | `prototype-v5-ch-talk.js` | `make_talk.py` → `talk-v5.json` | `signin`, `search`, `activity`, `run`, `audit`, `files`, `file`, `you`, `admin` (and `admin/...`), `notifications` |
| Wealth | 2 to 7, 9 | `prototype-v5-ch-wealth.js` | (household-v4, future-plans-v4 as they are) | `home`, `assets`, `asset`, `debts`, `debt`, `budget`, `projection`, `plans` |
| Engine | 10 to 13, 15 | `prototype-v5-ch-engine.js` | `make_engine.py` → `engine-v5.json` | `holdings`, `holding` (the page and its tabs `overview`, `track`), `overlap`, `track`, `calls`, `today` |
| Forecast | 14, 16, 17 | `prototype-v5-ch-forecast.js` | `make_news_share.py` → `news-share-v5.json` | `news`, `proof`, the holding tabs `forecast` and `valuation` |
| Team | 18, 19, 20 | `prototype-v5-ch-team.js` | `make_team_india.py` → `team-india-v5.json` | `team` (and `team/...`), `india`, and phase 20's system surfaces (`step.system`) |

Never edit `prototype-v5.js`, `prototype-v5-kit.js`, `prototype-v5.css`, `Prototype v5.dc.html`,
`make_prototype_v5.py`, `prototype-v5-data.js` by hand, another builder's files, or any other board. If you need
a kit piece that is missing, write it inside your own file (a local function) and name it in your report. Your
own styles: inject one `<style id="pv5-<builder>">` from your file (once), every selector prefixed
`.pv5-<builder>`, every colour a `var(--mp-*)` or `var(--lg-*)` token, never a literal.

After writing your figure JSON, run `python3 docs/design/figures/make_prototype_v5.py` (it joins every set into
`prototype-v5-data.js`; the file is shared but regenerated, so running it is always safe).

## The data, `window.MP5D`

- `household` = `figures/household-v4.json` as it is (members, 16 assets, 4 debts, the totals at each step,
  `budget_oct`, `statements_oct`, `what_if`, `check_ins`, `projection`, `formatted`).
- `forecaster` = `figures/forecaster-v4.json` (`nasdaq`, `balanced`, `review`, `proof`, `clock`).
- `plans` = `figures/future-plans-v4.json`.
- `talk`, `engine`, `newsShare`, `teamIndia` = the new sets (null until written). Each `make_*.py` asserts
  every claim the boards make over its own figures (lesson 38: no asserts on typed-in literals), and checks
  every value it shares with household-v4 and forecaster-v4 against those files.

**Record ids** (use these everywhere; a link is `nav:<page>/<id>[/<tab>]`): assets `balanced`, `nasdaq`,
`robotics`, `silver`, `pot`, `home`, `saver`, `pension_arun`, `sipp_asha`, `pune`, `sbi_fd`, `ppf`, `lic`,
`ppfas`, `infosys`, `nre`, and the new record `monzo_savings` (from Mon 26 Oct 09:41); debts `mortgage`, `car`,
`hdfc`, `card`. The holdings the engine reads are `balanced`, `nasdaq`, `robotics`, `silver` (UK), and `ppfas`,
`infosys` (India, from phase 19); `pot` is cash, no stance.

**The rules engine's current stances** (forecaster-v4, the Fri 23 Oct close): `nasdaq` PAUSE 64%, `balanced`
HOLD 71%, `robotics` HOLD 58%, `silver` HOLD 62%. Its track records: `nasdaq` 31 of 46 calls held up, `balanced`
11 of 14. Every chapter shows these same stances; the Engine builder's figure set adds the pillars, the
confidence working and the household's track record, consistent with them.

## The clock

Today is Mon 26 Oct 2026; prices are at the Fri 23 Oct close; £1 = ₹112.50; the Saturday review ran Sat 24 Oct
09:00; the Forecaster is in practice, week 5 of 8 (grading Fri 30 Oct, Fri 6 Nov, Fri 13 Nov). Prototype v4's
frames: sign-in Mon 26 Oct 09:40, the first record 09:41, Home corrected 09:52, Sun 1 Nov statements 08:44,
Thu 5 Nov the HDFC EMI 09:12, the Projection Thu 5 Nov 10:05. `ctx.W` is the ledger as of the step's time:
`ctx.W.T` (the totals: `net_gbp`, `net_inr`, `own_gbp`, `owe_gbp`, `by_country_gbp`, `by_member_gbp`,
`liquid_gbp`), `ctx.W.homeValue`, `ctx.W.monzoSavings`, `ctx.W.octClosed`, `ctx.W.hdfcNovPaid`,
`ctx.W.pricesAt`. A market step dated before 09:41 on Mon 26 Oct shows net worth £439,951; after it, the
total the ledger gives. Every weekday must match its date (Oct 2026: Thu 1, Sat 3, Mon 5, Wed 14, Thu 15,
Fri 16, Tue 20, Thu 22, Fri 23, Sat 24, Mon 26, Tue 27, Fri 30, Sat 31; Nov: Sun 1, Mon 2, Thu 5, Fri 6,
Tue 10, Fri 13, Fri 20, Fri 27; Dec: Tue 1, Mon 14). `plan_sync.py check` refuses a weekday that disagrees.

## The API

```js
var M = window.MP5, K = window.MP5K;
M.page('holdings', function (ctx, args) {          // args: the parts after the id: 'holding/nasdaq/forecast' → ['nasdaq', 'forecast']
  return { title, sub, back: { t: 'Holdings', go: 'nav:holdings' } /* or omit */, chip: K.draft() /* or K.picked('Picked · 1a') */,
           right: '', tabs: [{ t, go, on }], body: '…html…' };
});
M.holdingTab('forecast', { t: 'Forecast', order: 2, draw: function (ctx, id) { return '…html…'; } });   // the Engine builder's `holding` page draws the tabs in order
M.chapter({ key: 'p17', n: '17', order: 17, title: 'The Forecaster beside the rules engine', short: 'Forecaster', steps: [ step, … ] });
```

`order` is the phase number (a chapter that spans phases uses its first; two chapters for one phase use 17,
17.5). `n` is what the chapter bar shows ('0', '1', … '20', or '2–3').

**A step:**

```js
{ id: 'p17-forecast', d: 'Mon 26 Oct', tm: '10:12', t: 'A holding’s Forecast',        // id unique across the prototype: prefix it with your chapter key
  g: 'What the guide line says: what to look at, what to tap.',
  page: 'holding/nasdaq/forecast',     // the page shown (string or function(ctx) → id); the chat shows beside it on desktop and iPad
  focus: 'page' | 'chat',              // which one a compact door (phone web, iPhone, the foldable) opens on
  chat: function (ctx) { return [K.daysep('Today'), K.me('…', '10:11'), K.ai('…', { cards: [K.ccard({...})], meta: '…' })]; },
  composer: { sug: ['£5,000 in Monzo savings', 'next'], typed: '…', files: ['statement.pdf'], ph: '…', chips: [[label, icon, key], …] },
  target: 'nav:holding/nasdaq/forecast',   // the key the guide's ring sits on; clicking it goes to the next step
  on: { 'some:key': 'next' | 'st:3' | 'nav:…' | function (st, M) { … } },   // other keys this step answers
  open: ['tech'],                      // fold states open when the step starts (ctx.has('tech'))
  sheet: function (ctx) { return html; },   // a sheet over the door (Why?, a second check)
  system: function (ctx) { return html; },  // phase 20: the Lock Screen, a widget, Siri: replaces the app's screen on iPhone, iPad and the foldable
  draft: true,                         // the screen is not yet picked: the guide shows Draft, not picked (also put K.draft() on the page or card)
  picked: 'Picked · 1a, MA-281',       // or say which pick it follows
  viewer: 'asha',                      // the step switches the viewer
  scroll: { page: 'anchor-id', chat: 'anchor-id' } }
```

**ctx:** `door` ('desk', 'pweb', 'ios', 'ipad', 'fold'), `web`, `app`, `compact` (pweb, ios), `wide` (desk,
ipad), `narrow` (fold), `dark`, `priv`, `viewer` ('arun', 'asha'), `isAdmin` (Arun only), `who`, `t` (ISO),
`d`, `tm`, `step`, `ch`, `W` (the ledger), `D` (= MP5D), `K`, `has(key)` (a fold or open state). Lay pages out
with `ctx.compact` (one column) and `ctx.wide` (`.grid2`, two columns); the page area is about 800 px on
desktop, 450 on iPad, 360 on the phones, 840 on the foldable.

**Keys the core answers:** `next`, `prev`, `nav:<page>` and `tab:<page|chat>` (open a page; the back stack
remembers), `back`, `fold:<k>` (toggle ctx.has(k)), `open:<k>`, `priv`, `viewer:<id>`, `door:<id>`,
`theme:<light|dark>`. Anything else must be the step's `target` or in its `on`, or it shows a "Not part of this
walk-through" toast.

**The kit, `window.MP5K` (read `app-v1/prototype-v5-kit.js` for the exact signatures):** `gbp(n, o)`, `inr`,
`usd`, `eur`, `money(n, ccy)`, `inrGbp(n)`, `pct(n, {sign, dp})`, `move(£, %)`, `ms(icon)`, `chip(t, cls,
icon)`, `stance(code, conf, {upper})` (ADD and BUY read **Buy**), `draft()`, `picked(t)`, `inpractice(t)`,
`shadow(t)`, `note(icon, t)`, `kv(k, v)`, `bar(frac, cls)`, `pillar(name, v, sub)`, `btn(t, key, kind, icon)`,
`cbtn(t, key, kind, icon)`, `seg([{t, go, on}])`, `tabs([...])`, `card({t, r, body, id})`, `hero({k, v, s,
top, extra})`, `tiles([{k, v, s}])`, `row({lead, icon, t, s, v, vs, go})`, `list(rows)`, `group(rows)`,
`section(t, body, r)`, `p(t)`, `foot(t)`, `viewNotAdvice()`, `editable({state, v, go, typed, from, to, save,
cancel})`, `daysep(t)`, `me(t, time)`, `typing()`, `ai(t, {cards, meta, icon})`, `ccard({chip, h, sub, body,
acts, fold: {t, open, go, body}, tech})`, `line({...})`, `candles({...})`, `spark(vals)`, `hbars([...])`,
`scales()`, `esc()`, `go(key)`. CSS helpers in `prototype-v5.css`: `.tiles .tile`, `.grid2`, `.lst`, `.bar`,
`.pill-meter`, `.sysnote`, `.tabsx`, `.lockscreen`, `.widget`, `.fx .col .ac .jb .wrap .g4…g16 .f1 .tr`,
`.mp-draft`; the kit's own: `.mp-card .mp-hero .mp-row .mp-group .mp-chip .mp-add/.mp-hold/.mp-pause/
.mp-trim/.mp-reb/.mp-watch .mp-alertchip .mp-neutral .mp-num .mp-num-l .mp-t1/.mp-t2/.mp-t3 .mp-hl .mp-sub
.mp-foot .mp-cap .mp-ink2 .mp-up .mp-seg .mp-btn*`, and in a chat card `.ccard* .kv .cbtn* .amber`; on the
iOS doors `.lg` (glass), `.notif`, `.lock`, `.lock-time`, `.lock-date`, `.sysalert`, `.faceid`.

## The rules every chapter keeps

From `.claude/skills/design-first/SKILL.md` (product rules) and `.claude/rules/independent-review.md` (the
lessons), the ones that bite here:

1. **The app cannot trade.** A stance is a signal with its reasons; no Buy or Sell button anywhere. "Buy" is
   only ever the label of an ADD or BUY stance chip. Every view carries `K.viewNotAdvice()` or "A view, not
   advice".
2. **Claude never produces a number.** Every figure is the engine's or the registry's; copy says so where it
   matters ("From the engine", the meta line under an answer).
3. **Create in the chat, correct in place.** No Add button, form or empty row on a page; Update or Ask opens
   the chat. A correction shows tap → before → after with Save → saved, and an audit row.
4. **The summary first;** the detail one tap away (`Why?`, `Technical`).
5. **Privacy:** every £, ₹, $ and € goes through `K.gbp`/`K.inr`/`K.usd`/`K.eur` (the smoke test's `--priv`
   flags any figure left showing). Percentages stay.
6. **In shadow / in practice:** stances stay in shadow until phase 15's gate (8 weeks beating doing nothing);
   the Forecaster is in practice until its own 8 weeks; say so on the screen, as the specs quote.
7. **Every weekday matches its date;** every figure adds up across steps, pages and doors (lessons 10, 13, 19).
8. **Tools named on a screen** (an Activity run, a meta line) come only from ARCHITECTURE §8's **Tools:**
   paragraph: `ask_user`, `chart_series`, `describe_kind`, `draft_event`, `draft_record`, `extract_document`,
   `get_audit`, `get_budget`, `get_commitments`, `get_events`, `get_history`, `get_holding`, `get_macro`,
   `get_networth`, `get_portfolio`, `get_scorecard`, `get_sentiment`, `get_signals`, `get_spend`, `get_stances`,
   `list_kinds`, `log_decision`, `propose_change`, `propose_kind`, `propose_plan_item`, `query_ledger`,
   `query_ledger_sql`, `rearrange_budget`, `run_projection`, `run_scenario`, `web_fetch`, `web_search`, and
   `memory`. Never `render_chart` or `read_file`. (Corrected 29 Oct: the first list missed half of §8.)
9. **No Telegram, no Mini App** anywhere (MA-278). Text on the web door says "the chat", on the app "the chat".
10. **Motion roles:** never put a `label` or `dot` motion attribute on anything; don't add `data-mp-*` motion
    attributes at all. Charts: use `K.line`/`K.candles` (each stroke in its own SVG, lesson 37).
11. **Draft:** a screen no pick covers carries `K.draft()` on its page (as `chip`) or its card, and the step
    says `draft: true`. A screen a pick covers says which (`picked`), and is drawn as the picked board draws it.
12. **No em dashes** in any text; use ·, a colon or a comma. Plain words, the specs' wording where they quote it.
13. **Every door works:** each step at desk, pweb, ios, ipad and fold, light and dark, with no page wider than
    its door (the smoke test checks), text never clipped, targets 44 px.

## Done means

1. Your figure script runs and asserts; `make_prototype_v5.py` rebuilt the data.
2. `node docs/design/reviews/MA-291/smoke.js --ch <n>` for each of your chapters: 0 faults, light and dark,
   every door; and again with `--priv`.
3. You looked at screenshots (`--shots <dir in your scratch>`, then read the PNGs) of every step at desk, ios
   and ipad, at least light, and fixed what looked wrong: clipped text, overlaps, empty halves, a figure that
   disagrees with another step.
4. Your report: the chapters and steps (id, date, time, title), the pages, which screens are Draft and which
   follow a pick, every place you had to choose something the docs leave open, and any kit piece you wrote
   locally. Do not commit; the integrator commits.
