import { describe, expect, it } from 'vitest';
import { StubHousehold } from '#lib/stub/household.ts';
import { buildOwnOwe } from '#lib/stub/home-charts.ts';
import { monzoSavings } from '#lib/stub/records.ts';
import type { RingPart } from '#lib/wealth/overview.ts';
import { INNER, OUTER, dashOf, restingPart, stepRow } from './ring.ts';

function board() {
	const h = new StubHousehold();
	h.add(monzoSavings('5000', 'arun'), new Date('2026-10-26T09:41:00'), 'added in the chat');
	return buildOwnOwe(h, 'household', 'GBP');
}

describe('the ring’s segments', () => {
	const o = board();
	const [property, pensions, , deposits, cash] = o.kinds;
	const [mortgage, hdfc] = o.loans;

	it('draws each with a 1 px gap at its ends, as the board does', () => {
		if (!property || !cash || !mortgage) throw new Error('missing parts');
		expect(dashOf(property, OUTER.r)).toEqual({ dasharray: '737.36 1000', dashoffset: '-1.99' });
		expect(dashOf(cash, OUTER.r)).toEqual({ dasharray: '6.27 1000', dashoffset: '-991.74' });
		expect(dashOf(mortgage, INNER.r)).toEqual({ dasharray: '319.14 1000', dashoffset: '-2.61' });
		expect(dashOf(mortgage, INNER.liftR).dasharray).toBe('319.30 1000');
	});

	it('lifts a chosen segment and rings a focused one 1 px wider each side', () => {
		if (!pensions || !deposits || !hdfc) throw new Error('missing parts');
		expect(dashOf(pensions, OUTER.liftR).dasharray).toBe('166.25 1000');
		expect(dashOf(deposits, OUTER.focusR, 1).dasharray).toBe('34.22 1000');
		expect(dashOf(hdfc, INNER.focusR, 1).dasharray).toBe('19.45 1000');
	});

	it('never draws a thin segment wider than it is', () => {
		const thin = { from: 0.5, arc: 0.0003 };
		const d = dashOf(thin, OUTER.r);
		expect(Number(d.dasharray.split(' ')[0])).toBeCloseTo(0.15, 2);
		expect(Number(d.dashoffset)).toBeCloseTo(-500.07, 2);
	});
});

describe('the centre at rest', () => {
	it('names the largest kind, or the largest loan when nothing is owned', () => {
		const o = board();
		expect(restingPart(o.kinds, o.loans)?.label).toBe('Property');
		expect(restingPart([], o.loans)?.label).toBe('Mortgage');
		expect(restingPart([], [])).toBeUndefined();
	});
});

describe('the rows as the keyboard’s path', () => {
	const ids = ['property', 'pensions', 'mortgage'];

	it('moves down and up through both lists, and to either end', () => {
		expect(stepRow(ids, 'property', 'ArrowDown')).toBe('pensions');
		expect(stepRow(ids, 'mortgage', 'ArrowDown')).toBe('mortgage');
		expect(stepRow(ids, 'pensions', 'ArrowUp')).toBe('property');
		expect(stepRow(ids, 'property', 'ArrowUp')).toBe('property');
		expect(stepRow(ids, 'pensions', 'Home')).toBe('property');
		expect(stepRow(ids, 'property', 'End')).toBe('mortgage');
		expect(stepRow(ids, undefined, 'ArrowDown')).toBe('property');
		expect(stepRow(ids, 'pensions', 'Tab')).toBe('pensions');
		expect(stepRow([], 'x', 'ArrowDown')).toBeUndefined();
	});

	it('is typed for any part', () => {
		const p: Pick<RingPart, 'from' | 'arc'> = { from: 0, arc: 1 };
		expect(dashOf(p, OUTER.r).dasharray).toBe('996.02 1000');
	});
});
