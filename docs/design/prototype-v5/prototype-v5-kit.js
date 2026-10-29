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
  function wrapM(s, o) { return o && o.raw ? s : '<span class="mny">' + s + '</span>'; }
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
  K.bar = function (frac, cls) { var f = Math.max(0, Math.min(1, frac)); return '<div class="bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + (f * 100).toFixed(1) + '%"></i></div>'; };
  /* a pillar's −2..+2 as four marks either side of the middle */
  K.pillar = function (name, v, sub) {
    var marks = '';
    for (var i = -2; i <= 2; i++) {
      if (i === 0) continue;
      var on = (v > 0 && i > 0 && i <= v) || (v < 0 && i < 0 && i >= v);
      marks += '<i class="' + (on ? (v > 0 ? 'on' : 'neg') : '') + '"></i>';
    }
    return '<div class="mp-row" style="padding-left:0;padding-right:0"><div class="f1 fx col"><span class="mp-sub">' + name + '</span>' +
      (sub ? '<span class="mp-foot mp-ink2">' + sub + '</span>' : '') + '</div><span class="pill-meter" aria-label="' + esc(name) + ' ' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '">' + marks +
      '</span><span class="mp-sub mp-num" style="width:28px;text-align:right">' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '</span></div>';
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
  function sx(x0, x1) { return function (x) { return ((x - x0) / (x1 - x0)) * 100; }; }
  function sy(y0, y1) { return function (y) { return 100 - ((y - y0) / (y1 - y0)) * 100; }; }
  function path(pts, X, Y) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); }).join(' '); }
  K.scales = function (x0, x1, y0, y1) { return { X: sx(x0, x1), Y: sy(y0, y1) }; };
  /* one layer of a chart: it fills the chart's box (each sits in its own absolutely placed div) */
  function svg(inner, h) { return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;width:100%;height:100%" aria-hidden="true">' + inner + '</svg>'; }
  /* line({x0, x1, y0, y1, h, series: [{pts, color, dash, w}], band: {lo, hi, color}, grid: [y], yLabels: [{y, t}], xLabels: [{x, t}],
           dots: [{x, y}], labels: [{x, y, t, cls}], vlines: [{x, t}], label}) */
  K.line = function (o) {
    var X = sx(o.x0, o.x1), Y = sy(o.y0, o.y1), h = o.h || '200px', parts = [];
    (o.grid || []).forEach(function (g) { parts.push(svg('<path d="M0 ' + Y(g).toFixed(2) + ' L100 ' + Y(g).toFixed(2) + '" stroke="var(--mp-chart-grid)" stroke-width="1" fill="none"/>', h)); });
    (o.bands || (o.band ? [o.band] : [])).forEach(function (b) {
      var d = path(b.hi, X, Y) + ' ' + b.lo.slice().reverse().map(function (p) { return 'L' + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); }).join(' ') + ' Z';
      parts.push(svg('<path d="' + d + '" fill="' + (b.color || 'var(--mp-band)') + '" stroke="none"/>', h));
    });
    (o.vlines || []).forEach(function (v) { parts.push(svg('<path d="M' + X(v.x).toFixed(2) + ' 0 L' + X(v.x).toFixed(2) + ' 100" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>', h)); });
    (o.series || []).forEach(function (s) {
      parts.push(svg('<path d="' + path(s.pts, X, Y) + '" fill="none" stroke="' + (s.color || 'var(--mp-chart-line)') + '" stroke-width="' + (s.w || 2) + '"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>', h));
    });
    var over = '';
    (o.dots || []).forEach(function (d) { over += '<span class="mp-chartdot" style="left:' + X(d.x).toFixed(2) + '%;top:' + Y(d.y).toFixed(2) + '%"></span>'; });
    (o.labels || []).forEach(function (l) { over += '<span class="mp-chartlbl ' + (l.cls || '') + '" style="left:' + X(l.x).toFixed(2) + '%;top:' + Y(l.y).toFixed(2) + '%">' + l.t + '</span>'; });
    (o.yLabels || []).forEach(function (l) { over += '<span class="mp-foot mp-ink2" style="position:absolute;left:0;top:' + Y(l.y).toFixed(2) + '%;transform:translateY(-110%)">' + l.t + '</span>'; });
    (o.vlines || []).forEach(function (v) { if (v.t) over += '<span class="mp-foot" style="position:absolute;top:0;left:' + X(v.x).toFixed(2) + '%;transform:translate(-104%,0);font-weight:600">' + v.t + '</span>'; });
    var axis = o.xLabels && o.xLabels.length ? '<div class="mp-chartaxis mp-ink2">' + o.xLabels.map(function (l, i, a) {
      var tf = i === 0 ? 'translateX(0)' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
      return '<span style="left:' + X(l.x).toFixed(2) + '%;transform:' + tf + '">' + l.t + '</span>'; }).join('') + '</div>' : '';
    return '<div class="fx col g4"' + (o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : '') + '><div class="mp-chartbox" style="height:' + h + '">' +
      parts.map(function (p) { return '<div style="position:absolute;inset:0">' + p + '</div>'; }).join('') + over + '</div>' + axis + '</div>';
  };
  /* candles({bars: [[o, h, l, c]], x0 (index of the first bar, default 0), lo, hi, h, after: n extra slots for a fan, fan: {lo, hi, mid},
              marks: [{i, y, t}], grid, yLabels, xLabels, vline: {i, t}}) — percentages from a close */
  K.candles = function (o) {
    var n = o.bars.length + (o.after || 0), X = sx(-0.5, n - 0.5), Y = sy(o.lo, o.hi), h = o.h || '240px';
    var body = '', wick = '';
    o.bars.forEach(function (b, i) {
      var up = b[3] >= b[0], x = X(i), w = (100 / n) * 0.62, top = Y(Math.max(b[0], b[3])), bot = Y(Math.min(b[0], b[3]));
      wick += '<path d="M' + x.toFixed(2) + ' ' + Y(b[1]).toFixed(2) + ' L' + x.toFixed(2) + ' ' + Y(b[2]).toFixed(2) + '" stroke="' + (up ? 'var(--mp-up)' : 'var(--mp-ink-2)') + '" stroke-width="1" fill="none"/>';
      body += '<rect x="' + (x - w / 2).toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + Math.max(0.4, bot - top).toFixed(2) + '" fill="' + (up ? 'var(--mp-surface)' : 'var(--mp-ink-2)') + '" stroke="' + (up ? 'var(--mp-up)' : 'var(--mp-ink-2)') + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
    });
    var parts = [];
    (o.grid || []).forEach(function (g) { parts.push(svg('<path d="M0 ' + Y(g).toFixed(2) + ' L100 ' + Y(g).toFixed(2) + '" stroke="var(--mp-chart-grid)" stroke-width="1" fill="none"/>', h)); });
    if (o.fan) {
      var i0 = o.bars.length - 1;
      var pt = function (arr) { return arr.map(function (v, k) { return [i0 + k, v]; }); };
      var FX2 = function (p) { return X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); };
      var hi = pt(o.fan.hi), lo = pt(o.fan.lo);
      parts.push(svg('<path d="M' + hi.map(FX2).join(' L') + ' L' + lo.slice().reverse().map(FX2).join(' L') + ' Z" fill="var(--mp-band)" stroke="none"/>', h));
      if (o.fan.mid) parts.push(svg('<path d="M' + pt(o.fan.mid).map(FX2).join(' L') + '" stroke="var(--mp-chart-2)" stroke-width="2" stroke-dasharray="5 4" fill="none"/>', h));
    }
    if (o.vline) parts.push(svg('<path d="M' + X(o.vline.i).toFixed(2) + ' 0 L' + X(o.vline.i).toFixed(2) + ' 100" stroke="var(--mp-ink-3)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>', h));
    (o.levels || []).forEach(function (l) { parts.push(svg('<path d="M' + X(l.from || 0).toFixed(2) + ' ' + Y(l.y).toFixed(2) + ' L' + X(l.to == null ? o.bars.length - 1 : l.to).toFixed(2) + ' ' + Y(l.y).toFixed(2) + '" stroke="' + (l.color || 'var(--mp-chart-4)') + '" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/>', h)); });
    parts.push(svg(wick, h));
    parts.push(svg(body, h));
    var over = '';
    (o.marks || []).forEach(function (m) { over += '<span class="mp-chartlbl" style="left:' + X(m.i).toFixed(2) + '%;top:' + Y(m.y).toFixed(2) + '%;color:var(--mp-ink)">' + m.t + '</span>'; });
    (o.yLabels || []).forEach(function (l) { over += '<span class="mp-foot mp-ink2" style="position:absolute;left:0;top:' + Y(l.y).toFixed(2) + '%;transform:translateY(-110%)">' + l.t + '</span>'; });
    if (o.vline && o.vline.t) over += '<span class="mp-foot" style="position:absolute;top:0;left:' + X(o.vline.i).toFixed(2) + '%;transform:translate(-104%,0);font-weight:600">' + o.vline.t + '</span>';
    var axis = o.xLabels ? '<div class="mp-chartaxis mp-ink2">' + o.xLabels.map(function (l, i, a) {
      var tf = i === 0 ? 'translateX(0)' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
      return '<span style="left:' + X(l.i).toFixed(2) + '%;transform:' + tf + '">' + l.t + '</span>'; }).join('') + '</div>' : '';
    return '<div class="fx col g4"' + (o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : '') + '><div class="mp-chartbox" style="height:' + h + '">' +
      parts.map(function (p) { return '<div style="position:absolute;inset:0">' + p + '</div>'; }).join('') + over + '</div>' + axis + '</div>';
  };
  /* spark(values, {h, color}): a small line, no axes */
  K.spark = function (vals, o) {
    o = o || {};
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    return K.line({ x0: 0, x1: vals.length - 1, y0: lo - (hi - lo) * 0.1, y1: hi + (hi - lo) * 0.1, h: o.h || '36px', series: [{ pts: vals.map(function (v, i) { return [i, v]; }), color: o.color, w: 1.5 }] });
  };
  /* hbars([{t, v, max, cls, r}]): labelled horizontal bars */
  K.hbars = function (list) {
    return '<div class="fx col g10">' + list.map(function (b) {
      return '<div class="fx col g4"><div class="fx jb mp-sub"><span>' + b.t + '</span><span class="mp-num" style="font-weight:600">' + (b.r || '') + '</span></div>' + K.bar(b.v / (b.max || 1), b.cls) + '</div>';
    }).join('') + '</div>';
  };

  window.MP5K = K;
})();
