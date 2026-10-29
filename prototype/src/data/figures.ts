/* The figure set, imported as it is from docs/design/figures/ (one source; lesson 13). household-v4 is small and
   imported eagerly; future-plans-v4 (361 KB) is loaded on the Projection and Plans routes only. */
import household from '@fig/household-v4.json';
import ledger from '@fig/demo-ledger-v4.json';

export type Household = typeof household;
export type Ledger = typeof ledger;
export const H: Household = household;
export const L: Ledger = ledger;

let plansP: Promise<any> | null = null;
export function futurePlans(): Promise<any> {
  plansP ??= import('@fig/future-plans-v4.json').then((m) => m.default);
  return plansP;
}
