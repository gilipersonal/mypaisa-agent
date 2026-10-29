/* Sign-in variants beyond the welcome and Sign in with Apple the shells draw (iPhone sign-in S4 to S7, MA-168 ·
   MA-32 · MA-35 · MA-102): joining from an invite, first-run setup (with the notifications and Face ID offers) and
   the kind refusals. Setup is the first conversation as the board draws it; it creates no record. */
import type { PageCtx, PageDef, PageSpec } from '../../state/registry';
import type { DemoState } from '../../state/model';
import { card, nav, note, p, row, sec } from '../kit';
import { fmt, HOUSEHOLD, live, nowIso } from './shared';

const SETUP = [
  { key: 'ccy', n: '1 · Base currency', q: 'Which currency should totals be in? Each holding keeps its own currency.', opts: ['£ GBP', '₹ INR', 'Other…'], icon: 'currency_exchange' },
  { key: 'hold', n: '2 · What you hold', q: 'Send a factsheet or a screenshot of your valuations, or type it, such as "Balanced (Monzo), £22,925".', opts: ['Send a factsheet screenshot', 'Type it', 'Later'], icon: 'description' },
  { key: 'freq', n: '3 · How often', q: 'How often should I tell you things?', opts: ['Mornings and alerts: the 07:15 brief on weekdays, and alerts', 'Only alerts: when something needs a look', 'Weekly: one round-up, on Saturdays'], icon: 'wb_sunny' },
  { key: 'notif', n: 'Notifications', q: 'MyPaisa sends the 07:15 brief and alerts. Amounts never show on the lock screen unless you choose.', opts: ['Turn on notifications', 'Not now'], icon: 'notifications' },
  { key: 'face', n: 'Face ID lock', q: 'Lock MyPaisa with Face ID? Face ID asks when you open MyPaisa and after 5 minutes away. It is a comfort on this iPhone only: it never approves a change.', opts: ['Use Face ID', 'Not now'], icon: 'face' },
];
const setupState = (s: DemoState): Record<string, string> => s.area.household?.setup ?? {};
const setupAct = (key: string, v: string | null) => ({ type: 'area', area: 'household', name: 'setup', key, v });

function setupPage(s: DemoState, c: PageCtx): PageSpec {
  const st = setupState(s), cur = SETUP.findIndex((x) => st[x.key] === undefined);
  const done = SETUP.slice(0, cur < 0 ? SETUP.length : cur);
  const parts: any[] = [
    p('Welcome, Arun. You\'re the first here, so you own the Dutta household.', 'mp-ink'),
    p('I keep your holdings, price them every weekday and tell you what moved and why. I never trade or move money, and every change is a card you confirm.'),
    ...done.map((x) => row({ icon: 'check_circle', name: x.n, sub: x.key === 'notif' || x.key === 'face' ? (st[x.key] === 'Not now' ? 'Not now' : 'On') : undefined, v: x.key === 'notif' || x.key === 'face' ? undefined : st[x.key].split(':')[0], vcls: 'mp-ink2', act: setupAct(x.key, null) })),
  ];
  if (cur >= 0) {
    const x = SETUP[cur];
    parts.push(sec(cur < 3 ? `Setup · ${cur + 1} of 3` : x.n), p(x.q, 'mp-ink'), ...x.opts.map((o) => row({ icon: x.icon, name: o.split(':')[0], sub: o.includes(':') ? o.split(': ')[1] : undefined, chev: true, act: setupAct(x.key, o) })));
  } else parts.push({ k: 'ok', t: "You're set up. Send a factsheet or a screenshot whenever you're ready.", link: 'Start again', act: setupAct('reset', null) });
  return { title: 'First-run setup', sub: 'Fri 4 Sep 19:30 · the first conversation · illustrative', crumb: { t: 'You', act: nav('you') }, cols: [[card(HOUSEHOLD.replace('the ', 'The '), cur < 0 ? 'Set up' : `Setting up · ${Math.min(cur + 1, 3)} of 3`, parts), card(undefined, undefined, [note('info', 'It can be changed later in You, Notifications. Nothing here is a record: each holding then comes as a card to Confirm in the chat.')])]] };
}

