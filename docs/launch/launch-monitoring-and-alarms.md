# Launch monitoring and alarms

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [OPS-01 #22](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/22)

## Operator boundary

The deployed landing stack owns one CloudWatch dashboard, count/status-only
metrics, CloudWatch alarms and an SNS notification topic. The topic has a
conditional email subscription supplied at deployment as the NoEcho
`AlarmNotificationEmail` parameter. Its policy allows `sns:Publish` only from
CloudWatch alarm ARNs in the current account and Region. Alarm and OK changes go
to the same approved operator mailbox; the mailbox must confirm the SNS
subscription before this task is complete.

The notification path carries AWS alarm metadata only. Do not add an email
address, confirmation token, contact message, SES event payload, request body,
fingerprint or DynamoDB key to a metric name, dimension, alarm description,
dashboard, notification, issue or incident record.

The stack output `LaunchMonitoringDashboardName` identifies the dashboard and
`AlarmNotificationTopicArn` identifies the notification topic. Neither output
contains the subscriber endpoint. Public frontend submissions and backend
contact submissions remain independent of monitoring and must not be enabled by
an alarm deployment or exercise.

## Coverage and thresholds

All thresholds are initial launch values. Owner: **Landing Website / Bernard
McGeever**. Review after each real alarm and during RELEASE-01; tune only from
aggregate counts and documented traffic, never by weakening validation or
logging request content.

| Area | Signal | Alarm threshold | Initial response |
| --- | --- | --- | --- |
| HTTP API | Stage `5xx` across both journeys | 1 in 5 minutes | Check Lambda errors and the redacted API request ID; keep submissions disabled or disable them during an incident. |
| HTTP API | Waitlist route `429` count | 5 in 5 minutes | Check aggregate route volume and account/stage limits; do not raise limits until abuse is excluded. |
| HTTP API | Contact route `429` count | 5 in 5 minutes | Check aggregate contact validation/duplicate signals; do not inspect message bodies. |
| Lambda | Errors for submit, confirm, resend, SES-event, TTL and contact functions | 1 in 5 minutes per function | Use the function name, UTC window and request ID to inspect sanitized logs. |
| DynamoDB | Read/write throttle events for subscriber, token and content-free contact-deduplication tables | 1 in 5 minutes per table | Check operation-level aggregate metrics and capacity/account limits; never scan a table. |
| DynamoDB | `SystemErrors` with both required `TableName` and `Operation` dimensions | 1 in 5 minutes per table | Check the affected operation and Lambda error category; retry safely or escalate to AWS for persistent service errors. |
| Waitlist delivery | Confirmation send failure | 1 in 5 minutes | Check SES sending/configuration-set health and keep the pending record recoverable. |
| Waitlist delivery | Permanent bounce or complaint | 1 in 5 minutes | Follow the suppression runbook; never resend to a suppressed address. |
| Waitlist delivery | Delay, reject, rendering failure or non-permanent bounce | 1 in 5 minutes | Check SES aggregate event type and service health; do not publish recipient data. |
| Waitlist behaviour | Invalid tokens or resend issue volume | 20 in 5 minutes | Check aggregate abuse/UX patterns, CORS and recent release changes. |
| Contact validation | Validation rejection | 10 in 5 minutes | Check counts by UTC window and status only; do not log submitted values. |
| Contact duplicate control | Duplicate suppression | 5 in 5 minutes | Check count and deployment state; a duplicate still returns the neutral accepted contract. |
| Contact dependency | Reservation/release failure or SES send failure | 1 in 5 minutes | Verify only DynamoDB/SES health and sanitized error category; retry remains content-safe. |
| Contact delivery | Purpose-specific bounce, complaint or other delivery failure | 1 in 5 minutes | Confirm the company destination and SES identity operationally without publishing it; follow the SES response matrix. |
| Notification path | `NotificationCanary` | 1 controlled count | Confirm ALARM and recovery notifications reach the approved operator mailbox. Never use a real journey failure as the canary. |

SES event metrics are separated by the trusted `message-purpose` tag. Waitlist
confirmation events update subscriber lifecycle state and emit only waitlist
metrics. Contact-enquiry events emit only contact metrics and never access the
subscriber table. Unknown purpose/configuration-set events are ignored and
logged with a stable outcome.

## Dashboard and evidence

The `JobSeekerCopilotLanding-<environment>` dashboard contains:

- current alarm state;
- HTTP API request, 4xx and 5xx counts;
- per-function Lambda error counts;
- separate waitlist/SES and contact count-only signals; and
- read/write DynamoDB throttle counts for all three tables.

Evidence should contain only the UTC window, stack/commit, logical alarm or
metric name, state/count, action/subscription status, dashboard name and a
redacted request ID when necessary. CloudWatch log groups retain 30 days. API
access logs contain route, status, response length, request ID and a bounded
integration-error field; they omit request bodies and source IPs. Lambda result
logs contain request ID, operation, status and stable outcome. Application
errors use a bounded AWS error code/scope and do not emit tracebacks.

## Safe verification

Use the deployment profile and current Region. These commands read resource
configuration only and do not inspect subscriber records or mailbox content:

```bash
aws cloudformation describe-stacks \
  --stack-name job-seeker-copilot-waitlist \
  --query 'Stacks[0].{Status:StackStatus,Dashboard:Outputs[?OutputKey==`LaunchMonitoringDashboardName`].OutputValue|[0]}'

aws cloudwatch describe-alarms \
  --alarm-name-prefix job-seeker-copilot-waitlist \
  --query 'MetricAlarms[].{Name:AlarmName,State:StateValue,Actions:length(AlarmActions)}'

aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/JobSeekerCopilot \
  --query 'logGroups[].{Name:logGroupName,Retention:retentionInDays}'

aws sns list-subscriptions-by-topic \
  --topic-arn <AlarmNotificationTopicArn> \
  --query 'Subscriptions[].{Protocol:Protocol,Confirmed:SubscriptionArn!=`PendingConfirmation`}'
```

Exercise the notification path only with the dedicated count-only canary:

```bash
aws cloudwatch put-metric-data \
  --namespace JobSeekerCopilot/Monitoring \
  --metric-data MetricName=NotificationCanary,Value=1,Unit=Count
```

Record the baseline canary alarm state first. Wait for the canary alarm to enter
`ALARM`, verify one ALARM notification, then wait for missing data to restore
`OK` and verify one recovery notification. Do not repeatedly publish the metric,
use `set-alarm-state` on a real alarm or enable either public submission switch.

For application metrics, use unit tests with synthetic events and mocks. Do not
generate real complaints, bounces, DynamoDB errors or customer-facing outages.
The SES mailbox simulator procedure remains limited to its dedicated runbook.

## Response and escalation

1. Acknowledge a launch-blocking alarm within 15 minutes during an active test
   or release window. Outside a staffed window, public submissions remain off.
2. Record the UTC window, alarm, state, aggregate count and exact deployed
   commit. Preserve the first redacted correlation ID if needed.
3. Check the dashboard and the smallest relevant log window. Never use a table
   scan, mailbox dump, raw SES payload or broad log export.
4. Disable the affected submission path if it is active and the fault can lose,
   duplicate or misroute a request. The frontend and backend switches are
   separate controls.
5. Use the component runbook: waitlist confirmation/resend, contact abuse and
   delivery, SES bounce/complaint, or deployment rollback. Escalate persistent
   AWS `SystemErrors`, SES account degradation or an uncontained privacy event.
6. Confirm recovery using service health, a safe synthetic check where defined,
   and the alarm's return to `OK`. Add only redacted evidence to GitHub.

## Cost monitoring

The AWS account has an existing monthly cost budget with one subscriber on each
of three notifications: actual spend at 85%, actual spend at 100% and forecasted
spend at 100%. OPS-01 does not expose or replace those subscribers. The operator
checks the budget during weekly launch review and before RELEASE-01.

The dashboard, custom metrics and alarms incur CloudWatch/SNS charges. Keep the
single dashboard and count-only metrics; do not add high-cardinality dimensions.
Review CloudWatch custom-metric/alarm counts, log stored bytes, SNS delivery and
the monthly budget together. Unexpected cost is handled like an operational
alarm: record aggregate service cost, stop an unsafe test, and investigate
before raising limits.

AWS references: [HTTP API metrics](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-metrics.html),
[DynamoDB metrics and required dimensions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html),
[CloudWatch alarm notifications](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html),
and [CloudWatch dashboard structure](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html).

## Configuration changes

To change the notification endpoint, update only the NoEcho
`AlarmNotificationEmail` stack parameter through a reviewed CloudFormation
change set. Confirm the new subscription, verify the canary, then remove the old
subscription through the next reviewed template deployment. Do not put the
endpoint in source, outputs, dashboard JSON, alarm descriptions or issue
evidence.
