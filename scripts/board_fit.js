// Every board stays whole at every size a member can have (MA-240).
//
// Renders each current board in the design mirror the way Claude Design does (support.js, ?static=1 so motion lands at
// once), at the screen's own pixel ratio (3 for the iOS boards, 2 for the rest), and resizes every device and browser
// frame through the real sizes of its class: an iPhone from 320 (Display Zoom) to 440 and in landscape, every iPad and
// foldable window, the web from 1024 to 1920 and its phone door from 320. At each size scripts/board_fit_page.js
// reports text clipped mid-word, text past its box, text on text, a box cut at the screen's edge, an icon shown as its
// name and a bar's track that is not the token. Prototype v4 is walked too: every door, theme and step.
//
//   node scripts/board_fit.js                    every current board and the prototype, in Chromium and WebKit
//   node scripts/board_fit.js --engine webkit --only "iPhone v4"   a subset, in one engine
//   node scripts/board_fit.js --selftest         proves the gate refuses each fault it was built for
//
// Needs Playwright with its browsers: PLAYWRIGHT_CORE=<path to playwright-core>, or playwright-core or playwright on
// the require path. It fails closed: a board that does not render, or a frame it cannot find, is a failure.
// What a fault means and why an allowance holds is in scripts/board_fit_allow.json; an allowance names its board, its
// fault and its reason, and an allowance that no longer matches anything is reported so the list stays true.
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGE_JS = fs.readFileSync(path.join(__dirname, 'board_fit_page.js'), 'utf8');
const ALLOW = JSON.parse(fs.readFileSync(path.join(__dirname, 'board_fit_allow.json'), 'utf8'));

function playwright() {
  for (const m of [process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean)) {
    try { return require(m); } catch (e) { /* next */ }
  }
  console.error('board_fit: Playwright not found; set PLAYWRIGHT_CORE to a playwright-core install');
  process.exit(2);
}

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ENGINES = { both: ['chromium', 'webkit'], chromium: ['chromium'], webkit: ['webkit'] }[opt('--engine', 'both')];
const JOBS = +opt('--jobs', Math.max(2, Math.min(6, os.cpus().length - 2)));
const ONLY = opt('--only', '');

// the sizes of each class, from the frame's drawn size
function sizes(w, h, isDev) {
  const r = Math.round;
  if (w <= 470 && h > w) return [[320, 568], [375, 667], [375, 812], [390, 844], [402, 874], [440, 956]];
  if (h <= 470 && w > h) return [[568, 320], [667, 375], [844, 390], [956, 440]];
  if (w < 1000 && h > w) return [[700, r(700 * h / w)], [744, 1133], [820, 1180], [900, r(900 * h / w)]];
  if (w >= 1000 && isDev) return [[1133, 744], [1180, 820], [1366, 1024]];
  if (w >= 1000) return [[1024, r(1024 * h / w)], [1280, r(1280 * h / w)], [1440, r(1440 * h / w)], [1920, r(1920 * h / w)]];
  return [[r(w * 0.85), h], [r(w * 1.15), h]];
}
const PROTO = { 'Desktop': [[1024, 700], [1280, 800], [1440, 900], [1920, 1080]], 'Phone web': [[320, 568], [360, 740], [390, 844], [430, 932]], 'iPhone': [[320, 568], [375, 667], [402, 874], [440, 956]] };

