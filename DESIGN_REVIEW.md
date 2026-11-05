# Portal design and Bengali revision

Checkpoint: `42d21a7ad409792fc94388b11b3ab68923444f67` — `chore: checkpoint portal before design and Bengali improvements`.

The checkpoint records the complete pre-revision bundle. The redesign is left uncommitted for review. Nothing was pushed or published.

## Changes

- Replaced accumulated styling overrides with a shared editorial design system. Light and dark themes use the same component rules with separate semantic colour tokens.
- Improved typography, reading widths, mobile record cards, statistics, source actions, timelines, forms, and keyboard focus. Compact language and appearance controls remain visible.
- Reworked document metadata and PDF/text actions. Long summaries remain complete; collection filenames remain available as secondary provenance. Hearing-date links use a compact grid.
- Kept the OBCWB logo as the only masthead logo. Added a theme-aware CRG logo to the mobile navigation drawer and footer.
- Added Tiro Bangla for Bengali interface and research text, with a local system-font fallback.
- Added print controls for research pages. The print icon and the browser's system Print command use the same in-place A4 layout, preserving the current language and filters. The output includes OBCWB and CRG branding, source links, a generation timestamp, and a research disclaimer at the end.
- Revised Bengali terminology and connected previously untranslated editorial content. Added translations for document summaries, inventory descriptions, statuses, accessible labels, and dynamic messages. Revised timeline/case wording is stored separately from the original datasets.
- Added exact-text translation support for dynamic content and inline translation data for the standalone edition. Original document text, identifiers, official names, and source destinations remain intact.
- Fixed translated-status filtering, hidden search results in mobile grids, and keyboard focus for the skip link.

## Validation

- Data validation: 11 research JSON files.
- Site validation: all 13 public pages.
- Preservation comparison: all 94 PDFs and 13 root JSON files unchanged; existing IDs and link destinations retained across 15 HTML files, including the standalone and administration pages.
- Translation checks: 1,105 English keys have Bengali counterparts; no replacement-character corruption, lost source links in translated HTML, or mismatched interpolation fields.
- Browser layout matrix: 13 pages × 3 viewport widths (320, 768, 1440) × 2 languages × 2 themes = 156 combinations.
- Checked text contrast in both themes across the public pages, 200% zoom, loaded Hind Siliguri/Anek Bangla fonts, Bengali fallback fonts, reduced motion, mobile navigation, preference persistence, and Auto appearance.
- Exercised global/document/timeline/case search, document status filters in Bengali, original-source text previews, required form fields and URL validation, and keyboard skip navigation. No form was submitted.
- Checked file-opened standalone Bengali switching and pre-rendered records without JavaScript.
- Generated a Bengali PDF in Chrome from a filtered document page; confirmed the Tiro Bangla font, matching filtered records, source links, branding, and Bengali disclaimer.

Browser checks used local Chrome through Playwright. This is not a substitute for a separate Safari/Firefox or screen-reader audit.

## Reproduce

Run the existing page and standalone builds, then `npm run validate:data` and `npm run validate:site`.

Additional checks:

```text
python scripts/validate-preservation.py
python scripts/validate-interface.py
```

The browser check requires Python Playwright and Chrome (or Playwright Chromium). Screenshots and browser results are written to the operating system's temporary directory under `wb-portal-review`, keeping generated review artifacts out of the repository.
itory.
