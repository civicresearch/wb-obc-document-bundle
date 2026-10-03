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
  'case_events.json'
];

const inlineJson = {};
for (const file of jsonFiles) {
  inlineJson[file] = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

const inputPath = path.join(root, 'site-src', 'app-template.html');
const outputPath = path.join(root, 'index-standalone.html');
const html = fs.readFileSync(inputPath, 'utf8');
const inlineScript = [
  '<script>',
  'window.OBC_INLINE_JSON = ',
  JSON.stringify(inlineJson),
  ';',
  '</script>'
].join('');

if (!html.includes('</head>')) {
  throw new Error('index.html is missing </head>');
}

fs.writeFileSync(outputPath, html.replace('</head>', `  ${inlineScript}\n</head>`));
console.log(`Built ${path.relative(root, outputPath)} with ${jsonFiles.length} embedded JSON files.`);
