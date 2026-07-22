# Waiting-list frontend contract

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [WAITLIST-01 #11](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/11)

## Runtime routes

The production waitlist stack in `eu-west-2` currently publishes these public
HTTPS routes:

| Browser setting | Method and purpose | Verified stack output |
| --- | --- | --- |
| `WAITLIST_API_URL` | `POST` a normalised address | `https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/waitlist` |
| `WAITLIST_CONFIRMATION_API_URL` | `POST` the single-use token | `https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/waitlist/confirm` |
| `WAITLIST_RESEND_API_URL` | `POST` a normalised address and receive a neutral response | `https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/waitlist/resend` |

`WAITLIST_UNSUBSCRIBE_API_URL` remains blank because the deployed stack has no
unsubscribe route. No browser secret, recipient address or AWS credential is
part of this configuration.

Production config generation fails if live submissions are enabled while any
of the three required waitlist routes is missing, malformed or not HTTPS.
On 22 July 2026, the Amplify app-level variables were updated with these three
verified stack outputs and explicit `PUBLIC_ENVIRONMENT_NAME=production`.
`ENABLE_LIVE_SUBMISSIONS` was changed to `false` because the current production
CORS allowlist does not yet permit the canonical `www` origin. Release work
must verify the hardened backend before changing that switch back to `true`.

## Registration states

The service recognises new pending, existing pending, already confirmed and
re-subscription-required API results so unexpected responses cannot be treated
as success. The page deliberately renders one neutral accepted-request message
for all four states. It does not tell a visitor whether an address exists or
which subscription state it has.

The address is trimmed and lower-cased before validation and before every
submit/resend request. The shared browser validator mirrors the deployed
backend's length, local-part, domain-label and dot rules.

While a request is active, the email field and submit control are disabled,
duplicate submits are ignored, the form exposes `aria-busy`, and a polite
loading message is shown. Validation, network, throttling and delivery failures
use controlled copy; raw backend messages are never rendered or logged.

## Confirmation and resend

`/waitlist/confirm?token=…` copies the token into the API request and immediately
replaces the visible browser URL with `/waitlist/confirm`. The same URL cleanup
applies to unsubscribe links. Raw tokens are not rendered or logged.

The neutral `/waitlist/resend` page is linked from every accepted registration
result. Invalid and expired confirmation states provide the same recovery form.
The resend response does not disclose whether an address exists, is pending or
is already confirmed. The form supports keyboard submission, has an explicit
label and help association, announces results, disables while pending and uses
the shared address normalisation rules.

## Verification gates

- component tests cover blank/invalid input, normalisation, all accepted states,
  backend/network failures, duplicate submit, pending controls and keyboard
  operation;
- service tests cover exact API codes, malformed results, invalid/expired
  confirmation, neutral resend, throttling and network errors;
- the browser accessibility sweep includes `/waitlist/confirm`,
  `/waitlist/resend` and `/waitlist/unsubscribe` at desktop and mobile widths;
- production build/prerender and runtime-config validation must pass before
  merge.
