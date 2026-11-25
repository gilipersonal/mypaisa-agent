/** The Overview from the stub household (board Web v4 · Dashboard, 1a Net worth first, with Web v4 · Home charts in place
 * of its own and owe meters, MA-359): the hero, then what we own and owe as a double ring and invested against owed,
 * then each country, each member, liquid and locked and what is due; below, how the debts run off, what matures next and the
 * largest assets. The sums are `sums.ts`'s; the words are the board's. The api's overview (MA-208's backend half)
 * replaces this, and the page does not change. */
import { timeOf } from '#lib/chat/days.ts';
import type { Decimal } from '#lib/formatting/money.ts';
import type {
	AxisTick,
	CardRow,
	DisplayCurrency,
	DueItem,
	Fig,
	Hero,
	Meter,
	Overview,
	RecordRow,
	RunoffItem,
	WealthCard
} from '#lib/wealth/overview.ts';
import { dayLabel, dayParts, monthsBetween, shortDay } from './dates.ts';
import type { Change, RecordCurrency, Share, StubAsset, StubDebt, StubHousehold } from './household.ts';
import { HOUSEHOLD, liquidityOf, toGbp, totals, weight, type Totals, type View } from './sums.ts';
import { CARD_NOV, EMI_NOV, emiFigures } from './checkins.ts';

const RATE_DAY = 'Fri 23 Oct';
const FOOT = 'Illustrative figures. Figures from the engine and the price registry; nothing here can trade.';
const COUNTRY = { UK: 'UK', IN: 'India' } as const;
const SYMBOL = { GBP: '£', INR: '₹' } as const;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** The two letters a record goes by until it has an icon (MA-241), as the board writes them. */
const LEADS: Record<string, string> = {
	home: 'HM',
	pune: 'FP',
	pension_arun: 'AV',
	sipp_asha: 'VG',
	balanced: 'BA',
	monzo_savings: 'MZ'
};
/** The board's own words for each member's share, and for the joint records. */
const SHARE_LINE: Record<string, string> = {
	arun: 'his own records and his half of the joint ones',
	asha: 'her own records and her half of the joint ones'
};
const JOINT_LINE = 'Joint: Home, Reading, the Pune flat, the mortgage and the Monzo pot, 50% each.';
const SHORT_NAME: Record<string, string> = { saver: 'the saver', sbi_fd: 'the SBI deposit' };

const whole = (n: number): Decimal => String(Math.round(n));
const money = (n: number, currency: RecordCurrency, pre?: string, post?: string): Fig => ({
	amount: whole(n),
	currency,
	...(pre ? { pre } : {}),
	...(post ? { post } : {})
});
const percent = (a: number, b: number) => (b === 0 ? '0%' : `${String(Math.round((a / b) * 100))}%`);
const share = (a: number, b: number) => (b === 0 ? 0 : Math.min(1, Math.max(0, a / b)));
const plural = (n: number, one: string, many = `${one}s`) => `${String(n)} ${n === 1 ? one : many}`;
const word = (n: number) => WORDS[n] ?? String(n);
const rate = (r: number) => `${String(Number((r * 100).toFixed(2)))}%`;

function ownerNames(h: StubHousehold, owners: readonly Share[]): string {
	return owners.map(([id]) => h.member(id)?.name ?? id).join(' and ');
}

function jointLine(h: StubHousehold, owners: readonly Share[]): string | undefined {
	if (owners.length < 2) return undefined;
	return owners.map(([id, pc]) => `${h.member(id)?.name ?? id} ${String(pc)}%`).join(' · ');
}

/** The totals in the currency the member reads them in. In rupees, India is its own rupee sum and the last part of
 * every split is the rest, so each split still adds up (the board's own rule). */
