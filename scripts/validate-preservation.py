"""Verify original records, documents, page anchors and source links against the checkpoint."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECKPOINT = '42d21a7ad409792fc94388b11b3ab68923444f67'

def git(*args):
    return subprocess.check_output(['git', '-c', f'safe.directory={ROOT.as_posix()}', *args], cwd=ROOT)

def main():
    paths = git('ls-tree', '-r', '--name-only', CHECKPOINT).decode().splitlines()
    counts = {'pdfs': 0, 'data_files': 0, 'pages': 0}
    for path in paths:
        file = ROOT / path
        if path.endswith('.pdf'):
            original = git('show', f'{CHECKPOINT}:{path}')
            assert hashlib.sha256(file.read_bytes()).digest() == hashlib.sha256(original).digest(), path
            counts['pdfs'] += 1
        elif path.endswith('.json') and '/' not in path and path != 'package.json':
            current = json.loads(file.read_text(encoding='utf-8'))
            original = json.loads(git('show', f'{CHECKPOINT}:{path}'))
            if isinstance(original, list) and isinstance(current, list):
                # Research refreshes may add records; every original record must survive unchanged.
                assert all(item in current for item in original), path
            else:
                assert current == original, path
            counts['data_files'] += 1
        elif path.endswith('.html') and '/' not in path:
            old = git('show', f'{CHECKPOINT}:{path}').decode()
            new = file.read_text(encoding='utf-8')
            for attr in ['id', 'href']:
                original = set(re.findall(r'\b' + attr + r'="([^"]+)"', old))
                current = set(re.findall(r'\b' + attr + r'="([^"]+)"', new))
                assert not original - current, (path, attr, original - current)
            counts['pages'] += 1
    dictionary = json.loads((ROOT / 'data/i18n.json').read_text(encoding='utf-8'))
    assert not set(dictionary['en']) - set(dictionary['bn']), 'Missing Bengali keys'
    for key, original in dictionary['en'].items():
        translated = dictionary['bn'][key]
        assert not re.search(r'\?{3,}|\ufffd', translated), key
        # Translation markup must never drop a source destination.
        links = set(re.findall(r'href="([^"]+)"', original))
        assert links <= set(re.findall(r'href="([^"]+)"', translated)), key
        assert set(re.findall(r'\{\w+\}', original)) == set(re.findall(r'\{\w+\}', translated)), key
    print(f'Preservation passed against {CHECKPOINT[:7]}: {counts}; bilingual keys: {len(dictionary["en"])}')

if __name__ == '__main__':
    main()
