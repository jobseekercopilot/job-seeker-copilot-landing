# Waitlist and contact backend

This isolated AWS SAM stack updates the existing `job-seeker-copilot-waitlist` stack in `eu-west-2`. It uses API Gateway HTTP API, Python Lambda, Amazon SES v2, EventBridge and DynamoDB for double opt in, plus contact delivery with content-free duplicate protection.

## Safety boundary

`JobSeekerCopilotWaitlist` is an existing external table passed in as a parameter. It is deliberately **not** declared as a CloudFormation table resource, so this stack cannot replace or delete it. A narrowly scoped, enable-only custom resource verifies the `pendingExpiresAt` TTL attribute and enables point-in-time recovery (PITR) and deletion protection. It never disables a safeguard and does nothing during stack deletion.

The new `JobSeekerCopilotWaitlistTokens` table is managed by this stack with:

- `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`;
- on-demand capacity, server-side encryption, point-in-time recovery and deletion protection;
- a String partition key named `tokenHash`;
- DynamoDB TTL on `deleteAfter`.

No handler calls `Scan`. Confirmation performs a consistent `GetItem` using the SHA-256 token hash, then atomically updates the subscriber and token through `TransactWriteItems`.

The contact Lambda does not store enquiries. It may only conditionally put and
delete an opaque HMAC fingerprint in the dedicated TTL deduplication table; it
cannot read or scan that table. The record contains only the fingerprint,
expiry and Lambda request owner—never the address, name, subject, message or IP.
Its IAM policy can send only from the configured contact sender, only to the
single configured company recipient, and only through the existing SES
configuration set. Contact submission is independently disabled by default.

## Data and lifecycle

A new subscriber record has `status=PENDING`, `source=landing-page`, `consentVersion`, timestamps, the current token hash, token expiry, send controls and `pendingExpiresAt`. The raw 256-bit token exists only in process memory, the confirmation URL and the email.

Creation of the subscriber and hashed-token records uses one conditional
`TransactWriteItems` call. All three transaction-capable Lambda roles grant the
explicit `dynamodb:TransactWriteItems` action against only the external
waitlist table and retained token table; none uses wildcard data permissions.

Confirmation performs one transaction which:

1. conditionally changes the current PENDING subscriber to `CONFIRMED`;
2. sets `confirmedAt` and `updatedAt`;
3. removes the pending TTL, active-token fields and resend/send-control metadata;
4. changes the token record from `ACTIVE` to a short-lived `USED` tombstone and removes its email.

The old token is deleted when a resend rotates it. Confirmed records have no `pendingExpiresAt`, so pending cleanup cannot delete them. Default retention is:

- confirmation token validity: 48 hours;
- unconfirmed PENDING record: 30 days;
- used-token tombstone: 7 days;
- confirmed record: until unsubscribe, approved deletion, or end of purpose;
- bounce/complaint suppression: only as long as operationally and legally necessary.

An existing `UNSUBSCRIBED` record is never silently reactivated. A future
re-subscription feature must collect a fresh explicit request, issue a new
token and reconfirm before changing that state. `BOUNCED` and `COMPLAINED`
records are likewise never reactivated by these endpoints. The public
registration response is deliberately the same for new, pending, confirmed,
unsubscribed, bounced and complained records; internal state is not disclosed.

DynamoDB TTL deletion is asynchronous and can occur several days after expiry.

Both tables are encrypted at rest. The external subscriber table uses
DynamoDB's default AWS-owned key; the retained token table declares SSE in
CloudFormation. PITR is enabled on both tables and provides a rolling recovery
window reported by DynamoDB. A PITR restore always creates a new table: never
overwrite, delete, or cut traffic to the protected source table as part of a
restore test.

Deletion protection is enabled on both tables. The token table additionally
has `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`; the subscriber
table is not owned by the stack at all. A stack delete therefore leaves both
tables and their backups in place. Rollback cannot disable TTL, PITR, or
deletion protection because the custom resource's update path is enable-only
and its delete path is a no-op. See
`../../docs/launch/waitlist-data-lifecycle.md` for the lifecycle, backup/restore,
and no-delete runbooks.

Resend rotation conditionally replaces the subscriber's current token hash,
deletes the superseded token and creates the new hashed token in one
transaction. A concurrent loser returns the same neutral response. Configured
per-record cooldown and rolling-window limits apply before any write or SES
send. If SES rejects a rotated-token delivery, the record remains PENDING and
recoverable; the failed-attempt cooldown is cleared without restoring or
exposing the superseded token.

