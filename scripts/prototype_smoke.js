// Prototype v5's gate (MA-291, MA-300). Prototype v5 draws its screens from scripts, so the plan check's board readers
// (weekdays, tools, motion: scripts/plan_sync.py) never see its text; this walks it as a member would and reads
// what every frame renders. It serves docs/design, opens docs/design/prototype-v5/Prototype v5.dc.html as the board
// gate does (?static=1), walks every chapter and step at every door, light and dark, and fails on:
//   a script error; a page that did not draw; a page wider than its door;
//   a weekday that disagrees with its date (the boards are set in October 2026: a date with no year from January
//   to September is 2027); a tool named on a screen (a meta line, a run, a step) that ARCHITECTURE §8 does not
//   define; an em dash; Telegram or the Mini App (MA-278); and, with --priv, a £, ₹, $ or € figure left showing
//   in the text, in any attribute (aria-label, title) or in a chart's scrub data, at every door and chart style.
// MA-300 adds, each proven by a --selftest case that mutates a copy and expects the refusal:
//   an icon (.ms) read aloud (no aria-hidden); a control that is a <span> or <div> (data-go not on a button);
//   iOS chrome on a web door (Liquid Glass .lg / .lg-tint, the sheet's grab, the status bar, the island);
//   product text under 12px; a control under 44 by 44 to the finger (its ::after hit area counted);
//   a benchmark tick or pillar spine cut by its track; a sheet that is not a modal dialog, has no close control
//   that works, or does not close on its backdrop or Escape; Tab leaving an open dialog; focus lost when the
//   prototype redraws; a scrub left stuck after a finger lifts or the browser takes the gesture; an animation that
//   loops under Reduce Motion; a desktop scroll bar hidden; a route the More drawer (under 1024) cannot reach;
//   and, in the stylesheets, text under 12px, a hidden desktop scroll bar, an unguarded loop, a 3px side stripe
//   and 100vh with no 100dvh.
// It fails closed: no board, no chapters, no ARCHITECTURE tools list, or no browser is a failure.
//
//   node scripts/prototype_smoke.js                       every step, every door, light and dark, and the interactions
//   node scripts/prototype_smoke.js --priv                again with privacy on (light, every chart style), flagging any figure left showing
//   node scripts/prototype_smoke.js --ch 17 --door ios    one chapter (its n), some doors
//   node scripts/prototype_smoke.js --shots <dir>         also a PNG of every frame it walks
//   node scripts/prototype_smoke.js --selftest            proves each check bites: text cases offline, then each
//                                                         frame and interaction check on a mutated copy in Chromium
// Needs playwright-core with Chromium (scripts/package.json; `npm ci --prefix scripts`).
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', 'docs', 'design');
const BOARD = 'prototype-v5/Prototype v5.dc.html';
const PV5 = path.join(ROOT, 'prototype-v5');
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
// privacy: no figure in the text, an aria-label, any other attribute (a title, a tooltip) or a scrub's data
function privFaults(texts, ariaLabels, scrubAttrs, attrs) {
  const out = [];
  const moneyRe = /[£₹$€]\s?\d/;
  for (const t of texts || []) if (moneyRe.test(t)) out.push(t.trim().slice(0, 60));
  for (const a of ariaLabels || []) if (moneyRe.test(a)) out.push('aria-label: ' + a.trim().slice(0, 60));
  for (const s of scrubAttrs || []) if (s && (moneyRe.test(s) || /"v"\s*:\s*-?\d/.test(s))) out.push('data-scrub: ' + s.trim().slice(0, 60));
  for (const a of attrs || []) if (moneyRe.test(a)) out.push('attribute: ' + a.trim().slice(0, 60));
  return out;
}

