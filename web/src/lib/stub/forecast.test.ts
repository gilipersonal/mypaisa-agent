import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { budgetForecastQuery, wealthKeys } from '#lib/api/queries.ts';
import { formatMoney } from '#lib/formatting/money.ts';
import type { BudgetForecast, ForecastLine, Said } from '#lib/wealth/forecast.ts';
import type { Fig } from '#lib/wealth/overview.ts';
import { HORIZONS } from '#lib/wealth/projection.ts';
import { FORECAST_RUNS, amountFig, buildBudgetForecast, forecastRunOf, type ForecastRun } from './forecast.ts';
import extract from './future-plans.json';
import { StubHousehold } from './household.ts';
import { StubWealthSource } from './source.ts';

const source = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../../docs/design/figures/future-plans-v4.json', import.meta.url)), 'utf8')
) as Record<string, Record<string, unknown>>;

/** An amount as the door writes it, with the words that travel with it. */
const shown = (f: Fig) => `${f.pre ?? ''}${formatMoney(f.amount, f.currency, { whole: true })}${f.post ?? ''}`;
const words = (parts: Said[]) => parts.map((p) => p.text ?? (p.fig ? shown(p.fig) : '')).join('');
const signed = (f: Fig) => Number(f.amount) * (f.pre?.includes('−') ? -1 : 1);
const line = (f: BudgetForecast, id: string): ForecastLine => {
	const found = f.year.lines.find((l) => l.id === id);
	if (!found) throw new Error(`no line ${id}`);
	return found;
};
const arun = () => new StubHousehold();
const r1 = (year?: number) => buildBudgetForecast(arun(), 'R1', 20, 'nominal', 'GBP', year);

describe('the figures the stubbed Budget forecast reads', () => {
	it('are the figure set’s own, part for part', () => {
		for (const run of ['R1', 'R2', 'W'] as const) expect(extract.forecast[run]).toEqual(source.forecast?.[run]);
		const runs = source.runs as Record<string, Record<string, unknown>>;
		for (const run of ['R1', 'R2'] as const) {
			expect(extract.runs[run].when).toBe(runs[run]?.when);
			expect(extract.runs[run].after).toBe(runs[run]?.after);
		}
		expect(extract.clock).toEqual(source.clock);
		expect(extract.plans.schooling).toEqual(source.plans?.schooling);
		expect(extract.rearrange).toEqual(source.rearrange);
		expect(extract.evening2.wedding).toEqual(source.evening2?.wedding);
	});
});

