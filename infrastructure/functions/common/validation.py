import re
import time
from typing import Any

from common.http import ApiError

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
REPEATED_CHARACTERS = re.compile(r"(.)\1{24,}", re.DOTALL)


def exact_fields(value: dict, allowed: set[str], required: set[str]) -> None:
    unknown = set(value) - allowed
    missing = required - set(value)
    if unknown or missing:
        raise ApiError(400, "INVALID_FIELDS", "The request contains missing or unsupported fields.", "validation")


def text(value: Any, name: str, minimum: int, maximum: int) -> str:
    if not isinstance(value, str):
        raise ApiError(400, "INVALID_FIELDS", f"{name} is invalid.", "validation")
    cleaned = " ".join(value.strip().split()) if name != "message" else value.strip()
    if len(cleaned) < minimum or len(cleaned) > maximum or REPEATED_CHARACTERS.search(cleaned):
        raise ApiError(400, "INVALID_FIELDS", f"{name} is invalid.", "validation")
    return cleaned


def email(value: Any) -> str:
    cleaned = text(value, "email", 3, 254).lower()
    if not EMAIL_PATTERN.fullmatch(cleaned):
        raise ApiError(400, "INVALID_EMAIL", "Enter a valid email address.", "validation")
    return cleaned


def anti_automation(value: dict, minimum_completion_ms: int) -> None:
    if value.get("website") not in (None, ""):
        raise ApiError(400, "AUTOMATION_REJECTED", "The request could not be accepted.", "automation")
    started = value.get("formStartedAt")
    if not isinstance(started, (int, float)):
        raise ApiError(400, "INVALID_FIELDS", "The form timing value is invalid.", "validation")
    elapsed = int(time.time() * 1000) - int(started)
    if elapsed < minimum_completion_ms:
        raise ApiError(429, "TOO_MANY_REQUESTS", "Please wait a moment and try again.", "automation")
