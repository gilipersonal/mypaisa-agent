/* The future area (MA-290): every tab builds at every door, viewer and clock; each flow reaches its Confirm and its
   Cancel; a Confirm writes the ledger's rows exactly once and a Cancel none; Asha cannot save a plan item or edit
   an assumption; the run shown follows the plan events applied. */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import { fresh } from '../src/state/fresh';
import { reduce } from '../src/state/reduce';
import { ctxOf } from '../src/state/ctx';
import { FLOWS, PAGES } from '../src/state/registry';
import { runKey, runOf } from '../src/areas/future/data';
import { suggestions } from '../src/ui/composer';
import type { DemoState } from '../src/state/model';

const DOORS = ['web', 'phone', 'iphone', 'ipad'] as const;
const CLOCKS = ['d1', 'd2', 'd3', 'd3e', 'd4'] as const;
const TABS = ['networth', 'plans', 'forecast'];
const go = (s: DemoState, ...a: any[]) => reduce(s, a.flat(3));
const at = (clock: string, ...pre: any[]) => go(fresh(), { type: 'signIn', as: 'arun', event: false }, { type: 'clock', to: clock }, ...pre);
const build = (s: DemoState) => PAGES.projection.build(s, ctxOf(s));
const walk = (s: DemoState) => JSON.stringify(build(s));
/** every part (and edit part) of a page, flattened */
const parts = (s: DemoState): any[] => build(s).cols.flat().flatMap((b: any) => (b.k === 'card' ? b.parts : []));
const ids = (s: DemoState) => s.audit.map((r) => r.id);

const SCHOOL = [{ type: 'flow.start', id: 'plan.school' }, { type: 'flow.answer', key: 'until', v: 'Jul 2041' }, { type: 'flow.answer', key: 'grows', v: '4.5% a year' }, { type: 'flow.answer', key: 'from', v: 'The monthly budget' }];
const SCHOOL_POT = [...SCHOOL, { type: 'flow.confirm' }, { type: 'flow.answer', key: 'opt', v: 'pot' }, { type: 'flow.confirm' }];

describe('every tab builds', () => {
  for (const door of DOORS) for (const viewer of ['arun', 'asha']) for (const clock of CLOCKS) {
    it(`${door} · ${viewer} · ${clock}`, () => {
      for (const tab of TABS) {
        for (const ccy of ['GBP', 'INR']) {
          let s = go(at(clock), { type: 'door', door }, { type: 'viewer', id: viewer }, { type: 'nav', page: 'projection', params: { tab } }, { type: 'ccy', ccy }, { type: 'todaysMoney', on: ccy === 'INR' });
          const j = walk(s);
          expect(j.length).toBeGreaterThan(200);
          expect(j).not.toMatch(/NaN|undefined|Infinity/);
          for (const hz of [5, 10, 20, 30]) { s = go(s, { type: 'area', area: 'future', name: 'hz', v: hz }); expect(walk(s)).not.toMatch(/NaN|undefined|Infinity/); }
        }
      }
    });
  }
  it('the forecast opens a year to its lines and months', () => {
    let s = go(at('d3e', { type: 'event', id: 'e-school-fees' }), { type: 'nav', page: 'projection', params: { tab: 'forecast' } }, { type: 'area', area: 'future', name: 'year', y: 2029 });
    expect(walk(s)).toMatch(/Jan 2029/);
    s = go(s, { type: 'area', area: 'future', name: 'year', y: 2029 });
    expect(walk(s)).not.toMatch(/the flows behind it/);
  });
});

