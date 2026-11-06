#!/usr/bin/env node
// Writes the Bengali text into the Bengali pages (bn/*.html) at build time,
// so search engines and slow connections get Bengali straight away instead of
// waiting for js/i18n.js. It applies the same translations the browser would:
// data-i18n keys, data-en/data-bn pairs, exact-text matches and labels.
// Needs Playwright with Chromium (as build-og.js does). Without it the
// Bengali pages still work: the browser translates them as they load.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'bn');
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.warn('Playwright is not installed: Bengali pages will be translated in the browser instead.');
  process.exit(0);
}
const i18n = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n.json'), 'utf8'));

function translatePage({ en, bn, slugs }) {
  const normalize = text => String(text).replace(/\s+/g, ' ').trim();
  const index = new Map();
  for (const [key, value] of Object.entries(en)) if (!/<[a-z!/]/i.test(value) && normalize(value)) index.set(normalize(value), key);
  const exact = text => { const key = index.get(normalize(text)); return key && bn[key] ? bn[key] : null; };
  const protectedContent = 'script,style,code,pre,svg,.modal-text,[data-source-original],[data-i18n],[data-en]';
  let changed = 0;
  // Narrative timeline and court records have their own Bengali text.
  document.querySelectorAll('li.event[id], li.case-event[id]').forEach(li => {
    const key = `narrative.${li.classList.contains('event') ? 'timeline' : 'case'}.${li.id}`;
    if (bn[key]) { li.innerHTML = bn[key]; changed++; }
  });
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!(key in en) || !bn[key]) return;
    if (el.matches('input,textarea')) el.placeholder = bn[key]; else el.innerHTML = bn[key];
    changed++;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const v = bn[el.dataset.i18nPlaceholder]; if (v) el.placeholder = v; });
  document.querySelectorAll('[data-en][data-bn]').forEach(el => { el.textContent = el.dataset.bn; changed++; });
  // (A TreeWalker filter callback cannot run with page scripts disabled.)
  const nodes = [];
  (function walk(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === 3) nodes.push(child);
      else if (child.nodeType === 1 && !child.matches(protectedContent)) walk(child);
    }
  })(document.body);
  for (const n of nodes) {
    const value = exact(n.nodeValue);
    if (value) { n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, value); changed++; }
  }
  document.querySelectorAll('[aria-label],[title],[placeholder],[data-label],img[alt]').forEach(el => {
    if (el.closest('code,pre,.modal-text,[data-source-original]')) return;
    for (const attr of ['aria-label', 'title', 'placeholder', 'data-label', 'alt']) {
      if (!el.hasAttribute(attr) || (attr === 'placeholder' && el.hasAttribute('data-i18n-placeholder'))) continue;
      const value = exact(el.getAttribute(attr));
      if (value) el.setAttribute(attr, value);
    }
  });
  // Translated passages carry their own links: files step up one folder, as
  // in bengaliVariant(); page links stay relative so they lead to Bengali pages.
  document.querySelectorAll('main [href], main [src]').forEach(el => {
    for (const attr of ['href', 'src']) {
      const v = el.getAttribute(attr);
      if (!v || /^(?:#|\/|[a-z][a-z0-9+.-]*:|\.\.\/)/i.test(v)) continue;
      const m = /^(?:\.\/)?([a-z-]*)(?:[#?].*)?$/.exec(v);
      if (m && slugs.includes(m[1])) continue;
      el.setAttribute(attr, `../${v}`);
    }
  });
  return changed;
}

(async () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route('**/*', route => route.request().resourceType() === 'document' ? route.continue() : route.abort());
  const page = await context.newPage();
  let total = 0;
  for (const file of files) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    await page.setContent(source, { waitUntil: 'domcontentloaded' });
    total += await page.evaluate(translatePage, { en: i18n.en, bn: i18n.bn, slugs: ['', 'timeline', 'litigation', 'case-map', 'projects', 'case-orders', 'media', 'obc-list', 'documents', 'evidence', 'record-guide', 'inventory', 'obc-basics', 'methods', 'reports', 'about', 'contribute'] });
    let html = await page.content();
    if (!/^<!doctype html>/i.test(html)) html = `<!doctype html>\n${html}`;
    fs.writeFileSync(path.join(dir, file), html.replace(/^<!DOCTYPE html>/, '<!doctype html>'));
  }
  await browser.close();
  console.log(`Wrote Bengali text into ${files.length} pages in bn/ (${total} passages).`);
})();
