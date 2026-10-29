/* The money area: every page builds at every door, viewer and clock; the Home correction from the asset page lands on
   the figure set's total; the statement flow reaches Confirm and Cancel; Asha has no pencil on others' records. */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import { H } from '../src/data/figures';
import { fresh } from '../src/state/fresh';
import { ctxOf } from '../src/state/ctx';
import { reduce } from '../src/state/reduce';
import { PAGES, FLOWS } from '../src/state/registry';
import { totals } from '../src/state/totals';
import type { DemoState } from '../src/state/model';

const h: any = H;
const strip = (t: any) => { const { exact_member: _e, ...rest } = t; return rest; };
const DOORS = ['web', 'phone', 'iphone', 'ipad'] as const;
const CLOCKS = ['d1', 'd2', 'd3', 'd3e', 'd4'] as const;
const W: Record<string, number> = { web: 1440, phone: 390, iphone: 402, ipad: 1180 };

function at(clock: string, viewer: 'arun' | 'asha' = 'arun', door: string = 'web', route?: any): DemoState {
  let s = reduce(fresh(), [{ type: 'signIn', as: 'arun', event: false }, ...(clock === 'd1' ? [] : [{ type: 'clock', to: clock }])]);
  s = reduce(s, [{ type: 'door', door }, { type: 'width', door, w: W[door] }, { type: 'viewer', id: viewer }]);
  if (route) s = reduce(s, { type: 'nav', ...route });
  return s;
}
const flat = (spec: any) => JSON.stringify(spec, (_k, v) => (typeof v === 'function' ? 'fn' : v));
const walk = (spec: any): any[] => spec.cols.flat().flatMap((b: any) => (b.parts ?? []).concat(b));
const asp = (s: DemoState, id: string, params: any) => PAGES[id].build(reduce(s, { type: 'nav', page: id, params }), ctxOf(reduce(s, { type: 'nav', page: id, params })));

describe('every page builds', () => {
  for (const door of DOORS) for (const viewer of ['arun', 'asha'] as const) for (const clock of CLOCKS) {
    it(`${door} · ${viewer} · ${clock}`, () => {
      const s = at(clock, viewer, door);
      for (const id of ['assets', 'debts', 'budget']) {
        const sp = PAGES[id].build(s, ctxOf(s));
        expect(sp.cols.flat().length).toBeGreaterThan(0);
        expect(flat(sp)).not.toContain('undefined');
        expect(flat(sp)).not.toContain('NaN');
      }
      for (const a of s.assets) { const sp = asp(s, 'asset', { id: a.id }); expect(flat(sp)).not.toContain('NaN'); expect(flat(sp)).not.toContain('undefined'); }
      for (const d of s.debts) { const sp = asp(s, 'debt', { id: d.id }); expect(flat(sp)).not.toContain('NaN'); expect(flat(sp)).not.toContain('undefined'); }
    });
  }
  it('an unknown record builds a not-found page', () => {
    const s = at('d1');
    expect(asp(s, 'asset', { id: 'nope' }).title).toBe('Asset');
    expect(asp(s, 'debt', { id: 'nope' }).title).toBe('Loan');
  });
});

