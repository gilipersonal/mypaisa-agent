/** The stub behind the wealth pages' seam: every answer is worked out from the stub household when it is asked for, so
 * a record the chat has just confirmed is in the next read. */
import type { WealthSource } from '#lib/api/wealth.ts';
import type { DisplayCurrency, Overview } from '#lib/wealth/overview.ts';
import type { StubHousehold } from './household.ts';
import { buildOverview } from './overview.ts';

export class StubWealthSource implements WealthSource {
	constructor(private readonly household: StubHousehold) {}

	overview(view: string, currency: DisplayCurrency): Promise<Overview> {
		return Promise.resolve(buildOverview(this.household, view, currency));
	}
}

/** Which household the stub starts with: `?stub=empty` in the address opens the app with no records, to see the empty
 * states; anything else is the illustrative household. */
export function startsEmpty(search: string): boolean {
	return new URLSearchParams(search).get('stub') === 'empty';
}
