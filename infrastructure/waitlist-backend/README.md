# Production waitlist backend

This isolated AWS SAM stack implements `POST /waitlist` for the existing `JobSeekerCopilotWaitlist` DynamoDB table in `eu-west-2`. It does not create, replace or delete the table and does not deploy the broader experimental infrastructure in `infrastructure/template.yaml`.

## Security and persistence

- The Lambda execution role can call only `dynamodb:PutItem` on the named table and write to its own CloudWatch log group.
- Each write uses `attribute_not_exists(email)` so an existing partition key is never overwritten.
- Emails are validated, trimmed and lowercased before persistence.
- Logs contain request IDs and outcomes, never email addresses or request bodies.
- API Gateway throttles the route, and Lambda enforces origin-specific CORS without `*`.
- Development accepts only `https://develop.<AmplifyAppId>.amplifyapp.com`; production accepts only `https://jobseekercopilot.com`.

## Validate locally

```bash
python3 -m unittest discover -s infrastructure/waitlist-backend/tests -v
sam validate --lint --template-file infrastructure/waitlist-backend/template.yaml
sam build --template-file infrastructure/waitlist-backend/template.yaml
```

## Deployment

First verify the authenticated AWS account and existing table:

```bash
aws sts get-caller-identity
aws dynamodb describe-table --table-name JobSeekerCopilotWaitlist --region eu-west-2
```

Deploy development CORS first:

```bash
sam build --template-file infrastructure/waitlist-backend/template.yaml
sam deploy \
  --stack-name job-seeker-copilot-waitlist \
  --region eu-west-2 \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides EnvironmentName=development WaitlistTableName=JobSeekerCopilotWaitlist AmplifyBranchName=develop ProductionOrigin=https://jobseekercopilot.com \
  --no-fail-on-empty-changeset
```

Read the deployed endpoint and resource names:

```bash
aws cloudformation describe-stacks \
  --stack-name job-seeker-copilot-waitlist \
  --region eu-west-2 \
  --query 'Stacks[0].Outputs'
```

Set the Amplify runtime variables only after a real persistence test succeeds:

```text
ENABLE_LIVE_SUBMISSIONS=true
WAITLIST_API_URL=<ApiEndpoint output>
```

Run `npm run config:generate` during the Amplify build as already configured. To switch CORS to production later, redeploy the same stack with `EnvironmentName=production`; do not use `*` or add the API URL directly to Angular source.
