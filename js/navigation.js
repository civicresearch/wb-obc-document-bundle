/* Navigation and appearance work independently of archive-data downloads. */
const navGroups = Array.from(document.querySelectorAll('.nav-group'));
const mobileNavQuery = window.matchMedia('(max-width: 1040px)');
const isMobileNav = () => mobileNavQuery.matches;
document.querySelector('.skip-link')?.addEventListener('click', event => {
  const main = document.getElementById('main-content');
  if (!main) return;
  event.preventDefault();
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: 'start' });
});
const siteNav = document.getElementById('site-nav');
const navToggle = document.querySelector('.nav-toggle');
const navOverlay = document.querySelector('.nav-overlay');
let navReturnFocus = null;
let navPreviousOverflow = '';

function closeGroup(group) {
  group.classList.remove('is-open');
  group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded', 'false');
}
function openGroup(group) {
  navGroups.forEach(other => { if (other !== group) closeGroup(other); });
  group.classList.add('is-open');
  group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded', 'true');
}
function openMobileNav() {
  if (!siteNav || !isMobileNav()) return;
  navReturnFocus = document.activeElement;
  navPreviousOverflow = document.body.style.overflow;
  siteNav.inert = false;
  siteNav.classList.add('is-open', 'open');
  navOverlay?.classList.add('is-visible', 'open');
  navToggle?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  document.querySelector('.nav-close')?.focus();
}
function closeMobileNav(restoreFocus = true) {
  if (!siteNav) return;
  const wasOpen = siteNav.classList.contains('is-open');
  siteNav.classList.remove('is-open', 'open');
  navOverlay?.classList.remove('is-visible', 'open');
  navToggle?.setAttribute('aria-expanded', 'false');
  siteNav.inert = isMobileNav();
  if (wasOpen) {
    document.body.style.overflow = navPreviousOverflow;
    if (restoreFocus && navReturnFocus?.isConnected) navReturnFocus.focus();
  }
  navGroups.forEach(closeGroup);
}
navGroups.forEach((group, index) => {
  const toggle = group.querySelector('.nav-group-toggle');
  const items = group.querySelector('.nav-group-items');
  if (!toggle || !items) return;
  items.id ||= `nav-group-${index}`;
  toggle.setAttribute('aria-controls', items.id);
  toggle.addEventListener('click', () => group.classList.contains('is-open') ? closeGroup(group) : openGroup(group));
  group.addEventListener('focusout', event => {
    if (!group.contains(event.relatedTarget)) closeGroup(group);
  });
  group.addEventListener('keydown', event => {
    if (event.key === 'Escape' && group.classList.contains('is-open')) {
      event.stopPropagation();
      closeGroup(group);
      toggle.focus();
    } else if (event.key === 'ArrowDown' && event.target === toggle) {
      event.preventDefault();
      openGroup(group);
      items.querySelector('a')?.focus();
    }
  });
});
navToggle?.addEventListener('click', () => siteNav?.classList.contains('is-open') ? closeMobileNav() : openMobileNav());
document.querySelector('.nav-close')?.addEventListener('click', () => closeMobileNav());
navOverlay?.addEventListener('click', () => closeMobileNav());
document.addEventListener('click', event => {
  navGroups.forEach(group => { if (!group.contains(event.target)) closeGroup(group); });
});
siteNav?.addEventListener('click', event => { if (event.target.closest('a')) closeMobileNav(false); });
document.addEventListener('keydown', event => {
  if (!isMobileNav() || !siteNav?.classList.contains('is-open')) return;
  if (event.key === 'Escape') { closeMobileNav(); return; }
  if (event.key !== 'Tab') return;
  const elements = Array.from(siteNav.querySelectorAll('a[href], button:not([disabled])')).filter(el => el.getClientRects().length);
  const first = elements[0], last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
mobileNavQuery.addEventListener('change', () => closeMobileNav(false));
closeMobileNav(false);

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
function applyArchiveTheme(preference = 'auto', persist = false) {
  if (!['light', 'dark', 'auto'].includes(preference)) preference = 'auto';
  const theme = preference === 'auto' ? (systemTheme.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-theme-logo]').forEach(logo => {
    const source = theme === 'dark' ? logo.dataset.darkSrc : logo.dataset.lightSrc;
    if (source && logo.getAttribute('src') !== source) logo.src = source;
  });
  const select = document.getElementById('theme-select');
  if (select) select.value = preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a2c2d' : '#0f3b3c');
  if (persist) { try { localStorage.setItem('wb-obc-theme', preference); } catch {} }
}
applyArchiveTheme(document.documentElement.dataset.themePreference);
document.getElementById('theme-select')?.addEventListener('change', event => applyArchiveTheme(event.target.value, true));
systemTheme.addEventListener('change', () => {
  if (document.documentElement.dataset.themePreference === 'auto') applyArchiveTheme('auto');
});
document.addEventListener('wbobc:langchange', () => {
  const bengali = document.documentElement.lang === 'bn';
  document.getElementById('theme-select')?.setAttribute('aria-label', bengali ? 'থিম নির্বাচন করুন' : 'Choose appearance');
  document.querySelector('.language-switch')?.setAttribute('aria-label', bengali ? 'ভাষা' : 'Language');
});

