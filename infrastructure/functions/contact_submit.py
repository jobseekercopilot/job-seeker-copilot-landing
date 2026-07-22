import time
import uuid
from datetime import datetime, timezone

from common.aws_clients import table
from common.config import enabled, integer, required
from common.email_provider import send_email
from common.email_templates import contact_acknowledgement, contact_owner
from common.http import ApiError, error_response, parse_json, response
from common.logging_utils import log_result, logger
from common.validation import anti_automation, email, exact_fields, text

OPERATION = "contact-submit"


def handler(event, context):
    started = time.monotonic()
    submission_id = ""
    try:
        if not enabled("ENABLE_LIVE_SUBMISSIONS"):
            raise ApiError(503, "BACKEND_DISABLED", "Online contact is not currently available.", "configuration")
        data = parse_json(event)
        allowed = {"name", "email", "subject", "message", "source", "website", "formStartedAt"}
        exact_fields(data, allowed, {"name", "email", "subject", "message", "source", "formStartedAt"})
        anti_automation(data, integer("MINIMUM_FORM_COMPLETION_MS", 1200))
        name = text(data["name"], "name", 1, 120)
        address = email(data["email"])
        subject_value = text(data["subject"], "subject", 1, 160)
        message = text(data["message"], "message", 10, integer("CONTACT_MESSAGE_MAX_LENGTH", 3000))
        source = text(data["source"], "source", 1, 80)
        if source != "landing-page":
            raise ApiError(400, "INVALID_FIELDS", "The request contains invalid metadata.", "validation")
        sender = required("CONTACT_SENDER_EMAIL")
        created_at = datetime.now(timezone.utc).isoformat()
        request_id = getattr(context, "aws_request_id", "unavailable")
        owner_subject, owner_text, owner_html = contact_owner(
            name, address, subject_value, message, created_at, request_id, source
        )
        send_email(
            sender,
            required("CONTACT_RECIPIENT_EMAIL"),
            owner_subject,
            owner_text,
            owner_html,
            address,
            message_purpose="contact-enquiry",
        )
        submission_id = str(uuid.uuid4())
        if enabled("STORE_CONTACT_SUBMISSIONS"):
            try:
                now = int(time.time())
                table(required("CONTACT_TABLE_NAME")).put_item(Item={
                    "submissionId": submission_id,
                    "name": name,
                    "email": address,
                    "subject": subject_value,
                    "message": message,
                    "source": source,
                    "createdAt": created_at,
                    "requestId": request_id,
                    "deliveryStatus": "sent",
                    "expiresAtEpoch": now + integer("CONTACT_RETENTION_DAYS", 90) * 86400,
                })
            except Exception:
                logger.error("Optional contact retention failed")
        if enabled("SEND_CONTACT_ACKNOWLEDGEMENT"):
            try:
                ack_subject, ack_text, ack_html = contact_acknowledgement(
                    name, required("PUBLIC_SUPPORT_EMAIL"), required("PUBLIC_SITE_URL")
                )
                send_email(
                    sender,
                    address,
                    ack_subject,
                    ack_text,
                    ack_html,
                    required("REPLY_TO_EMAIL"),
                    message_purpose="contact-acknowledgement",
                )
            except Exception:
                logger.error("Optional contact acknowledgement failed")
        result = response(event, 202, True, "CONTACT_ACCEPTED", "Your message has been sent.")
        log_result(context, OPERATION, 202, "success", started, submission_id)
        return result
    except ApiError as exc:
        log_result(context, OPERATION, exc.status, exc.category, started, submission_id)
        return error_response(event, exc)
    except Exception:
        logger.error("Contact submission failed")
        log_result(context, OPERATION, 503, "provider", started, submission_id)
        return response(event, 503, False, "SERVICE_UNAVAILABLE", "Your message could not be sent. Please try again later.")
