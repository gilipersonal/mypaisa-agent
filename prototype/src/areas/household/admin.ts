/* The Admin center (MA-102, MA-116, MA-137, MA-145; Browser Admin center 2 and 3, iPhone admin A1 to A10, iPad ·
   Admin center): spend and the ceiling, approvals, alerts and failed work, agents and incidents, people and
   devices, settings. Every change is a chat flow: fresh second check, consequences, Confirm (the ledger's own
   events). The Telegram boards are the superseded record: alerts go to the app, push and email. */
import type { Flow, PageCtx, PageDef, PageSpec } from '../../state/registry';
import type { DemoState } from '../../state/model';
import { card, ccard, ckv, cnote, cp, nav, note, p, row, sec, bar, kv, link, initials } from '../kit';
import { adminView, askWith, checkBeats, confirmCard, evOrCopy, fmt, HOUSEHOLD, led, lock, member, nowIso, ownerOnly, spendView, startAt, usd, live, liveW } from './shared';
import { dayLabel, hhmm } from '../../lib/format';
import { DAY_ISO } from '../../state/reduce';

const A = led.admin;
const TABS: [string, string][] = [['admin-spend', 'Spend'], ['admin-approvals', 'Approvals'], ['admin-alerts', 'Alerts'], ['admin-agents', 'Agents'], ['admin-people', 'People'], ['admin-settings', 'Settings']];
const NOT_WALKED = (what: string) => ({ type: 'nope', t: `${what}: drawn on the Admin center boards, not part of this walk.` });
const chipC = (t: string, cls = 'mp-neutral', icon?: string) => ({ t, cls, icon });

function head(s: DemoState, c: PageCtx, id: string, title: string, sub?: string): Pick<PageSpec, 'title' | 'sub' | 'tabs' | 'crumb'> {
  return {
    title: c.compact ? title : 'Admin center',
    sub: sub ?? `Owner only · ${HOUSEHOLD} · ${c.dayLabel}`,
    tabs: c.compact ? undefined : TABS.map(([i, t]) => ({ t, on: i === id, act: nav(i) })),
    crumb: c.compact ? { t: 'Admin center', act: nav('admin') } : undefined,
  };
}
const gated = (id: string, title: string, build: (s: DemoState, c: PageCtx) => PageSpec) => (s: DemoState, c: PageCtx): PageSpec =>
  c.asha ? lock(title, "The Admin center is the admin's alone. Asha sees her own records, the household's figures and the chat.") : build(s, c);
const grid = (c: PageCtx, left: any[], right: any[]) => (c.layout.nav === 'sidebar' ? [left, right] : [[...left, ...right]]);

