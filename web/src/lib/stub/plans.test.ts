import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PlanRow, Plans } from '#lib/wealth/plans.ts';
import { StubHousehold, type StubPlan } from './household.ts';
import figures from './plan-figures.json';
import { correctPlan, setPlanStatus, standingPlans } from './plan-state.ts';
import { buildPlans } from './plans.ts';
import { buildProjection, correctProjection } from './projection.ts';

const AT = new Date('2026-10-26T10:05:00');
const later = (minutes: number) => new Date(AT.getTime() + minutes * 60_000);
const source = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../../docs/design/figures/future-plans-v4.json', import.meta.url)), 'utf8')
) as Record<string, Record<string, unknown>>;

function row(p: Plans, id: string): PlanRow {
	const found = p.timeline.rows.find((r) => r.id === id);
	if (!found) throw new Error(`no row ${id}`);
	return found;
}

const SCHOOL: StubPlan = {
	id: 'schooling',
	effect: 'new_flow',
	what: 'School fees',
	type: 'spend',
	ccy: 'GBP',
	amount: '4000',
	start: '2029-01',
	end: '2041-07',
	growth: '4.5',
	paidFrom: 'The monthly budget',
	words: "£4,000 a month from Jan 2029 for my kid's schooling",
	by: 'arun',
	at: AT,
	asSet: true
};
const SALARY: StubPlan = {
	id: 'salary_step',
	effect: 'change_flow',
	what: 'Arun’s salary',
	type: 'income',
	ccy: 'GBP',
	amount: '5500',
	start: '2028-09',
	end: '2051-01',
	growth: '4.8',
	words: 'my salary goes to £5,500 a month from Sep 2028',
	by: 'arun',
	at: later(1),
	asSet: true
};
const HDFC: StubPlan = {
	id: 'hdfc_close',
	effect: 'record_event',
	what: 'Close the HDFC home loan',
	type: 'spend',
	ccy: 'INR',
	start: '2029-03',
	paidFrom: 'Fixed deposit · SBI',
	words: 'close my HDFC loan with the SBI FD when it matures',
	by: 'arun',
	at: later(2),
	asSet: true
};

describe('the plan figures', () => {
	it('are the future-plans figure set’s, key by key', () => {
		const plans = figures.plans as Record<string, unknown>;
		for (const key of Object.keys(plans)) expect(plans[key]).toEqual(source.plans?.[key]);
		for (const key of ['conversation', 'impact', 'later'] as const) expect(figures[key]).toEqual(source[key]);
		for (const [key, value] of Object.entries(figures.rearrange)) expect(value).toEqual(source.rearrange?.[key]);
		expect(figures.settings.floor_gbp_month).toBe(source.settings?.floor_gbp_month);
		expect(figures.runs.R1).toEqual(source.runs?.R1);
	});
});

