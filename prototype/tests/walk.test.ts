/* The walk: every step runs from reset without error, jumping to a step equals walking to it, and walking the
   whole story writes the household's canonical events in the ledger's order and lands on its totals. */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import '../src/presenter/steps';
import { H } from '../src/data/figures';
import { STEPS } from '../src/presenter/script';
import { stateAt } from '../src/presenter/walk';
import { fresh } from '../src/state/fresh';
import { reduce } from '../src/state/reduce';
import { totals } from '../src/state/totals';

const h: any = H;
const plain = (s: any) => { const { seq: _q, toast: _t, chat: _c, history: _h, ...rest } = s; return JSON.parse(JSON.stringify(rest)); };
describe('the walk', () => {
  it('has the story in order', () => { expect(STEPS.length).toBeGreaterThan(15); expect(STEPS[0].id).toBe('signin'); });
  it('every step runs and leaves no flow half done', () => {
    let s = fresh();
    for (const st of STEPS) { s = reduce(s, [...st.enter, ...st.run]); expect(s.chat.active, st.id).toBeNull(); }
    const ids = s.audit.map((r) => r.id);
    for (const e of ['e-monzo-register', 'e-home-correction', 'e-statements', 'e-month-close', 'e-emi-paid', 'e-school-fees', 'e-wedding', 'e-ceiling', 'e-restore-asha']) expect(ids, e).toContain(e);
    expect(s.audit.map((r) => r.at)).toEqual([...s.audit.map((r) => r.at)].sort());
  });
  it('lands on the figure set at the end of each day', () => {
    let s = fresh();
    for (const st of STEPS) {
      s = reduce(s, [...st.enter, ...st.run]);
      const T = totals(s.assets, s.debts);
      if (st.id === 'valuation') expect(T.net_gbp).toBe(h.totals_after_correction.net_gbp);
      if (st.id === 'statements') expect(T.net_gbp).toBe(h.totals_after_statement_sun_1_nov.net_gbp);
      if (st.id === 'emi') expect(T.net_gbp).toBe(h.totals_after_hdfc_emi_thu_5_nov.net_gbp);
    }
  });
  it('jumping to a step equals walking to it', () => {
    for (const i of [1, 4, 7, 10, 13, STEPS.length - 1]) {
      let w = fresh({ presenter: { on: true, step: 0, done: [] } } as any);
      for (let k = 0; k < i; k++) w = reduce(w, [...STEPS[k].enter, ...STEPS[k].run]);
      w = reduce(w, [...STEPS[i].enter, { type: 'presenter', patch: { on: true, step: i } }]);
      if (STEPS[i].door) w = reduce(w, { type: 'door', door: STEPS[i].door });
      const j = stateAt(i, fresh());
      expect(plain(j).audit, STEPS[i].id).toEqual(plain(w).audit);
      expect(plain(j).assets).toEqual(plain(w).assets);
      expect(plain(j).route).toEqual(plain(w).route);
    }
  });
});
