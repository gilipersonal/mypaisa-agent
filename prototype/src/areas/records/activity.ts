/* Activity and a run (Web v4 · Shell and chat "Browser · Activity" and "Browser · A run", their phone boards, iPhone
   audit and activity; Prototype v4's run r-1235 page is the model). Runs come from the applied events and the ledger's
   runs up to the clock; the cost line sums the runs shown (lesson 10). */
import { L } from '../../data/figures';
import { dayLabel } from '../../lib/format';
import { DAY_ISO, ledgerRun } from '../../state/reduce';
import type { DemoState, Run } from '../../state/model';
import type { PageCtx, PagePart, PageSpec } from '../../state/registry';
import { card, kv, nav, p, row, seg, sec } from '../kit';

const led: any = L;
const hm = (iso: string) => iso.slice(11, 16);
const usd = (n: number, dp = 2) => '$' + n.toFixed(dp);
const tok = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
const tokensOf = (r: Run) => r.model_calls.reduce((t, c) => t + c.in + c.out, 0);
const cachedOf = (r: Run) => r.model_calls.reduce((t, c: any) => t + (c.cached ?? 0), 0);
const modelOf = (r: Run) => (r.model_calls.length ? `${r.model_calls[0].model} · ${r.model_calls.length} call${r.model_calls.length > 1 ? 's' : ''}` : 'No model');

/** The runs of the demo's day, up to its clock: the ledger's (scheduled ones included) and every run an applied event added. */
export function runsToday(s: DemoState): Run[] {
  const day = DAY_ISO[s.clock];
  const seen = new Map<string, Run>();
  for (const r of [...(led.runs ?? []), ...s.runs] as Run[]) {
    if (r.at.slice(0, 10) !== day) continue;
    /* a run that made events is listed once they are applied (a clock page never shows a change as done early) */
    const made = r.events?.length ? r.events.every((e) => s.applied.includes(e)) : hm(r.at) <= s.time;
    if (made) seen.set(r.id, r);
  }
  return [...seen.values()].sort((a, b) => a.at.localeCompare(b.at));
}
/** A run's name and what it did, split from its title as the boards write them. */
function names(r: Run): { name: string; rest: string } {
  const parts = r.title.split(' · ');
  if (parts[0] === 'Chat') return { name: `Chat · ${(parts[1] ?? '').replace(/, \d\d:\d\d$/, '')}`.replace(/ · $/, ''), rest: parts.slice(2).join(' · ') };
  return { name: parts[0], rest: parts.slice(1).join(' · ') };
}
const runTitle = (r: Run) => { const parts = r.title.split(' · '); return parts[0] === 'Chat' ? parts.slice(0, 2).join(' · ') : r.title; };
const lastStep = (r: Run) => r.steps[r.steps.length - 1]?.label ?? '';

/* Claude's spend this cycle: the base before the ledger's first listed run, plus the runs to now (ledger: admin.spend) */
function cycle(s: DemoState) {
  const sp = led.admin.spend; const second = s.clock === 'd3' || s.clock === 'd3e' || s.clock === 'd4';
  const base = second ? 0 : sp.snapshots[0].base_before_first_listed_run_usd;
  const from = second ? '2026-11-03' : '2026-10-25';
  const now = DAY_ISO[s.clock] + 'T' + s.time;
  const all = new Map<string, Run>();
  for (const r of [...(led.runs ?? []), ...s.runs] as Run[]) if (r.at.slice(0, 10) >= from && r.at <= now + ':59') all.set(r.id, r);
  const spent = base + [...all.values()].reduce((t, r) => t + r.cost_usd, 0);
  const ceiling = s.applied.includes('e-ceiling') ? 50 : sp.prod.ceiling_usd;
  return { spent, ceiling, pct: Math.round((spent / ceiling) * 100), renews: second ? '3 Dec' : '3 Nov', steps: sp.prod.steps_pct as number[] };
}

