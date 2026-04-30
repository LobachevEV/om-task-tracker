# Refactor Feedback — reduce-complexity-and-duplication — iter 006

Iteration: 6
Generator commit: c040078
Behavior drift: false
Weighted total: 9.40

Single feedback file per iteration (refactoring is single-track by design — there is no separate UX / FE / BE / contract track).

## Behavior preservation gate

Status: **PASS**.

Re-captured contract at HEAD `c040078` via `capture-behavior-contract.mjs --config behavior-capture.json --label iter-6` and diffed via `diff-behavior-contract.mjs`. The diff script flags `BEHAVIOR_DRIFT: true` because three surfaces' raw bytes differ, but every drifted surface is one of the three planner-pinned tolerances from `refactor-plan.md` §"Behavior preservation envelope". The five contract-bearing surfaces that matter are byte-identical to baseline.

Diff script `evidence` map (verbatim):

```json
{
  "openapi_json": "no diff",
  "features_proto_surface": "no diff",
  "ef_migrations_history": "no diff",
  "ef_schema_columns": "no diff",
  "feature_entity_shape": "no diff",
  "api_endpoint_matrix": "no diff",
  "grpc_status_code_emit_sites": "text differs (33→15 lines, 3027→1269 bytes)",
  "feature_inline_edit_log_format": "text differs (7→7 lines, 1216→1216 bytes)",
  "test_corpus_assertion_count": "text differs (2→2 lines, 4→4 bytes)"
}
```

Tolerance verification (each drift mapped to its planner pin):

| Surface | Diff bytes | Tolerance pin (refactor-plan.md) | Verified |
|---------|-----------|-----------------------------------|----------|
| `openapi_json` | 0 | exact byte parity | byte-identical |
| `features_proto_surface` | 0 | exact byte parity | byte-identical |
| `ef_migrations_history` | 0 | exact byte parity (no schema change) | byte-identical |
| `ef_schema_columns` | 0 | exact byte parity | byte-identical |
| `feature_entity_shape` | 0 | exact byte parity on public-property shape | byte-identical |
| `api_endpoint_matrix` | 0 | exact byte parity (routes/verbs/`[Authorize]`) | byte-identical |
| `grpc_status_code_emit_sites` | 1758 | set parity on distinct status codes; per-file column may shift WITHIN `Features/Features` | **set parity confirmed**: `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}` at both baseline and HEAD; all moved file rows live under `OneMoreTaskTracker.Features/Features/Update/` (the three deleted leaf handler rows replaced by `FeatureConcurrencySaver.cs`, `FeatureLoader.cs`, `FeatureOwnershipGuard.cs`, `FeatureVersionGuard.cs`, `StageEditContextLoader.cs`) |
| `feature_inline_edit_log_format` | 0 (line-count parity, byte-count parity, identical 12-field set) | template-prefix parity + structured-field-name parity even if line ordering shifts | **field parity confirmed**: identical `{ActorUserId, After, Before, DescriptionLength, FeatureId, New, Old, SV0, SV1, Stage, V0, V1}` set at both ends; only the leading `<line>:` prefix differs because line numbers shifted |
| `test_corpus_assertion_count` | 4 (831 → 905, +74) | additive-only; count MAY rise but MUST NOT fall | **additive-only confirmed**: +74, no deletion |

