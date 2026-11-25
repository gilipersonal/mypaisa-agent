import { describe, expect, it } from 'vitest';
import { MASK, hideAmounts, maskAmounts, maskedMoney } from './mask.ts';

describe('amounts inside words', () => {
	it('are masked in privacy mode, each keeping its currency', () => {
		expect(maskAmounts('Put £5,000 in Monzo savings', true)).toBe(`Put £${MASK} in Monzo savings`);
		expect(maskAmounts('₹39,390 a month, then −£1,456.46 and + $20', true)).toBe(
			`₹${MASK} a month, then £${MASK} and + $${MASK}`
		);
		expect(maskAmounts('€ 12 and 57 years', true)).toBe(`€${MASK} and 57 years`);
	});

	it('are left alone with privacy off', () => {
		expect(maskAmounts('Put £5,000 in Monzo savings', false)).toBe('Put £5,000 in Monzo savings');
		expect(hideAmounts('We owe £246,743, 36% of what we own', false)).toBe('We owe £246,743, 36% of what we own');
	});

	it('are never read out: a screen reader hears "hidden"', () => {
		expect(hideAmounts('We owe £246,743, 36% of what we own', true)).toBe('We owe hidden, 36% of what we own');
	});
});

describe('maskedMoney', () => {
	it('shows the figure when privacy is off', () => {
		expect(maskedMoney('1500', 'GBP', false)).toBe('£1,500.00');
	});

	it('hides the figure and its length, keeping the currency, when privacy is on', () => {
		expect(maskedMoney('1500', 'GBP', true)).toBe(`£${MASK}`);
		expect(maskedMoney('123456789', 'INR', true)).toBe(`₹${MASK}`);
		expect(maskedMoney('5', 'USD', true)).toBe(maskedMoney('5000000', 'USD', true));
	});
});
