# Development contact E2E verification — 2026-07-22

## Scope and evidence boundary

This record covers the controlled TEST-02 development website verification.
It contains only counts, statuses, redacted roles and configuration names. It
does not contain mailbox contents, contact-message text, complete email
addresses, raw headers, message or provider identifiers, notification
endpoints, secret values, logs or stored record data.

The visitor identity was a company-controlled test address. The subject and
message carried a unique, non-customer marker. Gmail searches were restricted
to that marker. No subscriber-table read, scan, export, mutation or deletion
was performed.

## Controlled-window procedure

Status: **passed**.

- The starting stack was `UPDATE_COMPLETE`; the public frontend switch and
  backend contact switch were both `false`.
- The enable and disable CloudFormation change sets each modified only the
  non-replacing contact Lambda environment and its dependent HTTP API body.
  There were no table, recipient, IAM, add, remove or replacement changes.
- The development frontend was enabled only after the backend change set had
  completed. During shutdown it was rebuilt and verified disabled before the
  backend was returned to `false`.
- The final stack was `UPDATE_COMPLETE`; the development and canonical public
  frontend switches and the backend contact switch were all `false`.
- The final browser check showed the disabled accessible company-contact
  fallback and made no backend request.

## Browser and abuse-path evidence

Status: **passed**.

- One valid controlled enquiry was submitted through the deployed development
  contact page. The submit control was keyboard reachable, success was shown
  only after the `202` response, the status was announced, and the form was
  cleared after acceptance.
- A repeated submit event during the in-flight request produced exactly one
  browser POST. A later exact controlled retry returned the same neutral
  success state.
- Required-field validation focused the first invalid field and produced no
  backend request. The honeypot path produced the safe alert state and no
  backend request.
- A POST intercepted in the browser verified the network-failure state: the
  safe alert was announced and the visitor's input was preserved. No backend
  delivery was possible in that check.
- The deployed contact route was read back with burst `3` and rate `1` per
  second settings. Bounded invalid bursts produced no success or delivery and
  stayed below the validation and throttle alarm thresholds. API Gateway
  throttling is best-effort; these deliberately small bursts did not emit a
  `429`, so the exact deployed stage setting and automated infrastructure
  policy test are the retained rate-limit evidence.
- The complete WCAG 2 A/AA, 2.1 A/AA and 2.2 AA audit passed for 11 routes at
  desktop and mobile widths. The contact runner also reported no CSP
  violation or horizontal overflow at desktop and mobile widths.

## Delivery and company-mailbox evidence

Status: **passed**.

- The pre-submit marker search in the authenticated primary company Workspace
  mailbox returned zero messages. After website acceptance it returned exactly
  one message; it remained exactly one after the exact retry.
- Backend aggregate outcomes recorded exactly one `accepted` and one
  `duplicate-suppressed` event. SES aggregate metrics recorded one contact
  delivery and zero send failure, delivery failure, bounce or complaint.
- The visible From value matched the approved deployed SES sender. To and
  Delivered-To contained the approved public company alias only; CC and BCC
  were empty.
- Reply-To contained only the validated controlled visitor address and not the
  SES sender.
- Google's received authentication recorded SPF pass, company-domain DKIM
  pass and SES DKIM pass. The authorised Amazon SES relay path was present;
  no personal Gmail sender or unauthorised SMTP relay was present.
- The received message was UTF-8 `multipart/alternative` with one
  `text/plain` and one `text/html` rendering of the controlled text.
- CONTACT-04's controlled reply proof remains valid because the exact deployed
  sender/recipient controls and reply construction were unchanged: the reply
  targeted only the validated visitor address and not the SES sender. A second
  external reply was intentionally not sent.

## Data separation, privacy and monitoring

Status: **passed**.

- The deployed contact role had no managed policy, wildcard DynamoDB resource
  or permission to the waitlist table. Its two DynamoDB actions were scoped
  only to the contact deduplication table.
- The contact path stores only the HMAC fingerprint and expiry required for
  duplicate suppression. No visitor fields are written to that table.
- A count-only query covering all seven stack log groups found zero occurrences
  of the controlled visitor address, subject or message. Aggregate outcome
  queries returned counts only; no raw log was retained as evidence.
- The SES event handler's non-waitlist-purpose boundary and the deployed role
  policy prevent contact delivery events from accessing subscriber data.
- All 30 launch alarms were verified with alarm and OK actions configured. Any
  controlled-window datapoint must age out and all alarms must be `OK` before
  TEST-02 is closed.

## Reproducibility and cleanup

The fail-closed browser runner is `scripts/contact-e2e-browser.mjs`. Its policy
test rejects an unapproved host, endpoint, mode or test identity and prevents
screenshots, traces or stored visitor values. Run it only with company-owned
controlled values and with an explicitly bounded switch window.

Retain only this redacted record and aggregate issue evidence. Do not attach
Gmail contents, screenshots, raw MIME, headers, logs, message identifiers,
provider responses, test values or complete addresses. Do not delete existing
subscriber or contact records as test cleanup; the deduplication fingerprint
expires under the configured TTL.
