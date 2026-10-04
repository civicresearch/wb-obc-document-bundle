const DATA_LOAD_ERRORS = [];
const INLINE_JSON_DATA = window.OBC_INLINE_JSON || {};
const OBC_DOCS = loadJsonSync('obc_documents.json');
const SUPPLEMENTAL_DOCS = loadJsonSync('supplemental_documents.json');
// Private manifests are intentionally excluded from the public build. Keeping
// Keeping these optional arrays empty avoids expected 404 requests on every page.
const PRIVATE_DOCS = [];
const SUPPLEMENTAL_TIMELINE = SUPPLEMENTAL_DOCS.filter(doc => doc.show_on_timeline);
const OBC_CLASS_DATA = loadJsonSync('obc_classes.json', { current_classes_2026: [], first_inclusion: {}, class_changes: [] });
const OBC_CLASSES_2026 = OBC_CLASS_DATA.current_classes_2026 || [];
const OBC_CLASS_FIRST_INCLUSION = OBC_CLASS_DATA.first_inclusion || {};
const OBC_CLASS_CHANGES = OBC_CLASS_DATA.class_changes || [];
const PUBLIC_HEARINGS = loadJsonSync('public_hearings.json');
const DOCUMENT_INVENTORY = loadJsonSync('document_inventory.json');
const PRIVATE_DOCUMENT_INVENTORY = [];

function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function getActiveLang() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'bn' || urlLang === 'en') return urlLang;
  if (window.WBOBCI18n && window.WBOBCI18n.getCurrentLang) {
    const moduleLang = window.WBOBCI18n.getCurrentLang();
    if (moduleLang === 'bn' || moduleLang === 'en') return moduleLang;
  }
  try {
    const savedLang = localStorage.getItem('wb-obc-lang');
    if (savedLang === 'bn' || savedLang === 'en') return savedLang;
  } catch (error) {
    // Browser storage can be unavailable in restricted privacy contexts.
  }
  return document.documentElement.lang === 'bn' || document.body.classList.contains('lang-bn') ? 'bn' : 'en';
}

function localJsonPath(path) {
  return resolveAssetPath(path);
}

function recordDataLoadError(path) {
  if (!DATA_LOAD_ERRORS.includes(path)) DATA_LOAD_ERRORS.push(path);
}

function loadJsonSync(path, fallback = []) {
  if (Object.prototype.hasOwnProperty.call(INLINE_JSON_DATA, path)) return INLINE_JSON_DATA[path];
  try {
    const request = new XMLHttpRequest();
    request.open('GET', localJsonPath(path), false);
    request.send(null);
    if ((request.status >= 200 && request.status < 300) || (request.status === 0 && request.responseText)) {
      return JSON.parse(request.responseText);
    }
    // If status is 404, return fallback without warning
    if (request.status === 404) {
      recordDataLoadError(path);
      return fallback;
    }
  } catch (error) {
    console.warn('Could not load ' + path, error);
  }
  recordDataLoadError(path);
  return fallback;
}

function loadOptionalJsonSync(path, fallback = []) {
  if (Object.prototype.hasOwnProperty.call(INLINE_JSON_DATA, path)) return INLINE_JSON_DATA[path];
  try {
    const request = new XMLHttpRequest();
    request.open('GET', localJsonPath(path), false);
    request.send(null);
    if ((request.status >= 200 && request.status < 300) || (request.status === 0 && request.responseText)) {
      return JSON.parse(request.responseText);
    }
    // If status is 404 or other error, return fallback without logging
    return fallback;
  } catch (error) {
    // Silently return fallback for optional files
  }
  return fallback;
}

function showDataLoadWarning() {
  const warning = document.getElementById('data-load-warning');
  if (!warning || !DATA_LOAD_ERRORS.length) return;
  warning.hidden = false;
  warning.innerHTML = `<strong>Some published data files did not load.</strong> Missing: ${DATA_LOAD_ERRORS.map(escapeHtml).join(', ')}. Please reload the page or report the missing files.`;
}

function renderTimelineEvents(events, forceLang) {
  const timeline = document.getElementById('timeline');
  const loader = document.getElementById('timeline-loader');

  if (loader) loader.hidden = !Array.isArray(events) || !events.length;
  if (!timeline) return;
  if (!Array.isArray(events) || !events.length) {
    timeline.innerHTML = '';
    return;
  }

  const lang = forceLang || getActiveLang();
  timeline.innerHTML = events.map(event => {
    const attrs = [
      event.id ? `id="${escapeAttr(event.id)}"` : '',
      'class="event scroll-fade-in"',
      event.type ? `data-type="${escapeAttr(event.type)}"` : '',
      event.confidence ? `data-confidence="${escapeAttr(event.confidence)}"` : '',
      event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date) ? `data-date="${escapeAttr(event.date)}"` : '',
      event.search ? `data-search="${escapeAttr(event.search)}"` : ''
    ].filter(Boolean).join(' ');
    const body = (lang === 'bn' && event.html_bn) ? event.html_bn : (event.html || '');
    return `<li ${attrs}>${body}</li>`;
  }).join('');
  
  // Initialize scroll animations
  initScrollAnimations();
}

function renderCaseEvents(events, forceLang) {
  const timeline = document.querySelector('#cases .case-timeline');
  const loader = document.getElementById('litigation-loader');

  if (loader) loader.hidden = !Array.isArray(events) || !events.length;
  if (!timeline) return;
  if (!Array.isArray(events) || !events.length) {
    timeline.innerHTML = '';
    return;
  }

  const lang = forceLang || getActiveLang();
  timeline.innerHTML = events.map(event => {
    const id = event.id ? ` id="${escapeAttr(event.id)}"` : '';
    const body = (lang === 'bn' && event.html_bn) ? event.html_bn : (event.html || '');
    return `<li${id} class="case-event scroll-fade-in">${body}</li>`;
  }).join('');
  
  // Initialize scroll animations
  initScrollAnimations();
}

function updateCaseStats(events) {
  const total = Array.isArray(events) ? events.length : 0;
  const resolved = Array.isArray(events)
    ? events.filter(event => /\b(disposed|dismissed|withdrawn|settled)\b/i.test(`${event.title || ''} ${event.html || ''}`)).length
    : 0;
  const totalEl = document.getElementById('total-cases');
  const pendingEl = document.getElementById('pending-cases');
  const resolvedEl = document.getElementById('resolved-cases');
  if (totalEl) totalEl.textContent = String(total);
  if (pendingEl) pendingEl.textContent = String(Math.max(0, total - resolved));
  if (resolvedEl) resolvedEl.textContent = String(resolved);
}

function applyCaseSearch() {
  const input = document.getElementById('case-search');
  const empty = document.getElementById('cases-empty');
  const term = normalise(input?.value || '');
  const rows = Array.from(document.querySelectorAll('#cases .case-event'));
  let visible = 0;
  rows.forEach(row => {
    const show = !term || normalise(row.textContent).includes(term);
    row.hidden = !show;
    if (show) visible += 1;
  });
  if (empty) empty.classList.toggle('hidden', visible !== 0 || !rows.length);
}

const TIMELINE_EVENTS = loadJsonSync('timeline_events.json');
const CASE_EVENTS = loadJsonSync('case_events.json');

// Glossary Data for tooltips
const GLOSSARY_TERMS = {
  'writ petition': { en: 'A formal written order issued by a court.', bn: 'আদালত কর্তৃক জারি করা একটি আনুষ্ঠানিক লিখিত আদেশ।' },
  'public interest litigation': { en: 'Litigation undertaken for the protection of public interest.', bn: 'জনস্বার্থ রক্ষার জন্য করা মামলা।' },
  'reservation': { en: 'Affirmative action policy for backward classes.', bn: 'পশ্চাৎপদ শ্রেণীর জন্য ইতিবাচক বৈষম্য নীতি।' },
  'notification': { en: 'Official public announcement by the government.', bn: 'সরকার কর্তৃক জারি করা সরকারি বিজ্ঞপ্তি।' },
  'commission': { en: 'An official group appointed to investigate or manage a specific area.', bn: 'নির্দিষ্ট বিষয় তদন্ত বা পরিচালনার জন্য নিযুক্ত সরকারি সংস্থা।' },
  'petitioner': { en: 'Person who files a petition in court.', bn: 'যে ব্যক্তি আদালতে আবেদন দায়ের করেন।' },
  'respondent': { en: 'Person against whom a petition is filed.', bn: 'যার বিরুদ্ধে আদালতে আবেদন দায়ের করা হয়েছে।' }
};

