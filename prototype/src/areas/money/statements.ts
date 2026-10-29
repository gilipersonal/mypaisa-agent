/* The statements and the month close, in the chat on Sun 1 Nov (Prototype v4 step 6; Web v4 · Budget B3 to B8).
   statement.oct: two files, the agent reads them, asks about each amber line, shows the review, Confirm writes the
   statements and the car EMI they confirm. monthclose.oct: the month-end check-in, Confirm closes October. */
import { H } from '../../data/figures';
import { dayLabel } from '../../lib/format';
import type { Flow, Suggestion } from '../../state/registry';
import type { Action, CardPart, ChatCard, DemoState } from '../../state/model';
import { ccard, ckv, cnote, cp, gbp } from '../kit';
import { BYCAT_ORDER } from './order';
import { CATS, LINES, UNSURE, byCategory, planOf, type Line } from './budget';
import { mon } from './util';

const h: any = H;
const S = h.statements_oct, B = h.budget_oct;
const money2 = (v: number) => '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (l: Line) => dayLabel(l.date);
const OTHERS = ['Groceries', 'Eating out', 'Health', 'Other'];

const picksOf = (a: Record<string, any>): Record<string, string> => Object.fromEntries(UNSURE.map((l, i) => [l.merchant, a['u' + i] ?? l.category]));

function tiles(a: Record<string, any>) {
  const by = byCategory(picksOf(a));
  return BYCAT_ORDER.filter((c) => by[c]).map((c) => ({ key: c, v: gbp(by[c].sum), s: `${by[c].n} line${by[c].n === 1 ? '' : 's'}` }));
}

function reviewCard(s: DemoState, a: Record<string, any>): ChatCard {
  const picks = picksOf(a);
  const by = byCategory(picks);
  const total = Object.values(by).reduce((t, v) => t + v.sum, 0);
  const rec: any[] = S.monzo_current_oct.recognised;
  const saved = s.applied.includes('e-statements');
  const icons: Record<string, string> = { Mortgage: 'home', Car: 'directions_car', Barclaycard: 'credit_card', To: 'savings', Salary: 'payments' };
  const asLine = (r: any): CardPart => ({
    k: 'line', icon: icons[String(r.what).split(' ')[0]] ?? 'receipt_long', name: r.what,
    sub: `${dayLabel(r.date)} · ${String(r.as).replace(/^./, (x) => x.toUpperCase())}`, v: money2(r.amount_gbp),
  });
  if (saved) {
    return ccard({
      over: "October's statements · saved", title: "22 lines in October's budget", ok: true, at: '08:44', foot: 'Saved · in the audit log',
      parts: [
        ckv('Spending', `${gbp(total)} · ${Object.keys(by).length} categories`), ckv('Not counted', `${rec.length} lines, recognised`, false),
        ckv('Remembered', UNSURE.map((l) => `${l.merchant} is ${picks[l.merchant]}`).join(', '), false),
        cnote('task_alt', "It also confirmed two autopay EMIs the weekly digest had assumed paid: the car loan's on Tue 20 Oct and the mortgage's on Thu 1 Oct."),
        { k: 'hdr', t: 'Both files, kept for good' }, { k: 'files', files: [{ name: 'barclaycard-2026-11-01.pdf' }, { name: 'monzo-2026-10.csv' }] },
      ],
    });
  }
  return ccard({
    anchor: 'amb', over: "October's statements · check them", title: `Spending ${gbp(total)} in ${LINES.length} lines`,
    parts: [
      { k: 'line', icon: 'credit_card', name: 'Barclaycard', sub: `statement of ${dayLabel(S.barclaycard_nov.statement)} · ${S.barclaycard_nov.lines.length} lines`, v: gbp(S.barclaycard_nov.balance) },
      { k: 'line', icon: 'account_balance', name: 'Monzo current account', sub: `October · ${S.monzo_current_oct.spend_lines.length + rec.length} lines: ${S.monzo_current_oct.spend_lines.length} spending, ${rec.length} not` },
      { k: 'hdr', t: 'Checked' },
      ...UNSURE.map((l, i): CardPart => ({ k: 'amb', name: l.merchant, sub: `Barclaycard · ${when(l)}`, v: gbp(l.amount_gbp), pill: picks[l.merchant], pillCls: 'picked', ok: true, act: undefined, chips: undefined, ...(a['u' + i] ? {} : {}) })),
      { k: 'hdr', t: 'By category', r: gbp(total) }, { k: 'tiles', tiles: tiles(a) },
      { k: 'hdr', t: 'Recognised, not spending', r: `${rec.length} lines` }, ...rec.map(asLine),
      cp('Both files are kept for good. Nothing is saved until you tap Confirm.'),
    ],
  });
}

