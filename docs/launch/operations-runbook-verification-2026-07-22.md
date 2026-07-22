# Operations runbook verification — 22 July 2026

Tracking: [OPS-02 #23](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/23)

## Result

PASS. The consolidated
[operations and troubleshooting runbook](./operations-and-troubleshooting-runbook.md)
and [release operations checklist](./release-operations-checklist.md) were
checked against the current development control plane. The exercise did not
enable a public journey, submit a form, send an email, read a mailbox, read log
content or access subscriber/contact records.

Both public submission switches remained `false` throughout.

## Read-only command dry run

The documented commands were run from the reviewed development worktree using
the approved profile and Region. Results are intentionally limited to
control-plane status and aggregate counts:

| Command family | Redacted result |
| --- | --- |
| Git preflight | Clean reviewed base identified; work continued on the dedicated OPS-02 feature branch. |
| AWS identity | Approved company account matched. |
| CloudFormation stack/switch | Stack `UPDATE_COMPLETE`; backend contact switch `false`. |
| Amplify app/switch | Connected web app; current production branch `develop`; public switch `false`. |
| Amplify jobs | Latest job succeeded for the exact current merge commit. |
| Public runtime/headers | Canonical runtime loaded, reported production mode with live submissions false and required public endpoints; HTTP 200 with CSP, HSTS and frame control. |
| Lambda metadata | Submit, confirm, resend, contact and SES-event functions all `Active` with successful updates on Python 3.12. |
| SES metadata | Production access and sending enabled; enforcement healthy; domain verified; DKIM `SUCCESS`. |
| CloudWatch | 30 alarms, zero in ALARM and zero without actions. |
| Logs | Six journey Lambda groups reported 30-day retention; no events were read. The API group's 30-day retention had already been verified during OPS-01. |
| Budget | Actual 85%, actual 100% and forecast 100% notifications present; no subscriber endpoint was retrieved. |

The change-set describe/execute/wait sequence and expanded resource review were
also exercised immediately before OPS-02 during the reviewed OPS-01 development
stack update. That run completed without resource removal, table change,
IAM-role change or unconditional replacement. OPS-02 did not create another
change set merely to retest syntax.

## Repository validation

- 82 frontend tests passed.
- 6 runtime-configuration tests passed.
- 5 browser-security policy tests passed.
- 4 release security-gate tests passed.
- The operations-runbook policy test passed, including required-section,
  no-destructive-command and local-link checks.
- 55 deployed-backend and 21 reference-backend tests passed.
- Lint, production build and prerender passed; 12 HTML files received a
  route-specific CSP and 11 routes prerendered.
- The production artifact policy passed for 203 tracked paths, 120 production
  source files and 32 text artifacts.
- Browser accessibility/CSP checks passed for 11 routes at desktop and mobile
  widths.
- Both SAM templates validated and built.
- Current-tree, production-artifact and complete-history Gitleaks scans passed.
- Production npm dependencies reported zero vulnerabilities. The full graph
  retained the three already-documented Moderate development-only findings and
  zero High/Critical findings.
- The empty Python package manifest had no known vulnerability; the runtime
  import policy, Bandit and Python compilation passed.

## Tabletop walkthrough

### Scenario A — bad frontend deployment

PASS. The operator freezes merges, verifies failing/last-good jobs by commit,
turns the public switch off, and uses a history-preserving revert PR. An urgent
console redeploy is allowed only for a verified previous version with owner
approval. The walkthrough rejected a generic RELEASE job as historical
rollback because AWS defines it as the branch's latest change.

### Scenario B — backend update failure

PASS. The operator preserves the automatic CloudFormation rollback path,
reviews stack events/control-plane status, and redeploys a known-good template
only through a new change set. The walkthrough rejected stack/table deletion,
direct Lambda edits and routine resource skipping. `UPDATE_ROLLBACK_FAILED`
requires escalation and exact-resource diagnosis.

### Scenario C — contact misrouting or Reply-To failure

PASS. Both public and backend contact switches are closed, the single controlled
thread is checked privately, and the last approved recipient is restored only
through a one-parameter NoEcho change set. No mailbox content, header dump,
complete address or contact text enters evidence; no table is touched.

### Scenario D — waiting-list delivery/confirmation outage

PASS. The public switch closes, aggregate API/Lambda/DynamoDB/SES signals and a
bounded request ID lead diagnosis, pending recovery remains intact, and the
operator does not scan by address/token or trigger immediate duplicate mail.
Neutral resend and idempotent repeat-confirmation behavior remain unchanged.

### Scenario E — bounce/complaint or notification-path incident

PASS. Terminal suppression remains in place; no manual unsuppression occurs.
Only the dedicated SES simulator procedure may create controlled bounce or
complaint events. The alarm canary remains count-only and independent of real
journeys. Evidence contains only UTC windows, aggregate counts and states.

## Review and evidence boundary

The runbook requires a release operator and second reviewer for production
change sets, rollback, recipient changes and controlled email windows. The pull
request and exact post-merge CI gate provide the documented code-review boundary
for this runbook revision; live execution still requires the named second
reviewer at the decision point.

No address, token, mailbox content, contact text, provider payload, SES message
ID, secret, table key/item or raw log event is present in this verification.
