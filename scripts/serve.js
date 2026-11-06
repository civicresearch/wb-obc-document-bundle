#!/usr/bin/env node
// Local preview server that behaves like GitHub Pages: /timeline serves
// timeline.html, / serves index.html, and unknown paths get 404.html.
// Usage: npm run serve  (then open http://localhost:8123/)
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || process.argv[2] || 8123);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.csv': 'text/csv', '.webmanifest': 'application/manifest+json' };

function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(root, clean);
  if (!file.startsWith(root)) return null;
  const candidates = clean.endsWith('/') ? [path.join(file, 'index.html')] : [file, `${file}.html`, path.join(file, 'index.html')];
  return candidates.find(f => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
}

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  let file = resolve(pathname), status = 200;
  if (!file) { file = path.join(root, '404.html'); status = 404; }
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}/`));