// Initialize with state restoration from URL
restoreStateFromURL();
renderTimelineEvents(TIMELINE_EVENTS);
renderCaseEvents(CASE_EVENTS);
updateCaseStats(CASE_EVENTS);

const NOTIFICATION_LINKS = {
  '6309-BCW': 'obc_pdfs/2010-09-24_6309-BCW-MR-84-10_categorisation.pdf',
  '1673-BCW': 'obc_pdfs/2012-05-11_1673-BCW-MR-209-11_inclusion.pdf',
  '845-BCW': 'obc_pdfs/2012-10-10_845-BCW-MR-147-12_inclusion.pdf',
  '762-BCW': 'obc_pdfs/2013-03-01_762-BCW-MR-116-12_amendment.pdf',
  '2770-BCW': 'obc_pdfs/2014-08-29_2770-BCW-MR-116-12_inclusion_amendment.pdf',
  '183-BCW': 'obc_pdfs/2015-01-16_183-BCW-MR-209-11_inclusion.pdf',
  '2102-BCW': 'obc_pdfs/2015-06-01_2102-BCW-MR-209-11_inclusion.pdf',
  '468-BCW': 'obc_pdfs/2016-02-04_468-BCW-MR-209-11_inclusion_amendment.pdf',
  '773-BCW': 'obc_pdfs/2016-02-26_773-BCW-MR-209-11_inclusion_amendment.pdf',
  '4282-BCW': 'obc_pdfs/2016-12-26_4282-BCW-MR-118-16_inclusion.pdf',
  '4283-BCW': 'obc_pdfs/2016-12-26_4283-BCW-MR-209-11-(Pt.I)_inclusion_amendment.pdf',
  '1905-BCW': 'obc_pdfs/2017-06-07_1905-BCW-MR-19-17_inclusion.pdf',
  '4144-BCW': 'obc_pdfs/2017-12-05_4144-BCW-MR-92-17_inclusion.pdf',
  '1132-BCW': 'obc_pdfs/2018-03-28_1132-BCW-MR-05-17_inclusion.pdf',
  'SBCW-165': 'obc_pdfs/2018-06-27_SBCW-165-MR-29-18_inclusion.pdf',
  '2019-BCW': 'obc_pdfs/2022-07-11_2019-BCW-MR-30-2020_inclusion.pdf',
  '2020-BCW': 'obc_pdfs/2022-07-11_2020-BCW-MR-03-2021_inclusion.pdf',
  '1057-BCW': 'obc_pdfs/2025-05-27_1057-BCW-MR-38-2025_inclusion.pdf',
  '1107-BCW': 'obc_pdfs/2025-06-03_1107-BCW-MR-38-2025_inclusion.pdf',
  '1172-BCW': 'obc_pdfs/2025-06-03_1107-BCW-MR-38-2025_inclusion.pdf',
  '944-BCW': 'obc_pdfs/2026-05-18_944-BCW-MR-23-2026_withdrawal.pdf',
  '945-BCW': 'obc_pdfs/2026-05-18_945-BCW-MR-23-2026_current_list.pdf'
};

renderObcClassList();
applyGlossaryTooltips();
showSkeletonLoader(false);
document.getElementById('case-search')?.addEventListener('input', applyCaseSearch);
applyCaseSearch();
showDataLoadWarning();

// Re-render language-sensitive lists when the site language changes
document.addEventListener('wbobc:langchange', (event) => {
  const lang = event.detail?.lang || 'en';
  
  // Add a subtle fade-out effect before re-rendering
  const timelineList = document.querySelector('#timeline.stagger-list');
  const caseList = document.querySelector('#cases .case-timeline.stagger-list');
  
  if (timelineList) timelineList.style.opacity = '0';
  if (caseList) caseList.style.opacity = '0';
  
  setTimeout(() => {
    renderTimelineEvents(TIMELINE_EVENTS, lang);
    renderCaseEvents(CASE_EVENTS, lang);
    if (typeof applyFilters === 'function') applyFilters();
    applyCaseSearch();
    
    // Fade back in after rendering
    setTimeout(() => {
      if (timelineList) timelineList.style.opacity = '1';
      if (caseList) caseList.style.opacity = '1';
    }, 50);
  }, 150);
});

// Scroll-triggered animation for timeline and litigation entries
function initScrollAnimations() {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: show all items immediately
    document.querySelectorAll('.scroll-fade-in').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  document.querySelectorAll('.scroll-fade-in:not(.visible)').forEach(el => {
    observer.observe(el);
  });
}

// Re-initialize scroll animations after language switch
document.addEventListener('wbobc:langchange', () => {
  setTimeout(() => {
    initScrollAnimations();
  }, 100);
});

