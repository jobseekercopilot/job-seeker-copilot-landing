# Job Seeker Copilot landing page

Standalone public landing page for Job Seeker Copilot. This Angular application is intentionally separate from `../job-seeker-copilot-client`: it has its own dependencies, build, runtime configuration and future deployment stack. It copies approved brand assets and screenshots, but has no runtime dependency on the main client.

No AWS account, live API, database, domain or production mailbox is configured, and no infrastructure has been deployed.

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
- `ENABLE_LIVE_SUBMISSIONS` must remain `false` until the waitlist API has passed a real persistence test.
- `WAITLIST_API_URL`, `WAITLIST_CONFIRMATION_API_URL`, `WAITLIST_RESEND_API_URL`, `WAITLIST_UNSUBSCRIBE_API_URL` and `CONTACT_API_URL` are full public route URLs.
- main-application, registration, sign-in, pricing, legal and support URLs are separately configurable because the final domain layout is undecided.
- anti-bot fields reserve public provider configuration only. The backend controls remain independent.

If live submissions are disabled in a production config, buttons are disabled and a neutral unavailable message is shown. The development-only explanatory message is not shown in production.

## Form contracts

Every API returns JSON in this shape:

```json
{"success":true,"code":"WAITLIST_CREATED","message":"Your email has been saved to the waitlist."}
```

The production `POST /waitlist` contract reports success only after DynamoDB confirms a conditional write. Duplicate email keys return HTTP 409 and are never overwritten. The dedicated implementation and deployment guide are in [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md). The separate contact API design uses a fixed verified sender and the visitor address only as `Reply-To`.

The waitlist form retains a hidden honeypot as a weak client-side automation signal. API Gateway throttling, Lambda validation and the DynamoDB condition are authoritative. See [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md) for deployment details and `infrastructure/README.md` for future contact, email-confirmation and WAF/CAPTCHA work.

## AWS Amplify Hosting preparation

`amplify.yml` uses the lock file (`npm ci`), generates public runtime configuration, runs the production build, publishes the verified browser output directory and caches `node_modules`.

When an Amplify app is created later:

1. add only the public variables described above;
2. add an SPA rewrite from `/<*>` to `/index.html` with HTTP 200 so `/privacy`, `/terms`, `/contact`, `/waitlist/confirm` and `/waitlist/unsubscribe` survive browser refreshes;
3. set exact API CORS origins to the final Amplify/custom domain;
4. inspect the built `config/app-config.json` and bundles to confirm there are no localhost URLs, private mailboxes or secrets;
5. keep live submission disabled until the API, CORS and DynamoDB persistence path pass an end-to-end test.

`amplify.yml` does not assume an Amplify application or AWS account already exists.

## Serverless infrastructure

The production waitlist stack in `infrastructure/waitlist-backend/` uses AWS SAM and references the existing `JobSeekerCopilotWaitlist` table without creating or deleting it. It defines an HTTP API, Python Lambda, explicit least-privilege execution role and retained logs. The broader undeployed design in `infrastructure/template.yaml` remains separate for future contact and email-confirmation work.

Production waitlist deployment is documented in [infrastructure/waitlist-backend/README.md](./infrastructure/waitlist-backend/README.md). Broader email-domain work, contact APIs, costs and data operations remain documented in [infrastructure/README.md](./infrastructure/README.md) and [infrastructure/docs/data-operations.md](./infrastructure/docs/data-operations.md).

## Public content and screenshots

Product images live in `public/screenshots`. The included WebP files are privacy-safe crops from sanitised demo recordings and exclude user/account information. Follow [SCREENSHOT_GUIDE.md](./SCREENSHOT_GUIDE.md) before replacing them. The website contains no testimonial or social-profile content because neither has been verified.

The UK labour-market figures are maintained in `src/app/content/labour-market-content.ts`. Review instructions, current values and official ONS sources are recorded in [LABOUR_MARKET_DATA.md](./LABOUR_MARKET_DATA.md). Check for a newer release immediately before deployment; if deployment is on or after 21 July 2026, check the scheduled July release first.

The landing page and dedicated statement describe accessibility as ongoing work, not achieved conformance. Follow [ACCESSIBILITY_TESTING.md](./ACCESSIBILITY_TESTING.md) for automated, keyboard, screen-reader, contrast, zoom and reduced-motion testing.

## Owner decisions still required

- AWS account, regions, stack names and separate test/production environments.
- Final domains and all runtime URLs.
- Verified SES identities, monitored sender/reply-to/support/contact-recipient addresses, production SES access and bounce/complaint handling.
- Final legal entity, privacy contact, lawful bases, retention periods, processors and legal approval. Legal drafts must receive owner/legal review before production publication.
- Whether optional contact-record storage and acknowledgement email should be enabled.
- Production abuse controls and alert thresholds after traffic is understood.
- Automated and assistive-technology accessibility evidence, a final ONS data check and launch approval.
