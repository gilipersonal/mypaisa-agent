/* Area 'audit' (MA-290): the Audit (Browser · Audit with files, iPhone · Audit, iPad · Audit and Activity), Files and
   the file viewer (Browser · Files, Browser · File viewer, iPhone · Files, iPhone · File preview) and Reports (Browser ·
   Reports). Read-only pages: every figure is read from s.audit, s.files, s.assets, s.debts and the figure set. */
import { H } from '../../data/figures';
import { dayLabel, hhmm } from '../../lib/format';
import { register, type PageCtx, type PageDef, type PagePart, type PageSpec, type Seg } from '../../state/registry';
import type { AuditRow, DemoState, FileRec } from '../../state/model';
import { DAY_ISO } from '../../state/reduce';
import { bar, card, chips, gbp, inr, nav, note, p, pct, row, sec, seg, toGbp } from '../kit';

const h: any = H;
type Who = 'all' | 'arun' | 'asha';
type Cat = 'all' | 'records' | 'plans' | 'admin';
const WHO: Who[] = ['all', 'arun', 'asha'];
const CATS: Cat[] = ['all', 'records', 'plans', 'admin'];
const CAT_T: Record<Cat, string> = { all: 'All', records: 'Records', plans: 'Plans', admin: 'Admin' };

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const st = (s: DemoState): { who: Who; cat: Cat } => ({ who: 'all', cat: 'all', ...(s.area.audit ?? {}) });
const isAdminRow = (r: AuditRow) => r.via === 'admin' || r.kind === 'sign_in' || r.kind.startsWith('fresh_check') || r.kind.startsWith('admin_');
const isPlanRow = (r: AuditRow) => r.kind.startsWith('plan_') || r.kind === 'assumption_correct' || r.kind === 'budget_change' || r.kind === 'undo';
const catOf = (r: AuditRow): Cat => (isAdminRow(r) ? 'admin' : isPlanRow(r) ? 'plans' : 'records');

/** What a member may see: Asha reads the household's rows but not the admin's security rows (ARCHITECTURE §4.6, §8). */
export function visibleRows(s: DemoState, viewer: string): AuditRow[] {
  return s.audit.filter((r) => viewer !== 'asha' || !(isAdminRow(r) && r.actor !== 'asha'));
}
/** The rows the filters leave, newest first. */
export function shownRows(s: DemoState, viewer: string): AuditRow[] {
  const f = st(s);
  const rows = visibleRows(s, viewer).filter((r) => (f.who === 'all' || r.actor === f.who) && (f.cat === 'all' || catOf(r) === f.cat));
  return rows.map((r, i) => ({ r, i })).sort((a, b) => (a.r.at < b.r.at ? 1 : a.r.at > b.r.at ? -1 : b.i - a.i)).map((x) => x.r);
}
/** A file's size as the boards write it. */
export const size = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const kindT = (f: FileRec) => (f.kind === 'pdf' ? `PDF · ${(f as any).pages ?? 1} pages` : f.kind === 'csv' ? 'CSV' : f.kind.toUpperCase());
const fileIcon = (f: FileRec) => (f.kind === 'pdf' ? 'picture_as_pdf' : 'table_chart');
const VIA: Record<string, string> = { chat: 'in the chat', file: 'in the chat', statement: 'in the chat', check_in: 'on the check-in', inline_edit: 'in place', plan: 'in the chat', admin: 'in the Admin center', sign_in: 'sign-in' };
const ICON: Record<string, string> = { register: 'add_circle', correction: 'edit', check_in_paid: 'event_available', statement_confirm: 'receipt_long', emi_confirmed: 'directions_car', file_received: 'attach_file', month_close: 'event_available', file_open: 'visibility', sign_in: 'login', undo: 'undo' };
const iconOf = (r: AuditRow) => ICON[r.kind] ?? (r.kind.startsWith('plan_') ? 'timeline' : r.kind.startsWith('admin_') ? 'shield_person' : r.kind.startsWith('fresh_check') ? 'passkey' : 'history');