describe('the Home correction from the asset page', () => {
  it('Save with £428,000 dispatches the ledger event and lands on the figure set', () => {
    let s = reduce(at('d1'), { type: 'event', id: 'e-monzo-register' });
    s = reduce(s, [{ type: 'nav', page: 'asset', params: { id: 'home' } }, { type: 'area', area: 'money', name: 'edit', key: 'asset:home' }]);
    const sp = PAGES.asset.build(s, ctxOf(s));
    const ed: any = walk(sp).find((p) => p.k === 'edit');
    expect(ed).toBeTruthy();
    expect(ed.preview('428000')).toMatchObject({ before: '£415,000', after: '£428,000', delta: '▲ £13,000' });
    const acts = ed.save('428,000');
    expect(acts[0]).toEqual({ type: 'event', id: 'e-home-correction' });
    const s2 = reduce(s, acts);
    expect(s2.audit.filter((r) => r.id === 'e-home-correction')).toHaveLength(1);
    expect(s2.area.money.edit).toBeNull();
    // the totals chain as the figure set does: the new record, then the correction
    const s1 = reduce(fresh(), [{ type: 'event', id: 'e-monzo-register' }]);
    const t1 = totals(s1.assets, s1.debts);
    expect(strip(totals(s2.assets, s2.debts, t1))).toEqual(h.totals_after_correction);
    expect(PAGES.asset.build(s2, ctxOf(s2)).cols.flat().length).toBeGreaterThan(0);
  });
  it('any other value writes one illustrative correction', () => {
    let s = at('d1');
    s = reduce(s, [{ type: 'nav', page: 'asset', params: { id: 'nre' } }, { type: 'area', area: 'money', name: 'edit', key: 'asset:nre' }]);
    const ed: any = walk(PAGES.asset.build(s, ctxOf(s))).find((p) => p.k === 'edit');
    const s2 = reduce(s, ed.save('230000'));
    const row = s2.audit[s2.audit.length - 1];
    expect(row).toMatchObject({ kind: 'correction', record: 'nre', before: 215000, after: 230000, illustrative: true });
    expect(s2.assets.find((a) => a.id === 'nre')!.value).toBe(230000);
    // a Home value other than £428,000 is illustrative too
    let s3 = reduce(at('d1'), [{ type: 'area', area: 'money', name: 'edit', key: 'asset:home' }]);
    const e3: any = walk(PAGES.asset.build(reduce(s3, { type: 'nav', page: 'asset', params: { id: 'home' } }), ctxOf(reduce(s3, { type: 'nav', page: 'asset', params: { id: 'home' } })))).find((p) => p.k === 'edit');
    expect(e3.save('430000')[0].ev.illustrative).toBe(true);
    // the same value again changes nothing
    expect(ed.save('215000')).toMatchObject({ type: 'area' });
  });
});

describe('Asha', () => {
  const pen = (s: DemoState, id: string) => {
    const sp = asp(s, 'asset', { id });
    return walk(sp).some((p) => p.k === 'big' && p.pen) ;
  };
  it('has a pencil only on her own records', () => {
    const s = at('d1', 'asha');
    expect(pen(s, 'nasdaq')).toBe(true); // Asha's NASDAQ ETF
    expect(pen(s, 'ppfas')).toBe(true);
    expect(pen(s, 'home')).toBe(false); // joint
    expect(pen(s, 'pot')).toBe(false); // joint
    expect(pen(s, 'balanced')).toBe(false); // Arun's
    expect(pen(s, 'nre')).toBe(false);
    expect(walk(asp(s, 'asset', { id: 'home' })).some((p) => p.k === 'lock')).toBe(true);
  });
  it("cannot open an edit on Arun's record even if the state says so", () => {
    let s = at('d1', 'asha');
    s = reduce(s, { type: 'area', area: 'money', name: 'edit', key: 'asset:home' });
    expect(walk(asp(s, 'asset', { id: 'home' })).some((p) => p.k === 'edit')).toBe(false);
    s = reduce(s, { type: 'area', area: 'money', name: 'edit', key: 'plan:Groceries' });
    expect(walk(PAGES.budget.build(s, ctxOf(s))).some((p) => p.k === 'edit')).toBe(false);
  });
  it('Arun has a pencil on every record', () => {
    const s = at('d1', 'arun');
    for (const a of s.assets) expect(walk(asp(s, 'asset', { id: a.id })).some((p) => p.k === 'big' && p.pen)).toBe(true);
  });
});

