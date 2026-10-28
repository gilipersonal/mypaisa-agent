// Capture the record's pictures from the explainer pages: stills as PNG, motion as GIF (MA-257).
// usage: python3 scripts/confluence_record.py recipes [NAME ...] > want.json
//        node scripts/confluence_capture.js <repo root> <want.json> <out dir>
// Each recipe names its page (src), the element to capture (target), what to hide (the sticky top bar), what to click
// first (`click` as a person would, `press` by script, for a control the picture hides; `js` to restart an animation
// that played as the target scrolled into view), and how long a GIF runs: a fixed `record` in ms, or `until` a condition holds ("animations" waits for every
// finite animation inside the target to finish), within `max`, then `hold` ms on the last frame. Frames are lossless
// screenshots, timed as taken, and ffmpeg turns them into the GIF. A recipe whose target is missing, or whose `until`
// never holds, fails the run: nothing half-captured is written.
// Needs playwright-core and its Chromium (PLAYWRIGHT_CORE=<path> to use another install) and ffmpeg on the PATH.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const [root, wantPath, outDir] = process.argv.slice(2);
const want = JSON.parse(fs.readFileSync(wantPath, 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = +(process.env.CAPTURE_PORT || 8766);
const ANIMATIONS = `(() => { const el = document.querySelector(window.__capTarget); if (!el) return false;
  const live = el.getAnimations({ subtree: true }).filter((a) => { const t = a.effect && a.effect.getComputedTiming();
    return t && t.iterations !== Infinity && a.playState !== 'finished' && a.playState !== 'idle'; });
  return live.length === 0; })()`;

async function open(browser, r) {
  const [w, h] = r.viewport;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: 'light',
                                       reducedMotion: r.kind === 'png' ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:' + PORT + '/' + r.src, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  if (r.hide && r.hide.length) await page.addStyleTag({ content: r.hide.join(',') + '{visibility:hidden !important}' });
  await page.evaluate((t) => { window.__capTarget = t; }, r.target);
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  return page;
}

// Make the viewport tall enough for the whole target, then bring the target to the top and return its box.
async function frame(page, r) {
  const el = await page.$(r.target);
  if (!el) throw new Error('no element ' + r.target);
  const box0 = await el.boundingBox();
  if (!box0 || box0.width < 10 || box0.height < 10) throw new Error('element ' + r.target + ' is not visible');
  const need = Math.ceil(box0.height) + 48;
  if (need > r.viewport[1]) await page.setViewportSize({ width: r.viewport[0], height: need });
  await page.evaluate((t) => { const e = document.querySelector(t); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 24); }, r.target);
  await sleep(150);
  const b = await el.boundingBox();
  return { x: Math.max(0, Math.floor(b.x)), y: Math.max(0, Math.floor(b.y)), width: Math.ceil(b.width), height: Math.ceil(b.height) };
}

async function still(browser, r, out) {
  const page = await open(browser, r);
  try {
    const el = await page.$(r.target);
    if (!el) throw new Error('no element ' + r.target);
    await el.scrollIntoViewIfNeeded();
    await sleep(400);
    await el.screenshot({ path: out, animations: 'disabled', caret: 'hide' });
  } finally { await page.close(); }
}

async function gif(browser, r, out, tmp) {
  const page = await open(browser, r);
  try {
    const clip = await frame(page, r);
    for (const a of r.actions || []) {
      if (a.click) { const el = await page.$(a.click); if (!el) throw new Error('nothing to click at ' + a.click); await el.click(); }
      if (a.press) { const ok = await page.evaluate((q) => { const e = document.querySelector(q); if (e) e.click(); return !!e; }, a.press); if (!ok) throw new Error('nothing to press at ' + a.press); }
      if (a.js) await page.evaluate(a.js);
      if (a.wait) await sleep(a.wait);
    }
    const fps = r.fps || 8, step = 1000 / fps, t0 = Date.now();
    const shots = [];
    let done = false, doneAt = null;
    while (true) {
      const t = Date.now() - t0;
      const file = path.join(tmp, String(shots.length).padStart(5, '0') + '.png');
      await page.screenshot({ path: file, clip, animations: 'allow', caret: 'hide' });
      shots.push({ file, t });
      if (r.record && t >= r.record) break;
      if (r.until && !done && t >= (r.min || 0)) {
        done = await page.evaluate(r.until === 'animations' ? ANIMATIONS : r.until);
        if (done) doneAt = t;
      }
      if (done && t - doneAt >= (r.hold || 0)) break;
      if (r.until && t > r.max) throw new Error(`"${r.until}" did not hold within ${r.max} ms`);
      const wait = step - ((Date.now() - t0) - t);
      if (wait > 0) await sleep(wait);
    }
    if (r.record && r.hold) shots.push({ file: shots[shots.length - 1].file, t: shots[shots.length - 1].t + r.hold });
    // the concat list gives each frame the time until the next one; the last frame shows for its hold
    const list = shots.map((s, i) => `file '${s.file}'\nduration ${(((shots[i + 1] ? shots[i + 1].t : s.t + 100) - s.t) / 1000).toFixed(3)}`).join('\n')
      + `\nfile '${shots[shots.length - 1].file}'\n`;
    fs.writeFileSync(path.join(tmp, 'list.txt'), list);
    const width = Math.min(r.width || clip.width, clip.width);
    const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=255:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-vf', vf, '-loop', '0', out]);
    return shots.length;
  } finally { await page.close(); }
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const report = {};
  let bad = 0;
  try {
    for (const [name, r] of Object.entries(want)) {
      const out = path.join(outDir, r.out);
      const tmp = fs.mkdtempSync(path.join(outDir, '.frames-'));
      const t0 = Date.now();
      try {
        const frames = r.kind === 'gif' ? await gif(browser, r, out + '.part.gif', tmp) : (await still(browser, r, out + '.part.png'), 1);
        fs.renameSync(out + (r.kind === 'gif' ? '.part.gif' : '.part.png'), out);
        report[name] = { file: r.out, bytes: fs.statSync(out).size, frames, ms: Date.now() - t0 };
        console.log(`ok   ${name}: ${(report[name].bytes / 1024).toFixed(0)} KB, ${frames} frames, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      } catch (e) {
        bad++;
        console.log(`FAIL ${name}: ${String(e).slice(0, 240)}`);
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(report, null, 1));
  process.exit(bad ? 1 : 0);
})();
