import { describe, expect, it } from 'vitest';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { readCurrency, saveCurrency } from './prefs.ts';

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
