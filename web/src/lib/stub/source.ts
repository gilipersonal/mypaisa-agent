/** The stub behind the wealth pages' seam: every answer is worked out from the stub household when it is asked for, so
 * a record the chat has just confirmed is in the next read. */
import type { WealthSource } from '#lib/api/wealth.ts';
import type { DisplayCurrency, Overview } from '#lib/wealth/overview.ts';
import type { Horizon, MoneyBasis, Projection, ProjectionCorrection } from '#lib/wealth/projection.ts';
import type { StubHousehold } from './household.ts';
import { buildOverview } from './overview.ts';
import { buildProjection, correctProjection } from './projection.ts';

export class StubWealthSource implements WealthSource {
	constructor(
		private readonly household: StubHousehold,
		/** The clock a correction's audit line reads; a test passes its own. */
		private readonly now: () => Date = () => new Date()
	) {}

	overview(view: string, currency: DisplayCurrency): Promise<Overview> {
		return Promise.resolve(buildOverview(this.household, view, currency));
	}

	projection(horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency): Promise<Projection> {
		return Promise.resolve(buildProjection(this.household, horizon, money, currency));
	}

	/** Keeps the correction and its audit line. The stub holds one stored run and no engine, so the fan the next read
	 * draws is the same one: only the corrected row and its saved state change (`./projection.ts`). */
	correctProjection(correction: ProjectionCorrection): Promise<void> {
		// A refusal thrown here is the promise's rejection, as the api's 403 or 422 would be.
		return new Promise<void>((resolve) => {
			correctProjection(this.household, correction, this.now());
			resolve();
		});
	}
}

/** Which household the stub starts with: `?stub=empty` in the address opens the app with no records, to see the empty
 * states; anything else is the illustrative household. */
export function startsEmpty(search: string): boolean {
	return new URLSearchParams(search).get('stub') === 'empty';
}

/** Who the stubbed session is signed in as: `?as=asha` in the address opens the app as Asha, a member who is not an
 * admin, to see what she sees; anything else is the owner. */
export function signedInAs(search: string): string | undefined {
	return new URLSearchParams(search).get('as') ?? undefined;
}
