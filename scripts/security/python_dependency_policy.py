#!/usr/bin/env python3
"""Fail if Lambda packages acquire an unaudited third-party dependency."""

from __future__ import annotations

import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_ROOTS = (
    ROOT / "infrastructure" / "functions",
    ROOT / "infrastructure" / "waitlist-backend" / "function",
)
MANIFEST = ROOT / "security" / "runtime-requirements.txt"
RUNTIME_PROVIDED = {"boto3", "botocore"}


def imports_in(path: Path) -> set[str]:
    imports: set[str] = set()
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name.split(".", 1)[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            imports.add(node.module.split(".", 1)[0])
    return imports


def main() -> int:
    manifest_entries = [
        line.strip() for line in MANIFEST.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    if manifest_entries:
        print("Python dependency policy stopped: update the import-to-manifest audit before packaging dependencies.", file=sys.stderr)
        return 1

    python_files = [path for root in RUNTIME_ROOTS for path in root.rglob("*.py")]
    local_modules = {
        path.stem for path in python_files
    } | {
        path.name for root in RUNTIME_ROOTS for path in root.iterdir() if path.is_dir()
    }
    imported = set().union(*(imports_in(path) for path in python_files))
    unknown = imported - set(sys.stdlib_module_names) - local_modules - RUNTIME_PROVIDED
    if unknown:
        print(
            "Python dependency policy stopped: unaudited imports: " + ", ".join(sorted(unknown)),
            file=sys.stderr,
        )
        return 1

    print(
        f"Python runtime dependency policy passed ({len(python_files)} files; "
        "0 packaged PyPI dependencies; AWS SDK runtime-provided)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
