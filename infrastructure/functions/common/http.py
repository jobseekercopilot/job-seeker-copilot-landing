import json
import os
from dataclasses import dataclass
from typing import Any


@dataclass
class ApiError(Exception):
    status: int
    code: str
    public_message: str
    category: str = "request"


def response(event: dict, status: int, success: bool, code: str, message: str) -> dict:
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Vary": "Origin",
    }
    origin = request_origin(event)
    if origin and origin in allowed_origins():
        headers["Access-Control-Allow-Origin"] = origin
    return {
        "statusCode": status,
        "headers": headers,
        "body": json.dumps({"success": success, "code": code, "message": message}),
    }


def error_response(event: dict, error: ApiError) -> dict:
    return response(event, error.status, False, error.code, error.public_message)


def options_response(event: dict) -> dict:
    origin = request_origin(event)
    if not origin or origin not in allowed_origins():
        return response(event, 403, False, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.")
    result = response(event, 204, True, "PREFLIGHT_OK", "")
    result["headers"].update({
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
    })
    result["body"] = ""
    return result


def parse_json(event: dict) -> dict[str, Any]:
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    content_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        raise ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.", "validation")
    body = event.get("body")
    if not isinstance(body, str) or len(body.encode("utf-8")) > 16_384:
        raise ApiError(400, "INVALID_REQUEST", "The request body is invalid.", "validation")
    try:
        value = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ApiError(400, "INVALID_JSON", "The request body is not valid JSON.", "validation") from exc
    if not isinstance(value, dict):
        raise ApiError(400, "INVALID_REQUEST", "The request body must be a JSON object.", "validation")
    return value


def query_token(event: dict) -> str:
    token = str((event.get("queryStringParameters") or {}).get("token", "")).strip()
    if not token or len(token) > 256:
        raise ApiError(400, "INVALID_TOKEN", "This link is invalid or incomplete.", "validation")
    return token


def allowed_origins() -> set[str]:
    return {origin.strip().rstrip("/") for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()}


def request_origin(event: dict) -> str:
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    return headers.get("origin", "").rstrip("/")
