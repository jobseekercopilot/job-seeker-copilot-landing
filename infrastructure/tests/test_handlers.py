import json
import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

FUNCTIONS = Path(__file__).resolve().parents[1] / "functions"
sys.path.insert(0, str(FUNCTIONS))

import contact_submit  # noqa: E402
import waitlist_confirm  # noqa: E402
import waitlist_submit  # noqa: E402
import waitlist_unsubscribe  # noqa: E402
from common.tokens import token_hash  # noqa: E402


class Context:
    aws_request_id = "test-request"


BASE_ENV = {
    "ENABLE_LIVE_SUBMISSIONS": "true",
    "ENABLE_WAITLIST_EMAIL": "true",
    "ALLOWED_ORIGINS": "https://landing.example",
    "PUBLIC_SITE_URL": "https://landing.example",
    "PUBLIC_SUPPORT_EMAIL": "support@example.test",
    "REPLY_TO_EMAIL": "reply@example.test",
    "SES_CONFIGURATION_SET": "LandingEmails",
    "WAITLIST_SENDER_EMAIL": "updates@example.test",
    "WAITLIST_TABLE_NAME": "waitlist",
    "SUBSCRIBER_HASH_PEPPER": "x" * 32,
    "CONFIRMATION_TOKEN_TTL_HOURS": "24",
    "UNCONFIRMED_RETENTION_DAYS": "7",
    "MINIMUM_FORM_COMPLETION_MS": "0",
    "CONSENT_VERSION": "v1",
}


def post_event(body):
    return {
        "headers": {"content-type": "application/json", "origin": "https://landing.example"},
        "body": json.dumps(body),
    }


