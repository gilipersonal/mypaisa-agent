/** The conversation as the web door holds it (MA-199), built from the stream's frames (ARCHITECTURE §19.5) by one pure
 * reducer, so the fake transport here and the real stream (MA-352) fill the same cache the same way. Frames carry an
 * event id when they come from the log; a frame at or before the last one applied is skipped, so nothing lands twice. */
import { isCardEnvelope, type CardEnvelope } from '#lib/cards/types.ts';
import type { StreamFrame } from '#lib/api/stream.ts';

export type Role = 'member' | 'agent';

/** Where a member's own message stands: kept in this browser while offline, on its way, or taken by the api. */
export type Delivery = 'waiting' | 'sending' | 'sent';

/** How far an agent's turn has got: words still arriving, a file being read, or finished. */
export type Phase = 'streaming' | 'reading' | 'done';

export interface Chip {
	id: string;
	label: string;
}

export interface FileRef {
	name: string;
	/** A plain description of the file: its kind and size. */
	meta: string;
}

export interface ChatMessage {
	/** The member's client id; an agent's turn carries the id of the message it answers. */
	id: string;
	role: Role;
	/** ISO 8601, when it was written. */
	at: string;
	text: string;
	delivery?: Delivery;
	/** Set when a message waited offline: when it went, in the member's words. */
	sentLate?: string;
	file?: FileRef;
	/** The one question's answers (ask_user): chosen once, the rest stay as they were drawn. */
	chips?: Chip[];
	chosen?: string;
	cards?: CardEnvelope[];
	/** A quiet line under an agent's words: where its figures come from, or what happens next. */
	meta?: string;
	phase?: Phase;
}

export interface Timeline {
	messages: ChatMessage[];
	/** The id of the last logged frame applied; 0 before any. */
	lastEventId: number;
}

export const emptyTimeline = (): Timeline => ({ messages: [], lastEventId: 0 });

/** Messages are keyed by role and id together: an agent's turn shares its id with the message it answers. */
export const messageKey = (m: Pick<ChatMessage, 'role' | 'id'>): string => `${m.role}:${m.id}`;

function upsert(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
	const key = messageKey(next);
	const at = messages.findIndex((m) => messageKey(m) === key);
	if (at === -1) return [...messages, next];
	const copy = messages.slice();
	copy[at] = { ...messages[at], ...next };
	return copy;
}

function find(messages: ChatMessage[], role: Role, id: string): ChatMessage | undefined {
	return messages.find((m) => m.role === role && m.id === id);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

function chipsOf(v: unknown): Chip[] | undefined {
	if (!Array.isArray(v)) return undefined;
	const chips = v.filter(isObject).flatMap((c) => {
		const id = str(c.id);
		const label = str(c.label);
		return id && label ? [{ id, label }] : [];
	});
	return chips.length > 0 ? chips : undefined;
}

function fileOf(v: unknown): FileRef | undefined {
	if (!isObject(v)) return undefined;
	const name = str(v.name);
	const meta = str(v.meta);
	return name && meta !== undefined ? { name, meta } : undefined;
}

/** Applies one frame. Unknown events and malformed data leave the timeline as it was. */
export function applyFrame(timeline: Timeline, frame: StreamFrame, now: () => Date = () => new Date()): Timeline {
	if (frame.id !== undefined && frame.id <= timeline.lastEventId) return timeline;
	const lastEventId = frame.id ?? timeline.lastEventId;
	const data = frame.data;
	if (frame.event === 'resync') return { messages: [], lastEventId: 0 };
	if (!isObject(data)) return { ...timeline, lastEventId };
	const { messages } = timeline;

	switch (frame.event) {
		case 'delta': {
			const id = str(data.turn_id);
			const text = str(data.text);
			if (!id || text === undefined) break;
			const was = find(messages, 'agent', id);
			if (was?.phase === 'done') break; // a stopped or finished turn takes no more words
			const next: ChatMessage = {
				id,
				role: 'agent',
				at: was?.at ?? now().toISOString(),
				text: (was?.phase === 'streaming' ? was.text : '') + text,
				phase: 'streaming'
			};
			return { messages: upsert(messages, next), lastEventId };
		}
		case 'reading': {
			const id = str(data.turn_id);
			if (!id) break;
			const was = find(messages, 'agent', id);
			const next: ChatMessage = {
				id,
				role: 'agent',
				at: was?.at ?? now().toISOString(),
				text: str(data.text) ?? 'Reading it…',
				phase: 'reading'
			};
			const meta = str(data.meta);
			if (meta) next.meta = meta;
			return { messages: upsert(messages, next), lastEventId };
		}
		case 'message': {
			const id = str(data.id);
			const role = data.role === 'member' ? 'member' : data.role === 'agent' ? 'agent' : undefined;
			if (!id || !role) break;
			const was = find(messages, role, id);
			const next: ChatMessage = {
				id,
				role,
				at: str(data.at) ?? was?.at ?? now().toISOString(),
				text: str(data.text) ?? was?.text ?? ''
			};
			if (role === 'member') next.delivery = 'sent';
			else next.phase = 'done';
			const cards = Array.isArray(data.cards) ? data.cards.filter(isCardEnvelope) : [];
			if (cards.length > 0) next.cards = cards;
			const chips = chipsOf(data.chips);
			if (chips) next.chips = chips;
			const meta = str(data.meta);
			if (meta) next.meta = meta;
			const file = fileOf(data.file);
			if (file) next.file = file;
			return { messages: upsert(messages, next), lastEventId };
		}
		case 'card': {
			const card = data.card;
			if (!isCardEnvelope(card)) break;
			const updated = messages.map((m) =>
				m.cards?.some((c) => c.id === card.id) ? { ...m, cards: m.cards.map((c) => (c.id === card.id ? card : c)) } : m
			);
			return { messages: updated, lastEventId };
		}
		case 'chosen': {
			const id = str(data.message_id);
			const chip = str(data.chip_id);
			if (!id || !chip) break;
			return {
				messages: messages.map((m) => (m.role === 'agent' && m.id === id ? { ...m, chosen: chip } : m)),
				lastEventId
			};
		}
	}
	return { ...timeline, lastEventId };
}

/** Adds the member's own message before the api has it, so it shows at once. */
export function addOwn(
	timeline: Timeline,
	message: { id: string; text: string; at: string; file?: FileRef },
	delivery: Delivery
): Timeline {
	return {
		...timeline,
		messages: upsert(timeline.messages, { ...message, role: 'member', delivery })
	};
}

/** Marks the member's own message as it moves: sending, then sent (with when, if it had waited). */
export function markOwn(timeline: Timeline, id: string, delivery: Delivery, sentLate?: string): Timeline {
	return {
		...timeline,
		messages: timeline.messages.map((m) =>
			m.role === 'member' && m.id === id ? { ...m, delivery, ...(sentLate ? { sentLate } : {}) } : m
		)
	};
}

/** Ends a turn where it stands: Stop keeps what was written. */
export function finishTurn(timeline: Timeline, id: string): Timeline {
	return {
		...timeline,
		messages: timeline.messages.map((m) => (m.role === 'agent' && m.id === id ? { ...m, phase: 'done' } : m))
	};
}

/** The agent's turn still in progress, if any: the composer offers Stop while it streams. */
export function activeTurn(timeline: Timeline): ChatMessage | undefined {
	return timeline.messages.findLast((m) => m.role === 'agent' && m.phase === 'streaming');
}