function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function resolveAssetPath(path) {
  // Prepends the configured public asset base to relative repository paths.
  if (!path || /^https?:\/\//.test(path)) return path;
  return (window.OBC_ASSET_BASE || '') + path;
}

function githubBundleUrl(doc, fallbackPath = '') {
  if (!doc) return resolveAssetPath(fallbackPath);
  if (/^https?:\/\//.test(doc.local_pdf || '')) return doc.local_pdf;
  if (/^https?:\/\//.test(fallbackPath)) return fallbackPath;
  // Absolute filesystem paths are never valid public URLs.
  if (/^(?:[A-Za-z]:[\\/]|\/)/.test(doc.local_pdf || '')) return '';
  if (!doc.local_pdf && !fallbackPath) return '';
  if (doc.local_pdf && (doc.local_pdf.includes('/') || doc.local_pdf.includes('\\'))) {
    return resolveAssetPath(doc.local_pdf);
  }

  const filename = String(doc.filename || doc.local_pdf || fallbackPath || '').split(/[\\/]/).pop();
  if (!filename) return resolveAssetPath(fallbackPath);

  const repoBase = 'obc_pdfs/';
  return resolveAssetPath(`${repoBase}${encodeURI(filename)}`);
}

function pdfHref(doc) {
  return githubBundleUrl(doc);
}

function rewriteStaticAssetLinks() {
  // The markup that was rendered server-side (not through pdfHref/githubBundleUrl
  // above) still has plain relative hrefs like "obc_pdfs/foo.pdf" or
  // "case_pdfs/bar.pdf" or "obc_pdf_manifest.json". Rewrite those too when
  // OBC_ASSET_BASE is set when assets are served from a separate public base.
  const base = window.OBC_ASSET_BASE;
  if (!base) return;
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (href.startsWith('obc_pdfs/') || href.startsWith('case_pdfs/') || href === 'obc_pdf_manifest.json') {
      a.setAttribute('href', base + href);
    }
  });
}

function linkedNotificationTrail(source) {
  const parts = String(source || '').split(';').map(part => part.trim()).filter(Boolean);
  if (!parts.length) return '';
  const notificationKeys = Object.keys(NOTIFICATION_LINKS).sort((a, b) => b.length - a.length);
  return parts.map(part => {
    const key = notificationKeys.find(candidate => part.includes(candidate));
    if (!key) return escapeHtml(part);
    const href = resolveAssetPath(NOTIFICATION_LINKS[key]);
    return `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(part)}</a>`;
  }).join(' · ');
}

function obcStatusGroup(status) {
  if (/^Current\b/.test(status || '')) return 'current';
  if (/Withdrawn/.test(status || '')) return 'withdrawn';
  return 'historical';
}

function obcStatusLabel(status) {
  const value = String(status || '');
  if (/^Current\b/.test(value)) return 'Current · 945-BCW · 7%';
  if (/Withdrawn/.test(value)) return 'Withdrawn · 2025 package';
  return 'Historical · not in 945-BCW';
}

function obcInclusionPeriod(included) {
  const year = Number(String(included || '').match(/\b(19|20)\d{2}\b/)?.[0] || 0);
  if (year === 1994) return '1994';
  if (year >= 1995 && year <= 2001) return '1995-2001';
  if (year === 2010) return '2010';
  if (year >= 2012 && year <= 2024) return '2012-2024';
  if (year >= 2025 && year <= 2026) return '2025-2026';
  return 'unknown';
}

function renderObcClassList() {
  const tbody = document.getElementById('obc-class-list');
  if (!tbody) return;
  const normaliseClass = value => normalise(String(value || '').replace(/\bmuslim\b/gi, ''));
  const extractSection = (text, start, end) => {
    const startIndex = text.indexOf(start);
    if (startIndex < 0) return '';
    const endIndex = text.indexOf(end, startIndex);
    return text.slice(startIndex + start.length, endIndex > startIndex ? endIndex : undefined);
  };
  const parseNumberedClasses = text => Array.from(text.matchAll(/(?:^|\s)(\d{1,3})\.?\s*([A-Za-z][A-Za-z0-9()\/,\-\s]+?)(?=\s+\d{1,3}\.?\s+[A-Za-z]|$)/g))
    .map(match => match[2].replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const legacyDoc = OBC_DOCS.find(doc => doc.notif_no === '6309-BCW/MR-84/10');
  const legacyText = legacyDoc?.text || '';
  const legacyNames = [
    ...parseNumberedClasses(extractSection(legacyText, 'MORE BACKWARD (Category-A):', 'BACKWARD (Category-B):')),
    ...parseNumberedClasses(extractSection(legacyText, 'BACKWARD (Category-B):', 'By order'))
  ];
  const currentRows = OBC_CLASSES_2026.map((name, index) => ({
    name,
    included: OBC_CLASS_FIRST_INCLUSION[name] || 'First inclusion date not identified in bundled source; current list confirmed 2026-05-18',
    removed: '',
    status: 'Current in 945-BCW; 7% reservation position',
    source: `945-BCW/MR-23/2026 serial ${index + 1}`
  }));
  const knownNames = new Set([...currentRows, ...OBC_CLASS_CHANGES].map(row => normaliseClass(row.name)));
  const legacyRows = legacyNames
    .filter(name => !knownNames.has(normaliseClass(name)))
    .map(name => ({
      name,
      included: '2010-09-24 in bundled 6309-BCW categorisation; original inclusion may be earlier',
      removed: 'Not in 945-BCW current list',
      status: 'Historical 2010 category entry; verify before reliance',
      source: '6309-BCW/MR-84/10; compare 945-BCW/MR-23/2026'
    }));
  const rows = [...currentRows, ...OBC_CLASS_CHANGES, ...legacyRows];
  tbody.innerHTML = rows.map((row, index) => `
    <tr id="obc-class-${index + 1}" data-status-group="${obcStatusGroup(row.status)}" data-period="${obcInclusionPeriod(row.included)}" data-source="${escapeAttr(normalise(row.source || ''))}" data-search="${escapeAttr(normalise(`${row.name || ''} ${row.included || ''} ${row.removed || ''} ${row.status || ''} ${row.source || ''}`))}">
      <td><strong>${escapeHtml(row.name)}</strong></td>
      <td>${escapeHtml(row.included || '')}</td>
      <td>${escapeHtml(row.removed || 'Not applicable in current bundled record')}</td>
      <td><span class="tag ${/Current/.test(row.status) ? 'current' : /Withdrawn/.test(row.status) ? 'withdrawn' : 'scan'}" title="${escapeAttr(row.status || '')}" aria-label="${escapeAttr(row.status || '')}">${escapeHtml(obcStatusLabel(row.status))}</span></td>
      <td>${linkedNotificationTrail(row.source || '')}</td>
    </tr>
  `).join('');
  filterObcClassList();
}

function filterObcClassList() {
  const rows = Array.from(document.querySelectorAll('#obc-class-list tr'));
  if (!rows.length) return;
  const textTerm = normalise(document.getElementById('obc-class-search')?.value || '');
  const sourceTerm = normalise(document.getElementById('obc-source-filter')?.value || '');
  const status = document.getElementById('obc-status-filter')?.value || 'all';
  const period = document.getElementById('obc-period-filter')?.value || 'all';
  let visible = 0;

  rows.forEach(row => {
    const matchesText = !textTerm || (row.dataset.search || '').includes(textTerm);
    const matchesSource = !sourceTerm || (row.dataset.source || '').includes(sourceTerm);
    const matchesStatus = status === 'all' || row.dataset.statusGroup === status;
    const matchesPeriod = period === 'all' || row.dataset.period === period;
    const show = matchesText && matchesSource && matchesStatus && matchesPeriod;
    row.hidden = !show;
    if (show) visible += 1;
  });

  const count = document.getElementById('obc-class-count');
  if (count) count.textContent = `${visible} of ${rows.length} class rows shown`;
}

function docStatusClass(status) {
  const value = normalise(status);
  if (value.includes('current')) return 'current';
  if (value.includes('withdrawn')) return 'withdrawn';
  if (value.includes('superseded')) return 'scan';
  if (value.includes('framework')) return 'framework';
  return '';
}

function renderDocRow(doc, idx, options = {}) {
  const href = pdfHref(doc);
  const tr = document.createElement('tr');
  tr.className = `doc-row${options.supplemental ? ' supplemental-doc-row' : ''}`;
  tr.id = `doc-${idx}`;
  tr.dataset.docIdx = String(idx);
  tr.dataset.docfilename = doc.filename || '';
  tr.dataset.doctext = String(doc.text || '').slice(0, 1200);
  const status = options.statusLabel || doc.status || '';
  const summary = options.summaryPrefix
    ? `<strong>${escapeHtml(options.summaryPrefix)}</strong><br>${escapeHtml(doc.summary || '').slice(0, 520)}`
    : escapeHtml(doc.summary || '').slice(0, 520);
  tr.innerHTML = `
      <td><a class="doc-jump" href="#doc-${idx}"><code>${escapeHtml(doc.notif_no || doc.filename)}</code></a></td>
      <td>${escapeHtml(doc.date || '')}</td>
      <td><span class="tag">${escapeHtml(titleCase(doc.type || 'Document'))}</span></td>
      <td><span class="tag ${docStatusClass(status)}">${escapeHtml(titleCase(status || 'Record'))}</span></td>
      <td class="doc-summary-cell">${summary}</td>
      <td class="doc-actions">${href ? `<a class="pdf-link" href="${href}" target="_blank" rel="noreferrer">Preview</a>` : ''}<button class="view-doc-btn" type="button" data-idx="${idx}">Text</button></td>`;
  return tr;
}

function renderPrimaryDocs() {
  const tbody = document.getElementById('docs-tbody');
  if (!tbody || !OBC_DOCS.length) return;
  tbody.replaceChildren(...OBC_DOCS.map((doc, idx) => renderDocRow(doc, idx)));
}

function renderSupplementalDocs() {
  const tbody = document.getElementById('docs-tbody');
  if (!tbody || !SUPPLEMENTAL_DOCS.length) return;
  const existingKeys = new Set(OBC_DOCS.map(doc => `${doc.notif_no || ''}|${doc.filename || ''}`));
  SUPPLEMENTAL_DOCS.forEach(sourceDoc => {
    const key = `${sourceDoc.notif_no || ''}|${sourceDoc.filename || ''}`;
    if (existingKeys.has(key)) return;
    const idx = OBC_DOCS.push(sourceDoc) - 1;
    tbody.appendChild(renderDocRow(sourceDoc, idx, {
      supplemental: true,
      statusLabel: 'framework',
      summaryPrefix: sourceDoc.source_batch || 'supplemental corpus'
    }));
  });
}

function renderPrivateDocs() {
  const tbody = document.getElementById('docs-tbody');
  if (!tbody || !PRIVATE_DOCS.length) return;
  const existingKeys = new Set(OBC_DOCS.map(doc => `${doc.notif_no || ''}|${doc.filename || ''}`));
  PRIVATE_DOCS.forEach(sourceDoc => {
    const key = `${sourceDoc.notif_no || ''}|${sourceDoc.filename || ''}`;
    if (existingKeys.has(key)) return;
    const idx = OBC_DOCS.push(sourceDoc) - 1;
    tbody.appendChild(renderDocRow(sourceDoc, idx, {
      supplemental: true,
      statusLabel: sourceDoc.status || 'private',
      summaryPrefix: sourceDoc.source_batch || 'supplemental source'
    }));
  });
}

function renderSupplementalTimeline() {
  const timeline = document.getElementById('timeline');
  if (!timeline || !SUPPLEMENTAL_TIMELINE.length) return;
  SUPPLEMENTAL_TIMELINE.forEach((doc, offset) => {
    const idx = OBC_DOCS.findIndex(item => item.filename === doc.filename && item.notif_no === doc.notif_no);
    const li = document.createElement('li');
    li.className = 'event tl-event supplemental-timeline-event';
    li.dataset.type = 'legacy';
    li.dataset.date = doc.date || '';
    li.dataset.search = `${doc.notif_no || ''} ${doc.filename || ''} ${doc.summary || ''} ${doc.text || ''}`;
    li.id = `evt-framework-${offset}`;
    const href = pdfHref(doc);
    li.innerHTML = `
      <div class="date">${escapeHtml(doc.date || '')}</div>
      <span class="dot" aria-hidden="true"></span>
      <article class="card">
        <h2>${escapeHtml(doc.notif_no || doc.filename)}</h2>
        <p>${escapeHtml(doc.summary || '').slice(0, 620)}</p>
        <p class="related">Related corpus entry: ${idx >= 0 ? `<a href="#doc-${idx}">open extracted text</a>` : 'available in supplemental corpus'}${href ? ` · <a href="${href}" target="_blank" rel="noreferrer">open PDF</a>` : ''}</p>
        <div class="tags"><span class="tag framework">Framework</span><span class="tag">${escapeHtml(titleCase(doc.type || 'Record'))}</span></div>
      </article>`;
    insertTimelineEventChronologically(timeline, li, doc.date);
  });
}

function renderPublicHearings() {
  const tbody = document.getElementById('public-hearings-tbody');
  if (!tbody || !PUBLIC_HEARINGS.length) return;
  tbody.innerHTML = PUBLIC_HEARINGS.map(row => `
            <tr>
              <td>${escapeHtml(row.date_label || row.date || '')}</td>
              <td>${escapeHtml(row.time || '')}</td>
              <td>${escapeHtml(row.communities || '')}</td>
              <td><a class="external" href="${resolveAssetPath(row.local_pdf || '')}" target="_blank" rel="noreferrer">PDF</a></td>
            </tr>`).join('');
}

function renderDocumentInventory() {
  const tbody = document.getElementById('inventory-tbody');
  const inventoryRows = DOCUMENT_INVENTORY.concat(PRIVATE_DOCUMENT_INVENTORY || []);
  if (!tbody || !inventoryRows.length) return;
  tbody.innerHTML = inventoryRows.map(row => {
    const file = row.href
      ? `<a href="${resolveAssetPath(row.href)}">${escapeHtml(row.file || '')}</a>`
      : escapeHtml(row.file || '');
    return `
            <tr>
              <td>${escapeHtml(row.folder || '')}</td>
              <td>${file}</td>
              <td>${escapeHtml(row.pages || '')}</td>
              <td>${escapeHtml(row.role || '')}</td>
            </tr>`;
  }).join('');
}

function labelResponsiveTables() {
  document.querySelectorAll('.table-wrap table').forEach(table => {
    const labels = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (!labels.length) return;
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell.tagName !== 'TD') return;
        cell.dataset.label = labels[index] || '';
      });
    });
  });
}

