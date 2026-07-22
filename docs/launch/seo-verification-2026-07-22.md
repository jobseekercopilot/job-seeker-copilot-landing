# Production SEO verification — 2026-07-22

## Audit outcome

The pre-implementation audit found crawlable prerendered content, correct H1
structure, complete image alt coverage, valid visible FAQ/article schema,
working internal route links, a real production 404 response and healthy
desktop/mobile lab performance. It also found launch-blocking mixed canonical
hosts, repeated descriptions, incomplete social metadata, static allow-all
robots files, no action-route noindex and no explicit launch approval gate.

The detailed findings were recorded on SEO-01 before implementation. No DNS,
Search Console, sitemap submission or indexing action was taken.

## Implemented policy

- Eight approved public routes have unique titles/descriptions, a sole `www`
  canonical and complete Open Graph/Twitter metadata.
- The sharing image is a 1200x630 PNG derived from the approved repository
  artwork. No generated testimonial, result, rating, price or guarantee is
  present.
- Home exposes supported Organization/WebSite schema; FAQ exposes visible
  FAQPage data; the dated comparison exposes BlogPosting data. No unsupported
  Product, SoftwareApplication, review or rating schema is used.
- Confirmation, resend, unsubscribe and not-found routes always render
  `noindex, nofollow, noarchive`, have no canonical/social tags and never enter
  the sitemap.
- Search indexing defaults to false and can be enabled only for `main` with the
  exact canonical public URL. Disabled builds render HTML noindex and a
  disallow-all robots file; enabled approved builds retain action-route noindex
  and publish the canonical sitemap.
- Sitemap and robots files are generated deterministically from the approved
  route policy. Prohibited hosts, queries, fragments, action, API and error
  routes fail validation.
- The SPA wildcard presents a dedicated noindex not-found view rather than
  silently redirecting visitors to the homepage.

## Evidence boundary

Automated checks inspect only public build artifacts, route metadata, links,
headings and aggregate performance values. Search Console verification values,
ownership identities, private URLs, query tokens and provider responses must
remain outside repository and issue evidence.

Live ownership verification, sitemap submission, URL inspection, field Core Web
Vitals review and intentional indexing activation remain RELEASE-02 work after
both production journey smoke tests and Bernard's approval.

## Pre-merge verification

- Lint and whitespace validation passed.
- The full suite passed: 17 frontend files with 86 tests, eight runtime-config
  tests, SEO/security/operations policy checks and 76 backend tests.
- Disabled-indexing and isolated approved production-like builds both
  prerendered and verified all 12 routes. The disabled artifact publishes
  noindex plus disallow-all robots; the approved simulation publishes the same
  eight canonical sitemap URLs with indexing allowed only on public pages.
- The final disabled-indexing artifact is 267.69 kB raw and 73.25 kB estimated
  transfer for its initial JavaScript/CSS bundle, within the configured budget.
- Automated WCAG 2.0/2.1/2.2 A/AA checks, viewport-overflow checks and focused
  keyboard/CSP/token-history checks passed for all 12 routes at desktop and
  mobile widths.
- The internal route/fragment audit found no missing target. The external link
  audit found one retired first-party Help page, which was replaced by the
  current official source; anti-bot responses were treated as inconclusive
  rather than reported as successful checks.