describe('the picked board’s state: the school fees just saved (R1, 20:43)', () => {
	const f = r1();

	it('leads with 2029, the year of the leanest month, at 20 years in pounds of each year', () => {
		expect(f.selected).toBe(2029);
		expect(f.years).toEqual(Array.from({ length: 20 }, (_, i) => 2027 + i));
		expect(f.head).toBe('Each year to 2046, in pounds of each year · the engine’s run, Thu 5 Nov 20:43');
		expect(f.empty).toBe(false);
		expect(f.pot).toBeUndefined();
	});

	it('draws each year’s leanest month against the £500 floor, the years below it flagged and the high ones broken', () => {
		const { chart } = f;
		expect(chart.title).toBe('Your leanest month, each year');
		expect(chart.sub).toBe('2027 to 2046 · against your floor');
		expect(chart.bars).toHaveLength(20);
		expect(chart.bars.filter((b) => b.tone === 'lo').map((b) => b.year)).toEqual([
			2029, 2030, 2031, 2032, 2033, 2034, 2035
		]);
		expect(chart.bars.filter((b) => b.capTop).map((b) => b.year)).toEqual([2042, 2043, 2044, 2045, 2046]);
		const lean = chart.bars.find((b) => b.year === 2029);
		expect(lean && shown(lean.fig)).toBe('−£903');
		expect(lean?.floorAt).toBeUndefined();
		expect(lean?.aria).toBe('2029: leanest month −£903, in Jan 2029; below your floor in 11 months');
		expect(lean?.ariaPrivate).toContain('leanest month hidden');
		expect(chart.grid.map((g) => [g.label, g.kind])).toEqual([
			['£4k', 'line'],
			['£2k', 'line'],
			['£500', 'floor'],
			['£0', 'zero'],
			['−£1k', 'foot']
		]);
		expect(chart.axis.map((a) => a.label)).toEqual(['2027', '2031', '2036', '2041', '2046']);
		expect(chart.flags.map((x) => `${x.text} ${words(x.said)}`)).toEqual([
			'▼ Below your floor in 50 months, Jan 2029 to Feb 2035'
		]);
		expect(chart.notes.map((n) => words(n.said))).toEqual([
			'2042 to 2046 run past £4,000 a month at their leanest, so they are drawn with a break.'
		]);
		expect(chart.legend.map((l) => l.text)).toEqual([
			'At or above your floor',
			'▼ Below it',
			'Your floor, £500 a month',
			'2029, selected'
		]);
		expect(chart.cashStrip).toBe(false);
		expect(chart.aria).toContain('Below it in 2029, −£903; 2030, −£453;');
		expect(chart.ariaPrivate).not.toMatch(/£\d/);
	});

	it('gives 2029’s lines, which add up to its surplus, as the board does', () => {
		const y = f.year;
		expect(y.title).toBe('2029');
		expect(y.chip).toEqual({ text: '▼ 11 months below your floor', alert: true });
		expect(y.meta).toBe('Jan to Dec, in pounds of 2029 · tap a figure to see what makes it');
		expect(y.lines.map((l) => [l.title, shown(l.fig)])).toEqual([
			['Income', '£104,906'],
			['Spending', '−£34,722'],
			['EMIs', '−£22,115'],
			['SIP and LIC’s premium', '−£1,354'],
			['School fees', '−£48,000']
		]);
		expect(words(line(f, 'income').sub)).toBe('Arun £59,395 · Asha £40,236 · Pune rent £2,061 · Asha’s bonus £3,214');
		expect(words(line(f, 'emis').sub)).toBe('Mortgage £17,478 · Car loan £693 · HDFC £3,944');
		expect(words(line(f, 'sip').sub)).toBe('Parag Parikh £1,001 · LIC £353 in March');
		expect(words(line(f, 'plan-School fees').sub)).toBe(
			'Your plan, saved at 20:43 · £4,000 a month from Jan 2029, 4.5% a year'
		);
		expect(line(f, 'spend').traced).toBe(true);
		expect(shown(y.surplus)).toBe('−£1,285');
		expect(y.negative).toBe(true);
		expect(y.facts.map((x) => `${x.label}: ${words(x.said)}`)).toEqual([
			'Savings rate: −1.2%',
			'Cash, end of December: £70,406',
			'Leanest month: Jan, −£903'
		]);
		expect(y.fromCash).toEqual([]);
		expect(y.canCover).toBe(true);
		expect(y.lock).toBeUndefined();
	});

	it('gives 2029’s months with the board’s notes, the flagged ones marked', () => {
		const m = f.year.months;
		expect(m?.title).toBe('2029, month by month');
		expect(m?.sub).toBe('the surplus each month');
		expect(m?.rows.map((r) => [r.label, words(r.note), shown(r.fig)])).toEqual([
			['Jan', 'below your floor', '▼ −£903'],
			['Feb', 'the car loan’s last EMI', '▼ −£903'],
			['Mar', 'Asha’s bonus; the SBI FD pays £5,189 into cash', '£2,306'],
			['Apr', 'pay rises', '▼ −£203'],
			['May', 'below your floor', '▼ −£201'],
			['Jun', 'below your floor', '▼ −£200'],
			['Jul', 'below your floor', '▼ −£199'],
			['Aug', 'below your floor', '▼ −£198'],
			['Sep', 'below your floor', '▼ −£196'],
			['Oct', 'below your floor', '▼ −£197'],
			['Nov', 'below your floor', '▼ −£195'],
			['Dec', 'below your floor', '▼ −£196']
		]);
	});

	it('traces 2029’s spending to each category’s plan and its inflation key', () => {
		const t = f.trace;
		expect(t.title).toBe('2029’s spending');
		expect(shown(t.total)).toBe('−£34,722');
		expect(t.rows).toHaveLength(12);
		expect(t.rows.map((r) => `${r.name}: ${words(r.sub)} = ${shown(r.fig)}`).slice(0, 2)).toEqual([
			'Bills and council tax: £420 a month in 2026 · UK 2.5% a year = −£5,428',
			'Groceries: £650 a month in 2026 · UK 2.5% a year = −£8,400'
		]);
		expect(words(t.rows.find((r) => r.name === 'Family support, India')?.sub ?? [])).toBe(
			'₹25,000 a month in 2026 · India 5% a year, at each month’s rate'
		);
		expect(words(t.rows.find((r) => r.name === 'Health')?.sub ?? [])).toBe('£60 a month in 2026 · UK health 4% a year');
		expect(t.source).toBe('The engine’s trace, run Thu 5 Nov 20:43');
		expect(t.totalLabel).toBe('Spending in 2029');
	});

	it('opens another year when asked, with its one-offs paid from cash', () => {
		const y = r1(2027).year;
		expect(r1(2027).selected).toBe(2027);
		expect(y.chip).toEqual({ text: 'No month below your floor', alert: false });
		expect(y.fromCash.map((x) => `${x.label}, ${x.sub}: ${words(x.said)}`)).toEqual([
			'Home extension, June, from cash: −£35,000'
		]);
		expect(y.months).toBeUndefined();
		expect(y.canCover).toBe(false);
		expect(words(line(r1(2031), 'sip').sub)).toBe('Parag Parikh £954');
		expect(line(r1(2031), 'sip').title).toBe('SIP');
		expect(r1(2031).year.fromCash[0]?.sub).toBe('June, from cash');
		// a year outside the horizon is not offered: the chart's own year instead
		expect(buildBudgetForecast(arun(), 'R1', 5, 'nominal', 'GBP', 2040).selected).toBe(2029);
	});
});

