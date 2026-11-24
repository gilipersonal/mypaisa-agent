import { describe, expect, it } from 'vitest';
import type { StreamFrame } from '#lib/api/stream.ts';
import { DONE_REPLY, FakeTransport, LIQUID_REPLY, PREVIEW_REPLY, WHOSE_ASK, realClock, type Clock } from './fake.ts';
import { applyFrame, emptyTimeline, type Timeline } from './timeline.ts';

/** A clock that runs only when told. */
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

function rig() {
	const clock = manual();
	const fake = new FakeTransport(clock, 1, 1);
	const frames: StreamFrame[] = [];
	let timeline: Timeline = emptyTimeline();
	const stop = fake.connect((f) => {
		frames.push(f);
		timeline = applyFrame(timeline, f, () => clock.now());
	});
	return {
		clock,
		fake,
		frames,
		stop,
		get timeline() {
			return timeline;
		}
	};
}

describe('the fake transport', () => {
	it('refuses a message while not connected', async () => {
		await expect(new FakeTransport().send({ id: 'a', text: 'hi' })).rejects.toThrow('not connected');
	});

	it('walks the first record of board 2b: one question, the card, Confirm, Saved', async () => {
		const r = rig();
		await r.fake.send({ id: 'm1', text: '£5,000 in Monzo savings' });
		r.clock.run();
		expect(r.timeline.messages.at(-1)).toMatchObject({ role: 'agent', text: WHOSE_ASK });
		await r.fake.choose('m1', 'arun');
		r.clock.run();
		const card = r.timeline.messages.at(-1)?.cards?.[0];
		expect(card?.body).toMatchObject({
			state: 'open',
			rows: [{ value: 'Arun, all of it' }, { value: '£5,000, from your message' }, {}, {}]
		});
		await r.fake.tap(card?.id ?? '', 'confirm');
		r.clock.run();
		expect(r.timeline.messages.find((m) => m.cards)?.cards?.[0]?.body).toMatchObject({
			state: 'saved',
			rows: [{}, { value: '£5,000' }]
		});
		expect(r.timeline.messages.at(-1)?.text).toBe(DONE_REPLY);
		expect(r.timeline.messages.find((m) => m.chips)?.chosen).toBe('arun');
	});

	it('reopens whose on Edit, and leaves nothing saved on Cancel', async () => {
		const r = rig();
		await r.fake.send({ id: 'm1', text: '£1,250.50 in monzo savings' });
		r.clock.run();
		await r.fake.choose('m1', 'joint');
		r.clock.run();
		const cardId = r.timeline.messages.at(-1)?.cards?.[0]?.id ?? '';
		expect(r.timeline.messages.at(-1)?.cards?.[0]?.body).toMatchObject({
			rows: [{ value: 'Arun and Asha, half each' }, { value: '£1,250.50, from your message' }, {}, {}]
		});
		await r.fake.tap(cardId, 'edit');
		expect(r.timeline.messages.at(-1)).toMatchObject({ text: WHOSE_ASK, chips: [{}, {}, {}] });
		await r.fake.tap(cardId, 'cancel');
		expect(r.timeline.messages.find((m) => m.cards)?.cards?.[0]?.body).toMatchObject({
			state: 'cancelled',
			over: 'New savings account · not saved'
		});
	});

	it('ignores a choice or a tap it has no draft for', async () => {
		const r = rig();
		await r.fake.choose('nope', 'arun');
		await r.fake.send({ id: 'm1', text: '£5 in Monzo savings' });
		r.clock.run();
		await r.fake.choose('m1', 'nobody');
		await r.fake.tap('nope', 'confirm');
		expect(r.timeline.messages.map((m) => m.role)).toEqual(['member', 'agent']);
	});

	it('streams words, then the finished reply with the engine figure', async () => {
		const r = rig();
		await r.fake.send({ id: 'q', text: 'What can we get at quickly now?' });
		r.clock.run();
		expect(r.frames.filter((f) => f.event === 'delta').length).toBeGreaterThan(10);
		const reply = r.timeline.messages.at(-1);
		expect(reply).toMatchObject({ text: LIQUID_REPLY, phase: 'done' });
		expect(reply?.cards?.[0]?.body).toMatchObject({ value: { amount: '37596', currency: 'GBP' } });
	});

	it('answers net worth and what is due, each with its source', async () => {
		const r = rig();
		await r.fake.send({ id: 'n', text: "What's our net worth?" });
		await r.fake.send({ id: 'd', text: "What's due this week?" });
		r.clock.run();
		const agent = r.timeline.messages.filter((m) => m.role === 'agent');
		expect(agent[0]?.cards?.[0]?.body).toMatchObject({ value: { amount: '444951' } });
		expect(agent[1]?.meta).toBe('From the registry: what is due');
	});

	it('says it is a preview when asked anything off its script, and Stop keeps what was written', async () => {
		const r = rig();
		await r.fake.send({ id: 'h', text: 'hello' });
		r.clock.run();
		expect(r.timeline.messages.at(-1)?.text).toBe(PREVIEW_REPLY);
		// Stop before the clock runs: the reply never starts, and the member's message stays.
		const s = rig();
		await s.fake.send({ id: 'x', text: 'anything' });
		await s.fake.stop('x');
		s.clock.run();
		expect(s.timeline.messages.map((m) => m.role)).toEqual(['member']);
	});

	it('reads a file: the file shows as sent, then Reading it…', async () => {
		const r = rig();
		await r.fake.send({ id: 'f', text: "October's card statement", file: { name: 's.pdf', meta: 'PDF · 486 KB' } });
		r.clock.run();
		expect(r.timeline.messages[0]?.file).toEqual({ name: 's.pdf', meta: 'PDF · 486 KB' });
		expect(r.timeline.messages.at(-1)).toMatchObject({ phase: 'reading', text: 'Reading it…' });
	});

	it('stops delivering once disconnected', async () => {
		const r = rig();
		await r.fake.send({ id: 'q', text: 'What can we get at quickly now?' });
		r.stop();
		r.clock.run();
		expect(r.frames.map((f) => f.event)).toEqual(['message']);
	});

	it('runs on the real clock too', async () => {
		let fired = false;
		const cancel = realClock.later(() => (fired = true), 1);
		await new Promise((r) => setTimeout(r, 10));
		expect(fired).toBe(true);
		realClock.later(() => (fired = false), 1)();
		await new Promise((r) => setTimeout(r, 10));
		expect(fired).toBe(true);
		cancel();
		expect(realClock.now()).toBeInstanceOf(Date);
	});
});
