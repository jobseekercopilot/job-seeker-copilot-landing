# Landing launch current-state audit

Audit date: 22 July 2026

Region: `eu-west-2`

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [LANDING-01 #9](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/9)

## Outcome

The landing site is publicly hosted, and the deployed waiting-list backend and
Amazon SES account are active. The site is **not ready for production launch**.
The public hostname cannot call the waiting-list API because its exact origin is
not in the deployed CORS allowlist. Confirmation links target a deleted feature
host, the browser has no confirmation or resend endpoint configuration, and no
contact endpoint is deployed.

This audit was read-only for AWS data and public endpoints. It did not read,
export, change or delete any subscriber record and did not send an email.

## Source and delivery state

| Area | Verified state | Consequence |
| --- | --- | --- |
| `develop` | `80f8b5f` on `origin/develop` | Current implementation baseline. |
| `main` | `590d999` on `origin/main` | Initial site only; 25 commits behind `develop`. |
| Open pull requests | None | No implementation is currently under review. |
| GitHub Actions | No workflow runs in this repository | There is no CI evidence or release gate. |
| Existing developer checkout | Six modified files on `feature/journey-so-far`; the remote branch has been deleted | Launch work must stay in a separate clean worktree and preserve those edits. |
| Amplify production branch | `develop` | The required `main` production model is not in place. |
| Amplify branches | `develop` and obsolete `feature/waitlist-double-opt-in`; no `main` | Production promotion cannot yet follow the requested release flow. |
| Custom domain | Apex and `www` are available and map to `develop`; apex redirects to `www` | Public traffic ends at `https://www.jobseekercopilot.com`. |
| Last hosted build | `develop` deployment succeeded on 15 July 2026 | Hosting is operational but stale relative to launch requirements. |

The private [Job Seeker Copilot project](https://github.com/users/jobseekercopilot/projects/1)
now contains epic #8 and focused child issues #9 through #27. All children are
native sub-issues. The project `Dependencies` field and native blocked-by links
record the execution chain. LANDING-01 is the only child in progress.

## Repository architecture

The repository contains one Angular 21 application and two SAM designs:

1. `infrastructure/waitlist-backend/template.yaml` is the source of the deployed
   double-opt-in waiting-list stack. It uses an external subscriber table, a
   stack-owned token table, API Gateway HTTP API, five Python 3.12 Lambdas, SES,
   EventBridge and CloudWatch alarms.
2. `infrastructure/template.yaml` defines a broader waiting-list, unsubscribe and
   contact service. Repository documentation identifies it as undeployed. Its
   contact handler and tests therefore do not describe a live contact journey.

The default `npm test` command runs the Angular tests and only
`infrastructure/waitlist-backend/tests`. The 18 tests under
`infrastructure/tests`, including contact tests, are not part of that default
command. Consolidation and CI coverage are required before release.

## Public frontend and runtime configuration

Amplify app `d3gd9ezfa3aujn` is connected to this repository. Its configured
public variables are only:

- `ENABLE_LIVE_SUBMISSIONS=true`;
- `WAITLIST_API_URL=https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/waitlist`.

The file currently served from both the production custom domain and the
`develop` Amplify hostname reports `environmentName=production` and live
submissions enabled. These required values are blank:

- `WAITLIST_CONFIRMATION_API_URL`;
- `WAITLIST_RESEND_API_URL`;
- `WAITLIST_UNSUBSCRIBE_API_URL`;
- `CONTACT_API_URL`;
- public website and main-application URLs.

The runtime JSON and HTML are served with a one-year shared-cache lifetime.
The sampled HTML response did not include Content-Security-Policy,
Strict-Transport-Security, frame protection, MIME-sniffing protection,
Referrer-Policy or Permissions-Policy headers. Header and cache policy work is
tracked by LANDING-SEC-01.

The prerendered HTML uses the checked-in development fallback and says the form
is disconnected, while the hydrated browser loads a production runtime file.
This mismatch needs browser-level validation as part of WAITLIST-01.

## Deployed API and CORS

API Gateway HTTP API `JobSeekerCopilotWaitlistApi` exposes:

- `POST` and `OPTIONS /waitlist`;
- `POST` and `OPTIONS /waitlist/confirm`;
- `POST` and `OPTIONS /waitlist/resend`.

There is no `/contact` route. The default stage auto-deploys, limits the API to
5 requests/second with burst 10, and limits resend to 1 request/second with
burst 3.

The deployed Lambda allowlist contains:

- `https://develop.d3gd9ezfa3aujn.amplifyapp.com`;
- `https://feature-waitlist-double-opt-in.d3gd9ezfa3aujn.amplifyapp.com`;
- `https://jobseekercopilot.com`.

Safe preflight checks proved:

| Origin | Result |
| --- | --- |
| `https://www.jobseekercopilot.com` | `403 ORIGIN_NOT_ALLOWED` |
| deleted feature origin | `204` and reflected as allowed |
| unrelated origin | `403 ORIGIN_NOT_ALLOWED` |

The apex host redirects visitors to `www`, so the currently deployed public
waiting-list form cannot complete a browser request. The obsolete feature
origin remains trusted. This is a P0 launch blocker.

## CloudFormation and Lambda

Stack `job-seeker-copilot-waitlist` is `UPDATE_COMPLETE`; drift has not been
checked. It is deployed with `EnvironmentName=development`. The configured
`PublicSiteUrl` is the deleted feature hostname, so newly generated confirmation
links do not point to a current development or production site.

The active Python 3.12 functions are:

- `JobSeekerCopilotWaitlist`;
- `JobSeekerCopilotWaitlistConfirm`;
- `JobSeekerCopilotWaitlistResend`;
- `JobSeekerCopilotWaitlistSesEvents`;
- `JobSeekerCopilotWaitlistTtlConfiguration`.

All five report successful last updates. Submit and resend use the verified
waitlist sender, configuration set and `eu-west-2`. X-Ray tracing is pass-through
and Lambda logs use text format with 30-day retention.

## DynamoDB

| Table | Ownership and lifecycle | Recovery/protection |
| --- | --- | --- |
| `JobSeekerCopilotWaitlist` | External to the stack; email is the partition key; `pendingExpiresAt` TTL enabled; three records reported by table metadata | PITR disabled; deletion protection disabled; AWS default encryption at rest applies |
| `JobSeekerCopilotWaitlistTokens` | Stack-owned; token hash is the partition key; `deleteAfter` TTL enabled; three records reported by table metadata | PITR enabled for 35 days; deletion protection disabled; SSE enabled |

No table scan or item read was performed. The deployed stack cannot replace or
delete the external subscriber table, but PITR and deletion protection gaps
remain for WAITLIST-04. Confirmed records must never retain the pending TTL.

## Amazon SES

The earlier sandbox restriction is resolved:

- production access and sending are enabled and healthy;
- quota is 50,000 messages per 24 hours and 14 messages per second;
- no messages had been sent in the sampled preceding 24 hours;
- `jobseekercopilot.com` is verified for sending;
- Easy DKIM is enabled and `SUCCESS` with RSA 2048;
- `hello@jobseekercopilot.com` is also a verified identity;
- configuration set `JobSeekerCopilotWaitlistEmails` is enabled;
- account/configuration-set suppression covers bounce and complaint;
- the EventBridge destination covers send, delivery, delivery delay, reject,
  rendering failure, bounce and complaint.

The deployed event handler updates waiting-list suppression/delivery state. A
contact-purpose route, tags and event behavior do not exist yet. Controlled SES
mailbox-simulator and company-inbox tests have not been run.

The connected Gmail account is personal and must not become application
configuration. A Google Workspace message addressed to the company address,
the SES identity and the repository's existing mailbox mapping support
`hello@jobseekercopilot.com` as the intended company inbox. CONTACT-04 must still
prove monitored delivery and reply behavior through private deployment
configuration.

## Monitoring

The stack has ten alarms for API 5xx, Lambda errors, DynamoDB throttling,
confirmation send failures, invalid tokens, resend volume, bounces and
complaints. All were `OK` during the audit. Every alarm has an empty alarm-action
list, so there is no notification destination. Contact monitoring does not
exist. OPS-01 must make the signals actionable or document an approved manual
monitoring process.

## Current validation baseline

| Check | Result |
| --- | --- |
| `npm ci` | Passed; 583 packages installed from the lock file |
| `npm run lint` | Passed |
| `npm run test:frontend` | Passed: 13 files, 50 tests |
| deployed waitlist Python tests | Passed: 18 tests |
| broader waitlist/contact Python tests | Passed when run explicitly: 18 tests |
| `npm run build` | Passed; 10 routes prerendered and verified |
| `npm run test:a11y` | Passed for 10 routes when run against the required local server |
| `npm audit --audit-level=high` | Failed policy baseline: one High and three Moderate findings |
| SAM build/validation | Not run: SAM CLI is not installed in the workspace |
| GitHub CI | Not available: no Actions runs/workflow evidence |

The npm High finding is in `fast-uri` and has an available fix. The three
Moderate findings flow through the Angular CLI/MCP/Hono dependency chain.
LANDING-SEC-02 owns remediation and the release gate.

## Launch blockers

### P0

1. Production `www` origin is rejected by the API while the deleted feature
   origin is allowed.
2. Confirmation emails target a deleted feature hostname.
3. Public confirmation and resend endpoint variables are blank.
4. No contact API, Lambda or recipient configuration is deployed.
5. Amplify serves `develop`; there is no `main` deployment branch and `main` is
   25 commits behind.
6. There is no GitHub CI and the current npm audit has an unresolved High
   dependency finding.
7. Required browser security headers are absent from the sampled public response.
8. No complete development or production E2E evidence exists for either journey.

### P1

1. Alarm actions are empty and there is no contact monitoring.
2. Subscriber-table PITR and deletion protection are disabled.
3. Two backend designs and two Python test suites can diverge.
4. The obsolete Amplify feature branch/origin has not been removed.
5. The runtime JSON and HTML shared-cache policy is one year, which complicates
   urgent configuration rollback.

## Recommended execution order

Proceed in the native dependency order recorded on the project:

`LANDING-01 → SES-01 → WAITLIST-01 → WAITLIST-02 → WAITLIST-03 → WAITLIST-04 → CONTACT-01 → CONTACT-02 → CONTACT-03 → CONTACT-04 → SES-02 → LANDING-SEC-01 → LANDING-SEC-02 → OPS-01 → OPS-02 → TEST-01 → TEST-02 → RELEASE-01 → RELEASE-02`

Only one child issue should be in progress at a time. Production promotion must
remain blocked until both controlled development E2E journeys and every security
gate pass.
