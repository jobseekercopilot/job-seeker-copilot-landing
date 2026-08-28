"""Anonymous, privacy-bounded public-tester feedback intake."""

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
import unicodedata
import uuid
from typing import Any

from common import (
    API_SECURITY_HEADERS,
    RequestError,
    aws_error_code,
    aws_error_scope,
    dynamodb_client,
    environment_dimensions,
    env_int,
    log_result,
    metric,
    parse_json,
    request_method,
    request_origin,
    utc_iso,
)

LOGGER = logging.getLogger()
OPERATION = "feedback-submit"
METRIC_NAMESPACE = "JobSeekerCopilot/Feedback"
EXPECTED_FIELDS = {
    "category",
    "title",
    "description",
    "reproductionSteps",
    "pagePath",
    "appBuild",
    "diagnosticsConsent",
    "diagnostics",
    "idempotencyKey",
    "website",
    "formStartedAt",
}
CATEGORIES = {"BROKEN", "CONFUSING", "SUGGESTION", "OTHER"}
BROWSER_FAMILIES = {"Chrome", "Edge", "Firefox", "Safari", "Other"}
DEVICE_CLASSES = {"mobile", "tablet", "desktop"}
CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")
MULTILINE_CONTROL_CHARACTERS = re.compile(r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]")
EMAIL_ADDRESS = re.compile(r"(?i)\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
BEARER_TOKEN = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{12,}")
JWT_TOKEN = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")
COOKIE_VALUE = re.compile(r"(?i)\b(?:cookie|set-cookie)\s*[:=]\s*\S+")
PAYMENT_NUMBER = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")
REFERENCE = re.compile(r"^FB-[A-F0-9]{16}$")
APP_BUILD = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


def handler(event, context):
    if request_method(event) == "OPTIONS":
        return _preflight(event)
    try:
        _enforce_origin(event)
        if request_method(event) != "POST":
            raise RequestError(405, "METHOD_NOT_ALLOWED", "This method is not allowed.")
        if os.getenv("ENABLE_FEEDBACK_SUBMISSIONS", "false").strip().lower() != "true":
            raise RequestError(
                503,
                "FEEDBACK_UNAVAILABLE",
                "Feedback is temporarily unavailable. Please try again later.",
            )

        payload = parse_json(event)
        if set(payload) != EXPECTED_FIELDS:
            raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")

        _validate_automation(payload)
        report = _validated_report(payload)
        reference, duplicate = _store(report)
        if duplicate:
            _feedback_metric("FeedbackDuplicateSuppressions")
        else:
            metric(
                "FeedbackAcceptedRequests",
                namespace=METRIC_NAMESPACE,
                dimensions=environment_dimensions(),
            )
        log_result(context, OPERATION, 202, "duplicate-suppressed" if duplicate else "accepted")
        return _response(
            event,
            202,
            "FEEDBACK_ACCEPTED",
            "Thank you — your feedback has been saved for review.",
            success=True,
            reference=reference,
        )
    except RequestError as exc:
        if exc.status_code in {400, 405, 413, 415}:
            _feedback_metric("FeedbackValidationRejections")
        log_result(context, OPERATION, exc.status_code, exc.code)
        return _response(event, exc.status_code, exc.code, exc.message)
    except Exception as exc:
        LOGGER.error(
            "Feedback processing failed: %s (%s)",
            aws_error_code(exc) or "unknown",
            aws_error_scope(exc),
        )
        _feedback_metric("FeedbackStorageFailures")
        log_result(context, OPERATION, 503, "storage-failed")
        return _response(
            event,
            503,
            "FEEDBACK_TEMPORARILY_UNAVAILABLE",
            "Your feedback could not be saved. Please try again later.",
        )


def _validated_report(payload: dict[str, Any]) -> dict[str, Any]:
    category = payload.get("category")
    if category not in CATEGORIES:
        raise RequestError(400, "INVALID_REQUEST", "Choose a valid feedback category.")

    title = _single_line(payload.get("title"), 5, 120)
    description = _multiline(payload.get("description"), 10, 2_000)
    reproduction_steps = _multiline(payload.get("reproductionSteps"), 0, 1_200)
    page_path = _page_path(payload.get("pagePath"))
    app_build = payload.get("appBuild")
    if not isinstance(app_build, str) or not APP_BUILD.fullmatch(app_build):
        raise RequestError(400, "INVALID_REQUEST", "The app build is invalid.")
    idempotency_key = _idempotency_key(payload.get("idempotencyKey"))
    diagnostics_consent = payload.get("diagnosticsConsent")
    if not isinstance(diagnostics_consent, bool):
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    diagnostics = _diagnostics(payload.get("diagnostics"), diagnostics_consent)

    _reject_sensitive_text(title, description, reproduction_steps, page_path)
    return {
        "category": category,
        "title": title,
        "description": description,
        "reproductionSteps": reproduction_steps,
        "pagePath": page_path,
        "appBuild": app_build,
        "diagnosticsConsent": diagnostics_consent,
        "diagnostics": diagnostics,
        "idempotencyKey": idempotency_key,
    }


def _single_line(value: Any, minimum: int, maximum: int) -> str:
    if (
        not isinstance(value, str)
        or CONTROL_CHARACTERS.search(value)
        or _has_unsafe_unicode(value)
    ):
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    cleaned = unicodedata.normalize("NFC", " ".join(value.strip().split()))
    if len(cleaned) < minimum or len(cleaned) > maximum:
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    return cleaned


def _multiline(value: Any, minimum: int, maximum: int) -> str:
    if (
        not isinstance(value, str)
        or MULTILINE_CONTROL_CHARACTERS.search(value)
        or _has_unsafe_unicode(value, allow_newline=True)
    ):
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    cleaned = unicodedata.normalize(
        "NFC", value.replace("\r\n", "\n").replace("\r", "\n").strip()
    )
    if len(cleaned) < minimum or len(cleaned) > maximum:
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    return cleaned


def _page_path(value: Any) -> str:
    if (
        not isinstance(value, str)
        or not value.startswith("/")
        or "//" in value
        or len(value) > 256
        or "?" in value
        or "#" in value
        or "\\" in value
        or CONTROL_CHARACTERS.search(value)
        or _has_unsafe_unicode(value)
    ):
        raise RequestError(400, "INVALID_REQUEST", "The feedback page is invalid.")
    return unicodedata.normalize("NFC", value)


def _has_unsafe_unicode(value: str, *, allow_newline: bool = False) -> bool:
    return any(
        (character != "\n" or not allow_newline)
        and unicodedata.category(character) in {"Cc", "Cf", "Cs", "Co"}
        for character in value
    )


def _idempotency_key(value: Any) -> str:
    if not isinstance(value, str) or len(value) != 36:
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    try:
        parsed = uuid.UUID(value)
    except (ValueError, AttributeError) as exc:
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.") from exc
    if parsed.version != 4 or str(parsed) != value:
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    return value


def _diagnostics(value: Any, consent: bool) -> dict[str, Any] | None:
    if not consent:
        if value is not None:
            raise RequestError(400, "INVALID_REQUEST", "Diagnostics require explicit consent.")
        return None
    if value is None:
        raise RequestError(400, "INVALID_REQUEST", "The diagnostics are invalid.")
    if not isinstance(value, dict) or set(value) != {
        "browserFamily", "browserMajor", "deviceClass"
    }:
        raise RequestError(400, "INVALID_REQUEST", "The diagnostics are invalid.")
    major = value.get("browserMajor")
    if (
        value.get("browserFamily") not in BROWSER_FAMILIES
        or value.get("deviceClass") not in DEVICE_CLASSES
        or not isinstance(major, int)
        or isinstance(major, bool)
        or major < 1
        or major > 999
    ):
        raise RequestError(400, "INVALID_REQUEST", "The diagnostics are invalid.")
    return {
        "browserFamily": value["browserFamily"],
        "browserMajor": major,
        "deviceClass": value["deviceClass"],
    }


def _reject_sensitive_text(*values: str) -> None:
    combined = "\n".join(values)
    if any(pattern.search(combined) for pattern in (
        EMAIL_ADDRESS, BEARER_TOKEN, JWT_TOKEN, COOKIE_VALUE, PAYMENT_NUMBER
    )):
        raise RequestError(
            400,
            "SENSITIVE_CONTENT_REJECTED",
            "Remove personal, account, cookie, token, or payment information and try again.",
        )


def _validate_automation(payload: dict[str, Any]) -> None:
    if payload.get("website") != "":
        _feedback_metric("FeedbackHoneypotRejections")
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    started = payload.get("formStartedAt")
    if (
        not isinstance(started, int)
        or isinstance(started, bool)
        or started <= 0
    ):
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")
    now_ms = int(time.time() * 1_000)
    elapsed = now_ms - int(started)
    minimum_ms = env_int("FEEDBACK_MINIMUM_FORM_COMPLETION_MS", 1_200)
    if minimum_ms > 10_000:
        raise RuntimeError("Invalid feedback timing configuration")
    if elapsed < minimum_ms or elapsed > 86_400_000:
        _feedback_metric("FeedbackTimingRejections")
        raise RequestError(400, "INVALID_REQUEST", "The feedback request is invalid.")


def _store(report: dict[str, Any]) -> tuple[str, bool]:
    pepper = os.getenv("FEEDBACK_DEDUPE_PEPPER", "")
    if len(pepper.encode("utf-8")) < 32:
        raise RuntimeError("Invalid feedback deduplication configuration")
    table_name = os.getenv("FEEDBACK_TABLE_NAME", "").strip()
    if not table_name:
        raise RuntimeError("Invalid feedback table configuration")
    retention = env_int("FEEDBACK_RETENTION_SECONDS", 7_776_000)
    if retention < 86_400 or retention > 31_536_000:
        raise RuntimeError("Invalid feedback retention configuration")
    now = int(time.time())
    submitted_at = utc_iso(now)
    delete_after = now + retention
    reference = f"FB-{secrets.token_hex(8).upper()}"
    fingerprint = hmac.new(
        pepper.encode("utf-8"),
        json.dumps(
            {key: value for key, value in report.items() if key != "idempotencyKey"},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    idempotency_record = f"IDEMPOTENCY#{report['idempotencyKey']}"
    fingerprint_record = f"FINGERPRINT#{fingerprint}"
    report_record = f"REPORT#{reference}"
    client = dynamodb_client()
    report_item = {
        "recordKey": {"S": report_record},
        "recordType": {"S": "REPORT"},
        "reference": {"S": reference},
        "status": {"S": "NEW"},
        "source": {"S": "public-tester"},
        "submittedAt": {"S": submitted_at},
        "deleteAfter": {"N": str(delete_after)},
        "category": {"S": report["category"]},
        "title": {"S": report["title"]},
        "description": {"S": report["description"]},
        "reproductionSteps": {"S": report["reproductionSteps"]},
        "pagePath": {"S": report["pagePath"]},
        "appBuild": {"S": report["appBuild"]},
        "diagnosticsConsent": {"BOOL": report["diagnosticsConsent"]},
    }
    if report["diagnostics"] is not None:
        report_item["diagnostics"] = {"M": {
            "browserFamily": {"S": report["diagnostics"]["browserFamily"]},
            "browserMajor": {"N": str(report["diagnostics"]["browserMajor"])},
            "deviceClass": {"S": report["diagnostics"]["deviceClass"]},
        }}
    lock_items = [
        {
            "recordKey": {"S": idempotency_record},
            "recordType": {"S": "IDEMPOTENCY"},
            "reference": {"S": reference},
            "deleteAfter": {"N": str(delete_after)},
        },
        {
            "recordKey": {"S": fingerprint_record},
            "recordType": {"S": "FINGERPRINT"},
            "reference": {"S": reference},
            "deleteAfter": {"N": str(delete_after)},
        },
    ]
    try:
        client.transact_write_items(TransactItems=[
            {"Put": {
                "TableName": table_name,
                "Item": item,
                "ConditionExpression": "attribute_not_exists(recordKey)",
            }}
            for item in [report_item, *lock_items]
        ])
        return reference, False
    except Exception as exc:
        if aws_error_code(exc) != "TransactionCanceledException":
            raise
        existing = _existing_reference(
            client, table_name, [idempotency_record, fingerprint_record]
        )
        if existing:
            return existing, True
        raise


def _existing_reference(client, table_name: str, record_keys: list[str]) -> str | None:
    for record_key in record_keys:
        result = client.get_item(
            TableName=table_name,
            Key={"recordKey": {"S": record_key}},
            ConsistentRead=True,
            ProjectionExpression="reference",
        )
        value = ((result.get("Item") or {}).get("reference") or {}).get("S")
        if isinstance(value, str) and REFERENCE.fullmatch(value):
            return value
    return None


def _feedback_metric(name: str) -> None:
    metric(name, namespace=METRIC_NAMESPACE)


def _origin_allowed(event: dict[str, Any]) -> bool:
    configured = os.getenv("FEEDBACK_CLIENT_ORIGIN", "").strip()
    origin = request_origin(event)
    return bool(configured and origin and hmac.compare_digest(configured, origin))


def _enforce_origin(event: dict[str, Any]) -> None:
    if not _origin_allowed(event):
        raise RequestError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.")


def _preflight(event: dict[str, Any]) -> dict[str, Any]:
    if not _origin_allowed(event):
        return _response(event, 403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.")
    result = _response(event, 204, "PREFLIGHT_OK", "")
    result["body"] = ""
    result["headers"].update({
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
    })
    return result


def _response(
    event: dict[str, Any],
    status: int,
    code: str,
    message: str,
    *,
    success: bool = False,
    reference: str | None = None,
) -> dict[str, Any]:
    response_headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin",
        **API_SECURITY_HEADERS,
    }
    if _origin_allowed(event):
        response_headers["Access-Control-Allow-Origin"] = request_origin(event)
    payload: dict[str, Any] = {"success": success, "code": code, "message": message}
    if reference is not None:
        payload["reference"] = reference
    return {
        "statusCode": status,
        "headers": response_headers,
        "body": json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
    }
