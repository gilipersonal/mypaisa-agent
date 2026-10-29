/* The audit area: every page builds at every door, viewer and clock; the log has one row per applied event; filters
   work; run and file links point at things that exist; the file viewer's lines add up to the statements. */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import { H, L } from '../src/data/figures';
import { fileLines, octoberByCategory, shownRows, visibleRows } from '../src/areas/audit';
import { fresh } from '../src/state/fresh';
import { ctxOf } from '../src/state/ctx';
import { reduce } from '../src/state/reduce';
import { PAGES } from '../src/state/registry';

const h: any = H, led: any = L;
const DOORS = ['web', 'phone', 'iphone', 'ipad'] as const;
const CLOCKS = ['d1', 'd2', 'd3', 'd3e', 'd4'] as const;
/* the clock applies the events of the days before it; the admin day's events (Fri 6 Nov) are the Admin lane's flows,
   so d4 here also replays them by id, as that lane's Confirms would */
const ADMIN = ['e-signin-arun', 'e-fresh-1', 'e-approve-cr26', 'e-replay', 'e-fresh-fail', 'e-fresh-2', 'e-pause-asha', 'e-restore-asha'];
const at = (clock: string, viewer = 'arun', door: string = 'web', route: any = { page: 'audit' }) =>
  reduce(fresh(), [{ type: 'signIn', as: 'arun', event: false }, { type: 'clock', to: clock === 'd4' ? 'd3e' : clock }, ...(clock === 'd4' ? [{ type: 'clock', to: 'd4' }, ...ADMIN.map((id) => ({ type: 'event', id }))] : []), { type: 'viewer', id: viewer }, { type: 'door', door }, { type: 'nav', ...route }]);
const build = (s: any) => PAGES[s.route.page].build(s, ctxOf(s));
const text = (x: any) => JSON.stringify(x);
const acts = (x: any): any[] => { const out: any[] = []; JSON.stringify(x, (k, v) => { if (v && typeof v === 'object' && !Array.isArray(v) && v.type === 'nav') out.push(v); return v; }); return out; };