function inDisplay(t: Totals, currency: DisplayCurrency, fx: number) {
	if (currency === 'GBP') {
		return {
			...t,
			members: t.members.map((m) => m.net)
		};
	}
	const x = (n: number) => Math.round(n * fx);
	const net = x(t.net);
	const own = x(t.own);
	const liquid = x(t.liquid);
	const fixed = x(t.fixed);
	const first = t.members.slice(0, -1).map((m) => x(m.net));
	const members = t.members.length > 0 ? [...first, net - first.reduce((a, b) => a + b, 0)] : [];
	return {
		...t,
		net,
		own,
		owe: own - net,
		ind: t.indInr,
		uk: net - t.indInr,
		liquid,
		fixed,
		locked: own - liquid - fixed,
		members
	};
}

/** A change to a debt that a check-in recorded (MA-205): what it moved the view's net worth by, in pounds, and its words. */
function checkInChange(h: StubHousehold, view: View, change: Change) {
	if (change.line === undefined) return undefined;
	const debt = [...h.debts, ...h.closed].find((d) => d.id === change.recordId);
	if (!debt) return undefined;
	const now = h.closed.includes(debt) ? 0 : debt.balance;
	const moved =
		change.before === undefined ? 0 : toGbp(change.before - now, debt.ccy, h.fx) * weight(debt.owners, view);
	// What is owed is rounded once, so the total moves by the change in that rounded sum.
	const owed = h.debts.reduce((all, d) => all + toGbp(d.balance, d.ccy, h.fx) * weight(d.owners, view), 0);
	return { added: Math.round(owed + moved) - Math.round(owed), at: change.at, line: change.line };
}

function hero(h: StubHousehold, view: View, currency: DisplayCurrency, t: Totals, shown: number): Hero {
	const over = `Net worth · ${dayLabel(h.today)}`;
	const rateLine = `£1 = ₹${h.fx.toFixed(2)} · ECB reference rate, ${RATE_DAY} · prices at the ${RATE_DAY} close`;
	if (h.empty) {
		return {
			over,
			line: 'Tell MyPaisa about one thing you own or owe, in your own words. The engine does the sums.',
			rate: rateLine
		};
	}
	const net = money(shown, currency);
	const places = [...new Set([...h.assets, ...h.debts].map((r) => r.country))];
	const where = places.length > 1 ? 'the UK and India' : places[0] === 'IN' ? 'India' : 'the UK';
	const across = `Across ${plural(t.nAssets + t.nDebts, 'record')} in ${where}`;
	const change = h.lastChange;
	const record = change && h.assets.find((a) => a.id === change.recordId);
	// MA-205: a payment a check-in recorded moves a debt; Undo says so with no figure.
	const paid = change && checkInChange(h, view, change);
	if (paid?.added === 0) return { over, net, line: `at ${timeOf(paid.at)} · ${paid.line}`, rate: rateLine };
	const added = paid ? paid.added : record ? toGbp(record.value, record.ccy, h.fx) * weight(record.owners, view) : 0;
	if (!change || (!record && !paid) || added === 0) return { over, net, line: across, rate: rateLine };

	const inr = currency === 'INR';
	const delta = inr ? Math.round(added * h.fx) : Math.round(added);
	const crore = inr && shown >= 10_000_000 ? ` · about ₹${(shown / 10_000_000).toFixed(2)} crore in all` : '';
	return {
		over,
		net,
		delta: money(delta, currency, '▲ '),
		rollFrom: whole(shown - delta),
		changedAt: change.at.toISOString(),
		line: `at ${timeOf(change.at)} · ${paid ? paid.line : `${record?.name ?? ''}, ${change.how}`}${crore}`,
		rate: rateLine
	};
}

/** Home's two chart cards (MA-359; board Web v4 · Home charts, MA-355 c 1a), in place of the meters card they supersede.
 * Each names the view and currency it is for and reads its own query, so it loads, fails and empties by itself. */
function chartCards(view: View, currency: DisplayCurrency): CardRow[] {
	return [
		{
			layout: 'one',
			columns: [
				[{ id: 'own-owe', title: 'What we own and owe', aside: '', parts: [{ kind: 'ownowe', view, currency }] }]
			]
		},
		{
			layout: 'one',
			columns: [
				[
					{
						id: 'invested-owed',
						title: 'Invested against owed',
						aside: '',
						parts: [{ kind: 'investedowed', view, currency }]
					}
				]
			]
		}
	];
}

