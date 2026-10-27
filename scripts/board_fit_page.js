// The page half of scripts/board_fit.js (MA-240): injected into a rendered board, it finds every device and browser
// frame (window.__fit.frames(); frames(true) adds the device windows drawn inside another frame, such as the Stage
// Manager window) and reports what is wrong inside one at its current size (window.__fit.scan(i)): text clipped
// mid-word by a box that does not scroll (clip-x, clip-y), text running past its box (spill), text on text (overlap;
// over a glass bar, a sheet or the system's own chrome it is the scroll edge, reported apart), a box cut at the screen's
// edge outside a row that scrolls (cut-at-edge), an icon showing as its name (icon-as-word), a bar's empty track that is
// not the --mp-track token (track-not-token) and a chart's range band that is not the --mp-band token (band-not-token).
// Text scrolled or paged out of view is not a fault. A frame drawn under CSS zoom or a scale is measured in the size it
// is shown at. window.__fit.steps(i) scans again at every step of each vertical scroller in the frame, and
// window.__fit.extent(i) says how tall the frame's content runs, so the gate can grow a clipping frame and see it whole.
// window.__fit.widths(i, ...) finds the frame widths at which each container query that styles the frame changes, and
// window.__fit.thinned(i) lists the axis labels motion.js hid in a frame, which the gate refuses at the drawn size.
(() => {
  const PX = 1.5;
  // computed styles and visibility, remembered for the length of one scan (nothing moves during it)
  let CS = null, VM = null;
  const cs = (n) => { if (!CS) return getComputedStyle(n); let s = CS.get(n); if (!s) { s = getComputedStyle(n); CS.set(n, s); } return s; };
  const shown = (n) => {
    if (!n || n.nodeType !== 1) return true;
    if (VM && VM.has(n)) return VM.get(n);
    const s = cs(n);
    const ok = !(s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05 || (n.classList && (n.classList.contains('sr-only') || n.classList.contains('vh')))) && shown(n.parentElement);
    if (VM) VM.set(n, ok);
    return ok;
  };
  const vis = (e) => {
    if (!shown(e)) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const FRAME_SEL = '.dev, .bf, .pframe, .brw, [data-mo-frame-root]';
  // the outermost frames; with all, the device windows drawn inside another frame follow them, so an outer frame's
  // index is the same in both lists
  const frames = (all) => {
    const set = [...document.querySelectorAll(FRAME_SEL)];
    const outer = set.filter((f) => !set.some((g) => g !== f && g.contains(f)));
    if (!all) return outer;
    return outer.concat(set.filter((f) => f.classList.contains('dev') && !outer.includes(f)));
  };
  const outerOf = (f) => { for (let n = f.parentElement; n; n = n.parentElement) if (n.matches && n.matches(FRAME_SEL)) return n; return null; };
  const label = (f) => {
    const l = f.getAttribute('data-screen-label');
    if (l) return l;
    const o = outerOf(f);
    if (o) return label(o) + ' · the window inside';
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
  // How much a box is scaled on screen: getBoundingClientRect() is in the shown size, under CSS zoom and transforms,
  // while clientWidth, clientLeft and the computed font size are in the box's own size, so the two must not be added
  // unscaled (an iPhone frame drawn at zoom 0.8 measured a quarter too wide). An SVG box takes its HTML parent's scale.
  const scaleOf = (n) => {
    for (let m = n; m && m.nodeType === 1; m = m.parentElement) {
      if (m instanceof HTMLElement && m.offsetWidth > 0 && m.offsetHeight > 0) {
        const r = m.getBoundingClientRect();
        let sx = r.width / m.offsetWidth, sy = r.height / m.offsetHeight;
        if (Math.abs(sx - 1) < 0.01) sx = 1;
        if (Math.abs(sy - 1) < 0.01) sy = 1;
        return { sx, sy };
      }
    }
    return { sx: 1, sy: 1 };
  };
  const clipBox = (n) => {
    const r = n.getBoundingClientRect();
    const { sx, sy } = scaleOf(n);
    const l = r.left + n.clientLeft * sx, t = r.top + n.clientTop * sy;
    return { l, t, r: l + n.clientWidth * sx, b: t + n.clientHeight * sy };
  };
  // The surface a text is drawn on: the nearest ancestor that floats over what lies under it, or the system's own chrome
  // (the status bar, the island, the home bar, the keypad, an iOS navigation bar) and the chat's composer over its
  // conversation. A box floats when it is absolute, fixed or sticky and painted (a background, a backdrop filter) or
  // raised (a z-index above 0); a relative box floats only when it is both, since a wrapper raised above a glass's own
  // layer (.sheet > *, .lg > *, a tab, a strip's figure) is still on that glass. Two lines on different surfaces are
  // content scrolling under a bar, a sheet or a toast; two lines on the same surface touching is a fault. A row of chips
  // or suggestions is content, never chrome by its class: it floats only inside a container that does.
  const CHROME_SEL = '.sbar, .island, .homebar, .pstat, .kpad, .nav, .composer, .cmp, .chcomp, .wcomp, .pcomp, .wfield, .wsend';
  const layerOf = (e, f) => {
    for (let n = e; n && n !== f; n = n.parentElement) {
      if (n.matches && n.matches(CHROME_SEL)) return n;
      const s = cs(n);
      if (s.position === 'static') continue;
      const painted = (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') || s.backgroundImage !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none');
      const raised = s.zIndex !== 'auto' && parseInt(s.zIndex, 10) > 0;
      if (s.position === 'relative' ? (painted && raised) : (painted || raised)) return n;
    }
    return f;
  };
  const snippet = (e) => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70);
  const path = (e, f) => {
    const parts = [];
    for (let n = e; n && n !== f && parts.length < 4; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''));
    return parts.join(' > ');
  };
  // a colour as the browser writes it, so a token and a computed value compare
  const colour = (f, v) => {
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;width:0;height:0;color:' + v;
    f.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  };

  const scan = (fi) => {
    const f = frames(true)[fi];
    if (!f) return null;
    CS = new Map(); VM = new Map();
    try { return vis(f) ? scanFrame(f) : null; } finally { CS = null; VM = null; }
  };
  const scanFrame = (f) => {
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
    const shownTexts = [];
    for (const t of texts) {
      const { e, u } = t;
      const ecs = cs(e);
      // the clip chain from the element up to the frame (an inline box clips nothing, whatever its overflow says)
      const chain = [];
      for (let n = e; n; n = n.parentElement) {
        const ncs = cs(n);
        if ((ncs.overflowX !== 'visible' || ncs.overflowY !== 'visible') && !/^(inline|contents)$/.test(ncs.display)) chain.push({ n, cs: ncs, b: clipBox(n) });
        if (n === f) break;
      }
      let v = { ...u };
      for (const c of chain) v = inter(v, c.b);
      if (empty(v)) continue; // scrolled or paged out of view: not a fault
      t.chain = chain;
      shownTexts.push(t);
      const { sx } = scaleOf(e);
      const fs = parseFloat(ecs.fontSize) * sx;   // the font size as shown
      // an ellipsis is drawn only by a block box: on a flex or grid box the text is cut with none, so that is a clip
      const drawsEllipsis = (c) => !/flex|grid/.test(c.display);
      const ellOwner = chain.find((c) => c.cs.textOverflow === 'ellipsis' && drawsEllipsis(c.cs) && c.n.scrollWidth > c.n.clientWidth + 1 && c.b.b - c.b.t < 80);
      if (ellOwner || (ecs.textOverflow === 'ellipsis' && drawsEllipsis(ecs) && e.scrollWidth > e.clientWidth + 1)) {
        const o = ellOwner ? ellOwner.n : e;
        issues.push({ type: 'ellipsis', text: snippet(o), el: path(o, f), w: Math.round(o.clientWidth), need: o.scrollWidth });
        t.vrs = t.rs.map((r) => { let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }; for (const c of chain) x = inter(x, c.b); return x; }).filter((x) => !empty(x));
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
      if (ecs.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2 && ecs.display !== 'inline' && e.clientWidth > 0) {
        const p = e.parentElement;
        const pb = p ? p.getBoundingClientRect() : null;
        if (pb && v.r > pb.right + PX) issues.push({ type: 'spill', text: snippet(e), el: path(e, f), px: Math.round(v.r - pb.right) });
      }
      {
        const lines = new Set(t.rs.map((r) => Math.round(r.top))).size, chars = ownText(e).reduce((n, x) => n + x.textContent.trim().length, 0);
        if (((lines >= 4 && chars / lines < 8) || (lines >= 3 && chars / lines < 5)) && (v.r - v.l) < 9 * fs && /\s/.test(ownText(e).map((x) => x.textContent.trim()).join(' '))) issues.push({ type: 'crushed', text: snippet(e), el: path(e, f), px: lines + ' lines in ' + Math.round(v.r - v.l) });
      }
      if (e.classList.contains('ms') || /material/i.test(ecs.fontFamily)) {
        if (u.r - u.l > fs * 1.7) issues.push({ type: 'icon-as-word', text: snippet(e), el: path(e, f) });
      }
      // visible line rects for the overlap pass
      t.vrs = t.rs.map((r) => { let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }; for (const c of chain) x = inter(x, c.b); return x; }).filter((x) => !empty(x));
    }
    // 2. text over text
    const lines = [];
    shownTexts.forEach((t, i) => (t.vrs || []).forEach((x) => lines.push({ i, r: { left: x.l, top: x.t, right: x.r, bottom: x.b, height: x.b - x.t } })));
    lines.sort((a, b) => a.r.top - b.r.top);
    const seen = new Set();
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length && lines[b].r.top < lines[a].r.bottom; b++) {
      const A = lines[a], B = lines[b];
      if (A.i === B.i) continue;
      const ea = shownTexts[A.i].e, eb = shownTexts[B.i].e;
      if (ea.contains(eb) || eb.contains(ea)) continue;
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      const mh = Math.min(A.r.height, B.r.height);
      if (w > 3 && h > mh * 0.35) {
        const [x, y] = A.i < B.i ? [A, B] : [B, A];
        const key = x.i + ':' + y.i;
        if (seen.has(key)) continue;
        seen.add(key);
        const ex = shownTexts[x.i].e, ey = shownTexts[y.i].e;
        const under = layerOf(ex, f) !== layerOf(ey, f);
        issues.push({ type: under ? 'under-layer' : 'overlap', text: snippet(ex) + '  ⟂  ' + snippet(ey), el: path(ex, f) + '  ⟂  ' + path(ey, f), px: Math.round(w) + 'x' + Math.round(h) });
      }
    }
    // 3. boxes cut at the screen edge (horizontal), not inside a horizontal scroller
    const clipsY = cs(f).overflowY !== 'visible';
    for (const e of all) {
      if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right <= fr.r + PX && r.left >= fr.l - PX) continue;
      if (!vis(e)) continue;
      let inScroller = false, clippedInside = false;
      for (let n = e.parentElement; n && n !== f; n = n.parentElement) {
        const ncs = cs(n);
        if (ncs.overflowX === 'auto' || ncs.overflowX === 'scroll') { inScroller = true; break; }
        if (ncs.overflowX !== 'visible' && !/^(inline|contents)$/.test(ncs.display)) { const b = clipBox(n); if (b.r <= fr.r + PX && b.l >= fr.l - PX) { clippedInside = true; break; } }
      }
      if (inScroller || clippedInside) continue;
      // only report the outermost offender
      const p = e.parentElement;
      if (p && p !== f) { const pr = p.getBoundingClientRect(); if (pr.right > fr.r + PX || pr.left < fr.l - PX) continue; }
      if (cs(e).position === 'absolute' && r.left >= fr.r) continue; // parked off-screen on purpose
      // a box wholly below or above a frame that clips it is out of view (the gate grows the frame to see it)
      if (clipsY && (r.top >= fr.b || r.bottom <= fr.t)) continue;
      issues.push({ type: 'cut-at-edge', text: snippet(e), el: path(e, f), px: Math.round(Math.max(r.right - fr.r, fr.l - r.left)) });
    }
    // 4. a bar's empty track is the token, so it holds at 25% brightness on every background
    const want = cs(f).getPropertyValue('--mp-track').trim().toLowerCase();
    if (want) {
      const probe = document.createElement('i');
      probe.style.cssText = 'position:absolute;width:0;height:0;background:' + want;
      f.appendChild(probe);
      const tok = getComputedStyle(probe).backgroundColor;
      probe.remove();
      for (const e of f.querySelectorAll('.mp-track')) {
        if (!vis(e) || e.getBoundingClientRect().height > 16 || e.classList.contains('on')) continue;   // a bar's track is thin; a segmented control that borrows the class is not one
        const bg = cs(e).backgroundColor;
        if (bg !== tok && bg !== 'rgba(0, 0, 0, 0)') issues.push({ type: 'track-not-token', text: snippet(e) || e.className, el: path(e, f), px: bg + ' not ' + tok });
      }
    }
    // 5. a chart's range band is the token, so it reads at 25% brightness on the hero and on a card
    for (const e of f.querySelectorAll('.fband')) {
      if (!vis(e)) continue;
      const s = cs(e);
      const raw = s.getPropertyValue('--mp-band').trim();
      const tok = raw ? colour(f, raw) : '';
      const fill = /^(none|url)/.test(s.fill) ? s.fill : colour(f, s.fill);
      const op = parseFloat(s.fillOpacity);
      if (!tok || fill !== tok || Math.abs(op - 1) > 0.001) issues.push({ type: 'band-not-token', text: 'range band filled ' + fill + (op !== 1 ? ' at ' + op : '') + ', not --mp-band ' + (tok || '(not defined here)'), el: path(e, f), px: fill + ' not ' + tok });
    }
    return { label: label(f), section: section(f), w: Math.round(fr.r - fr.l), h: Math.round(fr.b - fr.t), issues };
  };

  // every vertical scroller in frame i, stepped through its range a three-quarter screen at a time and scanned at each
  // step, then put back where it was drawn
  const scrollers = (f) => [...f.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return /auto|scroll/.test(s.overflowY) && e.clientHeight > 40 && e.scrollHeight > e.clientHeight + 24 && vis(e); });
  // a jump, never a smooth scroll a stylesheet may ask for
  const jump = (s, top) => { const b = s.style.getPropertyValue('scroll-behavior'), p = s.style.getPropertyPriority('scroll-behavior'); s.style.setProperty('scroll-behavior', 'auto', 'important'); s.scrollTop = top; if (b) s.style.setProperty('scroll-behavior', b, p); else s.style.removeProperty('scroll-behavior'); };
  const steps = (fi) => {
    const f = frames(true)[fi];
    if (!f) return [];
    const out = [];
    for (const s of scrollers(f)) {
      const keep = s.scrollTop, max = s.scrollHeight - s.clientHeight, step = Math.max(40, Math.floor(s.clientHeight * 0.75));
      for (let top = 0; ; top = Math.min(max, top + step)) {
        if (Math.abs(top - keep) > 1) { jump(s, top); const x = scan(fi); if (x) out.push(x); }
        if (top >= max) break;
      }
      jump(s, keep);
    }
    return out;
  };
  // the diff's view of the same scrollers: where each stands and how far it goes, and a jump to a spot
  const scrolls = (fi) => scrollers(frames(true)[fi]).map((s) => ({ top: s.scrollTop, max: s.scrollHeight - s.clientHeight, client: s.clientHeight }));
  const scrollTo = (fi, k, top) => { const s = scrollers(frames(true)[fi])[k]; if (s) jump(s, top); };
  // where frame i's content runs to, in the frame's own size: a clipping frame drawn shorter than its content hides the
  // rest, so the gate grows it to this height and scans again
  const extent = (fi) => {
    const f = frames(true)[fi];
    if (!f) return null;
    CS = new Map(); VM = new Map();
    try {
      const fr = f.getBoundingClientRect(), { sy } = scaleOf(f);
      let b = 0;
      for (const e of f.querySelectorAll('*')) {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.bottom - fr.top <= b || !shown(e)) continue;
        b = r.bottom - fr.top;
      }
      const s = getComputedStyle(f);
      return { h: f.offsetHeight, need: Math.ceil(b / sy), clips: s.overflowY !== 'visible' || s.overflowX !== 'visible', scrollers: scrollers(f).length };
    } finally { CS = null; VM = null; }
  };

  // The container queries in the page's style sheets: each rule's container name, the widths at which it starts or stops
  // matching, and the selectors it styles. A rule whose condition the gate cannot read is returned apart, so the gate
  // fails rather than skip it.
  let QUERIES = null;
  const queries = () => {
    if (QUERIES) return QUERIES;
    const out = { rules: [], unread: [] };
    const sels = (rules, acc) => { for (const x of rules) { if (x.selectorText) acc.push(x.selectorText); else if (x.cssRules) sels(x.cssRules, acc); } return acc; };
    const walk = (rules) => {
      for (const r of rules) {
        if (typeof CSSContainerRule !== 'undefined' && r instanceof CSSContainerRule) {
          // the name and the query apart where the engine gives them so; else both from the condition's text
          const text = r.conditionText || '';
          const name = r.containerName !== undefined ? r.containerName : ((text.match(/^\s*([a-zA-Z_-][\w-]*)\s+[(a-z]/) || [])[1] || '');
          const cond = r.containerQuery !== undefined ? r.containerQuery : text;
          const ts = [];
          for (const m of cond.matchAll(/\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)/g)) ts.push(m[1] === 'min' ? +m[2] : +m[2] + 1);
          for (const m of cond.matchAll(/\(\s*width\s*(>=|>|<=|<)\s*([\d.]+)px\s*\)/g)) ts.push(m[1] === '>=' || m[1] === '<' ? +m[2] : +m[2] + 1);
          if (!ts.length) out.unread.push(name + ' ' + cond);
          else out.rules.push({ name, ts, sels: sels(r.cssRules, []) });
          walk(r.cssRules);
        } else if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const s of document.styleSheets) {
      let rules = null;
      try { rules = s.cssRules; } catch (e) { if (!s.href || new URL(s.href).origin === location.origin) out.unread.push('a style sheet that cannot be read: ' + (s.href || 'inline')); continue; }
      walk(rules);
    }
    return (QUERIES = out);
  };
  const unreadQueries = () => queries().unread;
  // the content-box width a container query reads
  const inline = (c) => { const s = getComputedStyle(c); return c.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); };
  // The frame widths, from lo to hi, at which each container that a query styles inside frame i is one pixel below and
  // at the query's threshold. Below 1024 a frame drawn with the page and the chat beside shows its page alone (both), so
  // the search runs on each side of 1024 apart. Each width is found by measuring, not assumed, so a page beside a sidebar
  // and a chat is met at its own threshold.
  const widths = (fi, lo, hi, both) => {
    const f = frames(true)[fi];
    if (!f) return [];
    const style = f.getAttribute('style'), view = f.getAttribute('data-fit-view');
    const set = (W) => {
      for (const [k, v] of [['width', W + 'px'], ['max-width', 'none'], ['min-width', '0']]) f.style.setProperty(k, v, 'important');
      if (both && W < 1024) f.setAttribute('data-fit-view', 'page'); else f.removeAttribute('data-fit-view');
    };
    // the containers each rule queries in this frame: the nearest inline-size container of an element it styles
    const pairs = new Map();
    const containerOf = (m, name) => {
      for (let a = m.parentElement; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (/inline-size|size/.test(s.containerType) && (!name || s.containerName.split(/\s+/).includes(name))) return a;
        if (a === f) break;
      }
      return null;
    };
    for (const q of queries().rules) {
      const found = new Set();
      for (const sel of q.sels) {
        let ms = [];
        try { ms = f.querySelectorAll(sel.replace(/::?(before|after|placeholder|marker|selection|first-line|first-letter)\b/g, '')); } catch (e) { continue; }
        for (const m of ms) { const c = containerOf(m, q.name); if (c && (c === f || f.contains(c))) found.add(c); }
      }
      for (const c of found) for (const T of q.ts) {
        const k = T + '|' + Math.round(inline(c));
        if (!pairs.has(k)) pairs.set(k, { c, T });
      }
    }
    const out = [];
    const regimes = both ? [[lo, Math.min(hi, 1023.5)], [Math.max(lo, 1024), hi]] : [[lo, hi]];
    try {
      for (const { c, T } of pairs.values()) for (const target of [T - 1.02, T + 0.02]) for (const [a, b] of regimes) {
        if (a > b) continue;
        let W = Math.min(b, Math.max(a, f.getBoundingClientRect().width / scaleOf(f).sx)), pW = null, px = null;
        for (let n = 0; n < 8; n++) {
          set(W);
          if (!c.isConnected || getComputedStyle(c).display === 'none') break;
          const x = inline(c);
          if (Math.abs(x - target) < 0.05) {
            // a whole width when the container is still on the same side of the threshold there
            const Wr = Math.round(W);
            set(Wr);
            const xr = inline(c);
            out.push((target < T ? xr <= T - 1 : xr >= T) && Wr >= a && Wr <= b ? Wr : Math.round(W * 100) / 100);
            break;
          }
          let slope = 1;
          if (pW !== null && Math.abs(W - pW) > 0.01) { const s = (x - px) / (W - pW); if (s > 0.05 && s < 5) slope = s; }
          const next = Math.min(b, Math.max(a, W + (target - x) / slope));
          if (Math.abs(next - W) < 0.005) break;
          pW = W; px = x; W = next;
        }
      }
    } finally {
      if (style === null) f.removeAttribute('style'); else f.setAttribute('style', style);
      if (view === null) f.removeAttribute('data-fit-view'); else f.setAttribute('data-fit-view', view);
    }
    return [...new Set(out)].sort((x, y) => x - y);
  };
  // the axis labels motion.js has thinned in frame i: at a frame's drawn size there should be none, since every drawn
  // axis fits; a label thinned there was a collision drawn into the board
  const thinned = (i) => {
    const f = frames(true)[i];
    return [...f.querySelectorAll('*')].filter((e) => e.__mpThinned).map((e) => ({ text: e.textContent.trim(), el: path(e, f) }));
  };
  window.__fit = { frames, scan, steps, scrolls, scrollTo, extent, widths, unreadQueries, label, section, clipBox, thinned, nested: (i) => !!outerOf(frames(true)[i]) };
})();
