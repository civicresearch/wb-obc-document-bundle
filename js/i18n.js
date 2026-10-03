// i18n - Internationalization module for WB OBC Archive
(function() {
  'use strict';

  let currentLang = 'en';
  let translations = {};

  // Load translations from JSON file.
  // cache: 'no-store' keeps translations fresh on devices where the HTTP cache
  // would otherwise serve a stale copy for days (heuristic caching).
  async function loadTranslations() {
    try {
      const response = await fetch('data/i18n.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load translations');
      translations = await response.json();
      return true;
    } catch (error) {
      console.error('Error loading translations:', error);
      return false;
    }
  }

  // Get translation for a key
  function t(key) {
    if (!translations[currentLang]) return key;
    return translations[currentLang][key] || translations['en'][key] || key;
  }

  // Update all elements with data-i18n attribute
  function updatePageContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const html = t(key);
      
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = html;
      } else {
        el.innerHTML = html;
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });

    // Update document title
    const titleEl = document.querySelector('title');
    if (titleEl && translations[currentLang]?.siteTitle) {
      const pageKey = document.body.dataset.page ? `pageTitle.${document.body.dataset.page}` : 'siteTitle';
      titleEl.textContent = translations[currentLang][pageKey] || translations[currentLang].siteTitle;
    }

    // Update body class for font switching
    document.body.classList.toggle('lang-bn', currentLang === 'bn');
    document.documentElement.lang = currentLang;

    // Save preference
    localStorage.setItem('wb-obc-lang', currentLang);
  }

  // Switch language with smooth animation
  function switchLanguage(lang) {
    if (lang !== 'en' && lang !== 'bn') return;
    
    // Add fade-out effect
    document.body.classList.add('lang-switching');
    
    currentLang = lang;
    updatePageContent();
    
    // Update hero section (header) to match new language
    if (typeof updateHero === 'function') {
      updateHero();
    }
    
    // Dispatch event for components to re-render
    document.dispatchEvent(new CustomEvent('wbobc:langchange', { detail: { lang } }));
    
    // Update language switcher UI
    document.querySelectorAll('.language-switch [aria-current]').forEach(el => {
      el.removeAttribute('aria-current');
    });
    const activeLink = document.querySelector(`.language-switch a[lang="${lang}"]`);
    if (activeLink) {
      activeLink.setAttribute('aria-current', 'true');
    }
    const activeSpan = document.querySelector(`.language-switch span[aria-current="true"]`);
    if (activeSpan && activeSpan.textContent === (lang === 'en' ? 'EN' : 'বাংলা')) {
      // Keep the span as is, it shows current language
    }
    
    // Remove fade-out effect after short delay
    setTimeout(() => {
      document.body.classList.remove('lang-switching');
    }, 300);
  }

  // Initialize
  async function init() {
    const loaded = await loadTranslations();
    if (!loaded) {
      console.warn('Translations not loaded, using defaults');
      return;
    }

    // Check saved preference or URL parameter - default to English
    const urlParams = new URLSearchParams(window.location.search);
    const savedLang = localStorage.getItem('wb-obc-lang');
    const urlLang = urlParams.get('lang');
    
    // Default to English unless explicitly set to Bengali
    if (urlLang === 'bn' || (!urlLang && savedLang === 'bn')) {
      currentLang = 'bn';
    } else {
      currentLang = 'en';
    }

    // Set up language switcher click handlers for both links and buttons
    document.querySelectorAll('.language-switch a[data-lang-switch], .language-switch button[data-lang-switch]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = link.getAttribute('data-lang-switch');
        switchLanguage(lang);
        
        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.pushState({}, '', url);
      });
    });

    // Initial render
    updatePageContent();
    document.dispatchEvent(new CustomEvent('wbobc:langchange', { detail: { lang: currentLang } }));
  }

  // Expose globally
  window.WBOBCI18n = {
    t,
    switchLanguage,
    getCurrentLang: () => currentLang,
    getTranslations: () => translations
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