// ---------- the stylesheet checks (pure; run on prototype-v5.css and the CSS each chapter file injects) ----------
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
// the ranges of each @media block (brace-matched), so a rule can be read with the query it sits under
function mediaRanges(css) {
  const out = [], re = /@media([^{]*)\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    for (; i < css.length && depth; i++) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; }
    out.push({ q: m[1].trim(), from: m.index, to: i });
  }
  return out;
}
const WEB_PANES = /\.(w-main|w-side|w-scroll|w-more-b|w-sheet|fsheet)\b/;
function cssFaults(raw, name) {
  const css = stripComments(raw), out = [], media = mediaRanges(css);
  const under = (pos) => media.filter((r) => pos > r.from && pos < r.to).map((r) => r.q).join(' ');
  // text under 12px: a font shorthand or a font-size (the control bar on the canvas too: one floor for every word)
  for (const m of css.matchAll(/font(?:-size)?\s*:\s*(?:[a-z0-9-]+\s+)*?(\d+(?:\.\d+)?)px/gi)) if (+m[1] < 12) out.push(`${name}: text under 12px: ${m[0].slice(0, 60)}`);
  // a hidden scroll bar on a desktop web pane (a phone's browser, .ph-web, and the app, .af, keep the platform's overlay bars)
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    const hides = /scrollbar-width\s*:\s*none/.test(body) || (/::-webkit-scrollbar\b/.test(sel) && /width\s*:\s*0/.test(body));
    if (!hides) continue;
    const parts = sel.split(',').map((x) => x.trim()).filter((x) => WEB_PANES.test(x) && !/\.ph-web|\.af\b/.test(x));
    if (parts.length) out.push(`${name}: a desktop scroll bar hidden: ${parts[0].slice(0, 60)}`);
  }
  // an animation that loops must sit under prefers-reduced-motion: no-preference (MA-300 P2-1)
  for (const m of css.matchAll(/animation(?:-iteration-count)?\s*:[^;}'"]*\binfinite\b/g)) if (!/prefers-reduced-motion\s*:\s*no-preference/.test(under(m.index))) out.push(`${name}: a loop with no Reduce Motion guard: ${m[0].slice(0, 60)}`);
  // a side stripe: an inset shadow 2px or more on one side only (a hairline, 1px, is a divider)
  for (const m of css.matchAll(/inset\s+-?(\d+(?:\.\d+)?)px\s+0(?:px)?\s+0(?:px)?\s/g)) if (+m[1] >= 2) out.push(`${name}: a side stripe: ${m[0].trim()}`);
  // the page's height on a phone is the dynamic viewport: 100vh needs a 100dvh beside it
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (/\b100vh\b/.test(m[2]) && !/\b100dvh\b/.test(m[2])) out.push(`${name}: 100vh with no 100dvh: ${m[1].trim().slice(0, 40)}`);
  return out;
}
function prototypeSources(over) {
  const files = fs.readdirSync(PV5).filter((f) => /\.(css|js)$/.test(f) && f !== 'prototype-v5-data.js').sort();
  if (!files.includes('prototype-v5.css')) throw new Error('prototype-v5.css is missing');
  return files.map((f) => [f, (over && over[f] != null) ? over[f] : fs.readFileSync(path.join(PV5, f), 'utf8')]);
}
function staticFaults(over) { const out = []; for (const [f, t] of prototypeSources(over)) out.push(...cssFaults(t, f)); return out; }
// the frame's measured hit areas: a control under 44 by 44 (its ::after counted) is a fault
function hitFaults(list) { return list.filter((c) => Math.max(c.w, c.aw || 0) < 43.5 || Math.max(c.h, c.ah || 0) < 43.5).map((c) => `${c.what} ${Math.round(Math.max(c.w, c.aw || 0))}x${Math.round(Math.max(c.h, c.ah || 0))}`); }

// ---------- the browser ----------
function playwright(soft) {
  for (const m of [process.env.PLAYWRIGHT_CORE, path.join(__dirname, 'node_modules', 'playwright-core')].filter(Boolean)) { try { return require(m); } catch (e) { } }
  if (soft) return null;
  console.error('prototype_smoke: playwright-core not found: run `npm ci --prefix scripts`, then `npx --prefix scripts playwright-core install chromium`');
  process.exit(1);
}
// serves docs/design; `over` maps a path under docs/design to the text served in its place (a mutated copy, in memory)
function serve(over) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const p = path.join(ROOT, rel);
    if (!p.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
    if (over && over[rel] != null) { res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); return res.end(over[rel]); }
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}
async function openBoard(browser, port, o) {
  o = o || {};
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1, reducedMotion: o.reducedMotion || 'no-preference' });
  const errs = [];
  page.on('pageerror', (e) => errs.push('script error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/` + BOARD.split('/').map(encodeURIComponent).join('/') + (o.live ? '' : '?static=1'), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.MP5 && window.MP5.allSteps && document.querySelector('.pchaps'), null, { timeout: 30000 });
  page.errs = errs;
  return page;
}

// ---------- the frame checks (run inside the page on the frame as drawn) ----------
// returns [kind, message] pairs; kinds: notDrawn wide a11y control webChrome smallText hit tick dialog priv
function frameChecks(o) {
  const fr = document.querySelector('.pframe'), M = window.MP5, out = [];
  const web = o.door === 'desk' || o.door === 'pweb';
  fr.querySelectorAll('.pg-title').forEach((t) => { if (/Not drawn yet|failed to draw/.test(t.textContent)) out.push(['notDrawn', t.textContent]); });
  fr.querySelectorAll('.sysnote').forEach((t) => { const ic = t.querySelector('.ms'); if (ic && /^(construction|error)$/.test(ic.textContent.trim())) out.push(['notDrawn', t.textContent.trim().slice(0, 120)]); });
  fr.querySelectorAll('.pscroll').forEach((e) => { if (e.scrollWidth > e.clientWidth + 2) out.push(['wide', e.getAttribute('data-scroll') + ' ' + e.scrollWidth + '>' + e.clientWidth]); });
  fr.querySelectorAll('.ms:not([aria-hidden="true"])').forEach((e) => out.push(['a11y', '.ms without aria-hidden: ' + e.textContent.trim().slice(0, 30)]));
  // a control is a button (or a link): a <span> or <div> that acts cannot be reached by the keyboard; the backdrop is the one exception
  fr.querySelectorAll('[data-go]').forEach((e) => { if (!/^(BUTTON|A)$/.test(e.tagName) && !e.classList.contains('dim')) out.push(['control', '<' + e.tagName.toLowerCase() + ' class="' + e.className + '"> acts (' + e.getAttribute('data-go') + ') but is not a button']); });
  if (web) fr.querySelectorAll('.lg, .lg-tint, .sheet-grab, .sbar, .island, .homebar').forEach((e) => out.push(['webChrome', String(e.className)]));
  // every sheet and drawer is a modal dialog with a close control that works
  fr.querySelectorAll('.sheet, .w-more').forEach((d) => {
    if (d.getAttribute('role') !== 'dialog' || d.getAttribute('aria-modal') !== 'true') out.push(['dialog', (d.className || '') + ' is not role=dialog aria-modal=true']);
    const keys = [...d.querySelectorAll('button[data-go]')].map((b) => [b.getAttribute('data-go'), (b.getAttribute('aria-label') || '') + ' ' + b.textContent]);
    const closers = keys.filter((k) => /close|cancel|done|not now|dismiss/i.test(k[1]));
    if (!closers.length) out.push(['dialog', (d.className || '') + ' has no close control']);
    closers.forEach((k) => { if (!M.handles(k[0])) out.push(['dialog', 'close control ' + k[0] + ' does nothing on this step']); });
    const dim = d.previousElementSibling;
    if (!dim || !dim.classList.contains('dim') || !M.handles(dim.getAttribute('data-go'))) out.push(['dialog', (d.className || '') + ': its backdrop does not close it']);
  });
  if (o.measure) {
    // text a member reads: 12px at least (an icon's glyph is not text)
    fr.querySelectorAll('*').forEach((e) => {
      if (e.classList.contains('ms') || !e.getClientRects().length) return;
      let has = false; for (const c of e.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) has = true;
      if (!has) return;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f < 12) out.push(['smallText', f + 'px .' + String(e.className || e.tagName).split(' ')[0] + ': ' + e.textContent.trim().slice(0, 24)]);
    });
    // a control's size to the finger, in the frame's own pixels (the frame is scaled to fit): its box or its ::after
    const sc = parseFloat((fr.style.transform.match(/scale\(([\d.]+)/) || [0, 1])[1]) || 1;
    const hits = [];
    fr.querySelectorAll('button, a[href], [tabindex="0"]').forEach((e) => {
      const ring = e.classList.contains('pnext'); if (ring) e.classList.remove('pnext');   /* the walk-through's ring is not the product's */
      const r = e.getBoundingClientRect();
      if (r.width && r.height) {
        const c = { what: e.tagName + '.' + String(e.className).split(' ')[0] + ' (' + (e.getAttribute('data-go') || '') + ')', w: r.width / sc, h: r.height / sc };
        const a = getComputedStyle(e, '::after');
        if (a.content && a.content !== 'none' && a.position === 'absolute') { c.aw = parseFloat(a.width) || 0; c.ah = parseFloat(a.height) || 0; }
        hits.push(c);
      }
      if (ring) e.classList.add('pnext');
    });
    out.push(['hits', hits]);
  }
  // a tick or spine that stands proud of its track is never cut by it
  fr.querySelectorAll('.mp5-bartick, .mp5-pil-a b').forEach((t) => {
    const tr = t.getBoundingClientRect(); if (!tr.height) return;
    for (let p = t.parentElement; p && p !== fr; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      if (p.classList.contains('pscroll') || /auto|scroll/.test(cs.overflowY)) break;
      const pr = p.getBoundingClientRect();
      if (tr.top < pr.top - 0.5 || tr.bottom > pr.bottom + 0.5 || tr.left < pr.left - 0.5 || tr.right > pr.right + 0.5) out.push(['tick', t.className + ' cut by .' + String(p.className).split(' ')[0]]);
      break;
    }
  });
  if (M.state().priv) {
    const texts = [], aria = [], scrub = [], attrs = [];
    const w = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) texts.push(t.nodeValue);
    fr.querySelectorAll('*').forEach((e) => { for (const a of e.attributes) { if (a.name === 'aria-label') aria.push(a.value); else if (a.name === 'data-scrub') scrub.push(a.value); else if (a.name !== 'style' && a.name !== 'class') attrs.push(a.value); } });
    out.push(['privRaw', { texts, aria, scrub, attrs }]);
  }
  return out;
}
// turns the raw pairs into fault lines (hits and privacy are judged here, by the pure functions the selftest proves)
function judgeFrame(raw, where) {
  const out = [];
  for (const [k, v] of raw) {
    if (k === 'hits') hitFaults(v).slice(0, 3).forEach((x) => out.push(`${where}: a control under 44 by 44: ${x}`));
    else if (k === 'privRaw') privFaults(v.texts, v.aria, v.scrub, v.attrs).slice(0, 3).forEach((x) => out.push(`${where}: money not masked: ${x}`));
    else out.push(`${where}: ${{ notDrawn: 'not drawn', wide: 'wider than its door', a11y: 'icon', control: 'not a button', webChrome: 'iOS chrome on web', smallText: 'text under 12px', tick: 'tick cut by its track', dialog: 'dialog' }[k] || k}: ${v}`);
  }
  return out;
}
async function goStep(page, id, o) {
  return page.evaluate(([id, o]) => {
    const M = window.MP5;
    M.act('door:' + (o.door || 'desk')); M.act('theme:' + (o.theme || 'light')); M.act('charts:' + (o.charts || 'a'));
    const s = M.allSteps().find((x) => x.id === id); if (!s) return false;
    M.go(s.ci, s.si);
    if (!!M.state().priv !== !!o.priv) M.act('priv');
    if (o.viewer && M.state().viewer !== o.viewer) M.act('viewer:' + o.viewer);
    return true;
  }, [id, o]);
}
async function checkStep(page, id, o) {
  if (!(await goStep(page, id, o))) return [`no step ${id}`];
  return judgeFrame(await page.evaluate(frameChecks, { door: o.door || 'desk', measure: o.measure !== false }), `${o.door || 'desk'} · ${id}`);
}

