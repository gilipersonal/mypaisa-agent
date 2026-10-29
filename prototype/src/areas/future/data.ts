/* The future area's data layer: which engine run a state shows, the fan and milestones, plan items as records, and
   money in the viewer's terms. Everything is read from future-plans-v4.json (FP) and household-v4.json (H); nothing
   here is a typed-in figure (lessons 10, 13, 38). */
import FP from '@fig/future-plans-v4.json';
import { H } from '../../data/figures';
import type { DemoState } from '../../state/model';
import { FX, gbp, inr } from '../kit';

export const fp: any = FP;
const h: any = H;
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const NOOP = { type: 'set', patch: {} };

/* ---------- which run ---------- */
/** The last applied event that makes a new run decides which run is shown (R0 .. R4, the plans tab's R5 .. R7, the wedding's). */
const RUN_OF: Record<string, string> = {
  'e-school-fees': 'R1', 'e-school-pot': 'R2', 'e-salary-step': 'R3', 'e-hdfc-close': 'R4',
  'e-car-pause': 'R5', 'e-car-resume': 'R5b', 'e-school-end': 'R6', 'e-car-end': 'R7',
  'e-wedding': 'W', 'e-wedding-cover': 'W', 'e-wedding-undo': 'W',
};
export function runKey(s: DemoState): string {
  for (let i = s.applied.length - 1; i >= 0; i--) { const k = RUN_OF[s.applied[i]]; if (k) return k; }
  if (s.clock === 'd3e' || s.clock === 'd4' || (s.clock === 'd3' && s.applied.includes('e-emi-paid'))) return 'R5N';
  if (s.clock === 'd3') return 'R0';
  if (s.clock === 'd2') return 'R0';
  return 'R26';
}
export interface RunInfo { key: string; when: string; after: string; fan: any[] }
export function runOf(key: string): RunInfo {
  const tab = fp.evening2.plans_tab;
  if (key === 'R26') return { key, when: fp.R26.when, after: fp.R26.after, fan: fp.R26.fan };
  if (key === 'W') return { key, when: fp.evening2.wedding.when, after: "the wedding saved", fan: fp.evening2.wedding.fan };
  const r = tab[key] ?? fp.runs[key];
  return { key, when: r.when, after: r.after, fan: r.fan };
}
/** The forecast table that goes with a run: the figure set holds R0, R1, R2, R4, R7 and the wedding's. */
export function forecastKey(key: string): string {
  return ({ R26: 'R0', R0: 'R0', R5N: 'R0', R1: 'R1', R2: 'R2', R3: 'R2', R4: 'R4', R5: 'R4', R5b: 'R4', R6: 'R4', R7: 'R7', W: 'W' } as any)[key] ?? 'R0';
}
export const forecastOf = (s: DemoState): any => fp.forecast[forecastKey(runKey(s))];

/* ---------- money in the viewer's terms ---------- */
const yr0: any[] = fp.forecast.R0.years;
const yrRow = (y: number) => yr0.find((r) => r.year === y) ?? yr0[yr0.length - 1];
/** A pounds figure of `yr`, as the viewer wants it: in rupees at that year's rate, in the pounds of today. */
export function conv(s: DemoState, v: number, yr: number): number {
  let x = v;
  const row = yrRow(yr);
  if (s.todaysMoney) x *= row.deflator;
  if (s.ccy === 'INR') x *= yr <= 2026 ? FX : row.fx_avg;
  return x;
}
export const fm = (s: DemoState, v: number, yr: number) => (s.ccy === 'INR' ? inr(conv(s, v, yr)) : gbp(conv(s, v, yr)));
/** An axis label: £2m, £0.5m; ₹2cr. */
export function short(s: DemoState, v: number): string {
  if (s.ccy === 'INR') { const c = v / 1e7; return '₹' + (Math.round(c * 10) / 10) + 'cr'; }
  const m = v / 1e6; return '£' + (Math.round(m * 100) / 100) + 'm';
}
export const pct1 = (v: number) => String(Math.round(v * 10000) / 100) + '%';

/* ---------- dates ---------- */
export const ym = (t: string) => `${MON[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}`;
export const yf = (t: string) => Number(t.slice(0, 4)) + (Number(t.slice(5, 7)) - 1) / 12 + 0.04;
export const nowX = (s: DemoState) => (s.clock === 'd1' || s.clock === 'd0' ? 2026.82 : 2026.84);
export function isoLong(iso: string): string { const d = iso.slice(0, 10).split('-'); return `${Number(d[2])} ${MON[Number(d[1]) - 1]} ${d[0]}`; }

