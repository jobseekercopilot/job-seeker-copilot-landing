import json
import logging
import os
import urllib.request
from urllib.parse import urlsplit

LOGGER = logging.getLogger()


def handler(event, context):
    status = "SUCCESS"
    reason = "Waitlist table safeguards are configured."
    try:
        if event.get("RequestType") in {"Create", "Update"}:
            _ensure_safeguards()
        elif event.get("RequestType") == "Delete":
            reason = "Delete is intentionally a no-op; table safeguards remain enabled."
    except Exception:
        LOGGER.error("Waitlist table safeguard configuration failed")
        status = "FAILED"
        reason = "Could not configure waitlist table safeguards; inspect sanitized function logs."
    _send_response(event, context, status, reason)


def _dynamodb_client():
    import boto3
    return boto3.client("dynamodb")


def _ensure_safeguards():
    client = _dynamodb_client()
    table_name = os.environ["WAITLIST_TABLE_NAME"]
    _ensure_ttl(client, table_name)
    _ensure_point_in_time_recovery(client, table_name)
    _ensure_deletion_protection(client, table_name)


def _ensure_ttl(client, table_name):
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


def _ensure_point_in_time_recovery(client, table_name):
    description = client.describe_continuous_backups(TableName=table_name)
    pitr = description.get("ContinuousBackupsDescription", {}).get("PointInTimeRecoveryDescription", {})
    if pitr.get("PointInTimeRecoveryStatus") in {"ENABLED", "ENABLING"}:
        return
    client.update_continuous_backups(
        TableName=table_name,
        PointInTimeRecoverySpecification={"PointInTimeRecoveryEnabled": True},
    )


def _ensure_deletion_protection(client, table_name):
    table = client.describe_table(TableName=table_name).get("Table", {})
    if table.get("DeletionProtectionEnabled") is True:
        return
    client.update_table(TableName=table_name, DeletionProtectionEnabled=True)


def _send_response(event, context, status, reason):
    body = json.dumps({
        "Status": status,
        "Reason": reason,
        "PhysicalResourceId": f"{os.environ.get('WAITLIST_TABLE_NAME', 'waitlist')}-pending-ttl",
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "NoEcho": False,
        "Data": {
            "AttributeName": "pendingExpiresAt",
            "PointInTimeRecoveryEnabled": True,
            "DeletionProtectionEnabled": True,
        },
    }).encode("utf-8")
    response_url = _trusted_response_url(event.get("ResponseURL"))
    request = urllib.request.Request(
        response_url, data=body, method="PUT",
        headers={"content-type": "", "content-length": str(len(body))},
    )
    # The target is validated as an HTTPS AWS hostname immediately above.
    with urllib.request.urlopen(  # nosec B310
        request, timeout=max(1, context.get_remaining_time_in_millis() // 1000 - 1)
    ):
        pass


def _trusted_response_url(value):
    if not isinstance(value, str):
        raise RuntimeError("CloudFormation response URL is invalid.")
    parsed = urlsplit(value)
    hostname = (parsed.hostname or "").lower()
    trusted_hostname = hostname == "amazonaws.com" or hostname.endswith(".amazonaws.com")
    if (
        parsed.scheme != "https"
        or not trusted_hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.port not in {None, 443}
        or not parsed.path
    ):
        raise RuntimeError("CloudFormation response URL is invalid.")
    return value
