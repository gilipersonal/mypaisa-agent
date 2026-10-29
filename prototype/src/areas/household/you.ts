/* You (iPhone settings Y1 to Y6, MA-172 · MA-170 · MA-171 · MA-77 · MA-35): the member's own settings. Privacy mode,
   the Face ID lock and Pause act at once; a preference that changes what MyPaisa sends is a card to Confirm in the
   chat (rule 4); adding a sign-in way runs a fresh sign-in, no second check (MA-102); leaving asks for Apple again.
   The web shows the same at 390 until MA-279 draws web boards. */
import type { Flow, PageCtx, PageDef, PageSpec } from '../../state/registry';
import type { DemoState } from '../../state/model';
import { card, ccard, ckv, cnote, cp, nav, note, p, row, sec, link, initials } from '../kit';
import { adminView, askWith, cap, fmt, HOUSEHOLD, led, member, nowIso, live } from './shared';
import { dayLabel, hhmm } from '../../lib/format';
import { DAY_ISO } from '../../state/reduce';

const st = (s: DemoState): any => s.settings[s.viewer];
const tone = (t: string, cls = 'mp-neutral') => ({ t, cls });
const PREFS: { key: string; label: string; sub: string }[] = [
  { key: 'brief', label: 'Morning brief', sub: '07:15 on weekdays' },
  { key: 'wrap', label: 'Evening wrap', sub: '21:15, when your accounts move' },
  { key: 'digest', label: 'Weekly digest', sub: 'Saturdays' },
  { key: 'red', label: 'Red alerts', sub: 'Time sensitive, with sound; at most two a week' },
  { key: 'amber', label: 'Amber alerts', sub: 'Silent' },
];
const prefOn = (s: DemoState, key: string) => st(s).toggles?.[key] !== false;
const quiet = (s: DemoState) => `${st(s).notifications.quiet_hours.from} to ${st(s).notifications.quiet_hours.to}`;
const methods = (s: DemoState) => (member(s, s.viewer)?.sign_in ?? []).map(cap).join(', ');
const short = (s: DemoState) => { const w = (member(s, s.viewer)?.sign_in ?? []).map(cap); return w.slice(0, 2).join(', ') + (w.length > 2 ? ` +${w.length - 2}` : ''); };
const hhPaused = (s: DemoState) => !!led.settings.arun && !!s.settings.arun.household_pause.paused;
const memberDevices = (s: DemoState) => (member(s, s.viewer)?.devices ?? []).filter((d: any) => d.kind !== 'browser');
const here = (s: DemoState, d: any) => s.door === 'iphone' && d.kind === 'iphone' && d === memberDevices(s)[0];
const sub = (c: PageCtx, t: string) => `${t} · ${c.dayLabel}`;
const crumb = { t: 'You', act: nav('you') };
const seenAt = (s: DemoState, d: any) => (d.last_seen <= nowIso(s) ? (d.last_seen.slice(0, 10) === DAY_ISO[s.clock] ? `last seen today ${hhmm(d.last_seen)}` : `last seen ${dayLabel(d.last_seen)}`) : 'signed in');

function youPage(s: DemoState, c: PageCtx): PageSpec {
  const m = member(s, s.viewer), owner = m.role === 'owner', v = adminView(s), n = memberDevices(s).filter((d: any) => !d.signed_out).length;
  const me = card(undefined, undefined, [
    row({ lead: initials(m.name), name: `${m.name} Dutta`, sub: `${cap(m.role)} · ${HOUSEHOLD}` }),
    ...(owner ? [row({ icon: 'shield_person', name: 'Admin center', sub: 'Only the owner sees this row.', tags: v.failedWork ? [tone(`${v.failedWork} failed job`, 'mp-alertchip')] : undefined, chev: true, act: nav('admin') })] : []),
  ]);
  const list = card(undefined, undefined, [
    row({ icon: 'visibility_off', name: 'Privacy and Face ID', v: s.priv ? 'On' : 'Off', vcls: 'mp-ink2', chev: true, act: nav('you-privacy') }),
    row({ icon: 'notifications', name: 'Notifications', v: '07:15', vcls: 'mp-ink2', chev: true, act: nav('you-notifications') }),
    row({ icon: 'key', name: 'Sign-in methods', v: short(s), vcls: 'mp-ink2', chev: true, act: nav('you-signin') }),
    row({ icon: 'devices', name: 'Devices', v: String(n), vcls: 'mp-ink2', chev: true, act: nav('you-signin') }),
    row({ icon: 'tune', name: 'Simple or Technical', v: 'Simple', vcls: 'mp-ink2', act: { type: 'nope', t: 'Simple or Technical is a command in the chat (/technical); not part of this walk.' } }),
    row({ icon: 'pause_circle', name: 'Pause MyPaisa', v: hhPaused(s) ? 'Paused' : 'Running', vcls: 'mp-ink2', chev: true, act: nav('you-pause') }),
  ], 'links');
  const leave = card(undefined, undefined, [row({ icon: 'logout', name: 'Leave the household', sub: owner ? 'You are the only owner' : 'Asks you to sign in with Apple again', chev: true, act: nav('you-leave') })], 'links');
  return { title: 'You', sub: c.dayLabel, cols: c.layout.nav === 'sidebar' ? [[me, leave], [list]] : [[me, list, leave]] };
}

