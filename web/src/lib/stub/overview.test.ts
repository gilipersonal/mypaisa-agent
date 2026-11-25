import { describe, expect, it } from 'vitest';
import { timeOf } from '#lib/chat/days.ts';
import type { Part, WealthCard } from '#lib/wealth/overview.ts';
import { StubHousehold, type StubAsset } from './household.ts';
import { buildOverview } from './overview.ts';
import { monzoSavings } from './records.ts';
import { HOUSEHOLD } from './sums.ts';

const AT = new Date('2026-10-26T09:41:00');

function after(): StubHousehold {
	const h = new StubHousehold();
	h.add(monzoSavings('5000', 'arun'), AT, 'added in the chat');
	return h;
}

function card(h: StubHousehold, id: string, view = HOUSEHOLD, currency: 'GBP' | 'INR' = 'GBP'): WealthCard {
	const found = buildOverview(h, view, currency)
		.rows.flatMap((r) => r.columns.flat())
		.find((c) => c.id === id);
	if (!found) throw new Error(`no card ${id}`);
	return found;
}

function part<K extends Part['kind']>(c: WealthCard, kind: K): Extract<Part, { kind: K }> {
	const found = c.parts.find((p): p is Extract<Part, { kind: K }> => p.kind === kind);
	if (!found) throw new Error(`no ${kind} in ${c.id}`);
	return found;
}

describe('the Overview before the first record', () => {
	const o = buildOverview(new StubHousehold(), HOUSEHOLD, 'GBP');

	it('says whose it is, and offers Household, Me and Asha', () => {
		expect(o.head).toBe('Household · Mon 26 Oct · Illustrative figures');
		expect(o.views.map((v) => v.label)).toEqual(['Household', 'Me', 'Asha']);
		expect(o.empty).toBe(false);
	});

	it('shows £439,951 across 20 records, with the rate and its day', () => {
		expect(o.hero.over).toBe('Net worth · Mon 26 Oct');
		expect(o.hero.net).toEqual({ amount: '439951', currency: 'GBP' });
		expect(o.hero.line).toBe('Across 20 records in the UK and India');
		expect(o.hero.delta).toBeUndefined();
		expect(o.hero.rate).toBe('£1 = ₹112.50 · ECB reference rate, Fri 23 Oct · prices at the Fri 23 Oct close');
	});

	it('lays the cards out with the two chart cards first, then two columns balanced by height (MA-359)', () => {
		expect(o.rows.map((r) => r.columns.map((col) => col.map((c) => c.id)))).toEqual([
			[['own-owe']],
			[['invested-owed']],
			[
				['by-country', 'by-member', 'runoff'],
				['liquidity', 'due']
			],
			[['maturing'], ['largest']]
		]);
	});
});

