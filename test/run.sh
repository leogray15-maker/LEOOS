#!/usr/bin/env bash
# The whole end-to-end suite: build, serve, run, tear down.
#
#   npm test
#
# Needs playwright available (npx playwright install is NOT required in
# the dev container — Chromium is already at /opt/pw-browsers/chromium).
set -euo pipefail
cd "$(dirname "$0")/.."

node build.js

python3 -m http.server 4400 --directory public >/dev/null 2>&1 &
SITE=$!
node test/feedserver.mjs >/dev/null 2>&1 &
FEED=$!
trap 'kill $SITE $FEED 2>/dev/null || true' EXIT
sleep 1.5

node test/e2e.mjs
