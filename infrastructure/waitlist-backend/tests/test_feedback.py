import json
import os
import stat
import subprocess
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
FUNCTION = ROOT / "function"
ADMIN = ROOT / "admin"
TEMPLATE = ROOT / "template.yaml"
sys.path.insert(0, str(FUNCTION))
sys.path.insert(0, str(ADMIN))

import feedback  # noqa: E402
import feedback_triage  # noqa: E402


class Context:
    aws_request_id = "feedback-test-request"


ORIGIN = "https://client.example.test"
BASE_ENV = {
    "ENVIRONMENT_NAME": "test",
    "ENABLE_FEEDBACK_SUBMISSIONS": "true",
    "FEEDBACK_CLIENT_ORIGIN": ORIGIN,
    "FEEDBACK_TABLE_NAME": "feedback-test",
    "FEEDBACK_DEDUPE_PEPPER": "test-only-feedback-dedupe-pepper-value-1234567890",
    "FEEDBACK_RETENTION_SECONDS": "7776000",
    "FEEDBACK_MINIMUM_FORM_COMPLETION_MS": "1200",
}


def payload(**overrides):
    value = {
        "category": "BROKEN",
        "title": "The saved jobs panel does not open",
        "description": "Selecting the saved jobs panel leaves the current page unchanged.",
        "reproductionSteps": "Open the dashboard.\nChoose Saved jobs.",
        "pagePath": "/dashboard",
        "appBuild": "v1.1.0-abc1234",
        "diagnosticsConsent": False,
        "diagnostics": None,
        "idempotencyKey": _uuid_fixture(),
        "website": "",
        "formStartedAt": 1_998_000,
    }
    value.update(overrides)
    return value


def _uuid_fixture(version="4"):
    return "-".join(("00000000", "0000", f"{version}000", "8000", "000000000000"))


def event(value, *, origin=ORIGIN, method="POST", raw=None, content_type="application/json"):
    return {
        "requestContext": {"http": {"method": method}},
        "headers": {"content-type": content_type, "origin": origin},
        "body": raw if raw is not None else json.dumps(value),
    }


def response_body(result):
    return json.loads(result["body"])


def transaction_cancelled():
    error = RuntimeError("conditional conflict")
    error.response = {"Error": {"Code": "TransactionCanceledException"}}
    return error