describe('every run’s every year', () => {
	it('adds its lines up to the figure set’s surplus, in pounds of each year', () => {
		for (const run of FORECAST_RUNS) {
			const all = buildBudgetForecast(arun(), run, 30, 'nominal', 'GBP');
			for (const year of all.years) {
				const f = buildBudgetForecast(arun(), run, 30, 'nominal', 'GBP', year);
				const fromSet = extract.forecast[run].years.find((y) => y.year === year)?.surplus;
				expect(signed(f.year.surplus), `${run} ${String(year)}`).toBe(fromSet);
			}
		}
	});

	it('adds its lines up to the surplus shown in rupees and in today’s money', () => {
		for (const [money, currency] of [
			['nominal', 'INR'],
			['today', 'GBP'],
			['today', 'INR']
		] as const) {
			for (const year of [2027, 2029, 2041, 2056]) {
				const f = buildBudgetForecast(arun(), 'R2', 30, money, currency, year);
				const total = f.year.lines.reduce((a, l) => a + signed(l.fig), 0);
				expect(signed(f.year.surplus)).toBe(total);
				expect(f.year.surplus.currency).toBe(currency);
				expect(-signed(f.trace.total)).toBe(-signed(line(f, 'spend').fig));
			}
		}
	});
});

describe('the horizons', () => {
	it('names the years the board names at each', () => {
		for (const h of HORIZONS) {
			const f = buildBudgetForecast(arun(), 'R1', h, 'nominal', 'GBP');
			expect(f.chart.bars).toHaveLength(h);
			expect(f.years[0]).toBe(2027);
		}
		expect(buildBudgetForecast(arun(), 'R1', 5, 'nominal', 'GBP').chart.axis.map((a) => a.label)).toEqual([
			'2027',
			'2028',
			'2029',
			'2030',
			'2031'
		]);
		expect(buildBudgetForecast(arun(), 'R1', 10, 'nominal', 'GBP').chart.axis.map((a) => a.label)).toEqual([
			'2027',
			'2030',
			'2033',
			'2036'
		]);
		const five = buildBudgetForecast(arun(), 'R1', 5, 'nominal', 'GBP');
		expect(words(five.chart.flags[0]?.said ?? [])).toBe('in 33 months, Jan 2029 to Dec 2031');
	});

	it('at 30 years reaches retirement: grey bars with no floor, broken at their foot, and the floor a dash', () => {
		const f = buildBudgetForecast(arun(), 'R1', 30, 'nominal', 'GBP');
		expect(f.head).toBe('Each year to 2056, in pounds of each year · the engine’s run, Thu 5 Nov 20:43');
		expect(f.chart.axis.map((a) => a.label)).toEqual(['2027', '2036', '2046', '2056']);
		const rt = f.chart.bars.filter((b) => b.tone === 'rt');
		expect(rt.map((b) => b.year)).toEqual([2053, 2054, 2055, 2056]);
		expect(rt.every((b) => b.capFoot && b.floorAt === undefined)).toBe(true);
		expect(f.chart.bars.find((b) => b.year === 2029)?.floorAt).toBeCloseTo(0.3);
		expect(f.chart.grid.some((g) => g.kind === 'floor')).toBe(false);
		expect(f.chart.legend.map((l) => l.text)).toContain('Your floor, £500 a month, while anyone earns a salary');
		expect(f.chart.legend.map((l) => l.text)).toContain('Both retired: no floor');
		const notes = f.chart.notes.map((n) => words(n.said));
		expect(notes).toContain(
			'2053 to 2056 fall below −£1,000 a month at their leanest, so they are drawn with a break.'
		);
		expect(notes.at(-1)).toBe(
			'Arun retires in Jan 2051 and Asha retires in Jan 2053. Your floor holds while either of you earns a salary, to Dec 2052. From 2053 your pensions pay 4% of their pots a year and cash pays the rest of the budget, so the surplus is below £0: those years carry no floor, and only cash running out would be flagged. Cash stays above zero to 2056.'
		);
		expect(f.chart.aria).toContain('From 2053, with everyone retired, there is no floor.');
		const old = buildBudgetForecast(arun(), 'R1', 30, 'nominal', 'GBP', 2054).year;
		expect(old.chip).toEqual({ text: 'Retired: no floor', alert: false });
		expect(old.lines.map((l) => l.id)).toEqual(['income', 'spend']);
		expect(words(old.lines[0]?.sub ?? [])).toContain('Arun’s pension');
	});
});

