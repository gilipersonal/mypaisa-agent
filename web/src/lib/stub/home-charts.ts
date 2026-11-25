/** Home's two chart cards from the stub household (MA-359; board Web v4 · Home charts, MA-355 c 1a). What we own and
 * owe is worked out from the records, as the Overview's sums are (`sums.ts`): each kind and each loan at the set's one
 * rate, the kinds rounded by largest remainder so they add up to what is owned. Invested against owed is the figure
 * set's own `home_charts` (the 26 Oct run, the plan's path), copied to `future-plans.json` and held equal by a test:
 * nothing on it is worked out here but its scale, its shares and its words. The api replaces this; the cards do not
 * change. */
import { formatMoney } from '#lib/formatting/money.ts';
import type {
	AxisTick,
	DisplayCurrency,
	Fig,
	GridLine,
	GrowthPart,
	InvestedHorizon,
	InvestedOwed,
	OwnOwe,
	PaidRow,
	PathPoint,
	RingPart,
	RingTone,
	YearRow
} from '#lib/wealth/overview.ts';
import { dayLabel, dayParts } from './dates.ts';
import plans from './future-plans.json';
import type { RecordCurrency, StubAsset, StubDebt, StubHousehold } from './household.ts';
import { HOUSEHOLD, largestRemainder, toGbp, weight, type View } from './sums.ts';

const SET = plans.home_charts;

type KindId = 'property' | 'pensions' | 'investments' | 'deposits' | 'cash';
/** The kinds round the ring, in the board's order, each with its chart colour. */
const KINDS: readonly { id: KindId; label: string; tone: RingTone }[] = [
	{ id: 'property', label: 'Property', tone: 'c1' },
	{ id: 'pensions', label: 'Pensions', tone: 'c2' },
	{ id: 'investments', label: 'Investments', tone: 'c4' },
	{ id: 'deposits', label: 'Deposits', tone: 'c5' },
	{ id: 'cash', label: 'Cash', tone: 'c3' }
];
const CASH = new Set(['cash', 'savings_account', 'current_account']);
/** The board's short name for a loan, where the part before " · " would not tell two loans apart. */
const SHORT_LOAN: Record<string, string> = { hdfc: 'HDFC loan' };
const MONTHS: Record<string, string> = {
	Jan: 'January',
	Feb: 'February',
	Mar: 'March',
	Apr: 'April',
	May: 'May',
	Jun: 'June',
	Jul: 'July',
	Aug: 'August',
	Sep: 'September',
	Oct: 'October',
	Nov: 'November',
	Dec: 'December'
};
const HORIZONS = [5, 10, 20, 30] as const;
const FOOT =
	'On the Projection’s plan path: your records, plans and assumptions, with no market swings. Future pounds, not today’s money.';
const PART_WORDS = {
	held: { label: 'Held today', about: 'What is invested today: cash, deposits, investments and pensions' },
	saved: { label: 'Saved from income', about: 'Surplus kept as cash, the SIP and LIC, less plans paid from cash' },
	growth: { label: 'Growth and interest', about: 'Markets, deposit and cash interest, less the rupee’s drift' }
} as const;

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const whole = (n: number) => String(Math.round(n));
const fig = (n: number, currency: RecordCurrency): Fig => ({ amount: whole(n), currency });
const pounds = (n: number) => formatMoney(whole(n), 'GBP', { whole: true });

/** A share as a row writes it: one decimal, and never "0.0%" for something that is there. */
export function shareText(share: number): string {
	const tenths = Math.round(share * 1000) / 10;
	return share > 0 && tenths === 0 ? 'under 0.1%' : `${tenths.toFixed(1)}%`;
}

/** "March 2029" from "Mar 2029", for a screen reader. */
export function longMonth(label: string): string {
	const [month = '', year = ''] = label.split(' ');
	return `${MONTHS[month] ?? month} ${year}`;
}

export function kindOf(asset: StubAsset): KindId {
	if (asset.kind === 'property') return 'property';
	if (asset.unlocks_at !== undefined) return 'pensions';
	if (asset.matures) return 'deposits';
	if (CASH.has(asset.kind)) return 'cash';
	return 'investments';
}

function kindNote(id: KindId, held: readonly { a: StubAsset; w: number }[]): string {
	const n = held.length;
	if (id === 'property') {
		const half = held.every((x) => x.w === 0.5) ? ', half each' : '';
		return `${String(n)} ${n === 1 ? 'home' : 'homes'}${half}`;
	}
	if (id === 'pensions') {
		const ages = [...new Set(held.map((x) => x.a.unlocks_at))];
		return ages.length === 1 ? `${String(n)}, locked until ${String(ages[0])}` : `${String(n)} pensions`;
	}
	if (id === 'investments') return n === 1 ? '1 fund or share' : `${String(n)} funds and shares`;
	if (id === 'deposits') return n === 1 ? '1 fixed term' : `${String(n)} fixed terms`;
	return n === 1 ? '1 account or pot' : `${String(n)} accounts and pots`;
}

