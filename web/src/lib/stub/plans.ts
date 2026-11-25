/** The Projection's Plans view from the stub household (MA-222; board Web v4 · Plans tab, 3a bars on a timeline, and
 * Web v4 · Plans tab 3a states): each plan item on a lane across the horizon, opened into its sheet, with what an
 * admin may correct, pause or end in place.
 *
 * Nothing here is an engine. The middle path the summary names is a run the figure set stored, and only where the
 * plans stand exactly as that run had them:
 * - the three plans the household starts with: `R26` (Mon 26 Oct 09:53), the run the Net worth fan draws;
 * - those and the school fees as the chat's 2a board settles them: `R1` (Thu 5 Nov 20:43), the set's run with the fees
 *   saved. R1 was run on the set's Thu 5 Nov evening, from £456,747 and with Asha's bonus growing 3.5%, so it is the
 *   board's figure, not a run of this household as it stands.
 * For any other plans the summary says plainly that the preview holds no run. MA-219's engine behind the same seam
 * runs every one. */
import { formatMoney } from '#lib/formatting/money.ts';
import { monthLabel } from '#lib/wealth/correct.ts';
import type { DisplayCurrency } from '#lib/wealth/overview.ts';
import type { EditSpec, Horizon, MoneyBasis, PlanField } from '#lib/wealth/projection.ts';
import type {
	EndedRow,
	LaneBar,
	LanePoint,
	PlanBanner,
	PlanFigure,
	PlanRow,
	PlanSheet,
	Plans
} from '#lib/wealth/plans.ts';
import { dayLabel } from './dates.ts';
import plansSet from './future-plans.json';
import type { StubHousehold } from './household.ts';
import figures from './plan-figures.json';
import { adminOf, figureText, legacyPart, standingPlans, type Standing } from './plan-state.ts';
import { AXIS, converter, yearsTo } from './projection.ts';

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
const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const FOOT_ADMIN =
	'Tap a plan to correct its figures, pause it or end it. Nothing is added here: a new plan starts in the chat.';
const NOTE =
	'Illustrative figures from the future-plans figure set. Plans and their figures are the admins’ to change; members see the tab without the pencils and save nothing.';
const SAVED = 'Saved. The Projection runs again with it.';
const BANNER: Record<string, { kind: PlanBanner['kind']; text: string }> = {
	paused: { kind: 'pause', text: 'Paused. The Projection runs again without it.' },
	active: { kind: 'resume', text: 'Resumed. The Projection runs again with it.' },
	ended: { kind: 'end', text: 'Ended. The Projection runs again without it.' }
};

