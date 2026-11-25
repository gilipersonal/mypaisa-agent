/** The plan card (MA-222; board Web v4 · Plans in the chat, 2a a card per step, and its states): one card per step of
 * a plan made by talking, built from a few blocks, as the boards draw them. The questions (only what the admin's words
 * left out), each with its chips; the impact from the engine, with its own Confirm; the plan saved, with its audit
 * row; or a refusal. MA-174 owns the schema and may rename a field; MA-352 carries any such change over. Shared by
 * both doors: no framework, no Intl. A line is text the agent wrote from the draft or the engine; its amounts are
 * masked at the door. A chart's amounts are decimal strings; the door only places them. */
import { isDecimal, type Decimal } from '#lib/formatting/money.ts';
import type { CardEnvelope } from './types.ts';

export interface PlanChip {
	id: string;
	label: string;
}

/** A chart of a yearly figure, before and after: bars for after, a dashed line for before, a year flagged ▼. */
export interface PlanBars {
	kind: 'bars';
	/** What a screen reader hears, in words, with its amounts. */
	aria: string;
	values: Decimal[];
	before: Decimal[];
	flagged: boolean[];
	/** The top and foot of the plot. */
	max: Decimal;
	min: Decimal;
	grid: { amount: Decimal; label: string }[];
	axis: { label: string; at: number }[];
	legend: { bar: string; line: string };
}

export type PlanBlock =
	| { kind: 'kv'; k: string; v: string }
	| { kind: 'q'; id: string; q: string; chips: PlanChip[]; chosen?: string }
	| { kind: 'sec'; t: string; r?: string }
	| { kind: 'mp3'; rows: { y: string; v: string; chg: string; dir: 'up' | 'down' | 'same' }[] }
	| { kind: 'foot'; t: string }
	| { kind: 'flag'; t: string }
	| { kind: 'ok'; t: string }
	| { kind: 'lock'; t: string }
	| { kind: 'aud'; t: string }
	| PlanBars;

export interface PlanBody {
	/** The small line over the title: "New plan item", "Not saved yet", "Added to the plan". */
	over: string;
	/** Drawn with the tick, in the add colour: the plan is saved. */
	done?: boolean;
	title: string;
	sub?: string;
	blocks: PlanBlock[];
	/** The card's own buttons: Confirm, Change (the questions again) and Cancel. */
	acts?: ('confirm' | 'edit' | 'cancel')[];
	/** The audit row, as a quiet strip at the card's foot. */
	audit?: string;
	/** What the agent called and wrote, under a fold. */
	tech?: { label: string; open: boolean; lines: string[] };
}

export type PlanCard = CardEnvelope<'plan', PlanBody>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isText = (v: unknown): v is string => typeof v === 'string';
const isTexts = (v: unknown): v is string[] => Array.isArray(v) && v.every(isText);
const isDecimals = (v: unknown): v is Decimal[] => Array.isArray(v) && v.every((d) => isText(d) && isDecimal(d));

function isChip(v: unknown): v is PlanChip {
	return isObject(v) && isText(v.id) && isText(v.label);
}

function isBars(b: Record<string, unknown>): boolean {
	return (
		isText(b.aria) &&
		isDecimals(b.values) &&
		isDecimals(b.before) &&
		Array.isArray(b.flagged) &&
		b.flagged.every((f) => typeof f === 'boolean') &&
		isText(b.max) &&
		isDecimal(b.max) &&
		isText(b.min) &&
		isDecimal(b.min) &&
		Array.isArray(b.grid) &&
		b.grid.every((g) => isObject(g) && isText(g.amount) && isDecimal(g.amount) && isText(g.label)) &&
		Array.isArray(b.axis) &&
		b.axis.every((a) => isObject(a) && isText(a.label) && typeof a.at === 'number') &&
		isObject(b.legend) &&
		isText(b.legend.bar) &&
		isText(b.legend.line)
	);
}

function isBlock(v: unknown): v is PlanBlock {
	if (!isObject(v)) return false;
	switch (v.kind) {
		case 'kv':
			return isText(v.k) && isText(v.v);
		case 'q':
			return (
				isText(v.id) &&
				isText(v.q) &&
				Array.isArray(v.chips) &&
				v.chips.every(isChip) &&
				(v.chosen === undefined || isText(v.chosen))
			);
		case 'sec':
			return isText(v.t) && (v.r === undefined || isText(v.r));
		case 'mp3':
			return (
				Array.isArray(v.rows) &&
				v.rows.every(
					(r) =>
						isObject(r) &&
						isText(r.y) &&
						isText(r.v) &&
						isText(r.chg) &&
						(r.dir === 'up' || r.dir === 'down' || r.dir === 'same')
				)
			);
		case 'foot':
		case 'flag':
		case 'ok':
		case 'lock':
		case 'aud':
			return isText(v.t);
		case 'bars':
			return isBars(v);
		default:
			return false;
	}
}

export function isPlanCard(card: CardEnvelope): card is PlanCard {
	const b = card.body;
	return (
		card.type === 'plan' &&
		isObject(b) &&
		isText(b.over) &&
		isText(b.title) &&
		(b.sub === undefined || isText(b.sub)) &&
		(b.done === undefined || typeof b.done === 'boolean') &&
		Array.isArray(b.blocks) &&
		b.blocks.every(isBlock) &&
		(b.acts === undefined ||
			(Array.isArray(b.acts) && b.acts.every((a) => a === 'confirm' || a === 'edit' || a === 'cancel'))) &&
		(b.audit === undefined || isText(b.audit)) &&
		(b.tech === undefined ||
			(isObject(b.tech) && isText(b.tech.label) && typeof b.tech.open === 'boolean' && isTexts(b.tech.lines)))
	);
}
