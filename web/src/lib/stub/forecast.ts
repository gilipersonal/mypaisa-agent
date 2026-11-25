/** The Projection's Budget forecast view from the stub household (MA-262; board Web v4 · Budget forecast, 1a the surplus
 * first, and its states board). Every figure is the figure set's own (`future-plans-v4.json`'s `forecast`, copied to
 * `future-plans.json` and held equal by a test): each year's and each month's lines as the illustrative engine wrote
 * them, under "All to cash". Three runs of Thu 5 Nov are there, each a state the boards draw:
 *
 * - `R1`, 20:43, just after the school fees are saved: the picked board's own state, and the stub's;
 * - `R2`, 20:46, after the School fees pot is applied (board S1 to S7);
 * - `W`, 21:18, after the wedding is saved and its way undone, cash flagged again (board S9).
 *
 * Nothing here is an engine. Rupees and today's money are worked out as the states board says it does: each line is the
 * year's pounds at its factor (the year's average projected rate, or UK inflation's deflator), rounded, and a total is
 * the sum of the lines shown, so a year's lines always add up to its surplus. */
import { formatMoney } from '#lib/formatting/money.ts';
import { hideAmounts } from '#lib/privacy/mask.ts';
import type { DisplayCurrency, Fig } from '#lib/wealth/overview.ts';
import type {
	BudgetForecast,
	ForecastBar,
	ForecastChart,
	ForecastFact,
	ForecastGridLine,
	ForecastLine,
	ForecastMonth,
	ForecastNote,
	ForecastPot,
	ForecastTrace,
	ForecastYear,
	Said
} from '#lib/wealth/forecast.ts';
import type { Horizon, MoneyBasis } from '#lib/wealth/projection.ts';
import plans from './future-plans.json';
import type { StubHousehold } from './household.ts';

/** Which of the evening's runs the stub shows. */
export type ForecastRun = 'R1' | 'R2' | 'W';
export const FORECAST_RUNS: readonly ForecastRun[] = ['R1', 'R2', 'W'];

type Flows = Record<string, number>;

/** A year or a month of a run, as the figure set writes it. */
interface Period {
	income: Flows;
	spend: Flows;
	emis: Flows;
	sip: number;
	premium: number;
	plans: Flows;
	to_pot: number;
	from_pot: number;
	from_investments: number;
	surplus: number;
	savings_rate: number;
	one_offs: Flows;
	maturities: Flows;
	closing_cash: number;
	below_floor: number;
	lowest_month: string;
	lowest_surplus: number;
	cash_negative: string | null;
	fx_avg: number;
	deflator: number;
}
interface YearFigures extends Period {
	year: number;
	span: string;
	below_floor_months: string[];
}
interface MonthFigures extends Period {
	month: string;
}
type RunFigures = { years: YearFigures[] } & Partial<Record<`months_${number}`, MonthFigures[]>>;

const SET = plans as unknown as {
	settings: {
		floor_gbp_month: number;
		retirement: string;
		inflation_keys: { UK: number } & Record<string, number>;
		categories: { category: string; inflation_key: string; plan_today: number; ccy: 'GBP' | 'INR' }[];
	};
	clock: { day_label: string; fx: number };
	runs: Record<'R1' | 'R2', { when: string }>;
	plans: { schooling: { what: string; amount: number; start: string; growth: { pct: number } | null } };
	rearrange: { first: string; last: string };
	evening2: {
		wedding: {
			plan: { id: string; what: string; start: string };
			undone: { when: string };
			negative_months: [string, number][];
			cash_back_above_zero: string;
		};
	};
	forecast: Record<ForecastRun, RunFigures>;
};

const FLOOR = SET.settings.floor_gbp_month;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
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
/** The axis's years at each horizon, as the boards place them (board S4). */
const TICKS: Record<Horizon, number[]> = {
	5: [0, 1, 2, 3, 4],
	10: [0, 3, 6, 9],
	20: [0, 4, 9, 14, 19],
	30: [0, 9, 19, 29]
};
/** The loans' short names, as the year's EMIs line writes them. */
const LOAN: Record<string, { short: string; the: string }> = {
	'Mortgage · Nationwide': { short: 'Mortgage', the: 'the mortgage' },
	'Car loan · Close Brothers': { short: 'Car loan', the: 'the car loan' },
	'Home loan · HDFC': { short: 'HDFC', the: 'the HDFC loan' }
};
/** What a maturity is called in a sentence, as the boards say it. */
const MATURITY: Record<string, string> = {
	'Fixed deposit · SBI': 'the SBI FD',
	'PPF · SBI': 'the PPF',
	'LIC Jeevan Anand': 'LIC',
	'Fixed-rate saver': 'Asha’s saver'
};
const NOTE_SPEND =
	'Each category’s plan from October, grown by its inflation key each January. Added up, they make the figure you tapped.';

