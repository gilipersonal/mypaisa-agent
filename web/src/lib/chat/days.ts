/** The quiet lines between stretches of the conversation (the boards' "Today 09:40", "Mon 26 Oct"): one before the first
 * message, and again when the day changes or the conversation picks up after half an hour. The web door's own, so it may
 * use Intl; times are the member's local clock, 24-hour, as the boards draw them. */
import { messageKey, type ChatMessage } from './timeline.ts';

const GAP_MS = 30 * 60 * 1000;

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function timeOf(at: Date): string {
	return time.format(at);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dayLabel(at: Date, now: Date): string {
	const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
	if (days === 0) return `Today ${timeOf(at)}`;
	if (days === 1) return `Yesterday ${timeOf(at)}`;
	return `${weekday.format(at)} ${dayMonth.format(at)}`;
}

export type Row = { kind: 'day'; key: string; label: string } | { kind: 'message'; key: string; message: ChatMessage };

export function rowsOf(messages: readonly ChatMessage[], now: Date): Row[] {
	const rows: Row[] = [];
	let previous: Date | undefined;
	for (const message of messages) {
		const at = new Date(message.at);
		const newDay = previous === undefined || startOfDay(previous) !== startOfDay(at);
		if (newDay || at.getTime() - (previous?.getTime() ?? 0) >= GAP_MS) {
			rows.push({ kind: 'day', key: `day:${messageKey(message)}`, label: dayLabel(at, now) });
		}
		rows.push({ kind: 'message', key: messageKey(message), message });
		previous = at;
	}
	return rows;
}