/* ---------- overview (a list on compact doors; the web and iPad open on Spend) ---------- */
function overview(s: DemoState, c: PageCtx): PageSpec {
  if (!c.compact) return spendPage(s, c);
  const v = adminView(s), sv = spendView(s);
  const people = s.members.filter((m) => m.status !== 'left');
  const devices = people.reduce((t, m) => t + m.devices.length - (m.role === 'owner' ? 1 : 0), 0);
  return {
    title: 'Admin center', sub: `Owner only · ${HOUSEHOLD} · ${c.dayLabel}`, crumb: { t: 'You', act: nav('you') },
    cols: [[card(undefined, undefined, [
      row({ icon: 'group', name: 'Members and devices', sub: `${people.map((m) => cap1(m.name)).join(' and ')} · ${devices} devices`, chev: true, act: nav('admin-people') }),
      row({ icon: 'savings', name: 'Spend', sub: `Claude · ${Math.round(sv.pctN)}% · ${sv.step} · renews ${dayLabel(sv.renew)}`, v: `${usd(sv.spent)} of ${usd(sv.ceiling)}`, chev: true, act: nav('admin-spend') }),
      row({ icon: 'cloud', name: 'Caps and alerts', sub: `AWS and others · ${A.aws_cap.pct}% · no step reached`, v: `£${A.aws_cap.spent_gbp} of £${A.aws_cap.cap_gbp}`, chev: true, act: nav('admin-spend') }),
      row({ icon: 'error', name: 'Failed work', sub: v.failedWork ? `${v.dl.job} failed 5 times` : 'Nothing waiting', tags: v.failedWork ? [chipC(String(v.failedWork), 'mp-alertchip')] : undefined, chev: true, act: nav('admin-alerts') }),
      row({ icon: 'fact_check', name: 'Approvals', sub: v.waiting ? 'cr-26 waits for you' : 'Nothing waiting', chev: true, act: nav('admin-approvals') }),
      row({ icon: 'notifications', name: 'Alerts inbox', sub: `${v.needs} need${v.needs === 1 ? 's' : ''} you`, chev: true, act: nav('admin-alerts') }),
      row({ icon: 'smart_toy', name: 'Agents and incidents', sub: v.d4 ? 'The news scout is silent' : 'All running', chev: true, act: nav('admin-agents') }),
      row({ icon: 'alt_route', name: 'Alert routing', sub: 'In the app, push and email', chev: true, act: nav('admin-alerts') }),
      row({ icon: 'tune', name: 'Settings', sub: 'Budgets, data, alerts and queues', chev: true, act: nav('admin-settings') }),
    ], 'links'), card(undefined, undefined, [p('Every action here asks for the second check, writes an audit row and sends you a message in the chat.')])]],
  };
}
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- spend and the ceiling ---------- */
function spendPage(s: DemoState, c: PageCtx): PageSpec {
  const v = spendView(s), sp = v.sp;
  const moved = s.applied.includes('e-ceiling');
  const cyc = v.d4 ? 'Cycle 3 Nov to 2 Dec' : 'Cycle 3 Oct to 2 Nov';
  const main = card('Claude · prod', v.step, [
    { k: 'meter', big: `${usd(v.spent)} of ${usd(v.ceiling)}`, bsub: `${Math.round(v.pctN * 10) / 10}% · about £${v.gbp(v.spent)} of £${v.gbp(v.ceiling)}`, w: Math.max(v.pctN, 0.6) + '%', steps: [70, 85, 95], label: 'Prod Claude spend against its ceiling', sub: `${cyc} · renews ${dayLabel(v.renew)}, in ${v.days} days` },
    ...(moved ? [note('check_circle', `The ceiling moved from $160 to ${usd(v.ceiling)} at 08:31. It took effect at the next model call.`)] : []),
    { k: 'btn', t: 'Move the ceiling', icon: 'tune', act: askWith(s, 'admin.ceiling', { from: v.ceiling }) },
    note('lock', 'Moving the ceiling asks for the second check, takes effect at the next model call and writes an audit row.'),
  ]);
  const ladder = card('The ladder', 'dollars, from the ceiling', v.steps.map((l: any) => row({ name: `${l.pct}% · ${l.name}`, sub: l.does, v: usd(l.usd), icon: l.pct === 100 ? 'block' : 'stairs' })));
  const aws = card('AWS and others', 'October', [
    { k: 'meter', big: `£${A.aws_cap.spent_gbp} of £${A.aws_cap.cap_gbp}`, bsub: `${A.aws_cap.pct}% · forecast £${A.aws_cap.forecast_gbp.toFixed(2)}`, w: A.aws_cap.pct + '%', steps: [50, 80], label: 'AWS and others against its cap', sub: 'Read daily at 06:00; lags up to a day.' },
    ...A.aws_cap.steps.map((st: any) => row({ name: `${st.pct}% · £${st.gbp}`, sub: st.does, icon: 'flag' })),
    row({ icon: 'lock', name: 'Never stops', sub: `${cap1(A.aws_cap.never_stops)}. That row has no control.` }),
    row({ icon: 'flag', name: 'Flags now', sub: `${cap1(A.aws_cap.flags)}. Each is a flag the jobs read, never a change to AWS.` }),
    row({ icon: 'shield', name: 'Backstop: AWS Budgets, £75', sub: 'Made by Terraform, not from here: changing it is a pull request.' }),
    { k: 'btn', t: 'Change the cap', icon: 'tune', act: NOT_WALKED('Changing the AWS cap') },
  ]);
  const left = [main, ladder, aws];
  const right: any[] = [];
  if (v.d4) {
    const by = [...sp.members].map((m: any) => {
      const sh = m.share_usd !== undefined ? v.share : null;
      return bar(m.id === 'household_jobs' ? 'Household jobs' : cap1(m.id), usd(m.spent_usd), sh ? Math.max((m.spent_usd / sh) * 100, 0.8) + '%' : '0.8%', sh ? `of ${usd(sh)}, ${m.share_pct}% share` : m.note);
    });
    right.push(card('By member', `${usd(v.spent)} in all`, [...by, p('Each member is drawn against their 60% share; household jobs have no share.')]));
    right.push(card('By agent', 'share of the ceiling', sp.agents.map((a: any) => bar(a.name, usd(a.spent_usd), Math.max((a.spent_usd / ((a.share_pct * v.ceiling) / 100)) * 100, 0.8) + '%', `of ${usd((a.share_pct * v.ceiling) / 100)}, ${a.share_pct}%`))));
    right.push(card('Guards under the ladder', '', [
      kv('A member', `${sp.guards.member_share_pct}% of the ceiling, ${usd(v.share)}`, false), kv('A day', `${sp.guards.daily_multiple} times the daily average, ${usd(v.daily)}`, false), kv('A run', `${sp.guards.run_calls} calls`, false),
      kv('Dev', `${usd(sp.dev.spent_usd)} of ${usd(sp.dev.ceiling_usd)}, synthetic data`, false),
    ]));
  } else right.push(card('By member and agent', '', [p('The split by member, agent and guard is drawn on the Admin day, Fri 6 Nov.')]));
  return { ...head(s, c, 'admin-spend', 'Spend', `Dollars, as the credit is · ${c.dayLabel}`), cols: grid(c, left, right) };
}

