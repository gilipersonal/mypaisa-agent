/** Dates as the boards write them ("Mon 14 Dec", "Sat 10 Mar 2029"), from ISO dates, with no Intl and no time zone: a
 * calendar day is the same day everywhere. */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface DayParts {
	weekday: string;
	day: string;
	month: string;
	year: string;
}

/** The parts of an ISO date or date-time's calendar day. */
export function dayParts(iso: string): DayParts {
	const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split('-').map(Number);
	const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
	return { weekday, day: String(d), month: MONTHS[m - 1] ?? '', year: String(y) };
}

/** "Mon 26 Oct", or "Sat 10 Mar 2029" with the year. */
export function dayLabel(iso: string, withYear = false): string {
	const p = dayParts(iso);
	return `${p.weekday} ${p.day} ${p.month}${withYear ? ` ${p.year}` : ''}`;
}

/** "30 Apr": a day without its weekday. */
export function shortDay(iso: string): string {
	const p = dayParts(iso);
	return `${p.day} ${p.month}`;
}

/** Whole months from one ISO date's month to another's. */
export function monthsBetween(from: string, to: string): number {
	const [fy = 0, fm = 1] = from.slice(0, 7).split('-').map(Number);
	const [ty = 0, tm = 1] = to.slice(0, 7).split('-').map(Number);
	return (ty - fy) * 12 + (tm - fm);
}