function loanNote(debt: StubDebt, w: number): string {
	const end = debt.ends ? dayParts(debt.ends) : undefined;
	const ends = end ? `ends ${end.month} ${end.year}` : 'no end date';
	if (w === 1) return ends.charAt(0).toUpperCase() + ends.slice(1);
	return `${w === 0.5 ? 'Half' : `${String(Math.round(w * 100))}%`} · ${ends}`;
}

function whose(h: StubHousehold, view: View) {
	if (view === HOUSEHOLD) return { own: 'We own', owe: 'We owe', what: 'what we own', owes: 'what we owe' };
	if (view === h.me) return { own: 'I own', owe: 'I owe', what: 'what I own', owes: 'what I owe' };
	const name = h.member(view)?.name ?? view;
	return { own: `${name} owns`, owe: `${name} owes`, what: `what ${name} owns`, owes: `what ${name} owes` };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A record's name before its lender: "Barclaycard", "Mortgage". */
const shortName = (name: string) => name.replace(/ · .*$/, '');

/** `a` of `b`, and nothing of nothing. */
export function ratio(a: number, b: number): number {
	return b === 0 ? 0 : a / b;
}

/** What we own by kind and what we owe by loan, one ring on one scale, in the currency the member reads totals in. */
export function buildOwnOwe(h: StubHousehold, view: View, currency: DisplayCurrency): OwnOwe {
	const known = view === HOUSEHOLD || h.member(view) !== undefined ? view : HOUSEHOLD;
	const words = whose(h, known);
	const inDisplay = (value: number, ccy: RecordCurrency) =>
		currency === 'GBP' ? toGbp(value, ccy, h.fx) : ccy === 'INR' ? value : value * h.fx;

	const held = h.assets.map((a) => ({ a, w: weight(a.owners, known) })).filter((x) => x.w > 0);
	const owing = h.debts.map((d) => ({ d, w: weight(d.owners, known) })).filter((x) => x.w > 0);
	const ownGbp = sum(held.map((x) => toGbp(x.a.value, x.a.ccy, h.fx) * x.w));
	const live = owing.filter((x) => x.d.balance > 0);
	const oweGbp = sum(live.map((x) => toGbp(x.d.balance, x.d.ccy, h.fx) * x.w));
	const ownShown = Math.round(sum(held.map((x) => inDisplay(x.a.value, x.a.ccy) * x.w)));
	const oweShown = Math.round(sum(live.map((x) => inDisplay(x.d.balance, x.d.ccy) * x.w)));
	const key = 'Outer ring: what is owned, by kind. Inner ring: what is owed, on the same scale.';

	if (held.length === 0 && owing.length === 0) {
		return {
			state: 'empty',
			aside: 'No records yet',
			ownLabel: words.own,
			oweLabel: words.owe,
			ofOwn: `of ${words.what}`,
			own: fig(0, currency),
			owe: fig(0, currency),
			oweShare: 0,
			oweShareText: '0%',
			kinds: [],
			loans: [],
			paid: [],
			nothingOwed: true,
			key,
			aria: 'Nothing owned or owed is on record yet'
		};
	}

	const scale = Math.max(ownGbp, oweGbp);
	const groups = KINDS.map((k) => ({ k, items: held.filter((x) => kindOf(x.a) === k.id) })).filter(
		(g) => g.items.length > 0
	);
	const rawGbp = groups.map((g) => sum(g.items.map((x) => toGbp(x.a.value, x.a.ccy, h.fx) * x.w)));
	const rawShown = groups.map((g) => sum(g.items.map((x) => inDisplay(x.a.value, x.a.ccy) * x.w)));
	const shown = largestRemainder(rawShown, ownShown);
	let at = 0;
	const kinds: RingPart[] = groups.map((g, i) => {
		const gbp = Number(rawGbp[i]);
		const share = ratio(gbp, ownGbp);
		const part: RingPart = {
			id: g.k.id,
			label: g.k.label,
			note: kindNote(g.k.id, g.items),
			fig: fig(Number(shown[i]), currency),
			share,
			shareText: shareText(share),
			from: at,
			arc: ratio(gbp, scale),
			tone: g.k.tone,
			href: '/assets'
		};
		at += part.arc;
		return part;
	});

	at = 0;
	const loans: RingPart[] = live
		.map((x) => ({ ...x, gbp: toGbp(x.d.balance, x.d.ccy, h.fx) * x.w }))
		.sort((a, b) => b.gbp - a.gbp)
		.map(({ d, w, gbp }) => {
			const share = ratio(gbp, oweGbp);
			const own = currency === 'GBP' && d.ccy === 'INR';
			const part: RingPart = {
				id: d.id,
				label: SHORT_LOAN[d.id] ?? shortName(d.name),
				note: loanNote(d, w),
				fig: own ? fig(d.balance * w, 'INR') : fig(inDisplay(d.balance, d.ccy) * w, currency),
				...(own ? { alt: fig(gbp, 'GBP') } : {}),
				share,
				shareText: shareText(share),
				from: at,
				arc: ratio(gbp, scale),
				tone: 'owed',
				href: '/debts'
			};
			at += part.arc;
			return part;
		});

	const nothingOwed = loans.length === 0;
	const paid: PaidRow[] = nothingOwed
		? []
		: owing
				.filter((x) => x.d.balance === 0)
				.map(({ d }) => ({
					id: d.id,
					label: shortName(d.name),
					note: d.statement ? `Paid ${d.statement.paid} on ${dayLabel(d.statement.due)}` : 'Nothing owed',
					fig: fig(0, currency)
				}));
	const oweShare = ratio(oweGbp, ownGbp);
	const oweShareText = `${String(Math.round(oweShare * 100))}%`;
	const ownAria = `${capital(words.what)}, by kind: ${kinds.map((k) => `${k.label} ${k.shareText}`).join(', ')}.`;
	const oweAria = nothingOwed
		? ' Nothing is owed.'
		: ` ${capital(words.owes)} is ${oweShareText} of ${words.what}: ${loans.map((l) => `${l.label} ${l.shareText} of it`).join(', ')}.`;
	return {
		state: 'ready',
		aside: nothingOwed ? 'Nothing is owed' : `${oweShareText} of ${words.what} is owed`,
		ownLabel: words.own,
		oweLabel: words.owe,
		ofOwn: `of ${words.what}`,
		own: fig(ownShown, currency),
		owe: fig(oweShown, currency),
		oweShare,
		oweShareText,
		kinds,
		loans,
		paid,
		nothingOwed,
		key: nothingOwed ? 'Outer ring: what is owned, by kind. Nothing is owed, so the inner ring is empty.' : key,
		aria: `${ownAria}${oweAria}`
	};
}

/** The top of the plot: a little over the highest figure, at two significant figures. */
export function plotMax(highest: number): number {
	const room = highest * 1.1;
	if (room <= 0) return 1;
	const step = 10 ** (Math.floor(Math.log10(room)) - 1);
	return Math.ceil(room / step) * step;
}

/** The gridlines: the step of 1, 2, 3 or 5 (times a power of ten) nearest a third of the top, below the top. */
export function gridSteps(max: number): number[] {
	const target = max / 3;
	const power = 10 ** Math.floor(Math.log10(target));
	const candidates = [1, 2, 3, 5, 10].map((m) => m * power);
	const step = candidates.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best));
	const lines: number[] = [];
	for (let k = 1; k * step < max; k += 1) lines.push(k * step);
	return lines;
}

