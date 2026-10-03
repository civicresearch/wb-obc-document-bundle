#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'site-src', 'app-template.html');

const pages = [
  { tab: 'home', file: 'index.html', title: 'WB OBC Reservation Archive' },
  { tab: 'timeline', file: 'timeline.html', title: 'OBC Notification Timeline' },
  { tab: 'cases', file: 'litigation.html', title: 'OBC Litigation Tracker' },
  { tab: 'obc-list', file: 'obc-list.html', title: 'West Bengal OBC Class Status List' },
  { tab: 'documents', file: 'documents.html', title: 'OBC Source PDFs' },
  { tab: 'evidence', file: 'evidence.html', title: 'Public Hearings and Evidence Gaps' },
  { tab: 'entry-framework', file: 'record-guide.html', title: 'OBC Record Submission Guide' },
  { tab: 'inventory', file: 'inventory.html', title: 'OBC Document Inventory' },
  { tab: 'obc-basics', file: 'obc-basics.html', title: 'OBC Basics' },
  { tab: 'methods', file: 'methods.html', title: 'OBC Evidence Method' },
  { tab: 'reports', file: 'reports.html', title: 'OBC Policy Reports' },
  { tab: 'about', file: 'about.html', title: 'About the WB OBC Archive' }
];

const pageFiles = Object.fromEntries(pages.map(page => [page.tab, page.file]));

function pageForId(id) {
  if (!id || id === 'main-content') return null;
  if (id === 'home' || id === 'guide' || id === 'query-hub') return 'home';
  if (id === 'about') return 'about';
  if (id === 'obc-list' || id.startsWith('obc-class-')) return 'obc-list';
  if (id === 'timeline' || id.startsWith('evt-')) return 'timeline';
  if (id === 'documents' || id.startsWith('doc-')) return 'documents';
  if (id === 'evidence' || id === 'public-hearings' || id === 'missing-records') return 'evidence';
  if (id === 'cases' || id.startsWith('case-') || id === 'employee-protection-note' || id.startsWith('litigation-note-')) return 'cases';
  if (id === 'entry-framework') return 'entry-framework';
  if (id === 'inventory') return 'inventory';
  if (id === 'obc-basics') return 'obc-basics';
  if (id === 'methods') return 'methods';
  if (id === 'reports') return 'reports';
  return null;
}

function findElementEnd(html, start, tagName) {
  const token = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(html))) {
    const closing = /^<\//.test(match[0]);
    if (closing) depth -= 1;
    else if (!/\/>$/.test(match[0])) depth += 1;
    if (depth === 0) return token.lastIndex;
  }
  throw new Error(`Unable to find closing </${tagName}> for panel at byte ${start}`);
}

function keepOnlyPanel(html, activeTab) {
  const opening = /<(section|ol)\b[^>]*\bdata-tab-panel="([^"]+)"[^>]*>/gi;
  const matches = [];
  let match;
  while ((match = opening.exec(html))) {
    matches.push({ start: match.index, openEnd: opening.lastIndex, tag: match[1], tab: match[2], open: match[0] });
  }

  for (const panel of matches.reverse()) {
    if (panel.tab !== activeTab) {
      const end = findElementEnd(html, panel.start, panel.tag);
      html = html.slice(0, panel.start) + html.slice(end);
      continue;
    }
    const visibleOpen = panel.open.replace(/\s+hidden(?=\s|>)/, '');
    html = html.slice(0, panel.start) + visibleOpen + html.slice(panel.openEnd);
  }
  return html;
}

function rewriteInternalLinks(html, activeTab) {
  return html.replace(/href="#([^"]+)"/g, (full, id) => {
    const targetTab = pageForId(id);
    if (!targetTab) return full;
    if (targetTab === activeTab) return `href="#${id}"`;
    const targetFile = pageFiles[targetTab];
    const topLevel = id === targetTab || (targetTab === 'home' && id === 'home');
    return `href="${targetFile}${topLevel ? '' : `#${id}`}"`;
  });
}

function markActiveNavigation(html, activeTab) {
  html = html.replace(/(<a\b[^>]*\bdata-tab-target="[^"]+"[^>]*?)\s+class="active"([^>]*>)/g, '$1$2');
  const activePattern = new RegExp(`<a([^>]*\\bdata-tab-target="${activeTab}"[^>]*)>`, 'g');
  return html.replace(activePattern, (full, attrs) => {
    const withClass = /\bclass="/.test(attrs)
      ? attrs.replace(/class="([^"]*)"/, (_, names) => `class="${names} active"`)
      : `${attrs} class="active"`;
    return `<a${withClass} aria-current="page">`;
  });
}

function removeOtherPageOnlyElements(html, activeTab) {
  return html.replace(/\n\s*<([a-z][a-z0-9-]*)\b([^>]*\bdata-page-only="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/gi, (full, tag, attrs, pageTab) => {
    if (pageTab !== activeTab) return '';
    return full.replace(/\s+data-page-only="[^"]+"/, '');
  });
}

if (!fs.existsSync(templatePath)) throw new Error(`Missing template: ${templatePath}`);
const template = fs.readFileSync(templatePath, 'utf8');

const styleMatch = template.match(/\n<style>\n([\s\S]*?)\n<\/style>/);
if (!styleMatch) throw new Error('Template is missing its main <style> block');

const lastScriptStart = template.lastIndexOf('\n<script>');
const lastScriptEnd = template.indexOf('</script>', lastScriptStart);
if (lastScriptStart < 0 || lastScriptEnd < 0) throw new Error('Template is missing its main script block');
const scriptSource = template.slice(lastScriptStart + '\n<script>'.length, lastScriptEnd).replace(/^\n/, '').replace(/\n$/, '');

fs.writeFileSync(path.join(root, 'css', 'site.css'), `${styleMatch[1]}\n`);
fs.writeFileSync(path.join(root, 'js', 'site.js'), `${scriptSource}\n`);

let shell = template.replace(styleMatch[0], '\n  <link rel="stylesheet" href="css/site.css">');
const shellScriptStart = shell.lastIndexOf('\n<script>');
const shellScriptEnd = shell.indexOf('</script>', shellScriptStart) + '</script>'.length;
shell = shell.slice(0, shellScriptStart) + '\n<script src="js/site.js"></script>' + shell.slice(shellScriptEnd);

for (const page of pages) {
  let html = keepOnlyPanel(shell, page.tab);
  html = removeOtherPageOnlyElements(html, page.tab);
  html = html.replace('<body>', `<body data-page="${page.tab}">`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title} · Civic Research Group</title>`);
  html = rewriteInternalLinks(html, page.tab);
  html = markActiveNavigation(html, page.tab);
  html = html.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(root, page.file), html);
}

console.log(`Built ${pages.length} HTML pages plus shared css/site.css and js/site.js.`);
