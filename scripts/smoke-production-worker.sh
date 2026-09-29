#!/usr/bin/env bash
set -euo pipefail

base_url="${1:?usage: smoke-production-worker.sh <base-url>}"
base_url="${base_url%/}"

bash scripts/smoke-workers.sh "$base_url"

auth_body="${RUNNER_TEMP:-/tmp}/vico-auth-session.json"
auth_headers="${RUNNER_TEMP:-/tmp}/vico-auth-session.headers"
auth_status="$(
  curl --silent --show-error \
    --dump-header "$auth_headers" \
    --output "$auth_body" \
    --write-out '%{http_code}' \
    "$base_url/api/auth/get-session"
)"
test "$auth_status" = "200"
grep -Eqi '^content-type:[[:space:]]*(application/json|text/plain)' "$auth_headers"
