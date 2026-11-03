/** The chat's cards: versioned JSON both doors render natively (MA-174 owns the schema and its versions). The
 * skeleton fixes the envelope every card shares, so a door can refuse a card it does not know rather than guess. */
export const CARD_SCHEMA_VERSION = 1;

export interface CardEnvelope<TType extends string = string, TBody = unknown> {
	/** The card's kind, e.g. "confirm" or "holding". */
	type: TType;
	/** The schema version the card was written against. */
	version: number;
	/** Stable id, so an update replaces the card in place. */
	id: string;
	/** A plain line for a door, a notification or a screen reader that cannot draw the card. */
	fallback: string;
	body: TBody;
}

export function isCardEnvelope(value: unknown): value is CardEnvelope {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.type === 'string' &&
		typeof v.version === 'number' &&
		Number.isInteger(v.version) &&
		typeof v.id === 'string' &&
		typeof v.fallback === 'string' &&
		'body' in v
	);
}

/** Whether this door can draw a card: a newer schema than it knows falls back to the card's plain line. */
export function canRender(card: CardEnvelope, known: number = CARD_SCHEMA_VERSION): boolean {
	return card.version <= known;
}
