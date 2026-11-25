import { describe, expect, it } from 'vitest';
import { StubHousehold } from '#lib/stub/household.ts';
import { StubWealthSource } from '#lib/stub/source.ts';
import { provideWealth, useWealth } from './context.ts';

describe('the wealth source', () => {
	it('is provided only inside the shell', () => {
		expect(() => useWealth()).toThrow();
		expect(() => {
			provideWealth(new StubWealthSource(new StubHousehold()));
		}).toThrow();
	});
});