const carCard = (): ChatCard => ccard({
  over: 'Check-in · Car loan EMI', title: 'Close Brothers: October\'s EMI paid', tag: 'Confirmed by the statement', ok: true, at: '08:44', foot: 'Confirmed · in the audit log',
  parts: [
    ckv('EMI', '£346.55'), ckv('Due', 'Tue 20 Oct · autopay', false), ckv('Before', 'Assumed paid', false), ckv('Now', 'Confirmed by the statement', false), ckv('Balance after it', '£8,938.81'),
    cnote('receipt_long', "Your Monzo statement shows £346.55 to Close Brothers on Tue 20 Oct, matched to this EMI. The weekly digest for the week of Mon 19 Oct had listed it as assumed paid; now it is confirmed. Nothing for you to do."),
  ],
});

const askFor = (l: Line, i: number) => ({
  ask: {
    key: 'u' + i, label: `${l.merchant} · ${gbp(l.amount_gbp)}`, over: "October's statements · check them",
    q: i === 0
      ? `${l.merchant}, ${gbp(l.amount_gbp)} on ${when(l)}, on the Barclaycard. Amazon Marketplace sells most things: Shopping, unless you change it.`
      : `${l.merchant}, ${gbp(l.amount_gbp)} on ${when(l)}, on the Barclaycard. A PayPal payment to eBay: Other, unless you change it.`,
    chips: [l.category, ...OTHERS.filter((c) => c !== l.category)].map((t) => ({ t })),
  },
});

export const statementFlow: Flow = {
  id: 'statement.oct', area: 'money', title: "October's statements", opener: undefined,
  match: ['statement', 'barclaycard', 'monzo csv'],
  needs: (s) => s.clock === 'd2' && !s.applied.includes('e-statements'),
  beats: [
    { files: [{ name: 'barclaycard-2026-11-01.pdf', meta: 'PDF · Barclaycard' }, { name: 'monzo-2026-10.csv', meta: 'CSV · Monzo' }], t: "October's statements" },
    { act: () => [{ type: 'event', id: 'e-file-barclay' }, { type: 'event', id: 'e-file-monzo' }] },
    { ai: `Each file is kept for good before anything reads it. Both are read: ${LINES.length} lines, ${S.monzo_current_oct.recognised.length} recognised, ${UNSURE.length} I am not sure of.`, meta: 'Reading the PDF and the CSV', metaIcon: 'description' },
    ...UNSURE.map(askFor),
    {
      confirm: (s, a) => reviewCard(s, a),
      onConfirm: (s, a) => [{ type: 'area', area: 'money', name: 'cats', cats: picksOf(a) }, { type: 'event', id: 'e-statements' }, { type: 'event', id: 'e-emi-car' }],
      done: () => 'Saved · in the audit log',
      label: 'Confirm',
    },
    { card: () => carCard(), text: 'The statement also answers a check-in I had open: the car loan\'s October EMI.' },
    { ai: "The card's £1,458 is now owed, due Fri 20 Nov. October closes on Sunday's check-in.", meta: "Net worth £457,951 → £456,493: the card's £1,458 is owed, due Fri 20 Nov", metaIcon: 'devices' },
  ],
};