function timelineDateValue(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Date.parse(`${text}T00:00:00`);
  if (/^\d{4}$/.test(text)) return Date.parse(`${text}-01-01T00:00:00`);
  const monthRange = text.match(/^([A-Za-z]{3})-[A-Za-z]{3}\s+(\d{4})$/);
  if (monthRange) return Date.parse(`${monthRange[1]} 1 ${monthRange[2]}`);
  const monthYear = text.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthYear) return Date.parse(`${monthYear[1]} 1 ${monthYear[2]}`);
  const parsed = Date.parse(text.replace(/\bSept\b/i, 'Sep'));
  return Number.isNaN(parsed) ? null : parsed;
}

function eventDateValue(event) {
  return timelineDateValue(event.dataset.date || event.querySelector('.date')?.textContent);
}

function insertTimelineEventChronologically(timeline, event, date) {
  const eventValue = timelineDateValue(date);
  if (eventValue === null) {
    timeline.appendChild(event);
    return;
  }
  const nextEvent = Array.from(timeline.children).find(candidate => {
    const candidateValue = eventDateValue(candidate);
    return candidateValue !== null && candidateValue > eventValue;
  });
  timeline.insertBefore(event, nextEvent || null);
}

function sortTimelineChronologically() {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  const items = Array.from(timeline.children).map((item, index) => ({
    item,
    index,
    value: eventDateValue(item)
  }));
  items
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.index - b.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return a.value - b.value || a.index - b.index;
    })
    .forEach(({ item }) => timeline.appendChild(item));
}

renderPrimaryDocs();
renderSupplementalDocs();
renderPrivateDocs();
renderSupplementalTimeline();
renderObcClassList();
renderPublicHearings();
renderDocumentInventory();
labelResponsiveTables();
['obc-class-search', 'obc-source-filter'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', filterObcClassList);
});
['obc-status-filter', 'obc-period-filter'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', filterObcClassList);
});
sortTimelineChronologically();
rewriteStaticAssetLinks();

const docSearch = document.getElementById('doc-search');
const docStatusFilter = document.getElementById('doc-status-filter');
let docRows = Array.from(document.querySelectorAll('.doc-row'));
const modal = document.getElementById('doc-modal');
const modalClose = document.getElementById('modal-close');
const modalMeta = document.getElementById('modal-meta');
const modalTitle = document.getElementById('modal-title');
const modalSummary = document.getElementById('modal-summary');
const modalText = document.getElementById('modal-text');
const modalFilename = document.getElementById('modal-filename');
const modalRelated = document.getElementById('modal-related');
const tabPanels = Array.from(document.querySelectorAll('[data-tab-panel]'));
const tabLinks = Array.from(document.querySelectorAll('[data-tab-target]'));
const sectionLinks = Array.from(document.querySelectorAll('main a[href^="#"]')).filter(link => !link.dataset.tabTarget);
const heroEyebrow = document.getElementById('hero-eyebrow');
const heroTitle = document.getElementById('hero-title');
const heroSub = document.getElementById('hero-sub');
const heroStatEls = [1, 2, 3, 4].map(index => ({
  value: document.getElementById(`hero-stat-${index}-value`),
  label: document.getElementById(`hero-stat-${index}-label`)
}));
let previousBodyOverflow = '';

const HERO_CONTENT = {
  home: {
    eyebrowKey: 'heroEyebrow',
    eyebrow: 'West Bengal · Backward Classes Welfare Department · 1993–2026',
    titleKey: 'heroTitle',
    subKey: 'heroSub',
    stats: [
      ['84', 'heroStat1Label'],
      ['OBC List', 'heroStat2Label', 'heroStat2Value'],
      ['17', 'heroStat3Label'],
      ['5', 'heroStat4Label']
    ]
  },
  about: {
    eyebrowKey: 'aboutHeroEyebrow',
    eyebrow: 'About · Scope, method, and source care',
    titleKey: 'aboutTitle',
    subKey: 'aboutSub',
    stats: [
      ['Sources', 'aboutStat1Label', 'aboutStat1Value'],
      ['Primary', 'aboutStat2Label', 'aboutStat2Value'],
      ['Scope', 'aboutStat3Label', 'aboutStat3Value'],
      ['Care', 'aboutStat4Label', 'aboutStat4Value']
    ]
  },
  'obc-basics': {
    eyebrowKey: 'obcBasicsHeroEyebrow',
    eyebrow: 'Concept · Class-specific backwardness',
    titleKey: 'obcBasicsHeading',
    subKey: 'obcBasicsSub',
    stats: [
      ['Class', 'obc-basicsStat1Label', 'obc-basicsStat1Value'],
      ['Evidence', 'obc-basicsStat2Label', 'obc-basicsStat2Value'],
      ['Process', 'obc-basicsStat3Label', 'obc-basicsStat3Value'],
      ['Review', 'obc-basicsStat4Label', 'obc-basicsStat4Value']
    ]
  },
  methods: {
    eyebrowKey: 'methodsHeroEyebrow',
    eyebrow: 'Method · Data, census, representation',
    titleKey: 'methodsHeading',
    subKey: 'methodsSub',
    stats: [
      ['3', 'methodsStat1Label'],
      ['1', 'methodsStat2Label'],
      ['2', 'methodsStat3Label'],
      ['Audit', 'methodsStat4Label', 'methodsStat4Value']
    ]
  },
  reports: {
    eyebrowKey: 'reportsHeroEyebrow',
    eyebrow: 'Reports · Mandal, Sachar, West Bengal',
    titleKey: 'reportsHeading',
    subKey: 'reportsSub',
    stats: [
      ['1980', 'reportsStat1Label'],
      ['2006', 'reportsStat2Label'],
      ['2015', 'reportsStat3Label'],
      ['6', 'reportsStat4Label']
    ]
  },
  timeline: {
    eyebrowKey: 'timelineHeroEyebrow',
    eyebrow: 'Timeline · Notifications and changes',
    titleKey: 'timelineTitle',
    subKey: 'timelineSub',
    stats: [
      ['1993', 'timelineStat1Label'],
      ['2025', 'timelineStat2Label'],
      ['2026', 'timelineStat3Label'],
      ['Links', 'timelineStat4Label', 'timelineStat4Value']
    ]
  },
  documents: {
    eyebrowKey: 'documentsHeroEyebrow',
    eyebrow: 'Source PDFs · Search extracted text',
    titleKey: 'documents.title',
    subKey: 'documents.subtitle',
    stats: [
      ['56', 'documentsStat1Label'],
      ['Text', 'documentsStat2Label', 'documentsStat2Value'],
      ['PDF', 'documentsStat3Label', 'documentsStat3Value'],
      ['Filter', 'documentsStat4Label', 'documentsStat4Value']
    ]
  },
  evidence: {
    eyebrowKey: 'evidenceHeroEyebrow',
    eyebrow: 'Hearings & gaps · Public notices and audit',
    titleKey: 'completenessAuditHeading',
    subKey: 'evidenceSub',
    stats: [
      ['17', 'evidenceStat1Label'],
      ['29 Apr', 'evidenceStat2Label', 'evidenceStat2Value'],
      ['24 May', 'evidenceStat3Label', 'evidenceStat3Value'],
      ['Gaps', 'evidenceStat4Label', 'evidenceStat4Value']
    ]
  },
  cases: {
    eyebrowKey: 'casesHeroEyebrow',
    eyebrow: 'Litigation · Orders and procedural record',
    titleKey: 'cases.title',
    subKey: 'casesSectionSub',
    stats: [
      ['2024', 'casesStat1Label'],
      ['Orders', 'casesStat2Label', 'casesStat2Value'],
      ['Sources', 'casesStat3Label', 'casesStat3Value'],
      ['Verify', 'casesStat4Label', 'casesStat4Value']
    ]
  },
  'obc-list': {
    eyebrowKey: 'obcListHeroEyebrow',
    eyebrow: 'OBC List · Notification 945-BCW',
    titleKey: 'obcList.title',
    subKey: 'obcListSub',
    stats: [
      ['66', 'obc-listStat1Label'],
      ['7%', 'obc-listStat2Label'],
      ['2026', 'obc-listStat3Label'],
      ['PDF', 'obc-listStat4Label', 'obc-listStat4Value']
    ]
  },
  'entry-framework': {
    eyebrowKey: 'entryFrameworkHeroEyebrow',
    eyebrow: 'Add record guide · Add and audit records',
    titleKey: 'frameworkHeading',
    subKey: 'frameworkSub',
    stats: [
      ['Date', 'entry-frameworkStat1Label', 'entry-frameworkStat1Value'],
      ['Status', 'entry-frameworkStat2Label', 'entry-frameworkStat2Value'],
      ['Links', 'entry-frameworkStat3Label', 'entry-frameworkStat3Value'],
      ['JSON', 'entry-frameworkStat4Label', 'entry-frameworkStat4Value']
    ]
  },
  inventory: {
    eyebrow: 'Files · Published source inventory',
    titleKey: 'inventory.title',
    subKey: 'inventorySub',
    stats: [
      ['PDF', 'Published source files are linked directly.'],
      ['JSON', 'Manifest files support migration or cloud replacement.'],
      ['Pages', 'Inventory rows include page counts where available.'],
      ['Links', 'Repository assets use stable public paths.']
    ]
  }
};

