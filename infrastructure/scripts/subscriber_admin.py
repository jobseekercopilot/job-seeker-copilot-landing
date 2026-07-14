#!/usr/bin/env python3
"""Authorised lookup/export/status/deletion helper for a future waitlist table."""

import argparse
import json
import os
from pathlib import Path

from infrastructure.functions.common.tokens import subscriber_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Operate on one Job Seeker Copilot waitlist record.")
    parser.add_argument("action", choices=["lookup", "export", "unsubscribe", "delete"])
    parser.add_argument("--table", required=True, help="Exact physical DynamoDB table name")
    parser.add_argument("--output", type=Path, help="New secure JSON path for export")
    parser.add_argument("--confirm", action="store_true", help="Required for unsubscribe/delete")
    args = parser.parse_args()

    pepper = os.getenv("SUBSCRIBER_HASH_PEPPER", "")
    if len(pepper) < 32:
        parser.error("SUBSCRIBER_HASH_PEPPER must be set in the authorised operator environment")
    address = input("Subscriber email: ").strip().lower()
    if not address:
        parser.error("an email address is required")

    import boto3
    waitlist = boto3.resource("dynamodb").Table(args.table)
    key = {"subscriberId": subscriber_id(address, pepper)}
    item = waitlist.get_item(Key=key, ConsistentRead=True).get("Item")
    if not item:
        print("No matching live-table record was found.")
        return

    if args.action == "lookup":
        print(json.dumps(redacted_summary(item), indent=2, default=str))
    elif args.action == "export":
        if not args.output:
            parser.error("--output is required for export")
        with args.output.open("x", encoding="utf-8") as handle:
            json.dump(item, handle, indent=2, default=str)
            handle.write("\n")
        print(f"Exported one record to {args.output}")
    elif args.action == "unsubscribe":
        require_confirmation(parser, args.confirm)
        waitlist.update_item(
            Key=key,
            UpdateExpression="SET #status=:status",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":status": "unsubscribed"},
        )
        print("The live-table record is now marked unsubscribed.")
    else:
        require_confirmation(parser, args.confirm)
        waitlist.delete_item(Key=key)
        print("The live-table record was deleted; review backups, exports, logs and email systems separately.")


def redacted_summary(item: dict) -> dict:
    return {
        "subscriberIdPrefix": str(item.get("subscriberId", ""))[:12],
        "status": item.get("status"),
        "source": item.get("source"),
        "consentVersion": item.get("consentVersion"),
        "createdAt": item.get("createdAt"),
        "confirmedAt": item.get("confirmedAt"),
        "unsubscribedAt": item.get("unsubscribedAt"),
    }


def require_confirmation(parser: argparse.ArgumentParser, confirmed: bool) -> None:
    if not confirmed:
        parser.error("this action changes data; repeat it with --confirm after checking account, region and table")


if __name__ == "__main__":
    main()
