import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { StubHousehold, type StubAsset } from './household.ts';

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

const monzo: StubAsset = {
	id: 'monzo_savings',
	kind: 'savings_account',
	name: 'Instant access savings · Monzo',
	country: 'UK',
	ccy: 'GBP',
	owners: [['arun', 100]],
	value: 5000,
	liquidity: 'liquid'
};

describe('the stub household', () => {
	it('is the design figure set, byte for byte', () => {
		expect(read('./household.json')).toBe(read('../../../../docs/design/figures/household-v4.json'));
	});

	it('starts as the boards do before the first record: 16 assets, 4 debts, two members', () => {
		const h = new StubHousehold();
		expect(h.assets).toHaveLength(16);
		expect(h.debts).toHaveLength(4);
		expect(h.empty).toBe(false);
		expect(h.member('asha')?.name).toBe('Asha');
		expect(h.member('nobody')).toBeUndefined();
		expect(h.fx).toBe(112.5);
		expect(h.today).toBe('2026-10-26');
		expect(h.lastChange).toBeUndefined();
	});

	it('can start with nothing', () => {
		const h = new StubHousehold({ empty: true });
		expect(h.empty).toBe(true);
		expect(h.assets).toEqual([]);
	});

	it('takes a record once, however often it is confirmed, and remembers it as the last change', () => {
		const h = new StubHousehold();
		const at = new Date('2026-10-26T09:41:00');
		h.add(monzo, at, 'added in the chat');
		h.add({ ...monzo, value: 6000 }, at, 'added in the chat');
		expect(h.assets).toHaveLength(17);
		expect(h.assets.at(-1)?.value).toBe(6000);
		expect(h.lastChange).toEqual({ recordId: 'monzo_savings', at, how: 'added in the chat' });
	});
});
