/** What the Projection's two menus offer (MA-301 a 1b): the title picks the view, the hero's corner button the money.
 * Net worth is the page MA-224 builds and Budget forecast MA-262's; Plans (MA-222) is its own story, so the menu names
 * it and it says plainly that it is not built yet, as every page the shell names before its story does. */
import type { MoneyBasis } from '#lib/wealth/projection.ts';

export type ViewId = 'net' | 'plans' | 'budget';

export interface View {
	id: ViewId;
	label: string;
	/** Under the title, in place of the run's line. */
	head: string;
	/** What the view's place says until its story builds it. */
	soon: string;
}

const SOON = 'It arrives with its story in the plan; Net worth and the chat work now.';

const NET: View = { id: 'net', label: 'Net worth', head: '', soon: '' };

export const VIEWS: readonly View[] = [
	NET,
	{
		id: 'plans',
		label: 'Plans',
		head: 'Each plan on a timeline',
		soon: `Plans shows each plan item on a timeline, for an admin to correct or pause in place. ${SOON}`
	},
	{ id: 'budget', label: 'Budget forecast', head: 'What comes in and goes out, each year to the horizon', soon: '' }
];

export interface Money {
	id: MoneyBasis;
	label: string;
}

const NOMINAL: Money = { id: 'nominal', label: 'Nominal' };

export const MONEY: readonly Money[] = [NOMINAL, { id: 'today', label: 'Today’s money' }];

/** The view an id names; anything else is Net worth. */
export function viewOf(id: string): View {
	return VIEWS.find((v) => v.id === id) ?? NET;
}

/** The money an id names; anything else is each year's own. */
export function moneyOf(id: string): Money {
	return MONEY.find((m) => m.id === id) ?? NOMINAL;
}