function byCountry(h: StubHousehold, view: View, t: Totals, d: ReturnType<typeof inDisplay>, c: DisplayCurrency) {
	const count = (country: string) => {
		const assets = h.assets.filter((a) => a.country === country && weight(a.owners, view) > 0).length;
		const debts = h.debts.filter((x) => x.country === country && weight(x.owners, view) > 0).length;
		return `${plural(assets, 'asset')}, ${debts === 1 ? '1 loan' : plural(debts, 'debt')}`;
	};
	const inr = c === 'INR';
	const india: Meter = {
		label: 'India',
		fig: money(d.ind, c),
		share: share(t.ind, t.net),
		tone: 'meter',
		note: `${percent(t.ind, t.net)} · ${count('IN')}, held in rupees${inr ? '' : ':'}`,
		...(inr ? {} : { noteFig: money(t.indInr, 'INR') }),
		aria: `India ${percent(t.ind, t.net)}`
	};
	const card: WealthCard = {
		id: 'by-country',
		title: 'By country',
		aside: inr ? 'in rupees' : 'in pounds',
		parts: [
			{
				kind: 'meters',
				items: [
					{
						label: 'United Kingdom',
						fig: money(d.uk, c),
						share: share(t.uk, t.net),
						tone: 'meter',
						note: `${percent(t.uk, t.net)} · ${count('UK')}, held in pounds`,
						aria: `United Kingdom ${percent(t.uk, t.net)}`
					},
					india
				]
			}
		]
	};
	return card;
}

function byMember(t: Totals, d: ReturnType<typeof inDisplay>, c: DisplayCurrency): WealthCard {
	return {
		id: 'by-member',
		title: 'By member',
		aside: 'joint records by share',
		parts: [
			{
				kind: 'meters',
				items: t.members.map((m, i) => ({
					label: m.name,
					fig: money(d.members[i] ?? 0, c),
					share: share(m.net, t.net),
					tone: 'meter' as const,
					note: `${percent(m.net, t.net)} · ${SHARE_LINE[m.id] ?? 'their own records and their share of the joint ones'}`,
					aria: `${m.name} ${percent(m.net, t.net)}`
				}))
			},
			{ kind: 'text', text: JOINT_LINE }
		]
	};
}

function liquidity(h: StubHousehold, view: View, t: Totals, d: ReturnType<typeof inDisplay>, c: DisplayCurrency) {
	const mine = h.assets.filter((a) => weight(a.owners, view) > 0);
	const locked = mine.filter((a) => liquidityOf(a) === 'locked');
	const homes = locked.filter((a) => a.kind === 'property').length;
	const pensions = locked.filter((a) => a.unlocks_at !== undefined);
	const next = mine
		.filter((a) => a.matures && a.at_maturity !== undefined)
		.sort((a, b) => (a.matures ?? '').localeCompare(b.matures ?? ''))[0];
	const lockedNote = [
		homes > 0 ? `${word(homes)} ${homes === 1 ? 'home' : 'homes'}` : '',
		pensions.length > 0
			? `${word(pensions.length)} ${pensions.length === 1 ? 'pension that unlocks' : 'pensions that unlock'} at ${String(pensions[0]?.unlocks_at ?? '')}`
			: ''
	]
		.filter(Boolean)
		.join(', and ');
	const pc = (n: number) => `${String(Math.round(share(n, t.own) * 1000) / 10)}%`;
	const card: WealthCard = {
		id: 'liquidity',
		title: 'Liquid and locked',
		aside: `${percent(t.locked, t.own)} is locked`,
		parts: [
			{
				kind: 'stack',
				aria: `Liquid now ${pc(t.liquid)}, fixed term ${pc(t.fixed)}, locked ${pc(t.locked)} of what we own`,
				items: [
					{
						label: 'Liquid now',
						fig: money(d.liquid, c),
						share: share(t.liquid, t.own),
						tone: 'chart-2',
						note: `${plural(t.nLiquid, 'record')}: cash, savings, funds and shares`
					},
					{
						label: 'Fixed term',
						fig: money(d.fixed, c),
						share: share(t.fixed, t.own),
						tone: 'chart-5',
						note: next
							? `${String(t.nFixed)} pay out at maturity; next ${SHORT_NAME[next.id] ?? next.name},`
							: `${String(t.nFixed)} pay out at maturity`,
						...(next?.matures && next.at_maturity !== undefined
							? { noteFig: money(next.at_maturity, next.ccy), noteAfter: `on ${dayLabel(next.matures)}` }
							: {})
					},
					{
						label: 'Locked',
						fig: money(d.locked, c),
						share: share(t.locked, t.own),
						tone: 'chart-4',
						note: lockedNote || 'nothing locked'
					}
				]
			}
		]
	};
	return card;
}