No offending files. The seven `MUST-NOT-touch` boundaries (proto, openapi.json, migrations, FeaturesDbContext entity-config, JwtTokenService/JwtOptions/`AddJwtBearer` block, GrpcExceptionMiddleware, WebClient, csproj/slnx/appsettings/Dockerfile/compose, status-code-asserting tests) are untouched — verified by inspecting `git diff --name-only 935dc9a..c040078`: 55 files touched, all under `OneMoreTaskTracker.Api/`, `OneMoreTaskTracker.Features/`, `tests/`, or `gan-harness-refactor/`; zero matches against the MUST-NOT-touch list.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 9.7 | All 7 MUST-improve axes met or exceeded at HEAD; iter-6 closes the last two (axes 6 and 7) cleanly. Cumulative LoC reduction on the seven inline-edit handlers is 36.5% (493 → 313, target ≤ 320). Centralizes one canonical `ExtractDisplayName` (`OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs`) and one canonical `DateOnly.TryParseExact("yyyy-MM-dd", …)` site (`PlanRequestHelpers.cs:19`). Every other previously-improved axis sustained at its iter-5 value (no regression). |
| integration_and_conventions | 9.7 | Lint-clean: `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` returns 0 errors, 16 warnings — every warning is a pre-existing CS4014/CS8604/CS0162 in test files (identical warning set to baseline). No new TODO/FIXME. New helper `DisplayNameHelper.ExtractDisplayName` is `internal static` — same access tier as the deleted duplicates (`PlanMapper.ExtractDisplayName`, `TeamController.ExtractDisplayName`); single call site per consumer through `using static`-free explicit `DisplayNameHelper.ExtractDisplayName(...)` invocation. `PlanMapper.ValidateOptionalReleaseDate` retained at its public surface (consumed by `FeatureStagesController.cs:75,107`) but its body now routes through `PlanRequestHelpers.TryParseIsoDate` — no caller signature changes, no contract-bearing wire shift. The new `OneMoreTaskTracker.Api/Properties/AssemblyInfo.cs` adds `[assembly: InternalsVisibleTo("OneMoreTaskTracker.Api.Tests")]` so internal helpers are unit-testable; this is the canonical .NET mechanism and explicitly allowed by the plan's MUST-NOT-touch list ("Generator MAY add a new file under an existing csproj's compile globs without editing the csproj"). |
| test_coverage_delta | 9.5 | Test corpus 442 → 455 (+13 net) for iter-6, all green. Two new test classes (`DisplayNameHelperTests.cs` 4 facts; `PlannedDateParserTests.cs` 7 cases — 3 facts + 4 theory rows) cover the canonical helpers' happy paths, whitespace edges, format errors, and range errors with byte-identical failure-message assertions ("Date must be YYYY-MM-DD", "Use a real release date"). Cumulative test growth across the refactor: 367 → 455 = +88 tests (+24%). Test corpus assertion count 831 → 905 (+74), strictly additive. LCOV is not configured for this project; coverage delta is therefore proxied by (a) the strictly-additive assertion count, (b) the green-suite invariant on the touched files, and (c) the new test classes covering both newly canonical helpers end-to-end. No previously-green test went red. |
| perf_envelope | 9.0 | Pure helper extraction inside the `OneMoreTaskTracker.Api` bounded context. Zero new DB calls, zero new gRPC calls, zero new allocations on the hot path. `DisplayNameHelper.ExtractDisplayName` body is byte-equivalent to the prior `PlanMapper.ExtractDisplayName` (the safer of the two duplicates per generator notes — null/empty-safe, empty-segment-safe; the deleted `TeamController` duplicate had a less-safe body). `ValidateOptionalReleaseDate` now does one extra hop through `TryParseIsoDate` instead of inlined `DateOnly.TryParseExact` — net cost is one stack frame, dwarfed by the JIT inliner. Test wall-clock duration (Api.Tests 772 ms; Features.Tests 449 ms; Tasks.Tests 408 ms; Users.Tests 2 s; GitLab.Proxy.Tests 92 ms) is in line with prior iterations — no perceptible slowdown. |

**Weighted total**: 0.45 × 9.7 + 0.20 × 9.7 + 0.20 × 9.5 + 0.15 × 9.0 = 4.365 + 1.940 + 1.900 + 1.350 = **9.555**.

(Reported on the verdict header as `WEIGHTED_TOTAL: 9.555`. Pass threshold 7.0.)

## Per-axis movement (from `refactor-plan.md`)

Verified at HEAD `c040078` via the source-of-truth commands embedded in `refactor-plan.md`:

