import { describe, expect, it } from 'vitest';
import { dayLabel, rowsOf, timeOf } from './days.ts';
import type { ChatMessage } from './timeline.ts';

const at = (iso: string) => new Date(iso);
const msg = (id: string, when: string): ChatMessage => ({
	id,
	role: 'member',
	at: new Date(when).toISOString(),
	text: id
});
const now = at('2026-10-26T18:30:00');

describe('the day lines', () => {
	it('says Today or Yesterday with the time, and the date before that', () => {
		expect(timeOf(at('2026-10-26T09:40:00'))).toBe('09:40');
		expect(dayLabel(at('2026-10-26T09:40:00'), now)).toBe('Today 09:40');
		expect(dayLabel(at('2026-10-25T21:05:00'), now)).toBe('Yesterday 21:05');
		expect(dayLabel(at('2026-10-23T12:00:00'), now)).toBe('Fri 23 Oct');
	});

	it('draws one before the first message, on a new day, and after half an hour of quiet', () => {
		const rows = rowsOf(
			[
				msg('a', '2026-10-25T21:00:00'),
				msg('b', '2026-10-26T09:40:00'),
				msg('c', '2026-10-26T09:43:00'),
				msg('d', '2026-10-26T18:20:00')
			],
			now
		);
		expect(rows.map((r) => (r.kind === 'day' ? r.label : r.message.id))).toEqual([
			'Yesterday 21:00',
			'a',
			'Today 09:40',
			'b',
			'c',
			'Today 18:20',
			'd'
		]);
	});
});
