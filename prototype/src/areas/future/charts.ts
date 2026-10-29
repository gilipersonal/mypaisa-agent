/* The fan chart of a run, drawn with the chart builder (Prototype v4's fanChart and wiChart): the band is the 8 in 10
   runs, the line the middle path, the dashed line the straight-line path (or, for a what-if, today's plan). */
import type { DemoState } from '../../state/model';
import { chart, interp, type Pt } from '../../lib/chart';
import { conv, fm, milestones, nowX, short, st, yf, type Plan } from './data';

/* ---------- the fan ---------- */
function niceTop(max: number): { step: number; top: number } {
  const raw = max * 1.04, pow = 10 ** Math.floor(Math.log10(raw / 3));
  for (const m of [1, 2, 2.5, 5, 10]) { const step = m * pow; if (raw / step <= 3.2) return { step, top: Math.ceil(raw / step) * step }; }
  return { step: pow * 10, top: pow * 30 };
}
interface FanOpts { h: number; ann: boolean; label: boolean; ms: boolean; dash?: boolean }
export function fanFor(s: DemoState, net: number, runFan: any[], hz: number, o: FanOpts, other?: any[]) {
  const x0 = nowX(s), x1 = 2026 + hz;
  const rows = runFan.filter((r) => r.year >= 2027 && r.year <= x1);
  const start: Pt = [x0, conv(s, net, 2026)];
  const col = (k: string): Pt[] => [start, ...rows.map((r) => [r.year, conv(s, r[k], r.year)] as Pt)];
  const p50 = col('p50'), hi = col('p90');
  const { step, top } = niceTop(Math.max(...hi.map((q) => q[1])));
  const gridAt: number[] = []; for (let v = step; v <= top - step * 0.4 + 1e-6; v += step) gridAt.push(v);
  const X = (x: number) => (((x - x0) / (x1 - x0)) * 100).toFixed(2) + '%';
  const dots: { x: number; y: number; cls?: string }[] = [], lbls: { x: number; y: number; t: string; cls?: string }[] = [];
  if (o.ms) {
    for (const m of milestones(s)) if (m.x > x0 + 0.05 && m.x <= x1) {
      dots.push({ x: m.x, y: interp(p50, m.x), cls: m.dot ? '' : 'pc-tick' });
      if (o.label && /Mortgage paid off/.test(m.what)) lbls.push({ x: m.x, y: interp(p50, m.x), t: m.what, cls: 'pc-below' });
    }
    for (const pl of s.plans as Plan[]) if (st(pl) === 'active' && !pl.repeat && pl.kind !== 'cover') { const x = yf(pl.when); if (x > x0 && x <= x1) dots.push({ x, y: interp(p50, x), cls: 'pc-sq' }); }
  }
  const ch = chart({
    x0, x1, y0: 0, y1: top, h: o.h, gridAt, yLabel: (v) => short(s, v),
    line: p50, lo: col('p10'), hi, dash: o.dash === false ? undefined : (other ? [start, ...other.filter((r) => r.year >= 2027 && r.year <= x1).map((r) => [r.year, conv(s, r.p50, r.year)] as Pt)] : col('deterministic')),
    xTicks: [{ x: x0, t: 'Today', cls: 'ax0' }, ...[2031, 2036, 2041, 2046, 2056].filter((y) => y <= x1 && (o.h > 150 || y % 10 === 6 || y === x1)).map((y, i, a) => ({ x: y, t: String(y), cls: y === x1 ? 'ax1' : '' }))],
    dots, lbls,
    leg: [{ cls: 'k-line', t: 'Middle path' }, { cls: 'k-band', t: '8 in 10 runs' }, { cls: 'k-dash', t: other ? "Before" : 'Straight line' }, ...(o.ms ? [{ cls: 'k-dot', t: 'A loan ends' }, { cls: 'k-sq', t: 'A plan item' }, { cls: 'k-tick', t: 'A maturity or rate change' }] : [])],
  });
  if (o.ann) { const r = rows.find((q) => q.year === 2031); if (r) ch.ann = { l: X(2031), y: '2031', mid: fm(s, r.p50, 2031), lo: fm(s, r.p10, 2031), hi: fm(s, r.p90, 2031) }; }
  return { ch, rows };
}

