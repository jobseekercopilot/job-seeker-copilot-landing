#!/usr/bin/env python3
"""Preview and triage stored public-tester feedback using local operator credentials."""

import argparse
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

REPOSITORY = "jobseekercopilot/infrastructure"
LABELS = ("public-tester", "feedback")
STATUS_INDEX = "status-submittedAt-index"
REFERENCE = re.compile(r"^FB-[A-F0-9]{16}$")
ISSUE_URL = re.compile(
    r"^https://github\.com/jobseekercopilot/infrastructure/issues/[1-9][0-9]*$"
)
CATEGORY_LABELS = {
    "BROKEN": "Broken",
    "CONFUSING": "Confusing",
    "SUGGESTION": "Suggestion",
    "OTHER": "Other",
}


class IssueCreatedButNotRecorded(RuntimeError):
    def __init__(self, issue_url: str):
        super().__init__("The issue was created but its URL was not recorded.")
        self.issue_url = issue_url


class IssueCreationNotStarted(RuntimeError):
    """The local GitHub CLI could not start, so no remote issue was created."""


class IssueCreationOutcomeUnknown(RuntimeError):
    """GitHub may have created the issue; the report must remain claimed."""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Preview NEW feedback or create one fixed-label issue in the private "
            "infrastructure repository. Preview is the default."
        )
    )
    parser.add_argument("--table-name", required=True, help="Exact feedback table name")
    parser.add_argument("--region", default="eu-west-2")
    parser.add_argument("--profile", help="Optional local AWS profile")
    parser.add_argument("--reference", type=_reference_argument)
    parser.add_argument("--limit", type=_limit_argument, default=20)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create exactly the selected issue and mark the report TRIAGED",
    )
    args = parser.parse_args(argv)
    if args.apply and not args.reference:
        parser.error("--apply requires one explicit --reference")

    client = _dynamodb_client(args.region, args.profile)
    reports = (
        [_get_new_report(client, args.table_name, args.reference)]
        if args.reference
        else _list_new_reports(client, args.table_name, args.limit)
    )
    reports = [report for report in reports if report is not None]
    if not reports:
        print("No matching NEW feedback reports were found.")
        return 0

    if not args.apply:
        print("DRY RUN — no GitHub issue or DynamoDB state will be changed.\n")
        for report in reports:
            print(render_issue_preview(report))
            print("\n" + "-" * 72 + "\n")
        return 0

    report = reports[0]
    try:
        issue_url = triage_report(client, args.table_name, report)
    except IssueCreatedButNotRecorded as exc:
        print(
            "Issue created but the report remains TRIAGING; reconcile it manually: "
            f"{exc.issue_url}"
        )
        return 2
    except RuntimeError as exc:
        print(f"Triage stopped safely: {exc}")
        return 1
    print(f"Triaged {report['reference']} as {issue_url}")
    return 0


def _dynamodb_client(region: str, profile: str | None):
    import boto3

    session = boto3.Session(profile_name=profile, region_name=region)
    return session.client("dynamodb")


def _reference_argument(value: str) -> str:
    if not REFERENCE.fullmatch(value):
        raise argparse.ArgumentTypeError("reference must use the FB-XXXXXXXXXXXXXXXX format")
    return value


