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

interface FigureSet {
	clock: { today: string; today_label: string; prices_label: string; fx: { gbp_inr: number; source: string } };
	members: StubMember[];
	assets: StubAsset[];
	debts: StubDebt[];
}

/** The last record the household took: which, when and how, so Home can say what moved the total. */
export interface Change {
	recordId: string;
	at: Date;
	how: string;
}

const SET = figures as unknown as FigureSet;

export class StubHousehold {
	readonly members: readonly StubMember[] = SET.members;
	/** Rupees to the pound, the figure set's ECB reference rate. */
	readonly fx = SET.clock.fx.gbp_inr;
	/** The figure set's own clock: the boards' "today", an ISO date. */
	readonly today = SET.clock.today;
	/** The signed-in member of the stubbed session: the owner. */
	readonly me = 'arun';
	lastChange: Change | undefined;
	#assets: StubAsset[];
	#debts: StubDebt[];

	constructor(options: { empty?: boolean } = {}) {
		this.#assets = options.empty ? [] : [...SET.assets];
		this.#debts = options.empty ? [] : [...SET.debts];
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

	/** Adds a record, as the chat's Confirm does, and remembers it as the last change. A second record with the same
	 * id replaces the first, so a card confirmed twice counts once. */
	add(asset: StubAsset, at: Date, how: string): void {
		this.#assets = [...this.#assets.filter((a) => a.id !== asset.id), asset];
		this.lastChange = { recordId: asset.id, at, how };
	}
}
