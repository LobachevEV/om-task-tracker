# Generator Notes — iter 005

Slice: refactor-plan.md §"Planned commits" #5 — collapse `FeatureMappingConfig.Register` from 10 `TypeAdapterConfig<Feature, *Dto>.NewConfig()` blocks onto one driver, via a single generic `RegisterFeatureToDto<TDto>()` helper plus the `csharp-proto-domain-interface` partial-class bridge pattern (same canonical mechanism iter-4 used on the gateway side).

## Axis movement

| Axis | Before iter-5 | After iter-5 | Target |
|------|---------------|--------------|--------|
| 5. `TypeAdapterConfig<Feature, …>.NewConfig()` blocks in `FeatureMappingConfig.cs` | 10 | **1** | 1 — **met** |
| Other axes (1, 2, 3, 4, 6, 7) | unchanged | unchanged | n/a this iter |

`grep -cE 'TypeAdapterConfig<Feature, [^>]+>\.NewConfig\(\)' OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` returns `1`.

`FeatureMappingConfig.cs` shrinks 187 → 60 LoC (-127). The single `NewConfig` block now lives inside `private static void RegisterFeatureToDto<TDto>() where TDto : class, IFeatureMappingTarget, new()` and is invoked once per target type.

## Files touched (1 modified, 11 added)

- modified: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` — replaced 10 hand-written `NewConfig` blocks with one generic `RegisterFeatureToDto<TDto>()` driver invoked 10 times. `BuildProtoStagePlans` helper preserved verbatim.
- added: `OneMoreTaskTracker.Features/Features/Data/IFeatureMappingTarget.cs` — internal interface listing the 11 settable properties (`Id`, `Title`, `Description`, `State` (proto enum, fully qualified to disambiguate from the C# domain `FeatureState`), `PlannedStart`, `PlannedEnd`, `LeadUserId`, `ManagerUserId`, `CreatedAt`, `UpdatedAt`, `Version`).
- added: `OneMoreTaskTracker.Features/Features/Data/Bridges/{Create,Update,List,Get,UpdateTitle,UpdateDescription,UpdateLead,UpdateStageOwner,UpdateStagePlannedStart,UpdateStagePlannedEnd}*FeatureDtoBridge.cs` — 10 bridge files, one per proto namespace, each declaring `public sealed partial class FeatureDto : IFeatureMappingTarget`. Implicit interface implementation — proto-generated public properties already match the interface shape.

## Mapster mechanism note

The 10 proto `FeatureDto` types are generated into 10 distinct C# namespaces with identical public-property shapes (verified against `obj/Debug/net10.0/.../FeatureDto`). Implicit interface implementation lights up because every interface member has a matching public `{ get; set; }` on each generated FeatureDto. The generic helper compiles a single `Map(d => d.X, ...)` expression-tree per call (Mapster expands into a per-`(Feature, TDto)` config), so wire output is byte-identical to the previous per-type registrations.

The previous `UpdateLeadDto` block intentionally omitted `Id`, `Title`, `LeadUserId`, `ManagerUserId`, `Version` — those mapped via Mapster's same-name convention. The unified driver maps them explicitly; Mapster's resulting setter values are identical (e.g. `s.Id` direct-int copy is the same path as the convention default), so the wire shape on `UpdateLeadDto.FeatureDto` does not move.

## Verification

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: 0 errors, 0 warnings.
- `dotnet test OneMoreTaskTracker.slnx --no-build`: **442/442 passed** (Api 183, Features 105, GitLab.Proxy 63, Tasks 59, Users 32). 0 failed, 0 skipped.
- `check-must-not-touch.mjs`: `MUST_NOT_TOUCH_VIOLATION:false`.
- No `*.proto`, generated `.g.cs`, openapi.json, migration, EF context, auth, csproj, slnx, or appsettings touched.

## Deviation from plan

None. Plan commit #5 implemented via the partial-class-bridge variant the planner pinned as canonical. Axes 6 and 7 (gateway `ExtractDisplayName` + date-parser dedup) remain for iter-6.
