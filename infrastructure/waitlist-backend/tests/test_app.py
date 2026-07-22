import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

FUNCTION = Path(__file__).resolve().parents[1] / "function"
TEMPLATE = Path(__file__).resolve().parents[1] / "template.yaml"
sys.path.insert(0, str(FUNCTION))

import app  # noqa: E402
import common  # noqa: E402
import confirm  # noqa: E402
import contact  # noqa: E402
import resend  # noqa: E402
import ses_events  # noqa: E402
import ttl_configurator  # noqa: E402
import workflow  # noqa: E402


class Context:
    aws_request_id = "test-request"


BASE_ENV = {
    "ENVIRONMENT_NAME": "development",
    "DEVELOPMENT_ORIGIN": "https://develop.d3gd9ezfa3aujn.amplifyapp.com",
    "ADDITIONAL_DEVELOPMENT_ORIGIN": "https://www.jobseekercopilot.com",
    "PRODUCTION_ORIGIN": "https://www.jobseekercopilot.com",
    "WAITLIST_TABLE_NAME": "waitlist",
    "TOKEN_TABLE_NAME": "tokens",
    "SES_REGION": "eu-west-2",
    "WAITLIST_SENDER_EMAIL": "updates@jobseekercopilot.com",
    "PUBLIC_SUPPORT_EMAIL": "support@jobseekercopilot.com",
    "PUBLIC_SITE_URL": "https://www.jobseekercopilot.com",
    "SES_CONFIGURATION_SET": "WaitlistEmails",
    "CONFIRMATION_TOKEN_TTL_SECONDS": "172800",
    "CONFIRMATION_RESEND_COOLDOWN_SECONDS": "900",
    "MAX_CONFIRMATION_SENDS": "5",
    "CONFIRMATION_SEND_WINDOW_SECONDS": "86400",
    "PENDING_RETENTION_SECONDS": "2592000",
    "USED_TOKEN_RETENTION_SECONDS": "604800",
    "CONSENT_VERSION": "1.0",
    "ENABLE_CONTACT_SUBMISSIONS": "true",
    "CONTACT_SENDER_EMAIL": "hello@jobseekercopilot.com",
    "CONTACT_RECIPIENT_EMAIL": "hello@jobseekercopilot.com",
    "CONTACT_MESSAGE_MAX_LENGTH": "3000",
    "CONTACT_DEDUPE_TABLE_NAME": "contact-dedupe",
    "CONTACT_DEDUPE_PEPPER": "test-only-contact-dedupe-pepper-value-1234567890",
    "CONTACT_DEDUPE_TTL_SECONDS": "900",
    "CONTACT_MINIMUM_FORM_COMPLETION_MS": "1200",
}


def event(body, origin=BASE_ENV["DEVELOPMENT_ORIGIN"], method="POST"):
    return {
        "requestContext": {"http": {"method": method}},
        "headers": {"content-type": "application/json", "origin": origin},
        "body": json.dumps(body),
    }


def body(result):
    return json.loads(result["body"])


SES_EVENT_SCHEMA = {
    "Email Bounced": ("Bounce", "bounce", {"bounceType": "Permanent"}),
    "Email Complaint Received": ("Complaint", "complaint", {}),
    "Email Delivered": ("Delivery", "delivery", {}),
    "Email Delivery Delayed": ("DeliveryDelay", "deliveryDelay", {}),
    "Email Rejected": ("Reject", "reject", {}),
    "Email Rendering Failed": ("Rendering Failure", "failure", {}),
}


