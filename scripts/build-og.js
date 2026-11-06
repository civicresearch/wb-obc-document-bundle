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
const bnNum = n => String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const caseCount = JSON.parse(fs.readFileSync(path.join(root, 'data/case_files.json'))).cases.length;
const mediaCount = JSON.parse(fs.readFileSync(path.join(root, 'data/media_coverage.json'))).items.length;
const facts = {
  en: {
    home: [`${i18n.en.heroStat1Value} source PDFs`, '66 classes · 7%', '1993–2026'],
    cases: [`${caseCount} proceedings`, 'Calcutta HC · Supreme Court'],
    media: [`${mediaCount} reports`, 'Linked to cases', '2024–2026'],
    'case-map': [`${caseCount} proceedings`, 'Since the 2024 judgment', 'Status at a glance'],
    'case-orders': ['Every court order', 'SC and High Court', 'Linked PDFs'],
    projects: ['Civic Research Group', '3 live projects', 'Free public tools']
  },
  bn: {
    home: [`${bnNum(Number(i18n.en.heroStat1Value))}টি মূল PDF`, '৬৬টি শ্রেণি · ৭%', '১৯৯৩–২০২৬'],
    cases: [`${bnNum(caseCount)}টি মামলা`, 'কলকাতা হাইকোর্ট · সুপ্রিম কোর্ট'],
    media: [`${bnNum(mediaCount)}টি প্রতিবেদন`, 'মামলার সঙ্গে যুক্ত', '২০২৪–২০২৬'],
    'case-map': [`${bnNum(caseCount)}টি মামলা`, '২০২৪-এর রায় থেকে', 'এক নজরে অবস্থা'],
    'case-orders': ['প্রতিটি আদালতের আদেশ', 'সুপ্রিম কোর্ট ও হাইকোর্ট', 'যুক্ত PDF'],
    projects: ['সিভিক রিসার্চ গ্রুপ', '৩টি চালু প্রকল্প', 'সবার জন্য বিনামূল্যে']
  }
};

function card(tab, lang) {
  const t = i18n[lang], [titleKey, subKey, eyebrowKey] = config[tab];
  const title = t[titleKey] || i18n.en[titleKey] || 'West Bengal OBC Archive';
  const eyebrow = (eyebrowKey && (t[eyebrowKey] || i18n.en[eyebrowKey])) || t['masthead.eyebrow'];
  const sub = t[subKey] || i18n.en[subKey] || '';
  const font = lang === 'bn' ? '"Noto Sans Bengali", "Hind Siliguri", sans-serif' : '"Noto Sans", "Noto Sans Bengali", sans-serif';
  const chips = (facts[lang][tab] || []).map(f => `<span>${esc(f)}</span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#0f3b3c;color:#f4efe1;font-family:${font};position:relative;overflow:hidden}
  .ring{position:absolute;right:-140px;top:-160px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(232,146,43,.18),rgba(232,146,43,.07) 60%,transparent 61%)}
  .band{position:absolute;left:0;right:0;bottom:0;height:10px;background:#e8922b}
  header{display:flex;align-items:center;gap:28px;padding:56px 72px 0}
  header img.crg{height:50px} header img.obc{height:62px;margin-left:auto}
  main{position:absolute;left:72px;right:72px;top:170px;border-left:6px solid #e8922b;padding-left:32px}
  .eyebrow{color:#e8922b;font-weight:700;font-size:26px;letter-spacing:${lang === 'bn' ? 0 : '.06em'};text-transform:${lang === 'bn' ? 'none' : 'uppercase'}}
  h1{font-size:${title.length > 48 ? 54 : 64}px;line-height:1.12;font-weight:800;margin-top:14px;letter-spacing:-.01em}
  p{font-size:25px;line-height:1.45;color:#b9cfc9;margin-top:18px;max-width:950px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  footer{position:absolute;left:72px;right:72px;bottom:48px;display:flex;align-items:center;gap:12px}
  .chips{display:flex;gap:12px}
  footer span{border:1.5px solid rgba(244,239,225,.35);border-radius:999px;padding:8px 18px;font-size:22px;font-weight:600}
  .url{margin-left:auto;font-size:22px;color:#b9cfc9;white-space:nowrap}
  </style></head><body><div class="ring"></div>
  <header><img class="crg" src="${logo}"><img class="obc" src="${obc}"></header>
  <main><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></main>
  <footer><div class="chips">${chips}</div><div class="url">obcwb.civicresearch.in</div></footer><div class="band"></div></body></html>`;
}

(async () => {
  const out = path.join(root, 'assets/og');
  fs.mkdirSync(path.join(out, 'bn'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const tab of Object.keys(config)) {
    for (const lang of ['en', 'bn']) {
      await page.setContent(card(tab, lang), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(out, lang === 'bn' ? 'bn' : '', `${tab}.png`) });
    }
  }
  await browser.close();
  console.log(`Rendered ${Object.keys(config).length * 2} sharing images in assets/og/.`);
})();
