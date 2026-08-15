# Landing release artifact and stack-output contract

The central infrastructure repository owns AWS accounts, Amplify/CloudFront,
DNS, certificates, CloudFormation change sets, environment approvals and
deployment. This repository supplies reviewed static files and SAM templates;
it does not authorise or apply a production change from `develop`.

## Branch and artifact boundary

- Pull requests and `develop` run the complete build, test, SAM validation and
  security checks only. They never publish or apply infrastructure.
- `amplify.yml` fails before dependency installation unless `AWS_BRANCH=main`
  and the production environment explicitly supplies
  `AMPLIFY_RELEASE_AUTHORISED=true`, so a stale external Amplify connection or
  an unapproved main update cannot publish a release.
- A reviewed merge to protected `main` is the only landing release candidate.
  Central release orchestration records its Git SHA and environment approval.
- The static artifact is exactly
  `dist/job-seeker-copilot-landing/browser` after `npm run build`. Hashed bundles,
  prerendered routes, CSP and generated SEO files are one indivisible artifact;
  they must not be rebuilt or edited during promotion.

The build generates `config/app-config.json` before compiling. That file is
public, contains no secret and is part of the immutable artifact. Hosting must
serve it with `Cache-Control: no-store, max-age=0`; hashed assets may use
long-lived immutable caching.

## Public runtime configuration

Production public-beta generation is allowed only for `AWS_BRANCH=main`,
`AMPLIFY_RELEASE_AUTHORISED=true`, the canonical
`https://www.jobseekercopilot.com` origin, one approved HTTPS app origin and
complete reviewed legal configuration. Required legal configuration
includes the controller/trading identity, address, privacy/support contacts,
ICO status, policy version/effective date, exact retention values, seller form
(`SOLE_TRADER` or `LIMITED_COMPANY`), explicit tax status and the fixed UK-adult
minimum age of 18. `LEGAL_VERSION` must match the version served by the
application's registration-requirements endpoint and the Payment Service's
server-owned consumer terms version. Missing identity, tax or version alignment
keeps public beta disabled and must never publish placeholder seller details.

`PUBLIC_BETA_ENABLED`, live submissions, analytics and search indexing are
independent fail-closed switches. Enabling one must not imply another. App URLs
come from central infrastructure outputs. Missing, cross-origin or query-bearing
account URLs keep public-beta account links disabled.

## SAM input and output boundary

`infrastructure/waitlist-backend/template.yaml` is the current landing API
design. `infrastructure/template.yaml` is a separate reference design and must
not be applied as a second owner of the same resources. Central infrastructure
selects one reviewed template, creates and reviews the CloudFormation change
set, then supplies these outputs to the frontend build:

| SAM output | Frontend variable |
|---|---|
| `SubscribeEndpoint` | `WAITLIST_API_URL` |
| `ConfirmationEndpoint` | `WAITLIST_CONFIRMATION_API_URL` |
| `ResendEndpoint` | `WAITLIST_RESEND_API_URL` |
| `ContactEndpoint` | `CONTACT_API_URL` |
| `AnalyticsEndpoint` | `ANALYTICS_ENDPOINT_URL` |

The deployed template has no unsubscribe output, so
`WAITLIST_UNSUBSCRIBE_API_URL` remains blank until an owner-reviewed route exists.
Resource names, Lambda names, table names, topic ARNs, SES identity/DKIM records,
alarm state and dashboard name are operational outputs, not browser values.

All backend enablement parameters remain false until their separate SES, CORS,
privacy, abuse-control and smoke-test gates pass. A successful template build or
landing publication alone must never enable submissions, analytics, email or
public beta.

## Release evidence and rollback

Central release orchestration retains the source SHA, static-artifact checksum,
runtime-config checksum, selected SAM-template checksum, change-set review,
test/security evidence and production approval. Rollback restores the previous
approved static artifact and CloudFormation state; it does not rebuild an old
commit or infer endpoint values from resource names.
