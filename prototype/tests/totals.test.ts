/* The household's totals are computed from the records, and replaying the canonical events lands on each of the
   figure set's five snapshots (lesson 38: a figure set checks its own data, not typed-in numbers). */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import { H } from '../src/data/figures';
import { fresh } from '../src/state/fresh';
import { reduce } from '../src/state/reduce';
import { totals } from '../src/state/totals';

const h: any = H;
const strip = (t: any) => { const { exact_member: _e, ...rest } = t; return rest; };
function chain(actions: any[][]) {
  let s = fresh(); let prev: any = null; const out: any[] = [];
  for (const a of actions) { s = reduce(s, a); prev = totals(s.assets, s.debts, prev); out.push(prev); }
  return { s, out };
}
describe('totals from the records', () => {
  it('match the five snapshots of household-v4.json', () => {
    const { out } = chain([
      [],
      [{ type: 'event', id: 'e-monzo-register' }],
      [{ type: 'event', id: 'e-home-correction' }],
      [{ type: 'event', id: 'e-statements' }],
      [{ type: 'event', id: 'e-emi-paid' }],
    ]);
    expect(strip(out[0])).toEqual(h.totals_before_new_record);
    expect(strip(out[1])).toEqual(h.totals_after_new_record);
    expect(strip(out[2])).toEqual(h.totals_after_correction);
    expect(strip(out[3])).toEqual(h.totals_after_statement_sun_1_nov);
    expect(strip(out[4])).toEqual(h.totals_after_hdfc_emi_thu_5_nov);
  });
  it('moving the clock applies the skipped canonical events at their own times (lesson 19)', () => {
    const s = reduce(fresh(), [{ type: 'clock', to: 'd3' }]);
    expect(s.applied).toContain('e-monzo-register');
    expect(s.applied).toContain('e-statements');
    expect(s.applied).not.toContain('e-emi-paid');
    expect(s.audit.map((r) => r.at)).toEqual([...s.audit.map((r) => r.at)].sort());
  });
  it('an event is applied once, however often it is sent', () => {
    const s = reduce(fresh(), [{ type: 'event', id: 'e-monzo-register' }, { type: 'event', id: 'e-monzo-register' }]);
    expect(s.assets.filter((a) => a.id === 'monzo_savings')).toHaveLength(1);
    expect(s.audit.filter((r) => r.id === 'e-monzo-register')).toHaveLength(1);
  });
});
