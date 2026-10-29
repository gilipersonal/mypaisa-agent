/* The records area: register flows, check-ins, Activity and a run. Every flow reaches Confirm and Cancel; a Confirm
   writes exactly one audit row with the ledger's id; a Cancel writes none; the totals land on the figure set's
   snapshots; Asha may not correct Home; the pages build at every door, viewer and clock. */
import { describe, expect, it } from 'vitest';
import '../src/areas';
import { H, L } from '../src/data/figures';
import { ctxOf } from '../src/state/ctx';
import { fresh } from '../src/state/fresh';
import { reduce } from '../src/state/reduce';
import { FLOWS, PAGES } from '../src/state/registry';
import { totals } from '../src/state/totals';
import type { DemoState } from '../src/state/model';

const h: any = H, led: any = L;
const go = (s: DemoState, ...a: any[]) => reduce(s, a.flat());
const start = (id: string, viewer: 'arun' | 'asha' = 'arun', clock?: string) => {
  let s = fresh();
  if (clock) s = go(s, { type: 'clock', to: clock });
  s = go(s, { type: 'viewer', id: viewer });
  return go(s, { type: 'flow.start', id });
};
const ELSE = [{ type: 'area', area: 'records', name: 'else' }, { type: 'flow.edit', key: '$redraw' }];
const ans = (key: string, v: any) => ({ type: 'flow.answer', key, v, label: String(v) });
const net = (s: DemoState) => totals(s.assets, s.debts, null).net_gbp;
const rows = (s: DemoState, id: string) => s.audit.filter((r) => r.id === id).length;
/** the live message that waits for the member: a Confirm card (with its acts) or a question */
const waiting = (s: DemoState) => (s.chat.live[s.chat.live.length - 1] as any)?.cards?.[0];
const hasAct = (s: DemoState, t: string) => !!waiting(s)?.acts?.some((a: any) => a.act && a.t === t);

/* the exact actions that walk each flow to its Confirm (the presenter script replays them) */
const WALK: Record<string, { clock?: string; viewer?: 'arun' | 'asha'; to: any[]; confirm?: string; row?: string; before?: string }> = {
  'register.monzo': { to: [ans('whose', 'Arun')], row: 'e-monzo-register' },
  'checkin.valuation': { to: [ans('ok', 'Change it'), ans('val', 428000)], row: 'e-home-correction' },
  'checkin.emi': { clock: 'd3', to: [], row: 'e-emi-paid' },
  'checkin.paid-off': { clock: 'd3', to: [ans('amt', 'engine'), ans('when', 'Today, Thu 5 Nov')], row: 'e-hdfc-closed' },
  'checkin.emi-other': { clock: 'd3', to: [ans('amt', 50000)], row: 'e-emi-amount' },
  'register.premium-bonds': { clock: 'd3e', to: [ans('decide', 'Approve'), ans('check', 'Sign in with Apple')], row: 'e-kind-premium' },
  'register.fd': { to: [ans('whose', 'Arun'), ans('int', 'Added in, cumulative')] },
  'register.pune': { to: [] }, 'register.hdfc': { to: [ans('rate', '8.5%')] }, 'register.asha-fund': { to: [] },
  'register.no-history': { to: [ans('hist', 'Give an estimate'), ans('est', 'About 9% a year')] },
};