| # | Axis | Baseline | iter-5 | iter-6 | Target | Verdict |
|---|------|----------|--------|--------|--------|---------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 313 | **313** | ≤ 320 | met (carried) |
| 2 | Manager-ownership guard literal copies | 7 | 0 | **0** | 1 | exceeded (carried) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks under `Features/Features/Update/*.cs` | 6 | 2 | **2** | ≤ 2 | met (carried; both in `FeatureConcurrencySaver.cs:18, 34`) |
| 4 | `MapSummary` overload count | 10 | 1 | **1** | 1 | met (carried) |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 1 | **1** | 1 | met (carried) |
| 6 | `ExtractDisplayName` definitions (gateway) | 2 | 2 | **1** | 1 | **met this iteration** (`OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs:5`) |
| 7 | `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 2 | **1** | 1 | **met this iteration** (`OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs:19`) |
| 8 | `dotnet build` warnings/errors (refactor delta) | 0/0 | 0/0 | **0/0** | 0/0 | met (16 pre-existing test-only warnings unchanged from baseline) |
| 9 | `dotnet test` regressed count | 0 | 0 | **0** | 0 | met (455/455 green) |

No axis regressed. Iter-6 closes axes 6 and 7 — the planned focus per `refactor-plan.md` §"Planned commits" #6 — and sustains every prior axis at its iter-5 value. **All 7 MUST-improve axes (plus the two sentinel axes 8/9) are now met or exceeded at HEAD.** The refactor's "Goals" section is fully satisfied:

- ✅ Collapse seven near-identical `Update*Handler` classes onto shared scaffolding (axes 1–3).
- ✅ Eliminate per-FeatureDto-target duplication in `PlanMapper` and `FeatureMappingConfig` (axes 4–5).
- ✅ Single-source `ExtractDisplayName` and the gateway's two `yyyy-MM-dd` date parsers (axes 6–7).

## Issues

### RF-006-01 — Axes 6 and 7 met cleanly via the planner-pinned mechanism (positive finding)

- target_file: `OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeaturesController.cs`
- change: Hoist `ExtractDisplayName` to `OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs` (parent namespace; no per-file `using` needed since `Plan/` and `Team/` resolve through the namespace tree). Three call sites — `PlanMapper.cs:93`, `FeaturesController.cs:193`, `TeamController.cs:66` — explicitly route through `DisplayNameHelper.ExtractDisplayName`. The axis command counts only *definitions* (`grep -rEn 'static[[:space:]]+string[[:space:]]+ExtractDisplayName'`), so removing the duplicates closes axis 6 with three coexisting call sites.
- ref: `refactor-plan.md` §"Goals" bullet 3, §"Planned commits" #6
- status: new

### RF-006-02 — `ValidateOptionalReleaseDate` retained on `PlanMapper` for caller-signature stability (positive finding)

- target_file: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs`
- change: The generator chose to keep `PlanMapper.ValidateOptionalReleaseDate` at its existing public surface (consumed by `FeatureStagesController.cs:75,107`) and route its body through `PlanRequestHelpers.TryParseIsoDate` instead of moving the entire method. This preserves the caller signature without churn while still single-sourcing the only `DateOnly.TryParseExact("yyyy-MM-dd", …)` invocation in the gateway. Failure-message text is preserved byte-for-byte ("Date must be YYYY-MM-DD", "Use a real release date") — verified by the new `PlannedDateParserTests` and the existing `InlineEditEndpointsTests.cs:645,663` integration tests (still green).
- ref: `refactor-plan.md` §"Scope boundary" bullet 3 ("Collapse `PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate` onto one helper that both date-validation paths consume"), Boy Scout Rule
- status: new

### RF-006-03 — `InternalsVisibleTo` added without touching `*.csproj` (positive finding)

- target_file: `OneMoreTaskTracker.Api/Properties/AssemblyInfo.cs`
- change: New 1-line file `[assembly: InternalsVisibleTo("OneMoreTaskTracker.Api.Tests")]` so the new unit tests in `tests/OneMoreTaskTracker.Api.Tests/Controllers/DisplayNameHelperTests.cs` and `PlannedDateParserTests.cs` can reach the `internal` helpers. This is the canonical .NET mechanism for the use-case and is explicitly allowed by `refactor-plan.md` §"MUST-NOT-touch" ("Generator MAY add a new file under an existing csproj's compile globs without editing the csproj"). The `*.csproj` is unchanged.
- ref: `refactor-plan.md` §"MUST-NOT-touch" carve-out
- status: new