function privacyPage(s: DemoState, c: PageCtx): PageSpec {
  const f = st(s).face_id_lock;
  return { title: 'Privacy and Face ID', sub: sub(c, 'You'), crumb, cols: [[
    card('Privacy mode', s.priv ? 'On' : 'Off', [
      row({ icon: 'visibility_off', name: 'Privacy mode', sub: 'Hides every amount in cards, screens, charts and notifications; percentages stay. It acts at once, as /privacy does.', toggle: true, on: s.priv, act: { type: 'priv' } }),
      sec('Preview Home with it on'), { k: 'big', big: s.priv ? '£•••••' : 'Household £•••••', sub: `the amount hidden, the move kept: ▲ 0.4% today` },
    ]),
    card('In notifications', '', [
      row({ icon: 'notifications', name: 'Show amounts in notifications', sub: 'Off: the lock screen says what happened, never how much. Privacy mode keeps it off.', toggle: true, on: !!st(s).show_amounts_in_notifications && !s.priv, act: prefAct(s, 'amounts', 'Show amounts in notifications', st(s).show_amounts_in_notifications ? 'On' : 'Off', st(s).show_amounts_in_notifications ? 'Off' : 'On') }),
    ]),
    card('Face ID lock', '', [
      row({ icon: 'face', name: 'Lock with Face ID', sub: 'Face ID or your passcode when MyPaisa opens. A comfort on this iPhone only: it never approves a change.', toggle: true, on: f.on, act: { type: 'area', area: 'household', name: 'faceid' } }),
      row({ icon: 'timer', name: 'Ask again', v: `After ${f.ask_again_after_minutes} minutes`, vcls: 'mp-ink2' }),
      note('layers', 'In the app switcher MyPaisa shows only its mark, never a figure.'),
    ]),
  ]] };
}
const prefAct = (s: DemoState, key: string, label: string, from: string, to: string) => askWith(s, 'pref.change', { key, label, from, to });

function notificationsPage(s: DemoState, c: PageCtx): PageSpec {
  return { title: 'Notifications', sub: sub(c, 'You'), crumb, cols: [[
    card(undefined, undefined, [note('chat_bubble', 'Changes are made in the chat. A switch or a time opens its preference card there, to Confirm.')]),
    card('What arrives', '', PREFS.map((r) => row({ icon: 'notifications_active', name: r.label, sub: r.sub, toggle: true, on: prefOn(s, r.key), act: prefAct(s, r.key, r.label, prefOn(s, r.key) ? 'On' : 'Off', prefOn(s, r.key) ? 'Off' : 'On') }))),
    card('Quiet hours', '', [
      row({ icon: 'bedtime', name: 'Quiet hours', sub: 'Only a critical alert rings', v: quiet(s), vcls: 'mp-ink2', chev: true, act: askWith(s, 'pref.change', { key: 'quiet', label: 'Quiet hours', from: quiet(s) }) }),
      p('A red alert breaks through Focus as Time Sensitive; at most two a week. Amounts on the lock screen live with privacy.'),
    ]),
  ]] };
}

