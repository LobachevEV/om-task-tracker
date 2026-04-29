# Verdict — implement-validation-via-fluentvalidator — iter 003

Iteration: 3 / 8
Track: backend
Generator commit: `0f9f940fea6ca9a3084c7596c900b16448d330be`

## Top-line

- **Verdict: PASS**
- **Behavior drift: false**   ← gate (under amended planner exceptions); raw script reports drift on 4 surfaces, all covered by migration-parity exceptions
- **Auto-fail: false**
- Weighted total: **8.65** (computed 8.925; rounded down to reflect deferred RF-003 / RF-004 polish)
- Pass threshold: 7.0 (per orchestrator stop condition: ≥ 7.0 AND no AUTO_FAIL)

## Score breakdown

| Criterion | Weight | Score | Contribution |
|-----------|--------|-------|--------------|
| code_quality_delta | 0.45 | 9.5 | 4.275 |
| integration_and_conventions | 0.20 | 8.0 | 1.600 |
| test_coverage_delta | 0.20 | 8.5 | 1.700 |
| perf_envelope | 0.15 | 9.0 | 1.350 |
| **Total** | 1.00 | | **8.925 (reported 8.65)** |

## Auto-fail summary

`auto_fail=false` — no SHARED auto-fail trigger fired:

- [ ] Behavior contract drift — raw `BEHAVIOR_DRIFT: true` from `diff-behavior-contract.mjs`, but every drifted surface is covered by a planner-pinned migration-parity exception:
  - `rpc_error_surface_users` (10→6 lines): inline-throws moved into validators per point 1 of the exception. (StatusCode, Detail) tuple set unchanged.
  - `rpc_error_surface_tasks` (5→2 lines): same — point 1.
  - `rpc_error_surface_features` (25→11 lines): same — point 1. `FeatureValidation.cs` deleted (4 throws relocated into validators with byte-identical messages); 11 inline-guards in handlers also relocated. The 6 surviving handler-side throws are `NotFound`/`PermissionDenied`/`AlreadyExists-version-mismatch` state-driven tuples, byte-identical at new line numbers.
  - `validation_test_assertions` (235→238 lines): line-number drift + 1 additive line in `tests/OneMoreTaskTracker.Features.Tests/TestHelpers/ValidationPipeline.cs:22`. Per amendment 2026-04-29 (point 2): strict-superset rule satisfied — every baseline `(StatusCode, Detail-substring)` tuple is preserved (verified: 8 baseline → 8 current; missing=0).
- [ ] Test suite regressed — NO. 466 / 466 green (was 437 / 437 at iter 2; +29 net). 0 regressed.
- [ ] Coverage on touched file dropped > 2% — N/A (no LCOV instrumentation; `COVERAGE_DELTA_PCT=null`).
- [ ] Perf envelope regression beyond planner tolerance — NO. `dotnet test` ~3.7 s aggregate on 466 tests; FluentValidation rules sync, no DB / no I/O.
- [ ] Contract bump attempted — NO. proto / openapi / endpoint_matrix all `no diff`.

**Critical clarification on `BEHAVIOR_DRIFT` content**: I ran the orchestrator-pinned spot-check on every `WithMessage(...)` argument in the new Features validators against `git show e21a3e40:OneMoreTaskTracker.Features/Features/{Data/FeatureValidation,Create/CreateFeatureHandler,Update/PatchFeatureHandler,Update/PatchFeatureStageHandler,Get/GetFeatureHandler,List/ListFeaturesHandler}.cs`. Every validator-emitted message is byte-identical to its baseline-derived wire string:

