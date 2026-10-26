/* MyPaisa · Prototype v4 (MA-193): the pages beside the chat, as the v4 boards draw them, at the clock of each step.
   Figures are the v4 figure set's; a derived one says how in a comment beside it. */
(function () {
  'use strict';
  var M = window.MP4, gbp = M.gbp, inr = M.inr, pct = M.pct, FX = M.FX;
  var D1 = 'Mon 26 Oct', D2 = 'Sun 1 Nov', D3 = 'Thu 5 Nov';
  var PARTS = ['isKv', 'isP', 'isNote', 'isBar', 'isRow', 'isGrid', 'isDue', 'isChart', 'isBig', 'isEdit', 'isOk', 'isBud', 'isBudHead', 'isRun', 'isRunHead', 'isStep', 'isCall', 'isTool', 'isPill', 'isAsmEdit', 'isSec', 'isBtn', 'isMeter', 'isTags', 'isStack', 'isLock', 'isLink'];
  function norm(p) { var o = {}; PARTS.forEach(function (k) { o[k] = false; }); return Object.assign(o, p); }
  function card(title, right, parts, o) { return Object.assign({ isCard: true, isHero: false, isChips: false, isFoot: false, hasHead: !!title, title: title, right: right || '', cls: '', parts: parts.map(norm) }, o || {}); }
  function hero(o) { return Object.assign({ isHero: true, isCard: false, isChips: false, isFoot: false, over: '', right: '', hasRight: false, rightUp: false, big: '', hasUnit: false, unit: '', hasDelta: false, deltaUp: '', deltaT: '', hasSub: false, sub: '', hasRate: false, rate: '', hasLive: false, live: '', hasStats: false, stats: [], hasChart: false, ch: null, hasSeg: false, seg: [], hasWhose: false, whose: [], hasAnn: false, annL: '0%' }, o); }
  function kv(k, v, money) { return { isKv: true, k: k, v: v, vcls: money ? 'mny' : '' }; }
  function p(t, cls) { return { isP: true, t: t, cls: cls || '' }; }
  function bar(name, v, w, sub, fill) { return { isBar: true, name: name, v: v, w: w, sub: sub, fill: fill || 'f-blue' }; }
  function row(o) { return Object.assign({ isRow: true, lead: '', hasLead: false, icon: '', hasIcon: false, name: '', sub: '', hasSub: false, sub2: '', hasSub2: false, tags: [], hasTags: false, v: '', v2: '', hasV2: false, go: null, cls: '', chev: false }, o, { hasLead: !!o.lead, hasIcon: !!o.icon, hasSub: !!o.sub, hasSub2: !!o.sub2, hasTags: !!(o.tags && o.tags.length), hasV2: !!o.v2 }); }
  function tag(t, cls, icon) { return { t: t, cls: cls || 'mp-neutral', icon: icon || '', hasIcon: !!icon }; }
  function seg(items, on, T, A, key) { return items.map(function (x, i) { return { t: x, cls: (i === on ? 'on' : ''), go: A(key || 'x') }; }); }

  function page(st, w, api, T, mp, nw) {
    var A = api.act, priv = !!st.priv, door = st.door, web = door !== 'ios', b = w.b, date = b.d;
    PRIV = priv;
    var id = st.v.page;
    var asha = w.asha;
    var eye = { hasEye: true, eyeIcon: priv ? 'visibility_off' : 'visibility', eyeGo: A('priv') };
    var noCtl = { hasWhose: false, whose: [], hasCcy: false, ccy: [], hasMonth: false, month: [], hasEye: false, eyeIcon: '', eyeGo: null, hasTm: false };
    var pg = { id: id, title: '', sub: '', hasCrumb: false, crumb: '', crumbGo: A('pback'), hasHeadChip: false, headChip: '', ctrls: Object.assign({}, noCtl), cols: [], foot: 'Illustrative figures. Figures from the engine and the price registry.', isIos: !web };
    var F;
    /* the household's totals at this step (the figure set's; after the Thu 5 Nov EMI, derived) */
    var ph = w.at('s7b') ? 'e' : w.at('s6g') ? 'd' : w.at('s4e') ? 'c' : w.at('s2f') ? 'a' : 'b';
    F = {
      b: { own: 686694, owe: 246743, uk: 333468, ind: 106483, ar: 245868, as: 194083, liq: 32596, fix: 23670, lock: 630428, n: 16, nUK: 9, nLiq: 8, indInr: '₹1,19,79,306', home: 415000 },
      a: { own: 691694, owe: 246743, uk: 338468, ind: 106483, ar: 250868, as: 194083, liq: 37596, fix: 23670, lock: 630428, n: 17, nUK: 10, nLiq: 9, indInr: '₹1,19,79,306', home: 415000 },
      c: { own: 704694, owe: 246743, uk: 351468, ind: 106483, ar: 257368, as: 200583, liq: 37596, fix: 23670, lock: 643428, n: 17, nUK: 10, nLiq: 9, indInr: '₹1,19,79,306', home: 428000 },
      /* the figure set: the Barclaycard's £1,458 owed from Sun 1 Nov 08:44, then the HDFC EMI of Thu 5 Nov.
         India in rupees after the EMI is derived: £106,737 at ₹112.50, from the set's exact balances */
      d: { own: 704694, owe: 248201, uk: 350010, ind: 106483, ar: 255910, as: 200583, liq: 37596, fix: 23670, lock: 643428, n: 17, nUK: 10, nLiq: 9, indInr: '₹1,19,79,306', home: 428000 },
      e: { own: 704694, owe: 247947, uk: 350010, ind: 106737, ar: 256164, as: 200583, liq: 37596, fix: 23670, lock: 643428, n: 17, nUK: 10, nLiq: 9, indInr: '₹1,20,07,976', home: 428000 }
    }[ph];
    var net = F.own - F.owe;

    if (id === 'home') {
      pg.title = 'Home';
      pg.sub = date + ' · prices at the Fri 23 Oct close · illustrative figures';
      pg.ctrls = Object.assign({}, noCtl, eye, { hasWhose: web, whose: seg(['Household', 'Me', 'Asha'], 0, T, A), hasCcy: web, ccy: seg(['£ GBP', '₹ INR'], st.ccy === 'inr' ? 1 : 0, T, A, 'ccy') });
      var big = st.ccy === 'inr' ? inr(nw * FX) : gbp(nw);
      var dl = { hasDelta: false };
      if (date === D1 && ph === 'a') dl = { hasDelta: true, deltaUp: '▲ £5,000', deltaT: 'at 09:41 · Instant access savings · Monzo, added in the chat' };
      if (date === D1 && ph === 'c') dl = { hasDelta: true, deltaUp: '▲ £13,000', deltaT: 'at 09:52 · Home, Reading, corrected in place, your estimate' };
      if (ph === 'e') dl = { hasDelta: true, deltaUp: '▲', deltaT: mp('at 09:12 · the HDFC EMI paid; its principal, ₹28,671, came off what you owe') };
      var live = '';
      if (web && date === D1 && ph === 'a' && !w.at('s4a')) live = 'Updated live at 09:41: the change came over the stream, no reload. It was ' + mp('£439,951') + '.';
      if (web && date === D1 && ph === 'c') live = 'Updated live at 09:52: the change came over the stream, no reload. It was ' + mp('£444,951') + '.';
      var H = hero(Object.assign({ over: 'Household net worth', big: big, hasSeg: !web, seg: seg(['£', '₹'], st.ccy === 'inr' ? 1 : 0, T, A, 'ccy'), hasWhose: !web, whose: seg(['Household', 'Me', 'Asha'], 0, T, A),
        hasRate: true, rate: '£1 = ₹112.50 · ECB reference rate, Fri 23 Oct · prices at the Fri 23 Oct close', hasLive: !!live, live: live }, dl));
      var oo = card('What we own and owe', pct(F.owe, F.own) + ' of what we own is owed', [bar('We own', gbp(F.own), '100%', F.n + ' assets in the UK and India', 'f-blue'), bar('We owe', gbp(F.owe), pct(F.owe, F.own), '3 loans and a card', 'f-grey')]);
      var bc = card('By country', 'in pounds', [bar('United Kingdom', gbp(F.uk), pct(F.uk, net), pct(F.uk, net) + ' · ' + F.nUK + ' assets, 3 debts, held in pounds', 'f-blue'), bar('India', gbp(F.ind), pct(F.ind, net), pct(F.ind, net) + ' · 7 assets, 1 loan, held in rupees: ' + mp(F.indInr), 'f-blue')]);
      var bm = card('By member', 'joint records by share', [bar('Arun', gbp(F.ar), pct(F.ar, net), pct(F.ar, net) + ' · his own records and his half of the joint ones', 'f-blue'), bar('Asha', gbp(F.as), pct(F.as, net), pct(F.as, net) + ' · her own records and her half of the joint ones', 'f-blue')]);
      var ll = card('Liquid and locked', pct(F.lock, F.own) + ' is locked', [{ isStack: true, segs: [{ w: pct(F.liq, F.own), c: 'f-blue' }, { w: pct(F.fix, F.own), c: 'f-violet' }, { w: pct(F.lock, F.own), c: 'f-amber' }] },
        row({ icon: '', lead: '', name: 'Liquid now', sub: F.nLiq + ' records: cash, savings, funds and shares', v: gbp(F.liq), sw: 'f-blue' }), row({ name: 'Fixed term', sub: mp('4 pay out at maturity; next the saver, £10,460 on Mon 14 Dec'), v: gbp(F.fix), sw: 'f-violet' }), row({ name: 'Locked', sub: 'two homes, and two pensions that unlock at 57', v: gbp(F.lock), sw: 'f-amber' })]);
      var due = card('What\'s due', 'next 30 days', dueRows(w, mp).concat([p('Each is asked in the chat on its day, with the answer one tap away.', 'mp-ink2')]));
      var la = card('Largest assets', 'each in its own currency', [
        row({ lead: 'HM', name: 'Home, Reading', sub: 'UK · £ · Arun 50% · Asha 50%', sub2: ph === 'b' || ph === 'a' ? 'valued 30 Apr' : 'your estimate, Mon 26 Oct', v: gbp(F.home), go: A('row:home'), cls: T('row:home') }),
        row({ lead: 'FP', name: 'Flat, Pune', sub: 'India · ₹ · Arun 50% · Asha 50%', sub2: 'valued 15 Jan · overdue', v: '₹1,10,00,000', v2: '≈ £97,778' }),
        row({ lead: 'AV', name: 'Workplace pension · Aviva', sub: 'UK · £ · Arun · unlocks at 57', v: '£86,400' }),
        row({ lead: 'VG', name: 'SIPP · Vanguard', sub: 'UK · £ · Asha · unlocks at 57', v: '£31,250' }),
        row({ lead: 'BA', name: 'Balanced (BlackRock MyMap 5)', sub: 'UK · £ · Arun · ISA · Monzo', v: '£22,925' }),
        p(mp(ph === 'b' ? '11 more records, £33,341 in all.' : '12 more records, £38,341 in all.'), 'mp-ink2'),
        { isLink: true, t: 'All assets', go: A('link:assets'), cls: T('link:assets') }]);
      var links = card('Everything else', '', [['donut_small', 'Assets', 'assets'], ['credit_card', 'Debts', 'debts'], ['savings', 'Budget', 'budget'], ['trending_up', 'Projection', 'proj'], ['history', 'Audit', 'audit']].map(function (l) { return row({ icon: l[0], name: l[1], go: A('link:' + l[2]), cls: T('link:' + l[2]), chev: true }); }), { cls: 'links' });
      pg.cols = web ? [[H], [oo, bc, bm, la], [ll, due].concat(door === 'pweb' ? [links] : [])] : [[H, oo, bc, bm, ll, due, la, links]];
      pg.colsCls = 'toprow';
    }

    else if (id === 'assets') {
      pg.title = 'Assets'; pg.sub = date + ', ' + (date === D1 ? '09:41' : '09:00') + ' · investments at the Fri 23 Oct close, the rest as last recorded · Illustrative figures';
      pg.ctrls = Object.assign({}, noCtl, eye);
      var newRec = ph !== 'b';
      var g = function (t, total, rows) { return card(t, total, rows); };
      pg.cols = [[hero({ over: 'What you own · household', hasRight: true, right: F.n + ' records', big: gbp(F.own), hasSub: true, sub: 'UK and India, in pounds at £1 = ₹112.50 (ECB, Fri 23 Oct)', hasStats: true,
          stats: [{ k: 'Liquid', v: gbp(F.liq), s: F.nLiq + ' records' }, { k: 'Notice', v: '£0', s: 'none' }, { k: 'Locked', v: gbp(F.fix + F.lock), s: '8 records' }] }),
        g('Investments', '£30,504', [row({ lead: 'BA', name: 'Balanced (BlackRock MyMap 5)', sub: 'Arun · ISA · Monzo', v: '£22,925', tags: [tag('Liquid', 'mp-hold', 'water_drop')] }), row({ lead: 'NQ', name: 'NASDAQ 100 ETF', sub: 'Asha · ISA', v: '£512' }), row({ lead: 'RB', name: 'Robotics ETF', sub: 'Arun · GIA', v: '£304' }), row({ lead: 'SI', name: 'Silver ETC', sub: 'Arun · GIA', v: '£188' }), row({ lead: 'PP', name: 'Parag Parikh Flexi Cap', sub: 'Asha · MF folio · CAMS', v: '₹5,61,995', v2: '≈ £4,996' }), row({ lead: 'IN', name: 'Infosys', sub: 'Arun · Demat · Zerodha', v: '₹1,77,660', v2: '≈ £1,579' })]),
        g('Cash and savings', newRec ? '£7,092' : '£2,092', (newRec ? [row({ lead: 'MZ', name: 'Instant access savings · Monzo', sub: 'Arun · added in the chat, 09:41', v: '£5,000', tags: [tag('New', 'mp-add')] })] : []).concat([row({ lead: 'MP', name: 'Monzo pot', sub: 'Arun and Asha, half each', v: '£181' }), row({ lead: 'NR', name: 'NRE savings · HDFC', sub: 'Arun · India', v: '₹2,15,000', v2: '≈ £1,911' })]))],
        [g('Property', newRec ? gbp(F.home + 97778) : '£512,778', [row({ lead: 'HM', name: 'Home, Reading', sub: 'Arun and Asha, half each', sub2: ph === 'b' || ph === 'a' ? 'valued Thu 30 Apr · due Fri 30 Oct' : 'your estimate, Mon 26 Oct', v: gbp(F.home), go: A('row:home'), cls: T('row:home'), chev: true }), row({ lead: 'FP', name: 'Flat, Pune', sub: 'Arun and Asha, half each', sub2: 'valued 15 Jan · overdue since 15 Jul', v: '₹1,10,00,000', v2: '≈ £97,778', tags: [tag('Overdue', 'mp-pause')] })]),
        g('Fixed term', '£23,670', [row({ lead: 'NW', name: 'Fixed-rate saver · Nationwide', sub: 'Asha · 4.6% · £10,460 on Mon 14 Dec', v: '£10,000' }), row({ lead: 'FD', name: 'Fixed deposit · SBI', sub: 'Arun · 7.1% · ₹6,17,538 on Sat 10 Mar 2029', v: '₹5,17,908', v2: '≈ £4,604' }), row({ lead: 'PF', name: 'PPF · SBI', sub: 'Arun · 7.1% · to 31 Mar 2031', v: '₹6,80,000', v2: '≈ £6,044' }), row({ lead: 'LI', name: 'LIC Jeevan Anand', sub: 'Asha · surrender value', v: '₹3,40,000', v2: '≈ £3,022' })]),
        g('Pensions', '£117,650', [row({ lead: 'AV', name: 'Workplace pension · Aviva', sub: 'Arun · unlocks at 57', v: '£86,400' }), row({ lead: 'VG', name: 'SIPP · Vanguard', sub: 'Asha · unlocks at 57', v: '£31,250' })])]];
      if (!web) pg.cols = [pg.cols[0].concat(pg.cols[1])];
    }

    else if (id === 'homeval') {
      var st4 = w.at('s4e') ? 'saved' : w.is('s4d') ? 'edit' : 'before';
      pg.title = 'Home, Reading'; pg.sub = 'Property · UK · Arun and Asha, half each · locked'; pg.hasCrumb = true; pg.crumb = 'Assets';
      pg.ctrls = Object.assign({}, noCtl, eye);
      var v = st4 === 'saved' ? 428000 : 415000;
      var top;
      if (st4 === 'edit') {
        var typed = String(st.ev || '').replace(/[^\d]/g, ''), n = typed ? +typed : 0, ok = n === 428000;
        top = card('', '', [{ isSec: true, t: 'Property · UK · Arun and Asha, half each', r: '' }, { isEdit: true, lbl: 'Value of Home, Reading', val: st.ev || '', ph: '£415,000', onType: api.type('ev'), onKey: api.key('save'), fieldCls: T('field'),
          hasBA: !!n, before: '£415,000', after: n ? gbp(n) : '', hasDelta: !!n && n !== 415000, delta: (n >= 415000 ? '▲ ' : '▼ ') + gbp(Math.abs(n - 415000)), up: n >= 415000,
          hasNet: ok, net: mp('Net worth £444,951 → £457,951, from the engine'),
          saveGo: A('save'), saveCls: T('save'), cancelGo: A('cancel'), note: 'Save writes a correction with its audit row. Nothing else on the record changes.', kp: !web }]);
      } else {
        top = card('', '', [{ isSec: true, t: 'Property · UK · Arun and Asha, half each', r: '' }, { isBig: true, big: gbp(v), pen: true, go: A('fig'), cls: T('fig'), sub: st4 === 'saved' ? 'your estimate, Mon 26 Oct' : 'your figure, valued Thu 30 Apr. Tap the figure to correct it.' }]
          .concat(st4 === 'saved' ? [{ isOk: true, t: mp('Corrected in place by Arun, Mon 26 Oct, 09:52: £415,000 → £428,000, his estimate. Written as a correction with its audit row (via inline edit). Net worth is now £457,951, the engine\'s figure.'), link: 'Open in Audit', go: A('nav:audit') }] : [])
          .concat([{ isTags: true, tags: [tag('Locked', 'mp-neutral', 'lock'), st4 === 'saved' ? tag('Valuation check-in answered', 'mp-add', 'event_available') : tag('Valuation due Fri 30 Oct', 'mp-pause', 'schedule')] }, { isChart: true, ch: M.charts.home(st4 === 'saved') }]));
      }
      var sv4 = st4 === 'saved';
      var prop = card('The property', sv4 ? 'after the correction' : 'as recorded', [{ isGrid: true, cells: [
        { k: 'Bought', v: '£330,000', s: 'Fri 18 Jun 2021', pen: true }, { k: 'Gain on paper', v: sv4 ? '▲ £98,000' : '▲ £85,000', s: sv4 ? '▲ 29.7% on the price' : '▲ 25.8% on the price', up: true },
        { k: 'Mortgage on it', v: '£224,353', s: 'Nationwide, joint' }, { k: 'Equity', v: sv4 ? '£203,647' : '£190,647', s: 'value less the mortgage' },
        { k: 'Each half', v: sv4 ? '£214,000' : '£207,500', s: 'Arun\'s and Asha\'s' }, { k: 'Last valued', v: sv4 ? 'Mon 26 Oct' : 'Thu 30 Apr', s: sv4 ? 'your estimate · next due in six months' : 'your figure · due Fri 30 Oct' }].map(cell) }]);
      var ev = card('Events', sv4 ? '4 events' : '3 events', (sv4 ? [row({ icon: 'edit', name: 'Correction · Mon 26 Oct, 09:52', sub: mp('Arun, in place · your estimate · was £415,000'), v: '£428,000', tags: [tag('New', 'mp-add')] })] : [])
        .concat([row({ icon: 'notifications', name: 'Check-in · Mon 26 Oct, 09:00', sub: mp(sv4 ? 'Is £415,000 still about right? Answered by the correction' : 'Is £415,000 still about right? Waiting in the chat'), v: sv4 ? 'answered' : 'open', nomny: true }),
          row({ icon: 'home_work', name: 'Valuation · Thu 30 Apr 2026', sub: 'Arun, in the chat', v: '£415,000' }), row({ icon: 'flag', name: 'Bought · Fri 18 Jun 2021', sub: 'Arun and Asha, half each', v: '£330,000' })]));
      pg.cols = web ? [[top], [prop, ev]] : [[top, prop, ev]];
    }

    else if (id === 'debts') {
      var afterE = w.at('s7b');
      var owe = F.owe;   /* the figure set: the card's £1,458 counts from Sun 1 Nov 08:44; the HDFC EMI of Thu 5 Nov after it */
      pg.title = 'Debts'; pg.sub = date + ' · after each loan\'s last payment · Illustrative figures';
      pg.ctrls = Object.assign({}, noCtl, eye);
      var cardS = w.at('s6g');
      pg.cols = [[hero({ over: 'What you owe · household', hasRight: true, right: '4 debts', big: gbp(owe), hasSub: true,
          sub: (afterE ? 'After each loan\'s last payment, Thursday\'s HDFC EMI included. ' : 'After each loan\'s last payment. ') + (cardS ? 'The card\'s Sun 1 Nov statement, £1,458, is owed until it is paid; it is due Fri 20 Nov.' : 'The card is clear.') + ' Rupees in pounds at £1 = ₹112.50.',
          hasStats: true, stats: [{ k: 'Each month', v: '£2,153', s: '3 loans' }, { k: 'Interest left', v: afterE ? '£109,281' : '£109,376', s: 'at today\'s rates' /* after the EMI, derived: less November's HDFC interest, ₹10,719 */ }, { k: 'Debt-free', v: 'Oct 2045', s: 'the mortgage ends' }] })],
        [card('The loans', 'tap one to open it', [
          row({ lead: 'NW', name: 'Mortgage · Nationwide', sub: 'Arun and Asha · £1,456 a month · 4.39%, fixed to 30 Jun 2028', v: '£224,353', tags: [tag('Ends Oct 2045', 'mp-neutral', 'event')] }),
          row({ lead: 'CL', name: 'Car loan · Close Brothers', sub: 'Arun · £347 a month · 6.9% · autopay', v: '£8,939', tags: [tag('Ends Feb 2029', 'mp-neutral', 'event')] }),
          row({ lead: 'HD', name: 'Home loan · HDFC', sub: 'Arun · ₹39,390 a month · 8.5% · Pune flat', v: afterE ? '₹14,84,587' : '₹15,13,257', v2: afterE ? '≈ £13,196' : '≈ £13,451', tags: [tag('Ends Jul 2030', 'mp-neutral', 'event')], go: A('row:hdfc'), cls: T('row:hdfc'), chev: true }),
          row({ lead: 'BC', name: 'Barclaycard', sub: cardS ? 'Arun · statement of Sun 1 Nov, due Fri 20 Nov' : 'Arun · the 1 Oct statement\'s £1,240 paid in full on Tue 20 Oct', v: cardS ? '£1,458' : '£0', tags: cardS ? [tag('Due Fri 20 Nov', 'mp-pause', 'schedule')] : [] })])]];
      if (!web) pg.cols = [pg.cols[0].concat(pg.cols[1])];
    }

    else if (id === 'hdfc') {
      var af = w.at('s7b');
      pg.title = 'Home loan · HDFC'; pg.sub = 'On the Pune flat · India · Arun\'s · rupees first, pounds beside at £1 = ₹112.50'; pg.hasCrumb = true; pg.crumb = 'Debts';
      pg.ctrls = Object.assign({}, noCtl, eye);
      var topH = card('', '', [{ isSec: true, t: 'Home loan · India · Arun · left to pay', r: '' }, { isBig: true, big: af ? '₹14,84,587' : '₹15,13,257', big2: af ? '£13,196' : '£13,451', pen: false, go: null, cls: '', sub: '' },
        p('Of ₹40,00,000 borrowed at 8.5% over 15 years, EMIs from Wed 5 Aug 2015. ' + (af ? '136' : '135') + ' EMIs paid, no prepayments.', 't15'),
        { isTags: true, tags: [tag('On its original plan', 'mp-add', 'check_circle'), tag('Ends Jul 2030', 'mp-neutral', 'event')] }, { isChart: true, ch: M.charts.hdfc(af) }]);
      /* derived after the Thu 5 Nov EMI: November's interest ₹10,719 and principal ₹28,671, from the loan's terms */
      var terms = card('The loan', 'tap the rate to correct it', [{ isGrid: true, cells: [
        { k: 'EMI', v: '₹39,390', s: 'on the 5th · £350 · not autopay' }, { k: 'Rate', v: '8.5%', s: 'a year', pen: true },
        { k: 'Ends', v: 'Jul 2030', s: 'the 180th EMI, Fri 5 Jul 2030' }, { k: 'Interest left', v: af ? '₹2,48,556' : '₹2,59,275', s: af ? 'at 8.5% · £2,209' : 'at 8.5% · £2,305' },
        { k: 'Interest paid', v: af ? '₹28,41,570' : '₹28,30,851', s: 'since Aug 2015' }, { k: 'Repaid', v: af ? '₹25,15,413' : '₹24,86,743', s: 'of ₹40,00,000' }].map(cell) },
        { isNote: true, icon: 'functions', t: 'The EMI and the end date are worked out from the terms, so they are not edited themselves: correct the rate or the balance and they follow.', cls: '' }]);
      var evs = card('Events', af ? '136 EMIs paid' : '135 EMIs paid', (af ? [row({ icon: 'event_available', name: 'EMI · Thu 5 Nov 2026', sub: 'paid, Arun tapped Paid on the check-in at 09:12', v: '₹39,390', tags: [tag('New', 'mp-add')] })] : [row({ icon: 'notifications', name: 'Next: Thu 5 Nov', sub: 'MyPaisa asks Arun: was November\'s EMI paid?', v: '₹39,390', tags: [tag('Due', 'mp-hold')] })])
        .concat([row({ icon: 'event_available', name: 'EMI · Mon 5 Oct 2026', sub: 'paid, Arun tapped Paid on the check-in', v: '₹39,390' }), row({ icon: 'event_available', name: 'EMI · Sat 5 Sep 2026', sub: 'paid', v: '₹39,390' }), row({ icon: 'flag', name: 'Borrowed · first EMI Wed 5 Aug 2015', sub: 'at 8.5% over 15 years', v: '₹40,00,000' })]));
      pg.cols = web ? [[topH], [terms, evs]] : [[topH, terms, evs]];
    }

    else if (id === 'budget') {
      var cl = w.at('s6i'), waiting = w.at('s6c') && !w.at('s6g');
      pg.title = 'Budget'; pg.sub = cl ? 'October 2026 · closed Sun 1 Nov 09:02 · Illustrative figures' : 'October 2026 · open · ' + (waiting ? 'October\'s statements not confirmed yet' : 'until the check-in on the 1st') + ' · Illustrative figures';
      pg.ctrls = Object.assign({}, noCtl, eye, { hasMonth: true, month: seg(['Sep', 'Oct', 'Nov'], 1, T, A), hasWhose: web, whose: seg(['Household', 'Me', 'Asha'], 0, T, A), hasCcy: web, ccy: seg(['£ GBP', '₹ INR'], 0, T, A) });
      var done6 = w.at('s6g');
      var BUD = [['Bills and council tax', 431, 420], ['Groceries', 702, 650], ['Transport', 198, 220], ['Insurance', 85, 85], ['Eating out', 236, 180], ['Shopping', 189, 250], ['Holidays', 0, 400], ['Health', 24, 60], ['Subscriptions', 45, 45], ['Giving', 50, 50], ['Family support, India', 222, 222], ['Other', 64, 100]];
      var hb = done6 ? hero({ over: cl ? 'October · closed' : 'October · open', hasRight: true, rightUp: true, right: '▲ £436 over plan', big: '£3,072', hasUnit: true, unit: 'surplus', hasSub: true, sub: 'Plan £2,636 · savings rate 40.6%, plan 34.9%', hasStats: true, stats: [{ k: 'Income', v: '£7,560', s: 'salaries and rent' }, { k: 'EMIs', v: '£2,153', s: '3 loans' }, { k: 'SIP', v: '£89', s: '1 fund' }, { k: 'Spending', v: '£2,246', s: 'of £2,682 planned' }] })
        : hero({ over: 'October · open', big: '£2,636', hasUnit: true, unit: 'planned surplus', hasSub: true, sub: waiting ? 'Spending comes from your statements: two are waiting for your Confirm in the chat.' : 'Spending comes from October\'s statements, sent in the chat.', hasStats: true, stats: [{ k: 'Income', v: '£7,560', s: 'expected' }, { k: 'EMIs', v: '£2,153', s: '3 loans' }, { k: 'SIP', v: '£89', s: '1 fund' }, { k: 'Spending', v: 'not yet', s: 'plan £2,682' }] });
      var pa = card('Plan against actual', done6 ? '£2,246 of £2,682' : 'plan £2,682', [p('Tap a plan figure to correct it.', 'mp-ink2'), { isBudHead: true }].concat(BUD.map(function (r) {
        var d = r[1] - r[2];
        return { isBud: true, name: r[0], a: done6 ? gbp(r[1]) : 'not yet', d: done6 ? (d > 0 ? '▲ ' + gbp(d) + ' over' : d < 0 ? '▼ ' + gbp(-d) + ' under' : 'on plan') : '', pl: gbp(r[2]), w: done6 ? Math.min(100, Math.round(r[1] / r[2] * 100)) + '%' : '0%', over: d > 0 && done6 };
      })).concat([p(done6 ? 'From the Barclaycard statement of Sun 1 Nov and Monzo\'s for October: 22 lines.' : 'Actuals come in when you confirm October\'s statements in the chat.', 'mp-ink2'), { isNote: true, icon: 'chat', t: 'New categories are made in the chat, never on this page: ask "add a category for …" and confirm its card.', cls: '' }]));
      var inc = card('Income · October', '£7,560', [row({ icon: 'person', name: 'Arun', sub: 'net salary', v: '£4,350' }), row({ icon: 'person', name: 'Asha', sub: 'net salary', v: '£3,050' }), row({ icon: 'apartment', name: 'Flat, Pune', sub: 'rent · joint, half each', v: '₹18,000', v2: '£160' }), p('From the income commitments. Tap a figure to correct it.', 'mp-ink2')]);
      var emis = card('EMIs and SIP · October', '', [{ isSec: true, t: 'EMIs', r: '£2,153' }, row({ icon: 'home', name: 'Mortgage · Nationwide', sub: 'joint · Thu 1 Oct', v: '£1,456' }), row({ icon: 'directions_car', name: 'Car loan · Close Brothers', sub: 'Arun · Tue 20 Oct', v: '£347' }), row({ icon: 'home_work', name: 'Home loan · HDFC', sub: 'Arun · Pune flat · Mon 5 Oct', v: '₹39,390', v2: '£350' }),
        { isSec: true, t: 'SIP', r: '£89' }, row({ icon: 'trending_up', name: 'Parag Parikh Flexi Cap', sub: 'Asha · Sat 10 Oct', v: '₹10,000', v2: '£89' }), p('From the loans and the SIP, so nobody types them twice.', 'mp-ink2')]);
      pg.cols = web ? [[hb, pa], [inc, emis]] : [[hb, pa, inc, emis]];
      if (waiting && web) pg.banner = 'Two statements are waiting for your Confirm in the chat. October\'s actuals fill in when you confirm them.';
    }

    else if (id === 'proj') {
      var editing = w.is('s8c'), admin = !asha;
      pg.title = 'Projection'; pg.sub = 'Net worth over the next 30 years, in the pounds of each year · the engine\'s run, Mon 26 Oct 09:53';
      pg.ctrls = Object.assign({}, noCtl, eye, { hasCcy: true, ccy: seg(['£ GBP', '₹ INR'], 0, T, A), hasTm: true });
      var hp = hero({ over: 'Middle path in 2056', big: '£4,635,000', hasSub: true, sub: mp('From £457,951 on Mon 26 Oct. 8 in 10 of the engine\'s runs end between £3,156,000 and £7,141,000.'), hasChart: true, ch: M.charts.fan(!web), hasAnn: web, annL: '' });
      var chipsB = { isChips: true, isCard: false, isHero: false, isFoot: false, chips: ['What if we buy a second flat?', 'What if the plan items fall away?', 'What moves the line most?'].map(function (t) { return { t: t, go: A('x:chip') }; }) };
      var ms = card('Milestones', 'from the records, on the line above', [
        ['savings', 'Asha\'s fixed-rate saver matures', '14 Dec 2026', '£10,460', 'tick'], ['percent', 'Mortgage fixed rate ends', '30 Jun 2028 · then a variable rate', '', 'tick'], ['directions_car', 'Car loan paid off', '20 Feb 2029 · frees £347 a month', '', 'dot'],
        ['account_balance', 'SBI FD matures', '10 Mar 2029', '₹6,17,538', 'tick'], ['home_work', 'HDFC home loan paid off', '5 Jul 2030 · frees ₹39,390 a month', '', 'dot'], ['shield', 'LIC policy matures', '28 Mar 2031', '', 'tick'],
        ['home', 'Mortgage paid off', '1 Oct 2045 · frees £1,456 a month', '', 'dot'], ['elderly', 'Arun retires at 60', '1 Jan 2051', '', 'dot']].map(function (m) { return row({ icon: m[0], name: m[1], sub: m[2], v: m[3], mk: m[4] }); }));
      var plans = card('Plan items', admin ? 'yours alone, as the admin' : 'Arun\'s, the admin\'s', [['construction', 'Home extension', 'Once, Jun 2027', '−£35,000'], ['redeem', 'Asha\'s annual bonus', 'Every March, 2027 to 2052', '+£3,000'], ['directions_car', 'Replace the car', 'Once, Jun 2031', '−£25,000']].map(function (x) { return { isPill: true, icon: x[0], name: x[1], sub: x[2], v: x[3], edit: admin, go: A('x:plan'), cls: '' }; })
        .concat(admin ? [{ isBtn: true, t: 'Add a plan item in the chat', icon: 'chat_bubble', go: A('x:chip'), cls: '' }] : [{ isLock: true, t: 'Plan items are Arun\'s, the admin\'s. Ask a what-if in the chat to try your own.' }]));
      var ASM = [['Returns', [['Parag Parikh Flexi Cap', 'History, shrunk to a prior', 'history', 'Its own 10.7% XIRR, toward India shares\' 9%: 3.8 years of history moves the long-run prior only a little.', '9.06%'], ['Balanced and the ETFs', 'Prior', 'public', 'Long-run UK shares.', '6%'], ['Home, Reading', 'Prior', 'public', 'Long-run UK property.', '3%'], ['Flat, Pune', 'Prior', 'public', 'Long-run India property.', '5%'], ['SBI fixed deposit', 'Contract', 'contract', 'Its own rate, to 10 Mar 2029.', '7.1%'], ['PPF', 'Contract', 'contract', 'The account\'s own rate.', '7.1%']]],
        ['Pay, a year', [['Arun\'s salary growth', 'History and prior', 'history', 'His 4.8% a year since 2022, blended with the UK\'s 3.5%.', '4.17%', 'arun'], ['Asha\'s salary growth', 'History and prior', 'history', 'Her 3.5% a year since 2023, blended with the UK\'s 3.5%.', '3.5%']]],
        ['Prices, a year', [['UK inflation', 'Prior', 'public', 'Long-run UK consumer prices.', '2.5%'], ['India inflation', 'Prior', 'public', 'Long-run India prices; the gap also drifts the rupee.', '5%']]]];
      var aparts = [admin ? { isNote: true, icon: 'edit', t: 'Click a figure to correct it. Only you can, as the admin; each change is audited.', cls: '' } : { isLock: true, t: 'Arun keeps these figures. Ask in the chat to see what other figures would do.' }];
      ASM.forEach(function (gr) {
        aparts.push({ isSec: true, t: gr[0], r: '' });
        gr[1].forEach(function (a) {
          if (a[5] === 'arun' && editing && admin) {
            var ea = st.ea || '';
            aparts.push({ isAsmEdit: true, name: a[0], sub: 'A year · now 4.17%, his history blended with a prior', val: ea, ph: '4.17', onType: api.type('ea'), onKey: api.key('asm:cancel'), fieldCls: T('asmfield'), hasAfter: !!ea, before: '4.17%', after: ea + '%', note: ea === '4.8' ? 'His own 4.8% a year since 2022, without the UK\'s 3.5% blended in.' : 'Type the rate you want the engine to use.', saveGo: A('asm:save'), cancelGo: A('asm:cancel'), cancelCls: T('asm:cancel'), kp: !web });
          } else aparts.push({ isPill: true, isAsm: true, icon: '', name: a[0], tagT: a[1], tagI: a[2], sub: a[3], v: a[4], edit: admin, go: A(a[5] === 'arun' ? 'asm:arun' : 'x:asm'), cls: a[5] === 'arun' ? T('asm:arun') : '' });
        });
      });
      var asm = card('Assumptions', 'each with its source', aparts);
      pg.cols = web ? [[hp, chipsB], [ms, plans], [asm]] : [[hp, chipsB, ms, plans, asm]];
      pg.colsCls = 'toprow';
      pg.foot = 'Illustrative figures from the v4 figure set. A projection, not a promise: the engine\'s middle path is no more likely than the band around it.';
    }

    else if (id === 'act') {
      pg.title = 'Activity'; pg.sub = (date === D1 ? 'What MyPaisa did today, Mon 26 Oct, to 09:53' : 'What MyPaisa did on Mon 26 Oct') + ' · UK time · costs from the API\'s own token counts';
      pg.ctrls = Object.assign({}, noCtl, { hasWhose: true, whose: seg(['Everyone\'s runs', 'Mine'], 0, T, A) });
      var R = [
        ['01:00', 'Nightly views', 'Net worth, the budget month and what is due, rebuilt from the events', 'No model · 21 s', 'No model', '0', '$0.00', '', 'check_circle', 'Done'],
        ['07:00', 'Prices', '6 of 6 priced at the Fri 23 Oct close, and the ECB rate', 'No model · 9 s', 'No model', '0', '$0.00', '', 'check_circle', 'Done'],
        ['08:12', 'Chat · Asha', 'Her words stay hers; the cost and the tools show', 'Sonnet 5.5 · 2 calls · 3.0k tokens', 'Sonnet 5.5 · 2 calls', '3.0k', '$0.02', 'get_commitments', 'check_circle', 'Done'],
        ['09:00', 'Check-ins', '1 card: 2 valuations, Home, Reading and Flat, Pune · sent with push, no amount', 'No model · 2 s', 'No model', '0', '$0.00', '', 'check_circle', 'Done'],
        ['09:40', 'Chat · Arun', '"£5,000 in Monzo savings" · saved 09:41 · run r-1235', 'Sonnet 5.5 · 3 calls · 4.3k tokens', 'Sonnet 5.5 · 3 calls', '4.3k', '$0.03', 'draft_record, ask_user, propose_change', 'check_circle', 'Saved', 'run:r1235'],
        ['09:41', 'Views', 'Rebuilt after the new record; Home moved at every door', 'No model · 2 s', 'No model', '0', '$0.00', '', 'check_circle', 'Done'],
        ['09:43', 'Chat · Arun', '"What can we get at quickly now?"', 'Sonnet 5.5 · 2 calls · 2.9k tokens', 'Sonnet 5.5 · 2 calls', '2.9k', '$0.02', 'get_networth', 'check_circle', 'Done'],
        ['09:52', 'Views', 'Rebuilt after the correction to Home, Reading; Home moved at every door', 'No model · 2 s', 'No model', '0', '$0.00', '', 'check_circle', 'Done'],
        ['21:00', 'Prices', 'Scheduled, not run yet', 'Due at 21:00', 'Not run yet', '', '', '', 'schedule', 'Due']];
      var cutoff = date === D1 ? b.tm : '23:59';
      var runs = R.filter(function (r) { return r[0] === '21:00' ? date === D1 : r[0] <= cutoff; });
      var ndone = runs.filter(function (r) { return r[9] !== 'Due'; }).length, cost = runs.reduce(function (s, r) { return s + (parseFloat((r[6] || '$0').slice(1)) || 0); }, 0);
      var runsC = card(date === D1 ? 'Today\'s runs' : 'Mon 26 Oct\'s runs', ndone + ' done' + (date === D1 ? ' · 1 due' : '') + ' · $' + cost.toFixed(2) + (date === D1 ? ' so far' : ''), [{ isRunHead: true }].concat(runs.map(function (r) {
        return { isRun: true, time: r[0], name: r[1], sub: r[2], line: r[3], model: r[4], tok: r[5], cost: r[6], tools: r[7], hasTools: !!r[7], icon: r[8], out: r[9], go: A(r[10] || 'x:run'), cls: r[10] ? T(r[10]) : '' };
      })), { cls: 'runs' });
      var cyc = card('Claude this cycle', 'renews 3 Nov', [{ isMeter: true, big: '$18', bsub: 'of the $160 ceiling · 11%', w: '11.25%', note: 'Step: Normal, under 70%. Nothing is held back.', aws: '£3 of £50 · 6%' }]);
      pg.cols = web ? [[runsC, cyc]] : [[cyc, runsC]];
      pg.colsCls = 'one';
    }

    else if (id === 'run') {
      pg.title = 'Chat · Arun, 09:40'; pg.sub = 'Mon 26 Oct · "£5,000 in Monzo savings" · run r-1235'; pg.hasCrumb = true; pg.crumb = 'Activity'; pg.hasHeadChip = true; pg.headChip = 'Saved 09:41';
      var sum = card('', '', [kv('Trigger', 'Arun\'s message at 09:40:12'), kv('Start → end', '09:40:12 → 09:41:20 · 68 s'), kv('Where the time went', '6.3 s model, 0.2 s tools, 61 s for Arun'), kv('Outcome', 'Saved · audit row 09:41 · nothing retried'), kv('Cost', '$0.03 · 4.3k tokens, 23.4k cached')]);
      var steps = card('Steps · 7', 'UK time', [
        ['09:40:12', 'Trigger', 'Arun wrote "£5,000 in Monzo savings".', false], ['09:40:15', 'draft_record', 'Code typed the draft against the savings account kind: Monzo, £5,000 in pounds, UK, instant access. Missing: whose.', true],
        ['09:40:16', 'ask_user', '"Whose is it?" with Arun, Asha and Joint.', true], ['09:40:58', 'Answer', 'Arun tapped his own name.', false],
        ['09:41:01', 'propose_change', 'The draft, hashed and held, owner Arun, all of it. The Confirm card went to the chat.', true], ['09:41:20', 'Confirm', 'Arun tapped Confirm. The write service checked the hash, then saved the record, its first event and the audit row.', false],
        ['09:41:20', 'Stream', 'records.changed went out; Home moved at every door.', false]].map(function (s) { return { isStep: true, time: s[0], l: s[1], t: mp(s[2]), mono: s[3] }; }));
      var calls = card('Model calls · 3', '$0.026 in all', [['1 · Sonnet 5.5 · drafted', '$0.012', 'in 2,310 · cached 6,120 · out 196 · 2.5 s'], ['2 · Sonnet 5.5 · asked whose', '$0.005', 'in 410 · cached 8,430 · out 92 · 1.2 s'], ['3 · Sonnet 5.5 · proposed', '$0.009', 'in 1,060 · cached 8,840 · out 238 · 2.6 s']].map(function (c) { return { isCall: true, m: c[0], cost: c[1], t: c[2] }; }));
      var tools = card('Tool calls · 3', 'all code', [['draft_record', '80 ms'], ['ask_user', '20 ms, then 42 s for Arun'], ['propose_change', '110 ms']].map(function (x) { return { isTool: true, n: x[0], ms: x[1] }; }));
      var prop2 = card('What it proposed', '1 card', [kv('Record', 'Instant access savings · Monzo'), kv('Whose', 'Arun, all of it'), kv('Balance', '£5,000, from his message', true), kv('Where', 'UK · pounds'), kv('Get at it', 'any time'), p('Confirmed by Arun at 09:41:20. Nothing else was proposed.', 'mp-ink2')]);
      pg.cols = web ? [[sum, steps], [calls, tools, prop2]] : [[sum, calls, tools, steps, prop2]];
    }

    else if (id === 'audit') {
      pg.title = 'Audit'; pg.sub = 'Every change, who made it and how · newest first · ' + date;
      var rows = [];
      if (w.at('s7b')) rows.push(row({ icon: 'event_available', name: 'Thu 5 Nov, 09:12 · EMI paid', sub: 'HDFC home loan · Arun · on the check-in, with Undo', v: '₹39,390' }));
      if (w.at('s6i')) rows.push(row({ icon: 'event_available', name: 'Sun 1 Nov, 09:02 · October closed', sub: 'Budget · Arun · Nothing else, on the check-in', v: '' }));
      if (w.at('s6g')) { rows.push(row({ icon: 'directions_car', name: 'Sun 1 Nov, 08:44 · EMI confirmed', sub: 'Car loan · Close Brothers · by the Monzo statement', v: '£346.55' })); rows.push(row({ icon: 'receipt_long', name: 'Sun 1 Nov, 08:44 · Statements saved', sub: '22 lines in October\'s budget · Arun · in the chat', v: '£2,246' })); }
      if (w.at('s4e')) rows.push(row({ icon: 'edit', name: 'Mon 26 Oct, 09:52 · Correction', sub: mp('Home, Reading · £415,000 → £428,000, your estimate · Arun · in place'), v: '£428,000' }));
      if (w.at('s2f')) rows.push(row({ icon: 'add_circle', name: 'Mon 26 Oct, 09:41 · Record added', sub: 'Instant access savings · Monzo · Arun · in the chat', v: '£5,000' }));
      rows.push(row({ icon: 'add_circle', name: 'Sun 25 Oct, 10:03 · Record added', sub: 'Fixed deposit · SBI · Arun · in the chat', v: '₹5,00,000' }));
      pg.cols = [[card('The audit log', rows.length + ' rows shown', rows)]];
      pg.colsCls = 'one';
    }

    else {
      pg.title = 'You'; pg.sub = asha ? 'Asha · member · signed in with Apple' : 'Arun · admin · signed in with Apple';
      pg.cols = [[card('The household', 'one family', [row({ lead: 'AR', name: 'Arun', sub: 'admin · owner', v: '' }), row({ lead: 'AS', name: 'Asha', sub: 'member', v: '' })]),
        card('On this device', '', [{ isRow: true, name: 'Privacy mode', sub: 'hides every amount', sw: true, swOn: priv, go: A('priv'), lead: '', hasLead: false, icon: 'visibility_off', hasIcon: true, hasSub: true, sub2: '', hasSub2: false, tags: [], hasTags: false, v: '', v2: '', hasV2: false, cls: '', chev: false }])]];
    }

    /* finish: flags every template reads */
    pg.cols = pg.cols.map(function (c) { return { blocks: c.map(fin) }; });
    pg.flat = web ? null : pg.cols[0].blocks;
    pg.hasBanner = !!pg.banner; pg.banner = pg.banner || '';
    pg.isTwo = web && pg.cols.length > 1;
    pg.colsCls = pg.colsCls || (pg.cols.length === 1 ? 'one' : '');
    return pg;
  }
  function cell(c) { return Object.assign({ k: '', v: '', s: '', pen: false, up: false }, c); }
  var PRIV = false;
  function mask(o, keys) { if (PRIV) keys.forEach(function (k) { if (typeof o[k] === 'string') o[k] = M.P(o[k], true); }); return o; }
  function fin(bk) {
    if (bk.isHero) { bk.rightCls = bk.rightUp ? 'upchip' : 'dnchip'; bk.statsCls = 'n' + (bk.stats || []).length; mask(bk, ['sub', 'deltaT', 'live']); (bk.stats || []).forEach(function (s) { mask(s, ['s']); }); }
    if (bk.isCard && PRIV) bk.parts.forEach(function (pt) { mask(pt, ['sub', 'sub2', 't', 'note', 'net']); if (pt.cells) pt.cells.forEach(function (c) { mask(c, ['s']); }); });
    if (bk.isCard) bk.parts = bk.parts.map(function (pt) {
      pt = norm(pt);
      if (pt.isRow) { pt.hasSw = !!pt.sw && pt.sw !== true; pt.swCls = pt.hasSw ? pt.sw : ''; pt.isSwitch = pt.sw === true; pt.swC = pt.swOn ? 'on' : ''; pt.vcls = pt.nomny ? '' : 'mny'; pt.tags = (pt.tags || []); pt.cls = pt.cls || ''; }
      if (pt.isPill) { pt.hasIcon = !!pt.icon; pt.isAsm = !!pt.isAsm; pt.hasTag = !!pt.tagT; pt.tagT = pt.tagT || ''; pt.tagI = pt.tagI || ''; pt.hasSub = !!pt.sub; pt.editCls = pt.edit ? 'ed' : 'ro'; pt.vcls = pt.isAsm ? '' : 'mny'; pt.cls = pt.cls || ''; }
      if (pt.isBig) { pt.hasBig2 = !!pt.big2; pt.big2 = pt.big2 || ''; pt.hasSub = !!pt.sub; pt.tapCls = pt.go ? 'tap' : ''; pt.cls = pt.cls || ''; }
      if (pt.isGrid) pt.cells = pt.cells.map(function (c) { c.upCls = c.up ? 'up' : ''; return c; });
      if (pt.isStep) pt.lc = pt.mono ? 'tl ink' : 'mp-sub mp-w6';
      return pt;
    });
    return bk;
  }
  function dueRows(w, mp) {
    var date = w.b.d, today = { 'Mon 26 Oct': '2026-10-26', 'Sun 1 Nov': '2026-11-01', 'Thu 5 Nov': '2026-11-05' }[date];
    var L = [
      ['2026-10-26', 'Mon', '26', 'Oct', 'Valuation due: Home, Reading', 'Asks: still about £415,000?', 'Asks you', 's4e'],
      ['2026-07-15', 'Due', '15', 'Jul', 'Valuation overdue: Flat, Pune', 'Asks: still about ₹1,10,00,000?', 'Overdue', ''],
      ['2026-11-01', 'Sun', '1', 'Nov', 'October\'s budget', 'Closes, with the Barclaycard statement', 'Asks you', 's6i'],
      ['2026-11-01', 'Sun', '1', 'Nov', 'Mortgage · Nationwide', 'autopay · £1,456', '', ''],
      ['2026-11-05', 'Thu', '5', 'Nov', 'HDFC home loan EMI', 'Asks: was ₹39,390 paid?', 'Asks you', 's7b'],
      ['2026-11-10', 'Tue', '10', 'Nov', 'Parag Parikh SIP', 'Asks: did ₹10,000 go through?', '', ''],
      ['2026-11-20', 'Fri', '20', 'Nov', 'Barclaycard bill', 'Paid in full, the minimum, or part?', 'Asks you', ''],
      ['2026-12-14', 'Mon', '14', 'Dec', 'Asha\'s fixed-rate saver matures', '£10,460: renewed, paid out or moved?', '', '']];
    return L.filter(function (d) { return (d[0] >= today || d[6] === 'Overdue') && !(d[7] && w.at(d[7])); }).slice(0, 5).map(function (d) {
      var isToday = d[0] === today;
      return { isDue: true, a: isToday ? 'Today' : d[1], b2: d[2], c: d[3], today: isToday ? 'today' : '', name: d[4], sub: mp(d[5]), hasTag: !!d[6], tag: d[6], tagCls: d[6] === 'Overdue' ? 'mp-trim' : 'mp-pause' };
    });
  }
  window.MP4P = { page: page };
})();
