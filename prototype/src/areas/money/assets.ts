/* Assets and An asset (Web v4 · Assets and debts, iPhone v4 · Assets and debts, iPad v4 · Budget, assets and debts;
   Prototype v4's `assets` and `homeval` pages, and its homeChart). Records come from s.assets, grouped by kind. */
import { chart, type ChartSpec, type Pt } from '../../lib/chart';
import { dayLabel, FX } from '../../lib/format';
import type { PageCtx, PageSpec, Block, PagePart } from '../../state/registry';
import type { Asset, AuditRow, DemoState } from '../../state/model';
import { card, gbp, hero, inr, initials, kv, nav, note, p, row, bar, sec } from '../kit';
import {
  canEdit, correctionEvent, dl, dly, dm, editOff, editOn, editing, lastCorrection, money, num, ownerText, pc1, short, today, whyNot, yr, cap, POSS, NAME,
  twoCols, rate,
} from './util';
import { totals } from '../../state/totals';

const GROUPS: { title: string; kinds: string[] }[] = [
  { title: 'Investments', kinds: ['oeic', 'etf', 'commodity_etc', 'mutual_fund', 'share'] },
  { title: 'Cash and savings', kinds: ['cash', 'savings_account'] },
  { title: 'Property', kinds: ['property'] },
  { title: 'Fixed term', kinds: ['fixed_saver', 'fixed_deposit', 'ppf', 'endowment'] },
  { title: 'Pensions', kinds: ['workplace_pension', 'sipp'] },
];
const KIND_LABEL: Record<string, string> = {
  oeic: 'Fund', etf: 'ETF', commodity_etc: 'ETC', mutual_fund: 'Mutual fund', share: 'Share', cash: 'Cash', savings_account: 'Savings account',
  property: 'Property', fixed_saver: 'Fixed-rate saver', fixed_deposit: 'Fixed deposit', ppf: 'PPF', endowment: 'Endowment policy',
  workplace_pension: 'Workplace pension', sipp: 'SIPP',
};
const toG = (a: Asset) => (a.ccy === 'INR' ? a.value / FX : a.value);
const ctry = (a: Asset) => (a.country === 'IN' ? 'India' : 'UK');

/** The line under a record's name, as the boards write it. */
function subOf(a: any): string {
  const o = [ownerText(a.owners)];
  if (a.account) o.push(a.account.replace(' · ', ' · '));
  else if (a.country === 'IN' && a.kind === 'savings_account') o.push('India');
  if (a.kind === 'fixed_saver' || a.kind === 'fixed_deposit') o.push(rate(a.rate), `${money(a.at_maturity, a.ccy)} on ${dl(a.matures)}`);
  if (a.kind === 'ppf') o.push(rate(a.rate), `to ${+a.matures.slice(8)} ${dly(a.matures).split(' ').slice(2).join(' ')}`);
  if (a.kind === 'endowment') o.push(a.value_note ?? 'surrender value');
  if (a.unlocks_at) o.push(`unlocks at ${a.unlocks_at}`);
  if (a.registered && a.kind === 'savings_account') o.push(`added in the chat, ${a.registered.slice(11, 16)}`);
  return o.join(' · ');
}
function valuedLine(s: DemoState, a: any): string | undefined {
  if (a.kind !== 'property') return undefined;
  const c = lastCorrection(s, a.id);
  if (c) return `your estimate, ${dayLabel(c.at)}`;
  const t = today(s);
  return a.valuation_due && a.valuation_due < t ? `valued ${dm(a.valued)} · overdue since ${dm(a.valuation_due)}` : `valued ${dl(a.valued)} · due ${dl(a.valuation_due)}`;
}

