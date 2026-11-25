/** The currency a member reads the totals in (board Browser · Dashboard, in rupees): their own choice, which changes no
 * record. Kept in this browser until the member's settings hold it (MA-213). */
import type { KeyValue } from '#lib/chat/outbox.ts';
import type { DisplayCurrency } from './overview.ts';

const KEY = 'mp.currency';

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
