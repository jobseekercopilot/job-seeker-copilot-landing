import json
import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

FUNCTIONS = Path(__file__).resolve().parents[1] / "functions"
sys.path.insert(0, str(FUNCTIONS))

from common.email_templates import contact_owner, waitlist_confirmation  # noqa: E402
from common.email_provider import send_email  # noqa: E402
from common.http import API_SECURITY_HEADERS, ApiError, options_response, parse_json  # noqa: E402
from common.tokens import subscriber_id, token_hash, unsubscribe_token  # noqa: E402
from common.validation import anti_automation, email, text  # noqa: E402


class CommonTests(unittest.TestCase):
    def test_subscriber_identifiers_are_deterministic_and_do_not_expose_email(self):
        identifier = subscriber_id("person@example.com", "x" * 32)
        self.assertEqual(identifier, subscriber_id("person@example.com", "x" * 32))
        self.assertNotIn("person", identifier)
        raw_unsubscribe = unsubscribe_token(identifier, "x" * 32, "random-nonce")
        self.assertNotEqual(raw_unsubscribe, token_hash(raw_unsubscribe))

    def test_validation_normalises_email_and_rejects_repeated_content(self):
        self.assertEqual(email(" Person@Example.com "), "person@example.com")
        with self.assertRaises(ApiError):
            email("not-an-email")
        with self.assertRaises(ApiError):
            text("a" * 30, "message", 10, 3000)

    def test_form_timing_is_only_a_basic_automation_signal(self):
        anti_automation({"website": "", "formStartedAt": int(time.time() * 1000) - 2000}, 1200)
        with self.assertRaises(ApiError) as captured:
            anti_automation({"website": "filled", "formStartedAt": int(time.time() * 1000) - 2000}, 1200)
        self.assertEqual(captured.exception.code, "AUTOMATION_REJECTED")

    def test_html_templates_escape_contact_content(self):
        _, _, html = contact_owner("<script>", "person@example.com", "Question", "<b>unsafe</b>")
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;b&gt;unsafe&lt;/b&gt;", html)
        _, confirmation_text, _ = waitlist_confirmation("https://example.test", "token/value", "help@example.test")
        self.assertIn("token%2Fvalue", confirmation_text)

    @patch.dict(os.environ, {"SES_CONFIGURATION_SET": "LandingEmails"}, clear=False)
    @patch("common.email_provider.ses_client")
    def test_email_provider_uses_configuration_set_and_purpose_tag(self, client):
        send_email(
            "hello@example.test",
            "owner@example.test",
            "Subject",
            "Text",
            "<p>HTML</p>",
            "visitor@example.test",
            message_purpose="contact-enquiry",
        )
        request = client.return_value.send_email.call_args.kwargs
        self.assertEqual(request["FromEmailAddress"], "hello@example.test")
        self.assertEqual(request["Destination"], {"ToAddresses": ["owner@example.test"]})
        self.assertEqual(request["ReplyToAddresses"], ["visitor@example.test"])
        self.assertEqual(request["ConfigurationSetName"], "LandingEmails")
        self.assertEqual(request["EmailTags"], [{"Name": "message-purpose", "Value": "contact-enquiry"}])

    @patch.dict(os.environ, {"SES_CONFIGURATION_SET": "LandingEmails"}, clear=False)
    def test_email_provider_rejects_unknown_purpose(self):
        with self.assertRaises(ValueError):
            send_email(
                "hello@example.test",
                "owner@example.test",
                "Subject",
                "Text",
                "<p>HTML</p>",
                message_purpose="visitor-controlled",
            )

    def test_json_parser_enforces_content_type_and_object_body(self):
        event = {"headers": {"content-type": "application/json"}, "body": json.dumps({"ok": True})}
        self.assertEqual(parse_json(event), {"ok": True})
        with self.assertRaises(ApiError) as captured:
            parse_json({"headers": {"content-type": "text/plain"}, "body": "{}"})
        self.assertEqual(captured.exception.status, 415)

    @patch.dict(os.environ, {"ALLOWED_ORIGINS": "https://one.example,https://two.example"}, clear=False)
    def test_cors_reflects_only_an_exact_allowed_origin(self):
        allowed = options_response({"headers": {"origin": "https://one.example"}})
        denied = options_response({"headers": {"origin": "https://evil.example"}})
        trailing_slash = options_response({"headers": {"origin": "https://one.example/"}})
        self.assertEqual(allowed["statusCode"], 204)
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], "https://one.example")
        self.assertEqual(denied["statusCode"], 403)
        self.assertNotIn("Access-Control-Allow-Origin", denied["headers"])
        self.assertEqual(trailing_slash["statusCode"], 403)
        self.assertNotIn("Access-Control-Allow-Credentials", allowed["headers"])
        for header, value in API_SECURITY_HEADERS.items():
            self.assertEqual(allowed["headers"][header], value)


if __name__ == "__main__":
    unittest.main()