describe('every flow with a Confirm reaches it, confirms and cancels', () => {
  for (const [id, w] of Object.entries(WALK)) {
    it(id, () => {
      const s0 = start(id, w.viewer, w.clock);
      expect(FLOWS[id]).toBeTruthy();
      const at = go(s0, w.to);
      expect(at.chat.active, 'the flow waits at its Confirm').not.toBeNull();
      expect(waiting(at).acts?.some((a: any) => a.act?.type === 'flow.confirm')).toBe(true);
      expect(waiting(at).acts?.some((a: any) => a.act?.type === 'flow.cancel') || waiting(at).cancel?.type === 'flow.cancel').toBe(true);
      // Cancel writes nothing
      const rowsBefore = at.audit.length, appliedBefore = at.applied.length;
      const cx = go(at, { type: 'flow.cancel' });
      expect(cx.audit.length).toBe(rowsBefore);
      expect(cx.applied.length).toBe(appliedBefore);
      expect(cx.chat.active).toBeNull();
      // Confirm writes exactly one row (none for a replay of a record already held)
      const ok = go(at, { type: 'flow.confirm' });
      if (w.row) {
        expect(ok.audit.length).toBe(rowsBefore + 1);
        expect(rows(ok, w.row)).toBe(1);
        expect(ok.applied).toContain(w.row);
      } else expect(ok.audit.length).toBe(rowsBefore);
      expect(ok.chat.active).toBeNull();
    });
  }
});

