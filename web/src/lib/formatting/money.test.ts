import { describe, expect, it } from 'vitest';
import { formatMoney, isDecimal } from './money.ts';

describe('formatMoney', () => {
	it('formats each currency in its own locale, to the penny', () => {
		expect(formatMoney('1234567.5', 'GBP')).toBe('£1,234,567.50');
		expect(formatMoney('1234567.5', 'USD')).toBe('$1,234,567.50');
		expect(formatMoney('1234567.5', 'EUR')).toBe('€1,234,567.50');
	});

	it('groups rupees by lakh and crore', () => {
		expect(formatMoney('1234567.5', 'INR')).toBe('₹12,34,567.50');
		expect(formatMoney('123456789', 'INR', { whole: true })).toBe('₹12,34,56,789');
	});

	it('keeps every digit of a decimal string, with no float rounding', () => {
		expect(formatMoney('0.1', 'GBP')).toBe('£0.10');
		expect(formatMoney('9007199254740993.25', 'GBP')).toBe('£9,007,199,254,740,993.25');
	});

	it('signs a gain and a loss when asked, and never a zero', () => {
		expect(formatMoney('1200', 'GBP', { signed: true })).toBe('+£1,200.00');
		expect(formatMoney('-1200', 'GBP', { signed: true })).toBe('-£1,200.00');
		expect(formatMoney('0', 'GBP', { signed: true })).toBe('£0.00');
	});

	it('shortens to L and Cr in rupees, and to k, m and bn elsewhere', () => {
		expect(formatMoney('3450000', 'INR', { compact: true })).toBe('₹34.5 L');
		expect(formatMoney('123400000', 'INR', { compact: true })).toBe('₹12.3 Cr');
		expect(formatMoney('1250000', 'GBP', { compact: true })).toBe('£1.3m');
		expect(formatMoney('-48200', 'GBP', { compact: true })).toBe('-£48.2k');
		expect(formatMoney('2500000000', 'USD', { compact: true, signed: true })).toBe('+$2.5bn');
	});

	it('moves up a unit when rounding reaches it, never showing 1,000k or 100 L', () => {
		expect(formatMoney('999999', 'GBP', { compact: true })).toBe('£1m');
		expect(formatMoney('999950', 'GBP', { compact: true })).toBe('£1m');
		expect(formatMoney('999.6', 'GBP', { compact: true })).toBe('£1k');
		expect(formatMoney('9999999', 'INR', { compact: true })).toBe('₹1 Cr');
		expect(formatMoney('99950', 'INR', { compact: true })).toBe('₹1 L');
	});

	it('rounds half away from zero on the digits themselves, where a float would land short', () => {
		expect(formatMoney('1.005', 'GBP')).toBe('£1.01');
		expect(formatMoney('-1.005', 'GBP')).toBe('-£1.01');
		expect(formatMoney('0.995', 'GBP', { whole: true })).toBe('£1');
		expect(formatMoney('999.995', 'INR')).toBe('₹1,000.00');
	});

	it('uses no Intl, so a runtime whose Intl differs reads the same (MA-165)', () => {
		const real = Intl.NumberFormat;
		Object.defineProperty(Intl, 'NumberFormat', {
			configurable: true,
			value: () => {
				throw new RangeError('signDisplay value is invalid.');
			}
		});
		try {
			expect(formatMoney('1234567.5', 'INR')).toBe('₹12,34,567.50');
			expect(formatMoney('-48200', 'GBP', { compact: true })).toBe('-£48.2k');
		} finally {
			Object.defineProperty(Intl, 'NumberFormat', { configurable: true, value: real });
		}
	});

	it('never shows a minus on zero', () => {
		expect(formatMoney('-0', 'GBP')).toBe('£0.00');
		expect(formatMoney('-0.001', 'GBP')).toBe('£0.00');
	});

	it('shows small amounts whole when compact', () => {
		expect(formatMoney('850.40', 'GBP', { compact: true })).toBe('£850');
		expect(formatMoney('94999', 'INR', { compact: true })).toBe('₹94,999');
	});

	it('refuses anything that is not a decimal amount', () => {
		expect(isDecimal('12.5')).toBe(true);
		expect(isDecimal('1e5')).toBe(false);
		expect(() => formatMoney('12,50', 'GBP')).toThrow(TypeError);
		expect(() => formatMoney('NaN', 'GBP')).toThrow(TypeError);
	});
});