@patch.dict(os.environ, BASE_ENV, clear=True)
class FeedbackHandlerTests(unittest.TestCase):
    def test_accepts_exact_bounded_schema_and_stores_server_owned_metadata(self):
        ddb = Mock()
        with patch.object(feedback, "dynamodb_client", return_value=ddb), \
             patch.object(feedback.time, "time", return_value=2_000), \
             patch.object(feedback.secrets, "token_hex", return_value="a1b2c3d4e5f60708"):
            result = feedback.handler(event(payload()), Context())

        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(result["headers"]["Access-Control-Allow-Origin"], ORIGIN)
        self.assertNotIn("Access-Control-Allow-Credentials", result["headers"])
        self.assertEqual(response_body(result), {
            "success": True,
            "code": "FEEDBACK_ACCEPTED",
            "message": "Thank you — your feedback has been saved for review.",
            "reference": "FB-A1B2C3D4E5F60708",
        })

        writes = ddb.transact_write_items.call_args.kwargs["TransactItems"]
        self.assertEqual(len(writes), 3)
        report = writes[0]["Put"]["Item"]
        self.assertEqual(report["recordKey"], {"S": "REPORT#FB-A1B2C3D4E5F60708"})
        self.assertEqual(report["status"], {"S": "NEW"})
        self.assertEqual(report["source"], {"S": "public-tester"})
        self.assertEqual(report["appBuild"], {"S": "v1.1.0-abc1234"})
        self.assertEqual(report["submittedAt"], {"S": "1970-01-01T00:33:20Z"})
        self.assertEqual(report["deleteAfter"], {"N": str(2_000 + 7_776_000)})
        self.assertNotIn("formStartedAt", report)
        self.assertNotIn("website", report)
        self.assertNotIn("idempotencyKey", report)
        self.assertNotIn("email", json.dumps(writes).lower())
        for write in writes:
            self.assertEqual(
                write["Put"]["ConditionExpression"], "attribute_not_exists(recordKey)"
            )

    def test_stores_only_consented_coarse_diagnostics(self):
        ddb = Mock()
        diagnostics = {
            "browserFamily": "Firefox",
            "browserMajor": 141,
            "deviceClass": "desktop",
        }
        with patch.object(feedback, "dynamodb_client", return_value=ddb), \
             patch.object(feedback.time, "time", return_value=2_000):
            result = feedback.handler(event(payload(
                diagnosticsConsent=True, diagnostics=diagnostics
            )), Context())
        self.assertEqual(result["statusCode"], 202)
        stored = ddb.transact_write_items.call_args.kwargs["TransactItems"][0]["Put"]["Item"]
        self.assertEqual(stored["diagnostics"]["M"]["browserFamily"], {"S": "Firefox"})
        self.assertEqual(stored["diagnostics"]["M"]["browserMajor"], {"N": "141"})
        self.assertNotIn("userAgent", json.dumps(stored))

    def test_duplicate_idempotency_or_content_returns_the_existing_reference(self):
        ddb = Mock()
        ddb.transact_write_items.side_effect = transaction_cancelled()
        ddb.get_item.return_value = {
            "Item": {"reference": {"S": "FB-0011223344556677"}}
        }
        with patch.object(feedback, "dynamodb_client", return_value=ddb), \
             patch.object(feedback.time, "time", return_value=2_000):
            result = feedback.handler(event(payload()), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(response_body(result)["reference"], "FB-0011223344556677")
        self.assertEqual(ddb.get_item.call_count, 1)

    def test_rejects_extra_fields_bounds_paths_diagnostics_and_sensitive_content(self):
        invalid = [
            payload(extra="not allowed"),
            payload(category="BUG"),
            payload(title="tiny"[:4]),
            payload(description="short"),
            payload(reproductionSteps="x" * 1_201),
            payload(pagePath="/reset?token=private"),
            payload(pagePath="/reset#private"),
            payload(pagePath="/dashboard//private"),
            payload(appBuild="unknown build"),
            payload(title="Panel\u202e title is unsafe"),
            payload(description="This contains a hidden\u200b formatting marker."),
            payload(diagnosticsConsent=False, diagnostics={
                "browserFamily": "Chrome", "browserMajor": 140, "deviceClass": "desktop"
            }),
            payload(diagnosticsConsent=True, diagnostics=None),
            payload(description="Contact me at person@example.com because this broke."),
            payload(description="Authorization: Bearer abcdefghijklmnopqrstuvwxyz"),
            payload(description="Cookie=jsc-access-secret-value"),
            payload(description="Payment card 4111 1111 1111 1111 was shown."),
        ]
        for value in invalid:
            with self.subTest(value=value):
                with patch.object(feedback, "dynamodb_client") as ddb, \
                     patch.object(feedback.time, "time", return_value=2_000):
                    result = feedback.handler(event(value), Context())
                self.assertEqual(result["statusCode"], 400)
                ddb.assert_not_called()

    def test_rejects_oversize_body_wrong_content_type_and_automation(self):
        cases = [
            event({}, raw="{" + "x" * 4_096 + "}"),
            event(payload(), content_type="text/plain"),
            event(payload(website="filled")),
            event(payload(formStartedAt=1_998_000.5)),
            event(payload(formStartedAt=1_999_999)),
        ]
        for request in cases:
            with self.subTest(request=request):
                with patch.object(feedback, "dynamodb_client") as ddb, \
                     patch.object(feedback.time, "time", return_value=2_000):
                    result = feedback.handler(request, Context())
                self.assertIn(result["statusCode"], {400, 415})
                ddb.assert_not_called()

    def test_requires_the_one_feedback_origin_and_has_credential_free_preflight(self):
        denied = feedback.handler(event(payload(), origin="https://lookalike.test"), Context())
        self.assertEqual(denied["statusCode"], 403)
        self.assertNotIn("Access-Control-Allow-Origin", denied["headers"])

        allowed = feedback.handler(event({}, method="OPTIONS"), Context())
        self.assertEqual(allowed["statusCode"], 204)
        self.assertEqual(allowed["body"], "")
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], ORIGIN)
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Headers"], "Content-Type")
        self.assertNotIn("Access-Control-Allow-Credentials", allowed["headers"])

    def test_fail_closed_switch_stops_before_storage(self):
        with patch.dict(os.environ, {**BASE_ENV, "ENABLE_FEEDBACK_SUBMISSIONS": "false"}, clear=True), \
             patch.object(feedback, "dynamodb_client") as ddb:
            result = feedback.handler(event(payload()), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(response_body(result)["code"], "FEEDBACK_UNAVAILABLE")
        ddb.assert_not_called()

    def test_logs_fixed_outcomes_without_report_content(self):
        secret_phrase = "unique private report phrase"
        ddb = Mock()
        with patch.object(feedback, "dynamodb_client", return_value=ddb), \
             patch.object(feedback.time, "time", return_value=2_000), \
             self.assertLogs(level="INFO") as captured:
            result = feedback.handler(event(payload(description=(
                f"The panel fails with {secret_phrase} but contains no account information."
            ))), Context())
        self.assertEqual(result["statusCode"], 202)
        logs = "\n".join(captured.output)
        self.assertNotIn(secret_phrase, logs)
        self.assertIn("feedback-submit", logs)
        self.assertIn("accepted", logs)


class FeedbackTemplateTests(unittest.TestCase):
    def test_template_is_separate_encrypted_fail_closed_and_least_privilege(self):
        template = TEMPLATE.read_text(encoding="utf-8")
        parameters = template.split("  EnableFeedbackSubmissions:", 1)[1].split(
            "  SesConfigurationSetName:", 1
        )[0]
        self.assertIn("Default: 'false'", parameters)
        self.assertIn("FeedbackClientOrigin:", parameters)
        self.assertIn("Default: ''", parameters)
        self.assertIn("FeedbackDedupePepper:", parameters)
        self.assertIn("NoEcho: true", parameters)

        table = template.split("  FeedbackTable:", 1)[1].split(
            "  WaitlistEmailConfigurationSet:", 1
        )[0]
        self.assertIn("DeletionPolicy: Retain", table)
        self.assertIn("SSEType: KMS", table)
        self.assertIn("PointInTimeRecoveryEnabled: true", table)
        self.assertIn("AttributeName: deleteAfter", table)
        self.assertIn("DeletionProtectionEnabled: true", table)
        self.assertIn("IndexName: status-submittedAt-index", table)

        role = template.split("  FeedbackExecutionRole:", 1)[1].split(
            "  AnalyticsExecutionRole:", 1
        )[0]
        self.assertIn(
            "Action: [dynamodb:GetItem, dynamodb:PutItem, dynamodb:TransactWriteItems]",
            role,
        )
        self.assertNotIn("ses:", role.lower())
        self.assertNotIn("dynamodb:Scan", role)
        self.assertNotIn("Resource: '*'", role)

        function = template.split("  FeedbackFunction:", 1)[1].split(
            "  AnalyticsFunction:", 1
        )[0]
        self.assertEqual(function.count("Path: /feedback"), 2)
        self.assertIn("Handler: feedback.handler", function)
        self.assertIn("ENABLE_FEEDBACK_SUBMISSIONS: !Ref EnableFeedbackSubmissions", function)
        self.assertIn("RouteSettings: {ThrottlingBurstLimit: 3, ThrottlingRateLimit: 1}", function)
        self.assertNotIn("GITHUB", function.upper())
        self.assertNotIn("CONTACT_RECIPIENT_EMAIL", function)
        self.assertIn("FeedbackApiThrottleMetricFilter:", template)

        outputs = template.split("Outputs:", 1)[1]
        self.assertIn("FeedbackEndpoint:", outputs)
        self.assertNotIn("FeedbackDedupePepper", outputs)
        self.assertNotIn("FeedbackClientOrigin", outputs)


def decoded_report():
    return {
        "recordKey": "REPORT#FB-A1B2C3D4E5F60708",
        "recordType": "REPORT",
        "reference": "FB-A1B2C3D4E5F60708",
        "status": "NEW",
        "source": "public-tester",
        "category": "BROKEN",
        "title": "Panel mentions @maintainer and #123",
        "description": "Selecting the panel mentions @person but does not open it.",
        "reproductionSteps": "Select Saved jobs.",
        "pagePath": "/dashboard",
        "appBuild": "v1.1.0-abc1234",
        "submittedAt": "2026-08-28T10:00:00Z",
        "diagnosticsConsent": False,
    }


class FeedbackTriageTests(unittest.TestCase):
    def test_listing_queries_only_the_new_status_index_without_scanning(self):
        client = Mock()
        client.query.return_value = {"Items": []}
        self.assertEqual(
            feedback_triage._list_new_reports(client, "feedback", 20), []
        )
        request = client.query.call_args.kwargs
        self.assertEqual(request["IndexName"], "status-submittedAt-index")
        self.assertEqual(request["ExpressionAttributeValues"], {":new": {"S": "NEW"}})
        self.assertTrue(request["ScanIndexForward"])
        self.assertFalse(hasattr(client, "scan") and client.scan.called)

    def test_preview_is_fixed_source_and_neutralises_mentions(self):
        preview = feedback_triage.render_issue_preview(decoded_report())
        self.assertIn("Source: Public Tester", preview)
        self.assertIn("FB-A1B2C3D4E5F60708", preview)
        self.assertNotIn("@maintainer", preview)
        self.assertNotIn("@person", preview)
        self.assertNotIn("#123", preview)
        self.assertIn("＠maintainer", preview)
        self.assertIn("Coarse diagnostics: Not supplied", preview)
        self.assertIn("Client-asserted app build: `v1.1.0-abc1234`", preview)

    def test_issue_creation_uses_only_fixed_repo_labels_and_body_file(self):
        seen = {}

        def runner(command, **options):
            seen["command"] = command
            seen["options"] = options
            body_path = Path(command[command.index("--body-file") + 1])
            seen["body"] = body_path.read_text(encoding="utf-8")
            seen["bodyMode"] = stat.S_IMODE(body_path.stat().st_mode)
            return subprocess.CompletedProcess(
                command, 0,
                stdout="https://github.com/jobseekercopilot/infrastructure/issues/42\n",
                stderr="",
            )

        result = feedback_triage.create_issue(decoded_report(), runner)
        self.assertEqual(
            result, "https://github.com/jobseekercopilot/infrastructure/issues/42"
        )
        command = seen["command"]
        self.assertEqual(command[:3], ["gh", "issue", "create"])
        self.assertEqual(command[command.index("--repo") + 1], "jobseekercopilot/infrastructure")
        self.assertEqual(
            [command[index + 1] for index, value in enumerate(command) if value == "--label"],
            ["public-tester", "feedback"],
        )
        self.assertNotIn("token", " ".join(command).lower())
        self.assertIn("Anonymous public-tester report", seen["body"])
        self.assertEqual(seen["bodyMode"], 0o600)

    def test_rejects_a_gh_url_outside_the_private_infrastructure_repo(self):
        runner = Mock(return_value=subprocess.CompletedProcess(
            [], 0, stdout="https://github.com/other/public/issues/1\n", stderr=""
        ))
        with self.assertRaisesRegex(
            feedback_triage.IssueCreationOutcomeUnknown,
            "no approved issue URL",
        ):
            feedback_triage.create_issue(decoded_report(), runner)

    def test_apply_claims_then_creates_then_marks_one_report_triaged(self):
        client = Mock()
        runner = Mock(return_value=subprocess.CompletedProcess(
            [], 0,
            stdout="https://github.com/jobseekercopilot/infrastructure/issues/51\n",
            stderr="",
        ))
        timestamps = iter([
            datetime(2026, 8, 28, 11, 0, tzinfo=timezone.utc),
            datetime(2026, 8, 28, 11, 1, tzinfo=timezone.utc),
        ])
        result = feedback_triage.triage_report(
            client, "feedback", decoded_report(), runner, lambda: next(timestamps)
        )
        self.assertEqual(
            result, "https://github.com/jobseekercopilot/infrastructure/issues/51"
        )
        self.assertEqual(client.update_item.call_count, 2)
        claim = client.update_item.call_args_list[0].kwargs
        final = client.update_item.call_args_list[1].kwargs
        self.assertEqual(claim["ExpressionAttributeValues"][":new"], {"S": "NEW"})
        self.assertEqual(
            claim["ExpressionAttributeValues"][":triaging"], {"S": "TRIAGING"}
        )
        self.assertEqual(final["ExpressionAttributeValues"][":triaged"], {"S": "TRIAGED"})
        self.assertEqual(
            final["ExpressionAttributeValues"][":url"],
            {"S": "https://github.com/jobseekercopilot/infrastructure/issues/51"},
        )

    def test_issue_failure_releases_the_claim_without_storing_a_url(self):
        client = Mock()
        runner = Mock(side_effect=OSError("gh is not installed"))
        with self.assertRaisesRegex(
            feedback_triage.IssueCreationNotStarted,
            "local gh process could not start",
        ):
            feedback_triage.triage_report(
                client,
                "feedback",
                decoded_report(),
                runner,
                lambda: datetime(2026, 8, 28, 11, 0, tzinfo=timezone.utc),
            )
        self.assertEqual(client.update_item.call_count, 2)
        release = client.update_item.call_args_list[1].kwargs
        self.assertIn("SET #status = :new", release["UpdateExpression"])
        self.assertNotIn(":url", release["ExpressionAttributeValues"])

    def test_ambiguous_issue_failure_keeps_the_claim_for_reconciliation(self):
        client = Mock()
        runner = Mock(side_effect=subprocess.TimeoutExpired(["gh"], 30))
        with self.assertRaisesRegex(
            feedback_triage.IssueCreationOutcomeUnknown,
            "unknown outcome",
        ):
            feedback_triage.triage_report(
                client,
                "feedback",
                decoded_report(),
                runner,
                lambda: datetime(2026, 8, 28, 11, 0, tzinfo=timezone.utc),
            )
        self.assertEqual(client.update_item.call_count, 1)
        claim = client.update_item.call_args.kwargs
        self.assertIn("SET #status = :triaging", claim["UpdateExpression"])

    def test_missing_issue_url_keeps_the_claim_for_reconciliation(self):
        client = Mock()
        runner = Mock(return_value=subprocess.CompletedProcess(
            [], 0, stdout="Issue accepted\n", stderr=""
        ))
        with self.assertRaisesRegex(
            feedback_triage.IssueCreationOutcomeUnknown,
            "no approved issue URL",
        ):
            feedback_triage.triage_report(
                client,
                "feedback",
                decoded_report(),
                runner,
                lambda: datetime(2026, 8, 28, 11, 0, tzinfo=timezone.utc),
            )
        self.assertEqual(client.update_item.call_count, 1)

    def test_default_main_is_read_only_dry_run(self):
        client = Mock()
        with patch.object(feedback_triage, "_dynamodb_client", return_value=client), \
             patch.object(feedback_triage, "_list_new_reports", return_value=[decoded_report()]), \
             patch.object(feedback_triage, "triage_report") as triage, \
             patch("builtins.print") as output:
            result = feedback_triage.main(["--table-name", "feedback"])
        self.assertEqual(result, 0)
        triage.assert_not_called()
        rendered = "\n".join(str(call.args[0]) for call in output.call_args_list if call.args)
        self.assertIn("DRY RUN", rendered)


if __name__ == "__main__":
    unittest.main()