describe('the Overview after the Monzo savings', () => {
	const h = after();
	const o = buildOverview(h, HOUSEHOLD, 'GBP');

	it('moves the hero by £5,000 and says what did it', () => {
		expect(o.hero.net?.amount).toBe('444951');
		expect(o.hero.delta).toEqual({ amount: '5000', currency: 'GBP', pre: '▲ ' });
		expect(o.hero.rollFrom).toBe('439951');
		expect(o.hero.changedAt).toBe(AT.toISOString());
		expect(o.hero.line).toBe(`at ${timeOf(AT)} · Instant access savings · Monzo, added in the chat`);
	});

	it('hands own and owe and invested against owed to their own cards, for the view and currency', () => {
		expect(card(h, 'own-owe')).toMatchObject({
			title: 'What we own and owe',
			parts: [{ kind: 'ownowe', view: HOUSEHOLD, currency: 'GBP' }]
		});
		expect(card(h, 'invested-owed', 'asha', 'INR')).toMatchObject({
			title: 'Invested against owed',
			parts: [{ kind: 'investedowed', view: 'asha', currency: 'INR' }]
		});
		expect(buildOverview(h, 'nobody', 'GBP').rows[0]?.columns[0]?.[0]?.parts[0]).toMatchObject({ view: HOUSEHOLD });
		// The meters card it supersedes is gone: no meter says what we own or owe.
		const meters = o.rows
			.flatMap((r) => r.columns.flat())
			.flatMap((c) => c.parts)
			.flatMap((p) => (p.kind === 'meters' ? p.items.map((m) => m.label) : []));
		expect(meters).not.toContain('We own');
		expect(meters).not.toContain('We owe');
	});

	it('by country: the UK in pounds, India with its rupees beside it', () => {
		const [uk, india] = part(card(h, 'by-country'), 'meters').items;
		expect(uk).toMatchObject({ fig: { amount: '338468' }, note: '76% · 10 assets, 3 debts, held in pounds' });
		expect(india).toMatchObject({
			fig: { amount: '106483' },
			note: '24% · 7 assets, 1 loan, held in rupees:',
			noteFig: { amount: '11979306', currency: 'INR' }
		});
	});

	it('by member: Arun £250,868 and Asha £194,083, joint records by share', () => {
		const c = card(h, 'by-member');
		expect(part(c, 'meters').items.map((m) => [m.label, m.fig.amount, m.note])).toEqual([
			['Arun', '250868', '56% · his own records and his half of the joint ones'],
			['Asha', '194083', '44% · her own records and her half of the joint ones']
		]);
		expect(part(c, 'text').text).toContain('50% each');
	});

	it('liquid and locked: £37,596 + £23,670 + £630,428, 91% locked', () => {
		const c = card(h, 'liquidity');
		expect(c.aside).toBe('91% is locked');
		const stack = part(c, 'stack');
		expect(stack.items.map((s) => s.fig.amount)).toEqual(['37596', '23670', '630428']);
		expect(stack.items[0]?.note).toBe('9 records: cash, savings, funds and shares');
		expect(stack.items[1]).toMatchObject({
			note: '4 pay out at maturity; next the saver,',
			noteFig: { amount: '10460', currency: 'GBP' },
			noteAfter: 'on Mon 14 Dec'
		});
		expect(stack.items[2]?.note).toBe('two homes, and two pensions that unlock at 57');
		expect(stack.aria).toBe('Liquid now 5.4%, fixed term 3.4%, locked 91.1% of what we own');
	});

	it('what is due: two valuations today, then November in date order', () => {
		const items = part(card(h, 'due'), 'due').items;
		expect(items.map((d) => `${d.weekday} ${d.day} ${d.month} · ${d.title} · ${d.chip.text}`)).toEqual([
			'Today 26 Oct · Valuation due: Home, Reading · Asks you',
			'Today 26 Oct · Valuation overdue: Flat, Pune · Asks you',
			'Sun 1 Nov · Mortgage · Nationwide · Autopay',
			"Sun 1 Nov · Close October's budget · Asks you",
			'Thu 5 Nov · Home loan EMI · HDFC · Asks you',
			'Tue 10 Nov · SIP · Parag Parikh · Asks you',
			'Fri 20 Nov · Car loan · Close Brothers · Autopay'
		]);
		expect(items[1]).toMatchObject({ note: 'Due since 15 Jul. Asks: still about', noteFig: { amount: '11000000' } });
		expect(items[2]?.fig).toEqual({ amount: '1456', currency: 'GBP' });
		expect(items[4]?.fig).toEqual({ amount: '39390', currency: 'INR' });
		expect(items.every((d) => !('owners' in d))).toBe(true);
	});

	it('the run-off: each loan to the day it ends, the mortgage the whole axis', () => {
		const c = card(h, 'runoff');
		expect(c.asideFig).toEqual({ amount: '246743', currency: 'GBP' });
		const r = part(c, 'runoff');
		expect(r.items.map((i) => [i.name, i.fig.amount, i.ends])).toEqual([
			['Car loan · Close Brothers', '8939', 'paid off Tue 20 Feb 2029'],
			['Home loan · HDFC, the Pune flat', '1513257', 'paid off Fri 5 Jul 2030'],
			['Mortgage · Nationwide', '224353', 'paid off Sun 1 Oct 2045']
		]);
		expect(r.items[0]).toMatchObject({ note: 'UK · Arun ·', noteFig: { amount: '347', post: ' a month' } });
		expect(r.items[2]?.note).toBe('UK · joint 50% each · fixed 4.39% to 30 Jun 2028 ·');
		expect(r.items[0]?.share).toBeCloseTo(28 / 228);
		expect(r.items[0]?.aria).toBe('Car loan, 28 months left');
		expect(r.axis.map((a) => a.label)).toEqual(['Now', '2030', '2035', '2040', 'Oct 2045']);
		expect(r.axis[1]?.at).toBeCloseTo(39 / 228);
		expect(part(c, 'text')).toMatchObject({ text: "Barclaycard: nothing owed; October's", fig: { amount: '1240' } });
	});

	it('maturing next: the saver, the FD, the policy and the PPF', () => {
		const items = part(card(h, 'maturing'), 'due').items;
		expect(items.map((d) => [d.weekday, d.day, d.month, d.year, d.chip.text])).toEqual([
			['Mon', '14', 'Dec', '2026', 'Asks you'],
			['Sat', '10', 'Mar', '2029', 'Asks you'],
			['Fri', '28', 'Mar', '2031', 'Policy'],
			['Mon', '31', 'Mar', '2031', 'PPF']
		]);
		expect(items[0]).toMatchObject({ note: 'UK · Asha · 4.6% · now', fig: { amount: '10460' } });
		expect(items[2]).toMatchObject({ note: 'India · Asha · sum assured', noteFig: { amount: '1000000' } });
		expect(items[3]?.fig).toBeUndefined();
	});

	it('the largest assets: five rows in their own currency, and the other twelve', () => {
		const c = card(h, 'largest');
		const rows = part(c, 'rows').items;
		expect(rows.map((r) => [r.lead, r.name, r.note, r.fig.amount])).toEqual([
			['HM', 'Home, Reading', 'valued 30 Apr', '415000'],
			['FP', 'Flat, Pune', 'valued 15 Jan · overdue', '11000000'],
			['AV', 'Workplace pension · Aviva', 'Arun · unlocks at 57', '86400'],
			['VG', 'SIPP · Vanguard', 'Asha · unlocks at 57', '31250'],
			['BA', 'Balanced (BlackRock MyMap 5)', 'Arun · ISA · Monzo', '22925']
		]);
		expect(rows[0]).toMatchObject({ place: 'UK · £', joint: 'Arun 50% · Asha 50%' });
		expect(rows[1]?.alt).toEqual({ amount: '97778', currency: 'GBP', pre: '≈ ' });
		expect(rows[2]?.joint).toBeUndefined();
		expect(part(c, 'text')).toMatchObject({ text: '12 more records,', fig: { amount: '38341' }, after: 'in all.' });
		expect(part(c, 'link').href).toBe('/assets');
	});
});

