/* Chat flows of the future area (picked 2a, a card per step): what-ifs (saved only by Arun) and plan items made in
   the chat, each ending in a Confirm card that writes the ledger's rows (ARCHITECTURE §6.6; Web v4 · Plans in the
   chat, iPhone v4 · Projection; the evening of Thu 5 Nov 20:41 to 21:18 in future-plans-v4.json). */
import type { Action, ChatCard, DemoState } from '../../state/model';
import type { Ans, Beat, Flow } from '../../state/registry';
import { DAY_ISO } from '../../state/reduce';
import { dayLabel } from '../../lib/format';
import { totalsOf } from '../../state/ctx';
import { ccard, cnote, cp, ckv, gbp, inr } from '../kit';
import { fanFor } from './charts';
import { fp, ym } from './data';

const isArun = (s: DemoState) => s.viewer === 'arun';
const asha = (s: DemoState) => s.viewer === 'asha';
const mp = (fan: any[], y: number) => fan.find((r) => r.year === y).p50;
const ADMIN_ONLY = 'Plan items are Arun\'s, the admin\'s. Nothing is saved from here.';

/** An illustrative event for a change the ledger does not hold (rule 2): one write path, one audit row. */
export function chatEvent(s: DemoState, kind: string, record: string, field: string, before: any, after: any, ccy: string | null, summary: string, payload?: any): Action {
  const n = s.audit.length;
  return { type: 'event', ev: { id: `x-${kind}-${record}-${n}`, at: `${DAY_ISO[s.clock]}T${s.time}:${String(n % 60).padStart(2, '0')}`, actor: s.viewer, via: 'plan', kind, record, field, before, after, ccy, illustrative: true, run: null,
    summary: `${summary} · ${asha(s) ? 'Asha' : 'Arun'} · ${dayLabel(DAY_ISO[s.clock])} ${s.time} · in the chat`, payload } };
}
const guard = (beats: Beat[]): Beat[] => [
  { when: asha, beats: [{ ai: ADMIN_ONLY, meta: 'Only the admin adds plan items', metaIcon: 'lock' }] },
  { when: isArun, beats },
];

/* ---------- what-ifs ---------- */
function whatIfCard(s: DemoState, withLock: boolean): ChatCard {
  const early = s.clock === 'd1' || s.clock === 'd2' || s.clock === 'd0';
  const W = early ? fp.what_if_26 : fp.what_if_5nov, base = early ? fp.R26.fan : fp.runs.R5N.fan;
  const { ch } = fanFor(s, totalsOf(s).net_gbp, W.fan, 10, { h: 120, ann: false, label: false, ms: false }, base);
  const deposit = 60000;
  return ccard({
    over: 'What-if · Jun 2028 · not saved', title: `${gbp(deposit)} down on a second flat`,
    parts: [
      { k: 'chart', ch },
      ckv('2036, with the flat', gbp(W.middle_path_2036)), ckv("2036, today's plan", gbp(W.today_2036)),
      ckv('Middle path', `▼ ${gbp(-W.change_2036)} lower`),
      { k: 'flag', t: `▼ Cash goes ${gbp(-W.cash_short[1])} below zero in ${W.cash_short[0]}, back above zero in ${W.cash_back_above_zero}.` },
      cp("The engine's figures; nothing is saved. £60,000 and June 2028 are your words."),
      ...(withLock ? [{ k: 'lock' as const, t: 'Only Arun can save it as a plan item.' }] : []),
    ],
  });
}
const WHATIF_Q = 'What if we put £60,000 down on a second flat in June 2028?';
const whatIfFlat: Flow = {
  id: 'whatif.flat', area: 'future', title: 'What if: a second flat', opener: WHATIF_Q, match: ['second flat', 'what if we put'], needs: isArun,
  beats: guard([
    { ai: "Here's what it does to the plan.", meta: 'The engine · not saved', metaIcon: 'query_stats' },
    {
      confirm: (s) => whatIfCard(s, false),
      label: 'Save as a plan item',
      onConfirm: (s) => [chatEvent(s, 'plan_add', 'flat2', 'amount', null, 60000, 'GBP', 'Plan item added · Second flat deposit, £60,000 in Jun 2028', { plan: { id: 'flat2', what: 'Second flat deposit', ccy: 'GBP', amount: -60000, when: '2028-06', repeat: null, status: 'active', version: 1, kind: 'spend' } })],
      done: () => 'Saved as a plan item. One row in the audit log; it is in the plan from the next run.',
    },
    { ai: 'It is on the plan now. Plans tab, Projection, shows it on the timeline.' },
  ]),
};
const whatIfAsha: Flow = {
  id: 'whatif.asha', area: 'future', title: 'What if: a second flat (Asha)', opener: WHATIF_Q, match: ['second flat', 'what if we put'], needs: asha,
  beats: [
    { ai: "Asha's own conversation: Arun's chat stays his. Here's the engine's run with it.", meta: 'The engine · not saved', metaIcon: 'query_stats' },
    { card: (s) => whatIfCard(s, true) },
  ],
};

