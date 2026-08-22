# Release security gates

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [LANDING-SEC-02 #21](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/21)

## Release policy

Every pull request and push to `develop` or `main` runs the repository's single
release-gate workflow. Any unresolved Critical or High secret, dependency,
static-analysis or artifact finding blocks merge and release. A scanner error,
missing tool, shallow/missing Git history, dependency-registry failure, missing
production build or missing SAM tool is a failed gate rather than a clean result.

Moderate or lower findings require documented applicability, owner, action and
review date. An exception never suppresses a Critical/High result and must not
contain the discovered value, private recipient, provider payload or full raw
scanner report. A real credential finding requires immediate revocation or
rotation outside GitHub, followed by a redacted incident record; deleting the
current file alone is not remediation because history remains in scope.

The workflow has only `contents: read`, disables checkout credential
persistence, uses no AWS or mailbox credential, and never deploys. Official
actions are pinned to immutable commits. The successful job uploads a 30-day
summary containing only the commit and pass/count statements; GitHub logs and
the issue/PR verification comment provide the retained evidence. Candidate
secret reports remain ephemeral and fully redacted.

This follows GitHub's
[least-privilege workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions),
the official [Gitleaks full-checkout example](https://github.com/gitleaks/gitleaks-action),
[npm audit behavior](https://docs.npmjs.com/cli/v11/commands/npm-audit/),
[pip-audit's dependency and exit-code model](https://github.com/pypa/pip-audit),
and [Bandit's Python security checks](https://bandit.readthedocs.io/en/latest/).

## Tools and pinned baseline

| Control | Tool/version | Enforcement |
| --- | --- | --- |
| Full Git history | Gitleaks `8.30.1`; Linux archive SHA-256 `551f6fc…470eb` | Checkout must be non-shallow and have reachable refs/commits; scan uses `--all` and `--redact` |
| Scanner negative path | Gitleaks `dir` | A generated, non-repository fake high-entropy fixture must return the finding exit code |
| npm dependencies | npm lockfile and advisory service | Complete graph fails at High or Critical; production graph is reviewed separately |
| Python packages | pip-audit `2.10.1` and import inventory | Empty packaged-runtime manifest is audited; an unrecognised runtime import fails until explicitly inventoried |
| Python SAST | Bandit `1.9.4` and `compileall` | Both deployed and reference handler trees must have no unresolved finding |
| TypeScript/Angular | project ESLint configuration, unit tests and production compiler | Lint/tests/build all fail closed |
| Infrastructure | AWS SAM CLI `1.163.0` | Both SAM designs must lint-validate and build |
| Browser/artifacts | repository artifact policy and Playwright/axe | No forbidden runtime value; CSP/token/accessibility routes must work in Chromium |

The Gitleaks binary is downloaded only from the
[official `v8.30.1` release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)
and checked against its published archive digest before execution.

## Reproducible commands

Run application checks:

```bash
npm ci
npm test
npm run lint
npm run build
npm run security:artifacts
GITLEAKS_BIN=/path/to/gitleaks npm run security:artifact-secret-scan
python3 -m compileall -q infrastructure/functions infrastructure/tests infrastructure/waitlist-backend/function infrastructure/waitlist-backend/tests
```

With the pinned tools on `PATH`, run security and dependency checks:

```bash
GITLEAKS_BIN=/path/to/gitleaks npm run security:secret-scan:test
GITLEAKS_BIN=/path/to/gitleaks npm run security:secret-scan
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
pip-audit --requirement security/runtime-requirements.txt
npm run security:python-dependencies
bandit -q -r infrastructure/functions infrastructure/waitlist-backend/function
```

Run both infrastructure checks:

```bash
sam validate --lint --template-file infrastructure/template.yaml
sam build --template-file infrastructure/template.yaml
sam validate --lint --template-file infrastructure/waitlist-backend/template.yaml
sam build --template-file infrastructure/waitlist-backend/template.yaml
```

The browser command is documented in `ACCESSIBILITY_TESTING.md`. The CI version
serves only the final production artifact, discards the local request log so the
controlled dummy token is not retained, and fails on CSP console violations or
a token remaining in the visible URL/content.

## Artifact and source boundary

The policy rejects a tracked `.env` file other than `.env.example` and
credential-like private-key/service-account filenames. Gitleaks covers every
reachable revision and the current tree. After the production build, every
textual HTML/JS/CSS/config/manifest artifact is checked for:

- localhost and loopback addresses;
- the deleted feature hostname/path;
- example/placeholder recipients;
- private backend variable names or credential settings; and
- any email address other than the approved public Job Seeker Copilot aliases.

The browser runtime configuration is intentionally public and therefore must
contain only public endpoints, public labels and fail-closed switches. Backend
recipient, deduplication pepper, subscriber key material, AWS values and mailbox
details must never enter it.

## Dependency findings updated 15 August 2026

- The production npm graph reported zero vulnerabilities.
- The full graph also reports zero vulnerabilities after moving the Angular 21
  framework to `21.2.20`, its build/CLI/SSR tooling to `21.2.21`, and refreshing
  the lockfile to the compatible patched transitive releases. The previous
  `fast-uri` and development-only `@hono/node-server` exceptions are closed.
- `npm ci --ignore-scripts` and `npm audit --audit-level=high` were rerun from
  the committed lockfile before the complete test, production build and
  browser-accessibility checks. The normal release workflow must still use
  `npm ci` and preserve the High/Critical failure threshold.
- Both Lambda packages contain zero PyPI dependencies. `boto3`/`botocore` are
  supplied by the managed AWS Lambda Python 3.12 runtime; the import inventory
  fails if another external runtime module appears. The empty package manifest
  is still passed to pip-audit to prove the declared packaged set is empty; the
  import policy fails if a new external runtime module appears without an
  explicit policy update.
- Bandit identified the CloudFormation response callback as a generic URL-open
  risk. The callback now requires HTTPS, an AWS hostname, no user information,
  the standard port and a non-empty path before the one documented Bandit call;
  focused tests reject non-AWS, HTTP, user-info and alternate-port targets.

## Triage and exception procedure

1. Stop promotion and keep public submission switches unchanged.
2. Record only tool, rule/advisory ID, severity, affected component and a
   redacted fingerprint/path. Never paste the matched value.
3. Confirm reachability and whether the dependency is shipped, development-only
   or managed by the runtime. Scanner errors remain failures.
4. Resolve Critical/High before release. If remediation needs another owner,
   create a blocking issue and leave the launch task/epic open.
5. A Moderate-or-lower exception needs rationale, owner, expiry/review date and
   a safe compensating control. Re-check it in RELEASE-01.
6. Re-run the complete workflow after remediation. Retain only the redacted
   summary and link it from the issue/PR.
