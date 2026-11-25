/** The check-ins the stub household answers (MA-205; boards Web v4 · Check-ins and iPhone v4 · Check-ins): November's
 * HDFC EMI and the Barclaycard bill from the Sun 1 Nov statement, with their figures from the design figure set
 * (`household.json`: the loan's balance, rate and EMI, the balance after November's EMI, the statement's bill), and
 * what an answer does to the household, as the write service would: a payment lowers the loan's balance by the
 * engine's method (monthly interest on the balance), Undo puts it back, a payoff closes the loan and keeps it in the
 * history. The daily worker that asks them (MA-205's backend half) replaces the scripted arrival; nothing here is the
 * product's engine. */
import figures from './household.json';
import { dayLabel } from './dates.ts';
import type { StubDebt, StubHousehold } from './household.ts';

interface CheckInSet {
	debts: { id: string; balance: number; payment?: number; rate?: number; balance_after_nov_emi?: number }[];
	statements_oct: { barclaycard_nov: { statement: string; due: string; balance: number; minimum: number } };
	check_ins: { when: string; record?: string }[];
}

const SET = figures as unknown as CheckInSet;

/** The ids the answers are kept under. */
export const EMI_NOV = 'hdfc:2026-11';
export const CARD_NOV = 'card:2026-11';

/** Two places, as the engine's schedule keeps money. */
export const cents = (n: number): number => Math.round(n * 100) / 100;

export interface EmiFigures {
	/** The day the EMI is due, the check-in's day. */
	due: string;
	/** The next EMI's day, a month on. */
	next: string;
	payment: number;
	/** The balance before November's EMI, after October's. */
	before: number;
	/** November's interest on that balance. */
	interest: number;
	/** The balance after November's EMI, as the figure set holds it. */
	after: number;
	/** What clears the loan on the due day: the balance with November's interest, the engine's figure. */
	payoff: number;
}

function hdfcSet() {
	const debt = SET.debts.find((d) => d.id === 'hdfc');
	const when = SET.check_ins.find((c) => c.record === 'hdfc')?.when;
	if (!debt?.payment || debt.rate === undefined || debt.balance_after_nov_emi === undefined || !when) {
		throw new Error('the figure set has no HDFC EMI check-in');
	}
	return { ...debt, payment: debt.payment, rate: debt.rate, after: debt.balance_after_nov_emi, when };
}

export function emiFigures(): EmiFigures {
	const d = hdfcSet();
	const due = d.when.slice(0, 10);
	const [y = 0, m = 1, day = 1] = due.split('-').map(Number);
	const next = new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);
	const interest = cents((d.balance * d.rate) / 12);
	return {
		due,
		next,
		payment: d.payment,
		before: d.balance,
		interest,
		after: d.after,
		payoff: cents(d.balance + interest)
	};
}

export interface CardBillFigures {
	statement: string;
	due: string;
	bill: number;
	minimum: number;
}

export function cardBillFigures(): CardBillFigures {
	const s = SET.statements_oct.barclaycard_nov;
	return { statement: s.statement, due: s.due, bill: s.balance, minimum: s.minimum };
}

/** What is left after paying `paid` on the due day: the balance with the month's interest, less the payment. The EMI
 * itself leaves exactly the figure set's balance. */
export function leftAfter(paid: number): number {
	const f = emiFigures();
	return paid === f.payment ? f.after : Math.max(0, cents(f.before + f.interest - paid));
}

const hdfc = (h: StubHousehold): StubDebt | undefined => h.debts.find((d) => d.id === 'hdfc');

/** Paid, or a different amount: the payment lowers the loan's balance and the check-in is answered. */
export function payEmi(h: StubHousehold, paid: number, at: Date): void {
	const debt = hdfc(h);
	if (!debt) return;
	h.setDebt(
		{ ...debt, balance: leftAfter(paid) },
		{
			recordId: 'hdfc',
			at,
			how: 'paid in the chat',
			before: debt.balance,
			line: 'November’s HDFC EMI, paid in the chat'
		}
	);
	h.answer(EMI_NOV, { answer: 'paid', at });
}

/** Undo writes a reversal, never a delete: the balance is as it was and the check-in is open again. */
export function undoEmi(h: StubHousehold, at: Date): void {
	const debt = hdfc(h);
	if (!debt) return;
	h.setDebt(
		{ ...debt, balance: emiFigures().before },
		{ recordId: 'hdfc', at, how: 'undone', line: 'November’s HDFC EMI undone: open again' }
	);
	h.answer(EMI_NOV, { answer: 'undone', at });
}

/** Not yet saves nothing to the loan; the answer is kept so the check-in asks again. */
export function notYet(h: StubHousehold, id: string, at: Date): void {
	h.answer(id, { answer: 'not_yet', at });
}

/** Paid off in full, after its Confirm: the loan closes, kept in the history, and its check-ins end. */
export function payOff(h: StubHousehold, at: Date): void {
	const debt = hdfc(h);
	if (!debt) return;
	h.closeDebt('hdfc', {
		recordId: 'hdfc',
		at,
		how: 'paid off in full',
		before: debt.balance,
		line: 'the HDFC home loan is closed'
	});
	h.answer(EMI_NOV, { answer: 'paid_off', at });
}

/** The card bill paid in full: a transfer, not spending. The stub's card has no balance before the Sun 1 Nov
 * statement, so no total moves; the check-in is answered and leaves what is due. */
export function payCardBill(h: StubHousehold, at: Date): void {
	h.answer(CARD_NOV, { answer: 'paid', at });
}

export function undoCardBill(h: StubHousehold, at: Date): void {
	h.answer(CARD_NOV, { answer: 'undone', at });
}

/** "Thu 5 Nov", as the cards write a day. */
export const day = (iso: string): string => dayLabel(iso);
