// Prototype v5's gate (MA-291). Prototype v5 draws its screens from scripts, so the plan check's board readers
// (weekdays, tools, motion: scripts/plan_sync.py) never see its text; this walks it as a member would and reads
// what every frame renders. It serves docs/design, opens docs/design/prototype-v5/Prototype v5.dc.html as the board
// gate does (?static=1), walks every chapter and step at every door, light and dark, and fails on:
//   a script error; a page that did not draw; a page wider than its door;
//   a weekday that disagrees with its date (the boards are set in October 2026: a date with no year from January
//   to September is 2027); a tool named on a screen (a meta line, a run, a step) that ARCHITECTURE §8 does not
//   define; an em dash; Telegram or the Mini App (MA-278); and, with --priv, a £, ₹, $ or € figure left showing.
// It fails closed: no board, no chapters, no ARCHITECTURE tools list, or no browser is a failure.
//
//   node scripts/prototype_smoke.js                       every step, every door, light and dark
//   node scripts/prototype_smoke.js --priv                again with privacy on (light), flagging any figure left showing
//   node scripts/prototype_smoke.js --ch 17 --door ios    one chapter (its n), some doors
//   node scripts/prototype_smoke.js --shots <dir>         also a PNG of every frame it walks
//   node scripts/prototype_smoke.js --selftest            proves each text check bites, offline
// Needs playwright-core with Chromium (scripts/package.json; `npm ci --prefix scripts`).
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', 'docs', 'design');
const BOARD = 'prototype-v5/Prototype v5.dc.html';
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

