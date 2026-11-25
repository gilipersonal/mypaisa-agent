/** The scripted chat's plan items (MA-222; board Web v4 · Plans in the chat, 2a a card per step, and Web v4 · Plans in
 * the chat 2a states): an admin's sentence that makes a plan item, one card asking only what the sentence left out,
 * with chips; then the impact card with its own Confirm, Change and Cancel; Confirm keeps the plan item in the stub
 * household, and the Plans view and the Projection's plan items show it. A member who is not an admin is refused
 * politely. The words are the boards'.
 *
 * The impact card's figures are the figure set's stored runs, not a new calculation (the stub has no engine):
 * - the school fees: `impact` (R5N → R1: the middle path in 2031, 2036 and 2046, the surplus each year, the 50 months
 *   under the £500 floor) and `impact.new_milestones` (the £6,784 the fees' end frees);
 * - the salary step: `later.salary_step` (R2 → R3, and Aug 2028's £4,778);
 * - the HDFC closure: `later.hdfc_close` (the balance, the FD, what is left over, the EMIs not paid; R3 → R4).
 * They are shown only while the plans stand as the board had them before that step and the answers are the board's;
 * otherwise the card says the preview holds no run for it. Where the 2a boards go on to the ways to cover a gap, this
 * script stops: that card is MA-263's. */
import { CARD_SCHEMA_VERSION } from '#lib/cards/types.ts';
import type { PlanBars, PlanBlock, PlanBody, PlanCard, PlanChip } from '#lib/cards/plan.ts';
import { formatMoney } from '#lib/formatting/money.ts';
import { dayLabel } from '#lib/stub/dates.ts';
import type { StubHousehold, StubPlan } from '#lib/stub/household.ts';
import figures from '#lib/stub/plan-figures.json';
import { adminOf, standingPlans } from '#lib/stub/plan-state.ts';
import { monthLabel, parseMonth, parseRate } from '#lib/wealth/correct.ts';
import { timeOf } from './days.ts';
import type { CardAction, Outgoing } from './transport.ts';

/** What the script needs from the transport it runs in. */
export interface ScriptHost {
	emit(event: string, data: Record<string, unknown>): void;
	after(key: string, fn: () => void): void;
	now(): Date;
	household(): StubHousehold | undefined;
}

type Kind = 'school' | 'salary' | 'hdfc';
type Slot = 'end' | 'growth' | 'paid' | 'leftover';

interface Question {
	slot: Slot;
	q: string;
	chips: PlanChip[];
	chosen?: string;
	/** What the answer reads as, once given. */
	said?: string;
}

interface Draft {
	kind: Kind;
	words: string;
	/** The agent turn that holds the questions card, and the card. */
	turn: string;
	cardId: string;
	/** The turn and card of the impact, once shown. */
	impact?: { turn: string; cardId: string };
	amount: string;
	start: string;
	/** A month, or null for no end date; undefined while still to ask. */
	end?: string | null;
	growth?: string;
	paid?: string;
	leftover?: 'cash' | 'nre';
	questions: Question[];
	/** A chip that needs words typed next: the rate, a pool's name, a number of years. */
	awaiting?: Slot;
	state: 'asking' | 'impact' | 'done';
	rounds: number;
}