function point(label: string, long: string, invested: number, owed: number): PathPoint {
	return {
		label,
		long,
		invested: String(invested),
		owed: String(owed),
		gap: String(Math.abs(invested - owed)),
		ahead: invested >= owed
	};
}

function pathOf(): PathPoint[] {
	return [
		point('Today', 'Today', SET.today.invested, SET.today.owed),
		...SET.months.map((m) => point(m.month, longMonth(m.month), m.invested, m.owed))
	];
}

function gapRow(p: PathPoint): YearRow {
	return {
		label: p.label,
		long: p.long,
		invested: fig(Number(p.invested), 'GBP'),
		owed: fig(Number(p.owed), 'GBP'),
		gap: fig(Number(p.gap), 'GBP'),
		ahead: p.ahead
	};
}

function horizon(path: readonly PathPoint[], years: (typeof HORIZONS)[number], crossing: number): InvestedHorizon {
	const set = SET.horizons[String(years) as keyof typeof SET.horizons];
	const last = path.findIndex((p) => p.label === set.to);
	const drawn = path.slice(0, last + 1);
	const max = plotMax(Math.max(...drawn.map((p) => Math.max(Number(p.invested), Number(p.owed)))));
	const lines: GridLine[] = gridSteps(max).map((n) => ({
		amount: String(n),
		label: formatMoney(String(n), 'GBP', { compact: true })
	}));
	const middle = 2026 + Math.ceil(years / 2);
	const midIndex = path.findIndex((p) => p.label === `Dec ${String(middle - 1)}`);
	const axis: AxisTick[] = [
		{ label: 'Today', at: 0 },
		{ label: String(middle), at: midIndex / last },
		{ label: set.to, at: 1 }
	];
	const invested = set.invested;
	const pc = (n: number) => `${String(Math.round((n / invested) * 100))}%`;
	const parts: GrowthPart[] = [
		{ id: 'held', ...PART_WORDS.held, fig: fig(set.held_today, 'GBP'), shareText: pc(set.held_today), tone: 'g0' },
		{
			id: 'saved',
			...PART_WORDS.saved,
			fig: fig(set.saved_from_income, 'GBP'),
			shareText: pc(set.saved_from_income),
			tone: 'g1'
		},
		{
			id: 'growth',
			...PART_WORDS.growth,
			fig: fig(set.growth_and_interest, 'GBP'),
			shareText: pc(set.growth_and_interest),
			tone: 'g2'
		}
	];
	const first = drawn[0];
	const end = drawn.at(-1);
	const cross = path[crossing];
	return {
		years,
		to: set.to,
		points: drawn.length,
		max: String(max),
		lines,
		axis,
		crossingLabel: crossing / last >= 0.12,
		growthShare: pc(set.growth_and_interest),
		invested: fig(invested, 'GBP'),
		parts,
		aria:
			`Invested against owed, today to ${set.to}. Invested, everything we own except property, goes from ` +
			`${pounds(Number(first?.invested))} to ${pounds(Number(end?.invested))}. What we owe goes from ` +
			`${pounds(Number(first?.owed))} to ${pounds(Number(end?.owed))}.` +
			(cross && crossing <= last ? ` Invested passes owed in ${cross.long}.` : ''),
		partsAria: `Where the growth comes from, by ${set.to}: ${parts.map((p) => `${p.label} ${p.shareText}`).join(', ')}.`,
		rows: drawn.filter((p, i) => i === 0 || p.label.startsWith('Dec ')).map(gapRow)
	};
}