def ses_event(
    detail_type,
    *,
    destination="person@example.com",
    purpose="waitlist-confirmation",
    configuration_set="WaitlistEmails",
    payload=None,
):
    event_type, payload_name, default_payload = SES_EVENT_SCHEMA[detail_type]
    tags = {
        "message-purpose": [purpose],
        "ses:configuration-set": [configuration_set],
    }
    return {
        "source": "aws.ses",
        "detail-type": detail_type,
        "detail": {
            "eventType": event_type,
            "mail": {"destination": [destination], "tags": tags},
            payload_name: default_payload if payload is None else payload,
        },
    }


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

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_aws_error_scope_classifies_without_exposing_resource_values(self):
        error = Exception()
        error.response = {"Error": {"Message": (
            "not authorized on resource arn:aws:ses:eu-west-2:123:identity/private@example.com"
        )}}
        self.assertEqual(common.aws_error_scope(error), "other-email-identity")
        error.response = {"Error": {"Message": (
            "not authorized on resource "
            "arn:aws:ses:eu-west-2:123:identity/hello@jobseekercopilot.com"
        )}}
        self.assertEqual(
            common.aws_error_scope(error), "contact-sender-email-identity"
        )

    @patch.dict(os.environ, BASE_ENV, clear=True)
    def test_confirmation_email_has_html_text_expiry_and_privacy_without_email_in_url(self):
        ses = Mock()
        raw = "D" * 43
        with patch.object(common, "ses_client", return_value=ses):
            common.send_confirmation_email("person@example.com", raw)
        request = ses.send_email.call_args.kwargs
        self.assertEqual(request["FromEmailAddress"], "updates@jobseekercopilot.com")
        self.assertEqual(request["ConfigurationSetName"], "WaitlistEmails")
        self.assertEqual(
            request["EmailTags"], [{"Name": "message-purpose", "Value": "waitlist-confirmation"}]
        )
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
    def test_server_validation_normalises_strict_addresses_and_rejects_invalid_payloads(self):
        self.assertEqual(common.normalise_email(" Person+Launch@Example.COM "), "person+launch@example.com")
        for invalid in (
            "not-an-email", ".person@example.com", "person..two@example.com",
            "person@-example.com", "person@example", f"{'a' * 65}@example.com",
        ):
            with self.subTest(invalid=invalid):
                self.assertEqual(common.normalise_email(invalid), "")

        table = Mock()
        table.get_item.return_value = {}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending") as create:
            invalid_email = app.handler(event({"email": "person..two@example.com"}), Context())
            extra_field = app.handler(event({"email": "person@example.com", "status": "CONFIRMED"}), Context())
        self.assertEqual(body(invalid_email)["code"], "INVALID_EMAIL")
        self.assertEqual(body(extra_field)["code"], "INVALID_REQUEST")
        create.assert_not_called()

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
        self.assertEqual(subscriber["confirmationExpiresAt"], {"N": str(1_780_000_000 + 172_800)})
        self.assertEqual(subscriber["pendingExpiresAt"], {"N": str(1_780_000_000 + 2_592_000)})
        self.assertEqual(token["tokenHash"], {"S": hashed})
        self.assertEqual(token["expiresAt"], {"N": str(1_780_000_000 + 172_800)})
        self.assertEqual(transaction[0]["Put"]["ConditionExpression"], "attribute_not_exists(email)")
        self.assertEqual(transaction[1]["Put"]["ConditionExpression"], "attribute_not_exists(tokenHash)")
        self.assertNotIn(raw, json.dumps(transaction))

    def test_subscribe_sends_email_then_reports_pending_confirmation(self):
        table = Mock()
        table.get_item.return_value = {}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", return_value=("raw-token", "hash")), \
             patch.object(app, "send_confirmation_email") as send, \
             patch.object(app, "mark_confirmation_sent") as mark:
            result = app.handler(event({"email": " Person@Example.com "}), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result)["code"], "WAITLIST_REQUEST_ACCEPTED")
        self.assertIn("If this address needs confirmation", body(result)["message"])
        send.assert_called_once_with("person@example.com", "raw-token")
        mark.assert_called_once_with("person@example.com", "hash")

    def test_existing_states_return_one_neutral_contract_without_sending(self):
        results = []
        records = [
            {"email": "person@example.com", "status": "PENDING",
             "confirmationExpiresAt": 9_999_999_999, "currentConfirmationTokenHash": "hash"},
            {"email": "person@example.com", "status": "CONFIRMED"},
            {"email": "person@example.com", "status": "UNSUBSCRIBED"},
            {"email": "person@example.com", "status": "BOUNCED"},
            {"email": "person@example.com", "status": "COMPLAINED"},
        ]
        table = Mock()
        table.get_item.side_effect = [{"Item": record} for record in records]
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "send_confirmation_email") as send:
            for _ in records:
                results.append(app.handler(event({"email": "person@example.com"}), Context()))
        public_results = [(result["statusCode"], body(result)["code"], body(result)["message"]) for result in results]
        self.assertTrue(all(result == public_results[0] for result in public_results))
        self.assertEqual(public_results[0][0:2], (202, "WAITLIST_REQUEST_ACCEPTED"))
        send.assert_not_called()

    def test_concurrent_create_loser_resolves_to_the_neutral_existing_contract(self):
        conflict = Exception("private transaction detail")
        conflict.response = {"Error": {"Code": "TransactionCanceledException"}}
        table = Mock()
        table.get_item.side_effect = [
            {},
            {"Item": {"email": "person@example.com", "status": "CONFIRMED"}},
        ]
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", side_effect=conflict), \
             patch.object(app, "send_confirmation_email") as send:
            result = app.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result)["code"], "WAITLIST_REQUEST_ACCEPTED")
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

    def test_successful_ses_send_survives_delivery_metadata_write_failure(self):
        table = Mock()
        table.get_item.return_value = {}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", return_value=("raw-token", "hash")), \
             patch.object(app, "send_confirmation_email") as send, \
             patch.object(app, "mark_confirmation_sent", side_effect=RuntimeError("private table detail")), \
             patch.object(app, "mark_confirmation_failure") as failed, \
             self.assertLogs(level="INFO") as captured:
            result = app.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result)["code"], "WAITLIST_REQUEST_ACCEPTED")
        send.assert_called_once()
        failed.assert_not_called()
        self.assertNotIn("private table detail", " ".join(captured.output))

    def test_dynamodb_failure_returns_a_stable_safe_error_without_sending(self):
        table = Mock()
        table.get_item.return_value = {}
        with patch.object(app, "subscriber_table", return_value=table), \
             patch.object(app, "create_pending", side_effect=RuntimeError("private table and email detail")), \
             patch.object(app, "send_confirmation_email") as send, \
             self.assertLogs(level="INFO") as captured:
            result = app.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(body(result)["code"], "SERVICE_UNAVAILABLE")
        self.assertNotIn("private table and email detail", result["body"])
        self.assertNotIn("private table and email detail", " ".join(captured.output))
        send.assert_not_called()