## API routes

All JSON API calls use exact-origin CORS and return typed, public-safe responses.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/waitlist` | Create PENDING record and send confirmation |
| `POST` | `/waitlist/confirm` | Consume `{ "token": "..." }` once |
| `POST` | `/waitlist/resend` | Accept `{ "email": "..." }` with neutral response |
| `POST` | `/contact` | Validate and deliver one company enquiry when independently enabled |
| `OPTIONS` | each route | Exact-origin preflight |

Development allows only `https://develop.d3gd9ezfa3aujn.amplifyapp.com` and
the canonical `https://www.jobseekercopilot.com` host. Production allows only
the canonical `www` host. The apex redirects to `www` before the application
runs. The deleted feature host and lookalike subdomains are denied. There is no
wildcard origin and no public subscriber-list endpoint.

Confirmation links have this format:

```text
${PUBLIC_SITE_URL}/waitlist/confirm?token=<url-safe-random-token>
```

Angular removes the token from the visible URL before processing and POSTs it to the configured API.

## Email

SES API v2 sends separate UTF-8 plain-text and HTML bodies through `JobSeekerCopilotWaitlistEmails`.

Subject:

```text
Confirm your Job Seeker Copilot waitlist email
```

The message identifies Job Seeker Copilot, explains why it was sent, includes the prominent link and fallback URL, states the configured expiry, links to Privacy and Contact, says no action is required for an unsolicited request, and describes the early-access offer as eligibility after confirmation rather than an awarded credit.

The stack creates the `jobseekercopilot.com` SES domain identity and three Easy DKIM CNAME records in the existing Route 53 hosted zone. It creates an EventBridge configuration-set destination for sends, rejects, hard bounces, complaints, deliveries, rendering failures and delivery delays. A Lambda validates the source, matching event schemas, exact configuration set, exact single message-purpose tag and exact single destination before it conditionally records a result. Permanent bounce and complaint events set terminal suppression states; non-permanent bounces record an issue without suppressing. Contact, unknown-purpose and malformed events are ignored before any subscriber-table access, and recipient addresses are never logged. The [bounce and complaint runbook](../../docs/launch/ses-bounce-complaint-runbook.md) defines precedence, monitoring, recovery and mailbox-simulator verification.

The waitlist sending roles grant `ses:SendEmail` only against the configured domain identity and the exact waitlist configuration set, constrained to the configured sender address. The contact role names both that domain identity and the separately verified exact company sender identity because SES may authorize the more-specific identity; it still constrains From, the configuration set and the single private company recipient exactly. The visitor address can appear only as Reply-To.

Contact email uses an internally prefixed subject, separate UTF-8 text/HTML
bodies, and `message-purpose=contact-enquiry`. Name, subject and message values
are bounded; header controls are rejected; HTML is escaped; sender, recipient,
configuration set and template are never browser-controlled. See
`../../docs/launch/contact-api-contract.md` for the exact request, response,
failure and deployment contract.

The contact route also applies a conservative route override, checks the hidden
honeypot and browser start time on the server, and conditionally reserves the
HMAC fingerprint before SES. A concurrent repeat gets the same public accepted
response without another email. A deduplication dependency failure stops before
SES; an SES failure conditionally releases that request's reservation so a safe
retry can proceed. See `../../docs/launch/contact-abuse-protection.md` for the
abuse model, privacy boundary, metrics, tuning and future challenge options.

All deployed API responses include fixed transport, framing, MIME, referrer,
permissions and resource-policy headers as well as `no-store`. Development CORS
reflects only the exact develop and canonical origins; production reflects only
canonical `www`. Preflight allows `POST,OPTIONS` and `Content-Type` without
credentials or wildcards. See the
[browser and API security policy](../../docs/launch/browser-api-security-policy.md)
for hosting CSP, token-history removal, request limits and deployment checks.

## SES deployment modes

### Local/test

Automated tests mock SES and DynamoDB. They never send email. Use fixture tokens only.

### AWS staging while sandboxed

SES sandbox status is regional. In the sandbox, email can be sent only to verified recipient identities/domains or the SES mailbox simulator, with reduced quotas. A verified sending domain does not remove recipient restrictions.

Do not describe public confirmation delivery as operational while `ProductionAccessEnabled` is false. Testing with a real inbox requires that recipient to be verified in `eu-west-2`.

### Production

Before public signup is enabled:

