import { describe, expect, it } from 'vitest';
import {
	changePlanMutation,
	correctProjectionMutation,
	overviewQuery,
	plansQuery,
	projectionQuery,
	wealthKeys
} from '#lib/api/queries.ts';
import { StubHousehold } from './household.ts';
import { monzoSavings } from './records.ts';
import { StubWealthSource, signedInAs, startsEmpty } from './source.ts';

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

	it('answers the Projection query for a horizon, a money and a currency', async () => {
		const query = projectionQuery(new StubWealthSource(new StubHousehold()), 30, 'today', 'INR');
		expect(query.queryKey).toEqual(['wealth', 'projection', 30, 'today', 'INR']);
		expect(query.queryKey.slice(0, 1)).toEqual([...wealthKeys.all]);
		const p = await query.queryFn();
		expect([p.horizon, p.money, p.currency]).toEqual([30, 'today', 'INR']);
		expect(p.fan.max).toBe('380000000');
	});

	it('keeps an admin’s correction with its audit line, and draws the same fan after it', async () => {
		const h = new StubHousehold();
		const source = new StubWealthSource(h, () => new Date('2026-10-26T10:40:00'));
		const before = await source.projection(20, 'nominal', 'GBP');
		const mutation = correctProjectionMutation(source);
		expect(mutation.mutationKey).toEqual(['wealth', 'projection', 'correct']);
		await mutation.mutationFn({ target: 'assumption', id: 'pay_arun', value: '4.8' });
		expect(h.corrections).toHaveLength(1);
		expect(h.corrections[0]).toMatchObject({ id: 'pay_arun', value: '4.8', by: 'arun' });
		const after = await source.projection(20, 'nominal', 'GBP');
		expect(after.assumptions.saved?.audit).toMatch(/^Audit · Arun’s salary growth 4\.17% → 4\.8% · Arun · Mon 26 Oct /);
		expect(after.fan).toEqual(before.fan);
	});

	it('refuses a correction from a member who is not an admin, and one that is no value', async () => {
		const asha = new StubWealthSource(new StubHousehold({ me: 'asha' }));
		await expect(asha.correctProjection({ target: 'plan', id: 'bonus', value: '3.5' })).rejects.toThrow(
			/Only an admin/
		);
		const arun = new StubWealthSource(new StubHousehold());
		await expect(arun.correctProjection({ target: 'plan', id: 'bonus', value: 'more' })).rejects.toThrow(
			/Not a new value/
		);
	});

	it('answers the Plans view, and pauses, resumes and ends a plan for an admin only (MA-222)', async () => {
		const h = new StubHousehold();
		const source = new StubWealthSource(h, () => new Date('2026-10-26T10:40:00'));
		const query = plansQuery(source, 20, 'nominal', 'GBP');
		expect(query.queryKey).toEqual(['wealth', 'plans', 20, 'nominal', 'GBP']);
		expect(query.queryKey.slice(0, 1)).toEqual([...wealthKeys.all]);
		expect((await query.queryFn()).timeline.rows).toHaveLength(3);
		const mutation = changePlanMutation(source);
		expect(mutation.mutationKey).toEqual(['wealth', 'plans', 'change']);
		await mutation.mutationFn({ id: 'car2', action: 'pause' });
		expect((await query.queryFn()).banner?.kind).toBe('pause');
		await source.correctProjection({ target: 'plan', id: 'car2', value: 'Jun 2032', part: 'start' });
		expect((await query.queryFn()).timeline.rows.find((r) => r.id === 'car2')?.sub).toBe('−£25,000 once, Jun 2032');
		const asha = new StubWealthSource(new StubHousehold({ me: 'asha' }));
		await expect(asha.changePlan({ id: 'car2', action: 'end' })).rejects.toThrow(/Only an admin ends/);
	});

	it('opens as another member only when the address asks for it', () => {
		expect(signedInAs('?as=asha')).toBe('asha');
		expect(signedInAs('?stub=empty')).toBeUndefined();
		expect(new StubHousehold({ me: 'asha' }).me).toBe('asha');
		expect(new StubHousehold({ me: 'nobody' }).me).toBe('arun');
		expect(new StubHousehold().me).toBe('arun');
	});

	it('starts empty only when the address asks for it', () => {
		expect(startsEmpty('?stub=empty')).toBe(true);
		expect(startsEmpty('?stub=full')).toBe(false);
		expect(startsEmpty('')).toBe(false);
	});
});
