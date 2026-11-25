/** Two small rules the chat sheet keeps (MA-357): what New conversation leaves, and a Confirm tapped offline. */
import type { Timeline } from '#lib/chat/timeline.ts';
import type { CardAction } from '#lib/chat/transport.ts';

/** New conversation: an empty thread, keeping only what the member wrote that has not gone yet (it still sends by
 * itself) and the stream's place, so nothing already applied comes back. Until the chat api keeps threads (MA-352),
 * the earlier messages leave this view only; nothing is deleted. */
export function freshThread(timeline: Timeline): Timeline {
	return {
		lastEventId: timeline.lastEventId,
		messages: timeline.messages.filter(
			(m) => m.role === 'member' && (m.delivery === 'waiting' || m.delivery === 'sending')
		)
	};
}

/** A Confirm writes, and a write needs the connection: offline it is held, nothing is saved, and the card stays open
 * so it can be tapped again once the connection is back. */
export function holdsOffline(action: CardAction, online: boolean): boolean {
	return !online && action === 'confirm';
}
