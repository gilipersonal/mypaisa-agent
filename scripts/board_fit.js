// Every board stays whole at every size a member can have (MA-240).
//
// Renders each current board in the design mirror the way Claude Design does (support.js, ?static=1 so motion lands at
// once), at the screen's own pixel ratio (3 for the iOS boards, 2 for the rest), and resizes every device and browser
// frame through the real sizes of its class: an iPhone from 320 (Display Zoom) to 440 and in landscape, an iPad or
// foldable window from 600 to 1366 (a landscape iPad also at 960x744, 1024x1366, 1032x1376, 1080x810 and 1100x744,
// where the chat is a sheet away, and at 1133x744, the iPad mini across, with the chat beside), a device window drawn inside another frame (the Stage Manager window) from 600 to its drawn
// width, and the web from 320 to 1920 (a frame drawn at desktop width also at 320, 390, 440 and 540, on its page as
// below 1024). Every frame is also measured one pixel below and at each container query's threshold that styles it, the
// widths found by measuring the container itself. At each size the frame is measured whole: as set, at every step of
// each vertical scroller in it, and, where a clipping frame's content runs past its bottom, grown to its content's
// height. A frame drawn under CSS zoom or a scale is measured at the size it is shown. scripts/board_fit_page.js reports
// text clipped mid-word, text past its box, text on text on one surface, a box cut at the screen's edge, an icon shown
// as its name, a bar's track that is not the token and a chart's range band that is not the token; at a frame's drawn
// size, an axis label motion.js had to thin is a fault too. Prototype v4 is walked too: every door, theme and step.
//
//   node scripts/board_fit.js                    every current board and the prototype, in Chromium and WebKit
//   node scripts/board_fit.js --engine webkit --only "iPhone v4"   a subset (a pattern on the board's path), in one engine
//   node scripts/board_fit.js --only "Prototype v5" --steps "^14"   Prototype v5's chapters whose bar label matches (a re-check)
//   node scripts/board_fit.js --json <file>      also writes every row it measured (allowed ones marked) to <file>
//   node scripts/board_fit.js --sizes            also prints the sizes each frame is measured at
//   node scripts/board_fit.js --selftest [--case <name>] [--engine <e>]   proves the gate refuses each fault it was
//                                                 built for (in Chromium unless --engine says otherwise)
//   node scripts/board_fit.js --diff <ref> --expect <file> [--since <ref2>] [--out <dir>] [--engine <e>] [--only <pattern>]
//                                                 every frame at its drawn size against <ref>'s mirror, pixel by pixel
//
// --diff renders each current board from the working tree and from <ref> (git archive) in Chromium and WebKit (both
// unless --engine says one), at the board's own pixel ratio, and compares every frame, and every step of Prototype v4,
// at its drawn size and whole: at every step of each vertical scroller in it, and grown to its content's height where
// the frame clips it. A frame that changed and that the expectation file does not name fails, and so does a named
// change that no longer shows, so a shared rule cannot move a drawn screen unseen. The file's "neutral" CSS is put on
// both sides first, so a token the story changed on purpose (a colour) does not hide a change in layout. --out keeps
// both pictures of each changed frame for a reviewer to look at. --since <ref2> (the story's merge) holds a story's
// expectations to the boards as it left them (MA-282): a board redrawn after <ref2>, its own file or a file it alone
// loads changed since, is left out and named in a NOTE, and its later story's own diff answers for it; the files
// boards share (support.js, tokens.css, motion.js and motion.css, ios.css), where the guards are, are compared on
// every board that is left. A --since that leaves no board to compare fails (exit 2).
//
// Needs playwright-core 1.63 with Chromium and WebKit, pinned in scripts/package.json: `npm ci --prefix scripts`, then
// `npx --prefix scripts playwright-core install chromium webkit` (PLAYWRIGHT_CORE=<path> overrides). It fails closed:
// a board that does not render (the runtime's render errors included), a board with no frame to measure (but the
// documentation pages allow.json names), a frame it cannot measure, a missing icon or text font, a template value that
// never resolved and a container query it cannot read are failures, and so are an --only that matches no board and a
// --case that names no case (exit 2). What a fault means and why an allowance holds is in scripts/board_fit_allow.json;
// an allowance names its board, its fault and its reason, and an allowance that no longer matches anything is reported
// so the list stays true.
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const PAGE_JS = fs.readFileSync(path.join(__dirname, 'board_fit_page.js'), 'utf8');
const ALLOW = JSON.parse(fs.readFileSync(path.join(__dirname, 'board_fit_allow.json'), 'utf8'));

function playwright() {
  for (const m of [process.env.PLAYWRIGHT_CORE, 'playwright-core'].filter(Boolean)) {
    try { return require(m); } catch (e) { /* next */ }
  }
  console.error('board_fit: playwright-core not found: run `npm ci --prefix scripts`, then `npx --prefix scripts playwright-core install chromium webkit`');
  process.exit(2);
}

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const enginesOf = (dflt) => {
  const e = { both: ['chromium', 'webkit'], chromium: ['chromium'], webkit: ['webkit'] }[opt('--engine', dflt)];
  if (!e) { console.error('board_fit: --engine is chromium, webkit or both'); process.exit(2); }
  return e;
};
const JOBS = +opt('--jobs', Math.max(2, Math.min(6, os.cpus().length - 2)));
const ONLY = opt('--only', '');
// Prototype v5 only: walk just the chapters whose bar label matches (a quick re-check of a fix; the gate walks them all)
const STEPS = opt('--steps', '');
const dprOf = (board) => (board.startsWith('ios-v1/') ? 3 : 2);

// the sizes of each class, from the frame's drawn size
function sizes(w, h, isDev) {
  const r = Math.round;
  if (w <= 470 && h > w) return [[320, 568], [375, 667], [375, 812], [390, 844], [402, 874], [430, 932], [440, 956]];
  if (h <= 470 && w > h) return [[568, 320], [667, 375], [844, 390], [956, 440]];
  if (w < 1000 && h > w) return [[600, r(600 * h / w)], [650, r(650 * h / w)], [700, r(700 * h / w)], [744, 1133], [820, 1180], [900, r(900 * h / w)], [1024, 1366]];
  if (w >= 1000 && isDev) return [[960, 744], [1024, 1366], [1032, 1376], [1080, 810], [1100, 744], [1133, 744], [1180, 820], [1366, 1024]];   // the sidebar and the screen; the chat beside from 1133
  if (w >= 1000) return [[320, 568], [390, 844], [440, 956], [540, 960], [600, 960], [768, 1024], [820, 1180], [900, 1200], [1024, r(1024 * h / w)], [1280, r(1280 * h / w)], [1440, r(1440 * h / w)], [1920, r(1920 * h / w)]];   // a tablet's window is tall; under 1024 the page alone
  return [[r(w * 0.85), h], [r(w * 1.15), h]];
}
// the widths a frame's class covers, where its container queries' thresholds are looked for
function range(m) {
  if (m.nested) return [600, m.w];
  if (m.w <= 470 && m.h > m.w) return [320, 440];
  if (m.h <= 470 && m.w > m.h) return [568, 956];
  if (m.w < 1000 && m.h > m.w) return [600, 1024];
  if (m.w >= 1000 && m.dev) return [960, 1366];
  if (m.w >= 1000) return [320, 1920];
  return null;
}
// the height a frame is given at a width its class's list does not name
function heightAt(m, W) {
  const r = Math.round;
  if (m.nested) return m.h;
  if (m.w <= 470 && m.h > m.w) return W < 375 ? 568 : W < 400 ? 844 : W < 435 ? 932 : 956;
  if (m.h <= 470 && m.w > m.h) return W < 667 ? 320 : W < 844 ? 375 : W < 956 ? 390 : 440;
  if (m.w < 1000 && m.h > m.w) return r(W * m.h / m.w);
  if (m.dev) return W < 1133 ? 744 : r(W * m.h / m.w);
  return W < 600 ? (W < 375 ? 568 : W < 430 ? 844 : 932) : W < 1024 ? r(W * 4 / 3) : r(W * m.h / m.w);
}
// a device window drawn inside another frame, from 600 to its drawn width
const nestedSizes = (m) => { const out = []; for (let w = 600; w < m.w; w += 50) out.push([w, m.h]); out.push([m.w, m.h]); return out; };
const PROTO = { 'Desktop': [[768, 1024], [900, 700], [1024, 700], [1280, 800], [1440, 900], [1920, 1080]], 'Phone web': [[320, 568], [360, 740], [390, 844], [430, 932]], 'iPhone': [[320, 568], [375, 667], [402, 874], [440, 956]] };
const PROTO_RANGE = { 'Desktop': [768, 1920], 'Phone web': [320, 430], 'iPhone': [320, 440] };
// Prototype v5 (MA-291): five doors, each laid out by its own width (container queries), so each is measured across
// its whole class: the web from 768, the phone's browser and the iPhone from 320, an iPad or foldable window from 600
const PROTO5 = { 'Desktop': [[768, 1024], [1024, 768], [1133, 800], [1280, 800], [1440, 900], [1920, 1080]], 'Phone web': [[320, 568], [360, 740], [390, 844], [430, 932]],
  'iPhone': [[320, 568], [375, 667], [402, 874], [440, 956]], 'iPad': [[600, 800], [820, 1180], [1024, 768], [1133, 744], [1180, 820], [1366, 1024]], 'Foldable': [[600, 900], [750, 1000], [880, 1036]] };
