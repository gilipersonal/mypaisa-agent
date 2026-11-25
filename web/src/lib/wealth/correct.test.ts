import { describe, expect, it } from 'vitest';
import { after, changes, monthLabel, parseAmount, parseMonth, parseRate, parseTyped, problem } from './correct.ts';
import { DEFAULT_HORIZON, HORIZONS } from './projection.ts';

describe('a rate, as typed', () => {
	it('is a number from 0 to 100 with up to two decimals, written plainly', () => {
		expect(parseRate('4.8')).toBe('4.8');
		expect(parseRate(' 4.80 ')).toBe('4.8');
		expect(parseRate('04.17')).toBe('4.17');
		expect(parseRate('5.00')).toBe('5');
		expect(parseRate('0')).toBe('0');
		expect(parseRate('100')).toBe('100');
	});

	it('is nothing while it cannot be one', () => {
		for (const typed of ['', '4.', '.5', '4.175', '100.01', '101', '-2', '4,8', 'four', '4.8%']) {
			expect(parseRate(typed)).toBeUndefined();
		}
	});
});

describe('an amount, as typed', () => {
	it('is whole digits, with or without their commas, pounds or lakh', () => {
		expect(parseAmount('40000')).toBe('40000');
		expect(parseAmount('40,000')).toBe('40000');
		expect(parseAmount('5,93,849')).toBe('593849');
		expect(parseAmount(' 007 ')).toBe('7');
	});

	it('is nothing while it cannot be one', () => {
		for (const typed of ['', '0', '000', '-5', '40000.50', '4,0', 'lots', '1234567890123']) {
			expect(parseAmount(typed)).toBeUndefined();
		}
	});
});

describe('a correction before Save', () => {
	const rate = { kind: 'rate', unit: '%', current: '4.17' } as const;
	const amount = { kind: 'amount', unit: '', current: '35000', currency: 'GBP', sign: '−' } as const;

	it('reads what is typed by the figure’s kind', () => {
		expect(parseTyped(rate, '4.8')).toBe('4.8');
		expect(parseTyped(amount, '40,000')).toBe('40000');
		expect(parseTyped(amount, '4.8')).toBeUndefined();
	});

	it('has something to save only for a new value', () => {
		expect(changes(rate, '4.8')).toBe(true);
		expect(changes(rate, '4.170')).toBe(false);
		expect(changes(rate, 'x')).toBe(false);
		expect(changes({ kind: 'rate' }, '3.5')).toBe(true);
		expect(changes(amount, '35,000')).toBe(false);
	});

	it('shows the new value as the old one is shown', () => {
		expect(after(rate, '4.8')).toEqual({ text: '4.8%' });
		expect(after({ kind: 'rate', unit: '% a year' }, '3.5')).toEqual({ text: '3.5% a year' });
		expect(after(amount, '40000')).toEqual({ fig: { amount: '40000', currency: 'GBP', pre: '−' } });
		expect(after({ kind: 'amount', unit: '', currency: 'INR' }, '593849')).toEqual({
			fig: { amount: '593849', currency: 'INR' }
		});
		expect(after({ kind: 'amount', unit: ' units' }, '7')).toEqual({ text: '7 units' });
	});

	it('says what is wrong only once something is typed', () => {
		expect(problem(rate, '')).toBeUndefined();
		expect(problem(rate, '4.8')).toBeUndefined();
		expect(problem(rate, '480')).toMatch(/rate from 0 to 100/);
		expect(problem(amount, '4.8')).toMatch(/whole amount/);
	});
});

describe('a month, as typed (MA-222)', () => {
	it('is a month and its year, in words or as digits', () => {
		expect(parseMonth('Jul 2040')).toBe('2040-07');
		expect(parseMonth(' july 2040 ')).toBe('2040-07');
		expect(parseMonth('Sept. 2031')).toBe('2031-09');
		expect(parseMonth('2040-12')).toBe('2040-12');
		expect(monthLabel('2040-07')).toBe('Jul 2040');
	});

	it('is nothing while it cannot be one', () => {
		for (const typed of ['', 'Jul', '2040', 'Julyy 2040', 'Ju 2040', '2040-13', '2040-00', 'Jul 1999', 'soon']) {
			expect(parseMonth(typed)).toBeUndefined();
		}
	});

	it('reads before Save as the board writes it', () => {
		const month = { kind: 'month', unit: '', current: '2041-07' } as const;
		expect(parseTyped(month, 'Jul 2040')).toBe('2040-07');
		expect(changes(month, 'July 2041')).toBe(false);
		expect(changes(month, 'Jul 2040')).toBe(true);
		expect(after(month, '2040-07')).toEqual({ text: 'Jul 2040' });
		expect(problem(month, 'next year')).toMatch(/month and its year/);
		expect(problem(month, 'Jul 2040')).toBeUndefined();
	});
});

describe('the horizons', () => {
	it('are 5, 10, 20 and 30 years, opening at 20', () => {
		expect([...HORIZONS]).toEqual([5, 10, 20, 30]);
		expect(DEFAULT_HORIZON).toBe(20);
	});
});
