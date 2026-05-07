#!/usr/bin/env bash
# MB-001-01 — undefined-token leak in track-band CSS.
# FIXED (exit 0) when neither GanttFeatureTrackBand.css nor GanttTrackStageRow.css
# contains any of the leaked --fg-*/--surface-raised/--surface-overlay/--weight-*/
# --radius-sm/--transition-fast tokens.
# STILL PRESENT (exit 2) if any leak remains.

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

PATTERN='var\(--(fg-default|fg-muted|fg-subtle|surface-raised|surface-overlay|weight-semibold|weight-medium|radius-sm)\b'

FILES=(
  "src/pages/Gantt/components/GanttFeatureTrackBand/GanttFeatureTrackBand.css"
  "src/pages/Gantt/components/GanttTrackStageRow/GanttTrackStageRow.css"
)

for f in "${FILES[@]}"; do
  if [ ! -f "${WEB}/${f}" ]; then
    ambiguous "missing file ${WEB}/${f}"
  fi
  if grep -qE "${PATTERN}" "${WEB}/${f}"; then
    echo "still leaking undefined tokens in ${f}:" >&2
    grep -nE "${PATTERN}" "${WEB}/${f}" >&2
    bug_present
  fi
done

bug_fixed
