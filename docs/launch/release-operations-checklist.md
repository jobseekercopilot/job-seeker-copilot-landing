# Landing release operations checklist

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8)

Use this checklist with the
[operations and troubleshooting runbook](./operations-and-troubleshooting-runbook.md).
It does not authorise a launch or replace TEST-01, TEST-02, RELEASE-01 or
RELEASE-02 acceptance evidence.

## Release record

- [ ] Release operator and second reviewer identified.
- [ ] UTC release window and rollback decision time recorded.
- [ ] Source PR, exact commit and target environment recorded.
- [ ] Last-known-good frontend job/commit and backend commit/change set recorded.
- [ ] No mailbox content, complete address, contact text, token, table item or
      secret appears in the record.

## Preflight

- [ ] Correct AWS account, `eu-west-2`, stack and Amplify app verified.
- [ ] Clean checkout at the reviewed commit; no direct work on `develop` or
      `main`.
- [ ] Public frontend/backend submission and frontend/backend analytics switches
      are `false`.
- [ ] Stack is stable; Lambda updates succeeded; all alarms are OK and have
      actions.
- [ ] SES production access, sending, domain identity/DKIM, configuration-set
      destination and quota are healthy.
- [ ] External subscriber table ownership and no-delete boundary reconfirmed.
- [ ] Current AWS budget alerts and launch staffing/escalation cover confirmed.
- [ ] SEO-01 and MONITORING-01 are merged; search indexing remains explicitly
      disabled on every branch.

## Code and security gate

- [ ] Frontend lint, tests, runtime/security tests and production build pass.
- [ ] Both backend test suites pass.
- [ ] Both SAM templates validate/build; only the deployed waitlist-backend
      template targets the live stack.
- [ ] Full-history/current-tree/artifact secret scans pass.
- [ ] Dependency and Python static-analysis gates have no unresolved
      Critical/High finding.
- [ ] Pull-request and exact post-merge GitHub Full release gates pass with zero
      annotations.

## Backend deployment

- [ ] SAM deployment creates a named change set without executing it.
- [ ] Second reviewer confirms no resource removal, data replacement,
      protection reduction, wildcard IAM/CORS, secret output, recipient drift or
      unrelated change.
- [ ] NoEcho values came only from the approved private workflow and unchanged
      parameters preserve previous values.
- [ ] Approved change set executes to `UPDATE_COMPLETE`.
- [ ] Stack/Lambda status, routes, alarms, dashboard and 30-day log retention
      pass control-plane verification.
- [ ] The reviewed monitoring stack has 31 alarms, the analytics Lambda role is
      log-only and the analytics log group retains 30 days.
- [ ] All submission and analytics switches remain false.

## Development E2E

- [ ] TEST-01 passes submit, one delivery, confirmation, repeat-token,
      invalid/expired token, resend and expected state checks without a table
      scan.
- [ ] TEST-02 passes one controlled contact delivery, identical-retry
      suppression, safe MIME/authenticated headers and visitor-directed Reply-To.
- [ ] SES simulator bounce/complaint and purpose-separation evidence is current.
- [ ] Exact-origin CORS, security headers, keyboard, assistive-technology and
      responsive checks pass.
- [ ] Both switches are returned to false after each controlled window.

## Frontend release and promotion

- [ ] Reviewed release PR promotes `develop` to `main` without rewriting
      history.
- [ ] Exact `main` commit passes the post-merge Full release gate.
- [ ] Amplify `main` job succeeds for that exact commit.
- [ ] Public runtime config contains only approved public URLs/labels and the
      safe false submission, analytics and search-indexing switches; artifact,
      SEO-output and CSP/security-header checks pass.
- [ ] Custom domain mappings move only after the successful `main` deployment is
      verified; apex redirect and SPA routes pass.

## Production smoke

- [ ] Production stack parameters, canonical origins/links, SES and monitoring
      are correct before opening a test window.
- [ ] One controlled waiting-list submit/delivery/confirm smoke passes through
      the canonical domain.
- [ ] One controlled contact submit and identical retry produce exactly one
      company delivery with visitor-directed Reply-To.
- [ ] Expected count-only metrics appear; no unexpected alarm or SES outcome
      occurs.
- [ ] With `analytics_test=smoke`, refusal makes no analytics request; acceptance
      emits only the bounded visit/page/form events and true backend outcomes.
- [ ] Smoke events are separate from production traffic and contain no visitor
      identifier, raw referrer, full URL/query, address, message or token.
- [ ] Desktop/mobile, keyboard and assistive-technology spot checks pass.
- [ ] Both switches are returned to false until the explicit launch decision.
- [ ] The analytics owner records the intentional final frontend/backend
      analytics state; disabling it leaves both journeys working.
- [ ] Approved public pages expose the sole `www` canonical while action/error
      routes remain noindex and absent from the sitemap.

## Post-smoke Search Console and indexing approval

- [ ] Both production journey smoke tests passed and Bernard's explicit
      indexing approval is recorded against the exact `main` commit.
- [ ] Search Console accountable owner, backup, MFA/recovery and least-privilege
      access review are complete through the private ownership register.
- [ ] Any domain-property DNS verification change has separate approval and
      changes no unrelated DNS record; the verification value is absent from
      GitHub evidence.
- [ ] `ENABLE_SEARCH_INDEXING=true` is set on `main` only with the exact
      `PUBLIC_WEBSITE_URL`; the reviewed rebuild succeeds for the release
      commit.
- [ ] Public routes render index/follow; action/error routes remain noindex;
      robots and the approved-URL-only `www` sitemap validate.
- [ ] The canonical sitemap is submitted once and key public URLs pass live
      inspection without inspecting any real token/query URL.
- [ ] Search coverage, sitemap health, security/manual actions and field Core
      Web Vitals ownership are active; the disable-and-rebuild rollback is
      ready.

## Rollback readiness

- [ ] Frontend last-known-good commit/job and approved revert path are ready.
- [ ] Backend last-known-good template/parameters and reviewed change-set path
      are ready.
- [ ] Operator can disable the frontend and backend contact paths independently.
- [ ] Operator can disable frontend then backend analytics independently without
      deleting logs or changing operational monitoring.
- [ ] Rollback contains no stack/table deletion, direct Lambda drift, insecure
      CORS/recipient restoration or data scan/export.
- [ ] `UPDATE_ROLLBACK_FAILED`, misrouting, privacy and AWS-service escalation
      paths are understood.

## Launch decision and close-out

- [ ] RELEASE-02 acceptance evidence is complete and redacted.
- [ ] Legal/content/accessibility/ONS checks and owner approval are recorded.
- [ ] Alarm response staffing and cost review are active.
- [ ] Any failure created a focused issue, disabled affected submissions and
      kept the epic open.
- [ ] Only after every production criterion passes: record the launch decision,
      intentional final submission/analytics switch states and monitoring owner.