/** One dated line, with the record it belongs to, so a member's view shows only what is theirs. */
function dueItem(
	h: StubHousehold,
	when: string,
	record: string | undefined,
	rest: Omit<DueItem, 'id' | 'today' | 'weekday' | 'day' | 'month'>
): DueItem & { owners?: readonly Share[] } {
	const p = dayParts(when);
	const today = when.slice(0, 10) <= h.today;
	const owners = [...h.assets, ...h.debts].find((r) => r.id === record)?.owners;
	return {
		id: `${when}:${rest.title}`,
		today,
		weekday: today ? 'Today' : p.weekday,
		day: today ? dayParts(h.today).day : p.day,
		month: today ? dayParts(h.today).month : p.month,
		...rest,
		...(owners ? { owners } : {})
	};
}

function due(h: StubHousehold, view: View): WealthCard {
	const asset = (id: string) => h.assets.find((a) => a.id === id);
	const debt = (id: string) => h.debts.find((x) => x.id === id);
	const asks = { tone: 'pause', text: 'Asks you' } as const;
	const autopay = { tone: 'neutral', text: 'Autopay' } as const;
	const home = asset('home');
	const pune = asset('pune');
	const mortgage = debt('mortgage');
	const hdfc = debt('hdfc');
	const car = debt('car');
	const items = [
		home &&
			dueItem(h, '2026-10-26', 'home', {
				title: 'Valuation due: Home, Reading',
				note: 'Asks: still about',
				noteFig: money(home.value, home.ccy),
				chip: asks
			}),
		pune &&
			dueItem(h, '2026-10-26', 'pune', {
				title: 'Valuation overdue: Flat, Pune',
				note: `Due since ${shortDay(pune.valuation_due ?? h.today)}. Asks: still about`,
				noteFig: money(pune.value, pune.ccy),
				chip: asks
			}),
		mortgage?.payment !== undefined &&
			dueItem(h, '2026-11-01', 'mortgage', {
				title: 'Mortgage · Nationwide',
				note: 'UK · joint, 50% each',
				fig: money(mortgage.payment, mortgage.ccy),
				chip: autopay
			}),
		dueItem(h, '2026-11-01', undefined, {
			title: "Close October's budget",
			note: 'Anything not on a statement?',
			chip: asks
		}),
		hdfc?.payment !== undefined &&
			dueItem(h, '2026-11-05', 'hdfc', {
				title: 'Home loan EMI · HDFC',
				...emiDue(h, hdfc.balance),
				fig: money(hdfc.payment, hdfc.ccy),
				chip: h.answerOf(EMI_NOV)?.answer === 'paid' ? { tone: 'add', text: 'Done' } : asks
			}),
		// MA-205: once November's EMI is paid, December's joins what is due.
		hdfc?.payment !== undefined &&
			h.answerOf(EMI_NOV)?.answer === 'paid' &&
			dueItem(h, emiFigures().next, 'hdfc', {
				title: 'Home loan EMI · HDFC',
				note: 'India · Arun · December’s',
				fig: money(hdfc.payment, hdfc.ccy),
				chip: asks
			}),
		asset('ppfas') &&
			dueItem(h, '2026-11-10', 'ppfas', {
				title: 'SIP · Parag Parikh',
				note: 'India · Asha',
				fig: money(10000, 'INR'),
				chip: asks
			}),
		car?.payment !== undefined &&
			dueItem(h, '2026-11-20', 'car', {
				title: 'Car loan · Close Brothers',
				note: 'UK · Arun',
				fig: money(car.payment, car.ccy),
				chip: autopay
			})
	]
		.filter((it) => it !== undefined && it !== false)
		.filter((it) => !it.owners || weight(it.owners, view) > 0)
		.map(({ owners: _owners, ...it }) => it);
	return {
		id: 'due',
		title: "What's due",
		aside: 'next 30 days',
		parts: [
			{ kind: 'due', items },
			{
				kind: 'text',
				// MA-205: the card bill paid in its check-in leaves what is due.
				text:
					h.answerOf(CARD_NOV)?.answer === 'paid'
						? 'Each check-in arrives in the chat; one tap records it.'
						: 'Also Fri 20 Nov: the Barclaycard bill, from the statement on Sun 1 Nov. Each check-in arrives in the chat; one tap records it.'
			}
		]
	};
}