const fmtV = (x: any, ccy?: string | null): string => {
  if (x === null || x === undefined) return '';
  if (typeof x === 'number') return ccy === 'INR' ? inr(x) : ccy === 'GBP' ? (Math.abs(x) % 1 ? `£${x.toFixed(2)}` : gbp(x)) : ccy === 'USD' ? `$${x}` : Math.abs(x) < 1 ? `${+(x * 100).toFixed(2)}%` : String(x);
  return String(x);
};
const DAYTIME = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d+ \w+ \d\d:\d\d$/;
/** The ledger's summary, split into the headline and the rest, without its day and time (the day heads the card). */
function parts(r: AuditRow): { what: string; rest: string } {
  const [what, ...rest] = r.summary.split(' · ').filter((x) => !DAYTIME.test(x));
  return { what, rest: rest.join(' · ') };
}
/** The files a row was made from. */
const rowFiles = (r: AuditRow, s: DemoState): FileRec[] => {
  const ids: string[] = [...(r.file ? [r.file] : []), ...(((r as any).files as string[]) ?? [])];
  return [...new Set(ids)].map((id) => s.files.find((f) => f.id === id)).filter(Boolean) as FileRec[];
};
/** A member opens their own files and the owner any (ARCHITECTURE §4.6). */
const canOpen = (f: FileRec, c: PageCtx) => c.admin || f.from === c.viewer;

function auditRow(r: AuditRow, s: DemoState, c: PageCtx): PagePart[] {
  const { what, rest } = parts(r);
  const hasRun = !!(r.run && s.runs.some((x) => x.id === r.run));
  const ch = r.before !== null && r.before !== undefined && r.after !== null && r.after !== undefined && r.field !== 'status' ? `${fmtV(r.before, r.ccy)} → ${fmtV(r.after, r.ccy)}` : '';
  const out: PagePart[] = [row({
    icon: iconOf(r), name: `${hhmm(r.at)} · ${what}`, sub: rest, sub2: ch || undefined,
    v: typeof r.after === 'number' && r.ccy && r.kind !== 'undo' ? fmtV(r.after, r.ccy) : '',
    tags: hasRun ? [{ t: `Run ${r.run}`, icon: 'smart_toy' }] : undefined, act: hasRun ? nav('run', { id: r.run! }) : undefined, chev: hasRun,
  })];
  for (const f of rowFiles(r, s)) out.push(row({ icon: fileIcon(f), name: f.name, sub: `${kindT(f)} · ${size(f.bytes)}${canOpen(f, c) ? ' · Open' : ''}`, act: canOpen(f, c) ? nav('file', { id: f.id }) : undefined, chev: canOpen(f, c), cls: 'fileline' }));
  return out;
}

const tabsOf = (on: 'changes' | 'files'): Seg[] => [{ t: 'Changes', on: on === 'changes', act: nav('audit') }, { t: 'Files', on: on === 'files', act: nav('files') }];
const A = (a: Record<string, any>) => ({ type: 'area', area: 'audit', ...a });

function auditPage(s: DemoState, c: PageCtx): PageSpec {
  const f = st(s);
  const who: Who = c.asha && f.who === 'asha' ? 'asha' : f.who;
  const cats = CATS.filter((x) => !(c.asha && x === 'admin'));
  const rows = shownRows(s, c.viewer);
  const days: string[] = [];
  for (const r of rows) { const d = r.at.slice(0, 10); if (!days.includes(d)) days.push(d); }
  const cards = days.map((d) => {
    const dr = rows.filter((r) => r.at.slice(0, 10) === d);
    return card(dayLabel(d), `${dr.length} ${dr.length === 1 ? 'row' : 'rows'}`, dr.flatMap((r) => auditRow(r, s, c)));
  });
  const nFile = visibleRows(s, c.viewer).filter((r) => rowFiles(r, s).length).length;
  const head = card('The audit log', `${rows.length} rows shown${nFile ? ` · ${nFile} made from a file` : ''}`, [
    note('verified', 'Hash chain verified: each row is sealed to the one before it. Nothing on this page can change a record; every change is a card and a Confirm in the chat, and lands here.'),
    ...(c.asha ? [{ k: 'lock', t: "The admin's security rows (sign-ins, fresh checks, the Admin center) are the owner's; you see the household's changes." } as PagePart] : []),
  ]);
  const catChips = chips(cats.map((x) => ({ t: `${f.cat === x ? '● ' : ''}${CAT_T[x]}`, act: A({ name: 'filter', cat: x }) })));
  const empty = card(undefined, undefined, [p(rows.length ? '' : 'No rows match these filters.')]);
  return {
    title: 'Audit',
    sub: `Every change to a record, and every file sent, newest first · ${c.dayLabel} · illustrative figures`,
    tabs: tabsOf('changes'),
    ctrls: { whose: seg(['Everyone', 'Arun', 'Asha'], WHO.indexOf(who), (i) => A({ name: 'filter', who: WHO[i] })) },
    colsCls: 'one',
    cols: [[catChips, head, ...(cards.length ? cards : [empty]), card('Reports', 'built from the same records', [row({ icon: 'summarize', name: 'Reports and exports', sub: 'Composition, the month, net worth by event', act: nav('reports'), chev: true })])]],
  };
}