const PROTO5_RANGE = { 'Desktop': [768, 1920], 'Phone web': [320, 430], 'iPhone': [320, 440], 'iPad': [600, 1366], 'Foldable': [600, 880] };

function serve(root) {
  const dir = path.resolve(root) + path.sep;
  const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })));
}

const REPO_BOARDS = ['prototype-v5/Prototype v5.dc.html'];
// the current boards: every .dc.html in the mirror but the superseded record and the prototype's parts, and the repo's own
function boards(design, only = ONLY) {
  const rec = JSON.parse(fs.readFileSync(path.join(design, 'claude-design.json'), 'utf8'));
  const dirs = { app: 'app-v1', ios: 'ios-v1', ds: 'ds-v1' };
  const skip = new RegExp(ALLOW.superseded.pattern);
  const out = [];
  for (const [p, d] of Object.entries(dirs)) for (const f of Object.keys(rec[p].files)) if (f.endsWith('.dc.html') && !skip.test(f)) out.push(d + '/' + f);
  // the boards kept in the repo alone, outside the three mirrored projects (MA-291: Prototype v5, docs/design/prototype-v5/)
  for (const b of REPO_BOARDS) if (fs.existsSync(path.join(design, b))) out.push(b); else throw new Error('board_fit: ' + b + ' is listed but missing');
  return out.filter((b) => !only || new RegExp(only).test(b)).sort();
}

const tail = (el) => (el || '').replace(/\.sc-interp/g, '').split(' > ').slice(-2).join(' > ');
const FIGURE = /[£₹$€]\s?\d|\d{1,3}(,\d{2,3})+/;

function faultsOf(scan) {
  const out = [];
  for (const x of scan.issues) {
    let t = x.type;
    if (t === 'under-layer') continue;   // content scrolled under a bar, a sheet or a toast: the scroll edge
    if (/\btg-|\btgh|\.tg\b/.test(x.el || '')) continue;   // Telegram's own chrome, drawn for context on the superseded record
    if (t === 'ellipsis') { if (!FIGURE.test(x.text)) continue; t = 'figure-truncated'; }
    out.push({ type: t, text: x.text, el: tail((x.el || '').split('  ⟂  ')[0]) + ((x.el || '').includes('  ⟂  ') ? ' ⟂ ' + tail(x.el.split('  ⟂  ')[1]) : ''), px: x.px });
  }
  return out;
}

async function settle(page) {
  // the canvas draws its boards from templates after load: wait until no template hole shows and the height holds
  let last = -1;
  for (let n = 0; n < 24; n++) {
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, holes: /\{\{[^}]*\}\}/.test(document.body.innerText) }));
    if (!s.holes && s.h === last) return true;
    last = s.h;
  }
  return false;
}

// the runtime's own word that it could not render: a render error on the console, or the error it draws in the page
const RUNTIME_ERROR = /\[dc-runtime\]|\.renderVals\(\):/;
async function runtimeErrors(page, logged) {
  const drawn = await page.evaluate(() => [...document.querySelectorAll('.sc-logic-error')].map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 160)));
  return [...drawn.map((t) => 'the runtime could not render it: ' + t), ...[...logged].map((t) => 'the runtime reported an error: ' + t)];
}

// Measures frames at their current size: as set and at every step of their scrollers, then grows each clipping frame
// whose content runs past its bottom to its content's height (again while that converges) and measures it once more.
// put(i, scans, part) takes each frame's scans.
async function measure(page, idx, put) {
  for (const i of idx) put(i, await page.evaluate((i) => { const s = window.__fit.scan(i); return s ? [s, ...window.__fit.steps(i)] : [null]; }, i), '');
  const ext = await page.evaluate((idx) => idx.map((i) => ({ i, e: window.__fit.extent(i) })), idx);
  const grow = ext.filter((x) => x.e && x.e.clips && x.e.need > x.e.h + 4).map((x) => ({ i: x.i, h: x.e.h, need: Math.min(x.e.need, 16000) }));
  if (!grow.length) return;
  for (let round = 0; round < 3; round++) {
    const now = grow.filter((g) => !g.done);
    if (!now.length) break;
    await page.evaluate((now) => { const fs = window.__fit.frames(true); for (const g of now) for (const [k, v] of [['height', g.need + 'px'], ['max-height', 'none'], ['min-height', '0']]) fs[g.i].style.setProperty(k, v, 'important'); }, now);
    await page.waitForTimeout(round ? 150 : 250);
    const again = await page.evaluate((now) => now.map((g) => window.__fit.extent(g.i)), now);
    now.forEach((g, k) => {
      const n2 = again[k] ? again[k].need : 0;
      // content that grew with the frame (a column that fills the screen) is followed while what it hides shrinks; a
      // box parked past the bottom (a closed sheet) moves with the bottom, and is left there
      if (n2 > g.need + 4 && n2 - g.need < g.need - g.h - 4 && n2 < 16000) { g.h = g.need; g.need = n2; } else g.done = true;
    });
  }
  for (const g of grow) put(g.i, await page.evaluate((i) => { const s = window.__fit.scan(i); return s ? [s, ...window.__fit.steps(i)] : [null]; }, g.i), 'whole');
}

// the boards fetch React and their fonts over the network, so a board that did not render is tried once more before
// it fails: a fault in the board fails both times
async function scanBoard(browser, port, board, engine) {
  const rows = await scanBoardOnce(browser, port, board, engine);
  return rows.some((r) => r.type === 'did-not-render') ? scanBoardOnce(browser, port, board, engine) : rows;
}

