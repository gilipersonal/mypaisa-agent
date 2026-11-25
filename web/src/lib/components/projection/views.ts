/** What the Projection's two menus offer (MA-301 a 1b): the title picks the view, the hero's corner button the money.
 * Net worth is MA-224's view, Plans MA-222's and Budget forecast MA-262's. */
import type { MoneyBasis } from '#lib/wealth/projection.ts';

export type ViewId = 'net' | 'plans' | 'budget';

export interface View {
	id: ViewId;
	label: string;
	/** Under the title, in place of the run's line. */
	head: string;
}

const NET: View = { id: 'net', label: 'Net worth', head: '' };

export const VIEWS: readonly View[] = [
	NET,
	{ id: 'plans', label: 'Plans', head: 'Each plan on a timeline' },
	{ id: 'budget', label: 'Budget forecast', head: 'What comes in and goes out, each year to the horizon' }
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
