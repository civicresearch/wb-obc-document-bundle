/* Site-wide hybrid search for the WB OBC Archive.
   Keyword ranking (BM25) is combined with meaning-based ranking from latent
   semantic vectors built by scripts/build-search.py. Everything runs in the
   browser; the index (data/search/) loads on first use. */
(() => {
  'use strict';
  const BASE = window.OBC_ASSET_BASE || '';
  const STOP = new Set(`a an and are as at be by for from has have in is it its of on or that the this to was were will with
which who whom whose not no but if into than then there these those their they them he she his her we our you your
shall may any all such other also been being under over per upon above below after before between same each only
do does did so can could would should must out up down more most very about against during without within`.split(/\s+/));
  // Common Bengali query words mapped to the English vocabulary of the records.
  const ALIASES = {
    'ওবিসি': 'obc', 'সংরক্ষণ': 'reservation', 'হাইকোর্ট': 'high court calcutta', 'সুপ্রিম': 'supreme', 'কোর্ট': 'court',
    'শংসাপত্র': 'certificate', 'সার্টিফিকেট': 'certificate', 'বিজ্ঞপ্তি': 'notification', 'মামলা': 'case petition',
    'রায়': 'judgment', 'আদেশ': 'order', 'তালিকা': 'list', 'শ্রেণি': 'class', 'শ্রেণী': 'class', 'মুসলিম': 'muslim',
    'কমিশন': 'commission', 'নিয়োগ': 'recruitment appointment', 'ভর্তি': 'admission', 'শুনানি': 'hearing',
    'স্থগিত': 'stay', 'স্থগিতাদেশ': 'stay', 'প্রত্যাহার': 'withdrawn', 'সমীক্ষা': 'survey', 'জনশুনানি': 'public hearing',
    'ক্রিমি': 'creamy', 'লেয়ার': 'layer', 'আয়': 'income', 'শিক্ষক': 'teacher', 'পরীক্ষা': 'examination'
  };
  const TYPE_ORDER = ['Case', 'Court record', 'News', 'Timeline', 'Document', 'OBC class', 'Hearing', 'PDF text'];
  const TYPE_BN = { 'Case': 'মামলা', 'Court record': 'আদালতের নথি', 'News': 'সংবাদ', 'Timeline': 'কালক্রম', 'Document': 'নথি', 'OBC class': 'ওবিসি শ্রেণি', 'Hearing': 'শুনানি', 'PDF text': 'PDF-এর ভিতরে' };
  const bnDigits = s => String(s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
  const isBn = () => document.documentElement.lang === 'bn';

  function stem(t) {
    if (/^\d+$/.test(t) || /[^\x00-\x7f]/.test(t)) return t;
    if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
  }
  // Must match tokens() in scripts/build-search.py.
  function tokens(text) {
    const out = [];
    const norm = bnDigits(String(text || '').normalize('NFC').toLowerCase());
    for (let t of norm.match(/[\p{L}\p{M}\p{N}_ঀ-৿]+/gu) || []) {
      t = t.replace(/^_+|_+$/g, '');
      if (t.length < 2 && !/^\d$/.test(t)) continue;
      if (STOP.has(t)) continue;
      out.push(stem(t));
    }
    return out;
  }
  function expand(query) {
    const extra = [];
    for (const [bn, en] of Object.entries(ALIASES)) if (query.includes(bn)) extra.push(en);
    return extra.length ? `${query} ${extra.join(' ')}` : query;
  }

  let indexPromise = null;
  function loadIndex() {
    if (indexPromise) return indexPromise;
    const get = (file, type) => fetch(`${BASE}data/search/${file}`).then(r => { if (!r.ok) throw new Error(file); return type === 'bin' ? r.arrayBuffer() : r.json(); });
    indexPromise = Promise.all([get('records.json'), get('vectors.json')]).then(async ([records, meta]) => {
      const [docs, terms] = await Promise.all([get(meta.files.docs, 'bin'), get(meta.files.terms, 'bin')]);
      const vocab = new Map(meta.vocab.map((t, i) => [t, i]));
      // BM25 postings over title + meta + text.
      const postings = new Map(), lengths = new Float32Array(records.length);
      records.forEach((r, i) => {
        const toks = tokens(`${r.t} ${r.t} ${r.m} ${r.x}`);
        lengths[i] = toks.length;
        const tf = new Map();
        for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
        for (const [t, n] of tf) { let p = postings.get(t); if (!p) postings.set(t, p = []); p.push(i, n); }
      });
      const avg = lengths.reduce((a, b) => a + b, 0) / records.length;
      return { records, meta, vocab, postings, lengths, avg, docs: new Int8Array(docs), terms: new Int8Array(terms) };
    }).catch(error => { indexPromise = null; throw error; });
    return indexPromise;
  }

  function search(index, query, limit = 40) {
    const { records, meta, vocab, postings, lengths, avg, docs, terms } = index;
    const qt = tokens(expand(query));
    if (!qt.length) return [];
    const n = records.length, k1 = 1.2, b = 0.75;
    const bm = new Float32Array(n);
    const unique = [...new Set(qt)];
    // Prefix matches let a partly typed last word still find records.
    const last = unique[unique.length - 1];
    const keys = unique.map(t => [t, 1]);
    if (last && last.length >= 3) for (const t of postings.keys()) if (t !== last && t.startsWith(last)) keys.push([t, 0.6]);
    for (const [t, weight] of keys) {
      const p = postings.get(t);
      if (!p) continue;
      const df = p.length / 2, idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      for (let j = 0; j < p.length; j += 2) {
        const i = p[j], tf = p[j + 1];
        bm[i] += weight * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * lengths[i] / avg));
      }
    }
    // Phrase bonus for exact multi-word matches (case numbers, names).
    const phrase = query.trim().toLowerCase();
    if (phrase.length > 4 && /\s/.test(phrase)) records.forEach((r, i) => { if (`${r.t} ${r.m} ${r.x}`.toLowerCase().includes(phrase)) bm[i] += 6; });
    // Records whose title holds every query word (a class name, a party) rank first.
    if (unique.length) records.forEach((r, i) => {
      if (!bm[i]) return;
      const title = new Set(tokens(r.t));
      if (unique.every(t => title.has(t))) bm[i] *= r.k === 'PDF text' ? 1.3 : 2;
    });
    // A reference number typed as written (e.g. "1056-BCW") should open the record itself,
    // not a PDF that only mentions it.
    const refPhrase = phrase;
    if (refPhrase.length >= 4 && /\d/.test(refPhrase)) records.forEach((r, i) => {
      if (bm[i] && r.k !== 'PDF text' && String(r.t || '').toLowerCase().includes(refPhrase)) bm[i] *= 3;
    });
    // Query vector: idf-weighted sum of term vectors.
    const dims = meta.dims, q = new Float32Array(dims);
    let known = 0;
    for (const t of qt) {
      const id = vocab.get(t);
      if (id === undefined) continue;
      known += 1;
      const w = meta.idf[id];
      for (let d = 0; d < dims; d++) q[d] += w * terms[id * dims + d];
    }
    let qn = Math.hypot(...q);
    let maxBm = 0;
    for (let i = 0; i < n; i++) if (bm[i] > maxBm) maxBm = bm[i];
    const scored = [];
    for (let i = 0; i < n; i++) {
      let cos = 0;
      if (known && qn) {
        let dot = 0;
        for (let d = 0; d < dims; d++) dot += q[d] * docs[i * dims + d];
        cos = dot / (qn * 127);
      }
      const kw = maxBm ? bm[i] / maxBm : 0;
      const sem = cos > 0.3 ? (cos - 0.3) / 0.7 : 0;
      const score = 0.62 * kw + 0.38 * sem + (records[i].k === 'PDF text' ? -0.04 : 0);
      if (kw > 0 || sem > 0.25) scored.push({ i, score, kw, sem });
    }
    scored.sort((a, b2) => b2.score - a.score);
    // One result per PDF: keep its best passage.
    const seenPdf = new Set(), out = [];
    for (const s of scored) {
      const r = records[s.i];
      if (r.k === 'PDF text') { const file = r.u.split('#')[0]; if (seenPdf.has(file)) continue; seenPdf.add(file); }
      out.push({ ...r, score: s.score, semantic: s.kw === 0 });
      if (out.length >= limit) break;
    }
    return out;
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function snippet(text, query) {
    const words = tokens(query).filter(t => t.length > 2);
    const lower = text.toLowerCase();
    let at = -1;
    for (const w of words) { at = lower.indexOf(w); if (at >= 0) break; }
    const start = Math.max(0, at - 70);
    let part = (start ? '…' : '') + text.slice(start, start + 220) + (text.length > start + 220 ? '…' : '');
    part = esc(part);
    for (const w of words.slice(0, 6)) part = part.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\p{L}\\p{M}]*)`, 'giu'), '<mark>$1</mark>');
    return part;
  }
  const label = (en, bn) => (isBn() ? bn : en);

  function attach(input, panel, { inline = false } = {}) {
    if (!input || !panel) return;
    let active = 'all', results = [], timer = 0, focusIndex = -1;
    panel.classList.add('smart-search-panel');
    if (!inline) panel.hidden = true;
    const close = () => { if (!inline) { panel.hidden = true; input.setAttribute('aria-expanded', 'false'); } };
    function render(query) {
      if (!query.trim()) { panel.innerHTML = inline ? '' : ''; close(); return; }
      const counts = {};
      results.forEach(r => { counts[r.k] = (counts[r.k] || 0) + 1; });
      const types = TYPE_ORDER.filter(t => counts[t]);
      if (active !== 'all' && !counts[active]) active = 'all';
      const shown = results.filter(r => active === 'all' || r.k === active).slice(0, inline ? 30 : 12);
      const chips = [`<button type="button" class="ss-chip${active === 'all' ? ' active' : ''}" data-type="all">${label('All', 'সব')} <span>${results.length}</span></button>`]
        .concat(types.map(t => `<button type="button" class="ss-chip${active === t ? ' active' : ''}" data-type="${esc(t)}">${esc(label(t, TYPE_BN[t]))} <span>${counts[t]}</span></button>`)).join('');
      const items = shown.map((r, i) => `<li><a class="ss-result" href="${esc(BASE + r.u)}" id="${panel.id}-opt-${i}" role="option"${r.k === 'PDF text' ? ' target="_blank" rel="noreferrer"' : ''}>
          <span class="ss-type ss-type--${esc(r.k.toLowerCase().replace(/\s+/g, '-'))}">${esc(label(r.k, TYPE_BN[r.k]))}</span>${r.semantic ? `<span class="ss-related" title="${esc(label('Found by meaning, not exact words', 'অর্থের ভিত্তিতে পাওয়া, হুবহু শব্দে নয়'))}">${label('Related', 'সম্পর্কিত')}</span>` : ''}
          <strong>${esc(r.t)}</strong>
          ${r.m ? `<small>${esc(r.m)}</small>` : ''}
          <span class="ss-snippet">${snippet(r.x, query)}</span></a></li>`).join('');
      panel.innerHTML = results.length
        ? `<div class="ss-chips" role="group" aria-label="${esc(label('Filter results', 'ফলাফল ছাঁকুন'))}">${chips}</div><ol class="ss-list" role="listbox">${items}</ol><p class="ss-foot">${label('Keyword and meaning-based search across records, news and the text inside PDFs.', 'নথি, সংবাদ ও PDF-এর ভিতরের লেখায় শব্দ ও অর্থভিত্তিক অনুসন্ধান।')}</p>`
        : `<p class="ss-empty">${label('No matches. Try a case number, a community name or a broader word.', 'কিছু পাওয়া যায়নি। মামলা নম্বর, সম্প্রদায়ের নাম বা আরও সাধারণ শব্দ দিয়ে চেষ্টা করুন।')}</p>`;
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      focusIndex = -1;
    }
    async function run() {
      const query = input.value;
      if (!query.trim()) { results = []; render(''); return; }
      if (!panel.innerHTML) { panel.innerHTML = `<p class="ss-empty">${label('Loading the search index…', 'অনুসন্ধান সূচি লোড হচ্ছে…')}</p>`; panel.hidden = false; }
      try {
        const index = await loadIndex();
        if (query !== input.value) return;
        results = search(index, query);
        render(query);
      } catch (error) {
        panel.innerHTML = `<p class="ss-empty">${label('Search could not load. Check your connection and try again.', 'অনুসন্ধান লোড হয়নি। সংযোগ দেখে আবার চেষ্টা করুন।')}</p>`;
        panel.hidden = false;
      }
    }
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-controls', panel.id);
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 140); });
    input.addEventListener('focus', () => { loadIndex().catch(() => {}); if (input.value.trim() && results.length) panel.hidden = false; });
    panel.addEventListener('click', event => {
      const chip = event.target.closest('.ss-chip');
      if (chip) { active = chip.dataset.type; render(input.value); input.focus(); }
    });
    input.addEventListener('keydown', event => {
      const links = [...panel.querySelectorAll('.ss-result')];
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!links.length) return;
        event.preventDefault();
        focusIndex = (focusIndex + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle('is-focused', i === focusIndex));
        input.setAttribute('aria-activedescendant', links[focusIndex].id);
        links[focusIndex].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        const target = links[focusIndex] || links[0];
        if (target) { event.preventDefault(); target.click(); }
      } else if (event.key === 'Escape') { close(); }
    });
    if (!inline) {
      document.addEventListener('click', event => { if (!panel.contains(event.target) && event.target !== input) close(); });
    }
    document.addEventListener('wbobc:langchange', () => { if (input.value.trim()) render(input.value); });
    if (input.value.trim()) run();
  }

  // The single-file standalone edition opened from disk cannot fetch the index;
  // it keeps the built-in keyword search.
  if (location.protocol === 'file:') return;
  window.WBOBCSearch = { attach, loadIndex, search, tokens };

  // Navigation-bar search on every page.
  const navInput = document.getElementById('nav-search-input');
  const navForm = navInput?.closest('form');
  if (navInput && navForm) {
    const panel = document.createElement('div');
    panel.id = 'nav-search-results';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-live', 'polite');
    navForm.appendChild(panel);
    navInput.setAttribute('role', 'combobox');
    navInput.setAttribute('aria-expanded', 'false');
    attach(navInput, panel);
    navForm.addEventListener('submit', event => event.preventDefault(), true);
  }
  // The home-page search panel uses the same engine, with results inline.
  const homeInput = document.getElementById('site-search');
  const homeResults = document.getElementById('site-search-results');
  if (homeInput && homeResults) {
    attach(homeInput, homeResults, { inline: true });
    const q = new URLSearchParams(location.search).get('q');
    if (q) { homeInput.value = q; homeInput.dispatchEvent(new Event('input')); }
  }
})();
