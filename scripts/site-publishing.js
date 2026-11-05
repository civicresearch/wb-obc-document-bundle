const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const translations = read('data/i18n.json').en;
const origin = `https://${fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim()}`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const config = {
  home: ['heroTitle', 'heroSub', 'heroEyebrow', 'Explore West Bengal OBC notifications, class lists, court orders and source PDFs. A bilingual, independent research archive with traceable records.'],
  timeline: ['timelineTitle', 'timelineSub', 'timelineHeroEyebrow', 'Follow West Bengal OBC policy changes from 1993 to 2026, with dated notifications, amendment Acts and linked source documents.'],
  cases: ['cases.title', 'casesSectionSub', 'casesHeroEyebrow', 'Track West Bengal OBC litigation, including Calcutta High Court judgments, Supreme Court orders, case numbers and archived source records.'],
  'obc-list': ['obcList.title', 'obcListSub', 'obcListHeroEyebrow', 'Search the 66 classes listed in West Bengal Notification 945 and compare historical OBC classifications, withdrawal dates and source records.'],
  documents: ['documents.title', 'documents.subtitle', 'documentsHeroEyebrow', 'Search West Bengal OBC notifications, legislation and certificate guidance. Read extracted document text and open the original source PDFs.'],
  evidence: ['completenessAuditHeading', 'evidenceSub', 'evidenceHeroEyebrow', 'Explore West Bengal OBC public-hearing notices, community consultation records and the evidence gaps identified in the research archive.'],
  'entry-framework': ['frameworkHeading', 'frameworkSub', 'entryFrameworkHeroEyebrow', 'Learn how to document an OBC notification, court order or missing record with consistent dates, provenance and verifiable source links.'],
  inventory: ['inventory.title', 'inventorySub', '', 'Browse the West Bengal OBC archive file inventory, including court records, government notifications, reports, page counts and PDF links.'],
  'obc-basics': ['obcBasicsHeading', 'obcBasicsSub', 'obcBasicsHeroEyebrow', 'Understand OBC classification, backwardness, reservation and evidence requirements through the West Bengal policy and legal record.'],
  methods: ['methodsHeading', 'methodsSub', 'methodsHeroEyebrow', 'Read the archive’s evidence method: backwardness indicators, representation data, surveys, verification and transparent source documentation.'],
  reports: ['reportsHeading', 'reportsSub', 'reportsHeroEyebrow', 'Read the Mandal and Sachar reports alongside West Bengal OBC research, with source PDFs and context for studying backwardness and reservation.'],
  media: ['media.title', 'media.sub', 'media.eyebrow', 'Read news and legal reporting on West Bengal OBC reservation, the 2024 judgment, the 2026 notifications and certificate cases, linked to the court records.'],
  about: ['aboutTitle', 'aboutSub', 'aboutHeroEyebrow', 'About the independent WB OBC Archive by Civic Research Group: its scope, research methods, source verification and ways to contribute.'],
  contribute: ['contribute.heroTitle', 'contribute.heroSub', 'contribute.heroKicker', 'Contribute a public document, court update or correction to the WB OBC Archive through guided forms and a structured source-report process.']
};
function urlFor(page) { return `${origin}/${page.file === 'index.html' ? '' : page.file}`; }
function metadata(page) {
  const url = urlFor(page), description = config[page.tab][3];
  const title = `${page.title} · Civic Research Group`;
  const graph = [
    {'@type':'Organization','@id':`${origin}/#organization`,name:'Civic Research Group',url:'https://civicresearch.in'},
    {'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'WB OBC Archive',inLanguage:['en','bn'],publisher:{'@id':`${origin}/#organization`}},
    {'@type':'WebPage','@id':`${url}#webpage`,url,name:page.title,description,inLanguage:'en',isPartOf:{'@id':`${origin}/#website`}}
  ];
  if (page.tab !== 'home') graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${origin}/`},{'@type':'ListItem',position:2,name:page.title,item:url}]});
  return `<link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="WB OBC Archive">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${origin}/obcwb-light-logo.png">
  <meta property="og:image:alt" content="West Bengal OBC Archive">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${origin}/obcwb-light-logo.png">
  <script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;
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
      const e = events[id], date = id.replace('case-', '');
      const pdfs = manifest.filter(m => m.date === date).map(m => `<a class="cf-pdf" href="${escape(m.local_file)}" target="_blank" rel="noreferrer">PDF</a>`).join(' ');
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
  if (page.tab === 'cases') {
    const events = read('case_events.json');
    html = html.replace('<!-- Case events are rendered from case_events.json. -->', events.map(e => `<li id="${escape(e.id)}" class="case-event">${e.html}</li>`).join('\n'));
    for (const [id, count] of [['total-cases',events.length],['court-records',events.filter(e => e.record_kind==='order').length],['supporting-records',events.filter(e => e.record_kind!=='order').length]]) {
      html = html.replace(new RegExp(`(id="${id}"[^>]*>)0`), (_, open) => open + count);
    }
  }
  if (page.tab === 'timeline') {
    const events = read('timeline_events.json');
    for (const [offset, doc] of read('supplemental_documents.json').filter(d => d.show_on_timeline).entries()) events.push({id:`evt-framework-${offset}`,date:doc.date,type:'legacy',html:`<div class="date">${escape(doc.date)}</div><span class="dot" aria-hidden="true"></span><article class="card"><h2>${escape(doc.notif_no)}</h2><p>${escape(doc.summary)}</p>${pdfLink(doc.local_pdf)}</article>`});
    events.sort((a,b) => (Date.parse(a.date)||0)-(Date.parse(b.date)||0));
    html = html.replace('<!-- Timeline events are rendered from timeline_events.json. -->',events.map(e => `<li id="${escape(e.id)}" class="event" data-type="${escape(e.type)}" data-date="${escape(e.date)}">${e.html}</li>`).join('\n'));
  }
  if (page.tab === 'documents') {
    const docs = read('obc_documents.json'), keys = new Set(docs.map(d=>`${d.notif_no}|${d.filename}`));
    docs.push(...read('supplemental_documents.json').filter(d=>!keys.has(`${d.notif_no}|${d.filename}`)));
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
  const [titleKey,subKey,eyebrowKey,description] = config[page.tab];
  html = html.replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(description)}">`);
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
      main = main.replace(new RegExp(`<(h2|p)[^>]*data-i18n="${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>[\\s\\S]*?</\\1>`), '');
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
  fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p=>`  <url><loc>${urlFor(p)}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
}
module.exports = { publish, writeDiscovery, renderCaseFiles, renderMedia };
