#!/usr/bin/env python3
"""Build the archive's site-wide search index (data/search/).

Records come from every dataset and from the text inside every PDF that has a
text layer (pdftotext, one record per page passage). The index supports hybrid
search in the browser:

* keyword ranking (BM25), computed in js/search.js from records.json, and
* meaning-based ranking with latent semantic vectors: a TF-IDF matrix over all
  records is reduced with a truncated SVD (64 dimensions). Each record's vector
  and each vocabulary term's vector are stored as int8, so a query is embedded
  in the browser by summing its term vectors, with no server and no model
  download.

The tokenizer below must stay identical to `tokens()` in js/search.js.

Run: python3 scripts/build-search.py   (needs numpy and poppler's pdftotext)
"""
import html
import json
import math
import re
import subprocess
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'search'
DIMS = 64
PASSAGE = 900          # characters per PDF passage
SNIPPET = 700          # characters of text kept per record
STOP = set('''a an and are as at be by for from has have in is it its of on or that the this to was were will with
which who whom whose not no but if into than then there these those their they them he she his her we our you your
shall may any all such other also been being under over per upon above below after before between same each only
do does did so can could would should must out up down more most very about against during without within'''.split())
BN_DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
TOKEN = re.compile(r'[\wঀ-৿]+', re.UNICODE)


def stem(t):
    if t.isdigit() or not t.isascii():
        return t
    if len(t) > 4 and t.endswith('ies'):
        return t[:-3] + 'y'
    if len(t) > 3 and t.endswith('s') and not t.endswith('ss'):
        return t[:-1]
    return t


def tokens(text):
    text = unicodedata.normalize('NFC', str(text or '')).lower().translate(BN_DIGITS)
    out = []
    for t in TOKEN.findall(text):
        t = t.strip('_')
        if len(t) < 2 and not t.isdigit():
            continue
        if t in STOP:
            continue
        out.append(stem(t))
    return out


