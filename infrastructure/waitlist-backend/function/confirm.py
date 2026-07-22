import logging
import os

from common import (
    RequestError,
    av_number,
    av_string,
    aws_error_code,
    dynamodb_client,
    enforce_origin,
    environment_dimensions,
    env_int,
    is_options,
    log_result,
    metric,
    now_epoch,
    parse_json,
    preflight,
    response,
    token_hash,
    token_table,
    utc_iso,
    validate_token,
)

LOGGER = logging.getLogger()
OPERATION = "waitlist-confirm"


def handler(event, context):
    if is_options(event):
        return preflight(event)
    try:
        enforce_origin(event)
        payload = parse_json(event)
        if set(payload) != {"token"}:
            raise RequestError(400, "CONFIRMATION_TOKEN_INVALID", "This confirmation link is invalid.")
        raw_token = validate_token(payload.get("token"))
        if not raw_token:
            metric("InvalidConfirmationTokens")
            raise RequestError(400, "CONFIRMATION_TOKEN_INVALID", "This confirmation link is invalid.")
        hashed = token_hash(raw_token)
        token_record = token_table().get_item(Key={"tokenHash": hashed}, ConsistentRead=True).get("Item")
        if not token_record:
            metric("InvalidConfirmationTokens")
            raise RequestError(400, "CONFIRMATION_TOKEN_INVALID", "This confirmation link is invalid.")
        if str(token_record.get("status", "")) == "USED":
            return response(event, 200, "WAITLIST_ALREADY_CONFIRMED", "This confirmation link has already been used.", success=True)
        now = now_epoch()
        if int(token_record.get("expiresAt", 0)) < now:
            raise RequestError(410, "CONFIRMATION_TOKEN_EXPIRED", "This confirmation link has expired.")
        email = str(token_record.get("email", ""))
        if not email:
            metric("InvalidConfirmationTokens")
            raise RequestError(400, "CONFIRMATION_TOKEN_INVALID", "This confirmation link is invalid.")

        updated = utc_iso(now)
        dynamodb_client().transact_write_items(TransactItems=[
            {"Update": {
                "TableName": os.environ["WAITLIST_TABLE_NAME"],
                "Key": {"email": av_string(email)},
                "UpdateExpression": (
                    "SET #status=:confirmed, confirmedAt=:updated, updatedAt=:updated "
                    "REMOVE currentConfirmationTokenHash, confirmationExpiresAt, pendingExpiresAt, "
                    "lastConfirmationDeliveryErrorAt, lastConfirmationAttemptAtEpoch, "
                    "confirmationSendWindowStartedAtEpoch, confirmationSendCount, confirmationSentAt"
                ),
                "ConditionExpression": "#status=:pending AND currentConfirmationTokenHash=:hash AND confirmationExpiresAt>=:now",
                "ExpressionAttributeNames": {"#status": "status"},
                "ExpressionAttributeValues": {
                    ":confirmed": av_string("CONFIRMED"), ":pending": av_string("PENDING"),
                    ":hash": av_string(hashed), ":now": av_number(now), ":updated": av_string(updated),
                },
            }},
            {"Update": {
                "TableName": os.environ["TOKEN_TABLE_NAME"],
                "Key": {"tokenHash": av_string(hashed)},
                "UpdateExpression": "SET #status=:used, usedAt=:updated, deleteAfter=:deleteAfter REMOVE email",
                "ConditionExpression": "#status=:active AND expiresAt>=:now",
                "ExpressionAttributeNames": {"#status": "status"},
                "ExpressionAttributeValues": {
                    ":used": av_string("USED"), ":active": av_string("ACTIVE"),
                    ":updated": av_string(updated), ":deleteAfter": av_number(now + env_int("USED_TOKEN_RETENTION_SECONDS", 604_800)),
                    ":now": av_number(now),
                },
            }},
        ])
        metric("WaitlistConfirmed", dimensions=environment_dimensions())
        log_result(context, OPERATION, 200, "confirmed")
        return response(event, 200, "WAITLIST_CONFIRMED", "Your email address has been confirmed.", success=True)
    except RequestError as exc:
        log_result(context, OPERATION, exc.status_code, exc.code)
        return response(event, exc.status_code, exc.code, exc.message)
    except Exception as exc:
        if aws_error_code(exc) in {"TransactionCanceledException", "ConditionalCheckFailedException"}:
            return _resolve_race(event, context, locals().get("hashed", ""))
        LOGGER.error("Waitlist confirmation failed: %s", aws_error_code(exc) or "unknown")
        log_result(context, OPERATION, 503, "service-unavailable")
        return response(event, 503, "CONFIRMATION_TEMPORARILY_UNAVAILABLE", "We could not confirm this email. Please try again later.")


def _resolve_race(event, context, hashed):
    try:
        record = token_table().get_item(Key={"tokenHash": hashed}, ConsistentRead=True).get("Item") if hashed else None
    except Exception as exc:
        LOGGER.error("Could not resolve confirmation race: %s", aws_error_code(exc) or "unknown")
        return response(
            event, 503, "CONFIRMATION_TEMPORARILY_UNAVAILABLE",
            "We could not confirm this email. Please try again later.",
        )
    if record and str(record.get("status", "")) == "USED":
        return response(event, 200, "WAITLIST_ALREADY_CONFIRMED", "This confirmation link has already been used.", success=True)
    if record and int(record.get("expiresAt", 0)) < now_epoch():
        return response(event, 410, "CONFIRMATION_TOKEN_EXPIRED", "This confirmation link has expired.")
    metric("InvalidConfirmationTokens")
    log_result(context, OPERATION, 400, "confirmation-token-invalid")
    return response(event, 400, "CONFIRMATION_TOKEN_INVALID", "This confirmation link is invalid.")
