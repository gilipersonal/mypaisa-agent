/** The Projection's Net worth view from the stub household (board Web v4 · Projection, 1a the fan first): the fan of
 * the engine's illustrative run of Mon 26 Oct 09:53 (`R26` in the figure set's future plans, run month by month under
 * "All to cash"), the milestones and plan items of the figure set, and the assumptions with the board's own words.
 *
 * Nothing here is an engine. The fan is the stored run, cut to the horizon; today's money and rupees are derived from
 * it as board P3 derives them (each year's figure over UK inflation from today, at the set's one rate, rupees rounded
 * to the lakh). So when an admin corrects an assumption or a plan item, the correction is kept with its audit line and
 * the row shows it, but **the fan does not move**: the stub cannot run the Projection again, and no new figure is made
 * up for it. MA-219's engine behind the same seam is what moves it. */
import { timeOf } from '#lib/chat/days.ts';
import { formatMoney, type Decimal } from '#lib/formatting/money.ts';
import { parseTyped } from '#lib/wealth/correct.ts';
import type { DisplayCurrency, Fig } from '#lib/wealth/overview.ts';
import type {
	Assumption,
	AssumptionGroup,
	EditSpec,
	Fan,
	FanMark,
	FanTick,
	Horizon,
	MarkShape,
	Milestone,
	MoneyBasis,
	PlanItem,
	Projection,
	ProjectionCorrection,
	Saved,
	Source
} from '#lib/wealth/projection.ts';
import { dayLabel, dayParts, shortDay } from './dates.ts';
import plans from './future-plans.json';
import type { RecordCurrency, StubCorrection, StubHousehold, StubPlanItem } from './household.ts';
import { addedPlanItems, correctPlan, isPlanPart, movedSetItem, standingPlans, statusOf } from './plan-state.ts';

const RUN = plans.R26;
const RATE_DAY = 'Fri 23 Oct';
const CHIPS = ['What if we buy a second flat?', 'What if the plan items fall away?', 'What moves the line most?'];
const FOOT =
	'Illustrative figures from the v4 figure set. A projection, not a promise: the engine’s middle path is no more likely than the band around it.';
const SAVED = 'Saved. The Projection runs again with it.';
const SYMBOL = { GBP: '£', INR: '₹' } as const;
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** Which years the axis names at each horizon, and which of them a narrow chart leaves out (board P8). */
export const AXIS: Record<Horizon, { at: number[]; minor: number[] }> = {
	5: { at: [0, 1, 2, 3, 4, 5], minor: [1, 2, 4] },
	10: { at: [0, 5, 10], minor: [] },
	20: { at: [0, 5, 10, 15, 20], minor: [5, 15] },
	30: { at: [0, 5, 10, 15, 20, 25, 30], minor: [5, 15, 25] }
};

/** The board's icon, shape and words for each of the figure set's milestones, by its day. */
const MILESTONES: Record<string, { icon: string; shape: MarkShape; note?: string; label?: string }> = {
	'2026-12-14': { icon: 'piggy-bank', shape: 'tick' },
	'2028-06-30': { icon: 'percent', shape: 'tick', note: 'then a variable rate' },
	'2029-02-20': { icon: 'car', shape: 'dot' },
	'2029-03-10': { icon: 'landmark', shape: 'tick' },
	'2030-07-05': { icon: 'house-plus', shape: 'dot', label: 'HDFC loan ends' },
	'2031-03-28': { icon: 'shield', shape: 'tick' },
	'2045-10-01': { icon: 'house', shape: 'dot', label: 'Mortgage paid off' },
	'2051-01-01': { icon: 'tree-palm', shape: 'dot', label: 'Arun retires' }
};

/** The marks that carry their words on the line, as the board draws them: one at 20 years or less and none in rupees,
 * where the figures are wider; the two late ones at 30. */
const LABELLED: Record<'near' | 'far', string[]> = { near: ['2030-07-05'], far: ['2045-10-01', '2051-01-01'] };

/** A milestone the board gives no look to is a tick with a calendar. */
const UNMARKED: { icon: string; shape: MarkShape; note?: string; label?: string } = { icon: 'calendar', shape: 'tick' };

const PLAN_ICON: Record<string, string> = { extension: 'construction', bonus: 'gift', car2: 'car' };

