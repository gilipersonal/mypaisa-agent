/** The stub household's plan items as they stand (MA-222): the three of the figure set, the ones the chat added, and
 * every change made to them in place, put together in order. Both Projection views read plans through here, so the
 * Plans view and the Net worth view's plan items always agree. Nothing here is an engine: a plan's figures are the
 * ones the chat settled or an admin typed, and the only engine figures are the set's stored ones, said where used. */
import { timeOf } from '#lib/chat/days.ts';
import { formatMoney, type Decimal } from '#lib/formatting/money.ts';
import { monthLabel, parseAmount, parseMonth, parseRate } from '#lib/wealth/correct.ts';
import type { PlanField, PlanItem, ProjectionCorrection } from '#lib/wealth/projection.ts';
import type { PlanChange } from '#lib/wealth/plans.ts';
import { dayLabel } from './dates.ts';
import type { RecordCurrency, StubHousehold, StubPlan, StubPlanItem } from './household.ts';
import figures from './plan-figures.json';

/** How a plan runs: once, each year, each month, a change to a flow from a date, or an event on a record. */
export type PlanKind = 'one_off' | 'yearly' | 'monthly' | 'change_flow' | 'record_event';
export type PlanStatus = 'active' | 'paused' | 'ended';

/** A plan item as it stands now, after every correction, pause and end, oldest first. */
export interface Standing {
	id: string;
	icon: string;
	name: string;
	kind: PlanKind;
	type: 'spend' | 'income';
	ccy: RecordCurrency;
	/** Whole units: once, a year or a month as `kind` says; none for an event. */
	amount?: Decimal;
	start: string;
	end?: string;
	growth?: string;
	paidFrom?: string;
	/** "A new flow · money out · Education · for your kid". */
	effect: string;
	words: string;
	/** Who said it and when: "Arun · Sun 25 Oct 20:09 · in the chat". */
	said: string;
	status: PlanStatus;
	version: number;
	/** The plan's audit rows, oldest first, without their "Audit · ". */
	history: string[];
	/** Who last corrected each figure, and what it was before. */
	corrected: Partial<Record<PlanField, { by: string; was: string }>>;
	/** One of the three the household started with. */
	fromSet: boolean;
	/** Its figures are still exactly the figure set's, so the set's stored impact speaks for it. */
	asSet: boolean;
	/** When it was ended, in words: "ended by Arun, Mon 26 Oct 10:12". */
	ended?: string;
	/** The day of its month a mark sits on: the FD matures on the 10th. */
	day: number;
	/** The last time it changed, to tell which plan a page's Saved line belongs to. */
	changedAt?: Date;
}