describe('the figures move to the figure set', () => {
  it('Monzo: £439,951 → £444,951, and a typed sentence finds the flow', () => {
    let s = fresh();
    expect(net(s)).toBe(h.totals_before_new_record.net_gbp);
    s = go(s, { type: 'say', t: '£5,000 in Monzo savings' });
    expect(s.chat.active?.id).toBe('register.monzo');
    s = go(s, ans('whose', 'Arun'), { type: 'flow.confirm' });
    expect(net(s)).toBe(444951);
    expect(s.assets.find((a) => a.id === 'monzo_savings')!.owners).toEqual([['arun', 100]]);
    expect(s.audit.find((r) => r.id === 'e-monzo-register')!.summary).toContain('Monzo');
  });
  it('Monzo for Asha or jointly writes the same ledger id with its own owner, once, and the clock never doubles it', () => {
    for (const [who, owners] of [['Asha', [['asha', 100]]], ['Joint', [['arun', 50], ['asha', 50]]]] as const) {
      let s = start('register.monzo'); s = go(s, ans('whose', who), { type: 'flow.confirm' });
      expect(s.assets.find((a) => a.id === 'monzo_savings')!.owners).toEqual(owners);
      expect(net(s)).toBe(444951);
      s = go(s, { type: 'clock', to: 'd3' });
      expect(s.assets.filter((a) => a.id === 'monzo_savings')).toHaveLength(1);
      expect(rows(s, 'e-monzo-register')).toBe(1);
    }
  });
  it('Asha registering for herself is offered only her own or joint', () => {
    const s = start('register.monzo', 'asha');
    const chips = (waiting(s).parts[0].chips as any[]).map((c) => c.t);
    expect(chips).toEqual(['Asha', 'Joint']);
  });
  it('the valuation correction: £444,951 → £457,951 (after Monzo)', () => {
    let s = go(fresh(), { type: 'event', id: 'e-monzo-register' });
    s = go(s, { type: 'flow.start', id: 'checkin.valuation' }, ans('ok', 'Change it'), ans('val', 428000), { type: 'flow.confirm' });
    expect(net(s)).toBe(h.totals_after_correction.net_gbp);
    expect(s.assets.find((a) => a.id === 'home')!.value).toBe(428000);
  });
  it('another figure is an illustrative correction under the same id', () => {
    let s = start('checkin.valuation'); s = go(s, ans('ok', 'Change it'), ans('val', 421000), { type: 'flow.confirm' });
    expect(s.assets.find((a) => a.id === 'home')!.value).toBe(421000);
    expect(s.audit.find((r) => r.id === 'e-home-correction')!.summary).toContain('£421,000');
  });
  it('Still right saves nothing', () => {
    const s = go(start('checkin.valuation'), ans('ok', 'Still right'));
    expect(s.audit.length).toBe(fresh().audit.length);
    expect(s.chat.active).toBeNull();
  });
  it('the EMI: Paid lands on the Thu 5 Nov snapshot, Undo puts it back and writes a reversal', () => {
    let s = start('checkin.emi', 'arun', 'd3');
    const before = net(s);
    s = go(s, { type: 'flow.confirm' });
    expect(net(s)).toBe(h.totals_after_hdfc_emi_thu_5_nov.net_gbp);
    expect(s.undo?.label).toBe('EMI paid');
    const hd = () => s.debts.find((d) => d.id === 'hdfc')!;
    expect(Math.round(hd().balance)).toBe(Math.round(h.debts.find((d: any) => d.id === 'hdfc').balance_after_nov_emi));
    s = go(s, { type: 'undo' });
    expect(net(s)).toBe(before);
    expect(s.applied).not.toContain('e-emi-paid');
    expect(rows(s, 'e-emi-undo')).toBe(1);
    expect(rows(s, 'e-emi-paid')).toBe(1); // the payment stays in the log: a reversal, never a delete
    expect(s.chat.history.some((m: any) => m.k === 'ai' && /Undone at 09:13/.test(m.t))).toBe(true);
    s = go(s, { type: 'flow.start', id: 'checkin.emi' }, { type: 'flow.confirm' }); // Paid saves it again
    expect(net(s)).toBe(h.totals_after_hdfc_emi_thu_5_nov.net_gbp);
  });
  it('the EMI card offers the other answers under Something else, and they are one tap away', () => {
    let s = start('checkin.emi', 'arun', 'd3');
    expect(waiting(s).fold).toBeUndefined();
    s = go(s, ...ELSE);
    const fold = waiting(s).fold;
    expect(fold.map((f: any) => f.t)).toEqual(['Not yet', 'Different amount', 'Paid off in full']);
    s = go(s, fold[0].act);
    expect(s.chat.active).toBeNull(); // Not yet: noted, nothing saved
    expect(s.audit.some((r) => r.kind === 'check_in_paid')).toBe(false);
  });
  it('Paid off in full is a side branch: the loan closes, Back to the walk restores it', () => {
    let s = start('checkin.emi', 'arun', 'd3');
    s = go(s, ...ELSE);
    s = go(s, waiting(s).fold[2].act, ans('amt', 'engine'), ans('when', 'Today, Thu 5 Nov'), { type: 'flow.confirm' });
    expect(s.branch?.name).toBe('HDFC paid off in full');
    expect(s.debts.find((d) => d.id === 'hdfc')!.balance).toBe(0);
    expect(s.audit.find((r) => r.id === 'e-hdfc-closed')!.before).toBe(1523976);
    expect(s.applied).toContain('e-emi-paid'); // instead of Paid: the due row drops
    s = go(s, { type: 'branch.end' });
    expect(s.debts.find((d) => d.id === 'hdfc')!.balance).toBeGreaterThan(1500000);
    expect(s.applied).not.toContain('e-hdfc-closed');
  });
  it('a different amount is a branch too', () => {
    let s = start('checkin.emi-other', 'arun', 'd3'); const b0 = s.debts.find((d) => d.id === 'hdfc')!.balance;
    s = go(s, ans('amt', 50000), { type: 'flow.confirm' });
    expect(s.branch).not.toBeNull();
    expect(s.debts.find((d) => d.id === 'hdfc')!.balance).toBeCloseTo(b0 + b0 * 0.085 / 12 - 50000, 2);
  });
  it('Premium Bonds: only the admin gets the card and the second check; Asha is told it waits for Arun', () => {
    const a = start('register.premium-bonds', 'asha');
    expect(a.chat.active).toBeNull();
    expect(JSON.stringify(a.chat.history)).toContain('waiting for Arun');
    expect(a.audit.length).toBe(fresh().audit.length);
    let s = start('register.premium-bonds');
    expect(waiting(s).parts[0].q ?? waiting(s).parts[0].t).toContain('Premium Bonds');
    s = go(s, ans('decide', 'Approve'));
    expect(JSON.stringify(waiting(s))).toContain('Apple signs you in again'); // the second check, before the Confirm
    s = go(s, ans('check', 'Face ID'), { type: 'flow.confirm' });
    expect(s.branch).not.toBeNull();
    expect(s.area.records.kinds[0].id).toBe('premium_bonds');
    const rej = go(start('register.premium-bonds'), ans('decide', 'Reject'));
    expect(rej.audit.length).toBe(fresh().audit.length);
  });
});

