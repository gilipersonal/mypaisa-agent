/* Home (MA-193's dashboard 1a, Net worth first; Web v4 · Dashboard, iPhone v4 · Home) and the core appliers every
   area's events rely on. This file is the pattern the other areas copy. */
import { H } from '../../data/figures';
import { register, type PageCtx, type PageSpec } from '../../state/registry';
import type { Asset, DemoState } from '../../state/model';
import { bar, card, ccySeg, hero, link, nav, p, pct, row, seg, gbp, inr, both, owners, initials } from '../kit';
import { DUE } from './due';
import { DAY_ISO } from '../../state/reduce';

const h: any = H;
const toG = (a: Asset) => (a.ccy === 'INR' ? a.value / 112.5 : a.value);
const WHOSE = () => ({ type: 'nope', t: "Whose view: drawn on the boards, not in this demo yet." });

function homePage(s: DemoState, c: PageCtx): PageSpec {
  const T = c.T, net = T.net_gbp;
  const nAssets = s.assets.length, nUK = s.assets.filter((a) => a.country === 'UK').length;
  const nDebts = s.debts.filter((d) => d.balance > 0).length;
  const fixedR = Math.round(s.assets.filter((a) => /^locked until \d+ \w+ \d{4}$/.test(a.liquidity)).reduce((t, a) => t + toG(a), 0));
  const locked = T.own_gbp - T.liquid_gbp - fixedR;
  const big = s.ccy === 'INR' ? inr(T.net_inr) : gbp(net);
  const last = [...s.audit].reverse().find((r) => r.at.slice(0, 10) === DAY_ISO[s.clock] && ['register', 'correction', 'check_in_paid', 'statement_confirm'].includes(r.kind));
  const H1 = hero({
    over: 'Household net worth', big,
    seg: c.web ? undefined : ccySeg(s, false),
    whose: c.web ? undefined : seg(['Household', 'Me', 'Asha'], 0, WHOSE),
    deltaUp: last ? '▲' : undefined,
    deltaT: last ? `at ${last.at.slice(11, 16)} · ${last.summary.split(' · ').slice(0, 2).join(' · ')}` : undefined,
    rate: '£1 = ₹112.50 · ECB reference rate, Fri 23 Oct · prices at the Fri 23 Oct close',
  });
  const oo = card('What we own and owe', pct(T.owe_gbp, T.own_gbp) + ' of what we own is owed', [
    bar('We own', gbp(T.own_gbp), '100%', `${nAssets} assets in the UK and India`),
    bar('We owe', gbp(T.owe_gbp), pct(T.owe_gbp, T.own_gbp), `${nDebts} loans and cards`, 'f-grey'),
  ]);
  const bc = card('By country', 'in pounds', [
    bar('United Kingdom', gbp(T.by_country_gbp.UK), pct(T.by_country_gbp.UK, net), `${pct(T.by_country_gbp.UK, net)} · ${nUK} assets, held in pounds`),
    bar('India', gbp(T.by_country_gbp.IN), pct(T.by_country_gbp.IN, net), `${pct(T.by_country_gbp.IN, net)} · ${nAssets - nUK} assets, 1 loan, held in rupees: ${inr(T.by_country_gbp.IN * 112.5)}`),
  ]);
  const bm = card('By member', 'joint records by share', [
    bar('Arun', gbp(T.by_member_gbp.arun), pct(T.by_member_gbp.arun, net), `${pct(T.by_member_gbp.arun, net)} · his own records and his half of the joint ones`),
    bar('Asha', gbp(T.by_member_gbp.asha), pct(T.by_member_gbp.asha, net), `${pct(T.by_member_gbp.asha, net)} · her own records and her half of the joint ones`),
  ]);
  const ll = card('Liquid and locked', pct(locked, T.own_gbp) + ' is locked', [
    { k: 'stack', segs: [{ w: pct(T.liquid_gbp, T.own_gbp), c: 'f-blue' }, { w: pct(fixedR, T.own_gbp), c: 'f-violet' }, { w: pct(locked, T.own_gbp), c: 'f-amber' }] },
    row({ name: 'Liquid now', sub: `${s.assets.filter((a) => a.liquidity === 'liquid').length} records: cash, savings, funds and shares`, v: gbp(T.liquid_gbp), sw: 'f-blue' }),
    row({ name: 'Fixed term', sub: 'pay out at maturity; next the saver, £10,460 on Mon 14 Dec', v: gbp(fixedR), sw: 'f-violet' }),
    row({ name: 'Locked', sub: 'two homes, and two pensions that unlock at 57', v: gbp(locked), sw: 'f-amber' }),
  ]);
  const due = card("What's due", 'next 30 days', [...DUE(s), p('Each is asked in the chat on its day, with the answer one tap away.')]);
  const top = [...s.assets].sort((a, b) => toG(b) - toG(a));
  const la = card('Largest assets', 'each in its own currency', [
    ...top.slice(0, 5).map((a) => row({ lead: initials(a.name), name: a.name, sub: `${a.country === 'IN' ? 'India · ₹' : 'UK · £'} · ${owners(a.owners)}`, ...both(a.value, a.ccy), act: nav('asset', { id: a.id }) })),
    p(`${top.length - 5} more records, ${gbp(top.slice(5).reduce((t, a) => t + toG(a), 0))} in all.`),
    link('All assets', nav('assets')),
  ]);
  const links = card('Everything else', '', ([
    ['donut_small', 'Assets', 'assets'], ['credit_card', 'Debts', 'debts'], ['savings', 'Budget', 'budget'], ['trending_up', 'Projection', 'projection'], ['history', 'Audit', 'audit'],
  ] as const).map(([icon, name, id]) => row({ icon, name, act: nav(id), chev: true })), 'links');
  const wide = c.layout.nav === 'sidebar';
  return {
    title: 'Home',
    sub: `${c.dayLabel} · prices at the Fri 23 Oct close · illustrative figures`,
    ctrls: c.web ? { whose: seg(['Household', 'Me', 'Asha'], 0, WHOSE), ccy: ccySeg(s, true), eye: true } : undefined,
    colsCls: 'toprow',
    cols: wide ? [[H1], [oo, bc, bm, la], [ll, due]] : [[H1, oo, bc, bm, ll, due, la, links]],
  };
}

