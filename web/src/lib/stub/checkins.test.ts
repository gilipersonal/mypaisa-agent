import { describe, expect, it } from 'vitest';
import { timeOf } from '#lib/chat/days.ts';
import { formatMoney } from '#lib/formatting/money.ts';
import type { DueItem, Part, WealthCard } from '#lib/wealth/overview.ts';
import {
	CARD_NOV,
	EMI_NOV,
	cardBillFigures,
	emiFigures,
	leftAfter,
	notYet,
	payCardBill,
	payEmi,
	payOff,
	undoCardBill,
	undoEmi
} from './checkins.ts';
import { StubHousehold } from './household.ts';
import { buildOverview } from './overview.ts';
import { HOUSEHOLD } from './sums.ts';

const AT = new Date('2026-11-05T09:12:00');
const inr = (n: number) => formatMoney(String(n), 'INR', { whole: true });

function card(h: StubHousehold, id: string, view = HOUSEHOLD): WealthCard {
	const found = buildOverview(h, view, 'GBP')
		.rows.flatMap((r) => r.columns.flat())
		.find((c) => c.id === id);
	if (!found) throw new Error(`no card ${id}`);
	return found;
}

function dueRows(h: StubHousehold, view = HOUSEHOLD): DueItem[] {
	const part = card(h, 'due', view).parts.find((p): p is Extract<Part, { kind: 'due' }> => p.kind === 'due');
	return part?.items ?? [];
}

const emiRows = (h: StubHousehold) => dueRows(h).filter((r) => r.title === 'Home loan EMI · HDFC');
const hdfc = (h: StubHousehold) => h.debts.find((d) => d.id === 'hdfc');

describe("the check-ins' figures, from the figure set", () => {
	it("November's EMI: ₹39,390 due Thu 5 Nov, ₹15,13,257 before it, ₹14,84,587 after, ₹15,23,976 to pay it off", () => {
		const f = emiFigures();
		expect(f.due).toBe('2026-11-05');
		expect(f.next).toBe('2026-12-05');
		expect(inr(f.payment)).toBe('₹39,390');
		expect(inr(f.before)).toBe('₹15,13,257');
		expect(f.interest).toBe(10718.91);
		expect(inr(f.after)).toBe('₹14,84,587');
		expect(inr(f.payoff)).toBe('₹15,23,976');
	});

	it('the engine leaves exactly the figure set’s balance after the EMI, and works out any other amount', () => {
		const f = emiFigures();
		expect(leftAfter(f.payment)).toBe(f.after);
		expect(leftAfter(30000)).toBe(1493976.31);
		expect(leftAfter(9_000_000)).toBe(0);
	});

	it('the Barclaycard bill: £1,458 from the Sun 1 Nov statement, due Fri 20 Nov, minimum £25', () => {
		expect(cardBillFigures()).toEqual({ statement: '2026-11-01', due: '2026-11-20', bill: 1458, minimum: 25 });
	});
});

