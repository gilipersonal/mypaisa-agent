/* Household (MA-290): the Admin center, You and the sign-in variants. Every page builds at every door, both viewers
   and every clock; Asha has no Admin center; each admin flow reaches its Confirm and its Cancel, a Confirm writes the
   ledger's id once after the fresh check and a Cancel writes nothing; the owner cannot be paused. */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import { FLOWS, PAGES } from '../src/state/registry';
import { fresh } from '../src/state/fresh';
import { reduce } from '../src/state/reduce';
import { ctxOf } from '../src/state/ctx';
import type { DemoState } from '../src/state/model';

const DOORS = ['web', 'phone', 'iphone', 'ipad'] as const, CLOCKS = ['d1', 'd2', 'd3', 'd3e', 'd4'] as const;
const mine = Object.values(PAGES).filter((p) => p.meta.area === 'household');
const start = (clock = 'd4', viewer = 'arun', door = 'web'): DemoState => reduce(fresh(), [{ type: 'door', door }, { type: 'clock', to: clock }, { type: 'signIn', method: 'Apple', page: 'home' }, { type: 'viewer', id: viewer }]);
const walk = (s: DemoState, acts: any[]) => reduce(s, acts);
const cards = (s: DemoState) => s.chat.live.flatMap((m: any) => (m.k === 'cards' ? m.cards : []));
const rows = (s: DemoState, id: string) => s.audit.filter((r) => r.id === id);
const owner = (s: DemoState) => s.members.find((m) => m.id === 'asha');
const json = (x: unknown) => JSON.stringify(x);
/* a page only reads: Svelte forbids writing state inside a derived, so build against a frozen state */
const freeze = <T>(x: T): T => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); Object.values(x as any).forEach(freeze); } return x; };

