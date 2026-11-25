import { QueryClient } from '@tanstack/query-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatKeys, wealthKeys } from '#lib/api/queries.ts';
import type { CardEnvelope } from '#lib/cards/types.ts';
import { FakeTransport, type Clock } from '#lib/chat/fake.ts';
import { Outbox, type KeyValue } from '#lib/chat/outbox.ts';
import { ChatSession, type Connectivity } from '#lib/chat/session.svelte.ts';
import { emptyTimeline, type ChatMessage, type Timeline } from '#lib/chat/timeline.ts';
import { StubHousehold } from '#lib/stub/household.ts';
import {
	LASTS,
	MarkPlayer,
	STILL_LASTS,
	arriveOnce,
	browserEnv,
	liveContext,
	newLoad,
	onRing,
	ringMark,
	type MarkEnv
} from './activity.svelte.ts';
import { ChatWatch, savesShown, turnsAnswering, watchActivity } from './watch.ts';

/** Time that moves only when told, and the timers due by then. */
function env(opts: { hidden?: boolean; reduced?: boolean } = {}) {
	let t = 0;
	let timers: { at: number; fn: () => void; live: boolean }[] = [];
	const e = {
		hidden: opts.hidden ?? false,
		reduced: opts.reduced ?? false,
		now: () => t,
		later(fn: () => void, ms: number) {
			const job = { at: t + ms, fn, live: true };
			timers.push(job);
			return () => {
				job.live = false;
			};
		},
		advance(ms: number) {
			const end = t + ms;
			for (;;) {
				const due = timers.filter((j) => j.live && j.at <= end).sort((a, b) => a.at - b.at)[0];
				if (!due) break;
				timers = timers.filter((j) => j !== due);
				t = due.at;
				due.fn();
			}
			t = end;
		},
		pending: () => timers.filter((j) => j.live).length
	};
	const markEnv: MarkEnv = {
		now: () => e.now(),
		later: (fn, ms) => e.later(fn, ms),
		hidden: () => e.hidden,
		reduced: () => e.reduced
	};
	return { e, player: new MarkPlayer(markEnv) };
}

describe('the mark plays one moment at a time', () => {
	it('plays each moment for as long as the board says, then rests', () => {
		const { e, player } = env();
		expect(player.scene).toBeUndefined();
		expect(player.ask('open')).toBe('played');
		expect(player.scene).toBe('open');
		expect(player.still).toBe(false);
		expect(player.run).toBe(1);
		e.advance(LASTS.open - 1);
		expect(player.scene).toBe('open');
		e.advance(1);
		expect(player.scene).toBeUndefined();
		expect(player.ask('lap')).toBe('played');
		e.advance(LASTS.lap);
		expect(player.scene).toBeUndefined();
		expect(player.ask('saved')).toBe('played');
		e.advance(LASTS.saved);
		expect(player.scene).toBeUndefined();
		expect(player.run).toBe(3);
	});

	it('does not restart or queue a lap asked for while one plays', () => {
		const { e, player } = env();
		player.ask('lap');
		e.advance(400);
		expect(player.ask('lap')).toBe('dropped');
		expect(player.run).toBe(1);
		e.advance(LASTS.lap);
		expect(player.scene).toBeUndefined();
		expect(player.run).toBe(1);
	});

	it('drops a message sent during the arrival: no lap follows it', () => {
		const { e, player } = env();
		player.ask('open');
		e.advance(600);
		expect(player.ask('lap')).toBe('dropped');
		e.advance(2000);
		expect(player.run).toBe(1);
	});

	it('holds a save that lands during a lap and rings when the lap ends', () => {
		const { e, player } = env();
		player.ask('lap');
		e.advance(500);
		expect(player.ask('saved')).toBe('held');
		expect(player.scene).toBe('lap');
		e.advance(LASTS.lap - 500);
		expect(player.scene).toBeUndefined();
		e.advance(30);
		expect(player.scene).toBe('saved');
		expect(player.run).toBe(2);
		e.advance(LASTS.saved);
		expect(player.scene).toBeUndefined();
	});

	it('holds only one save', () => {
		const { e, player } = env();
		player.ask('lap');
		expect(player.ask('saved')).toBe('held');
		expect(player.ask('saved')).toBe('dropped');
		e.advance(3000);
		expect(player.run).toBe(2);
	});

	it('plays nothing while the tab is hidden, and nothing when it comes back', () => {
		const { e, player } = env({ hidden: true });
		expect(player.ask('lap')).toBe('hidden');
		expect(player.ask('saved')).toBe('hidden');
		e.hidden = false;
		e.advance(5000);
		expect(player.run).toBe(0);
		expect(player.scene).toBeUndefined();
	});

	it('skips a held ring whose time comes while the tab is hidden', () => {
		const { e, player } = env();
		player.ask('lap');
		player.ask('saved');
		e.hidden = true;
		e.advance(3000);
		expect(player.run).toBe(1);
		e.hidden = false;
		e.advance(3000);
		expect(player.run).toBe(1);
	});

	it('plays the still version under Reduce Motion, for 450 ms', () => {
		const { e, player } = env({ reduced: true });
		player.ask('saved');
		expect(player.still).toBe(true);
		expect(player.scene).toBe('saved');
		e.advance(STILL_LASTS - 1);
		expect(player.ask('lap')).toBe('dropped');
		e.advance(1);
		expect(player.scene).toBeUndefined();
		expect(player.ask('lap')).toBe('played');
	});

	it('stops: what waits is cancelled and the mark is at rest', () => {
		const { e, player } = env();
		player.ask('lap');
		player.ask('saved');
		player.stop();
		expect(player.scene).toBeUndefined();
		expect(e.pending()).toBe(0);
		expect(player.ask('lap')).toBe('played');
	});
});

