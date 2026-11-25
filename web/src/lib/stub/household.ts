/** The illustrative household behind the stubbed pages (Arun, 25 Nov 2026: "complete all the UX implementation work that
 * we designed using stubbed data"). Its records are the design figure set's own, `docs/design/figures/household-v4.json`,
 * copied to `household.json` and held equal by a test, so a stubbed page and its board show the same figures. The
 * household starts as the boards do before the first record (£439,951 across 20 records) and takes the records the
 * chat's Confirm adds. Each phase's backend story replaces what reads this with the api; nothing here is the product's
 * engine. Every name, balance and account is illustrative. */
import figures from './household.json';

export type Country = 'UK' | 'IN';
export type RecordCurrency = 'GBP' | 'INR';
/** A member's id and their percentage of a record. */
export type Share = readonly [member: string, percent: number];

export interface StubMember {
	id: string;
	name: string;
	role: string;
	admin: boolean;
}

export interface StubAsset {
	id: string;
	kind: string;
	name: string;
	account?: string;
	country: Country;
	ccy: RecordCurrency;
	owners: readonly Share[];
	value: number;
	/** `liquid`, `locked`, `locked until 57`, or `locked until <the day it matures>`. */
	liquidity: string;
	valued?: string;
	valuation_due?: string;
	rate?: number;
	matures?: string;
	at_maturity?: number;
	sum_assured?: number;
	unlocks_at?: number;
}

export interface StubDebt {
	id: string;
	kind: string;
	name: string;
	country: Country;
	ccy: RecordCurrency;
	owners: readonly Share[];
	balance: number;
	payment?: number;
	rate?: number;
	rate_note?: string;
	ends?: string;
	autopay: boolean;
	statement?: { balance: number; due: string; paid: string };
}

/** A plan item as the figure set holds it: a one-off (`repeat` null) or a yearly flow from `when` to `until`. */
export interface StubPlanItem {
	id: string;
	what: string;
	ccy: RecordCurrency;
	amount: number;
	when: string;
	repeat: string | null;
	until?: string;
}

/** A milestone from the records: its day, what happens, and the amount it pays or the payment it frees, as written. */
export interface StubMilestone {
	when: string;
	what: string;
	amount?: string;
	frees?: string;
}

/** The Projection's inputs in the figure set: where it starts, its rates, its plan items and its milestones. */
export interface ProjectionFigures {
	start_net_gbp: number;
	assumptions: Record<string, number>;
	inflation: { UK: number; IN: number };
	plan_items: StubPlanItem[];
	milestones: StubMilestone[];
}

interface FigureSet {
	clock: { today: string; today_label: string; prices_label: string; fx: { gbp_inr: number; source: string } };
	members: StubMember[];
	assets: StubAsset[];
	debts: StubDebt[];
	totals_after_correction: { net_gbp: number; net_inr: number };
	projection: ProjectionFigures;
}

/** The last record the household took: which, when and how, so Home can say what moved the total. */
export interface Change {
	recordId: string;
	at: Date;
	how: string;
}

/** A figure of the Projection an admin corrected in place: kept with its audit line, as the write service would. */
export interface StubCorrection {
	target: 'assumption' | 'plan';
	id: string;
	/** The new value, as typed and checked. */
	value: string;
	/** Who made it: a member's id. */
	by: string;
	at: Date;
	/** What the figure was, in words ("4.17%, his history and prior"), or the amount it was. */
	was: string;
	wasAmount?: { amount: string; currency: RecordCurrency; pre: string };
	audit: string;
}

/** A plan item the chat added on an admin's Confirm (MA-222), in the fields the Plans view shows and corrects: a new
 * monthly flow, a change to a flow from a date, or an event on a record. Its figures are the ones the chat settled. */
export interface StubPlan {
	id: string;
	effect: 'new_flow' | 'change_flow' | 'record_event';
	what: string;
	type: 'spend' | 'income';
	ccy: RecordCurrency;
	/** Whole units a month; an event that pays a balance has none. */
	amount?: string;
	/** "YYYY-MM". */
	start: string;
	end?: string;
	/** Per cent a year, as typed: "4.5". */
	growth?: string;
	paidFrom?: string;
	/** The admin's own words (source_text). */
	words: string;
	by: string;
	at: Date;
	/** True while its figures are exactly the figure set's, so the set's stored impact speaks for it. */
	asSet: boolean;
}

/** A change to a plan item made in place on the Plans view (MA-222): a figure corrected, or the plan paused, resumed
 * or ended; kept with its audit line, as the write service would. */
export interface StubPlanChange {
	id: string;
	field: 'amount' | 'start' | 'end' | 'growth' | 'status';
	/** The new value: a decimal, a "YYYY-MM", or `active`, `paused` or `ended`. */
	value: string;
	by: string;
	at: Date;
	audit: string;
}

const SET = figures as unknown as FigureSet;

export class StubHousehold {
	readonly members: readonly StubMember[] = SET.members;
	/** Rupees to the pound, the figure set's ECB reference rate. */
	readonly fx = SET.clock.fx.gbp_inr;
	/** The figure set's own clock: the boards' "today", an ISO date. */
	readonly today = SET.clock.today;
	/** The signed-in member of the stubbed session: the owner, unless the session opens as another member. */
	readonly me: string;
	/** The Projection's inputs, and the rupee total the figure set gives for its start. */
	readonly projection = SET.projection;
	readonly projectionStartInr = SET.totals_after_correction.net_inr;
	lastChange: Change | undefined;
	#assets: StubAsset[];
	#debts: StubDebt[];
	#corrections: StubCorrection[] = [];
	#plans: StubPlan[] = [];
	#planChanges: StubPlanChange[] = [];

	constructor(options: { empty?: boolean; me?: string } = {}) {
		this.#assets = options.empty ? [] : [...SET.assets];
		this.#debts = options.empty ? [] : [...SET.debts];
		this.me = this.members.find((m) => m.id === options.me)?.id ?? 'arun';
	}

	get assets(): readonly StubAsset[] {
		return this.#assets;
	}

	get debts(): readonly StubDebt[] {
		return this.#debts;
	}

	get empty(): boolean {
		return this.#assets.length === 0 && this.#debts.length === 0;
	}

	member(id: string): StubMember | undefined {
		return this.members.find((m) => m.id === id);
	}

	/** The Projection's corrections, oldest first. */
	get corrections(): readonly StubCorrection[] {
		return this.#corrections;
	}

	/** Keeps a correction to one of the Projection's figures. The figure set's own file never changes. */
	correct(correction: StubCorrection): void {
		this.#corrections = [...this.#corrections, correction];
	}

	/** The plan items the chat added, oldest first (MA-222). */
	get plans(): readonly StubPlan[] {
		return this.#plans;
	}

	/** Adds a plan item, as the chat's Confirm does; a second with the same id replaces the first. */
	addPlan(plan: StubPlan): void {
		this.#plans = [...this.#plans.filter((p) => p.id !== plan.id), plan];
	}

	/** The changes made to plan items in place, oldest first (MA-222). */
	get planChanges(): readonly StubPlanChange[] {
		return this.#planChanges;
	}

	changePlan(change: StubPlanChange): void {
		this.#planChanges = [...this.#planChanges, change];
	}

	/** Adds a record, as the chat's Confirm does, and remembers it as the last change. A second record with the same
	 * id replaces the first, so a card confirmed twice counts once. */
	add(asset: StubAsset, at: Date, how: string): void {
		this.#assets = [...this.#assets.filter((a) => a.id !== asset.id), asset];
		this.lastChange = { recordId: asset.id, at, how };
	}
}
