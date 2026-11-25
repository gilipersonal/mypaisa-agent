import { describe, expect, it } from 'vitest';
import type { StreamFrame } from '#lib/api/stream.ts';
import { isCheckInCard, type CheckInBody } from '#lib/cards/checkin.ts';
import { isConfirmCard, type ConfirmBody } from '#lib/cards/kinds.ts';
import { EMI_NOV, CARD_NOV } from '#lib/stub/checkins.ts';
import { StubHousehold } from '#lib/stub/household.ts';
import { CARD_FLOW_REPLY, CheckInScript, PAID_OFF_SAID, checkInScenario, type CheckInScenario } from './checkins.ts';
import { FakeTransport, PREVIEW_REPLY, type Clock } from './fake.ts';
import { applyFrame, emptyTimeline, type Timeline } from './timeline.ts';

const NOW = new Date('2026-11-05T09:12:00Z');

function manual(): Clock & { run(): void } {
	let queue: { fn: () => void; live: boolean }[] = [];
	return {
		now: () => NOW,
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

function rig(scenario: CheckInScenario, me?: string) {
	const clock = manual();
	const household = new StubHousehold(me ? { me } : {});
	const script = new CheckInScript(household, scenario);
	const fake = new FakeTransport(clock, 1, 1, household, script);
	const frames: StreamFrame[] = [];
	let timeline: Timeline = emptyTimeline();
	fake.connect((f) => {
		frames.push(f);
		timeline = applyFrame(timeline, f, () => clock.now());
	});
	clock.run();
	const cards = () => timeline.messages.flatMap((m) => m.cards ?? []);
	const body = (id: string): CheckInBody => {
		const c = cards().find((x) => x.id === id);
		if (!c || !isCheckInCard(c)) throw new Error(`no check-in card ${id}`);
		return c.body;
	};
	const confirm = (): { id: string; body: ConfirmBody } => {
		const c = cards().findLast((x) => isConfirmCard(x));
		if (!c || !isConfirmCard(c)) throw new Error('no Confirm card');
		return c;
	};
	const tap = async (id: string, action: Parameters<FakeTransport['tap']>[1]) => {
		await fake.tap(id, action);
		clock.run();
	};
	const send = async (text: string) => {
		await fake.send({ id: `m${String(frames.length)}`, text });
		clock.run();
	};
	const question = () => cards().findLast((x) => x.id.startsWith('checkin.q.'))?.id ?? '';
	const changed = () => frames.filter((f) => f.event === 'records.changed').length;
	const hdfc = () => household.debts.find((d) => d.id === 'hdfc')?.balance;
	return {
		clock,
		household,
		script,
		fake,
		frames,
		body,
		confirm,
		tap,
		send,
		question,
		changed,
		hdfc,
		timeline: () => timeline
	};
}

describe('which check-in the address asks for', () => {
	it('reads ?checkin=emi or ?checkin=several, and nothing else', () => {
		expect(checkInScenario('?local&checkin=emi')).toBe('emi');
		expect(checkInScenario('?checkin=several')).toBe('several');
		expect(checkInScenario('?checkin=maybe')).toBeUndefined();
		expect(checkInScenario('')).toBeUndefined();
	});
});

describe("November's EMI (Web v4 · Check-ins, K2): Paid is the Confirm, with Undo", () => {
	it('arrives once, with exactly what Paid saves, Paid and Something else', () => {
		const r = rig('emi');
		r.fake.connect(() => undefined); // a second connect does not ask again
		r.clock.run();
		expect(r.body('checkin.emi')).toMatchObject({
			chip: 'Check-in',
			right: 'due today',
			title: 'Was November’s EMI of ₹39,390 paid?',
			rows: [
				{ label: 'Loan', value: 'HDFC home loan · Pune flat' },
				{ label: 'Paid saves', value: '₹39,390 on Thu 5 Nov' }
			],
			hint: 'One tap on Paid saves exactly this, with Undo.',
			actions: [{ id: 'checkin.paid', label: 'Paid', style: 'primary' }],
			options: [
				{ label: 'Not yet', note: 'I’ll ask again on Mon 9 Nov' },
				{ label: 'Different amount', note: 'Tell me what was paid' },
				{ label: 'Paid off in full', note: 'Closes the loan, after a Confirm' }
			]
		});
		expect(r.timeline().messages).toHaveLength(1);
	});

	it('Paid saves in place, moves the loan and tells every door; Undo opens it again', async () => {
		const r = rig('emi');
		await r.tap('checkin.emi', 'checkin.paid');
		expect(r.body('checkin.emi')).toMatchObject({
			right: 'answered',
			right_at: NOW.toISOString(),
			saved: true,
			title: 'Paid · November’s EMI',
			rows: [{ value: '₹39,390 on Thu 5 Nov' }, {}, { label: 'Left to pay', value: '₹14,84,587' }],
			hint: 'Left to pay is the engine’s schedule after this EMI.',
			actions: [{ id: 'checkin.undo', label: 'Undo', icon: 'undo' }],
			fold: { text: 'Saved · in the audit log', icon: 'saved' }
		});
		expect(r.hdfc()).toBe(1484586.73);
		expect(r.changed()).toBe(1);
		await r.tap('checkin.emi', 'checkin.paid'); // twice counts once
		expect(r.changed()).toBe(1);

		await r.tap('checkin.emi', 'checkin.undo');
		const open = r.body('checkin.emi');
		expect(open).toMatchObject({ right: 'open again', title: 'Was November’s EMI of ₹39,390 paid?' });
		expect(open.undone?.text).toBe('The payment is reversed by a new event; both stay in the audit log.');
		expect(open.hint).toBeUndefined();
		expect(r.hdfc()).toBe(1513257.4);
		expect(r.household.answerOf(EMI_NOV)?.answer).toBe('undone');
		expect(r.changed()).toBe(2);
	});

	it('Not yet saves nothing to the loan', async () => {
		const r = rig('emi');
		await r.tap('checkin.emi', 'checkin.not_yet');
		expect(r.body('checkin.emi')).toMatchObject({
			title: 'Not yet · November’s EMI',
			text: 'I’ll ask again on Mon 9 Nov. If it’s still open then, it shows as overdue on Home.',
			rows: [{}, { label: 'Due', value: 'Thu 5 Nov · ₹39,390' }],
			fold: { text: 'Noted · nothing saved to the loan', icon: 'noted' }
		});
		expect(r.hdfc()).toBe(1513257.4);
	});
});

describe('Something else: the short flows (K3, K4)', () => {
	it('Different amount folds the answer, asks how much, then a Confirm card saves it', async () => {
		const r = rig('emi');
		await r.tap('checkin.emi', 'checkin.different');
		expect(r.body('checkin.emi')).toEqual({
			over: 'Check-in · November’s EMI',
			answers: [{ label: 'Answer', value: 'Different amount' }]
		});
		expect(r.body(r.question())).toMatchObject({
			over: 'Different amount · one question',
			cancel: 'Cancel',
			title: 'How much went to HDFC on Thu 5 Nov?',
			hint: 'Then a Confirm card shows what will be saved.'
		});
		await r.send('no amount here');
		expect(r.timeline().messages.at(-1)?.text).toBe(PREVIEW_REPLY);
		await r.send('₹30,000');
		expect(r.body(r.question()).answers).toEqual([
			{ label: 'Amount paid', value: '₹30,000' },
			{ label: 'Paid on', value: 'Thu 5 Nov' }
		]);
		const c = r.confirm();
		expect(c.body).toMatchObject({
			over: 'Different amount · check it',
			rows: [{ value: '₹30,000 on Thu 5 Nov' }, {}, { label: 'Left to pay', value: '₹14,93,976' }],
			hint: 'Nothing is saved until you tap Confirm.',
			state: 'open'
		});
		expect(r.hdfc()).toBe(1513257.4); // nothing until Confirm
		await r.tap(c.id, 'confirm');
		expect(r.confirm().body).toMatchObject({ over: 'Different amount · saved', state: 'saved' });
		expect(r.hdfc()).toBe(1493976.31);
		expect(r.changed()).toBe(1);
	});

	it('Paid off in full: the engine’s figure, the Confirm, the loan closed and the agent’s words', async () => {
		const r = rig('emi');
		await r.tap('checkin.emi', 'checkin.paid_off');
		const q = r.question();
		expect(r.body(q)).toMatchObject({
			over: 'Paid off in full · 1 of 2',
			title: 'What was the final amount?',
			text: 'Use HDFC’s closing figure, or the engine’s for Thu 5 Nov.',
			picks: [
				{ id: 'checkin.engine', label: '₹15,23,976 · the engine’s figure' },
				{ id: 'checkin.type', label: 'Type HDFC’s figure' }
			],
			hint: 'The engine’s figure: the balance after October’s EMI, with November’s interest.'
		});
		await r.tap(q, 'checkin.type'); // the composer takes it from here
		await r.tap(q, 'checkin.engine');
		expect(r.body(q)).toEqual({
			over: 'Paid off in full',
			answers: [
				{ label: 'Final amount', value: '₹15,23,976' },
				{ label: 'Paid on', value: 'Thu 5 Nov' }
			]
		});
		const c = r.confirm();
		expect(c.body).toMatchObject({
			over: 'Close the loan · check it',
			title: 'HDFC home loan, paid off in full',
			rows: [
				{ label: 'Final payment', value: '₹15,23,976' },
				{ label: 'Paid on', value: 'Thu 5 Nov' },
				{ label: 'The loan', value: 'closes; kept in the history' },
				{ label: 'Its check-ins', value: 'end with this one' },
				{ label: 'Then', value: 'the projection runs again' }
			]
		});
		await r.tap(c.id, 'confirm');
		expect(r.confirm().body).toMatchObject({
			over: 'Loan closed · saved',
			title: 'HDFC home loan · closed',
			rows: [
				{ label: 'Paid off', value: '₹15,23,976, Thu 5 Nov' },
				{ label: 'Its check-ins', value: 'ended' }
			],
			state: 'saved'
		});
		expect(r.household.closed.map((d) => d.id)).toEqual(['hdfc']);
		expect(r.timeline().messages.at(-1)).toMatchObject({
			text: PAID_OFF_SAID,
			meta: 'Figures: the engine’s schedule and projection'
		});
		await r.tap('checkin.emi', 'checkin.paid'); // closed: nothing more to answer
		expect(r.changed()).toBe(1);
	});

	it('a typed figure answers the payoff; Edit asks again; Cancel leaves nothing saved and opens the check-in', async () => {
		const r = rig('emi');
		await r.tap('checkin.emi', 'checkin.paid_off');
		await r.send('15,20,000');
		const first = r.confirm();
		expect(first.body.rows[0]).toEqual({ label: 'Final payment', value: '₹15,20,000' });
		expect(r.script.takeText('15,00,000')).toBe(false); // a Confirm card is waiting
		await r.tap(first.id, 'edit');
		expect(r.confirm().body.state).toBe('cancelled');
		expect(r.body(r.question()).title).toBe('What was the final amount?');
		await r.tap(r.question(), 'checkin.engine');
		await r.tap(r.confirm().id, 'cancel');
		expect(r.confirm().body.state).toBe('cancelled');
		expect(r.body('checkin.emi')).toMatchObject({ right: 'due today', actions: [{ id: 'checkin.paid' }] });
		expect(r.household.debts.some((d) => d.id === 'hdfc')).toBe(true);
		expect(r.changed()).toBe(0);
	});

	it('Cancel on the question folds it and opens the check-in again', async () => {
		const r = rig('emi');
		await r.tap('checkin.emi', 'checkin.different');
		const q = r.question();
		await r.tap(q, 'checkin.cancel');
		expect(r.body(q)).toEqual({ over: 'Different amount · one question', title: 'Cancelled · nothing was saved' });
		expect(r.body('checkin.emi').actions?.[0]?.id).toBe('checkin.paid');
		await r.tap(q, 'checkin.cancel'); // a stale card does nothing
		await r.tap('checkin.q.99', 'confirm');
		expect(r.changed()).toBe(0);
	});
});

describe('several due at once (K5): one card, All paid', () => {
	it('shows both in compact rows, the EMI overdue; All paid saves both; Undo both reverses both', async () => {
		const r = rig('several');
		expect(r.body('checkin.several')).toMatchObject({
			chip: 'Check-ins',
			right: '2 due',
			title: 'Two payments to tick off',
			items: [
				{ tile: '₹', name: 'HDFC home loan', note: 'EMI due Thu 5 Nov', value: '₹39,390', chip: 'Overdue' },
				{ tile: '£', name: 'Barclaycard', note: 'The bill in full · due today', value: '£1,458' }
			],
			hint: 'All paid saves both, exactly as shown, each with its audit row.',
			actions: [{ label: 'All paid' }, { label: 'One by one' }]
		});
		await r.tap('checkin.several', 'checkin.all_paid');
		expect(r.body('checkin.several')).toMatchObject({
			saved: true,
			title: 'Both paid',
			items: [
				{ note: 'November’s EMI', done: true },
				{ note: 'The bill in full', done: true }
			],
			actions: [{ label: 'Undo both', icon: 'undo' }]
		});
		expect(r.hdfc()).toBe(1484586.73);
		expect(r.household.answerOf(CARD_NOV)?.answer).toBe('paid');
		expect(r.household.lastChange?.line).toBe('two payments saved in the chat');
		await r.tap('checkin.several', 'checkin.undo');
		expect(r.body('checkin.several')).toMatchObject({ right: 'open again', undone: { at: NOW.toISOString() } });
		expect(r.hdfc()).toBe(1513257.4);
		expect(r.household.answerOf(CARD_NOV)?.answer).toBe('undone');
	});

	it('One by one opens each row’s own card; the card bill has Paid in full, Undo, Not yet and its own flow', async () => {
		const r = rig('several');
		await r.tap('checkin.several', 'checkin.one_by_one');
		expect(r.body('checkin.several').actions).toBeUndefined();
		expect(r.body('checkin.card')).toMatchObject({
			title: 'Was the £1,458 Barclaycard bill paid in full?',
			rows: [
				{ label: 'Statement', value: 'Sun 1 Nov' },
				{ label: 'Minimum', value: '£25' },
				{ label: 'Paid in full saves', value: '£1,458 on Fri 20 Nov' }
			],
			actions: [{ label: 'Paid in full' }],
			options: [
				{ label: 'The minimum, £25', note: '£1,433 carries over; its interest counts as spending' },
				{ label: 'Part of it' },
				{ label: 'Not yet', note: 'I’ll ask again on Mon 23 Nov' }
			]
		});
		expect(r.body('checkin.emi').title).toBe('Was November’s EMI of ₹39,390 paid?');
		await r.tap('checkin.card', 'checkin.minimum');
		expect(r.timeline().messages.at(-1)?.text).toBe(CARD_FLOW_REPLY);
		await r.tap('checkin.card', 'checkin.paid');
		expect(r.body('checkin.card')).toMatchObject({ saved: true, title: 'Paid in full · the Barclaycard bill' });
		await r.tap('checkin.card', 'checkin.undo');
		expect(r.body('checkin.card')).toMatchObject({ right: 'open again' });
		await r.tap('checkin.card', 'checkin.not_yet');
		expect(r.body('checkin.card')).toMatchObject({ title: 'Not yet · the Barclaycard bill' });
		expect(r.household.answerOf(CARD_NOV)?.answer).toBe('not_yet');
		await r.tap('checkin.several', 'checkin.all_paid'); // split: the shared card no longer answers
		expect(r.hdfc()).toBe(1513257.4);
	});
});

describe('check-ins go to the admins', () => {
	it('Asha sees the card with no buttons, and her taps and typed amounts are refused', async () => {
		const r = rig('emi', 'asha');
		const body = r.body('checkin.emi');
		expect(body.title).toBe('Was November’s EMI of ₹39,390 paid?');
		expect(body.actions).toBeUndefined();
		expect(body.options).toBeUndefined();
		expect(body.hint).toBeUndefined();
		await r.tap('checkin.emi', 'checkin.paid');
		expect(r.hdfc()).toBe(1513257.4);
		expect(r.script.takeText('30000')).toBe(false);
		const several = rig('several', 'asha');
		expect(several.body('checkin.several').actions).toBeUndefined();
	});

	it('a script with no transport says nothing', () => {
		const script = new CheckInScript(new StubHousehold(), 'emi');
		script.arrive();
		script.tap('checkin.emi', 'checkin.paid');
		expect(script.owns('checkin.emi')).toBe(true);
		expect(script.owns('monzo')).toBe(false);
	});
});
