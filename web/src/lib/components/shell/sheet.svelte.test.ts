import { describe, expect, it } from 'vitest';
import {
	ChatSheet,
	PULL_CLOSE,
	SHEET_FROM,
	chatKeyLabel,
	chatPlace,
	dimDuring,
	isChatShortcut,
	isMac,
	pullCloses,
	pullOffset,
	trapIndex,
	type Focusable
} from './sheet.svelte.ts';

function key(over: Partial<KeyboardEvent> = {}) {
	return { key: 'j', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...over };
}

function opener(connected = true): Focusable & { focused: number } {
	return {
		focused: 0,
		isConnected: connected,
		focus() {
			this.focused += 1;
		}
	};
}

describe('the width rule', () => {
	it('is the sheet from 1024 px at every width, and the Chat tab under it', () => {
		expect(SHEET_FROM).toBe(1024);
		expect(chatPlace(1023)).toBe('tab');
		expect(chatPlace(390)).toBe('tab');
		for (const w of [1024, 1120, 1280, 1392, 1393, 1440, 1920]) expect(chatPlace(w)).toBe('sheet');
	});
});

describe('⌘J', () => {
	it('opens and closes the chat on a Mac', () => {
		expect(isMac('MacIntel')).toBe(true);
		expect(isChatShortcut(key({ metaKey: true }), true)).toBe(true);
		expect(isChatShortcut(key({ metaKey: true, key: 'J' }), true)).toBe(true);
	});

	it('is nothing on Windows: Ctrl+J stays the browser’s Downloads', () => {
		expect(isMac('Win32')).toBe(false);
		expect(isChatShortcut(key({ ctrlKey: true }), false)).toBe(false);
		expect(isChatShortcut(key({ metaKey: true }), false)).toBe(false);
		expect(isChatShortcut(key({ ctrlKey: true }), true)).toBe(false);
	});

	it('needs ⌘ alone with J', () => {
		expect(isChatShortcut(key(), true)).toBe(false);
		expect(isChatShortcut(key({ metaKey: true, shiftKey: true }), true)).toBe(false);
		expect(isChatShortcut(key({ metaKey: true, altKey: true }), true)).toBe(false);
		expect(isChatShortcut(key({ metaKey: true, key: 'k' }), true)).toBe(false);
	});

	it('is shown beside Chat on a Mac only', () => {
		expect(chatKeyLabel('MacIntel')).toBe('⌘J');
		expect(chatKeyLabel('Win32')).toBeUndefined();
		expect(chatKeyLabel('Linux x86_64')).toBeUndefined();
	});
});

describe('the grabber', () => {
	it('follows the pointer down, never up', () => {
		expect(pullOffset(-40)).toBe(0);
		expect(pullOffset(30)).toBe(30);
	});

	it('lets go past the pull distance, or on a quick flick', () => {
		expect(pullCloses(PULL_CLOSE, 2000)).toBe(true);
		expect(pullCloses(PULL_CLOSE - 1, 2000)).toBe(false);
		expect(pullCloses(40, 50)).toBe(true);
		expect(pullCloses(10, 5)).toBe(false);
		expect(pullCloses(40, 0)).toBe(false);
	});

	it('lightens the dim as the sheet goes', () => {
		expect(dimDuring(0, 800)).toBe(1);
		expect(dimDuring(400, 800)).toBe(0.5);
		expect(dimDuring(1600, 800)).toBe(0);
		expect(dimDuring(-50, 800)).toBe(1);
		expect(dimDuring(10, 0)).toBe(1);
	});
});

describe('Tab inside the sheet', () => {
	it('wraps from the last stop to Close, and back', () => {
		expect(trapIndex(5, 4, false)).toBe(0);
		expect(trapIndex(5, 0, true)).toBe(4);
	});

	it('lets the browser move between the stops in the middle', () => {
		expect(trapIndex(5, 2, false)).toBe(-1);
		expect(trapIndex(5, 2, true)).toBe(-1);
	});

	it('brings a focus from outside back in', () => {
		expect(trapIndex(5, -1, false)).toBe(0);
		expect(trapIndex(5, -1, true)).toBe(4);
		expect(trapIndex(0, -1, false)).toBe(-1);
	});
});

describe('the sheet', () => {
	it('opens, closes, and gives the focus back to what opened it', () => {
		const sheet = new ChatSheet();
		const chat = opener();
		expect(sheet.open).toBe(false);
		sheet.show(chat);
		expect(sheet.open).toBe(true);
		expect(sheet.hide()).toBe(chat);
		expect(sheet.open).toBe(false);
		expect(sheet.hide()).toBeUndefined();
	});

	it('keeps the first opener when asked to show again', () => {
		const sheet = new ChatSheet();
		const first = opener();
		sheet.show(first);
		sheet.show(opener());
		expect(sheet.hide()).toBe(first);
	});

	it('gives nothing back when the opener has left the page', () => {
		const sheet = new ChatSheet();
		sheet.show(opener(false));
		expect(sheet.hide()).toBeUndefined();
		sheet.show(null);
		expect(sheet.hide()).toBeUndefined();
	});

	it('toggles on ⌘J and the sidebar’s Chat', () => {
		const sheet = new ChatSheet();
		const chat = opener();
		expect(sheet.toggle(chat)).toBeUndefined();
		expect(sheet.open).toBe(true);
		expect(sheet.toggle(chat)).toBe(chat);
		expect(sheet.open).toBe(false);
	});

	it('goes without a focus to give back when the window narrows under 1024 px', () => {
		const sheet = new ChatSheet();
		sheet.show(opener());
		sheet.drop();
		expect(sheet.open).toBe(false);
		expect(sheet.hide()).toBeUndefined();
	});
});
