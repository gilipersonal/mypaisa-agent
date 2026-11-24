/** The web door's chat (MA-199): the transport's frames land in TanStack Query's cache through the timeline reducer,
 * what the member types while offline waits in the outbox and in the conversation as Waiting, and it goes by itself,
 * once, when the browser is back online (board Browser · Chat, offline). Components read the timeline through
 * `chatTimelineQuery` and act through this session, which the shell provides by context. */
import type { QueryClient } from '@tanstack/query-core';
import { getContext, setContext } from 'svelte';
import { chatKeys } from '#lib/api/queries.ts';
import { timeOf } from './days.ts';
import type { Outbox } from './outbox.ts';
import {
	activeTurn,
	addOwn,
	applyFrame,
	emptyTimeline,
	finishTurn,
	markOwn,
	type FileRef,
	type Timeline
} from './timeline.ts';
import type { CardAction, ChatTransport } from './transport.ts';

export interface Back {
	at: string;
	sent: number;
}

/** What the session needs from the window; a test passes its own. */
export interface Connectivity {
	online(): boolean;
	addEventListener(type: 'online' | 'offline', fn: () => void): void;
	removeEventListener(type: 'online' | 'offline', fn: () => void): void;
}

export interface SessionOptions {
	now?: () => Date;
	newId?: () => string;
	/** How long the "Back online" line stays. */
	backMs?: number;
	later?: (fn: () => void, ms: number) => () => void;
}

export class ChatSession {
	online = $state(true);
	back = $state<Back | undefined>();
	/** The file waiting in the composer, until Send or ×. */
	attachment = $state<FileRef | undefined>();

	readonly #now: () => Date;
	readonly #newId: () => string;
	readonly #backMs: number;
	readonly #later: (fn: () => void, ms: number) => () => void;
	#stops: (() => void)[] = [];
	#clearBack: (() => void) | undefined;

	constructor(
		private readonly queries: QueryClient,
		private readonly transport: ChatTransport,
		private readonly outbox: Outbox,
		private readonly net: Connectivity,
		options: SessionOptions = {}
	) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a timestamp read once, never mutated or rendered
		this.#now = options.now ?? (() => new Date());
		this.#newId = options.newId ?? (() => crypto.randomUUID());
		this.#backMs = options.backMs ?? 12_000;
		this.#later =
			options.later ??
			((fn, ms) => {
				const t = setTimeout(fn, ms);
				return () => {
					clearTimeout(t);
				};
			});
	}

	get timeline(): Timeline {
		return this.queries.getQueryData<Timeline>(chatKeys.timeline) ?? emptyTimeline();
	}

	/** Connects, shows what waited from an earlier visit, and sends it if the browser is online. Returns a stop. */
	start(): () => void {
		this.online = this.net.online();
		for (const pending of this.outbox.list()) {
			this.#update((t) => addOwn(t, pending, 'waiting'));
		}
		this.#stops.push(
			this.transport.connect((frame) => {
				this.#update((t) => applyFrame(t, frame, this.#now));
			})
		);
		const goOnline = () => {
			this.online = true;
			void this.flush();
		};
		const goOffline = () => {
			this.online = false;
			this.#clearBack?.();
			this.back = undefined;
		};
		this.net.addEventListener('online', goOnline);
		this.net.addEventListener('offline', goOffline);
		this.#stops.push(() => {
			this.net.removeEventListener('online', goOnline);
			this.net.removeEventListener('offline', goOffline);
		});
		if (this.online) void this.flush();
		return () => {
			for (const stop of this.#stops.splice(0)) stop();
			this.#clearBack?.();
		};
	}

	async send(text: string): Promise<void> {
		const body = text.trim();
		const file = this.attachment;
		if (!body && !file) return;
		this.attachment = undefined;
		const message = { id: this.#newId(), text: body, at: this.#now().toISOString(), ...(file ? { file } : {}) };
		if (!this.online) {
			this.outbox.add(message);
			this.#update((t) => addOwn(t, message, 'waiting'));
			return;
		}
		this.#update((t) => addOwn(t, message, 'sending'));
		try {
			await this.transport.send(message);
		} catch {
			this.outbox.add(message);
			this.#update((t) => markOwn(t, message.id, 'waiting'));
		}
	}

	/** Sends what waited, once each, and says so in the "Back online" line. */
	async flush(): Promise<void> {
		const sent = await this.outbox.flush(async (pending) => {
			this.#update((t) => markOwn(t, pending.id, 'sending'));
			await this.transport.send(pending);
			const at = timeOf(this.#now());
			this.#update((t) => markOwn(t, pending.id, 'sent', `Sent at ${at}, when the connection came back`));
		});
		if (sent.length === 0) return;
		this.back = { at: timeOf(this.#now()), sent: sent.length };
		this.#clearBack?.();
		this.#clearBack = this.#later(() => {
			this.back = undefined;
		}, this.#backMs);
	}

	choose(messageId: string, chipId: string): Promise<void> {
		return this.transport.choose(messageId, chipId);
	}

	tap(cardId: string, action: CardAction): Promise<void> {
		return this.transport.tap(cardId, action);
	}

	/** Stop: the turn ends where it is, and what was written stays. */
	async stop(): Promise<void> {
		const turn = activeTurn(this.timeline);
		if (!turn) return;
		this.#update((t) => finishTurn(t, turn.id));
		await this.transport.stop(turn.id);
	}

	#update(fn: (t: Timeline) => Timeline): void {
		this.queries.setQueryData<Timeline>(chatKeys.timeline, (t) => fn(t ?? emptyTimeline()));
	}
}

const KEY = Symbol('mp.chat');

export function provideChat(session: ChatSession): void {
	setContext(KEY, session);
}

export function useChat(): ChatSession {
	const session = getContext<ChatSession | undefined>(KEY);
	if (!session) throw new Error('the chat is used outside the shell that provides it');
	return session;
}