async function scanBoardOnce(browser, port, board, engine) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: dprOf(board) });
  const page = await ctx.newPage();
  const rows = [];
  const fail = (why) => rows.push({ board, engine, size: '-', label: '', type: 'did-not-render', text: why, el: '' });
  // a template value that never resolved renders as nothing, with no hole to see (MA-241's notes rendered blank)
  const holes = new Set(), logged = new Set();
  page.on('console', (m) => {
    const t = m.text().replace(/\s+/g, ' ');
    if (/never resolved/.test(t)) holes.add(t.slice(0, 120));
    if (m.type() === 'error' && RUNTIME_ERROR.test(t)) logged.add(t.slice(0, 160));
  });
  const seen = new Set();
  const add = (r) => { const k = [r.size, r.label, r.type, r.text, r.el].join('|'); if (!seen.has(k)) { seen.add(k); rows.push(r); } };
  try {
    await page.goto(`http://127.0.0.1:${port}/` + board.split('/').map(encodeURIComponent).join('/') + '?static=1', { waitUntil: 'networkidle', timeout: 60000 });
    if (!(await settle(page))) fail('the board never settled (template holes still showing)');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: PAGE_JS });
    const font = await page.evaluate(() => ({ uses: !!document.querySelector('.ms'), ok: [...document.fonts].some((f) => /Material Symbols/.test(f.family) && f.status === 'loaded') }));
    if (font.uses && !font.ok) fail('the icon font did not load, so every icon would show as its name');
    // the text is set in the Apple system font; elsewhere the stack falls to Inter and Nunito, which must have loaded
    const text = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform) || ['Inter', 'Nunito'].every((n) => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === n && f.status === 'loaded')));
    if (!text) fail('the text fonts did not load, so every width would be measured in a fallback font');
    for (const h of holes) fail('a template value never resolved and renders as nothing: ' + h);
    for (const e of await runtimeErrors(page, logged)) fail(e);
    for (const q of await page.evaluate(() => window.__fit.unreadQueries())) fail('a container query the gate cannot read: ' + q);
    if (board.endsWith('Prototype v4.dc.html') || board.endsWith('Prototype v5.dc.html')) {
      // the prototype mounts its parts after the canvas settles: wait for its controls
      await page.waitForFunction(() => document.querySelectorAll('.pseg button').length && document.querySelectorAll('.psteps button').length, null, { timeout: 30000 });
      const walked = board.endsWith('Prototype v5.dc.html') ? await walkPrototype5(page, board, engine) : await walkPrototype(page, board, engine);
      for (const e of await runtimeErrors(page, logged)) fail(e);
      return rows.concat(walked);
    }
    // Below 1024 the web shows the page or the chat, never both (docs/design/README.md, the web's size classes), so a
    // frame drawn with the page and the chat beside it is measured there on its page; a phone's chat, drawn alone, stays.
    await page.addStyleTag({ content: '[data-fit-view="page"] :is(.chat4, .chatcol) { display: none !important; }' });
    const specimens = ALLOW.drawnOnly.some((n) => board.endsWith(n.board));
    const meta = await page.evaluate((specimens) => window.__fit.frames(true).map((f, i) => {
      const r = f.getBoundingClientRect(), nested = window.__fit.nested(i);
      return { i, w: Math.round(f.offsetWidth || r.width), h: Math.round(f.offsetHeight || r.height), dev: f.classList.contains('dev'), nested, clips: getComputedStyle(f).overflow !== 'visible', still: specimens && !f.classList.contains('dev'), both: !nested && !!f.querySelector('.mp-shell:not(.sh-c) .mp-shell-main') && [...f.querySelectorAll('.mp-shell:not(.sh-c) :is(.chat4, .chatcol)')].some((c) => getComputedStyle(c).display !== 'none') && getComputedStyle(f.querySelector('.mp-shell-main')).display !== 'none' };
    }), specimens);
    if (!meta.length && !ALLOW.noFrames.some((n) => board.endsWith(n.board))) fail('no device or browser frame to measure');
    const superseded = new RegExp(ALLOW.superseded.frames);
    const sizeOf = {};
    const put = (i, scans, part) => scans.forEach((s, n) => {
      if (!s) { if (!n) add({ board, engine, size: sizeOf[i], label: 'frame ' + i, type: 'did-not-render', text: 'a frame that could not be measured', el: '' }); return; }
      if (!superseded.test(s.label)) faultsOf(s).forEach((f) => add({ board, engine, size: sizeOf[i], label: s.label, part: part || (n ? 'scrolled' : ''), ...f }));
    });
    // the drawn size: as drawn and whole, and at its drawn size every axis fits, so a label thinned there is a collision
    // drawn into the board
    const drawnStyles = await page.evaluate(() => window.__fit.frames(true).map((f) => f.getAttribute('style')));
    meta.forEach((m) => { sizeOf[m.i] = 'drawn'; });
    for (const t of await page.evaluate((idx) => idx.map((i) => ({ label: window.__fit.label(window.__fit.frames(true)[i]), ts: window.__fit.thinned(i) })), meta.filter((m) => !m.nested).map((m) => m.i))) {
      if (!superseded.test(t.label)) t.ts.forEach((x) => add({ board, engine, size: 'drawn', label: t.label, type: 'label-thinned-as-drawn', text: x.text, el: x.el }));
    }
    await measure(page, meta.map((m) => m.i), put);
    await page.evaluate((st) => window.__fit.frames(true).forEach((f, i) => { if (st[i] === null) f.removeAttribute('style'); else f.setAttribute('style', st[i]); }), drawnStyles);
    // each frame's sizes: its class's list, and one below and at each threshold of a container query that styles it
    for (const m of meta) {
      if (m.still) { m.plan = []; continue; }
      const base = m.nested ? nestedSizes(m) : sizes(m.w, m.h, m.dev);
      const rg = range(m);
      const extra = rg ? (await page.evaluate(([i, lo, hi, both]) => window.__fit.widths(i, lo, hi, both), [m.i, rg[0], rg[1], m.both])).map((W) => [W, heightAt(m, W)]) : [];
      const plan = base.slice();
      for (const s of extra) if (!plan.some((p) => Math.abs(p[0] - s[0]) < 0.01)) plan.push(s);
      m.plan = plan.sort((a, b) => a[0] - b[0]);
      if (args.includes('--sizes')) console.log(`SIZES ${board} · ${engine} · frame ${m.i}${m.nested ? ' (inside another)' : ''} · ${m.w}x${m.h} · ${m.plan.map((s) => s.join('x')).join(', ')}`);
    }
    const most = Math.max(0, ...meta.map((m) => m.plan.length));
    for (let k = 0; k < most; k++) {
      const plan = meta.filter((m) => m.plan[k]).map((m) => ({ i: m.i, w: m.plan[k][0], h: m.plan[k][1], setH: m.clips, page: m.both && m.plan[k][0] < 1024 }));
      plan.forEach((p) => { sizeOf[p.i] = `${p.w}x${p.h}`; });
      await page.evaluate((plan) => {
        const fs = window.__fit.frames(true);
        for (const p of plan) {
          const f = fs[p.i];
          if (p.page) f.setAttribute('data-fit-view', 'page'); else f.removeAttribute('data-fit-view');
          for (const [k, v] of [['width', p.w + 'px'], ['max-width', 'none'], ['min-width', '0']]) f.style.setProperty(k, v, 'important');
          if (p.setH) for (const [k, v] of [['height', p.h + 'px'], ['max-height', 'none'], ['min-height', '0']]) f.style.setProperty(k, v, 'important');
        }
      }, plan);
      await page.waitForTimeout(350);
      await measure(page, plan.map((p) => p.i), put);
    }
    for (const e of await runtimeErrors(page, logged)) fail(e);
  } catch (e) { fail(String(e).slice(0, 200)); }
  await ctx.close();
  return rows;
}

async function walkPrototype(page, board, engine) {
  const rows = [];
  const seen = new Set();
  const add = (r) => { const k = [r.size, r.label, r.type, r.text, r.el].join('|'); if (!seen.has(k)) { seen.add(k); rows.push(r); } };
  const click = (sel, text) => page.evaluate(([sel, text]) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); if (!b) throw new Error('no button ' + text); b.click(); }, [sel, text]);
  for (const door of Object.keys(PROTO)) {
    await click('.pseg button', door);
    let doorSizes = null;
    for (const theme of ['Light', 'Dark']) {
      await click('.pseg button', theme);
      const steps = await page.evaluate(() => document.querySelectorAll('.psteps button').length);
      for (let s = 0; s < steps; s++) {
        await page.evaluate((s) => document.querySelectorAll('.psteps button')[s].click(), s);
        await page.waitForTimeout(600);
        const label = `${door} · ${theme} · step ${s + 1}`;
        // the door's sizes, and one below and at each container query's threshold, found once on its first step
        if (!doorSizes) {
          await page.waitForTimeout(400);
          const ws = await page.evaluate(([lo, hi]) => window.__fit.frames().length ? window.__fit.widths(0, lo, hi, false) : [], PROTO_RANGE[door]);
          const h = (W) => { const near = PROTO[door].reduce((a, b) => (Math.abs(b[0] - W) < Math.abs(a[0] - W) ? b : a)); return near[1]; };
          doorSizes = PROTO[door].slice();
          for (const W of ws) if (!doorSizes.some((p) => Math.abs(p[0] - W) < 0.01)) doorSizes.push([W, h(W)]);
          doorSizes.sort((a, b) => a[0] - b[0]);
        }
        // the prototype sizes its frame with inline styles to fit the window: keep them, and put them back for the drawn size
        const orig = await page.evaluate(() => window.__fit.frames()[0].getAttribute('style') || '');
        for (const [w, h] of [[0, 0], ...doorSizes]) {
          await page.evaluate(([w, h, orig]) => {
            const f = window.__fit.frames()[0];
            f.setAttribute('style', orig);
            if (!w) return;
            for (const [k, v] of [['width', w + 'px'], ['height', h + 'px'], ['max-width', 'none'], ['min-width', '0'], ['transform', 'none']]) f.style.setProperty(k, v, 'important');
          }, [w, h, orig]);
          await page.waitForTimeout(250);
          const size = w ? `${w}x${h}` : 'drawn';
          let ok = await page.evaluate(() => !!window.__fit.scan(0));
          if (!ok) { await page.waitForTimeout(700); ok = await page.evaluate(() => !!window.__fit.scan(0)); }   // a step's own transition can still be fading the frame in
          if (!ok) { add({ board, engine, size, label, type: 'did-not-render', text: 'no frame at ' + (await page.evaluate(() => document.querySelectorAll('.pframe').length)) + ' pframes', el: '' }); continue; }
          if (!w) (await page.evaluate(() => window.__fit.thinned(0))).forEach((x) => add({ board, engine, size: 'drawn', label, type: 'label-thinned-as-drawn', text: x.text, el: x.el }));
          await measure(page, [0], (i, scans, part) => scans.forEach((sc, n) => { if (sc) faultsOf(sc).forEach((f) => add({ board, engine, size, label, part: part || (n ? 'scrolled' : ''), ...f })); }));
        }
        await page.evaluate((orig) => window.__fit.frames()[0].setAttribute('style', orig), orig);
      }
    }
  }
  return rows;
}

