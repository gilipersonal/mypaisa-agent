import { describe, expect, it } from 'vitest';
import type { ChatMessage, Timeline } from '#lib/chat/timeline.ts';
import { freshThread, holdsOffline } from './thread.ts';

const at = '2026-11-05T20:41:00Z';
const msg = (over: Partial<ChatMessage>): ChatMessage => ({ id: 'm', role: 'member', at, text: 'hi', ...over });

describe('a new conversation', () => {
	it('starts empty and keeps the stream’s place', () => {
		const t: Timeline = {
			lastEventId: 42,
			messages: [msg({ id: 'a', delivery: 'sent' }), msg({ id: 'a', role: 'agent', phase: 'done' })]
		};
		expect(freshThread(t)).toEqual({ lastEventId: 42, messages: [] });
	});

	it('keeps what is still waiting or going', () => {
		const waiting = msg({ id: 'w', delivery: 'waiting' });
		const sending = msg({ id: 's', delivery: 'sending' });
		const t: Timeline = { lastEventId: 3, messages: [msg({ id: 'x', delivery: 'sent' }), waiting, sending] };
		expect(freshThread(t).messages).toEqual([waiting, sending]);
	});
});

describe('a tap while offline', () => {
	it('holds a Confirm', () => {
		expect(holdsOffline('confirm', false)).toBe(true);
	});

	it('lets a Confirm through online, and every other tap either way', () => {
		expect(holdsOffline('confirm', true)).toBe(false);
		expect(holdsOffline('edit', false)).toBe(false);
		expect(holdsOffline('cancel', false)).toBe(false);
		expect(holdsOffline('checkin.type', false)).toBe(false);
	});
});
