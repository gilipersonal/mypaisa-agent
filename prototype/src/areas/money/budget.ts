/* Budget (Web v4 · Budget: Browser · Budget, correct a plan amount, statement review...; iPhone v4 · Budget; iPad
   Budget; Prototype v4's `budget` page). October before Sun 1 Nov's statements, "waiting" once the files are in,
   then with actuals, then closed. Actuals are computed from the statements' own lines (H.statements_oct). */
import { H } from '../../data/figures';
import { dayLabel } from '../../lib/format';
import type { PageCtx, PageSpec, Block, PagePart } from '../../state/registry';
import type { Action, DemoState } from '../../state/model';
import { card, gbp, hero, inr, nav, note, p, row, FX, sec } from '../kit';
import { cap, editOff, editOn, editing, mon, nowIso, num, NAME, twoCols,
} from './util';

const h: any = H;
const B = h.budget_oct, S = h.statements_oct;
export interface Line { date: string; merchant: string; amount_gbp: number; category: string; source: string; sure: boolean }
/** the October statements' spending lines, Barclaycard then Monzo: 16 + 6 = 22 */
export const LINES: Line[] = [...S.barclaycard_nov.lines, ...S.monzo_current_oct.spend_lines];
export const CATS: string[] = B.plan.map((r: any) => r.category);
/* newest first, as Prototype v4 asks them: AMZN Mktp (Tue 27 Oct), then PAYPAL *EBAY (Sun 25 Oct) */
export const UNSURE = LINES.filter((l) => !l.sure).sort((a, b) => (a.date < b.date ? 1 : -1));
/** the category a line lands in: the member's pick on an amber line, else the statement's own */
export const catOf = (l: Line, picks: Record<string, string> = {}) => picks[l.merchant] ?? l.category;
export function byCategory(picks: Record<string, string> = {}): Record<string, { sum: number; n: number }> {
  const out: Record<string, { sum: number; n: number }> = {};
  for (const l of LINES) { const c = catOf(l, picks); (out[c] ??= { sum: 0, n: 0 }).sum += l.amount_gbp; out[c].n++; }
  return out;
}
/** October's plan as it stands (a correction made while October is open changes it) */
export const planOf = (s: DemoState): Record<string, number> => Object.fromEntries(B.plan.map((r: any) => [r.category, mon(s).plan?.[r.category] ?? r.plan]));
export const stateOf = (s: DemoState) => ({
  waiting: s.applied.includes('e-file-barclay') && !s.applied.includes('e-statements'),
  done: s.applied.includes('e-statements'),
  closed: s.applied.includes('e-month-close'),
});