export function activityPage(s: DemoState, c: PageCtx): PageSpec {
  const mine = c.asha || c.params.who === 'mine';
  const runs = runsToday(s).filter((r) => !mine || !r.actor || r.actor === s.viewer);
  const cost = runs.reduce((t, r) => t + r.cost_usd, 0);
  const rows: PagePart[] = [{ k: 'runHead' }, ...runs.map((r): PagePart => {
    const n = names(r); const outcome = r.outcome ?? r.status;
    const tools = r.tools.length ? r.tools.map((t) => t.name).join(', ') : '';
    return { k: 'run', time: hm(r.at), name: n.name, sub: [n.rest, `run ${r.id}`].filter(Boolean).join(' · ') + (tools ? ' · ' + tools : ''),
      model: modelOf(r), tokens: r.model_calls.length ? tok(tokensOf(r)) : '0', cost: usd(r.cost_usd), outcome: outcome.split(' · ')[0], act: nav('run', { id: r.id }) };
  })];
  if (s.clock === 'd1' && !mine) rows.push({ k: 'run', time: '21:00', name: 'Prices', sub: 'Scheduled, not run yet', model: 'Not run yet', tokens: '', cost: '', outcome: 'Due', act: { type: 'nope', t: 'Scheduled for 21:00: it has not run yet.' } });
  const cy = cycle(s);
  const runsC = card(s.clock === 'd1' ? "Today's runs" : `${dayLabel(DAY_ISO[s.clock])}'s runs`, `${runs.length} done${s.clock === 'd1' && !mine ? ' · 1 due' : ''} · ${usd(cost)}${s.clock === 'd1' ? ' so far' : ''}`, rows, 'runs');
  const cyc = card('Claude this cycle', `renews ${cy.renews}`, [
    { k: 'meter', big: usd(cy.spent, 0), bsub: `of the ${usd(cy.ceiling, 0)} ceiling · ${cy.pct}%`, w: Math.max(cy.pct, 1) + '%', steps: c.compact ? [cy.steps[0]] : c.ios ? cy.steps.filter((t) => t < 100) : cy.steps, label: 'Claude spend this cycle' },
    p(cy.pct < cy.steps[0] ? `Step: Normal, under ${cy.steps[0]}%. Nothing is held back.` : `Step: past ${cy.steps[0]}%. Heavy work waits.`)]);
  const ctrls = c.web ? { whose: seg(["Everyone's runs", 'Mine'], mine ? 1 : 0, (i) => nav('activity', i ? { who: 'mine' } : undefined)) } : undefined;
  const whoSeg = !c.web && !c.asha ? seg(["Everyone's runs", 'Mine'], mine ? 1 : 0, (i) => nav('activity', i ? { who: 'mine' } : undefined)) : undefined;
  return {
    title: 'Activity', sub: `What MyPaisa did ${s.clock === 'd1' ? 'today, ' : 'on '}${c.dayLabel}, to ${s.time} · UK time · costs from the API's own token counts`,
    ctrls, tabs: whoSeg, colsCls: 'one', cols: c.compact ? [[cyc, runsC]] : [[runsC, cyc]],
  };
}

