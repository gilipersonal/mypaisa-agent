/* MyPaisa · Prototype v5 (MA-291): Talk, phases 0, 1 and 8 at every door.
   Phase 0: what MyPaisa is and where it runs (the icons, the two environments, the doors).
   Phase 1, Mon 26 Oct 09:30 to 09:40: signing in; the chat's first answer, a reply streaming, offline, a push with
   no amount, privacy mode; Activity and one run; what MyPaisa remembers; signing out an old phone.
   Phase 8, Mon 26 Oct 10:00 to 10:15: Audit and the file behind a change, Search, and the Admin center (members and
   devices behind the second check, the Claude ceiling, caps and alerts with Replay, the judges' labels); as Asha,
   no Admin center. Figures from talk-v5.json (make_talk.py) and household-v4.json, as of each step's time.
   Pages: signin, search, activity, run, audit, files, file, you (you/about), notifications, admin, admin/... */
(function () {
  'use strict';
  var M = window.MP5, K = window.MP5K;
  if (!M || !K) return;

  /* ---------- this file's own styles (every selector scoped to a pv5-talk element) ---------- */
  var CSS = [
    '.pv5-talk-pg{container:pv5talk/inline-size;display:flex;flex-direction:column;gap:16px;min-width:0}',
    '.pv5-talk-cols,.pv5-talk-col{display:flex;flex-direction:column;gap:16px;min-width:0}',
    '@container pv5talk (min-width: 660px){.pv5-talk-cols{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start}.pv5-talk-cols.rf>.pv5-talk-col:first-child{order:2}}',
    '.pv5-talk-tm{width:44px;flex:none;font:600 14px/20px var(--mp-font);color:var(--mp-ink);font-variant-numeric:tabular-nums}',
    '.pv5-talk-tools{display:inline-block;margin-top:2px;font:400 12px/16px ui-monospace,"SF Mono",Menlo,monospace;color:var(--mp-ink-2);word-break:break-word}',
    '.pv5-talk-big{font:800 30px/34px var(--mp-font-round);letter-spacing:-0.02em;font-variant-numeric:tabular-nums}',
    '.pv5-talk-meter{position:relative;height:10px;border-radius:999px;background:var(--mp-track);box-shadow:inset 0 0 0 1px var(--mp-line);margin-top:6px}',
    '.pv5-talk-meter>i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--mp-meter)}',
    '.pv5-talk-meter>b{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;border-radius:1px;background:var(--mp-ink-2)}',
    '.pv5-talk-marks{position:relative;height:18px;font:400 12px/18px var(--mp-font);color:var(--mp-ink-2)}',
    '.pv5-talk-marks span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}',
    '.pv5-talk-day{font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);text-transform:uppercase;letter-spacing:.05em;padding:12px 0 2px}',
    '.pv5-talk-ar{display:flex;gap:12px;align-items:flex-start;padding:12px 0;min-width:0}',
    '.pv5-talk-ar+.pv5-talk-ar{box-shadow:inset 0 1px 0 var(--mp-line)}',
    '.pv5-talk-ar>.f1{display:flex;flex-direction:column;gap:3px;min-width:0}',
    '.pv5-talk-init{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--mp-surface-2);color:var(--mp-ink);font:700 12px/1 var(--mp-font)}',
    '.pv5-talk-init.mk{background:var(--mp-hero);color:var(--mp-hero-ink)}',
    '.pv5-talk-file{display:flex;gap:10px;align-items:center;padding:8px 8px 8px 10px;border-radius:12px;background:var(--mp-surface-2);margin-top:4px;min-width:0}',
    '.pv5-talk-file .f1{display:flex;flex-direction:column;min-width:0}',
    '.pv5-talk-file .mp-btn{flex:none}',
    '.pv5-talk-thumb{width:40px;height:40px;border-radius:8px;flex:none;display:grid;place-items:center;color:var(--mp-ink-2);background:repeating-linear-gradient(135deg,var(--mp-surface) 0 6px,var(--mp-line) 6px 8px)}',
    '.pv5-talk-thumb.doc{background:var(--mp-surface)}',
    '.pv5-talk-flt{display:flex;gap:8px;flex-wrap:wrap}',
    '.pv5-talk-flt button{min-height:44px;border:0;border-radius:999px;padding:0 12px 0 14px;display:inline-flex;align-items:center;gap:4px;background:var(--mp-surface);color:var(--mp-ink);box-shadow:inset 0 0 0 1px var(--mp-line);font:500 14px/18px var(--mp-font);cursor:pointer}',
    '.pv5-talk-flt .ms{font-size:18px;color:var(--mp-ink-2)}',
    '.pv5-talk-q{display:flex;align-items:center;gap:10px;min-height:50px;padding:0 8px 0 14px;border-radius:14px;background:var(--mp-surface);box-shadow:inset 0 0 0 1.5px var(--mp-accent);font:400 17px/22px var(--mp-font);color:var(--mp-ink)}',
    '.pv5-talk-q .ms{color:var(--mp-ink-2);font-size:22px}',
    '.pv5-talk-hl{background:var(--mp-pause-bg);color:var(--mp-ink);border-radius:4px;padding:0 2px}',
    '.pv5-talk-ban{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:var(--mp-pause-bg);color:var(--mp-ink);font:500 14px/19px var(--mp-font)}',
    '.pv5-talk-ban .ms{font-size:18px;color:var(--mp-pause);margin-top:1px}',
    '.pv5-talk-red.mp-btn{color:var(--mp-alert);background:var(--mp-alert-bg)}',
    '.pv5-talk-swrow .mp-switch{pointer-events:none}',
    '.pv5-talk-off{opacity:.55;pointer-events:none}',
    '.pv5-talk-mx{display:grid;grid-template-columns:minmax(0,1.7fr) repeat(3,minmax(52px,1fr));font:400 14px/18px var(--mp-font);color:var(--mp-ink)}',
    '.pv5-talk-mx>div{padding:9px 6px 9px 0;box-shadow:inset 0 -1px 0 var(--mp-line);display:flex;flex-direction:column;justify-content:center;min-width:0}',
    '.pv5-talk-mx>.h{font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);text-transform:uppercase;letter-spacing:.04em}',
    '.pv5-talk-mx .c{flex-direction:row;align-items:center;gap:4px}',
    '.pv5-talk-mx .c .ms{font-size:16px;color:var(--mp-ink-2)}',
    '.pv5-talk-step{display:flex;gap:10px;padding:8px 0;align-items:flex-start}',
    '.pv5-talk-step+.pv5-talk-step{box-shadow:inset 0 1px 0 var(--mp-line)}',
    '.pv5-talk-step>.t{width:64px;flex:none;font:400 13px/19px ui-monospace,"SF Mono",Menlo,monospace;color:var(--mp-ink-2)}',
    '.pv5-talk-step>.f1{display:flex;flex-direction:column;gap:2px;min-width:0}',
    '.pv5-talk-mono{font:600 13px/18px ui-monospace,"SF Mono",Menlo,monospace;color:var(--mp-ink)}',
    '.pv5-talk-view{border-radius:16px;min-height:300px;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;color:var(--mp-ink-2);font:500 15px/20px var(--mp-font);background:repeating-linear-gradient(135deg,var(--mp-surface-2) 0 12px,var(--mp-surface) 12px 24px);box-shadow:inset 0 0 0 1px var(--mp-line)}',
    '.pv5-talk-chips{display:flex;gap:6px;flex-wrap:wrap}',
    '.pv5-talk-seg{display:inline-flex;gap:2px;background:var(--mp-surface-2);border-radius:10px;padding:2px}',
    '.pv5-talk-seg button{min-height:40px;border:0;background:transparent;border-radius:8px;padding:0 12px;font:600 13px/18px var(--mp-font);color:var(--mp-ink-2);cursor:pointer}',
    '.pv5-talk-seg button.on{background:var(--mp-seg-on);color:var(--mp-ink);box-shadow:var(--mp-shadow)}',
    '.pv5-talk-step2{display:flex;gap:10px;align-items:flex-start;font:400 14px/19px var(--mp-font)}',
    '.pv5-talk-step2 b{width:24px;height:24px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--mp-surface-2);font:700 12px/1 var(--mp-font)}',
    '.pv5-talk-stepper{display:flex;align-items:center;gap:12px}',
    '.pv5-talk-stepper .gbtn{background:var(--mp-surface-2);color:var(--mp-ink);border:0;cursor:pointer}',
    '.pv5-talk-panel{border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;background:var(--mp-alert-bg);color:var(--mp-ink)}',
    '.pv5-talk-panel .hd{display:flex;gap:6px;align-items:center;font:700 15px/20px var(--mp-font);color:var(--mp-alert)}',
    '.pv5-talk-ok{border-radius:14px;padding:12px 14px;display:flex;gap:8px;align-items:flex-start;background:var(--mp-add-bg);color:var(--mp-ink);font:400 14px/19px var(--mp-font)}',
    '.pv5-talk-ok .ms{color:var(--mp-add);font-size:20px}',
    /* the sign-in pages: on the web, the page stands alone (no sidebar, no chat: nobody is signed in yet) */
    '.pv5-talk-bare{display:flex;flex:1;min-height:100%;width:100%}',
    '.wf:has(.pv5-talk-bare) :is(.w-side,.w-chat,.w-tabs,.w-ask,.pg-h){display:none!important}',
    '.wf:has(.pv5-talk-bare) .w-page{padding:0!important;max-width:none!important;min-height:100%;box-sizing:border-box}',
    '.pv5-talk-si{display:flex;flex-wrap:wrap;width:100%;min-height:100%;background:var(--mp-bg)}',
    '.pv5-talk-si-hero{flex:1 1 440px;background:var(--mp-hero);color:var(--mp-hero-ink);padding:56px 56px 44px;display:flex;flex-direction:column;justify-content:space-between;gap:28px;box-sizing:border-box}',
    '.pv5-talk-si-hero .mp-sub{color:var(--mp-hero-ink-2)}',
    '.pv5-talk-si-form{flex:1 1 360px;display:flex;align-items:center;justify-content:center;padding:40px 24px;box-sizing:border-box}',
    '.pv5-talk-si-box{width:100%;max-width:360px;display:flex;flex-direction:column;gap:12px}',
    '@container wf (max-width: 699px){.pv5-talk-si-hero{flex-basis:100%;padding:26px 22px}.pv5-talk-si-form{padding:24px 20px 40px;align-items:flex-start}.pv5-talk-si-hero .pv5-talk-hide-s{display:none}}',
    '.pv5-talk-brand{display:flex;align-items:center;gap:12px;font:700 22px/28px var(--mp-font-round)}',
    '.pv5-talk-brand .ai-mark{width:38px;height:38px;margin:0}',
    '.pv5-talk-brand .ai-mark i{width:16px;height:16px}',
    '.pv5-talk-hero-h{font:700 34px/40px var(--mp-font);letter-spacing:-0.02em;margin:0;text-wrap:balance}',
    '.pv5-talk-sib.pv5-talk-sib{min-height:50px;width:100%;border:0;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;font:600 17px/22px var(--mp-font);cursor:pointer}',
    '.pv5-talk-sib .ms{font-size:20px}',
    '.pv5-talk-sib.apl{background:var(--mp-ink);color:var(--mp-bg)}',
    '.pv5-talk-sib.ggl{background:var(--mp-surface);color:var(--mp-ink);box-shadow:inset 0 0 0 1px var(--mp-line)}',
    '.pv5-talk-sib.pk{background:var(--mp-surface-2);color:var(--mp-ink)}',
    '.pv5-talk-g{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:800 14px/1 var(--mp-font);background:var(--mp-bg);color:var(--mp-ink);box-shadow:inset 0 0 0 1.5px var(--mp-ink-3)}',
    '.pv5-talk-wel{position:absolute;inset:0;background:var(--mp-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:90px 28px 70px;gap:14px;text-align:center;box-sizing:border-box}',
    '.pv5-talk-wel>.pv5-talk-si-box{align-items:stretch}',
    '.pv5-talk-wel .mp-draft{align-self:center}',
    '.pv5-talk-pg .mp-group>.pnext,.pv5-talk-pg .lst>.pnext,.pv5-talk-swrow.pnext{outline-offset:-3px;border-radius:12px}',
    '.pv5-talk-pg .nowrap,.pv5-talk-nw{white-space:nowrap}',
    '.pv5-talk-cardrows .mp-row{padding-left:0;padding-right:0}',
    /* the dialogs: iOS's own sheet on the iPhone and in a phone's browser; a centred form on the iPad, the
       foldable and a laptop's browser, where Apple's and the browser's checks are drawn as dialogs */
    '.pv5-talk-dlg{display:flex;flex-direction:column;gap:12px}',
    '.pv5-talk-cap{display:flex;align-items:center;gap:6px;font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);text-transform:uppercase;letter-spacing:.04em}',
    '.pv5-talk-cap .ms{font-size:15px}',
    '.pv5-talk-box{border-radius:16px;padding:12px 14px;background:var(--mp-surface);display:flex;flex-direction:column;gap:6px}',
    '.pv5-talk-dlg .faceid{color:var(--mp-accent)}',
    '@container wf (min-width: 700px){.sheet:has(>.pv5-talk-dlg){left:24px;right:24px;max-width:440px;margin:0 auto;top:50%;bottom:auto;transform:translateY(-50%);border-radius:24px;padding:22px;background:var(--mp-surface);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:var(--mp-shadow)}.sheet:has(>.pv5-talk-dlg)::before,.sheet:has(>.pv5-talk-dlg)>.sheet-grab{display:none}.sheet:has(>.pv5-talk-dlg) .pv5-talk-box{background:var(--mp-surface-2)}}',
    '@container af (min-width: 600px){.sheet:has(>.pv5-talk-dlg){left:24px;right:24px;max-width:460px;margin:0 auto;top:50%;bottom:auto;transform:translateY(-50%);border-radius:30px;padding:22px}.sheet:has(>.pv5-talk-dlg)>.sheet-grab{display:none}}',
    /* the iOS system screens: the home screen (phase 0) and the lock screen (a push, phase 1) */
    '.pv5-talk-sys{position:absolute;inset:0;color:var(--mp-hero-ink);overflow:hidden}',
    '.dev:has(.pv5-talk-sys)>.sbar{color:var(--mp-hero-ink)}',
    '.dev:has(.pv5-talk-sys)>.homebar{background:var(--mp-hero-ink)}',
    '.pv5-talk-hs{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:22px 8px;padding:96px 22px 0;max-width:720px;margin:0 auto;align-content:start}',
    '.pv5-talk-hs .pv5-talk-app{display:flex;flex-direction:column;align-items:center;gap:6px;font:500 13px/16px var(--mp-font);color:var(--mp-hero-ink);border:0;background:transparent;padding:0;cursor:pointer;min-height:44px}',
    '.pv5-talk-ic{width:77px;height:77px;position:relative;flex:none}',
    '.pv5-talk-ic>.appicon{position:absolute;left:0;top:0;transform:scale(.6417);transform-origin:0 0}',
    '.pv5-talk-ph{width:77px;height:77px;border-radius:18px;background:var(--lg-fill);box-shadow:var(--lg-edge)}',
    '.pv5-talk-hs-note{position:absolute;left:16px;right:16px;bottom:120px;display:flex;justify-content:center}',
    '.pv5-talk-hs-note>div{max-width:420px;border-radius:22px;padding:12px 14px;font:500 14px/19px var(--mp-font);display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
    '.pv5-talk-lock{display:flex;flex-direction:column;align-items:center;padding:86px 14px 0;gap:6px}',
    '.pv5-talk-lock .lock-time{color:var(--mp-hero-ink)}',
    '.pv5-talk-lock .notif.lg{width:100%;max-width:440px;margin-top:22px;border:0;text-align:left;cursor:pointer;font:inherit}',
    '.pv5-talk-lock .notif-b{color:var(--lg-ink)}',
    '.pv5-talk-lock .notif-ic .ai-mark{margin:0}',
    '.pv5-talk-lockfoot{position:absolute;left:0;right:0;bottom:46px;display:flex;justify-content:space-between;padding:0 44px}',
    '.pv5-talk-lockfoot>span{width:50px;height:50px;border-radius:50%;display:grid;place-items:center}',
    '.pv5-talk-icons{display:flex;gap:28px;flex-wrap:wrap}',
    '.pv5-talk-icons>div{display:flex;flex-direction:column;gap:8px;align-items:flex-start;max-width:220px}'
  ].join('\n');
  function css() {
    if (document.getElementById('pv5-talk')) return;
    var s = document.createElement('style');
    s.id = 'pv5-talk';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  css();

  /* ---------- the figures and the clock ---------- */
  function TD() { return (window.MP5D || {}).talk || null; }
  function HH() { return (window.MP5D || {}).household || {}; }
  var G = function (n, o) { return K.gbp(n, o); };
  var U = function (n, dp) { return K.usd(n, { dp: dp == null ? (n % 1 ? 2 : 0) : dp }); };
  var FXT = '<span class="mny">£1 = ₹112.50</span>';
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function cut(ctx) { return ctx.t + ':59'; }
  function dlabel(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10); return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ' ' + d + ' ' + MN[m - 1]; }
  function hm(iso) { return iso.slice(11, 16); }
  function sameDay(ctx, iso) { return iso.slice(0, 10) === ctx.t.slice(0, 10); }
  function when(ctx, iso) { return sameDay(ctx, iso) ? 'today ' + hm(iso) : dlabel(iso) + ', ' + hm(iso); }
  function latest(ctx, arr) { var c = cut(ctx), out = null; (arr || []).forEach(function (t) { if (t <= c) out = t; }); return out; }
  function mem(id) { var D = TD(); return D ? D.members.filter(function (m) { return m.id === id; })[0] : null; }
  function spendAt(ctx) { var D = TD(), c = cut(ctx), s = D.spend.snaps[0]; D.spend.snaps.forEach(function (x) { if (x.t <= c) s = x; }); return s; }
  function run(id) { var D = TD(); return D ? D.runs.filter(function (r) { return r.id === id; })[0] : null; }
  function q(t) { return '“' + t + '”'; }
  var DRAFT = K.draft();

  /* the ledger's states this file draws, as of a step's time and what was tapped in it */
  var T_OUT13 = '2026-10-26T09:40', T_PAUSE = '2026-10-26T10:07', T_REPLAY = '2026-10-26T10:12';
  function out13(ctx) { return ctx.t > T_OUT13 || (ctx.t === T_OUT13 && ctx.has('out13')); }
  function ashaPaused(ctx) { return ctx.t === T_PAUSE && ctx.has('paused') && !ctx.has('restored'); }
  function ashaWasPaused(ctx) { return ctx.t > T_PAUSE || (ctx.t === T_PAUSE && ctx.has('paused')); }
  function ashaRestored(ctx) { return ctx.t > T_PAUSE || (ctx.t === T_PAUSE && ctx.has('restored')); }
  function replayed(ctx) { return ctx.t > T_REPLAY || (ctx.t === T_REPLAY && ctx.has('replayed')); }

  /* on a compact door the page's chips and buttons go to the top of the body, so the title keeps the width */
  function fin(ctx, p) {
    if (!p || !ctx.compact || !(p.chip || p.right)) return p;
    p.body = '<div class="fx ac g8 wrap" style="margin:-2px 0 2px">' + (p.chip || '') + (p.right || '') + '</div>' + p.body;
    p.chip = ''; p.right = ''; return p;
  }
  function page(id, fn) { M.page(id, function (ctx, args) { return fin(ctx, fn(ctx, args)); }); }

  /* ---------- local kit pieces (named in the report): a switch row, the spend meter, initials, columns ---------- */
  function pg(body) { return '<div class="pv5-talk-pg">' + body + '</div>'; }
  function cols(left, right, rightFirst) {
    return '<div class="pv5-talk-cols' + (rightFirst ? ' rf' : '') + '">' + (rightFirst ? '<div class="pv5-talk-col">' + right + '</div><div class="pv5-talk-col">' + left + '</div>' :
      '<div class="pv5-talk-col">' + left + '</div><div class="pv5-talk-col">' + right + '</div>') + '</div>';
  }
  function swrow(o) {
    return '<button type="button" class="mp-row rowbtn pv5-talk-swrow' + (o.ring ? ' pnext' : '') + '"' + K.go(o.go) + '>' + (o.icon ? '<span class="mp-icontile" style="background:var(--mp-surface-2)">' + K.ms(o.icon) + '</span>' : '') +
      '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + o.t + '</span>' + (o.s ? '<span class="mp-foot mp-ink2">' + o.s + '</span>' : '') + '</div>' +
      '<span class="mp-switch' + (o.on ? ' on' : '') + '" role="switch" aria-checked="' + !!o.on + '"><span class="mp-switch-k"></span></span></button>';
  }
  function meter(frac, marks) {
    var m = (marks || []).map(function (p) { return '<b style="left:' + p + '%"></b>'; }).join('');
    var lb = (marks || []).map(function (p) { return '<span style="left:' + p + '%">' + p + '%</span>'; }).join('');
    return '<div class="pv5-talk-meter" role="img" aria-label="' + Math.round(frac * 100) + '% of the ceiling"><i style="width:' + (Math.min(1, frac) * 100).toFixed(1) + '%"></i>' + m + '</div>' +
      (lb ? '<div class="pv5-talk-marks">' + lb + '</div>' : '');
  }
  function init(id) {
    if (id === 'mypaisa') return '<span class="pv5-talk-init mk"><span class="ai-mark" style="width:22px;height:22px;margin:0"><i style="width:9px;height:9px"></i></span></span>';
    var m = mem(id); return '<span class="pv5-talk-init">' + (m ? m.init : '?') + '</span>';
  }
  function icontile(icon) { return '<span class="mp-icontile" style="background:var(--mp-surface-2)">' + K.ms(icon) + '</span>'; }
  function badge(n) { return '<span class="badge">' + n + '</span>'; }
  function ring(on) { return on ? ' pnext' : ''; }
  function abtn(t, key, kind, icon, extra) { return '<button type="button" class="mp-btn ' + (kind || 'mp-btn-tinted') + (extra || '') + '"' + K.go(key) + '>' + (icon ? K.ms(icon) : '') + '<span>' + t + '</span></button>'; }
  function okbox(icon, t) { return '<div class="pv5-talk-ok">' + K.ms(icon || 'check_circle') + '<span>' + t + '</span></div>'; }
  function fakeFilters(list) { return '<div class="pv5-talk-flt">' + list.map(function (f) { return '<button type="button"' + K.go('flt') + '>' + f + K.ms('expand_more') + '</button>'; }).join('') + '</div>'; }

  /* the door's own device (Arun's at each door; Asha's iPhone or iPad when she is the viewer) */
  function thisDev(ctx) {
    if (ctx.viewer === 'asha') return { ios: 'asha_iphone', ipad: 'asha_ipad' }[ctx.door] || null;
    return { desk: 'arun_chrome', pweb: 'arun_safari', ios: 'arun_iphone', ipad: 'arun_ipad', fold: 'arun_fold' }[ctx.door];
  }

  /* ---------- Apple's and Google's buttons, Apple's sheet, the second check ---------- */
  function appleBtn(key, cls) { return '<button type="button" class="pv5-talk-sib apl' + (cls || '') + '"' + K.go(key) + '><span>Sign in with Apple</span></button>'; }
  function googleBtn(key) { return '<button type="button" class="pv5-talk-sib ggl"' + K.go(key) + '><span class="pv5-talk-g">G</span><span>Sign in with Google</span></button>'; }
  function appleSheet(ctx) {
    var m = mem('arun');
    if (ctx.web && ctx.door === 'desk') {
      return '<div class="pv5-talk-dlg"><div class="pv5-talk-cap">' + K.ms('lock') + 'appleid.apple.com · Apple draws this window</div>' +
        '<span class="mp-t3" style="margin:0">Sign in with Apple</span><div class="pv5-talk-box"><span class="mp-sub">Use your Apple Account to sign in to MyPaisa.</span><span class="mp-sub" style="font-weight:600">' + m.apple + '</span></div>' +
        '<div class="fx ac g10"><span class="faceid" style="width:44px;height:44px;margin:0">' + K.ms('fingerprint') + '</span><span class="mp-foot mp-ink2">Touch ID on this Mac, then Continue. No password, and no name or email is shared.</span></div>' +
        '<button type="button" class="pv5-talk-sib apl"' + K.go('si:ok') + '><span>Continue</span></button>' + K.btn('Cancel', 'si:close', 'plain') + '</div>';
    }
    return '<div class="pv5-talk-dlg"><div class="pv5-talk-cap">' + K.ms('phone_iphone') + (ctx.web ? 'Safari shows Apple’s sheet' : 'iOS draws this sheet') + '</div>' +
      '<div class="fx ac jb"><span class="mp-t3" style="margin:0">Sign in with Apple</span><button type="button" class="gbtn" aria-label="Close"' + K.go('si:close') + '>' + K.ms('close') + '</button></div>' +
      '<div class="pv5-talk-box"><span class="mp-sub">Sign in to MyPaisa with your Apple Account</span><span class="mp-sub" style="font-weight:600">' + m.apple + '</span></div>' +
      '<div class="faceid">' + K.ms('familiar_face_and_zone') + '</div><p class="mp-foot mp-ink2" style="margin:0;text-align:center">Face ID, then Continue. MyPaisa asks for no name and no email.</p>' +
      '<button type="button" class="pv5-talk-sib apl"' + K.go('si:ok') + '><span>Continue</span></button></div>';
  }
  /* the second check (ARCHITECTURE 4.5): the change in words, then a fresh Sign in with Apple under Face ID in the
     app, or a fresh sign-in in the browser; bound to that change by the api's challenge, good for five minutes */
  function check2(ctx, o) {
    var m = mem('arun');
    var change = '<div class="pv5-talk-box">' + K.kv('Admin change', o.act) + '<span class="mp-foot mp-ink2">' + o.what + '</span></div>';
    if (ctx.web) {
      return '<div class="pv5-talk-dlg"><div class="pv5-talk-cap">' + K.ms('verified_user') + 'The second check</div><span class="mp-t3" style="margin:0">Check it’s you</span>' + change +
        appleBtn(o.ok, ' pnext') + '<button type="button" class="pv5-talk-sib pk pv5-talk-off">' + K.ms('passkey') + '<span>Use a passkey · none added yet</span></button>' +
        K.btn('Cancel', o.no, 'plain') + K.foot('A fresh Apple sign-in in this browser. The api accepts the change only with an answer under five minutes old, for this change alone.') + '</div>';
    }
    return '<div class="pv5-talk-dlg"><div class="pv5-talk-cap">' + K.ms('verified_user') + 'The second check · iOS draws the sheet</div>' + change +
      '<div class="fx ac jb"><span class="mp-hl">Sign in with Apple</span><button type="button" class="gbtn" aria-label="Cancel"' + K.go(o.no) + '>' + K.ms('close') + '</button></div>' +
      '<div class="pv5-talk-box"><span class="mp-sub">Continue as ' + m.full + ', ' + m.apple + '</span></div><div class="faceid">' + K.ms('familiar_face_and_zone') + '</div>' +
      '<button type="button" class="pv5-talk-sib apl pnext"' + K.go(o.ok) + '><span>Continue with Face ID</span></button>' +
      K.foot('The server binds a challenge to this change and accepts an answer under five minutes old. The app’s own Face ID lock never approves anything.') + '</div>';
  }

  /* ---------- the chat ---------- */
  function netCard(ctx, id) {
    var T = ctx.W.T;
    return K.ccard({ id: id, chip: K.chip('Net worth · household'), h: '<span class="pv5-talk-big">' + G(T.net_gbp) + '</span>', sub: K.inr(T.net_inr) + ' at ' + FXT + ' · the Fri 23 Oct close',
      body: K.kv('Own', G(T.own_gbp)) + K.kv('Owe', G(T.owe_gbp)) + K.kv('Liquid now', G(T.liquid_gbp)),
      acts: [K.cbtn('Open Home', 'nav:home', 'ghost', 'home')],
      fold: { t: 'Technical', go: 'fold:t1', open: ctx.has('t1'), body: 'get_networth(view: household) · 16 assets, 4 debts<br>prices at the Fri 23 Oct close · ECB rate of Fri 23 Oct<br>run r-1232 · 3 model calls · ' + U(0.021, 3) } });
  }
  function checkinCard() {
    return K.ccard({ chip: K.chip('Check-ins') + '<span class="mp-foot mp-ink2">2 valuations</span>', h: 'Are these still about right?',
      body: K.kv('<span class="fx col"><span>Home, Reading</span><span class="mp-foot mp-ink2">Due Fri 30 Oct</span></span>', G(415000)) + K.kv('<span class="fx col"><span>Flat, Pune</span><span class="mp-foot mp-ink2">Due since 15 Jul · overdue</span></span>', K.inr(11000000)) + '<span class="mp-foot mp-ink2">Both still right saves each figure as today’s valuation, exactly as shown.</span>',
      acts: [K.cbtn('Both still right', 'ci:both', 'primary'), K.cbtn('One by one', 'ci:one')] });
  }
  var DUE_T = 'Two things this week: the valuation of Home, Reading is due on Fri 30 Oct, and October’s budget closes on Sun 1 Nov, the day the Barclaycard statement comes.';
  var PUNE_T = 'Flat, Pune: its valuation has been due since 15 Jul. It is the second figure in this morning’s 09:00 check-in; One by one takes you to it.';
  function dueCard() {
    return K.ccard({ chip: K.chip('This week · asks you'), body: '<div class="pv5-talk-cardrows">' + K.row({ icon: 'home_work', t: 'Home, Reading', s: 'Valuation due Fri 30 Oct · asked today at 09:00' }) + K.row({ icon: 'receipt_long', t: 'October’s budget', s: 'Closes Sun 1 Nov, with the Barclaycard statement' }) + '</div>' });
  }
  function offlineBan() { return '<div class="pv5-talk-ban">' + K.ms('cloud_off') + '<span>You’re offline. The figures here are as last loaded at 09:34, and what you type waits here and sends by itself when you’re back.</span></div>'; }
  /* Arun's conversation, Mon 26 Oct, phase 1: stage 0 signed in, 1 the first answer, 2 streaming, 3 offline, 4 back */
  function p1Chat(ctx, stage) {
    if (ctx.viewer === 'asha') return ashaChat(ctx);
    var out = [K.daysep('Today 09:00'), K.ai('', { cards: [checkinCard()] })];
    if (stage >= 1) out.push(K.daysep('09:32'), K.me('What are we worth today?', '09:32'), K.ai('Here is the household at the Fri 23 Oct close, after what you owe.', { cards: [netCard(ctx, 'pv5-talk-net')], meta: 'Figures: the engine, through get_networth' }));
    if (stage === 2) out.push(K.me('What’s due this week?', '09:34'), K.ai('Two things this week: the valuation of Home, Reading is due on Fri 30 Oct, and October’s<span class="caret"></span>', { meta: 'Writing · the card follows whole when the words end', icon: 'stream' }));
    if (stage >= 3) out.push(K.me('What’s due this week?', '09:34'), K.ai(DUE_T, { cards: [dueCard()], meta: 'From the registry: what is due, through get_commitments' }));
    if (stage === 3) out.push(K.me('And the Pune flat?', 'Waiting · sends when you’re back online'), offlineBan());
    if (stage >= 4) out.push(K.me('And the Pune flat?', 'Sent at 09:36, when the connection came back'), K.ai(PUNE_T, { meta: 'From the registry: what is due, through get_commitments' }));
    return out;
  }
  function ashaChat(ctx) {
    var out = [K.daysep('Today 08:12'), K.me('When does my saver mature?', '08:12'),
      K.ai('Your fixed-rate saver at Nationwide matures on Mon 14 Dec.', { cards: [K.ccard({ chip: K.chip('Matures Mon 14 Dec'), h: 'Fixed-rate saver · Nationwide', body: K.kv('Now', G(10000)) + K.kv('At maturity, with its interest', G(10460)) })], meta: 'From the registry: what is due, through get_commitments' })];
    return out;
  }
  /* Arun's conversation, phase 8: the tail from 09:52, the audit question, and the Admin center's messages */
  function p8Chat(ctx) {
    if (ctx.viewer === 'asha') return ashaChat(ctx);
    var out = [K.daysep('Today 09:52'), K.ai('Saved as a correction, your estimate. Net worth is now ' + G(ctx.W.T.net_gbp) + ', the engine’s figure. The next valuation check-in is in six months.', { meta: 'From your correction on the page', icon: 'edit' })];
    out.push(K.daysep('09:59'), K.me('What changed today?', '09:59'), K.ai('Three rows in the audit log today:', {
      cards: [K.ccard({ chip: K.chip('Audit · today'), body: '<div class="pv5-talk-cardrows">' + K.row({ icon: 'edit', t: '09:52 · Home, Reading', s: G(415000) + ' → ' + G(428000) + ', your estimate, in place' }) +
        K.row({ icon: 'add_circle', t: '09:41 · Instant access savings · Monzo', s: 'New, ' + G(5000) + ', from your message' }) + K.row({ icon: 'bookmark', t: '09:32 · A note MyPaisa keeps', s: 'How you like answers; no figure in it' }) + '</div>',
        acts: [K.cbtn('Open in Audit', 'nav:audit', 'ghost', 'receipt_long')] })], meta: 'From the audit log, through get_audit' }));
    if (ashaWasPaused(ctx)) out.push(K.daysep('10:07'), K.ai('', { cards: [K.ccard({ chip: K.chip('Members', 'mp-pause'), h: 'Asha paused', body: K.kv('When', 'Mon 26 Oct, 10:07') + K.kv('Checked', 'Sign in with Apple, Face ID') + K.kv('Her devices', 'Signed out') + '<span class="mp-foot mp-ink2">Audit: Member paused · Asha</span>' })] }));
    if (ashaRestored(ctx)) out.push(K.ai('', { cards: [K.ccard({ chip: K.chip('Members', 'mp-add'), h: 'Asha restored', body: K.kv('When', 'Mon 26 Oct, 10:07') + K.kv('Checked', 'Sign in with Apple, Face ID') + '<span class="mp-foot mp-ink2">She signs in as before. Audit: Member restored · Asha</span>' })] }));
    if (replayed(ctx)) out.push(K.daysep('10:12'), K.ai('', { cards: [K.ccard({ chip: K.chip('Failed work', 'mp-add'), h: 'Replayed 1 job', body: K.kv('Job', 'Prices · Silver ETC') + K.kv('Ran', '10:12, priced at the Fri 23 Oct close') + '<span class="mp-foot mp-ink2">Nothing changed: the 07:00 run had priced it. Audit: Replayed · 1 job</span>' })] }));
    return out;
  }

  /* ---------- phase 0: the home screen, and About ---------- */
  function appIcon(dev) { return '<span class="appicon appicon-default"><span class="mark"></span>' + (dev ? '<span class="devband">DEV</span>' : '') + '</span>'; }
  function homeScreen(ctx) {
    if (ctx.web) return null;
    var ph = function (t) { return '<span class="pv5-talk-app" aria-hidden="true"><span class="pv5-talk-ph"></span><span>' + t + '</span></span>'; };
    return '<div class="pv5-talk-sys lock"><div class="pv5-talk-hs">' +
      '<button type="button" class="pv5-talk-app"' + K.go('sys:open') + '><span class="pv5-talk-ic">' + appIcon(false) + '</span><span>MyPaisa</span></button>' +
      '<button type="button" class="pv5-talk-app"' + K.go('sys:dev') + '><span class="pv5-talk-ic">' + appIcon(true) + '</span><span>MyPaisa Dev</span></button>' +
      ph('Mail') + ph('Calendar') + ph('Photos') + ph('Maps') + ph('Notes') + ph('Settings') + '</div>' +
      '<div class="pv5-talk-hs-note"><div class="lg">' + '<span class="z1">MyPaisa holds the household’s records; MyPaisa Dev runs on synthetic data, from TestFlight, with its DEV band.</span><span class="z1">' + DRAFT + '</span></div></div></div>';
  }
  M.page('you', function (ctx, args) {
    if (args && args[0] === 'about') return fin(ctx, aboutPage(ctx));
    return fin(ctx, youPage(ctx));
  });
  function aboutPage(ctx) {
    var D = TD();
    if (!D) return null;
    var icons = '<div class="pv5-talk-icons"><div>' + appIcon(false) + '<span class="mp-sub" style="font-weight:600">MyPaisa</span><span class="mp-foot mp-ink2">The household’s own records. TestFlight group ' + q(D.envs[0].tf) + ', for the household.</span></div>' +
      '<div>' + appIcon(true) + '<span class="mp-sub" style="font-weight:600">MyPaisa Dev</span><span class="mp-foot mp-ink2">Synthetic data. TestFlight group ' + q(D.envs[1].tf) + ', for Arun alone.</span></div></div>';
    var envs = D.envs.map(function (e) {
      return K.row({ icon: e.env === 'prod' ? 'verified' : 'science', t: e.app + ' · ' + e.env, s: e.web + ' · ' + e.api + '<br>' + e.data.charAt(0).toUpperCase() + e.data.slice(1) + '; ' + e.ship + '.' });
    });
    var doors = [['laptop_mac', 'The web app on a laptop', 'dashboard.mypaisapp.com, installable; the chat beside every page'],
      ['smartphone', 'The web app on a phone', 'The same pages at phone width; the chat is a tab'],
      ['phone_iphone', 'The iPhone', 'Chat · Home · Activity · You, with Search; the chat is a tab'],
      ['tablet_mac', 'The iPad', 'The sidebar and the screen; the chat beside them in landscape'],
      ['devices_fold', 'The foldable, open', 'The tab bar at the top; the chat a sheet away']].map(function (d) { return K.row({ icon: d[0], t: d[1], s: d[2] }); });
    var body = pg(cols(
      K.card({ t: 'The app', r: DRAFT, body: icons + '<div style="height:12px"></div>' + K.foot('The 1c Watcher mark (MA-103) in Apple’s layered format; MyPaisa Dev carries the coral DEV band (MA-20).') }) +
      K.card({ id: 'pv5-about-env', t: 'Two environments, one AWS account', body: K.list(envs) + K.foot('Every part twice, mypaisa-dev-… and mypaisa-prod-…, each tagged with its environment; Terraform makes every one of them.') }),
      K.card({ id: 'pv5-about-doors', t: 'Every door', body: K.list(doors) + K.foot('One app, laid out by the window’s width: the chat beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over).') }) +
      K.card({ t: 'One conversation each', body: K.p('Arun and Asha each have one conversation, the same at every door: a flow started on the laptop finishes on the phone.') })));
    return { title: 'About MyPaisa', sub: 'What MyPaisa is, and where it runs', back: { t: 'You', go: 'nav:you' }, chip: DRAFT, body: body };
  }

  /* ---------- phase 1: sign in ---------- */
  function welcome(ctx) {
    if (ctx.web) return null;
    return '<div class="pv5-talk-wel">' + appIcon(false) + '<span class="mp-t2" style="margin-top:6px">MyPaisa</span>' +
      '<p class="mp-sub mp-ink2" style="margin:0;max-width:300px">Everything your household owns and owes, in one calm place.</p><div style="height:18px"></div>' +
      '<div class="pv5-talk-si-box">' + appleBtn('si:apple', ctx.has('apple') ? '' : ' pnext') + googleBtn('si:google') +
      '<p class="mp-foot mp-ink2" style="margin:4px 0 0">No password. Your household’s records stay private.</p>' + DRAFT + '</div></div>';
  }
  page('signin', function (ctx) {
    var hero = '<div class="pv5-talk-si-hero"><div class="pv5-talk-brand"><span class="ai-mark"><i></i></span><span>MyPaisa</span></div>' +
      '<div class="fx col g12"><h2 class="pv5-talk-hero-h">Everything your household owns and owes, in one calm place.</h2>' +
      '<p class="mp-sub pv5-talk-hide-s" style="margin:0;max-width:440px">The UK and India together, kept up to date by talking to MyPaisa. The chat is here too, beside every page.</p></div>' +
      '<span class="mp-foot pv5-talk-hide-s" style="color:var(--mp-hero-ink-2)">Illustrative figures and names</span></div>';
    var form = '<div class="pv5-talk-si-form"><div class="pv5-talk-si-box"><div class="fx ac jb wrap g8"><span class="mp-t2">Sign in</span>' + DRAFT + '</div>' +
      '<p class="mp-sub mp-ink2" style="margin:0 0 6px">With the account you use in the MyPaisa app.</p>' + appleBtn('si:apple', ctx.has('apple') ? '' : ' pnext') + googleBtn('si:google') +
      '<button type="button" class="pv5-talk-sib pk"' + K.go('si:passkey') + '>' + K.ms('passkey') + '<span>Sign in with a passkey</span></button>' +
      K.note('key', 'No password. A passkey works after your first sign-in with Apple or Google.') +
      K.note('mail', 'New here? MyPaisa is by invite: ask the household’s owner for a link.') +
      '<button type="button" class="btn-reset fx ac g6 mp-sub" style="min-height:44px;color:var(--mp-accent)"' + K.go('si:get') + '>' + K.ms('phone_iphone') + '<span>Get MyPaisa for iPhone</span></button></div></div>';
    return { title: 'Sign in', body: '<div class="pv5-talk-bare"><div class="pv5-talk-si">' + hero + form + '</div></div>' };
  });

  /* ---------- Activity and a run (MA-196; the schedule, spend and alarms of MA-71) ---------- */
  function runShown(ctx, r) { return ctx.viewer !== 'asha' || r.who !== 'arun'; }
  function outcome(r) { return r.kind === 'job' ? 'Done' : r.id === 'r-1235' ? 'Saved' : 'Answered'; }
  function runSub(ctx, r) {
    if (r.kind === 'job') return maskText(r.sub);
    if (r.who === 'asha' && ctx.viewer !== 'asha') return r.sub;
    var s = q(maskText(r.words)) + (r.id === 'r-1234' ? ' · typed offline, sent 09:36, the reply by push' : r.id === 'r-1235' ? ' · saved 09:41' : '');
    if (r.note && r.who === ctx.viewer) s += '<br>MyPaisa noted: ' + q(r.note);
    return s;
  }
  function cycleCard(ctx) {
    var D = TD(), sp = spendAt(ctx), S = D.spend;
    return K.card({ t: 'Claude this cycle', r: '<span class="mp-foot mp-ink2">renews ' + S.renews + '</span>', body:
      '<div class="fx ac g8 wrap" style="align-items:baseline"><span class="pv5-talk-big">' + U(sp.dollars) + '</span><span class="mp-sub mp-ink2">of the ' + U(S.ceiling) + ' ceiling · ' + sp.pct + '%</span></div>' +
      meter(sp.total / S.ceiling, [70, 85, 95]) + K.note('stairs', 'Step: Normal, under 70%. Nothing is held back.') + '<div style="height:10px"></div>' +
      K.kv('AWS and others', G(D.aws.spent) + ' of ' + G(D.aws.cap) + ' · ' + Math.round(D.aws.spent / D.aws.cap * 100) + '%') });
  }
  page('activity', function (ctx) {
    var D = TD();
    if (!D) return null;
    var c = cut(ctx), asha = ctx.viewer === 'asha';
    var rs = D.runs.filter(function (r) { return r.iso <= c && runShown(ctx, r); });
    var sum = 0, done = 0;
    var rows = rs.map(function (r) {
      var running = r.iso_end > c;
      if (!running) { sum += parseFloat(r.cost3); done++; }
      var mine = r.who === ctx.viewer;
      return K.row({ lead: '<span class="pv5-talk-tm">' + r.tm + '</span>', t: r.name, s: runSub(ctx, r) + '<br>' + r.line + (r.tools.length ? '<br><span class="pv5-talk-tools">' + r.toolnames + '</span>' : ''),
        v: r.calls.length ? U(parseFloat(r.cost3), 3) : U(0, 2), vs: running ? 'Running' : outcome(r), go: r.calls.length && (mine || !asha) ? 'nav:run/' + r.id : null, id: 'pv5-run-' + r.id });
    });
    if (sameDay(ctx, '2026-10-26T00:00')) rows.push(K.row({ lead: '<span class="pv5-talk-tm">21:00</span>', t: 'Prices', s: 'Scheduled, not run yet<br>Due at 21:00', v: '', vs: 'Due' }));
    var runsC = K.card({ t: 'Today’s runs', r: '<span class="mp-foot mp-ink2">' + done + ' done · 1 due · ' + U(Math.round(sum * 1000) / 1000, 3) + ' so far</span>', body:
      '<div class="pv5-talk-seg" role="group">' + '<button type="button" class="' + (asha ? '' : 'on') + '"' + K.go('seg:all') + '>' + (asha ? 'Mine and the household’s' : 'Everyone’s runs') + '</button><button type="button"' + K.go('seg:mine') + '>Mine</button></div>' +
      K.list(rows) + K.foot(asha ? 'You see your own runs and the household’s jobs.' : 'Asha’s runs show their cost and tools, never her words. Costs come from the API’s own token counts.') });
    var fr = HH().assets ? ['balanced', 'nasdaq', 'robotics', 'silver', 'ppfas', 'infosys'].map(function (id) { return HH().assets.filter(function (a) { return a.id === id; })[0].name.replace(' · Direct Growth', '').replace(' (BlackRock MyMap 5)', ''); }) : [];
    var sched = K.card({ t: 'Schedule and price freshness', r: '<span class="mp-foot mp-ink2">UK time</span>', body:
      K.list([['Prices', '07:00', '21:00'], ['Nightly views', '01:00', 'Tue 27 Oct 01:00'], ['Check-ins', '09:00', 'Tue 27 Oct 09:00'], ['Saturday review', 'Sat 24 Oct 09:00', 'Sat 31 Oct 09:00']].map(function (s) {
        return K.row({ t: s[0], s: 'Last ' + s[1] + ' · next ' + s[2] }); })) +
      K.note('check', '6 priced at the Fri 23 Oct close: ' + fr.join(', ') + '.') + K.note('remove', 'Monzo pot and the savings: cash, no price.') });
    var alarms = asha ? '' : K.card({ t: 'Alarms, last 7 days', r: '<span class="mp-foot mp-ink2">0 red · 1 amber</span>', body:
      K.row({ icon: 'warning', t: 'Amber · Fri 23 Oct, 21:52', s: 'Silver ETC’s 21:00 price ingest failed 5 times. ' + (replayed(ctx) ? 'Replayed by Arun at 10:12; it ran.' : 'Waiting in Failed work, in the Admin center.') }) });
    var body = pg(cols(runsC + sched + alarms, cycleCard(ctx), true));
    return { title: 'Activity', sub: 'What MyPaisa did today, ' + dlabel(ctx.t) + ', to ' + ctx.tm + ' · UK time', chip: DRAFT, right: K.btn('Audit', 'nav:audit', 'tinted small', 'receipt_long'), body: body };
  });

  var STEPS = {
    'r-1230': [['08:12:05', 'Trigger', 'Asha wrote a message.', 0], ['08:12:06', 'get_commitments', 'Code read her commitments: the saver matures Mon 14 Dec.', 1], ['08:12:09', 'Reply', 'Streamed word by word; the card followed whole.', 0], ['08:12:14', 'Stream', 'To Asha’s iPhone.', 0]],
    'r-1232': [['09:32:04', 'Trigger', 'Arun wrote “What are we worth today?” in the web app.', 0], ['09:32:05', 'get_networth', 'Code read the household view: 16 assets and 4 debts at the Fri 23 Oct close.', 1],
      ['09:32:07', 'Reply', 'The words streamed in; the card followed whole, every figure from the tool.', 0], ['09:32:09', 'memory', 'Noted in Arun’s notes: “Wants the household’s figure first, then his own.” No figure in it.', 1], ['09:32:11', 'Stream', 'The card reached every open door.', 0]],
    'r-1233': [['09:34:10', 'Trigger', 'Arun wrote “What’s due this week?”', 0], ['09:34:11', 'get_commitments', 'Code read the commitments from Mon 26 Oct to Sun 1 Nov: two ask you.', 1], ['09:34:13', 'Reply', 'Streamed word by word; the card came whole after the words.', 0], ['09:34:17', 'Stream', 'Done at every open door.', 0]],
    'r-1234': [['09:35:40', 'Typed offline', 'Arun typed “And the Pune flat?” on his iPhone; it waited there.', 0], ['09:36:58', 'Sent', 'The connection came back; it sent by itself.', 0], ['09:36:59', 'get_commitments', 'Code read Flat, Pune’s check-in: due since 15 Jul.', 1],
      ['09:37:05', 'Push', 'MyPaisa was closed on the iPhone, so the reply went by push, with no amount.', 0]],
    'r-1235': [['09:40:12', 'Trigger', 'Arun wrote “£5,000 in Monzo savings”.', 0], ['09:40:15', 'draft_record', 'Code typed the draft against the savings account kind: Monzo, £5,000 in pounds, UK, instant access. Missing: whose.', 1],
      ['09:40:16', 'ask_user', '“Whose is it?” with Arun, Asha and Joint.', 1], ['09:40:58', 'Answer', 'Arun tapped his own name.', 0], ['09:41:01', 'propose_change', 'The draft, hashed and held, owner Arun, all of it. The Confirm card went to the chat.', 1],
      ['09:41:20', 'Confirm', 'Arun tapped Confirm. The write service checked the hash, then saved the record, its first event and the audit row.', 0], ['09:41:20', 'Stream', 'records.changed went out; Home moved at every door.', 0]],
    'r-1237': [['09:43:02', 'Trigger', 'Arun wrote “What can we get at quickly now?”', 0], ['09:43:03', 'get_networth', 'Code read the liquid view: £37,596 now, £32,596 before the new savings.', 1], ['09:43:09', 'Stream', 'The words, then the card.', 0]],
    'r-1240': [['09:59:20', 'Trigger', 'Arun wrote “What changed today?”', 0], ['09:59:21', 'get_audit', 'Code read today’s audit rows for the household: 3.', 1], ['09:59:27', 'Stream', 'The words, then the card with Open in Audit.', 0]]
  };
  /* figures in a step's text go through the masks */
  function maskText(t) { return t.replace(/[£₹$€][\d,]+(?:\.\d+)?/g, function (m) { return '<span class="mny">' + m + '</span>'; }); }
  page('run', function (ctx, args) {
    var D = TD();
    if (!D) return null;
    var r = run(args && args[0] || 'r-1235');
    if (!r) return null;
    var hidden = r.who === 'asha' && ctx.viewer !== 'asha', notYours = ctx.viewer === 'asha' && r.who === 'arun';
    var back = { t: 'Activity', go: 'nav:activity' };
    if (notYours) return { title: 'Not your run', back: back, chip: DRAFT, body: K.card({ body: K.note('lock', 'This run is Arun’s. A member sees their own runs and the household’s jobs.') }) };
    var endT = r.end.slice(0, 5);
    var sum = K.card({ body: K.kv('Trigger', r.kind === 'job' ? 'Schedule, ' + r.tm : (hidden ? 'Asha’s message' : mem(r.who).name + '’s message') + ' at ' + r.t) + K.kv('Start → end', r.t + ' → ' + r.end + ' · ' + r.dur_s + ' s') +
      (r.calls.length ? K.kv('Where the time went', r.model_s + ' s model, ' + r.tool_s + ' s tools' + (r.wait_s ? ', ' + r.wait_s + ' s for Arun' : '')) : '') + K.kv('Outcome', r.outcome) +
      K.kv('Cost', U(parseFloat(r.cost3), 3) + ' · ' + r.tokK + ' tokens, ' + r.cachedK + ' cached') });
    var read = K.card({ t: 'What it read', body: K.list((r.read || []).map(function (x) { return K.row({ icon: 'menu_book', t: maskText(x) }); })) });
    var st = (STEPS[r.id] || []).map(function (s) {
      var t = hidden && s[1] === 'Trigger' ? 'Asha’s words stay hers.' : maskText(s[2]);
      return '<div class="pv5-talk-step"><span class="t">' + s[0] + '</span><div class="f1"><span class="' + (s[3] ? 'pv5-talk-mono' : 'mp-sub') + '" style="font-weight:600">' + s[1] + '</span><span class="mp-foot mp-ink2">' + t + '</span></div></div>';
    }).join('');
    var steps = K.card({ t: 'Steps · ' + (STEPS[r.id] || []).length, r: '<span class="mp-foot mp-ink2">UK time</span>', body: st });
    var calls = K.card({ t: 'Model calls · ' + r.calls.length, r: '<span class="mp-foot mp-ink2">' + U(parseFloat(r.cost3), 3) + ' in all</span>', body: K.list(r.calls.map(function (c, i) {
      return K.row({ t: (i + 1) + ' · ' + c.m + ' · ' + c.what, s: 'in ' + K.num(c.in) + ' · cached ' + K.num(c.cached) + ' · out ' + K.num(c.out) + ' · ' + c.s + ' s', v: U(parseFloat(c.cost3), 3) }); })) +
      K.foot('Tokens from the API’s own usage counts; the cost from the price table, in dollars as the plan’s credit is.') });
    var tools = K.card({ t: 'Tool calls · ' + r.tools.length, r: '<span class="mp-foot mp-ink2">all code</span>', body: K.list(r.tools.map(function (x) {
      return K.row({ t: '<span class="pv5-talk-mono">' + x[0] + '</span>', v: x[1] + ' ms' + (x[0] === 'ask_user' ? ', then 42 s for Arun' : ''), vs: 'ok' }); })) });
    var sent = K.card({ t: r.id === 'r-1235' ? 'What it proposed' : 'What it sent', r: r.id === 'r-1235' ? '<span class="mp-foot mp-ink2">1 card</span>' : '', body: r.id === 'r-1235' ?
      K.kv('Record', 'Instant access savings · Monzo') + K.kv('Whose', 'Arun, all of it') + K.kv('Balance', G(5000) + ', from his message') + K.kv('Where', 'UK · pounds') + K.kv('Get at it', 'any time') + K.foot('Confirmed by Arun at 09:41:20. Nothing else was proposed.') :
      K.p(maskText(r.sent)) + (r.note && !hidden ? K.note('bookmark', 'One note written, shown here and in You: ' + q(r.note) + '. A run that has read a file or a page writes none.') : '') });
    var tech = K.card({ t: 'Technical', body: '<span class="pv5-talk-tools">trace 1-671e3a40-' + r.id.slice(2) + 'c2f9d0e1b7a4 · build 214 · alias live · ' + r.id + '</span>' + K.foot('The trace opens from its run id in CloudWatch, with no prompt, figure or name in it.') });
    var left = sum + (r.calls.length ? read : '') + steps, right = (r.calls.length ? calls + tools : '') + (r.kind === 'job' ? '' : sent) + tech;
    return { title: r.name + ', ' + r.tm, sub: dlabel(ctx.t) + ' · ' + (r.kind === 'job' ? maskText(r.sub) : hidden ? 'Asha’s words stay hers' : q(maskText(r.words))) + ' · <span class="nowrap">run ' + r.id + '</span>', back: back,
      chip: K.chip(outcome(r) + ' ' + endT, r.id === 'r-1235' ? 'mp-add' : 'mp-neutral') + DRAFT, body: pg(cols(left, right)) };
  });

  /* ---------- You: privacy, notifications, what MyPaisa remembers (MA-288, draft), sign-in and devices ---------- */
  function youPage(ctx) {
    var D = TD();
    if (!D) return null;
    var me = mem(ctx.viewer), owner = ctx.isAdmin, here = thisDev(ctx), c = cut(ctx);
    var head = K.card({ body: '<div class="fx ac g12"><span class="pv5-talk-init" style="width:52px;height:52px;font-size:18px">' + me.init + '</span><div class="fx col f1"><span class="mp-hl">' + me.full + '</span><span class="mp-foot mp-ink2">' +
      (owner ? 'Owner · the Dutta household · the household’s one admin' : 'Member · the Dutta household') + '</span></div></div>' });
    var admin = owner ? K.group([K.row({ icon: 'admin_panel_settings', t: 'Admin center', s: 'Members, spend, caps and alerts. Only you see this row.', v: replayed(ctx) ? null : badge(1), go: 'nav:admin' })]) : '';
    var priv = K.card({ id: 'pv5-you-priv', t: 'Privacy and Face ID', r: DRAFT, body: K.group([
      swrow({ icon: 'visibility_off', t: 'Privacy mode', s: 'Hides every amount in cards, screens, charts and notifications; percentages stay. It acts at once, as /privacy does.', on: ctx.priv, go: 'priv' }),
      swrow({ icon: 'notifications', t: 'Show amounts in notifications', s: 'Off: the lock screen says what happened, never how much. Privacy mode keeps it off.', on: false, go: 'pref:amounts' }),
      ctx.app ? swrow({ icon: 'familiar_face_and_zone', t: 'Lock with Face ID', s: 'On opening, and after five minutes away. A comfort on this device only: it never approves a change.', on: true, go: 'pref:faceid' }) :
        K.row({ icon: 'laptop_mac', t: 'In a browser', s: 'No figure is kept on this computer; privacy mode hides pounds here too.' }),
      K.row({ icon: 'layers', t: 'The app switcher', s: 'MyPaisa shows only its mark there, never a figure.' })]) });
    var ntf = K.group([K.row({ icon: 'notifications_active', t: 'Notifications', s: 'Replies, check-ins and alerts; quiet hours 22:00 to 07:00', go: 'nav:notifications' })]);
    var ns = (D.notes[ctx.viewer] || []).filter(function (n) { return n.t <= c; }), hs = D.notes.household.filter(function (n) { return n.t <= c; });
    var noteRow = function (n, whose) {
      return '<div class="pv5-talk-ar"><span class="pv5-talk-init mk"><span class="ms" style="font-size:16px">bookmark</span></span><div class="f1"><span class="mp-sub" style="font-weight:600">' + q(n.text) + '</span><span class="mp-foot mp-ink2">' + whose + ' · written ' + when(ctx, n.t) + ' · <span class="pv5-talk-nw">run ' + n.run + '</span></span>' +
        '<div class="fx g8 wrap">' + K.btn('Correct', 'mem:fix', 'plain small', 'edit') + K.btn('Forget', 'mem:forget', 'plain small', 'delete') + '</div></div></div>';
    };
    var memo = K.card({ id: 'pv5-you-mem', t: 'What MyPaisa remembers', r: DRAFT, body:
      '<div class="pv5-talk-day">Yours · read only in your own conversations</div>' + ns.map(function (n) { return noteRow(n, 'Your note'); }).join('') +
      '<div class="pv5-talk-day">The household’s · read in everyone’s</div>' + hs.map(function (n) { return noteRow(n, owner ? 'The household’s note; you correct or forget it' : 'The household’s note; Arun corrects or forgets it'); }).join('') +
      K.foot('Nothing is added here: a new note comes only from the chat. A note never holds a figure, a record, a setting or anyone else’s detail; every note written is an audit row and a line in Activity. Correct shows before and after, with Save; Forget asks for Confirm.') });
    var ways = K.list(me.ways.map(function (w) {
      return K.row({ lead: w[0] === 'Passkey' ? icontile('passkey') : '<span class="pv5-talk-g" style="width:32px;height:32px">' + w[0].charAt(0) + '</span>', t: w[0], s: w[1], v: w[0] === 'Passkey' ? K.btn('Add', 'way:add', 'tinted small') : K.ms('check', 'mp-ink2') });
    }));
    var devs = D.devices.filter(function (d) { return d.member === ctx.viewer && (!d.signed_out || !out13(ctx)); }).map(function (d) {
      var isHere = d.id === here, s = d.model + ' · ';
      if (isHere) s += 'this ' + (d.door === 'fold' ? 'foldable' : d.icon === 'tablet_mac' ? 'iPad' : 'iPhone') + ' · now';
      else if (d.paused_out && ashaWasPaused(ctx) && !(d.back_in && c >= d.back_in)) s += 'signed out at ' + hm(d.paused_out) + ' · signs in again when next opened';
      else s += 'last seen ' + when(ctx, latest(ctx, d.seen) || d.seen[0]);
      var act = isHere ? '' : d.signed_out ? K.btn('Sign out', 'you:out13', 'tinted small' + (ctx.t === T_OUT13 ? '' : ''), 'logout') : K.btn('Sign out', 'dev:out', 'tinted small', 'logout');
      return K.row({ icon: d.icon, t: d.name, s: s, v: act || null });
    });
    if (ctx.t === T_OUT13 && ctx.has('out13') && ctx.viewer === 'arun') devs.push(okbox('check_circle', 'Arun’s old iPhone, an iPhone 13 last seen Sun 4 Oct, signed out just now: its session ended and its push token was removed. It needed no second check, since it only takes access away.'));
    var web = D.browsers.filter(function (b) { return b.member === ctx.viewer; }).map(function (b) {
      return b.name + ', with ' + b.via + ', ' + (b.id === here ? 'this browser, now' : when(ctx, latest(ctx, b.seen) || b.seen[0]));
    });
    var dev = K.card({ id: 'pv5-you-dev', t: 'Sign-in and devices', r: DRAFT, body: '<div class="pv5-talk-day">Devices</div>' + K.list(devs) + (web.length ? K.foot('Also signed in to the web app: ' + web.join('; ') + '.') : '') +
      '<div style="height:8px"></div>' + K.btn('Sign out of all other devices', 'dev:all', 'tinted', 'devices') +
      '<div class="pv5-talk-day">Ways in</div>' + ways + K.foot('Add runs a fresh sign-in with that account and links it, with an audit row; no second check (MA-77).') });
    var leave = owner ? K.card({ body: K.row({ icon: 'logout', t: 'Leave the household', s: 'You are the only owner, so you can’t leave it. To stop every scheduled message instead, use Pause MyPaisa.' }) }) :
      K.card({ body: '<button type="button" class="mp-row rowbtn"' + K.go('you:leave') + '>' + '<span class="mp-icontile" style="background:var(--mp-alert-bg);color:var(--mp-alert)">' + K.ms('logout') + '</span><div class="f1 fx col"><span class="mp-sub" style="font-weight:600;color:var(--mp-alert)">Leave the household</span><span class="mp-foot mp-ink2">Your sign-in is deleted; your accounts and their history stay with the household. Asks for the second check.</span></div>' + K.ms('chevron_right', 'mp-ink2') + '</button>' });
    var about = K.group([K.row({ icon: 'info', t: 'About MyPaisa', s: 'Where it runs, and the doors', go: 'nav:you/about' })]);
    return { title: 'You', sub: me.name + ' · ' + (owner ? 'owner' : 'member') + ' · signed in with Apple', chip: DRAFT,
      body: pg(cols(head + admin + priv + ntf + about, memo + dev + leave)) };
  }

  page('notifications', function (ctx) {
    var D = TD();
    if (!D) return null;
    var last = ctx.t >= '2026-10-26T09:37' ? K.card({ id: 'pv5-ntf-last', t: 'The last one', r: '<span class="mp-foot mp-ink2">today 09:37</span>', body:
      '<div class="notif" style="background:var(--mp-surface-2)"><div class="notif-ic"><span class="ai-mark" style="margin:0"><i></i></span></div><div class="notif-b"><div class="notif-t"><span>MyPaisa</span><span>09:37</span></div><span>The Pune flat’s valuation has been due since 15 Jul. Tap to see its check-in.</span></div></div>' +
      K.note('phone_iphone', 'Sent by push to ' + (ctx.door === 'ios' ? 'this iPhone' : 'Arun’s iPhone') + ', where MyPaisa was closed, with no amount on it. ' + (ctx.web ? 'This browser had MyPaisa open, so the reply came here over the stream instead: a door with MyPaisa open never gets a push, so nothing arrives twice.' : 'A door with MyPaisa open gets it over the stream instead, never twice.')) }) : '';
    var what = K.card({ t: 'What arrives', body: K.list([
      K.row({ icon: 'chat', t: 'Replies', s: 'A reply that finishes while MyPaisa is closed comes as a push' }),
      K.row({ icon: 'event_available', t: 'Check-ins', s: 'On their day, at 09:00, with the card waiting in the chat' }),
      K.row({ icon: 'warning', t: 'Alerts', s: 'Red: time-sensitive, with sound. Amber: quiet. ' + (ctx.isAdmin ? 'System alerts reach you as the admin.' : 'System alerts go to the household’s admin.') })]) });
    var lock = K.card({ t: 'On the lock screen', body: K.group([swrow({ icon: 'lock', t: 'Show amounts', s: 'Off: what happened, never how much. Privacy mode keeps it off.', on: false, go: 'pref:amounts' })]) });
    var quiet = K.card({ t: 'Quiet hours', body: K.kv('Push', '22:00 to 07:00') + K.foot('Everything waits but a critical alert. A switch or a time here opens its card in the chat, to Confirm; nothing changes until then.') });
    var wp = K.card({ t: 'Web Push', body: K.p('On for the installed web app on Chrome on a MacBook Air. It arrives only when no MyPaisa page is open, under the same rule: no amount unless you choose.') });
    return { title: 'Notifications', sub: 'What MyPaisa sends, and how', back: { t: 'You', go: 'nav:you' }, chip: DRAFT, body: pg(cols(last + what, lock + quiet + wp)) };
  });

  /* ---------- Audit, Files and a file (MA-79, MA-149) ---------- */
  function auditRows(ctx) {
    var D = TD(), c = cut(ctx), asha = ctx.viewer === 'asha';
    return D.audit.filter(function (e) { return e.t <= c && (!asha || e.acct === 'asha' || e.acct === 'joint'); });
  }
  function fileById(id) { var D = TD(); return D.files.filter(function (f) { return f.id === id; })[0]; }
  function fileLine(f, ring) {
    return '<div class="pv5-talk-file"><span class="pv5-talk-thumb' + (f.img ? '' : ' doc') + '">' + K.ms(f.icon) + '</span><div class="f1"><span class="mp-sub" style="font-weight:600;overflow-wrap:anywhere">' + f.name + '</span><span class="mp-foot mp-ink2">' + f.kind + ' · ' + f.ext + ' · ' + kb(f.kb) + '</span></div>' +
      '<button type="button" class="mp-btn mp-btn-tinted mp-btn-small' + (ring ? ' pnext' : '') + '"' + K.go('nav:file/' + f.id) + '>' + K.ms('visibility') + '<span>Open</span></button></div>';
  }
  function kb(n) { return n >= 1000 ? (n / 1024).toFixed(1) + ' MB' : n + ' KB'; }
  function change(e) {
    if (e.before != null || e.after != null) return (e.before == null ? 'new' : G(e.before)) + ' → ' + G(e.after) + (e.note ? ', ' + e.note : '');
    if (e.after_inr != null) return 'new → ' + K.inr(e.after_inr) + (e.note ? ' ' + e.note : '');
    if (e.before_t) return e.before_t + ' → ' + e.after_t;
    return e.note || '';
  }
  page('audit', function (ctx) {
    var D = TD();
    if (!D) return null;
    var rows = auditRows(ctx), days = [], by = {};
    rows.forEach(function (e) { var d = e.t.slice(0, 10); if (!by[d]) { by[d] = []; days.push(d); } by[d].push(e); });
    var list = days.map(function (d) {
      return '<div class="pv5-talk-day">' + (sameDay(ctx, d + 'T00:00') ? 'Today · ' : '') + dlabel(d + 'T00:00') + '</div>' + by[d].map(function (e) {
        var who = e.who === 'mypaisa' ? 'MyPaisa' : mem(e.who).name, f = e.file ? fileById(e.file) : null;
        return '<div class="pv5-talk-ar"' + (e.file === 'monzo-pot' ? ' id="pv5-talk-pot"' : '') + '>' + init(e.who) + '<div class="f1"><span class="mp-foot mp-ink2">' + who + ' · ' + hm(e.t) + ' · ' + e.rec + '</span><span class="mp-sub" style="font-weight:600">' + e.what + '</span>' +
          '<span class="mp-sub">' + change(e) + '</span><span class="mp-foot mp-ink2">via ' + e.via + (e.run ? ' · <button type="button" class="btn-reset" style="color:var(--mp-accent);min-height:24px"' + K.go(e.run >= 'r-1228' ? 'nav:run/' + e.run : 'run:old') + '>' + e.run + '</button>' : '') + '</span>' +
          (f ? fileLine(f) : '') + '</div></div>';
      }).join('');
    }).join('');
    var nfile = rows.filter(function (e) { return e.file; }).length, nopen = rows.filter(function (e) { return e.rec === 'File opened'; }).length;
    var body = pg(fakeFilters([ctx.viewer === 'asha' ? 'Asha and the household' : 'Everyone', 'All records', 'Last 7 days']) +
      K.card({ t: 'The audit log', r: '<span class="mp-foot mp-ink2">' + rows.length + ' rows · ' + nfile + ' from a file' + (nopen ? ' · ' + nopen + ' opening' : '') + '</span>', body:
        K.note('verified', 'Hash chain verified by the weekly check, today 07:00: no row has been edited or removed since it was written.') + list +
        K.foot(ctx.viewer === 'asha' ? 'You see the rows for your own accounts and the household’s records; Arun, the owner, sees every row.' : 'Nothing here can change a record or a file: every change starts as a card and a Confirm in the chat, or a Save in place, and lands here.') }));
    return { title: 'Audit', sub: 'Every change, who made it, how, and the run behind it · newest first', chip: DRAFT, tabs: [{ t: 'Changes', go: 'nav:audit', on: true }, { t: 'Files', go: 'nav:files' }], body: body };
  });
  page('files', function (ctx) {
    var D = TD();
    if (!D) return null;
    var c = cut(ctx), asha = ctx.viewer === 'asha';
    var fs = D.files.filter(function (f) { return f.sent <= c && (!asha || f.by === 'asha'); });
    var rows = fs.map(function (f) {
      var fed = f.fed.map(function (x) { return x.rec + ': ' + (x.before != null ? G(x.before) + ' → ' + G(x.after) : x.what.toLowerCase()); }).join('; ');
      return '<div class="pv5-talk-ar"><span class="pv5-talk-thumb' + (f.img ? '' : ' doc') + '">' + K.ms(f.icon) + '</span><div class="f1"><span class="mp-sub" style="font-weight:600;overflow-wrap:anywhere">' + f.name + '</span>' +
        '<span class="mp-foot mp-ink2">' + f.kind + ' · ' + kb(f.kb) + ' · ' + mem(f.by).name + ', ' + dlabel(f.sent) + '</span><span class="mp-foot">Fed ' + f.fed.length + (f.fed.length === 1 ? ' change: ' : ' changes: ') + fed + '</span></div>' +
        K.btn('Open', 'nav:file/' + f.id, 'tinted small', 'visibility') + '</div>';
    }).join('');
    var mb = Math.round(fs.reduce(function (s, f) { return s + f.kb; }, 0) / 1024 * 10) / 10;
    return { title: 'Files', sub: 'Every file sent, kept for good · newest first', chip: DRAFT, tabs: [{ t: 'Changes', go: 'nav:audit' }, { t: 'Files', go: 'nav:files', on: true }],
      body: pg(fakeFilters(['Everyone', 'All kinds', 'Last 30 days']) + K.card({ t: 'Every file sent', r: '<span class="mp-foot mp-ink2">' + fs.length + ' · ' + mb + ' MB</span>', body: rows +
        K.foot('Kept for good, in a private store, before anything read them. ' + (asha ? 'You see the files you sent.' : 'Asha sees the files she sent; a viewer sees none.')) })) };
  });
  page('file', function (ctx, args) {
    var f = fileById(args && args[0] || 'monzo-pot');
    if (!f) return null;
    var until = '10:06';
    var fed = f.fed.map(function (x) { return K.row({ icon: 'history', t: x.rec + ' · ' + x.what, s: (x.before != null ? G(x.before) + ' → ' + G(x.after) + ' · ' : '') + dlabel(x.t) + ', ' + hm(x.t) + ' · <span class="pv5-talk-nw">' + x.run + '</span>' }); });
    var view = '<div class="pv5-talk-view"><span>' + (f.img ? 'The screenshot as sent: ' : 'The factsheet as sent, page 1 of ' + f.pages + ': ') + f.shows + '</span></div>';
    var left = K.card({ body: view + '<div style="height:12px"></div>' + K.note('timer', 'Opened through a link that works for five minutes, until ' + until + ', made after the role check: the member who sent it and the owner may open it. This opening is a row in the Audit log.') });
    var right = K.card({ t: 'The file', body: K.kv('Kind', f.kind + ' · ' + f.ext) + K.kv('Size', kb(f.kb)) + K.kv('Sent', 'by ' + mem(f.by).name + ', ' + dlabel(f.sent) + ' ' + hm(f.sent)) + K.kv('Kept', 'For good, before anything read it') }) +
      K.card({ t: 'Changes it fed', body: K.list(fed) }) + K.card({ body: K.note('lock', 'Read-only: a file cannot be deleted, renamed or replaced. To correct a figure, send a new file in the chat.') +
        '<div class="fx g8 wrap" style="margin-top:10px">' + (ctx.web ? K.btn('Download the original', 'file:dl', 'tinted small', 'download') : K.btn('Share', 'file:share', 'tinted small', 'ios_share')) + '</div>' });
    return { title: f.name, sub: (ctx.app ? 'Quick Look · ' : 'The browser’s viewer · ') + f.kind + ' from ' + mem(f.by).name, back: { t: 'Audit', go: 'nav:audit' }, chip: DRAFT,
      right: ctx.web ? K.btn('Search', 'nav:search', 'tinted small', 'search') : '', body: pg(cols(left, right)) };
  });

  /* ---------- Search (MA-180, draft) ---------- */
  function hl(t, w) { var i = t.toLowerCase().indexOf(w.toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<span class="pv5-talk-hl">' + t.slice(i, i + w.length) + '</span>' + t.slice(i + w.length); }
  page('search', function (ctx) {
    var D = TD();
    if (!D) return null;
    var S = D.search, c = cut(ctx), asha = ctx.viewer === 'asha', w = S.q;
    var recs = S.records.filter(function (r) { return (r.id !== 'monzo_savings' || c >= '2026-10-26T09:41') && (!asha || r.who === 'Joint' || r.who === 'Asha'); }).map(function (r) {
      return K.row({ icon: r.id === 'pot' ? 'savings' : r.id === 'balanced' ? 'candlestick_chart' : 'account_balance', t: hl(r.name, w), s: hl(r.who + ' · ' + r.s, w), v: G(r.v), go: 'nav:asset/' + r.id }); });
    var chg = auditRows(ctx).filter(function (e) { return /Monzo/.test(e.what); }).map(function (e) {
      return K.row({ icon: e.icon, t: hl(e.what, w), s: dlabel(e.t) + ', ' + hm(e.t) + ' · ' + e.rec + ' · ' + change(e) + ' · ' + (e.who === 'mypaisa' ? 'MyPaisa' : mem(e.who).name), go: 'nav:audit' }); });
    var fil = D.files.filter(function (f) { return /monzo/i.test(f.name) && f.sent <= c && (!asha || f.by === 'asha'); }).map(function (f) {
      return K.row({ icon: f.icon, t: hl(f.name, 'monzo'), s: f.kind + ' · ' + kb(f.kb) + ' · ' + mem(f.by).name + ', ' + dlabel(f.sent), go: 'nav:file/' + f.id }); });
    var ans = !asha && c >= '2026-10-26T' + S.answer.t ? [K.row({ icon: 'chat_bubble', t: 'Today ' + S.answer.t + ' · ' + q(S.answer.q), s: hl(S.answer.hit, w) + ' · ' + S.answer.run, go: 'tab:chat' })] : [];
    var sec = function (t, rows) { return rows.length ? K.card({ t: t, r: '<span class="mp-foot mp-ink2">' + rows.length + '</span>', body: K.list(rows) }) : ''; };
    var body = pg('<div class="pv5-talk-q">' + K.ms('search') + '<span class="f1">' + w + '<span class="caret"></span></span><button type="button" class="gbtn" aria-label="Clear"' + K.go('q:clear') + '>' + K.ms('cancel') + '</button></div>' +
      '<div class="pv5-talk-seg" role="group" style="align-self:flex-start;max-width:100%;overflow-x:auto">' + ['All', 'Records', 'Changes', 'Files', 'Answers'].map(function (x, i) { return '<button type="button" class="' + (i ? '' : 'on') + '"' + K.go('q:scope') + '>' + x + '</button>'; }).join('') + '</div>' +
      cols(sec('Records and holdings', recs) + sec('Changes', chg), sec('Files', fil) + sec('Your past answers', ans) +
        K.card({ body: K.note('lock', asha ? 'Within your rights: your own records and answers, and the household’s.' : 'Within your rights: as the owner, every record, change and file; past answers only from your own conversation.') })));
    return { title: 'Search', sub: 'Records, holdings, changes, files and your own past answers', chip: DRAFT, body: body };
  });

  /* ---------- the Admin center (owner only; every action behind the second check) ---------- */
  function refused(ctx) {
    return { title: 'Admin center', chip: DRAFT, body: K.card({ body: K.note('lock', 'Only the household’s owner sees the Admin center. Arun is the owner; the api refuses its routes to every other member, whatever a page shows.') }) };
  }
  var ABACK = { t: 'Admin center', go: 'nav:admin' };
  function devCount(ctx) { var D = TD(); return D.devices.filter(function (d) { return !d.signed_out || !out13(ctx); }).length; }
  page('admin', function (ctx, args) {
    var D = TD();
    if (!D) return null;
    if (!ctx.isAdmin) return refused(ctx);
    var sub = args && args[0];
    if (sub === 'people') return people(ctx);
    if (sub === 'spend') return spendPage(ctx);
    if (sub === 'caps') return capsPage(ctx);
    if (sub === 'evals') return evalsPage(ctx);
    var sp = spendAt(ctx), S = D.spend, rp = replayed(ctx);
    var body = pg(K.group([
      K.row({ icon: 'group', t: 'Members and devices', s: 'Arun and Asha · ' + devCount(ctx) + ' devices · no invite waiting', go: 'nav:admin/people', id: 'pv5-adm-people' }),
      K.row({ icon: 'savings', t: 'Spend', s: 'Claude · ' + sp.pct + '% · Normal, under 70% · renews ' + S.renews, v: U(sp.dollars) + ' of ' + U(S.ceiling), go: 'nav:admin/spend' }),
      K.row({ icon: 'cloud', t: 'Caps and alerts', s: 'AWS and others · 6% · ' + (rp ? 'no alert waiting' : '1 failed job waits for Replay'), v: G(D.aws.spent) + ' of ' + G(D.aws.cap), vs: rp ? null : badge(1), go: 'nav:admin/caps' }),
      K.row({ icon: 'rule', t: 'Labels for the judges', s: D.evals.sample + ' · ' + D.evals.labelled + ' of ' + D.evals.runs + ' runs labelled', go: 'nav:admin/evals' })]) +
      K.note('verified_user', 'Every action here asks for the second check, writes an audit row and sends you a message in the chat. Nothing here changes the household’s records.') +
      cols(cycleCard(ctx), K.card({ t: 'Agent team', body: K.p('The agents’ requests, approvals and incidents join this center in phase 18, on the Agent team page.') + '<div style="height:8px"></div>' + K.btn('Agent team', 'nav:team', 'tinted small', 'groups') })));
    return { title: 'Admin center', sub: 'Owner only · the Dutta household · ' + dlabel(ctx.t), chip: DRAFT, body: body };
  });

  function people(ctx) {
    var D = TD(), c = cut(ctx), here = thisDev(ctx), paused = ashaPaused(ctx), was = ashaWasPaused(ctx), back = ashaRestored(ctx);
    var memberCard = function (m) {
      var status = m.id === 'asha' && paused ? K.chip('Paused', 'mp-pause', 'pause_circle') : K.chip('Active', 'mp-add');
      var devs = D.devices.filter(function (d) { return d.member === m.id && (!d.signed_out || !out13(ctx)); }).map(function (d) {
        var s = d.model + ' · ';
        if (d.id === here) s += 'this device · now';
        else if (d.paused_out && was && !(d.back_in && c >= d.back_in)) s += 'signed out at ' + hm(d.paused_out);
        else s += when(ctx, latest(ctx, d.seen) || d.seen[0]);
        return K.row({ icon: d.icon, t: d.name, s: s, v: m.id === 'asha' && !paused && !(was && d.paused_out) ? K.btn('Sign out', 'dev:out', 'tinted small', 'logout') : null });
      });
      var web = D.browsers.filter(function (b) { return b.member === m.id; }).map(function (b) { return b.name + ', with ' + b.via; });
      var head = '<div class="fx ac g12">' + init(m.id) + '<div class="f1 fx col"><span class="mp-hl">' + m.name + '</span><span class="mp-foot mp-ink2">' + (m.admin ? 'Owner · you' : 'Member · joined Sun 6 Sep') + ' · ' + m.how + '</span></div>' + status + '</div>';
      var acts = '';
      if (m.id === 'asha') {
        if (paused) acts = '<div class="pv5-talk-panel" style="background:var(--mp-pause-bg)"><span class="hd" style="color:var(--mp-pause)">' + K.ms('pause_circle') + 'Paused at 10:07 by you</span><span class="mp-foot">Sign-in is refused and both her devices were signed out. If she tries, she sees one line: ' + q('The household’s owner has paused your access to MyPaisa.') + '</span>' +
          abtn('Restore Asha', 'rs:ask', 'mp-btn-primary', 'play_circle', ' pnext') + '<span class="mp-foot mp-ink2">Restore asks for the second check too.</span></div>';
        else if (back && ctx.t === T_PAUSE) acts = okbox('check_circle', 'Restored at 10:07 by you, after the second check. Asha signs in as before; her devices ask her to sign in once.') + '<div style="height:10px"></div>' + K.btn('Done', 'pz:done', 'primary');
        else acts = K.group([
          '<button type="button" class="mp-row rowbtn"' + K.go('dev:all') + '>' + icontile('logout') + '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">Sign out everywhere</span><span class="mp-foot mp-ink2">Both her devices sign in again. Her accounts and history are kept.</span></div></button>',
          '<button type="button" class="mp-row rowbtn' + ring(ctx.step && ctx.step.id === 'p8-pause') + '"' + K.go('pz:ask') + '>' + icontile('pause_circle') + '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">Pause Asha</span><span class="mp-foot mp-ink2">Sign-in refused and every device signed out until you restore her.</span></div></button>',
          '<button type="button" class="mp-row rowbtn"' + K.go('mem:remove') + '><span class="mp-icontile" style="background:var(--mp-alert-bg);color:var(--mp-alert)">' + K.ms('person_remove') + '</span><div class="f1 fx col"><span class="mp-sub" style="font-weight:600;color:var(--mp-alert)">Remove from the household</span><span class="mp-foot mp-ink2">Her sign-ins end for good; her accounts and history stay with the household.</span></div></button>']) +
          K.foot('Each asks for the second check, writes an audit row and sends you a message in the chat.');
      }
      return K.card({ id: 'pv5-mem-' + m.id, body: head + '<div style="height:6px"></div>' + K.list(devs) + (web.length ? K.foot('Web app: ' + web.join('; ') + '.') : '') + (m.id === 'arun' ? K.foot('You cannot pause your own account; your own devices are signed out from You.') : '') + (acts ? '<div style="height:10px"></div>' + acts : '') });
    };
    var log = D.security.filter(function (e) {
      if (e.t > c) return false;
      if (e.t === T_PAUSE && ctx.t === T_PAUSE) return e.what === 'Paused Asha' ? ctx.has('paused') : ctx.has('restored');
      return true;
    }).slice().reverse().map(function (e) {
      return '<div class="pv5-talk-ar">' + init(e.who) + '<div class="f1"><span class="mp-sub" style="font-weight:600">' + mem(e.who).name + ' · ' + e.what + '</span><span class="mp-foot mp-ink2">' + when(ctx, e.t) + ' · ' + e.detail + '</span></div></div>';
    }).join('');
    var body = pg(cols(D.members.map(memberCard).join('') + K.group([K.row({ icon: 'person_add', t: 'Invite a member', s: 'A one-time link for this household and a role, for 24 hours; the share sheet sends it', go: 'adm:invite' })]),
      K.card({ t: 'Security log', r: '<span class="mp-foot mp-ink2">newest first</span>', body: log + K.foot('Sign-ins, links, sign-outs, pauses and restores. Changes to the records are in Audit.') })));
    return { title: 'Members and devices', sub: 'Who can get in, and on what', back: ABACK, chip: DRAFT, body: body };
  }

  function spendPage(ctx) {
    var D = TD(), S = D.spend, sp = spendAt(ctx);
    var hero = K.card({ t: 'Claude · prod · this cycle', r: '<span class="mp-foot mp-ink2">' + S.cycle + '</span>', body:
      '<div class="fx ac g8 wrap" style="align-items:baseline"><span class="pv5-talk-big">' + U(sp.total, 2) + '</span><span class="mp-sub mp-ink2">of ' + U(S.ceiling) + ' · ' + sp.pct + '% · about ' + G(Math.round(sp.total / S.usd_gbp)) + ' of ' + G(S.ceiling_gbp) + '</span></div>' +
      meter(sp.total / S.ceiling, [70, 85, 95]) + K.kv('Step', 'Normal, under 70%') + K.kv('Renews', S.renews + ', in ' + S.days_left + ' days') +
      '<div class="fx g8 wrap" style="margin-top:12px">' + abtn('Move the ceiling', 'ceil:open', 'mp-btn-primary', 'tune', ring(ctx.step && ctx.step.id === 'p8-ceiling' && !ctx.has('ceil'))) + K.btn('Renewal day', 'adm:renew', 'tinted', 'event') + '</div>' });
    var ladder = K.card({ t: 'The ladder', body: K.list(S.ladder.map(function (l, i) {
      return K.row({ t: l.p + ' · ' + l.t, s: l.d, v: l.at == null ? K.chip('Now', 'mp-neutral') : U(l.at) }); })) + K.foot('Alerts are never dropped at any step: a template needs no model.') });
    var share = S.share_usd;
    var bar = function (t, v, max) { return '<div class="fx col g4" style="margin-bottom:12px"><div class="fx jb mp-sub g8"><span>' + t + '</span><span class="mp-num" style="font-weight:600">' + U(v, 2) + '</span></div>' + meter(v / max, []) + '</div>'; };
    var by = K.card({ t: 'This cycle, by member', r: '<span class="mp-foot mp-ink2">' + U(sp.total, 2) + ' in all</span>', body: bar('Arun · against his share, 60%, ' + U(share), sp.arun, share) +
      bar('Asha · against her share, 60%, ' + U(share), sp.asha, share) + bar('Household jobs · reviews and scoring, no share; against the ceiling', sp.jobs, S.ceiling) + K.foot('From the meter’s rows, costed from the API’s own usage counts.') });
    var guards = K.card({ t: 'Guards under the ladder', body: K.list([
      K.row({ icon: 'person', t: 'A member', s: 'Past it, their chat runs at the 95% step', v: '60% · ' + U(share) }),
      K.row({ icon: 'today', t: 'A day', s: 'Three times the daily average; today ' + U(sp.today, 2), v: 'about ' + U(S.guard_day_usd) }),
      K.row({ icon: 'repeat', t: 'A run', s: 'A loop that reaches it stops and says so', v: S.calls_per_run + ' calls' })]) });
    var limits = K.card({ t: 'Behind the meter', body: K.kv('Hard limit, prod', U(S.hard) + ' · the Console’s') + K.kv('Hard limit, dev', U(S.dev_hard)) + K.kv('The plan’s credit', U(S.credit) + ' a month') + K.kv('Evals workspace', U(S.evals_limit) + ' on top') +
      K.foot('The app holds no Console key: to go higher, raise the workspace’s limit in the Claude Console, then type the new hard limit here.') + '<div style="height:8px"></div>' + K.btn('Type the hard limit', 'adm:hard', 'tinted small', 'keyboard') });
    return { title: 'Spend', sub: 'Claude, in dollars as the credit is; pounds beside them at ' + U(1.3, 2) + ' to the pound', back: ABACK, chip: DRAFT, body: pg(cols(hero + ladder, by + guards + limits)) };
  }
  function ceilSheet(ctx) {
    var D = TD(), S = D.spend, mv = S.move;
    return '<div class="pv5-talk-dlg"><div class="fx ac jb"><span class="mp-t3" style="margin:0">Move the ceiling</span><button type="button" class="gbtn" aria-label="Close"' + K.go('ceil:close') + '>' + K.ms('close') + '</button></div>' +
      '<div class="pv5-talk-seg" role="group" style="align-self:flex-start"><button type="button" class="on">Prod</button><button type="button"' + K.go('ceil:dev') + '>Dev</button></div>' +
      '<div class="pv5-talk-stepper"><button type="button" class="gbtn" aria-label="Lower"' + K.go('ceil:down') + '>' + K.ms('remove') + '</button><div class="fx col f1"><span class="pv5-talk-big">' + U(mv.typed) + '</span><span class="mp-foot mp-ink2">typed · from ' + U(mv.from) + ' · from ' + U(mv.min) + ' to the hard limit, ' + U(mv.hard) + '</span></div>' +
      '<button type="button" class="gbtn" aria-label="Raise"' + K.go('ceil:up') + '>' + K.ms('add') + '</button></div>' +
      '<div class="pv5-talk-panel"><span class="hd">' + K.ms('block') + 'Refused: above prod’s hard limit</span><span class="mp-foot">The Console would stop the key at ' + U(mv.hard) + ' anyway. Nothing has changed: the ceiling is still ' + U(mv.from) + '. To go higher:</span>' +
      '<div class="pv5-talk-step2"><b>1</b><span>In the Claude Console, raise the prod workspace’s spend limit.</span></div><div class="pv5-talk-step2"><b>2</b><span>Here, in Spend, type the new hard limit to match.</span></div>' +
      '<div class="pv5-talk-step2"><b>3</b><span>Move the ceiling again. Past the plan’s ' + U(S.credit) + ' credit, with dev’s ' + U(S.dev_ceiling) + ', it asks for your explicit yes and a card on the Console.</span></div></div>' +
      '<button type="button" class="mp-btn mp-btn-primary pv5-talk-off">' + K.ms('block') + '<span>Confirm ' + U(mv.typed) + '</span></button>' +
      K.foot('Within the limit, Confirm opens the second check; the change takes effect at the next model call, with an audit row and a message in the chat.') + K.btn('Close, nothing changed', 'ceil:close', 'tinted') + '</div>';
  }

  function capsPage(ctx) {
    var D = TD(), A = D.aws, F = D.failed, rp = replayed(ctx), justNow = ctx.t === T_REPLAY && ctx.has('replayed');
    var alert = rp ? K.card({ id: 'pv5-caps-fw', t: 'Alerts', r: '<span class="mp-foot mp-ink2">none waiting</span>', body: okbox('replay', 'Replayed 1 job at 10:12, by you, with Face ID. It ran at 10:12: Silver ETC priced at the Fri 23 Oct close; nothing changed, since the 07:00 run had priced it.') +
        '<div style="height:8px"></div>' + K.kv('Queue', F.queue) + K.kv('Dead-letter queue', 'Empty') + K.kv('In the audit log', '10:12 · Arun · replayed 1 job') + (justNow ? '<div style="height:10px"></div>' + K.btn('Done', 'rp:done', 'primary') : '') }) :
      K.card({ id: 'pv5-caps-fw', t: 'Alerts', r: K.chip('1 needs you', 'mp-alertchip', 'error'), body: '<span class="mp-hl">Failed work · ' + F.when + '</span><span class="mp-sub" style="display:block;margin:4px 0 10px">The 21:00 price ingest for Silver ETC failed ' + F.tries + ' times: ' + F.reason + '.</span>' +
        K.kv('Queue', F.queue) + K.kv('Job', F.job) + K.kv('Tried', F.tries + ' times, ' + F.window) + K.kv('Sent', F.alarm) + K.note('check', F.since) +
        '<div style="height:10px"></div>' + abtn('Replay 1 job', 'rp:go', 'mp-btn-primary', 'replay', ring(ctx.step && ctx.step.id === 'p8-caps')) + K.foot('Moves it back to its queue. Handlers are idempotent, so nothing runs twice. Asks for the second check.') });
    var aws = K.card({ t: 'AWS and others · October', r: '<span class="mp-foot mp-ink2">read ' + A.read + '</span>', body: '<div class="fx ac g8 wrap" style="align-items:baseline"><span class="pv5-talk-big">' + G(A.spent) + '</span><span class="mp-sub mp-ink2">of ' + G(A.cap) + ' · 6% · forecast ' + G(A.forecast, { dp: 2 }) + '</span></div>' +
      meter(A.spent / A.cap, [50, 80]) + K.list(A.steps.map(function (s) { return K.row({ t: s.p + '% · ' + G(s.at), s: s.d }); }).concat([K.row({ icon: 'lock', t: 'Never', s: 'The brief, alerts and the chat never stop, at any step.' })])) +
      K.note('shield', 'Backstop: an AWS Budgets budget at ' + G(A.backstop) + ', made by Terraform, not from here. Each step is a flag the jobs read, never a change to AWS. Its figures lag by up to a day.') });
    var mx = '<div class="pv5-talk-mx"><div class="h">Alert</div><div class="h">App</div><div class="h">Push</div><div class="h">Email</div>' + D.routing.map(function (r) {
      var cell = function (v) { return '<div class="c">' + K.ms(v === 'Off' ? 'remove' : v === 'Always' ? 'lock' : v === 'Own' ? 'person' : 'check') + '<span>' + v + '</span></div>'; };
      return '<div><span style="font-weight:600">' + r.t + '</span><span class="mp-foot mp-ink2">' + r.s + '</span></div>' + cell(r.app) + cell(r.push) + cell(r.email);
    }).join('') + '</div>';
    var route = K.card({ t: 'Where alerts go', body: mx + K.foot('App is this Alerts list, in the app and the web app. Critical push is time-sensitive, with sound; email goes through SNS and never carries a holding’s value.') + '<div style="height:8px"></div>' + K.btn('Change the routing', 'adm:route', 'tinted small', 'alt_route') });
    var quiet = K.card({ t: 'Quiet hours, cooldowns, the digest', body: K.kv('Push', D.quiet.push + ', quietly') + K.kv('Email', D.quiet.email) + K.kv('The same alert', 'at most once in ' + D.quiet.cooldown_h + ' hours') + K.kv('Failed work', 'once per queue until replayed') + K.kv('Daily digest', 'non-urgent alerts, ' + D.quiet.digest + ', in the chat') + K.foot('A critical alert breaks through quiet hours. Changing any of these asks for the second check.') });
    return { title: 'Caps and alerts', sub: 'AWS and others, the alert router, and failed work', back: ABACK, chip: DRAFT, body: pg(cols(alert + aws, route + quiet)) };
  }

  function evalsPage(ctx) {
    var D = TD(), E = D.evals, r = run(E.now);
    var modes = E.modes.map(function (m) {
      return '<div class="pv5-talk-ar"><div class="f1"><span class="mp-sub" style="font-weight:600">' + m.t + '</span><span class="mp-foot mp-ink2">Labels so far: ' + m.pass + ' pass, ' + m.fail + ' fail · acts at ' + E.acts_at + ' and ' + E.acts_at + '; advisory until then</span></div>' +
        '<div class="pv5-talk-seg" role="group"><button type="button" class="on"' + K.go('ev:pass') + '>Pass</button><button type="button"' + K.go('ev:fail') + '>Fail</button></div></div>';
    }).join('');
    var left = K.card({ t: 'Run ' + (E.labelled + 1) + ' of ' + E.runs, r: '<span class="mp-foot mp-ink2">' + r.id + ' · today ' + r.tm + '</span>', body:
      '<div class="pv5-talk-box" style="background:var(--mp-surface-2)"><span class="mp-foot mp-ink2">Arun asked</span><span class="mp-sub">' + q(r.words) + '</span><span class="mp-foot mp-ink2">MyPaisa answered</span><span class="mp-sub">' + DUE_T + '</span><span class="mp-foot mp-ink2">The judges said: pass on all four.</span></div>' +
      '<div class="pv5-talk-day">Your labels, per failure mode</div>' + modes + '<div class="pv5-talk-day">One line, if it failed</div>' +
      '<div class="pv5-talk-q" style="box-shadow:inset 0 0 0 1px var(--mp-line)"><span class="f1 mp-ink2">Nothing failed here</span></div>' +
      '<div style="height:12px"></div>' + K.btn('Save the labels', 'ev:save', 'primary') + K.foot('Saving asks for the second check. Each label keeps its run’s transcript.') });
    var right = K.card({ t: E.sample, r: '<span class="mp-foot mp-ink2">offered ' + E.offered + '</span>', body: K.kv('Runs offered', E.runs) + K.kv('Labelled', E.labelled) + K.kv('To go', E.runs - E.labelled) +
      meter(E.labelled / E.runs, []) + K.foot('Offered each month, and whenever a judge, a prompt, a tool or the model changes. A judge acts once it has ' + E.acts_at + ' pass and ' + E.acts_at + ' fail labels; one below ' + E.floor + ' on its true-positive or true-negative rate drops back to advisory.') }) +
      K.card({ t: 'The eval caps', body: K.kv('Overnight judges, prod', '3% of the ceiling · ' + U(D.spend.judges_usd, 2)) + K.kv('Live evals, the evals workspace', U(D.spend.evals_run) + ' a run · ' + U(D.spend.evals_limit) + ' a month') + K.foot('The judges pause from the 85% step. A run you mark failed becomes a test case once rewritten onto the seed household, behind the second check.') });
    return { title: 'Labels for the judges', sub: 'Pass or fail per failure mode, with a line of why', back: ABACK, chip: DRAFT, body: pg(cols(left, right)) };
  }

  /* ---------- the lock screen with a push (phase 1) ---------- */
  function lockScreen(ctx) {
    if (ctx.web) return null;
    return '<div class="pv5-talk-sys lock"><div class="pv5-talk-lock"><span class="ms" style="font-size:22px">lock</span><span class="lock-date">Monday 26 October</span><span class="lock-time">9:37</span>' +
      '<button type="button" class="notif lg"' + K.go('push:open') + '><div class="notif-ic"><span class="ai-mark"><i></i></span></div><div class="notif-b"><div class="notif-t"><span>MyPaisa</span><span>now</span></div>' +
      '<span>The Pune flat’s valuation has been due since 15 Jul. Tap to see its check-in.</span></div></button></div>' +
      '<div class="pv5-talk-hs-note"><div class="lg"><span class="z1">No amount on the lock screen: the member has not turned amounts on, and privacy mode would keep them off anyway.</span><span class="z1">' + DRAFT + '</span></div></div>' +
      '<div class="pv5-talk-lockfoot"><span class="lg">' + K.ms('flashlight_on', 'z1') + '</span><span class="lg">' + K.ms('photo_camera', 'z1') + '</span></div></div>';
  }

  /* ---------- the chapters ---------- */
  var D1 = 'Mon 26 Oct';
  var CH1 = [['What’s due?', 'event', 'chip:due'], ['Add something', 'add', 'chip:add'], ['What changed?', 'history', 'chip:changed']];
  M.chapter({ key: 'p0', n: '0', order: 0, title: 'Foundations at every door', short: 'Foundations', steps: [
    { id: 'p0-icons', d: D1, tm: '09:31', t: 'MyPaisa, and MyPaisa Dev', viewer: 'arun', draft: true, page: 'you/about', focus: 'page',
      g: 'Phase 0 has almost no screen: it builds both doors’ skeletons and the two environments. What a member meets first is the icon: the 1c Watcher mark, and MyPaisa Dev’s with its DEV band. On the iPhone, iPad and foldable tap MyPaisa; on the web, read the About page.',
      system: homeScreen, target: 'sys:open', chat: function (ctx) { return p1Chat(ctx, 0); }, composer: { chips: CH1 } },
    { id: 'p0-doors', d: D1, tm: '09:31', t: 'Two environments, five doors', draft: true, page: 'you/about', focus: 'page', scroll: { page: 'pv5-about-env' },
      g: 'One AWS account, every part twice: prod holds the household’s records and changes only through GitHub CI after Arun’s approval; dev runs on synthetic data. One app at five doors, laid out by width. Next: phase 1, signing in.',
      chat: function (ctx) { return p1Chat(ctx, 0); }, composer: { chips: CH1 } }
  ] });

  M.chapter({ key: 'p1', n: '1', order: 1, title: 'Talk: sign in and chat at every door', short: 'Talk', steps: [
    { id: 'p1-signin', d: D1, tm: '09:30', t: 'Sign in with Apple, Google or a passkey', viewer: 'arun', draft: true, page: 'signin', focus: 'page',
      g: 'No passwords. The web app offers Apple, Google and a passkey; the app, Apple and Google only (a passkey there answers the second check). Whoever signs in first owns the household: Arun, on Fri 4 Sep (MA-32). Tap Sign in with Apple, then Continue.',
      system: welcome, sheet: function (ctx) { return ctx.has('apple') ? appleSheet(ctx) : null; }, sheetClose: 'si:close',
      on: { 'si:apple': function (st) { st.open.apple = true; }, 'si:close': function (st) { st.open.apple = false; } }, target: 'si:ok' },
    { id: 'p1-answer', d: D1, tm: '09:32', t: 'A first answer, its card and meta line', picked: 'Picked · shell 1a, MA-163 and MA-199', page: 'home', focus: 'chat',
      g: 'Arun asks what the household is worth. MyPaisa’s words, then a card whose every figure is the engine’s (Claude writes no number); the meta line says where they came from. Home beside shows the same £439,951. Tap the suggestion What’s due this week?',
      chat: function (ctx) { return p1Chat(ctx, 1); }, composer: { sug: ['What’s due this week?', 'ask:due'], chips: CH1.slice(1) }, target: 'ask:due' },
    { id: 'p1-stream', d: D1, tm: '09:34', t: 'A reply streaming, never half a card', picked: 'Picked · 1a, MA-199', page: 'home', focus: 'chat',
      g: 'The reply arrives a few words at a time over the stream, at every open door at once. A card never arrives half drawn: it comes whole, after the words. Press Next.',
      chat: function (ctx) { return p1Chat(ctx, 2); }, composer: { ph: 'MyPaisa is writing…', chips: [] } },
    { id: 'p1-offline', d: D1, tm: '09:35', t: 'Offline: the last figures, with their time', picked: 'Picked · 1a, MA-199 on the web; the app’s offline is a draft (MA-173)', page: 'home', focus: 'chat',
      g: 'In a lift, the connection drops. The figures stay as last loaded, and say when; a question typed now waits in the conversation and sends by itself when the connection is back. Confirm needs a connection. Press Next.',
      chat: function (ctx) { return p1Chat(ctx, 3); }, composer: { ph: 'Offline · what you type waits here', chips: [] } },
    { id: 'p1-push', d: D1, tm: '09:37', t: 'The answer arrives as a push, no amount', draft: true, page: 'notifications', focus: 'page', scroll: { page: 'pv5-ntf-last' },
      g: 'Back online at 09:36 the question sent itself; Arun had locked the phone, so the reply came as a push (MA-170): what happened, never how much. A door with MyPaisa open gets it over the stream instead, so the web app shows where it went. Tap the notification.',
      system: lockScreen, target: 'push:open', chat: function (ctx) { return p1Chat(ctx, 4); }, composer: { chips: CH1 } },
    { id: 'p1-privacy', d: D1, tm: '09:38', t: 'Privacy mode', draft: true, page: 'you', focus: 'page', scroll: { page: 'pv5-you-priv' },
      g: 'Privacy mode (MA-171) hides every amount at once, in cards, screens, the strip and notifications; percentages stay. Tap Privacy mode (or the eye), see the chat and the page masked, then tap again. The app switcher only ever shows the mark.',
      target: 'priv', chat: function (ctx) { return p1Chat(ctx, 4); }, composer: { chips: CH1 } },
    { id: 'p1-activity', d: D1, tm: '09:39', t: 'Activity: every run today', draft: true, page: 'activity', focus: 'page',
      g: 'Every run of the agent and the jobs, from its RunRecord (MA-196): model calls, tokens, cost and tools. Claude this cycle sits against the $160 ceiling. Asha’s run shows its cost, never her words. Open the 09:32 run.',
      target: 'nav:run/r-1232', scroll: { page: 'pv5-run-r-1232' }, chat: function (ctx) { return p1Chat(ctx, 4); }, composer: { chips: CH1 } },
    { id: 'p1-run', d: D1, tm: '09:39', t: 'One run: what it read, its tools, its cost', draft: true, page: 'run/r-1232', focus: 'page',
      g: 'Run r-1232: what it read, each step, each model call with its tokens and cost, each tool and its time, and the one note it wrote, which holds no figure. Then open You.',
      target: 'nav:you', chat: function (ctx) { return p1Chat(ctx, 4); }, composer: { chips: CH1 } },
    { id: 'p1-you', d: D1, tm: '09:40', t: 'What MyPaisa remembers, and signing out a phone', draft: true, page: 'you', focus: 'page', scroll: { page: 'pv5-you-mem' },
      g: 'What MyPaisa remembers (MA-288, draft): Arun’s own notes, read only in his conversations, and the household’s; each corrected in place or forgotten, none added here. Below, his devices: sign out the old iPhone 13 (MA-172). As the only owner, he cannot leave.',
      on: { 'you:out13': function (st) { st.open.out13 = true; } }, target: 'you:out13', chat: function (ctx) { return p1Chat(ctx, 4); }, composer: { chips: CH1 } }
  ] });

  function chk(st) { st.open.pzchk = false; st.open.rschk = false; st.open.rpchk = false; }
  M.chapter({ key: 'p8', n: '8', order: 8, title: 'Audit, search and the Admin center', short: 'Audit and admin', steps: [
    { id: 'p8-audit', d: D1, tm: '10:00', t: 'Audit: who, when, and the file behind a change', viewer: 'arun', draft: true, page: 'audit', focus: 'page',
      g: 'Every change leaves a row in the same transaction (MA-79): who, when, through what, before and after, the run. Today: the Monzo savings at 09:41 (r-1235), Home corrected at 09:52 in place, a note MyPaisa wrote. Asha’s screenshot of Thu 22 Oct fed the pot’s value: tap Open on it.',
      target: 'nav:file/monzo-pot', scroll: { page: 'pv5-talk-pot' }, chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-file', d: D1, tm: '10:01', t: 'The original file, opened for five minutes', draft: true, page: 'file/monzo-pot', focus: 'page',
      g: 'The file as sent, kept for good (MA-148, MA-149): opened through a five-minute link after the role check, and the opening is itself an audit row. Read-only. Now tap Search.',
      target: 'nav:search', chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-search', d: D1, tm: '10:03', t: 'Search: a holding, a change, a file, a past answer', draft: true, page: 'search', focus: 'page',
      g: 'One search across records, holdings, audit rows, files and your own past answers (MA-180, draft), within the member’s rights. “Monzo” finds the new savings, the pot, Balanced’s ISA, both changes, Asha’s screenshot and the 09:43 answer. Press Next.',
      chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-admin', d: D1, tm: '10:05', t: 'The Admin center, the owner’s alone', draft: true, page: 'admin', focus: 'page',
      g: 'Only the owner sees it (MA-102, MA-116, MA-137, MA-145, MA-255): members and devices, spend, caps and alerts, the judges’ labels. Every action asks for the second check (MA-76), writes an audit row and messages Arun. Open Members and devices.',
      target: 'nav:admin/people', chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-pause', d: D1, tm: '10:07', t: 'Pause a member, behind the second check, then restore', draft: true, page: 'admin/people', focus: 'page',
      scroll: { page: 'pv5-mem-asha' },
      g: 'Tap Pause Asha: the change is said in words, then iOS’s Sign in with Apple under Face ID (in a browser, a fresh Apple sign-in) answers the api’s challenge. Paused, her sign-in is refused and her devices sign out. Restore her the same way, then Done.',
      sheet: function (ctx) {
        if (ctx.has('pzchk')) return check2(ctx, { act: 'Pause Asha', what: 'Sign-in refused and both her devices signed out until you restore her. Her accounts and history are kept.', ok: 'pz:ok', no: 'chk:close' });
        if (ctx.has('rschk')) return check2(ctx, { act: 'Restore Asha', what: 'Her sign-in works again, with Apple or Google, on her own devices.', ok: 'rs:ok', no: 'chk:close' });
        return null;
      }, sheetClose: 'chk:close',
      on: { 'pz:ask': function (st) { st.open.pzchk = true; }, 'pz:ok': function (st) { chk(st); st.open.paused = true; }, 'rs:ask': function (st) { st.open.rschk = true; },
        'rs:ok': function (st) { chk(st); st.open.restored = true; }, 'chk:close': chk }, target: 'pz:done', chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-ceiling', d: D1, tm: '10:10', t: 'Move the Claude ceiling', draft: true, page: 'admin/spend', focus: 'page',
      g: 'Spend shows $18 of the $160 ceiling, the ladder and the guards (MA-116). Tap Move the ceiling: $180 is above prod’s hard limit, the Console’s $160, so it is refused with the way round, and nothing changes. Close it.',
      sheet: function (ctx) { return ctx.has('ceil') ? ceilSheet(ctx) : null; }, sheetClose: 'ceil:x',
      on: { 'ceil:open': function (st) { st.open.ceil = true; }, 'ceil:x': function (st) { st.open.ceil = false; } }, target: 'ceil:close', chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-caps', d: D1, tm: '10:12', t: 'Caps and alerts, and Replay', draft: true, page: 'admin/caps', focus: 'page',
      g: 'AWS and others at £3 of £50, its steps and the £75 backstop, and the router to the app, push and email (MA-137). A failed-work alert from the dead-letter queue carries Replay (MA-145): tap it, pass the second check, then Done.',
      sheet: function (ctx) { return ctx.has('rpchk') ? check2(ctx, { act: 'Replay 1 job', what: 'Prices · Silver ETC goes back to its queue. Handlers are idempotent, so nothing runs twice.', ok: 'rp:ok', no: 'chk:close' }) : null; }, sheetClose: 'chk:close',
      on: { 'rp:go': function (st) { st.open.rpchk = true; }, 'rp:ok': function (st) { chk(st); st.open.replayed = true; }, 'chk:close': chk }, target: 'rp:done', chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-asha', d: D1, tm: '10:14', t: 'As Asha: no Admin center', viewer: 'asha', draft: true, page: 'you', focus: 'page',
      g: 'Asha signed in again at 10:14, after the restore. Her You has no Admin center row and her sidebar no Admin section; the api refuses her its routes too. She can leave the household, behind the second check. Press Next.',
      chat: p8Chat, composer: { chips: CH1 } },
    { id: 'p8-labels', d: D1, tm: '10:15', t: 'Label this month’s runs for the judges', viewer: 'arun', draft: true, page: 'admin/evals', focus: 'page',
      g: 'Each month the Admin center offers about 30 runs (MA-255, draft): the admin marks pass or fail per failure mode, with a line of why, behind the second check. A judge acts only once it has 50 of each. Save the labels.',
      target: 'ev:save', chat: p8Chat, composer: { chips: CH1 } }
  ] });
})();
