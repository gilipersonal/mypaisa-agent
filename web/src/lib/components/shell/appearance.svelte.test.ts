import { describe, expect, it } from 'vitest';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { applyAppearance, readAppearance, saveAppearance } from './appearance.ts';
import { AppearanceSetting, provideAppearance, useAppearance } from './appearance.svelte.ts';

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

function root() {
	const names = new Set<string>();
	return {
		names,
		classList: {
			toggle: (name: string, on?: boolean) => {
				if (on) names.add(name);
				else names.delete(name);
				return Boolean(on);
			}
		} as unknown as DOMTokenList
	};
}

describe('the appearance in force', () => {
	it('follows the system until one is chosen, and keeps the choice in this browser', () => {
		const store = memory();
		const setting = new AppearanceSetting(store);
		expect(setting.value).toBe('system');
		setting.set('dark');
		expect(setting.value).toBe('dark');
		expect(new AppearanceSetting(store).value).toBe('dark');
		setting.set('light');
		expect(readAppearance(store)).toBe('light');
		setting.set('system');
		expect(store.data.size).toBe(0);
		expect(new AppearanceSetting(store).value).toBe('system');
	});

	it('reads anything it does not know as System', () => {
		const store = memory();
		store.setItem('mp.appearance', 'sepia');
		expect(new AppearanceSetting(store).value).toBe('system');
	});

	it('lasts for the page alone when storage is missing or blocked', () => {
		for (const store of [undefined, blocked]) {
			const setting = new AppearanceSetting(store);
			expect(setting.value).toBe('system');
			setting.set('dark');
			expect(setting.value).toBe('dark');
		}
		expect(() => {
			saveAppearance(blocked, 'light');
		}).not.toThrow();
	});

	it('forces a theme with one class on the root, and none under System', () => {
		const r = root();
		applyAppearance(r, 'dark');
		expect([...r.names]).toEqual(['t-dark']);
		applyAppearance(r, 'light');
		expect([...r.names]).toEqual(['t-light']);
		applyAppearance(r, 'system');
		expect(r.names.size).toBe(0);
	});

	it('is provided only inside the shell', () => {
		expect(() => useAppearance()).toThrow();
		expect(() => provideAppearance(new AppearanceSetting())).toThrow();
	});
});
