/** What the header's four pills offer and say (MA-358, Web v4 · Header controls, b 1a): plain data and words, so the
 * pills, their menus and their sheets read one source, and a test reads it too. */
import type { DisplayCurrency } from '#lib/wealth/overview.ts';
import { HOUSEHOLD_VIEW } from '#lib/wealth/prefs.ts';
import type { Appearance } from '#lib/components/shell/palette.ts';

export type CurrencyCode = DisplayCurrency | 'USD' | 'EUR';

export interface CurrencyOption {
	code: CurrencyCode;
	symbol: string;
	name: string;
	/** In the overview's money now; dollars and euros are named, listed as not available until MA-213 shows them. */
	available: boolean;
}

/** Every currency the records can be shown in; the type makes a new one a compile error here until it is listed. */
const SHOWN: Record<DisplayCurrency, true> = { GBP: true, INR: true };

export function isDisplayCurrency(code: string): code is DisplayCurrency {
	return Object.hasOwn(SHOWN, code);
}

const POUNDS: CurrencyOption = { code: 'GBP', symbol: '£', name: 'Pounds', available: true };

export const CURRENCIES: readonly CurrencyOption[] = [
	POUNDS,
	...(
		[
			{ code: 'INR', symbol: '₹', name: 'Rupees' },
			{ code: 'USD', symbol: '$', name: 'US dollars' },
			{ code: 'EUR', symbol: '€', name: 'Euros' }
		] as const
	).map((c) => ({ ...c, available: isDisplayCurrency(c.code) }))
];

export const NOT_AVAILABLE = 'Not available yet';

export function currencyOf(code: DisplayCurrency): CurrencyOption {
	return CURRENCIES.find((c) => c.code === code) ?? POUNDS;
}

/** What a screen reader hears for the currency pill: "Amounts in pounds. Change the currency". */
export function currencyLabel(code: DisplayCurrency): string {
	return `Amounts in ${currencyOf(code).name.toLowerCase()}. Change the currency`;
}

const CURRENCY_NOTE = 'Totals convert at the ECB’s daily rate; each record keeps its own currency.';

/** The line under the currency menu, with the day's rate when the hero's rate line gives it: "£1 = ₹112.50 · ECB
 * reference rate, Fri 23 Oct · …" becomes "£1 = ₹112.50, Fri 23 Oct.". */
export function currencyNote(rate?: string): string {
	const [pair, source] = (rate ?? '').split(' · ');
	const day = /rate, (.+)$/.exec(source ?? '')?.[1];
	if (!pair?.includes('=')) return CURRENCY_NOTE;
	return `${CURRENCY_NOTE} ${pair}${day ? `, ${day}` : ''}.`;
}

export interface ViewChoice {
	id: string;
	label: string;
	/** The line under its name in the menu; worked out from the view when the data gives none. */
	note?: string;
}

export const ME = 'Me';

/** The line under a view's name: the board's words where they hold for anyone, a neutral pronoun where the household's
 * records do not say one. */
export function viewNote(v: ViewChoice): string {
	if (v.note) return v.note;
	if (v.id === HOUSEHOLD_VIEW) return 'Everyone’s records, in full';
	if (v.label === ME) return 'Your own records and your joint half';
	return `${v.label}’s records and their joint half`;
}

/** The name the pill shows for the view in force; before the views are read, the household's own name or "Me"'s
 * stand-in, so the bar never waits for the page. */
export function viewLabel(view: string, views: readonly ViewChoice[] | undefined): string {
	const found = views?.find((v) => v.id === view);
	if (found) return found.label;
	return view === HOUSEHOLD_VIEW ? 'Household' : ME;
}

export function whoLabel(label: string): string {
	return `Whose view: ${label}. Change it`;
}

export interface AppearanceOption {
	id: Appearance;
	label: string;
	note?: string;
}

const SYSTEM: AppearanceOption = { id: 'system', label: 'System', note: 'Follows this device' };

export const APPEARANCES: readonly AppearanceOption[] = [
	SYSTEM,
	{ id: 'light', label: 'Light' },
	{ id: 'dark', label: 'Dark' }
];

export function appearanceOf(a: Appearance): AppearanceOption {
	return APPEARANCES.find((o) => o.id === a) ?? SYSTEM;
}

export function appearanceLabel(a: Appearance): string {
	return `Appearance: ${appearanceOf(a).label}. Change it`;
}

/** The sun or the moon the appearance pill shows: the one in force, or under System the device's of the moment. */
export function appearanceIcon(a: Appearance, deviceDark: boolean): 'sun' | 'moon' {
	if (a === 'system') return deviceDark ? 'moon' : 'sun';
	return a === 'dark' ? 'moon' : 'sun';
}

/** The next enabled row from `from` in a list, going `step` (1 or -1) and wrapping; -1 when none is enabled. */
export function nextEnabled(disabled: readonly boolean[], from: number, step: 1 | -1): number {
	const n = disabled.length;
	for (let k = 1; k <= n; k++) {
		const i = (((from + step * k) % n) + n) % n;
		if (!disabled[i]) return i;
	}
	return -1;
}
