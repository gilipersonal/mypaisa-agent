import { describe, expect, it } from 'vitest';
import { ADMIN, MORE, MORE_PAGES, PAGES, TABS, isCurrent, placeOf } from './nav.ts';

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
});
