/* Debts and A loan (Web v4 · Assets and debts, iPhone v4 · Assets and debts, iPad v4 · Budget, assets and debts;
   Prototype v4's `debts` and `hdfc` pages and its hdfcChart). Balances come from s.debts, so they move when the
   Thu 5 Nov EMI is applied. */
import { chart, type ChartSpec, type Pt } from '../../lib/chart';
import { dayLabel, FX } from '../../lib/format';
import type { PageCtx, PageSpec, Block, PagePart } from '../../state/registry';
import type { Debt, DemoState } from '../../state/model';
import { card, gbp, hero, inr, initials, kv, nav, note, p, row, sec } from '../kit';
import { dly, dl, dm, money, myr, ownerText, pc1, short, today, yr, NAME, twoCols, rate,
} from './util';

const toG = (d: Debt) => (d.ccy === 'INR' ? d.balance / FX : d.balance);
const paidEarly = (d: any) => d.balance_before_emi !== undefined;
const made = (d: any) => (d.payments_made ?? 0) + (paidEarly(d) ? 1 : 0);
const monthsBetween = (a: string, b: string) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
/** the EMI counts remaining from the loan's own end date, so an overpayment that shortened the term shows */
const remaining = (d: any) => monthsBetween(d.balance_after, d.ends) - (paidEarly(d) ? 1 : 0);
const interestLeft = (d: any) => Math.max(0, remaining(d) * d.payment - d.balance);
const hasEmi = (d: any) => typeof d.payment === 'number' && d.kind !== 'credit_card';
const LEAD: Record<string, string> = { mortgage: 'NW', car: 'CL', hdfc: 'HD', card: 'BC' };

function subOf(s: DemoState, d: any): string {
  if (d.kind === 'credit_card') {
    const live = d.balance > 0;
    return live
      ? `${ownerText(d.owners)} · statement of ${dayLabel(d.next_statement.date)}, due ${dayLabel(d.next_statement.due)}`
      : `${ownerText(d.owners)} · the ${dm(d.statement.date)} statement's ${money(d.statement.balance, 'GBP')} paid in full on ${dayLabel('2026-10-20')}`;
  }
  const parts = [ownerText(d.owners), `${money(Math.round(d.payment), d.ccy)} a month`, rate(d.rate)];
  const fixed = /fixed to ([^,]+)/.exec(d.rate_note ?? '');
  if (fixed) parts[2] += `, fixed to ${fixed[1]}`;
  if (d.autopay) parts.push('autopay');
  const lk = s.assets.find((a) => a.id === d.linked);
  if (lk) parts.push(lk.name.split(',')[0] === 'Flat' ? 'Pune flat' : lk.name);
  return parts.join(' · ');
}

function debtsPage(s: DemoState, c: PageCtx): PageSpec {
  const T = c.T;
  const emis = s.debts.filter(hasEmi);
  const monthly = emis.reduce((t, d: any) => t + (d.ccy === 'INR' ? d.payment / FX : d.payment), 0);
  const left = emis.reduce((t, d: any) => t + interestLeft(d) / (d.ccy === 'INR' ? FX : 1), 0);
  const last = [...emis].sort((a: any, b: any) => (a.ends < b.ends ? 1 : -1))[0] as any;
  const card1: any = s.debts.find((d) => d.kind === 'credit_card');
  const cardOwed = !!card1 && card1.balance > 0;
  const afterEmi = s.debts.some((d: any) => paidEarly(d));
  const heroB = hero({
    over: 'What you owe · household', right: `${s.debts.length} debts`, big: s.ccy === 'INR' ? inr(T.owe_gbp * FX) : gbp(T.owe_gbp),
    sub: (afterEmi ? "After each loan's last payment, Thursday's HDFC EMI included. " : "After each loan's last payment. ")
      + (cardOwed ? `The card's ${dayLabel(card1.next_statement.date)} statement, ${gbp(card1.balance)}, is owed until it is paid; it is due ${dayLabel(card1.next_statement.due)}.` : 'The card is clear.')
      + ' Rupees in pounds at £1 = ₹112.50.',
    stats: [
      { key: 'Each month', v: gbp(monthly), s: `${emis.length} loans` },
      { key: 'Interest left', v: gbp(left), s: "at today's rates" },
      { key: 'Debt-free', v: myr(last.ends), s: 'the mortgage ends' },
    ],
  });
  const loans = card('The loans', 'tap one to open it', s.debts.map((d: any) => row({
    lead: LEAD[d.id] ?? initials(d.name), name: d.name, sub: subOf(s, d),
    v: money(d.balance, d.ccy), v2: d.ccy === 'INR' ? '≈ ' + gbp(d.balance / FX) : undefined,
    tags: d.kind === 'credit_card'
      ? (cardOwed ? [{ t: `Due ${dm(card1.next_statement.due)}`.replace(/^Due /, 'Due ') + '', cls: 'mp-pause', icon: 'schedule' }] : undefined)
      : [{ t: `Ends ${myr(d.ends)}`, cls: 'mp-neutral', icon: 'event' }, ...(d.id === 'car' && s.applied.includes('e-emi-car') ? [{ t: 'October confirmed', cls: 'mp-add', icon: 'task_alt' }] : [])],
    act: nav('debt', { id: d.id }), chev: true,
  })));
  return {
    title: 'Debts', sub: `${c.dayLabel} · after each loan's last payment · Illustrative figures`,
    ctrls: c.web ? { eye: true } : undefined,
    colsCls: 'one',
    cols: [[heroB, loans]],
  };
}

