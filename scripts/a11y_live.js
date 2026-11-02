// What a member's hands, eyes and screen reader meet on every live board, measured in the rendered page (MA-300, the
// deep scan's P3-3). scripts/board_fit.js measures whether a board fits; this gate measures what static checks cannot
// see, in the live DOM of each current board at its drawn size and of Prototype v5 at every door, chapter and step:
//
//   tick-clipped      a tick or marker (TICKS below) cut by an ancestor that clips: the marker's box reaches past the
//                     padding box of an ancestor whose overflow is hidden or clip (or, for a scroller, past its start,
//                     which no scroll reaches), while part of it is still inside (a marker wholly outside is scrolled
//                     away, not cut), unless the ancestor runs on more than 24 px past that edge (a page or list cut at
//                     its fold, which board_fit measures whole). The fault MA-298 fixed with .mp-track.has-tick and .mp-track-clip.
//   small-target      a target (TARGETS below) smaller than 44 x 44 CSS px, counting an invisible hit area drawn by its
//                     own ::after or ::before. How the hit area is measured: the pseudo-element counts when its content
//                     is not `none`, it is absolutely positioned, pointer-events is not none and the element itself is
//                     positioned (so the pseudo's containing block is the element's padding box). Its box is read from
//                     getComputedStyle(el, '::after'): left/right/top/bottom and width/height in px (the resolved values;
//                     both insets give the size, else the size with one inset), shifted by the translate of its
//                     transform, in the element's own CSS px (offsetWidth/clientWidth, so a frame drawn under zoom or a
//                     scale is measured in its own px); the target is the union of the border box and that box. A link
//                     inline in a sentence (display inline, beside text in its parent) is exempt, as WCAG 2.5.8 exempts it.
//   not-focusable     an element that acts but cannot be reached from the keyboard (tabIndex < 0): it has an onclick
//                     attribute or property, role button, switch or tab (or link, checkbox, radio, menuitem, option), an
//                     aria-pressed (a toggle, whatever its tag), Prototype v5's data-go (the prototype acts on
//                     the closest [data-go] from one root listener), or cursor:pointer with a click, pointer or mouse
//                     listener of its own (caught by wrapping addEventListener before the page loads). A disabled one
//                     (disabled, aria-disabled="true") does not act; one inside a focusable button or link is that
//                     control's part.
//                     A member at tabindex -1 of a composite widget (tablist, radiogroup, toolbar, menu, menubar,
//                     listbox, grid, tree) is reachable by the roving tabindex when the composite holds at least one
//                     shown member at tabindex 0 or above; a composite with none is refused.
//                     A modal backdrop is a pointer convenience, not a control: an acting element that is
//                     aria-hidden="true" is accepted only when it sits beside (a sibling of) a shown
//                     [role=dialog][aria-modal=true] that holds a close control a keyboard reaches (shown, tabindex 0 or
//                     above, not disabled, acting on the backdrop's own data-go or named Close, Cancel, Done or Dismiss).
//                     Any other aria-hidden element that acts is refused.
//   icon-not-hidden   a Material Symbols ligature (.ms) shown as an icon whose name a screen reader reads: neither it nor
//                     an ancestor is aria-hidden="true" and no ancestor is role="img" with an aria-label (whose children
//                     are presentational).
//   aria-hidden-invalid  an aria-hidden whose value is neither "true" nor "false" (the literal \"true\" that escaped
//                     quotes in a template leave, "True", an empty value): only "true" hides, so the element is exposed.
//                     The icon check treats only aria-hidden="true" as hidden, so such an icon is refused twice.
//   privacy-leak      in a frame with Privacy Mode on, an amount (£, ₹, $ or € with a figure) a member or a screen reader
//                     can still get: in text a screen reader reads (visible, transparent or sr-only, outside aria-hidden
//                     and role="img" names), in aria-label, aria-valuetext, aria-description, title or alt, or in a
//                     [data-scrub] payload (a currency figure or a numeric v, lo, hi or vt). A mask's placeholder whose
//                     digits are all 0, inside .mp-mask or .mny, is no amount, nor is an exchange rate (£1 = ₹112.50). A board's frame is in Privacy Mode when it
//                     draws it on: its Privacy mode control pressed (aria-pressed="true", or showing visibility_off), a
//                     .privon root, or masks (.mp-mask, .mny). Prototype v5 turns it on with its own toolbar
//                     (.ptop [data-go="priv"]) at every step, and the gate checks MP5.state().priv and .privon took it.
//
//   node scripts/a11y_live.js                          every current board and Prototype v5, in Chromium
//   node scripts/a11y_live.js --only "iPhone v4 · Home" a subset (a pattern on the board's path under docs/design/)
//   node scripts/a11y_live.js --only "Prototype v5" --doors "^iPhone$" --steps "^1"   part of the prototype's walk
//   node scripts/a11y_live.js --engine webkit|both     another engine (Chromium is the default)
//   node scripts/a11y_live.js --json <file>            also writes every row (allowed ones marked) to <file>
//   node scripts/a11y_live.js --jobs <n>               boards measured at once (default 3)
//   node scripts/a11y_live.js --selftest [--case <name>] [--engine <e>]   proves the gate refuses each fault it was
//                                                      built for, on mutated copies, and that an unmutated copy is clean
//
// The board list is board_fit.js's: every .dc.html in app-v1, ios-v1 and ds-v1 but the superseded pattern in
// scripts/board_fit_allow.json, and the boards board_fit.js's REPO_BOARDS names (Prototype v5), read from its source so
// the two gates never drift; the frames are board_fit_page.js's (window.__fit.frames(), the outermost device and
// browser frames), so the canvas's own titles and notes are not product UI. A board in board_fit_allow.json's noFrames
// (the design system's documentation) must render and has no frame to measure. Prototype v4 is walked at every door
// and step, in light. It fails closed (exit 1): a board that does not load or render (a template hole, the runtime's
// render error), a board with no frame that noFrames does not name, a selector the gate cannot parse, a privacy toggle
// it cannot find or that does not take, and a prototype door, chapter or step it cannot reach; an --only, --doors or
// --steps that matches nothing, and an allowance it cannot read, stop it (exit 2). Allowances are in
// scripts/a11y_live_allow.json: each names its board, its fault types, a regular expression on the element's path and
// one on the text, and its reason; one that matches nothing in a run that covers its board is reported (NOTE).
//
// Needs playwright-core in scripts/node_modules, as board_fit.js does (PLAYWRIGHT_CORE=<path> overrides).
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DESIGN = path.join(ROOT, 'docs', 'design');
const PAGE_JS = fs.readFileSync(path.join(__dirname, 'board_fit_page.js'), 'utf8');
const FIT_ALLOW = JSON.parse(fs.readFileSync(path.join(__dirname, 'board_fit_allow.json'), 'utf8'));
const ALLOW_FILE = path.join(__dirname, 'a11y_live_allow.json');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const die = (m) => { console.error('a11y_live: ' + m); process.exit(2); };
const enginesOf = (dflt) => {
  const e = { both: ['chromium', 'webkit'], chromium: ['chromium'], webkit: ['webkit'] }[opt('--engine', dflt)];
  if (!e) die('--engine is chromium, webkit or both');
  return e;
};
const JOBS = Math.max(1, +opt('--jobs', 3) || 3);
const ONLY = opt('--only', '');
let DOORS_RE = opt('--doors', '');
let STEPS_RE = opt('--steps', '');

