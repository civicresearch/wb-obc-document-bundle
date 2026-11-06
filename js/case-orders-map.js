// Order-level case map (case-orders.html): one node per court order, grouped into
// families that grow from the 22 May 2024 judgment. Data is embedded at build time
// in #com-data (data/case_orders_map.json plus the matching case_manifest.json entries).
(function () {
  'use strict';
  var mapbox = document.getElementById('com-mapbox');
  var dataEl = document.getElementById('com-data');
  if (!mapbox || !dataEl) return;

  var NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_BN = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];
  var LONG_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  var SOURCE_LABEL = {
    official: ['Official court PDF', 'আদালতের সরকারি PDF', 'official'],
    official_court_pdf: ['Official court PDF', 'আদালতের সরকারি PDF', 'official'],
    court_text_mirror_print: ['Court-text print (not official)', 'আদালত-পাঠের মুদ্রণ (সরকারি নয়)', ''],
    mirror_copy: ['Mirror copy (not official)', 'প্রতিলিপি (সরকারি নয়)', ''],
    local_source_copy: ['Archived source copy', 'সংরক্ষিত উৎস কপি', '']
  };
  var payload;
  try { payload = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var state = { map: payload.map, manifest: {}, nodes: {}, collapsed: {}, court: 'all', q: '', sel: null, rows: {} };

  function bn() { return document.documentElement.lang === 'bn'; }
  function t(en, b) { return bn() && b ? b : en; }
  function digits(s) { return bn() ? String(s).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }) : String(s); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(d) { var p = d.split('-'); return digits(+p[2] + ' ' + (bn() ? MONTHS_BN : MONTHS)[+p[1] - 1] + ' ' + p[0]); }
  function fmtLong(d) { var p = d.split('-'); return digits(+p[2] + ' ' + (bn() ? LONG_BN : LONG)[+p[1] - 1] + ' ' + p[0]); }
  function lab(o) { return t(o.label, o.label_bn); }
  function wrapText(s, max) {
    var words = s.split(' '), lines = [''], i;
    for (i = 0; i < words.length; i++) {
      var cur = lines[lines.length - 1];
      if ((cur + ' ' + words[i]).trim().length > max && cur) lines.push(words[i]); else lines[lines.length - 1] = (cur + ' ' + words[i]).trim();
    }
    return lines;
  }
  function cleanNote(n) { return (n || '').replace(/\s*Local typeset reproduction[\s\S]*$/, '').trim(); }
  function famColor(i) { return 'var(--f' + ((i % 8) + 1) + ')'; }
  function entryFor(n) { return n.file ? state.manifest[n.file] : null; }
  function courtName(n) { return n.court === 'SC' ? t('Supreme Court of India', 'ভারতের সুপ্রিম কোর্ট') : t('Calcutta High Court', 'কলকাতা হাইকোর্ট'); }
  function haystack(n) {
    var e = entryFor(n) || {};
    return [n.date, n.case, n.label, n.label_bn, n.title, e.title, (e.case_numbers || []).join(' '), e.verification_note, n.note].join(' ').toLowerCase();
  }
  function matches(n) {
    if (state.court !== 'all' && n.court !== state.court) return false;
    if (!state.q) return true;
    var hay = n._hay + ' ' + fmt(n.date).toLowerCase();
    return state.q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function linksOf(id) { return state.map.links.filter(function (l) { return l.from === id || l.to === id; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function onKey(fn) { return function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }; }

  function draw() {
    mapbox.innerHTML = '';
    var fams = state.map.families, ROW = 32, GAP = 16, FAM_H = 66;
    var X0 = 8, ROOT_W = 176, X1 = 212, FAM_W = 240, X2 = 486, LABEL_W = 350, GUT = X2 + LABEL_W + 8;
    var y = 12, layout = [], shown = 0, total = 0;
    fams.forEach(function (f, i) {
      var vis = f.nodes.filter(matches);
      total += f.nodes.length; shown += vis.length;
      if (!vis.length && (state.q || state.court !== 'all')) return;
      var open = !state.collapsed[f.id] || (state.q && vis.length);
      var rows = open ? vis : [];
      var h = Math.max(FAM_H, rows.length * ROW);
      layout.push({ f: f, i: i, rows: rows, vis: vis, top: y, h: h, open: open });
      y += h + GAP;
    });
    var H = Math.max(y + 4, 120), W = GUT + 70;
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': 'com-svgt', id: 'com-svg', 'class': 'com-svg' });
    el('title', { id: 'com-svgt' }, svg).textContent = t('Order-level map of connected West Bengal OBC court cases', 'পশ্চিমবঙ্গের যুক্ত ওবিসি মামলার আদেশভিত্তিক মানচিত্র');
    var gEdges = el('g', {}, svg), gX = el('g', {}, svg), gNodes = el('g', {}, svg);
    var rootY = H / 2, ROOT_H = 74;
    state.rows = {};
    layout.forEach(function (L) {
      var col = famColor(L.i), fy = L.top + L.h / 2;
      el('path', { 'class': 'com-edge', stroke: col, d: 'M' + (X0 + ROOT_W) + ',' + rootY + ' C' + (X1 - 30) + ',' + rootY + ' ' + (X0 + ROOT_W + 20) + ',' + fy + ' ' + X1 + ',' + fy }, gEdges);
      var n = L.f.nodes.length;
      var g = el('g', { 'class': 'com-node com-fam', tabindex: 0, role: 'button', 'aria-expanded': String(!!L.open), 'aria-label': lab(L.f) + ', ' + digits(n) + t(' orders', 'টি আদেশ') }, gNodes);
      var lines = wrapText(lab(L.f), bn() ? 27 : 31);
      var two = lines.length > 1, bh = two ? 62 : 52;
      el('rect', { 'class': 'com-box', x: X1, y: fy - bh / 2, width: FAM_W, height: bh, rx: 10, stroke: col }, g);
      el('rect', { x: X1, y: fy - bh / 2, width: 5, height: bh, rx: 2, fill: col }, g);
      var tx = el('text', { 'class': 'com-box-title', x: X1 + 14, y: fy - (two ? 11 : 2) }, g);
      lines.slice(0, 2).forEach(function (s, k) { var ts = el('tspan', { x: X1 + 14, dy: k ? 15 : 0 }, tx); ts.textContent = s; });
      var sub = el('text', { 'class': 'com-box-sub', x: X1 + 14, y: fy + (two ? 22 : 15) }, g);
      sub.textContent = L.vis.length === n
        ? digits(n) + t(n === 1 ? ' order' : ' orders', 'টি আদেশ')
        : t(L.vis.length + ' of ' + n + ' orders', digits(n) + 'টির মধ্যে ' + digits(L.vis.length) + 'টি আদেশ');
      var tg = el('text', { 'class': 'com-toggle', x: X1 + FAM_W - 14, y: fy + 4, 'text-anchor': 'middle' }, g);
      tg.textContent = L.open ? '−' : '+';
      var toggle = function () { state.collapsed[L.f.id] = !!L.open; draw(); };
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', onKey(toggle));
      var y0 = L.top + (L.h - L.rows.length * ROW) / 2;
      L.rows.forEach(function (node, k) {
        var ny = y0 + k * ROW + ROW / 2;
        state.rows[node.id] = ny;
        el('path', { 'class': 'com-edge', stroke: col, d: 'M' + (X1 + FAM_W) + ',' + fy + ' C' + (X2 - 40) + ',' + fy + ' ' + (X1 + FAM_W + 20) + ',' + ny + ' ' + (X2 - 8) + ',' + ny }, gEdges);
        var ng = el('g', { 'class': 'com-node com-leaf', tabindex: 0, role: 'button', 'data-id': node.id, 'aria-label': fmtLong(node.date) + ', ' + courtName(node) + ', ' + node.case + ': ' + lab(node) }, gNodes);
        el('rect', { 'class': 'com-hit', x: X2 - 16, y: ny - ROW / 2 + 2, width: LABEL_W + 14, height: ROW - 4, rx: 6 }, ng);
        if (node.court === 'SC') el('rect', { x: X2 - 13, y: ny - 5, width: 10, height: 10, fill: node.unarchived ? 'none' : col, stroke: col, 'stroke-dasharray': node.unarchived ? '2 2' : '', transform: 'rotate(45 ' + (X2 - 8) + ' ' + ny + ')' }, ng);
        else el('circle', { cx: X2 - 8, cy: ny, r: 5.5, fill: node.unarchived ? 'none' : col, stroke: col }, ng);
        var tt = el('text', { x: X2 + 4, y: ny + 4.5 }, ng);
        var d = el('tspan', { 'class': 'com-date' }, tt); d.textContent = fmt(node.date) + '  ';
        var lb = el('tspan', { 'class': 'com-lab' }, tt); lb.textContent = lab(node);
        el('title', {}, ng).textContent = node.case + ' — ' + lab(node);
        ng.addEventListener('click', function () { select(node.id, true); });
        ng.addEventListener('keydown', onKey(function () { select(node.id, true); }));
      });
    });
    state.map.links.forEach(function (l) {
      var a = state.rows[l.from], b = state.rows[l.to];
      if (a == null || b == null) return;
      var bulge = Math.min(80, 18 + Math.abs(a - b) * 0.12);
      var p = el('path', { 'class': 'com-xlink', 'data-a': l.from, 'data-b': l.to, d: 'M' + GUT + ',' + a + ' C' + (GUT + bulge) + ',' + a + ' ' + (GUT + bulge) + ',' + b + ' ' + GUT + ',' + b }, gX);
      el('title', {}, p).textContent = lab(l);
      el('circle', { cx: GUT, cy: a, r: 2.5, fill: 'var(--xlink)' }, gX);
      el('circle', { cx: GUT, cy: b, r: 2.5, fill: 'var(--xlink)' }, gX);
    });
    var r = state.map.root;
    var rg = el('g', { 'class': 'com-node com-leaf', tabindex: 0, role: 'button', 'data-id': r.id, 'aria-label': t('Starting point: ', 'সূচনাবিন্দু: ') + fmtLong(r.date) + ', ' + lab(r) }, gNodes);
    el('rect', { 'class': 'com-root-box', x: X0, y: rootY - ROOT_H / 2, width: ROOT_W, height: ROOT_H, rx: 12 }, rg);
    var rl = wrapText(lab(r), bn() ? 18 : 24);
    var rt = el('text', { 'class': 'com-root-text', x: X0 + 14, y: rootY - (rl.length > 1 ? 18 : 10) }, rg);
    rl.slice(0, 2).forEach(function (s, k) { var ts = el('tspan', { x: X0 + 14, dy: k ? 17 : 0 }, rt); ts.textContent = s; });
    var rs = el('text', { 'class': 'com-root-sub', x: X0 + 14, y: rootY + (rl.length > 1 ? 18 : 10) }, rg); rs.textContent = t('Calcutta HC · ', 'কলকাতা হাইকোর্ট · ') + fmt(r.date);
    var rs2 = el('text', { 'class': 'com-root-sub', x: X0 + 14, y: rootY + (rl.length > 1 ? 32 : 26) }, rg); rs2.textContent = 'WPO 60/2011' + t(' and connected', ' ও সংযুক্ত');
    rg.addEventListener('click', function () { select(r.id, true); });
    rg.addEventListener('keydown', onKey(function () { select(r.id, true); }));
    state.rows[r.id] = rootY;
    mapbox.appendChild(svg);
    Array.prototype.forEach.call(svg.querySelectorAll('.com-leaf text'), function (tx) {
      var lb = tx.querySelector('.com-lab'); if (!lb) return;
      var full = lb.textContent, cut = full.length;
      while (tx.getComputedTextLength() > LABEL_W - 10 && cut > 8) { cut -= 2; lb.textContent = full.slice(0, cut).trim() + '…'; }
    });
    var count = document.getElementById('com-count');
    if (count) count.textContent = (state.q || state.court !== 'all')
      ? t(shown + ' of ' + total + ' orders match', digits(total) + 'টির মধ্যে ' + digits(shown) + 'টি আদেশ মিলেছে')
      : t(total + ' orders in ' + fams.length + ' families', digits(fams.length) + 'টি গোষ্ঠীতে ' + digits(total) + 'টি আদেশ');
    applySelection();
  }

  function applySelection() {
    var id = state.sel, rel = {};
    if (id) linksOf(id).forEach(function (l) { rel[l.from] = rel[l.to] = true; });
    Array.prototype.forEach.call(mapbox.querySelectorAll('.com-leaf'), function (g) {
      var nid = g.getAttribute('data-id');
      g.classList.toggle('sel', nid === id);
      g.classList.toggle('related', !!id && nid !== id && !!rel[nid]);
    });
    Array.prototype.forEach.call(mapbox.querySelectorAll('.com-xlink'), function (p) {
      p.classList.toggle('on', !!id && (p.getAttribute('data-a') === id || p.getAttribute('data-b') === id));
    });
  }

  function select(id, fromUser) {
    var n = state.nodes[id];
    if (!n) return;
    state.sel = id;
    if (n._fam && state.collapsed[n._fam]) { state.collapsed[n._fam] = false; draw(); } else applySelection();
    renderDetails(n, fromUser);
    if (fromUser) { try { history.replaceState(null, '', '#' + id); } catch (e) {} }
  }

  function renderDetails(n, scroll) {
    var e = entryFor(n) || {}, d = document.getElementById('com-details');
    if (!d) return;
    var src = n.unarchived ? ['Reported, no court copy archived', 'প্রতিবেদিত; আদালতের কপি সংরক্ষিত নয়', 'none'] : (SOURCE_LABEL[e.source_type] || ['Archived copy', 'সংরক্ষিত কপি', '']);
    var title = e.title || n.title || n.label;
    var note = n.unarchived ? n.note : cleanNote(e.verification_note || e.later_development || '');
    var cases = (e.case_numbers && e.case_numbers.length ? e.case_numbers : [n.case]).join('; ');
    var fam = n._famRef ? lab(n._famRef) : t('The starting judgment', 'সূচনার রায়');
    var h = '<p class="com-kicker">' + esc(courtName(n)) + ' · ' + esc(fam) + '</p>';
    h += '<h3>' + esc(bn() ? lab(n) : title) + '</h3>';
    if (bn()) h += '<p class="com-en-title" lang="en">' + esc(title) + '</p>';
    h += '<span class="com-badge ' + src[2] + '">' + esc(t(src[0], src[1])) + '</span>';
    h += '<dl><dt>' + t('Date', 'তারিখ') + '</dt><dd>' + fmtLong(n.date) + '</dd><dt>' + t('Case', 'মামলা') + '</dt><dd>' + esc(cases) + '</dd>' +
      (e.record_type ? '<dt>' + t('Record', 'নথি') + '</dt><dd>' + esc(e.record_type) + '</dd>' : '') +
      (e.pages ? '<dt>' + t('Pages', 'পৃষ্ঠা') + '</dt><dd>' + digits(e.pages) + '</dd>' : '') + '</dl>';
    if (note) h += (bn() ? '<p class="com-hint">ইংরেজিতে সারাংশ:</p>' : '') + '<p lang="en">' + esc(note) + '</p>';
    h += '<div class="com-actions">';
    if (n.file) h += '<a class="primary" href="' + encodeURI(n.file) + '" target="_blank" rel="noopener">' + t('Open PDF', 'PDF খুলুন') + '</a>';
    var su = e.source_url || n.source_url;
    if (su) h += '<a href="' + esc(su) + '" target="_blank" rel="noopener noreferrer">' + (n.unarchived ? t('Read the report', 'প্রতিবেদন পড়ুন') : t('Source', 'উৎস')) + '</a>';
    h += '</div>';
    var ls = linksOf(n.id);
    if (ls.length) {
      h += '<p class="com-kicker" style="margin-top:14px">' + t('Connected orders', 'যুক্ত আদেশ') + '</p><ul class="com-conn">';
      ls.forEach(function (l) {
        var other = state.nodes[l.from === n.id ? l.to : l.from];
        h += '<li>' + esc(lab(l)) + ': <button type="button" data-go="' + other.id + '">' + fmt(other.date) + ' · ' + esc(lab(other)) + '</button></li>';
      });
      h += '</ul>';
    }
    d.innerHTML = h;
    Array.prototype.forEach.call(d.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-go'), true); var g = mapbox.querySelector('[data-id="' + b.getAttribute('data-go') + '"]'); if (g) g.focus(); });
    });
    if (scroll && window.matchMedia('(max-width: 1100px)').matches) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderOutline() {
    var o = document.getElementById('com-outline');
    if (!o) return;
    var h = '';
    state.map.families.forEach(function (f) {
      h += '<details open><summary>' + esc(lab(f)) + '<small>' + esc(t(f.sub, f.sub_bn) || '') + '</small></summary><ol>';
      f.nodes.forEach(function (n) {
        h += '<li><span class="d">' + fmt(n.date) + '</span><button type="button" data-go="' + n.id + '">' + esc(lab(n)) + '</button> <span class="com-hint">· ' + (n.court === 'SC' ? t('SC', 'সুপ্রিম কোর্ট') : t('HC', 'হাইকোর্ট')) + ' · ' + esc(n.case) + (n.unarchived ? t(' · not archived', ' · সংরক্ষিত নয়') : '') + '</span></li>';
      });
      h += '</ol></details>';
    });
    o.innerHTML = h;
    Array.prototype.forEach.call(o.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-go'), true); document.getElementById('com-details').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
  }

  var EXPORT_CSS = '.com-edge{fill:none;stroke-width:1.6;opacity:.55}.com-xlink{fill:none;stroke:var(--xlink);stroke-width:1.3;stroke-dasharray:4 3;opacity:.45}' +
    '.com-node text{fill:var(--reading);font-size:13px}.com-date{fill:var(--muted-ink);font-size:12px}.com-box{fill:var(--surface);stroke-width:1.5}' +
    '.com-box-title{font-weight:700;font-size:13px}.com-box-sub{fill:var(--muted-ink);font-size:11.5px}.com-root-box{fill:var(--brand)}' +
    '.com-root-text{fill:var(--brand-ink)!important;font-weight:700}.com-root-sub{fill:var(--brand-ink-2)!important;font-size:11.5px}.com-toggle{font-size:11px;fill:var(--muted-ink)}.com-hit{fill:transparent}';
  function downloadSvg() {
    var svg = document.getElementById('com-svg');
    if (!svg) return;
    var clone = svg.cloneNode(true), cs = getComputedStyle(mapbox);
    var vars = ['--reading','--muted-ink','--surface','--brand','--brand-ink','--brand-ink-2','--xlink','--f1','--f2','--f3','--f4','--f5','--f6','--f7','--f8'];
    var css = 'svg{' + vars.map(function (v) { return v + ':' + cs.getPropertyValue(v); }).join(';') + '}' + EXPORT_CSS + 'text{font-family:"Noto Sans Bengali","Segoe UI",system-ui,sans-serif}';
    var st = document.createElementNS(NS, 'style'); st.textContent = css;
    clone.insertBefore(st, clone.firstChild);
    var bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', cs.getPropertyValue('--surface'));
    clone.insertBefore(bg, st.nextSibling);
    clone.setAttribute('xmlns', NS);
    var blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'wb-obc-court-orders-map.svg';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  payload.manifest.forEach(function (e) {
    if (e.local_file) state.manifest[e.local_file] = e;
    (e.local_files || []).forEach(function (f) { state.manifest[f] = e; });
  });
  var root = state.map.root; root._hay = haystack(root); state.nodes[root.id] = root;
  state.map.families.forEach(function (f) {
    f.nodes.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    f.nodes.forEach(function (n) { n._fam = f.id; n._famRef = f; n._hay = haystack(n) + ' ' + (f.label + ' ' + (f.label_bn || '')).toLowerCase(); state.nodes[n.id] = n; });
  });
  draw();
  renderOutline();
  var h0 = location.hash.slice(1);
  if (h0 && state.nodes[h0]) select(h0, false);

  document.addEventListener('wbobc:langchange', function () {
    draw(); renderOutline();
    if (state.sel) renderDetails(state.nodes[state.sel], false);
  });
  window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (h && state.nodes[h]) select(h, false); });
  var q = document.getElementById('com-q'), qt;
  if (q) q.addEventListener('input', function (e) {
    clearTimeout(qt);
    qt = setTimeout(function () { state.q = e.target.value.trim().toLowerCase(); draw(); }, 120);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-com-court]'), function (b) {
    b.addEventListener('click', function () {
      state.court = b.getAttribute('data-com-court');
      Array.prototype.forEach.call(document.querySelectorAll('[data-com-court]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      draw();
    });
  });
  var ex = document.getElementById('com-expand'), co = document.getElementById('com-collapse'), dl = document.getElementById('com-dl');
  if (ex) ex.addEventListener('click', function () { state.collapsed = {}; draw(); });
  if (co) co.addEventListener('click', function () { state.map.families.forEach(function (f) { state.collapsed[f.id] = true; }); draw(); });
  if (dl) dl.addEventListener('click', downloadSvg);
})();
