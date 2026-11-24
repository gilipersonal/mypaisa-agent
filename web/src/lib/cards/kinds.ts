/** The bodies of the two cards the picked chat boards draw (MA-199, Web v4 · Shell and chat 2a and 2b): the Confirm
 * card (propose_change) and an engine figure. MA-174 owns the schema and may rename a field; MA-352 carries any such
 * change over. Shared by both doors: no framework, no Intl. A row's value is text the agent wrote from the draft or the
 * engine, never a figure the door works out; an amount is a decimal string with its currency, formatted at the door. */
import type { Currency, Decimal } from '#lib/formatting/money.ts';
import { CURRENCIES, isDecimal } from '#lib/formatting/money.ts';
import type { CardEnvelope } from './types.ts';

export interface CardRow {
	label: string;
	value: string;
}

export interface ConfirmBody {
	/** The small line over the title: what kind of change, and where it stands. */
	over: string;
	title: string;
	rows: CardRow[];
	/** A quiet line under the rows, shown while the card waits. */
	hint?: string;
	state: 'open' | 'saved' | 'cancelled';
	/** ISO 8601, when Confirm saved it; the card says "Saved · in the audit log" with the time. */
	saved_at?: string;
}

export interface Money {
	amount: Decimal;
	currency: Currency;
}

export interface FigureBody {
	over: string;
	value: Money;
	/** What it was before, and why it moved: drawn "It was £32,596 before the new savings", the amount masked with
	 * every other in privacy mode. */
	was?: { value: Money; why: string };
	/** Where the figure came from: always the engine or the registry, never the model. */
	source: string;
}

export type ConfirmCard = CardEnvelope<'confirm', ConfirmBody>;
export type FigureCard = CardEnvelope<'figure', FigureBody>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isRow(v: unknown): v is CardRow {
	return isObject(v) && typeof v.label === 'string' && typeof v.value === 'string';
}

export function isConfirmCard(card: CardEnvelope): card is ConfirmCard {
	const b = card.body;
	return (
		card.type === 'confirm' &&
		isObject(b) &&
		typeof b.over === 'string' &&
		typeof b.title === 'string' &&
		Array.isArray(b.rows) &&
		b.rows.every(isRow) &&
		(b.state === 'open' || b.state === 'saved' || b.state === 'cancelled') &&
		(b.hint === undefined || typeof b.hint === 'string') &&
		(b.saved_at === undefined || typeof b.saved_at === 'string')
	);
}

function isMoney(v: unknown): v is Money {
	return (
		isObject(v) &&
		typeof v.amount === 'string' &&
		isDecimal(v.amount) &&
		(CURRENCIES as readonly unknown[]).includes(v.currency)
	);
}

export function isFigureCard(card: CardEnvelope): card is FigureCard {
	const b = card.body;
	return (
		card.type === 'figure' &&
		isObject(b) &&
		typeof b.over === 'string' &&
		isMoney(b.value) &&
		typeof b.source === 'string' &&
		(b.was === undefined || (isObject(b.was) && isMoney(b.was.value) && typeof b.was.why === 'string'))
	);
}
