import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { timeOf } from '#lib/chat/days.ts';
import type { Assumption, PlanItem, Projection } from '#lib/wealth/projection.ts';
import extract from './future-plans.json';
import { StubHousehold } from './household.ts';
import { buildProjection, correctProjection, fanScale, lineLabel, yearsTo } from './projection.ts';

const AT = new Date('2026-10-26T10:40:00');
const source = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../../docs/design/figures/future-plans-v4.json', import.meta.url)), 'utf8')
) as { R26: unknown; settings: Record<string, unknown> };

const rows = (p: Projection): Assumption[] => p.assumptions.groups.flatMap((g) => g.rows);
function row(p: Projection, id: string): Assumption {
	const found = rows(p).find((r) => r.id === id);
	if (!found) throw new Error(`no assumption ${id}`);
	return found;
}
function plan(p: Projection, id: string): PlanItem {
	const found = p.plan.items.find((i) => i.id === id);
	if (!found) throw new Error(`no plan item ${id}`);
	return found;
}

describe('the figures the stubbed Projection reads', () => {
	it('are the figure set’s own: the 26 Oct run and the settings, part for part', () => {
		expect(extract.R26).toEqual(source.R26);
		for (const [key, value] of Object.entries(extract.settings)) expect(value).toEqual(source.settings[key]);
		expect(extract.settings.surplus_rule).toMatch(/^All to cash/);
	});
});

describe('the fan’s scale', () => {
	it('gives the four scales the board draws', () => {
		expect(fanScale(4_055_000)).toEqual({ max: 4_500_000, lines: [1e6, 2e6, 3e6, 4e6] });
		expect(fanScale(6_356_000)).toEqual({ max: 7_000_000, lines: [2e6, 4e6, 6e6] });
		expect(fanScale(278_400_000)).toEqual({ max: 340_000_000, lines: [1e8, 2e8, 3e8] });
		expect(fanScale(340_900_000)).toEqual({ max: 380_000_000, lines: [1e8, 2e8, 3e8] });
	});

	it('keeps the peak inside the plot at the horizons the board does not draw', () => {
		for (const peak of [889_000, 1_006_000, 1_710_000, 113_200_000, 1_234_500_000]) {
			const scale = fanScale(peak);
			expect(scale.max).toBeGreaterThan(peak);
			expect(scale.lines.length).toBeGreaterThanOrEqual(2);
			expect(scale.lines.length).toBeLessThanOrEqual(4);
			expect(scale.lines.at(-1)).toBeLessThan(scale.max);
		}
	});

	it('names a line in millions, crore or lakh', () => {
		expect(lineLabel(1_500_000, 'GBP')).toBe('£1.5m');
		expect(lineLabel(500_000, 'GBP')).toBe('£500k');
		expect(lineLabel(100_000_000, 'INR')).toBe('₹10 crore');
		expect(lineLabel(25_000_000, 'INR')).toBe('₹2.5 crore');
		expect(lineLabel(5_000_000, 'INR')).toBe('₹50 lakh');
	});

	it('places a month as the board does: years from Mon 26 Oct 2026', () => {
		expect(yearsTo('2026-10-26', '2030-07-05')).toBeCloseTo(2030 + 6 / 12 - (2026 + 9 / 12 + 25 / 365), 10);
		expect(yearsTo('2026-10-26', '2027-06')).toBeCloseTo(0.5982, 3);
	});
});

