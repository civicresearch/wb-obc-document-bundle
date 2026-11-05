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
function prerender(html, page) {
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
module.exports = { publish, writeDiscovery };
