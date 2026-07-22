import logging

from common import (
    RequestError,
    aws_error_code,
    aws_error_scope,
    enforce_origin,
    is_options,
    log_result,
    metric,
    normalise_email,
    parse_json,
    preflight,
    response,
    send_confirmation_email,
    subscriber_table,
)
from workflow import mark_confirmation_failure, mark_confirmation_sent, rotate_pending_token

LOGGER = logging.getLogger()
OPERATION = "waitlist-resend"
NEUTRAL_MESSAGE = "If that address has a pending subscription, a new confirmation email will be sent."


def handler(event, context):
    if is_options(event):
        return preflight(event)
    try:
        enforce_origin(event)
        payload = parse_json(event)
        if set(payload) != {"email"}:
            raise RequestError(400, "INVALID_REQUEST", "Send only an email address.")
        email = normalise_email(payload.get("email"))
        if not email:
            raise RequestError(400, "INVALID_EMAIL", "Enter a valid email address.")
        record = subscriber_table().get_item(Key={"email": email}, ConsistentRead=True).get("Item")
        if not record or str(record.get("status", "")).upper() != "PENDING":
            return _neutral(event, context, "not-eligible")
        try:
            raw_token, hashed, result = rotate_pending_token(record)
        except Exception as exc:
            if aws_error_code(exc) in {"TransactionCanceledException", "ConditionalCheckFailedException"}:
                return _neutral(event, context, "concurrent-update")
            raise
        if result != "issued":
            return _neutral(event, context, result)
        metric("ResendIssued")
        try:
            send_confirmation_email(email, raw_token)
        except Exception as exc:
            LOGGER.error(
                "Resend delivery failed: %s (%s)",
                aws_error_code(exc) or "unknown",
                aws_error_scope(exc),
            )
            metric("ConfirmationSendFailures")
            try:
                mark_confirmation_failure(email, hashed)
            except Exception:
                LOGGER.error("Could not record resend delivery failure")
        else:
            try:
                mark_confirmation_sent(email, hashed)
            except Exception as exc:
                LOGGER.error(
                    "Could not record resend delivery metadata: %s (%s)",
                    aws_error_code(exc) or "unknown",
                    aws_error_scope(exc),
                )
                metric("ConfirmationStateUpdateFailures")
        return _neutral(event, context, "accepted")
    except RequestError as exc:
        log_result(context, OPERATION, exc.status_code, exc.code)
        return response(event, exc.status_code, exc.code, exc.message)
    except Exception as exc:
        LOGGER.error("Waitlist resend failed: %s", aws_error_code(exc) or "unknown")
        return response(event, 503, "CONFIRMATION_TEMPORARILY_UNAVAILABLE", "We could not process the request. Please try again later.")


def _neutral(event, context, outcome):
    log_result(context, OPERATION, 202, outcome)
    return response(event, 202, "WAITLIST_RESEND_ACCEPTED", NEUTRAL_MESSAGE, success=True)
