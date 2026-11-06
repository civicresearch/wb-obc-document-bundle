/* Download the records shown on a page as CSV, Excel (.xlsx) or a branded PDF
   report. Exports follow the page's current search and filters: only visible
   records are included. No external libraries; the .xlsx file is written here. */
(() => {
  'use strict';
  const page = document.body.dataset.page;
  const isBn = () => document.documentElement.lang === 'bn';
  const L = (en, bn) => (isBn() ? bn : en);
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const visible = el => !!el && !el.hidden && !el.closest('[hidden]') && el.getClientRects().length > 0;
  const abs = href => { try { return new URL(href, location.href).href; } catch { return href || ''; } };
  const links = el => [...(el?.querySelectorAll('a[href]') || [])].map(a => abs(a.getAttribute('href'))).filter((v, i, all) => all.indexOf(v) === i).join(' ');

  function tableDataset(id, name, nameBn) {
    return {
      name, nameBn,
      available: () => !!document.getElementById(id),
      rows() {
        const tbody = document.getElementById(id), table = tbody.closest('table');
        const heads = [...table.querySelectorAll('thead th')].map(text);
        const rows = [...tbody.rows].filter(visible).map(tr => {
          return [...[...tr.cells].map(text), links(tr)];
        });
        return { columns: [...heads, L('Links', 'লিংক')], rows };
      }
    };
  }
  const DATASETS = {
    documents: [tableDataset('docs-tbody', 'Source documents', 'মূল নথি')],
    'obc-list': [tableDataset('obc-class-list', 'OBC classes', 'ওবিসি শ্রেণি')],
    inventory: [tableDataset('inventory-tbody', 'File inventory', 'ফাইল তালিকা')],
    evidence: [tableDataset('public-hearings-tbody', 'Public hearings', 'জনশুনানি')],
    timeline: [{
      name: 'Timeline of notifications', nameBn: 'বিজ্ঞপ্তির কালক্রম',
      available: () => !!document.querySelector('li.event'),
      rows: () => ({
        columns: [L('Date', 'তারিখ'), L('Title', 'শিরোনাম'), L('Summary', 'সারাংশ'), L('Links', 'লিংক')],
        rows: [...document.querySelectorAll('li.event')].filter(visible).map(li => [li.dataset.date || text(li.querySelector('.date')), text(li.querySelector('h2,h3')), text(li.querySelector('p')), links(li)])
      })
    }],
    cases: [{
      name: 'Court proceedings', nameBn: 'মামলাসমূহ',
      available: () => !!document.querySelector('.case-file'),
      rows: () => ({
        columns: [L('Court', 'আদালত'), L('Proceeding', 'মামলা'), L('Case numbers', 'মামলা নম্বর'), L('Status', 'অবস্থা'), L('Next listing', 'পরবর্তী তালিকা'), L('Summary', 'সারাংশ'), L('Court records', 'আদালতের নথি'), L('Link', 'লিংক')],
        rows: [...document.querySelectorAll('.case-file')].filter(visible).map(card => [text(card.querySelector('.cf-court')), text(card.querySelector('h3')), [...card.querySelectorAll('.cf-numbers code')].map(text).join('; '), text(card.querySelector('.cf-status')), card.querySelector('.cf-next time')?.getAttribute('datetime') || '', text(card.querySelector('.cf-summary')), [...card.querySelectorAll('.cf-records li')].map(text).join(' | '), `${location.origin}${location.pathname}#${card.id}`])
      })
    }, {
      name: 'Court records', nameBn: 'আদালতের নথি',
      available: () => !!document.querySelector('li.case-event'),
      rows: () => ({
        columns: [L('Date', 'তারিখ'), L('Record', 'নথি'), L('Summary', 'সারাংশ'), L('Sources', 'সূত্র')],
        rows: [...document.querySelectorAll('li.case-event')].filter(visible).map(li => [li.querySelector('time')?.getAttribute('datetime') || '', text(li.querySelector('h3')), text(li.querySelector('p')), links(li.querySelector('.case-links') || li)])
      })
    }],
    media: [{
      name: 'Media coverage', nameBn: 'সংবাদমাধ্যম',
      available: () => !!document.querySelector('.media-item'),
      rows: () => ({
        columns: [L('Date', 'তারিখ'), L('Outlet', 'সংবাদমাধ্যম'), L('Headline', 'শিরোনাম'), L('Summary', 'সারাংশ'), L('Case', 'মামলা'), L('URL', 'লিংক')],
        rows: [...document.querySelectorAll('.media-item')].filter(visible).map(li => [li.querySelector('time')?.getAttribute('datetime') || '', text(li.querySelector('.media-outlet')), text(li.querySelector('h3')), text(li.querySelector('.media-body > p:not(.media-outlet):not(.media-links)')), [...li.querySelectorAll('.media-case a')].map(text).join('; '), li.querySelector('h3 a')?.href || ''])
      })
    }]
  };
  const sets = (DATASETS[page] || []).filter(d => d.available());
  if (!sets.length) return;

  const stamp = () => new Date().toISOString().slice(0, 10);
  const fileName = (set, ext) => `wb-obc-${set.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp()}.${ext}`;
  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const generated = () => new Intl.DateTimeFormat(isBn() ? 'bn-IN' : 'en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date());

  // ---------- CSV ----------
  function toCsv({ columns, rows }) {
    const q = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '﻿' + [columns, ...rows].map(r => r.map(q).join(',')).join('\r\n');
  }

  // ---------- XLSX (minimal OOXML writer, stored ZIP) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const [name, content] of files) {
      const data = typeof content === 'string' ? enc.encode(content) : content, nameBytes = enc.encode(name), crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, nameBytes.length, true);
      parts.push(new Uint8Array(local.buffer), nameBytes, data);
      const dir = new DataView(new ArrayBuffer(46));
      dir.setUint32(0, 0x02014b50, true); dir.setUint16(4, 20, true); dir.setUint16(6, 20, true); dir.setUint16(8, 0x0800, true);
      dir.setUint32(16, crc, true); dir.setUint32(20, data.length, true); dir.setUint32(24, data.length, true); dir.setUint16(28, nameBytes.length, true); dir.setUint32(42, offset, true);
      central.push(new Uint8Array(dir.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }
    const size = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xml = s => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = i => { let s = ''; for (i += 1; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  function sheetXml(columns, rows, { header = true, widths } = {}) {
    const all = header ? [columns, ...rows] : rows;
    const w = widths || columns.map((c, i) => Math.min(60, Math.max(10, ...all.slice(0, 200).map(r => String(r[i] ?? '').length * 0.9))));
    const body = all.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr" s="${header && ri === 0 ? 1 : 2}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');
    const last = `${colName(columns.length - 1)}${all.length}`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : ''}<cols>${w.map((x, i) => `<col min="${i + 1}" max="${i + 1}" width="${x.toFixed(1)}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData>${header && rows.length ? `<autoFilter ref="A1:${last}"/>` : ''}</worksheet>`;
  }
  function toXlsx(set, data) {
    const about = [
      ['WB OBC Archive — Civic Research Group'],
      [set.name],
      [`${L('Records', 'রেকর্ড')}: ${data.rows.length}`],
      [`${L('Generated', 'তৈরি')}: ${generated()} (IST)`],
      [`${L('Page', 'পাতা')}: ${location.href}`],
      [L('Research index, not legal advice. Check each record against its source and the court before relying on it.', 'এটি গবেষণা সূচি, আইনি পরামর্শ নয়। নির্ভর করার আগে প্রতিটি রেকর্ড মূল সূত্র ও আদালতে যাচাই করুন।')]
    ];
    const sheetName = set.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' ');
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
      ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(set.name)} — WB OBC Archive</dc:title><dc:creator>Civic Research Group</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/><sheet name="About" sheetId="2" r:id="rId2"/></sheets>${data.rows.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${xml(sheetName)}'!$A$1:$${colName(data.columns.length - 1)}$${data.rows.length + 1}</definedName></definedNames>` : ''}</workbook>`],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F3B3C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FFD6E0DD"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf xfId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
      ['xl/worksheets/sheet1.xml', sheetXml(data.columns, data.rows)],
      ['xl/worksheets/sheet2.xml', sheetXml(['A'], about, { header: false, widths: [110] })]
    ]);
  }

  // ---------- PDF (branded print report) ----------
  function toPdf(set, data) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const esc = s => xml(s);
    const wide = data.columns.length > 5;
    const logo = abs('assets/crg-on-light.png'), obc = abs('obcwb-flat-dark-logo.webp');
    const filters = [...document.querySelectorAll('main input[type="search"], main select')].filter(el => el.value && visible(el)).map(el => el.tagName === 'SELECT' ? text(el.selectedOptions[0]) : `“${el.value}”`);
    const avg = data.columns.map((c, i) => { const vals = data.rows.slice(0, 80).map(r => String(r[i] || '')); const n = vals.reduce((a, v) => a + (/^https?:/.test(v) ? 22 : Math.min(v.length, 400)), 0) / Math.max(vals.length, 1); return Math.max(7, Math.min(48, Math.sqrt(n) * 3 + 4)); });
    const total = avg.reduce((a, b) => a + b, 0);
    const widths = avg.map(w => (w / total * 100).toFixed(1));
    const host = u => { try { const x = new URL(u); if (x.host !== location.host) return x.host.replace(/^www\./, '');
      const file = decodeURIComponent(x.pathname.split('/').pop());
      return /\.pdf$/i.test(file) ? `PDF: ${file.length > 34 ? `${file.slice(0, 31)}…` : file}` : L('Archive page', 'আর্কাইভ পাতা'); } catch { return u; } };
    const linkCell = v => /^https?:\/\//.test(v) ? v.split(' ').map(u => `<a href="${esc(u)}">${esc(host(u))}</a>`).join('<br>') : esc(v);
    frame.srcdoc = `<!doctype html><html lang="${isBn() ? 'bn' : 'en'}"><head><meta charset="utf-8"><title>${esc(set.name)} — WB OBC Archive</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap">
<style>
@page{size:A4 ${wide ? 'landscape' : 'portrait'};margin:14mm 12mm 16mm}
*{box-sizing:border-box}body{margin:0;font:9.5pt/1.45 "Noto Sans","Noto Sans Bengali",system-ui,sans-serif;color:#0e2627}
header{display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:3px solid #e8922b}
header img{height:30px}header .obc{height:34px;margin-left:auto}
.eyebrow{margin:14px 0 2px;color:#965609;font-weight:700;font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase}
h1{margin:0;font-size:18pt;line-height:1.2;color:#0f3b3c}
.meta{margin:6px 0 12px;color:#3f5655;font-size:9pt}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead{display:table-header-group}th{background:#0f3b3c;color:#fff;text-align:left;font-size:8.5pt;padding:6px 7px;vertical-align:bottom}
td{padding:6px 7px;border-bottom:1px solid #d6e0dd;vertical-align:top;overflow-wrap:anywhere}
td a{display:inline-block}
tr:nth-child(even) td{background:#f3f6f5}tr{break-inside:avoid}
a{color:#155e8f;text-decoration:none}
footer{margin-top:14px;padding-top:8px;border-top:1px solid #d6e0dd;color:#6b8180;font-size:8pt}
</style></head><body>
<header><img src="${logo}" alt="Civic Research Group"><img class="obc" src="${obc}" alt="WB OBC Archive"></header>
<p class="eyebrow">WB OBC Archive · ${esc(L('Research export', 'গবেষণা রপ্তানি'))}</p>
<h1>${esc(L(set.name, set.nameBn))}</h1>
<p class="meta">${data.rows.length} ${esc(L('records', 'টি রেকর্ড'))}${filters.length ? ` · ${esc(L('Filtered by', 'ফিল্টার'))}: ${esc(filters.join(', '))}` : ''} · ${esc(L('Generated', 'তৈরি'))} ${esc(generated())} IST</p>
<table><colgroup>${widths.map(w => `<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${data.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
<tbody>${data.rows.map(r => `<tr>${r.map(v => `<td>${linkCell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<footer>${esc(L('Source', 'সূত্র'))}: ${esc(location.href)} · ${esc(L('Research index, not legal advice. Check each record against its source and the relevant court before relying on it.', 'এটি গবেষণা সূচি, আইনি পরামর্শ নয়। নির্ভর করার আগে প্রতিটি রেকর্ড মূল সূত্র ও সংশ্লিষ্ট আদালতে যাচাই করুন।'))} © Civic Research Group</footer>
</body></html>`;
    frame.onload = async () => {
      try { await frame.contentDocument.fonts.ready; } catch {}
      await Promise.all([...frame.contentDocument.images].map(img => img.complete ? 0 : new Promise(r => { img.onload = img.onerror = r; })));
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60000);
    };
  }

  // ---------- UI: a download icon beside the print icon ----------
  const toolbar = document.createElement('div');
  toolbar.className = 'export-menu';
  toolbar.innerHTML = `<button type="button" class="export-button" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="visually-hidden" data-export-label></span></button>
    <div class="export-pop" role="menu" hidden></div>`;
  const button = toolbar.querySelector('button'), pop = toolbar.querySelector('.export-pop');
  function buildMenu() {
    const label = L('Download records', 'রেকর্ড ডাউনলোড');
    button.setAttribute('aria-label', label); button.title = label;
    toolbar.querySelector('[data-export-label]').textContent = label;
    pop.innerHTML = sets.map((set, i) => {
      const count = set.rows().rows.length;
      return `<p class="export-head">${xml(L(set.name, set.nameBn))} <span>${count} ${L('shown', 'টি দেখানো')}</span></p>
        <button type="button" role="menuitem" data-set="${i}" data-format="csv">CSV</button>
        <button type="button" role="menuitem" data-set="${i}" data-format="xlsx">Excel (.xlsx)</button>
        <button type="button" role="menuitem" data-set="${i}" data-format="pdf">${L('PDF report', 'PDF রিপোর্ট')}</button>`;
    }).join('') + `<p class="export-note">${L('Exports follow your current search and filters.', 'বর্তমান অনুসন্ধান ও ফিল্টার অনুযায়ী রপ্তানি হয়।')}</p>`;
  }
  const open = () => { buildMenu(); pop.hidden = false; button.setAttribute('aria-expanded', 'true'); pop.querySelector('button')?.focus(); };
  const close = () => { pop.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => (pop.hidden ? open() : close()));
  document.addEventListener('click', e => { if (!toolbar.contains(e.target)) close(); });
  toolbar.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); button.focus(); } });
  pop.addEventListener('click', e => {
    const item = e.target.closest('button[data-format]');
    if (!item) return;
    const set = sets[+item.dataset.set], data = set.rows();
    if (item.dataset.format === 'csv') save(new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8' }), fileName(set, 'csv'));
    else if (item.dataset.format === 'xlsx') save(toXlsx(set, data), fileName(set, 'xlsx'));
    else toPdf(set, data);
    close();
  });
  function place() {
    const host = document.querySelector('.hero-inner > .pdf-export-toolbar') || document.querySelector('.pdf-export-toolbar');
    if (host) host.prepend(toolbar); else document.querySelector('.hero-inner')?.prepend(toolbar);
  }
  // export-pdf.js adds the print icon; wait for it so the two sit together.
  if (document.querySelector('.pdf-export-toolbar')) place(); else setTimeout(place, 0);
  window.WBOBCExport = { sets, toCsv, toXlsx };
})();
