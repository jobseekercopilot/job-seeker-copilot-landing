import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
from datetime import datetime, timezone
from html import escape
from typing import Any
from urllib.parse import urlencode

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

MAX_BODY_BYTES = 4_096
MAX_TOKEN_LENGTH = 128
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,128}$")
DOMAIN_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
LOCAL_PART_PATTERN = re.compile(r"^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$")

_DDB_CLIENT = None
_DDB_RESOURCE = None
_SES_CLIENT = None


class RequestError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def parse_json(event: dict[str, Any]) -> dict[str, Any]:
    content_type = headers(event).get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
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


def normalise_email(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    address = value.strip().lower()
    if not address or len(address) > 254 or address.count("@") != 1 or any(char.isspace() for char in address):
        return ""
    local, domain = address.rsplit("@", 1)
    if (not local or len(local) > 64 or not LOCAL_PART_PATTERN.fullmatch(local)
            or local.startswith(".") or local.endswith(".") or ".." in local):
        return ""
    if not domain or len(domain) > 253 or "." not in domain:
        return ""
    if not all(DOMAIN_LABEL_PATTERN.fullmatch(label) for label in domain.split(".")):
        return ""
    return address


def validate_token(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    token = value.strip()
    return token if len(token) <= MAX_TOKEN_LENGTH and TOKEN_PATTERN.fullmatch(token) else ""


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hashes_match(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)


def now_epoch() -> int:
    return int(time.time())


def utc_iso(epoch: int | None = None) -> str:
    value = datetime.fromtimestamp(epoch, timezone.utc) if epoch is not None else datetime.now(timezone.utc)
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


def env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as exc:
        raise RuntimeError(f"Invalid numeric configuration: {name}") from exc
    if value < minimum:
        raise RuntimeError(f"Invalid numeric configuration: {name}")
    return value


def response(event: dict[str, Any], status: int, code: str, message: str, *, success: bool = False) -> dict[str, Any]:
    origin = request_origin(event)
    result_headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin",
        "X-Content-Type-Options": "nosniff",
    }
    if origin and origin_allowed(origin):
        result_headers["Access-Control-Allow-Origin"] = origin
    return {
        "statusCode": status,
        "headers": result_headers,
        "body": json.dumps({"success": success, "code": code, "message": message}, separators=(",", ":")),
    }


def preflight(event: dict[str, Any]) -> dict[str, Any]:
    origin = request_origin(event)
    if not origin or not origin_allowed(origin):
        return response(event, 403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.")
    result = response(event, 204, "PREFLIGHT_OK", "")
    result["body"] = ""
    result["headers"].update({
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
    })
    return result


def enforce_origin(event: dict[str, Any]) -> None:
    origin = request_origin(event)
    if origin and not origin_allowed(origin):
        raise RequestError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.")


def is_options(event: dict[str, Any]) -> bool:
    return request_method(event) == "OPTIONS"


def request_method(event: dict[str, Any]) -> str:
    return str(((event.get("requestContext") or {}).get("http") or {}).get("method", "POST")).upper()


def request_origin(event: dict[str, Any]) -> str:
    return headers(event).get("origin", "").strip().rstrip("/")


def headers(event: dict[str, Any]) -> dict[str, str]:
    return {str(key).lower(): str(value) for key, value in (event.get("headers") or {}).items()}


def origin_allowed(origin: str) -> bool:
    environment = os.getenv("ENVIRONMENT_NAME", "development").strip().lower()
    if environment not in {"development", "production"}:
        return False
    settings = ("PRODUCTION_ORIGIN",) if environment == "production" else (
        "DEVELOPMENT_ORIGIN", "FEATURE_ORIGIN",
    )
    allowed_origins = {
        os.getenv(setting, "").strip().rstrip("/")
        for setting in settings
        if os.getenv(setting, "").strip()
    }
    return origin in allowed_origins


def subscriber_table():
    return dynamodb_resource().Table(os.environ["WAITLIST_TABLE_NAME"])


def token_table():
    return dynamodb_resource().Table(os.environ["TOKEN_TABLE_NAME"])


def dynamodb_resource():
    global _DDB_RESOURCE
    if _DDB_RESOURCE is None:
        import boto3
        _DDB_RESOURCE = boto3.resource("dynamodb")
    return _DDB_RESOURCE


def dynamodb_client():
    global _DDB_CLIENT
    if _DDB_CLIENT is None:
        import boto3
        _DDB_CLIENT = boto3.client("dynamodb")
    return _DDB_CLIENT


def ses_client():
    global _SES_CLIENT
    if _SES_CLIENT is None:
        import boto3
        _SES_CLIENT = boto3.client("sesv2", region_name=os.getenv("SES_REGION", "eu-west-2"))
    return _SES_CLIENT


def send_confirmation_email(recipient: str, raw_token: str) -> None:
    site_url = os.environ["PUBLIC_SITE_URL"].strip().rstrip("/")
    sender = os.environ["WAITLIST_SENDER_EMAIL"].strip()
    support = os.environ["PUBLIC_SUPPORT_EMAIL"].strip()
    configuration_set = os.environ["SES_CONFIGURATION_SET"].strip()
    ttl_seconds = env_int("CONFIRMATION_TOKEN_TTL_SECONDS", 172_800)
    ttl_hours = max(1, ttl_seconds // 3600)
    confirmation_url = f"{site_url}/waitlist/confirm?{urlencode({'token': raw_token})}"
    subject = "Confirm your Job Seeker Copilot waitlist email"
    offer = (
        "Once confirmed, you will be eligible for priority early access and the promotional "
        "20,000-token offer, subject to the early-access terms."
    )
    text_body = (
        "Job Seeker Copilot\n\n"
        "You received this email because someone requested to join the Job Seeker Copilot waitlist.\n\n"
        f"Confirm your email address: {confirmation_url}\n\n"
        f"This single-use link expires in {ttl_hours} hours. {offer}\n\n"
        "If you did not request this, no action is required.\n\n"
        f"Privacy Policy: {site_url}/privacy\nContact: {site_url}/contact\nSupport: {support}"
    )
    safe_url = escape(confirmation_url, quote=True)
    html_body = (
        '<div style="font-family:Arial,sans-serif;max-width:620px;color:#172033">'
        '<p style="font-weight:700;color:#1d4fa8">Job Seeker Copilot</p>'
        '<h1 style="font-size:26px">Confirm your waitlist email</h1>'
        '<p>You received this email because someone requested to join the Job Seeker Copilot waitlist.</p>'
        f'<p style="margin:28px 0"><a href="{safe_url}" style="background:#2767e8;color:#fff;'
        'padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Confirm my email</a></p>'
        f'<p>Or copy this link into your browser:<br><a href="{safe_url}">{safe_url}</a></p>'
        f'<p>This single-use link expires in {ttl_hours} hours. {escape(offer)}</p>'
        '<p>If you did not request this, no action is required.</p>'
        f'<p style="color:#64748b;font-size:13px"><a href="{escape(site_url + "/privacy", quote=True)}">'
        f'Privacy Policy</a> · <a href="{escape(site_url + "/contact", quote=True)}">Contact</a> · '
        f'{escape(support)}</p></div>'
    )
    ses_client().send_email(
        FromEmailAddress=f"Job Seeker Copilot <{sender}>",
        Destination={"ToAddresses": [recipient]},
        ReplyToAddresses=[support],
        Content={"Simple": {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text_body, "Charset": "UTF-8"},
                "Html": {"Data": html_body, "Charset": "UTF-8"},
            },
        }},
        ConfigurationSetName=configuration_set,
        EmailTags=[{"Name": "message-purpose", "Value": "waitlist-confirmation"}],
    )


def av_string(value: str) -> dict[str, str]:
    return {"S": value}


def av_number(value: int) -> dict[str, str]:
    return {"N": str(value)}


def aws_error_code(error: Exception) -> str:
    value = getattr(error, "response", {})
    return str((value.get("Error") or {}).get("Code", "")) if isinstance(value, dict) else ""


def aws_error_scope(error: Exception) -> str:
    value = getattr(error, "response", {})
    message = str((value.get("Error") or {}).get("Message", "")) if isinstance(value, dict) else ""
    if "configuration-set/" in message:
        return "configuration-set"
    if ":identity/" in message:
        identity = message.split(":identity/", 1)[1].split()[0]
        return "email-identity" if "@" in identity else "domain-identity"
    if "ses:SendEmail" in message:
        return "send-email"
    return "unknown"


def log_result(context: Any, operation: str, status: int, outcome: str) -> None:
    LOGGER.info(json.dumps({
        "requestId": getattr(context, "aws_request_id", "unknown"),
        "operation": operation,
        "statusCode": status,
        "outcome": outcome,
    }, separators=(",", ":")))


def metric(name: str, value: int = 1) -> None:
    LOGGER.info(json.dumps({
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": "JobSeekerCopilot/Waitlist",
                "Dimensions": [[]],
                "Metrics": [{"Name": name, "Unit": "Count"}],
            }],
        },
        name: value,
    }, separators=(",", ":")))