/* ---------- school fees ---------- */
const S = () => fp.plans.schooling;
function schoolImpact(s: DemoState): ChatCard {
  const I = fp.impact;
  const { ch } = fanFor(s, totalsOf(s).net_gbp, fp.runs.R1.fan, 20, { h: 130, ann: false, label: false, ms: false }, fp.runs.R5N.fan);
  return ccard({
    over: "What it does to the plan · the engine's run", title: 'School fees, £4,000 a month from Jan 2029',
    parts: [
      { k: 'chart', ch },
      ...[2031, 2036, 2046].map((y) => ckv(`${y}, middle path`, `${gbp(I.middle_path_before[y])} → ${gbp(I.middle_path_after[y])}`)),
      ckv('2046, change', `▼ ${gbp(-I.change[2046])}`),
      { k: 'flag', t: `▼ Your surplus is below your ${gbp(fp.settings.floor_gbp_month)} floor in ${I.below_floor_months} months, ${I.first_below_floor} to ${I.last_below_floor}; the lowest is ${gbp(I.lowest_surplus)} in ${I.lowest_month}. Cash stays above zero.` },
      cnote('flag', `Milestones added: ${I.new_milestones.map((m: any) => `${m.what}, ${ym(m.when)}`).join('; ')}.`),
    ],
  });
}
function schoolConfirm(s: DemoState, a: Ans): ChatCard {
  const P = S();
  return ccard({
    over: 'Plan item · School fees', title: 'Add to the plan',
    parts: [
      ckv('Amount', `${gbp(P.amount)} a month`), ckv('From', ym(P.start)), ckv('Until', ym(P.end)),
      ckv('How it grows', `${(P.growth.pct ?? 0.045) * 100}% a year, UK school fees`), ckv('Paid from', 'The monthly budget'),
      ckv('For', P.for_note), ckv('Category', 'Education, new'),
      ...((a.until && a.until !== 'Jul 2041') || (a.grows && !/4\.5/.test(String(a.grows))) ? [cnote('info', 'The demo saves the walk\'s answers: Jul 2041 and 4.5% a year.')] : []),
    ],
  });
}
const R = () => fp.rearrange;
const OPT_TITLE: Record<string, string> = { pot: 'Start a school fees pot', trim: 'Spend less from Jan 2029', isa: 'Take it from Balanced' };
function rearrangeCard(): ChatCard {
  const O = R();
  return ccard({
    over: `Ways to cover it · ${gbp(O.gap_total)} short, ${O.first} to ${O.last}`, title: 'Each keeps your floor',
    parts: [
      cp(`The engine found ${O.options.length} ways, each covering the ${gbp(O.gap_total)} gap, and ranked them.`),
      ...O.options.map((o: any) => ({ k: 'line' as const, icon: o.rank === 1 ? 'star' : undefined, name: `${o.rank}. ${o.title}`, sub: o.why, v: `2046: ${gbp(o.effect.middle_path[2046])}`, tag: o.rank === 1 ? 'Recommended' : undefined })),
      cnote('info', `Two more: ${O.more.map((m: any) => m.title.charAt(0).toLowerCase() + m.title.slice(1)).join('; ')}.`),
    ],
  });
}
function optConfirm(s: DemoState, a: Ans): ChatCard {
  const o = R().options.find((x: any) => x.id === (a.opt ?? 'pot'));
  return ccard({ over: `Option ${o.rank} · ${o.id === 'pot' ? 'two rows in the audit log' : 'one row in the audit log'}`, title: o.title, parts: [...o.changes.filter((c: string) => c !== '...4' && !/^\.\.\./.test(c)).map((c: string) => cp(c)), ckv('2046, middle path', gbp(o.effect.middle_path[2046])), cnote('undo', 'Each row has Undo.')] });
}
function optEvents(s: DemoState, a: Ans): Action[] {
  const id = a.opt ?? 'pot';
  if (id === 'pot') return [{ type: 'event', id: 'e-school-pot' }, { type: 'event', id: 'e-budget-nov' }, { type: 'undoable', label: 'School fees pot', acts: [{ type: 'unapply', id: 'e-budget-nov' }, { type: 'unapply', id: 'e-school-pot' }] }];
  const o = R().options.find((x: any) => x.id === id);
  const rec = id === 'trim' ? 'school_trim' : 'school_isa';
  return [chatEvent(s, 'plan_add', rec, 'amount', null, o.drawn, 'GBP', `Plan item added · ${o.title}, ${gbp(o.drawn)}`, { plan: { id: rec, what: o.title, ccy: 'GBP', amount: -o.drawn, when: '2029-01', repeat: null, status: 'active', version: 1, kind: 'cover', note: o.changes[0] } }),
    { type: 'undoable', label: o.title, acts: [{ type: 'unapply', id: `x-plan_add-${rec}-${s.audit.length}` }] }];
}
const planSchool: Flow = {
  id: 'plan.school', area: 'future', title: 'Plan item: school fees', opener: "£4,000 a month from Jan 2029 for my kid's schooling", match: ['school'], needs: (s) => s.clock === 'd3e' && isArun(s),
  beats: guard([
    { ai: 'Got it: £4,000 a month from Jan 2029, for your kid, who is not a member. Three things I need.' },
    { ask: { key: 'until', label: 'Until when', q: 'Until when?', chips: fp.conversation[1].asks[0].chips.map((t: string) => ({ t })) } },
    { ask: { key: 'grows', label: 'How it grows', q: 'How do the fees grow?', chips: fp.conversation[1].asks[1].chips.map((t: string) => ({ t, v: t.split(',')[0] })) } },
    { ask: { key: 'from', label: 'Paid from', q: 'Paid from where?', chips: fp.conversation[1].asks[2].chips.map((t: string) => ({ t })) } },
    { card: (s) => schoolImpact(s), text: 'Here is what it does to the plan.' },
    { confirm: schoolConfirm, onConfirm: () => [{ type: 'event', id: 'e-school-fees' }], done: () => 'Saved. One row in the audit log, with the 2046 middle path: −£1,317,000.' },
    { ai: 'It leaves the household short, so I worked out ways to cover it.' },
    { card: () => rearrangeCard() },
    { ask: { key: 'opt', label: 'The way', q: 'Which way shall I put in the plan?', chips: R().options.map((o: any) => ({ t: `${o.rank}. ${OPT_TITLE[o.id]}`, v: o.id })) } },
    { confirm: optConfirm, onConfirm: optEvents, done: (s, a) => (a.opt ?? 'pot') === 'pot' ? 'Saved. Two rows in the audit log, each with Undo.' : 'Saved. One row in the audit log, with Undo.' },
    { ai: 'Done. The Plans tab shows it on the timeline.' },
  ]),
};

