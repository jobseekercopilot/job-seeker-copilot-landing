import time

from common.aws_clients import table
from common.config import enabled, integer, required
from common.email_provider import send_email
from common.email_templates import waitlist_confirmation
from common.http import ApiError, error_response, parse_json, response
from common.logging_utils import log_result, logger
from common.tokens import new_token, same_hash, token_hash
from common.validation import exact_fields, text

OPERATION = "waitlist-resend"


def handler(event, context):
    started = time.monotonic()
    record_id = ""
    try:
        if not enabled("ENABLE_LIVE_SUBMISSIONS") or not enabled("ENABLE_WAITLIST_EMAIL"):
            raise ApiError(503, "BACKEND_DISABLED", "Confirmation email is not currently available.", "configuration")
        data = parse_json(event)
        exact_fields(data, {"token"}, {"token"})
        old_token = text(data["token"], "token", 20, 256)
        old_hash = token_hash(old_token)
        waitlist = table(required("WAITLIST_TABLE_NAME"))
        items = waitlist.query(
            IndexName="ConfirmationTokenHashIndex",
            KeyConditionExpression="confirmationTokenHash = :token",
            ExpressionAttributeValues={":token": old_hash},
            Limit=1,
        ).get("Items", [])
        if not items:
            raise ApiError(400, "INVALID_TOKEN", "This confirmation link is invalid.", "validation")
        item = items[0]
        record_id = item["subscriberId"]
        if not same_hash(str(item.get("confirmationTokenHash", "")), old_hash):
            raise ApiError(400, "INVALID_TOKEN", "This confirmation link is invalid.", "validation")
        if item.get("status") == "confirmed":
            result = response(event, 200, True, "ALREADY_CONFIRMED", "This email is already confirmed.")
            log_result(context, OPERATION, 200, "success", started, record_id)
            return result
        if item.get("status") != "pending":
            raise ApiError(400, "INVALID_TOKEN", "This confirmation link is no longer active.", "validation")
        now = int(time.time())
        if now - int(item.get("lastConfirmationSentAtEpoch", 0)) < 60:
            raise ApiError(429, "CONFIRMATION_RATE_LIMITED", "Please wait before requesting another email.", "rate-limit")
        raw_token = new_token()
        hashed = token_hash(raw_token)
        expiry = now + integer("CONFIRMATION_TOKEN_TTL_HOURS", 24) * 3600
        waitlist.update_item(
            Key={"subscriberId": record_id},
            UpdateExpression="SET confirmationTokenHash=:newToken, confirmationTokenExpiresAt=:expiry, lastConfirmationSentAtEpoch=:now",
            ConditionExpression="#status=:pending AND confirmationTokenHash=:oldToken",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":newToken": hashed,
                ":oldToken": old_hash,
                ":expiry": expiry,
                ":now": now,
                ":pending": "pending",
            },
        )
        subject, text_body, html_body = waitlist_confirmation(
            required("PUBLIC_SITE_URL"), raw_token, required("PUBLIC_SUPPORT_EMAIL")
        )
        try:
            send_email(
                required("WAITLIST_SENDER_EMAIL"), item["email"], subject, text_body, html_body, required("REPLY_TO_EMAIL")
            )
        except Exception:
            try:
                waitlist.update_item(
                    Key={"subscriberId": record_id},
                    UpdateExpression="SET confirmationTokenHash=:oldToken, confirmationTokenExpiresAt=:oldExpiry, lastConfirmationSentAtEpoch=:oldSent",
                    ConditionExpression="confirmationTokenHash=:newToken",
                    ExpressionAttributeValues={
                        ":oldToken": old_hash,
                        ":oldExpiry": int(item.get("confirmationTokenExpiresAt", 0)),
                        ":oldSent": int(item.get("lastConfirmationSentAtEpoch", 0)),
                        ":newToken": hashed,
                    },
                )
            except Exception:
                logger.error("Confirmation token rollback failed")
            raise
        result = response(event, 200, True, "CONFIRMATION_RESENT", "Check your inbox for a new confirmation link.")
        log_result(context, OPERATION, 200, "success", started, record_id)
        return result
    except ApiError as exc:
        log_result(context, OPERATION, exc.status, exc.category, started, record_id)
        return error_response(event, exc)
    except Exception:
        logger.error("Waitlist confirmation resend failed")
        log_result(context, OPERATION, 503, "provider", started, record_id)
        return response(event, 503, False, "SERVICE_UNAVAILABLE", "We could not send a new confirmation email. Please try again later.")
