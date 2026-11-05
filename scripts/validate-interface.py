"""Read-only browser checks for the public portal; never submits a form."""
import json
import os
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['index', 'timeline', 'litigation', 'obc-list', 'documents', 'evidence',
         'record-guide', 'inventory', 'obc-basics', 'methods', 'reports', 'about', 'contribute']
OUTPUT = Path(os.environ.get('TEMP', '/tmp')) / 'wb-portal-review'
OUTPUT.mkdir(exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    failures, errors = [], []
    checks = 0
    try:
        with sync_playwright() as p:
            chrome = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
            browser = p.chromium.launch(**({'executable_path': str(chrome)} if chrome.exists() else {}))
            context = browser.new_context(service_workers='block')
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            for name in PAGES:
                page.goto(base + name + '.html', wait_until='networkidle')
                page.wait_for_function('window.WBOBCI18n?.getTranslations()?.en')
                page.wait_for_timeout(200)
                for width in [320, 768, 1440]:
                    page.set_viewport_size({'width': width, 'height': 1000})
                    for theme in ['light', 'dark']:
                        page.locator('#theme-select').select_option(theme)
                        for language in ['en', 'bn']:
                            page.locator('#lang-' + language).click()
                            page.wait_for_timeout(220)
                            checks += 1
                            info = page.evaluate('''() => ({
                              overflow: document.documentElement.scrollWidth > innerWidth + 1,
                              lang: document.documentElement.lang,
                              theme: document.documentElement.dataset.theme,
                              brokenText: /\\?{3,}|file-바이/.test(document.body.innerText),
                              missingKeys: /editorial\\.\\d+|interface\\.\\d+|count\\.classes/.test(document.body.innerText)
                            })''')
                            if info['overflow'] or info['brokenText'] or info['missingKeys'] or info['lang'] != language or info['theme'] != theme:
                                failures.append([name, width, theme, language, info])
                            collision = page.evaluate('''() => document.querySelector('.site-header').getBoundingClientRect().bottom > document.querySelector('.hero').getBoundingClientRect().top + 1''')
                            if collision:
                                failures.append([name, width, theme, language, 'Header overlaps hero'])
                            if name in ['index', 'evidence', 'documents'] and width in [320, 1440]:
                                page.screenshot(path=str(OUTPUT / f'{name}-{width}-{theme}-{language}.png'))
                print(f'{name}: checked both languages and themes at three widths', flush=True)
            (OUTPUT / 'results.json').write_text(json.dumps({'layouts_checked':checks,'failures':failures,'javascript_errors':errors},indent=2),encoding='utf-8')
            # Focus, menu, preferences and original-source text must survive translation.
            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto(base + 'index.html', wait_until='networkidle')
            page.locator('.nav-toggle').click()
            assert page.locator('.nav-toggle').get_attribute('aria-expanded') == 'true'
            page.keyboard.press('Escape')
            assert page.locator('.nav-toggle').get_attribute('aria-expanded') == 'false'
            page.locator('#lang-bn').click()
            page.locator('#theme-select').select_option('dark')
            page.goto(base + 'evidence.html', wait_until='networkidle')
            assert page.locator('html').get_attribute('lang') == 'bn'
            assert page.locator('html').get_attribute('data-theme') == 'dark'
            page.locator('#theme-select').select_option('auto')
            page.emulate_media(color_scheme='light', reduced_motion='reduce')
            page.wait_for_function("document.documentElement.dataset.theme === 'light'")
            page.emulate_media(color_scheme='dark')
            page.wait_for_function("document.documentElement.dataset.theme === 'dark'")
            page.goto(base + 'obc-list.html', wait_until='networkidle')
            page.locator('#obc-class-search').fill('Kapali')
            assert page.locator('#obc-class-list tr:visible').count() > 0
            assert page.locator('#obc-class-list tr:visible').count() < page.locator('#obc-class-list tr').count()
            page.locator('#obc-class-search').fill('zzzz-nonexistent')
            assert page.locator('#obc-class-list tr:visible').count() == 0
            page.goto(base + 'documents.html', wait_until='networkidle')
            page.locator('#doc-search').fill('945')
            assert 0 < page.locator('#docs-tbody tr:visible').count() < page.locator('#docs-tbody tr').count()
            page.locator('#doc-search').fill('')
            page.locator('#doc-status-filter').select_option('current')
            assert page.locator('#docs-tbody tr:visible').count() > 0
            page.locator('#doc-status-filter').select_option('all')
            page.locator('.view-doc-btn').first.click()
            source = page.locator('#modal-text').inner_text()
            assert len(source) > 100
            page.keyboard.press('Escape')
            page.locator('#lang-en').click()
            page.locator('.view-doc-btn').first.click()
            assert page.locator('#modal-text').inner_text() == source
            page.keyboard.press('Escape')
            page.goto(base + 'contribute.html', wait_until='networkidle')
            assert not page.locator('#report-form').evaluate('form => form.checkValidity()')
            page.goto(base + 'index.html', wait_until='networkidle')
            page.keyboard.press('Tab')
            assert page.locator('.skip-link').evaluate('el => el === document.activeElement')
            page.keyboard.press('Enter')
            assert page.locator('#main-content').evaluate('el => el === document.activeElement')
            # A file-opened standalone copy must be able to switch languages without fetching JSON.
            page.goto((ROOT / 'index-standalone.html').as_uri(), wait_until='load')
            page.wait_for_function('window.WBOBCI18n?.getTranslations()?.bn')
            page.locator('#lang-bn').click()
            assert page.locator('html').get_attribute('lang') == 'bn'
            no_js = browser.new_context(java_script_enabled=False)
            fallback = no_js.new_page()
            for name, selector in [('evidence', '#public-hearings-tbody tr'), ('documents', '#docs-tbody tr'), ('obc-list', '#obc-class-list tr')]:
                fallback.goto(base + name + '.html')
                assert fallback.locator(selector).count() > 0
            browser.close()
    finally:
        server.shutdown()
    result = {'layouts_checked': checks, 'failures': failures, 'javascript_errors': errors}
    (OUTPUT / 'results.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
    print('Screenshots:', OUTPUT)
    assert not failures and not errors, 'See browser validation results'

if __name__ == '__main__':
    run()
