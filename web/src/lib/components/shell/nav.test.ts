import { describe, expect, it } from 'vitest';
import { ADMIN, CHAT_TAB, MORE, MORE_PAGES, PAGES, TABS, isCurrent, isCurrentTab, placeOf } from './nav.ts';

describe('the shell places', () => {
	it('finds the page a path belongs to, the Chat tab standing for Home', () => {
		expect(placeOf('/')?.label).toBe('Home');
		expect(placeOf('/chat')?.label).toBe('Home');
		expect(placeOf('/assets/')?.label).toBe('Assets');
		expect(placeOf('/admin')).toBe(ADMIN);
		expect(placeOf('/more')).toBe(MORE);
		expect(placeOf('/nowhere')).toBeUndefined();
	});

	it('marks the current tab', () => {
		const [chat, home, assets] = TABS;
		expect(chat && isCurrent(chat, '/chat')).toBe(true);
		expect(chat && isCurrent(chat, '/')).toBe(false);
		expect(home && isCurrent(home, '/')).toBe(true);
		expect(home && isCurrent(home, '/chat')).toBe(false);
		expect(assets && isCurrent(assets, '/assets/home')).toBe(true);
		expect(PAGES.map((p) => p.label)).toEqual([
			'Home',
			'Assets',
			'Debts',
			'Budget',
			'Projection',
			'Activity',
			'Audit',
			'You'
		]);
	});

	it('holds Chat, Home, Assets, Projection and More under 1024 px, the other pages under More', () => {
		expect(TABS.map((t) => t.label)).toEqual(['Chat', 'Home', 'Assets', 'Projection', 'More']);
		expect(MORE_PAGES.map((p) => p.label)).toEqual(['Debts', 'Budget', 'Activity', 'Audit', 'You', 'Admin center']);
		expect(isCurrent(MORE, '/more')).toBe(true);
		expect(isCurrent(MORE, '/activity/run-1')).toBe(true);
		expect(isCurrent(MORE, '/admin')).toBe(true);
		expect(isCurrent(MORE, '/assets')).toBe(false);
		expect(isCurrent(MORE, '/')).toBe(false);
	});

	it('opens the chat from the Chat tab as a sheet from 600 px: Chat is never the current tab, and /chat is Home', () => {
		const [chat, home, assets] = TABS;
		expect(chat).toBe(CHAT_TAB);
		expect(CHAT_TAB.href).toBe('/chat');
		expect(home && isCurrentTab(home, '/chat', true)).toBe(true);
		expect(isCurrentTab(CHAT_TAB, '/chat', true)).toBe(false);
		expect(isCurrentTab(CHAT_TAB, '/', true)).toBe(false);
		expect(home && isCurrentTab(home, '/', true)).toBe(true);
		expect(assets && isCurrentTab(assets, '/assets', true)).toBe(true);
		expect(isCurrentTab(MORE, '/budget', true)).toBe(true);
	});

	it('keeps the Chat tab’s page under 600 px', () => {
		const [, home] = TABS;
		expect(isCurrentTab(CHAT_TAB, '/chat', false)).toBe(true);
		expect(home && isCurrentTab(home, '/chat', false)).toBe(false);
		expect(home && isCurrentTab(home, '/', false)).toBe(true);
	});
});
