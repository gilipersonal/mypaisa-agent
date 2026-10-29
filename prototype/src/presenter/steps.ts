/* The household story, step by step (presenter mode). Each step's `run` is exactly what walking it produces, taken
   from the action lists the area lanes reported, so jumping to a step equals walking to it (tests/walk.test.ts).
   `expect` names the ledger events a step writes: when the presenter has already done them by hand, Continue does not
   run the step again. */
import type { Action } from '../state/model';
import { addSteps, type Step } from './script';

const start = (id: string, ans?: Record<string, any>): Action => ({ type: 'flow.start', id, ...(ans ? { ans } : {}) });
const answer = (key: string, v: any, label?: string): Action => ({ type: 'flow.answer', key, v, label: label ?? String(v) });
const confirm: Action = { type: 'flow.confirm' };
const nav = (page: string, params?: Record<string, string>): Action => ({ type: 'nav', page, params });
const at = (time: string): Action => ({ type: 'time', time });

type S = Step & { expect?: string[] };
const S: S[] = [
  /* Mon 26 Oct */
  { id: 'signin', chapter: 'Mon 26 Oct', title: 'Sign in', door: 'web', enter: [], run: [{ type: 'signIn', method: 'Apple' }],
    guide: 'Tap Sign in with Apple.', talk: 'No password: Apple, Google, or a passkey after the first sign-in. The chat sits beside every page.' },
  { id: 'monzo', chapter: 'Mon 26 Oct', title: 'First record', enter: [at('09:41')], expect: ['e-monzo-register'],
    run: [start('register.monzo'), answer('whose', 'Arun'), confirm],
    guide: 'Tap the "£5,000 in Monzo savings" chip, answer Whose, then Confirm.', talk: 'Anything new is added by talking: one question at a time, then one Confirm card. Watch the net worth move: £439,951 to £444,951.' },
  { id: 'fd', chapter: 'Mon 26 Oct', title: 'SBI FD replay',
    run: [start('register.fd'), answer('whose', 'Arun'), answer('int', 'Added in, cumulative'), confirm],
    guide: 'Tap the SBI FD replay chip and its answers.', enter: [], talk: 'How Sunday\'s fixed deposit was registered: rupees, interest added in, the maturity worked out. A replay: nothing new is written.' },
  { id: 'valuation', chapter: 'Mon 26 Oct', title: 'Check-in, corrected', enter: [at('09:52')], expect: ['e-home-correction'],
    run: [start('checkin.valuation'), answer('ok', 'Change it'), answer('val', 428000, '£428,000'), confirm],
    guide: 'Open the valuation check-in (the Home due row or the chip), tap Change it, pick £428,000, Save.', talk: 'A figure is corrected in place, before and after, and written as one correction in the audit log. £444,951 to £457,951.' },
  { id: 'activity', chapter: 'Mon 26 Oct', title: 'Activity and a run', enter: [nav('activity')],
    run: [nav('run', { id: 'r-1235' })],
    guide: 'Open Activity, then the 09:41 run.', talk: 'Every run the agent made: its steps, its model calls, its tool calls and what it cost, to the cent.' },
  { id: 'audit', chapter: 'Mon 26 Oct', title: 'Audit', enter: [], run: [nav('audit')],
    guide: 'Open Audit.', talk: 'One row per change: who, what, how, when, before and after, and the run behind it.' },
  /* Sun 1 Nov */
  { id: 'statements', chapter: 'Sun 1 Nov', title: 'Statements', enter: [{ type: 'clock', to: 'd2' }, nav('home')], expect: ['e-statements'],
    run: [start('statement.oct'), answer('u0', 'Shopping'), answer('u1', 'Other'), confirm],
    guide: 'Tap "Send the statements", answer the two amber lines, Confirm.', talk: 'Two statements in, two questions about lines it was unsure of, one Confirm. The car loan\'s EMI is confirmed by the statement on the way.' },
  { id: 'close', chapter: 'Sun 1 Nov', title: 'Month close', enter: [], expect: ['e-month-close'],
    run: [start('monthclose.oct'), confirm, nav('budget')],
    guide: 'Close October from the chip, then open Budget.', talk: 'October closes on the 1st: plan against actual, and the surplus.' },
  { id: 'files', chapter: 'Sun 1 Nov', title: 'Files', enter: [], run: [nav('files'), nav('file', { id: 'f-barclay' })],
    guide: 'Open Audit, Files, then the Barclaycard statement.', talk: 'Every file a member sends is kept for good, and opens from the audit log with the lines it made.' },
  /* Thu 5 Nov */
  { id: 'emi', chapter: 'Thu 5 Nov', title: 'EMI check-in', enter: [{ type: 'clock', to: 'd3' }, at('09:12'), nav('home')], expect: ['e-emi-paid'],
    run: [start('checkin.emi'), confirm, nav('debt', { id: 'hdfc' })],
    guide: 'Open the HDFC EMI check-in, tap Paid (Undo is offered), then the loan.', talk: 'Paid is the Confirm. Undo is there for a moment, and writes a reversal, never a delete.' },
  { id: 'projection', chapter: 'Thu 5 Nov', title: 'Projection', enter: [], run: [nav('projection')],
    guide: 'Open Projection.', talk: 'The fan first: the middle path and eight in ten outcomes, milestones and plan items, and the assumptions behind them.' },
  { id: 'whatif', chapter: 'Thu 5 Nov', title: 'A what-if', enter: [],
    run: [start('whatif.flat'), { type: 'flow.cancel' }],
    guide: 'Ask the second-flat what-if, look at the fan, then Cancel.', talk: 'A what-if changes nothing until it is saved as a plan item; Cancel leaves the plan as it was.' },
  /* Thu 5 Nov, evening */
  { id: 'school', chapter: 'Thu 5 Nov, evening', title: 'School fees', enter: [{ type: 'clock', to: 'd3e' }], expect: ['e-school-fees', 'e-school-pot'],
    run: [start('plan.school'), answer('until', 'Jul 2041'), answer('grows', '4.5% a year'), answer('from', 'The monthly budget'), confirm, answer('opt', 'pot'), confirm],
    guide: 'Add the school fees plan in the chat: a card per step, then the pot.', talk: 'A plan item by talking: when, how it grows, where it is paid from; then the options, and November\'s budget changes with it.' },
  { id: 'salary', chapter: 'Thu 5 Nov, evening', title: 'Salary and HDFC', enter: [], expect: ['e-salary-step', 'e-hdfc-close'],
    run: [start('plan.salary-step'), confirm, start('plan.hdfc-close'), confirm],
    guide: 'Add the salary step, then close the HDFC loan with the FD.', talk: 'Each plan item moves the fan, and each is one row in the audit log.' },
  { id: 'forecast', chapter: 'Thu 5 Nov, evening', title: 'Budget forecast', enter: [], run: [nav('projection', { tab: 'forecast' })],
    guide: 'Open Projection, Budget forecast.', talk: 'The surplus first: the leanest month against the floor, year by year.' },
  { id: 'plans', chapter: 'Thu 5 Nov, evening', title: 'Plans tab', enter: [nav('projection', { tab: 'plans' })], expect: ['e-car-end'],
    run: [{ type: 'event', id: 'e-car-pause' }, { type: 'event', id: 'e-car-resume' }, { type: 'event', id: 'e-school-end' }, { type: 'event', id: 'e-car-end' }],
    guide: 'On the Plans tab: pause the car, resume it, correct the school end date, end the car.', talk: 'Plan items on a timeline, each changed in place with its Confirm, and every version kept.' },
  { id: 'wedding', chapter: 'Thu 5 Nov, evening', title: 'The wedding', enter: [], expect: ['e-wedding'],
    run: [start('plan.wedding'), confirm, answer('way', 'isa'), confirm, { type: 'undo' }],
    guide: 'Add the wedding: cash dips below zero, pick a way to cover it, then Undo.', talk: 'It flags the month cash goes below zero and offers ways to cover it; Undo writes its own row.' },
  /* Fri 6 Nov: admin */
  { id: 'admin', chapter: 'Fri 6 Nov · Admin', title: 'Spend and ceiling', enter: [nav('admin-spend')], expect: ['e-ceiling'],
    run: [start('admin.approve'), answer('check', 'passkey'), confirm, start('admin.replay'), confirm, start('admin.ceiling'), answer('to', 50, '$50'), confirm],
    guide: 'Approve cr-26, Replay the failed job, then move the ceiling to $50: each after the fresh check.', talk: 'Every admin act takes a fresh check first and shows its consequences before the Confirm.' },
  { id: 'people', chapter: 'Fri 6 Nov · Admin', title: 'Pause and restore', enter: [nav('admin-people')], expect: ['e-restore-asha'],
    run: [start('admin.pause', { who: 'asha' }), answer('check', 'google'), answer('check2', 'passkey'), confirm, start('admin.restore'), answer('check', 'passkey'), confirm],
    guide: 'Pause Asha (Google fails the fresh check, the passkey passes), then restore her.', talk: 'Pausing signs her out everywhere; only the owner restores, and nobody can pause the owner.' },
  { id: 'you', chapter: 'Fri 6 Nov · Admin', title: 'You', enter: [nav('you')], run: [nav('you-notifications')],
    guide: 'Open You, then notifications and quiet hours.', talk: 'Sign-in methods, notifications and quiet hours, privacy and the Face ID lock.' },
  { id: 'asha', chapter: 'Doors', title: 'As Asha', enter: [{ type: 'viewer', id: 'asha' }, nav('home')], run: [nav('projection')],
    guide: 'Switch the viewer to Asha.', talk: 'Asha sees the household\'s figures and the chat; no pencils on what is not hers, no Admin center, and her what-if cannot be saved.' },
  { id: 'ipad', chapter: 'Doors', title: 'iPad', door: 'ipad', enter: [{ type: 'viewer', id: 'arun' }, nav('home')],
    run: [{ type: 'width', door: 'ipad', w: 1000 }, { type: 'width', door: 'ipad', w: 1180 }],
    guide: 'Drag the width: the chat is beside the page from 1133, a sheet from 600, a tab below.', talk: 'One rule at every door: beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window.' },
];
addSteps(S);
