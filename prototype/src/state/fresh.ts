/* The state at the start of the walk: Mon 26 Oct 2026, 09:40, signed out, on the household's figures as
   household-v4.json holds them before the first record. */
import { H, L } from '../data/figures';
import type { DemoState } from './model';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function fresh(keep?: Partial<DemoState>): DemoState {
  const led: any = L;
  /* the days before the demo starts (Sun 25 Oct: the SBI FD and the first three plan items) are history already */
  const before = (led.events ?? []).filter((e: any) => e.day === 'd0');
  return {
    door: keep?.door ?? 'web',
    w: keep?.w ?? { web: 1440, phone: 390, iphone: 402, ipad: 1180 },
    theme: keep?.theme ?? 'light',
    priv: false, ccy: 'GBP', todaysMoney: false,
    viewer: 'arun', signedIn: false,
    route: { page: 'signin' }, history: [], chatOpen: false,
    clock: 'd1', time: '09:40',
    assets: clone(H.assets) as any, debts: clone(H.debts) as any,
    audit: clone(before), runs: clone((led.runs ?? []).filter((r: any) => before.some((e: any) => e.run === r.id))), files: [],
    checkIns: clone(H.check_ins).map((c: any, i: number) => ({ id: c.id ?? `ci-${i}`, status: 'due', ...c })),
    plans: clone((H as any).projection?.plan_items ?? []),
    projection: { run: 'R0', assumptions: {} },
    admin: clone(led.admin ?? {}), settings: clone(led.settings ?? {}), members: clone(led.members ?? []),
    applied: before.map((e: any) => e.id), area: {},
    chat: { history: [], active: null, live: [], typed: '', pendingFiles: [] },
    presenter: { on: keep?.presenter?.on ?? false, step: 0, done: [] },
    branch: null, toast: null, undo: null, seq: 0,
  };
}
