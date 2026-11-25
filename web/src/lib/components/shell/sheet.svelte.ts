/** The chat as a sheet over the page (MA-357, Web v4 · Chat sheet, picked in MA-355 a 1a): from 1024 px the chat is
 * always this sheet, 600 px wide over a dimmed page, never a column beside it and never a drawer; under 1024 px it is
 * the Chat tab. It opens from the sidebar's Chat, ⌘J on a Mac (Windows has no shortcut: Ctrl and J is the browser's
 * Downloads), a page's Ask or Update, or a question typed into ⌘K; it closes on Esc, its close button, a click on the
 * dimmed page, its grabber, and ⌘J again, and the focus goes back to whatever opened it. */

/** From this window width the chat is the sheet; under it, the Chat tab. */
export const SHEET_FROM = 1024;

export type ChatPlace = 'sheet' | 'tab';

export function chatPlace(windowWidth: number): ChatPlace {
	return windowWidth >= SHEET_FROM ? 'sheet' : 'tab';
}

export function isMac(platform: string): boolean {
	return /mac|iphone|ipad/i.test(platform);
}

/** The shortcut the sidebar's Chat row shows: ⌘J on a Mac, nothing elsewhere. */
export function chatKeyLabel(platform: string): string | undefined {
	return isMac(platform) ? '⌘J' : undefined;
}

type KeyLike = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

/** ⌘J on a Mac opens and closes the chat; no other platform has a shortcut, and Ctrl+J stays the browser's. */
export function isChatShortcut(event: KeyLike, mac: boolean): boolean {
	return mac && event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'j';
}

/** How far the grabber must be pulled down before the sheet lets go, in px, or how fast a shorter flick must be. */
export const PULL_CLOSE = 96;
const FLICK = 0.6; // px per ms
const FLICK_MIN = 24;

/** Where the sheet sits while its grabber is pulled: down with the pointer, never up past where it rests. */
export function pullOffset(dy: number): number {
	return Math.max(0, dy);
}

/** Whether a pull that ended `dy` px down after `ms` lets the sheet go. */
export function pullCloses(dy: number, ms: number): boolean {
	if (dy >= PULL_CLOSE) return true;
	return dy >= FLICK_MIN && ms > 0 && dy / ms >= FLICK;
}

/** How dim the page stays while the sheet is pulled `dy` px of its `height`: it lightens as the sheet goes. */
export function dimDuring(dy: number, height: number): number {
	if (height <= 0) return 1;
	return Math.min(1, Math.max(0, 1 - pullOffset(dy) / height));
}

/** Tab stays inside the sheet: from the last stop Tab wraps to the first (Close), and from the first Shift+Tab wraps
 * to the last. Returns the index to focus, or -1 to let the browser move as usual. */
export function trapIndex(count: number, current: number, back: boolean): number {
	if (count === 0) return -1;
	if (current === -1) return back ? count - 1 : 0;
	if (back && current === 0) return count - 1;
	if (!back && current === count - 1) return 0;
	return -1;
}

export interface Focusable {
	focus(options?: FocusOptions): void;
	readonly isConnected: boolean;
}

/** Whether the sheet is open, and who opened it, so closing gives the focus back there. */
export class ChatSheet {
	open = $state(false);
	#opener: Focusable | undefined;

	/** Opens the sheet; `opener` is what gets the focus back when it closes. A second show keeps the first opener. */
	show(opener?: Focusable | null): void {
		if (!this.open) this.#opener = opener ?? undefined;
		this.open = true;
	}

	/** Closes the sheet and returns what should take the focus back: the opener, if it is still on the page. */
	hide(): Focusable | undefined {
		if (!this.open) return undefined;
		this.open = false;
		const back = this.#opener;
		this.#opener = undefined;
		return back?.isConnected ? back : undefined;
	}

	/** ⌘J and the sidebar's Chat: open it if closed, close it if open. Returns what takes the focus back on a close. */
	toggle(opener?: Focusable | null): Focusable | undefined {
		if (this.open) return this.hide();
		this.show(opener);
		return undefined;
	}

	/** The window went under 1024 px: the sheet goes, and nothing takes the focus back (the Chat tab is the chat). */
	drop(): void {
		this.open = false;
		this.#opener = undefined;
	}
}