/** What is invested (everything owned but property) and what is owed today, in whole pounds, from the records. */
export function investedToday(h: StubHousehold): { invested: number; owed: number } {
	return {
		invested: Math.round(sum(h.assets.filter((a) => a.kind !== 'property').map((a) => toGbp(a.value, a.ccy, h.fx)))),
		owed: Math.round(sum(h.debts.map((d) => toGbp(d.balance, d.ccy, h.fx))))
	};
}

/** Invested against owed, and where the growth comes from, from the figure set's run. The run is the household's and in
 * pounds: a member's view and rupees say so rather than split or convert what the run does not hold. */
export function buildInvestedOwed(h: StubHousehold, view: View, currency: DisplayCurrency): InvestedOwed {
	const path = pathOf();
	const crossing = path.findIndex((p) => p.label === SET.crossing.month);
	const gap = SET.today.invested - SET.today.owed;
	const notes: string[] = [];
	if (view !== HOUSEHOLD && h.member(view) !== undefined) {
		notes.push(
			'The household’s figures: the plan’s run keeps one cash figure for the whole household, so this card is not split by member.'
		);
	}
	if (currency !== 'GBP') {
		notes.push('In pounds: the run holds no rupee rate for each month ahead, so its lines are not shown in rupees.');
	}
	const now = investedToday(h);
	const changed = now.invested !== SET.today.invested || now.owed !== SET.today.owed;
	const state = h.empty ? 'empty' : now.owed === 0 ? 'nothing-owed' : 'ready';
	return {
		state,
		currency: 'GBP',
		path,
		...(crossing > 0
			? { crossing: { index: crossing, label: SET.crossing.month, long: longMonth(SET.crossing.month) } }
			: {}),
		headline: {
			text: 'when what we have invested passes what we owe. Today it is',
			fig: fig(Math.abs(gap), 'GBP'),
			after: gap < 0 ? 'behind.' : 'ahead.'
		},
		horizons: HORIZONS.map((y) => horizon(path, y, crossing)),
		notes,
		...(h.lastChange && changed
			? {
					stale: {
						title: 'Before the latest change',
						text: `These lines are the plan’s run of ${SET.when}. The records have changed since: ${pounds(now.invested)} invested and ${pounds(now.owed)} owed today. The next run brings the lines up to date.`
					}
				}
			: {}),
		foot: FOOT
	};
}
