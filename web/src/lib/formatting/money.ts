/** Money as members read it (MA-194, ARCHITECTURE §4.8). Amounts arrive as decimal strings, never floats, and are
 * formatted from the string, so no figure is rounded twice. INR groups by lakh and crore (12,34,567.00) and
 * shortens to L and Cr; the other currencies group by thousands and shorten to k and m. */
export const CURRENCIES = ['GBP', 'INR', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** A decimal amount as the API sends it, as a string: an optional minus, digits, an optional fraction. */
export type Decimal = string;

const LOCALE: Record<Currency, string> = { GBP: 'en-GB', INR: 'en-IN', USD: 'en-US', EUR: 'en-IE' };
const DECIMAL = /^-?\d+(\.\d+)?$/;

export interface MoneyOptions {
	/** Shorten large amounts: £1.2m, ₹3.4 Cr. */
	compact?: boolean;
	/** Show a + on a gain. */
	signed?: boolean;
	/** Whole units only (the hero's big figure). */
	whole?: boolean;
}

export function isDecimal(value: string): boolean {
	return DECIMAL.test(value);
}

function assertDecimal(amount: Decimal): void {
	if (!isDecimal(amount)) throw new TypeError(`not a decimal amount: ${JSON.stringify(amount)}`);
}

export function formatMoney(amount: Decimal, currency: Currency, options: MoneyOptions = {}): string {
	assertDecimal(amount);
	if (options.compact) return formatCompact(amount, currency, options);
	const digits = options.whole ? 0 : 2;
	const fmt = new Intl.NumberFormat(LOCALE[currency], {
		style: 'currency',
		currency,
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		signDisplay: options.signed ? 'exceptZero' : 'negative'
	});
	// Intl formats a decimal string exactly (ES2023), so the amount is never parsed into a float first.
	return fmt.format(amount as `${number}`);
}

const INR_STEPS = [
	{ size: 10_000_000, suffix: ' Cr' },
	{ size: 100_000, suffix: ' L' }
] as const;
const WESTERN_STEPS = [
	{ size: 1_000_000_000, suffix: 'bn' },
	{ size: 1_000_000, suffix: 'm' },
	{ size: 1_000, suffix: 'k' }
] as const;

function formatCompact(amount: Decimal, currency: Currency, options: MoneyOptions): string {
	const value = Number(amount); // a display shortening only (the one float here): the exact figure is one tap away
	const steps = currency === 'INR' ? INR_STEPS : WESTERN_STEPS;
	// The unit is chosen after rounding to one decimal, so 999,999 reads £1m, never £1,000k.
	const step = steps.find((s) => Math.round((Math.abs(value) / s.size) * 10) / 10 >= 1);
	if (!step) return formatMoney(amount, currency, { ...options, compact: false, whole: true });
	const symbol = formatMoney('0', currency, { whole: true }).replace(/[\d\s.,]/g, '');
	const scaled = new Intl.NumberFormat(LOCALE[currency], {
		maximumFractionDigits: 1,
		signDisplay: options.signed ? 'exceptZero' : 'negative'
	}).format(Math.round((value / step.size) * 10) / 10);
	const sign = scaled.startsWith('-') || scaled.startsWith('+') ? scaled.charAt(0) : '';
	return `${sign}${symbol}${scaled.replace(/^[-+]/, '')}${step.suffix}`;
}