/* ---------- approvals ---------- */
function approvalsPage(s: DemoState, c: PageCtx): PageSpec {
  const v = adminView(s), cr = A.approvals[0], rest = A.approvals.slice(1);
  const items: any[] = [];
  if (v.d4 && nowIso(s) >= '2026-11-06T06:40:00') {
    items.push(card(v.approved ? 'Decided' : 'Waiting for you', cr.id, [
      row({ icon: v.approved ? 'task_alt' : 'hourglass_top', name: cr.title, sub: `From the ${cr.from} · asked ${fmt(cr.created)} · expires ${fmt(cr.expires)}`, tags: [v.approved ? chipC('Approved', 'mp-neutral', 'check') : chipC('Waiting', 'mp-alertchip')] }),
      kv('Cost', cr.cost, false), kv('Risk', cr.risk, false), p(cr.why), note('undo', cr.undo),
      ...(v.approved ? [note('history', `Approved ${hhmm(cr.decided.at)} by you with your passkey. An audit row, and a message in your chat.`)] : [{ k: 'btn' as const, t: 'Approve', icon: 'check', act: askWith(s, 'admin.approve') }, note('lock', 'Approving asks for the second check.')]),
    ]));
    items.push(card('Also asked', '', rest.map((a: any) => row({
      icon: a.kind === 'question' ? 'help' : 'fact_check', name: a.title, sub: `From the ${a.from}${a.decided ? ` · ${a.status} ${a.decided.at.length > 10 ? hhmm(a.decided.at) : fmt(a.decided.at)} by you, ${a.decided.how}` : ' · a question, answered in the chat'}${a.decided?.not_again_before ? ' · not asked again before 3 Dec' : ''}`,
      tags: [chipC(cap1(a.status), a.status === 'waiting' ? 'mp-alertchip' : 'mp-neutral')], act: a.status === 'waiting' ? NOT_WALKED('Answering the Data steward') : undefined,
    }))));
  } else items.push(card('Waiting for you', '', [p('Nothing is waiting. The agents ask here, and in the chat, when they need a yes.')]));
  return { ...head(s, c, 'admin-approvals', 'Approvals'), cols: [items] };
}