const SCHOOL = /^£\s?([\d,]+) a month from ([a-z]+\.? \d{4}) for my kid['’]s schooling/i;
const SALARY = /^my salary goes to £\s?([\d,]+) a month from ([a-z]+\.? \d{4})/i;
const HDFC = /^close my hdfc loan with the sbi fd when it matures/i;
const ADD = /^add\b.*£\s?[\d,]+.*\b(a month|a year|every|once)\b/i;
const GYM = /^add £\s?([\d,]+) a month for my (\w+) from (\w+)/i;
const INFLATION = /^make uk inflation (\d+(?:\.\d+)?)%/i;
const END = /\b(?:to|until) ([a-z]+\.? \d{4})/i;
const RATE = /(\d+(?:\.\d+)?)\s*%/;

const SCHOOL_Q: Record<'end' | 'growth' | 'paid', Question> = {
	end: {
		slot: 'end',
		q: 'Until when?',
		chips: [
			{ id: 'jul2041', label: 'Jul 2041' },
			{ id: 'ten', label: 'For 10 years' },
			{ id: 'none', label: 'No end date' }
		]
	},
	growth: {
		slot: 'growth',
		q: 'How do the fees grow?',
		chips: [
			{ id: 'prior', label: '4.5% a year, UK school fees' },
			{ id: 'none', label: 'No growth' },
			{ id: 'other', label: 'Another rate' }
		]
	},
	paid: {
		slot: 'paid',
		q: 'Paid from where?',
		chips: [
			{ id: 'budget', label: 'The monthly budget' },
			{ id: 'pool', label: 'A pool you name' }
		]
	}
};
const SALARY_Q: Record<'growth' | 'end', Question> = {
	growth: {
		slot: 'growth',
		q: 'How does it grow after that?',
		chips: [
			{ id: 'own', label: 'Your own 4.8% a year, from Apr 2029' },
			{ id: 'none', label: 'No growth' },
			{ id: 'other', label: 'Another rate' }
		]
	},
	end: {
		slot: 'end',
		q: 'Until when?',
		chips: [
			{ id: 'retire', label: 'Until you retire at 60, Jan 2051' },
			{ id: 'years', label: 'For a number of years' }
		]
	}
};
const HDFC_Q: Question = {
	slot: 'leftover',
	q: 'The FD is more than the balance then. Where does the rest go?',
	chips: [
		{ id: 'cash', label: 'Into cash' },
		{ id: 'nre', label: 'Into the NRE savings' }
	]
};

/** What a chip that needs more says next. */
const TYPE_NEXT: Record<string, string> = {
	growth: 'Type the rate, as “3.5% a year”.',
	paid: 'Name the pool it is paid from, as “the ISA”.',
	end: 'Type how many years, as “8 years”.'
};

const THINGS = ['', 'One thing', 'Two things', 'Three things'];
const NO_RUN =
	'The preview’s figure set holds no engine run for this plan as it stands, so its impact is not shown; the engine works it out when it runs (MA-219).';
const STORED = 'In this preview the figures are the figure set’s stored run, not a new calculation.';
const OK_FLOOR = 'No month is flagged under your £500 floor. Cash stays above zero.';
const RETIRE = '2051-01';

const gbp = (n: number) => `${n < 0 ? '−' : ''}${formatMoney(String(Math.round(Math.abs(n))), 'GBP', { whole: true })}`;
const inr = (n: number) => formatMoney(String(Math.round(n)), 'INR', { whole: true });
const curly = (t: string) => t.replace(/'/g, '’');
const plain = (t: string) => t.replace(/,/g, '');

function addYears(ym: string, years: number, back = 0): string {
	const [y = 0, m = 1] = ym.split('-').map(Number);
	const total = y * 12 + (m - 1) + years * 12 - back;
	return `${String(Math.floor(total / 12))}-${String((total % 12) + 1).padStart(2, '0')}`;
}

function mp3(before: Record<string, number>, after: Record<string, number>): PlanBlock {
	return {
		kind: 'mp3',
		rows: ['2031', '2036', '2046'].map((y) => {
			const d = (after[y] ?? 0) - (before[y] ?? 0);
			return {
				y,
				v: gbp(after[y] ?? 0),
				chg: d === 0 ? 'unchanged' : `${d > 0 ? '▲' : '▼'} ${gbp(Math.abs(d))}`,
				dir: d === 0 ? 'same' : d > 0 ? 'up' : 'down'
			};
		})
	};
}

/** The surplus each year with the fees, against today's plan, as the 2a board charts it. */
function surplusBars(): PlanBars {
	const before = Object.values(figures.impact.surplus_by_year_before);
	const after = Object.entries(figures.impact.surplus_by_year_after);
	const flagged = after.map(([year]) => year in figures.rearrange.gap_by_year);
	const at = (y: number) => (y - 2027) / 19;
	const value = (year: string) =>
		figures.impact.surplus_by_year_after[year as keyof typeof figures.impact.surplus_by_year_after];
	return {
		kind: 'bars',
		aria: `Surplus each year, 2027 to 2046. With the fees it falls from ${gbp(value('2028'))} in 2028 to ${gbp(value('2029'))} in 2029, climbs to ${gbp(value('2040'))} by 2040, then ${gbp(value('2041'))} in 2041 when the fees end and ${gbp(value('2046'))} in 2046. Today’s plan, dashed, rises from ${gbp(before[0] ?? 0)} to ${gbp(before.at(-1) ?? 0)}. ${figures.rearrange.first.slice(-4)} to ${figures.rearrange.last.slice(-4)} each have a month under your £${String(figures.settings.floor_gbp_month)} floor.`,
		values: after.map(([, v]) => String(v)),
		before: before.map(String),
		flagged,
		max: '170000',
		min: '-15000',
		grid: [
			{ amount: '75000', label: '£75k' },
			{ amount: '150000', label: '£150k' }
		],
		axis: [
			{ label: '2027', at: 0 },
			{ label: '2036', at: at(2036) },
			{ label: '2046', at: 1 }
		],
		legend: { bar: 'Surplus, with the fees', line: 'Today’s plan' }
	};
}

export class PlanScript {
	#drafts: Draft[] = [];

	constructor(private readonly host: ScriptHost) {}

	/** Answers a member's message when it makes, refuses or answers a plan item; false leaves it to the rest. */
	answer(message: Outgoing): boolean {
		const text = message.text.trim();
		const h = this.host.household();
		const isAdmin = h === undefined || h.member(h.me)?.admin === true;
		const planlike = [SCHOOL, SALARY, HDFC, ADD].some((re) => re.test(text));
		if (!isAdmin && (planlike || INFLATION.test(text))) {
			this.#refuse(message.id, text);
			return true;
		}
		if (planlike) return this.#start(message.id, text);
		const open = this.#drafts.findLast((d) => d.state === 'asking');
		return open ? this.#typed(open, message.id, text) : false;
	}

	/** A chip of a plan card's question: "<slot>:<chip>". */
	choose(messageId: string, chipId: string): boolean {
		const draft = this.#drafts.find((d) => d.turn === messageId);
		if (!draft) return false;
		const [slot, chip] = chipId.split(':');
		const question = draft.questions.find((q) => q.slot === slot);
		if (draft.state !== 'asking' || !question || !chip) return true;
		this.#pick(draft, question, chip);
		this.#progress(draft);
		return true;
	}

	tap(cardId: string, action: CardAction): boolean {
		const draft = this.#drafts.find((d) => d.impact?.cardId === cardId);
		if (!draft) return false;
		if (draft.state !== 'impact') return true;
		if (action === 'confirm') this.#save(draft);
		else if (action === 'cancel') this.#close(draft, 'Cancelled · nothing was saved');
		else this.#change(draft);
		return true;
	}

	#card(id: string, body: PlanBody, fallback: string): PlanCard {
		return { type: 'plan', version: CARD_SCHEMA_VERSION, id, fallback, body };
	}

	#when(): string {
		const h = this.host.household();
		return `${h ? dayLabel(h.today) : 'Today'} ${timeOf(this.host.now())}`;
	}

	#who(): string {
		const h = this.host.household();
		return h?.member(h.me)?.name ?? 'Arun';
	}

	#start(id: string, text: string): boolean {
		const school = SCHOOL.exec(text);
		const salary = SALARY.exec(text);
		let draft: Draft | undefined;
		const base = { words: text, turn: id, cardId: `${id}.plan`, state: 'asking' as const, rounds: 0 };
		if (school?.[1] && school[2]) {
			const start = parseMonth(school[2]);
			if (!start) return false;
			const end = /no end date/i.test(text) ? null : parseMonth(END.exec(text)?.[1] ?? '');
			const rate = RATE.exec(text)?.[1];
			const paid = /from the monthly budget/i.test(text) ? 'The monthly budget' : undefined;
			draft = {
				...base,
				kind: 'school',
				amount: plain(school[1]),
				start,
				...(end !== undefined ? { end } : {}),
				...(rate ? { growth: parseRate(rate) ?? rate } : {}),
				...(paid ? { paid } : {}),
				questions: [
					...(end === undefined ? [{ ...SCHOOL_Q.end }] : []),
					...(rate ? [] : [{ ...SCHOOL_Q.growth }]),
					...(paid ? [] : [{ ...SCHOOL_Q.paid }])
				]
			};
		} else if (salary?.[1] && salary[2]) {
			const start = parseMonth(salary[2]);
			if (!start) return false;
			const rate = RATE.exec(text)?.[1];
			const end = /retire/i.test(text) ? RETIRE : parseMonth(END.exec(text)?.[1] ?? '');
			draft = {
				...base,
				kind: 'salary',
				amount: plain(salary[1]),
				start,
				...(end ? { end } : {}),
				...(rate ? { growth: parseRate(rate) ?? rate } : {}),
				questions: [...(rate ? [] : [{ ...SALARY_Q.growth }]), ...(end ? [] : [{ ...SALARY_Q.end }])]
			};
		} else {
			draft = { ...base, kind: 'hdfc', amount: '', start: '2029-03', questions: [{ ...HDFC_Q }] };
		}
		this.#drafts.push(draft);
		if (draft.questions.length === 0) {
			this.#impact(draft);
			return true;
		}
		const ask = this.#intro(draft);
		this.host.emit('message', { id, role: 'agent', text: ask, cards: [this.#questions(draft)] });
		return true;
	}

	#intro(d: Draft): string {
		const things = `${THINGS[d.questions.length] ?? 'A few things'} first.`;
		if (d.kind === 'school') return `I’ll set that up as a plan item. ${things}`;
		if (d.kind === 'salary') return `I’ll change your salary from ${monthLabel(d.start)}. ${things}`;
		return `That’s 10 Mar 2029. ${things}`;
	}

	#head(d: Draft): { over: string; title: string; sub: string } {
		const amount = gbp(Number(d.amount));
		if (d.kind === 'school') {
			return {
				over: 'New plan item',
				title: 'School fees',
				sub: `${amount} a month from ${monthLabel(d.start)}, for your kid (not a member)`
			};
		}
		if (d.kind === 'salary') {
			const asSet = d.amount === String(figures.later.salary_step.set_to) && d.start === '2028-09';
			const then = gbp(figures.later.salary_step.arun_take_home_aug_2028);
			return {
				over: 'Change to a flow',
				title: 'Arun’s salary',
				sub: asSet
					? `Set to ${amount} a month from ${monthLabel(d.start)}; it would be ${then} by then. Take-home, as every amount is.`
					: `Set to ${amount} a month from ${monthLabel(d.start)}. Take-home, as every amount is.`
			};
		}
		return {
			over: 'Event on a record',
			title: 'Close the HDFC home loan',
			sub: 'With the SBI FD when it matures, 10 Mar 2029; paid from: Fixed deposit · SBI, at maturity'
		};
	}

	#questions(d: Draft): PlanCard {
		const head = this.#head(d);
		const answered = d.questions.every((q) => q.said !== undefined);
		const blocks: PlanBlock[] = answered
			? d.questions.map((q) => ({ kind: 'kv', k: q.q, v: q.said ?? '' }))
			: d.questions.map((q) => ({
					kind: 'q',
					id: q.slot,
					q: q.q,
					chips: q.chips,
					...(q.chosen ? { chosen: q.chosen } : {})
				}));
		return this.#card(
			d.cardId,
			{
				...head,
				over: answered ? 'Answered' : head.over,
				blocks: [
					...blocks,
					{
						kind: 'foot',
						t: answered
							? 'From the chips you tapped; change any before you confirm.'
							: 'Tap an answer, or type it. Nothing is saved yet.'
					}
				]
			},
			`${head.title}: ${d.questions.map((q) => q.q).join(' ')}`
		);
	}

	/** A chip tapped: its answer, or a word to type next. */
	#pick(d: Draft, q: Question, chip: string): void {
		q.chosen = chip;
		delete d.awaiting;
		const label = q.chips.find((c) => c.id === chip)?.label ?? chip;
		const set = (said: string) => {
			q.said = said;
		};
		if (chip === 'other' || chip === 'pool' || (q.slot === 'end' && chip === 'years')) {
			delete q.said;
			d.awaiting = q.slot;
			return;
		}
		if (q.slot === 'end') {
			d.end =
				chip === 'none' ? null : chip === 'ten' ? addYears(d.start, 10, 1) : chip === 'retire' ? RETIRE : '2041-07';
		} else if (q.slot === 'growth') {
			d.growth = chip === 'none' ? '0' : chip === 'own' ? '4.8' : '4.5';
		} else if (q.slot === 'paid') {
			d.paid = 'The monthly budget';
		} else {
			d.leftover = chip === 'nre' ? 'nre' : 'cash';
		}
		set(label);
	}

	/** Words typed while a question is open answer it, if they can. */
	#typed(d: Draft, id: string, text: string): boolean {
		const q = d.questions.find((x) => x.slot === d.awaiting) ?? d.questions.find((x) => x.said === undefined);
		if (!q) return false;
		const said = this.#read(d, q.slot, text);
		if (said === undefined) {
			if (!d.awaiting) return false;
			this.host.emit('message', { id, role: 'agent', text: TYPE_NEXT[q.slot] ?? '' });
			return true;
		}
		q.said = said;
		delete d.awaiting;
		this.#progress(d, id);
		return true;
	}

	#read(d: Draft, slot: Slot, text: string): string | undefined {
		const t = text.trim();
		if (slot === 'growth') {
			if (/no growth/i.test(t)) {
				d.growth = '0';
				return 'No growth';
			}
			const rate = parseRate(RATE.exec(t)?.[1] ?? '');
			if (rate === undefined) return undefined;
			d.growth = rate;
			return `${rate}% a year`;
		}
		if (slot === 'end') {
			const years = /^(\d{1,2}) years?$/i.exec(t)?.[1];
			if (years) {
				d.end = addYears(d.start, Number(years), 1);
				return `For ${years} years`;
			}
			if (/no end/i.test(t)) {
				d.end = null;
				return 'No end date';
			}
			const month = parseMonth(t);
			if (!month || month <= d.start) return undefined;
			d.end = month;
			return monthLabel(month);
		}
		if (slot === 'leftover') {
			if (/cash/i.test(t)) d.leftover = 'cash';
			else if (/nre/i.test(t)) d.leftover = 'nre';
			else return undefined;
			return d.leftover === 'cash' ? 'Into cash' : 'Into the NRE savings';
		}
		if (d.awaiting !== 'paid' && !/monthly budget/i.test(t)) return undefined;
		d.paid = /monthly budget/i.test(t) ? 'The monthly budget' : curly(t.charAt(0).toUpperCase() + t.slice(1));
		return d.paid;
	}

	/** After an answer: the card shows it; the word to type next; or, all answered, the impact. */
	#progress(d: Draft, typedId?: string): void {
		this.host.emit('card', { card: this.#questions(d) });
		if (d.awaiting) {
			const key = `${d.turn}.next.${String(d.rounds)}.${d.awaiting}`;
			this.host.emit('message', { id: key, role: 'agent', text: TYPE_NEXT[d.awaiting] ?? '' });
			return;
		}
		if (d.questions.every((q) => q.said !== undefined)) this.#impact(d, typedId);
	}

	/** Whether the plans stand as the board had them before this step, so the set's stored impact speaks for it. */
	#asBoard(d: Draft): boolean {
		const h = this.host.household();
		const plans = h ? standingPlans(h) : [];
		const base = plans.filter((p) => p.fromSet).every((p) => p.asSet && p.status === 'active');
		const added = plans
			.filter((p) => !p.fromSet && p.status !== 'ended')
			.map((p) => (p.asSet && p.status === 'active' ? p.id : 'other'));
		const before = { school: [], salary: ['schooling'], hdfc: ['schooling', 'salary_step'] }[d.kind];
		return base && added.sort().join() === [...before].sort().join() && this.#draftAsSet(d);
	}

	#draftAsSet(d: Draft): boolean {
		if (d.kind === 'school') {
			return (
				d.amount === '4000' &&
				d.start === '2029-01' &&
				d.end === '2041-07' &&
				d.growth === '4.5' &&
				d.paid === 'The monthly budget'
			);
		}
		if (d.kind === 'salary')
			return d.amount === '5500' && d.start === '2028-09' && d.growth === '4.8' && d.end === RETIRE;
		return d.leftover === 'cash';
	}

	#span(d: Draft): string {
		const to = d.end ? ` to ${monthLabel(d.end)}` : ', no end date';
		const grows = d.growth && d.growth !== '0' ? `rising ${d.growth}% a year` : 'no growth';
		return `${gbp(Number(d.amount))} a month, ${monthLabel(d.start)}${to}, ${grows}`;
	}

	#impactBody(d: Draft): PlanBody {
		const asBoard = this.#asBoard(d);
		const acts: PlanBody['acts'] = ['confirm', 'edit', 'cancel'];
		const later = figures.later;
		if (d.kind === 'school') {
			const blocks: PlanBlock[] = asBoard
				? [
						{ kind: 'sec', t: 'Middle path', r: 'with the fees' },
						mp3(figures.impact.middle_path_before, figures.impact.middle_path_after),
						{
							kind: 'foot',
							t: `Was ${Object.values(figures.impact.middle_path_before).map(gbp).join(' · ')}`
						},
						surplusBars(),
						{
							kind: 'flag',
							t: `▼ Under your £${String(figures.settings.floor_gbp_month)} floor in ${String(figures.impact.below_floor_months)} months, ${figures.rearrange.first} to ${figures.rearrange.last}`
						},
						{
							kind: 'foot',
							t: `Cash stays above zero. The fees end in Jul 2041, freeing ${figures.impact.new_milestones[1]?.frees ?? ''}.`
						}
					]
				: [{ kind: 'foot', t: NO_RUN }];
			return {
				over: 'Not saved yet',
				title: 'School fees',
				sub: this.#span(d),
				blocks,
				acts,
				tech: {
					label: 'Details and technical',
					open: false,
					lines: [
						'propose_plan_item → School fees · new_flow · spend · monthly',
						`start ${monthLabel(d.start)} · end ${d.end ? monthLabel(d.end) : 'none'} · ${gbp(Number(d.amount))} · growth: ${d.growth === '4.5' ? 'prior, UK school fees 4.5%' : `${d.growth ?? '0'}%`}`,
						`Every figure is the engine’s. Your words: “${curly(d.words)}”.`,
						...(asBoard ? [STORED] : [])
					]
				}
			};
		}
		if (d.kind === 'salary') {
			const step = later.salary_step;
			const end = d.end ? (d.end === RETIRE ? 'until Jan 2051' : `until ${monthLabel(d.end)}`) : 'with no end';
			const grows = d.growth && d.growth !== '0' ? `then your own ${d.growth}% each April` : 'then no growth';
			return {
				over: 'Not saved yet',
				title: `Arun’s salary, ${gbp(Number(d.amount))} a month from ${monthLabel(d.start)}`,
				sub: asBoard
					? `+${gbp(step.set_to - step.arun_take_home_aug_2028)} a month on Aug 2028’s ${gbp(step.arun_take_home_aug_2028)}, ${grows}, ${end}`
					: `${grows.charAt(0).toUpperCase()}${grows.slice(1)}, ${end}`,
				blocks: asBoard
					? [
							{ kind: 'sec', t: 'Middle path', r: 'with the step' },
							mp3(step.middle_path_before, step.middle_path_after),
							{ kind: 'foot', t: `Was ${Object.values(step.middle_path_before).map(gbp).join(' · ')}` },
							{ kind: 'ok', t: OK_FLOOR }
						]
					: [{ kind: 'foot', t: NO_RUN }],
				acts,
				tech: { label: 'Details and technical', open: false, lines: this.#salaryTech(d, asBoard) }
			};
		}
		const close = later.hdfc_close;
		const into = d.leftover === 'nre' ? 'into the NRE savings' : 'into cash';
		return {
			over: 'Not saved yet',
			title: 'Close the HDFC home loan in Mar 2029',
			sub: `The SBI FD’s ${inr(close.fd_inr)} clears the ${inr(close.balance_mar_2029_inr)} left then`,
			blocks: [
				{ kind: 'kv', k: `Left over, ${into}`, v: inr(close.left_over_inr) },
				{ kind: 'kv', k: 'The EMI stops after', v: 'Mar 2029, not Jul 2030' },
				{ kind: 'kv', k: 'EMIs not paid', v: `${String(close.emis_saved)} × ${inr(close.frees_inr_a_month)}` },
				...(asBoard
					? ([
							{ kind: 'sec', t: 'Middle path', r: 'with the closure' },
							mp3(close.middle_path_before, close.middle_path_after),
							{ kind: 'ok', t: OK_FLOOR }
						] as PlanBlock[])
					: [{ kind: 'foot', t: NO_RUN } as PlanBlock])
			],
			acts,
			tech: { label: 'Details and technical', open: false, lines: this.#hdfcTech(d, asBoard) }
		};
	}

	#salaryTech(d: Draft, asBoard: boolean): string[] {
		const step = figures.later.salary_step;
		const gain = step.middle_path_after['2046'] - step.middle_path_before['2046'];
		return [
			'propose_plan_item → Arun’s salary · change_flow · income',
			`target: commitment Salary · Arun · set to ${gbp(Number(d.amount))} a month · from ${monthLabel(d.start)}`,
			`growth: member, ${d.growth ?? '0'}% a year from Apr 2029 · ${d.end === RETIRE ? 'until Jan 2051 (60)' : d.end ? `until ${monthLabel(d.end)}` : 'no end'}`,
			'version: none → 1',
			`source_text: “${curly(d.words)}”`,
			...(asBoard
				? [
						`Projection run R2 → R3 · 2046 middle path ${gbp(step.middle_path_before['2046'])} → ${gbp(step.middle_path_after['2046'])} (+${gbp(gain)})`,
						'Every figure is the engine’s.',
						STORED
					]
				: [])
		];
	}

	#hdfcTech(d: Draft, asBoard: boolean): string[] {
		const close = figures.later.hdfc_close;
		return [
			'propose_plan_item → Close the HDFC home loan · record_event',
			'target: record Home loan · HDFC (Pune flat) · prepay the balance',
			`funded_from: Fixed deposit · SBI, at maturity (${inr(close.fd_inr)})`,
			`Mar 2029: ${inr(close.balance_mar_2029_inr)} cleared · ${inr(close.left_over_inr)} ${d.leftover === 'nre' ? 'into the NRE savings' : 'into cash'} · the ${inr(close.frees_inr_a_month)} EMI stops`,
			'version: none → 1',
			`source_text: “${curly(d.words)}”`,
			...(asBoard
				? [
						`Projection run R3 → R4 · 2046 middle path ${gbp(close.middle_path_after['2046'])}, unchanged`,
						'Every figure is the engine’s.',
						STORED
					]
				: [])
		];
	}

	#impact(d: Draft, after?: string): void {
		d.state = 'impact';
		const turn = `${d.turn}.impact.${String(d.rounds)}`;
		d.impact = { turn, cardId: `${turn}.card` };
		const body = this.#impactBody(d);
		const card = this.#card(d.impact.cardId, body, `${body.title}: not saved yet. Confirm?`);
		this.host.after(after ?? turn, () => {
			this.host.emit('message', { id: turn, role: 'agent', text: '', cards: [card] });
		});
	}

	#close(d: Draft, why: string): void {
		const body = this.#impactBody(d);
		d.state = 'done';
		if (!d.impact) return;
		const closed: PlanBody = {
			over: 'Not saved',
			title: body.title,
			...(body.sub ? { sub: body.sub } : {}),
			blocks: [{ kind: 'foot', t: why }]
		};
		this.host.emit('card', { card: this.#card(d.impact.cardId, closed, `${body.title}: not saved.`) });
	}

	/** Change asks the questions again; nothing is saved. */
	#change(d: Draft): void {
		this.#close(d, 'Changing it · nothing was saved');
		const kindQs: Question[] =
			d.kind === 'school'
				? [SCHOOL_Q.end, SCHOOL_Q.growth, SCHOOL_Q.paid]
				: d.kind === 'salary'
					? [SALARY_Q.growth, SALARY_Q.end]
					: [HDFC_Q];
		d.rounds += 1;
		d.state = 'asking';
		d.turn = `${d.turn.split('.again')[0] ?? d.turn}.again${String(d.rounds)}`;
		d.cardId = `${d.turn}.plan`;
		d.questions = kindQs.map((q) => ({ ...q }));
		delete d.impact;
		this.host.after(d.turn, () => {
			this.host.emit('message', {
				id: d.turn,
				role: 'agent',
				text: 'Tap a new answer for each.',
				cards: [this.#questions(d)]
			});
		});
	}

	#plan(d: Draft): StubPlan {
		const asSet = this.#draftAsSet(d);
		const common = { words: d.words, by: this.host.household()?.me ?? 'arun', at: this.host.now(), asSet };
		if (d.kind === 'school') {
			return {
				id: 'schooling',
				effect: 'new_flow',
				what: 'School fees',
				type: 'spend',
				ccy: 'GBP',
				amount: d.amount,
				start: d.start,
				...(d.end ? { end: d.end } : {}),
				growth: d.growth ?? '0',
				paidFrom: d.paid ?? 'The monthly budget',
				...common
			};
		}
		if (d.kind === 'salary') {
			return {
				id: 'salary_step',
				effect: 'change_flow',
				what: 'Arun’s salary',
				type: 'income',
				ccy: 'GBP',
				amount: d.amount,
				start: d.start,
				...(d.end ? { end: d.end } : {}),
				growth: d.growth ?? '0',
				...common
			};
		}
		return {
			id: 'hdfc_close',
			effect: 'record_event',
			what: 'Close the HDFC home loan',
			type: 'spend',
			ccy: 'INR',
			start: d.start,
			paidFrom: 'Fixed deposit · SBI',
			...common
		};
	}

	/** Confirm: the plan item is kept with its audit row, the card collapses in place, and every page reads again. */
	#save(d: Draft): void {
		if (!d.impact) return;
		const asBoard = this.#asBoard(d);
		const impact = this.#impactBody(d);
		const plan = this.#plan(d);
		const who = this.#who();
		const when = this.#when();
		d.state = 'done';
		const later = figures.later;
		let body: PlanBody;
		let reply: string;
		if (d.kind === 'school') {
			const change = figures.impact.change['2046'];
			body = {
				over: 'Added to the plan',
				done: true,
				title: 'School fees',
				sub: `${gbp(Number(d.amount))} a month, ${monthLabel(d.start)}${d.end ? ` to ${monthLabel(d.end)}` : ', no end date'}, ${d.growth && d.growth !== '0' ? `${d.growth}% a year` : 'no growth'}${asBoard ? ` · 2046 middle path ▼ ${gbp(Math.abs(change))}` : ''}`,
				blocks: [],
				audit: `Audit · Plan item added · ${who} · ${when} · in the chat`
			};
			// The board goes on: "...over 50 months; code found three ways to cover it." The ways are MA-263's card.
			reply = asBoard
				? `Saved, with its audit row. It leaves you ${gbp(figures.rearrange.gap_total)} short over ${String(figures.rearrange.months)} months.`
				: 'Saved, with its audit row.';
		} else if (d.kind === 'salary') {
			const gain = later.salary_step.middle_path_after['2046'] - later.salary_step.middle_path_before['2046'];
			const until = d.end === RETIRE ? 'until you retire at 60' : d.end ? `until ${monthLabel(d.end)}` : 'with no end';
			body = {
				over: 'Added to the plan',
				done: true,
				title: impact.title,
				sub: `Then ${d.growth && d.growth !== '0' ? `${d.growth}% each April` : 'no growth'}, ${until}${asBoard ? ` · 2046 middle path ▲ ${gbp(gain)}` : ''}`,
				blocks: [
					{
						kind: 'aud',
						t: `Audit · Plan item added · Arun’s salary set to ${gbp(Number(d.amount))} a month from ${monthLabel(d.start)} · ${who} · ${when} · in the chat`
					}
				],
				tech: { label: 'Technical', open: true, lines: this.#salaryTech(d, asBoard) }
			};
			reply = 'Saved, with its audit row. The Projection has run again with it.';
		} else {
			const close = later.hdfc_close;
			body = {
				over: 'Added to the plan',
				done: true,
				title: impact.title,
				sub: `With the SBI FD; frees ${inr(close.frees_inr_a_month)} a month, ${String(close.emis_saved)} EMIs early`,
				blocks: [
					{
						kind: 'aud',
						t: `Audit · Plan item added · Close the HDFC home loan with the SBI FD, Mar 2029 · ${who} · ${when} · in the chat`
					}
				],
				tech: { label: 'Technical', open: true, lines: this.#hdfcTech(d, asBoard) }
			};
			reply = 'Saved. The loan closes in Mar 2029 and its EMI stops; the Projection has run again.';
		}
		this.host.emit('card', { card: this.#card(d.impact.cardId, body, `${body.title}: added to the plan.`) });
		// As the api does after a write (ARCHITECTURE §19.5): the plan item is kept, then every open door is told.
		this.host.household()?.addPlan(plan);
		this.host.emit('records.changed', { record_id: plan.id, reason: 'plan_item' });
		const done = `${d.impact.cardId}.done`;
		this.host.after(done, () => {
			this.host.emit('message', { id: done, role: 'agent', text: reply });
		});
	}

	/** A member who is not an admin: nothing saved, said plainly, as the 2a states board's Asha asks. */
	#refuse(id: string, text: string): void {
		const h = this.host.household();
		const admin = h ? adminOf(h) : 'Arun';
		const inflation = INFLATION.exec(text);
		let body: PlanBody;
		if (inflation?.[1]) {
			const uk = h ? String(Number((h.projection.inflation.UK * 100).toFixed(2))) : '2.5';
			body = {
				over: 'Not saved',
				title: `The saved assumptions are ${admin}’s`,
				sub: `UK inflation is ${uk}% a year, the prior ${admin} keeps`,
				blocks: [
					{ kind: 'lock', t: `Only ${admin} can change a saved assumption. Nothing is saved.` },
					{ kind: 'foot', t: `I can run a what-if at ${inflation[1]}% for you; nothing in the plan moves.` }
				]
			};
		} else {
			const gym = GYM.exec(text);
			body = {
				over: 'Not saved',
				title: `Plans are ${admin}’s`,
				sub: gym
					? `£${gym[1] ?? ''} a month for your ${gym[2] ?? ''} from ${gym[3] ?? ''}, your words`
					: `“${curly(text)}”, your words`,
				blocks: [
					{ kind: 'lock', t: `Plan items are an admin’s to add; ${admin} is one. Nothing is saved.` },
					{ kind: 'foot', t: 'I can show it as a what-if instead: the engine runs it, and nothing in the plan moves.' }
				]
			};
		}
		const card = this.#card(`${id}.refused`, body, `${body.title}. Nothing is saved.`);
		this.host.after(`${id}.refused`, () => {
			this.host.emit('message', { id, role: 'agent', text: '', cards: [card] });
		});
	}
}
