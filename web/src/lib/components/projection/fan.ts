/** Where the fan's parts sit (board Web v4 · Projection, 1a): the chart library draws the band, the middle path and the
 * gridlines from the rows; every label and mark is HTML over it, placed in per cent of the chart box, as DS v1's charts
 * are (tokens.css, "charts"). Placement only: the figures are the view model's, and none is worked out here. */
import type { Fig } from '#lib/wealth/overview.ts';
import type { Fan } from '#lib/wealth/projection.ts';

/** One year of the fan as the chart library plots it: `at` is years from today. */
export interface FanRow {
	at: number;
	low: number;
	mid: number;
	high: number;
}

export interface Placed {
	id: string;
	left: string;
	top: string;
}

const pct = (value: number) => `${value.toFixed(2)}%`;

export function fanRows(fan: Fan): FanRow[] {
	return fan.points.map((p, at) => ({ at, low: Number(p.low), mid: Number(p.mid), high: Number(p.high) }));
}

/** How far across the plot a time sits, in per cent. */
export function across(fan: Fan, at: number): string {
	return pct((at / fan.years) * 100);
}

/** How far down the plot an amount sits, in per cent: the top is the fan's `max`, the foot is nothing. */
export function down(fan: Fan, amount: number | string): string {
	return pct(100 - (Number(amount) / Number(fan.max)) * 100);
}

/** The middle path at any time, straight between the years either side, so a mark sits on the drawn line. */
export function midAt(rows: readonly FanRow[], at: number): number {
	const next = rows.find((r) => r.at >= at) ?? rows.at(-1);
	const before = rows.findLast((r) => r.at < at) ?? next;
	if (!next || !before || next.at === before.at) return next?.mid ?? 0;
	return before.mid + ((next.mid - before.mid) * (at - before.at)) / (next.at - before.at);
}

/** The marks by their shape: dots and squares on the line, ticks on the axis, and the few that carry their words. */
export function placeMarks(fan: Fan): {
	dots: Placed[];
	squares: Placed[];
	ticks: { id: string; left: string }[];
	pills: (Placed & { label: string })[];
} {
	const rows = fanRows(fan);
	const placed = fan.marks.map((mark) => ({
		mark,
		spot: { id: mark.id, left: across(fan, mark.at), top: down(fan, midAt(rows, mark.at)) }
	}));
	const of = (shape: string) => placed.filter((p) => p.mark.shape === shape).map((p) => p.spot);
	return {
		dots: of('dot'),
		squares: of('square'),
		ticks: of('tick').map(({ id, left }) => ({ id, left })),
		pills: placed.flatMap((p) => (p.mark.label ? [{ ...p.spot, label: p.mark.label }] : []))
	};
}

/** The three figures at the fan's right edge: the top of the band, the middle path, the foot of the band. */
export function endLabels(fan: Fan): { id: string; top: string; fig: Fig; quiet: boolean }[] {
	const end = fan.points.at(-1);
	if (!end) return [];
	return (['high', 'mid', 'low'] as const).map((id) => ({
		id,
		top: down(fan, end[id]),
		fig: { amount: end[id], currency: fan.currency },
		quiet: id !== 'mid'
	}));
}

export interface Scrub {
	left: string;
	/** The same place measured from the right edge, for a call-out that sits to the left of its line. */
	right: string;
	topHigh: string;
	topLow: string;
	/** "Today", or the year. */
	year: string;
	mid: Fig;
	low: Fig;
	high: Fig;
	/** Past the middle of the plot the call-out sits to the left of its line, so it stays inside the chart. */
	flip: boolean;
}

/** What the fan reads at a year, for the call-out a hover, a tap or the arrow keys bring up. */
export function scrubAt(fan: Fan, index: number): Scrub | undefined {
	const point = fan.points[index];
	if (!point) return undefined;
	const fig = (amount: string): Fig => ({ amount, currency: fan.currency });
	return {
		left: across(fan, index),
		right: across(fan, fan.years - index),
		topHigh: down(fan, point.high),
		topLow: down(fan, point.low),
		year: index === 0 ? 'Today' : String(point.year),
		mid: fig(point.mid),
		low: fig(point.low),
		high: fig(point.high),
		flip: index / fan.years > 0.55
	};
}

/** The year a pointer is over: `fraction` is how far across the plot it is, 0 to 1. */
export function indexAt(fraction: number, years: number): number {
	return Math.min(years, Math.max(0, Math.round(fraction * years)));
}
