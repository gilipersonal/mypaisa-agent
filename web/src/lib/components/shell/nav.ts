/** The shell's places (Shell 1a): the sidebar's pages from 1024 px, and the four tabs under it. A page not built yet
 * opens the shell's "not here yet" page, so the shell is drawn whole from its first story (MA-199). */
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

export const TABS: readonly Place[] = [
	{ href: '/chat', label: 'Chat', icon: 'message-circle', testId: TestIDs.tabChat },
	{ href: '/', label: 'Home', icon: 'house', testId: TestIDs.tabHome },
	{ href: '/activity', label: 'Activity', icon: 'activity', testId: TestIDs.tabActivity },
	{ href: '/you', label: 'You', icon: 'circle-user', testId: TestIDs.tabYou }
];

/** The page a path belongs to; `/chat` stands for Home's page, with the chat as the tab. */
export function placeOf(path: string): Place | undefined {
	const p = path === '/chat' ? '/' : path.replace(/\/+$/, '') || '/';
	return [...PAGES, ADMIN].find((place) => place.href === p);
}

export function isCurrent(place: Place, path: string): boolean {
	if (place.href === '/chat') return path === '/chat';
	if (place.href === '/') return path === '/';
	return path === place.href || path.startsWith(`${String(place.href)}/`);
}
