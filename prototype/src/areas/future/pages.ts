/* The Projection page and its three tabs (MA-264, MA-261): Net worth (1a, the fan first), Plans (3a, bars on a
   timeline) and Budget forecast (1a, the surplus first). Web v4 · Projection, Plans tab, Budget forecast and the
   iPhone v4 equivalents. Rule 4: plan items are made only in the chat; here a plan item is paused, resumed, ended or
   corrected in place, and an assumption is corrected in place. */
import type { Action, DemoState } from '../../state/model';
import type { Block, PageCtx, PagePart, PageSpec } from '../../state/registry';
import { chart, type Pt } from '../../lib/chart';
import { DAY_ISO, ledgerEvent } from '../../state/reduce';
import { dayLabel } from '../../lib/format';
import { H } from '../../data/figures';
import { ask, card, ccySeg, chips, gbp, hero, inr, nav, note, p, row, sec, seg } from '../kit';
import { MON, NOOP, conv, describe, fm, forecastOf, fp, fs, milestones, nextPlanFlow, nowX, pct1, runKey, runOf, span, st, ym, type Plan } from './data';
import { fanFor } from './charts';

const h: any = H;
const area = (name: string, extra: Record<string, any> = {}): Action => ({ type: 'area', area: 'future', name, ...extra });
const TABS = ['networth', 'plans', 'forecast'] as const;
const tabOf = (c: PageCtx) => Math.max(0, TABS.indexOf((c.params.tab ?? 'networth') as any));

/* ---------- the event a page action writes: the ledger's, or an illustrative one ---------- */
export function pageEvent(s: DemoState, id: string | null, mk: () => Record<string, any>): Action {
  const led = id ? ledgerEvent(id) : undefined;
  if (led && !s.applied.includes(led.id) && led.day === s.clock) return { type: 'event', id: led.id };
  const n = s.audit.length;
  const at = `${DAY_ISO[s.clock]}T${s.time}:${String(n % 60).padStart(2, '0')}`;
  const day = `${dayLabel(DAY_ISO[s.clock])} ${s.time}`;
  const m = mk();
  const { summary, ...rest } = m;
  return { type: 'event', ev: { id: `x-${m.kind}-${m.record}-${n}`, at, actor: s.viewer, via: 'inline_edit', ccy: null, run: null, illustrative: true, summary: `${summary} · ${s.viewer === 'asha' ? 'Asha' : 'Arun'} · ${day} · in place`, ...rest } };
}

/* ---------- Net worth ---------- */
const ASM: [string, [string, string, string, string, number | string][]][] = [
  ['Returns', [
    ['Parag Parikh Flexi Cap', 'History, shrunk to a prior', 'history', "Its own 10.7% XIRR, toward India shares' 9%: 3.8 years of history moves the long-run prior only a little.", 'equity_in (Parag Parikh)'],
    ['Balanced and the ETFs', 'Prior', 'public', 'Long-run UK shares.', 'equity_uk (Balanced and ETFs)'],
    ['Home, Reading', 'Prior', 'public', 'Long-run UK property.', 'property_uk'],
    ['Flat, Pune', 'Prior', 'public', 'Long-run India property.', 'property_in'],
    ['SBI fixed deposit', 'Contract', 'contract', 'Its own rate, to 10 Mar 2029.', 'fixed deposit (contract)'],
    ['PPF', 'Contract', 'contract', "The account's own rate.", 'PPF (contract)'],
  ]],
  ['Pay, a year', [['Arun\'s salary growth', '', '', '', 'salary growth Arun'], ['Asha\'s salary growth', 'History and prior', 'history', 'Her 3.5% a year since 2023, blended with the UK\'s 3.5%.', 'salary growth Asha']]],
  ['Prices, a year', [['UK inflation', 'Prior', 'public', 'Long-run UK consumer prices.', 'UK'], ['India inflation', 'Prior', 'public', "Long-run India prices; the gap also drifts the rupee.", 'IN']]],
];
export const salaryGrowth = (s: DemoState): number => s.projection.assumptions.arun_salary_growth ?? h.projection.assumptions['salary growth Arun'];

