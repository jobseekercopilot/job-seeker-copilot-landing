# Search Console and indexing runbook

Tracking: [SEO-01 #49](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/49) and [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8)

## Safety boundary

Search indexing is fail closed. `ENABLE_SEARCH_INDEXING` is false unless an
approved `main` Amplify build also has `AWS_BRANCH=main` and the exact public
website URL `https://www.jobseekercopilot.com`. Development, preview, feature,
test and pre-approval production builds must render `noindex, nofollow,
noarchive` and publish a disallow-all `robots.txt`.

Do not enable indexing, submit a sitemap, request a live URL inspection, change
DNS or announce launch during SEO-01. Those are RELEASE-02 actions only after
both production journey smoke tests pass and Bernard approves launch.

Never put a Search Console verification value, mailbox address, token, private
URL, provider response or complete ownership record in a GitHub issue, build
log, screenshot or public evidence.

## Ownership and access preparation

1. Use a Google account controlled by Job Seeker Copilot, protected by MFA and
   recovery controls. Do not make a personal consumer mailbox the sole owner.
2. Nominate one accountable owner and one backup. Give other operators the
   least Search Console role needed for their work and review access regularly.
3. Prefer a domain property for complete apex/`www` coverage. Its DNS TXT
   verification needs a separately reviewed DNS change during RELEASE-02.
4. Store the pending verification value and ownership record in the approved
   private secret/access register until the intentional verification step.
   Public DNS will expose a DNS verification record by design after approval;
   GitHub evidence must still record only pass/fail, owner role and timestamp.
5. If a URL-prefix property is used as a bounded fallback, keep the method and
   value private until deployment and remove obsolete verification material
   after ownership is safely replaced.

## RELEASE-02 activation procedure

Run these steps only after the canonical production deployment, waiting-list
smoke and contact smoke all pass with switches restored to their approved
states.

1. Record Bernard's explicit indexing approval, the exact reviewed `main`
   commit, release operator and second reviewer.
2. Confirm the apex redirects once to `www`, important routes return expected
   statuses, action routes remain noindex, and no development host or sensitive
   query appears in metadata.
3. Verify or create the Search Console property through the approved private
   ownership workflow. Review any DNS change before applying it; do not modify
   unrelated DNS records.
4. Set `PUBLIC_WEBSITE_URL=https://www.jobseekercopilot.com` and
   `ENABLE_SEARCH_INDEXING=true` on `main` only. Preserve every unrelated
   Amplify variable and start one reviewed rebuild of the exact release commit.
5. Verify the deployed runtime config reports indexing enabled, approved public
   pages render `index, follow`, action/error routes remain noindex,
   `robots.txt` allows crawling and references the canonical sitemap, and the
   sitemap contains exactly the approved `www` URLs.
6. Submit `https://www.jobseekercopilot.com/sitemap.xml` once. Do not submit a
   development, preview, action, query-string or duplicate-host URL.
7. Inspect the homepage, FAQ, founder story, comparison article and one legal
   or contact page. Confirm the live page, declared canonical, robots state,
   last crawl and rendered HTML agree. Never inspect a URL containing a real
   confirmation or unsubscribe token.
8. Record only redacted counts/statuses and begin coverage, sitemap, manual
   action, security issue and Core Web Vitals monitoring. INP and other field
   data may take time to appear; absence of early field data is not success.

## Rollback

If canonical, noindex, sitemap, content, security or smoke evidence is wrong:

1. set `ENABLE_SEARCH_INDEXING=false` on `main` and rebuild the last reviewed
   commit;
2. verify HTML returns to noindex and `robots.txt` disallows all crawling;
3. keep action routes and sensitive URLs excluded; never solve indexing by
   exposing or deleting subscriber data;
4. remove an incorrect sitemap submission in Search Console if necessary, but
   retain the verified property and least-privilege owners; and
5. open a focused launch blocker with redacted evidence. Do not request removals
   for URLs that contain private tokens in public issue text.
