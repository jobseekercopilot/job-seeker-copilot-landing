# UK labour-market data review record

The public figures are defined once in `src/app/content/labour-market-content.ts` and rendered by the labour-market component. Do not copy the values into another template.

## Current reviewed figures

| Measure | Value | Measurement period | Official source |
| --- | ---: | --- | --- |
| UK unemployment rate, people aged 16 and over | 4.9% | March to May 2026 | ONS, Employment in the UK: July 2026 |
| Estimated unemployed people aged 16 and over | 1.760 million | March to May 2026 | ONS, Employment in the UK: July 2026 |
| Estimated UK job vacancies | 712,000 | April to June 2026 | ONS, Vacancies and jobs in the UK: July 2026 |
| Estimated unemployed people per vacancy | 2.5 | March to May 2026 | ONS, Vacancies and jobs in the UK: July 2026 |

- ONS publication date: 21 July 2026
- Date last checked: 24 July 2026
- Last review responsibility: project owner, supported by the pre-launch content review
- Next scheduled ONS release shown on the July bulletin: 18 August 2026
- Detailed claim-by-claim ledger: `docs/research/uk-job-market-statistics-2026-07.md`

## Official pages to check

- [Employment in the UK](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/employmentintheuk/latest)
- [Vacancies and jobs in the UK](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/jobsandvacanciesintheuk/latest)
- [Labour market overview, UK](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/latest)

The website deliberately links to versioned `/july2026` releases so an unchanged figure cannot silently point at a newer bulletin.

## How to perform the next review

1. Open all three official ONS pages above and confirm the newest publication date.
2. Read the headline measure definitions and quality notes; do not rely only on a search snippet or third-party summary.
3. Update each `value`, `description` and `period` in `LABOUR_MARKET_CONTENT` from the same release, unless different periods are clearly disclosed.
4. Replace the versioned `sourceUrl` values with the new publication URLs.
5. Update `publicationDate` to the ONS release date and `lastReviewed` to the date the figures were checked.
6. Update the table and review record in this file.
7. Verify that age ranges, “estimated” wording, periods and supporting vacancy changes still match the bulletin.
8. Check whether the ONS classification or caution wording for Labour Force Survey estimates has changed.
9. Run the frontend tests, production build, link checks and responsive/accessibility review.
10. Record the reviewer in the release checklist without publishing private personal details.

If deployment is on or after 18 August 2026, check for the August release and replace the July values if it has been published. Statistics are manually reviewed; the page must not scrape ONS during normal loading.