// Prototype v5 (MA-291): every chapter (one per phase) and every step, at its five doors, light and dark. Every step is
// measured at its drawn size in both themes; each chapter's first step is also measured across its door's whole class
// (the sizes above, and one below and at each container query's threshold), in light, since a theme changes no layout:
// about a hundred steps at every size in both engines would take hours, and every step of a chapter shares its frames.
async function walkPrototype5(page, board, engine) {
  const rows = [];
  const seen = new Set();
  const add = (r) => { const k = [r.size, r.label, r.type, r.text, r.el].join('|'); if (!seen.has(k)) { seen.add(k); rows.push(r); } };
  const click = (sel, text) => page.evaluate(([sel, text]) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); if (!b) throw new Error('no button ' + text); b.click(); }, [sel, text]);
  for (const door of Object.keys(PROTO5)) {
    await click('.pseg button', door);
    let doorSizes = null;
    for (const theme of ['Light', 'Dark']) {
      await click('.pseg button', theme);
      const chapters = await page.evaluate(() => document.querySelectorAll('.pchaps .pch').length);
      if (!chapters) add({ board, engine, size: 'drawn', label: door, type: 'did-not-render', text: 'no chapters', el: '' });
      for (let c = 0; c < chapters; c++) {
        if (STEPS && !new RegExp(STEPS).test(await page.evaluate((c) => document.querySelectorAll('.pchaps .pch')[c].textContent.trim(), c))) continue;
        await page.evaluate((c) => document.querySelectorAll('.pchaps .pch')[c].click(), c);
        const steps = await page.evaluate(() => document.querySelectorAll('.psteps button').length);
        for (let s = 0; s < steps; s++) {
          await page.evaluate((s) => document.querySelectorAll('.psteps button')[s].click(), s);
          await page.waitForTimeout(250);
          const name = await page.evaluate(() => { const ch = document.querySelector('.pch.on'); return ch ? ch.textContent.trim() : ''; });
          const label = `${door} · ${theme} · phase ${name} · step ${s + 1}`;
          if (!doorSizes) {
            await page.waitForTimeout(300);
            const ws = await page.evaluate(([lo, hi]) => window.__fit.frames().length ? window.__fit.widths(0, lo, hi, false) : [], PROTO5_RANGE[door]);
            const h = (W) => { const near = PROTO5[door].reduce((a, b) => (Math.abs(b[0] - W) < Math.abs(a[0] - W) ? b : a)); return near[1]; };
            doorSizes = PROTO5[door].slice();
            for (const W of ws) if (!doorSizes.some((p) => Math.abs(p[0] - W) < 0.01)) doorSizes.push([W, h(W)]);
            doorSizes.sort((a, b) => a[0] - b[0]);
          }
          const sizes = s === 0 && theme === 'Light' ? [[0, 0], ...doorSizes] : [[0, 0]];
          // the prototype sizes and scales its frame with inline styles to fit the window: keep them, and put them back for the drawn size
          const orig = await page.evaluate(() => window.__fit.frames()[0].getAttribute('style') || '');
          for (const [w, hh] of sizes) {
            await page.evaluate(([w, h, orig]) => {
              const f = window.__fit.frames()[0];
              f.setAttribute('style', orig);
              if (!w) return;
              for (const [k, v] of [['width', w + 'px'], ['height', h + 'px'], ['max-width', 'none'], ['min-width', '0'], ['transform', 'none']]) f.style.setProperty(k, v, 'important');
            }, [w, hh, orig]);
            await page.waitForTimeout(w ? 200 : 0);
            const size = w ? `${w}x${hh}` : 'drawn';
            let ok = await page.evaluate(() => !!window.__fit.scan(0));
            if (!ok) { await page.waitForTimeout(700); ok = await page.evaluate(() => !!window.__fit.scan(0)); }
            if (!ok) { add({ board, engine, size, label, type: 'did-not-render', text: 'no frame at ' + (await page.evaluate(() => document.querySelectorAll('.pframe').length)) + ' pframes', el: '' }); continue; }
            if (!w) (await page.evaluate(() => window.__fit.thinned(0))).forEach((x) => add({ board, engine, size: 'drawn', label, type: 'label-thinned-as-drawn', text: x.text, el: x.el }));
            await measure(page, [0], (i, scans, part) => scans.forEach((sc, n) => { if (sc) faultsOf(sc).forEach((f) => add({ board, engine, size, label, part: part || (n ? 'scrolled' : ''), ...f })); }));
          }
          await page.evaluate((orig) => window.__fit.frames()[0].setAttribute('style', orig), orig);
        }
      }
    }
  }
  return rows;
}

function allowed(row) {
  return ALLOW.allow.find((a) => a.board.split('|').some((b) => row.board.endsWith(b)) && a.types.includes(row.type) && new RegExp(a.text).test(row.text) && (!a.sizes || a.sizes.some((s) => row.size.startsWith(s))) && (!a.below || parseFloat(row.size) < a.below) && (!a.frames || new RegExp(a.frames).test(row.label)) && (!a.el || new RegExp(a.el).test(row.el)));
}

async function run(design, list, engines) {
  const pw = playwright();
  const { server, port } = await serve(design);
  const rows = [];
  for (const engine of engines) {
    const browser = await pw[engine].launch();
    const queue = list.slice();
    await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) rows.push(...(await scanBoard(browser, port, queue.shift(), engine))); }));
    await browser.close();
  }
  server.close();
  return rows;
}

// The gate's verdict: every row no allowance holds, grouped by board, fault, element and text. Every group is a fault;
// nothing is reported and let pass (a figure cut by an ellipsis was once a note, MA-240 round 1).
function verdict(rows) {
  const seen = new Map();
  for (const r of rows) {
    if (allowed(r)) { r.allowed = true; continue; }
    const k = [r.board, r.type, r.el, r.text.slice(0, 60)].join('|');
    const g = seen.get(k) || { ...r, sizes: new Set(), engines: new Set(), labels: new Set() };
    g.sizes.add(r.size); g.engines.add(r.engine); g.labels.add(r.label); seen.set(k, g);
  }
  return [...seen.values()];
}

// prints the verdict and returns the groups it counts as faults: the gate's exit and the selftest both read this list
function report(rows, print = true) {
  const v = verdict(rows);
  if (print) for (const g of v) console.log(`FAIL ${g.board} · ${g.type} · ${JSON.stringify(g.text.slice(0, 70))} · ${[...g.sizes].slice(0, 6).join(', ')} · ${[...g.engines].join('+')} · ${g.label} · ${g.el}`);
  return v;
}

// a PNG as Playwright writes it (8-bit RGB or RGBA, not interlaced), decoded to RGB, so the diff needs no image library
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, w = 0, h = 0, depth = 0, type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) throw new Error('an interlaced PNG'); }
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`a PNG of depth ${depth} and colour type ${type}`);
  const bpp = type === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = new Uint8Array(w * h * 3);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1), filter = raw[o];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = raw[o + 1 + x];
      if (filter === 1) v += a; else if (filter === 2) v += b; else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (filter !== 0) throw new Error('a PNG filter ' + filter);
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) px[(y * w + x) * 3 + k] = cur[x * bpp + k];
    [prev, cur] = [cur, prev];
  }
  return { w, h, px };
}

