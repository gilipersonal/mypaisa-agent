// Every board stays whole at every size a member can have (MA-240).
//
// Renders each current board in the design mirror the way Claude Design does (support.js, ?static=1 so motion lands at
// once), at the screen's own pixel ratio (3 for the iOS boards, 2 for the rest), and resizes every device and browser
// frame through the real sizes of its class: an iPhone from 320 (Display Zoom) to 440 and in landscape, an iPad or
// foldable window from 600 to 1366, and the web from 320 to 1920. At each size scripts/board_fit_page.js
// reports text clipped mid-word, text past its box, text on text, a box cut at the screen's edge, an icon shown as its
// name and a bar's track that is not the token; at a frame's drawn size, an axis label motion.js had to thin is a fault
// too. Prototype v4 is walked too: every door, theme and step.
//
//   node scripts/board_fit.js                    every current board and the prototype, in Chromium and WebKit
//   node scripts/board_fit.js --engine webkit --only "iPhone v4"   a subset (a pattern on the board's path), in one engine
//   node scripts/board_fit.js --selftest [--case <name>]   proves the gate refuses each fault it was built for
//   node scripts/board_fit.js --diff <ref> --expect <file> [--out <dir>]
//                                                 every frame at its drawn size against <ref>'s mirror, pixel by pixel
//
// --diff renders each current board from the working tree and from <ref> (git archive) in Chromium, and compares
// every frame, and every step of Prototype v4, at its drawn size. A frame that changed and that the expectation file
// does not name fails, and so does a named change that no longer shows, so a shared rule cannot move a drawn screen
// unseen. The file's "neutral" CSS is put on both sides first, so a token the story changed on purpose (a colour)
// does not hide a change in layout. --out keeps both pictures of each changed frame for a reviewer to look at.
//
// Needs playwright-core 1.63 with Chromium and WebKit, pinned in scripts/package.json: `npm ci --prefix scripts`, then
// `npx --prefix scripts playwright-core install chromium webkit` (PLAYWRIGHT_CORE=<path> overrides). It fails closed:
// a board that does not render, a board with no frame to measure (but the documentation pages allow.json names), a
// frame it cannot measure, a missing icon or text font and a template value that never resolved are failures.
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
  for (const m of [process.env.PLAYWRIGHT_CORE, 'playwright-core'].filter(Boolean)) {
    try { return require(m); } catch (e) { /* next */ }
  }
  console.error('board_fit: playwright-core not found: run `npm ci --prefix scripts`, then `npx --prefix scripts playwright-core install chromium webkit`');
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
  if (w <= 470 && h > w) return [[320, 568], [375, 667], [375, 812], [390, 844], [402, 874], [430, 932], [440, 956]];
  if (h <= 470 && w > h) return [[568, 320], [667, 375], [844, 390], [956, 440]];
  if (w < 1000 && h > w) return [[600, r(600 * h / w)], [650, r(650 * h / w)], [700, r(700 * h / w)], [744, 1133], [820, 1180], [900, r(900 * h / w)], [1024, 1366]];
  if (w >= 1000 && isDev) return [[1133, 744], [1180, 820], [1366, 1024]];
  if (w >= 1000) return [[600, 960], [768, 1024], [820, 1180], [900, 1200], [1024, r(1024 * h / w)], [1280, r(1280 * h / w)], [1440, r(1440 * h / w)], [1920, r(1920 * h / w)]];   // a tablet's window is tall
  return [[r(w * 0.85), h], [r(w * 1.15), h]];
}
const PROTO = { 'Desktop': [[768, 1024], [900, 700], [1024, 700], [1280, 800], [1440, 900], [1920, 1080]], 'Phone web': [[320, 568], [360, 740], [390, 844], [430, 932]], 'iPhone': [[320, 568], [375, 667], [402, 874], [440, 956]] };

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
function boards(design, only = ONLY) {
  const rec = JSON.parse(fs.readFileSync(path.join(design, 'claude-design.json'), 'utf8'));
  const dirs = { app: 'app-v1', ios: 'ios-v1', ds: 'ds-v1' };
  const skip = new RegExp(ALLOW.superseded.pattern);
  const out = [];
  for (const [p, d] of Object.entries(dirs)) for (const f of Object.keys(rec[p].files)) if (f.endsWith('.dc.html') && !skip.test(f)) out.push(d + '/' + f);
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

// the boards fetch React and their fonts over the network, so a board that did not render is tried once more before
// it fails: a fault in the board fails both times
async function scanBoard(browser, port, board, engine) {
  const rows = await scanBoardOnce(browser, port, board, engine);
  return rows.some((r) => r.type === 'did-not-render') ? scanBoardOnce(browser, port, board, engine) : rows;
}

async function scanBoardOnce(browser, port, board, engine) {
  const dpr = board.startsWith('ios-v1/') ? 3 : 2;
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const rows = [];
  const fail = (why) => rows.push({ board, engine, size: '-', label: '', type: 'did-not-render', text: why, el: '' });
  // a template value that never resolved renders as nothing, with no hole to see (MA-241's notes rendered blank)
  const holes = new Set();
  page.on('console', (m) => { const t = m.text(); if (/never resolved/.test(t)) holes.add(t.replace(/\s+/g, ' ').slice(0, 120)); });
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
    if (board.endsWith('Prototype v4.dc.html')) return rows.concat(await walkPrototype(page, board, engine));
    // Below 1024 the web shows the page or the chat, never both (docs/design/README.md, the web's size classes), so a
    // frame drawn with the page and the chat beside it is measured there on its page; a phone's chat, drawn alone, stays.
    await page.addStyleTag({ content: '[data-fit-view="page"] :is(.chat4, .chatcol) { display: none !important; }' });
    const specimens = ALLOW.drawnOnly.some((n) => board.endsWith(n.board));
    const meta = await page.evaluate((specimens) => window.__fit.frames().map((f, i) => { const r = f.getBoundingClientRect(); return { i, w: Math.round(r.width), h: Math.round(r.height), dev: f.classList.contains('dev'), clips: getComputedStyle(f).overflow !== 'visible', still: specimens && !f.classList.contains('dev'), both: !!f.querySelector('.mp-shell:not(.sh-c) .mp-shell-main') && [...f.querySelectorAll('.mp-shell:not(.sh-c) :is(.chat4, .chatcol)')].some((c) => getComputedStyle(c).display !== 'none') && getComputedStyle(f.querySelector('.mp-shell-main')).display !== 'none' }; }), specimens);
    if (!meta.length && !ALLOW.noFrames.some((n) => board.endsWith(n.board))) fail('no device or browser frame to measure');
    const superseded = new RegExp(ALLOW.superseded.frames);
    const take = (size, scans) => scans.forEach((s, k) => {
      if (!s) { rows.push({ board, engine, size, label: 'frame ' + k, type: 'did-not-render', text: 'a frame that could not be measured', el: '' }); return; }
      if (!superseded.test(s.label)) faultsOf(s).forEach((f) => rows.push({ board, engine, size, label: s.label, ...f }));
    });
    take('drawn', await page.evaluate((n) => Array.from({ length: n }, (_, i) => window.__fit.scan(i)), meta.length));
    // at its drawn size every axis fits, so a label thinned there is a collision drawn into the board
    for (const t of await page.evaluate((n) => Array.from({ length: n }, (_, i) => ({ label: window.__fit.label(window.__fit.frames()[i]), ts: window.__fit.thinned(i) })), meta.length)) {
      if (!superseded.test(t.label)) t.ts.forEach((x) => rows.push({ board, engine, size: 'drawn', label: t.label, type: 'label-thinned-as-drawn', text: x.text, el: x.el }));
    }
    const most = Math.max(0, ...meta.map((m) => sizes(m.w, m.h, m.dev).length));
    for (let k = 0; k < most; k++) {
      const plan = meta.map((m) => { const s = !m.still && sizes(m.w, m.h, m.dev)[k]; return s && { i: m.i, w: s[0], h: s[1], setH: m.clips, page: m.both && s[0] < 1024 }; }).filter(Boolean);
      await page.evaluate((plan) => {
        const fs = window.__fit.frames();
        for (const p of plan) {
          const f = fs[p.i];
          if (p.page) f.setAttribute('data-fit-view', 'page'); else f.removeAttribute('data-fit-view');
          for (const [k, v] of [['width', p.w + 'px'], ['max-width', 'none'], ['min-width', '0']]) f.style.setProperty(k, v, 'important');
          if (p.setH) for (const [k, v] of [['height', p.h + 'px'], ['max-height', 'none'], ['min-height', '0']]) f.style.setProperty(k, v, 'important');
        }
      }, plan);
      await page.waitForTimeout(350);
      for (const p of plan) { const sc = await page.evaluate((i) => window.__fit.scan(i), p.i); if (sc) take(`${p.w}x${p.h}`, [sc]); else rows.push({ board, engine, size: `${p.w}x${p.h}`, label: 'frame ' + p.i, type: 'did-not-render', text: 'a frame that could not be measured', el: '' }); }
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
          if (!w) (await page.evaluate(() => window.__fit.thinned(0))).forEach((x) => rows.push({ board, engine, size: 'drawn', label: `${door} · ${theme} · step ${s + 1}`, type: 'label-thinned-as-drawn', text: x.text, el: x.el }));
        }
        await page.evaluate((orig) => window.__fit.frames()[0].setAttribute('style', orig), orig);
      }
    }
  }
  return rows;
}