describe('the Plans view, as the household starts', () => {
	it('lists the three plans in the order they start, on the run the fan draws', () => {
		const p = buildPlans(new StubHousehold(), 20, 'nominal', 'GBP');
		expect(p.head).toBe('Three plans, Arun’s · the engine’s run of Mon 26 Oct 09:53');
		expect(p.title).toBe('3 plans · yours to change, as an admin');
		expect(p.summary).toBe(
			'On them, the middle path reaches £3,378,000 in 2046; 8 in 10 runs end between £2,980,000 and £4,055,000.'
		);
		expect(p.timeline.rows.map((r) => [r.name, r.sub])).toEqual([
			['Asha’s annual bonus', '+£3,000 each March'],
			['Home extension', '−£35,000 once, Jun 2027'],
			['Replace the car', '−£25,000 once, Jun 2031']
		]);
		expect(p.timeline.title).toBe('Each plan, to 2046');
		expect(p.timeline.from).toBe('from today, Mon 26 Oct');
		expect(p.timeline.axis.map((a) => a.label)).toEqual(['Today', '2031', '2036', '2041', '2046']);
		expect(p.timeline.grid).toEqual([0.25, 0.5, 0.75]);
		expect(p.timeline.each).toBe('Each March');
		expect(p.canEdit).toBe(true);
		expect(p.ended).toEqual([]);
		expect(p.banner).toBeUndefined();
	});

	it('draws each plan’s lane: ticks each March past the horizon, a diamond for a one-off', () => {
		const p = buildPlans(new StubHousehold(), 20, 'nominal', 'GBP');
		const bonus = row(p, 'bonus');
		expect(bonus.points).toHaveLength(20);
		expect(bonus.points.every((m) => m.shape === 'tick')).toBe(true);
		expect(bonus.past).toBe(true);
		const car = row(p, 'car2');
		expect(car.points).toEqual([{ shape: 'dia', at: expect.closeTo(0.23, 2) as number }]);
		expect(car.past).toBe(false);
		expect(car.aria).toBe('Replace the car: £25,000 once, in June 2031.');
		expect(bonus.aria).toBe('Asha’s annual bonus: £3,000 each March from 2027 to 2052.');
		const h = new StubHousehold();
		correctProjection(h, { target: 'plan', id: 'car2', value: 'June 2032', part: 'start' }, AT);
		const short = buildPlans(h, 5, 'nominal', 'GBP');
		expect(row(short, 'car2')).toMatchObject({ points: [], past: true });
		expect(row(short, 'bonus').points).toHaveLength(5);
		expect(short.timeline.axis.filter((a) => a.minor === true).map((a) => a.label)).toEqual(['2027', '2028', '2030']);
	});

	it('says the same run in today’s money and in rupees', () => {
		const today = buildPlans(new StubHousehold(), 20, 'today', 'GBP');
		expect(today.summary).toMatch(/^On them, the middle path reaches £[\d,]+ in 2046, in today’s money; /);
		expect(today.summary).not.toContain('£3,378,000');
		const inr = buildPlans(new StubHousehold(), 10, 'nominal', 'INR');
		expect(inr.summary).toMatch(/^On them, the middle path reaches ₹[\d,]+ in 2036; 8 in 10 runs end between ₹/);
	});

	it('opens each plan with its words, its figures as pencils for an admin, and its history', () => {
		const p = buildPlans(new StubHousehold(), 20, 'nominal', 'GBP');
		const sheet = row(p, 'extension').sheet;
		expect(sheet).toMatchObject({
			title: 'Home extension',
			effect: 'Once · money out · Home',
			status: 'Active',
			words: 'A £35,000 extension next June',
			wordsMeta: 'Arun · Sun 25 Oct 20:09 · in the chat · version 1',
			history: ['Plan item added · Arun · Sun 25 Oct 20:09 · in the chat'],
			engine: []
		});
		expect(sheet.figures.map((f) => [f.label, f.value, f.edit?.part])).toEqual([
			['Amount', '−£35,000', undefined],
			['When', 'Jun 2027', 'start']
		]);
		const bonus = row(p, 'bonus').sheet;
		expect(bonus.figures.map((f) => [f.label, f.value, f.edit?.kind, f.edit?.part])).toEqual([
			['Amount', '+£3,000', 'amount', 'amount'],
			['Starts', 'Mar 2027', 'month', 'start'],
			['Ends', 'Mar 2052', 'month', 'end'],
			['Grows', 'No growth', 'rate', undefined]
		]);
		expect(bonus.effect).toBe('A new flow, each year · money in · Income');
	});

	it('shows a member the same plans without pencils, and the admin’s lock line', () => {
		const p = buildPlans(new StubHousehold({ me: 'asha' }), 20, 'nominal', 'GBP');
		expect(p.canEdit).toBe(false);
		expect(p.title).toBe('3 plans · Arun’s, the admin’s');
		expect(p.foot).toMatch(/^Plans are Arun’s, the admin’s: you see them here, without pencils\./);
		expect(p.timeline.rows.flatMap((r) => r.sheet.figures).some((f) => f.edit)).toBe(false);
	});
});