const ANS = [{ type: 'flow.answer', key: 'u0', v: 'Shopping', label: 'Shopping' }, { type: 'flow.answer', key: 'u1', v: 'Other', label: 'Other' }];
describe('statement.oct', () => {
  const start = () => reduce(at('d2'), { type: 'flow.start', id: 'statement.oct' });
  const awaiting = (s: DemoState) => (s.chat.live.at(-1) as any).cards[0];
  it('keeps the files, asks one card per amber line, and reaches the review card', () => {
    let s = start();
    expect(s.applied).toContain('e-file-barclay');
    expect(s.applied).toContain('e-file-monzo');
    expect(s.files.map((f) => f.id)).toEqual(['f-barclay', 'f-monzo']);
    expect(awaiting(s).parts[0].t).toContain('AMZN Mktp');
    s = reduce(s, ANS[0]);
    expect(awaiting(s).parts[0].t).toContain('PAYPAL');
    s = reduce(s, ANS[1]);
    const card = awaiting(s);
    expect(card.title).toBe('Spending £2,246 in 22 lines');
    expect(card.acts.map((a: any) => a.t)).toEqual(['Confirm', 'Cancel']);
    expect(s.audit.some((r) => r.id === 'e-statements')).toBe(false);
  });
  it('Confirm writes e-statements and e-emi-car once each and lands on the figure set', () => {
    let s = reduce(start(), [...ANS, { type: 'flow.confirm' }]);
    expect(s.audit.filter((r) => r.id === 'e-statements')).toHaveLength(1);
    expect(s.audit.filter((r) => r.id === 'e-emi-car')).toHaveLength(1);
    expect(s.chat.active).toBeNull();
    // replaying the events changes nothing
    const again = reduce(s, [{ type: 'event', id: 'e-statements' }, { type: 'event', id: 'e-emi-car' }]);
    expect(again.audit.filter((r) => r.id === 'e-statements')).toHaveLength(1);
    const s1 = reduce(fresh(), [{ type: 'event', id: 'e-monzo-register' }, { type: 'event', id: 'e-home-correction' }]);
    const t1 = totals(s1.assets, s1.debts);
    expect(strip(totals(s.assets, s.debts, t1))).toEqual(h.totals_after_statement_sun_1_nov);
    expect(s.debts.find((d) => d.id === 'card')!.balance).toBe(1458);
    // Budget now shows the actuals, the figure set's
    const sp = PAGES.budget.build(s, ctxOf(s));
    const hr: any = sp.cols.flat().find((b: any) => b.k === 'hero');
    expect(hr.big).toBe('£3,072');
    expect(hr.stats.find((x: any) => x.key === 'Spending').v).toBe('£2,246');
    // the saved card
    const saved = (s.chat.history.filter((m: any) => m.k === 'cards') as any[]).map((m) => m.cards[0]).find((c) => c.over?.includes('saved'));
    expect(saved.title).toBe("22 lines in October's budget");
  });
  it('a different pick moves the line to its category but not the total', () => {
    const s = reduce(start(), [{ type: 'flow.answer', key: 'u0', v: 'Groceries', label: 'Groceries' }, ANS[1], { type: 'flow.confirm' }]);
    const sp = PAGES.budget.build(s, ctxOf(s));
    const bud: any = walk(sp).filter((p) => p.k === 'bud');
    expect(bud.find((b: any) => b.name === 'Groceries').a).toBe('£867');
    expect(bud.find((b: any) => b.name === 'Shopping').a).toBe('£24');
  });
  it('Cancel writes no statement and no EMI row, and the card balance stays', () => {
    const s = reduce(start(), [...ANS, { type: 'flow.cancel' }]);
    expect(s.applied).not.toContain('e-statements');
    expect(s.applied).not.toContain('e-emi-car');
    expect(s.debts.find((d) => d.id === 'card')!.balance).toBe(0);
    expect(s.chat.active).toBeNull();
    const last = s.chat.history.at(-1) as any;
    expect(last.cards[0].foot).toBe('Cancelled. Nothing was saved.');
    // files were kept before anything read them (ARCHITECTURE §4.9): the only rows Cancel leaves
    expect(s.audit.filter((r) => r.day === 'd2').map((r) => r.id)).toEqual(['e-file-barclay', 'e-file-monzo']);
    // and it can be started again
    expect(FLOWS['statement.oct'].needs!(s)).toBe(true);
  });
  it('is offered only on Sun 1 Nov, before the statements', () => {
    expect(FLOWS['statement.oct'].needs!(at('d1'))).toBe(false);
    expect(FLOWS['statement.oct'].needs!(at('d2'))).toBe(true);
    expect(FLOWS['statement.oct'].needs!(at('d3'))).toBe(false);
  });
});

