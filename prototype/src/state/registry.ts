/* The plug-in point. Each area (src/areas/<area>/index.ts) registers its pages, chat flows, event appliers, its own
   actions and its composer suggestions here; nothing else in the app knows an area by name. */
import type { Action, AuditRow, ChatCard, DemoState, DoorId, Route } from './model';
import type { Totals } from './totals';
import type { ChartSpec } from '../lib/chart';

export interface Layout { nav: 'tabs' | 'sidebar'; chat: 'tab' | 'sheet' | 'column'; compact: boolean; w: number; h: number }
export interface PageCtx {
  door: DoorId; layout: Layout; web: boolean; ios: boolean; compact: boolean;
  priv: boolean; asha: boolean; admin: boolean; viewer: string; params: Record<string, string>;
  T: Totals; mp: (t: string) => string; dayLabel: string;
}
export type Go = Action | Action[] | null | undefined;
export interface Seg { t: string; on?: boolean; act?: Go }
export type PagePart =
  | { k: 'kv'; key: string; v: string; money?: boolean }
  | { k: 'p'; t: string; cls?: string }
  | { k: 'note'; icon: string; t: string }
  | { k: 'lock'; t: string }
  | { k: 'sec'; t: string; r?: string }
  | { k: 'bar'; name: string; v: string; w: string; sub?: string; fill?: string }
  | { k: 'stack'; segs: { w: string; c: string }[] }
  | { k: 'row'; name: string; sub?: string; sub2?: string; v?: string; v2?: string; vcls?: string; icon?: string; lead?: string; sw?: string; tags?: { t: string; cls?: string; icon?: string }[]; chev?: boolean; act?: Go; cls?: string; toggle?: boolean; on?: boolean }
  | { k: 'grid'; cells: { key: string; v: string; s?: string; up?: boolean; pen?: boolean; act?: Go }[] }
  | { k: 'due'; a: string; b: string; c: string; today?: boolean; name: string; sub?: string; v?: string; act?: Go }
  | { k: 'tags'; tags: { t: string; cls?: string; icon?: string }[] }
  | { k: 'big'; big: string; sub?: string; pen?: boolean; act?: Go; cls?: string }
  | { k: 'edit'; lbl: string; prefix?: string; suffix?: string; ph?: string; init?: string; note?: string;
      preview?: (v: string) => { before: string; after: string; delta?: string; net?: string } | null;
      save: (v: string) => Go; cancel?: Go }
  | { k: 'ok'; t: string; link?: string; act?: Go }
  | { k: 'chart'; ch: ChartSpec }
  | { k: 'budHead' }
  | { k: 'bud'; name: string; a: string; p: string; w: string; over?: boolean; act?: Go }
  | { k: 'runHead' }
  | { k: 'run'; time: string; name: string; sub?: string; model?: string; tokens?: string; cost?: string; outcome?: string; ocls?: string; act?: Go; cls?: string }
  | { k: 'step'; time: string; l: string; t?: string; lc?: string }
  | { k: 'call'; m: string; cost: string; t?: string }
  | { k: 'tool'; n: string; ms: string }
  | { k: 'meter'; big: string; bsub?: string; w: string; steps?: number[]; label?: string; sub?: string }
  | { k: 'pill'; name: string; sub?: string; icon?: string; v?: string }
  | { k: 'btn'; t: string; icon?: string; act?: Go; cls?: string }
  | { k: 'link'; t: string; act?: Go; cls?: string }
  | { k: 'table'; head: string[]; rows: { cells: string[]; act?: Go; cls?: string }[] };
export interface HeroBlock {
  k: 'hero'; over: string; big: string; unit?: string; right?: string; rightUp?: boolean; seg?: Seg[]; whose?: Seg[];
  deltaUp?: string; deltaT?: string; sub?: string; ch?: ChartSpec; stats?: { key: string; v: string; s?: string }[];
  rate?: string; live?: string; act?: Go;
}
export type Block =
  | HeroBlock
  | { k: 'chips'; chips: { t: string; act?: Go }[] }
  | { k: 'card'; title?: string; right?: string; cls?: string; parts: PagePart[] };
