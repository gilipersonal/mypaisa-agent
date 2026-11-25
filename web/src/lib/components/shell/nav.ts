/** The shell's places (Shell 1a): the sidebar's pages from 1024 px, and the five tabs under it: Chat, Home, Assets,
 * Projection and More, with the other pages a tap away under More (Arun, 5 Nov 2026, MA-334). From 600 px the Chat tab
 * opens the chat as a sheet over the page it is on; under 600 px it is the chat's own page (MA-357). A page not built
 * yet opens the shell's "not here yet" page, so the shell is drawn whole from its first story (MA-199). */
import type { PathnameWithSearchOrHash as Pathname } from '$app/types';
import { TestIDs, type TestID } from '#lib/test-ids.ts';

export interface Place {
	href: Pathname;
	label: string;
	icon: string;
	testId?: TestID;
}

export const PAGES: readonly Place[] = [
	{ href: '/', label: 'Home', icon: 'house' },
	{ href: '/assets', label: 'Assets', icon: 'wallet' },
	{ href: '/debts', label: 'Debts', icon: 'landmark' },
	{ href: '/budget', label: 'Budget', icon: 'chart-pie' },
	{ href: '/projection', label: 'Projection', icon: 'trending-up' },
	{ href: '/activity', label: 'Activity', icon: 'activity' },
	{ href: '/audit', label: 'Audit', icon: 'clipboard-check' },
	{ href: '/you', label: 'You', icon: 'circle-user' }
];

export const ADMIN: Place = { href: '/admin', label: 'Admin center', icon: 'shield' };

export const MORE: Place = { href: '/more', label: 'More', icon: 'menu', testId: TestIDs.tabMore };

/** The Chat tab: the chat's page under 600 px, the sheet's opener from 600 px. */
export const CHAT_TAB: Place = { href: '/chat', label: 'Chat', icon: 'message-circle', testId: TestIDs.tabChat };

export const TABS: readonly Place[] = [
	CHAT_TAB,
	{ href: '/', label: 'Home', icon: 'house', testId: TestIDs.tabHome },
	{ href: '/assets', label: 'Assets', icon: 'wallet', testId: TestIDs.tabAssets },
	{ href: '/projection', label: 'Projection', icon: 'trending-up', testId: TestIDs.tabProjection },
	MORE
];

/** What More lists: every page that has no tab of its own, the Admin center last. */
export const MORE_PAGES: readonly Place[] = [...PAGES.filter((p) => !TABS.some((t) => t.href === p.href)), ADMIN];

/** The page a path belongs to; `/chat` stands for Home's page, with the chat as the tab. */
export function placeOf(path: string): Place | undefined {
	const p = path === '/chat' ? '/' : path.replace(/\/+$/, '') || '/';
	return [...PAGES, ADMIN, MORE].find((place) => place.href === p);
}

export function isCurrent(place: Place, path: string): boolean {
	if (place.href === '/chat') return path === '/chat';
	if (place.href === '/') return path === '/';
	// More is current on its own page and on every page it lists.
	if (place === MORE) return path === MORE.href || MORE_PAGES.some((p) => isCurrent(p, path));
	return path === place.href || path.startsWith(`${String(place.href)}/`);
}

/** The tab that is current when the Chat tab opens a sheet (from 600 px) rather than a page: Chat never is, and its
 * address, `/chat`, shows Home with the sheet over it, so Home is. Under 600 px it is `isCurrent`. */
export function isCurrentTab(tab: Place, path: string, chatIsSheet: boolean): boolean {
	if (!chatIsSheet) return isCurrent(tab, path);
	if (tab === CHAT_TAB) return false;
	return isCurrent(tab, path === '/chat' ? '/' : path);
}
