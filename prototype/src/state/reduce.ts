/* One pure reducer. Each action returns a new state (a structured clone, then mutated), so jumping to a step is a
   replay from reset and a side branch can keep its base. The chat engine lives here too: a flow's beats run until
   one waits for the member (a question or a Confirm); the live messages are rendered from the beats and answers, and
   frozen into the history when the flow ends. */
import { L } from '../data/figures';
import { dayLabel, hhmm } from '../lib/format';
import type { Action, ActiveFlow, AuditRow, ChatCard, ChatMsg, DemoState, Run } from './model';
import { APPLIERS, AREAS, FLOWS, type Ans, type Beat, type Flow } from './registry';
import { fresh } from './fresh';

const led: any = L;
const DAY_OF: Record<string, string> = { d0: '2026-10-25', d1: '2026-10-26', d2: '2026-11-01', d3: '2026-11-05', d3e: '2026-11-05', d4: '2026-11-06' };
const CLOCKS = ['d0', 'd1', 'd2', 'd3', 'd3e', 'd4'] as const;
export const NOPE = 'Drawn, but not part of this demo yet.';

const BR_EVENTS: any[] = (led.branches ?? []).flatMap((b: any) => b.events ?? []);
const BR_RUNS: any[] = (led.branches ?? []).flatMap((b: any) => b.runs ?? []);
/** A ledger event by id: the household's canonical ones, then the side branches'. */
export function ledgerEvent(id: string): (AuditRow & { payload?: any }) | undefined {
  return (led.events ?? []).find((e: any) => e.id === id) ?? BR_EVENTS.find((e: any) => e.id === id);
}
export function ledgerRun(id: string): Run | undefined {
  return (led.runs ?? []).find((r: any) => r.id === id) ?? BR_RUNS.find((r: any) => r.id === id);
}

export function reduce(s0: DemoState, a: Action | Action[]): DemoState {
  const list = Array.isArray(a) ? a : [a];
  let s = structuredClone($unwrap(s0));
  for (const x of list) s = step(s, x);
  return s;
}
/* Svelte's $state proxies cannot be structured-cloned; the store passes a snapshot, tests pass plain objects. */
function $unwrap<T>(x: T): T { return x; }