/* ---------- plan items as records ---------- */
export interface Plan {
  id: string; what: string; ccy: string; amount?: number; when: string; repeat?: string | null; until?: string; growth?: number | null;
  status?: string; version?: number; kind?: string; note?: string; cover?: boolean;
}
export const st = (p: Plan) => p.status ?? 'active';
/** A plan item the ledger adds by record id, built from the figure set. */
export function planFor(record: string): Plan | null {
  const P = fp.plans, e2 = fp.evening2;
  switch (record) {
    case 'schooling': return { id: 'schooling', what: P.schooling.what, ccy: 'GBP', amount: -P.schooling.amount, when: P.schooling.start, repeat: 'monthly', until: P.schooling.end, growth: P.schooling.growth.pct ?? 0.045, status: 'active', version: 1, kind: 'spend', note: 'Paid from the monthly budget; your kid, not a member' };
    case 'school_fees_pot': { const n = (2028 - 2026) * 12 + (12 - 11) + 1; return { id: 'school_fees_pot', what: 'School fees pot', ccy: 'GBP', amount: -690, when: '2026-11', repeat: 'monthly', until: '2028-12', status: 'active', version: 1, kind: 'pot', note: `${gbp(690 * n)} in all, drawn from Jan 2029 to top the surplus up to your floor` }; }
    case 'salary_step': return { id: 'salary_step', what: "Arun's salary set to £5,500 a month", ccy: 'GBP', amount: fp.later.salary_step.set_to, when: P.salary_step.start, repeat: 'monthly', status: 'active', version: 1, kind: 'salary', note: `From ${ym(P.salary_step.start)}; his take-home would be ${gbp(fp.later.salary_step.arun_take_home_aug_2028)} by then` };
    case 'hdfc_close': return { id: 'hdfc_close', what: 'Close the HDFC home loan with the SBI FD', ccy: 'INR', when: '2029-03', status: 'active', version: 1, kind: 'loan', note: `Mar 2029 · ${inr(fp.later.hdfc_close.fd_inr)} clears the ${inr(fp.later.hdfc_close.balance_mar_2029_inr)} balance; the ${inr(fp.later.hdfc_close.frees_inr_a_month)} EMI stops ${fp.later.hdfc_close.emis_saved} months early` };
    case 'wedding': { const w = e2.wedding.plan; return { id: 'wedding', what: w.what, ccy: 'GBP', amount: -w.amount, when: w.start, repeat: null, status: 'active', version: 1, kind: 'spend' }; }
    case 'wedding_cover': { const [m, v] = e2.wedding.cash_short; return { id: 'wedding_cover', what: "Balanced (ISA) pays the wedding's shortfall", ccy: 'GBP', amount: -v, when: '2027-06', repeat: null, status: 'active', version: 1, kind: 'cover' }; }
  }
  return null;
}
/** The one-line description of a plan item, as the Plans boards write it. */
export function describe(p: Plan): string {
  if (p.note && (p.kind === 'salary' || p.kind === 'loan')) return p.note;
  const a = Math.abs(p.amount ?? 0);
  const g = p.growth ? ` · grows ${pct1(p.growth)} a year` : '';
  if (p.repeat === 'yearly') return `Every ${MON[Number(p.when.slice(5, 7)) - 1]}, ${p.when.slice(0, 4)} to ${(p.until ?? '').slice(0, 4)}${g}`;
  if (p.repeat === 'monthly') return `${gbp(a)} a month, ${ym(p.when)} to ${p.until ? ym(p.until) : 'no end'}${g}`;
  return `Once, ${ym(p.when)}`;
}
/** The plan item's fan marker and timeline bar span, in years. */
export function span(p: Plan): [number, number] {
  const a = yf(p.when);
  if (p.repeat && p.until) return [a, yf(p.until) + 1 / 12];
  if (p.repeat) return [a, 2046.99];
  return [a, a + 0.12];
}

/* ---------- milestones ---------- */
export interface Mile { x: number; what: string; sub: string; v?: string; icon: string; dot: boolean }
export function milestones(s: DemoState): Mile[] {
  const closed = s.applied.includes('e-hdfc-close');
  const out: Mile[] = [];
  for (const m of h.projection.milestones as any[]) {
    let what = m.what, sub = isoLong(m.when) + (m.frees ? ` · frees ${m.frees}` : ''), v: string | undefined = m.amount;
    if (/Arun retires/.test(what)) { sub = '1 Jan 2051'; }
    if (closed && /HDFC home loan paid off/.test(what)) { what = 'HDFC home loan closed with the SBI FD'; sub = `Mar 2029 · frees ${inr(fp.later.hdfc_close.frees_inr_a_month)} a month`; v = undefined; }
    if (closed && /SBI FD matures/.test(what)) { sub = '10 Mar 2029 · closes the HDFC loan'; }
    if (/fixed rate ends/.test(what)) sub = '30 Jun 2028 · then a variable rate';
    const dot = /paid off|closed/.test(what);
    const icon = /saver/.test(what) ? 'savings' : /fixed rate/.test(what) ? 'percent' : /Car/.test(what) ? 'directions_car' : /SBI/.test(what) ? 'account_balance' : /HDFC/.test(what) ? 'home_work' : /LIC/.test(what) ? 'shield' : /retire/.test(what) ? 'beach_access' : 'home';
    const x = closed && /HDFC/.test(what) ? 2029.19 : Number(m.when.slice(0, 4)) + (Number(m.when.slice(5, 7)) - 1) / 12 + Number(m.when.slice(8, 10)) / 365;
    out.push({ x, what, sub, v, icon, dot });
  }
  return out.sort((a, b) => a.x - b.x);
}

/* ---------- state kept by this area ---------- */
export interface FutureState { hz: number; open: string | null; pend: { id: string; op: string } | null; edit: string | null; year: number | null; stale: boolean; novSurplus?: number }
export const fs = (s: DemoState): FutureState => ({ hz: 20, open: null, pend: null, edit: null, year: null, stale: false, ...(s.area.future ?? {}) });

/** The next plan flow the walk offers, in the evening's order: school fees, the salary step, the HDFC closure, the wedding. */
export function nextPlanFlow(s: DemoState): string | null {
  if (s.clock !== 'd3e') return null;
  const a = s.applied;
  if (!a.includes('e-school-fees')) return 'plan.school';
  if (!a.includes('e-salary-step')) return 'plan.salary-step';
  if (!a.includes('e-hdfc-close')) return 'plan.hdfc-close';
  if (!a.includes('e-wedding')) return 'plan.wedding';
  return null;
}