function assumptions(s: DemoState, c: PageCtx): Block {
  const f = fs(s), parts: PagePart[] = [];
  parts.push(c.admin
    ? note('edit', 'Tap a figure to correct it. Only you can, as the admin; each change is audited.')
    : { k: 'lock', t: 'Arun keeps these figures. Ask in the chat to see what other figures would do.' });
  const cur = salaryGrowth(s), set = s.applied.includes('e-salary-growth') || s.projection.assumptions.arun_salary_growth !== undefined;
  for (const [grp, list] of ASM) {
    parts.push(sec(grp));
    for (const [name, tag, tagI, sub, key] of list) {
      const val = key === 'UK' || key === 'IN' ? h.projection.inflation[key] : key === 'salary growth Arun' ? cur : h.projection.assumptions[key];
      if (key === 'salary growth Arun') {
        const subA = set ? `His own ${pct1(cur)} a year since 2022, without the UK's 3.5% blended in; set on Mon 26 Oct.` : "His measured 4.8% blended with the UK's 3.5%, until he sets his own.";
        if (f.edit === 'asm:arun' && c.admin) {
          parts.push({
            k: 'edit', lbl: "Arun's salary growth, a year", suffix: '%', ph: '4.8', init: set ? '' : '4.8',
            note: set ? 'Type the rate you want the engine to use.' : "Typing 4.8 is what Arun set on Mon 26 Oct.",
            preview: (v) => (Number.isFinite(Number(v)) ? { before: pct1(cur), after: v + '%' } : null),
            save: (v) => [pageEvent(s, 'e-salary-growth', () => ({ kind: 'assumption_correct', record: 'arun_salary_growth', field: 'growth', before: cur, after: Number(v) / 100, summary: `Arun's salary growth ${pct1(cur)} → ${v}%` })), area('edit', { v: null })] as any,
            cancel: area('edit', { v: null }),
          });
        } else if (c.admin) parts.push(row({ name, sub: subA, v: pct1(cur), tags: [{ t: set ? 'Set by you' : 'History and prior', icon: set ? 'person' : 'history' }], act: area('edit', { v: 'asm:arun' }) }));
        else parts.push({ k: 'pill', name, sub: subA.replace('set on', 'set by Arun on'), v: pct1(cur) });
        continue;
      }
      parts.push({ k: 'pill', name, sub: `${tag} · ${sub}`, v: pct1(val), icon: tagI === 'history' ? 'history' : tagI === 'contract' ? 'contract' : 'public' });
    }
  }
  parts.push(sec('The budget'));
  parts.push({ k: 'pill', name: c.admin ? 'Your floor' : "Arun's floor", sub: `${c.admin ? 'Your setting' : "Arun's setting"} · The monthly surplus kept. A plan that takes the surplus under it brings ways to cover it.`, v: gbp(fp.settings.floor_gbp_month), icon: 'person' });
  return card('Assumptions', 'each with its source', parts);
}

