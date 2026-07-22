import time
from datetime import datetime, timezone

from common.aws_clients import table
from common.config import enabled, required
from common.email_provider import send_email
from common.email_templates import waitlist_confirmed
from common.http import ApiError, error_response, query_token, response
from common.logging_utils import log_result, logger
from common.tokens import same_hash, token_hash, unsubscribe_token

OPERATION = "waitlist-confirm"


def handler(event, context):
    started = time.monotonic()
    record_id = ""
    try:
        if not enabled("ENABLE_LIVE_SUBMISSIONS"):
            raise ApiError(503, "BACKEND_DISABLED", "Email confirmation is not currently available.", "configuration")
        raw_token = query_token(event)
        waitlist = table(required("WAITLIST_TABLE_NAME"))
        hashed = token_hash(raw_token)
        items = waitlist.query(
            IndexName="ConfirmationTokenHashIndex",
            KeyConditionExpression="confirmationTokenHash = :token",
            ExpressionAttributeValues={":token": hashed},
            Limit=1,
        ).get("Items", [])
        if not items:
            raise ApiError(400, "INVALID_TOKEN", "This confirmation link is invalid.", "validation")
        item = items[0]
        record_id = item["subscriberId"]
        if not same_hash(str(item.get("confirmationTokenHash", "")), hashed):
            raise ApiError(400, "INVALID_TOKEN", "This confirmation link is invalid.", "validation")
        if item.get("status") == "confirmed":
            return response(event, 200, True, "ALREADY_CONFIRMED", "This email is already confirmed.")
        if item.get("status") != "pending":
            raise ApiError(400, "INVALID_TOKEN", "This confirmation link is no longer active.", "validation")
        if int(item.get("confirmationTokenExpiresAt", 0)) < int(time.time()):
            raise ApiError(410, "TOKEN_EXPIRED", "This confirmation link has expired.", "validation")
        waitlist.update_item(
            Key={"subscriberId": record_id},
            UpdateExpression="SET #status=:confirmed, confirmedAt=:confirmedAt REMOVE expiresAtEpoch",
            ConditionExpression="#status=:pending AND confirmationTokenHash=:token",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":confirmed": "confirmed",
                ":pending": "pending",
                ":token": hashed,
                ":confirmedAt": datetime.now(timezone.utc).isoformat(),
            },
        )
        if enabled("ENABLE_WAITLIST_EMAIL"):
            try:
                subject, text_body, html_body = waitlist_confirmed(
                    required("PUBLIC_SITE_URL"),
                    unsubscribe_token(
                        record_id,
                        required("SUBSCRIBER_HASH_PEPPER"),
                        str(item["unsubscribeTokenNonce"]),
                    ),
                    required("PUBLIC_SUPPORT_EMAIL"),
                )
                send_email(
                    required("WAITLIST_SENDER_EMAIL"),
                    item["email"],
                    subject,
                    text_body,
                    html_body,
                    required("REPLY_TO_EMAIL"),
                    message_purpose="waitlist-confirmed",
                )
            except Exception:
                logger.error("Confirmation acknowledgement email failed")
        result = response(event, 200, True, "WAITLIST_CONFIRMED", "Your email has been confirmed.")
        log_result(context, OPERATION, 200, "success", started, record_id)
        return result
    except ApiError as exc:
        log_result(context, OPERATION, exc.status, exc.category, started, record_id)
        return error_response(event, exc)
    except Exception:
        logger.error("Waitlist confirmation failed")
        log_result(context, OPERATION, 503, "provider", started, record_id)
        return response(event, 503, False, "SERVICE_UNAVAILABLE", "We could not confirm this email. Please try again later.")
