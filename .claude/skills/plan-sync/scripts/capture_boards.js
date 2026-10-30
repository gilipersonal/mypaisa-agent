// Capture every board the trace cites as a PNG, from the boards in docs/design, served on localhost (MA-228).
// usage: node capture_boards.js <repo root> <want.json> <out dir>
// want.json maps "<board dir>/<file>" to the board names to capture; the out dir gets one PNG per board and an
// index.json, which `python3 scripts/confluence_docs.py images <out dir> <previews dir>` composes into the previews.
// Needs playwright-core and its Chromium: `require('playwright-core')`, or PLAYWRIGHT_CORE=<path to playwright-core>.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const [root, wantPath, outDir] = process.argv.slice(2);
const want = JSON.parse(fs.readFileSync(wantPath, 'utf8'));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const slug = (s) => s.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 90);

(async () => {
  await new Promise((r) => server.listen(8765, '127.0.0.1', r));
  const browser = await chromium.launch();
  const index = {};
  for (const [rel, boards] of Object.entries(want)) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    const url = 'http://127.0.0.1:8765/' + rel.split('/').map(encodeURIComponent).join('/') + '?static=1';
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) { errors.push('goto: ' + String(e).slice(0, 160)); }
    // the canvas draws its boards from templates after load: wait until its height settles
    let last = -1;
    for (let n = 0; n < 20; n++) {
      await page.waitForTimeout(700);
      const h = await page.evaluate(() => document.body.scrollHeight + document.querySelectorAll('.dv-oname, .dv-cap, [data-screen-label]').length);
      if (h === last && n >= 4) break;
      last = h;
    }
    const dir = path.join(outDir, slug(rel.replace(/\.dc\.html$/, '')));
    fs.mkdirSync(dir, { recursive: true });
    for (const board of boards) {
      const key = rel + '::' + board;
      const found = await page.evaluate((title) => {
        const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().replace(/^[·\s]+|[·\s]+$/g, '');
        const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 40 && r.height > 40; };
        const mark = (el, how) => { document.querySelectorAll('[data-cap-me]').forEach((e) => e.removeAttribute('data-cap-me')); el.setAttribute('data-cap-me', '1'); return how; };
        const tries = [
          () => [...document.querySelectorAll('[data-screen-label]')].find((e) => norm(e.getAttribute('data-screen-label')) === title && !e.classList.contains('dv-turn') && vis(e)),
          () => { const n = [...document.querySelectorAll('.dv-oname')].find((e) => { const id = norm(e.previousElementSibling && e.previousElementSibling.textContent); return norm(e.textContent) === title || (id + ' · ' + norm(e.textContent)) === title || (id + ' ' + norm(e.textContent)) === title; }); return n && (n.closest('.dv-opt') || n.parentElement.parentElement); },
          () => { const n = [...document.querySelectorAll('.dv-cap')].find((e) => norm(e.textContent) === title); return n && n.parentElement; },
          () => { const n = [...document.querySelectorAll('.dv-sname')].find((e) => norm(e.textContent) === title); return n && (n.closest('section, .dv-sec, .dv-group') || n.parentElement.parentElement); },
          () => { const n = [...document.querySelectorAll('.dv-tname')].find((e) => { const id = norm(e.previousElementSibling && e.previousElementSibling.textContent); return norm(e.textContent) === title || (id + ' · ' + norm(e.textContent)) === title; }); return n && n.closest('.dv-turn'); },
          () => { const short = title.replace(/^(Browser|iPhone|iPad|Mini App|Telegram) · /, ''); const n = [...document.querySelectorAll('.bd-name')].find((e) => { const id = norm(e.previousElementSibling && e.previousElementSibling.textContent); return [title, short].includes(norm(e.textContent)) || [title, short].includes(id + ' · ' + norm(e.textContent)); }); return n && n.closest('.bd-h') && n.closest('.bd-h').parentElement; },
          () => { const n = [...document.querySelectorAll('[data-screen-label]')].find((e) => norm(e.getAttribute('data-screen-label')).startsWith(title + ' · ') && !e.classList.contains('dv-turn')); return n && n.parentElement; },
          () => { const n = [...document.querySelectorAll('.dv-idx a')].find((e) => norm(e.textContent) === title); const id = n && (n.getAttribute('href') || '').slice(1); const t = id && document.getElementById(id); return t; },
          () => { const n = [...document.querySelectorAll('p, span, div, h2, h3, h4, figcaption, a')].find((e) => e.children.length === 0 && norm(e.textContent) === title); return n && n.parentElement; },
          () => { const short = title.replace(/^(Browser|iPhone|iPad|Mini App|Telegram) · /, ''); const n = [...document.querySelectorAll('.dv-cap, .dv-oname, .dv-sname, [data-screen-label]')].find((e) => norm(e.getAttribute('data-screen-label') || e.textContent) === short); return n && (n.closest('.dv-opt') || (n.classList.contains('dv-cap') ? n.parentElement : n)); },
        ];
        for (let i = 0; i < tries.length; i++) {
          let el = null;
          try { el = tries[i](); } catch (e) { el = null; }
          if (el && vis(el)) return mark(el, i);
        }
        return null;
      }, board);
      if (found === null) { index[key] = { found: false }; continue; }
      const loc = page.locator('[data-cap-me="1"]');
      const box = await loc.boundingBox();
      const file = path.join(dir, slug(board) + '.png');
      try {
        if (box && box.height > 4200) {
          await loc.scrollIntoViewIfNeeded();
          const b2 = await loc.boundingBox();
          await page.setViewportSize({ width: Math.min(2400, Math.ceil(b2.width) + 40), height: 1000 });
          await loc.screenshot({ path: file, timeout: 30000, clip: undefined });
        } else {
          await loc.screenshot({ path: file, timeout: 30000 });
        }
        index[key] = { found: true, how: found, file: path.relative(outDir, file), w: box && Math.round(box.width), h: box && Math.round(box.height) };
      } catch (e) {
        index[key] = { found: false, error: String(e).slice(0, 160) };
      }
    }
    index[rel + '::__errors'] = errors;
    await page.close();
    process.stdout.write(rel + ' ' + boards.length + '\n');
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1));
  await browser.close();
  server.close();
})();