describe('a plan corrected in place', () => {
	it('keeps a new end with its audit row and version, and the run is no longer the stored one', () => {
		const h = new StubHousehold();
		correctProjection(h, { target: 'plan', id: 'bonus', value: 'Mar 2049', part: 'end' }, AT);
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		const sheet = row(p, 'bonus').sheet;
		expect(sheet.saved).toBe('Saved. The Projection runs again with it.');
		expect(sheet.history.at(-1)).toBe(
			'Plan item corrected · Asha’s annual bonus: ends Mar 2052 → Mar 2049 · v1 → v2 · Arun · Mon 26 Oct 10:05 · in place'
		);
		expect(sheet.wordsMeta).toMatch(/version 2$/);
		expect(sheet.figures.find((f) => f.label === 'Ends')).toMatchObject({
			value: 'Mar 2049',
			source: { icon: 'member', label: 'Corrected by Arun · was Mar 2052' }
		});
		expect(p.head).toBe('Three plans, Arun’s · no stored run for them in the preview');
		expect(p.summary).toMatch(/holds no stored run for the plans as they stand/);
		expect(row(p, 'bonus').aria).toBe('Asha’s annual bonus: £3,000 each March from 2027 to 2049.');
		const nw = buildProjection(h, 20, 'nominal', 'GBP');
		expect(nw.plan.items.find((i) => i.id === 'bonus')?.when).toBe('Every March, 2027 to 2049');
	});

	it('moves a one-off’s month on both views, and its amount the Net worth view’s way', () => {
		const h = new StubHousehold();
		correctProjection(h, { target: 'plan', id: 'extension', value: '2028-03', part: 'start' }, AT);
		correctProjection(h, { target: 'plan', id: 'extension', value: '40,000', part: 'amount' }, later(1));
		expect(h.corrections).toHaveLength(1);
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(row(p, 'extension').sub).toBe('−£40,000 once, Mar 2028');
		expect(row(p, 'extension').sheet.history).toHaveLength(3);
		const nw = buildProjection(h, 20, 'nominal', 'GBP');
		expect(nw.plan.items.find((i) => i.id === 'extension')).toMatchObject({
			when: 'Once, Mar 2028',
			fig: { amount: '40000' }
		});
	});

	it('takes a growth through the Net worth view’s own correction', () => {
		const h = new StubHousehold();
		correctProjection(h, { target: 'plan', id: 'bonus', value: '3.5' }, AT);
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(row(p, 'bonus').sub).toBe('+£3,000 each March, growing 3.5% a year');
		expect(row(p, 'bonus').sheet.saved).toBe('Saved. The Projection runs again with it.');
	});

	it('refuses what cannot be kept', () => {
		const h = new StubHousehold();
		const fix =
			(value: string, part: 'start' | 'end' | 'amount' | 'growth', id = 'bonus') =>
			() => {
				correctPlan(h, { target: 'plan', id, value, part }, AT);
			};
		expect(fix('Mar 2026', 'end')).toThrow(/must end after it starts/);
		expect(fix('Mar 2053', 'start')).toThrow(/must end after it starts/);
		expect(fix('Mar 2052', 'end')).toThrow(/Not a new value/);
		expect(fix('soon', 'end')).toThrow(/Not a new value/);
		expect(fix('Jun 2030', 'start', 'nothing')).toThrow(/no such figure/);
		expect(() => {
			correctPlan(
				new StubHousehold({ me: 'asha' }),
				{ target: 'plan', id: 'bonus', value: '2049-03', part: 'end' },
				AT
			);
		}).toThrow(/Only an admin corrects/);
		h.addPlan(HDFC);
		expect(fix('500000', 'amount', 'hdfc_close')).toThrow(/pays the balance/);
	});
});

