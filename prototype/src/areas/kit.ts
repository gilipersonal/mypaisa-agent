/* Builders every area uses for its pages and chat cards, so all areas write the same markup (lesson 21: a fix to
   one is a fix to all). Pages: card(), hero(), row(), bar(), p(), kv(), link(), seg(). Chat: ccard(), q-free parts. */
import type { Block, Go, HeroBlock, PagePart, Seg } from '../state/registry';
import type { Action, CardPart, ChatCard, DemoState } from '../state/model';
import { FX, gbp, inr, money, pct, toGbp } from '../lib/format';

export { FX, gbp, inr, money, pct, toGbp };
export const card = (title: string | undefined, right: string | undefined, parts: PagePart[], cls?: string): Block => ({ k: 'card', title, right, parts, cls });
export const hero = (o: Omit<HeroBlock, 'k'>): Block => ({ k: 'hero', ...o });
export const chips = (list: { t: string; act?: Go }[]): Block => ({ k: 'chips', chips: list });
export const p = (t: string, cls = 'mp-ink2'): PagePart => ({ k: 'p', t, cls });
export const kv = (key: string, v: string, money = true): PagePart => ({ k: 'kv', key, v, money });
export const bar = (name: string, v: string, w: string, sub?: string, fill = 'f-blue'): PagePart => ({ k: 'bar', name, v, w, sub, fill });
export const row = (o: Omit<Extract<PagePart, { k: 'row' }>, 'k'>): PagePart => ({ k: 'row', ...o });
export const link = (t: string, act: Go): PagePart => ({ k: 'link', t, act });
export const note = (icon: string, t: string): PagePart => ({ k: 'note', icon, t });
export const sec = (t: string, r?: string): PagePart => ({ k: 'sec', t, r });
export const nav = (page: string, params?: Record<string, string>): Action => ({ type: 'nav', page, params });
export const flow = (id: string, opener?: string): Action[] => [{ type: 'chat', open: true }, { type: 'flow.start', id, opener }];
/** Open a flow from a page: on a compact door the chat is a tab, so go there too. */
export const ask = (s: DemoState, id: string, opener?: string): Action[] =>
  s.door === 'iphone' || (s.door !== 'ipad' && s.door !== 'web') || s.w[s.door] < 600
    ? [{ type: 'nav', page: 'chat' }, { type: 'flow.start', id, opener }]
    : flow(id, opener);
export const seg = (items: string[], on: number, act: (i: number) => Go): Seg[] => items.map((t, i) => ({ t, on: i === on, act: act(i) }));
export const ccySeg = (s: DemoState, web: boolean): Seg[] => seg(web ? ['£ GBP', '₹ INR'] : ['£', '₹'], s.ccy === 'INR' ? 1 : 0, (i) => ({ type: 'ccy', ccy: i ? 'INR' : 'GBP' }));
/** A chat card. */
export const ccard = (o: ChatCard): ChatCard => o;
export const ckv = (key: string, v: string, money = true): CardPart => ({ k: 'kv', key, v, money });
export const cp = (t: string, cls?: string): CardPart => ({ k: 'p', t, cls });
export const cnote = (icon: string, t: string): CardPart => ({ k: 'note', icon, t });
/** A member's share of a record, as the boards write it: "Arun 50% · Asha 50%", or "Asha". */
export function owners(o: [string, number][]): string {
  const name = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
  return o.length === 1 ? name(o[0][0]) : o.map(([m, s]) => `${name(m)} ${s}%`).join(' · ');
}
/** A record's value in its own currency, and in pounds when it is in rupees. */
export function both(v: number, ccy: string): { v: string; v2?: string } {
  return ccy === 'INR' ? { v: inr(v), v2: '≈ ' + gbp(v / FX) } : { v: gbp(v) };
}
export const initials = (name: string) => name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