function planCard(s: DemoState, c: PageCtx, short_ = true): Block {
  const rows: PagePart[] = (s.plans as Plan[]).filter((pl) => st(pl) !== 'ended').map((pl) => row({
    icon: iconOf(pl), name: pl.what, sub: describe(pl),
    v: pl.amount === undefined ? undefined : gbp(pl.amount), act: nav('projection', { tab: 'plans' }),
    tags: st(pl) === 'paused' ? [{ t: 'Paused', icon: 'pause' }] : undefined,
  }));
  rows.push(c.admin ? { k: 'btn', t: 'Add a plan item in the chat', icon: 'chat_bubble', act: nextPlanFlow(s) ? ask(s, nextPlanFlow(s)!) : [{ type: 'chat', open: true }] } : { k: 'lock', t: "Plan items are Arun's, the admin's. Ask a what-if in the chat to try your own." });
  return card('Plan items', c.admin ? 'yours alone, as the admin' : "Arun's, the admin's", rows);
}
const ICON: Record<string, string> = { pot: 'savings', salary: 'payments', loan: 'home_work', cover: 'account_balance', spend: 'event' };
const BYID: Record<string, string> = { extension: 'construction', bonus: 'redeem', car2: 'directions_car', schooling: 'school', wedding: 'celebration', flat2: 'home' };
const iconOf = (pl: Plan) => BYID[pl.id] ?? ICON[pl.kind ?? ''] ?? (pl.amount && pl.amount > 0 ? 'redeem' : 'event');

function netWorth(s: DemoState, c: PageCtx): { cols: Block[][]; sub: string } {
  const f = fs(s), key = runKey(s), run = runOf(key), x1 = 2026 + f.hz;
  const { ch, rows } = fanFor(s, c.T.net_gbp, run.fan, f.hz, { h: c.compact ? 170 : 250, ann: !c.compact, label: !c.compact, ms: true });
  const end = rows[rows.length - 1];
  const H1 = hero({
    over: `Middle path in ${x1}`, big: fm(s, end.p50, x1),
    sub: `From ${s.ccy === 'INR' ? inr(conv(s, c.T.net_gbp, 2026)) : gbp(c.T.net_gbp)} today. 8 in 10 of the engine's runs end between ${fm(s, end.p10, x1)} and ${fm(s, end.p90, x1)}.${f.stale ? ' Changes made since this run show in the lists below; the line is the engine\'s next run.' : ''}`,
    ch,
  });
  const chipsB = chips([
    { t: 'What if we buy a second flat?', act: ask(s, c.asha ? 'whatif.asha' : 'whatif.flat') },
    { t: 'What if the plan items fall away?', act: { type: 'nope' } },
    { t: 'What moves the line most?', act: { type: 'nope' } },
  ]);
  const ms = card('Milestones', 'from the records, on the line above', milestones(s).map((m) => row({ icon: m.icon, name: m.what, sub: m.sub, v: m.v, act: NOOP, tags: undefined })));
  const wide = c.layout.nav === 'sidebar';
  return { sub: `Net worth over the next ${f.hz} years, in the pounds of each year · the engine's run, ${run.when}`, cols: wide ? [[H1, chipsB], [ms, planCard(s, c)], [assumptions(s, c)]] : [[H1, chipsB, ms, planCard(s, c), assumptions(s, c)]] };
}

