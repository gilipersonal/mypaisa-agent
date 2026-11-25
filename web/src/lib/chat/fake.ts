/** A scripted stand-in for the agent (MA-199), so the chat can be built and used before the chat api (MA-31) and the
 * stream (MA-30) exist. It speaks the stream's own frames (delta, reading, message, card, chosen), as the local stack's
 * do, so the timeline cannot tell it from the real thing. MA-352 replaces it with the real transport; it stays for tests
 * and the local preview. Its words and figures are the boards' (Web v4 · Shell and chat, 2a to 2d), and it says plainly
 * that it is a preview whenever it is asked something off its script. */
import type { StreamFrame } from '#lib/api/stream.ts';
import type { ConfirmCard, FigureCard } from '#lib/cards/kinds.ts';
import { CARD_SCHEMA_VERSION } from '#lib/cards/types.ts';
import { formatMoney } from '#lib/formatting/money.ts';
import type { StubHousehold } from '#lib/stub/household.ts';
import { monzoSavings } from '#lib/stub/records.ts';
import { PlanScript } from './plans.ts';
import type { CardAction, ChatTransport, Outgoing } from './transport.ts';

export interface Clock {
	now(): Date;
	/** Runs `fn` after `ms`; returns a cancel. */
	later(fn: () => void, ms: number): () => void;
}

export const realClock: Clock = {
	now: () => new Date(),
	later: (fn, ms) => {
		const t = setTimeout(fn, ms);
		return () => {
			clearTimeout(t);
		};
	}
};

export const PREVIEW_REPLY =
	'This is a preview of the chat: the replies are scripted until MyPaisa is connected. Try "£5,000 in Monzo savings", "What can we get at quickly now?" or "What\'s due this week?", or send a statement.';
export const LIQUID_REPLY =
	"Money you could get at within days: the new Monzo savings, the Monzo pot, the NRE account in India, and the funds and shares if you sold them. Asha's fixed-rate saver unlocks on Mon 14 Dec; the pensions not until 57.";
export const DUE_REPLY =
	"Two things this week: the valuation of Home, Reading is due on Fri 30 Oct, and October's budget closes on Sun 1 Nov, the day the Barclaycard statement comes.";
export const NET_WORTH_REPLY =
	"The household's net worth today, everything owned less everything owed, from the engine:";
export const DONE_REPLY = 'Done. Tell me the next one the same way, or send a statement.';
export const WHOSE_ASK = 'A savings account at Monzo. Whose is it?';
export const READING_META = 'Kept for good before anything reads it. A card with every line sorted comes next.';

const WHOSE = [
	{ id: 'arun', label: 'Arun' },
	{ id: 'asha', label: 'Asha' },
	{ id: 'joint', label: 'Joint' }
];
const OWNER: Record<string, string> = {
	arun: 'Arun, all of it',
	asha: 'Asha, all of it',
	joint: 'Arun and Asha, half each'
};

interface Draft {
	turn: string;
	amount: string;
	owner?: string;
	cardId: string;
}

