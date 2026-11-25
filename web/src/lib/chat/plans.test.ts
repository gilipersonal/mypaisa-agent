import { describe, expect, it } from 'vitest';
import type { StreamFrame } from '#lib/api/stream.ts';
import type { PlanBlock, PlanBody } from '#lib/cards/plan.ts';
import { StubHousehold } from '#lib/stub/household.ts';
import { FakeTransport, PREVIEW_REPLY, type Clock } from './fake.ts';
import { applyFrame, emptyTimeline, type ChatMessage, type Timeline } from './timeline.ts';

/** A clock that runs only when told. */
function manual(): Clock & { run(): void } {
	let queue: { fn: () => void; live: boolean }[] = [];
	return {
		now: () => new Date('2026-10-26T10:05:00'),
		later(fn) {
			const job = { fn, live: true };
			queue.push(job);
			return () => (job.live = false);
		},
		run() {
			while (queue.length > 0) {
				const jobs = queue;
				queue = [];
				for (const job of jobs) if (job.live) job.fn();
			}
		}
	};
}

function rig(given: StubHousehold | null = new StubHousehold()) {
	const household = given ?? undefined;
	const clock = manual();
	const fake = new FakeTransport(clock, 1, 1, household);
	const frames: StreamFrame[] = [];
	let timeline: Timeline = emptyTimeline();
	fake.connect((f) => {
		frames.push(f);
		timeline = applyFrame(timeline, f, () => clock.now());
	});
	let n = 0;
	const say = async (text: string) => {
		n += 1;
		await fake.send({ id: `m${String(n)}`, text });
		clock.run();
		return `m${String(n)}`;
	};
	const tapChip = async (turn: string, chip: string) => {
		await fake.choose(turn, chip);
		clock.run();
	};
	const tap = async (cardId: string, action: 'confirm' | 'edit' | 'cancel') => {
		await fake.tap(cardId, action);
		clock.run();
	};
	return {
		household,
		frames,
		say,
		tapChip,
		tap,
		get timeline() {
			return timeline;
		}
	};
}

const bodyOf = (m: ChatMessage | undefined): PlanBody => m?.cards?.[0]?.body as PlanBody;
const agent = (t: Timeline) => t.messages.filter((m) => m.role === 'agent');
const block = <K extends PlanBlock['kind']>(b: PlanBody, kind: K) =>
	b.blocks.filter((x): x is Extract<PlanBlock, { kind: K }> => x.kind === kind);
const SCHOOL = "£4,000 a month from Jan 2029 for my kid's schooling";

async function feesAsBoard(r: ReturnType<typeof rig>) {
	const turn = await r.say(SCHOOL);
	await r.tapChip(turn, 'end:jul2041');
	await r.tapChip(turn, 'growth:prior');
	await r.tapChip(turn, 'paid:budget');
	return turn;
}