/* ---------- the amortisation chart (Prototype v4's hdfcChart, for any loan) ---------- */
function amortChart(d: any, now: number): ChartSpec {
  const r = d.rate / 12, E = d.payment, P0 = d.principal, n = d.term_months;
  const x0 = yr(d.first_payment), x1 = x0 + n / 12;
  const bal = (k: number) => Math.max(0, P0 * Math.pow(1 + r, k) - (E * (Math.pow(1 + r, k) - 1)) / r);
  const paid: Pt[] = [], plan: Pt[] = [];
  for (let k = 0; k <= n; k += 3) {
    const x = x0 + k / 12, b = bal(k);
    if (k <= now) paid.push([x, b]);
    if (k >= now - (now % 3)) plan.push([x, b]);
  }
  const nx = x0 + now / 12, nb = d.balance;
  paid.push([nx, nb]); plan.unshift([nx, nb]);
  const rnd = (v: number) => { const mag = Math.pow(10, Math.floor(Math.log10(v))); return Math.round(v / mag) * mag; };
  const g = [0.25, 0.5, 0.75].map((f) => rnd(P0 * f));
  const ch = chart({
    x0, x1, y0: 0, y1: P0 * 1.05, h: 150, line: paid, dash: plan, gridAt: g, yLabel: (v) => short(v, d.ccy),
    xTicks: [{ x: x0, t: String(Math.floor(x0)), cls: 'ax0' }, ...[2020, 2025].filter((y) => y > x0 + 1 && y < x1 - 1).map((y) => ({ x: y, t: String(y) })), { x: x1, t: String(Math.floor(x1)), cls: 'ax1' }],
    dots: [{ x: nx, y: nb }],
    lbls: [{ x: nx, y: nb, t: 'Now ' + money(nb, d.ccy), cls: 'pc-below' }],
    leg: [{ t: 'Balance, as paid', cls: 'k-line' }, { t: 'The original plan', cls: 'k-dash' }],
  });
  ch.dBand = ch.dLine + ' L' + ((nx - x0) / (x1 - x0) * 100).toFixed(2) + ' 100 L0 100 Z';
  return ch;
}