describe('the Projection in pounds of each year, to 20 years', () => {
	const p = buildProjection(new StubHousehold(), 20, 'nominal', 'GBP');

	it('says what it is drawn in and which run it is', () => {
		expect(p.head).toBe(
			'Net worth over the next 20 years, in the pounds of each year · the engine’s run, Mon 26 Oct 09:53'
		);
		expect(p.empty).toBe(false);
		expect([p.horizon, p.money, p.currency]).toEqual([20, 'nominal', 'GBP']);
	});

	it('leads with the middle path in 2046 and where 8 in 10 runs end', () => {
		expect(p.hero).toEqual({
			over: 'Middle path in 2046',
			mid: { amount: '3378000', currency: 'GBP' },
			from: { amount: '457951', currency: 'GBP' },
			low: { amount: '2980000', currency: 'GBP' },
			high: { amount: '4055000', currency: 'GBP' }
		});
	});

	it('draws the fan to £4.5m with lines at £1m to £4m', () => {
		expect(p.fan.max).toBe('4500000');
		expect(p.fan.lines.map((l) => l.label)).toEqual(['£1m', '£2m', '£3m', '£4m']);
		expect(p.fan.points).toHaveLength(21);
		expect(p.fan.points[0]).toEqual({ year: 2026, low: '457951', mid: '457951', high: '457951' });
		expect(p.fan.points[10]).toEqual({ year: 2036, low: '1213000', mid: '1472000', high: '1710000' });
		expect(p.fan.axis).toEqual([
			{ label: 'Today', at: 0 },
			{ label: '2031', at: 0.25, minor: true },
			{ label: '2036', at: 0.5 },
			{ label: '2041', at: 0.75, minor: true },
			{ label: '2046', at: 1 }
		]);
	});

	it('marks the milestones and the one-off plan items on the line, each by its shape', () => {
		const by = (shape: string) => p.fan.marks.filter((m) => m.shape === shape).map((m) => m.id);
		expect(by('dot')).toEqual(['2029-02-20', '2030-07-05', '2045-10-01']);
		expect(by('tick')).toEqual(['2026-12-14', '2028-06-30', '2029-03-10', '2031-03-28']);
		expect(by('square')).toEqual(['extension', 'car2']);
		expect(p.fan.marks.filter((m) => m.label).map((m) => m.label)).toEqual(['HDFC loan ends']);
		expect(p.fan.marks.every((m) => m.at > 0 && m.at <= 20)).toBe(true);
	});

	it('gives a screen reader the board’s sentence, and another while amounts are hidden', () => {
		expect(p.fan.aria).toBe(
			'Net worth to 2046: the middle path from £457,951 to £3,378,000, with 8 in 10 runs between £2,980,000 and £4,055,000; milestones listed below.'
		);
		expect(p.fan.ariaPrivate).toBe('Net worth to 2046: amounts hidden in privacy mode; milestones listed below.');
	});

	it('lists the milestones within the horizon, with what each pays or frees', () => {
		expect(p.milestones.map((m) => m.title)).toEqual([
			'Asha’s fixed-rate saver matures',
			'Mortgage fixed rate ends',
			'Car loan paid off',
			'SBI FD matures',
			'HDFC home loan paid off',
			'LIC policy matures',
			'Mortgage paid off'
		]);
		expect(p.milestones[0]).toEqual({
			id: '2026-12-14',
			icon: 'piggy-bank',
			title: 'Asha’s fixed-rate saver matures',
			shape: 'tick',
			when: '14 Dec 2026',
			fig: { amount: '10460', currency: 'GBP' }
		});
		expect(p.milestones[1]?.note).toBe('then a variable rate');
		expect(p.milestones[3]?.fig).toEqual({ amount: '617538', currency: 'INR' });
		expect(p.milestones[4]?.noteFig).toEqual({ amount: '39390', currency: 'INR', pre: 'frees ', post: ' a month' });
	});

	it('lists the plan items, an admin’s to correct', () => {
		expect(p.plan.aside).toBe('yours to change, as an admin');
		expect(p.plan.canAdd).toBe(true);
		expect(p.plan.note).toBeUndefined();
		expect(p.plan.items.map((i) => [i.icon, i.title, i.when, `${i.fig.pre ?? ''}${i.fig.amount}`])).toEqual([
			['construction', 'Home extension', 'Once, Jun 2027', '−35000'],
			['gift', 'Asha’s annual bonus', 'Every March, 2027 to 2052', '+3000'],
			['car', 'Replace the car', 'Once, Jun 2031', '−25000']
		]);
		expect(plan(p, 'bonus').edit).toMatchObject({
			kind: 'rate',
			title: 'Asha’s annual bonus · +£3,000 every March, 2027 to 2052',
			field: 'Grows each year',
			unit: '% a year',
			before: { text: 'No growth' },
			hint: 'Asha’s salary growth is 3.5% a year, from the assumptions.'
		});
		expect(plan(p, 'bonus').edit?.current).toBeUndefined();
		expect(plan(p, 'extension').edit).toMatchObject({
			kind: 'amount',
			title: 'Home extension · −£35,000 once, Jun 2027',
			lead: '−£',
			sign: '−',
			currency: 'GBP',
			current: '35000'
		});
	});

	it('gives the eleven assumptions, each with its source', () => {
		expect(p.assumptions.groups.map((g) => g.title)).toEqual(['Returns', 'Pay, a year', 'Prices, a year']);
		expect(rows(p).map((r) => [r.name, r.value, r.source.label])).toEqual([
			['Parag Parikh Flexi Cap', '9.06%', 'History, shrunk to a prior'],
			['Balanced and the ETFs', '6%', 'Prior'],
			['Home, Reading', '3%', 'Prior'],
			['Flat, Pune', '5%', 'Prior'],
			['SBI fixed deposit', '7.1%', 'Contract'],
			['PPF', '7.1%', 'Contract'],
			['Cash', '3%', 'Prior'],
			['Arun’s salary growth', '4.17%', 'History and prior'],
			['Asha’s salary growth', '3.5%', 'History and prior'],
			['UK inflation', '2.5%', 'Prior'],
			['India inflation', '5%', 'Prior']
		]);
		expect(row(p, 'cash').why).toBe('Long-run UK savings rates. Each month’s surplus stays as cash.');
		expect(p.assumptions.locked).toBe(false);
		expect(p.assumptions.note).toBe('Click a figure to correct it. Only an admin can; each change is audited.');
		expect(row(p, 'pay_arun').edit).toEqual({
			target: 'assumption',
			id: 'pay_arun',
			kind: 'rate',
			title: 'Arun’s salary growth',
			field: 'A year · now 4.17%, his history blended with a prior',
			unit: '%',
			current: '4.17',
			before: { text: '4.17%' },
			hint: 'His own 4.8% a year since 2022, without the UK’s 3.5% blended in.'
		});
		expect(row(p, 'ppf').edit?.hint).toBeUndefined();
	});

	it('offers the board’s three questions, and says the figures are illustrative', () => {
		expect(p.chips).toEqual([
			'What if we buy a second flat?',
			'What if the plan items fall away?',
			'What moves the line most?'
		]);
		expect(p.foot).toMatch(/^Illustrative figures from the v4 figure set\. A projection, not a promise/);
	});
});

