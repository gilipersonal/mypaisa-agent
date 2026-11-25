/** The scripted check-ins (MA-205), word for word as Web v4 · Check-ins draws them (with iPhone v4 · Check-ins for the
 * states the web board leaves to it: Not yet, Different amount, the card bill and privacy). The daily worker puts a
 * check-in in an admin's chat; here the script does, once the chat connects, when the address asks for one
 * (`?checkin=emi` or `?checkin=several`). Paid is the Confirm and saves exactly what the card shows, with Undo;
 * Something else holds Not yet, Different amount and Paid off in full, each a short flow of cards; several due at once
 * share one card with All paid. Every answer is written to the stub household, and `records.changed` moves the pages
 * beside the chat, as a confirmed record does. Check-ins go to the admins: a member who is not an admin sees the card
 * with no buttons, and her taps are refused. */
import type { CheckInAction, CheckInBody, CheckInCard, CheckInItem } from '#lib/cards/checkin.ts';
import type { CardRow, ConfirmCard } from '#lib/cards/kinds.ts';
import { CARD_SCHEMA_VERSION } from '#lib/cards/types.ts';
import { formatMoney } from '#lib/formatting/money.ts';
import {
	CARD_NOV,
	EMI_NOV,
	cardBillFigures,
	day,
	emiFigures,
	leftAfter,
	notYet,
	payCardBill,
	payEmi,
	payOff,
	undoCardBill,
	undoEmi
} from '#lib/stub/checkins.ts';
import type { StubHousehold } from '#lib/stub/household.ts';
import type { CardAction } from './transport.ts';

export type CheckInScenario = 'emi' | 'several';

/** Which check-ins the address asks the script for: `?checkin=emi` or `?checkin=several`. */
export function checkInScenario(search: string): CheckInScenario | undefined {
	const v = new URLSearchParams(search).get('checkin');
	return v === 'emi' || v === 'several' ? v : undefined;
}

/** What the script needs from the transport that carries it. */
export interface CheckInPort {
	emit(event: string, data: Record<string, unknown>): void;
	after(key: string, fn: () => void): void;
	now(): Date;
}

/** The card bill's other answers are its own flow (MA-210), not scripted here. */
export const CARD_FLOW_REPLY =
	'The minimum and part of the bill are the card bill’s own short flow, which this preview does not script yet.';
export const PAID_OFF_SAID =
	'The Pune flat has no loan on it now. The projection ran again, with ₹39,390 a month freed from December.';
export const PAID_OFF_META = 'Figures: the engine’s schedule and projection';

const inr = (n: number) => formatMoney(String(n), 'INR', { whole: true });
const gbp = (n: number) => formatMoney(String(n), 'GBP', { whole: true });
const row = (label: string, value: string): CardRow => ({ label, value });
const LOAN = row('Loan', 'HDFC home loan · Pune flat');
const REVERSED = 'The payment is reversed by a new event; both stay in the audit log.';
const SAVED = 'Saved · in the audit log';
const UNDO: CheckInAction = { id: 'checkin.undo', label: 'Undo', style: 'tinted', icon: 'undo' };

type EmiState = 'open' | 'paid' | 'answered' | 'flow' | 'closed';
interface Flow {
	kind: 'different' | 'payoff';
	question: string;
	confirm?: string;
	amount?: number;
}

export class CheckInScript {
	#port: CheckInPort | undefined;
	#arrived = false;
	#n = 0;
	#emi: EmiState = 'open';
	#bill: 'open' | 'paid' | 'answered' = 'open';
	#several: 'open' | 'paid' | 'split' = 'open';
	#flow: Flow | undefined;

	constructor(
		private readonly household: StubHousehold,
		private readonly scenario: CheckInScenario
	) {}

	/** Only admins answer a check-in; anyone else sees it with no buttons. */
	get admin(): boolean {
		return this.household.member(this.household.me)?.admin === true;
	}

	attach(port: CheckInPort): void {
		this.#port = port;
	}