describe('a plan paused, resumed and ended', () => {
	it('pauses with its banner and audit row, and resumes', () => {
		const h = new StubHousehold();
		setPlanStatus(h, { id: 'car2', action: 'pause' }, AT);
		let p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(p.banner).toEqual({
			kind: 'pause',
			text: 'Paused. The Projection runs again without it.',
			audit: 'Audit · Plan item paused · Replace the car · v1 → v2 · Arun · Mon 26 Oct 10:05 · in place'
		});
		expect(p.title).toBe('3 plans · 1 paused');
		expect(row(p, 'car2')).toMatchObject({
			paused: true,
			aria: 'Paused, not counted. Replace the car: £25,000 once, in June 2031.'
		});
		expect(row(p, 'car2').sheet.status).toBe('Paused');
		expect(buildProjection(h, 20, 'nominal', 'GBP').plan.items.find((i) => i.id === 'car2')?.when).toBe(
			'Once, Jun 2031 · paused, not counted'
		);
		expect(p.summary).toMatch(/no middle path is shown/);
		setPlanStatus(h, { id: 'car2', action: 'resume' }, later(1));
		p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(p.banner?.kind).toBe('resume');
		expect(p.banner?.text).toBe('Resumed. The Projection runs again with it.');
		expect(row(p, 'car2').paused).toBe(false);
		// paused then resumed, the plans stand as the run had them again
		expect(p.summary).toContain('£3,378,000');
	});

	it('ends a plan with a word for the audit; it leaves the lanes and the Net worth view, and stays in Ended', () => {
		const h = new StubHousehold();
		setPlanStatus(h, { id: 'car2', action: 'end', word: "we're keeping the car" }, AT);
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(p.banner).toMatchObject({ kind: 'end', text: 'Ended. The Projection runs again without it.' });
		expect(p.banner?.audit).toContain('his words “we’re keeping the car”');
		expect(p.timeline.rows.map((r) => r.id)).toEqual(['bonus', 'extension']);
		expect(p.ended).toEqual([
			{
				id: 'car2',
				icon: 'car',
				name: 'Replace the car',
				sub: '−£25,000 once, Jun 2031 · ended by Arun, Mon 26 Oct 10:05'
			}
		]);
		expect(p.head).toBe('Two plans, Arun’s, and one ended · no stored run for them in the preview');
		expect(p.title).toBe('2 plans · yours to change, as an admin');
		const nw = buildProjection(h, 20, 'nominal', 'GBP');
		expect(nw.plan.items.map((i) => i.id)).toEqual(['extension', 'bonus']);
		expect(nw.fan.marks.some((m) => m.id === 'car2')).toBe(false);
		expect(() => {
			setPlanStatus(h, { id: 'car2', action: 'end' }, later(1));
		}).toThrow(/cannot be changed that way/);
		expect(() => {
			correctPlan(h, { target: 'plan', id: 'car2', value: '2032-01', part: 'start' }, later(1));
		}).toThrow(/no such figure/);
	});

	it('refuses a member, and a resume of a plan that is not paused', () => {
		expect(() => {
			setPlanStatus(new StubHousehold({ me: 'asha' }), { id: 'car2', action: 'pause' }, AT);
		}).toThrow(/Only an admin pauses/);
		expect(() => {
			setPlanStatus(new StubHousehold({ me: 'asha' }), { id: 'car2', action: 'resume' }, AT);
		}).toThrow(/Only an admin resumes/);
		expect(() => {
			setPlanStatus(new StubHousehold({ me: 'asha' }), { id: 'car2', action: 'end' }, AT);
		}).toThrow(/Only an admin ends/);
		expect(() => {
			setPlanStatus(new StubHousehold(), { id: 'car2', action: 'resume' }, AT);
		}).toThrow(/cannot be changed that way/);
	});
});

