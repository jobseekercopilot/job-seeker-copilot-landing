import time
from datetime import datetime, timezone

from common.aws_clients import table
from common.config import enabled, integer, required
from common.email_provider import send_email
from common.email_templates import waitlist_confirmation
from common.http import ApiError, error_response, parse_json, response
from common.logging_utils import log_result, logger
from common.tokens import new_token, subscriber_id, token_hash, unsubscribe_token
from common.validation import anti_automation, email, exact_fields, text

OPERATION = "waitlist-submit"


def handler(event, context):
    started = time.monotonic()
    record_id = ""
    try:
        if not enabled("ENABLE_LIVE_SUBMISSIONS"):
            raise ApiError(503, "BACKEND_DISABLED", "Waiting-list signup is not currently available.", "configuration")
        if not enabled("ENABLE_WAITLIST_EMAIL"):
            raise ApiError(503, "EMAIL_NOT_CONFIGURED", "Waiting-list signup is not currently available.", "configuration")
        sender = required("WAITLIST_SENDER_EMAIL")
        site_url = required("PUBLIC_SITE_URL")
        support_email = required("PUBLIC_SUPPORT_EMAIL")
        reply_to = required("REPLY_TO_EMAIL")
        waitlist = table(required("WAITLIST_TABLE_NAME"))
        data = parse_json(event)
        allowed = {"email", "source", "consentVersion", "website", "formStartedAt"}
        exact_fields(data, allowed, {"email", "source", "consentVersion", "formStartedAt"})
        anti_automation(data, integer("MINIMUM_FORM_COMPLETION_MS", 1200))
        address = email(data["email"])
        source = text(data["source"], "source", 1, 80)
        consent = text(data["consentVersion"], "consentVersion", 1, 80)
        if source != "landing-page" or consent != required("CONSENT_VERSION"):
            raise ApiError(400, "INVALID_FIELDS", "The request contains invalid metadata.", "validation")
        record_id = subscriber_id(address, required("SUBSCRIBER_HASH_PEPPER"))
        now = int(time.time())
        current = waitlist.get_item(Key={"subscriberId": record_id}, ConsistentRead=True).get("Item")

        if current and current.get("status") == "confirmed":
            result = response(event, 200, True, "ALREADY_SUBSCRIBED", "This address is already subscribed.")
        elif current and current.get("status") == "pending":
            if now - int(current.get("lastConfirmationSentAtEpoch", 0)) < 60:
                raise ApiError(429, "CONFIRMATION_RATE_LIMITED", "Please wait before requesting another email.", "rate-limit")
            raw_token = new_token()
            confirmation_hash = token_hash(raw_token)
            expiry = now + integer("CONFIRMATION_TOKEN_TTL_HOURS", 24) * 3600
            waitlist.update_item(
                Key={"subscriberId": record_id},
                UpdateExpression="SET confirmationTokenHash=:token, confirmationTokenExpiresAt=:expiry, lastConfirmationSentAtEpoch=:now",
                ConditionExpression="#status=:pending",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={":token": confirmation_hash, ":expiry": expiry, ":now": now, ":pending": "pending"},
            )
            try:
                _send_confirmation(sender, address, site_url, raw_token, support_email, reply_to)
            except Exception:
                try:
                    waitlist.update_item(
                        Key={"subscriberId": record_id},
                        UpdateExpression="SET confirmationTokenHash=:oldToken, confirmationTokenExpiresAt=:oldExpiry, lastConfirmationSentAtEpoch=:oldSent",
                        ConditionExpression="confirmationTokenHash=:newToken",
                        ExpressionAttributeValues={
                            ":oldToken": current["confirmationTokenHash"],
                            ":oldExpiry": int(current.get("confirmationTokenExpiresAt", 0)),
                            ":oldSent": int(current.get("lastConfirmationSentAtEpoch", 0)),
                            ":newToken": confirmation_hash,
                        },
                    )
                except Exception:
                    logger.error("Confirmation token rollback failed")
                raise
            result = response(event, 200, True, "CONFIRMATION_RESENT", "Check your inbox for a new confirmation link.")
        else:
            raw_token = new_token()
            confirmation_hash = token_hash(raw_token)
            unsubscribe_nonce = new_token()
            unsubscribe_hash = token_hash(unsubscribe_token(
                record_id, required("SUBSCRIBER_HASH_PEPPER"), unsubscribe_nonce
            ))
            item = {
                "subscriberId": record_id,
                "email": address,
                "status": "pending",
                "source": source,
                "consentVersion": consent,
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "createdAtEpoch": now,
                "lastConfirmationSentAtEpoch": now,
                "confirmationTokenHash": confirmation_hash,
                "confirmationTokenExpiresAt": now + integer("CONFIRMATION_TOKEN_TTL_HOURS", 24) * 3600,
                "unsubscribeTokenHash": unsubscribe_hash,
                "unsubscribeTokenNonce": unsubscribe_nonce,
                "unsubscribeTokenExpiresAt": now + 10 * 365 * 86400,
                "expiresAtEpoch": now + integer("UNCONFIRMED_RETENTION_DAYS", 7) * 86400,
            }
            waitlist.put_item(Item=item)
            try:
                _send_confirmation(sender, address, site_url, raw_token, support_email, reply_to)
            except Exception:
                waitlist.delete_item(
                    Key={"subscriberId": record_id},
                    ConditionExpression="#status=:pending AND confirmationTokenHash=:token",
                    ExpressionAttributeNames={"#status": "status"},
                    ExpressionAttributeValues={":pending": "pending", ":token": confirmation_hash},
                )
                raise
            result = response(event, 202, True, "WAITLIST_PENDING_CONFIRMATION", "Check your inbox to confirm your email.")
        log_result(context, OPERATION, result["statusCode"], "success", started, record_id)
        return result
    except ApiError as exc:
        log_result(context, OPERATION, exc.status, exc.category, started, record_id)
        return error_response(event, exc)
    except Exception:
        logger.error("Waitlist submission failed")
        log_result(context, OPERATION, 503, "provider", started, record_id)
        return response(event, 503, False, "SERVICE_UNAVAILABLE", "We could not process the request. Please try again later.")


def _send_confirmation(sender, recipient, site_url, token, support_email, reply_to):
    subject, text_body, html_body = waitlist_confirmation(site_url, token, support_email)
    send_email(
        sender,
        recipient,
        subject,
        text_body,
        html_body,
        reply_to,
        message_purpose="waitlist-confirmation",
    )