function signinPage(s: DemoState, c: PageCtx): PageSpec {
  const m = member(s, s.viewer), since = m.sign_in_since ?? {};
  const way = (id: string, name: string, lead: string) => m.sign_in.includes(id)
    ? row({ lead, name, sub: `${id === 'passkey' ? 'On this Mac and iPhone' : id === 'apple' ? (s.door === 'iphone' ? 'This iPhone' : 'Linked') : 'Linked'}${since[id] ? ' · since ' + dayLabel(since[id]) : ''}`, tags: [tone('Linked', 'mp-neutral')] })
    : row({ lead, name, sub: 'Not added', tags: [tone('Add', 'mp-pause')], chev: true, act: askWith(s, 'signin.add', { id }) });
  const devs = memberDevices(s);
  return { title: 'Sign-in methods', sub: sub(c, 'You'), crumb, cols: [[
    card('Ways in', '', [
      way('apple', 'Apple', 'A'), way('google', 'Google', 'G'), way('passkey', 'Passkey with Face ID', 'P'),
      p('Add runs a fresh sign-in with that account and links it, with an audit row; there is no second check, as a link only adds a way in. The same ways in open the web app.'),
    ]),
    card('Devices', '', [
      ...devs.map((d: any) => row({ icon: d.kind === 'ipad' ? 'tablet_mac' : 'phone_iphone', name: d.name, sub: d.signed_out ? `${d.model} · signed out` : `${d.model} · ${here(s, d) ? 'this iPhone · now' : seenAt(s, d)}`, tags: !here(s, d) && !d.signed_out ? [tone('Sign out', 'mp-alertchip')] : undefined, act: here(s, d) || d.signed_out ? undefined : { type: 'area', area: 'household', name: 'signout', id: d.id } })),
      ...(m.devices.some((d: any) => d.kind === 'browser') ? [p('Also signed in to the web app: Chrome on a MacBook Air, with Google.')] : []),
      row({ icon: 'logout', name: 'Sign out of all other devices', sub: 'Ends those sessions at once and removes their push tokens. It only takes access away, so it needs no second check.', act: { type: 'area', area: 'household', name: 'signout', id: 'others' } }),
    ]),
    card('When a sign-in is refused', 'what others see', [
      row({ icon: 'no_accounts', name: 'Linked to nobody, no invite', chev: true, act: nav('signin-refused', { id: 'nobody' }) }),
      row({ icon: 'pause_circle', name: 'Paused by the owner', chev: true, act: nav('signin-refused', { id: 'paused' }) }),
      row({ icon: 'link_off', name: 'An invite out of date', chev: true, act: nav('signin-refused', { id: 'invite' }) }),
    ]),
  ]] };
}

function pausePage(s: DemoState, c: PageCtx): PageSpec {
  const paused = hhPaused(s), owner = s.viewer === 'arun', ev = [...s.audit].reverse().find((r) => r.kind === 'household_pause');
  const n = s.audit.filter((r) => r.kind === 'household_pause').length + 1, at = nowIso(s);
  return { title: 'Pause MyPaisa', sub: sub(c, 'You'), crumb, cols: [[
    card(undefined, undefined, [row({ icon: paused ? 'pause_circle' : 'play_circle', name: paused ? 'MyPaisa is paused' : 'MyPaisa is running', sub: paused ? `Paused at ${hhmm(ev?.at ?? at)} by Arun. Nothing runs until he resumes it.` : 'Every scheduled run is on.', tags: [tone(paused ? 'Paused' : 'Running', paused ? 'mp-pause' : 'mp-neutral')] })]),
    card('What stops', '', ['The morning brief and the evening wrap', 'Every alert, red ones too', 'The price and engine runs'].map((t) => row({ icon: 'block', name: t }))),
    card('What keeps going', '', ['Your records, holdings and history', 'The chat and Home, with the last prices'].map((t) => row({ icon: 'check_circle', name: t }))),
    owner ? card(undefined, undefined, [{ k: 'btn', t: paused ? 'Resume MyPaisa' : 'Pause MyPaisa', icon: paused ? 'play_arrow' : 'pause', act: { type: 'event', ev: { id: `e-hh-pause-${n}`, at, actor: 'arun', via: 'app', kind: 'household_pause', record: 'household', field: 'status', before: paused ? 'paused' : 'running', after: paused ? 'running' : 'paused', summary: `${paused ? 'Resumed' : 'Paused'} MyPaisa · every member told · Arun · ${fmt(at)} · in You`, illustrative: true } } }, p('It acts at once, with no Confirm, because a kill switch must never wait. It is audited and every member is told.')])
      : card(undefined, undefined, [p('Only Arun, the owner, pauses or resumes the household. A member sees the state and who paused it.')]),
  ]] };
}