class HandlerTests(unittest.TestCase):
    @patch.dict(os.environ, {**BASE_ENV, "ENABLE_LIVE_SUBMISSIONS": "false"}, clear=True)
    def test_waitlist_fails_closed_when_live_submission_is_disabled(self):
        result = waitlist_submit.handler(post_event({}), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(json.loads(result["body"])["code"], "BACKEND_DISABLED")

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_waitlist_creates_pending_record_and_sends_confirmation(self):
        fake_table = Mock()
        fake_table.get_item.return_value = {}
        with patch.object(waitlist_submit, "table", return_value=fake_table), \
             patch.object(waitlist_submit, "send_email") as send:
            result = waitlist_submit.handler(post_event({
                "email": " Person@Example.com ", "source": "landing-page", "consentVersion": "v1",
                "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
            }), Context())
        self.assertEqual(result["statusCode"], 202)
        item = fake_table.put_item.call_args.kwargs["Item"]
        self.assertEqual(item["email"], "person@example.com")
        self.assertEqual(item["status"], "pending")
        self.assertNotIn("confirmationToken", item)
        self.assertEqual(len(item["confirmationTokenHash"]), 64)
        send.assert_called_once()
        self.assertEqual(send.call_args.kwargs["message_purpose"], "waitlist-confirmation")

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_duplicate_confirmed_subscriber_is_not_written_or_emailed(self):
        fake_table = Mock()
        fake_table.get_item.return_value = {"Item": {"status": "confirmed"}}
        with patch.object(waitlist_submit, "table", return_value=fake_table), \
             patch.object(waitlist_submit, "send_email") as send:
            result = waitlist_submit.handler(post_event({
                "email": "person@example.com", "source": "landing-page", "consentVersion": "v1",
                "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
            }), Context())
        self.assertEqual(json.loads(result["body"])["code"], "ALREADY_SUBSCRIBED")
        fake_table.put_item.assert_not_called()
        send.assert_not_called()

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_pending_duplicate_is_rate_limited(self):
        fake_table = Mock()
        fake_table.get_item.return_value = {"Item": {"status": "pending", "lastConfirmationSentAtEpoch": int(time.time())}}
        with patch.object(waitlist_submit, "table", return_value=fake_table):
            result = waitlist_submit.handler(post_event({
                "email": "person@example.com", "source": "landing-page", "consentVersion": "v1",
                "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
            }), Context())
        self.assertEqual(result["statusCode"], 429)
        fake_table.update_item.assert_not_called()

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_email_failure_rolls_back_a_new_pending_record(self):
        fake_table = Mock()
        fake_table.get_item.return_value = {}
        with patch.object(waitlist_submit, "table", return_value=fake_table), \
             patch.object(waitlist_submit, "send_email", side_effect=RuntimeError("provider unavailable")):
            result = waitlist_submit.handler(post_event({
                "email": "person@example.com", "source": "landing-page", "consentVersion": "v1",
                "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
            }), Context())
        self.assertEqual(result["statusCode"], 503)
        fake_table.delete_item.assert_called_once()

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_dynamodb_failure_returns_only_a_public_error(self):
        fake_table = Mock()
        fake_table.get_item.side_effect = RuntimeError("private database detail")
        with patch.object(waitlist_submit, "table", return_value=fake_table):
            result = waitlist_submit.handler(post_event({
                "email": "person@example.com", "source": "landing-page", "consentVersion": "v1",
                "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
            }), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertNotIn("private database detail", result["body"])

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_confirm_rejects_expired_single_use_token(self):
        raw_token = "valid-looking-token-that-is-long-enough"
        fake_table = Mock()
        fake_table.query.return_value = {"Items": [{
            "subscriberId": "abc", "status": "pending", "confirmationTokenExpiresAt": 1,
            "confirmationTokenHash": token_hash(raw_token), "email": "person@example.com",
            "unsubscribeTokenHash": "hash", "unsubscribeTokenNonce": "nonce",
        }]}
        with patch.object(waitlist_confirm, "table", return_value=fake_table):
            result = waitlist_confirm.handler({"headers": {}, "queryStringParameters": {"token": raw_token}}, Context())
        self.assertEqual(result["statusCode"], 410)
        self.assertEqual(json.loads(result["body"])["code"], "TOKEN_EXPIRED")
        fake_table.update_item.assert_not_called()

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_confirmation_token_can_change_state_only_once(self):
        raw_token = "valid-looking-token-that-is-long-enough"
        item = {
            "subscriberId": "abc", "status": "pending", "confirmationTokenExpiresAt": int(time.time()) + 3600,
            "confirmationTokenHash": token_hash(raw_token), "email": "person@example.com",
            "unsubscribeTokenHash": "hash", "unsubscribeTokenNonce": "nonce",
        }
        fake_table = Mock()
        fake_table.query.side_effect = lambda **_kwargs: {"Items": [item]}
        fake_table.update_item.side_effect = lambda **_kwargs: item.update({"status": "confirmed"})
        event = {"headers": {}, "queryStringParameters": {"token": raw_token}}
        with patch.object(waitlist_confirm, "table", return_value=fake_table), \
             patch.object(waitlist_confirm, "send_email") as send:
            first = waitlist_confirm.handler(event, Context())
            second = waitlist_confirm.handler(event, Context())
        self.assertEqual(json.loads(first["body"])["code"], "WAITLIST_CONFIRMED")
        self.assertEqual(json.loads(second["body"])["code"], "ALREADY_CONFIRMED")
        self.assertEqual(fake_table.update_item.call_count, 1)
        self.assertEqual(send.call_args.kwargs["message_purpose"], "waitlist-confirmed")

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_unsubscribe_updates_status_without_an_email_in_the_request(self):
        raw_token = "unsubscribe-token-that-is-long-enough"
        hashed = token_hash(raw_token)
        fake_table = Mock()
        fake_table.query.return_value = {"Items": [{
            "subscriberId": "abc", "status": "confirmed", "unsubscribeTokenHash": hashed,
            "unsubscribeTokenExpiresAt": int(time.time()) + 3600,
        }]}
        with patch.object(waitlist_unsubscribe, "table", return_value=fake_table):
            result = waitlist_unsubscribe.handler(
                {"headers": {}, "queryStringParameters": {"token": raw_token}}, Context()
            )
        self.assertEqual(json.loads(result["body"])["code"], "WAITLIST_UNSUBSCRIBED")
        fake_table.update_item.assert_called_once()

    @patch.dict(os.environ, {
        **BASE_ENV,
        "CONTACT_SENDER_EMAIL": "contact@example.test",
        "CONTACT_RECIPIENT_EMAIL": "owner@example.test",
        "STORE_CONTACT_SUBMISSIONS": "false",
        "SEND_CONTACT_ACKNOWLEDGEMENT": "false",
    }, clear=True)
    def test_contact_escapes_content_and_does_not_store_by_default(self):
        with patch.object(contact_submit, "send_email") as send, patch.object(contact_submit, "table") as table:
            result = contact_submit.handler(post_event({
                "name": "Alex", "email": "alex@example.com", "subject": "Question",
                "message": "Could you explain <b>early access</b>?", "source": "landing-page",
                "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
            }), Context())
        self.assertEqual(result["statusCode"], 202)
        html = send.call_args.args[4]
        self.assertIn("&lt;b&gt;early access&lt;/b&gt;", html)
        self.assertEqual(send.call_args.kwargs["message_purpose"], "contact-enquiry")
        table.assert_not_called()

    @patch.dict(os.environ, {
        **BASE_ENV,
        "CONTACT_SENDER_EMAIL": "contact@example.test",
        "CONTACT_RECIPIENT_EMAIL": "owner@example.test",
        "STORE_CONTACT_SUBMISSIONS": "false",
    }, clear=True)
    def test_contact_validation_rejects_unexpected_fields_before_email(self):
        with patch.object(contact_submit, "send_email") as send:
            result = contact_submit.handler(post_event({
                "name": "Alex", "email": "invalid", "subject": "Question", "message": "Valid length message",
                "source": "landing-page", "website": "", "formStartedAt": int(time.time() * 1000) - 2000,
                "deliveryStatus": "sent",
            }), Context())
        self.assertEqual(result["statusCode"], 400)
        send.assert_not_called()

    @patch.dict(os.environ, {**BASE_ENV, "WAITLIST_SENDER_EMAIL": ""}, clear=True)
    def test_missing_email_configuration_does_not_create_a_record(self):
        with patch.object(waitlist_submit, "table") as table:
            result = waitlist_submit.handler(post_event({}), Context())
        self.assertEqual(result["statusCode"], 503)
        table.assert_not_called()


if __name__ == "__main__":
    unittest.main()
