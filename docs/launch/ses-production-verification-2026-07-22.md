# SES production verification

Verification date: 22 July 2026

Region: `eu-west-2`

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [SES-01 #10](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/10)

## Outcome

The Amazon SES account, domain identity, DKIM signing, sending quota,
configuration set and waitlist event destination are active in `eu-west-2`.
The deployed waitlist sender has least-privilege SES permissions and emits a
controlled purpose tag.

Contact delivery is not deployed and has not been tested. The repository's
shared contact design now requires the same configuration set, an exact sender
condition and an internally controlled contact-purpose tag. CONTACT-02 must
integrate that design into the deployed stack; CONTACT-04 must prove delivery
and Reply-To behavior; SES-02 must prove bounce and complaint handling for both
purposes.

No email was sent during SES-01. Verification used read-only AWS, DNS,
repository and mailbox-identity evidence.

## Account and quota

| Control | Verified state |
| --- | --- |
| AWS region | `eu-west-2` (EU/London) |
| Production access | Enabled |
| Account sending | Enabled |
| Enforcement status | Healthy |
| 24-hour quota | 50,000 messages |
| Maximum send rate | 14 messages/second |
| Sampled preceding 24-hour sends | 0 |
| Account suppression | Bounce and complaint |

The launch journeys must remain well below account limits. API throttling and
per-record controls are independent of the SES account quota.

## Identities and domain authentication

| Identity/control | Verified state |
| --- | --- |
| `jobseekercopilot.com` | Domain identity, verified for sending |
| Easy DKIM | Enabled, `SUCCESS`, RSA 2048 |
| DKIM DNS | All three SES CNAME records exist in the authoritative hosted zone |
| `hello@jobseekercopilot.com` | Email identity, verified for sending |
| Mail routing | Google Workspace MX records are present |
| MAIL FROM | SES default MAIL FROM behavior; no custom MAIL FROM is configured |
| DMARC | No `_dmarc.jobseekercopilot.com` TXT record was present in the audited hosted zone |
| Apex SPF | No SPF TXT record was present at the zone apex |

Aligned DKIM supplies the current authenticated sending path. DMARC policy and
any Google Workspace/SES SPF or custom-MAIL-FROM change require a deliberate
domain-mail review so normal company mail is not disrupted. This remains a
pre-launch deliverability/security item; it must not be guessed or applied as
an ad-hoc DNS change.

## Approved address roles

| Purpose | Controlled value | Configuration ownership |
| --- | --- | --- |
| Waiting-list From | `updates@jobseekercopilot.com` | SAM parameter/Lambda environment; covered by the verified domain |
| Waiting-list Reply-To and public support | `support@jobseekercopilot.com` | SAM parameter/Lambda environment and public content |
| Contact From | `hello@jobseekercopilot.com` | Private deployment parameter; verified SES identity |
| Contact recipient | `hello@jobseekercopilot.com` | Private `CONTACT_RECIPIENT_EMAIL` deployment parameter only |
| Contact Reply-To | Validated visitor address | Derived only after server-side validation; never used as From |

Evidence for the company inbox is the Google Workspace MX configuration, a
Google Workspace welcome message addressed to the company address, the verified
SES identity and the repository's existing business mailbox mapping. The
connected Gmail profile is personal and is not an approved application
recipient. CONTACT-04 still owns a controlled inbox-delivery and reply test.

## Configuration set and events

`JobSeekerCopilotWaitlistEmails` is enabled with reputation metrics and
configuration-set suppression for bounce and complaint. Its enabled EventBridge
destination, `WaitlistEvents`, receives:

- send;
- delivery;
- delivery delay;
- reject;
- rendering failure;
- bounce;
- complaint.

The deployed waitlist code selects this configuration set and tags each send as
`message-purpose=waitlist-confirmation`. The shared landing email provider now
requires one of these closed, code-owned values:

| Message purpose | Sender/recipient behavior |
| --- | --- |
| `waitlist-confirmation` | Verified waitlist sender to the validated subscriber |
| `waitlist-confirmed` | Verified waitlist sender to the confirmed subscriber |
| `contact-enquiry` | Verified contact sender to the configured company recipient, visitor only as Reply-To |
| `contact-acknowledgement` | Verified contact sender to the validated visitor when the optional acknowledgement is enabled |

Browser input cannot select the purpose, sender, recipient, configuration set,
header set or template. Unknown purpose values fail before an SES request.
The deployed SES event handler independently requires the exact
`waitlist-confirmation` purpose before any subscriber-table access. Contact and
missing/unknown-purpose delivery events are ignored with a redacted result, so
the contact inbox can never be interpreted as a subscriber.

## IAM verification

The deployed waitlist submit and resend roles allow `ses:SendEmail` only when:

1. the identity resource is the verified `jobseekercopilot.com` domain;
2. `ses:FromAddress` exactly equals `updates@jobseekercopilot.com`; and
3. the configuration-set resource is exactly
   `JobSeekerCopilotWaitlistEmails`.

Their DynamoDB permissions are scoped to the external waitlist and token tables.
The SES-event role can only update the waitlist table and write its own log
events. No deployed landing role has wildcard SES resources or a subscriber-list
permission.

The shared SAM design now mirrors this control for future contact deployment:
the sender identity is the exact `ContactSenderEmail`, the From condition must
match it, and the only configuration-set resource is the supplied existing set.
There is still no live contact role or route; CONTACT-02 must verify the
generated change set before deployment.

## Validation and remaining gates

SES-01 automated coverage proves the shared email provider:

- selects the required configuration set;
- emits one controlled `message-purpose` tag;
- keeps sender and recipient internal to the call site;
- uses the visitor only as Reply-To for contact enquiries; and
- rejects unknown purpose values before calling SES.

Both Python suites, both SAM template validations, both SAM builds, the
frontend lint and the production frontend build passed before merge. No
mailbox simulator, company inbox or third-party address was used by SES-01.

Remaining gates:

1. CONTACT-02 deploys the contact route with the exact IAM/configuration-set
   contract.
2. CONTACT-04 verifies controlled company-inbox receipt and reply behavior.
3. SES-02 uses only SES mailbox-simulator addresses for success, hard bounce and
   complaint evidence and extends the deployed purpose-aware handling.
4. LANDING-SEC-01/02 resolve domain-mail policy, secrets and dependency gates.
5. RELEASE-02 confirms the final production configuration and events before any
   live announcement.