function leavePage(s: DemoState, c: PageCtx): PageSpec {
  const owner = s.viewer === 'arun', m = member(s, s.viewer);
  const lines = ['Your MyPaisa sign-in is deleted', "Apple's token for MyPaisa is revoked, and Google's if you added it", 'Your accounts and their history stay with the household', 'The audit log keeps your name and the day you left', 'Arun is told'];
  return { title: 'Leave the household', sub: sub(c, 'You'), crumb, cols: [[
    owner ? card(undefined, undefined, [row({ icon: 'shield_person', name: 'You are the only owner', sub: `${HOUSEHOLD} needs its owner, so you can't leave it.` }), p('To stop every scheduled message instead, use Pause MyPaisa.')])
      : card(`${m.name}, this is what leaving does`, '', [...lines.map((t) => row({ icon: 'check', name: t })), { k: 'btn', t: 'Leave the household', icon: 'logout', act: askWith(s, 'you.leave') }, p('Leave asks you to sign in with Apple again, to check it is you.')]),
  ]] };
}

export const youPages: PageDef[] = [
  { meta: { id: 'you', title: 'You', icon: 'person', area: 'household', side: 8, ask: 'Ask about your settings' }, build: youPage },
  { meta: { id: 'you-privacy', title: 'Privacy and Face ID', icon: 'visibility_off', area: 'household', parent: 'you' }, build: privacyPage },
  { meta: { id: 'you-notifications', title: 'Notifications', icon: 'notifications', area: 'household', parent: 'you' }, build: notificationsPage },
  { meta: { id: 'you-signin', title: 'Sign-in methods', icon: 'key', area: 'household', parent: 'you' }, build: signinPage },
  { meta: { id: 'you-pause', title: 'Pause MyPaisa', icon: 'pause_circle', area: 'household', parent: 'you' }, build: pausePage },
  { meta: { id: 'you-leave', title: 'Leave the household', icon: 'logout', area: 'household', parent: 'you' }, build: leavePage },
];

const evId = (s: DemoState, kind: string, base: string) => `${base}-${s.audit.filter((r) => r.kind === kind).length + 1}`;
export const youFlows: Flow[] = [
  { id: 'pref.change', area: 'household', title: 'Change a notification preference', opener: undefined, match: ['quiet hours', 'notification pref'], beats: [
    { ask: { key: 'key', label: 'Preference', q: 'Which one should I change?', chips: [...PREFS.map((r) => ({ t: r.label, v: r.key })), { t: 'Quiet hours', v: 'quiet' }] }, skip: (s, a) => a.key !== undefined },
    { ask: { key: 'to', label: 'New setting', q: (s, a) => (a.key === 'quiet' ? 'Quiet hours are 22:00 to 07:00 now. Which window?' : 'On or off?'), chips: (s, a) => (a.key === 'quiet' ? [{ t: '23:00 to 07:00' }, { t: '22:00 to 06:00' }, { t: '22:00 to 07:00' }] : [{ t: 'On' }, { t: 'Off' }]) }, skip: (s, a) => a.to !== undefined },
    { confirm: (s, a) => { const label = a.label ?? (a.key === 'quiet' ? 'Quiet hours' : PREFS.find((r) => r.key === a.key)?.label); const from = a.from ?? (a.key === 'quiet' ? '22:00 to 07:00' : prefOn(s, a.key) ? 'On' : 'Off');
      return ccard({ over: 'New preference · check it', title: label, parts: [ckv('Now', from, false), ckv('New', a.to, false), cnote('lock', 'Amounts never show on the lock screen unless you turn that on, and never with privacy mode on.'), cnote('history', 'An audit row.')] }); },
      onConfirm: (s, a) => { const at = nowIso(s); const label = a.label ?? (a.key === 'quiet' ? 'Quiet hours' : PREFS.find((r) => r.key === a.key)?.label);
        return [{ type: 'event', ev: { id: evId(s, 'preference', `e-pref-${a.key}`), at, actor: s.viewer, via: 'chat', kind: 'preference', record: a.key, field: 'setting', before: a.from ?? null, after: a.to, summary: `Preference · ${label} → ${a.to} · ${cap(s.viewer)} · ${fmt(at)}`, illustrative: true } }]; } },
    { ai: 'Saved. It starts from the next one.' },
  ] },
  { id: 'signin.add', area: 'household', title: 'Add a way to sign in', opener: 'Add a passkey', match: ['add a passkey', 'add passkey', 'link google', 'add sign-in'], needs: (s) => !member(s, s.viewer)?.sign_in.includes('passkey'), beats: [
    { ai: "Linking a passkey signs you in with it first, in iOS's own sheet. There is no second check: a link only adds a way in." },
    { ask: { key: 'fresh', label: 'Fresh sign-in', over: 'Sign in to link', q: 'Continue with Face ID to create the passkey.', chips: [{ t: 'Continue with Face ID', v: 'ok' }] } },
    { confirm: (s) => ccard({ over: 'Sign-in methods', title: 'Link a passkey', parts: [ckv('Account', `${cap(s.viewer)} · ${HOUSEHOLD}`, false), cnote('key', 'The same passkey can answer an admin check later, where the member is the owner.'), cnote('history', 'An audit row.')] }), label: 'Link the passkey',
      onConfirm: (s) => { const at = nowIso(s); return [{ type: 'event', ev: { id: evId(s, 'sign_in_added', `e-signin-add-${s.viewer}`), at, actor: s.viewer, via: 'app', kind: 'sign_in_added', record: s.viewer, field: 'sign_in', before: null, after: 'passkey', summary: `Sign-in way added · passkey · ${cap(s.viewer)} · ${fmt(at)} · fresh sign-in, no second check`, illustrative: true } }]; } },
    { ai: 'Linked. The passkey now opens MyPaisa on that device and the web app.' },
  ] },
  { id: 'you.leave', area: 'household', title: 'Leave the household', opener: 'Leave the household', match: ['leave the household', 'leave household'], beats: [
    { when: (s) => s.viewer === 'arun', beats: [{ ai: "You are the only owner. The Dutta household needs its owner, so you can't leave it. To stop every scheduled message instead, use Pause MyPaisa." }] },
    { when: (s) => s.viewer !== 'arun', beats: [
      { act: () => [{ type: 'branch.start', name: 'What if Asha left' }] },
      { card: () => ccard({ over: 'Leave the household', title: 'Asha, this is what leaving does', parts: [cnote('delete', 'Your MyPaisa sign-in is deleted.'), cnote('key_off', "Apple's token for MyPaisa is revoked, and Google's if you added it."), cnote('inventory_2', 'Your accounts and their history stay with the household.'), cnote('history', 'The audit log keeps your name and the day you left. Arun is told.')] }) },
      { ask: { key: 'apple', label: 'Second check', over: 'Sign in with Apple', q: "Leave asks you to sign in with Apple again, to check it is you. iOS draws that sheet.", chips: [{ t: 'Continue with Face ID', v: 'ok' }] } },
      { confirm: () => ccard({ over: 'Leave the household', title: 'Leave the Dutta household', parts: [ckv('Checked', 'Sign in with Apple', false), ckv('Her sign-in', 'Deleted', false), ckv('Her accounts', 'Kept with the household', false)] }), label: 'Leave the household',
        onConfirm: (s) => { const at = nowIso(s); return [{ type: 'event', ev: { id: 'e-left-asha', at, actor: 'asha', via: 'app', kind: 'member_left', record: 'asha', field: 'status', before: 'active', after: 'left', summary: `Member left · Asha · ${fmt(at)} · checked with Sign in with Apple`, illustrative: true } }]; } },
      { ai: 'You have left the household. Your sign-in is deleted and Arun has been told. (A what-if: the other boards keep Asha.)' },
    ] },
  ] },
];