describe('an answer moves the household, as the write service would', () => {
	it('Paid lowers the loan to the engine’s balance; Home ticks the row to Done and asks December’s', () => {
		const h = new StubHousehold();
		payEmi(h, emiFigures().payment, AT);
		expect(hdfc(h)?.balance).toBe(1484586.73);
		expect(h.answerOf(EMI_NOV)).toEqual({ answer: 'paid', at: AT });
		const [nov, dec] = emiRows(h);
		expect(nov).toMatchObject({
			note: `Paid ${timeOf(AT)} · left to pay`,
			noteFig: { amount: '1484587', currency: 'INR' },
			chip: { tone: 'add', text: 'Done' },
			done: true
		});
		expect(dec).toMatchObject({ weekday: 'Sat', day: '5', month: 'Dec', note: 'India · Arun · December’s' });
		expect(dec?.chip.text).toBe('Asks you');
	});

	it('Paid moves the hero by what the shown total moved, with the board’s words', () => {
		const h = new StubHousehold();
		const before = buildOverview(h, HOUSEHOLD, 'GBP').hero.net?.amount;
		payEmi(h, emiFigures().payment, AT);
		const hero = buildOverview(h, HOUSEHOLD, 'GBP').hero;
		expect(Number(hero.net?.amount) - Number(before)).toBe(254);
		expect(hero.delta).toEqual({ amount: '254', currency: 'GBP', pre: '▲ ' });
		expect(hero.rollFrom).toBe(before);
		expect(hero.line).toBe(`at ${timeOf(AT)} · November’s HDFC EMI, paid in the chat`);
		// India moves as the board draws it: ₹1,19,79,306 → ₹1,20,07,976.
		const country = card(h, 'by-country').parts[0];
		expect(country?.kind === 'meters' && country.items[1]?.noteFig?.amount).toBe('12007976');
		// Asha's own view does not move: the loan is Arun's.
		expect(buildOverview(h, 'asha', 'GBP').hero.delta).toBeUndefined();
	});

	it('Undo puts the balance back and says so with no figure; the row is open again', () => {
		const h = new StubHousehold();
		payEmi(h, emiFigures().payment, AT);
		undoEmi(h, AT);
		expect(hdfc(h)?.balance).toBe(1513257.4);
		const hero = buildOverview(h, HOUSEHOLD, 'GBP').hero;
		expect(hero.delta).toBeUndefined();
		expect(hero.line).toBe(`at ${timeOf(AT)} · November’s HDFC EMI undone: open again`);
		expect(emiRows(h)).toHaveLength(1);
		expect(emiRows(h)[0]).toMatchObject({
			note: 'Open again after Undo · left to pay',
			noteFig: { amount: '1513257' },
			chip: { text: 'Asks you' }
		});
	});

	it('Not yet saves nothing to the loan', () => {
		const h = new StubHousehold();
		notYet(h, EMI_NOV, AT);
		expect(hdfc(h)?.balance).toBe(1513257.4);
		expect(h.lastChange).toBeUndefined();
		expect(emiRows(h)[0]).toMatchObject({ note: 'India · Arun', chip: { text: 'Asks you' } });
	});

	it('Paid off in full closes the loan, keeps it in the history and ends its check-ins', () => {
		const h = new StubHousehold();
		payOff(h, AT);
		expect(hdfc(h)).toBeUndefined();
		expect(h.closed.map((d) => d.id)).toEqual(['hdfc']);
		expect(emiRows(h)).toHaveLength(0);
		const hero = buildOverview(h, HOUSEHOLD, 'GBP').hero;
		expect(hero.line).toBe(`at ${timeOf(AT)} · the HDFC home loan is closed`);
		expect(hero.delta?.amount).toBe('13451');
		payOff(h, AT); // a second payoff finds no loan
		expect(h.closed).toHaveLength(1);
	});

	it('the card bill paid leaves what is due, and Undo brings it back', () => {
		const h = new StubHousehold();
		const text = () => {
			const found = card(h, 'due').parts.find((p) => p.kind === 'text');
			return found?.kind === 'text' ? found.text : '';
		};
		expect(text()).toContain('Also Fri 20 Nov: the Barclaycard bill');
		payCardBill(h, AT);
		expect(h.answerOf(CARD_NOV)?.answer).toBe('paid');
		expect(text()).toBe('Each check-in arrives in the chat; one tap records it.');
		undoCardBill(h, AT);
		expect(text()).toContain('Also Fri 20 Nov');
	});

	it('an answer on an empty household finds no loan and changes nothing', () => {
		const h = new StubHousehold({ empty: true });
		payEmi(h, 39389.58, AT);
		undoEmi(h, AT);
		payOff(h, AT);
		expect(h.lastChange).toBeUndefined();
		h.answer(EMI_NOV, undefined);
		expect(h.answerOf(EMI_NOV)).toBeUndefined();
	});

	it('a change with words but no debt behind it is told as before', () => {
		const h = new StubHousehold();
		h.setDebt({ ...(hdfc(h) ?? ({} as never)) }, { recordId: 'nothing', at: AT, how: 'x', line: 'x' });
		expect(buildOverview(h, HOUSEHOLD, 'GBP').hero.line).toBe('Across 20 records in the UK and India');
	});
});