function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[-\u2010-\u2015/_.,:;()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SITE_PAGE = document.body.dataset.page || '';
const PAGE_FILES = {
  home: 'index.html',
  timeline: 'timeline.html',
  cases: 'litigation.html',
  'obc-list': 'obc-list.html',
  documents: 'documents.html',
  evidence: 'evidence.html',
  'entry-framework': 'record-guide.html',
  inventory: 'inventory.html',
  'obc-basics': 'obc-basics.html',
  methods: 'methods.html',
  reports: 'reports.html',
  about: 'about.html'
};

function pageHref(tabName, targetId = tabName) {
  if (!SITE_PAGE) return `#${targetId}`;
  if (SITE_PAGE === tabName) return `#${targetId}`;
  const file = PAGE_FILES[tabName] || PAGE_FILES.home;
  return targetId === tabName || (tabName === 'home' && targetId === 'home') ? file : `${file}#${targetId}`;
}

function plainTextFromHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  return String(template.content.textContent || '').replace(/\s+/g, ' ').trim();
}

function searchTokens(text) {
  return normalise(text).split(' ').filter(Boolean);
}

const siteSearch = document.getElementById('site-search');
const siteSearchResults = document.getElementById('site-search-results');

function conciseText(text, limit = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

function bundleSearchIndex() {
  let timelineItems = Array.from(document.querySelectorAll('#timeline .event')).map(event => ({
    type: 'Timeline',
    title: conciseText(event.querySelector('h2')?.textContent || event.querySelector('.card')?.textContent, 110),
    detail: conciseText(event.querySelector('.card p')?.textContent || '', 170),
    text: `${event.dataset.search || ''} ${event.textContent || ''}`,
    href: pageHref('timeline', event.id || 'timeline')
  }));
  if (!timelineItems.length) {
    timelineItems = TIMELINE_EVENTS.map(event => {
      const text = plainTextFromHtml(event.html);
      return {
        type: 'Timeline',
        title: conciseText(text || event.search || event.date, 110),
        detail: conciseText(text, 170),
        text: `${event.search || ''} ${text}`,
        href: pageHref('timeline', event.id || 'timeline')
      };
    });
  }
  let caseItems = Array.from(document.querySelectorAll('#cases .case-event')).map((event, index) => {
    if (!event.id) event.id = `case-${index + 1}`;
    return {
      type: 'Litigation',
      title: conciseText(event.querySelector('h3')?.textContent || '', 110),
      detail: conciseText(event.querySelector('p')?.textContent || '', 170),
      text: event.textContent || '',
      href: pageHref('cases', event.id)
    };
  });
  if (!caseItems.length) {
    caseItems = CASE_EVENTS.map((event, index) => {
      const text = plainTextFromHtml(event.html);
      const id = event.id || `case-${index + 1}`;
      return {
        type: 'Litigation',
        title: conciseText(event.title || text, 110),
        detail: conciseText(text, 170),
        text: `${event.title || ''} ${text}`,
        href: pageHref('cases', id)
      };
    });
  }
  const legalNoteItems = Array.from(document.querySelectorAll('#cases .litigation-note')).map((section, index) => {
    if (!section.id) section.id = `litigation-note-${index + 1}`;
    return {
      type: 'Litigation',
      title: conciseText(section.querySelector('h3')?.textContent || 'Litigation support note', 110),
      detail: conciseText(section.querySelector('.section-sub')?.textContent || section.querySelector('p')?.textContent || '', 170),
      text: section.textContent || '',
      href: pageHref('cases', section.id)
    };
  });
  let classItems = Array.from(document.querySelectorAll('#obc-class-list tr')).map((row, index) => ({
    type: 'OBC List',
    title: conciseText(row.cells[0]?.textContent || `OBC class ${index + 1}`, 110),
    detail: conciseText(`${row.cells[1]?.textContent || ''}; ${row.cells[2]?.textContent || ''}; ${row.cells[3]?.textContent || ''}`, 170),
    text: row.textContent || '',
    href: pageHref('obc-list', row.id || `obc-class-${index + 1}`)
  }));
  if (!classItems.length) {
    classItems = OBC_CLASSES_2026.map((name, index) => ({
      type: 'OBC List',
      title: name,
      detail: `Current list entry${OBC_CLASS_FIRST_INCLUSION[name] ? ` · first recorded ${OBC_CLASS_FIRST_INCLUSION[name]}` : ''}`,
      text: `${name} ${OBC_CLASS_FIRST_INCLUSION[name] || ''}`,
      href: pageHref('obc-list', `obc-class-${index + 1}`)
    }));
  }
  let documentItems = docRows.map((row, index) => {
    const doc = OBC_DOCS[Number(row.dataset.docIdx)];
    return {
      type: 'Source PDF',
      title: doc?.notif_no || row.querySelector('code')?.textContent || `Corpus record ${index + 1}`,
      detail: conciseText(doc?.summary || row.textContent, 170),
      text: `${doc?.notif_no || ''} ${doc?.date || ''} ${doc?.type || ''} ${doc?.status || ''} ${doc?.summary || ''} ${doc?.text || ''} ${row.textContent || ''}`,
      href: pageHref('documents', row.id || 'documents')
    };
  });
  if (!documentItems.length) {
    documentItems = OBC_DOCS.map((doc, index) => ({
      type: 'Source PDF',
      title: doc.notif_no || doc.filename || `Corpus record ${index + 1}`,
      detail: conciseText(doc.summary || doc.text, 170),
      text: `${doc.notif_no || ''} ${doc.date || ''} ${doc.type || ''} ${doc.status || ''} ${doc.summary || ''} ${doc.text || ''}`,
      href: pageHref('documents', `doc-${index}`)
    }));
  }
  return [...timelineItems, ...caseItems, ...legalNoteItems, ...classItems, ...documentItems].map(item => ({ ...item, searchText: normalise(`${item.title} ${item.detail} ${item.text}`) }));
}

const BUNDLE_SEARCH_INDEX = bundleSearchIndex();

function scoreSearchItem(item, tokens, term) {
  const title = normalise(item.title);
  const detail = normalise(item.detail);
  let score = title.includes(term) ? 20 : 0;
  tokens.forEach(token => {
    if (title.includes(token)) score += 8;
    if (detail.includes(token)) score += 3;
    if (item.searchText.includes(token)) score += 1;
  });
  return score;
}

function renderBundleSearch() {
  if (!siteSearch || !siteSearchResults) return;
  const term = normalise(siteSearch.value);
  const tokens = searchTokens(term);
  siteSearchResults.replaceChildren();
  if (!term) return;
  if (tokens.join('').length < 2) {
    siteSearchResults.textContent = 'Type at least two characters to search the bundle.';
    return;
  }
  const matches = BUNDLE_SEARCH_INDEX
    .filter(item => tokens.every(token => item.searchText.includes(token)))
    .map(item => ({ ...item, score: scoreSearchItem(item, tokens, term) }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 12);
  if (!matches.length) {
    siteSearchResults.textContent = 'No matching timeline, litigation, OBC list, or source PDF record was found.';
    return;
  }
  const status = document.createElement('p');
  status.className = 'search-result-status';
  status.textContent = `Showing ${matches.length} best match${matches.length === 1 ? '' : 'es'} across timeline, litigation, OBC list, and source PDFs.`;
  siteSearchResults.append(status);
  matches.forEach(item => {
    const link = document.createElement('a');
    link.className = 'search-result';
    link.dataset.resultType = item.type.toLowerCase();
    link.href = item.href;
    const title = document.createElement('strong');
    title.textContent = item.title;
    const detail = document.createElement('span');
    detail.textContent = item.detail;
    const type = document.createElement('small');
    type.textContent = item.type;
    link.append(title, detail, type);
    siteSearchResults.append(link);
  });
}

if (siteSearch) siteSearch.addEventListener('input', renderBundleSearch);

const initialSearch = new URLSearchParams(window.location.search).get('q');
if (siteSearch && initialSearch) {
  siteSearch.value = initialSearch;
  renderBundleSearch();
}

document.querySelectorAll('[data-lang-switch]').forEach(link => {
  link.addEventListener('click', () => {
    const hash = window.location.hash || '#home';
    const url = new URL(link.getAttribute('href'), window.location.href);
    if (hash && hash !== '#home') url.hash = hash;
    link.href = `${url.pathname.split('/').pop()}${url.search}${url.hash}`;
  });
});

// Language toggle functionality
const langButtons = document.querySelectorAll('.lang-btn');
const popupLangButtons = document.querySelectorAll('.lang-btn-small');

function syncLanguageButtons(lang = getActiveLang()) {
  // Sync main navigation language buttons
  langButtons.forEach(button => {
    const isActive = button.getAttribute('data-lang') === lang;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  
  // Sync popup language buttons
  popupLangButtons.forEach(button => {
    const isActive = button.getAttribute('data-lang-switch') === lang;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

langButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang');
    if (window.WBOBCI18n) {
      window.WBOBCI18n.switchLanguage(lang);
    }
    
    syncLanguageButtons(lang);
    
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url);
  });
});

// Popup language buttons
popupLangButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang-switch');
    if (window.WBOBCI18n) {
      window.WBOBCI18n.switchLanguage(lang);
    }
    
    syncLanguageButtons(lang);
    
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url);
  });
});

