/* MyPaisa · Prototype v5 (MA-291): the kit. Small functions that return HTML strings built only from the
   DS v1 classes (tokens.css, ios.css) and prototype-v5.css. Every figure goes through gbp/inr/usd/pct so
   privacy mode masks it (.mny), and every button carries data-go so the prototype's one click handler
   reaches it. Charts follow the kit's rules: each stroke in its own SVG (no shared <use> defs, lesson 37),
   labels and dots in HTML over the SVG, never text inside it. */
(function () {
  'use strict';
  if (window.MP5K) return;
  var K = {};
  var FX = 112.5;
  K.FX = FX;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  K.esc = esc;
  function attr(k, v) { return v == null || v === false ? '' : ' ' + k + '="' + esc(v) + '"'; }
  K.go = function (key) { return key ? ' data-go="' + esc(key) + '"' : ''; };

  /* ---------- figures ---------- */
  function rhe(x) { var f = Math.floor(x); return Math.abs(x - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); }
  function grpUK(n, dp) {
    return Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
  }
  function grpIN(n) {
    var s = String(rhe(Math.abs(n)));
    return s.length > 3 ? s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3) : s;
  }
  function sgn(n, o) { return n < 0 ? '−' : (o && o.sign && n > 0 ? '+' : ''); }
  function isPriv() { return !!(window.MP5 && window.MP5.state && window.MP5.state().priv); }
  function redactAria(s) {
    return isPriv() && s ? String(s).replace(/[−+-]?[£₹$€]\s?[\d,.]+[kmKM]?/g, 'Hidden') : s;
  }
  function maskChartLbl(t) {
    var s = String(t == null ? '' : t);
    return (isPriv() && s.indexOf('mny') < 0 && /[£₹$€]\s?\d/.test(s)) ? wrapM(s) : s;
  }
  function wrapM(s, o) {
    if (o && o.raw) return s;
    if (isPriv()) {
      var len = Math.max(4, Math.min(8, String(s || '').length));
      var pad = new Array(len + 1).join('\u00a0');
      return '<span class="mny" role="img" aria-label="Hidden"><span aria-hidden="true">' + pad + '</span></span>';
    }
    return '<span class="mny">' + s + '</span>';
  }
  K.mny = wrapM;
  /* gbp(22925) → £22,925; gbp(-786, {sign:true}) → −£786; gbp(1.5, {dp:2}); gbp(n, {raw:true}) has no mask span */
  K.gbp = function (n, o) { o = o || {}; return wrapM(sgn(n, o) + '£' + grpUK(n, o.dp), o); };
  K.inr = function (n, o) { o = o || {}; return wrapM(sgn(n, o) + '₹' + grpIN(n), o); };
  K.usd = function (n, o) { o = o || {}; return wrapM(sgn(n, o) + '$' + grpUK(n, o.dp), o); };
  K.eur = function (n, o) { o = o || {}; return wrapM(sgn(n, o) + '€' + grpUK(n, o.dp), o); };
  K.money = function (n, ccy, o) { return ({ GBP: K.gbp, INR: K.inr, USD: K.usd, EUR: K.eur }[ccy || 'GBP'] || K.gbp)(n, o); };
  /* an Indian figure with its pounds beside it (ARCHITECTURE §22.3) */
  K.inrGbp = function (n, o) { return K.inr(n, o) + ' <span class="mp-ink2">· ' + K.gbp(n / FX, o) + '</span>'; };
  /* percentages are not masked by privacy mode: they carry no pounds */
  K.pct = function (n, o) { o = o || {}; var dp = o.dp == null ? (Math.abs(n) < 10 && n % 1 !== 0 ? 1 : 0) : o.dp; return sgn(n, o) + Math.abs(n).toFixed(dp) + '%'; };
  K.num = function (n, dp) { return grpUK(n, dp); };
  /* a day's move: ▲ £96 · 0.4%  (green only for a gain shown with ▲; a fall is quiet ink with ▼) */
  K.move = function (gbpv, pctv, o) {
    o = o || {};
    var up = (pctv != null ? pctv : gbpv) > 0, flat = (pctv != null ? pctv : gbpv) === 0;
    var arrow = flat ? '' : up ? '▲ ' : '▼ ';
    var parts = [];
    if (gbpv != null) parts.push(K.gbp(Math.abs(gbpv)));
    if (pctv != null) parts.push(Math.abs(pctv).toFixed(o.dp == null ? 1 : o.dp) + '%');
    return '<span class="' + (flat ? 'mp-ink2' : up ? 'mp-up' : 'mp-ink2') + ' mp-num nowrap">' + arrow + parts.join(' · ') + '</span>';
  };

  /* ---------- small pieces ---------- */
  K.ms = function (name, cls) { return '<span class="ms' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(name) + '</span>'; };
  K.chip = function (t, cls, icon) { return '<span class="mp-chip ' + (cls || 'mp-neutral') + '">' + (icon ? K.ms(icon) : '') + t + '</span>'; };
  var ST = {
    ADD: ['Buy', 'mp-add'], BUY: ['Buy', 'mp-add'], HOLD: ['Hold', 'mp-hold'], PAUSE: ['Pause', 'mp-pause'],
    TRIM: ['Trim', 'mp-trim'], REBALANCE: ['Rebalance', 'mp-reb'], WATCH: ['Watch', 'mp-watch'], WAIT: ['Wait', 'mp-watch']
  };
  /* stance(code, conf, o): every card says Buy for ADD and for BUY (MA-275); upper: true writes PAUSE · 64% */
  K.stanceLabel = function (code) { return (ST[code] || [code])[0]; };
  K.stance = function (code, conf, o) {
    o = o || {};
    var s = ST[code] || [code, 'mp-neutral'];
    var label = o.upper ? (code === 'ADD' ? 'BUY' : code) : s[0];
    return '<span class="mp-chip ' + s[1] + '">' + label + (conf != null ? ' · ' + conf + '%' : '') + '</span>';
  };
  K.draft = function (t) { return '<span class="mp-draft">' + K.ms('edit_note') + (t || 'Draft, not picked') + '</span>'; };
  K.picked = function (t) { return K.chip(K.ms('check') + (t || 'Picked'), 'mp-add'); };
  K.inpractice = function (t) { return K.chip(K.ms('science') + (t || 'In practice'), 'mp-neutral'); };
  K.shadow = function (t) { return K.chip(K.ms('visibility_off') + (t || 'In shadow'), 'mp-neutral'); };
  K.note = function (icon, t, cls) { return '<div class="sysnote' + (cls ? ' ' + cls : '') + '">' + K.ms(icon || 'info') + '<span>' + t + '</span></div>'; };
  K.kv = function (k, v, cls) { return '<div class="kv' + (cls ? ' ' + cls : '') + '"><span>' + k + '</span><span>' + v + '</span></div>'; };
  K.mode = function () { return (window.MP5 && window.MP5.state && window.MP5.state().charts) || 'a'; };
  K.bar = function (frac, cls, o) {
    o = o || {};
    var f = Math.max(0, Math.min(1, frac)), m = o.mode || K.mode();
    if (m === 'classic') return '<div class="bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + (f * 100).toFixed(1) + '%"></i></div>';
    if (m === 'c') {
      var lit = f <= 0 ? 0 : Math.max(1, Math.round(f * 10)), cells = '';
      var overFrom = o.overFrom != null ? Math.round(o.overFrom * 10) : 11;
      for (var i = 1; i <= 10; i++) cells += '<i class="' + (i <= lit ? (i > overFrom ? 'over' : 'on') : '') + '"></i>';
      return '<div class="mp5-segbar' + (cls ? ' ' + cls : '') + '">' + cells + '</div>';
    }
    var tick = o.tick != null ? '<span class="mp5-bartick" style="left:' + Math.max(2, Math.min(100, o.tick * 100)).toFixed(1) + '%"></span>' : '';
    if (m === 'b') return '<div class="bar bar-bullet' + (o.tick != null ? ' has-tick' : '') + (cls ? ' ' + cls : '') + '"><i style="width:' + (f * 100).toFixed(1) + '%"></i>' + tick + '</div>';
    if (o.tick != null) return '<div class="bar has-tick' + (cls ? ' ' + cls : '') + '"><span class="bar-clip"><i style="width:' + (f * 100).toFixed(1) + '%"></i></span>' + tick + '</div>';
    return '<div class="bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + (f * 100).toFixed(1) + '%"></i></div>';
  };
  /* a pillar's −2..+2: classic 4-bar meter, A diverging centre spine, B 5-stop scale dots, C 5-cell bento matrix */
  K.pillar = function (name, v, sub) {
    var m = K.mode(), lbl = esc(name) + ' ' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), meter = '';
    if (m === 'a') {
      meter = '<span class="mp5-pil-a" aria-label="' + lbl + '">' +
        '<i class="' + (v <= -2 ? 'neg' : '') + '"></i><i class="' + (v <= -1 ? 'neg' : '') + '"></i><b></b>' +
        '<i class="' + (v >= 1 ? 'on' : '') + '"></i><i class="' + (v >= 2 ? 'on' : '') + '"></i></span>';
    } else if (m === 'b') {
      var dots = '';
      for (var j = -2; j <= 2; j++) dots += '<i class="' + (j === v && v > 0 ? 'on' : j === v && v < 0 ? 'neg' : j === 0 ? 'zero' : '') + '"></i>';
      meter = '<span class="mp5-pil-b" aria-label="' + lbl + '">' + dots + '</span>';
    } else if (m === 'c') {
      var cells = '';
      for (var k = -2; k <= 2; k++) {
        var active = (v > 0 && k > 0 && k <= v) || (v < 0 && k < 0 && k >= v);
        cells += '<i class="' + (active ? (v > 0 ? 'on' : 'neg') : k === 0 ? 'zero' : '') + '"></i>';
      }
      meter = '<span class="mp5-pil-c" aria-label="' + lbl + '">' + cells + '</span>';
    } else {
      var marks = '';
      for (var i = -2; i <= 2; i++) {
        if (i === 0) continue;
        var on = (v > 0 && i > 0 && i <= v) || (v < 0 && i < 0 && i >= v);
        marks += '<i class="' + (on ? (v > 0 ? 'on' : 'neg') : '') + '"></i>';
      }
      meter = '<span class="pill-meter" aria-label="' + lbl + '">' + marks + '</span>';
    }
    return '<div class="mp-row" style="padding-left:0;padding-right:0"><div class="f1 fx col"><span class="mp-sub">' + name + '</span>' +
      (sub ? '<span class="mp-foot mp-ink2">' + sub + '</span>' : '') + '</div>' + meter +
      '<span class="mp-sub mp-num" style="width:28px;text-align:right">' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '</span></div>';
  };

  /* ---------- buttons ---------- */
  /* btn(label, key, kind, icon): kind primary | tinted | plain | small (web and app pages) */
  K.btn = function (t, key, kind, icon) {
    var k = (kind || 'tinted').split(' ').map(function (x) { return 'mp-btn-' + x; }).join(' ');
    return '<button type="button" class="mp-btn ' + k + '"' + K.go(key) + '>' + (icon ? K.ms(icon) : '') + '<span>' + t + '</span></button>';
  };
  /* cbtn(label, key, kind, icon): a chat card's button; kind primary | ghost | alert */
  K.cbtn = function (t, key, kind, icon) {
    return '<button type="button" class="cbtn' + (kind ? ' cbtn-' + kind : '') + '"' + K.go(key) + '>' + (icon ? K.ms(icon) : '') + '<span>' + t + '</span></button>';
  };
  K.seg = function (items) {
    return '<div class="mp-seg" role="group">' + items.map(function (i) { return '<button type="button" class="mp-seg-i' + (i.on ? ' on' : '') + '"' + K.go(i.go) + '>' + i.t + '</button>'; }).join('') + '</div>';
  };
  K.tabs = function (items) {
    return '<div class="tabsx" role="tablist">' + items.map(function (i) { return '<button type="button" role="tab" aria-selected="' + (i.on ? 'true' : 'false') + '" class="' + (i.on ? 'on' : '') + '"' + K.go(i.go) + '>' + i.t + '</button>'; }).join('') + '</div>';
  };

  /* ---------- page blocks ---------- */
  /* card({t: 'Section title', r: 'right side html', body, cls, id}) */
  K.card = function (o) {
    return '<section class="mp-card' + (o.cls ? ' ' + o.cls : '') + '"' + attr('id', o.id) + '>' +
      (o.t || o.r ? '<div class="cardh"><span class="cardh-t">' + (o.t || '') + '</span>' + (o.r || '') + '</div>' : '') + (o.body || '') + '</section>';
  };
  /* hero({k: label, v: figure html, s: line under, top: html above, extra: html below, cls}) */
  K.hero = function (o) {
    return '<section class="mp-hero' + (o.cls ? ' ' + o.cls : '') + '"' + attr('id', o.id) + '><div class="fx col g6">' + (o.top || '') +
      '<span class="mp-sub mp-hero-2">' + (o.k || '') + '</span><span class="mp-num-hero mp-num">' + (o.v || '') + '</span>' +
      (o.s ? '<span class="mp-sub mp-hero-2">' + o.s + '</span>' : '') + (o.extra || '') + '</div></section>';
  };
  /* tiles([{k, v, s}]) */
  K.tiles = function (list) {
    return '<div class="tiles">' + list.map(function (t) { return '<div class="tile"><span class="tile-k">' + t.k + '</span><span class="tile-v">' + t.v + '</span>' + (t.s ? '<span class="tile-s">' + t.s + '</span>' : '') + '</div>'; }).join('') + '</div>';
  };
  /* row({lead: html (an icon tile or initials), icon, t, s, v, vs, go, chev, id}) */
  K.row = function (o) {
    var lead = o.lead != null ? o.lead : (o.icon ? '<span class="mp-icontile" style="background:var(--mp-surface-2)">' + K.ms(o.icon) + '</span>' : '');
    var inner = lead + '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + (o.t || '') + '</span>' + (o.s ? '<span class="mp-foot mp-ink2">' + o.s + '</span>' : '') + '</div>' +
      (o.v != null || o.vs != null ? '<div class="fx col tr">' + (o.v != null ? '<span class="mp-sub mp-num" style="font-weight:600">' + o.v + '</span>' : '') + (o.vs != null ? '<span class="mp-foot">' + o.vs + '</span>' : '') + '</div>' : '') +
      (o.chev || o.go ? K.ms('chevron_right', 'mp-ink2') : '');
    return o.go ? '<button type="button" class="mp-row rowbtn"' + attr('id', o.id) + K.go(o.go) + '>' + inner + '</button>' : '<div class="mp-row"' + attr('id', o.id) + '>' + inner + '</div>';
  };
  K.list = function (rows) { return '<div class="lst">' + rows.join('') + '</div>'; };
  K.group = function (rows) { return '<div class="mp-group">' + rows.join('') + '</div>'; };
  K.section = function (t, body, r) { return '<div class="fx col g8"><div class="fx ac jb"><span class="mp-hl">' + t + '</span>' + (r || '') + '</div>' + body + '</div>'; };
  K.p = function (t, cls) { return '<p class="mp-sub' + (cls ? ' ' + cls : '') + '" style="margin:0;text-wrap:pretty">' + t + '</p>'; };
  K.foot = function (t) { return '<p class="mp-foot mp-ink2" style="margin:0;text-wrap:pretty">' + t + '</p>'; };
  /* the footer every view carries (ARCHITECTURE §1, §19.7) */
  K.viewNotAdvice = function () { return K.foot('Every figure comes from code; Claude only puts them into words. A view, not advice: MyPaisa cannot trade.'); };
  /* an editable figure (create in the chat, correct in place): state rest | edit | saved */
  K.editable = function (o) {
    if (o.state === 'edit') {
      return '<div class="fx col g8"><div class="fx ac g8"><span class="mp-t2 mp-num" style="border-bottom:2px solid var(--mp-accent)">' + o.typed + '</span><span class="caret"></span></div>' +
        '<div class="mp-sub">' + o.from + ' → ' + o.to + '</div><div class="fx g8">' + K.btn('Save', o.save, 'primary small') + K.btn('Cancel', o.cancel, 'tinted small') + '</div></div>';
    }
    return '<button type="button" class="btn-reset fx ac g6"' + K.go(o.go) + '><span class="mp-t2 mp-num">' + o.v + '</span>' + K.ms(o.state === 'saved' ? 'check_circle' : 'edit', 'mp-ink2') + '</button>' +
      (o.state === 'saved' && o.savedNote ? '<span class="mp-foot mp-ink2">' + o.savedNote + '</span>' : '');
  };

  /* ---------- the chat ---------- */
  K.daysep = function (t) { return '<div class="daysep">' + t + '</div>'; };
  K.me = function (t, time) { return '<div class="me">' + t + '</div>' + (time ? '<div class="me-time">' + time + '</div>' : ''); };
  K.typing = function () { return '<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="typing"><i></i><i></i><i></i></div></div></div>'; };
  /* ai(text html, {meta, cards: [html], icon}) */
  K.ai = function (t, o) {
    o = o || {};
    return '<div class="ai"><div class="ai-mark"><i></i></div><div class="ai-body">' + (t ? '<div class="ai-text">' + t + '</div>' : '') + (o.cards || []).join('') +
      (o.meta ? '<div class="ai-meta">' + K.ms(o.icon || 'function') + '<span>' + o.meta + '</span></div>' : '') + '</div></div>';
  };
  /* ccard({chip, h, sub, body, acts: [cbtn html], fold: {t, open, body}, tech: [lines], cls, id}) */
  K.ccard = function (o) {
    return '<div class="ccard' + (o.cls ? ' ' + o.cls : '') + '"' + attr('id', o.id) + '><div class="ccard-h">' + (o.chip ? '<div class="fx ac g6 wrap">' + o.chip + '</div>' : '') +
      (o.h ? '<span class="mp-hl">' + o.h + '</span>' : '') + (o.sub ? '<span class="mp-foot mp-ink2">' + o.sub + '</span>' : '') + '</div>' +
      (o.body ? '<div class="ccard-b">' + o.body + '</div>' : '') + (o.acts && o.acts.length ? '<div class="ccard-acts">' + o.acts.join('') + '</div>' : '') +
      (o.fold ? '<button type="button" class="ccard-fold btn-reset"' + K.go(o.fold.go) + '><span>' + (o.fold.t || 'Technical') + '</span>' + K.ms(o.fold.open ? 'expand_less' : 'expand_more') + '</button>' +
        (o.fold.open ? '<div class="ccard-tech">' + o.fold.body + '</div>' : '') : '') + '</div>';
  };

  /* ---------- charts ---------- */
  var gidSeq = 0;
  function sx(x0, x1, p0, p1) {
    var a = p0 == null ? 0 : p0, b = p1 == null ? 100 : p1;
    return function (x) { return a + ((x - x0) / (x1 - x0 || 1)) * (b - a); };
  }
  function sy(y0, y1) { return function (y) { return 100 - ((y - y0) / (y1 - y0 || 1)) * 100; }; }
  function path(pts, X, Y) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); }).join(' '); }
  /* Fritsch-Carlson monotone cubic spline on screen coordinates; vertical step jumps (dx < 0.05) stay crisp L segments */
  function smoothPts(P) {
    var n = P.length;
    if (n < 2) return '';
    if (n === 2) return 'M' + P[0][0].toFixed(2) + ' ' + P[0][1].toFixed(2) + ' L' + P[1][0].toFixed(2) + ' ' + P[1][1].toFixed(2);
    var dx = [], d = [], step = [];
    for (var i = 0; i < n - 1; i++) {
      dx[i] = P[i + 1][0] - P[i][0];
      step[i] = Math.abs(dx[i]) < 0.05;
      d[i] = step[i] ? 0 : (P[i + 1][1] - P[i][1]) / dx[i];
    }
    var m = [d[0]];
    for (var j = 1; j < n - 1; j++) {
      if (step[j - 1] || step[j] || d[j - 1] * d[j] <= 0) m[j] = 0;
      else m[j] = (d[j - 1] + d[j]) / 2;
    }
    m[n - 1] = d[n - 2];
    for (var k = 0; k < n - 1; k++) {
      if (step[k] || d[k] === 0) { m[k] = 0; m[k + 1] = 0; continue; }
      var al = m[k] / d[k], be = m[k + 1] / d[k], s2 = al * al + be * be;
      if (s2 > 9) { var tau = 3 / Math.sqrt(s2); m[k] = tau * al * d[k]; m[k + 1] = tau * be * d[k]; }
    }
    var out = ['M' + P[0][0].toFixed(2) + ' ' + P[0][1].toFixed(2)];
    for (var q = 0; q < n - 1; q++) {
      if (step[q]) { out.push('L' + P[q + 1][0].toFixed(2) + ' ' + P[q + 1][1].toFixed(2)); continue; }
      var h3 = dx[q] / 3;
      var c1x = P[q][0] + h3, c1y = P[q][1] + m[q] * h3;
      var c2x = P[q + 1][0] - h3, c2y = P[q + 1][1] - m[q + 1] * h3;
      out.push('C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + P[q + 1][0].toFixed(2) + ' ' + P[q + 1][1].toFixed(2));
    }
    return out.join(' ');
  }
  function smoothPath(pts, X, Y) { return smoothPts(pts.map(function (p) { return [X(p[0]), Y(p[1])]; })); }
  K.smoothPts = smoothPts;
  K.scales = function (x0, x1, y0, y1) { return { X: sx(x0, x1), Y: sy(y0, y1) }; };
  /* Option B editorial takeaway strip & Option C modular bento stat chips */
  K.chartStats = function (list, mode) {
    var m = mode || K.mode();
    if (!list || !list.length || (m !== 'b' && m !== 'c')) return '';
    return '<div class="mp5-cstats">' + list.map(function (s) {
      return '<div class="mp5-cstat"><span class="mp5-cstat-k">' + s.k + '</span><span class="mp5-cstat-v">' + s.v + '</span></div>';
    }).join('') + '</div>';
  };
  /* Option C proportional SVG donut ring with HTML centre readout (never SVG <text>) */
  K.donut = function (segs, topT, subT) {
    var off = 0, tot = segs.reduce(function (s, x) { return s + Math.max(0, x.v || 0); }, 0) || 1;
    var active = segs.filter(function (x) { return (x.v || 0) > 0; });
    var gap = active.length > 1 ? 1.5 : 0;
    var circles = '<circle cx="20" cy="20" r="15.9155" fill="none" stroke="var(--mp-track)" stroke-width="5.2"/>';
    active.forEach(function (x) {
      var p = (x.v / tot) * 100, dash = Math.max(0.6, p - gap);
      circles += '<circle cx="20" cy="20" r="15.9155" fill="none" stroke="' + (x.color || 'var(--mp-chart-line)') + '" stroke-width="5.2" stroke-dasharray="' + dash.toFixed(2) + ' ' + (100 - dash).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
      off += p;
    });
    return '<div class="mp5-donut" aria-hidden="true"><svg viewBox="0 0 40 40">' + circles + '</svg><div class="mp5-donut-c"><span class="mp5-donut-v">' + (topT || '') + '</span>' + (subT ? '<span class="mp5-donut-k">' + subT + '</span>' : '') + '</div></div>';
  };
  K.scrubBox = function () { return '<div class="mp5-scrub"><span class="mp5-scrub-line"></span><span class="mp5-scrub-dot"></span><div class="mp5-scrub-tip"></div></div>'; };
  /* one layer of a chart: it fills the chart's box (each sits in its own absolutely placed div) */
  function svg(inner) { return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;width:100%;height:100%" aria-hidden="true">' + inner + '</svg>'; }
  /* line({x0, x1, y0, y1, h, series: [{pts, color, dash, w}], band/bands: {lo, hi, color}, grid: [y], yLabels: [{y, t}], xLabels: [{x, t}],
           dots: [{x, y, beacon}], labels: [{x, y, t, cls}], vlines: [{x, t}], stats: [{k, v}], scrub: [{x, y, k, v, ccy, vt, s}], area, padL, label}) */
  K.line = function (o) {
    var m = o.mode || K.mode(), h = o.h || '200px', parts = [];
    if (m === 'classic') {
      var X0 = sx(o.x0, o.x1), Y0 = sy(o.y0, o.y1);
      (o.grid || []).forEach(function (g) { parts.push(svg('<path d="M0 ' + Y0(g).toFixed(2) + ' L100 ' + Y0(g).toFixed(2) + '" stroke="var(--mp-chart-grid)" stroke-width="1" fill="none"/>')); });
      (o.bands || (o.band ? [o.band] : [])).forEach(function (b) {
        var d0 = path(b.hi, X0, Y0) + ' ' + b.lo.slice().reverse().map(function (p) { return 'L' + X0(p[0]).toFixed(2) + ' ' + Y0(p[1]).toFixed(2); }).join(' ') + ' Z';
        parts.push(svg('<path d="' + d0 + '" fill="' + (b.color || 'var(--mp-band)') + '" stroke="none"/>'));
      });
      (o.vlines || []).forEach(function (v) { parts.push(svg('<path d="M' + X0(v.x).toFixed(2) + ' 0 L' + X0(v.x).toFixed(2) + ' 100" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>')); });
      (o.series || []).forEach(function (s) {
        parts.push(svg('<path d="' + path(s.pts, X0, Y0) + '" fill="none" stroke="' + (s.color || 'var(--mp-chart-line)') + '" stroke-width="' + (s.w || 2) + '"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>'));
      });
      var over0 = '';
      (o.dots || []).forEach(function (d) { over0 += '<span class="mp-chartdot" style="left:' + X0(d.x).toFixed(2) + '%;top:' + Y0(d.y).toFixed(2) + '%"></span>'; });
      (o.labels || []).forEach(function (l) { over0 += '<span class="mp-chartlbl ' + (l.cls || '') + '" style="left:' + X0(l.x).toFixed(2) + '%;top:' + Y0(l.y).toFixed(2) + '%">' + maskChartLbl(l.t) + '</span>'; });
      (o.yLabels || []).forEach(function (l) { over0 += '<span class="mp-foot mp-ink2" style="position:absolute;left:0;top:' + Y0(l.y).toFixed(2) + '%;transform:translateY(-110%)">' + maskChartLbl(l.t) + '</span>'; });
      (o.vlines || []).forEach(function (v) { if (v.t) over0 += '<span class="mp-foot" style="position:absolute;top:0;left:' + X0(v.x).toFixed(2) + '%;transform:translate(-104%,0);font-weight:600">' + v.t + '</span>'; });
      var axis0 = o.xLabels && o.xLabels.length ? '<div class="mp-chartaxis mp-ink2">' + o.xLabels.map(function (l, i, a) {
        var tf = i === 0 ? 'translateX(0)' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
        return '<span style="left:' + X0(l.x).toFixed(2) + '%;transform:' + tf + '">' + l.t + '</span>'; }).join('') + '</div>' : '';
      return '<div class="fx col g4"' + (o.label ? ' role="img" aria-label="' + esc(redactAria(o.label)) + '"' : '') + '><div class="mp-chartbox" style="height:' + h + '">' +
        parts.map(function (p) { return '<div style="position:absolute;inset:0">' + p + '</div>'; }).join('') + over0 + '</div>' + axis0 + '</div>';
    }

    var maxYLen = 0;
    (o.yLabels || []).forEach(function (l) {
      var plain = String(l.t || '').replace(/<[^>]*>/g, '');
      if (plain.length > maxYLen) maxYLen = plain.length;
    });
    var padL = o.padL != null ? o.padL : (maxYLen > 5 ? 19 : maxYLen > 0 ? 13 : 1.2);
    var padR = o.padR != null ? o.padR : 99.0;
    var X = sx(o.x0, o.x1, padL, padR), Y = sy(o.y0, o.y1);
    var useSmooth = (m === 'a' || m === 'c') && o.smooth !== false;
    var drawLine = function (pts) { return useSmooth ? smoothPath(pts, X, Y) : path(pts, X, Y); };
    var gridDash = m === 'b' ? ' stroke-dasharray="2 3"' : '';
    var gridCol = o.gridColor || 'var(--mp-chart-grid)';
    (o.grid || []).forEach(function (g) {
      parts.push(svg('<path d="M' + padL.toFixed(2) + ' ' + Y(g).toFixed(2) + ' L' + padR.toFixed(2) + ' ' + Y(g).toFixed(2) + '" stroke="' + gridCol + '" stroke-width="1"' + gridDash + ' fill="none" vector-effect="non-scaling-stroke"/>'));
    });
    var bands = o.bands || (o.band ? [o.band] : []);
    bands.forEach(function (b) {
      var col = b.color || 'var(--mp-band)';
      var isBandTok = col === 'var(--mp-band)';
      var hiD = drawLine(b.hi);
      var loRev = b.lo.slice().reverse();
      var loD = useSmooth ? smoothPath(loRev, X, Y).replace(/^M/, 'L') : loRev.map(function (p) { return 'L' + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); }).join(' ');
      parts.push(svg('<path' + (isBandTok ? ' class="fband"' : '') + ' d="' + hiD + ' ' + loD + ' Z" fill="' + col + '" stroke="none"/>'));
      if (m === 'b') {
        parts.push(svg('<path d="' + hiD + '" fill="none" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>'));
        parts.push(svg('<path d="' + drawLine(b.lo) + '" fill="none" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>'));
      }
    });
    (o.vlines || []).forEach(function (v) {
      parts.push(svg('<path d="M' + X(v.x).toFixed(2) + ' 0 L' + X(v.x).toFixed(2) + ' 100" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="3 3" fill="none" vector-effect="non-scaling-stroke"/>'));
    });
    (o.series || []).forEach(function (s, idx) {
      var col = s.color || 'var(--mp-chart-line)', dStr = drawLine(s.pts);
      var wantArea = (o.area === true || (o.area !== false && !bands.length)) && idx === 0 && !s.dash && s.pts.length >= 2 && (m === 'a' || m === 'c');
      if (wantArea) {
        var gid = 'mp5g-' + (++gidSeq), topOp = m === 'a' ? (o.areaOp || 0.24) : 0.14;
        var pFirst = s.pts[0], pLast = s.pts[s.pts.length - 1];
        var baseY = Math.min(100, Math.max(0, Y(Math.max(o.y0, 0) === 0 && o.y0 < 0 && o.y1 > 0 ? o.y0 : o.y0)));
        var areaD = dStr + ' L' + X(pLast[0]).toFixed(2) + ' ' + baseY.toFixed(2) + ' L' + X(pFirst[0]).toFixed(2) + ' ' + baseY.toFixed(2) + ' Z';
        parts.push(svg('<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + col + '" stop-opacity="' + topOp + '"/><stop offset="100%" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs><path d="' + areaD + '" fill="url(#' + gid + ')" stroke="none"/>'));
      }
      var sw = s.w || (m === 'a' ? 2.4 : m === 'b' ? 2 : 2.2);
      parts.push(svg('<path d="' + dStr + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'));
    });
    var over = '';
    var dots = (o.dots || []).slice();
    if (!dots.length && m === 'a' && o.endDot !== false && o.series && o.series[0] && o.series[0].pts.length && parseInt(h, 10) >= 54) {
      var lp = o.series[0].pts[o.series[0].pts.length - 1];
      dots.push({ x: lp[0], y: lp[1], beacon: true });
    }
    dots.forEach(function (d, di) {
      var isB = d.beacon || (m === 'a' && di === dots.length - 1);
      over += '<span class="mp-chartdot' + (isB ? ' beacon' : '') + '" style="left:' + X(d.x).toFixed(2) + '%;top:' + Y(d.y).toFixed(2) + '%"></span>';
    });
    (o.labels || []).forEach(function (l) { over += '<span class="mp-chartlbl ' + (l.cls || '') + '" style="left:' + X(l.x).toFixed(2) + '%;top:' + Y(l.y).toFixed(2) + '%">' + maskChartLbl(l.t) + '</span>'; });
    var lastYPct = -999;
    (o.yLabels || []).slice().sort(function (a, b) { return b.y - a.y; }).forEach(function (l) {
      var yp = Math.max(7, Math.min(93, Y(l.y)));
      if (Math.abs(yp - lastYPct) < 11) return;
      lastYPct = yp;
      over += '<span class="mp5-yl" style="top:' + yp.toFixed(2) + '%">' + maskChartLbl(l.t) + '</span>';
    });
    (o.vlines || []).forEach(function (v) { if (v.t) over += '<span class="mp-foot" style="position:absolute;top:0;left:' + X(v.x).toFixed(2) + '%;transform:translate(-104%,0);font-weight:600">' + v.t + '</span>'; });
    var scrubAttr = '';
    if (o.scrub && o.scrub.length && !isPriv()) {
      var mapped = o.scrub.map(function (pt) {
        return { x: +X(pt.x).toFixed(2), y: pt.y != null ? +Y(pt.y).toFixed(2) : null, k: pt.k, v: pt.v, ccy: pt.ccy, vt: pt.vt, s: pt.s, lo: pt.lo, hi: pt.hi, sign: pt.sign };
      });
      scrubAttr = ' data-scrub="' + esc(JSON.stringify(mapped)) + '" tabindex="0"';
      over += K.scrubBox();
    }
    var axis = o.xLabels && o.xLabels.length ? '<div class="mp-chartaxis mp-ink2">' + o.xLabels.map(function (l, i, a) {
      var tf = i === 0 ? 'translateX(0)' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
      return '<span style="left:' + X(l.x).toFixed(2) + '%;transform:' + tf + '">' + l.t + '</span>'; }).join('') + '</div>' : '';
    var statsHtml = K.chartStats(o.stats, m);
    return '<div class="fx col g4"' + (o.label ? ' role="img" aria-label="' + esc(redactAria(o.label)) + '"' : '') + '>' + statsHtml + '<div class="mp-chartbox" style="height:' + h + '"' + scrubAttr + '>' +
      parts.map(function (p) { return '<div style="position:absolute;inset:0">' + p + '</div>'; }).join('') + over + '</div>' + axis + '</div>';
  };
  /* candles({bars: [[o, h, l, c]], x0 (index of the first bar, default 0), lo, hi, h, after: n extra slots for a fan, fan: {lo, hi, mid},
              marks: [{i, y, t}], grid, yLabels, xLabels, vline: {i, t}}) — percentages from a close */
  K.candles = function (o) {
    var m = K.mode(), padL = (m !== 'classic' && o.yLabels && o.yLabels.length) ? 12 : 0;
    var n = o.bars.length + (o.after || 0), X = sx(-0.5, n - 0.5, padL, 99.2), Y = sy(o.lo, o.hi), h = o.h || '240px';
    var body = '', wick = '';
    o.bars.forEach(function (b, i) {
      var up = b[3] >= b[0], x = X(i), w = ((99.2 - padL) / n) * 0.62, top = Y(Math.max(b[0], b[3])), bot = Y(Math.min(b[0], b[3]));
      var col = up ? 'var(--mp-up)' : 'var(--mp-down-quiet)';
      wick += '<path d="M' + x.toFixed(2) + ' ' + Y(b[1]).toFixed(2) + ' L' + x.toFixed(2) + ' ' + Y(b[2]).toFixed(2) + '" stroke="' + col + '" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/>';
      var fill = m === 'b' ? (up ? 'var(--mp-surface)' : col) : (m === 'classic' ? (up ? 'var(--mp-surface)' : 'var(--mp-ink-2)') : col);
      var rx = m === 'a' ? ' rx="0.22"' : '';
      body += '<rect x="' + (x - w / 2).toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + Math.max(0.45, bot - top).toFixed(2) + '"' + rx + ' fill="' + fill + '" stroke="' + col + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
    });
    var parts = [];
    (o.grid || []).forEach(function (g) { parts.push(svg('<path d="M' + padL + ' ' + Y(g).toFixed(2) + ' L99.2 ' + Y(g).toFixed(2) + '" stroke="var(--mp-chart-grid)" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/>')); });
    if (o.fan) {
      var i0 = o.bars.length - 1;
      var pt = function (arr) { return arr.map(function (v, k) { return [i0 + k, v]; }); };
      var FX2 = function (p) { return X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); };
      var hi = pt(o.fan.hi), lo = pt(o.fan.lo);
      parts.push(svg('<path class="fband" d="M' + hi.map(FX2).join(' L') + ' L' + lo.slice().reverse().map(FX2).join(' L') + ' Z" fill="var(--mp-band)" stroke="none"/>'));
      if (o.fan.mid) parts.push(svg('<path d="' + (m === 'a' ? smoothPath(pt(o.fan.mid), X, Y) : 'M' + pt(o.fan.mid).map(FX2).join(' L')) + '" stroke="var(--mp-chart-2)" stroke-width="2" stroke-dasharray="5 4" fill="none" vector-effect="non-scaling-stroke"/>'));
    }
    if (o.vline) parts.push(svg('<path d="M' + X(o.vline.i).toFixed(2) + ' 0 L' + X(o.vline.i).toFixed(2) + ' 100" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="3 3" fill="none" vector-effect="non-scaling-stroke"/>'));
    (o.levels || []).forEach(function (l) { parts.push(svg('<path d="M' + X(l.from || 0).toFixed(2) + ' ' + Y(l.y).toFixed(2) + ' L' + X(l.to == null ? o.bars.length - 1 : l.to).toFixed(2) + ' ' + Y(l.y).toFixed(2) + '" stroke="' + (l.color || 'var(--mp-chart-4)') + '" stroke-width="1.5" stroke-dasharray="4 3" fill="none" vector-effect="non-scaling-stroke"/>')); });
    parts.push(svg(wick));
    parts.push(svg(body));
    var over = '';
    (o.marks || []).forEach(function (m2) { over += '<span class="mp-chartlbl" style="left:' + X(m2.i).toFixed(2) + '%;top:' + Y(m2.y).toFixed(2) + '%;color:var(--mp-ink)">' + m2.t + '</span>'; });
    (o.yLabels || []).forEach(function (l) {
      over += m === 'classic'
        ? '<span class="mp-foot mp-ink2" style="position:absolute;left:0;top:' + Y(l.y).toFixed(2) + '%;transform:translateY(-110%)">' + l.t + '</span>'
        : '<span class="mp5-yl" style="top:' + Math.max(7, Math.min(93, Y(l.y))).toFixed(2) + '%">' + l.t + '</span>';
    });
    if (o.vline && o.vline.t) over += '<span class="mp-foot" style="position:absolute;top:0;left:' + X(o.vline.i).toFixed(2) + '%;transform:translate(-104%,0);font-weight:600">' + o.vline.t + '</span>';
    var axis = o.xLabels ? '<div class="mp-chartaxis mp-ink2">' + o.xLabels.map(function (l, i, a) {
      var tf = i === 0 ? 'translateX(0)' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
      return '<span style="left:' + X(l.i).toFixed(2) + '%;transform:' + tf + '">' + l.t + '</span>'; }).join('') + '</div>' : '';
    return '<div class="fx col g4"' + (o.label ? ' role="img" aria-label="' + esc(redactAria(o.label)) + '"' : '') + '><div class="mp-chartbox" style="height:' + h + '">' +
      parts.map(function (p) { return '<div style="position:absolute;inset:0">' + p + '</div>'; }).join('') + over + '</div>' + axis + '</div>';
  };
  /* spark(values, {h, color}): a small line, no axes */
  K.spark = function (vals, o) {
    o = o || {};
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    return K.line({ x0: 0, x1: vals.length - 1, y0: lo - (hi - lo) * 0.12, y1: hi + (hi - lo) * 0.14, h: o.h || '36px', endDot: false, series: [{ pts: vals.map(function (v, i) { return [i, v]; }), color: o.color, w: 1.8 }] });
  };
  /* hbars([{t, v, max, cls, r, tick}]): labelled horizontal bars */
  K.hbars = function (list) {
    var m = K.mode();
    return '<div class="fx col g10">' + list.map(function (b) {
      var frac = b.v / (b.max || 1);
      var tick = m === 'b' ? (b.tick != null ? b.tick : 0.5) : b.tick;
      return '<div class="fx col g4"><div class="fx jb mp-sub"><span>' + b.t + '</span><span class="mp-num" style="font-weight:600">' + (b.r || '') + '</span></div>' + K.bar(frac, b.cls, { tick: tick }) + '</div>';
    }).join('') + '</div>';
  };

  window.MP5K = K;
})();