function assetRow(s: DemoState, a: Asset): PagePart {
  const g: any = a;
  const sub2 = valuedLine(s, g);
  const overdue = g.kind === 'property' && g.valuation_due && g.valuation_due < today(s) && !lastCorrection(s, a.id);
  const isNew = g.registered && s.applied.includes('e-monzo-register') && s.clock === 'd1';
  const tags = [...(overdue ? [{ t: 'Overdue', cls: 'mp-pause' }] : []), ...(isNew ? [{ t: 'New', cls: 'mp-add' }] : [])];
  const v = a.ccy === 'INR' ? { v: inr(a.value), v2: '≈ ' + gbp(a.value / FX) } : { v: gbp(a.value) };
  return row({ lead: a.name.trim().includes(' ') ? initials(a.name) : a.name.slice(0, 2).toUpperCase(), name: a.name, sub: subOf(g), sub2, ...v, tags: tags.length ? tags : undefined, act: nav('asset', { id: a.id }), chev: true });
}

function assetsPage(s: DemoState, c: PageCtx): PageSpec {
  const T = c.T;
  const n = s.assets.length, nLiq = s.assets.filter((a) => a.liquidity === 'liquid').length;
  const groups: Block[] = [];
  for (const gr of GROUPS) {
    const rs = s.assets.filter((a) => gr.kinds.includes(a.kind));
    if (!rs.length) continue;
    /* a record added in the chat leads its group, as the board draws it */
    const order = [...rs].sort((a, b) => (b as any).registered ? 1 : (a as any).registered ? -1 : 0);
    groups.push(card(gr.title, gbp(rs.reduce((t, a) => t + toG(a), 0)), order.map((a) => assetRow(s, a))));
  }
  const heroB = hero({
    over: 'What you own · household', right: `${n} records`, big: s.ccy === 'INR' ? inr(T.own_gbp * FX) : gbp(T.own_gbp),
    sub: 'UK and India, in pounds at £1 = ₹112.50 (ECB, Fri 23 Oct)',
    stats: [
      { key: 'Liquid', v: gbp(T.liquid_gbp), s: `${nLiq} records` },
      { key: 'Notice', v: '£0', s: 'none' },
      { key: 'Locked', v: gbp(T.own_gbp - T.liquid_gbp), s: `${n - nLiq} records` },
    ],
  });
  return {
    title: 'Assets',
    sub: `${c.dayLabel}, ${s.time} · investments at the Fri 23 Oct close, the rest as last recorded · Illustrative figures`,
    ctrls: c.web ? { eye: true } : undefined,
    colsCls: 'one',
    cols: [[heroB, ...groups]],
  };
}

/* ---------- charts ---------- */
const lblTop = (v: number) => v;
function valueChart(s: DemoState, a: any, hist: { x: number; v: number }[], now: number): ChartSpec {
  const x0 = hist[0].x - 0.0, x1 = now + 0.08;
  const max = Math.max(...hist.map((h) => h.v));
  const y1 = max * 1.12;
  const unit = a.ccy === 'INR' ? 1e6 : 1e5;
  const g = Math.round((max * 0.88) / unit) * unit;
  const pts: Pt[] = [];
  hist.forEach((h, i) => { if (i) pts.push([h.x, hist[i - 1].v]); pts.push([h.x, h.v]); });
  pts.push([x1, hist[hist.length - 1].v]);
  const X = (x: number) => ((x - x0) / (x1 - x0)) * 100;
  const mid = Math.round((x0 + x1) / 2);
  const ch = chart({
    x0, x1, y0: 0, y1, h: 130, line: pts, gridAt: [g], yLabel: (v) => short(v, a.ccy),
    xTicks: [{ x: x0, t: myr0(a.bought?.[0]), cls: 'ax0' }, ...(mid > x0 + 1 && mid < x1 - 1 ? [{ x: mid, t: String(mid) }] : []), { x: x1, t: 'Oct 2026', cls: 'ax1' }],
    dots: hist.map((h) => ({ x: h.x, y: h.v })),
    lbls: [
      { x: x0 + 0.02, y: hist[0].v, t: `Bought ${money(hist[0].v, a.ccy)}`, cls: 'pc-left' },
      ...(hist.length > 1 ? [{ x: hist[hist.length - 1].x, y: hist[hist.length - 1].v, t: money(hist[hist.length - 1].v, a.ccy) }] : []),
    ],
    leg: [{ t: 'Value as recorded, a step at each valuation', cls: 'k-line' }],
  });
  ch.dBand = ch.dLine + ' L100 100 L0 100 Z';
  void X; void lblTop;
  return ch;
}
const myr0 = (iso?: string) => (iso ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '');

