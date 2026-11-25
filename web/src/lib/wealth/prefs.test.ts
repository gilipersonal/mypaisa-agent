import { describe, expect, it } from 'vitest';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { HOUSEHOLD_VIEW, readCurrency, readView, saveCurrency, saveView } from './prefs.ts';

function memory(): KeyValue {
	const map = new Map<string, string>();
	return {
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k)
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

describe('the currency a member reads totals in', () => {
	it('is pounds until they choose rupees, and is remembered', () => {
		const store = memory();
		expect(readCurrency(store)).toBe('GBP');
		saveCurrency(store, 'INR');
		expect(readCurrency(store)).toBe('INR');
		saveCurrency(store, 'GBP');
		expect(readCurrency(store)).toBe('GBP');
	});

	it('is pounds when storage is missing or blocked', () => {
		expect(readCurrency(undefined)).toBe('GBP');
		expect(readCurrency(blocked)).toBe('GBP');
		expect(() => {
			saveCurrency(blocked, 'INR');
			saveCurrency(blocked, 'GBP');
			saveCurrency(undefined, 'INR');
		}).not.toThrow();
	});
});

describe('whose view a member reads', () => {
	it('is the household until they choose a member, and is remembered', () => {
		const store = memory();
		expect(readView(store)).toBe(HOUSEHOLD_VIEW);
		saveView(store, 'asha');
		expect(readView(store)).toBe('asha');
		saveView(store, HOUSEHOLD_VIEW);
		expect(readView(store)).toBe(HOUSEHOLD_VIEW);
		expect(store.getItem('mp.view')).toBeNull();
		saveView(store, '');
		expect(readView(store)).toBe(HOUSEHOLD_VIEW);
	});

	it('is the household when storage is missing or blocked', () => {
		expect(readView(undefined)).toBe(HOUSEHOLD_VIEW);
		expect(readView(blocked)).toBe(HOUSEHOLD_VIEW);
		expect(() => {
			saveView(blocked, 'asha');
			saveView(undefined, 'asha');
		}).not.toThrow();
	});
});