/* ---------- alerts, failed work and routing ---------- */
function alertsPage(s: DemoState, c: PageCtx): PageSpec {
  const v = adminView(s), al = A.alerts;
  const status = (r: any) => r.kind === 'approval' ? (v.approved ? 'Closed 08:29' : 'Waiting') : r.kind === 'failed_work' ? (v.replayed ? 'Replayed 08:30' : 'Needs you') : r.kind === 'incident' ? 'Open' : 'Closed';
  const inbox = card('Alerts inbox', `${v.needs} need${v.needs === 1 ? 's' : ''} you`, v.shown.length ? v.shown.map((r: any) => {
    const st = status(r), hot = st === 'Needs you' || st === 'Waiting' || st === 'Open';
    return row({ icon: r.kind === 'incident' ? 'crisis_alert' : r.kind === 'approval' ? 'fact_check' : r.kind === 'failed_work' ? 'error' : 'rss_feed', name: r.title, sub: `${fmt(r.at)} · ${r.sent ?? r.d ?? `${r.reason}: ${r.job}, tried ${r.tried}. Not critical: the app and push, quietly.`}`, tags: [chipC(st, hot ? 'mp-alertchip' : 'mp-neutral')], act: r.kind === 'approval' ? nav('admin-approvals') : r.kind === 'incident' ? nav('admin-agents') : undefined });
  }) : [p('Nothing in the inbox yet. Every system alert is kept here, and in the iOS app.')]);
  const fw = A.alerts.rows.find((r: any) => r.kind === 'failed_work'), dl = v.dl;
  const failed = card('Failed work', v.failedWork ? 'Needs you' : v.replayed ? 'Replayed' : 'None', v.failedWork ? [
    row({ icon: 'error', name: `${dl.job} failed ${dl.tried.split(' ')[0]} times`, sub: `${fw.reason} · queue ${dl.queue} · oldest since ${hhmm(dl.since)}`, tags: [chipC('Needs you', 'mp-alertchip')] }),
    kv('Tried', dl.tried, false), kv('Effect', fw.effect, false),
    { k: 'btn', t: 'Replay 1 job', icon: 'replay', act: askWith(s, 'admin.replay') },
    note('lock', 'Moves it back to its queue. Handlers are idempotent, so nothing runs twice. Asks for the second check.'),
  ] : v.replayed ? [
    row({ icon: 'check_circle', name: 'Replayed', sub: `${dl.job} ran on replay at 08:30, by you. The dead-letter queue is empty.`, tags: [chipC('Replayed', 'mp-neutral', 'check')] }),
    kv('Queue', dl.queue, false), kv('Dead-letter queue', 'Empty', false), note('history', 'An audit row, and a message in your chat. The badge on the Admin center has cleared.'),
  ] : [p('No failed work. A job that fails five times waits here for Replay.')]);
  const routing = card('Alert routing', 'In the app, push and email', [
    { k: 'table', head: ['Alert', 'App', 'Push', 'Email'], rows: al.routing.map((r: any) => ({ cells: [r.kind, r.app, r.push, r.email] })) },
    p('Telegram is gone: a critical alert is a time-sensitive push with sound; the rest arrive passive. In the app is fixed, and holding alerts stay each member\'s own.'),
  ]);
  const quiet = card('Quiet hours, cooldowns, the digest', '', [
    row({ icon: 'bedtime', name: 'Quiet hours', sub: `Push and email held, ${al.quiet_hours.from} to ${al.quiet_hours.to}; a critical alert breaks through`, v: `${al.quiet_hours.from} to ${al.quiet_hours.to}` }),
    row({ icon: 'timer', name: 'The same alert', sub: `Sent again at most once in ${al.cooldown_hours} hours. ${al.cooldown_note}`, v: `${al.cooldown_hours} h` }),
    row({ icon: 'summarize', name: 'Daily digest', sub: `Non-urgent alerts wait for it, in ${al.digest.where}`, v: al.digest.at }),
    row({ icon: 'mail', name: 'Email', sub: `Through SNS to ${al.email.to}; ${al.email.free_per_month} a month free` }),
    ...al.queues.map((q: any) => row({ icon: 'stack', name: q.name, sub: `${q.tries} tries, back-off ${q.backoff ?? `${q.backoff_s[0]} s to ${q.backoff_s[1] / 60} min`}${q.carries ? '; carries ' + q.carries : ''}` })),
    note('lock', 'Saving a change here asks for the second check.'),
  ]);
  return { ...head(s, c, 'admin-alerts', 'Alerts'), cols: grid(c, [failed, inbox], [routing, quiet]) };
}

/* ---------- agents and incidents ---------- */
function agentsPage(s: DemoState, c: PageCtx): PageSpec {
  const v = adminView(s), inc = A.incidents[0];
  const incident = v.d4 ? card('Incident', 'open since 06:12', [
    row({ icon: 'crisis_alert', name: inc.title, sub: 'It stopped at the per-run guard and the same story stops it again.', tags: [chipC('Open', 'mp-alertchip')] }),
    ...inc.tried.map((t: any) => ({ k: 'step' as const, time: t.at, l: t.what })),
    sec('Your choices'), ...inc.choices.map((ch: any) => row({ icon: 'arrow_forward', name: ch.label, sub: ch.does, chev: true, act: NOT_WALKED(ch.label) })),
    sec('Fixed on their own'), ...inc.fixed_on_its_own.map((f: any) => row({ icon: 'build_circle', name: fmt(f.at), sub: f.what })),
  ]) : card('Incidents', '', [p('No incident is open.')]);
  const agents = card('Agents', `${A.agents.length}`, A.agents.map((a: any) => {
    const st = !v.d4 ? 'running' : a.id === 'grader_tuner' ? (v.approved ? 'running' : a.status) : a.status;
    return row({ icon: 'smart_toy', name: a.name, sub: `${a.job}${v.d4 ? ` · heartbeat ${hhmm(a.heartbeat)}` : ''}`, tags: [chipC(cap1(st), st === 'incident' ? 'mp-alertchip' : st === 'asked you' ? 'mp-pause' : 'mp-neutral')] });
  }));
  const jobs = card('Scheduled jobs', '', led.jobs.map((j: any) => {
    const st = j.name.startsWith('Ingest') && v.replayed ? 'ok' : j.status;
    return row({ icon: 'schedule', name: j.name, sub: `last ${fmt(j.last)} · next ${fmt(j.next)}${j.note && !(j.name.startsWith('Ingest') && v.replayed) ? ' · ' + j.note : ''}`, tags: [chipC(cap1(st), st === 'ok' ? 'mp-neutral' : 'mp-alertchip')] });
  }));
  return { ...head(s, c, 'admin-agents', 'Agents'), cols: grid(c, [incident, agents], [jobs]) };
}

