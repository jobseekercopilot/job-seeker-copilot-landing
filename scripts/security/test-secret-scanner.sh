#!/usr/bin/env bash
set -euo pipefail

security_gitleaks="${GITLEAKS_BIN:-gitleaks}"
if [[ "${security_gitleaks}" == */* ]]; then
  [[ -x "${security_gitleaks}" ]] || { echo "Synthetic scan stopped: Gitleaks is unavailable." >&2; exit 2; }
elif ! security_gitleaks="$(command -v "${security_gitleaks}")"; then
  echo "Synthetic scan stopped: Gitleaks is not installed." >&2
  exit 2
fi

security_fixture_dir="$(mktemp -d)"
cleanup_security_fixture() {
  rm -rf -- "${security_fixture_dir}"
}
trap cleanup_security_fixture EXIT

# Assemble a deliberately fake high-entropy value outside the repository. Splitting
# both the keyword and value keeps the scanner's own test fixture out of Git history.
security_part_a='xY7pQ2mN9vR4tK8cF3hJ6sL1wB'
security_part_b='5dG0zA2eU7iO9pC4nM8qV3'
printf 'api_%s = "%s%s"\n' 'key' "${security_part_a}" "${security_part_b}" > "${security_fixture_dir}/synthetic.txt"

set +e
"${security_gitleaks}" dir "${security_fixture_dir}/synthetic.txt" \
  --redact \
  --no-banner \
  --no-color \
  --report-format=json \
  --report-path="${security_fixture_dir}/report.json"
security_status=$?
set -e

if [[ "${security_status}" -ne 1 || ! -s "${security_fixture_dir}/report.json" ]]; then
  echo "Synthetic scan failed: the scanner did not reject the controlled fixture." >&2
  exit 1
fi
echo "Synthetic secret rejection passed (one controlled finding; value redacted)."