/** November's EMI as its check-in left it (MA-205; board Web v4 · Check-ins): paid, with what is left to pay and the
 * row ticked to Done; open again after Undo; or as it was asked. */
function emiDue(h: StubHousehold, balance: number): Pick<DueItem, 'note' | 'noteFig' | 'done'> {
	const answer = h.answerOf(EMI_NOV);
	if (answer?.answer === 'paid') {
		return { note: `Paid ${timeOf(answer.at)} · left to pay`, noteFig: money(balance, 'INR'), done: true };
	}
	if (answer?.answer === 'undone')
		return { note: 'Open again after Undo · left to pay', noteFig: money(balance, 'INR') };
	return { note: 'India · Arun' };
}

function debtNote(h: StubHousehold, d: StubDebt): string {
	const whose = d.owners.length > 1 ? `joint ${String(d.owners[0]?.[1] ?? 50)}% each` : ownerNames(h, d.owners);
	const fixed =
		d.rate !== undefined && d.rate_note?.startsWith('fixed to ')
			? ` · fixed ${rate(d.rate)} ${d.rate_note.slice('fixed '.length).split(',')[0] ?? ''}`
			: '';
	return `${COUNTRY[d.country]} · ${whose}${fixed} ·`;
}

function runoff(h: StubHousehold, view: View, d: ReturnType<typeof inDisplay>, c: DisplayCurrency): WealthCard {
	const loans = h.debts
		.filter((x) => weight(x.owners, view) > 0 && x.balance > 0 && x.ends)
		.map((x) => ({ x, months: monthsBetween(h.today, x.ends ?? h.today) }))
		.sort((a, b) => a.months - b.months);
	const longest = loans.at(-1);
	const span = longest?.months ?? 0;
	const items: RunoffItem[] = loans.map(({ x, months }) => ({
		id: x.id,
		name: x.name.replace(/ \((.+)\)$/, (_m, what: string) => `, the ${what}`),
		fig: money(x.balance * weight(x.owners, view), x.ccy),
		share: share(months, span),
		note: debtNote(h, x),
		...(x.payment !== undefined ? { noteFig: money(x.payment, x.ccy, undefined, ' a month') } : {}),
		ends: `paid off ${dayLabel(x.ends ?? h.today, true)}`,
		aria: `${(x.name.split(' · ')[0] ?? x.name).trim()}, ${plural(months, 'month')} left`
	}));
	const axis: AxisTick[] = [];
	if (longest?.x.ends) {
		const start = Number(h.today.slice(0, 4));
		const end = Number(longest.x.ends.slice(0, 4));
		axis.push({ label: 'Now', at: 0 });
		for (let y = Math.ceil((start + 1) / 5) * 5; y < end; y += 5) {
			axis.push({ label: String(y), at: share(monthsBetween(h.today, `${String(y)}-01-01`), span) });
		}
		const last = dayParts(longest.x.ends);
		axis.push({ label: `${last.month} ${last.year}`, at: 1 });
	}
	const cleared = h.debts.find(
		(x) => x.kind === 'credit_card' && x.balance === 0 && x.statement && weight(x.owners, view) > 0
	);
	return {
		id: 'runoff',
		title: 'What we owe, and how it runs off',
		aside: 'in all',
		asideFig: money(d.owe, c),
		parts: [
			{ kind: 'runoff', items, axis },
			cleared?.statement
				? {
						kind: 'text',
						text: `${cleared.name}: nothing owed; October's`,
						fig: money(cleared.statement.balance, cleared.ccy),
						after: `was paid in full on ${dayLabel(cleared.statement.due)}. Each loan frees its payment when it ends.`
					}
				: { kind: 'text', text: 'Each loan frees its payment when it ends.' }
		]
	};
}