| Validator message | Baseline source | Match |
|-------------------|-----------------|-------|
| `"title is required"` | `CreateFeatureHandler.cs:25` + `PatchFeatureHandler.cs:26` | byte-identical |
| `"manager_user_id is required"` | `CreateFeatureHandler.cs:27` | byte-identical |
| `"planned_start/end must be YYYY-MM-DD"` | `FeatureValidation.cs:24` interpolation when called with `field="planned_start"`/`"planned_end"` | byte-identical |
| `"Use a real release date"` | `FeatureValidation.cs:27` | byte-identical |
| `"planned_end must be on or after planned_start"` | `FeatureValidation.cs:35` | byte-identical |
| `"id is required"` | `GetFeatureHandler.cs:14` + `PatchFeatureHandler.cs:19` | byte-identical |
| `"title too long"` | `PatchFeatureHandler.cs:28` | byte-identical |
| `"description too long"` | `PatchFeatureHandler.cs:36` | byte-identical |
| `"lead_user_id is required"` | `PatchFeatureHandler.cs:42` | byte-identical |
| `"feature_id is required"` | `PatchFeatureStageHandler.cs:17` (Features) + `CreateTaskHandler.cs` / `AttachTaskToFeatureHandler.cs` (Tasks) | byte-identical |
| `"stage is required"` | `PatchFeatureStageHandler.cs:20` | byte-identical |
| `"window_* must be YYYY-MM-DD"` | `ListFeaturesHandler.cs:59` | byte-identical |

**Zero wire-level Detail-string drift detected.** The cross-aggregate `ValidateStageOrder` check correctly relocated to `PatchFeatureStageHandler.EnsureStageOrder` (private method) — NOT into a validator (request-shape-vs-state-driven split honoured). RF-007 resolved by deleting `GetTeamRosterRequestValidator` (no validator emits a state-driven Detail string anywhere).

## Score progression

| Iter | Total | code_quality | integration | coverage | perf | drift |
|------|-------|--------------|-------------|----------|------|-------|
| 1 | 7.10 | 7.0 | 8.0 | 6.0 | 9.0 | true (RF-001 + carried RF-002) |
| 2 | 7.50 | 7.0 | 8.0 | 7.0 | 9.0 | true (RF-001-02 + carried RF-002-02) |
| 3 | **8.65** | **9.5** | **8.0** | **8.5** | **9.0** | **false** (under amended exceptions) |

## Axis status snapshot

All 11 MUST-improve axes at target:

| Axis | Status |
|------|--------|
| 1 — RpcException in *Validator/*Validation files | met (0 / target 0) |
| 2 — FeatureValidation.cs present | met (0 / target 0) |
| 3 — AbstractValidator<T> subclasses | met (9 / target ≥ 8) |
| 4 — One type per file | met (9/9 / target 100%) |
| 5 — FluentValidation csproj refs | met (3/3 / target 3/3) |
| 6 — DI registrations | met (3 / target ≥ 3) |
| 7 — Per-service translator | met (3/3 / target ≥ 3) |
| 8 — Build green | met (0 / target 0) |
| 9 — Test regression | met (466 / 466 green; 0 regressed) |
| 10 — Sibling validator tests | met (9/9 / target 100%) |
| 11 — State-driven Detail conflation | met (0 / target 0) |

## Recommendation

**PASS — finalize OR run one polish iter (iter-4) for ≥ 9.0**.

This iter satisfies the orchestrator's pinned stop condition (`weighted total ≥ 7.0 AND no AUTO_FAIL`) and lands every MUST-improve axis at target. Behavior preservation is GREEN under the amended planner exceptions, and there is zero detected wire-level Detail-string drift across all three migrated services.

Two carried-over follow-up items remain — `RF-003-03` (extract per-service `ValidationTranslator` to dedupe interceptor + test-pipeline) and `RF-004-03` (composer `public static` → `internal static + InternalsVisibleTo`). Both are scheduled iter-4 work per the planner's commit (e); neither gates path-forward and both are deferrable to a separate `/gan-refactor` polish run.

Suggested orchestrator action:

- **If the harness wants to ship now**: stop at iter 3 — declare PASS, open a follow-up ticket for the iter-4 polish, merge.
- **If the harness wants a clean ≥ 9.0**: run iter 4 with `next_actions = [RF-003-03, RF-004-03]`. Expected weighted total ≥ 9.2 once both are resolved (the only remaining ceiling becomes the missing LCOV / quantitative perf baseline, both repository-level concerns).