function allowed(row) {
  return ALLOW.allow.find((a) => a.board.split('|').some((b) => row.board.endsWith(b)) && a.types.includes(row.type) && new RegExp(a.text).test(row.text) && (!a.sizes || a.sizes.some((s) => row.size.startsWith(s))) && (!a.frames || new RegExp(a.frames).test(row.label)) && (!a.el || new RegExp(a.el).test(row.el)));
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

function report(rows) {
  const seen = new Map();
  for (const r of rows) {
    if (allowed(r)) { r.allowed = true; continue; }
    const k = [r.board, r.type, r.el, r.text.slice(0, 60)].join('|');
    const g = seen.get(k) || { ...r, sizes: new Set(), engines: new Set() };
    g.sizes.add(r.size); g.engines.add(r.engine); seen.set(k, g);
  }
  for (const g of seen.values()) console.log(`FAIL ${g.board} · ${g.type} · ${JSON.stringify(g.text.slice(0, 70))} · ${[...g.sizes].slice(0, 6).join(', ')} · ${[...g.engines].join('+')} · ${g.label} · ${g.el}`);
  return seen.size;
}

async function selftest() {
  // each case makes one fault in a copy of the mirror and expects the gate to refuse it for that reason; the baseline
  // copy, unchanged, must pass the same boards
  const CASES = [
    { name: 'page-not-a-container', board: 'app-v1/Web v4 · Assets and debts.dc.html', mutate: [/ container: page \/ inline-size;/, ''], expect: /clip-x|overlap|spill/ },
    { name: 'chips-clip-not-scroll', board: 'ios-v1/iPhone v4 · Check-ins.dc.html', mutate: [/(\.mp \.chips, \.mp \.sugg, \.mp \.chiprow, \.mp \.wsugg, \.mp\.pw \.wsugg \{ )overflow-x: auto;/, '$1overflow-x: hidden;'], expect: /clip-x/ },
    { name: 'answers-behind-fade', board: 'ios-v1/iPhone v4 · Check-ins.dc.html', mutate: [/\.mp \.ccard-acts\.rowx \{[^}]*\}\n\.mp \.ccard-acts\.rowx > \.cbtn \{[^}]*\}\n/, ''], expect: /clip-x/ },
    { name: 'track-own-mix', board: 'ios-v1/iPhone audit and activity.dc.html', mutate: [/\.mp :is\(\.mp-track:is\(\.meter, \.sr-t, \.pl-t, \.rl-t\), \.meter, \.ftrack, \.mwk\) \{[^}]*\}\n/, ''], expect: /track-not-token/ },
    { name: 'overlap-in-a-sheet', board: 'ios-v1/iPhone admin.dc.html', mutate: [/$/, '\n.mp .mp-hl.c-alert { margin-bottom: -12px; }\n'], expect: /^overlap$/ },
    { name: 'board-does-not-render', board: 'ios-v1/iPhone v4 · Budget.dc.html', remove: 'ios-v1/support.js', expect: /did-not-render/ },
    { name: 'column-crushed', board: 'app-v1/Web v4 · Assets and debts.dc.html', mutate: [/ container: page \/ inline-size;/, ''], expect: /crushed/ },
    { name: 'chip-cut-with-no-ellipsis', board: 'app-v1/Wealth.dc.html', mutate: [/(\.mp \.rtx \.mp-chip \{ )flex: none; max-width: 100%; white-space: normal;/, '$1overflow: hidden; text-overflow: ellipsis;'], expect: /clip-x/ },
    { name: 'viewer-side-by-side-at-600', board: 'app-v1/Audit and files.dc.html', mutate: [/@container app \(max-width: 719px\) \{\n  \.mp \.ovl:has\(> \.viewer\)[\s\S]*?\n\}\n/, ''], expect: /overlap|crushed/, at: /^600x/ },
    { name: 'figure-cut-by-ellipsis', board: 'ios-v1/iPhone v4 · Budget.dc.html', mutate: [/$/, '\n.mp .mp-hero .mp-sub.mp-hero-2 { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }\n'], expect: /figure-truncated/ },
    { name: 'value-never-resolved', board: 'ios-v1/iPhone v4 · Budget.dc.html', file: 'ios-v1/iPhone v4 · Budget.dc.html', mutate: [/\{\{ f\.pg\.hero\.over \}\}/, '{{ f.pg.hero.overx }}'], expect: /did-not-render/ },
  ];
  const pick = opt('--case');   // --case <name> runs one case and its baseline
  if (pick) CASES.splice(0, CASES.length, ...CASES.filter((c) => c.name === pick));
  if (!CASES.length && !/^diff-/.test(pick || '')) { console.error('board_fit: no selftest case ' + pick); process.exit(2); }
  const pw = playwright();
  let wrong = 0;
  const made = [];
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
    const rows = await scan(copy(c.mutate, c.remove, c.file), c.board);
    const ok = rows.some((r) => c.expect.test(r.type) && (!c.at || c.at.test(r.size)));   // at: the size the fault must show at
    console.log(`${ok ? 'ok  ' : 'FAIL'} selftest ${c.name}: ${ok ? 'refused for the right reason' : 'not refused (' + rows.length + ' other faults)'}`);
    wrong += ok ? 0 : 1;
  }
  // the diff: a copy where a shared rule moves a drawn frame must show it; the unchanged copy against itself shows nothing
  if (!pick || pick.startsWith('diff-')) {
    const sub = async (headDir) => (await diffDirs(base, headDir, '', null, 'iPhone v4 · Budget')).rows;
    if (!pick || pick === 'diff-sees-a-moved-frame') {
      const rows = await sub(copy([/$/, '\n.mp-hero .mp-num-hero { font-size: 40px; }\n']));
      console.log(`${rows.length ? 'ok  ' : 'FAIL'} selftest diff-sees-a-moved-frame: ${rows.length} frames changed`);
      wrong += rows.length ? 0 : 1;
    }
    if (!pick || pick === 'diff-quiet-when-unchanged') {
      const rows = await sub(copy(null));
      console.log(`${rows.length ? 'FAIL' : 'ok  '} selftest diff-quiet-when-unchanged: ${rows.length} frames changed${rows.length ? ' (' + rows.slice(0, 2).map((r) => r.label + ' ' + r.what).join('; ') + ')' : ''}`);
      wrong += rows.length ? 1 : 0;
    }
  }
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
  console.log(`board-fit selftest: ${wrong} cases wrong`);
  process.exit(wrong ? 1 : 0);
}