describe('the plans the chat added', () => {
	it('stand on the stored run with the fees saved, and show on both views', () => {
		const h = new StubHousehold();
		h.addPlan(SCHOOL);
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(p.head).toBe('Four plans, Arun’s · the engine’s run of Thu 5 Nov 20:43');
		expect(p.summary).toBe(
			'On them, the middle path reaches £2,441,000 in 2046; 8 in 10 runs end between £2,043,000 and £3,118,000.'
		);
		const fees = row(p, 'schooling');
		expect(fees.sub).toBe('−£4,000 a month, Jan 2029 to Jul 2041');
		expect(fees.bars).toEqual([
			{ kind: 'out', from: expect.closeTo(0.11, 2) as number, to: expect.closeTo(0.74, 2) as number }
		]);
		expect(fees.aria).toBe('School fees: £4,000 a month from January 2029 to July 2041, growing 4.5% a year.');
		expect(fees.sheet.engine).toEqual(['The fees end in Jul 2041, freeing £6,784 a month.']);
		expect(fees.sheet.figures.map((f) => [f.label, f.value, f.source?.label])).toEqual([
			['Amount', '£4,000 a month', undefined],
			['Starts', 'Jan 2029', undefined],
			['Ends', 'Jul 2041', undefined],
			['Grows', '4.5% a year', 'Prior · UK school fees'],
			['Paid from', 'The monthly budget', undefined]
		]);
		const nw = buildProjection(h, 20, 'nominal', 'GBP');
		expect(nw.plan.items.at(-1)).toEqual({
			id: 'schooling',
			icon: 'school',
			title: 'School fees',
			when: 'Every month, Jan 2029 to Jul 2041',
			fig: { amount: '4000', currency: 'GBP', pre: '−', post: ' a month' }
		});
		expect(nw.fan.marks.some((m) => m.id === 'schooling' && m.shape === 'square')).toBe(true);
	});

	it('draws a change to a flow from a date, and an event on a record, with the set’s words while they are as set', () => {
		const h = new StubHousehold();
		h.addPlan(SCHOOL);
		h.addPlan(SALARY);
		h.addPlan(HDFC);
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		expect(p.timeline.rows.map((r) => r.id)).toEqual([
			'bonus',
			'extension',
			'salary_step',
			'schooling',
			'hdfc_close',
			'car2'
		]);
		expect(p.summary).toMatch(/no middle path is shown/);
		const salary = row(p, 'salary_step');
		expect(salary.sub).toBe('Set to £5,500 a month from Sep 2028');
		expect(salary.points.map((m) => m.shape)).toEqual(['step']);
		expect(salary.bars[0]?.kind).toBe('in');
		expect(salary.past).toBe(true);
		expect(salary.aria).toBe(
			'Arun’s salary: set to £5,500 a month from September 2028, from £4,778, then growing 4.8% a year from April 2029.'
		);
		expect(salary.sheet.engine).toEqual([
			'+£722 a month on Aug 2028’s £4,778, then your own 4.8% each April, until Jan 2051.'
		]);
		const hdfc = row(p, 'hdfc_close');
		expect(hdfc.sub).toBe('With the SBI FD, Mar 2029');
		expect(hdfc.points.map((m) => m.shape)).toEqual(['evt']);
		expect(hdfc.aria).toContain('₹5,93,849 cleared and the ₹39,390 EMI stops.');
		expect(hdfc.sheet.figures.map((f) => [f.label, f.value, f.edit?.part])).toEqual([
			['When', 'Mar 2029', 'start'],
			['Paid from', 'Fixed deposit · SBI', undefined],
			['It pays', '₹5,93,849, the balance then', undefined]
		]);
		expect(hdfc.sheet.engine).toHaveLength(2);
		const nw = buildProjection(h, 20, 'nominal', 'GBP');
		expect(nw.plan.items.find((i) => i.id === 'hdfc_close')).toMatchObject({
			when: 'Once, Mar 2029',
			fig: { amount: '593849', currency: 'INR' }
		});
		expect(nw.plan.items.find((i) => i.id === 'salary_step')?.when).toBe('From Sep 2028');
	});

	it('loses the set’s words once a figure moves from what the set holds', () => {
		const h = new StubHousehold();
		h.addPlan(SCHOOL);
		h.addPlan({ ...SALARY, growth: '0', asSet: false });
		h.addPlan({ ...HDFC, asSet: false });
		correctPlan(h, { target: 'plan', id: 'schooling', value: '4500', part: 'amount' }, later(5));
		const p = buildPlans(h, 30, 'nominal', 'GBP');
		expect(row(p, 'schooling').sheet.engine).toEqual([]);
		expect(row(p, 'schooling').sub).toBe('−£4,500 a month, Jan 2029 to Jul 2041');
		expect(row(p, 'salary_step').aria).toBe('Arun’s salary: set to £5,500 a month from September 2028.');
		expect(row(p, 'hdfc_close').aria).toBe('Close the HDFC home loan in March 2029 with the SBI fixed deposit.');
		expect(row(p, 'hdfc_close').sheet.figures.at(-1)?.value).toBe('The balance then');
		expect(
			standingPlans(h)
				.find((x) => x.id === 'schooling')
				?.history.at(-1)
		).toMatch(/^Plan item corrected · School fees: amount £4,000 a month → £4,500 a month · v1 → v2 · Arun/);
	});

	it('draws a flow with no end to the horizon and on, and a paused flow hollow', () => {
		const h = new StubHousehold();
		const { end: _end, ...open } = SCHOOL;
		h.addPlan({ ...open, asSet: false });
		setPlanStatus(h, { id: 'schooling', action: 'pause' }, later(3));
		const p = buildPlans(h, 20, 'nominal', 'GBP');
		const fees = row(p, 'schooling');
		expect(fees.sub).toBe('−£4,000 a month, Jan 2029 on');
		expect(fees.past).toBe(true);
		expect(fees.bars[0]?.to).toBe(1);
		expect(fees.paused).toBe(true);
		expect(buildProjection(h, 20, 'nominal', 'GBP').plan.items.at(-1)?.when).toBe(
			'Every month, Jan 2029 · paused, not counted'
		);
	});
});
