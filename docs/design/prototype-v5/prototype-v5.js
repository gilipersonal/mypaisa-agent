/* MyPaisa · Prototype v5 (MA-291): the controller. One journey of chapters (one per phase, 0 to 20), each a
   run of steps with its date and time; five doors (the web app at 1440 and at 390, the iPhone, the iPad in
   landscape with the chat beside, the foldable open); light and dark; privacy; Arun's or Asha's view.
   Chapter files register pages and chapters (MP5.page, MP5.chapter, MP5.holdingTab); this file draws the
   frames, the control bar and the ledger as of each step's time, and routes every click (data-go). */
(function () {
  'use strict';
  /* the board runtime may run its scripts twice: the controller is made once, so its state and its mount stay one */
  if (window.MP5 && window.MP5.__core) return;
  var K = window.MP5K;
  var MP5 = window.MP5 = window.MP5 || {};
  MP5.__core = true;
  MP5.K = K;
  MP5.chapters = MP5.chapters || [];
  MP5.pages = MP5.pages || {};
  MP5.tabsFor = MP5.tabsFor || {};
  /* the board runtime may run a script twice: a chapter registered again under its key replaces the first */
  MP5.chapter = function (def) {
    for (var i = 0; i < MP5.chapters.length; i++) if (MP5.chapters[i].key === def.key) { MP5.chapters[i] = def; return; }
    MP5.chapters.push(def);
  };
  MP5.page = function (id, fn) { MP5.pages[id] = fn; };
  /* a holding page's tabs are drawn by more than one chapter file: Overview and Track record (phases 10 to 15),
     Forecast (phase 17); holdingTab(id, {t: 'Forecast', order, draw(ctx, holdingId)}) */
  MP5.holdingTab = function (id, def) { MP5.tabsFor[id] = def; };

  var DOORS = [
    { id: 'desk', t: 'Desktop', w: 1440, h: 900, web: true, wide: true },
    { id: 'pweb', t: 'Phone web', w: 390, h: 844, web: true, compact: true },
    { id: 'ios', t: 'iPhone', w: 402, h: 874, app: true, compact: true },
    { id: 'ipad', t: 'iPad', w: 1180, h: 820, app: true, wide: true },
    { id: 'fold', t: 'Foldable', w: 880, h: 1036, app: true, narrow: true }
  ];
  MP5.DOORS = DOORS;
  function door(id) { for (var i = 0; i < DOORS.length; i++) if (DOORS[i].id === id) return DOORS[i]; return DOORS[0]; }

  /* the web app's navigation, and the app's (shell 1a: Chat · Home · Activity · You, and the search circle) */
  var NAV = [
    { sec: 'Money', items: [['home', 'Home', 'home'], ['assets', 'Assets', 'account_balance_wallet'], ['debts', 'Debts', 'credit_card'], ['budget', 'Budget', 'pie_chart'], ['projection', 'Projection', 'show_chart'], ['plans', 'Plans', 'event_note']] },
    { sec: 'Investing', items: [['holdings', 'Holdings', 'candlestick_chart'], ['overlap', 'Overlap', 'join'], ['track', 'Track record', 'fact_check'], ['news', 'News and events', 'newspaper']] },
    { sec: 'Household', items: [['activity', 'Activity', 'history'], ['audit', 'Audit', 'receipt_long'], ['files', 'Files', 'folder'], ['you', 'You', 'person']] },
    { sec: 'Admin', admin: true, items: [['admin', 'Admin center', 'admin_panel_settings'], ['team', 'Agent team', 'groups']] }
  ];
  var APP_TABS = [['chat', 'Chat', 'chat_bubble'], ['home', 'Home', 'home'], ['activity', 'Activity', 'history'], ['you', 'You', 'person']];
  var WEB_TABS = APP_TABS;
  MP5.NAV = NAV;

  /* ---------- the clock ---------- */
  var MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  /* 'Mon 26 Oct' + '09:41' → '2026-10-26T09:41'; the boards are set in October 2026, so a month from Jan to Sep is 2027 */
  function iso(d, tm) {
    var m = /(\d{1,2}) (\w{3})(?: (\d{4}))?/.exec(d || 'Mon 26 Oct');
    var mo = MON[m[2]], yr = m[3] ? +m[3] : (mo >= 10 ? 2026 : 2027);
    return yr + '-' + String(mo).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0') + 'T' + (tm || '09:00');
  }
  MP5.iso = iso;

  /* the household's ledger as of a time (lessons 13 and 19): every page draws its figures from this */
  function world(t) {
    var D = window.MP5D || {}, h = D.household || {};
    var W = { t: t, D: D };
    var T = h.totals_before_new_record;
    W.monzoSavings = t >= '2026-10-26T09:41';
    if (W.monzoSavings) T = h.totals_after_new_record;
    W.homeCorrected = t >= '2026-10-26T09:52';
    if (W.homeCorrected) T = h.totals_after_correction;
    W.octClosed = t >= '2026-11-01T08:44';
    if (W.octClosed) T = h.totals_after_statement_sun_1_nov;
    W.hdfcNovPaid = t >= '2026-11-05T09:12';
    if (W.hdfcNovPaid) T = h.totals_after_hdfc_emi_thu_5_nov;
    W.T = T || {};
    W.homeValue = W.homeCorrected ? 428000 : 415000;
    W.pricesAt = 'Fri 23 Oct close';
    /* a record's value as of the time (W.value(id)): the registry's, and from Sat 7 Nov the investments at the
       Fri 6 Nov close (engine-v5.json's fri_6_nov, phase 15), carried into every total so they still add up */
    var vals = {};
    (h.assets || []).forEach(function (a) { vals[a.id] = a.value; });
    vals.home = W.homeValue;
    if (W.monzoSavings && h.new_record_in_prototype) vals[h.new_record_in_prototype.id] = h.new_record_in_prototype.value;
    var E = D.engine;
    if (E && E.fri_6_nov && t >= '2026-11-07T00:00') {
      var by = E.fri_6_nov.by, ch = 0, mem = {};
      Object.keys(by).forEach(function (id) {
        var a = (h.assets || []).filter(function (x) { return x.id === id; })[0];
        if (!a) return;
        var d = by[id].value - a.value;
        ch += d; vals[id] = by[id].value;
        a.owners.forEach(function (o) { mem[o[0]] = (mem[o[0]] || 0) + d * o[1] / 100; });
      });
      var T2 = JSON.parse(JSON.stringify(W.T));
      T2.own_gbp += ch; T2.net_gbp += ch; T2.liquid_gbp += ch; T2.net_inr = Math.round(T2.net_gbp * 112.5);
      if (T2.by_country_gbp) T2.by_country_gbp.UK += ch;
      if (T2.by_member_gbp) Object.keys(mem).forEach(function (m) { T2.by_member_gbp[m] = Math.round(T2.by_member_gbp[m] + mem[m]); });
      W.T = T2;
      W.pricesAt = 'Fri 6 Nov close';
    }
    /* before Friday's close (the funds' prices land that evening), the investments are at the Thu 22 Oct close:
       Friday's own move (engine-v5.json's day) taken back out of every total */
    if (E && E.day && t < '2026-10-23T21:00') {
      var dby = E.day.by, dch = 0, dmem = {};
      Object.keys(dby).forEach(function (id) {
        var a = (h.assets || []).filter(function (x) { return x.id === id; })[0];
        if (!a || dby[id].gbp_exact == null) return;
        var d = -dby[id].gbp_exact;
        dch += d; vals[id] = Math.round(a.value + d);
        a.owners.forEach(function (o) { dmem[o[0]] = (dmem[o[0]] || 0) + d * o[1] / 100; });
      });
      var T3 = JSON.parse(JSON.stringify(W.T));
      T3.own_gbp = Math.round(T3.own_gbp + dch); T3.net_gbp = Math.round(T3.net_gbp + dch); T3.liquid_gbp = Math.round(T3.liquid_gbp + dch); T3.net_inr = Math.round(T3.net_gbp * 112.5);
      if (T3.by_country_gbp) T3.by_country_gbp.UK = Math.round(T3.by_country_gbp.UK + dch);
      if (T3.by_member_gbp) Object.keys(dmem).forEach(function (m) { T3.by_member_gbp[m] = Math.round(T3.by_member_gbp[m] + dmem[m]); });
      W.T = T3;
      W.pricesAt = 'Thu 22 Oct close';
    }
    W.value = function (id) { return vals[id]; };
    return W;
  }
  MP5.world = world;

  /* ---------- state ---------- */
  var st = { door: 'desk', dark: false, priv: false, viewer: 'arun', ci: 0, si: 0, view: null, pane: null, hist: [], open: {}, seen: {}, toast: null, sheet: null };
  MP5.state = function () { return st; };
  function load() { try { var s = JSON.parse(localStorage.getItem('mp5') || '{}'); ['door', 'dark'].forEach(function (k) { if (s[k] != null) st[k] = s[k]; }); if (!door(st.door) || door(st.door).id !== st.door) st.door = 'desk'; } catch (e) { } }
  function save() { try { localStorage.setItem('mp5', JSON.stringify({ door: st.door, dark: st.dark })); } catch (e) { } }

  function chapters() { return MP5.chapters.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function cur() { var cs = chapters(); var ch = cs[st.ci] || cs[0]; return { cs: cs, ch: ch, step: ch ? ch.steps[Math.min(st.si, ch.steps.length - 1)] : null }; }
  MP5.allSteps = function () { var out = []; chapters().forEach(function (c, ci) { c.steps.forEach(function (s, si) { out.push({ ci: ci, si: si, ch: c.key, id: s.id }); }); }); return out; };

  function ctxFor(ch, step) {
    var d = door(st.door);
    var t = iso(step && step.d, step && step.tm);
    var ctx = {
      door: d.id, web: !!d.web, app: !!d.app, compact: !!d.compact, wide: !!d.wide, narrow: !!d.narrow,
      dark: st.dark, priv: st.priv, viewer: st.viewer, isAdmin: st.viewer === 'arun', who: st.viewer === 'arun' ? 'Arun' : 'Asha',
      t: t, d: step ? step.d : '', tm: step ? step.tm : '', step: step, ch: ch, W: world(t), D: window.MP5D || {}, K: K,
      open: st.open, view: st.view, MP5: MP5
    };
    ctx.has = function (k) { return !!st.open[k]; };
    return ctx;
  }
  MP5.ctx = function () { var c = cur(); return ctxFor(c.ch, c.step); };

  /* ---------- pages ---------- */
  function pageId(ctx) { return st.view || (ctx.step && (typeof ctx.step.page === 'function' ? ctx.step.page(ctx) : ctx.step.page)) || 'home'; }
  function drawPage(ctx, id) {
    var parts = String(id).split('/'), fn = MP5.pages[parts[0]];
    var p;
    try { p = fn ? fn(ctx, parts.slice(1)) : null; } catch (e) { console.error('[pv5] page ' + id, e); p = { title: 'This page failed to draw', body: K.note('error', K.esc(String(e && e.message || e))) }; }
    if (!p) p = { title: 'Not drawn yet', body: K.card({ body: K.note('construction', 'The page “' + K.esc(parts[0]) + '” is not in the prototype yet.') }) };
    p.id = id; p.key = parts[0];
    return p;
  }
  function pageHead(ctx, p) {
    var back = p.back ? '<button type="button" class="btn-reset pg-back"' + K.go(p.back.go || 'back') + '>' + K.ms('chevron_left') + '<span>' + (p.back.t || 'Back') + '</span></button>' : '';
    var chips = (p.chip || '') + (ctx.step && ctx.step.draft && !p.picked ? '' : '');
    return '<header class="pg-h">' + back + '<div class="pg-row"><div class="fx col g4 f1"><h1 class="pg-title" style="margin:0">' + (p.title || '') + '</h1>' +
      (p.sub ? '<span class="pg-sub">' + p.sub + '</span>' : '') + '</div><div class="fx ac g8 wrap">' + chips + (p.right || '') + '</div></div>' +
      (p.tabs ? K.tabs(p.tabs) : '') + '</header>';
  }

  /* ---------- the chat ---------- */
  function drawChat(ctx) {
    var s = ctx.step, msgs = [];
    try { msgs = s && s.chat ? s.chat(ctx) : []; } catch (e) { console.error('[pv5] chat ' + (s && s.id), e); msgs = [K.ai(K.note('error', K.esc(String(e && e.message || e))))]; }
    if (!msgs || !msgs.length) msgs = [K.ai('Ask or tell MyPaisa anything about the household’s money.')];
    return '<div class="chat">' + msgs.join('') + '</div>';
  }
  function composer(ctx, cls) {
    var c = (ctx.step && ctx.step.composer) || {};
    var chips = c.chips || [['Add something', 'add', 'chip:add'], ['What changed?', 'history', 'chip:changed'], ['Why?', 'help', 'chip:why']];
    var sug = c.sug ? '<button type="button" class="gchip lg"' + K.go(c.sug[1]) + '>' + K.ms('north_east') + '<span>' + c.sug[0] + '</span></button>' : '';
    var typed = c.typed ? '<span class="txt">' + c.typed + '</span>' : '<span class="ph">' + (c.ph || 'Ask or tell MyPaisa…') + '</span>';
    var files = c.files ? '<span class="txt fx ac g6">' + c.files.map(function (f) { return K.ms('picture_as_pdf') + K.esc(f); }).join(' ') + '</span>' : '';
    return '<div class="' + cls + '"><div class="chips">' + sug + chips.map(function (x) { return '<button type="button" class="gchip lg"' + K.go(x[2]) + '>' + K.ms(x[1]) + '<span>' + x[0] + '</span></button>'; }).join('') + '</div>' +
      '<div class="cbar"><button type="button" class="cplus lg" aria-label="Attach a file"' + K.go(c.plus || 'plus') + '>' + K.ms('add') + '</button><div class="cfield lg">' + (files || typed) +
      '<button type="button" class="csend' + (c.typed || c.files ? ' lg-tint' : '') + '" aria-label="Send"' + K.go(c.send || 'send') + '>' + K.ms('arrow_upward') + '</button></div></div></div>';
  }
  function strip(ctx) {
    var T = ctx.W.T || {};
    return '<button type="button" class="strip lg"' + K.go('nav:home') + '><div class="ai-mark z1"><i></i></div><div class="fx col f1 z1"><span class="mp-foot mp-ink2">Household net worth</span>' +
      '<span class="strip-n mp-num">' + K.gbp(T.net_gbp || 0) + '</span></div><span class="mp-foot mp-ink2 z1">' + ctx.W.pricesAt + '</span></button>';
  }

  /* ---------- the frames ---------- */
  function sideWeb(ctx, active) {
    var h = '<nav class="w-side" aria-label="MyPaisa"><div class="w-brand"><div class="ai-mark"><i></i></div><span>MyPaisa</span></div>';
    NAV.forEach(function (g) {
      if (g.admin && !ctx.isAdmin) return;
      h += '<div class="w-sec">' + g.sec + '</div>';
      g.items.forEach(function (i) { h += '<button type="button" class="mp-side-i' + (active === i[0] ? ' on' : '') + '"' + K.go('nav:' + i[0]) + '>' + K.ms(i[2]) + '<span>' + i[1] + '</span></button>'; });
    });
    return h + '</nav>';
  }
  function sideApp(ctx, active) {
    var h = '<nav class="sidebar lg" aria-label="MyPaisa"><div class="side-h">MyPaisa</div>';
    h += '<button type="button" class="side-i"' + K.go('nav:search') + '>' + K.ms('search') + '<span>Search</span></button>';
    NAV.forEach(function (g) {
      if (g.admin && !ctx.isAdmin) return;
      h += '<div class="side-h">' + g.sec + '</div>';
      g.items.forEach(function (i) { h += '<button type="button" class="side-i' + (active === i[0] ? ' on' : '') + '"' + K.go('nav:' + i[0]) + '>' + K.ms(i[2]) + '<span>' + i[1] + '</span></button>'; });
    });
    return h + '</nav>';
  }
  function themeCls() { return 'mp' + (st.dark ? ' t-dark' : ' t-light') + (st.priv ? ' privon' : ''); }
  function overlays(ctx) {
    var h = '';
    var sheet = ctx.step && ctx.step.sheet ? ctx.step.sheet(ctx) : null;
    if (sheet) h += '<div class="dim"' + K.go(ctx.step.sheetClose || null) + '></div><div class="sheet lg">' + '<div class="sheet-grab"></div>' + sheet + '</div>';
    if (st.toast) h += '<div class="mp-toast" style="position:absolute;left:50%;bottom:120px;transform:translateX(-50%);z-index:60;max-width:80%">' + st.toast + '</div>';
    return h;
  }
  /* One web frame and one app frame, each laid out by its own width with container queries (prototype-v5.css),
     as the size classes say: the chat beside every screen from about 1133, a sheet away from about 600 to 1133,
     and a tab in a compact window. The doors only set the size and the device's chrome, so a door resized by the
     board gate keeps working at every width its class covers (lesson 24). */
  function system(ctx) { return ctx.step && ctx.step.system ? ctx.step.system(ctx) : null; }
  /* which tab a page belongs to on the doors with a tab bar (shell 1a: Chat · Home · Activity · You) */
  var TAB_OF = { activity: 'activity', run: 'activity', audit: 'activity', files: 'activity', file: 'activity',
    you: 'you', notifications: 'you', admin: 'you', team: 'you', search: '' };
  function tabOn(t, pane, p) { if (pane === 'chat') return t === 'chat'; var o = TAB_OF[p.key]; return t === (o == null ? 'home' : o); }
  function frameWeb(ctx, p, pane, d) {
    var tabs = '<div class="w-tabs"><nav class="mp-tabbar">' + WEB_TABS.map(function (t) {
      return '<button type="button" class="mp-tab' + (tabOn(t[0], pane, p) ? ' on' : '') + '"' + K.go('tab:' + t[0]) + '>' + K.ms(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('') + '</nav></div>';
    var chat = '<aside class="w-chat" aria-label="The chat"><div class="w-chat-h"><div class="ai-mark"><i></i></div><span class="f1">The chat</span><span class="mp-foot mp-ink2 w-who">' + ctx.who + '’s conversation</span>' +
      '<button type="button" class="gbtn w-close" aria-label="Close the chat"' + K.go('tab:' + p.key) + '>' + K.ms('close') + '</button></div>' +
      '<div class="w-scroll pscroll" data-scroll="chat">' + drawChat(ctx) + '</div>' + composer(ctx, 'w-comp') + '</aside>';
    var body = '<div class="bw-body">' + sideWeb(ctx, p.key) + '<main class="w-main pscroll" data-scroll="page"><div class="w-page">' + pageHead(ctx, p) + p.body + '</div></main>' +
      chat + '<button type="button" class="w-ask mp-btn mp-btn-primary"' + K.go('tab:chat') + '>' + K.ms('chat_bubble') + '<span>Ask</span></button>' + tabs + overlays(ctx) + '</div>';
    var url = 'dashboard.mypaisapp.com' + (p.key === 'home' ? '' : '/' + K.esc(p.id));
    return '<div class="bw wf ' + (d.id === 'pweb' ? 'ph-web ' : '') + 'pane-' + pane + ' ' + themeCls() + '"><div class="bw-bar">' + (d.id === 'pweb' ? '' : '<span class="bw-dots"><i></i><i></i><i></i></span>') +
      '<span class="bw-url">' + K.ms('lock') + url + '</span></div>' + body + '</div>';
  }
  function frameApp(ctx, p, pane, d) {
    var sys = system(ctx);
    var tm = ctx.tm ? ctx.tm.replace(/^0/, '') : '9:41';
    var sbar = '<div class="sbar"><span>' + tm + '</span><span class="sbar-ic">' + (d.id === 'ios' ? '<span class="ms">signal_cellular_alt</span>' : '') + '<span class="ms">wifi</span><span class="ms">battery_horiz_075</span></span></div>';
    var devCls = { ios: 'dev-iphone', ipad: 'dev-ipad-l ipad', fold: 'dev-fold-open ipad' }[d.id];
    var inner;
    if (sys) inner = '<div class="ap-sys">' + sys + '</div>';
    else {
      var nav = '<div class="ip-nav">' + (p.back ? '<button type="button" class="gbtn lg" aria-label="Back"' + K.go(p.back.go || 'back') + '><span class="ms z1">chevron_left</span></button>' : '') + '<span class="f1"></span>' +
        '<span class="ggroup lg"><button type="button" class="gbtn" aria-label="Privacy mode"' + K.go('priv') + '><span class="ms z1">' + (st.priv ? 'visibility_off' : 'visibility') + '</span></button>' +
        '<button type="button" class="gbtn ap-srch" aria-label="Search"' + K.go('nav:search') + '><span class="ms z1">search</span></button></span></div>';
      var main = '<div class="ip-main">' + nav + '<div class="pscroll" data-scroll="page"><div class="pcontent">' + pageHead(ctx, Object.assign({}, p, { back: null })) + p.body + '</div></div><div class="edge-bot ap-edge"></div></div>';
      var chat = '<aside class="ip-chat" aria-label="The chat">' + strip(ctx) + '<button type="button" class="gbtn lg ap-close" aria-label="Close the chat"' + K.go('tab:' + p.key) + '><span class="ms z1">close</span></button>' +
        '<div class="pscroll" data-scroll="chat"><div class="pchatpad">' + drawChat(ctx) + '</div></div><div class="edge-bot ap-edge"></div>' + composer(ctx, 'composer') + '</aside>';
      var tabs = APP_TABS.map(function (t) { return '<button type="button" class="tab' + (tabOn(t[0], pane, p) ? ' on' : '') + '"' + K.go('tab:' + t[0]) + '><span class="ms z1">' + t[2] + '</span><span class="z1">' + t[1] + '</span></button>'; }).join('');
      inner = '<div class="ap-row">' + sideApp(ctx, p.key) + main + chat + '</div>' +
        '<div class="ap-top lg">' + tabs + '</div>' +
        '<div class="tabdock ap-dock"><div class="tabs lg">' + tabs + '</div><button type="button" class="tabsearch lg" aria-label="Search"' + K.go('nav:search') + '><span class="ms z1">search</span></button></div>' +
        '<button type="button" class="gtext lg-tint ap-ask"' + K.go('tab:chat') + '><span class="ms z1">chat_bubble</span><span class="z1">Ask</span></button>';
    }
    return '<div class="dev af ' + devCls + ' pane-' + pane + ' ' + themeCls() + '">' + (d.id === 'ios' ? '<div class="island"></div>' : '') + sbar + inner + overlays(ctx) + (d.id === 'ios' ? '<div class="homebar"></div>' : '') + '</div>';
  }

  /* ---------- the control bar ---------- */
  function topBar(c, ctx) {
    var h = '<header class="ptop"><div class="prow"><span class="pname"><span class="pkey">MA-291</span>MyPaisa · Prototype v5</span>';
    h += '<span class="pgrp"><span class="plbl">Door</span><span class="pseg" role="group" aria-label="Door">' + DOORS.map(function (d) { return '<button type="button" class="' + (d.id === st.door ? 'on' : '') + '" data-go="door:' + d.id + '">' + d.t + '</button>'; }).join('') + '</span></span>';
    h += '<span class="pgrp"><span class="plbl">Theme</span><span class="pseg" role="group" aria-label="Theme"><button type="button" class="' + (!st.dark ? 'on' : '') + '" data-go="theme:light">Light</button><button type="button" class="' + (st.dark ? 'on' : '') + '" data-go="theme:dark">Dark</button></span></span>';
    h += '<button type="button" class="pbtn' + (st.priv ? ' on' : '') + '" aria-pressed="' + st.priv + '" data-go="priv"><span class="ms">' + (st.priv ? 'visibility_off' : 'visibility') + '</span>Privacy</button>';
    h += '<span class="pgrp"><span class="plbl">Viewer</span><span class="pseg" role="group" aria-label="Viewer"><button type="button" class="' + (st.viewer === 'arun' ? 'on' : '') + '" data-go="viewer:arun">Arun</button><button type="button" class="' + (st.viewer === 'asha' ? 'on' : '') + '" data-go="viewer:asha">Asha</button></span></span>';
    h += '<span class="pf1"></span><button type="button" class="pbtn" data-go="restart"><span class="ms">restart_alt</span>Restart</button></div>';
    h += '<nav class="pchaps" aria-label="Phases">' + c.cs.map(function (ch, i) { return '<button type="button" class="pch' + (i === st.ci ? ' on' : st.seen[ch.key] ? ' seen' : '') + '" data-go="ch:' + i + '" title="' + K.esc(ch.title) + '"><b>' + K.esc(ch.n) + '</b>' + K.esc(ch.short || ch.title) + '</button>'; }).join('') + '</nav>';
    var steps = c.ch ? c.ch.steps : [];
    h += '<nav class="psteps" aria-label="Steps">' + steps.map(function (s, i) { return '<button type="button" class="pst' + (i === st.si ? ' on' : i < st.si ? ' done' : '') + '" aria-current="' + (i === st.si) + '" data-go="st:' + i + '"><b>' + (i + 1) + '</b>' + K.esc(s.t) + '</button>'; }).join('') + '</nav>';
    var s = c.step || {};
    var last = st.ci === c.cs.length - 1 && st.si === steps.length - 1;
    h += '<div class="pguide" aria-live="polite"><span class="pgd">' + K.esc((s.d || '') + (s.tm ? ' · ' + s.tm : '')) + '</span>' + (c.ch ? '<span class="pgt">' + K.esc(c.ch.title) + '</span>' : '') +
      (s.draft ? '<span class="pdraft">Draft, not picked</span>' : s.picked ? '<span class="ppicked">' + K.esc(s.picked) + '</span>' : '') +
      '<span class="pgh">' + (s.g || '') + '</span>' +
      '<button type="button" class="pbtn" data-go="prev"' + (st.ci === 0 && st.si === 0 ? ' disabled' : '') + '><span class="ms">arrow_back</span>Back</button>' +
      '<button type="button" class="pbtn go" data-go="next"' + (last ? ' disabled' : '') + '>' + K.esc(s.nextT || (st.si === steps.length - 1 ? 'Next phase' : 'Next')) + '<span class="ms">arrow_forward</span></button></div></header>';
    return h;
  }

  /* ---------- render ---------- */
  var root = null, lastKey = null;
  function render() {
    if (!root) return;
    var c = cur(), ctx = ctxFor(c.ch, c.step), d = door(st.door);
    if (!c.ch) { root.innerHTML = '<div class="pv5"><div class="pstage">Loading…</div></div>'; return; }
    var pid = pageId(ctx), p = drawPage(ctx, pid);
    var focus = st.pane || (c.step && c.step.focus) || (c.step && c.step.page ? 'page' : 'chat');
    var frame = (d.web ? frameWeb : frameApp)(ctx, p, focus, d);
    var key = st.ci + ':' + st.si + ':' + st.door + ':' + pid + ':' + focus;
    var keep = {};
    if (key === lastKey) root.querySelectorAll('.pscroll[data-scroll]').forEach(function (e) { keep[e.getAttribute('data-scroll')] = e.scrollTop; });
    root.innerHTML = '<div class="pv5">' + topBar(c, ctx) + '<main class="pstage"><div class="pwrap"><div class="pframe" data-screen-label="' + K.esc(d.t + ' · ' + c.ch.title + ' · ' + (c.step ? c.step.t : '')) + '">' + frame + '</div></div></main></div>';
    var tgt = c.step && c.step.target;
    if (tgt) root.querySelectorAll('.pframe [data-go]').forEach(function (e) { if (e.getAttribute('data-go') === tgt && !e.classList.contains('dim')) e.classList.add('pnext'); });
    fit(d);
    var same = key === lastKey;
    lastKey = key;
    root.querySelectorAll('.pscroll[data-scroll]').forEach(function (e) {
      var k = e.getAttribute('data-scroll');
      if (same && keep[k] != null) { e.scrollTop = keep[k]; return; }
      var anchor = c.step && c.step.scroll && c.step.scroll[k];
      if (anchor) { var a = e.querySelector('#' + anchor); if (a) { e.scrollTop = Math.max(0, a.offsetTop - 120); return; } }
      if (k === 'chat') e.scrollTop = e.scrollHeight;
    });
  }
  MP5.render = render;
  function fit(d) {
    var wrap = root.querySelector('.pwrap'), fr = root.querySelector('.pframe'), top = root.querySelector('.ptop');
    if (!wrap || !fr) return;
    var m = d.app ? 22 : 14;   /* room for the device's band, drawn outside the frame */
    var aw = Math.max(320, window.innerWidth - 32), ah = Math.max(420, window.innerHeight - (top ? top.offsetHeight : 150) - 60);
    var sc = Math.min(1, aw / (d.w + 2 * m), ah / (d.h + 2 * m));
    wrap.style.width = Math.round((d.w + 2 * m) * sc) + 'px'; wrap.style.height = Math.round((d.h + 2 * m) * sc) + 'px';
    fr.style.width = d.w + 'px'; fr.style.height = d.h + 'px';
    fr.style.left = Math.round(m * sc) + 'px'; fr.style.top = Math.round(m * sc) + 'px';
    fr.style.transform = 'scale(' + sc + ')';
  }

  /* ---------- actions ---------- */
  function goStep(ci, si) {
    var cs = chapters();
    ci = Math.max(0, Math.min(cs.length - 1, ci));
    si = Math.max(0, Math.min(cs[ci].steps.length - 1, si));
    if (cs[st.ci]) st.seen[cs[st.ci].key] = true;
    st.ci = ci; st.si = si; st.view = null; st.pane = null; st.hist = []; st.toast = null; st.open = {};
    var s = cs[ci].steps[si];
    st.viewer = (s && s.viewer) || cs[ci].viewer || 'arun';
    if (s && s.open) s.open.forEach(function (k) { st.open[k] = true; });
  }
  function next() { var c = cur(); if (st.si < c.ch.steps.length - 1) goStep(st.ci, st.si + 1); else if (st.ci < c.cs.length - 1) goStep(st.ci + 1, 0); }
  function prev() { var c = cur(); if (st.si > 0) goStep(st.ci, st.si - 1); else if (st.ci > 0) goStep(st.ci - 1, c.cs[st.ci - 1].steps.length - 1); }
  var toastT = null;
  function toast(t) { st.toast = t; clearTimeout(toastT); toastT = setTimeout(function () { st.toast = null; render(); }, 2600); }
  MP5.toast = function (t) { toast(t); render(); };
  function act(key) {
    var c = cur(), s = c.step || {};
    if (!key) return;
    if (key.indexOf('door:') === 0) { st.door = key.slice(5); st.pane = null; save(); }
    else if (key === 'theme:dark' || key === 'theme:light') { st.dark = key === 'theme:dark'; save(); }
    else if (key === 'priv') st.priv = !st.priv;
    else if (key.indexOf('viewer:') === 0) st.viewer = key.slice(7);
    else if (key.indexOf('ch:') === 0) goStep(+key.slice(3), 0);
    else if (key.indexOf('st:') === 0) goStep(st.ci, +key.slice(3));
    else if (key === 'next') next();
    else if (key === 'prev') prev();
    else if (key === 'restart') { st.seen = {}; st.viewer = 'arun'; st.priv = false; goStep(0, 0); }
    else if (s.on && s.on[key] != null) {
      var h = s.on[key];
      if (typeof h === 'function') h(st, MP5); else return act(h);
    }
    else if (key === s.target) next();
    else if (key.indexOf('nav:') === 0 || key.indexOf('tab:') === 0) {
      var id = key.slice(4);
      if (id === 'chat') st.pane = 'chat';
      else { if (st.view || (s.page && pageId(ctxFor(c.ch, s)) !== id)) st.hist.push(st.view || pageId(ctxFor(c.ch, s))); st.view = id; st.pane = 'page'; }
    }
    else if (key === 'back') { st.view = st.hist.length ? st.hist.pop() : null; if (st.view === null && s.page) st.view = null; st.pane = 'page'; }
    else if (key.indexOf('fold:') === 0) { var f = key.slice(5); st.open[f] = !st.open[f]; }
    else if (key.indexOf('open:') === 0) { st.open[key.slice(5)] = true; }
    else toast('Not part of this walk-through. Follow the ring, or press Next.');
    render();
  }
  MP5.act = act;
  MP5.go = function (ci, si) { goStep(ci, si); render(); };

  MP5.mount = function (el) {
    if (root === el) return;
    root = el;
    load();
    var q = /[?&]at=([\w-]+)/.exec(location.search);
    if (q) { var all = MP5.allSteps(); for (var i = 0; i < all.length; i++) if (all[i].id === q[1]) { st.ci = all[i].ci; st.si = all[i].si; } }
    root.addEventListener('click', function (e) { var t = e.target.closest('[data-go]'); if (t && root.contains(t)) { e.preventDefault(); act(t.getAttribute('data-go')); } });
    var rt = null;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { fit(door(st.door)); }, 60); });
    goStep(st.ci, st.si);
    render();
  };
})();
