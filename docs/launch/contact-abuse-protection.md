# Contact abuse protection

Tracking: launch epic #8 and CONTACT-03 #17.

## Threat model and boundary

The public contact route can be targeted by automated spam, repeated requests,
oversized payloads and attempts to consume API, Lambda or SES capacity. The
controls are deliberately layered because no browser signal proves that a
visitor is human.

The route uses a conservative API Gateway rate override, bounded JSON parsing,
an exact field allow-list, per-field limits, a hidden honeypot, a server-checked
completion-time signal and a short-lived duplicate reservation before SES.
Responses do not reveal which signal fired or the effective operational
thresholds.

## Privacy-safe duplicate control

After normalization and validation, Lambda derives an HMAC-SHA256 fingerprint
over the meaningful form values. Its deployment pepper is a required NoEcho
parameter and must never enter source control, logs, stack outputs, Amplify or
browser configuration.

The dedicated DynamoDB table contains only:

- the opaque fingerprint partition key;
- an expiry epoch used by DynamoDB TTL and by the conditional reservation;
- the owning Lambda request ID, used only to release that request's reservation
  after a failed SES call.

It stores no email, name, subject, message, IP, user agent or raw pepper. The
Lambda role can conditionally put and delete exact table items but cannot read,
scan or export them. Expired records become logically replaceable immediately;
physical TTL deletion is asynchronous.

A concurrent or recent repeat receives the normal accepted response and does
not trigger a second email. A table error fails closed before SES. An SES error
conditionally releases the current request's reservation, allowing a later
retry without letting one request delete another request's record.

## Monitoring and response

Count-only embedded metrics record validation rejection, honeypot/timing
signals, duplicate suppression, duplicate-store failures and SES failures. A
CloudWatch Logs metric filter counts contact-route 429 responses rejected by
API Gateway before Lambda. The stack creates alarms for the actionable contact
categories; notification delivery is completed by OPS-01.

Neither Lambda nor API Gateway access logs contain form bodies or source IPs.
When an alarm fires:

1. inspect aggregate counts, safe result codes, SES events and service health;
2. do not add visitor identifiers or message text to diagnostics;
3. keep or return both submission switches to disabled if delivery safety is
   uncertain;
4. tune route and server controls through a reviewed SAM change set, then rerun
   duplicate, retry, CORS and redaction tests;
5. document the reason and review date without publishing the effective
   thresholds.

## Future WAF or challenge decision

Do not purchase or add a CAPTCHA for the current launch. If observed abuse
remains material, first assess an AWS WAF rate-based rule at the API edge. A
challenge provider is a later option only after privacy, cookie/consent,
accessibility, regional processing, cost, failure-mode and support review. Any
challenge must be verified server-side, preserve a non-JavaScript or assisted
path where practicable, and never replace throttling, validation or duplicate
control.

## Residual risk

Distributed bots can stay below aggregate limits, honeypots can be avoided and
browser timing can be forged. DynamoDB TTL deletion is not immediate. Alarm
actions are not yet connected. These are accepted launch-stage residual risks
only while traffic is low, both forms remain disabled, and CONTACT-04 plus the
operations issues are still gating release.

## Verification

Automated tests cover route limits in the expanded template, oversized
body/fields, honeypot and too-fast requests, HMAC-only storage, concurrent
duplicates, SES retry release, dependency failure, count-only metrics and log
redaction. Before deployment, validate/build SAM and inspect the expanded
change set for unexpected data storage, wildcard IAM, secret outputs or table
replacement/deletion.
