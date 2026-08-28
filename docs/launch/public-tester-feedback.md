# Public-tester feedback store and partner triage

## Status and boundary

This is an owner-reviewed, fail-closed path for anonymous feedback from the
product UI. It deliberately does not pass the browser session to the
cross-origin API. `EnableFeedbackSubmissions` defaults to `false`,
`FeedbackClientOrigin` defaults to blank, and the client endpoint must remain
unset until deployment approval. This change does not enable or deploy the
route.

The browser never receives an AWS credential, GitHub token, repository choice,
label choice or admin API. The feedback Lambda has no SES or GitHub permission.
An authenticated partner later uses local AWS credentials to read the private
table and local `gh` credentials to create an issue in the fixed private
`jobseekercopilot/infrastructure` repository.

No screenshots, attachments, console logs, network traces, cookies, session
values, email address, CV or cover-letter content are accepted. The form must
tell testers not to type personal, account, payment or document information.
Server-side pattern checks reject obvious email addresses, bearer/JWT values,
cookie assignments and payment-card-like numbers, but those checks supplement
rather than replace the warning and partner review.

## Browser contract

`POST /feedback` accepts `Content-Type: application/json` from exactly the
configured `FEEDBACK_CLIENT_ORIGIN`. CORS allows `Content-Type` only and does
not allow credentials. The UTF-8 request body must be no more than 4,096 bytes
and must contain exactly these fields:

| Field | Contract |
| --- | --- |
| `category` | `BROKEN`, `CONFUSING`, `SUGGESTION` or `OTHER` |
| `title` | single line, 5–120 Unicode code points |
| `description` | 10–2,000 code points |
| `reproductionSteps` | optional value represented as a string, 0–1,200 code points |
| `pagePath` | pathname only, 1–256 code points; no query, fragment or backslash |
| `appBuild` | client-asserted runtime release ID matching `[A-Za-z0-9][A-Za-z0-9._-]{0,63}`; an investigation hint, not trusted provenance |
| `diagnosticsConsent` | Boolean |
| `diagnostics` | `null`, or with consent the exact coarse object below |
| `idempotencyKey` | canonical lowercase UUID v4 generated per opened form |
| `website` | empty honeypot string |
| `formStartedAt` | browser epoch milliseconds used only for timing checks; never stored |

The optional diagnostics object is exact and bounded:

```json
{
  "browserFamily": "Chrome | Edge | Firefox | Safari | Other",
  "browserMajor": 1,
  "deviceClass": "mobile | tablet | desktop"
}
```

The app build comes from the client SSR server's validated runtime environment,
not package version `0.0.0` or a browser-generated value. When consent is
false, diagnostics must be `null`. Raw user-agent, viewport,
IP, referrer, query string, fragment, storage and browser logs are not stored.
The server generates the UTC submission timestamp, `NEW` status, 90-day default
TTL and a random `FB-XXXXXXXXXXXXXXXX` reference.

Successful new and duplicate submissions use the same neutral `202` contract:

```json
{
  "success": true,
  "code": "FEEDBACK_ACCEPTED",
  "message": "Thank you — your feedback has been saved for review.",
  "reference": "FB-A1B2C3D4E5F60708"
}
```

Validation, disabled-route and temporary-storage failures return typed public
messages. Responses and logs never echo submitted content. API access logs
contain request ID, route, status, response length and integration category
only.

## Storage, abuse and retention

`FeedbackTable` is a distinct on-demand DynamoDB table with KMS server-side
encryption, PITR, deletion protection, retained stack lifecycle and TTL on
`deleteAfter`. `status-submittedAt-index` supports bounded operator reads of
`NEW` items. Report, UUID reservation and HMAC content reservation are written
atomically; reservation items contain only their type, report reference and
TTL.

The public route also has a one-request/second, burst-three API Gateway route
limit, exact-origin enforcement, a hidden honeypot, minimum completion time,
24-hour maximum form age and exact duplicate suppression. CORS and browser
timing are not authentication. If varied automated abuse appears, keep the
route disabled until an owner-reviewed per-source challenge or edge control is
available; never add IPs or raw user-agent values to report records or metrics.

TTL is asynchronous and may delete expired items days after `deleteAfter`.
DynamoDB PITR can retain previously live values within its rolling recovery
window. A privacy deletion procedure must account for live records, restored
tables, terminal exports and any issue created from the report.

## Partner CLI

The operator needs an independently attributable local AWS profile permitted
to `dynamodb:Query` on the feedback status index and `dynamodb:GetItem` /
`dynamodb:UpdateItem` on the exact table. It also needs local `gh auth` access
to the private infrastructure repository. Do not export either credential to a
browser or place it in client runtime configuration.

Preview is the default and performs no DynamoDB update or GitHub write:

```bash
python3 infrastructure/waitlist-backend/admin/feedback_triage.py \
  --profile <partner-profile> \
  --region eu-west-2 \
  --table-name <FeedbackTableName>
```

After checking that the preview contains no private data, apply exactly one
reference:

```bash
python3 infrastructure/waitlist-backend/admin/feedback_triage.py \
  --profile <partner-profile> \
  --region eu-west-2 \
  --table-name <FeedbackTableName> \
  --reference FB-A1B2C3D4E5F60708 \
  --apply
```

`--apply` cannot run without one reference. The CLI conditionally claims the
`NEW` report as `TRIAGING`, creates an issue with fixed `public-tester` and
`feedback` labels, validates that `gh`
returned an issue URL for the exact private infrastructure repository, then
stores that URL and `TRIAGED` status. User text is rendered as literal content;
mentions and title cross-references are neutralised. It uses a mode-0600
temporary body file and invokes `gh` without a shell or token argument.
It does not infer or apply `bug`; a partner adds that label only after human
triage supports the classification.

If the local `gh` process cannot start, the claim is conditionally returned to
`NEW`. A timeout, non-zero remote result or missing approved URL is an ambiguous
remote outcome, so the record remains `TRIAGING`; search the fixed repository
for its feedback reference and reconcile it before any retry. If an issue URL
is returned but the final DynamoDB update fails, the record likewise remains
`TRIAGING` and the CLI prints the validated URL. Do not rerun issue creation for
either state and create a duplicate.

## Verification

All tests mock DynamoDB and `gh`; they make no AWS or GitHub calls:

```bash
python3 -m unittest infrastructure/waitlist-backend/tests/test_feedback.py -v
python3 -m unittest discover -s infrastructure/waitlist-backend/tests -v
sam validate --lint --region eu-west-2 \
  --template-file infrastructure/waitlist-backend/template.yaml
```

Before enablement, review the SAM change set and stop if it adds wildcard IAM
or CORS, SES/GitHub access to the feedback Lambda, a browser credential, body
logging, a public read/admin route, a missing TTL/encryption safeguard, or a
replacement/deletion of an existing table.