function step(s: DemoState, a: Action): DemoState {
  s.seq++;
  switch (a.type) {
    case 'reset': return fresh({ door: s.door, w: s.w, theme: s.theme, presenter: s.presenter });
    case 'set': Object.assign(s, a.patch); return s;
    case 'door': s.door = a.door; if (a.door === 'iphone' || (s.w[a.door as keyof typeof s.w] ?? 1440) < 600) s.chatOpen = false; return s;
    case 'width': s.w = { ...s.w, [a.door ?? s.door]: a.w }; return s;
    case 'theme': s.theme = a.theme ?? (s.theme === 'dark' ? 'light' : 'dark'); return s;
    case 'priv': s.priv = a.on ?? !s.priv; return s;
    case 'ccy': s.ccy = a.ccy ?? (s.ccy === 'GBP' ? 'INR' : 'GBP'); return s;
    case 'todaysMoney': s.todaysMoney = a.on ?? !s.todaysMoney; return s;
    case 'viewer': s.viewer = a.id; if (a.id !== 'arun' && s.route.page.startsWith('admin')) s.route = { page: 'home' }; return s;
    case 'nav':
      if (s.route.page !== a.page || JSON.stringify(s.route.params ?? {}) !== JSON.stringify(a.params ?? {})) s.history = [...s.history.slice(-20), s.route];
      s.route = { page: a.page, params: a.params }; if (a.page !== 'chat') s.chatOpen = a.chat ?? s.chatOpen; return s;
    case 'back': { const prev = s.history.pop(); if (prev) s.route = prev; return s; }
    case 'chat': s.chatOpen = a.open ?? !s.chatOpen; return s;
    case 'signIn':
      s.signedIn = true; s.viewer = a.as ?? s.viewer;
      if (a.event !== false) s = applyEvent(s, a.event ?? { id: 'signin-' + s.viewer, at: DAY_OF[s.clock] + 'T' + s.time, actor: s.viewer, via: 'sign_in', kind: 'sign_in', summary: `${cap(s.viewer)} signed in with ${a.method ?? 'Apple'}`, illustrative: true }, true);
      if (!s.chat.history.length) s.chat.history.push({ k: 'sep', t: dayLabel(DAY_OF[s.clock]) });
      s.route = { page: a.page ?? 'home' }; s.history = [];
      return s;
    case 'signOut': s.signedIn = false; s.route = { page: 'signin' }; s.chatOpen = false; return s;
    case 'clock': return advanceClock(s, a.to, a.time);
    case 'time': s.time = a.time; return s;
    case 'event': {
      const ev = a.ev ?? ledgerEvent(a.id);
      if (!ev) { s.toast = { t: `No event ${a.id} in the ledger`, at: s.seq }; return s; }
      return applyEvent(s, { ...ev, ...(a.with ?? {}) }, a.quiet);
    }
    case 'unapply': return unapply(s, a.id);
    case 'toast': s.toast = { t: a.t, at: s.seq }; return s;
    case 'nope': s.toast = { t: a.t ?? NOPE, at: s.seq }; return s;
    case 'undo': { const u = s.undo; s.undo = null; if (u) for (const x of u.acts) s = step(s, x); return s; }
    case 'undoable': s.undo = { label: a.label, acts: a.acts }; return s;
    case 'branch.start':
      if (!s.branch) { const { branch: _b, ...base } = s; s.branch = { name: a.name, base: structuredClone(base) }; }
      return s;
    case 'branch.end': {
      if (!s.branch) return s;
      const base = s.branch.base as DemoState;
      return { ...base, branch: null, door: s.door, w: s.w, theme: s.theme, presenter: s.presenter, seq: s.seq, toast: { t: 'Back to the walk: the side branch is undone.', at: s.seq } };
    }
    case 'type': s.chat.typed = a.t; return s;
    case 'attach': s.chat.pendingFiles = a.files ?? []; return s;
    case 'say': return say(s, a.t ?? s.chat.typed);
    case 'flow.start': return startFlow(s, a.id, a.opener, a.ans);
    case 'flow.answer': {
      const act = s.chat.active; if (!act) return s;
      act.ans[a.key] = a.v; act.ans[a.key + '$t'] = a.label ?? String(a.v);
      return advance(s);
    }
    case 'flow.edit': { const act = s.chat.active; if (!act) return s; delete act.ans[a.key]; act.i = Math.min(act.i, a.i ?? act.i); return advance(s); }
    case 'flow.confirm': {
      const act = s.chat.active; if (!act) return s;
      const flow = FLOWS[act.id]; const beat = flat(flow, s, act.ans)[act.i] as any;
      if (!beat || !('confirm' in beat)) return s;
      act.confirmedAt = s.time;
      act.ans['$confirmed' + act.i] = true;
      for (const x of beat.onConfirm(s, act.ans)) s = step(s, x);
      const a2 = s.chat.active; if (a2) { a2.i++; }
      return advance(s);
    }
    case 'flow.cancel': {
      const act = s.chat.active; if (!act) return s;
      const flow = FLOWS[act.id]; const beat = flat(flow, s, act.ans)[act.i] as any;
      act.cancelled = true;
      if (beat && 'confirm' in beat && beat.onCancel) for (const x of beat.onCancel(s, act.ans)) s = step(s, x);
      return finish(s);
    }
    case 'area': {
      const ar = AREAS.find((x) => x.id === a.area);
      ar?.reduce?.(s, a);
      return s;
    }
    case 'presenter': Object.assign(s.presenter, a.patch); return s;
    default: return s;
  }
}
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- events: the one write path ---------- */
export function applyEvent(s: DemoState, ev: AuditRow & { payload?: any }, quiet = false): DemoState {
  if (s.applied.includes(ev.id)) return s;
  const fn = APPLIERS[ev.kind];
  fn?.(s, ev);
  s.applied.push(ev.id);
  if (ev.at) { s.time = hhmm(ev.at); const d = (ev.day as string) ?? clockOf(ev.at); if (d && CLOCKS.indexOf(d as any) > CLOCKS.indexOf(s.clock)) setClock(s, d as any); }
  const { payload: _p, ...row } = ev;
  s.audit.push(row as AuditRow);
  if (ev.run && !s.runs.some((r) => r.id === ev.run)) {
    const r = ledgerRun(ev.run);
    if (r) s.runs.push(structuredClone(r));
  }
  if (ev.file && !s.files.some((f) => f.id === ev.file)) {
    const f = (led.files ?? []).find((x: any) => x.id === ev.file);
    if (f) s.files.push(structuredClone(f));
  }
  return s;
}
function unapply(s: DemoState, id: string): DemoState {
  const i = s.applied.indexOf(id); if (i < 0) return s;
  const ev = s.audit.find((r) => r.id === id);
  const fn = ev && APPLIERS[ev.kind + ':undo'];
  if (ev && fn) fn(s, ev);
  s.applied.splice(i, 1);
  return s;
}
function clockOf(at: string): string | undefined {
  const d = at.slice(0, 10), t = at.slice(11, 16);
  if (d === DAY_OF.d0) return 'd0'; if (d === DAY_OF.d1) return 'd1'; if (d === DAY_OF.d2) return 'd2';
  if (d === DAY_OF.d3) return t >= '17:00' ? 'd3e' : 'd3'; if (d === DAY_OF.d4) return 'd4';
  return undefined;
}
function setClock(s: DemoState, to: (typeof CLOCKS)[number]) {
  if (s.clock === to) return;
  s.clock = to;
  s.chat.history.push({ k: 'sep', t: dayLabel(DAY_OF[to]) + (to === 'd3e' ? ', evening' : '') });
}
/** Moving the clock forward applies the household's canonical events in between, at their own times (lesson 19). */
function advanceClock(s: DemoState, to: (typeof CLOCKS)[number], time?: string): DemoState {
  const ti = CLOCKS.indexOf(to); if (ti <= CLOCKS.indexOf(s.clock)) { if (time) s.time = time; return s; }
  for (const ev of (led.events ?? []) as any[]) {
    const d = ev.day ?? clockOf(ev.at);
    if (CLOCKS.indexOf(d) < ti && !s.applied.includes(ev.id) && !String(ev.kind).startsWith('admin') && !String(ev.kind).startsWith('fresh_check') && ev.kind !== 'sign_in') s = applyEvent(s, ev, true);
  }
  setClock(s, to); s.time = time ?? START_TIME[to];
  return s;
}