def _limit_argument(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("limit must be an integer") from exc
    if parsed < 1 or parsed > 50:
        raise argparse.ArgumentTypeError("limit must be between 1 and 50")
    return parsed


def _list_new_reports(client, table_name: str, limit: int) -> list[dict[str, Any]]:
    reports: list[dict[str, Any]] = []
    start_key = None
    while len(reports) < limit:
        request: dict[str, Any] = {
            "TableName": table_name,
            "IndexName": STATUS_INDEX,
            "KeyConditionExpression": "#status = :new",
            "ExpressionAttributeNames": {"#status": "status"},
            "ExpressionAttributeValues": {":new": {"S": "NEW"}},
            "ScanIndexForward": True,
            "Limit": limit - len(reports),
        }
        if start_key:
            request["ExclusiveStartKey"] = start_key
        response = client.query(**request)
        reports.extend(_decode_item(item) for item in response.get("Items", []))
        start_key = response.get("LastEvaluatedKey")
        if not start_key:
            break
    return [report for report in reports if _valid_report(report)]


def _get_new_report(client, table_name: str, reference: str) -> dict[str, Any] | None:
    response = client.get_item(
        TableName=table_name,
        Key={"recordKey": {"S": f"REPORT#{reference}"}},
        ConsistentRead=True,
    )
    report = _decode_item(response["Item"]) if response.get("Item") else None
    return report if report and _valid_report(report) else None


def _decode_item(item: dict[str, Any]) -> dict[str, Any]:
    return {name: _decode_value(value) for name, value in item.items()}


def _decode_value(value: dict[str, Any]) -> Any:
    if "S" in value:
        return value["S"]
    if "N" in value:
        raw = value["N"]
        return int(raw) if str(raw).lstrip("-").isdigit() else float(raw)
    if "BOOL" in value:
        return bool(value["BOOL"])
    if "NULL" in value:
        return None
    if "M" in value:
        return _decode_item(value["M"])
    raise ValueError("Unsupported feedback attribute type")


def _valid_report(report: dict[str, Any]) -> bool:
    basic_fields_valid = (
        report.get("recordType") == "REPORT"
        and report.get("status") == "NEW"
        and isinstance(report.get("reference"), str)
        and REFERENCE.fullmatch(report["reference"]) is not None
        and report.get("category") in CATEGORY_LABELS
        and all(isinstance(report.get(field), str) for field in (
            "title", "description", "reproductionSteps", "pagePath", "appBuild", "submittedAt"
        ))
    )
    if not basic_fields_valid:
        return False
    return (
        5 <= len(report["title"]) <= 120
        and 10 <= len(report["description"]) <= 2_000
        and len(report["reproductionSteps"]) <= 1_200
        and 1 <= len(report["pagePath"]) <= 256
        and report["pagePath"].startswith("/")
        and "?" not in report["pagePath"]
        and "#" not in report["pagePath"]
        and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", report["appBuild"])
        is not None
    )


def render_issue_preview(report: dict[str, Any]) -> str:
    category = CATEGORY_LABELS[report["category"]]
    title = _safe_inline(f"[Public Tester] [{category}] {report['title']}")
    diagnostics = report.get("diagnostics")
    if isinstance(diagnostics, dict):
        diagnostic_summary = (
            f"{diagnostics.get('browserFamily', 'Other')} "
            f"{diagnostics.get('browserMajor', '?')} / "
            f"{diagnostics.get('deviceClass', 'unknown')}"
        )
    else:
        diagnostic_summary = "Not supplied"
    body = "\n".join([
        "Source: Public Tester",
        f"Reference: `{report['reference']}`",
        f"Category: {category}",
        f"Submitted: `{_safe_inline(report['submittedAt'])}`",
        f"Page: `{_safe_inline(report['pagePath'])}`",
        f"Client-asserted app build: `{_safe_inline(report['appBuild'])}`",
        f"Coarse diagnostics: {_safe_inline(diagnostic_summary)}",
        "",
        "## Description",
        "",
        _safe_literal(report["description"]),
        "",
        "## Steps to reproduce",
        "",
        _safe_literal(report["reproductionSteps"] or "Not supplied"),
        "",
        "_Anonymous public-tester report. Do not add personal data, credentials, "
        "cookies, payment details, CVs, or private documents during triage._",
    ])
    return f"TITLE\n{title}\n\nBODY\n{body}"


def _safe_inline(value: Any) -> str:
    text = " ".join(str(value).replace("\r", " ").replace("\n", " ").split())
    return text.replace("@", "＠").replace("#", "＃").replace("`", "'")


def _safe_literal(value: str) -> str:
    lines = value.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(f"    {line.replace('@', '＠')}" for line in lines)


def _issue_parts(report: dict[str, Any]) -> tuple[str, str]:
    preview = render_issue_preview(report)
    title_block, body = preview.split("\n\nBODY\n", 1)
    return title_block.removeprefix("TITLE\n"), body


def create_issue(
    report: dict[str, Any],
    runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> str:
    title, body = _issue_parts(report)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", prefix="jsc-feedback-", suffix=".md"
    ) as body_file:
        os.chmod(body_file.name, 0o600)
        body_file.write(body)
        body_file.flush()
        command = [
            "gh", "issue", "create",
            "--repo", REPOSITORY,
            "--title", title,
            "--body-file", body_file.name,
        ]
        for label in LABELS:
            command.extend(["--label", label])
        try:
            result = runner(
                command,
                check=True,
                text=True,
                capture_output=True,
                timeout=30,
            )
        except OSError as exc:
            raise IssueCreationNotStarted(
                "the local gh process could not start; no issue was created"
            ) from exc
        except subprocess.SubprocessError as exc:
            raise IssueCreationOutcomeUnknown(
                "GitHub issue creation returned an unknown outcome; leave the "
                "report TRIAGING and reconcile by reference before retrying"
            ) from exc
    for line in result.stdout.splitlines():
        candidate = line.strip()
        if ISSUE_URL.fullmatch(candidate):
            return candidate
    raise IssueCreationOutcomeUnknown(
        "GitHub issue creation returned no approved issue URL; leave the report "
        "TRIAGING and reconcile by reference before retrying"
    )


def triage_report(
    client,
    table_name: str,
    report: dict[str, Any],
    runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> str:
    reference = report["reference"]
    record_key = {"recordKey": {"S": f"REPORT#{reference}"}}
    owner = f"CLI-{uuid.uuid4()}"
    started_at = _utc(now())
    try:
        client.update_item(
            TableName=table_name,
            Key=record_key,
            UpdateExpression=(
                "SET #status = :triaging, triageOwner = :owner, "
                "triageStartedAt = :started"
            ),
            ConditionExpression="#status = :new",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":new": {"S": "NEW"},
                ":triaging": {"S": "TRIAGING"},
                ":owner": {"S": owner},
                ":started": {"S": started_at},
            },
        )
    except Exception as exc:
        raise RuntimeError("the report could not be claimed; refresh its status") from exc

    try:
        issue_url = create_issue(report, runner)
    except IssueCreationNotStarted:
        _release_claim(client, table_name, record_key, owner)
        raise
    try:
        client.update_item(
            TableName=table_name,
            Key=record_key,
            UpdateExpression=(
                "SET #status = :triaged, issueUrl = :url, triagedAt = :at "
                "REMOVE triageOwner, triageStartedAt"
            ),
            ConditionExpression="#status = :triaging AND triageOwner = :owner",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":triaging": {"S": "TRIAGING"},
                ":triaged": {"S": "TRIAGED"},
                ":owner": {"S": owner},
                ":url": {"S": issue_url},
                ":at": {"S": _utc(now())},
            },
        )
    except Exception as exc:
        raise IssueCreatedButNotRecorded(issue_url) from exc
    return issue_url


def _release_claim(client, table_name: str, record_key: dict[str, Any], owner: str) -> None:
    try:
        client.update_item(
            TableName=table_name,
            Key=record_key,
            UpdateExpression="SET #status = :new REMOVE triageOwner, triageStartedAt",
            ConditionExpression="#status = :triaging AND triageOwner = :owner",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":new": {"S": "NEW"},
                ":triaging": {"S": "TRIAGING"},
                ":owner": {"S": owner},
            },
        )
    except Exception as exc:
        raise RuntimeError("issue creation failed and the TRIAGING claim needs review") from exc


def _utc(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("triage timestamps must be timezone-aware")
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())
