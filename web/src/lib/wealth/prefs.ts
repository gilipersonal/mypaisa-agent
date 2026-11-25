/** The currency a member reads the totals in (board Browser · Dashboard, in rupees), and whose records they are looking
 * at (MA-358, Web v4 · Header controls): their own choices, which change no record. Kept in this browser until the
 * member's settings hold them (MA-213). */
import type { KeyValue } from '#lib/chat/outbox.ts';
import type { DisplayCurrency } from './overview.ts';

const KEY = 'mp.currency';
const VIEW_KEY = 'mp.view';

/** The household's own view: everyone's records, in full. */
export const HOUSEHOLD_VIEW = 'household';

export function readCurrency(store: KeyValue | undefined): DisplayCurrency {
	try {
		return store?.getItem(KEY) === 'INR' ? 'INR' : 'GBP';
	} catch {
		return 'GBP';
	}
}

export function saveCurrency(store: KeyValue | undefined, currency: DisplayCurrency): void {
	try {
		if (currency === 'GBP') store?.removeItem(KEY);
		else store?.setItem(KEY, currency);
	} catch {
		// blocked storage: the choice lasts for this page only
	}
}

/** Whose view: the household's until a member chooses Me or another member. A member the household does not know is
 * put right by the overview, which answers for the household instead. */
export function readView(store: KeyValue | undefined): string {
	try {
		const view = store?.getItem(VIEW_KEY);
		return view === null || view === undefined || view === '' ? HOUSEHOLD_VIEW : view;
	} catch {
		return HOUSEHOLD_VIEW;
	}
}

export function saveView(store: KeyValue | undefined, view: string): void {
	try {
		if (view === HOUSEHOLD_VIEW || !view) store?.removeItem(VIEW_KEY);
		else store?.setItem(VIEW_KEY, view);
	} catch {
		// blocked storage: the choice lasts for this page only
	}
}
