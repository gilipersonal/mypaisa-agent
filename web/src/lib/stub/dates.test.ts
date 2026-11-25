import { describe, expect, it } from 'vitest';
import { dayLabel, dayParts, monthsBetween, shortDay } from './dates.ts';

describe('dates as the boards write them', () => {
	it('names a calendar day', () => {
		expect(dayParts('2026-10-26')).toEqual({ weekday: 'Mon', day: '26', month: 'Oct', year: '2026' });
		expect(dayParts('2026-11-01T09:00')).toMatchObject({ weekday: 'Sun', day: '1', month: 'Nov' });
		expect(dayLabel('2026-12-14')).toBe('Mon 14 Dec');
		expect(dayLabel('2029-03-10', true)).toBe('Sat 10 Mar 2029');
		expect(shortDay('2026-04-30')).toBe('30 Apr');
	});

	it('counts whole months', () => {
		expect(monthsBetween('2026-10-26', '2029-02-20')).toBe(28);
		expect(monthsBetween('2026-10-26', '2030-07-05')).toBe(45);
		expect(monthsBetween('2026-10-26', '2045-10-01')).toBe(228);
	});

	it('gives empty words for a date that is not one', () => {
		expect(dayParts('')).toMatchObject({ month: 'Jan', day: '1' });
		expect(dayParts('2026-13-40').month).toBe('');
	});
});
