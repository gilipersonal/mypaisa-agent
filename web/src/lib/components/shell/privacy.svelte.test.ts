import { describe, expect, it } from 'vitest';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { PrivacyMode, providePrivacy, usePrivacy } from './privacy.svelte.ts';

function memory(): KeyValue & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k) => data.get(k) ?? null,
		setItem: (k, v) => void data.set(k, v),
		removeItem: (k) => void data.delete(k)
	};
}

const blocked: KeyValue = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('blocked');
	},
	removeItem: () => {
		throw new Error('blocked');
	}
};

describe('privacy mode', () => {
	it('starts off, and keeps the choice in this browser', () => {
		const store = memory();
		const mode = new PrivacyMode(store);
		expect(mode.on).toBe(false);
		mode.toggle();
		expect(mode.on).toBe(true);
		expect(new PrivacyMode(store).on).toBe(true);
		mode.toggle();
		expect(store.data.size).toBe(0);
		expect(new PrivacyMode(store).on).toBe(false);
	});

	it('works for the page alone when storage is missing or blocked', () => {
		const none = new PrivacyMode(undefined);
		none.toggle();
		expect(none.on).toBe(true);
		const mode = new PrivacyMode(blocked);
		expect(mode.on).toBe(false);
		mode.toggle();
		expect(mode.on).toBe(true);
		mode.toggle();
		expect(mode.on).toBe(false);
	});

	it('is provided only inside the shell', () => {
		expect(() => usePrivacy()).toThrow();
		expect(() => {
			providePrivacy(new PrivacyMode(undefined));
		}).toThrow();
	});
});
