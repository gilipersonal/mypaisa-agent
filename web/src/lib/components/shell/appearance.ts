/** Appearance (MA-353's Settings row): the system's light or dark, or one forced. DS v1's tokens and Tailwind's `dark:`
 * read `.t-light` and `.t-dark` on the root, so forcing a theme is one class; the choice is kept in this browser. */
import type { KeyValue } from '#lib/chat/outbox.ts';
import type { Appearance } from './palette.ts';

const KEY = 'mp.appearance';

export function readAppearance(store: KeyValue | undefined): Appearance {
	try {
		const v = store?.getItem(KEY);
		return v === 'light' || v === 'dark' ? v : 'system';
	} catch {
		return 'system';
	}
}

export function saveAppearance(store: KeyValue | undefined, a: Appearance): void {
	try {
		if (a === 'system') store?.removeItem(KEY);
		else store?.setItem(KEY, a);
	} catch {
		// blocked storage: the choice lasts for this page only
	}
}

export function applyAppearance(root: Pick<Element, 'classList'>, a: Appearance): void {
	root.classList.toggle('t-light', a === 'light');
	root.classList.toggle('t-dark', a === 'dark');
}