describe('pages', () => {
  it('registers the pages the brief names', () => {
    for (const id of ['admin', 'admin-spend', 'admin-approvals', 'admin-alerts', 'admin-agents', 'admin-people', 'admin-settings', 'you', 'you-signin', 'you-notifications', 'you-privacy', 'you-pause', 'you-leave', 'join', 'setup', 'signin-refused']) expect(PAGES[id], id).toBeTruthy();
    expect(PAGES.admin.meta).toMatchObject({ side: 9, adminOnly: true, icon: 'admin_panel_settings' });
    expect(PAGES.you.meta).toMatchObject({ side: 8, icon: 'person' });
    for (const id of ['admin-spend', 'admin-approvals', 'admin-alerts', 'admin-agents', 'admin-people', 'admin-settings']) expect(PAGES[id].meta.parent).toBe('admin');
    for (const id of ['you-signin', 'you-notifications', 'you-privacy', 'you-pause', 'you-leave']) expect(PAGES[id].meta.parent).toBe('you');
  });
  it('builds at every door, both viewers and every clock, and says something', () => {
    for (const door of DOORS) for (const viewer of ['arun', 'asha']) for (const clock of CLOCKS) {
      const s0 = freeze(start(clock, viewer, door));
      for (const p of mine) for (const params of [{}, { id: 'asha' }, { id: 'arun' }, { id: 'paused' }, { id: 'removed' }]) {
        const s = { ...s0, route: { page: p.meta.id, params } } as DemoState;
        const spec = p.build(s, ctxOf(s));
        expect(spec.title, `${p.meta.id} ${door} ${viewer} ${clock}`).toBeTruthy();
        expect(json(spec)).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });
  it('Asha gets no Admin center, and the owner only sees it in the sidebar', () => {
    const s = start('d4', 'asha');
    for (const p of mine.filter((x) => x.meta.adminOnly)) {
      const spec = p.build({ ...s, route: { page: p.meta.id } } as DemoState, ctxOf(s));
      expect(json(spec), p.meta.id).toContain('"k":"lock"');
      expect(json(spec), p.meta.id).not.toContain('Move the ceiling');
    }
    const you = PAGES.you.build({ ...s, route: { page: 'you' } } as DemoState, ctxOf(s));
    expect(json(you)).not.toContain('Admin center');
    expect(json(PAGES.you.build({ ...start(), route: { page: 'you' } } as DemoState, ctxOf(start())))).toContain('Admin center');
  });
  it('Spend is the clock\'s own, and a moved ceiling moves the steps', () => {
    const d1 = PAGES['admin-spend'].build({ ...start('d1'), route: { page: 'admin-spend' } } as DemoState, ctxOf(start('d1')));
    expect(json(d1)).toContain('$18 of $160');
    const s4 = start('d4');
    expect(json(PAGES['admin-spend'].build({ ...s4, route: { page: 'admin-spend' } } as DemoState, ctxOf(s4)))).toContain('$0.40 of $160');
    const moved = walk(s4, [{ type: 'event', id: 'e-ceiling' }]);
    const j = json(PAGES['admin-spend'].build({ ...moved, route: { page: 'admin-spend' } } as DemoState, ctxOf(moved)));
    expect(j).toContain('$0.40 of $50'); expect(j).toContain('$35'); expect(j).toContain('$47.50');
  });
});

/** The actions that walk each flow to its Confirm, and what each writes. */
const FLOW_WALKS: Record<string, { id: string; actions: any[]; writes: string; first?: any[] }> = {
  approve: { id: 'admin.approve', actions: [{ type: 'flow.answer', key: 'check', v: 'passkey' }], writes: 'e-approve-cr26' },
  replay: { id: 'admin.replay', actions: [{ type: 'flow.answer', key: 'check', v: 'passkey' }], writes: 'e-replay' },
  ceiling: { id: 'admin.ceiling', actions: [{ type: 'flow.answer', key: 'to', v: 50, label: '$50' }, { type: 'flow.answer', key: 'check', v: 'passkey' }], writes: 'e-ceiling' },
  pause: { id: 'admin.pause', actions: [{ type: 'flow.answer', key: 'check', v: 'google' }, { type: 'flow.answer', key: 'check2', v: 'passkey' }], writes: 'e-pause-asha', first: [] },
};
describe('admin flows', () => {
  for (const [name, w] of Object.entries(FLOW_WALKS)) {
    const begin = (s: DemoState) => walk(s, [{ type: 'flow.start', id: w.id, ...(name === 'pause' ? { ans: { who: 'asha' } } : {}) }, ...w.actions]);
    it(`${name}: reaches Confirm after a fresh check, and Confirm writes ${w.writes} once`, () => {
      let s = begin(start());
      expect(cards(s).some((c: any) => c.acts?.some((a: any) => a.act?.type === 'flow.confirm')), 'a Confirm card').toBe(true);
      expect(rows(s, w.writes)).toHaveLength(0);
      expect(s.audit.some((r) => r.kind === 'fresh_check')).toBe(true);
      s = walk(s, [{ type: 'flow.confirm' }]);
      expect(rows(s, w.writes)).toHaveLength(1);
      const at = (id: string) => s.audit.findIndex((r) => r.id === id);
      expect(at(w.writes)).toBeGreaterThan(s.audit.map((r) => r.kind).lastIndexOf('fresh_check'));
      expect(s.clock).toBe('d4');
      s = walk(s, [{ type: 'event', id: w.writes }]);
      expect(rows(s, w.writes)).toHaveLength(1);
    });
    it(`${name}: Cancel writes nothing`, () => {
      const s0 = start(); let s = begin(s0);
      const before = s.audit.length;
      s = walk(s, [{ type: 'flow.cancel' }]);
      expect(s.audit.length).toBe(before);
      expect(rows(s, w.writes)).toHaveLength(0);
    });
  }
  it('the failed Google check writes its row and changes nothing, then the passkey passes', () => {
    const s = walk(start(), [{ type: 'flow.start', id: 'admin.pause', ans: { who: 'asha' } }, { type: 'flow.answer', key: 'check', v: 'google' }]);
    expect(rows(s, 'e-fresh-fail')).toHaveLength(1);
    expect(owner(s)!.status).toBe('active'); expect(s.audit.some((r) => r.kind === 'admin_pause')).toBe(false);
    const s2 = walk(s, [{ type: 'flow.answer', key: 'check2', v: 'passkey' }]);
    expect(rows(s2, 'e-fresh-2')).toHaveLength(1);
  });
  it('a ceiling above the hard limit is refused with nothing written', () => {
    const s = walk(start(), [{ type: 'flow.start', id: 'admin.ceiling' }, { type: 'flow.answer', key: 'to', v: 220 }]);
    expect(rows(s, 'e-ceiling')).toHaveLength(0);
    expect(s.audit.filter((r) => r.kind === 'admin_ceiling')).toHaveLength(0);
    expect(json(s.chat.history)).toContain('Nothing has changed');
  });
  it('the fresh check is skipped while the last is good, and asked again when it has lapsed', () => {
    let s = walk(start(), [{ type: 'flow.start', id: 'admin.approve' }, { type: 'flow.answer', key: 'check', v: 'passkey' }, { type: 'flow.confirm' }]);
    s = walk(s, [{ type: 'flow.start', id: 'admin.replay' }]);
    expect(cards(s).some((c: any) => c.acts?.length), 'straight to Confirm at 08:29').toBe(true);
    s = walk(s, [{ type: 'flow.cancel' }, { type: 'flow.start', id: 'admin.pause', ans: { who: 'asha' } }]);
    expect(json(cards(s))).toContain('Passkey with Face ID');
  });
  it('pausing Asha signs her out of both devices; restoring her leaves her active', () => {
    let s = walk(start(), [{ type: 'flow.start', id: 'admin.pause', ans: { who: 'asha' } }, { type: 'flow.answer', key: 'check', v: 'passkey' }, { type: 'flow.confirm' }]);
    expect(owner(s)!.status).toBe('paused');
    expect(owner(s)!.devices.filter((d: any) => d.signed_out)).toHaveLength(2);
    expect(rows(s, 'e-pause-asha')[0].summary).toContain('2 sessions');
    s = walk(s, [{ type: 'flow.start', id: 'admin.restore' }, { type: 'flow.answer', key: 'check', v: 'passkey' }, { type: 'flow.confirm' }]);
    expect(rows(s, 'e-restore-asha')).toHaveLength(1);
    expect(owner(s)!.status).toBe('active');
    expect(owner(s)!.devices.some((d: any) => d.signed_out)).toBe(false);
    expect(s.audit.findIndex((r) => r.id === 'e-pause-asha')).toBeLessThan(s.audit.findIndex((r) => r.id === 'e-restore-asha'));
  });
  it('the owner cannot be paused: the flow refuses, and a forged event changes nothing', () => {
    let s = walk(start(), [{ type: 'flow.start', id: 'admin.pause', ans: { who: 'arun' } }]);
    expect(s.audit.some((r) => r.kind === 'admin_pause')).toBe(false);
    expect(json(s.chat.history)).toContain("can't pause your own account");
    s = walk(start(), [{ type: 'event', ev: { id: 'forged', at: '2026-11-06T09:40:00', actor: 'arun', via: 'admin', kind: 'admin_pause', record: 'arun', summary: 'x' } }]);
    expect(s.members.find((m) => m.id === 'arun')!.status).toBe('active');
    const spec = PAGES['admin-person'].build({ ...s, route: { page: 'admin-person', params: { id: 'arun' } } } as DemoState, ctxOf(s));
    expect(json(spec)).not.toMatch(/Pause Arun/);
  });
  it('Asha cannot approve, pause or restore', () => {
    for (const id of ['admin.approve', 'admin.replay', 'admin.ceiling', 'admin.pause', 'admin.restore', 'admin.invite']) {
      const s = walk(start('d4', 'asha'), [{ type: 'flow.start', id, ans: { who: 'asha' } }]);
      expect(s.audit.filter((r) => r.via === 'admin' && r.kind !== 'sign_in')).toHaveLength(0);
      expect(json(s.chat.history), id).toContain("admin's alone");
    }
  });
  it('an invite shows pending on People and on the join page', () => {
    let s = walk(start(), [{ type: 'flow.start', id: 'admin.invite' }, { type: 'flow.answer', key: 'role', v: 'member' }, { type: 'flow.answer', key: 'check', v: 'passkey' }, { type: 'flow.confirm' }]);
    expect(s.audit.filter((r) => r.kind === 'admin_invite')).toHaveLength(1);
    expect(json(PAGES['admin-people'].build({ ...s, route: { page: 'admin-people' } } as DemoState, ctxOf(s)))).toContain('Pending');
    expect(json(PAGES.join.build({ ...s, route: { page: 'join' } } as DemoState, ctxOf(s)))).toContain('Member, your role');
  });
  it('the whole Admin day, in the ledger\'s order', () => {
    const s = walk(start(), [
      { type: 'flow.start', id: 'admin.approve' }, { type: 'flow.answer', key: 'check', v: 'passkey' }, { type: 'flow.confirm' },
      { type: 'flow.start', id: 'admin.replay' }, { type: 'flow.confirm' },
      { type: 'flow.start', id: 'admin.ceiling' }, { type: 'flow.answer', key: 'to', v: 50 }, { type: 'flow.confirm' },
      { type: 'flow.start', id: 'admin.pause', ans: { who: 'asha' } }, { type: 'flow.answer', key: 'check', v: 'google' }, { type: 'flow.answer', key: 'check2', v: 'passkey' }, { type: 'flow.confirm' },
      { type: 'flow.start', id: 'admin.restore' }, { type: 'flow.answer', key: 'check', v: 'passkey' }, { type: 'flow.confirm' },
    ]);
    const ids = s.audit.map((r) => r.id.replace(/^e-fresh-x\d+$/, 'e-fresh-x')).filter((i) => i.startsWith('e-fresh') || /^e-(approve|replay|ceiling|pause|restore)/.test(i));
    expect(ids).toEqual(['e-fresh-1', 'e-approve-cr26', 'e-replay', 'e-ceiling', 'e-fresh-fail', 'e-fresh-2', 'e-pause-asha', 'e-fresh-x', 'e-restore-asha']);
    const adm = s.audit.filter((r) => r.via === 'admin'); expect(adm.map((r) => r.at)).toEqual([...adm.map((r) => r.at)].sort());
    expect(s.time).toBe('10:05');
  });
});

describe('You', () => {
  it('privacy, Face ID, preferences, pause, sign-in and leaving', () => {
    let s = start('d1');
    s = walk(s, [{ type: 'area', area: 'household', name: 'faceid' }]);
    expect(s.settings.arun.face_id_lock.on).toBe(false);
    s = walk(s, [{ type: 'flow.start', id: 'pref.change', ans: { key: 'brief', label: 'Morning brief', from: 'On', to: 'Off' } }]);
    const n = s.audit.length;
    expect(cards(s).some((c: any) => c.acts?.length)).toBe(true);
    s = walk(s, [{ type: 'flow.cancel' }]); expect(s.audit.length).toBe(n);
    s = walk(s, [{ type: 'flow.start', id: 'pref.change', ans: { key: 'brief', label: 'Morning brief', from: 'On', to: 'Off' } }, { type: 'flow.confirm' }]);
    expect(s.audit.length).toBe(n + 1); expect(s.settings.arun.toggles.brief).toBe(false);
    s = walk(s, [{ type: 'flow.start', id: 'pref.change', ans: { key: 'quiet', from: '22:00 to 07:00' } }, { type: 'flow.answer', key: 'to', v: '23:00 to 07:00', label: '23:00 to 07:00' }, { type: 'flow.confirm' }]);
    expect(s.settings.arun.notifications.quiet_hours.from).toBe('23:00');
  });
  it('only the owner pauses MyPaisa; the owner cannot leave; adding a passkey needs a fresh sign-in, no second check', () => {
    const pausePage = (s: DemoState) => json(PAGES['you-pause'].build({ ...s, route: { page: 'you-pause' } } as DemoState, ctxOf(s)));
    expect(pausePage(start('d1', 'arun'))).toContain('Pause MyPaisa');
    expect(pausePage(start('d1', 'asha'))).not.toContain('"k":"btn"');
    expect(json(walk(start('d1'), [{ type: 'flow.start', id: 'you.leave' }]).chat.history)).toContain('only owner');
    let s = walk(start('d1', 'asha'), [{ type: 'flow.start', id: 'signin.add', ans: { id: 'passkey' } }, { type: 'flow.answer', key: 'fresh', v: 'ok' }, { type: 'flow.confirm' }]);
    expect(s.members.find((m) => m.id === 'asha')!.sign_in).toContain('passkey');
    expect(s.audit.some((r) => r.kind === 'fresh_check')).toBe(false);
    s = walk(start('d1', 'asha'), [{ type: 'flow.start', id: 'you.leave' }, { type: 'flow.answer', key: 'apple', v: 'ok' }, { type: 'flow.confirm' }]);
    expect(s.audit.some((r) => r.id === 'e-left-asha')).toBe(true);
    expect(s.branch).toBeTruthy();
  });
  it('setup walks to its end and refusals show their four states', () => {
    let s = start('d1');
    for (const [k, v] of [['ccy', '£ GBP'], ['hold', 'Later'], ['freq', 'Weekly: x'], ['notif', 'Turn on notifications'], ['face', 'Not now']]) s = walk(s, [{ type: 'area', area: 'household', name: 'setup', key: k, v }]);
    expect(json(PAGES.setup.build({ ...s, route: { page: 'setup' } } as DemoState, ctxOf(s)))).toContain("You're set up");
    for (const id of ['nobody', 'removed', 'paused', 'invite']) expect(json(PAGES['signin-refused'].build({ ...s, route: { page: 'signin-refused', params: { id } } } as DemoState, ctxOf(s)))).toBeTruthy();
  });
});
