import { describe, expect, it } from 'vitest';
import { RollOnce, isJustNow, rollAt } from './fresh.ts';

const AT = '2026-10-26T09:41:00.000Z';
const plus = (ms: number) => new Date(new Date(AT).getTime() + ms);

describe('a change that has just landed', () => {
	it('is just now for a minute, and never before it happened', () => {
		expect(isJustNow(AT, plus(0))).toBe(true);
		expect(isJustNow(AT, plus(59_999))).toBe(true);
		expect(isJustNow(AT, plus(60_000))).toBe(false);
		expect(isJustNow(AT, plus(-1))).toBe(false);
		expect(isJustNow(undefined, plus(0))).toBe(false);
	});

	it('rolls from the old total to the new one, settling exactly on it', () => {
		expect(rollAt('439951', '444951', 0)).toBe('439951');
		expect(rollAt('439951', '444951', -50)).toBe('439951');
		expect(rollAt('439951', '444951', 450)).toBe('444326');
		expect(rollAt('439951', '444951', 900)).toBe('444951');
		expect(rollAt('439951', '444951.50', 2000)).toBe('444951.50');
	});

	it('rolls once: not again on coming back, and not for a change that is old news', () => {
		const once = new RollOnce();
		expect(once.shouldRoll(undefined, plus(0))).toBe(false);
		expect(once.shouldRoll(AT, plus(500))).toBe(true);
		expect(once.shouldRoll(AT, plus(900))).toBe(false);
		const later = '2026-10-26T09:52:00.000Z';
		expect(once.shouldRoll(later, new Date('2026-10-26T10:30:00.000Z'))).toBe(false);
		expect(once.shouldRoll(later, new Date('2026-10-26T09:52:01.000Z'))).toBe(false);
	});
});
