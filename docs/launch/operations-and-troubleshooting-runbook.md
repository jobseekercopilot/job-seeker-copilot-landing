# Landing operations and troubleshooting runbook

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [OPS-02 #23](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/23)

Use this runbook for routine deployment, rollback and incident diagnosis of the
waiting-list and Email Us journeys. The specialist guides linked below remain
authoritative for their individual contracts. This document supplies the safe
operator sequence that joins them together.

## Fixed ownership and safety boundary

| Item | Current owner or identifier |
| --- | --- |
| Repository | `jobseekercopilot/job-seeker-copilot-landing` |
| Integration branch | `develop` |
| Release branch | `main` after RELEASE-01 |
| AWS Region | `eu-west-2` |
| Deployment profile | `jobseekercopilot-deploy` |
| CloudFormation stack | `job-seeker-copilot-waitlist` |
| Amplify app | `d3gd9ezfa3aujn` |
| External subscriber table | `JobSeekerCopilotWaitlist`; not owned by the stack |
| Stack-owned data | token and content-free contact-deduplication tables |
| Operational owner | Landing Website / Bernard McGeever |

The following rules apply to every procedure:

1. Keep the Amplify `ENABLE_LIVE_SUBMISSIONS` value and CloudFormation
   `EnableContactSubmissions` parameter `false` except during an approved,
   staffed, controlled test window.
2. Never delete, replace, empty, scan or broadly export a table. Never use a
   stack deletion as data cleanup or rollback.
3. Never paste an address, confirmation token, contact message, provider
   payload, SES message ID, complete header set, DynamoDB item or secret into a
   terminal transcript, GitHub issue or incident record.
4. Do not print NoEcho values. Preserve them with `UsePreviousValue`; change one
   only through a separately reviewed change set.
5. Do not edit Lambda environment variables directly. CloudFormation owns
   backend configuration; Amplify owns public browser configuration.
6. Do not weaken exact-origin CORS, validation, duplicate controls, suppression,
   PITR, deletion protection, retention or IAM to make a test pass.
7. Use one narrow UTC window and the first redacted request ID for correlation.
   Do not dump a mailbox or log group.
8. Stop if account, Region, branch, stack, change-set content or resource
   ownership differs from this runbook.

## Incident roles and first response

The release operator owns the change and the first 15-minute response. A second
reviewer approves production change sets, rollback, recipient changes and any
controlled email exercise. Escalate persistent AWS service errors to AWS
Support; escalate suspected misrouting, secret exposure or personal-data loss
to the accountable security/privacy owner immediately.

At the first sign of loss, duplication, misrouting or an uncontained error:

1. stop promotion and record the UTC time, deployed commit and affected route;
2. turn off the public frontend switch if it is on;
3. turn off the backend contact switch through a reviewed parameter-only change
   set if contact delivery itself is at risk;
4. preserve alarm state, aggregate counts and one redacted request ID;
5. choose the smallest troubleshooting branch below; and
6. restore service only after the alarm is OK and the relevant controlled smoke
   test passes.

## Read-only preflight

Run from a clean checkout of the intended commit. These commands do not inspect
subscriber records or mailbox content.

```bash
git status --short
git rev-parse HEAD

aws sts get-caller-identity \
  --profile jobseekercopilot-deploy \
  --query 'Account' \
  --output text

aws cloudformation describe-stacks \
  --stack-name job-seeker-copilot-waitlist \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'Stacks[0].{Status:StackStatus,ContactEnabled:Parameters[?ParameterKey==`EnableContactSubmissions`]|[0].ParameterValue}'

aws amplify get-app \
  --app-id d3gd9ezfa3aujn \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'app.{Platform:platform,ProductionBranch:productionBranch.branchName,LiveSubmissions:environmentVariables.ENABLE_LIVE_SUBMISSIONS}'

aws amplify list-jobs \
  --app-id d3gd9ezfa3aujn \
  --branch-name develop \
  --max-results 5 \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'jobSummaries[].{JobId:jobId,Status:status,Commit:commitId}'
```

Expected before a release: the account is the approved company account, the
stack is stable, both switches are false, the checked-out commit is reviewed,
and the latest Amplify job for that commit succeeded. A stale audit document is
not evidence; use live control-plane values.

## Local and CI gate

Run the repository gate before creating a deployment change set:

```bash
npm ci
npm run lint
npm test
npm run build
npm run security:artifacts

sam validate --lint \
  --region eu-west-2 \
  --template-file infrastructure/template.yaml
sam build --template-file infrastructure/template.yaml

sam validate --lint \
  --region eu-west-2 \
  --template-file infrastructure/waitlist-backend/template.yaml
sam build --template-file infrastructure/waitlist-backend/template.yaml
```

The pull request and exact merge commit must also pass the GitHub **Full release
gate** with zero annotations. Do not deploy a local-only or unmerged commit.
The detailed scanner and dependency expectations are in the
[release security gates](./release-security-gates.md).

## Backend deployment and change-set review

`infrastructure/waitlist-backend/template.yaml` is the deployed design. The
broader `infrastructure/template.yaml` remains a validated reference design and
must not be substituted into this stack.

Create a SAM change set with `--no-execute-changeset` using the protected
deployment workflow described in the
[backend deployment guide](../../infrastructure/waitlist-backend/README.md).
Supply private recipient, pepper and operator mailbox values only from the
approved secret/workflow source; never put them in a shell-history example,
repository file or issue. Keep unchanged parameters on their previous values.

Review the generated change set before execution:

Replace the all-caps placeholder only with the exact name produced by the
reviewed deployment workflow. Leaving it unchanged fails safely.

```bash
aws cloudformation describe-change-set \
  --stack-name job-seeker-copilot-waitlist \
  --change-set-name REVIEWED_CHANGE_SET_NAME \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{Status:Status,ExecutionStatus:ExecutionStatus,Changes:Changes[*].ResourceChange.{Action:Action,LogicalId:LogicalResourceId,Type:ResourceType,Replacement:Replacement}}'
```

Stop and discard the proposal if it contains any of these:

- removal or replacement of any table, retention policy or protected data
  resource;
- the external subscriber table becoming a stack-managed table;
- a protection, TTL, PITR or log-retention reduction;
- wildcard IAM, a new public route, wildcard CORS or an unexpected recipient;
- a NoEcho value in an output, dashboard, browser variable or log setting;
- contact content storage, subscriber listing or unrelated resource drift; or
- any unexplained replacement, including a conditional replacement.

After reviewer approval, execute only the named reviewed change set and wait for
a stable terminal state:

```bash
aws cloudformation execute-change-set \
  --stack-name job-seeker-copilot-waitlist \
  --change-set-name REVIEWED_CHANGE_SET_NAME \
  --profile jobseekercopilot-deploy \
  --region eu-west-2

aws cloudformation wait stack-update-complete \
  --stack-name job-seeker-copilot-waitlist \
  --profile jobseekercopilot-deploy \
  --region eu-west-2
```

Verify stack status, Lambda update status, alarms, log retention and both safe
switches. Do not enable a journey merely because deployment succeeded.

## Frontend deployment and Amplify verification

Normal integration deployments are merge-only PRs into `develop`. RELEASE-01
promotes the reviewed `develop` commit through a PR into `main`; RELEASE-02
connects and verifies `main` before moving the custom domain. Never rewrite or
force-push either branch.

Amplify `RELEASE` jobs use the latest change on the selected branch. Check the
job's commit and terminal status rather than assuming a webhook succeeded:

```bash
aws amplify list-jobs \
  --app-id d3gd9ezfa3aujn \
  --branch-name develop \
  --max-results 5 \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'jobSummaries[].{JobId:jobId,Status:status,Commit:commitId}'

aws amplify get-job \
  --app-id d3gd9ezfa3aujn \
  --branch-name develop \
  --job-id VERIFIED_JOB_ID \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'job.summary.{Status:status,Commit:commitId,Start:startTime,End:endTime}'
```

Inspect the deployed public configuration and headers after a successful job:

```bash
curl --fail --silent --show-error \
  https://www.jobseekercopilot.com/config/app-config.json

curl --fail --silent --show-error --head \
  https://www.jobseekercopilot.com/
```

The configuration is public but must contain no private recipient, pepper,
credential or placeholder host. Confirm the expected commit, CSP/security
headers, SPA routes and `enableLiveSubmissions=false` until the controlled smoke
window is approved. Use `main` instead of `develop` only after RELEASE-01 has
created and verified that branch; replace `VERIFIED_JOB_ID` with the numeric ID
from the preceding list.

AWS documents the connected-repository job behavior in the
[Amplify `start-job` reference](https://docs.aws.amazon.com/cli/latest/reference/amplify/start-job.html)
and its branch model in the
[Amplify multi-environment guide](https://docs.aws.amazon.com/amplify/latest/userguide/multi-environments.html).

## Rollback

### Frontend and public environment

1. Freeze merges and set `ENABLE_LIVE_SUBMISSIONS=false` in the Amplify console.
   An environment-variable change requires a new deployment before the public
   runtime file changes.
2. Record the failing and last-known-good Amplify job IDs and commit IDs with
   `list-jobs`/`get-job`; do not copy build logs into an issue.
3. Prefer a reviewed Git revert PR, preserving history, then verify the new
   merge commit and Amplify job.
4. If the site itself is unusable and owner approval is recorded, use Amplify's
   **Redeploy this version** action on the verified last-known-good deployment.
   Confirm its original commit and variables first. Do not use a generic
   `RELEASE` job expecting a historical build: AWS defines it as the latest
   change on the branch.
5. Verify canonical pages, runtime config, CSP/security headers and safe switch
   before reopening a test window.

AWS documents the console redeploy action in its
[Amplify deployment guidance](https://docs.aws.amazon.com/amplify/latest/userguide/custom-build-instance.html).

### Backend, Lambda/API and backend environment

CloudFormation owns the API, Lambdas, roles, alarms and stack tables. Do not use
direct Lambda/API edits as rollback.

- While an update is in progress, allow normal CloudFormation rollback unless
  continuing would increase impact. Cancelling an in-progress update requires
  owner approval and still rolls the stack back.
- After a completed but bad update, build the last-known-good reviewed commit
  and create a new change set using the current approved NoEcho values. Review
  it against the same no-delete rules, then execute it as a new update.
- For a parameter-only rollback, use the current template, preserve every
  unchanged parameter with `UsePreviousValue`, and change only the named value.
- If the stack reaches `UPDATE_ROLLBACK_FAILED`, stop. Diagnose the exact failed
  resource and escalate. Do not use `--resources-to-skip` as a routine fix and
  never skip a data/safeguard resource.
- Do not use stack deletion, table restore or record deletion as rollback.

The [CloudFormation change-set guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html)
explains preview-before-execute behavior. The
[update-rollback guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-continueupdaterollback.html)
documents the risk of skipped resources.

### Recipient or notification destination

Keep both submission switches off. Change one NoEcho parameter through a
reviewed parameter-only change set, confirm the new destination privately, run
the documented canary or contact delivery check, and only then remove the old
destination through another reviewed deployment. Follow the exact
[contact recipient procedure](./contact-delivery-verification-2026-07-22.md#changing-the-configured-recipient)
or [alarm destination procedure](./launch-monitoring-and-alarms.md#configuration-changes).

## Waiting-list troubleshooting

Start with response type, route, UTC window, alarm and redacted request ID.
Never use a raw token or address as a search term.

| Symptom | Safe checks | Action |
| --- | --- | --- |
| Form unavailable | Public runtime switch and endpoint; latest Amplify job | Expected while disabled. If unexpected, fix config through reviewed deployment. |
| Submit `429` | Waitlist throttle alarm and aggregate route count | Exclude abuse/service limits before tuning. Do not weaken validation. |
| Submit `5xx` or unavailable | API 5xx and submit-Lambda alarms; stack/Lambda status; SES/DynamoDB health | Keep public switch off, diagnose the fixed error category, then smoke test. |
| Accepted but no confirmation | `ConfirmationSendFailures`, SES account/identity/configuration-set status | Preserve pending recovery; avoid an immediate duplicate send. |
| Invalid or superseded token | `CONFIRMATION_TOKEN_INVALID` count | Direct the visitor to neutral resend. Do not inspect the token. |
| Expired token | `CONFIRMATION_TOKEN_EXPIRED` count | Use neutral resend recovery. |
| Repeat confirmed token | `WAITLIST_ALREADY_CONFIRMED` | Idempotent success; no data change is needed. |
| Temporary confirmation failure | Lambda/DynamoDB error and throttle alarms | Keep token recoverable, resolve dependency health, retry safely. |
| Neutral resend with no mail | Resend issue count and SES send failures | Expected for ineligible/limited states; never disclose state. |

Control-plane commands:

```bash
aws lambda get-function-configuration \
  --function-name JobSeekerCopilotWaitlist \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{State:State,Update:LastUpdateStatus,Runtime:Runtime}'

aws lambda get-function-configuration \
  --function-name JobSeekerCopilotWaitlistConfirm \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{State:State,Update:LastUpdateStatus,Runtime:Runtime}'

aws lambda get-function-configuration \
  --function-name JobSeekerCopilotWaitlistResend \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{State:State,Update:LastUpdateStatus,Runtime:Runtime}'
```

For a real incident only, query the smallest relevant log group and bounded UTC
window for fixed outcomes/request IDs. Use `--limit`; keep the result private.
The OPS-02 dry run used an empty future window to validate syntax without
reading log content. Full behavior and response codes are in the
[registration state machine](./waitlist-registration-state-machine.md) and
[confirmation/resend guide](./waitlist-confirmation-resend.md).

## Contact troubleshooting

The public switch and backend contact switch are independent. A disabled
backend returns the controlled unavailable response and sends nothing.

| Symptom | Safe checks | Action |
| --- | --- | --- |
| Form unavailable | Public runtime switch, backend parameter and endpoint | Keep both off unless a controlled window is approved. |
| Validation rejection | Aggregate `ContactValidationRejections`; browser status; no field values | Correct client/contract mismatch or explain neutral validation. |
| Duplicate accepted once | `ContactDuplicateSuppressions` count | Expected: an identical retry remains suppressed. |
| Dedupe reservation/release failure | Contact dedupe alarms and DynamoDB service health | Keep backend off until the dependency is healthy. |
| SES send/delivery failure | Contact-purpose SES alarms, SES identity/configuration set and event handler state | Keep backend off; do not resend unknown content. |
| Mail arrived with wrong sender/destination | Stop immediately; inspect one controlled message privately | Treat as misrouting/security incident; do not publish headers or addresses. |
| Reply targets sender instead of visitor | Stop immediately; verify controlled Reply-To privately | Fix/review template logic and repeat only one controlled test. |

```bash
aws lambda get-function-configuration \
  --function-name JobSeekerCopilotContact \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{State:State,Update:LastUpdateStatus,Runtime:Runtime}'

aws cloudformation describe-stacks \
  --stack-name job-seeker-copilot-waitlist \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'Stacks[0].Parameters[?ParameterKey==`EnableContactSubmissions`].ParameterValue|[0]'
```

Mailbox checks are private and limited to the single controlled thread. Verify
count, MIME alternatives, visible sender/destination, authenticated relay,
Reply-To and reply target without copying message content or complete addresses.
The [contact API contract](./contact-api-contract.md),
[abuse-control guide](./contact-abuse-protection.md) and
[delivery/recipient procedure](./contact-delivery-verification-2026-07-22.md)
define the full boundary.

## SES bounce, complaint and simulator troubleshooting

Check only account/identity/configuration metadata and aggregate outcomes:

```bash
aws sesv2 get-account \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{Production:ProductionAccessEnabled,Sending:SendingEnabled,Enforcement:EnforcementStatus}'

aws sesv2 get-email-identity \
  --email-identity jobseekercopilot.com \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{Verified:VerifiedForSendingStatus,Dkim:DkimAttributes.Status}'

aws lambda get-function-configuration \
  --function-name JobSeekerCopilotWaitlistSesEvents \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{State:State,Update:LastUpdateStatus,Runtime:Runtime}'
```

Waitlist events may update only an existing exact subscriber; contact-purpose
events emit contact metrics and must never access subscriber storage. Unknown
purpose or malformed events are ignored. Never manually unsuppress a complaint
or bypass a fresh double opt-in.

Use the SES mailbox simulator only under the preconditions and one-message-per-
category limits in the [bounce/complaint runbook](./ses-bounce-complaint-runbook.md#controlled-ses-mailbox-simulator-procedure).
Never substitute a real third-party destination, repeat the exercise for
convenience or publish message IDs/addresses. Reconfirm both switches are off.

## Development and production smoke tests

The [release operations checklist](./release-operations-checklist.md) records
the order and evidence. TEST-01 and TEST-02 own the complete development E2E;
RELEASE-02 owns the production smoke. This runbook defines their safety rules.

### Baseline, always first

1. Verify exact deployed commit, stack status, SES health and all alarms OK.
2. Verify both submission switches false.
3. Verify exact CORS origins and the public runtime config.
4. Record a UTC start and baseline aggregate counts.
5. Use only a company-controlled test identity and non-sensitive contact text.

### Waiting-list controlled window

Enable only the frontend switch for the approved environment. Submit once,
receive one confirmation, confirm once, prove the repeat token is idempotent,
exercise neutral resend/invalid/expired behavior as specified by TEST-01, and
verify the expected status without scanning the table. Disable the frontend
switch immediately after the bounded test.

### Contact controlled window

Keep the frontend off while first enabling the backend alone. Submit one
non-sensitive controlled message and one identical retry. Disable the backend,
then verify exactly one delivery and visitor-directed Reply-To privately. The
frontend may be enabled only for the separately approved browser-path test and
must be turned off again immediately afterwards.

### Production

Do not reuse development evidence. Repeat the minimum smoke through the exact
`main` commit and canonical domain after domain mapping and backend parameters
are production-correct. If any criterion fails, turn both switches off, roll
back the affected layer, create a focused issue and keep the epic open.

## Monitoring, logs and cost

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix job-seeker-copilot-waitlist- \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query '{Count:length(MetricAlarms),InAlarm:length(MetricAlarms[?StateValue==`ALARM`]),WithoutActions:length(MetricAlarms[?length(AlarmActions)==`0`])}'

aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/JobSeekerCopilot \
  --profile jobseekercopilot-deploy \
  --region eu-west-2 \
  --query 'logGroups[].{Name:logGroupName,Retention:retentionInDays,StoredBytes:storedBytes}'

aws budgets describe-notifications-for-budget \
  --account-id APPROVED_ACCOUNT_ID \
  --budget-name 'Monthly Budget' \
  --profile jobseekercopilot-deploy \
  --region us-east-1 \
  --query 'Notifications[].{Type:NotificationType,Threshold:Threshold}'
```

Use the [monitoring guide](./launch-monitoring-and-alarms.md) for thresholds,
canary, response and redacted evidence. Review alarm/custom-metric count, log
stored bytes, SNS delivery and the monthly budget before release and weekly
during launch. Do not add high-cardinality dimensions or retain logs longer
without cost/privacy review. Replace `APPROVED_ACCOUNT_ID` privately with the
verified `get-caller-identity` result; an unchanged placeholder fails safely.

## Evidence preservation and close-out

Preserve only:

- UTC window and environment;
- reviewed PR and exact commit;
- stack/change-set and Amplify job identifiers;
- alarm/metric name, state and aggregate count;
- pass/fail, response category and one redacted request-ID prefix; and
- confirmation that switches returned to false.

Do not preserve mailbox content, complete addresses, contact text, tokens,
headers, SES message IDs, raw events, exception text, table keys/items or secret
values. Keep private operational evidence in the approved private system; public
GitHub evidence contains only redacted conclusions.

Close an incident or deployment only when the affected layer is stable, alarms
are OK, the required smoke passes, evidence is redacted, both switches are in
the intended state and the rollback path still preserves all tables.