const curly = (text: string) => text.replace(/'/g, '’');
const pc1 = (x: number) => `${x < 0 ? '−' : ''}${(Math.round(Math.abs(x) * 1000) / 10).toFixed(1)}%`;
/** An amount as the door shows it: the minus is the board's, before the currency. */
export function amountFig(n: number, currency: DisplayCurrency | 'GBP' | 'INR', pre = ''): Fig {
	const sign = n < 0 ? '−' : '';
	const lead = `${pre}${sign}`;
	return { amount: String(Math.abs(Math.round(n))), currency, ...(lead ? { pre: lead } : {}) };
}
/** An amount as a screen reader hears it: "−£903". */
const spoken = (fig: Fig) => `${fig.pre ?? ''}${formatMoney(fig.amount, fig.currency, { whole: true })}`;
const text = (t: string): Said => ({ text: t });
const said = (n: number, currency: DisplayCurrency | 'GBP' | 'INR', pre = ''): Said => ({
	fig: amountFig(n, currency, pre)
});
/** A month's name and year: "Jan 2029". */
const monthOf = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1] ?? ''} ${iso.slice(0, 4)}`;

/** The factor that turns a period's pounds into the money and currency asked for. */
function factor(money: MoneyBasis, currency: DisplayCurrency): (p: Period) => number {
	if (currency === 'GBP') return money === 'today' ? (p) => p.deflator : () => 1;
	return money === 'today' ? (p) => p.deflator * SET.clock.fx : (p) => p.fx_avg;
}

function runWhen(run: ForecastRun): string {
	return run === 'W' ? `${SET.clock.day_label} ${SET.evening2.wedding.undone.when}` : SET.runs[run].when;
}

/** The last year anyone in the household earns a salary: the floor holds to its end (Arun, 28 Oct 2026). */
function floorTo(h: StubHousehold, years: YearFigures[]): number {
	const names = h.members.map((m) => m.name);
	return Math.max(...years.filter((y) => names.some((n) => n in y.income)).map((y) => y.year));
}

/** The first year cash goes below zero; failing that, the year of the leanest month. */
function defaultYear(rows: YearFigures[]): number {
	const short = rows.find((r) => r.cash_negative !== null);
	if (short) return short.year;
	return rows.reduce((a, r) => (r.lowest_surplus < a.lowest_surplus ? r : a)).year;
}

/** Where cash goes below zero in a run, as the figure set says it: the months, and the month it is back. */
function cashShort(run: ForecastRun): { months: [string, number][]; back: string } | undefined {
	return run === 'W'
		? { months: SET.evening2.wedding.negative_months, back: SET.evening2.wedding.cash_back_above_zero }
		: undefined;
}

interface Ctx {
	h: StubHousehold;
	run: ForecastRun;
	money: MoneyBasis;
	currency: DisplayCurrency;
	k: (p: Period) => number;
	whose: string;
	admin: string;
	canEdit: boolean;
	floorTo: number;
}

const unitOfYears = (c: Ctx) =>
	c.currency === 'GBP'
		? c.money === 'today'
			? 'in today’s pounds'
			: 'in pounds of each year'
		: c.money === 'today'
			? `in today’s rupees, at ₹${SET.clock.fx.toFixed(2)} to the pound`
			: 'in rupees at each year’s projected rate';

function chart(c: Ctx, all: YearFigures[], rows: YearFigures[], years: Horizon, selected: number): ForecastChart {
	const inr = c.currency === 'INR';
	const [lo, hi] = inr ? [-100_000, 600_000] : [-1000, 4000];
	const yp = (v: number) => (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo);
	const zero = yp(0);
	const retired = rows.some((r) => r.year > c.floorTo);
	const line = c.currency === 'GBP' && c.money === 'nominal' && !retired;
	const leanest = (r: YearFigures) => Math.round(r.lowest_surplus * c.k(r));
	const floorIn = (r: YearFigures) => Math.round(FLOOR * c.k(r));

	const bars: ForecastBar[] = rows.map((r) => {
		const v = leanest(r);
		const rt = r.year > c.floorTo;
		const tone = rt ? 'rt' : r.below_floor > 0 ? 'lo' : 'ok';
		const fig = amountFig(v, c.currency);
		const where = rt
			? 'no floor, everyone retired'
			: tone === 'lo'
				? `below ${c.whose} in ${String(r.below_floor)} ${r.below_floor === 1 ? 'month' : 'months'}`
				: `no month below ${c.whose}`;
		const cash = r.cash_negative ? `; cash below zero from ${r.cash_negative}` : '';
		const words = (amount: string) =>
			`${String(r.year)}: leanest month ${amount}, in ${r.lowest_month}; ${where}${cash}`;
		return {
			year: r.year,
			fig,
			from: Math.min(zero, yp(v)),
			to: Math.max(zero, yp(v)),
			tone,
			capTop: v > hi,
			capFoot: v < lo,
			...(line || rt ? {} : { floorAt: yp(floorIn(r)) }),
			cashBelow: r.cash_negative !== null,
			aria: words(spoken(fig)),
			ariaPrivate: words('hidden')
		};
	});

	const label = (n: number) =>
		inr
			? `${n < 0 ? '−' : ''}₹${String(Math.abs(n) / 100_000)} lakh`
			: `${n < 0 ? '−' : ''}£${String(Math.abs(n) / 1000)}k`;
	const grid: ForecastGridLine[] = [hi, hi / 2, 0, lo].map((n) => ({
		at: yp(n),
		label: n === 0 ? (inr ? '₹0' : '£0') : label(n),
		kind: n === 0 ? 'zero' : n === lo ? 'foot' : 'line'
	}));
	if (line) grid.splice(2, 0, { at: yp(FLOOR), label: `£${String(FLOOR)}`, kind: 'floor' });

	const first = rows[0]?.year ?? 0;
	const last = rows.at(-1)?.year ?? 0;
	const Whose = c.whose.charAt(0).toUpperCase() + c.whose.slice(1);
	const floorWords = line
		? `${Whose}, £${String(FLOOR)} a month`
		: retired
			? `${Whose}, £${String(FLOOR)} a month, while anyone earns a salary`
			: inr
				? `${Whose}, £${String(FLOOR)} a month at each year’s rate`
				: `${Whose}, £${String(FLOOR)}, in today’s money`;
	const legend: ForecastChart['legend'] = [
		{ key: 'ok', text: `At or above ${c.whose}`, textPrivate: `At or above ${c.whose}` },
		{ key: 'lo', text: '▼ Below it', textPrivate: '▼ Below it' },
		{ key: line ? 'floor' : 'floor-dash', text: floorWords, textPrivate: Whose }
	];
	if (retired) legend.push({ key: 'retired', text: 'Both retired: no floor', textPrivate: 'Both retired: no floor' });
	legend.push({ key: 'selected', text: `${String(selected)}, selected`, textPrivate: `${String(selected)}, selected` });

	const flags: ForecastChart['flags'] = [];
	const below = rows.filter((r) => r.below_floor > 0);
	const belowMonths = below.flatMap((r) => r.below_floor_months);
	if (belowMonths.length > 0) {
		flags.push({
			text: `▼ Below ${c.whose}`,
			said: [text(`in ${String(belowMonths.length)} months, ${belowMonths[0] ?? ''} to ${belowMonths.at(-1) ?? ''}`)]
		});
	}
	const short = cashShort(c.run);
	const shortInView = short?.months.filter(([m]) => Number(m.slice(-4)) <= last) ?? [];
	const cashYears = rows.filter((r) => r.cash_negative !== null);
	if (short && shortInView.length > 0) {
		const worst = shortInView.reduce((a, m) => (m[1] < a[1] ? m : a));
		const worstRow = all.find((r) => r.year === Number(worst[0].slice(-4)));
		const k = worstRow ? c.k(worstRow) : 1;
		flags.push({
			text: '▼ Cash below zero',
			said: [
				text(`${shortInView[0]?.[0] ?? ''} to ${shortInView.at(-1)?.[0] ?? ''}, at worst `),
				said(worst[1] * k, c.currency),
				text(` in ${worst[0]}`)
			]
		});
	}
	if (cashYears.length > 0)
		legend.push({ key: 'cash', text: 'Cash below zero in the year', textPrivate: 'Cash below zero in the year' });

	const notes: ForecastNote[] = [];
	const span = (rs: YearFigures[]) =>
		`${String(rs[0]?.year ?? '')}${rs.length > 1 ? ` to ${String(rs.at(-1)?.year ?? '')}` : ''}`;
	const over = rows.filter((r) => leanest(r) > hi);
	if (over.length > 0) {
		notes.push({
			said: [
				text(
					`${span(over)} run past ${inr ? '₹6 lakh' : '£4,000'} a month at their leanest, so they are drawn with a break.`
				)
			],
			hidden: true
		});
	}
	const underFoot = rows.filter((r) => leanest(r) < lo);
	if (underFoot.length > 0) {
		notes.push({
			said: [
				text(
					`${span(underFoot)} fall below ${inr ? '−₹1 lakh' : '−£1,000'} a month at their leanest, so they are drawn with a break.`
				)
			],
			hidden: true
		});
	}
	const sel = rows.find((r) => r.year === selected) ?? rows[0];
	if (inr && c.money === 'nominal' && sel) {
		notes.push({
			said: [
				text(
					`In rupees, each year at its average projected rate (£1 = ₹${SET.clock.fx.toFixed(2)} today, drifting with the inflation gap), so the `
				),
				said(FLOOR, 'GBP'),
				text(' floor is a dash on each bar: '),
				said(floorIn(sel), 'INR'),
				text(` in ${String(sel.year)}.`)
			]
		});
	}
	const lastRow = rows.at(-1);
	if (c.money === 'today' && sel && lastRow) {
		notes.push({
			said: [
				text(
					`In today’s money: each year’s pounds at UK prices of 2026 (${String(SET.settings.inflation_keys.UK * 100)}% a year), so ${c.whose}, `
				),
				said(FLOOR, 'GBP'),
				text(' in pounds of each year, shrinks as prices rise: a dash on each bar, '),
				said(floorIn(sel), c.currency),
				text(` in ${String(sel.year)} and `),
				said(floorIn(lastRow), c.currency),
				text(` in ${String(lastRow.year)}.`)
			]
		});
	}
	if (retired) notes.push({ said: [text(retirementNote(c, all, last))] });
	const pot = potWords(all);
	if (pot && c.currency === 'GBP' && c.money === 'nominal') {
		const into = all.filter((r) => r.to_pot > 0);
		notes.push({
			said: [
				text('The pot: '),
				said(pot.monthly, 'GBP'),
				text(` a month into it, ${pot.from} to ${pot.to} (`),
				...into.flatMap((r, n) => [
					...(n > 0 ? [text(n === into.length - 1 ? ' and ' : ', ')] : []),
					said(-r.to_pot, 'GBP'),
					text(` in ${String(r.year)}`)
				]),
				text(`); out of it to the floor from ${SET.rearrange.first} to ${SET.rearrange.last}.`)
			]
		});
	}
	if (short && shortInView.length > 0) notes.push({ said: oneOffsNote(c, all, short) });

	const aria = [
		`The leanest month of each year from ${String(first)} to ${String(last)}, ${unitOfYears(c)}, against ${c.whose} of £${String(FLOOR)} a month.`,
		below.length > 0
			? `Below it in ${below.map((r) => `${String(r.year)}, ${spoken(amountFig(leanest(r), c.currency))}`).join('; ')}.`
			: `No year in view is below it.`,
		retired ? `From ${String(c.floorTo + 1)}, with everyone retired, there is no floor.` : '',
		cashYears.length > 0 ? `Cash goes below zero in ${cashYears.map((r) => String(r.year)).join(', ')}.` : ''
	]
		.filter(Boolean)
		.join(' ');

	return {
		title: 'Your leanest month, each year',
		sub: `${String(first)} to ${String(last)} · against ${c.whose}`,
		flags,
		bars,
		grid,
		axis: TICKS[years].map((i) => ({ label: String(rows[i]?.year ?? ''), at: (i + 0.5) / years })),
		legend,
		wide: inr,
		cashStrip: cashYears.length > 0,
		notes,
		aria,
		ariaPrivate: hideAmounts(aria, true)
	};
}

function retirementNote(c: Ctx, all: YearFigures[], last: number): string {
	const out = [...SET.settings.retirement.matchAll(/([A-Z][a-z]+)(?: \d+)? in ([A-Z][a-z]{2} \d{4})/g)].map(
		(m) => `${m[1] ?? ''} retires in ${m[2] ?? ''}`
	);
	const later = all.filter((r) => r.year > c.floorTo && r.year <= last);
	const short = later.find((r) => r.cash_negative !== null);
	const Whose = c.whose.charAt(0).toUpperCase() + c.whose.slice(1);
	return [
		`${out.join(' and ')}.`,
		`${Whose} holds while either of you earns a salary, to Dec ${String(c.floorTo)}.`,
		`From ${String(c.floorTo + 1)} your pensions pay 4% of their pots a year and cash pays the rest of the budget, so the surplus is below £0: those years carry no floor, and only cash running out would be flagged.`,
		short ? `Cash goes below zero in ${short.cash_negative ?? ''}.` : `Cash stays above zero to ${String(last)}.`
	].join(' ');
}

/** What the pot does, from the run itself: its monthly amount and the months it fills. */
function potWords(all: YearFigures[]): { monthly: number; from: string; to: string } | undefined {
	const into = all.filter((r) => r.to_pot > 0);
	const firstInto = into[0];
	const lastInto = into.at(-1);
	if (!firstInto || !lastInto) return undefined;
	const full = into.find((r) => r.span === 'Jan–Dec') ?? firstInto;
	const months = full.span === 'Jan–Dec' ? 12 : 2;
	return {
		monthly: Math.round(full.to_pot / months),
		from: `${firstInto.span.slice(0, 3)} ${String(firstInto.year)}`,
		to: `${lastInto.span.slice(-3)} ${String(lastInto.year)}`
	};
}

function oneOffsNote(c: Ctx, all: YearFigures[], short: { months: [string, number][]; back: string }): Said[] {
	const firstShort = short.months[0]?.[0] ?? '';
	const row = all.find((r) => r.year === Number(firstShort.slice(-4)));
	const offs = Object.entries(row?.one_offs ?? {});
	const k = row ? c.k(row) : 1;
	return [
		...offs.flatMap(([name, n], i) => {
			const one = oneOff(c.h, name);
			return [
				text(`${i === 0 ? 'The' : ', and the'} ${lowerFirst(oneOffName(one.what))}, `),
				said(-n * k, c.currency),
				text(` in ${one.when ? monthOf(one.when) : String(row?.year ?? '')}`)
			];
		}),
		text(
			`, ${offs.length > 1 ? 'are' : 'is'} paid from cash, which runs out in ${firstShort} and is back above zero in ${short.back}.`
		)
	];
}

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
/** A one-off's name in a sentence, as the boards shorten it: "the wedding", "the extension". */
const oneOffName = (name: string) =>
	curly(name)
		.replace(/^Sister’s /, '')
		.replace(/^Home /, '');

/** Each one-off plan item, by the name the run gives it (its name, or the evening's id for the wedding): what it is
 * called and the month it is paid. */
function oneOffs(h: StubHousehold): Record<string, { what: string; when: string }> {
	const out: Record<string, { what: string; when: string }> = {};
	const w = SET.evening2.wedding.plan;
	const items = [
		...h.projection.plan_items.filter((p) => !p.repeat).map((p) => ({ id: p.id, what: p.what, when: p.when })),
		{ id: w.id, what: w.what, when: w.start }
	];
	for (const p of items) {
		const one = { what: curly(p.what), when: p.when };
		out[curly(p.what)] = one;
		out[p.id] = one;
	}
	return out;
}
const oneOff = (h: StubHousehold, name: string) => oneOffs(h)[curly(name)] ?? { what: curly(name), when: '' };

function line(
	id: string,
	title: string,
	sub: Said[],
	n: number,
	c: Ctx,
	extra: Partial<ForecastLine> = {}
): ForecastLine {
	return { id, title, sub, fig: amountFig(n, c.currency), plan: false, traced: false, ...extra };
}

/** Parts with their names: "Arun £59,395 · Asha £40,236"; each part converted and rounded, the total their sum. */
function parts(flows: Flows, k: number, c: Ctx, name: (n: string) => string = curly): { sub: Said[]; total: number } {
	const each = Object.entries(flows).map(([n, v]) => ({ n: name(n), v: Math.round(v * k) }));
	return {
		sub: each.flatMap((p, i) => [text(`${i > 0 ? ' · ' : ''}${p.n} `), said(p.v, c.currency)]),
		total: each.reduce((a, p) => a + p.v, 0)
	};
}

function yearCard(c: Ctx, all: YearFigures[], r: YearFigures, run: RunFigures): ForecastYear {
	const k = c.k(r);
	const cv = (n: number) => Math.round(n * k);
	const lines: ForecastLine[] = [];
	const income = parts(r.income, k, c);
	lines.push(line('income', 'Income', income.sub, income.total, c));
	const spend = Object.values(r.spend).reduce((a, v) => a + Math.round(v * k), 0);
	lines.push(
		line(
			'spend',
			'Spending',
			[text(`${String(Object.keys(r.spend).length)} categories, each with its inflation key`)],
			-spend,
			c,
			{ traced: true }
		)
	);
	if (Object.keys(r.emis).length > 0) {
		const emis = parts(r.emis, k, c, (n) => LOAN[n]?.short ?? n);
		lines.push(line('emis', 'EMIs', emis.sub, -emis.total, c));
	}
	if (r.sip > 0 || r.premium > 0) {
		const sip = cv(r.sip);
		const prem = cv(r.premium);
		lines.push(
			line(
				'sip',
				r.premium > 0 ? 'SIP and LIC’s premium' : 'SIP',
				[
					text('Parag Parikh '),
					said(sip, c.currency),
					...(r.premium > 0 ? [text(' · LIC '), said(prem, c.currency), text(' in March')] : [])
				],
				-(sip + prem),
				c
			)
		);
	}
	const school = SET.plans.schooling;
	const saved = SET.runs.R1.when.slice(-5);
	for (const [name, n] of Object.entries(r.plans)) {
		const sub =
			name === school.what
				? [
						text(`Your plan, saved at ${saved} · `),
						said(school.amount, 'GBP'),
						text(
							` a month from ${monthOf(school.start)}${school.growth ? `, ${String(school.growth.pct * 100)}% a year` : ''}`
						)
					]
				: [text('Your plan')];
		lines.push(line(`plan-${name}`, curly(name), sub, cv(n), c, { plan: true }));
	}
	const pot = potWords(all);
	if (r.to_pot > 0 && pot) {
		lines.push(
			line(
				'to-pot',
				`Into the ${school.what} pot`,
				[said(pot.monthly, 'GBP'), text(` a month, ${pot.from} to ${pot.to}`)],
				-cv(r.to_pot),
				c,
				{
					plan: true
				}
			)
		);
	}
	if (r.from_pot > 0) {
		lines.push(
			line(
				'from-pot',
				`From the ${school.what} pot`,
				[text(`tops the surplus up to ${c.whose}, ${SET.rearrange.first} to ${SET.rearrange.last}`)],
				cv(r.from_pot),
				c,
				{ plan: true }
			)
		);
	}
	if (r.from_investments > 0) {
		lines.push(
			line('from-isa', 'From Balanced (ISA)', [text('pays what cash cannot')], cv(r.from_investments), c, {
				plan: true
			})
		);
	}
	const surplus = lines.reduce((a, l) => a + Number(l.fig.amount) * (l.fig.pre === '−' ? -1 : 1), 0);

	const fromCash: ForecastYear['fromCash'] = Object.entries(r.one_offs).map(([name, n]) => {
		const one = oneOff(c.h, name);
		const month = one.when ? MONTH_NAMES[Number(one.when.slice(5, 7)) - 1] : undefined;
		return {
			label: one.what,
			sub: month ? `${month}, from cash` : 'from cash',
			said: [said(cv(n), c.currency)],
			alert: false
		};
	});
	const lastMonth = r.span.slice(-3);
	const cashLabel = `Cash, end of ${MONTH_NAMES[MONTHS.indexOf(lastMonth)] ?? 'December'}`;
	if (r.closing_cash < 0) {
		fromCash.push({
			label: cashLabel,
			sub: `after the surplus and ${fromCash.length > 1 ? 'the one-offs' : 'the one-off'}`,
			said: [said(cv(r.closing_cash), c.currency)],
			alert: true
		});
	}
	const facts: ForecastFact[] = [{ label: 'Savings rate', said: [text(pc1(r.savings_rate))] }];
	if (r.closing_cash >= 0) facts.push({ label: cashLabel, said: [said(cv(r.closing_cash), c.currency)] });
	facts.push({
		label: 'Leanest month',
		said: [text(`${r.lowest_month.slice(0, 3)}, `), said(cv(r.lowest_surplus), c.currency)],
		alert: r.below_floor > 0
	});

	const retired = r.year > c.floorTo;
	const chip = retired
		? { text: 'Retired: no floor', alert: false }
		: r.cash_negative
			? { text: `▼ Cash below zero from ${r.cash_negative.slice(0, 3)}`, alert: true }
			: r.below_floor > 0
				? {
						text: `▼ ${String(r.below_floor)} ${r.below_floor === 1 ? 'month' : 'months'} below ${c.whose}`,
						alert: true
					}
				: r.from_pot > 0
					? { text: `At ${c.whose} all year`, alert: false }
					: { text: `No month below ${c.whose}`, alert: false };
	const unit =
		c.currency === 'GBP'
			? c.money === 'today'
				? 'in today’s pounds'
				: `in pounds of ${String(r.year)}`
			: c.money === 'today'
				? 'in today’s rupees'
				: `in rupees, at ${String(r.year)}’s projected rate`;
	const months = run[`months_${String(r.year)}` as `months_${number}`];
	const flagged = !retired && (r.below_floor > 0 || r.cash_negative !== null);
	return {
		year: r.year,
		title: String(r.year),
		chip,
		meta: `${r.span.replace('–', ' to ')}, ${unit} · tap a figure to see what makes it`,
		lines,
		surplus: amountFig(surplus, c.currency),
		surplusNote: 'the lines above, added',
		negative: surplus < 0,
		fromCash,
		facts,
		...(months ? { months: monthsCard(c, r, months) } : {}),
		canCover: c.canEdit && flagged,
		...(c.canEdit
			? {}
			: { lock: `Plans and the ways to cover them are ${c.admin}’s. You can ask about them in the chat.` })
	};
}

function monthsCard(c: Ctx, r: YearFigures, months: MonthFigures[]): NonNullable<ForecastYear['months']> {
	const cashMode = r.cash_negative !== null;
	const names = c.h.members.map((m) => m.name);
	const rows: ForecastMonth[] = months.map((m, i) => {
		const k = c.k(m);
		const prev = months[i - 1];
		const next = months[i + 1];
		const notes: Said[][] = [];
		for (const name of Object.keys(m.one_offs)) {
			notes.push([text(`${oneOffName(oneOff(c.h, name).what).replace(/^./, (x) => x.toUpperCase())} paid`)]);
		}
		if (!cashMode) {
			for (const name of Object.keys(m.income).filter((n) => /bonus/i.test(n))) notes.push([text(curly(name))]);
		}
		for (const [name, n] of Object.entries(m.maturities)) {
			notes.push([text(`${MATURITY[name] ?? name} pays `), said(Math.round(n * k), c.currency), text(' into cash')]);
		}
		if (!cashMode) {
			for (const name of Object.keys(m.emis).filter((n) => next && !(n in next.emis))) {
				notes.push([text(`${LOAN[name]?.the ?? name}’s last EMI`)]);
			}
			// a step of more than 1%, not a pound of rounding
			if (prev && names.some((n) => (m.income[n] ?? 0) > (prev.income[n] ?? 0) * 1.01)) notes.push([text('pay rises')]);
		}
		const value = cashMode ? m.closing_cash : m.surplus;
		const flagged = cashMode ? m.closing_cash < 0 : m.below_floor > 0;
		if (notes.length === 0 && flagged) notes.push([text(cashMode ? 'below zero' : `below ${c.whose}`)]);
		return {
			label: m.month.slice(0, 3),
			note: notes.flatMap((n, j) => (j > 0 ? [text('; '), ...n] : n)),
			fig: amountFig(Math.round(value * k), c.currency, flagged ? '▼ ' : ''),
			flagged
		};
	});
	return {
		title: `${String(r.year)}, month by month`,
		sub: cashMode ? 'cash at the end of each month' : 'the surplus each month',
		rows
	};
}

function trace(c: Ctx, r: YearFigures, when: string): ForecastTrace {
	const k = c.k(r);
	const keys = SET.settings.inflation_keys;
	const rows = SET.settings.categories.map((cat) => {
		const pct = (keys[cat.inflation_key] ?? 0) * 100;
		const key = `${cat.inflation_key} ${String(Number(pct.toFixed(2)))}% a year${cat.ccy === 'INR' ? ', at each month’s rate' : ''}`;
		return {
			name: cat.category,
			sub: [said(cat.plan_today, cat.ccy), text(` a month in 2026 · ${key}`)],
			fig: amountFig(-Math.round((r.spend[cat.category] ?? 0) * k), c.currency)
		};
	});
	const total = rows.reduce((a, row) => a - Number(row.fig.amount), 0);
	return {
		line: 'spend',
		over: 'The flows behind a figure',
		title: `${String(r.year)}’s spending`,
		total: amountFig(total, c.currency),
		note: NOTE_SPEND,
		rows,
		totalLabel: `Spending in ${String(r.year)}`,
		source: `The engine’s trace, run ${when}`
	};
}

function potCard(c: Ctx, all: YearFigures[]): ForecastPot | undefined {
	const pot = potWords(all);
	if (!pot) return undefined;
	const school = SET.plans.schooling.what;
	const rows = all
		.filter((r) => r.to_pot > 0 || r.from_pot > 0)
		.map((r) => {
			const n = r.to_pot > 0 ? -Math.round(r.to_pot * c.k(r)) : Math.round(r.from_pot * c.k(r));
			return {
				label: String(r.year),
				note:
					r.to_pot > 0
						? r.span === 'Jan–Dec'
							? [text('into it, '), said(pot.monthly, 'GBP'), text(' a month')]
							: [text(`into it, ${r.span.replace('–', ' and ')}`)]
						: [text(`out of it, to ${c.whose}`)],
				fig: amountFig(n, c.currency, n > 0 ? '+' : ''),
				n
			};
		});
	const into = -rows.filter((r) => r.n < 0).reduce((a, r) => a + r.n, 0);
	const out = rows.filter((r) => r.n > 0).reduce((a, r) => a + r.n, 0);
	const plain = c.currency === 'GBP' && c.money === 'nominal';
	return {
		over: 'The way you applied',
		title: `The ${school} pot, year by year`,
		sub: plain
			? `What goes into the pot from the budget, and what it pays back when the fees push a month below ${c.whose}.`
			: 'Each year at its factor, as the lines beside it.',
		rows: rows.map(({ label, note, fig }) => ({ label, note, fig })),
		totals: [
			{ label: 'Into the pot', fig: amountFig(into, c.currency) },
			{ label: `Out of it, to ${SET.rearrange.last}`, fig: amountFig(out, c.currency) },
			{
				label: plain
					? 'The difference, its interest at 3%'
					: 'The difference: its interest, and the factor moving between the years',
				fig: amountFig(out - into, c.currency)
			}
		]
	};
}

export function buildBudgetForecast(
	h: StubHousehold,
	run: ForecastRun,
	horizon: Horizon,
	money: MoneyBasis,
	currency: DisplayCurrency,
	year?: number
): BudgetForecast {
	const figures = SET.forecast[run];
	const all = figures.years;
	const me = h.member(h.me);
	const admin = h.members.find((m) => m.admin)?.name ?? '';
	const canEdit = me?.admin === true;
	const c: Ctx = {
		h,
		run,
		money,
		currency,
		k: factor(money, currency),
		whose: canEdit ? 'your floor' : `${admin}’s floor`,
		admin,
		canEdit,
		floorTo: floorTo(h, all)
	};
	const base = all[0]?.year ?? 0;
	const rows = all.filter((r) => r.year > base && r.year <= base + horizon);
	const selectedRow =
		rows.find((r) => r.year === year) ?? rows.find((r) => r.year === defaultYear(rows)) ?? rows[0] ?? all[0];
	if (!selectedRow) throw new Error('The figure set has no forecast for this run.');
	const when = runWhen(run);
	const last = rows.at(-1)?.year ?? base;
	const pot = potCard(c, all);
	const foot =
		currency === 'INR'
			? 'Illustrative figures. Each line is the engine’s pounds at the year’s rate, rounded to the rupee; the surplus is those lines added.'
			: money === 'today'
				? 'Illustrative figures. Each line is the engine’s pounds × the year’s deflator, rounded; the surplus is those lines added.'
				: `Illustrative figures from the future-plans figure set, the engine’s run of ${when}. A forecast of the budget, not a promise.`;
	return {
		empty: h.empty,
		head: h.empty ? 'No budget yet' : `Each year to ${String(last)}, ${unitOfYears(c)} · the engine’s run, ${when}`,
		horizon,
		money,
		currency,
		run: when,
		chart: chart(c, all, rows, horizon, selectedRow.year),
		years: rows.map((r) => r.year),
		selected: selectedRow.year,
		year: yearCard(c, all, selectedRow, figures),
		trace: trace(c, selectedRow, when),
		...(pot ? { pot } : {}),
		foot
	};
}

/** Which run the stub opens on: `?forecast=pot` in the address shows the evening after the School fees pot is applied
 * (R2), `?forecast=wedding` after the wedding is saved and its way undone (W); anything else is the picked board's own,
 * just after the school fees are saved (R1). */
export function forecastRunOf(search: string): ForecastRun {
	const asked = new URLSearchParams(search).get('forecast');
	return asked === 'pot' ? 'R2' : asked === 'wedding' ? 'W' : 'R1';
}
