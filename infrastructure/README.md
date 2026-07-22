# Landing-page AWS infrastructure

This directory contains two SAM designs. `waitlist-backend/` is the deployed
landing stack and now owns the production-shaped double-opt-in and content-free
contact endpoints. Its contact deduplication store contains only short-lived
HMAC fingerprints, not enquiries. The top-level `template.yaml` and
`functions/` are the broader, still-undeployed
HMAC/unsubscribe/optional-contact-storage design.
Normal frontend development and unit tests need no AWS credentials, SAM CLI or
Docker.

## Resources defined

- one API Gateway HTTP API stage (`v1`) with JSON access logs and route/default throttles;
- waiting-list Lambda functions for submit, confirm, resend and unsubscribe;
- one contact Lambda function and a narrow CORS preflight function;
- an on-demand, encrypted, point-in-time-recoverable waitlist DynamoDB table with token-hash indexes and TTL;
- an optional contact DynamoDB table, disabled by default;
- scoped IAM statements for each function and SES identity;
- retained personal-data tables, even when the stack is removed.

The stack never creates an SES identity or public domain. It grants send permission only for deployment-supplied verified sender identities.

Every send must use the deployment-supplied SES configuration set and one
internally controlled `message-purpose` tag. Supported purposes are
`waitlist-confirmation`, `waitlist-confirmed`, `contact-enquiry` and
`contact-acknowledgement`. Browser input cannot select a purpose, sender,
recipient, configuration set or template. This lets the SES event pipeline
separate the two public journeys without recording message content.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/v1/waitlist` | Validate a new request and send a confirmation email. |
| `GET` | `/v1/waitlist/confirm?token=…` | Consume a single confirmation token. |
| `POST` | `/v1/waitlist/resend` | Replace a confirmation token, limited to once per minute per record. |
| `GET` | `/v1/waitlist/unsubscribe?token=…` | Unsubscribe without putting an email in the URL. |
| `POST` | `/v1/contact` | Send a contact message through SES. |
| `OPTIONS` | `/v1/{proxy+}` | Permit only exact configured origins. |

All responses use `{ success, code, message }`. Request bodies are size-limited and field allow-listed. Email, text lengths, whitespace-only content, long repeated characters, content type, honeypots and minimum completion time are validated server-side. The timing value can be forged and is intentionally treated only as a weak signal.

API throttling is aggregate protection, not a complete anti-abuse system. Before a high-traffic launch, consider AWS WAF rate-based rules, a privacy-reviewed CAPTCHA/challenge provider and alarms for throttles, Lambda errors, SES bounces and complaints. Never trust a frontend-only control.

## Data model and privacy

The waitlist primary key is an HMAC of the normalised email using the deployment secret `SubscriberHashPepper`. Confirmation and unsubscribe indexes contain SHA-256 token hashes; raw tokens are sent in links but are not stored. Pending records have a DynamoDB TTL. Confirmed and unsubscribed records remain until an authorised retention/deletion process removes them.

Contact messages are delivered to a private deployment parameter. Storage is disabled by default. When enabled, contact records receive a configurable TTL. Logs contain request ID, operation, status, category, duration and only a short opaque record-ID prefix—never email, message body or raw token. API Gateway access logs omit request/response bodies.

DynamoDB TTL deletion is asynchronous. Retained tables and backups must be included in privacy retention and deletion procedures.

## Email and domain prerequisites

Before enabling live submissions:

1. choose monitored waitlist sender, contact sender, reply-to, support and private contact-recipient addresses;
2. verify the sender address or preferably its domain in Amazon SES in the deployment region;
3. publish SES DKIM records and configure SPF and DMARC for the sending domain;
4. while SES is in its sandbox, verify every recipient used in testing;
5. request SES production access before accepting arbitrary public addresses;
6. configure bounce and complaint notifications/suppression handling before launch;
7. test plain-text and HTML templates, unsubscribe, accessibility and common mail clients.

The waitlist handler fails closed before storing a new record if live submissions or confirmation email is disabled/misconfigured. Contact email uses the visitor only as `Reply-To`, preventing sender spoofing.

## Validate and build locally

Install AWS SAM CLI only when infrastructure work begins. It is not currently installed in this workspace. Syntax/unit checks that require no AWS account are:

```bash
python3 -m unittest discover -s infrastructure/tests -v
sam validate --template-file infrastructure/template.yaml --lint
sam build --template-file infrastructure/template.yaml
```

During implementation, `template.yaml` passed `cfn-lint` 1.53.0 with AWS SAM Translator 1.111.0 as an account-free semantic validation. `sam validate --lint` may require configured AWS credentials for CloudFormation linting. `sam build` should not require Docker because the functions have no third-party package manifest and use the runtime-provided AWS SDK. No command above deploys resources.

## First authorised deployment (future only)

Do not run this section until an owner explicitly authorises deployment and supplies final values.

Prerequisites are an owner-approved AWS account, a selected AWS region, AWS CLI credentials for an IAM principal allowed to create the defined CloudFormation/SAM resources, and the AWS SAM CLI. Configure and verify the intended CLI profile/account before any command that can deploy or delete.

Use a strong random pepper (at least 32 characters) kept in an approved secret store or protected deployment workflow. Do not put it in `samconfig.toml`, source control or frontend/Amplify variables. First deployment:

```bash
sam build --template-file infrastructure/template.yaml
sam deploy --guided
```

The guided prompts must provide environment/stack/region and every parameter without a default. Start with `EnableLiveSubmissions=false`, verify resources and SES, then update deliberately. Capture the `ApiBaseUrl` output and form route URLs as Amplify public runtime variables. Keep test and production stacks, tables, peppers and sender identities separate.

Required owner-supplied parameters include exact HTTPS origins, public site URL,
hash pepper, verified sender addresses, private recipient, reply-to, public
support address and the existing SES configuration-set name. The template
contains no account IDs, regions, domains, emails or secrets.

The production mailbox mapping is:

- `WaitlistSenderEmail`: `updates@jobseekercopilot.com`
- `ContactSenderEmail` and `ContactRecipientEmail`: `hello@jobseekercopilot.com`
- `ReplyToEmail` and `PublicSupportEmail`: `support@jobseekercopilot.com`

Confirm that each sender identity is verified in the deployment region and each recipient is monitored before enabling live submissions.

## Teardown and retained data

After an authorised deployment, SAM-managed compute/API resources can be removed with:

```bash
sam delete --stack-name <approved-stack-name> --region <approved-region>
```

Both personal-data tables use `DeletionPolicy: Retain` and will intentionally survive stack deletion. Before deleting them manually:

1. identify the exact physical tables from stack outputs/resources;
2. confirm retention, legal-hold and data-export requirements with the owner;
3. create and verify any required DynamoDB backup/export;
4. delete retained tables only with explicit approval;
5. review CloudWatch log groups, DynamoDB backups/PITR, SES suppression data and monitoring destinations separately.

See [docs/data-operations.md](./docs/data-operations.md) for record access, export, unsubscribe and deletion.

## Cost and operational notes

HTTP API, Lambda, DynamoDB on-demand, CloudWatch Logs/X-Ray and SES are usage-billed. DynamoDB point-in-time recovery, retained tables/backups and logs continue to cost money even with no traffic or after stack deletion. Amplify Hosting is billed separately. Set budgets and alarms before deployment; review the AWS pricing pages for the chosen region because prices change.

Common launch failures are an unverified SES identity, sandbox recipient restriction, sender identity in the wrong region, mismatched exact CORS origin, disabled live-submission flag, stale runtime config, missing SPA rewrites or an expired confirmation link. Check standard response codes and privacy-safe structured logs first.
