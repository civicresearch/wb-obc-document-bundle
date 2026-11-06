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
let html = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n')
  .replace('<meta name="viewport"', '<meta name="robots" content="noindex, follow">\n  <meta name="viewport"');
const styles = html.match(/\n<style>\n[\s\S]*?\n<\/style>/);
if (styles) {
  html = html.replace(styles[0], '').replace(/<link rel="stylesheet" href="css\/polish\.css[^>]*>/, '').replace(/<link rel="stylesheet" href="css\/print\.css[^>]*>/, '');
  html = html.replace('</head>', () => `${styles[0]}\n<link rel="stylesheet" href="css/polish.css?v=20261104-records">\n<link rel="stylesheet" href="css/crg.css?v=20261106-search">\n<link rel="stylesheet" href="css/print.css?v=20261106-print">\n</head>`);
}
const { renderCaseFiles, renderMedia } = require('./site-publishing');
html = renderMedia(renderCaseFiles(html), { cases: '' });
const inlineScript = [
  '<script>',
  'window.OBC_INLINE_JSON = ',
  // Data is text inside a script element, never HTML or replacement syntax.
  JSON.stringify(inlineJson).replace(/</g, '\\u003c'),
  ';window.OBC_INLINE_I18N = ',
  JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'data/i18n.json'), 'utf8'))).replace(/</g, '\\u003c'),
  ';',
  '</script>'
].join('');

if (!html.includes('</head>')) {
  throw new Error('index.html is missing </head>');
}

html = html.replace(/^[ \t]+$/gm, '');
fs.writeFileSync(outputPath, html.replace('</head>', () => `  ${inlineScript}\n</head>`));
console.log(`Built ${path.relative(root, outputPath)} with ${jsonFiles.length} embedded JSON files.`);
