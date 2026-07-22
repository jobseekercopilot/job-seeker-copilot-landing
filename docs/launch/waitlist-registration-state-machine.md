# Waiting-list registration state machine

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [WAITLIST-02 #12](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/12)

## Boundary and input

`POST /waitlist` accepts an `application/json` object containing exactly one
`email` field. The body is limited to 4 KiB. The server trims and lower-cases
the address, limits it to 254 characters, enforces a 64-character local part,
rejects whitespace and invalid dot placement, and validates each domain label.
Browser validation is only a convenience; this server rule is authoritative.

No request field can select a sender, recipient, template, SES configuration
set, consent version, record status or token. There is no list/read endpoint.

## Atomic creation

For a previously unseen normalised address, one DynamoDB transaction:

1. conditionally creates the subscriber only when its key does not exist;
2. sets the initial state to `PENDING` with consent/source timestamps and the
   pending-record TTL;
3. generates a 256-bit URL-safe random confirmation token in process memory;
4. stores only the SHA-256 token hash and explicit expiry in both related
   records; and
5. conditionally creates the token record only when that hash does not exist.

The Lambda role has exact `dynamodb:TransactWriteItems` permission on the two
named table ARNs. A concurrent creator that loses the condition re-reads the
subscriber consistently and returns the same neutral public result. It does
not send a second email. A concurrent expired-token rotation that loses its
condition also resolves to the neutral result.

## Public response contract

New, active-pending, confirmed, unsubscribed, bounced, complained and otherwise
ineligible existing records all use this result:

```json
{
  "success": true,
  "code": "WAITLIST_REQUEST_ACCEPTED",
  "message": "Request received. If this address needs confirmation, check its inbox or request a new confirmation email."
}
```

The HTTP status is `202 Accepted`. The service keeps support for the previous
typed success codes during deployment overlap, but the page renders one
neutral message for all accepted states. Visitors cannot use the public body
to determine whether an address exists or its state.

Invalid input retains stable `400`/`415` typed errors. A temporary persistence
or delivery failure uses a controlled `503` response. Raw AWS errors, table
names, addresses and tokens are neither returned nor logged.

## Delivery and partial failures

| Point of failure | Preserved state | Public behavior | Recovery |
| --- | --- | --- | --- |
| Creation transaction | No partial subscriber/token pair | Controlled `503 SERVICE_UNAVAILABLE` | Retry the original request |
| SES send | `PENDING` plus active hashed token and TTL | Controlled `503 CONFIRMATION_EMAIL_TEMPORARILY_UNAVAILABLE` | Failure timestamp is recorded and the resend-attempt cooldown is cleared |
| Failure-metadata write | `PENDING` and active hashed token | Same controlled SES failure | A later resend remains possible even if metadata could not be recorded |
| Sent-metadata write after SES accepted the message | `PENDING` and active hashed token; delivery may already be in progress | Neutral `202 WAITLIST_REQUEST_ACCEPTED` | Keep the original cooldown to avoid prompting a duplicate; emit `ConfirmationStateUpdateFailures` |
| Concurrent duplicate/rotation condition | Winner owns the current record/token | Neutral `202 WAITLIST_REQUEST_ACCEPTED` | Use the winner's state; never retry blindly inside the request |

SES is called in `eu-west-2` with the fixed
`updates@jobseekercopilot.com` sender, the exact
`JobSeekerCopilotWaitlistEmails` configuration set and the internally owned
`message-purpose=waitlist-confirmation` tag. The visitor address is only the
validated recipient.

## CORS and deployment state

The pre-release stack remains `EnvironmentName=development` while Amplify
`develop` owns the custom domain. Its only allowed browser origins are the
exact develop Amplify host and `https://www.jobseekercopilot.com`. The deleted
feature host, apex origin and lookalike subdomains are denied; the apex website
redirects to `www` before Angular loads.

Confirmation links use `https://www.jobseekercopilot.com`. Live submissions
remain disabled in Amplify until the reviewed stack update has deployed and
canonical preflight verification passes. Final release promotion changes the
stack to production mode, where only the canonical `www` origin is considered.
