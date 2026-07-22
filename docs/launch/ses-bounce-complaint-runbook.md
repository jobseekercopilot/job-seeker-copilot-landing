# SES bounce and complaint runbook

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [SES-02 #19](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/19)

## Trusted event boundary

The EventBridge rule accepts the configured SES configuration set and the six
delivery event types used by the landing site. The Lambda then independently
requires all of the following before it accesses the subscriber table:

- the direct EventBridge source is exactly `aws.ses`;
- the EventBridge detail type, SES `eventType`, and type-specific payload agree;
- the configuration-set tag contains exactly the configured value;
- the internally generated `message-purpose` tag contains exactly
  `waitlist-confirmation`; and
- the original SES destination contains exactly one syntactically valid
  address.

Contact, missing-purpose, unknown-configuration and malformed events return a
safe no-op before creating a DynamoDB client. A waitlist event can only call
`UpdateItem` against an existing subscriber; it cannot create or read a record.
This keeps contact delivery events from mutating subscriber data even though
both message purposes share the configuration set.

AWS documents SES events as best-effort and potentially out of order. The
handler therefore makes terminal transitions conditional and idempotent:

| Event | Existing state allowed to change | Result |
| --- | --- | --- |
| Permanent bounce | Any existing state except `UNSUBSCRIBED`, `COMPLAINED`, or `BOUNCED` | `BOUNCED`; active confirmation metadata removed |
| Complaint | Any existing state except `UNSUBSCRIBED` or `COMPLAINED` | `COMPLAINED`; active confirmation metadata removed |
| Transient or undetermined bounce | Existing non-terminal state only | Delivery-issue timestamp; no suppression |
| Delivery, delay, reject, rendering failure | Existing non-terminal state only | Corresponding delivery or issue timestamp |

A complaint may strengthen an earlier bounce. A later bounce cannot downgrade
a complaint, and neither event can override `UNSUBSCRIBED`. Duplicate,
out-of-order and no-subscriber updates fail their DynamoDB condition and become
successful no-ops. Submit and resend already reject every state other than an
eligible `PENDING` subscriber, so terminal records cannot receive another
confirmation email.

The event names and payload shapes follow the
[Amazon SES EventBridge event reference](https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-ses.html),
[SES event publishing schema](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html),
and [bounce types](https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html).

## Monitoring and redaction

The handler emits count-only embedded metrics:

- `SesBounces` for validated permanent-bounce events;
- `SesComplaints` for validated complaint events;
- `SesTransientBounces` for transient or undetermined bounces;
- `SesDeliveries` and `SesDeliveryFailures` for trusted waitlist-purpose
  delivery versus delay/reject/rendering/non-permanent-bounce outcomes;
- purpose-separated `ContactSesDeliveries`, `ContactSesDeliveryFailures`,
  `ContactSesBounces` and `ContactSesComplaints` for contact-enquiry events;
- `SesMalformedEvents` for rejected schemas; and
- `SesEventUpdateFailures` when DynamoDB fails for a reason other than its
  expected conditional no-op.

Waitlist and contact alarm groups use the purpose-specific metrics and publish
state changes through the OPS-01 notification path; see
[the launch monitoring guide](./launch-monitoring-and-alarms.md). Contact events
emit counts without accessing subscriber data. Logs contain
only the Lambda request ID, operation, status, fixed outcome, and a fixed AWS
error code when an update must be retried. They never include the SES message
ID, destination, event payload, headers, email content, table name or exception
text. The Lambda request ID is the safe operational correlation value.

When an alarm fires:

1. Record the UTC window, alarm name and aggregate count.
2. Inspect the SES-event Lambda's fixed outcomes and Lambda error count for that
   window. Do not print raw EventBridge events.
3. Compare only configuration-set aggregate send, delivery, bounce and
   complaint metrics.
4. Check the EventBridge destination state and Lambda deployment status.
5. If a data review is separately authorised, resolve one exact subscriber key
   privately. Never scan, export or attach subscriber records to an issue.
6. Record only redacted counts, fixed outcomes and request IDs in the incident
   or launch issue.

An update failure is re-raised so EventBridge can retry. Malformed or untrusted
events are acknowledged because retrying the same schema cannot make it valid.

## Suppression review and safe recovery

There is no automatic or public unsuppression route. Do not change a
`COMPLAINED` record merely because a visitor asks to receive email again. Do not
remove an address from the SES account suppression list as an automatic side
effect of application recovery.

Any proposed recovery requires a private, documented review of the exact event,
ownership of the address, current consent, the reason the destination is now
deliverable, and applicable support/legal policy. It must use separately
reviewed exact-key tooling, preserve the audit trail, and start a fresh
double-opt-in confirmation. Complaint recovery requires explicit approval.
Until that workflow exists and is approved, the safe action is to keep the
record suppressed.

## Controlled SES mailbox-simulator procedure

Use only the three AWS mailbox-simulator destinations documented by
[Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html):
`success@simulator.amazonses.com`, `bounce@simulator.amazonses.com`, and
`complaint@simulator.amazonses.com`. Simulator traffic does not count against
the account's bounce or complaint rate, and its hard bounce is not added to the
SES suppression list. Never substitute a third-party or personal address.

Preconditions:

1. Keep the public frontend submission switch and contact backend switch off.
2. Confirm the SES identity, configuration-set destination, EventBridge rule,
   Lambda version and alarms are healthy.
3. Record a narrow UTC start time and baseline aggregate SES/custom metrics.
4. Use the approved waitlist sender, the deployed configuration set, one
   simulator recipient per send, and exactly
   `message-purpose=waitlist-confirmation`.

Send one minimal, non-promotional UTF-8 message to each simulator destination
with `aws sesv2 send-email`. The controlled request must set the fixed sender,
one simulator `ToAddresses` value, `ConfigurationSetName`, and this tag:

```text
Name=message-purpose,Value=waitlist-confirmation
```

Do not save or publish the returned SES message IDs. Confirm within the bounded
window:

- the success case produced `delivery-recorded-no-op`; record the exact delivery
  count because the complaint simulator may also publish a normal delivery
  before its complaint event;
- one permanent bounce produced `permanent-bounce-suppressed-no-op` and one
  `SesBounces` count;
- one complaint produced `complaint-suppressed-no-op` and one `SesComplaints`
  count;
- no malformed, update-failure or Lambda-error count appeared; and
- no subscriber item was created (the conditional no-op is sufficient proof;
  do not scan or read the table).

The no-op suffix is expected because simulator destinations are not subscriber
records. Unit tests separately prove the state transitions, terminal-state
precedence, idempotency, malformed routing, failure retry, redaction, and
contact-purpose isolation.

Public evidence must contain only the UTC window, aggregate counts, fixed
outcomes and pass/fail conclusions. Do not publish message content, full sender
or destination addresses, headers, SES message IDs, raw events, or subscriber
data. Reconfirm both public submission switches remain off after the test.
