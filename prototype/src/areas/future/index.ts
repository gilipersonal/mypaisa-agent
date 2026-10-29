/* Area 'future' (MA-290): the Projection page with its three tabs, the plan flows and what-ifs in the chat, and the
   appliers that put a plan item, a pause, an end, a correction or an assumption into the records. */
import { register, type Applier } from '../../state/registry';
import type { DemoState } from '../../state/model';
import { planFor, fs, nextPlanFlow, type FutureState, type Plan } from './data';
import { projectionPage } from './pages';
import { FLOWS_FUTURE } from './flows';

const save = (s: DemoState, patch: Partial<FutureState>) => { s.area.future = { ...fs(s), ...patch }; };
const find = (s: DemoState, id?: string | null) => (s.plans as Plan[]).find((x) => x.id === id);
/** A ledger event brings the run up to date; an illustrative one leaves the line to the engine's next run. */
const touch = (s: DemoState, ev: any) => save(s, { stale: !!ev.illustrative });
const bump = (pl: Plan) => { pl.version = (pl.version ?? 1) + 1; };

const appliers: Record<string, Applier> = {
  plan_add: (s, ev: any) => {
    const pl = ev.payload?.plan ?? planFor(ev.record!);
    if (pl && !find(s, pl.id)) s.plans.push(structuredClone(pl));
    touch(s, ev);
  },
  'plan_add:undo': (s, ev) => { s.plans = s.plans.filter((x: Plan) => x.id !== ev.record); },
  plan_pause: (s, ev) => { const pl = find(s, ev.record); if (pl) { pl.status = 'paused'; bump(pl); } touch(s, ev); },
  plan_resume: (s, ev) => { const pl = find(s, ev.record); if (pl) { pl.status = 'active'; bump(pl); } touch(s, ev); },
  plan_end: (s, ev) => { const pl = find(s, ev.record); if (pl) { pl.status = 'ended'; bump(pl); } touch(s, ev); },
  plan_correct: (s, ev) => {
    const pl = find(s, ev.record);
    if (pl) { if (ev.field === 'end') pl.until = String(ev.after); else if (ev.field === 'growth') pl.growth = Number(ev.after); bump(pl); }
    touch(s, ev);
  },
  assumption_correct: (s, ev) => { s.projection.assumptions[ev.record!] = Number(ev.after); touch(s, ev); },
  budget_change: (s, ev) => { save(s, { novSurplus: Number(ev.after) }); },
  'budget_change:undo': (s, ev) => { save(s, { novSurplus: Number(ev.before) }); },
  /* a reversal event: the plan item it reverses leaves the plan; the row it reverses stays in the log */
  undo: (s, ev) => { s.plans = s.plans.filter((x: Plan) => x.id !== ev.record); save(s, { stale: false }); },
};

register({
  id: 'future',
  pages: [{
    meta: { id: 'projection', title: 'Projection', icon: 'trending_up', area: 'future', side: 5, ask: 'Ask a what-if, or tell MyPaisa a plan' },
    build: projectionPage,
  }],
  flows: FLOWS_FUTURE,
  appliers,
  reduce: (s, a) => {
    const f = fs(s);
    switch (a.name) {
      case 'hz': save(s, { hz: a.v }); break;
      case 'open': save(s, { open: f.open === a.id ? null : a.id, pend: null, edit: null }); break;
      case 'pend': save(s, { pend: { id: a.id, op: a.op } }); break;
      case 'clear': save(s, { pend: null, open: null }); break;
      case 'edit': save(s, { edit: a.v ?? null }); break;
      case 'year': save(s, { year: f.year === a.y ? null : a.y }); break;
    }
  },
  suggest: (s, route) => {
    const out: { t: string; icon: string; act: any; sug?: boolean }[] = [];
    const asha = s.viewer === 'asha';
    if (s.clock === 'd3e' && !asha) {
      const n = nextPlanFlow(s);
      const T: Record<string, [string, string]> = { 'plan.school': ['Add the school fees', 'school'], 'plan.salary-step': ['Set my salary from Sep 2028', 'payments'], 'plan.hdfc-close': ['Close the HDFC loan with the SBI FD', 'home_work'], 'plan.wedding': ["Add my sister's wedding", 'celebration'] };
      if (n) out.push({ t: T[n][0], icon: T[n][1], act: { type: 'flow.start', id: n }, sug: true });
    }
    if (s.clock === 'd3' || route.page === 'projection') out.push({ t: 'What if we buy a second flat?', icon: 'query_stats', act: { type: 'flow.start', id: asha ? 'whatif.asha' : 'whatif.flat' }, sug: true });
    return out;
  },
});
