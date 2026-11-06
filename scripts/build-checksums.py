"""Write data/pdf_checksums.json: a SHA-256 fingerprint for every archived PDF.

Run after adding PDFs. validate-site.js checks every PDF against this list, so a
changed, corrupted or unlisted file is caught before publishing.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rows = {}
for folder in ('obc_pdfs', 'case_pdfs'):
    for pdf in sorted((ROOT / folder).glob('*.pdf')):
        rows[pdf.relative_to(ROOT).as_posix()] = {'sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(), 'bytes': pdf.stat().st_size}
out = {'note': 'SHA-256 fingerprints of every archived PDF. Regenerate with python3 scripts/build-checksums.py after adding files.', 'count': len(rows), 'files': rows}
(ROOT / 'data/pdf_checksums.json').write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
print(f'{len(rows)} PDFs fingerprinted')
