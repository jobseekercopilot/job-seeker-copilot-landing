import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

FUNCTION = Path(__file__).resolve().parents[1] / "function"
sys.path.insert(0, str(FUNCTION))

import app  # noqa: E402
import common  # noqa: E402
import confirm  # noqa: E402
import resend  # noqa: E402
import ses_events  # noqa: E402
import workflow  # noqa: E402


class Context:
    aws_request_id = "test-request"


BASE_ENV = {
    "ENVIRONMENT_NAME": "development",
    "DEVELOPMENT_ORIGIN": "https://develop.d3gd9ezfa3aujn.amplifyapp.com",
    "FEATURE_ORIGIN": "https://feature-waitlist-double-opt-in.d3gd9ezfa3aujn.amplifyapp.com",
    "PRODUCTION_ORIGIN": "https://jobseekercopilot.com",
    "WAITLIST_TABLE_NAME": "waitlist",
    "TOKEN_TABLE_NAME": "tokens",
    "SES_REGION": "eu-west-2",
    "WAITLIST_SENDER_EMAIL": "updates@jobseekercopilot.com",
    "PUBLIC_SUPPORT_EMAIL": "support@jobseekercopilot.com",
    "PUBLIC_SITE_URL": "https://develop.d3gd9ezfa3aujn.amplifyapp.com",
    "SES_CONFIGURATION_SET": "WaitlistEmails",
    "CONFIRMATION_TOKEN_TTL_SECONDS": "172800",
    "CONFIRMATION_RESEND_COOLDOWN_SECONDS": "900",
    "MAX_CONFIRMATION_SENDS": "5",
    "CONFIRMATION_SEND_WINDOW_SECONDS": "86400",
    "PENDING_RETENTION_SECONDS": "2592000",
    "USED_TOKEN_RETENTION_SECONDS": "604800",
    "CONSENT_VERSION": "1.0",
}


def event(body, origin=BASE_ENV["DEVELOPMENT_ORIGIN"], method="POST"):
    return {
        "requestContext": {"http": {"method": method}},
        "headers": {"content-type": "application/json", "origin": origin},
        "body": json.dumps(body),
    }


def body(result):
    return json.loads(result["body"])


class TokenTests(unittest.TestCase):
    def test_tokens_use_url_safe_256_bit_random_values_and_sha256_hashes(self):
        first = common.new_token()
        second = common.new_token()
        self.assertNotEqual(first, second)
        self.assertTrue(common.TOKEN_PATTERN.fullmatch(first))
        self.assertGreaterEqual(len(first), 43)
        self.assertEqual(len(common.token_hash(first)), 64)
        self.assertTrue(common.hashes_match(common.token_hash(first), common.token_hash(first)))

    def test_token_validation_has_a_hard_length_limit(self):
        self.assertEqual(common.validate_token("a" * 129), "")
        self.assertEqual(common.validate_token("contains.email@example.com"), "")

    def test_aws_error_scope_classifies_without_exposing_resource_values(self):
        error = Exception()
        error.response = {"Error": {"Message": (
            "not authorized on resource arn:aws:ses:eu-west-2:123:identity/private@example.com"
        )}}
        self.assertEqual(common.aws_error_scope(error), "email-identity")

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_confirmation_email_has_html_text_expiry_and_privacy_without_email_in_url(self):
        ses = Mock()
        raw = "D" * 43
        with patch.object(common, "ses_client", return_value=ses):
            common.send_confirmation_email("person@example.com", raw)
        request = ses.send_email.call_args.kwargs
        self.assertEqual(request["ConfigurationSetName"], "WaitlistEmails")
        self.assertEqual(request["Content"]["Simple"]["Subject"]["Data"], "Confirm your Job Seeker Copilot waitlist email")
        text = request["Content"]["Simple"]["Body"]["Text"]["Data"]
        html = request["Content"]["Simple"]["Body"]["Html"]["Data"]
        self.assertIn(f"/waitlist/confirm?token={raw}", text)
        self.assertIn("expires in 48 hours", text)
        self.assertIn("Privacy Policy", text)
        self.assertIn("no action is required", text)
        self.assertIn("Confirm my email", html)
        self.assertNotIn("person%40example.com", text)


