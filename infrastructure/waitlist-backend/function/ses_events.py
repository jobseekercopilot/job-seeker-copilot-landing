import logging

from common import aws_error_code, log_result, metric, normalise_email, subscriber_table, utc_iso

LOGGER = logging.getLogger()
WAITLIST_MESSAGE_PURPOSE = "waitlist-confirmation"

STATUS_EVENTS = {
    "Email Bounced": ("BOUNCED", "SesBounces"),
    "Email Complaint Received": ("COMPLAINED", "SesComplaints"),
}


def handler(event, context):
    detail_type = str(event.get("detail-type", ""))
    detail = event.get("detail") or {}
    mail = detail.get("mail") or {}
    if _message_purpose(mail) != WAITLIST_MESSAGE_PURPOSE:
        log_result(context, "ses-event", 200, "ignored-non-waitlist-purpose")
        return {"processed": 0}
    recipients = mail.get("destination") or []
    processed = 0
    for value in recipients[:10]:
        email = normalise_email(value)
        if not email:
            continue
        try:
            if detail_type in STATUS_EVENTS:
                status, metric_name = STATUS_EVENTS[detail_type]
                _suppress(email, status)
                metric(metric_name)
            elif detail_type == "Email Delivered":
                _record(email, "lastEmailDeliveredAt")
            elif detail_type in {"Email Rendering Failed", "Email Delivery Delayed", "Email Rejected"}:
                _record(email, "lastEmailDeliveryIssueAt")
            processed += 1
        except Exception as exc:
            if aws_error_code(exc) == "ConditionalCheckFailedException":
                continue
            LOGGER.exception("SES event update failed")
            raise
    log_result(context, "ses-event", 200, f"processed-{processed}")
    return {"processed": processed}


def _message_purpose(mail):
    tags = mail.get("tags") or {}
    if not isinstance(tags, dict):
        return ""
    values = tags.get("message-purpose") or []
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list) or len(values) != 1:
        return ""
    return values[0] if isinstance(values[0], str) else ""


def _suppress(email, status):
    subscriber_table().update_item(
        Key={"email": email},
        UpdateExpression=(
            "SET #status=:status, updatedAt=:now, suppressionReason=:status, suppressionRecordedAt=:now "
            "REMOVE currentConfirmationTokenHash, confirmationExpiresAt, pendingExpiresAt"
        ),
        ConditionExpression="attribute_exists(email) AND #status<>:unsubscribed",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={":status": status, ":now": utc_iso(), ":unsubscribed": "UNSUBSCRIBED"},
    )


def _record(email, field):
    subscriber_table().update_item(
        Key={"email": email},
        UpdateExpression=f"SET {field}=:now, updatedAt=:now",
        ConditionExpression="attribute_exists(email)",
        ExpressionAttributeValues={":now": utc_iso()},
    )
