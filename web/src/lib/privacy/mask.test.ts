import { describe, expect, it } from 'vitest';
import { MASK, maskedMoney } from './mask';

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
