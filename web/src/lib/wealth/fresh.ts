/** How a confirmed change shows on the hero (board Browser · Dashboard, first record): the figure rolls from the old
 * total to the new one, once, and a "Just now" chip sits beside it for a minute. Plain sums, so both doors can share
 * them. */
import type { Decimal } from '#lib/formatting/money.ts';

export const JUST_NOW_MS = 60_000;
export const ROLL_MS = 900;

/** Whether a change made at `changedAt` (ISO 8601) still counts as just now. */
export function isJustNow(changedAt: string | undefined, now: Date, windowMs = JUST_NOW_MS): boolean {
	if (!changedAt) return false;
	const age = now.getTime() - new Date(changedAt).getTime();
	return age >= 0 && age < windowMs;
}

/** The whole-unit figure to show `elapsed` ms into a roll from `from` to `to`: quick at first, settling at the end. */
export function rollAt(from: Decimal, to: Decimal, elapsed: number, duration = ROLL_MS): Decimal {
	const k = Math.min(1, Math.max(0, elapsed / duration));
	if (k >= 1) return to;
	const eased = 1 - Math.pow(1 - k, 3);
	const a = Number(from);
	return String(Math.round(a + (Number(to) - a) * eased));
}

/** Remembers which change has already rolled, so going to another page and back does not play it again. */
export class RollOnce {
	#seen = new Set<string>();

	/** True the first time it is asked about a change that is still just now. */
	shouldRoll(changedAt: string | undefined, now: Date): boolean {
		if (!changedAt || this.#seen.has(changedAt)) return false;
		this.#seen.add(changedAt);
		return isJustNow(changedAt, now);
	}
}
