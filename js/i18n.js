/* Authored translations and exact editorial text mappings. Original source text is excluded. */
(() => {
  'use strict';
  let currentLang = 'en';
  let translations = {};
  let textIndex = new Map();
  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const normalize = text => String(text).replace(/\s+/g, ' ').trim();
  const protectedContent = 'script,style,code,pre,svg,.modal-text,[data-source-original],[data-i18n]';
  let observer;
  let queued = false;
  function t(key, values = {}) {
    let result = translations[currentLang]?.[key] ?? translations.en?.[key] ?? key;
    for (const [name,value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, String(value));
    return result;
  }
  function exact(text) {
    const key = textIndex.get(normalize(text));
    return key ? t(key) : text;
  }
  function buildTextIndex() {
    textIndex = new Map();
    for (const [key,value] of Object.entries(translations.en || {})) {
      if (!/<[a-z!/]/i.test(value) && normalize(value)) textIndex.set(normalize(value), key);
    }
  }
  function number(value) { return new Intl.NumberFormat(currentLang === 'bn' ? 'bn-IN' : 'en-IN').format(value); }
  function date(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(currentLang === 'bn' ? 'bn-IN' : 'en-GB', {day:'numeric',month:'short',year:'numeric'}).format(parsed);
  }
  function labelTables() {
    document.querySelectorAll('.table-wrap table').forEach(table => {
      const headings = [...table.querySelectorAll('thead th')].map(el => el.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(row => [...row.children].forEach((cell,index) => {
        if (cell.tagName === 'TD' && headings[index]) cell.dataset.label = headings[index];
      }));
    });
  }
  function localize() {
    if (!translations.en || !document.body) return;
    observer?.disconnect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return node.parentElement?.closest(protectedContent) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    let node;
    while ((node = walker.nextNode())) {
      const existing = originals.get(node);
      const source = existing && node.nodeValue === existing.last ? existing.source : node.nodeValue;
      const translated = currentLang === 'bn' ? exact(source) : source;
      const value = translated === source ? source : source.replace(/\S[\s\S]*\S|\S/, translated);
      if (node.nodeValue !== value) node.nodeValue = value;
      originals.set(node, { source, last: value });
    }
    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(el => {
      if (el.closest('code,pre,.modal-text,[data-source-original]')) return;
      const state = attributeOriginals.get(el) || {};
      for (const attr of ['aria-label','title','placeholder']) {
        if (!el.hasAttribute(attr) || (attr === 'placeholder' && el.hasAttribute('data-i18n-placeholder'))) continue;
        const current = el.getAttribute(attr);
        const old = state[attr];
        const source = old && current === old.last ? old.source : current;
        const value = currentLang === 'bn' ? exact(source) : source;
        if (value !== current) el.setAttribute(attr, value);
        state[attr] = {source, last:value};
      }
      attributeOriginals.set(el,state);
    });
    labelTables();
    observer?.observe(document.body, {subtree:true,childList:true,characterData:true});
  }
  function updatePageContent() {
    document.documentElement.lang = currentLang;
    document.body.classList.toggle('lang-bn', currentLang === 'bn');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (!(key in (translations.en || {}))) return;
      if (el.matches('input,textarea')) el.placeholder = t(key);
      else el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    // Published pages carry their Bengali title and description in data-bn;
    // the English versions are the original text.
    const titleEl = document.querySelector('title');
    const descriptionEl = document.querySelector('meta[name="description"]');
    if (titleEl?.dataset.bn) {
      if (!titleEl.dataset.en) titleEl.dataset.en = document.title;
      document.title = currentLang === 'bn' ? titleEl.dataset.bn : titleEl.dataset.en;
      if (descriptionEl?.dataset.bn) {
        if (!descriptionEl.dataset.en) descriptionEl.dataset.en = descriptionEl.content;
        descriptionEl.content = currentLang === 'bn' ? descriptionEl.dataset.bn : descriptionEl.dataset.en;
      }
    } else {
      const titleKey = document.body.dataset.page ? `pageTitle.${document.body.dataset.page}` : 'siteTitle';
      if (translations[currentLang]?.[titleKey]) document.title = t(titleKey);
    }
    document.querySelectorAll('[data-lang-switch]').forEach(button => {
      const active = button.dataset.langSwitch === currentLang;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    localize();
  }
  function switchLanguage(lang) {
    if (!['en','bn'].includes(lang)) return;
    currentLang = lang;
    try { localStorage.setItem('wb-obc-lang',lang); } catch {}
    updatePageContent();
    if (typeof updateHero === 'function') updateHero();
    document.dispatchEvent(new CustomEvent('wbobc:langchange',{detail:{lang}}));
    localize();
  }
  async function init() {
    try {
      translations = window.OBC_INLINE_I18N || {};
      if (!translations.en) {
        const response = await fetch(`${window.OBC_ASSET_BASE || ''}data/i18n.json`,{cache:'no-store'});
        if (!response.ok) throw new Error('Translation request failed');
        translations = await response.json();
      }
    } catch (error) { console.warn('Using original page text:', error); return; }
    buildTextIndex();
    let saved;
    try { saved = localStorage.getItem('wb-obc-lang'); } catch {}
    const requested = new URLSearchParams(location.search).get('lang');
    // Published pages exist in both languages (/timeline and /bn/timeline):
    // the page's own language wins, and the switch opens the other page.
    const altHref = document.documentElement.dataset.altHref;
    currentLang = altHref ? (document.documentElement.lang === 'bn' ? 'bn' : 'en')
      : requested === 'bn' || (!requested && saved === 'bn') ? 'bn' : 'en';
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; localize(); });
    });
    document.querySelectorAll('.language-switch [data-lang-switch]').forEach(button => {
      button.addEventListener('click',event => {
        event.preventDefault();
        const lang = button.dataset.langSwitch;
        if (altHref) {
          try { localStorage.setItem('wb-obc-lang',lang); } catch {}
          if (lang !== currentLang) {
            const params = new URLSearchParams(location.search); params.delete('lang');
            const query = params.toString();
            location.href = altHref + (query ? `?${query}` : '') + location.hash;
          }
          return;
        }
        const url = new URL(location.href); url.searchParams.set('lang',lang);
        history.pushState({},'',url);
        switchLanguage(lang);
      });
    });
    switchLanguage(currentLang);
    if (!altHref) addEventListener('popstate',() => switchLanguage(new URLSearchParams(location.search).get('lang') === 'bn' ? 'bn' : 'en'));
  }
  window.WBOBCI18n = { t, exact, number, date, localize, switchLanguage, getCurrentLang:() => currentLang, getTranslations:() => translations };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