function filesPage(s: DemoState, c: PageCtx): PageSpec {
  const mine = s.files.filter((f) => canOpen(f, c)).sort((a, b) => (a.received_at < b.received_at ? 1 : -1));
  const list: PagePart[] = mine.length ? mine.map((f) => {
    const fed = s.audit.filter((r) => f.events.includes(r.id));
    return row({ icon: fileIcon(f), name: f.name, sub: `${kindT(f)} · ${size(f.bytes)}`, sub2: `${cap(f.from)} · ${dayLabel(f.received_at)} ${hhmm(f.received_at)} · ${VIA[f.via] ?? f.via}`, tags: [{ t: fed.length === 1 ? 'Fed 1 change' : `Fed ${fed.length} changes` }], act: nav('file', { id: f.id }), chev: true });
  }) : [row({ icon: 'folder_off', name: 'No files to show', sub: s.files.length ? 'A file opens only for the member who sent it and for the owner. Nothing here is yours yet.' : 'Every file sent in the chat is kept here and opens from the audit log. None has been sent yet.' })];
  const kept = card('Kept', `${s.files.length} ${s.files.length === 1 ? 'file' : 'files'}${s.files.length ? ` · ${size(s.files.reduce((t, f) => t + f.bytes, 0))}` : ''}`, [
    p('Each file is copied to a private, encrypted store before anything reads it, and kept whatever happens next. Nothing is deleted after reading.'),
  ]);
  const who = card('Who can open a file', '', [
    row({ icon: 'shield_person', name: 'Owner', sub: 'any file', v: '' }), row({ icon: 'person', name: 'Member', sub: 'their own files' }), row({ icon: 'visibility', name: 'Viewer', sub: 'none' }),
    p('Open checks the role first, then makes a link that works for 5 minutes. Each opening is a row in the log.'),
  ]);
  return {
    title: 'Audit', sub: `Every file sent, newest first · ${c.dayLabel} · illustrative figures`,
    crumb: { t: 'Audit', act: nav('audit') }, tabs: tabsOf('files'), colsCls: c.compact ? 'one' : 'two',
    cols: c.compact ? [[card('Every file sent', `${mine.length} · newest first`, list), kept, who]] : [[card('Every file sent', `${mine.length} ${mine.length === 1 ? 'file' : 'files'} · newest first`, list)], [kept, who]],
  };
}

/** The statement a file holds, line by line. */
export function fileLines(f: FileRec): { date: string; name: string; sub: string; amount: number; spend: boolean; tag?: string }[] {
  const so = h.statements_oct[f.statement ?? ''];
  if (!so) return [];
  if (f.statement === 'barclaycard_nov') return so.lines.map((l: any) => ({ date: l.date, name: l.merchant, sub: l.category, amount: l.amount_gbp, spend: true, tag: undefined as string | undefined }));
  return [
    ...so.spend_lines.map((l: any) => ({ date: l.date, name: l.merchant, sub: l.category, amount: l.amount_gbp, spend: true, tag: undefined as string | undefined })),
    ...so.recognised.map((l: any) => ({ date: l.date, name: l.what, sub: l.as, amount: l.amount_gbp, spend: false, tag: /Car loan/.test(l.what) ? 'EMI confirmed' : /EMI/.test(l.as) ? 'EMI matched' : undefined })),
  ];
}

