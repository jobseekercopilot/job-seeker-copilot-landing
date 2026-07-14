import os

from common import (
    av_number,
    av_string,
    dynamodb_client,
    env_int,
    new_token,
    now_epoch,
    subscriber_table,
    token_hash,
    utc_iso,
)


def create_pending(email: str) -> tuple[str, str]:
    now = now_epoch()
    raw_token = new_token()
    hashed = token_hash(raw_token)
    token_expiry = now + env_int("CONFIRMATION_TOKEN_TTL_SECONDS", 172_800)
    pending_expiry = now + env_int("PENDING_RETENTION_SECONDS", 2_592_000)
    created = utc_iso(now)
    subscriber = {
        "email": av_string(email),
        "status": av_string("PENDING"),
        "source": av_string("landing-page"),
        "consentVersion": av_string(os.getenv("CONSENT_VERSION", "1.0")),
        "createdAt": av_string(created),
        "updatedAt": av_string(created),
        "currentConfirmationTokenHash": av_string(hashed),
        "confirmationExpiresAt": av_number(token_expiry),
        "lastConfirmationAttemptAtEpoch": av_number(now),
        "confirmationSendWindowStartedAtEpoch": av_number(now),
        "confirmationSendCount": av_number(1),
        "pendingExpiresAt": av_number(pending_expiry),
    }
    token = _token_item(hashed, email, token_expiry, created)
    dynamodb_client().transact_write_items(TransactItems=[
        {"Put": {
            "TableName": os.environ["WAITLIST_TABLE_NAME"],
            "Item": subscriber,
            "ConditionExpression": "attribute_not_exists(email)",
        }},
        {"Put": {
            "TableName": os.environ["TOKEN_TABLE_NAME"],
            "Item": token,
            "ConditionExpression": "attribute_not_exists(tokenHash)",
        }},
    ])
    return raw_token, hashed


def rotate_pending_token(record: dict) -> tuple[str, str, str]:
    now = now_epoch()
    last_attempt = int(record.get("lastConfirmationAttemptAtEpoch", 0))
    cooldown = env_int("CONFIRMATION_RESEND_COOLDOWN_SECONDS", 900)
    if last_attempt and now - last_attempt < cooldown:
        return "", "", "cooldown"

    window_seconds = env_int("CONFIRMATION_SEND_WINDOW_SECONDS", 86_400)
    window_start = int(record.get("confirmationSendWindowStartedAtEpoch", now))
    old_count = int(record.get("confirmationSendCount", 0))
    if now - window_start >= window_seconds:
        new_count = 1
        new_window_start = now
    else:
        if old_count >= env_int("MAX_CONFIRMATION_SENDS", 5):
            return "", "", "limit"
        new_count = old_count + 1
        new_window_start = window_start

    raw_token = new_token()
    hashed = token_hash(raw_token)
    old_hash = str(record.get("currentConfirmationTokenHash", ""))
    token_expiry = now + env_int("CONFIRMATION_TOKEN_TTL_SECONDS", 172_800)
    updated = utc_iso(now)
    condition = "#status = :pending"
    values = {
        ":pending": av_string("PENDING"),
        ":newHash": av_string(hashed),
        ":expires": av_number(token_expiry),
        ":updated": av_string(updated),
        ":now": av_number(now),
        ":count": av_number(new_count),
        ":window": av_number(new_window_start),
    }
    if "lastConfirmationAttemptAtEpoch" in record:
        condition += " AND lastConfirmationAttemptAtEpoch = :oldAttempt"
        values[":oldAttempt"] = av_number(last_attempt)
    else:
        condition += " AND attribute_not_exists(lastConfirmationAttemptAtEpoch)"
    if "confirmationSendCount" in record:
        condition += " AND confirmationSendCount = :oldCount"
        values[":oldCount"] = av_number(old_count)
    else:
        condition += " AND attribute_not_exists(confirmationSendCount)"
    if old_hash:
        condition += " AND currentConfirmationTokenHash = :oldHash"
        values[":oldHash"] = av_string(old_hash)
    else:
        condition += " AND attribute_not_exists(currentConfirmationTokenHash)"

    actions = [{"Update": {
        "TableName": os.environ["WAITLIST_TABLE_NAME"],
        "Key": {"email": av_string(str(record["email"]))},
        "UpdateExpression": (
            "SET currentConfirmationTokenHash=:newHash, confirmationExpiresAt=:expires, updatedAt=:updated, "
            "lastConfirmationAttemptAtEpoch=:now, confirmationSendCount=:count, "
            "confirmationSendWindowStartedAtEpoch=:window REMOVE confirmationSentAt, lastConfirmationDeliveryErrorAt"
        ),
        "ConditionExpression": condition,
        "ExpressionAttributeNames": {"#status": "status"},
        "ExpressionAttributeValues": values,
    }}]
    if old_hash:
        actions.append({"Delete": {
            "TableName": os.environ["TOKEN_TABLE_NAME"],
            "Key": {"tokenHash": av_string(old_hash)},
        }})
    actions.append({"Put": {
        "TableName": os.environ["TOKEN_TABLE_NAME"],
        "Item": _token_item(hashed, str(record["email"]), token_expiry, updated),
        "ConditionExpression": "attribute_not_exists(tokenHash)",
    }})
    dynamodb_client().transact_write_items(TransactItems=actions)
    return raw_token, hashed, "issued"


def mark_confirmation_sent(email: str, hashed: str) -> None:
    now = now_epoch()
    subscriber_table().update_item(
        Key={"email": email},
        UpdateExpression="SET confirmationSentAt=:sent, updatedAt=:sent REMOVE lastConfirmationDeliveryErrorAt",
        ConditionExpression="#status=:pending AND currentConfirmationTokenHash=:hash",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={":sent": utc_iso(now), ":pending": "PENDING", ":hash": hashed},
    )


def mark_confirmation_failure(email: str, hashed: str) -> None:
    now = now_epoch()
    subscriber_table().update_item(
        Key={"email": email},
        UpdateExpression="SET lastConfirmationDeliveryErrorAt=:failed, updatedAt=:failed",
        ConditionExpression="#status=:pending AND currentConfirmationTokenHash=:hash",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={":failed": utc_iso(now), ":pending": "PENDING", ":hash": hashed},
    )


def _token_item(hashed: str, email: str, expires: int, created: str) -> dict:
    tombstone_seconds = env_int("USED_TOKEN_RETENTION_SECONDS", 604_800)
    return {
        "tokenHash": av_string(hashed),
        "email": av_string(email),
        "status": av_string("ACTIVE"),
        "expiresAt": av_number(expires),
        "deleteAfter": av_number(expires + tombstone_seconds),
        "createdAt": av_string(created),
    }