function maturing(h: StubHousehold, view: View): WealthCard {
	const items: DueItem[] = h.assets
		.filter((a) => a.matures && weight(a.owners, view) > 0)
		.sort((a, b) => (a.matures ?? '').localeCompare(b.matures ?? ''))
		.map((a) => {
			const p = dayParts(a.matures ?? h.today);
			const who = `${COUNTRY[a.country]} · ${ownerNames(h, a.owners)}`;
			const base = {
				id: a.id,
				today: false,
				weekday: p.weekday,
				day: p.day,
				month: p.month,
				year: p.year,
				title: a.name
			};
			if (a.at_maturity !== undefined) {
				return {
					...base,
					note: `${who} · ${rate(a.rate ?? 0)} · now`,
					noteFig: money(a.value, a.ccy),
					fig: money(a.at_maturity, a.ccy),
					chip: { tone: 'pause', text: 'Asks you' }
				};
			}
			if (a.sum_assured !== undefined) {
				return {
					...base,
					note: `${who} · sum assured`,
					noteFig: money(a.sum_assured, a.ccy),
					chip: { tone: 'neutral', text: 'Policy' }
				};
			}
			return {
				...base,
				note: `${who} · ${rate(a.rate ?? 0)} · now`,
				noteFig: money(a.value, a.ccy),
				chip: { tone: 'neutral', text: a.kind.toUpperCase() }
			};
		});
	return {
		id: 'maturing',
		title: 'Maturing next',
		aside: 'what the fixed terms pay',
		parts: [{ kind: 'due', items }]
	};
}

function assetNote(h: StubHousehold, a: StubAsset): string {
	if (a.owners.length > 1) {
		if (!a.valued) return a.account ?? 'joint';
		const overdue = a.valuation_due !== undefined && a.valuation_due < h.today;
		return `valued ${shortDay(a.valued)}${overdue ? ' · overdue' : ''}`;
	}
	const who = ownerNames(h, a.owners);
	if (a.unlocks_at !== undefined) return `${who} · unlocks at ${String(a.unlocks_at)}`;
	return a.account ? `${who} · ${a.account}` : who;
}

function largest(h: StubHousehold, view: View, c: DisplayCurrency): WealthCard {
	const ranked = h.assets
		.map((a) => ({ a, w: weight(a.owners, view), gbp: toGbp(a.value, a.ccy, h.fx) * weight(a.owners, view) }))
		.filter((x) => x.w > 0)
		.sort((a, b) => b.gbp - a.gbp);
	const top = ranked.slice(0, 5);
	const others = ranked.slice(5);
	const rows: RecordRow[] = top.map(({ a, w, gbp }) => {
		const joint = jointLine(h, a.owners);
		const alt =
			a.ccy === 'INR' && c === 'GBP'
				? money(gbp, 'GBP', '≈ ')
				: a.ccy === 'GBP' && c === 'INR'
					? money(gbp * h.fx, 'INR')
					: undefined;
		return {
			id: a.id,
			lead:
				LEADS[a.id] ??
				a.name
					.replace(/[^A-Za-z]/g, '')
					.slice(0, 2)
					.toUpperCase(),
			name: a.name,
			place: `${COUNTRY[a.country]} · ${SYMBOL[a.ccy]}`,
			...(joint ? { joint } : {}),
			note: assetNote(h, a),
			fig: money(a.value * w, a.ccy),
			...(alt ? { alt } : {})
		};
	});
	const restGbp = Math.round(others.reduce((s, x) => s + x.gbp, 0));
	return {
		id: 'largest',
		title: 'Largest assets',
		aside: 'each in its own currency',
		parts: [
			{ kind: 'rows', items: rows },
			...(others.length > 0
				? [
						{
							kind: 'text' as const,
							text: `${plural(others.length, 'more record')},`,
							fig: c === 'INR' ? money(restGbp * h.fx, 'INR') : money(restGbp, 'GBP'),
							after: 'in all.'
						}
					]
				: []),
			{ kind: 'link', text: 'All assets', href: '/assets' }
		]
	};
}

