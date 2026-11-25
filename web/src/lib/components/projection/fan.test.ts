import { describe, expect, it } from 'vitest';
import { StubHousehold } from '#lib/stub/household.ts';
import { buildProjection } from '#lib/stub/projection.ts';
import type { Fan } from '#lib/wealth/projection.ts';
import { across, down, endLabels, fanRows, indexAt, midAt, placeMarks, scrubAt } from './fan.ts';
import { MONEY, VIEWS, moneyOf, viewOf } from './views.ts';

const fan = buildProjection(new StubHousehold(), 20, 'nominal', 'GBP').fan;

describe('where the fan’s parts sit', () => {
	it('gives the chart one row a year, in years from today', () => {
		const rows = fanRows(fan);
		expect(rows).toHaveLength(21);
		expect(rows[0]).toEqual({ at: 0, low: 457951, mid: 457951, high: 457951 });
		expect(rows[20]).toEqual({ at: 20, low: 2980000, mid: 3378000, high: 4055000 });
	});

	it('places a time across the plot and an amount down it, as the board does', () => {
		expect(across(fan, 0)).toBe('0.00%');
		expect(across(fan, 10)).toBe('50.00%');
		expect(down(fan, '4500000')).toBe('0.00%');
		expect(down(fan, 0)).toBe('100.00%');
		expect(down(fan, '1000000')).toBe('77.78%');
	});

	it('reads the middle path between two years, so a mark sits on the line', () => {
		const rows = fanRows(fan);
		expect(midAt(rows, 10)).toBe(1472000);
		expect(midAt(rows, 9.5)).toBe((1331000 + 1472000) / 2);
		expect(midAt(rows, 0)).toBe(457951);
		expect(midAt(rows, 25)).toBe(3378000);
		expect(midAt([], 3)).toBe(0);
	});

	it('sorts the marks by shape: dots and squares on the line, ticks on the axis, a few with words', () => {
		const marks = placeMarks(fan);
		expect(marks.dots.map((d) => d.id)).toEqual(['2029-02-20', '2030-07-05', '2045-10-01']);
		expect(marks.squares.map((s) => s.id)).toEqual(['extension', 'car2']);
		expect(marks.ticks).toHaveLength(4);
		expect(marks.ticks[0]).toEqual({ id: '2026-12-14', left: across(fan, fan.marks[0]?.at ?? 0) });
		expect(marks.pills).toHaveLength(1);
		expect(marks.pills[0]?.label).toBe('HDFC loan ends');
		const hdfc = marks.dots[1];
		expect(hdfc).toEqual({ id: '2030-07-05', left: marks.pills[0]?.left, top: marks.pills[0]?.top });
		// between 2029's £681,000 and 2030's £780,000 on the plot
		expect(Number.parseFloat(hdfc?.top ?? '0')).toBeGreaterThan(Number.parseFloat(down(fan, 780000)));
		expect(Number.parseFloat(hdfc?.top ?? '0')).toBeLessThan(Number.parseFloat(down(fan, 681000)));
	});

	it('labels the fan’s end: the top of the band, the middle path, the foot', () => {
		expect(endLabels(fan)).toEqual([
			{ id: 'high', top: down(fan, 4055000), fig: { amount: '4055000', currency: 'GBP' }, quiet: true },
			{ id: 'mid', top: down(fan, 3378000), fig: { amount: '3378000', currency: 'GBP' }, quiet: false },
			{ id: 'low', top: down(fan, 2980000), fig: { amount: '2980000', currency: 'GBP' }, quiet: true }
		]);
		expect(endLabels({ ...fan, points: [] })).toEqual([]);
	});

	it('reads the fan at a year for the call-out', () => {
		expect(scrubAt(fan, 10)).toEqual({
			left: '50.00%',
			right: '50.00%',
			topHigh: down(fan, 1710000),
			topLow: down(fan, 1213000),
			year: '2036',
			mid: { amount: '1472000', currency: 'GBP' },
			low: { amount: '1213000', currency: 'GBP' },
			high: { amount: '1710000', currency: 'GBP' },
			flip: false
		});
		expect(scrubAt(fan, 0)?.year).toBe('Today');
		expect(scrubAt(fan, 15)).toMatchObject({ left: '75.00%', right: '25.00%', flip: true });
		expect(scrubAt(fan, 21)).toBeUndefined();
	});

	it('finds the year a pointer is over', () => {
		expect(indexAt(0.5, 20)).toBe(10);
		expect(indexAt(0.52, 20)).toBe(10);
		expect(indexAt(-0.2, 20)).toBe(0);
		expect(indexAt(1.4, 30)).toBe(30);
	});

	it('keeps a fan with no marks plain', () => {
		const bare: Fan = { ...fan, marks: [] };
		expect(placeMarks(bare)).toEqual({ dots: [], squares: [], ticks: [], pills: [] });
	});
});

describe('the Projection’s menus', () => {
	it('offers Net worth, Plans and Budget forecast, and falls back to Net worth', () => {
		expect(VIEWS.map((v) => v.label)).toEqual(['Net worth', 'Plans', 'Budget forecast']);
		expect(viewOf('plans').label).toBe('Plans');
		expect(viewOf('plans').soon).toMatch(/It arrives with its story in the plan/);
		expect(viewOf('budget').head).not.toBe('');
		expect(viewOf('elsewhere').id).toBe('net');
	});

	it('offers each year’s money or today’s', () => {
		expect(MONEY.map((m) => m.label)).toEqual(['Nominal', 'Today’s money']);
		expect(moneyOf('today').id).toBe('today');
		expect(moneyOf('gold').id).toBe('nominal');
	});
});