describe('a plan item made by talking (board 2a)', () => {
	it('asks the three things the sentence left out, in one card with chips', async () => {
		const r = rig();
		await r.say(SCHOOL);
		const first = agent(r.timeline)[0];
		expect(first?.text).toBe('I’ll set that up as a plan item. Three things first.');
		const card = bodyOf(first);
		expect(card).toMatchObject({
			over: 'New plan item',
			title: 'School fees',
			sub: '£4,000 a month from Jan 2029, for your kid (not a member)'
		});
		expect(block(card, 'q').map((q) => [q.q, q.chips.map((c) => c.label)])).toEqual([
			['Until when?', ['Jul 2041', 'For 10 years', 'No end date']],
			['How do the fees grow?', ['4.5% a year, UK school fees', 'No growth', 'Another rate']],
			['Paid from where?', ['The monthly budget', 'A pool you name']]
		]);
		expect(block(card, 'foot')[0]?.t).toBe('Tap an answer, or type it. Nothing is saved yet.');
	});

	it('shows the engine’s impact from the stored run, then keeps the plan on Confirm', async () => {
		const r = rig();
		const turn = await r.say(SCHOOL);
		await r.tapChip(turn, 'end:jul2041');
		expect(block(bodyOf(agent(r.timeline)[0]), 'q')[0]?.chosen).toBe('jul2041');
		await r.tapChip(turn, 'growth:prior');
		await r.tapChip(turn, 'paid:budget');
		const answered = bodyOf(agent(r.timeline)[0]);
		expect(answered.over).toBe('Answered');
		expect(block(answered, 'kv').map((kv) => kv.v)).toEqual([
			'Jul 2041',
			'4.5% a year, UK school fees',
			'The monthly budget'
		]);
		const impact = agent(r.timeline).at(-1);
		const body = bodyOf(impact);
		expect(body).toMatchObject({
			over: 'Not saved yet',
			title: 'School fees',
			sub: '£4,000 a month, Jan 2029 to Jul 2041, rising 4.5% a year',
			acts: ['confirm', 'edit', 'cancel']
		});
		expect(block(body, 'mp3')[0]?.rows).toEqual([
			{ y: '2031', v: '£698,000', chg: '▼ £157,000', dir: 'down' },
			{ y: '2036', v: '£996,000', chg: '▼ £505,000', dir: 'down' },
			{ y: '2046', v: '£2,441,000', chg: '▼ £1,107,000', dir: 'down' }
		]);
		expect(block(body, 'foot').map((f) => f.t)).toEqual([
			'Was £855,000 · £1,501,000 · £3,548,000',
			'Cash stays above zero. The fees end in Jul 2041, freeing £6,784 a month.'
		]);
		expect(block(body, 'flag')[0]?.t).toBe('▼ Under your £500 floor in 50 months, Jan 2029 to Feb 2035');
		const chart = block(body, 'bars')[0];
		expect(chart?.values).toHaveLength(20);
		expect(chart?.flagged.filter(Boolean)).toHaveLength(7);
		expect(chart?.aria).toMatch(
			/^Surplus each year, 2027 to 2046\. With the fees it falls from £39,738 in 2028 to −£1,285/
		);
		expect(body.tech?.lines.at(-1)).toMatch(/stored run, not a new calculation/);

		await r.tap(impact?.cards?.[0]?.id ?? '', 'confirm');
		const saved = bodyOf(agent(r.timeline).find((m) => m.id === impact?.id));
		expect(saved).toMatchObject({
			over: 'Added to the plan',
			done: true,
			sub: '£4,000 a month, Jan 2029 to Jul 2041, 4.5% a year · 2046 middle path ▼ £1,107,000',
			audit: 'Audit · Plan item added · Arun · Mon 26 Oct 10:05 · in the chat'
		});
		expect(agent(r.timeline).at(-1)?.text).toBe(
			'Saved, with its audit row. It leaves you £19,058 short over 50 months.'
		);
		expect(r.household?.plans.map((p) => [p.id, p.asSet])).toEqual([['schooling', true]]);
		expect(r.frames.some((f) => f.event === 'records.changed')).toBe(true);
		// a second tap does nothing more
		await r.tap(impact?.cards?.[0]?.id ?? '', 'confirm');
		expect(r.household?.plans).toHaveLength(1);
	});

	it('goes on to the salary step and the HDFC closure, each on its stored run', async () => {
		const r = rig();
		const fees = await feesAsBoard(r);
		await r.tap(`${fees}.impact.0.card`, 'confirm');
		const salary = await r.say('my salary goes to £5,500 a month from Sep 2028');
		expect(agent(r.timeline).at(-1)?.text).toBe('I’ll change your salary from Sep 2028. Two things first.');
		expect(bodyOf(agent(r.timeline).at(-1)).sub).toBe(
			'Set to £5,500 a month from Sep 2028; it would be £4,778 by then. Take-home, as every amount is.'
		);
		await r.tapChip(salary, 'growth:own');
		await r.tapChip(salary, 'end:retire');
		const imp = bodyOf(agent(r.timeline).at(-1));
		expect(imp.title).toBe('Arun’s salary, £5,500 a month from Sep 2028');
		expect(imp.sub).toBe('+£722 a month on Aug 2028’s £4,778, then your own 4.8% each April, until Jan 2051');
		expect(block(imp, 'mp3')[0]?.rows.map((x) => x.chg)).toEqual(['▲ £33,000', '▲ £99,000', '▲ £321,000']);
		expect(block(imp, 'ok')[0]?.t).toBe('No month is flagged under your £500 floor. Cash stays above zero.');
		await r.tap(`${salary}.impact.0.card`, 'confirm');
		expect(agent(r.timeline).at(-1)?.text).toBe('Saved, with its audit row. The Projection has run again with it.');
		const savedSalary = bodyOf(agent(r.timeline).find((m) => m.id === `${salary}.impact.0`));
		expect(savedSalary.sub).toBe('Then 4.8% each April, until you retire at 60 · 2046 middle path ▲ £321,000');
		expect(savedSalary.tech?.open).toBe(true);

		const hdfc = await r.say('close my HDFC loan with the SBI FD when it matures');
		expect(agent(r.timeline).at(-1)?.text).toBe('That’s 10 Mar 2029. One thing first.');
		await r.tapChip(hdfc, 'leftover:cash');
		const close = bodyOf(agent(r.timeline).at(-1));
		expect(block(close, 'kv').map((kv) => [kv.k, kv.v])).toEqual([
			['Left over, into cash', '₹23,689'],
			['The EMI stops after', 'Mar 2029, not Jul 2030'],
			['EMIs not paid', '16 × ₹39,390']
		]);
		expect(block(close, 'mp3')[0]?.rows.map((x) => x.chg)).toEqual(['unchanged', 'unchanged', 'unchanged']);
		await r.tap(`${hdfc}.impact.0.card`, 'confirm');
		expect(agent(r.timeline).at(-1)?.text).toBe(
			'Saved. The loan closes in Mar 2029 and its EMI stops; the Projection has run again.'
		);
		expect(r.household?.plans.map((p) => p.id)).toEqual(['schooling', 'salary_step', 'hdfc_close']);
		expect(bodyOf(agent(r.timeline).find((m) => m.id === `${hdfc}.impact.0`)).tech?.lines).toContain(
			'Projection run R3 → R4 · 2046 middle path £2,762,000, unchanged'
		);
	});

	it('says plainly that the preview holds no run for answers the board did not give', async () => {
		const r = rig();
		const turn = await r.say(SCHOOL);
		await r.tapChip(turn, 'end:ten');
		await r.tapChip(turn, 'growth:none');
		await r.tapChip(turn, 'paid:budget');
		const body = bodyOf(agent(r.timeline).at(-1));
		expect(body.sub).toBe('£4,000 a month, Jan 2029 to Dec 2038, no growth');
		expect(block(body, 'mp3')).toEqual([]);
		expect(block(body, 'foot')[0]?.t).toMatch(/^The preview’s figure set holds no engine run for this plan/);
		await r.tap(`${turn}.impact.0.card`, 'confirm');
		expect(agent(r.timeline).at(-1)?.text).toBe('Saved, with its audit row.');
		expect(r.household?.plans[0]).toMatchObject({ end: '2038-12', growth: '0', asSet: false });
	});

	it('takes a typed rate and a named pool after their chips, and asks again for words it cannot read', async () => {
		const r = rig();
		const turn = await r.say(SCHOOL);
		await r.tapChip(turn, 'growth:other');
		expect(agent(r.timeline).at(-1)?.text).toBe('Type the rate, as “3.5% a year”.');
		await r.say('quickly please');
		expect(agent(r.timeline).at(-1)?.text).toBe('Type the rate, as “3.5% a year”.');
		await r.say('3% a year');
		await r.tapChip(turn, 'paid:pool');
		expect(agent(r.timeline).at(-1)?.text).toBe('Name the pool it is paid from, as “the ISA”.');
		await r.say("the kids' ISA");
		await r.say('Jul 2041');
		const answered = bodyOf(agent(r.timeline)[0]);
		expect(block(answered, 'kv').map((kv) => kv.v)).toEqual(['Jul 2041', '3% a year', 'The kids’ ISA']);
		expect(bodyOf(agent(r.timeline).at(-1)).sub).toBe('£4,000 a month, Jan 2029 to Jul 2041, rising 3% a year');
	});

	it('asks nothing when the sentence says it all, and leaves other messages to the rest of the script', async () => {
		const r = rig();
		await r.say(
			'£4,000 a month from Jan 2029 to Jul 2041 for my kid’s schooling, growing 4.5% a year, from the monthly budget'
		);
		// the sentence must begin as the board's does; this one does not, so the rest of the script answers
		expect(agent(r.timeline).at(-1)?.text).toBe(PREVIEW_REPLY);
		await r.say(
			"£4,000 a month from Jan 2029 for my kid's schooling to Jul 2041, 4.5% a year, from the monthly budget"
		);
		const body = bodyOf(agent(r.timeline).at(-1));
		expect(body.over).toBe('Not saved yet');
		expect(block(body, 'mp3')).toHaveLength(1);
		const open = rig();
		await open.say(SCHOOL);
		await open.say('What’s due this week?');
		expect(agent(open.timeline).at(-1)?.text).toMatch(/^Two things this week/);
	});

	it('Change asks again and Cancel keeps nothing', async () => {
		const r = rig();
		const turn = await feesAsBoard(r);
		await r.tap(`${turn}.impact.0.card`, 'edit');
		expect(bodyOf(agent(r.timeline).find((m) => m.id === `${turn}.impact.0`))).toMatchObject({
			over: 'Not saved',
			blocks: [{ kind: 'foot', t: 'Changing it · nothing was saved' }]
		});
		const again = agent(r.timeline).at(-1);
		expect(again?.text).toBe('Tap a new answer for each.');
		expect(block(bodyOf(again), 'q')).toHaveLength(3);
		const id = again?.id ?? '';
		await r.tapChip(id, 'end:none');
		await r.tapChip(id, 'growth:prior');
		await r.tapChip(id, 'paid:budget');
		const impact = agent(r.timeline).at(-1);
		expect(bodyOf(impact).sub).toBe('£4,000 a month, Jan 2029, no end date, rising 4.5% a year');
		await r.tap(impact?.cards?.[0]?.id ?? '', 'cancel');
		expect(block(bodyOf(agent(r.timeline).find((m) => m.id === impact?.id)), 'foot')[0]?.t).toBe(
			'Cancelled · nothing was saved'
		);
		expect(r.household?.plans).toEqual([]);
		// a chip on a card that is no longer asking does nothing
		await r.tapChip(id, 'end:jul2041');
		expect(r.household?.plans).toEqual([]);
	});

	it('takes a salary step for a number of years, and a closure into the NRE savings, without the set’s figures', async () => {
		const r = rig();
		const salary = await r.say('my salary goes to £6,000 a month from Sep 2028');
		expect(bodyOf(agent(r.timeline).at(-1)).sub).toBe(
			'Set to £6,000 a month from Sep 2028. Take-home, as every amount is.'
		);
		await r.tapChip(salary, 'growth:none');
		await r.tapChip(salary, 'end:years');
		expect(agent(r.timeline).at(-1)?.text).toBe('Type how many years, as “8 years”.');
		await r.say('8 years');
		const imp = bodyOf(agent(r.timeline).at(-1));
		expect(imp.sub).toBe('Then no growth, until Aug 2036');
		await r.tap(`${salary}.impact.0.card`, 'confirm');
		expect(r.household?.plans[0]).toMatchObject({ id: 'salary_step', end: '2036-08', growth: '0', asSet: false });
		const hdfc = await r.say('close my HDFC loan with the SBI FD when it matures');
		await r.say('into the NRE please');
		const close = bodyOf(agent(r.timeline).at(-1));
		expect(block(close, 'kv')[0]?.k).toBe('Left over, into the NRE savings');
		expect(block(close, 'mp3')).toEqual([]);
		await r.tap(`${hdfc}.impact.0.card`, 'confirm');
		expect(r.household?.plans.at(-1)).toMatchObject({ id: 'hdfc_close', asSet: false });
	});

	it('works without a household behind it', async () => {
		const r = rig(null);
		const turn = await feesAsBoard(r);
		await r.tap(`${turn}.impact.0.card`, 'confirm');
		expect(bodyOf(agent(r.timeline).find((m) => m.id === `${turn}.impact.0`)).audit).toBe(
			'Audit · Plan item added · Arun · Today 10:05 · in the chat'
		);
	});
});