/** the date of the k-th EMI back from the last one, "Mon 5 Oct 2026" */
function emiDate(d: any, back: number): string {
  const last = (paidEarly(d) ? (d.after_date ?? '2026-11-' + String(d.payment_day).padStart(2, '0')) : d.balance_after) as string;
  let y = +last.slice(0, 4), m = +last.slice(5, 7) - back;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}-${String(d.payment_day).padStart(2, '0')}`;
}

function loanPage(s: DemoState, c: PageCtx): PageSpec {
  const d: any = s.debts.find((x) => x.id === c.params.id);
  if (!d) return { title: 'Loan', crumb: { t: 'Debts', act: nav('debts') }, cols: [[card('Not found', '', [p('This loan is not in the household.')])]] };
  const m = (v: number) => money(v, d.ccy);
  const sub = (v: number) => (d.ccy === 'INR' ? gbp(v / FX) : undefined);
  const crumb = { t: 'Debts', act: nav('debts') };
  const wide = twoCols(s, c);
  const owner = ownerText(d.owners);
  const ctry = d.country === 'IN' ? 'India' : 'UK';

  if (d.kind === 'credit_card') {
    const owed = d.balance > 0, st = owed ? d.next_statement : d.statement;
    const top = card('', '', [
      sec(`Credit card · ${ctry} · ${owner} · ${owed ? 'owed' : 'clear'}`),
      { k: 'big', big: m(d.balance), sub: owed ? `The statement of ${dayLabel(st.date)}, owed until it is paid; due ${dayLabel(st.due)}.` : d.balance_note },
      { k: 'tags', tags: owed ? [{ t: `Due ${dayLabel(st.due)}`, cls: 'mp-pause', icon: 'schedule' }] : [{ t: 'Clear', cls: 'mp-add', icon: 'check_circle' }] },
    ]);
    const facts = card('The statement', owed ? dayLabel(st.date) : dayLabel(d.statement.date), [{
      k: 'grid', cells: [
        { key: 'Balance', v: m(owed ? d.balance : d.statement.balance), s: owed ? 'owed now' : 'paid in full on Tue 20 Oct' },
        { key: 'Minimum', v: m(owed ? 25 : d.statement.minimum), s: 'to avoid a late fee' },
        { key: 'Due', v: dm(st.due), s: dayLabel(st.due) },
        { key: 'Next statement', v: owed ? 'Tue 1 Dec' : dm(d.next_statement.date), s: owed ? 'a month on' : dayLabel(d.next_statement.date) },
      ],
    }, note('notifications', 'MyPaisa asks Arun on Fri 20 Nov: paid in full, the minimum, or part?')]);
    const ev = card('Events', '', [
      ...(owed ? [row({ icon: 'receipt_long', name: `Statement · ${dayLabel(d.next_statement.date)}, 08:44`, sub: 'Arun confirmed it in the chat', v: m(d.balance), tags: [{ t: 'New', cls: 'mp-add' }] })] : []),
      row({ icon: 'receipt_long', name: `Statement · ${dayLabel(d.statement.date)}`, sub: 'paid in full on Tue 20 Oct', v: m(d.statement.balance) }),
    ]);
    return { title: d.name, sub: `Credit card · ${ctry} · ${owner}`, crumb, cols: wide ? [[top], [facts, ev]] : [[top, facts, ev]] };
  }

  const nMade = made(d);
  const ahead = paidEarly(d);
  const interestPaid = nMade * d.payment - (d.principal - d.balance);
  const il = interestLeft(d);
  const over = d.overpaid?.length
    ? `${d.overpaid.length === 1 ? 'One overpayment' : d.overpaid.length + ' overpayments'}: ${m(d.overpaid[0][1])} on ${dayLabel(d.overpaid[0][0])}, ${d.overpaid[0][2]}.`
    : 'no prepayments.';
  const lk = s.assets.find((a) => a.id === d.linked);
  const top = card('', '', [
    sec(`${d.kind === 'home_loan' ? 'Home loan' : d.kind === 'car_loan' ? 'Car loan' : 'Mortgage'} · ${ctry} · ${owner} · left to pay`),
    { k: 'big', big: m(d.balance), sub: sub(d.balance) },
    p(`Of ${m(d.principal)} borrowed at ${rate(d.rate)} over ${d.term_months / 12} years, EMIs from ${dly(d.first_payment)}. ${nMade} EMIs paid, ${over}`),
    { k: 'tags', tags: [...(d.overpaid?.length ? [] : [{ t: 'On its original plan', cls: 'mp-add', icon: 'check_circle' }]), { t: `Ends ${myr(d.ends)}`, cls: 'mp-neutral', icon: 'event' }] },
    { k: 'chart', ch: amortChart(d, nMade) },
  ]);
  const terms = card('The loan', 'worked out from its terms', [{
    k: 'grid', cells: [
      { key: 'EMI', v: m(Math.round(d.payment)), s: `on the ${d.payment_day}th${d.ccy === 'INR' ? ' · ' + gbp(d.payment / FX) : ''} · ${d.autopay ? 'autopay' : 'not autopay'}` },
      { key: 'Rate', v: rate(d.rate), s: d.rate_note ? 'a year, ' + d.rate_note.replace(/,.*$/, '') : 'a year' },
      { key: 'Ends', v: myr(d.ends), s: `the ${nMade + remaining(d)}th EMI, ${dayLabel(d.ends)} ${d.ends.slice(0, 4)}` },
      { key: 'Interest left', v: m(il), s: `at ${rate(d.rate)}${d.ccy === 'INR' ? ' · ' + gbp(il / FX) : ''}` },
      { key: 'Interest paid', v: m(interestPaid), s: `since ${myr(d.first_payment)}` },
      { key: 'Repaid', v: m(d.principal - d.balance), s: `of ${m(d.principal)}` },
    ],
  }, note('functions', 'The EMI and the end date are worked out from the terms, so they are not edited themselves: correct the rate or the balance and they follow.')]);
  const confirmed = s.applied.includes('e-emi-car') && (d.id === 'car' || d.id === 'mortgage');
  const paidRow = (back: number, extra?: string) => {
    const dt = emiDate(d, back);
    return row({ icon: 'event_available', name: `EMI · ${dayLabel(dt)} ${dt.slice(0, 4)}`, sub: extra ?? (d.autopay ? 'paid by autopay' : back === 0 ? 'paid, Arun tapped Paid on the check-in' : 'paid'), v: m(Math.round(d.payment)) });
  };
  const evRows: PagePart[] = [];
  if (ahead) {
    const dt = emiDate(d, 0);
    evRows.push(row({ icon: 'event_available', name: `EMI · ${dayLabel(dt)} ${dt.slice(0, 4)}`, sub: `paid, Arun tapped Paid on the check-in at ${s.audit.find((r) => r.kind === 'check_in_paid' && r.record === d.id)?.at.slice(11, 16) ?? '09:12'}`, v: m(Math.round(d.payment)), tags: [{ t: 'New', cls: 'mp-add' }] }));
  } else if (!d.autopay) {
    const nd = emiDate({ ...d, balance_after: d.balance_after }, -1);
    evRows.push(row({ icon: 'notifications', name: `Next: ${dayLabel(nd)}`, sub: `MyPaisa asks Arun: was ${dayLabel(nd).split(' ')[2]}'s EMI paid?`.replace(/Nov's/, "November's"), v: m(Math.round(d.payment)), tags: [{ t: 'Due', cls: 'mp-hold' }] }));
  }
  const past = ahead ? [1, 2] : [0, 1];
  past.forEach((b, i) => evRows.push(paidRow(b, confirmed && !ahead && i === 0 ? 'confirmed by the Monzo statement' : undefined)));
  evRows.push(row({ icon: 'flag', name: `Borrowed · first EMI ${dly(d.first_payment)}`, sub: `at ${rate(d.rate)} over ${d.term_months / 12} years`, v: m(d.principal) }));
  const ev = card('Events', `${nMade} EMIs paid`, evRows);
  void lk; void dl; void NAME;
  return {
    title: d.name,
    sub: `${lk ? 'On the ' + (lk.name.startsWith('Flat') ? 'Pune flat' : lk.name) + ' · ' : ''}${ctry} · ${owner}${d.ccy === 'INR' ? ' · rupees first, pounds beside at £1 = ₹112.50' : ''}`,
    crumb, cols: wide ? [[top], [terms, ev]] : [[top, terms, ev]],
  };
}

export const debtPages = [
  { meta: { id: 'debts', title: 'Debts', icon: 'credit_card', area: 'money', side: 3, ask: 'Ask about your debts' }, build: debtsPage },
  { meta: { id: 'debt', title: 'Loan', icon: 'credit_card', area: 'money', parent: 'debts', ask: 'Ask about this loan' }, build: loanPage },
];
void kv; void toG;