/* ---------- people and devices ---------- */
const lastSeen = (s: DemoState, d: any) => (d.last_seen <= nowIso(s) ? (d.last_seen.slice(0, 10) === DAY_ISO[s.clock] ? `today ${hhmm(d.last_seen)}` : dayLabel(d.last_seen)) : 'now');
function peoplePage(s: DemoState, c: PageCtx): PageSpec {
  const inv = live(s).invite;
  const list = (m: any) => {
    const paused = m.status === 'paused', owner = m.role === 'owner';
    const methods = m.sign_in.map((x: string, i: number) => (i ? x : cap1(x))).join(', ');
    return [
      row({ lead: initials(m.name), name: m.name, sub: `${cap1(m.role)}${owner ? ' · you' : ''} · ${methods}`, tags: [chipC(paused ? 'Paused' : m.status === 'left' ? 'Left' : 'Active', paused ? 'mp-pause' : 'mp-neutral', paused ? 'pause_circle' : undefined)], chev: !owner, act: owner ? undefined : nav('admin-person', { id: m.id }) }),
      ...m.devices.filter((d: any) => d.kind !== 'browser').map((d: any) => row({ icon: d.kind === 'ipad' ? 'tablet_mac' : 'phone_iphone', name: d.name, sub: d.signed_out ? `${d.model} · signed out at ${hhmm(d.signed_out)}` : `${d.model}${d.model && lastSeen(s, d) ? ' · ' : ''}${lastSeen(s, d)}` })),
    ];
  };
  const mem = card('Members and devices', `${s.members.length} members`, [...s.members.flatMap(list), note('info', 'Tap a member to pause them or sign out a device. Your own devices are in You. The owner can never be paused.')]);
  const invite = card('Invite a member', '', [
    ...(inv ? [row({ icon: 'hourglass_top', name: `${cap1(inv.role)} invite`, sub: `Not opened · made ${fmt(inv.at)} by you · single use · expires ${fmt(inv.expires)}`, v: 'console.mypaisapp.com/join/…', tags: [chipC('Pending', 'mp-neutral')], act: nav('join') })] : [p('No invites pending.')]),
    row({ icon: 'person_add', name: 'Invite a member', sub: 'A one-time link, 24 hours, for this household and this role', chev: true, act: askWith(s, 'admin.invite') }),
  ]);
  return { ...head(s, c, 'admin-people', 'Members and devices'), cols: grid(c, [mem], [invite]) };
}
function personPage(s: DemoState, c: PageCtx): PageSpec {
  const m = member(s, c.params.id ?? 'asha') ?? member(s, 'asha');
  const paused = m.status === 'paused', owner = m.role === 'owner', first = cap1(m.name);
  const stateRow = paused ? [row({ icon: 'pause_circle', name: `Paused at ${hhmm(m.paused_at)} by you`, sub: 'Sign-in is refused; both devices were signed out. While paused, she sees one line on sign-in.', tags: [chipC('Paused', 'mp-pause')] }),
    row({ icon: 'play_circle', name: `Restore ${first}`, sub: "Only the owner's Restore lets her back in. Asks for the second check.", chev: true, act: askWith(s, 'admin.restore', { who: m.id }) })] : [];
  const dev = card('Devices', '', m.devices.filter((d: any) => d.kind !== 'browser').map((d: any) => row({ icon: d.kind === 'ipad' ? 'tablet_mac' : 'phone_iphone', name: d.name, sub: d.signed_out ? `${d.model} · signed out at ${hhmm(d.signed_out)}` : `${d.model} · ${lastSeen(s, d)}`, chev: !d.signed_out && !owner, act: NOT_WALKED('Signing out one device') })));
  const acts = owner ? card(undefined, undefined, [p('The household has one owner. The owner is never paused or removed from here; their own devices are signed out from You.')])
    : card(undefined, undefined, [
      ...(paused ? [] : [row({ icon: 'pause_circle', name: `Pause ${first}`, sub: 'Sign-in is refused and every device is signed out until you restore her.', chev: true, act: askWith(s, 'admin.pause', { who: m.id }) })]),
      row({ icon: 'logout', name: 'Sign out everywhere', sub: paused ? 'Nothing to sign out: the pause ended both.' : 'Both devices sign in again. Her holdings and history are kept.', act: paused ? undefined : NOT_WALKED('Sign out everywhere') }),
      row({ icon: 'person_remove', name: 'Remove from household', sub: 'Her sign-ins end for good. Her accounts and their history stay with the household.', act: NOT_WALKED('Removing a member') }),
      p('Each asks for the second check, writes an audit row and sends you a message in the chat.'),
      ...(paused ? [link('What she sees on sign-in', nav('signin-refused', { id: 'paused' }))] : []),
    ]);
  const top = card(undefined, undefined, [row({ lead: initials(m.name), name: m.name, sub: `${cap1(m.role)} · joined ${dayLabel(m.joined)} · signs in with ${m.sign_in.map(cap1).join(' or ')}`, tags: [chipC(paused ? 'Paused' : 'Active', paused ? 'mp-pause' : 'mp-neutral')] }), ...stateRow]);
  return { title: c.compact ? first : 'Admin center', sub: `${first} · ${c.dayLabel}`, crumb: { t: 'Members and devices', act: nav('admin-people') }, tabs: c.compact ? undefined : TABS.map(([i, t]) => ({ t, on: i === 'admin-people', act: nav(i) })), cols: grid(c, [top, dev], [acts]) };
}

