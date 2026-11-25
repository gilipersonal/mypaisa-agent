/** The double ring's geometry (board Web v4 · Home charts, What we own and owe): what is owned by kind on the outer
 * ring, what is owed by loan on the inner one, both on one scale, each segment a circle drawn with a dash on a path
 * length of 1000. Plain sums, so the card places what the view model gives it and a test can hold the board's numbers. */
import type { RingPart } from '#lib/wealth/overview.ts';

export const RING_SIZE = 188;
export const CENTRE = RING_SIZE / 2;

/** Each ring at rest and lifted (under the pointer, chosen or focused), and where the focus arc runs outside it. */
export const OUTER = { r: 80, width: 18, liftR: 83, liftWidth: 24, focusR: 99.5 } as const;
export const INNER = { r: 61, width: 8, liftR: 63, liftWidth: 12, focusR: 73.5 } as const;

export interface Dash {
	dasharray: string;
	dashoffset: string;
}

const LENGTH = 1000;
const round2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/** A segment's dash on a circle of radius `r`: a 1 px gap at each end, and never drawn wider than it is (a segment too
 * thin for its gaps keeps half its length, centred). `pad` widens it by that many px each side, for the focus arc. */
export function dashOf(part: Pick<RingPart, 'from' | 'arc'>, r: number, pad = 0): Dash {
	const px = LENGTH / (2 * Math.PI * r);
	const span = part.arc * LENGTH;
	const gap = px;
	const len = (span > 4 * gap ? span - 2 * gap : span / 2) + 2 * pad * px;
	const start = part.from * LENGTH + (span - len) / 2;
	return { dasharray: `${round2(len)} ${String(LENGTH)}`, dashoffset: round2(-start) };
}

/** The part the centre names at rest: the largest kind, or the largest loan when nothing is owned. */
export function restingPart(kinds: readonly RingPart[], loans: readonly RingPart[]): RingPart | undefined {
	const pool = kinds.length > 0 ? kinds : loans;
	return pool.reduce<RingPart | undefined>((best, p) => (!best || p.share > best.share ? p : best), undefined);
}

/** The row the arrow keys move to through both lists, in order, from the one focused (or none). */
export function stepRow(ids: readonly string[], current: string | undefined, key: string): string | undefined {
	if (ids.length === 0) return undefined;
	const at = current === undefined ? -1 : ids.indexOf(current);
	if (key === 'ArrowDown') return ids[Math.min(ids.length - 1, at + 1)];
	if (key === 'ArrowUp') return ids[Math.max(0, at - 1)];
	if (key === 'Home') return ids[0];
	if (key === 'End') return ids.at(-1);
	return current;
}