export class FakeTransport implements ChatTransport {
	#onFrame: ((frame: StreamFrame) => void) | undefined;
	#cancels = new Map<string, () => void>();
	#drafts = new Map<string, Draft>();
	#seq = 0;
	/** MA-222: a plan item made by talking, in its own script (`./plans.ts`). */
	#plans = new PlanScript({
		emit: (event, data) => {
			this.#emit(event, data);
		},
		after: (key, fn) => {
			this.#after(key, fn);
		},
		now: () => this.clock.now(),
		household: () => this.household
	});

	constructor(
		private readonly clock: Clock = realClock,
		/** How long between two words while a reply streams. */
		private readonly wordMs = 45,
		/** How long the agent takes before it answers. */
		private readonly thinkMs = 500,
		/** The stub household Confirm writes to (MA-208), so the pages beside the chat move when a record is saved. */
		private readonly household?: StubHousehold
	) {}

	connect(onFrame: (frame: StreamFrame) => void): () => void {
		this.#onFrame = onFrame;
		return () => {
			this.#onFrame = undefined;
			for (const cancel of this.#cancels.values()) cancel();
			this.#cancels.clear();
		};
	}

	send(message: Outgoing): Promise<void> {
		if (!this.#onFrame) return Promise.reject(new Error('not connected'));
		this.#emit('message', {
			id: message.id,
			role: 'member',
			text: message.text,
			at: this.clock.now().toISOString(),
			...(message.file ? { file: message.file } : {})
		});
		this.#after(message.id, () => {
			this.#answer(message);
		});
		return Promise.resolve();
	}

	choose(messageId: string, chipId: string): Promise<void> {
		if (this.#plans.choose(messageId, chipId)) return Promise.resolve();
		const draft = this.#drafts.get(messageId);
		const chip = WHOSE.find((c) => c.id === chipId);
		if (!draft || !chip) return Promise.resolve();
		draft.owner = chipId;
		this.#emit('chosen', { message_id: messageId, chip_id: chipId });
		const answer = `${messageId}.a`;
		this.#emit('message', { id: answer, role: 'member', text: chip.label, at: this.clock.now().toISOString() });
		this.#after(answer, () => {
			this.#emit('message', { id: answer, role: 'agent', text: '', cards: [this.#confirm(draft, 'open')] });
		});
		return Promise.resolve();
	}

	tap(cardId: string, action: CardAction): Promise<void> {
		if (this.#plans.tap(cardId, action)) return Promise.resolve();
		const draft = [...this.#drafts.values()].find((d) => d.cardId === cardId);
		if (!draft) return Promise.resolve();
		if (action === 'confirm') {
			this.#emit('card', { card: this.#confirm(draft, 'saved') });
			// As the api does after a write (ARCHITECTURE §19.5): the record is kept, then every open door is told.
			if (this.household) {
				const record = monzoSavings(draft.amount, draft.owner ?? 'arun');
				this.household.add(record, this.clock.now(), 'added in the chat');
				this.#emit('records.changed', { record_id: record.id, reason: 'added' });
			}
			this.#after(`${cardId}.done`, () => {
				this.#emit('message', { id: `${cardId}.done`, role: 'agent', text: DONE_REPLY });
			});
		} else if (action === 'cancel') {
			this.#emit('card', { card: this.#confirm(draft, 'cancelled') });
		} else {
			// Edit reopens the question it changes: whose.
			const turn = `${cardId}.edit`;
			this.#drafts.set(turn, { ...draft, turn, cardId: `${cardId}.e` });
			this.#emit('message', { id: turn, role: 'agent', text: WHOSE_ASK, chips: WHOSE });
		}
		return Promise.resolve();
	}

	stop(turnId: string): Promise<void> {
		this.#cancels.get(turnId)?.();
		this.#cancels.delete(turnId);
		return Promise.resolve();
	}

	#emit(event: string, data: Record<string, unknown>): void {
		this.#seq += 1;
		this.#onFrame?.({ id: this.#seq, event, data });
	}

	#after(key: string, fn: () => void, ms = this.thinkMs): void {
		const cancel = this.clock.later(() => {
			this.#cancels.delete(key);
			fn();
		}, ms);
		this.#cancels.set(key, cancel);
	}

	#answer(message: Outgoing): void {
		const id = message.id;
		if (message.file) {
			this.#emit('reading', { turn_id: id, text: 'Reading it…', meta: READING_META });
			return;
		}
		if (this.#plans.answer(message)) return;
		const text = message.text.trim();
		const savings = /£\s?([\d,]+(?:\.\d+)?)\s+in\s+monzo/i.exec(text);
		if (savings?.[1]) {
			const amount = savings[1].replaceAll(',', '');
			this.#drafts.set(id, { turn: id, amount, cardId: `${id}.card` });
			this.#emit('message', { id, role: 'agent', text: WHOSE_ASK, chips: WHOSE });
		} else if (/net ?worth/i.test(text)) {
			this.#stream(id, NET_WORTH_REPLY, [this.#netWorth(id)]);
		} else if (/quickly|liquid/i.test(text)) {
			this.#stream(id, LIQUID_REPLY, [this.#liquid(id)]);
		} else if (/due/i.test(text)) {
			this.#stream(id, DUE_REPLY, [], 'From the registry: what is due');
		} else {
			this.#stream(id, PREVIEW_REPLY, []);
		}
	}

	/** Streams `text` a word at a time, then the finished message with its cards. Stop cancels what is left. */
	#stream(id: string, text: string, cards: unknown[], meta?: string): void {
		const words = text.split(/(?<= )/);
		let i = 0;
		const next = () => {
			const word = words[i];
			if (word === undefined) {
				this.#emit('message', { id, role: 'agent', text, cards, ...(meta ? { meta } : {}) });
				return;
			}
			this.#emit('delta', { turn_id: id, text: word });
			i += 1;
			this.#after(id, next, this.wordMs);
		};
		next();
	}

	#confirm(draft: Draft, state: ConfirmCard['body']['state']): ConfirmCard {
		const amount = formatMoney(draft.amount, 'GBP', { whole: !draft.amount.includes('.') });
		const owner = OWNER[draft.owner ?? 'arun'] ?? '';
		const open = state === 'open';
		return {
			type: 'confirm',
			version: CARD_SCHEMA_VERSION,
			id: draft.cardId,
			fallback: `New savings account at Monzo: ${amount}. ${open ? 'Confirm?' : state === 'saved' ? 'Saved.' : 'Not saved.'}`,
			body: {
				over: `New savings account · ${open ? 'check it' : state === 'saved' ? 'saved' : 'not saved'}`,
				title: 'Instant access savings · Monzo',
				rows: open
					? [
							{ label: 'Whose', value: owner },
							{ label: 'Balance', value: `${amount}, from your message` },
							{ label: 'Where', value: 'UK · pounds' },
							{ label: 'Get at it', value: 'any time, so it counts as liquid' }
						]
					: [
							{ label: 'Whose', value: owner },
							{ label: 'Balance', value: amount }
						],
				state,
				...(open ? { hint: 'Nothing is saved until you tap Confirm.' } : {}),
				...(state === 'saved' ? { saved_at: this.clock.now().toISOString() } : {})
			}
		};
	}

	#netWorth(id: string): FigureCard {
		return {
			type: 'figure',
			version: CARD_SCHEMA_VERSION,
			id: `${id}.networth`,
			fallback: 'Net worth, household: £444,951.',
			body: {
				over: 'Net worth · household',
				value: { amount: '444951', currency: 'GBP' },
				was: { value: { amount: '439951', currency: 'GBP' }, why: 'before the new savings' },
				source: 'Figures: the engine'
			}
		};
	}

	#liquid(id: string): FigureCard {
		return {
			type: 'figure',
			version: CARD_SCHEMA_VERSION,
			id: `${id}.liquid`,
			fallback: 'Liquid now, household: £37,596.',
			body: {
				over: 'Liquid now · household',
				value: { amount: '37596', currency: 'GBP' },
				was: { value: { amount: '32596', currency: 'GBP' }, why: 'before the new savings' },
				source: 'Figures: the engine'
			}
		};
	}
}
