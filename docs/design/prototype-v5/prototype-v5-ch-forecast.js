/* MyPaisa · Prototype v5 (MA-291): the Forecast builder's chapters, phases 14, 16 and 17.
   Phase 14: the night's news matched to the holdings by exposure, the events calendar, the News mood in shadow and
   how its tilt works (ARCHITECTURE 11, 19.3, 6.3). Phase 16: an iShares ETF priced like the funds, the stock kind
   behind the second check, Infosys' valuation and earnings cards (4.3, 4.8, 7). Phase 17: the Forecaster beside the
   rules engine, the holding's Forecast tab exactly as MA-281's 1a draws it, its proof page, the Saturday review's
   cards, a fund with line patterns only (19.4 to 19.7). Figures: MP5D.forecaster (forecaster-v4.json, as it is) and
   MP5D.newsShare (news-share-v5.json, make_news_share.py). Pages: news, proof; holding tabs forecast and valuation.
   Local pieces the kit has not got: fcChart (candles or a price line, two fan bands, levels, rings and pills),
   fcLines (many thin paths), inr2 (a rupee figure to the paisa, masked). Every screen no pick covers is a draft. */
(function () {
  'use strict';
  var M = window.MP5, K = window.MP5K;
  if (!M || !K) return;

  var PICK = 'Picked · 1a, MA-281';
  var CSS = [
    '.pv5-forecast{display:flex;flex-direction:column;gap:14px;min-width:0}',
    '.pv5-forecast>*{flex-shrink:0}',
    '.pv5-forecast .fsech{display:flex;justify-content:space-between;align-items:baseline;gap:4px 8px;padding:0 4px 0 16px;margin-bottom:-6px;flex-wrap:wrap}',
    '.pv5-forecast .fhero{background:var(--mp-hero);color:var(--mp-hero-ink);border-radius:var(--mp-r-hero);padding:18px 18px 16px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--mp-shadow)}',
    '.pv5-forecast .fh-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px}',
    '.pv5-forecast .fh-over{color:var(--mp-hero-ink-2)}',
    '.pv5-forecast .fh-chipb{border:0;background:transparent;padding:0;min-height:44px;margin:-8px 0;display:inline-flex;align-items:center;cursor:pointer;color:inherit;font:inherit}',
    '.pv5-forecast .fh-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:var(--mp-hero-2);color:var(--mp-hero-ink);font:600 13px/18px var(--mp-font);white-space:nowrap}',
    '.pv5-forecast .fh-chip .ms{font-size:16px}',
    '.pv5-forecast .fh-tiles{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.25fr) minmax(0,.9fr);gap:10px}',
    '.pv5-forecast .fh-tiles.four{grid-template-columns:minmax(0,.8fr) minmax(0,1fr) minmax(0,.8fr) minmax(0,1.5fr);gap:0}',
    '.pv5-forecast .fh-tiles.four>.fh-t{padding:2px 16px;box-shadow:inset 1px 0 0 var(--mp-hero-2)}',
    '.pv5-forecast .fh-tiles.four>.fh-t:first-child{padding-left:0;box-shadow:none}',
    '.pv5-forecast .fh-t{display:flex;flex-direction:column;gap:2px;min-width:0}',
    '.pv5-forecast .fh-k,.pv5-forecast .fh-s{font:400 13px/18px var(--mp-font);color:var(--mp-hero-ink-2)}',
    '.pv5-forecast .fh-v{font-family:var(--mp-font-round);font-weight:800;font-size:24px;line-height:28px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.pv5-forecast .fh-t.rng .fh-v{font-size:19px}',
    '.pv5-forecast .fh-t.rl .fh-v{font-size:15px;line-height:28px}',
    '.pv5-forecast .fh-rules{border-top:1px solid var(--mp-hero-2);padding-top:12px;display:flex;flex-direction:column;gap:6px}',
    '.pv5-forecast .fh-line{font:400 16px/21px var(--mp-font);color:var(--mp-hero-ink);margin:0;text-wrap:pretty}',
    '.pv5-forecast .fh-agree{display:flex;align-items:flex-start;gap:6px;font:400 13px/18px var(--mp-font);color:var(--mp-hero-ink);text-wrap:pretty}',
    '.pv5-forecast .fh-agree .ms{font-size:16px;margin-top:1px}',
    '.pv5-forecast .fh-agree.dis{background:var(--mp-hero-2);border-radius:12px;padding:8px 10px}',
    '.pv5-forecast .fcw{position:relative;margin-top:14px}',
    '.pv5-forecast .fcb{position:relative}',
    '.pv5-forecast .fcl{position:absolute;inset:0}',
    '.pv5-forecast .fcl>svg{display:block;width:100%;height:100%;overflow:visible}',
    '.pv5-forecast .fcl path,.pv5-forecast .fcl line{vector-effect:non-scaling-stroke}',
    '.pv5-forecast .fyl{position:absolute;left:0;transform:translateY(-100%);padding-bottom:1px;font:500 11px/14px var(--mp-font);color:var(--mp-ink-2);white-space:nowrap}',
    '.pv5-forecast .ffl{position:absolute;right:0;transform:translateY(-50%);font:600 11px/14px var(--mp-font);color:var(--mp-ink);white-space:nowrap}',
    '.pv5-forecast .ftdl{position:absolute;bottom:2px;transform:translateX(calc(-100% - 4px));font:500 11px/14px var(--mp-font);color:var(--mp-ink-2);white-space:nowrap}',
    '.pv5-forecast .fnxt{position:absolute;top:0;transform:translateX(6px);font:600 11px/14px var(--mp-font);color:var(--mp-ink-2);white-space:nowrap}',
    '.pv5-forecast .fpmk{position:absolute;transform:translate(-50%,-100%);font:600 11px/14px var(--mp-font);padding:1px 6px;border-radius:6px;background:var(--mp-surface);color:var(--mp-ink);white-space:nowrap}',
    '.pv5-forecast .fpmk.a{box-shadow:inset 0 0 0 1.5px var(--mp-chart-4)}',
    '.pv5-forecast .fpmk.b{box-shadow:inset 0 0 0 1.5px var(--mp-chart-2);transform:translate(-50%,0)}',
    '.pv5-forecast .fptk{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--mp-surface);box-shadow:0 0 0 2px var(--mp-chart-4)}',
    '.pv5-forecast .mp-chartaxis{margin-top:6px}',
    '.pv5-forecast .flgd{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;font:400 12px/16px var(--mp-font);color:var(--mp-ink-2);margin-top:8px}',
    '.pv5-forecast .flgd>span{display:inline-flex;align-items:center;gap:5px}',
    '.pv5-forecast .flgd i{display:inline-block;flex:none}',
    '.pv5-forecast .sw-up{width:6px;height:12px;border-radius:1px;background:var(--mp-up)}',
    '.pv5-forecast .sw-dn{width:6px;height:12px;border-radius:1px;background:var(--mp-down-quiet)}',
    '.pv5-forecast .sw-band{width:16px;height:11px;border-radius:3px;background:var(--mp-band)}',
    '.pv5-forecast .sw-mid{width:16px;height:0;border-top:2px dashed var(--mp-chart-line)}',
    '.pv5-forecast .sw-pa{width:16px;height:0;border-top:2px dashed var(--mp-chart-4)}',
    '.pv5-forecast .sw-pb{width:16px;height:0;border-top:2px dashed var(--mp-chart-2)}',
    '.pv5-forecast .sw-sim{width:16px;height:0;border-top:1px solid var(--mp-chart-2)}',
    '.pv5-forecast .sw-navl{width:16px;height:0;border-top:2px solid var(--mp-ink)}',
    '.pv5-forecast .sw-now{width:16px;height:0;border-top:2px solid var(--mp-chart-line)}',
    '.pv5-forecast .fbtns{display:flex;gap:8px;flex-wrap:wrap}',
    '.pv5-forecast .frow{min-height:54px;padding-top:10px;padding-bottom:10px;align-items:flex-start}',
    '.pv5-forecast .frg{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;align-items:flex-start;text-align:left}',
    '.pv5-forecast .fmk{width:16px;display:inline-flex;justify-content:center;flex:none;margin-top:9px}',
    '.pv5-forecast .fmk>i{width:14px;height:0;border-top:2px dashed var(--mp-chart-2);display:block}',
    '.pv5-forecast .fmk>i.a{border-top-color:var(--mp-chart-4)}',
    '.pv5-forecast .fchev{color:var(--mp-ink-2);align-self:center}',
    '.pv5-forecast .frow .mp-icontile{margin-top:2px}',
    '.pv5-forecast .ftrk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '.pv5-forecast .ftc{display:flex;flex-direction:column;gap:6px;padding:14px}',
    '.pv5-forecast .fwks{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}',
    '.pv5-forecast .fwk{font:600 12px/16px var(--mp-font);padding:3px 6px;border-radius:6px;white-space:nowrap}',
    '.pv5-forecast .fwk.ok{color:var(--mp-hold);background:var(--mp-hold-bg)}',
    '.pv5-forecast .fwk.tbd{color:var(--mp-ink-2);background:var(--mp-surface-2)}',
    '.pv5-forecast .fwk.no{color:var(--mp-pause);background:var(--mp-pause-bg)}',
    '.pv5-forecast .fg2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}',
    '.pv5-forecast .fcol{display:flex;flex-direction:column;gap:14px;min-width:0}',
    '.pv5-forecast .fend{padding:0 8px}',
    '.pv5-forecast .fcard{display:flex;flex-direction:column;gap:8px}',
    '.pv5-forecast .fcard>.mp-row{padding-left:0;padding-right:0}',
    '.pv5-forecast .fkvw{padding:6px 0;border-top:1px solid var(--mp-line)}',
    '.pv5-forecast .fkvw>:first-child{flex:none;max-width:42%}',
    '.pv5-forecast .fdis{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--mp-pause-bg);color:var(--mp-ink);font:400 15px/20px var(--mp-font)}',
    '.pv5-forecast .fdis .ms{color:var(--mp-pause);margin-top:1px;font-size:18px}',
    '.pv5-forecast .fnov{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:var(--mp-surface-2);font:600 15px/20px var(--mp-font)}',
    '.pv5-forecast .fnov .ms{color:var(--mp-ink-2);font-size:20px}',
    '.pv5-forecast .ftbl{display:grid;align-items:baseline;column-gap:10px;font:400 14px/19px var(--mp-font)}',
    '.pv5-forecast .ftbl>span{padding:8px 0;border-top:1px solid var(--mp-line);min-width:0}',
    '.pv5-forecast .ftbl>.th{border-top:0;color:var(--mp-ink-2);font-weight:600;font-size:13px;line-height:18px;padding-top:0}',
    '.pv5-forecast .ftbl>.rh{font-weight:600}',
    '.pv5-forecast .ftbl.c4{grid-template-columns:minmax(0,1.15fr) repeat(3,minmax(0,1fr))}',
    '.pv5-forecast .ftbl.c3{grid-template-columns:minmax(0,1fr) auto auto}',
    '.pv5-forecast .ftbl .r{text-align:right;font-variant-numeric:tabular-nums}',
    '.pv5-forecast .fok{color:var(--mp-up);font-weight:600;white-space:nowrap}',
    '.pv5-forecast .fno{color:var(--mp-ink-2);font-weight:600;white-space:nowrap}',
    '.pv5-forecast .fsw{display:flex;gap:12px;align-items:flex-start}',
    '.pv5-forecast .fnow{font:600 12px/16px var(--mp-font);padding:2px 8px;border-radius:999px;background:var(--mp-surface-2);color:var(--mp-ink-2);margin-left:6px}',
    '.pv5-forecast .fdate{width:44px;flex:none;display:flex;flex-direction:column;align-items:center;gap:0;padding:4px 0;border-radius:10px;background:var(--mp-surface-2)}',
    '.pv5-forecast .fdate b{font:700 18px/22px var(--mp-font-round);font-variant-numeric:tabular-nums}',
    '.pv5-forecast .fdate span{font:600 11px/14px var(--mp-font);color:var(--mp-ink-2)}',
    '.pv5-forecast .fbl{display:flex;flex-direction:column;gap:3px;padding:8px 0 0;border-top:1px solid var(--mp-line)}',
    '.pv5-forecast .mp-chartbox svg{width:100%}',
    '.pv5-forecast .fbtns .cbtn{padding:0 12px}',
    '.pv5-forecast .fmidl{position:absolute;right:0;transform:translateY(-130%);font:600 11px/14px var(--mp-font);color:var(--mp-ink);background:var(--mp-surface);border-radius:6px;padding:1px 6px;white-space:nowrap}',
    '.pv5-forecast .fmood{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.pv5-forecast .fscale{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px}',
    '.pv5-forecast .fscale>span{font:600 11px/14px var(--mp-font);text-align:center;padding:6px 2px;border-radius:6px;background:var(--mp-surface-2);color:var(--mp-ink-2);min-width:0}',
    '.pv5-forecast .fscale>span.on{background:var(--mp-hold-bg);color:var(--mp-hold)}',
    '.pv5-forecast .fmbar{display:flex;gap:2px;height:12px;border-radius:999px;overflow:hidden}',
    '.pv5-forecast .fmbar>i{display:block;height:100%}',
    '.pv5-forecast .fm-1{background:var(--mp-chart-2)}.pv5-forecast .fm-2{background:var(--mp-ink-3)}.pv5-forecast .fm-3{background:var(--mp-chart-4)}.pv5-forecast .fm-4{background:var(--mp-chart-5)}',
    '.pv5-forecast .fmsw{width:10px;height:10px;border-radius:3px;display:inline-block;flex:none}',
    '.pv5-forecast .fdrv{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 52px;align-items:center;gap:10px;min-height:30px;font:400 14px/19px var(--mp-font)}',
    '.pv5-forecast .fdbar{position:relative;height:8px;border-radius:999px;background:var(--mp-track);box-shadow:inset 0 0 0 1px var(--mp-line)}',
    '.pv5-forecast .fdbar>i{position:absolute;top:0;bottom:0;display:block;border-radius:999px}',
    '.pv5-forecast .fdbar>i.for{background:var(--mp-pillar-for)}.pv5-forecast .fdbar>i.ag{background:var(--mp-pillar-against)}',
    '.pv5-forecast .fdv{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}',
    '.pv5-forecast .fsheet{width:100%;max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:12px;max-height:620px;overflow-y:auto;scrollbar-width:none;padding:4px;box-sizing:border-box}',
    '.pv5-forecast .fsheet::-webkit-scrollbar{display:none}',
    '.pv5-forecast .fsheet-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
    '.pv5-forecast .fx44{width:44px;height:44px;border-radius:999px;border:0;background:var(--mp-surface-2);color:var(--mp-ink);display:grid;place-items:center;flex:none;cursor:pointer}',
    '.pv5-forecast .fents{display:flex;flex-wrap:wrap;gap:6px}',
    '.pv5-forecast .fbig{font-family:var(--mp-font-round);font-weight:800;font-size:28px;line-height:32px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.pv5-forecast .ftilt{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;align-items:center;padding:9px 0;border-top:1px solid var(--mp-line)}',
    '.pv5-forecast .ftilt:first-child{border-top:0;padding-top:0}',
    '.pv5-forecast .ftilt>.w{flex-basis:100%;font:400 13px/18px var(--mp-font);color:var(--mp-ink-2);text-wrap:pretty}',
    '.pv5-forecast .ftbl.c3e{grid-template-columns:minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1.2fr)}',
    '.pv5-forecast .fnum{font-variant-numeric:tabular-nums;font-weight:600}',
    '.pv5-forecast.ccard .ccard-b .mp-foot{text-wrap:pretty}',
    '.pv5-forecast .fprivnote{margin-top:-4px}'
  ].join('\n');
  function styles() {
    if (document.getElementById('pv5-forecast')) return;
    var s = document.createElement('style');
    s.id = 'pv5-forecast';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  styles();

  /* ---------- small helpers ---------- */
  var esc = K.esc;
  function FC(ctx) { return (ctx.D && ctx.D.forecaster) || {}; }
  /* one Forecaster run serves every holding (Sat 24 Oct 06:10, model 2026.10): forecaster-v4 writes it on the ETF */
  function runOf(F, f) { var n = F.nasdaq || {}; return { run: f.run || (F.clock && F.clock.run) || n.run, model: f.model || n.model, data_to: f.data_to || n.data_to }; }
  function NS(ctx) { return (ctx.D && ctx.D.newsShare) || null; }
  function sp(v, dp) { return K.pct(v, { sign: true, dp: dp }); }
  function rng(lo, hi) { return sp(lo) + ' … ' + sp(hi); }
  function idx(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function over(t, cls) { return '<span class="mp-over ' + (cls || 'mp-ink2') + '">' + t + '</span>'; }
  function sech(t, r, id) { return '<div class="fsech"' + (id ? ' id="' + id + '"' : '') + '>' + over(t) + (r ? '<span class="mp-foot mp-ink2">' + r + '</span>' : '') + '</div>'; }
  function wrap(html, cls) { return '<div class="pv5-forecast' + (cls ? ' ' + cls : '') + '">' + html + '</div>'; }
  /* a rupee figure to the paisa, masked as the kit masks money (K.inr rounds to the rupee) */
  function inr2(n) {
    var r = Math.abs(n).toFixed(2).split('.'), s = r[0];
    s = s.length > 3 ? s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3) : s;
    return '<span class="mny">' + (n < 0 ? '−' : '') + '₹' + s + '.' + r[1] + '</span>';
  }
  function num(n, dp) { return K.num(n, dp); }
  function asset(ctx, id) { var a = ((ctx.D.household || {}).assets || []).filter(function (x) { return x.id === id; })[0]; return a || null; }
  var SHORT = { balanced: 'Balanced', nasdaq: 'NASDAQ 100 ETF', robotics: 'Robotics ETF', silver: 'Silver ETC', pot: 'Monzo pot', ppfas: 'Parag Parikh Flexi Cap', infosys: 'Infosys' };
  function reviewCard(ctx, id) {
    var R = (FC(ctx).review || {}).cards || [];
    var name = { nasdaq: 'NASDAQ 100 ETF', robotics: 'Robotics ETF', silver: 'Silver ETC' }[id];
    return R.filter(function (c) { return c.name === name; })[0] || null;
  }
  /* the holding page and its header are the Engine builder's; these are its tabs */
  function hp(id, tab) { return 'holding/' + id + (tab ? '/' + tab : ''); }
  function hk(id, tab) { return 'nav:' + hp(id, tab); }

  /* ---------- charts: each stroke in its own SVG; labels and marks in HTML over it (lesson 37) ---------- */
  function layer(inner) { return '<div class="fcl"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + inner + '</svg></div>'; }
  /* fcChart: 60 daily bars (candles, or a fund's price line) at x = 9.5 + i, the close at x = 69, then the fan's 20
     days at x = 68.5 + k, as iPhone v4 · Forecast 1a draws it; values are percentages from the last close */
  function fcChart(o) {
    var Y = function (v) { return (o.yMax - v) / (o.yMax - o.yMin) * 100; };
    var X = function (i) { return 9.5 + i; };
    var FK = function (k) { return k === 0 ? 69 : 68.5 + k; };
    var f = function (n) { return n.toFixed(2); };
    var parts = [], over = '';
    (o.grid || []).forEach(function (g) { parts.push(layer('<line x1="9" x2="89" y1="' + f(Y(g)) + '" y2="' + f(Y(g)) + '" stroke="var(--mp-chart-grid)" stroke-width="1"/>')); });
    if (o.fan) {
      var band = function (hiK, loK) {
        var top = [[0, 0]].concat(o.fan.map(function (p, k) { return [k + 1, p[hiK]]; }));
        var bot = [[0, 0]].concat(o.fan.map(function (p, k) { return [k + 1, p[loK]]; })).reverse();
        return 'M' + top.map(function (p) { return f(FK(p[0])) + ' ' + f(Y(p[1])); }).join(' L') + ' L' + bot.map(function (p) { return f(FK(p[0])) + ' ' + f(Y(p[1])); }).join(' L') + ' Z';
      };
      parts.push(layer('<path d="' + band('p90', 'p10') + '" fill="var(--mp-band)" stroke="none"/>'));
      parts.push(layer('<path d="' + band('p75', 'p25') + '" fill="var(--mp-band)" stroke="none"/>'));
      parts.push(layer('<path d="M69 ' + f(Y(0)) + ' L' + o.fan.map(function (p, k) { return f(FK(k + 1)) + ' ' + f(Y(p.p50)); }).join(' L') + '" fill="none" stroke="var(--mp-chart-line)" stroke-width="2" stroke-dasharray="4 3"/>'));
    }
    parts.push(layer('<line x1="69" x2="69" y1="0" y2="100" stroke="var(--mp-ink-2)" stroke-width="1" stroke-dasharray="2 3"/>'));
    if (o.bars) {
      var wick = '', body = '';
      o.bars.forEach(function (b, i) {
        var up = b.c >= b.o, col = up ? 'var(--mp-up)' : 'var(--mp-down-quiet)', x = X(i);
        var t = Y(Math.max(b.o, b.c)), bo = Y(Math.min(b.o, b.c));
        wick += '<rect x="' + f(x - 0.12) + '" y="' + f(Y(b.h)) + '" width="0.24" height="' + f(Math.max(0.3, Y(b.l) - Y(b.h))) + '" fill="' + col + '"/>';
        body += '<rect x="' + f(x - 0.42) + '" y="' + f(t) + '" width="0.84" height="' + f(Math.max(0.4, bo - t)) + '" fill="' + col + '"/>';
      });
      parts.push(layer(wick));
      parts.push(layer(body));
    }
    if (o.line) parts.push(layer('<path d="M' + o.line.map(function (v, i) { return f(X(i)) + ' ' + f(Y(v)); }).join(' L') + '" fill="none" stroke="var(--mp-ink)" stroke-width="2" stroke-linejoin="round"/>'));
    (o.levels || []).forEach(function (l) {
      var x0 = l.x0 != null ? l.x0 : X(l.i0), x1 = l.x1 != null ? l.x1 : X(l.i1);
      var y0 = Y(l.v0 != null ? l.v0 : l.v), y1 = Y(l.v1 != null ? l.v1 : l.v);
      parts.push(layer('<line x1="' + f(x0) + '" x2="' + f(x1) + '" y1="' + f(y0) + '" y2="' + f(y1) + '" stroke="' + (l.a ? 'var(--mp-chart-4)' : 'var(--mp-chart-2)') + '" stroke-width="2" stroke-dasharray="5 3"/>'));
    });
    (o.rings || []).forEach(function (r) { over += '<span class="fptk" style="left:' + f(X(r.i)) + '%;top:calc(' + f(Y(r.v)) + '% - 5px)"></span>'; });
    (o.pills || []).forEach(function (p) {
      over += '<span class="fpmk ' + (p.below ? 'b' : 'a') + '" style="left:' + f(X(p.i)) + '%;top:calc(' + f(Y(p.v)) + '% ' + (p.below ? '+ 6px' : '- 14px') + ')">' + p.t + '</span>';
    });
    (o.yLabels || []).forEach(function (v) { over += '<span class="fyl" style="top:' + f(Y(v)) + '%">' + sp(v) + '</span>'; });
    if (o.fan) {
      var last = o.fan[o.fan.length - 1];
      over += '<span class="ffl" style="top:' + f(Y(last.p90)) + '%">' + sp(last.p90) + '</span><span class="ffl" style="top:' + f(Y(last.p10)) + '%">' + sp(last.p10) + '</span>';
    }
    over += '<span class="ftdl" style="left:69%">' + esc(o.today) + '</span>';
    if (o.next) over += '<span class="fnxt" style="left:69%">' + esc(o.next) + '</span>';
    var axis = '<div class="mp-chartaxis mp-ink2" aria-hidden="true">' + (o.months || []).map(function (m) { return '<span style="left:' + f(m.k != null ? FK(m.k) : X(m.i)) + '%">' + m.t + '</span>'; }).join('') + '</div>';
    return '<div class="fcw"><div class="mp-chartbox fcb" style="height:' + (o.h || 200) + 'px" role="img" aria-label="' + esc(o.label || '') + '">' + parts.join('') + over + '</div>' + axis + '</div>';
  }
  /* the months under the chart: the first bar of each month, and the first day of the next month in the fan */
  function monthsOf(days, fan) {
    var out = [], seen = {};
    days.forEach(function (d, i) { var m = d.slice(5, 7); if (!seen[m] && i > 0) { seen[m] = 1; out.push({ i: i, t: mname(d) }); } else seen[m] = 1; });
    fan.forEach(function (p, k) { var m = p.d.slice(5, 7); if (!seen[m]) { seen[m] = 1; out.push({ k: k + 1, t: mname(p.d) }); } });
    return out;
  }
  function mname(iso) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+iso.slice(5, 7) - 1]; }
  /* fcLines: many thin paths (the similar days) and the line they follow, in one box */
  function fcLines(o) {
    var X = function (x) { return (x - o.x0) / (o.x1 - o.x0) * 100; }, Y = function (v) { return (o.y1 - v) / (o.y1 - o.y0) * 100; };
    var f = function (n) { return n.toFixed(2); };
    var parts = [], over = '';
    (o.grid || []).forEach(function (g) { parts.push(layer('<line x1="0" x2="100" y1="' + f(Y(g)) + '" y2="' + f(Y(g)) + '" stroke="var(--mp-chart-grid)" stroke-width="1"/>')); over += '<span class="fyl" style="top:' + f(Y(g)) + '%">' + sp(g) + '</span>'; });
    parts.push(layer('<line x1="' + f(X(0)) + '" x2="' + f(X(0)) + '" y1="0" y2="100" stroke="var(--mp-ink-2)" stroke-width="1" stroke-dasharray="2 3"/>'));
    (o.paths || []).forEach(function (p) { parts.push(layer('<path d="M' + p.map(function (q) { return f(X(q[0])) + ' ' + f(Y(q[1])); }).join(' L') + '" fill="none" stroke="var(--mp-chart-2)" stroke-opacity="0.5" stroke-width="1"/>')); });
    if (o.now) parts.push(layer('<path d="M' + o.now.map(function (q) { return f(X(q[0])) + ' ' + f(Y(q[1])); }).join(' L') + '" fill="none" stroke="var(--mp-chart-line)" stroke-width="2" stroke-linejoin="round"/>'));
    if (o.mid) parts.push(layer('<path d="M' + o.mid.map(function (q) { return f(X(q[0])) + ' ' + f(Y(q[1])); }).join(' L') + '" fill="none" stroke="var(--mp-ink)" stroke-width="2" stroke-dasharray="4 3"/>'));
    if (o.midLabel) over += '<span class="fmidl" style="top:' + f(Y(o.mid[o.mid.length - 1][1])) + '%">' + o.midLabel + '</span>';
    var axis = '<div class="mp-chartaxis mp-ink2" aria-hidden="true">' + (o.xLabels || []).map(function (l, i, a) { return '<span style="left:' + f(X(l.x)) + '%;transform:' + (i === 0 ? 'none' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)') + '">' + l.t + '</span>'; }).join('') + '</div>';
    return '<div class="fcw" style="margin-top:6px"><div class="mp-chartbox fcb" style="height:' + (o.h || 180) + 'px" role="img" aria-label="' + esc(o.label || '') + '">' + parts.join('') + over + '</div>' + axis + '</div>';
  }

  /* ---------- the Forecast tab, 1a The answer first (MA-281) ---------- */
  function upWord(up) { return Math.abs(up - 50) <= 5 ? 'close to even' : up > 50 ? 'more likely than not' : 'less likely than not'; }
  function inPracticeChip(id, wk, of) {
    return '<button type="button" class="fh-chipb"' + K.go('nav:proof/' + id) + '><span class="fh-chip">' + K.ms('science') + 'In practice · week ' + wk + ' of ' + of + '</span></button>';
  }
  /* the hero: risk first (a fall over 5%, the likely range, then the chance of being up), the rules engine beside it */
  function hero(ctx, o) {
    var four = ctx.door === 'desk';
    var tiles = [
      '<div class="fh-t"><span class="fh-k">A fall over 5%</span><span class="fh-v">' + K.pct(o.fall5) + '</span><span class="fh-s">usually ' + K.pct(o.usual) + '</span></div>',
      '<div class="fh-t rng"><span class="fh-k">Likely range</span><span class="fh-v">' + rng(o.lo, o.hi) + '</span><span class="fh-s">8 in 10 end inside</span></div>',
      '<div class="fh-t"><span class="fh-k">Up in 4 weeks</span><span class="fh-v">' + K.pct(o.up) + '</span><span class="fh-s">' + upWord(o.up) + '</span></div>'
    ];
    var stance = K.stance(o.stance, o.conf, { upper: true });
    var agree = o.agree ? '<div class="fh-agree' + (o.disagree ? ' dis' : '') + '">' + K.ms(o.disagree ? 'call_split' : 'compare_arrows') + '<span>' + o.agree + '</span></div>' : '';
    var rules;
    if (four) {
      tiles.push('<div class="fh-t rl"><span class="fh-k">The rules engine, beside it</span><span class="fh-v">' + stance + '</span><span class="fh-s" style="color:var(--mp-hero-ink)">' + o.line + '.</span></div>');
      rules = agree ? '<div class="fh-rules">' + agree + '</div>' : '';
    } else {
      rules = '<div class="fh-rules"><div class="fx ac jb g8 wrap"><span class="fh-k">The rules engine, beside it</span>' + stance + '</div><p class="fh-line">' + o.line + '.</p>' + agree + '</div>';
    }
    return '<section class="fhero" id="fc-hero"><div class="fh-top">' + over('Next 4 weeks · the Forecaster', 'fh-over') + (o.chip || '') + '</div>' +
      '<div class="fh-tiles' + (four ? ' four' : '') + '">' + tiles.join('') + '</div>' + rules + '</section>';
  }
  function chartCard(ctx, id) {
    var f = FC(ctx)[id], web = ctx.web, h = ctx.door === 'desk' ? 250 : ctx.door === 'fold' ? 230 : 200;
    var today = web ? 'Friday’s close' : 'Fri 23 Oct close', next = web ? 'next 4 weeks' : null;
    var html, legend;
    if (f.candles) {
      var c = f.candles, find = function (d) { for (var i = 0; i < c.length; i++) if (c[i].day === d) return i; return -1; };
      var p1 = find('Thu 1 Oct'), p2 = find('Wed 7 Oct'), brk = find('Wed 14 Oct'), sup = find('Wed 5 Aug');
      html = fcChart({
        bars: c.slice(0, 60), fan: f.fan, yMax: 15.5, yMin: -9.5, grid: [-5, 0, 5, 10], yLabels: [-5, 0, 5, 10], h: h, today: today, next: next,
        levels: [{ i0: p1 - 2, i1: brk + 1, v: f.neckline, a: true }, { i0: sup, x1: 69, v: f.support }],
        rings: [{ i: p1, v: c[p1].h }, { i: p2, v: c[p2].h }],
        pills: [{ i: (p1 + p2) / 2, v: Math.max(c[p1].h, c[p2].h), t: 'Double top' }, { i: Math.round((sup + 41) / 2), v: f.support, t: 'Support −1%', below: true }],
        months: monthsOf(c.slice(0, 60).map(function (x) { return x.d; }), f.fan),
        label: f.name + ': daily candles for the last 60 trading days to Fri 23 Oct, then the next four weeks: 8 times in 10 it ends between ' + sp(f.headline.lo) + ' and ' + sp(f.headline.hi) + ', the middle ' + sp(f.headline.mid) + '.'
      });
      legend = '<div class="flgd"><span><i class="sw-up"></i>▲ day up</span><span><i class="sw-dn"></i>▼ day down</span><span><i class="sw-band"></i>8 in 10 end inside</span><span><i class="sw-mid"></i>the middle</span><span><i class="sw-pa"></i>double top, neckline</span><span><i class="sw-pb"></i>support</span></div>';
      return K.card({ cls: 'fcard', body: '<div class="fx ac jb g8 wrap"><span class="mp-hl">The chart, then the next 4 weeks</span><span class="mp-foot mp-ink2">60 trading days</span></div>' + html + legend });
    }
    var n = f.nav, t = f.trend, ix = function (d) { for (var i = 0; i < n.length; i++) if (n[i].day === d) return i; return -1; };
    var i0 = ix(t.from), i1 = ix(t.to), slope = (t.y_to - t.y_from) / (i1 - i0), at = function (i) { return t.y_from + slope * (i - i0); };
    html = fcChart({
      line: n.slice(0, 60).map(function (x) { return x.nav; }), fan: f.fan, yMax: 4.5, yMin: -5.5, grid: [-4, -2, 0, 2, 4], yLabels: [-4, -2, 0, 2, 4], h: h, today: today, next: next,
      levels: [{ i0: i0, i1: 59, v0: t.y_from, v1: at(59) }],
      pills: [{ i: i0 + 12, v: at(i0 + 12), t: 'Higher lows', below: true }],
      months: monthsOf(n.slice(0, 60).map(function (x) { return x.d; }), f.fan),
      label: f.name + ': a fund’s daily price for the last 60 trading days to Fri 23 Oct, then the next four weeks: 8 times in 10 it ends between ' + sp(f.headline.lo) + ' and ' + sp(f.headline.hi) + ', the middle ' + sp(f.headline.mid) + '.'
    });
    legend = '<div class="flgd"><span><i class="sw-navl"></i>Price, once a day</span><span><i class="sw-band"></i>8 in 10 end inside</span><span><i class="sw-mid"></i>the middle</span><span><i class="sw-pb"></i>trend line</span></div>';
    return K.card({ cls: 'fcard', body: '<div class="fx ac jb g8 wrap"><span class="mp-hl">The price, then the next 4 weeks</span><span class="mp-foot mp-ink2">60 trading days</span></div>' + html + legend + K.note('info', f.nav_note) });
  }
  function patternRows(f, id) {
    return K.group(f.patterns.filter(function (p) { return p.edge; }).map(function (p, i) {
      var where = cap(p.where), res;
      if (p.lower != null) res = 'Lower ' + p.after + ' later in ' + p.lower + ' of ' + p.cases + ' cases since 2015 · average ' + sp(p.avg);
      else if (p.held != null) res = 'Held in ' + p.held + ' of ' + p.cases + ' tests since 2015 · average ' + sp(p.avg) + ' after ' + p.after;
      else res = 'Higher ' + p.after + ' later in ' + p.higher + ' of ' + p.cases + ' cases since 2015 · average ' + sp(p.avg);
      var amber = p.name === 'Double top';
      return '<button type="button" class="mp-row rowbtn frow"' + K.go('fc:pat:' + id + ':' + i) + '><span class="fmk"><i' + (amber ? ' class="a"' : '') + '></i></span><span class="frg"><span class="mp-sub" style="font-weight:600">' + p.name + '</span><span class="mp-foot mp-ink2">' + where + '</span><span class="mp-foot">' + res + '</span></span>' + K.ms('chevron_right', 'fchev') + '</button>';
    }));
  }
  function worstEvent(f) { var e = f.events.filter(function (x) { return !x[3]; }).slice().sort(function (a, b) { return a[2] - b[2]; })[0]; return e; }
  function whyRows(f, id) {
    var mood = f.mood, stay = (mood.next.filter(function (m) { return m[0] === mood.now; })[0] || [0, 0])[1];
    var e = worstEvent(f), tech = typeof f.technical === 'string' ? f.technical : 'ADX ' + f.technical.adx + ' · stochastic ' + f.technical.stoch + ' · ' + f.technical.ichimoku;
    var rows = [
      ['mood', 'Market mood', mood.now + ' since ' + mood.since + ' · ' + K.pct(stay) + ' it stays so over the next 4 weeks', 'mood'],
      ['history', 'Similar days', f.similar.n + ' since ' + f.similar.since + ' · ' + f.similar.recovered + ' higher 4 weeks later', 'similar'],
      ['event', 'Event impacts', e[0] + ' weighs most: ' + sp(e[2]) + ' in the 4 weeks after, on average over ' + e[1] + ' cases', 'events'],
      ['tune', 'Main drivers', 'From a usual ' + K.pct(f.usual_up) + ' chance of being up to ' + K.pct(f.headline.up), 'drivers'],
      [f.candles ? 'candlestick_chart' : 'show_chart', 'Technical', tech, 'tech']
    ];
    return K.group(rows.map(function (r) {
      return '<button type="button" class="mp-row rowbtn frow"' + K.go('fc:row:' + id + ':' + r[3]) + '><span class="mp-icontile mp-neutral">' + K.ms(r[0], 'ms-s') + '</span><span class="frg"><span class="mp-sub" style="font-weight:600">' + r[1] + '</span><span class="mp-foot mp-ink2">' + r[2] + '</span></span>' + K.ms('chevron_right', 'fchev') + '</button>';
    }));
  }
  function weeks(beat) { return '<div class="fwks">' + beat.map(function (b, i) { return '<span class="fwk ' + (b === true ? 'ok' : b === false ? 'no' : 'tbd') + '">' + (b === true ? '✓ ' : b === false ? '✗ ' : '') + 'W' + (i + 1) + '</span>'; }).join('') + '</div>'; }
  /* the rules engine's calls are in shadow until its gate passes (engine-v5: live from Mon 9 Nov) */
  function rulesLive(ctx) { var N = NS(ctx); return ctx.t >= ((N && N.clock.rules_live_iso) || '2026-11-09'); }
  function trackCards(f, ctx) {
    var tr = f.track, done = tr.fc.beat.filter(function (b) { return b != null; }).length, won = tr.fc.beat.filter(function (b) { return b === true; }).length;
    var what = String(tr.rules.what).replace(/\s*\(.*\)\s*$/, '');
    return '<div class="ftrk"><div class="mp-card ftc"><div class="fx ac jb g8 wrap"><span class="mp-hl">Rules engine</span>' + (rulesLive(ctx) ? K.chip('Live') : K.shadow('In shadow')) + '</div><span class="mp-num-l">' + tr.rules.held + ' of ' + tr.rules.of + '</span><span class="mp-foot mp-ink2">' + what + ', graded against waiting</span></div>' +
      '<div class="mp-card ftc"><div class="fx ac jb g8 wrap"><span class="mp-hl">Forecaster</span>' + K.chip('In practice') + '</div><span class="mp-num-l">' + won + ' of ' + done + '</span><span class="mp-foot mp-ink2">weeks so far beat both the base rate and the rules engine</span>' + weeks(tr.fc.beat) + '</div></div>';
  }
  function footer(f, F) {
    var r = runOf(F, f);
    return '<p class="mp-foot mp-ink2 fend" style="margin:0;text-wrap:pretty">Every figure comes from code: the Forecast row of ' + r.run + ' (model ' + r.model + ', trained on data to ' + r.data_to + '). Claude only puts them into words. A view, not advice: MyPaisa cannot trade. Illustrative figures (forecaster-v4.json).</p>';
  }
  function f7card(ctx, f, id) {
    var h = f.headline;
    return K.card({ id: 'fc-f7', cls: 'fcard', t: 'New money, steered by risk', r: K.draft(), body:
      K.p('Later (F7): contributions continue, and new money leans away from a holding whose chance of a deep fall is above its usual. For this ETF that is ' + K.pct(h.fall5) + ' against a usual ' + K.pct(h.fall5_usual) + ', so new money would go elsewhere in the plan until it eases; nothing is sold, and it stays inside the ISA.') +
      K.kv('The rules engine says', K.stance(f.rules.stance, f.rules.conf, { upper: true }) + ' <span class="mp-ink2" style="font-weight:400">' + f.rules.line.toLowerCase() + '</span>', 'fkvw') +
      K.kv('Rebalancing', 'inside the bands', 'fkvw') + K.kv('Drawdown budget', 'not set yet · the owner sets it', 'fkvw') +
      K.foot('Shown as the suggested split on the contribution’s check-in, beside the rules engine’s, once the Forecaster is live: after 8 live weeks beating both.') });
  }
  function draw1a(ctx, id) {
    var F = FC(ctx), f = F[id];
    if (!f) return '';
    var h = f.headline, two = ctx.door === 'desk' || ctx.door === 'fold';
    var o = { fall5: h.fall5, usual: h.fall5_usual, lo: h.lo, hi: h.hi, up: h.up, stance: f.rules.stance, conf: f.rules.conf, line: f.rules.line, agree: f.agree,
      chip: inPracticeChip(id, f.track.fc.week, f.track.fc.of) };
    var btns = '<div class="fbtns">' + K.cbtn('Why? in the chat', 'tab:chat', null, 'chat_bubble') + K.cbtn('How it proves itself', 'nav:proof/' + id, null, 'fact_check') + '</div>';
    var pats = sech(f.candles ? 'Patterns on the chart' : 'Patterns on its price', f.candles ? 'each measured on this ETF' : 'line patterns only', 'fc-patterns') + patternRows(f, id);
    var why = sech('Why it says so', 'one tap for each', 'fc-why') + whyRows(f, id);
    var mid = two ? '<div class="fg2"><div class="fcol">' + pats + '</div><div class="fcol">' + why + '</div></div>' : pats + why;
    return wrap(hero(ctx, o) + chartCard(ctx, id) + btns + mid + sech('Track records', 'side by side', 'fc-track') + trackCards(f, ctx) +
      (ctx.has('f7') ? f7card(ctx, f, id) : '') + footer(f, F));
  }
  /* a holding the Saturday review covers but this figure set draws no chart for: its view from the review (draft) */
  function drawReview(ctx, id) {
    var c = reviewCard(ctx, id);
    if (!c) return drawNone(ctx, id);
    var code = c.rules.split(' · ')[0], conf = +c.rules.split(' · ')[1].replace('%', '');
    var F = FC(ctx), wk = (F.proof && F.proof.gate) || { week: 5, of: 8 };
    var top = K.foot('The Forecaster’s view of this holding, as Saturday’s review gave it.');
    var body;
    if (c.state === 'no_view') {
      body = '<section class="fhero"><div class="fh-top">' + over('Next 4 weeks · the Forecaster', 'fh-over') + inPracticeChip(id, wk.week, wk.of) + '</div>' +
        '<div class="fh-agree" style="font-size:16px;line-height:21px">' + K.ms('blur_on') + '<span><b>No clear view.</b> ' + c.why + '</span></div>' +
        '<div class="fh-rules"><div class="fx ac jb g8 wrap"><span class="fh-k">The rules engine, beside it</span>' + K.stance(code, conf, { upper: true }) + '</div><p class="fh-line">Nothing to do.</p></div></section>';
    } else {
      body = hero(ctx, { fall5: c.fall5, usual: c.usual, lo: c.lo, hi: c.hi, up: c.up, stance: code, conf: conf, line: 'Nothing to do',
        agree: c.state === 'disagree' ? 'The two engines disagree. The rules engine says ' + code + '; the Forecaster sees a rougher month than usual (' + K.pct(c.fall5) + ' against a usual ' + K.pct(c.usual) + ').' : null,
        disagree: c.state === 'disagree', chip: inPracticeChip(id, wk.week, wk.of) });
      body += sech('Why it says so', 'from Saturday’s review') + K.group([
        K.row({ lead: '<span class="mp-icontile mp-neutral">' + K.ms('mood', 'ms-s') + '</span>', t: 'Market mood', s: c.mood }),
        K.row({ lead: '<span class="mp-icontile mp-neutral">' + K.ms('history', 'ms-s') + '</span>', t: 'Similar days', s: c.similar }),
        K.row({ lead: '<span class="mp-icontile mp-neutral">' + K.ms('candlestick_chart', 'ms-s') + '</span>', t: 'Pattern', s: c.pattern }),
        K.row({ lead: '<span class="mp-icontile mp-neutral">' + K.ms('tune', 'ms-s') + '</span>', t: 'Main drivers', s: cap(c.drivers) })
      ]);
    }
    return wrap(top + body + '<p class="mp-foot mp-ink2 fend" style="margin:0">Every figure comes from code: the Forecast row of Sat 24 Oct 06:10. Claude only puts them into words. A view, not advice: MyPaisa cannot trade.</p>');
  }
  /* no Forecaster for this holding yet (draft) */
  function drawNone(ctx, id) {
    var a = asset(ctx, id), india = a && a.country === 'IN';
    return wrap(K.card({ cls: 'fcard', t: 'The Forecaster', body:
      '<div class="fnov">' + K.ms('hourglass_empty') + '<span>No Forecaster view yet</span></div>' +
      K.p(india ? 'It needs this holding’s ten years of daily prices from a source for Indian markets, its exposure map and its own lab report first. Until then the rules engine’s call stands on its own.' :
        'It needs this holding’s ten years of daily prices, its exposure map and its own lab report first. Until then the rules engine’s call stands on its own.') +
      K.kv('What comes first', 'ten years of prices, then the lab, then 8 weeks in practice', 'fkvw') +
      K.kv('Where it would show', 'here, labelled in practice, and in the Saturday review', 'fkvw') }) +
      K.viewNotAdvice());
  }
  function drawForecast(ctx, id) {
    if (id === 'pot') return '';
    if (id === 'nasdaq' || id === 'balanced') return draw1a(ctx, id);
    if (id === 'robotics' || id === 'silver') return drawReview(ctx, id);
    return drawNone(ctx, id);
  }
  /* the 1a screens are picked (MA-281), so the header carries no Draft chip; every other state is a draft */
  M.holdingTab('forecast', { t: 'Forecast', order: 2, when: function (id) { return id !== 'pot'; }, show: function (ctx, id) { return id !== 'pot'; },
    chip: function (ctx, id) { return id === 'nasdaq' || id === 'balanced' ? '' : K.draft(); }, draw: function (ctx, id) { return drawForecast(ctx, id); } });

  /* ---------- a row's sheet (draft): the timeline, chart or table behind one row ---------- */
  function sheetWrap(title, sub, body, closeKey) {
    return '<div class="pv5-forecast"><div class="fsheet"><div class="fsheet-h"><div class="fx col g4 f1"><div class="fx ac g8 wrap"><span class="mp-t3">' + title + '</span>' + K.draft() + '</div>' + (sub ? '<span class="mp-foot mp-ink2">' + sub + '</span>' : '') + '</div>' +
      '<button type="button" class="fx44" aria-label="Close"' + K.go(closeKey || 'fc:sheet:close') + '>' + K.ms('close') + '</button></div>' + body + '</div></div>';
  }
  function rowSheet(ctx, id, which) {
    var f = FC(ctx)[id], body = '', title = '', sub = '';
    if (!f) return '';
    if (which === 'similar' && f.similar.paths) {
      var c = f.candles, now = c.slice(19, 60).map(function (b, i) { return [i - 40, b.c]; });
      var paths = f.similar.paths.map(function (p) { return p.map(function (v, k) { return [k * 2, v]; }); });
      var mid = paths[0].map(function (q, k) { var col = paths.map(function (p) { return p[k][1]; }).sort(function (a, b) { return a - b; }); var n = col.length; return [q[0], n % 2 ? col[(n - 1) / 2] : (col[n / 2 - 1] + col[n / 2]) / 2]; });
      title = 'Similar days'; sub = f.similar.n + ' since ' + f.similar.since + ' · ' + f.similar.recovered + ' higher 4 weeks later · the middle ' + sp(f.similar.mid);
      body = fcLines({ x0: -40, x1: 20, y0: -12, y1: 12, h: ctx.compact ? 170 : 200, grid: [-10, 0, 10], now: now, paths: paths, mid: mid, midLabel: 'middle ' + sp(f.similar.mid),
          xLabels: [{ x: -40, t: '40 days ago' }, { x: 0, t: 'today' }, { x: 20, t: '+4 weeks' }], label: 'The last 40 days, then what followed each of the ' + f.similar.n + ' most similar days since ' + f.similar.since + '.' }) +
        '<div class="flgd"><span><i class="sw-now"></i>the last 40 days</span><span><i class="sw-sim"></i>each similar day, and what followed</span><span><i class="sw-mid" style="border-top-color:var(--mp-ink)"></i>their middle</span></div>' +
        K.p('The ' + f.similar.n + ' days since ' + f.similar.since + ' most like today, leaving out the last 20 days, lined up on Friday’s close: ' + f.similar.recovered + ' were higher 4 weeks later, and the middle of them ' + sp(f.similar.mid) + '.');
    } else if (which === 'mood') {
      var cls = { 'Calm and rising': 'fm-1', 'Choppy': 'fm-2', 'Stressed': 'fm-3', 'Falling': 'fm-4' };
      title = 'Market mood'; sub = f.mood.now + ' since ' + f.mood.since;
      body = (f.mood.timeline ? '<span class="mp-foot mp-ink2">the last five months, smoothed so it does not flip daily</span><div class="fmbar">' + f.mood.timeline.map(function (m) { return '<i class="' + cls[m[0]] + '" style="flex:1"></i>'; }).join('') + '</div>' +
        '<div class="fx jb mp-foot mp-ink2">' + f.mood.timeline.map(function (m) { return '<span>' + m[1] + '</span>'; }).join('') + '</div>' : '') +
        over('Next 4 weeks') + '<div class="fmbar">' + f.mood.next.map(function (m) { return '<i class="' + cls[m[0]] + '" style="flex:' + m[1] + '"></i>'; }).join('') + '</div>' +
        f.mood.next.map(function (m) { return K.kv('<span class="fx ac g8"><i class="fmsw ' + cls[m[0]] + '"></i>' + m[0] + '</span>', K.pct(m[1]), 'fkvw'); }).join('');
    } else if (which === 'events') {
      title = 'Event impacts'; sub = 'how this holding moved in the 4 weeks after each kind of event, since 2015';
      body = '<div class="ftbl c3"><span class="th">Event</span><span class="th r">Cases</span><span class="th r">Average</span>' + f.events.map(function (e) {
        return '<span class="rh">' + e[0] + (e[3] ? ' ' + K.chip('low confidence', 'mp-neutral chip-s') : '') + '</span><span class="r">' + e[1] + '</span><span class="r fnum">' + sp(e[2]) + '</span>'; }).join('') + '</div>' +
        K.foot('Under 8 cases is marked low confidence.');
    } else if (which === 'drivers') {
      var mx = Math.max.apply(null, f.drivers.map(function (d) { return Math.abs(d[1]); }));
      title = 'Main drivers'; sub = 'from a usual ' + K.pct(f.usual_up) + ' chance of being up to ' + K.pct(f.headline.up) + ', in points';
      body = f.drivers.map(function (d) {
        var w = Math.abs(d[1]) / mx * 50;
        return '<div class="fdrv"><span>' + d[0] + '</span><span class="fdbar"><i class="' + (d[1] > 0 ? 'for' : 'ag') + '" style="' + (d[1] > 0 ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%"></i></span><span class="fdv">' + (d[1] > 0 ? '+' : '−') + Math.abs(d[1]) + ' pt' + (Math.abs(d[1]) === 1 ? '' : 's') + '</span></div>';
      }).join('') + '<div class="flgd"><span><i class="fmsw" style="background:var(--mp-pillar-for)"></i>lifts</span><span><i class="fmsw" style="background:var(--mp-pillar-against)"></i>lowers</span></div>';
    } else {
      title = 'Technical'; sub = f.candles ? 'the Forecaster’s wider set, beside the rules engine’s' : 'a fund: no candles or volume';
      var T = f.technical;
      body = typeof T === 'string' ? K.p(cap(T)) : [['ADX', T.adx], ['Stochastic', T.stoch], ['RSI', T.rsi], ['MACD', T.macd], ['On-balance volume', T.obv], ['Ichimoku', T.ichimoku], ['Donchian', T.donchian], ['Keltner', T.keltner], ['EMAs', T.ema]].map(function (r) { return K.kv(r[0], esc(String(r[1])), 'fkvw'); }).join('');
    }
    var proof = '<div class="fbtns">' + K.cbtn('How it proves itself', 'nav:proof/' + id, null, 'fact_check') + '</div>';
    return sheetWrap(title, sub, body + K.foot('Every figure comes from code: the Forecast row of ' + runOf(FC(ctx), f).run + '. A view, not advice.') + proof);
  }

  /* ---------- the proof page: How it proves itself (MA-281, C2) ---------- */
  M.page('proof', function (ctx, args) {
    var id = args[0] || 'nasdaq', F = FC(ctx), P = F.proof, f = F[id] || F.nasdaq;
    if (!P) return { title: 'How it proves itself', body: K.note('info', 'The Forecaster’s figures are not loaded.') };
    var two = ctx.door === 'desk' || ctx.door === 'fold';
    var lab = K.card({ cls: 'fcard', body: over(P.lab.span ? 'The backtest lab · ' + P.lab.span : 'The backtest lab') + '<span class="mp-t3">Its first report: the rules engine over ten years</span>' +
      K.foot('Replayed one day at a time, with fees, next-day prices for funds and monthly contributions, against buy-and-hold and a simple trend rule. Calibration: the chance it said, then how often it came true.') +
      '<div class="ftbl c4" style="margin-top:6px"><span class="th"></span>' + P.lab.cols.map(function (c) { return '<span class="th">' + c + '</span>'; }).join('') +
      P.lab.rows.map(function (r) { return '<span class="rh">' + r[0] + '</span>' + r.slice(1).map(function (v) { return '<span>' + v + '</span>'; }).join(''); }).join('') + '</div>' });
    var folds = K.card({ cls: 'fcard', body: '<span class="mp-t3">Walk-forward tests</span>' + K.foot('Trained on the past, tested on the year after, with a gap; the last two years held back for one final test. Four-week risk shown.') +
      '<div class="ftbl c3">' + P.folds.map(function (fo) { return '<span class="rh">' + fo[0] + '</span><span class="mp-ink2">tests ' + fo[1] + '</span><span class="r">' + (fo[2] ? '<span class="fok">✓ beat</span>' : '<span class="fno">✗ missed</span>') + '</span>'; }).join('') + '</div>' +
      K.foot('A model that does not beat the base rate in the final test is not used.') });
    var g = P.gate, beat = (f.track && f.track.fc.beat) || [];
    var gate = K.card({ id: 'fc-gate', cls: 'fcard', body: '<div class="fx ac jb g8 wrap"><span class="mp-t3">The live gate</span>' + K.inpractice('In practice · week ' + g.week + ' of ' + g.of) + '</div>' +
      K.foot('8 live weeks beating both, graded each Friday: next on ' + g.next.join(', ') + '.') + weeks(beat) });
    var sw = [
      ['science', 'In practice', 'Graded every week; shown only on the holding’s Forecast tab and in the Saturday review, labelled in practice.', true, null],
      ['visibility', 'Live', 'After 8 live weeks beating both the base rate and the rules engine: the weekday cards too.', false, null],
      ['power_settings_new', 'Off', 'Four weeks worse than the base rate: it switches itself off, and the owner is told.', false, 'fc:off'],
      ['autorenew', 'Retrained monthly', 'Each version is a ModelVersion row with its test scores.', false, null]
    ];
    var swh = sech('The switch-off', 'its status now', 'fc-switch') + K.group(sw.map(function (s) {
      var inner = '<span class="mp-icontile mp-neutral">' + K.ms(s[0], 'ms-s') + '</span><span class="frg"><span class="mp-sub" style="font-weight:600">' + s[1] + (s[3] ? '<span class="fnow">now</span>' : '') + '</span><span class="mp-foot mp-ink2">' + s[2] + '</span></span>';
      return s[4] ? '<button type="button" class="mp-row rowbtn frow"' + K.go(s[4]) + '>' + inner + K.ms('chevron_right', 'fchev') + '</button>' : '<div class="mp-row frow">' + inner + '</div>';
    }));
    var R = runOf(F, f);
    var models = K.card({ cls: 'fcard', body: '<span class="mp-t3">Models now</span><span class="mp-foot mp-ink2">version ' + R.model + ' · trained on data to ' + R.data_to + '</span>' +
      P.models.map(function (m) { return K.kv(m[0] + ' · ' + m[1], m[2]); }).join('') });
    var foot = '<p class="mp-foot mp-ink2 fend" style="margin:0;text-wrap:pretty">Every figure comes from code: the lab’s report and the Forecast rows. A view, not advice: MyPaisa cannot trade. Illustrative figures (forecaster-v4.json).</p>';
    var body = two ? lab + '<div class="fg2"><div class="fcol">' + folds + '</div><div class="fcol">' + gate + models + '</div></div>' + swh
      : lab + folds + gate + swh + models;
    return { title: 'How it proves itself', sub: 'A lab first, practice next, and an off switch · ' + (SHORT[id] || f.name),
      back: { t: 'Forecast', go: hk(id, 'forecast') }, body: wrap(body + foot) };
  });
  /* the Off state, drawn as it would read (draft): not today's figures */
  function offSheet(ctx) {
    return sheetWrap('If it switches itself off', 'how the Forecast tab would read · a state, not today’s figures',
      '<div class="fnov">' + K.ms('power_settings_new') + '<span>The Forecaster is off for this holding</span></div>' +
      K.p('Its live record was worse than the base rate for four weeks running, so it stopped itself and told the owner. The rules engine’s call stands on its own; the Forecaster’s rows wait for the next monthly model, which starts in practice again.') +
      K.kv('Shown', 'no Forecaster figures, here or in the Saturday review', 'fkvw') + K.kv('The owner is told', 'in the chat, with its four weeks of grades', 'fkvw') + K.kv('Back on', 'a new version, after its own lab report and 8 weeks in practice', 'fkvw') +
      '<div class="fbtns">' + K.cbtn('Done', 'fc:done', 'primary') + '</div>', 'fc:done');
  }

  /* ---------- the valuation tab: a share's valuation snapshot and earnings analysis (MA-99, draft) ---------- */
  var VNAME = { very_cheap: 'Very cheap', cheap: 'Cheap', fair: 'Fair', expensive: 'Expensive', very_expensive: 'Very expensive', strong_compounder: 'Strong compounder', consistent: 'Consistent', mixed: 'Mixed', volatile: 'Volatile', deteriorating: 'Deteriorating' };
  var VSHORT = { strong_compounder: 'Strong', deteriorating: 'Worsening' };
  function scale(list, on) { return '<div class="fscale">' + list.map(function (v) { return '<span class="' + (v === on ? 'on' : '') + '">' + (VSHORT[v] || VNAME[v]) + '</span>'; }).join('') + '</div>'; }
  function valuationCard(ctx, I) {
    var V = I.valuation, m = V.metrics, s = V.sector;
    var rows = [['P/E, last 12 months', m.pe.toFixed(1), s.pe.toFixed(1)], ['Price to sales', m.ps.toFixed(2), s.ps.toFixed(2)], ['EV to EBITDA', m.ev_ebitda.toFixed(1), s.ev_ebitda.toFixed(1)], ['Free cash flow yield', K.pct(m.fcf_yield, { dp: 1 }), K.pct(s.fcf_yield, { dp: 1 })]];
    return K.card({ id: 'fc-val', cls: 'fcard', t: 'Valuation snapshot', body:
      '<div class="fx ac g8 wrap">' + K.chip(VNAME[V.verdict], 'mp-hold') + '<span class="mp-foot mp-ink2">against ' + V.sector_name + '</span></div>' + K.p(V.one_liner) + scale(V.scale, V.verdict) +
      '<div class="ftbl c3" style="margin-top:4px"><span class="th"></span><span class="th r">Infosys</span><span class="th r">Sector</span>' + rows.map(function (r) { return '<span class="rh">' + r[0] + '</span><span class="r">' + r[1] + '</span><span class="r mp-ink2">' + r[2] + '</span>'; }).join('') + '</div>' +
      K.kv('Price to book', m.pb.toFixed(1), 'fkvw') + K.kv('Return on equity', K.pct(m.roe), 'fkvw') + K.kv('Net margin', K.pct(m.net_margin, { dp: 1 }), 'fkvw') + K.kv('Debt to equity', m.debt_to_equity.toFixed(2), 'fkvw') +
      K.pillar('Valuation pillar', V.pillar, 'stocks only: cheap +2 … expensive −2') });
  }
  function earningsCard(ctx, I) {
    var E = I.earnings, compact = ctx.compact;
    var tbl = '<div class="ftbl c3e"><span class="th">Quarter</span><span class="th r">Revenue, ₹ crore</span><span class="th r">EPS, ₹ · estimate</span>' + E.quarters.slice().reverse().map(function (q) {
      return '<span class="rh">' + q.q + '<br><span class="mp-foot mp-ink2" style="font-weight:400">' + q.day + '</span></span><span class="r">' + num(q.revenue_cr) + '</span><span class="r">' + q.eps.toFixed(2) + ' · ' + q.est.toFixed(2) + ' ' + (q.beat ? '<span class="fok">✓</span>' : '<span class="fno">✗</span>') + '</span>';
    }).join('') + '</div>';
    return K.card({ id: 'fc-earn', cls: 'fcard', t: 'Earnings', body:
      '<div class="fx ac g8 wrap">' + K.chip(VNAME[E.verdict], 'mp-hold') + '<span class="mp-foot mp-ink2">' + E.beats + ' of ' + E.of + ' quarters beat the estimate</span></div>' + K.p(E.one_liner) + scale(E.scale, E.verdict) + tbl +
      K.kv('Next results', E.next.day + ' · ' + E.next.note, 'fkvw') });
  }
  function temperCard(ctx, I) {
    var E = I.earnings;
    return K.card({ id: 'fc-temper', cls: 'fcard', t: 'Its call · the stock temperament', body:
      K.p('Cautious. One company carries more risk than a fund, so the bar for Buy is higher, and results block any change to its call for the two sessions after them.') +
      K.kv('Next results', E.next.day, 'fkvw') + K.kv('Its call held on', E.next.blocked.join(' and '), 'fkvw') +
      K.kv('Valuation pillar', VNAME[I.valuation.verdict] + ' · ' + (I.valuation.pillar > 0 ? '+' : I.valuation.pillar < 0 ? '−' : '') + Math.abs(I.valuation.pillar), 'fkvw') });
  }
  function drawValuation(ctx, id) {
    if (id !== 'infosys') return '';
    var N = NS(ctx);
    if (!N || !N.infosys) return wrap(K.note('info', 'The share’s figures are not loaded.'));
    var I = N.infosys, two = ctx.door === 'desk' || ctx.door === 'fold';
    var src = K.note('database', 'Fundamentals: the source is not chosen yet. PLAN decides it when these cards are built (EODHD Fundamentals would be ' + K.gbp(59.99, { dp: 2 }) + ' a month), so these figures are illustrative.');
    var price = K.card({ cls: 'fcard', body: '<div class="fx ac jb g8 wrap"><span class="mp-hl">' + I.units + ' shares · ' + I.exchange + '</span><span class="mp-foot mp-ink2">' + I.priced + '</span></div>' +
      K.kv('Price', inr2(I.price), 'fkvw') + K.kv('Value', K.inrGbp(I.value_inr), 'fkvw') });
    var body = two ? '<div class="fg2"><div class="fcol">' + price + valuationCard(ctx, I) + '</div><div class="fcol">' + earningsCard(ctx, I) + temperCard(ctx, I) + '</div></div>'
      : price + valuationCard(ctx, I) + earningsCard(ctx, I) + temperCard(ctx, I);
    return wrap(src + body + '<p class="mp-foot mp-ink2 fend" style="margin:0;text-wrap:pretty">Every figure comes from code: prices ' + I.sources.price + '; the cards generated ' + I.generated + '. Claude only puts them into words. A view, not advice: MyPaisa cannot trade. Illustrative figures (news-share-v5.json).</p>');
  }
  M.holdingTab('valuation', { t: 'Valuation', order: 4, when: function (id) { return id === 'infosys'; }, show: function (ctx, id) { return id === 'infosys'; },
    chip: function () { return K.draft(); }, draw: function (ctx, id) { return drawValuation(ctx, id); } });

  /* ---------- the news page: News and events (phase 14, draft) ---------- */
  var EVICON = { Tariffs: 'gavel', 'Rate surprise': 'percent', Conflict: 'sailing', FOMC: 'account_balance', ECB: 'euro', MPC: 'currency_pound', CPI: 'shopping_cart', Earnings: 'receipt_long', Election: 'how_to_vote' };
  var EVWORD = { Tariffs: 'tariff news', 'Rate surprise': 'a rate surprise', Conflict: 'conflict', 'Inflation surprise': 'an inflation surprise', 'Earnings miss': 'an earnings miss', Election: 'past elections' };
  var EVPAST = { Tariffs: 'tariff news', 'Rate surprise': 'rate surprises', Conflict: 'conflicts', 'Inflation surprise': 'inflation surprises', 'Earnings miss': 'earnings misses', Election: 'elections' };
  function pastLine(p, name) {
    if (!p) return '';
    var low = p.low ? ' · ' + K.chip('low confidence', 'mp-neutral chip-s') : '';
    return (name || p.name) + ' moved ' + sp(p.avg) + ' in the 4 weeks after ' + EVWORD[p.event] + ', on average over ' + p.cases + ' cases' + low;
  }
  function eventLead(p) { return p.event === 'Election' ? 'After past elections: ' : p.event === 'Earnings miss' ? 'If they miss: ' : 'If it surprises: '; }
  function storyRows(N) {
    return K.group(N.news.stories.filter(function (s) { return s.matched; }).map(function (s) {
      var m = s.matches[0];
      return '<button type="button" class="mp-row rowbtn frow"' + K.go('fc:story:' + s.id) + '><span class="mp-icontile mp-neutral">' + K.ms(EVICON[s.event] || 'newspaper', 'ms-s') + '</span><span class="frg"><span class="mp-sub" style="font-weight:600">' + esc(s.headline) + '</span>' +
        '<span class="mp-foot mp-ink2">' + s.event + ' · ' + s.published + ' · touches ' + s.matches.map(function (x) { return x.name; }).join(', ') + '</span><span class="mp-foot">' + pastLine(m.past, m.name) + '</span></span>' + K.ms('chevron_right', 'fchev') + '</button>';
    }));
  }
  function eventRows(N) {
    return K.group(N.events.map(function (e) {
      var d = e.day.split(' ');
      return '<div class="mp-row frow"><span class="fdate"><span>' + d[0] + '</span><b>' + d[1] + '</b><span>' + d[2] + '</span></span><span class="frg"><span class="mp-sub" style="font-weight:600">' + e.t + '</span><span class="mp-foot mp-ink2">' + cap(e.tm) + ' · ' + e.why + '</span>' +
        (e.past ? '<span class="mp-foot">' + eventLead(e.past) + pastLine(e.past) + '</span>' : '') + '</span></div>';
    }).concat(N.later.map(function (e) {
      var d = e.day.split(' ');
      return '<div class="mp-row frow"><span class="fdate"><span>' + d[0] + '</span><b>' + d[1] + '</b><span>' + d[2] + '</span></span><span class="frg"><span class="mp-sub" style="font-weight:600">' + e.t + ', expected</span><span class="mp-foot mp-ink2">Later · ' + e.why + '</span></span></div>';
    })));
  }
  function tiltRows(N) {
    return N.sentiment.tilt.map(function (t) {
      var moved = t.would_be !== t.stance;
      return '<div class="ftilt"><span class="mp-sub" style="font-weight:600">' + t.name + '</span><span class="fx ac g6 wrap">' + K.stance(t.stance, t.conf, { upper: true }) + (moved ? K.ms('arrow_forward', 'mp-ink2') + K.stance(t.would_be, null, { upper: true }) + K.shadow('in shadow') : '') + '</span>' +
        '<span class="w">News ' + idx(t.news) + ' · ' + t.why + '</span></div>';
    }).join('');
  }
  function moodCard(ctx, N) {
    var S = N.sentiment, H = S.history;
    var spark = K.line({ x0: 0, x1: H.length - 1, y0: -0.5, y1: 0.5, h: '64px', grid: [0], series: [{ pts: H.map(function (p, i) { return [i, p.v]; }), w: 2 }],
      xLabels: [{ x: 0, t: H[0].day }, { x: H.length - 1, t: 'today' }], label: 'News mood each weekday from ' + H[0].day + ' to today.' });
    var byh = ['nasdaq', 'robotics', 'balanced', 'silver'].map(function (h) { var t = S.tilt.filter(function (x) { return x.holding === h; })[0]; return K.kv(t.name, idx(S.by_holding[h]), 'fkvw'); }).join('');
    var tilt = ctx.has('tilt');
    var tech = ctx.has('newstech');
    return K.card({ id: 'fc-mood', cls: 'fcard', t: 'News mood', r: K.shadow('In shadow'), body:
      '<div class="fmood"><span class="fbig">' + idx(S.today) + '</span><span class="mp-foot mp-ink2">today, from −1 to +1: the stories that touch your holdings, each holding weighted by its value</span></div>' + spark + byh +
      '<button type="button" class="mp-row rowbtn" style="padding-left:0;padding-right:0"' + K.go('fold:tilt') + '><span class="frg"><span class="mp-sub" style="font-weight:600;color:var(--mp-accent)">How a tilt works</span></span>' + K.ms(tilt ? 'expand_less' : 'expand_more', 'mp-ink2') + '</button>' +
      (tilt ? '<div class="fx col g8" id="fc-tilt">' + K.p('News can move a call one notch, on Buy · Hold · Pause, and only when the price pillars lean the same way. In shadow it is written and graded each day, and shown in no call until its record earns it. News alone never sends a red alert.') + '<div>' + tiltRows(N) + '</div></div>' : '') +
      '<button type="button" class="mp-row rowbtn" style="padding-left:0;padding-right:0"' + K.go('fold:newstech') + '><span class="frg"><span class="mp-sub" style="font-weight:600;color:var(--mp-accent)">Technical</span></span>' + K.ms(tech ? 'expand_less' : 'expand_more', 'mp-ink2') + '</button>' +
      (tech ? '<div class="ccard-tech" style="border-radius:12px">' + ['News mood ' + idx(S.today) + ' · scored by ' + N.news.by + ', ' + N.clock.scored, 'stories in ' + N.news.collected + ' · duplicates ' + N.news.duplicates + ' · left out ' + N.news.skipped + ' (inc-7) · scored ' + N.news.scored, 'matched ' + N.news.matched + ' over the floor of ' + N.news.floor.toFixed(2) + ' · weight = the holding’s exposure to what a story names', 'tools get_events · get_sentiment'].map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div>' : '') });
  }
  M.page('news', function (ctx) {
    var N = NS(ctx);
    if (!N) return { title: 'News and events', body: K.note('info', 'The news figures are not loaded.') };
    var two = ctx.door === 'desk' || ctx.door === 'fold';
    var stories = K.card({ id: 'fc-stories', cls: 'fcard', body: '<span class="mp-t3">' + N.news.matched + ' stories touch your holdings today</span>' +
      K.foot(N.news.scored + ' stories came in overnight, scored by Haiku. Code matched each to what you hold, by exposure; the other ' + (N.news.scored - N.news.matched) + ' touch nothing you hold, or too little to count.') + storyRows(N) });
    var events = K.card({ id: 'fc-events', cls: 'fcard', body: '<div class="fx ac jb g8 wrap"><span class="mp-t3">Events, next 4 weeks</span><span class="mp-foot mp-ink2">' + N.clock.window + '</span></div>' + eventRows(N) });
    var body = two ? '<div class="fg2"><div class="fcol">' + stories + moodCard(ctx, N) + '</div><div class="fcol">' + events + '</div></div>' : stories + events + moodCard(ctx, N);
    return { title: 'News and events', sub: 'Mon 26 Oct · matched to what you hold · prices at the Fri 23 Oct close', chip: K.draft(),
      body: wrap(body + '<p class="mp-foot mp-ink2 fend" style="margin:0;text-wrap:pretty">Every number comes from code: the weights from each holding’s exposure map, the effects from ten years of event studies. Haiku only tags the stories. News alone never sends a red alert. A view, not advice: MyPaisa cannot trade.</p>') };
  });
  function storySheet(ctx, sid) {
    var N = NS(ctx), s = N && N.news.stories.filter(function (x) { return x.id === sid; })[0];
    if (!s) return '';
    var dir = function (d) { return d < 0 ? 'points down for it' : d > 0 ? 'points up for it' : 'points nowhere for it'; };
    var body = '<div class="fents">' + K.chip(K.ms(EVICON[s.event] || 'newspaper') + s.event, 'mp-neutral') + s.entities.map(function (e) { return K.chip(esc(e), 'mp-neutral chip-s'); }).join('') + '</div>' +
      over('How it reaches what you hold') + s.matches.map(function (m) {
        return '<div class="ftilt"><span class="mp-sub" style="font-weight:600">' + m.name + '</span><span class="fnum">weight ' + m.weight.toFixed(2) + '</span><span class="w">' + cap(m.via) + '; it ' + dir(m.direction) + ' (' + idx(m.direction) + ')' + (m.past ? '. After past ' + EVPAST[m.past.event] + ', it moved ' + sp(m.past.avg) + ' in 4 weeks, on average over ' + m.past.cases + ' cases' : '') + '</span></div>';
      }).join('') +
      (s.under_floor.length ? over('Under the floor of ' + N.news.floor.toFixed(2) + ', dropped') + '<span class="mp-foot mp-ink2">' + s.under_floor.map(function (m) { return m.name + ' ' + m.weight.toFixed(2); }).join(' · ') + '</span>' : '') +
      K.foot('Haiku tagged the story; code worked out each weight from the holding’s exposure map and each effect from ten years of event studies. News alone never sends a red alert.');
    return sheetWrap(esc(s.headline), s.published + ' · ' + s.event, body);
  }

  /* ---------- chat pieces ---------- */
  function briefCard(ctx, N) {
    var ms = N.news.stories.filter(function (s) { return s.matched; });
    var wk = N.events.filter(function (e) { return e.d <= '2026-10-30'; });
    var lines = ms.map(function (s) { var m = s.matches[0]; return '<div class="fbl"><span class="mp-sub" style="font-weight:600">' + esc(s.headline) + '</span><span class="mp-foot mp-ink2">' + pastLine(m.past, m.name) + '</span></div>'; }).join('');
    return K.ccard({ cls: 'pv5-forecast', chip: K.draft() + K.shadow('Sentiment in shadow'), h: N.news.matched + ' stories touch your holdings today', sub: 'The brief’s news, sent at ' + N.clock.sent.split(' ').pop() + ' · prices to Friday’s close',
      body: lines + '<div class="fbl"><span class="mp-over mp-ink2">This week</span>' + wk.map(function (e) { return '<span class="mp-foot">' + e.day + ', ' + e.tm + ' · ' + e.t + '</span>'; }).join('') + '</div>',
      acts: [K.cbtn('News and events', 'nav:news', 'primary', 'newspaper'), K.cbtn('Why?', 'chip:why', null, 'help')],
      fold: { t: 'Technical', open: ctx.has('btech'), go: 'fold:btech', body: '<span>News mood ' + idx(N.sentiment.today) + ' · scored by ' + N.news.by + ' · in shadow: graded, shown in no call</span><span>' + N.news.scored + ' stories scored · ' + N.news.matched + ' matched over the floor</span><span>get_events · get_sentiment</span>' } });
  }
  function tiltCard(ctx, N) {
    return K.ccard({ cls: 'pv5-forecast', chip: K.draft() + K.shadow('In shadow'), h: 'What the news would do to each call', sub: 'one notch at most, only when the price pillars agree',
      body: '<div>' + tiltRows(N) + '</div>', acts: [K.cbtn('News and events', 'nav:news', null, 'newspaper'), K.cbtn('Why?', 'chip:why', null, 'help')] });
  }
  function reviewCcard(ctx, id, opts) {
    var c = reviewCard(ctx, id), F = FC(ctx);
    if (!c) return '';
    var hold = id === 'nasdaq' ? F.nasdaq : null;
    var head = '<span class="mp-over mp-ink2">Forecaster · in practice · 4 weeks</span>';
    var code = c.rules.split(' · ')[0];
    var body = '';
    if (c.state === 'disagree') body += '<div class="fdis">' + K.ms('call_split') + '<span><b>The two engines disagree.</b> The rules engine says ' + code + '; the Forecaster sees a rougher month than usual (' + K.pct(c.fall5) + ' against a usual ' + K.pct(c.usual) + ').</span></div>';
    body += K.kv('Rules engine', c.rules, 'fkvw');
    if (c.state === 'no_view') {
      body += '<div class="fnov">' + K.ms('blur_on') + '<span>No clear view</span></div>' + K.p(c.why);
      return K.ccard({ cls: 'pv5-forecast', chip: head, h: c.name, body: body, acts: [K.cbtn('Why?', 'chip:why'), K.cbtn('Track record', hk(id, 'track'))] });
    }
    body += K.kv('Fall over 5%', K.pct(c.fall5) + ' (usually ' + K.pct(c.usual) + ')', 'fkvw') + K.kv('Chance up', K.pct(c.up), 'fkvw') + K.kv('Likely range', rng(c.lo, c.hi), 'fkvw') +
      K.kv('Market mood', c.mood, 'fkvw') + K.kv('Similar days', c.similar, 'fkvw') + K.kv('Pattern', c.pattern, 'fkvw') + K.kv('Main drivers', c.drivers, 'fkvw');
    var tech = hold ? { t: 'Technical', open: ctx.has('tech'), go: 'fold:tech', body: [
      'Forecast row · ' + c.name + ' · ' + hold.run + ' · model ' + hold.model + ' · trained on data to ' + hold.data_to,
      'direction ' + (hold.headline.up / 100).toFixed(2) + ' (calibrated, conformal range p10 ' + idx(hold.fan[19].p10).replace(/(\.\d)\d$/, '$1') + ' · p50 ' + idx(hold.fan[19].p50).replace(/(\.\d)\d$/, '$1') + ' · p90 ' + idx(hold.fan[19].p90).replace(/(\.\d)\d$/, '$1') + ')',
      'risk P(fall > 5%) ' + (hold.headline.fall5 / 100).toFixed(2) + ' · base rate ' + (hold.headline.fall5_usual / 100).toFixed(2),
      'mood ' + hold.mood.next.map(function (m) { return m[0].split(' ')[0].toLowerCase() + ' ' + (m[1] / 100).toFixed(2); }).join(' · '),
      'pattern double top · n ' + hold.patterns[0].cases + ' · 20d mean ' + sp(hold.patterns[0].avg) + ' · ' + hold.patterns[0].lower + ' of ' + hold.patterns[0].cases + ' lower',
      'gate week ' + hold.track.fc.week + ' of ' + hold.track.fc.of + ' · W1 to W' + hold.track.fc.week + ' beat base rate and rules engine'
    ].map(function (l) { return '<span>' + l + '</span>'; }).join('') } : null;
    return K.ccard({ cls: 'pv5-forecast', id: opts && opts.id, chip: head, h: c.name, body: body,
      acts: [K.cbtn('Why?', 'chip:why'), K.cbtn('Chart', hk(id, 'forecast')), K.cbtn('Track record', hk(id, 'track'))], fold: tech });
  }
  var NEWS_IN = 'The news is in. The night’s run stopped on one story; it ran again at 08:31 without it, so here is the news the 07:15 brief was missing.';
  var REVIEW_INTRO = 'Your Saturday review. The Forecaster is in practice for every holding, week 5 of 8: until its 8 weeks are up it shows only here and on each holding’s Forecast tab, labelled so.';
  var IN_PRACTICE = 'The Forecaster is still in practice on this ETF, week 5 of 8, so its own view shows only on this holding’s Forecast tab and in Saturday’s review, labelled in practice, never in the chat. A view, not advice.';
  function chatForecast(ctx, extra) {
    var out = [K.daysep('Today'), K.me('Why is my NASDAQ ETF on PAUSE?', '10:11'),
      K.ai('The rules engine says PAUSE · 64%, in shadow until its 8 weeks are up: keep what you have; delay new money until the next review. Why? opens its pillars. ' + IN_PRACTICE, { meta: 'From the engine · get_stances', icon: 'function' })];
    return out.concat(extra || []);
  }
  var FC_COMPOSER = { ph: 'Ask about this holding', chips: [['Why?', 'help', 'chip:why'], ['Track record', 'fact_check', 'chip:track']] };

  /* ---------- the chapters ---------- */
  function sheetOn(id) {
    var on = {};
    ['similar', 'mood', 'events', 'drivers', 'tech'].forEach(function (w) {
      on['fc:row:' + id + ':' + w] = function (st) { Object.keys(st.open).forEach(function (k) { if (k.indexOf('fcs_') === 0) delete st.open[k]; }); st.open['fcs_' + w] = true; };
    });
    on['fc:sheet:close'] = function (st) { Object.keys(st.open).forEach(function (k) { if (k.indexOf('fcs_') === 0) delete st.open[k]; }); };
    return on;
  }
  function openSheet(ctx) { var w = ['similar', 'mood', 'events', 'drivers', 'tech'].filter(function (x) { return ctx.has('fcs_' + x); })[0]; return w || null; }

  M.chapter({ key: 'p14', n: '14', order: 14, title: 'News, events and sentiment, in shadow', short: 'News', steps: [
    { id: 'p14-brief', d: 'Mon 26 Oct', tm: '08:33', t: 'The brief’s news: 3 stories touch your holdings', viewer: 'arun', focus: 'chat', page: 'news', draft: true,
      g: 'The night’s news run stopped on one story (the agent team’s inc-7), so the brief’s news comes at 08:33, after the run done again: the stories that touch what you hold, each with its holding and what followed such news before, and this week’s events. News mood sits in Technical, in shadow. Tap News and events.',
      chat: function (ctx) { var N = NS(ctx); return ['<div id="fc-brief-top"></div>', K.daysep('Today'), K.ai(NEWS_IN, { cards: N ? [briefCard(ctx, N)] : [], meta: 'From the engine and the news job · get_events, get_sentiment' })]; },
      scroll: { chat: 'fc-brief-top' }, target: 'nav:news', on: { 'fold:btech': function (st) { st.open.btech = !st.open.btech; } } },
    { id: 'p14-news', d: 'Mon 26 Oct', tm: '08:36', t: 'News and events: the stories and the calendar', viewer: 'arun', focus: 'page', page: 'news', draft: true,
      g: 'Each story is matched to a holding by its exposure, in code: a chip-export story reaches the NASDAQ 100 ETF through its chipmakers. The calendar runs to Fri 20 Nov, the Forecaster’s four weeks: the MPC is Thu 5 Nov, 12:00. Tap the chip story.',
      chat: function (ctx) { var N = NS(ctx); return [K.daysep('Today'), K.ai(NEWS_IN, { cards: N ? [briefCard(ctx, N)] : [] })]; },
      target: 'fc:story:chips' },
    { id: 'p14-story', d: 'Mon 26 Oct', tm: '08:37', t: 'One story, matched by exposure', viewer: 'arun', focus: 'page', page: 'news', draft: true,
      g: 'Haiku tagged the story; its weight on each holding is that holding’s exposure to what it names, and anything under the floor is dropped (Balanced, at 0.03). The past effect is the event study’s. Close the sheet, or press Next.',
      chat: function (ctx) { var N = NS(ctx); return [K.daysep('Today'), K.ai(NEWS_IN, { cards: N ? [briefCard(ctx, N)] : [] })]; },
      sheet: function (ctx) { return ctx.has('fcsheetx') ? null : storySheet(ctx, 'chips'); },
      on: { 'fc:sheet:close': function (st) { st.open.fcsheetx = true; } } },
    { id: 'p14-tilt', d: 'Mon 26 Oct', tm: '08:40', t: 'How a tilt works, in shadow', viewer: 'arun', focus: 'chat', page: 'news', draft: true, open: ['tilt'], scroll: { page: 'fc-mood' },
      g: 'Sentiment may move a call one notch, only when the price pillars lean the same way, and in shadow it changes nothing you see. Today it would move one call: the Robotics ETF from HOLD to PAUSE. News alone never sends a red alert.',
      chat: function (ctx) {
        var N = NS(ctx);
        return [K.daysep('Today'), K.me('Does any of this news change a call?', '08:40'),
          K.ai('No call changes. The News mood is in shadow: its tilt is written and graded each day, and shown in no call until its record earns it. In shadow today it would move one call, the Robotics ETF’s, from HOLD to PAUSE: its news and its price pillars both lean down. News alone never sends a red alert.',
            { cards: N ? [tiltCard(ctx, N)] : [], meta: 'From the engine · get_sentiment, get_stances' })];
      },
      composer: { typed: 'Does any of this news change a call?' } }
  ] });

  M.chapter({ key: 'p16', n: '16', order: 16, title: 'New kinds of holding: an ETF, a share, a kind', short: 'New kinds', steps: [
    { id: 'p16-etf', d: 'Mon 26 Oct', tm: '11:02', t: 'An iShares ETF, priced like the funds', viewer: 'asha', focus: 'chat', page: function () { return hp('nasdaq'); }, draft: true,
      g: 'Asha’s NASDAQ 100 ETF came from Monzo’s “Build your own” range. It is priced by the same chain as the funds, free sources first, checked against iShares’ own NAV, and looked through by iShares’ daily holdings file.',
      chat: function (ctx) {
        var N = NS(ctx), E = N && N.etf;
        if (!E) return [];
        return [K.daysep('Today'), K.me('Where does my NASDAQ ETF’s price come from?', '11:02'),
          K.ai('The same way as your funds’: from a chain of free sources, checked against iShares’ own figure, and never guessed.', { cards: [K.ccard({ cls: 'pv5-forecast', chip: K.draft() + K.chip('ETF', 'mp-neutral'), h: E.full, sub: E.owner + ' · ' + E.wrapper + ' · ' + K.gbp(E.value_gbp) + ' at the ' + E.priced,
            body: K.kv('ISIN', E.isin, 'fkvw') + K.kv('Line', E.line + ', ' + E.venue + ', in pounds', 'fkvw') + K.kv('The other line', E.other_line, 'fkvw') +
              K.kv('Price from', E.chain.join(' → ') + ', else ' + E.fallback, 'fkvw') + K.kv('Checked against', E.check, 'fkvw') + K.kv('Looks through', E.look_through, 'fkvw') + K.kv('Charge', E.charge, 'fkvw') +
              K.foot('Added ' + E.added + '. ' + cap(E.like_funds) + '. ' + E.paid + '.'),
            acts: [K.cbtn('Activity', 'nav:activity', null, 'history')] })], meta: 'From the registry · get_holding' })];
      } },
    { id: 'p16-kind', d: 'Sun 25 Oct', tm: '17:43', t: 'A new kind: a share, behind the second check', viewer: 'arun', focus: 'chat', page: function () { return hp('infosys', 'valuation'); }, draft: true,
      g: 'Arun’s first share. A share is a new kind for this household, and a kind changes what every member can register, so the agent drafted it from the templates (propose_kind) and Arun approved it behind the second check. Its temperament is cautious.',
      chat: function (ctx) {
        var N = NS(ctx), Kd = N && N.kind, I = N && N.infosys;
        if (!Kd) return [];
        return [K.daysep('Sun 25 Oct'), K.me('I have 120 Infosys shares in my Zerodha demat', '17:40'),
          K.ai('A share is a new kind for this household, so the kind comes first. I drafted it from the templates; it changes what every member can register, so it needs your second check.', { cards: [K.ccard({ cls: 'pv5-forecast',
            chip: K.draft() + K.chip('New kind', 'mp-neutral') + K.chip(K.ms('check') + 'Approved ' + Kd.approved.split(' ').pop(), 'mp-add'), h: Kd.kind + ' · a share on an exchange', sub: 'Version ' + Kd.version + ' · from the templates',
            body: Kd.rows.map(function (r) { return K.kv(r[0], r[1], 'fkvw'); }).join('') + K.foot('Approved at ' + Kd.approved.split(' ').pop() + ' by ' + Kd.by + ', with ' + Kd.check + ' (the second check). Its audit row is on Audit.'),
            acts: [K.cbtn('Audit', 'nav:audit', null, 'receipt_long')] })], meta: Kd.tool + ' · the admin’s, behind the second check' }),
          K.ai('Saved. Infosys has no history here yet: when did you buy them, or roughly what did they cost?', { cards: [K.ccard({ cls: 'pv5-forecast', chip: K.chip(K.ms('check_circle') + 'Saved ' + I.registered.split(' ').pop(), 'mp-add'), h: 'Infosys · ' + I.units + ' shares',
            body: K.kv('Price', inr2(I.price) + ' · ' + I.priced, 'fkvw') + K.kv('Value', K.inrGbp(I.value_inr), 'fkvw') + K.kv('Account', I.account, 'fkvw') + K.kv('Owner', I.owner, 'fkvw'),
            acts: [K.cbtn('Undo', 'chip:undo', 'ghost', 'undo'), K.cbtn('Valuation', hk('infosys', 'valuation'), null, 'query_stats')] })], meta: 'draft_record · saved on Confirm' })];
      } },
    { id: 'p16-val', d: 'Mon 26 Oct', tm: '11:20', t: 'Infosys: valuation and earnings', viewer: 'arun', focus: 'page', page: function () { return hp('infosys', 'valuation'); }, draft: true,
      g: 'A share gets two cards a fund does not: its valuation against its sector and its earnings record. Fair, and consistent. The fundamentals source is not chosen yet (PLAN: decide then), so the figures are illustrative. Results on Thu 14 Jan hold its call for two sessions.',
      chat: function (ctx) {
        var N = NS(ctx), I = N && N.infosys;
        if (!I) return [];
        return [K.daysep('Today'), K.me('Is Infosys expensive?', '11:19'),
          K.ai('Fair, against Indian IT services: a little below the sector on every measure. Its results have been consistent: ' + I.earnings.beats + ' of the last ' + I.earnings.of + ' quarters beat the estimate. The fundamentals source is not chosen yet, so these figures are illustrative.', {
            cards: [K.ccard({ cls: 'pv5-forecast', chip: K.draft() + K.chip(VNAME[I.valuation.verdict], 'mp-hold'), h: 'Infosys · valuation', sub: 'against ' + I.valuation.sector_name,
              body: K.kv('P/E', I.valuation.metrics.pe.toFixed(1) + ' <span class="mp-ink2" style="font-weight:400">sector ' + I.valuation.sector.pe.toFixed(1) + '</span>', 'fkvw') + K.kv('Free cash flow yield', K.pct(I.valuation.metrics.fcf_yield, { dp: 1 }) + ' <span class="mp-ink2" style="font-weight:400">sector ' + K.pct(I.valuation.sector.fcf_yield, { dp: 1 }) + '</span>', 'fkvw') +
                K.kv('Earnings', VNAME[I.earnings.verdict] + ' · ' + I.earnings.beats + ' of ' + I.earnings.of, 'fkvw') + K.kv('Next results', I.earnings.next.day + ', expected', 'fkvw'),
              acts: [K.cbtn('Why?', 'chip:why', null, 'help')],
              fold: { t: 'Technical', open: ctx.has('vtech'), go: 'fold:vtech', body: ['valuation-snapshot · verdict ' + I.valuation.verdict + ' · mean against the sector ' + I.valuation.mean_rel.toFixed(2), 'earnings-analysis · verdict ' + I.earnings.verdict + ' · beats ' + I.earnings.beats + '/' + I.earnings.of + ' · revenue ' + sp(I.earnings.revenue_growth, 1), 'dataSources · price ' + I.sources.price + ' · fundamentals not chosen', 'generatedAt ' + I.generated].map(function (l) { return '<span>' + l + '</span>'; }).join('') } })],
            meta: 'From the engine · get_holding' })];
      },
      on: { 'fold:vtech': function (st) { st.open.vtech = !st.open.vtech; } } }
  ] });

  M.chapter({ key: 'p17', n: '17', order: 17, title: 'The Forecaster beside the rules engine', short: 'Forecaster', steps: [
    { id: 'p17-review', d: 'Sat 24 Oct', tm: '09:00', t: 'The Saturday review: the engines agree', viewer: 'arun', focus: 'chat', page: function () { return hp('nasdaq', 'forecast'); }, picked: PICK,
      g: 'The Forecaster is in practice, week 5 of 8: it shows only here and on each holding’s Forecast tab. On the NASDAQ 100 ETF both engines lean cautious. Open Technical for the Forecast row the card was read from.',
      chat: function (ctx) { return ['<div id="fc-rv-top"></div>', K.daysep('Sat 24 Oct'), K.ai(REVIEW_INTRO, { cards: [reviewCcard(ctx, 'nasdaq', { id: 'fc-rv-nasdaq' })], meta: 'Saturday review · ' + FC(ctx).review.when })]; }, scroll: { chat: 'fc-rv-top' },
      composer: { ph: 'Ask MyPaisa', chips: [['Why?', 'help', 'chip:why'], ['Track record', 'fact_check', 'chip:track']] },
      target: 'fold:tech', on: { 'fold:tech': function (st) { st.open.tech = !st.open.tech; } } },
    { id: 'p17-review2', d: 'Sat 24 Oct', tm: '09:00', t: 'Disagree, and no clear view', viewer: 'arun', focus: 'chat', page: function () { return hp('robotics', 'forecast'); }, picked: PICK, scroll: { chat: 'fc-rv-robotics' },
      g: 'When the engines disagree the card says so in words, not colour: the rules engine says HOLD on the Robotics ETF, the Forecaster sees a rougher month. On the Silver ETC its chances are too close to the usual to count: no clear view.',
      chat: function (ctx) { return [K.daysep('Sat 24 Oct'), K.ai(REVIEW_INTRO, { cards: [reviewCcard(ctx, 'nasdaq'), reviewCcard(ctx, 'robotics', { id: 'fc-rv-robotics' }), reviewCcard(ctx, 'silver')], meta: 'Saturday review · ' + FC(ctx).review.when })]; },
      composer: { ph: 'Ask MyPaisa', chips: [['Why?', 'help', 'chip:why'], ['Track record', 'fact_check', 'chip:track']] } },
    { id: 'p17-forecast', d: 'Mon 26 Oct', tm: '10:12', t: 'The NASDAQ 100 ETF’s Forecast, 1a', viewer: 'asha', focus: 'page', page: function () { return hp('nasdaq', 'forecast'); }, picked: PICK,
      g: 'The answer first, risk before direction: a fall over 5% (21%, usually 12%), the likely range, then the chance of being up. The rules engine’s call sits beside it, and the agreement is said in words. Then the candles, the fan and the marked patterns.',
      chat: function (ctx) { return chatForecast(ctx); }, composer: FC_COMPOSER },
    { id: 'p17-scroll', d: 'Mon 26 Oct', tm: '10:13', t: 'The patterns, the reasons, both track records', viewer: 'asha', focus: 'page', page: function () { return hp('nasdaq', 'forecast'); }, picked: PICK, scroll: { page: 'fc-patterns' },
      g: 'Only patterns with an edge on this ETF are shown: the double top and the support near −1% (a bearish engulfing on Tue 20 Oct has none, so it is never drawn). One row per model, then both track records side by side. Tap Similar days.',
      chat: function (ctx) { return chatForecast(ctx); }, composer: FC_COMPOSER, target: 'fc:row:nasdaq:similar' },
    { id: 'p17-sheet', d: 'Mon 26 Oct', tm: '10:14', t: 'A row’s sheet: similar days', viewer: 'asha', focus: 'page', page: function () { return hp('nasdaq', 'forecast'); }, draft: true, open: ['fcs_similar'], scroll: { page: 'fc-why' },
      g: 'Each row opens its sheet with the chart or table behind it (a draft: no pick covers the sheets). The 30 days since 2015 most like today, and what followed: 18 higher, the middle +1.8%. Try the other rows, then How it proves itself.',
      chat: function (ctx) { return chatForecast(ctx); }, composer: FC_COMPOSER,
      sheet: function (ctx) { var w = openSheet(ctx); return w ? rowSheet(ctx, 'nasdaq', w) : null; },
      target: 'nav:proof/nasdaq', on: sheetOn('nasdaq') },
    { id: 'p17-proof', d: 'Mon 26 Oct', tm: '10:16', t: 'How it proves itself', viewer: 'asha', focus: 'page', page: 'proof/nasdaq', picked: PICK,
      g: 'A lab first: the rules engine replayed over ten years against buy-and-hold and a trend rule. Then walk-forward tests, one fold missed. Then the live gate: 8 weeks beating both, graded each Friday. Tap Off in the switch-off.',
      chat: function (ctx) { return chatForecast(ctx); }, composer: FC_COMPOSER, target: 'fc:off' },
    { id: 'p17-off', d: 'Mon 26 Oct', tm: '10:17', t: 'The switch-off', viewer: 'asha', focus: 'page', page: 'proof/nasdaq', draft: true, scroll: { page: 'fc-switch' },
      g: 'It switches itself off after four weeks worse than the base rate, and the owner is told. The sheet draws how the Forecast tab would read then: a draft, a state, not today’s figures.',
      chat: function (ctx) { return chatForecast(ctx); }, composer: FC_COMPOSER,
      sheet: function (ctx) { return ctx.has('offx') ? null : offSheet(ctx); }, target: 'fc:done', on: { 'fc:off': function (st) { delete st.open.offx; } } },
    { id: 'p17-chat', d: 'Mon 26 Oct', tm: '10:20', t: 'The chat’s answer while it is in practice', viewer: 'asha', focus: 'chat', page: function () { return hp('nasdaq', 'forecast'); }, picked: PICK,
      g: 'In practice, the chat gives the rules engine’s call and points to the Forecast tab; the Forecaster’s own view never appears in a chat answer until its 8 live weeks are up.',
      chat: function (ctx) {
        return chatForecast(ctx, [K.me('Will it fall this month?', '10:20'),
          K.ai('No one can say that for sure. The rules engine says PAUSE · 64%, in shadow: keep what you have; delay new money until the next review. ' + IN_PRACTICE, { cards: [K.ccard({ cls: 'pv5-forecast', chip: K.stance('PAUSE', 64, { upper: true }) + K.inpractice('Forecaster in practice · week 5 of 8'), h: 'NASDAQ 100 ETF', sub: 'The rules engine’s call · Fri 23 Oct close',
            body: K.kv('Rules engine', 'PAUSE · 64% · in shadow', 'fkvw') + K.kv('The Forecaster', 'on the Forecast tab only, labelled in practice', 'fkvw'), acts: [K.cbtn('Forecast tab', hk('nasdaq', 'forecast'), 'primary', 'insights'), K.cbtn('Why?', 'chip:why', null, 'help')] })], meta: 'From the engine · get_stances' })]);
      },
      composer: { ph: 'Ask about this holding', chips: [['Why?', 'help', 'chip:why'], ['Track record', 'fact_check', 'chip:track']] } },
    { id: 'p17-fund', d: 'Mon 26 Oct', tm: '10:24', t: 'Balanced, a fund: line patterns only', viewer: 'arun', focus: 'page', page: function () { return hp('balanced', 'forecast'); }, picked: PICK,
      g: 'A fund prices once a day, a day late, so it has no candles: the same fan over its daily price line, and only line patterns on it, here higher lows since August. Both engines lean the same way: steady, HOLD.',
      chat: function () { return [K.daysep('Today'), K.me('How is Balanced looking?', '10:23'), K.ai('The rules engine says HOLD · 71%, in shadow: nothing to do. The Forecaster is still in practice on this fund, week 5 of 8, so its own view shows only on this holding’s Forecast tab and in Saturday’s review, labelled in practice, never in the chat. A view, not advice.', { meta: 'From the engine · get_stances' })]; },
      composer: FC_COMPOSER },
    { id: 'p17-priv', d: 'Mon 26 Oct', tm: '10:26', t: 'Privacy on: only the pounds hide', viewer: 'asha', focus: 'page', page: function () { return hp('nasdaq', 'forecast'); }, picked: PICK, target: 'priv',
      g: 'Turn Privacy on (the eye, or Privacy in the bar above). Only the value in pounds in the header hides: nothing else on this screen carries pounds, so the Forecast reads the same.',
      chat: function (ctx) { return chatForecast(ctx); }, composer: FC_COMPOSER },
    { id: 'p17-none', d: 'Mon 26 Oct', tm: '10:28', t: 'A holding with no Forecaster yet', viewer: 'arun', focus: 'page', page: function () { return hp('infosys', 'forecast'); }, draft: true,
      g: 'Infosys has no Forecaster view yet: the Forecaster needs ten years of its prices from a source for Indian markets, its exposure map and its own lab report first. Until then the tab says so, and nothing is guessed.',
      chat: function () { return [K.daysep('Today'), K.me('Does the Forecaster cover Infosys?', '10:28'), K.ai('Not yet. It needs ten years of Infosys’ daily prices, its exposure map and its own lab report before its first forecast, then 8 weeks in practice. Its Forecast tab says so.', { meta: 'From the registry · get_holding' })]; } },
    { id: 'p17-f7', d: 'Mon 26 Oct', tm: '10:30', t: 'F7: new money steered by risk', viewer: 'asha', focus: 'page', page: function () { return hp('nasdaq', 'forecast'); }, draft: true, open: ['f7'], scroll: { page: 'fc-f7' },
      g: 'Later (F7, a draft): new money leans away from a holding while its chance of a deep fall is above its usual, and contributions continue. It never sells, stays inside the ISA, and reaches the contribution’s check-in only once the Forecaster is live.',
      chat: function () { return [K.daysep('Today'), K.me('Should I keep putting money into this ETF?', '10:30'), K.ai('The rules engine says PAUSE · 64%, in shadow: keep what you have; delay new money until the next review. The Forecaster is still in practice on this ETF, week 5 of 8, so how it would steer new money shows only on its Forecast tab, as a draft. A view, not advice: MyPaisa cannot trade.', { meta: 'From the engine · get_stances' })]; },
      composer: FC_COMPOSER }
  ] });
  /* the Saturday review's Forecaster card, for the rules engine's review (phase 13, Sat 24 Oct): the Forecaster is in
     practice, so it shows here, labelled so (MA-281, §19.7); after its 8 weeks it has no figures yet in this set */
  M.reviewCards = M.reviewCards || {};
  M.reviewCards.forecaster = function (ctx, which) { return which === 6 ? reviewCcard(ctx, 'nasdaq') : ''; };
})();
