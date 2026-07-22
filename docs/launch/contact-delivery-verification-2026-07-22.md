# Contact delivery verification — 2026-07-22

## Scope and privacy boundary

This record covers the controlled CONTACT-04 development verification. It
contains only counts, statuses and redacted configuration roles. It does not
contain the visitor address, mailbox contents, contact-message text, raw
headers, message identifiers or the complete company mailbox addresses.

The public contact alias is configured only through the NoEcho
`ContactRecipientEmail` CloudFormation parameter. The separately verified
company sender is configured through `ContactSenderEmail`. Neither value is
accepted from a browser request or emitted as a stack output.

## Automated and transport evidence

Status: **passed**.

- PR 38 isolates contact and unknown-purpose SES events before any subscriber
  data access.
- PR 39 adds only the separately verified exact company-sender identity ARN to
  the contact role. The domain identity, exact From condition, sole-recipient
  condition and exact configuration set remain enforced. No wildcard SES
  permission was added.
- The deployment change set contained no resource additions or removals, no
  table changes and no replacements. The development stack completed with
  `UPDATE_COMPLETE`.
- The exact sender identity was verified for sending with DKIM `SUCCESS` in
  `eu-west-2`.
- One controlled, non-customer API request returned `202 CONTACT_ACCEPTED`.
  One byte-for-byte retry returned the same neutral response.
- Redacted Lambda outcomes recorded exactly one `accepted` and one
  `duplicate-suppressed`, with no contact SES failure.
- SES aggregate metrics in the controlled minute recorded `Send=1` and
  `Delivery=1`, with no Reject, Bounce or Complaint datapoint.
- The SES event handler recorded a redacted non-waitlist-purpose outcome and
  did not access subscriber data.
- The contact backend switch and the Amplify public-submission switch were
  both returned to `false` after the test.

## Company-mailbox evidence

Status: **passed**.

- The authenticated Gmail profile matched the designated primary company
  Workspace mailbox.
- A marker-bounded search returned exactly one received controlled message and
  no duplicate copy. The public alias therefore routes into the designated
  primary mailbox.
- The visible From value was the approved company SES sender. To and
  Delivered-To contained only the approved public company alias; CC and BCC
  were empty.
- Reply-To contained only the validated controlled visitor address. The SES
  sender was absent from Reply-To.
- Google's authentication results recorded company-domain DKIM pass, SES DKIM
  pass and SPF pass. The inbound hop was direct from the regional Amazon SES
  outbound host to Google over TLS 1.3; no unauthorised relay or unexpected
  recipient was present. The SES envelope Return-Path was expected and was not
  used as Reply-To.
- The message was UTF-8 `multipart/alternative` with one `text/plain` and one
  `text/html` part. Unicode rendered intact. Literal markup remained literal in
  plain text and was entity-escaped in HTML, so it was not interpreted as
  visitor-supplied markup.
- One controlled reply was sent in the original thread from the primary
  company mailbox. Its Sent copy targeted only the validated visitor address,
  had empty CC/BCC fields, referenced the original message and did not target
  the SES sender.

## Mailbox ownership and rotation

The public alias must route to a monitored primary Google Workspace mailbox.
The accountable role is the designated Job Seeker Copilot mailbox owner; a
named personal address must not be placed in source, public configuration,
issues or runbooks.

For an ownership rotation:

1. a Google Workspace administrator confirms the incoming owner, recovery
   controls and multi-factor authentication through an approved private
   channel;
2. preserve the public alias and route it to the newly designated monitored
   primary mailbox;
3. verify external inbound delivery to the alias and outbound reply identity;
4. remove the former owner's mailbox access only after the new owner has
   confirmed receipt and reply operation;
5. update the private ownership register and on-call contact; and
6. retain only redacted pass/fail evidence in this repository and GitHub.

Review the mailbox owner and alias routing before launch, after every ownership
change and during the regular access review. Do not forward enquiries to a
personal consumer mailbox.

## Changing the configured recipient

1. Keep `ENABLE_LIVE_SUBMISSIONS=false` in Amplify and
   `EnableContactSubmissions=false` in CloudFormation.
2. Privately verify that the proposed recipient is an approved, monitored
   company mailbox or alias and record its accountable owner outside the
   repository.
3. Create a CloudFormation change set that changes only the NoEcho
   `ContactRecipientEmail` parameter and preserves every other parameter.
4. Inspect the expanded change set. Stop for resource replacement/deletion,
   wildcard IAM, a second recipient, a public output or unrelated drift.
5. Execute the approved change set and confirm the Lambda environment remains
   disabled and the recipient is still absent from stack outputs and browser
   configuration.
6. Open one controlled backend-only window. Send one non-sensitive message and
   one identical retry; immediately disable the backend again.
7. Confirm one inbox message, safe MIME rendering, exact From/To/Reply-To,
   successful visitor-directed reply, one SES send/delivery and one
   duplicate-suppressed outcome.
8. Update redacted evidence and monitoring ownership before enabling any
   public submission switch.

To roll back a recipient change, repeat the same change-set process with the
last approved company recipient. Do not delete the subscriber table, token
table, contact deduplication table or any subscriber record as part of this
operation.