describe('the other horizons', () => {
	it('30 years runs to £7m with lines at £2m, £4m and £6m, and names its two late milestones', () => {
		const p = buildProjection(new StubHousehold(), 30, 'nominal', 'GBP');
		expect(p.hero.over).toBe('Middle path in 2056');
		expect([p.hero.low.amount, p.hero.mid.amount, p.hero.high.amount]).toEqual(['4597000', '5313000', '6356000']);
		expect(p.fan.max).toBe('7000000');
		expect(p.fan.lines.map((l) => l.label)).toEqual(['£2m', '£4m', '£6m']);
		expect(p.fan.marks.filter((m) => m.label).map((m) => m.label)).toEqual(['Mortgage paid off', 'Arun retires']);
		expect(p.milestones).toHaveLength(8);
		expect(p.fan.axis.filter((t) => !t.minor).map((t) => t.label)).toEqual(['Today', '2036', '2046', '2056']);
	});

	it('5 and 10 years cut the same run short', () => {
		const five = buildProjection(new StubHousehold(), 5, 'nominal', 'GBP');
		expect(five.hero.mid.amount).toBe('850000');
		expect(five.fan.points).toHaveLength(6);
		expect(five.milestones).toHaveLength(6);
		expect(five.fan.marks.filter((m) => m.shape === 'square').map((m) => m.id)).toEqual(['extension', 'car2']);
		expect(five.fan.axis.map((t) => t.label)).toEqual(['Today', '2027', '2028', '2029', '2030', '2031']);
		const ten = buildProjection(new StubHousehold(), 10, 'nominal', 'GBP');
		expect(ten.hero.mid.amount).toBe('1472000');
		expect(ten.fan.axis.map((t) => t.label)).toEqual(['Today', '2031', '2036']);
		expect(ten.fan.lines.map((l) => l.label)).toEqual(['£500k', '£1m', '£1.5m']);
	});
});

