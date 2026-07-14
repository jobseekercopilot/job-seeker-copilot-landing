import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "function" / "app.py"
SPEC = importlib.util.spec_from_file_location("production_waitlist_app", MODULE_PATH)
app = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(app)


class Context:
    aws_request_id = "test-request"


class ConditionalFailure(Exception):
    response = {"Error": {"Code": "ConditionalCheckFailedException"}}


def event(body, *, origin="https://develop.abc123.amplifyapp.com", content_type="application/json", method="POST"):
    return {
        "requestContext": {"http": {"method": method}},
        "headers": {"content-type": content_type, "origin": origin},
        "body": json.dumps(body),
    }


class WaitlistHandlerTests(unittest.TestCase):
    environment = {
        "ENVIRONMENT_NAME": "development",
        "AMPLIFY_BRANCH_NAME": "develop",
        "PRODUCTION_ORIGIN": "https://jobseekercopilot.com",
        "WAITLIST_TABLE_NAME": "JobSeekerCopilotWaitlist",
    }

    @patch.dict(os.environ, environment, clear=True)
    def test_normalises_and_conditionally_creates_pending_registration(self):
        table = Mock()
        with patch.object(app, "_waitlist_table", return_value=table), patch.object(app, "_utc_timestamp", return_value="2026-07-14T12:00:00Z"):
            result = app.handler(event({"email": "  PERSON@Example.com "}), Context())

        self.assertEqual(result["statusCode"], 201)
        self.assertEqual(json.loads(result["body"])["code"], "WAITLIST_CREATED")
        table.put_item.assert_called_once_with(
            Item={
                "email": "person@example.com",
                "createdAt": "2026-07-14T12:00:00Z",
                "status": "PENDING",
                "source": "landing-page",
            },
            ConditionExpression="attribute_not_exists(#email)",
            ExpressionAttributeNames={"#email": "email"},
        )

    @patch.dict(os.environ, environment, clear=True)
    def test_duplicate_is_rejected_without_overwriting(self):
        table = Mock()
        table.put_item.side_effect = ConditionalFailure()
        with patch.object(app, "_waitlist_table", return_value=table):
            result = app.handler(event({"email": "person@example.com"}), Context())

        self.assertEqual(result["statusCode"], 409)
        self.assertEqual(json.loads(result["body"])["code"], "EMAIL_ALREADY_REGISTERED")
        self.assertIn("attribute_not_exists", table.put_item.call_args.kwargs["ConditionExpression"])

    @patch.dict(os.environ, environment, clear=True)
    def test_invalid_email_and_unexpected_fields_are_rejected(self):
        table = Mock()
        with patch.object(app, "_waitlist_table", return_value=table):
            invalid = app.handler(event({"email": "not-an-email"}), Context())
            invalid_characters = app.handler(event({"email": "bad()@example.com"}), Context())
            unexpected = app.handler(event({"email": "person@example.com", "status": "ACTIVE"}), Context())

        self.assertEqual(invalid["statusCode"], 400)
        self.assertEqual(invalid_characters["statusCode"], 400)
        self.assertEqual(unexpected["statusCode"], 400)
        table.put_item.assert_not_called()

    @patch.dict(os.environ, environment, clear=True)
    def test_database_failure_never_returns_success(self):
        table = Mock()
        table.put_item.side_effect = RuntimeError("private database detail")
        with patch.object(app, "_waitlist_table", return_value=table):
            result = app.handler(event({"email": "person@example.com"}), Context())

        self.assertEqual(result["statusCode"], 503)
        self.assertFalse(json.loads(result["body"])["success"])
        self.assertNotIn("private database detail", result["body"])

    @patch.dict(os.environ, environment, clear=True)
    def test_development_cors_allows_only_the_develop_amplify_pattern(self):
        table = Mock()
        with patch.object(app, "_waitlist_table", return_value=table):
            allowed = app.handler(event({"email": "person@example.com"}), Context())
            wrong_branch = app.handler(event({"email": "person@example.com"}, origin="https://main.abc123.amplifyapp.com"), Context())
            unrelated = app.handler(event({"email": "person@example.com"}, origin="https://example.com"), Context())

        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], "https://develop.abc123.amplifyapp.com")
        self.assertEqual(wrong_branch["statusCode"], 403)
        self.assertEqual(unrelated["statusCode"], 403)

    @patch.dict(os.environ, {**environment, "ENVIRONMENT_NAME": "production"}, clear=True)
    def test_production_cors_allows_only_the_exact_company_origin(self):
        preflight = app.handler(event({}, origin="https://jobseekercopilot.com", method="OPTIONS"), Context())
        development = app.handler(event({}, method="OPTIONS"), Context())

        self.assertEqual(preflight["statusCode"], 204)
        self.assertEqual(preflight["headers"]["Access-Control-Allow-Origin"], "https://jobseekercopilot.com")
        self.assertEqual(development["statusCode"], 403)

    @patch.dict(os.environ, environment, clear=True)
    def test_requires_json_content_type(self):
        with patch.object(app, "_waitlist_table") as table:
            result = app.handler(event({"email": "person@example.com"}, content_type="text/plain"), Context())

        self.assertEqual(result["statusCode"], 415)
        table.assert_not_called()


if __name__ == "__main__":
    unittest.main()