function playwright() {
  for (const m of [process.env.PLAYWRIGHT_CORE, 'playwright-core', path.join(__dirname, 'node_modules', 'playwright-core')].filter(Boolean)) {
    try { return require(m); } catch (e) { /* next */ }
  }
  die('playwright-core not found: run `npm ci --prefix scripts`, then `npx --prefix scripts playwright-core install chromium webkit`');
}

function readAllow(file = ALLOW_FILE) {
  if (!fs.existsSync(file)) return [];
  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { die(`${path.basename(file)} is not JSON: ${e.message}`); }
  if (!Array.isArray(j.allow)) die(`${path.basename(file)} has no allow list`);
  return j.allow.map((a, i) => {
    for (const k of ['board', 'types', 'why']) if (!a[k]) die(`${path.basename(file)} allowance ${i} has no ${k}`);
    try { return { ...a, elRe: new RegExp(a.el || ''), textRe: new RegExp(a.text || ''), framesRe: a.frames ? new RegExp(a.frames) : null }; } catch (e) { die(`${path.basename(file)} allowance ${i}: ${e.message}`); }
  });
}
const ALLOW = readAllow();

// ---------- the board list: board_fit.js's rule ----------
function repoBoards() {
  const src = fs.readFileSync(path.join(__dirname, 'board_fit.js'), 'utf8');
  const m = /const REPO_BOARDS = (\[[^\]]*\]);/.exec(src);
  if (!m) die('cannot read REPO_BOARDS from scripts/board_fit.js (the two gates share one board list)');
  try { return JSON.parse(m[1].replace(/'/g, '"')); } catch (e) { die('cannot parse board_fit.js REPO_BOARDS: ' + m[1]); }
}
function filesUnder(base, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(base, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...filesUnder(base, r)); else if (e.isFile()) out.push(r);
  }
  return out;
}
function boards(design, only = ONLY) {
  const skip = new RegExp(FIT_ALLOW.superseded.pattern);
  const out = [];
  for (const d of ['app-v1', 'ios-v1', 'ds-v1']) {
    if (!fs.existsSync(path.join(design, d))) die('the board folder ' + d + ' is missing');
    for (const f of filesUnder(path.join(design, d))) if (f.endsWith('.dc.html') && !skip.test(f)) out.push(d + '/' + f);
  }
  for (const b of repoBoards()) { if (!fs.existsSync(path.join(design, b))) die(b + ' is listed in board_fit.js but missing'); out.push(b); }
  return out.filter((b) => !only || new RegExp(only).test(b)).sort();
}

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

// ---------- the page side ----------
// Installed before any of the page's scripts: remembers every element that is given a click, pointer or mouse listener
const LISTEN_JS = `(() => {
  const acts = new WeakSet(), TYPES = new Set(['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'dblclick']);
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) { try { if (TYPES.has(type) && this instanceof Element) acts.add(this); } catch (e) {} return add.call(this, type, fn, o); };
  window.__a11yListens = (el) => acts.has(el);
})();`;

const TICKS = ['.bartick', '.mp5-bartick', '.pil-zero', '.tick', '.ptick', '.pc-tick', '.k-tick', '.runs-tick', '.mp-chartdot'];
const TARGETS = 'button, a[href], [role="button"], [role="switch"], [role="tab"], [role="slider"], input:not([type="hidden"])';
const ACTS = '[onclick], [role="button"], [role="switch"], [role="tab"], [role="link"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="option"], [aria-pressed], [data-go]';
const PRIV_MARK = '[aria-pressed="true"][aria-label*="rivacy" i], .privon, .mp-mask';   // not .mny: Prototype v5 wraps every amount in it, masked or not

// one frame (or, given no index, the whole body of a frameless page is never scanned), at its current state
function pageScan({ fi, ticks, targets, acts, privMark, forcePriv, privAuto = true }) {
  const COMPOSITE = '[role="tablist"], [role="radiogroup"], [role="toolbar"], [role="menu"], [role="menubar"], [role="listbox"], [role="grid"], [role="tree"], [role="treegrid"]';
  const out = [];
  const bad = [];
  for (const s of [...ticks, targets, acts, privMark]) { try { document.querySelector(s); } catch (e) { bad.push(s); } }
  if (bad.length) return { error: 'a selector the gate cannot parse: ' + bad.join(', ') };
  const f = window.__fit.frames()[fi];
  if (!f) return { error: 'no frame ' + fi };
  const label = window.__fit.label(f);
  const CS = new Map();
  const cs = (n) => { let s = CS.get(n); if (!s) { s = getComputedStyle(n); CS.set(n, s); } return s; };
  const shown = (n) => { for (let m = n; m && m.nodeType === 1; m = m.parentElement) { const s = cs(m); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return false; if (m === f) break; } return true; };
  // exposed to a screen reader: rendered (display, visibility) and outside aria-hidden and a named image's children
  const exposed = (n) => {
    if (cs(n).visibility === 'hidden') return false;
    for (let m = n; m && m.nodeType === 1; m = m.parentElement) {
      if (cs(m).display === 'none' || m.getAttribute('aria-hidden') === 'true' || m.hidden || m.inert) return false;
      if (m !== n && m.getAttribute('role') === 'img' && m.hasAttribute('aria-label')) return false;
      if (m === f) break;
    }
    return true;
  };
  const desc = (e) => {
    const parts = [];
    for (let n = e; n && n !== f && parts.length < 2; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.getAttribute('class') ? '.' + n.getAttribute('class').trim().split(/\s+/).slice(0, 3).join('.') : '') + (n.getAttribute('role') ? `[role=${n.getAttribute('role')}]` : ''));
    return parts.join(' > ');
  };
  const name = (e) => (e.getAttribute('aria-label') || (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ') || e.getAttribute('title') || e.getAttribute('data-go') || '').slice(0, 60);
  const add = (type, e, text, px) => out.push({ type, text: String(text), el: e ? desc(e) : '', px: px || '', label });

  // tick-clipped
  const tickEls = new Set();
  for (const s of ticks) for (const t of f.querySelectorAll(s)) tickEls.add(t);
  const tickHits = {};
  for (const s of ticks) tickHits[s] = f.querySelectorAll(s).length;
  for (const t of tickEls) {
    if (!shown(t)) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 0.5 && r.height < 0.5) continue;
    for (let a = t.parentElement; a; a = a.parentElement) {
      const s = cs(a);
      const ox = s.overflowX, oy = s.overflowY;
      if (ox !== 'visible' || oy !== 'visible') {
        const ar = a.getBoundingClientRect();
        const sx = a.offsetWidth ? ar.width / a.offsetWidth : 1, sy = a.offsetHeight ? ar.height / a.offsetHeight : 1;
        const box = { l: ar.left + a.clientLeft * sx, t: ar.top + a.clientTop * sy };
        box.r = box.l + a.clientWidth * sx; box.b = box.t + a.clientHeight * sy;
        const inside = r.right > box.l + 0.5 && r.left < box.r - 0.5 && r.bottom > box.t + 0.5 && r.top < box.b - 0.5;
        if (inside) {
          const hard = (o) => o === 'hidden' || o === 'clip';
          const past = [];
          // a scroller reaches what runs past its end, never what sits before its start
          if (ox !== 'visible' && r.left < box.l - 0.5 - (hard(ox) ? 0 : -a.scrollLeft) && (hard(ox) || a.scrollLeft === 0)) past.push('left');
          if (hard(ox) && r.right > box.r + 0.5) past.push('right');
          if (oy !== 'visible' && r.top < box.t - 0.5 && (hard(oy) || a.scrollTop === 0)) past.push('top');
          if (hard(oy) && r.bottom > box.b + 0.5) past.push('bottom');
          // a page or a list that runs on past its end (more than 24 px of content) is cut at its fold, not at a marker's
          // edge: what shows past its bottom or right is content below the fold, which board_fit measures whole
          const fold = (side) => (side === 'bottom' ? a.scrollHeight - a.clientHeight : side === 'right' ? a.scrollWidth - a.clientWidth : 0) > 24;
          if (past.length && past.every(fold)) past.length = 0;
          if (past.length) {
            const by = Math.max(box.l - r.left, r.right - box.r, box.t - r.top, r.bottom - box.b);
            add('tick-clipped', t, (t.getAttribute('class') || t.tagName.toLowerCase()) + ' cut at its ' + past.join('+') + ' by ' + desc(a).split(' > ').pop(), by.toFixed(1) + 'px');
          }
        }
        break;   // the nearest clipping ancestor decides; one outside it clips only what it lets through
      }
      if (a === f) break;
    }
  }

  // small-target
  const px = (v) => (/^-?[\d.]+px$/.test(v) ? parseFloat(v) : null);
  const hitBox = (e) => {
    // the border box, in the element's own px, with its padding box at the origin
    const bl = e.clientLeft, bt = e.clientTop, cw = e.clientWidth, ch = e.clientHeight;
    let box = { l: -bl, t: -bt, r: e.offsetWidth - bl, b: e.offsetHeight - bt };
    if (cs(e).position === 'static') return box;
    for (const which of ['::after', '::before']) {
      const p = getComputedStyle(e, which);
      if (!p.content || p.content === 'none' || p.content === 'normal' || !/absolute|fixed/.test(p.position) || p.pointerEvents === 'none' || p.display === 'none') continue;
      const L = px(p.left), R = px(p.right), T = px(p.top), B = px(p.bottom), W = px(p.width), H = px(p.height);
      let x0, x1, y0, y1;
      if (L !== null && R !== null && (W === null || Math.abs(cw - L - R - W) < 1)) { x0 = L; x1 = cw - R; } else if (W !== null) { if (L !== null) { x0 = L; x1 = L + W; } else if (R !== null) { x1 = cw - R; x0 = x1 - W; } else { x0 = 0; x1 = W; } } else continue;
      if (T !== null && B !== null && (H === null || Math.abs(ch - T - B - H) < 1)) { y0 = T; y1 = ch - B; } else if (H !== null) { if (T !== null) { y0 = T; y1 = T + H; } else if (B !== null) { y1 = ch - B; y0 = y1 - H; } else { y0 = 0; y1 = H; } } else continue;
      const m = /matrix\(([^)]+)\)/.exec(p.transform || '');
      if (m) { const v = m[1].split(',').map(parseFloat); x0 += v[4]; x1 += v[4]; y0 += v[5]; y1 += v[5]; }
      box = { l: Math.min(box.l, x0), t: Math.min(box.t, y0), r: Math.max(box.r, x1), b: Math.max(box.b, y1) };
    }
    return box;
  };
  for (const e of f.querySelectorAll(targets)) {
    if (!shown(e) || !(e instanceof HTMLElement)) continue;
    if (e.offsetWidth < 1 && e.offsetHeight < 1) continue;
    if (e.tagName === 'A' && cs(e).display === 'inline' && [...e.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const b = hitBox(e), w = b.r - b.l, h = b.b - b.t;
    if (w < 44 - 0.5 || h < 44 - 0.5) add('small-target', e, name(e), Math.round(w) + 'x' + Math.round(h));
  }

  // not-focusable
  for (const e of new Set([...f.querySelectorAll(acts), ...[...f.querySelectorAll('*')].filter((n) => typeof n.onclick === 'function' || (window.__a11yListens && window.__a11yListens(n) && cs(n).cursor === 'pointer'))])) {
    if (!shown(e) || e.tabIndex >= 0) continue;
    if (e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true') continue;
    const host = e.parentElement && e.parentElement.closest('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (host && f.contains(host)) continue;
    // a modal backdrop (aria-hidden="true", beside an open modal dialog whose close control the keyboard reaches): the
    // dialog's close control and Escape are the keyboard's way out, the backdrop only the pointer's
    if (e.getAttribute('aria-hidden') === 'true' && e.parentElement) {
      const go = e.getAttribute('data-go');
      const closer = (d) => [...d.querySelectorAll('button, a[href], [role="button"], [tabindex]')].some((c) => c.tabIndex >= 0 && shown(c) && !c.hasAttribute('disabled') && c.getAttribute('aria-disabled') !== 'true' &&
        ((go && c.getAttribute('data-go') === go) || /^(close|cancel|done|dismiss)\b/i.test(name(c))));
      const dlg = [...e.parentElement.children].filter((d) => d !== e && d.matches('[role="dialog"][aria-modal="true"]') && shown(d));
      if (dlg.some(closer)) continue;
    }
    // a roving tabindex (WAI-ARIA composite widgets): inside a tablist, radiogroup, toolbar, menu, menubar, listbox, grid
    // or tree, one member takes tabindex 0 and the arrow keys move focus to the rest at -1. A member at -1 is reachable
    // when its composite holds at least one shown member at 0 or above; a composite with none is refused.
    const comp = e.parentElement && e.parentElement.closest(COMPOSITE);
    if (comp && f.contains(comp)) {
      if ([...comp.querySelectorAll('*')].some((m) => m.tabIndex >= 0 && shown(m))) continue;
      add('not-focusable', e, name(e) + ' (no member of its role=' + comp.getAttribute('role') + ' is reachable)');
      continue;
    }
    add('not-focusable', e, name(e));
  }

  // aria-hidden-invalid: only "true" hides; any other value but "false" (the literal \"true\" a template's escaped quotes
  // leave, "True", "") is a mistake that leaves the element exposed
  for (const e of f.querySelectorAll('[aria-hidden]')) {
    const v = e.getAttribute('aria-hidden');
    if (v !== 'true' && v !== 'false' && shown(e)) add('aria-hidden-invalid', e, 'aria-hidden=' + JSON.stringify(v) + ' on ' + ((e.textContent || '').trim().slice(0, 30) || e.tagName.toLowerCase()));
  }

  // icon-not-hidden
  for (const e of f.querySelectorAll('.ms')) {
    if (!shown(e) || !exposed(e)) continue;
    const t = (e.textContent || '').trim();
    if (t) add('icon-not-hidden', e, t);
  }

  // privacy-leak
  const priv = forcePriv || privAuto && (!!f.querySelector(privMark) || f.matches(privMark) ||
    [...f.querySelectorAll('[aria-label*="rivacy" i]')].some((c) => /visibility_off/.test(c.textContent || '')));
  if (priv) {
    const MONEY = /[−+-]?[£₹$€]\s?\d[\d,.]*\s?(?:k|m|bn|cr|crore|lakh)?\b/gi;
    // an exchange rate (£1 = ₹112.50) is the market's, not the household's: it is not an amount Privacy Mode hides
    const RATE = /[£₹$€]\s?1\s?=\s?[£₹$€]\s?[\d.,]+/g;
    const real = (s, el) => (s.replace(RATE, ' ').match(MONEY) || []).filter((m) => !(/^[^1-9]*$/.test(m) && el && el.closest('.mp-mask, .mny')));
    const tw = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const el = n.parentElement;
      if (!el || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(el.tagName) || !exposed(el)) continue;
      for (const m of real(n.textContent, el)) { const k = desc(el) + m; if (!seen.has(k)) { seen.add(k); add('privacy-leak', el, 'text ' + m.trim()); } }
    }
    for (const el of f.querySelectorAll('[aria-label], [aria-valuetext], [aria-description], [title], [alt]')) {
      if (!exposed(el)) continue;
      for (const at of ['aria-label', 'aria-valuetext', 'aria-description', 'title', 'alt']) {
        const v = el.getAttribute(at);
        if (v) for (const m of real(v, null)) add('privacy-leak', el, at + ' ' + m.trim());
      }
    }
    for (const el of f.querySelectorAll('[data-scrub]')) {
      const v = el.getAttribute('data-scrub') || '';
      const money = v.match(MONEY), num = /"(?:v|lo|hi|vt)"\s*:\s*-?\d/.test(v);
      if ((money && money.length) || num) add('privacy-leak', el, 'data-scrub ' + (money ? money[0].trim() : 'numeric values'));
    }
  }
  return { label, priv, rows: out, tickHits };
}

// the canvas draws its boards from templates after load: wait until no template hole shows and the height holds
async function settle(page) {
  let last = -1;
  for (let n = 0; n < 24; n++) {
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, holes: /\{\{[^}]*\}\}/.test(document.body.innerText) }));
    if (!s.holes && s.h === last) return true;
    last = s.h;
  }
  return false;
}
const RUNTIME_ERROR = /\[dc-runtime\]|\.renderVals\(\):/;
async function runtimeErrors(page, logged) {
  const drawn = await page.evaluate(() => [...document.querySelectorAll('.sc-logic-error')].map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 160)));
  return [...drawn.map((t) => 'the runtime could not render it: ' + t), ...[...logged].map((t) => 'the runtime reported an error: ' + t)];
}

