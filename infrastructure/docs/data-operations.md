# Personal-data operations

These procedures require explicit owner authorisation, an audited operator
identity, and a positively verified AWS account, region, and exact table name.
Routine launch verification is metadata-only: do not scan, export, mutate, or
delete subscriber records.

## Know which schema is deployed

The deployed double-opt-in stack uses the external
`JobSeekerCopilotWaitlist` table, keyed by the normalized plaintext `email`
attribute, plus a retained `JobSeekerCopilotWaitlistTokens` table keyed by
`tokenHash`. The broader, currently undeployed `infrastructure/template.yaml`
design instead declares an HMAC-keyed `subscriberId` table.

`infrastructure/scripts/subscriber_admin.py` is for that future HMAC schema
only. **Do not run it against `JobSeekerCopilotWaitlist`**: its key and status
assumptions do not match the deployed table.

## Exact lookup, export, unsubscribe, or erasure

There is no approved deployed-schema bulk administration helper. When a data
subject request is authorised, use an audited operator role and an exact
`GetItem` in the DynamoDB console, with the email entered interactively so it
does not enter shell history. Never use `Scan` for an exact-address request.

Any export, unsubscribe, or deletion needs a separately reviewed runbook and
two-person confirmation of account, region, table, and exact key. Prefer a
future tested helper that prompts for the key, redacts routine output, refuses
broad operations, and requires an explicit mutation flag. An unsubscribe must
retain the minimal suppression state and remove active confirmation metadata;
it must never silently reactivate through submit or resend. An erasure review
must also cover PITR recovery points, prior approved exports, CloudWatch logs,
SES suppression/bounce systems, and any received contact email. Record what is
removed immediately and what ages out under an applicable retention period.

## Backup and restore

PITR restores DynamoDB data into a **new table**; it does not overwrite the
source. For an authorised recovery:

1. record the incident, approved recovery timestamp, source-table ARN, account,
   and region without copying subscriber data into the ticket;
2. restore to a clearly named, access-restricted recovery table;
3. enable deletion protection, confirm encryption, PITR/backup settings, TTL
   attribute, key schema, billing mode, and tags on the recovery table;
4. validate with metadata and only the minimum approved exact-key checks—never
   a routine scan or export;
5. prepare and approve a separate application cutover and rollback plan;
6. retain the original protected source until recovery is verified and an
   explicit retention/deletion decision is approved.

Never delete the source table or disable its deletion protection to test a
restore. A recovery table is personal data and needs the same access controls.

## Contact records

Contact DynamoDB storage is disabled by default. If enabled, records are keyed by the opaque `submissionId` emitted only as a short prefix in logs and carry a TTL. Use the AWS console/CLI under an approved operator role to export or delete an exact submission ID. Also search the private recipient mailbox because email delivery is the primary contact path.

Never use broad table scans for routine requests if the record identifier is known. Never paste message bodies, emails, tokens or peppers into tickets or application logs.

## Retention and no-delete operations

DynamoDB TTL is asynchronous and may delete an expired item several days after
its epoch. The owner must approve final retention periods and periodically
review confirmed/suppressed records, retained tables, recovery points, exports,
and logs.

The deployed stack does not own the external subscriber table. Its custom
resource has an enable-only create/update path and a no-op delete path. The
token table has CloudFormation Retain policies. Both tables have deletion
protection. Therefore stack rollback or deletion must leave table data in
place. Stop any change set containing a table replacement/removal, a Retain
policy removal, deletion-protection disablement, or a TTL attribute change.
Deleting a table, recovery point, or export is a separate destructive action
requiring explicit approval; it is never part of normal application teardown.
