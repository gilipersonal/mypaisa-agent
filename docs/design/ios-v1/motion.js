/* MyPaisa DS v1 · Motion (MA-182). On the canvas: each device frame plays its arrival when it scrolls into view
   (again each time it comes back), its figures roll up to their value, and a segmented control or a tab bar slides
   its lens to the tapped item. Every frame label gets a replay chip. Nothing runs under Reduce Motion or with
   ?static=1 in the URL (for still captures). The app does the same in SwiftUI; see the iOS kit's 12 · Motion. */
(function () {
  if (window.__mpMotion) return;
  window.__mpMotion = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = /[?&]static=1\b/.test(location.search);
  if (reduce || still) return;
  document.documentElement.classList.add('mo-ready');

  var FRAMES = '.dev, [data-mo-frame-root]';
  // role, selector, stagger group; first match wins, and an element a board marked itself keeps its role
  var ROLES = [
    ['me', '.chat > .me', 'msg'],
    ['ai', '.chat > .ai, .chat > .daysep, .chat > .me-time', 'msg'],
    ['sheet', '.sheet'], ['dim', '.dim, .mp-scrim'], ['menu', '.menu'], ['alert', '.sysalert'],
    ['draw', '.spark svg, .mp-chartbox > svg, [data-chart] svg'],
    ['dot', '.mp-chartdot', 'dot'], ['label', '.mp-chartlbl', 'lbl'], ['fade', '.mp-chartaxis'],
    ['barx', '.mp-track:not(.has-tick) > *, .mp-track-clip > *', 'bar'],
    ['typing', '.typing'], ['caret', '.caret'], ['skel', '.mp-skel'],
    ['mark', '.ai-mark'], ['face', '.faceid'], ['mask', '.mp-mask'],
    ['card', '.ccard, .mp-card, .mp-hero, .mp-group, .pin, .notif, .appicon', 'card'],
    ['rise', '.mp-group > .mp-row, .largetitle, .mp-section, .lock-time, .lock-date', 'row'],
    ['chip', '.gchip', 'chip'],
    ['pop', '.mp-chip, .badge', 'pop']
  ];
  var COUNT = '.mp-num-hero, .mp-num-l, .strip-n, [data-count]';
  var NUM = /-?\d[\d,]*(?:\.\d+)?/;

  function inArrival(el, frame) {
    // inside the chat, the whole message moves; its card does not move again on its own
    for (var p = el.parentElement; p && p !== frame; p = p.parentElement) {
      var r = p.getAttribute('data-mo');
      if (r === 'me' || r === 'ai' || r === 'sheet' || r === 'menu' || r === 'alert') return true;
    }
    return false;
  }

  function prepare(frame) {
    if (frame.getAttribute('data-mo-prepared')) return;
    frame.setAttribute('data-mo-prepared', '1');
    var counts = {};
    ROLES.forEach(function (rule) {
      frame.querySelectorAll(rule[1]).forEach(function (el) {
        if (el.hasAttribute('data-mo')) return;
        if ((rule[0] === 'card' || rule[0] === 'rise' || rule[0] === 'chip' || rule[0] === 'pop') && inArrival(el, frame)) return;
        el.setAttribute('data-mo', rule[0]);
        if (rule[2]) {
          var n = counts[rule[2]] = (counts[rule[2]] || 0);
          el.style.setProperty('--i', String(Math.min(n, 8)));
          counts[rule[2]] = n + 1;
        }
      });
    });
    // only a figure that is plain text rolls: one with markup inside (a privacy mask, a styled unit) is left as drawn
    frame.querySelectorAll(COUNT).forEach(function (el) {
      if (el.childElementCount === 0 && !el.closest('.mp-mask') && NUM.test(el.textContent)) el.setAttribute('data-mo-count', el.textContent);
    });
    frame.setAttribute('data-mo-frame', 'wait');
    addReplay(frame);
  }

  function rollFigures(frame) {
    frame.querySelectorAll('[data-mo-count]').forEach(function (el) {
      var text = el.getAttribute('data-mo-count'), m = text.match(NUM);
      if (!m) return;
      var raw = m[0], dec = (raw.split('.')[1] || '').length, end = parseFloat(raw.replace(/,/g, ''));
      var grouped = raw.indexOf(',') >= 0, locale = text.indexOf('₹') >= 0 ? 'en-IN' : 'en-GB', t0 = performance.now() + 160, dur = 750;
      if (el.__mpRaf) cancelAnimationFrame(el.__mpRaf);
      (function step(now) {
        var k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3), v = end * e;
        var s = grouped ? v.toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec })
                        : v.toFixed(dec);
        el.textContent = k >= 1 ? text : text.replace(raw, s);
        if (k < 1) el.__mpRaf = requestAnimationFrame(step);
      })(performance.now());
    });
  }

  function play(frame) {
    frame.setAttribute('data-mo-frame', 'wait');
    void frame.offsetWidth;  // restart every animation inside
    frame.setAttribute('data-mo-frame', 'go');
    rollFigures(frame);
  }

  function addReplay(frame) {
    var label = frame.previousElementSibling;
    if (!label || label.querySelector('.mo-replay') || !/bd-theme|dv-cap|bd-h/.test(label.className || '')) return;
    var b = document.createElement('button');
    b.className = 'mo-replay';
    b.type = 'button';
    b.textContent = '↻ replay';
    b.addEventListener('click', function (e) { e.stopPropagation(); play(frame); });
    label.appendChild(b);
  }

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var f = en.target;
      if (en.isIntersecting && f.getAttribute('data-mo-seen') !== 'in') { f.setAttribute('data-mo-seen', 'in'); play(f); }
      else if (!en.isIntersecting && en.intersectionRatio === 0) f.setAttribute('data-mo-seen', 'out');
    });
  }, { threshold: [0, 0.2] }) : null;

  function scan() {
    document.querySelectorAll(FRAMES).forEach(function (f) {
      if (f.getAttribute('data-mo-prepared')) return;
      prepare(f);
      if (io) io.observe(f); else play(f);
    });
  }

  // the lens: a tapped segment or tab, and the selection glides to it (the glass morph, drawn)
  document.addEventListener('click', function (e) {
    var item = e.target.closest && e.target.closest('.mp-seg > *, .tabs > .tab');
    if (!item || item.classList.contains('mo-lens')) return;
    var group = item.parentElement, from = group.querySelector(':scope > .on');
    if (!from || from === item) return;
    var lens = group.querySelector(':scope > .mo-lens');
    if (!lens) {
      lens = document.createElement('span');
      lens.className = 'mo-lens';
      group.insertBefore(lens, group.firstChild);
      group.classList.add('mo-lensed');
    }
    var g = group.getBoundingClientRect(), a = from.getBoundingClientRect(), b = item.getBoundingClientRect();
    var at = function (r) { return { left: (r.left - g.left) + 'px', top: (r.top - g.top) + 'px', width: r.width + 'px', height: r.height + 'px' }; };
    Object.assign(lens.style, at(b));
    lens.animate([at(a), at(b)], { duration: 380, easing: 'cubic-bezier(0.3, 1.25, 0.5, 1)' });
    from.classList.remove('on');
    item.classList.add('on');
  }, true);

  // the canvas renders after this script loads; scan as frames appear
  var pending = 0;
  new MutationObserver(function () {
    if (pending) return;
    pending = setTimeout(function () { pending = 0; scan(); }, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') scan(); else document.addEventListener('DOMContentLoaded', scan);
})();

/* Axis labels thin themselves where they would touch (MA-240), as Swift Charts and LayerChart do: on a chart narrower
   than drawn, a label that would sit within 2 px of the one kept before it, or of the last, is hidden; the first and
   the last always stay. A meter's labels and the market mood strip's segment labels (.mlab) thin the same way, the
   strip's colours keeping their legend. Labels that fit are never touched, so every chart keeps its drawn axis. This
   is layout, not motion, so it runs under Reduce Motion and ?static=1 too, and again whenever an axis changes width. */
(function () {
  if (window.__mpAxisFit) return;
  window.__mpAxisFit = true;
  var AXES = '.mp-chartaxis, .pc-x, .ticks, .mlab';
  var GAP = 2;   // the tightest drawn pair that does not touch, a meter's 85% and 95%, keeps 4.7 px

  function fitMany(axes) {
    var rows = [];
    for (var idx = 0; idx < axes.length; idx++) {
      var axis = axes[idx];
      var kids = [].filter.call(axis.children, function (k) { return k.nodeType === 1; });
      for (var c = 0; c < kids.length; c++) {
        if (kids[c].__mpThinned) { kids[c].style.removeProperty('visibility'); kids[c].__mpThinned = false; }
      }
      if (kids.length >= 3) rows.push(kids);
    }
    if (!rows.length) return;
    // Read all bounding rects in one clean layout pass before writing visibility changes
    var boxes = rows.map(function (kids) { return kids.map(function (k) { return k.getBoundingClientRect(); }); });
    var hides = [];
    for (var r = 0; r < rows.length; r++) {
      var rk = rows[r], box = boxes[r];
      var order = rk.map(function (_, i) { return i; }).filter(function (i) { return box[i].width > 0; })
        .sort(function (a, b) { return box[a].left - box[b].left; });
      if (order.length < 3) continue;
      var last = box[order[order.length - 1]], kept = box[order[0]];
      for (var j = 1; j < order.length - 1; j++) {
        var i = order[j], b = box[i];
        if (b.left < kept.right + GAP || b.right > last.left - GAP) hides.push(rk[i]);
        else kept = b;
      }
    }
    for (var h = 0; h < hides.length; h++) {
      hides[h].style.setProperty('visibility', 'hidden');
      hides[h].__mpThinned = true;
    }
  }

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (es) {
    fitMany(es.map(function (e) { return e.target; }));
  }) : null;
  function scan() {
    var direct = [];
    document.querySelectorAll(AXES).forEach(function (a) {
      if (a.__mpFit) return;
      a.__mpFit = true;
      if (ro) ro.observe(a); else direct.push(a);
    });
    if (direct.length) fitMany(direct);
  }
  var pending = 0;
  new MutationObserver(function () {
    if (pending) return;
    pending = setTimeout(function () { pending = 0; scan(); }, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') scan(); else document.addEventListener('DOMContentLoaded', scan);
})();