/** a deposit grown from its principal: a step each quarter (SBI FD) or a straight climb to maturity (the saver) */
function depositChart(a: any, nowIso: string): ChartSpec | null {
  if (!a.opened || !a.matures || !a.rate) return null;
  const P = a.principal ?? (a.at_maturity ? a.at_maturity / (1 + a.rate) : a.value);
  const x0 = yr(a.opened), x1 = yr(a.matures), xn = yr(nowIso);
  const pts: Pt[] = [];
  const dots: { x: number; y: number }[] = [];
  let nowV = a.value;
  if (a.compounding === 'quarterly') {
    const years = Math.round(x1 - x0), q = years * 4;
    for (let k = 0; k <= q; k++) {
      const x = x0 + k / 4, v = P * Math.pow(1 + a.rate / 4, k);
      if (k) pts.push([x, pts[pts.length - 1][1]]);
      pts.push([x, v]);
    }
  } else { pts.push([x0, P], [x1, a.at_maturity ?? P * (1 + a.rate)]); }
  const end = pts[pts.length - 1][1];
  dots.push({ x: xn, y: nowV }, { x: x1, y: end });
  const ch = chart({
    x0, x1, y0: P * 0.82, y1: end * 1.06, h: 130, line: pts, gridAt: [P * 1.1], yLabel: (v) => short(v, a.ccy),
    xTicks: [{ x: x0, t: myr0(a.opened), cls: 'ax0' }, { x: x1, t: myr0(a.matures), cls: 'ax1' }],
    dots,
    lbls: [{ x: xn, y: nowV, t: `Now ${money(nowV, a.ccy)}`, cls: 'pc-below' }, { x: x1, y: end, t: money(end, a.ccy), cls: 'pc-left' }],
    leg: [{ t: a.compounding === 'quarterly' ? 'Value, a step each quarter as interest is added' : 'Value, climbing to maturity', cls: 'k-line' }],
  });
  ch.dBand = ch.dLine + ' L100 100 L0 100 Z';
  return ch;
}

/* ---------- An asset ---------- */
function facts(s: DemoState, a: any, T: any): PagePart[] {
  const cells: { key: string; v: string; s?: string; up?: boolean }[] = [];
  const m = (v: number) => money(v, a.ccy);
  const c = lastCorrection(s, a.id);
  if (a.kind === 'property') {
    const loan: any = s.debts.find((d) => d.linked === a.id) ?? (a.id === 'home' ? s.debts.find((d) => d.id === 'mortgage') : undefined);
    const gain = a.value - a.bought[1];
    cells.push(
      { key: 'Bought', v: m(a.bought[1]), s: dl(a.bought[0]) },
      { key: 'Gain on paper', v: '▲ ' + m(gain), s: `▲ ${pc1(gain / a.bought[1])} on the price`, up: true },
    );
    if (loan) cells.push({ key: 'Mortgage on it', v: m(loan.balance), s: loan.id === 'mortgage' ? 'Nationwide, joint' : 'HDFC, Arun' }, { key: 'Equity', v: m(a.value - loan.balance), s: 'value less the loan' });
    if (a.owners.length === 2) cells.push({ key: 'Each half', v: m(a.value / 2), s: "Arun's and Asha's" });
    cells.push({ key: 'Last valued', v: c ? dm(c.at) : dm(a.valued), s: c ? 'your estimate · next due in six months' : `your figure · due ${dm(a.valuation_due)}` });
    if (a.rent_month) cells.push({ key: 'Rent', v: m(a.rent_month) + ' a month', s: 'joint, half each' });
  } else {
    if (a.units) cells.push({ key: 'Units', v: String(a.units), s: 'from the holdings statement' });
    if (a.nav ?? a.price) cells.push({ key: a.nav ? 'NAV' : 'Price', v: a.ccy === 'INR' ? '₹' + (a.nav ?? a.price).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : gbp(a.price), s: 'Fri 23 Oct close' });
    if (a.invested) cells.push({ key: 'Invested', v: m(a.invested), s: 'put in so far' });
    if ('xirr' in a) cells.push({ key: 'XIRR', v: a.xirr == null ? 'Unknown' : pc1(a.xirr), s: a.xirr == null ? 'no buys recorded' : 'measured from the past buys' });
    if (a.sip) cells.push({ key: 'SIP', v: m(a.sip[0]), s: `on the ${a.sip[1]}th each month` });
    if (a.principal) cells.push({ key: 'Put in', v: m(a.principal), s: 'the principal' });
    if (a.rate) cells.push({ key: 'Rate', v: rate(a.rate), s: a.compounding ? `a year, compounded ${a.compounding}` : 'a year' });
    if (a.opened) cells.push({ key: 'Opened', v: dm(a.opened) + ' ' + a.opened.slice(0, 4), s: dly(a.opened) });
    if (a.matures) cells.push({ key: 'Matures', v: dm(a.matures) + ' ' + a.matures.slice(0, 4), s: dly(a.matures) });
    if (a.premium_year) cells.push({ key: 'Premium', v: m(a.premium_year) + ' a year', s: `next due ${dl(a.premium_due)}` });
    if (a.sum_assured) cells.push({ key: 'Sum assured', v: m(a.sum_assured), s: 'paid out at maturity' });
    if (a.unlocks_at) cells.push({ key: 'Unlocks at', v: String(a.unlocks_at), s: 'the pension age' });
    if (a.valued && a.kind !== 'property') cells.push({ key: 'Last valued', v: dm(a.valued) + ' ' + a.valued.slice(0, 4), s: dly(a.valued) });
    if (a.account) cells.push({ key: 'Held in', v: a.account, s: ctry(a) });
    if (a.ccy === 'INR') cells.push({ key: 'In pounds', v: gbp(a.value / FX), s: 'at £1 = ₹112.50' });
  }
  void T;
  return [{ k: 'grid', cells } as PagePart];
}