function serve(dir) {
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

// the current boards: every .dc.html in the mirror but the superseded record and the prototype's parts
function boards(design) {
  const rec = JSON.parse(fs.readFileSync(path.join(design, 'claude-design.json'), 'utf8'));
  const dirs = { app: 'app-v1', ios: 'ios-v1', ds: 'ds-v1' };
  const skip = new RegExp(ALLOW.superseded.pattern);
  const out = [];
  for (const [p, d] of Object.entries(dirs)) for (const f of Object.keys(rec[p].files)) if (f.endsWith('.dc.html') && !skip.test(f)) out.push(d + '/' + f);
  return out.filter((b) => !ONLY || b.includes(ONLY)).sort();
}

const tail = (el) => (el || '').replace(/\.sc-interp/g, '').split(' > ').slice(-2).join(' > ');
// overlaps that are the scroll edge under a glass bar, a pinned strip, the keyboard or the system's own lock screen
const CHROME = /\.lg\b|div\.nav\b|\.navc|lock-(date|time|top)|\.strip\b|gtext|gbtn|\.sb\b|\.ibar|\.kpad|button\.sg\b|span\.sg\b|\.sugg\b|\.wsugg\b|\.composer\b|\.wsend\b|\.wfield\b/;   // the chat's suggestion row and composer sit over the messages they scroll
const FIGURE = /[£₹$€]\s?\d|\d{1,3}(,\d{2,3})+/;

function faultsOf(scan) {
  const out = [];
  for (const x of scan.issues) {
    let t = x.type;
    if (t === 'under-glass' || t === 'overlap-overlay') continue;
    if (/\btg-|\btgh|\.tg\b/.test(x.el || '')) continue;   // Telegram's own chrome, drawn for context on the superseded record
    if (t === 'overlap' && CHROME.test(x.el || '')) continue;
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

async function scanBoard(browser, port, board, engine) {
  const dpr = board.startsWith('ios-v1/') ? 3 : 2;
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const rows = [];
  const fail = (why) => rows.push({ board, engine, size: '-', label: '', type: 'did-not-render', text: why, el: '' });
  try {
    await page.goto(`http://127.0.0.1:${port}/` + board.split('/').map(encodeURIComponent).join('/') + '?static=1', { waitUntil: 'networkidle', timeout: 60000 });
    if (!(await settle(page))) fail('the board never settled (template holes still showing)');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: PAGE_JS });
    if (board.endsWith('Prototype v4.dc.html')) return rows.concat(await walkPrototype(page, board, engine));
    const meta = await page.evaluate(() => window.__fit.frames().map((f, i) => { const r = f.getBoundingClientRect(); return { i, w: Math.round(r.width), h: Math.round(r.height), dev: f.classList.contains('dev'), clips: getComputedStyle(f).overflow !== 'visible' }; }));
    const superseded = new RegExp(ALLOW.superseded.frames);
    const take = (size, scans) => scans.forEach((s) => s && !superseded.test(s.label) && faultsOf(s).forEach((f) => rows.push({ board, engine, size, label: s.label, ...f })));
    take('drawn', await page.evaluate((n) => Array.from({ length: n }, (_, i) => window.__fit.scan(i)), meta.length));
    const most = Math.max(0, ...meta.map((m) => sizes(m.w, m.h, m.dev).length));
    for (let k = 0; k < most; k++) {
      const plan = meta.map((m) => { const s = sizes(m.w, m.h, m.dev)[k]; return s && { i: m.i, w: s[0], h: s[1], setH: m.clips }; }).filter(Boolean);
      await page.evaluate((plan) => {
        const fs = window.__fit.frames();
        for (const p of plan) {
          const f = fs[p.i];
          for (const [k, v] of [['width', p.w + 'px'], ['max-width', 'none'], ['min-width', '0']]) f.style.setProperty(k, v, 'important');
          if (p.setH) for (const [k, v] of [['height', p.h + 'px'], ['max-height', 'none'], ['min-height', '0']]) f.style.setProperty(k, v, 'important');
        }
      }, plan);
      await page.waitForTimeout(350);
      for (const p of plan) take(`${p.w}x${p.h}`, [await page.evaluate((i) => window.__fit.scan(i), p.i)]);
    }
  } catch (e) { fail(String(e).slice(0, 200)); }
  await ctx.close();
  return rows;
}

async function walkPrototype(page, board, engine) {
  const rows = [];
  const click = (sel, text) => page.evaluate(([sel, text]) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); if (!b) throw new Error('no button ' + text); b.click(); }, [sel, text]);
  for (const door of Object.keys(PROTO)) {
    await click('.pseg button', door);
    for (const theme of ['Light', 'Dark']) {
      await click('.pseg button', theme);
      const steps = await page.evaluate(() => document.querySelectorAll('.psteps button').length);
      for (let s = 0; s < steps; s++) {
        await page.evaluate((s) => document.querySelectorAll('.psteps button')[s].click(), s);
        await page.waitForTimeout(600);
        // the prototype sizes its frame with inline styles to fit the window: keep them, and put them back for the drawn size
        const orig = await page.evaluate(() => window.__fit.frames()[0].getAttribute('style') || '');
        for (const [w, h] of [[0, 0], ...PROTO[door]]) {
          await page.evaluate(([w, h, orig]) => {
            const f = window.__fit.frames()[0];
            f.setAttribute('style', orig);
            if (!w) return;
            for (const [k, v] of [['width', w + 'px'], ['height', h + 'px'], ['max-width', 'none'], ['min-width', '0'], ['transform', 'none']]) f.style.setProperty(k, v, 'important');
          }, [w, h, orig]);
          await page.waitForTimeout(250);
          let sc = await page.evaluate(() => window.__fit.scan(0));
          if (!sc) { await page.waitForTimeout(700); sc = await page.evaluate(() => window.__fit.scan(0)); }   // a step's own transition can still be fading the frame in
          if (!sc) { rows.push({ board, engine, size: w ? `${w}x${h}` : 'drawn', label: `${door} · ${theme} · step ${s + 1}`, type: 'did-not-render', text: 'no frame at ' + (await page.evaluate(() => document.querySelectorAll('.pframe').length)) + ' pframes', el: '' }); continue; }
          faultsOf(sc).forEach((f) => rows.push({ board, engine, size: w ? `${w}x${h}` : 'drawn', label: `${door} · ${theme} · step ${s + 1}`, ...f }));
        }
        await page.evaluate((orig) => window.__fit.frames()[0].setAttribute('style', orig), orig);
      }
    }
  }
  return rows;
}

function allowed(row) {
  return ALLOW.allow.find((a) => row.board.endsWith(a.board) && a.types.includes(row.type) && new RegExp(a.text).test(row.text) && (!a.sizes || a.sizes.some((s) => row.size.startsWith(s))) && (!a.frames || new RegExp(a.frames).test(row.label)));
}
// reported for a person to judge, never failing: a figure cut by a row's one-line ellipsis is copy to reorder, not a broken layout
const NOTES = new Set(['figure-truncated']);

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

