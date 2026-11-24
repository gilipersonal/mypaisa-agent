import { QueryClient } from '@tanstack/query-core';
import { describe, expect, it } from 'vitest';
import { chatKeys, chatTimelineQuery } from '#lib/api/queries.ts';
import type { StreamFrame } from '#lib/api/stream.ts';
import { Outbox, type KeyValue } from './outbox.ts';
import { ChatSession, provideChat, useChat, type Connectivity } from './session.svelte.ts';
import type { Timeline } from './timeline.ts';
import type { CardAction, ChatTransport, Outgoing } from './transport.ts';

class Net implements Connectivity {
	up = true;
	fns = new Map<string, Set<() => void>>();
	online = () => this.up;
	addEventListener(type: string, fn: () => void) {
		if (!this.fns.has(type)) this.fns.set(type, new Set());
		this.fns.get(type)?.add(fn);
	}
	removeEventListener(type: string, fn: () => void) {
		this.fns.get(type)?.delete(fn);
	}
	go(up: boolean) {
		this.up = up;
		for (const fn of this.fns.get(up ? 'online' : 'offline') ?? []) fn();
	}
}

class Echo implements ChatTransport {
	sent: Outgoing[] = [];
	stopped: string[] = [];
	chosen: string[] = [];
	tapped: string[] = [];
	fail = false;
	emit: (frame: StreamFrame) => void = () => undefined;
	connect(onFrame: (frame: StreamFrame) => void) {
		this.emit = onFrame;
		return () => (this.emit = () => undefined);
	}
	send(message: Outgoing) {
		if (this.fail) return Promise.reject(new Error('down'));
		this.sent.push(message);
		this.emit({ id: undefined, event: 'message', data: { id: message.id, role: 'member', text: message.text } });
		return Promise.resolve();
	}
	choose(messageId: string, chipId: string) {
		this.chosen.push(`${messageId}:${chipId}`);
		return Promise.resolve();
	}
	tap(cardId: string, action: CardAction) {
		this.tapped.push(`${cardId}:${action}`);
		return Promise.resolve();
	}
	stop(turnId: string) {
		this.stopped.push(turnId);
		return Promise.resolve();
	}
}

function memory(): KeyValue {
	const map = new Map<string, string>();
	return {
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k)
	};
}

function rig(up = true) {
	const queries = new QueryClient();
	const net = new Net();
	net.up = up;
	const transport = new Echo();
	const store = memory();
	let n = 0;
	const clears: (() => void)[] = [];
	const session = new ChatSession(queries, transport, new Outbox(store), net, {
		now: () => new Date('2026-10-26T18:24:00'),
		newId: () => `id${String((n += 1))}`,
		later: (fn) => {
			clears.push(fn);
			return () => undefined;
		}
	});
	const timeline = () => queries.getQueryData<Timeline>(chatKeys.timeline);
	return { queries, net, transport, store, session, timeline, clears };
}

describe('the chat session', () => {
	it('sends a message and shows it at once, then as taken', async () => {
		const r = rig();
		const stop = r.session.start();
		await r.session.send('  Hello  ');
		expect(r.transport.sent).toEqual([{ id: 'id1', text: 'Hello', at: new Date('2026-10-26T18:24:00').toISOString() }]);
		expect(r.timeline()?.messages[0]).toMatchObject({ text: 'Hello', delivery: 'sent' });
		await r.session.send('   ');
		expect(r.transport.sent).toHaveLength(1);
		stop();
	});

	it('sends the waiting file with the words, then clears it', async () => {
		const r = rig();
		r.session.start();
		r.session.attachment = { name: 's.pdf', meta: 'PDF · 1 KB' };
		await r.session.send('');
		expect(r.transport.sent[0]?.file).toEqual({ name: 's.pdf', meta: 'PDF · 1 KB' });
		expect(r.session.attachment).toBeUndefined();
	});

	it('keeps what is typed offline, then sends it once when the connection is back, and says so', async () => {
		const r = rig(false);
		r.session.start();
		expect(r.session.online).toBe(false);
		await r.session.send("What's due this week?");
		expect(r.transport.sent).toEqual([]);
		expect(r.timeline()?.messages[0]).toMatchObject({ delivery: 'waiting' });
		r.net.go(true);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(r.transport.sent.map((m) => m.text)).toEqual(["What's due this week?"]);
		expect(r.timeline()?.messages[0]).toMatchObject({
			delivery: 'sent',
			sentLate: 'Sent at 18:24, when the connection came back'
		});
		expect(r.session.back).toEqual({ at: '18:24', sent: 1 });
		for (const fn of r.clears) fn();
		expect(r.session.back).toBeUndefined();
		r.net.go(false);
		expect(r.session.online).toBe(false);
	});

	it('shows what waited from an earlier visit and sends it on start', async () => {
		const first = rig(false);
		first.session.start();
		await first.session.send('kept');
		const later = new ChatSession(new QueryClient(), first.transport, new Outbox(first.store), first.net, {
			now: () => new Date('2026-10-26T18:24:00')
		});
		first.net.up = true;
		later.start();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(first.transport.sent.map((m) => m.text)).toEqual(['kept']);
	});

	it('keeps a message the transport refused, as waiting', async () => {
		const r = rig();
		r.session.start();
		r.transport.fail = true;
		await r.session.send('later');
		expect(r.timeline()?.messages[0]).toMatchObject({ delivery: 'waiting' });
		r.transport.fail = false;
		await r.session.flush();
		expect(r.transport.sent.map((m) => m.text)).toEqual(['later']);
	});

	it('passes choices and taps through, and Stop ends the streaming turn where it is', async () => {
		const r = rig();
		r.session.start();
		await r.session.choose('m', 'arun');
		await r.session.tap('c', 'confirm');
		await r.session.stop();
		expect(r.transport.stopped).toEqual([]);
		r.transport.emit({ id: 1, event: 'delta', data: { turn_id: 't', text: 'half ' } });
		await r.session.stop();
		expect(r.transport.chosen).toEqual(['m:arun']);
		expect(r.transport.tapped).toEqual(['c:confirm']);
		expect(r.transport.stopped).toEqual(['t']);
		expect(r.session.timeline.messages[0]).toMatchObject({ text: 'half ', phase: 'done' });
	});

	it('reads an empty conversation before any frame, through its query', async () => {
		const r = rig();
		expect(r.session.timeline).toEqual({ messages: [], lastEventId: 0 });
		expect(await chatTimelineQuery().queryFn()).toEqual({ messages: [], lastEventId: 0 });
	});

	it('is provided only inside the shell', () => {
		expect(() => useChat()).toThrow();
		expect(() => {
			provideChat(rig().session);
		}).toThrow();
	});

	it('uses the real clock and ids by default', async () => {
		const net = new Net();
		const session = new ChatSession(new QueryClient(), new Echo(), new Outbox(undefined), net, { backMs: 1 });
		session.start();
		net.go(false);
		await session.send('x');
		net.go(true);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(session.back).toBeUndefined();
		expect(session.timeline.messages[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
	});
});
