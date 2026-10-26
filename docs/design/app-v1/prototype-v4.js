/* MyPaisa · Prototype v4 (MA-193): the journey, its clock, and every screen's figures.
   Every figure is the v4 figure set's (docs/design/figures/household-v4.json). A figure the set lacks is derived from
   its figures and says how, beside it. Claude never produces a number: figures come from the engine or the registry.
   Prototype v4.dc.html holds the state and calls MP4.build(); the templates only lay out what this file returns. */
(function () {
  'use strict';
  var FX = 112.5;
  function grp(n) { return Math.round(Math.abs(n)).toLocaleString('en-GB'); }
  function gbp(n) { return (n < 0 ? '−£' : '£') + grp(n); }
  function rhe(x) { var f = Math.floor(x); return Math.abs(x - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); }   /* half to even, as the figure set rounds */
  function inr(n) {
    var s = String(rhe(Math.abs(n)));
    var o = s.length > 3 ? s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3) : s;
    return (n < 0 ? '−₹' : '₹') + o;
  }
  function pct(a, b) { return Math.round((a / b) * 100) + '%'; }

  /* ---------- the journey: steps and their beats ---------- */
  var STEPS = ['Sign in', 'First record', 'SBI FD', 'Check-in', 'Activity', 'Sun 1 Nov', 'Thu 5 Nov', 'Projection', 'What-if', 'As Asha'];
  var STEP_T = ['Sign in, Mon 26 Oct 09:40', 'Register the first record, 09:41', 'Register an SBI FD (a replay)', 'The valuation check-in, corrected in place, 09:52', 'Activity and the 09:40 run', 'Sun 1 Nov: statements and the month close', 'Thu 5 Nov: the HDFC EMI check-in', 'The Projection', 'A what-if and a plan item', 'As Asha'];
  var D1 = 'Mon 26 Oct', D2 = 'Sun 1 Nov', D3 = 'Thu 5 Nov';
  var MSG_FD = 'SBI FD, 5 lakh at 7.1% for 3 years from 10 March';
  var MSG_WI = 'What if we put £60,000 down on a second flat in June 2028?';
  var B = [
    { id: 's1', s: 1, d: D1, tm: '09:40', t: 'signin', p: 'signin', v: { page: 'signin', chat: false }, hint: 'The sign-in page. Tap Sign in with Apple.' },
    { id: 's2a', s: 2, d: D1, tm: '09:40', t: 'sugg', p: 'chat', v: { page: 'home', chat: false }, msg: '£5,000 in Monzo savings', hint: 'Home shows £439,951. In the chat, tap the suggestion "£5,000 in Monzo savings", or type anything and press Enter.' },
    { id: 's2b', s: 2, d: D1, tm: '09:40', auto: 1000, v: { chat: true }, hint: 'MyPaisa reads the sentence.' },
    { id: 's2c', s: 2, d: D1, tm: '09:40', t: 'whose:arun', p: 'chat', hint: 'The one thing missing is whose it is. Tap Arun.' },
    { id: 's2d', s: 2, d: D1, tm: '09:41', auto: 900, hint: 'The Confirm card is coming.' },
    { id: 's2e', s: 2, d: D1, tm: '09:41', t: 'confirm', p: 'chat', hint: 'The card shows exactly what will be saved. Tap Confirm.' },
    { id: 's2f', s: 2, d: D1, tm: '09:41', t: 'next', p: 'guide', hint: 'Saved · in the audit log 09:41. Net worth rolls to £444,951 at every door; on the desktop, Home beside the chat moves while you watch.' },
    { id: 's3a', s: 3, d: D1, tm: '09:44', t: 'sugg', p: 'chat', v: { chat: true }, msg: MSG_FD, sc: 'replay', hint: 'A replay of Sun 25 Oct: tap the suggestion, or type and press Enter, to see how the SBI FD was recorded.' },
    { id: 's3b', s: 3, d: D1, tm: '09:44', sc: 'replay', auto: 1000, hint: 'MyPaisa reads the sentence.' },
    { id: 's3c', s: 3, d: D1, tm: '09:44', sc: 'fd', t: 'whose:arun', p: 'chat', hint: 'Whose it is comes first. Tap Arun.' },
    { id: 's3e', s: 3, d: D1, tm: '09:44', sc: 'fd', t: 'int:cum', p: 'chat', hint: 'Then the one thing SBI\'s terms leave open. Tap Added in, cumulative.' },
    { id: 's3f', s: 3, d: D1, tm: '09:44', sc: 'fd', auto: 1000, hint: 'The engine works out the maturity.' },
    { id: 's3g', s: 3, d: D1, tm: '09:44', sc: 'fd', t: 'confirm', p: 'chat', hint: 'The maturity, ₹6,17,538 on Sat 10 Mar 2029, is computed by the engine. Tap Confirm.' },
    { id: 's3h', s: 3, d: D1, tm: '09:44', sc: 'fd', t: 'next', p: 'guide', hint: 'Saved, as on Sun 25 Oct at 10:03. The FD was already in the totals, so net worth stays £444,951.' },
    { id: 's4a', s: 4, d: D1, tm: '09:52', t: 'val:one', p: 'chat', v: { chat: true }, sc: 'valcard', hint: 'The 09:00 check-in holds two valuations: Home and the Pune flat, overdue since 15 Jul. Tap One by one.' },
    { id: 's4b', s: 4, d: D1, tm: '09:52', t: 'val:change', p: 'chat', sc: 'valcard', hint: '"Is £415,000 still about right for Home, Reading?" Tap Change it.' },
    { id: 's4c', s: 4, d: D1, tm: '09:52', t: 'fig', p: 'homeval', v: { page: 'homeval', chat: false }, hint: 'Home\'s value, on its page. Tap the figure to correct it in place.' },
    { id: 's4d', s: 4, d: D1, tm: '09:52', t: 'edit', p: 'homeval', fill: '428000', hint: 'Type 428000 (or use Type it for me), read before and after, then Save.' },
    { id: 's4e', s: 4, d: D1, tm: '09:52', t: 'next', p: 'guide', hint: 'Saved as your estimate, with its audit line. Net worth is £457,951 (₹5,15,19,488), the engine\'s figure.' },
    { id: 's5a', s: 5, d: D1, tm: '09:53', go: 'act', jv: { page: 'homeval', chat: false }, hint: 'Open Activity.' },
    { id: 's5b', s: 5, d: D1, tm: '09:53', t: 'run:r1235', p: 'act', hint: 'Today\'s runs, $0.07 so far. Open the 09:40 run.' },
    { id: 's5c', s: 5, d: D1, tm: '09:53', t: 'next', p: 'guide', hint: 'Run r-1235: the trigger, draft_record, ask_user, propose_change, 3 calls, 4.3k tokens, $0.03.' },
    { id: 's6a', s: 6, d: D2, tm: '08:40', t: 'plus', p: 'chat', v: { page: 'home', chat: true }, ban: D2, hint: 'Sun 1 Nov. Tap + to attach October\'s two statements, Barclaycard and Monzo.' },
    { id: 's6b', s: 6, d: D2, tm: '08:40', t: 'send', p: 'chat', hint: 'Both files wait in the composer. Send them.' },
    { id: 's6c', s: 6, d: D2, tm: '08:40', auto: 1400, hint: 'Each file is kept for good before anything reads it.' },
    { id: 's6d', s: 6, d: D2, tm: '08:41', t: 'amb:amzn', p: 'chat', sc: 'amb', hint: 'Lines grouped by category. Two are amber: pick AMZN Mktp\'s category, Shopping.' },
    { id: 's6e', s: 6, d: D2, tm: '08:41', t: 'amb:paypal', p: 'chat', sc: 'amb', hint: 'Now PAYPAL *EBAY: Other.' },
    { id: 's6f', s: 6, d: D2, tm: '08:42', t: 'confirm', p: 'chat', hint: 'Both picked. Tap Confirm.' },
    { id: 's6g', s: 6, d: D2, tm: '08:44', t: 'next', p: 'guide', hint: 'Saved. The statement also confirmed the car loan\'s autopaid October EMI (£346.55, balance £8,938.81) and the mortgage\'s. The card\'s £1,458 is now owed (due Fri 20 Nov): net worth £456,493. Continue to 09:00.' },
    { id: 's6h', s: 6, d: D2, tm: '09:00', t: 'close:none', p: 'chat', hint: 'The month-end check-in: "Anything not on a statement?" Tap Nothing else.' },
    { id: 's6i', s: 6, d: D2, tm: '09:02', go: 'budget', hint: 'October is closed. Open Budget.' },
    { id: 's6j', s: 6, d: D2, tm: '09:05', t: 'next', p: 'guide', hint: 'Plan against actual: £2,246 spent of £2,682, a surplus of £3,072, 40.6%.' },
    { id: 's7a', s: 7, d: D3, tm: '09:00', t: 'emi:paid', p: 'chat', v: { page: 'home', chat: true }, ban: D3, hint: 'Thu 5 Nov. "Was November\'s EMI of ₹39,390 paid?" Tap Paid. The side branch above tries Paid off in full.' },
    { id: 's7b', s: 7, d: D3, tm: '09:12', go: 'debts', hint: 'Saved, with Undo for a few seconds. Open Debts.' },
    { id: 's7c', s: 7, d: D3, tm: '09:14', t: 'row:hdfc', p: 'debts', hint: 'Open the HDFC home loan.' },
    { id: 's7d', s: 7, d: D3, tm: '09:14', t: 'next', p: 'guide', hint: 'Left to pay ₹14,84,587 after November\'s EMI; 136 of 180 EMIs paid. Net worth £456,747; Debts shows the card\'s £1,458 too.' },
    { id: 's8a', s: 8, d: D3, tm: '10:05', go: 'proj', jv: { page: 'hdfc', chat: false }, hint: 'Open the Projection.' },
    { id: 's8b', s: 8, d: D3, tm: '10:05', t: 'asm:arun', p: 'proj', hint: 'The fan from £457,951, the engine\'s run of Mon 26 Oct; the milestones and the assumptions. As the admin, tap Arun\'s salary growth, 4.17%.' },
    { id: 's8c', s: 8, d: D3, tm: '10:06', t: 'asmedit', p: 'proj', fill: '4.8', hint: 'Type 4.8 to see before → after, then Cancel, so the figures stay true.' },
    { id: 's8d', s: 8, d: D3, tm: '10:06', t: 'next', p: 'guide', hint: 'Cancelled: 4.17% stays, and so does the engine\'s run.' },
    { id: 's9a', s: 9, d: D3, tm: '10:20', t: 'sugg', p: 'chat', v: { page: 'proj', chat: true }, msg: MSG_WI, hint: 'Ask in the chat: tap the what-if suggestion, or type and press Enter.' },
    { id: 's9b', s: 9, d: D3, tm: '10:20', auto: 1200, hint: 'The engine runs it; nothing is saved.' },
    { id: 's9c', s: 9, d: D3, tm: '10:20', t: 'plan:save', p: 'chat', hint: '2036\'s middle path: £1,233,000 with the flat, against £1,316,000. Save as a plan item is the admin\'s: tap it.' },
    { id: 's9d', s: 9, d: D3, tm: '10:21', t: 'plan:cancel', p: 'chat', hint: 'The plan items list with it. Tap Cancel, so the saved plan stays as it is.' },
    { id: 's9e', s: 9, d: D3, tm: '10:21', t: 'next', p: 'guide', hint: 'Nothing saved: the plan keeps its three items.' },
    { id: 's10a', s: 10, d: D3, tm: '10:26', t: 'asha', p: 'top', v: { page: 'proj', chat: false }, hint: 'Switch the viewer to Asha in the top bar.' },
    { id: 's10b', s: 10, d: D3, tm: '10:26', t: 'sugg', p: 'chat', msg: MSG_WI, asha: true, hint: 'The same Projection as Asha: every edit control is gone. She can still ask a what-if: tap the suggestion.' },
    { id: 's10c', s: 10, d: D3, tm: '10:26', auto: 1200, asha: true, hint: 'The engine runs it for her.' },
    { id: 's10d', s: 10, d: D3, tm: '10:26', asha: true, hint: 'Her what-if, unsaved; only Arun can save it as a plan item. The end of the journey: Restart, or jump to any step.' }
  ];
  /* the side branch at the EMI check-in: Paid off in full, then back to the main path */
  var BR = [
    null,
    { id: 'p1', tm: '09:04', t: 'emi:off', hint: 'Something else is open. Tap Paid off in full.' },
    { id: 'p2', tm: '09:20', t: 'off:eng', hint: 'What was the final amount? Tap the engine\'s figure, ₹15,23,976.' },
    { id: 'p3', tm: '09:21', t: 'off:today', hint: 'Paid on: tap Today, Thu 5 Nov.' },
    { id: 'p4', tm: '09:21', t: 'off:confirm', hint: 'Closing the loan needs a Confirm. Tap Confirm.' },
    { id: 'p5', tm: '09:22', t: 'back', hint: 'The loan is closed in this branch. Back to the main path keeps the journey true.' }
  ];
  var IX = {};
  B.forEach(function (b, i) { IX[b.id] = i; });
  function first(step) { for (var i = 0; i < B.length; i++) if (B[i].s === step) return i; return 0; }

  function world(st) {
    var bi = st.bi;
    return { bi: bi, b: B[bi], br: st.br || 0, at: function (id) { return bi >= IX[id]; }, is: function (id) { return bi === IX[id]; }, asha: !!st.asha, priv: !!st.priv };
  }
  function nwTarget(st) {
    var w = world(st);
    if (w.at('s7b')) return 456747;   /* the figure set: after the Thu 5 Nov HDFC EMI */
    if (w.at('s6g')) return 456493;   /* the figure set: the Barclaycard's £1,458 owed from Sun 1 Nov 08:44 */
    return w.at('s4e') ? 457951 : w.at('s2f') ? 444951 : 439951;
  }

  /* ---------- privacy: a figure in its own span is masked by CSS (.mny); figures inside a sentence are dotted out ---------- */
  function P(t, priv) { return priv ? String(t).replace(/[−+]?([£₹$])\s?[\d,]+(\.\d+)?(k|m)?/g, '$1•••') : t; }

  /* ---------- charts: SVG lines in a 0-100 box, labels and dots as HTML on top ---------- */
  function scaleX(x0, x1) { return function (x) { return ((x - x0) / (x1 - x0)) * 100; }; }
  function scaleY(y0, y1) { return function (y) { return 100 - ((y - y0) / (y1 - y0)) * 100; }; }
  function line(pts, X, Y) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); }).join(' '); }
  function band(lo, hi, X, Y) { return line(hi, X, Y) + ' ' + lo.slice().reverse().map(function (p) { return 'L' + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); }).join(' ') + ' Z'; }
  function grid(vals, Y) { return vals.map(function (v) { return 'M0 ' + Y(v).toFixed(2) + ' L100 ' + Y(v).toFixed(2); }).join(' '); }
  function interp(pts, x) {
    for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); }
    return pts[pts.length - 1][1];
  }
  function chart(o) {
    var c = Object.assign({ cls: '', h: '200px', dGrid: 'M0 0', dBand: 'M0 0', dLine: 'M0 0', dDash: 'M0 0', ys: [], xs: [], dots: [], lbls: [], hasLeg: false, leg: [], ann: false, annL: '0%' }, o);
    ['dGrid', 'dBand', 'dLine', 'dDash'].forEach(function (k) { if (!c[k]) c[k] = 'M0 0'; });
    return c;
  }
  var NOW = 2026.82;
  var PJ = [[NOW, 457951, 457951, 457951]];   /* year, p10, p50, p90 */
  var PJ_FAN = [[2027,451000,499000,547000],[2028,502000,582000,658000],[2029,563000,660000,757000],[2030,627000,747000,862000],[2031,688000,812000,945000],[2032,758000,906000,1082000],[2033,813000,1001000,1210000],[2034,884000,1122000,1343000],[2035,980000,1214000,1492000],[2036,1062000,1316000,1641000],[2037,1146000,1447000,1845000],[2038,1229000,1586000,2042000],[2039,1315000,1718000,2234000],[2040,1423000,1851000,2442000],[2041,1515000,1981000,2658000],[2042,1606000,2107000,2885000],[2043,1685000,2275000,3134000],[2044,1782000,2426000,3324000],[2045,1820000,2636000,3603000],[2046,2008000,2769000,3882000],[2047,2108000,2962000,4106000],[2048,2267000,3193000,4406000],[2049,2324000,3345000,4742000],[2050,2503000,3539000,5153000],[2051,2685000,3733000,5531000],[2052,2662000,3922000,5865000],[2053,2766000,4126000,6115000],[2054,2890000,4297000,6553000],[2055,2954000,4423000,6841000],[2056,3156000,4635000,7141000]];
  PJ = PJ.concat(PJ_FAN);
  var WI_FAN = [[NOW,457951,457951,457951],[2027,451000,499000,547000],[2028,442000,522000,598000],[2029,506000,599000,691000],[2030,576000,677000,786000],[2031,634000,740000,866000],[2032,699000,835000,989000],[2033,758000,922000,1111000],[2034,830000,1034000,1242000],[2035,915000,1132000,1371000],[2036,1001000,1233000,1513000]];
  function col(a, k) { return a.map(function (r) { return [r[0], r[k]]; }); }

  function fanChart(compact) {
    var X = scaleX(NOW, 2056), Y = scaleY(0, 7600000), p50 = col(PJ, 2);
    var dot = function (x, cls) { return { l: X(x).toFixed(2) + '%', tp: Y(interp(p50, x)).toFixed(2) + '%', cls: cls || '' }; };
    var dots = [dot(2029.13), dot(2030.5), dot(2045.75), dot(2051.0), dot(2027.42, 'pc-sq'), dot(2031.42, 'pc-sq')];
    var lbls = compact ? [] : [
      { t: 'Mortgage paid off', l: X(2045.75).toFixed(2) + '%', tp: Y(interp(p50, 2045.75)).toFixed(2) + '%', cls: '' },
      { t: 'Arun retires', l: X(2051).toFixed(2) + '%', tp: Y(interp(p50, 2051)).toFixed(2) + '%', cls: '' }
    ];
    var ticks = [2026.95, 2028.5, 2029.19, 2031.24].map(function (x) { return { l: X(x).toFixed(2) + '%', tp: '100%', cls: 'pc-tick' }; });
    return chart({
      cls: 'onhero', h: compact ? '170px' : '250px',
      dGrid: grid([2000000, 4000000, 6000000], Y), dBand: band(col(PJ, 1), col(PJ, 3), X, Y), dLine: line(p50, X, Y),
      dDash: compact ? '' : 'M' + X(2036).toFixed(2) + ' 4 L' + X(2036).toFixed(2) + ' 100',
      ys: [['£2m', 2000000], ['£4m', 4000000], ['£6m', 6000000]].map(function (y) { return { t: y[0], top: Y(y[1]).toFixed(2) + '%' }; }),
      xs: (compact ? [['Today', NOW], ['2036', 2036], ['2046', 2046], ['2056', 2056]] : [['Today', NOW], ['2031', 2031], ['2036', 2036], ['2041', 2041], ['2046', 2046], ['2051', 2051], ['2056', 2056]]).map(function (x, i, a) { return { t: x[0], l: X(x[1]).toFixed(2) + '%', cls: i === 0 ? 'ax0' : i === a.length - 1 ? 'ax1' : '' }; }),
      dots: dots.concat(ticks), lbls: lbls,
      ann: !compact, annL: X(2036).toFixed(2) + '%',
      hasLeg: true, leg: [{ cls: 'k-line', t: 'Middle path' }, { cls: 'k-band', t: '8 in 10 runs' }, { cls: 'k-dot', t: 'A loan ends, Arun retires' }, { cls: 'k-sq', t: 'A plan item' }, { cls: 'k-tick', t: 'A maturity or rate change' }]
    });
  }
  function wiChart() {
    var X = scaleX(NOW, 2036), Y = scaleY(0, 1700000);
    var base = col(PJ.filter(function (r) { return r[0] <= 2036; }), 2);
    return chart({
      cls: 'oncard', h: '120px',
      dGrid: grid([500000, 1000000, 1500000], Y), dBand: band(col(WI_FAN, 1), col(WI_FAN, 3), X, Y), dLine: line(col(WI_FAN, 2), X, Y), dDash: line(base, X, Y),
      ys: [['£0.5m', 500000], ['£1m', 1000000], ['£1.5m', 1500000]].map(function (y) { return { t: y[0], top: Y(y[1]).toFixed(2) + '%' }; }),
      xs: [['Today', NOW, 'ax0'], ['2031', 2031, ''], ['2036', 2036, 'ax1']].map(function (x) { return { t: x[0], l: X(x[1]).toFixed(2) + '%', cls: x[2] }; }),
      dots: [{ l: X(2028.42).toFixed(2) + '%', tp: Y(interp(col(WI_FAN, 2), 2028.42)).toFixed(2) + '%', cls: 'pc-sq' }, { l: '100%', tp: Y(1233000).toFixed(2) + '%', cls: '' }, { l: '100%', tp: Y(1316000).toFixed(2) + '%', cls: 'pc-grey' }],
      hasLeg: true, leg: [{ cls: 'k-line', t: 'With the flat' }, { cls: 'k-dash', t: 'Today\'s plan' }, { cls: 'k-sq', t: 'Deposit' }, { cls: 'k-band', t: '8 in 10 runs' }]
    });
  }
  function homeChart(corrected) {
    var X = scaleX(2021.46, 2026.9), Y = scaleY(0, 470000);
    var pts = [[2021.46, 330000], [2026.33, 330000], [2026.33, 415000], [2026.82, 415000]];
    if (corrected) pts = pts.concat([[2026.82, 428000], [2026.9, 428000]]); else pts.push([2026.9, 415000]);
    var lb = [{ t: 'Bought £330,000', l: '1%', tp: Y(330000).toFixed(2) + '%', cls: 'pc-left' }, { t: corrected ? '£428,000' : '£415,000', l: X(2026.6).toFixed(2) + '%', tp: Y(corrected ? 428000 : 415000).toFixed(2) + '%', cls: '' }];
    return chart({
      cls: 'oncard', h: '130px', dGrid: grid([400000], Y), dBand: line(pts, X, Y) + ' L100 100 L0 100 Z', dLine: line(pts, X, Y),
      ys: [{ t: '£400k', top: Y(400000).toFixed(2) + '%' }],
      xs: [{ t: 'Jun 2021', l: '0%', cls: 'ax0' }, { t: '2024', l: X(2024).toFixed(2) + '%', cls: '' }, { t: 'Oct 2026', l: '100%', cls: 'ax1' }],
      dots: [{ l: '0%', tp: Y(330000).toFixed(2) + '%', cls: '' }, { l: X(2026.33).toFixed(2) + '%', tp: Y(415000).toFixed(2) + '%', cls: '' }].concat(corrected ? [{ l: '100%', tp: Y(428000).toFixed(2) + '%', cls: '' }] : []),
      lbls: lb, hasLeg: true, leg: [{ cls: 'k-line', t: 'Value as recorded, a step at each valuation' }]
    });
  }
  function hdfcChart(after) {
    var r = 0.085 / 12, E = 39389.58, P0 = 4000000, X = scaleX(2015.58, 2030.5), Y = scaleY(0, 4200000), paid = [], plan = [], now = after ? 136 : 135;
    for (var k = 0; k <= 180; k += 3) {
      var bal = Math.max(0, P0 * Math.pow(1 + r, k) - E * (Math.pow(1 + r, k) - 1) / r), x = 2015.58 + k / 12;
      if (k <= now) paid.push([x, bal]); if (k >= now - (now % 3)) plan.push([x, bal]);
    }
    var nb = after ? 1484586.73 : 1513257.4, nx = 2015.58 + now / 12;
    paid.push([nx, nb]); plan.unshift([nx, nb]);
    return chart({
      cls: 'oncard', h: '150px', dGrid: grid([1000000, 2000000, 3000000], Y), dBand: line(paid, X, Y) + ' L' + X(nx).toFixed(2) + ' 100 L0 100 Z', dLine: line(paid, X, Y), dDash: line(plan, X, Y),
      ys: [['₹10 lakh', 1000000], ['₹20 lakh', 2000000], ['₹30 lakh', 3000000]].map(function (y) { return { t: y[0], top: Y(y[1]).toFixed(2) + '%' }; }),
      xs: [['2015', 2015.58, 'ax0'], ['2020', 2020, ''], ['2025', 2025, ''], ['2030', 2030.5, 'ax1']].map(function (x) { return { t: x[0], l: X(x[1]).toFixed(2) + '%', cls: x[2] }; }),
      dots: [{ l: X(nx).toFixed(2) + '%', tp: Y(nb).toFixed(2) + '%', cls: '' }],
      lbls: [{ t: 'Now ' + inr(nb), l: X(nx).toFixed(2) + '%', tp: Y(nb).toFixed(2) + '%', cls: 'pc-below' }],
      hasLeg: true, leg: [{ cls: 'k-line', t: 'Balance, as paid' }, { cls: 'k-dash', t: 'The original plan' }]
    });
  }

  /* ---------- small builders ---------- */
  function kv(k, v, money) { return { isKv: true, k: k, v: v, vcls: money ? 'mny' : '' }; }
  function para(t, cls) { return { isP: true, t: t, cls: cls || '' }; }
  function note(icon, t, cls) { return { isNote: true, icon: icon, t: t, cls: cls || '' }; }
  function done(k, v) { return { isDone: true, k: k, v: v }; }
  function hdr(t, r) { return { isHdr: true, t: t, r: r || '' }; }
  function lineRow(icon, name, sub, v, o) { return Object.assign({ isLine: true, icon: icon, hasIcon: !!icon, lead: '', hasLead: false, name: name, sub: sub, hasSub: !!sub, v: v || '', vcls: 'mny', hasTag: false, tag: '', tagCls: '' }, o || {}); }

  /* ---------- the build: everything the templates show ---------- */
  function build(st, api) {
    var w = world(st), b = w.b, priv = !!st.priv, door = st.door, A = api.act;
    var brb = w.br ? BR[w.br] : null;
    var curT = brb ? brb.t : b.t;
    var tgt = effTarget(st, door);
    var T = function (k) { return k === tgt ? ' pnext' : ''; };
    var mp = function (t) { return P(t, priv); };
    var date = b.d, time = brb ? brb.tm : b.tm, sdate = date === D1 ? 'Today' : date;
    var nw = st.nw;

    /* ===== the chat ===== */
    var rep = [], msgs = [];
    function card(o) { return Object.assign({ cls: '', anchor: '', hasChip: false, chip: '', chipIcon: 'event_available', right: '', hasOver: false, over: '', hasCancel: false, cancelGo: A('x:cancel'), hasTitle: false, title: '', ok: false, hasTag: false, tag: '', tagCls: 'mp-hold', parts: [], hasActs: false, acts: [], actsCls: '', hasFold: false, fold: [], hasFoot: false, foot: '', footIcon: 'history', at: '' }, o); }
    function act(t, k, cls, icon) { return { t: t, go: A(k), cls: (cls || '') + T(k), icon: icon || '', hasIcon: !!icon }; }
    function chips(list) { return list.map(function (c) { return { t: c[0], go: A(c[1]), cls: (c[2] || '') + T(c[1]) }; }); }
    function aiCards(cards, o) { return Object.assign({ isCards: true, cards: cards, hasText: false, t: '', hasMeta: false, meta: '', metaIcon: 'devices', anchor: '' }, o || {}); }
    function ai(t, meta, icon) { return { isAi: true, t: mp(t), hasMeta: !!meta, meta: meta ? mp(meta) : '', metaIcon: icon || 'functions' }; }
    function sep(t, anchor) { return { isSep: true, t: t, anchor: anchor || '' }; }
    function me(t) { return { isMe: true, t: t }; }
    function typing(t) { return { isTyping: true, t: t || '' }; }

    if (!w.asha) {
      /* the replay of Sun 25 Oct sits above today, where it falls in time */
      if (w.at('s3a')) {
        rep.push({ isBan: true, t: 'Replay of Sun 25 Oct, 10:01. The SBI FD is already in the household\'s figures, so net worth does not move.', anchor: 'replay' });
        rep.push(sep('Sun 25 Oct 10:01'));
      }
      if (w.at('s3b')) rep.push(me(MSG_FD));
      if (w.is('s3b')) rep.push(typing());
      if (w.at('s3c')) {
        var fdq;
        if (w.is('s3c')) fdq = card({ hasOver: true, over: 'New fixed deposit · 1 of 2', hasCancel: true, parts: [done('What is it?', 'Fixed deposit · SBI'), done('How much?', '₹5,00,000 at 7.1%'), { isQ: true, t: 'Whose is it?', chips: chips([['Arun', 'whose:arun'], ['Asha', 'x'], ['Joint', 'x']]) }] });
        else if (w.is('s3e')) fdq = card({ hasOver: true, over: 'New fixed deposit · 2 of 2', hasCancel: true, parts: [done('Whose is it?', 'Arun'), { isQ: true, t: 'Is the interest paid out, or added to the deposit?', chips: chips([['Added in, cumulative', 'int:cum'], ['Paid out', 'x']]) }] });
        else fdq = card({ cls: 'one', hasOver: true, over: 'New fixed deposit', parts: [done('Interest?', 'Cumulative')] });
        var fdc = [fdq];
        if (w.at('s3g')) {
          var saved = w.at('s3h');
          fdc.push(card({ hasOver: true, over: saved ? 'New fixed deposit · saved' : 'New fixed deposit · check it', hasTitle: true, title: 'SBI · ₹5,00,000 at 7.1%', ok: saved,
            parts: saved ? [kv('Owner', 'Arun'), kv('At maturity', '₹6,17,538, Sat 10 Mar 2029', true)] :
              [kv('Owner', 'Arun'), kv('From', 'Tue 10 Mar 2026, 3 years'), kv('Interest', 'Added in, quarterly'), kv('Matures', 'Sat 10 Mar 2029'), kv('At maturity', '₹6,17,538', true), kv('On maturity', 'I\'ll ask you then'), para('MyPaisa\'s engine works out the maturity from the rate, the term and SBI\'s quarterly compounding. Nothing is saved until you tap Confirm.')],
            hasActs: !saved, acts: [act('Confirm', 'confirm', 'cbtn-primary'), act('Edit', 'x'), act('Cancel', 'x', 'cbtn-ghost')],
            hasFoot: saved, foot: 'Saved · in the audit log', at: '10:03' }));
        }
        rep.push(aiCards(fdc, Object.assign({ anchor: 'fd' }, w.at('s3h') ? { hasMeta: true, metaIcon: 'replay', meta: mp('A replay: the FD counts at ₹5,17,908 today, the engine\'s figure, and has since Sun 25 Oct. Net worth stays £444,951.') } : {})));
        if (w.is('s3f')) rep.push(typing());
      }

      /* today: the 09:00 check-in, then the conversation */
      msgs.push(sep(sdate === 'Today' && date === D1 ? 'Today 09:00' : 'Mon 26 Oct 09:00'));
      var vc;
      if (!w.at('s4b')) vc = card({ anchor: 'valcard', hasChip: true, chip: 'Check-ins', right: '2 valuations', hasTitle: true, title: 'Are these still about right?',
        parts: [lineRow('', 'Home, Reading', 'Due Fri 30 Oct', '£415,000', { hasLead: true, lead: '£' }), lineRow('', 'Flat, Pune', 'Due since 15 Jul', '₹1,10,00,000', { hasLead: true, lead: '₹', hasTag: true, tag: 'Overdue', tagCls: 'amber' }), para('Both still right saves each figure as today\'s valuation, exactly as shown.')],
        hasActs: true, acts: [act('Both still right', 'x', 'cbtn-primary'), act('One by one', 'val:one')] });
      else if (!w.at('s4e')) vc = card({ anchor: 'valcard', hasChip: true, chip: 'Check-in', right: 'valuation due', hasTitle: true, title: 'Is £415,000 still about right for Home, Reading?',
        parts: [kv('Last valued', 'Thu 30 Apr, your figure'), kv('Still right saves', '£415,000 as at today', true), para('Next: Flat, Pune, overdue since 15 Jul.')],
        hasActs: true, acts: [act('Still right', 'x', 'cbtn-primary'), act('Change it', 'val:change')] });
      else vc = card({ anchor: 'valcard', hasChip: true, chip: 'Check-in', right: 'answered 09:52', hasTitle: true, ok: true, title: 'Home, Reading',
        parts: [kv('Recorded', '£415,000', true), kv('Now', '£428,000, your estimate', true), para('Answered at 09:52 by your correction on the page. Flat, Pune is still to answer: it stays in What\'s due.')] });
      msgs.push(aiCards([vc], { anchor: 'valcard' }));

      if (w.at('s2b')) { msgs.push(sep('09:40')); msgs.push(me('£5,000 in Monzo savings')); }
      if (w.is('s2b')) msgs.push(typing());
      if (w.at('s2c')) {
        var mc = [w.is('s2c') ? card({ hasOver: true, over: 'New savings · one question', hasCancel: true, parts: [done('What is it?', 'Savings · Monzo'), done('How much?', '£5,000'), { isQ: true, t: 'Whose is it?', chips: chips([['Arun', 'whose:arun'], ['Asha', 'x'], ['Joint', 'x']]) }] })
          : card({ cls: 'one', hasOver: true, over: 'New savings', parts: [done('Whose is it?', 'Arun')] })];
        if (w.at('s2e')) {
          var sv = w.at('s2f');
          mc.push(card({ hasOver: true, over: sv ? 'New record · saved' : 'New record · check it', hasTitle: true, ok: sv, title: 'Instant access savings · Monzo',
            parts: sv ? [kv('Owner', 'Arun'), kv('Value', '£5,000', true)] : [kv('Owner', 'Arun'), kv('Value', '£5,000', true), kv('As of', 'Today, Mon 26 Oct'), kv('Kind', 'Savings, UK, in pounds'), kv('Counts as', 'Liquid'), para('Nothing is saved until you tap Confirm.')],
            hasActs: !sv, acts: [act('Confirm', 'confirm', 'cbtn-primary'), act('Edit', 'x'), act('Cancel', 'x', 'cbtn-ghost')], hasFoot: sv, foot: 'Saved · in the audit log', at: '09:41' }));
        }
        msgs.push(aiCards(mc, w.at('s2f') ? { hasMeta: true, metaIcon: 'devices', meta: mp('Net worth £439,951 → £444,951, on every open door') } : {}));
      }
      if (w.is('s2d')) msgs.push(typing());
      if (w.at('s2f')) msgs.push(ai('Done. Tell me the next one the same way, or send a statement.'));
      if (w.at('s4a')) {
        msgs.push(sep('09:43')); msgs.push(me('What can we get at quickly now?'));
        msgs.push(ai('Money you could get at within days: the new Monzo savings, the Monzo pot, the NRE account in India, and the funds and shares if you sold them. Asha\'s fixed-rate saver unlocks on Mon 14 Dec; the pensions not until 57.'));
        msgs.push(aiCards([card({ hasOver: true, over: 'Liquid now · household', parts: [{ isFig: true, v: '£37,596', s: mp('It was £32,596 before the new savings') }] })], { hasMeta: true, metaIcon: 'functions', meta: 'Figures: the engine' }));
      }
      if (w.at('s4e')) { msgs.push(sep('09:52')); msgs.push(ai('Saved as a correction, your estimate. Net worth is now £457,951, the engine\'s figure. The next valuation check-in is in six months.', 'From your correction on the page')); }

      /* Sun 1 Nov */
      if (w.at('s6a')) msgs.push(sep('Sun 1 Nov 08:40', 'sun'));
      if (w.at('s6c')) msgs.push({ isMeF: true, files: [{ name: 'barclaycard-2026-11-01.pdf', meta: 'PDF · Barclaycard' }, { name: 'monzo-2026-10.csv', meta: 'CSV · Monzo' }], t: 'October\'s statements' });
      if (w.is('s6c')) msgs.push(typing('Reading them…'));
      if (w.at('s6d')) {
        var sOK = w.at('s6g'), aOK = w.at('s6e'), pOK = w.at('s6f');
        var tiles = [['Bills and council tax', '£431', '3 lines'], ['Groceries', '£702', '4 lines'], ['Transport', '£198', '2 lines'], ['Insurance', '£85', '1 line'], ['Eating out', '£236', '3 lines'], ['Shopping', '£189', '2 lines', aOK ? '' : '1 to check'], ['Health', '£24', '1 line'], ['Subscriptions', '£45', '2 lines'], ['Giving', '£50', '1 line'], ['Family support, India', '£222', '1 line'], ['Other', '£64', '2 lines', pOK ? '' : '1 to check']].map(function (t) { return { k: t[0], v: t[1], s: t[2], hasTag: !!t[3], tag: t[3] || '' }; });
        var rec = [['home', 'Mortgage · Nationwide', 'Thu 1 Oct · EMI, matched to its commitment', '£1,456.46'], ['directions_car', 'Car loan · Close Brothers', 'Tue 20 Oct · EMI, matched to its commitment', '£346.55'], ['credit_card', 'Barclaycard payment', 'Tue 20 Oct · Card payment: a transfer', '£1,240.00'], ['savings', 'To Instant access savings · Monzo', 'Mon 26 Oct · A move between your own accounts', '£5,000.00'], ['payments', 'Salary · Arun', 'Wed 28 Oct · Income', '£4,350.00']];
        var sc = sOK ? card({ hasOver: true, over: 'October\'s statements · saved', hasTitle: true, ok: true, title: '22 lines in October\'s budget',
          parts: [kv('Spending', '£2,246 · 11 categories', true), kv('Not counted', '5 lines, recognised'), kv('Remembered', 'AMZN Mktp is Shopping, PAYPAL *EBAY is Other'), note('task_alt', 'It also confirmed two autopay EMIs the weekly digest had assumed paid: the car loan\'s on Tue 20 Oct and the mortgage\'s on Thu 1 Oct.'), hdr('Both files, kept for good'), { isFiles: true, files: [{ name: 'barclaycard-2026-11-01.pdf' }, { name: 'monzo-2026-10.csv' }] }],
          hasFoot: true, foot: 'Saved · in the audit log', at: '08:44' })
          : card({ anchor: 'amb', hasOver: true, over: 'October\'s statements · check them', hasTitle: true, title: mp('Spending £2,246 in 22 lines'),
            parts: [lineRow('credit_card', 'Barclaycard', 'statement of Sun 1 Nov · 16 lines', '£1,458'), lineRow('account_balance', 'Monzo current account', 'October · 11 lines: 6 spending, 5 not', ''), hdr('Two to check'),
              { isAmb: true, name: 'AMZN Mktp', sub: 'Barclaycard · Tue 27 Oct', v: '£165', pill: aOK ? 'Shopping' : 'Shopping?', pillCls: (aOK ? 'picked' : '') + T('amb:amzn'), go: A('amb:amzn'), ok: aOK, hasNote: !aOK, note: 'Amazon Marketplace sells most things. Shopping, unless you change it.' },
              { isAmb: true, name: 'PAYPAL *EBAY', sub: 'Barclaycard · Sun 25 Oct', v: '£42', pill: pOK ? 'Other' : 'Other?', pillCls: (pOK ? 'picked' : '') + T('amb:paypal'), go: A('amb:paypal'), ok: pOK, hasNote: !pOK, note: 'A PayPal payment to eBay. Other, unless you change it.' },
              hdr('By category', mp('£2,246')), { isTiles: true, tiles: tiles }, hdr('Recognised, not spending', '5 lines')]
              .concat(rec.map(function (r) { return lineRow(r[0], r[1], r[2], r[3]); }))
              .concat([para('Both files are kept for good. Nothing is saved until you tap Confirm.')]),
            hasActs: true, acts: [act('Confirm', w.at('s6f') ? 'confirm' : 'x:early', 'cbtn-primary'), act('Edit', 'x'), act('Cancel', 'x', 'cbtn-ghost')] });
        msgs.push(aiCards([sc], Object.assign({ hasText: true, t: 'Both are read. Here is October from them, by category; the two lines I am not sure of are in amber.' }, sOK ? { hasMeta: true, metaIcon: 'devices', meta: mp('Net worth £457,951 → £456,493: the card\'s £1,458 is owed, due Fri 20 Nov') } : {})));
        if (sOK) msgs.push(aiCards([card({ hasOver: true, over: 'Check-in · Car loan EMI', hasTitle: true, title: 'Close Brothers: October\'s EMI paid', hasTag: true, tag: 'Confirmed by the statement',
          parts: [kv('EMI', '£346.55', true), kv('Due', 'Tue 20 Oct · autopay'), kv('Before', 'Assumed paid'), kv('Now', 'Confirmed by the statement'), kv('Balance after it', '£8,938.81', true), note('receipt_long', mp('Your Monzo statement shows £346.55 to Close Brothers on Tue 20 Oct, matched to this EMI. The weekly digest for the week of Mon 19 Oct had listed it as assumed paid; now it is confirmed. Nothing for you to do.'))],
          hasFoot: true, foot: 'Confirmed · in the audit log', at: '08:44' })]));
      }
      if (w.at('s6h')) {
        msgs.push(sep('09:00'));
        var BUD = [['Bills and council tax', 431, 420], ['Groceries', 702, 650], ['Transport', 198, 220], ['Insurance', 85, 85], ['Eating out', 236, 180], ['Shopping', 189, 250], ['Holidays', 0, 400], ['Health', 24, 60], ['Subscriptions', 45, 45], ['Giving', 50, 50], ['Family support, India', 222, 222], ['Other', 64, 100]];
        var closed = w.at('s6i');
        msgs.push(aiCards([closed ? card({ hasOver: true, over: 'Check-in · October closed', hasTitle: true, ok: true, title: 'October closed',
            parts: [kv('Spent', '£2,246 of £2,682', true), kv('Surplus', '£3,072', true), kv('Savings rate', '40.6%'), para('You tapped Nothing else at 09:02. Budget now shows October as closed.')],
            hasActs: true, acts: [act('Undo', 'x', 'cbtn-ghost')], hasFoot: true, foot: 'Closed · in the audit log', at: '09:02' })
          : card({ hasOver: true, over: 'Check-in · Close October', hasTitle: true, title: mp('October: £2,246 spent of £2,682 planned'),
            parts: [{ isMeter: true, w: '83.7%', s: mp('£436 under plan') }, kv('Income', '£7,560', true), kv('EMIs and SIP', '£2,153 and £89', true), kv('Surplus', '£3,072 · plan £2,636', true), kv('Savings rate', '40.6%'),
              { isTable: true, rows: BUD.map(function (r) { return { c: r[0], a: (r[1] > r[2] ? '▲ ' : r[1] < r[2] ? '▼ ' : '') + gbp(r[1]), p: gbp(r[2]) }; }) },
              para(mp('Over plan: Eating out £56, Groceries £52, Bills and council tax £11.'), 't15'), para('From the Barclaycard and Monzo statements, the loans and the SIP. ▲ over plan, ▼ under.', 't15'), { isStrong: true, t: 'Anything not on a statement? Cash, or another bank?' }],
            hasActs: true, actsCls: 'stack', acts: [act('Nothing else: close October', 'close:none', 'cbtn-primary'), act('Add cash spending', 'x'), act('Another bank\'s statement', 'x')] })]));
        if (closed) msgs.push(ai('November is open, on the same plan. I\'ll ask again on Tue 1 Dec.'));
      }

      /* Thu 5 Nov: the EMI check-in, with its side branch */
      if (w.at('s7a')) {
        msgs.push(sep('Thu 5 Nov 09:00', 'thu'));
        var br = w.br, emi;
        var emiOpen = card({ hasChip: true, chip: 'Check-in', right: br ? '' : 'due today', hasTitle: true, title: mp('Was November\'s EMI of ₹39,390 paid?'),
          parts: [kv('Loan', 'HDFC home loan · Pune flat'), kv('Paid saves', '₹39,390 on Thu 5 Nov', true)].concat(br ? [] : [para('One tap on Paid saves exactly this, with Undo.')]),
          hasActs: true, acts: [act('Paid', 'emi:paid', 'cbtn-primary'), act('Something else', 'emi:else', br === 1 ? 'outl' : '', br === 1 ? 'expand_less' : 'expand_more')],
          hasFold: br === 1, fold: [['Not yet', 'I\'ll ask again on Mon 9 Nov', 'x'], ['Different amount', 'Tell me what was paid', 'x'], ['Paid off in full', 'Closes the loan, after a Confirm', 'emi:off']].map(function (f) { return { t: f[0], s: f[1], go: A(f[2]), cls: T(f[2]) }; }) });
        if (br >= 2) {
          var bc = [card({ cls: 'one', hasOver: true, over: 'Check-in · November\'s EMI', parts: [done('Answer', 'Paid off in full')] })];
          if (br === 2) bc.push(card({ hasOver: true, over: 'Paid off in full · 1 of 2', hasCancel: true, parts: [{ isStrong: true, t: 'What was the final amount?' }, para('Use HDFC\'s closing figure, or the engine\'s for Thu 5 Nov.', 't15'), { isBig: true, t: mp('₹15,23,976 · the engine\'s figure'), go: A('off:eng'), cls: T('off:eng') }, { isLinkBtn: true, t: 'Type HDFC\'s figure', go: A('x'), cls: '' }, para('The engine\'s figure: the balance after October\'s EMI, with November\'s interest.')] }));
          if (br === 3) bc.push(card({ hasOver: true, over: 'Paid off in full · 2 of 2', hasCancel: true, parts: [done('Final amount', mp('₹15,23,976')), { isQ: true, t: 'When was it paid?', chips: chips([['Today, Thu 5 Nov', 'off:today'], ['Another day', 'x']]) }] }));
          if (br >= 4) {
            bc = [card({ cls: 'one', hasOver: true, over: 'Paid off in full', parts: [done('Final amount', mp('₹15,23,976')), done('Paid on', 'Thu 5 Nov')] })];
            bc.push(br === 4 ? card({ hasOver: true, over: 'Close the loan · check it', hasTitle: true, title: 'HDFC home loan, paid off in full', parts: [kv('Final payment', '₹15,23,976', true), kv('Paid on', 'Thu 5 Nov'), kv('The loan', 'closes; kept in the history'), kv('Its check-ins', 'end with this one'), kv('Then', 'the projection runs again'), para('Nothing is saved until you tap Confirm.')], hasActs: true, acts: [act('Confirm', 'off:confirm', 'cbtn-primary'), act('Edit', 'x'), act('Cancel', 'x', 'cbtn-ghost')] })
              : card({ hasOver: true, over: 'Loan closed · saved', hasTitle: true, ok: true, title: 'HDFC home loan · closed', parts: [kv('Paid off', '₹15,23,976, Thu 5 Nov', true), kv('Its check-ins', 'ended')], hasFoot: true, foot: 'Saved · in the audit log', at: '09:22' }));
          }
          msgs.push(aiCards(bc));
          if (br === 5) msgs.push(ai('The Pune flat has no loan on it now. The projection ran again, with ₹39,390 a month freed from December.', 'Figures: the engine\'s schedule and projection'));
        } else {
          if (w.at('s7b') && !br) {
            var undo = st.undoAt && (api.now() - st.undoAt < 6000);
            emi = card({ hasChip: true, chip: 'Check-in', right: 'answered 09:12', hasTitle: true, ok: true, title: 'Paid · November\'s EMI',
              parts: [kv('Paid', '₹39,390 on Thu 5 Nov', true), kv('Loan', 'HDFC home loan · Pune flat'), kv('Left to pay', '₹14,84,587', true), para('Left to pay is the engine\'s schedule after this EMI.')],
              hasActs: undo, acts: [act('Undo', 'x:undo', '', 'undo')], hasFoot: true, foot: 'Saved · in the audit log', at: '09:12' });
          } else emi = emiOpen;
          msgs.push(aiCards([emi]));
        }
      }

      /* Thu 5 Nov, 10:20: the what-if and the plan item */
      if (w.at('s9b')) { msgs.push(sep('10:20')); msgs.push(me(MSG_WI)); }
      if (w.is('s9b')) msgs.push(typing());
      if (w.at('s9c')) {
        var wc = [wiCard(!w.at('s9d'), false)];
        if (w.at('s9d')) {
          var cx = w.at('s9e');
          wc.push(card({ hasOver: true, over: cx ? 'New plan item · cancelled' : 'New plan item · check and confirm', hasTitle: true, title: 'Second flat deposit',
            parts: (cx ? [para('Cancelled at 10:21. Nothing is saved; the plan keeps its three items.', 't15')] : [kv('Amount', '−£60,000', true), kv('When', 'Once, Jun 2028'), kv('Currency', 'GBP'), kv('Grows', 'No growth')])
              .concat([hdr(cx ? 'The plan, as saved' : 'The plan with it', cx ? '3 items' : '4 items')])
              .concat(planRows(!cx))
              .concat(cx ? [] : [para('Your words, as a plan item. The engine re-runs the Projection once you confirm; only you can change it later.')]),
            hasActs: !cx, acts: [act('Confirm', 'x', 'cbtn-primary'), act('Change', 'x'), act('Cancel', 'plan:cancel', 'cbtn-ghost')] }));
        }
        msgs.push(aiCards(wc, { hasText: true, t: 'Here\'s the engine\'s run with it.' }));
      }
    } else {
      /* Asha's own conversation: Arun's stays his */
      msgs.push(sep(sdate + ' ' + (w.at('s10c') ? '10:26' : time)));
      if (!w.at('s10c')) msgs.push(ai('Asha\'s own conversation. Ask anything about the household; Arun\'s chat stays his.'));
      if (w.at('s10c')) msgs.push(me(MSG_WI));
      if (w.is('s10c')) msgs.push(typing());
      if (w.at('s10d')) msgs.push(aiCards([wiCard(true, true)], { hasText: true, t: 'Here\'s the engine\'s run with it.' }));
    }
    function planRows(withNew) {
      var r = [['construction', 'Home extension', 'Once, Jun 2027', '−£35,000'], ['redeem', 'Asha\'s annual bonus', 'Every March, 2027 to 2052', '+£3,000'], ['directions_car', 'Replace the car', 'Once, Jun 2031', '−£25,000']];
      var rows = r.map(function (x) { return lineRow(x[0], x[1], x[2], x[3]); });
      if (withNew) rows.push(lineRow('apartment', 'Second flat deposit', 'Once, Jun 2028', '−£60,000', { hasTag: true, tag: 'new, not saved', tagCls: 'mp-pause' }));
      return rows;
    }
    function wiCard(live, asha) {
      return card({ hasOver: true, over: 'What-if · Jun 2028 · not saved', hasTitle: true, title: '£60,000 down on a second flat',
        parts: [{ isChart: true, ch: wiChart() }, kv('2036, with the flat', '£1,233,000', true), kv('2036, today\'s plan', '£1,316,000', true), kv('Middle path', '▼ £83,000 lower', true), para('The engine\'s figures; nothing is saved. £60,000 and June 2028 are your words.')]
          .concat(asha ? [{ isLock: true, t: 'Only Arun can save it as a plan item.' }] : []),
        hasActs: live, acts: asha ? [act('Change it', 'x')] : [act('Save as a plan item', 'plan:save', 'cbtn-primary', 'bookmark_add'), act('Change it', 'x')] });
    }
    /* keep the main list's places steady while the replay grows above it */
    while (rep.length < 6) rep.push({ isNone: true });
    var chatList = rep.concat(msgs).map(function (m) { return Object.assign({ isBan: false, isSep: false, isMe: false, isMeF: false, isTyping: false, isAi: false, isCards: false, isNone: false, anchor: '' }, m); });
    chatList.forEach(function (m) {
      if (priv && typeof m.t === 'string') m.t = P(m.t, true);
      if (m.cards) m.cards.forEach(function (c) {
        if (priv) c.title = P(c.title, true);
        c.parts = c.parts.map(function (p) {
          p = normPart(p);
          if (priv && (p.isDone || p.isP || p.isNote || p.isStrong || p.isBig || p.isQ)) { if (typeof p.v === 'string') p.v = P(p.v, true); if (typeof p.t === 'string') p.t = P(p.t, true); }
          if (priv && p.isLine && typeof p.sub === 'string') p.sub = P(p.sub, true);
          return p;
        });
      });
    });

    /* ===== the composer ===== */
    var sugText = (curT === 'sugg' && !brb) ? b.msg : '';
    var files = w.is('s6b');
    var composer = {
      typed: st.typed || '', ph: door === 'desk' ? (PAGE_ASK[st.v.page] || 'Ask MyPaisa, or tell it something new') : 'Ask MyPaisa',
      onType: api.type('typed'), onKey: api.key('send'),
      hasSug: !!sugText, sug: sugText, sugGo: A('sugg'), sugCls: T('sugg'),
      chips: (door === 'ios' ? [['account_balance', 'Net worth'], ['event_upcoming', 'What\'s due'], ['add_circle', 'Add anything'], ['receipt_long', 'Send a statement']] : [['pie_chart', 'Net worth'], ['event', 'What\'s due'], ['add_circle', 'Add anything'], ['upload_file', 'Send a statement']]).map(function (c) { return { icon: c[0], t: c[1], go: A('x:chip') }; }),
      plusGo: A('plus'), plusCls: T('plus'), sendGo: A('send'), sendCls: (st.typed || files ? 'on' : '') + T('send'),
      hasFiles: files, notFiles: !files, files: [{ name: 'barclaycard-2026-11-01.pdf', meta: 'PDF · 4 pages · 486 KB' }, { name: 'monzo-2026-10.csv', meta: 'CSV · 11 lines' }], filesText: 'October\'s statements'
    };

    /* ===== the strip, the clock ===== */
    var stripN = (date === D3) ? '' : gbp(nw);
    var strip = { lbl: date === D1 ? 'Household · Mon 26 Oct' : date === D2 ? 'Household · prices to Fri 23 Oct' : 'Household', sub: date === D3 ? 'Thu 5 Nov' : '', hasSub: date === D3, hasN: !!stripN, n: stripN,
      hasUp: (w.at('s2f') && !w.at('s3a')) || (w.at('s4e') && !w.at('s5a')), up: w.at('s4e') ? '▲ £13,000 just now' : '▲ £5,000 just now', inr: inr(nw * FX), go: A('tab:home') };

    return {
      w: w, tgt: tgt, time: time, date: date, chat: chatList, composer: composer, strip: strip,
      page: buildPage(st, w, api, T, mp, nw)
    };
  }
  var PAGE_ASK = { home: 'Ask about Home, or tell MyPaisa something new', assets: 'Ask about your assets', homeval: 'Ask about Home, Reading', debts: 'Ask about your debts', hdfc: 'Ask about this loan', budget: 'Ask about the budget', proj: 'Ask about the Projection', act: 'Ask about Activity', run: 'Ask about this run', audit: 'Ask about the audit log', you: 'Ask MyPaisa' };
  var PARTS = ['isKv', 'isP', 'isNote', 'isDone', 'isHdr', 'isLine', 'isQ', 'isAmb', 'isTiles', 'isFiles', 'isMeter', 'isTable', 'isChart', 'isBig', 'isLinkBtn', 'isFig', 'isLock', 'isStrong'];
  function normPart(p) { var o = {}; PARTS.forEach(function (k) { o[k] = false; }); return Object.assign(o, p); }

  /* ---------- where the pulsing next tap is, at each door ---------- */
  var PARENT_PHONE = { home: null, act: null, you: null, assets: 'home', debts: 'home', budget: 'home', proj: 'home', audit: 'home', homeval: 'assets', hdfc: 'debts', run: 'act' };
  var PARENT_DESK = { home: null, assets: null, debts: null, budget: null, proj: null, act: null, audit: null, you: null, homeval: 'assets', hdfc: 'debts', run: 'act' };
  var LINK = { homeval: 'row:home', hdfc: 'row:hdfc', run: 'run:r1235' };
  function linkKey(to) { return LINK[to] || ('link:' + to); }
  function chain(P, par) { var c = [P]; while (par[c[0]]) c.unshift(par[c[0]]); return c; }
  function navTo(st, door, P) {
    var v = st.v, desk = door === 'desk';
    var par = desk ? PARENT_DESK : PARENT_PHONE, c = chain(P, par);
    var cur = (!desk && v.chat) ? null : v.page;
    var i = c.indexOf(cur);
    if (cur === P) return null;
    if (i >= 0) return linkKey(c[i + 1]);
    return (desk ? 'nav:' : 'tab:') + c[0];
  }
  function effTarget(st, door) {
    var b = B[st.bi];
    if (st.br) { var t = BR[st.br].t; if (t === 'back') return 'back'; if (door !== 'desk' && !st.v.chat) return 'tab:chat'; return t; }
    if (b.go) return navTo(st, door, b.go);
    if (!b.t) return null;
    if (b.p === 'guide') return 'next';
    if (b.p === 'top' || b.p === 'signin') return b.t;
    if (b.p === 'chat') return (door !== 'desk' && !st.v.chat) ? 'tab:chat' : b.t;
    var shown = (door === 'desk' || !st.v.chat) && st.v.page === b.p;
    if (!shown) return navTo(st, door, b.p);
    if (b.t === 'edit') return normNum(st.ev) === '428000' ? 'save' : 'field';
    if (b.t === 'asmedit') return st.ea === '4.8' ? 'asm:cancel' : 'asmfield';
    return b.t;
  }
  function normNum(s) { return String(s || '').replace(/[^\d.]/g, ''); }

  /* ---------- the reducer: what a tap does ---------- */
  function go(st, bi, now) {
    var b = B[bi], v = Object.assign({}, st.v, b.v || {});
    var patch = { bi: bi, br: 0, v: v, typed: '', toast: null };
    if (b.ban) patch.banner = { t: b.ban === D2 ? 'Sunday 1 November' : 'Thursday 5 November', until: now + 1700 };
    if (b.id === 's7b') patch.undoAt = now;
    if (b.id === 's4d') patch.ev = '';
    if (b.id === 's8c') patch.ea = '';
    return patch;
  }
  function toast(t, now) { return { toast: { t: t, until: now + 2600 } }; }
  var NOPE = 'Drawn, but not part of this walk-through. Follow the pulsing control, or jump with the step list.';
  function act(st, key, now) {
    var b = B[st.bi], bi = st.bi, door = st.door, tgt = effTarget(st, door);
    var next = function () { return bi + 1 < B.length ? go(st, bi + 1, now) : {}; };
    if (key === '__auto') return b.auto ? next() : {};
    if (key === 'restart') return Object.assign(fresh(st), go(fresh(st), 0, now), { nw: 439951, jump: now });
    if (key.indexOf('step:') === 0) {
      var n = +key.slice(5), fi = first(n), fb = B[fi];
      var p = go(st, fi, now);
      p.v = Object.assign({ page: 'home', chat: false }, fb.v || fb.jv || {});
      if (fb.v && fb.v.chat !== undefined && !fb.v.page) p.v.page = 'home';
      if (n === 3 || n === 4) p.v.page = 'home';
      p.asha = false; p.jump = now; p.nw = nwTarget({ bi: fi }); p.undoAt = 0;
      return p;
    }
    if (key === 'next') { if (st.br) return {}; return next(); }
    if (key === 'branch') { if (b.s !== 7 || st.br) return {}; return { br: 1, brFrom: bi, bi: IX.s7a, v: Object.assign({}, st.v, { chat: true }), toast: null }; }
    if (key === 'back') { if (!st.br) return {}; return { br: 0, bi: IX.s7a, v: Object.assign({}, st.v, { chat: true }), toast: null }; }
    if (key === 'asha') {
      var on = !st.asha, pa = { asha: on };
      if (on && b.id === 's10a') return Object.assign(go(st, bi + 1, now), pa);
      if (!on && b.asha) return Object.assign(go(st, IX.s10a, now), pa);
      return pa;
    }
    if (key === 'theme') return { dark: !st.dark };
    if (key === 'priv') return { priv: !st.priv };
    if (key === 'ccy') return { ccy: st.ccy === 'inr' ? 'gbp' : 'inr' };
    if (key.indexOf('door:') === 0) return { door: key.slice(5) };
    if (key === 'fill') {
      if (b.msg) return { typed: b.msg };
      if (b.id === 's4d') return { ev: '428000' };
      if (b.id === 's8c') return { ea: '4.8' };
      return {};
    }
    /* the branch */
    if (st.br) {
      var bt = BR[st.br].t;
      if (key === bt && st.br < 5) return { br: st.br + 1, toast: null };
      if (key === 'emi:else' && st.br === 1) return {};
      if (key === 'emi:paid' && st.br === 1) return toast('Paid is the main path. Back to the main path is in the bar above.', now);
      if (!isNav(key)) return toast(NOPE, now);
    }
    /* navigation always works; it moves the journey on when it reaches the page the beat asks for */
    if (isNav(key)) {
      var v = navKey(st, key);
      if (!v) return {};
      var patch = { v: v };
      if (b.go && v.page === b.go && (door === 'desk' || !v.chat)) return Object.assign(go(st, bi + 1, now), { v: v });
      if (key === tgt && key === b.t) return Object.assign(go(st, bi + 1, now), { v: v });
      return patch;
    }
    if (key === 'emi:else' && b.id === 's7a') return { br: 1, brFrom: bi, toast: null };
    if (key === 'signin' && b.id === 's1') return next();
    if (key === 'sugg' || key === 'send') {
      if (b.t === 'sugg' || (b.t === 'send' && key === 'send')) return next();
      if (st.typed) return Object.assign(toast('This prototype follows a script: tap the pulsing control.', now), { typed: '' });
      return toast(NOPE, now);
    }
    if (key === 'fig' && b.id === 's4c') return next();
    if (key === 'save' && b.id === 's4d') return normNum(st.ev) === '428000' ? next() : toast('Type 428000 first: the figure set\'s correction.', now);
    if (key === 'cancel' && b.id === 's4d') return go(st, IX.s4c, now);
    if (key === 'asm:arun' && b.id === 's8b') return next();
    if (key === 'asm:cancel' && b.id === 's8c') return Object.assign(next(), toast('Cancelled. Nothing changed: 4.17% stays, and so does the engine\'s run.', now));
    if (key === 'asm:save' && b.id === 's8c') return toast('Save would run the Projection again. This walk-through cancels, so the figures stay true.', now);
    if (key === 'x:early') return toast('Pick the two amber lines first.', now);
    if (key === 'x:undo') return toast('Undo would reverse it with a new event; this walk-through keeps Paid.', now);
    if (key.indexOf('kp:') === 0) {
      var f = b.id === 's4d' ? 'ev' : b.id === 's8c' ? 'ea' : null;
      if (!f) return {};
      var cur = st[f] || '', k = key.slice(3);
      var o = {}; o[f] = k === 'del' ? cur.slice(0, -1) : (cur + k).slice(0, 9);
      return o;
    }
    if (key === b.t) return next();
    return toast(NOPE, now);
  }
  function isNav(k) { return /^(nav|tab|link|row|run):/.test(k) || k === 'pback'; }
  function navKey(st, key) {
    var v = Object.assign({}, st.v);
    if (key === 'pback') { var par = st.door === 'desk' ? PARENT_DESK : PARENT_PHONE; var to = par[v.page] || 'home'; v.page = to; v.chat = false; return v; }
    var p = key.split(':'), k = p[0], t = p[1];
    if (k === 'tab' && t === 'chat') { v.chat = true; return v; }
    if (k === 'row' && t === 'home') t = 'homeval';
    if (k === 'run') t = 'run';
    if (st.v.page === 'signin') return null;
    v.page = t; v.chat = false;
    return v;
  }
  function fresh(st) { return { bi: 0, br: 0, brFrom: 0, door: st ? st.door : 'desk', dark: st ? st.dark : false, priv: false, asha: false, v: { page: 'signin', chat: false }, typed: '', ev: '', ea: '', undoAt: 0, banner: null, toast: null, nw: 439951, ccy: 'gbp', jump: 0 }; }

  window.MP4 = { B: B, BR: BR, STEPS: STEPS, STEP_T: STEP_T, IX: IX, FX: FX, gbp: gbp, inr: inr, P: P, pct: pct, kv: kv, para: para, note: note, hdr: hdr, lineRow: lineRow, normPart: normPart,
    world: world, nwTarget: nwTarget, build: build, act: act, fresh: fresh, effTarget: effTarget, first: first,
    charts: { fan: fanChart, wi: wiChart, home: homeChart, hdfc: hdfcChart } };
  var buildPage = function () { return window.MP4P ? window.MP4P.page.apply(null, arguments) : null; };
})();
