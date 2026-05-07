# Generator Notes — Iteration 1 / BE-005-01

## Targeted issue
BE-005-01 — JSON null clear semantics on PATCH owner endpoints  
Strategy: user-chosen / opt-1 (Tristate<int> + custom JsonConverter)

## Files touched (5 total)

**New files (2):**
- `OneMoreTaskTracker.Api/Controllers/Plan/Tristate.cs` — sealed generic record `Tristate<T> where T : struct` with `IsPresent` and `Value` fields
- `OneMoreTaskTracker.Api/Controllers/Plan/TristateIntJsonConverter.cs` — `JsonConverter<Tristate<int>>` with `HandleNull = true` so STJ invokes Read even when the JSON token is `null`

**Modified files (3):**
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackStagePayload.cs` — `StageOwnerUserId` changed from `JsonElement?` to `[JsonConverter(TristateIntJsonConverter)] Tristate<int>?`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackPayload.cs` — `TrackOwnerUserId` changed from `JsonElement?` to `[JsonConverter(TristateIntJsonConverter)] Tristate<int>?`
- `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs` — `DecodeOwnerField` signature updated from `JsonElement?` to `Tristate<int>?`; `using System.Text.Json` removed (no longer needed)

## Key design decisions

`HandleNull = true` on the converter is critical: without it, STJ short-circuits nullable Tristate<int>? to `null` before invoking Read, making JSON null indistinguishable from absent. With HandleNull enabled, Read is called for every JSON token including Null, and the converter returns `new Tristate<int>(IsPresent: true, Value: null)` for JSON null.

Absent field → property stays `null` → `DecodeOwnerField(null)` → `(false, 0)` — no proto field set.  
JSON null → `Tristate<int>(true, null)` → `DecodeOwnerField` → `(true, -1)` — proto sentinel -1 clears the owner.  
JSON integer n → `Tristate<int>(true, n)` → `DecodeOwnerField` → `(true, n)` — assigns user n.

## Closure check result

Reproduction snippet `evidence/snippets/BE-005-01.sh` — exit 0 (fixed). The snippet assigns explicit owner, then sends `{"stageOwnerUserId":null}` and asserts the stage owner is null and stageVersion bumped. Both conditions met after rebuild.

## Build / test gate

`dotnet build` — 0 errors, 0 warnings (solution-wide)  
`dotnet test` — 562 passed, 0 failed (all five test projects)

## MUST-NOT-touch boundary

All edits are in `OneMoreTaskTracker.Api/Controllers/Plan/` — within scope. No MUST-NOT-touch paths modified.

## api-contract.md

Not modified. Tristate is an internal binding implementation detail; the public JSON contract (null = clear) matches the frozen api-contract.md lines 108/119.