// Two pictures of one frame at pixel ratio d, compared. Both are blurred over 3x3 pixels, which smooths anti-aliasing
// and keeps a one-CSS-pixel line. Each tile of 4 CSS pixels a side where the two differ is matched against the other
// picture moved by any shift up to one CSS pixel (d pixels) either way, in quarter pixels, so content that lands a
// fraction of a pixel apart, or up to a whole CSS pixel, is not a change; what still differs once the tile is matched
// is: a line taken away, a glyph changed, content moved by two pixels or more, a colour changed. Only a pixel whose 2x2
// block still differs counts. Calibrated on MA-240 (main before the story against HEAD, 309 pictures that differed by a
// fraction of a pixel: at most 2 such pixels; the probes at 3x: one glyph changed 101 and more, a 1 px rule taken away
// 1998, a 2 px move 3215; a 1 px move 0).
const DIFF_TOL = 60;   // the three channels' summed difference, after the blur and the best shift
const DIFF_MIN = 16;   // pixels: what still differs in a picture that has changed
function compare(x, y, d) {
  if (x.w !== y.w || x.h !== y.h) return { n: -1, size: `${x.w}x${x.h} to ${y.w}x${y.h}` };
  const W = x.w, H = x.h, N = W * H;
  const blur = (px) => {
    const t = new Float32Array(N * 3), o = new Float32Array(N * 3);
    for (let py = 0; py < H; py++) for (let qx = 0; qx < W; qx++) for (let c = 0; c < 3; c++) {
      const i = (py * W + qx) * 3 + c;
      t[i] = px[i] + px[(py * W + Math.max(0, qx - 1)) * 3 + c] + px[(py * W + Math.min(W - 1, qx + 1)) * 3 + c];
    }
    for (let py = 0; py < H; py++) for (let qx = 0; qx < W; qx++) for (let c = 0; c < 3; c++) {
      const i = (py * W + qx) * 3 + c;
      o[i] = (t[i] + t[(Math.max(0, py - 1) * W + qx) * 3 + c] + t[(Math.min(H - 1, py + 1) * W + qx) * 3 + c]) / 9;
    }
    return o;
  };
  const A = blur(x.px), B = blur(y.px), T = DIFF_TOL, S = 4 * d;
  // B at a point between pixels, in channel c
  const at = (fx, fy, c) => {
    fx = Math.min(W - 1, Math.max(0, fx)); fy = Math.min(H - 1, Math.max(0, fy));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
    return (1 - ax) * (1 - ay) * B[(y0 * W + x0) * 3 + c] + ax * (1 - ay) * B[(y0 * W + x1) * 3 + c] + (1 - ax) * ay * B[(y1 * W + x0) * 3 + c] + ax * ay * B[(y1 * W + x1) * 3 + c];
  };
  const ch = new Uint8Array(N);
  for (let ty = 0; ty < H; ty += S) for (let tx = 0; tx < W; tx += S) {
    const xe = Math.min(W, tx + S), ye = Math.min(H, ty + S);
    let differs = false;
    for (let py = ty; py < ye && !differs; py++) for (let qx = tx; qx < xe; qx++) { const i = (py * W + qx) * 3; if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > T) { differs = true; break; } }
    if (!differs) continue;
    // the shift, up to one CSS pixel, that matches the tile best: whole pixels first, then quarter pixels about the best
    const ssd = (dx, dy) => {
      let s = 0;
      const whole = dx === Math.round(dx) && dy === Math.round(dy);
      for (let py = ty; py < ye; py++) for (let qx = tx; qx < xe; qx++) for (let c = 0; c < 3; c++) {
        const v = whole ? B[(Math.min(H - 1, Math.max(0, py + dy)) * W + Math.min(W - 1, Math.max(0, qx + dx))) * 3 + c] : at(qx + dx, py + dy, c);
        const e = A[(py * W + qx) * 3 + c] - v;
        s += e * e;
      }
      return s;
    };
    let bx = 0, by = 0, bs = ssd(0, 0);
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { if (!dx && !dy) continue; const s = ssd(dx, dy); if (s < bs) { bs = s; bx = dx; by = dy; } }
    const [ix, iy] = [bx, by];
    for (let fy = -0.75; fy <= 0.75; fy += 0.25) for (let fx = -0.75; fx <= 0.75; fx += 0.25) {
      const dx = ix + fx, dy = iy + fy;
      if ((!fx && !fy) || Math.abs(dx) > d || Math.abs(dy) > d) continue;
      const s = ssd(dx, dy);
      if (s < bs) { bs = s; bx = dx; by = dy; }
    }
    for (let py = ty; py < ye; py++) for (let qx = tx; qx < xe; qx++) {
      let r = 0;
      for (let c = 0; c < 3; c++) r += Math.abs(A[(py * W + qx) * 3 + c] - at(qx + bx, py + by, c));
      if (r > T) ch[py * W + qx] = 1;
    }
  }
  let n = 0, l = 1e9, t = 1e9, r = -1, b = -1;
  for (let py = 0; py < H - 1; py++) for (let qx = 0; qx < W - 1; qx++) {
    const i = py * W + qx;
    if (!ch[i] || !ch[i + 1] || !ch[i + W] || !ch[i + W + 1]) continue;
    n++; l = Math.min(l, qx); r = Math.max(r, qx); t = Math.min(t, py); b = Math.max(b, py);
  }
  return { n, box: n ? `${l},${t} to ${r},${b}` : '' };
}

