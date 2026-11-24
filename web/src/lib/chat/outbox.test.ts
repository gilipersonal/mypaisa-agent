import { describe, expect, it } from 'vitest';
import { Outbox, type KeyValue, type Pending } from './outbox.ts';

function memory(): KeyValue & { map: Map<string, string> } {
	const map = new Map<string, string>();
	return {
		map,
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k)
	};
}

const p = (id: string): Pending => ({ id, text: `text ${id}`, at: '2026-10-26T18:20:00Z' });

describe('the outbox', () => {
	it('keeps what waits across a reload, in order, and once per id', () => {
		const store = memory();
		new Outbox(store).add(p('a'));
		const reloaded = new Outbox(store);
		reloaded.add(p('b'));
		reloaded.add(p('a'));
		expect(reloaded.list().map((x) => x.id)).toEqual(['b', 'a']);
	});

	it('sends each once, oldest first, and empties the store', async () => {
		const store = memory();
		const box = new Outbox(store);
		box.add(p('a'));
		box.add(p('b'));
		const sent: string[] = [];
		const done = await box.flush((x) => {
			sent.push(x.id);
			return Promise.resolve();
		});
		expect(sent).toEqual(['a', 'b']);
		expect(done.map((x) => x.id)).toEqual(['a', 'b']);
		expect(store.map.size).toBe(0);
	});

	it('stops at a failure and keeps the rest, in order', async () => {
		const box = new Outbox(memory());
		box.add(p('a'));
		box.add(p('b'));
		const done = await box.flush((x) => (x.id === 'a' ? Promise.resolve() : Promise.reject(new Error('down'))));
		expect(done.map((x) => x.id)).toEqual(['a']);
		expect(box.list().map((x) => x.id)).toEqual(['b']);
	});

	it('runs one flush at a time, so nothing is sent twice', async () => {
		const box = new Outbox(memory());
		box.add(p('a'));
		let release: () => void = () => undefined;
		const first = box.flush(() => new Promise<void>((r) => (release = r)));
		expect(await box.flush(() => Promise.resolve())).toEqual([]);
		release();
		expect((await first).map((x) => x.id)).toEqual(['a']);
	});

	it('reads nothing from a value it cannot parse, a value of the wrong shape, or no storage at all', () => {
		const store = memory();
		store.map.set('mp.chat.outbox', '{not json');
		expect(new Outbox(store).list()).toEqual([]);
		store.map.set('mp.chat.outbox', JSON.stringify({ id: 'a' }));
		expect(new Outbox(store).list()).toEqual([]);
		store.map.set('mp.chat.outbox', JSON.stringify([p('a'), { id: 1 }, null]));
		expect(new Outbox(store).list().map((x) => x.id)).toEqual(['a']);
		const none = new Outbox(undefined);
		none.add(p('a'));
		expect(none.list()).toEqual([]);
	});

	it('carries on when the storage refuses a write', () => {
		const store = memory();
		store.setItem = () => {
			throw new Error('quota');
		};
		const box = new Outbox(store);
		expect(() => {
			box.add(p('a'));
		}).not.toThrow();
		expect(box.list()).toEqual([]);
	});
});
