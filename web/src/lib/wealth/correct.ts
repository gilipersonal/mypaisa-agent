/** A correction in place, checked before Save (ARCHITECTURE §4.10; board Web v4 · Projection, P5 and P6): what was typed
 * becomes the value that is sent, or nothing while it cannot be one. The door and whatever stands behind the seam
 * check with the same rules. Plain string work on the digits, so an amount is never a float. */
import type { Decimal } from '#lib/formatting/money.ts';
import type { EditSpec, EditValue } from './projection.ts';

const RATE = /^\d{1,3}(\.\d{1,2})?$/;
const AMOUNT = /^\d{1,3}(,?\d{2,3})*$/;
/** A plan item is never more than twelve figures long. */
const AMOUNT_DIGITS = 12;

/** A rate from 0 to 100 with at most two decimals, written without the noughts that say nothing: "4.80" is "4.8". */
export function parseRate(typed: string): string | undefined {
	const t = typed.trim();
	if (!RATE.test(t) || Number(t) > 100) return undefined;
	const [whole = '0', fraction = ''] = t.split('.');
	const kept = fraction.replace(/0+$/, '');
	return `${String(Number(whole))}${kept ? `.${kept}` : ''}`;
}

/** A whole amount above nothing, with or without its commas. */
export function parseAmount(typed: string): Decimal | undefined {
	const t = typed.trim();
	if (!AMOUNT.test(t)) return undefined;
	const digits = t.replace(/,/g, '').replace(/^0+/, '');
	if (digits === '' || digits.length > AMOUNT_DIGITS) return undefined;
	return digits;
}

/** The value a correction would send for what is typed into this figure. */
export function parseTyped(spec: Pick<EditSpec, 'kind'>, typed: string): Decimal | undefined {
	return spec.kind === 'rate' ? parseRate(typed) : parseAmount(typed);
}

/** Whether Save has something to save: a value that can be one, and is not the figure as it stands. */
export function changes(spec: Pick<EditSpec, 'kind' | 'current'>, typed: string): boolean {
	const value = parseTyped(spec, typed);
	return value !== undefined && value !== spec.current;
}

/** What the new value reads as, beside the old one: "4.8%", "3.5% a year", or the amount. */
export function after(spec: Pick<EditSpec, 'kind' | 'unit' | 'currency' | 'sign'>, value: Decimal): EditValue {
	if (spec.kind === 'rate' || spec.currency === undefined) return { text: `${value}${spec.unit}` };
	return { fig: { amount: value, currency: spec.currency, ...(spec.sign ? { pre: spec.sign } : {}) } };
}

/** What to say while what is typed cannot be saved; nothing while the field is still empty. */
export function problem(spec: Pick<EditSpec, 'kind'>, typed: string): string | undefined {
	if (typed.trim() === '' || parseTyped(spec, typed) !== undefined) return undefined;
	return spec.kind === 'rate'
		? 'Type a rate from 0 to 100, with up to two decimals: 4.8'
		: 'Type a whole amount above nothing: 35,000';
}