describe('the run follows the plan events applied', () => {
  it('chooses R26, R0, R5N (once the EMI is answered) and then each evening run', () => {
    expect(runKey(fresh())).toBe('R26');
    expect(runKey(go(fresh(), { type: 'signIn', as: 'arun', event: false }, { type: 'clock', to: 'd2' }))).toBe('R0');
    expect(runKey(at('d3'))).toBe('R0');
    expect(runKey(at('d3', { type: 'event', id: 'e-emi-paid' }))).toBe('R5N');
    let s = at('d3e');
    const order: [string, string][] = [['e-school-fees', 'R1'], ['e-school-pot', 'R2'], ['e-salary-step', 'R3'], ['e-hdfc-close', 'R4'], ['e-car-pause', 'R5'], ['e-car-resume', 'R5b'], ['e-school-end', 'R6'], ['e-car-end', 'R7'], ['e-wedding', 'W'], ['e-wedding-cover', 'W'], ['e-wedding-undo', 'W']];
    for (const [ev, run] of order) { s = go(s, { type: 'event', id: ev }); expect(runKey(s)).toBe(run); }
  });
  it('the page headline is the run\'s own middle path, for the horizon', () => {
    for (const [ev, run] of [['e-school-fees', 'R1'], ['e-car-end', 'R7']] as const) {
      const s = go(at('d3e', { type: 'event', id: ev }), { type: 'nav', page: 'projection', params: { tab: 'networth' } });
      const hero: any = build(s).cols.flat().find((b: any) => b.k === 'hero');
      const end = runOf(run).fan.find((r: any) => r.year === 2046);
      expect(hero.big.replace(/[£,]/g, '')).toBe(String(end.p50));
    }
  });
  it('a ledger event on the plans tab reads the same figure as the run says', () => {
    const s = go(at('d3e', { type: 'event', id: 'e-school-fees' }), { type: 'nav', page: 'projection', params: { tab: 'plans' } });
    expect(walk(s)).toContain('School fees');
    expect(walk(s)).toContain('£4,000 a month, Jan 2029 to Jul 2041');
  });
});

