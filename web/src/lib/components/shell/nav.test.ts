import { describe, expect, it } from 'vitest';
import { ADMIN, PAGES, TABS, isCurrent, placeOf } from './nav.ts';

describe('the shell places', () => {
	it('finds the page a path belongs to, the Chat tab standing for Home', () => {
		expect(placeOf('/')?.label).toBe('Home');
		expect(placeOf('/chat')?.label).toBe('Home');
		expect(placeOf('/assets/')?.label).toBe('Assets');
		expect(placeOf('/admin')).toBe(ADMIN);
		expect(placeOf('/nowhere')).toBeUndefined();
	});

	it('marks the current tab', () => {
		const [chat, home, activity] = TABS;
		expect(chat && isCurrent(chat, '/chat')).toBe(true);
		expect(chat && isCurrent(chat, '/')).toBe(false);
		expect(home && isCurrent(home, '/')).toBe(true);
		expect(home && isCurrent(home, '/chat')).toBe(false);
		expect(activity && isCurrent(activity, '/activity/run-1')).toBe(true);
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
});
