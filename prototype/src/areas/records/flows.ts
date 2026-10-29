/* The records area's chat flows: registering (iPhone v4 · Register, Prototype v4 steps 2 and 3) and the check-ins
   (iPhone v4 · Check-ins, 1b: Paid is the Confirm). Figures are read from the records and the figure set. */
import { H } from '../../data/figures';
import { totals } from '../../state/totals';
import { totalsOf } from '../../state/ctx';
import { ledgerEvent } from '../../state/reduce';
import type { Ans, Beat, Flow } from '../../state/registry';
import type { Action, ChatCard, DemoState } from '../../state/model';
import { ccard, ckv, cnote, cp, gbp, inr, owners } from '../kit';

const h: any = H;
const A = 'records';
export const area = (name: string, o: Record<string, any> = {}): Action => ({ type: 'area', area: A, name, ...o });
const rec = (s: DemoState, id: string): any => [...s.assets, ...s.debts].find((r) => r.id === id);
const hrec = (id: string): any => [...h.assets, ...h.debts].find((r: any) => r.id === id);
const confirmedIn = (a: Ans) => Object.keys(a).some((k) => k.startsWith('$confirmed'));
const live = (s: DemoState) => !!s.chat.active && !s.chat.active.done && !s.chat.active.cancelled;
const asha = (s: DemoState) => s.viewer === 'asha';
const arun = (s: DemoState) => s.viewer === 'arun';
const NOPE_EDIT: Action = { type: 'nope', t: 'Edit: drawn on the board, not in this demo yet.' };
const done = (key: string, v: string) => ({ k: 'done' as const, key, v });
const chosen = (key: string, label: string, v: string): ChatCard => ccard({ over: label, parts: [done(key, v)] });
const ILLUS = 'Illustrative: drawn on the boards, nothing is saved in this demo.';
const netBefore = (s: DemoState, id: string) => totals(s.assets.filter((x) => x.id !== id), s.debts, null).net_gbp;

/* ---------- Monzo savings ---------- */
const MZ = h.new_record_in_prototype;
const OWN: Record<string, [string, number][]> = { Arun: [['arun', 100]], Asha: [['asha', 100]], Joint: [['arun', 50], ['asha', 50]] };
const whoChips = (s: DemoState) => (asha(s) ? ['Asha', 'Joint'] : ['Arun', 'Asha', 'Joint']).map((t) => ({ t }));
const monzoSaved = (s: DemoState) => s.assets.some((x) => x.id === MZ.id);
function monzoEvent(s: DemoState, a: Ans): Action[] {
  const who: string = a.whose ?? 'Arun';
  if (who === 'Arun' && arun(s)) return [{ type: 'event', id: 'e-monzo-register' }];
  const label = who === 'Joint' ? 'Arun and Asha' : who;
  return [{ type: 'event', id: 'e-monzo-register', with: { actor: s.viewer, illustrative: true, payload: { ...MZ, owners: OWN[who] },
    summary: `Record added · Instant access savings · Monzo · ${label} · Mon 26 Oct 09:41 · in the chat` } }];
}
function monzoCard(s: DemoState, a: Ans): ChatCard {
  const sv = confirmedIn(a); const who = a.whose ?? 'Arun';
  const owner = who === 'Joint' ? 'Arun 50% · Asha 50%' : who;
  return ccard({
    over: sv ? 'New record · saved' : 'New record · check it', title: 'Instant access savings · Monzo', ok: sv,
    parts: sv ? [ckv('Owner', owner), ckv('Value', gbp(MZ.value))]
      : [ckv('Owner', owner), ckv('Value', gbp(MZ.value)), ckv('As of', 'Today, Mon 26 Oct', false), ckv('Kind', 'Savings, UK, in pounds', false), ckv('Counts as', 'Liquid', false), cp('Nothing is saved until you tap Confirm.')],
    acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }],
  });
}
const monzo: Flow = {
  id: 'register.monzo', area: A, title: '£5,000 in Monzo savings', opener: '£5,000 in Monzo savings',
  match: ['monzo savings', '£5,000 in monzo'], needs: (s) => !monzoSaved(s),
  beats: [
    { ai: 'Savings · Monzo, £5,000, in pounds. The one thing missing is whose it is.' },
    { ask: { key: 'whose', label: 'Whose is it?', over: 'New savings · one question', q: 'Whose is it?', chips: (s) => whoChips(s) } },
    { confirm: monzoCard, onConfirm: (s, a) => monzoEvent(s, a), done: () => 'Saved · in the audit log' },
    { ai: (s) => `Done. Net worth ${gbp(netBefore(s, MZ.id))} → ${gbp(totalsOf(s).net_gbp)}, on every open door. Tell me the next one the same way, or send a statement.` },
  ],
};