@patch.dict(os.environ, BASE_ENV, clear=True)
class ResendTests(unittest.TestCase):
    def test_failed_delivery_state_clears_the_attempt_cooldown_for_recovery(self):
        table = Mock()
        with patch.object(workflow, "subscriber_table", return_value=table), \
             patch.object(workflow, "now_epoch", return_value=2_000):
            workflow.mark_confirmation_failure("person@example.com", "hash")
        request = table.update_item.call_args.kwargs
        self.assertIn("REMOVE lastConfirmationAttemptAtEpoch", request["UpdateExpression"])
        self.assertIn("currentConfirmationTokenHash=:hash", request["ConditionExpression"])

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

    def test_resend_is_neutral_and_sends_nothing_for_confirmed_or_suppressed_records(self):
        table = Mock()
        table.get_item.side_effect = [
            {"Item": {"email": "person@example.com", "status": status}}
            for status in ("CONFIRMED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED")
        ]
        with patch.object(resend, "subscriber_table", return_value=table), \
             patch.object(resend, "rotate_pending_token") as rotate, \
             patch.object(resend, "send_confirmation_email") as send:
            results = [resend.handler(event({"email": "person@example.com"}), Context()) for _ in range(4)]
        self.assertTrue(all(result["statusCode"] == 202 for result in results))
        self.assertTrue(all(body(result)["code"] == "WAITLIST_RESEND_ACCEPTED" for result in results))
        self.assertEqual(len({body(result)["message"] for result in results}), 1)
        rotate.assert_not_called()
        send.assert_not_called()

    def test_concurrent_resend_loser_returns_the_neutral_contract(self):
        conflict = Exception("private transaction detail")
        conflict.response = {"Error": {"Code": "TransactionCanceledException"}}
        table = Mock()
        table.get_item.return_value = {"Item": {"email": "person@example.com", "status": "PENDING"}}
        with patch.object(resend, "subscriber_table", return_value=table), \
             patch.object(resend, "rotate_pending_token", side_effect=conflict), \
             patch.object(resend, "send_confirmation_email") as send:
            result = resend.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result)["code"], "WAITLIST_RESEND_ACCEPTED")
        send.assert_not_called()

    def test_resend_ses_failure_keeps_new_token_recoverable_and_response_neutral(self):
        table = Mock()
        table.get_item.return_value = {"Item": {"email": "person@example.com", "status": "PENDING"}}
        with patch.object(resend, "subscriber_table", return_value=table), \
             patch.object(resend, "rotate_pending_token", return_value=("raw-token", "new-hash", "issued")), \
             patch.object(resend, "send_confirmation_email", side_effect=RuntimeError("private SES detail")), \
             patch.object(resend, "mark_confirmation_failure") as failed, \
             patch.object(resend, "mark_confirmation_sent") as sent:
            result = resend.handler(event({"email": "person@example.com"}), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result)["code"], "WAITLIST_RESEND_ACCEPTED")
        failed.assert_called_once_with("person@example.com", "new-hash")
        sent.assert_not_called()


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
        subscriber_update = actions[0]["Update"]
        self.assertIn("#status=:pending", subscriber_update["ConditionExpression"])
        self.assertIn("currentConfirmationTokenHash=:hash", subscriber_update["ConditionExpression"])
        self.assertIn("confirmationExpiresAt>=:now", subscriber_update["ConditionExpression"])
        for field in (
            "currentConfirmationTokenHash", "confirmationExpiresAt", "pendingExpiresAt",
            "lastConfirmationAttemptAtEpoch", "confirmationSendWindowStartedAtEpoch",
            "confirmationSendCount", "confirmationSentAt", "lastConfirmationDeliveryErrorAt",
        ):
            self.assertIn(field, subscriber_update["UpdateExpression"])
        self.assertIn("REMOVE email", actions[1]["Update"]["UpdateExpression"])
        self.assertFalse(hasattr(tokens, "scan") and tokens.scan.called)

    def test_malformed_and_unknown_tokens_are_rejected_before_any_update(self):
        tokens = Mock()
        tokens.get_item.return_value = {}
        ddb = Mock()
        with patch.object(confirm, "token_table", return_value=tokens), \
             patch.object(confirm, "dynamodb_client", return_value=ddb):
            malformed = confirm.handler(event({"token": "contains.email@example.com"}), Context())
            too_long = confirm.handler(event({"token": "a" * 129}), Context())
            unknown = confirm.handler(event({"token": self.RAW}), Context())
        self.assertEqual([body(result)["code"] for result in (malformed, too_long, unknown)], [
            "CONFIRMATION_TOKEN_INVALID", "CONFIRMATION_TOKEN_INVALID", "CONFIRMATION_TOKEN_INVALID",
        ])
        self.assertEqual(tokens.get_item.call_count, 1)
        ddb.transact_write_items.assert_not_called()

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

    def test_concurrent_confirmation_loser_resolves_idempotently_without_reusing_the_token(self):
        active = {"tokenHash": self.HASH, "email": "person@example.com", "status": "ACTIVE", "expiresAt": 3_000}
        used = {"tokenHash": self.HASH, "status": "USED", "expiresAt": 3_000}
        tokens = Mock()
        tokens.get_item.side_effect = [{"Item": active}, {"Item": used}]
        conflict = Exception("private transaction detail")
        conflict.response = {"Error": {"Code": "TransactionCanceledException"}}
        ddb = Mock()
        ddb.transact_write_items.side_effect = conflict
        with patch.object(confirm, "token_table", return_value=tokens), \
             patch.object(confirm, "dynamodb_client", return_value=ddb), \
             patch.object(confirm, "now_epoch", return_value=2_000):
            result = confirm.handler(event({"token": self.RAW}), Context())
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(body(result)["code"], "WAITLIST_ALREADY_CONFIRMED")
        self.assertEqual(ddb.transact_write_items.call_count, 1)