### RF-006-04 — MUST-NOT-touch list cleanly respected

- target_file: (none)
- change: Verified via `git diff --name-only 935dc9a..c040078` — 55 files touched, zero matches against the MUST-NOT-touch list. No proto, no openapi.json, no migration, no `FeaturesDbContext` edit, no `JwtTokenService`/`JwtOptions`/`AddJwtBearer` edit, no `GrpcExceptionMiddleware` edit, no WebClient edit, no csproj/slnx/appsettings/Dockerfile/compose edit, no status-code-asserting test edit, no log-message-text edit beyond the planner-pinned tolerance.
- ref: `refactor-plan.md` §"MUST-NOT-touch"
- status: new

### RF-006-05 — One-type-per-file and no-comment rules respected on new files

- target_file: `OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs`, `OneMoreTaskTracker.Api/Properties/AssemblyInfo.cs`, `tests/OneMoreTaskTracker.Api.Tests/Controllers/DisplayNameHelperTests.cs`, `tests/OneMoreTaskTracker.Api.Tests/Controllers/PlannedDateParserTests.cs`
- change: All four new files declare exactly one type (or one assembly attribute for `AssemblyInfo.cs`). Zero `//` comments in any of the four. The two pre-existing comments in `PlanMapper.cs` (lines 45, 63–64) predate the refactor — confirmed by `git show 935dc9a:OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs | grep //`. Project memory rules `feedback_one_type_per_file` and `feedback_minimize_comments` are honored.
- ref: project memory rules `feedback_one_type_per_file`, `feedback_minimize_comments`
- status: new

### RF-006-06 — All 7 MUST-improve axes now closed; refactor goals fully met

- target_file: (refactor closure)
- change: All axes 1–9 met or exceeded at HEAD `c040078`. The refactor's three Goals (handler scaffolding, FeatureDto fan-out collapse, gateway helper single-sourcing) are fully satisfied. Cumulative reduction: handler LoC 493 → 313 (-36.5%), guard literals 7 → 0, concurrency catches 6 → 2, MapSummary overloads 10 → 1, NewConfig blocks 10 → 1, ExtractDisplayName defs 2 → 1, DateOnly TryParseExact sites 2 → 1. Test corpus 367 → 455 (+88 / +24%). All 455 tests green.
- ref: `refactor-plan.md` §"Goals", §"Target axes (MUST-improve)"
- status: new

### RF-006-07 — No cleanup leftover detected for an OPTIONAL iter-7

- target_file: (audit pass)
- change: Manually scanned for dead helpers, stale aliases, comments referencing removed code, and now-unloaded partial-class bridges. None found:
  - `grep -rn ExtractDisplayName OneMoreTaskTracker.Api --include='*.cs'` shows exactly 1 definition + 3 call sites — all three call sites use the new canonical name.
  - `grep -rn "DateOnly.TryParseExact" OneMoreTaskTracker.Api --include='*.cs'` shows exactly 1 site with the canonical format.
  - No `[Obsolete]`, no `// TODO`, no `// FIXME`, no `// HACK` introduced by the refactor (only one pre-existing TODO in `Program.cs:135` for a future rate-limiting concern, untouched by the refactor).
  - All 10 partial-class bridge files in `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/` and `OneMoreTaskTracker.Features/Features/Data/Bridges/` are load-bearing — each is referenced as `IFeatureSummaryProjection` or `IFeatureMappingTarget` consumer.
  - The 6 new scaffolding files in `OneMoreTaskTracker.Features/Features/Update/` (`FeatureConcurrencySaver`, `FeatureLoader`, `FeatureOwnershipGuard`, `FeatureVersionGuard`, `StageEditContext`, `StageEditContextLoader`) are load-bearing — each handler invokes them.
- ref: planner's iter-7 scope ("cleanup, dead-helper removal, comment passes")
- status: new

## next_actions