/* ---------- replays of Sun 25 Oct ---------- */
const banBeat = (t: string): Beat => ({ act: () => [area('ban', { t })] });
const replayFoot = (at: string) => () => `A replay: saved on Sun 25 Oct, ${at}. Nothing new was written.`;
const replayNote = (s: DemoState): Action[] => [];
const fd: Flow = {
  id: 'register.fd', area: A, title: 'SBI FD, a replay', opener: 'SBI FD, 5 lakh at 7.1% for 3 years from 10 March',
  match: ['sbi fd', 'fixed deposit'],
  beats: [
    banBeat("Replay of Sun 25 Oct, 10:01. The SBI FD is already in the household's figures, so net worth does not move."),
    { ask: { key: 'whose', label: 'Whose is it?', over: 'New fixed deposit · 1 of 2', q: 'Whose is it?', chips: [{ t: 'Arun' }, { t: 'Asha' }, { t: 'Joint' }] } },
    { when: (_s, a) => a.whose !== 'Arun', beats: [{ ai: "This is a replay: the FD is Arun's, so I've kept Arun." }] },
    { ask: { key: 'int', label: 'Interest?', over: 'New fixed deposit · 2 of 2', q: 'Is the interest paid out, or added to the deposit?', chips: [{ t: 'Added in, cumulative' }, { t: 'Paid out' }] } },
    { when: (_s, a) => a.int !== 'Added in, cumulative', beats: [{ ai: 'This is a replay: SBI added the interest in, quarterly, so I\'ve kept that.' }] },
    { confirm: (s, a) => {
        const r = hrec('sbi_fd'); const sv = confirmedIn(a);
        return ccard({ over: sv ? 'New fixed deposit · saved' : 'New fixed deposit · check it', title: `SBI · ${inr(r.principal)} at 7.1%`, ok: sv,
          parts: sv ? [ckv('Owner', 'Arun'), ckv('At maturity', `${inr(r.at_maturity)}, Sat 10 Mar 2029`)]
            : [ckv('Owner', 'Arun'), ckv('From', 'Tue 10 Mar 2026, 3 years', false), ckv('Interest', 'Added in, quarterly', false), ckv('Matures', 'Sat 10 Mar 2029', false), ckv('At maturity', inr(r.at_maturity)), ckv('On maturity', "I'll ask you then", false),
              cp("MyPaisa's engine works out the maturity from the rate, the term and SBI's quarterly compounding. Nothing is saved until you tap Confirm.")],
          acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
      }, onConfirm: () => [{ type: 'event', id: 'e-fd-register' }], done: replayFoot('10:03') },
    { ai: (s) => `A replay: the FD counts at ${inr(rec(s, 'sbi_fd').value)} today, the engine's figure, and has since Sun 25 Oct. Net worth stays ${gbp(totalsOf(s).net_gbp)}.` },
  ],
};
const pune: Flow = {
  id: 'register.pune', area: A, title: 'The Pune flat, a replay', opener: 'Our flat in Pune, half each. Valued at 1.1 crore in January, bought July 2015 for 65 lakh, rented at 18k a month.',
  match: ['flat in pune', 'pune flat'],
  beats: [
    banBeat('Replay of Sun 25 Oct, 10:15. The Pune flat is already in the household\'s figures, so net worth does not move.'),
    { confirm: (s, a) => {
        const r = hrec('pune'); const sv = confirmedIn(a);
        return ccard({ over: sv ? 'New property · saved' : 'New property · check it', title: `${r.name} · ${inr(r.value)}`, ok: sv,
          parts: [ckv('Owners', owners(r.owners)), ckv('Valued', 'Jan 2026, your figure', false), ckv('Bought', `Jul 2015, ${inr(r.bought[1])}`), ckv('In pounds', `${gbp(r.value / 112.5)} at ₹112.50 per £`), ckv('Rent in', `${inr(r.rent_month)} a month, shared`),
            { k: 'flag', t: 'Day the rent arrives: not given. Which day of the month? You can confirm without it; the rent\'s check-in waits for it.' }, ...(sv ? [] : [cp('Nothing is saved until you tap Confirm.')])],
          acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
      }, onConfirm: replayNote, done: replayFoot('10:15') },
  ],
};
const hdfc: Flow = {
  id: 'register.hdfc', area: A, title: 'The HDFC loan, part-way through, a replay',
  opener: "HDFC home loan on the Pune flat: ₹15,13,257 left after October's EMI. The EMI is ₹39,390 on the 5th, and it ends Jul 2030.",
  match: ['home loan on the pune', 'hdfc loan'],
  beats: [
    banBeat("Replay of Sun 25 Oct, 10:20. The HDFC loan is already in the household's figures, so net worth does not move."),
    { ask: { key: 'rate', label: 'Rate?', over: 'New home loan · one question', q: "What's the interest rate? I can't look up your loan's rate. Type it, or send HDFC's latest statement.", chips: [{ t: '8.5%' }, { t: "Send HDFC's statement", v: 'stmt' }] } },
    { when: (_s, a) => a.rate === 'stmt', beats: [{ ai: "This is a replay: the statement isn't drawn here, so I've used the rate you gave on Sun 25 Oct, 8.5%." }] },
    { confirm: (s, a) => {
        const d = hrec('hdfc'); const sv = confirmedIn(a);
        const interest = d.balance * d.rate / 12, principal = d.payment - interest;
        return ccard({ over: sv ? 'New home loan · saved' : 'New home loan · check it', title: `HDFC · ${inr(d.balance)} left`, ok: sv,
          parts: [ckv('Owner', 'Arun'), ckv('Secured on', 'Flat, Pune', false), ckv('Rate · EMI', `8.5% · ${inr(d.payment)} on the 5th`), ckv('Ends', 'Jul 2030', false), ckv('Starts from', "after Mon 5 Oct's EMI", false), ckv('Prepaying', 'shortens the term', false),
            cp(`The engine's schedule: of November's EMI, ${inr(interest)} is interest and ${inr(principal)} comes off the balance.`),
            ...(sv ? [] : [cp('No payments before October are needed. Nothing is saved until you tap Confirm.')])],
          acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
      }, onConfirm: replayNote, done: replayFoot('10:21') },
  ],
};
const ashaFund: Flow = {
  id: 'register.asha-fund', area: A, title: "Asha's fund, a replay",
  opener: "Add Asha's Parag Parikh Flexi Cap, direct growth: 6,437.512 units, SIP ₹10,000 on the 10th",
  match: ['parag parikh', 'flexi cap'],
  beats: [
    banBeat("Replay of Sun 25 Oct, 10:30. Asha's fund is already in the household's figures, so net worth does not move."),
    { confirm: (s, a) => {
        const f = hrec('ppfas'); const sv = confirmedIn(a); const forAsha = arun(s);
        return ccard({ over: sv ? 'New holding · saved' : 'New holding · check it', title: f.name, ok: sv, tag: forAsha ? 'For Asha' : undefined,
          parts: [...(forAsha ? [cnote('badge', "Asha owns it. You are adding it for her; it counts in her share.")] : []),
            ckv('Owner', 'Asha'), ckv('Folio', 'CAMS', false), ckv('Units', f.units.toLocaleString('en-GB', { minimumFractionDigits: 3 }), false), ckv('Value', inr(Math.round(f.units * f.nav))), ckv('NAV', `${'₹' + f.nav.toFixed(2)}, AMFI, Fri 23 Oct`, false), ckv('SIP', `${inr(f.sip[0])} on the ${f.sip[1]}th`, false),
            cp(`Her SIP check-ins go to her, from Tue 10 Nov.${sv ? '' : ' Nothing is saved until you tap Confirm.'}`)],
          acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
      }, onConfirm: replayNote, done: replayFoot('10:31') },
  ],
};
const noHistory: Flow = {
  id: 'register.no-history', area: A, title: 'Infosys, no history yet, a replay', opener: '120 Infosys shares in my Zerodha demat',
  match: ['infosys'],
  beats: [
    banBeat("Replay of Sun 25 Oct, 10:40. The Infosys holding is already in the household's figures, so net worth does not move."),
    { card: (s) => { const r = hrec('infosys'); return ccard({ over: 'New holding · saved', title: `Infosys · ${r.units} shares`, ok: true, parts: [ckv('Value', inr(r.value)), cp(`At ${'₹' + r.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })} a share, the Fri 23 Oct close · saved 10:40, in the audit log`)] }); } },
    { ask: { key: 'hist', label: 'Its return', over: 'Infosys · its return', q: "It has no history yet, so the engine can't work out its return. Send past buys, or give an estimate. Past buys: Zerodha's tax P&L or your contract notes.", chips: [{ t: 'Send past buys' }, { t: 'Give an estimate' }, { t: 'Later' }] } },
    { when: (_s, a) => a.hist === 'Send past buys', beats: [{ ai: "Send the file here and I'll read it like any statement. (Not drawn for this demo: nothing is saved.)" }] },
    { when: (_s, a) => a.hist === 'Later', beats: [{ ai: "No problem. I'll ask again when you next open Infosys." }] },
    { when: (_s, a) => a.hist === 'Give an estimate', beats: [
      { ask: { key: 'est', label: 'Past buys or an estimate?', over: 'Infosys · its return', q: 'About what return a year?', chips: [{ t: 'About 9% a year' }] } },
      { confirm: (s, a) => {
          const sv = confirmedIn(a);
          return ccard({ over: 'Infosys · its return · ' + (sv ? 'saved' : 'check it'), title: '9% a year', tag: 'your estimate', ok: sv,
            parts: [ckv('Used in', 'the projection', false), ckv('Shown as', 'your estimate, everywhere', false), ckv('Replaced by', "the engine's return, from past buys", false),
              cp("MyPaisa does not check an estimate; it only keeps it apart from the engine's figures." + (sv ? '' : ' Nothing is saved until you tap Confirm.'))],
            acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
        }, onConfirm: replayNote, done: replayFoot('10:43') },
    ] },
  ],
};

/* ---------- Premium Bonds: a new kind, the admin's ---------- */
const KIND = { id: 'premium_bonds', name: 'NS&I Premium Bonds', built_from: 'Cash: the last figure given', interest: 'none', prizes: 'income, in the budget', where: 'UK, in pounds, liquid' };
const kindParts = () => [ckv('Built from', KIND.built_from, false), ckv('Interest', KIND.interest, false), ckv('Prizes', KIND.prizes, false), ckv('Where', KIND.where, false)];
const premium: Flow = {
  id: 'register.premium-bonds', area: A, title: 'Premium Bonds, a new kind', opener: 'I have NS&I Premium Bonds too',
  match: ['premium bond'],
  beats: [
    banBeat('A side branch, Sat 31 Oct: Asha asks for a kind MyPaisa does not know, and the admin approves it. Illustrative: the demo clock stays where it was.'),
    { when: (s) => asha(s), beats: [{ ai: "Premium Bonds aren't a kind MyPaisa knows yet, so I can't add them today. I've asked Arun to approve one; I'll pick this up with you when he does.", meta: 'Nothing saved · waiting for Arun', metaIcon: 'hourglass_top' }] },
    { when: (s) => arun(s), beats: [
      { ask: { key: 'decide', label: 'New kind', over: 'New kind · to approve', q: "NS&I Premium Bonds isn't a kind yet: add it as cash, no interest, prizes as income? Asked for by Asha, 10:12. A kind is data: no screen or form changes.", chips: [{ t: 'Approve' }, { t: 'Reject' }] } },
      { when: (_s, a) => a.decide === 'Reject', beats: [{ ai: "Rejected. I'll tell Asha plainly that it isn't a kind yet. Nothing was saved." }] },
      { when: (_s, a) => a.decide === 'Approve', beats: [
        { ask: { key: 'check', label: 'Second check', over: "Check it's you · Admin change", q: 'Add a new kind: NS&I Premium Bonds. The server binds a challenge to this change; Apple signs you in again to answer it. A passkey under Face ID answers it too.', chips: [{ t: 'Sign in with Apple' }, { t: 'Face ID' }] } },
        { confirm: (_s, a) => {
            const sv = confirmedIn(a);
            return ccard({ over: sv ? 'New kind · approved' : 'New kind · check it', chip: 'Admin', chipIcon: 'shield_person', title: `${KIND.name} is a kind now`, ok: sv, parts: [...kindParts(), ckv('Checked with', a.check ?? 'Sign in with Apple', false), cp(sv ? "Asha's registration picks up in her chat, with her own Confirm." : 'Nothing is saved until you tap Confirm.')] });
          },
          onConfirm: () => [{ type: 'branch.start', name: 'Premium Bonds, a new kind' }, { type: 'event', ev: { id: 'e-kind-premium', at: '2026-11-05T21:30:00', actor: 'arun', via: 'admin', kind: 'kind_add', record: KIND.id, field: null, before: null, after: null,
            summary: 'New kind added · NS&I Premium Bonds · cash, no interest, prizes as income · Arun · passkey · illustrative', illustrative: true, payload: KIND } as any }], done: () => 'Approved · in the audit log' },
        { ai: "Done. NS&I Premium Bonds is a kind now. Asha's registration picks up in her chat, with her own Confirm." },
      ] },
    ] },
  ],
};

/* ---------- check-ins ---------- */
const emiOf = (s: DemoState) => rec(s, 'hdfc');
const emiPaid = (s: DemoState) => s.applied.includes('e-emi-paid');
const NOT_YOURS: Beat = { ai: "That's Arun's loan, so the check-in comes to him. Nothing for you to answer." };
function emiCard(s: DemoState, a: Ans): ChatCard {
  const d = emiOf(s) ?? hrec('hdfc'); const emi = inr(h.debts.find((x: any) => x.id === 'hdfc').payment);
  const sv = confirmedIn(a); const open = !!s.area[A]?.else && live(s);
  if (sv) return ccard({ chip: 'Check-in', chipIcon: 'event_available', right: 'answered 09:12', title: "Paid · November's EMI", ok: true,
    parts: [ckv('Paid', `${emi} on Thu 5 Nov`), ckv('Loan', 'HDFC home loan · Pune flat', false), ckv('Left to pay', inr(d.balance)), cp("Left to pay is the engine's schedule after this EMI.")] });
  return ccard({ chip: 'Check-in', chipIcon: 'event_available', right: 'due today', title: `Was November's EMI of ${emi} paid?`,
    parts: [ckv('Loan', 'HDFC home loan · Pune flat', false), ckv('Paid saves', `${emi} on Thu 5 Nov`), ...(open ? [] : [cp('One tap on Paid saves exactly this, with Undo.')])],
    acts: [{ t: 'Paid', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Something else', cls: open ? 'outl' : '', icon: open ? 'expand_less' : 'expand_more', act: [area('else'), { type: 'flow.edit', key: '$redraw' }] }],
    fold: open ? [
      { t: 'Not yet', s: "I'll ask again on Mon 9 Nov", act: { type: 'flow.start', id: 'checkin.emi-notyet' } },
      { t: 'Different amount', s: 'Tell me what was paid', act: { type: 'flow.start', id: 'checkin.emi-other' } },
      { t: 'Paid off in full', s: 'Closes the loan, after a Confirm', act: { type: 'flow.start', id: 'checkin.paid-off' } }] : undefined });
}
const answered = (what: string): Beat => ({ card: () => chosen('Answer', "Check-in · November's EMI", what) });
const emi: Flow = {
  id: 'checkin.emi', area: A, title: "November's EMI", match: [/\bemi\b/, 'home loan check'],
  needs: (s) => !emiPaid(s) && (s.clock === 'd3' || s.clock === 'd3e' || s.clock === 'd4'),
  beats: [
    { act: () => [area('else', { open: false })] },
    { when: (s) => asha(s), beats: [NOT_YOURS] },
    { when: (s) => arun(s), beats: [
      { confirm: emiCard, label: 'Paid', done: () => 'Saved · in the audit log',
        onConfirm: () => [area('else', { open: false }), { type: 'event', id: 'e-emi-paid' },
          { type: 'undoable', label: 'EMI paid', acts: [{ type: 'event', id: 'e-emi-undo' }, { type: 'unapply', id: 'e-emi-paid' }, area('ai', { t: 'Undone at 09:13. The payment is reversed by a new event; both stay in the audit log. The check-in is open again.' })] }] },
    ] },
  ],
};
const emiNotYet: Flow = {
  id: 'checkin.emi-notyet', area: A, title: 'EMI: not yet',
  beats: [answered('Not yet'), { card: () => ccard({ chip: 'Check-in', chipIcon: 'event_available', right: 'answered', title: "Not yet · November's EMI", parts: [cp("I'll ask again on Mon 9 Nov. If it's still open then, it shows as overdue on Home."), ckv('Loan', 'HDFC home loan · Pune flat', false), ckv('Due', `Thu 5 Nov · ${inr(39390)}`)], foot: 'Noted · nothing saved to the loan', footIcon: 'schedule' }) }],
};
const INTEREST = (d: any) => d.balance * d.rate / 12;
const emiOther: Flow = {
  id: 'checkin.emi-other', area: A, title: 'EMI: a different amount',
  beats: [
    answered('Different amount'),
    { ask: { key: 'amt', label: 'Amount', over: 'Different amount · one question', q: "How much went to HDFC on Thu 5 Nov? More than ₹39,390: I'll ask whether the extra shortens the term or lowers the EMI. Less: the rest stays due.", chips: [{ t: '₹50,000, more than the EMI', v: 50000 }, { t: '₹30,000, less than the EMI', v: 30000 }] } },
    { when: (_s, a) => a.amt > 39390, beats: [{ ai: "More than the EMI. I'll apply the extra to the balance and shorten the term, India's default." }] },
    { when: (_s, a) => a.amt < 39390, beats: [{ ai: 'Less than the EMI, so the rest stays due.' }] },
    { confirm: (s, a) => {
        const sv = confirmedIn(a); const d = emiOf(s) ?? hrec('hdfc');
        return ccard({ over: 'Different amount · ' + (sv ? 'saved' : 'check it'), title: `Paid ${inr(a.amt)} · November's EMI`, ok: sv,
          parts: [ckv('Paid', `${inr(a.amt)} on Thu 5 Nov`), ckv('Loan', 'HDFC home loan · Pune flat', false), ckv('Left to pay', inr(sv ? d.balance : d.balance + INTEREST(d) - a.amt)), cp('A side branch: the figure set holds no total for this answer. ' + (sv ? '' : 'Nothing is saved until you tap Confirm.'))] });
      }, label: 'Confirm', done: () => 'Saved in a side branch · in the audit log',
      onConfirm: (s, a) => [{ type: 'branch.start', name: 'EMI, a different amount' }, { type: 'event', ev: { id: 'e-emi-amount', at: '2026-11-05T09:14:00', actor: s.viewer, via: 'check_in', kind: 'check_in_amount', record: 'hdfc', field: 'emi', before: null, after: a.amt, ccy: 'INR',
        summary: `EMI paid, a different amount · HDFC home loan · ${inr(a.amt)} · Arun · Thu 5 Nov 09:14 · on the check-in · illustrative`, run: null, file: null, illustrative: true } as any }] },
  ],
};
const paidOff: Flow = {
  id: 'checkin.paid-off', area: A, title: 'EMI: paid off in full',
  beats: [
    answered('Paid off in full'),
    { ask: { key: 'amt', label: 'Final amount', over: 'Paid off in full · 1 of 2', q: "What was the final amount? Use HDFC's closing figure, or the engine's for Thu 5 Nov. The engine's figure: the balance after October's EMI, with November's interest.", chips: [{ t: `${inr(ledgerEvent('e-hdfc-closed')!.before as number)} · the engine's figure`, v: 'engine' }] } },
    { ask: { key: 'when', label: 'Paid on', over: 'Paid off in full · 2 of 2', q: 'When was it paid?', chips: [{ t: 'Today, Thu 5 Nov' }, { t: 'Another day' }] } },
    { when: (_s, a) => a.when !== 'Today, Thu 5 Nov', beats: [{ ai: "A date picker isn't drawn for this demo, so I've used today, Thu 5 Nov." }] },
    { confirm: (_s, a) => {
        const sv = confirmedIn(a); const amt = inr(ledgerEvent('e-hdfc-closed')!.before as number);
        return ccard({ over: sv ? 'Loan closed · saved' : 'Close the loan · check it', title: sv ? 'HDFC home loan · closed' : 'HDFC home loan, paid off in full', ok: sv,
          parts: sv ? [ckv('Paid off', `${amt}, Thu 5 Nov`), ckv('Its check-ins', 'ended', false)]
            : [ckv('Final payment', amt), ckv('Paid on', 'Thu 5 Nov', false), ckv('The loan', 'closes; kept in the history', false), ckv('Its check-ins', 'end with this one', false), ckv('Then', 'the projection runs again', false), cp('Nothing is saved until you tap Confirm.')],
          acts: [{ t: 'Confirm', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Edit', act: NOPE_EDIT }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
      }, onConfirm: () => [{ type: 'branch.start', name: 'HDFC paid off in full' }, { type: 'event', id: 'e-hdfc-closed' }], done: () => 'Saved in a side branch · in the audit log' },
    { ai: (s) => `The Pune flat has no loan on it now. The projection ran again, with ${inr(hrec('hdfc').payment)} a month freed from December.` },
  ],
};

/* the valuation check-in (Mon 26 Oct 09:00): Home, Reading */
const HOME = () => hrec('home');
const valuation: Flow = {
  id: 'checkin.valuation', area: A, title: 'Is Home still about right?', match: ['valuation', 'still about right'],
  needs: (s) => s.clock === 'd1' && !s.applied.includes('e-home-correction'),
  beats: [
    { ask: { key: 'ok', label: 'Home, Reading', over: 'Check-in · valuation due', q: (s) => `Is ${gbp(rec(s, 'home').value)} still about right for Home, Reading? Last valued Thu 30 Apr, your figure. Next: Flat, Pune, overdue since 15 Jul.`, chips: [{ t: 'Still right' }, { t: 'Change it' }] } },
    { when: (_s, a) => a.ok === 'Still right', beats: [{ ai: (s) => `Kept at ${gbp(rec(s, 'home').value)} as today's valuation. (Illustrative: the demo's ledger holds no event for this answer, so nothing is saved.)` }] },
    { when: (s, a) => a.ok === 'Change it' && asha(s), beats: [
      { card: () => ccard({ over: 'Home, Reading · a joint record', title: 'Only Arun can correct this', parts: [{ k: 'lock', t: "Home is joint, so a member's correction goes to the admin. Nothing was saved." }] }) },
      { ai: "I've left a note for Arun that you think Home's value has moved. He'll correct it from Home." }] },
    { when: (s, a) => a.ok === 'Change it' && arun(s), beats: [
      { ask: { key: 'val', label: 'New value', over: 'Home, Reading · new value', q: "What is Home worth now? Today's figure, your estimate; saved after a Confirm.", chips: [{ t: '£428,000', v: 428000 }, { t: '£421,000', v: 421000 }] } },
      { confirm: (s, a) => {
          const sv = confirmedIn(a); const before = HOME().value; const after: number = a.val;
          const net = totalsOf(s).net_gbp;
          return ccard({ over: sv ? 'Correction · saved' : 'Correction · check it', title: 'Home, Reading', ok: sv,
            parts: [ckv('Before', gbp(before)), ckv('After', `${gbp(after)}, your estimate`), ckv('Net worth', sv ? `${gbp(net - (after - before))} → ${gbp(net)}` : `${gbp(net)} → ${gbp(net + after - before)}`, false), cp(sv ? 'Saved as your estimate.' : 'A correction says a figure shown was wrong. Nothing is saved until you tap Save.')],
            acts: [{ t: 'Save', cls: 'cbtn-primary', act: { type: 'flow.confirm' } }, { t: 'Cancel', cls: 'cbtn-ghost', act: { type: 'flow.cancel' } }] });
        }, label: 'Save', done: () => 'Saved · in the audit log',
        onConfirm: (_s, a) => (a.val === 428000 ? [{ type: 'event', id: 'e-home-correction' }]
          : [{ type: 'event', id: 'e-home-correction', with: { after: a.val, illustrative: true, summary: `Correction · Home, Reading · £415,000 → ${gbp(a.val)}, your estimate · Arun · Mon 26 Oct 09:52 · in place` } }]) },
      { ai: (s) => `Saved as a correction, your estimate. Net worth is now ${gbp(totalsOf(s).net_gbp)}, the engine's figure. The next valuation check-in is in six months.` },
    ] },
  ],
};

/* check-ins on days the boards draw but the demo's clock never reaches: illustrative, nothing saved */
const future = (day: string): Beat => banBeat(`${day}: a day the boards draw. The demo's clock stops on Fri 6 Nov, so this check-in is illustrative and saves nothing.`);
const bill = h.statements_oct.barclaycard_nov;
const cardBill: Flow = {
  id: 'checkin.card-bill', area: A, title: 'The Barclaycard bill',
  beats: [
    future('Fri 20 Nov'),
    { card: () => ccard({ chip: 'Check-in', chipIcon: 'event_available', right: 'due today', title: `Was the ${gbp(bill.balance)} Barclaycard bill paid in full?`, parts: [ckv('Statement', 'Sun 1 Nov', false), ckv('Minimum', gbp(bill.minimum)), ckv('Paid in full saves', `${gbp(bill.balance)} on Fri 20 Nov`), cp('A payment to the card is a transfer, not spending; the spending was the statement\'s lines.')] }) },
    { ask: { key: 'bill', label: 'Answer', over: 'Check-in · Barclaycard bill', q: 'Paid in full, the minimum, or part?', chips: [{ t: 'Paid in full' }, { t: `The minimum, ${gbp(bill.minimum)}` }, { t: 'Part of it' }, { t: 'Not yet' }] } },
    { when: (_s, a) => a.bill === 'Paid in full', beats: [{ ai: `Paid in full would save ${gbp(bill.balance)} as a transfer to the card. ${ILLUS}` }] },
    { when: (_s, a) => String(a.bill).startsWith('The minimum'), beats: [{ ai: `${gbp(bill.balance - bill.minimum)} carries over; its interest counts as spending once the next statement shows it. ${ILLUS}` }] },
    { when: (_s, a) => a.bill === 'Part of it', beats: [{ ai: `I'd ask how much, then show a Confirm card. ${ILLUS}` }] },
    { when: (_s, a) => a.bill === 'Not yet', beats: [{ ai: `I'll ask again on Mon 23 Nov. ${ILLUS}` }] },
  ],
};
const several: Flow = {
  id: 'checkin.several', area: A, title: 'Several due at once',
  beats: [
    future('Fri 20 Nov'),
    { card: () => ccard({ chip: 'Check-ins', chipIcon: 'event_available', right: '2 due', title: 'HDFC EMI and the Barclaycard bill',
      parts: [{ k: 'line', lead: '₹', name: 'HDFC home loan', sub: "November's EMI · left open after Not yet", v: inr(h.debts.find((d: any) => d.id === 'hdfc').payment), tag: 'Overdue', tagCls: 'amber' },
        { k: 'line', lead: '£', name: 'Barclaycard bill', sub: 'Statement Sun 1 Nov · due today', v: gbp(bill.balance) },
        cp('All paid saves each exactly as shown. Two currencies, no total: they are never added together.')] }) },
    { ask: { key: 'all', label: 'Answer', over: 'Check-ins · two due', q: 'Were both paid?', chips: [{ t: 'All paid' }, { t: 'One by one' }] } },
    { ai: (_s, a) => (a.all === 'All paid' ? `All paid would save both, each with its own audit row, and Undo both reverses both. ${ILLUS}` : `One by one opens each row's own card. ${ILLUS}`) },
  ],
};
const sip: Flow = {
  id: 'checkin.sip', area: A, title: "Asha's SIP",
  beats: [
    future('Tue 10 Nov'),
    { card: () => { const f = hrec('ppfas'); return ccard({ chip: 'Check-in', chipIcon: 'event_available', right: 'due today', title: `Did November's SIP of ${inr(f.sip[0])} go through?`, parts: [ckv('Fund', 'Parag Parikh Flexi Cap', false), ckv('Went through saves', `a ${inr(f.sip[0])} buy, Tue 10 Nov`), cp("Its units come at that day's NAV, from AMFI, once it is published.")] }); } },
    { ask: { key: 'sip', label: 'Answer', over: "Check-in · Asha's SIP", q: "Asha's fund, so Asha is asked.", chips: [{ t: 'Went through' }, { t: 'Skipped this month' }, { t: 'Stopped' }] } },
    { ai: (_s, a) => `${a.sip === 'Went through' ? 'Went through saves the buy, units at AMFI\'s NAV that day.' : a.sip === 'Stopped' ? 'Stopped ends the SIP and its check-ins, after a Confirm card.' : 'Skipped keeps the SIP for December.'} ${ILLUS}` },
  ],
};
const saver: Flow = {
  id: 'checkin.saver', area: A, title: 'The saver matures',
  beats: [
    future('Mon 14 Dec'),
    { card: () => { const v = hrec('saver'); return ccard({ chip: 'Check-in', chipIcon: 'event_available', right: 'matures today', title: `Your fixed-rate saver matured today with ${gbp(v.at_maturity)}. What happened to it?`, parts: [ckv('Saver', 'Nationwide, 4.6% fixed', false), ckv('Opened', `Sun 14 Dec 2025, ${gbp(v.value)}`), ckv('At maturity', gbp(v.at_maturity)), cp('Nothing is assumed: pick what happened.')] }); } },
    { ask: { key: 'sv', label: 'What happened?', over: "Check-in · Asha's saver", q: 'What happened to it?', chips: [{ t: 'Renewed' }, { t: 'Paid out' }, { t: 'Moved' }] } },
    { ai: (_s, a) => `${a.sv === 'Renewed' ? 'Renewed asks the term, then the rate, then a Confirm card starts a successor.' : a.sv === 'Paid out' ? 'Paid out asks where the money went.' : 'Moved asks which record it joined.'} ${ILLUS}` },
  ],
};
const digest: Flow = {
  id: 'checkin.digest', area: A, title: 'The weekly autopay digest', match: ['digest', 'autopay'],
  beats: [
    { card: () => {
        const d = h.autopay_digest_week; const sum = d.assumed_paid.reduce((t: number, r: string[]) => t + Number(r[1].replace(/[£,]/g, '')), 0);
        return ccard({ chip: 'Weekly digest', chipIcon: 'summarize', right: 'week of Mon 19 Oct', title: `Autopay: ${d.assumed_paid.length} payments assumed paid`,
          parts: [...d.assumed_paid.map((r: string[]) => ({ k: 'line' as const, name: r[0], sub: r[2], v: r[1] })), { k: 'line', name: 'In all', v: gbp(sum) },
            cp("Both are on autopay, so each was saved as paid once its grace passed. Nothing to do unless one didn't go.")],
          acts: [{ t: "One didn't go", act: { type: 'nope', t: "One didn't go: opens a short flow per row, drawn on the board, not in this demo yet." } }, { t: 'Open Debts', icon: 'chevron_right', act: { type: 'nav', page: 'debts' } }] });
      } },
  ],
};

export const FLOW_LIST: Flow[] = [monzo, fd, pune, hdfc, ashaFund, noHistory, premium, valuation, emi, emiNotYet, emiOther, paidOff, cardBill, several, sip, saver, digest];
