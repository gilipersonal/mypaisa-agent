import { describe, expect, it } from 'vitest';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { HeaderChoice, provideHeaderChoice, useHeaderChoice } from './choice.svelte.ts';

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

describe('whose view and the currency in the head', () => {
	it('start on the household in pounds', () => {
		const choice = new HeaderChoice(memory());
		expect(choice.view).toBe('household');
		expect(choice.currency).toBe('GBP');
	});

	it('are remembered in this browser, so they carry from page to page and past a reload', () => {
		const store = memory();
		const choice = new HeaderChoice(store);
		choice.setView('asha');
		choice.setCurrency('INR');
		expect(choice.view).toBe('asha');
		expect(choice.currency).toBe('INR');
		const again = new HeaderChoice(store);
		expect(again.view).toBe('asha');
		expect(again.currency).toBe('INR');
		again.setView('household');
		again.setCurrency('GBP');
		expect(store.data.size).toBe(0);
	});

	it('last for the page alone when storage is missing or blocked', () => {
		for (const store of [undefined, blocked]) {
			const choice = new HeaderChoice(store);
			choice.setView('me');
			choice.setCurrency('INR');
			expect(choice.view).toBe('me');
			expect(choice.currency).toBe('INR');
		}
	});

	it('are provided only inside the shell', () => {
		expect(() => useHeaderChoice()).toThrow();
		expect(() => provideHeaderChoice(new HeaderChoice())).toThrow();
	});
});
