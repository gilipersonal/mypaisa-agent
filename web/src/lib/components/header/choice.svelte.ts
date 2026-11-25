/** Whose view and the currency (MA-358, Web v4 · Header controls): the member's two choices in the head of every page,
 * held once by the shell so they carry from page to page, and kept in this browser through #lib/wealth/prefs.ts. Neither
 * changes a record. */
import { getContext, setContext } from 'svelte';
import type { KeyValue } from '#lib/chat/outbox.ts';
import type { DisplayCurrency } from '#lib/wealth/overview.ts';
import { readCurrency, readView, saveCurrency, saveView } from '#lib/wealth/prefs.ts';

export class HeaderChoice {
	view = $state('household');
	currency = $state<DisplayCurrency>('GBP');

	constructor(private readonly store?: KeyValue) {
		this.view = readView(store);
		this.currency = readCurrency(store);
	}

	setView(v: string): void {
		this.view = v;
		saveView(this.store, v);
	}

	setCurrency(c: DisplayCurrency): void {
		this.currency = c;
		saveCurrency(this.store, c);
	}
}

const KEY = Symbol('mp.header.choice');

export function provideHeaderChoice(choice: HeaderChoice): HeaderChoice {
	setContext(KEY, choice);
	return choice;
}

export function useHeaderChoice(): HeaderChoice {
	const choice = getContext<HeaderChoice | undefined>(KEY);
	if (!choice) throw new Error('the header choice is used outside the shell that provides it');
	return choice;
}
