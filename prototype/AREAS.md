# Building an area of the demo (MA-290)

The demo is one Svelte 5 app in `prototype/`. Everything a member sees is a **page** (a `PageSpec` of blocks and
parts) or a **chat flow** (beats: lines, questions with chips, cards, a Confirm card). Each area registers its pages,
flows, event appliers and composer suggestions in its own folder, `src/areas/<area>/`. Nothing else in the app knows
an area by name. **A lane edits only its own folder and its own test file `tests/<area>.test.ts`.** If you need
something changed outside your folder, say so in your report; do not change it.

Read first: `src/state/model.ts` (the state), `src/state/registry.ts` (the contract: `PageSpec`, `PagePart`, `Flow`,
`Beat`, `Area`), `src/areas/kit.ts` (the builders), `src/areas/home/index.ts` (the worked example: a page, and the
core appliers), `src/state/reduce.ts` (actions and the chat engine), and the figure set
`docs/design/figures/README.md`, `household-v4.json`, `demo-ledger-v4.json`, `future-plans-v4.json`.

## The rules the demo keeps (ARCHITECTURE §1, §9; `.claude/rules/independent-review.md`)

1. **Rule 4.** Anything new is created only in the chat (a flow ending in a Confirm card). A page only corrects an
   existing figure in place: an `edit` part (before → after, Save, Cancel) whose Save dispatches one `event` of kind
   `correction`. Never a form that creates a record.