describe('the arrival', () => {
	afterEach(() => {
		newLoad();
	});

	it('plays once per load, not on moving between pages', () => {
		newLoad();
		expect(arriveOnce()).toBe(true);
		expect(arriveOnce()).toBe(false);
		newLoad();
		expect(arriveOnce()).toBe(true);
	});
});

describe('the ring signal', () => {
	it('rings every live mark listening, until it stops listening', () => {
		const heard: number[] = [];
		const stopA = onRing(() => heard.push(1));
		const stopB = onRing(() => heard.push(2));
		ringMark();
		stopA();
		ringMark();
		stopB();
		ringMark();
		expect(heard).toEqual([1, 2, 2]);
	});
});

const card = (type: string, id: string, body: unknown): CardEnvelope => ({ type, version: 1, id, fallback: '', body });
const confirm = (id: string, state: 'open' | 'saved' | 'cancelled') =>
	card('confirm', id, { over: 'x', title: 'x', rows: [], state });
const plan = (id: string, done?: boolean) =>
	card('plan', id, { over: 'x', title: 'x', blocks: [], ...(done === undefined ? {} : { done }) });
const agent = (id: string, cards: CardEnvelope[] = [], phase: ChatMessage['phase'] = 'done'): ChatMessage => ({
	id,
	role: 'agent',
	at: '2026-10-26T09:40:00Z',
	text: '',
	phase,
	cards
});
const member = (id: string): ChatMessage => ({ id, role: 'member', at: '2026-10-26T09:40:00Z', text: 'hi' });
const tl = (...messages: ChatMessage[]): Timeline => ({ messages, lastEventId: 0 });

describe('what the conversation asks of the mark', () => {
	it('counts a turn only when it answers a member message', () => {
		expect(turnsAnswering(tl(member('m1'), agent('m1', [], 'reading'), agent('checkin'), agent('c.done')))).toEqual([
			'agent:m1'
		]);
	});

	it('counts every kind of save the chat shows, and nothing else', () => {
		const t = tl(
			agent('a', [
				confirm('c1', 'saved'),
				confirm('c2', 'open'),
				confirm('c3', 'cancelled'),
				plan('p1', true),
				plan('p2', false),
				plan('p3'),
				card('checkin', 'k1', { saved: true }),
				card('checkin', 'k2', { fold: { text: 'Saved', at: '09:41', icon: 'saved' } }),
				card('checkin', 'k3', { fold: { text: 'Noted', at: '09:41', icon: 'noted' } }),
				card('checkin', 'k4', {
					items: [
						{ tile: '£', name: 'EMI', note: '', value: '£1', done: true },
						{ tile: '£', name: 'Card', note: '', value: '£2' }
					]
				}),
				card('figure', 'f1', {})
			]),
			member('m')
		);
		expect(savesShown(t)).toEqual(['c1', 'p1', 'k1', 'k2', 'k4#0']);
	});

	it('asks once for each new turn and each new save, never for what was there when it began', () => {
		const watch = new ChatWatch(tl(member('m0'), agent('m0'), agent('a', [confirm('c0', 'saved')])));
		expect(watch.next(tl(member('m0'), agent('m0')))).toEqual({ lap: false, saved: false });
		expect(watch.next(tl(member('m1')))).toEqual({ lap: false, saved: false });
		expect(watch.next(tl(member('m1'), agent('m1', [], 'streaming')))).toEqual({ lap: true, saved: false });
		expect(watch.next(tl(member('m1'), agent('m1', [confirm('c1', 'open')])))).toEqual({ lap: false, saved: false });
		expect(watch.next(tl(member('m1'), agent('m1', [confirm('c1', 'saved')])))).toEqual({ lap: false, saved: true });
		// a resync empties the conversation and fills it again: nothing asks twice
		expect(watch.next(emptyTimeline())).toEqual({ lap: false, saved: false });
		expect(watch.next(tl(member('m1'), agent('m1', [confirm('c1', 'saved')])))).toEqual({ lap: false, saved: false });
	});
});