describe('a member who is not an admin (board 2a states, Asha asks)', () => {
	it('is refused a plan item and a saved assumption, politely, with nothing saved', async () => {
		const r = rig(new StubHousehold({ me: 'asha' }));
		await r.say('Add £300 a month for my gym from January');
		expect(bodyOf(agent(r.timeline).at(-1))).toEqual({
			over: 'Not saved',
			title: 'Plans are Arun’s',
			sub: '£300 a month for your gym from January, your words',
			blocks: [
				{ kind: 'lock', t: 'Plan items are an admin’s to add; Arun is one. Nothing is saved.' },
				{ kind: 'foot', t: 'I can show it as a what-if instead: the engine runs it, and nothing in the plan moves.' }
			]
		});
		await r.say('Make UK inflation 3%');
		expect(bodyOf(agent(r.timeline).at(-1))).toMatchObject({
			title: 'The saved assumptions are Arun’s',
			sub: 'UK inflation is 2.5% a year, the prior Arun keeps',
			blocks: [
				{ kind: 'lock', t: 'Only Arun can change a saved assumption. Nothing is saved.' },
				{ kind: 'foot', t: 'I can run a what-if at 3% for you; nothing in the plan moves.' }
			]
		});
		await r.say(SCHOOL);
		expect(bodyOf(agent(r.timeline).at(-1)).sub).toBe(
			'“£4,000 a month from Jan 2029 for my kid’s schooling”, your words'
		);
		expect(r.household?.plans).toEqual([]);
	});
});
