/* Household area (MA-290): what the Admin center, You and the sign-in pages share. The records are s.admin, s.members
   and s.settings (the ledger's own); what a flow changes is kept in s.admin.live, written only by the appliers. */
import { L } from '../../data/figures';
import { DAY_ISO, ledgerEvent } from '../../state/reduce';
import { dayLabel, hhmm } from '../../lib/format';
import type { Action, ChatCard, DemoState } from '../../state/model';
import type { Ans, Beat } from '../../state/registry';

export const led: any = L;
export const HOUSEHOLD = 'the Dutta household';
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** Read what the flows changed (a page never writes); the appliers write through liveW. */
export const live = (s: any): any => s.admin.live ?? {};
export const liveW = (s: any): any => (s.admin.live ??= {});
export const member = (s: DemoState, id: string): any => s.members.find((m) => m.id === id);
export const nowIso = (s: DemoState) => `${DAY_ISO[s.clock]}T${s.time}:00`;
export const fmt = (at: string) => `${dayLabel(at)} ${hhmm(at)}`;
export const usd = (n: number) => '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
export const addMin = (t: string, n: number) => { const m = +t.slice(0, 2) * 60 + +t.slice(3, 5) + n; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const compactDoor = (s: DemoState) => s.door === 'iphone' || (s.door !== 'ipad' && s.door !== 'web') || s.w[s.door] < 600;
/** Open a flow with answers already given (a page knows which member or which preference it means). */
export const askWith = (s: DemoState, id: string, ans?: Ans, opener?: string): Action[] =>
  [compactDoor(s) ? { type: 'nav', page: 'chat' } : { type: 'chat', open: true }, { type: 'flow.start', id, opener, ans }];
export const lock = (title: string, t: string) => ({ title, sub: 'Only the admin sees this page.', cols: [[{ k: 'card' as const, parts: [{ k: 'lock' as const, t }] }]] });

/* ---------- the second check (a passkey card); good for five minutes ---------- */
export function freshOK(s: DemoState): boolean {
  const last = [...s.audit].reverse().find((r) => r.kind === 'fresh_check');
  if (!last || last.at.slice(0, 10) !== DAY_ISO[s.clock]) return false;
  const t = hhmm(last.at);
  return s.time >= t && s.time <= addMin(t, 5);
}
const eventOrCopy = (s: DemoState, id: string, patch: Record<string, any> = {}): Action => {
  const ev: any = ledgerEvent(id);
  if (ev && !s.applied.includes(id) && !patch.force) return { type: 'event', id };
  const n = s.audit.filter((r) => r.id.startsWith(id)).length + 1;
  return { type: 'event', ev: { ...ev, ...patch, id: `${id}-x${n}`, at: nowIso(s), illustrative: true, run: null, file: null } };
};
export const evOrCopy = eventOrCopy;
/** The ledger's own check if its time is just ahead (within five minutes), else one of the same shape at the clock's time. */
export function freshEvent(s: DemoState): Action {
  for (const id of ['e-fresh-1', 'e-fresh-2']) {
    const ev: any = ledgerEvent(id);
    if (!s.applied.includes(id) && ev.at >= nowIso(s) && hhmm(ev.at) <= addMin(s.time, 5)) return { type: 'event', id };
  }
  const n = s.audit.filter((r) => r.kind === 'fresh_check').length + 1;
  return { type: 'event', ev: { id: `e-fresh-x${n}`, at: nowIso(s), actor: 'arun', via: 'admin', kind: 'fresh_check', summary: `Fresh check with passkey · good until ${addMin(s.time, 5)} · Arun · ${fmt(nowIso(s))} · Passed`, illustrative: true } };
}
function failEvent(s: DemoState): Action {
  if (!s.applied.includes('e-fresh-fail')) return { type: 'event', id: 'e-fresh-fail' };
  const n = s.audit.filter((r) => r.kind === 'fresh_check_failed').length + 1;
  return { type: 'event', ev: { id: `e-fresh-fail-x${n}`, at: nowIso(s), actor: 'arun', via: 'admin', kind: 'fresh_check_failed', summary: `Fresh check with Google · Google signed in s•••@gmail.com, not your account. Nothing was changed. · Arun · ${fmt(nowIso(s))} · Failed`, illustrative: true } };
}
/** Move the day to Fri 6 Nov (replaying the household's events on the way) and the time to at least `t`. */
export const startAt = (t: string): Beat => ({ act: (s) => [{ type: 'clock', to: 'd4' }, ...(s.clock !== 'd4' || s.time < t ? [{ type: 'time', time: t }] : [])] });
const passkeyChips = [{ t: 'Passkey with Face ID', v: 'passkey' }];
/** The fresh check: skipped while the last one is good; `google` adds the failed side branch (e-fresh-fail, 09:36), used by the pause. */
export const checkBeats = (google = false): Beat[] => [
  { ask: { key: 'check', label: 'Second check', over: "Check it's you", q: "This changes the household's settings, so I need a fresh check first: your passkey, under Face ID.", chips: google ? [...passkeyChips, { t: 'Google', v: 'google' }] : passkeyChips }, skip: (s, a) => a.check === undefined && freshOK(s) },
  { act: (s, a) => (a.check === 'google' ? [failEvent(s)] : a.check === 'passkey' ? [freshEvent(s)] : []) },
  { ask: { key: 'check2', label: 'Second check', over: "Check it's you", q: 'Google signed in s•••@gmail.com, not your account. Nothing was changed. Use your passkey instead.', chips: passkeyChips }, skip: (s, a) => a.check !== 'google' },
  { act: (s, a) => (a.check === 'google' && a.check2 ? [freshEvent(s)] : []) },
  { ai: (s) => { const f = [...s.audit].reverse().find((r) => r.kind === 'fresh_check'); return f ? `Checked: passkey, Face ID, ${hhmm(f.at)}. Good until ${addMin(hhmm(f.at), 5)}.` : 'Checked.'; }, meta: 'Fresh check passed', metaIcon: 'passkey' },
];
/** Owner only: a member's chat gets a plain refusal, the owner's beats run. */
export const ownerOnly = (beats: Beat[]): Beat[] => [
  { when: (s) => s.viewer !== 'arun', beats: [{ ai: "That is the admin's alone. Only Arun, the household's owner, can do it; I have changed nothing." }] },
  { when: (s) => s.viewer === 'arun', beats },
];
export const confirmCard = (c: ChatCard): ChatCard => ({ chip: 'Admin change', chipIcon: 'admin_panel_settings', ...c });

/* ---------- the appliers' effect, read back by the pages ---------- */
export function spendView(s: DemoState) {
  const sp = led.admin.spend, d4 = s.clock === 'd4';
  const snap = sp.snapshots[0];
  const ceiling = live(s).ceiling ?? (d4 ? sp.prod.ceiling_usd : snap.ceiling_usd);
  const spent = d4 ? sp.prod.spent_usd : snap.spent_usd;
  const pctN = (spent / ceiling) * 100;
  const steps = sp.ladder.map((l: any) => ({ ...l, usd: (l.pct * ceiling) / 100 }));
  const step = pctN >= 100 ? sp.ladder[3].name : pctN >= 95 ? sp.ladder[2].name : pctN >= 85 ? sp.ladder[1].name : pctN >= 70 ? sp.ladder[0].name : 'Normal, under 70%';
  const renew = d4 ? '2026-12-03' : '2026-11-03';
  const days = Math.round((Date.parse(renew) - Date.parse(DAY_ISO[s.clock])) / 864e5);
  return { sp, d4, ceiling, spent, pctN, steps, step, renew, days, gbp: (u: number) => Math.round(u / sp.usd_per_gbp), share: (60 * ceiling) / 100, daily: (3 * ceiling) / 30 };
}
export function adminView(s: DemoState) {
  const d4 = s.clock === 'd4', lv = live(s), at = nowIso(s);
  const shown = (led.admin.alerts.rows as any[]).filter((r) => r.at <= at);
  const dl = (led.admin.dead_letters as any[])[0];
  const replayed = !!lv.replayed || s.applied.includes('e-replay');
  const approved = s.applied.includes('e-approve-cr26');
  const waiting = d4 && at >= '2026-11-06T06:40:00' && !approved;
  const failedWork = d4 && at >= dl.since && !replayed ? dl.count : 0;
  return { d4, lv, shown, dl, replayed, approved, waiting, failedWork, needs: (waiting ? 1 : 0) + failedWork + (d4 && at >= '2026-11-06T06:12:00' ? 1 : 0) };
}
