/* MyPaisa · Prototype v5 (MA-291): the Engine chapters, phases 10 to 13 and 15. The heart of Arun's idea: a
   recommendation system for the household's funds and shares, built on rules and past data. Prices come in (phase
   10), the rules engine scores each holding (pillars, the holder's cascade, a confidence with its working), Claude
   puts the figures into words in the brief, the alerts and the answers (11, 12), every call is graded against doing
   nothing and the grades feed back into the confidence (13), and after 8 weeks beating doing nothing the stances go
   live (15). Every figure is engine-v5.json's (make_engine.py), forecaster-v4's or household-v4's. A stance is a
   signal with its reasons, never a trade: there is no buy or sell button, and "Buy" is only the label of an ADD
   stance. Pages: holdings, holding (its Overview and Track record tabs), overlap, track, calls, today. */
(function () {
  'use strict';
  var M = window.MP5, K = window.MP5K;
  if (!M || !K) return;

  /* ---------- styles: one block, every selector under .pv5-engine, every colour a token ---------- */
  if (!document.getElementById('pv5-engine')) {
    var css = [
      '.pv5-engine{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '.pv5-engine .pe-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.pv5-engine .pe-jb{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}',
      '.pv5-engine .pe-stance{display:flex;flex-direction:column;gap:12px}',
      '.pv5-engine .pe-big{font:700 22px/28px var(--mp-font);letter-spacing:-0.01em;color:var(--mp-ink);text-wrap:balance}',
      '.pv5-engine .pe-lbl{font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);text-transform:uppercase;letter-spacing:0.05em}',
      '.pv5-engine .pe-ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}',
      '.pv5-engine .pe-ul li{display:flex;gap:8px;align-items:flex-start;font:400 15px/20px var(--mp-font);color:var(--mp-ink)}',
      '.pv5-engine .pe-ul li .ms{font-size:18px;color:var(--mp-accent);margin-top:1px;flex:none}',
      '.pv5-engine .pe-acts{display:flex;flex-wrap:wrap;gap:8px}',
      '.pv5-engine .pe-sum{font:600 15px/22px ui-monospace,"SF Mono",Menlo,monospace;color:var(--mp-ink);overflow-wrap:anywhere}',
      '.pv5-engine .pe-terms{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font:400 14px/19px var(--mp-font);color:var(--mp-ink-2)}',
      '.pv5-engine .pe-terms b{font:600 14px/19px var(--mp-font);color:var(--mp-ink);text-align:right;font-variant-numeric:tabular-nums}',
      '.pv5-engine .pe-path{margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:6px;font:400 14px/19px var(--mp-font);color:var(--mp-ink)}',
      '.pv5-engine .pe-path li:last-child{font-weight:600}',
      '.pv5-engine .pe-gate{display:flex;gap:4px;flex-wrap:wrap}',
      '.pv5-engine .pe-gate span{min-width:34px;height:26px;padding:0 4px;box-sizing:border-box;border-radius:7px;display:grid;place-items:center;font:600 11px/1 var(--mp-font);background:var(--mp-track);color:var(--mp-ink-2);box-shadow:inset 0 0 0 1px var(--mp-line)}',
      '.pv5-engine .pe-gate span.on{background:var(--mp-add-bg);color:var(--mp-add);box-shadow:none}',
      '.pv5-engine .pe-cal{display:flex;flex-direction:column;gap:14px}',
      '.pv5-engine .pe-calr{display:flex;flex-direction:column;gap:6px}',
      '.pv5-engine .pe-calbar{position:relative;height:12px;border-radius:999px;background:var(--mp-track);box-shadow:inset 0 0 0 1px var(--mp-line)}',
      '.pv5-engine .pe-calbar>i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--mp-chart-line)}',
      '.pv5-engine .pe-calbar>b,.pv5-engine .pe-calseg>b{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;border-radius:2px;background:var(--mp-ink);z-index:2}',
      '.charts-b .pv5-engine .pe-calbar{border-radius:4px}',
      '.charts-b .pv5-engine .pe-calbar>i{top:3px;bottom:3px;left:2px;border-radius:2px}',
      '.pv5-engine .pe-calseg{position:relative}',
      '.pv5-engine .pe-legend{display:flex;gap:14px;flex-wrap:wrap;font:400 13px/18px var(--mp-font);color:var(--mp-ink-2)}',
      '.pv5-engine .pe-legend i{display:inline-block;width:14px;height:8px;border-radius:4px;background:var(--mp-chart-line);margin-right:6px;vertical-align:1px}',
      '.pv5-engine .pe-legend i.tick{width:3px;height:14px;border-radius:2px;background:var(--mp-ink);vertical-align:-2px}',
      '.pv5-engine .pe-legend i.band{background:var(--mp-band)}',
      '.pv5-engine .pe-tr{display:flex;align-items:center;gap:10px;padding:10px 0;box-shadow:inset 0 -1px 0 var(--mp-line);flex-wrap:wrap}',
      '.pv5-engine .pe-tr:last-child{box-shadow:none}',
      '.pv5-engine .pe-tr .f1{min-width:150px}',
      '.pv5-engine .pe-out{display:inline-flex;align-items:center;gap:4px;font:600 14px/18px var(--mp-font);white-space:nowrap}',
      '.pv5-engine .pe-out .ms{font-size:18px;line-height:1}',
      '.pv5-engine .pe-res,.pv5-ecard .pe-res{display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right;flex:none;max-width:100%}',
      '.pv5-engine .pe-res>.mp-foot,.pv5-ecard .pe-res>.mp-foot{white-space:normal}',
      '.pv5-engine .pe-banner{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:var(--mp-r-card);background:var(--mp-pause-bg);color:var(--mp-ink)}',
      '.pv5-engine .pe-banner>.ms{color:var(--mp-pause);font-size:22px;flex:none}',
      '.pv5-engine .pe-src{display:flex;flex-direction:column;gap:4px;font:400 13px/18px ui-monospace,"SF Mono",Menlo,monospace;color:var(--mp-ink-2)}',
      '.pv5-engine .pe-chain{display:flex;flex-wrap:wrap;gap:6px}',
      '.pv5-engine .pe-chain span{font:500 12px/16px ui-monospace,"SF Mono",Menlo,monospace;padding:4px 8px;border-radius:7px;background:var(--mp-surface-2);color:var(--mp-ink-2)}',
      '.pv5-engine .pe-chain span.ok{background:var(--mp-add-bg);color:var(--mp-add)}',
      '.pv5-engine .pe-chain span.bad{background:var(--mp-pause-bg);color:var(--mp-pause)}',
      '.pv5-engine .pe-q{font:400 14px/20px var(--mp-font);color:var(--mp-ink);padding:10px 12px;border-radius:12px;background:var(--mp-surface-2);box-shadow:inset 3px 0 0 var(--mp-ink-3)}',
      '.pv5-engine .pe-fold{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--mp-accent);font:600 15px/20px var(--mp-font)}',
      '.pv5-engine .pe-skel{height:12px;border-radius:6px;background:var(--mp-surface-2)}',
      '.pv5-engine .pe-sec{display:flex;flex-direction:column;gap:10px;padding-top:14px;box-shadow:inset 0 1px 0 var(--mp-line)}',
      '.pv5-engine .pe-sec:first-child{padding-top:0;box-shadow:none}',
      '.pv5-engine .pe-kvs{display:flex;flex-direction:column;gap:6px}',
      '.pv5-engine .pe-kvs .kv{font-size:14px;line-height:19px;flex-wrap:wrap}',
      '.pv5-engine .pe-kvs .kv>span:first-child{color:var(--mp-ink-2)}',
      '.pv5-engine .pe-kvs .kv>span:last-child{text-align:right;font-weight:500}',
      '.pv5-engine .pe-mini{font:400 13px/18px var(--mp-font);color:var(--mp-ink-2)}',
      '.pv5-engine .pe-lead{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex:none;background:var(--mp-surface-2);font:700 13px/1 var(--mp-font-round);color:var(--mp-ink)}',
      /* the chat's cards and the system surfaces carry the class too */
      '.pv5-ecard .pe-ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}',
      '.pv5-ecard .pe-ul li{display:flex;gap:8px;align-items:flex-start;font:400 15px/20px var(--mp-font)}',
      '.pv5-ecard .pe-ul li .ms{font-size:18px;color:var(--mp-accent);margin-top:1px;flex:none}',
      '.pv5-ecard .pe-q{font:400 14px/20px var(--mp-font);color:var(--mp-ink);padding:10px 12px;border-radius:12px;background:var(--mp-surface-2);box-shadow:inset 3px 0 0 var(--mp-ink-3)}',
      '.pv5-ecard .pe-skel{height:12px;border-radius:6px;background:var(--mp-surface-2)}',
      '.pv5-ecard .pe-mini{font:400 13px/18px var(--mp-font);color:var(--mp-ink-2)}',
      '.pv5-ecard .pe-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.pv5-ecard .pe-tr{display:flex;align-items:center;gap:8px;padding:8px 0;box-shadow:inset 0 -1px 0 var(--mp-line);flex-wrap:wrap}',
      '.pv5-ecard .pe-tr:last-child{box-shadow:none}',
      '.pv5-ecard .pe-tr .f1{min-width:120px}',
      '.pv5-ecard .pe-gate{display:flex;gap:4px;flex-wrap:wrap}',
      '.pv5-ecard .pe-gate span{min-width:30px;height:24px;padding:0 3px;box-sizing:border-box;border-radius:6px;display:grid;place-items:center;font:600 11px/1 var(--mp-font);background:var(--mp-track);color:var(--mp-ink-2);box-shadow:inset 0 0 0 1px var(--mp-line)}',
      '.pv5-ecard .pe-gate span.on{background:var(--mp-add-bg);color:var(--mp-add);box-shadow:none}',
      '.pv5-ecard .pe-out{display:inline-flex;align-items:center;gap:4px;font:600 14px/18px var(--mp-font);white-space:nowrap}',
      '.pv5-ecard .pe-out .ms{font-size:16px;line-height:1}',
      '.pv5-elock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:64px 12px 40px;box-sizing:border-box;overflow:hidden}',
      '.pv5-elock .lock-date{margin-top:6px}',
      '.pv5-elock .pe-stack{width:100%;max-width:420px;display:flex;flex-direction:column;gap:8px;margin-top:auto;margin-bottom:60px}',
      '.pv5-elock .notif{width:100%;box-sizing:border-box;text-align:left}',
      '.pv5-elock .pe-ts{font:600 12px/16px var(--mp-font);letter-spacing:0.04em;text-transform:uppercase;color:var(--mp-alert)}',
      '.pv5-elock .pe-amb{font:600 12px/16px var(--mp-font);color:var(--mp-ink-2)}',
      '.pv5-elock .pe-quiet{font:500 13px/18px var(--mp-font);color:var(--mp-hero-ink-2);text-align:center;display:flex;gap:6px;align-items:center}',
      '.pv5-elock .pe-quiet .ms{font-size:16px}',
      '.pv5-elock .notif .ai-mark{margin:0}',
      '.pv5-esheet{display:flex;flex-direction:column;gap:12px;max-height:620px;overflow:auto}',
      '.pv5-esheet .pe-ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px}',
      '.pv5-esheet .pe-ul li{display:flex;flex-direction:column;gap:4px}',
      '.pv5-esheet .pe-q{font:400 14px/20px var(--mp-font);color:var(--mp-ink);padding:10px 12px;border-radius:12px;background:var(--mp-surface-2);box-shadow:inset 3px 0 0 var(--mp-ink-3)}',
      '.pv5-esheet .pe-src{font:500 12px/16px var(--mp-font);color:var(--mp-ink-2)}',
      /* the kit's chart svgs sit in a wrapper, so they need their width set; the card fold's button its width */
      '.pv5-engine .mp-chartbox svg{width:100%;display:block}',
      '.pv5-ecard .ccard-fold{width:100%;padding:12px 16px;box-sizing:border-box}',
      '.pv5-ecard .pe-list{display:flex;flex-direction:column;gap:3px;font:400 13px/18px ui-monospace,"SF Mono",Menlo,monospace;color:var(--mp-ink-2)}',
      '.pv5-engine .pe-heromv{font-variant-numeric:tabular-nums;white-space:nowrap}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'pv5-engine';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- the figures ---------- */
  function E() { return (window.MP5D || {}).engine || null; }
  function HH() { return (window.MP5D || {}).household || {}; }
  function FC() { return (window.MP5D || {}).forecaster || {}; }
  function asset(id) { var a = HH().assets || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  var UK = ['balanced', 'nasdaq', 'robotics', 'silver'];
  var SHORT = { balanced: 'Balanced', nasdaq: 'NASDAQ 100', robotics: 'Robotics', silver: 'Silver', pot: 'Monzo pot', ppfas: 'Parag Parikh Flexi Cap', infosys: 'Infosys' };
  var NAME = { balanced: 'Balanced', nasdaq: 'NASDAQ 100 ETF', robotics: 'Robotics ETF', silver: 'Silver ETC', pot: 'Monzo pot', ppfas: 'Parag Parikh Flexi Cap', infosys: 'Infosys' };
  var LEAD = { balanced: 'BA', nasdaq: 'NQ', robotics: 'RB', silver: 'AG', pot: '£', ppfas: 'PP', infosys: 'IN' };
  var WHO = { arun: 'Arun', asha: 'Asha' };
  var MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  /* the engine's days run from Fri 31 Jul to Fri 6 Nov 2026; a close is in from 21:00 that day */
  function closeIso(lbl) { var m = /(\d{1,2}) (\w{3})/.exec(lbl); return '2026-' + String(MON[m[2]]).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0') + 'T21:00'; }
  function idxAt(ctx) { var e = E(), b = 0; for (var i = 0; i < e.days.length; i++) if (closeIso(e.days[i]) <= ctx.t) b = i; return b; }
  function isLive(ctx) { return ctx.t >= '2026-11-07T09:00'; }
  function gateWeek(ctx) { return ctx.t >= '2026-11-07T09:00' ? 8 : ctx.t >= '2026-10-31T09:00' ? 7 : ctx.t >= '2026-10-24T09:00' ? 6 : 5; }
  function value(k, i) { var e = E(); if (k === 'pot') return 181; return e.values_23_oct[k] * (1 + e.series[k][i] / 100); }
  /* a holding's value as of the step: the core's ledger (ctx.W.value) where it holds one, so the page, the cards and the
     chat's strip agree; else the engine's series at the close */
  function val(ctx, k) {
    var v = ctx && ctx.W && typeof ctx.W.value === 'function' ? ctx.W.value(k) : null;
    return v != null ? v : value(k, idxAt(ctx));
  }
  function portTot(ctx) { var t = 0; UK.concat(['pot']).forEach(function (k) { t += val(ctx, k); }); return Math.round(t); }
  function callAt(k, i) { var c = E().calls; var best = null; for (var j = 0; j < c.length; j++) if (c[j].k === k && c[j].i <= i) best = c[j]; return best; }
  function stanceNow(ctx, k) {
    var e = E(), i = idxAt(ctx);
    if (i >= e.nov6_i) return { s: e.nov6[k].stance, c: e.nov6[k].conf, w: e.nov6[k] };
    if (i >= e.close_i) return { s: e.now[k].stance, c: e.now[k].conf, w: e.now[k] };
    var c = callAt(k, i); return { s: c.s, c: c.c, w: null };
  }
  function score(ctx) { var e = E(); return idxAt(ctx) >= e.nov6_i ? e.scorecard_6_nov : e.scorecard_24_oct; }
  function groupsAt(ctx) { var e = E(); return idxAt(ctx) >= e.nov6_i ? e.groups_6_nov : e.groups_24_oct; }
  function closeLbl(ctx) { return E().days[idxAt(ctx)]; }
  function sgnPct(n, dp) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(dp == null ? 1 : dp) + '%'; }
  function stanceWord(code) { return code === 'ADD' ? 'Buy' : code.charAt(0) + code.slice(1).toLowerCase(); }
  function STU(code) { return code === 'ADD' ? 'Buy' : code; }
  function ownerLine(k) {
    var e = E(), o = e.instruments[k];
    return WHO[o.owner] + ' · ' + o.wrapper + (o.platform ? ' · ' + o.platform : '');
  }
  function chipStance(ctx, k, o) {
    var s = stanceNow(ctx, k);
    return K.stance(s.s, s.c) + (isLive(ctx) ? '' : (o && o.noShadow ? '' : ' ' + K.shadow()));
  }
  function trackLine(ctx, k) {
    var e = E(), s = stanceNow(ctx, k), live = idxAt(ctx) >= e.nov6_i;
    var n = 0, h = 0;
    e.calls.forEach(function (c) { if (c.k === k && c.s === s.s && c.g && closeIso(c.g) <= ctx.t) { n++; if (c.held) h++; } });
    return STU(s.s) + ' on ' + SHORT[k] + ': ' + n + ' calls, ' + h + ' held up' + (live ? '' : ', graded in shadow') + '. A view, not advice.';
  }
  function draftCard(t) { return K.chip(K.ms('edit_note') + (t || 'Draft, not picked'), 'mp-pause'); }

  /* ---------- small pieces this file needs (the kit has no table, gate meter or lock screen) ---------- */
  function ul(items, icon) { return '<ul class="pe-ul">' + items.map(function (x) { return '<li>' + K.ms(icon || 'arrow_right') + '<span>' + x + '</span></li>'; }).join('') + '</ul>'; }
  function gateMeter(n, live) {
    var h = '<div class="pe-gate" role="img" aria-label="' + n + ' of 8 weeks beating doing nothing">';
    for (var i = 1; i <= 8; i++) h += '<span class="' + (i <= n ? 'on' : '') + '">' + (i <= n ? '✓ ' : '') + 'W' + i + '</span>';
    return h + '</div>';
  }
  function outcomeChip(o) {
    if (o === 'Held up') return '<span class="pe-out mp-up">' + K.ms('check_circle') + 'Held up</span>';
    if (o === 'Missed') return '<span class="pe-out mp-ink2">' + K.ms('cancel') + 'Missed</span>';
    if (o === 'Open') return '<span class="pe-out mp-ink2">' + K.ms('schedule') + 'Open</span>';
    if (o === 'Part graded') return '<span class="pe-out mp-ink2">' + K.ms('timelapse') + 'Part graded</span>';
    return '<span class="pe-out mp-ink2">' + K.ms('drag_handle') + 'Split</span>';
  }
  function lead(k) { return '<span class="pe-lead" aria-hidden="true">' + LEAD[k] + '</span>'; }
  function notif(o) {
    return '<button type="button" class="notif lg btn-reset"' + K.go(o.go) + '><span class="notif-ic"><span class="ai-mark"><i></i></span></span><span class="notif-b">' +
      (o.top ? '<span class="' + (o.topCls || 'pe-amb') + '">' + o.top + '</span>' : '') +
      '<span class="notif-t"><span>' + o.t + '</span><span>' + o.when + '</span></span><span>' + o.body + '</span></span></button>';
  }
  function lockScreen(ctx, o) {
    return '<div class="lockscreen lock pv5-elock ' + (ctx.dark ? 't-dark' : 't-dark') + '"><div class="lock-date">' + o.date + '</div><div class="lock-time">' + o.time + '</div>' +
      (o.quiet ? '<div class="pe-quiet">' + K.ms('bedtime') + o.quiet + '</div>' : '') +
      '<div class="pe-stack">' + o.notifs.join('') + '</div></div>';
  }

  /* ---------- the chart: 60 days of closes, then the engine's one-month range ahead ---------- */
  function holdingChart(ctx, k) {
    var e = E(), i1 = idxAt(ctx), i0 = Math.max(0, i1 - 59), s = e.series[k], base = s[i1], m = K.mode();
    var pts = [], scrub = [], lo = 1e9, hi = -1e9, minC = 1e9, maxC = -1e9;
    for (var i = i0; i <= i1; i++) {
      var v = ((1 + s[i] / 100) / (1 + base / 100) - 1) * 100;
      pts.push([i - i0, v]);
      lo = Math.min(lo, v); hi = Math.max(hi, v);
      minC = Math.min(minC, v); maxC = Math.max(maxC, v);
      scrub.push({ x: i - i0, y: v, k: e.days[i], vt: sgnPct(v) + ' vs ' + closeLbl(ctx), s: SHORT[k] + ' close' });
    }
    var R = e.range_1m[k], x0 = i1 - i0, bandHi = [], bandLo = [];
    for (var t = 0; t <= 21; t += 3) {
      var f = Math.sqrt(t / 21);
      bandHi.push([x0 + t, R.p90 * f]); bandLo.push([x0 + t, R.p10 * f]);
      if (t > 0) scrub.push({ x: x0 + t, y: ((R.p10 + R.p90) / 2) * f, k: '+' + t + ' trading days', vt: sgnPct(R.p10 * f) + ' to ' + sgnPct(R.p90 * f), s: '8 in 10 range ahead' });
    }
    lo = Math.min(lo, R.p10); hi = Math.max(hi, R.p90);
    /* room above the line for the close's label, and no axis label in the top band, where it would meet the card's title */
    var span = hi - lo; lo -= span * 0.08; hi += span * 0.24;
    var step = (hi - lo) > 12 ? 5 : (hi - lo) > 5 ? 2 : 1, grid = [], yl = [];
    for (var g = Math.ceil(lo / step) * step; g <= hi - (hi - lo) * 0.16; g += step) { grid.push(g); yl.push({ y: g, t: sgnPct(g, 0) }); }
    var xl = [], seen = {};
    for (var j = i0; j <= i1; j++) { var mo = e.days[j].split(' ')[2]; if (!seen[mo] && +e.days[j].split(' ')[1] <= 7) { seen[mo] = 1; xl.push({ x: j - i0, t: mo }); } }
    xl.push({ x: x0 + 21, t: 'a month on' });
    var st = stanceNow(ctx, k);
    return K.line({
      x0: 0, x1: x0 + 21, y0: lo, y1: hi, h: ctx.compact ? '170px' : '210px',
      grid: grid, yLabels: yl, xLabels: xl,
      bands: [{ hi: bandHi, lo: bandLo }],
      vlines: [{ x: x0, t: closeLbl(ctx) + ' close' }],
      series: [{ pts: pts }],
      area: m === 'a',
      dots: [{ x: x0, y: 0 }],
      stats: [
        { k: '60d range', v: sgnPct(minC) + ' to ' + sgnPct(maxC) },
        { k: closeLbl(ctx) + ' close', v: STU(st.s) + ' ' + st.c + '%' },
        { k: '1m 80% cone', v: sgnPct(R.p10) + ' to ' + sgnPct(R.p90) }
      ],
      scrub: scrub,
      label: SHORT[k] + ': 60 trading days to the ' + closeLbl(ctx) + ' close, then the engine’s one-month range, ' + sgnPct(R.p10) + ' to ' + sgnPct(R.p90) + '. Stance ' + STU(st.s) + ' ' + st.c + '%.'
    }) + '<div class="pe-legend"><span><i></i>the closes, % from ' + closeLbl(ctx) + '</span><span><i class="band"></i>8 in 10 end inside, a month on</span></div>';
  }

  /* ---------- the Overview tab ---------- */
  function techBody(ctx, k) {
    var e = E(), live6 = idxAt(ctx) >= e.nov6_i, w = live6 ? e.nov6[k] : e.now[k], P = w.pillars, sub = e.pillar_sub[k], R = e.range_1m[k];
    var pil = K.pillar('Trend', P.trend, sub[0]) + K.pillar('Momentum', P.momentum, sub[1]) + K.pillar('Macro', P.macro, sub[2]) + K.pillar('Risk', P.risk, sub[3]);
    var ind = '<div class="pe-kvs">' + e.indicators[k].map(function (r) { return K.kv(r[0], r[1]); }).join('') + '</div>';
    var fl = e.now[k].flags;
    var flags = '<div class="pe-kvs">' + K.kv('Exhaustion', String(fl.exhaustion) + (fl.exhaustion ? '' : ' · ' + (k === 'balanced' ? 'RSI high, but its MACD histogram still rising' : 'none'))) +
      K.kv('Relentless-bearish', fl.relentless + ' of 3') + K.kv('Death-cross', fl.death_cross ? 'yes' : 'no: EMA 50 above EMA 200') + K.kv('Rebound', fl.rebound ? 'yes' : 'no') +
      K.kv('Macro regime', e.macro_word[k]) + '</div>';
    var path = '<ol class="pe-path">' + w.path.map(function (p) { return '<li>' + K.esc(p) + '</li>'; }).join('') + '</ol>';
    var terms = [['50', 'where every call starts'], [(w.agree >= 0 ? '+' : '−') + Math.abs(w.agree), 'agree: 5 for each pillar pointing the stance’s way, minus 5 for each against'],
      ['+' + w.persist, 'persist: ' + w.bars + ' bars in ' + STU(w.stance) + ', since ' + w.since + ' (10 from ten bars)'],
      [(w.quality < 0 ? '−' + Math.abs(w.quality) : '0'), 'quality: no partial, stale or provisional data'],
      [(w.hist > 0 ? '+' : w.hist < 0 ? '−' : '') + Math.abs(w.hist),
        w.hist_n ? 'history: ' + STU(w.stance) + ' calls on this holding held up ' + w.hist_held + ' of ' + w.hist_n + ' (' + Math.round(w.hist_held / w.hist_n * 100) + '%), pulling the score a third of the way there'
          : 'history: fewer than 20 ' + STU(w.stance) + ' calls graded on this holding, so none yet']];
    var sum = w.conf + '% = 50 ' + (w.agree >= 0 ? '+ ' : '− ') + Math.abs(w.agree) + ' agree + ' + w.persist + ' persist' + (w.quality ? ' − ' + Math.abs(w.quality) + ' quality' : '') +
      (w.hist ? (w.hist > 0 ? ' + ' : ' − ') + Math.abs(w.hist) + ' history' : '');
    var conf = '<div class="pe-sum" id="eng-conf">' + sum + '</div><div class="pe-terms">' + terms.map(function (t) { return '<b>' + t[0] + '</b><span>' + t[1] + '</span>'; }).join('') + '</div>' +
      K.foot('Below 55% the engine has no clear view and makes no call. The map from score to percentage is recalibrated only after 8 weeks of evidence, and the change is logged.');
    var dq = '<div class="pe-kvs">' + K.kv('One-month range', sgnPct(R.p10) + ' … ' + sgnPct(R.p90) + ', 8 in 10') + K.kv('P(fall > 5%)', R.fall5 + '%') +
      K.kv('Two-week band for grading', '±' + e.range_2w_band[k].toFixed(1) + '%') + K.kv('Data quality', 'complete; no proxy gap over 1%') + '</div>' +
      K.foot('The range is the engine’s own, from this holding’s history scaled to today’s volatility. The Forecast tab’s “usually” is the same figure.');
    var o = e.instruments[k];
    var src = '<div class="pe-src">' + [o.ticker + ' · ' + o.chain[0] + ' ✓ ' + closeLbl(ctx), (k === 'balanced' ? 'BlackRock product page ✓ NAV check' : 'iShares NAV check ✓'), 'FX: ECB ✓ ' + closeLbl(ctx), (k === 'balanced' ? 'proxy basket from the 30 Sep factsheet' : 'pence normalised to pounds'), 'engine self-test ✓ 07:04'].map(function (x) { return '<span>' + K.ms('check', 'mp-ink2') + ' ' + x + '</span>'; }).join('') + '</div>';
    return '<div class="pe-sec" id="eng-tech"><span class="pe-lbl">Pillars, −2 to +2</span>' + pil + '</div>' +
      '<div class="pe-sec"><span class="pe-lbl">Indicators</span>' + ind + '</div>' +
      '<div class="pe-sec"><span class="pe-lbl">Flags and the macro regime</span>' + flags + '</div>' +
      '<div class="pe-sec"><span class="pe-lbl">The holder’s cascade</span>' + path + '</div>' +
      '<div class="pe-sec"><span class="pe-lbl">The confidence, worked</span>' + conf + '</div>' +
      '<div class="pe-sec"><span class="pe-lbl">Data quality and range</span>' + dq + '</div>' +
      '<div class="pe-sec"><span class="pe-lbl">Sources</span>' + src + '</div>';
  }
  /* a record the rules engine does not score: the pot (cash), the Indian holdings until phase 19, anything else */
  function owners(a) { return (a.owners || []).map(function (o) { return WHO[o[0]] + (a.owners.length > 1 ? ' ' + o[1] + '%' : ''); }).join(' · ') || 'the household'; }
  function recValue(ctx, k) {
    var a = asset(k) || {}, v = ctx && ctx.W && typeof ctx.W.value === 'function' ? ctx.W.value(k) : null;
    if (v == null) v = a.value != null ? a.value : null;
    if (v == null) return '';
    return a.ccy === 'INR' ? K.inrGbp(v) : K.gbp(v);
  }
  function plainOverview(ctx, k) {
    var e = E(), a = asset(k) || {};
    var india = a.country === 'IN';
    var head = k === 'pot' ? 'Cash has no stance' : india ? 'No stance until phase 19' : 'The rules engine does not score this record';
    var why = k === 'pot' ? 'It is the money the contributions come from. MyPaisa values it from the account and draws no chart or range for it.'
      : india ? 'The rules engine reads Indian markets from phase 19. Until then this holding is valued every day and has no stance.' : 'Only priced holdings get a stance; this one is valued from its own records.';
    var kv = '<div class="pe-kvs">' + K.kv('Value', recValue(ctx, k) || 'not recorded') + K.kv('Held by', owners(a)) + (a.account ? K.kv('Account', K.esc(a.account)) : '') +
      (a.liquidity ? K.kv('Liquidity', K.esc(a.liquidity)) : '') + '</div>';
    return '<div class="pv5-engine">' + K.card({ t: 'Stance', r: '<span class="mp-chip mp-neutral">none</span>', body: '<div class="pe-stance"><div class="pe-big">' + head + '.</div>' + K.p(why) + kv +
      (india ? K.foot(e.india.note + '.') : '') + '<div class="pe-acts">' + K.btn('Ask about it', 'ask:' + k, 'tinted', 'chat_bubble') + K.btn('Update value', 'update:' + k, 'plain', 'edit') + '</div></div>' }) + K.viewNotAdvice() + '</div>';
  }
  function overview(ctx, k) {
    var e = E();
    if (!e) return K.note('hourglass_empty', 'The engine’s figures are not built yet.');
    if (!e.instruments[k]) return plainOverview(ctx, k);
    var s = stanceNow(ctx, k), live = isLive(ctx), w = idxAt(ctx) >= e.nov6_i ? e.nov6[k] : e.now[k];
    var would = k === 'balanced' && live ? ['A close 5% below today’s, or momentum turning below 0', 'December’s top-up window, if November’s goes in'] : e.would[k];
    var top = '<div class="pe-jb"><span class="pe-row">' + (live ? K.chip(K.ms('bolt') + 'Stance · live', 'mp-add') : K.shadow('Stance · in shadow')) + '<span class="pe-mini">next 2 weeks</span></span>' + K.stance(s.s, s.c) + '</div>';
    var stance = K.card({ id: 'eng-stance', body: '<div class="pe-stance">' + top + '<div class="pe-big">' + e.framing[s.s] + (s.s === 'PAUSE' ? '. Not a reason to sell.' : '.') + '</div>' +
      '<div class="fx col g6"><span class="pe-lbl">Would change if</span>' + ul(would, 'change_circle') + '</div>' + K.foot(trackLine(ctx, k)) +
      '<div class="pe-acts">' + K.btn('Why?', 'why:' + k, 'tinted', 'help') + K.btn('What if?', 'whatif:' + k, 'tinted', 'science') + K.btn('Ask about ' + SHORT[k], 'ask:' + k, 'tinted', 'chat_bubble') + K.btn('Update value', 'update:' + k, 'plain', 'edit') + '</div></div>' });
    var chart = K.card({ t: '60 days, then the next month', r: '<span class="pe-mini">from the engine</span>', body: holdingChart(ctx, k) });
    var open = ctx.has('tech');
    var tech = K.card({ id: 'eng-techcard', body: '<button type="button" class="btn-reset pe-fold"' + K.go('fold:tech') + '><span>Technical</span>' + K.ms(open ? 'expand_less' : 'expand_more') + '</button>' +
      (open ? '<div class="fx col g12" style="margin-top:8px">' + techBody(ctx, k) + '</div>' : K.foot('Pillars, indicators, flags, the cascade, the confidence sum and the sources: one tap.')) });
    var main = ctx.wide && !ctx.compact ? '<div class="grid2">' + stance + chart + '</div>' : stance + chart;
    return '<div class="pv5-engine">' + main + tech + K.viewNotAdvice() + '</div>';
  }

  /* ---------- the Track record tab: the calls on this holding, graded against waiting ---------- */
  function holdingTrack(ctx, k) {
    var e = E();
    if (!e) return '';
    if (!e.instruments[k]) {
      var a0 = asset(k) || {};
      return '<div class="pv5-engine">' + K.card({ body: a0.country === 'IN' ? K.p(e.india.note + '.') + K.foot('The engine grades Indian holdings from phase 19.') : K.p(k === 'pot' ? 'Cash has no stance, so there are no calls to grade.' : 'No calls: the rules engine does not score this record.') }) + '</div>';
    }
    var late = idxAt(ctx) >= e.nov6_i, sc = score(ctx).by_holding[k], runs = e.holding_track[k].slice().reverse();
    var hero = K.tiles([{ k: 'Held up', v: sc.held + ' of ' + sc.calls, s: 'calls on this holding, graded against waiting' }, { k: 'Rate', v: Math.round(sc.held / sc.calls * 100) + '%', s: 'by the ' + closeLbl(ctx) + ' close' }]);
    var rows = runs.filter(function (r) { return closeIso(r.from) <= ctx.t; }).map(function (r) {
      var g = late ? r.graded_6 : r.graded_24, h = late ? r.held_6 : r.held_24, n = r.n;
      if (!late && closeIso(r.to) > ctx.t) { n = 0; e.calls.forEach(function (c) { if (c.k === k && c.i >= r.i0 && c.i <= r.i1 && closeIso(c.d) <= ctx.t) n++; }); }
      var out = g === 0 ? 'Open' : g < n ? 'Part graded' : h * 2 > g ? 'Held up' : h * 2 < g ? 'Missed' : 'Split';
      var to = closeIso(r.to) > ctx.t ? closeLbl(ctx) : r.to;
      return '<div class="pe-tr">' + K.stance(r.stance) + '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + r.from + (to !== r.from ? ' to ' + to : '') + (closeIso(r.to) > ctx.t ? ', going on' : '') + '</span><span class="mp-foot mp-ink2">' + K.esc(r.why) + '</span></div>' +
        '<div class="fx col tr"><span class="mp-sub mp-num" style="font-weight:600">' + (g ? h + ' of ' + g : n + ' open') + '</span>' + outcomeChip(out) + '</div></div>';
    }).join('');
    return '<div class="pv5-engine">' + hero + K.card({ t: 'Each run of calls, newest first', body: rows }) +
      K.note('info', 'A call is the stance written at each close, for two weeks. <b>Held up</b>: Buy when the price rose, PAUSE when it fell, HOLD when it did not fall. <b>Open</b>: still inside its two weeks.') + K.viewNotAdvice() + '</div>';
  }

  M.holdingTab('overview', { t: 'Overview', order: 1, draw: overview, chip: function () { return K.draft(); } });
  M.holdingTab('track', { t: 'Track record', order: 3, draw: holdingTrack, chip: function () { return K.draft(); } });

  /* ---------- page: holding/<id>[/<tab>] ---------- */
  M.page('holding', function (ctx, args) {
    var k = args[0] || 'nasdaq', e = E(), a = asset(k) || {};
    var defs = Object.keys(M.tabsFor).map(function (id) { return { id: id, d: M.tabsFor[id] }; })
      .filter(function (x) { return (x.id !== 'valuation' || a.kind === 'share') && (!x.d.show || x.d.show(ctx, k)); })
      .sort(function (a2, b2) { return (a2.d.order || 9) - (b2.d.order || 9); });
    var tab = args[1] || 'overview';
    var cur = null; defs.forEach(function (x) { if (x.id === tab) cur = x; });
    if (!cur) cur = defs[0];
    var body;
    try { body = cur ? cur.d.draw(ctx, k) : ''; } catch (err) { console.error('[pv5] holding tab ' + (cur && cur.id), err); body = K.note('error', 'The ' + K.esc(cur ? cur.d.t : '') + ' tab failed to draw: ' + K.esc(String(err && err.message || err))); }
    var full = e && e.instruments[k] ? e.instruments[k].full : (a.name || NAME[k]);
    var vtxt = e && e.instruments[k] ? K.gbp(val(ctx, k)) : recValue(ctx, k);
    var sub = [K.esc(full), e && e.instruments[k] ? ownerLine(k) : owners(a), a.account && !(e && e.instruments[k]) ? K.esc(a.account) : '', vtxt].filter(function (x) { return x; }).join(' · ');
    return {
      title: NAME[k] || a.name || k, sub: sub, back: { t: 'Holdings', go: 'nav:holdings' },
      chip: cur && cur.d.chip ? cur.d.chip(ctx, k) : K.draft(),
      tabs: defs.map(function (x) { return { t: x.d.t, go: 'nav:holding/' + k + '/' + x.id, on: cur && x.id === cur.id }; }),
      body: body
    };
  });

  /* ---------- page: holdings (UK first, then India by account) ---------- */
  function pricesView(ctx) {
    var e = E(), f = e.fresh;
    var rows = f.rows.map(function (r) {
      var o = e.instruments[r.k];
      var chain = r.k === 'pot' ? '<span class="pe-chain"><span>no price needed: cash</span></span>' :
        '<span class="pe-chain">' + r.tried.map(function (t) { return '<span class="' + (/✓/.test(t) ? 'ok' : /stale/.test(t) ? 'bad' : '') + '">' + K.esc(t) + '</span>'; }).join('') + '</span>';
      return '<div class="pe-tr">' + lead(r.k) + '<div class="f1 fx col g4"><span class="mp-sub" style="font-weight:600">' + NAME[r.k] + '</span>' +
        '<span class="mp-foot mp-ink2">' + (o ? 'chain: ' + o.chain.join(' → ') : 'Cash · Monzo') + '</span>' + chain + '</div>' +
        '<div class="fx col tr"><span class="mp-sub" style="font-weight:600">' + (r.as_of ? r.as_of.replace(/ \d+ \w+$/, '') + ' ' + r.what : 'no price') + '</span>' +
        '<span class="pe-out ' + (r.fresh ? 'mp-up' : 'mp-ink2') + '">' + K.ms(r.fresh ? 'check_circle' : 'history') + (r.k === 'pot' ? 'n/a' : r.fresh ? 'fresh' : 'stale · provisional') + '</span></div></div>';
    }).join('');
    var cmp = e.compare.map(function (c) { return '<div class="pe-tr"><span class="mp-chip ' + (c.kind === 'apart' ? 'mp-pause' : 'mp-neutral') + '">' + (c.kind === 'apart' ? 'apart' : c.kind === 'missing' ? 'a missing day' : 'a late correction') + '</span><div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + NAME[c.k] + ' · ' + c.day + '</span><span class="mp-foot mp-ink2">' + K.esc(c.t) + '</span></div></div>'; }).join('');
    return '<div class="pv5-engine">' +
      K.card({ t: 'Price freshness · ' + f.at, r: '<span class="pe-mini">' + f.fresh_n + ' of 4 priced holdings fresh</span>', body: rows }) +
      K.card({ t: 'Where two sources disagree', r: '<span class="pe-mini">the last 30 days</span>', body: cmp + K.foot('Two plugins are recorded for each ETF (yfinance and the issuer’s NAV) and for Balanced (yfinance and BlackRock’s page). A close more than 0.2% apart, a missing day or a late correction is listed here; that is how “free first, EODHD only if London closes prove unreliable” is decided with numbers.') }) +
      K.note('notifications_off', K.esc(f.alarm) + ' Both stale prices are a day old, so no alarm.') +
      '<div class="pe-acts">' + K.btn('What happened at 21:04', 'eng:filled', 'tinted', 'update') + '</div>' + K.viewNotAdvice() + '</div>';
  }
  M.page('holdings', function (ctx, args) {
    var e = E();
    if (!e) return { title: 'Holdings', body: K.note('hourglass_empty', 'The engine’s figures are not built yet.') };
    if (args[0] === 'prices') return { title: 'Where prices come from', sub: 'Each holding’s chain of sources, first that answers wins · ' + e.fresh.at, back: { t: 'Holdings', go: 'nav:holdings/provisional' }, chip: K.draft(), body: pricesView(ctx) };
    var prov = args[0] === 'provisional', i = idxAt(ctx), live = isLive(ctx);
    var vals = {}, tot = 0;
    UK.concat(['pot']).forEach(function (k) { vals[k] = prov ? e.fresh.values[k] : val(ctx, k); tot += vals[k]; });
    if (prov) tot = e.fresh.total;
    var d6 = i >= e.nov6_i, day = d6 ? e.fri_6_nov : e.day;
    var dg = d6 ? day.total.day_gbp : day.total.gbp, dp = d6 ? day.total.day_pct : day.total.pct;
    var dayLine = prov ? 'Today’s move waits for fresh prices' : '<span class="pe-heromv">' + (dg > 0 ? '▲ ' : dg < 0 ? '▼ ' : '') + K.gbp(Math.abs(dg)) + ' · ' + Math.abs(dp).toFixed(2) + '%</span> on Friday';
    var hero = K.hero({ k: 'UK holdings · ' + (prov ? 'prices to Thursday’s close' : closeLbl(ctx) + ' close'), v: K.gbp(tot) + (prov ? '<span class="mp-chip mp-pause" style="margin-left:10px;vertical-align:middle;font-size:13px">Provisional</span>' : ''), s: dayLine });
    var banner = prov ? '<div class="pe-banner" id="eng-prov">' + K.ms('history') + '<div class="f1 fx col g6"><span class="mp-hl">Two prices are from Wednesday</span>' +
      K.p('Today’s move waits for fresh prices. Robotics ETF and Silver ETC have no Thursday close yet, so both use Wednesday’s, labelled, and the total is provisional until a source answers.') +
      '<div class="pe-acts">' + K.btn('How MyPaisa finds a price', 'nav:holdings/prices', 'tinted', 'route') + '</div></div></div>' : '';
    var stale = { robotics: 1, silver: 1 };
    var rows = UK.map(function (k) {
      var s = stanceNow(ctx, k), dmv = d6 ? e.fri_6_nov.by[k] : e.day.by[k];
      var vs = prov ? (stale[k] ? '<span class="mp-chip mp-pause">Wed close</span>' : '<span class="mp-foot">Thu ' + (k === 'balanced' ? 'NAV' : 'close') + '</span>')
        : '<span class="pe-row" style="justify-content:flex-end">' + K.stance(s.s, s.c) + '</span>';
      return K.row({ lead: lead(k), t: NAME[k], s: ownerLine(k) + (prov ? '' : ' · ' + K.move(d6 ? dmv.day_gbp : dmv.gbp, d6 ? dmv.day_pct : dmv.pct, { dp: Math.abs(d6 ? dmv.day_pct : dmv.pct) < 0.1 ? 2 : 1 })), v: K.gbp(vals[k]), vs: vs, go: 'nav:holding/' + k });
    });
    rows.push(K.row({ lead: lead('pot'), t: 'Monzo pot', s: 'Joint · cash', v: K.gbp(181), vs: '<span class="mp-foot mp-ink2">cash, no stance</span>' }));
    var uk = K.card({ t: 'In the UK', r: prov ? '' : (live ? K.chip(K.ms('bolt') + 'Stances live', 'mp-add') : K.shadow('Stances in shadow · week ' + gateWeek(ctx) + ' of 8')), body: K.list(rows) +
      (prov ? '' : K.foot(live ? 'Stances live: 8 weeks beating doing nothing. A view, not advice.' : 'In shadow: the engine writes a call for each holding at every close and grades it two weeks on. Until 8 weeks beat doing nothing, only the Saturday review shows them; this list shows them as the record that is being kept.')) });
    var a1 = asset('ppfas'), a2 = asset('infosys');
    var india = K.card({ t: 'In India', r: '<span class="pe-mini">GBP/INR 112.50 · ECB</span>', body:
      '<div class="pe-lbl" style="margin-top:2px">' + K.esc(a1.account) + '</div>' + K.list([K.row({ lead: lead('ppfas'), t: 'Parag Parikh Flexi Cap', s: 'Asha · Direct Growth · SIP ' + K.inr(10000) + ' on the 10th', v: K.inr(a1.value), vs: '<span class="mp-foot">' + K.gbp(a1.value / K.FX) + '</span>', go: 'nav:holding/ppfas' })]) +
      '<div class="pe-lbl" style="margin-top:10px">' + K.esc(a2.account) + '</div>' + K.list([K.row({ lead: lead('infosys'), t: 'Infosys', s: 'Arun · 120 shares', v: K.inr(a2.value), vs: '<span class="mp-foot">' + K.gbp(a2.value / K.FX) + '</span>', go: 'nav:holding/infosys' })]) +
      K.note('schedule', e.india.note + ': the engine reads Indian markets from phase 19.') });
    return {
      title: 'Holdings', sub: prov ? 'Fri 23 Oct 07:12 · prices to Thursday’s close' : 'Prices to the ' + closeLbl(ctx) + ' close · read-only, changes happen in the chat',
      chip: K.draft(), body: '<div class="pv5-engine">' + banner + hero + (ctx.wide && !ctx.compact ? '<div class="grid2">' + uk + india + '</div>' : uk + india) + K.viewNotAdvice() + '</div>'
    };
  });

  /* ---------- page: overlap ---------- */
  M.page('overlap', function (ctx) {
    var e = E();
    if (!e) return { title: 'Overlap', body: '' };
    var o = e.overlap;
    var tiles = K.tiles([
      { k: 'Effective positions', v: o.effective.toFixed(1) + ' of ' + o.effective_of, s: 'Balanced is ' + Math.round(o.weights.balanced) + '% of what you hold, so five holdings behave like one' },
      { k: 'In US dollars, underneath', v: o.usd_pct + '%', s: 'a 1% move in the pound moves you about ' + o.move_1pc.toFixed(1) + '%' },
      { k: 'Held abroad', v: o.abroad_pct + '%', s: 'in other currencies, looked through' },
      { k: 'Companies in two funds or more', v: String(o.companies.length), s: 'Nvidia in all three' }
    ]);
    var cos = o.companies.map(function (c) {
      var through = Object.keys(c.w).map(function (k) { return SHORT[k] + ' ' + c.w[k].toFixed(1) + '%'; }).join(' · ');
      return '<div class="pe-tr"><div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + c.name + (c.in === 3 ? ' <span class="mp-chip mp-neutral" style="margin-left:4px">in all three</span>' : '') + '</span><span class="mp-foot mp-ink2">' + through + '</span></div>' +
        '<div class="fx col tr"><span class="mp-sub mp-num" style="font-weight:600">' + K.gbp(c.total) + '</span><span class="mp-foot">' + c.pct.toFixed(1) + '% of your holdings</span></div></div>';
    }).join('');
    var ccyNames = { USD: 'US dollar', GBP: 'Pound', EUR: 'Euro', JPY: 'Yen', other: 'Other' };
    var ccys = ['USD', 'GBP', 'EUR', 'JPY', 'other'].map(function (c, n) { return { t: ccyNames[c], v: o.ccy_pct[c], max: 100, cls: n ? 'b' + (n + 1) : '', r: o.ccy_pct[c] + '% · ' + K.gbp(o.ccy_gbp[c]) }; });
    var body = '<div class="pv5-engine">' + tiles +
      K.card({ t: 'Companies in more than one fund', r: '<span class="pe-mini">Balanced, NASDAQ 100, Robotics</span>', body: cos +
        K.foot('Five companies are in both Balanced and the NASDAQ 100 ETF: ' + K.gbp(o.five_total) + ', ' + o.five_pct.toFixed(1) + '% of your holdings. Nvidia is held three ways: ' + o.nvidia_pct.toFixed(1) + '% of everything. Silver and the pot hold no companies, so they are left out.') }) +
      K.card({ t: 'The currency underneath', body: K.hbars(ccys) + K.foot('What the funds hold underneath, not the currency you bought them in. Pounds hidden in privacy mode; the shares stay.') }) +
      K.foot('Looked through: ' + o.sources.join(' · ') + '. From the engine; Claude only puts it into words.') + K.viewNotAdvice() + '</div>';
    return { title: 'Overlap', sub: 'How many bets you really hold · looked through to the ' + closeLbl(ctx) + ' close', chip: K.draft(), body: body };
  });

  /* ---------- page: track (the household's Track record) ---------- */
  function calibration(ctx) {
    var sc = score(ctx), m = K.mode();
    var rows = sc.buckets.map(function (b) {
      var bar = m === 'c'
        ? '<div class="pe-calseg" role="img" aria-label="Said ' + b.said + '% on average, held up ' + b.rate + '%">' + K.bar(b.rate / 100) + '<b style="left:' + b.said + '%"></b></div>'
        : '<div class="pe-calbar" role="img" aria-label="Said ' + b.said + '% on average, held up ' + b.rate + '%"><i style="width:' + b.rate + '%"></i><b style="left:' + b.said + '%"></b></div>';
      return '<div class="pe-calr"><div class="pe-jb mp-sub"><span>Said ' + b.t + '</span><span class="mp-num" style="font-weight:600">' + b.rate + '% held up · ' + b.held + ' of ' + b.calls + '</span></div>' + bar + '</div>';
    }).join('');
    var mid = sc.buckets[1];
    return '<div class="pe-cal" id="eng-calib">' + rows + '</div><div class="pe-legend"><span><i></i>held up</span><span><i class="tick"></i>what it said, on average</span></div>' +
      K.p('Not quite: when it says 60 to 69%, as it does for the NASDAQ fund today (64%), ' + mid.held + ' of ' + mid.calls + ' held up, ' + mid.rate + '%: it has been too modest. Said 55 to 59%, ' + sc.buckets[0].rate + '% held up' + (sc.buckets[0].rate < 50 ? ', less than half the time' : ', about a coin toss') + '. Brier score ' + sc.brier.toFixed(2) + ' (0.25 is a coin toss; lower is better).');
  }
  function recentRows(ctx, n, compact) {
    return groupsAt(ctx).filter(function (g) { return closeIso(g.from) <= ctx.t; }).slice(0, n).map(function (g) {
      var conf = g.conf_lo === g.conf_hi ? g.conf_lo + '%' : g.conf_lo + '–' + g.conf_hi + '%';
      var res = g.graded ? g.held + ' of ' + g.graded + (g.move != null ? ' · ' + sgnPct(g.move) + ' over 2 weeks' : '') : g.n + ' open · graded ' + (g.due || 'later');
      return '<div class="pe-tr">' + lead(g.k) + '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + SHORT[g.k] + '</span><span class="mp-foot mp-ink2">' + g.from + (g.to !== g.from ? ' to ' + g.to : '') + '</span></div>' +
        '<span class="pe-row">' + K.stance(g.stance) + '<span class="mp-foot mp-ink2">' + conf + '</span></span>' +
        '<div class="pe-res" style="min-width:' + (compact ? 120 : 150) + 'px">' + outcomeChip(g.outcome) + '<span class="mp-foot mp-ink2">' + res + '</span></div></div>';
    }).join('');
  }
  M.page('track', function (ctx) {
    var e = E();
    if (!e) return { title: 'Track record', body: '' };
    var sc = score(ctx), live = isLive(ctx), gw = gateWeek(ctx);
    var tiles = K.tiles([
      { k: 'Held up', v: sc.held + ' of ' + sc.calls, s: sc.rate + '% of calls, graded at two weeks' },
      { k: 'Vs doing nothing', v: sgnPct(sc.edge, 2), s: 'a call, on average' },
      { k: 'Inside the range', v: sc.inside + '%', s: 'of outcomes inside the 80% range: too wide' },
      { k: 'Brier score', v: sc.brier.toFixed(2), s: 'lower is better; 0.25 is a coin toss' }
    ]);
    var gate = K.card({ t: live ? 'Stances live' : 'Going live', r: '<span class="pe-mini">week ' + gw + ' of 8</span>', body: gateMeter(gw) +
      K.p(live ? 'Stances live: 8 weeks beating doing nothing. They show on the Portfolio card, in the brief and in /calls from Mon 9 Nov. A view, not advice.'
        : gw + ' weeks in a row beating doing nothing since a miss in the week to Fri 11 Sep. Two more and stances go live in the brief and on the Portfolio card.') });
    var body = '<div class="pv5-engine">' + tiles + (ctx.wide && !ctx.compact ? '<div class="grid2">' + gate + K.card({ t: 'Does 64% mean 64%?', body: calibration(ctx) }) + '</div>' : gate + K.card({ t: 'Does 64% mean 64%?', body: calibration(ctx) })) +
      K.card({ id: 'eng-recent', t: 'Recent calls', r: '<span class="pe-mini">newest first, a row per holding and week</span>', body: recentRows(ctx, 10, ctx.compact) +
        K.foot('Held up means the move went the way the stance said, against waiting. Open: still inside its two weeks. ' + e.range_finding) }) +
      K.card({ t: 'By stance', body: '<div class="pe-kvs">' + ['ADD', 'HOLD', 'PAUSE'].map(function (s) { var b = sc.by_stance[s]; return K.kv(STU(s), b.held + ' of ' + b.calls + ' held up'); }).join('') + '</div>' }) +
      K.foot('Graded by the engine at every close (get_scorecard). The Saturday review reads the last four weeks before it writes.') + K.viewNotAdvice() + '</div>';
    return { title: 'Track record', sub: 'Every call, graded against doing nothing · to the ' + closeLbl(ctx) + ' close' + (live ? '' : ' · in shadow'), chip: K.draft(), body: body };
  });

  /* ---------- page: calls (/calls) ---------- */
  M.page('calls', function (ctx) {
    var e = E();
    if (!e) return { title: 'Recent calls', body: '' };
    return { title: 'Recent calls', sub: '/calls · to the ' + closeLbl(ctx) + ' close' + (isLive(ctx) ? ' · live' : ' · in shadow'), chip: K.draft(), back: { t: 'Track record', go: 'nav:track' },
      body: '<div class="pv5-engine">' + K.card({ body: recentRows(ctx, 14, ctx.compact) }) +
        K.foot('Held up: did better than doing nothing over its horizon. Open: still inside it. Missed: waiting would have done better.') + K.viewNotAdvice() + '</div>' };
  });

  /* ---------- the brief: a card in the chat and the Today screen ---------- */
  function briefData(ctx) {
    var e = E(), d6 = idxAt(ctx) >= e.nov6_i;
    return d6 ? { when: 'Mon 9 Nov', close: 'Fri 6 Nov', tot: portTot(ctx), day: e.fri_6_nov.total, wk: e.week_6_nov.total, by: e.fri_6_nov.by, wkby: e.week_6_nov.by, d6: true }
      : { when: 'Mon 26 Oct', close: 'Fri 23 Oct', tot: portTot(ctx), day: { day_gbp: e.day.total.gbp, day_pct: e.day.total.pct }, wk: e.week.total, by: e.day.by, wkby: e.week.by, d6: false };
  }
  function briefLines(ctx) {
    var e = E(), b = briefData(ctx);
    if (b.d6) {
      return [
        'The holdings ' + K.gbp(b.tot) + ': ' + K.move(b.day.day_gbp, b.day.day_pct, { dp: 2 }) + ' on Friday, ' + K.move(b.wk.gbp, b.wk.pct) + ' on the week.',
        'Balanced ' + K.move(b.wkby.balanced.gbp, b.wkby.balanced.pct) + ' on the week; NASDAQ 100 ' + K.move(b.wkby.nasdaq.gbp, b.wkby.nasdaq.pct) + '; Silver ' + K.move(b.wkby.silver.gbp, b.wkby.silver.pct) + '; Robotics ' + K.move(b.wkby.robotics.gbp, b.wkby.robotics.pct) + '.'
      ];
    }
    return [
      'The holdings ' + K.gbp(b.tot) + ': ' + K.move(b.day.day_gbp, b.day.day_pct, { dp: 2 }) + ' on Friday, ' + K.move(b.wk.gbp, b.wk.pct) + ' on the week.',
      'Robotics ' + K.move(e.day.by.robotics.gbp, e.day.by.robotics.pct) + ' on Friday, past your 8% line from its 1 Oct high. Silver ' + K.move(e.day.by.silver.gbp, e.day.by.silver.pct) + '.',
      'NASDAQ 100 ' + K.move(e.day.by.nasdaq.gbp, e.day.by.nasdaq.pct) + ' on Friday, ' + K.move(e.week.by.nasdaq.gbp, e.week.by.nasdaq.pct) + ' on the week. Balanced steady, ' + K.move(e.week.by.balanced.gbp, e.week.by.balanced.pct) + ' on the week.'
    ];
  }
  function stanceLine(ctx) {
    return '<div class="pe-row">' + UK.map(function (k) { var s = stanceNow(ctx, k); return '<span class="pe-row"><span class="mp-foot" style="font-weight:600">' + SHORT[k] + '</span>' + K.stance(s.s, s.c) + '</span>'; }).join('') + '</div>';
  }
  function briefTech(ctx) {
    var b = briefData(ctx);
    return ['GBP/USD 1.30 · GBP/INR 112.50 · ECB, ' + b.close, 'Prices 5 of 5 fresh · self-test ✓ 07:04', 'Written by Sonnet 5.5 from get_portfolio and get_history; every figure checked against them',
      b.d6 ? 'Stances: get_stances, live since Mon 9 Nov' : 'Stances: in shadow, so none in the brief until the gate'].join('<br>');
  }
  function briefCard(ctx, o) {
    o = o || {};
    var b = briefData(ctx), live = isLive(ctx), e = E();
    var answer = live ? 'One to look at: Balanced says Buy.' : e.brief.answer;
    var body = (live ? K.p('Buy · ' + e.nov6.balanced.conf + '% on Balanced: November’s top-up could go in now, or be brought forward. Nothing else to do.') : '') +
      '<div class="fx col g6"><span class="pe-lbl" style="font:600 12px/16px var(--mp-font);color:var(--mp-ink-2);text-transform:uppercase;letter-spacing:.05em">What moved</span>' +
      briefLines(ctx).map(function (l) { return K.p(l); }).join('') + '</div>' + (live ? '<div class="fx col g6">' + stanceLine(ctx) + K.foot('Stances live: 8 weeks beating doing nothing. A view, not advice.') + '</div>' : '');
    return K.ccard({ cls: 'pv5-ecard', id: o.id, chip: K.chip(K.ms('wb_sunny') + 'The 07:15 brief', 'mp-neutral') + (o.draft === false ? '' : draftCard()), h: answer, sub: b.when + ' · prices to Friday’s close', body: body,
      acts: [K.cbtn('Open Today', 'nav:today', 'ghost', 'today'), K.cbtn(live ? 'Balanced ›' : 'Robotics ›', live ? 'nav:holding/balanced' : 'nav:holding/robotics', 'ghost')],
      fold: { t: 'Technical', open: ctx.has('brieftech'), go: 'fold:brieftech', body: briefTech(ctx) } });
  }
  M.page('today', function (ctx) {
    var e = E();
    if (!e) return { title: 'Today', body: '' };
    var b = briefData(ctx), live = isLive(ctx);
    var hero = K.hero({ k: 'The 07:15 brief · ' + b.when, v: live ? 'Balanced says Buy' : 'Nothing to do this week', s: 'Prices to Friday’s close, ' + b.close + '. Next review Saturday.' });
    var moved = K.card({ t: 'What moved', body: briefLines(ctx).map(function (l) { return K.p(l); }).join('<div style="height:8px"></div>') });
    var rows = UK.map(function (k) {
      var by = b.d6 ? { gbp: b.by[k].day_gbp, pct: b.by[k].day_pct } : b.by[k];
      var s = stanceNow(ctx, k);
      return K.row({ lead: lead(k), t: NAME[k], s: K.move(by.gbp, by.pct, { dp: Math.abs(by.pct) < 0.1 ? 2 : 1 }) + ' on Friday', v: K.gbp(val(ctx, k)), vs: live ? K.stance(s.s, s.c) : null, go: 'nav:holding/' + k });
    });
    var hold = K.card({ t: live ? 'Holdings, with their stances' : 'Holdings', r: live ? K.chip(K.ms('bolt') + 'Stances live', 'mp-add') : K.shadow('Stances in shadow · week ' + gateWeek(ctx) + ' of 8'), body: K.list(rows) + (live ? '' : K.foot('No stance line in the brief until the gate: the stances stay in shadow, in the Saturday review.')) });
    var open = ctx.has('brieftech');
    var tech = K.card({ body: '<button type="button" class="btn-reset pe-fold"' + K.go('fold:brieftech') + '><span>Technical</span>' + K.ms(open ? 'expand_less' : 'expand_more') + '</button>' + (open ? '<div class="pe-src" style="margin-top:6px">' + briefTech(ctx).split('<br>').map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' : '') });
    return { title: 'Today', sub: 'The brief as a screen · written once for the household and once for each member who wants one', chip: K.draft(),
      body: '<div class="pv5-engine">' + hero + (ctx.wide && !ctx.compact ? '<div class="grid2">' + moved + hold + '</div>' : moved + hold) + tech + K.viewNotAdvice() + '</div>' };
  });

  /* ---------- chat cards ---------- */
  function stanceCard(ctx, k, o) {
    o = o || {};
    var e = E(), s = stanceNow(ctx, k);
    var why = e.why[k].map(function (r) { return '<b>' + r[0] + '.</b> ' + (r[2] === 'web' ? 'From the web, quoted: ' : '') + K.esc(r[1]); });
    return K.ccard({ cls: 'pv5-ecard', chip: K.stance(s.s, s.c) + (isLive(ctx) ? '' : K.shadow('In shadow · week ' + gateWeek(ctx) + ' of 8')) + draftCard(), h: NAME[k] + ' · next 2 weeks', sub: e.framing[s.s] + '. ' + (s.s === 'PAUSE' ? 'Not a reason to sell.' : ''),
      body: '<div class="fx col g6"><span class="mp-foot mp-ink2" style="font-weight:600">Why</span>' + ul(why, 'subdirectory_arrow_right') + '</div>' +
        '<div class="fx col g6"><span class="mp-foot mp-ink2" style="font-weight:600">Would change if</span>' + ul(e.would[k], 'change_circle') + '</div>' + K.foot(trackLine(ctx, k)),
      acts: [K.cbtn('Why?', 'why:' + k, 'ghost', 'help'), K.cbtn('What if?', 'whatif:' + k, 'ghost', 'science'), K.cbtn('I acted', 'acted:' + k, 'ghost', 'task_alt')],
      fold: { t: 'Technical', open: ctx.has('stech'), go: 'fold:stech', body: (function () { var w = e.now[k]; return 'Pillars: trend ' + w.pillars.trend + ' · momentum ' + w.pillars.momentum + ' · macro ' + w.pillars.macro + ' · risk ' + w.pillars.risk + '<br>' + w.path.slice(-1)[0] + '<br>' + w.conf + '% = 50 + ' + w.agree + ' agree + ' + w.persist + ' persist' + (w.hist ? ' − ' + Math.abs(w.hist) + ' history' : '') + '<br>Range 1m ' + sgnPct(e.range_1m[k].p10) + ' … ' + sgnPct(e.range_1m[k].p90) + ' · P(fall > 5%) ' + e.range_1m[k].fall5 + '%'; })() } });
  }
  function redCard(ctx) {
    var e = E(), a = e.alerts.red;
    return K.ccard({ cls: 'pv5-ecard', id: 'eng-red', chip: K.chip(K.ms('notification_important') + 'Red alert', 'mp-alertchip') + '<span class="pe-mini">Time sensitive · ' + a.when.split(' ').slice(-1)[0] + '</span>' + draftCard(),
      h: 'Robotics ETF is 8.2% below its high', sub: 'past your 8% line · its high was ' + a.high_day,
      body: K.p('<b>Why:</b> it fell ' + Math.abs(e.day.by.robotics.pct).toFixed(1) + '% today (' + K.gbp(Math.abs(e.day.by.robotics.gbp)) + '), breaking below its 21 Sep low earlier in the week. Chip and robot makers fell together.') +
        K.p('<b>What would help:</b> nothing needs doing tonight. Robotics is ' + e.overlap.weights.robotics.toFixed(1) + '% of your holdings, and an 8% fall is within its usual swings.') +
        K.foot(a.budget + ' ' + a.cooldown),
      acts: [K.cbtn('Why?', 'why:robotics', 'ghost', 'help'), K.cbtn('I acted', 'acted:robotics', 'ghost', 'task_alt'), K.cbtn('Mute for a week', 'mute:robotics', 'ghost', 'notifications_paused')] });
  }
  function amberCard(ctx) {
    var e = E();
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip(K.ms('notifications') + 'Amber · no sound', 'mp-pause') + draftCard(), h: 'Worth a look: Silver ETC', body: K.p(e.alerts.amber.t) });
  }
  function wrapCard(ctx) {
    var e = E();
    return K.ccard({ cls: 'pv5-ecard', id: 'eng-wrap', chip: K.chip(K.ms('nightlight') + 'Evening wrap · 21:15', 'mp-neutral') + draftCard(), h: 'The holdings closed at ' + K.gbp(portTot(ctx)) + ', ' + K.move(e.day.total.gbp, e.day.total.pct, { dp: 2 }) + ' today',
      body: K.p('Robotics ' + K.move(e.day.by.robotics.gbp, e.day.by.robotics.pct) + ', past your 8% line. Silver ' + K.move(e.day.by.silver.gbp, e.day.by.silver.pct) + '. NASDAQ 100 ' + K.move(e.day.by.nasdaq.gbp, e.day.by.nasdaq.pct) + '. Balanced flat, ' + K.move(e.day.by.balanced.gbp, e.day.by.balanced.pct, { dp: 2 }) + '.') +
        K.foot('Sent to Arun, whose accounts moved; Asha has her own. Quiet hours from 22:00.') });
  }
  function scenarioCard(ctx) {
    var e = E(), s = e.scenario;
    var by = UK.concat(['pot']).map(function (k) { return K.kv(NAME[k], s.by[k] ? '+' + K.gbp(s.by[k]).replace(/^/, '') : K.gbp(0) + ' · in pounds'); }).join('');
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip(K.ms('science') + 'Scenario', 'mp-neutral') + draftCard(), h: s.t, sub: 'the currency effect alone, from the look-through',
      body: K.p('<b>About +' + K.gbp(s.total) + ', +' + s.pct.toFixed(1) + '%:</b> ' + e.overlap.abroad_pct + '% of your holdings sit in other currencies underneath, so a weaker pound lifts them in pounds.') +
        '<div class="fx col g4">' + by + '</div>' + K.foot('As if prices abroad stood still; a falling pound often brings other moves the engine does not guess. Worked out by run_scenario. Nothing here says buy or sell.') + '<span class="pe-mini" style="font-weight:600">Try another</span>',
      acts: [K.cbtn('Pound +10%', 'scen:up', 'ghost'), K.cbtn('Shares −20%', 'scen:shares', 'ghost'), K.cbtn('Your own', 'scen:own', 'ghost', 'edit')],
      fold: { t: 'Technical', open: ctx.has('scentech'), go: 'fold:scentech', body: 'Shock: ' + s.shock + '<br>Not in pounds underneath: ' + K.gbp(s.abroad_gbp) + ' × (' + s.factor + ')<br>Others: Pound +10% ' + K.gbp(s.others[0][1], { sign: true }) + ' (' + s.others[0][2] + '%) · Shares −20% ' + K.gbp(s.others[1][1], { sign: true }) + ' (' + s.others[1][2] + '%)<br>Data: look-through Balanced 30 Sep ✓ · iShares Fri 23 Oct ✓ · ECB ✓ · run_scenario' } });
  }
  function profileCard(ctx) {
    var e = E(), p = e.profile;
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip('Holding profile', 'mp-neutral') + draftCard(), h: 'Balanced · BlackRock MyMap 5 · a UK fund',
      body: K.p('<b>For:</b> ' + p['for'] + '.') + K.p('<b>Costs</b> ' + p.ocf + '% a year plus Monzo’s ' + p.platform + '%: about ' + K.gbp(p.cost_year) + ' a year.') +
        K.p('<b>Invests</b> ' + p.shares + '% in shares, ' + p.bonds + '% in bonds; ' + p.usd + '% is in dollars underneath. It is ' + p.weight.toFixed(1) + '% of your holdings.') + K.foot('From its ' + p.factsheet + ' factsheet and the engine’s look-through.'),
      fold: { t: 'Technical', open: false, go: 'fold:proftech', body: 'Shares ' + p.shares + '%: ' + p.regions + '<br>Bonds ' + p.bonds + '%: duration ' + p.duration + ' years<br>Top: ' + p.top } });
  }
  function overlapCard(ctx) {
    var e = E(), o = e.overlap, five = o.companies.filter(function (c) { return c.w.balanced && c.w.nasdaq; }).slice(0, 5);
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip('Overlap review', 'mp-neutral') + draftCard(), h: 'Balanced, NASDAQ 100 and Robotics',
      body: K.p('<b>Five companies are in both Balanced and the NASDAQ 100 ETF:</b> ' + five.map(function (c) { return c.name; }).join(', ') + ', ' + K.gbp(o.five_total) + ' in all, ' + o.five_pct.toFixed(1) + '% of your holdings.') +
        K.p('<b>' + o.usd_pct + '% moves with the dollar:</b> a 1% move in the pound moves you about ' + o.move_1pc.toFixed(1) + '%. Effective positions ' + o.effective.toFixed(1) + ' of ' + o.effective_of + '.') + K.foot('Silver and the pot hold no shares, so are left out.'),
      acts: [K.cbtn('Open Overlap', 'nav:overlap', 'ghost', 'join')] });
  }
  function fvbCard(ctx) {
    var e = E(), f = e.fvb;
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip(K.ms('check') + 'On track', 'mp-add') + K.chip('Fund vs benchmark', 'mp-neutral') + draftCard(), h: 'NASDAQ 100 ETF vs its index · Asha’s',
      body: K.p('<b>On track.</b> ' + K.gbp(100) + ' a year ago is ' + K.gbp(f.fund_100, { dp: 2 }) + ' now; in the index it would be ' + K.gbp(f.index_100, { dp: 2 }) + '.') +
        K.p('The gap, ' + Math.abs(f.td).toFixed(2) + '% a year, is about the fund’s own ' + f.ocf.toFixed(2) + '% charge, so it follows the index closely. With the platform’s ' + f.platform + '% it costs about ' + K.gbp(f.drag_gbp) + ' a year on ' + K.gbp(e.values_23_oct.nasdaq) + '.'),
      fold: { t: 'Technical', open: false, go: 'fold:fvbtech', body: 'Tracking difference, 12 months: ' + f.td.toFixed(2) + '% (fund ÷ index − 1)<br>Tracking error ' + f.te + '% · OCF ' + f.ocf + '% · platform ' + f.platform + '%<br>Verdict on_track: within 0.15% of the charge' } });
  }
  function bvbCard(ctx) {
    var e = E(), b = e.bvb;
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip('Both sides', 'mp-neutral') + K.stance(b.stance, b.conf) + draftCard(), h: b.judge + ' The case for holding is stronger, but not by much.',
      body: '<div class="fx col g4"><span class="mp-foot mp-ink2" style="font-weight:600">For</span>' + ul(b.bull, 'add') + '</div><div class="fx col g4"><span class="mp-foot mp-ink2" style="font-weight:600">Against</span>' + ul(b.bear, 'remove') + '</div>' +
        K.p('<b>The stance stays HOLD ' + b.conf + '%.</b> The judge weighs the two cases; it never changes the stance, which only the rules engine sets.') + K.foot('One round: ' + b.run + '. A view, not advice.') });
  }
  function prefCard(ctx, saved) {
    var e = E(), p = e.pref;
    if (saved) return K.ccard({ cls: 'pv5-ecard', chip: K.chip(K.ms('check') + 'Saved', 'mp-add') + draftCard(), h: p.rule, sub: 'Mon 26 Oct 10:53 · in the audit log, with its before and after', body: K.kv('Before', 'a day’s move of 1% or more') + K.kv('After', 'a day’s move of 2% or more'), acts: [K.cbtn('Undo', 'eng:pref:undo', 'ghost', 'undo')] });
    return K.ccard({ cls: 'pv5-ecard', id: 'eng-pref', chip: K.chip('New preference · check it', 'mp-pause') + draftCard(), h: p.rule,
      body: K.p('<b>What it changes:</b> ' + p.changes) + K.p('<b>Still comes:</b> ' + p.still), acts: [K.cbtn('Confirm', 'eng:pref:confirm', 'primary', 'check'), K.cbtn('Cancel', 'eng:pref:cancel', 'ghost')] });
  }
  function skeletonCard() {
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip(K.ms('hourglass_top') + 'Stance card', 'mp-neutral'), h: 'Waiting for the engine’s figures', sub: 'the card shows whole, never half',
      body: '<div class="pe-skel" style="width:70%"></div><div class="pe-skel" style="width:92%"></div><div class="pe-skel" style="width:55%"></div>' });
  }
  function reviewCards(ctx, which) {
    var e = E(), r = which === 7 ? e.review_7_nov : e.review_24_oct, sc = which === 7 ? e.scorecard_6_nov : e.scorecard_24_oct, wk = r.week;
    var per = UK.filter(function (k) { return wk.per[k]; }).map(function (k) { var p = wk.per[k]; return K.kv(SHORT[k] + ' · ' + p.stances.map(STU).join(', '), p.held + ' of ' + p.calls + ' · ' + sgnPct(p.move)); }).join('');
    var dec = e.decisions.map(function (d) {
      var graded = closeIso(d.due) <= ctx.t;
      var res = graded ? (d.member_right && !d.signal_right ? 'Your call did better: ' + sgnPct(d.move) + ' since.' : d.signal_right && !d.member_right ? 'The signal did better: ' + sgnPct(d.move) + ' since.' : 'Both right: ' + sgnPct(d.move) + ' since.')
        : (d.in_line ? 'In line' : 'Against it') + ', graded ' + d.due + (d.so_far_23 != null && which !== 7 ? ' (' + sgnPct(d.so_far_23) + ' so far)' : '') + '.';
      return '<div class="pe-tr"><div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + d.day + ' · ' + WHO[d.who] + ' ' + K.esc(d.what).replace(/£(\d+)/, function (m, n) { return K.gbp(+n); }) + '</span><span class="mp-foot mp-ink2">The signal said ' + STU(d.signal) + ' · ' + d.signal_conf + '%. ' + res + '</span></div></div>';
    }).join('');
    var head = which === 7 ? 'Saturday review · 4 weeks to Fri 6 Nov' : 'Saturday review · 4 weeks to Fri 23 Oct';
    var mid = sc.buckets[1];
    var c1 = K.ccard({ cls: 'pv5-ecard', id: 'eng-review', chip: K.chip(K.ms('event_repeat') + 'Saturday review', 'mp-neutral') + draftCard(), h: head, sub: which === 7 ? 'Sat 7 Nov 09:00 · Opus 5.5, after reading the last four weeks of calls and grades' : 'Sat 24 Oct 09:00 · Opus 5.5, after reading the last four weeks of calls and grades',
      body: K.p(which === 7 ? 'The holdings ' + K.gbp(portTot(ctx)) + ' at Friday’s close, ' + K.move(e.week_6_nov.total.gbp, e.week_6_nov.total.pct) + ' on the week.' : 'The holdings ' + K.gbp(portTot(ctx)) + ' at Friday’s close, ' + K.move(e.week.total.gbp, e.week.total.pct) + ' on the week: Balanced steady, the NASDAQ 100 ETF and Robotics down.') +
        '<div class="fx col g6"><span class="mp-foot mp-ink2" style="font-weight:600">My calls, graded this week: ' + wk.held + ' of ' + wk.calls + ' held up</span>' + per + '</div>' +
        '<div class="fx col g4"><span class="mp-foot mp-ink2" style="font-weight:600">Your decisions and the signals</span>' + dec + '</div>',
      fold: { t: 'Technical', open: ctx.has('revtech'), go: 'fold:revtech', body: 'Reliability: ' + sc.buckets.map(function (b) { return b.t + ' ' + b.held + ' of ' + b.calls; }).join(' · ') + ' · Brier ' + sc.brier.toFixed(2) + '<br>Calls graded at their two weeks (get_scorecard) · decisions from log_decision<br>Reflection: the last 4 weeks of calls and grades, read before writing' } });
    var c2 = K.ccard({ cls: 'pv5-ecard', chip: K.chip(K.ms('balance') + 'Calibration', 'mp-neutral'), h: which === 7 ? 'Stances live: 8 weeks beating doing nothing' : 'Does 64% mean 64%? Not quite yet',
      body: (which === 7 ? K.p('The eighth week in a row beat doing nothing, by ' + sgnPct(e.weeks[e.weeks.length - 1].edge, 2) + ' a call. From Mon 9 Nov the brief, the Portfolio card and /calls show each holding’s stance. A view, not advice.')
        : K.p('Said 60 to 69%: ' + mid.held + ' of ' + mid.calls + ' held up (' + mid.rate + '%), so it has been too modest. Said 55 to 59%: ' + sc.buckets[0].held + ' of ' + sc.buckets[0].calls + ', a coin toss.') + K.p('<b>Stances go live</b> after 8 weeks beating doing nothing: week 6 of 8.')) + gateMeter(which === 7 ? 8 : 6),
      acts: [K.cbtn('Track record', 'nav:track', 'ghost', 'fact_check')] });
    var out = [c1, c2];
    /* the Forecaster's part of the review is the Forecast builder's card, when it registers one */
    if (M.reviewCards && typeof M.reviewCards.forecaster === 'function') { try { var fcard = M.reviewCards.forecaster(ctx, which); if (fcard) out.push(fcard); } catch (err) { console.error('[pv5] forecaster review card', err); } }
    return out;
  }
  function portfolioCard(ctx) {
    var e = E(), i = idxAt(ctx), d6 = i >= e.nov6_i;
    var rows = UK.map(function (k) {
      var by = d6 ? e.fri_6_nov.by[k] : e.day.by[k], s = stanceNow(ctx, k);
      return '<div class="pe-tr"><div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + NAME[k] + '</span><span class="mp-foot mp-ink2">' + K.gbp(val(ctx, k)) + ' · ' + K.move(d6 ? by.day_gbp : by.gbp, d6 ? by.day_pct : by.pct, { dp: Math.abs(d6 ? by.day_pct : by.pct) < 0.1 ? 2 : 1 }) + '</span></div>' + K.stance(s.s, s.c) + '</div>';
    }).join('') + '<div class="pe-tr"><div class="f1 fx col"><span class="mp-sub" style="font-weight:600">Monzo pot</span><span class="mp-foot mp-ink2">' + K.gbp(181) + ' · cash</span></div><span class="mp-foot mp-ink2">no stance</span></div>';
    var tot = d6 ? e.fri_6_nov.total : null;
    return K.ccard({ cls: 'pv5-ecard', id: 'eng-portfolio', chip: K.chip('Portfolio · ' + closeLbl(ctx), 'mp-neutral') + K.chip(K.ms('bolt') + 'Stances live', 'mp-add') + draftCard(), h: K.gbp(portTot(ctx)) + ' · ' + K.move(d6 ? tot.day_gbp : e.day.total.gbp, d6 ? tot.day_pct : e.day.total.pct, { dp: 2 }) + ' on Friday',
      body: rows + K.p('One to look at: <b>Buy</b> on Balanced, for November’s top-up. Next review Saturday.') + K.foot('Stances live: 8 weeks beating doing nothing. A view, not advice.'),
      acts: [K.cbtn('Open Home', 'nav:home', 'ghost', 'home'), K.cbtn('Balanced ›', 'nav:holding/balanced', 'ghost'), K.cbtn('/calls', 'nav:calls', 'ghost', 'list')] });
  }
  function callsCard(ctx) {
    return K.ccard({ cls: 'pv5-ecard', chip: K.chip('/calls', 'mp-neutral') + draftCard(), h: 'Recent calls', sub: 'to the ' + closeLbl(ctx) + ' close, a row per holding and week',
      body: recentRows(ctx, 6, true) + K.foot('<b>Held up:</b> did better than doing nothing over its horizon. <b>Open:</b> still inside it.'), acts: [K.cbtn('All calls', 'nav:calls', 'ghost', 'list')] });
  }

  /* ---------- sheets ---------- */
  function whySheet(ctx, k) {
    var e = E(), s = stanceNow(ctx, k);
    var items = e.why[k].map(function (r) {
      var src = r[2] === 'web' ? '<span class="pe-src">' + K.ms('public') + ' From the web · ' + e.web.source + ' · ' + e.web.date + ' · quoted</span><div class="pe-q">' + K.esc(r[1]) + '</div>'
        : r[2] === 'engine' ? '<span class="pe-src">' + K.ms('function') + ' From the engine · get_signals</span>' + K.p(K.esc(r[1])) : '<span class="pe-src">' + K.ms('tune') + ' From your preferences</span>' + K.p(K.esc(r[1]));
      return '<li><span class="mp-hl">' + r[0] + '</span>' + src + '</li>';
    }).join('');
    return '<div class="pv5-esheet"><div class="sheet-h"><span class="mp-t3">Why ' + STU(s.s) + '?</span>' + K.stance(s.s, s.c) + '</div>' + K.foot(NAME[k] + ' · ' + e.framing[s.s] + '.') +
      '<ul class="pe-ul">' + items + '</ul>' + K.note('shield', 'Web results are quoted with their source, never followed. The search ran in a call of its own that held the fund’s name and ISIN, and no household figure.') +
      '<div class="fx g8 wrap">' + K.btn('Ask more in the chat', 'eng:askmore', 'primary', 'chat_bubble') + K.btn('Close', 'eng:closesheet', 'plain') + '</div>' + draftCard() + '</div>';
  }
  function plainSheet(ctx) {
    var e = E(), b = briefData(ctx);
    return '<div class="pv5-esheet"><div class="sheet-h"><span class="mp-t3">The plain brief</span>' + draftCard() + '</div>' +
      K.note('savings', 'At 95% of this month’s Claude ceiling the brief, the wrap and the alerts go out as templates: the engine’s figures, without words, until the cycle renews on Tue 3 Nov. Alerts are never dropped.') +
      K.ccard({ cls: 'pv5-ecard', chip: K.chip('Morning brief · ' + b.when.replace(/^\w+ /, '') + ' · plain', 'mp-neutral'), h: 'Holdings ' + K.gbp(b.tot) + ' · ' + K.move(b.day.day_gbp, b.day.day_pct, { dp: 2 }) + ' Fri',
        body: '<div class="pe-list">' + UK.map(function (k) { return '<span>' + SHORT[k] + ' ' + K.gbp(val(ctx, k)) + ' · ' + sgnPct(e.day.by[k].pct, Math.abs(e.day.by[k].pct) < 0.1 ? 2 : 1) + '</span>'; }).join('') + '<span>Prices 5 of 5 fresh · self-test ✓ 07:04</span></div>' + K.foot('The plain brief: the engine’s figures, without words, until 3 Nov.') }) +
      '<div class="fx g8 wrap">' + K.btn('Close', 'eng:closesheet', 'plain') + '</div></div>';
  }

  /* ---------- the system surfaces (iPhone, iPad, the foldable) ---------- */
  function lockFri(ctx) {
    var e = E();
    return lockScreen(ctx, { date: 'Friday 23 October', time: ctx.tm.replace(/^0/, ''), quiet: 'Quiet hours from 22:00 · only a critical alert rings', notifs: [
      notif({ top: 'Time sensitive', topCls: 'pe-ts', t: 'MyPaisa · Red alert', when: '21:05', body: e.alerts.red.lock, go: 'eng:red' }),
      notif({ top: 'Amber · no sound', t: 'MyPaisa', when: '21:05', body: 'Worth a look: Silver ETC fell 1.4% today. Nothing to do.', go: 'eng:red2' }),
      notif({ t: 'MyPaisa · Evening wrap', when: '21:15', body: 'The holdings closed lower today: Robotics passed your 8% line. Nothing to do tonight.', go: 'eng:red2' })
    ] });
  }
  function lockMon(ctx) {
    return lockScreen(ctx, { date: 'Monday 26 October', time: '7:15', notifs: [
      notif({ t: 'MyPaisa · Morning brief', when: 'now', body: E().brief.lock, go: 'eng:openbrief' })
    ] });
  }

  /* ---------- the chapters ---------- */
  function who(ctx) { return ctx.viewer === 'asha' ? 'Asha' : 'Arun'; }
  var PRICES_CHIPS = [['Why provisional?', 'help', 'chip:why'], ['Where prices come from', 'route', 'nav:holdings/prices'], ['What changed?', 'history', 'chip:changed']];

  M.chapter({ key: 'p10', n: '10', order: 10, title: 'Prices and the engine', short: 'Prices, engine', steps: [
    { id: 'p10-provisional', d: 'Fri 23 Oct', tm: '07:12', t: 'Two prices from Wednesday', draft: true,
      g: 'Friday morning: two of the four priced holdings have no Thursday close. Each uses Wednesday’s, labelled, so the total is provisional and today’s move waits. Tap How MyPaisa finds a price.',
      page: 'holdings/provisional', focus: 'page', target: 'nav:holdings/prices', scroll: { page: 'eng-prov' },
      chat: function (ctx) {
        var e = E();
        return [K.daysep('Fri 23 Oct'), K.me('Why does it say provisional?', '07:12'),
          K.ai('Robotics ETF and Silver ETC have no Thursday close yet. Yahoo Finance sent none for those two London lines, Twelve Data’s free tier does not serve London, and the iShares page timed out, so both use Wednesday’s close, labelled. The holdings read ' + K.gbp(e.fresh.total) + ' for now; the 21:00 run tries again.', { meta: 'get_portfolio · get_holding · the price chain, recorded at 07:04', icon: 'function' })];
      },
      composer: { chips: PRICES_CHIPS } },
    { id: 'p10-prices', d: 'Fri 23 Oct', tm: '07:14', t: 'Where each price comes from', draft: true,
      g: 'Each kind has a chain of sources: the first that answers with fresh data wins, and stale is always last, labelled. Below it, where two sources disagreed this month. Then see Friday 21:04.',
      page: 'holdings/prices', focus: 'page', target: 'eng:filled',
      chat: function (ctx) {
        return [K.daysep('Fri 23 Oct'), K.me('Why does it say provisional?', '07:12'), K.ai('Robotics ETF and Silver ETC have no Thursday close yet, so both use Wednesday’s close, labelled.', { meta: 'get_portfolio · get_holding' }),
          K.me('Will someone be told if it stays broken?', '07:14'), K.ai('Yes, but not yet: ' + E().fresh.alarm.charAt(0).toLowerCase() + E().fresh.alarm.slice(1) + ' These are a day old.', { meta: 'the alarm rule, from the Admin center’s settings' })];
      } },
    { id: 'p10-holdings', d: 'Mon 26 Oct', tm: '07:20', t: 'The holdings, stances in shadow', draft: true,
      g: 'Monday, prices to the Fri 23 Oct close. Friday 21:04 filled the gap, so nothing is provisional. Every holding has the engine’s stance beside it, in shadow: written and graded, not yet sent. Open Balanced.',
      page: 'holdings', focus: 'page', target: 'nav:holding/balanced',
      chat: function (ctx) {
        var e = E();
        return [K.daysep('Fri 23 Oct'), K.ai('21:04: Yahoo Finance answered again. Thursday’s and Friday’s closes are in for Robotics and Silver; nothing is provisional.', { meta: 'ingest · gap filled', icon: 'update' }),
          K.daysep('Today'), K.me('What does the engine make of our funds?', '07:19'),
          K.ai('Four calls this morning, all in shadow until the record has beaten doing nothing for 8 weeks (it is at 6): Balanced HOLD · ' + e.now.balanced.conf + '%, NASDAQ 100 PAUSE · ' + e.now.nasdaq.conf + '%, Robotics HOLD · ' + e.now.robotics.conf + '%, Silver HOLD · ' + e.now.silver.conf + '%. The Holdings page has each one’s reasons.', { meta: 'get_stances · from the engine, not from Claude' })];
      } },
    { id: 'p10-overview', d: 'Mon 26 Oct', tm: '07:21', t: 'A holding’s Overview', draft: true,
      g: 'The summary first: the stance in shadow, what it means in plain words, what would change it, its own record. The chart shows the engine’s one-month range ahead. Open Technical.',
      page: 'holding/balanced', focus: 'page', target: 'fold:tech',
      chat: function (ctx) {
        return [K.daysep('Today'), K.me('Why is Balanced on HOLD if it keeps rising?', '07:21'),
          K.ai('Its trend and momentum would say Buy, but October’s top-up is already in (' + K.gbp(200) + ' on Thu 15 Oct), and your cap is one a month. So: nothing to do until November’s window opens on Sun 1 Nov.', { meta: 'get_signals · get_stances · your top-up cap' })];
      } },
    { id: 'p10-technical', d: 'Mon 26 Oct', tm: '07:23', t: 'Pillars, cascade, the confidence sum', draft: true,
      g: 'NASDAQ 100’s Technical: four pillars from −2 to +2, the flags, the cascade step by step to PAUSE, and the confidence worked out. Its PAUSE calls held up 10 of 24 times, so history pulls 75 down to 64: the engine learns from its own record.',
      page: 'holding/nasdaq', focus: 'page', open: ['tech'], scroll: { page: 'eng-techcard' },
      chat: function (ctx) {
        var w = E().now.nasdaq;
        return [K.daysep('Today'), K.me('Show me how it got to 64% on the NASDAQ fund', '07:23'),
          K.ai('All from the engine: ' + w.conf + '% = 50 + ' + w.agree + ' (three pillars point the PAUSE’s way) + ' + w.persist + ' (twenty bars in PAUSE) − ' + Math.abs(w.hist) + ' (its PAUSE calls held up ' + w.hist_held + ' of ' + w.hist_n + '). The cascade: risk elevated, so PAUSE: keep what Asha has, delay new money.', { meta: 'get_signals · get_scorecard' })];
      } }
  ] });

  M.chapter({ key: 'p11', n: '11', order: 11, title: 'Briefs, alerts, charts, technical mode', short: 'Briefs, alerts', steps: [
    { id: 'p11-lockfri', d: 'Fri 23 Oct', tm: '21:15', t: 'Friday evening on the Lock Screen', draft: true,
      g: 'A red alert, time sensitive with sound, at 21:05; an amber one, silent; the 21:15 wrap. No amounts on the Lock Screen unless Arun turns them on. Quiet hours start at 22:00. Tap the red alert.',
      system: lockFri, page: 'holding/robotics', focus: 'chat', target: 'eng:red', on: { 'eng:red2': 'next' },
      chat: function (ctx) { return [K.daysep('Fri 23 Oct'), redCard(ctx), amberCard(ctx), wrapCard(ctx)]; } },
    { id: 'p11-acted', d: 'Fri 23 Oct', tm: '21:17', t: 'The red alert card, and I acted', draft: true,
      g: 'Why first, then what would help, then this week’s red budget and the cooldown. Arun taps I acted and says what he did; MyPaisa logs it (log_decision) for Saturday’s review to compare with the signal.',
      page: 'holding/robotics', focus: 'chat', scroll: { chat: 'eng-logged' },
      chat: function (ctx) {
        var d = E().decisions[2];
        return [K.daysep('Fri 23 Oct'), redCard(ctx), K.me('I acted', '21:16'),
          K.ai('What did you do?', { cards: [K.ccard({ cls: 'pv5-ecard', body: '<div class="pe-row">' + ['Held off a top-up', 'Bought more', 'Sold some', 'Something else'].map(function (x, n) { return K.cbtn(x, n === 0 ? 'eng:noop' : 'eng:noop', n === 0 ? 'primary' : 'ghost'); }).join('') + '</div>' })] }),
          K.me('Held off a ' + K.gbp(50) + ' top-up to Robotics', '21:17'),
          K.ai('', { cards: [K.ccard({ cls: 'pv5-ecard', id: 'eng-logged', chip: K.chip(K.ms('check') + 'Logged', 'mp-add') + draftCard(), h: 'Held off a ' + K.gbp(50) + ' top-up to Robotics', sub: d.logged + ' · no trade, no record changed', body: K.p('The engine’s call was HOLD · ' + d.signal_conf + '%, nothing to do. Saturday’s review compares the two; it is graded on ' + d.due + ', two weeks on.'), acts: [K.cbtn('Undo', 'eng:noop', 'ghost', 'undo')] })], meta: 'log_decision' })];
      } },
    { id: 'p11-lockmon', d: 'Mon 26 Oct', tm: '07:15', t: 'The 07:15 brief on the Lock Screen', draft: true,
      g: 'Monday 07:15: the brief arrives with no amounts, “Nothing to do this week. Balanced is steady.” With Show amounts on it would read the holdings and Friday’s move; never with privacy on. On the web it is a Web Push and the Today page. Tap it.',
      system: lockMon, page: 'today', focus: 'chat', target: 'eng:openbrief',
      chat: function (ctx) { return [K.daysep('Today'), briefCard(ctx)]; } },
    { id: 'p11-brief', d: 'Mon 26 Oct', tm: '07:16', t: 'The brief, as a card and as Today', draft: true,
      g: 'The answer first, then what moved, Friday and the week. Before the gate the brief carries no stance line. The same brief is the Today screen. Open the card’s Technical.',
      page: 'today', focus: 'chat', target: 'fold:brieftech',
      chat: function (ctx) { return [K.daysep('Today'), briefCard(ctx, { id: 'eng-brief' })]; } },
    { id: 'p11-technical', d: 'Mon 26 Oct', tm: '07:17', t: 'Technical mode on a card', draft: true,
      g: 'Technical opens on this card only: the ECB rate, the freshness and the self-test. /technical, or You, opens it on every card; Simple is the default. A word like Brier opens the glossary on a tap.',
      page: 'today', focus: 'chat', open: ['brieftech'],
      composer: { chips: [['/technical', 'tune', 'eng:techmode'], ['Glossary', 'menu_book', 'eng:gloss'], ['What changed?', 'history', 'chip:changed']] },
      chat: function (ctx) { return [K.daysep('Today'), briefCard(ctx, { id: 'eng-brief' }), K.ai('Technical is open on this card. Say /technical to open it on every card, or switch it in You. Tap a word such as <b>Brier</b> or <b>range</b> for the glossary.', { meta: 'technical mode: simple (your setting)', icon: 'tune' })]; } },
    { id: 'p11-plain', d: 'Mon 26 Oct', tm: '07:18', t: 'The plain brief, when the ceiling is near', draft: true,
      g: 'A state, drawn for the record: if this month’s Claude spend passed 95% of the ceiling, the same brief would go out as a template, the engine’s figures without words, until the cycle renews. Alerts are never dropped.',
      page: 'today', focus: 'page', sheet: plainSheet,
      chat: function (ctx) { return [K.daysep('Today'), briefCard(ctx)]; } }
  ] });

  M.chapter({ key: 'p12', n: '12', order: 12, title: 'Ask anything: research cards and scenarios', short: 'Ask anything', steps: [
    { id: 'p12-stream', d: 'Mon 26 Oct', tm: '10:30', t: 'A question, answered from the tools', draft: true,
      g: 'Arun asks about Asha’s fund. The answer streams in words while the card waits for the engine’s figures: it shows whole or not at all, never half a card.',
      page: 'holding/nasdaq', focus: 'chat',
      chat: function (ctx) {
        return [K.daysep('Today'), K.me('Should we worry about Asha’s NASDAQ fund?', '10:30'),
          K.ai('Not worry, but it is the one to watch: it has fallen 8.8% from its 7 Oct high…', { cards: [skeletonCard()], meta: 'calling get_holding · get_signals · get_history', icon: 'progress_activity' })];
      } },
    { id: 'p12-answer', d: 'Mon 26 Oct', tm: '10:30', t: 'The answer, with its stance card', draft: true,
      g: 'The words first, then the stance card in shadow: why, what would change it, and its own record. Every figure is the engine’s; Claude only puts them into words. Tap Why?',
      page: 'holding/nasdaq', focus: 'chat', target: 'why:nasdaq',
      chat: function (ctx) {
        return [K.daysep('Today'), K.me('Should we worry about Asha’s NASDAQ fund?', '10:30'),
          K.ai('Not worry, but it is the one to watch: it has fallen 8.8% from its 7 Oct high, and the engine’s call, in shadow, is PAUSE: keep what Asha has, and hold new money until the next review.', { cards: [stanceCard(ctx, 'nasdaq')], meta: 'get_holding · get_signals · get_history · get_stances' })];
      } },
    { id: 'p12-why', d: 'Mon 26 Oct', tm: '10:31', t: 'Why? Three reasons, each with its source', draft: true,
      g: 'Why? opens a sheet: three reasons, each saying where it came from. The one from the web is labelled and quoted, never followed. Ask more in the chat.',
      page: 'holding/nasdaq', focus: 'chat', target: 'eng:askmore', sheet: function (ctx) { return whySheet(ctx, 'nasdaq'); }, sheetClose: 'eng:closesheet', on: { 'eng:closesheet': 'next' },
      chat: function (ctx) { return [K.daysep('Today'), K.ai('', { cards: [stanceCard(ctx, 'nasdaq')] })]; } },
    { id: 'p12-whatif', d: 'Mon 26 Oct', tm: '10:34', t: 'What if the pound falls 10%?', draft: true,
      g: 'A scenario card from the look-through: nothing is green and there is no ▲, because a what-if is not a gain. Try another chips sit under it.',
      page: 'overlap', focus: 'chat',
      composer: { chips: [['Pound +10%', 'currency_pound', 'scen:up'], ['Shares −20%', 'trending_down', 'scen:shares'], ['Your own', 'edit', 'scen:own']] },
      chat: function (ctx) { return [K.daysep('Today'), K.me('What if the pound falls 10%?', '10:34'), K.ai('', { cards: [scenarioCard(ctx)], meta: 'run_scenario · the look-through' })]; } },
    { id: 'p12-research', d: 'Mon 26 Oct', tm: '10:40', t: 'Research cards: profile and overlap', draft: true,
      g: 'Two research cards, each a verdict or a one-liner first, the evidence, and Technical with its sources: what Balanced is, and what the three funds share.',
      page: 'holding/balanced', focus: 'chat',
      chat: function (ctx) { return [K.daysep('Today'), K.me('What is Balanced, really?', '10:39'), K.ai('', { cards: [profileCard(ctx)], meta: 'get_holding · the factsheet' }), K.me('Do our funds overlap?', '10:40'), K.ai('', { cards: [overlapCard(ctx)], meta: 'get_portfolio · the look-through' })]; } },
    { id: 'p12-debate', d: 'Mon 26 Oct', tm: '10:46', t: 'Fund vs benchmark, and both sides', draft: true,
      g: 'Is Asha’s fund doing its job? On track. Then the case against Balanced: two sides and a judge (it runs because the stance is above 70%). The judge never changes the stance; only the rules engine sets it.',
      page: 'holding/balanced', focus: 'chat',
      chat: function (ctx) { return [K.daysep('Today'), K.me('Is Asha’s NASDAQ fund doing its job?', '10:44'), K.ai('', { cards: [fvbCard(ctx)], meta: 'get_history · the index, in pounds' }), K.me('What’s the case against Balanced?', '10:46'), K.ai('', { cards: [bvbCard(ctx)], meta: 'two calls and a judge · get_signals' })]; } },
    { id: 'p12-pref', d: 'Mon 26 Oct', tm: '10:52', t: 'A preference, after Confirm', draft: true,
      g: 'After Friday’s Silver alert Arun says “Stop pinging me under 2%”. A preference changes only through a card that says what it changes and what still comes. Confirm saves it, with its audit row.',
      page: 'holdings', focus: 'chat', target: 'eng:pref:confirm',
      on: { 'eng:pref:confirm': function (st) { st.open.prefsaved = true; }, 'eng:pref:undo': function (st) { st.open.prefsaved = false; } },
      chat: function (ctx) { return [K.daysep('Today'), K.me('Stop pinging me under 2%', '10:52'), K.ai(ctx.has('prefsaved') ? 'Saved.' : 'Here is the change. Nothing is saved until you confirm.', { cards: [prefCard(ctx, ctx.has('prefsaved'))], meta: ctx.has('prefsaved') ? 'propose_change · confirmed · audited' : 'propose_change · waiting for Confirm' })]; } }
  ] });

  M.chapter({ key: 'p13', n: '13', order: 13, title: 'Track record and calibration', short: 'Track record', steps: [
    { id: 'p13-review', d: 'Sat 24 Oct', tm: '09:00', t: 'The Saturday review: my calls, your decisions', draft: true,
      g: 'The only place stances appear before the gate. First the engine’s own calls graded this week, then each decision someone logged against what the signal said, then calibration and the gate: week 6 of 8. The Forecaster’s part follows, in practice.',
      page: 'track', focus: 'chat', scroll: { chat: 'eng-review' },
      chat: function (ctx) { return [K.daysep('Sat 24 Oct')].concat(reviewCards(ctx, 6).map(function (c) { return K.ai('', { cards: [c] }); })).concat([K.ai('', { meta: 'Opus 5.5 · get_scorecard · get_stances · log_decision rows', icon: 'event_repeat' })]); } },
    { id: 'p13-track', d: 'Sat 24 Oct', tm: '09:05', t: 'Track record, graded against doing nothing', draft: true,
      g: 'Four numbers: how many calls held up, how far they beat doing nothing, how many outcomes fell inside the range (too many: the ranges are too wide), and the Brier score. The gate meter beside: 6 of 8.',
      page: 'track', focus: 'page',
      chat: function (ctx) { return [K.daysep('Sat 24 Oct'), K.me('/scorecard', '09:05'), K.ai('From the engine’s grades: ' + score(ctx).held + ' of ' + score(ctx).calls + ' calls held up, ' + sgnPct(score(ctx).edge, 2) + ' a call against doing nothing. The Track record page has the rest.', { meta: 'get_scorecard' })]; } },
    { id: 'p13-calib', d: 'Sat 24 Oct', tm: '09:06', t: 'Does 64% mean 64%?', draft: true,
      g: 'Calibration: for each band of stated confidence, how often the call held up (the bar) against what it said (the tick). Then the recent calls, a row per holding and week, held up, missed or open.',
      page: 'track', focus: 'page', scroll: { page: 'eng-calib' },
      chat: function (ctx) { var b = score(ctx).buckets[1]; return [K.daysep('Sat 24 Oct'), K.me('Does 64% mean 64%?', '09:06'), K.ai('Not quite: calls said 60 to 69% held up ' + b.held + ' of ' + b.calls + ' times, ' + b.rate + '%. The engine has been too modest there. It changes its map only after 8 weeks of evidence, and logs the change.', { meta: 'get_scorecard · reliability table' })]; } },
    { id: 'p13-holding', d: 'Sat 24 Oct', tm: '09:08', t: 'A holding’s Track record tab', draft: true,
      g: 'The NASDAQ 100 ETF’s own record: 31 of 46 calls held up, run by run, each with why it was made. Its PAUSE calls in August missed; its PAUSE since 28 Sep held. That record is what pulls today’s confidence down.',
      page: 'holding/nasdaq/track', focus: 'page',
      chat: function (ctx) { return [K.daysep('Sat 24 Oct'), K.me('How has it done on the NASDAQ fund?', '09:08'), K.ai('31 of 46 calls held up. Buy calls: 21 of 22. PAUSE calls: 10 of 24, because the August ones came while it kept rising.', { meta: 'get_scorecard(nasdaq)' })]; } },
    { id: 'p13-overlap', d: 'Sat 24 Oct', tm: '09:10', t: 'Overlap: how many bets, in which currency', draft: true,
      g: 'Five holdings behave like about one, since Balanced is 95% of them. 59% sits in US dollars underneath. Nvidia is held three ways.',
      page: 'overlap', focus: 'page',
      chat: function (ctx) { return [K.daysep('Sat 24 Oct'), K.ai('', { cards: [overlapCard(ctx)], meta: 'get_portfolio · the look-through' })]; } }
  ] });

  M.chapter({ key: 'p15', n: '15', order: 15, title: 'Stances go live', short: 'Stances live', steps: [
    { id: 'p15-gate', d: 'Sat 7 Nov', tm: '09:00', t: 'The gate passes: 8 weeks beating doing nothing', draft: true,
      g: 'The week to Fri 6 Nov is the eighth in a row to beat doing nothing, checked in code and reported in the review. From Mon 9 Nov the stances leave the shadow. Arun’s Robotics decision is graded too: his call did better.',
      page: 'track', focus: 'chat', scroll: { chat: 'eng-review' },
      chat: function (ctx) { return [K.daysep('Sat 7 Nov')].concat(reviewCards(ctx, 7).map(function (c) { return K.ai('', { cards: [c] }); })); } },
    { id: 'p15-portfolio', d: 'Sat 7 Nov', tm: '09:06', t: 'Live stance chips on the Portfolio card', draft: true,
      g: 'The Portfolio card now carries each holding’s stance. Balanced says Buy (its ADD stance): November’s top-up could go in. Buy is only a label: there is no button that trades.',
      page: 'holdings', focus: 'chat',
      chat: function (ctx) { return [K.daysep('Sat 7 Nov'), K.me('How’s the portfolio?', '09:06'), K.ai('', { cards: [portfolioCard(ctx)], meta: 'get_portfolio · get_stances, live' })]; } },
    { id: 'p15-brief', d: 'Mon 9 Nov', tm: '07:15', t: 'The brief, with its stance line', draft: true,
      g: 'The first weekday brief after the gate: the answer first (“One to look at: Balanced says Buy”), what moved, then the stance line with each holding’s chip.',
      page: 'today', focus: 'page',
      chat: function (ctx) { return [K.daysep('Mon 9 Nov'), briefCard(ctx)]; } },
    { id: 'p15-calls', d: 'Mon 9 Nov', tm: '07:20', t: '/calls: recent calls and how they turned out', draft: true,
      g: 'Recent calls: holding, dates, call, outcome. Held up: did better than doing nothing over its horizon. Open: still inside it. Stances live: 8 weeks beating doing nothing. A view, not advice.',
      page: 'calls', focus: 'page',
      chat: function (ctx) { return [K.daysep('Mon 9 Nov'), K.me('/calls', '07:20'), K.ai('', { cards: [callsCard(ctx)], meta: 'get_stances · get_scorecard' })]; } }
  ] });
})();