function emptyRows(): CardRow[] {
	return [
		{
			layout: 'one',
			columns: [
				[
					{
						id: 'say-it',
						title: 'Say it the way you would to a friend',
						aside: 'in the chat',
						parts: [
							{
								kind: 'text',
								text: '"£5,000 in Monzo savings, instant access." "Our flat in Pune, bought for 65 lakh in 2015." "The mortgage with Nationwide, £1,456 a month." The agent asks only what is missing, one thing at a time, and nothing is saved until you Confirm.'
							},
							{
								kind: 'text',
								text: 'Your net worth, each country, each member, what is liquid and what is due will build here as records arrive, in pounds or rupees.'
							}
						]
					},
					{
						id: 'start',
						title: 'Or start from one of these',
						aside: 'each opens the chat',
						parts: [
							{
								kind: 'list',
								items: [
									{
										id: 'savings',
										icon: 'piggy-bank',
										title: 'A savings account or cash',
										note: 'Which bank, and roughly how much',
										action: 'Open in chat'
									},
									{
										id: 'property',
										icon: 'house',
										title: 'A property, in the UK or India',
										note: 'Where, whose, and what it is worth to you',
										action: 'Open in chat'
									},
									{
										id: 'debt',
										icon: 'landmark',
										title: 'A loan, a mortgage or a card',
										note: 'Who lends, the payment, and when it ends',
										action: 'Open in chat'
									},
									{
										id: 'statement',
										icon: 'file-text',
										title: 'A statement or a screenshot',
										note: 'A PDF, CSV or picture; the agent reads it and asks',
										action: 'Open in chat'
									}
								]
							},
							{
								kind: 'text',
								text: 'No form here creates a record: each of these starts a conversation, and only Confirm saves.'
							}
						]
					}
				]
			]
		}
	];
}

export function buildOverview(h: StubHousehold, view: View, currency: DisplayCurrency): Overview {
	const known = view === HOUSEHOLD || h.member(view) !== undefined ? view : HOUSEHOLD;
	const t = totals(h, known);
	const d = inDisplay(t, currency, h.fx);
	const views = [
		{ id: HOUSEHOLD, label: 'Household' },
		{ id: h.me, label: 'Me' },
		...h.members.filter((m) => m.id !== h.me).map((m) => ({ id: m.id, label: m.name }))
	];
	const who = views.find((v) => v.id === known)?.label ?? 'Household';
	const base = {
		empty: h.empty,
		head: `${who} · ${dayLabel(h.today)} · Illustrative figures`,
		view: known,
		views,
		currency,
		hero: hero(h, known, currency, t, d.net),
		foot: FOOT
	};
	if (h.empty) return { ...base, rows: [...chartCards(known, currency), ...emptyRows()] };
	// The two columns under the chart cards are balanced by height (Arun, 25 Nov 2026: the meters card left the left
	// column short, a gap beside What's due): By country, By member and the run-off on the left; Liquid and locked and
	// What's due on the right; then Maturing next beside Largest assets.
	const left = [byCountry(h, known, t, d, currency)];
	if (known === HOUSEHOLD) left.push(byMember(t, d, currency));
	left.push(runoff(h, known, d, currency));
	return {
		...base,
		rows: [
			...chartCards(known, currency),
			{ layout: 'two', columns: [left, [liquidity(h, known, t, d, currency), due(h, known)]] },
			{ layout: 'two', columns: [[maturing(h, known)], [largest(h, known, currency)]] }
		]
	};
}
