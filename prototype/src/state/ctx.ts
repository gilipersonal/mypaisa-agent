import { dayLabel, mask } from '../lib/format';
import { DAY_ISO } from './reduce';
import type { DemoState } from './model';
import type { PageCtx } from './registry';
import { layoutFor } from './layout';
import { totals, type Totals } from './totals';

/* Totals are recomputed from the records whenever they change; the member split keeps its earlier rounding for a
   member whose figure did not move (make_household.py's rule). */
let last: { key: string; T: Totals } | null = null;
let prev: Totals | null = null;
export function totalsOf(s: DemoState): Totals {
  const key = JSON.stringify([s.assets.map((a) => [a.id, a.value]), s.debts.map((d) => [d.id, d.balance])]);
  if (last && last.key === key) return last.T;
  const T = totals(s.assets, s.debts, last?.T ?? prev);
  prev = last?.T ?? null; last = { key, T };
  return T;
}
export function ctxOf(s: DemoState): PageCtx {
  const layout = layoutFor(s.door, s.w[s.door]);
  return {
    door: s.door, layout, web: s.door === 'web' || s.door === 'phone', ios: s.door === 'iphone' || s.door === 'ipad',
    compact: layout.compact, priv: s.priv, asha: s.viewer === 'asha', admin: s.viewer === 'arun', viewer: s.viewer,
    params: s.route.params ?? {}, T: totalsOf(s), mp: (t: string) => mask(t, s.priv),
    dayLabel: dayLabel(DAY_ISO[s.clock]) + (s.clock === 'd3e' ? ', evening' : ''),
  };
}