const scrollButton = document.createElement('button');
scrollButton.className = 'scroll-to-top';
scrollButton.textContent = '↑';
scrollButton.setAttribute('aria-label', 'Back to top');
scrollButton.hidden = true;
document.body.appendChild(scrollButton);
function syncScrollButton() { scrollButton.hidden = window.scrollY < 600; scrollButton.classList.toggle('visible', !scrollButton.hidden); }
window.addEventListener('scroll', syncScrollButton, { passive: true });
scrollButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('.skip-link')?.focus({ preventScroll: true });
});

// Give scrollable tables a keyboard entry point and an accessible name.
document.querySelectorAll('.table-wrap').forEach((wrapper, index) => {
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  const heading = wrapper.closest('section')?.querySelector('h2,h3');
  wrapper.setAttribute('aria-label', heading ? `${heading.textContent.trim()} — table` : `Records table ${index + 1}`);
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Press / anywhere to jump to the navigation-bar search (js/search.js runs it).
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  const input = document.getElementById('nav-search-input');
  if (!input) return;
  event.preventDefault();
  input.focus();
  input.select();
});

// Bilingual data rendered at build time carries both languages in data-en / data-bn.
function syncBilingualData() {
  const bn = document.documentElement.lang === 'bn';
  document.querySelectorAll('[data-en]').forEach(el => {
    const text = bn && el.dataset.bn ? el.dataset.bn : el.dataset.en;
    if (el.textContent !== text) el.textContent = text;
  });
}
document.addEventListener('wbobc:langchange', syncBilingualData);
syncBilingualData();