// ---------- the interaction checks ----------
// every sheet a step can open, at a door: it is a dialog, its close control, backdrop and Escape close it
async function sheetChecks(page, door) {
  return page.evaluate((door) => {
    const M = window.MP5, out = [];
    M.act('door:' + door); M.act('theme:light'); if (M.state().priv) M.act('priv');
    const cs = M.chapters.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const has = () => !!document.querySelector('.pframe .sheet');
    const sig = () => { const st = M.state(); return st.ci + ':' + st.si; };
    for (const s of M.allSteps()) {
      const step = cs[s.ci].steps[s.si];
      if (!step.sheet) continue;
      const openers = [null].concat(Object.keys(step.on || {}));
      for (const k of openers) {
        M.go(s.ci, s.si); if (k) { if (has()) break; M.act(k); }
        if (!has() || sig() !== s.ci + ':' + s.si) continue;
        const ways = [['its close control', () => { const d = document.querySelector('.pframe .sheet'); const b = [...d.querySelectorAll('button[data-go]')].find((x) => /close|cancel|done|not now|dismiss/i.test((x.getAttribute('aria-label') || '') + ' ' + x.textContent)); if (!b) return false; b.click(); return true; }],
          ['its backdrop', () => { const d = document.querySelector('.pframe .sheet').previousElementSibling; if (!d || !d.classList.contains('dim')) return false; d.click(); return true; }],
          ['Escape', () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true; }]];
        for (const [name, fn] of ways) {
          M.go(s.ci, s.si); if (k) M.act(k);
          const before = sig();
          const toastBefore = document.querySelector('.pframe .mp-toast');
          if (!fn()) { out.push(`${door} · ${s.id}${k ? ' (' + k + ')' : ''}: the sheet has no ${name}`); continue; }
          const toast = document.querySelector('.pframe .mp-toast');
          if ((has() && sig() === before) || (toast && !toastBefore && /Not part of this walk-through/.test(toast.textContent))) out.push(`${door} · ${s.id}${k ? ' (' + k + ')' : ''}: ${name} does not close the sheet`);
        }
      }
    }
    return out;
  }, door);
}
// the More drawer under 1024: every route a member has is reachable, and each draws
async function moreChecks(page, door, width, viewer) {
  return page.evaluate(([door, width, viewer]) => {
    const M = window.MP5, out = [], D = M.DOORS.find((d) => d.id === door), w0 = D.w;
    D.w = width;
    try {
      M.act('door:' + door); M.act('theme:light'); if (M.state().priv) M.act('priv');
      const st0 = M.allSteps().find((x) => x.id === 'p1-answer'); M.go(st0.ci, st0.si); if (M.state().viewer !== viewer) M.act('viewer:' + viewer);
      const routes = ['search', 'home', 'assets', 'debts', 'budget', 'projection', 'plans', 'reports', 'holdings', 'overlap', 'track', 'news', 'activity', 'audit', 'files', 'you'].concat(viewer === 'arun' ? ['admin', 'team'] : []);
      const tab = document.querySelector('.pframe .w-tabs [data-go="tab:more"]');
      if (!tab || !tab.offsetParent) { out.push(`${door} at ${width}: no More tab`); return out; }
      for (const r of routes) {
        M.act('tab:more');
        const more = document.querySelector('.pframe .w-more[role="dialog"]');
        if (!more || !more.offsetParent) { out.push(`${door} at ${width}: the More drawer did not open`); break; }
        const b = more.querySelector(`[data-go="nav:${r}"]`);
        if (!b) { out.push(`${door} at ${width} (${viewer}): the More drawer cannot reach ${r}`); M.act('more:close'); continue; }
        b.click();
        const t = document.querySelector('.pframe .pg-title');
        if (!t || /Not drawn yet|failed to draw/.test(t.textContent)) out.push(`${door} at ${width}: ${r} from the More drawer did not draw`);
        if (document.querySelector('.pframe .w-more')) out.push(`${door} at ${width}: the More drawer stayed open after ${r}`);
      }
      if (viewer !== 'arun') { M.act('tab:more'); if (document.querySelector('.pframe .w-more [data-go="nav:admin"]')) out.push(`${door} at ${width}: Asha sees Admin center`); M.act('more:close'); }
    } finally { D.w = w0; M.act('door:' + door); }
    return out;
  }, [door, width, viewer]);
}
// focus: kept when the prototype redraws; a dialog takes it, keeps Tab inside, and gives it back when it closes
async function focusChecks(page) {
  const out = [];
  await goStep(page, 'p1-answer', { door: 'ipad' });
  await page.focus('.pframe .ip-nav [data-go="priv"]');
  await page.keyboard.press('Enter');
  const kept = await page.evaluate(() => { const a = document.activeElement; return a && a.closest('.pframe') && a.getAttribute('data-go'); });
  if (kept !== 'priv') out.push('focus lost when the prototype redraws: after Privacy it is on ' + (kept || 'the page body'));
  await page.evaluate(() => { if (window.MP5.state().priv) window.MP5.act('priv'); });
  await goStep(page, 'p1-answer', { door: 'pweb' });
  await page.focus('.pframe .w-tabs [data-go="tab:more"]');
  await page.keyboard.press('Enter');
  const inDlg = await page.evaluate(() => { const d = document.querySelector('.pframe .w-more'); return !!(d && d.contains(document.activeElement)); });
  if (!inDlg) out.push('the More drawer opened without taking focus');
  const n = await page.evaluate(() => document.querySelectorAll('.pframe .w-more button').length);
  let left = false;
  for (let i = 0; i < n + 2; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => { const d = document.querySelector('.pframe .w-more'); return !!(d && d.contains(document.activeElement)); }))) { left = true; break; } }
  if (left) out.push('Tab left the open More drawer');
  await page.keyboard.press('Shift+Tab');
  if (!(await page.evaluate(() => { const d = document.querySelector('.pframe .w-more'); return !!(d && d.contains(document.activeElement)); }))) out.push('Shift+Tab left the open More drawer');
  await page.keyboard.press('Escape');
  const back = await page.evaluate(() => { const a = document.activeElement; return !document.querySelector('.pframe .w-more') && a && a.getAttribute('data-go'); });
  if (back !== 'tab:more') out.push('focus did not go back to More when the drawer closed (' + back + ')');
  // a sheet opened by the keyboard holds Tab too
  await goStep(page, 'p19-check', { door: 'desk' });
  await page.focus('.pframe .sheet button');
  const m = await page.evaluate(() => document.querySelectorAll('.pframe .sheet button').length);
  for (let i = 0; i < m + 2; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => !!document.activeElement.closest('.pframe .sheet')))) { out.push('Tab left an open sheet'); break; } }
  return out;
}
// a scrub (live page, pointer events on): it follows the pointer, reads by keyboard, and never sticks
async function scrubChecks(page) {
  const out = [];
  await goStep(page, 'p7-fan', { door: 'desk' });
  const box = await page.$('.pframe [data-scrub]');
  if (!box) return ['no [data-scrub] chart on p7-fan'];
  const on = () => page.evaluate(() => !!document.querySelector('.pframe [data-scrub] .mp5-scrub.on'));
  const fire = (type, kind) => page.evaluate(([type, kind]) => { const b = document.querySelector('.pframe [data-scrub]'), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: kind, clientX: r.left + r.width * 0.6, clientY: r.top + r.height / 2 })); }, [type, kind]);
  await fire('pointerdown', 'touch'); if (!(await on())) out.push('a touch did not open the scrub');
  await fire('pointerup', 'touch'); if (await on()) out.push('the scrub stuck after the finger lifted (pointerup)');
  await fire('pointerdown', 'touch'); await fire('pointercancel', 'touch'); if (await on()) out.push('the scrub stuck after the browser took the gesture (pointercancel)');
  await fire('pointermove', 'mouse');
  const moved = await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(!!document.querySelector('.pframe [data-scrub] .mp5-scrub.on'))))));
  if (!moved) out.push('the scrub did not follow the pointer within a frame');
  await page.evaluate(() => window.MP5.scrubEnd && window.MP5.scrubEnd());
  await box.focus();
  for (const [k, want] of [['ArrowRight', true], ['Escape', false], ['End', true], ['Home', true], ['ArrowLeft', true], ['Escape', false]]) {
    await page.keyboard.press(k);
    if ((await on()) !== want) out.push(`${k} did not ${want ? 'open or move' : 'close'} the scrub`);
  }
  return out;
}
// Reduce Motion: nothing in the prototype loops
async function motionChecks(page) {
  await goStep(page, 'p1-answer', { door: 'desk' });
  await page.waitForTimeout(600);
  return page.evaluate(() => document.getAnimations().filter((a) => { const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming(); return t && t.iterations === Infinity && a.playState === 'running'; }).map((a) => 'a loop runs under Reduce Motion: ' + (a.animationName || a.id || 'an animation') + ' on .' + String(a.effect.target && a.effect.target.className || '').split(' ')[0]));
}
// the desktop browser shows its scroll bars; the phone's browser draws them over the content
async function scrollbarChecks(page) {
  await goStep(page, 'p1-answer', { door: 'desk' });
  // read from the computed style (Playwright's headless Chromium hides every scroll bar, so their width cannot be measured)
  return page.evaluate(() => [...document.querySelectorAll('.pframe .w-main, .pframe .w-side, .pframe .w-scroll')].filter((e) => getComputedStyle(e).scrollbarWidth === 'none').map((e) => 'a desktop scroll bar hidden on .' + e.className.split(' ')[0]));
}
// every chart style, every step that draws a tick or a spine: none is cut by its track
async function tickChecks(page) {
  const out = [];
  for (const cm of ['a', 'b', 'c', 'classic']) {
    const ids = await page.evaluate((cm) => {
      const M = window.MP5, ids = [];
      M.act('door:desk'); M.act('theme:light'); M.act('charts:' + cm); if (M.state().priv) M.act('priv');
      for (const s of M.allSteps()) { M.go(s.ci, s.si); if (document.querySelector('.pframe .mp5-bartick, .pframe .mp5-pil-a b')) ids.push(s.id); }
      return ids;
    }, cm);
    for (const id of ids) {
      await goStep(page, id, { door: 'desk', charts: cm });
      (await page.evaluate(frameChecks, { door: 'desk' })).filter((x) => x[0] === 'tick').forEach((x) => out.push(`charts ${cm} · ${id}: tick cut by its track: ${x[1]}`));
    }
  }
  await page.evaluate(() => window.MP5.act('charts:a'));
  return out;
}
async function interactionChecks(browser, port) {
  const out = [];
  let page = await openBoard(browser, port);
  for (const d of ['desk', 'pweb', 'ios']) out.push(...(await sheetChecks(page, d)));
  out.push(...(await moreChecks(page, 'pweb', 390, 'arun')), ...(await moreChecks(page, 'pweb', 390, 'asha')), ...(await moreChecks(page, 'desk', 800, 'arun')));
  out.push(...(await tickChecks(page)));
  out.push(...(await scrollbarChecks(page)));
  out.push(...page.errs);
  await page.close();
  page = await openBoard(browser, port, { live: true });
  out.push(...(await focusChecks(page)), ...(await scrubChecks(page)), ...page.errs);
  await page.close();
  page = await openBoard(browser, port, { live: true, reducedMotion: 'reduce' });
  out.push(...(await motionChecks(page)));
  await page.close();
  return out.map((x) => 'interaction: ' + x);
}

