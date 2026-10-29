// MA-290 · the walk gate. Serves prototype/dist on 127.0.0.1 and, in Chromium and WebKit, opens every registered
// page at every door (desktop 1440, phone web 390, iPhone, iPad at 1180 and at the width rule's edges 599/600/1132/
// 1133) in light and dark, then walks every presenter step. It fails on: a page that cannot be drawn, a console or
// page error, a request that leaves 127.0.0.1 (the demo runs offline), a missing icon or text font, and any fault the
// board-fit scanner (scripts/board_fit_page.js, MA-240) finds in the frame: clipping, spill, overlap, a cut box, an
// icon showing as its name. Known faults are allowed only by name in e2e/fit-allow.json, each with its reason.
//   node e2e/walk.mjs [--engine chromium|webkit] [--only <page>] [--quick]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = fileURLToPath(new URL('..', import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));
let pw;
for (const p of ['playwright-core', join(repo, 'scripts/node_modules/playwright-core'), '/Users/arundutta/projects/mypaisa-agent/scripts/node_modules/playwright-core']) {
  try { pw = require(p); break; } catch { /* next */ }
}
if (!pw) { console.error('walk: playwright-core not found (npm ci --prefix scripts)'); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const engines = arg('--engine') ? [arg('--engine')] : ['chromium', 'webkit'];
const only = arg('--only');
const quick = process.argv.includes('--quick');
const dist = join(here, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('walk: build first (npm run build)'); process.exit(1); }
const scanner = readFileSync(join(repo, 'scripts/board_fit_page.js'), 'utf8');
const allow = existsSync(join(here, 'e2e/fit-allow.json')) ? JSON.parse(readFileSync(join(here, 'e2e/fit-allow.json'), 'utf8')) : { allow: [] };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(dist, u === '/' ? 'index.html' : u);
  if (!f.startsWith(dist) || !existsSync(f) || statSync(f).isDirectory()) f = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/`;

/* a sample parameter for each detail page */
const SAMPLE = { asset: 'home', debt: 'hdfc', run: 'r-1235', file: 'f-barclay' };
const DOORS = quick
  ? [['web', 1440], ['iphone', 402]]
  : [['web', 1440], ['phone', 390], ['iphone', 402], ['ipad', 1180], ['ipad', 599], ['ipad', 600], ['ipad', 1132], ['ipad', 1133]];
const faults = [];
const fail = (where, what) => faults.push(`${where}: ${what}`);
const allowed = (where, f) => allow.allow.some((a) => new RegExp(a.where).test(where) && new RegExp(a.fault).test(f));

for (const engine of engines) {
  const browser = await pw[engine].launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: engine === 'webkit' ? 2 : 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  let errs = [];
  page.on('pageerror', (e) => errs.push('page error: ' + String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) errs.push('left 127.0.0.1: ' + u.slice(0, 120)); });
  await page.goto(base + '?static=1', { waitUntil: 'networkidle' });
  const pages = (await page.evaluate(() => window.__demo.pages())).filter((p) => !['chat'].includes(p) && (!only || p === only));
  const steps = await page.evaluate(() => window.__demo.steps());
  let n = 0;
  const visit = async (where, hash) => {
    errs = [];
    await page.goto(`${base}?static=1&n=${n++}#${hash}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: scanner });
    const r = await page.evaluate(() => {
      const t = document.body.innerText;
      const icon = [...document.fonts].some((f) => /Material Symbols/.test(f.family) && f.status === 'loaded');
      /* on a Mac the system font comes first in --mp-font, so Inter and Nunito are only needed elsewhere (as board_fit.js) */
      const text = /Mac|iPhone|iPad/.test(navigator.platform) || ['Inter', 'Nunito'].every((nm) => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === nm && f.status === 'loaded'));
      const s = window.__fit.scan(0); const st = window.__fit.steps(0);
      return { undrawn: /could not be drawn/.test(t), icon: !document.querySelector('.ms') || icon, text, scan: [s, ...st].filter(Boolean) };
    });
    if (r.undrawn) fail(where, 'the page could not be drawn');
    if (!r.icon) fail(where, 'the icon font did not load');
    if (!r.text) fail(where, 'a text font did not load');
    for (const e of errs) fail(where, e);
    const seen = new Set();
    for (const sc of r.scan) for (const [, list] of Object.entries(sc)) {
      if (!Array.isArray(list)) continue;
      for (const f of list) {
        if (f && f.type === 'under-layer') continue; // content scrolled under a bar, a sheet or a toast: the scroll edge (board_fit.js)
        const txt = typeof f === 'string' ? f : `${f.type}: ${f.text} @ ${String(f.el).slice(0, 120)}`;
        if (seen.has(txt) || allowed(where, txt)) continue;
        seen.add(txt); fail(where, txt);
      }
    }
  };
  for (const [door, w] of DOORS) {
    for (const theme of quick ? ['light'] : ['light', 'dark']) {
      for (const pg of pages) {
        for (const viewer of pg.startsWith('admin') || quick ? ['arun'] : ['arun', 'asha']) {
          const id = SAMPLE[pg] ? `&id=${SAMPLE[pg]}` : '';
          const where = `${engine} ${door}@${w} ${theme} ${viewer} ${pg}`;
          await visit(where, `door=${door}&w=${w}&theme=${theme}&viewer=${viewer}&clock=d3e&page=${pg}${id}`);
        }
      }
    }
  }
  /* the walk: every step reached by Continue, at the step's own door */
  if (steps.length && !only) {
    errs = [];
    await page.goto(`${base}?static=1&n=${n++}#walk=1&door=web`, { waitUntil: 'networkidle' });
    for (let i = 0; i < steps.length; i++) {
      await page.locator('[data-act="continue"]').click({ timeout: 5000 }).catch(() => fail(`${engine} walk step ${i + 1}`, 'no Continue'));
      await page.waitForTimeout(80);
    }
    for (const e of errs) fail(`${engine} walk`, e);
  }
  await browser.close();
}
server.close();
if (faults.length) {
  console.error(faults.slice(0, 200).join('\n'));
  console.error(`walk: ${faults.length} fault(s)`);
  process.exit(1);
}
console.log('walk: every page at every door, and every step of the walk, drew clean');
