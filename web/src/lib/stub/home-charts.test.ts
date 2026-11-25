import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { investedOwedQuery, ownOweQuery, wealthKeys } from '#lib/api/queries.ts';
import type { InvestedHorizon, InvestedOwed, RingPart } from '#lib/wealth/overview.ts';
import extract from './future-plans.json';
import { StubHousehold, type StubAsset } from './household.ts';
import {
	buildInvestedOwed,
	buildOwnOwe,
	gridSteps,
	investedToday,
	kindOf,
	longMonth,
	plotMax,
	ratio,
	shareText
} from './home-charts.ts';
import { monzoSavings } from './records.ts';
import { StubWealthSource } from './source.ts';
import { HOUSEHOLD } from './sums.ts';

interface SetHorizon {
	to: string;
	invested: number;
	owed: number;
	held_today: number;
	saved_from_income: number;
	growth_and_interest: number;
}
const source = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../../docs/design/figures/future-plans-v4.json', import.meta.url)), 'utf8')
) as {
	home_charts: {
		today: { invested: number; owed: number };
		months: { month: string; invested: number; owed: number }[];
		crossing: { month: string; invested: number; owed: number };
		horizons: Record<string, SetHorizon>;
	};
};
const SET = source.home_charts;
const AT = new Date('2026-10-26T09:41:00');

/** The household as the board draws it: after the first record, the Monzo savings. */
function after(): StubHousehold {
	const h = new StubHousehold();
	h.add(monzoSavings('5000', 'arun'), AT, 'added in the chat');
	return h;
}

const rows = (parts: readonly RingPart[]) =>
	parts.map((p) => [p.label, p.fig.amount, p.fig.currency, p.note, p.shareText, p.alt?.amount]);

function horizon(io: InvestedOwed, years: number): InvestedHorizon {
	const found = io.horizons.find((x) => x.years === years);
	if (!found) throw new Error(`no ${String(years)} years`);
	return found;
}

describe('the figures the home charts read', () => {
	it('are the figure set’s home_charts, part for part', () => {
		expect(extract.home_charts).toEqual(source.home_charts);
	});
});

