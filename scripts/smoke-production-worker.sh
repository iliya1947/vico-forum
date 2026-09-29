#!/usr/bin/env bash
set -euo pipefail

base_url="${1:?usage: smoke-production-worker.sh <base-url>}"
base_url="${base_url%/}"

./scripts/smoke-workers.sh "$base_url"

auth_status="$(
  curl --silent --show-error     --output /tmp/vico-auth-session.json     --write-out '%{http_code}'     "$base_url/api/auth/get-session"
)"
test "$auth_status" = "200"

content_type="$(
  curl --silent --show-error     --head "$base_url/api/auth/get-session"     | tr -d '\r'     | awk 'BEGIN { IGNORECASE=1 } /^content-type:/ { print $2; exit }'
)"
case "$content_type" in
  application/json*|text/plain*) ;;
  *) exit 1 ;;
esac