document.addEventListener('wbobc:langchange', event => {
  syncLanguageButtons(event.detail?.lang);
  // Re-apply glossary tooltips after language change
  applyGlossaryTooltips();
});
syncLanguageButtons();

// ===========================
// DEEP LINKING & STATE PERSISTENCE
// ===========================
function restoreStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search');
  const filters = params.get('filters');
  const page = params.get('page');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  
  if (search) {
    const searchInput = document.getElementById('timeline-search') || document.getElementById('case-search');
    if (searchInput) searchInput.value = search;
  }
  
  if (filters) {
    activeFilters.clear();
    filters.split(',').forEach(f => activeFilters.add(f));
    document.querySelectorAll('.filter-chip').forEach(chip => {
      const filterType = chip.dataset.filter;
      if (filterType && activeFilters.has(filterType)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }
  
  if (page) {
    currentPage = parseInt(page, 10) || 1;
  }
  
  if (dateFrom) {
    const fromInput = document.getElementById('date-from');
    if (fromInput) fromInput.value = dateFrom;
    currentDateRange.from = dateFrom;
  }
  
  if (dateTo) {
    const toInput = document.getElementById('date-to');
    if (toInput) toInput.value = dateTo;
    currentDateRange.to = dateTo;
  }
}

function updateURLState() {
  const url = new URL(window.location);
  const searchInput = document.getElementById('timeline-search') || document.getElementById('case-search');
  const searchTerm = searchInput?.value || '';
  const filtersStr = Array.from(activeFilters).join(',');
  
  if (searchTerm) url.searchParams.set('search', searchTerm);
  else url.searchParams.delete('search');
  
  if (filtersStr) url.searchParams.set('filters', filtersStr);
  else url.searchParams.delete('filters');
  
  if (currentPage > 1) url.searchParams.set('page', String(currentPage));
  else url.searchParams.delete('page');
  
  if (currentDateRange.from) url.searchParams.set('dateFrom', currentDateRange.from);
  else url.searchParams.delete('dateFrom');
  
  if (currentDateRange.to) url.searchParams.set('dateTo', currentDateRange.to);
  else url.searchParams.delete('dateTo');
  
  window.history.pushState({}, '', url);
}

// ===========================
// FUZZY SEARCH
// ===========================
function fuzzyMatch(text, pattern) {
  if (!pattern) return true;
  text = String(text || '').toLowerCase();
  pattern = String(pattern || '').toLowerCase();
  
  // Exact match first
  if (text.includes(pattern)) return true;
  
  // Fuzzy match - allow character skips
  let textIdx = 0;
  let patternIdx = 0;
  let matches = 0;
  
  while (textIdx < text.length && patternIdx < pattern.length) {
    if (text[textIdx] === pattern[patternIdx]) {
      matches++;
      patternIdx++;
    }
    textIdx++;
  }
  
  // Return true if we matched at least 70% of pattern characters
  return patternIdx === pattern.length || (matches / pattern.length) >= 0.7;
}

// ===========================
// EXPORT TO CSV
// ===========================
function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = String(row[header] || '').replace(/"/g, '""');
        return `"${value}"`;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

function addExportButton(containerId, dataGetter, filenameBase) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const existingBtn = container.querySelector('.export-csv-btn');
  if (existingBtn) return;
  
  const btn = document.createElement('button');
  btn.className = 'export-csv-btn';
  btn.innerHTML = '📥 Export CSV';
  btn.setAttribute('aria-label', 'Export current view to CSV file');
  btn.onclick = () => {
    const data = dataGetter();
    exportToCSV(data, filenameBase);
  };
  container.appendChild(btn);
}

// ===========================
// GLOSSARY TOOLTIPS
// ===========================
function applyGlossaryTooltips() {
  // Definition tooltips were removed: on touch devices the tap-to-reveal
  // popup covered table content and blocked reading. Terms now render as
  // plain text; the glossary data below is retained for future reference.
  return;
}

// ===========================
// SKELETON LOADING STATES
// ===========================
function showSkeletonLoader(show) {
  const containers = ['#timeline', '#cases .case-timeline'];
  
  containers.forEach(selector => {
    const container = document.querySelector(selector);
    if (!container) return;
    
    if (show) {
      container.classList.add('skeleton-loading');
      container.innerHTML = '<div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div>';
    } else {
      container.classList.remove('skeleton-loading');
    }
  });
}

function tabForHash(hash) {
  const id = String(hash || '').replace(/^#/, '');
  if (!id) return SITE_PAGE || 'home';
  if (id === 'home' || id === 'guide' || id === 'query-hub') return 'home';
  if (id === 'about') return 'about';
  if (id === 'obc-list' || id.startsWith('obc-class-')) return 'obc-list';
  if (id.startsWith('evt-') || id === 'timeline') return 'timeline';
  if (id.startsWith('doc-') || id === 'documents') return 'documents';
  if (id === 'public-hearings' || id === 'missing-records' || id === 'evidence') return 'evidence';
  if (id === 'cases' || id.startsWith('case-') || id === 'employee-protection-note' || id.startsWith('litigation-note-')) return 'cases';
  if (id === 'entry-framework') return 'entry-framework';
  if (id === 'inventory') return 'inventory';
  if (id === 'methods') return 'methods';
  if (id === 'reports') return 'reports';
  if (id === 'obc-basics') return 'obc-basics';
  return tabPanels.some(panel => panel.dataset.tabPanel === id) ? id : (SITE_PAGE || 'home');
}

// Resolve a hero string by translation key, falling back to the authored
// English text when the key or the i18n module is unavailable.
function heroT(key, fallback) {
  const i18n = window.WBOBCI18n;
  if (!i18n || !key) return fallback;
  const table = i18n.getTranslations()[i18n.getCurrentLang()] || {};
  return table[key] || fallback;
}

function updateHero(tabName = SITE_PAGE || document.body.dataset.activeTab || 'home') {
  const content = HERO_CONTENT[tabName] || HERO_CONTENT.home;
  if (heroEyebrow) heroEyebrow.textContent = heroT(content.eyebrowKey, content.eyebrow);
  
  // Use translation keys for title and subtitle to support language switching
  if (heroTitle && content.titleKey) {
    heroTitle.innerHTML = window.WBOBCI18n ? window.WBOBCI18n.t(content.titleKey) : content.titleKey;
    heroTitle.setAttribute('data-i18n', content.titleKey);
  }
  if (heroSub && content.subKey) {
    heroSub.innerHTML = window.WBOBCI18n ? window.WBOBCI18n.t(content.subKey) : content.subKey;
    heroSub.setAttribute('data-i18n', content.subKey);
  }
  
  if (tabName === 'home') {
    heroStatEls.forEach((item, index) => {
      const valueKey = `heroStat${index + 1}Value`;
      const labelKey = `heroStat${index + 1}Label`;
      if (item.value) item.value.textContent = window.WBOBCI18n ? window.WBOBCI18n.t(valueKey) : (HERO_CONTENT.home.stats[index] || ['', ''])[0];
      if (item.label) item.label.innerHTML = window.WBOBCI18n ? window.WBOBCI18n.t(labelKey) : (HERO_CONTENT.home.stats[index] || ['', ''])[1];
    });
  } else {
    heroStatEls.forEach((item, index) => {
      const stat = content.stats[index] || ['', ''];
      if (item.value) item.value.textContent = heroT(stat[2], stat[0]);
      if (item.label) item.label.innerHTML = heroT(stat[1], stat[1]);
    });
  }
}

function showTab(tabName, targetHash) {
  document.body.dataset.activeTab = tabName;
  tabPanels.forEach(panel => {
    panel.hidden = panel.dataset.tabPanel !== tabName;
  });

  updateHero(tabName);

  tabLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.tabTarget === tabName);
  });

  const hash = targetHash || `#${tabName}`;
  const target = hash && document.getElementById(hash.replace(/^#/, ''));
  const revealTarget = target?.closest('.scroll-reveal');
  if (revealTarget) revealTarget.classList.add('is-visible');
  sectionLinks.forEach(link => {
    const linkedTab = tabForHash(link.getAttribute('href'));
    link.classList.toggle('active', linkedTab === tabName && link.getAttribute('href') === hash);
  });

  const isTopLevelTab = hash === `#${tabName}` || (target && target.dataset && target.dataset.tabPanel === tabName);
  if (target && !isTopLevelTab && hash !== '#guide' && hash !== '#query-hub' && hash !== '#home') {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const headerOffset = document.querySelector('.site-header')?.offsetHeight || 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
        window.scrollTo({ top: Math.max(0, top) });
      }, 30);
    });
  }
}

