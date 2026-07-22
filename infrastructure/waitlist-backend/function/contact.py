import logging
import math
import os
import re
from html import escape
from typing import Any

from common import (
    RequestError,
    aws_error_code,
    enforce_origin,
    is_options,
    log_result,
    normalise_email,
    parse_json,
    preflight,
    response,
    ses_client,
    utc_iso,
)

LOGGER = logging.getLogger()
OPERATION = "contact-submit"
EXPECTED_FIELDS = {"name", "email", "subject", "message", "source", "website", "formStartedAt"}
CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")
MESSAGE_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def handler(event, context):
    if is_options(event):
        return preflight(event)
    try:
        enforce_origin(event)
        if os.getenv("ENABLE_CONTACT_SUBMISSIONS", "false").strip().lower() != "true":
            raise RequestError(503, "CONTACT_UNAVAILABLE", "Online contact is temporarily unavailable.")
        payload = parse_json(event)
        if set(payload) != EXPECTED_FIELDS:
            raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")

        name = _single_line(payload.get("name"), 1, 120)
        email = normalise_email(payload.get("email"))
        subject = _single_line(payload.get("subject"), 1, 160)
        message = _message(payload.get("message"), 10, _message_maximum())
        if not email:
            raise RequestError(400, "INVALID_EMAIL", "Enter a valid email address.")
        if payload.get("source") != "landing-page" or payload.get("website") != "":
            raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")
        started = payload.get("formStartedAt")
        if (not isinstance(started, (int, float)) or isinstance(started, bool)
                or not math.isfinite(started) or started <= 0):
            raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")

        _send_contact_email(name, email, subject, message, context)
        log_result(context, OPERATION, 202, "accepted")
        return response(
            event, 202, "CONTACT_ACCEPTED", "Your message has been sent.", success=True
        )
    except RequestError as exc:
        log_result(context, OPERATION, exc.status_code, exc.code)
        return response(event, exc.status_code, exc.code, exc.message)
    except Exception as exc:
        LOGGER.error("Contact delivery failed: %s", aws_error_code(exc) or "unknown")
        log_result(context, OPERATION, 503, "delivery-failed")
        return response(
            event,
            503,
            "CONTACT_TEMPORARILY_UNAVAILABLE",
            "Your message could not be sent. Please try again later.",
        )


def _single_line(value: Any, minimum: int, maximum: int) -> str:
    if not isinstance(value, str) or CONTROL_CHARACTERS.search(value):
        raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")
    cleaned = " ".join(value.strip().split())
    if len(cleaned) < minimum or len(cleaned) > maximum:
        raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")
    return cleaned


def _message(value: Any, minimum: int, maximum: int) -> str:
    if not isinstance(value, str) or MESSAGE_CONTROL_CHARACTERS.search(value):
        raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")
    cleaned = value.replace("\r\n", "\n").replace("\r", "\n").strip()
    if len(cleaned) < minimum or len(cleaned) > maximum:
        raise RequestError(400, "INVALID_REQUEST", "The contact request is invalid.")
    return cleaned


def _message_maximum() -> int:
    try:
        value = int(os.getenv("CONTACT_MESSAGE_MAX_LENGTH", "3000"))
    except ValueError as exc:
        raise RuntimeError("Invalid contact message limit configuration") from exc
    if value < 10 or value > 3000:
        raise RuntimeError("Invalid contact message limit configuration")
    return value


def _trusted_address(name: str) -> str:
    value = normalise_email(os.getenv(name, ""))
    if not value:
        raise RuntimeError("Invalid contact email configuration")
    return value


def _send_contact_email(name: str, email: str, subject: str, message: str, context: Any) -> None:
    sender = _trusted_address("CONTACT_SENDER_EMAIL")
    recipient = _trusted_address("CONTACT_RECIPIENT_EMAIL")
    configuration_set = os.getenv("SES_CONFIGURATION_SET", "").strip()
    if not configuration_set:
        raise RuntimeError("Invalid contact email configuration")

    submitted_at = utc_iso()
    request_id = str(getattr(context, "aws_request_id", "unknown"))
    email_subject = f"Job Seeker Copilot enquiry: {subject}"
    text_body = (
        "New Job Seeker Copilot contact enquiry\n\n"
        f"Name: {name}\n"
        f"Reply email: {email}\n"
        f"Subject: {subject}\n"
        f"Submitted: {submitted_at}\n"
        f"Request ID: {request_id}\n\n"
        f"Message:\n{message}"
    )
    html_body = (
        '<div style="font-family:Arial,sans-serif;max-width:720px;color:#172033">'
        '<h1 style="font-size:24px">New Job Seeker Copilot contact enquiry</h1>'
        '<dl>'
        f'<dt style="font-weight:700">Name</dt><dd>{escape(name)}</dd>'
        f'<dt style="font-weight:700">Reply email</dt><dd>{escape(email)}</dd>'
        f'<dt style="font-weight:700">Subject</dt><dd>{escape(subject)}</dd>'
        f'<dt style="font-weight:700">Submitted</dt><dd>{escape(submitted_at)}</dd>'
        f'<dt style="font-weight:700">Request ID</dt><dd>{escape(request_id)}</dd>'
        '</dl><h2 style="font-size:18px">Message</h2>'
        f'<div style="white-space:pre-wrap">{escape(message)}</div></div>'
    )
    ses_client().send_email(
        FromEmailAddress=sender,
        Destination={"ToAddresses": [recipient]},
        ReplyToAddresses=[email],
        Content={"Simple": {
            "Subject": {"Data": email_subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text_body, "Charset": "UTF-8"},
                "Html": {"Data": html_body, "Charset": "UTF-8"},
            },
        }},
        ConfigurationSetName=configuration_set,
        EmailTags=[{"Name": "message-purpose", "Value": "contact-enquiry"}],
    )