async function diff(ref, expectFile, out) {
  const { execFileSync } = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'board-diff-'));
  execFileSync('tar', ['-x', '-C', tmp], { input: execFileSync('git', ['-C', ROOT, 'archive', ref, 'docs/design'], { maxBuffer: 1 << 30 }) });
  const expect = expectFile ? JSON.parse(fs.readFileSync(expectFile, 'utf8')) : { changes: [] };
  const { rows, list } = await diffDirs(path.join(tmp, 'docs', 'design'), path.join(ROOT, 'docs', 'design'), expect.neutral || '', out);
  fs.rmSync(tmp, { recursive: true, force: true });
  const meant = (r) => (expect.changes || []).find((c) => c.board.split('|').some((b) => r.board.endsWith(b)) && new RegExp(c.frames).test(r.label));
  let n = 0;
  for (const r of rows) {
    const m = meant(r);
    console.log(`${m ? 'ok  ' : 'FAIL'} ${r.board} · ${r.label} · ${r.what}${m ? ' · ' + m.why.slice(0, 80) : ''}`);
    if (!m) n++;
  }
  for (const c of expect.changes || []) if (list.some((b) => c.board.split('|').some((x) => b.endsWith(x))) && !rows.some((r) => meant(r) === c)) { console.log(`FAIL a change the story meant no longer shows: ${c.board} · ${c.frames} · ${c.why.slice(0, 80)}`); n++; }
  console.log(`board-fit diff: ${list.length} boards against ${ref}, ${rows.length} frames changed, ${n} not meant`);
  process.exit(n ? 1 : 0);
}

