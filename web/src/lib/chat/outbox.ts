/** What the member typed while offline, kept in this browser so a reload loses nothing (MA-199, board Browser · Chat,
 * offline), and sent once, in order, when the connection is back. A message leaves the outbox only once the transport
 * has taken it; a failure stops the flush there, so the order holds and nothing is sent twice. */
import type { FileRef } from './timeline.ts';

export interface Pending {
	id: string;
	text: string;
	at: string;
	file?: FileRef;
}

/** The part of the Web Storage API the outbox uses; a test passes a map. */
export type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isPending = (v: unknown): v is Pending => {
	if (typeof v !== 'object' || v === null) return false;
	const p = v as Record<string, unknown>;
	return typeof p.id === 'string' && typeof p.text === 'string' && typeof p.at === 'string';
};

export class Outbox {
	#flushing = false;

	constructor(
		private readonly store: KeyValue | undefined,
		private readonly key = 'mp.chat.outbox'
	) {}

	list(): Pending[] {
		try {
			const raw = this.store?.getItem(this.key);
			if (!raw) return [];
			const parsed: unknown = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed.filter(isPending) : [];
		} catch {
			return []; // storage blocked, or a value this version cannot read: nothing is waiting
		}
	}

	add(pending: Pending): void {
		this.#write([...this.list().filter((p) => p.id !== pending.id), pending]);
	}

	remove(id: string): void {
		this.#write(this.list().filter((p) => p.id !== id));
	}

	/** Sends what waits, oldest first, each once. Returns the ones sent. A second call while one runs does nothing. */
	async flush(send: (pending: Pending) => Promise<void>): Promise<Pending[]> {
		if (this.#flushing) return [];
		this.#flushing = true;
		const sent: Pending[] = [];
		try {
			for (const pending of this.list()) {
				await send(pending);
				this.remove(pending.id);
				sent.push(pending);
			}
		} catch {
			// the rest waits for the next time the connection comes back
		} finally {
			this.#flushing = false;
		}
		return sent;
	}

	#write(items: Pending[]): void {
		try {
			if (items.length === 0) this.store?.removeItem(this.key);
			else this.store?.setItem(this.key, JSON.stringify(items));
		} catch {
			// a full or blocked storage: the message still shows as waiting in this page
		}
	}
}
