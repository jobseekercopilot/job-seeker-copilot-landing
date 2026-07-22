#!/usr/bin/env bash
set -euo pipefail

security_repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Artifact scan stopped: repository paths could not be discovered." >&2
  exit 2
}
security_manifest="$(mktemp)"
cleanup_artifact_manifest() {
  rm -f -- "${security_manifest}"
}
trap cleanup_artifact_manifest EXIT

git -C "${security_repo_root}" ls-files -z > "${security_manifest}"
if [[ ! -s "${security_manifest}" ]]; then
  echo "Artifact scan stopped: tracked source inventory is empty." >&2
  exit 2
fi

TRACKED_FILES_MANIFEST="${security_manifest}" node \
  "${security_repo_root}/scripts/security/artifact-policy.mjs" "${1:-}"