function report(rows) {
  const seen = new Map();
  for (const r of rows) {
    if (allowed(r)) { r.allowed = true; continue; }
    const k = [r.board, r.type, r.el, r.text.slice(0, 60)].join('|');
    const g = seen.get(k) || { ...r, sizes: new Set(), engines: new Set() };
    g.sizes.add(r.size); g.engines.add(r.engine); seen.set(k, g);
  }
  let fails = 0;
  for (const g of seen.values()) {
    const note = NOTES.has(g.type);
    fails += note ? 0 : 1;
    console.log(`${note ? 'NOTE' : 'FAIL'} ${g.board} · ${g.type} · ${JSON.stringify(g.text.slice(0, 70))} · ${[...g.sizes].slice(0, 6).join(', ')} · ${[...g.engines].join('+')} · ${g.el}`);
  }
  return fails;
}

async function selftest() {
  // each case makes one fault in a copy of the mirror and expects the gate to refuse it for that reason; the baseline
  // copy, unchanged, must pass the same boards
  const CASES = [
    { name: 'page-not-a-container', board: 'app-v1/Web v4 · Assets and debts.dc.html', mutate: [/ container: page \/ inline-size;/, ''], expect: /clip-x|overlap|spill/ },
    { name: 'chips-clip-not-scroll', board: 'ios-v1/iPhone v4 · Check-ins.dc.html', mutate: [/(\.mp \.chips, \.mp \.sugg, \.mp \.chiprow, \.mp \.wsugg, \.mp\.pw \.wsugg \{ )overflow-x: auto;/, '$1overflow-x: hidden;'], expect: /clip-x/ },
    { name: 'answers-behind-fade', board: 'ios-v1/iPhone v4 · Check-ins.dc.html', mutate: [/\.mp \.ccard-acts\.rowx \{[^}]*\}\n\.mp \.ccard-acts\.rowx > \.cbtn \{[^}]*\}\n/, ''], expect: /clip-x/ },
    { name: 'track-own-mix', board: 'ios-v1/iPhone audit and activity.dc.html', mutate: [/\.mp \.mp-track:is\(\.meter, \.sr-t, \.pl-t, \.rl-t\) \{[^}]*\}\n/, ''], expect: /track-not-token/ },
  ];
  const pw = playwright();
  let wrong = 0;
  const copy = (mut) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-fit-'));
    fs.cpSync(path.join(ROOT, 'docs', 'design'), dir, { recursive: true });
    if (mut) for (const p of ['ds-v1', 'ios-v1', 'app-v1']) {
      const f = path.join(dir, p, 'tokens.css');
      const s = fs.readFileSync(f, 'utf8');
      if (!mut[0].test(s)) throw new Error(`selftest: the mutation does not apply to ${p}/tokens.css: ${mut[0]}`);
      fs.writeFileSync(f, s.replace(mut[0], mut[1]));
    }
    return dir;
  };
  const scan = async (dir, board) => {
    const { server, port } = await serve(dir);
    const browser = await pw.chromium.launch();
    const rows = (await scanBoard(browser, port, board, 'chromium')).filter((r) => !allowed(r));
    await browser.close(); server.close();
    return rows;
  };
  const base = copy(null);
  for (const b of [...new Set(CASES.map((c) => c.board))]) {
    const rows = await scan(base, b);
    console.log(`${rows.length ? 'FAIL' : 'ok  '} selftest baseline ${b}: ${rows.length} faults${rows.length ? ' (' + rows.slice(0, 3).map((r) => r.type + ' ' + r.text.slice(0, 30)).join('; ') + ')' : ''}`);
    wrong += rows.length ? 1 : 0;
  }
  for (const c of CASES) {
    const rows = await scan(copy(c.mutate), c.board);
    const ok = rows.some((r) => c.expect.test(r.type));
    console.log(`${ok ? 'ok  ' : 'FAIL'} selftest ${c.name}: ${ok ? 'refused for the right reason' : 'not refused (' + rows.length + ' other faults)'}`);
    wrong += ok ? 0 : 1;
  }
  console.log(`board-fit selftest: ${wrong} cases wrong`);
  process.exit(wrong ? 1 : 0);
}

(async () => {
  if (args.includes('--selftest')) return selftest();
  const design = path.join(ROOT, 'docs', 'design');
  const list = boards(design);
  if (!list.length) { console.error('board_fit: no boards'); process.exit(2); }
  const rows = await run(design, list, ENGINES);
  const n = report(rows);
  const stale = ALLOW.allow.filter((a) => !rows.some((r) => r.allowed && allowed(r) === a) && (!ONLY || a.board.includes(ONLY)));
  for (const a of stale) console.log(`NOTE allowance no longer matches anything: ${a.board} · ${a.types.join('/')} · ${a.text}`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  console.log(`board-fit: ${list.length} boards in ${ENGINES.join(' and ')}, ${n} faults`);
  process.exit(n ? 1 : 0);
})();