export interface PageSpec {
  title: string; sub?: string; crumb?: { t: string; act?: Go };
  tabs?: Seg[]; ctrls?: { whose?: Seg[]; ccy?: Seg[]; month?: Seg[]; hz?: Seg[]; eye?: boolean; tm?: boolean };
  headChip?: string; banner?: string; colsCls?: string; cols: Block[][]; foot?: string;
}
export interface PageMeta {
  id: string; title: string; icon: string; area: string;
  /** shown in the sidebar (web, iPad), in this order */
  side?: number;
  /** the page a compact door goes back to, and the sidebar item it lights */
  parent?: string | null;
  adminOnly?: boolean; ask?: string;
}
export interface PageDef { meta: PageMeta; build: (s: DemoState, ctx: PageCtx) => PageSpec }

export type Ans = Record<string, any>;
export type Text = string | ((s: DemoState, a: Ans) => string);
export type Beat =
  | { me: Text }
  | { ai: Text; meta?: string; metaIcon?: string }
  | { files: { name: string; meta: string }[]; t?: string }
  | { ask: { key: string; label: string; q: Text; over?: string; chips: { t: string; v?: any }[] | ((s: DemoState, a: Ans) => { t: string; v?: any }[]) }; skip?: (s: DemoState, a: Ans) => boolean }
  | { card: (s: DemoState, a: Ans) => ChatCard; text?: Text }
  | { confirm: (s: DemoState, a: Ans) => ChatCard; onConfirm: (s: DemoState, a: Ans) => Action[]; onCancel?: (s: DemoState, a: Ans) => Action[]; label?: string; done?: (s: DemoState, a: Ans) => string }
  | { act: (s: DemoState, a: Ans) => Action[] }
  | { when: (s: DemoState, a: Ans) => boolean; beats: Beat[] };
export interface Flow {
  id: string; area: string; title: string;
  /** words that start it from the composer (lower case) */
  match?: (string | RegExp)[];
  /** offered (and startable) only when true */
  needs?: (s: DemoState) => boolean;
  /** the user's opening line, shown as a 'me' message when started from a chip */
  opener?: string;
  beats: Beat[];
}
export type Applier = (s: DemoState, ev: AuditRow & { payload?: any }) => void;
export interface Suggestion { t: string; icon: string; act: Go; sug?: boolean }
export interface Area {
  id: string;
  pages?: PageDef[];
  flows?: Flow[];
  /** apply an audit event's change to the records (draft is mutable) */
  appliers?: Record<string, Applier>;
  /** handle the area's own actions: { type: 'area', area: id, name, ... }; mutate the draft */
  reduce?: (s: DemoState, a: Action) => void;
  /** composer chips offered at a route */
  suggest?: (s: DemoState, route: Route) => Suggestion[];
}
export const AREAS: Area[] = [];
export const PAGES: Record<string, PageDef> = {};
export const FLOWS: Record<string, Flow> = {};
export const APPLIERS: Record<string, Applier> = {};
export function register(a: Area): void {
  if (AREAS.some((x) => x.id === a.id)) return;
  AREAS.push(a);
  for (const p of a.pages ?? []) { if (PAGES[p.meta.id]) throw new Error(`page ${p.meta.id} registered twice`); PAGES[p.meta.id] = p; }
  for (const f of a.flows ?? []) { if (FLOWS[f.id]) throw new Error(`flow ${f.id} registered twice`); FLOWS[f.id] = f; }
  for (const [k, fn] of Object.entries(a.appliers ?? {})) { if (APPLIERS[k]) throw new Error(`applier ${k} registered twice`); APPLIERS[k] = fn; }
}
export type { ChatCard };
