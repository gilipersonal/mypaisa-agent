/* Area 'records' (MA-290): registering by chat, the check-ins, Activity and a run. See prototype/AREAS.md. */
import { register, type Suggestion } from '../../state/registry';
import type { DemoState } from '../../state/model';
import { ask, flow } from '../kit';
import { DUE_ACTS } from '../home/due';
import { activityPage, runPage } from './activity';
import { FLOW_LIST } from './flows';

const EMI_ID = 'e-emi-paid';
/* EMI interest for November: the balance after October's EMI at the loan's rate, as the engine's schedule has it */
const interest = (d: any) => (d.balance * (d.rate ?? 0.085)) / 12;

DUE_ACTS['e-home-correction'] = (s: DemoState) => ask(s, 'checkin.valuation');
DUE_ACTS[EMI_ID] = (s: DemoState) => ask(s, 'checkin.emi');

const sug = (t: string, icon: string, id: string, hot = true): Suggestion => ({ t, icon, act: flow(id), sug: hot });

register({
  id: 'records',
  pages: [
    { meta: { id: 'activity', title: 'Activity', icon: 'bolt', area: 'records', side: 6, ask: 'Ask what MyPaisa did' }, build: activityPage },
    { meta: { id: 'run', title: 'Run', icon: 'bolt', area: 'records', parent: 'activity', ask: 'Ask about this run' }, build: runPage },
  ],
  flows: FLOW_LIST,
  appliers: {
    /* Undo writes its own reversal event; the balance is put back by check_in_paid:undo through the 'unapply' */
    check_in_undo: () => {},
    /* a loan closed in full (the ledger's b-paid-off, taken instead of Paid) */
    debt_close: (s, ev) => {
      const d: any = s.debts.find((x) => x.id === ev.record); if (!d) return;
      d.balance_before_close = d.balance; d.balance = 0;
      const ci = s.checkIns.find((c) => c.record === ev.record && c.status === 'due'); if (ci) ci.status = 'closed';
      if (!s.applied.includes(EMI_ID)) { s.applied.push(EMI_ID); (s.area.records ??= {}).emiInstead = 'close'; }
    },
    'debt_close:undo': (s, ev) => {
      const d: any = s.debts.find((x) => x.id === ev.record);
      if (d && d.balance_before_close !== undefined) d.balance = d.balance_before_close;
      const ci = s.checkIns.find((c) => c.record === ev.record && c.status === 'closed'); if (ci) ci.status = 'due';
      if (s.area.records?.emiInstead === 'close') { s.applied = s.applied.filter((x) => x !== EMI_ID); delete s.area.records.emiInstead; }
    },
    /* an EMI paid for a different amount: November's interest is added, the amount comes off */
    check_in_amount: (s, ev) => {
      const d: any = s.debts.find((x) => x.id === ev.record); if (!d) return;
      d.balance_before_emi = d.balance; d.balance = Math.max(0, d.balance + interest(d) - (Number(ev.after) || 0));
      const ci = s.checkIns.find((c) => c.record === ev.record && c.status === 'due'); if (ci) ci.status = 'paid';
      if (!s.applied.includes(EMI_ID)) { s.applied.push(EMI_ID); (s.area.records ??= {}).emiInstead = 'amount'; }
    },
    'check_in_amount:undo': (s, ev) => {
      const d: any = s.debts.find((x) => x.id === ev.record);
      if (d && d.balance_before_emi !== undefined) d.balance = d.balance_before_emi;
      const ci = s.checkIns.find((c) => c.record === ev.record && c.status === 'paid'); if (ci) ci.status = 'due';
      if (s.area.records?.emiInstead === 'amount') { s.applied = s.applied.filter((x) => x !== EMI_ID); delete s.area.records.emiInstead; }
    },
    /* a new kind the admin approved: data, not a record (the kinds are listed on the area's own state) */
    kind_add: (s, ev: any) => { ((s.area.records ??= {}).kinds ??= []).push(ev.payload ?? { id: ev.record }); },
  },
  reduce: (s, a) => {
    const st = (s.area.records ??= {});
    if (a.name === 'else') st.else = a.open ?? !st.else;
    else if (a.name === 'ai') s.chat.history.push({ k: 'ai', t: a.t });
    else if (a.name === 'ban') {
      /* the replay's banner sits above the member's opening line, where it falls in time */
      const last = s.chat.history[s.chat.history.length - 1];
      const ban = { k: 'ban' as const, t: a.t };
      if (last?.k === 'me') s.chat.history.splice(s.chat.history.length - 1, 0, ban); else s.chat.history.push(ban);
    }
  },
  suggest: (s) => {
    if (s.viewer === 'arun' && s.clock === 'd1') {
      const monzoDone = s.applied.includes('e-monzo-register');
      if (!monzoDone) return [{ t: '£5,000 in Monzo savings', icon: 'savings', act: flow('register.monzo'), sug: true }];
      const out: Suggestion[] = [];
      if (!s.applied.includes('e-home-correction')) out.push(sug('Is £415,000 still about right?', 'event_available', 'checkin.valuation'));
      out.push(sug('SBI FD, 5 lakh at 7.1%', 'replay', 'register.fd', false));
      return out;
    }
    if (s.clock === 'd1') {
      return s.viewer === 'asha' ? [sug('I have NS&I Premium Bonds too', 'savings', 'register.premium-bonds', false)] : [];
    }
    if ((s.clock === 'd3' || s.clock === 'd3e') && !s.applied.includes(EMI_ID) && s.viewer === 'arun') return [sug("Was November's EMI paid?", 'event_available', 'checkin.emi')];
    return [];
  },
});
