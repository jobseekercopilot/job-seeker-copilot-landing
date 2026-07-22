#!/usr/bin/env bash
set -euo pipefail

security_repo_root="${SECURITY_REPO_ROOT:-}"
if [[ -z "${security_repo_root}" ]]; then
  if ! security_repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    echo "Secret scan stopped: Git history could not be discovered." >&2
    exit 2
  fi
fi

if ! git -C "${security_repo_root}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Secret scan stopped: the configured path is not a Git worktree." >&2
  exit 2
fi
if [[ "$(git -C "${security_repo_root}" rev-parse --is-shallow-repository)" != "false" ]]; then
  echo "Secret scan stopped: a shallow checkout cannot prove full-history coverage." >&2
  exit 2
fi

security_commit_count="$(git -C "${security_repo_root}" rev-list --all --count)"
security_ref_count="$(git -C "${security_repo_root}" for-each-ref --format='%(refname)' refs/heads refs/remotes refs/tags | wc -l)"
if [[ "${security_commit_count}" -lt 1 || "${security_ref_count}" -lt 1 ]]; then
  echo "Secret scan stopped: no reachable commit/ref history was found." >&2
  exit 2
fi

security_gitleaks="${GITLEAKS_BIN:-gitleaks}"
if [[ "${security_gitleaks}" == */* ]]; then
  if [[ ! -x "${security_gitleaks}" ]]; then
    echo "Secret scan stopped: the configured Gitleaks binary is unavailable." >&2
    exit 2
  fi
elif ! security_gitleaks="$(command -v "${security_gitleaks}")"; then
  echo "Secret scan stopped: Gitleaks is not installed." >&2
  exit 2
fi

security_report="${GITLEAKS_REPORT_PATH:-}"
security_temporary_report=""
if [[ -z "${security_report}" ]]; then
  security_temporary_report="$(mktemp)"
  security_report="${security_temporary_report}"
fi
cleanup_security_report() {
  if [[ -n "${security_temporary_report}" ]]; then
    rm -f -- "${security_temporary_report}"
  fi
}
trap cleanup_security_report EXIT

"${security_gitleaks}" git "${security_repo_root}" \
  --log-opts="--all" \
  --redact \
  --no-banner \
  --no-color \
  --report-format=json \
  --report-path="${security_report}"

echo "Full-history secret scan passed (${security_commit_count} reachable commits, ${security_ref_count} refs)."