// ---------- the selftest ----------
async function selftest() {
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
    ['masked money passes privacy check', privFaults(['     ', 'Hidden'], ['Hidden', 'Net worth chart: Hidden'], []).length === 0],
    ['raw DOM money fails privacy check even inside .mny', privFaults(['£457,951'], [], []).length === 1],
    ['raw aria-label money fails privacy check', privFaults([], ['Net worth £457,951'], []).length === 1],
    ['raw data-scrub payload fails privacy check', privFaults([], [], ['[{"x":10,"v":457951}]']).length === 1],
    ['a figure in a title or tooltip attribute fails privacy check', privFaults([], [], [], ['Net worth ₹5,15,19,488']).length === 1 && privFaults([], [], [], ['nav:home', 'Hidden']).length === 0],
    ['a control 44 by 44 passes, one under fails, its ::after hit area counts', hitFaults([{ what: 'a', w: 44, h: 44 }, { what: 'b', w: 120, h: 36, aw: 120, ah: 44 }]).length === 0 && hitFaults([{ what: 'c', w: 120, h: 40 }]).length === 1 && hitFaults([{ what: 'd', w: 35, h: 44 }]).length === 1],
  ];
  // the stylesheets as they are pass; each mutated copy is refused for what was mutated (lessons 12, 16)
  const css0 = fs.readFileSync(path.join(PV5, 'prototype-v5.css'), 'utf8');
  const eng0 = fs.readFileSync(path.join(PV5, 'prototype-v5-ch-engine.js'), 'utf8');
  const base = staticFaults();
  cases.push(['the stylesheets as they are pass the static checks' + (base.length ? ' (' + base[0] + ')' : ''), base.length === 0]);
  const mut = (file, text, from, to) => { if (!text.includes(from)) return null; return { [file]: text.split(from).join(to) }; };
  const stat = [
    ['text under 12px in prototype-v5.css is refused', mut('prototype-v5.css', css0, '.mp-draft { display: inline-flex; align-items: center; gap: 4px; font: 700 12px/16px', '.mp-draft { display: inline-flex; align-items: center; gap: 4px; font: 700 11px/16px'), /text under 12px/],
    ['a desktop scroll bar hidden is refused', mut('prototype-v5.css', css0, 'scrollbar-width: thin; scrollbar-color: var(--mp-line) transparent; }', 'scrollbar-width: none; }'), /desktop scroll bar hidden/],
    ['a webkit scroll bar of width 0 on .w-main is refused', mut('prototype-v5.css', css0, '.af .pscroll::-webkit-scrollbar,', '.w-main::-webkit-scrollbar, .af .pscroll::-webkit-scrollbar,'), /desktop scroll bar hidden/],
    ['a loop with no Reduce Motion guard is refused', mut('prototype-v5.css', css0, '@media (prefers-reduced-motion: no-preference) {\n  .pnext::after', '@media all {\n  .pnext::after'), /no Reduce Motion guard/],
    ['a 3px side stripe in a chapter file is refused', mut('prototype-v5-ch-engine.js', eng0, 'box-shadow:inset 0 0 0 1px var(--mp-line)}', 'box-shadow:inset 3px 0 0 var(--mp-ink-3)}'), /a side stripe/],
    ['100vh with no 100dvh is refused', mut('prototype-v5.css', css0, 'min-height: 100vh; min-height: 100dvh;', 'min-height: 100vh;'), /100vh with no 100dvh/],
  ];
  for (const [name, over, want] of stat) {
    if (!over) { cases.push([name + ' (the mutation did not apply: the case is stale)', false]); continue; }
    const f = staticFaults(over);
    cases.push([name, f.some((x) => want.test(x))]);
  }
  let bad = 0;
  const report = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
  for (const [name, ok] of cases) report(name, ok);
  let n = cases.length;

  // the frame and interaction checks, each on a copy of one file mutated in memory: the clean copy passes the
  // check, the mutated one is refused for the fault the case names
  const pw = playwright(true);
  if (!pw) { report('Chromium for the frame cases (playwright-core is not installed)', false); n++; }
  else {
    const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const P = 'prototype-v5/';
    const mutate = (rel, from, to) => { const t = read(rel); return t.includes(from) ? { [rel]: t.split(from).join(to) } : null; };
    const step = (id, o) => async (page) => checkStep(page, id, o || {});
    const dom = [
      ['an icon read aloud is refused', mutate(P + 'prototype-v5-kit.js', `'" aria-hidden="true">' + esc(name)`, `'">' + esc(name)`), step('p1-answer'), /icon: \.ms without aria-hidden/],
      ['a <span> that acts is refused', mutate(P + 'prototype-v5-kit.js', `return '<button type="button" class="mp-btn ' + k + '"' + K.go(key) + '>' + (icon ? K.ms(icon) : '') + '<span>' + t + '</span></button>';`, `return '<span class="mp-btn ' + k + '"' + K.go(key) + '>' + (icon ? K.ms(icon) : '') + '<span>' + t + '</span></span>';`), step('p19-check'), /not a button/],
      ['Liquid Glass on a web door is refused', mutate(P + 'prototype-v5.js', `var g = ctx.web ? '' : ' lg';`, `var g = ' lg';`), step('p1-answer', { door: 'pweb' }), /iOS chrome on web: .*\blg\b/],
      ['a sheet grab on a web door is refused', mutate(P + 'prototype-v5.js', `<div class="sheet w-sheet" role="dialog" aria-modal="true">' + sheet`, `<div class="sheet w-sheet" role="dialog" aria-modal="true"><div class="sheet-grab"></div>' + sheet`), step('p19-check'), /iOS chrome on web: sheet-grab/],
      ['a sheet that is not a modal dialog is refused', mutate(P + 'prototype-v5.js', `<div class="sheet w-sheet" role="dialog" aria-modal="true">`, `<div class="sheet w-sheet">`), step('p19-check'), /dialog: .*not role=dialog/],
      ['a sheet whose Cancel does nothing is refused (p19-cas, MA-300)', mutate(P + 'prototype-v5-ch-team.js', ` sheetClose: 'cas:cancel', on: { 'cas:cancel': 'sheet:dismiss' },`, ''), step('p19-cas', { door: 'ios' }), /close control cas:cancel does nothing/],
      ['a sheet whose Close does nothing is refused (p11-plain, MA-300)', mutate(P + 'prototype-v5-ch-engine.js', ` sheetClose: 'eng:closesheet', on: { 'eng:closesheet': 'sheet:dismiss' },`, ''), step('p11-plain'), /close control eng:closesheet does nothing/],
      ['text under 12px in a frame is refused', mutate(P + 'prototype-v5.css', '.mp-draft { display: inline-flex; align-items: center; gap: 4px; font: 700 12px/16px', '.mp-draft { display: inline-flex; align-items: center; gap: 4px; font: 700 11px/16px'), step('p19-check'), /text under 12px: 11px \.mp-draft/],
      ['a control under 44 by 44 is refused', mutate(P + 'prototype-v5-ch-talk.js', `'.pv5-talk-seg button{min-height:44px;`, `'.pv5-talk-seg button{min-height:36px;`), step('p1-activity'), /under 44 by 44: BUTTON/],
      ['a hit area taken away is refused', mutate(P + 'prototype-v5.css', ':not(.pnext)::after { content: "";', ':not(.pnext)::after { content: none;'), step('p1-answer'), /under 44 by 44: BUTTON/],
      ['a benchmark tick cut by its track is refused', mutate(P + 'prototype-v5.css', '.bar.has-tick, .charts-a .bar.has-tick { position: relative; overflow: visible; }', '.bar.has-tick, .charts-a .bar.has-tick { position: relative; overflow: hidden; }'), step('p6-close'), /tick cut by its track/],
      ['raw money in privacy mode is refused', mutate(P + 'prototype-v5-kit.js', '    if (isPriv()) {\n      var len', '    if (false) {\n      var len'), step('p1-answer', { priv: true, door: 'pweb' }), /money not masked: \S*£/],
      ['a figure read aloud in privacy mode is refused', mutate(P + 'prototype-v5-kit.js', `'<span class="mny" role="img" aria-label="Hidden"><span aria-hidden="true">'`, `'<span class="mny" role="img" aria-label="' + s + '"><span aria-hidden="true">'`), step('p1-answer', { priv: true, door: 'ios' }), /money not masked: aria-label: /],
      ['a chart scrub carrying figures in privacy mode is refused', mutate(P + 'prototype-v5-kit.js', `if (o.scrub && o.scrub.length && !isPriv()) {`, `if (o.scrub && o.scrub.length) {`), step('p7-fan', { priv: true, door: 'desk' }), /money not masked: data-scrub/],
      ['a sheet that only Escape closes is refused (its backdrop goes nowhere)', mutate(P + 'prototype-v5.js', `if (ctx.web) h += '<div class="dim" aria-hidden="true"' + K.go(closeKey) + '>`, `if (ctx.web) h += '<div class="dim" aria-hidden="true"' + K.go('nowhere') + '>`), async (page) => sheetChecks(page, 'desk'), /its backdrop does not close the sheet/],
      ['a route the More drawer cannot reach is refused', mutate(P + 'prototype-v5.js', `['overlap', 'Overlap', 'join'], `, ''), async (page) => moreChecks(page, 'pweb', 390, 'arun'), /cannot reach overlap/],
      ['a hidden desktop scroll bar is refused in the frame', mutate(P + 'prototype-v5.css', 'scrollbar-width: thin; scrollbar-color: var(--mp-line) transparent; }', 'scrollbar-width: none; }'), scrollbarChecks, /desktop scroll bar hidden on \.w-/],
      ['focus lost on a redraw is refused', mutate(P + 'prototype-v5.js', '    restoreFocus(root, fk, wasDialog);\n', '\n'), { live: true, run: focusChecks }, /focus lost when the prototype redraws/],
      ['Tab leaving an open dialog is refused', mutate(P + 'prototype-v5.js', `if (e.key !== 'Tab' || !root) return;`, `return;`), { live: true, run: focusChecks }, /Tab left the open More drawer/],
      ['a scrub stuck after the finger lifts is refused', mutate(P + 'prototype-v5.js', `root.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') scrubEnd(); });`, ''), { live: true, run: scrubChecks }, /stuck after the finger lifted/],
      ['a scrub stuck after pointercancel is refused', mutate(P + 'prototype-v5.js', `root.addEventListener('pointercancel', scrubEnd);`, ''), { live: true, run: scrubChecks }, /stuck after the browser took the gesture/],
      ['a scrub with no Home and End is refused', mutate(P + 'prototype-v5.js', ` || e.key === 'Home' || e.key === 'End')) {`, `)) {`), { live: true, run: scrubChecks }, /Home did not open or move|End did not open or move/],
      ['a loop under Reduce Motion is refused', mutate(P + 'prototype-v5.css', '@media (prefers-reduced-motion: no-preference) {\n  .pnext::after', '@media all {\n  .pnext::after'), { live: true, reducedMotion: 'reduce', run: motionChecks, also: [[P + 'prototype-v5.css', '@media (prefers-reduced-motion: reduce) { .pv5 *, .pv5 *::before, .pv5 *::after { animation-iteration-count: 1 !important; } }', ''], ['app-v1/motion.css', '@media (prefers-reduced-motion: reduce)', '@media (prefers-reduced-motion: no-such-value)']] }, /a loop runs under Reduce Motion/],
    ];
    const browser = await pw.chromium.launch();
    try {
      for (const [name, over0, how, want] of dom) {
        let over = over0;
        // a case may mutate more than one file (the shared motion.css stops loops under Reduce Motion as well as ours)
        for (const [rel, from, to] of (over && how.also) || []) { const t = over[rel] != null ? over[rel] : read(rel); over = t.includes(from) ? Object.assign({}, over, { [rel]: t.split(from).join(to) }) : null; if (!over) break; }
        if (!over) { report(name + ' (the mutation did not apply: the case is stale)', false); n++; continue; }
        const run = typeof how === 'function' ? how : how.run;
        const o = typeof how === 'function' ? {} : how;
        const once = async (ov) => { const server = await serve(ov); try { const page = await openBoard(browser, server.address().port, o); try { return (await run(page)).concat(page.errs); } finally { await page.close(); } } finally { server.close(); } };
        const clean = (await once(null)).filter((x) => want.test(x));
        const dirty = await once(over);
        const hit = dirty.some((x) => want.test(x));
        report(name + (clean.length ? ' (the clean copy already fails: ' + clean[0] + ')' : hit ? '' : ' (not refused; saw: ' + (dirty[0] || 'nothing') + ')'), !clean.length && hit);
        n++;
      }
    } finally { await browser.close(); }
  }
  console.log(`prototype_smoke selftest: ${n - bad} of ${n} cases hold`);
  process.exit(bad ? 1 : 0);
}