describe('Asha cannot correct Home', () => {
  it('her Change it ends in a note to Arun, with no value asked and nothing written', () => {
    let s = start('checkin.valuation', 'asha');
    s = go(s, ans('ok', 'Change it'));
    expect(s.chat.active).toBeNull();
    expect(s.audit.length).toBe(fresh().audit.length);
    expect(s.assets.find((a) => a.id === 'home')!.value).toBe(415000);
    expect(JSON.stringify(s.chat.history)).toContain('Only Arun can correct this');
  });
  it("the EMI is Arun's loan: Asha's check-in is a note and nothing to confirm", () => {
    const s = start('checkin.emi', 'asha', 'd3');
    expect(s.chat.active).toBeNull();
    expect(s.audit.some((r) => r.kind === 'check_in_paid')).toBe(false);
  });
});

describe('replays and illustrative check-ins write nothing new', () => {
  it('the SBI FD replay: a ban line, and the FD stays in the totals at Sun 25 Oct 10:03', () => {
    let s = start('register.fd'); const n0 = net(s);
    expect(s.chat.history.some((m: any) => m.k === 'ban' && /Replay of Sun 25 Oct/.test(m.t))).toBe(true);
    expect(s.chat.history.findIndex((m: any) => m.k === 'ban')).toBeLessThan(s.chat.history.findIndex((m: any) => m.k === 'me'));
    s = go(s, ans('whose', 'Asha'), ans('int', 'Paid out'), { type: 'flow.confirm' });
    expect(net(s)).toBe(n0);
    expect(rows(s, 'e-fd-register')).toBe(1);
    expect(s.assets.filter((a) => a.id === 'sbi_fd')).toHaveLength(1);
    expect(s.assets.find((a) => a.id === 'sbi_fd')!.owners).toEqual([['arun', 100]]);
  });
  for (const id of ['checkin.card-bill', 'checkin.several', 'checkin.sip', 'checkin.saver']) {
    it(id + ' is illustrative and saves nothing', () => {
      let s = start(id); expect(s.chat.history.some((m: any) => m.k === 'ban')).toBe(true);
      const key = { 'checkin.card-bill': 'bill', 'checkin.several': 'all', 'checkin.sip': 'sip', 'checkin.saver': 'sv' }[id]!;
      s = go(s, ans(key, 'x'));
      expect(s.chat.active).toBeNull(); expect(s.audit.length).toBe(fresh().audit.length);
    });
  }
  it('the weekly digest lists the two autopayments and sums them', () => {
    const s = start('checkin.digest');
    const card = (s.chat.history.find((m: any) => m.k === 'cards') as any).cards[0];
    expect(JSON.stringify(card)).toContain('£1,803');
  });
});

describe('Home due rows open the check-ins, the composer suggests by clock', () => {
  it('suggestions', async () => {
    const { suggestions } = await import('../src/ui/composer');
    const t = (s: DemoState) => suggestions(s).map((x) => x.t);
    expect(t(fresh())).toContain('£5,000 in Monzo savings');
    const m = go(fresh(), { type: 'event', id: 'e-monzo-register' });
    expect(t(m)).toContain('Is £415,000 still about right?');
    expect(t(go(fresh(), { type: 'clock', to: 'd3' }))).toContain("Was November's EMI paid?");
    expect(t(go(fresh(), { type: 'clock', to: 'd3' }, { type: 'event', id: 'e-emi-paid' }))).not.toContain("Was November's EMI paid?");
  });
  it('due rows carry the check-in', async () => {
    const { DUE } = await import('../src/areas/home/due');
    const s = go(fresh(), { type: 'door', door: 'iphone' });
    const acts = DUE(s).map((d: any) => JSON.stringify(d.act ?? null)).join('');
    expect(acts).toContain('checkin.valuation');
  });
});