/* ---------- salary step and the HDFC closure ---------- */
const planSalary: Flow = {
  id: 'plan.salary-step', area: 'future', title: 'Plan item: salary to £5,500', opener: 'my salary goes to £5,500 a month from Sep 2028', match: ['salary goes', 'my salary'], needs: (s) => s.clock === 'd3e' && isArun(s),
  beats: guard([
    { ai: `Your salary at £5,500 a month from Sep 2028. Your take-home would be ${gbp(fp.later.salary_step.arun_take_home_aug_2028)} by then, so this is a rise of ${gbp(fp.later.salary_step.set_to - fp.later.salary_step.arun_take_home_aug_2028)} a month.` },
    {
      card: (s) => { const L = fp.later.salary_step; const { ch } = fanFor(s, totalsOf(s).net_gbp, fp.runs.R3.fan, 20, { h: 120, ann: false, label: false, ms: false }, fp.runs.R2.fan);
        return ccard({ over: "What it does to the plan · the engine's run", title: "Arun's salary, £5,500 a month from Sep 2028", parts: [{ k: 'chart', ch }, ...[2031, 2036, 2046].map((y) => ckv(`${y}, middle path`, `${gbp(L.middle_path_before[y])} → ${gbp(L.middle_path_after[y])}`)), ckv('2046, change', `▲ ${gbp(L.middle_path_after[2046] - L.middle_path_before[2046])}`)] }); },
    },
    { confirm: () => ccard({ over: 'Plan item · Salary', title: 'Add to the plan', parts: [ckv('Whose', 'Arun'), ckv('Take-home', `${gbp(fp.later.salary_step.set_to)} a month`), ckv('From', ym(fp.plans.salary_step.start)), cnote('info', 'It replaces his rising salary from then, and grows with his salary growth after.')] }), onConfirm: () => [{ type: 'event', id: 'e-salary-step' }] },
    { ai: 'Saved. The school fees pot now has more room than the fees need.' },
  ]),
};
const planHdfc: Flow = {
  id: 'plan.hdfc-close', area: 'future', title: 'Plan item: close the HDFC loan', opener: 'close my HDFC loan with the SBI FD when it matures', match: ['close my hdfc', 'hdfc loan'], needs: (s) => s.clock === 'd3e' && isArun(s),
  beats: guard([
    { ai: `The SBI FD matures on 10 Mar 2029. ${inr(fp.later.hdfc_close.fd_inr)} clears the ${inr(fp.later.hdfc_close.balance_mar_2029_inr)} balance; ${inr(fp.later.hdfc_close.left_over_inr)} is left over.` },
    {
      card: () => { const L = fp.later.hdfc_close; return ccard({ over: "What it does to the plan · the engine's run", title: 'HDFC home loan closed, Mar 2029', parts: [ckv('The FD, 10 Mar 2029', inr(L.fd_inr)), ckv('The HDFC balance then', inr(L.balance_mar_2029_inr)), ckv('Left over', inr(L.left_over_inr)), ckv('The EMI that stops', `${inr(L.frees_inr_a_month)} a month`), ckv('EMIs saved', `${L.emis_saved}, from Apr 2029 to Jul 2030`), ckv('2046, middle path', `${gbp(L.middle_path_before[2046])} → ${gbp(L.middle_path_after[2046])}`)] }); },
    },
    { confirm: () => ccard({ over: 'Plan item · Close a loan', title: 'Close the HDFC home loan with the SBI FD', parts: [ckv('When', 'Mar 2029'), ckv('Paid from', 'The SBI FD'), cnote('info', 'The loan ends 16 months early; the engine runs again with it.')] }), onConfirm: () => [{ type: 'event', id: 'e-hdfc-close' }] },
    { ai: 'Saved. The loan now ends in Mar 2029 on the Projection milestones.' },
  ]),
};

