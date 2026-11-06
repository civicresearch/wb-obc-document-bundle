const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sitemap = read('sitemap.xml');
const translations = JSON.parse(read('data/i18n.json'));
assert.ok(translations.en && translations.bn, 'Both language dictionaries must parse');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(urls.length, 34, 'All public pages must be discoverable in English and Bengali');
const titles = new Set(), descriptions = new Set();
for (const url of urls) {
  const slug = new URL(url).pathname.slice(1);
  assert.ok(!slug.endsWith('.html'), `${url}: sitemap uses clean URLs`);
  const file = !slug || slug.endsWith('/') ? `${slug}index.html` : `${slug}.html`;
  const bengali = slug.startsWith('bn/');
  const html = read(file), head = html.split('</head>')[0];
  assert.ok(html.includes(`<html lang="${bengali ? 'bn' : 'en'}"`), `${file}: page language`);
  if (bengali) {
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<[^>]+>/g, ' ');
    const bnChars = (main.match(/[\u0980-\u09FF]/g) || []).length;
    assert.ok(bnChars > 200, `${file}: Bengali text is in the page itself (${bnChars} Bengali letters)`);
    assert.ok(/[\u0980-\u09FF]/.test(head.match(/<title[^>]*>(.*?)<\/title>/)[1]), `${file}: Bengali title`);
  }
  for (const lang of ['en', 'bn']) assert.ok(head.includes(`hreflang="${lang}"`), `${file}: hreflang ${lang}`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one main heading`);
  assert.equal((head.match(/rel="canonical"/g) || []).length, 1, `${file}: one canonical`);
  assert.ok(head.includes(`rel="canonical" href="${url}"`), `${file}: canonical matches sitemap`);
  const title = head.match(/<title[^>]*>(.*?)<\/title>/)?.[1];
  const description = head.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && !titles.has(title), `${file}: unique title`); titles.add(title);
  assert.ok(description && !descriptions.has(description), `${file}: unique description`); descriptions.add(description);
  assert.ok(head.includes('css/polish.css'), `${file}: styling available before paint`);
  assert.ok(title.length <= 70, `${file}: title is short enough to show in search results (${title.length})`);
  assert.ok(description.length >= 70 && description.length <= 165, `${file}: description is 70–165 characters (${description.length})`);
  for (const tag of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image']) assert.ok(head.includes(`"${tag}"`), `${file}: ${tag}`);
  const ogImage = head.match(/property="og:image" content="([^"]+)"/)[1];
  assert.ok(fs.existsSync(path.join(root, new URL(ogImage).pathname)), `${file}: sharing image exists`);
  assert.ok(head.includes(`property="og:url" content="${url}"`), `${file}: og:url matches canonical`);
  assert.ok(html.includes('href="https://civicresearch.in/"'), `${file}: links to civicresearch.in`);
  for (const net of ['facebook', 'instagram', 'x']) assert.ok(html.includes(`social-link--${net}`), `${file}: ${net} link`);
  assert.ok(!/href="(?:index|timeline|litigation|media|documents|obc-list|evidence|about|contribute|projects|reports|methods|inventory|record-guide|obc-basics|case-map|case-orders)\.html/.test(html), `${file}: internal links use clean URLs`);
  const structured = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(JSON.parse(structured)['@graph'].some(item => /Page$/.test(item['@type'])), `${file}: WebPage structured data`);
  for (const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const target = match[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(target)) continue;
    const local = target.startsWith("/") ? path.join(root, target) : path.resolve(root, path.dirname(file), target);
    assert.ok(fs.existsSync(local) || fs.existsSync(`${local}.html`), `${file}: missing local page or asset ${target}`);
  }
}
assert.ok(read('litigation.html').includes('id="case-2026-10-31"'), 'Latest case is in server HTML');
for (const [file,id] of [['documents.html','docs-tbody'],['obc-list.html','obc-class-list'],['inventory.html','inventory-tbody'],['evidence.html','public-hearings-tbody']]) {
  assert.match(read(file),new RegExp(`<tbody[^>]*id="${id}"[^>]*>\\s*<tr`),`${file}: static records`);
}
assert.ok(read('litigation.html').includes('id="casefile-shreyasi-dhang-2026"'), 'Case files are in server HTML');
assert.ok((read('media.html').match(/class="media-item"/g) || []).length >= 20, 'Media coverage is in server HTML');
assert.ok(read('robots.txt').includes('Sitemap: '));
assert.ok(read('404.html').includes('noindex'), '404 page is not indexed');
assert.ok(!read('js/site.js').includes('new XMLHttpRequest'), 'No synchronous data requests');
// Every archived PDF is fingerprinted, unchanged, and counted correctly on the home page.
{
  const crypto = require('crypto');
  const sums = JSON.parse(read('data/pdf_checksums.json')).files;
  const pdfs = ['obc_pdfs', 'case_pdfs'].flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.pdf')).map(f => `${d}/${f}`));
  for (const f of pdfs) {
    assert.ok(sums[f], `${f} is not in data/pdf_checksums.json (run python3 scripts/build-checksums.py)`);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex'), sums[f].sha256, `${f} changed since it was fingerprinted`);
  }
  for (const f of Object.keys(sums)) assert.ok(fs.existsSync(path.join(root, f)), `${f} is fingerprinted but missing`);
  assert.equal(translations.en.heroStat1Value, String(pdfs.length), 'Home page PDF count (heroStat1Value) matches the archive');
}
console.log(`Site validation passed for ${urls.length} pages: metadata, discovery, static records and local assets.`);