describe('What we own and owe, as the board draws it', () => {
	it('the household in pounds: five kinds outside, three loans and a paid card inside', () => {
		const o = buildOwnOwe(after(), HOUSEHOLD, 'GBP');
		expect(o.state).toBe('ready');
		expect([o.aside, o.ownLabel, o.oweLabel, o.own.amount, o.owe.amount]).toEqual([
			'36% of what we own is owed',
			'We own',
			'We owe',
			'691694',
			'246743'
		]);
		expect(rows(o.kinds)).toEqual([
			['Property', '512778', 'GBP', '2 homes', '74.1%', undefined],
			['Pensions', '117650', 'GBP', '2, locked until 57', '17.0%', undefined],
			['Investments', '30504', 'GBP', '6 funds and shares', '4.4%', undefined],
			['Deposits', '23670', 'GBP', '4 fixed terms', '3.4%', undefined],
			['Cash', '7092', 'GBP', '3 accounts and pots', '1.0%', undefined]
		]);
		expect(rows(o.loans)).toEqual([
			['Mortgage', '224353', 'GBP', 'Ends Oct 2045', '90.9%', undefined],
			['HDFC loan', '1513257', 'INR', 'Ends Jul 2030', '5.5%', '13451'],
			['Car loan', '8939', 'GBP', 'Ends Feb 2029', '3.6%', undefined]
		]);
		expect(o.paid).toEqual([
			{ id: 'card', label: 'Barclaycard', note: 'Paid in full on Tue 20 Oct', fig: { amount: '0', currency: 'GBP' } }
		]);
		expect(o.kinds.map((k) => k.tone)).toEqual(['c1', 'c2', 'c4', 'c5', 'c3']);
		expect(o.kinds.map((k) => k.href)).toEqual(Array(5).fill('/assets'));
		expect(o.loans.map((k) => k.href)).toEqual(Array(3).fill('/debts'));
		expect(o.aria).toBe(
			'What we own, by kind: Property 74.1%, Pensions 17.0%, Investments 4.4%, Deposits 3.4%, Cash 1.0%. What we owe is 36% of what we own: Mortgage 90.9% of it, HDFC loan 5.5% of it, Car loan 3.6% of it.'
		);
		expect(o.key).toBe('Outer ring: what is owned, by kind. Inner ring: what is owed, on the same scale.');
		expect(o.ofOwn).toBe('of what we own');
	});

	it('both rings on one scale: the outer ring whole, the inner what is owed of it, each from where the last ends', () => {
		const o = buildOwnOwe(after(), HOUSEHOLD, 'GBP');
		const outer = o.kinds.reduce((a, k) => a + k.arc, 0);
		const inner = o.loans.reduce((a, k) => a + k.arc, 0);
		expect(outer).toBeCloseTo(1, 9);
		expect(inner).toBeCloseTo(246743 / 691694, 4);
		expect(o.kinds[1]?.from).toBeCloseTo(o.kinds[0]?.arc ?? 0, 9);
		expect(o.loans[2]?.from).toBeCloseTo((o.loans[0]?.arc ?? 0) + (o.loans[1]?.arc ?? 0), 9);
		expect(o.kinds[0]?.arc).toBeCloseTo(0.74133, 4);
	});

	it('in rupees: each record at the set’s one rate, every loan in rupees', () => {
		const o = buildOwnOwe(after(), HOUSEHOLD, 'INR');
		expect([o.own, o.owe]).toEqual([
			{ amount: '77815563', currency: 'INR' },
			{ amount: '27758640', currency: 'INR' }
		]);
		expect(o.kinds.map((k) => k.fig.amount)).toEqual(['57687500', '13235625', '3431668', '2662908', '797862']);
		expect(rows(o.loans).map((r) => [r[1], r[2], r[5]])).toEqual([
			['25239767', 'INR', undefined],
			['1513257', 'INR', undefined],
			['1005616', 'INR', undefined]
		]);
		expect(o.paid[0]?.fig).toEqual({ amount: '0', currency: 'INR' });
	});

	it('Me: my share of each record, the joint ones half each', () => {
		const o = buildOwnOwe(after(), 'arun', 'GBP');
		expect([o.aside, o.ownLabel, o.oweLabel, o.own.amount, o.owe.amount]).toEqual([
			'35% of what I own is owed',
			'I own',
			'I owe',
			'385435',
			'134567'
		]);
		expect(rows(o.kinds)).toEqual([
			['Property', '256389', 'GBP', '2 homes, half each', '66.5%', undefined],
			['Pensions', '86400', 'GBP', '1, locked until 57', '22.4%', undefined],
			['Investments', '24996', 'GBP', '4 funds and shares', '6.5%', undefined],
			['Deposits', '10648', 'GBP', '2 fixed terms', '2.8%', undefined],
			['Cash', '7002', 'GBP', '3 accounts and pots', '1.8%', undefined]
		]);
		expect(rows(o.loans)).toEqual([
			['Mortgage', '112177', 'GBP', 'Half · ends Oct 2045', '83.4%', undefined],
			['HDFC loan', '1513257', 'INR', 'Ends Jul 2030', '10.0%', '13451'],
			['Car loan', '8939', 'GBP', 'Ends Feb 2029', '6.6%', undefined]
		]);
		expect(o.paid.map((p) => p.label)).toEqual(['Barclaycard']);
	});

	it('Asha: her one loan, her pot under 0.1%, no card of Arun’s', () => {
		const o = buildOwnOwe(after(), 'asha', 'GBP');
		expect([o.aside, o.ownLabel, o.oweLabel, o.own.amount, o.owe.amount]).toEqual([
			'37% of what Asha owns is owed',
			'Asha owns',
			'Asha owes',
			'306259',
			'112177'
		]);
		expect(rows(o.kinds)).toEqual([
			['Property', '256389', 'GBP', '2 homes, half each', '83.7%', undefined],
			['Pensions', '31250', 'GBP', '1, locked until 57', '10.2%', undefined],
			['Investments', '5508', 'GBP', '2 funds and shares', '1.8%', undefined],
			['Deposits', '13022', 'GBP', '2 fixed terms', '4.3%', undefined],
			['Cash', '90', 'GBP', '1 account or pot', 'under 0.1%', undefined]
		]);
		expect(rows(o.loans)).toEqual([['Mortgage', '112177', 'GBP', 'Half · ends Oct 2045', '100.0%', undefined]]);
		expect(o.paid).toEqual([]);
		expect(o.aria).toContain('What Asha owes is 37% of what Asha owns: Mortgage 100.0% of it.');
	});

	it('a loan with no end day or an uneven share, and a card with no statement, still read', () => {
		const h = after();
		const car = h.debts.find((d) => d.id === 'car');
		const card = h.debts.find((d) => d.id === 'card');
		if (!car || !card) throw new Error('no car or card');
		const { ends: _ends, ...open } = car;
		h.setDebt({
			...open,
			owners: [
				['arun', 70],
				['asha', 30]
			]
		});
		const { statement: _statement, ...bare } = card;
		h.setDebt(bare);
		const o = buildOwnOwe(h, 'arun', 'GBP');
		expect(o.loans.find((l) => l.id === 'car')?.note).toBe('70% · no end date');
		expect(buildOwnOwe(h, HOUSEHOLD, 'GBP').loans.find((l) => l.id === 'car')?.note).toBe('No end date');
		expect(o.paid).toEqual([
			{ id: 'card', label: 'Barclaycard', note: 'Nothing owed', fig: { amount: '0', currency: 'GBP' } }
		]);
		expect([ratio(1, 0), ratio(1, 4)]).toEqual([0, 0.25]);
	});

	it('a view nobody has is the household’s', () => {
		expect(buildOwnOwe(after(), 'nobody', 'GBP').ownLabel).toBe('We own');
	});

	it('nothing owed: the inner ring is its empty track, and the card says so', () => {
		const h = after();
		for (const id of ['mortgage', 'hdfc', 'car', 'card']) h.closeDebt(id);
		const o = buildOwnOwe(h, HOUSEHOLD, 'GBP');
		expect(o).toMatchObject({ state: 'ready', nothingOwed: true, aside: 'Nothing is owed', loans: [], paid: [] });
		expect(o.owe.amount).toBe('0');
		expect(o.key).toBe('Outer ring: what is owned, by kind. Nothing is owed, so the inner ring is empty.');
		expect(o.aria).toMatch(/Cash 1\.0%\. Nothing is owed\.$/);
	});

	it('no records: an empty ring, and nothing worked out', () => {
		const o = buildOwnOwe(new StubHousehold({ empty: true }), HOUSEHOLD, 'GBP');
		expect(o).toMatchObject({ state: 'empty', aside: 'No records yet', kinds: [], loans: [] });
		expect(o.aria).toBe('Nothing owned or owed is on record yet');
	});

	it('records the set does not have still read: one of each, a debt owing more than is owned', () => {
		const h = new StubHousehold({ empty: true });
		const base: StubAsset = {
			id: 'x',
			kind: 'oeic',
			name: 'Fund',
			country: 'UK',
			ccy: 'GBP',
			owners: [['arun', 100]],
			value: 100,
			liquidity: 'liquid'
		};
		h.add({ ...base, id: 'f' }, AT, 'x');
		h.add({ ...base, id: 'd', kind: 'fixed_saver', matures: '2030-01-01' }, AT, 'x');
		h.add({ ...base, id: 'c', kind: 'current_account' }, AT, 'x');
		h.add({ ...base, id: 'h', kind: 'property', owners: [['arun', 70]] }, AT, 'x');
		h.add({ ...base, id: 'p1', unlocks_at: 57 }, AT, 'x');
		h.add({ ...base, id: 'p2', unlocks_at: 60 }, AT, 'x');
		const o = buildOwnOwe(h, 'arun', 'GBP');
		expect(o.kinds.map((k) => k.note)).toEqual([
			'1 home',
			'2 pensions',
			'1 fund or share',
			'1 fixed term',
			'1 account or pot'
		]);
		expect(kindOf({ ...base, kind: 'cash' })).toBe('cash');
	});
});

