# Waitlist double opt-in backend

This isolated AWS SAM stack updates the existing `job-seeker-copilot-waitlist` stack in `eu-west-2`. It uses API Gateway HTTP API, Python Lambda, Amazon SES v2, EventBridge and DynamoDB.

## Safety boundary

`JobSeekerCopilotWaitlist` is an existing external table passed in as a parameter. It is deliberately **not** declared as a CloudFormation table resource, so this stack cannot replace or delete it. A narrowly scoped custom resource only enables the `pendingExpiresAt` TTL attribute and does nothing during stack deletion.

The new `JobSeekerCopilotWaitlistTokens` table is managed by this stack with:

- `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`;
- on-demand capacity, server-side encryption and point-in-time recovery;
- a String partition key named `tokenHash`;
- DynamoDB TTL on `deleteAfter`.

No handler calls `Scan`. Confirmation performs a consistent `GetItem` using the SHA-256 token hash, then atomically updates the subscriber and token through `TransactWriteItems`.

## Data and lifecycle

A new subscriber record has `status=PENDING`, `source=landing-page`, `consentVersion`, timestamps, the current token hash, token expiry, send controls and `pendingExpiresAt`. The raw 256-bit token exists only in process memory, the confirmation URL and the email.

Confirmation performs one transaction which:

1. conditionally changes the current PENDING subscriber to `CONFIRMED`;
2. sets `confirmedAt` and `updatedAt`;
3. removes the pending TTL and active-token fields;
4. changes the token record from `ACTIVE` to a short-lived `USED` tombstone and removes its email.

The old token is deleted when a resend rotates it. Confirmed records have no `pendingExpiresAt`, so pending cleanup cannot delete them. Default retention is:

- confirmation token validity: 48 hours;
- unconfirmed PENDING record: 30 days;
- used-token tombstone: 7 days;
- confirmed record: until unsubscribe, approved deletion, or end of purpose;
- bounce/complaint suppression: only as long as operationally and legally necessary.

An existing `UNSUBSCRIBED` record is never silently reactivated. `POST /waitlist` returns `WAITLIST_RESUBSCRIPTION_REQUIRED`; a future re-subscription feature must collect a fresh explicit request, issue a new token and reconfirm before changing that state. `BOUNCED` and `COMPLAINED` records are likewise never reactivated by these endpoints.

DynamoDB TTL deletion is asynchronous and can occur several days after expiry.

## API routes

All JSON API calls use exact-origin CORS and return typed, public-safe responses.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/waitlist` | Create PENDING record and send confirmation |
| `POST` | `/waitlist/confirm` | Consume `{ "token": "..." }` once |
| `POST` | `/waitlist/resend` | Accept `{ "email": "..." }` with neutral response |
| `OPTIONS` | each route | Exact-origin preflight |

Development allows only `https://develop.d3gd9ezfa3aujn.amplifyapp.com` and the temporary `https://feature-waitlist-double-opt-in.d3gd9ezfa3aujn.amplifyapp.com` test branch. Production allows only `https://jobseekercopilot.com`. There is no wildcard origin and no public subscriber-list endpoint.

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

The stack creates the `jobseekercopilot.com` SES domain identity and three Easy DKIM CNAME records in the existing Route 53 hosted zone. It creates an EventBridge configuration-set destination for sends, rejects, hard bounces, complaints, deliveries, rendering failures and delivery delays. A Lambda records `BOUNCED` or `COMPLAINED`, or safe delivery metadata, without logging recipient addresses.

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
3. deploy with `EnvironmentName=production` and `PublicSiteUrl=https://jobseekercopilot.com`;
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

Defaults are visible in `template.yaml` and can be changed through `--parameter-overrides`.

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
    FeatureOrigin=https://feature-waitlist-double-opt-in.d3gd9ezfa3aujn.amplifyapp.com \
    ProductionOrigin=https://jobseekercopilot.com \
    PublicSiteUrl=https://feature-waitlist-double-opt-in.d3gd9ezfa3aujn.amplifyapp.com \
  --no-execute-changeset
```

Inspect the change set before execution. Stop if it proposes replacement/deletion of the waitlist table, wildcard IAM/CORS, token exposure, or a subscriber-list route.

After a safe deployment, use stack outputs for the Angular hosted runtime configuration:

```text
ENABLE_LIVE_SUBMISSIONS=true
WAITLIST_API_URL=<SubscribeEndpoint>
WAITLIST_CONFIRMATION_API_URL=<ConfirmationEndpoint>
WAITLIST_RESEND_API_URL=<ResendEndpoint>
```

Keep live submissions disabled until identity verification and permitted-recipient end-to-end testing are complete.

## Monitoring and later communications

The stack creates alarms for API 5xx, Lambda errors, DynamoDB throttling, confirmation-send failures, bounces, complaints, unusual resend volume and elevated invalid-token volume. Alarm actions are intentionally unset until the owner chooses an operational notification destination.

No promotional or launch email exists in this stack. Any future campaign implementation must select only records whose current status is exactly `CONFIRMED`; it must exclude `PENDING`, `UNSUBSCRIBED`, `BOUNCED` and `COMPLAINED` records.