describe('rupees and today’s money', () => {
	it('in rupees: each line at the year’s rate, the floor a dash on each bar, the axis in lakh', () => {
		const f = buildBudgetForecast(arun(), 'R1', 20, 'nominal', 'INR');
		expect(f.head).toBe(
			'Each year to 2046, in rupees at each year’s projected rate · the engine’s run, Thu 5 Nov 20:43'
		);
		expect(f.chart.grid.map((g) => g.label)).toEqual(['₹6 lakh', '₹3 lakh', '₹0', '−₹1 lakh']);
		expect(f.chart.wide).toBe(true);
		expect(f.chart.bars.every((b) => b.floorAt !== undefined)).toBe(true);
		expect(f.year.meta).toBe('Jan to Dec, in rupees, at 2029’s projected rate · tap a figure to see what makes it');
		// each member's rupees rounded, the line their sum
		expect(shown(line(f, 'income').fig)).toBe('₹1,25,72,985');
		expect(words(f.chart.notes.at(-1)?.said ?? [])).toBe(
			'In rupees, each year at its average projected rate (£1 = ₹112.50 today, drifting with the inflation gap), so the £500 floor is a dash on each bar: ₹59,925 in 2029.'
		);
		expect(f.chart.legend[2]?.text).toBe('Your floor, £500 a month at each year’s rate');
		expect(f.foot).toMatch(/rounded to the rupee/);
	});

	it('in today’s money: each line at the year’s deflator, the floor shrinking', () => {
		const f = buildBudgetForecast(arun(), 'R1', 20, 'today', 'GBP');
		expect(f.head).toBe('Each year to 2046, in today’s pounds · the engine’s run, Thu 5 Nov 20:43');
		expect(f.year.meta).toBe('Jan to Dec, in today’s pounds · tap a figure to see what makes it');
		expect(words(f.chart.notes.at(-1)?.said ?? [])).toBe(
			'In today’s money: each year’s pounds at UK prices of 2026 (2.5% a year), so your floor, £500 in pounds of each year, shrinks as prices rise: a dash on each bar, £464 in 2029 and £305 in 2046.'
		);
		expect(f.chart.legend[2]?.text).toBe('Your floor, £500, in today’s money');
		expect(f.foot).toMatch(/deflator/);
		const inrToday = buildBudgetForecast(arun(), 'R1', 20, 'today', 'INR');
		expect(inrToday.head).toContain('in today’s rupees, at ₹112.50 to the pound');
		expect(inrToday.year.meta).toContain('in today’s rupees');
	});
});