describe('shares and months in words', () => {
	it('writes a share to one decimal, never 0.0% for something there', () => {
		expect([shareText(0.74133), shareText(0.0003), shareText(0), shareText(1)]).toEqual([
			'74.1%',
			'under 0.1%',
			'0.0%',
			'100.0%'
		]);
		expect(longMonth('Mar 2029')).toBe('March 2029');
		expect(longMonth('Oops 2029')).toBe('Oops 2029');
	});

	it('scales the plot as the board does', () => {
		expect([430362, 903011, 2529610, 4252249].map(plotMax)).toEqual([480000, 1000000, 2800000, 4700000]);
		expect(gridSteps(480000)).toEqual([200000, 400000]);
		expect(gridSteps(1000000)).toEqual([300000, 600000, 900000]);
		expect(gridSteps(2800000)).toEqual([1000000, 2000000]);
		expect(gridSteps(4700000)).toEqual([2000000, 4000000]);
		expect(plotMax(0)).toBe(1);
	});
});

describe('Invested against owed, from the figure set', () => {
	const io = buildInvestedOwed(after(), HOUSEHOLD, 'GBP');

	it('today, then every month of the run, each the set’s own', () => {
		expect(io.state).toBe('ready');
		expect(io.currency).toBe('GBP');
		expect(io.path).toHaveLength(SET.months.length + 1);
		expect(io.path[0]).toEqual({
			label: 'Today',
			long: 'Today',
			invested: String(SET.today.invested),
			owed: String(SET.today.owed),
			gap: '67827',
			ahead: false
		});
		io.path.slice(1).forEach((p, i) => {
			const m = SET.months[i];
			expect([p.label, p.invested, p.owed]).toEqual([m?.month, String(m?.invested), String(m?.owed)]);
		});
		expect(io.path.find((p) => p.label === 'Mar 2029')).toMatchObject({
			long: 'March 2029',
			invested: '267346',
			owed: '209932',
			gap: '57414',
			ahead: true
		});
	});

	it('names the crossing, Jun 2028, and how far behind today is', () => {
		expect(io.crossing).toEqual({ index: 20, label: SET.crossing.month, long: 'June 2028' });
		expect(io.path[20]).toMatchObject({ invested: String(SET.crossing.invested), owed: String(SET.crossing.owed) });
		expect(io.headline).toEqual({
			text: 'when what we have invested passes what we owe. Today it is',
			fig: { amount: '67827', currency: 'GBP' },
			after: 'behind.'
		});
		expect(io.foot).toBe(
			'On the Projection’s plan path: your records, plans and assumptions, with no market swings. Future pounds, not today’s money.'
		);
	});

	it('each horizon’s split is the set’s, to the pound', () => {
		for (const years of [5, 10, 20, 30]) {
			const h = horizon(io, years);
			const s = SET.horizons[String(years)];
			expect(h.to).toBe(s?.to);
			expect(h.invested.amount).toBe(String(s?.invested));
			expect(h.parts.map((p) => p.fig.amount)).toEqual([
				String(s?.held_today),
				String(s?.saved_from_income),
				String(s?.growth_and_interest)
			]);
			expect(io.path[h.points - 1]).toMatchObject({
				label: s?.to,
				invested: String(s?.invested),
				owed: String(s?.owed)
			});
		}
	});

	it('5 years: the board’s scale, axis, shares and table', () => {
		const h = horizon(io, 5);
		expect([h.points, h.max, h.lines.map((l) => l.label), h.crossingLabel, h.growthShare]).toEqual([
			63,
			'480000',
			['£200k', '£400k'],
			true,
			'17%'
		]);
		expect(h.axis.map((a) => [a.label, Number(a.at.toFixed(4))])).toEqual([
			['Today', 0],
			['2029', 0.4194],
			['Dec 2031', 1]
		]);
		expect(h.parts.map((p) => [p.label, p.shareText, p.tone])).toEqual([
			['Held today', '42%', 'g0'],
			['Saved from income', '42%', 'g1'],
			['Growth and interest', '17%', 'g2']
		]);
		expect(h.partsAria).toBe(
			'Where the growth comes from, by Dec 2031: Held today 42%, Saved from income 42%, Growth and interest 17%.'
		);
		expect(h.rows.map((r) => [r.label, r.invested.amount, r.owed.amount, r.ahead ? '▲' : '▼', r.gap.amount])).toEqual([
			['Today', '178916', '246743', '▼', '67827'],
			['Dec 2026', '186486', '244340', '▼', '57854'],
			['Dec 2027', '199385', '229351', '▼', '29966'],
			['Dec 2028', '251430', '213634', '▲', '37796'],
			['Dec 2029', '311859', '200700', '▲', '111159'],
			['Dec 2030', '379919', '189545', '▲', '190374'],
			['Dec 2031', '430362', '180202', '▲', '250160']
		]);
	});

	it('10, 20 and 30 years: the board’s scales; the crossing’s label gives way from 20', () => {
		const ten = horizon(io, 10);
		expect([ten.max, ten.lines.map((l) => l.label), ten.crossingLabel, ten.growthShare]).toEqual([
			'1000000',
			['£300k', '£600k', '£900k'],
			true,
			'23%'
		]);
		expect(ten.parts.map((p) => p.shareText)).toEqual(['20%', '58%', '23%']);
		expect(ten.axis[1]).toEqual({ label: '2031', at: 50 / 122 });
		expect(ten.aria).toBe(
			'Invested against owed, today to Dec 2036. Invested, everything we own except property, goes from £178,916 to £903,011. What we owe goes from £246,743 to £126,822. Invested passes owed in June 2028.'
		);
		const twenty = horizon(io, 20);
		expect([twenty.max, twenty.lines.map((l) => l.label), twenty.crossingLabel, twenty.growthShare]).toEqual([
			'2800000',
			['£1m', '£2m'],
			false,
			'32%'
		]);
		expect(twenty.axis[1]?.label).toBe('2036');
		expect(twenty.rows).toHaveLength(22);
		const thirty = horizon(io, 30);
		expect([thirty.max, thirty.lines.map((l) => l.label), thirty.crossingLabel, thirty.growthShare]).toEqual([
			'4700000',
			['£2m', '£4m'],
			false,
			'49%'
		]);
		expect(thirty.axis[1]).toEqual({ label: '2041', at: 170 / 362 });
		expect(thirty.parts.map((p) => p.shareText)).toEqual(['4%', '47%', '49%']);
		expect(thirty.rows).toHaveLength(32);
		expect(thirty.rows.at(-1)?.label).toBe('Dec 2056');
	});
});

