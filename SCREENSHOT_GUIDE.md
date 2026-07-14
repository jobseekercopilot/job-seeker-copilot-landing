# Product screenshot guide

All public screenshots must use demo data and be reviewed at 100% zoom before release. Remove names, email addresses, account balances, private applications, browser chrome, bookmarks, localhost URLs, API keys, personal documents and private company information.

Recommended source capture: 1920×1080 or larger PNG. Public assets should normally be cropped to the relevant workspace and exported as WebP at roughly 1,200–1,600px wide. Keep UI text readable and avoid aggressive compression.

| Required screen | Landing-page use | Suggested filename | Recommended dimensions | Crop guidance | Status |
|---|---|---|---|---|---|
| Main dashboard | Hero | `workspace-overview.webp` | 1600×1000 | Exclude profile and account controls; retain workspace tabs and progress | Current hero uses the application workspace crop; replace when a dedicated overview is approved |
| Job search | Multi-source search feature | `job-search.webp` | 1400×1000 | Focus on result cards and source labels | Included |
| Job details | Search or workflow feature | `job-details.webp` | 1400×1000 | Show one expanded role; remove identifying application data | Current `job-search.webp` includes an expanded role; a dedicated capture is optional |
| Tailored CV and cover-letter generation | Tailored application documents feature | `documents-generated.webp` | 1400×1000 | Show the selected job, both generated documents and replacement controls | Included |
| Document organisation | Document library feature | `document-library.webp` | 1400×1000 | Retain linked job, version and format; remove profile sidebar | Included |
| Job tracking | Application tracking feature and hero | `application-tracking.webp` | 1400×1000 | Retain filters and milestone timeline; remove account panels | Included |
| Job-specific attachments | CV/cover-letter features | `job-document-attachments.webp` | 1400×1000 | Show both documents linked to one job | Current `documents-generated.webp` covers this view |
| Built-in document editor | Roadmap only | `built-in-editor.webp` | 1400×1000 | Do not add until the feature is implemented and approved | **Planned feature — no screenshot should be presented as current** |

## Replacement checklist

1. Confirm every visible person, email address, job and company is approved demo data.
2. Check the browser edge, tooltips, menus and sidebars for accidental personal data.
3. Export WebP and keep the source PNG outside the deployed `public` directory.
4. Preserve the existing filenames where possible so no component code changes are needed.
5. Run `npm run build`, inspect at 375px, 768px, 1024px and 1440px, and confirm text remains useful.