function syncTabFromHash() {
  const hash = window.location.hash || `#${SITE_PAGE || 'home'}`;
  const tabName = SITE_PAGE || tabForHash(hash);
  showTab(tabName, hash);
  if (hash === `#${tabName}`) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      setTimeout(() => window.scrollTo({ top: 0 }), 80);
    });
  }
}

tabLinks.forEach(link => {
  link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!hash || !hash.startsWith('#')) return;
    event.preventDefault();
    history.pushState(null, '', hash);
    showTab(link.dataset.tabTarget, hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

sectionLinks.forEach(link => {
  link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!hash || !hash.startsWith('#')) return;
    event.preventDefault();
    history.pushState(null, '', hash);
    showTab(tabForHash(hash), hash);
  });
});

window.addEventListener('hashchange', syncTabFromHash);

function applyDocFilters() {
  const term = normalise(docSearch && docSearch.value);
  const status = docStatusFilter ? docStatusFilter.value : 'all';
  docRows.forEach(row => {
    const idx = Number(row.dataset.docIdx || row.querySelector('.view-doc-btn')?.dataset.idx || -1);
    const doc = OBC_DOCS[idx];
    const fullText = doc ? [doc.notif_no, doc.date, doc.type, doc.status, doc.summary, doc.filename, doc.text].join(' ') : '';
    const haystack = normalise(fullText + ' ' + row.dataset.doctext + ' ' + row.textContent);
    const rowStatus = normalise(row.querySelector('td:nth-child(4)')?.textContent);
    const matchTerm = !term || haystack.includes(term);
    const matchStatus = status === 'all' || rowStatus.includes(status);
    row.classList.toggle('hidden', !(matchTerm && matchStatus));
  });
}

function relatedDocs(doc, idx) {
  const mentioned = new Set();
  const haystack = `${doc.summary || ''} ${doc.text || ''}`;
  OBC_DOCS.forEach((candidate, candidateIdx) => {
    if (candidateIdx === idx) return;
    const token = String(candidate.notif_no || '').split('/')[0];
    if ((candidate.date === doc.date && candidate.status === doc.status) || (token && haystack.includes(token))) {
      mentioned.add(candidateIdx);
    }
  });
  return Array.from(mentioned).slice(0, 8);
}

function sourcePreviewText(doc) {
  const text = String(doc.text || '').trim();
  if (!text) return '[No text extracted for this file. Open the PDF for the scanned source.]';
  return text.replace(/\n{3,}/g, '\n\n');
}

function openDocPreview(idx) {
  const doc = OBC_DOCS[idx];
  if (!doc || !modal) return;
  modalMeta.textContent = `${doc.notif_no} · ${doc.date} · ${String(doc.status || '').toUpperCase()}`;
  modalTitle.textContent = doc.summary || doc.notif_no || 'Document preview';
  modalSummary.innerHTML = `
    <div><strong>Source match:</strong> extracted text from <code>${doc.filename || 'source PDF'}</code></div>
    <div><strong>Type:</strong> ${String(doc.type || '').replaceAll('_', ' ')} · <strong>Year:</strong> ${doc.year || ''}</div>
  `;
  const previewText = sourcePreviewText(doc);
  modalText.textContent = previewText;

  // Calculate and display text statistics
  const charCount = previewText.length;
  const wordCount = previewText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const textSizeEl = document.getElementById('modal-text-size');
  if (textSizeEl) {
    textSizeEl.textContent = `${charCount.toLocaleString()} chars · ${wordCount.toLocaleString()} words`;
  }

  modalFilename.textContent = doc.filename || doc.local_pdf || '';
  if (modalRelated) {
    const links = [];
    const sourceHref = githubBundleUrl(doc, doc.local_pdf || '');
    if (sourceHref) links.push(`<a href="${sourceHref}" target="_blank" rel="noreferrer">📥 Open source PDF</a>`);
    relatedDocs(doc, idx).forEach(relatedIdx => {
      const related = OBC_DOCS[relatedIdx];
      links.push(`<a href="#doc-${relatedIdx}">📎 ${related.notif_no}</a>`);
    });
    modalRelated.innerHTML = '<strong>🔗 Connected records</strong><br>' + (links.length ? links.join(' · ') : '<span>No direct cross-reference detected.</span>');
  }
  modal.style.display = 'block';
  modal.setAttribute('aria-hidden', 'false');
  modal.scrollTop = 0;
  if (modalText) modalText.scrollTop = 0;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalClose && modalClose.focus(), 0);
}

function closeDocPreview() {
  if (!modal) return;
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = previousBodyOverflow;
}

if (docSearch) docSearch.addEventListener('input', applyDocFilters);
if (docStatusFilter) docStatusFilter.addEventListener('change', applyDocFilters);

document.addEventListener('click', event => {
  if (event.defaultPrevented) return;
  const button = event.target.closest('.view-doc-btn');
  if (button) {
    event.preventDefault();
    openDocPreview(Number(button.dataset.idx));
    return;
  }
  const hashLink = event.target.closest('a[href^="#"]');
  if (hashLink) {
    const hash = hashLink.getAttribute('href');
    event.preventDefault();
    history.pushState(null, '', hash);
    showTab(tabForHash(hash), hash);
    const openGroupEl = hashLink.closest('.nav-group.is-open');
    if (openGroupEl) openGroupEl.classList.remove('is-open');
    return;
  }
  if (event.target === modal) closeDocPreview();
});

