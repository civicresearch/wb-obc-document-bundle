const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const translations = read('data/i18n.json').en;
const origin = `https://${fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim()}`;
// Civic Research Group's social profiles, used in structured data. The visible
// links with icons are in site-src/app-template.html.
const SOCIAL = [
  { name: 'Facebook', url: 'https://www.facebook.com/civicresearch' },
  { name: 'Instagram', url: 'https://www.instagram.com/civicresearch' },
  { name: 'X', url: 'https://x.com/CivicResearchX' }
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Translation keys for each page's hero title, introduction and eyebrow.
// Search and sharing text lives in data/seo.json.
const config = {
  home: ['heroTitle', 'heroSub', 'heroEyebrow'],
  timeline: ['timelineTitle', 'timelineSub', 'timelineHeroEyebrow'],
  cases: ['cases.title', 'casesSectionSub', 'casesHeroEyebrow'],
  'obc-list': ['obcList.title', 'obcListSub', 'obcListHeroEyebrow'],
  documents: ['documents.title', 'documents.subtitle', 'documentsHeroEyebrow'],
  evidence: ['completenessAuditHeading', 'evidenceSub', 'evidenceHeroEyebrow'],
  'entry-framework': ['frameworkHeading', 'frameworkSub', 'entryFrameworkHeroEyebrow'],
  inventory: ['inventory.title', 'inventorySub', ''],
  'obc-basics': ['obcBasicsHeading', 'obcBasicsSub', 'obcBasicsHeroEyebrow'],
  methods: ['methodsHeading', 'methodsSub', 'methodsHeroEyebrow'],
  reports: ['reportsHeading', 'reportsSub', 'reportsHeroEyebrow'],
  'case-orders': ['caseOrders.title', 'caseOrders.sub', 'caseOrders.eyebrow'],
  'case-map': ['caseMap.title', 'caseMap.sub', 'caseMap.eyebrow'],
  media: ['media.title', 'media.sub', 'media.eyebrow'],
  projects: ['projects.title', 'projects.sub', 'projects.eyebrow'],
  about: ['aboutTitle', 'aboutSub', 'aboutHeroEyebrow'],
  contribute: ['contribute.heroTitle', 'contribute.heroSub', 'contribute.heroKicker']
};
// Clean URLs: GitHub Pages serves timeline.html at /timeline, so links,
// canonicals and the sitemap use the address without the extension.
function slugFor(file) { return file === 'index.html' ? '' : file.replace(/\.html$/, ''); }
function urlFor(page) { return `${origin}/${slugFor(page.file)}`; }
const PAGE_FILE_PATTERN = /^(index|timeline|litigation|case-map|projects|case-orders|media|obc-list|documents|evidence|record-guide|inventory|obc-basics|methods|reports|about|contribute)\.html$/;
// Rewrites links to public pages ("timeline.html#x", "index.html") to their
// clean form ("timeline#x", "./"), including links inside data-en/data-bn
// attributes where quotes are escaped as &quot;.
function cleanUrls(html) {
  return html.replace(/(\b(?:href|action)=)("|&quot;|\\")([a-z-]+\.html)([?#][^"&\\]*)?(?=\2)/g, (full, attr, q, file, rest = '') => {
    if (!PAGE_FILE_PATTERN.test(file)) return full;
    const slug = slugFor(file);
    return `${attr}${q}${slug || './'}${rest}`;
  });
}
const counts = (() => {
  const pdfs = ['obc_pdfs', 'case_pdfs'].reduce((n, d) => n + fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.pdf')).length, 0);
  return { pdfs, classes: read('obc_classes.json').current_classes_2026.length, cases: read('data/case_files.json').cases.length, media: read('data/media_coverage.json').items.length };
})();
const bnDigitsSeo = text => String(text).replace(/[0-9]/g, n => '০১২৩৪৫৬৭৮৯'[n]);
function seoFor(tab) {
  const entry = read('data/seo.json').pages[tab];
  if (!entry) throw new Error(`data/seo.json has no entry for ${tab}`);
  const fill = (text, bn) => String(text).replace(/\{(\w+)\}/g, (_, k) => bn ? bnDigitsSeo(counts[k]) : counts[k]);
  const out = {};
  for (const [k, v] of Object.entries(entry)) out[k] = Array.isArray(v) ? v.map(x => fill(x, k.endsWith('_bn'))) : fill(v, k.endsWith('_bn'));
  return out;
}
const REVIEWED = read('data/case_files.json').reviewed;
const PAGE_TYPES = { about: 'AboutPage', contribute: 'ContactPage', cases: 'CollectionPage', media: 'CollectionPage', documents: 'CollectionPage', 'obc-list': 'CollectionPage', inventory: 'CollectionPage', timeline: 'CollectionPage', projects: 'CollectionPage', reports: 'CollectionPage', evidence: 'CollectionPage' };
function structuredData(page, url, description) {
  const org = {'@type':'Organization','@id':`${origin}/#organization`,name:'Civic Research Group',url:'https://civicresearch.in',logo:`${origin}/assets/crg-on-light.png`,email:'civicresearchgroup@gmail.com',sameAs:SOCIAL.map(s => s.url)};
  const graph = [
    org,
    {'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'WB OBC Archive',alternateName:'পশ্চিমবঙ্গ ওবিসি আর্কাইভ',inLanguage:['en','bn'],publisher:{'@id':`${origin}/#organization`},potentialAction:{'@type':'SearchAction',target:`${origin}/?q={search_term_string}`,'query-input':'required name=search_term_string'}},
    {'@type':PAGE_TYPES[page.tab] || 'WebPage','@id':`${url}#webpage`,url,name:page.title,headline:page.title,description,inLanguage:'en',dateModified:REVIEWED,isPartOf:{'@id':`${origin}/#website`},publisher:{'@id':`${origin}/#organization`},about:{'@type':'Thing',name:'Other Backward Classes reservation in West Bengal'},...(page.tab !== 'home' ? {breadcrumb:{'@id':`${url}#breadcrumb`}} : {}),primaryImageOfPage:{'@type':'ImageObject',url:`${origin}/assets/og/${page.tab}.png`,width:1200,height:630}}
  ];
  if (page.tab !== 'home') graph.push({'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${origin}/`},{'@type':'ListItem',position:2,name:page.title,item:url}]});
  if (page.tab === 'home') graph.push({'@type':'Dataset','@id':`${origin}/#dataset`,name:'West Bengal OBC reservation records, 1993–2026',description:'Notifications, OBC class lists, court orders, public-hearing notices and source PDFs on Other Backward Classes reservation in West Bengal, with extracted text and provenance notes.',url:`${origin}/`,creator:{'@id':`${origin}/#organization`},inLanguage:['en','bn'],spatialCoverage:'West Bengal, India',temporalCoverage:'1993/2026',dateModified:REVIEWED,isAccessibleForFree:true,keywords:['OBC','Other Backward Classes','West Bengal','reservation','Calcutta High Court','Supreme Court of India']});
  if (page.tab === 'cases') graph.push({'@type':'ItemList','@id':`${url}#cases`,name:'West Bengal OBC court proceedings',itemListElement:read('data/case_files.json').cases.map((c,i)=>({'@type':'ListItem',position:i+1,url:`${url}#${c.id}`,name:c.title}))});
  if (page.tab === 'media') graph.push({'@type':'ItemList','@id':`${url}#coverage`,name:'Media coverage of West Bengal OBC reservation',itemListElement:read('data/media_coverage.json').items.slice().sort((a,b)=>b.date.localeCompare(a.date)).map((m,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'NewsArticle',headline:m.headline.slice(0,110),url:m.url,datePublished:m.date,publisher:{'@type':'Organization',name:m.outlet.replace(/\s*\(.*\)$/,'')}}}))});
  return JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
}
function metadata(page) {
  const seo = seoFor(page.tab);
  const url = urlFor(page), description = seo.description;
  const title = seo.title;
  const image = `${origin}/assets/og/${page.tab}.png`;
  const alt = `${page.title}, WB OBC Archive by Civic Research Group. ${seo.facts.join(', ')}.`;
  const bnUrl = `${url}${url.includes('?') ? '&' : '?'}lang=bn`;
  return `<link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="en" href="${url}">
  <link rel="alternate" hreflang="bn" href="${bnUrl}">
  <link rel="alternate" hreflang="x-default" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="Civic Research Group">
  <meta name="publisher" content="Civic Research Group">
  <meta name="application-name" content="WB OBC Archive">
  <meta name="apple-mobile-web-app-title" content="WB OBC Archive">
  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
  <link rel="icon" href="assets/icons/icon-192.png" type="image/png" sizes="192x192">
  <link rel="author" href="https://civicresearch.in/">
  <link rel="sitemap" type="application/xml" href="sitemap.xml">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="WB OBC Archive">
  <meta property="og:locale" content="en_IN">
  <meta property="og:locale:alternate" content="bn_IN">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escape(alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@CivicResearchX">
  <meta name="twitter:creator" content="@CivicResearchX">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${escape(alt)}">
  <script type="application/ld+json">${structuredData(page, url, description)}</script>`;
}
function cell(value, label) { return `<td data-label="${escape(label)}">${value}</td>`; }
function pdfLink(href, label = 'Open PDF') { return href ? `<a href="${escape(href)}" target="_blank" rel="noreferrer">${escape(label)}</a>` : ''; }
function fillBody(html, id, rows) {
  return html.replace(new RegExp(`(<tbody[^>]*id="${id}"[^>]*>)[\\s\\S]*?(</tbody>)`), (_, open, close) => open + rows + close);
}
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthsBn = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];
function shortDate(iso) { const [y,m,d] = iso.split('-').map(Number); return `${d} ${months[m-1]} ${y}`; }
function bnDigits(text) { return String(text).replace(/[0-9]/g, n => '০১২৩৪৫৬৭৮৯'[n]); }
function shortDateBn(iso) { const [y,m,d] = iso.split('-').map(Number); return bnDigits(`${d} ${monthsBn[m-1]} ${y}`); }
function bi(en, bn, tag = 'span', cls = '') { return `<${tag}${cls ? ` class="${cls}"` : ''} data-en="${escape(en)}"${bn ? ` data-bn="${escape(bn)}"` : ''}>${escape(en)}</${tag}>`; }
function renderCaseFiles(html, pageLinks = {}) {
  if (!html.includes('<!-- Case files are rendered from data/case_files.json. -->')) return html;
  const files = read('data/case_files.json').cases;
  const events = Object.fromEntries(read('case_events.json').map(e => [e.id, e]));
  const manifest = read('case_manifest.json');
  const media = read('data/media_coverage.json').items;
  const byId = Object.fromEntries(files.map(c => [c.id, c]));
  const caseHref = id => `${pageLinks.cases || ''}#${id}`;
  const cards = files.map(c => {
    const records = c.records.map(id => {
      const e = events[id], date = e.date || id.replace('case-', '').slice(0, 10);
      const linked = [...new Set((e.html.match(/case_pdfs\/[^"]+\.pdf/g) || []))];
      const files = linked.length ? linked : manifest.filter(m => m.date === date).map(m => m.local_file);
      const pdfs = files.map(f => `<a class="cf-pdf" href="${escape(f)}" target="_blank" rel="noreferrer">PDF</a>`).join(' ');
      return `<li><time datetime="${date}">${escape(shortDate(date))}</time> <a href="${caseHref(id)}">${escape(e.title)}</a> ${pdfs}</li>`;
    }).join('');
    const reports = media.filter(m => m.cases.includes(c.id));
    const reportList = reports.length ? `<h4>${bi('In the news','সংবাদমাধ্যমে')}</h4><ul class="cf-media">${reports.map(m => `<li><a href="${escape(m.url)}" target="_blank" rel="noopener noreferrer">${escape(m.headline)}</a> <span class="cf-media-meta">${escape(m.outlet)} · ${escape(shortDate(m.date))}</span></li>`).join('')}</ul>` : '';
    const related = (c.related || []).filter(id => byId[id]).map(id => `<a href="${caseHref(id)}">${bi(byId[id].title, byId[id].title_bn)}</a>`).join(' · ');
    const next = c.next_date ? `<p class="cf-next"><strong>${bi('Next listing','পরবর্তী তালিকা')}</strong> <time datetime="${c.next_date}" data-en="${escape(shortDate(c.next_date))}" data-bn="${escape(shortDateBn(c.next_date))}">${escape(shortDate(c.next_date))}</time></p>` : '';
    return `<article id="${c.id}" class="case-file" data-status="${escape(c.status)}" data-text="${escape([c.title,c.title_bn,c.court,c.forum,...c.case_numbers,c.summary].join(' ').toLowerCase())}">
  <div class="cf-top"><span class="cf-court">${escape(c.court)}</span><span class="cf-status cf-status--${escape(c.status)}">${bi(c.status_label, c.status_label_bn)}</span></div>
  ${bi(c.title, c.title_bn, 'h3')}
  <p class="cf-numbers">${c.case_numbers.map(n => `<code>${escape(n)}</code>`).join(' ')}</p>
  ${bi(c.summary, c.summary_bn, 'p', 'cf-summary')}
  ${next}
  <details class="cf-details"><summary>${bi(`${c.records.length} court record${c.records.length === 1 ? '' : 's'}${reports.length ? ` · ${reports.length} news report${reports.length === 1 ? '' : 's'}` : ''}`, `${bnDigits(c.records.length)}টি আদালত-নথি${reports.length ? ` · ${bnDigits(reports.length)}টি সংবাদ` : ''}`)}</summary>
    <ol class="cf-records">${records}</ol>
    ${reportList}
  </details>
  ${related ? `<p class="cf-related"><span>${bi('Related','সম্পর্কিত')}:</span> ${related}</p>` : ''}
</article>`;
  }).join('\n');
  return html.replace('<!-- Case files are rendered from data/case_files.json. -->', cards).replace(/(id="case-file-count"[^>]*>)0/, (_, open) => open + files.length);
}
function wrapWords(text, max) {
  const lines = []; let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
function renderCaseMap(html, pageLinks = {}) {
  const marker = '<!-- Case map is rendered from data/case_map.json. -->';
  if (!html.includes(marker)) return html;
  const map = read('data/case_map.json');
  const files = Object.fromEntries(read('data/case_files.json').cases.map(c => [c.id, c]));
  const href = id => `${pageLinks.cases ?? 'litigation.html'}#${id}`;
  const STATUS = { pending: ['Pending','বিচারাধীন'], listed: ['Listed','তালিকাভুক্ত'], stayed: ['Stayed','স্থগিত'], decided: ['Decided','নিষ্পত্তি'], withdrawn: ['Withdrawn','প্রত্যাহৃত'], dismissed: ['Dismissed','খারিজ'] };
  const courtShort = c => c.replace('Calcutta High Court', 'Calcutta HC').replace('Supreme Court of India', 'Supreme Court');
  const courtShortBn = c => courtShort(c).replace('Calcutta HC', 'কলকাতা হাইকোর্ট').replace('Supreme Court', 'সুপ্রিম কোর্ট');
  // Build the tree.
  const root = { kind: 'root', ...map.root, depth: 0, children: map.groups.map(g => ({ kind: 'group', ...g, depth: 1, children: [] })) };
  const toNode = (n, depth) => ({ kind: 'case', ...n, depth, children: (n.children || []).map(k => toNode(k, depth + 1)) });
  map.groups.forEach((g, i) => { root.children[i].children = g.children.map(n => toNode(n, 2)); root.children[i].groupIndex = i; });
  const all = [];
  (function walk(n, group) { n.group = n.kind === 'group' ? n.groupIndex : group; all.push(n); n.children.forEach(k => walk(k, n.group)); })(root, -1);
  for (const n of all) if (n.kind === 'case' && !files[n.case]) throw new Error(`case_map.json: unknown case ${n.case}`);
  // Sizes.
  const COLX = [24, 286, 528, 952], W = [236, 210, 330, 300];
  const LINE = 19;
  for (const n of all) {
    const w = W[n.depth];
    n.w = w;
    const cw = n.kind === 'root' ? [10.6, 11.5] : [7.6, 8.4];
    n.en = wrapWords(n.label, Math.floor((w - 32) / cw[0]));
    n.bn = wrapWords(n.label_bn, Math.floor((w - 32) / cw[1]));
    const lines = Math.max(n.en.length, n.bn.length);
    n.h = n.kind === 'case' ? 30 + lines * LINE + 46 : n.kind === 'group' ? 28 + lines * LINE : 40 + lines * 24 + 26;
  }
  // Vertical placement: leaves stacked, parents centred on children.
  let y = 24; const GAP = 18;
  (function place(n) {
    if (!n.children.length) { n.y = y; y += n.h + GAP; return; }
    const before = y;
    n.children.forEach(place);
    const first = n.children[0], last = n.children[n.children.length - 1];
    const mid = (first.y + first.h / 2 + last.y + last.h / 2) / 2;
    n.y = Math.max(before, mid - n.h / 2);
    if (n.y + n.h + GAP > y) y = n.y + n.h + GAP;
    if (n.kind === 'group') y += 14;
  })(root);
  const height = Math.ceil(y + 10), width = COLX[3] + W[3] + 24;
  for (const n of all) n.x = COLX[n.depth];
  const byCase = Object.fromEntries(all.filter(n => n.case).map(n => [n.case, n]));
  const textBlock = (lines, x, y0, cls, step) => lines.map((l, i) => `<tspan x="${x}" y="${y0 + i * step}">${escape(l)}</tspan>`).join('');
  const label = (n, x, y0, cls, step) => `<text class="${cls} cm-en">${textBlock(n.en, x, y0, cls, step)}</text><text class="${cls} cm-bn">${textBlock(n.bn, x, y0, cls, step)}</text>`;
  const curve = (a, b) => { const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, dx = (x2 - x1) / 2; return `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`; };
  const edges = [];
  for (const n of all) for (const k of n.children) {
    edges.push(`<path class="cm-edge cm-g${k.group}" d="${curve(n, k)}"/>`);
    if (k.edge) { const mx = (n.x + n.w + k.x) / 2, my = (n.y + n.h / 2 + k.y + k.h / 2) / 2 - 8; edges.push(`<text class="cm-edge-label cm-en" x="${mx}" y="${my}" text-anchor="middle">${escape(k.edge)}</text><text class="cm-edge-label cm-bn" x="${mx}" y="${my}" text-anchor="middle">${escape(k.edge_bn)}</text>`); }
  }
  // Cross-links between related cases that are not already parent and child.
  const treePairs = new Set(); for (const n of all) for (const k of n.children) if (n.case && k.case) treePairs.add([n.case, k.case].sort().join('|'));
  const cross = new Set();
  for (const n of all.filter(n => n.kind === 'case' || n.kind === 'root')) for (const r of (files[n.case].related || [])) {
    if (!byCase[r]) continue; const key = [n.case, r].sort().join('|');
    if (treePairs.has(key) || cross.has(key)) continue; cross.add(key);
  }
  const crossPaths = [...cross].map(key => {
    const [a, b] = key.split('|').map(id => byCase[id]);
    const [p, q] = a.x <= b.x ? [a, b] : [b, a];
    let d;
    if (p.x === q.x) { const x = p.x + p.w, bend = Math.min(140, 40 + Math.abs(q.y - p.y) / 6); d = `M${x} ${p.y + p.h / 2} C${x + bend} ${p.y + p.h / 2}, ${x + bend} ${q.y + q.h / 2}, ${x} ${q.y + q.h / 2}`; }
    else d = `M${p.x + p.w} ${p.y + p.h / 2 + 10} C${(p.x + p.w + q.x) / 2} ${p.y + p.h / 2 + 10}, ${(p.x + p.w + q.x) / 2} ${q.y + q.h / 2 + 10}, ${q.x} ${q.y + q.h / 2 + 10}`;
    return `<path class="cm-cross" data-a="${a.case}" data-b="${b.case}" d="${d}"/>`;
  }).join('');
  const nodes = all.map(n => {
    if (n.kind === 'group') return `<g class="cm-node cm-group cm-g${n.group}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2 > 22 ? 14 : n.h / 2}"/>${label(n, n.x + 16, n.y + 19 + 6, 'cm-group-label', LINE)}</g>`;
    const c = files[n.case];
    if (n.kind === 'root') return `<a class="cm-link" href="${href(n.case)}" data-case="${n.case}"><g class="cm-node cm-root"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="14"/><text class="cm-kicker cm-en" x="${n.x + 16}" y="${n.y + 26}">THE STARTING POINT</text><text class="cm-kicker cm-bn" x="${n.x + 16}" y="${n.y + 26}">সূচনাবিন্দু</text>${label(n, n.x + 16, n.y + 52, 'cm-root-label', 24)}<text class="cm-root-sub cm-en" x="${n.x + 16}" y="${n.y + n.h - 14}">${escape(n.sub)}</text><text class="cm-root-sub cm-bn" x="${n.x + 16}" y="${n.y + n.h - 14}">${escape(n.sub_bn)}</text></g></a>`;
    const [sEn, sBn] = STATUS[c.status] || [c.status, c.status];
    const recs = c.records.length;
    const metaEn = `${courtShort(c.court)} · ${recs} record${recs === 1 ? '' : 's'}`;
    const metaBn = `${courtShortBn(c.court)} · ${bnDigits(recs)}টি নথি`;
    const nextEn = c.next_date ? `Next: ${shortDate(c.next_date)}` : '', nextBn = c.next_date ? `পরবর্তী: ${shortDateBn(c.next_date)}` : '';
    const lines = Math.max(n.en.length, n.bn.length), by = n.y + 26 + lines * LINE;
    const pillW = 92;
    return `<a class="cm-link" href="${href(n.case)}" data-case="${n.case}" aria-label="${escape(c.title)}"><g class="cm-node cm-case cm-g${n.group} cm-s-${c.status}">
<rect class="cm-card" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10"/><rect class="cm-stripe" x="${n.x}" y="${n.y + 10}" width="4" height="${n.h - 20}" rx="2"/>
${label(n, n.x + 18, n.y + 26, 'cm-title', LINE)}
<text class="cm-meta cm-en" x="${n.x + 18}" y="${by + 6}">${escape(metaEn)}</text><text class="cm-meta cm-bn" x="${n.x + 18}" y="${by + 6}">${escape(metaBn)}</text>
<rect class="cm-pill" x="${n.x + 18}" y="${by + 16}" width="${pillW}" height="22" rx="11"/><text class="cm-pill-text cm-en" x="${n.x + 18 + pillW / 2}" y="${by + 31}" text-anchor="middle">${sEn}</text><text class="cm-pill-text cm-bn" x="${n.x + 18 + pillW / 2}" y="${by + 31}" text-anchor="middle">${sBn}</text>
${nextEn ? `<text class="cm-next cm-en" x="${n.x + 18 + pillW + 12}" y="${by + 31}">${escape(nextEn)}</text><text class="cm-next cm-bn" x="${n.x + 18 + pillW + 12}" y="${by + 31}">${escape(nextBn)}</text>` : ''}
</g></a>`;
  }).join('\n');
  const svg = `<svg class="cm-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="case-map-svg-title"><title id="case-map-svg-title">Map of connected West Bengal OBC court cases</title><g class="cm-edges">${edges.join('')}</g><g class="cm-crosses">${crossPaths}</g>${nodes}</svg>`;
  // Text outline: the accessible version, and the layout used on small screens.
  const outline = (function li(n) {
    if (n.kind === 'group') return `<li class="cmo-group cm-g${n.group}"><span class="cmo-group-label">${bi(n.label, n.label_bn)}</span><ul>${n.children.map(li).join('')}</ul></li>`;
    const c = files[n.case], [sEn, sBn] = STATUS[c.status] || [c.status, c.status];
    const kids = n.kind === 'root' ? n.children : n.children;
    return `<li class="cmo-case"><a href="${href(n.case)}">${bi(n.kind === 'root' ? `${n.label} · ${n.sub}` : n.label, n.kind === 'root' ? `${n.label_bn} · ${n.sub_bn}` : n.label_bn)}</a> <span class="cf-status cf-status--${escape(c.status)}">${bi(sEn, sBn)}</span>${c.next_date ? ` <span class="cmo-next">${bi(`Next: ${shortDate(c.next_date)}`, `পরবর্তী: ${shortDateBn(c.next_date)}`)}</span>` : ''}${kids.length ? `<ul>${kids.map(li).join('')}</ul>` : ''}</li>`;
  })(root);
  const out = `<div class="cm-canvas" data-case-map>${svg}</div><ul class="cm-outline">${outline}</ul>`;
  const count = Object.keys(byCase).length;
  return html.replace(marker, out).replace('<span id="case-map-count">0</span>', `<span id="case-map-count" data-en="${count}" data-bn="${bnDigits(count)}">${count}</span>`);
}
function renderCaseOrders(html) {
  const marker = '<!-- Court orders map is rendered from data/case_orders_map.json. -->';
  if (!html.includes(marker)) return html;
  const map = read('data/case_orders_map.json');
  const manifest = read('case_manifest.json');
  const nodes = [map.root, ...map.families.flatMap(f => f.nodes)];
  const files = new Set(nodes.map(n => n.file).filter(Boolean));
  const byFile = {};
  for (const m of manifest) for (const f of [m.local_file, ...(m.local_files || [])]) if (f) byFile[f] = m;
  for (const f of files) if (!byFile[f]) throw new Error(`case_orders_map.json: ${f} is not in case_manifest.json`);
  const ids = new Set(nodes.map(n => n.id));
  for (const l of map.links) if (!ids.has(l.from) || !ids.has(l.to)) throw new Error(`case_orders_map.json: bad link ${l.from} → ${l.to}`);
  const keep = ['title','case_numbers','record_type','pages','source_type','source_url','verification_note','later_development','local_file','local_files'];
  const subset = [...new Set([...files].map(f => byFile[f]))].map(m => Object.fromEntries(keep.filter(k => m[k] != null).map(k => [k, m[k]])));
  const json = JSON.stringify({ map, manifest: subset }).replace(/</g, '\\u003c');
  const outline = map.families.map(f => `<details open><summary>${bi(f.label, f.label_bn)}<small>${bi(f.sub || '', f.sub_bn)}</small></summary><ol>${f.nodes.slice().sort((a, b) => a.date.localeCompare(b.date)).map(n => `<li><span class="d">${escape(shortDate(n.date))}</span>${n.file ? `<a href="${escape(n.file)}" target="_blank" rel="noopener">${bi(n.label, n.label_bn)}</a>` : bi(n.label, n.label_bn)} <span class="com-hint">· ${n.court} · ${escape(n.case)}</span></li>`).join('')}</ol></details>`).join('');
  return html.replace(marker, outline).replace('</section>\n      <p class="media-note" data-i18n="caseOrders.note">', `</section>\n      <script type="application/json" id="com-data">${json}</script>\n      <p class="media-note" data-i18n="caseOrders.note">`);
}
function renderMedia(html, pageLinks = {}) {
  if (!html.includes('<!-- Media coverage is rendered from data/media_coverage.json. -->')) return html;
  const items = read('data/media_coverage.json').items.slice().sort((a,b) => b.date.localeCompare(a.date));
  const files = Object.fromEntries(read('data/case_files.json').cases.map(c => [c.id, c]));
  const list = items.map(m => {
    const cases = m.cases.filter(id => files[id]).map(id => `<a href="${pageLinks.cases || ''}#${id}">${bi(files[id].title, files[id].title_bn)}</a>`).join(' · ');
    return `<li id="${m.id}" class="media-item" data-year="${m.date.slice(0,4)}" data-cases="${escape(m.cases.join(' '))}" data-text="${escape([m.headline,m.outlet,m.author,m.summary,...m.topics].join(' ').toLowerCase())}">
  <time datetime="${m.date}" data-en="${escape(shortDate(m.date))}" data-bn="${escape(shortDateBn(m.date))}">${escape(shortDate(m.date))}</time>
  <div class="media-body">
    <p class="media-outlet"><strong>${escape(m.outlet)}</strong>${m.author && !m.outlet.includes(m.author) ? ` · ${escape(m.author)}` : ''} · ${escape(m.type)}</p>
    <h3><a href="${escape(m.url)}" target="_blank" rel="noopener noreferrer">${escape(m.headline)}</a></h3>
    <p>${escape(m.summary)}</p>
    <p class="media-links">${m.topics.map(t => `<span class="tag">${escape(t)}</span>`).join(' ')}${cases ? ` <span class="media-case">${bi('Case','মামলা')}: ${cases}</span>` : ''} <a class="media-archive" href="https://web.archive.org/web/*/${escape(m.url)}" target="_blank" rel="noopener noreferrer">${bi('Archived copies','সংরক্ষিত কপি')}</a></p>
  </div>
</li>`;
  }).join('\n');
  const years = [...new Set(items.map(m => m.date.slice(0,4)))];
  const options = Object.values(files).filter(c => items.some(m => m.cases.includes(c.id))).map(c => `<option value="${c.id}" data-en="${escape(c.title)}" data-bn="${escape(c.title_bn)}">${escape(c.title)}</option>`).join('');
  return html.replace('<!-- Media coverage is rendered from data/media_coverage.json. -->', list)
    .replace('<!-- media-year-options -->', years.map(y => `<option value="${y}">${y}</option>`).join(''))
    .replace('<!-- media-case-options -->', options)
    .replace(/(id="media-count"[^>]*>)0/, (_, open) => open + items.length);
}
function prerender(html, page) {
  html = renderCaseFiles(html);
  html = renderMedia(html, { cases: 'litigation.html' });
  html = renderCaseMap(html, { cases: 'litigation.html' });
  html = renderCaseOrders(html);
  if (page.tab === 'cases') {
    const events = read('case_events.json');
    html = html.replace('<!-- Case events are rendered from case_events.json. -->', events.map(e => `<li id="${escape(e.id)}" class="case-event">${translations[`narrative.case.${e.id}`] || e.html}</li>`).join('\n'));
    for (const [id, count] of [['total-cases',events.length],['court-records',events.filter(e => e.record_kind==='order').length],['supporting-records',events.filter(e => e.record_kind!=='order').length]]) {
      html = html.replace(new RegExp(`(id="${id}"[^>]*>)0`), (_, open) => open + count);
    }
  }
  if (page.tab === 'timeline') {
    const events = read('timeline_events.json');
    for (const [offset, doc] of read('supplemental_documents.json').filter(d => d.show_on_timeline).entries()) events.push({id:`evt-framework-${offset}`,date:doc.date,type:'legacy',html:`<div class="date">${escape(doc.date)}</div><span class="dot" aria-hidden="true"></span><article class="card"><h2>${escape(doc.notif_no)}</h2><p>${escape(doc.summary)}</p>${pdfLink(doc.local_pdf)}</article>`});
    events.sort((a,b) => (Date.parse(a.date)||0)-(Date.parse(b.date)||0));
    html = html.replace('<!-- Timeline events are rendered from timeline_events.json. -->',events.map(e => `<li id="${escape(e.id)}" class="event" data-type="${escape(e.type)}" data-date="${escape(e.date)}">${(translations[`narrative.timeline.${e.id}`] || e.html).replace(/(<div class="date">)(\d{4})-(\d{2})-(\d{2})(<\/div>)/, (m,o,y,mo,d,c) => `${o}${Number(d)} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mo-1]} ${y}${c}`)}</li>`).join('\n'));
  }
  if (page.tab === 'documents') {
    const docs = read('obc_documents.json'), keys = new Set(docs.map(d=>`${d.notif_no}|${d.filename}`));
    docs.push(...read('supplemental_documents.json').filter(d=>!keys.has(`${d.notif_no}|${d.filename}`)));
    const notes = read('data/document_notes.json').notes;
    for (const d of docs) { const n = notes[`${d.notif_no}|${d.filename}`]; if (n) d.summary = n.summary; }
    html = fillBody(html,'docs-tbody',docs.map((d,i)=>`<tr id="doc-${i}" class="doc-row">${cell(`<code>${escape(d.notif_no)}</code>`,'Document')}${cell(escape(d.date),'Date')}${cell(escape(d.type),'Type')}${cell(escape(d.status),'Status')}${cell(escape(d.summary),'Summary')}${cell(pdfLink(d.local_pdf),'Source')}</tr>`).join(''));
  }
  if (page.tab === 'obc-list') {
    const data = read('obc_classes.json');
    const rows = data.current_classes_2026.map((name,i)=>({name,included:data.first_inclusion[name]||'See source notification',removed:'',status:'Current in Notification 945',source:`945-BCW/MR-23/2026, serial ${i+1}`})).concat(data.class_changes);
    html = fillBody(html,'obc-class-list',rows.map((d,i)=>`<tr id="obc-class-${i+1}">${cell(`<strong>${escape(d.name)}</strong>`,'Class')}${cell(escape(d.included),'Included')}${cell(escape(d.removed||'—'),'Removed')}${cell(escape(d.status),'Status')}${cell(escape(d.source),'Source')}</tr>`).join(''));
  }
  if (page.tab === 'evidence') html = fillBody(html,'public-hearings-tbody',read('public_hearings.json').map(d=>`<tr>${cell(escape(d.date_label||d.date),'Date')}${cell(escape(d.time),'Time')}${cell(escape(d.communities),'Communities')}${cell(pdfLink(d.local_pdf),'Notice')}</tr>`).join(''));
  if (page.tab === 'inventory') html = fillBody(html,'inventory-tbody',read('document_inventory.json').map(d=>`<tr>${cell(escape(d.folder),'Collection')}${cell(d.href?pdfLink(d.href,d.file):escape(d.file),'File')}${cell(escape(d.pages),'Pages')}${cell(escape(d.role),'Role')}</tr>`).join(''));
  return html;
}
function publish(html, page) {
  const [titleKey,subKey,eyebrowKey] = config[page.tab];
  const seo = seoFor(page.tab);
  // The English title and description are what search engines read; the
  // Bengali versions are swapped in by js/i18n.js when a reader switches.
  html = html.replace(/<title>[^<]*<\/title>/, `<title data-bn="${escape(seo.title_bn)}">${escape(seo.title)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(seo.description)}" data-bn="${escape(seo.description_bn)}">`);
  html = html.replace('</head>', () => `${metadata(page)}\n</head>`);
  for (const [id,key] of [['hero-title',titleKey],['hero-sub',subKey],['hero-eyebrow',eyebrowKey]]) {
    if (!key) continue;
    html = html.replace(new RegExp(`(<(h1|p)[^>]*id="${id}"[^>]*>)[\\s\\S]*?(</\\2>)`), (_,open,tag,close) => open.replace(/data-i18n="[^"]*"/,`data-i18n="${key}"`) + (translations[key]||page.title) + close);
  }
  // The page hero already provides this heading and introduction. Keep the
  // source template's headings for standalone tabs, without repeating them in
  // each dedicated page's first content panel.
  if (page.tab !== 'home') {
    const mainStart = html.indexOf('<main '), mainEnd = html.indexOf('</main>',mainStart);
    let main = html.slice(mainStart,mainEnd);
    for (const key of [titleKey,subKey]) {
      main = main.replace(new RegExp(`<(h2|p)[^>]*data-i18n="${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>[\\s\\S]*?</\\1>`), m => { const id = /\sid="([^"]+)"/.exec(m); return id ? `<span id="${id[1]}" class="anchor-target"></span>` : ''; });
    }
    // The litigation introduction uses the same sentence as the hero.
    if (page.tab === 'cases') main = main.replace(/<p class="panel-kicker"[^>]*>[\s\S]*?<\/p>/,'');
    html = html.slice(0,mainStart)+main+html.slice(mainEnd);
  }
  if (page.tab !== 'home') html = html.replace('<div class="hero-inner wrap">',`<div class="hero-inner wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html" data-i18n="navHome">Home</a><span aria-hidden="true">/</span><span aria-current="page" data-i18n="${titleKey}">${translations[titleKey]||page.title}</span></nav>`);
  html = html.replace(/(<a href="[^"]*" data-section="([^"]+)")/g, (m,open,tab)=>tab===page.tab?`${open} aria-current="page"`:open);
  return prerender(html,page);
}
function writeDiscovery(pages) {
  const priority = { home: '1.0', cases: '0.9', 'obc-list': '0.9', timeline: '0.9', documents: '0.9', 'case-orders': '0.8', 'case-map': '0.8', media: '0.8', evidence: '0.7' };
  const entry = p => { const url = urlFor(p); return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${REVIEWED}</lastmod>\n    <changefreq>${['home','cases','case-orders','case-map','media','timeline'].includes(p.tab) ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${priority[p.tab] || '0.6'}</priority>\n    <xhtml:link rel="alternate" hreflang="en" href="${url}"/>\n    <xhtml:link rel="alternate" hreflang="bn" href="${url}?lang=bn"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${url}"/>\n    <image:image><image:loc>${origin}/assets/og/${p.tab}.png</image:loc></image:image>\n  </url>`; };
  fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages.map(entry).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
}
module.exports = { publish, writeDiscovery, renderCaseFiles, renderMedia, renderCaseMap, renderCaseOrders, config, cleanUrls, seoFor, urlFor, slugFor, SOCIAL };
