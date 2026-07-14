import json
import logging
import os
import urllib.request

LOGGER = logging.getLogger()


def handler(event, context):
    status = "SUCCESS"
    reason = "Pending-record TTL is configured."
    try:
        if event.get("RequestType") in {"Create", "Update"}:
            _ensure_ttl()
        elif event.get("RequestType") == "Delete":
            reason = "Delete is intentionally a no-op; the external waitlist table is protected."
    except Exception as exc:
        LOGGER.exception("TTL configuration failed")
        status = "FAILED"
        reason = str(exc)[:500]
    _send_response(event, context, status, reason)


def _ensure_ttl():
    import boto3
    client = boto3.client("dynamodb")
    table_name = os.environ["WAITLIST_TABLE_NAME"]
    description = client.describe_time_to_live(TableName=table_name).get("TimeToLiveDescription", {})
    current_status = description.get("TimeToLiveStatus", "DISABLED")
    current_attribute = description.get("AttributeName")
    if current_status in {"ENABLED", "ENABLING"}:
        if current_attribute != "pendingExpiresAt":
            raise RuntimeError("Existing table TTL uses a different attribute; refusing to change it.")
        return
    client.update_time_to_live(
        TableName=table_name,
        TimeToLiveSpecification={"Enabled": True, "AttributeName": "pendingExpiresAt"},
    )


def _send_response(event, context, status, reason):
    body = json.dumps({
        "Status": status,
        "Reason": reason,
        "PhysicalResourceId": f"{os.environ.get('WAITLIST_TABLE_NAME', 'waitlist')}-pending-ttl",
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "NoEcho": False,
        "Data": {"AttributeName": "pendingExpiresAt"},
    }).encode("utf-8")
    request = urllib.request.Request(
        event["ResponseURL"], data=body, method="PUT",
        headers={"content-type": "", "content-length": str(len(body))},
    )
    with urllib.request.urlopen(request, timeout=max(1, context.get_remaining_time_in_millis() // 1000 - 1)):
        pass