async function selftest() {
  // each case makes one fault in a copy of the mirror and expects the gate's verdict (the rows report() counts as
  // faults) to refuse it for that reason: its fault type and, where a case says, its size, its text and its frame; the
  // baseline copy, unchanged, must pass the same boards
  const BUDGET = 'ios-v1/iPhone v4 · Budget.dc.html';
  const CASES = [
    { name: 'page-not-a-container', board: 'app-v1/Web v4 · Assets and debts.dc.html', mutate: [/ container: page \/ inline-size;/, ''], expect: /clip-x|overlap|spill/ },
    { name: 'chips-clip-not-scroll', board: 'ios-v1/iPhone v4 · Check-ins.dc.html', mutate: [/(\.mp \.chips, \.mp \.sugg, \.mp \.chiprow, \.mp \.wsugg, \.mp\.pw \.wsugg \{ )overflow-x: auto;/, '$1overflow-x: hidden;'], expect: /clip-x/ },
    { name: 'answers-behind-fade', board: 'ios-v1/iPhone v4 · Check-ins.dc.html', mutate: [/\.mp \.ccard-acts\.rowx \{[^}]*\}\n\.mp \.ccard-acts\.rowx > \.cbtn \{[^}]*\}\n/, ''], expect: /clip-x/ },
    { name: 'track-own-mix', board: 'ios-v1/iPhone audit and activity.dc.html', mutate: [/\.mp :is\(\.mp-track:is\(\.meter, \.sr-t, \.pl-t, \.rl-t\)[^\n]*\n/, ''], expect: /track-not-token/ },
    { name: 'overlap-in-a-sheet', board: 'ios-v1/iPhone admin.dc.html', mutate: [/$/, '\n.mp .mp-hl.c-alert { margin-bottom: -12px; }\n'], expect: /^overlap$/ },
    { name: 'board-does-not-render', board: BUDGET, remove: 'ios-v1/support.js', expect: /did-not-render/ },
    { name: 'column-crushed', board: 'app-v1/Web v4 · Assets and debts.dc.html', mutate: [/ container: page \/ inline-size;/, ''], expect: /crushed/ },
    { name: 'chip-cut-with-no-ellipsis', board: 'app-v1/Wealth.dc.html', mutate: [/(\.mp \.rtx \.mp-chip \{ )flex: none; max-width: 100%; white-space: normal;/, '$1overflow: hidden; text-overflow: ellipsis;'], expect: /clip-x/ },
    { name: 'viewer-side-by-side-at-600', board: 'app-v1/Audit and files.dc.html', mutate: [/@container app \(max-width: 779px\) \{\n  \.mp \.ovl:has\(> \.viewer\)[\s\S]*?\n\}\n/, ''], expect: /overlap|crushed/, at: /^600x/ },
    // r1-9: a figure cut by an ellipsis is a fault in the verdict, not a note beside it
    { name: 'figure-cut-by-ellipsis', board: BUDGET, mutate: [/$/, '\n.mp .mp-hero .mp-sub.mp-hero-2 { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }\n'], expect: /^figure-truncated$/ },
    { name: 'value-never-resolved', board: BUDGET, file: BUDGET, mutate: [/\{\{ f\.pg\.hero\.over \}\}/, '{{ f.pg.hero.overx }}'], expect: /did-not-render/ },
    // round 2: a frame under CSS zoom (iPhone sign-in draws its phones at 0.8) is measured at the size it is shown
    { name: 'alert-past-a-zoomed-screen', board: 'ios-v1/iPhone sign-in.dc.html', mutate: [/$/, '\n.mp .sysalert { width: 360px; margin-left: -180px; }\n'], expect: /^(cut-at-edge|clip-x)$/, text: /Wants to Use/ },
    // round 2: a wrapper raised above a sheet's or a strip's glass is on that glass, and a chip row in the page is content
    { name: 'sheet-siblings-overlap', board: 'ios-v1/iPhone admin.dc.html', mutate: [/$/, '\n.mp .sheet.apple > .sheet-h { margin-bottom: -50px; }\n'], expect: /^overlap$/, text: /Sign in with Apple|MyPaisa/ },
    { name: 'strip-figure-on-label', board: BUDGET, mutate: [/$/, '\n.mp .strip-n { margin-top: -18px; }\n'], expect: /^overlap$/, text: /prices to/ },
    { name: 'page-chips-on-the-legend', board: 'app-v1/Web v4 · Projection.dc.html', mutate: [/$/, '\n.mp .mp-shell-main .chips { position: relative; top: -62px; }\n'], expect: /^overlap$/, text: /What (if|moves)/ },
    // round 2: a fault below the fold is seen: the salary history's chips, at the end of a long screen, crushed
    { name: 'crushed-below-the-fold', board: BUDGET, mutate: [/$/, '\n.mp .salm .mp-chip { max-width: 40px; white-space: normal; }\n'], expect: /^crushed$/, text: /a year since/, below: true },
    // round 2: the Stage Manager window is measured as its own frame from 600 to its drawn 700
    { name: 'stage-manager-tabs-at-600', board: 'ios-v1/iPad and foldable.dc.html', mutate: [/@container screen \(max-width: 639px\) \{ \.mp \.ttabs \.ttab \{ padding-left: 10px; padding-right: 10px; \} \}\n/, ''], expect: /^(cut-at-edge|clip-x)$/, at: /^600x/, label: /Stage Manager.*the window inside/ },
    // round 2: a chart's range band is the --mp-band token (the case names its own colour, so a band left unfixed on
    // today's boards does not answer for it)
    { name: 'band-not-the-token', board: 'app-v1/Web v4 · Projection.dc.html', file: 'app-v1/Web v4 · Projection.dc.html', mutate: [/<\/style>/, '.oncard .fband { fill: #3a7bd5 !important; }\n</style>'], expect: /^band-not-token$/, text: /rgb\(58, 123, 213\)/ },
    // round 2: text under a chart's painted note is text on text, not content under a bar: the Proof note as wide as round
    // 1 left it covers the y axis's labels
    { name: 'note-over-the-axis', board: 'app-v1/Forecast.dc.html', mutate: [/(\.mp \.shover > div \{ max-width: min\(300px, calc\(100% - )96px/, '$1'+'60px'], expect: /^covered$/, text: /−(10|20)%/ },
    // round 2: what a board anchors to the bottom of a clipping page runs out above the top as the page narrows, and is
    // measured: the Dashboard's in-place edit row, its field squeezed beside its figure at 320
    { name: 'edit-row-above-the-top', board: 'app-v1/Web v4 · Dashboard.dc.html', mutate: [/  \.mp \.edit > \.fx:has\(> \.efield\) \{ flex-wrap: wrap; \}\n  \.mp \.edit > \.fx > \.efield \{ flex: 1 1 100%; \}[^\n]*\n/g, ''], expect: /^(crushed|spill|overlap|clip-x)$/, at: /^320x/, text: /Correcting the value/ },
    // round 2: a documentation page with no frame fails when its template throws
    { name: 'frameless-page-throws', board: 'ds-v1/Foundations.dc.html', file: 'ds-v1/Foundations.dc.html', mutate: [/renderVals\(\) \{/, "renderVals() { throw new Error('selftest: the page failed to render');"], expect: /^did-not-render$/, text: /renderVals|could not render|reported an error/ },
  ];
  // the diff: a copy where a shared rule or a board moves a drawn frame must show it; the unchanged copy shows nothing
  const DIFFS = [
    { name: 'diff-sees-a-moved-frame', mutate: [/$/, '\n.mp-hero .mp-num-hero { font-size: 40px; }\n'], seen: true },
    { name: 'diff-quiet-when-unchanged', mutate: null, seen: false },
    { name: 'diff-sees-a-hairline-go', mutate: [/$/, '\n.mp .cth { border-bottom-color: transparent !important; }\n'], seen: true },
    { name: 'diff-sees-one-glyph', file: BUDGET, mutate: [/n: rt\('3 loans'\) \}, \{ l: 'SIP', a: M\(SIP\), n: rt\('1 fund'\) \}, \{ l: 'Spending', a: M\(ACT\)/, "n: rt('2 loans') }, { l: 'SIP', a: M(SIP), n: rt('1 fund') }, { l: 'Spending', a: M(ACT)"], seen: true },
    { name: 'diff-sees-a-2px-move', file: BUDGET, mutate: [/<div class="mp-foot mp-ink2">\{\{ f\.pg\.cats\.hint \}\}<\/div>/, '<div class="mp-foot mp-ink2" style="position:relative;top:2px">{{ f.pg.cats.hint }}</div>'], seen: true },
  ];
  const pick = opt('--case');   // --case <name> runs one case and its baseline
  const names = [...CASES, ...DIFFS].map((c) => c.name);
  if (pick !== undefined && !names.includes(pick)) { console.error(`board_fit: no selftest case ${pick} (the cases: ${names.join(', ')})`); process.exit(2); }
  const cases = CASES.filter((c) => !pick || c.name === pick), diffs = DIFFS.filter((c) => !pick || c.name === pick);
  const engines = enginesOf('chromium');
  const pw = playwright();
  let wrong = 0;
  const made = [];
  const clean = () => { for (const d of made.splice(0)) fs.rmSync(d, { recursive: true, force: true }); };
  // the copies go on every path: a pass, a failure, a mutation that does not apply, an interrupt or the time limit
  const onSignal = (sig) => { clean(); process.exit(sig === 'SIGINT' ? 130 : 143); };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGALRM']) process.on(sig, onSignal);
  // a mutation changes the three copies of tokens.css, or the one file a case names
  const copy = (mut, remove, file) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-fit-'));
    made.push(dir);
    fs.cpSync(path.join(ROOT, 'docs', 'design'), dir, { recursive: true });
    if (remove) fs.rmSync(path.join(dir, remove));
    if (mut) for (const p of file ? [file] : ['ds-v1/tokens.css', 'ios-v1/tokens.css', 'app-v1/tokens.css']) {
      const f = path.join(dir, p);
      const s = fs.readFileSync(f, 'utf8');
      if (!mut[0].test(s)) throw new Error(`selftest: the mutation does not apply to ${p}: ${mut[0]}`);
      fs.writeFileSync(f, s.replace(mut[0], mut[1]));
    }
    return dir;
  };
  try {
    for (const engine of engines) {
      const browser = await pw[engine].launch();
      try {
        const scanIn = async (dir, board) => { const { server, port } = await serve(dir); try { return await scanBoard(browser, port, board, engine); } finally { server.close(); } };
        const base = copy(null);
        const tasks = [];
        for (const b of [...new Set(cases.map((c) => c.board))]) tasks.push({ kind: 'baseline', board: b, dir: base });
        for (const c of cases) tasks.push({ kind: 'case', c, board: c.board, dir: copy(c.mutate, c.remove, c.file) });
        const results = new Array(tasks.length);
        const queue = tasks.map((t, k) => k);
        await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) { const k = queue.shift(); results[k] = await scanIn(tasks[k].dir, tasks[k].board); } }));
        // a case answers only with what its mutation made: a row the unchanged copy also shows (a fault on today's
        // boards that another change is fixing) does not count for it
        const key = (r) => [r.size, r.label, r.type, r.text, r.el].join('|');
        const baseRows = new Map();
        tasks.forEach((t, k) => { if (t.kind === 'baseline') baseRows.set(t.board, new Set(results[k].map(key))); });
        tasks.forEach((t, k) => {
          if (t.kind === 'baseline') {
            const v = report(results[k], false);
            console.log(`${v.length ? 'FAIL' : 'ok  '} selftest baseline ${t.board} (${engine}): ${v.length} faults${v.length ? ' (' + v.slice(0, 3).map((g) => g.type + ' ' + g.text.slice(0, 40)).join('; ') + ')' : ''}`);
            wrong += v.length ? 1 : 0;
            return;
          }
          const c = t.c;
          const fresh = results[k].filter((r) => !baseRows.get(t.board).has(key(r)));
          const v = report(fresh, false);   // the gate's own verdict: what it would fail on
          const hit = v.filter((g) => c.expect.test(g.type) && (!c.at || [...g.sizes].some((s) => c.at.test(s))) && (!c.text || c.text.test(g.text)) && (!c.label || [...g.labels].some((l) => c.label.test(l))));
          // below: the fault must be one a frame showed only once it was measured whole (grown or scrolled), at a size
          // where the frame as set did not show it
          const ok = c.below ? hit.length > 0 && fresh.some((r) => !r.allowed && r.part && c.expect.test(r.type) && (!c.text || c.text.test(r.text))) : hit.length > 0;
          console.log(`${ok ? 'ok  ' : 'FAIL'} selftest ${c.name} (${engine}): ${ok ? 'refused for the right reason (' + hit.length + ' faults, e.g. ' + hit[0].type + ' ' + JSON.stringify(hit[0].text.slice(0, 50)) + ' at ' + [...hit[0].sizes][0] + ')' : 'not refused (' + v.length + ' other faults' + (v.length ? ': ' + v.slice(0, 2).map((g) => g.type + ' ' + g.text.slice(0, 30)).join('; ') : '') + ')'}`);
          wrong += ok ? 0 : 1;
        });
      } finally { await browser.close(); }
      for (const c of diffs) {
        const rows = (await diffDirs(path.join(ROOT, 'docs', 'design'), copy(c.mutate, null, c.file), '', null, 'iPhone v4 · Budget', [engine], 'the mirror')).rows;
        const ok = c.seen ? rows.length > 0 : rows.length === 0;
        console.log(`${ok ? 'ok  ' : 'FAIL'} selftest ${c.name} (${engine}): ${rows.length} frames changed${rows.length ? ' (' + rows.slice(0, 2).map((r) => r.label + ' ' + r.what).join('; ') + ')' : ''}`);
        wrong += ok ? 0 : 1;
      }
    }
  } finally { clean(); }
  console.log(`board-fit selftest: ${wrong} cases wrong`);
  process.exit(wrong ? 1 : 0);
}