register({
  id: 'home',
  pages: [
    { meta: { id: 'home', title: 'Home', icon: 'home', area: 'home', side: 1, ask: 'Ask about Home, or tell MyPaisa something new' }, build: homePage },
    { meta: { id: 'chat', title: 'Chat', icon: 'chat_bubble', area: 'home' }, build: () => ({ title: 'Chat', cols: [] }) },
  ],
  /* The core appliers: the one write path's effect on the records. Areas add their own kinds. */
  appliers: {
    register: (s, ev) => {
      if ([...s.assets, ...s.debts].some((r) => r.id === ev.record)) return; // a replay of a record already held
      const rec = ev.payload ?? (ev.record === h.new_record_in_prototype.id ? h.new_record_in_prototype : null);
      if (!rec) return;
      if ('balance' in rec) s.debts.push(structuredClone(rec)); else s.assets.push(structuredClone(rec));
    },
    'register:undo': (s, ev) => { s.assets = s.assets.filter((a) => a.id !== ev.record); s.debts = s.debts.filter((d) => d.id !== ev.record); },
    correction: (s, ev) => {
      const r: any = [...s.assets, ...s.debts].find((x) => x.id === ev.record);
      if (r && typeof ev.after === 'number') r[ev.field ?? 'value'] = ev.after;
    },
    check_in_paid: (s, ev) => {
      const d: any = s.debts.find((x) => x.id === ev.record);
      if (!d) return;
      d.balance_before_emi = d.balance;
      d.balance = d.balance_after_nov_emi ?? Math.max(0, d.balance - (Number(ev.after) || 0));
      const ci = s.checkIns.find((c) => c.record === ev.record && c.status === 'due'); if (ci) ci.status = 'paid';
    },
    'check_in_paid:undo': (s, ev) => {
      const d: any = s.debts.find((x) => x.id === ev.record);
      if (d && d.balance_before_emi !== undefined) d.balance = d.balance_before_emi;
      const ci = s.checkIns.find((c) => c.record === ev.record && c.status === 'paid'); if (ci) ci.status = 'due';
    },
    statement_confirm: (s) => {
      const cd: any = s.debts.find((x) => x.id === 'card');
      if (cd) cd.balance = h.statements_oct.barclaycard_nov.balance;
    },
  },
});
