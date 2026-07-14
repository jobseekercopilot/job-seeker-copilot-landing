# Personal-data operations

These are owner-authorised operational procedures for a future deployed stack. They do nothing during local development. Access should be limited, audited and performed in the correct AWS account/region.

## Waitlist lookup and export

The table is keyed by an HMAC rather than email, so an operator needs the same protected `SubscriberHashPepper` used by the stack. Use the helper from the landing-project directory:

```bash
python3 infrastructure/scripts/subscriber_admin.py lookup --table <physical-table-name>
python3 infrastructure/scripts/subscriber_admin.py export --table <physical-table-name> --output <approved-secure-path>
```

The helper prompts for the email so it does not have to appear in shell history. Supply the pepper through `SUBSCRIBER_HASH_PEPPER` only in the authorised operator environment. `export` writes one matching record to a new file and refuses to overwrite an existing file. Treat exports as personal data, transfer them securely and delete them when the request is complete.

## Unsubscribe or delete

```bash
python3 infrastructure/scripts/subscriber_admin.py unsubscribe --table <physical-table-name> --confirm
python3 infrastructure/scripts/subscriber_admin.py delete --table <physical-table-name> --confirm
```

Unsubscribe retains a minimal record/status until normal retention cleanup; delete removes the live-table record. A complete erasure review must also consider DynamoDB backups/PITR, exports, CloudWatch logs, SES suppression/bounce systems and any received email in the contact mailbox. Document what can be erased immediately and what expires under backup retention.

## Contact records

Contact DynamoDB storage is disabled by default. If enabled, records are keyed by the opaque `submissionId` emitted only as a short prefix in logs and carry a TTL. Use the AWS console/CLI under an approved operator role to export or delete an exact submission ID. Also search the private recipient mailbox because email delivery is the primary contact path.

Never use broad table scans for routine requests if the record identifier is known. Never paste message bodies, emails, tokens or peppers into tickets or application logs.

## Retention and teardown

DynamoDB TTL is not immediate. The owner must approve final retention periods before launch and periodically review confirmed/unsubscribed records, retained tables, backups and logs. Stack deletion does not delete either personal-data table. Follow the infrastructure README teardown checklist and require explicit approval before deleting a table or backup.