@patch.dict(os.environ, BASE_ENV, clear=True)
class EventAndSecurityTests(unittest.TestCase):
    def test_transaction_iam_is_explicit_and_never_wildcarded(self):
        template = TEMPLATE.read_text(encoding="utf-8")
        waitlist_role = template.split("  WaitlistExecutionRole:", 1)[1].split(
            "  ConfirmationExecutionRole:", 1
        )[0]
        confirmation_role = template.split("  ConfirmationExecutionRole:", 1)[1].split(
            "  ResendExecutionRole:", 1
        )[0]
        resend_role = template.split("  ResendExecutionRole:", 1)[1].split(
            "  SesEventsExecutionRole:", 1
        )[0]
        self.assertIn(
            "Action: [dynamodb:GetItem, dynamodb:PutItem, dynamodb:UpdateItem, dynamodb:TransactWriteItems]",
            waitlist_role,
        )
        self.assertIn("Action: [dynamodb:PutItem, dynamodb:TransactWriteItems]", waitlist_role)
        self.assertIn(
            "Action: [dynamodb:GetItem, dynamodb:UpdateItem, dynamodb:TransactWriteItems]",
            confirmation_role,
        )
        self.assertIn(
            "Action: [dynamodb:UpdateItem, dynamodb:TransactWriteItems]",
            confirmation_role,
        )
        self.assertIn(
            "Action: [dynamodb:GetItem, dynamodb:UpdateItem, dynamodb:TransactWriteItems]",
            resend_role,
        )
        self.assertIn(
            "Action: [dynamodb:DeleteItem, dynamodb:PutItem, dynamodb:TransactWriteItems]",
            resend_role,
        )
        self.assertNotIn("Action: dynamodb:*", template)
        self.assertNotIn("Resource: '*'", template)

    def test_bounce_and_complaint_mark_suppression_states(self):
        table = Mock()
        with patch.object(ses_events, "subscriber_table", return_value=table):
            bounced = ses_events.handler(ses_event("Email Bounced"), Context())
            complained = ses_events.handler(ses_event("Email Complaint Received"), Context())
        statuses = [call.kwargs["ExpressionAttributeValues"][":status"] for call in table.update_item.call_args_list]
        self.assertEqual(statuses, ["BOUNCED", "COMPLAINED"])
        self.assertEqual(bounced, {"processed": 1})
        self.assertEqual(complained, {"processed": 1})
        bounce_condition = table.update_item.call_args_list[0].kwargs["ConditionExpression"]
        complaint_condition = table.update_item.call_args_list[1].kwargs["ConditionExpression"]
        self.assertIn(":excluded2", bounce_condition)
        self.assertNotIn(":excluded2", complaint_condition)

    def test_non_permanent_bounce_records_issue_without_suppressing(self):
        table = Mock()
        with patch.object(ses_events, "subscriber_table", return_value=table), \
             patch.object(ses_events, "metric") as emit_metric:
            result = ses_events.handler(
                ses_event("Email Bounced", payload={"bounceType": "Transient"}), Context()
            )
        request = table.update_item.call_args.kwargs
        self.assertEqual(result, {"processed": 1})
        self.assertIn("lastEmailDeliveryIssueAt", request["UpdateExpression"])
        self.assertNotIn(":status", request["ExpressionAttributeValues"])
        emit_metric.assert_any_call("SesTransientBounces")
        emit_metric.assert_any_call("SesDeliveryFailures")
        self.assertEqual(emit_metric.call_count, 2)

    def test_delivery_and_delivery_issue_events_update_only_existing_non_suppressed_records(self):
        table = Mock()
        detail_types = [
            "Email Delivered",
            "Email Delivery Delayed",
            "Email Rejected",
            "Email Rendering Failed",
        ]
        with patch.object(ses_events, "subscriber_table", return_value=table), \
             patch.object(ses_events, "metric") as emit_metric:
            results = [ses_events.handler(ses_event(value), Context()) for value in detail_types]
        self.assertEqual(results, [{"processed": 1}] * len(detail_types))
        updates = [call.kwargs for call in table.update_item.call_args_list]
        self.assertIn("lastEmailDeliveredAt", updates[0]["UpdateExpression"])
        self.assertTrue(all("#status<>:complained" in value["ConditionExpression"] for value in updates))
        self.assertTrue(
            all("lastEmailDeliveryIssueAt" in value["UpdateExpression"] for value in updates[1:])
        )
        emit_metric.assert_any_call("SesDeliveries")
        self.assertEqual(
            sum(call.args == ("SesDeliveryFailures",) for call in emit_metric.call_args_list),
            3,
        )

    def test_duplicate_or_out_of_order_suppression_is_an_idempotent_no_op(self):
        table = Mock()
        conflict = Exception("conditional details must remain private")
        conflict.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        table.update_item.side_effect = conflict
        with patch.object(ses_events, "subscriber_table", return_value=table), \
             self.assertLogs(level="INFO") as captured:
            result = ses_events.handler(ses_event("Email Bounced"), Context())
        self.assertEqual(result, {"processed": 0})
        output = " ".join(captured.output)
        self.assertIn("permanent-bounce-suppressed-no-op", output)
        self.assertNotIn("person@example.com", output)
        self.assertNotIn("conditional details", output)

    def test_contact_events_emit_purpose_specific_metrics_without_touching_subscriber_data(self):
        table = Mock()
        contact_events = [
            ses_event(
                detail_type,
                destination="private-company-inbox@example.com",
                purpose="contact-enquiry",
            )
            for detail_type in (
                "Email Delivered",
                "Email Bounced",
                "Email Complaint Received",
                "Email Rejected",
            )
        ]
        missing_tag_event = ses_event("Email Bounced")
        del missing_tag_event["detail"]["mail"]["tags"]["message-purpose"]
        with patch.object(ses_events, "subscriber_table", return_value=table) as subscriber, \
             patch.object(ses_events, "metric") as emit_metric, \
             self.assertLogs(level="INFO") as captured:
            contact_results = [ses_events.handler(value, Context()) for value in contact_events]
            missing_result = ses_events.handler(missing_tag_event, Context())
        self.assertEqual(contact_results, [{"processed": 1}] * len(contact_events))
        self.assertEqual(missing_result, {"processed": 0})
        subscriber.assert_not_called()
        table.update_item.assert_not_called()
        for metric_name in (
            "ContactSesDeliveries",
            "ContactSesBounces",
            "ContactSesComplaints",
            "ContactSesDeliveryFailures",
        ):
            emit_metric.assert_any_call(
                metric_name, namespace=ses_events.CONTACT_METRIC_NAMESPACE
            )
        logs = " ".join(captured.output)
        self.assertIn("ignored-non-approved-purpose", logs)
        self.assertNotIn("private-company-inbox@example.com", logs)
        self.assertNotIn("person@example.com", logs)

    def test_wrong_configuration_set_unknown_event_and_malformed_schema_never_access_data(self):
        table = Mock()
        wrong_configuration = ses_event("Email Complaint Received", configuration_set="OtherSet")
        wrong_event_type = ses_event("Email Complaint Received")
        wrong_event_type["detail"]["eventType"] = "Bounce"
        multiple_recipients = ses_event("Email Bounced")
        multiple_recipients["detail"]["mail"]["destination"].append("other@example.com")
        events = [wrong_configuration, wrong_event_type, multiple_recipients, {"source": "unknown"}]
        with patch.object(ses_events, "subscriber_table", return_value=table) as subscriber:
            results = [ses_events.handler(value, Context()) for value in events]
        self.assertEqual(results, [{"processed": 0}] * len(events))
        subscriber.assert_not_called()
        table.update_item.assert_not_called()

    def test_dynamodb_failure_is_retried_with_only_redacted_error_scope(self):
        table = Mock()
        failure = Exception("table and person@example.com must not be logged")
        failure.response = {"Error": {"Code": "ProvisionedThroughputExceededException"}}
        table.update_item.side_effect = failure
        with patch.object(ses_events, "subscriber_table", return_value=table), \
             patch.object(ses_events, "metric") as emit_metric, \
             self.assertLogs(level="ERROR") as captured, \
             self.assertRaises(Exception):
            ses_events.handler(ses_event("Email Complaint Received"), Context())
        emit_metric.assert_any_call("SesComplaints")
        emit_metric.assert_any_call("SesEventUpdateFailures")
        output = " ".join(captured.output)
        self.assertIn("ProvisionedThroughputExceededException", output)
        self.assertNotIn("person@example.com", output)
        self.assertNotIn("table and", output)

    def test_ses_event_function_receives_the_exact_configuration_set(self):
        template = TEMPLATE.read_text(encoding="utf-8")
        function = template.split("  SesEventsFunction:", 1)[1].split("  TtlConfigurationFunction:", 1)[0]
        self.assertIn("SES_CONFIGURATION_SET: !Ref WaitlistEmailConfigurationSet", function)

    def test_launch_monitoring_has_scoped_actions_valid_dimensions_and_no_private_output(self):
        template = TEMPLATE.read_text(encoding="utf-8")
        notification_parameter = template.split("  AlarmNotificationEmail:", 1)[1].split(
            "\nConditions:", 1
        )[0]
        self.assertIn("NoEcho: true", notification_parameter)
        self.assertIn(
            r"AllowedPattern: '^$|^[^@\s]+@[^@\s]+\.[^@\s]+$'",
            notification_parameter,
        )
        self.assertNotIn("[:space:]", notification_parameter)
        self.assertIn("HasAlarmNotificationEmail:", template)
        self.assertIn("  AlarmNotificationTopic:\n", template)
        self.assertIn("  AlarmNotificationTopicPolicy:\n", template)
        self.assertIn("Principal: {Service: cloudwatch.amazonaws.com}", template)
        self.assertIn("aws:SourceAccount: !Ref AWS::AccountId", template)
        self.assertIn("aws:SourceArn: !Sub arn:${AWS::Partition}:cloudwatch:", template)
        self.assertIn("Condition: HasAlarmNotificationEmail", template)
        self.assertIn("AlarmActions: &LandingAlarmActions [!Ref AlarmNotificationTopic]", template)
        self.assertIn("OKActions: &LandingOkActions [!Ref AlarmNotificationTopic]", template)

        for route_filter in (
            "WaitlistSubmitThrottleMetricFilter",
            "WaitlistConfirmationThrottleMetricFilter",
            "WaitlistResendThrottleMetricFilter",
            "ContactApiThrottleMetricFilter",
        ):
            self.assertIn(f"  {route_filter}:\n", template)
        self.assertEqual(template.count('$.status = "429"'), 4)
        self.assertNotIn("MetricName: ThrottledRequests", template)
        self.assertEqual(template.count("MetricName: SystemErrors"), 11)
        self.assertIn("- {Name: Operation, Value: PutItem}", template)
        self.assertIn("- {Name: Operation, Value: TransactWriteItems}", template)

        for alarm in (
            "WaitlistThrottleVolumeAlarm",
            "TokenDynamoThrottlingAlarm",
            "ContactDynamoThrottlingAlarm",
            "WaitlistDynamoSystemErrorAlarm",
            "TokenDynamoSystemErrorAlarm",
            "ContactDynamoSystemErrorAlarm",
            "SesDeliveryFailureAlarm",
            "ContactSesBounceAlarm",
            "ContactSesComplaintAlarm",
            "ContactSesDeliveryFailureAlarm",
            "ContactDedupeReleaseFailureAlarm",
            "TtlConfigurationLambdaErrorAlarm",
            "MonitoringNotificationCanaryAlarm",
        ):
            self.assertIn(f"  {alarm}:\n", template)

        self.assertIn("  LaunchMonitoringDashboard:\n", template)
        outputs = template.split("Outputs:", 1)[1]
        self.assertIn("AlarmNotificationTopicArn", outputs)
        self.assertIn("LaunchMonitoringDashboardName", outputs)
        self.assertNotIn("Value: !Ref AlarmNotificationEmail", outputs)

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

    def test_deployed_handlers_do_not_emit_exception_tracebacks(self):
        for source in FUNCTION.glob("*.py"):
            text = source.read_text(encoding="utf-8")
            self.assertNotIn("LOGGER.exception(", text, source.name)
            self.assertNotIn("logger.exception(", text, source.name)
            self.assertNotIn("exc_info=True", text, source.name)

    def test_cors_allows_only_exact_development_canonical_and_production_origins(self):
        allowed = app.handler(event({}, method="OPTIONS"), Context())
        canonical = app.handler(
            event({}, origin=BASE_ENV["ADDITIONAL_DEVELOPMENT_ORIGIN"], method="OPTIONS"), Context()
        )
        denied = app.handler(event({}, origin="https://develop.attacker.amplifyapp.com", method="OPTIONS"), Context())
        trailing_slash = app.handler(
            event({}, origin=f"{BASE_ENV['DEVELOPMENT_ORIGIN']}/", method="OPTIONS"), Context()
        )
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], BASE_ENV["DEVELOPMENT_ORIGIN"])
        self.assertEqual(
            canonical["headers"]["Access-Control-Allow-Origin"], BASE_ENV["ADDITIONAL_DEVELOPMENT_ORIGIN"]
        )
        self.assertEqual(denied["statusCode"], 403)
        self.assertNotIn("Access-Control-Allow-Origin", denied["headers"])
        self.assertEqual(trailing_slash["statusCode"], 403)
        self.assertNotIn("Access-Control-Allow-Credentials", allowed["headers"])
        for header, value in common.API_SECURITY_HEADERS.items():
            self.assertEqual(allowed["headers"][header], value)
        with patch.dict(os.environ, {**BASE_ENV, "ENVIRONMENT_NAME": "production"}, clear=True):
            production = app.handler(event({}, origin=BASE_ENV["PRODUCTION_ORIGIN"], method="OPTIONS"), Context())
            apex = app.handler(event({}, origin="https://jobseekercopilot.com", method="OPTIONS"), Context())
        self.assertEqual(production["headers"]["Access-Control-Allow-Origin"], BASE_ENV["PRODUCTION_ORIGIN"])
        self.assertEqual(apex["statusCode"], 403)