function filePage(s: DemoState, c: PageCtx): PageSpec {
  const f = s.files.find((x) => x.id === c.params.id);
  const back = { t: 'Files', act: nav('files') };
  if (!f || !canOpen(f, c)) return { title: 'File', crumb: back, colsCls: 'one', cols: [[card(undefined, undefined, [row({ icon: 'folder_off', name: f ? 'This file is not yours to open' : 'No such file', sub: f ? 'A member opens their own files; the owner opens any.' : 'It is not in the log.' })])]] };
  const so = h.statements_oct[f.statement ?? ''];
  const lines = fileLines(f);
  const spendT = lines.filter((l) => l.spend).reduce((t, l) => t + l.amount, 0);
  const fed = s.audit.filter((r) => f.events.includes(r.id));
  const line = (l: ReturnType<typeof fileLines>[number]) => row({ icon: l.spend ? 'receipt' : 'swap_horiz', name: l.name, sub: `${dayLabel(l.date)} · ${l.sub}`, v: l.amount % 1 ? `£${l.amount.toFixed(2)}` : gbp(l.amount), tags: l.tag ? [{ t: l.tag }] : undefined });
  const summary = card(f.name, kindT(f), [
    { k: 'kv', key: 'Sent by', v: `${cap(f.from)} · ${VIA[f.via] ?? f.via}` }, { k: 'kv', key: 'Received', v: `${dayLabel(f.received_at)} ${hhmm(f.received_at)}` },
    { k: 'kv', key: 'Size', v: size(f.bytes) }, { k: 'kv', key: 'Lines', v: String(lines.length) },
    note('lock', 'Kept for good: this file was copied to a private, encrypted store before anything read it, and is never deleted after extraction. It opens from the audit log.'),
    { k: 'btn', t: 'Open original', icon: 'open_in_new', act: [{ type: 'event', ev: { id: `open-${f.id}-${s.audit.length}`, at: `${DAY_ISO[s.clock]}T${s.time}`, actor: c.viewer, via: 'file', kind: 'file_open', record: f.id, field: null, before: null, after: null, summary: `File opened · ${f.name} · ${cap(c.viewer)} · ${dayLabel(DAY_ISO[s.clock])} ${s.time} · in the web app`, run: null, file: f.id, illustrative: true } }, { type: 'toast', t: 'Opened with a link that works for 5 minutes. The opening is a row in the log.' }] },
    note('timer', 'Opened with a link that works for 5 minutes. After that, Open asks for a new one, after the same role check. Read-only: a file cannot be deleted, renamed or replaced here.'),
  ]);
  const body = card(f.kind === 'pdf' ? 'Page by page, as read' : 'Rows, as read', `${lines.length} lines`, [
    ...(f.statement === 'barclaycard_nov'
      ? [...lines.map(line), sec('Total', ''), { k: 'kv', key: 'Lines add up to', v: gbp(spendT) } as PagePart, { k: 'kv', key: 'Statement balance', v: gbp(so.balance) } as PagePart, p(`Due ${dayLabel(so.due)} · minimum £${so.minimum}. Every line is in October's budget.`)]
      : [sec('Spending, all in October\'s budget', ''), ...lines.filter((l) => l.spend).map(line), { k: 'kv', key: 'Spending adds up to', v: gbp(spendT) } as PagePart, sec('Recognised, not spending', ''), ...lines.filter((l) => !l.spend).map(line)]),
  ]);
  const fedC = card('Changes this file fed', `${fed.length}`, fed.length ? fed.map((r) => { const { what, rest } = parts(r); return row({ icon: iconOf(r), name: `${dayLabel(r.at)} ${hhmm(r.at)} · ${what}`, sub: rest, act: nav('audit'), chev: true }); }) : [p('Nothing yet.')]);
  return { title: f.name, sub: `${kindT(f)} · ${size(f.bytes)} · ${c.dayLabel} · illustrative figures`, crumb: back, colsCls: 'two', cols: c.compact ? [[summary, fedC, body]] : [[body], [summary, fedC]] };
}