interface AssumptionRow {
	id: string;
	name: string;
	read: (h: StubHousehold) => number;
	source: Source;
	why: string;
	/** Where the figure comes from, in the words an edit and its audit use. */
	origin: string;
	was: string;
	hint?: string;
}

const PRIOR: Source = { kind: 'prior', label: 'Prior' };
const CONTRACT: Source = { kind: 'contract', label: 'Contract' };
const A_PRIOR = { origin: 'a long-run prior', was: 'a long-run prior' };
const ITS_CONTRACT = { origin: 'its contract', was: 'its contract' };
const assumed = (key: string) => (h: StubHousehold) => h.projection.assumptions[key] ?? 0;

const PAY_ASHA: AssumptionRow = {
	id: 'pay_asha',
	name: 'Asha’s salary growth',
	read: assumed('salary growth Asha'),
	source: { kind: 'history', label: 'History and prior' },
	why: 'Her 3.5% a year since 2023, blended with the UK’s 3.5%.',
	origin: 'her history blended with a prior',
	was: 'her history and prior',
	hint: 'Her own 3.5% a year since 2023, without the UK’s 3.5% blended in.'
};

/** The board's eleven figures, each read from the figure set and given the board's source and reason. */
const ASSUMPTIONS: { title: string; rows: AssumptionRow[] }[] = [
	{
		title: 'Returns',
		rows: [
			{
				id: 'equity_in',
				name: 'Parag Parikh Flexi Cap',
				read: assumed('equity_in (Parag Parikh)'),
				source: { kind: 'history', label: 'History, shrunk to a prior' },
				why: 'Its own 10.7% XIRR, toward India shares’ 9%: 3.8 years of history moves the long-run prior only a little.',
				origin: 'its history, shrunk to a prior',
				was: 'its history, shrunk to a prior'
			},
			{
				id: 'equity_uk',
				name: 'Balanced and the ETFs',
				read: assumed('equity_uk (Balanced and ETFs)'),
				source: PRIOR,
				why: 'Long-run UK shares.',
				...A_PRIOR
			},
			{
				id: 'property_uk',
				name: 'Home, Reading',
				read: assumed('property_uk'),
				source: PRIOR,
				why: 'Long-run UK property.',
				...A_PRIOR
			},
			{
				id: 'property_in',
				name: 'Flat, Pune',
				read: assumed('property_in'),
				source: PRIOR,
				why: 'Long-run India property.',
				...A_PRIOR
			},
			{
				id: 'fixed_deposit',
				name: 'SBI fixed deposit',
				read: assumed('fixed deposit (contract)'),
				source: CONTRACT,
				why: 'Its own rate, to 10 Mar 2029.',
				...ITS_CONTRACT
			},
			{
				id: 'ppf',
				name: 'PPF',
				read: assumed('PPF (contract)'),
				source: CONTRACT,
				why: 'The account’s own rate.',
				...ITS_CONTRACT
			},
			{
				id: 'cash',
				name: 'Cash',
				read: () => plans.settings.cash_rate,
				source: PRIOR,
				why: 'Long-run UK savings rates. Each month’s surplus stays as cash.',
				...A_PRIOR
			}
		]
	},
	{
		title: 'Pay, a year',
		rows: [
			{
				id: 'pay_arun',
				name: 'Arun’s salary growth',
				read: assumed('salary growth Arun'),
				source: { kind: 'history', label: 'History and prior' },
				why: 'His 4.8% a year since 2022, blended with the UK’s 3.5%.',
				origin: 'his history blended with a prior',
				was: 'his history and prior',
				hint: 'His own 4.8% a year since 2022, without the UK’s 3.5% blended in.'
			},
			PAY_ASHA
		]
	},
	{
		title: 'Prices, a year',
		rows: [
			{
				id: 'inflation_uk',
				name: 'UK inflation',
				read: (h) => h.projection.inflation.UK,
				source: PRIOR,
				why: 'Long-run UK consumer prices.',
				...A_PRIOR
			},
			{
				id: 'inflation_in',
				name: 'India inflation',
				read: (h) => h.projection.inflation.IN,
				source: PRIOR,
				why: 'Long-run India prices; the gap also drifts the rupee.',
				...A_PRIOR
			}
		]
	}
];