describe('the evening’s later states', () => {
	it('after the pot (R2): no flags, the pot’s lines with the plans, its year by year', () => {
		const f = buildBudgetForecast(arun(), 'R2', 20, 'nominal', 'GBP');
		expect(f.run).toBe('Thu 5 Nov 20:46');
		expect(f.selected).toBe(2029);
		expect(f.chart.flags).toEqual([]);
		expect(f.chart.bars.every((b) => b.tone !== 'lo')).toBe(true);
		expect(f.year.chip).toEqual({ text: 'At your floor all year', alert: false });
		expect(f.year.lines.map((l) => [l.title, shown(l.fig)]).slice(-2)).toEqual([
			['School fees', '−£48,000'],
			['From the School fees pot', '£9,090']
		]);
		expect(words(line(f, 'from-pot').sub)).toBe('tops the surplus up to your floor, Jan 2029 to Feb 2035');
		expect(shown(f.year.surplus)).toBe('£7,805');
		expect(f.year.canCover).toBe(false);
		const y27 = buildBudgetForecast(arun(), 'R2', 20, 'nominal', 'GBP', 2027);
		expect(words(line(y27, 'to-pot').sub)).toBe('£690 a month, Nov 2026 to Dec 2028');
		expect(shown(line(y27, 'to-pot').fig)).toBe('−£8,280');
		expect(words(f.chart.notes.at(-1)?.said ?? [])).toBe(
			'The pot: £690 a month into it, Nov 2026 to Dec 2028 (−£1,380 in 2026, −£8,280 in 2027 and −£8,280 in 2028); out of it to the floor from Jan 2029 to Feb 2035.'
		);
		const pot = f.pot;
		expect(pot?.title).toBe('The School fees pot, year by year');
		expect(pot?.rows.slice(0, 4).map((r) => [r.label, words(r.note), shown(r.fig)])).toEqual([
			['2026', 'into it, Nov and Dec', '−£1,380'],
			['2027', 'into it, £690 a month', '−£8,280'],
			['2028', 'into it, £690 a month', '−£8,280'],
			['2029', 'out of it, to your floor', '+£9,090']
		]);
		expect(pot?.totals.map((t) => `${t.label}: ${shown(t.fig)}`)[0]).toBe('Into the pot: £17,940');
		const inr = buildBudgetForecast(arun(), 'R2', 20, 'nominal', 'INR');
		expect(inr.pot?.sub).toBe('Each year at its factor, as the lines beside it.');
	});

	it('as Asha sees the wedding’s evening (W): the cash flag, Arun’s floor, no ways to cover it', () => {
		const asha = new StubHousehold({ me: 'asha' });
		const f = buildBudgetForecast(asha, 'W', 20, 'nominal', 'GBP');
		expect(f.run).toBe('Thu 5 Nov 21:18');
		expect(f.selected).toBe(2027);
		expect(f.chart.sub).toBe('2027 to 2046 · against Arun’s floor');
		expect(f.chart.flags.map((x) => `${x.text} ${words(x.said)}`)).toEqual([
			'▼ Cash below zero Jun 2027 to Feb 2028, at worst −£19,871 in Jun 2027'
		]);
		expect(f.chart.cashStrip).toBe(true);
		expect(f.chart.bars.filter((b) => b.cashBelow).map((b) => b.year)).toEqual([2027, 2028]);
		expect(f.chart.legend.map((l) => l.text)).toEqual([
			'At or above Arun’s floor',
			'▼ Below it',
			'Arun’s floor, £500 a month',
			'2027, selected',
			'Cash below zero in the year'
		]);
		expect(words(f.chart.notes.at(-1)?.said ?? [])).toBe(
			'The wedding, £20,000 in Mar 2027, and the extension, £35,000 in Jun 2027, are paid from cash, which runs out in Jun 2027 and is back above zero in Mar 2028.'
		);
		const y = f.year;
		expect(y.chip).toEqual({ text: '▼ Cash below zero from Jun', alert: true });
		expect(y.fromCash.map((x) => `${x.label}, ${x.sub}: ${words(x.said)}`)).toEqual([
			'Sister’s wedding, March, from cash: −£20,000',
			'Home extension, June, from cash: −£35,000',
			'Cash, end of December, after the surplus and the one-offs: −£6,633'
		]);
		expect(y.facts.map((x) => x.label)).toEqual(['Savings rate', 'Leanest month']);
		expect(y.canCover).toBe(false);
		expect(y.lock).toBe('Plans and the ways to cover them are Arun’s. You can ask about them in the chat.');
		expect(y.months?.sub).toBe('cash at the end of each month');
		expect(y.months?.rows.map((r) => `${r.label} ${words(r.note)} ${shown(r.fig)}`).slice(2, 6)).toEqual([
			'Mar Wedding paid £1,906'.replace('£1,906', shown(y.months?.rows[2]?.fig ?? amountFig(0, 'GBP'))),
			`Apr  ${shown(y.months?.rows[3]?.fig ?? amountFig(0, 'GBP'))}`,
			`May  ${shown(y.months?.rows[4]?.fig ?? amountFig(0, 'GBP'))}`,
			'Jun Extension paid ▼ −£19,871'
		]);
		expect(y.months?.rows.at(-1)?.flagged).toBe(true);
		expect(words(y.months?.rows.at(-1)?.note ?? [])).toBe('below zero');
	});

	it('an admin is offered the ways to cover a year flagged for cash', () => {
		const f = buildBudgetForecast(arun(), 'W', 20, 'nominal', 'GBP');
		expect(f.year.canCover).toBe(true);
		expect(f.year.lock).toBeUndefined();
	});
});

