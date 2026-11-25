/** Invested against owed's plot (board Web v4 · Home charts): the two lines on a 100 by 100 box stretched to the plot,
 * the marks placed in per cent over it, and the scrub's month from the pointer or the keys. The view model gives every
 * figure; this only places them. */
import type { InvestedHorizon, PathPoint } from '#lib/wealth/overview.ts';

const two = (n: number) => n.toFixed(2);

/** Across the plot, 0 to 100, for the point at `index` of `points`. */
export function xAt(index: number, points: number): number {
	return points <= 1 ? 0 : (index / (points - 1)) * 100;
}

/** Down the plot, 0 to 100, for an amount against the top. */
export function yAt(amount: string, max: string): number {
	const top = Number(max);
	return top <= 0 ? 100 : Math.min(100, Math.max(0, (1 - Number(amount) / top) * 100));
}

const pc = (n: number) => `${two(n)}%`;
export const across = (index: number, points: number) => pc(xAt(index, points));
export const down = (amount: string, max: string) => pc(yAt(amount, max));

/** The line through one series of the drawn points, as an SVG path. */
export function lineD(
	path: readonly PathPoint[],
	h: Pick<InvestedHorizon, 'points' | 'max'>,
	key: 'invested' | 'owed'
) {
	return path
		.slice(0, h.points)
		.map((p, i) => `${i === 0 ? 'M' : 'L'}${two(xAt(i, h.points))} ${two(yAt(p[key], h.max))}`)
		.join(' ');
}

/** The wash under the invested line, down to the base. */
export function areaD(path: readonly PathPoint[], h: Pick<InvestedHorizon, 'points' | 'max'>) {
	return `${lineD(path, h, 'invested')} L100.00 100 L0.00 100 Z`;
}

/** The month under the pointer: `fraction` of the way across, snapped to a point. */
export function indexAt(fraction: number, points: number): number {
	return Math.min(points - 1, Math.max(0, Math.round(fraction * (points - 1))));
}

/** The month the keys move to: ← → a month, with Shift (or Page Up and Down) a year, Home today, End the last month.
 * Undefined for any other key. */
export function stepIndex(index: number, key: string, shift: boolean, points: number): number | undefined {
	const by = (n: number) => Math.min(points - 1, Math.max(0, index + n));
	if (key === 'ArrowRight' || key === 'ArrowUp') return by(shift ? 12 : 1);
	if (key === 'ArrowLeft' || key === 'ArrowDown') return by(shift ? -12 : -1);
	if (key === 'PageUp') return by(12);
	if (key === 'PageDown') return by(-12);
	if (key === 'Home') return 0;
	if (key === 'End') return points - 1;
	return undefined;
}