/** A clock that runs only when told, for the fake transport. */
function manual(): Clock & { run(): void } {
	let queue: { fn: () => void; live: boolean }[] = [];
	return {
		now: () => new Date('2026-10-26T09:40:00Z'),
		later(fn) {
			const job = { fn, live: true };
			queue.push(job);
			return () => (job.live = false);
		},
		run() {
			while (queue.length > 0) {
				const jobs = queue;
				queue = [];
				for (const job of jobs) if (job.live) job.fn();
			}
		}
	};
}

function memory(): KeyValue {
	const map = new Map<string, string>();
	return {
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k)
	};
}

const net: Connectivity = {
	online: () => true,
	addEventListener: () => undefined,
	removeEventListener: () => undefined
};

function shell(household = new StubHousehold()) {
	const queries = new QueryClient();
	const clock = manual();
	const fake = new FakeTransport(clock, 1, 1, household);
	let n = 0;
	const session = new ChatSession(queries, fake, new Outbox(memory()), net, { newId: () => `m${String((n += 1))}` });
	const stopSession = session.start();
	const heard: string[] = [];
	const stop = watchActivity(queries, () => session.timeline, {
		lap: () => heard.push('lap'),
		saved: () => heard.push('saved')
	});
	return { queries, clock, session, heard, stop, stopSession };
}

const cardIds = (t: Timeline) => t.messages.flatMap((m) => m.cards ?? []).map((c) => c.id);

describe('the mark watches the chat and the pages', () => {
	it('laps when MyPaisa starts on a message and rings once when a Confirm saves', async () => {
		const { clock, session, heard, stop, stopSession } = shell();
		await session.send('£5,000 in Monzo savings');
		expect(heard).toEqual([]); // sent; MyPaisa has not started on it yet
		clock.run();
		expect(heard).toEqual(['lap']);
		await session.choose('m1', 'arun');
		clock.run();
		expect(heard).toEqual(['lap', 'lap']); // the answer is a message too
		const confirmId = cardIds(session.timeline).at(-1) ?? '';
		await session.tap(confirmId, 'confirm');
		clock.run();
		// one ring for the save, and no lap for the "Done." that follows it
		expect(heard).toEqual(['lap', 'lap', 'saved']);
		stop();
		stopSession();
	});

	it('laps for a reply that streams for a long time once, at its start', async () => {
		const { clock, session, heard, stop, stopSession } = shell();
		await session.send('what is our net worth');
		clock.run();
		expect(heard).toEqual(['lap']);
		stop();
		stopSession();
	});

	it('rings for a figure saved in place: a wealth mutation that succeeds, and nothing else', async () => {
		const { queries, heard, stop, stopSession } = shell();
		const run = (key: readonly unknown[], fail = false) =>
			queries
				.getMutationCache()
				.build(queries, {
					mutationKey: key,
					mutationFn: () => (fail ? Promise.reject(new Error('refused')) : Promise.resolve())
				})
				.execute(undefined)
				.catch(() => undefined);
		await run(wealthKeys.correctProjection);
		await run(wealthKeys.changePlan);
		await run(wealthKeys.correctProjection, true);
		await run(['appearance']);
		await run([]);
		expect(heard).toEqual(['saved', 'saved']);
		// other queries moving ask nothing
		queries.setQueryData(wealthKeys.overview('household', 'GBP'), {});
		expect(heard).toEqual(['saved', 'saved']);
		stop();
		await run(wealthKeys.changePlan);
		queries.setQueryData(chatKeys.timeline, tl(member('x'), agent('x')));
		expect(heard).toEqual(['saved', 'saved']);
		stopSession();
	});
});

describe('outside the shell', () => {
	it('finds no chat, so the mark stays still and nothing throws', () => {
		expect(liveContext()).toBeUndefined();
	});
});

describe('the browser', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('reads the tab, Reduce Motion and the clock from the window', () => {
		vi.useFakeTimers();
		vi.stubGlobal('document', { hidden: true });
		vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }) });
		const b = browserEnv();
		expect(b.hidden()).toBe(true);
		expect(b.reduced()).toBe(true);
		expect(b.now()).toBe(Date.now());
		const fired: number[] = [];
		b.later(() => fired.push(1), 10);
		const cancel = b.later(() => fired.push(2), 10);
		cancel();
		vi.advanceTimersByTime(10);
		expect(fired).toEqual([1]);
	});
});