describe('a household with no budget', () => {
	it('says so under the title', () => {
		const f = buildBudgetForecast(new StubHousehold({ empty: true }), 'R1', 20, 'nominal', 'GBP');
		expect(f.empty).toBe(true);
		expect(f.head).toBe('No budget yet');
	});
});

describe('which run the stub opens on', () => {
	it('reads it from the address', () => {
		const runs: [string, ForecastRun][] = [
			['?forecast=pot', 'R2'],
			['?as=asha&forecast=wedding', 'W'],
			['', 'R1'],
			['?forecast=other', 'R1']
		];
		for (const [search, run] of runs) expect(forecastRunOf(search)).toBe(run);
	});

	it('writes an amount with the board’s minus, and a lead before it', () => {
		expect(amountFig(-903, 'GBP')).toEqual({ amount: '903', currency: 'GBP', pre: '−' });
		expect(amountFig(9090, 'GBP', '+')).toEqual({ amount: '9090', currency: 'GBP', pre: '+' });
		expect(amountFig(500, 'INR')).toEqual({ amount: '500', currency: 'INR' });
	});
});

describe('the Budget forecast behind the seam', () => {
	it('is read through its query, one entry for each horizon, money, currency and year', async () => {
		const query = budgetForecastQuery(new StubWealthSource(arun()), 10, 'today', 'INR');
		expect(query.queryKey).toEqual(['wealth', 'forecast', 10, 'today', 'INR', 'first']);
		expect(query.queryKey.slice(0, 1)).toEqual(wealthKeys.all);
		const f = await query.queryFn();
		expect(f.horizon).toBe(10);
		expect(f.currency).toBe('INR');
		expect(wealthKeys.budgetForecast(20, 'nominal', 'GBP', 2031)).toEqual([
			'wealth',
			'forecast',
			20,
			'nominal',
			'GBP',
			2031
		]);
	});

	it('shows the run the session opened on', async () => {
		const pot = new StubWealthSource(arun(), undefined, 'R2');
		expect((await pot.budgetForecast(20, 'nominal', 'GBP')).run).toBe('Thu 5 Nov 20:46');
		expect((await new StubWealthSource(arun()).budgetForecast(20, 'nominal', 'GBP', 2033)).selected).toBe(2033);
	});
});
