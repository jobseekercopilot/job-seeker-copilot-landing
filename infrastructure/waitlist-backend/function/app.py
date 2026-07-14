import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

MAX_BODY_BYTES = 4_096
AMPLIFY_APP_ID_PATTERN = re.compile(r"^[a-z0-9]+$")
DOMAIN_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
LOCAL_PART_PATTERN = re.compile(r"^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$")
_TABLE = None


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    origin = _request_origin(event)
    method = str(((event.get("requestContext") or {}).get("http") or {}).get("method", "POST")).upper()

    if method == "OPTIONS":
        if not origin or not _origin_allowed(origin):
            return _response(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.", origin)
        return _response(204, "PREFLIGHT_OK", "", origin, preflight=True)

    if method != "POST":
        return _response(405, "METHOD_NOT_ALLOWED", "Only POST is supported.", origin)
    if origin and not _origin_allowed(origin):
        return _response(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.", origin)

    try:
        payload = _parse_json(event)
        if set(payload) != {"email"}:
            return _response(400, "INVALID_REQUEST", "Send only an email address.", origin)
        email = _normalise_email(payload.get("email"))
        if not email:
            return _response(400, "INVALID_EMAIL", "Enter a valid email address.", origin)

        item = {
            "email": email,
            "createdAt": _utc_timestamp(),
            "status": "PENDING",
            "source": "landing-page",
        }
        try:
            _waitlist_table().put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(#email)",
                ExpressionAttributeNames={"#email": "email"},
            )
        except Exception as exc:
            if _aws_error_code(exc) == "ConditionalCheckFailedException":
                _log(context, 409, "duplicate")
                return _response(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered.", origin)
            raise

        _log(context, 201, "created")
        return _response(201, "WAITLIST_CREATED", "Your email has been saved to the waitlist.", origin, success=True)
    except RequestError as exc:
        _log(context, exc.status_code, exc.code)
        return _response(exc.status_code, exc.code, exc.message, origin)
    except Exception:
        LOGGER.exception("Waitlist persistence failed")
        _log(context, 503, "service-unavailable")
        return _response(503, "SERVICE_UNAVAILABLE", "We could not save your email. Please try again later.", origin)


class RequestError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _parse_json(event: dict[str, Any]) -> dict[str, Any]:
    headers = _headers(event)
    if headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
        raise RequestError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.")

    body = event.get("body")
    if not isinstance(body, str):
        raise RequestError(400, "INVALID_JSON", "The request body is not valid JSON.")
    try:
        raw = base64.b64decode(body, validate=True) if event.get("isBase64Encoded") else body.encode("utf-8")
    except (ValueError, UnicodeError) as exc:
        raise RequestError(400, "INVALID_JSON", "The request body is not valid JSON.") from exc
    if not raw or len(raw) > MAX_BODY_BYTES:
        raise RequestError(400, "INVALID_REQUEST", "The request body is invalid.")
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeError) as exc:
        raise RequestError(400, "INVALID_JSON", "The request body is not valid JSON.") from exc
    if not isinstance(payload, dict):
        raise RequestError(400, "INVALID_REQUEST", "The request body must be a JSON object.")
    return payload


def _normalise_email(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    address = value.strip().lower()
    if not address or len(address) > 254 or address.count("@") != 1 or any(character.isspace() for character in address):
        return ""
    local, domain = address.rsplit("@", 1)
    if (
        not local
        or len(local) > 64
        or not LOCAL_PART_PATTERN.fullmatch(local)
        or local.startswith(".")
        or local.endswith(".")
        or ".." in local
    ):
        return ""
    if not domain or len(domain) > 253 or "." not in domain:
        return ""
    if not all(DOMAIN_LABEL_PATTERN.fullmatch(label) for label in domain.split(".")):
        return ""
    return address


def _origin_allowed(origin: str) -> bool:
    environment = os.getenv("ENVIRONMENT_NAME", "development").strip().lower()
    if environment == "production":
        return origin == os.getenv("PRODUCTION_ORIGIN", "https://jobseekercopilot.com").strip().rstrip("/")
    if environment != "development":
        return False
    branch = re.escape(os.getenv("AMPLIFY_BRANCH_NAME", "develop").strip().lower())
    match = re.fullmatch(rf"https://{branch}\.([a-z0-9]+)\.amplifyapp\.com", origin)
    return bool(match and AMPLIFY_APP_ID_PATTERN.fullmatch(match.group(1)))


def _request_origin(event: dict[str, Any]) -> str:
    return _headers(event).get("origin", "").strip().rstrip("/")


def _headers(event: dict[str, Any]) -> dict[str, str]:
    return {str(key).lower(): str(value) for key, value in (event.get("headers") or {}).items()}


def _response(
    status_code: int,
    code: str,
    message: str,
    origin: str,
    *,
    success: bool = False,
    preflight: bool = False,
) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin",
        "X-Content-Type-Options": "nosniff",
    }
    if origin and _origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
    if preflight:
        headers.update({
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "600",
        })
        return {"statusCode": status_code, "headers": headers, "body": ""}
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps({"success": success, "code": code, "message": message}, separators=(",", ":")),
    }


def _waitlist_table():
    global _TABLE
    if _TABLE is None:
        import boto3

        _TABLE = boto3.resource("dynamodb").Table(os.environ["WAITLIST_TABLE_NAME"])
    return _TABLE


def _aws_error_code(error: Exception) -> str:
    response = getattr(error, "response", {})
    return str((response.get("Error") or {}).get("Code", "")) if isinstance(response, dict) else ""


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _log(context: Any, status_code: int, outcome: str) -> None:
    LOGGER.info(json.dumps({
        "requestId": getattr(context, "aws_request_id", "unknown"),
        "operation": "waitlist-create",
        "statusCode": status_code,
        "outcome": outcome,
    }, separators=(",", ":")))
