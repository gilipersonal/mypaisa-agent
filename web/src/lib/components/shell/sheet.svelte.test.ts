import { describe, expect, it } from 'vitest';
import {
	ChatSheet,
	PULL_CLOSE,
	SHEET_FROM,
	SHEET_MARGIN,
	SHEET_TALLEST,
	SHEET_WIDTH,
	SIDEBAR_FROM,
	chatKeyLabel,
	chatPlace,
	dimDuring,
	isChatShortcut,
	isMac,
	pullCloses,
	pullOffset,
	sheetFrame,
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
	it('is the sheet from 600 px, with the tab bar or the sidebar, and the Chat tab’s page under it', () => {
		expect(SHEET_FROM).toBe(600);
		expect(SIDEBAR_FROM).toBe(1024);
		expect(chatPlace(599)).toBe('tab');
		expect(chatPlace(390)).toBe('tab');
		expect(chatPlace(320)).toBe('tab');
		for (const w of [600, 768, 834, 1023, 1024, 1120, 1280, 1392, 1393, 1440, 1920]) expect(chatPlace(w)).toBe('sheet');
	});
});

describe('the sheet’s frame', () => {
	const centre = (w: number, h: number) => {
		const f = sheetFrame(w, h);
		return { x: f.left + f.width / 2, y: f.top + f.height / 2, f };
	};

	it('is centred in the window across and down, with the sidebar (desktop) and with the tab bar (tablet)', () => {
		for (const [w, h] of [
			[1920, 1080],
			[1440, 900],
			[1280, 800],
			[1024, 768],
			[1023, 768],
			[834, 1194],
			[768, 1024],
			[600, 800],
			[1101, 701]
		] as const) {
			const { x, y, f } = centre(w, h);
			expect(Math.abs(x - w / 2), `${String(w)}×${String(h)} across`).toBeLessThanOrEqual(0.5);
			expect(Math.abs(y - h / 2), `${String(w)}×${String(h)} down`).toBeLessThanOrEqual(0.5);
			expect(Math.abs(f.top - (h - f.top - f.height)), 'the same margin above and below').toBeLessThanOrEqual(1);
		}
	});

	it('does not stop clear of the sidebar any more: at 1024 px it crosses the sidebar’s edge, centred', () => {
		expect(sheetFrame(1024, 768)).toMatchObject({ left: 212, width: 600 });
	});

	it('is 600 px wide, or the window less 16 px a side when narrower', () => {
		expect(sheetFrame(1440, 900).width).toBe(SHEET_WIDTH);
		expect(sheetFrame(768, 1024).width).toBe(SHEET_WIDTH);
		expect(sheetFrame(632, 800).width).toBe(SHEET_WIDTH);
		expect(sheetFrame(600, 800)).toMatchObject({ left: SHEET_MARGIN.inline, width: 600 - 2 * SHEET_MARGIN.inline });
	});

	it('is 760 px tall at most, or the window less 40 px above and below', () => {
		expect(sheetFrame(1440, 900)).toMatchObject({ top: 70, height: SHEET_TALLEST });
		expect(sheetFrame(768, 1024)).toMatchObject({ top: 132, height: SHEET_TALLEST });
		expect(sheetFrame(1280, 800)).toMatchObject({ top: SHEET_MARGIN.block, height: 800 - 2 * SHEET_MARGIN.block });
		expect(sheetFrame(1024, 600)).toMatchObject({ top: 40, height: 520 });
	});

	it('waits wholly below the window when closed, its shadow too', () => {
		for (const [w, h] of [
			[1440, 900],
			[1920, 1440],
			[768, 1024]
		] as const) {
			const f = sheetFrame(w, h);
			expect(f.top + f.away).toBeGreaterThan(h + 24);
		}
	});

	it('never has a size under nothing', () => {
		expect(sheetFrame(0, 0)).toMatchObject({ width: 0, height: 0 });
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

	it('goes without a focus to give back when the window narrows under 600 px', () => {
		const sheet = new ChatSheet();
		sheet.show(opener());
		sheet.drop();
		expect(sheet.open).toBe(false);
		expect(sheet.hide()).toBeUndefined();
	});
});