/* ---------- Plans ---------- */
function planRows(s: DemoState, c: PageCtx): PagePart[] {
  const f = fs(s), out: PagePart[] = [];
  const x0 = nowX(s), x1 = 2046.99, W = x1 - x0;
  const list = (s.plans as Plan[]);
  for (const pl of list.filter((q) => st(q) !== 'ended')) {
    const paused = st(pl) === 'paused', [a, b] = span(pl);
    const l = Math.max(0, ((Math.max(a, x0) - x0) / W) * 100), w = Math.max(1.6, Math.min(100 - l, ((Math.min(b, x1) - Math.max(a, x0)) / W) * 100));
    out.push(row({
      icon: iconOf(pl), name: pl.what, sub: describe(pl), sub2: pl.kind === 'pot' || pl.kind === 'spend' ? pl.note : undefined,
      v: pl.amount === undefined ? undefined : gbp(pl.amount),
      tags: [...(paused ? [{ t: 'Paused', icon: 'pause' }] : []), ...((pl.version ?? 1) > 1 ? [{ t: `v${pl.version}` }] : [])],
      act: c.admin ? area('open', { id: pl.id }) : NOOP, chev: false,
    }));
    out.push({ k: 'stack', segs: [{ w: l + '%', c: 'x' }, { w: w + '%', c: paused ? 'f-grey' : 'f-blue' }, { w: Math.max(0, 100 - l - w) + '%', c: 'x' }] });
    if (c.admin && f.open === pl.id) {
      const acts: PagePart[] = [];
      const pend = f.pend?.id === pl.id ? f.pend.op : null;
      if (!pend) {
        if (paused) acts.push({ k: 'btn', t: 'Resume', icon: 'play_arrow', act: area('pend', { id: pl.id, op: 'resume' }) });
        else acts.push({ k: 'btn', t: 'Pause', icon: 'pause', act: area('pend', { id: pl.id, op: 'pause' }) });
        if (pl.repeat === 'yearly') acts.push({ k: 'btn', t: 'Correct its growth', icon: 'edit', act: area('pend', { id: pl.id, op: 'growth' }) });
        else if (pl.repeat && pl.until) acts.push({ k: 'btn', t: 'Correct the end date', icon: 'edit', act: area('pend', { id: pl.id, op: 'end-date' }) });
        acts.push({ k: 'btn', t: 'End', icon: 'stop_circle', act: area('pend', { id: pl.id, op: 'end' }) });
      } else if (pend === 'end-date') {
        acts.push({
          k: 'edit', lbl: `${pl.what}: the end, as month and year`, ph: 'Jul 2040', init: '',
          preview: (v) => (parseYM(v) ? { before: ym(pl.until!), after: ym(parseYM(v)!) } : null),
          save: (v) => [changeAct(s, pl, 'end-date', parseYM(v) ?? pl.until!), area('clear')] as any, cancel: area('clear'),
          note: `Version ${pl.version ?? 1} → ${(pl.version ?? 1) + 1}. The engine runs again with it.`,
        });
      } else if (pend === 'growth') {
        acts.push({
          k: 'edit', lbl: `${pl.what}: growth a year`, suffix: '%', ph: '3.5', init: '',
          preview: (v) => (Number.isFinite(Number(v)) ? { before: pl.growth ? pct1(pl.growth) : 'none', after: v + '%' } : null),
          save: (v) => [changeAct(s, pl, 'growth', Number(v) / 100), area('clear')] as any, cancel: area('clear'),
          note: `Version ${pl.version ?? 1} → ${(pl.version ?? 1) + 1}.`,
        });
      } else {
        const words = { pause: `Pause ${pl.what}? It leaves the line until you resume it.`, resume: `Resume ${pl.what}? It goes back onto the line as it was.`, end: `End ${pl.what}? It stays in the audit log; the line forgets it.` } as any;
        acts.push(note('help', words[pend]), { k: 'btn', t: 'Confirm', icon: 'check', act: [changeAct(s, pl, pend, null), area('clear')] as any, cls: 'mp-btn-primary' }, { k: 'btn', t: 'Cancel', act: area('clear'), cls: 'mp-btn-plain' });
      }
      out.push(...acts);
    }
  }
  return out;
}
const parseYM = (v: string): string | null => {
  const m = /^\s*([A-Za-z]{3})\w*\s+(\d{4})\s*$/.exec(v); if (!m) return null;
  const i = MON.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()); return i < 0 ? null : `${m[2]}-${String(i + 1).padStart(2, '0')}`;
};
/** The event for a row action: the ledger's own where the walk has it, an illustrative one otherwise. */
function changeAct(s: DemoState, pl: Plan, op: string, val: any): Action {
  const v = pl.version ?? 1, tag = `v${v} → v${v + 1}`;
  const led: Record<string, string> = { 'car2:pause': 'e-car-pause', 'car2:resume': 'e-car-resume', 'car2:end': 'e-car-end', 'schooling:end-date': 'e-school-end', 'bonus:growth': 'e-bonus-growth' };
  const id = led[`${pl.id}:${op}`];
  const ledOk = id && (id !== 'e-school-end' || val === '2040-07') && (id !== 'e-bonus-growth' || val === 0.035);
  const mk = (kind: string, field: string, before: any, after: any, summary: string) => () => ({ kind, record: pl.id, field, before, after, summary, payload: { id: pl.id, op, val } });
  if (op === 'pause') return pageEvent(s, ledOk ? id : null, mk('plan_pause', 'status', 'active', 'paused', `Plan item paused · ${pl.what} · ${tag}`));
  if (op === 'resume') return pageEvent(s, ledOk ? id : null, mk('plan_resume', 'status', 'paused', 'active', `Plan item resumed · ${pl.what} · ${tag}`));
  if (op === 'end') return pageEvent(s, ledOk ? id : null, mk('plan_end', 'status', st(pl), 'ended', `Plan item ended · ${pl.what} · ${tag}`));
  if (op === 'end-date') return pageEvent(s, ledOk ? id : null, mk('plan_correct', 'end', pl.until, val, `Plan item corrected · ends ${ym(pl.until!)} → ${ym(val)} · ${tag}`));
  return pageEvent(s, ledOk ? id : null, mk('plan_correct', 'growth', pl.growth ?? null, val, `Plan item corrected · ${pl.what}: growth ${pl.growth ? pct1(pl.growth) : 'none'} → ${pct1(val)} a year · ${tag}`));
}

