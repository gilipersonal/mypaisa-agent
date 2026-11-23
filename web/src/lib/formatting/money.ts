/** Money as members read it (MA-194, ARCHITECTURE §4.8). Amounts arrive as decimal strings, never floats, and are
 * formatted from the string, so no figure is rounded twice. INR groups by lakh and crore (12,34,567.00) and
 * shortens to L and Cr; the other currencies group by thousands and shorten to k and m.
 *
 * No `Intl` here (MA-165): this file runs in browsers and under Hermes, whose `Intl` throws on `signDisplay: 'negative'`
 * and has no exact decimal strings. Digits and grouping are plain string work, so both doors read the same to the penny. */
export const CURRENCIES = ['GBP', 'INR', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** A decimal amount as the API sends it, as a string: an optional minus, digits, an optional fraction. */
export type Decimal = string;

const SYMBOL: Record<Currency, string> = { GBP: '£', INR: '₹', USD: '$', EUR: '€' };
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

/** The amount in units of 10^-digits, rounded half away from zero on its own digits, with no float involved. */
function roundedUnits(amount: Decimal, digits: number): bigint {
	const [whole = '0', fraction = ''] = amount.replace('-', '').split('.');
	const units = BigInt(whole + fraction.padEnd(digits, '0').slice(0, digits));
	return fraction.charAt(digits) >= '5' ? units + 1n : units;
}

function grouped(digits: string, currency: Currency): string {
	return digits.replace(currency === 'INR' ? /\B(?=(\d\d)*\d{3}$)/g : /\B(?=(\d{3})+$)/g, ',');
}

function signFor(negative: boolean, zero: boolean, signed: boolean | undefined): string {
	if (zero) return '';
	if (negative) return '-';
	return signed ? '+' : '';
}

export function formatMoney(amount: Decimal, currency: Currency, options: MoneyOptions = {}): string {
	assertDecimal(amount);
	if (options.compact) return formatCompact(amount, currency, options);
	const places = options.whole ? 0 : 2;
	const units = roundedUnits(amount, places);
	const digits = units.toString().padStart(places + 1, '0');
	const whole = grouped(digits.slice(0, digits.length - places), currency);
	const fraction = places > 0 ? `.${digits.slice(-places)}` : '';
	const sign = signFor(amount.startsWith('-'), units === 0n, options.signed);
	return `${sign}${SYMBOL[currency]}${whole}${fraction}`;
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
	const tenths = Math.round((Math.abs(value) / step.size) * 10);
	const whole = grouped(String(Math.trunc(tenths / 10)), currency);
	const fraction = tenths % 10 === 0 ? '' : `.${String(tenths % 10)}`;
	return `${signFor(value < 0, false, options.signed)}${SYMBOL[currency]}${whole}${fraction}${step.suffix}`;
}