/* ---------- settings ---------- */
function settingsPage(s: DemoState, c: PageCtx): PageSpec {
  const cl = live(s).ceiling, groups = [...new Set((A.settings_registry as any[]).map((r) => r.group))];
  const cards = groups.map((g) => card(String(g), '', (A.settings_registry as any[]).filter((r) => r.group === g).map((r) => row({
    name: r.name, sub: `${r.key}${r.range ? ' · ' + r.range : ''}${r.band ? ' · ' + r.band : ''}`, v: r.key === 'budget.claude.prod.ceiling' && cl ? usd(cl) : r.value, vcls: 'mp-foot',
    tags: [chipC(cap1(r.mode), r.mode === 'admin' ? 'mp-neutral' : 'mp-pause')],
    act: r.key === 'budget.claude.prod.ceiling' ? askWith(s, 'admin.ceiling', { from: cl ?? 160 }) : r.mode === 'admin' ? NOT_WALKED(r.name) : undefined,
  }))));
  const half = Math.ceil(cards.length / 2);
  return { ...head(s, c, 'admin-settings', 'Settings', `Admin settings · ${c.dayLabel}`), cols: grid(c, [...cards.slice(0, half)], [...cards.slice(half), card(undefined, undefined, [p('Admin: you change it, behind the second check. Ask: an agent proposes, you confirm in the chat. Tuner and auto: the system moves it inside its band.')])]) };
}

export const adminPages: PageDef[] = [
  { meta: { id: 'admin', title: 'Admin center', icon: 'admin_panel_settings', area: 'household', side: 9, adminOnly: true, ask: 'Ask about the Admin center' }, build: gated('admin', 'Admin center', overview) },
  ...([['admin-spend', 'Spend', spendPage], ['admin-approvals', 'Approvals', approvalsPage], ['admin-alerts', 'Alerts', alertsPage], ['admin-agents', 'Agents', agentsPage], ['admin-people', 'Members and devices', peoplePage], ['admin-settings', 'Settings', settingsPage]] as const).map(([id, title, fn]): PageDef =>
    ({ meta: { id, title, icon: 'admin_panel_settings', area: 'household', parent: 'admin', adminOnly: true, ask: 'Ask about the Admin center' }, build: gated(id, title, fn as any) })),
  { meta: { id: 'admin-person', title: 'Member', icon: 'person', area: 'household', parent: 'admin-people', adminOnly: true }, build: gated('admin-person', 'Member', personPage) },
];