function plans(s: DemoState, c: PageCtx): { cols: Block[][]; sub: string } {
  const f = fs(s), key = runKey(s), run = runOf(key);
  const active = (s.plans as Plan[]).filter((q) => st(q) !== 'ended');
  const ended = (s.plans as Plan[]).filter((q) => st(q) === 'ended');
  const parts: PagePart[] = [sec('Today', '2046'), ...planRows(s, c)];
  if (!c.admin) parts.push({ k: 'lock', t: "Plan items are Arun's, the admin's. Ask a what-if in the chat to try your own; nothing is saved." });
  else parts.push({ k: 'btn', t: 'Add a plan item in the chat', icon: 'chat_bubble', act: nextPlanFlow(s) ? ask(s, nextPlanFlow(s)!) : [{ type: 'chat', open: true }] }, p(c.compact ? 'Tap an item to pause, resume, correct or end it.' : 'Tap an item to pause, resume, correct or end it, in place. New items are added only in the chat.'));
  const A = card('Plan items', `${active.length} on the timeline`, parts);
  const right: Block[] = [];
  const { ch, rows } = fanFor(s, c.T.net_gbp, run.fan, 20, { h: c.compact ? 150 : 170, ann: false, label: false, ms: false });
  right.push(card('What the plans do to the line', `the engine's run, ${run.when}`, [
    { k: 'chart', ch },
    ...[2031, 2036, 2046].map((y) => ({ k: 'kv' as const, key: `${y}, middle path`, v: fm(s, rows.find((r) => r.year === y)!.p50, y), money: true })),
    p(`After: ${run.after}.`),
  ]));
  if (ended.length) right.push(card('Ended', 'kept in the audit log', ended.map((pl) => row({ icon: iconOf(pl), name: pl.what, sub: `Ended · ${describe(pl)}`, v: pl.amount === undefined ? undefined : gbp(pl.amount), act: NOOP, tags: [{ t: 'Ended', icon: 'stop_circle' }] }))));
  if (f.stale) right.push(card(undefined, undefined, [note('info', 'Changes made since the last run show in the list; the line is the engine\'s next run.')]));
  return { sub: `Plan items on the timeline, to 2046 · the engine's run, ${run.when}`, cols: c.layout.nav === 'sidebar' ? [[A], right] : [[A, ...right]] };
}