def plain(fragment):
    text = re.sub(r'<[^>]+>', ' ', str(fragment or ''))
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def load(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def short_date(iso):
    try:
        y, m, d = (int(x) for x in iso.split('-'))
        return f"{d} {'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()[m - 1]} {y}"
    except Exception:
        return iso or ''


def records():
    rows = []

    def add(kind, title, url, text, date='', meta='', extra=''):
        body = re.sub(r'\s+', ' ', text).strip()
        rows.append({'k': kind, 't': title.strip(), 'u': url, 'd': date or '', 'm': meta,
                     'x': body[:SNIPPET], '_full': f'{title} {meta} {body} {extra}'})

    for c in load('data/case_files.json')['cases']:
        add('Case', c['title'], f"litigation.html#{c['id']}", c['summary'], '', f"{c['court']} · {c['status_label']}",
            ' '.join(c['case_numbers']) + ' ' + c.get('title_bn', '') + ' ' + c.get('summary_bn', ''))
    for e in load('case_events.json'):
        add('Court record', e['title'], f"litigation.html#{e['id']}", plain(e['html']).replace(e.get('displayDate', ''), '', 1),
            e['date'], short_date(e['date']), plain(e.get('html_bn', '')))
    for e in load('timeline_events.json'):
        text = plain(e['html'])
        title = re.search(r'<h[23][^>]*>(.*?)</h[23]>', e['html'], re.S)
        add('Timeline', plain(title.group(1)) if title else text[:90], f"timeline.html#{e['id']}", text, e.get('date', ''),
            short_date(e.get('date', '')), (e.get('search') or '') + ' ' + plain(e.get('html_bn', '')))
    for m in load('data/media_coverage.json')['items']:
        add('News', m['headline'], f"media.html#{m['id']}", m['summary'], m['date'], f"{m['outlet']} · {short_date(m['date'])}",
            ' '.join(m['topics']) + ' ' + m['url'])
    docs = load('obc_documents.json')
    keys = {f"{d['notif_no']}|{d['filename']}" for d in docs}
    docs += [d for d in load('supplemental_documents.json') if f"{d['notif_no']}|{d['filename']}" not in keys]
    for i, d in enumerate(docs):
        add('Document', f"{d['notif_no']} ({d.get('type', '')})", f'documents.html#doc-{i}', d.get('summary', ''), d.get('date', ''),
            f"{short_date(d.get('date', ''))} · {d.get('status', '')}", (d.get('text') or '')[:4000])
    classes = load('obc_classes.json')
    for i, name in enumerate(classes['current_classes_2026']):
        add('OBC class', name, f'obc-list.html#obc-class-{i + 1}', f'Listed at serial {i + 1} of Notification 945-BCW/MR-23/2026 (current 66-class list).',
            '', 'Current class', classes['first_inclusion'].get(name, ''))
    offset = len(classes['current_classes_2026'])
    for j, c in enumerate(classes['class_changes']):
        add('OBC class', c['name'], f'obc-list.html#obc-class-{offset + j + 1}', f"{c.get('status', '')}. Included: {c.get('included', '')}. Removed: {c.get('removed', '') or '—'}.",
            '', c.get('status', ''), c.get('source', ''))
    for h in load('public_hearings.json'):
        add('Hearing', f"Public hearing, {h.get('date_label', '')} {h.get('time', '')}", 'evidence.html#public-hearings',
            f"Communities heard: {h.get('communities', '')}", '', 'Public hearing notice', h.get('local_pdf', ''))

    # Text inside the PDFs, one record per passage, linked to the page.
    names = {}
    for m in load('case_manifest.json'):
        if m.get('local_file'):
            names[m['local_file']] = m['title']
    for d in docs:
        if d.get('local_pdf'):
            names.setdefault(d['local_pdf'], f"{d['notif_no']} ({d.get('type', '')})")
    for d in load('document_inventory.json'):
        if d.get('href'):
            names.setdefault(d['href'], d.get('role') or d['file'])
    pdfs = sorted(list((ROOT / 'obc_pdfs').glob('*.pdf')) + list((ROOT / 'case_pdfs').glob('*.pdf')))
    with_text = 0
    for pdf in pdfs:
        rel = pdf.relative_to(ROOT).as_posix()
        try:
            raw = subprocess.run(['pdftotext', '-enc', 'UTF-8', str(pdf), '-'], capture_output=True, check=True).stdout.decode('utf-8', 'replace')
        except Exception:
            continue
        pages = raw.split('\f')
        if sum(len(p.strip()) for p in pages) < 400:
            continue
        with_text += 1
        title = names.get(rel) or pdf.stem.replace('_', ' ').replace('-', ' ')
        for number, page in enumerate(pages, 1):
            page = re.sub(r'\s+', ' ', page).strip()
            for start in range(0, len(page), PASSAGE):
                part = page[start:start + PASSAGE]
                if len(part) < 120:
                    continue
                add('PDF text', title, f'{rel}#page={number}', part, '', f'{pdf.name} · page {number}')
    return rows, with_text, len(pdfs)


def lsa(rows):
    docs = [tokens(r['_full']) for r in rows]
    df = {}
    for toks in docs:
        for t in set(toks):
            df[t] = df.get(t, 0) + 1
    n = len(docs)
    vocab = sorted(t for t, c in df.items() if 3 <= c <= n * 0.4 and len(t) < 30)
    index = {t: i for i, t in enumerate(vocab)}
    idf = np.array([math.log((1 + n) / (1 + df[t])) + 1 for t in vocab], dtype=np.float32)
    A = np.zeros((n, len(vocab)), dtype=np.float32)
    for r, toks in enumerate(docs):
        counts = {}
        for t in toks:
            if t in index:
                counts[index[t]] = counts.get(index[t], 0) + 1
        for c, v in counts.items():
            A[r, c] = (1 + math.log(v)) * idf[c]
        norm = np.linalg.norm(A[r])
        if norm:
            A[r] /= norm
    # Randomized truncated SVD (Halko et al.) with two power iterations.
    rng = np.random.default_rng(42)
    omega = rng.standard_normal((len(vocab), DIMS + 16)).astype(np.float32)
    Y = A @ omega
    for _ in range(2):
        Y, _r = np.linalg.qr(Y)
        Y = A @ (A.T @ Y)
    Q, _r = np.linalg.qr(Y)
    B = Q.T @ A
    Ub, S, Vt = np.linalg.svd(B, full_matrices=False)
    V = Vt[:DIMS].T                      # vocab x DIMS
    D = A @ V                            # records x DIMS (projection used for queries too)
    D /= np.maximum(np.linalg.norm(D, axis=1, keepdims=True), 1e-9)
    def q8(M):
        scale = float(np.abs(M).max()) / 127 or 1.0
        return np.clip(np.round(M / scale), -127, 127).astype(np.int8), scale
    D8, dscale = q8(D)
    V8, vscale = q8(V)
    return vocab, idf, D8, V8, dscale, vscale, float(S[:DIMS].sum() / max(S.sum(), 1e-9))


def main():
    rows, with_text, total = records()
    vocab, idf, D8, V8, dscale, vscale, kept = lsa(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    for r in rows:
        r.pop('_full')
    (OUT / 'records.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (OUT / 'vectors.json').write_text(json.dumps({
        'dims': DIMS, 'records': len(rows), 'vocab': vocab, 'idf': [round(float(x), 3) for x in idf],
        'docScale': dscale, 'termScale': vscale, 'files': {'docs': 'doc-vectors.bin', 'terms': 'term-vectors.bin'}
    }, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (OUT / 'doc-vectors.bin').write_bytes(D8.tobytes())
    (OUT / 'term-vectors.bin').write_bytes(V8.tobytes())
    kinds = {}
    for r in rows:
        kinds[r['k']] = kinds.get(r['k'], 0) + 1
    print(f'Search index: {len(rows)} records {kinds}; PDF text from {with_text} of {total} PDFs; '
          f'{len(vocab)} terms x {DIMS} dims')


if __name__ == '__main__':
    main()