if (modalClose) modalClose.addEventListener('click', closeDocPreview);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal && modal.style.display !== 'none') closeDocPreview();
});

const search = document.querySelector('#tl-search');
const buttons = Array.from(document.querySelectorAll('.filter-btn'));
let activeFilter = 'all';

function matchesFilter(event) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'legacy') return event.dataset.type === 'legacy';
  return event.dataset.type === activeFilter;
}

function applyFilters() {
  const term = normalise(search && search.value);
  const events = Array.from(document.querySelectorAll('#timeline .event, #timeline .tl-event'));
  events.forEach(event => {
    const text = normalise(event.textContent + ' ' + (event.dataset.search || ''));
    const visible = matchesFilter(event) && (!term || text.includes(term));
    event.classList.toggle('hidden', !visible);
  });
}

if (search) search.addEventListener('input', applyFilters);
buttons.forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    buttons.forEach(item => item.classList.toggle('active', item === button));
    applyFilters();
  });
});
applyFilters();
applyDocFilters();
syncTabFromHash();
if (window.location.hash === '#home') requestAnimationFrame(() => window.scrollTo({ top: 0 }));

// Submenu (Research / Learn) dropdown on desktop, accordion on mobile
const navGroups = Array.from(document.querySelectorAll('.nav-group'));
const isMobileNav = () => window.matchMedia('(max-width: 1040px)').matches;

function closeGroup(group) {
  group.classList.remove('is-open');
  const toggle = group.querySelector('.nav-group-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function openGroup(group) {
  navGroups.forEach(other => { if (other !== group) closeGroup(other); });
  group.classList.add('is-open');
  const toggle = group.querySelector('.nav-group-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
}

navGroups.forEach(group => {
  const toggle = group.querySelector('.nav-group-toggle');
  let closeTimer = null;
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => closeGroup(group), 200);
  };

  group.addEventListener('mouseenter', () => {
    if (isMobileNav()) return;
    clearTimeout(closeTimer);
    openGroup(group);
  });
  group.addEventListener('mouseleave', () => {
    if (isMobileNav()) return;
    scheduleClose();
  });

  if (toggle) {
    toggle.addEventListener('click', event => {
      event.preventDefault();
      if (group.classList.contains('is-open')) {
        closeGroup(group);
      } else {
        openGroup(group);
      }
    });
  }
});

document.addEventListener('click', event => {
  navGroups.forEach(group => {
    if (!group.contains(event.target)) closeGroup(group);
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') navGroups.forEach(closeGroup);
});

// Mobile off-canvas nav panel
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.getElementById('site-nav');
const navOverlay = document.querySelector('.nav-overlay');
const navCloseButton = document.querySelector('.nav-close');

function openMobileNav() {
  if (!siteNav) return;
  siteNav.classList.add('is-open');
  siteNav.classList.add('open');
  if (navOverlay) {
    navOverlay.classList.add('is-visible');
    navOverlay.classList.add('open');
  }
  if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  if (!siteNav) return;
  siteNav.classList.remove('is-open');
  siteNav.classList.remove('open');
  if (navOverlay) {
    navOverlay.classList.remove('is-visible');
    navOverlay.classList.remove('open');
  }
  if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  navGroups.forEach(closeGroup);
}

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav && (siteNav.classList.contains('is-open') || siteNav.classList.contains('open'));
    if (isOpen) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });
}

if (navCloseButton) navCloseButton.addEventListener('click', closeMobileNav);
if (navOverlay) navOverlay.addEventListener('click', closeMobileNav);

document.addEventListener('click', event => {
  if (!siteNav || !siteNav.classList.contains('is-open')) return;
  if (event.target.closest('#site-nav') || event.target.closest('.nav-toggle')) return;
  closeMobileNav();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMobileNav();
});

// Close the off-canvas panel automatically if a link inside it is followed
if (siteNav) {
  siteNav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMobileNav();
  });
}

// Close the off-canvas panel if the viewport grows back to desktop size
window.addEventListener('resize', () => {
  if (!isMobileNav()) closeMobileNav();
});

// Reveal meaningful groups as the reader reaches them. This keeps the initial
// viewport calm and gives long research pages a clear sense of progression.
(function initScrollReveals() {
  const revealSelectors = [
    '.home-brief',
    '.source-status-grid',
    '.query-hub',
    '.home-layout',
    '.forms-section',
    '.report-grid',
    '.framework-grid',
    '.research-grid',
    '.corpus-overview',
    '.timeline .event',
    '.case-event',
    '.preview-grid',
    '.cloud-note'
  ];
  const elements = Array.from(document.querySelectorAll(revealSelectors.join(',')));
  const hashTarget = window.location.hash
    ? document.getElementById(window.location.hash.replace(/^#/, ''))
    : null;
  elements.forEach((element, index) => {
    element.classList.add('scroll-reveal');
    const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
    const siblingIndex = Math.max(0, siblings.indexOf(element));
    element.style.setProperty('--reveal-delay', `${Math.min(siblingIndex * 55, 220)}ms`);
    if (hashTarget && (element === hashTarget || element.contains(hashTarget))) element.classList.add('is-visible');
  });

  if (!('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  elements.forEach(element => observer.observe(element));
})();

// Contribution Popup Logic
(function() {
  const popup = document.getElementById('contribute-popup');
  const closeBtn = popup ? popup.querySelector('.popup-close') : null;
  const dontShowAgain = popup ? popup.querySelector('#dont-show-again') : null;
  
  function showPopup() {
    if (!popup) return;
    
    // Check if user opted out
    const suppressed = localStorage.getItem('contributePopupSuppressed');
    if (suppressed === 'true') return;
    
    // Show popup after a short delay
    setTimeout(() => {
      popup.hidden = false;
      // Force reflow to trigger transition
      void popup.offsetWidth;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }, 1500);
  }
  
  function hidePopup() {
    if (!popup) return;
    popup.hidden = true;
    document.body.style.overflow = '';
  }
  
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      hidePopup();
    });
  }
  
  // Click on overlay to close
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) hidePopup();
    });
  }
  
  // Don't show again checkbox
  if (dontShowAgain) {
    dontShowAgain.addEventListener('change', () => {
      if (dontShowAgain.checked) {
        localStorage.setItem('contributePopupSuppressed', 'true');
      } else {
        localStorage.removeItem('contributePopupSuppressed');
      }
    });
  }
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup && !popup.hidden) {
      hidePopup();
    }
  });
  
  // Show popup on page load
  showPopup();
})();

// One persistent theme control updates colors and theme-appropriate brand marks.
(function initThemeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const logos = document.querySelectorAll('[data-theme-logo]');

  function applyTheme(theme, persist) {
    const activeTheme = theme === 'dark' ? 'dark' : 'light';
    const isDark = activeTheme === 'dark';
    root.dataset.theme = activeTheme;

    logos.forEach(logo => {
      const nextSource = isDark ? logo.dataset.darkSrc : logo.dataset.lightSrc;
      if (nextSource && logo.getAttribute('src') !== nextSource) logo.setAttribute('src', nextSource);
    });

    if (toggle) {
      const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      toggle.setAttribute('aria-pressed', String(isDark));
    }

    if (themeColor) themeColor.setAttribute('content', isDark ? '#0c1d31' : '#f8fbfb');

    if (persist) {
      try {
        localStorage.setItem('wb-obc-theme', activeTheme);
      } catch (error) {
        // Theme still applies when storage is unavailable (private/file contexts).
      }
    }
  }

  applyTheme(root.dataset.theme, false);
  if (toggle) {
    toggle.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Language switching rewrites translated nodes; re-assert the theme-correct
  // logo sources in case any themed image was re-created with its default src.
  document.addEventListener('wbobc:langchange', () => {
    applyTheme(root.dataset.theme, false);
  });
})();

// i18n rewrites the shared hero nodes with the home-page keys after the
// page-specific updateHero has run; re-apply this page's hero content
// (eyebrow, title, subtitle, stats) in the active language.
document.addEventListener('wbobc:langchange', () => {
  updateHero(SITE_PAGE || 'home');
});

// Scroll to Top Button
(function() {
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.innerHTML = '↑';
  scrollBtn.setAttribute('aria-label', 'Scroll to top');
  document.body.appendChild(scrollBtn);
  
  let ticking = false;
  
  function toggleButton() {
    if (window.scrollY > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
    ticking = false;
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(toggleButton);
      ticking = true;
    }
  }, { passive: true });
  
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Service Worker Registration for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
  });
}
