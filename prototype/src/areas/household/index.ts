/* Area 'household' (MA-290): the Admin center, You and the sign-in variants. See prototype/AREAS.md. */
import { register } from '../../state/registry';
import type { Suggestion } from '../../state/registry';
import { adminAppliers, adminFlows, adminPages } from './admin';
import { youAppliers, youFlows, youPages, youReduce } from './you';
import { signinPages, signinReduce } from './signin';
import { askWith, member } from './shared';

register({
  id: 'household',
  pages: [...adminPages, ...youPages, ...signinPages],
  flows: [...adminFlows, ...youFlows],
  appliers: { ...adminAppliers, ...youAppliers },
  reduce: (s, a) => { youReduce(s, a); signinReduce(s, a); },
  suggest: (s, route) => {
    const out: Suggestion[] = [];
    if (route.page.startsWith('admin') && s.viewer === 'arun') {
      if (!s.applied.includes('e-approve-cr26')) out.push({ t: 'Approve cr-26', icon: 'fact_check', act: askWith(s, 'admin.approve'), sug: true });
      if (!s.applied.includes('e-replay')) out.push({ t: 'Replay the failed job', icon: 'replay', act: askWith(s, 'admin.replay') });
      if (!s.applied.includes('e-ceiling')) out.push({ t: "Move prod's ceiling", icon: 'tune', act: askWith(s, 'admin.ceiling') });
      if (member(s, 'asha')?.status === 'active') out.push({ t: 'Pause Asha', icon: 'pause_circle', act: askWith(s, 'admin.pause', { who: 'asha' }) });
      if (member(s, 'asha')?.status === 'paused') out.push({ t: 'Restore Asha', icon: 'play_circle', act: askWith(s, 'admin.restore') });
    }
    return out.slice(0, 3);
  },
});