describe('Invested against owed, in the states the board leaves to the build', () => {
	it('carries no notes for the household in pounds, nor before the first change', () => {
		expect(buildInvestedOwed(after(), HOUSEHOLD, 'GBP').notes).toEqual([]);
		expect(buildInvestedOwed(after(), HOUSEHOLD, 'GBP').stale).toBeUndefined();
		expect(buildInvestedOwed(new StubHousehold(), HOUSEHOLD, 'GBP').stale).toBeUndefined();
	});

	it('a member’s view and rupees: the household’s run, in pounds, saying so', () => {
		const io = buildInvestedOwed(after(), 'asha', 'INR');
		expect(io.currency).toBe('GBP');
		expect(io.notes).toEqual([
			'The household’s figures: the plan’s run keeps one cash figure for the whole household, so this card is not split by member.',
			'In pounds: the run holds no rupee rate for each month ahead, so its lines are not shown in rupees.'
		]);
		expect(horizon(io, 5).invested.amount).toBe('430362');
		expect(buildInvestedOwed(after(), 'nobody', 'GBP').notes).toEqual([]);
	});

	it('stale once the records move past the run: what they hold now, and the run’s day', () => {
		const h = after();
		const hdfc = h.debts.find((d) => d.id === 'hdfc');
		if (!hdfc) throw new Error('no hdfc');
		h.setDebt({ ...hdfc, balance: hdfc.balance - 39390 }, { recordId: 'hdfc', at: AT, how: 'paid' });
		const io = buildInvestedOwed(h, HOUSEHOLD, 'GBP');
		expect(investedToday(h)).toEqual({ invested: 178916, owed: 246393 });
		expect(io.stale).toEqual({
			title: 'Before the latest change',
			text: 'These lines are the plan’s run of Mon 26 Oct 09:53. The records have changed since: £178,916 invested and £246,393 owed today. The next run brings the lines up to date.'
		});
		expect(io.state).toBe('ready');
	});

	it('nothing owed, and no records', () => {
		const h = after();
		for (const id of ['mortgage', 'hdfc', 'car', 'card']) h.closeDebt(id);
		expect(buildInvestedOwed(h, HOUSEHOLD, 'GBP').state).toBe('nothing-owed');
		expect(buildInvestedOwed(new StubHousehold({ empty: true }), HOUSEHOLD, 'GBP').state).toBe('empty');
	});
});

describe('the cards’ queries', () => {
	it('answer from the household as it is now, each under the wealth key', async () => {
		const h = new StubHousehold();
		const stub = new StubWealthSource(h);
		const own = ownOweQuery(stub, 'household', 'GBP');
		expect(own.queryKey).toEqual(['wealth', 'own-owe', 'household', 'GBP']);
		expect(own.queryKey.slice(0, 1)).toEqual([...wealthKeys.all]);
		expect((await own.queryFn()).own.amount).toBe('686694');
		h.add(monzoSavings('5000', 'arun'), AT, 'added in the chat');
		expect((await own.queryFn()).own.amount).toBe('691694');
		const inv = investedOwedQuery(stub, 'asha', 'INR');
		expect(inv.queryKey).toEqual(['wealth', 'invested-owed', 'asha', 'INR']);
		expect((await inv.queryFn()).notes).toHaveLength(2);
	});
});