const VIA: Record<string, string> = { inline_edit: 'in place', chat: 'in the chat', check_in: 'on the check-in', file: 'from a file', statement: 'from a statement' };
function eventRows(s: DemoState, a: any): PagePart[] {
  const rows = s.audit.filter((r) => r.record === a.id && r.kind !== 'file_received').reverse();
  const out: PagePart[] = rows.map((r: AuditRow, i) => row({
    icon: r.kind === 'correction' ? 'edit' : r.kind === 'register' ? 'add_circle' : 'event_available',
    name: `${r.kind === 'correction' ? 'Correction' : r.kind === 'register' ? 'Record added' : r.kind === 'check_in_paid' ? 'EMI paid' : cap(r.kind.replace(/_/g, ' '))} · ${dayLabel(r.at)}, ${r.at.slice(11, 16)}`,
    sub: `${NAME(r.actor)}, ${VIA[r.via] ?? r.via}${r.kind === 'correction' && r.before != null ? ' · was ' + money(Number(r.before), a.ccy) : ''}`,
    v: r.after != null ? money(Number(r.after), a.ccy) : undefined,
    tags: i === 0 && r.illustrative !== true && r.kind === 'correction' ? [{ t: 'New', cls: 'mp-add' }] : undefined,
  }));
  s.checkIns.filter((x) => x.record === a.id && x.status !== 'paid').forEach((ci) => {
    const answered = s.applied.some((id) => lastCorrection(s, a.id)?.id === id);
    out.push(row({ icon: 'notifications', name: `Check-in · ${dayLabel(ci.when)}, ${ci.when.slice(11, 16)}`, sub: `${ci.asks ?? ci.what} ${answered ? 'Answered by the correction' : 'Waiting in the chat'}`, v: answered ? 'answered' : 'open' }));
  });
  if (a.valued && a.kind === 'property') out.push(row({ icon: 'home_work', name: `Valuation · ${dly(a.valued)}`, sub: 'Arun, in the chat', v: money(lastCorrection(s, a.id) ? Number(lastCorrection(s, a.id)!.before) : a.value, a.ccy) }));
  if (a.bought) out.push(row({ icon: 'flag', name: `Bought · ${dly(a.bought[0])}`, sub: ownerText(a.owners), v: money(a.bought[1], a.ccy) }));
  if (a.opened) out.push(row({ icon: 'flag', name: `Opened · ${dly(a.opened)}`, sub: a.rate ? `at ${rate(a.rate)}` : '', v: a.principal ? money(a.principal, a.ccy) : undefined }));
  if (!rows.length && !a.bought && !a.opened && !(a.valued)) out.push(row({ icon: 'inventory_2', name: `Holding recorded · ${a.units ? a.units + ' units' : 'the balance'}`, sub: 'from the latest statement', v: money(a.value, a.ccy) }));
  return out;
}

