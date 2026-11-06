#!/usr/bin/env node
// Renders 1200x630 sharing images (Open Graph / X cards) for every public page,
// in English and Bengali, into assets/og/. Needs Playwright with Chromium;
// run it after changing page titles: `npm run build:og`.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const i18n = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n.json'), 'utf8'));
const { config } = require('./site-publishing');
const logo = `data:image/png;base64,${fs.readFileSync(path.join(root, 'assets/crg-on-dark.png')).toString('base64')}`;
const obc = `data:image/webp;base64,${fs.readFileSync(path.join(root, 'obcwb-flat-light-logo.webp')).toString('base64')}`;
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const esc = s => strip(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pages = require('../data/seo.json').pages;
const { seoFor, slugFor } = require('./site-publishing');
const FILES = { home: 'index.html', timeline: 'timeline.html', cases: 'litigation.html', 'case-map': 'case-map.html', projects: 'projects.html', 'case-orders': 'case-orders.html', media: 'media.html', 'obc-list': 'obc-list.html', documents: 'documents.html', evidence: 'evidence.html', 'entry-framework': 'record-guide.html', inventory: 'inventory.html', 'obc-basics': 'obc-basics.html', methods: 'methods.html', reports: 'reports.html', about: 'about.html', contribute: 'contribute.html' };

// One sharing card per page and language. The English card also carries the
// Bengali page name, because the site is bilingual and links are shared in both.
function card(tab, lang) {
  const seo = seoFor(tab), other = lang === 'bn' ? 'en' : 'bn';
  const [titleKey, , eyebrowKey] = config[tab];
  const name = l => strip(i18n[l][titleKey] || i18n.en[titleKey] || 'West Bengal OBC Archive');
  const title = name(lang), second = name(other);
  const eyebrow = strip((eyebrowKey && (i18n[lang][eyebrowKey] || i18n.en[eyebrowKey])) || i18n[lang]['masthead.eyebrow']);
  const sub = lang === 'bn' ? seo.description_bn : seo.description;
  const facts = lang === 'bn' ? seo.facts_bn : seo.facts;
  const url = `obcwb.civicresearch.in${slugFor(FILES[tab]) ? '/' + slugFor(FILES[tab]) : ''}`;
  const bnFont = '"Noto Sans Bengali", "Hind Siliguri", sans-serif';
  const font = lang === 'bn' ? bnFont : '"Noto Sans", "Noto Sans Bengali", sans-serif';
  const size = title.length > 44 ? 52 : title.length > 30 ? 60 : 68;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&family=Noto+Sans:wght@400;600;700;800&display=block"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:linear-gradient(135deg,#0f3b3c 0%,#0c3132 60%,#0a2a2b 100%);color:#f4efe1;font-family:${font};position:relative;overflow:hidden}
  .ring{position:absolute;right:-170px;top:-190px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(232,146,43,.20),rgba(232,146,43,.07) 60%,transparent 61%)}
  .ring2{position:absolute;right:120px;bottom:-260px;width:420px;height:420px;border-radius:50%;border:2px solid rgba(244,239,225,.06)}
  .band{position:absolute;left:0;right:0;bottom:0;height:12px;background:#e8922b}
  header{position:absolute;left:72px;right:72px;top:46px;display:flex;align-items:center;justify-content:space-between}
  header img.obc{height:92px} header img.crg{height:46px;opacity:.95}
  main{position:absolute;left:72px;right:72px;top:178px;border-left:6px solid #e8922b;padding-left:32px}
  .eyebrow{color:#f2a541;font-weight:700;font-size:24px;letter-spacing:${lang === 'bn' ? 0 : '.06em'};text-transform:${lang === 'bn' ? 'none' : 'uppercase'}}
  h1{font-size:${size}px;line-height:1.12;font-weight:800;margin-top:12px;letter-spacing:-.01em;max-width:1000px}
  .alt{font-family:${lang === 'bn' ? '"Noto Sans", sans-serif' : bnFont};font-size:30px;font-weight:600;color:#f2c88a;margin-top:10px}
  p{font-size:24px;line-height:1.45;color:#c4d8d2;margin-top:16px;max-width:1000px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  footer{position:absolute;left:72px;right:72px;bottom:44px;display:flex;align-items:center;gap:12px}
  .chips{display:flex;gap:12px}
  footer span{border:1.5px solid rgba(244,239,225,.35);background:rgba(244,239,225,.06);border-radius:999px;padding:8px 18px;font-size:21px;font-weight:600;white-space:nowrap}
  .url{margin-left:auto;font-size:21px;color:#c4d8d2;white-space:nowrap;font-family:"Noto Sans",sans-serif}
  </style></head><body><div class="ring"></div><div class="ring2"></div>
  <header><img class="obc" src="${obc}"><img class="crg" src="${logo}"></header>
  <main><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${second !== title ? `<div class="alt">${esc(second)}</div>` : ''}<p>${esc(sub)}</p></main>
  <footer><div class="chips">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</div><div class="url">${esc(url)}</div></footer><div class="band"></div></body></html>`;
}

// App icons for phones and the installable web app, drawn from favicon.svg.
function icon(size, maskable) {
  const svg = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');
  const inner = maskable ? `<div style="width:${size}px;height:${size}px;background:#122f3d;display:flex;align-items:center;justify-content:center"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${size * 0.8}px;height:${size * 0.8}px"></div>`
    : `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${size}px;height:${size}px;display:block">`;
  return `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:transparent}</style></head><body>${inner}</body></html>`;
}

(async () => {
  const out = path.join(root, 'assets/og');
  fs.mkdirSync(path.join(out, 'bn'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const tab of Object.keys(config)) {
    for (const lang of ['en', 'bn']) {
      await page.setContent(card(tab, lang), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(out, lang === 'bn' ? 'bn' : '', `${tab}.png`) });
    }
  }
  const icons = path.join(root, 'assets/icons');
  fs.mkdirSync(icons, { recursive: true });
  for (const [file, size, maskable] of [['apple-touch-icon.png', 180, true], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(icon(size, maskable), { waitUntil: 'load' });
    await page.screenshot({ path: path.join(icons, file), omitBackground: !maskable });
  }
  await browser.close();
  console.log(`Rendered ${Object.keys(config).length * 2} sharing images in assets/og/ and app icons in assets/icons/.`);
})();
