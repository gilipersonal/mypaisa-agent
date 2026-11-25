import { describe, expect, it } from 'vitest';
import { StubHousehold } from '#lib/stub/household.ts';
import { buildInvestedOwed } from '#lib/stub/home-charts.ts';
import { across, areaD, down, indexAt, lineD, stepIndex, xAt, yAt } from './line.ts';

const io = buildInvestedOwed(new StubHousehold(), 'household', 'GBP');
const five = io.horizons.find((h) => h.years === 5);
const ten = io.horizons.find((h) => h.years === 10);

describe('the plot’s places', () => {
	it('puts the board’s marks where the board does', () => {
		if (!five || !ten) throw new Error('no horizons');
		expect(down('178916', ten.max)).toBe('82.11%');
		expect(down('246743', ten.max)).toBe('75.33%');
		expect(across(20, ten.points)).toBe('16.39%');
		expect(down('226195', ten.max)).toBe('77.38%');
		expect(across(29, five.points)).toBe('46.77%');
		expect(down('267346', five.max)).toBe('44.30%');
		expect(down('209932', five.max)).toBe('56.26%');
	});

	it('keeps a mark inside the plot, and a box with no top at its base', () => {
		expect(yAt('900', '100')).toBe(0);
		expect(yAt('-5', '100')).toBe(100);
		expect(yAt('5', '0')).toBe(100);
		expect(xAt(0, 1)).toBe(0);
	});

	it('draws the lines through the drawn points only, and the wash down to the base', () => {
		if (!ten) throw new Error('no horizons');
		const inv = lineD(io.path, ten, 'invested');
		expect(inv.startsWith('M0.00 82.11 L0.82 81.75 L1.64 81.35')).toBe(true);
		expect(inv.split(' L')).toHaveLength(ten.points);
		expect(lineD(io.path, ten, 'owed').startsWith('M0.00 75.33 L0.82 75.44')).toBe(true);
		expect(areaD(io.path, ten).endsWith('L100.00 100 L0.00 100 Z')).toBe(true);
	});
});

describe('the scrub', () => {
	it('snaps the pointer to a month', () => {
		expect(indexAt(0, 63)).toBe(0);
		expect(indexAt(0.4677, 63)).toBe(29);
		expect(indexAt(1.2, 63)).toBe(62);
		expect(indexAt(-1, 63)).toBe(0);
	});

	it('steps a month, a year with Shift or Page, and to either end', () => {
		expect(stepIndex(10, 'ArrowRight', false, 63)).toBe(11);
		expect(stepIndex(10, 'ArrowUp', false, 63)).toBe(11);
		expect(stepIndex(10, 'ArrowLeft', false, 63)).toBe(9);
		expect(stepIndex(10, 'ArrowDown', true, 63)).toBe(0);
		expect(stepIndex(10, 'ArrowRight', true, 63)).toBe(22);
		expect(stepIndex(60, 'PageUp', false, 63)).toBe(62);
		expect(stepIndex(10, 'PageDown', false, 63)).toBe(0);
		expect(stepIndex(10, 'Home', false, 63)).toBe(0);
		expect(stepIndex(10, 'End', false, 63)).toBe(62);
		expect(stepIndex(10, 'a', false, 63)).toBeUndefined();
	});
});
