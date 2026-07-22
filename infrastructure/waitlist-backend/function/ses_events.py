import json
import logging
import os

from common import aws_error_code, log_result, metric, normalise_email, subscriber_table, utc_iso

LOGGER = logging.getLogger()
WAITLIST_MESSAGE_PURPOSE = "waitlist-confirmation"

EVENT_SCHEMAS = {
    "Email Bounced": ("Bounce", "bounce"),
    "Email Complaint Received": ("Complaint", "complaint"),
    "Email Delivered": ("Delivery", "delivery"),
    "Email Delivery Delayed": ("DeliveryDelay", "deliveryDelay"),
    "Email Rejected": ("Reject", "reject"),
    "Email Rendering Failed": ("Rendering Failure", "failure"),
}
ISSUE_EVENTS = {"Email Rendering Failed", "Email Delivery Delayed", "Email Rejected"}
NON_PERMANENT_BOUNCES = {"Transient", "Undetermined"}


def handler(event, context):
    routed, outcome = _route_event(event)
    if not routed:
        if outcome == "ignored-malformed":
            metric("SesMalformedEvents")
        log_result(context, "ses-event", 200, outcome)
        return {"processed": 0}

    detail_type, detail, email = routed
    try:
        changed, event_outcome = _process_event(detail_type, detail, email)
    except Exception as exc:
        metric("SesEventUpdateFailures")
        LOGGER.error(json.dumps({
            "requestId": getattr(context, "aws_request_id", "unknown"),
            "operation": "ses-event",
            "outcome": "update-failed",
            "errorCode": aws_error_code(exc) or "unknown",
        }, separators=(",", ":")))
        raise

    log_result(
        context,
        "ses-event",
        200,
        event_outcome if changed else f"{event_outcome}-no-op",
    )
    return {"processed": 1 if changed else 0}


def _route_event(event):
    if not isinstance(event, dict) or event.get("source") != "aws.ses":
        return None, "ignored-malformed"

    detail_type = event.get("detail-type")
    schema = EVENT_SCHEMAS.get(detail_type)
    detail = event.get("detail")
    if not schema or not isinstance(detail, dict) or detail.get("eventType") != schema[0]:
        return None, "ignored-malformed"

    mail = detail.get("mail")
    payload = detail.get(schema[1])
    if not isinstance(mail, dict) or not isinstance(payload, dict):
        return None, "ignored-malformed"

    expected_configuration_set = os.getenv("SES_CONFIGURATION_SET", "").strip()
    if not expected_configuration_set or _single_tag(mail, "ses:configuration-set") != expected_configuration_set:
        return None, "ignored-untrusted-configuration-set"

    if _message_purpose(mail) != WAITLIST_MESSAGE_PURPOSE:
        return None, "ignored-non-waitlist-purpose"

    recipients = mail.get("destination")
    if not isinstance(recipients, list) or len(recipients) != 1:
        return None, "ignored-malformed"
    email = normalise_email(recipients[0])
    if not email:
        return None, "ignored-malformed"

    if detail_type == "Email Bounced":
        bounce_type = payload.get("bounceType")
        if bounce_type not in {"Permanent", *NON_PERMANENT_BOUNCES}:
            return None, "ignored-malformed"

    return (detail_type, detail, email), ""


def _process_event(detail_type, detail, email):
    if detail_type == "Email Bounced":
        bounce_type = detail["bounce"]["bounceType"]
        if bounce_type == "Permanent":
            metric("SesBounces")
            return _suppress(email, "BOUNCED"), "permanent-bounce-suppressed"
        metric("SesTransientBounces")
        return _record(email, "lastEmailDeliveryIssueAt"), "non-permanent-bounce-recorded"

    if detail_type == "Email Complaint Received":
        metric("SesComplaints")
        return _suppress(email, "COMPLAINED"), "complaint-suppressed"

    if detail_type == "Email Delivered":
        return _record(email, "lastEmailDeliveredAt"), "delivery-recorded"

    if detail_type in ISSUE_EVENTS:
        return _record(email, "lastEmailDeliveryIssueAt"), "delivery-issue-recorded"

    raise RuntimeError("Unreachable SES event route")


def _message_purpose(mail):
    return _single_tag(mail, "message-purpose")


def _single_tag(mail, name):
    tags = mail.get("tags")
    if not isinstance(tags, dict):
        return ""
    values = tags.get(name)
    if not isinstance(values, list) or len(values) != 1 or not isinstance(values[0], str):
        return ""
    return values[0]


def _suppress(email, status):
    excluded_states = ["UNSUBSCRIBED", "COMPLAINED"]
    if status == "BOUNCED":
        excluded_states.append("BOUNCED")
    conditions = " AND ".join(
        f"#status<>:excluded{index}" for index in range(len(excluded_states))
    )
    values = {
        ":status": status,
        ":now": utc_iso(),
        **{f":excluded{index}": value for index, value in enumerate(excluded_states)},
    }
    return _update_item(
        Key={"email": email},
        UpdateExpression=(
            "SET #status=:status, updatedAt=:now, suppressionReason=:status, suppressionRecordedAt=:now "
            "REMOVE currentConfirmationTokenHash, confirmationExpiresAt, pendingExpiresAt"
        ),
        ConditionExpression=f"attribute_exists(email) AND {conditions}",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues=values,
    )


def _record(email, field):
    return _update_item(
        Key={"email": email},
        UpdateExpression=f"SET {field}=:now, updatedAt=:now",
        ConditionExpression=(
            "attribute_exists(email) AND #status<>:unsubscribed "
            "AND #status<>:complained AND #status<>:bounced"
        ),
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
            ":now": utc_iso(),
            ":unsubscribed": "UNSUBSCRIBED",
            ":complained": "COMPLAINED",
            ":bounced": "BOUNCED",
        },
    )


def _update_item(**request):
    try:
        subscriber_table().update_item(**request)
        return True
    except Exception as exc:
        if aws_error_code(exc) == "ConditionalCheckFailedException":
            return False
        raise
