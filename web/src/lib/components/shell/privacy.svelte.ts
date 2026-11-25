/** Privacy mode for the web door (ARCHITECTURE §13; board Browser · Dashboard, privacy on): one switch, the eye in a
 * page's head, that hides every amount on every page and in the chat beside it. The choice is kept in this browser
 * until the member's settings hold it (MA-171). */
import { getContext, setContext } from 'svelte';
import type { KeyValue } from '#lib/chat/outbox.ts';

const STORE_KEY = 'mp.privacy';

export class PrivacyMode {
	on = $state(false);

	constructor(private readonly store: KeyValue | undefined) {
		try {
			this.on = store?.getItem(STORE_KEY) === '1';
		} catch {
			this.on = false;
		}
	}

	toggle(): void {
		this.on = !this.on;
		try {
			if (this.on) this.store?.setItem(STORE_KEY, '1');
			else this.store?.removeItem(STORE_KEY);
		} catch {
			// blocked storage: the choice lasts for this page only
		}
	}
}

const KEY = Symbol('mp.privacy');

export function providePrivacy(mode: PrivacyMode): void {
	setContext(KEY, mode);
}

export function usePrivacy(): PrivacyMode {
	const mode = getContext<PrivacyMode | undefined>(KEY);
	if (!mode) throw new Error('privacy mode is used outside the shell that provides it');
	return mode;
}
