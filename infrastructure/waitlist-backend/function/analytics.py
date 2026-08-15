import json
import logging
import os
from typing import Any

from common import (
    RequestError,
    environment_dimensions,
    is_options,
    log_result,
    metric,
    parse_json,
    preflight,
    request_origin,
    origin_allowed,
    response,
)

LOGGER = logging.getLogger()
OPERATION = "web-analytics"
METRIC_NAMESPACE = "JobSeekerCopilot/Analytics"
EVENT_METRICS = {
    "visit": "Visits",
    "page_view": "PageViews",
    "waitlist_form_view": "WaitlistFormViews",
    "waitlist_attempt": "WaitlistAttempts",
    "contact_form_view": "ContactFormViews",
    "contact_attempt": "ContactAttempts",
    "pricing_view": "PricingViews",
    "pricing_cta": "PricingCtaClicks",
}
PUBLIC_PATHS = {
    "/", "/about", "/faq", "/the-journey-so-far/job-search-platform-comparison",
    "/privacy", "/terms", "/contact", "/accessibility", "/404",
}
VIEWPORTS = {"mobile", "tablet", "desktop"}
TRAFFIC_CLASSES = {"production", "smoke"}
ACQUISITION_CATEGORIES = {"direct", "search", "social", "email", "partner", "other"}
CAMPAIGN_FIELDS = {"source", "medium", "campaign", "content"}
SAFE_CAMPAIGN_VALUES = {
    "source": {"direct", "google", "bing", "linkedin", "facebook", "whatsapp", "email", "partner", "other"},
    "medium": {"direct", "organic", "social", "email", "referral", "partner"},
    "campaign": {"beta_launch", "founder_update", "launch", "newsletter", "partner_launch"},
    "content": {"founder_post", "homepage", "profile", "article", "newsletter", "message"},
}


def handler(event, context):
    if is_options(event):
        return preflight(event)
    try:
        origin = request_origin(event)
        if not origin or not origin_allowed(origin):
            raise RequestError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.")
        if os.getenv("ENABLE_ANALYTICS_COLLECTION", "false").strip().lower() != "true":
            raise RequestError(503, "ANALYTICS_UNAVAILABLE", "Analytics collection is disabled.")
        payload = parse_json(event)
        record = _validated_event(payload)
        metric(
            EVENT_METRICS[record["eventName"]],
            namespace=METRIC_NAMESPACE,
            dimensions={
                **environment_dimensions(),
                "TrafficClass": record["trafficClass"],
            },
        )
        LOGGER.info(json.dumps({"analytics": record}, separators=(",", ":"), sort_keys=True))
        log_result(context, OPERATION, 202, "accepted")
        return response(event, 202, "ANALYTICS_ACCEPTED", "Event accepted.", success=True)
    except RequestError as exc:
        log_result(context, OPERATION, exc.status_code, exc.code)
        return response(event, exc.status_code, exc.code, exc.message)
    except Exception:
        LOGGER.error("Analytics collection failed")
        log_result(context, OPERATION, 503, "service-unavailable")
        return response(event, 503, "ANALYTICS_UNAVAILABLE", "Analytics collection is unavailable.")


def _validated_event(payload: dict[str, Any]) -> dict[str, Any]:
    allowed = {"eventName", "path", "context", "viewport", "trafficClass", "acquisition", "campaign"}
    required = {"eventName", "path", "viewport", "trafficClass", "acquisition"}
    if not required.issubset(payload) or not set(payload).issubset(allowed):
        raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")

    event_name = payload.get("eventName")
    path = payload.get("path")
    viewport = payload.get("viewport")
    traffic_class = payload.get("trafficClass")
    acquisition = payload.get("acquisition")
    context = payload.get("context")
    if event_name not in EVENT_METRICS or path not in PUBLIC_PATHS or \
            viewport not in VIEWPORTS or traffic_class not in TRAFFIC_CLASSES or \
            acquisition not in ACQUISITION_CATEGORIES:
        raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")
    if event_name in {"visit", "page_view"}:
        if context is not None:
            raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")
    elif event_name.startswith("waitlist_"):
        if context not in {"hero", "footer"}:
            raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")
    elif event_name.startswith("pricing_"):
        if path != "/" or context != "pricing":
            raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")
    elif path != "/contact" or context != "contact":
        raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")

    record = {
        "eventName": event_name,
        "path": path,
        "viewport": viewport,
        "trafficClass": traffic_class,
        "acquisition": acquisition,
    }
    if context is not None:
        record["context"] = context
    campaign = payload.get("campaign")
    if campaign is not None:
        if not isinstance(campaign, dict) or not campaign or not set(campaign).issubset(CAMPAIGN_FIELDS):
            raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")
        if any(not isinstance(value, str) or value not in SAFE_CAMPAIGN_VALUES[field] for field, value in campaign.items()):
            raise RequestError(400, "INVALID_ANALYTICS_EVENT", "The analytics event is invalid.")
        record["campaign"] = campaign
    return record