// every frame of each current board in headDir against the same board in baseDir, at its drawn size, in Chromium
async function diffDirs(baseDir, headDir, neutral, out, only = ONLY) {
  const pw = playwright();
  const inBase = new Set(boards(baseDir, only));
  const list = boards(headDir, only);
  if (out) fs.mkdirSync(out, { recursive: true });
  const A = await serve(baseDir), B = await serve(headDir);
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const cmp = await ctx.newPage();
  const rows = [];
  const open = async (port, board) => {
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/` + board.split('/').map(encodeURIComponent).join('/') + '?static=1', { waitUntil: 'networkidle', timeout: 60000 });
    await settle(p);
    await p.evaluate(() => document.fonts && document.fonts.ready);
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
  // compared in the browser, so the gate needs no image library. Anti-aliasing that moves when a box becomes a size
  // container, and a row that lands on whole pixels once it scrolls, are not changes; text or a mark that moved,
  // appeared or went is. So both pictures are blurred over 3x3 pixels, a pixel differs when no pixel within one of it
  // in the other picture is within 60 (the three channels summed), and only a pixel whose whole 3x3 block differs
  // counts, and a frame changed when 16 or more do: a hidden label or a wrapped line is a hundred or more of them,
  // sub-pixel residue a few at most.
  const compare = (a, b) => cmp.evaluate(async ([a, b]) => {
    const img = async (s) => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height); };
    const x = await img(a), y = await img(b);
    if (x.width !== y.width || x.height !== y.height) return { n: -1, size: `${x.width}x${x.height} to ${y.width}x${y.height}` };
    const W = x.width, H = x.height;
    const blur = (im) => {
      const o = new Float32Array(W * H * 3);
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = Math.min(W - 1, Math.max(0, px + dx)), qy = Math.min(H - 1, Math.max(0, py + dy)); s += im.data[(qy * W + qx) * 4 + c]; }
        o[(py * W + px) * 3 + c] = s / 9;
      }
      return o;
    };
    const A = blur(x), B = blur(y);
    const far = (P, Q, px, py) => {   // no pixel of Q within one of (px, py) is within 60 of P's
      const i = (py * W + px) * 3;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const j = (qy * W + qx) * 3;
        if (Math.abs(P[i] - Q[j]) + Math.abs(P[i + 1] - Q[j + 1]) + Math.abs(P[i + 2] - Q[j + 2]) <= 60) return false;
      }
      return true;
    };
    const ch = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const i = (py * W + px) * 3;
      if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) <= 60) continue;
      if (far(A, B, px, py) || far(B, A, px, py)) ch[py * W + px] = 1;
    }
    let n = 0, l = 1e9, t = 1e9, r = -1, d = -1;
    for (let py = 1; py < H - 1; py++) for (let px = 1; px < W - 1; px++) {
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (!ch[(py + dy) * W + px + dx]) { all = false; break; }
      if (!all) continue;
      n++; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); d = Math.max(d, py);
    }
    return { n, share: n / (W * H), box: n ? `${l},${t} to ${r},${d}` : '' };
  }, [a.toString('base64'), b.toString('base64')]);
  const record = async (board, label, a, b) => {
    if (!a || !b) { rows.push({ board, label, what: 'could not be pictured' }); return; }
    if (a.equals(b)) return;
    const c = await compare(a, b);
    if (c.n >= 0 && c.n < 16) return;   // a speck: the smallest real change, a thinned year label, is over 50
    rows.push({ board, label, what: c.n < 0 ? 'resized ' + c.size : `${c.n} pixels, in ${c.box}` });
    if (out) { const k = (board + ' ' + label).replace(/[^\w·-]+/g, '_').slice(0, 150); fs.writeFileSync(path.join(out, k + '.base.png'), a); fs.writeFileSync(path.join(out, k + '.head.png'), b); }
  };
  for (const board of list) {
    if (!inBase.has(board)) { console.log(`NOTE new board, nothing to compare: ${board}`); continue; }
    const pa = await open(A.port, board), pb = await open(B.port, board);
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
          await record(board, `${door} · ${theme} · step ${st + 1}`, await shot(pa, 0), await shot(pb, 0));
        }
      }
    } else {
      const la = await pa.evaluate(() => window.__fit.frames().map((f) => window.__fit.label(f)));
      const lb = await pb.evaluate(() => window.__fit.frames().map((f) => window.__fit.label(f)));
      if (la.join('\n') !== lb.join('\n')) rows.push({ board, label: '', what: `its frames differ: ${la.length} at ${ref}, ${lb.length} now` });
      const superseded = new RegExp(ALLOW.superseded.frames);
      for (let i = 0; i < Math.min(la.length, lb.length); i++) if (la[i] === lb[i] && !superseded.test(lb[i])) await record(board, lb[i], await shot(pa, i), await shot(pb, i));
    }
    await pa.close(); await pb.close();
  }
  await browser.close(); A.server.close(); B.server.close();
  return { rows, list };
}

module.exports = { allowed, sizes };   // for the fixed list's checks: require it to test one allowance or one size
if (require.main === module) (async () => {
  if (args.includes('--selftest')) return selftest();
  if (args.includes('--diff')) return diff(opt('--diff'), opt('--expect'), opt('--out'));
  const design = path.join(ROOT, 'docs', 'design');
  const list = boards(design);
  if (!list.length) { console.error('board_fit: no boards'); process.exit(2); }
  const rows = await run(design, list, ENGINES);
  const n = report(rows);
  const stale = ALLOW.allow.filter((a) => !rows.some((r) => r.allowed && allowed(r) === a) && (!ONLY || a.board.split('|').some((b) => new RegExp(ONLY).test(b))));
  for (const a of stale) console.log(`NOTE allowance no longer matches anything: ${a.board} · ${a.types.join('/')} · ${a.text}`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  console.log(`board-fit: ${list.length} boards in ${ENGINES.join(' and ')}, ${n} faults`);
  process.exit(n ? 1 : 0);
})();
