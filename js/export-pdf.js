(() => {
  'use strict';

  if (document.body.dataset.page === 'contribute') return;
  const main = document.getElementById('main-content');
  if (!main) return;

  const toolbar = document.createElement('div');
  toolbar.className = 'pdf-export-toolbar';
  toolbar.innerHTML = `
    <button type="button" class="pdf-export-button">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span data-print-label></span>
    </button>
    <span class="pdf-export-hint" data-print-hint></span>`;
  main.prepend(toolbar);
  const printMeta = document.createElement('p');
  printMeta.className = 'print-generated';
  const heroSub = document.querySelector('.hero-sub');
  if (heroSub) heroSub.after(printMeta);
  else main.insertBefore(printMeta, toolbar.nextSibling);

  function updatePrintContent() {
    const bn = document.documentElement.lang === 'bn';
    const button = toolbar.querySelector('button');
    toolbar.querySelector('[data-print-label]').textContent = bn ? 'প্রিন্ট / PDF' : 'Print / Save as PDF';
    toolbar.querySelector('[data-print-hint]').textContent = bn
      ? 'প্রিন্ট ডায়ালগে PDF হিসেবে সংরক্ষণ করুন বেছে নিন।'
      : 'You can also use your browser’s Print command.';
    button.setAttribute('aria-label', bn ? 'প্রিন্ট করুন বা PDF হিসেবে সংরক্ষণ করুন' : 'Print this page or save it as a PDF');
    button.setAttribute('title', bn ? 'প্রিন্ট / PDF' : 'Print / Save as PDF');
    const generated = new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
    }).format(new Date());
    printMeta.textContent = bn
      ? `প্রিন্ট কপি তৈরির সময়: ${generated} (ভারতীয় সময়)`
      : `Print copy generated: ${generated} (India Standard Time)`;
  }

  updatePrintContent();
  document.addEventListener('wbobc:langchange', updatePrintContent);
  window.addEventListener('beforeprint', updatePrintContent);
  toolbar.querySelector('button').addEventListener('click', () => {
    updatePrintContent();
    window.print();
  });
})();
