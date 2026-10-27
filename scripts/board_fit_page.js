// The page half of scripts/board_fit.js (MA-240): injected into a rendered board, it finds every device and browser
// frame (window.__fit.frames()) and reports what is wrong inside one at its current size (window.__fit.scan(i)):
// text clipped mid-word by a box that does not scroll (clip-x, clip-y), text running past its box (spill), text on
// text (overlap; over a glass bar, a sheet or the system's own chrome it is the scroll edge, reported apart), a box cut
// at the screen's edge outside a row that scrolls (cut-at-edge), an icon showing as its name (icon-as-word), and a
// bar's empty track that is not the --mp-track token (track-not-token). Text scrolled or paged out of view is not a fault.
(() => {
  const PX = 1.5;
  const vis = (e) => {
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
      if (n.classList && (n.classList.contains('sr-only') || n.classList.contains('vh'))) return false;
    }
    const r = e.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const frames = () => {
    const set = new Set([...document.querySelectorAll('.dev, .bf, .pframe, [data-mo-frame-root]')]);
    // keep outermost frames only
    return [...set].filter((f) => ![...set].some((g) => g !== f && g.contains(f)));
  };
  const label = (f) => {
    const l = f.getAttribute('data-screen-label');
    if (l) return l;
    for (let n = f; n; n = n.parentElement) {
      const p = n.previousElementSibling;
      if (p && /bd-theme|dv-cap|bd-h|fcap|cap/.test(p.className) && p.textContent.trim()) return p.textContent.trim().slice(0, 90);
      if (n.getAttribute && n.getAttribute('data-screen-label')) return n.getAttribute('data-screen-label');
    }
    return '';
  };
  const section = (f) => {
    for (let n = f; n; n = n.parentElement) {
      if (n.classList && n.classList.contains('dv-opt')) {
        const nm = n.querySelector('.dv-oname, .bd-name');
        if (nm) return nm.textContent.trim().slice(0, 90);
      }
      const nm = n.querySelector && n.querySelector(':scope > .bd-h .bd-name, :scope > .dv-olabel .dv-oname');
      if (nm) return nm.textContent.trim().slice(0, 90);
    }
    return '';
  };
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  const textRects = (e) => {
    const out = [];
    for (const t of ownText(e)) {
      const r = document.createRange();
      r.selectNodeContents(t);
      for (const x of r.getClientRects()) if (x.width > 0.5 && x.height > 0.5) out.push(x);
    }
    return out;
  };
  const union = (rs) => rs.reduce((a, r) => ({ l: Math.min(a.l, r.left), t: Math.min(a.t, r.top), r: Math.max(a.r, r.right), b: Math.max(a.b, r.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
  const clipBox = (n) => {
    const r = n.getBoundingClientRect();
    const l = r.left + n.clientLeft, t = r.top + n.clientTop;
    return { l, t, r: l + n.clientWidth, b: t + n.clientHeight };
  };
  const isGlassy = (e, f) => {
    for (let n = e; n && n !== f; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((cs.position === 'absolute' || cs.position === 'fixed' || cs.position === 'sticky') && (cs.backdropFilter !== 'none' || /\b(lg|tabdock|tabbar|composer|edge-bot|edge-top|toolbar|sbar|homebar|island|navbar|mp-tabbar|cbar|pstat|sheet|scrim|menu|pop|toast|banner)\b/.test(n.className))) return true;
    }
    return false;
  };
  const isOverlay = (e, f) => {
    for (let n = e; n && n !== f; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((cs.position === 'absolute' || cs.position === 'fixed') && parseInt(cs.zIndex || '0') > 0) return true;
      if (/\b(sheet|scrim|menu|popover|pop|toast|dialog|modal|alert)\b/.test(n.className)) return true;
    }
    return false;
  };
  const snippet = (e) => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70);
  const path = (e, f) => {
    const parts = [];
    for (let n = e; n && n !== f && parts.length < 4; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''));
    return parts.join(' > ');
  };

  const scan = (fi) => {
    const f = frames()[fi];
    if (!f || !vis(f)) return null;
    const fr = clipBox(f);
    const issues = [];
    const all = [...f.querySelectorAll('*')];
    const texts = [];
    for (const e of all) {
      if (e.closest('svg') && e.tagName.toLowerCase() !== 'text') continue;
      if (!ownText(e).length) continue;
      if (!vis(e)) continue;
      const rs = textRects(e);
      if (!rs.length) continue;
      texts.push({ e, rs, u: union(rs) });
    }
    // 1. text clipped by an ancestor (or the frame)
    const inter = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
    const empty = (a) => a.r - a.l < 0.5 || a.b - a.t < 0.5;
    const shown = [];
    for (const t of texts) {
      const { e, u } = t;
      const cs = getComputedStyle(e);
      // the clip chain from the element up to the frame
      const chain = [];
      for (let n = e; n; n = n.parentElement) {
        const ncs = getComputedStyle(n);
        if (ncs.overflowX !== 'visible' || ncs.overflowY !== 'visible') chain.push({ n, cs: ncs, b: clipBox(n) });
        if (n === f) break;
      }
      let v = { ...u };
      for (const c of chain) v = inter(v, c.b);
      if (empty(v)) continue; // scrolled or paged out of view: not a fault
      t.chain = chain;
      shown.push(t);
      const ellOwner = chain.find((c) => c.cs.textOverflow === 'ellipsis' && c.n.scrollWidth > c.n.clientWidth + 1 && c.b.b - c.b.t < 80);
      if (ellOwner || (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1)) {
        const o = ellOwner ? ellOwner.n : e;
        issues.push({ type: 'ellipsis', text: snippet(o), el: path(o, f), w: Math.round(o.clientWidth), need: o.scrollWidth });
        continue;
      }
      let pastScrollerX = false;
      for (const c of chain) {
        const b = c.b, ox = c.cs.overflowX, oy = c.cs.overflowY;
        const scrollerX = pastScrollerX || ox === 'auto' || ox === 'scroll', scrollerY = oy === 'auto' || oy === 'scroll';
        if (ox === 'auto' || ox === 'scroll') pastScrollerX = true;   // inside a row that scrolls sideways, its own edge is the only edge
        const partialX = (u.r > b.r + PX && u.l < b.r - 1) || (u.l < b.l - PX && u.r > b.l + 1);
        if (ox !== 'visible' && !scrollerX && partialX) {
          issues.push({ type: 'clip-x', text: snippet(e), el: path(e, f), by: path(c.n, f), px: Math.round(Math.max(u.r - b.r, b.l - u.l)) });
          break;
        }
        const small = b.b - b.t < 180 && c.n !== f;
        const partialY = (u.b > b.b + PX && u.t < b.b - 1) || (u.t < b.t - PX && u.b > b.t + 1);
        if (oy !== 'visible' && !scrollerY && small && partialY) {
          issues.push({ type: 'clip-y', text: snippet(e), el: path(e, f), by: path(c.n, f), px: Math.round(Math.max(u.b - b.b, b.t - u.t)) });
          break;
        }
      }
      if (cs.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2 && cs.display !== 'inline' && e.clientWidth > 0) {
        const p = e.parentElement;
        const pb = p ? p.getBoundingClientRect() : null;
        if (pb && v.r > pb.right + PX) issues.push({ type: 'spill', text: snippet(e), el: path(e, f), px: Math.round(v.r - pb.right) });
      }
      if (e.classList.contains('ms') || /material/i.test(cs.fontFamily)) {
        const fs = parseFloat(cs.fontSize);
        if (u.r - u.l > fs * 1.7) issues.push({ type: 'icon-as-word', text: snippet(e), el: path(e, f) });
      }
      // visible line rects for the overlap pass
      t.vrs = t.rs.map((r) => { let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }; for (const c of chain) x = inter(x, c.b); return x; }).filter((x) => !empty(x));
    }
    // 2. text over text
    const lines = [];
    shown.forEach((t, i) => (t.vrs || []).forEach((x) => lines.push({ i, r: { left: x.l, top: x.t, right: x.r, bottom: x.b, height: x.b - x.t } })));
    const seen = new Set();
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a], B = lines[b];
      if (A.i === B.i) continue;
      const ea = shown[A.i].e, eb = shown[B.i].e;
      if (ea.contains(eb) || eb.contains(ea)) continue;
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      const mh = Math.min(A.r.height, B.r.height);
      if (w > 3 && h > mh * 0.35) {
        const key = A.i + ':' + B.i;
        if (seen.has(key)) continue;
        seen.add(key);
        const chrome = !!(ea.closest('.sbar, .island, .homebar, .pstat') || eb.closest('.sbar, .island, .homebar, .pstat'));
        const glass = chrome || isGlassy(ea, f) !== isGlassy(eb, f);
        const overlay = isOverlay(ea, f) || isOverlay(eb, f);
        issues.push({ type: glass ? 'under-glass' : overlay ? 'overlap-overlay' : 'overlap', text: snippet(ea) + '  ⟂  ' + snippet(eb), el: path(ea, f) + '  ⟂  ' + path(eb, f), px: Math.round(w) + 'x' + Math.round(h) });
      }
    }
    // 3. boxes cut at the screen edge (horizontal), not inside a horizontal scroller
    for (const e of all) {
      if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right <= fr.r + PX && r.left >= fr.l - PX) continue;
      if (!vis(e)) continue;
      let inScroller = false, clippedInside = false;
      for (let n = e.parentElement; n && n !== f; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') { inScroller = true; break; }
        if (cs.overflowX !== 'visible') { const b = clipBox(n); if (b.r <= fr.r + PX && b.l >= fr.l - PX) { clippedInside = true; break; } }
      }
      if (inScroller || clippedInside) continue;
      // only report the outermost offender
      const p = e.parentElement;
      if (p && p !== f) { const pr = p.getBoundingClientRect(); if (pr.right > fr.r + PX || pr.left < fr.l - PX) continue; }
      const cs = getComputedStyle(e);
      if (cs.position === 'absolute' && r.left >= fr.r) continue; // parked off-screen on purpose
      issues.push({ type: 'cut-at-edge', text: snippet(e), el: path(e, f), px: Math.round(Math.max(r.right - fr.r, fr.l - r.left)) });
    }
    // 4. a bar's empty track is the token, so it holds at 25% brightness on every background
    const want = getComputedStyle(f).getPropertyValue('--mp-track').trim().toLowerCase();
    if (want) {
      const probe = document.createElement('i');
      probe.style.cssText = 'position:absolute;width:0;height:0;background:' + want;
      f.appendChild(probe);
      const tok = getComputedStyle(probe).backgroundColor;
      probe.remove();
      for (const e of f.querySelectorAll('.mp-track')) {
        if (!vis(e) || e.getBoundingClientRect().height > 16 || e.classList.contains('on')) continue;   // a bar's track is thin; a segmented control that borrows the class is not one
        const bg = getComputedStyle(e).backgroundColor;
        if (bg !== tok && bg !== 'rgba(0, 0, 0, 0)') issues.push({ type: 'track-not-token', text: snippet(e) || e.className, el: path(e, f), px: bg + ' not ' + tok });
      }
    }
    return { label: label(f), section: section(f), w: Math.round(fr.r - fr.l), h: Math.round(fr.b - fr.t), issues };
  };
  window.__fit = { frames, scan, label, section, clipBox };
})();
