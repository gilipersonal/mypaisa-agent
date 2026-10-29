/* What's due in the next 30 days, as Prototype v4's dueRows lists them, against the demo's clock. A row whose
   event has been applied drops off. */
import type { PagePart } from '../../state/registry';
import type { DemoState } from '../../state/model';
import { DAY_ISO } from '../../state/reduce';

const L: [string, string, string, string, string, string, string, string][] = [
  ['2026-10-26', 'Mon', '26', 'Oct', 'Valuation due: Home, Reading', 'Asks: still about £415,000?', 'Asks you', 'e-home-correction'],
  ['2026-07-15', 'Due', '15', 'Jul', 'Valuation overdue: Flat, Pune', 'Asks: still about ₹1,10,00,000?', 'Overdue', ''],
  ['2026-11-01', 'Sun', '1', 'Nov', "October's budget", 'Closes, with the Barclaycard statement', 'Asks you', 'e-month-close'],
  ['2026-11-01', 'Sun', '1', 'Nov', 'Mortgage · Nationwide', 'autopay · £1,456', '', ''],
  ['2026-11-05', 'Thu', '5', 'Nov', 'HDFC home loan EMI', 'Asks: was ₹39,390 paid?', 'Asks you', 'e-emi-paid'],
  ['2026-11-10', 'Tue', '10', 'Nov', 'Parag Parikh SIP', 'Asks: did ₹10,000 go through?', '', ''],
  ['2026-11-20', 'Fri', '20', 'Nov', 'Barclaycard bill', 'Paid in full, the minimum, or part?', 'Asks you', ''],
  ['2026-12-14', 'Mon', '14', 'Dec', "Asha's fixed-rate saver matures", '£10,460: renewed, paid out or moved?', '', ''],
];
/** An area opens a due row's check-in by setting DUE_ACTS[<the row's ledger event id>] (import it from here). */
export const DUE_ACTS: Record<string, (s: DemoState) => any> = {};
export function DUE(s: DemoState): PagePart[] {
  const today = DAY_ISO[s.clock];
  const acts: Record<string, any> = Object.fromEntries(Object.entries(DUE_ACTS).map(([k, f]) => [k, f(s)]));
  return L.filter((d) => (d[0] >= today || d[6] === 'Overdue') && !(d[7] && s.applied.includes(d[7]))).slice(0, 5).map((d) => {
    const isToday = d[0] === today;
    return { k: 'due', a: isToday ? 'Today' : d[1], b: d[2], c: d[3], today: isToday, name: d[4], sub: d[5] + (d[6] ? ' · ' + d[6] : ''), act: acts[d[7]] } as PagePart;
  });
}
