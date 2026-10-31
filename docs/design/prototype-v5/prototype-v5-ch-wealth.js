/* MyPaisa · Prototype v5 (MA-291): the wealth chapters, phases 2 to 7 and 9. Prototype v4's ten steps carried
   into the v5 API, with the v4 boards it never walked: the first record by talking, the setup day replayed, a
   correction in place, a new kind behind the second check; rupees and a maturing deposit; the debts and their
   check-ins; the investments priced; the budget and its month close; the Projection, its plans and the Budget
   forecast; and the whole dashboard with its reports, the SQL copy, the Excel importer and the household learning.

   Pages: home (the Overview, dashboard 1a), assets, asset/<id>, debts, debt/<id>, budget, projection (Net worth,
   Plans, Budget forecast), plans, reports. Every total is ctx.W's (the core's ledger as of the step's time); every
   record figure is household-v4.json's, every plan figure future-plans-v4.json's, and the few the v4 sets lack are
   wealth-v5.json's (make_wealth.py, each claim asserted). Claude never produces a number: the meta line under an
   answer says where its figures came from. Illustrative figures and names. */
(function () {
  'use strict';
  var M = window.MP5, K = window.MP5K;
  if (!M || !K) return;
  var FX = 112.5;

  /* ---------- styles: one block, every selector under .pv5-wealth, every colour a token ---------- */
  if (!document.getElementById('pv5-wealth')) {
    var css = document.createElement('style');
    css.id = 'pv5-wealth';
    css.textContent = [
      '.pv5-wealth { min-width: 0; }',
      '.pv5-wealth .cols { column-width: 330px; column-count: 2; column-gap: 16px; }',
      '.pv5-wealth .cols > * { break-inside: avoid; margin: 0 0 16px; display: block; }',
      '.pv5-wealth .mp-card { min-width: 0; }',
      /* the kit wraps each chart stroke in its own div, so an svg sizes from its height alone: stretch it to the box */
      '.pv5-wealth .mp-chartbox svg { width: 100%; display: block; overflow: visible; }',
      '.pv5-wealth .mp-seg-i { white-space: nowrap; }',
      /* .btn-reset (loaded after ios.css) zeroes a chat card fold\'s padding: give it back */
      '.pv5-wealth .ccard-fold.btn-reset { padding: 12px 16px; width: 100%; }',
      '.pv5-wealth .hb { display: flex; flex-direction: column; gap: 5px; padding: 6px 0; }',
      '.pv5-wealth .hb-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }',
      '.pv5-wealth .hb-t { font: 600 15px/20px var(--mp-font); }',
      '.pv5-wealth .hb-v { font: 700 17px/22px var(--mp-font-round); font-variant-numeric: tabular-nums; white-space: nowrap; }',
      '.pv5-wealth .bar.grey > i { background: var(--mp-ink-3); }',
      '.pv5-wealth .stack { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--mp-track); margin: 4px 0 8px; }',
      '.pv5-wealth .stack > i { display: block; height: 100%; }',
      '.pv5-wealth .sw { width: 10px; height: 10px; border-radius: 3px; flex: none; display: inline-block; }',
      '.pv5-wealth .c1 { background: var(--mp-chart-line); } .pv5-wealth .c2 { background: var(--mp-chart-2); } .pv5-wealth .c3 { background: var(--mp-chart-3); } .pv5-wealth .c4 { background: var(--mp-chart-4); } .pv5-wealth .c5 { background: var(--mp-chart-5); }',
      '.pv5-wealth .due { display: flex; gap: 12px; align-items: center; padding: 8px 0; }',
      '.pv5-wealth .due + .due { box-shadow: inset 0 1px 0 var(--mp-line); }',
      '.pv5-wealth .due-d { width: 44px; flex: none; display: flex; flex-direction: column; align-items: center; border-radius: 10px; background: var(--mp-surface-2); padding: 4px 0; font: 600 11px/14px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .due-d b { font: 800 18px/20px var(--mp-font-round); color: var(--mp-ink); }',
      '.pv5-wealth .due-d.today { background: var(--mp-accent); color: var(--mp-on-accent); } .pv5-wealth .due-d.today b { color: var(--mp-on-accent); }',
      '.pv5-wealth .cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px 16px; }',
      '.pv5-wealth .cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }',
      '.pv5-wealth .cell-k { font: 400 13px/18px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .cell-v { font: 700 17px/22px var(--mp-font-round); font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .cell-s { font: 400 13px/18px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .tags { display: flex; gap: 6px; flex-wrap: wrap; }',
      '.pv5-wealth .big { font: 800 34px/40px var(--mp-font-round); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .okline { display: flex; gap: 8px; align-items: flex-start; background: var(--mp-add-bg); color: var(--mp-ink); border-radius: 12px; padding: 10px 12px; font: 400 14px/19px var(--mp-font); }',
      '.pv5-wealth .okline .ms { color: var(--mp-add); font-size: 18px; }',
      '.pv5-wealth .flag { display: flex; gap: 8px; align-items: flex-start; background: var(--mp-pause-bg); color: var(--mp-pause); border-radius: 12px; padding: 8px 12px; font: 600 14px/19px var(--mp-font); }',
      '.pv5-wealth .lock { display: flex; gap: 8px; align-items: center; background: var(--mp-surface-2); color: var(--mp-ink-2); border-radius: 12px; padding: 8px 12px; font: 400 14px/19px var(--mp-font); }',
      '.pv5-wealth .lock .ms { font-size: 18px; }',
      '.pv5-wealth .edit { display: flex; flex-direction: column; gap: 10px; }',
      '.pv5-wealth .field { display: flex; align-items: center; gap: 6px; border-radius: 12px; padding: 8px 12px; background: var(--mp-surface-2); box-shadow: inset 0 0 0 2px var(--mp-accent); font: 800 28px/34px var(--mp-font-round); font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .field .caret { width: 2px; height: 28px; background: var(--mp-accent); display: inline-block; }',
      '.pv5-wealth .ba { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font: 600 15px/20px var(--mp-font); }',
      '.pv5-wealth .btns { display: flex; gap: 8px; flex-wrap: wrap; }',
      '.pv5-wealth .heroseg { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }',
      '.pv5-wealth .mp-hero .mp-seg-i[disabled], .pv5-wealth .mp-seg-i.dim { opacity: 0.55; }',
      '.pv5-wealth .mp-hero .mp-ink2, .pv5-wealth .mp-hero .mp-foot.mp-ink2, .pv5-wealth .mp-hero .mp-chartaxis { color: var(--mp-hero-ink-2); }',
      '.pv5-wealth .mp-hero .mp-chartdot { background: var(--mp-hero-ink); }',
      '.pv5-wealth .hstats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-top: 6px; }',
      '.pv5-wealth .hstat { background: var(--mp-hero-2); border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }',
      '.pv5-wealth .hstat-k { font: 400 12px/16px var(--mp-font); color: var(--mp-hero-ink-2); }',
      '.pv5-wealth .hstat-v { font: 700 17px/22px var(--mp-font-round); color: var(--mp-hero-ink); font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .hstat-s { font: 400 12px/16px var(--mp-font); color: var(--mp-hero-ink-2); }',
      '.pv5-wealth .delta { display: inline-flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }',
      '.pv5-wealth .delta .upchip, .pv5-wealth .delta .dnchip { border-radius: 999px; padding: 2px 8px; font: 700 13px/18px var(--mp-font); }',
      '.pv5-wealth .legend { display: flex; gap: 6px 14px; flex-wrap: wrap; font: 400 12px/16px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .legend span { display: inline-flex; align-items: center; gap: 5px; }',
      '.pv5-wealth .mp-hero .legend { color: var(--mp-hero-ink-2); }',
      '.pv5-wealth .k-line { width: 14px; height: 3px; border-radius: 2px; background: var(--mp-coral); display: inline-block; }',
      '.pv5-wealth .k-band { width: 14px; height: 10px; border-radius: 3px; background: var(--mp-hero-area); display: inline-block; box-shadow: inset 0 0 0 1px var(--mp-hero-2); }',
      '.pv5-wealth .k-dash { width: 14px; height: 0; border-top: 2px dashed var(--mp-ink-3); display: inline-block; }',
      '.pv5-wealth .runs { position: relative; height: 10px; border-radius: 999px; background: var(--mp-track); margin: 6px 0 2px; }',
      '.pv5-wealth .runs > i { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 999px; background: var(--mp-chart-2); }',
      '.pv5-wealth .axis5 { display: flex; justify-content: space-between; font: 500 12px/16px var(--mp-font); color: var(--mp-ink-2); }',
      /* the Budget forecast's leanest month each year (1a) */
      '.pv5-wealth .lean { position: relative; height: 190px; margin: 8px 0 0 34px; }',
      '.pv5-wealth .lean-bar { position: absolute; bottom: 0; width: 3.2%; transform: translateX(-50%); border-radius: 3px 3px 0 0; background: var(--mp-chart-line); }',
      '.pv5-wealth .lean-bar.neg { border-radius: 0 0 3px 3px; background: var(--mp-ink-3); }',
      '.pv5-wealth .lean-bar.low { background: var(--mp-ink-3); }',
      '.pv5-wealth .lean-bar.past { background: var(--mp-chart-line); opacity: 0.55; }',
      '.pv5-wealth .lean-bar.sel { box-shadow: 0 0 0 2px var(--mp-focus); }',
      '.pv5-wealth .lean-y { position: absolute; left: -34px; transform: translateY(-50%); font: 500 11px/14px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .lean-line { position: absolute; left: 0; right: 0; height: 0; border-top: 1px solid var(--mp-chart-grid); }',
      '.pv5-wealth .lean-floor { border-top: 2px dashed var(--mp-pause); }',
      '.pv5-wealth .lean-mk { position: absolute; transform: translate(-50%, 0); font: 700 11px/14px var(--mp-font); color: var(--mp-pause); }',
      '.pv5-wealth .lean-x { position: relative; height: 16px; margin-left: 34px; font: 500 12px/16px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .lean-x span { position: absolute; transform: translateX(-50%); white-space: nowrap; }',
      '.pv5-wealth .yr { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; align-items: baseline; }',
      '.pv5-wealth .yr + .yr { box-shadow: inset 0 1px 0 var(--mp-line); }',
      '.pv5-wealth .yr-t { font: 600 15px/20px var(--mp-font); } .pv5-wealth .yr-s { font: 400 13px/18px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .yr-v { font: 700 15px/20px var(--mp-font-round); font-variant-numeric: tabular-nums; white-space: nowrap; }',
      '.pv5-wealth .yr.sum { box-shadow: inset 0 2px 0 var(--mp-ink-3); }',
      '.pv5-wealth .months { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px; }',
      '.pv5-wealth .mo { background: var(--mp-surface-2); border-radius: 10px; padding: 6px 10px; display: flex; justify-content: space-between; gap: 8px; font: 400 13px/18px var(--mp-font); }',
      '.pv5-wealth .mo b { font-weight: 700; font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .mo.low b { color: var(--mp-pause); }',
      /* the Plans tab's lanes (3a) */
      '.pv5-wealth .lane { display: grid; grid-template-columns: minmax(150px, 38%) 1fr; gap: 10px; align-items: center; padding: 8px 0; }',
      '.pv5-wealth .lane + .lane { box-shadow: inset 0 1px 0 var(--mp-line); }',
      '.pv5-wealth .lane-n { display: flex; gap: 8px; align-items: flex-start; min-width: 0; }',
      '.pv5-wealth .lane-n .ms { font-size: 20px; color: var(--mp-ink-2); }',
      '.pv5-wealth .lane-t { position: relative; height: 22px; border-radius: 6px; background: var(--mp-surface-2); }',
      '.pv5-wealth .lane-t i { position: absolute; top: 5px; height: 12px; border-radius: 4px; display: block; }',
      '.pv5-wealth .lane-t i.out { background: var(--mp-chart-line); } .pv5-wealth .lane-t i.in { background: var(--mp-up); } .pv5-wealth .lane-t i.pot { background: var(--mp-chart-5); }',
      '.pv5-wealth .lane-t i.once { width: 10px; height: 10px; top: 6px; border-radius: 50%; transform: translateX(-50%); }',
      '.pv5-wealth .lane-t i.evt { width: 10px; height: 10px; top: 6px; border-radius: 2px; transform: translateX(-50%) rotate(45deg); background: var(--mp-chart-4); }',
      '.pv5-wealth .lane-t i.step { width: 3px; top: 2px; height: 18px; border-radius: 2px; background: var(--mp-chart-2); }',
      '.pv5-wealth .lane-t i.tick { width: 2px; top: 4px; height: 14px; border-radius: 1px; background: var(--mp-up); }',
      '.pv5-wealth .lane-t i.paused { opacity: 0.4; }',
      '.pv5-wealth .lane-x { display: grid; grid-template-columns: minmax(150px, 38%) 1fr; gap: 10px; }',
      '.pv5-wealth .lane-x > div { position: relative; height: 16px; font: 500 12px/16px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth .lane-x span { position: absolute; transform: translateX(-50%); white-space: nowrap; }',
      '.pv5-wealth .lane-x span:first-child { transform: none; } .pv5-wealth .lane-x span:last-child { transform: translateX(-100%); }',
      /* a lane stacks (its name, then its bar) whenever the card is too narrow for the name beside a readable bar */
      '@container (max-width: 600px) { .pv5-wealth .lane, .pv5-wealth .lane-x { grid-template-columns: minmax(0, 1fr); gap: 6px; } .pv5-wealth .lane-x > div:first-child { display: none; } }',
      /* chat-card pieces */
      '.pv5-wealth .way { border-radius: 14px; background: var(--mp-surface-2); padding: 12px; display: flex; flex-direction: column; gap: 6px; }',
      '.pv5-wealth .way-h { display: flex; gap: 10px; align-items: flex-start; }',
      '.pv5-wealth .way-n { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--mp-hero); color: var(--mp-hero-ink); font: 700 13px/1 var(--mp-font); }',
      '.pv5-wealth .amb { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 12px; background: var(--mp-pause-bg); }',
      '.pv5-wealth .amb.ok { background: var(--mp-surface-2); }',
      '.pv5-wealth .pill { border: 0; border-radius: 999px; min-height: 36px; padding: 0 12px; font: 600 14px/18px var(--mp-font); background: var(--mp-surface); color: var(--mp-pause); box-shadow: inset 0 0 0 1.5px var(--mp-pause); cursor: pointer; white-space: nowrap; }',
      '.pv5-wealth .amb.ok .pill { color: var(--mp-add); box-shadow: inset 0 0 0 1.5px var(--mp-add); }',
      '.pv5-wealth .ctiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 6px; }',
      '.pv5-wealth .ctile { background: var(--mp-surface-2); border-radius: 10px; padding: 6px 9px; display: flex; flex-direction: column; min-width: 0; }',
      '.pv5-wealth .ctile b { font: 700 15px/20px var(--mp-font-round); font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .ctile > span { font: 400 12px/16px var(--mp-font); color: var(--mp-ink-2); }',
      '.pv5-wealth.fx > .mp-row { padding-left: 0; padding-right: 0; }',
      '.pv5-wealth .ctile .amber { align-self: flex-start; font: 600 11px/16px var(--mp-font); }',
      '.pv5-wealth .btable { display: flex; flex-direction: column; }',
      '.pv5-wealth .brow { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; padding: 4px 0; font: 400 14px/19px var(--mp-font); }',
      '.pv5-wealth .brow > :not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }',
      '.pv5-wealth .brow.h { font-weight: 600; color: var(--mp-ink-2); font-size: 12px; }',
      '.pv5-wealth .meter { height: 10px; border-radius: 999px; background: var(--mp-track); overflow: hidden; }',
      '.pv5-wealth .meter > i { display: block; height: 100%; background: var(--mp-meter); border-radius: 999px; }',
      '.pv5-wealth .bud { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 8px 0; }',
      '.pv5-wealth .bud + .bud { box-shadow: inset 0 1px 0 var(--mp-line); }',
      '.pv5-wealth .bud .bar { grid-column: 1 / -1; }',
      '.pv5-wealth .bud .bar.over > i { background: var(--mp-chart-4); }',
      '.pv5-wealth .files { display: flex; gap: 6px; flex-wrap: wrap; }',
      '.pv5-wealth .file { display: inline-flex; gap: 6px; align-items: center; background: var(--mp-surface-2); border-radius: 10px; padding: 6px 10px; font: 500 13px/18px var(--mp-font); }',
      '.pv5-wealth .file .ms { font-size: 18px; color: var(--mp-accent); }',
      '.pv5-wealth .seq { display: flex; flex-direction: column; gap: 8px; }',
      '.pv5-wealth .seq > div { display: flex; gap: 10px; }',
      '.pv5-wealth .seq b { width: 66px; flex: none; font: 700 13px/18px var(--mp-font); }',
      '.pv5-wealth .sql { font: 400 12px/17px ui-monospace, "SF Mono", Menlo, monospace; white-space: pre-wrap; word-break: break-word; color: var(--mp-ink-2); }',
      '.pv5-wealth.sheetc { display: flex; flex-direction: column; gap: 10px; }',
      '.pv5-wealth .apple { min-height: 50px; border: 0; border-radius: 14px; background: var(--mp-ink); color: var(--mp-bg); font: 600 17px/22px var(--mp-font); display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }',
      '.pv5-wealth .rep { display: flex; gap: 12px; align-items: center; padding: 10px 0; }',
      '.pv5-wealth .rep + .rep { box-shadow: inset 0 1px 0 var(--mp-line); }',
      '.pv5-wealth .fmt { border: 0; border-radius: 10px; min-height: 44px; min-width: 52px; padding: 0 10px; background: var(--mp-surface-2); color: var(--mp-accent); font: 600 13px/18px var(--mp-font); cursor: pointer; }',
      /* MA-295: chart redesign options A · Pulse, B · Editorial, C · Modular */
      '.pv5-wealth .hpulse { margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--mp-hero-2); display: flex; flex-direction: column; gap: 6px; }',
      '.pv5-wealth .hpulse-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; font: 600 12px/16px var(--mp-font); color: var(--mp-hero-ink-2); }',
      '.pv5-wealth .hpulse-bars { position: relative; display: flex; gap: 6px; height: 58px; align-items: flex-end; padding: 6px 0 0; box-sizing: border-box; }',
      '.pv5-wealth .hpulse-col { flex: 1 1 0; min-width: 0; border-radius: 5px 5px 2px 2px; background: var(--mp-hero-2); box-shadow: inset 0 2px 0 var(--mp-hero-ink-2); min-height: 14px; display: block; }',
      '.pv5-wealth .hpulse-col.now { background: color-mix(in srgb, var(--mp-coral) 38%, var(--mp-hero-2)); box-shadow: inset 0 3px 0 var(--mp-coral); }',
      '.pv5-wealth .hb-pill { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px; background: var(--mp-surface-2); color: var(--mp-ink-2); font: 600 11.5px/16px var(--mp-font); font-variant-numeric: tabular-nums; margin-left: 6px; vertical-align: 1px; }',
      '.charts-a .pv5-wealth .stack { gap: 4px; height: 14px; background: transparent; border-radius: 0; overflow: visible; }',
      '.charts-a .pv5-wealth .stack > i { border-radius: 999px; }',
      '.charts-b .pv5-wealth .stack { height: 14px; border-radius: 4px; padding: 2px; gap: 2px; background: var(--mp-track); box-shadow: inset 0 0 0 1px var(--mp-line); box-sizing: border-box; }',
      '.charts-b .pv5-wealth .stack > i { border-radius: 2px; }',
      '.charts-a .pv5-wealth .k-band, .charts-b .pv5-wealth .k-band, .charts-c .pv5-wealth .k-band { background: var(--mp-band); box-shadow: none; }',
      '.charts-a .pv5-wealth .runs { height: 10px; box-shadow: inset 0 0 0 1px var(--mp-line); overflow: visible; }',
      '.charts-a .pv5-wealth .runs > i.r1 { background: var(--mp-chart-2); } .charts-a .pv5-wealth .runs > i.r2 { background: var(--mp-chart-4); } .charts-a .pv5-wealth .runs > i.r3 { background: var(--mp-chart-line); }',
      '.pv5-wealth .runs-dot { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--mp-surface); box-shadow: inset 0 0 0 2.5px var(--mp-chart-line); }',
      '.pv5-wealth .runs-dot.r1 { box-shadow: inset 0 0 0 2.5px var(--mp-chart-2); } .pv5-wealth .runs-dot.r2 { box-shadow: inset 0 0 0 2.5px var(--mp-chart-4); }',
      '.charts-b .pv5-wealth .runs { height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--mp-line); display: flex; align-items: center; padding: 0 2px; box-sizing: border-box; overflow: visible; }',
      '.charts-b .pv5-wealth .runs > i { top: 3px; bottom: 3px; border-radius: 2px; background: var(--mp-chart-line); }',
      '.pv5-wealth .runs-tick { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; background: var(--mp-ink); border-radius: 1px; }',
      '.charts-a .pv5-wealth .lean, .charts-b .pv5-wealth .lean, .charts-c .pv5-wealth .lean { height: 214px; margin: 10px 0 0 42px; }',
      '.charts-a .pv5-wealth .lean-x, .charts-b .pv5-wealth .lean-x, .charts-c .pv5-wealth .lean-x { margin-left: 42px; }',
      '.charts-a .pv5-wealth .lean-y, .charts-b .pv5-wealth .lean-y, .charts-c .pv5-wealth .lean-y { left: -42px; width: 36px; text-align: right; }',
      '.charts-a .pv5-wealth .lean-bar { width: 3.4%; border-radius: 999px 999px 3px 3px; }',
      '.charts-a .pv5-wealth .lean-bar.neg { border-radius: 3px 3px 999px 999px; }',
      '.charts-a .pv5-wealth .lean-bar.low, .charts-c .pv5-wealth .lean-bar.low { background: var(--mp-chart-4); }',
      '.charts-b .pv5-wealth .lean-line:not(.lean-floor) { border-top-style: dashed; }',
      '.pv5-wealth .lean-stem { position: absolute; width: 2px; transform: translateX(-50%); background: var(--mp-chart-line); border-radius: 1px; }',
      '.pv5-wealth .lean-stem.low { background: var(--mp-chart-4); } .pv5-wealth .lean-stem.past { opacity: 0.55; }',
      '.pv5-wealth .lean-dot { position: absolute; width: 8px; height: 8px; transform: translate(-50%, 50%); border-radius: 50%; background: var(--mp-chart-line); box-shadow: 0 0 0 2px var(--mp-surface); }',
      '.pv5-wealth .lean-dot.low { background: var(--mp-surface); box-shadow: inset 0 0 0 2.5px var(--mp-chart-4); }',
      '.pv5-wealth .lean-dot.sel, .pv5-wealth .lean-bar.sel { box-shadow: 0 0 0 2px var(--mp-focus); }',
      '.pv5-wealth .lean-slot { position: absolute; top: 0; bottom: 0; width: 3.6%; transform: translateX(-50%); background: var(--mp-surface-2); border-radius: 3px; opacity: 0.55; }',
      '.charts-c .pv5-wealth .lean-bar { width: 3.6%; border-radius: 3px 3px 0 0; box-shadow: inset 0 3px 0 var(--mp-ink); }',
      '.charts-c .pv5-wealth .lean-bar.neg { border-radius: 0 0 3px 3px; box-shadow: inset 0 -3px 0 var(--mp-ink); }'
    ].join('\n');
    document.head.appendChild(css);
  }

  /* ---------- helpers ---------- */
  function hh(ctx) { return (ctx.D && ctx.D.household) || window.MP5D.household || {}; }
  function fp(ctx) { return (ctx.D && ctx.D.plans) || (window.MP5D && window.MP5D.plans) || {}; }
  function fc(ctx) { return (ctx.D && ctx.D.forecaster) || (window.MP5D && window.MP5D.forecaster) || {}; }
  function wv(ctx) { return (ctx.D && ctx.D.wealth) || (window.MP5D && window.MP5D.wealth) || null; }
  function rhe(x) { var f = Math.floor(x); return Math.abs(x - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); }
  var g = function (n, o) { return K.gbp(n, o); };
  var ri = function (n, o) { return K.inr(n, o); };
  function mny(s) { return K.mny(s); }
  function inrDp(n) { var i = Math.floor(n), d = Math.round((n - i) * 100); return mny(K.inr(i, { raw: true }) + '.' + (d < 10 ? '0' : '') + d); }
  function sg(n) { return K.gbp(n, { sign: true }); }
  function at(ctx, iso) { return ctx.t >= iso; }
  var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function wd(iso) { var p = iso.split('-'); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()]; }
  function dl(iso, yr) { var p = iso.split('-'); return wd(iso) + ' ' + (+p[2]) + ' ' + MONS[+p[1] - 1] + (yr ? ' ' + p[0] : ''); }
  function bk(t, page) { var h = M.state && M.state().hist; return { t: t, go: h && h.length ? 'back' : 'nav:' + page }; }
  function wrap(html) { return '<div class="pv5-wealth fx col g16">' + html + '</div>'; }
  function wc(html) { return '<div class="pv5-wealth fx col g10">' + html + '</div>'; }
  function pct(a, b) { return Math.round((a / b) * 100) + '%'; }
  function hb(t, v, frac, sub, cls, opts) {
    var m = K.mode(), o = opts || {};
    var pill = m === 'a' && o.pill ? '<span class="hb-pill">' + o.pill + '</span>' : '';
    var barOpts = m === 'b' && o.tick != null ? { tick: o.tick } : o.barOpts || null;
    return '<div class="hb"><div class="hb-top"><span class="hb-t">' + t + pill + '</span><span class="hb-v">' + v + '</span></div>' + K.bar(frac, cls, barOpts) + (sub ? '<span class="mp-foot mp-ink2">' + sub + '</span>' : '') + '</div>';
  }
  function cells(list) { return '<div class="cells">' + list.map(function (c) { return '<div class="cell"><span class="cell-k">' + c[0] + '</span><span class="cell-v">' + c[1] + '</span>' + (c[2] ? '<span class="cell-s">' + c[2] + '</span>' : '') + '</div>'; }).join('') + '</div>'; }
  function lead(t) { return '<span class="mp-row-lead" style="background:var(--mp-surface-2);color:var(--mp-ink)">' + t + '</span>'; }
  function okline(t) { return '<div class="okline">' + K.ms('check_circle') + '<span>' + t + '</span></div>'; }
  function flag(t) { return '<div class="flag">' + K.ms('warning') + '<span>' + t + '</span></div>'; }
  function lockline(t) { return '<div class="lock">' + K.ms('lock') + '<span>' + t + '</span></div>'; }
  function toast(t) { return function (st, MP5) { MP5.toast(t); }; }
  /* after a tap opens a new card, bring it into its scroller's view (the core keeps the scroll of a step it redraws) */
  function jumpTo(id) {
    setTimeout(function () {
      var e = document.getElementById(id), box = e && e.closest('.pscroll[data-scroll]');
      if (!e || !box) return;
      var sc = e.getBoundingClientRect().height / (e.offsetHeight || 1) || 1;
      box.scrollTop += (e.getBoundingClientRect().top - box.getBoundingClientRect().top) / sc - 90;
    }, 30);
  }
  function openK(k, more, jump) { return function (st) { st.open[k] = true; if (more) more(st); if (jump) jumpTo(jump); }; }
  var RATE = function () { return mny('£1') + ' = ' + mny('₹112.50'); };
  var ILLUS = 'Illustrative figures. Figures from the engine and the price registry; nothing here can trade.';

  /* ---------- the household's records, as of the step's time ---------- */
  var LEAD = { balanced: 'BA', nasdaq: 'NQ', robotics: 'RB', silver: 'SI', ppfas: 'PP', infosys: 'IN', monzo_savings: 'MZ', pot: 'MP', nre: 'NR', home: 'HM', pune: 'FP', saver: 'NW', sbi_fd: 'FD', ppf: 'PF', lic: 'LI', pension_arun: 'AV', sipp_asha: 'VG' };
  var GROUP = { balanced: 'inv', nasdaq: 'inv', robotics: 'inv', silver: 'inv', ppfas: 'inv', infosys: 'inv', monzo_savings: 'cash', pot: 'cash', nre: 'cash', home: 'prop', pune: 'prop', saver: 'fix', sbi_fd: 'fix', ppf: 'fix', lic: 'fix', pension_arun: 'pen', sipp_asha: 'pen' };
  var GROUPS = [['inv', 'Investments'], ['cash', 'Cash and savings'], ['prop', 'Property'], ['fix', 'Fixed term'], ['pen', 'Pensions']];
  var UK_HOLD = { balanced: 1, nasdaq: 1, robotics: 1, silver: 1 };
  function who(owners) {
    if (owners.length > 1) return 'Arun and Asha, half each';
    return owners[0][0] === 'arun' ? 'Arun' : 'Asha';
  }
  function records(ctx) {
    var h = hh(ctx), list = [];
    (h.assets || []).forEach(function (a) { list.push(Object.assign({}, a)); });
    if (ctx.W.monzoSavings && h.new_record_in_prototype) list.splice(4, 0, Object.assign({}, h.new_record_in_prototype));
    list.forEach(function (a) {
      if (ctx.W.value && ctx.W.value(a.id) != null) a.value = ctx.W.value(a.id);   /* the core's ledger, as of the step's time */
      else if (a.id === 'home') a.value = ctx.W.homeValue;
      a.gbp = a.ccy === 'INR' ? rhe(a.value / FX) : a.value;
      a.group = GROUP[a.id];
      a.liq = a.group === 'inv' || a.group === 'cash' ? 'liquid' : a.group === 'fix' ? 'fixed' : 'locked';
    });
    var own = list.reduce(function (s, a) { return s + a.gbp; }, 0);
    if (ctx.W.T.own_gbp && own !== ctx.W.T.own_gbp) console.error('[pv5-wealth] the records sum to ' + own + ', the ledger says ' + ctx.W.T.own_gbp);
    return list;
  }
  function rec(ctx, id) { var l = records(ctx); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function hdfcInr(ctx) { var d = debtsRaw(ctx).hdfc; return ctx.W.hdfcNovPaid ? d.balance_after_nov_emi : d.balance; }
  function debtsRaw(ctx) { var o = {}; (hh(ctx).debts || []).forEach(function (d) { o[d.id] = d; }); return o; }
  /* the debts in pounds: the pound loans as recorded, the card as its statement says, the rupee loan's pounds absorbing
     the rounding so the rows add up to the ledger's total (as the figure set's splits do) */
  function debts(ctx) {
    var R = debtsRaw(ctx), cardOwed = ctx.W.octClosed ? 1458 : 0;
    var mort = rhe(R.mortgage.balance), car = rhe(R.car.balance);
    var hd = (ctx.W.T.owe_gbp || 0) - mort - car - cardOwed;
    return { mortgage: mort, car: car, hdfc: hd, card: cardOwed, hdfcInr: hdfcInr(ctx) };
  }
  function indiaInr(ctx) {
    return records(ctx).filter(function (a) { return a.country === 'IN'; }).reduce(function (s, a) { return s + a.value; }, 0) - hdfcInr(ctx);
  }
  function groupSum(list, gid) { return list.filter(function (a) { return a.group === gid; }).reduce(function (s, a) { return s + a.gbp; }, 0); }
  /* the rules engine's stances: at the Fri 23 Oct close (forecaster-v4) until Sat 7 Nov, then engine-v5's at the Fri 6 Nov
     close, as the core's prices move; in shadow until the gate passed, Sat 7 Nov 09:00 */
  function stancesLive(ctx) { return ctx.t >= '2026-11-07T09:00'; }
  function shadowChip(ctx) { return stancesLive(ctx) ? K.chip(K.ms('verified') + 'Stances live, past the gate', 'mp-neutral') : K.shadow('Stances in shadow'); }
  function stanceNote(ctx) { return stancesLive(ctx) ? 'Each stance is the rules engine’s at the ' + ctx.W.pricesAt + '. They went live after beating doing nothing for 8 weeks (Sat 7 Nov).' : 'Each stance is the rules engine’s at the ' + ctx.W.pricesAt + ', written daily and kept in shadow until it has beaten doing nothing for 8 weeks.'; }
  function stances(ctx) {
    var F = fc(ctx), o = {}, E = (ctx.D && ctx.D.engine) || null;
    if (E && E.nov6 && ctx.t >= '2026-11-07T00:00') { Object.keys(E.nov6).forEach(function (id) { var x = E.nov6[id]; if (x && x.stance) o[id] = { code: x.stance, conf: x.conf }; }); if (o.balanced) return o; }
    if (F.balanced && F.balanced.rules) o.balanced = { code: F.balanced.rules.stance, conf: F.balanced.rules.conf };
    if (F.nasdaq && F.nasdaq.rules) o.nasdaq = { code: F.nasdaq.rules.stance, conf: F.nasdaq.rules.conf };
    ((F.review && F.review.cards) || []).forEach(function (c) {
      var m = /^(\w+) · (\d+)%/.exec(c.rules || ''), id = /Robotics/.test(c.name) ? 'robotics' : /Silver/.test(c.name) ? 'silver' : /NASDAQ/.test(c.name) ? 'nasdaq' : null;
      if (m && id && !o[id]) o[id] = { code: m[1], conf: +m[2] };
    });
    return o;
  }
  function stanceChip(ctx, id) { var s = stances(ctx)[id]; return s ? K.stance(s.code, s.conf) : ''; }
  function recLink(a) { return UK_HOLD[a.id] ? 'nav:holding/' + a.id : 'nav:asset/' + a.id; }
  function recSub(a) {
    var parts = [who(a.owners)];
    if (a.account) parts.push(a.account);
    else if (a.id === 'home' || a.id === 'pune') parts.push(a.country === 'UK' ? 'UK' : 'India');
    return parts.join(' · ');
  }
  function recValue(a) { return a.ccy === 'INR' ? ri(a.value) : g(a.value); }
  function recVs(a) { return a.ccy === 'INR' ? '≈ ' + g(a.gbp) : null; }

  /* ---------- what is due, as of the step's time ---------- */
  function dues(ctx) {
    var today = ctx.t.slice(0, 10), end = new Date(Date.parse(today + 'T00:00:00Z') + 30 * 864e5).toISOString().slice(0, 10);
    var W = ctx.W, closedOct = at(ctx, '2026-11-01T09:02');
    var L = [
      ['2026-10-26', 'Valuation due: Home, Reading', 'Asks: still about ' + g(415000) + '?', 'Asks you', W.homeCorrected],
      ['2026-07-15', 'Valuation overdue: Flat, Pune', 'Due since 15 Jul. Asks: still about ' + ri(11000000) + '?', 'Overdue', false],
      ['2026-11-01', 'Mortgage · Nationwide', 'UK · joint, 50% each · ' + g(1456), 'Autopay', at(ctx, '2026-11-01T09:00')],
      ['2026-11-01', 'Close October’s budget', 'Anything not on a statement?', 'Asks you', closedOct],
      ['2026-11-05', 'Home loan EMI · HDFC', 'India · Arun · ' + ri(39390), 'Asks you', W.hdfcNovPaid],
      ['2026-11-10', 'SIP · Parag Parikh', 'India · Asha · ' + ri(10000), 'Asks Asha', at(ctx, '2026-11-10T09:00')],
      ['2026-11-20', 'Barclaycard bill', W.octClosed ? 'From the statement of Sun 1 Nov · ' + g(1458) : 'From the statement that comes Sun 1 Nov', 'Asks you', at(ctx, '2026-11-20T09:00')],
      ['2026-11-20', 'Car loan · Close Brothers', 'UK · Arun · ' + g(347), 'Autopay', at(ctx, '2026-11-20T09:00')],
      ['2026-12-01', 'Mortgage · Nationwide', 'UK · joint, 50% each · ' + g(1456), 'Autopay', at(ctx, '2026-12-01T09:00')],
      ['2026-12-01', 'Close November’s budget', 'Anything not on a statement?', 'Asks you', at(ctx, '2026-12-01T09:00')],
      ['2026-12-05', 'Home loan EMI · HDFC', 'India · Arun · ' + ri(39390), 'Asks you', at(ctx, '2026-12-05T09:00')],
      ['2026-12-14', 'Fixed-rate saver matures', 'UK · Asha · ' + g(10460) + ': renewed, paid out or moved?', 'Asks Asha', at(ctx, '2026-12-14T09:00')]
    ];
    return L.filter(function (d) { return !d[4] && ((d[0] >= today && d[0] <= end) || d[3] === 'Overdue'); }).slice(0, 6).map(function (d) {
      var p = d[0].split('-'), isToday = d[0] === today;
      return '<div class="due"><span class="due-d' + (isToday ? ' today' : '') + '">' + (isToday ? 'Today' : d[3] === 'Overdue' ? 'Due' : wd(d[0])) + '<b>' + (+p[2]) + '</b>' + MONS[+p[1] - 1] + '</span>' +
        '<div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + d[1] + '</span><span class="mp-foot mp-ink2">' + d[2] + '</span></div>' +
        (d[3] ? K.chip(d[3], d[3] === 'Overdue' ? 'mp-trim' : d[3] === 'Autopay' ? 'mp-neutral' : 'mp-pause') : '') + '</div>';
    }).join('');
  }

  /* ---------- the Home page: the Overview, dashboard 1a Net worth first ---------- */
  function deltaLine(ctx) {
    var d = ctx.t.slice(0, 10), W = ctx.W, g = ctx.has('inr') ? function (n) { return K.inr(n * FX); } : K.gbp;
    if (d === '2026-10-26' && W.homeCorrected) return '<span class="delta"><span class="upchip">▲ ' + g(13000) + '</span><span class="mp-foot mp-hero-2">at 09:52 · Home, Reading, corrected in place, your estimate</span></span>';
    if (d === '2026-10-26' && W.monzoSavings) return '<span class="delta"><span class="upchip">▲ ' + g(5000) + '</span><span class="mp-foot mp-hero-2">at 09:41 · Instant access savings · Monzo, added in the chat</span></span>';
    if (d === '2026-11-01' && W.octClosed) return '<span class="delta"><span class="dnchip">▼ ' + g(1458) + '</span><span class="mp-foot mp-hero-2">at 08:44 · the Barclaycard statement of Sun 1 Nov, owed until it is paid</span></span>';
    if (d === '2026-11-05' && W.hdfcNovPaid) return '<span class="delta"><span class="upchip">▲ ' + g(254) + '</span><span class="mp-foot mp-hero-2">at 09:12 · the HDFC EMI paid; its principal, ' + ri(28671) + ', came off what you owe</span></span>';
    return '';
  }
  function ccySeg(ctx, onHero) {
    var inr = ctx.has('inr');
    return K.seg([{ t: '£ GBP', on: !inr, go: inr ? 'fold:inr' : null }, { t: '₹ INR', on: inr, go: inr ? null : 'fold:inr' }]);
  }
  function heroPulse(ctx) {
    var m = K.mode();
    if (m === 'classic') return '';
    var inr = ctx.has('inr'), ccy = inr ? 'INR' : 'GBP';
    var MS = [
      ['2026-10-22T18:00', 'Thu 22 Oct', 'Thu 22 Oct close'],
      ['2026-10-23T21:00', 'Fri 23 Oct', 'Fri 23 Oct close'],
      ['2026-10-25T21:00', 'Sun 25 Oct', 'Setup complete'],
      ['2026-10-26T09:41', 'Mon 26 Oct · 09:41', 'Monzo savings added'],
      ['2026-10-26T09:52', 'Mon 26 Oct · 09:52', 'Home estimate corrected'],
      ['2026-11-01T08:44', 'Sun 1 Nov', 'Barclaycard statement'],
      ['2026-11-05T09:12', 'Thu 5 Nov', 'HDFC EMI paid'],
      ['2026-11-07T09:00', 'Sat 7 Nov', 'Fri 6 Nov close']
    ].filter(function (x) { return x[0] <= ctx.t; });
    if (!MS.length || MS[MS.length - 1][0] < ctx.t) MS.push([ctx.t, ctx.d || 'Now', 'Current ledger']);
    var pts = MS.map(function (x, i) {
      var Wx = x[0] === ctx.t ? ctx.W : M.world(x[0]);
      var val = inr ? Wx.T.net_inr : Wx.T.net_gbp;
      return { i: i, k: x[1], s: x[2], v: val };
    });
    if (pts.length < 2) return '';
    var vals = pts.map(function (p) { return p.v; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = Math.max(hi - lo, (hi || 1) * 0.008);
    var first = pts[0], last = pts[pts.length - 1], diff = last.v - first.v;
    var diffFmt = (diff >= 0 ? '▲ ' : '▼ ') + (inr ? ri(Math.abs(diff)) : g(Math.abs(diff)));
    var T = ctx.W.T, M2 = function (n) { return inr ? ri(n * FX) : g(n); };
    if (m === 'c') {
      var scrubC = pts.map(function (p, idx) {
        var cx = ((idx + 0.5) / pts.length) * 100;
        var hPct = 36 + ((p.v - lo) / span) * 64;
        return { x: +cx.toFixed(2), y: +(100 - hPct).toFixed(2), k: p.k, v: p.v, ccy: ccy, s: p.s };
      });
      var cols = pts.map(function (p, idx) {
        var hPct = 36 + ((p.v - lo) / span) * 64;
        return '<i class="hpulse-col' + (idx === pts.length - 1 ? ' now' : '') + '" style="height:' + hPct.toFixed(1) + '%"></i>';
      }).join('');
      return '<div class="hpulse">' + K.chartStats([
        { k: 'We own', v: M2(T.own_gbp) },
        { k: 'We owe', v: M2(T.owe_gbp) },
        { k: 'Liquid now', v: M2(T.liquid_gbp) }
      ], 'c') + '<div class="hpulse-h"><span>Recorded trajectory · ' + pts.length + ' milestones</span><span>' + diffFmt + ' since ' + first.k.split(' · ')[0] + '</span></div>' +
        '<div class="hpulse-bars" role="img" aria-label="Recorded net worth across ' + pts.length + ' ledger milestones"' + (ctx.priv ? '' : ' data-scrub="' + K.esc(JSON.stringify(scrubC)) + '" tabindex="0"') + '>' + cols + K.scrubBox() + '</div>' +
        '<div class="axis5" style="color:var(--mp-hero-ink-2)"><span>' + first.k.split(' · ')[0] + '</span><span>' + last.k.split(' · ')[0] + '</span></div></div>';
    }
    var linePts = pts.map(function (p) { return [p.i, p.v]; });
    var dots = pts.map(function (p, idx) { return { x: p.i, y: p.v, beacon: m === 'a' && idx === pts.length - 1 }; });
    var scrubL = pts.map(function (p) { return { x: p.i, y: p.v, k: p.k, v: p.v, ccy: ccy, s: p.s }; });
    var statsB = m === 'b' ? [
      { k: 'At setup', v: inr ? ri(pts[0].v) : g(pts[0].v) },
      { k: 'Recorded move', v: diffFmt },
      { k: 'Liquid now', v: M2(T.liquid_gbp) }
    ] : null;
    return '<div class="hpulse">' + (m === 'a' ? '<div class="hpulse-h"><span>Recorded trajectory</span><span>' + diffFmt + ' since ' + first.k.split(' · ')[0] + '</span></div>' : '') +
      K.line({
        x0: 0, x1: pts.length - 1, y0: lo - span * 0.22, y1: hi + span * 0.25, h: '76px',
        padL: 2.2, padR: 97.8, grid: [lo, hi], gridColor: 'var(--mp-hero-2)',
        series: [{ pts: linePts, color: 'var(--mp-coral)', w: m === 'a' ? 2.5 : 2 }],
        dots: dots, areaOp: 0.28, stats: statsB, scrub: scrubL,
        xLabels: [{ x: 0, t: first.k.split(' · ')[0] }, { x: pts.length - 1, t: last.k.split(' · ')[0] }],
        label: 'Recorded household net worth from ' + first.k + ' to ' + last.k
      }) + '</div>';
  }
  function homeHero(ctx) {
    var T = ctx.W.T, inr = ctx.has('inr');
    var top = '<div class="heroseg">' + K.seg([{ t: 'Household', on: true }, { t: 'Me' }, { t: 'Asha' }]) + ccySeg(ctx, true) + '</div>';
    var live = '';
    if (ctx.web && ctx.t.slice(0, 10) === '2026-10-26' && ctx.W.monzoSavings && !ctx.W.homeCorrected) live = 'Updated live at 09:41: the change came over the stream, no reload. It was ' + g(439951) + '.';
    if (ctx.web && ctx.t.slice(0, 10) === '2026-10-26' && ctx.W.homeCorrected && ctx.t < '2026-10-26T09:55') live = 'Updated live at 09:52: the change came over the stream, no reload. It was ' + g(444951) + '.';
    var extra = (deltaLine(ctx) ? deltaLine(ctx) : '') +
      '<span class="mp-foot mp-hero-2">' + K.ms('currency_exchange') + ' ' + RATE() + ' · ECB reference rate, Fri 23 Oct · prices at the ' + ctx.W.pricesAt + '</span>' +
      (inr ? '<span class="mp-foot mp-hero-2">In rupees: India’s records as they are, the UK’s at ' + RATE() + '. Dollars and euros come in the same switch, at the day’s ECB rate.</span>' : '') +
      (live ? '<span class="mp-foot mp-hero-2">' + live + '</span>' : '') +
      heroPulse(ctx);
    return K.hero({ top: top, k: 'Household net worth', v: inr ? ri(T.net_inr) : g(T.net_gbp), extra: extra, id: 'w-hero' });
  }
  function homeCards(ctx) {
    var T = ctx.W.T, list = records(ctx), D = debts(ctx), inr = ctx.has('inr'), m = K.mode();
    var M2 = function (n) { return inr ? ri(n * FX) : g(n); };
    var n = list.length, nUK = list.filter(function (a) { return a.country === 'UK'; }).length;
    var own = T.own_gbp, owe = T.owe_gbp, net = T.net_gbp;
    var cards = [];
    var ownOweRows = hb('We own', M2(own), 1, n + ' assets in the UK and India', '', { pill: '100%', tick: net / own }) +
      hb('We owe', M2(owe), owe / own, '3 loans and a card', 'grey', { pill: pct(owe, own) });
    cards.push(K.card({ t: 'What we own and owe', r: '<span class="mp-foot mp-ink2">' + pct(owe, own) + ' of what we own is owed</span>', body:
      m === 'c'
        ? '<div class="mp5-donut-wrap">' + K.donut([{ v: net, color: 'var(--mp-chart-line)' }, { v: owe, color: 'var(--mp-ink-3)' }], pct(net, own), 'net') + '<div class="mp5-donut-side">' + ownOweRows + '</div></div>'
        : ownOweRows }));
    var uk = T.by_country_gbp.UK, ind = T.by_country_gbp.IN;
    var countryRows = hb('United Kingdom', inr ? ri(T.net_inr - indiaInr(ctx)) : g(uk), uk / net, pct(uk, net) + ' · ' + nUK + ' assets, 3 debts, held in pounds', '', { pill: pct(uk, net), tick: 0.5 }) +
      hb('India', inr ? ri(indiaInr(ctx)) : g(ind), ind / net, pct(ind, net) + ' · 7 assets, 1 loan, held in rupees: ' + ri(indiaInr(ctx)), m === 'c' ? 'b2' : '', { pill: pct(ind, net), tick: 0.5 });
    cards.push(K.card({ t: 'By country', r: '<span class="mp-foot mp-ink2">' + (inr ? 'in rupees' : 'in pounds') + '</span>', body:
      m === 'c'
        ? '<div class="mp5-donut-wrap">' + K.donut([{ v: uk, color: 'var(--mp-chart-line)' }, { v: ind, color: 'var(--mp-chart-2)' }], pct(uk, net), 'UK') + '<div class="mp5-donut-side">' + countryRows + '</div></div>'
        : countryRows }));
    var bm = T.by_member_gbp;
    var memberRows = hb('Arun', M2(bm.arun), bm.arun / net, pct(bm.arun, net) + ' · his own records and his half of the joint ones', '', { pill: pct(bm.arun, net), tick: 0.5 }) +
      hb('Asha', inr ? ri(T.net_inr - rhe(bm.arun * FX)) : g(bm.asha), bm.asha / net, pct(bm.asha, net) + ' · her own records and her half of the joint ones', m === 'c' ? 'b5' : '', { pill: pct(bm.asha, net), tick: 0.5 });
    cards.push(K.card({ t: 'By member', r: '<span class="mp-foot mp-ink2">joint records by share</span>', body:
      (m === 'c'
        ? '<div class="mp5-donut-wrap">' + K.donut([{ v: bm.arun, color: 'var(--mp-chart-line)' }, { v: bm.asha, color: 'var(--mp-chart-5)' }], pct(bm.arun, net), 'Arun') + '<div class="mp5-donut-side">' + memberRows + '</div></div>'
        : memberRows) +
      K.foot('Joint: Home, Reading, the Pune flat, the mortgage and the Monzo pot, 50% each.') }));
    var liq = T.liquid_gbp, fix = groupSum(list, 'fix'), lock = own - liq - fix;
    var liqTop = m === 'c'
      ? '<div class="mp5-donut-wrap" style="margin-bottom:6px">' + K.donut([{ v: liq, color: 'var(--mp-chart-line)' }, { v: fix, color: 'var(--mp-chart-2)' }, { v: lock, color: 'var(--mp-chart-3)' }], pct(liq, own), 'liquid') +
        '<div class="mp5-donut-side">' + K.chartStats([{ k: 'Liquid', v: pct(liq, own) }, { k: 'Fixed', v: pct(fix, own) }, { k: 'Locked', v: pct(lock, own) }], 'c') + '</div></div>'
      : '<div class="stack"><i class="c1" style="width:' + (liq / own * 100).toFixed(1) + '%"></i><i class="c2" style="width:' + (fix / own * 100).toFixed(1) + '%"></i><i class="c3" style="width:' + (lock / own * 100).toFixed(1) + '%"></i></div>';
    cards.push(K.card({ t: 'Liquid and locked', r: '<span class="mp-foot mp-ink2">' + pct(lock, own) + ' is locked</span>', body:
      liqTop +
      K.list([
        K.row({ lead: '<span class="sw c1"></span>', t: 'Liquid now', s: list.filter(function (a) { return a.liq === 'liquid'; }).length + ' records: cash, savings, funds and shares', v: M2(liq) }),
        K.row({ lead: '<span class="sw c2"></span>', t: 'Fixed term', s: '4 pay out at maturity; next the saver, ' + g(10460) + ' on Mon 14 Dec', v: M2(fix) }),
        K.row({ lead: '<span class="sw c3"></span>', t: 'Locked', s: 'two homes, and two pensions that unlock at 57', v: M2(lock) })]) }));
    cards.push(K.card({ t: 'What’s due', r: '<span class="mp-foot mp-ink2">next 30 days</span>', id: 'w-due', body: dues(ctx) + K.foot('Each check-in arrives in the chat on its day; one tap records it.') }));
    if (at(ctx, '2026-11-01T09:02')) {
      var R2 = ((fp(ctx).forecast || {}).R2 || {}).months_2026 || [], nov = R2[0];
      if (nov) {
        var pot = at(ctx, '2026-11-05T20:46'), sur = nov.surplus + (pot ? 0 : nov.to_pot);
        cards.push(K.card({ t: 'This month’s cash', r: '<span class="mp-foot mp-ink2">November, on the plan</span>', id: 'w-cash', body: K.list([
          K.row({ icon: 'payments', t: 'Coming in', s: 'Arun’s and Asha’s pay, the Pune rent', v: g(nov.income_total) }),
          K.row({ icon: 'shopping_basket', t: 'Spending, planned', s: '12 categories, October’s plan', v: '−' + g(nov.spend_total) }),
          K.row({ icon: 'account_balance', t: 'EMIs and the SIP', s: '3 loans and Parag Parikh', v: '−' + g(nov.emis_total + nov.sip) })]
          .concat(pot ? [K.row({ icon: 'savings', t: 'School fees pot', s: 'added Thu 5 Nov 20:46, on your Confirm', v: '−' + g(nov.to_pot) })] : [])
          .concat([K.row({ icon: 'functions', t: 'Planned surplus', s: pot ? 'was ' + g(nov.surplus + nov.to_pot) + ' before the pot' : 'the lines above, added', v: g(sur) })])) +
          K.foot('Actuals come in with November’s statements, on Tue 1 Dec.') }));
      }
    }
    var ST = stances(ctx);
    var inv = list.filter(function (a) { return a.group === 'inv' || a.id === 'pot'; });
    cards.push(K.card({ t: 'Investments', r: shadowChip(ctx), id: 'w-inv', body: K.list(inv.map(function (a) {
      var s = ST[a.id];
      return K.row({ lead: lead(LEAD[a.id]), t: a.name.replace(' · Direct Growth', '').replace(' (BlackRock MyMap 5)', ''), s: recSub(a) + (a.id === 'pot' ? ' · cash, no stance' : a.country === 'IN' ? ' · stances from phase 19' : ''),
        v: inr && a.ccy === 'GBP' ? ri(a.value * FX) : recValue(a), vs: s ? K.stance(s.code, s.conf) : recVs(a), go: recLink(a) });
    })) + K.foot(stanceNote(ctx)) + K.viewNotAdvice() }));
    var R = debtsRaw(ctx), span = 2045.75 - 2026.82;
    var runs = [['Car loan · Close Brothers', g(D.car), 'UK · Arun · ' + g(347) + ' a month', 'paid off Tue 20 Feb 2029', 2029.13],
      ['Home loan · HDFC, the Pune flat', ri(D.hdfcInr), 'India · Arun · ' + ri(39390) + ' a month', 'paid off Fri 5 Jul 2030', 2030.5],
      ['Mortgage · Nationwide', g(D.mortgage), 'UK · joint 50% each · fixed 4.39% to 30 Jun 2028 · ' + g(1456) + ' a month', 'paid off Sun 1 Oct 2045', 2045.75]];
    cards.push(K.card({ t: 'What we owe, and how it runs off', r: '<span class="mp-foot mp-ink2">' + M2(owe) + ' in all</span>', body: runs.map(function (x, idx) {
      var frac = (x[4] - 2026.82) / span, wPct = (frac * 100).toFixed(1);
      var barHtml;
      if (m === 'c') barHtml = K.bar(frac, idx === 0 ? 'b2' : idx === 1 ? 'b4' : '');
      else if (m === 'a') barHtml = '<div class="runs"><i class="r' + (idx + 1) + '" style="width:' + wPct + '%"></i><span class="runs-dot r' + (idx + 1) + '" style="left:' + Math.min(98.5, +wPct) + '%"></span></div>';
      else if (m === 'b') barHtml = '<div class="runs"><i style="width:' + wPct + '%"></i><span class="runs-tick" style="left:' + Math.min(98.5, +wPct) + '%"></span></div>';
      else barHtml = '<div class="runs"><i style="width:' + wPct + '%"></i></div>';
      return '<div class="fx col g4" style="padding:6px 0"><div class="hb-top"><span class="hb-t">' + x[0] + '</span><span class="hb-v">' + x[1] + '</span></div><span class="mp-foot mp-ink2">' + x[2] + '</span>' +
        barHtml + '<span class="mp-foot">' + x[3] + '</span></div>';
    }).join('') + '<div class="axis5"><span>Now</span><span>2030</span><span>2035</span><span>2040</span><span>Oct 2045</span></div>' +
      K.foot(ctx.W.octClosed ? 'Barclaycard: the statement of Sun 1 Nov, ' + g(1458) + ', is owed until it is paid, due Fri 20 Nov. Each loan frees its payment when it ends.' : 'Barclaycard: nothing owed; October’s ' + g(1240) + ' was paid in full on Tue 20 Oct. Each loan frees its payment when it ends.') }));
    cards.push(K.card({ t: 'Maturing next', r: '<span class="mp-foot mp-ink2">what the fixed terms pay</span>', body: K.list([
      K.row({ lead: lead('NW'), t: 'Fixed-rate saver · Nationwide', s: 'Mon 14 Dec 2026 · UK · Asha · 4.6% · now ' + g(10000), v: g(10460), go: 'nav:asset/saver' }),
      K.row({ lead: lead('FD'), t: 'Fixed deposit · SBI', s: 'Sat 10 Mar 2029 · India · Arun · 7.1% · now ' + ri(517908), v: ri(617538), go: 'nav:asset/sbi_fd', id: 'w-fdrow' }),
      K.row({ lead: lead('LI'), t: 'LIC Jeevan Anand', s: 'Fri 28 Mar 2031 · India · Asha · sum assured ' + ri(1000000), v: 'Policy' }),
      K.row({ lead: lead('PF'), t: 'PPF · SBI', s: 'Mon 31 Mar 2031 · India · Arun · 7.1% · now ' + ri(680000), v: 'PPF' })]) }));
    var big = list.slice().sort(function (a, b) { return b.gbp - a.gbp; }), top5 = big.slice(0, 5), rest = big.slice(5);
    cards.push(K.card({ t: 'Largest assets', r: '<span class="mp-foot mp-ink2">each in its own currency</span>', body: K.list(top5.map(function (a) {
      return K.row({ lead: lead(LEAD[a.id]), t: a.name, s: (a.country === 'UK' ? 'UK · £ · ' : 'India · ₹ · ') + who(a.owners) + (a.id === 'home' ? (ctx.W.homeCorrected ? ' · your estimate, Mon 26 Oct' : ' · valued 30 Apr') : a.id === 'pune' ? ' · valued 15 Jan · overdue' : a.unlocks_at ? ' · unlocks at 57' : ''),
        v: recValue(a), vs: recVs(a), go: recLink(a), id: a.id === 'home' ? 'w-homerow' : null });
    })) + K.foot(rest.length + ' more records, ' + g(rest.reduce(function (s, a) { return s + a.gbp; }, 0)) + ' in all.') + '<div>' + K.btn('All assets', 'nav:assets', 'plain', 'chevron_right') + '</div>' }));
    if (ctx.compact || ctx.narrow) cards.push(K.card({ t: 'Everything else', body: K.list([['account_balance_wallet', 'Assets', 'assets'], ['credit_card', 'Debts', 'debts'], ['pie_chart', 'Budget', 'budget'], ['show_chart', 'Projection', 'projection'], ['event_note', 'Plans', 'plans'], ['summarize', 'Reports', 'reports'], ['candlestick_chart', 'Holdings', 'holdings'], ['join', 'Overlap', 'overlap'], ['fact_check', 'Track record', 'track'], ['newspaper', 'News and events', 'news']].map(function (l) { return K.row({ icon: l[0], t: l[1], go: 'nav:' + l[2] }); })) }));
    return cards;
  }
  M.page('home', function (ctx) {
    return { title: 'Home', sub: 'Household · ' + ctx.d + ' · prices at the ' + ctx.W.pricesAt + ' · illustrative figures', chip: K.picked('Picked · 1a, Net worth first'),
      body: wrap(homeHero(ctx) + '<div class="cols">' + homeCards(ctx).join('') + '</div>' + K.foot(ILLUS)) };
  });

  /* ---------- Assets ---------- */
  M.page('assets', function (ctx) {
    var list = records(ctx), T = ctx.W.T, liq = T.liquid_gbp, fix = groupSum(list, 'fix');
    var stats = '<div class="hstats"><div class="hstat"><span class="hstat-k">Liquid</span><span class="hstat-v">' + g(liq) + '</span><span class="hstat-s">' + list.filter(function (a) { return a.liq === 'liquid'; }).length + ' records</span></div>' +
      '<div class="hstat"><span class="hstat-k">Fixed term</span><span class="hstat-v">' + g(fix) + '</span><span class="hstat-s">4 records</span></div>' +
      '<div class="hstat"><span class="hstat-k">Locked</span><span class="hstat-v">' + g(T.own_gbp - liq - fix) + '</span><span class="hstat-s">4 records</span></div></div>';
    var hero = K.hero({ k: 'What you own · household · ' + list.length + ' records', v: g(T.own_gbp), s: 'UK and India, in pounds at ' + RATE() + ' (ECB, Fri 23 Oct)', extra: stats });
    var ST = stances(ctx);
    var groups = GROUPS.map(function (gr) {
      var rows = list.filter(function (a) { return a.group === gr[0]; }).map(function (a) {
        var sub = recSub(a);
        if (a.id === 'monzo_savings') sub = 'Arun · added in the chat, 09:41';
        if (a.id === 'home') sub = 'Arun and Asha, half each · ' + (ctx.W.homeCorrected ? 'your estimate, Mon 26 Oct' : 'valued Thu 30 Apr · due Fri 30 Oct');
        if (a.id === 'pune') sub = 'Arun and Asha, half each · valued 15 Jan · overdue since 15 Jul';
        if (a.id === 'saver') sub = 'Asha · 4.6% · ' + g(10460) + ' on Mon 14 Dec';
        if (a.id === 'sbi_fd') sub = 'Arun · 7.1% · ' + ri(617538) + ' on Sat 10 Mar 2029';
        if (a.id === 'ppf') sub = 'Arun · 7.1% · to 31 Mar 2031';
        if (a.id === 'lic') sub = 'Asha · surrender value';
        if (a.unlocks_at) sub = who(a.owners) + ' · unlocks at 57';
        var s = ST[a.id];
        return K.row({ lead: lead(LEAD[a.id]), t: a.name.replace(' · Direct Growth', ''), s: sub, v: recValue(a), vs: s ? K.stance(s.code, s.conf) : recVs(a), go: recLink(a), id: 'w-a-' + a.id });
      });
      return K.card({ t: gr[1], r: '<span class="mp-sub mp-num" style="font-weight:700">' + g(groupSum(list, gr[0])) + '</span>', body: K.list(rows) });
    });
    return { title: 'Assets', sub: ctx.d + ' · investments at the ' + ctx.W.pricesAt + ', the rest as last recorded · illustrative figures', chip: K.draft(),
      body: wrap(hero + '<div class="cols">' + groups.join('') + '</div>' + K.note('chat', 'Nothing is added on this page: a new record starts in the chat. Tap a figure on a record’s page to correct it.') + K.viewNotAdvice()) };
  });

  /* ---------- one asset ---------- */
  function homeChart(corrected) {
    var pts = [[2021.46, 330000], [2026.33, 330000], [2026.33, 415000], [2026.82, 415000]];
    if (corrected) pts = pts.concat([[2026.82, 428000], [2026.9, 428000]]); else pts.push([2026.9, 415000]);
    var curV = corrected ? 428000 : 415000;
    return K.line({ x0: 2021.46, x1: 2026.9, y0: 0, y1: 470000, h: '130px', grid: [400000], label: 'Home, Reading: its value as recorded, a step at each valuation',
      series: [{ pts: pts, color: 'var(--mp-chart-line)' }], dots: [{ x: 2021.46, y: 330000 }, { x: 2026.33, y: 415000 }].concat(corrected ? [{ x: 2026.9, y: 428000 }] : []),
      stats: [{ k: 'Bought Jun 2021', v: g(330000) }, { k: 'Apr 2026', v: g(415000) }, { k: 'Oct 2026', v: g(curV) }],
      scrub: [
        { x: 2021.46, y: 330000, k: 'Fri 18 Jun 2021', v: 330000, ccy: 'GBP', s: 'Bought, joint 50% each' },
        { x: 2026.33, y: 415000, k: 'Thu 30 Apr 2026', v: 415000, ccy: 'GBP', s: 'Valuation in the chat' },
        { x: 2026.9, y: curV, k: 'Mon 26 Oct 2026', v: curV, ccy: 'GBP', s: corrected ? 'Your estimate, corrected in place' : 'As valued Thu 30 Apr' }
      ],
      yLabels: [{ y: 400000, t: mny('£400k') }], xLabels: [{ x: 2021.46, t: 'Jun 2021' }, { x: 2024, t: '2024' }, { x: 2026.9, t: 'Oct 2026' }] }) +
      '<div class="legend"><span><i class="k-line"></i>Value as recorded, a step at each valuation</span></div>';
  }
  function fdChart() {
    var pts = [], P = 500000, r = 0.071 / 4, scrub = [];
    for (var q = 0; q <= 12; q++) {
      var xq = 2026.19 + q / 4, vq = P * Math.pow(1 + r, q);
      pts.push([xq, vq]);
      scrub.push({ x: xq, y: vq, k: 'Quarter ' + q + (q === 0 ? ' · Mar 2026' : q === 12 ? ' · Mar 2029' : ''), v: Math.round(vq), ccy: 'INR', s: q <= 2 ? 'Accrued so far' : 'Projected at 7.1% quarterly' });
    }
    scrub.push({ x: 2026.82, y: 517908, k: 'Oct 2026 · today', v: 517908, ccy: 'INR', s: 'Accrued to today' });
    scrub.sort(function (a, b) { return a.x - b.x; });
    return K.line({ x0: 2026.19, x1: 2029.19, y0: 450000, y1: 640000, h: '120px', grid: [500000, 600000], label: 'SBI fixed deposit, compounding quarterly to maturity',
      series: [{ pts: pts.filter(function (p) { return p[0] <= 2026.82; }).concat([[2026.82, 517908]]), color: 'var(--mp-chart-line)' }, { pts: [[2026.82, 517908]].concat(pts.filter(function (p) { return p[0] > 2026.82; })), color: 'var(--mp-ink-3)', dash: true }],
      dots: [{ x: 2026.82, y: 517908 }, { x: 2029.19, y: 617538 }],
      stats: [{ k: 'Put in', v: ri(500000) }, { k: 'Accrued now', v: ri(517908) }, { k: 'Mar 2029', v: ri(617538) }],
      scrub: scrub,
      yLabels: [{ y: 500000, t: mny('₹5 lakh') }, { y: 600000, t: mny('₹6 lakh') }],
      xLabels: [{ x: 2026.19, t: 'Mar 2026' }, { x: 2027.19, t: '2027' }, { x: 2028.19, t: '2028' }, { x: 2029.19, t: 'Mar 2029' }] }) +
      '<div class="legend"><span><i class="k-line"></i>Accrued so far</span><span><i class="k-dash"></i>To maturity, at 7.1%, quarterly</span></div>';
  }
  M.page('asset', function (ctx, args) {
    var id = args[0], a = rec(ctx, id);
    if (!a) return { title: 'Not on record yet', back: bk('Assets', 'assets'), body: K.card({ body: K.note('info', 'This record is not in the household’s records at ' + ctx.d + ', ' + ctx.tm + '.') }) };
    var back = bk('Assets', 'assets'), body = [], sub = '', chips = K.draft();
    var native = recValue(a), gbpBeside = a.ccy === 'INR' ? '<span class="mp-sub mp-ink2">≈ ' + g(a.gbp) + ' at ' + RATE() + '</span>' : '';
    if (id === 'home') {
      var state = ctx.W.homeCorrected ? 'saved' : (ctx.has('homeEdit') || (ctx.step && ctx.step.homeEdit)) ? 'edit' : 'rest';
      sub = 'Property · UK · Arun and Asha, half each · locked';
      var top;
      if (state === 'edit') {
        top = '<div class="edit" id="w-edit"><span class="mp-foot mp-ink2">Value of Home, Reading</span><div class="field">' + mny('£428,000') + '<span class="caret"></span></div>' +
          '<div class="ba"><span>' + g(415000) + '</span>' + K.ms('arrow_forward') + '<span>' + g(428000) + '</span>' + K.chip('▲ ' + g(13000), 'mp-add') + '</div>' +
          '<span class="mp-foot">Net worth ' + g(444951) + ' → ' + g(457951) + ', from the engine</span>' +
          '<div class="btns">' + K.btn('Save', 'home:save', 'primary small') + K.btn('Cancel', 'home:cancel', 'tinted small') + '</div>' +
          K.foot('Save writes a correction with its audit row. Nothing else on the record changes.') + '</div>';
      } else {
        top = '<button type="button" class="btn-reset fx ac g8" id="w-fig"' + K.go(state === 'rest' ? 'home:edit' : null) + '><span class="big">' + g(a.value) + '</span>' + K.ms(state === 'saved' ? 'check_circle' : 'edit', 'mp-ink2') + '</button>' +
          '<span class="mp-foot mp-ink2">' + (state === 'saved' ? 'your estimate, Mon 26 Oct' : 'your figure, valued Thu 30 Apr. Tap the figure to correct it.') + '</span>' +
          (state === 'saved' ? okline('Corrected in place by Arun, Mon 26 Oct, 09:52: ' + g(415000) + ' → ' + g(428000) + ', his estimate. Written as a correction with its audit row (via inline edit). Net worth is now ' + g(457951) + ', the engine’s figure.') : '');
      }
      body.push(K.card({ t: 'Property · UK · Arun and Asha, half each', body: '<div class="fx col g10">' + top +
        '<div class="tags">' + K.chip('Locked', 'mp-neutral', 'lock') + (state === 'saved' ? K.chip('Valuation check-in answered', 'mp-add', 'event_available') : K.chip('Valuation due Fri 30 Oct', 'mp-pause', 'schedule')) + '</div>' + homeChart(state === 'saved') + '</div>' }));
      var sv = state === 'saved', R = debtsRaw(ctx);
      body.push(K.card({ t: 'The property', r: '<span class="mp-foot mp-ink2">' + (sv ? 'after the correction' : 'as recorded') + '</span>', body: cells([
        ['Bought', g(330000), 'Fri 18 Jun 2021'], ['Gain on paper', '▲ ' + g(a.value - 330000), '▲ ' + ((a.value - 330000) / 330000 * 100).toFixed(1) + '% on the price'],
        ['Mortgage on it', g(rhe(R.mortgage.balance)), 'Nationwide, joint'], ['Equity', g(a.value - rhe(R.mortgage.balance)), 'value less the mortgage'],
        ['Each half', g(a.value / 2), 'Arun’s and Asha’s'], ['Last valued', sv ? 'Mon 26 Oct' : 'Thu 30 Apr', sv ? 'your estimate · next due in six months' : 'your figure · due Fri 30 Oct']]) }));
      body.push(K.card({ t: 'Events', r: '<span class="mp-foot mp-ink2">' + (sv ? '4 events' : '3 events') + '</span>', body: K.list((sv ? [K.row({ icon: 'edit', t: 'Correction · Mon 26 Oct, 09:52', s: 'Arun, in place · your estimate · was ' + g(415000), v: g(428000), vs: K.chip('New', 'mp-add') })] : [])
        .concat([K.row({ icon: 'notifications', t: 'Check-in · Mon 26 Oct, 09:00', s: 'Is ' + g(415000) + ' still about right? ' + (sv ? 'Answered by the correction' : 'Waiting in the chat'), v: sv ? 'answered' : 'open' }),
          K.row({ icon: 'home_work', t: 'Valuation · Thu 30 Apr 2026', s: 'Arun, in the chat', v: g(415000) }), K.row({ icon: 'flag', t: 'Bought · Fri 18 Jun 2021', s: 'Arun and Asha, half each', v: g(330000) })])) }));
      return { title: 'Home, Reading', sub: sub, back: back, chip: chips, body: wrap((ctx.wide && !ctx.compact ? '<div class="cols">' + body.join('') + '</div>' : body.join('')) + K.foot(ILLUS)) };
    }
    if (id === 'sbi_fd') {
      body.push(K.card({ t: 'Fixed deposit · India · Arun', body: '<div class="fx col g8"><span class="big">' + native + '</span>' + gbpBeside +
        '<span class="mp-foot mp-ink2">accrued to today at 7.1%, compounded quarterly · the engine’s figure</span>' + fdChart() + '</div>' }));
      body.push(K.card({ t: 'Its terms', r: '<span class="mp-foot mp-ink2">from SBI’s terms, Sun 25 Oct</span>', body: cells([
        ['Put in', ri(500000), 'Tue 10 Mar 2026'], ['Rate', '7.1%', 'a year, fixed'], ['Interest', 'Added in', 'cumulative, quarterly'],
        ['Matures', 'Sat 10 Mar 2029', 'three years'], ['At maturity', ri(617538), '≈ ' + g(rhe(617538 / FX)) + ' at today’s rate'], ['On maturity', 'Asks you then', 'renewed, paid out or moved']]) +
        K.foot('The maturity is worked out from the rate, the term and the compounding, so it is not edited itself: correct the rate or the date and it follows.') }));
      body.push(K.card({ t: 'Maturing next', r: '<span class="mp-foot mp-ink2">the household’s fixed terms</span>', body: K.list([
        K.row({ lead: lead('NW'), t: 'Fixed-rate saver · Nationwide', s: 'Mon 14 Dec 2026 · Asha · then it asks her', v: g(10460), go: 'nav:asset/saver' }),
        K.row({ lead: lead('FD'), t: 'Fixed deposit · SBI', s: 'Sat 10 Mar 2029 · Arun', v: ri(617538) }),
        K.row({ lead: lead('LI'), t: 'LIC Jeevan Anand', s: 'Fri 28 Mar 2031 · Asha · sum assured ' + ri(1000000), v: 'Policy' }),
        K.row({ lead: lead('PF'), t: 'PPF · SBI', s: 'Mon 31 Mar 2031 · Arun · its own rate, 7.1%', v: 'PPF' })]) + K.foot('Deposits, policies and the PPF accrue at their stated rate to maturity; on the day, the chat asks what happened.') }));
      body.push(K.card({ t: 'Events', body: K.list([K.row({ icon: 'add_circle', t: 'Record added · Sun 25 Oct, 10:03', s: 'Arun, in the chat · the engine worked out the maturity', v: ri(500000) })]) }));
      return { title: 'Fixed deposit · SBI', sub: 'Deposit · India · Arun’s · rupees first, pounds beside at ' + RATE(), back: back, chip: chips, body: wrap('<div class="cols">' + body.join('') + '</div>' + K.foot(ILLUS)) };
    }
    if (id === 'saver') {
      var matured = at(ctx, '2026-12-14T09:00');
      body.push(K.card({ t: 'Fixed-rate saver · UK · Asha', body: '<div class="fx col g8"><span class="big">' + g(10000) + '</span><span class="mp-foot mp-ink2">put in Sun 14 Dec 2025 · ' + (matured ? 'matured today with ' + g(10460) : g(10460) + ' on Mon 14 Dec') + '</span>' +
        '<div class="tags">' + (matured ? K.chip('Matures today', 'mp-pause', 'event_available') : K.chip('Locked until 14 Dec', 'mp-neutral', 'lock')) + '</div></div>' }));
      body.push(K.card({ t: 'Its terms', body: cells([['Rate', '4.6%', 'fixed for a year'], ['Opened', 'Sun 14 Dec 2025', g(10000)], ['Matures', 'Mon 14 Dec 2026', g(10460)], ['On maturity', 'Asks Asha', 'nothing is assumed']]) }));
      return { title: 'Fixed-rate saver · Nationwide', sub: 'Fixed term · UK · Asha’s', back: back, chip: chips, body: wrap(body.join('') + K.foot(ILLUS)) };
    }
    if (id === 'ppfas') {
      var S = (wv(ctx) || {}).ppfas_sip, show = ctx.has('xirr');
      body.push(K.card({ t: 'Mutual fund · India · Asha', body: '<div class="fx col g8"><span class="big">' + native + '</span>' + gbpBeside +
        '<span class="mp-foot mp-ink2">' + K.num(a.units, 3) + ' units at ' + inrDp(a.nav) + ', AMFI’s NAV for Fri 23 Oct</span>' +
        cells([['Put in', ri(a.invested), S ? S.count + ' SIPs since Jan 2023' : 'SIPs since Jan 2023'], ['Gain', '▲ ' + ri(a.value - a.invested), '▲ ' + ((a.value - a.invested) / a.invested * 100).toFixed(1) + '% on what went in'], ['XIRR', K.pct(a.xirr * 100, { dp: 1 }) + ' a year', 'the engine’s, from the dated buys']]) + '</div>' }));
      var work = S ? '<div class="fx col g8" id="w-xirr">' + K.p('XIRR is the one yearly rate at which every buy, grown from its own date to Fri 23 Oct, adds up to what the fund is worth now.') +
        K.kv('The buys', S.count + ' SIPs of ' + ri(S.amount) + ', ' + S.first + ' to ' + S.last) + K.kv('Put in', ri(S.invested)) + K.kv('Worth, Fri 23 Oct', ri(S.value)) +
        K.kv('The rate that balances them', K.pct(S.xirr * 100, { dp: 2 }) + ' a year') + K.foot('Newton’s method with a bisection fallback, matched to a spreadsheet’s XIRR to the penny. Each SIP is a dated event in the ledger; the current value is the closing flow.') + '</div>'
        : K.note('hourglass_empty', 'The working comes from the wealth figure set (wealth-v5.json).');
      body.push(K.card({ t: 'Its return, with the working', r: K.btn(show ? 'Hide the working' : 'Show the working', 'fold:xirr', 'plain small', show ? 'expand_less' : 'expand_more'), id: 'w-xirrcard', body: show ? work : K.p('XIRR ' + K.pct(a.xirr * 100, { dp: 1 }) + ' a year, worked out from ' + (S ? S.count : '') + ' dated SIPs.') }));
      body.push(K.card({ t: 'The SIP, a commitment', r: K.chip('Asks Asha', 'mp-pause'), id: 'w-sip', body: cells([['Each month', ri(a.sip[0]), 'on the ' + a.sip[1] + 'th'], ['Next', 'Tue 10 Nov', 'the chat asks: did it go through?'], ['Each buy', 'Recorded', 'at that day’s NAV, from AMFI'], ['Step-up', 'None set', 'a yearly step-up is one sentence in the chat']]) +
        K.foot('A SIP is a commitment: each month it asks once, then records the buy with its units. Skipped or stopped are one tap too.') }));
      var ev = S ? [['2026-10-10', 'Sat 10 Oct'], ['2026-09-10', 'Thu 10 Sep'], ['2026-08-10', 'Mon 10 Aug']] : [];
      body.push(K.card({ t: 'Events', r: '<span class="mp-foot mp-ink2">' + (S ? S.count + ' buys' : '') + '</span>', body: K.list(ev.map(function (e) { return K.row({ icon: 'event_available', t: 'SIP · ' + e[1] + ' 2026', s: 'went through · Asha', v: ri(10000) }); })
        .concat([K.row({ icon: 'add_circle', t: 'Holding added · Sun 25 Oct, 10:31', s: 'by Arun, for Asha, in the chat · she owns it', v: ri(a.value) })])) }));
      return { title: 'Parag Parikh Flexi Cap', sub: 'Direct Growth · MF folio · CAMS · India · Asha’s', back: back, chip: chips, body: wrap('<div class="cols">' + body.join('') + '</div>' + K.viewNotAdvice()) };
    }
    if (id === 'infosys') {
      body.push(K.card({ t: 'Shares · India · Arun', body: '<div class="fx col g8"><span class="big">' + native + '</span>' + gbpBeside +
        '<span class="mp-foot mp-ink2">' + a.units + ' shares at ' + inrDp(a.price) + ', the NSE close of Fri 23 Oct</span>' +
        cells([['Return', 'Not worked out', 'no history yet'], ['Bought', 'Not known', 'past buys or an estimate'], ['Demat', 'Zerodha', 'Arun’s']]) + '</div>' }));
      body.push(K.card({ t: 'Its return', id: 'w-nohist', body: K.p('It has no history yet, so the engine can’t work out its return. Send past buys (Zerodha’s tax P&L or your contract notes) in the chat, or give an estimate there; an estimate stays marked as yours everywhere it shows.') +
        '<div class="btns">' + K.btn('Ask in the chat', 'tab:chat', 'tinted small', 'chat_bubble') + '</div>' }));
      return { title: 'Infosys', sub: 'Shares · Demat · Zerodha · India · Arun’s', back: back, chip: chips, body: wrap(body.join('') + K.viewNotAdvice()) };
    }
    /* any other record: its figure, its terms, its source */
    var kindT = { cash: 'Cash', savings_account: 'Savings', property: 'Property', workplace_pension: 'Workplace pension', sipp: 'SIPP', ppf: 'PPF', endowment: 'Endowment policy', oeic: 'Fund (OEIC)', etf: 'ETF', commodity_etc: 'ETC' }[a.kind] || a.kind;
    var lines = [['Whose', who(a.owners), a.owners.length > 1 ? 'joint records count by share' : ''], ['Where', a.country === 'UK' ? 'UK · pounds' : 'India · rupees', a.account || ''], ['Get at it', a.liq === 'liquid' ? 'any time' : String(a.liquidity), '']];
    if (a.id === 'pune') lines.push(['Rent', ri(a.rent_month) + ' a month', 'joint, half each'], ['Bought', ri(a.bought[1]), 'Wed 1 Jul 2015'], ['Valued', 'Thu 15 Jan', 'overdue since 15 Jul']);
    if (a.id === 'monzo_savings') lines.push(['Added', 'Mon 26 Oct, 09:41', 'in the chat, by Arun']);
    if (a.id === 'lic') lines.push(['Premium', ri(a.premium_year) + ' a year', 'next Sun 28 Mar 2027'], ['Sum assured', ri(a.sum_assured), 'Fri 28 Mar 2031']);
    if (a.unlocks_at) lines.push(['Valued', 'Wed 30 Sep', 'its last statement'], ['Unlocks', 'at 57', 'locked until then']);
    body.push(K.card({ t: kindT + ' · ' + (a.country === 'UK' ? 'UK' : 'India') + ' · ' + who(a.owners), body: '<div class="fx col g8"><span class="big">' + native + '</span>' + gbpBeside +
      (UK_HOLD[a.id] ? '<div class="fx ac g8 wrap">' + stanceChip(ctx, a.id) + shadowChip(ctx) + '</div>' : '') + cells(lines) +
      (UK_HOLD[a.id] ? '<div>' + K.btn('Open the holding', 'nav:holding/' + a.id, 'tinted small', 'candlestick_chart') + '</div>' : '') + '</div>' }));
    return { title: a.name.replace(' · Direct Growth', ''), sub: kindT + ' · ' + (a.country === 'UK' ? 'UK' : 'India') + ' · ' + who(a.owners), back: back, chip: chips, body: wrap(body.join('') + (UK_HOLD[a.id] ? K.viewNotAdvice() : K.foot(ILLUS))) };
  });

  /* ---------- Debts and one debt ---------- */
  M.page('debts', function (ctx) {
    var T = ctx.W.T, D = debts(ctx), afterE = ctx.W.hdfcNovPaid, card = ctx.W.octClosed;
    var stats = '<div class="hstats"><div class="hstat"><span class="hstat-k">Each month</span><span class="hstat-v">' + g(2153) + '</span><span class="hstat-s">3 loans</span></div>' +
      '<div class="hstat"><span class="hstat-k">Interest left</span><span class="hstat-v">' + g(afterE ? 109281 : 109376) + '</span><span class="hstat-s">at today’s rates</span></div>' +
      '<div class="hstat"><span class="hstat-k">Debt-free</span><span class="hstat-v">Oct 2045</span><span class="hstat-s">the mortgage ends</span></div></div>';
    var hero = K.hero({ k: 'What you owe · household · 4 debts', v: g(T.owe_gbp), s: (afterE ? 'After each loan’s last payment, Thursday’s HDFC EMI included. ' : 'After each loan’s last payment. ') +
      (card ? 'The card’s Sun 1 Nov statement, ' + g(1458) + ', is owed until it is paid; it is due Fri 20 Nov.' : 'The card is clear.') + ' Rupees in pounds at ' + RATE() + '.', extra: stats });
    var rows = [
      K.row({ lead: lead('NW'), t: 'Mortgage · Nationwide', s: 'Arun and Asha · ' + g(1456) + ' a month · 4.39%, fixed to 30 Jun 2028 · ends Oct 2045', v: g(D.mortgage), go: 'nav:debt/mortgage', id: 'w-d-mortgage' }),
      K.row({ lead: lead('CL'), t: 'Car loan · Close Brothers', s: 'Arun · ' + g(347) + ' a month · 6.9% · autopay · ends Feb 2029', v: g(D.car), go: 'nav:debt/car', id: 'w-d-car' }),
      K.row({ lead: lead('HD'), t: 'Home loan · HDFC', s: 'Arun · ' + ri(39390) + ' a month · 8.5% · Pune flat · ends Jul 2030', v: ri(D.hdfcInr), vs: '≈ ' + g(D.hdfc), go: 'nav:debt/hdfc', id: 'w-d-hdfc' }),
      K.row({ lead: lead('BC'), t: 'Barclaycard', s: card ? 'Arun · statement of Sun 1 Nov, due Fri 20 Nov' : 'Arun · the 1 Oct statement’s ' + g(1240) + ' paid in full on Tue 20 Oct', v: g(D.card), vs: card ? K.chip('Due Fri 20 Nov', 'mp-pause') : null, go: 'nav:debt/card', id: 'w-d-card' })];
    return { title: 'Debts', sub: ctx.d + ' · after each loan’s last payment · illustrative figures', chip: K.draft(),
      body: wrap(hero + K.card({ t: 'The loans and the card', r: '<span class="mp-foot mp-ink2">tap one to open it</span>', body: K.list(rows) }) + K.note('chat', 'A new loan starts in the chat; a figure is corrected on its loan’s page.') + K.foot(ILLUS)) };
  });
  function hdfcChart(after) {
    var r = 0.085 / 12, E = 39389.58, P0 = 4000000, paid = [], plan = [], scrub = [], now = after ? 136 : 135;
    for (var k = 0; k <= 180; k += 12) {
      var balY = Math.max(0, P0 * Math.pow(1 + r, k) - E * (Math.pow(1 + r, k) - 1) / r), xY = 2015.58 + k / 12;
      scrub.push({ x: xY, y: balY, k: String(Math.round(xY)) + ' · EMI ' + k + ' of 180', v: Math.round(balY), ccy: 'INR', s: k <= now ? 'Paid down so far' : 'Scheduled balance' });
    }
    for (var k2 = 0; k2 <= 180; k2 += 3) {
      var bal = Math.max(0, P0 * Math.pow(1 + r, k2) - E * (Math.pow(1 + r, k2) - 1) / r), x = 2015.58 + k2 / 12;
      if (k2 <= now) paid.push([x, bal]);
      if (k2 >= now - (now % 3)) plan.push([x, bal]);
    }
    var nb = after ? 1484586.73 : 1513257.4, nx = 2015.58 + now / 12;
    paid.push([nx, nb]); plan.unshift([nx, nb]);
    scrub.push({ x: nx, y: nb, k: (after ? 'Thu 5 Nov 2026' : 'Oct 2026') + ' · EMI ' + now, v: Math.round(nb), ccy: 'INR', s: 'Current remaining balance' });
    scrub.sort(function (a, b) { return a.x - b.x; });
    return K.line({ x0: 2015.58, x1: 2030.5, y0: 0, y1: 4200000, h: '150px', grid: [1000000, 2000000, 3000000], label: 'HDFC home loan: the balance as paid, and the original plan',
      series: [{ pts: paid, color: 'var(--mp-chart-line)' }, { pts: plan, color: 'var(--mp-ink-3)', dash: true }], dots: [{ x: nx, y: nb }],
      stats: [{ k: 'Borrowed', v: ri(4000000) }, { k: 'Left now', v: ri(Math.round(nb)) }, { k: 'Ends', v: 'Jul 2030' }],
      scrub: scrub,
      yLabels: [{ y: 1000000, t: mny('₹10 lakh') }, { y: 2000000, t: mny('₹20 lakh') }, { y: 3000000, t: mny('₹30 lakh') }],
      xLabels: [{ x: 2015.58, t: '2015' }, { x: 2020, t: '2020' }, { x: 2025, t: '2025' }, { x: 2030.5, t: '2030' }] }) +
      '<div class="legend"><span><i class="k-line"></i>Balance, as paid</span><span><i class="k-dash"></i>The original plan</span></div>';
  }
  M.page('debt', function (ctx, args) {
    var id = args[0], D = debts(ctx), back = bk('Debts', 'debts'), body = [];
    if (id === 'hdfc') {
      var af = ctx.W.hdfcNovPaid;
      body.push(K.card({ t: 'Home loan · India · Arun · left to pay', body: '<div class="fx col g8"><span class="big">' + ri(D.hdfcInr) + '</span><span class="mp-sub mp-ink2">≈ ' + g(D.hdfc) + ' at ' + RATE() + '</span>' +
        K.p('Of ' + ri(4000000) + ' borrowed at 8.5% over 15 years, EMIs from Wed 5 Aug 2015. ' + (af ? '136' : '135') + ' EMIs paid, no prepayments.') +
        '<div class="tags">' + K.chip('On its original plan', 'mp-add', 'check_circle') + K.chip('Ends Jul 2030', 'mp-neutral', 'event') + '</div>' + hdfcChart(af) + '</div>' }));
      body.push(K.card({ t: 'The loan', r: '<span class="mp-foot mp-ink2">tap the rate to correct it</span>', body: cells([
        ['EMI', ri(39390), 'on the 5th · ' + g(350) + ' · not autopay'], ['Rate', '8.5% ' + K.ms('edit', 'mp-ink2'), 'a year'], ['Ends', 'Jul 2030', 'the 180th EMI, Fri 5 Jul 2030'],
        ['Interest left', ri(af ? 248556 : 259275), 'at 8.5% · ' + g(af ? 2209 : 2305)], ['Interest paid', ri(af ? 2841570 : 2830851), 'since Aug 2015'], ['Repaid', ri(af ? 2515413 : 2486743), 'of ' + ri(4000000)]]) +
        K.note('functions', 'The EMI and the end date are worked out from the terms, so they are not edited themselves: correct the rate or the balance and they follow.') }));
      body.push(K.card({ t: 'Events', r: '<span class="mp-foot mp-ink2">' + (af ? '136 EMIs paid' : '135 EMIs paid') + '</span>', body: K.list((af ? [K.row({ icon: 'event_available', t: 'EMI · Thu 5 Nov 2026', s: 'paid, Arun tapped Paid on the check-in at 09:12', v: ri(39390), vs: K.chip('New', 'mp-add') })] : [K.row({ icon: 'notifications', t: 'Next: Thu 5 Nov', s: 'MyPaisa asks Arun: was November’s EMI paid?', v: ri(39390), vs: K.chip('Due', 'mp-pause') })])
        .concat([K.row({ icon: 'event_available', t: 'EMI · Mon 5 Oct 2026', s: 'paid, Arun tapped Paid on the check-in', v: ri(39390) }), K.row({ icon: 'event_available', t: 'EMI · Sat 5 Sep 2026', s: 'paid', v: ri(39390) }), K.row({ icon: 'flag', t: 'Borrowed · first EMI Wed 5 Aug 2015', s: 'at 8.5% over 15 years', v: ri(4000000) })])) }));
      return { title: 'Home loan · HDFC', sub: 'On the Pune flat · India · Arun’s · rupees first, pounds beside at ' + RATE(), back: back, chip: K.draft(), body: wrap('<div class="cols">' + body.join('') + '</div>' + K.foot(ILLUS)) };
    }
    if (id === 'card') {
      var st = ctx.W.octClosed, B = (hh(ctx).statements_oct || {}).barclaycard_nov || { lines: [] };
      body.push(K.card({ t: 'Credit card · UK · Arun · owed', body: '<div class="fx col g8"><span class="big">' + g(D.card) + '</span>' +
        '<span class="mp-foot mp-ink2">' + (st ? 'from the statement of Sun 1 Nov · due Fri 20 Nov · minimum ' + g(25) : 'the 1 Oct statement’s ' + g(1240) + ' was paid in full on Tue 20 Oct; the next statement comes Sun 1 Nov') + '</span>' +
        '<div class="tags">' + (st ? K.chip(ctx.t.slice(0, 10) === '2026-11-20' ? 'Due today' : 'Due Fri 20 Nov', 'mp-pause', 'schedule') : K.chip('Clear', 'mp-add', 'check_circle')) + K.chip('Revolving, from its statements', 'mp-neutral', 'credit_card') + '</div></div>' }));
      body.push(K.card({ t: 'How MyPaisa keeps a card', body: K.list([
        K.row({ icon: 'receipt_long', t: 'The balance, the minimum and the due date', s: 'come from each statement you send in the chat' }),
        K.row({ icon: 'swap_horiz', t: 'A payment to the card', s: 'is a transfer from your bank, not spending' }),
        K.row({ icon: 'shopping_basket', t: 'The spending', s: st ? 'was the statement’s ' + B.lines.length + ' lines, in October’s budget' : 'is each statement’s lines, in that month’s budget' }),
        K.row({ icon: 'percent', t: 'Only interest and fees', s: 'count as spending on the card itself: ' + g(0) + ' this year' })]) }));
      body.push(K.card({ t: 'Statements', body: K.list((st ? [K.row({ icon: 'description', t: 'Sun 1 Nov 2026', s: B.lines.length + ' lines · due Fri 20 Nov · minimum ' + g(25), v: g(1458), vs: K.chip('Owed', 'mp-pause') })] : [])
        .concat([K.row({ icon: 'description', t: 'Thu 1 Oct 2026', s: 'paid in full on Tue 20 Oct · minimum ' + g(25), v: g(1240), vs: K.chip('Paid', 'mp-add') })])) }));
      return { title: 'Barclaycard', sub: 'Credit card · UK · Arun’s', back: back, chip: K.draft(), body: wrap('<div class="cols">' + body.join('') + '</div>' + K.foot(ILLUS)) };
    }
    var R = debtsRaw(ctx)[id];
    if (!R) return { title: 'Not on record', back: back, body: K.card({ body: K.note('info', 'No such debt.') }) };
    body.push(K.card({ t: (id === 'mortgage' ? 'Mortgage · UK · joint' : 'Car loan · UK · Arun') + ' · left to pay', body: '<div class="fx col g8"><span class="big">' + g(id === 'mortgage' ? D.mortgage : D.car) + '</span>' +
      cells(id === 'mortgage' ? [['Payment', g(1456) + ' a month', 'on the 1st · autopay'], ['Rate', '4.39%', 'fixed to 30 Jun 2028'], ['Ends', 'Oct 2045', 'Sun 1 Oct 2045'], ['Overpaid', g(5000), 'Fri 1 Mar 2024, shortened the term']]
        : [['Payment', g(347) + ' a month', 'on the 20th · autopay'], ['Rate', '6.9%', 'fixed'], ['Ends', 'Feb 2029', 'Tue 20 Feb 2029'], ['Paid', '20 of 48', 'EMIs']]) + '</div>' }));
    return { title: R.name, sub: id === 'mortgage' ? 'On Home, Reading · UK · Arun and Asha’s' : 'UK · Arun’s', back: back, chip: K.draft(), body: wrap(body.join('') + K.foot(ILLUS)) };
  });

  /* ---------- Budget ---------- */
  M.page('budget', function (ctx) {
    var B = hh(ctx).budget_oct || { plan: [] }, done = ctx.W.octClosed, closed = at(ctx, '2026-11-01T09:02') || ctx.has('closed');
    var waiting = at(ctx, '2026-11-01T08:40') && !done;
    var hero = done ? K.hero({ k: 'October · ' + (closed ? 'closed' : 'open') + ' · surplus', v: g(B.surplus_actual), s: 'Plan ' + g(B.surplus_plan) + ' · savings rate 40.6%, plan 34.9% · ▲ ' + g(B.surplus_actual - B.surplus_plan) + ' better than plan',
      extra: '<div class="hstats"><div class="hstat"><span class="hstat-k">Income</span><span class="hstat-v">' + g(B.income_gbp) + '</span><span class="hstat-s">salaries and rent</span></div><div class="hstat"><span class="hstat-k">EMIs</span><span class="hstat-v">' + g(B.emis_gbp) + '</span><span class="hstat-s">3 loans</span></div><div class="hstat"><span class="hstat-k">SIP</span><span class="hstat-v">' + g(B.sip_gbp) + '</span><span class="hstat-s">1 fund</span></div><div class="hstat"><span class="hstat-k">Spending</span><span class="hstat-v">' + g(B.spend_actual) + '</span><span class="hstat-s">of ' + g(B.spend_plan) + ' planned</span></div></div>' })
      : K.hero({ k: 'October · open · planned surplus', v: g(B.surplus_plan), s: waiting ? 'Spending comes from your statements: two are waiting for your Confirm in the chat.' : 'Spending comes from October’s statements, sent in the chat on the 1st.',
        extra: '<div class="hstats"><div class="hstat"><span class="hstat-k">Income</span><span class="hstat-v">' + g(B.income_gbp) + '</span><span class="hstat-s">expected</span></div><div class="hstat"><span class="hstat-k">EMIs</span><span class="hstat-v">' + g(B.emis_gbp) + '</span><span class="hstat-s">3 loans</span></div><div class="hstat"><span class="hstat-k">SIP</span><span class="hstat-v">' + g(B.sip_gbp) + '</span><span class="hstat-s">1 fund</span></div><div class="hstat"><span class="hstat-k">Spending</span><span class="hstat-v">not yet</span><span class="hstat-s">plan ' + g(B.spend_plan) + '</span></div></div>' });
    var bMode = K.mode();
    var rows = B.plan.map(function (c) {
      var d = c.actual - c.plan, barH = '';
      if (done) {
        if (bMode === 'classic') barH = K.bar(Math.min(1, c.actual / c.plan), d > 0 ? 'over' : '');
        else if (d > 0) barH = K.bar(1, bMode === 'c' ? '' : 'over', { tick: c.plan / c.actual, overFrom: c.plan / c.actual });
        else barH = K.bar(c.actual / (c.plan || 1), '', bMode === 'b' ? { tick: 1 } : null);
      }
      return '<div class="bud"><span class="mp-sub" style="font-weight:600">' + c.category + '</span><span class="mp-sub mp-num tr">' + (done ? g(c.actual) + ' <span class="mp-ink2">of ' + g(c.plan) + '</span>' : '<span class="mp-ink2">plan ' + g(c.plan) + '</span>') + '</span>' +
        (done ? barH + '<span class="mp-foot ' + (d > 0 ? '' : 'mp-ink2') + '">' + (d > 0 ? '▲ ' + g(d) + ' over' : d < 0 ? '▼ ' + g(-d) + ' under' : 'on plan') + '</span>' : '') + '</div>';
    }).join('');
    var pa = K.card({ t: 'Plan against actual', r: '<span class="mp-foot mp-ink2">' + (done ? g(B.spend_actual) + ' of ' + g(B.spend_plan) : 'plan ' + g(B.spend_plan)) + '</span>', id: 'w-pa', body: K.foot('Tap a plan figure to correct it.') + rows +
      K.foot(done ? 'From the Barclaycard statement of Sun 1 Nov and Monzo’s for October: 22 lines.' : 'Actuals come in when you confirm October’s statements in the chat.') +
      K.note('chat', 'New categories are made in the chat, never on this page: ask “add a category for …” and confirm its card.') });
    var inc = K.card({ t: 'Income · October', r: '<span class="mp-sub mp-num" style="font-weight:700">' + g(B.income_gbp) + '</span>', body: K.list([K.row({ icon: 'person', t: 'Arun', s: 'net salary', v: g(4350) }), K.row({ icon: 'person', t: 'Asha', s: 'net salary', v: g(3050) }), K.row({ icon: 'apartment', t: 'Flat, Pune', s: 'rent · joint, half each', v: ri(18000), vs: g(160) })]) + K.foot('From the income commitments. Tap a figure to correct it.') });
    var emis = K.card({ t: 'EMIs and SIP · October', body: K.list([K.row({ icon: 'home', t: 'Mortgage · Nationwide', s: 'joint · Thu 1 Oct', v: g(1456) }), K.row({ icon: 'directions_car', t: 'Car loan · Close Brothers', s: 'Arun · Tue 20 Oct', v: g(347) }), K.row({ icon: 'home_work', t: 'Home loan · HDFC', s: 'Arun · Pune flat · Mon 5 Oct', v: ri(39390), vs: g(350) }), K.row({ icon: 'trending_up', t: 'SIP · Parag Parikh Flexi Cap', s: 'Asha · Sat 10 Oct', v: ri(10000), vs: g(89) })]) + K.foot('From the loans and the SIP, so nobody types them twice.') });
    var nov = at(ctx, '2026-11-05T20:46') ? K.note('savings', 'November’s plan: the School fees pot, ' + g(690) + ' a month, added Thu 5 Nov 20:46 on your Confirm; planned surplus ' + g(2636) + ' → ' + g(1946) + '.') : '';
    var ban = waiting && ctx.web ? K.note('hourglass_top', 'Two statements are waiting for your Confirm in the chat. October’s actuals fill in when you confirm them.') : '';
    return { title: 'Budget', sub: closed ? 'October 2026 · closed Sun 1 Nov 09:02 · illustrative figures' : 'October 2026 · open · ' + (waiting ? 'October’s statements not confirmed yet' : 'until the check-in on the 1st') + ' · illustrative figures', chip: K.draft(),
      right: K.seg([{ t: 'Sep' }, { t: 'Oct', on: true }, { t: 'Nov' }]), body: wrap(ban + nov + hero + '<div class="cols">' + pa + inc + emis + '</div>' + K.foot(ILLUS)) };
  });

  /* ---------- the Projection: its runs, as of the step's time ---------- */
  var NOWY = { '2026-10-26': 2026.82, '2026-11-01': 2026.84, '2026-11-05': 2026.85 };
  function runFor(ctx) {
    var P = fp(ctx), R = P.runs || {}, E = (P.evening2 || {}).plans_tab || {}, t = ctx.t;
    var pick = function (k, src) { var r = (src || R)[k]; return r ? Object.assign({ key: k }, r) : null; };
    if (ctx.has('pot') && t < '2026-11-05T20:53') return pick('R2');
    if (t >= '2026-11-05T21:16' && P.evening2 && P.evening2.wedding) return Object.assign({ key: 'W', when: 'Thu 5 Nov 21:16' }, P.evening2.wedding);
    if (t >= '2026-11-05T21:13') return pick('R7', E);
    if (t >= '2026-11-05T21:11') return pick('R6', E);
    if (t >= '2026-11-05T21:09') return pick('R5b', E);
    if (t >= '2026-11-05T21:08') return pick('R5', E);
    if (t >= '2026-11-05T20:59') return pick('R4');
    if (t >= '2026-11-05T20:53') return pick('R3');
    if (t >= '2026-11-05T20:46') return pick('R2');
    if (t >= '2026-11-05T20:43') return pick('R1');
    if (t >= '2026-11-05T09:13') return pick('R5N');
    if (t >= '2026-11-01T09:03') return pick('R0');
    return P.R26 ? Object.assign({ key: 'R26' }, P.R26) : null;
  }
  function fanAt(run, y) { for (var i = 0; i < run.fan.length; i++) if (run.fan[i].year === y) return run.fan[i]; return null; }
  function plansFor(ctx) {
    var t = ctx.t, list = [
      { id: 'extension', icon: 'construction', t: 'Home extension', s: '−' + g(35000) + ' once, Jun 2027', kind: 'once', a: 2027.42, cls: 'out' },
      { id: 'bonus', icon: 'redeem', t: 'Asha’s annual bonus', s: '+' + g(3000) + ' each March, growing 3.5% a year', kind: 'yearly', a: 2027.17, b: 2046.9, cls: 'in' },
      { id: 'car2', icon: 'directions_car', t: 'Replace the car', s: '−' + g(25000) + ' once, Jun 2031', kind: 'once', a: 2031.42, cls: 'out' }];
    if (t >= '2026-11-05T20:43') list.splice(0, 0, { id: 'schooling', icon: 'school', t: 'School fees', s: '−' + g(4000) + ' a month, Jan 2029 to Jul 2041', kind: 'flow', a: 2029.0, b: 2041.5, cls: 'out', at: '20:43' });
    if (t >= '2026-11-05T20:46' || ctx.has('pot')) list.splice(0, 0, { id: 'pot', icon: 'savings', t: 'School fees pot', s: g(690) + ' a month to Dec 2028, then tops up the surplus', kind: 'pot', a: 2026.84, b: 2029.0, cls: 'pot', at: '20:46' });
    if (t >= '2026-11-05T20:53') list.push({ id: 'salary_step', icon: 'work', t: 'Arun’s salary', s: 'Set to ' + g(5500) + ' a month from Sep 2028', kind: 'step', a: 2028.67, cls: 'in', at: '20:53' });
    if (t >= '2026-11-05T20:59') list.push({ id: 'hdfc_close', icon: 'real_estate_agent', t: 'Close the HDFC home loan', s: 'With the SBI FD, Mar 2029', kind: 'evt', a: 2029.17, cls: 'evt', at: '20:59' });
    var order = ['pot', 'bonus', 'extension', 'salary_step', 'schooling', 'hdfc_close', 'car2'];
    return list.sort(function (x, y) { return order.indexOf(x.id) - order.indexOf(y.id); });
  }
  function fanChart(ctx, run, compact) {
    var m = K.mode(), nowY = NOWY[ctx.t.slice(0, 10)] || 2026.85, net = ctx.W.T.net_gbp;
    var yrs = run.fan.filter(function (r) { return r.year >= 2027 && r.year <= 2046; });
    var mid = [[nowY, net]].concat(yrs.map(function (r) { return [r.year, r.p50]; })), lo = [[nowY, net]].concat(yrs.map(function (r) { return [r.year, r.p10]; })), hi = [[nowY, net]].concat(yrs.map(function (r) { return [r.year, r.p90]; }));
    var top = Math.max.apply(null, hi.map(function (p) { return p[1]; })) * 1.08;
    var ys = [2000000, 4000000, 6000000].filter(function (v) { return v < top; });
    var f36 = fanAt(run, 2036), f46 = fanAt(run, 2046);
    var scrub = [{ x: nowY, y: net, k: 'Today', v: net, ccy: 'GBP', s: 'Recorded net worth' }].concat(yrs.map(function (r) {
      return { x: r.year, y: r.p50, k: String(r.year), v: r.p50, lo: r.p10, hi: r.p90, ccy: 'GBP' };
    }));
    return K.line({ x0: nowY, x1: 2046, y0: 0, y1: top, h: compact ? '170px' : '240px', grid: ys,
      gridColor: m === 'classic' ? null : 'var(--mp-hero-2)',
      label: 'The Projection: the middle path and 8 in 10 of the engine’s runs, to 2046',
      bands: [{ lo: lo, hi: hi, color: m === 'classic' ? 'var(--mp-hero-area)' : 'var(--mp-band)' }],
      series: [{ pts: mid, color: 'var(--mp-coral)', w: 2.5 }],
      dots: [{ x: 2029.13, y: interp(mid, 2029.13) }, { x: 2030.5, y: interp(mid, 2030.5) }, { x: 2045.75, y: interp(mid, 2045.75) }],
      stats: [{ k: 'Today', v: g(net) }, { k: '2036 middle', v: g(f36 ? f36.p50 : net) }, { k: '2046 spread', v: f46 ? g(f46.p10) + ' to ' + g(f46.p90) : g(net) }],
      scrub: scrub,
      yLabels: ys.map(function (v) { return { y: v, t: mny('£' + v / 1e6 + 'm') }; }),
      xLabels: (compact ? [[nowY, 'Today'], [2036, '2036'], [2046, '2046']] : [[nowY, 'Today'], [2031, '2031'], [2036, '2036'], [2041, '2041'], [2046, '2046']]).map(function (x) { return { x: x[0], t: x[1] }; }) }) +
      '<div class="legend"><span><i class="k-line"></i>Middle path</span><span><i class="k-band"></i>8 in 10 runs</span><span>● A loan ends</span></div>';
  }
  function interp(pts, x) { for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); } return pts[pts.length - 1][1]; }
  function projTabs(which) {
    return [{ t: 'Net worth', go: 'nav:projection', on: which === 'net' }, { t: 'Plans', go: 'nav:projection/plans', on: which === 'plans' }, { t: 'Budget forecast', go: 'nav:projection/forecast', on: which === 'forecast' }];
  }
  function projControls(ctx) {
    return '<div class="fx ac g8 wrap">' + K.seg([{ t: '5 yrs' }, { t: '10 yrs' }, { t: '20 yrs', on: true }, { t: '30 yrs' }]) + K.seg([{ t: '£ GBP', on: true }, { t: '₹ INR' }]) + '<span class="mp-foot mp-ink2">Today’s money: off</span></div>';
  }
  function netWorthTab(ctx) {
    var run = runFor(ctx), admin = ctx.isAdmin, editing = admin && (ctx.has('asm') || (ctx.step && ctx.step.asmEdit));
    if (!run) return K.card({ body: K.note('hourglass_empty', 'The Projection runs after the first records are in.') });
    var f46 = fanAt(run, 2046);
    var hero = K.hero({ k: 'Middle path in 2046', v: g(f46.p50), s: 'From ' + g(ctx.W.T.net_gbp) + ' today. 8 in 10 of the engine’s runs end between ' + g(f46.p10) + ' and ' + g(f46.p90) + '.', extra: fanChart(ctx, run, ctx.compact || ctx.door === 'ipad'), id: 'w-fan' });
    var chips = '<div class="fx g8 wrap">' + ['What if we buy a second flat?', 'What if the plan items fall away?', 'What moves the line most?'].map(function (t) { return '<button type="button" class="gchip' + (ctx.web ? '' : ' lg') + '"' + K.go('tab:chat') + '><span>' + t + '</span></button>'; }).join('') + '</div>';
    var ms = [['savings', 'Asha’s fixed-rate saver matures', '14 Dec 2026', g(10460)], ['percent', 'Mortgage fixed rate ends', '30 Jun 2028 · then a variable rate', ''], ['directions_car', 'Car loan paid off', '20 Feb 2029 · frees ' + g(347) + ' a month', ''],
      ['account_balance', 'SBI FD matures', '10 Mar 2029', ri(617538)], ['home_work', 'HDFC home loan paid off', ctx.t >= '2026-11-05T20:59' ? 'Mar 2029, with the SBI FD · frees ' + ri(39390) + ' a month' : '5 Jul 2030 · frees ' + ri(39390) + ' a month', ''], ['shield', 'LIC policy matures', '28 Mar 2031', ''], ['home', 'Mortgage paid off', '1 Oct 2045 · frees ' + g(1456) + ' a month', '']];
    if (ctx.t >= '2026-11-05T20:43') ms.splice(4, 0, ['school', 'School fees start', 'Jan 2029 · ' + g(4000) + ' a month', '']);
    var msC = K.card({ t: 'Milestones', r: '<span class="mp-foot mp-ink2">from the records, on the line above</span>', body: K.list(ms.map(function (m) { return K.row({ icon: m[0], t: m[1], s: m[2], v: m[3] || null }); })) });
    var plans = plansFor(ctx);
    var plC = K.card({ t: 'Plan items', r: '<span class="mp-foot mp-ink2">' + (admin ? 'yours alone, as the admin' : 'Arun’s, the admin’s') + '</span>', body: K.list(plans.map(function (p) { return K.row({ icon: p.icon, t: p.t, s: p.s, chev: admin }); })) +
      (admin ? '<div>' + K.btn('Add a plan item in the chat', 'tab:chat', 'tinted small', 'chat_bubble') + '</div>' : lockline('Plan items are Arun’s, the admin’s. Ask a what-if in the chat to try your own.')) });
    var ASM = [['Returns', [['Parag Parikh Flexi Cap', 'History, shrunk to a prior', 'Its own 10.7% XIRR, toward India shares’ 9%: 3.8 years of history moves the long-run prior only a little.', '9.06%'], ['Balanced and the ETFs', 'Prior', 'Long-run UK shares.', '6%'], ['Home, Reading', 'Prior', 'Long-run UK property.', '3%'], ['Flat, Pune', 'Prior', 'Long-run India property.', '5%'], ['SBI fixed deposit', 'Contract', 'Its own rate, to 10 Mar 2029.', '7.1%'], ['PPF', 'Contract', 'The account’s own rate.', '7.1%']]],
      ['Pay, a year', [['Arun’s salary growth', admin ? 'Set by you' : 'Set by Arun', 'His own 4.8% a year since 2022, without the UK’s 3.5% blended in; set on Mon 26 Oct.', '4.8%', 'arun'], ['Asha’s salary growth', 'History and prior', 'Her 3.5% a year since 2023, blended with the UK’s 3.5%.', '3.5%']]],
      ['Prices, a year', [['UK inflation', 'Prior', 'Long-run UK consumer prices.', '2.5%'], ['India inflation', 'Prior', 'Long-run India prices; the gap also drifts the rupee.', '5%']]],
      ['The budget', [[admin ? 'Your floor' : 'Arun’s floor', admin ? 'Your setting' : 'Arun’s setting', 'The monthly surplus kept. A plan that takes the surplus under it brings ways to cover it.', mny('£500'), 'floor']]]];
    var asm = (admin ? K.note('edit', 'Tap a figure to correct it. Only you can, as the admin; each change is audited.') : lockline('Arun keeps these figures. Ask in the chat to see what other figures would do.'));
    ASM.forEach(function (gr) {
      asm += '<div class="mp-hl" style="margin-top:6px">' + gr[0] + '</div>';
      gr[1].forEach(function (a) {
        if (a[4] === 'arun' && editing) {
          asm += '<div class="edit" id="w-asmedit" style="padding:8px 0"><span class="mp-sub" style="font-weight:600">' + a[0] + '</span><span class="mp-foot mp-ink2">A year · now 4.8%, set by you on Mon 26 Oct</span>' +
            '<div class="field">4.17%<span class="caret"></span></div><div class="ba"><span>4.8%</span>' + K.ms('arrow_forward') + '<span>4.17%</span></div>' +
            K.foot('The blend of your 4.8% with the UK’s 3.5%, the figure before you set yours. Save runs the Projection again.') +
            '<div class="btns">' + K.btn('Save', 'asm:save', 'primary small') + K.btn('Cancel', 'asm:cancel', 'tinted small') + '</div></div>';
        } else {
          asm += K.row({ t: a[0], s: K.chip(a[1], 'mp-neutral') + ' ' + a[2], v: a[3] + (admin ? ' ' + K.ms('edit', 'mp-ink2') : ''), go: a[4] === 'arun' && admin ? 'asm:arun' : null, id: a[4] === 'arun' ? 'w-asm-arun' : null });
        }
      });
    });
    var asmC = K.card({ t: 'Assumptions', r: '<span class="mp-foot mp-ink2">each with its source</span>', id: 'w-asm', body: '<div class="fx col">' + asm + '</div>' });
    return hero + chips + '<div class="cols">' + msC + plC + asmC + '</div>' +
      K.foot('Illustrative figures from the future-plans figure set, run ' + (run.when || '') + ', month by month. A projection, not a promise: the engine’s middle path is no more likely than the band around it.');
  }
  function plansTab(ctx) {
    var run = runFor(ctx), plans = plansFor(ctx), admin = ctx.isAdmin, f46 = run ? fanAt(run, 2046) : null;
    var X = function (y) { return Math.max(0, Math.min(100, (y - 2026.84) / (2046.9 - 2026.84) * 100)); };
    var lanes = plans.map(function (p) {
      var marks = '';
      if (p.kind === 'flow' || p.kind === 'pot') marks = '<i class="' + p.cls + '" style="left:' + X(p.a).toFixed(1) + '%;width:' + (X(p.b) - X(p.a)).toFixed(1) + '%"></i>';
      else if (p.kind === 'once') marks = '<i class="once ' + p.cls + '" style="left:' + X(p.a).toFixed(1) + '%"></i>';
      else if (p.kind === 'evt') marks = '<i class="evt" style="left:' + X(p.a).toFixed(1) + '%"></i>';
      else if (p.kind === 'step') marks = '<i class="step" style="left:' + X(p.a).toFixed(1) + '%"></i><i class="in" style="left:' + X(p.a).toFixed(1) + '%;width:' + (100 - X(p.a)).toFixed(1) + '%;opacity:.45"></i>';
      else if (p.kind === 'yearly') for (var y = 2027; y <= 2046; y++) marks += '<i class="tick" style="left:' + X(y + 0.17).toFixed(1) + '%"></i>';
      return '<div class="lane"><div class="lane-n">' + K.ms(p.icon) + '<div class="fx col f1"><span class="mp-sub" style="font-weight:600">' + p.t + '</span><span class="mp-foot mp-ink2">' + p.s + '</span></div>' + (admin ? K.ms('more_horiz', 'mp-ink2') : '') + '</div><div class="lane-t">' + marks + '</div></div>';
    }).join('');
    var axis = '<div class="lane-x"><div></div><div><span style="left:0">Today</span><span style="left:' + X(2031).toFixed(1) + '%">2031</span><span style="left:' + X(2036).toFixed(1) + '%">2036</span><span style="left:' + X(2041).toFixed(1) + '%">2041</span><span style="left:100%">2046</span></div></div>';
    var leg = '<div class="legend"><span><i class="sw c1"></i>Money out</span><span><i class="sw" style="background:var(--mp-up)"></i>Money in</span><span><i class="sw c5"></i>Into a pot</span><span>● Once</span><span>◆ An event on a record</span><span>| A change from a date</span></div>';
    var meet = '';
    if (ctx.t >= '2026-11-05T20:59') {
      var P = fp(ctx), R4 = (((P.forecast || {}).R4 || {}).months_2029) || [], jan = R4[0] || {}, feb = R4[1] || {}, L = P.later || {};
      meet = K.card({ t: 'Where four plans meet', r: '<span class="mp-foot mp-ink2">Sep 2028 to Mar 2029, from the engine</span>', id: 'w-meet', body: '<div class="seq">' +
        '<div><b>Sep 2028</b><span class="mp-sub">Arun’s salary steps up to ' + g(5500) + ' a month, from ' + g((L.salary_step || {}).arun_take_home_aug_2028 || 0) + '.</span></div>' +
        '<div><b>Dec 2028</b><span class="mp-sub">The school fees pot has had ' + g(17940) + ': ' + g(690) + ' a month since Nov 2026.</span></div>' +
        '<div><b>Jan 2029</b><span class="mp-sub">School fees start, ' + g(4000) + ' a month; the pot tops the surplus up to your ' + mny('£500') + ' floor: ' + g(jan.from_pot || 0) + ' in Jan, ' + g(feb.from_pot || 0) + ' in Feb.</span></div>' +
        '<div><b>Mar 2029</b><span class="mp-sub">The SBI FD’s ' + ri(((L.hdfc_close || {}).fd_inr) || 0) + ' closes the HDFC loan (' + ri(((L.hdfc_close || {}).balance_mar_2029_inr) || 0) + '); its ' + ri(39390) + ' EMI stops. From here the surplus stays above ' + mny('£500') + '.</span></div></div>' });
    }
    var head = K.card({ t: plans.length + ' plans · ' + (admin ? 'yours alone, as the admin' : 'Arun’s, the admin’s'), r: admin ? K.btn('Add in chat', 'tab:chat', 'tinted small', 'chat_bubble') : '', id: 'w-plans', body:
      (f46 ? K.p('On them, the middle path reaches ' + g(f46.p50) + ' in 2046; 8 in 10 runs end between ' + g(f46.p10) + ' and ' + g(f46.p90) + '.') : '') +
      '<div class="mp-hl" style="margin-top:8px">Each plan, to 2046</div><span class="mp-foot mp-ink2">from today, ' + ctx.d + '</span>' + lanes + axis + leg +
      (admin ? K.foot('Tap a plan to correct its figures, pause it or end it. Nothing is added here: a new plan starts in the chat.') : lockline('Plans are Arun’s, the admin’s: you see them without the pencils and save nothing.')) });
    return '<div style="container-type:inline-size" class="fx col g16">' + head + meet + '</div>' + K.foot('Illustrative figures from the future-plans figure set. Plans and their figures are the admin’s alone; members see the tab without the pencils and save nothing.');
  }
  function forecastRun(ctx) {
    var F = fp(ctx).forecast || {}, t = ctx.t;
    if (ctx.has('pot') && t < '2026-11-05T20:59') return { k: 'R2', when: 'Thu 5 Nov 20:46', f: F.R2 };
    if (t >= '2026-11-05T21:16' && F.W) return { k: 'W', when: 'Thu 5 Nov 21:16', f: F.W };
    if (t >= '2026-11-05T21:13' && F.R7) return { k: 'R7', when: 'Thu 5 Nov 21:13', f: F.R7 };
    if (t >= '2026-11-05T20:59') return { k: 'R4', when: 'Thu 5 Nov 20:59', f: F.R4 };
    if (t >= '2026-11-05T20:46') return { k: 'R2', when: 'Thu 5 Nov 20:46', f: F.R2 };
    if (t >= '2026-11-05T20:43') return { k: 'R1', when: 'Thu 5 Nov 20:43', f: F.R1 };
    return { k: 'R0', when: t >= '2026-11-05T09:13' ? 'Thu 5 Nov 09:13' : 'Sun 1 Nov 09:03', f: F.R0 };
  }
  function forecastTab(ctx) {
    var FR = forecastRun(ctx), years = ((FR.f || {}).years || []).filter(function (y) { return y.year >= 2027 && y.year <= 2046; });
    if (!years.length) return K.card({ body: K.note('hourglass_empty', 'The Budget forecast runs once the month’s budget is set.') });
    var m = K.mode(), floor = 500, top = 4000, bot = -1000, H = function (v) { return (Math.max(bot, Math.min(top, v)) - bot) / (top - bot) * 100; };
    var X = function (i) { return (i + 0.5) / years.length * 100; };
    var below = years.filter(function (y) { return y.below_floor > 0; }), nBelow = below.reduce(function (s, y) { return s + y.below_floor; }, 0);
    var sel = years.filter(function (y) { return y.year === 2029; })[0];
    var bars = years.map(function (y, i) {
      var v = y.lowest_surplus, z = H(0), h = H(v), cls = v < 0 ? 'neg low' : y.below_floor ? 'low' : v > top ? 'past' : '';   /* the engine's flag, on exact figures: a pot-topped month can show £498 to £501 unflagged */
      var mk = y.below_floor ? '<span class="lean-mk" style="left:' + X(i).toFixed(2) + '%;bottom:calc(' + Math.max(h, H(0)).toFixed(1) + '% + ' + (m === 'b' ? '6px' : '2px') + ')">▼</span>' : '';
      if (m === 'b') {
        var stStyle = v >= 0 ? 'left:' + X(i).toFixed(2) + '%;bottom:' + z.toFixed(1) + '%;height:' + Math.max(1, h - z).toFixed(1) + '%' : 'left:' + X(i).toFixed(2) + '%;bottom:' + h.toFixed(1) + '%;height:' + Math.max(1, z - h).toFixed(1) + '%';
        return '<i class="lean-stem ' + cls + '" style="' + stStyle + '"></i><i class="lean-dot ' + cls + (y.year === 2029 ? ' sel' : '') + '" style="left:' + X(i).toFixed(2) + '%;bottom:' + h.toFixed(1) + '%" title="' + y.year + '"></i>' + mk;
      }
      var slot = m === 'c' ? '<i class="lean-slot" style="left:' + X(i).toFixed(2) + '%"></i>' : '';
      var style = v >= 0 ? 'left:' + X(i).toFixed(2) + '%;bottom:' + z.toFixed(1) + '%;height:' + Math.max(1.5, h - z).toFixed(1) + '%' : 'left:' + X(i).toFixed(2) + '%;bottom:' + h.toFixed(1) + '%;height:' + Math.max(1.5, z - h).toFixed(1) + '%';
      return slot + '<i class="lean-bar ' + cls + (y.year === 2029 ? ' sel' : '') + '" style="' + style + '" title="' + y.year + '"></i>' + mk;
    }).join('');
    var grid = [[4000, '£4k'], [2000, '£2k'], [0, '£0'], [-1000, '−£1k']].map(function (l) {
      var tf = (m !== 'classic' && l[0] === 0) ? ';transform:translateY(-22%)' : '';
      return '<span class="lean-line" style="bottom:' + H(l[0]).toFixed(1) + '%"></span><span class="lean-y" style="top:' + (100 - H(l[0])).toFixed(1) + '%' + tf + '">' + mny(l[1]) + '</span>';
    }).join('') +
      '<span class="lean-line lean-floor" style="bottom:' + H(floor).toFixed(1) + '%"></span><span class="lean-y" style="top:' + (100 - H(floor)).toFixed(1) + '%;color:var(--mp-pause)' + (m !== 'classic' ? ';transform:translateY(-78%)' : '') + '">' + mny('£500') + '</span>';
    var scrubLean = (m === 'classic' || ctx.priv) ? '' : ' data-scrub="' + K.esc(JSON.stringify(years.map(function (y, i) {
      return { x: +X(i).toFixed(2), y: +(100 - H(y.lowest_surplus)).toFixed(2), k: y.year + ' · leanest ' + y.lowest_month.slice(0, 3), v: y.lowest_surplus, ccy: 'GBP', sign: true, s: y.below_floor ? y.below_floor + ' mo below floor' : 'All 12 mo at or above floor' };
    }))) + '" tabindex="0"';
    var statsHtml = K.chartStats([
      { k: 'Monthly floor', v: g(floor) },
      { k: 'Below floor', v: nBelow ? nBelow + ' months' : '0 months' },
      { k: '2029 leanest', v: sel ? sel.lowest_month.slice(0, 3) + ' · ' + sg(sel.lowest_surplus) : 'n/a' }
    ], m);
    var xs = '<div class="lean-x">' + [0, 4, 9, 14, 19].filter(function (i) { return years[i]; }).map(function (i) { return '<span style="left:' + X(i).toFixed(2) + '%">' + years[i].year + '</span>'; }).join('') + '</div>';
    var past = years.filter(function (y) { return y.lowest_surplus > top; });
    var lowSw = (m === 'a' || m === 'b' || m === 'c') ? 'var(--mp-chart-4)' : 'var(--mp-ink-3)';
    var chart = K.card({ t: 'Your leanest month, each year', r: nBelow ? K.chip('▼ ' + nBelow + ' months below your floor', 'mp-pause') : K.chip('No month below your floor', 'mp-add'), id: 'w-lean', body:
      '<span class="mp-foot mp-ink2">2027 to 2046 · against your ' + mny('£500') + ' floor · the engine’s run of ' + FR.when + '</span>' + statsHtml + '<div class="lean"' + scrubLean + '>' + grid + bars + (m === 'classic' ? '' : K.scrubBox()) + '</div>' + xs +
      '<div class="legend" style="margin-top:8px"><span><i class="sw c1"></i>At or above your floor</span><span><i class="sw" style="background:' + lowSw + '"></i>▼ Below it</span><span><i class="k-dash" style="border-color:var(--mp-pause)"></i>Your floor, ' + mny('£500') + ' a month</span></div>' +
      (past.length ? K.foot(past[0].year + ' to ' + past[past.length - 1].year + ' run past ' + mny('£4,000') + ': their leanest months are ' + g(past[0].lowest_surplus) + ' to ' + g(past[past.length - 1].lowest_surplus) + (FR.k === 'R0' ? '.' : ', once the school fees end in Jul 2041.')) : '') });
    var yr = '';
    if (sel) {
      var line = function (t, s, v, cls) { return '<div class="yr' + (cls ? ' ' + cls : '') + '"><div class="fx col f1"><span class="yr-t">' + t + '</span>' + (s ? '<span class="yr-s">' + s + '</span>' : '') + '</div><span class="yr-v">' + v + '</span></div>'; };
      var inc = Object.keys(sel.income).map(function (k) { return k + ' ' + g(sel.income[k]); }).join(' · ');
      var emi = Object.keys(sel.emis).map(function (k) { return k.split(' · ')[0] + ' ' + g(sel.emis[k]); }).join(' · ');
      var planLines = Object.keys(sel.plans || {}).map(function (k) { return line(k, 'Your plan, saved at 20:43 · ' + g(4000) + ' a month', sg(sel.plans[k])); }).join('');
      var months = ((FR.f.months_2029 || []).map(function (m) { var low = m.surplus < floor; return '<div class="mo' + (low ? ' low' : '') + '"><span>' + m.month.slice(0, 3) + '</span><b>' + (low ? '▼ ' : '') + sg(m.surplus) + '</b></div>'; })).join('');
      yr = K.card({ t: '2029', r: sel.below_floor ? K.chip('▼ ' + sel.below_floor + ' months below your floor', 'mp-pause') : K.chip('At or above your floor', 'mp-add'), id: 'w-2029', body:
        '<span class="mp-foot mp-ink2">Jan to Dec, in pounds of 2029 · tap a figure to see what makes it</span>' +
        line('Income', inc, g(sel.income_total)) + line('Spending', '12 categories, each with its inflation key', sg(-sel.spend_total)) + line('EMIs', emi, sg(-sel.emis_total)) +
        line('SIP and LIC’s premium', 'Parag Parikh ' + g(sel.sip) + ' · LIC ' + g(sel.premium) + ' in March', sg(-(sel.sip + sel.premium))) + planLines +
        (sel.from_pot ? line('From the school fees pot', 'tops the surplus up to your floor', sg(sel.from_pot)) : '') +
        line('Surplus', 'the lines above, added', sg(sel.surplus), 'sum') + line('Savings rate', '', K.pct(sel.savings_rate * 100, { dp: 1, sign: sel.savings_rate < 0 })) +
        line('Cash, end of December', '', g(sel.closing_cash)) + line('Leanest month', '', sel.lowest_month.slice(0, 3) + ', ' + sg(sel.lowest_surplus)) +
        (months ? '<div class="mp-hl" style="margin-top:8px">2029, month by month</div><div class="months">' + months + '</div>' : '') +
        (sel.below_floor ? '<div>' + K.btn('Ways to cover it', 'tab:chat', 'tinted small', 'chat_bubble') + '</div>' : '') });
    }
    return chart + yr + K.foot('Illustrative figures from the future-plans figure set, the engine’s run of ' + FR.when + '. A forecast of the budget, worked out month by month from your records, commitments and plans: no randomness and no model.');
  }
  function projectionPage(ctx, args) {
    var which = args[0] === 'plans' ? 'plans' : args[0] === 'forecast' ? 'forecast' : 'net';
    var run = runFor(ctx), plans = plansFor(ctx);
    var chip = which === 'net' ? K.picked('Picked · 1a, the fan first') : which === 'plans' ? K.picked('Picked · 3a, bars on a timeline') : K.picked('Picked · 1a, the surplus first');
    var sub = which === 'plans' ? plans.length + ' plans, Arun’s · the engine’s run of ' + (run ? run.when : '') : which === 'forecast' ? 'Each year to 2046, in pounds of each year · the engine’s run, ' + forecastRun(ctx).when : 'Net worth over the next 20 years, in the pounds of each year · the engine’s run of ' + (run ? run.when : '');
    var body = which === 'plans' ? plansTab(ctx) : which === 'forecast' ? forecastTab(ctx) : netWorthTab(ctx);
    return { title: 'Projection', sub: sub, chip: chip, tabs: projTabs(which), body: wrap(projControls(ctx) + body) };
  }
  M.page('projection', projectionPage);
  M.page('plans', function (ctx) { return projectionPage(ctx, ['plans']); });

  /* ---------- Reports and exports (phase 9, MA-97) ---------- */
  M.page('reports', function (ctx) {
    var T = ctx.W.T, B = hh(ctx).budget_oct || {};
    var reps = [['account_balance', 'Net worth statement', 'Every record and debt, by member and country, at ' + ctx.d + ' · ' + g(T.net_gbp)],
      ['pie_chart', 'Budget, month by month', 'October closed: ' + g(B.spend_actual) + ' spent of ' + g(B.spend_plan) + ', surplus ' + g(B.surplus_actual)],
      ['trending_up', 'Holdings and their returns', 'Each holding’s value and XIRR, with the dated events behind it'],
      ['credit_card', 'Debts and their schedules', 'Each loan’s balance, its interest split by year and when it ends'],
      ['receipt_long', 'The audit log', 'Every change, who made it and how, with its files']];
    var rows = reps.map(function (r, i) {
      return '<div class="rep"><span class="mp-icontile" style="background:var(--mp-surface-2)">' + K.ms(r[0]) + '</span><div class="f1 fx col"><span class="mp-sub" style="font-weight:600">' + r[1] + '</span><span class="mp-foot mp-ink2">' + r[2] + '</span></div>' +
        '<div class="fx g6">' + ['PDF', 'CSV', 'XLSX'].map(function (f) { return '<button type="button" class="fmt"' + K.go('rep:' + f.toLowerCase()) + (i === 0 && f === 'PDF' ? ' id="w-rep-pdf"' : '') + '>' + f + '</button>'; }).join('') + '</div></div>';
    }).join('');
    var cut = K.card({ t: 'The address', body: K.list([K.row({ icon: 'language', t: 'mypaisapp.com', s: 'now opens dashboard.mypaisapp.com', vs: K.chip('Redirects', 'mp-add') }), K.row({ icon: 'inventory_2', t: 'The old wealth tracker', s: 'retired: it held no real data, and its maths lives on in the engine', vs: K.chip('Retired', 'mp-neutral') })]) });
    return { title: 'Reports and exports', sub: 'Household · ' + ctx.d + ' · each made from the ledger as it stands, figures from the engine', chip: K.draft(),
      body: wrap(K.card({ t: 'Reports', r: '<span class="mp-foot mp-ink2">a file is made when you tap, and kept in Files</span>', id: 'w-reps', body: rows }) + cut + K.note('chat', 'Anything else is a question in the chat: it is answered from a read-only copy of the ledger, with the query shown under Technical.') + K.foot(ILLUS)) };
  });

  /* ======================= the chat ======================= */
  function card(o) { return '<div class="pv5-wealth">' + K.ccard(Object.assign({}, o, { body: o.body ? wc(o.body) : '' })) + '</div>'; }
  function chipQ(q, opts) { return '<span class="mp-sub" style="font-weight:600">' + q + '</span><div class="fx g8 wrap">' + opts.map(function (o) { return K.cbtn(o[0], o[1], o[2] || null); }).join('') + '</div>'; }
  function savedFoot(t) { return '<span class="mp-foot mp-ink2 fx ac g6">' + K.ms('history') + 'Saved · in the audit log · ' + t + '</span>'; }
  function overline(t) { return '<span class="mp-cap mp-ink2" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase">' + t + '</span>'; }

  /* Mon 26 Oct, Arun's chat. stage: 0 whose · 1 confirm · 2 saved · 3 replay · 4 correcting · 5 corrected · 6 rupees · 7 the £200 replay · 8 Portfolio · 9 Infosys · 10 Asha's fund */
  function monChat(ctx, stage, o) {
    o = o || {};
    var out = [];
    /* the replays sit above today, where they fall in time */
    if (stage >= 7) {
      out.push(K.note('replay', 'Replay of Fri 23 Oct, 08:13. Balanced’s ' + g(22925) + ' at the Fri 23 Oct close already holds this buy, so net worth does not move.'));
      out.push(K.daysep('Fri 23 Oct 08:13'));
      out.push(K.me('I put ' + g(200) + ' into Balanced today', '08:13'));
      var bought = stage > 7 || ctx.has('bought');
      out.push(K.ai('', { cards: [card({ chip: overline(bought ? 'New transaction · saved' : 'New transaction · check it') + K.draft(), h: (bought ? K.ms('check_circle', 'mp-up') + ' ' : '') + 'Bought ' + g(200) + ' of Balanced', id: 'w-buy',
        body: K.kv('When', 'Fri 23 Oct') + K.kv('Units', 'about 10.8 at NAV ' + mny('£18.57')) + (bought ? '' : K.kv('Currency', 'pounds, as Balanced is') + K.kv('Account', 'Monzo ISA') + K.foot('Nothing is saved until you tap Confirm.')) + (bought ? savedFoot('08:14') : ''),
        acts: bought ? [] : [K.cbtn('Confirm', 'buy:confirm', 'primary'), K.cbtn('Edit', 'x:edit'), K.cbtn('Cancel', 'x:cancel', 'ghost')] })] }));
    }
    if (stage >= 3) {
      out.push(K.note('replay', 'Replay of setup day, Sun 25 Oct. The SBI FD and Asha’s fund are already in the household’s figures, so net worth does not move.'));
      out.push(K.daysep('Sun 25 Oct 10:01'));
      out.push(K.me('SBI FD, 5 lakh at 7.1% for 3 years from 10 March', '10:01'));
      out.push(K.ai('', { cards: [card({ chip: overline('New fixed deposit') + K.draft(), body: K.kv('Whose is it?', 'Arun') + K.kv('Interest?', 'Added in, cumulative') }),
        card({ chip: overline('New fixed deposit · saved'), h: K.ms('check_circle', 'mp-up') + ' SBI · ' + ri(500000) + ' at 7.1%', id: 'w-fd', body: K.kv('Owner', 'Arun') + K.kv('From', 'Tue 10 Mar 2026, 3 years') + K.kv('Interest', 'Added in, quarterly') +
          K.kv('Matures', 'Sat 10 Mar 2029') + K.kv('At maturity', ri(617538)) + K.kv('On maturity', 'I’ll ask you then') + K.foot('MyPaisa’s engine works out the maturity from the rate, the term and SBI’s quarterly compounding.') + savedFoot('10:03') })],
        meta: 'A replay: the FD counts at ' + ri(517908) + ' today, the engine’s figure, and has since Sun 25 Oct.', icon: 'replay' }));
      out.push(K.daysep('Sun 25 Oct 10:30'));
      out.push(K.me('Add Asha’s Parag Parikh Flexi Cap, direct growth: 6,437.512 units, SIP ' + ri(10000) + ' on the 10th', '10:30'));
      var aSaved = stage > 3;
      out.push(K.ai('', { cards: [card({ chip: overline(aSaved ? 'New holding · saved' : 'New holding · check it') + K.chip(K.ms('person') + 'For Asha', 'mp-neutral') + K.draft(), h: 'Parag Parikh Flexi Cap · Direct Growth', id: 'w-ashafund',
        body: K.note('badge', 'Asha owns it. You are adding it for her; it counts in her share.') + K.kv('Owner', 'Asha') + K.kv('Folio', 'CAMS') + K.kv('Units', '6,437.512') + K.kv('Value', ri(561995)) + K.kv('NAV', inrDp(87.3) + ', AMFI, Fri 23 Oct') + K.kv('SIP', ri(10000) + ' on the 10th') +
          (aSaved ? savedFoot('10:31') : K.foot('Her SIP check-ins go to her, from Tue 10 Nov. Nothing is saved until you tap Confirm.')),
        acts: aSaved ? [] : [K.cbtn('Confirm', 'asha:confirm', 'primary'), K.cbtn('Edit', 'x:edit'), K.cbtn('Cancel', 'x:cancel', 'ghost')] })] }));
    }
    out.push(K.daysep('Today 08:30'));
    out.push(K.ai('', { cards: [digestCard()] }));
    out.push(K.daysep('09:00'));
    /* the 09:00 valuation check-in: two due at once, then one by one */
    var vc;
    if (stage < 4) vc = card({ chip: K.chip(K.ms('event_available') + 'Check-ins', 'mp-neutral') + '<span class="mp-foot mp-ink2">2 valuations</span>', h: 'Are these still about right?', id: 'w-valcard',
      body: K.row({ lead: lead('£'), t: 'Home, Reading', s: 'Due Fri 30 Oct', v: g(415000) }) + K.row({ lead: lead('₹'), t: 'Flat, Pune', s: 'Due since 15 Jul', v: ri(11000000), vs: '<span class="amber">Overdue</span>' }) + K.foot('Both still right saves each figure as today’s valuation, exactly as shown.'),
      acts: [K.cbtn('Both still right', 'x:both', 'primary'), K.cbtn('One by one', 'val:one')] });
    else if (stage === 4) vc = card({ chip: K.chip(K.ms('event_available') + 'Check-in', 'mp-neutral') + '<span class="mp-foot mp-ink2">valuation due · 1 of 2</span>', h: 'Is ' + g(415000) + ' still about right for Home, Reading?', id: 'w-valcard',
      body: K.kv('Last valued', 'Thu 30 Apr, your figure') + K.kv('Still right saves', g(415000) + ' as at today') + K.kv('You tapped', 'Change it, 09:51') + K.foot('The figure opened on its page, beside this. Next: Flat, Pune, overdue since 15 Jul.'),
      acts: [K.cbtn('Still right', 'x:still', 'primary'), K.cbtn('Change it', 'val:change')] });
    else vc = card({ chip: K.chip(K.ms('event_available') + 'Check-in', 'mp-neutral') + '<span class="mp-foot mp-ink2">answered 09:52</span>', h: K.ms('check_circle', 'mp-up') + ' Home, Reading', id: 'w-valcard',
      body: K.kv('Recorded', g(415000)) + K.kv('Now', g(428000) + ', your estimate') + K.foot('Answered at 09:52 by your correction on the page. Flat, Pune is still to answer: it stays in What’s due.') });
    out.push(K.ai('', { cards: [vc] }));
    /* 09:40, the first record */
    out.push(K.daysep('09:40'));
    out.push(K.me(g(5000) + ' in Monzo savings', '09:40'));
    if (stage === 0) {
      out.push(K.ai('', { cards: [card({ chip: overline('New savings · one question'), id: 'w-whose', body: K.kv('What is it?', 'Savings · Monzo') + K.kv('How much?', g(5000)) + chipQ('Whose is it?', [['Arun', 'whose:arun'], ['Asha', 'x:asha'], ['Joint', 'x:joint']]) }),
      ], meta: 'draft_record found one thing missing: whose it is', icon: 'function' }));
      return out;
    }
    var sv = stage >= 2;
    out.push(K.ai(sv ? '' : 'Here it is. Check it, then Confirm.', { cards: [card({ chip: overline('New savings'), body: K.kv('Whose is it?', 'Arun') }),
      card({ chip: overline(sv ? 'New record · saved' : 'New record · check it'), h: (sv ? K.ms('check_circle', 'mp-up') + ' ' : '') + 'Instant access savings · Monzo', id: 'w-monzo',
        body: K.kv('Owner', 'Arun') + K.kv('Value', g(5000)) + (sv ? savedFoot('09:41') : K.kv('As of', 'Today, Mon 26 Oct') + K.kv('Kind', 'Savings, UK, in pounds') + K.kv('Counts as', 'Liquid') + K.foot('Nothing is saved until you tap Confirm.')),
        acts: sv ? [] : [K.cbtn('Confirm', 'confirm', 'primary'), K.cbtn('Edit', 'x:edit'), K.cbtn('Cancel', 'x:cancel', 'ghost')] })],
      meta: sv ? 'Net worth ' + g(439951) + ' → ' + g(444951) + ', on every open door' : 'propose_change: the draft is hashed and held until you confirm', icon: sv ? 'devices' : 'function' }));
    if (!sv) return out;
    out.push(K.ai('Done. Tell me the next one the same way, or send a statement.'));
    if (stage >= 4) {
      out.push(K.daysep('09:43'));
      out.push(K.me('What can we get at quickly now?', '09:43'));
      out.push(K.ai('Money you could get at within days: the new Monzo savings, the Monzo pot, the NRE account in India, and the funds and shares if you sold them. Asha’s fixed-rate saver unlocks on Mon 14 Dec; the pensions not until 57.',
        { cards: [card({ chip: overline('Liquid now · household'), body: '<span class="mp-num-l">' + g(37596) + '</span><span class="mp-foot mp-ink2">It was ' + g(32596) + ' before the new savings</span>' })], meta: 'get_networth · figures: the engine' }));
    }
    if (stage >= 5) {
      out.push(K.daysep('09:52'));
      out.push(K.ai('Saved as a correction, your estimate. Net worth is now ' + g(457951) + ', the engine’s figure. The next valuation check-in is in six months.', { meta: 'From your correction on the page', icon: 'edit' }));
    }
    if (stage >= 6) {
      out.push(K.daysep('09:55'));
      out.push(K.me('Show it in rupees', '09:55'));
      out.push(K.ai('Here it is in rupees: ' + ri(51519488) + '. India’s records count as they are; the UK’s at ' + RATE() + ', the ECB reference rate of Fri 23 Oct. Home shows the same switch.', { meta: 'get_networth(view: INR) · the engine’s conversion, never Claude’s', icon: 'currency_exchange' }));
    }
    if (stage >= 8) {
      out.push(K.daysep('10:02'));
      out.push(K.me('How are our investments?', '10:02'));
      out.push(K.ai('Steady. Five UK holdings, ' + g(24110) + ' at the Fri 23 Oct close, and Asha’s fund and your Infosys shares in India.', { cards: [portfolioCard(ctx)], meta: 'get_portfolio · get_stances · figures: the engine and the price registry' }));
    }
    if (stage >= 9) {
      out.push(K.daysep('10:04'));
      out.push(K.me('Why is there no return on Infosys?', '10:04'));
      out.push(K.ai('', { cards: [card({ chip: overline('Infosys · its return') + K.draft(), h: 'It has no history yet, so the engine can’t work out its return.', id: 'w-infask',
        body: K.p('Send past buys, or give an estimate. Past buys: Zerodha’s tax P&L or your contract notes.') + K.kv('Shares', '120 at ' + inrDp(1480.5) + ', Fri 23 Oct') + K.kv('Value', ri(177660)),
        acts: [K.cbtn('Send past buys', 'inf:buys', 'primary'), K.cbtn('Give an estimate', 'inf:est'), K.cbtn('Later', 'inf:later', 'ghost')] })], meta: 'get_holding · XIRR returns nothing, with the reason' }));
    }
    if (stage >= 10) {
      out.push(K.daysep('10:06'));
      out.push(K.me('How is Asha’s fund doing?', '10:06'));
      out.push(K.ai('Parag Parikh Flexi Cap is worth ' + ri(561995) + ', from ' + ri(460000) + ' of SIPs since Jan 2023: an XIRR of 10.7% a year. The working is on its page beside this; her next SIP check-in is on Tue 10 Nov.', { meta: 'get_holding · XIRR: the engine’s, from the dated SIPs' }));
    }
    return out;
  }
  function digestCard() {
    return card({ chip: K.chip(K.ms('summarize') + 'Weekly digest', 'mp-neutral') + '<span class="mp-foot mp-ink2">week of Mon 19 Oct</span>' + K.draft(), h: 'Autopay: 2 payments assumed paid', id: 'w-digest',
      body: K.row({ lead: lead('£'), t: 'Mortgage · Nationwide', s: 'Thu 1 Oct · joint', v: g(1456) }) + K.row({ lead: lead('£'), t: 'Car loan · Close Brothers', s: 'Tue 20 Oct', v: g(347) }) + K.kv('In all', g(1803)) +
        K.foot('Both are on autopay, so each was saved as paid once its grace passed. Nothing to do unless one didn’t go.') +
        '<span class="mp-foot mp-ink2 fx ac g6">' + K.ms('notifications_paused') + 'One quiet notification for the week, no sound</span>',
      acts: [K.cbtn('One didn’t go', 'x:didnt'), K.cbtn('Open Debts', 'nav:debts', 'ghost')] });
  }
  function portfolioCard(ctx) {
    var who2 = ctx.has('pf:arun') ? 'arun' : ctx.has('pf:asha') ? 'asha' : 'all', ST = stances(ctx), list = records(ctx).filter(function (a) { return a.group === 'inv' || a.id === 'pot'; });
    var mine = list.filter(function (a) { return who2 === 'all' || a.owners.some(function (o) { return o[0] === who2; }); });
    var uk = mine.filter(function (a) { return a.country === 'UK'; }), ukSum = uk.reduce(function (s, a) { return s + (a.owners.length > 1 && who2 !== 'all' ? a.gbp / 2 : a.gbp); }, 0);
    var rows = mine.map(function (a) {
      var s = ST[a.id], half = a.owners.length > 1 && who2 !== 'all';
      return K.row({ lead: lead(LEAD[a.id].slice(0, 1)), t: a.name.replace(' · Direct Growth', '').replace(' (BlackRock MyMap 5)', ''), s: who(a.owners) + ' · ' + (a.account || '') + (half ? ' · half' : ''), v: a.ccy === 'INR' ? ri(a.value) : g(half ? a.gbp / 2 : a.value), vs: s ? K.stance(s.code, s.conf) : a.ccy === 'INR' ? '≈ ' + g(a.gbp) : 'cash, no stance' });
    }).join('');
    return card({ chip: overline('Portfolio') + K.draft(), id: 'w-portfolio',
      body: K.seg([{ t: 'Household', on: who2 === 'all', go: 'pf:all' }, { t: 'Arun', on: who2 === 'arun', go: 'pf:arun' }, { t: 'Asha', on: who2 === 'asha', go: 'pf:asha' }]) +
        '<span class="mp-cap mp-ink2">' + (who2 === 'all' ? 'Household' : who2 === 'arun' ? 'Arun' : 'Asha') + ' · UK at the Fri 23 Oct close</span><span class="mp-num-l">' + g(ukSum) + '</span>' + rows +
        K.foot('Stances are the rules engine’s, in shadow until they have beaten doing nothing for 8 weeks; India’s come with phase 19. A view, not advice: MyPaisa cannot trade.'),
      acts: [K.cbtn('Open Home', 'nav:home', 'ghost', 'chevron_right')] });
  }
  var PF_ON = {
    'pf:all': function (st) { delete st.open['pf:arun']; delete st.open['pf:asha']; },
    'pf:arun': function (st) { delete st.open['pf:asha']; st.open['pf:arun'] = true; },
    'pf:asha': function (st) { delete st.open['pf:arun']; st.open['pf:asha'] = true; }
  };
  var COMMON = {
    'x:edit': toast('Edit opens the same card with each field to change. This walk-through confirms it as drawn.'),
    'x:cancel': toast('Cancel saves nothing. This walk-through keeps the card, so the figures stay true.'),
    'x:asha': toast('This walk-through follows the figure set: the savings are Arun’s. Tap Arun.'),
    'x:joint': toast('This walk-through follows the figure set: the savings are Arun’s. Tap Arun.'),
    'x:both': toast('This walk-through answers one by one: Home first.'),
    'x:still': toast('This walk-through corrects Home’s value on its page: tap Change it.'),
    'x:didnt': toast('One didn’t go opens a short flow for that payment. Both went, so nothing to do.'),
    'x:undo': toast('Undo would reverse it with a new event, and both would stay in the audit log. This walk-through keeps Paid, so the figures stay true.')
  };
  function on(extra) { return Object.assign({}, COMMON, PF_ON, extra || {}); }

  /* Sun 1 Nov, Arun's chat. stage: 0 statements read (08:41) · 1 saved and the month-end check-in (09:00) */
  function sunChat(ctx, stage) {
    var out = [K.daysep('Sun 1 Nov 08:40')], B = hh(ctx).budget_oct || { plan: [] };
    out.push('<div class="me pv5-wealth"><div class="files">' + ['barclaycard-2026-11-01.pdf', 'monzo-2026-10.csv'].map(function (f) { return '<span class="file">' + K.ms(f.slice(-3) === 'pdf' ? 'picture_as_pdf' : 'table_view') + f + '</span>'; }).join('') + '</div><div style="margin-top:6px">October’s statements</div></div><div class="me-time">08:40</div>');
    var aOK = stage > 0 || ctx.has('amzn'), pOK = stage > 0 || ctx.has('paypal');
    if (stage === 0) {
      var tiles = [['Bills and council tax', 431, '3 lines'], ['Groceries', 702, '4 lines'], ['Transport', 198, '2 lines'], ['Insurance', 85, '1 line'], ['Eating out', 236, '3 lines'], ['Shopping', 189, '2 lines', !aOK], ['Health', 24, '1 line'], ['Subscriptions', 45, '2 lines'], ['Giving', 50, '1 line'], ['Family support, India', 222, '1 line'], ['Other', 64, '2 lines', !pOK]];
      var rec2 = [['home', 'Mortgage · Nationwide', 'Thu 1 Oct · EMI, matched to its commitment', K.gbp(1456.46, { dp: 2 })], ['directions_car', 'Car loan · Close Brothers', 'Tue 20 Oct · EMI, matched to its commitment', K.gbp(346.55, { dp: 2 })], ['credit_card', 'Barclaycard payment', 'Tue 20 Oct · a transfer, not spending', K.gbp(1240, { dp: 2 })], ['savings', 'To Instant access savings · Monzo', 'Mon 26 Oct · a move between your own accounts', K.gbp(5000, { dp: 2 })], ['payments', 'Salary · Arun', 'Wed 28 Oct · income', K.gbp(4350, { dp: 2 })]];
      out.push(K.ai('Both are read and kept for good. Here is October from them, by category; the two lines I am not sure of are in amber.', { cards: [card({ chip: overline('October’s statements · check them') + K.draft(), h: 'Spending ' + g(2246) + ' in 22 lines', id: 'w-stmt',
        body: K.row({ icon: 'credit_card', t: 'Barclaycard', s: 'statement of Sun 1 Nov · 16 lines', v: g(1458) }) + K.row({ icon: 'account_balance', t: 'Monzo current account', s: 'October · 11 lines: 6 spending, 5 not' }) +
          '<span class="mp-hl">Two to check</span>' +
          '<div class="amb' + (aOK ? ' ok' : '') + '" id="w-amb"><div class="fx col f1"><span class="mp-sub" style="font-weight:600">AMZN Mktp · ' + g(165) + '</span><span class="mp-foot mp-ink2">Barclaycard · Tue 27 Oct · Amazon Marketplace sells most things</span></div><button type="button" class="pill"' + K.go('fold:amzn') + '>' + (aOK ? 'Shopping ✓' : 'Shopping?') + '</button></div>' +
          '<div class="amb' + (pOK ? ' ok' : '') + '"><div class="fx col f1"><span class="mp-sub" style="font-weight:600">PAYPAL *EBAY · ' + g(42) + '</span><span class="mp-foot mp-ink2">Barclaycard · Sun 25 Oct · a PayPal payment to eBay</span></div><button type="button" class="pill"' + K.go('fold:paypal') + '>' + (pOK ? 'Other ✓' : 'Other?') + '</button></div>' +
          '<div class="fx jb"><span class="mp-hl">By category</span><span class="mp-sub mp-num" style="font-weight:700">' + g(2246) + '</span></div>' +
          '<div class="ctiles">' + tiles.map(function (x) { return '<div class="ctile"><span>' + x[0] + '</span><b>' + g(x[1]) + '</b><span>' + x[2] + '</span>' + (x[3] ? '<span class="amber">1 to check</span>' : '') + '</div>'; }).join('') + '</div>' +
          (ctx.has('rec') ? '<span class="mp-hl">Recognised, not spending · 5 lines</span>' + rec2.map(function (r) { return K.row({ icon: r[0], t: r[1], s: r[2], v: r[3] }); }).join('') : '') +
          K.foot('Each amber pick is a suggestion: Confirm takes them as shown, and remembers each merchant. Nothing is saved until you tap Confirm.'),
        acts: [K.cbtn('Confirm', 'stmt:confirm', 'primary'), K.cbtn('Edit', 'x:edit'), K.cbtn('Cancel', 'x:cancel', 'ghost')], fold: { t: ctx.has('rec') ? 'Hide the 5 lines not counted' : 'Recognised, not spending · 5 lines', open: false, go: 'fold:rec', body: '' } })], meta: 'extract_document · each file kept in S3 before anything read it' }));
      return out;
    }
    out.push(K.ai('Both are read. October is in the budget.', { cards: [card({ chip: overline('October’s statements · saved') + K.draft(), h: K.ms('check_circle', 'mp-up') + ' 22 lines in October’s budget', id: 'w-stmtok',
      body: K.kv('Spending', g(2246) + ' · 11 categories') + K.kv('Not counted', '5 lines, recognised') + K.kv('Remembered', 'AMZN Mktp is Shopping, PAYPAL *EBAY is Other') +
        K.note('task_alt', 'It also confirmed two autopay EMIs the weekly digest had assumed paid: the car loan’s on Tue 20 Oct and the mortgage’s on Thu 1 Oct.') + savedFoot('08:44') })],
      meta: 'Net worth ' + g(457951) + ' → ' + g(456493) + ': the card’s ' + g(1458) + ' is owed, due Fri 20 Nov', icon: 'devices' }));
    out.push(K.ai('', { cards: [card({ chip: overline('Check-in · Car loan EMI') + '<span class="amber">Confirmed by the statement</span>', h: 'Close Brothers: October’s EMI paid',
      body: K.kv('EMI', K.gbp(346.55, { dp: 2 })) + K.kv('Due', 'Tue 20 Oct · autopay') + K.kv('Before', 'Assumed paid') + K.kv('Now', 'Confirmed by the statement') + K.kv('Balance after it', K.gbp(8938.81, { dp: 2 })) + savedFoot('08:44') })] }));
    out.push(K.daysep('09:00'));
    var closed = ctx.has('closed');
    var rowsT = '<div class="btable"><div class="brow h"><span>Category</span><span>Actual</span><span>Plan</span></div>' + B.plan.map(function (c) { return '<div class="brow"><span>' + c.category + '</span><span>' + (c.actual > c.plan ? '▲ ' : c.actual < c.plan ? '▼ ' : '') + g(c.actual) + '</span><span class="mp-ink2">' + g(c.plan) + '</span></div>'; }).join('') + '</div>';
    out.push(K.ai('', { cards: [closed ? card({ chip: overline('Check-in · October closed') + K.draft(), h: K.ms('check_circle', 'mp-up') + ' October closed', id: 'w-close',
        body: K.kv('Spent', g(2246) + ' of ' + g(2682)) + K.kv('Surplus', g(3072)) + K.kv('Savings rate', '40.6%') + K.foot('You tapped Nothing else at 09:02. Budget now shows October as closed.') + savedFoot('09:02'),
        acts: [K.cbtn('Undo', 'x:undo', 'ghost', 'undo')] })
      : card({ chip: overline('Check-in · Close October') + K.draft(), h: 'October: ' + g(2246) + ' spent of ' + g(2682) + ' planned', id: 'w-close',
        body: '<div class="meter"><i style="width:83.7%"></i></div><span class="mp-foot mp-ink2">' + g(436) + ' under plan</span>' + K.kv('Income', g(7560)) + K.kv('EMIs and SIP', g(2153) + ' and ' + g(89)) + K.kv('Surplus', g(3072) + ' · plan ' + g(2636)) + K.kv('Savings rate', '40.6%') + (ctx.has('cats') ? rowsT : '') +
          K.foot('Over plan: Eating out ' + g(56) + ', Groceries ' + g(52) + ', Bills and council tax ' + g(11) + '. From the Barclaycard and Monzo statements, the loans and the SIP. ▲ over plan, ▼ under.') + '<span class="mp-sub" style="font-weight:600">Anything not on a statement? Cash, or another bank?</span>',
        acts: [K.cbtn('Nothing else: close October', 'close:none', 'primary'), K.cbtn('Add cash spending', 'x:cash'), K.cbtn('Another bank’s statement', 'x:bank')], fold: { t: ctx.has('cats') ? 'Hide the 12 categories' : 'The 12 categories, plan against actual', open: false, go: 'fold:cats', body: '' } })], meta: 'get_budget(Oct) · every figure from the statements and the commitments' }));
    if (closed) out.push(K.ai('November is open, on the same plan. I’ll ask again on Tue 1 Dec.'));
    return out;
  }

  /* Thu 5 Nov, Arun's chat. stage: 0 the EMI check-in · 1 paid · 2 the Projection · 3 the what-if · 6 the fees · 7 the ways · 8 the Plans tab */
  function thuChat(ctx, stage) {
    var out = [K.daysep('Thu 5 Nov 09:00')];
    if (stage === 0) {
      var open = ctx.has('else');
      out.push(K.ai('', { cards: [card({ chip: K.chip(K.ms('event_available') + 'Check-in', 'mp-neutral') + '<span class="mp-foot mp-ink2">due today</span>', h: 'Was November’s EMI of ' + ri(39390) + ' paid?', id: 'w-emi',
        body: K.kv('Loan', 'HDFC home loan · Pune flat') + K.kv('Paid saves', ri(39390) + ' on Thu 5 Nov') + K.foot('One tap on Paid saves exactly this, with Undo.') +
          (open ? K.list([K.row({ t: 'Not yet', s: 'I’ll ask again on Mon 9 Nov', go: 'x:notyet' }), K.row({ t: 'Different amount', s: 'Tell me what was paid', go: 'x:diff' }), K.row({ t: 'Paid off in full', s: 'Closes the loan, after a Confirm', go: 'x:off' })]) : ''),
        acts: [K.cbtn('Paid', 'emi:paid', 'primary'), K.cbtn('Something else', 'fold:else', null, open ? 'expand_less' : 'expand_more')] })] }));
      return out;
    }
    out.push(K.ai('', { cards: [card({ chip: K.chip(K.ms('event_available') + 'Check-in', 'mp-neutral') + '<span class="mp-foot mp-ink2">answered 09:12</span>', h: K.ms('check_circle', 'mp-up') + ' Paid · November’s EMI', id: 'w-paid',
      body: K.kv('Paid', ri(39390) + ' on Thu 5 Nov') + K.kv('Loan', 'HDFC home loan · Pune flat') + K.kv('Left to pay', ri(1484587)) + K.foot('Left to pay is the engine’s schedule after this EMI.') + savedFoot('09:12'),
      acts: stage === 1 ? [K.cbtn('Undo', 'x:undo', null, 'undo')] : [] })], meta: stage === 1 ? 'Net worth ' + g(456493) + ' → ' + g(456747) + ': its principal came off what you owe' : null, icon: 'devices' }));
    if (stage >= 3 && stage < 6) {
      out.push(K.daysep('10:20'));
      out.push(K.me('What if we put ' + g(60000) + ' down on a second flat in June 2028?', '10:20'));
      out.push(K.ai('Here’s the engine’s run with it.', { cards: [whatIfCard(ctx, false, !ctx.has('pay'))], meta: 'run_projection(overrides) · never saved' }));
      if (ctx.has('pay')) {
        var paid2 = ctx.has('impact');
        out.push(K.ai('As a plan item, one thing is missing.', { cards: [paid2 ? card({ chip: overline('New plan item'), body: K.kv('Paid from where?', 'The monthly budget, then cash') })
          : card({ chip: overline('New plan item'), h: 'Second flat deposit', id: 'w-pay', body: K.kv('What and when', '−' + g(60000) + ' once, Jun 2028') + chipQ('Paid from where?', [['The monthly budget, then cash', 'pay:cash', 'primary'], ['Balanced (ISA)', 'x:pool'], ['Another pool', 'x:pool']]) })] }));
      }
      if (ctx.has('impact')) {
        var cx = ctx.has('cancelled');
        out.push(K.ai(cx ? 'Cancelled. The plan stays as it is.' : 'Here’s what it does to the plan.', { cards: [card({ chip: overline(cx ? 'Not saved' : 'Not saved yet'), h: 'Second flat deposit', id: 'w-impact',
          body: cx ? K.p('Cancelled at 10:21. Nothing is saved; the plan keeps its three items.') :
            K.p('−' + g(60000) + ' once, Jun 2028, paid from the monthly budget, then cash') + '<span class="mp-hl">Middle path, with it</span>' +
            K.kv('2031', g(792000) + ' · ▼ ' + g(74000)) + K.kv('2036', g(1446000) + ' · ▼ ' + g(93000)) + K.kv('2046', g(3772000) + ' · ▼ ' + g(125000)) + K.foot('Today’s plan: ' + g(866000) + ', ' + g(1539000) + ' and ' + g(3897000) + '.') +
            flag('▼ Cash goes ' + g(15377) + ' below zero in Jun 2028, back above zero in Nov 2028.') + K.foot('A one-off is paid from cash. Every figure is the engine’s; ' + g(60000) + ' and June 2028 are your words.'),
          acts: cx ? [] : [K.cbtn('Confirm', 'plan:confirm', 'primary'), K.cbtn('Change', 'x:edit'), K.cbtn('Cancel', 'plan:cancel', 'ghost')] })], meta: 'propose_plan_item · the impact is the engine’s' }));
      }
    }
    if (stage >= 6) {
      out.push(K.daysep('20:41'));
      out.push(K.me(g(4000) + ' a month from Jan 2029 for my kid’s schooling', '20:41'));
      out.push(K.ai('', { cards: [card({ chip: overline('Answered'), h: 'School fees', body: K.p(g(4000) + ' a month from Jan 2029, for your kid (not a member)') + K.kv('Until when?', 'Jul 2041') + K.kv('How the fees grow', '4.5% a year, UK school fees') + K.kv('Paid from', 'The monthly budget') + K.foot('From the chips you tapped; change any before you confirm.') })] }));
      if (stage === 6) {
        out.push(K.ai('', { cards: [card({ chip: overline('Not saved yet'), h: 'School fees', id: 'w-fees',
          body: K.p(g(4000) + ' a month, Jan 2029 to Jul 2041, rising 4.5% a year') + '<span class="mp-hl">Middle path, with the fees</span>' +
            K.kv('2031', g(701000) + ' · ▼ ' + g(165000)) + K.kv('2036', g(1002000) + ' · ▼ ' + g(537000)) + K.kv('2046', g(2580000) + ' · ▼ ' + g(1317000)) + K.foot('Was ' + g(866000) + ' · ' + g(1539000) + ' · ' + g(3897000)) +
            flag('▼ Under your ' + mny('£500') + ' floor in 50 months, Jan 2029 to Feb 2035') + K.foot('Cash stays above zero. The fees end in Jul 2041, freeing ' + g(6784) + ' a month.'),
          acts: [K.cbtn('Confirm', 'fees:confirm', 'primary'), K.cbtn('Change', 'x:edit'), K.cbtn('Cancel', 'x:cancel', 'ghost')] })], meta: 'propose_plan_item · the impact is the engine’s run, Thu 5 Nov 20:42' }));
        return out;
      }
      out.push(K.ai('Saved, with its audit row. It leaves you ' + g(19058) + ' short over 50 months; code found three ways to cover it.', { cards: [card({ chip: overline('Added to the plan'), h: K.ms('check_circle', 'mp-up') + ' School fees',
        body: K.p(g(4000) + ' a month, Jan 2029 to Jul 2041, 4.5% a year · 2046 middle path ▼ ' + g(1317000)) + '<span class="mp-foot mp-ink2">Audit · Plan item added · Arun · Thu 5 Nov 20:43 · in the chat</span>' })] }));
      var applied = stage > 7 || ctx.has('pot');
      if (!applied) out.push(K.ai('', { cards: [waysCard(ctx)], meta: 'rearrange_budget · 3 ways and 2 more, each covering every month' }));
      else {
        out.push(K.ai('Done. November’s budget now puts ' + g(690) + ' into the School fees pot, and the Projection has run again.', { cards: [card({ chip: overline('Applied · way 1 of 3'), h: K.ms('check_circle', 'mp-up') + ' Start a school fees pot this month', id: 'w-applied',
          body: K.p(g(690) + ' a month, Nov 2026 to Dec 2028, drawn Jan 2029 to Feb 2035') + K.kv('November’s planned surplus', g(2636) + ' → ' + g(1946)) + K.kv('Months under ' + mny('£500'), '50 → 0') +
            '<span class="mp-foot mp-ink2">Audit · Plan item added · School fees pot, ' + g(690) + ' a month from Nov 2026 to Dec 2028, drawn from Jan 2029 · Arun · Thu 5 Nov 20:46 · in the chat</span>' +
            '<span class="mp-foot mp-ink2">Audit · November’s budget changed · School fees pot ' + g(690) + ' added; planned surplus ' + g(2636) + ' → ' + g(1946) + ' · Arun · Thu 5 Nov 20:46 · in the chat</span>',
          acts: stage === 7 ? [K.cbtn('Undo', 'x:undo', null, 'undo')] : [], fold: { t: 'Technical', open: ctx.has('tech'), go: 'fold:tech', body: 'propose_plan_item → School fees · new_flow · spend · monthly<br>rearrange_budget → 3 ways and 2 more · goal-seek on the £500 floor, cash ≥ 0<br>applied: way 1 · change_flow on the budget plan from Nov 2026<br>Projection run Thu 5 Nov 20:46 · 300 runs · seed 7'.replace('£500', mny('£500')) } })] }));
      }
    }
    if (stage >= 8) {
      out.push(K.daysep('20:52'));
      out.push(K.me('my salary goes to ' + g(5500) + ' a month from Sep 2028', '20:52'));
      out.push(K.ai('Saved at 20:53. It sets your take-home to ' + g(5500) + ' from Sep 2028, up from ' + g(4778) + '; your own 4.8% growth carries on from the next April.', { cards: [card({ chip: overline('Added to the plan'), h: K.ms('check_circle', 'mp-up') + ' Arun’s salary', body: K.p('Set to ' + g(5500) + ' a month from Sep 2028 · 2046 middle path ' + g(2585000) + ' → ' + g(2923000)) + '<span class="mp-foot mp-ink2">Audit · Plan item added · Arun · Thu 5 Nov 20:53 · in the chat</span>' })] }));
      out.push(K.daysep('20:58'));
      out.push(K.me('close my HDFC loan with the SBI FD when it matures', '20:58'));
      out.push(K.ai('Saved. It closes the loan in Mar 2029, when the FD matures; the Plans tab shows it.', { cards: [card({ chip: overline('Added to the plan'), h: K.ms('check_circle', 'mp-up') + ' Close the HDFC home loan', id: 'w-hdfcclose',
        body: K.p('With the SBI FD, Mar 2029: its ' + ri(617538) + ' covers the ' + ri(593849) + ' left, ' + ri(23689) + ' over, and frees ' + ri(39390) + ' a month') + '<span class="mp-foot mp-ink2">Audit · Plan item added · Arun · Thu 5 Nov 20:59 · in the chat</span>',
        acts: [K.cbtn('See the Plans tab', 'nav:projection/plans', null, 'view_timeline')] })], meta: 'propose_plan_item · record_event on the HDFC loan, funded from the SBI FD at maturity' }));
    }
    return out;
  }
  function wiChart() {
    var P = window.MP5D.plans || {}, wi = (P.what_if_5nov || {}).fan || [], base = (P.runs && P.runs.R5N && P.runs.R5N.fan) || [];
    var NOW = 2026.85, net = 456747;
    var sel = function (arr, k) { return [[NOW, net]].concat(arr.filter(function (r) { return r.year >= 2027 && r.year <= 2036; }).map(function (r) { return [r.year, r[k]]; })); };
    return K.line({ x0: NOW, x1: 2036, y0: 0, y1: 2000000, h: '120px', grid: [500000, 1000000, 1500000], label: 'The what-if: the middle path with the flat, against today’s plan, to 2036',
      bands: [{ lo: sel(wi, 'p10'), hi: sel(wi, 'p90') }], series: [{ pts: sel(base, 'p50'), color: 'var(--mp-ink-3)', dash: true }, { pts: sel(wi, 'p50'), color: 'var(--mp-chart-line)' }],
      yLabels: [{ y: 500000, t: mny('£0.5m') }, { y: 1000000, t: mny('£1m') }, { y: 1500000, t: mny('£1.5m') }], xLabels: [{ x: NOW, t: 'Today' }, { x: 2031, t: '2031' }, { x: 2036, t: '2036' }] }) +
      '<div class="legend"><span><i class="k-line" style="background:var(--mp-chart-line)"></i>With the flat</span><span><i class="k-dash"></i>Today’s plan</span></div>';
  }
  function whatIfCard(ctx, asha, live) {
    return card({ chip: overline('What-if · Jun 2028 · not saved'), h: g(60000) + ' down on a second flat', id: asha ? 'w-wi-asha' : 'w-wi',
      body: wiChart() + K.kv('2036, with the flat', g(1446000)) + K.kv('2036, today’s plan', g(1539000)) + K.kv('Middle path', '▼ ' + g(93000) + ' lower') +
        flag('▼ Cash goes ' + g(15377) + ' below zero in Jun 2028, back above zero in Nov 2028.') + K.foot('The engine’s figures; nothing is saved. ' + g(60000) + ' and June 2028 are your words.') +
        (asha ? lockline('Only Arun can save it as a plan item.') : ''),
      acts: !live ? [] : asha ? [K.cbtn('Change it', 'x:edit')] : [K.cbtn('Save as a plan item', 'plan:save', 'primary', 'bookmark_add'), K.cbtn('Change it', 'x:edit')] });
  }
  function waysCard(ctx) {
    var RA = fp(ctx).rearrange || { options: [] }, more = ctx.has('more');
    var ways = RA.options.map(function (o, i) {
      var first = i === 0;
      return '<div class="way"' + (first ? ' id="w-way1"' : '') + '><div class="way-h"><span class="way-n">' + o.rank + '</span><div class="fx col f1 g4"><span class="mp-sub" style="font-weight:600">' + o.title + '</span>' +
        (first ? o.changes.map(function (c) { return '<span class="mp-foot">' + c.replace(/£([\d,]+)/g, function (m) { return mny(m); }) + '</span>'; }).join('') : '') +
        '<span class="mp-foot mp-ink2">2046 · ' + g(o.effect.middle_path['2046']) + ' · ' + o.effect.below_floor_months + ' months under ' + mny('£500') + '</span>' + (first ? '<span class="mp-foot mp-ink2">' + o.why + '</span>' : '') + '</div></div>' +
        '<div class="fx g8 wrap">' + K.cbtn('Confirm this way', first ? 'way:pot' : 'x:way', first ? 'primary' : null) + (first ? '' : K.cbtn('What changes', 'x:what', 'ghost')) + '</div></div>';
    }).join('');
    var mor = more ? (RA.more || []).map(function (m) { return K.row({ icon: 'lightbulb', t: m.title, s: m.note.replace(/£([\d,]+)/g, function (x) { return mny(x); }) }); }).join('') : '';
    return card({ chip: overline('Cover the gap'), h: 'Three ways, best fit first', sub: g(RA.gap_total || 0) + ' short, ' + RA.first + ' to ' + RA.last, id: 'w-ways', body: ways + mor,
      fold: { t: more ? 'Hide the two more ways' : 'Two more ways', open: false, go: 'fold:more', body: '' } });
  }

  /* ---------- the other days' chats ---------- */
  function satChat(ctx) {
    var out = [K.daysep('Sat 31 Oct 10:13')], ok = ctx.has('ok');
    out.push(K.ai('Asha asked at 10:12 to add her NS&I Premium Bonds. They aren’t a kind MyPaisa knows yet, so it’s yours to approve.', { cards: [card({ chip: overline(ok ? 'New kind · approved' : 'New kind · to approve') + K.chip(K.ms('shield_person') + 'Admin', 'mp-neutral') + K.draft(),
      h: ok ? K.ms('check_circle', 'mp-up') + ' NS&I Premium Bonds is a kind now' : 'NS&I Premium Bonds isn’t a kind yet: add it as cash, no interest, prizes as income?', id: 'w-kind',
      body: K.kv('Built from', 'Cash: the last figure given') + K.kv('Interest', 'none') + K.kv('Prizes', 'income, in the budget') + K.kv('Where', 'UK, in pounds, liquid') + K.kv('Asked for by', 'Asha, 10:12') +
        (ok ? K.kv('Checked with', 'Sign in with Apple, Face ID') + K.foot('Asha’s registration picks up in her chat, with her own Confirm.') + savedFoot('10:14') : K.foot('A kind is data: no screen or form changes. Only you, the admin, can add one; Asha’s own record still comes to her Confirm.')),
      acts: ok ? [] : [K.cbtn('Approve', 'kind:approve', 'primary'), K.cbtn('Reject', 'x:reject')], fold: { t: 'Technical', open: ctx.has('tech'), go: 'fold:tech', body: 'propose_kind → premium_bonds · from the cash template<br>fields: value (the last figure given), prizes → income · no accrual<br>approved behind the second check · versioned, kind v1' } })],
      meta: ok ? 'list_kinds · describe_kind · propose_kind · in the audit log 10:14' : 'list_kinds found no kind for it · propose_kind, the admin’s alone', icon: 'shield_person' }));
    return out;
  }
  function secondCheck() {
    return '<div class="pv5-wealth sheetc"><div class="fx ac jb"><span class="mp-hl">Check it’s you</span><button type="button" class="' + (ctx.web ? 'iconbtn' : 'gbtn lg') + '" aria-label="Close"' + K.go('kind:close') + '><span class="ms z1" aria-hidden="true">close</span></button></div>' +
      overline('Admin change') + '<span class="mp-t3">Add a new kind: NS&amp;I Premium Bonds</span>' + K.kv('Built from', 'Cash: the last figure given') + K.kv('Asked for by', 'Asha, 10:12') +
      K.foot('The server binds a challenge to this change; Apple signs you in again to answer it. A passkey under Face ID answers it too.') +
      '<button type="button" class="apple" id="w-apple"' + K.go('kind:apple') + '>' + K.ms('ar_on_you') + 'Sign in with Apple</button>' + K.foot('Continue as Arun Dutta, ar•••@icloud.com') + '</div>';
  }
  function friChat(ctx) {
    var out = [K.daysep('Fri 20 Nov 09:00')];
    out.push(K.ai('', { cards: [card({ chip: K.chip(K.ms('event_available') + 'Check-ins', 'mp-neutral') + '<span class="mp-foot mp-ink2">2 due</span>', h: 'Two to answer', id: 'w-several',
      body: K.row({ lead: lead('£'), t: 'Barclaycard', s: 'The bill in full · due today · statement of Sun 1 Nov', v: g(1458) }) + K.row({ lead: lead('₹'), t: 'Flat, Pune', s: 'Still about right? · valuation overdue since 15 Jul', v: ri(11000000), vs: '<span class="amber">Overdue</span>' }) +
        K.foot('Both as shown saves each, exactly as shown, each with its audit row. A payment to the card is a transfer, not spending; the spending was the statement’s lines.'),
      acts: [K.cbtn('Both as shown', 'ci:both', 'primary'), K.cbtn('One by one', 'ci:one')] })], meta: 'get_commitments(today) · one card for everything due at once' }));
    return out;
  }
  function decChat(ctx) {
    var out = [K.daysep('Mon 14 Dec 09:00')], ren = ctx.has('renew');
    out.push(K.ai('', { cards: [card({ chip: K.chip(K.ms('event_available') + 'Check-in', 'mp-neutral') + '<span class="mp-foot mp-ink2">matures today</span>' + K.draft(), h: 'Your fixed-rate saver matured today with ' + g(10460) + '. What happened to it?', id: 'w-saver',
      body: K.kv('Saver', 'Nationwide, 4.6% fixed') + K.kv('Opened', 'Sun 14 Dec 2025, ' + g(10000)) + K.kv('At maturity', g(10460)) + K.foot('Nothing is assumed: pick what happened.') + (ren ? K.kv('What happened?', 'Renewed') : ''),
      acts: ren ? [] : [K.cbtn('Renewed', 'mat:renew', 'primary'), K.cbtn('Paid out', 'x:paidout'), K.cbtn('Moved', 'x:moved')] })] }));
    if (ren) out.push(K.ai('', { cards: [card({ chip: overline('Renewed · 1 of 2'), h: 'How long is the new one fixed for?', id: 'w-term',
      body: '<div class="fx g8 wrap">' + K.cbtn('1 year', 'x:term') + K.cbtn('2 years', 'x:term') + K.cbtn('Another term', 'x:term') + '</div>' + K.foot('Next, its rate. Then a Confirm card starts a new saver from today with ' + g(10460) + '; this one closes as matured and links to it.'),
      acts: [K.cbtn('Cancel', 'x:cancel', 'ghost')] })] }));
    return out;
  }
  function ashaThuChat(ctx) {
    var asked = ctx.has('asked');
    var out = [K.daysep('Thu 5 Nov 10:26')];
    if (!asked) { out.push(K.ai('Asha’s own conversation. Ask anything about the household; Arun’s chat stays his.')); return out; }
    out.push(K.me('What if we put ' + g(60000) + ' down on a second flat in June 2028?', '10:26'));
    out.push(K.ai('Here’s the engine’s run with it.', { cards: [whatIfCard(ctx, true, true)], meta: 'run_projection(overrides) · never saved' }));
    return out;
  }
  function fri6Chat(ctx, stage) {
    var out = [K.daysep('Fri 6 Nov 08:30'), K.me('How do we stand this morning?', '08:30'),
      K.ai('Net worth is ' + g(ctx.W.T.net_gbp) + ', the same as last night: nothing has moved since Thursday’s EMI, and prices are at the ' + ctx.W.pricesAt + '. Next due: Asha’s SIP on Tue 10 Nov, then the Barclaycard bill on Fri 20 Nov. Home beside this has the whole picture.', { meta: 'get_networth · get_commitments · figures: the engine' })];
    if (stage >= 1) {
      var lines = (((hh(ctx).statements_oct || {}).barclaycard_nov || {}).lines || []).filter(function (l) { return l.category === 'Groceries'; });
      var by = {}; lines.forEach(function (l) { by[l.merchant] = (by[l.merchant] || 0) + l.amount_gbp; });
      var shops = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }), sum = shops.reduce(function (s, k) { return s + by[k]; }, 0);
      out.push(K.daysep('08:40'));
      out.push(K.me('How much did we spend on groceries in October, shop by shop?', '08:40'));
      out.push(K.ai(g(sum) + ' across ' + shops.length + ' shops, all on the Barclaycard. Tesco was most of it.', { cards: [card({ chip: overline('From the ledger’s read-only copy') + K.draft(), h: 'Groceries, October, by shop', id: 'w-sql',
        body: '<div class="btable"><div class="brow h"><span>Shop</span><span>Lines</span><span>Spent</span></div>' + shops.map(function (s) { return '<div class="brow"><span>' + s + '</span><span>' + lines.filter(function (l) { return l.merchant === s; }).length + '</span><span>' + g(by[s]) + '</span></div>'; }).join('') +
          '<div class="brow" style="font-weight:700"><span>In all</span><span>' + lines.length + '</span><span>' + g(sum) + '</span></div></div>' + K.foot('The same ' + g(sum) + ' as October’s Groceries actual on Budget. The figures are the query’s result, never the model’s.'),
        fold: { t: 'Technical', open: ctx.has('tech'), go: 'fold:tech', body: '<span class="sql">SELECT merchant, count(*) AS lines, sum(amount_gbp) AS spent\nFROM statement_lines\nWHERE category = \'Groceries\' AND month = \'2026-10\'\nGROUP BY merchant ORDER BY spent DESC;</span>read-only copy of Fri 6 Nov 01:00 · DuckDB, SELECT only · ' + shops.length + ' rows · 0.4 s' } })],
        meta: 'query_ledger_sql · the household’s own files, read-only, external access off' }));
    }
    return out;
  }
  function importChat(ctx) {
    var I = (wv(ctx) || {}).import;
    var out = [K.daysep('Fri 6 Nov 21:00'), K.me('Upload from my laptop', '21:00'),
      K.ai('Here’s a one-time link for one workbook: yours alone, one .xlsx of up to 20 MB within 15 minutes, then it expires. Send it from Claude Code with one command.', { cards: [card({ chip: overline('One-time upload link') + K.draft(), body: K.kv('Opened', 'Fri 6 Nov 21:02') + K.kv('Takes', 'one .xlsx, 20 MB at most') + K.kv('Expires', '21:17, or once used') + K.foot('The link carries no sign-in: Claude Code never signs in to the household. Nothing is written until you confirm the dry run here.') })] })];
    if (!I) { out.push(K.ai(K.note('hourglass_empty', 'The dry run’s figures come from the wealth figure set (wealth-v5.json).'))); return out; }
    out.push(K.daysep('21:04'));
    out.push('<div class="me pv5-wealth"><div class="files"><span class="file">' + K.ms('table_view') + I.file + '</span></div><div style="margin-top:6px">From Claude Code, through the link</div></div><div class="me-time">21:04</div>');
    out.push(K.ai('Read and checked against template ' + I.template + '. Here is what it would do; nothing is written yet.', { cards: [card({ chip: overline('Excel history · dry run') + K.draft(), h: I.rows + ' rows in ' + I.sheet, id: 'w-dry',
      body: K.kv('Would add', I.add_n + ' rows') + I.add.map(function (r) { return K.row({ icon: 'add', t: 'Infosys · ' + r.date, s: r.units + ' shares at ' + inrDp(r.price), v: ri(r.amount) }); }).join('') +
        K.kv('Already there', I.already + ' rows') + K.foot(I.already_what + '.') + K.kv('Refused', I.refused_n + ' rows, with the reason') +
        I.refused.map(function (r) { return K.row({ icon: 'block', t: 'Row ' + r.row + ' · ' + r.what, s: r.why, v: r.amount_inr ? ri(r.amount_inr) : g(r.amount_gbp) }); }).join('') +
        K.note('functions', 'Once Infosys’s buys are in, the engine can work out its return: ' + K.pct(I.infosys_xirr_pct, { dp: 1, sign: true }) + ' a year, from ' + ri(I.add_cost) + ' put in, worth ' + ri(I.infosys_value) + ' now.') +
        K.foot('Sending the same file twice adds nothing: each row is matched by its fingerprint. Confirm writes the rows in batches under one import id, after the second check; any import can be rolled back by its id.'),
      acts: [K.cbtn('Confirm', 'imp:confirm', 'primary'), K.cbtn('Get the refused rows', 'x:errors'), K.cbtn('Cancel', 'x:cancel', 'ghost')] })], meta: 'extract_document · the workbook kept in S3 before anything read it · its cells are data, never instructions' }));
    return out;
  }
  function aprChat(ctx) {
    var T = (wv(ctx) || {}).tuner;
    var out = [K.daysep('Thu 1 Apr 2027 09:00')];
    if (!T) { out.push(K.ai(K.note('hourglass_empty', 'The tuner’s figures come from the wealth figure set (wealth-v5.json).'))); return out; }
    var Mr = T.march;
    out.push(K.ai('March is closed. Here is how its forecast did.', { cards: [card({ chip: overline('March, forecast against actual') + K.draft(), h: 'Spending ' + g(Mr.actual_spend) + ', forecast ' + g(Mr.forecast_spend), id: 'w-grade',
      body: K.kv('Surplus', g(Mr.actual_surplus) + ' · forecast ' + g(Mr.forecast_surplus)) + K.kv('Income and EMIs', 'on the forecast') +
        Mr.gaps.map(function (x) { return K.row({ icon: x.gap > 0 ? 'arrow_upward' : 'arrow_downward', t: x.cat, s: 'forecast ' + g(x.forecast) + ', actual ' + g(x.actual), v: (x.gap > 0 ? '▲ ' : '▼ ') + g(Math.abs(x.gap)) }); }).join('') +
        K.foot('Each gap is a month grade, traced to its input; a late statement regrades the month with a new row, never over the old one.') })], meta: 'Graded at the month close by code, against the run current on Mon 1 Mar' }));
    var mo = T.months.map(function (m) { return '<div class="mo' + (m.actual > m.plan ? ' low' : '') + '"><span>' + m.m.slice(0, 3) + '</span><b>' + g(m.actual) + '</b></div>'; }).join('');
    var used = ctx.has('tuned');
    out.push(K.ai('', { cards: [card({ chip: overline(used ? 'The tuner · applied' : 'The tuner suggests') + K.draft(), h: used ? K.ms('check_circle', 'mp-up') + ' Groceries: ' + g(T.proposal) + ' a month in the Budget forecast' : 'Use ' + g(T.proposal) + ' a month for Groceries in the Budget forecast from April?', id: 'w-tuner',
      body: K.p('Groceries ran over its plan in ' + T.n_over + ' of the last ' + T.closed + ' months, by about ' + g(T.mean_over) + '.') + '<div class="months">' + mo + '</div>' +
        K.kv('The plan', 'stays ' + g(T.plan_now)) + K.kv('Surplus in ' + T.surplus_month, g(T.surplus_now) + ' becomes ' + g(T.surplus_new)) +
        K.p('It would have forecast those ' + T.closed + ' months ' + g(T.closer) + ' closer than the plan did.') + K.foot('Undo: back to the plan’s ' + g(T.plan_now) + '; nothing else changes. Proposed from ' + T.closed + ' closed months, one step at a time (at most ' + T.step_pct + '%).') +
        (used ? savedFoot('09:06') : ''),
      acts: used ? [K.cbtn('Undo', 'x:undo', null, 'undo')] : [K.cbtn('Use ' + g(T.proposal), 'tune:use', 'primary'), K.cbtn('Keep the plan', 'x:keep'), K.cbtn('Why?', 'fold:why', 'ghost')],
      fold: ctx.has('why') ? { t: 'Why?', open: true, go: 'fold:why', body: 'plan errors over ' + T.closed + ' months: ' + mny('£' + T.err_plan) + ' · with ' + mny('£' + T.proposal) + ': ' + mny('£' + T.err_new) + ' · margin ' + mny('£' + T.margin) + '<br>a value is proposed only with 6 closed months behind it, and only one step at a time' } : null })],
      meta: 'The tuner: code’s proposal from the household’s own months; the admin decides', icon: 'tune' }));
    return out;
  }
  function tunerPanel(ctx) {
    var T = (wv(ctx) || {}).tuner;
    if (!T) return '';
    return K.card({ t: 'The tuner suggests', r: K.draft(), id: 'w-tunerpanel', body: K.row({ icon: 'tune', t: 'Groceries in the Budget forecast', s: 'over its plan in ' + T.n_over + ' of ' + T.closed + ' closed months, by about ' + g(T.mean_over) + ' · would have forecast them ' + g(T.closer) + ' closer', v: g(T.plan_now) + ' → ' + g(T.proposal) }) +
      K.foot('Assumptions are the admin’s alone: it changes only on your Confirm in the chat, as a new version with its audit row and Undo. Members see proposals and cannot apply them.') });
  }
  M.page('learning', function (ctx) {
    var T = (wv(ctx) || {}).tuner;
    return { title: 'The household learns', sub: 'Projection · the assumptions · March closed Thu 1 Apr 2027 · the tuner’s proposal beside them', chip: K.draft(),
      body: wrap(tunerPanel(ctx) + (T ? K.card({ t: 'Groceries, six closed months', body: '<div class="btable"><div class="brow h"><span>Month</span><span>Plan</span><span>Actual</span></div>' + T.months.map(function (m) { return '<div class="brow"><span>' + m.m + '</span><span class="mp-ink2">' + g(m.plan) + '</span><span>' + (m.actual > m.plan ? '▲ ' : '') + g(m.actual) + '</span></div>'; }).join('') + '</div>' +
        K.foot('October’s plan, ' + g(T.plan_2026) + ', grown by the UK’s 2.5% each January. The tuner refits the inputs that are estimates, never the household’s facts.') }) : '') +
        K.note('school', 'The household learns the way the market side does: each month graded when it closes, a change proposed only on that evidence, and the admin deciding.') + K.foot(ILLUS)) };
  });

  /* ======================= the chapters ======================= */
  var D1 = 'Mon 26 Oct';
  var pk = { home: 'Picked · Dashboard 1a, Net worth first', chat: 'Picked · Shell 1a, a Confirm card · Dashboard 1a', ci: 'Picked · Check-in card 1b, Paid as the Confirm', proj: 'Picked · Projection 1a, the fan first', plans: 'Picked · MA-264: Plans in the chat 2a, Budget forecast 1a, Plans tab 3a' };

  M.chapter({ key: 'p2', n: '2', order: 2, title: 'The first record, by talking', short: 'First record', steps: [
    { id: 'p2-whose', d: D1, tm: '09:40', viewer: 'arun', t: 'Whose is it?', page: 'home', focus: 'chat', picked: pk.chat,
      g: 'Home shows £439,951. Arun wrote “£5,000 in Monzo savings”; the agent drafted it and asks only what is missing. Tap Arun.',
      chat: function (ctx) { return monChat(ctx, 0); }, target: 'whose:arun', on: on(), scroll: { chat: 'w-whose' } },
    { id: 'p2-confirm', d: D1, tm: '09:40', viewer: 'arun', t: 'The Confirm card', page: 'home', focus: 'chat', picked: pk.chat,
      g: 'The card shows exactly what will be saved: owner, value, kind, liquid. Nothing is saved until Confirm. Tap Confirm.',
      chat: function (ctx) { return monChat(ctx, 1); }, target: 'confirm', on: on(), scroll: { chat: 'w-monzo' } },
    { id: 'p2-saved', d: D1, tm: '09:41', viewer: 'arun', t: 'Saved: net worth moves', page: 'home', focus: 'page', picked: pk.home,
      g: 'Saved · in the audit log 09:41. Net worth rolls £439,951 → £444,951 at every door; Home beside the chat moved while you watched. Next, the setup day replayed: tap the suggestion.',
      chat: function (ctx) { return monChat(ctx, 2); }, composer: { sug: ['Replay setup day, Sun 25 Oct', 'say:fd'] }, target: 'say:fd', on: on() },
    { id: 'p2-replay', d: D1, tm: '09:44', viewer: 'arun', t: 'Setup day replayed: an FD, and a fund for Asha', page: 'home', focus: 'chat', draft: true,
      g: 'A replay of Sun 25 Oct. The SBI FD: whose, then the one thing SBI’s terms leave open; the engine works out ₹6,17,538 on Sat 10 Mar 2029. Then Arun registers Asha’s fund for her: she owns it, it counts in her share. Tap Confirm on Asha’s fund.',
      chat: function (ctx) { return monChat(ctx, 3); }, target: 'asha:confirm', on: on(), scroll: { chat: 'w-ashafund' } },
    { id: 'p2-edit', d: D1, tm: '09:51', viewer: 'arun', t: 'The valuation check-in, corrected in place', page: 'asset/home', focus: 'page', draft: true, homeEdit: true,
      g: 'The 09:00 check-in held two valuations; Arun went one by one and tapped Change it, so Home’s figure opened on its page. Typed 428000: before → after, and the engine’s net worth after it. Tap Save.',
      chat: function (ctx) { return monChat(ctx, 4); }, target: 'home:save', on: on({ 'home:cancel': toast('Cancel leaves £415,000 as it is. This walk-through saves the correction: tap Save.'), 'val:change': toast('The figure is open on its page beside this: tap Save there.') }), scroll: { chat: 'w-valcard' } },
    { id: 'p2-fixed', d: D1, tm: '09:52', viewer: 'arun', t: 'Saved as your estimate', page: 'asset/home', focus: 'page', draft: true,
      g: 'Saved as a correction, with its audit row (via inline edit): £415,000 → £428,000, “your estimate”. Net worth is £457,951 (₹5,15,19,488), the engine’s figure; the check-in is answered by it.',
      chat: function (ctx) { return monChat(ctx, 5); }, on: on() },
    { id: 'p2-kind', d: 'Sat 31 Oct', tm: '10:13', viewer: 'arun', t: 'A new kind for the admin: Premium Bonds', page: 'home', focus: 'chat', draft: true,
      g: 'Asha asked for her NS&I Premium Bonds at 10:12; no kind fits, so it comes to Arun, the admin. Approve opens the second check: Sign in with Apple. Then the kind is data, versioned and audited; Asha’s record still waits for her own Confirm.',
      chat: satChat, target: 'kind:approve', sheet: function (ctx) { return ctx.has('check') ? secondCheck() : null; },
      on: on({ 'kind:approve': openK('check'), 'kind:close': function (st) { st.open.check = false; }, 'kind:apple': function (st) { st.open.check = false; st.open.ok = true; }, 'x:reject': toast('Reject tells Asha it can’t be added yet. This walk-through approves it.') }), scroll: { chat: 'w-kind' } }
  ] });

  M.chapter({ key: 'p3', n: '3', order: 3, title: 'Deposits, policies and four currencies', short: 'Currencies', steps: [
    { id: 'p3-inr', d: D1, tm: '09:55', viewer: 'arun', t: 'Net worth in rupees', page: 'home', focus: 'page', picked: 'Picked · Dashboard 1a, in rupees (MA-213)', open: ['inr'],
      g: 'The same Overview in rupees: ₹5,15,19,488, India’s records as they are and the UK’s at £1 = ₹112.50, the ECB’s rate of Fri 23 Oct. The switch is £ or ₹ here; dollars and euros come in the same switch. Open the SBI FD under Maturing next.',
      chat: function (ctx) { return monChat(ctx, 6); }, target: 'nav:asset/sbi_fd', on: on() },
    { id: 'p3-fd', d: D1, tm: '09:56', viewer: 'arun', t: 'A deposit, accrued to maturity', page: 'asset/sbi_fd', focus: 'page', draft: true,
      g: 'The FD accrues at its stated 7.1%, quarterly: ₹5,17,908 today, ₹6,17,538 on Sat 10 Mar 2029, the engine’s figures. The household’s fixed terms mature in turn; on the day, the chat asks what happened.',
      chat: function (ctx) { return monChat(ctx, 6); } },
    { id: 'p3-saver', d: 'Mon 14 Dec', tm: '09:00', t: 'A maturing deposit’s check-in', page: 'asset/saver', focus: 'chat', viewer: 'asha', draft: true,
      g: 'Asha’s chat. Her fixed-rate saver matured today with £10,460; nothing is assumed. Tap Renewed: it asks the new term, then its rate, then a Confirm starts the successor record and closes this one as matured. (The ledger holds no events after Thu 5 Nov, so totals show that day’s.)',
      chat: decChat, target: 'mat:renew', on: on({ 'mat:renew': openK('renew', null, 'w-term'), 'x:paidout': toast('Paid out asks where the £10,460 went. This walk-through renews it.'), 'x:moved': toast('Moved asks which account it went to. This walk-through renews it.'), 'x:term': toast('The term, then the rate, then the Confirm card: this walk-through stops before anything is saved.') }) }
  ] });

  M.chapter({ key: 'p4', n: '4', order: 4, title: 'Debts and check-ins', short: 'Debts', steps: [
    { id: 'p4-digest', d: D1, tm: '08:30', viewer: 'arun', t: 'The weekly digest: autopay assumed paid', page: 'debts', focus: 'chat', draft: true,
      g: 'Mon 26 Oct 08:30, before the first record: net worth £439,951. Autopay payments are assumed paid after their grace and listed once a week, about ten notifications a week in all. Debts beside it: three loans and the card, clear.',
      chat: function (ctx) { return [K.daysep('Today 08:30'), K.ai('', { cards: [digestCard()] })]; }, on: on() },
    { id: 'p4-emi', d: 'Thu 5 Nov', tm: '09:00', viewer: 'arun', t: 'The HDFC EMI check-in', page: 'debt/hdfc', focus: 'chat', picked: pk.ci,
      g: '“Was November’s EMI of ₹39,390 paid?” The card already shows exactly what Paid saves, so the tap is the Confirm. Something else opens Not yet, Different amount and Paid off in full. Tap Paid.',
      chat: function (ctx) { return thuChat(ctx, 0); }, target: 'emi:paid', on: on({ 'x:notyet': toast('Not yet asks again on Mon 9 Nov. This walk-through taps Paid.'), 'x:diff': toast('Different amount asks what was paid. This walk-through taps Paid.'), 'x:off': toast('Paid off in full closes the loan after a Confirm. This walk-through taps Paid.') }) },
    { id: 'p4-paid', d: 'Thu 5 Nov', tm: '09:12', viewer: 'arun', t: 'Paid, with Undo', page: 'debt/hdfc', focus: 'page', picked: pk.ci,
      g: 'Saved at 09:12 with Undo (Undo would reverse it with a new event). Left to pay ₹14,84,587 after November’s EMI; 136 of 180 paid. Net worth £456,747; Debts, one tap back, shows the card’s £1,458 too.',
      chat: function (ctx) { return thuChat(ctx, 1); }, on: on() },
    { id: 'p4-several', d: 'Fri 20 Nov', tm: '09:00', viewer: 'arun', t: 'Several due at once, and the card from its statement', page: 'debt/card', focus: 'chat', picked: 'Picked · Check-in card 1b, several due at once',
      g: 'Two due on one card: the Barclaycard bill from its Sun 1 Nov statement, £1,458, and the Pune flat’s overdue valuation. The card beside it is revolving debt from its statements: a payment is a transfer, only interest and fees count as spending. (The ledger holds no events after Thu 5 Nov, so totals show that day’s.)',
      chat: friChat, on: on({ 'ci:both': toast('Both as shown saves each with its audit row. This walk-through stops here, so the ledger stays at Thu 5 Nov.'), 'ci:one': toast('One by one asks each in turn. This walk-through stops here, so the ledger stays at Thu 5 Nov.') }) }
  ] });

  M.chapter({ key: 'p5', n: '5', order: 5, title: 'Investments, priced', short: 'Investments', steps: [
    { id: 'p5-buy', d: D1, tm: '10:00', viewer: 'arun', t: '“I put £200 into Balanced”', page: 'assets', focus: 'chat', draft: true,
      g: 'A replay of Fri 23 Oct, 08:13: free text lands on the transaction’s Confirm card, in pounds as Balanced is. It becomes a transaction only after Confirm. Balanced’s £22,925 at the Fri close already holds it. Tap Confirm.',
      chat: function (ctx) { return monChat(ctx, 7); }, target: 'buy:confirm', on: on({ 'buy:confirm': openK('bought', null, 'w-buy') }), scroll: { chat: 'w-buy' } },
    { id: 'p5-portfolio', d: D1, tm: '10:02', viewer: 'arun', t: 'The Portfolio card, each member’s holdings', page: 'home', focus: 'chat', draft: true,
      g: 'The household’s holdings, then each member’s: tap Arun or Asha. Each UK holding carries the rules engine’s stance (Balanced Hold 71%, NASDAQ Pause 64%, Robotics Hold 58%, Silver Hold 62%), in shadow; India’s come with phase 19.',
      chat: function (ctx) { return monChat(ctx, 8); }, target: 'pf:asha', on: on(), scroll: { chat: 'w-portfolio', page: 'w-inv' } },
    { id: 'p5-infosys', d: D1, tm: '10:04', viewer: 'arun', t: 'A share with no history: the agent asks', page: 'asset/infosys', focus: 'chat', draft: true,
      g: 'Infosys has 120 shares and no buys on record, so XIRR returns nothing, with the reason. The agent asks for past buys or an estimate, and an estimate stays marked as yours everywhere. Phase 9’s importer brings the buys.',
      chat: function (ctx) { return monChat(ctx, 9); }, on: on({ 'inf:buys': toast('Send past buys asks for Zerodha’s tax P&L or the contract notes. Phase 9’s Excel importer brings them.'), 'inf:est': toast('Give an estimate saves your figure, marked as yours everywhere. This walk-through waits for the buys.'), 'inf:later': toast('Later: it asks again in a month. The return stays blank, never guessed.') }), scroll: { chat: 'w-infask' } },
    { id: 'p5-fund', d: D1, tm: '10:06', viewer: 'arun', t: 'A SIP as a commitment, and XIRR with its working', page: 'asset/ppfas', focus: 'page', draft: true, open: ['xirr'],
      g: 'Asha’s fund: 46 SIPs of ₹10,000 since Jan 2023, ₹4,60,000 in, worth ₹5,61,995. XIRR 10.7% is the one rate that balances them, worked out by code. The SIP is a commitment: each month it asks once, then records the buy.',
      chat: function (ctx) { return monChat(ctx, 10); }, on: on(), scroll: { page: 'w-xirrcard' } }
  ] });

  M.chapter({ key: 'p6', n: '6', order: 6, title: 'The budget', short: 'Budget', steps: [
    { id: 'p6-statements', d: 'Sun 1 Nov', tm: '08:41', viewer: 'arun', t: 'October’s statements, read and categorised', page: 'budget', focus: 'chat', draft: true,
      g: 'Sun 1 Nov. Arun sent the Barclaycard PDF and Monzo’s CSV; each is kept for good before it is read. Lines are grouped by category, transfers recognised, two uncertain lines in amber (tap a pill to accept it). Tap Confirm.',
      chat: function (ctx) { return sunChat(ctx, 0); }, target: 'stmt:confirm', on: on(), scroll: { chat: 'w-stmt' } },
    { id: 'p6-close', d: 'Sun 1 Nov', tm: '09:00', viewer: 'arun', t: 'The month close, then the Budget', page: 'budget', focus: 'chat', draft: true,
      g: 'Saved at 08:44: the card’s £1,458 is owed (net worth £456,493), and the statement confirmed two autopay EMIs. At 09:00 the month-end check-in asks only what no statement covered. Tap Nothing else: October closes and Budget shows it.',
      chat: function (ctx) { return sunChat(ctx, 1); }, target: 'close:none', on: on({ 'close:none': openK('closed', function (st) { st.view = 'budget'; }, 'w-close'), 'x:cash': toast('Add cash spending asks how much and on what. This walk-through closes October.'), 'x:bank': toast('Another bank’s statement is sent the same way. This walk-through closes October.') }), scroll: { chat: 'w-close' } }
  ] });

  M.chapter({ key: 'p7', n: '7', order: 7, title: 'The Projection and plans', short: 'Projection', steps: [
    { id: 'p7-fan', d: 'Thu 5 Nov', tm: '10:05', viewer: 'arun', t: 'The fan, from today’s net worth', page: 'projection', focus: 'page', picked: pk.proj,
      g: 'The fan from £456,747, the engine’s run after this morning’s EMI: the middle path in 2046 and 8 in 10 runs around it; milestones, plan items, and each assumption with its source. As the admin, tap Arun’s salary growth, 4.8%.',
      chat: function (ctx) { return thuChat(ctx, 2); }, target: 'asm:arun', on: on() },
    { id: 'p7-asm', d: 'Thu 5 Nov', tm: '10:06', viewer: 'arun', t: 'An assumption corrected, then cancelled', page: 'projection', focus: 'page', picked: pk.proj, asmEdit: true,
      g: 'Typed 4.17: before → after, with what 4.17% is (the blend before he set his own). Save would run the Projection again; tap Cancel, so 4.8% and the engine’s run stay true.',
      chat: function (ctx) { return thuChat(ctx, 2); }, target: 'asm:cancel', on: on({ 'asm:save': toast('Save would run the Projection again. This walk-through cancels, so the figures stay true.') }), scroll: { page: 'w-asmedit' } },
    { id: 'p7-whatif', d: 'Thu 5 Nov', tm: '10:20', viewer: 'arun', t: 'A what-if, then a plan item', page: 'projection', focus: 'chat', picked: 'Picked · Projection 1a · Plans in the chat 2a',
      g: 'The what-if is the engine’s run, never saved: 2036’s middle path £1,446,000 against £1,539,000, and code flags cash £15,377 below zero in Jun 2028. Save as a plan item → Paid from where? → the impact → Cancel, so the plan keeps its three items.',
      chat: function (ctx) { return thuChat(ctx, 3); }, target: 'plan:save', on: on({ 'plan:save': openK('pay', null, 'w-pay'), 'pay:cash': openK('impact', null, 'w-impact'), 'plan:cancel': function (st, MP5) { st.open.cancelled = true; jumpTo('w-impact'); MP5.toast('Cancelled. Nothing saved: the plan keeps its three items.'); }, 'plan:confirm': toast('Confirm would save it with its audit row and, since cash goes below zero, offer ways to cover it. This walk-through cancels.'), 'x:pool': toast('This walk-through pays it from the monthly budget, then cash.') }), scroll: { chat: 'w-wi' } },
    { id: 'p7-asha', d: 'Thu 5 Nov', tm: '10:26', t: 'As Asha: no edit, her own what-if', page: 'projection', focus: 'page', viewer: 'asha', picked: 'Picked · Projection 1a, as Asha sees it',
      g: 'The same Projection as Asha: every edit control is gone, and the plan items and assumptions say they are Arun’s. She can still ask a what-if in her own chat; tap the suggestion. Only Arun can save it as a plan item.',
      chat: ashaThuChat, composer: { sug: ['What if: a second flat in June 2028', 'say:wi'] }, target: 'say:wi', on: on({ 'say:wi': function (st) { st.open.asked = true; st.pane = 'chat'; jumpTo('w-wi-asha'); } }) },
    { id: 'p7-fees', d: 'Thu 5 Nov', tm: '20:42', viewer: 'arun', t: 'A plan that leaves the household short', page: 'projection/forecast', focus: 'chat', picked: pk.plans,
      g: 'Thu 5 Nov, evening. “£4,000 a month from Jan 2029 for my kid’s schooling”: three questions answered, then the impact before anything is saved. The surplus falls under Arun’s £500 floor in 50 months. Tap Confirm.',
      chat: function (ctx) { return thuChat(ctx, 6); }, target: 'fees:confirm', on: on(), scroll: { chat: 'w-fees' } },
    { id: 'p7-ways', d: 'Thu 5 Nov', tm: '20:43', viewer: 'arun', t: 'The ways to cover it, and the Budget forecast', page: 'projection/forecast', focus: 'chat', picked: pk.plans,
      g: 'Saved with its audit row. Code found three ways to cover the £19,058 gap, each covering every month, and two more. The Budget forecast beside it shows each year’s leanest month against the floor: 2029 to 2035 under it. Confirm way 1, the pot.',
      chat: function (ctx) { return thuChat(ctx, 7); }, target: 'way:pot', on: on({ 'way:pot': openK('pot', null, 'w-applied'), 'x:way': toast('This walk-through confirms way 1, the pot.'), 'x:what': toast('What changes opens that way’s lines and dates.') }), scroll: { chat: 'w-ways' } },
    { id: 'p7-plans', d: 'Thu 5 Nov', tm: '21:05', viewer: 'arun', t: 'The Plans tab', page: 'projection/plans', focus: 'page', picked: pk.plans,
      g: 'After the pot (20:46), the salary step (20:53) and the HDFC closure with the SBI FD (20:59): seven plans, each a lane to 2046, and where four of them meet, from the engine. Plans are the admin’s alone; nothing is added here.',
      chat: function (ctx) { return thuChat(ctx, 8); }, on: on(), scroll: { chat: 'w-hdfcclose' } }
  ] });

  M.chapter({ key: 'p9', n: '9', order: 9, title: 'The whole dashboard', short: 'Dashboard', steps: [
    { id: 'p9-overview', d: 'Fri 6 Nov', tm: '08:30', viewer: 'arun', t: 'The Overview, complete', page: 'home', focus: 'page', picked: pk.home,
      g: 'Every part of the Overview at every door: net worth first, own and owe, each country and member, liquid and locked, what’s due, this month’s cash on the plan (the pot included), the investments with their stances, how the debts run off, what matures next and the largest assets.',
      chat: function (ctx) { return fri6Chat(ctx, 0); }, on: on(), scroll: { page: 'w-cash' } },
    { id: 'p9-reports', d: 'Fri 6 Nov', tm: '08:40', viewer: 'arun', t: 'Reports, exports, and any question', page: 'reports', focus: 'chat', draft: true,
      g: 'Reports and exports, each made from the ledger as it stands; mypaisapp.com now opens the dashboard and the old tracker is retired. Any other question is answered from the ledger’s read-only copy: the figures are the query’s, and the SQL is under Technical.',
      chat: function (ctx) { return fri6Chat(ctx, 1); }, target: 'fold:tech', on: on({ 'fold:tech': function (st) { st.open.tech = !st.open.tech; }, 'rep:pdf': toast('A PDF is made from the ledger as it stands and kept in Files.'), 'rep:csv': toast('A CSV is made from the ledger as it stands and kept in Files.'), 'rep:xlsx': toast('An XLSX is made from the ledger as it stands and kept in Files.') }), scroll: { chat: 'w-sql' } },
    { id: 'p9-import', d: 'Fri 6 Nov', tm: '21:04', viewer: 'arun', t: 'The Excel importer’s dry run', page: 'asset/infosys', focus: 'chat', draft: true,
      g: 'Years of history come in one workbook, prepared with Claude Code on the laptop and sent through a one-time link. The dry run shows what it would add (Infosys’s three buys), what is already there and every row refused, with the reason. Nothing is written until Confirm, behind the second check.',
      chat: importChat, on: on({ 'imp:confirm': toast('Confirm opens the second check, then writes the rows under one import id. This walk-through stops at the dry run.'), 'x:errors': toast('The refused rows come back as a file, ending at this same card.') }), scroll: { chat: 'w-dry' } },
    { id: 'p9-learn', d: 'Thu 1 Apr', tm: '09:05', viewer: 'arun', t: 'The household learns: graded, then tuned', page: 'learning', focus: 'chat', draft: true,
      g: 'Thu 1 Apr 2027, March closed: code grades its forecast against what happened. With six months closed, the tuner proposes Groceries at £720 from April, one step, on the household’s own evidence; the plan stays £666. Only the admin applies it. (The ledger holds no events after Thu 5 Nov, so the strip shows that day’s total.)',
      chat: aprChat, target: 'tune:use', on: on({ 'tune:use': openK('tuned', null, 'w-tuner'), 'x:keep': toast('Keep the plan: the tuner does not offer it again for the period its setting names.') }), scroll: { chat: 'w-tuner' } }
  ] });
})();