const whole = (n: number): Decimal => String(Math.round(n));
const rate = (r: number) => `${String(Number((r * 100).toFixed(2)))}%`;
const curly = (text: string) => text.replace(/'/g, '’');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const roundTo = (n: number, unit: number) => Math.round(n / unit) * unit;
const written = (amount: Decimal, currency: RecordCurrency) => formatMoney(amount, currency, { whole: true });

/** An amount the figure set writes out ("£347 a month") as a figure the door can format and mask. */
function writtenFig(text: string, pre?: string): Fig {
	const [, symbol = '£', digits = '0', post = ''] = /^([£₹])([\d,]+)(.*)$/.exec(text) ?? [];
	return {
		amount: digits.replace(/,/g, ''),
		currency: symbol === '₹' ? 'INR' : 'GBP',
		...(pre ? { pre } : {}),
		...(post ? { post } : {})
	};
}

/** Years from today to the first of a month, as the board places a mark: today is its month and its days over 365. */
export function yearsTo(today: string, when: string): number {
	const [ty = 0, tm = 1, td = 1] = today.split('-').map(Number);
	const [y = 0, m = 1] = when.split('-').map(Number);
	return y + (m - 1) / 12 - (ty + (tm - 1) / 12 + (td - 1) / 365);
}

/** The top of the plot and its lines for a fan that peaks at `peak`: the peak at about nine tenths of the height, at
 * most four lines on round amounts, and room above the top line for its label. It gives the four scales Arun set for
 * the board on 25 Nov 2026 (£4.5m with £1m to £4m, £7m with £2m to £6m, ₹34 and ₹38 crore with ₹10 to ₹30 crore), and
 * the same rule for the horizons and money the board does not draw. */
export function fanScale(peak: number): { max: number; lines: number[] } {
	const room = peak / 0.9;
	let step = 0;
	for (let power = 10 ** Math.floor(Math.log10(room)) / 10; step === 0; power *= 10) {
		step = [1, 2, 5].map((n) => n * power).find((s) => Math.floor(room / s) <= 4) ?? 0;
	}
	const count = (max: number) => Math.ceil(max / step) - 1;
	const fitted = roundTo(room, step / 10);
	const max = Math.round(Math.max(fitted, count(fitted) * step + 0.4 * step));
	return { max, lines: Array.from({ length: count(max) }, (_, i) => Math.round((i + 1) * step)) };
}

/** A gridline's amount in a few words: "£1m", "₹10 crore". */
export function lineLabel(amount: number, currency: DisplayCurrency): string {
	if (currency === 'GBP') return formatMoney(whole(amount), 'GBP', { compact: true });
	const [size, unit] = amount >= 10_000_000 ? [10_000_000, 'crore'] : [100_000, 'lakh'];
	return `₹${String(Number((amount / size).toFixed(2)))} ${unit}`;
}

/** A year's figure in the money and currency asked for, `n` years on. Pounds of each year are the run's own. */
export function converter(
	h: StubHousehold,
	money: MoneyBasis,
	currency: DisplayCurrency
): (v: number, n: number) => number {
	const { UK, IN } = h.projection.inflation;
	if (currency === 'GBP') return money === 'nominal' ? (v) => v : (v, n) => roundTo(v / (1 + UK) ** n, 1000);
	// The engine drifts the rate by the inflation gap, so at today's prices the rupee figure is the pound figure at
	// today's rate (board P3); in the rupees of each year it carries India's inflation instead of the UK's.
	return money === 'today'
		? (v, n) => roundTo((v / (1 + UK) ** n) * h.fx, 100_000)
		: (v, n) => roundTo(v * h.fx * ((1 + IN) / (1 + UK)) ** n, 100_000);
}

function head(h: StubHousehold, years: Horizon, money: MoneyBasis, currency: DisplayCurrency): string {
	const run = `the engine’s run, ${RUN.when}`;
	const year = h.today.slice(0, 4);
	const rupee = `₹${h.fx.toFixed(2)} to the pound`;
	const over = `Net worth over the next ${String(years)} years`;
	if (currency === 'GBP') {
		return money === 'nominal'
			? `${over}, in the pounds of each year · ${run}`
			: `${over}, in pounds at ${year} prices: today’s money · ${run}`;
	}
	return money === 'today'
		? `In rupees at ${year} prices: today’s money, at ${rupee} (ECB, ${RATE_DAY}) · ${run}`
		: `${over}, in the rupees of each year, from ${rupee} today (ECB, ${RATE_DAY}) · ${run}`;
}

function latest(h: StubHousehold, target: StubCorrection['target'], id: string): StubCorrection | undefined {
	return h.corrections.findLast((c) => c.target === target && c.id === id);
}

const nameOf = (h: StubHousehold, id: string) => h.member(id)?.name ?? id;

/** One figure an admin may correct, as it stands: what the door edits, and the words its audit row will carry. */
interface Standing {
	spec: EditSpec;
	was: string;
	wasAmount?: StubCorrection['wasAmount'];
	audit: (value: string) => string;
}

function assumption(h: StubHousehold, row: AssumptionRow): { view: Assumption; standing: Standing } {
	const c = latest(h, 'assumption', row.id);
	const value = c ? `${c.value}%` : rate(row.read(h));
	const origin = c ? `set by ${nameOf(h, c.by)}` : row.origin;
	const spec: EditSpec = {
		target: 'assumption',
		id: row.id,
		kind: 'rate',
		title: row.name,
		field: `A year · now ${value}, ${origin}`,
		unit: '%',
		current: value.slice(0, -1),
		before: { text: value },
		...(row.hint ? { hint: row.hint } : {})
	};
	return {
		view: {
			id: row.id,
			name: row.name,
			value,
			source: c ? { kind: 'member', label: `Set by ${nameOf(h, c.by)}` } : row.source,
			why: c ? c.was : row.why
		},
		standing: {
			spec,
			was: `was ${value}, ${c ? origin : row.was}`,
			audit: (v) => `${row.name} ${value} → ${v}%`
		}
	};
}

function planItem(h: StubHousehold, p: StubPlanItem): { view: PlanItem; standing: Standing } {
	const c = latest(h, 'plan', p.id);
	const title = curly(p.what);
	const sign = p.amount < 0 ? '−' : '+';
	const [year = '', month = '1'] = p.when.split('-');
	const corrected = c
		? {
				corrected: {
					by: `Corrected by ${nameOf(h, c.by)}`,
					was: c.was,
					...(c.wasAmount ? { wasFig: c.wasAmount } : {})
				}
			}
		: {};
	const shared = { id: p.id, icon: PLAN_ICON[p.id] ?? 'calendar', title };

	if (p.repeat) {
		// A recurring item's correction in place is its growth, as board P6 draws it.
		const amount = whole(Math.abs(p.amount));
		const every = `Every ${MONTHS[Number(month) - 1] ?? ''}, ${year} to ${(p.until ?? '').slice(0, 4)}`;
		const grows = c ? `${c.value}% a year` : undefined;
		// The board's hint for the bonus is Asha's own salary growth, as the assumptions hold it now.
		const pay = assumption(h, PAY_ASHA).view;
		return {
			view: {
				...shared,
				when: grows ? `${every} · grows ${grows}` : every,
				fig: { amount, currency: p.ccy, pre: sign },
				...corrected
			},
			standing: {
				spec: {
					target: 'plan',
					id: p.id,
					kind: 'rate',
					title: `${title} · ${sign}${written(amount, p.ccy)} ${lowerFirst(every)}`,
					field: 'Grows each year',
					unit: '% a year',
					...(c ? { current: c.value } : {}),
					before: { text: grows ?? 'No growth' },
					hint: `${pay.name} is ${pay.value} a year, from the assumptions.`
				},
				was: grows ? `was ${grows}` : 'was no growth',
				audit: (v) => `Plan item corrected · ${title}: growth ${grows ?? 'none'} → ${v}% a year`
			}
		};
	}

	// A one-off's correction in place is its amount; a spend stays a spend.
	const amount = c ? c.value : whole(Math.abs(p.amount));
	const once = `Once, ${dayParts(`${p.when}-01`).month} ${year}`;
	const now = { amount, currency: p.ccy, pre: sign };
	return {
		view: { ...shared, when: once, fig: now, ...corrected },
		standing: {
			spec: {
				target: 'plan',
				id: p.id,
				kind: 'amount',
				title: `${title} · ${sign}${written(amount, p.ccy)} ${lowerFirst(once)}`,
				field: 'The amount',
				unit: '',
				lead: `${sign}${SYMBOL[p.ccy]}`,
				sign,
				currency: p.ccy,
				current: amount,
				before: { fig: now }
			},
			was: 'was',
			wasAmount: now,
			audit: (v) =>
				`Plan item corrected · ${title}: amount ${sign}${written(amount, p.ccy)} → ${sign}${written(v, p.ccy)}`
		}
	};
}

function fan(h: StubHousehold, years: Horizon, money: MoneyBasis, currency: DisplayCurrency, marks: FanMark[]): Fan {
	const base = Number(h.today.slice(0, 4));
	const to = converter(h, money, currency);
	// Today is the figure set's own total, in pounds and in rupees; each year after is the run's.
	const start = currency === 'INR' ? h.projectionStartInr : h.projection.start_net_gbp;
	const rows = [
		{ year: base, low: start, mid: start, high: start },
		...RUN.fan
			.map((r) => ({ r, n: r.year - base }))
			.filter(({ n }) => n >= 1 && n <= years)
			.map(({ r, n }) => ({ year: r.year, low: to(r.p10, n), mid: to(r.p50, n), high: to(r.p90, n) }))
	];
	const end = rows.at(-1) ?? { year: base, low: start, mid: start, high: start };
	// The scale is fitted to where the band ends, as the board's are; in today's money an earlier year can stand a
	// little higher, and the scale is fitted to that year instead only if it would not fit.
	const peak = Math.max(...rows.map((r) => r.high));
	const fitted = fanScale(end.high);
	const scale = fitted.max > peak ? fitted : fanScale(peak);
	const say = (n: number) => written(whole(n), currency);
	const last = String(base + years);
	const axis: FanTick[] = AXIS[years].at.map((n) => ({
		label: n === 0 ? 'Today' : String(base + n),
		at: n / years,
		...(AXIS[years].minor.includes(n) ? { minor: true } : {})
	}));
	return {
		years,
		currency,
		max: whole(scale.max),
		points: rows.map((r) => ({ year: r.year, low: whole(r.low), mid: whole(r.mid), high: whole(r.high) })),
		lines: scale.lines.map((amount) => ({ amount: whole(amount), label: lineLabel(amount, currency) })),
		axis,
		marks,
		aria: `Net worth to ${last}: the middle path from ${say(start)} to ${say(end.mid)}, with 8 in 10 runs between ${say(end.low)} and ${say(end.high)}; milestones listed below.`,
		ariaPrivate: `Net worth to ${last}: amounts hidden in privacy mode; milestones listed below.`
	};
}

function saved(h: StubHousehold, target: StubCorrection['target']): { saved?: Saved } {
	const last = h.corrections.at(-1);
	return last?.target === target ? { saved: { text: SAVED, audit: last.audit } } : {};
}

export function buildProjection(
	h: StubHousehold,
	horizon: Horizon,
	money: MoneyBasis,
	currency: DisplayCurrency
): Projection {
	const me = h.member(h.me);
	const admin = h.members.find((m) => m.admin)?.name ?? '';
	const canEdit = me?.admin === true;
	// The set's plan items as they stand on the Plans view (MA-222): moved, paused or ended there; an ended one is gone.
	const setItems = h.projection.plan_items.filter((p) => statusOf(h, p.id) !== 'ended').map((p) => movedSetItem(h, p));
	const labelled = horizon === 30 ? LABELLED.far : currency === 'INR' ? [] : LABELLED.near;
	const editable = <T extends object>(x: { view: T; standing: Standing }): T =>
		canEdit ? { ...x.view, edit: x.standing.spec } : x.view;

	const dated = h.projection.milestones
		.map((m) => ({ m, at: yearsTo(h.today, m.when), look: MILESTONES[m.when] ?? UNMARKED }))
		.filter(({ at }) => at <= horizon);
	const milestones: Milestone[] = dated.map(({ m, look }) => ({
		id: m.when,
		icon: look.icon,
		title: curly(m.what),
		shape: look.shape,
		when: `${shortDay(m.when)} ${m.when.slice(0, 4)}`,
		...(look.note ? { note: look.note } : {}),
		...(m.frees ? { noteFig: writtenFig(m.frees, 'frees ') } : {}),
		...(m.amount ? { fig: writtenFig(m.amount) } : {})
	}));
	const marks: FanMark[] = [
		...dated.map(({ m, at, look }) => ({
			id: m.when,
			shape: look.shape,
			at,
			...(look.label && labelled.includes(m.when) ? { label: look.label } : {})
		})),
		// A one-off plan item is a square on the line at its month; a recurring one has no single place.
		...setItems
			.filter((p) => !p.repeat)
			.map((p) => ({ id: p.id, shape: 'square' as const, at: yearsTo(h.today, p.when) }))
			.filter(({ at }) => at <= horizon),
		// A plan item the chat added is a square where it starts (MA-222).
		...standingPlans(h)
			.filter((p) => !p.fromSet && p.status !== 'ended')
			.map((p) => ({ id: p.id, shape: 'square' as const, at: yearsTo(h.today, p.start) }))
			.filter(({ at }) => at <= horizon)
	];

	const drawn = fan(h, horizon, money, currency, marks);
	const end = drawn.points.at(-1);
	const from = drawn.points[0];
	const amount = (value: Decimal | undefined): Fig => ({ amount: value ?? '0', currency });
	const last = String(Number(h.today.slice(0, 4)) + horizon);
	const groups: AssumptionGroup[] = ASSUMPTIONS.map((g) => ({
		title: g.title,
		rows: g.rows.map((row) => editable(assumption(h, row)))
	}));

	return {
		empty: h.empty,
		head: head(h, horizon, money, currency),
		horizon,
		money,
		currency,
		hero: {
			over: `Middle path in ${last}${money === 'today' ? ', in today’s money' : ''}`,
			mid: amount(end?.mid),
			from: amount(from?.mid),
			low: amount(end?.low),
			high: amount(end?.high)
		},
		fan: drawn,
		chips: CHIPS,
		milestones,
		plan: {
			aside: canEdit ? 'yours to change, as an admin' : `${admin}’s, the admin’s`,
			items: [
				...setItems.map((p) => {
					const item = editable(planItem(h, p));
					return statusOf(h, p.id) === 'paused' ? { ...item, when: `${item.when} · paused, not counted` } : item;
				}),
				...addedPlanItems(h)
			],
			canAdd: canEdit,
			...(canEdit
				? {}
				: {
						note: `Plan items are ${admin}’s, the admin’s. You see them on the line; ask a what-if in the chat to try your own.`
					}),
			...saved(h, 'plan')
		},
		assumptions: {
			note: canEdit
				? 'Click a figure to correct it. Only an admin can; each change is audited.'
				: `${admin} keeps these figures. Ask in the chat to see what other figures would do.`,
			locked: !canEdit,
			groups,
			...saved(h, 'assumption')
		},
		foot: FOOT
	};
}

/** Keeps an admin's correction in place, as the write service would: checked, then recorded with its audit line. The
 * stored run is not run again (see the note at the top), so the next read shows the corrected row and the same fan. */
export function correctProjection(h: StubHousehold, correction: ProjectionCorrection, at: Date): void {
	// A plan figure the Plans view keeps (its start, end, a flow's amount; MA-222) is corrected there.
	if (isPlanPart(h, correction)) {
		correctPlan(h, correction, at);
		return;
	}
	const who = h.member(h.me);
	if (who?.admin !== true) throw new Error('Only an admin corrects a figure of the Projection.');
	const standing =
		correction.target === 'assumption'
			? ASSUMPTIONS.flatMap((g) => g.rows)
					.filter((row) => row.id === correction.id)
					.map((row) => assumption(h, row).standing)[0]
			: h.projection.plan_items.filter((p) => p.id === correction.id).map((p) => planItem(h, p).standing)[0];
	if (!standing) throw new Error('The Projection has no such figure.');
	const value = parseTyped(standing.spec, correction.value);
	if (value === undefined || value === standing.spec.current) throw new Error('Not a new value for this figure.');
	h.correct({
		target: correction.target,
		id: correction.id,
		value,
		by: who.id,
		at,
		was: standing.was,
		...(standing.wasAmount ? { wasAmount: standing.wasAmount } : {}),
		audit: `Audit · ${standing.audit(value)} · ${who.name} · ${dayLabel(h.today)} ${timeOf(at)} · edited in place`
	});
}
