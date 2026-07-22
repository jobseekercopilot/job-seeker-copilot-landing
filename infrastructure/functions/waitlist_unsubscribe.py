import time
from datetime import datetime, timezone

from common.aws_clients import table
from common.config import enabled, required
from common.http import ApiError, body_token, enforce_origin, error_response, response
from common.logging_utils import log_result, logger
from common.tokens import same_hash, token_hash

OPERATION = "waitlist-unsubscribe"


def handler(event, context):
    started = time.monotonic()
    record_id = ""
    try:
        enforce_origin(event)
        if not enabled("ENABLE_LIVE_SUBMISSIONS"):
            raise ApiError(503, "BACKEND_DISABLED", "Unsubscribe is not currently available.", "configuration")
        hashed = token_hash(body_token(event))
        waitlist = table(required("WAITLIST_TABLE_NAME"))
        items = waitlist.query(
            IndexName="UnsubscribeTokenHashIndex",
            KeyConditionExpression="unsubscribeTokenHash = :token",
            ExpressionAttributeValues={":token": hashed},
            Limit=1,
        ).get("Items", [])
        if not items:
            raise ApiError(400, "INVALID_TOKEN", "This unsubscribe link is invalid.", "validation")
        item = items[0]
        record_id = item["subscriberId"]
        if not same_hash(str(item.get("unsubscribeTokenHash", "")), hashed):
            raise ApiError(400, "INVALID_TOKEN", "This unsubscribe link is invalid.", "validation")
        if item.get("status") == "unsubscribed":
            result = response(event, 200, True, "ALREADY_UNSUBSCRIBED", "This address is already unsubscribed.")
            log_result(context, OPERATION, 200, "success", started, record_id)
            return result
        if int(item.get("unsubscribeTokenExpiresAt", 0)) < int(time.time()):
            raise ApiError(410, "TOKEN_EXPIRED", "This unsubscribe link has expired.", "validation")
        waitlist.update_item(
            Key={"subscriberId": record_id},
            UpdateExpression="SET #status=:unsubscribed, unsubscribedAt=:now REMOVE expiresAtEpoch",
            ConditionExpression="unsubscribeTokenHash=:token",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":unsubscribed": "unsubscribed",
                ":token": hashed,
                ":now": datetime.now(timezone.utc).isoformat(),
            },
        )
        result = response(event, 200, True, "WAITLIST_UNSUBSCRIBED", "You have been removed from the waiting list.")
        log_result(context, OPERATION, 200, "success", started, record_id)
        return result
    except ApiError as exc:
        log_result(context, OPERATION, exc.status, exc.category, started, record_id)
        return error_response(event, exc)
    except Exception:
        logger.error("Waitlist unsubscribe failed")
        log_result(context, OPERATION, 503, "provider", started, record_id)
        return response(event, 503, False, "SERVICE_UNAVAILABLE", "We could not update this subscription. Please try again later.")
