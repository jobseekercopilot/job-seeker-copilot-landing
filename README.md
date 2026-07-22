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
- `ENABLE_LIVE_SUBMISSIONS` must remain `false` until SES identity/DKIM verification and a permitted-recipient end-to-end confirmation test have passed.
- `WAITLIST_API_URL`, `WAITLIST_CONFIRMATION_API_URL`, `WAITLIST_RESEND_API_URL`, `WAITLIST_UNSUBSCRIBE_API_URL` and `CONTACT_API_URL` are full public route URLs. A production build with live submissions enabled fails before writing runtime configuration unless the waitlist submit, confirmation, resend and contact routes are valid absolute HTTPS URLs.
- main-application, registration, sign-in, pricing, legal and support URLs are separately configurable because the final domain layout is undecided.
- anti-bot fields reserve public provider configuration only. The backend controls remain independent.

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
public company address `hello@jobseekercopilot.com`; no private recipient is
present in browser configuration. The full contract is in
[docs/launch/contact-frontend-contract.md](./docs/launch/contact-frontend-contract.md).

## AWS Amplify Hosting

`amplify.yml` uses the lock file (`npm ci`), generates public runtime configuration, runs the production build, publishes the verified browser output directory and caches `node_modules`.

Before promoting the existing Amplify app to a verified production release:

1. add only the public variables described above;
2. add an SPA rewrite from `/<*>` to `/index.html` with HTTP 200 so `/privacy`, `/terms`, `/contact`, `/waitlist/confirm`, `/waitlist/resend` and `/waitlist/unsubscribe` survive browser refreshes;
3. set exact API CORS origins to the final Amplify/custom domain;
4. inspect the built `config/app-config.json` and bundles to confirm there are no localhost URLs, private mailboxes or secrets;
5. keep live submission disabled until SES, API, CORS, email receipt and single-use confirmation pass an end-to-end test.

`amplify.yml` remains portable and does not hard-code an Amplify application or AWS account.

## Serverless infrastructure

The deployed landing stack in `infrastructure/waitlist-backend/` uses AWS SAM and references the existing `JobSeekerCopilotWaitlist` table without creating or deleting it. It defines the HTTP API, double-opt-in Lambdas, the independently disabled contact Lambda, a short-lived content-free contact-deduplication table, a retained token table, SES domain identity/DKIM, EventBridge delivery-event handling, explicit least-privilege roles, TTL cleanup, alarms and retained data safeguards. The broader undeployed HMAC/unsubscribe/optional-storage design in `infrastructure/template.yaml` remains separate.

Deployment is documented in [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md). The [registration state machine](./docs/launch/waitlist-registration-state-machine.md) defines the neutral waitlist contract, the [confirmation and resend guide](./docs/launch/waitlist-confirmation-resend.md) defines token recovery, the [contact API contract](./docs/launch/contact-api-contract.md) defines the content-free private-recipient boundary, the [browser/API security policy](./docs/launch/browser-api-security-policy.md) defines CORS, CSP, headers and token handling, the [release security gates](./docs/launch/release-security-gates.md) define full-history secret, dependency, static and artifact checks, the [launch monitoring guide](./docs/launch/launch-monitoring-and-alarms.md) defines actionable alarms, dashboard, redacted evidence and cost checks, and the [SES bounce and complaint runbook](./docs/launch/ses-bounce-complaint-runbook.md) defines terminal suppression, monitoring and controlled simulator tests. The [22 July 2026 SES production verification](./docs/launch/ses-production-verification-2026-07-22.md) records the identity, DKIM, quota, event and IAM baseline; the [redacted SES bounce and complaint verification](./docs/launch/ses-bounce-complaint-verification-2026-07-22.md) records the deployed simulator results. Broader email-domain work, costs and data operations remain documented in [infrastructure/README.md](./infrastructure/README.md) and [infrastructure/docs/data-operations.md](./infrastructure/docs/data-operations.md).

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
