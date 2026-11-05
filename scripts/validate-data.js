#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsonFiles = [
  'obc_documents.json',
  'supplemental_documents.json',
  'obc_classes.json',
  'public_hearings.json',
  'document_inventory.json',
  'timeline_events.json',
  'case_events.json',
  'case_manifest.json',
  'obc_pdf_manifest.json',
  'obc_hearing_pdf_manifest.json',
  'related_sources_catalog.json'
];

const failures = [];

function readJson(file) {
  const fullPath = path.join(root, file);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    failures.push(`${file}: ${error.message}`);
    return [];
  }
}

function requireArray(file, value) {
  if (!Array.isArray(value)) {
    failures.push(`${file}: expected top-level array`);
    return false;
  }
  return true;
}

function requireField(file, row, index, field) {
  if (row[field] === undefined || row[field] === null || String(row[field]).trim() === '') {
    failures.push(`${file}[${index}]: missing ${field}`);
  }
}

function checkDuplicateIds(file, rows) {
  const seen = new Set();
  rows.forEach((row, index) => {
    if (!row.id) return;
    if (seen.has(row.id)) failures.push(`${file}[${index}]: duplicate id ${row.id}`);
    seen.add(row.id);
  });
}

function isExternalOrHash(href) {
  return /^(https?:|mailto:|tel:|#)/i.test(href);
}

function isRepoRelative(href) {
  return href.startsWith('obc_pdfs/') || href.startsWith('case_pdfs/') || href.endsWith('.json');
}

function checkRepoFile(file, ref, context) {
  const cleanRef = ref.split('#')[0].split('?')[0];
  if (!cleanRef || isExternalOrHash(cleanRef) || path.isAbsolute(cleanRef) || !isRepoRelative(cleanRef)) return;
  if (!fs.existsSync(path.join(root, cleanRef))) failures.push(`${file}: missing linked file ${cleanRef} (${context})`);
}

function checkHtmlLinks(file, html, context) {
  const linkPattern = /href="([^"]+)"/g;
  let match;
  while ((match = linkPattern.exec(html || ''))) checkRepoFile(file, match[1], context);
}

const parsed = new Map(jsonFiles.map(file => [file, readJson(file)]));
for (const file of jsonFiles.filter(file => file !== 'obc_classes.json')) requireArray(file, parsed.get(file));

const timelineEvents = parsed.get('timeline_events.json');
timelineEvents.forEach((event, index) => {
  requireField('timeline_events.json', event, index, 'id');
  requireField('timeline_events.json', event, index, 'date');
  requireField('timeline_events.json', event, index, 'html');
  checkHtmlLinks('timeline_events.json', event.html, event.id || `row ${index}`);
});
checkDuplicateIds('timeline_events.json', timelineEvents);

const caseEvents = parsed.get('case_events.json');
caseEvents.forEach((event, index) => {
  requireField('case_events.json', event, index, 'id');
  requireField('case_events.json', event, index, 'date');
  requireField('case_events.json', event, index, 'title');
  requireField('case_events.json', event, index, 'html');
  if (!['order', 'office_report', 'party_filing'].includes(event.record_kind)) {
    failures.push(`case_events.json[${index}]: invalid record_kind ${event.record_kind}`);
  }
  checkHtmlLinks('case_events.json', event.html, event.title || `row ${index}`);
  checkHtmlLinks('case_events.json', event.html_bn, event.title || `row ${index}`);
});
checkDuplicateIds('case_events.json', caseEvents);

const obcDocuments = parsed.get('obc_documents.json');
obcDocuments.forEach((doc, index) => {
  requireField('obc_documents.json', doc, index, 'notif_no');
  requireField('obc_documents.json', doc, index, 'date');
  requireField('obc_documents.json', doc, index, 'summary');
  requireField('obc_documents.json', doc, index, 'local_pdf');
  if (doc.local_pdf) checkRepoFile('obc_documents.json', doc.local_pdf, doc.notif_no || `row ${index}`);
});

const supplementalDocuments = parsed.get('supplemental_documents.json');
supplementalDocuments.forEach((doc, index) => {
  requireField('supplemental_documents.json', doc, index, 'notif_no');
  requireField('supplemental_documents.json', doc, index, 'date');
  requireField('supplemental_documents.json', doc, index, 'summary');
});
if (!supplementalDocuments.some(doc => doc.show_on_timeline)) {
  failures.push('supplemental_documents.json: expected at least one show_on_timeline record');
}

const publicHearings = parsed.get('public_hearings.json');
publicHearings.forEach((row, index) => {
  requireField('public_hearings.json', row, index, 'date_label');
  requireField('public_hearings.json', row, index, 'time');
  requireField('public_hearings.json', row, index, 'communities');
  requireField('public_hearings.json', row, index, 'local_pdf');
  if (row.local_pdf) checkRepoFile('public_hearings.json', row.local_pdf, row.date_label || `row ${index}`);
});

const documentInventory = parsed.get('document_inventory.json');
documentInventory.forEach((row, index) => {
  requireField('document_inventory.json', row, index, 'folder');
  requireField('document_inventory.json', row, index, 'file');
  requireField('document_inventory.json', row, index, 'pages');
  requireField('document_inventory.json', row, index, 'role');
  if (row.href) checkRepoFile('document_inventory.json', row.href, row.file || `row ${index}`);
});

const obcClasses = parsed.get('obc_classes.json');
if (!Array.isArray(obcClasses.current_classes_2026)) {
  failures.push('obc_classes.json: missing current_classes_2026 array');
} else if (obcClasses.current_classes_2026.length !== 66) {
  failures.push(`obc_classes.json: expected 66 current classes, found ${obcClasses.current_classes_2026.length}`);
}
if (!obcClasses.first_inclusion || typeof obcClasses.first_inclusion !== 'object' || Array.isArray(obcClasses.first_inclusion)) {
  failures.push('obc_classes.json: missing first_inclusion object');
}
if (!Array.isArray(obcClasses.class_changes)) {
  failures.push('obc_classes.json: missing class_changes array');
} else {
  obcClasses.class_changes.forEach((row, index) => {
    requireField('obc_classes.json', row, index, 'name');
    requireField('obc_classes.json', row, index, 'included');
    requireField('obc_classes.json', row, index, 'status');
    requireField('obc_classes.json', row, index, 'source');
  });
}

const caseManifest = parsed.get('case_manifest.json');
caseManifest.forEach((record, index) => {
  requireField('case_manifest.json', record, index, 'date');
  requireField('case_manifest.json', record, index, 'title');
  if (record.sha256 && record.local_file && fs.existsSync(path.join(root, record.local_file))) {
    const actual = require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root, record.local_file))).digest('hex');
    if (actual !== record.sha256) failures.push(`case_manifest.json[${index}]: SHA-256 mismatch`);
  }
  if (!record.local_file && !Array.isArray(record.local_files)) {
    failures.push(`case_manifest.json[${index}]: missing local_file or local_files`);
  }
  if (record.local_file) checkRepoFile('case_manifest.json', record.local_file, record.title || `row ${index}`);
  if (Array.isArray(record.local_files)) {
    record.local_files.forEach(localFile => checkRepoFile('case_manifest.json', localFile, record.title || `row ${index}`));
  }
});

if (failures.length) {
  console.error(`Data validation failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Data validation passed for ${jsonFiles.length} JSON files.`);