function joinPage(s: DemoState, c: PageCtx): PageSpec {
  const inv = live(s).invite, role = inv?.role ?? 'member';
  const exp = inv?.expires ?? new Date(Date.parse(nowIso(s) + 'Z') + 864e5).toISOString().slice(0, 16);
  const go = { type: 'nope', t: 'Signing in joins: the member and their sign-in are made, each with an audit row (MA-32). Not walked in this demo.' };
  return { title: 'Invite', sub: `Joining from an invite · ${c.dayLabel}`, crumb: { t: 'You', act: nav('you') }, cols: [[
    card(`Arun invited you to ${HOUSEHOLD.replace('the ', 'the ')}`, role === 'viewer' ? 'Viewer, your role' : 'Member, your role', [
      sec('What joining means'),
      row({ icon: 'account_balance_wallet', name: 'Your own accounts', sub: 'You add and change them yourself, in the chat.' }),
      row({ icon: 'groups', name: "The household's total", sub: 'You see it, beside your own detail.' }),
      row({ icon: 'visibility', name: 'Who sees your detail', sub: 'Arun, as the owner. Other members only if you choose to share it.' }),
      { k: 'btn', t: 'Sign in with Apple', icon: 'login', act: go }, { k: 'btn', t: 'Sign in with Google', icon: 'login', act: go },
      note('schedule', `This invite works once, until ${fmt(exp)}.`),
    ]),
    card(undefined, undefined, [p('Nothing is made until you sign in. Signing in checks the link (unused, under 24 hours old, this household), marks it used and makes the member and their sign-in; setup follows.'), { k: 'link', t: 'On to first-run setup', act: nav('setup') }]),
  ]] };
}

const REFUSED: Record<string, { icon: string; title: string; body: string; btn: boolean; cap: string }> = {
  nobody: { cap: 'Linked to nobody, no invite', icon: 'no_accounts', title: 'No household for this account', body: "This Apple Account isn't linked to anyone in MyPaisa. Ask the household's owner for an invite, then open the link on this iPhone.", btn: true },
  removed: { cap: 'A removed member', icon: 'group_remove', title: "You're no longer in the Dutta household", body: 'Arun removed you today. Your accounts and history stay with the household. If this is a mistake, ask Arun to invite you again.', btn: true },
  paused: { cap: 'A paused member, one line', icon: 'pause_circle', title: '', body: "The household's owner has paused your access to MyPaisa.", btn: false },
  invite: { cap: 'An invite out of date', icon: 'link_off', title: 'This invite is out of date', body: 'Invite links last 24 hours and work once. Ask the person who sent it for a new one.', btn: true },
};
function refusedPage(s: DemoState, c: PageCtx): PageSpec {
  const r = REFUSED[c.params.id ?? 'nobody'] ?? REFUSED.nobody;
  return { title: 'Sign-in refused', sub: `${r.cap} · kind, plain, no codes`, crumb: { t: 'Sign-in methods', act: nav('you-signin') }, cols: [[
    card(undefined, undefined, [
      { k: 'big', big: r.title || r.body, sub: r.title ? r.body : undefined },
      ...(r.btn ? [{ k: 'btn' as const, t: 'Back to sign in', icon: 'arrow_back', act: { type: 'signOut' } }] : []),
    ]),
    card('The four screens', '', Object.entries(REFUSED).map(([id, x]) => row({ icon: x.icon, name: x.cap, chev: true, act: nav('signin-refused', { id }) }))),
    card(undefined, undefined, [p('Nothing here is red: no action is asked for, and none names the check that failed. A paused member is let back in only by the owner, from the Admin center.')]),
  ]] };
}

export const signinPages: PageDef[] = [
  { meta: { id: 'join', title: 'Joining from an invite', icon: 'person_add', area: 'household', parent: 'you' }, build: joinPage },
  { meta: { id: 'setup', title: 'First-run setup', icon: 'checklist', area: 'household', parent: 'you' }, build: setupPage },
  { meta: { id: 'signin-refused', title: 'Sign-in refused', icon: 'no_accounts', area: 'household', parent: 'you' }, build: refusedPage },
];
export const signinReduce = (s: DemoState, a: any) => {
  if (a.name !== 'setup') return;
  const hh = (s.area.household ??= {}); const st = (hh.setup ??= {});
  if (a.key === 'reset') { hh.setup = {}; return; }
  if (a.v === null) { const i = SETUP.findIndex((x) => x.key === a.key); for (const x of SETUP.slice(i)) delete st[x.key]; return; }
  st[a.key] = a.v;
};