/* ---------- Budget forecast ---------- */
const flag = (n: number) => (n ? `▼ ${n} month${n > 1 ? 's' : ''} below your floor` : 'At or above your floor');
function forecast(s: DemoState, c: PageCtx): { cols: Block[][]; sub: string } {
  const f = fs(s), run = runOf(runKey(s)), fc = forecastOf(s), floor = fp.settings.floor_gbp_month;
  const x1 = 2026 + f.hz;
  const ys: any[] = fc.years.filter((y: any) => y.year >= 2027 && y.year <= x1);
  const nBelow = ys.reduce((t: number, y: any) => t + y.below_floor, 0);
  const lo = ys.map((y) => conv(s, y.lowest_surplus, y.year));
  const fl = conv(s, floor, 2027);
  const ymax = Math.max(...lo, fl) * 1.15, ymin = Math.min(0, ...lo) * 1.3;
  const pts: Pt[] = ys.map((y, i) => [y.year + 0.5, lo[i]]);
  const ch = chart({
    x0: 2027, x1: x1 + 1, y0: ymin, y1: ymax, h: c.compact ? 150 : 170, gridAt: [fl], yLabel: (v) => (s.ccy === 'INR' ? '₹' + Math.round(v / 1000) + 'k' : '£' + Math.round(v)),
    line: pts, dash: [[2027, fl], [x1 + 1, fl]],
    xTicks: [2027, 2031, 2036, 2041, 2046, 2056].filter((y) => y <= x1).map((y, i) => ({ x: y + 0.5, t: String(y), cls: i === 0 ? 'ax0' : '' })),
    dots: ys.filter((y) => y.below_floor).map((y) => ({ x: y.year + 0.5, y: conv(s, y.lowest_surplus, y.year), cls: 'pc-sq' })),
    leg: [{ cls: 'k-line', t: 'Leanest month' }, { cls: 'k-dash', t: `Your floor, ${gbp(floor)} a month` }, { cls: 'k-sq', t: 'Below it' }],
  });
  const cashNeg = ys.find((y) => y.cash_negative);
  const A = card('Your leanest month, each year', `${ys[0].year} to ${ys[ys.length - 1].year} · against your floor`, [
    { k: 'big', big: nBelow ? `▼ ${nBelow} months below your floor` : 'No month below your floor', sub: nBelow ? `${ys.find((y) => y.below_floor)!.below_floor_months[0]} to ${[...ys].reverse().find((y) => y.below_floor)!.below_floor_months.slice(-1)[0]}; the leanest is ${ys.reduce((a: any, y: any) => (y.lowest_surplus < a.lowest_surplus ? y : a)).lowest_month}, ${fm(s, Math.min(...ys.map((y) => y.lowest_surplus)), ys.reduce((a: any, y: any) => (y.lowest_surplus < a.lowest_surplus ? y : a)).year)}.` : 'Every year keeps at least your floor.' },
    ...(cashNeg ? [{ k: 'note' as const, icon: 'warning', t: `Cash goes below zero from ${cashNeg.cash_negative}. That is a different flag from the floor: it needs a way to cover it.` }] : []),
    { k: 'chart', ch },
    { k: 'btn', t: 'Ways to cover it', icon: 'chat_bubble', act: coverFlow(s, c) },
  ]);
  const yrParts: PagePart[] = [];
  for (const y of ys) {
    const open = f.year === y.year;
    yrParts.push(row({ name: String(y.year) + (y.span && y.span !== 'Jan–Dec' ? ` (${y.span})` : ''), sub: `${flag(y.below_floor)}${y.cash_negative ? ' · cash below zero' : ''}`, sub2: `savings rate ${Math.round(y.savings_rate * 1000) / 10}%`, v: fm(s, y.surplus, y.year), act: area('year', { y: y.year }), chev: false, tags: y.below_floor ? [{ t: '▼ below floor' }] : undefined }));
    if (open) {
      yrParts.push(sec(`${y.year} · the flows behind it`, `Surplus ${fm(s, y.surplus, y.year)}`));
      const kv = (k: string, v: number) => ({ k: 'kv' as const, key: k, v: fm(s, v, y.year), money: true });
      for (const [k, v] of Object.entries(y.income)) yrParts.push(kv(k, v as number));
      yrParts.push(kv('Income', y.income_total), kv('Spending', -y.spend_total), kv('Loan payments', -y.emis_total));
      if (y.sip) yrParts.push(kv('SIP', -y.sip));
      if (y.premium) yrParts.push(kv('Insurance premium', -y.premium));
      for (const [k, v] of Object.entries(y.plans)) yrParts.push(kv(k, v as number));
      if (y.to_pot) yrParts.push(kv('Into the pot', -y.to_pot));
      if (y.from_pot) yrParts.push(kv('From the pot', y.from_pot));
      if (y.from_investments) yrParts.push(kv('From investments', y.from_investments));
      yrParts.push(kv('Surplus', y.surplus), p(`Savings rate ${Math.round(y.savings_rate * 1000) / 10}% · cash ${fm(s, y.closing_cash, y.year)} at the end of ${y.span?.split('–')[1] ?? 'December'}. One-offs (${Object.keys(y.one_offs).join(', ') || 'none this year'}) are paid from cash, below the surplus.`));
      const months: any[] | undefined = fc[`months_${y.year}`];
      if (months) {
        yrParts.push(sec('Months', 'one level down'));
        for (const m of months) yrParts.push(row({ name: m.month, sub: m.below_floor ? '▼ below your floor' : m.cash_negative ? 'cash below zero' : 'At or above your floor', v: fm(s, m.surplus, y.year), act: NOOP }));
      } else yrParts.push(p('The months of this year are not drawn in the demo; the year line above is the engine\'s.'));
    }
  }
  yrParts.push(p('Plans are the ones that recur. A one-off is paid from cash, below the surplus: the extension, −£35,000 in 2027, and the new car, −£25,000 in 2031. Maturities go into cash too.'));
  const B = card('Year by year', 'the surplus, after everything planned', yrParts);
  return { sub: `The next ${f.hz} years, ${ys[0].year} to ${ys[ys.length - 1].year} · the engine's trace, run ${run.when}`, cols: c.layout.nav === 'sidebar' ? [[A], [B]] : [[A, B]] };
}
/** "Ways to cover it" opens the chat on the flow that offers them. */
function coverFlow(s: DemoState, c: PageCtx): any {
  if (c.asha) return ask(s, 'whatif.asha');
  const next = nextPlanFlow(s);
  return next ? ask(s, next) : [{ type: 'chat', open: true }];
}