describe('flows: Confirm writes the ledger rows once, Cancel none', () => {
  it('registers every flow', () => { for (const id of ['whatif.flat', 'whatif.asha', 'plan.school', 'plan.salary-step', 'plan.hdfc-close', 'plan.wedding']) expect(FLOWS[id]).toBeTruthy(); });
  it('the what-if saves (illustrative) or cancels', () => {
    const base = at('d3');
    const s0 = go(base, { type: 'flow.start', id: 'whatif.flat' });
    expect(s0.chat.active?.id).toBe('whatif.flat');
    const live = JSON.stringify(s0.chat.live); expect(live).toContain('Save as a plan item'); expect(live).toContain('£1,446,000');
    const saved = go(s0, { type: 'flow.confirm' });
    expect(saved.audit.length - base.audit.length).toBe(1);
    expect(saved.plans.some((p: any) => p.id === 'flat2')).toBe(true);
    expect(go(saved, { type: 'flow.confirm' }).audit.length).toBe(saved.audit.length);
    const cx = go(s0, { type: 'flow.cancel' });
    expect(cx.audit.length).toBe(base.audit.length); expect(cx.plans.length).toBe(base.plans.length);
  });
  it('the early what-if takes the 26 Oct figures', () => {
    const s = go(at('d1'), { type: 'flow.start', id: 'whatif.flat' });
    expect(JSON.stringify(s.chat.live)).toContain('£1,417,000');
  });
  it('school fees: question, impact, Confirm, options, the pot, two rows tied by one group', () => {
    const base = at('d3e');
    const s1 = go(base, ...SCHOOL);
    expect(JSON.stringify(s1.chat.live)).toContain('50 months');
    const s2 = go(s1, { type: 'flow.confirm' });
    expect(ids(s2).filter((i) => i === 'e-school-fees')).toHaveLength(1);
    expect(s2.audit.length - base.audit.length).toBe(1);
    const s3 = go(s2, { type: 'flow.answer', key: 'opt', v: 'pot' }, { type: 'flow.confirm' });
    expect(s3.audit.length - base.audit.length).toBe(3);
    expect(ids(s3).slice(-3)).toEqual(['e-school-fees', 'e-school-pot', 'e-budget-nov']);
    const rows = s3.audit.filter((r) => ['e-school-pot', 'e-budget-nov'].includes(r.id)) as any[];
    expect(rows[0].group).toBeTruthy(); expect(rows[0].group).toBe(rows[1].group);
    expect(s3.plans.map((p: any) => p.id)).toEqual(expect.arrayContaining(['schooling', 'school_fees_pot']));
    expect(s3.area.future.novSurplus).toBe(1946);
    expect(s3.undo?.label).toBe('School fees pot');
    const u = go(s3, { type: 'undo' });
    expect(u.plans.some((p: any) => p.id === 'school_fees_pot')).toBe(false);
    expect(u.area.future.novSurplus).toBe(2636);
    expect(u.plans.some((p: any) => p.id === 'schooling')).toBe(true);
  });
  it('school fees: Cancel at either Confirm writes nothing more', () => {
    const base = at('d3e');
    const c1 = go(base, ...SCHOOL, { type: 'flow.cancel' });
    expect(c1.audit.length).toBe(base.audit.length); expect(c1.chat.active).toBeNull();
    const c2 = go(base, ...SCHOOL, { type: 'flow.confirm' }, { type: 'flow.answer', key: 'opt', v: 'pot' }, { type: 'flow.cancel' });
    expect(c2.audit.length - base.audit.length).toBe(1);
    expect(c2.plans.some((p: any) => p.id === 'school_fees_pot')).toBe(false);
  });
  it('school fees: the other two ways write one row each', () => {
    for (const opt of ['trim', 'isa']) {
      const base = at('d3e'); const s = go(base, ...SCHOOL, { type: 'flow.confirm' }, { type: 'flow.answer', key: 'opt', v: opt }, { type: 'flow.confirm' });
      expect(s.audit.length - base.audit.length).toBe(2);
    }
  });
  it('salary step and the HDFC closure write their rows', () => {
    for (const [id, ev] of [['plan.salary-step', 'e-salary-step'], ['plan.hdfc-close', 'e-hdfc-close']]) {
      const base = at('d3e'); const s = go(base, { type: 'flow.start', id }, { type: 'flow.confirm' });
      expect(ids(s).filter((i) => i === ev)).toHaveLength(1); expect(s.audit.length - base.audit.length).toBe(1);
      const c = go(base, { type: 'flow.start', id }, { type: 'flow.cancel' }); expect(c.audit.length).toBe(base.audit.length);
    }
  });
  it('the wedding: flag, ways, apply, then Undo writes the reversal', () => {
    const base = at('d3e');
    const s1 = go(base, { type: 'flow.start', id: 'plan.wedding' }, { type: 'flow.confirm' });
    expect(ids(s1).filter((i) => i === 'e-wedding')).toHaveLength(1);
    expect(JSON.stringify(s1.chat.live)).toContain('Jun 2027');
    const s2 = go(s1, { type: 'flow.answer', key: 'way', v: 'isa' }, { type: 'flow.confirm' });
    expect(ids(s2).slice(-2)).toEqual(['e-wedding', 'e-wedding-cover']);
    expect(s2.plans.some((p: any) => p.id === 'wedding_cover')).toBe(true);
    const s3 = go(s2, { type: 'undo' });
    expect(ids(s3).slice(-1)).toEqual(['e-wedding-undo']);
    expect(s3.plans.some((p: any) => p.id === 'wedding_cover')).toBe(false);
    expect(s3.plans.some((p: any) => p.id === 'wedding')).toBe(true);
    const cx = go(s1, { type: 'flow.answer', key: 'way', v: 'isa' }, { type: 'flow.cancel' });
    expect(cx.audit.length).toBe(s1.audit.length);
  });
  it('the suggestions follow the clock', () => {
    expect(suggestions(at('d3')).map((x) => x.t)).toContain('What if we buy a second flat?');
    expect(suggestions(at('d3e')).map((x) => x.t)).toContain('Add the school fees');
    expect(suggestions(go(at('d3e'), { type: 'event', id: 'e-school-fees' })).map((x) => x.t)).toContain('Set my salary from Sep 2028');
  });
});

describe('Asha cannot', () => {
  const asha = (clock: string, ...a: any[]) => go(at(clock), { type: 'viewer', id: 'asha' }, ...a);
  it('save a plan item: every plan flow ends without a write', () => {
    for (const id of ['plan.school', 'plan.salary-step', 'plan.hdfc-close', 'plan.wedding', 'whatif.flat']) {
      const base = asha('d3e'); const s = go(base, { type: 'flow.start', id }, { type: 'flow.confirm' }, { type: 'flow.confirm' });
      expect(s.audit.length).toBe(base.audit.length); expect(s.plans.length).toBe(base.plans.length);
    }
  });
  it('save the what-if: her card has no Confirm', () => {
    const base = asha('d3'); const s = go(base, { type: 'flow.start', id: 'whatif.asha' });
    const shown = JSON.stringify([...s.chat.history, ...s.chat.live]);
    expect(shown).toContain('Only Arun can save it'); expect(shown).not.toContain('flow.confirm'); expect(shown).toContain('£1,446,000');
    expect(s.audit.length).toBe(base.audit.length);
  });
  it('edit an assumption or touch a plan item: no edit part, no actions', () => {
    const s = asha('d3e', { type: 'nav', page: 'projection', params: { tab: 'networth' } }, { type: 'area', area: 'future', name: 'edit', v: 'asm:arun' });
    expect(parts(s).some((p) => p.k === 'edit')).toBe(false);
    expect(parts(s).some((p) => p.k === 'lock')).toBe(true);
    const t = go(s, { type: 'nav', page: 'projection', params: { tab: 'plans' } }, { type: 'area', area: 'future', name: 'open', id: 'car2' });
    expect(parts(t).some((p) => p.k === 'btn' && ['Pause', 'End'].includes(p.t))).toBe(false);
  });
});