/* ---------- the flows ---------- */
const note1 = (icon: string, t: string) => cnote(icon, t);
const audit = note1('history', 'An audit row, and a message to you in the chat.');
export const adminFlows: Flow[] = [
  { id: 'admin.approve', area: 'household', title: 'Approve cr-26', opener: 'Approve the risk model change (cr-26)', match: ['approve', 'cr-26'], needs: (s) => s.viewer === 'arun' && !s.applied.includes('e-approve-cr26'), beats: ownerOnly([
    startAt('08:27'),
    { ai: 'cr-26 is waiting: the Grader and tuner asks to promote the risk model v8 over v7. An admin change, so a fresh check first.' },
    ...checkBeats(),
    { confirm: () => confirmCard(ccard({ over: 'Approval · cr-26', title: A.approvals[0].title, parts: [ckv('From', 'the Grader and tuner', false), ckv('Cost', A.approvals[0].cost, false), ckv('Risk', A.approvals[0].risk, false), cp(A.approvals[0].why), note1('undo', A.approvals[0].undo), audit] })), label: 'Approve', onConfirm: (s) => [evOrCopy(s, 'e-approve-cr26')] },
    { ai: 'Approved with your passkey. v8 goes live; v7 stays ready and comes back on its own if v8 slips.' },
  ]) },
  { id: 'admin.replay', area: 'household', title: 'Replay failed work', opener: 'Replay the failed job', match: ['replay', 'failed work', 'dead letter'], needs: (s) => s.viewer === 'arun' && !s.applied.includes('e-replay'), beats: ownerOnly([
    startAt('08:29'),
    { ai: () => `${A.dead_letters[0].job} failed ${A.dead_letters[0].tried.split(' ')[0]} times, ${A.dead_letters[0].reason.toLowerCase()}. Replay moves it back to its queue. A fresh check first.` },
    ...checkBeats(),
    { confirm: () => confirmCard(ccard({ over: 'Failed work · replay', title: 'Replay 1 job', parts: [ckv('Queue', A.dead_letters[0].queue, false), ckv('Job', A.dead_letters[0].job, false), ckv('Tried', A.dead_letters[0].tried, false), note1('replay', 'Handlers are idempotent, so nothing runs twice. Until it runs, the NASDAQ 100 ETF shows Thursday\'s close, marked stale.'), audit] })), label: 'Replay 1 job', onConfirm: (s) => [evOrCopy(s, 'e-replay')] },
    { ai: 'Replayed. The dead-letter queue is empty and the badge on the Admin center has cleared.' },
  ]) },
  { id: 'admin.ceiling', area: 'household', title: "Move prod's ceiling", opener: "Move prod's Claude ceiling", match: ['ceiling'], needs: (s) => s.viewer === 'arun', beats: ownerOnly([
    startAt('08:30'),
    { ask: { key: 'to', label: 'New ceiling', q: "Prod's ceiling is $160 now, with the Console's hard limit at $200. What should it be?", chips: [{ t: '$50', v: 50 }, { t: '$220', v: 220 }] } },
    { when: (s, a) => a.to === 220, beats: [
      { card: () => ccard({ over: 'Move the ceiling', title: 'Refused: above the hard limit', tag: 'Nothing changed', parts: [cnote('block', "Above prod's hard limit, $200. The Console would stop the key at $200 anyway."), cp("To go higher: raise the prod workspace's spend limit in the Claude Console, then type the new hard limit in Spend, then move the ceiling again. The app holds no Console key, so it cannot raise the limit itself.")] }) },
      { ai: 'Nothing has changed: the ceiling is still $160.' },
    ] },
    { when: (s, a) => a.to === 50, beats: [
      { ai: 'A lower ceiling is a change to the household\'s settings, so a fresh check first.' },
      ...checkBeats(),
      { confirm: (s, a) => { const from = a.from ?? 160, sv = [70, 85, 95].map((p) => usd((p * 50) / 100));
        return confirmCard(ccard({ over: 'Move the ceiling', title: `Prod ceiling ${usd(from)} → $50`, parts: [ckv('Now', `${usd(from)} · about £${Math.round(from / 1.3)}`), ckv('New', '$50 · about £38'), cnote('stairs', `$0.40 is spent, ${((0.4 / 50) * 100).toFixed(1)}% of $50: the bot stays on Normal.`), cnote('speed', `The heads-up starts at ${sv[0]}, savers at ${sv[1]}, essentials at ${sv[2]}; Claude stops at $50.`), cnote('group', "Each member's share becomes $30; the daily guard about $5."), cnote('schedule', 'Takes effect at the next model call.'), audit] })); }, onConfirm: (s) => [evOrCopy(s, 'e-ceiling')] },
      { ai: "Done. Prod's ceiling is $50 from the next model call. It is in the audit log, and this message is the one you asked for." },
    ] },
  ]) },
  { id: 'admin.pause', area: 'household', title: "Pause a member's account", opener: "Pause a member's account", match: ['pause asha', 'pause a member', 'pause her'], needs: (s) => s.viewer === 'arun' && member(s, 'asha')?.status === 'active', beats: ownerOnly([
    { ask: { key: 'who', label: 'Member', q: 'Whose account should I pause?', chips: [{ t: 'Asha', v: 'asha' }, { t: 'Arun, the owner', v: 'arun' }] }, skip: (s, a) => a.who !== undefined },
    { when: (s, a) => a.who === 'arun', beats: [{ ai: "You are the household's owner, so you can't pause your own account. Only a member can be paused, and only you can restore her. I have changed nothing." }] },
    { when: (s, a) => a.who === 'asha', beats: [
      startAt('09:35'),
      { ai: 'Pausing refuses her sign-in and signs her out of every device until you restore her. An admin change, so a fresh check first.' },
      ...checkBeats(true),
      { confirm: (s) => confirmCard(ccard({ over: 'Members · pause', title: "Pause Asha's account", parts: [ckv('Ends', '2 sessions: her iPhone and iPad', false), cnote('block', 'Sign-in is refused until you restore her; she sees one line.'), cnote('inventory_2', 'Her holdings and history are kept.'), cnote('verified_user', "Only the owner's Restore lets her back in."), audit] })), label: 'Pause Asha', onConfirm: (s) => [evOrCopy(s, 'e-pause-asha')] },
      { ai: "Paused. Asha is signed out on both devices; her holdings and history are kept. Restore her from People when you are ready." },
    ] },
  ]) },
  { id: 'admin.restore', area: 'household', title: "Restore a member's account", opener: "Restore Asha's account", match: ['restore asha', 'restore her', 'restore a member'], needs: (s) => s.viewer === 'arun' && member(s, 'asha')?.status === 'paused', beats: ownerOnly([
    startAt('10:03'),
    { ai: 'Only you, the owner, can let a paused member back in. A fresh check first.' },
    ...checkBeats(),
    { confirm: () => confirmCard(ccard({ over: 'Members · restore', title: "Restore Asha's account", parts: [cnote('login', 'She signs in again on each device, Face ID or her PIN first.'), cnote('inventory_2', 'Her holdings and history were kept.'), audit] })), label: 'Restore Asha', onConfirm: (s) => [evOrCopy(s, 'e-restore-asha')] },
    { ai: 'Restored. Asha is active again and signs in on each device herself.' },
  ]) },
  { id: 'admin.invite', area: 'household', title: 'Invite a member', opener: 'Invite a member', match: ['invite'], needs: (s) => s.viewer === 'arun', beats: ownerOnly([
    startAt('10:06'),
    { ask: { key: 'role', label: 'Role', q: 'A one-time link to join the Dutta household. What can they do?', chips: [{ t: 'Member: adds and changes holdings in their own accounts', v: 'member' }, { t: 'Viewer: reads the overview and what members share', v: 'viewer' }] } },
    ...checkBeats(),
    { confirm: (s, a) => { const exp = new Date(Date.parse(nowIso(s) + 'Z') + 864e5).toISOString().slice(0, 16); return confirmCard(ccard({ over: 'Members · invite', title: `Create a ${a.role} link`, parts: [ckv('Link', 'console.mypaisapp.com/join/…', false), ckv('Single use', 'for this household and this role only', false), ckv('Lasts', `24 hours, until ${fmt(exp)}`, false), cnote('phone_iphone', 'Opens MyPaisa in the app, or the web app in a browser.'), audit] })); }, label: 'Create the link',
      onConfirm: (s, a) => { const n = s.audit.filter((r) => r.kind === 'admin_invite').length + 1, at = nowIso(s), exp = new Date(Date.parse(at + 'Z') + 864e5).toISOString().slice(0, 16);
        return [{ type: 'event', ev: { id: `e-invite-${n}`, at, actor: 'arun', via: 'admin', kind: 'admin_invite', record: `invite-${n}`, field: 'role', before: null, after: a.role, summary: `Invite created · ${a.role} · single use · expires ${fmt(exp)} · Arun · ${fmt(at)} · in the Admin center`, illustrative: true, payload: { role: a.role, at, expires: exp } } }]; } },
    { card: () => ccard({ over: 'Invite · pending', title: 'The link is ready', parts: [cnote('ios_share', "Share it from iOS's share sheet; it shows under Members and devices until it is used, cancelled or 24 hours pass."), { k: 'linkBtn', t: 'Open it as the invitee sees it', act: nav('join') }, { k: 'linkBtn', t: 'And when it is out of date', act: nav('signin-refused', { id: 'invite' }) }] }) },
  ]) },
];

