import { describe, expect, it } from 'vitest';
import { StubHousehold, type StubAsset } from './household.ts';
import { HOUSEHOLD, largestRemainder, liquidityOf, toGbp, totals, weight } from './sums.ts';

const MONZO: StubAsset = {
	id: 'monzo_savings',
	kind: 'savings_account',
	name: 'Instant access savings · Monzo',
	country: 'UK',
	ccy: 'GBP',
	owners: [['arun', 100]],
	value: 5000,
	liquidity: 'liquid'
};

describe('the stub household’s sums match the figure set', () => {
	it('before the first record: £439,951 across 20 records', () => {
		const t = totals(new StubHousehold(), HOUSEHOLD);
		expect(t).toMatchObject({ own: 686694, owe: 246743, net: 439951, uk: 333468, ind: 106483 });
		expect(t.members.map((m) => [m.name, m.net])).toEqual([
			['Arun', 245868],
			['Asha', 194083]
		]);
		expect(t).toMatchObject({ liquid: 32596, fixed: 23670, locked: 630428, nLiquid: 8, nFixed: 4 });
		expect(t.nAssets + t.nDebts).toBe(20);
		expect(t.indInr).toBe(11979306);
	});

	it('after it: £444,951, and every card’s figure has moved', () => {
		const h = new StubHousehold();
		h.add(MONZO, new Date(), 'added in the chat');
		const t = totals(h, HOUSEHOLD);
		expect(t).toMatchObject({ own: 691694, owe: 246743, net: 444951, uk: 338468, ind: 106483 });
		expect(t.members.map((m) => m.net)).toEqual([250868, 194083]);
		expect(t).toMatchObject({ liquid: 37596, fixed: 23670, locked: 630428, nLiquid: 9 });
	});

	it('a member’s view takes their share of each record, and agrees with the household’s split', () => {
		const h = new StubHousehold();
		const arun = totals(h, 'arun');
		const asha = totals(h, 'asha');
		expect(arun.net).toBe(245868);
		expect(asha.net).toBe(194083);
		expect(asha.own - asha.owe).toBe(asha.net);
		expect(arun.members).toEqual([]);
		expect(arun.uk + arun.ind).toBe(arun.net);
		expect(asha.liquid + asha.fixed + asha.locked).toBe(asha.own);
		expect(asha.nDebts).toBe(1);
	});

	it('an empty household sums to nothing', () => {
		expect(totals(new StubHousehold({ empty: true }), HOUSEHOLD)).toMatchObject({ own: 0, owe: 0, net: 0, nAssets: 0 });
	});
});

describe('the helpers', () => {
	it('converts rupees at the one rate and leaves pounds alone', () => {
		expect(toGbp(11000000, 'INR', 112.5)).toBeCloseTo(97777.78, 2);
		expect(toGbp(415000, 'GBP', 112.5)).toBe(415000);
	});

	it('weighs a record by the view', () => {
		expect(weight([['arun', 50]], HOUSEHOLD)).toBe(1);
		expect(weight([['arun', 50]], 'arun')).toBe(0.5);
		expect(weight([['arun', 50]], 'asha')).toBe(0);
	});

	it('rounds a split so it adds up, the largest remainders first', () => {
		expect(largestRemainder([333467.71, 106482.72], 439951)).toEqual([333468, 106483]);
		expect(largestRemainder([245868.04, 194082.38], 439951)).toEqual([245868, 194083]);
		expect(largestRemainder([1.5, 2.5], 4)).toEqual([2, 2]);
		expect(largestRemainder([], 0)).toEqual([]);
	});

	it('sorts an asset into liquid, fixed term or locked', () => {
		const h = new StubHousehold();
		const by = (id: string) => h.assets.find((a) => a.id === id);
		expect(liquidityOf(by('balanced') ?? MONZO)).toBe('liquid');
		expect(by('saver') && liquidityOf(by('saver') ?? MONZO)).toBe('fixed');
		expect(by('home') && liquidityOf(by('home') ?? MONZO)).toBe('locked');
		expect(by('pension_arun') && liquidityOf(by('pension_arun') ?? MONZO)).toBe('locked');
	});
});