const SCAN_ARGS = { ticks: TICKS, targets: TARGETS, acts: ACTS, privMark: PRIV_MARK };

async function scanBoard(browser, port, board, engine) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript({ content: LISTEN_JS });
  const page = await ctx.newPage();
  const rows = [], tickHits = {};
  let scanned = 0;
  const fail = (type, why, label = '') => rows.push({ board, engine, label, type, text: why, el: '', px: '' });
  const holes = new Set(), logged = new Set();
  page.on('console', (m) => {
    const t = m.text().replace(/\s+/g, ' ');
    if (/never resolved/.test(t)) holes.add(t.slice(0, 120));
    if (m.type() === 'error' && RUNTIME_ERROR.test(t)) logged.add(t.slice(0, 160));
  });
  page.on('pageerror', (e) => logged.add(String(e).slice(0, 160)));
  const take = (res, label) => {
    if (res.error) return fail('did-not-render', res.error, label);
    scanned++;
    for (const r of res.rows) rows.push({ board, engine, ...r, label: label || r.label });
    for (const [s, n] of Object.entries(res.tickHits)) tickHits[s] = (tickHits[s] || 0) + n;
  };
  try {
    const res = await page.goto(`http://127.0.0.1:${port}/` + board.split('/').map(encodeURIComponent).join('/') + '?static=1', { waitUntil: 'networkidle', timeout: 60000 });
    if (!res || !res.ok()) { fail('did-not-render', 'the board did not load (' + (res ? res.status() : 'no response') + ')'); throw null; }
    if (!(await settle(page))) fail('did-not-render', 'the board never settled (template holes still showing)');
    await page.addScriptTag({ content: PAGE_JS });
    for (const h of holes) fail('did-not-render', 'a template value never resolved: ' + h);
    for (const e of await runtimeErrors(page, logged)) fail('did-not-render', e);
    if (/Prototype v[45]\.dc\.html$/.test(board)) {
      await page.waitForFunction(() => document.querySelectorAll('.pseg button').length && document.querySelectorAll('.psteps button').length, null, { timeout: 30000 });
      if (board.endsWith('Prototype v5.dc.html')) await walkPrototype5(page, take, fail); else await walkPrototype4(page, take, fail);
      for (const e of await runtimeErrors(page, logged)) fail('did-not-render', e);
    } else {
      const n = await page.evaluate(() => window.__fit.frames().length);
      if (!n && !FIT_ALLOW.noFrames.some((x) => board.endsWith(x.board))) fail('did-not-render', 'no device or browser frame to measure');
      for (let i = 0; i < n; i++) take(await page.evaluate(pageScan, { fi: i, ...SCAN_ARGS }));
      // a frame whose own label says it is in Privacy Mode but that draws nothing the gate knows as Privacy Mode
      const lost = await page.evaluate((mark) => window.__fit.frames().map((f) => ({ l: window.__fit.label(f), on: !!f.querySelector(mark) || [...f.querySelectorAll('[aria-label*="rivacy" i]')].some((c) => /visibility_off/.test(c.textContent || '')) })).filter((x) => /privacy (mode )?on|in privacy|privacy mode,? (masked|on)/i.test(x.l) && !x.on).map((x) => x.l), PRIV_MARK);
      for (const l of lost) fail('privacy-toggle-missing', 'a frame drawn in Privacy Mode shows no Privacy Mode control, mask or .privon the gate can find', l);
    }
  } catch (e) { if (e) fail('did-not-render', String(e).split('\n')[0].slice(0, 200)); }
  await ctx.close();
  return { rows, tickHits, scanned };
}