function budgetPage(s: DemoState, c: PageCtx): PageSpec {
  const st = stateOf(s);
  const plan = planOf(s);
  const act = byCategory(mon(s).cats);
  const spendPlan = Object.values(plan).reduce((t, v) => t + v, 0);
  const spendAct = Object.values(act).reduce((t, v) => t + v.sum, 0);
  const fixed = B.emis_gbp + B.sip_gbp;
  const surPlan = B.income_gbp - fixed - spendPlan, surAct = B.income_gbp - fixed - spendAct;
  const rate = (x: number) => (x / B.income_gbp * 100).toFixed(1) + '%';
  const mp = c.mp;
  const statsBase = [
    { key: 'Income', v: gbp(B.income_gbp), s: st.done ? 'salaries and rent' : 'expected' },
    { key: 'EMIs', v: gbp(B.emis_gbp), s: '3 loans' },
    { key: 'SIP', v: gbp(B.sip_gbp), s: '1 fund' },
  ];
  const diff = surAct - surPlan;
  const heroB = st.done
    ? hero({
      over: st.closed ? 'October · closed' : 'October · open', right: `${diff >= 0 ? '▲' : '▼'} ${gbp(Math.abs(diff))} ${diff >= 0 ? 'over' : 'under'} plan`, rightUp: diff >= 0,
      big: gbp(surAct), unit: 'surplus', sub: `Plan ${gbp(surPlan)} · savings rate ${rate(surAct)}, plan ${rate(surPlan)}`,
      stats: [...statsBase, { key: 'Spending', v: gbp(spendAct), s: `of ${gbp(spendPlan)} planned` }],
    })
    : hero({
      over: 'October · open', big: gbp(surPlan), unit: 'planned surplus',
      sub: st.waiting ? 'Spending comes from your statements: two are waiting for your Confirm in the chat.' : "Spending comes from October's statements, sent in the chat.",
      stats: [...statsBase, { key: 'Spending', v: 'not yet', s: `plan ${gbp(spendPlan)}` }],
    });

  const next: Record<string, number> = mon(s).nextPlan ?? {};
  const rows: PagePart[] = CATS.map((cat) => {
    const a = act[cat]?.sum ?? 0, pl = plan[cat];
    return {
      k: 'bud', name: cat, a: st.done ? gbp(a) : 'not yet', p: gbp(pl), w: st.done ? Math.min(100, Math.round(a / pl * 100)) + '%' : '0%', over: st.done && a > pl,
      act: c.asha ? { type: 'nope', t: "The plan is Arun's to correct, as the admin. Ask in the chat to see what another figure would do." } : editOn('plan:' + cat),
    } as PagePart;
  });
  const key = (cat: string) => 'plan:' + cat;
  const editCat = CATS.find((cat) => editing(s, key(cat)));
  const editPart: PagePart[] = editCat && !c.asha ? [{
    k: 'edit', lbl: `Plan for ${editCat}, a month`, prefix: '£', ph: gbp(plan[editCat]),
    note: st.closed ? `A plan is a monthly amount, so the change runs from November, the open month; closed October keeps ${gbp(plan[editCat])}.` : 'Save writes a correction with its audit row. Nothing else on the budget changes.',
    preview: (v) => { const n = num(v); if (!n) return null; const d = n - plan[editCat]; return { before: gbp(plan[editCat]), after: gbp(n), delta: n === plan[editCat] ? undefined : (d >= 0 ? '▲ ' : '▼ ') + gbp(Math.abs(d)) }; },
    save: (v): Action[] => {
      const n = num(v);
      if (!n || n === plan[editCat]) return [editOff];
      const at = nowIso(s);
      return [{
        type: 'event', ev: {
          id: `ev-plan-${editCat}-${s.audit.length}`, at, actor: s.viewer, via: 'inline_edit', kind: 'budget_plan_correct', record: 'budget_oct', field: editCat,
          before: plan[editCat], after: n, ccy: 'GBP', illustrative: true, run: null, file: null,
          summary: `Corrected in place · ${editCat} plan · ${gbp(plan[editCat])} → ${gbp(n)} a month${st.closed ? ' from November' : ''} · ${cap(s.viewer)} · ${dayLabel(at)} ${at.slice(11, 16)}`,
        },
      }, editOff];
    },
    cancel: editOff,
  } as PagePart] : [];
  const over = CATS.filter((cat) => st.done && (act[cat]?.sum ?? 0) > plan[cat]).sort((a, b) => (act[b].sum - plan[b]) - (act[a].sum - plan[a]));
  const notes: PagePart[] = Object.entries(next).map(([cat, v]) => note('edit', `Corrected in place · ${cat} ${gbp(plan[cat])} → ${gbp(v)} a month from November · ${cap(mon(s).nextBy ?? 'arun')} · ${mon(s).nextAt ?? ''}`));
  const pa = card('Plan against actual', st.done ? `${gbp(spendAct)} of ${gbp(spendPlan)}` : `plan ${gbp(spendPlan)}`, [
    p(c.asha ? "The plan is Arun's, the admin's." : 'Tap a plan figure to correct it.'),
    ...editPart,
    { k: 'budHead' }, ...rows,
    ...(over.length ? [p(mp(`Over plan: ${over.slice(0, 3).map((x) => `${x} ${gbp(act[x].sum - plan[x])}`).join(', ')}.`))] : []),
    ...notes,
    p(st.done ? "From the Barclaycard statement of Sun 1 Nov and Monzo's for October: 22 lines." : "Actuals come in when you confirm October's statements in the chat."),
    note('chat', 'New categories are made in the chat, never on this page: ask "add a category for …" and confirm its card.'),
  ]);
  const inc = card('Income · October', gbp(B.income_gbp), [
    row({ icon: 'person', name: 'Arun', sub: 'net salary', v: '£4,350' }),
    row({ icon: 'person', name: 'Asha', sub: 'net salary', v: '£3,050' }),
    row({ icon: 'apartment', name: 'Flat, Pune', sub: 'rent · joint, half each', v: inr(18000), v2: gbp(18000 / FX) }),
    p('From the income commitments. Tap a figure to correct it.'),
  ]);
  const emis = card('EMIs and SIP · October', '', [
    sec('EMIs', gbp(B.emis_gbp)),
    row({ icon: 'home', name: 'Mortgage · Nationwide', sub: 'joint · Thu 1 Oct', v: gbp(1456.46) }),
    row({ icon: 'directions_car', name: 'Car loan · Close Brothers', sub: 'Arun · Tue 20 Oct', v: gbp(346.55) }),
    row({ icon: 'home_work', name: 'Home loan · HDFC', sub: 'Arun · Pune flat · Mon 5 Oct', v: inr(39390), v2: gbp(39390 / FX) }),
    sec('SIP', gbp(B.sip_gbp)),
    row({ icon: 'trending_up', name: 'Parag Parikh Flexi Cap', sub: 'Asha · Sat 10 Oct', v: inr(10000), v2: gbp(10000 / FX) }),
    p('From the loans and the SIP, so nobody types them twice.'),
  ]);
  const wide = twoCols(s, c);
  const month = ['Sep', 'Oct', 'Nov'].map((t, i) => ({ t, on: i === 1, act: i === 1 ? null : { type: 'nope', t: 'Only October is drawn in this demo.' } }));
  return {
    title: 'Budget',
    sub: st.closed ? 'October 2026 · closed Sun 1 Nov 09:02 · Illustrative figures'
      : `October 2026 · open · ${st.waiting ? "October's statements not confirmed yet" : st.done ? 'until the check-in on the 1st' : 'until the check-in on the 1st'} · Illustrative figures`,
    ctrls: c.web ? { eye: true, month } : { month },
    banner: st.waiting && c.web ? "Two statements are waiting for your Confirm in the chat. October's actuals fill in when you confirm them." : undefined,
    cols: wide ? [[heroB, pa], [inc, emis]] : [[heroB, pa, inc, emis]],
  };
}

export const budgetPages = [{ meta: { id: 'budget', title: 'Budget', icon: 'savings', area: 'money', side: 4, ask: 'Ask about the budget' }, build: budgetPage }];
void nav; void NAME;
export type { Block };