function assetPage(s: DemoState, c: PageCtx): PageSpec {
  const a: any = s.assets.find((x) => x.id === c.params.id);
  if (!a) return { title: 'Asset', crumb: { t: 'Assets', act: nav('assets') }, cols: [[card('Not found', '', [p('This record is not in the household.')])]] };
  const m = (v: number) => money(v, a.ccy);
  const key = 'asset:' + a.id;
  const can = canEdit(s, a);
  const corr = lastCorrection(s, a.id);
  const noHist = a.kind === 'share' && a.xirr == null;
  const kindL = KIND_LABEL[a.kind] ?? cap(a.kind);
  const over = `${kindL} · ${ctry(a)} · ${ownerText(a.owners)}`;
  const sub0 = a.ccy === 'INR' ? `≈ ${gbp(a.value / FX)} at £1 = ₹112.50` : undefined;
  const parts: PagePart[] = [sec(over)];
  if (editing(s, key) && can) {
    parts.push({
      k: 'edit', lbl: `Value of ${a.name}`, prefix: a.ccy === 'INR' ? '₹' : '£', ph: m(a.value),
      note: 'Save writes a correction with its audit row. Nothing else on the record changes.',
      preview: (v) => {
        const n = num(v); if (!n) return null;
        const after = s.assets.map((x) => (x.id === a.id ? { ...x, value: n } : x));
        const T0 = c.T, T1 = totals(after, s.debts);
        const d = n - a.value;
        return {
          before: m(a.value), after: m(n),
          delta: n === a.value ? undefined : (d >= 0 ? '▲ ' : '▼ ') + m(Math.abs(d)),
          net: n === a.value ? undefined : c.mp(`Net worth ${gbp(T0.net_gbp)} → ${gbp(T1.net_gbp)}, from the engine`),
        };
      },
      save: (v) => {
        const n = num(v);
        if (!n || n === a.value) return editOff;
        /* the ledger's own Home correction when it is the one the walk makes (Rule 2), else an illustrative one */
        const canon = a.id === 'home' && n === 428000 && !s.applied.includes('e-home-correction');
        return [canon ? { type: 'event', id: 'e-home-correction' } : correctionEvent(s, a, n), editOff];
      },
      cancel: editOff,
    });
  } else {
    parts.push({
      k: 'big', big: m(a.value), pen: can, act: can ? editOn(key) : undefined, cls: '',
      sub: [sub0, corr ? `your estimate, ${dayLabel(corr.at)}` : noHist ? `${a.units} shares × ₹${a.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, the Fri 23 Oct close.` : can ? 'Tap the figure to correct it.' : undefined].filter(Boolean).join(' · ') || undefined,
    });
    if (!can) parts.push({ k: 'lock', t: whyNot(a) });
    if (corr) {
      parts.push({
        k: 'ok', link: 'Open in Audit', act: nav('audit'),
        t: c.mp(`Corrected in place by ${NAME(corr.actor)}, ${dayLabel(corr.at)}, ${corr.at.slice(11, 16)}: ${m(Number(corr.before))} → ${m(Number(corr.after))}, ${POSS(corr.actor)} estimate. Written as a correction with its audit row (via inline edit). Net worth is now ${gbp(c.T.net_gbp)}, the engine's figure.`),
      });
    }
  }
  const tags: { t: string; cls?: string; icon?: string }[] = [];
  if (a.liquidity === 'liquid') tags.push({ t: 'Liquid', cls: 'mp-hold', icon: 'water_drop' });
  else tags.push({ t: a.liquidity.startsWith('locked until') ? a.liquidity.replace('locked until', 'Locked until') : 'Locked', cls: 'mp-neutral', icon: 'lock' });
  if (a.account) tags.push({ t: a.account, cls: 'mp-neutral', icon: 'account_balance' });
  if (a.kind === 'property') {
    const ci = s.checkIns.find((x) => x.record === a.id);
    if (corr) tags.push({ t: 'Valuation check-in answered', cls: 'mp-add', icon: 'event_available' });
    else if (ci) tags.push({ t: `Valuation ${a.valuation_due < today(s) ? 'overdue since ' + dm(a.valuation_due) : 'due ' + dl(a.valuation_due).replace(/ 20\d\d$/, '')}`, cls: 'mp-pause', icon: 'schedule' });
  }
  parts.push({ k: 'tags', tags });
  /* the chart */
  if (a.kind === 'property' && a.bought) {
    const hist = [{ x: yr(a.bought[0]), v: a.bought[1] }];
    const first = corr ? Number(lastCorrection(s, a.id)!.before) : a.value;
    hist.push({ x: yr(a.valued), v: first });
    if (corr) hist.push({ x: yr(corr.at), v: Number(corr.after) });
    parts.push({ k: 'chart', ch: valueChart(s, a, hist, 2026.82) });
  } else {
    const dc = depositChart(a, today(s));
    if (dc) parts.push({ k: 'chart', ch: dc });
  }
  const top = card('', '', parts);

  const left: Block[] = [top];
  if (noHist) {
    left.push(card('Return', '', [
      { k: 'pill', icon: 'help', name: 'XIRR unknown', sub: 'There are no past buys for Infosys, so the engine cannot work out a return. The projection needs one: add past buys or an estimate.' },
      { k: 'btn', t: 'Add past buys in the chat', icon: 'receipt_long', act: { type: 'nope', t: 'Past buys and estimates come through the chat; that flow is drawn on the boards, not in this demo yet.' }, cls: 'mp-btn-tinted' },
      note('chat', 'A tradebook or contract notes give the real XIRR; an estimate is kept and shown as yours.'),
    ]));
  }
  if (a.at_maturity) {
    left.push(card('At maturity', dl(a.matures), [
      { k: 'big', big: m(a.at_maturity), sub: a.ccy === 'INR' ? `${gbp(a.at_maturity / FX)} at today's rate` : undefined },
      kv('Interest by then', m(a.at_maturity - (a.principal ?? a.value))),
      note('functions', 'The maturity value is worked out from the rate and the dates, so it is not edited itself: correct the rate or a date and it follows.'),
      ...(a.on_maturity === 'ask' ? [note('help', `Still to be asked: renew it, renew it with the interest, or pay it out. MyPaisa asks Arun on the day, ${dl(a.matures)}.`)] : []),
    ]));
  }
  const fcard = card(a.kind === 'property' ? 'The property' : a.at_maturity ? 'Terms' : noHist ? 'The holding' : 'About it', corr ? 'after the correction' : '', facts(s, a, c.T));
  const evs = eventRows(s, a);
  const ecard = card('Events', `${evs.length} event${evs.length === 1 ? '' : 's'}`, evs);
  const wide = twoCols(s, c);
  return {
    title: a.name,
    sub: [kindL, ctry(a), ownerText(a.owners), a.liquidity === 'liquid' ? 'liquid' : a.liquidity.replace('locked until', 'locked until'), a.ccy === 'INR' ? 'rupees first, pounds beside at £1 = ₹112.50' : ''].filter(Boolean).join(' · '),
    crumb: { t: 'Assets', act: nav('assets') },
    cols: wide ? [left, [fcard, ecard]] : [[...left, fcard, ecard]],
  };
}

export const assetPages = [
  { meta: { id: 'assets', title: 'Assets', icon: 'donut_small', area: 'money', side: 2, ask: 'Ask about your assets' }, build: assetsPage },
  { meta: { id: 'asset', title: 'Asset', icon: 'donut_small', area: 'money', parent: 'assets', ask: 'Ask about this record' }, build: assetPage },
];
void bar;
