/* Shared helpers for the money area (assets, debts, budget, statements). Pure functions of the state. */
import { dayLabel } from '../../lib/format';
import { DAY_ISO } from '../../state/reduce';
import type { Action, Asset, AuditRow, DemoState } from '../../state/model';
import { gbp, inr } from '../kit';

export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The area's own state, read only. */
export const mon = (s: DemoState): any => s.area.money ?? {};
export const money = (v: number, ccy: string) => (ccy === 'INR' ? inr(v) : gbp(v));
/** "15 Jan" */
export const dm = (iso: string) => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}`;
/** "Thu 30 Apr" or, from another year, "Sat 10 Mar 2029" */
export const dl = (iso: string, today = '2026') => dayLabel(iso) + (iso.slice(0, 4) !== today ? ' ' + iso.slice(0, 4) : '');
export const dly = (iso: string) => dayLabel(iso) + ' ' + iso.slice(0, 4);
export const myr = (iso: string) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const today = (s: DemoState) => DAY_ISO[s.clock];
export const nowIso = (s: DemoState) => `${today(s)}T${s.time}:00`;
/** a year as a fraction, for the chart's x axis */
export const yr = (iso: string) => {
  const y = +iso.slice(0, 4), t0 = Date.UTC(y, 0, 1), t1 = Date.UTC(y + 1, 0, 1);
  return y + (Date.parse(iso.slice(0, 10) + 'T00:00:00Z') - t0) / (t1 - t0);
};
export const pc1 = (x: number) => (x * 100).toFixed(1) + '%';
export const NAME = (id: string) => cap(id);
export const POSS = (id: string) => (id === 'arun' ? 'his' : 'her');

/** "Arun", "Asha", "Arun and Asha, half each" */
export function ownerText(o: [string, number][]): string {
  if (o.length === 1) return cap(o[0][0]);
  if (o.length === 2 && o[0][1] === 50) return 'Arun and Asha, half each';
  return o.map(([m, p]) => `${cap(m)} ${p}%`).join(' · ');
}
/** Asha corrects only her own records; Arun, the owner and admin, corrects any. */
export function canEdit(s: DemoState, r: { owners: [string, number][] }): boolean {
  return s.viewer === 'arun' || r.owners.every(([m]) => m === s.viewer);
}
export function whyNot(r: { owners: [string, number][] }): string {
  return r.owners.length === 1
    ? `This is ${cap(r.owners[0][0])}'s record, so only ${cap(r.owners[0][0])} corrects it. Ask in the chat to see what another figure would do.`
    : 'This record is joint, so Arun, the admin, corrects it. Ask in the chat to see what another figure would do.';
}
/** "short money": £400k, ₹10 lakh, ₹1.5 crore */
export function short(v: number, ccy: string): string {
  if (ccy === 'INR') {
    if (v >= 1e7) return '₹' + +(v / 1e7).toFixed(1) + ' crore';
    if (v >= 1e5) return '₹' + +(v / 1e5).toFixed(1) + ' lakh';
    return '₹' + Math.round(v / 1e3) + 'k';
  }
  return v >= 1e6 ? '£' + +(v / 1e6).toFixed(1) + 'm' : '£' + Math.round(v / 1e3) + 'k';
}
export const num = (t: string) => {
  const n = parseFloat(String(t).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/* ---------- the in-place edit's state: one key at a time, in s.area.money.edit ---------- */
export const editOn = (key: string): Action => ({ type: 'area', area: 'money', name: 'edit', key });
export const editOff: Action = { type: 'area', area: 'money', name: 'edit', key: null };
export const editing = (s: DemoState, key: string) => mon(s).edit === key;

/** An illustrative `correction` event for an asset's value (Rule 2: one event, one audit row). */
export function correctionEvent(s: DemoState, a: Asset, after: number): Action {
  const at = nowIso(s);
  const fmt = (v: number) => money(v, a.ccy);
  const ev: AuditRow = {
    id: `ev-corr-${a.id}-${s.audit.length}`, at, actor: s.viewer, via: 'inline_edit', kind: 'correction', record: a.id, field: 'value',
    before: a.value, after, ccy: a.ccy,
    summary: `Correction · ${a.name} · ${fmt(a.value)} → ${fmt(after)}, ${POSS(s.viewer)} estimate · ${cap(s.viewer)} · ${dayLabel(at)} ${at.slice(11, 16)} · in place`,
    run: null, file: null, illustrative: true,
  };
  return { type: 'event', ev };
}
/** The latest correction row written for a record, if any. */
export const lastCorrection = (s: DemoState, id: string): AuditRow | undefined =>
  [...s.audit].reverse().find((r) => r.kind === 'correction' && r.record === id);

/** Two columns only when the sidebar is there and the chat is not a column beside the page (a 720 px page cannot hold two). */
export const twoCols = (s: DemoState, c: { layout: { nav: string; chat: string } }) => c.layout.nav === 'sidebar' && !(s.chatOpen && c.layout.chat === 'column');

/** 4.39%, 6.9%, 8.5%: the rate as the lender writes it */
export const rate = (r: number) => +(r * 100).toFixed(2) + '%';
