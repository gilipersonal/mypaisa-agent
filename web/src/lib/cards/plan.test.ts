import { describe, expect, it } from 'vitest';
import { isPlanCard, type PlanBody } from './plan.ts';
import type { CardEnvelope } from './types.ts';

const env = (type: string, body: unknown): CardEnvelope => ({ type, version: 1, id: 'c', fallback: 'x', body });
const bars = {
	kind: 'bars',
	aria: 'Surplus each year',
	values: ['36379', '-1285'],
	before: ['36379', '46715'],
	flagged: [false, true],
	max: '170000',
	min: '-15000',
	grid: [{ amount: '75000', label: '£75k' }],
	axis: [{ label: '2027', at: 0 }],
	legend: { bar: 'Surplus, with the fees', line: 'Today’s plan' }
};
const body: PlanBody = {
	over: 'Not saved yet',
	title: 'School fees',
	sub: '£4,000 a month, Jan 2029 to Jul 2041, rising 4.5% a year',
	blocks: [
		{ kind: 'q', id: 'end', q: 'Until when?', chips: [{ id: 'jul2041', label: 'Jul 2041' }], chosen: 'jul2041' },
		{ kind: 'kv', k: 'Paid from', v: 'The monthly budget' },
		{ kind: 'sec', t: 'Middle path', r: 'with the fees' },
		{ kind: 'mp3', rows: [{ y: '2031', v: '£698,000', chg: '▼ £157,000', dir: 'down' }] },
		{ kind: 'foot', t: 'Was £855,000' },
		{ kind: 'flag', t: '▼ Under your £500 floor' },
		{ kind: 'ok', t: 'No month is flagged' },
		{ kind: 'lock', t: 'Nothing is saved.' },
		{ kind: 'aud', t: 'Audit · Plan item added' },
		bars as PlanBody['blocks'][number]
	],
	acts: ['confirm', 'edit', 'cancel'],
	audit: 'Audit · Plan item added · Arun',
	tech: { label: 'Technical', open: true, lines: ['propose_plan_item'] }
};

describe('the plan card', () => {
	it('reads every block the 2a boards draw', () => {
		expect(isPlanCard(env('plan', body))).toBe(true);
		expect(isPlanCard(env('plan', { over: 'Added', done: true, title: 'School fees', blocks: [] }))).toBe(true);
	});

	it('refuses a card it cannot draw', () => {
		const broken: unknown[] = [
			null,
			{ ...body, title: 3 },
			{ ...body, sub: 3 },
			{ ...body, done: 'yes' },
			{ ...body, blocks: 'none' },
			{ ...body, blocks: [{ kind: 'chart' }] },
			{ ...body, blocks: [null] },
			{ ...body, blocks: [{ kind: 'kv', k: 'a' }] },
			{ ...body, blocks: [{ kind: 'q', id: 'a', q: 'b', chips: [{ id: 1 }] }] },
			{ ...body, blocks: [{ kind: 'q', id: 'a', q: 'b', chips: [], chosen: 2 }] },
			{ ...body, blocks: [{ kind: 'sec', t: 'a', r: 2 }] },
			{ ...body, blocks: [{ kind: 'mp3', rows: [{ y: '2031', v: 'a', chg: 'b', dir: 'sideways' }] }] },
			{ ...body, blocks: [{ kind: 'foot' }] },
			{ ...body, blocks: [{ ...bars, values: [36379] }] },
			{ ...body, blocks: [{ ...bars, max: 'lots' }] },
			{ ...body, blocks: [{ ...bars, flagged: ['yes'] }] },
			{ ...body, blocks: [{ ...bars, grid: [{ amount: '1,000', label: 'x' }] }] },
			{ ...body, blocks: [{ ...bars, axis: [{ label: '2027' }] }] },
			{ ...body, blocks: [{ ...bars, legend: { bar: 'x' } }] },
			{ ...body, acts: ['save'] },
			{ ...body, audit: 4 },
			{ ...body, tech: { label: 'x', open: 'yes', lines: [] } }
		];
		for (const b of broken) expect(isPlanCard(env('plan', b))).toBe(false);
		expect(isPlanCard(env('confirm', body))).toBe(false);
	});
});