@patch.dict(os.environ, BASE_ENV, clear=True)
class SubscribeTests(unittest.TestCase):
    def test_new_subscription_is_pending_and_only_hash_is_stored(self):
        ddb = Mock()
        with patch.object(workflow, "dynamodb_client", return_value=ddb), \
             patch.object(workflow, "new_token", return_value="A" * 43), \
             patch.object(workflow, "now_epoch", return_value=1_780_000_000):
            raw, hashed = workflow.create_pending("person@example.com")
        self.assertEqual(raw, "A" * 43)
        self.assertEqual(hashed, common.token_hash(raw))
        transaction = ddb.transact_write_items.call_args.kwargs["TransactItems"]
        subscriber = transaction[0]["Put"]["Item"]
        token = transaction[1]["Put"]["Item"]
        self.assertEqual(subscriber["status"], {"S": "PENDING"})
        self.assertEqual(subscriber["source"], {"S": "landing-page"})
        self.assertEqual(subscriber["consentVersion"], {"S": "1.0"})
        self.assertEqual(token["tokenHash"], {"S": hashed})
        self.assertNotIn(raw, json.dumps(transaction))

    def test_subscribe_sends_email_then_reports_pending_confirmation(self):
        table = Mock()
        table.get_item.return_value = {}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", return_value=("raw-token", "hash")), \
             patch.object(app, "send_confirmation_email") as send, \
             patch.object(app, "mark_confirmation_sent") as mark:
            result = app.handler(event({"email": " Person@Example.com "}), Context())
        self.assertEqual(result["statusCode"], 201)
        self.assertEqual(body(result)["code"], "WAITLIST_PENDING_CONFIRMATION")
        self.assertIn("Check your inbox", body(result)["message"])
        send.assert_called_once_with("person@example.com", "raw-token")
        mark.assert_called_once_with("person@example.com", "hash")

    def test_pending_duplicate_does_not_send_unlimited_email(self):
        table = Mock()
        table.get_item.return_value = {"Item": {
            "email": "person@example.com", "status": "PENDING",
            "confirmationExpiresAt": 9_999_999_999, "currentConfirmationTokenHash": "hash",
        }}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "send_confirmation_email") as send:
            result = app.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(body(result)["code"], "WAITLIST_CONFIRMATION_REQUIRED")
        send.assert_not_called()

    def test_confirmed_duplicate_is_not_modified_or_emailed(self):
        table = Mock()
        table.get_item.return_value = {"Item": {"email": "person@example.com", "status": "CONFIRMED"}}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "send_confirmation_email") as send:
            result = app.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(body(result)["code"], "WAITLIST_ALREADY_CONFIRMED")
        send.assert_not_called()

    def test_ses_failure_preserves_recoverable_pending_record(self):
        table = Mock()
        table.get_item.return_value = {}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", return_value=("raw-token", "hash")), \
             patch.object(app, "send_confirmation_email", side_effect=RuntimeError("SES private detail")), \
             patch.object(app, "mark_confirmation_failure") as failed:
            result = app.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(body(result)["code"], "CONFIRMATION_EMAIL_TEMPORARILY_UNAVAILABLE")
        self.assertNotIn("SES private detail", result["body"])
        failed.assert_called_once_with("person@example.com", "hash")


@patch.dict(os.environ, BASE_ENV, clear=True)
class ResendTests(unittest.TestCase):
    def test_resend_cooldown_and_window_limit_do_not_write(self):
        ddb = Mock()
        base = {
            "email": "person@example.com", "status": "PENDING", "lastConfirmationAttemptAtEpoch": 2_000,
            "confirmationSendWindowStartedAtEpoch": 1_000, "confirmationSendCount": 1,
        }
        with patch.object(workflow, "now_epoch", return_value=2_100), patch.object(workflow, "dynamodb_client", return_value=ddb):
            self.assertEqual(workflow.rotate_pending_token(base)[2], "cooldown")
        limited = {**base, "lastConfirmationAttemptAtEpoch": 1_000, "confirmationSendCount": 5}
        with patch.object(workflow, "now_epoch", return_value=2_100), patch.object(workflow, "dynamodb_client", return_value=ddb):
            self.assertEqual(workflow.rotate_pending_token(limited)[2], "limit")
        ddb.transact_write_items.assert_not_called()

    def test_resend_rotates_token_and_deletes_old_hash_atomically(self):
        ddb = Mock()
        record = {
            "email": "person@example.com", "status": "PENDING", "lastConfirmationAttemptAtEpoch": 1_000,
            "confirmationSendWindowStartedAtEpoch": 1_000, "confirmationSendCount": 1,
            "currentConfirmationTokenHash": "old-hash",
        }
        with patch.object(workflow, "now_epoch", return_value=2_000), \
             patch.object(workflow, "new_token", return_value="B" * 43), \
             patch.object(workflow, "dynamodb_client", return_value=ddb):
            _, new_hash, outcome = workflow.rotate_pending_token(record)
        self.assertEqual(outcome, "issued")
        actions = ddb.transact_write_items.call_args.kwargs["TransactItems"]
        self.assertEqual(actions[1]["Delete"]["Key"]["tokenHash"], {"S": "old-hash"})
        self.assertEqual(actions[2]["Put"]["Item"]["tokenHash"], {"S": new_hash})

    def test_resend_response_is_neutral_for_unknown_address(self):
        table = Mock()
        table.get_item.return_value = {}
        with patch.object(resend, "subscriber_table", return_value=table):
            result = resend.handler(event({"email": "unknown@example.com"}), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result)["code"], "WAITLIST_RESEND_ACCEPTED")
        self.assertIn("If that address", body(result)["message"])