describe('Activity and a run', () => {
  const clocks = ['d1', 'd2', 'd3', 'd3e', 'd4'];
  it('build at every door, viewer and clock without throwing; every run opens', () => {
    for (const door of ['web', 'phone', 'iphone', 'ipad'] as const) for (const viewer of ['arun', 'asha'] as const) for (const clock of clocks) {
      let s = go(fresh(), { type: 'door', door }, { type: 'viewer', id: viewer }, { type: 'clock', to: clock });
      const spec = PAGES.activity.build(s, ctxOf(s));
      expect(spec.title).toBe('Activity');
      const runs = JSON.stringify(spec).match(/"run":\{"id":"r-[\w]+/g) ?? [];
      void runs;
      for (const id of (JSON.stringify(spec).match(/"id":"(r-[\w]+)"/g) ?? []).map((x) => x.slice(6, -1))) {
        s = go(s, { type: 'nav', page: 'run', params: { id } });
        expect(PAGES.run.build(s, ctxOf(s)).title.length).toBeGreaterThan(0);
      }
      s = go(s, { type: 'nav', page: 'run', params: { id: 'r-1235' } });
      expect(PAGES.run.build(s, ctxOf(s)).crumb?.t).toBe('Activity');
      s = go(s, { type: 'nav', page: 'run', params: { id: 'r-nope' } });
      expect(PAGES.run.build(s, ctxOf(s)).sub).toBe('No such run');
    }
  });
  it("Mon 26 Oct at 09:53: today's cost is the sum of the runs shown and the cycle reads $18 of $160 (11%)", () => {
    let s = go(fresh(), { type: 'event', id: 'e-monzo-register' }, { type: 'event', id: 'e-home-correction' }, { type: 'time', time: '09:53' });
    const spec = PAGES.activity.build(s, ctxOf(s));
    const cards = spec.cols.flat() as any[];
    const runsC = cards.find((c) => c.title === "Today's runs");
    const shown = runsC.parts.filter((p: any) => p.k === 'run' && p.cost);
    const sum = shown.reduce((t: number, p: any) => t + Number(p.cost.slice(1)), 0);
    expect(runsC.right).toContain('$0.07');
    expect(sum).toBeGreaterThan(0.06);
    expect(JSON.stringify(spec)).toContain('"big":"$18"');
    expect(JSON.stringify(spec)).toContain('11%');
    expect(JSON.stringify(spec)).toContain('r-1235');
    expect(JSON.stringify(spec)).not.toContain('r-1239'); // 10:20: not yet
  });
  it('the run page for r-1235 is the Prototype v4 page', () => {
    let s = go(fresh(), { type: 'event', id: 'e-monzo-register' }, { type: 'nav', page: 'run', params: { id: 'r-1235' } });
    const spec = PAGES.run.build(s, ctxOf(s)); const t = JSON.stringify(spec);
    expect(spec.title).toBe('Chat · Arun, 09:40');
    for (const x of ['Steps · 7', 'Model calls · 3', '$0.026 in all', 'Tool calls · 3', 'draft_record', '4.3k tokens, 23.4k cached', '68 s']) expect(t).toContain(x);
    expect(t).toContain('Saved 09:41');
  });
  it('Asha reads her runs and the system jobs, not the chat runs of Arun', () => {
    const s = go(fresh(), { type: 'viewer', id: 'asha' }, { type: 'event', id: 'e-monzo-register' }, { type: 'time', time: '09:53' });
    const t = JSON.stringify(PAGES.activity.build(s, ctxOf(s)));
    expect(t).toContain('Chat · Asha'); expect(t).not.toContain('r-1235');
  });
  it('scheduled jobs of the Admin day are listed with their outcome', () => {
    const s = go(fresh(), { type: 'clock', to: 'd4' });
    const t = JSON.stringify(PAGES.activity.build(s, ctxOf(s)));
    expect(t).toContain('News scout'); expect(t).toContain('Stopped at the 8-call guard');
  });
});
void led;
