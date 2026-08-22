# Job Seeker Copilot landing page

Standalone public landing page for Job Seeker Copilot. This Angular application is intentionally separate from `../job-seeker-copilot-client`: it has its own dependencies, build and runtime configuration. The Angular frontend and its AWS SAM/Python backend remain together in this repository. It copies approved brand assets and screenshots, but has no runtime dependency on the main client.

The public site and waiting-list AWS resources are deployed, but they are not yet verified for launch. The [22 July 2026 current-state audit](./docs/launch/current-state-audit-2026-07-22.md) records the deployed architecture, validation baseline and P0/P1 blockers. Do not treat the public hostname as launch-ready until the linked epic is complete.

## Local development

The project uses Angular 21. Install a Node.js release supported by Angular 21, then run:

```bash
npm install
npm start
```

The configured development server listens on all interfaces and normally opens at `http://localhost:4200`. The checked-in public configuration keeps both forms disconnected. Validation and all non-network states remain testable, and the page explicitly says that local submissions are not stored or sent.

Quality checks:

```bash
npm run lint
npm test
npm run build
```

`npm run build` is the production build. Angular writes deployable browser files to:

```text
dist/job-seeker-copilot-landing/browser
```

The output includes a `browser` subdirectory; this exact directory is used by `amplify.yml`.

## Public runtime configuration

The app loads `/config/app-config.json` before Angular starts. The checked-in file contains safe development defaults and no secrets or development server URL. Hosted builds run `npm run config:generate`, which creates the same file from Amplify environment variables.

Copy `.env.example` only as a reference for variable names. Browser configuration is public—even values called “API URL” or “site key”—so passwords, AWS credentials, private recipient addresses and peppers must never be added to it.

Important switches:

- `PUBLIC_ENVIRONMENT_NAME` must be `development`, `test` or `production`.
- `PUBLIC_BETA_ENABLED` remains `false` until the canonical app URLs and the
  complete reviewed legal configuration are supplied. The legal gate requires
  an exact 18+ policy, policy version/effective date, controller and trading
  identity, address, contacts, ICO position, retention periods,
  `LEGAL_ENTITY_TYPE=SOLE_TRADER|LIMITED_COMPANY` and
  `TAX_STATUS=NOT_VAT_REGISTERED|VAT_REGISTERED`. The same `LEGAL_VERSION` must
  be served by the application's registration-requirements endpoint. Missing
  values do not fall back to example seller details.
- `ENABLE_LIVE_SUBMISSIONS` must remain `false` until SES identity/DKIM verification and a permitted-recipient end-to-end confirmation test have passed.
- `WAITLIST_API_URL`, `WAITLIST_CONFIRMATION_API_URL`, `WAITLIST_RESEND_API_URL`, `WAITLIST_UNSUBSCRIBE_API_URL` and `CONTACT_API_URL` are full public route URLs. A production build with live submissions enabled fails before writing runtime configuration unless the waitlist submit, confirmation, resend and contact routes are valid absolute HTTPS URLs.
- main-application, registration, sign-in, pricing, legal and support URLs are separately configurable. Public beta accepts one query-free HTTPS app origin and exact `/register`, `/sign-in` and `/payment` routes.
- anti-bot fields reserve public provider configuration only. The backend controls remain independent.

The public one-off credit catalogue and the measured decision not to introduce
subscriptions immediately before beta launch are documented in
[the 22 August pricing decision](./docs/launch/pricing-decision-2026-08-22.md).

If live submissions are disabled in a production config, buttons are disabled and a neutral unavailable message is shown. The development-only explanatory message is not shown in production.

## Form contracts

Every API returns JSON in this shape:

```json
{"success":true,"code":"WAITLIST_PENDING_CONFIRMATION","message":"Check your inbox to confirm your email address."}
```

The production `POST /waitlist` contract leaves every new address `PENDING` until its secure single-use link is confirmed. Only a token hash is stored. The browser normalises and validates an address with the same rules as the deployed backend. Confirmation and resend use separate runtime-configured endpoints; all accepted registration states render the same neutral message and resend responses stay neutral to reduce address enumeration. The dedicated implementation and deployment guide are in [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md).

The waitlist form retains a hidden honeypot as a weak client-side automation signal. API Gateway throttling, Lambda validation and DynamoDB conditions are authoritative. The Email Us route additionally uses server-checked timing and a short-lived HMAC duplicate fingerprint without storing enquiry content. See [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md) for deployment details and [the contact abuse-control guide](./docs/launch/contact-abuse-protection.md) for monitoring, tuning and future WAF/CAPTCHA decisions.

The Email Us form trims and validates the required name, email, subject and
message fields, sends only through the runtime-configured HTTPS contact route,
and treats only a typed `CONTACT_ACCEPTED` response as success. It disables all
fields and announces progress while a request is active, resets only after
confirmed acceptance, preserves input for a safe retry, and never renders raw
backend errors. If the production route is unavailable, visitors can use the
public contact address `hello@jobseekercopilot.com`; no private recipient is
present in browser configuration. The full contract is in
[docs/launch/contact-frontend-contract.md](./docs/launch/contact-frontend-contract.md).

## AWS Amplify Hosting

`amplify.yml` uses the lock file (`npm ci`), generates public runtime configuration, runs the production build, publishes the verified browser output directory and caches `node_modules`.