const SET_ICON: Record<string, string> = { extension: 'construction', bonus: 'gift', car2: 'car' };
const curly = (text: string) => text.replace(/'/g, '’');
const whole = (n: number): Decimal => String(Math.round(Math.abs(n)));
const strip = (audit: string) => audit.replace(/^Audit · /, '');

interface Existing {
	id: string;
	category: string;
	source_text: string;
	created: string;
}
const EXISTING = new Map<string, Existing>(figures.plans.existing.map((p) => [p.id, p]));

/** The admin who keeps the plans: the household's first. */
export function adminOf(h: StubHousehold): string {
	return h.members.find((m) => m.admin)?.name ?? '';
}

const nameOf = (h: StubHousehold, id: string) => h.member(id)?.name ?? id;
const when = (h: StubHousehold, at: Date) => `${dayLabel(h.today)} ${timeOf(at)}`;

function fromSetItem(h: StubHousehold, p: StubPlanItem): Standing {
	const ex = EXISTING.get(p.id);
	const type = p.amount < 0 ? 'spend' : 'income';
	const kind: PlanKind = p.repeat ? 'yearly' : 'one_off';
	const said = `${adminOf(h)} · ${ex?.created ?? ''} · in the chat`;
	return {
		id: p.id,
		icon: SET_ICON[p.id] ?? 'calendar',
		name: curly(p.what),
		kind,
		type,
		ccy: p.ccy,
		amount: whole(p.amount),
		start: p.when,
		...(p.until ? { end: p.until } : {}),
		effect: `${kind === 'one_off' ? 'Once' : 'A new flow, each year'} · money ${type === 'spend' ? 'out' : 'in'} · ${ex?.category ?? ''}`,
		words: curly(ex?.source_text ?? ''),
		said,
		status: 'active',
		version: 1,
		history: [`Plan item added · ${said}`],
		corrected: {},
		fromSet: true,
		asSet: true,
		day: 15
	};
}

const ADDED: Record<StubPlan['effect'], { icon: string; kind: PlanKind }> = {
	new_flow: { icon: 'school', kind: 'monthly' },
	change_flow: { icon: 'work', kind: 'change_flow' },
	record_event: { icon: 'house-plus', kind: 'record_event' }
};

/** The words a chat-made plan's sheet says of it, from the figure set's own plan. */
const EFFECT: Record<StubPlan['effect'], string> = {
	new_flow: 'A new flow · money out · Education · for your kid',
	change_flow: 'A change to a flow · money in · Salary · Arun',
	record_event: 'An event on a record · Home loan · HDFC (Pune flat) · prepay the balance'
};
const NAME: Record<StubPlan['effect'], string> = {
	new_flow: 'School fees',
	change_flow: 'Arun’s salary',
	record_event: 'Close the HDFC home loan'
};

function fromAdded(h: StubHousehold, p: StubPlan): Standing {
	const said = `${nameOf(h, p.by)} · ${when(h, p.at)} · in the chat`;
	return {
		id: p.id,
		icon: ADDED[p.effect].icon,
		name: NAME[p.effect],
		kind: ADDED[p.effect].kind,
		type: p.type,
		ccy: p.ccy,
		...(p.amount ? { amount: p.amount } : {}),
		start: p.start,
		...(p.end ? { end: p.end } : {}),
		...(p.growth !== undefined ? { growth: p.growth } : {}),
		...(p.paidFrom ? { paidFrom: p.paidFrom } : {}),
		effect: EFFECT[p.effect],
		words: curly(p.words),
		said,
		status: 'active',
		version: 1,
		history: [`Plan item added · ${said}`],
		corrected: {},
		fromSet: false,
		asSet: p.asSet,
		day: p.effect === 'record_event' ? 10 : 15,
		changedAt: p.at
	};
}

/** A one-off's figure the Net worth view corrects is its amount; a yearly one's, its growth (MA-224, board P6). */
export function legacyPart(kind: PlanKind): PlanField | undefined {
	if (kind === 'one_off') return 'amount';
	return kind === 'yearly' ? 'growth' : undefined;
}

/** A figure as the sheet and the audit write it. */
export function figureText(
	p: Pick<Standing, 'kind' | 'ccy' | 'type'>,
	part: PlanField,
	value: string | undefined
): string {
	if (value === undefined) return part === 'growth' ? 'No growth' : 'None';
	if (part === 'growth') return value === '0' ? 'No growth' : `${value}% a year`;
	if (part === 'start' || part === 'end') return monthLabel(value);
	const money = formatMoney(value, p.ccy, { whole: true });
	if (p.kind === 'one_off' || p.kind === 'yearly') return `${p.type === 'spend' ? '−' : '+'}${money}`;
	return `${money} a month`;
}

const PART_WORD: Record<PlanField, string> = { amount: 'amount', start: 'starts', end: 'ends', growth: 'grows' };

/** Every plan item as it stands, in the order it starts. Changes are applied in the order they were made. */
export function standingPlans(h: StubHousehold): Standing[] {
	const plans = [...h.projection.plan_items.map((p) => fromSetItem(h, p)), ...h.plans.map((p) => fromAdded(h, p))];
	const byId = new Map(plans.map((p) => [p.id, p]));
	interface Step {
		at: Date;
		apply: () => void;
	}
	const steps: Step[] = [
		// The Net worth view's corrections (MA-224): a one-off's amount, a yearly one's growth.
		...h.corrections
			.filter((c) => c.target === 'plan')
			.map((c) => ({
				at: c.at,
				apply: () => {
					const p = byId.get(c.id);
					const part = p ? legacyPart(p.kind) : undefined;
					if (!p || !part) return;
					p[part] = c.value;
					p.version += 1;
					p.history.push(strip(c.audit));
					p.corrected[part] = { by: nameOf(h, c.by), was: c.was };
					p.changedAt = c.at;
				}
			})),
		...h.planChanges.map((c) => ({
			at: c.at,
			apply: () => {
				const p = byId.get(c.id);
				if (!p) return;
				if (c.field === 'status') {
					p.status = c.value as PlanStatus;
					if (c.value === 'ended') p.ended = `ended by ${nameOf(h, c.by)}, ${when(h, c.at)}`;
				} else {
					p.corrected[c.field] = { by: nameOf(h, c.by), was: `was ${figureText(p, c.field, p[c.field])}` };
					p[c.field] = c.value;
				}
				p.version += 1;
				p.history.push(strip(c.audit));
				p.changedAt = c.at;
			}
		}))
	];
	for (const step of steps.sort((a, b) => a.at.getTime() - b.at.getTime())) step.apply();
	for (const p of plans) p.asSet = p.asSet && Object.keys(p.corrected).length === 0;
	return plans.sort((a, b) => a.start.localeCompare(b.start));
}

/** The set item with its start and end as they stand, for the Net worth view's own rows (MA-224). */
export function movedSetItem(h: StubHousehold, p: StubPlanItem): StubPlanItem {
	const s = standingPlans(h).find((x) => x.id === p.id);
	return s ? { ...p, when: s.start, ...(s.end ? { until: s.end } : {}) } : p;
}

export function statusOf(h: StubHousehold, id: string): PlanStatus {
	return standingPlans(h).find((p) => p.id === id)?.status ?? 'active';
}

/** The Net worth view's rows for the plans the chat added: each with its amount, plain; an admin corrects it on the
 * Plans view, where all its figures are. */
export function addedPlanItems(h: StubHousehold): PlanItem[] {
	return standingPlans(h)
		.filter((p) => !p.fromSet && p.status !== 'ended')
		.map((p) => {
			const paused = p.status === 'paused' ? ' · paused, not counted' : '';
			const from = monthLabel(p.start);
			const span =
				p.kind === 'record_event'
					? `Once, ${from}`
					: p.kind === 'change_flow'
						? `From ${from}`
						: `Every month, ${from}${p.end ? ` to ${monthLabel(p.end)}` : ''}`;
			const amount = p.amount ?? whole(figures.later.hdfc_close.balance_mar_2029_inr);
			return {
				id: p.id,
				icon: p.icon,
				title: p.name,
				when: `${span}${paused}`,
				fig: {
					amount,
					currency: p.ccy,
					pre: p.type === 'spend' ? '−' : '+',
					...(p.kind === 'record_event' ? {} : { post: ' a month' })
				}
			};
		});
}

/** Whether a correction is to a plan figure the Plans view keeps (anything but the Net worth view's one). */
export function isPlanPart(h: StubHousehold, c: ProjectionCorrection): boolean {
	if (c.target !== 'plan' || c.part === undefined) return false;
	const p = standingPlans(h).find((x) => x.id === c.id);
	return !(p?.fromSet === true && legacyPart(p.kind) === c.part);
}

function only(h: StubHousehold, action: string): { id: string; name: string } {
	const who = h.member(h.me);
	if (who?.admin !== true) throw new Error(`Only an admin ${action} a plan item.`);
	return who;
}

/** An admin's correction of a plan figure in place, checked, then kept with its audit row (ARCHITECTURE §4.10). */
export function correctPlan(h: StubHousehold, c: ProjectionCorrection, at: Date): void {
	const who = only(h, 'corrects');
	const part = c.part;
	const p = standingPlans(h).find((x) => x.id === c.id);
	if (!p || !part || p.status === 'ended') throw new Error('The Plans view has no such figure.');
	const parse = { amount: parseAmount, start: parseMonth, end: parseMonth, growth: parseRate }[part];
	const value = parse(c.value);
	if (value === undefined || value === p[part]) throw new Error('Not a new value for this figure.');
	if (part === 'amount' && p.amount === undefined) throw new Error('This plan pays the balance then: no amount.');
	if ((part === 'end' && value <= p.start) || (part === 'start' && p.end !== undefined && value >= p.end)) {
		throw new Error('A plan must end after it starts.');
	}
	const from = figureText(p, part, p[part]);
	const to = figureText(p, part, value);
	h.changePlan({
		id: p.id,
		field: part,
		value,
		by: who.id,
		at,
		audit: `Audit · Plan item corrected · ${p.name}: ${PART_WORD[part]} ${from} → ${to} · v${String(p.version)} → v${String(p.version + 1)} · ${who.name} · ${when(h, at)} · in place`
	});
}

const DONE: Record<PlanChange['action'], { status: PlanStatus; word: string; from: PlanStatus[] }> = {
	pause: { status: 'paused', word: 'paused', from: ['active'] },
	resume: { status: 'active', word: 'resumed', from: ['paused'] },
	end: { status: 'ended', word: 'ended', from: ['active', 'paused'] }
};

/** Pause, resume or end a plan item in place: a correction event to its status, with a new version and its audit row
 * (board Web v4 · Plans tab 3a states). Ending keeps it in its history; nothing is deleted. */
export function setPlanStatus(h: StubHousehold, change: PlanChange, at: Date): void {
	const who = only(h, change.action === 'end' ? 'ends' : change.action === 'pause' ? 'pauses' : 'resumes');
	const p = standingPlans(h).find((x) => x.id === change.id);
	const done = DONE[change.action];
	if (!p || !done.from.includes(p.status)) throw new Error('That plan item cannot be changed that way now.');
	const word = change.word?.trim();
	const said = word ? ` · his words “${curly(word)}”` : '';
	h.changePlan({
		id: p.id,
		field: 'status',
		value: done.status,
		by: who.id,
		at,
		audit: `Audit · Plan item ${done.word} · ${p.name} · v${String(p.version)} → v${String(p.version + 1)}${said} · ${who.name} · ${when(h, at)} · in place`
	});
}
