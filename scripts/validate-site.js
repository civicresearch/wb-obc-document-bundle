const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sitemap = read('sitemap.xml');
const translations = JSON.parse(read('data/i18n.json'));
assert.ok(translations.en && translations.bn, 'Both language dictionaries must parse');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(urls.length, 13, 'All public pages must be discoverable');
const titles = new Set(), descriptions = new Set();
for (const url of urls) {
  const file = new URL(url).pathname.slice(1) || 'index.html';
  const html = read(file), head = html.split('</head>')[0];
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one main heading`);
  assert.equal((head.match(/rel="canonical"/g) || []).length, 1, `${file}: one canonical`);
  assert.ok(head.includes(`rel="canonical" href="${url}"`), `${file}: canonical matches sitemap`);
  const title = head.match(/<title>(.*?)<\/title>/)?.[1];
  const description = head.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && !titles.has(title), `${file}: unique title`); titles.add(title);
  assert.ok(description && !descriptions.has(description), `${file}: unique description`); descriptions.add(description);
  assert.ok(head.includes('css/polish.css'), `${file}: styling available before paint`);
  const structured = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(JSON.parse(structured)['@graph'].some(item => item['@type'] === 'WebPage'));
  for (const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const target = match[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(root, target)), `${file}: missing local asset ${target}`);
  }
}
assert.ok(read('litigation.html').includes('id="case-2026-10-31"'), 'Latest case is in server HTML');
for (const [file,id] of [['documents.html','docs-tbody'],['obc-list.html','obc-class-list'],['inventory.html','inventory-tbody'],['evidence.html','public-hearings-tbody']]) {
  assert.match(read(file),new RegExp(`<tbody[^>]*id="${id}"[^>]*>\\s*<tr`),`${file}: static records`);
}
assert.ok(read('robots.txt').includes('Sitemap: '));
assert.ok(!read('js/site.js').includes('new XMLHttpRequest'), 'No synchronous data requests');
console.log(`Site validation passed for ${urls.length} pages: metadata, discovery, static records and local assets.`);
