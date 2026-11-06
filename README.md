# West Bengal OBC Archive (OBCWB)

**A public, bilingual archive of the documents behind Other Backward Classes (OBC) reservation in West Bengal, from 1993 to 2026.**

Live site: **<https://obcwb.civicresearch.in>** · বাংলা: <https://obcwb.civicresearch.in/?lang=bn>

A research initiative of [Civic Research Group (CRG)](https://civicresearch.in).

---

## What this archive is

West Bengal's OBC list has been made, expanded, split into categories, struck down by the Calcutta High Court, rebuilt and withdrawn over three decades. The documents that explain how this happened are scattered across department websites, gazettes, court portals and newspaper notices. Some of them have disappeared.

This archive brings them together in one place, keeps a copy of each original, and explains each one in plain English and Bengali. It is meant for:

- **the public:** to find out which communities are on the list today and what changed;
- **lawyers:** to trace an order back to the notification, Act or judgment it relies on;
- **researchers and journalists:** to cite primary sources with dates, reference numbers and page-level text.

### What's inside

| | |
|---|---|
| **118 source PDFs** | 76 government notifications, orders, Acts, guidelines, hearing notices and reports (`obc_pdfs/`) and 42 court records (`case_pdfs/`). Each file's SHA-256 checksum is in `data/pdf_checksums.json`. |
| **Notification timeline** | 75 dated events, from the 1993 Commission Act to the 2026 Acts, each linked to its source file. |
| **Litigation tracker** | 13 proceedings in the Calcutta High Court and Supreme Court, with 43 dated court events, case cards and a map of the court orders. |
| **OBC list** | The current 66-class list (Notification 945-BCW, 18 May 2026) and the status of every historical and withdrawn class. |
| **Document notes** | Plain-language notes for all 56 listed documents in English and Bengali, checked against each PDF on 6 November 2026. |
| **Public hearings** | The 2025 Commission hearing notices with dates, venues and communities. |
| **Search** | Site-wide search over every record and the full text of the PDFs. |
| **Exports** | Any table can be downloaded as CSV, Excel or a PDF report. |

Every page works in English and Bengali, on phones, and offline once loaded.

---

## Disclaimer

**This archive is a research aid, not legal advice.**

- **Not an official source.** Civic Research Group is an independent, volunteer research group. We are not connected to the Government of West Bengal, the Backward Classes Welfare Department, the West Bengal Commission for Backward Classes, any court or any political party. Nothing here is an official or certified copy.
- **Check the original before you rely on it.** We collect documents from public sources and check them carefully, but copies may be incomplete, scanned text may contain errors, and later orders may change what an earlier document means. Before relying on any document, check it against the official gazette, the issuing department or the certified court record.
- **Court records are mostly unofficial.** Many court records here are prints of public court-text mirrors such as Indian Kanoon, not certified copies. Each record says where it came from. Case status changes; confirm the current position with the court before acting on it.
- **Our notes and translations are summaries.** The plain-language notes, timeline entries and Bengali translations are our own work, written to help readers. Where a note and the original document differ, the original document is correct.
- **No view on any community's claim.** Including a community, document or argument in this archive does not mean we support or oppose its inclusion in, or removal from, any list.
- **Rights in the source documents.** Government notifications, Acts and court orders belong to their issuing authorities and are reproduced as public records for research and public information. News reports are linked, not copied.
- **Corrections are welcome.** If you find a mistake or a missing document, please tell us through the [Contribute page](https://obcwb.civicresearch.in/contribute) or by email at <civicresearchgroup@gmail.com>.

---

## How to cite this work

If you use this archive in research, reporting, a legal filing or teaching, please cite it. GitHub's **"Cite this repository"** button (from `CITATION.cff`) gives APA and BibTeX formats.

**Suggested citation**

> Civic Research Group. (2026). *West Bengal OBC Archive: Documents, notifications and litigation on Other Backward Classes reservation in West Bengal, 1993–2026* [Data set and website]. https://obcwb.civicresearch.in

**When citing a single document**, cite the original document first and the archive as the place you found it, for example:

> Government of West Bengal, Backward Classes Welfare Department. Notification No. 945-BCW/MR-23/2026, 18 May 2026. Retrieved from the West Bengal OBC Archive, Civic Research Group, https://obcwb.civicresearch.in/documents

**BibTeX**

```bibtex
@misc{crg_obcwb_2026,
  author       = {{Civic Research Group}},
  title        = {West Bengal OBC Archive: Documents, notifications and litigation on
                  Other Backward Classes reservation in West Bengal, 1993--2026},
  year         = {2026},
  howpublished = {\url{https://obcwb.civicresearch.in}},
  note         = {Source repository: https://github.com/civicresearch/wb-obc-document-bundle.
                  Accessed: <date>}
}
```

Please give the date you accessed the archive, because records are added and corrected over time.

### Other CRG projects

- [SIR Adjudication & Tribunal Appeals dashboard](https://appeal.civicresearch.in)
- [RTI Karo](https://rti.votercards.in)
- All projects: <https://civicresearch.in> and the [Projects page](https://obcwb.civicresearch.in/projects)

Contact: <civicresearchgroup@gmail.com>

---

## For maintainers

### Repository layout

- `site-src/app-template.html`: the shared template for every page (header, footer, panels and application code). `site-src/contribute-template.html` is the Contribute page.
- `*.html` at the root: **generated** pages. Edit the template and data, then rebuild; don't edit these files by hand.
- `obc_pdfs/`, `case_pdfs/`: the archived source PDFs.
- Root-level JSON (`obc_documents.json`, `supplemental_documents.json`, `timeline_events.json`, `case_events.json`, `case_manifest.json`, `obc_classes.json`, `public_hearings.json`, `document_inventory.json` and others): the original records. They are **frozen** against checkpoint `42d21a7`: new records may be appended, but existing records may not change. The only exceptions are field fixes listed in `data/source_corrections.json`, each with its old value, reason and source PDF.
- `data/`:
  - `i18n.json`: English and Bengali text;
  - `document_notes.json`: the reviewed reader-facing notes;
  - `case_files.json`, `case_map.json`, `case_orders_map.json`: litigation;
  - `media_coverage.json`: news coverage;
  - `pdf_checksums.json`: file checksums;
  - `search/`: the search index.
- `css/crg.css`: CRG design. `js/navigation.js`: menus, language and theme, and jumping to search targets. `js/search.js`: search. `js/export.js`: downloads.
- `scripts/`: build and validation scripts.
- `data/seo.json`: each page's search title, description and sharing-card facts, in English and Bengali. Pages are published as `timeline.html` but linked as `/timeline`; GitHub Pages serves both, and the page tidies a `.html` address in the browser bar.

### Build and check

```sh
npm run serve           # local server at http://localhost:8123 (clean URLs, like the live site)
npm run build           # pages + standalone copy + search index
npm run build:og        # sharing images and app icons (after editing data/seo.json or page titles)
npm run validate:data
npm run validate:site
python3 scripts/validate-preservation.py
```

The search index needs Python with numpy and `pdftotext`. After adding PDFs, run `python3 scripts/build-checksums.py` and update the record count. Bump the cache name in `sw.js` when assets change.

To add a page, register it in:

- `scripts/build-pages.js`;
- the template's page map and navigation;
- `data/i18n.json`;
- `scripts/site-publishing.js`;
- `scripts/build-og.js`;
- `scripts/validate-site.js`;
- `sw.js`.

### Publishing

The site is served by GitHub Pages from `main` (root folder) at the custom domain in `CNAME`. `scripts/site-publishing.js` writes page metadata, structured data, `sitemap.xml` and `robots.txt` during the build.

### Contributions

`contribute.html` prepares a GitHub issue for review in public; it does not collect data itself. For anonymous feedback, see `SURVEY_SETUP.md`. Don't collect sensitive personal or case material through a public form.

Earlier research notes: [`RESEARCH_UPDATE_2026-11-04.md`](RESEARCH_UPDATE_2026-11-04.md), `README_WB_OBC_SITE.md`, `QUICK_REFERENCE.txt`.