describe('today’s money and rupees, derived as board P3 derives them', () => {
	it('rupees at 2026 prices: the board’s figures, to ₹34 crore with lines at ₹10, ₹20 and ₹30 crore', () => {
		const p = buildProjection(new StubHousehold(), 20, 'today', 'INR');
		expect(p.head).toBe(
			'In rupees at 2026 prices: today’s money, at ₹112.50 to the pound (ECB, Fri 23 Oct) · the engine’s run, Mon 26 Oct 09:53'
		);
		expect(p.hero.over).toBe('Middle path in 2046, in today’s money');
		expect(p.hero.from).toEqual({ amount: '51519488', currency: 'INR' });
		expect([p.hero.low.amount, p.hero.mid.amount, p.hero.high.amount]).toEqual(['204600000', '231900000', '278400000']);
		expect(p.fan.points[10]).toEqual({ year: 2036, low: '106600000', mid: '129400000', high: '150300000' });
		expect(p.fan.max).toBe('340000000');
		expect(p.fan.lines.map((l) => l.label)).toEqual(['₹10 crore', '₹20 crore', '₹30 crore']);
		expect(p.fan.marks.some((m) => m.label)).toBe(false);
		expect(p.fan.aria).toContain('from ₹5,15,19,488 to ₹23,19,00,000');
		// the milestones and plan items keep their own currency, as the records do
		expect(p.milestones[0]?.fig).toEqual({ amount: '10460', currency: 'GBP' });
	});

	it('rupees at 30 years run to ₹38 crore', () => {
		const p = buildProjection(new StubHousehold(), 30, 'today', 'INR');
		expect(p.fan.max).toBe('380000000');
		expect(p.fan.lines.map((l) => l.label)).toEqual(['₹10 crore', '₹20 crore', '₹30 crore']);
	});

	it('pounds at 2026 prices take UK inflation out of each year', () => {
		const p = buildProjection(new StubHousehold(), 20, 'today', 'GBP');
		expect(p.head).toBe(
			'Net worth over the next 20 years, in pounds at 2026 prices: today’s money · the engine’s run, Mon 26 Oct 09:53'
		);
		expect(p.hero.over).toBe('Middle path in 2046, in today’s money');
		expect(p.hero.mid.amount).toBe(String(Math.round(3_378_000 / 1.025 ** 20 / 1000) * 1000));
		expect(p.hero.from.amount).toBe('457951');
	});

	it('the rupees of each year carry India’s inflation in place of the UK’s', () => {
		const p = buildProjection(new StubHousehold(), 20, 'nominal', 'INR');
		expect(p.head).toBe(
			'Net worth over the next 20 years, in the rupees of each year, from ₹112.50 to the pound today (ECB, Fri 23 Oct) · the engine’s run, Mon 26 Oct 09:53'
		);
		expect(p.hero.over).toBe('Middle path in 2046');
		expect(p.hero.mid.amount).toBe(String(Math.round((3_378_000 * 112.5 * (1.05 / 1.025) ** 20) / 1e5) * 1e5));
	});
});

describe('who may change it', () => {
	it('a member who is not an admin sees every figure, a lock and no edit', () => {
		const p = buildProjection(new StubHousehold({ me: 'asha' }), 20, 'nominal', 'GBP');
		expect(p.assumptions.locked).toBe(true);
		expect(p.assumptions.note).toBe('Arun keeps these figures. Ask in the chat to see what other figures would do.');
		expect(rows(p).every((r) => r.edit === undefined)).toBe(true);
		expect(p.plan.items.every((i) => i.edit === undefined)).toBe(true);
		expect(p.plan.aside).toBe('Arun’s, the admin’s');
		expect(p.plan.canAdd).toBe(false);
		expect(p.plan.note).toBe(
			'Plan items are Arun’s, the admin’s. You see them on the line; ask a what-if in the chat to try your own.'
		);
		expect(p.hero.mid.amount).toBe('3378000');
	});

	it('an empty household is flagged, so the page draws no fan', () => {
		expect(buildProjection(new StubHousehold({ empty: true }), 20, 'nominal', 'GBP').empty).toBe(true);
	});
});

