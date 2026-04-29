# Behavior Contract

Track: fullstack
Label: iter-006
Captured-at: 2026-04-28T21:32:35.630Z
Frozen: true
Machine companion: ./behavior-contract.json

Authoritative discovery rules: `GAN-FEATURE-SHARED.md` §"Behavior contract discovery (canonical)".

## Captured surfaces

| id | kind | tolerance | capture command |
|----|------|-----------|-----------------|
| openapi | json | exact | `cat OneMoreTaskTracker.Api/openapi.json` |
| proto_features | text | exact | `cd OneMoreTaskTracker.Features/Protos && for f in $(find . -name '*.proto' -type f | LC_ALL=C sort); do printf '=== %s ===\n' "$f"; cat "$f"; printf '\n'; done` |
| db_migrations_features | text | exact | `ls OneMoreTaskTracker.Features/Migrations | LC_ALL=C sort | grep -E '^[0-9]+_.+\.cs$' | grep -v Designer` |
| endpoint_matrix_plan_features | text | exact | `grep -REn '^\s*\[(HttpPatch|HttpGet|HttpPost|HttpDelete|Authorize|Route)\(' OneMoreTaskTracker.Api/Controllers/Plan/Feature OneMoreTaskTracker.Api/Controllers/Plan/PlanController.cs | LC_ALL=C sort` |
| feature_summary_response_shape | text | exact | `cat OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeatureSummaryResponse.cs OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeatureDetailResponse.cs OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/StagePlanResponse.cs OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/StagePlanDetailResponse.cs` |
| planapi_exports | text | exact | `grep -E '^export (async function|type|const|interface) ' OneMoreTaskTracker.WebClient/src/common/api/planApi.ts | LC_ALL=C sort` |
| planapi_schemas | text | exact | `grep -E '^export const \w+Schema\b' OneMoreTaskTracker.WebClient/src/common/api/schemas.ts | LC_ALL=C sort` |
| inline_editor_component_api | text | exact | `grep -RE '^(export (default |type |interface |const |function )|export \{)' OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/ | LC_ALL=C sort` |