export const adminAppliers: Record<string, (s: any, ev: any) => void> = {
  fresh_check: (s, ev) => { liveW(s).fresh = ev.at; },
  fresh_check_failed: (s, ev) => { liveW(s).freshFailed = ev.at; },
  admin_approve: (s, ev) => { liveW(s).approved = [...(liveW(s).approved ?? []), ev.record]; },
  admin_replay: (s) => { liveW(s).replayed = true; },
  admin_ceiling: (s, ev) => { liveW(s).ceiling = Number(ev.after); },
  admin_pause: (s, ev) => {
    const m = s.members.find((x: any) => x.id === ev.record);
    if (!m || m.role === 'owner') return; // the owner can never be paused
    m.status = 'paused'; m.paused_at = ev.at; for (const d of m.devices) d.signed_out = ev.at;
  },
  admin_restore: (s, ev) => {
    const m = s.members.find((x: any) => x.id === ev.record);
    if (!m || m.status !== 'paused') return;
    m.status = 'active'; delete m.paused_at; for (const d of m.devices) delete d.signed_out;
  },
  admin_invite: (s, ev) => { liveW(s).invite = { role: ev.payload?.role ?? ev.after, at: ev.payload?.at ?? ev.at, expires: ev.payload?.expires ?? ev.at }; },
};