const countWord = (n: number) => COUNT[n] ?? String(n);
const fullMonth = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1] ?? ''} ${ym.slice(0, 4)}`;
const money = (p: Standing) => formatMoney(p.amount ?? '0', p.ccy, { whole: true });
const sign = (p: Standing) => (p.type === 'spend' ? '−' : '+');
const growing = (p: Standing) => (p.growth && p.growth !== '0' ? `, growing ${p.growth}% a year` : '');

/** The plan in a few words, as its row on the board says it. */
function subOf(p: Standing): string {
	switch (p.kind) {
		case 'one_off':
			return `${sign(p)}${money(p)} once, ${monthLabel(p.start)}`;
		case 'yearly':
			return `${sign(p)}${money(p)} each ${MONTHS[Number(p.start.slice(5, 7)) - 1] ?? ''}${growing(p)}`;
		case 'monthly':
			return `${sign(p)}${money(p)} a month, ${monthLabel(p.start)}${p.end ? ` to ${monthLabel(p.end)}` : ' on'}`;
		case 'change_flow':
			return `Set to ${money(p)} a month from ${monthLabel(p.start)}`;
		case 'record_event':
			return `With the SBI FD, ${monthLabel(p.start)}`;
	}
}

/** What a screen reader hears for the lane; the set's own figures only while the plan is as the set holds it. */
function ariaOf(p: Standing): string {
	const paused = p.status === 'paused' ? 'Paused, not counted. ' : '';
	const later = figures.later;
	const said = (() => {
		switch (p.kind) {
			case 'one_off':
				return `${p.name}: ${money(p)} once, in ${fullMonth(p.start)}.`;
			case 'yearly':
				return `${p.name}: ${money(p)} each ${MONTHS[Number(p.start.slice(5, 7)) - 1] ?? ''} from ${p.start.slice(0, 4)} to ${(p.end ?? '').slice(0, 4)}${growing(p)}.`;
			case 'monthly':
				return `${p.name}: ${money(p)} a month from ${fullMonth(p.start)}${p.end ? ` to ${fullMonth(p.end)}` : ''}${growing(p)}.`;
			case 'change_flow':
				return p.asSet
					? `${p.name}: set to ${money(p)} a month from ${fullMonth(p.start)}, from ${formatMoney(String(later.salary_step.arun_take_home_aug_2028), 'GBP', { whole: true })}, then growing ${p.growth ?? '0'}% a year from April 2029.`
					: `${p.name}: set to ${money(p)} a month from ${fullMonth(p.start)}${growing(p)}.`;
			case 'record_event':
				return p.asSet
					? `${p.name} in ${fullMonth(p.start)} with the SBI fixed deposit: ₹5,93,849 cleared and the ₹39,390 EMI stops.`
					: `${p.name} in ${fullMonth(p.start)} with the SBI fixed deposit.`;
		}
	})();
	return `${paused}${said}`;
}

/** The plan's lane: where it sits between today and the horizon, as fractions of the lane. */
function lane(h: StubHousehold, p: Standing, years: number): { bars: LaneBar[]; points: LanePoint[]; past: boolean } {
	const at = (ym: string, day = 1) => yearsTo(h.today, ym) + (day - 1) / 365;
	const x = (t: number) => Math.min(Math.max(t / years, 0), 1);
	const after = (ym: string) => {
		const [y = 0, m = 1] = ym.split('-').map(Number);
		return m === 12 ? `${String(y + 1)}-01` : `${String(y)}-${String(m + 1).padStart(2, '0')}`;
	};
	const start = at(p.start);
	const stop = p.end ? at(after(p.end)) : Number.POSITIVE_INFINITY;
	switch (p.kind) {
		case 'monthly':
		case 'change_flow': {
			const kind = p.type === 'spend' ? 'out' : 'in';
			const bars = start < years ? [{ kind, from: x(start), to: x(stop) } as LaneBar] : [];
			const points: LanePoint[] = p.kind === 'change_flow' && start < years ? [{ shape: 'step', at: x(start) }] : [];
			return { bars, points, past: stop > years };
		}
		case 'yearly': {
			const points: LanePoint[] = [];
			const last = Number((p.end ?? p.start).slice(0, 4));
			for (let y = Number(p.start.slice(0, 4)); y <= last; y += 1) {
				const t = at(`${String(y)}${p.start.slice(4)}`, 15);
				if (t >= 0 && t <= years) points.push({ shape: 'tick', at: x(t) });
			}
			return { bars: [], points, past: at(p.end ?? p.start, 15) > years };
		}
		default: {
			const t = at(p.start, p.day);
			const shape = p.kind === 'record_event' ? 'evt' : 'dia';
			return { bars: [], points: t <= years ? [{ shape, at: x(t) }] : [], past: t > years };
		}
	}
}

/** One figure of the sheet, with its edit for an admin. A set item's own figure goes the Net worth view's way. */
function figure(
	p: Standing,
	part: PlanField,
	label: string,
	canEdit: boolean,
	source?: PlanFigure['source']
): PlanFigure {
	const value = figureText(p, part, p[part]);
	const corrected = p.corrected[part];
	const legacy = p.fromSet && legacyPart(p.kind) === part;
	const base = {
		target: 'plan' as const,
		id: p.id,
		title: label,
		...(legacy ? {} : { part }),
		before: { text: value },
		hint: 'The engine runs again when you save.'
	};
	const spec: EditSpec =
		part === 'amount'
			? {
					...base,
					kind: 'amount',
					field: `The amount · now ${value}`,
					unit: p.kind === 'one_off' || p.kind === 'yearly' ? '' : ' a month',
					lead: `${p.kind === 'one_off' || p.kind === 'yearly' ? sign(p) : ''}${p.ccy === 'INR' ? '₹' : '£'}`,
					...(p.kind === 'one_off' || p.kind === 'yearly' ? { sign: sign(p) } : {}),
					currency: p.ccy,
					...(p.amount ? { current: p.amount } : {})
				}
			: part === 'growth'
				? {
						...base,
						kind: 'rate',
						field: `Each year · now ${value}`,
						unit: '% a year',
						...(p.growth !== undefined ? { current: p.growth } : {})
					}
				: {
						...base,
						kind: 'month',
						field: `${part === 'start' ? 'The first month' : 'The last month'} · now ${value}`,
						unit: '',
						...(p[part] !== undefined ? { current: p[part] } : {})
					};
	const was = corrected ? { source: { icon: 'member', label: `Corrected by ${corrected.by} · ${corrected.was}` } } : {};
	return {
		label,
		value,
		...(source && !corrected ? { source } : {}),
		...was,
		...(canEdit ? { edit: spec } : {})
	};
}

function figuresOf(p: Standing, canEdit: boolean): PlanFigure[] {
	const rw = (part: PlanField, label: string, source?: PlanFigure['source']) => figure(p, part, label, canEdit, source);
	const ro = (label: string, value: string, source?: PlanFigure['source']): PlanFigure => ({
		label,
		value,
		...(source ? { source } : {})
	});
	switch (p.kind) {
		case 'one_off':
			return [rw('amount', 'Amount'), rw('start', 'When')];
		case 'yearly':
			return [rw('amount', 'Amount'), rw('start', 'Starts'), rw('end', 'Ends'), rw('growth', 'Grows')];
		case 'monthly':
			return [
				rw('amount', 'Amount'),
				rw('start', 'Starts'),
				rw('end', 'Ends'),
				rw('growth', 'Grows', p.growth === '4.5' ? { icon: 'prior', label: 'Prior · UK school fees' } : undefined),
				ro('Paid from', p.paidFrom ?? 'The monthly budget')
			];
		case 'change_flow':
			return [rw('amount', 'Set to'), rw('start', 'Starts'), rw('end', 'Until'), rw('growth', 'Grows')];
		case 'record_event':
			return [
				rw('start', 'When', p.start === '2029-03' ? { icon: 'calendar', label: 'The FD matures 10 Mar' } : undefined),
				ro('Paid from', p.paidFrom ?? 'Fixed deposit · SBI'),
				ro('It pays', p.asSet ? '₹5,93,849, the balance then' : 'The balance then', {
					icon: 'calculator',
					label: 'Engine'
				})
			];
	}
}

/** The engine's words for a plan, from the figure set's stored run, only while the plan is as the set holds it. */
function engineOf(p: Standing): { lines: string[]; foot: string } {
	const later = figures.later;
	const none = {
		lines: [],
		foot: 'The engine works this plan out when it runs (MA-219); the preview’s figure set holds no run for it as it stands.'
	};
	if (!p.asSet || p.fromSet) return none;
	const stored = 'From the figure set’s stored run, not a new calculation';
	if (p.kind === 'monthly') {
		return { lines: ['The fees end in Jul 2041, freeing £6,784 a month.'], foot: stored };
	}
	if (p.kind === 'change_flow') {
		const step = later.salary_step.set_to - later.salary_step.arun_take_home_aug_2028;
		return {
			lines: [`+£${String(step)} a month on Aug 2028’s £4,778, then your own 4.8% each April, until Jan 2051.`],
			foot: stored
		};
	}
	return {
		lines: [
			'The FD’s ₹6,17,538 clears ₹5,93,849; ₹23,689 is left over, to cash.',
			`The ₹39,390 EMI stops after March: ${String(later.hdfc_close.emis_saved)} EMIs fewer, Apr 2029 to Jul 2030.`
		],
		foot: stored
	};
}

/** The legend's words for a yearly tick: the month the yearly plans fall in, when they share one. */
function eachOf(plans: Standing[]): string {
	const months = new Set(plans.filter((p) => p.kind === 'yearly').map((p) => p.start.slice(5, 7)));
	const [only] = [...months];
	return months.size === 1 && only ? `Each ${MONTHS[Number(only) - 1] ?? ''}` : 'Each year';
}

interface Run {
	when: string;
	fan: { year: number; p10: number; p50: number; p90: number }[];
}

/** The stored run the plans stand on, if the figure set holds one for them exactly as they are (see the top). */
function runFor(plans: Standing[]): Run | undefined {
	const untouched = plans.every((p) => p.status === 'active' && p.asSet);
	if (!untouched) return undefined;
	const added = plans.filter((p) => !p.fromSet).map((p) => p.kind);
	if (added.length === 0) return plansSet.R26;
	if (added.length === 1 && added[0] === 'monthly') return figures.runs.R1;
	return undefined;
}

function summaryOf(
	h: StubHousehold,
	run: Run | undefined,
	horizon: Horizon,
	basis: MoneyBasis,
	currency: DisplayCurrency
): string {
	const year = Number(h.today.slice(0, 4)) + horizon;
	const row = run?.fan.find((r) => r.year === year);
	if (!run || !row) {
		return 'The engine runs again with each change; the preview’s figure set holds no stored run for the plans as they stand, so no middle path is shown.';
	}
	const to = converter(h, basis, currency);
	const say = (v: number) => formatMoney(String(Math.round(to(v, horizon))), currency, { whole: true });
	const today = basis === 'today' ? ', in today’s money' : '';
	return `On them, the middle path reaches ${say(row.p50)} in ${String(year)}${today}; 8 in 10 runs end between ${say(row.p10)} and ${say(row.p90)}.`;
}

export function buildPlans(h: StubHousehold, horizon: Horizon, basis: MoneyBasis, currency: DisplayCurrency): Plans {
	const canEdit = h.member(h.me)?.admin === true;
	const admin = adminOf(h);
	const all = standingPlans(h);
	const live = all.filter((p) => p.status !== 'ended');
	const ended = all.filter((p) => p.status === 'ended');
	const paused = live.filter((p) => p.status === 'paused').length;
	const run = runFor(all);
	const base = Number(h.today.slice(0, 4));
	const last = String(base + horizon);

	// The Saved line belongs to the plan whose figure was corrected last, while that is the last change of all.
	const lastChange = h.planChanges.at(-1);
	const lastLegacy = h.corrections.filter((c) => c.target === 'plan').at(-1);
	const latest =
		lastChange && (!lastLegacy || lastChange.at >= lastLegacy.at)
			? { id: lastChange.id, status: lastChange.field === 'status', value: lastChange.value, audit: lastChange.audit }
			: lastLegacy
				? { id: lastLegacy.id, status: false, value: lastLegacy.value, audit: lastLegacy.audit }
				: undefined;

	const sheetOf = (p: Standing): PlanSheet => {
		const engine = engineOf(p);
		return {
			title: p.name,
			icon: p.icon,
			effect: p.effect,
			status: p.status === 'paused' ? 'Paused' : 'Active',
			words: p.words,
			wordsMeta: `${p.said} · version ${String(p.version)}`,
			figures: figuresOf(p, canEdit),
			engine: engine.lines,
			engineFoot: engine.foot,
			history: p.history,
			...(latest && !latest.status && latest.id === p.id ? { saved: SAVED } : {})
		};
	};

	const rows: PlanRow[] = live.map((p) => ({
		id: p.id,
		icon: p.icon,
		name: p.name,
		sub: subOf(p),
		...lane(h, p, horizon),
		paused: p.status === 'paused',
		aria: ariaOf(p),
		sheet: sheetOf(p)
	}));
	const endedRows: EndedRow[] = ended.map((p) => ({
		id: p.id,
		icon: p.icon,
		name: p.name,
		sub: `${subOf(p)} · ${p.ended ?? 'ended'}`
	}));

	const n = live.length;
	const plansWord = (k: number) => `${String(k)} ${k === 1 ? 'plan' : 'plans'}`;
	const title = canEdit
		? `${plansWord(n)} · ${paused > 0 ? `${String(paused)} paused` : 'yours to change, as an admin'}`
		: `${plansWord(n)} · ${admin}’s, the admin’s`;
	const endedWords = ended.length > 0 ? `, and ${countWord(ended.length).toLowerCase()} ended` : '';
	const standsOn = run ? `the engine’s run of ${run.when}` : 'no stored run for them in the preview';
	const banner = latest?.status ? BANNER[latest.value] : undefined;

	return {
		empty: h.empty,
		head: `${countWord(n)} ${n === 1 ? 'plan' : 'plans'}, ${admin}’s${endedWords} · ${standsOn}`,
		title,
		summary: summaryOf(h, run, horizon, basis, currency),
		canEdit,
		timeline: {
			title: `Each plan, to ${last}`,
			from: `from today, ${dayLabel(h.today)}`,
			axis: AXIS[horizon].at.map((k) => ({
				label: k === 0 ? 'Today' : String(base + k),
				at: k / horizon,
				...(AXIS[horizon].minor.includes(k) ? { minor: true } : {})
			})),
			grid: AXIS[horizon].at.filter((k) => k > 0 && k < horizon).map((k) => k / horizon),
			last,
			each: eachOf(live),
			rows
		},
		foot: canEdit
			? FOOT_ADMIN
			: `Plans are ${admin}’s, the admin’s: you see them here, without pencils. Ask in the chat about any of them, or try a what-if.`,
		ended: endedRows,
		...(banner && latest ? { banner: { ...banner, audit: latest.audit } } : {}),
		note: NOTE
	};
}
