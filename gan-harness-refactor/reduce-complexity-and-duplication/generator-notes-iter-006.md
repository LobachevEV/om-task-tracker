# Generator Notes — iter 006

Track: backend
Iteration: 6
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa

## Slice taken

Plan commit #6 — single-source `ExtractDisplayName` and gateway `DateOnly.TryParseExact("yyyy-MM-dd", …)` parsing. Pure helper-extraction inside the `OneMoreTaskTracker.Api` bounded context; no controller routing, proto, openapi, schema, log, or auth surface touched.

## MUST-improve axes touched

| # | Axis | Iter-5 | Iter-6 | Target |
|---|------|--------|--------|--------|
| 6 | Distinct `ExtractDisplayName` definitions in gateway | 2 | 1 | 1 (met) |
| 7 | Distinct `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites in gateway | 2 | 1 | 1 (met) |
| 8 | `dotnet build` errors / new warnings | 0 / 0 | 0 / 0 | 0 / 0 (met) |
| 9 | `dotnet test` regressed count | 0 | 0 | 0 (met, 455/455) |

Verified at HEAD with the source-of-truth commands from `refactor-plan.md`:

- `grep -rEn 'static[[:space:]]+string[[:space:]]+ExtractDisplayName' OneMoreTaskTracker.Api --include='*.cs' | wc -l | tr -d ' '` → `1`
- `grep -rEn 'DateOnly\.TryParseExact\([^,]+,[[:space:]]*"yyyy-MM-dd"' OneMoreTaskTracker.Api --include='*.cs' | wc -l | tr -d ' '` → `1`

All seven planned axes (1–7) are now met or exceeded; axes 8/9 also met.

## Files touched (4 modified, 4 added)

Modified:
- `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` — drops local `ExtractDisplayName`; `ValidateOptionalReleaseDate` routes through `PlanRequestHelpers.TryParseIsoDate` instead of inline `DateOnly.TryParseExact`. `BuildMiniTeamMember` calls `DisplayNameHelper.ExtractDisplayName`.
- `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs` — drops local `ExtractDisplayName`; calls `DisplayNameHelper.ExtractDisplayName`.
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeaturesController.cs` — `BuildMiniTeamMember` performer-mapper now calls `DisplayNameHelper.ExtractDisplayName` instead of `PlanMapper.ExtractDisplayName`.

Added (one type per file):
- `OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs` — canonical `ExtractDisplayName(string email)` with the safer `PlanMapper`-derived semantics (null/empty-safe, empty-segment-safe).
- `OneMoreTaskTracker.Api/Properties/AssemblyInfo.cs` — `[assembly: InternalsVisibleTo("OneMoreTaskTracker.Api.Tests")]` so the new unit tests can reach `internal` helpers without touching `*.csproj` (allowed by plan §"MUST-NOT-touch").
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/DisplayNameHelperTests.cs` — 4 facts covering null/empty, dot/dash/underscore tokenisation, double-separator preservation, and single-segment local-part.
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/PlannedDateParserTests.cs` — 7 cases (3 facts + 4 theory rows) covering `TryParseIsoDate` happy/whitespace/non-ISO paths plus `ValidateOptionalReleaseDate` valid / format-error / range-error paths. Failure-message text preserved byte-for-byte (`"Date must be YYYY-MM-DD"`, `"Use a real release date"`).

## Behavior surface diff

Captured at HEAD via `capture-behavior-contract.mjs` and compared with `diff-behavior-contract.mjs`:

- `openapi_json` — no diff (REST surface byte-identical to baseline).
- `features_proto_surface` — no diff (proto surface byte-identical).
- `api_endpoint_matrix` — no diff (controller routing/auth byte-identical).
- `feature_entity_shape`, `ef_migrations_history`, `ef_schema_columns` — no diff.
- `grpc_status_code_emit_sites`, `feature_inline_edit_log_format`, `test_corpus_assertion_count` — drift-flagged but planner-pinned tolerance carry-overs from iters 1-3 (set parity / template-prefix parity / additive-only). Iter-6 introduced no new drift on these surfaces; the test-corpus count rises 442→455 (+13 additive from the two new helper test classes).

## Test counts

| Project | iter-5 | iter-6 | Δ |
|---------|--------|--------|---|
| OneMoreTaskTracker.Api.Tests | 183 | 196 | +13 |
| OneMoreTaskTracker.Features.Tests | 105 | 105 | 0 |
| OneMoreTaskTracker.Tasks.Tests | 59 | 59 | 0 |
| OneMoreTaskTracker.GitLab.Proxy.Tests | 63 | 63 | 0 |
| OneMoreTaskTracker.Users.Tests | 32 | 32 | 0 |
| Total | 442 | 455 | +13 |

All 455 pass.

## Deviation from refactor-plan.md §"Planned commits"

None. Slice executed exactly as commit #6 in the planner's sequence.

## Notes on design choices

- Canonical `ExtractDisplayName` placed at `OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs` (parent namespace) so both `Plan/` and `Team/` child namespaces resolve it without per-file `using` directives. `internal static` scoping mirrors the prior per-file definitions.
- The third caller (`FeaturesController.cs:193` was importing `PlanMapper.ExtractDisplayName` — now flows through `DisplayNameHelper`. The axis command intentionally only counts *definitions*, so removing the `PlanMapper` definition closed the axis even though three call sites exist.
- Chose to keep `ValidateOptionalReleaseDate` on `PlanMapper` (rather than moving it to `PlanRequestHelpers`) so the public-facing helper signature consumed by `FeatureStagesController` is unchanged. The internal call routes through `PlanRequestHelpers.TryParseIsoDate`, leaving the single canonical `DateOnly.TryParseExact` site at `PlanRequestHelpers.cs:19`. Failure-message text is preserved byte-for-byte; integration tests at `InlineEditEndpointsTests.cs:645,663` continue to pass.
- `AssemblyInfo.cs` added under the existing `OneMoreTaskTracker.Api/Properties/` directory; `*.csproj` untouched per MUST-NOT-touch.
