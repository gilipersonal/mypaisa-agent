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

const MONTHS = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december'
];
const MONTH = /^([a-z]{3,9})\.?\s+(\d{4})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

/** A month and its year, as a plan item's start or end is typed (MA-222): "Jul 2040", "july 2040" or "2040-07", sent
 * as "2040-07"; a year from 2000 to 2099. */
export function parseMonth(typed: string): string | undefined {
	const t = typed.trim().toLowerCase();
	const iso = ISO_MONTH.exec(t);
	const named = MONTH.exec(t);
	let year: string | undefined;
	let month = 0;
	if (iso) {
		year = iso[1];
		month = Number(iso[2]);
	} else if (named) {
		const [, word = '', y] = named;
		month = MONTHS.findIndex((m) => m.startsWith(word)) + 1;
		year = y;
	}
	if (!year || month < 1 || month > 12 || !year.startsWith('20')) return undefined;
	return `${year}-${String(month).padStart(2, '0')}`;
}

/** "2040-07" as the boards write it: "Jul 2040". */
export function monthLabel(value: string): string {
	const [year = '', month = '1'] = value.split('-');
	const name = MONTHS[Number(month) - 1] ?? '';
	return `${name.charAt(0).toUpperCase()}${name.slice(1, 3)} ${year}`;
}

/** The value a correction would send for what is typed into this figure. */
export function parseTyped(spec: Pick<EditSpec, 'kind'>, typed: string): Decimal | undefined {
	if (spec.kind === 'month') return parseMonth(typed);
	return spec.kind === 'rate' ? parseRate(typed) : parseAmount(typed);
}

/** Whether Save has something to save: a value that can be one, and is not the figure as it stands. */
export function changes(spec: Pick<EditSpec, 'kind' | 'current'>, typed: string): boolean {
	const value = parseTyped(spec, typed);
	return value !== undefined && value !== spec.current;
}

/** What the new value reads as, beside the old one: "4.8%", "3.5% a year", or the amount. */
export function after(spec: Pick<EditSpec, 'kind' | 'unit' | 'currency' | 'sign'>, value: Decimal): EditValue {
	if (spec.kind === 'month') return { text: monthLabel(value) };
	if (spec.kind === 'rate' || spec.currency === undefined) return { text: `${value}${spec.unit}` };
	return { fig: { amount: value, currency: spec.currency, ...(spec.sign ? { pre: spec.sign } : {}) } };
}

/** What to say while what is typed cannot be saved; nothing while the field is still empty. */
export function problem(spec: Pick<EditSpec, 'kind'>, typed: string): string | undefined {
	if (typed.trim() === '' || parseTyped(spec, typed) !== undefined) return undefined;
	if (spec.kind === 'month') return 'Type a month and its year: Jul 2040';
	return spec.kind === 'rate'
		? 'Type a rate from 0 to 100, with up to two decimals: 4.8'
		: 'Type a whole amount above nothing: 35,000';
}
