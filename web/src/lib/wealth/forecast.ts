/** What the Projection's Budget forecast view shows (MA-262; ARCHITECTURE §6.6 and §8.3; board Web v4 · Budget forecast,
 * 1a the surplus first, and its states): each year's leanest month against the admins' floor to the horizon, flagged by
 * code; the selected year's lines, which add up to its surplus; its months; and the flows behind a figure. Every amount
 * is a decimal string with its currency, formatted and masked at the door; a rate is not money and is written out. The
 * door works out no figure: it places what it is given. Types only: no framework, no Intl. */
import type { DisplayCurrency, Fig } from './overview.ts';
import type { Horizon, MoneyBasis } from './projection.ts';

/** Words with amounts in them, as a list of parts, so privacy mode can drop or mask the amounts and keep the words. */
export interface Said {
	text?: string;
	fig?: Fig;
}

/** One year's bar: its leanest month, placed on the plot as fractions of its height from the foot. */
export interface ForecastBar {
	year: number;
	fig: Fig;
	/** Where the bar starts and ends, 0 at the foot of the plot and 1 at its top. */
	from: number;
	to: number;
	/** At or above the floor; below it, flagged with ▼; or a year with no floor, everyone retired. */
	tone: 'ok' | 'lo' | 'rt';
	/** The bar runs past the top of the plot, or past its foot, and is drawn with a break. */
	capTop: boolean;
	capFoot: boolean;
	/** The floor drawn as a dash on the bar, where it is not one line across the chart (rupees, today's money,
	 * retirement in view); a fraction of the plot's height. */
	floorAt?: number;
	/** Cash goes below zero in this year. */
	cashBelow: boolean;
	/** What a screen reader hears for the year, and with the amounts hidden. */
	aria: string;
	ariaPrivate: string;
}

export interface ForecastGridLine {
	/** A fraction of the plot's height from its foot. */
	at: number;
	/** "£4k", "−₹1 lakh". */
	label: string;
	kind: 'line' | 'zero' | 'floor' | 'foot';
}

export type LegendKey = 'ok' | 'lo' | 'floor' | 'floor-dash' | 'retired' | 'selected' | 'cash';

/** A sentence under the chart; one that names the plot's own bounds is left out in privacy mode. */
export interface ForecastNote {
	said: Said[];
	hidden?: boolean;
}

export interface ForecastChart {
	title: string;
	/** "2027 to 2046 · against your floor". */
	sub: string;
	/** A chip over the chart for each kind of flag in view, with its span. */
	flags: { text: string; said: Said[] }[];
	bars: ForecastBar[];
	grid: ForecastGridLine[];
	axis: { label: string; at: number }[];
	/** Each key's words, and its words with the amounts hidden. */
	legend: { key: LegendKey; text: string; textPrivate: string }[];
	/** Rupee labels are wider: the plot leaves them more room. */
	wide: boolean;
	/** A strip under the bars marks the years cash goes below zero. */
	cashStrip: boolean;
	notes: ForecastNote[];
	aria: string;
	ariaPrivate: string;
}

/** One line of a year: it and the lines beside it add up to the year's surplus. */
export interface ForecastLine {
	id: string;
	title: string;
	/** What makes it, in words and amounts; privacy mode keeps the words. */
	sub: Said[];
	fig: Fig;
	/** A plan item or the pot: marked as the admins' own. */
	plan: boolean;
	/** The line opens its flows when tapped. */
	traced: boolean;
}

export interface ForecastFact {
	label: string;
	said: Said[];
	alert?: boolean;
}

export interface ForecastMonth {
	label: string;
	note: Said[];
	fig: Fig;
	flagged: boolean;
}

export interface ForecastYear {
	year: number;
	title: string;
	chip: { text: string; alert: boolean };
	/** "Jan to Dec, in pounds of 2029 · tap a figure to see what makes it". */
	meta: string;
	lines: ForecastLine[];
	surplus: Fig;
	surplusNote: string;
	negative: boolean;
	/** One-offs paid from cash, and the year's closing cash when it is below zero. */
	fromCash: (ForecastFact & { sub: string })[];
	facts: ForecastFact[];
	/** The year's months, where the figure set has them. */
	months?: { title: string; sub: string; rows: ForecastMonth[] };
	/** An admin may ask for the ways to cover a flagged year; a member is told whose they are. */
	canCover: boolean;
	lock?: string;
}

export interface ForecastTrace {
	/** The line it explains. */
	line: string;
	over: string;
	title: string;
	total: Fig;
	note: string;
	rows: { name: string; sub: Said[]; fig: Fig }[];
	totalLabel: string;
	source: string;
}

/** The way an admin applied to cover the gap, year by year: what goes into it and what it pays back. */
export interface ForecastPot {
	over: string;
	title: string;
	sub: string;
	rows: { label: string; note: Said[]; fig: Fig }[];
	totals: { label: string; fig: Fig }[];
}

export interface BudgetForecast {
	/** True while the household has no budget: the view then says what it needs, and draws nothing. */
	empty: boolean;
	/** Under the title: how far, in what money, and which run. */
	head: string;
	horizon: Horizon;
	money: MoneyBasis;
	currency: DisplayCurrency;
	/** The run's time, for a banner that says which run is on screen. */
	run: string;
	chart: ForecastChart;
	/** The years a member can pick, as the chart draws them, and the one picked. */
	years: number[];
	selected: number;
	year: ForecastYear;
	trace: ForecastTrace;
	pot?: ForecastPot;
	foot: string;
}