describe('audit pages build', () => {
  it('at every door, both viewers, every clock', () => {
    for (const d of DOORS) for (const v of ['arun', 'asha']) for (const c of CLOCKS) {
      for (const route of [{ page: 'audit' }, { page: 'files' }, { page: 'reports' }, { page: 'file', params: { id: 'f-barclay' } }, { page: 'file', params: { id: 'f-monzo' } }, { page: 'file', params: { id: 'nope' } }]) {
        const s = at(c, v, d, route);
        const pg = build(s);
        expect(pg.title, `${route.page} ${d} ${v} ${c}`).toBeTruthy();
      }
    }
  });
});
describe('the audit log', () => {
  it('after the canonical events it holds one row per applied event, in time order', () => {
    const s = at('d3e');
    expect(s.audit.length).toBe(s.applied.length);
    expect(s.audit.map((r) => r.at)).toEqual([...s.audit.map((r) => r.at)].sort());
    const rows = shownRows(s, 'arun');
    expect(rows.length).toBe(s.applied.length);
    expect(rows.map((r) => r.at)).toEqual([...rows.map((r) => r.at)].sort().reverse());
    const pg = build(s);
    const shown = pg.cols.flat().filter((b: any) => b.k === 'card' && b.title && /^\w{3} \d+ \w{3}$/.test(b.title));
    expect(shown.length).toBeGreaterThan(3);
    const names = shown.flatMap((b: any) => b.parts.filter((p: any) => p.k === 'row' && p.cls !== 'fileline'));
    expect(names.length).toBe(s.applied.length);
  });
  it('is honest before the events: only Sunday 25 Oct at d1 after sign-in', () => {
    const s = reduce(fresh(), [{ type: 'signIn', as: 'arun', event: false }, { type: 'nav', page: 'audit' }]);
    expect(s.audit.every((r) => r.at.startsWith('2026-10-25'))).toBe(true);
  });
  it('filters by member and by kind', () => {
    let s = at('d4');
    s = reduce(s, [{ type: 'area', area: 'audit', name: 'filter', cat: 'admin' }]);
    const admin = shownRows(s, 'arun');
    expect(admin.length).toBeGreaterThan(5);
    expect(admin.every((r) => r.via === 'admin' || r.kind === 'sign_in' || r.kind.startsWith('fresh'))).toBe(true);
    s = reduce(s, [{ type: 'area', area: 'audit', name: 'filter', cat: 'plans' }]);
    expect(shownRows(s, 'arun').every((r) => /^plan_|assumption|budget_change|undo/.test(r.kind))).toBe(true);
    s = reduce(s, [{ type: 'area', area: 'audit', name: 'filter', cat: 'all', who: 'asha' }]);
    expect(shownRows(s, 'arun').length).toBe(0);
    expect(text(build(s))).toContain('No rows match');
    s = reduce(s, [{ type: 'area', area: 'audit', name: 'filter', who: 'arun' }]);
    expect(shownRows(s, 'arun').length).toBe(s.audit.length);
  });
  it("Asha reads the household's rows but not the admin's security rows", () => {
    const s = at('d4', 'asha');
    const rows = visibleRows(s, 'asha');
    expect(rows.length).toBeLessThan(s.audit.length);
    expect(rows.some((r) => r.via === 'admin' || r.kind === 'sign_in')).toBe(false);
    expect(rows.some((r) => r.kind === 'register')).toBe(true);
    expect(text(build(s))).not.toContain('Fresh check');
  });
  it('each row links to a run and a file that exist', () => {
    const s = at('d4');
    const pg = build(s);
    const ids = acts(pg).filter((a) => a.page === 'run' || a.page === 'file');
    expect(ids.length).toBeGreaterThan(10);
    for (const a of ids) {
      if (a.page === 'run') expect(s.runs.some((r) => r.id === a.params.id), a.params.id).toBe(true);
      else expect(s.files.some((f) => f.id === a.params.id), a.params.id).toBe(true);
    }
    for (const r of s.audit) { if (r.run) expect(s.runs.some((x) => x.id === r.run)).toBe(true); if (r.file) expect(s.files.some((x) => x.id === r.file)).toBe(true); }
  });
});
describe('files', () => {
  it('are honestly empty before Sun 1 Nov, and held after the statements', () => {
    const early = at('d1', 'arun', 'web', { page: 'files' });
    expect(early.files.length).toBe(0);
    expect(text(build(early))).toContain('No files to show');
    const s = at('d3', 'arun', 'web', { page: 'files' });
    expect(s.files.map((f) => f.id).sort()).toEqual(['f-barclay', 'f-monzo']);
    expect(text(build(s))).toContain('barclaycard-2026-11-01.pdf');
  });
  it('a member sees only her own files', () => {
    const s = at('d3', 'asha', 'web', { page: 'files' });
    expect(text(build(s))).toContain('No files to show');
    const v = at('d3', 'asha', 'web', { page: 'file', params: { id: 'f-barclay' } });
    expect(text(build(v))).toContain('not yours to open');
  });
  it("the viewer's lines add up to the statements", () => {
    const bar = led.files.find((f: any) => f.id === 'f-barclay'), mz = led.files.find((f: any) => f.id === 'f-monzo');
    const bl = fileLines(bar), ml = fileLines(mz);
    const sum = (l: any[]) => Math.round(l.reduce((t, x) => t + x.amount, 0) * 100) / 100;
    expect(bl.length).toBe(16);
    expect(sum(bl)).toBe(h.statements_oct.barclaycard_nov.balance);
    expect(sum(ml.filter((l) => l.spend))).toBe(h.statements_oct.monzo_current_oct.spend);
    expect(ml.length).toBe(11);
    expect(bl.length + ml.filter((l) => l.spend).length).toBe(22);
    expect(sum([...bl, ...ml.filter((l) => l.spend)])).toBe(2246);
    const s = at('d3', 'arun', 'web', { page: 'file', params: { id: 'f-barclay' } });
    const t = text(build(s));
    expect(t).toContain('£1,458');
    expect(t).toContain('never deleted after extraction');
    expect(t).toContain('Changes this file fed');
  });
  it('opening a file writes one audit row', () => {
    const s = at('d3', 'arun', 'web', { page: 'file', params: { id: 'f-barclay' } });
    const act = JSON.parse(text(build(s))).cols.flat().flatMap((b: any) => b.parts ?? []).find((p: any) => p.k === 'btn').act;
    const s2 = reduce(s, act);
    expect(s2.audit.length).toBe(s.audit.length + 1);
    expect(s2.audit.at(-1)!.kind).toBe('file_open');
  });
});
describe('reports', () => {
  it('are built from the records and say what is not in the demo', () => {
    const s = at('d3e', 'arun', 'web', { page: 'reports' });
    const t = text(build(s));
    expect(t).toContain('Exports come with phase 9');
    expect(t).toContain('Net worth, event by event');
    const total = octoberByCategory().reduce((a, x) => a + x[1], 0);
    expect(total).toBe(2246);
    expect(t).toContain('£2,246');
    expect(text(build(at('d1', 'arun', 'web', { page: 'reports' })))).toContain('Nothing to report yet');
  });
});
