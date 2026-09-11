#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://127.0.0.1:4173}"
preview_log="${PREVIEW_LOG:-/tmp/vico-preview.log}"

ready=false
for _ in {1..30}; do
  if curl --silent --show-error --fail "$base_url/he/" > /tmp/vico-he.html; then
    ready=true
    break
  fi
  sleep 1
done

if [ "$ready" != true ]; then
  test ! -f "$preview_log" || cat "$preview_log"
  exit 1
fi

test "$(curl --silent --show-error --output /tmp/vico-he.html --write-out '%{http_code}' "$base_url/he/")" = "200"
grep -q 'lang="he"' /tmp/vico-he.html
grep -q 'dir="rtl"' /tmp/vico-he.html
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$base_url/ru/")" = "200"
test "$(curl --silent --show-error --output /tmp/vico-iw.html --write-out '%{http_code}' "$base_url/iw/")" = "308"
grep -qi '^location: /he/' < <(curl --silent --show-error --dump-header - --output /dev/null "$base_url/iw/")
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$base_url/ka/")" = "307"
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$base_url/unknown/")" = "307"
test "$(curl --silent --show-error --request POST --output /dev/null --write-out '%{http_code}' "$base_url/IW/")" = "404"
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$base_url/he/topic")" = "404"
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$base_url/api/test")" = "404"
