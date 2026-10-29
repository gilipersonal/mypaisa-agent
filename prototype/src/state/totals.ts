/* Net worth computed from the records, never copied (lesson 38). Ported from make_household.py's totals(): GBP at
   ₹112.50, own and owe rounded half to even, splits by country and member by largest remainder so the parts sum to
   the total, and a member whose exact figure did not move keeps the rounding earlier frames showed. */
import { FX, rhe, toGbp } from '../lib/format';
import type { Asset, Debt } from './model';

export interface Totals {
  own_gbp: number; owe_gbp: number; net_gbp: number; net_inr: number;
  by_country_gbp: Record<string, number>; by_member_gbp: Record<string, number>; liquid_gbp: number;
  exact_member: Record<string, number>;
}
function split(parts: Record<string, number>, total: number): Record<string, number> {
  const floors: Record<string, number> = {};
  for (const k in parts) floors[k] = Math.floor(parts[k]);
  const left = total - Object.values(floors).reduce((a, b) => a + b, 0);
  const keys = Object.keys(parts).sort((a, b) => parts[b] - floors[b] - (parts[a] - floors[a]));
  keys.slice(0, Math.max(left, 0)).forEach((k) => (floors[k] += 1));
  return floors;
}
export function totals(assets: Asset[], debts: Debt[], prev?: Totals | null): Totals {
  const own = assets.reduce((s, a) => s + toGbp(a.value, a.ccy), 0);
  const owe = debts.reduce((s, d) => s + toGbp(d.balance, d.ccy), 0);
  const net = rhe(own) - rhe(owe);
  const country: Record<string, number> = {};
  for (const c of ['UK', 'IN']) {
    country[c] = assets.filter((a) => a.country === c).reduce((s, a) => s + toGbp(a.value, a.ccy), 0)
      - debts.filter((d) => d.country === c).reduce((s, d) => s + toGbp(d.balance, d.ccy), 0);
  }
  const member: Record<string, number> = {};
  for (const m of ['arun', 'asha']) {
    const a = assets.reduce((s, x) => s + x.owners.filter(([o]) => o === m).reduce((t, [, p]) => t + (toGbp(x.value, x.ccy) * p) / 100, 0), 0);
    const d = debts.reduce((s, x) => s + x.owners.filter(([o]) => o === m).reduce((t, [, p]) => t + (toGbp(x.balance, x.ccy) * p) / 100, 0), 0);
    member[m] = a - d;
  }
  const byMember = split(member, net);
  if (prev) {
    /* a member whose exact figure did not move keeps its earlier rounding; the other absorbs the pound */
    const still = Object.keys(member).filter((m) => Math.abs(member[m] - (prev.exact_member[m] ?? NaN)) < 1e-6);
    const moved = Object.keys(member).filter((m) => !still.includes(m));
    if (still.length && moved.length === 1) {
      for (const m of still) byMember[m] = prev.by_member_gbp[m];
      byMember[moved[0]] = net - still.reduce((s, m) => s + byMember[m], 0);
    }
  }
  const liquid = assets.filter((a) => a.liquidity === 'liquid').reduce((s, a) => s + toGbp(a.value, a.ccy), 0);
  return {
    own_gbp: rhe(own), owe_gbp: rhe(owe), net_gbp: net, net_inr: rhe(net * FX),
    by_country_gbp: split(country, net), by_member_gbp: byMember, liquid_gbp: rhe(liquid), exact_member: member,
  };
}