describe('monthclose.oct and the budget', () => {
  const afterStatements = () => reduce(at('d2'), [{ type: 'flow.start', id: 'statement.oct' }, ...ANS, { type: 'flow.confirm' }]);
  it('needs the statements first', () => {
    expect(FLOWS['monthclose.oct'].needs!(at('d2'))).toBe(false);
    expect(FLOWS['monthclose.oct'].needs!(afterStatements())).toBe(true);
  });
  it('Confirm writes e-month-close once and the budget shows October closed', () => {
    let s = reduce(afterStatements(), [{ type: 'flow.start', id: 'monthclose.oct' }]);
    const card = (s.chat.live.at(-1) as any).cards[0];
    expect(card.acts[0].t).toBe('Nothing else: close October');
    expect(PAGES.budget.build(s, ctxOf(s)).sub).toContain('open');
    s = reduce(s, { type: 'flow.confirm' });
    expect(s.audit.filter((r) => r.id === 'e-month-close')).toHaveLength(1);
    expect(s.time).toBe('09:02');
    const sp = PAGES.budget.build(s, ctxOf(s));
    expect(sp.sub).toContain('closed Sun 1 Nov 09:02');
    expect((sp.cols.flat().find((b: any) => b.k === 'hero') as any).over).toBe('October · closed');
  });
  it('Cancel on the check-in closes nothing', () => {
    const s = reduce(afterStatements(), [{ type: 'flow.start', id: 'monthclose.oct' }, { type: 'flow.cancel' }]);
    expect(s.applied).not.toContain('e-month-close');
    expect(s.area.money?.closed).toBeUndefined();
  });
  it('before the statements the budget shows only the plan, and "waiting" once the files are in', () => {
    const s = at('d2');
    const hr: any = PAGES.budget.build(s, ctxOf(s)).cols.flat().find((b: any) => b.k === 'hero');
    expect(hr.big).toBe('£2,636');
    expect(hr.unit).toBe('planned surplus');
    const w = reduce(s, [{ type: 'flow.start', id: 'statement.oct' }]);
    expect(PAGES.budget.build(w, ctxOf(w)).banner).toContain('waiting');
  });
  it('actuals are computed from the statement lines and match the figure set', () => {
    const s = afterStatements();
    const bud: any[] = walk(PAGES.budget.build(s, ctxOf(s))).filter((p) => p.k === 'bud');
    for (const r of h.budget_oct.plan) {
      const b = bud.find((x) => x.name === r.category);
      expect(b.a).toBe('£' + r.actual.toLocaleString('en-GB'));
      expect(b.p).toBe('£' + r.plan.toLocaleString('en-GB'));
    }
  });
  it('a plan correction while October is open changes October; once it is closed it runs from November', () => {
    let s = afterStatements();
    const edit = (st: DemoState, cat: string, v: string) => {
      const st2 = reduce(st, { type: 'area', area: 'money', name: 'edit', key: 'plan:' + cat });
      const ed: any = walk(PAGES.budget.build(st2, ctxOf(st2))).find((p) => p.k === 'edit');
      expect(ed.preview(v)).toMatchObject({ before: '£650', delta: '▲ £50' });
      return reduce(st2, ed.save(v));
    };
    const open = edit(s, 'Groceries', '700');
    expect(open.audit.at(-1)).toMatchObject({ kind: 'budget_plan_correct', field: 'Groceries', before: 650, after: 700, illustrative: true });
    expect((walk(PAGES.budget.build(open, ctxOf(open))).find((p) => p.k === 'bud' && p.name === 'Groceries') as any).p).toBe('£700');
    s = reduce(s, [{ type: 'flow.start', id: 'monthclose.oct' }, { type: 'flow.confirm' }]);
    const closed = edit(s, 'Groceries', '700');
    const sp = PAGES.budget.build(closed, ctxOf(closed));
    expect((walk(sp).find((p) => p.k === 'bud' && p.name === 'Groceries') as any).p).toBe('£650');
    expect(flat(sp)).toContain('£650 → £700 a month from November');
  });
});

describe('debts', () => {
  it('the card is clear before Sun 1 Nov and owes £1,458 after the statements', () => {
    const before = at('d1');
    expect(flat(PAGES.debts.build(before, ctxOf(before)))).toContain('The card is clear');
    const after = reduce(at('d2'), [{ type: 'flow.start', id: 'statement.oct' }, ...ANS, { type: 'flow.confirm' }]);
    const t = flat(PAGES.debts.build(after, ctxOf(after)));
    expect(t).toContain('£1,458');
    expect(t).toContain('due Fri 20 Nov');
  });
  it('the HDFC balance and EMI count move when the Thu 5 Nov EMI is applied', () => {
    const b = at('d3'); const a = reduce(b, { type: 'event', id: 'e-emi-paid' });
    const pb = flat(asp(b, 'debt', { id: 'hdfc' })), pa = flat(asp(a, 'debt', { id: 'hdfc' }));
    expect(pb).toContain('₹15,13,257'); expect(pb).toContain('135 EMIs paid');
    expect(pa).toContain('₹14,84,587'); expect(pa).toContain('136 EMIs paid');
    expect(pa).toContain('₹2,48,555'); expect(pb).toContain('₹2,59,274');
    expect(pa).toContain('₹25,15,413'); expect(pb).toContain('₹24,86,743');
  });
});