const KIND_T: Record<string, string> = { cash: 'Cash', savings_account: 'Savings', fixed_deposit: 'Fixed deposits', fixed_saver: 'Fixed deposits', mutual_fund: 'Funds', oeic: 'Funds', etf: 'Funds', share: 'Shares', property: 'Property', workplace_pension: 'Pensions', sipp: 'Pensions', ppf: 'Pensions', endowment: 'Pensions', commodity_etc: 'Other' };
const SNAP: [string, string, string][] = [['e-monzo-register', 'totals_after_new_record', 'Savings added'], ['e-home-correction', 'totals_after_correction', 'Home corrected'], ['e-statements', 'totals_after_statement_sun_1_nov', "Statements saved"], ['e-emi-paid', 'totals_after_hdfc_emi_thu_5_nov', 'HDFC EMI paid']];
/** October's spending by category, from the two statements' lines. */
export function octoberByCategory(): [string, number][] {
  const m = new Map<string, number>();
  for (const l of [...h.statements_oct.barclaycard_nov.lines, ...h.statements_oct.monzo_current_oct.spend_lines]) m.set(l.category, (m.get(l.category) ?? 0) + l.amount_gbp);
  return [...m].sort((a, b) => b[1] - a[1]);
}
function reportsPage(s: DemoState, c: PageCtx): PageSpec {
  const T = c.T;
  const byType = new Map<string, number>();
  for (const a of s.assets) byType.set(KIND_T[a.kind] ?? 'Other', (byType.get(KIND_T[a.kind] ?? 'Other') ?? 0) + toGbp(a.value, a.ccy));
  const types = [...byType].sort((a, b) => b[1] - a[1]);
  const comp = card('What we own, by type', `${gbp(T.own_gbp)} in all`, [...types.map(([k, v]) => bar(k, gbp(v), pct(v, T.own_gbp), `${pct(v, T.own_gbp)} of what we own`)), p('Property is counted at the household estimate; funds and shares at the Fri 23 Oct close.')]);
  const debts = [...s.debts].filter((d) => d.balance > 0).sort((a, b) => toGbp(b.balance, b.ccy) - toGbp(a.balance, a.ccy));
  const owed = card('What we owe, by lender', `${gbp(T.owe_gbp)} in all`, debts.map((d) => bar(d.name, d.ccy === 'INR' ? inr(d.balance) : gbp(d.balance), pct(toGbp(d.balance, d.ccy), T.owe_gbp), `${pct(toGbp(d.balance, d.ccy), T.owe_gbp)} of what we owe`, 'f-grey')));
  const closed = s.applied.includes('e-statements');
  const cats = octoberByCategory();
  const catTotal = cats.reduce((t, x) => t + x[1], 0);
  const month = card('October, summarised', closed ? `${gbp(catTotal)} spent` : 'still open', closed
    ? [...cats.slice(0, 6).map(([k, v]) => bar(k, gbp(v), pct(v, catTotal), `${pct(v, catTotal)} of the month's spending`)), p(`${cats.length - 6} more categories, ${gbp(cats.slice(6).reduce((t, x) => t + x[1], 0))} in all. From the Barclaycard and Monzo statements, ${s.applied.includes('e-month-close') ? 'October closed on Sun 1 Nov' : 'saved on Sun 1 Nov'}.`)]
    : [p("October's statements arrive on Sun 1 Nov; its summary is built from them. Nothing to report yet.")]);
  const snaps = SNAP.filter(([id]) => s.applied.includes(id));
  const nw = card('Net worth, event by event', `${gbp(T.net_gbp)} now`, [
    row({ icon: 'flag', name: 'Start of the demo', sub: 'Mon 26 Oct', v: gbp(h.totals_before_new_record.net_gbp) }),
    ...snaps.map(([id, key, what]) => { const r = s.audit.find((x) => x.id === id)!; return row({ icon: iconOf(r), name: what, sub: `${dayLabel(r.at)} ${hhmm(r.at)}`, v: gbp(h[key].net_gbp), act: nav('audit'), chev: true }); }),
  ]);
  const NOT = { type: 'nope', t: 'Exports come with phase 9 (MA-18); not in this demo' };
  const exp = card('Exports', 'read-only downloads', [
    row({ icon: 'download', name: 'Net worth and holdings', sub: 'CSV · every record, in its own currency', act: NOT, chev: true }),
    row({ icon: 'download', name: 'The audit log', sub: 'CSV · every row, with its run and file', act: NOT, chev: true }),
    row({ icon: 'picture_as_pdf', name: 'October, summarised', sub: 'PDF · one page', act: NOT, chev: true }),
    p('Exports are read-only links; nothing posts, and nothing changes a record.'),
  ]);
  return { title: 'Reports', sub: `The household as it stands · ${c.dayLabel} · illustrative figures`, crumb: { t: 'Audit', act: nav('audit') }, colsCls: 'two', cols: c.compact ? [[nw, month, comp, owed, exp]] : [[comp, owed, month], [nw, exp]] };
}

const pg = (id: string, title: string, icon: string, build: PageDef['build'], extra: Partial<PageDef['meta']> = {}): PageDef => ({ meta: { id, title, icon, area: 'audit', ...extra }, build });
register({
  id: 'audit',
  pages: [
    pg('audit', 'Audit', 'history', auditPage, { side: 7, ask: 'Ask about what changed, or who changed it' }),
    pg('files', 'Files', 'folder', filesPage, { parent: 'audit' }),
    pg('file', 'File', 'description', filePage, { parent: 'files' }),
    pg('reports', 'Reports', 'summarize', reportsPage, { parent: 'audit' }),
  ],
  reduce: (s, a) => {
    const cur = st(s);
    if (a.name === 'filter') s.area.audit = { who: a.who ?? cur.who, cat: a.cat ?? cur.cat };
  },
});
