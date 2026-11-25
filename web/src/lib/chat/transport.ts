/** The one seam between the chat and whatever answers it (MA-199). MA-199 ships the fake in `fake.ts`; MA-352 adds the
 * transport over the chat api (MA-31) and the stream (MA-30), and the chat's components do not change. */
import type { StreamFrame } from '#lib/api/stream.ts';
import type { FileRef } from './timeline.ts';

export interface Outgoing {
	/** The door's client id: the api takes a message once per id (MA-31). */
	id: string;
	text: string;
	file?: FileRef;
}

/** What a card's buttons ask for. A check-in card's buttons send their own ids, `checkin.<answer>` (MA-205). */
export type CardAction = 'confirm' | 'edit' | 'cancel' | `checkin.${string}`;

export interface ChatTransport {
	/** Starts delivering frames, in order; returns a function that stops. */
	connect(onFrame: (frame: StreamFrame) => void): () => void;
	/** Rejects when the message could not be handed off; the chat then keeps it in the outbox. */
	send(message: Outgoing): Promise<void>;
	/** The member's answer to a question asked with chips. */
	choose(messageId: string, chipId: string): Promise<void>;
	tap(cardId: string, action: CardAction): Promise<void>;
	/** Stops the turn that is streaming; what was written stays. */
	stop(turnId: string): Promise<void>;
}
