/* What each door's navigation shows, from the registered pages. */
import type { DemoState } from '../state/model';
import { PAGES } from '../state/registry';

export interface NavItem { id: string; label: string; icon: string; on: boolean }
export function rootOf(page: string): string {
  let p = page, guard = 0;
  while (PAGES[p]?.meta.parent && guard++ < 8) p = PAGES[p].meta.parent!;
  return p;
}
export function sideItems(s: DemoState): NavItem[] {
  const root = rootOf(s.route.page);
  return Object.values(PAGES)
    .filter((p) => p.meta.side !== undefined && (!p.meta.adminOnly || s.viewer === 'arun'))
    .sort((a, b) => (a.meta.side ?? 0) - (b.meta.side ?? 0))
    .map((p) => ({ id: p.meta.id, label: p.meta.title, icon: p.meta.icon, on: root === p.meta.id }));
}
const TABS: [string, string, string][] = [['chat', 'Chat', 'chat_bubble'], ['home', 'Home', 'home'], ['activity', 'Activity', 'bolt'], ['you', 'You', 'person']];
export function tabItems(s: DemoState): NavItem[] {
  const root = s.route.page === 'chat' ? 'chat' : rootOf(s.route.page);
  const top = ['home', 'activity', 'you'].includes(root) ? root : root === 'chat' ? 'chat' : tabOf(root);
  return TABS.map(([id, label, icon]) => ({ id, label, icon, on: top === id }));
}
/* on a compact door, Assets, Debts, Budget, Projection and Audit open from Home; the Admin center from You */
function tabOf(root: string): string {
  if (root.startsWith('admin') || root === 'files') return root === 'files' ? 'home' : 'you';
  return 'home';
}