function closeCard(s: DemoState): ChatCard {
  const closed = s.applied.includes('e-month-close');
  const act = byCategory(mon(s).cats), plan = planOf(s);
  const spend = Object.values(act).reduce((t, v) => t + v.sum, 0), planned = Object.values(plan).reduce((t, v) => t + v, 0);
  const fixed = B.emis_gbp + B.sip_gbp;
  const sur = B.income_gbp - fixed - spend, surP = B.income_gbp - fixed - planned;
  const rate = (x: number) => (x / B.income_gbp * 100).toFixed(1) + '%';
  if (closed) {
    return ccard({
      over: 'Check-in · October closed', title: 'October closed', ok: true, at: '09:02', foot: 'Closed · in the audit log',
      parts: [ckv('Spent', `${gbp(spend)} of ${gbp(planned)}`), ckv('Surplus', gbp(sur)), ckv('Savings rate', rate(sur), false), cp('You tapped Nothing else at 09:02. Budget now shows October as closed.')],
    });
  }
  const over = CATS.filter((c) => (act[c]?.sum ?? 0) > plan[c]).sort((x, y) => act[y].sum - plan[y] - (act[x].sum - plan[x]));
  return ccard({
    over: 'Check-in · Close October', title: `October: ${gbp(spend)} spent of ${gbp(planned)} planned`,
    parts: [
      { k: 'meter', w: (spend / planned * 100).toFixed(1) + '%', s: `${gbp(planned - spend)} under plan` },
      ckv('Income', gbp(B.income_gbp)), ckv('EMIs and SIP', `${gbp(B.emis_gbp)} and ${gbp(B.sip_gbp)}`), ckv('Surplus', `${gbp(sur)} · plan ${gbp(surP)}`), ckv('Savings rate', rate(sur), false),
      { k: 'table', rows: CATS.map((c) => { const a = act[c]?.sum ?? 0; return { c, a: (a > plan[c] ? '▲ ' : a < plan[c] ? '▼ ' : '') + gbp(a), p: gbp(plan[c]) }; }) },
      cp(`Over plan: ${over.slice(0, 3).map((c) => `${c} ${gbp(act[c].sum - plan[c])}`).join(', ')}.`),
      cp('From the Barclaycard and Monzo statements, the loans and the SIP. ▲ over plan, ▼ under.'),
      { k: 'strong', t: 'Anything not on a statement? Cash, or another bank?' },
    ],
    actsCls: 'stack',
    acts: [
      { t: 'Nothing else: close October', cls: 'cbtn-primary', act: { type: 'flow.confirm' } },
      { t: 'Add cash spending', act: { type: 'nope', t: 'Cash spending is added in the chat; that flow is drawn on the boards, not in this demo yet.' } },
      { t: "Another bank's statement", act: { type: 'nope', t: "Another bank's statement is drawn on the boards, not in this demo yet." } },
    ],
  });
}

export const monthCloseFlow: Flow = {
  id: 'monthclose.oct', area: 'money', title: 'Close October', opener: undefined,
  match: ['close october', 'month end', 'month-end', 'close the month'],
  needs: (s) => s.clock === 'd2' && s.applied.includes('e-statements') && !s.applied.includes('e-month-close'),
  beats: [
    { act: (s) => (s.time < '09:00' ? [{ type: 'time', time: '09:00' }] : []) },
    { confirm: (s) => closeCard(s), onConfirm: () => [{ type: 'event', id: 'e-month-close' }], done: () => 'Closed · in the audit log' },
    { ai: "November is open, on the same plan. I'll ask again on Tue 1 Dec." },
  ],
};

export function suggestions(s: DemoState): Suggestion[] {
  const out: Suggestion[] = [];
  if (s.clock === 'd1') out.push({ t: 'Jump to Sun 1 Nov', icon: 'event', act: { type: 'clock', to: 'd2' } });
  if (s.clock === 'd2' && !s.applied.includes('e-statements')) out.push({ t: 'Send the statements', icon: 'attach_file', act: { type: 'flow.start', id: 'statement.oct' }, sug: true });
  if (s.clock === 'd2' && s.applied.includes('e-statements') && !s.applied.includes('e-month-close')) out.push({ t: 'Close October', icon: 'event_available', act: { type: 'flow.start', id: 'monthclose.oct' }, sug: true });
  return out;
}

/** the appliers for the kinds the core lacks */
export const appliers = {
  file_received: () => {},
  emi_confirmed: (s: DemoState, ev: any) => { const d: any = s.debts.find((x) => x.id === ev.record); if (d) d.emi_confirmed = ev.at; },
  month_close: (s: DemoState, ev: any) => { (s.area.money ??= {}).closed = ev.at; },
  budget_plan_correct: (s: DemoState, ev: any) => {
    const m = (s.area.money ??= {});
    const cat = String(ev.field);
    if (s.applied.includes('e-month-close')) { (m.nextPlan ??= {})[cat] = ev.after; m.nextBy = ev.actor; m.nextAt = `${dayLabel(ev.at)} ${ev.at.slice(11, 16)}`; }
    else (m.plan ??= {})[cat] = ev.after;
  },
};
export const reduceMoney = (s: DemoState, a: Action) => {
  const m = (s.area.money ??= {});
  if (a.name === 'edit') m.edit = a.key;
  else if (a.name === 'cats') m.cats = a.cats;
};
