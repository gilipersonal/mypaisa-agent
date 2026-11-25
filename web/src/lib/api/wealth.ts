/** Where the wealth pages read from (MA-208). Today a stub of the design figure set stands behind it
 * (`#lib/stub/source.ts`; Arun, 25 Nov 2026: the whole UX on stubbed data first); each phase's backend story puts the
 * api behind the same seam, and no page changes. Shared by both doors: types only. */
import type { DisplayCurrency, Overview } from '../wealth/overview.ts';

export interface WealthSource {
	/** The Overview for the household (`household`) or one member's id, in the currency the member reads totals in. */
	overview(view: string, currency: DisplayCurrency): Promise<Overview>;
}
