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
	/** For a payment to a debt (MA-205): its balance before, so Home can say what the payment moved. */
	before?: number;
	/** What Home's hero says of it, when that is not "<the record>, <how>" (MA-205). */
	line?: string;
}

/** A check-in's answer, as the stub keeps it (MA-205): which answer, and when. */
export interface StubAnswer {
	answer: string;
	at: Date;
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
	#answers = new Map<string, StubAnswer>();
	#closed: StubDebt[] = [];

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

	/** Adds a record, as the chat's Confirm does, and remembers it as the last change. A second record with the same
	 * id replaces the first, so a card confirmed twice counts once. */
	add(asset: StubAsset, at: Date, how: string): void {
		this.#assets = [...this.#assets.filter((a) => a.id !== asset.id), asset];
		this.lastChange = { recordId: asset.id, at, how };
	}

	/** The check-ins' answers (MA-205), by the check-in's id. */
	answerOf(id: string): StubAnswer | undefined {
		return this.#answers.get(id);
	}

	/** Keeps a check-in's answer; none clears it. */
	answer(id: string, answer: StubAnswer | undefined): void {
		if (answer) this.#answers.set(id, answer);
		else this.#answers.delete(id);
	}

	/** Replaces a debt with its new state, as a payment the check-in recorded leaves it, and remembers the change. */
	setDebt(debt: StubDebt, change?: Change): void {
		this.#debts = this.#debts.map((d) => (d.id === debt.id ? debt : d));
		if (change) this.lastChange = change;
	}

	/** Closes a debt paid off in full: it leaves what is owed and is kept in the history. */
	closeDebt(id: string, change?: Change): void {
		const debt = this.#debts.find((d) => d.id === id);
		if (!debt) return;
		this.#debts = this.#debts.filter((d) => d.id !== id);
		this.#closed = [...this.#closed, debt];
		if (change) this.lastChange = change;
	}

	/** The debts closed by a payoff, kept in the history. */
	get closed(): readonly StubDebt[] {
		return this.#closed;
	}
}