describe('corrections in place', () => {
  const edit = (s: DemoState, v: string) => { const e = parts(s).find((p) => p.k === 'edit'); expect(e).toBeTruthy(); return e.save(v); };
  it("Arun's salary growth 4.17% to 4.8% is the ledger's e-salary-growth", () => {
    let s = at('d1', { type: 'nav', page: 'projection', params: { tab: 'networth' } }, { type: 'area', area: 'future', name: 'edit', v: 'asm:arun' });
    expect(JSON.stringify(parts(s).find((p) => p.k === 'edit').preview('4.8'))).toContain('4.17%');
    s = go(s, edit(s, '4.8'));
    expect(ids(s).filter((i) => i === 'e-salary-growth')).toHaveLength(1);
    expect(s.projection.assumptions.arun_salary_growth).toBe(0.048);
    expect(s.area.future.edit).toBeNull();
    expect(walk(s)).toContain('4.8%');
  });
  it('a plan item is paused, resumed, corrected and ended with the ledger rows, each once', () => {
    let s = at('d3e', { type: 'nav', page: 'projection', params: { tab: 'plans' } });
    const confirm = (id: string, op: string) => {
      s = go(s, { type: 'area', area: 'future', name: 'open', id }, { type: 'area', area: 'future', name: 'pend', id, op });
      const b = parts(s).find((p) => p.k === 'btn' && p.t === 'Confirm'); expect(b).toBeTruthy(); s = go(s, b.act);
    };
    confirm('car2', 'pause'); expect(runKey(s)).toBe('R5'); expect(s.plans.find((p: any) => p.id === 'car2').status).toBe('paused');
    confirm('car2', 'resume'); expect(runKey(s)).toBe('R5b');
    s = go(s, { type: 'event', id: 'e-school-fees' });
    s = go(s, { type: 'area', area: 'future', name: 'open', id: 'schooling' }, { type: 'area', area: 'future', name: 'pend', id: 'schooling', op: 'end-date' });
    s = go(s, edit(s, 'Jul 2040')); expect(runKey(s)).toBe('R6'); expect(s.plans.find((p: any) => p.id === 'schooling').until).toBe('2040-07');
    confirm('car2', 'end'); expect(runKey(s)).toBe('R7'); expect(s.plans.find((p: any) => p.id === 'car2').status).toBe('ended');
    for (const e of ['e-car-pause', 'e-car-resume', 'e-school-end', 'e-car-end']) expect(ids(s).filter((i) => i === e)).toHaveLength(1);
    expect(walk(s)).toContain('Ended');
  });
  it('off the walk the same actions write one illustrative row, and Cancel none', () => {
    let s = at('d2', { type: 'nav', page: 'projection', params: { tab: 'plans' } }), n = s.audit.length;
    s = go(s, { type: 'area', area: 'future', name: 'open', id: 'extension' }, { type: 'area', area: 'future', name: 'pend', id: 'extension', op: 'pause' }, { type: 'area', area: 'future', name: 'clear' });
    expect(s.audit.length).toBe(n);
    s = go(s, { type: 'area', area: 'future', name: 'open', id: 'extension' }, { type: 'area', area: 'future', name: 'pend', id: 'extension', op: 'pause' });
    s = go(s, parts(s).find((p) => p.k === 'btn' && p.t === 'Confirm').act);
    expect(s.audit.length).toBe(n + 1); expect(s.plans.find((p: any) => p.id === 'extension').status).toBe('paused');
    expect(runKey(s)).toBe('R0');
  });
});
