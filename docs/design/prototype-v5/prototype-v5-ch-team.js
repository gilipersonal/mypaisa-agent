/* MyPaisa · Prototype v5 (MA-291): phases 13, 14 and 15, drawn by the Team builder.
   13 · the agent team: six agents, the admin desk in the owner's chat and the Admin center, a request on evidence,
        self-healing and an incident, the budgets, each agent's notes (ARCHITECTURE §20, §10.8, §24.4).
   14 · India: Asha's CAS imported by Arun, an admin (a dry run, one summary card, Confirm with the second check),
        the Indian accounts in rupees with pounds beside, each account described, and the tax flag (§22).
   15 · beyond the chat: the widget, a factsheet shared from Files, Siri, the Shortcut, a Live Activity.
   Every figure comes from MP5D.teamIndia (figures/team-india-v5.json, written and checked by make_team_india.py)
   and the household's ledger as of each step's time. None of these screens is picked yet: each is a draft.
   MA-307, 2 Nov 2026: the market side was retired; MyPaisa is a wealth tracker only. */
(function () {
  'use strict';
  var M = window.MP5, K = window.MP5K;
  if (!M || !K) return;

  /* ---------- this builder's own styles: every selector .pv5-team…, every colour a token ---------- */
  var CSS = [
    '.pv5-team-dl { display: flex; flex-direction: column; gap: 10px; }',
    '.pv5-team-dl > div { display: flex; flex-direction: column; gap: 2px; }',
    '.pv5-team-dl dt, .pv5-team-k { font: 600 12px/16px var(--mp-font); color: var(--mp-ink-2); text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }',
    '.pv5-team-dl dd { margin: 0; font: 400 15px/21px var(--mp-font); color: var(--mp-ink); text-wrap: pretty; }',
    '.pv5-team-tbl { display: flex; flex-direction: column; font: 400 14px/19px var(--mp-font); }',
    '.pv5-team-tbl > div { display: grid; grid-template-columns: var(--pv5-team-cols); gap: 10px; padding: 8px 0; box-shadow: inset 0 -1px 0 var(--mp-line); align-items: baseline; }',
    '.pv5-team-tbl > div:first-child { font: 600 12px/16px var(--mp-font); color: var(--mp-ink-2); text-transform: uppercase; letter-spacing: 0.04em; }',
    '.pv5-team-tbl > div.pv5-team-tot { font-weight: 700; box-shadow: none; }',
    '.pv5-team-tbl .pv5-team-n { text-align: right; font-variant-numeric: tabular-nums; }',
    '.pv5-team-key { font: 500 12px/16px ui-monospace, "SF Mono", Menlo, monospace; color: var(--mp-ink-2); overflow-wrap: anywhere; }',
    '.pv5-team-ok { color: var(--mp-up); font-weight: 600; }',
    '.pv5-team-no { color: var(--mp-ink-2); font-weight: 600; }',
    '.pv5-team-checks { display: flex; flex-direction: column; gap: 6px; }',
    '.pv5-team-checks > div { display: flex; gap: 8px; align-items: flex-start; font: 400 14px/19px var(--mp-font); }',
    '.pv5-team-checks .ms { font-size: 18px; color: var(--mp-up); margin-top: 1px; }',
    '.pv5-team-sec { font: 600 13px/18px var(--mp-font); color: var(--mp-ink-2); text-transform: uppercase; letter-spacing: 0.05em; margin: 6px 0 0; }',
    '.pv5-team-split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }',
    '.pv5-team-wrapchip { white-space: normal !important; max-width: 100%; text-wrap: pretty; }',
    '.pv5-team-agent { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 4px 12px; padding: 12px 0; align-items: start; }',
    '.pv5-team-agent + .pv5-team-agent { box-shadow: inset 0 1px 0 var(--mp-line); }',
    '.pv5-team-agent .pv5-team-meta { grid-column: 2 / 4; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 14px; margin-top: 4px; }',
    '.pv5-team-agent .pv5-team-meta > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }',
    '.pv5-team-agent .pv5-team-meta span:last-child { font: 400 13px/18px var(--mp-font); color: var(--mp-ink); overflow-wrap: anywhere; }',
    '.pv5-team-alertt { color: var(--mp-alert) !important; font-weight: 600; }',
    '.pv5-team-tile { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--mp-surface-2); color: var(--mp-ink-2); }',
    '.pv5-team-tile .ms { font-size: 20px; }',
    '.pv5-team-set { display: flex; flex-direction: column; gap: 3px; padding: 10px 0; width: 100%; border: 0; background: transparent; text-align: left; color: inherit; font: inherit; cursor: pointer; min-height: 44px; }',
    '.pv5-team-set + .pv5-team-set { box-shadow: inset 0 1px 0 var(--mp-line); }',
    '.pv5-team-set.on { background: var(--mp-surface-2); border-radius: 10px; padding-left: 10px; padding-right: 10px; box-sizing: border-box; }',
    '.pv5-team-set .pv5-team-r1 { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }',
    '.pv5-team-set .pv5-team-r1 > :last-child { font-weight: 600; text-align: right; }',
    '.pv5-team-hist { display: flex; flex-direction: column; }',
    '.pv5-team-hist > div { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 10px; padding: 10px 0; box-shadow: inset 0 -1px 0 var(--mp-line); align-items: start; }',
    '.pv5-team-hist > div > .mp-chip { justify-self: start; }',
    '.pv5-team-note { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; }',
    '.pv5-team-note + .pv5-team-note { box-shadow: inset 0 1px 0 var(--mp-line); }',
    '.pv5-team-sheet { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 460px; margin: 0 auto; }',
    '.pv5-team-sheet .faceid { margin: 4px auto; }',
    '.pv5-team-sheet .pv5-team-btns { display: flex; flex-direction: column; gap: 8px; }',
    '.pv5-team-sheet .pv5-team-btns .mp-btn { width: 100%; justify-content: center; }',
    '.pv5-team-pw { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 14px; border-radius: 14px; background: var(--mp-surface); box-shadow: 0 0 0 1px var(--mp-line); font: 600 17px/22px var(--mp-font); letter-spacing: 0.2em; }',
    '.pv5-team-file { overflow-wrap: anywhere; }',
    '.pv5-team-file .ms { font-size: 18px; vertical-align: -4px; margin-right: 4px; }',
    /* the system surfaces of phase 15: the Lock Screen, the Home Screen, Siri, the share sheet */
    '.pv5-team-wall { position: absolute; inset: 0; z-index: 21; }',
    '.pv5-team-scr { position: absolute; inset: 0; z-index: 22; display: flex; flex-direction: column; color: var(--mp-hero-ink); font-family: var(--mp-font); }',
    '.pv5-team-ink { color: var(--mp-ink); }',
    '.pv5-team-sb { flex: none; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 34px 0 44px; font: 600 17px/22px var(--mp-font); }',
    '.pv5-team-sb .ms { font-size: 18px; }',
    '.pv5-team-big .pv5-team-sb { height: 32px; padding: 0 24px; font-size: 14px; }',
    '.pv5-team-homebar { position: absolute; bottom: 8px; left: 50%; width: 140px; height: 5px; margin-left: -70px; border-radius: 3px; background: var(--mp-hero-ink); z-index: 41; }',
    '.pv5-team-ink .pv5-team-homebar, .pv5-team-homebar.pv5-team-dk { background: var(--mp-ink); }',
    '.pv5-team-mark { width: 13px; height: 13px; border-radius: 50%; background: var(--mp-coral); box-shadow: 0 0 0 3px var(--mp-hero), 0 0 0 4.5px var(--mp-coral); display: inline-block; flex: none; margin: 4px; }',
    '.pv5-team-wg { border-radius: 22px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; color: var(--lg-ink); text-align: left; border: 0; cursor: pointer; font: inherit; }',
    '.wf .pv5-team-wg { background: var(--mp-surface-2); color: var(--mp-ink); box-shadow: inset 0 0 0 1px var(--mp-line); }',
    '.pv5-team-wg > * { position: relative; z-index: 1; }',
    '.pv5-team-wg-h { display: flex; align-items: center; gap: 6px; font: 600 13px/18px var(--mp-font); color: var(--mp-ink-2); }',
    '.pv5-team-wg-v { font: 800 30px/34px var(--mp-font-round); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }',
    '.pv5-team-wg-hid { font: 700 22px/28px var(--mp-font-round); color: var(--mp-ink-2); display: flex; align-items: center; gap: 8px; }',
    '.pv5-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 20px 4px; }',
    '.pv5-team-hrow { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }',
    '.pv5-team-hrow > .pv5-team-grid { flex: 1 1 320px; min-width: 0; }',
    '.pv5-team-lk .lock-time { margin-top: 12px; line-height: 1.04; }',
    '.pv5-team-app { display: flex; flex-direction: column; align-items: center; gap: 6px; font: 500 12px/14px var(--mp-font); color: var(--mp-hero-ink); border: 0; background: transparent; padding: 0; cursor: pointer; min-width: 0; }',
    '.pv5-team-ink .pv5-team-app { color: var(--mp-ink); }',
    '.pv5-team-ico { width: 60px; height: 60px; border-radius: 15px; display: grid; place-items: center; background: var(--mp-surface); color: var(--mp-ink-2); box-shadow: var(--mp-shadow); }',
    '.pv5-team-ico .ms { font-size: 30px; }',
    '.pv5-team-ico.pv5-team-mp { background: var(--mp-hero); box-shadow: 0 0 0 1px var(--mp-hero-2), var(--mp-shadow); }',
    '.pv5-team-ico.pv5-team-mp .pv5-team-mark { width: 20px; height: 20px; box-shadow: 0 0 0 5px var(--mp-hero), 0 0 0 7.5px var(--mp-coral); }',
    '.pv5-team-dock { border-radius: 34px; padding: 14px 16px; display: flex; justify-content: space-around; }',
    '.pv5-team-dock > * { position: relative; z-index: 1; }',
    '.pv5-team-lk { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: 4px; }',
    '.pv5-team-lk > .ms { font-size: 20px; }',
    '.pv5-team-lkb { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; }',
    '.pv5-team-lkb .ms { font-size: 22px; position: relative; z-index: 1; }',
    '.pv5-team-la { border-radius: 24px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; color: var(--lg-ink); }',
    '.pv5-team-la > * { position: relative; z-index: 1; }',
    '.pv5-team-steps { display: flex; gap: 4px; }',
    '.pv5-team-steps i { flex: 1; height: 6px; border-radius: 3px; background: var(--mp-track); display: block; }',
    '.pv5-team-steps i.on { background: var(--mp-accent); }',
    '.pv5-team-di { width: 184px !important; margin-left: -92px !important; z-index: 31 !important; display: flex; align-items: center; justify-content: space-between; padding: 0 12px 0 10px; box-sizing: border-box; color: var(--mp-hero-ink); font: 600 14px/18px var(--mp-font); }',
    '.pv5-team-dim { position: absolute; inset: 0; z-index: 23; background: var(--mp-hero); opacity: 0.9; -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }',
    '.pv5-team-glow { position: absolute; inset: 0; z-index: 25; pointer-events: none; box-shadow: inset 0 0 0 3px var(--mp-coral), inset 0 0 26px 8px var(--mp-reb), inset 0 0 70px 14px var(--mp-hold); opacity: 0.8; }',
    '.pv5-team-siri { position: absolute; z-index: 24; left: 12px; right: 12px; top: 64px; display: flex; flex-direction: column; gap: 10px; }',
    '.pv5-team-big .pv5-team-siri { left: auto; right: auto; width: 440px; align-self: center; position: relative; top: 0; margin: 60px auto 0; }',
    '.pv5-team-said { font: 600 20px/26px var(--mp-font); color: var(--mp-hero-ink); padding: 0 6px; text-wrap: pretty; }',
    '.pv5-team-card { border-radius: 26px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; color: var(--lg-ink); }',
    '.pv5-team-card > * { position: relative; z-index: 1; }',
    '.pv5-team-files { position: absolute; inset: 0; z-index: 21; background: var(--mp-bg); color: var(--mp-ink); }',
    '.pv5-team-scr .pv5-team-share { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 24; border-radius: 36px; padding: 16px 16px 28px; display: flex; flex-direction: column; gap: 14px; color: var(--lg-ink); }',
    '.pv5-team-share > * { position: relative; z-index: 1; }',
    '.pv5-team-big .pv5-team-scr .pv5-team-share { left: auto; right: 40px; top: 96px; bottom: auto; width: 400px; border-radius: 26px; }',
    '.pv5-team-apps { display: flex; gap: 10px; justify-content: space-between; }',
    '.pv5-team-apps .pv5-team-app { color: var(--lg-ink); width: 64px; }',
    '.pv5-team-apps .pv5-team-ico { width: 56px; height: 56px; border-radius: 14px; }',
    '.pv5-team-acts { display: flex; flex-direction: column; border-radius: 16px; background: var(--mp-surface); overflow: hidden; }',
    '.pv5-team-acts > div { display: flex; justify-content: space-between; align-items: center; min-height: 46px; padding: 0 16px; font: 400 16px/21px var(--mp-font); color: var(--mp-ink); }',
    '.pv5-team-acts > div + div { box-shadow: inset 0 1px 0 var(--mp-line); }',
    '.pv5-team-frow { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: center; padding: 12px 0; box-shadow: inset 0 -1px 0 var(--mp-line); }',
    '.pv5-team-pdf { width: 40px; height: 48px; border-radius: 6px; display: grid; place-items: center; background: var(--mp-alert-bg); color: var(--mp-alert); }',
    '.pv5-team-sysweb { display: flex; flex-direction: column; gap: 10px; }'
  ].join('\n');
  function addCss() {
    if (document.getElementById('pv5-team')) return;
    var s = document.createElement('style');
    s.id = 'pv5-team';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  addCss();

  /* ---------- the figures and the clock ---------- */
  function D() { return (window.MP5D && window.MP5D.teamIndia) || null; }
  function HH() { return (window.MP5D && window.MP5D.household) || {}; }
  var DAY = '2026-10-26';
  function T(hhmm) { return DAY + 'T' + hhmm; }
  var WDN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* '2026-10-26T06:10' → 'Mon 26 Oct'; a date from Jan to Sep 2026 keeps its year (the boards read a bare one as 2027) */
  function wd(iso) {
    var p = iso.slice(0, 10).split('-'), y = +p[0], m = +p[1], d = +p[2];
    var day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return WDN[day] + ' ' + d + ' ' + MON[m - 1] + (y === 2026 && m >= 10 ? '' : ' ' + y);
  }
  function hm(iso) { return iso.slice(11, 16); }
  function when(iso, now) { return iso.slice(0, 10) === now.slice(0, 10) ? hm(iso) : wd(iso) + ', ' + hm(iso); }
  function mins(iso) { return (+iso.slice(11, 13)) * 60 + (+iso.slice(14, 16)); }
  function clock(m) { m = Math.max(0, m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  /* data text: escaped, with every £, $ and ₹ amount inside a privacy mask */
  function mz(s) { return K.esc(s).replace(/'/g, '’').replace(/([£$₹€])(\d[\d,]*(?:\.\d+)?)/g, function (_, c, n) { return K.mny(c + n); }); }
  function usd2(n) { return K.usd(n, { dp: 2 }); }
  function fxLine() { return K.gbp(1) + ' = ' + K.mny('₹112.50'); }
  function draftNote() { return K.note('edit_note', 'Draft, not picked: drawn straight into the prototype in the v4 design; Arun’s pick comes through MA-279.'); }
  function sec(t) { return '<p class="pv5-team-sec">' + t + '</p>'; }
  function dl(rows) { return '<dl class="pv5-team-dl" style="margin:0">' + rows.filter(Boolean).map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>'; }
  function tbl(cols, head, rows, tot) {
    var num = function (c) { return /^[−+\d$£₹]|^<span class="mny\b/.test(String(c)); };
    var numCol = (rows[0] || []).map(function (c, i) { return i > 0 && num(c); });
    var row = function (r, cls) { return '<div' + (cls ? ' class="' + cls + '"' : '') + '>' + r.map(function (c, i) { return '<span' + (numCol[i] ? ' class="pv5-team-n"' : '') + '>' + c + '</span>'; }).join('') + '</div>'; };
    return '<div class="pv5-team-tbl" style="--pv5-team-cols:' + cols + '">' + row(head) + rows.map(function (r) { return row(r); }).join('') + (tot ? row(tot, 'pv5-team-tot') : '') + '</div>';
  }
  function checks(list) { return '<div class="pv5-team-checks">' + list.map(function (c) { return '<div>' + K.ms('check_circle') + '<span>' + c + '</span></div>'; }).join('') + '</div>'; }
  function tile(icon) { return '<span class="pv5-team-tile">' + K.ms(icon) + '</span>'; }
  function file(name, size) { return '<span class="pv5-team-file">' + K.ms('picture_as_pdf') + K.esc(name) + (size ? ' · ' + K.esc(size) : '') + '</span>'; }
  /* the second check (§4.5, MA-76): a fresh Sign in with Apple or passkey under Face ID in the app; a passkey or a
     fresh sign-in in a browser; bound to the action, checked by the server, an audit row */
  function how(ctx) { return ctx.app ? 'with Face ID' : 'with your passkey'; }
  function checkSheet(ctx, what, cancelKey) {
    var app = ctx.app;
    return '<div class="pv5-team-sheet">' +
      '<div class="sheet-h"><span class="mp-hl">Confirm it’s you</span>' + K.draft() + '</div>' +
      '<div class="faceid">' + K.ms(app ? 'familiar_face_and_zone' : 'passkey') + '</div>' +
      K.p(what) +
      '<div class="pv5-team-btns">' + K.btn(app ? 'Continue with Face ID' : 'Use your passkey', 'check:ok', 'primary', app ? 'familiar_face_and_zone' : 'passkey') +
      K.btn(app ? 'Sign in with Apple instead' : 'Sign in again instead', 'check:alt', 'tinted') + K.btn('Cancel', cancelKey || 'check:cancel', 'plain') + '</div>' +
      K.foot('A fresh check, bound to this one action and verified by the server. It writes an audit row; reading needs none.') + '</div>';
  }

  /* ---------- the agent team as of a time ---------- */
  function teamT(ctx) {
    var d = D();
    if (ctx.t.slice(0, 10) > DAY) return { t: d.team.drawn.to, late: true };
    return { t: ctx.t, late: false };
  }
  function lateNote(tt) { return tt.late ? K.note('schedule', 'The agent team is drawn for the morning of Mon 26 Oct, 06:10 to 08:31. This step is later, so the page shows that morning as it ended.') : ''; }
  function agentAt(a, t) {
    var d = D(), inc = d.team.incident, last = null;
    a.runs.forEach(function (r) { if (r[0] <= t) last = r; });
    var m = mins(t), sameDay = t.slice(0, 10) === DAY;
    var silent = !!(a.silent && sameDay && t >= a.silent[0] && t < a.silent[1]);
    var hbm = m - ((((m - a.hb) % 5) + 5) % 5);
    if (a.silent && sameDay && t >= a.silent[1]) hbm = Math.max(hbm, mins(a.silent[1]));
    if (last && last[0].slice(0, 10) === t.slice(0, 10) && mins(last[0]) > hbm && mins(last[0]) <= m) hbm = mins(last[0]);
    var hb = silent ? hm(a.silent[0]) : clock(hbm), ago = silent ? m - mins(a.silent[0]) : m - hbm;
    var agoT = silent ? (Math.floor(ago / 60) ? Math.floor(ago / 60) + ' h ' : '') + (ago % 60) + ' min silent' : ago === 0 ? 'now' : ago + ' min ago';
    var st = silent ? (t >= inc.opened ? ['Incident', 'mp-alertchip', 'error'] : ['Silent', 'mp-pause', 'hourglass_top'])
      : (a.asking_from && sameDay && t >= a.asking_from ? ['Asking you', 'mp-pause', 'how_to_reg'] : ['Running', 'mp-add', 'check_circle']);
    return { hb: hb, ago: agoT, silent: silent, last: last, st: st };
  }
  function shareOf(key) { var s = null; D().team.budget.shares.forEach(function (x) { if (x.key === key) s = x; }); return s; }
  function spendOf(a) {
    if (a.code_only) return 'No Claude · code only';
    var s = shareOf(a.share);
    if (a.id === 'warden') return 'In the steward’s share';
    return usd2(s.spent) + ' of ' + K.usd(s.usd) + (a.share === 'steward_warden' ? ', with the ops warden' : '');
  }
  function reqById(id) { var r = null; D().team.requests.forEach(function (x) { if (x.id === id) r = x; }); return r; }
  function reqState(r, t) {
    if (t < r.asked) return null;
    if (r.approved_at && t >= r.approved_at) return 'approved';
    if (r.later_at && t > r.later_at) return 'later';
    return 'waiting';
  }
  function shortChip(st) { return st === 'approved' ? K.chip('Approved', 'mp-add') : st === 'later' ? K.chip('Later', 'mp-neutral') : K.chip('Waiting', 'mp-pause'); }
  function stateChip(r, st, t) {
    if (st === 'approved') return K.chip(K.ms('check_circle') + 'Approved ' + hm(r.approved_at), 'mp-add');
    if (st === 'later') return K.chip(K.ms('schedule') + 'Later · tonight’s digest', 'mp-neutral');
    return K.chip(K.ms('hourglass_top') + 'Waiting · until ' + r.expires_label, 'mp-pause pv5-team-wrapchip');
  }
  function reqTitle(r) { return mz(r.title).replace('{gbp}', K.gbp(r.money, { dp: 2 })); }
  function incOpen(t) { var i = D().team.incident; return t.slice(0, 10) === DAY && t >= i.opened && t < i.closed; }
  function settingValue(s, t) { return s.value; }

  /* ---------- the request, in full and as a chat card ---------- */
  function evidence(r, ctx, full) {
    if (r.id !== 'cr-25') return '';
    return dl([['Why', r.why.map(mz).join(' ')], ['Cost', K.gbp(r.money, { dp: 2 }) + ' a month, counted in the AWS and others cap: ' + K.gbp(r.aws.used_gbp, { dp: 2 }) + ' of ' + K.gbp(r.aws.cap_gbp) + ' used this month, ' + K.gbp(r.aws.forecast_gbp, { dp: 2 }) + ' forecast. With it, about ' + K.gbp(r.aws_with, { dp: 2 }) + ' a month, ' + K.gbp(r.aws.cap_gbp - r.aws_with, { dp: 2 }) + ' under the cap.']]);
  }
  function reqDetail(ctx, r, t) {
    var st = reqState(r, t), d = D();
    var acts = st === 'waiting'
      ? '<div class="fx g8 wrap">' + K.btn('Approve', 'req:approve:' + r.id, 'primary', 'check') + K.btn('Reject', 'req:reject:' + r.id, 'tinted') + K.btn('Why?', 'req:why:' + r.id, 'plain') + K.btn('Later', 'req:later:' + r.id, 'plain') + '</div>' +
        K.foot('Approve needs the second check. Why? opens the agent’s reasons in plain words, with the evidence behind them.')
      : st === 'later' ? K.note('schedule', 'Later, at ' + hm(r.later_at) + ': it comes back in tonight’s 19:00 digest and waits here until ' + r.expires_label + '. Unanswered by then, nothing changes.')
        : K.note('check_circle', 'Approved at ' + hm(r.approved_at) + ' by You, ' + how(ctx) + '. The old value stays ready; the audit row names the setting and both versions.');
    return K.card({ id: 'req-' + r.id, body: '<div class="fx col g12">' +
      '<div class="fx ac jb wrap g8"><span class="fx ac g6 mp-sub" style="font-weight:600">' + tile(r.icon) + K.esc(r.who) + ' asks' + (r['for'] ? ', for ' + mz(r['for']) : '') + '</span>' + stateChip(r, st, t) + '</div>' +
      '<span class="mp-t3">' + reqTitle(r) + '</span><span class="mp-foot mp-ink2">Asked ' + when(r.asked, t) + ' · request ' + r.id + '</span>' +
      dl([['What changes', mz(r.what)], r.id !== 'cr-25' ? ['Why', r.why.map(mz).join(' ')] : null]) + evidence(r, ctx, true) +
      dl([r.id !== 'cr-25' ? ['Cost', mz(r.cost)] : null, ['Risk', mz(r.risk)], ['Undo', mz(r.undo)], ['Expires', r.expires_label + '. Unanswered by then, nothing changes.']]) + acts + '</div>' });
  }
  function reqCard(ctx, r, t) {
    var st = reqState(r, t), open = ctx.has('why-' + r.id);
    var body = '';
    if (r.id === 'cr-25') body = K.p(r.why.map(mz).join(' ')) + K.kv('AWS and others', K.gbp(r.aws.used_gbp, { dp: 2 }) + ' of ' + K.gbp(r.aws.cap_gbp)) + K.kv('Undo', mz(r.undo)) + K.kv('Expires', r.expires_label);
    else body = K.p(r.why.map(mz).join(' ')) + K.kv('Undo', mz(r.undo));
    var acts = st === 'waiting' ? [K.cbtn('Approve', 'req:approve:' + r.id, 'primary'), K.cbtn('Reject', 'req:reject:' + r.id, 'ghost'), K.cbtn('Why?', 'fold:why-' + r.id, 'ghost'), K.cbtn('Later', 'req:later:' + r.id, 'ghost')] : [];
    if (st === 'later') body += K.note('schedule', 'Later: back in tonight’s 19:00 digest.');
    if (st === 'approved') body += K.note('check_circle', 'Approved at ' + hm(r.approved_at) + ' by You, ' + how(ctx) + '.');
    if (open && r.id === 'cr-25') body += K.foot('The data steward has failed over within the free chain three days running. A paid source is never switched on without you; the free ones stay behind it.');
    return K.ccard({ id: 'card-' + r.id, chip: K.chip(K.ms(r.icon) + K.esc(r.who) + ' asks', 'mp-neutral') + K.draft(), h: reqTitle(r), sub: 'Request ' + r.id + ' · ' + when(r.asked, t) + (r['for'] ? ' · for ' + mz(r['for']) : ''), body: body, acts: acts });
  }

  /* ---------- the Agent team pages (owner only): team, team/approvals, team/settings, team/agents, team/incidents, team/notes ---------- */
  var TABS = [['', 'Overview'], ['approvals', 'Approvals'], ['settings', 'Settings'], ['agents', 'Agents'], ['incidents', 'Incidents'], ['notes', 'Notes']];
  function teamTabs(on) { return TABS.map(function (x) { return { t: x[1], go: 'nav:team' + (x[0] ? '/' + x[0] : ''), on: x[0] === on }; }); }
  function teamPage(ctx, args) {
    var d = D();
    if (!d) return { title: 'Agent team', body: K.card({ body: K.note('hourglass_top', 'The team’s figures are not loaded.') }) };
    var tab = args[0] || '', tt = teamT(ctx), t = tt.t;
    if (!ctx.isAdmin) return { title: 'Agent team', sub: 'Admin center', chip: K.draft(), body: K.card({ body: K.note('admin_panel_settings', 'The Agent team is for admins: Asha, a member who views only, never sees the desk, its requests or its settings.') }) };
    var p = { title: 'Agent team', sub: 'Admin center · admins only · ' + wd(t) + ', ' + hm(t), chip: K.draft(), tabs: teamTabs(tab) };
    var body = lateNote(tt);
    if (tab === '') body += overview(ctx, t);
    else if (tab === 'approvals') body += approvals(ctx, t, args[1]);
    else if (tab === 'settings') body += settingsPage(ctx, t, args[1]);
    else if (tab === 'agents') body += agentsPage(ctx, t);
    else if (tab === 'incidents') body += incidentsPage(ctx, t);
    else if (tab === 'notes') body += notesPage(ctx, t);
    p.body = '<div class="fx col g16">' + body + K.foot('Code decides, Claude explains: every figure here comes from the meter, the heartbeats or the settings store. Outside its band, an agent asks.') + '</div>';
    return p;
  }
  M.page('team', teamPage);

  function waitingRows(t) {
    var d = D(), rows = [];
    d.team.requests.forEach(function (r) {
      var st = reqState(r, t);
      if (st === 'waiting' || st === 'later') rows.push(K.row({ lead: tile(r.icon), t: reqTitle(r), s: K.esc(r.who) + ' · ' + r.id + ' · ' + (st === 'later' ? 'Later, in tonight’s digest' : 'asked ' + when(r.asked, t)), go: 'nav:team/approvals/' + r.id }));
    });
    return rows;
  }
  function overview(ctx, t) {
    var d = D(), b = d.team.budget, h = '';
    var wait = waitingRows(t), inc = incOpen(t);
    h += K.card({ t: 'Waiting for you', r: K.chip(String(wait.length + (inc ? 1 : 0)), wait.length || inc ? 'mp-pause' : 'mp-neutral'), body: K.list((inc ? [K.row({ lead: tile('error'), t: K.esc(d.team.incident.title), s: d.team.incident.id + ' · opened ' + hm(d.team.incident.opened) + ' by the ops warden', vs: K.chip('Incident', 'mp-alertchip'), go: 'nav:team/incidents' })] : []).concat(wait.length ? wait : [K.row({ icon: 'check_circle', t: 'Nothing waits for you' })])) });
    h += budgetCard(ctx);
    return h;
  }
  function budgetCard(ctx) {
    var b = D().team.budget;
    return K.card({ id: 'budgets', t: 'Budgets · shares of prod’s ' + K.usd(b.prod_usd), r: K.chip(b.used_pct + '% used', 'mp-neutral'),
      body: K.hbars(b.shares.map(function (s, i) { return { t: K.esc(s.label) + ' <span class="mp-ink2">· ' + s.pct + '%</span>', v: s.spent, max: s.usd, r: usd2(s.spent) + ' of ' + K.usd(s.usd), cls: i ? 'b2' : '' }; })) +
        '<div style="margin-top:12px" class="fx col g6">' + K.kv('The shares', b.shares.map(function (s) { return s.pct; }).join(' + ') + ' = ' + b.shares.reduce(function (s, x) { return s + x.pct; }, 0) + '%') +
        K.kv('Prod this cycle', usd2(b.spent_usd) + ' of ' + K.usd(b.prod_usd) + ' · ' + b.step) + K.kv('AWS and others', K.gbp(b.aws.used_gbp, { dp: 2 }) + ' of ' + K.gbp(b.aws.cap_gbp) + ' · ' + b.aws.month) + '</div>' +
        K.foot('Cycle ' + b.cycle + ', to ' + b.to + '; about ' + K.gbp(b.spent_gbp) + ' of ' + K.gbp(b.ceiling_gbp) + ' at ' + K.usd(1.3, { dp: 2 }) + ' to the pound. Past its share an agent drops to its 95% step; the reserve covers the chat first. Shares and ceilings are yours alone.') });
  }
  function approvals(ctx, t, sel) {
    var d = D(), waiting = [], decided = [];
    d.team.requests.forEach(function (r) { var st = reqState(r, t); if (!st) return; (st === 'approved' ? decided : waiting).push(r); });
    var pick = sel ? reqById(sel) : null;
    if (!pick || !reqState(pick, t)) pick = waiting.length ? waiting[waiting.length - 1] : decided[0];
    var rowFor = function (r) { var st = reqState(r, t); return K.row({ id: 'row-' + r.id, lead: tile(r.icon), t: reqTitle(r), s: K.esc(r.who) + ' · ' + r.id + ' · ' + when(r.asked, t), vs: shortChip(st), go: 'nav:team/approvals/' + r.id }); };
    var q = d.team.question;
    var left = K.card({ t: 'Waiting for you', r: K.chip(String(waiting.length + 1), 'mp-pause'), body: K.list(waiting.slice().reverse().map(rowFor).concat([K.row({ lead: tile(q.icon), t: mz(q.t), s: 'Question · ' + K.esc(q.from) + ' · ' + when(q.asked, t) + ' · ' + mz(q.how).toLowerCase() })])) }) +
      K.card({ t: 'Decided, last 7 days', body: K.list(decided.map(function (r) { return K.row({ lead: tile(r.icon), t: reqTitle(r), s: K.esc(r.who) + ' · ' + r.id + ' · approved ' + hm(r.approved_at) + ', You, ' + how(ctx).replace('with ', ''), vs: K.chip('Approved', 'mp-add'), go: 'nav:team/approvals/' + r.id }); })
        .concat(d.team.decided.map(function (x) { return K.row({ lead: tile(x.icon), t: mz(x.t), s: K.esc(x.who) + ' · ' + x.id + ' · ' + x.how + ', ' + wd(x.at) + ' · not again before ' + wd(x.again), vs: K.chip('Rejected', 'mp-neutral') }); }))) +
        K.foot('A rejected request is not asked again for the period its setting names. Deciding here updates your chat, and the chat updates here.') });
    return '<div class="pv5-team-split"><div class="fx col g16">' + left + '</div><div class="fx col g16">' + (pick ? reqDetail(ctx, pick, t) : '') + '</div></div>';
  }
  function settingsPage(ctx, t, sel) {
    var d = D(), S = d.team.settings, key = sel || 'data.chain.oeic', s = null;
    S.rows.forEach(function (x) { if (x.key === key) s = x; });
    if (!s) { s = S.rows[0]; key = s.key; }
    var mode = function (x) { var m = S.modes[x.mode]; return K.chip(K.ms(m[0]) + m[1], 'mp-neutral'); };
    var detail = K.card({ id: 'set-detail', t: K.esc(s.group) + ' · <span class="pv5-team-key" style="text-transform:none">' + K.esc(key) + '</span>', body: '<div class="fx col g12"><span class="mp-t3">' + mz(s.name) + '</span>' +
        dl([['Value now', '<span class="mp-hl">' + mz(settingValue(s, t)) + '</span>'], ['Range', mz(s.range)], ['Automatic band', mz(s.band === 'none' ? 'None: no agent moves it on its own.' : s.band)], ['Approval', mode(s)]]) + '</div>' });
    var groups = [], by = {};
    S.rows.forEach(function (x) { if (!by[x.group]) { by[x.group] = []; groups.push(x.group); } by[x.group].push(x); });
    var list = groups.map(function (g) {
      return K.card({ t: K.esc(g), body: by[g].map(function (x) {
        return '<button type="button" class="pv5-team-set' + (x.key === key ? ' on' : '') + '"' + K.go('nav:team/settings/' + x.key) + '><span class="pv5-team-r1"><span class="mp-sub" style="font-weight:600">' + mz(x.name) + '</span><span class="mp-sub">' + mz(settingValue(x, t)) + '</span></span>' +
          '<span class="pv5-team-key">' + K.esc(x.key) + '</span><span class="mp-foot mp-ink2">Range ' + mz(x.range) + ' · band ' + mz(x.band) + ' · ' + S.modes[x.mode][1] + '</span></button>';
      }).join('') });
    }).join('');
    var head = K.card({ body: '<div class="fx ac jb wrap g8"><span class="mp-hl">Every behaviour, as a setting</span>' + K.chip(S.rows.length + ' settings · ' + S.changed_week_before + ' changed this week', 'mp-neutral') + '</div>' +
      K.foot('Each has a range, an automatic band (how far an agent may move it without asking, often none) and an approval rule. Defaults live in config/defaults.yaml, checked in CI; a setting may name a secret, never hold one.') });
    return '<div class="pv5-team-split"><div class="fx col g16">' + detail + '</div><div class="fx col g16">' + head + list + '</div></div>';
  }
  function agentsPage(ctx, t) {
    var d = D();
    var rows = d.team.agents.map(function (a) {
      var s = agentAt(a, t);
      return '<div class="pv5-team-agent" id="agent-' + a.id + '">' + tile(a.icon) + '<div class="fx col g2"><span class="mp-sub" style="font-weight:600">' + K.esc(a.name) + '</span><span class="mp-foot mp-ink2">' + mz(a.job) + '</span></div>' +
        K.chip(K.ms(s.st[2]) + s.st[0], s.st[1]) +
        '<div class="pv5-team-meta"><div><span class="pv5-team-k">Heartbeat</span><span' + (s.silent ? ' class="pv5-team-alertt"' : '') + '>' + s.hb + ' · ' + s.ago + '</span></div>' +
        '<div><span class="pv5-team-k">Last run</span><span>' + (s.last ? when(s.last[0], t) + ' · ' + mz(s.last[1]) : 'Not yet') + '</span></div>' +
        '<div><span class="pv5-team-k">This cycle</span><span>' + spendOf(a) + '</span></div>' +
        (ctx.compact ? '' : '<div><span class="pv5-team-k">On its own · asks you</span><span>' + mz(a.alone) + ' · ' + mz(a.asks) + '</span></div>') + '</div></div>';
    }).join('');
    var wait = waitingRows(t);
    return K.card({ t: 'The agents · ' + d.team.agents.length, r: K.chip('heartbeat every ' + d.team.heartbeat.every_min + ' min', 'mp-neutral'), body: rows +
      K.foot('Each agent is a Lambda with its own role, tools, model and budget share; they leave work on the event bus and in the table, never calling each other. No agent can trade, read a secret, delete data or change AWS; at most it opens a Jira issue proposing a change. Fifteen minutes without a heartbeat opens an incident.') }) +
      (wait.length ? K.card({ t: 'Waiting for you', body: K.list([K.row({ lead: tile('dataset'), t: 'Open the steward’s request in the chat', s: wait.length + ' waiting in Approvals', go: 'desk:open' })].concat(wait)) }) : '') +
      budgetCard(ctx);
  }
  function incidentsPage(ctx, t) {
    var d = D(), i = d.team.incident, h = '';
    if (incOpen(t)) {
      h += K.card({ id: 'inc', body: '<div class="fx col g12"><div class="fx ac jb wrap g8">' + K.chip(K.ms('error') + i.severity, 'mp-alertchip') + '<span class="mp-foot mp-ink2">' + i.id + ' · opened ' + hm(i.opened) + ' by ' + i.by + ' · ' + K.esc(i.trace) + '</span></div>' +
        '<span class="mp-t2">' + K.esc(i.title) + '</span>' + dl([['What happened', mz(i.happened)]]) +
        sec('What was tried') + tbl('56px minmax(0,1fr)', ['At', 'What'], i.tried.map(function (x) { return [hm(x[0]), mz(x[1])]; })) +
        dl([['Meanwhile', mz(i.meanwhile)]]) + sec('Your choices') +
        i.choices.map(function (c) { return '<div class="fx col g6" style="padding:8px 0;box-shadow:inset 0 -1px 0 var(--mp-line)"><span class="mp-sub" style="font-weight:600">' + mz(c[1]) + '</span><span class="mp-foot mp-ink2">' + mz(c[2]) + '</span><div>' + K.btn(mz(c[3]), 'inc:' + c[0], c[5] === 'alert' ? 'tinted' : c[5], c[4]) + '</div></div>'; }).join('') +
        K.foot('Each choice needs the second check and writes an audit row; the incident card in your chat updates too.') + '</div>' });
    } else {
      var closed = t.slice(0, 10) === DAY && t >= i.closed;
      h += K.card({ id: 'inc', t: 'Open incidents', body: K.note('check_circle', closed ? i.id + ', the data steward, closed at ' + hm(i.closed) + ': you chose Skip the page, ' + how(ctx) + '. It ran again without the page, and its heartbeat is back.' : 'No incident is open.') });
    }
    var fixed = d.team.fixed.filter(function (f) { return f.at <= t; }).slice().reverse();
    h += K.card({ t: 'Fixed on its own', r: K.chip('in tonight’s 19:00 digest', 'mp-neutral'), body: K.list(fixed.map(function (f) { return K.row({ lead: tile(f.icon), t: mz(f.t), s: when(f.at, t) + ' · ' + mz(f.d) }); })) });
    h += K.card({ t: 'What the ops warden may do alone', body: K.p(mz(d.team.warden_may)) + K.foot('A dead-lettered job is replayed at most three times once its cause is healthy; one that fails the same way again becomes an incident with its errors attached. The daily run is one trace, and an incident names it.') });
    return h;
  }
  function notesPage(ctx, t) {
    var d = D(), name = {};
    d.team.agents.forEach(function (a) { name[a.id] = a; });
    var cards = d.team.notes.map(function (n) {
      var a = name[n[0]], ns = n[1].filter(function (x) { return x[0] <= t; });
      if (!ns.length) return '';
      return K.card({ t: K.esc(a.name), body: ns.map(function (x) { return '<div class="pv5-team-note"><span class="mp-sub">' + mz(x[1]) + '</span><span class="mp-foot mp-ink2">' + when(x[0], t) + '</span><div class="fx g8">' + K.btn('Correct', 'note:correct', 'tinted small', 'edit') + K.btn('Clear', 'note:clear', 'plain small') + '</div></div>'; }).join('') });
    }).join('');
    return draftNote() + K.card({ body: K.p('Each agent keeps its own notes on its own work and reads them at the start of a run (MA-289). A note never changes behaviour: that is a setting inside its band, or a request you approve. Correcting or clearing one needs the second check and writes an audit row.') + K.foot('The concierge’s notes are each member’s own, in You; they are not listed here.') }) + cards;
  }

  /* ---------- India (phase 14): india, india/ppfas, india/infosys ---------- */
  function asset(id) { var a = null; (HH().assets || []).forEach(function (x) { if (x.id === id) a = x; }); return a; }
  function debt(id) { var a = null; (HH().debts || []).forEach(function (x) { if (x.id === id) a = x; }); return a; }
  function dlong(iso) { var p = iso.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function owner(a) { return a.owners.map(function (o) { return o[0] === 'arun' ? 'Arun' : 'Asha'; }).join(' and '); }
  function imported(t) { var c = D().india.cas; return t >= c.saved && t.slice(0, 10) >= DAY; }
  function indiaPage(ctx, args) {
    var d = D();
    if (!d) return { title: 'India', body: '' };
    var I = d.india, id = args[0], t = ctx.t;
    if (id) return indiaHolding(ctx, id);
    var hd = debt('hdfc'), owe = ctx.W.hdfcNovPaid ? hd.balance_after_nov_emi : hd.balance, net = I.own_inr - owe;
    var gbpIn = (ctx.W.T.by_country_gbp || {}).IN, total = ctx.W.T.net_gbp;
    var h = K.hero({ k: 'India, the household’s net', v: K.inr(net), s: K.gbp(gbpIn) + ' · ' + K.pct(gbpIn / total * 100, { dp: 0 }) + ' of the household’s ' + K.gbp(total) + ' · ' + fxLine() + ', ECB, Fri 23 Oct' });
    h += K.tiles([{ k: 'Owned in India', v: K.inr(I.own_inr), s: K.gbp(I.own_inr / K.FX) }, { k: 'Owed in India', v: K.inr(owe), s: K.gbp(owe / K.FX) + ' · the HDFC home loan' }]);
    var rowFor = function (aid) {
      var a = asset(aid), tax = I.tax[aid];
      var ic = { share: 'show_chart', mutual_fund: 'pie_chart', ppf: 'lock_clock', property: 'apartment', endowment: 'shield', fixed_deposit: 'account_balance', savings_account: 'savings' }[a.kind] || 'savings';
      var more = a.kind === 'property' ? ' · valued ' + dlong(a.valued) + ', due again' : a.kind === 'endowment' ? ' · surrender value · matures ' + dlong(a.matures) : a.matures ? ' · matures ' + dlong(a.matures) : '';
      return K.row({ id: 'in-' + aid, lead: tile(ic), t: K.esc(a.name),
        s: owner(a) + (a.units ? ' · ' + (a.kind === 'share' ? a.units + ' shares' : K.num(a.units, 3) + ' units') : '') + more + (tax ? ' · ' + K.ms('flag') + 'tax flag' : ''),
        v: K.inr(a.value), vs: K.gbp(a.value / K.FX), go: aid === 'ppfas' || aid === 'infosys' ? 'nav:india/' + aid : null });
    };
    I.accounts.forEach(function (ac) {
      h += K.card({ id: 'acct-' + ac.type, t: K.esc(ac.label) + ' <span class="mp-ink2" style="text-transform:none">· ' + K.esc(ac.mask) + '</span>', r: K.chip(ac.type, 'mp-neutral'), body: K.list(ac.holdings.map(rowFor)) + K.note(ac.type === 'demat' ? 'account_balance' : ac.type === 'mf_folio' ? 'folder_open' : 'info', mz(ac.wrap)) });
    });
    h += K.card({ t: 'Also in India', body: K.list(I.also.map(rowFor).concat([K.row({ lead: tile('home_work'), t: K.esc(hd.name), s: 'Arun · ' + K.pct(hd.rate * 100, { dp: 1 }) + ' · ends Jul 2030', v: K.inr(-owe, { sign: true }), vs: K.gbp(-owe / K.FX, { sign: true }) })])) });
    h += K.note('flag', mz(I.tax_line) + ': the Parag Parikh fund. ' + mz(I.share_text));
    h += K.foot('Rupees first, pounds beside, at the ECB rate for Fri 23 Oct. The household’s total stays in pounds, with the rupee view one tap away on Home. Privacy mode hides rupees as it hides pounds.');
    h += K.fromCode();
    return { title: 'India', sub: 'Indian accounts · NSE’s close and AMFI’s NAVs, Fri 23 Oct', chip: K.draft(), body: '<div class="fx col g16">' + h + '</div>' };
  }
  function indiaHolding(ctx, id) {
    var d = D(), I = d.india, a = asset(id), t = ctx.t;
    if (!a || (id !== 'ppfas' && id !== 'infosys')) return null;
    var ac = null; I.accounts.forEach(function (x) { if (x.holdings.indexOf(id) >= 0) ac = x; });
    var h = K.hero({ k: id === 'ppfas' ? 'Asha’s folio, at Friday’s NAV' : 'Arun’s shares, at NSE’s close', v: K.inr(a.value), s: K.gbp(a.value / K.FX) + ' · ' + (id === 'ppfas' ? 'NAV ₹87.30, AMFI, Fri 23 Oct' : '₹1,480.50 a share, NSE’s close, Fri 23 Oct').replace(/₹([\d,.]+)/, function (_, n) { return K.mny('₹' + n); }) });
    if (I.tax[id]) h += K.card({ id: 'tax', body: '<div class="fx col g8">' + K.chip(K.ms('flag') + mz(I.tax_line), 'mp-pause pv5-team-wrapchip') + K.p(mz(I.tax_text)) + '</div>' });
    else h += K.note('info', mz(I.share_text));
    h += K.card({ t: 'The account', body: K.note(ac.icon, mz(ac.wrap)) });
    var pos;
    if (id === 'ppfas') {
      var c = I.cas.matched[0], im = imported(t);
      pos = dl([['Units', K.num(a.units, 3) + (im ? ', agreeing with the statement' : '')], ['Paid in', K.inr(a.invested) + ' · ' + c.sips + ' SIPs of ' + K.inr(c.sip) + ' on the 10th since ' + c.since], ['XIRR', K.pct(a.xirr * 100, { dp: 1 }) + (im ? ', from the statement’s own transactions' : ', from the SIP as told')]]) +
        K.foot(im ? 'From ' + I.cas.file + ', imported ' + wd(I.cas.saved) + ' ' + hm(I.cas.saved) + ' as ' + I.cas.import_id + '; the file opens from Files. Folio and PAN are not kept in any record.' : 'From the SIP Asha told the chat. Her detailed CAS would bring each transaction with its own NAV and units.');
    } else {
      pos = dl([['Shares', String(a.units)], ['Value', K.inrGbp(a.value)], ['XIRR', 'Not yet: no buys on record. Zerodha’s tradebook, sent to the chat, would add them.']]);
    }
    h += K.card({ t: 'The position', body: pos });
    h += K.fromCode();
    return { title: K.esc(a.name), sub: owner(a) + ' · ' + K.esc(ac.label) + ' · ' + K.esc(ac.mask) + ' · INR', back: { t: 'India', go: 'nav:india' }, chip: K.draft(), body: '<div class="fx col g16">' + h + '</div>' };
  }
  M.page('india', indiaPage);

  /* ---------- phase 15 at the web doors and beside the chat: what the member sees there ---------- */
  function dayMove() { return D().beyond.day_move; }
  function widgetBody(ctx, hidden) {
    var dm = dayMove(), B = D().beyond;
    if (hidden || ctx.priv) return '<span class="pv5-team-wg-h"><span class="pv5-team-mark"></span>MyPaisa</span><span class="pv5-team-wg-hid">' + K.ms('visibility_off') + 'Hidden</span><span class="mp-foot mp-ink2">Privacy mode is on</span>';
    return '<span class="pv5-team-wg-h"><span class="pv5-team-mark"></span>MyPaisa · Household</span><span class="pv5-team-wg-v">' + K.gbp(ctx.W.T.net_gbp) + '</span>' +
      '<span class="mp-sub">' + K.move(dm.gbp, null) + ' on Friday</span><span class="mp-foot mp-ink2">Fri 23 Oct close · updated ' + B.widget.updated + '</span>';
  }
  function beyondPage(ctx, args) {
    var d = D();
    if (!d) return null;
    var B = d.beyond, k = args[0] || 'widget', dm = B.day_move, h = '';
    var webOnly = function (t) { return K.card({ t: 'Here, in the web app', body: K.p(t) }); };
    var app = ctx.app;
    var dev = { ios: 'this iPhone', ipad: 'this iPad', fold: 'this foldable' }[ctx.door] || 'the iPhone and iPad';
    if (k === 'widget' || k === 'lock') {
      h += K.card({ t: k === 'widget' ? 'The widget, on the Home Screen' : 'The widget, on the Lock Screen', body: '<button type="button" class="widget' + (ctx.web ? '' : ' lg') + ' pv5-team-wg"' + K.go('next') + '>' + widgetBody(ctx) + '</button>' +
        K.foot('The household’s total and the day’s move, from the last fetch with its time. With privacy mode on, it shows the mark and Hidden. Friday’s move is mostly ' + mz(dm.most) + '.') });
      h += webOnly(k === 'widget' ? 'No widget in a browser: Home’s first line carries the same figures, and the strip at the top of the chat.' : 'A browser has no Lock Screen of its own. Web Push brings alerts with no amounts; the figures wait inside the app.');
    } else if (k === 'share') {
      h += K.card({ t: 'Share a file into MyPaisa', body: K.p('On the iPhone and iPad, a factsheet or a screenshot shared from Mail, Files or Photos goes to MyPaisa and opens the chat on the reading card.') + K.note('lock', 'The file is kept with your files; nothing from it is saved to a record before Confirm.') });
      h += webOnly('Drop the file on the chat, or tap + beside the composer: the same reading card opens.');
    } else if (k === 'siri') {
      h += K.card({ t: 'Siri and Shortcuts', body: K.list([K.row({ icon: 'mic', t: '“' + B.siri.ask + '”', s: 'Answered with the total and the day’s move, once the iPhone is unlocked; with privacy mode on, it says only to open MyPaisa' }), K.row({ icon: 'bolt', t: B.shortcut.name, s: 'Opens the chat on the guided flow; nothing is written without Confirm in the app' })]) });
      h += webOnly('Ask the same question in the chat; the answer carries the same figures.');
    } else if (k === 'live') {
      h += K.card({ t: 'A Live Activity follows an import', body: K.p('On the Lock Screen and in the Dynamic Island: the file, its steps and its counts, never an amount.') + K.list(B.live.steps.map(function (s, i) { return K.row({ icon: i < B.live.step ? 'check_circle' : 'radio_button_unchecked', t: mz(s) }); })) });
      h += webOnly('The import’s card in the chat shows the same steps as it reads; a Web Push says when it is ready, with no amounts.');
    }
    h += K.foot('Each surface is designed first; privacy mode holds everywhere. On ' + dev + ' these are iOS’s own surfaces.');
    return { title: { widget: 'Widgets', lock: 'The Lock Screen', share: 'The share sheet', siri: 'Siri and Shortcuts', live: 'Live Activities' }[k] || 'Beyond the chat', sub: 'The app beyond the chat · ' + wd(ctx.t) + ', ' + ctx.tm, chip: K.draft(), body: '<div class="fx col g16">' + h + '</div>' };
  }
  M.page('beyond', beyondPage);

  /* ---------- phase 15's system surfaces at the iPhone, iPad and foldable doors ---------- */
  function sysWrap(ctx, inner, o) {
    o = o || {};
    var big = ctx.door !== 'ios';
    return '<div class="pv5-team-sys' + (big ? ' pv5-team-big' : '') + (o.ink ? ' pv5-team-ink' : '') + '">' + (o.files ? '' : '<div class="pv5-team-wall lock"></div>') + inner +
      (ctx.door === 'ios' ? '<div class="pv5-team-homebar' + (o.ink ? ' pv5-team-dk' : '') + '"></div>' : '') + '</div>';
  }
  function sbar(ctx, showTime, ink) {
    return '<div class="pv5-team-sb"' + (ink ? ' style="color:var(--mp-ink)"' : '') + '><span>' + (showTime ? ctx.tm.replace(/^0/, '') : '') + '</span><span class="fx ac g6">' + (ctx.door === 'ios' ? K.ms('signal_cellular_alt') : '') + K.ms('wifi') + K.ms('battery_horiz_075') + '</span></div>';
  }
  var APPS = [['Files', 'folder', 'mp-hold'], ['Calendar', 'calendar_month', 'mp-trim'], ['Shortcuts', 'bolt', 'mp-reb'], ['Notes', 'sticky_note_2', 'mp-pause'], ['Wallet', 'wallet', 'mp-watch'], ['Maps', 'map', 'mp-add'], ['Weather', 'partly_cloudy_day', 'mp-hold'], ['Clock', 'schedule', 'mp-watch'], ['Books', 'menu_book', 'mp-pause'], ['Camera', 'photo_camera', 'mp-watch']];
  var DOCK = [['Messages', 'sms', 'mp-add'], ['Mail', 'mail', 'mp-hold'], ['Photos', 'photo_library', 'mp-reb'], ['Settings', 'settings', 'mp-watch']];
  function appIcon(a, key, bare) {
    var lbl = function (t) { return bare ? '' : '<span>' + t + '</span>'; };
    if (a === 'mp') return '<button type="button" class="pv5-team-app" aria-label="MyPaisa"' + K.go(key || 'sys:app') + '><span class="pv5-team-ico pv5-team-mp"><span class="pv5-team-mark"></span></span>' + lbl('MyPaisa') + '</button>';
    return '<button type="button" class="pv5-team-app" aria-label="' + a[0] + '"' + K.go(key || 'sys:app') + '><span class="pv5-team-ico ' + a[2] + '">' + K.ms(a[1]) + '</span>' + lbl(a[0]) + '</button>';
  }
  function homeScreen(ctx, o) {
    o = o || {};
    var n = ctx.door === 'ios' ? 4 : ctx.door === 'ipad' ? 7 : 5;
    var wgW = ctx.door === 'ios' ? 'auto' : 'min(360px, 100%)';
    var widget = '<button type="button" class="widget lg pv5-team-wg" id="pv5-team-widget" style="width:' + wgW + '"' + K.go(o.widgetKey || 'next') + '>' + widgetBody(ctx, o.hidden) + '</button>';
    var cols = ctx.door === 'ipad' ? n - 2 : n;
    var icons = APPS.slice(0, cols * 2 - 1).map(function (a) { return appIcon(a); });
    icons.splice(Math.min(icons.length, cols + 1), 0, appIcon('mp'));
    var dock = '<div class="lg pv5-team-dock">' + DOCK.map(function (a) { return appIcon(a, null, true); }).join('') + '</div>';
    var pad = ctx.door === 'ios' ? '12px 22px 0' : '28px max(24px, 5%) 0';
    var inner = '<div class="pv5-team-scr">' + sbar(ctx, true) + '<div class="fx col g16 f1" style="padding:' + pad + '">' +
      (ctx.door === 'ipad' ? '<div class="pv5-team-hrow">' + widget + '<div class="pv5-team-grid">' + icons.join('') + '</div></div>'
        : widget + '<div class="pv5-team-grid">' + icons.join('') + '</div>') +
      '</div><div style="padding:0 ' + (ctx.door === 'ios' ? '10px 26px' : 'max(22px, 13%) 22px') + '">' + dock + '</div></div>';
    return inner;
  }
  function lockScreen(ctx, o) {
    o = o || {};
    var date = { '2026-10-26': 'Monday 26 October' }[ctx.t.slice(0, 10)] || wd(ctx.t);
    var big = ctx.door !== 'ios';
    var inner = '<div class="pv5-team-scr">' + sbar(ctx, false) +
      '<div class="pv5-team-lk">' + K.ms(o.open ? 'lock_open' : 'lock') + '<span class="lock-date">' + date + '</span><span class="lock-time"' + (big ? ' style="font-size:120px"' : '') + '>' + ctx.tm.replace(/^0/, '') + '</span></div>' +
      (o.widget ? '<div style="padding:14px 0 0;display:flex;justify-content:center"><button type="button" class="widget lg pv5-team-wg" id="pv5-team-lockwg" style="width:' + (big ? 'min(360px, calc(100% - 64px))' : 'calc(100% - 64px)') + '"' + K.go('next') + '>' + widgetBody(ctx, o.hidden) + '</button></div>' : '') +
      '<div class="f1"></div>' + (o.bottom || '') +
      '<div class="fx jb" style="padding:0 46px 44px">' + '<span class="pv5-team-lkb lg">' + K.ms('flashlight_on') + '</span><span class="pv5-team-lkb lg">' + K.ms('photo_camera') + '</span></div></div>';
    return inner;
  }
  function sysHomeWidget(ctx) { return sysWrap(ctx, homeScreen(ctx, {})); }
  function sysLockWidget(ctx) { return sysWrap(ctx, lockScreen(ctx, { widget: true, open: true })); }
  function sysShare(ctx) {
    var S = D().beyond.share, big = ctx.door !== 'ios';
    var files = '<div class="pv5-team-files">' + sbar(ctx, true, true) + '<div style="padding:' + (big ? '20px 48px 0' : '14px 20px 0') + '">' +
      '<div class="fx col g4"><span class="mp-foot mp-ink2">Files · On My ' + (ctx.door === 'ios' ? 'iPhone' : 'iPad') + '</span><span class="mp-t1">Downloads</span></div>' +
      [[S.file, S.size, 'Today 13:04'], ['Council-tax-2026.pdf', '208 KB', 'Thu 22 Oct'], ['Boarding-pass.pdf', '96 KB', 'Tue 20 Oct']].map(function (f, i) {
        return '<div class="pv5-team-frow"><span class="pv5-team-pdf">' + K.ms('picture_as_pdf') + '</span><div class="fx col"><span class="mp-sub" style="font-weight:' + (i ? 400 : 600) + ';overflow-wrap:anywhere">' + K.esc(f[0]) + '</span><span class="mp-foot mp-ink2">' + f[2] + ' · ' + f[1] + '</span></div></div>';
      }).join('') + '</div></div>';
    var sheet = '<div class="pv5-team-share lg"><div class="pv5-team-frow" style="box-shadow:none;padding:0"><span class="pv5-team-pdf">' + K.ms('picture_as_pdf') + '</span><div class="fx col"><span class="mp-sub" style="font-weight:600;overflow-wrap:anywhere">' + K.esc(S.file) + '</span><span class="mp-foot mp-ink2">PDF · ' + S.size + '</span></div></div>' +
      '<div class="pv5-team-apps">' + [['AirDrop', 'wifi_tethering', 'mp-hold'], ['Messages', 'sms', 'mp-add'], 'mp', ['Mail', 'mail', 'mp-hold']].map(function (a) { return appIcon(a, a === 'mp' ? 'share:mypaisa' : 'sys:app'); }).join('') + '</div>' +
      '<div class="pv5-team-acts"><div><span>Copy</span>' + K.ms('content_copy') + '</div><div><span>Save to Files</span>' + K.ms('folder') + '</div><div><span>Print</span>' + K.ms('print') + '</div></div></div>';
    return sysWrap(ctx, '<div class="pv5-team-scr pv5-team-ink" style="color:var(--mp-ink)">' + files + '<div class="pv5-team-dim" style="opacity:0.32"></div>' + sheet + '</div>', { files: true, ink: true });
  }
  function sysSiri(ctx) {
    var B = D().beyond, dm = B.day_move;
    var snip = ctx.priv
      ? '<div class="pv5-team-card lg"><span class="pv5-team-wg-h"><span class="pv5-team-mark"></span>MyPaisa</span><span class="mp-hl">Privacy mode is on, so I won’t read it out.</span><span class="mp-foot mp-ink2">Open MyPaisa to see it.</span></div>'
      : '<div class="pv5-team-card lg"><span class="pv5-team-wg-h"><span class="pv5-team-mark"></span>MyPaisa · Household</span><span class="pv5-team-wg-v">' + K.gbp(ctx.W.T.net_gbp) + '</span><span class="mp-sub">' + K.move(dm.gbp, null) + ' on Friday · Fri 23 Oct close</span><span class="mp-foot mp-ink2">Mostly ' + mz(dm.most) + '. Every figure from code, as in the app.</span></div>' +
        '<span class="pv5-team-said" style="font-weight:400;font-size:17px;line-height:23px">The household is worth ' + K.gbp(ctx.W.T.net_gbp, {}) + ' at Friday’s close. It rose ' + K.gbp(Math.round(dm.gbp)) + ' on Friday.</span>';
    var body = '<div class="pv5-team-siri"><span class="pv5-team-said">“' + K.esc(B.siri.ask) + '”</span>' + snip +
      '<div>' + K.btn('Open MyPaisa', 'next', 'primary small', 'open_in_new') + '</div></div>';
    return sysWrap(ctx, homeScreen(ctx, { hidden: false, widgetKey: 'sys:app' }) + '<div class="pv5-team-dim"></div><div class="pv5-team-scr" style="z-index:24">' + (ctx.door === 'ios' ? '' : '<div style="height:32px"></div>') + body + '</div><div class="pv5-team-glow"></div>');
  }
  function sysLive(ctx) {
    var L = D().beyond.live;
    var la = '<div class="pv5-team-la lg" style="margin:0 ' + (ctx.door === 'ios' ? '12px' : 'auto') + ' 22px;' + (ctx.door === 'ios' ? '' : 'width:min(420px, calc(100% - 24px))') + '">' +
      '<div class="fx ac jb"><span class="pv5-team-wg-h"><span class="pv5-team-mark"></span>MyPaisa · Import</span><span class="mp-foot mp-ink2">Step ' + L.step + ' of ' + L.steps.length + '</span></div>' +
      '<span class="mp-hl" style="overflow-wrap:anywhere">' + K.esc(L.file) + '</span>' +
      '<div class="pv5-team-steps">' + L.steps.map(function (s, i) { return '<i class="' + (i < L.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<span class="mp-sub">' + mz(L.steps[L.step - 1]) + ' · ' + L.facts.map(mz).join(' · ') + '</span>' +
      '<span class="mp-foot mp-ink2">Open MyPaisa to Confirm. No amounts here.</span></div>';
    var island = ctx.door === 'ios' ? '<div class="island pv5-team-di"><span class="pv5-team-mark" style="box-shadow:0 0 0 2px var(--mp-hero),0 0 0 3.5px var(--mp-coral)"></span><span>' + L.step + ' of ' + L.steps.length + '</span></div>' : '';
    return sysWrap(ctx, lockScreen(ctx, { open: false, bottom: la }) + island);
  }

  /* ---------- the chat, phase 13: Arun's own conversation with MyPaisa ---------- */
  function digestCard(ctx) {
    var r = reqById('cr-25');
    return K.ccard({ chip: K.chip(K.ms('summarize') + 'Your daily digest · 19:00', 'mp-neutral') + K.draft(), h: '1 request waits, 1 fixed on its own',
      body: K.p('The data steward asks to switch on EODHD Historian (' + r.id + '). Fixed on their own: Silver ETC failed over to the FT page on Friday at 21:40.'), acts: [K.cbtn('Approvals', 'nav:team/approvals', 'ghost')] });
  }
  function incidentCard(ctx, t) {
    var i = D().team.incident, open = incOpen(t);
    return K.ccard({ id: 'card-inc', chip: K.chip(K.ms(open ? 'error' : 'check_circle') + (open ? 'Incident · ' : 'Closed · ') + i.id, open ? 'mp-alertchip' : 'mp-add') + K.draft(), h: K.esc(i.title),
      sub: hm(i.raised) + ' · from the ops warden · sent silently: quiet hours until 07:00', body: K.p(mz(i.meanwhile)), acts: [K.cbtn('Open it', 'nav:team/incidents', 'ghost')] });
  }
  function chat13(ctx, n) {
    var d = D(), t = ctx.t, m = [];
    m.push(K.daysep('Yesterday'));
    m.push(K.ai('', { cards: [digestCard(ctx)] }));
    m.push(K.daysep('Today'));
    m.push(K.ai('', { cards: [incidentCard(ctx, t)] }));
    m.push(K.me('Who’s on the team this morning, and is anything wrong?', '06:10'));
    var stats = d.team.agents.map(function (a) { return agentAt(a, T('06:10')); });
    m.push(K.ai('Six agents, each with one job: the concierge talks to you in this chat; the data steward keeps prices flowing, to value the holdings; the grader and tuner grade each closed month against the Budget forecast and the Projection; the ops warden repairs the daily run; the budget keeper watches the meter; and the admin desk brings their questions to you. ' +
      'One is wrong: the data steward has been silent since 03:12, and the ops warden could not fix it (inc-7). ' + stats.filter(function (s) { return s.st[0] === 'Running'; }).length + ' are running. One request waits: the data steward’s.',
      { meta: 'From the agents’ heartbeats and the admin desk’s queue, read by code', icon: 'groups', cards: n === 0 ? [K.ccard({ body: K.p('Outside its band, an agent asks you; inside it, it acts and tells you in the digest.'), acts: [K.cbtn('Show me the steward’s request', 'desk:open', 'primary')] })] : [] }));
    if (n >= 1) {
      m.push(K.me('Show me the steward’s request.', '06:12'));
      m.push(K.ai('', { cards: [reqCard(ctx, reqById('cr-25'), n === 1 ? T('06:12') : t)] }));
    }
    if (n >= 2) {
      m.push(K.ai('Later, then. It comes back in tonight’s 19:00 digest and waits in Approvals until Sun 1 Nov 18:20.', { icon: 'schedule', meta: 'Admin desk' }));
    }
    if (n >= 4) {
      m.push(K.ai('Skipped at 08:31 by You, ' + how(ctx) + ': the page is marked bad and left out, and the data steward ran again. Its heartbeat is back; inc-7 is closed. The ops warden and the steward each noted what worked.', { icon: 'check_circle', meta: 'Ops warden · inc-7' }));
    }
    return m;
  }
  var COMP13 = { chips: [['Approvals', 'how_to_reg', 'nav:team/approvals'], ['What changed?', 'history', 'chip:changed'], ['Why?', 'help', 'chip:why']], ph: 'Ask, or tell the team…' };

  /* ---------- the chat, phase 14: Arun imports Asha's statement (she views only) ---------- */
  function chat14(ctx, n) {
    var d = D(), C = d.india.cas, pp = asset('ppfas'), m = [];
    m.push(K.daysep('Today'));
    m.push(K.me(file(C.file, C.size), '20:40'));
    m.push(K.ai('Got it: a PDF, ' + C.size + '. It is kept with your files before anything reads it.', { icon: 'folder', meta: 'Kept first: even a failed read leaves the original' }));
    m.push(K.ai('', { cards: [K.ccard({ chip: K.chip(K.ms('lock') + 'Locked', 'mp-neutral'), h: 'This PDF is locked with a password', body: K.p('Statements from CAMS and KFintech usually are. Type it once here, or send a copy without one.'), acts: n === 0 ? [K.cbtn('Type the password', 'cas:pw', 'primary'), K.cbtn('Send an unlocked copy', 'cas:copy', 'ghost')] : [] })] }));
    if (n >= 1) {
      m.push(K.ai('Unlocked. The password was used once, on this ' + (ctx.app ? 'device' : 'computer') + ', and not kept.', { icon: 'lock_open' }));
      var c = C.matched[0];
      var dry = K.ccard({ id: 'card-dry', chip: K.chip(K.ms('science') + 'Import · dry run · nothing saved yet', 'mp-neutral') + K.draft(), h: 'CAS from ' + C.from + ', to ' + C.to, sub: C.file,
        body: K.p('<b>1 fund, matched by ISIN:</b> ' + K.esc(pp.name) + '. Already here, and its units agree: ' + K.num(c.units, 3) + '.') +
          K.p('<b>Adds its history:</b> ' + c.sips + ' SIPs of ' + K.inr(c.sip) + ' since ' + c.since + ', ' + K.inr(c.invested) + ' in all, each with its own NAV and units.') +
          K.p('<b>Not matched, so left out:</b> ' + mz(C.not_matched[0].what) + '; ' + mz(C.not_matched[0].why) + '. Listed, not guessed.') +
          K.p('<b>Already imported:</b> nothing; this statement’s fingerprint is new, so nothing can be added twice.') +
          K.kv('Total, unchanged', K.inrGbp(C.total_inr)) + K.foot('At Friday’s NAV and ' + fxLine() + '. Your PAN, address and account numbers are not kept in any record; the file is kept as sent. Nothing is saved until you tap Confirm and check it’s you.'),
        acts: n <= 2 ? [K.cbtn('Confirm', 'cas:confirm', 'primary'), K.cbtn('Cancel', 'cas:cancel', 'ghost')] : [] });
      m.push(K.ai('', { cards: [dry], meta: 'Read by code: the statement parser, pinned and tested; matched by ISIN to AMFI’s list', icon: 'function' }));
    }
    if (n >= 3) {
      m.push(K.ai('', { cards: [K.ccard({ id: 'card-saved', chip: K.chip(K.ms('check_circle') + 'Import · saved', 'mp-add') + K.draft(), h: 'Saved as import ' + C.import_id + ', ' + how(ctx),
        body: K.p(K.esc(pp.name) + ': ' + c.sips + ' SIPs, from ' + C.file + '. Left out: 1 closed scheme. Tell me what it was and I will ask you again.') + K.kv('Audit', 'Import · Arun, for Asha · ' + hm(C.saved) + ' · run ' + C.run),
        acts: [K.cbtn('India', 'nav:india', 'ghost'), K.cbtn('Undo this import', 'cas:undo', 'ghost', 'undo')] })] }));
    }
    if (n >= 4) {
      m.push(K.me('Can Asha’s fund go into her ISA?', '20:45'));
      m.push(K.ai('No. It is a mutual fund folio in rupees, outside any ISA: it cannot go into her ISA, and MyPaisa cannot trade. A SIP or a top-up is made with the fund house, by its owner. One flag: it may not be a UK reporting fund, so gains may be taxed differently; check with a tax adviser. MyPaisa flags it and goes no further.',
        { meta: 'From get_holding: the registry’s record and its account', icon: 'function' }));
    }
    return m;
  }

  /* ---------- the chat, phase 15 ---------- */
  function chat15(ctx, k) {
    var B = D().beyond, dm = B.day_move, m = [K.daysep('Today')];
    var answer = function (time) { return K.ai('The household is worth ' + K.gbp(ctx.W.T.net_gbp) + ' at Friday’s close. It rose ' + K.gbp(Math.round(dm.gbp)) + ' on Friday, mostly ' + mz(dm.most) + '.', { meta: 'From get_portfolio, prices at the Fri 23 Oct close', icon: 'function' }); };
    if (k === 'home' || k === 'lock') { m.push(K.me('How are we doing today?', B.widget.at.slice(11, 16))); m.push(answer()); }
    if (k === 'share' || k === 'reading') {
      var S = B.share;
      if (k === 'share') return [K.ai('Share a factsheet or a screenshot here, or drop the file on the chat. It opens on the reading card; nothing is saved before Confirm.', { icon: 'ios_share' })];
      m.push(K.me(file(S.file, S.size) + '<br><span class="mp-foot">Shared from ' + S.from + '</span>', hm(S.at)));
      m.push(K.ai('Kept with your files. Here is what it says; nothing from it is saved until you Confirm.', { cards: [K.ccard({ id: 'card-read', chip: K.chip(K.ms('description') + 'Reading card · nothing saved yet', 'mp-neutral') + K.draft(), h: 'Factsheet · Robotics ETF', sub: 'Matched to Robotics ETF · Arun · GIA',
        body: S.read.map(function (r) { return K.kv(r[0], mz(r[1])); }).join('') + K.foot('Confirm saves ' + mz(S.save) + ', with an audit row naming this file. Not now keeps only the file.'), acts: [K.cbtn('Confirm', 'share:confirm', 'primary'), K.cbtn('Not now', 'share:no', 'ghost')] })], meta: 'Read with extract_document', icon: 'function' }));
    }
    if (k === 'siri') { m.push(K.me(K.esc(B.siri.ask), hm(B.siri.at))); m.push(answer()); }
    if (k === 'shortcut') {
      m.push(K.ai('Opened from your Shortcut, ' + K.esc(B.shortcut.name) + '.', { icon: 'bolt' }));
      m.push(K.ai('', { cards: [K.ccard({ id: 'card-flow', chip: K.chip(K.ms('edit_note') + 'Log a transaction', 'mp-neutral') + K.draft(), h: 'What kind?', body: K.foot('One question at a time, each a card you can change. Nothing is saved until you Confirm the last card, here in the app.'),
        acts: B.shortcut.kinds.map(function (x, i) { return K.cbtn(x, 'flow:' + x.toLowerCase(), i ? 'ghost' : 'primary'); }) })] }));
    }
    if (k === 'live') {
      var C = D().india.cas;
      m.push(K.me(file(C.file, C.size), '20:40'));
      m.push(K.ai('Kept with your files, then read and matched by ISIN: ' + B.live.facts.map(mz).join(', ') + '. Ready for your Confirm: the summary card is next, and nothing is saved before it.', { icon: 'hourglass_top', meta: 'A Web Push says when it is ready, with no amounts' }));
    }
    return m;
  }

  /* ---------- the chapters ---------- */
  M.chapter({ key: 'p13', n: '13', order: 13, title: 'The agent team: configured, approved, self-healing, self-learning', short: 'Agent team', steps: [
    { id: 'p13-team', d: 'Mon 26 Oct', tm: '06:10', t: 'Six agents, one job each', draft: true, viewer: 'arun', page: 'team/agents', focus: 'page',
      g: 'Arun is an admin. The Agent team in the Admin center lists the six agents with each one’s heartbeat, last run, spend and status, and the budgets as shares of prod’s $160. The data steward has been silent since 03:12. Tap Open the steward’s request.',
      chat: function (ctx) { return chat13(ctx, 0); }, composer: COMP13, target: 'desk:open' },
    { id: 'p13-desk', d: 'Mon 26 Oct', viewer: 'arun', tm: '06:12', t: 'The admin desk, in your chat', draft: true, page: 'team/approvals/cr-25', focus: 'chat',
      g: 'A request arrives as a card in the admin’s own chat: what changes, why with its evidence, the cost and the budget left, the undo, when it expires. Approve, Reject, Why? or Later. Arun taps Later: it waits for tonight’s digest.',
      chat: function (ctx) { return chat13(ctx, 1); }, composer: COMP13, target: 'req:later:cr-25', scroll: { chat: 'card-cr-25', page: 'req-cr-25' } },
    { id: 'p13-incident', d: 'Mon 26 Oct', viewer: 'arun', tm: '08:30', t: 'Fixed on its own, and one incident', draft: true, page: 'team/incidents', focus: 'page',
      g: 'Self-healing: a failover and a fill-in from the next source, each fixed on its own and told in the digest. What it cannot fix is an incident: inc-7, with what happened, what was tried, what goes on meanwhile and the choices. Tap Skip the page.',
      chat: function (ctx) { return chat13(ctx, 2); }, composer: COMP13, target: 'inc:skip' },
    { id: 'p13-notes', d: 'Mon 26 Oct', viewer: 'arun', tm: '08:31', t: 'The agents’ notes', draft: true, page: 'team/notes', focus: 'page',
      g: 'Each agent keeps notes on its own work and reads them first in every run: a source’s quirks, the fix that worked, why a request was approved or rejected. A note never changes behaviour; an admin reads, corrects or clears them behind the second check (MA-289).',
      chat: function (ctx) { return chat13(ctx, 4); }, composer: COMP13 }
  ] });

  var COMP14 = { chips: [['India', 'currency_rupee', 'nav:india'], ['What changed?', 'history', 'chip:changed'], ['Why?', 'help', 'chip:why']] };
  M.chapter({ key: 'p14', n: '14', order: 14, title: 'Indian holdings and the existing Indian portfolio', short: 'India', steps: [
    { id: 'p14-cas', d: 'Mon 26 Oct', tm: '20:40', t: 'Arun sends Asha’s CAS', draft: true, viewer: 'arun', page: 'india', focus: 'chat',
      g: 'Asha views only, so Arun, an admin, sends the detailed Consolidated Account Statement for her Indian mutual funds. The file is kept first, then read by code. It is locked, so MyPaisa asks once for its password: typed here, used once on this device, never stored, logged or sent. Tap Unlock.',
      chat: function (ctx) { return chat14(ctx, 0); }, composer: COMP14, target: 'cas:unlock', sheetClose: 'cas:cancel', on: { 'cas:cancel': 'sheet:dismiss' },
      sheet: function (ctx) {
        var C = D().india.cas;
        return '<div class="pv5-team-sheet"><div class="sheet-h"><span class="mp-hl">Unlock the statement</span>' + K.draft() + '</div><span class="mp-foot mp-ink2">' + K.esc(C.file) + ' · ' + C.size + '</span>' +
          K.p('The password you chose when you asked CAMS or KFintech for this statement.') + '<div class="pv5-team-pw">' + K.ms('key') + '<span>••••••••</span></div>' +
          K.note('shield', 'Used once, on this device, to open the file; never stored, logged or sent.') +
          '<div class="pv5-team-btns">' + K.btn('Unlock', 'cas:unlock', 'primary', 'lock_open') + K.btn('Cancel', 'cas:cancel', 'plain') + '</div></div>';
      } },
    { id: 'p14-dry', d: 'Mon 26 Oct', tm: '20:41', t: 'The dry run: one summary card', draft: true, viewer: 'arun', page: 'india', focus: 'chat',
      g: 'One summary card, nothing saved yet: what matched by ISIN, the history it adds, what was left out (listed, never guessed), and that nothing can be added twice. The total does not change: the import brings the fund’s history, not new money. Tap Confirm.',
      chat: function (ctx) { return chat14(ctx, 1); }, composer: COMP14, target: 'cas:confirm', scroll: { chat: 'card-dry' } },
    { id: 'p14-check', d: 'Mon 26 Oct', tm: '20:42', t: 'Confirm with the second check', draft: true, viewer: 'arun', page: 'india', focus: 'chat',
      g: 'Confirm asks for the second check, as every import does; the import gets one id, so it can be rolled back whole.',
      chat: function (ctx) { return chat14(ctx, 2); }, composer: COMP14, target: 'check:ok', scroll: { chat: 'card-dry' }, on: { 'check:alt': 'next', 'check:cancel': 'st:1' }, sheetClose: 'check:cancel',
      sheet: function (ctx) { return checkSheet(ctx, 'Import the history of 1 fund, 46 transactions, from CAS-Oct-2026.pdf into Asha’s Parag Parikh Flexi Cap record.', 'check:cancel'); } },
    { id: 'p14-india', d: 'Mon 26 Oct', tm: '20:43', t: 'The Indian accounts, in rupees with pounds beside', draft: true, viewer: 'arun', page: 'india', focus: 'page',
      g: 'Every Indian figure in rupees with its pounds beside, by account: the demat account, the mutual fund folio, the NRE savings, the PPF, and the rest of what the household holds in India. Tap the Parag Parikh fund.',
      chat: function (ctx) { return chat14(ctx, 3); }, composer: COMP14, target: 'nav:india/ppfas' },
    { id: 'p14-tax', d: 'Mon 26 Oct', tm: '20:45', t: 'The account, and the tax flag', draft: true, viewer: 'arun', page: 'india/ppfas', focus: 'page',
      g: 'Each Indian account says what it is: a folio in rupees, outside any ISA, and MyPaisa never trades. The tax flag says, in plain words, to check with a tax adviser. Asha sees the same page, to view.',
      chat: function (ctx) { return chat14(ctx, 4); }, composer: COMP14 }
  ] });

  var COMP15 = { chips: [['Add something', 'add', 'chip:add'], ['What changed?', 'history', 'chip:changed'], ['Why?', 'help', 'chip:why']] };
  M.chapter({ key: 'p15', n: '15', order: 15, title: 'The app beyond the chat: widgets, Siri, the share sheet, Live Activities', short: 'Beyond the chat', steps: [
    { id: 'p15-home', d: 'Mon 26 Oct', tm: '12:30', t: 'The Home Screen widget', draft: true, viewer: 'arun', page: 'beyond/widget', focus: 'page',
      g: 'The household’s total and the day’s move, from the last fetch with its time: prices are at Friday’s close, so the move is Friday’s. Turn Privacy on above: the widget shows the mark and Hidden. On the web, Home’s first line carries the same figures.',
      chat: function (ctx) { return chat15(ctx, 'home'); }, composer: COMP15, system: sysHomeWidget, target: 'next' },
    { id: 'p15-lock', d: 'Mon 26 Oct', tm: '12:41', t: 'The Lock Screen widget, and privacy', draft: true, viewer: 'arun', page: 'beyond/lock', focus: 'page',
      g: 'The same figures on the Lock Screen, once Face ID has recognised Arun; with privacy mode on, the mark and Hidden. Notifications and Live Activities on the Lock Screen never carry an amount.',
      chat: function (ctx) { return chat15(ctx, 'lock'); }, composer: COMP15, system: sysLockWidget, target: 'next' },
    { id: 'p15-share', d: 'Mon 26 Oct', tm: '13:05', t: 'A factsheet shared from Files', draft: true, viewer: 'arun', page: 'beyond/share', focus: 'page',
      g: 'Arun shares the Robotics ETF’s factsheet from Files. MyPaisa is in the share sheet; it opens the chat on the reading card. On the web, the same file is dropped on the chat. Tap MyPaisa.',
      chat: function (ctx) { return chat15(ctx, 'share'); }, composer: { files: ['Robotics-ETF-factsheet-Sep-2026.pdf'], send: 'share:mypaisa' }, system: sysShare, target: 'share:mypaisa' },
    { id: 'p15-reading', d: 'Mon 26 Oct', tm: '13:05', t: 'The chat opens on the reading card', draft: true, viewer: 'arun', page: 'beyond/share', focus: 'chat',
      g: 'The reading card: what the file says, matched to its record, with nothing saved before Confirm. Confirm writes it with an audit row naming the file; the file itself is kept either way.',
      chat: function (ctx) { return chat15(ctx, 'reading'); }, composer: COMP15, target: 'share:confirm', scroll: { chat: 'card-read' } },
    { id: 'p15-siri', d: 'Mon 26 Oct', tm: '18:10', t: 'Siri: How is the portfolio today?', draft: true, viewer: 'arun', page: 'beyond/siri', focus: 'page',
      g: 'Siri answers with the household’s total and the day’s move, from the same figures as the app, once the iPhone is unlocked. With privacy mode on it says only to open MyPaisa.',
      chat: function (ctx) { return chat15(ctx, 'siri'); }, composer: COMP15, system: sysSiri, target: 'next' },
    { id: 'p15-shortcut', d: 'Mon 26 Oct', tm: '18:20', t: 'The Shortcut starts the guided flow', draft: true, viewer: 'arun', page: 'beyond/siri', focus: 'chat',
      g: 'The Shortcut “Log money into MyPaisa” opens the chat on the guided flow, one question at a time. It never writes on its own: nothing is saved without Confirm in the app.',
      chat: function (ctx) { return chat15(ctx, 'shortcut'); }, composer: COMP15, target: 'flow:bought', scroll: { chat: 'card-flow' } },
    { id: 'p15-live', d: 'Mon 26 Oct', tm: '20:41', t: 'A Live Activity follows the import', draft: true, viewer: 'arun', page: 'beyond/live', focus: 'page',
      g: 'While Asha’s CAS is read (phase 14), a Live Activity follows it on Arun’s Lock Screen and in the Dynamic Island: the file, its steps and its counts, never an amount. Open MyPaisa to Confirm.',
      chat: function (ctx) { return chat15(ctx, 'live'); }, composer: COMP15, system: sysLive }
  ] });
})();