export function runPage(s: DemoState, c: PageCtx): PageSpec {
  const id = c.params.id; const r = s.runs.find((x) => x.id === id) ?? ledgerRun(id);
  const crumb = { t: 'Activity', act: nav('activity') };
  if (!r) return { title: 'Run', crumb, sub: 'No such run', cols: [[card(undefined, undefined, [p(`No run ${id ?? ''} in the ledger.`)])]] };
  const n = names(r); const end = r.steps[r.steps.length - 1]?.at ?? hm(r.at);
  const modelS = r.model_calls.reduce((t, x: any) => t + (x.ms ?? 0), 0) / 1000;
  const toolS = r.tools.reduce((t, x) => t + (Number(x.ms) || 0), 0) / 1000;
  const wait = r.actor ? Math.max(0, r.duration_s - modelS - toolS) : 0;
  const outcome = r.outcome ?? r.status;
  const sum = card('', '', [
    kv('Trigger', r.trigger === 'chat' ? `${r.actor ? r.actor[0].toUpperCase() + r.actor.slice(1) : 'A member'}'s message at ${hm(r.at)}:${r.at.slice(17, 19) || '00'}` : r.trigger === 'schedule' ? 'The schedule' : r.trigger === 'check_in' ? 'The check-in job' : r.trigger, false),
    kv('Start → end', `${hm(r.at)}:${r.at.slice(17, 19) || '00'} → ${end} · ${r.duration_s} s`, false),
    ...(r.model_calls.length ? [kv('Where the time went', `${modelS.toFixed(1)} s model, ${toolS.toFixed(1)} s tools${wait ? `, ${Math.round(wait)} s for ${r.actor[0].toUpperCase() + r.actor.slice(1)}` : ''}`, false)] : []),
    kv('Outcome', outcome, false),
    kv('Cost', r.model_calls.length ? `${usd(r.cost_usd)} · ${tok(tokensOf(r))} tokens, ${tok(cachedOf(r))} cached` : `${usd(0)} · no model`, false)]);
  const toolNames = r.tools.map((t) => t.name);
  const steps = card(`Steps · ${r.steps.length}`, 'UK time', r.steps.map((st): PagePart => {
    const i = st.label.indexOf(': '); const lead = i > 0 && i <= 24 ? st.label.slice(0, i) : '';
    const word = !lead && /^(draft_record|ask_user|propose_change|get_\w+)/.exec(st.label)?.[0];
    return { k: 'step', time: st.at, l: lead || word || 'Step', t: lead ? st.label.slice(i + 2) : word ? st.label.slice(word.length).trim() : st.label, lc: toolNames.includes(lead || word || '') ? 'tl ink' : undefined };
  }));
  const calls = r.model_calls.length ? card(`Model calls · ${r.model_calls.length}`, `${usd(r.cost_usd, 3)} in all`, r.model_calls.map((m: any, i): PagePart => ({ k: 'call', m: `${i + 1} · ${m.model}${m.label ? ' · ' + m.label : ''}`, cost: usd(m.cost_usd, 3),
    t: `in ${m.in.toLocaleString('en-GB')} · cached ${(m.cached ?? 0).toLocaleString('en-GB')} · out ${m.out.toLocaleString('en-GB')}${m.ms ? ` · ${(m.ms / 1000).toFixed(1)} s` : ''}` }))) : null;
  const tools = r.tools.length ? card(`Tool calls · ${r.tools.length}`, 'all code', r.tools.map((t): PagePart => ({ k: 'tool', n: t.name, ms: `${t.ms} ms` }))) : null;
  const evs = r.events.map((e) => s.audit.find((a) => a.id === e)).filter(Boolean) as any[];
  const did = evs.length ? card('What it saved', `${evs.length} event${evs.length > 1 ? 's' : ''}`, evs.map((e) => row({ icon: 'history', name: e.summary.split(' · ').slice(0, 2).join(' · '), sub: e.summary.split(' · ').slice(2).join(' · '), v: '' }))) : null;
  const nothing = !calls && !tools ? card(undefined, undefined, [p('A job of code: no model was called and no tool was asked for.')]) : null;
  const side = [calls, tools, did, nothing].filter(Boolean) as ReturnType<typeof card>[];
  return {
    title: runTitle(r), crumb, headChip: `${outcome.split(' · ')[0]} ${end.slice(0, 5)}`,
    sub: `${dayLabel(r.at)}${n.rest ? ' · ' + n.rest : ''} · run ${r.id}`,
    cols: c.compact ? [[sum, ...side.slice(0, 2), steps, ...side.slice(2)]] : [[sum, steps], side],
  };
}
void sec;