2. **One write path.** Every change is `{ type: 'event', id: '<ledger event id>' }` (a canonical event from
   `demo-ledger-v4.json`, or a branch's) or `{ type: 'event', ev: { id, at, actor, via, kind, record, field, before,
   after, ccy, summary, run, illustrative: true } }` for one the ledger does not hold. The reducer applies it with
   the applier registered for its `kind`, writes exactly one audit row, and adds its run and file. A Confirm writes
   its row; a Cancel writes nothing (lesson 9).
3. **Figures from the figure set, computed, never typed in** (lessons 10, 13, 38). Read records from `s.assets`,
   `s.debts`, `s.audit`, `s.runs`, `s.files`, `s.plans`, `s.admin`, `s.settings`, `s.members` and from `H` / `L` /
   `futurePlans()` in `src/data/figures.ts`. Net worth and its splits come from `ctx.T` (computed). A board's text may
   be copied; its numbers come from the data.
4. **One clock** (lesson 19): Mon 26 Oct (`d1`) → Sun 1 Nov (`d2`) → Thu 5 Nov (`d3`) → Thu 5 Nov evening (`d3e`) →
   Fri 6 Nov (`d4`, the Admin day). Page subtitles use `ctx.dayLabel` and `s.time`. A page shows the state of the
   clock: an event not yet applied is not shown as done.
5. **Who sees what.** Viewer `arun` is the owner and admin; `asha` is a member: she reads the household's figures
   and the chat, corrects only her own records (no pencil on Arun's or joint ones), has no Admin center, and cannot
   save a plan item. The owner cannot pause himself; only the owner restores a paused member; every admin action
   takes the fresh second check (a passkey card) before its Confirm (lesson 9).
6. **Doors.** `ctx.door` is `web` (desktop), `phone` (web at 390), `iphone`, `ipad`; `ctx.web` is true for the two
   web doors; `ctx.compact` for phone widths. Lay pages out with `cols`: on a wide door `[[...], [...]]` (two or three
   columns), compact `[[...everything]]` (see Home). Never measure the window yourself.
7. **Styling.** Only the DS classes and the board CSS already loaded (`tokens.css`, `ios.css`, the copied
   Prototype v4 styles). Do not add CSS, colours or Svelte components; express everything as `PageSpec` parts and
   chat cards. If a board needs a part the renderer lacks, approximate with existing parts and list it in your
   report.
8. **Privacy** is applied for you (every amount is masked in privacy mode). Write amounts with `gbp()`, `inr()`.
9. **Copy** follows the boards' wording: plain, British spelling, no em dashes in new text.

## The contract, in brief

```ts
import { register } from '../../state/registry';
register({
  id: 'money',
  pages: [{ meta: { id: 'assets', title: 'Assets', icon: 'donut_small', area: 'money', side: 2, ask: 'Ask about your assets' }, build: (s, ctx) => ({ title, sub, cols }) }],
  flows: [{ id: 'statement.oct', area: 'money', title: 'October statements', opener: '…', match: ['statement'], needs: (s) => s.clock === 'd2', beats: [
    { files: [{ name: 'barclaycard-2026-11-01.pdf', meta: 'PDF · 4 pages' }] },
    { ai: 'Reading them now…' },
    { ask: { key: 'cat1', label: 'Line 7', q: 'What was £64.20 at …?', chips: [{ t: 'Groceries' }, { t: 'Eating out' }] } },
    { confirm: (s, a) => ({ over: 'October · statements', title: '22 lines', parts: [...] }), onConfirm: () => [{ type: 'event', id: 'e-statements' }] },
    { ai: 'Saved. October closes on Sunday.' },
  ] }],
  appliers: { month_close: (s, ev) => { /* mutate s */ } },
  reduce: (s, a) => { /* your own { type: 'area', area: 'money', name, ... } actions; mutate s.area.money */ },
  suggest: (s, route) => s.clock === 'd2' ? [{ t: 'Send the statements', icon: 'attach_file', act: { type: 'flow.start', id: 'statement.oct' }, sug: true }] : [],
});
```

- Navigation: `nav('debt', { id: 'hdfc' })`; open a flow from a page with `ask(s, 'flow.id')` (on a compact door it
  switches to the chat tab). Back is `{ type: 'back' }`; a crumb: `crumb: { t: 'Debts', act: nav('debts') }`.
- Sidebar pages set `meta.side` (Home 1, Assets 2, Debts 3, Budget 4, Projection 5, Activity 6, Audit 7, You 8,
  Admin center 9 with `adminOnly`). Detail pages set `meta.parent` instead. Page ids are global: use only yours.
- An `ask` beat waits for a chip; a `confirm` beat waits for Confirm or Cancel; `act` beats dispatch actions; `when`
  beats branch. Answers are in `a[key]` (value) and `a[key + '$t']` (the chip's label).
- Due rows on Home open their check-in when you set `DUE_ACTS['<event id>'] = (s) => ask(s, 'checkin.emi')`
  (import `DUE_ACTS` from `../home/due`).
- Side branches the figure set has no totals for: start with `{ type: 'branch.start', name: '…' }`; the top bar
  offers "Back to the walk", which restores the base (`branch.end`). Use the ledger's `branches` where it has them.
- Undo: dispatch `{ type: 'undoable', label: 'EMI paid', acts: [{ type: 'unapply', id: 'e-emi-paid' }] }` and
  register an applier `'<kind>:undo'` that reverses the change; the ledger's reversal event is written too.

## Checking your work

From `prototype/`:

- `npx svelte-check --tsconfig ./tsconfig.json` (errors in your folder must be zero; others' are theirs).
- `npx vitest run tests/<area>.test.ts`: test that every flow reaches its Confirm and its Cancel, that each Confirm
  writes exactly one audit row (the ledger's id where there is one), that Cancel writes none, that Asha cannot do
  what she may not, and that your pages build at every door without throwing (call `PAGES[id].build(s, ctxOf(s))`
  for each door and viewer and clock, see `tests/totals.test.ts` for setup; import `'../src/areas'`).
- The dev server runs at `http://127.0.0.1:5290/` (do not start or stop it; if it is down, start your own with
  `npx vite --host 127.0.0.1 --port <5291..5299>`). Screenshot your pages at each door:
  `perl -e 'alarm shift; exec @ARGV' 60 node e2e/shot.mjs "http://127.0.0.1:5290/#signed=1&clock=d2&page=budget&door=iphone&theme=dark" /tmp/ma290-<area>-<name>.png`
  (`#door=web|phone|iphone|ipad&theme=dark&viewer=asha&priv=1&clock=d1..d4&page=<id>&id=<param>&chat=1`;
  a 4th and 5th argument set the window size). Look at every screenshot you take, and fix what is cut, overlapped,
  empty or wrong against the board.
- Every command gets a hard time limit (`perl -e 'alarm shift; exec @ARGV' <s> …`); never leave a browser running.
- Do not commit, push or touch git. Do not edit anything outside `src/areas/<your area>/` and
  `tests/<your area>.test.ts`.

## Your report

List: the pages (ids) and flows (ids, with the exact actions that walk each one end to end, e.g.
`[{type:'flow.start',id:'checkin.emi'},{type:'flow.answer',key:'paid',v:'paid'},{type:'flow.confirm'}]`, so the
presenter script can replay them), the boards you built each from, every disagreement you found between boards or
with ARCHITECTURE and what you followed, anything you could not express with the existing parts, and the screenshots
you checked (paths).
