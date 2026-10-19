#!/usr/bin/env bash
# Retry installation only for transient network errors, before any DUT actions.
set -euo pipefail
results="$(cd "$(dirname "$0")" && pwd)/install-results"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
failure_dir=""
for attempt in 1 2; do
  status=0
  npm ci 2>&1 | tee "$log" || status=$?
  [ "$status" = 0 ] && exit 0
  if [ -z "$failure_dir" ]; then
    mkdir -p "$results"
    failure_dir=$(mktemp -d "$results/npm-ci-XXXXXX")
  fi
  cp "$log" "$failure_dir/attempt-$attempt.log"
  # Git dependency preparation nests npm's errors, so inspect the error code
  # in the output rather than just the outer command's exit status (e.g. 152).
  if [ "$attempt" = 2 ] || ! grep -Eq 'npm (ERR!|error) (npm (ERR!|error) )?code (ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH)([[:space:]]|$)' "$log"; then
    exit "$status"
  fi
  echo '::warning::npm ci hit a transient network error; retrying once in 5 seconds'
  sleep 5
done