describe('a correction in place', () => {
	it('an assumption: the row shows the new figure, who set it and what it was; the audit line follows', () => {
		const h = new StubHousehold();
		const before = buildProjection(h, 20, 'nominal', 'GBP');
		correctProjection(h, { target: 'assumption', id: 'pay_arun', value: '4.80' }, AT);
		const p = buildProjection(h, 20, 'nominal', 'GBP');
		expect(row(p, 'pay_arun')).toMatchObject({
			value: '4.8%',
			source: { kind: 'member', label: 'Set by Arun' },
			why: 'was 4.17%, his history and prior'
		});
		expect(row(p, 'pay_arun').edit).toMatchObject({
			field: 'A year · now 4.8%, set by Arun',
			current: '4.8',
			before: { text: '4.8%' }
		});
		expect(p.assumptions.saved).toEqual({
			text: 'Saved. The Projection runs again with it.',
			audit: `Audit · Arun’s salary growth 4.17% → 4.8% · Arun · Mon 26 Oct ${timeOf(AT)} · edited in place`
		});
		expect(p.plan.saved).toBeUndefined();
		// the stub holds one stored run and no engine: nothing on the fan moves, and no figure is made up
		expect(p.fan).toEqual(before.fan);
		expect(p.hero).toEqual(before.hero);
	});

	it('a second correction to the same figure says what the first one set', () => {
		const h = new StubHousehold();
		correctProjection(h, { target: 'assumption', id: 'pay_arun', value: '4.8' }, AT);
		correctProjection(h, { target: 'assumption', id: 'pay_arun', value: '5' }, AT);
		const p = buildProjection(h, 20, 'nominal', 'GBP');
		expect(row(p, 'pay_arun').why).toBe('was 4.8%, set by Arun');
		expect(p.assumptions.saved?.audit).toContain('Arun’s salary growth 4.8% → 5%');
	});

	it('a recurring plan item: its growth, as board P6 draws it', () => {
		const h = new StubHousehold();
		correctProjection(h, { target: 'assumption', id: 'pay_asha', value: '3.6' }, AT);
		expect(plan(buildProjection(h, 20, 'nominal', 'GBP'), 'bonus').edit?.hint).toBe(
			'Asha’s salary growth is 3.6% a year, from the assumptions.'
		);
		correctProjection(h, { target: 'plan', id: 'bonus', value: '3.5' }, AT);
		const p = buildProjection(h, 20, 'nominal', 'GBP');
		expect(plan(p, 'bonus')).toMatchObject({
			when: 'Every March, 2027 to 2052 · grows 3.5% a year',
			fig: { amount: '3000', currency: 'GBP', pre: '+' },
			corrected: { by: 'Corrected by Arun', was: 'was no growth' }
		});
		expect(plan(p, 'bonus').edit).toMatchObject({ current: '3.5', before: { text: '3.5% a year' } });
		expect(p.plan.saved?.audit).toBe(
			`Audit · Plan item corrected · Asha’s annual bonus: growth none → 3.5% a year · Arun · Mon 26 Oct ${timeOf(AT)} · edited in place`
		);
		expect(p.assumptions.saved).toBeUndefined();
		correctProjection(h, { target: 'plan', id: 'bonus', value: '4' }, AT);
		const again = buildProjection(h, 20, 'nominal', 'GBP');
		expect(plan(again, 'bonus').corrected?.was).toBe('was 3.5% a year');
		expect(again.plan.saved?.audit).toContain('growth 3.5% a year → 4% a year');
	});

	it('a one-off plan item: its amount, which stays a spend', () => {
		const h = new StubHousehold();
		correctProjection(h, { target: 'plan', id: 'extension', value: '40,000' }, AT);
		const p = buildProjection(h, 20, 'nominal', 'GBP');
		expect(plan(p, 'extension')).toMatchObject({
			fig: { amount: '40000', currency: 'GBP', pre: '−' },
			corrected: { by: 'Corrected by Arun', was: 'was', wasFig: { amount: '35000', currency: 'GBP', pre: '−' } }
		});
		expect(p.plan.saved?.audit).toContain('Home extension: amount −£35,000 → −£40,000');
	});

	it('is refused for a member who is not an admin, an unknown figure, and a value that is not a new one', () => {
		const asha = new StubHousehold({ me: 'asha' });
		expect(() => {
			correctProjection(asha, { target: 'assumption', id: 'pay_arun', value: '4.8' }, AT);
		}).toThrow(/Only an admin/);
		expect(asha.corrections).toEqual([]);
		const h = new StubHousehold();
		for (const [target, id, value] of [
			['assumption', 'nothing', '4.8'],
			['plan', 'nothing', '4.8'],
			['assumption', 'pay_arun', 'lots'],
			['assumption', 'pay_arun', '4.17'],
			['plan', 'extension', '35000']
		] as const) {
			expect(() => {
				correctProjection(h, { target, id, value }, AT);
			}).toThrow();
		}
		expect(h.corrections).toEqual([]);
	});
});
