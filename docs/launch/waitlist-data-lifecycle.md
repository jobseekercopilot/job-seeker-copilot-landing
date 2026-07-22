# Waitlist data lifecycle and recovery controls

Verified on 22 July 2026 for the deployed double-opt-in stack in `eu-west-2`.
The verification read DynamoDB control-plane metadata only. It did not scan,
export, mutate, or delete subscriber items and did not send email.

## State lifecycle

| State | Entry and permitted transition | Retention and send behavior |
| --- | --- | --- |
| `PENDING` | A single transaction conditionally creates a new subscriber and active hashed-token record only when neither key exists. Confirmation may change it to `CONFIRMED`; SES bounce/complaint processing may suppress it. | Has `pendingExpiresAt` (30 days by default). Resend is rate-limited and can rotate only the current token. |
| `CONFIRMED` | A transaction requires current `PENDING` state, matching token hash, unexpired subscriber/token records, and an `ACTIVE` token. | Confirmation removes `pendingExpiresAt`, token/expiry fields, and send controls, preserving the subscriber until unsubscribe, approved erasure, or end of purpose. Submit/resend cannot reactivate or disclose it. |
| `UNSUBSCRIBED` | Reserved for an approved unsubscribe process. The current public stack has no unsubscribe route; no operator should improvise this transition. | Never receives confirmation or future marketing. Retain only the minimum suppression record for the approved period; re-subscription requires fresh explicit consent and confirmation. |
| `BOUNCED` | A validated SES permanent-bounce event conditionally updates an existing subscriber only when it is not already unsubscribed, complained, or bounced, then removes active subscriber token/expiry and pending TTL fields. Transient and undetermined bounces do not enter this state. | Suppressed from resend and future delivery. A later complaint may strengthen this state. Retain only as long as operationally and legally necessary. |
| `COMPLAINED` | A validated SES complaint conditionally updates an existing subscriber only when it is not already unsubscribed or complained, then removes active subscriber token/expiry and pending TTL fields. | Suppressed from resend and future delivery. A later bounce cannot downgrade this state, and no SES event overrides `UNSUBSCRIBED`. Retain only as long as necessary. |

Delivery metadata updates require `attribute_exists(email)`, so an SES event
cannot create a subscriber. Submission returns the same neutral `202` contract
for existing states and resend returns the same neutral result for unknown,
confirmed, unsubscribed, bounced, and complained records.

The event handler also requires the direct SES source, matching EventBridge and
SES event types, the configured configuration-set tag, the exact
`waitlist-confirmation` purpose and one valid destination. Contact and malformed
events stop before subscriber-table access. Conditional terminal transitions
make duplicates and out-of-order events safe no-ops. See the
[SES bounce and complaint runbook](./ses-bounce-complaint-runbook.md) for the
monitoring, investigation, simulator and recovery procedures.

## Race and token invariants

- Creation uses one `TransactWriteItems` request with
  `attribute_not_exists(email)` and `attribute_not_exists(tokenHash)`. A race
  cannot leave a partial subscriber/token pair.
- Confirmation atomically updates both tables. Concurrent or repeated losers
  observe the `USED` token tombstone and return the idempotent already-confirmed
  result; an expired or superseded token cannot update subscriber state.
- Resend compares status, current token hash, last-attempt timestamp, and send
  count. It conditionally updates the subscriber, deletes the old token, and
  creates the new token in one transaction. A concurrent loser sends no email.
- Raw random tokens are never stored. Active token records expire through
  `deleteAfter`; confirmation removes the email and keeps a `USED` tombstone for
  seven days by default. Superseded token records are transactionally deleted.
- `pendingExpiresAt` is an epoch-seconds Number only on unconfirmed records.
  DynamoDB TTL is asynchronous. Confirmation removes it in the same atomic
  transaction that writes `CONFIRMED`, so TTL cannot expire a confirmed record.

The backend tests exercise conditional-create conflicts, confirmation cleanup,
expired/repeated/concurrent confirmation, resend cooldown/window limits,
atomic rotation, suppressed-state behavior, and concurrent resend failure.

## Table safeguards

| Table | Ownership | TTL | Recovery and deletion | Encryption |
| --- | --- | --- | --- | --- |
| `JobSeekerCopilotWaitlist` | External parameter; absent from CloudFormation resources | `pendingExpiresAt` | PITR and deletion protection enabled by an enable-only custom resource | DynamoDB default AWS-owned encryption at rest |
| `JobSeekerCopilotWaitlistTokens` | Stack-managed with `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` | `deleteAfter` | PITR and deletion protection declared in CloudFormation | SSE enabled in CloudFormation |

The custom resource can only describe metadata and enable TTL, PITR, or
deletion protection on the exact subscriber-table ARN. It has no item read,
scan, export, write, or delete permission. It refuses to alter a conflicting
TTL attribute. Its CloudFormation Delete event is a no-op and its failures use
a fixed sanitized reason. Application roles likewise target the exact tables
and operations needed by submit, confirm, resend, and SES-event handlers; none
has `Scan`, wildcard DynamoDB access, or a subscriber-list route.

## Change, rollback, and no-delete runbook

Before every deployment, inspect the expanded CloudFormation change set and
stop if it contains either table's replacement/removal, a Retain-policy removal,
a protection disablement, a TTL attribute change, wildcard permissions, or an
unexpected data route. The subscriber table must never appear as a managed
CloudFormation table resource.

After deployment, verify only control-plane metadata: table status, key schema,
billing mode, encryption, TTL attribute/status, PITR status/window, deletion
protection, stack resources/events, and exact IAM policies. Do not use `Scan`,
export records, or create/delete a test subscriber for a metadata audit.

Rollback does not disable safeguards: custom-resource updates are enable-only,
Delete is a no-op, the subscriber table is external, and the token table is
retained. Stack deletion is not a personal-data deletion workflow.

For recovery, restore PITR to a new protected table, verify metadata and the
minimum separately authorised exact keys, and require an approved cutover plan.
Never overwrite or delete the protected source as part of restore validation.
The detailed operator procedure is in `infrastructure/docs/data-operations.md`.
