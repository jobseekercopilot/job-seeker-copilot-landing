# Waiting-list confirmation and resend

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [WAITLIST-03 #13](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/13)

## Token lifecycle

Confirmation tokens are generated with 256 bits of randomness. The raw value
exists only in Lambda memory, the HTTPS confirmation URL and the recipient's
email. DynamoDB stores a SHA-256 hash with an explicit expiry.

`POST /waitlist/confirm` validates the token's type, character set and hard
length limit before a consistent token-table read. Malformed, unknown and
expired tokens cannot write subscriber state.

A valid confirmation uses one DynamoDB transaction. It conditionally requires:

- the subscriber to remain `PENDING`;
- the subscriber's current token hash to match;
- the subscriber's confirmation expiry not to have passed;
- the token record to remain `ACTIVE`; and
- the token record's expiry not to have passed.

The transaction changes the subscriber to `CONFIRMED`, records the confirmation
time, removes the pending TTL, active hash/expiry and all send-control metadata,
then converts the token to a short-lived `USED` tombstone with its email removed.
A repeat request sees that tombstone and returns `WAITLIST_ALREADY_CONFIRMED`
without writing again. If two confirmations race, the loser re-reads the token
consistently and resolves to the same idempotent result; it never reuses the
token to update another record.

## Resend lifecycle

`POST /waitlist/resend` accepts a strictly validated, normalised address but
always returns the same accepted message for unknown, confirmed, unsubscribed,
bounced, complained, cooldown-limited, window-limited and eligible pending
records. It does not send to confirmed or suppressed states.

An eligible resend first enforces the deployment-configured per-record cooldown
and rolling-window cap. The exact operational thresholds are not shown in user
copy or responses. One conditional transaction then:

1. replaces the subscriber's current token hash and expiry;
2. deletes the superseded hashed-token record; and
3. creates the new hashed-token record.

Only the new raw token is sent. A concurrent rotation loser returns the neutral
response and sends nothing. If SES fails, the new pending token remains the
only valid token, the delivery failure is recorded and recovery is allowed
without restoring or exposing the superseded value.

## Browser recovery

Confirmation links use the canonical form:

```text
https://www.jobseekercopilot.com/waitlist/confirm?token=<url-safe-token>
```

Angular copies the token into a POST request and immediately replaces the
visible URL with `/waitlist/confirm`. The token is never rendered or logged.
Malformed, unknown, expired and temporary-failure pages provide controlled
copy. Invalid and expired flows link to the neutral email-based recovery form
at `/waitlist/resend`.

The public runtime config contains HTTPS submit, confirmation and resend routes
from the current stack outputs. Canonical and develop origins are exact-matched;
the deleted feature host, apex origin and lookalikes are denied. Live submission
remains disabled until the controlled development E2E task.

## Operator troubleshooting

Use typed response codes and privacy-safe structured logs first. Logs include
request ID, operation, HTTP status and controlled outcome only—never a complete
address or raw token.

- `CONFIRMATION_TOKEN_INVALID`: malformed, unknown, superseded or otherwise
  inactive token; do not search logs for the raw value.
- `CONFIRMATION_TOKEN_EXPIRED`: direct the visitor to neutral resend recovery.
- `WAITLIST_ALREADY_CONFIRMED`: idempotent repeat; no action required.
- `CONFIRMATION_TEMPORARILY_UNAVAILABLE`: check Lambda errors, DynamoDB
  transaction/throttle metrics and current stack health.
- neutral resend result with no mail: expected for ineligible or limited states;
  do not disclose which state applies.
- `ConfirmationSendFailures`: inspect SES identity/configuration-set permissions
  and event outcomes without exposing the recipient.
- `ConfirmationStateUpdateFailures`: SES may already have accepted the message;
  avoid prompting an immediate duplicate and inspect DynamoDB update health.

Never query by scanning subscriber data, paste a token/address into a ticket,
relax exact-origin CORS, bypass cooldown/window controls or manually reactivate
a suppressed subscriber.
