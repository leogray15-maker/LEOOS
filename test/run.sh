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
# the repo root, for the dev suite — that one loads the real ES modules
# rather than the flattened bundle
python3 -m http.server 4401 --directory . >/dev/null 2>&1 &
DEV=$!
node test/feedserver.mjs >/dev/null 2>&1 &
FEED=$!
trap 'kill $SITE $DEV $FEED 2>/dev/null || true' EXIT
sleep 1.5

case "${1:-}" in
  --contrast) node test/contrast.mjs ;;
  --clipping) node test/clipping.mjs ;;
  --dev)      node test/dev.mjs ;;
  --store)    node test/store.mjs ;;
  --vault)    node test/vault.mjs ;;
  # The store suite needs no browser and no server, so it rides along with
  # the e2e run rather than waiting to be asked for.
  *)          node test/store.mjs && echo && node test/vault.mjs && echo && node test/e2e.mjs ;;
esac