// Litigation: filter case cards by status.
(() => {
  const group = document.querySelector('[data-case-filter]');
  if (!group) return;
  const sets = { all: null, pending: ['pending', 'listed'], stayed: ['stayed'], decided: ['decided', 'withdrawn', 'dismissed'] };
  group.addEventListener('click', event => {
    const button = event.target.closest('button[data-status]');
    if (!button) return;
    group.querySelectorAll('button').forEach(b => { const on = b === button; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    const allowed = sets[button.dataset.status];
    document.querySelectorAll('.case-file').forEach(card => { card.hidden = !!allowed && !allowed.includes(card.dataset.status); });
  });
  // Opening a linked case card from elsewhere expands its record list.
  function openFromHash() {
    const card = location.hash.startsWith('#casefile-') && document.getElementById(location.hash.slice(1));
    if (card) { card.hidden = false; card.querySelector('details')?.setAttribute('open', ''); card.classList.add('is-target'); }
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();

// Media: search, case and year filters.
(() => {
  const toolbar = document.querySelector('[data-media-filter]');
  if (!toolbar) return;
  const search = document.getElementById('media-search');
  const caseSelect = document.getElementById('media-case');
  const yearSelect = document.getElementById('media-year');
  const count = document.getElementById('media-count');
  const empty = document.getElementById('media-empty');
  const items = Array.from(document.querySelectorAll('.media-item'));
  const params = new URLSearchParams(location.search);
  if (params.get('case')) caseSelect.value = params.get('case');
  function apply() {
    const terms = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach(item => {
      const ok = terms.every(t => item.dataset.text.includes(t))
        && (!caseSelect.value || item.dataset.cases.split(' ').includes(caseSelect.value))
        && (!yearSelect.value || item.dataset.year === yearSelect.value);
      item.hidden = !ok;
      if (ok) shown += 1;
    });
    const bn = document.documentElement.lang === 'bn';
    count.textContent = bn ? String(shown).replace(/[0-9]/g, n => '০১২৩৪৫৬৭৮৯'[n]) : String(shown);
    empty.hidden = shown > 0;
  }
  [search, caseSelect, yearSelect].forEach(el => el.addEventListener('input', apply));
  document.addEventListener('wbobc:langchange', apply);
  apply();
})();

// Case map: highlight a case's linked cases on hover or keyboard focus.
(() => {
  const canvas = document.querySelector('[data-case-map]');
  if (!canvas) return;
  const links = [...canvas.querySelectorAll('.cm-link[data-case]')];
  const crosses = [...canvas.querySelectorAll('.cm-cross')];
  const clear = () => {
    canvas.classList.remove('has-focus');
    links.forEach(l => l.classList.remove('is-active', 'is-linked'));
    crosses.forEach(c => c.classList.remove('on'));
  };
  const show = id => {
    clear();
    const related = new Set();
    crosses.forEach(c => {
      if (c.dataset.a === id || c.dataset.b === id) { c.classList.add('on'); related.add(c.dataset.a === id ? c.dataset.b : c.dataset.a); }
    });
    canvas.classList.add('has-focus');
    links.forEach(l => { if (l.dataset.case === id) l.classList.add('is-active'); else if (related.has(l.dataset.case)) l.classList.add('is-linked'); });
  };
  links.forEach(l => {
    l.addEventListener('mouseenter', () => show(l.dataset.case));
    l.addEventListener('focus', () => show(l.dataset.case));
    l.addEventListener('mouseleave', clear);
    l.addEventListener('blur', clear);
  });
})();

// Back-to-top button for long pages.
(() => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'to-top';
  const label = () => (document.documentElement.lang === 'bn' ? 'ওপরে ফিরুন' : 'Back to top');
  button.setAttribute('aria-label', label());
  button.title = label();
  button.textContent = '↑';
  document.body.appendChild(button);
  document.addEventListener('wbobc:langchange', () => { button.setAttribute('aria-label', label()); button.title = label(); });
  let ticking = false;
  const update = () => { button.classList.toggle('is-visible', window.scrollY > Math.max(1200, window.innerHeight * 1.5)); ticking = false; };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  button.addEventListener('click', () => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    const target = document.getElementById('main-content') || document.querySelector('main');
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });
  update();
})();

// Arriving at a record from search or a shared link: open it, bring it clear of the
// sticky bar, and highlight it for a few seconds so it is easy to find.
(() => {
  const FLASH_MS = 3500;
  let timer = null;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targetFor = id => {
    if (!id) return null;
    let el = null;
    try { el = document.getElementById(decodeURIComponent(id)); } catch (_) { el = document.getElementById(id); }
    if (!el || el === document.body || el.matches('main, section.tab-panel, .tab-panel')) return null;
    return el;
  };
  const reveal = (el, { smooth = true } = {}) => {
    // Open any collapsed section that holds the record, and the record itself if it is one.
    for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    if (el.tagName === 'DETAILS') el.open = true;
    // A record hidden by a list filter: clear that list's filters so it can be shown.
    if (!el.getClientRects().length) {
      const hiddenBy = el.closest('[hidden], .is-filtered-out');
      if (hiddenBy && hiddenBy !== el.closest('main')) { hiddenBy.hidden = false; hiddenBy.classList.remove('is-filtered-out'); }
      if (!el.getClientRects().length) el.hidden = false;
    }
    el.scrollIntoView({ block: 'start', behavior: smooth && !reduced() ? 'smooth' : 'auto' });
    document.querySelectorAll('.is-search-target').forEach(n => n.classList.remove('is-search-target'));
    // Restart the animation even when the same record is chosen twice.
    void el.offsetWidth;
    el.classList.add('is-search-target');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-search-target'), FLASH_MS);
    // Some lists are redrawn just after load; if the record was replaced, find it again.
    if (!reveal.retried) setTimeout(() => {
      if (el.isConnected) return;
      const again = targetFor(el.id);
      if (again) { reveal.retried = true; reveal(again, { smooth: false }); reveal.retried = false; }
    }, 600);
  };
  const fromHash = opts => {
    const id = location.hash.slice(1);
    if (!id || /^tab|^\//.test(id)) return;
    // Records can be drawn after load, so wait briefly for the target to appear.
    let tries = 0;
    const attempt = () => {
      const el = targetFor(id);
      if (el) return reveal(el, opts);
      if (++tries < 20) setTimeout(attempt, 100);
    };
    attempt();
  };
  window.addEventListener('load', () => {
    if (!location.hash) return;
    setTimeout(() => fromHash({ smooth: false }), 150);
  });
  window.addEventListener('hashchange', () => fromHash({ smooth: true }));
  // A result that points at the page already open, with the same hash, does not fire
  // hashchange, so handle that click directly.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href*="#"]');
    if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash !== location.hash || !url.hash) return;
    const el = targetFor(url.hash.slice(1));
    if (!el) return;
    event.preventDefault();
    reveal(el);
  });
})();
