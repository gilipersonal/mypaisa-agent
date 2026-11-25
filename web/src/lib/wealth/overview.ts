/** What the Overview shows (ARCHITECTURE §8.3; board Web v4 · Dashboard, 1a Net worth first): a hero and rows of cards,
 * each card a title and a few parts. The parts are the board's own grammar (meters, a stacked bar, dated rows, run-off
 * bars, record rows, a list, a line of text, a link), so the Assets, Debts and Budget pages draw theirs from the same
 * pieces. Every amount is a decimal string with its currency, formatted and masked at the door; the door works out no
 * figure. Types only: no framework, no Intl. */
import type { Currency, Decimal } from '#lib/formatting/money.ts';

/** The currencies a member can read the totals in so far (MA-213 adds dollars and euros). */
export type DisplayCurrency = 'GBP' | 'INR';

/** An amount with the words that travel with it: "▲ £5,000", "≈ £97,778", "£347 a month". */
export interface Fig {
	amount: Decimal;
	currency: Currency;
	pre?: string;
	post?: string;
}

export interface Meter {
	label: string;
	fig: Fig;
	/** How much of the track is filled, 0 to 1. */
	share: number;
	tone: 'meter' | 'owed';
	note: string;
	noteFig?: Fig;
	/** What a screen reader hears for the bar; its amounts are hidden with the rest in privacy mode. */
	aria: string;
}

export interface StackItem {
	label: string;
	fig: Fig;
	share: number;
	tone: 'chart-2' | 'chart-4' | 'chart-5';
	note: string;
	noteFig?: Fig;
	noteAfter?: string;
}

export interface Chip {
	tone: 'pause' | 'neutral' | 'add';
	text: string;
}

export interface DueItem {
	id: string;
	today: boolean;
	weekday: string;
	day: string;
	month: string;
	/** Shown only for a day beyond the months ahead. */
	year?: string;
	title: string;
	note: string;
	noteFig?: Fig;
	fig?: Fig;
	chip: Chip;
}

export interface RunoffItem {
	id: string;
	name: string;
	fig: Fig;
	/** The loan's time left against the longest loan's, 0 to 1. */
	share: number;
	note: string;
	noteFig?: Fig;
	ends: string;
	aria: string;
}

export interface AxisTick {
	label: string;
	/** Where along the axis, 0 to 1. */
	at: number;
}

export interface RecordRow {
	id: string;
	/** Two letters that stand for the record until it has an icon (MA-241). */
	lead: string;
	name: string;
	/** Where it is held and in what: "UK · £". */
	place: string;
	/** Set for a joint record: "Arun 50% · Asha 50%". */
	joint?: string;
	note: string;
	fig: Fig;
	/** The same value in the other currency, beside it. */
	alt?: Fig;
}

export interface StartItem {
	id: string;
	icon: string;
	title: string;
	note: string;
	action: string;
}

export type Part =
	| { kind: 'meters'; items: Meter[] }
	| { kind: 'stack'; aria: string; items: StackItem[] }
	| { kind: 'due'; items: DueItem[] }
	| { kind: 'runoff'; items: RunoffItem[]; axis: AxisTick[] }
	| { kind: 'rows'; items: RecordRow[] }
	| { kind: 'list'; items: StartItem[] }
	| { kind: 'text'; text: string; fig?: Fig; after?: string }
	| { kind: 'link'; text: string; href: string };

export interface WealthCard {
	id: string;
	title: string;
	/** The quiet words at the title's right, after `asideFig` if there is one. */
	aside: string;
	asideFig?: Fig;
	parts: Part[];
}

export interface CardRow {
	/** `two` is the page's two columns; `one` a single full-width column. */
	layout: 'two' | 'one';
	columns: WealthCard[][];
}

export interface Hero {
	over: string;
	/** Absent while the household has no records: the hero then says so in words, never £0. */
	net?: Fig;
	/** What the last change added, and the total before it, so the figure can roll from one to the other. */
	delta?: Fig;
	rollFrom?: Decimal;
	/** When the last change was made, ISO 8601: the door shows "Just now" while it is. */
	changedAt?: string;
	line: string;
	rate: string;
}

export interface ViewOption {
	id: string;
	label: string;
}

export interface Overview {
	empty: boolean;
	/** "Household · Mon 26 Oct · Illustrative figures". */
	head: string;
	view: string;
	views: ViewOption[];
	currency: DisplayCurrency;
	hero: Hero;
	rows: CardRow[];
	foot: string;
}