/* ---------- the wedding ---------- */
const W = () => fp.evening2.wedding;
const planWedding: Flow = {
  id: 'plan.wedding', area: 'future', title: "Plan item: sister's wedding", opener: "£20,000 for my sister's wedding in Mar 2027", match: ['wedding'], needs: (s) => s.clock === 'd3e' && isArun(s),
  beats: guard([
    { ai: "A one-off of £20,000 in Mar 2027. With no source named, it is paid from the surplus, then from cash." },
    {
      card: (s) => { const w = W(); const { ch } = fanFor(s, totalsOf(s).net_gbp, w.fan, 20, { h: 120, ann: false, label: false, ms: false }, fp.evening2.plans_tab.R7.fan);
        return ccard({ over: "What it does to the plan · the engine's run", title: "Sister's wedding, £20,000 in Mar 2027", parts: [{ k: 'chart', ch }, ...[2031, 2036, 2046].map((y) => ckv(`${y}, middle path`, `${gbp(w.middle_path_before[y])} → ${gbp(w.middle_path_after[y])}`)), { k: 'flag', t: `▼ Cash goes ${gbp(-w.cash_short[1])} below zero in ${w.cash_short[0]}, when the extension is paid, back above zero in ${w.cash_back_above_zero}.` }] }); },
    },
    { confirm: () => ccard({ over: 'Plan item · A one-off', title: 'Add to the plan', parts: [ckv('What', "Sister's wedding"), ckv('Amount', gbp(20000)), ckv('When', 'Mar 2027'), ckv('Paid from', 'The surplus, then cash')] }), onConfirm: () => [{ type: 'event', id: 'e-wedding' }], done: () => 'Saved. One row in the audit log.' },
    { ai: `Cash is flagged: below zero from ${W().cash_short[0]} to ${W().cash_back_above_zero}. Here are ways to cover it.` },
    {
      card: () => ccard({ over: 'Ways to cover it · cash, not the floor', title: 'Each keeps cash at zero or above', parts: [cp(`Each keeps the surplus at your ${gbp(fp.settings.floor_gbp_month)} floor.`), ...W().options.map((o: any) => ({ k: 'line' as const, icon: o.rank === 1 ? 'star' : undefined, name: `${o.rank}. ${o.title}`, sub: o.why, v: `2046: ${gbp(o.middle_path[2046])}`, tag: o.rank === 1 ? 'Recommended' : undefined }))] }),
    },
    { ask: { key: 'way', label: 'The way', q: 'Which way shall I put in the plan?', chips: W().options.map((o: any) => ({ t: `${o.rank}. ${o.id === 'isa' ? 'Take it from Balanced' : o.id === 'move' ? 'Move the extension' : 'Pause the pot'}`, v: o.id })) } },
    {
      confirm: (s, a) => { const o = W().options.find((x: any) => x.id === (a.way ?? 'isa')); return ccard({ over: `Option ${o.rank} · one row in the audit log`, title: o.title, parts: [...o.changes.map((c: string) => cp(c)), ckv('2046, middle path', gbp(o.middle_path[2046])), cnote('undo', 'It has Undo.')] }); },
      onConfirm: (s, a) => {
        const id = a.way ?? 'isa';
        if (id === 'isa') return [{ type: 'event', id: 'e-wedding-cover' }, { type: 'undoable', label: "Balanced (ISA) paying the wedding's shortfall", acts: [{ type: 'event', id: 'e-wedding-undo' }] }];
        const o = W().options.find((x: any) => x.id === id);
        return [chatEvent(s, 'plan_add', 'wedding_' + id, 'amount', null, o.drawn ?? null, 'GBP', `Plan item added · ${o.title}`, { plan: { id: 'wedding_' + id, what: o.title, ccy: 'GBP', amount: o.drawn ? -o.drawn : undefined, when: '2027-06', repeat: null, status: 'active', version: 1, kind: 'cover', note: o.changes[0] } })];
      },
      done: (s, a) => (a.way ?? 'isa') === 'isa' ? 'Saved. One row in the audit log, with Undo.' : 'Saved (illustrative). One row in the audit log.',
    },
    { ai: 'Done. Tap Undo to take it back: the wedding stays saved and cash is flagged again.' },
  ]),
};

export const FLOWS_FUTURE: Flow[] = [whatIfFlat, whatIfAsha, planSchool, planSalary, planHdfc, planWedding];