@patch.dict(os.environ, {"WAITLIST_TABLE_NAME": "waitlist"}, clear=True)
class TableSafeguardTests(unittest.TestCase):
    def test_disabled_safeguards_are_enabled_without_accessing_items(self):
        client = Mock()
        client.describe_time_to_live.return_value = {
            "TimeToLiveDescription": {"TimeToLiveStatus": "DISABLED"}
        }
        client.describe_continuous_backups.return_value = {
            "ContinuousBackupsDescription": {
                "PointInTimeRecoveryDescription": {"PointInTimeRecoveryStatus": "DISABLED"}
            }
        }
        client.describe_table.return_value = {
            "Table": {"TableStatus": "ACTIVE", "DeletionProtectionEnabled": False}
        }
        with patch.object(ttl_configurator, "_dynamodb_client", return_value=client):
            ttl_configurator._ensure_safeguards()
        client.update_time_to_live.assert_called_once_with(
            TableName="waitlist",
            TimeToLiveSpecification={"Enabled": True, "AttributeName": "pendingExpiresAt"},
        )
        client.update_continuous_backups.assert_called_once_with(
            TableName="waitlist",
            PointInTimeRecoverySpecification={"PointInTimeRecoveryEnabled": True},
        )
        client.update_table.assert_called_once_with(
            TableName="waitlist", DeletionProtectionEnabled=True
        )
        self.assertFalse(hasattr(client, "scan") and client.scan.called)

    def test_enabled_safeguards_are_idempotent(self):
        client = Mock()
        client.describe_time_to_live.return_value = {
            "TimeToLiveDescription": {
                "TimeToLiveStatus": "ENABLED", "AttributeName": "pendingExpiresAt"
            }
        }
        client.describe_continuous_backups.return_value = {
            "ContinuousBackupsDescription": {
                "PointInTimeRecoveryDescription": {"PointInTimeRecoveryStatus": "ENABLED"}
            }
        }
        client.describe_table.return_value = {
            "Table": {"TableStatus": "ACTIVE", "DeletionProtectionEnabled": True}
        }
        with patch.object(ttl_configurator, "_dynamodb_client", return_value=client):
            ttl_configurator._ensure_safeguards()
        client.update_time_to_live.assert_not_called()
        client.update_continuous_backups.assert_not_called()
        client.update_table.assert_not_called()

    def test_conflicting_ttl_attribute_fails_closed_before_other_updates(self):
        client = Mock()
        client.describe_time_to_live.return_value = {
            "TimeToLiveDescription": {
                "TimeToLiveStatus": "ENABLED", "AttributeName": "otherExpiry"
            }
        }
        with patch.object(ttl_configurator, "_dynamodb_client", return_value=client):
            with self.assertRaisesRegex(RuntimeError, "different attribute"):
                ttl_configurator._ensure_safeguards()
        client.describe_continuous_backups.assert_not_called()
        client.describe_table.assert_not_called()
        client.update_time_to_live.assert_not_called()
        client.update_continuous_backups.assert_not_called()
        client.update_table.assert_not_called()

    def test_stack_delete_is_a_no_op_and_failures_are_sanitized(self):
        context = Mock()
        event_base = {
            "StackId": "stack", "RequestId": "request", "LogicalResourceId": "safeguards",
            "ResponseURL": "https://cloudformation-response.invalid",
        }
        with patch.object(ttl_configurator, "_ensure_safeguards") as ensure, \
             patch.object(ttl_configurator, "_send_response") as send:
            ttl_configurator.handler({**event_base, "RequestType": "Delete"}, context)
        ensure.assert_not_called()
        self.assertEqual(send.call_args.args[2], "SUCCESS")
        self.assertIn("no-op", send.call_args.args[3])

        with patch.object(
            ttl_configurator, "_ensure_safeguards", side_effect=RuntimeError("private table detail")
        ), patch.object(ttl_configurator, "_send_response") as send:
            ttl_configurator.handler({**event_base, "RequestType": "Update"}, context)
        self.assertEqual(send.call_args.args[2], "FAILED")
        self.assertNotIn("private table detail", send.call_args.args[3])

    def test_custom_resource_response_url_allows_only_https_aws_hosts(self):
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 10_000
        event_base = {
            "StackId": "stack", "RequestId": "request", "LogicalResourceId": "safeguards",
        }
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        trusted = {
            **event_base,
            "ResponseURL": "https://cloudformation-custom-resource-response-eu-west-2.s3.amazonaws.com/path?signature=redacted",
        }
        with patch.object(ttl_configurator.urllib.request, "urlopen", return_value=response) as urlopen:
            ttl_configurator._send_response(trusted, context, "SUCCESS", "Configured.")
        self.assertEqual(urlopen.call_count, 1)
        request = urlopen.call_args.args[0]
        self.assertTrue(request.full_url.startswith("https://"))

        for untrusted in (
            "http://s3.amazonaws.com/path",
            "https://s3.amazonaws.com.attacker.test/path",
            "https://user@s3.amazonaws.com/path",
            "https://s3.amazonaws.com:444/path",
        ):
            with patch.object(ttl_configurator.urllib.request, "urlopen") as urlopen, \
                 self.assertRaisesRegex(RuntimeError, "response URL is invalid"):
                ttl_configurator._send_response(
                    {**event_base, "ResponseURL": untrusted}, context, "SUCCESS", "Configured."
                )
            urlopen.assert_not_called()

    def test_template_retains_and_protects_tables_with_exact_safeguard_iam(self):
        template = TEMPLATE.read_text(encoding="utf-8")
        token_section = template.split("  TokenTable:", 1)[1].split("  WaitlistEmailConfigurationSet:", 1)[0]
        self.assertIn("DeletionPolicy: Retain", token_section)
        self.assertIn("UpdateReplacePolicy: Retain", token_section)
        self.assertIn("PointInTimeRecoveryEnabled: true", token_section)
        self.assertIn("SSEEnabled: true", token_section)
        self.assertIn("AttributeName: deleteAfter", token_section)
        self.assertIn("DeletionProtectionEnabled: true", token_section)
        role_section = template.split("  TtlConfigurationExecutionRole:", 1)[1].split(
            "  WaitlistFunction:", 1
        )[0]
        for action in (
            "DescribeTimeToLive", "UpdateTimeToLive", "DescribeContinuousBackups",
            "UpdateContinuousBackups", "DescribeTable", "UpdateTable",
        ):
            self.assertIn(f"dynamodb:{action}", role_section)
        self.assertNotIn("dynamodb:*", role_section)
        self.assertNotIn("Resource: '*'", role_section)


