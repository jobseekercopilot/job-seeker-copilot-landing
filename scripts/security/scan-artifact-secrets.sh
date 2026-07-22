#!/usr/bin/env bash
set -euo pipefail

security_artifact_root="${1:-dist/job-seeker-copilot-landing/browser}"
if [[ ! -d "${security_artifact_root}" ]]; then
  echo "Artifact secret scan stopped: production build is missing." >&2
  exit 2
fi

security_gitleaks="${GITLEAKS_BIN:-gitleaks}"
if [[ "${security_gitleaks}" == */* ]]; then
  [[ -x "${security_gitleaks}" ]] || { echo "Artifact secret scan stopped: Gitleaks is unavailable." >&2; exit 2; }
elif ! security_gitleaks="$(command -v "${security_gitleaks}")"; then
  echo "Artifact secret scan stopped: Gitleaks is not installed." >&2
  exit 2
fi

security_report="$(mktemp)"
cleanup_artifact_secret_report() {
  rm -f -- "${security_report}"
}
trap cleanup_artifact_secret_report EXIT

"${security_gitleaks}" dir "${security_artifact_root}" \
  --redact \
  --no-banner \
  --no-color \
  --report-format=json \
  --report-path="${security_report}"
echo "Production artifact secret scan passed (no candidate values found)."