const click = (page, sel, text) => page.evaluate(([sel, text]) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); if (!b) return false; b.click(); return true; }, [sel, text]);

const DOORS5 = ['Desktop', 'Phone web', 'iPhone', 'iPad', 'Foldable'];
async function walkPrototype5(page, take, fail) {
  const doors = DOORS5.filter((d) => !DOORS_RE || new RegExp(DOORS_RE).test(d));
  if (!doors.length) die(`--doors ${JSON.stringify(DOORS_RE)} matches no door of Prototype v5 (${DOORS5.join(', ')})`);
  let walked = 0;
  const names = new Set();
  const privOn = () => page.evaluate(() => ({ st: !!(window.MP5 && window.MP5.state && window.MP5.state().priv), cls: !!document.querySelector('.pframe .privon, .pframe.privon') }));
  const toggle = async () => page.evaluate(() => { const b = document.querySelector('.ptop [data-go="priv"]'); if (!b) return false; b.click(); return true; });
  for (const door of doors) {
    if (!(await click(page, '.pseg button', door))) { fail('did-not-render', 'no door button ' + door); continue; }
    if (!(await click(page, '.pseg button', 'Light'))) fail('did-not-render', 'no Light theme button');
    const chapters = await page.evaluate(() => document.querySelectorAll('.pchaps .pch').length);
    if (!chapters) fail('did-not-render', 'no chapters', door);
    for (let c = 0; c < chapters; c++) {
      const cname = await page.evaluate((c) => document.querySelectorAll('.pchaps .pch')[c].textContent.trim(), c);
      names.add(cname);
      if (STEPS_RE && !new RegExp(STEPS_RE).test(cname)) continue;
      await page.evaluate((c) => document.querySelectorAll('.pchaps .pch')[c].click(), c);
      const steps = await page.evaluate(() => document.querySelectorAll('.psteps button').length);
      if (!steps) fail('did-not-render', 'no steps', `${door} · phase ${cname}`);
      for (let s = 0; s < steps; s++) {
        await page.evaluate((s) => document.querySelectorAll('.psteps button')[s].click(), s);
        await page.waitForTimeout(250);
        const label = `${door} · phase ${cname} · step ${s + 1}`;
        walked++;
        if (!(await page.evaluate(() => window.__fit.frames().length))) { fail('did-not-render', 'no frame', label); continue; }
        take(await page.evaluate(pageScan, { fi: 0, ...SCAN_ARGS, privAuto: false }), label);
        // Privacy Mode on, from the prototype's own toolbar, and off again
        const was = await privOn();
        if (was.st) { fail('privacy-toggle-missing', 'Privacy Mode was already on before the gate turned it on', label); continue; }
        if (!(await toggle())) { fail('privacy-toggle-missing', 'no Privacy toggle in the toolbar (.ptop [data-go="priv"])', label); continue; }
        await page.waitForTimeout(150);
        const on = await privOn();
        if (!on.st || !on.cls) { fail('privacy-toggle-missing', `the Privacy toggle did not take (state ${on.st}, .privon ${on.cls})`, label); continue; }
        take(await page.evaluate(pageScan, { fi: 0, ...SCAN_ARGS, forcePriv: true }), label + ' · Privacy Mode');
        await toggle();
        await page.waitForTimeout(100);
        if ((await privOn()).st) fail('privacy-toggle-missing', 'the Privacy toggle did not turn it off again', label);
      }
    }
  }
  if (!walked) die(`--steps ${JSON.stringify(STEPS_RE)} matches no step of Prototype v5 (its chapters: ${[...names].map((n) => JSON.stringify(n)).join(', ')})`);
}