// ---------- the walk ----------
async function walkMain() {
  if (!fs.existsSync(path.join(ROOT, BOARD))) { console.error('prototype_smoke: ' + BOARD + ' is missing'); process.exit(1); }
  const tools = archTools();
  const onlyCh = opt('--ch');
  const doors = (opt('--door') || 'desk,pweb,ios,ipad,fold').split(',');
  const shots = opt('--shots');
  const priv = args.includes('--priv');
  const themes = (opt('--theme') || (priv ? 'light' : 'light,dark')).split(',');
  const modes = (opt('--charts') || (priv ? 'a,b,c,classic' : 'a')).split(',');
  const { chromium } = playwright();
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await openBoard(browser, port);
  const faults = [];
  faults.push(...staticFaults());
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const all = await page.evaluate(() => { const cs = window.MP5.chapters.slice().sort((a, b) => (a.order || 0) - (b.order || 0)); return window.MP5.allSteps().map((s) => Object.assign(s, { n: String(cs[s.ci].n) })); });
  if (!all.length) { console.error('prototype_smoke: the prototype has no chapters'); process.exit(1); }
  const walk = all.filter((s) => !onlyCh || s.n === onlyCh);
  if (!walk.length) { console.error('prototype_smoke: no chapter ' + onlyCh); process.exit(1); }
  let n = 0;
  for (const dr of doors) {
    for (const th of themes) {
      for (const cm of modes) {
        await page.evaluate(([dr, th, priv, cm]) => { const M = window.MP5; M.act('door:' + dr); M.act('theme:' + th); M.act('charts:' + cm); if (M.state().priv !== priv) M.act('priv'); }, [dr, th, priv, cm]);
        for (const s of walk) {
          await page.evaluate(([ci, si]) => window.MP5.go(ci, si), [s.ci, s.si]);
          const raw = await page.evaluate(frameChecks, { door: dr, measure: th === 'light' && cm === modes[0] });
          const r = await page.evaluate(() => {
            const fr = document.querySelector('.pframe');
            const text = fr.innerText + '\n' + (document.querySelector('.pguide') || { innerText: '' }).innerText;
            // tools are read from the words a member sees: an icon's ligature name (.ms) is not a word on the screen
            const bare = fr.cloneNode(true); bare.querySelectorAll('.ms').forEach((e) => e.remove());
            return { text, tools: [bare.textContent] };
          });
          const where = `${dr} · ${th}${modes.length > 1 ? ' · charts ' + cm : ''} · ch ${s.n} · ${s.id}`;
          faults.push(...judgeFrame(raw, where));
          dateFaults(r.text).forEach((x) => faults.push(`${s.id}: a wrong weekday: ${x}`));
          toolFaults(r.tools, tools).forEach((x) => faults.push(`${s.id}: a tool ARCHITECTURE §8 does not define: ${x}`));
          wordFaults(r.text).forEach((x) => faults.push(`${s.id}: ${x}`));
          if (shots) { const el = await page.$('.pframe'); await el.screenshot({ path: path.join(shots, `${s.n.padStart(2, '0')}-${s.id}-${dr}-${th}${modes.length > 1 ? '-' + cm : ''}${priv ? '-priv' : ''}.png`) }); }
          n++;
        }
      }
    }
  }
  faults.push(...page.errs);
  await page.close();
  if (!onlyCh && !priv && doors.includes('pweb')) faults.push(...(await interactionChecks(browser, port)));
  await browser.close();
  server.close();
  const uniq = [...new Set(faults)];
  uniq.forEach((f) => console.log('FAULT ' + f));
  console.log(`prototype_smoke: ${n} frames walked (${walk.length} steps × ${doors.length} doors × ${themes.length} themes${modes.length > 1 ? ' × ' + modes.length + ' chart styles' : ''}${priv ? ', privacy on' : ''}), ${uniq.length} faults`);
  process.exit(uniq.length ? 1 : 0);
}

(args.includes('--selftest') ? selftest() : walkMain()).catch((e) => { console.error('prototype_smoke: ' + (e && e.stack || e)); process.exit(1); });
