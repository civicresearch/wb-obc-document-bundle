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
