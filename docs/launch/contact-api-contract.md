# Contact API contract

The deployed landing stack exposes `POST /contact` and `OPTIONS /contact` on
the existing API Gateway HTTP API. Contact delivery is independently disabled
by default. The Lambda never reads or writes DynamoDB and does not store a copy
of an enquiry.

## Request

Requests must use `Content-Type: application/json`, an exact allowed Origin,
and a decoded body of no more than 4,096 bytes. The object must contain exactly:

```json
{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "subject": "Product question",
  "message": "A question of at least ten characters.",
  "source": "landing-page",
  "website": "",
  "formStartedAt": 1780000000000
}
```

| Value | Server rule |
| --- | --- |
| `name` | One trimmed line, 1–120 characters; control characters rejected |
| `email` | Normalized valid address, maximum 254 characters |
| `subject` | One trimmed line, 1–160 characters; CR/LF and controls rejected |
| `message` | Trimmed 10–3,000 characters; safe newlines allowed, other controls rejected |
| `source` | Must be the literal internally approved `landing-page` value |
| `website` | Honeypot must be the empty string |
| `formStartedAt` | Positive finite numeric browser timestamp |

Missing, extra, destination, sender, template, header and attachment fields are
rejected. Body limits apply before field processing. The handler normalizes
CRLF inside the message but never copies visitor input into arbitrary headers.

## Email boundary

The Lambda reads From, recipient and SES configuration set only from protected
deployment configuration. It creates an internal subject prefix and separate
UTF-8 plain-text/HTML bodies. Every interpolated HTML value is escaped. The
validated visitor email is used only in `ReplyToAddresses`.

The role permits `ses:SendEmail` only for the verified domain identity and
configuration set. Conditions enforce the exact configured From address and
single `ses:Recipients` company inbox. It has scoped log writes and no
DynamoDB, S3, Secrets Manager, list, attachment or wildcard data permission.
Every message has `message-purpose=contact-enquiry`, selected internally.

## Responses

| Status | Code | Meaning |
| --- | --- | --- |
| 202 | `CONTACT_ACCEPTED` | SES accepted the validated enquiry |
| 400 | `INVALID_REQUEST`, `INVALID_JSON`, `INVALID_EMAIL` | Controlled input rejection |
| 403 | `ORIGIN_NOT_ALLOWED` | Origin is not an exact configured origin |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content type is not JSON |
| 503 | `CONTACT_UNAVAILABLE` | Independent contact switch is off |
| 503 | `CONTACT_TEMPORARILY_UNAVAILABLE` | Trusted configuration or SES delivery failed |

The browser recognizes only the typed 202 body as success. Logs contain request
ID, operation, HTTP status, outcome and a safe AWS error code where applicable;
they never include visitor address, name, subject, message or provider error
text. API Gateway access logs omit bodies.

## Deployment and verification

Supply `ContactRecipientEmail` as a required NoEcho stack parameter and start
with `EnableContactSubmissions=false`. Inspect the expanded CloudFormation
change set and stop for wildcard IAM, unexpected recipients/routes, data-store
permissions, replacement/deletion of either DynamoDB table, or a recipient in
outputs/browser configuration.

After deployment:

1. verify the function environment has contact disabled, without printing the
   private recipient;
2. inspect the exact role policy and API routes;
3. verify exact-origin OPTIONS succeeds and obsolete/lookalike origins fail;
4. verify POST returns `CONTACT_UNAVAILABLE` and SES send metrics do not change;
5. publish only the `ContactEndpoint` as `CONTACT_API_URL` while Angular live
   submissions remains false.

CONTACT-03 must complete abuse protection before enablement. CONTACT-04 owns a
controlled send to the approved company inbox and Reply-To validation. Do not
enable either public switch or send a real enquiry in this issue.