const DOORS4 = ['Desktop', 'Phone web', 'iPhone'];
async function walkPrototype4(page, take, fail) {
  for (const door of DOORS4) {
    if (!(await click(page, '.pseg button', door))) { fail('did-not-render', 'no door button ' + door); continue; }
    await click(page, '.pseg button', 'Light');
    const steps = await page.evaluate(() => document.querySelectorAll('.psteps button').length);
    for (let s = 0; s < steps; s++) {
      await page.evaluate((s) => document.querySelectorAll('.psteps button')[s].click(), s);
      await page.waitForTimeout(400);
      const label = `${door} · step ${s + 1}`;
      if (!(await page.evaluate(() => window.__fit.frames().length))) { fail('did-not-render', 'no frame', label); continue; }
      take(await page.evaluate(pageScan, { fi: 0, ...SCAN_ARGS }), label);
    }
  }
}

// ---------- verdict ----------
function allowed(row) {
  return ALLOW.find((a) => a.board.split('|').some((b) => row.board.endsWith(b)) && a.types.includes(row.type) && a.elRe.test(row.el) && a.textRe.test(row.text) && (!a.framesRe || a.framesRe.test(row.label)));
}
function verdict(rows) {
  const g = new Map();
  for (const r of rows) {
    const a = allowed(r);
    if (a) { r.allowed = true; a.used = true; continue; }
    const k = [r.board, r.type, r.el, r.text].join('|');
    const x = g.get(k) || { ...r, labels: new Set(), engines: new Set(), pxs: new Set() };
    x.labels.add(r.label); x.engines.add(r.engine); if (r.px) x.pxs.add(r.px); g.set(k, x);
  }
  return [...g.values()];
}
function report(v) {
  for (const x of v) console.log(`FAIL ${x.board} · ${x.type} · ${JSON.stringify(x.text.slice(0, 80))}${x.pxs.size ? ' · ' + [...x.pxs].slice(0, 3).join(', ') : ''} · ${[...x.engines].join('+')} · ${x.labels.size} frame(s), e.g. ${[...x.labels][0]} · ${x.el}`);
}

