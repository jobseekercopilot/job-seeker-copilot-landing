import logging

from common import (
    RequestError,
    aws_error_code,
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
from workflow import create_pending, mark_confirmation_failure, mark_confirmation_sent, rotate_pending_token

LOGGER = logging.getLogger()
OPERATION = "waitlist-subscribe"


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

        current = subscriber_table().get_item(Key={"email": email}, ConsistentRead=True).get("Item")
        if current:
            return _existing(event, context, current)
        try:
            raw_token, hashed = create_pending(email)
        except Exception as exc:
            if aws_error_code(exc) in {"TransactionCanceledException", "ConditionalCheckFailedException"}:
                current = subscriber_table().get_item(Key={"email": email}, ConsistentRead=True).get("Item")
                if current:
                    return _existing(event, context, current)
            raise
        return _send(event, context, email, raw_token, hashed, 201)
    except RequestError as exc:
        log_result(context, OPERATION, exc.status_code, exc.code)
        return response(event, exc.status_code, exc.code, exc.message)
    except Exception:
        LOGGER.exception("Waitlist subscription failed")
        log_result(context, OPERATION, 503, "service-unavailable")
        return response(event, 503, "SERVICE_UNAVAILABLE", "We could not process the request. Please try again later.")


def _existing(event, context, record):
    status = str(record.get("status", "")).upper()
    if status == "CONFIRMED":
        log_result(context, OPERATION, 200, "already-confirmed")
        return response(event, 200, "WAITLIST_ALREADY_CONFIRMED", "This address does not need another confirmation email.", success=True)
    if status == "PENDING":
        from common import now_epoch
        if int(record.get("confirmationExpiresAt", 0)) > now_epoch() and record.get("currentConfirmationTokenHash"):
            log_result(context, OPERATION, 200, "confirmation-required")
            return response(event, 200, "WAITLIST_CONFIRMATION_REQUIRED", "Check your inbox or request a new confirmation email.", success=True)
        raw_token, hashed, result = rotate_pending_token(record)
        if result != "issued":
            log_result(context, OPERATION, 200, f"confirmation-{result}")
            return response(event, 200, "WAITLIST_CONFIRMATION_REQUIRED", "Check your inbox or request a new confirmation email.", success=True)
        return _send(event, context, str(record["email"]), raw_token, hashed, 200)
    if status == "UNSUBSCRIBED":
        return response(event, 200, "WAITLIST_RESUBSCRIPTION_REQUIRED", "A fresh confirmation flow is required before this address can rejoin.", success=True)
    return response(event, 200, "WAITLIST_REQUEST_NOT_ACCEPTED", "This request cannot be completed automatically.", success=True)


def _send(event, context, email, raw_token, hashed, status_code):
    try:
        send_confirmation_email(email, raw_token)
        mark_confirmation_sent(email, hashed)
    except Exception as exc:
        LOGGER.error("Confirmation delivery failed: %s", aws_error_code(exc) or "unknown")
        metric("ConfirmationSendFailures")
        try:
            mark_confirmation_failure(email, hashed)
        except Exception:
            LOGGER.error("Could not record confirmation delivery failure")
        log_result(context, OPERATION, 503, "email-delivery-failed")
        return response(
            event, 503, "CONFIRMATION_EMAIL_TEMPORARILY_UNAVAILABLE",
            "Your request is pending, but we could not send the confirmation email. Please try again later.",
        )
    log_result(context, OPERATION, status_code, "pending-confirmation")
    return response(
        event, status_code, "WAITLIST_PENDING_CONFIRMATION",
        "Check your inbox to confirm your email address.", success=True,
    )
