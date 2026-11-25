import { describe, expect, it } from 'vitest';
import { overviewQuery, wealthKeys } from '#lib/api/queries.ts';
import { StubHousehold } from './household.ts';
import { monzoSavings } from './records.ts';
import { StubWealthSource, startsEmpty } from './source.ts';

describe('the stub behind the wealth seam', () => {
	it('answers the overview query from the household as it is now', async () => {
		const h = new StubHousehold();
		const query = overviewQuery(new StubWealthSource(h), 'household', 'GBP');
		expect(query.queryKey).toEqual(['wealth', 'overview', 'household', 'GBP']);
		expect(query.queryKey.slice(0, 1)).toEqual([...wealthKeys.all]);
		expect((await query.queryFn()).hero.net?.amount).toBe('439951');
		h.add(monzoSavings('5000', 'arun'), new Date(), 'added in the chat');
		expect((await query.queryFn()).hero.net?.amount).toBe('444951');
	});

	it('starts empty only when the address asks for it', () => {
		expect(startsEmpty('?stub=empty')).toBe(true);
		expect(startsEmpty('?stub=full')).toBe(false);
		expect(startsEmpty('')).toBe(false);
	});
});