describe('the Overview in rupees', () => {
	const h = after();
	const o = buildOverview(h, HOUSEHOLD, 'INR');

	it('shows every total in rupees, each split still adding up', () => {
		expect(o.hero.net).toEqual({ amount: '50056988', currency: 'INR' });
		expect(o.hero.delta).toEqual({ amount: '562500', currency: 'INR', pre: '▲ ' });
		expect(o.hero.line).toContain('about ₹5.01 crore in all');
		const country = card(h, 'by-country', HOUSEHOLD, 'INR');
		expect(country.aside).toBe('in rupees');
		const [uk, india] = part(country, 'meters').items;
		expect([uk?.fig.amount, india?.fig.amount]).toEqual(['38077682', '11979306']);
		expect(india?.noteFig).toBeUndefined();
		expect(india?.note).toBe('24% · 7 assets, 1 loan, held in rupees');
		expect(part(card(h, 'by-member', HOUSEHOLD, 'INR'), 'meters').items.map((m) => m.fig.amount)).toEqual([
			'28222650',
			'21834338'
		]);
		expect(part(card(h, 'liquidity', HOUSEHOLD, 'INR'), 'stack').items.map((s) => s.fig.amount)).toEqual([
			'4229550',
			'2662875',
			'70923150'
		]);
	});

	it('keeps each record in its own currency, a pound record with its rupees beside it', () => {
		const rows = part(card(h, 'largest', HOUSEHOLD, 'INR'), 'rows').items;
		expect(rows[0]).toMatchObject({ fig: { amount: '415000', currency: 'GBP' }, alt: { amount: '46687500' } });
		expect(rows[1]?.alt).toBeUndefined();
		expect(part(card(h, 'largest', HOUSEHOLD, 'INR'), 'text').fig?.currency).toBe('INR');
	});
});