// the mirror's files a board loads (src and href, relative to the board), as paths in the mirror
function loads(design, board) {
  const html = fs.readFileSync(path.join(design, board), 'utf8');
  const out = new Set();
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"'#?{}:]+)["']/g)) out.add(path.posix.normalize(path.posix.join(path.posix.dirname(board), m[1].trim())));
  return [...out].filter((f) => fs.existsSync(path.join(design, f)));
}

// the boards of list redrawn since ref: the board's own file, or a file no other current board loads, differs between
// ref and the working tree. Returns board -> the file that changed. A file two boards load is shared (the guards).
function redrawnSince(ref, design, list, changedFiles) {
  const { execFileSync } = require('child_process');
  const changed = changedFiles || new Set(execFileSync('git', ['-C', ROOT, 'diff', '--no-renames', '--name-only', '-z', ref, '--', 'docs/design'], { maxBuffer: 1 << 28 })
    .toString().split('\0').filter(Boolean).map((f) => f.replace(/^docs\/design\//, '')));
  const uses = new Map();
  for (const b of boards(design, '')) for (const f of loads(design, b)) uses.set(f, (uses.get(f) || 0) + 1);
  const out = new Map();
  for (const b of list) {
    const c = [b, ...loads(design, b).filter((f) => (uses.get(f) || 0) <= 1)].find((f) => changed.has(f));
    if (c) out.set(b, c);
  }
  return out;
}

async function diff(ref, expectFile, out) {
  if (!ref) { console.error('board_fit: --diff needs a ref'); process.exit(2); }
  const design = path.join(ROOT, 'docs', 'design');
  if (!boards(design).length) { console.error(`board_fit: --only ${JSON.stringify(ONLY)} matches no board`); process.exit(2); }
  const engines = enginesOf('both');
  const expect = expectFile ? JSON.parse(fs.readFileSync(expectFile, 'utf8')) : { changes: [] };
  const since = opt('--since');
  if (args.includes('--since') && !since) { console.error('board_fit: --since needs a ref'); process.exit(2); }
  const skip = since ? redrawnSince(since, design, boards(design)) : new Map();
  for (const [b, f] of skip) console.log(`NOTE redrawn since ${since}, not compared: ${b} (${f} changed)`);
  if (since && boards(design).every((b) => skip.has(b))) { console.error(`board_fit: --since ${since} leaves no board to compare`); process.exit(2); }
  const { execFileSync } = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'board-diff-'));
  let res;
  try {
    execFileSync('tar', ['-x', '-C', tmp], { input: execFileSync('git', ['-C', ROOT, 'archive', ref, 'docs/design'], { maxBuffer: 1 << 30 }) });
    res = await diffDirs(path.join(tmp, 'docs', 'design'), design, expect.neutral || '', out, ONLY, engines, ref, new Set(skip.keys()));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const { rows, list } = res;
  const meant = (r) => (expect.changes || []).find((c) => c.board.split('|').some((b) => r.board.endsWith(b)) && new RegExp(c.frames).test(r.label));
  let n = 0;
  for (const r of rows) {
    const m = meant(r);
    console.log(`${m ? 'ok  ' : 'FAIL'} ${r.board} · ${r.engine} · ${r.label} · ${r.what}${m ? ' · ' + m.why.slice(0, 80) : ''}`);
    if (!m) n++;
  }
  for (const c of expect.changes || []) if (list.some((b) => c.board.split('|').some((x) => b.endsWith(x))) && !rows.some((r) => meant(r) === c)) { console.log(`FAIL a change the story meant no longer shows: ${c.board} · ${c.frames} · ${c.why.slice(0, 80)}`); n++; }
  console.log(`board-fit diff: ${list.length} boards against ${ref}, ${rows.length} frames changed, ${n} not meant`);
  process.exit(n ? 1 : 0);
}

// every frame of each current board in headDir against the same board in baseDir, at its drawn size and whole, at the
// board's own pixel ratio, in each engine; the boards in skip (those --since leaves out) are not compared
async function diffDirs(baseDir, headDir, neutral, out, only, engines, refName, skip = new Set()) {
  const pw = playwright();
  const inBase = new Set(boards(baseDir, only));
  const list = boards(headDir, only).filter((b) => !skip.has(b));
  const rows = [];
  if (!list.length) return { rows, list };
  if (out) fs.mkdirSync(out, { recursive: true });
  const A = await serve(baseDir), B = await serve(headDir);
  const open = async (ctx, port, board) => {
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/` + board.split('/').map(encodeURIComponent).join('/') + '?static=1', { waitUntil: 'networkidle', timeout: 60000 });
    if (!(await settle(p))) throw new Error('the board never settled');
    await p.evaluate(() => document.fonts && document.fonts.ready);
    // the prototype mounts its parts after the canvas settles: wait for its controls
    if (board.endsWith('Prototype v4.dc.html') || board.endsWith('Prototype v5.dc.html')) await p.waitForFunction(() => document.querySelectorAll('.pseg button').length && document.querySelectorAll('.psteps button').length, null, { timeout: 30000 });
    if (neutral) await p.addStyleTag({ content: neutral });
    await p.addScriptTag({ content: PAGE_JS });
    await p.waitForTimeout(400);
    return p;
  };
  // a step can scroll its chat after it shows: wait until every scroll position and the page's height hold still
  const steady = async (p) => {
    let last = '';
    for (let n = 0; n < 20; n++) {
      const now = await p.evaluate(() => document.documentElement.scrollHeight + ':' + [...document.querySelectorAll('*')].filter((e) => e.scrollTop || e.scrollLeft).map((e) => e.scrollTop + ',' + e.scrollLeft).join(';'));
      if (now === last) return;
      last = now;
      await p.waitForTimeout(250);
    }
  };
  // animations finished, so a pulse caught at another moment is not a change
  const shot = async (p, i) => { try { return await (await p.evaluateHandle((i) => window.__fit.frames()[i], i)).asElement().screenshot({ animations: 'disabled' }); } catch (e) { return null; } };
  const record = (engine, board, label, part, a, b, d) => {
    const at = part ? part + ': ' : '';
    if (!a || !b) { rows.push({ board, engine, label, what: at + 'could not be pictured' }); return; }
    if (a.equals(b)) return;
    let c;
    try { c = compare(decodePNG(a), decodePNG(b), d); } catch (e) { rows.push({ board, engine, label, what: at + 'could not be compared: ' + String(e).slice(0, 80) }); return; }
    if (c.n >= 0 && c.n < DIFF_MIN) return;
    rows.push({ board, engine, label, what: at + (c.n < 0 ? 'resized ' + c.size : `${c.n} pixels, in ${c.box}`) });
    if (out) { const k = (board + ' ' + engine + ' ' + label + (part ? ' ' + part : '')).replace(/[^\w·-]+/g, '_').slice(0, 170); fs.writeFileSync(path.join(out, k + '.base.png'), a); fs.writeFileSync(path.join(out, k + '.head.png'), b); }
  };
  // frame ia in pa and ib in pb, pictured as drawn, at every step of each vertical scroller (the same steps on both
  // sides), and grown to the taller side's content where the frame clips it
  const whole = async (engine, board, label, pa, ia, pb, ib, d) => {
    record(engine, board, label, '', await shot(pa, ia), await shot(pb, ib), d);
    const info = (i) => window.__fit.scrolls(i);
    const scrollTo = ([i, s, top]) => window.__fit.scrollTo(i, s, top);
    const sa = await pa.evaluate(info, ia), sb = await pb.evaluate(info, ib);
    for (let s = 0; s < Math.min(sa.length, sb.length); s++) {
      const max = Math.max(sa[s].max, sb[s].max), step = Math.max(40, Math.floor(Math.min(sa[s].client, sb[s].client) * 0.75));
      for (let top = 0; ; top = Math.min(max, top + step)) {
        if (Math.abs(top - sb[s].top) > 1) {
          await pa.evaluate(scrollTo, [ia, s, top]); await pb.evaluate(scrollTo, [ib, s, top]);
          record(engine, board, label, `scroller ${s + 1} at ${top}`, await shot(pa, ia), await shot(pb, ib), d);
        }
        if (top >= max) break;
      }
      await pa.evaluate(scrollTo, [ia, s, sa[s].top]); await pb.evaluate(scrollTo, [ib, s, sb[s].top]);
    }
    const ea = await pa.evaluate((i) => window.__fit.extent(i), ia), eb = await pb.evaluate((i) => window.__fit.extent(i), ib);
    if (!ea || !eb || !(ea.clips || eb.clips)) return;
    const H = Math.min(16000, Math.max(ea.need, eb.need));
    if (H <= Math.max(ea.h, eb.h) + 4) return;
    const grow = ([i, H]) => { const f = window.__fit.frames()[i]; const st = f.getAttribute('style'); for (const [k, v] of [['height', H + 'px'], ['max-height', 'none'], ['min-height', '0']]) f.style.setProperty(k, v, 'important'); return st; };
    const back = ([i, st]) => { const f = window.__fit.frames()[i]; if (st === null) f.removeAttribute('style'); else f.setAttribute('style', st); };
    const sta = await pa.evaluate(grow, [ia, H]), stb = await pb.evaluate(grow, [ib, H]);
    await pa.waitForTimeout(250); await pb.waitForTimeout(50);
    record(engine, board, label, `whole, grown to ${H}`, await shot(pa, ia), await shot(pb, ib), d);
    await pa.evaluate(back, [ia, sta]); await pb.evaluate(back, [ib, stb]);
  };
  try {
    for (const engine of engines) {
      const browser = await pw[engine].launch();
      try {
        const ctxs = {};
        for (const board of list) {
          if (!inBase.has(board)) { console.log(`NOTE new board, nothing to compare: ${board}`); continue; }
          const d = dprOf(board);
          const ctx = ctxs[d] || (ctxs[d] = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: d }));
          let pa = null, pb = null;
          try {
            pa = await open(ctx, A.port, board);
            pb = await open(ctx, B.port, board);
            if (board.endsWith('Prototype v4.dc.html')) {
              const click = (p, sel, text) => p.evaluate(([sel, text]) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); if (!b) throw new Error('no button ' + text); b.click(); }, [sel, text]);
              for (const door of Object.keys(PROTO)) for (const theme of ['Light', 'Dark']) {
                for (const p of [pa, pb]) { await click(p, '.pseg button', door); await click(p, '.pseg button', theme); }
                const steps = await pb.evaluate(() => document.querySelectorAll('.psteps button').length);
                for (let st = 0; st < steps; st++) {
                  for (const p of [pa, pb]) await p.evaluate((st) => document.querySelectorAll('.psteps button')[st].click(), st);
                  await pb.waitForTimeout(600);
                  await steady(pa); await steady(pb);
                  // the prototype scrolls a step's chat to a spot it measures 60 ms after the step, which lands a few pixels
                  // apart from run to run: the head is pictured at the base's scroll, so that does not count, and content
                  // that moved above the spot still shows
                  const tops = await pa.evaluate(() => [...document.querySelectorAll('.pframe [data-scroll]')].map((e) => e.scrollTop));
                  await pb.evaluate((tops) => document.querySelectorAll('.pframe [data-scroll]').forEach((e, i) => { if (tops[i] !== undefined) e.scrollTop = tops[i]; }), tops);
                  await whole(engine, board, `${door} · ${theme} · step ${st + 1}`, pa, 0, pb, 0, d);
                }
              }
            } else {
              const la = await pa.evaluate(() => window.__fit.frames().map((f) => window.__fit.label(f)));
              const lb = await pb.evaluate(() => window.__fit.frames().map((f) => window.__fit.label(f)));
              if (la.join('\n') !== lb.join('\n')) rows.push({ board, engine, label: '', what: `its frames differ: ${la.length} at ${refName}, ${lb.length} now` });
              // a frame is compared with the frame of the same label in the base (the n-th of that label with the n-th), so
              // a frame added or taken away does not shift every comparison after it
              const superseded = new RegExp(ALLOW.superseded.frames);
              const used = new Set();
              for (let j = 0; j < lb.length; j++) {
                if (superseded.test(lb[j])) continue;
                const i = la.findIndex((l, k) => l === lb[j] && !used.has(k));
                if (i < 0) continue;
                used.add(i);
                await whole(engine, board, lb[j], pa, i, pb, j, d);
              }
            }
          } catch (e) {
            // a board that cannot be pictured is a failure, never a skip
            rows.push({ board, engine, label: '', what: 'could not be pictured: ' + String(e).split('\n')[0].slice(0, 160) });
          } finally { if (pa) await pa.close(); if (pb) await pb.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally { A.server.close(); B.server.close(); }
  return { rows, list };
}

module.exports = { allowed, sizes, verdict, compare, decodePNG, loads, redrawnSince };   // for the fixed list's checks: require it to test one allowance or one size
if (require.main === module) (async () => {
  if (args.includes('--selftest')) return selftest();
  if (args.includes('--diff')) return diff(opt('--diff'), opt('--expect'), opt('--out'));
  const design = path.join(ROOT, 'docs', 'design');
  const list = boards(design);
  if (!list.length) { console.error(ONLY ? `board_fit: --only ${JSON.stringify(ONLY)} matches no board` : 'board_fit: no boards'); process.exit(2); }
  const engines = enginesOf('both');
  const rows = await run(design, list, engines);
  const n = report(rows).length;
  const stale = ALLOW.allow.filter((a) => !rows.some((r) => r.allowed && allowed(r) === a) && (!ONLY || a.board.split('|').some((b) => new RegExp(ONLY).test(b))));
  for (const a of stale) console.log(`NOTE allowance no longer matches anything: ${a.board} · ${a.types.join('/')} · ${a.text}`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  console.log(`board-fit: ${list.length} boards in ${engines.join(' and ')}, ${n} faults`);
  process.exit(n ? 1 : 0);
})().catch((e) => { console.error('board_fit:', e && e.stack || e); process.exit(2); });
