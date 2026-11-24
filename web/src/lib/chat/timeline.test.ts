import { describe, expect, it } from 'vitest';
import type { StreamFrame } from '#lib/api/stream.ts';
import {
	activeTurn,
	addOwn,
	applyFrame,
	emptyTimeline,
	finishTurn,
	markOwn,
	messageKey,
	type Timeline
} from './timeline.ts';

const now = () => new Date('2026-10-26T09:40:00Z');
const frame = (event: string, data: unknown, id?: number): StreamFrame => ({ id, event, data });
const apply = (t: Timeline, ...frames: StreamFrame[]) => frames.reduce((acc, f) => applyFrame(acc, f, now), t);
const card = (id: string, state = 'open') => ({
	type: 'confirm',
	version: 1,
	id,
	fallback: 'x',
	body: { state }
});

describe('the timeline', () => {
	it('streams a reply word by word, then finishes it with its cards', () => {
		const t = apply(
			emptyTimeline(),
			frame('delta', { turn_id: 'm1', text: 'Money ' }),
			frame('delta', { turn_id: 'm1', text: 'you could' }),
			frame('message', { id: 'm1', role: 'agent', text: 'Money you could get at.', cards: [card('c1'), 'junk'] })
		);
		expect(t.messages).toHaveLength(1);
		expect(t.messages[0]).toMatchObject({ role: 'agent', text: 'Money you could get at.', phase: 'done' });
		expect(t.messages[0]?.cards?.map((c) => c.id)).toEqual(['c1']);
	});

	it('shows the words as they arrive, with the time of the first', () => {
		const t = apply(emptyTimeline(), frame('delta', { turn_id: 'm1', text: 'Money ' }));
		expect(activeTurn(t)).toMatchObject({ text: 'Money ', phase: 'streaming', at: now().toISOString() });
	});

	it('keeps an agent turn apart from the member message it answers, though they share an id', () => {
		let t = addOwn(emptyTimeline(), { id: 'm1', text: 'Hello', at: now().toISOString() }, 'sending');
		t = apply(t, frame('message', { id: 'm1', role: 'member', text: 'Hello' }));
		t = apply(t, frame('message', { id: 'm1', role: 'agent', text: 'Hi' }));
		expect(t.messages.map(messageKey)).toEqual(['member:m1', 'agent:m1']);
		expect(t.messages[0]?.delivery).toBe('sent');
	});

	it('applies a logged frame once, and never one older than the last', () => {
		const once = apply(emptyTimeline(), frame('delta', { turn_id: 'a', text: 'one ' }, 5));
		const again = apply(
			once,
			frame('delta', { turn_id: 'a', text: 'one ' }, 5),
			frame('delta', { turn_id: 'a', text: 'x' }, 4)
		);
		expect(again).toBe(once);
		expect(again.lastEventId).toBe(5);
	});

	it('takes no more words once a turn is stopped', () => {
		let t = apply(emptyTimeline(), frame('delta', { turn_id: 'a', text: 'kept ' }));
		t = finishTurn(t, 'a');
		t = apply(t, frame('delta', { turn_id: 'a', text: 'dropped' }));
		expect(t.messages[0]).toMatchObject({ text: 'kept ', phase: 'done' });
		expect(activeTurn(t)).toBeUndefined();
	});

	it('shows Reading it… with its line, and its default words', () => {
		const t = apply(
			emptyTimeline(),
			frame('reading', { turn_id: 'f', meta: 'Kept for good first.' }),
			frame('reading', { turn_id: 'g', text: 'Reading the photo…' })
		);
		expect(t.messages[0]).toMatchObject({ text: 'Reading it…', meta: 'Kept for good first.', phase: 'reading' });
		expect(t.messages[1]).toMatchObject({ text: 'Reading the photo…' });
		expect(t.messages[1]?.meta).toBeUndefined();
	});

	it('reads a message with chips, a file and a line under it, skipping malformed chips', () => {
		const t = apply(
			emptyTimeline(),
			frame('message', {
				id: 'q',
				role: 'agent',
				text: 'Whose is it?',
				at: '2026-10-26T09:41:00Z',
				meta: 'From the registry',
				chips: [{ id: 'arun', label: 'Arun' }, { id: 'x' }, 'junk'],
				file: { name: 'a.pdf', meta: 'PDF · 1 KB' }
			})
		);
		expect(t.messages[0]).toMatchObject({
			at: '2026-10-26T09:41:00Z',
			meta: 'From the registry',
			chips: [{ id: 'arun', label: 'Arun' }],
			file: { name: 'a.pdf', meta: 'PDF · 1 KB' }
		});
	});

	it('drops chips and files that carry nothing usable', () => {
		const t = apply(
			emptyTimeline(),
			frame('message', { id: 'q', role: 'agent', chips: [{ id: 'x' }], file: { name: 'a.pdf' }, cards: 'no' })
		);
		expect(t.messages[0]).toMatchObject({ text: '' });
		expect(t.messages[0]?.chips).toBeUndefined();
		expect(t.messages[0]?.file).toBeUndefined();
		expect(t.messages[0]?.cards).toBeUndefined();
	});

	it('replaces a card in place by its id, and records the chip chosen', () => {
		let t = apply(
			emptyTimeline(),
			frame('message', { id: 'a', role: 'agent', text: '', cards: [card('c1')] }),
			frame('message', { id: 'b', role: 'agent', text: 'other' })
		);
		t = apply(t, frame('card', { card: card('c1', 'saved') }), frame('chosen', { message_id: 'a', chip_id: 'arun' }));
		expect((t.messages[0]?.cards?.[0]?.body as { state: string }).state).toBe('saved');
		expect(t.messages[0]?.chosen).toBe('arun');
		expect(t.messages[1]?.chosen).toBeUndefined();
	});

	it('empties itself on a resync, for the catch-up to fill', () => {
		const t = apply(emptyTimeline(), frame('delta', { turn_id: 'a', text: 'x' }, 3), frame('resync', {}));
		expect(t).toEqual(emptyTimeline());
	});

	it('ignores what it cannot read, and still moves past a logged frame', () => {
		const start = emptyTimeline();
		const t = apply(
			start,
			frame('delta', 'not an object', 1),
			frame('delta', { text: 'no turn' }),
			frame('reading', {}),
			frame('message', { id: 'x', role: 'robot' }),
			frame('card', { card: { id: 'no' } }),
			frame('chosen', { message_id: 'a' }),
			frame('heartbeat', {}, 2)
		);
		expect(t.messages).toEqual([]);
		expect(t.lastEventId).toBe(2);
	});

	it('marks the member own message as it moves, saying when it went if it waited', () => {
		let t = addOwn(emptyTimeline(), { id: 'm', text: 'Due?', at: now().toISOString() }, 'waiting');
		t = markOwn(t, 'm', 'sending');
		expect(t.messages[0]?.delivery).toBe('sending');
		t = markOwn(t, 'm', 'sent', 'Sent at 18:24, when the connection came back');
		expect(t.messages[0]).toMatchObject({ delivery: 'sent', sentLate: 'Sent at 18:24, when the connection came back' });
		expect(markOwn(t, 'other', 'sent').messages).toEqual(t.messages);
	});
});
