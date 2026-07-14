# Integration tests (inactive)

No integration test runs by default and no test creates AWS resources.

After an authorised test-stack deployment, exercise each route with a disposable, SES-approved address and an exact value from `AllowedOrigins`. Confirm the following manually before production:

1. a new subscription is `pending`, sends one confirmation email and becomes `confirmed` only after the link is opened;
2. the same confirmation link is single-use and a resend invalidates the previous link;
3. unsubscribe works without exposing an email address in the URL;
4. contact delivery reaches the configured mailbox and uses the visitor address only as `Reply-To`;
5. disallowed origins, malformed JSON, honeypots and throttled requests fail without storing data;
6. CloudWatch logs contain request IDs and categories but no email, message body or raw token.

Delete the disposable records and test stack when verification is complete. See the infrastructure README for teardown and retained-table handling.