export function projectionPage(s: DemoState, c: PageCtx): PageSpec {
  const f = fs(s), t = tabOf(c);
  const body = t === 0 ? netWorth(s, c) : t === 1 ? plans(s, c) : forecast(s, c);
  return {
    title: 'Projection', sub: body.sub,
    tabs: seg(['Net worth', 'Plans', 'Budget forecast'], t, (i) => nav('projection', { tab: TABS[i] })),
    ctrls: {
      ...(t !== 1 ? { hz: seg(['5 yrs', '10 yrs', '20 yrs', '30 yrs'], [5, 10, 20, 30].indexOf(f.hz), (i) => area('hz', { v: [5, 10, 20, 30][i] })) } : {}),
      /* Page.svelte draws the tabs as underlined tabs only and hides them in a compact window, where the boards draw a
         segmented control (.tseg) it does not emit yet: the same three switches go in the Month slot there. */
      ...(c.compact ? { month: seg(['Net worth', 'Plans', 'Forecast'], t, (i) => nav('projection', { tab: TABS[i] })) } : {}),
      ccy: ccySeg(s, c.web), tm: t !== 1, eye: true,
    },
    colsCls: 'toprow', cols: body.cols,
    foot: "Illustrative figures from the v4 figure set, run month by month (future-plans-v4.json). A projection, not a promise: the engine's middle path is no more likely than the band around it.",
  };
}