// ---------- the text checks (pure: the selftest runs them on cases) ----------
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
function dateFaults(text) {
  const out = [];
  const re = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),? (\d{1,2})(?:st|nd|rd|th)? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?: (\d{4}))?/g;
  let m;
  while ((m = re.exec(text))) {
    // as plan_sync.py's date_errors: a date with no year fits 2026, or 2027 for January to September (a date ahead)
    const wd = LONG[m[1]] || m[1], d = +m[2], mo = MON[m[3]], years = m[4] ? [+m[4]] : (mo < 10 ? [2026, 2027] : [2026]);
    const fits = years.some((yr) => { const dt = new Date(Date.UTC(yr, mo - 1, d)); return dt.getUTCMonth() === mo - 1 && DAYS[dt.getUTCDay()] === wd; });
    if (!fits) out.push(m[0]);
  }
  return out;
}
function archTools() {
  const t = fs.readFileSync(path.join(__dirname, '..', 'ARCHITECTURE.md'), 'utf8');
  const m = /\*\*Tools:\*\*([\s\S]*?)\n\n/.exec(t);
  if (!m) throw new Error('ARCHITECTURE.md has no **Tools:** paragraph to read');
  const set = new Set((m[1].match(/`([a-z]+(?:_[a-z]+)+)/g) || []).map((x) => x.slice(1)));
  set.add('memory');
  return set;
}
// a tool name is a snake_case word in a place that names tools: a meta line, a run's tool calls or steps
function toolFaults(texts, tools) {
  const out = new Set();
  for (const t of texts) for (const w of t.match(/\b[a-z]+(?:_[a-z]+)+\b/g) || []) if (/^(get|list|draft|propose|run|query|web|log|ask|chart|extract|describe|rearrange|render|read)_/.test(w) && !tools.has(w)) out.add(w);
  return [...out];
}
function wordFaults(text) {
  const out = [];
  if (text.includes('—')) out.push('an em dash');
  if (/\bTelegram\b|\bMini App\b/.test(text)) out.push('Telegram or the Mini App');
  return out;
}

function selftest() {
  const cases = [
    ['a right weekday passes', dateFaults('Mon 26 Oct 09:41 and Sat 7 Nov and Thu 1 Apr 2027 and Friday 23 October').length === 0],
    ['a wrong weekday fails', dateFaults('Thu 23 Oct').length === 1],
    ['a January to September date fits 2026 or 2027', dateFaults('Thu 1 Apr').length === 0 && dateFaults('Wed 5 Aug').length === 0 && dateFaults('Tue 5 Aug').length === 1],
    ['an October to December date fits 2026 only', dateFaults('Mon 26 Oct').length === 0 && dateFaults('Tue 26 Oct').length === 1],
    ['a given year is used', dateFaults('Sat 10 Mar 2029').length === 0 && dateFaults('Fri 10 Mar 2029').length === 1],
    ['an impossible date fails', dateFaults('Sat 31 Nov').length === 1],
    ['a tool §8 defines passes', toolFaults(['get_portfolio · get_networth'], archTools()).length === 0],
    ['a tool §8 does not define fails', toolFaults(['render_chart', 'read_file'], archTools()).length === 2],
    ['other snake_case words are not tools', toolFaults(['engine.pause.exhaustion_min'], archTools()).length === 0],
    ['an em dash fails', wordFaults('a — b').length === 1],
    ['Telegram fails', wordFaults('sent to Telegram').length === 1 && wordFaults('the chat').length === 0],
  ];
  let bad = 0;
  for (const [name, ok] of cases) { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; }
  console.log(`prototype_smoke selftest: ${cases.length - bad} of ${cases.length} cases hold`);
  process.exit(bad ? 1 : 0);
}
if (args.includes('--selftest')) selftest();

// ---------- the walk ----------
function playwright() {
  for (const m of [process.env.PLAYWRIGHT_CORE, path.join(__dirname, 'node_modules', 'playwright-core')].filter(Boolean)) { try { return require(m); } catch (e) { } }
  console.error('prototype_smoke: playwright-core not found: run `npm ci --prefix scripts`, then `npx --prefix scripts playwright-core install chromium`');
  process.exit(1);
}
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

(async () => {
  if (!fs.existsSync(path.join(ROOT, BOARD))) { console.error('prototype_smoke: ' + BOARD + ' is missing'); process.exit(1); }
  const tools = archTools();
  const onlyCh = opt('--ch');
  const doors = (opt('--door') || 'desk,pweb,ios,ipad,fold').split(',');
  const shots = opt('--shots');
  const priv = args.includes('--priv');
  const themes = (opt('--theme') || (priv ? 'light' : 'light,dark')).split(',');
  const { chromium } = playwright();
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
  const faults = [];
  page.on('pageerror', (e) => faults.push('script error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') faults.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/` + BOARD.split('/').map(encodeURIComponent).join('/') + '?static=1', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.MP5 && document.querySelector('.pchaps'), null, { timeout: 30000 });
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const all = await page.evaluate(() => { const cs = window.MP5.chapters.slice().sort((a, b) => (a.order || 0) - (b.order || 0)); return window.MP5.allSteps().map((s) => Object.assign(s, { n: String(cs[s.ci].n) })); });
  if (!all.length) { console.error('prototype_smoke: the prototype has no chapters'); process.exit(1); }
  const walk = all.filter((s) => !onlyCh || s.n === onlyCh);
  if (!walk.length) { console.error('prototype_smoke: no chapter ' + onlyCh); process.exit(1); }
  let n = 0;
  for (const dr of doors) {
    for (const th of themes) {
      await page.evaluate(([dr, th, priv]) => { const M = window.MP5; M.act('door:' + dr); M.act('theme:' + th); if (M.state().priv !== priv) M.act('priv'); }, [dr, th, priv]);
      for (const s of walk) {
        const r = await page.evaluate(([ci, si]) => {
          window.MP5.go(ci, si);
          const fr = document.querySelector('.pframe');
          const out = { notDrawn: [], wide: [], money: [], text: '', tools: [] };
          fr.querySelectorAll('.pg-title').forEach((t) => { if (/Not drawn yet|failed to draw/.test(t.textContent)) out.notDrawn.push(t.textContent); });
          fr.querySelectorAll('.sysnote').forEach((t) => { const ic = t.querySelector('.ms'); if (ic && /^(construction|error)$/.test(ic.textContent.trim())) out.notDrawn.push(t.textContent.trim().slice(0, 120)); });
          fr.querySelectorAll('.pscroll').forEach((e) => { if (e.scrollWidth > e.clientWidth + 2) out.wide.push(e.getAttribute('data-scroll') + ' ' + e.scrollWidth + '>' + e.clientWidth); });
          if (window.MP5.state().priv) {
            const walker = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT);
            let t; while ((t = walker.nextNode())) { if (/[£₹$€]\s?\d/.test(t.nodeValue) && !t.parentElement.closest('.mny')) out.money.push(t.nodeValue.trim().slice(0, 60)); }
          }
          // the whole frame's text, and the guide line above it
          out.text = fr.innerText + '\n' + (document.querySelector('.pguide') || { innerText: '' }).innerText;
          // tools are read from the words a member sees: an icon's ligature name (.ms) is not a word on the screen
          const bare = fr.cloneNode(true); bare.querySelectorAll('.ms').forEach((e) => e.remove());
          out.tools = [bare.textContent];
          return out;
        }, [s.ci, s.si]);
        const where = `${dr} · ${th} · ch ${s.n} · ${s.id}`;
        r.notDrawn.forEach((x) => faults.push(`${where}: not drawn: ${x}`));
        r.wide.forEach((x) => faults.push(`${where}: wider than its door: ${x}`));
        r.money.slice(0, 3).forEach((x) => faults.push(`${where}: money not masked: ${x}`));
        dateFaults(r.text).forEach((x) => faults.push(`${s.id}: a wrong weekday: ${x}`));
        toolFaults(r.tools, tools).forEach((x) => faults.push(`${s.id}: a tool ARCHITECTURE §8 does not define: ${x}`));
        wordFaults(r.text).forEach((x) => faults.push(`${s.id}: ${x}`));
        if (shots) { const el = await page.$('.pframe'); await el.screenshot({ path: path.join(shots, `${s.n.padStart(2, '0')}-${s.id}-${dr}-${th}${priv ? '-priv' : ''}.png`) }); }
        n++;
      }
    }
  }
  await browser.close();
  server.close();
  const uniq = [...new Set(faults)];
  uniq.forEach((f) => console.log('FAULT ' + f));
  console.log(`prototype_smoke: ${n} frames walked (${walk.length} steps × ${doors.length} doors × ${themes.length} themes${priv ? ', privacy on' : ''}), ${uniq.length} faults`);
  process.exit(uniq.length ? 1 : 0);
})().catch((e) => { console.error('prototype_smoke: ' + (e && e.stack || e)); process.exit(1); });