describe('a member’s own view', () => {
	it('shows Asha her share: no By member card, only her dues, her one debt', () => {
		const h = after();
		const o = buildOverview(h, 'asha', 'GBP');
		expect(o.head).toBe('Asha · Mon 26 Oct · Illustrative figures');
		expect(o.hero.net?.amount).toBe('194083');
		expect(o.hero.delta).toBeUndefined();
		expect(o.hero.line).toBe('Across 9 records in the UK and India');
		expect(o.rows[2]?.columns[0]?.map((c) => c.id)).toEqual(['by-country', 'runoff']);
		expect(part(card(h, 'due', 'asha'), 'due').items.map((d) => d.title)).toEqual([
			'Valuation due: Home, Reading',
			'Valuation overdue: Flat, Pune',
			'Mortgage · Nationwide',
			"Close October's budget",
			'SIP · Parag Parikh'
		]);
		const r = part(card(h, 'runoff', 'asha'), 'runoff');
		expect(r.items.map((i) => i.fig.amount)).toEqual(['112177']);
		expect(card(h, 'runoff', 'asha').asideFig?.amount).toBe('112176');
		expect(part(card(h, 'runoff', 'asha'), 'text').text).toBe('Each loan frees its payment when it ends.');
	});

	it('shows Me the change I made, and falls back to the household for a stranger', () => {
		const h = after();
		expect(buildOverview(h, 'arun', 'GBP').hero.delta?.amount).toBe('5000');
		expect(buildOverview(h, 'arun', 'GBP').head).toMatch(/^Me · /);
		expect(buildOverview(h, 'nobody', 'GBP').view).toBe(HOUSEHOLD);
	});
});

describe('an empty household', () => {
	const o = buildOverview(new StubHousehold({ empty: true }), HOUSEHOLD, 'GBP');

	it('says so in words, never £0, and shows how to begin', () => {
		expect(o.empty).toBe(true);
		expect(o.hero.net).toBeUndefined();
		expect(o.hero.line).toContain('in your own words');
		expect(o.rows.map((r) => r.columns.flat().map((c) => c.id))).toEqual([
			['own-owe'],
			['invested-owed'],
			['say-it', 'start']
		]);
		expect(o.rows.every((r) => r.layout === 'one')).toBe(true);
		const [say, start] = o.rows[2]?.columns[0] ?? [];
		expect(say?.title).toBe('Say it the way you would to a friend');
		expect(start && part(start, 'list').items.map((i) => i.title)).toEqual([
			'A savings account or cash',
			'A property, in the UK or India',
			'A loan, a mortgage or a card',
			'A statement or a screenshot'
		]);
	});
});

describe('records the figure set does not have', () => {
	const odd: StubAsset = {
		id: 'gold',
		kind: 'gold',
		name: '24k gold',
		country: 'IN',
		ccy: 'INR',
		owners: [
			['arun', 50],
			['asha', 50]
		],
		value: 900_000_000,
		liquidity: 'liquid'
	};

	it('still read sensibly: a lead from the name, a joint record with no valuation, a term with no payout', () => {
		const h = new StubHousehold({ empty: true });
		h.add(odd, AT, 'added in the chat');
		h.add(
			{ ...odd, id: 'bond', name: 'RBI bond', matures: '2030-01-01', liquidity: 'locked until 1 Jan 2030' },
			AT,
			'x'
		);
		h.add({ ...odd, id: 'cash', name: 'Cash', owners: [['arun', 100]], value: 100 }, AT, 'x');
		h.lastChange = undefined;
		const rows = part(card(h, 'largest'), 'rows').items;
		expect(rows[0]).toMatchObject({ lead: 'KG', note: 'joint' });
		expect(rows[2]).toMatchObject({ lead: 'CA', note: 'Arun' });
		expect(buildOverview(h, HOUSEHOLD, 'GBP').hero.line).toContain('in India');
		const stack = part(card(h, 'liquidity'), 'stack');
		expect(stack.items[1]?.note).toBe('1 pay out at maturity');
		expect(stack.items[2]?.note).toBe('nothing locked');
		expect(part(card(h, 'maturing'), 'due').items[0]?.chip.text).toBe('GOLD');
		expect(part(card(h, 'runoff'), 'runoff')).toMatchObject({ items: [], axis: [] });
		expect(card(h, 'largest').parts.map((p) => p.kind)).toEqual(['rows', 'link']);
	});

	it('one home and one pension read in the singular; a UK-only household says so', () => {
		const h = new StubHousehold({ empty: true });
		h.add({ ...odd, id: 'h', kind: 'property', country: 'UK', ccy: 'GBP', liquidity: 'locked' }, AT, 'x');
		h.add({ ...odd, id: 'p', country: 'UK', ccy: 'GBP', liquidity: 'locked until 57', unlocks_at: 57 }, AT, 'x');
		h.lastChange = undefined;
		expect(part(card(h, 'liquidity'), 'stack').items[2]?.note).toBe('one home, and one pension that unlocks at 57');
		expect(buildOverview(h, HOUSEHOLD, 'GBP').hero.line).toContain('in the UK');
	});
});
