import { describe, expect, it } from 'vitest';
import { isCheckInCard, type CheckInCard } from './checkin.ts';

const card = (body: unknown): CheckInCard =>
	({ type: 'checkin', version: 1, id: 'c', fallback: 'A check-in', body }) as CheckInCard;

const full = {
	chip: 'Check-in',
	right: 'answered',
	right_at: '2026-11-05T09:12:00Z',
	title: 'Paid · November’s EMI',
	saved: true,
	answers: [{ label: 'Answer', value: 'Paid off in full' }],
	text: 'A sentence',
	picks: [{ id: 'checkin.engine', label: '₹15,23,976', style: 'tinted' }],
	rows: [{ label: 'Paid', value: '₹39,390 on Thu 5 Nov' }],
	items: [{ tile: '₹', name: 'HDFC home loan', note: 'EMI', value: '₹39,390', chip: 'Overdue', done: false }],
	undone: { at: '2026-11-05T09:13:00Z', text: 'Reversed' },
	hint: 'One tap',
	actions: [{ id: 'checkin.undo', label: 'Undo', style: 'tinted', icon: 'undo' }],
	options: [{ id: 'checkin.not_yet', label: 'Not yet', note: 'Mon 9 Nov' }],
	fold: { text: 'Saved · in the audit log', at: '2026-11-05T09:12:00Z', icon: 'saved' }
};

describe('the check-in card', () => {
	it('takes every field the boards draw, and a bare body', () => {
		expect(isCheckInCard(card(full))).toBe(true);
		expect(isCheckInCard(card({}))).toBe(true);
	});

	it('refuses another kind, a body that is not an object, and a field of the wrong shape', () => {
		expect(isCheckInCard({ ...card(full), type: 'confirm' })).toBe(false);
		expect(isCheckInCard(card('paid'))).toBe(false);
		const wrong: Record<string, unknown>[] = [
			{ title: 3 },
			{ saved: 'yes' },
			{ rows: [{ label: 'Paid' }] },
			{ answers: 'Paid' },
			{ actions: [{ id: 'x', label: 'Paid', style: 'loud' }] },
			{ actions: [{ id: 'x', label: 'Undo', style: 'tinted', icon: 'redo' }] },
			{ options: [{ id: 'x', label: 'Not yet' }] },
			{ items: [{ tile: '₹', name: 'HDFC', note: 'EMI', value: 1 }] },
			{ items: [{ tile: '₹', name: 'HDFC', note: 'EMI', value: '₹1', done: 'no' }] },
			{ undone: { at: 'x' } },
			{ fold: { text: 'Saved', at: 'x', icon: 'star' } },
			{ picks: [null] }
		];
		for (const body of wrong) expect(isCheckInCard(card({ ...full, ...body })), JSON.stringify(body)).toBe(false);
	});
});
