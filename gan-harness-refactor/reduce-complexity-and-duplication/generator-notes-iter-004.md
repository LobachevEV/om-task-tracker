# Generator Notes — iter 004

Slice: refactor-plan.md §"Planned commits" #4 — collapse `PlanMapper.MapSummary` overloads onto a single generic projection via `partial class FeatureDto : IFeatureSummaryProjection` per the `csharp-proto-domain-interface` skill.

## Axis movement

| Axis | Before iter-4 | After iter-4 | Target |
|------|---------------|--------------|--------|
| 4. `MapSummary` overload count in `PlanMapper.cs` | 10 | **1** | 1 — **met** |
| Other axes (1, 2, 3, 5, 6, 7) | unchanged | unchanged | n/a this iter |

`grep -cE 'internal static FeatureSummaryResponse MapSummary\(' OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` returns `1`.

`PlanMapper.cs` shrinks 226 → 137 LoC (-89).

## Files touched (1 modified, 11 added)

- modified: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` — removed 10 per-DTO `MapSummary` overloads + the private `BuildSummary` helper; replaced by one `MapSummary(IFeatureSummaryProjection f, ...)`. Dropped the now-unused `using` aliases (`CreateFeatureDto`, `UpdateFeatureDto`, etc.).
- added: `OneMoreTaskTracker.Api/Controllers/Plan/IFeatureSummaryProjection.cs` — common projection interface with the 10 fields the mapper needs (`Id`, `Title`, `Description`, `State`, `PlannedStart`, `PlannedEnd`, `LeadUserId`, `ManagerUserId`, `StagePlans`, `Version`).
- added: `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/{Create,Update,UpdateTitle,UpdateDescription,UpdateLead,List,Get,UpdateStageOwner,UpdateStagePlannedStart,UpdateStagePlannedEnd}*FeatureDtoBridge.cs` — 10 bridge files, one per proto namespace, each declaring `public sealed partial class FeatureDto : IFeatureSummaryProjection` with explicit-interface `StagePlans` (RepeatedField → IEnumerable bridge).

## Boy-Scout / clean-up

- Removed 6 `using ... = OneMoreTaskTracker.Proto.Features.<Namespace>.FeatureDto` aliases from `PlanMapper.cs` (they were only consumed by the deleted overloads).
- The leftover `MapState`, `ParseState`, `TryParseStage`, `ValidateOptionalReleaseDate`, `BuildMiniTeamMember`, `BuildStagePlan`, `ExtractDisplayName` are intentionally untouched — those are iter-5/6 targets per the plan.

## Verification

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: 0 errors, 16 warnings (all pre-existing CS4014/CS0162/CS8604 in test files; identical to iter-3 baseline).
- `dotnet test OneMoreTaskTracker.slnx --no-build`: **442/442 passed** (Api 183, Features 105, GitLab.Proxy 63, Tasks 59, Users 32). 0 failed, 0 skipped.
- `check-must-not-touch.mjs`: `MUST_NOT_TOUCH_VIOLATION:false`.
- `diff-behavior-contract.mjs`: identical drift profile to iter-3 — `openapi_json`, `features_proto_surface`, `ef_*`, `feature_entity_shape`, `api_endpoint_matrix` all `no diff`. `grpc_status_code_emit_sites` 33→15 lines, `feature_inline_edit_log_format` 7→7 / 1216→1216 bytes, `test_corpus_assertion_count` 2→2 — all within planner-pinned tolerance carried over from iter-3 (no movement this iter; the gateway-mapper consolidation does not touch any captured surface).

## Deviation from plan

None. Plan commit #4 implemented as specified. Plan commits #5 (Mapster `NewConfig` collapse), #6 (`ExtractDisplayName` + date-parser dedup), and optional #4 (RF-003-04 stretch on `FeatureConcurrencySaver`) remain for iter-5+.
