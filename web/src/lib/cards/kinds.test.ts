import { describe, expect, it } from 'vitest';
import { isConfirmCard, isFigureCard } from './kinds.ts';
import type { CardEnvelope } from './types.ts';

const env = (type: string, body: unknown): CardEnvelope => ({ type, version: 1, id: 'c', fallback: 'x', body });
const confirm = {
	over: 'New savings account · check it',
	title: 'Instant access savings · Monzo',
	rows: [{ label: 'Whose', value: 'Arun, all of it' }],
	hint: 'Nothing is saved until you tap Confirm.',
	state: 'open'
};
const figure = {
	over: 'Liquid now · household',
	value: { amount: '37596', currency: 'GBP' },
	was: { value: { amount: '32596', currency: 'GBP' }, why: 'before the new savings' },
	source: 'Figures: the engine'
};

describe('the chat boards’ cards', () => {
	it('reads a Confirm card in each of its states', () => {
		expect(isConfirmCard(env('confirm', confirm))).toBe(true);
		expect(isConfirmCard(env('confirm', { ...confirm, state: 'saved', saved_at: '2026-10-26T09:41:00Z' }))).toBe(true);
		expect(isConfirmCard(env('confirm', { ...confirm, state: 'cancelled', hint: undefined }))).toBe(true);
	});

	it('refuses a Confirm card it cannot draw', () => {
		expect(isConfirmCard(env('figure', confirm))).toBe(false);
		expect(isConfirmCard(env('confirm', null))).toBe(false);
		expect(isConfirmCard(env('confirm', { ...confirm, state: 'maybe' }))).toBe(false);
		expect(isConfirmCard(env('confirm', { ...confirm, rows: [{ label: 'Whose' }] }))).toBe(false);
		expect(isConfirmCard(env('confirm', { ...confirm, hint: 3 }))).toBe(false);
		expect(isConfirmCard(env('confirm', { ...confirm, saved_at: 3 }))).toBe(false);
	});

	it('reads a figure only with a decimal amount in a known currency', () => {
		expect(isFigureCard(env('figure', figure))).toBe(true);
		expect(isFigureCard(env('figure', { ...figure, was: undefined }))).toBe(true);
		expect(isFigureCard(env('figure', { ...figure, value: { amount: 37596, currency: 'GBP' } }))).toBe(false);
		expect(isFigureCard(env('figure', { ...figure, value: { amount: '1,000', currency: 'GBP' } }))).toBe(false);
		expect(isFigureCard(env('figure', { ...figure, value: { amount: '1', currency: 'JPY' } }))).toBe(false);
		expect(isFigureCard(env('figure', { ...figure, was: { why: 'x' } }))).toBe(false);
		expect(isFigureCard(env('confirm', figure))).toBe(false);
	});
});
