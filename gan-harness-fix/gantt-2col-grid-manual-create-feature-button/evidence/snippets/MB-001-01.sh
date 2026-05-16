#!/usr/bin/env bash
# Self-validating reproduction snippet for MB-001-01.
#
# Contract:
#   exit 0 → bug FIXED (create-feature trigger is on-screen at viewport 1440x900 on initial /plan load).
#   exit 2 → bug STILL PRESENT (trigger missing or rect.x < 0).
#   any other exit → ambiguous; evaluator flags.
#
# Requires the dev stack to be running:
#   - Vite at http://localhost:5173
#   - Gateway API at http://localhost:5000
#   - Seeded manager: manager@example.com / Password123!
#
# Mechanism: runs the permanent Playwright spec at
# e2e/specs/_harness/MB-001-01.spec.ts which lives under playwright.config.ts
# testDir: './e2e' and is therefore discoverable by Playwright.

set -uo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/Users/e.lobacev/Repos/OneMoreTaskTracker}"
WEBCLIENT_DIR="${PROJECT_ROOT}/OneMoreTaskTracker.WebClient"
VITE_URL="${VITE_URL:-http://localhost:5173}"
SPEC_PATH="${WEBCLIENT_DIR}/e2e/specs/_harness/MB-001-01.spec.ts"

if ! command -v npx >/dev/null 2>&1; then
  echo "MB-001-01 snippet: npx not on PATH — cannot run Playwright" >&2
  exit 3
fi

if ! curl -fsS -o /dev/null -w '%{http_code}' "${VITE_URL}/" | grep -q '^200$'; then
  echo "MB-001-01 snippet: Vite not reachable at ${VITE_URL} — start dev stack first" >&2
  exit 3
fi

if [[ ! -f "${SPEC_PATH}" ]]; then
  echo "MB-001-01 snippet: permanent spec not found at ${SPEC_PATH}" >&2
  exit 3
fi

cd "${WEBCLIENT_DIR}" || { echo "MB-001-01 snippet: cannot cd into ${WEBCLIENT_DIR}" >&2; exit 3; }

LOG=$(mktemp)
trap 'rm -f "${LOG}"' EXIT

E2E_EXTERNAL_SERVER=1 VITE_URL="${VITE_URL}" npx playwright test \
  --config=playwright.config.ts \
  --project=chromium \
  --reporter=line \
  "e2e/specs/_harness/MB-001-01.spec.ts" \
  > "${LOG}" 2>&1
RESULT=$?

if [[ ${RESULT} -eq 0 ]]; then
  echo "MB-001-01: trigger on-screen — bug FIXED"
  exit 0
fi

if grep -qE 'off-screen|toBeGreaterThanOrEqual|no bounding box|toHaveCount|validation error' "${LOG}"; then
  echo "MB-001-01: trigger off-screen or missing — bug STILL PRESENT"
  cat "${LOG}" >&2
  exit 2
fi

echo "MB-001-01: Playwright exited ${RESULT} for non-assertion reason — ambiguous" >&2
cat "${LOG}" >&2
exit 3