1. confirm the SES domain identity and DKIM status are `SUCCESS`;
2. obtain SES production access in `eu-west-2`;
3. deploy with `EnvironmentName=production` and `PublicSiteUrl=https://www.jobseekercopilot.com`;
4. complete a real submit, receive, confirm, repeat-token, expiry and resend test;
5. confirm bounce/complaint processing and alarms;
6. enable the Angular live-submission runtime values.

Double opt-in is never bypassed in any deployment mode.

## Configuration

Lambda environment variables are generated from SAM parameters; no endpoint or Amplify host is hardcoded in source:

- `SES_REGION`
- `WAITLIST_SENDER_EMAIL`
- `PUBLIC_SITE_URL`
- `SES_CONFIGURATION_SET`
- `CONFIRMATION_TOKEN_TTL_SECONDS`
- `CONFIRMATION_RESEND_COOLDOWN_SECONDS`
- `MAX_CONFIRMATION_SENDS`
- `CONFIRMATION_SEND_WINDOW_SECONDS`
- `PENDING_RETENTION_SECONDS`
- `USED_TOKEN_RETENTION_SECONDS`
- `CONSENT_VERSION`
- `ENABLE_CONTACT_SUBMISSIONS`
- `CONTACT_SENDER_EMAIL`
- `CONTACT_RECIPIENT_EMAIL`
- `CONTACT_MESSAGE_MAX_LENGTH`
- `CONTACT_DEDUPE_TABLE_NAME`
- `CONTACT_DEDUPE_PEPPER`
- `CONTACT_DEDUPE_TTL_SECONDS`
- `CONTACT_MINIMUM_FORM_COMPLETION_MS`

Defaults are visible in `template.yaml` and can be changed through
`--parameter-overrides`. `ContactRecipientEmail` and `ContactDedupePepper` are
required NoEcho CloudFormation parameters and are never outputs or browser
values. Generate the pepper in an approved deployment workflow; never commit,
print or reuse it across environments.

## Validate and create a reviewable change set

```bash
python3 -m unittest discover -s infrastructure/waitlist-backend/tests -v
sam validate --lint --region eu-west-2 --template-file infrastructure/waitlist-backend/template.yaml
sam build --template-file infrastructure/waitlist-backend/template.yaml

sam deploy \
  --stack-name job-seeker-copilot-waitlist \
  --region eu-west-2 \
  --profile jobseekercopilot-deploy \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    EnvironmentName=development \
    WaitlistTableName=JobSeekerCopilotWaitlist \
    DevelopmentOrigin=https://develop.d3gd9ezfa3aujn.amplifyapp.com \
    AdditionalDevelopmentOrigin=https://www.jobseekercopilot.com \
    ProductionOrigin=https://www.jobseekercopilot.com \
    PublicSiteUrl=https://www.jobseekercopilot.com \
    EnableContactSubmissions=false \
    ContactSenderEmail=hello@jobseekercopilot.com \
    ContactRecipientEmail=<approved-private-company-inbox> \
    ContactDedupePepper=<strong-random-secret> \
  --no-execute-changeset
```

Inspect the change set before execution. Stop if it proposes replacement or
deletion of the subscriber, token or contact-deduplication table; disables a
safeguard; adds wildcard IAM/CORS; exposes a secret/token; stores enquiry
content; or adds a subscriber-list route.

After a safe deployment, use stack outputs for the Angular hosted runtime configuration:

```text
ENABLE_LIVE_SUBMISSIONS=true
WAITLIST_API_URL=<SubscribeEndpoint>
WAITLIST_CONFIRMATION_API_URL=<ConfirmationEndpoint>
WAITLIST_RESEND_API_URL=<ResendEndpoint>
CONTACT_API_URL=<ContactEndpoint>
```

Keep both Angular live submissions and `EnableContactSubmissions` disabled until
permitted-recipient delivery, Reply-To, CORS and monitoring tests are complete.
Publishing the contact URL while both switches remain false is safe: POST
returns the controlled unavailable response and sends no email.

## Monitoring and later communications

The stack creates alarms for API 5xx, Lambda errors, DynamoDB throttling,
confirmation-send failures, bounces, complaints, unusual resend/invalid-token
volume, and contact validation, throttle, duplicate, deduplication-dependency
and SES failures. Contact metrics contain counts only. API access logs omit
bodies and IPs. Alarm actions are intentionally unset until the owner chooses
an operational notification destination.

No promotional or launch email exists in this stack. Any future campaign implementation must select only records whose current status is exactly `CONFIRMED`; it must exclude `PENDING`, `UNSUBSCRIBED`, `BOUNCED` and `COMPLAINED` records.