@patch.dict(os.environ, BASE_ENV, clear=True)
class ContactTests(unittest.TestCase):
    def setUp(self):
        self.dedupe = Mock()
        self.dedupe_patcher = patch.object(contact, "dedupe_table", return_value=self.dedupe)
        self.dedupe_patcher.start()
        self.addCleanup(self.dedupe_patcher.stop)

    def valid_payload(self):
        return {
            "name": "  Zoë   <Admin>  ",
            "email": " Person@Example.COM ",
            "subject": "  Product   partnership  ",
            "message": "  Could you review <script>alert('x')</script>?\nMerci — café.  ",
            "source": "landing-page",
            "website": "",
            "formStartedAt": 1_780_000_000_000,
        }

    def test_valid_contact_uses_trusted_envelope_reply_to_and_escaped_utf8_bodies(self):
        ses = Mock()
        with patch.object(contact, "ses_client", return_value=ses), \
             patch.object(contact, "utc_iso", return_value="2026-07-22T13:00:00Z"), \
             self.assertLogs(level="INFO") as captured:
            result = contact.handler(event(self.valid_payload()), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result), {
            "success": True, "code": "CONTACT_ACCEPTED", "message": "Your message has been sent.",
        })
        request = ses.send_email.call_args.kwargs
        self.assertEqual(request["FromEmailAddress"], "hello@jobseekercopilot.com")
        self.assertEqual(request["Destination"], {"ToAddresses": ["hello@jobseekercopilot.com"]})
        self.assertEqual(request["ReplyToAddresses"], ["person@example.com"])
        self.assertEqual(request["ConfigurationSetName"], "WaitlistEmails")
        self.assertEqual(request["EmailTags"], [{"Name": "message-purpose", "Value": "contact-enquiry"}])
        simple = request["Content"]["Simple"]
        self.assertEqual(simple["Subject"]["Data"], "Job Seeker Copilot enquiry: Product partnership")
        self.assertEqual(simple["Subject"]["Charset"], "UTF-8")
        text_content = simple["Body"]["Text"]["Data"]
        html_content = simple["Body"]["Html"]["Data"]
        self.assertIn("Zoë <Admin>", text_content)
        self.assertIn("Merci — café.", text_content)
        self.assertIn("Zoë &lt;Admin&gt;", html_content)
        self.assertIn("&lt;script&gt;alert(&#x27;x&#x27;)&lt;/script&gt;", html_content)
        self.assertNotIn("<script>", html_content)
        logs = " ".join(captured.output)
        self.assertNotIn("person@example.com", logs)
        self.assertNotIn("Merci", logs)
        reservation = self.dedupe.put_item.call_args.kwargs
        self.assertEqual(set(reservation["Item"]), {"fingerprint", "expiresAt", "owner"})
        self.assertEqual(len(reservation["Item"]["fingerprint"]), 64)
        self.assertEqual(reservation["Item"]["owner"], "test-request")
        self.assertEqual(
            reservation["ConditionExpression"],
            "attribute_not_exists(fingerprint) OR expiresAt < :now",
        )
        stored = json.dumps(reservation)
        self.assertNotIn("person@example.com", stored)
        self.assertNotIn("Product partnership", stored)
        self.assertNotIn("Merci", stored)

    def test_options_uses_exact_origin_cors_without_sending(self):
        ses = Mock()
        with patch.object(contact, "ses_client", return_value=ses):
            allowed = contact.handler(event({}, method="OPTIONS"), Context())
            denied = contact.handler(
                event({}, origin="https://obsolete.example.test", method="OPTIONS"), Context()
            )
        self.assertEqual(allowed["statusCode"], 204)
        self.assertEqual(
            allowed["headers"]["Access-Control-Allow-Origin"], BASE_ENV["DEVELOPMENT_ORIGIN"]
        )
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Methods"], "POST,OPTIONS")
        self.assertEqual(denied["statusCode"], 403)
        ses.send_email.assert_not_called()

    def test_disabled_contact_fails_closed_before_parsing_or_sending(self):
        ses = Mock()
        with patch.dict(os.environ, {**BASE_ENV, "ENABLE_CONTACT_SUBMISSIONS": "false"}, clear=True), \
             patch.object(contact, "ses_client", return_value=ses):
            result = contact.handler(event(self.valid_payload()), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(body(result)["code"], "CONTACT_UNAVAILABLE")
        ses.send_email.assert_not_called()

    def test_content_type_malformed_json_and_body_size_are_bounded(self):
        valid = event(self.valid_payload())
        cases = [
            {**valid, "headers": {**valid["headers"], "content-type": "text/plain"}},
            {**valid, "body": "{"},
            {**valid, "body": "x" * 4097},
        ]
        with patch.object(contact, "ses_client") as ses:
            results = [contact.handler(case, Context()) for case in cases]
        self.assertEqual([result["statusCode"] for result in results], [415, 400, 400])
        self.assertEqual([body(result)["code"] for result in results], [
            "UNSUPPORTED_MEDIA_TYPE", "INVALID_JSON", "INVALID_REQUEST",
        ])
        ses.return_value.send_email.assert_not_called()

    def test_missing_extra_empty_oversized_and_automation_fields_are_rejected(self):
        valid = self.valid_payload()
        missing = {key: value for key, value in valid.items() if key != "name"}
        cases = [
            missing,
            {**valid, "recipient": "attacker@example.com"},
            {**valid, "name": "   "},
            {**valid, "email": "not-an-email"},
            {**valid, "subject": "x" * 161},
            {**valid, "message": "   "},
            {**valid, "message": "x" * 3001},
            {**valid, "source": "attacker-controlled"},
            {**valid, "website": "bot-value"},
            {**valid, "formStartedAt": "now"},
            {**valid, "formStartedAt": True},
            {**valid, "formStartedAt": -1},
        ]
        ses = Mock()
        with patch.object(contact, "ses_client", return_value=ses):
            results = [contact.handler(event(payload), Context()) for payload in cases]
        self.assertTrue(all(result["statusCode"] == 400 for result in results))
        self.assertTrue(all(body(result)["success"] is False for result in results))
        ses.send_email.assert_not_called()
        self.dedupe.put_item.assert_not_called()

    def test_honeypot_and_too_fast_submission_emit_only_redacted_metrics(self):
        valid = self.valid_payload()
        with patch.object(contact.time, "time", return_value=1_780_000_000.5), \
             patch.object(contact, "ses_client") as ses, \
             self.assertLogs(level="INFO") as captured:
            honeypot = contact.handler(event({**valid, "website": "bot@example.com"}), Context())
            too_fast = contact.handler(event({**valid, "formStartedAt": 1_780_000_000_000}), Context())
        self.assertEqual([honeypot["statusCode"], too_fast["statusCode"]], [400, 400])
        logs = " ".join(captured.output)
        self.assertIn("ContactHoneypotRejections", logs)
        self.assertIn("ContactTooFastRejections", logs)
        self.assertIn("ContactValidationRejections", logs)
        self.assertNotIn("bot@example.com", logs)
        self.assertNotIn("Merci", logs)
        ses.return_value.send_email.assert_not_called()
        self.dedupe.put_item.assert_not_called()

    def test_duplicate_returns_same_success_without_a_second_email(self):
        duplicate = Exception("private duplicate detail")
        duplicate.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        self.dedupe.put_item.side_effect = duplicate
        ses = Mock()
        with patch.object(contact, "ses_client", return_value=ses), \
             self.assertLogs(level="INFO") as captured:
            result = contact.handler(event(self.valid_payload()), Context())
        self.assertEqual(result["statusCode"], 202)
        self.assertEqual(body(result), {
            "success": True, "code": "CONTACT_ACCEPTED", "message": "Your message has been sent.",
        })
        ses.send_email.assert_not_called()
        logs = " ".join(captured.output)
        self.assertIn("ContactDuplicateSuppressions", logs)
        self.assertNotIn("private duplicate detail", logs)
        self.assertNotIn("person@example.com", logs)

    def test_dedupe_dependency_failure_fails_before_ses_with_redacted_monitoring(self):
        failure = Exception("private table detail person@example.com")
        failure.response = {"Error": {"Code": "InternalServerError", "Message": str(failure)}}
        self.dedupe.put_item.side_effect = failure
        ses = Mock()
        with patch.object(contact, "ses_client", return_value=ses), \
             self.assertLogs(level="INFO") as captured:
            result = contact.handler(event(self.valid_payload()), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(body(result)["code"], "CONTACT_TEMPORARILY_UNAVAILABLE")
        ses.send_email.assert_not_called()
        evidence = result["body"] + " ".join(captured.output)
        self.assertIn("ContactDedupeFailures", evidence)
        self.assertNotIn("private table detail", evidence)
        self.assertNotIn("person@example.com", evidence)

    def test_crlf_header_injection_and_message_control_characters_are_rejected(self):
        valid = self.valid_payload()
        cases = [
            {**valid, "name": "Alex\r\nBcc: attacker@example.com"},
            {**valid, "email": "person@example.com\r\nBcc:attacker@example.com"},
            {**valid, "subject": "Question\r\nBcc: attacker@example.com"},
            {**valid, "message": "Valid message text\x00hidden"},
        ]
        ses = Mock()
        with patch.object(contact, "ses_client", return_value=ses):
            results = [contact.handler(event(payload), Context()) for payload in cases]
        self.assertTrue(all(result["statusCode"] == 400 for result in results))
        ses.send_email.assert_not_called()

    def test_ses_failure_returns_and_logs_only_stable_redacted_details(self):
        failure = Exception("private provider detail person@example.com")
        failure.response = {"Error": {
            "Code": "AccessDeniedException",
            "Message": (
                "not authorized on resource "
                "arn:aws:ses:eu-west-2:123:identity/hello@jobseekercopilot.com "
                "because private provider detail person@example.com"
            ),
        }}
        ses = Mock()
        ses.send_email.side_effect = failure
        with patch.object(contact, "ses_client", return_value=ses), \
             self.assertLogs(level="ERROR") as captured:
            result = contact.handler(event(self.valid_payload()), Context())
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(body(result)["code"], "CONTACT_TEMPORARILY_UNAVAILABLE")
        evidence = result["body"] + " ".join(captured.output)
        self.assertNotIn("private provider detail", evidence)
        self.assertNotIn("person@example.com", evidence)
        self.assertNotIn("<script>", evidence)
        self.assertNotIn("hello@jobseekercopilot.com", evidence)
        self.assertIn(
            "AccessDeniedException (contact-sender-email-identity)", evidence
        )
        self.dedupe.delete_item.assert_called_once()
        release = self.dedupe.delete_item.call_args.kwargs
        self.assertEqual(release["Key"], {
            "fingerprint": self.dedupe.put_item.call_args.kwargs["Item"]["fingerprint"],
        })
        self.assertEqual(release["ExpressionAttributeValues"], {":owner": "test-request"})

    def test_retry_after_ses_failure_can_reserve_and_send_again(self):
        ses = Mock()
        ses.send_email.side_effect = [RuntimeError("temporary"), None]
        with patch.object(contact, "ses_client", return_value=ses):
            first = contact.handler(event(self.valid_payload()), Context())
            second = contact.handler(event(self.valid_payload()), Context())
        self.assertEqual(first["statusCode"], 503)
        self.assertEqual(second["statusCode"], 202)
        self.assertEqual(self.dedupe.put_item.call_count, 2)
        self.dedupe.delete_item.assert_called_once()
        self.assertEqual(ses.send_email.call_count, 2)

    def test_template_has_one_fail_closed_contact_route_and_exact_dedupe_permissions(self):
        template = TEMPLATE.read_text(encoding="utf-8")
        self.assertIn("EnableContactSubmissions:", template)
        self.assertIn("Default: 'false'", template)
        recipient_parameter = template.split("  ContactRecipientEmail:", 1)[1].split(
            "  ContactDedupeTableName:", 1
        )[0]
        self.assertIn("NoEcho: true", recipient_parameter)
        pepper_parameter = template.split("  ContactDedupePepper:", 1)[1].split(
            "  ContactDedupeTtlSeconds:", 1
        )[0]
        self.assertIn("NoEcho: true", pepper_parameter)
        self.assertEqual(template.count("Path: /contact"), 2)
        role = template.split("  ContactExecutionRole:", 1)[1].split("  WaitlistFunction:", 1)[0]
        self.assertIn("Action: ses:SendEmail", role)
        self.assertIn("identity/${SesDomainIdentity}", role)
        self.assertIn("identity/${ContactSenderEmail}", role)
        self.assertIn("ses:FromAddress: !Ref ContactSenderEmail", role)
        self.assertIn("ses:Recipients: !Ref ContactRecipientEmail", role)
        self.assertIn("Action: [dynamodb:PutItem, dynamodb:DeleteItem]", role)
        self.assertIn("Resource: !GetAtt ContactDedupeTable.Arn", role)
        self.assertNotIn("dynamodb:GetItem", role)
        self.assertNotIn("dynamodb:Scan", role)
        self.assertNotIn("Resource: '*'", role)
        table = template.split("  ContactDedupeTable:", 1)[1].split(
            "  WaitlistEmailConfigurationSet:", 1
        )[0]
        self.assertIn("AttributeName: fingerprint", table)
        self.assertIn("AttributeName: expiresAt", table)
        self.assertIn("BillingMode: PAY_PER_REQUEST", table)
        self.assertIn("SSEEnabled: true", table)
        function = template.split("  ContactFunction:", 1)[1].split(
            "  WaitlistPendingTtlConfiguration:", 1
        )[0]
        self.assertIn("Handler: contact.handler", function)
        self.assertIn("CONTACT_RECIPIENT_EMAIL: !Ref ContactRecipientEmail", function)
        self.assertIn("CONTACT_DEDUPE_PEPPER: !Ref ContactDedupePepper", function)
        self.assertIn("RouteSettings: {ThrottlingBurstLimit: 3, ThrottlingRateLimit: 1}", function)
        self.assertIn("ContactApiThrottleMetricFilter:", template)
        for alarm in (
            "ContactValidationVolumeAlarm", "ContactThrottleVolumeAlarm",
            "ContactDuplicateVolumeAlarm", "ContactSesFailureAlarm",
        ):
            self.assertIn(f"  {alarm}:\n", template)
        outputs = template.split("Outputs:", 1)[1]
        self.assertNotIn("ContactRecipientEmail", outputs)
        self.assertNotIn("ContactDedupePepper", outputs)


if __name__ == "__main__":
    unittest.main()