/* ---------- the chat engine ---------- */
function flat(flow: Flow, s: DemoState, ans: Ans): Beat[] {
  const out: Beat[] = [];
  const walk = (bs: Beat[]) => { for (const b of bs) { if ('when' in b) { if (b.when(s, ans)) walk(b.beats); } else out.push(b); } };
  walk(flow.beats);
  return out;
}
const txt = (t: any, s: DemoState, a: Ans): string => (typeof t === 'function' ? t(s, a) : t);

function startFlow(s: DemoState, id: string, opener?: string, ans?: Ans): DemoState {
  const flow = FLOWS[id];
  if (!flow) { s.toast = { t: NOPE, at: s.seq }; return s; }
  if (s.chat.active) s = finish(s, true);
  if (opener ?? flow.opener) s.chat.history.push({ k: 'me', t: opener ?? flow.opener! });
  s.chat.active = { id, i: 0, ans: { ...(ans ?? {}) }, done: false, cancelled: false, startedAt: s.time };
  s.chat.typed = '';
  return advance(s);
}
function advance(s: DemoState): DemoState {
  let guard = 0;
  while (s.chat.active && guard++ < 200) {
    const act = s.chat.active; const flow = FLOWS[act.id]; const bs = flat(flow, s, act.ans);
    if (act.i >= bs.length) return finish(s);
    const b = bs[act.i] as any;
    if ('ask' in b) {
      if (b.skip?.(s, act.ans)) { act.i++; continue; }
      if (act.ans[b.ask.key] === undefined) break;
      act.i++; continue;
    }
    if ('confirm' in b) { if (!act.ans['$confirmed' + act.i]) break; act.i++; continue; }
    if ('act' in b) { const acts = b.act(s, act.ans); act.i++; for (const x of acts) s = step(s, x); continue; }
    act.i++;
  }
  render(s);
  return s;
}
function finish(s: DemoState, interrupted = false): DemoState {
  const act = s.chat.active; if (!act) return s;
  act.done = true;
  render(s, true);
  s.chat.history.push(...s.chat.live);
  if (interrupted && !act.cancelled) s.chat.history.push({ k: 'ai', t: 'Left there. Nothing was saved from it.' });
  s.chat.live = []; s.chat.active = null;
  return s;
}
/** Render the live flow's messages from its beats and answers. `frozen` drops every button. */
function render(s: DemoState, frozen = false): void {
  const act = s.chat.active; if (!act) { s.chat.live = []; return; }
  const flow = FLOWS[act.id]; const bs = flat(flow, s, act.ans); const out: ChatMsg[] = [];
  const cancel = frozen || act.cancelled ? null : { type: 'flow.cancel' };
  const upto = Math.min(act.i, bs.length - 1);
  for (let j = 0; j <= upto; j++) {
    const b = bs[j] as any;
    if ('me' in b) out.push({ k: 'me', t: txt(b.me, s, act.ans) });
    else if ('ai' in b) out.push({ k: 'ai', t: txt(b.ai, s, act.ans), meta: b.meta, metaIcon: b.metaIcon });
    else if ('files' in b) out.push({ k: 'meF', t: b.t ?? '', files: b.files });
    else if ('card' in b) out.push({ k: 'cards', t: b.text ? txt(b.text, s, act.ans) : undefined, cards: [b.card(s, act.ans)] });
    else if ('ask' in b) {
      if (b.skip?.(s, act.ans)) continue;
      const answered = act.ans[b.ask.key] !== undefined;
      const card: ChatCard = answered
        ? { over: b.ask.over, parts: [{ k: 'done', key: b.ask.label, v: act.ans[b.ask.key + '$t'] }] }
        : {
            over: b.ask.over, cancel,
            parts: [{ k: 'q', t: txt(b.ask.q, s, act.ans), chips: (typeof b.ask.chips === 'function' ? b.ask.chips(s, act.ans) : b.ask.chips).map((c: any) => ({ t: c.t, act: frozen ? undefined : { type: 'flow.answer', key: b.ask.key, v: c.v ?? c.t, label: c.t } })) }],
          };
      out.push({ k: 'cards', cards: [card] });
    } else if ('confirm' in b) {
      const card = b.confirm(s, act.ans) as ChatCard;
      const confirmed = !!act.ans['$confirmed' + j];
      if (confirmed) {
        out.push({ k: 'cards', cards: [{ ...card, ok: true, cancel: null, acts: [], foot: b.done ? b.done(s, act.ans) : 'Saved. One row in the audit log.', footIcon: 'history', at: act.confirmedAt }] });
      } else if (act.cancelled) {
        out.push({ k: 'cards', cards: [{ ...card, cancel: null, acts: [], foot: 'Cancelled. Nothing was saved.', footIcon: 'block' }] });
      } else {
        out.push({ k: 'cards', cards: [{ ...card, cancel, acts: frozen ? [] : card.acts ?? [
          { t: b.label ?? 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } },
          { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } },
        ] }] });
      }
    }
  }
  s.chat.live = out;
}

/* ---------- typed text ---------- */
function say(s: DemoState, t: string): DemoState {
  const text = (t ?? '').trim();
  if (!text && !s.chat.pendingFiles.length) return s;
  const lc = text.toLowerCase();
  const flow = Object.values(FLOWS).find((f) => (!f.needs || f.needs(s)) && (f.match ?? []).some((m) => (typeof m === 'string' ? lc.includes(m) : m.test(lc))));
  if (flow) return startFlow(s, flow.id, text || undefined);
  if (text) s.chat.history.push({ k: 'me', t: text });
  s.chat.history.push({ k: 'ai', t: 'In this demo I answer through the flows on the chips above the composer: try one of them, or type "help" to see them all.', meta: 'Illustrative · no model called', metaIcon: 'info' });
  s.chat.typed = '';
  return s;
}

export const CLOCK_LIST = CLOCKS;
export const START_TIME: Record<string, string> = { d0: '10:00', d1: '09:40', d2: '08:30', d3: '09:00', d3e: '20:40', d4: '08:25' };
export const DAY_ISO = DAY_OF;
export type { ActiveFlow };
