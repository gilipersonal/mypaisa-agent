/** Where the wealth pages read from (MA-208). Today a stub of the design figure set stands behind it
 * (`#lib/stub/source.ts`; Arun, 25 Nov 2026: the whole UX on stubbed data first); each phase's backend story puts the
 * api behind the same seam, and no page changes. Shared by both doors: types only. */
import type { BudgetForecast } from '../wealth/forecast.ts';
import type { DisplayCurrency, Overview } from '../wealth/overview.ts';
import type { Horizon, MoneyBasis, Projection, ProjectionCorrection } from '../wealth/projection.ts';

export interface WealthSource {
	/** The Overview for the household (`household`) or one member's id, in the currency the member reads totals in. */
	overview(view: string, currency: DisplayCurrency): Promise<Overview>;
	/** The Projection's Net worth view (MA-224): the fan to a horizon in years, in each year's money or today's, in the
	 * currency the member reads totals in. The whole household's; there is no member's view of it. */
	projection(horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency): Promise<Projection>;
	/** An admin's correction in place to one of the Projection's figures: an assumption or a plan item. It is refused
	 * for a member who is not an admin, and for a value the figure cannot take; the next read shows it. */
	correctProjection(correction: ProjectionCorrection): Promise<void>;
	/** The Projection's Budget forecast view (MA-262): each year to a horizon against the admins' floor, in each year's
	 * money or today's, with one year's lines, months and the flows behind its spending; the year the chart leads with
	 * when none is asked for. The whole household's, as the Net worth view is. */
	budgetForecast(
		horizon: Horizon,
		money: MoneyBasis,
		currency: DisplayCurrency,
		year?: number
	): Promise<BudgetForecast>;
}
