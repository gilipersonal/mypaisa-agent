/* Area 'money' (MA-290): Assets and An asset, Debts and A loan, Budget, and the statement and month-close flows.
   See prototype/AREAS.md. */
import { register } from '../../state/registry';
import { DUE_ACTS } from '../home/due';
import { ask } from '../kit';
import { assetPages } from './assets';
import { debtPages } from './debts';
import { budgetPages } from './budget';
import { appliers, monthCloseFlow, reduceMoney, statementFlow, suggestions } from './statements';

/* Home's "October's budget" due row opens the month-end check-in */
DUE_ACTS['e-month-close'] = (s) => ask(s, 'monthclose.oct');

register({
  id: 'money',
  pages: [...assetPages, ...debtPages, ...budgetPages],
  flows: [statementFlow, monthCloseFlow],
  appliers,
  reduce: reduceMoney,
  suggest: (s) => suggestions(s),
});
