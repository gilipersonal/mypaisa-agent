import { describe, expect, it } from 'vitest';
import {
	APPEARANCES,
	CURRENCIES,
	appearanceIcon,
	appearanceLabel,
	appearanceOf,
	currencyLabel,
	currencyNote,
	currencyOf,
	isDisplayCurrency,
	nextEnabled,
	viewLabel,
	viewNote,
	whoLabel
} from './options.ts';

const views = [
	{ id: 'household', label: 'Household' },
	{ id: 'arun', label: 'Me' },
	{ id: 'asha', label: 'Asha' }
];

describe('the currency pill', () => {
	it('names pounds, rupees, dollars and euros, and lists the ones the records cannot show yet as not available', () => {
		expect(CURRENCIES.map((c) => `${c.symbol} ${c.name} ${c.code}`)).toEqual([
			'£ Pounds GBP',
			'₹ Rupees INR',
			'$ US dollars USD',
			'€ Euros EUR'
		]);
		expect(CURRENCIES.filter((c) => c.available).map((c) => c.code)).toEqual(['GBP', 'INR']);
		expect(isDisplayCurrency('USD')).toBe(false);
		expect(isDisplayCurrency('toString')).toBe(false);
	});

	it('says what is in force', () => {
		expect(currencyOf('INR').symbol).toBe('₹');
		expect(currencyLabel('GBP')).toBe('Amounts in pounds. Change the currency');
		expect(currencyLabel('INR')).toBe('Amounts in rupees. Change the currency');
	});

	it('gives the day’s rate under the menu when the rate line has it, and the plain note when it does not', () => {
		const line = '£1 = ₹112.50 · ECB reference rate, Fri 23 Oct · prices at the Fri 23 Oct close';
		expect(currencyNote(line)).toBe(
			'Totals convert at the ECB’s daily rate; each record keeps its own currency. £1 = ₹112.50, Fri 23 Oct.'
		);
		expect(currencyNote('£1 = ₹112.50')).toBe(
			'Totals convert at the ECB’s daily rate; each record keeps its own currency. £1 = ₹112.50.'
		);
		expect(currencyNote(undefined)).toBe('Totals convert at the ECB’s daily rate; each record keeps its own currency.');
		expect(currencyNote('no rate today')).toBe(
			'Totals convert at the ECB’s daily rate; each record keeps its own currency.'
		);
	});
});

describe('the whose-view pill', () => {
	it('names the view in force, and stands in for it before the views are read', () => {
		expect(viewLabel('asha', views)).toBe('Asha');
		expect(viewLabel('arun', views)).toBe('Me');
		expect(viewLabel('household', undefined)).toBe('Household');
		expect(viewLabel('asha', undefined)).toBe('Me');
		expect(whoLabel('Ashalatha Lakshminarayanan')).toBe('Whose view: Ashalatha Lakshminarayanan. Change it');
	});

	it('says whose records each view shows', () => {
		expect(views.map(viewNote)).toEqual([
			'Everyone’s records, in full',
			'Your own records and your joint half',
			'Asha’s records and their joint half'
		]);
		expect(viewNote({ id: 'asha', label: 'Asha', note: 'Her records and her joint half' })).toBe(
			'Her records and her joint half'
		);
	});
});

describe('the appearance pill', () => {
	it('offers System, Light and Dark, System following this device', () => {
		expect(APPEARANCES.map((a) => a.label)).toEqual(['System', 'Light', 'Dark']);
		expect(appearanceOf('system').note).toBe('Follows this device');
		expect(appearanceLabel('dark')).toBe('Appearance: Dark. Change it');
	});

	it('shows the sun or the moon in force, and under System the device’s of the moment', () => {
		expect(appearanceIcon('light', true)).toBe('sun');
		expect(appearanceIcon('dark', false)).toBe('moon');
		expect(appearanceIcon('system', false)).toBe('sun');
		expect(appearanceIcon('system', true)).toBe('moon');
	});
});

describe('moving through a sheet’s rows', () => {
	const rows = [false, false, true, true];
	it('skips the rows that cannot be chosen, and wraps', () => {
		expect(nextEnabled(rows, 0, 1)).toBe(1);
		expect(nextEnabled(rows, 1, 1)).toBe(0);
		expect(nextEnabled(rows, 0, -1)).toBe(1);
		expect(nextEnabled(rows, -1, 1)).toBe(0);
		expect(nextEnabled(rows, rows.length, -1)).toBe(1);
		expect(nextEnabled([true, true], 0, 1)).toBe(-1);
	});
});
