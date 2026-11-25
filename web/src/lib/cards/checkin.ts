/** The check-in card (MA-205; picked on MA-193 as 1b, "Paid as the Confirm"; boards Web v4 · Check-ins and iPhone v4 ·
 * Check-ins): when a payment, a maturity or a valuation is due, the agent asks in the chat and one tap records the
 * answer. The expected answer is the filled button and saves exactly what the card shows, with Undo; the rest sit
 * behind Something else, each opening a short flow whose steps are cards of this same kind. Several due at once share
 * one card with compact rows. Shared by both doors: no framework, no Intl. Every value is text the agent wrote from the
 * records or the engine, never a figure the door works out; times travel as ISO 8601 and are written at the door.
 * MA-174 owns the card schema and may rename a field; MA-352 carries any such change over. */
import type { CardRow } from './kinds.ts';
import type { CardEnvelope } from './types.ts';

/** A button on the card. `id` is what the tap sends back. */
export interface CheckInAction {
	id: string;
	label: string;
	/** `primary` is the Confirm (the one filled button); `tinted` the others; `plain` a quiet choice. */
	style: 'primary' | 'tinted' | 'plain';
	/** `undo` draws the undo arrow before the label. */
	icon?: 'undo';
}

/** One of Something else's answers: what it is, and what it will do. */
export interface CheckInOption {
	id: string;
	label: string;
	note: string;
}

/** A compact row when several are due at once: its currency's tile, what it is, the amount, and where it stands. */
export interface CheckInItem {
	tile: string;
	name: string;
	note: string;
	value: string;
	/** "Overdue": amber, never red. */
	chip?: string;
	/** Ticked once saved. */
	done?: boolean;
}

export interface CheckInBody {
	/** The chip at the top: "Check-in", or "Check-ins" for several. A step of a short flow has `over` instead. */
	chip?: string;
	over?: string;
	/** Quiet words at the top right: "due today", "open again", "2 due", "answered"; `right_at` adds its time. */
	right?: string;
	right_at?: string;
	/** A step of a short flow can be cancelled from its head. */
	cancel?: string;
	/** The question, or what was saved; absent on an answer folded to its line. */
	title?: string;
	/** Draws the check before the title. */
	saved?: boolean;
	/** Answers already given, each folded to its line with a check. */
	answers?: CardRow[];
	/** A sentence under the title. */
	text?: string;
	/** Choices drawn in the card's body, the first full width. */
	picks?: CheckInAction[];
	rows?: CardRow[];
	items?: CheckInItem[];
	/** After Undo: when, and what Undo wrote. */
	undone?: { at: string; text: string };
	hint?: string;
	actions?: CheckInAction[];
	/** Something else's answers, opened in place under the buttons. */
	options?: CheckInOption[];
	/** The line at the foot once answered: "Saved · in the audit log", or "Noted · nothing saved to the loan". */
	fold?: { text: string; at: string; icon: 'saved' | 'noted' };
}

export type CheckInCard = CardEnvelope<'checkin', CheckInBody>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const optional = (v: unknown, test: (x: unknown) => boolean) => v === undefined || test(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const listOf = (test: (x: unknown) => boolean) => (v: unknown) => Array.isArray(v) && v.every(test);

const isRow = (v: unknown) => isObject(v) && isString(v.label) && isString(v.value);
const isAction = (v: unknown) =>
	isObject(v) &&
	isString(v.id) &&
	isString(v.label) &&
	(v.style === 'primary' || v.style === 'tinted' || v.style === 'plain') &&
	optional(v.icon, (i) => i === 'undo');
const isOption = (v: unknown) => isObject(v) && isString(v.id) && isString(v.label) && isString(v.note);
const isItem = (v: unknown) =>
	isObject(v) &&
	isString(v.tile) &&
	isString(v.name) &&
	isString(v.note) &&
	isString(v.value) &&
	optional(v.chip, isString) &&
	optional(v.done, (d) => typeof d === 'boolean');
const isUndone = (v: unknown) => isObject(v) && isString(v.at) && isString(v.text);
const isFold = (v: unknown) =>
	isObject(v) && isString(v.text) && isString(v.at) && (v.icon === 'saved' || v.icon === 'noted');

export function isCheckInCard(card: CardEnvelope): card is CheckInCard {
	const b = card.body;
	if (card.type !== 'checkin' || !isObject(b)) return false;
	const strings = ['chip', 'over', 'right', 'right_at', 'cancel', 'title', 'text', 'hint'] as const;
	return (
		strings.every((k) => optional(b[k], isString)) &&
		optional(b.saved, (s) => typeof s === 'boolean') &&
		optional(b.answers, listOf(isRow)) &&
		optional(b.rows, listOf(isRow)) &&
		optional(b.picks, listOf(isAction)) &&
		optional(b.actions, listOf(isAction)) &&
		optional(b.options, listOf(isOption)) &&
		optional(b.items, listOf(isItem)) &&
		optional(b.undone, isUndone) &&
		optional(b.fold, isFold)
	);
}