	/** The check-in arrives once, a moment after the chat first connects. */
	arrive(): void {
		if (this.#arrived || !this.#port) return;
		this.#arrived = true;
		const card = this.scenario === 'emi' ? this.#emiOpen() : this.#severalOpen();
		this.#later(`${card.id}.m`, () => {
			this.#say(`${card.id}.m`, '', [card]);
		});
	}

	owns(cardId: string): boolean {
		return cardId.startsWith('checkin.');
	}

	tap(cardId: string, action: CardAction): void {
		if (!this.admin) return;
		const flow = this.#flow;
		const question = flow?.question;
		if (cardId === 'checkin.emi') this.#tapEmi(action);
		else if (cardId === 'checkin.card') this.#tapCard(action);
		else if (cardId === 'checkin.several') this.#tapSeveral(action);
		else if (flow && cardId === question) this.#tapQuestion(flow, action);
		else if (flow?.confirm && cardId === flow.confirm) this.#tapConfirm(flow, action);
	}

	/** An amount typed while a flow asks for one: true when it was taken. */
	takeText(text: string): boolean {
		const flow = this.#flow;
		if (!flow || flow.confirm || !this.admin) return false;
		const found = /\d[\d,]*(?:\.\d+)?/.exec(text);
		const amount = found ? Number(found[0].replaceAll(',', '')) : 0;
		if (!(amount > 0)) return false;
		this.#answered(flow, amount);
		return true;
	}

	/* ---------- November's EMI ---------- */

	#tapEmi(action: CardAction): void {
		const f = emiFigures();
		const now = this.#now();
		if (action === 'checkin.paid' && this.#emi === 'open') {
			payEmi(this.household, f.payment, now);
			this.#emi = 'paid';
			this.#update(this.#emiSaved(now));
			this.#changed('paid');
		} else if (action === 'checkin.undo' && this.#emi === 'paid') {
			undoEmi(this.household, now);
			this.#emi = 'open';
			this.#update(this.#emiOpen(now));
			this.#changed('undone');
		} else if (action === 'checkin.not_yet' && this.#emi === 'open') {
			notYet(this.household, EMI_NOV, now);
			this.#emi = 'answered';
			this.#update(this.#emiNotYet(now));
			this.#changed('answered');
		} else if ((action === 'checkin.different' || action === 'checkin.paid_off') && this.#emi === 'open') {
			const different = action === 'checkin.different';
			this.#emi = 'flow';
			this.#update(this.#card('checkin.emi', this.#folded(different ? 'Different amount' : 'Paid off in full')));
			this.#ask(different ? 'different' : 'payoff');
		}
	}

	#emiOpen(undoneAt?: Date): CheckInCard {
		const f = emiFigures();
		const pay = inr(f.payment);
		const due = day(f.due);
		const answers = this.admin;
		return this.#card('checkin.emi', {
			chip: 'Check-in',
			right: undoneAt ? 'open again' : 'due today',
			title: `Was November’s EMI of ${pay} paid?`,
			rows: [LOAN, row('Paid saves', `${pay} on ${due}`)],
			...(undoneAt ? { undone: { at: undoneAt.toISOString(), text: REVERSED } } : {}),
			...(answers && !undoneAt ? { hint: 'One tap on Paid saves exactly this, with Undo.' } : {}),
			...(answers
				? {
						actions: [{ id: 'checkin.paid', label: 'Paid', style: 'primary' }],
						options: [
							{ id: 'checkin.not_yet', label: 'Not yet', note: 'I’ll ask again on Mon 9 Nov' },
							{ id: 'checkin.different', label: 'Different amount', note: 'Tell me what was paid' },
							{ id: 'checkin.paid_off', label: 'Paid off in full', note: 'Closes the loan, after a Confirm' }
						]
					}
				: {})
		});
	}

	#emiSaved(at: Date): CheckInCard {
		const f = emiFigures();
		return this.#card('checkin.emi', {
			chip: 'Check-in',
			right: 'answered',
			right_at: at.toISOString(),
			saved: true,
			title: 'Paid · November’s EMI',
			rows: [row('Paid', `${inr(f.payment)} on ${day(f.due)}`), LOAN, row('Left to pay', inr(f.after))],
			hint: 'Left to pay is the engine’s schedule after this EMI.',
			actions: [UNDO],
			fold: { text: SAVED, at: at.toISOString(), icon: 'saved' }
		});
	}

	#emiNotYet(at: Date): CheckInCard {
		const f = emiFigures();
		return this.#card('checkin.emi', {
			chip: 'Check-in',
			right: 'answered',
			right_at: at.toISOString(),
			title: 'Not yet · November’s EMI',
			text: 'I’ll ask again on Mon 9 Nov. If it’s still open then, it shows as overdue on Home.',
			rows: [LOAN, row('Due', `${day(f.due)} · ${inr(f.payment)}`)],
			fold: { text: 'Noted · nothing saved to the loan', at: at.toISOString(), icon: 'noted' }
		});
	}

	#folded(answer: string): CheckInBody {
		return { over: 'Check-in · November’s EMI', answers: [row('Answer', answer)] };
	}

	/* ---------- the short flows: Different amount, Paid off in full ---------- */

	#ask(kind: Flow['kind']): void {
		const f = emiFigures();
		const question = `checkin.q.${String((this.#n += 1))}`;
		this.#flow = { kind, question };
		const body: CheckInBody =
			kind === 'different'
				? {
						over: 'Different amount · one question',
						cancel: 'Cancel',
						title: `How much went to HDFC on ${day(f.due)}?`,
						text: `More than ${inr(f.payment)}: I’ll ask whether the extra shortens the term or lowers the EMI. Less: the rest stays due.`,
						hint: 'Then a Confirm card shows what will be saved.'
					}
				: {
						over: 'Paid off in full · 1 of 2',
						cancel: 'Cancel',
						title: 'What was the final amount?',
						text: `Use HDFC’s closing figure, or the engine’s for ${day(f.due)}.`,
						picks: [
							{ id: 'checkin.engine', label: `${inr(f.payoff)} · the engine’s figure`, style: 'tinted' },
							{ id: 'checkin.type', label: 'Type HDFC’s figure', style: 'plain' }
						],
						hint: 'The engine’s figure: the balance after October’s EMI, with November’s interest.'
					};
		this.#later(`${question}.m`, () => {
			this.#say(`${question}.m`, '', [this.#card(question, body)]);
		});
	}

	#tapQuestion(flow: Flow, action: CardAction): void {
		if (action === 'checkin.cancel') this.#cancel(flow);
		else if (action === 'checkin.engine' && flow.kind === 'payoff' && !flow.confirm) {
			this.#answered(flow, emiFigures().payoff);
		}
	}

	/** The amount folds into its line, and the Confirm card shows exactly what will be saved. */
	#answered(flow: Flow, amount: number): void {
		const f = emiFigures();
		const confirm = `checkin.c.${String((this.#n += 1))}`;
		flow.confirm = confirm;
		flow.amount = amount;
		const paidOn = row('Paid on', day(f.due));
		this.#update(
			this.#card(
				flow.question,
				flow.kind === 'payoff'
					? { over: 'Paid off in full', answers: [row('Final amount', inr(amount)), paidOn] }
					: { over: 'Different amount', answers: [row('Amount paid', inr(amount)), paidOn] }
			)
		);
		this.#later(`${confirm}.m`, () => {
			this.#say(`${confirm}.m`, '', [this.#confirmCard(flow, 'open')]);
		});
	}

	#confirmCard(flow: Flow, state: ConfirmCard['body']['state']): ConfirmCard {
		const f = emiFigures();
		const amount = inr(flow.amount ?? 0);
		const open = state === 'open';
		const saved = state === 'saved';
		const payoff = flow.kind === 'payoff';
		const rows = payoff
			? saved
				? [row('Paid off', `${amount}, ${day(f.due)}`), row('Its check-ins', 'ended')]
				: [
						row('Final payment', amount),
						row('Paid on', day(f.due)),
						row('The loan', 'closes; kept in the history'),
						row('Its check-ins', 'end with this one'),
						row('Then', 'the projection runs again')
					]
			: [row('Paid', `${amount} on ${day(f.due)}`), LOAN, row('Left to pay', inr(leftAfter(flow.amount ?? 0)))];
		const title = payoff
			? saved
				? 'HDFC home loan · closed'
				: 'HDFC home loan, paid off in full'
			: 'HDFC home loan · November’s EMI';
		const over = payoff
			? saved
				? 'Loan closed · saved'
				: 'Close the loan · check it'
			: `Different amount · ${open ? 'check it' : saved ? 'saved' : 'not saved'}`;
		return {
			type: 'confirm',
			version: CARD_SCHEMA_VERSION,
			id: flow.confirm ?? '',
			fallback: `${title}: ${amount}. ${open ? 'Confirm?' : saved ? 'Saved.' : 'Not saved.'}`,
			body: {
				over,
				title,
				rows,
				state,
				...(open ? { hint: 'Nothing is saved until you tap Confirm.' } : {}),
				...(saved ? { saved_at: this.#now().toISOString() } : {})
			}
		};
	}

	#tapConfirm(flow: Flow, action: CardAction): void {
		const now = this.#now();
		if (action === 'confirm') {
			this.#flow = undefined;
			if (flow.kind === 'payoff') {
				payOff(this.household, now);
				this.#emi = 'closed';
			} else {
				payEmi(this.household, flow.amount ?? 0, now);
				this.#emi = 'answered';
			}
			this.#emit('card', { card: this.#confirmCard(flow, 'saved') });
			this.#changed(flow.kind === 'payoff' ? 'closed' : 'paid');
			if (flow.kind === 'payoff') {
				const said = `${flow.confirm ?? ''}.said`;
				this.#later(said, () => {
					this.#say(said, PAID_OFF_SAID, [], PAID_OFF_META);
				});
			}
		} else if (action === 'edit') {
			// Edit reopens the question it changes: the amount.
			this.#emit('card', { card: this.#confirmCard(flow, 'cancelled') });
			this.#ask(flow.kind);
		} else {
			this.#emit('card', { card: this.#confirmCard(flow, 'cancelled') });
			this.#cancel(flow);
		}
	}

	/** Cancel leaves nothing saved, and the check-in is open again. */
	#cancel(flow: Flow): void {
		this.#flow = undefined;
		this.#emi = 'open';
		if (!flow.confirm) {
			this.#update(
				this.#card(flow.question, {
					over: flow.kind === 'payoff' ? 'Paid off in full · 1 of 2' : 'Different amount · one question',
					title: 'Cancelled · nothing was saved'
				})
			);
		}
		this.#update(this.#emiOpen());
	}

	/* ---------- the card bill (iPhone v4 · Check-ins, K6) ---------- */

	#cardOpen(undoneAt?: Date): CheckInCard {
		const c = cardBillFigures();
		const bill = gbp(c.bill);
		return this.#card('checkin.card', {
			chip: 'Check-in',
			right: undoneAt ? 'open again' : 'due today',
			title: `Was the ${bill} Barclaycard bill paid in full?`,
			rows: [
				row('Statement', day(c.statement)),
				row('Minimum', gbp(c.minimum)),
				row('Paid in full saves', `${bill} on ${day(c.due)}`)
			],
			...(undoneAt ? { undone: { at: undoneAt.toISOString(), text: REVERSED } } : {}),
			...(undoneAt
				? {}
				: { hint: 'A payment to the card is a transfer, not spending; the spending was the statement’s lines.' }),
			actions: [{ id: 'checkin.paid', label: 'Paid in full', style: 'primary' }],
			options: [
				{
					id: 'checkin.minimum',
					label: `The minimum, ${gbp(c.minimum)}`,
					note: `${gbp(c.bill - c.minimum)} carries over; its interest counts as spending`
				},
				{ id: 'checkin.part', label: 'Part of it', note: 'Tell me how much' },
				{ id: 'checkin.not_yet', label: 'Not yet', note: 'I’ll ask again on Mon 23 Nov' }
			]
		});
	}

	#tapCard(action: CardAction): void {
		const c = cardBillFigures();
		const now = this.#now();
		const at = now.toISOString();
		if (action === 'checkin.paid' && this.#bill === 'open') {
			payCardBill(this.household, now);
			this.#bill = 'paid';
			this.#update(
				this.#card('checkin.card', {
					chip: 'Check-in',
					right: 'answered',
					right_at: at,
					saved: true,
					title: 'Paid in full · the Barclaycard bill',
					rows: [row('Paid', `${gbp(c.bill)} on ${day(c.due)}`), row('Statement', day(c.statement))],
					actions: [UNDO],
					fold: { text: SAVED, at, icon: 'saved' }
				})
			);
			this.#changed('paid', 'card');
		} else if (action === 'checkin.undo' && this.#bill === 'paid') {
			undoCardBill(this.household, now);
			this.#bill = 'open';
			this.#update(this.#cardOpen(now));
			this.#changed('undone', 'card');
		} else if (action === 'checkin.not_yet' && this.#bill === 'open') {
			notYet(this.household, CARD_NOV, now);
			this.#bill = 'answered';
			this.#update(
				this.#card('checkin.card', {
					chip: 'Check-in',
					right: 'answered',
					right_at: at,
					title: 'Not yet · the Barclaycard bill',
					text: 'I’ll ask again on Mon 23 Nov.',
					rows: [row('Statement', day(c.statement)), row('Due', `${day(c.due)} · ${gbp(c.bill)}`)],
					fold: { text: 'Noted · nothing saved', at, icon: 'noted' }
				})
			);
			this.#changed('answered', 'card');
		} else if ((action === 'checkin.minimum' || action === 'checkin.part') && this.#bill === 'open') {
			const key = `checkin.reply.${String((this.#n += 1))}`;
			this.#later(key, () => {
				this.#say(key, CARD_FLOW_REPLY, []);
			});
		}
	}

	/* ---------- several due at once (Web v4 · Check-ins, K5) ---------- */

	#items(done: boolean): CheckInItem[] {
		const f = emiFigures();
		const c = cardBillFigures();
		return [
			{
				tile: '₹',
				name: 'HDFC home loan',
				note: done ? 'November’s EMI' : `EMI due ${day(f.due)}`,
				value: inr(f.payment),
				...(done ? { done: true } : { chip: 'Overdue' })
			},
			{
				tile: '£',
				name: 'Barclaycard',
				note: done ? 'The bill in full' : 'The bill in full · due today',
				value: gbp(c.bill),
				...(done ? { done: true } : {})
			}
		];
	}

	#severalOpen(undoneAt?: Date): CheckInCard {
		return this.#card('checkin.several', {
			chip: 'Check-ins',
			right: undoneAt ? 'open again' : '2 due',
			title: 'Two payments to tick off',
			items: this.#items(false),
			...(undoneAt
				? {
						undone: {
							at: undoneAt.toISOString(),
							text: 'Both payments are reversed by new events; every event stays in the audit log.'
						}
					}
				: {}),
			...(this.admin
				? {
						...(undoneAt ? {} : { hint: 'All paid saves both, exactly as shown, each with its audit row.' }),
						actions: [
							{ id: 'checkin.all_paid', label: 'All paid', style: 'primary' },
							{ id: 'checkin.one_by_one', label: 'One by one', style: 'tinted' }
						]
					}
				: {})
		});
	}

	#tapSeveral(action: CardAction): void {
		const now = this.#now();
		const at = now.toISOString();
		if (action === 'checkin.all_paid' && this.#several === 'open') {
			payEmi(this.household, emiFigures().payment, now);
			payCardBill(this.household, now);
			const change = this.household.lastChange;
			if (change) this.household.lastChange = { ...change, line: 'two payments saved in the chat' };
			this.#several = 'paid';
			this.#emi = 'paid';
			this.#bill = 'paid';
			this.#update(
				this.#card('checkin.several', {
					chip: 'Check-ins',
					right: 'answered',
					right_at: at,
					saved: true,
					title: 'Both paid',
					items: this.#items(true),
					actions: [{ id: 'checkin.undo', label: 'Undo both', style: 'tinted', icon: 'undo' }],
					fold: { text: SAVED, at, icon: 'saved' }
				})
			);
			this.#changed('paid');
		} else if (action === 'checkin.undo' && this.#several === 'paid') {
			undoEmi(this.household, now);
			undoCardBill(this.household, now);
			this.#several = 'open';
			this.#emi = 'open';
			this.#bill = 'open';
			this.#update(this.#severalOpen(now));
			this.#changed('undone');
		} else if (action === 'checkin.one_by_one' && this.#several === 'open') {
			// One by one opens each row's own card, with its Something else; the shared card keeps its rows.
			this.#several = 'split';
			const { actions: _a, hint: _h, ...rest } = this.#severalOpen().body;
			this.#update(this.#card('checkin.several', rest));
			const key = 'checkin.split.m';
			this.#later(key, () => {
				this.#say(key, '', [this.#emiOpen(), this.#cardOpen()]);
			});
		}
	}

	/* ---------- frames ---------- */

	#card(id: string, body: CheckInBody): CheckInCard {
		const words = [body.over, body.title, ...(body.items ?? []).map((i) => `${i.name} ${i.value}`)];
		return {
			type: 'checkin',
			version: CARD_SCHEMA_VERSION,
			id,
			fallback: words.filter(Boolean).join(' · '),
			body
		};
	}

	#update(card: CheckInCard): void {
		this.#emit('card', { card });
	}

	#say(id: string, text: string, cards: unknown[], meta?: string): void {
		this.#emit('message', {
			id,
			role: 'agent',
			text,
			cards,
			at: this.#now().toISOString(),
			...(meta ? { meta } : {})
		});
	}

	/** As the api does after a write (ARCHITECTURE §19.5): every open door reads again. */
	#changed(reason: string, record = 'hdfc'): void {
		this.#emit('records.changed', { record_id: record, reason });
	}

	#later(key: string, fn: () => void): void {
		this.#port?.after(key, fn);
	}

	#emit(event: string, data: Record<string, unknown>): void {
		this.#port?.emit(event, data);
	}

	#now(): Date {
		return this.#port?.now() ?? new Date();
	}
}
