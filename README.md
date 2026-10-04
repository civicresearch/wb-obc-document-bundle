# WB OBC Document Bundle

This repository hosts a multi-page static research site and its source files. Open
`index.html` in a development server or publish the repository through GitHub Pages.

## Contents

- `obc_pdfs/` - published PDF source documents used by the timeline, corpus, reports, hearings, and inventory sections.
- `case_pdfs/` - published litigation records; see its README for provenance and verification notes.
- `case_manifest.json` - structured litigation-record index.
- `case_events.json` - litigation timeline entries rendered by `litigation.html`.
- `related_sources_catalog.json` - triage of additional OBC-related material, including large court bundles deliberately not committed.
- `obc_documents.json` - extracted text and structured summaries for the document corpus.
- `obc_classes.json` - current 66-class list metadata plus historical/withdrawn class status rows.
- `public_hearings.json` - displayed Jana Shunani/public-hearing dates, times, communities, and archived notice PDFs.
- `supplemental_documents.json` - supplemental BCW/framework document records; rows marked `show_on_timeline` are also rendered into the timeline.
- `timeline_events.json` - notification/policy timeline entries rendered by `timeline.html`.
- `obc_pdf_manifest.json` - PDF manifest for renamed source files.
- `obc_hearing_pdf_manifest.json` - hearing/public notice PDF manifest.
- `evidence_file_inventory.csv` - evidence file inventory.
- `contribute.html` - public source/correction report page; it prepares a reviewable GitHub issue without collecting data itself.
- `document_inventory.json` - display rows for `inventory.html`.
- `site-src/app-template.html` - shared source template for the page header, footer, panels, styles, and application logic.
- `scripts/build-pages.js` - builds the twelve public HTML pages plus the shared `css/site.css` and `js/site.js` assets.
- `index.html?lang=bn` - Bengali mode for the research homepage; the language choice persists across pages.
- `SURVEY_SETUP.md` - privacy-aware guidance for adding a Google Forms survey alongside the public GitHub reporting route.
- `QUICK_REFERENCE.txt` and `README_WB_OBC_SITE.md` - supporting archive notes.

## Important PRD Survey Addition

The bundle includes:

`obc_pdfs/2012-04-25_2572-PN-O-I-1S-5-2012_first_panchayat_survey_guideline.pdf`

This is the first statewide Panchayat & Rural Development Department guideline/order for determining Backward Class population for Panchayat election reservation. It supports the later 2012 survey trail documents already in the bundle.

## Intended Website Use

The site uses relative links, so downloaded copies work without a network connection. When served by GitHub Pages, the same links continue to work:

```text
https://raw.githubusercontent.com/civicresearch/wb-obc-document-bundle/main/obc_pdfs/<file>.pdf
```

For GitHub Pages-style links, use:

```text
https://civicresearch.github.io/wb-obc-document-bundle/obc_pdfs/<file>.pdf
```

Contact: <civicresearchgroup@gmail.com>

Because the main timeline, litigation tracker, and document corpus now load JSON files, serve the folder over HTTP while editing:

```sh
npm run serve
```

Run the data checks before publishing:

```sh
npm run validate:data
```

Build all public pages and the standalone fallback after editing the shared template:

```sh
npm run build
```

Use `npm run build:pages` when only the multi-page site needs rebuilding.

To create a double-clickable fallback copy with the JSON embedded into the HTML:

```sh
npm run build:standalone
```

This writes `index-standalone.html`. Edit `site-src/app-template.html`, the shared
translation/data files, and then run the build; generated page files should not be
edited independently.

## GitHub Pages

1. Push the `main` branch to GitHub.
2. In **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/(root)`.
3. Save. GitHub will publish the site at `https://civicresearch.github.io/wb-obc-document-bundle/`.

The repository root contains `index.html`, which GitHub Pages uses automatically. The larger litigation bundles listed in `related_sources_catalog.json` are intentionally not published; add concise primary orders or properly described extracts instead.

## Public reports and surveys

Use `contribute.html` for public source additions, corrections, missing records, and broken-link reports. It opens a prefilled GitHub issue so that the source trail can be reviewed in public. For anonymous or aggregate feedback, the recommended option is a Google Form configured according to `SURVEY_SETUP.md`; do not collect sensitive personal or case material through a public form.