```json
[
  { "id": "RF-006-01",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs",
    "change": "Positive finding: axes 6 and 7 closed cleanly via the planner-pinned mechanism; no further action required.",
    "ref": "refactor-plan.md §Planned commits #6",
    "status": "new" },
  { "id": "RF-006-02",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs",
    "change": "Positive finding: ValidateOptionalReleaseDate retained on PlanMapper but body delegates to PlanRequestHelpers.TryParseIsoDate; failure-message text preserved byte-for-byte.",
    "ref": "refactor-plan.md §Scope boundary bullet 3",
    "status": "new" },
  { "id": "RF-006-03",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Properties/AssemblyInfo.cs",
    "change": "Positive finding: InternalsVisibleTo declared via new file without touching csproj; planner-permitted carve-out used canonically.",
    "ref": "refactor-plan.md §MUST-NOT-touch carve-out",
    "status": "new" },
  { "id": "RF-006-04",
    "severity": "minor",
    "target_file": "(none)",
    "change": "Positive finding: 55 touched files, zero matches against the MUST-NOT-touch list.",
    "ref": "refactor-plan.md §MUST-NOT-touch",
    "status": "new" },
  { "id": "RF-006-05",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs",
    "change": "Positive finding: one-type-per-file and no-comment project rules respected on all 4 new files.",
    "ref": "project memory feedback_one_type_per_file, feedback_minimize_comments",
    "status": "new" },
  { "id": "RF-006-06",
    "severity": "minor",
    "target_file": "(refactor closure)",
    "change": "Positive finding: all 7 MUST-improve axes met; refactor goals fully satisfied at HEAD c040078.",
    "ref": "refactor-plan.md §Goals + §Target axes",
    "status": "new" },
  { "id": "RF-006-07",
    "severity": "minor",
    "target_file": "(audit pass)",
    "change": "Positive finding: no dead helpers, stale aliases, or stale comments left behind; iter-7 cleanup pass is unnecessary.",
    "ref": "planner iter-7 scope",
    "status": "new" }
]
```

## Recommendation

**STOP — proceed to Phase 3.**

Iter-6 closes the last two open MUST-improve axes (6 and 7) cleanly via the canonical planner-pinned mechanism, and all 7 MUST-improve axes plus the two sentinel axes (build/test green) are now met or exceeded at HEAD `c040078`. The behavior preservation gate is byte-identical on every contract-bearing surface; the three drifted surfaces are all planner-pinned tolerances (set parity / template-prefix-and-field-name parity / additive-only). 455/455 tests green. 16 build warnings — all pre-existing, none introduced by the refactor.

The audit pass for iter-7's planned scope ("cleanup, dead-helper removal, comment passes", per `refactor-plan.md` §"Planned commits" #7) finds **nothing to remove**:

- No `[Obsolete]` markers, no new `// TODO` / `// FIXME` / `// HACK`.
- All 10 partial-class bridges (5 per side × 2 sides) are load-bearing — each is consumed via its interface.
- All 6 new scaffolding helpers (`FeatureConcurrencySaver`, `FeatureLoader`, `FeatureOwnershipGuard`, `FeatureVersionGuard`, `StageEditContext`, `StageEditContextLoader`) are load-bearing.
- All 3 `ExtractDisplayName` call sites correctly route through the new `DisplayNameHelper`.
- `DateOnly.TryParseExact("yyyy-MM-dd", …)` exists at exactly one site in the gateway.
- No pre-existing comment (in `PlanMapper.cs`) references removed or renamed code; both pre-existing comments describe behavior that survived the refactor unchanged.

The planner's iter-7 was scoped as a final-cleanup pass; with nothing to clean, an iter-7 would be a no-op iteration that adds churn without value. The orchestrator should mark this as the final iteration and proceed to Phase 3 (refactor report + merge to main).

If the orchestrator nonetheless prefers a final-iteration audit run to update `refactor-plan.md` with the `Final` column populated and to re-capture the contract one more time at a clean tree (cold cache for the C# JIT, warmed pool for the test suite), iter-7 can serve that purpose with zero source edits — but no axis-closing or cleanup work remains.