export const youAppliers: Record<string, (s: any, ev: any) => void> = {
  preference: (s, ev) => {
    const set = s.settings[ev.actor]; if (!set) return;
    if (ev.record === 'quiet') { const [from, to] = String(ev.after).split(' to '); set.notifications.quiet_hours = { ...set.notifications.quiet_hours, from, to }; }
    else if (ev.record === 'amounts') set.show_amounts_in_notifications = ev.after === 'On';
    else (set.toggles ??= {})[ev.record] = ev.after === 'On';
  },
  sign_in_added: (s, ev) => { const m = s.members.find((x: any) => x.id === ev.record); if (m && !m.sign_in.includes('passkey')) { m.sign_in.push('passkey'); (m.sign_in_since ??= {}).passkey = ev.at.slice(0, 10); } },
  member_left: (s, ev) => { const m = s.members.find((x: any) => x.id === ev.record); if (m && m.role !== 'owner') m.status = 'left'; },
  household_pause: (s, ev) => { s.settings.arun.household_pause.paused = ev.after === 'paused'; for (const k of Object.keys(s.settings)) if (s.settings[k].household_pause) s.settings[k].household_pause.paused = ev.after === 'paused'; },
};
export const youReduce = (s: DemoState, a: any) => {
  const set: any = s.settings[s.viewer];
  if (a.name === 'faceid' && set) set.face_id_lock.on = !set.face_id_lock.on;
  if (a.name === 'signout') {
    const m = member(s, s.viewer); if (!m) return;
    for (const d of m.devices) if (d.kind !== 'browser' && !(s.door === 'iphone' && d === m.devices[0]) && (a.id === 'others' || a.id === d.id)) d.signed_out = nowIso(s);
  }
};