@patch.dict(os.environ, BASE_ENV, clear=True)
class ConfirmationTests(unittest.TestCase):
    RAW = "C" * 43
    HASH = common.token_hash(RAW)

    def test_valid_confirmation_uses_atomic_update_and_no_scan(self):
        tokens = Mock()
        tokens.get_item.return_value = {"Item": {
            "tokenHash": self.HASH, "email": "person@example.com", "status": "ACTIVE", "expiresAt": 3_000,
        }}
        ddb = Mock()
        with patch.object(confirm, "token_table", return_value=tokens), \
             patch.object(confirm, "dynamodb_client", return_value=ddb), \
             patch.object(confirm, "now_epoch", return_value=2_000):
            result = confirm.handler(event({"token": self.RAW}), Context())
        self.assertEqual(body(result)["code"], "WAITLIST_CONFIRMED")
        actions = ddb.transact_write_items.call_args.kwargs["TransactItems"]
        self.assertEqual(len(actions), 2)
        self.assertIn("currentConfirmationTokenHash=:hash", actions[0]["Update"]["ConditionExpression"])
        self.assertIn("REMOVE email", actions[1]["Update"]["UpdateExpression"])
        self.assertFalse(hasattr(tokens, "scan") and tokens.scan.called)

    def test_expired_confirmation_is_rejected_without_update(self):
        tokens = Mock()
        tokens.get_item.return_value = {"Item": {
            "email": "person@example.com", "status": "ACTIVE", "expiresAt": 1,
        }}
        ddb = Mock()
        with patch.object(confirm, "token_table", return_value=tokens), \
             patch.object(confirm, "dynamodb_client", return_value=ddb), \
             patch.object(confirm, "now_epoch", return_value=2_000):
            result = confirm.handler(event({"token": self.RAW}), Context())
        self.assertEqual(result["statusCode"], 410)
        self.assertEqual(body(result)["code"], "CONFIRMATION_TOKEN_EXPIRED")
        ddb.transact_write_items.assert_not_called()

    def test_invalid_and_repeated_confirmation_have_typed_results(self):
        tokens = Mock()
        tokens.get_item.side_effect = [{}, {"Item": {"status": "USED"}}]
        with patch.object(confirm, "token_table", return_value=tokens):
            invalid = confirm.handler(event({"token": self.RAW}), Context())
            repeated = confirm.handler(event({"token": self.RAW}), Context())
        self.assertEqual(body(invalid)["code"], "CONFIRMATION_TOKEN_INVALID")
        self.assertEqual(body(repeated)["code"], "WAITLIST_ALREADY_CONFIRMED")


@patch.dict(os.environ, BASE_ENV, clear=True)
class EventAndSecurityTests(unittest.TestCase):
    def test_bounce_and_complaint_mark_suppression_states(self):
        table = Mock()
        with patch.object(ses_events, "subscriber_table", return_value=table):
            ses_events.handler({
                "detail-type": "Email Bounced", "detail": {"mail": {"destination": ["person@example.com"]}},
            }, Context())
            ses_events.handler({
                "detail-type": "Email Complaint Received", "detail": {"mail": {"destination": ["person@example.com"]}},
            }, Context())
        statuses = [call.kwargs["ExpressionAttributeValues"][":status"] for call in table.update_item.call_args_list]
        self.assertEqual(statuses, ["BOUNCED", "COMPLAINED"])

    def test_logs_do_not_contain_complete_email_or_token(self):
        table = Mock()
        table.get_item.return_value = {}
        raw = "raw-secret-token-value-that-must-not-be-logged"
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", return_value=(raw, "hash")), \
             patch.object(app, "send_confirmation_email"), \
             patch.object(app, "mark_confirmation_sent"), \
             self.assertLogs(level="INFO") as captured:
            app.handler(event({"email": "person@example.com"}), Context())
        output = " ".join(captured.output)
        self.assertNotIn("person@example.com", output)
        self.assertNotIn(raw, output)

    def test_cors_allows_only_exact_staging_feature_and_production_origins(self):
        allowed = app.handler(event({}, method="OPTIONS"), Context())
        feature = app.handler(event({}, origin=BASE_ENV["FEATURE_ORIGIN"], method="OPTIONS"), Context())
        denied = app.handler(event({}, origin="https://develop.attacker.amplifyapp.com", method="OPTIONS"), Context())
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], BASE_ENV["DEVELOPMENT_ORIGIN"])
        self.assertEqual(feature["headers"]["Access-Control-Allow-Origin"], BASE_ENV["FEATURE_ORIGIN"])
        self.assertEqual(denied["statusCode"], 403)
        self.assertNotIn("Access-Control-Allow-Origin", denied["headers"])
        with patch.dict(os.environ, {**BASE_ENV, "ENVIRONMENT_NAME": "production"}, clear=True):
            production = app.handler(event({}, origin=BASE_ENV["PRODUCTION_ORIGIN"], method="OPTIONS"), Context())
        self.assertEqual(production["headers"]["Access-Control-Allow-Origin"], BASE_ENV["PRODUCTION_ORIGIN"])


if __name__ == "__main__":
    unittest.main()