The build specification rejects every branch except protected `main` and also
requires the production-only `AMPLIFY_RELEASE_AUTHORISED=true` switch before
dependency installation. `develop` remains build/test-only, and an unapproved
main update cannot publish through an obsolete external Amplify connection.

Before promoting the existing Amplify app to a verified production release:

1. add only the public variables described above;
2. add an SPA rewrite from `/<*>` to `/index.html` with HTTP 200 so `/privacy`, `/terms`, `/contact`, `/waitlist/confirm`, `/waitlist/resend` and `/waitlist/unsubscribe` survive browser refreshes;
3. set exact API CORS origins to the final Amplify/custom domain;
4. inspect the built `config/app-config.json` and bundles to confirm there are no localhost URLs, private mailboxes or secrets;
5. keep live submission disabled until SES, API, CORS, email receipt and single-use confirmation pass an end-to-end test.

`amplify.yml` remains portable and does not hard-code an Amplify application or AWS account.
The [release artifact and stack-output contract](./docs/launch/release-artifact-contract.md)
defines the immutable static artifact, main-only publication boundary and the
SAM outputs consumed by central infrastructure.

## Serverless infrastructure

The deployed landing stack in `infrastructure/waitlist-backend/` uses AWS SAM and references the existing `JobSeekerCopilotWaitlist` table without creating or deleting it. It defines the HTTP API, double-opt-in Lambdas, the independently disabled contact Lambda, a short-lived content-free contact-deduplication table, a retained token table, SES domain identity/DKIM, EventBridge delivery-event handling, explicit least-privilege roles, TTL cleanup, alarms and retained data safeguards. The broader undeployed HMAC/unsubscribe/optional-storage design in `infrastructure/template.yaml` remains separate.

Deployment is documented in [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md). The consolidated [operations and troubleshooting runbook](./docs/launch/operations-and-troubleshooting-runbook.md) joins safe deployment, rollback and both-journey incident response, while the [release operations checklist](./docs/launch/release-operations-checklist.md) controls promotion and smoke evidence; the [22 July 2026 verification](./docs/launch/operations-runbook-verification-2026-07-22.md) records its redacted command dry run and tabletop. The [registration state machine](./docs/launch/waitlist-registration-state-machine.md) defines the neutral waitlist contract, the [confirmation and resend guide](./docs/launch/waitlist-confirmation-resend.md) defines token recovery, the [contact API contract](./docs/launch/contact-api-contract.md) defines the content-free private-recipient boundary, the [browser/API security policy](./docs/launch/browser-api-security-policy.md) defines CORS, CSP, headers and token handling, the [release security gates](./docs/launch/release-security-gates.md) define full-history secret, dependency, static and artifact checks, and the [launch monitoring guide](./docs/launch/launch-monitoring-and-alarms.md) defines actionable alarms, dashboard, redacted evidence and cost checks. The [analytics architecture decision](./docs/launch/analytics-monitoring-architecture-decision.md), [privacy-focused reporting guide](./docs/launch/privacy-focused-analytics-and-reporting.md) and [pre-deployment verification](./docs/launch/monitoring-verification-2026-07-22.md) define and verify the disabled-by-default first-party event boundary and founder reporting. The [SES bounce and complaint runbook](./docs/launch/ses-bounce-complaint-runbook.md) defines terminal suppression, monitoring and controlled simulator tests. The [22 July 2026 SES production verification](./docs/launch/ses-production-verification-2026-07-22.md) records the identity, DKIM, quota, event and IAM baseline; the [redacted SES bounce and complaint verification](./docs/launch/ses-bounce-complaint-verification-2026-07-22.md) records the deployed simulator results. Broader email-domain work, costs and data operations remain documented in [infrastructure/README.md](./infrastructure/README.md) and [infrastructure/docs/data-operations.md](./infrastructure/docs/data-operations.md).

## Public content and screenshots

Product images live in `public/screenshots`. The included WebP files are privacy-safe crops from sanitised demo recordings and exclude user/account information. Follow [SCREENSHOT_GUIDE.md](./SCREENSHOT_GUIDE.md) before replacing them. The website contains no testimonial or social-profile content because neither has been verified.

The UK labour-market figures are maintained in `src/app/content/labour-market-content.ts`. Review instructions, current values and official ONS sources are recorded in [LABOUR_MARKET_DATA.md](./LABOUR_MARKET_DATA.md). Check for a newer release immediately before deployment; if deployment is on or after 21 July 2026, check the scheduled July release first.

The landing page and dedicated statement describe accessibility as ongoing work, not achieved conformance. Follow [ACCESSIBILITY_TESTING.md](./ACCESSIBILITY_TESTING.md) for automated, keyboard, screen-reader, contrast, zoom and reduced-motion testing.

## Owner decisions still required

- Separate development/production stack ownership and final production naming.
- Final main-application URLs and complete landing runtime URL configuration.
- Final staffing rota and escalation cover for alarm response outside active release windows.
- SES simulator evidence, permitted-recipient development tests and real end-to-end confirmation and contact-delivery tests.
- Final legal entity, privacy contact, lawful bases, retention periods, processors and legal approval. Legal drafts must receive owner/legal review before production publication.
- Whether optional contact-record storage and acknowledgement email should be enabled.
- Production abuse controls and alert thresholds after traffic is understood.
- Automated and assistive-technology accessibility evidence, a final ONS data check and launch approval.