async function run(design, list, engines) {
  const pw = playwright();
  const { server, port } = await serve(design);
  const rows = [], tickHits = {};
  let scanned = 0;
  try {
    for (const engine of engines) {
      const browser = await pw[engine].launch();
      try {
        const queue = list.slice();
        await Promise.all(Array.from({ length: Math.min(JOBS, list.length) }, async () => {
          while (queue.length) {
            const b = queue.shift();
            const r = await scanBoard(browser, port, b, engine);
            rows.push(...r.rows);
            scanned += r.scanned;
            for (const [s, n] of Object.entries(r.tickHits)) tickHits[s] = (tickHits[s] || 0) + n;
          }
        }));
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
  return { rows, tickHits, scanned };
}

// ---------- selftest ----------
// A small board of the gate's own, drawn with the kit's real tokens.css and ios.css in a copy of docs/design/ios-v1: an
// iPhone frame with each thing the gate looks at drawn right (a meter's benchmark tick on .mp-track.has-tick, a 40 px
// segment and a 31 px switch made 44 by their ::after hit areas, a hidden icon, a focusable span with a role, and a
// Privacy Mode frame whose amounts are masks). Each case breaks one thing and expects that refusal; the unmutated copy
// must show none of them (lesson 16). The prototype cases turn Prototype v5's redaction off, and take its toolbar's
// Privacy toggle away, on one step.
const FIXTURE = 'ios-v1/A11y selftest.dc.html';
const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>a11y selftest</title>
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="ios.css">
<style>
html, body { margin: 0; background: #ECEAE6; }
.dev { position: relative; width: 402px; height: 874px; overflow: hidden; background: #fff; border-radius: 40px; margin: 20px; }
.scr { padding: 60px 16px; display: flex; flex-direction: column; gap: 16px; }
.mtr { display: block; position: relative; height: 8px; }
.bartick { position: absolute; top: -2px; bottom: -2px; width: 2.5px; border-radius: 2px; background: #14171F; box-shadow: 0 0 0 1px #fff; pointer-events: none; }
.ms { font-family: sans-serif; }
.rov { display: flex; gap: 4px; } .rov > span { display: inline-flex; align-items: center; justify-content: center; min-width: 64px; min-height: 44px; }
</style></head><body>
<div class="dev mp t-light" data-screen-label="Selftest · Home">
 <div class="scr">
  <span class="mp-track has-tick mtr"><span class="mp-track-clip"><i style="display:block;width:60%;height:100%;background:#36a"></i></span><i class="bartick" style="left:70%"></i></span>
  <div class="mp-seg"><button class="mp-seg-i on" type="button">Month</button><button class="mp-seg-i" type="button">Year</button></div>
  <span class="mp-switch" role="switch" aria-checked="false" aria-label="Weekly check-in" tabindex="0"><span class="mp-switch-k"></span></span>
  <span class="gbtn lg" role="button" tabindex="0" aria-label="Ask" style="display:inline-flex;width:44px;height:44px;position:relative"><span class="ms" aria-hidden="true">chat_bubble</span></span>
  <div class="rov" role="tablist" aria-label="Range"><span role="tab" aria-selected="true" tabindex="0">Month</span><span role="tab" aria-selected="false" tabindex="-1">Year</span></div>
  <p>Net worth <span>£456,493</span></p>
 </div>
</div>
<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">
 <div class="scr">
  <button class="gbtn lg" type="button" aria-label="Privacy mode" aria-pressed="true" style="width:44px;height:44px"><span class="ms" aria-hidden="true">visibility_off</span></button>
  <p>Net worth <span class="mp-mask" role="img" aria-label="Hidden amount">£000,000</span></p>
  <p id="moved">Today <span class="mp-mask">£0</span> · 0.4%</p>
  <div class="mp-chartbox" role="img" aria-label="Net worth over a year: amounts hidden in privacy mode" style="height:80px"></div>
 </div>
</div>
</body></html>`;
const FX_CASES = [
  { name: 'tick-clipped', mutate: [/mp-track has-tick mtr/, 'mp-track mtr'], expect: 'tick-clipped', text: /bartick/ },
  { name: 'small-target-no-hit-area', mutate: [/<\/style>/, '.mp-switch::after { content: none; }\n</style>'], expect: 'small-target', text: /Weekly check-in/ },
  { name: 'small-target-plain', mutate: [/width:44px;height:44px;position:relative/, 'width:30px;height:30px;position:relative'], expect: 'small-target', text: /Ask/ },
  { name: 'not-focusable-role', mutate: [/role="button" tabindex="0" aria-label="Ask"/, 'role="button" aria-label="Ask"'], expect: 'not-focusable', text: /Ask/ },
  { name: 'not-focusable-listener', mutate: [/<\/body>/, '<script>const q = document.querySelector(".mtr"); q.style.cursor = "pointer"; q.addEventListener("click", () => {});</script></body>'], expect: 'not-focusable', el: /mtr/ },
  { name: 'roving-tablist-accepted', mutate: [/tabindex="0">Month<\/span><span role="tab" aria-selected="false" tabindex="-1">Year/, 'tabindex="-1">Month</span><span role="tab" aria-selected="false" tabindex="0">Year'], none: 'not-focusable' },
  { name: 'roving-tablist-none-reachable', mutate: [/tabindex="0">Month/, 'tabindex="-1">Month'], expect: 'not-focusable', text: /^(Month|Year) \(no member of its role=tablist is reachable\)$/ },
  { name: 'backdrop-hidden-accepted', mutate: [/ <\/div>\n<\/div>\n<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">/, ` </div>\n <div class="bd" aria-hidden="true" data-go="x:close" style="position:absolute;inset:0"></div><div role="dialog" aria-modal="true" aria-label="Sheet" style="position:absolute;left:0;right:0;bottom:0"><button type="button" data-go="x:close" style="width:64px;height:44px">Close</button></div>\n</div>\n<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">`], none: 'not-focusable' },
  { name: 'aria-hidden-acting-refused', mutate: [/ <\/div>\n<\/div>\n<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">/, ` </div>\n <div class="bd" aria-hidden="true" data-go="x:close" style="position:absolute;inset:0"></div>\n</div>\n<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">`], expect: 'not-focusable', el: /div\.bd/ },
  { name: 'backdrop-dialog-no-close-refused', mutate: [/ <\/div>\n<\/div>\n<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">/, ` </div>\n <div class="bd" aria-hidden="true" data-go="x:close" style="position:absolute;inset:0"></div><div role="dialog" aria-modal="true" aria-label="Sheet" style="position:absolute;left:0;right:0;bottom:0"><button type="button" data-go="x:other" style="width:64px;height:44px">Share</button></div>\n</div>\n<div class="dev mp t-light" data-screen-label="Selftest · Home in Privacy Mode">`], expect: 'not-focusable', el: /div\.bd/ },
  { name: 'icon-not-hidden', mutate: [/<span class="ms" aria-hidden="true">chat_bubble/, '<span class="ms">chat_bubble'], expect: 'icon-not-hidden', text: /^chat_bubble$/ },
  { name: 'aria-hidden-invalid', mutate: [/<span class="ms" aria-hidden="true">chat_bubble/, '<span class="ms" aria-hidden=\\"true\\">chat_bubble'], expect: 'aria-hidden-invalid', text: /^aria-hidden="(?!true")[^ ]*true[^ ]*" on chat_bubble$/ },
  { name: 'icon-hidden-by-a-bad-value', mutate: [/<span class="ms" aria-hidden="true">chat_bubble/, '<span class="ms" aria-hidden=\\"true\\">chat_bubble'], expect: 'icon-not-hidden', text: /^chat_bubble$/ },
  { name: 'privacy-leak-text', mutate: [/<span class="mp-mask">£0<\/span>/, '<span class="mp-mask">£96</span>'], expect: 'privacy-leak', text: /^text £96/ },
  { name: 'privacy-leak-aria', mutate: [/amounts hidden in privacy mode/, 'from £439,958 to £456,493'], expect: 'privacy-leak', text: /^aria-label £439,958/ },
  { name: 'privacy-leak-scrub', mutate: [/style="height:80px">/, 'style="height:80px" data-scrub="[{&quot;x&quot;:4,&quot;k&quot;:&quot;Thu 22 Oct&quot;,&quot;v&quot;:&quot;£439,958&quot;}]">'], expect: 'privacy-leak', text: /^data-scrub £439,958/ },
  { name: 'board-does-not-render', mutate: [/<p>Net worth <span>£456,493<\/span><\/p>/, '<p>{{ f.nw }}</p>'], expect: 'did-not-render', text: /settled|template/ },
];
// Prototype v5, one step at one door: its redaction turned off (amounts show with Privacy Mode on), and its toolbar's
// Privacy toggle taken away
const P5 = 'prototype-v5/Prototype v5.dc.html', P5_DOOR = '^iPhone$', P5_STEPS = '^3Currencies$';
const P5_CASES = [
  { name: 'prototype-privacy-leak', file: 'prototype-v5/prototype-v5-kit.js', mutate: [/function isPriv\(\) \{ return /, 'function isPriv() { return false && '], expect: 'privacy-leak', text: /[£₹$€]\s?[1-9]/ },
  { name: 'prototype-privacy-toggle-missing', file: 'prototype-v5/prototype-v5.js', mutate: [/'" data-go="priv"><span class="ms" aria-hidden="true">' \+ \(st\.priv/, `'" data-go="nopriv"><span class="ms" aria-hidden="true">' + (st.priv`], expect: 'privacy-toggle-missing', text: /no Privacy toggle/ },
];

async function selftest() {
  const pick = opt('--case');
  const names = [...FX_CASES, ...P5_CASES].map((c) => c.name);
  if (pick !== undefined && !names.includes(pick)) die(`no selftest case ${pick} (the cases: ${names.join(', ')})`);
  const fx = FX_CASES.filter((c) => !pick || c.name === pick), p5 = P5_CASES.filter((c) => !pick || c.name === pick);
  const engines = enginesOf('chromium');
  const pw = playwright();
  const made = [];
  const clean = () => { for (const d of made.splice(0)) fs.rmSync(d, { recursive: true, force: true }); };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGALRM']) process.on(sig, (s) => { clean(); process.exit(s === 'SIGINT' ? 130 : 143); });
  process.on('exit', clean);   // a stop on the way (die) leaves no copy behind either
  // a copy of the folders the boards load from, with the fixture written into it; a mutation changes one file
  const copy = (file, mut) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-live-'));
    made.push(dir);
    for (const d of ['app-v1', 'ios-v1', 'ds-v1', 'prototype-v5']) fs.cpSync(path.join(DESIGN, d), path.join(dir, d), { recursive: true });
    fs.writeFileSync(path.join(dir, FIXTURE), FIXTURE_HTML);
    if (mut) {
      const f = path.join(dir, file);
      const s = fs.readFileSync(f, 'utf8');
      if (!mut[0].test(s)) throw new Error(`selftest: the mutation does not apply to ${file}: ${mut[0]}`);
      fs.writeFileSync(f, s.replace(mut[0], mut[1]));
    }
    return dir;
  };
  let wrong = 0;
  try {
    for (const engine of engines) {
      const browser = await pw[engine].launch();
      try {
        const scanIn = async (dir, board) => { const { server, port } = await serve(dir); try { return (await scanBoard(browser, port, board, engine)).rows; } finally { server.close(); } };
        const tasks = [];
        if (fx.length) tasks.push({ kind: 'baseline', board: FIXTURE, dir: copy() });
        for (const c of fx) tasks.push({ kind: 'case', c, board: FIXTURE, dir: copy(FIXTURE, c.mutate) });
        if (p5.length) tasks.push({ kind: 'baseline', board: P5, dir: copy() });
        for (const c of p5) tasks.push({ kind: 'case', c, board: P5, dir: copy(c.file, c.mutate) });
        const results = new Array(tasks.length), queue = tasks.map((t, k) => k);
        await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => { while (queue.length) { const k = queue.shift(); results[k] = await scanIn(tasks[k].dir, tasks[k].board); } }));
        const key = (r) => [r.label, r.type, r.text, r.el].join('|');
        const base = new Map();
        tasks.forEach((t, k) => { if (t.kind === 'baseline') base.set(t.board, results[k]); });
        tasks.forEach((t, k) => {
          const rows = results[k];
          if (t.kind === 'baseline') {
            // the unmutated fixture shows no fault at all; the unmutated prototype step shows none of the classes its cases test
            const classes = t.board === FIXTURE ? null : new Set(['privacy-leak', 'privacy-toggle-missing', 'did-not-render']);
            const v = verdict(rows.filter((r) => !classes || classes.has(r.type)));
            console.log(`${v.length ? 'FAIL' : 'ok  '} selftest baseline ${t.board} (${engine}): ${v.length} faults${classes ? ' of ' + [...classes].join(', ') : ''}${v.length ? ' (' + v.slice(0, 3).map((g) => g.type + ' ' + g.text.slice(0, 50)).join('; ') + ')' : ''}`);
            wrong += v.length ? 1 : 0;
            return;
          }
          const c = t.c;
          const had = new Set(base.get(t.board).map(key));
          const fresh = verdict(rows.filter((r) => !had.has(key(r))));
          if (c.none) {
            // an acceptance case: the mutated copy shows no fault of this class at all
            const v = verdict(rows).filter((g) => g.type === c.none);
            console.log(`${v.length ? 'FAIL' : 'ok  '} selftest ${c.name} (${engine}): ${v.length ? v.length + ' ' + c.none + ' faults (' + v.slice(0, 2).map((g) => g.text.slice(0, 50)).join('; ') + ')' : 'accepted, no ' + c.none + ' fault'}`);
            wrong += v.length ? 1 : 0;
            return;
          }
          const hit = fresh.filter((g) => g.type === c.expect && (!c.text || c.text.test(g.text)) && (!c.el || c.el.test(g.el)));
          const ok = hit.length > 0;
          console.log(`${ok ? 'ok  ' : 'FAIL'} selftest ${c.name} (${engine}): ${ok ? 'refused for the right reason (' + hit[0].type + ' ' + JSON.stringify(hit[0].text.slice(0, 60)) + (hit[0].px ? ' ' + hit[0].px : '') + ')' : 'not refused (' + fresh.length + ' other faults' + (fresh.length ? ': ' + fresh.slice(0, 3).map((g) => g.type + ' ' + g.text.slice(0, 40)).join('; ') : '') + ')'}`);
          wrong += ok ? 0 : 1;
        });
      } finally { await browser.close(); }
    }
  } finally { clean(); }
  console.log(`a11y-live selftest: ${wrong} cases wrong`);
  process.exit(wrong ? 1 : 0);
}

module.exports = { boards, allowed, verdict, TICKS, TARGETS, ACTS };
if (require.main === module) (async () => {
  if (args.includes('--selftest')) {
    // the prototype cases walk one door's first chapter
    if (!DOORS_RE) DOORS_RE = P5_DOOR;
    if (!STEPS_RE) STEPS_RE = P5_STEPS;
    return selftest();
  }
  const list = boards(DESIGN);
  if (!list.length) die(ONLY ? `--only ${JSON.stringify(ONLY)} matches no board` : 'no boards');
  const engines = enginesOf('chromium');
  const { rows, tickHits, scanned } = await run(DESIGN, list, engines);
  const v = verdict(rows);
  report(v);
  const full = !ONLY && !DOORS_RE && !STEPS_RE;
  for (const a of ALLOW) if (!a.used && list.some((b) => a.board.split('|').some((x) => b.endsWith(x)))) console.log(`NOTE allowance no longer matches anything: ${a.board} · ${a.types.join('/')} · ${a.el || ''} · ${a.text || ''}`);
  if (full) for (const s of TICKS) if (!tickHits[s]) console.log(`NOTE the tick list names ${s}, which no live board draws`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 1));
  const by = {};
  for (const x of v) by[x.type] = (by[x.type] || 0) + 1;
  console.log(`a11y-live: ${list.length} boards in ${engines.join(' and ')} (${scanned} frames and prototype states measured), ${v.length} faults${v.length ? ' (' + Object.entries(by).map(([k, n]) => k + ' ' + n).join(', ') + ')' : ''}`);
  process.exit(v.length ? 1 : 0);
})().catch((e) => { console.error('a11y_live:', e && e.stack || e); process.exit(2); });
