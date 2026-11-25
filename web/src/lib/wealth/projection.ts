/** What the Projection's Net worth view shows (ARCHITECTURE §6 and §8.3; board Web v4 · Projection, 1a the fan first):
 * the fan to a horizon, its milestones, the plan items and the assumptions with their sources, and what an admin may
 * correct in place. Every amount is a decimal string with its currency, formatted and masked at the door; a rate is
 * not money and is written out. The door works out no figure: it places what it is given. Types and the horizons the
 * screen offers: no framework, no Intl. */
import type { Currency, Decimal } from '#lib/formatting/money.ts';
import type { AxisTick, DisplayCurrency, Fig } from './overview.ts';

/** The horizons the screen offers, in years; it opens at 20 (§6). */
export const HORIZONS = [5, 10, 20, 30] as const;
export type Horizon = (typeof HORIZONS)[number];
export const DEFAULT_HORIZON: Horizon = 20;

/** The pounds or rupees of each year, or today's money. */
export type MoneyBasis = 'nominal' | 'today';

/** Never colour alone: a dot where a loan ends or someone retires, a tick for a maturity or a rate change, a square
 * for a plan item. The lists under the fan name each with the same shape. */
export type MarkShape = 'dot' | 'tick' | 'square';

/** One year of the fan: where 8 in 10 runs land, and the middle path through them. */
export interface FanPoint {
	year: number;
	low: Decimal;
	mid: Decimal;
	high: Decimal;
}

export interface FanLine {
	amount: Decimal;
	/** "£1m", "₹10 crore". */
	label: string;
}

export interface FanTick extends AxisTick {
	/** Left out where the chart is narrow. */
	minor?: boolean;
}

export interface FanMark {
	id: string;
	shape: MarkShape;
	/** Years from today. */
	at: number;
	/** A few words drawn beside the mark, on the few that carry them. */
	label?: string;
}

export interface Fan {
	years: Horizon;
	currency: DisplayCurrency;
	/** The top of the plot; the foot is nothing. */
	max: Decimal;
	/** Today, then each year to the horizon. */
	points: FanPoint[];
	lines: FanLine[];
	axis: FanTick[];
	marks: FanMark[];
	/** What a screen reader hears for the chart, and what it hears while the amounts are hidden. */
	aria: string;
	ariaPrivate: string;
}

export interface Milestone {
	id: string;
	icon: string;
	title: string;
	shape: MarkShape;
	/** "14 Dec 2026". */
	when: string;
	note?: string;
	/** "frees £347 a month". */
	noteFig?: Fig;
	fig?: Fig;
}

/** What an in-place correction shows before and after: a rate in words, or an amount. */
export type EditValue = { text: string } | { fig: Fig };

/** One figure an admin may correct in place: tap it, type the new value, see before → after, Save. */
export interface EditSpec {
	target: 'assumption' | 'plan';
	id: string;
	/** A rate in per cent, an amount in `currency`, or a month ("Jul 2041", sent as "2041-07"; MA-222). */
	kind: 'rate' | 'amount' | 'month';
	/** Which of a plan item's figures this is, when the plan has more than one to correct (MA-222's Plans view). */
	part?: PlanField;
	title: string;
	/** "A year · now 4.17%, his history blended with a prior". */
	field: string;
	/** What follows the typed digits: "%", "% a year". */
	unit: string;
	/** What stands before them in the field: "−£". */
	lead?: string;
	/** An amount's sign, which a correction keeps: a spend stays a spend. */
	sign?: string;
	currency?: Currency;
	/** The value as it would be typed, so an unchanged figure is not saved; absent when there is none yet. */
	current?: string;
	before: EditValue;
	hint?: string;
}

/** A correction as the door sends it: which figure, and the new value as typed and checked. */
export interface ProjectionCorrection {
	target: 'assumption' | 'plan';
	id: string;
	value: Decimal;
	/** Which figure of a plan item, when it has several (MA-222); absent, it is the one the Net worth view corrects. */
	part?: PlanField;
}

/** The figures of a plan item an admin corrects in place on the Plans view (MA-222). */
export type PlanField = 'amount' | 'start' | 'end' | 'growth';

export interface Source {
	kind: 'history' | 'prior' | 'contract' | 'member';
	/** "History, shrunk to a prior", "Set by Arun". */
	label: string;
}

export interface Assumption {
	id: string;
	name: string;
	/** "4.17%". */
	value: string;
	source: Source;
	why: string;
	edit?: EditSpec;
}

export interface AssumptionGroup {
	title: string;
	rows: Assumption[];
}

export interface PlanItem {
	id: string;
	icon: string;
	title: string;
	/** "Once, Jun 2027". */
	when: string;
	fig: Fig;
	/** After a correction: who made it, and what it was before. */
	corrected?: { by: string; was: string; wasFig?: Fig };
	edit?: EditSpec;
}

/** The last correction, as its card shows it once saved. */
export interface Saved {
	text: string;
	/** The audit row's own line; its amounts are hidden with the rest in privacy mode. */
	audit: string;
}

export interface Projection {
	/** True while the household has no records: the page then says so in words, and draws no fan. */
	empty: boolean;
	/** Under the title: what the fan is drawn in, and which run it is. */
	head: string;
	horizon: Horizon;
	money: MoneyBasis;
	currency: DisplayCurrency;
	hero: { over: string; mid: Fig; from: Fig; low: Fig; high: Fig };
	fan: Fan;
	/** Questions that open the chat. */
	chips: string[];
	milestones: Milestone[];
	plan: {
		aside: string;
		items: PlanItem[];
		/** Only an admin adds a plan item, and only in the chat. */
		canAdd: boolean;
		/** What a member who is not an admin is told. */
		note?: string;
		saved?: Saved;
	};
	assumptions: {
		note: string;
		/** A member who is not an admin sees a lock and no edit. */
		locked: boolean;
		groups: AssumptionGroup[];
		saved?: Saved;
	};
	foot: string;
}
