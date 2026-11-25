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
	/** Answered in the chat just now: the row is tinted as it ticks to Done (MA-205). */
	done?: boolean;
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
	| { kind: 'link'; text: string; href: string }
	/** Home's two chart cards (MA-359; board Web v4 · Home charts, MA-355 c 1a). Each reads its own query for the view
	 * and currency it names, so it loads, fails and empties by itself while the rest of Home stays. */
	| { kind: 'ownowe'; view: string; currency: DisplayCurrency }
	| { kind: 'investedowed'; view: string; currency: DisplayCurrency };

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

/* ---------- Home's chart cards (MA-359; board Web v4 · Home charts, MA-355 c 1a) ---------- */

/** A colour of the chart tokens: c1 the chart line, c2 to c5 the categorical colours, `owed` the quiet ink of what is
 * owed. The order round the ring is the board's, so every touching pair passes the palette check in both themes. */
export type RingTone = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'owed';

/** A kind of what is owned (outer ring) or a loan (inner ring): a segment and its row, one thing. */
export interface RingPart {
	id: string;
	label: string;
	/** "2 homes", "Ends Jul 2030", "Half · ends Oct 2045". */
	note: string;
	/** In the currency the member reads totals in; a loan in pounds view keeps its own currency. */
	fig: Fig;
	/** A loan held in rupees, in pounds beside it. */
	alt?: Fig;
	/** Of what is owned (a kind) or of what is owed (a loan), 0 to 1, and as the row writes it: "74.1%", "under 0.1%". */
	share: number;
	shareText: string;
	/** Where its segment starts and how much of the ring it takes, 0 to 1, both rings on one scale. */
	from: number;
	arc: number;
	tone: RingTone;
	/** Where a second press goes: the kind in Assets, the loan in Debts. */
	href: string;
}

/** A card with nothing owed on it: listed so the list is whole, never a segment or a target. */
export interface PaidRow {
	id: string;
	label: string;
	note: string;
	fig: Fig;
}

export interface OwnOwe {
	/** `empty`: nothing owned or owed is on record yet. */
	state: 'ready' | 'empty';
	/** "36% of what we own is owed", "Nothing is owed", "No records yet". */
	aside: string;
	/** The lists' heads: "We own", "I own", "Asha owns". */
	ownLabel: string;
	oweLabel: string;
	/** "of what we own", under the share of what is owed in the ring's centre. */
	ofOwn: string;
	own: Fig;
	owe: Fig;
	/** What is owed against what is owned, 0 to 1, and in words: "36%". */
	oweShare: number;
	oweShareText: string;
	kinds: RingPart[];
	loans: RingPart[];
	paid: PaidRow[];
	nothingOwed: boolean;
	/** The one-line key under the ring. */
	key: string;
	/** What a screen reader hears for the ring: shares only, so it holds in privacy mode. */
	aria: string;
}

/** One month of the plan's path: what is invested and what is owed, in whole pounds. `label` is "Nov 2026" (or "Today"),
 * `long` "November 2026" for a screen reader. */
export interface PathPoint {
	label: string;
	long: string;
	invested: Decimal;
	owed: Decimal;
	/** What is invested less what is owed, unsigned; `ahead` when invested is at or past owed. */
	gap: Decimal;
	ahead: boolean;
}

/** A part of where the growth comes from. */
export interface GrowthPart {
	id: 'held' | 'saved' | 'growth';
	label: string;
	/** What it holds, in words, shown when the part is chosen. */
	about: string;
	fig: Fig;
	/** Of what is invested by the horizon, rounded: "58%". */
	shareText: string;
	tone: 'g0' | 'g1' | 'g2';
}

/** A row of Year by year. */
export interface YearRow {
	label: string;
	long: string;
	invested: Fig;
	owed: Fig;
	/** What is invested less what is owed, unsigned, with ▲ ahead or ▼ behind. */
	gap: Fig;
	ahead: boolean;
}

/** A gridline of the line chart: its amount and the label the axis writes ("£200k"). */
export interface GridLine {
	amount: Decimal;
	label: string;
}

/** Invested against owed at one horizon, and where the growth comes from by then. */
export interface InvestedHorizon {
	years: 5 | 10 | 20 | 30;
	/** "Dec 2031": the last month drawn. */
	to: string;
	/** How many points of `path` it draws, today included. */
	points: number;
	/** The top of the plot, and its gridlines. */
	max: Decimal;
	lines: GridLine[];
	axis: AxisTick[];
	/** The crossing's label gives way to the headline once it sits at the left edge. */
	crossingLabel: boolean;
	/** "17%" is growth and interest, of `invested`. */
	growthShare: string;
	invested: Fig;
	parts: GrowthPart[];
	/** What a screen reader hears for the plot and for the split; amounts are hidden in privacy mode. */
	aria: string;
	partsAria: string;
	rows: YearRow[];
}

export interface InvestedOwed {
	/** `empty`: nothing on record to project; `nothing-owed`: there is no balance for what is invested to pass. */
	state: 'ready' | 'empty' | 'nothing-owed';
	currency: Currency;
	/** Today, then each month of the plan's path to the longest horizon. */
	path: PathPoint[];
	/** The month invested passes owed, its index in `path`, and the words around it. */
	crossing?: { index: number; label: string; long: string };
	/** "when what we have invested passes what we owe. Today it is" £67,827 "behind." */
	headline: { text: string; fig: Fig; after: string };
	horizons: InvestedHorizon[];
	/** Notes the card carries above its chart: whose figures these are, and in what money. */
	notes: string[];
	/** Set when the records have changed since the run the lines come from. */
	stale?: { title: string; text: string };
	foot: string;
}
