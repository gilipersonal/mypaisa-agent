import type { DemoState } from '../state/model';
import { AREAS, PAGES, type Suggestion } from '../state/registry';

export function suggestions(s: DemoState): Suggestion[] {
  if (s.chat.active) return [];
  const out: Suggestion[] = [];
  for (const a of AREAS) for (const x of a.suggest?.(s, s.route) ?? []) if (!out.some((y) => y.t === x.t)) out.push(x);
  return out.slice(0, 6);
}
export function placeholder(s: DemoState): string {
  return PAGES[s.route.page]?.meta.ask ?? 'Ask MyPaisa, or tell it something new';
}
