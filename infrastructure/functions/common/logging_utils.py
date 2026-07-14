import json
import logging
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def log_result(context, operation: str, status: int, category: str, started: float, record_id: str = "") -> None:
    logger.info(json.dumps({
        "requestId": getattr(context, "aws_request_id", "local"),
        "operation": operation,
        "status": status,
        "category": category,
        "durationMs": round((time.monotonic() - started) * 1000),
        "recordIdPrefix": record_id[:12],
    }))
