# SES bounce and complaint verification — 22 July 2026

Tracking: [SES-02 #19](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/19), [implementation PR #41](https://github.com/jobseekercopilot/job-seeker-copilot-landing/pull/41), and [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8)

## Result

PASS. The deployed `eu-west-2` handler accepted the three controlled Amazon SES
mailbox-simulator scenarios, distinguished permanent bounce from complaint,
and made no subscriber-data mutation for the non-subscriber simulator targets.
No third-party or personal destination was used.

This evidence is intentionally redacted. It contains no sender or destination
address, message content, headers, SES message ID, raw event, account ID,
subscriber key, or exception text.

## Reviewed deployment

- Source: merged `develop` commit `08b3aea` from PR #41.
- Local gates: 52 deployed-backend tests, 20 shared-backend tests, Python
  compilation, SAM lint validation, SAM build, and diff checks passed.
- CloudFormation used prior values for every parameter, including both NoEcho
  values and the disabled contact switch.
- The reviewed change set contained no adds or removals, no DynamoDB or IAM
  change, no table replacement, and no application-function replacement.
- After execution the stack was `UPDATE_COMPLETE`; the SES-event Lambda was
  `Active` with a successful last update.
- The EventBridge rule and SES configuration-set destination were enabled for
  the required delivery, bounce and complaint types.

## Controlled simulator window

The bounded window began at `2026-07-22T15:15:52Z`. One minimal,
non-promotional message was accepted for each official simulator category:
success, hard bounce and complaint. The rejected local CLI attempt before this
window failed parameter validation and was never accepted by SES.

SES aggregate metrics for the window were:

| Metric | Count |
| --- | ---: |
| Send | 3 |
| Delivery | 2 |
| Bounce | 1 |
| Complaint | 1 |
| Reject | 0 |

The second delivery is expected: the complaint simulator published normal
delivery before the complaint feedback event. It does not indicate a duplicate
send.

The SES-event Lambda emitted only these fixed outcomes:

| Fixed outcome | Count |
| --- | ---: |
| `delivery-recorded-no-op` | 2 |
| `permanent-bounce-suppressed-no-op` | 1 |
| `complaint-suppressed-no-op` | 1 |

Custom metrics recorded one permanent bounce and one complaint. Malformed-event
count, update-failure count, SES-event Lambda errors, and SES rejects were all
zero. Both existing alarms changed to `ALARM` as designed; each has zero alarm
actions, so the controlled test notified no external destination.

The `no-op` suffix is required for this test. The handler has only exact-table
`UpdateItem` permission with `attribute_exists(email)` and the simulator targets
are not subscribers. A conditional no-op proves the event could neither create
nor read a subscriber. No table read, scan, export, insert, or deletion was
performed during verification.

## Acceptance evidence

- Permanent bounces set `BOUNCED` only for existing records that are not
  unsubscribed, complained, or already bounced; active confirmation metadata is
  removed in the same conditional update.
- Complaints set `COMPLAINED`, may strengthen an earlier bounce, and cannot
  override unsubscribe. A later bounce cannot downgrade a complaint.
- Transient and undetermined bounces record a delivery issue without terminal
  suppression.
- Duplicate, concurrent and out-of-order terminal events are successful
  conditional no-ops. DynamoDB dependency failures emit only a fixed error code
  and are re-raised for EventBridge retry.
- Submit and resend return the neutral accepted contract without sending for
  `BOUNCED` and `COMPLAINED` records, suppressing future confirmation delivery.
- The handler requires the direct SES source, matching EventBridge and SES
  event schema, exact configuration set, exact single waitlist-purpose tag, and
  exactly one valid destination before subscriber access.
- Contact-purpose and missing-purpose events stop before a subscriber-table
  client is created. Logs and metrics contain no address, content, event
  payload, table name or raw exception.
- Investigation, suppression review, safe recovery, redaction and the corrected
  simulator procedure are in the
  [SES bounce and complaint runbook](./ses-bounce-complaint-runbook.md). There is
  no automatic unsuppression route.

At `2026-07-22T15:18:07Z`, the stack and SES-event Lambda remained healthy,
backend contact submissions remained `false`, and Amplify live submissions
remained `false`.
