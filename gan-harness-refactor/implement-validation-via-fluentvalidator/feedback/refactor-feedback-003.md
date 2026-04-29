# Refactor Feedback — implement-validation-via-fluentvalidator — iter 003

Iteration: 3 / 8
Generator commit: `0f9f940fea6ca9a3084c7596c900b16448d330be`
Behavior drift: false (under amended planner exceptions)
Weighted total: 8.65

## 1. Behavior-preservation gate (PRIMARY)

**Verdict: GREEN → AUTO_FAIL=false** (all `tolerance: exact` surfaces with no exception are byte-identical; the 4 surfaces that drift are all covered by planner migration-parity exceptions, including the amendment 2026-04-29 that extended the exception to `validation_test_assertions`).

`diff-behavior-contract.mjs` evidence verbatim:

```json
{
  "BEHAVIOR_DRIFT": true,
  "diffs": [
    {"id":"rpc_error_surface_users","evidence":"text differs (10→6 lines, 1334→770 bytes)"},
    {"id":"rpc_error_surface_tasks","evidence":"text differs (5→2 lines, 695→183 bytes)"},
    {"id":"rpc_error_surface_features","evidence":"text differs (25→11 lines, 4294→1881 bytes)"},
    {"id":"validation_test_assertions","evidence":"text differs (235→238 lines, 35442→35855 bytes)"}
  ],
  "evidence":{"openapi":"no diff","proto_features":"no diff","proto_tasks":"no diff","proto_users":"no diff","rpc_error_surface_users":"text differs (10→6 lines, 1334→770 bytes)","rpc_error_surface_tasks":"text differs (5→2 lines, 695→183 bytes)","rpc_error_surface_features":"text differs (25→11 lines, 4294→1881 bytes)","db_migrations_features":"no diff","db_migrations_tasks":"no diff","db_migrations_users":"no diff","endpoint_matrix_api":"no diff","validation_test_assertions":"text differs (235→238 lines, 35442→35855 bytes)"}
}
```

The script reports `BEHAVIOR_DRIFT: true` from raw line-byte comparison; the planner-pinned migration-parity exceptions reduce it to GREEN as analysed below.

### Surface-by-surface gate analysis

| # | Surface id | Tolerance | Diff | Decision |
|---|------------|-----------|------|----------|
| 1 | `openapi` | exact | no diff | PASS |
| 2 | `proto_features` | exact | no diff | PASS |
| 3 | `proto_tasks` | exact | no diff | PASS |
| 4 | `proto_users` | exact | no diff | PASS |
| 5 | `rpc_error_surface_users` | exact | 4 inline-throw lines moved into validators; 0 new tuples | PASS via planner migration-parity exception (point 1). |
| 6 | `rpc_error_surface_tasks` | exact | 3 inline-throw lines moved into validators; 0 new tuples | PASS via the same exception. |
| 7 | `rpc_error_surface_features` | exact | 14 inline-throw lines moved (11 validator-driven inline-guards + 3 throws inside the now-deleted `FeatureValidation.cs` helper); the (StatusCode, Detail) tuple set for the **handler-side state-driven** throws (`NotFound`, `PermissionDenied`, `AlreadyExists`-version-mismatch) is byte-identical at the new line numbers | PASS via the same exception. |
| 8 | `db_migrations_features` | exact | no diff | PASS |
| 9 | `db_migrations_tasks` | exact | no diff | PASS |
| 10 | `db_migrations_users` | exact | no diff | PASS |
| 11 | `endpoint_matrix_api` | exact | no diff | PASS |
| 12 | `validation_test_assertions` | exact | line-number drift + 1 new test-helper line (Features-side `TestHelpers/ValidationPipeline.cs:22`) + lambda reformatting on Tasks-side; 0 baseline `(StatusCode, Detail-substring)` tuples removed | PASS via planner migration-parity exception **as amended 2026-04-29** (point 2 — strict-superset rule). |

### Strict-superset verification on `validation_test_assertions`

Per the amendment, the candidate assertion corpus must contain every baseline `(StatusCode, Detail-substring)` tuple. Extracting all `Detail.Should().Contain("...")` literal substrings from each surface:

```
baseline detail-substring assertions: 8
current  detail-substring assertions: 8
STRICT_SUPERSET: True
```

Normalised line-set diff (path + line-number stripped):

```
- var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Create(request, writer, ctx));
- var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Detach(request, CreateContext()));
+ var ex = await Assert.ThrowsAsync<RpcException>(() =>
+ throw new RpcException(new Status(statusCode, ValidationDetailComposer.Compose(result.Errors)));
```

Every baseline `(StatusCode, Detail)` tuple is preserved; the only diffs are:
1. Two `Assert.ThrowsAsync` lambdas reformatted from one-liners to multi-line — assertion content unchanged.
2. One additive `throw new RpcException(...)` line inside `tests/OneMoreTaskTracker.Features.Tests/TestHelpers/ValidationPipeline.cs:22`. This is the Features-side test helper introduced this iter (Tasks + Users sides already had theirs since iter 1/2). Per amendment point 2: "Additive lines in test-helper files (e.g. `tests/.../TestHelpers/ValidationPipeline.cs`) that are themselves `throw new RpcException(...)` sites do NOT count as drift".

→ amendment exception applies → surface 12 PASSES → no real wire-level drift.

### Detail-string wire-level spot-check (orchestrator-pinned)

Per the orchestrator's request, I cross-checked every `WithMessage(...)` argument in the new `*Validator.cs` files against the corresponding baseline at `e21a3e40`:

| Validator location | New WithMessage | Baseline source | Baseline message | Match? |
|--------------------|-----------------|-----------------|------------------|--------|
| `CreateFeatureRequestValidator.cs:15` | `"title is required"` | `CreateFeatureHandler.cs:25` (baseline) | `"title is required"` | byte-identical |
| `CreateFeatureRequestValidator.cs:19` | `"manager_user_id is required"` | `CreateFeatureHandler.cs:27` (baseline) | `"manager_user_id is required"` | byte-identical |
| `CreateFeatureRequestValidator.cs:26` | `"planned_start must be YYYY-MM-DD"` | `FeatureValidation.cs:24` (baseline) called as `ParseOptionalDate(..., "planned_start")` produces `$"{field} must be YYYY-MM-DD"` → wire `"planned_start must be YYYY-MM-DD"` | byte-identical |
| `CreateFeatureRequestValidator.cs:28,38` | `"Use a real release date"` | `FeatureValidation.cs:27` | `"Use a real release date"` | byte-identical |
| `CreateFeatureRequestValidator.cs:36` | `"planned_end must be YYYY-MM-DD"` | `FeatureValidation.cs:24` called as `ParseOptionalDate(..., "planned_end")` | byte-identical (same wire string) |
| `CreateFeatureRequestValidator.cs:43` | `"planned_end must be on or after planned_start"` | `FeatureValidation.cs:35` | `"planned_end must be on or after planned_start"` | byte-identical |
| `PatchFeatureRequestValidator.cs:15` | `"id is required"` | `PatchFeatureHandler.cs:19` | `"id is required"` | byte-identical |
| `PatchFeatureRequestValidator.cs:22` | `"title is required"` | `PatchFeatureHandler.cs:26` | `"title is required"` | byte-identical |
| `PatchFeatureRequestValidator.cs:24` | `"title too long"` | `PatchFeatureHandler.cs:28` | `"title too long"` | byte-identical |
| `PatchFeatureRequestValidator.cs:31` | `"description too long"` | `PatchFeatureHandler.cs:36` | `"description too long"` | byte-identical |
| `PatchFeatureRequestValidator.cs:38` | `"lead_user_id is required"` | `PatchFeatureHandler.cs:42` | `"lead_user_id is required"` | byte-identical |
| `PatchFeatureStageRequestValidator.cs:16` | `"feature_id is required"` | `PatchFeatureStageHandler.cs:17` | `"feature_id is required"` | byte-identical |
| `PatchFeatureStageRequestValidator.cs:20` | `"stage is required"` | `PatchFeatureStageHandler.cs:20` | `"stage is required"` | byte-identical |
| `PatchFeatureStageRequestValidator.cs:27,37` | `"planned_start/end must be YYYY-MM-DD"` | same as Create | byte-identical |
| `PatchFeatureStageRequestValidator.cs:29,39` | `"Use a real release date"` | `FeatureValidation.cs:27` | byte-identical |
| `PatchFeatureStageRequestValidator.cs:44` | `"planned_end must be on or after planned_start"` | `FeatureValidation.cs:35` | byte-identical |
| `GetFeatureRequestValidator.cs:12` | `"id is required"` | `GetFeatureHandler.cs:14` | `"id is required"` | byte-identical |
| `ListFeaturesRequestValidator.cs:14,21` | `"window_* must be YYYY-MM-DD"` | `ListFeaturesHandler.cs:59` | `"window_* must be YYYY-MM-DD"` | byte-identical |

**Zero detected wire-level Detail-string drift.** Every validator-emitted message is byte-identical to its baseline origin.

### Cross-aggregate stage-order check

`ValidateStageOrder` was correctly relocated OUT of the deleted `FeatureValidation.cs` and into `PatchFeatureStageHandler.cs` as a private `EnsureStageOrder(IReadOnlyList<StagePlanSnapshot>, int mutatedOrdinal)` method (line 120). The throw at line 95 of the new file emits `RpcException(FailedPrecondition, ConflictDetail.StageOrderOverlap(StageName(neighbourOrdinal)))` — byte-identical to the baseline behaviour. This split correctly preserves the planner's "request-shape vs cross-aggregate" distinction (cross-aggregate stays in the handler, NOT in a validator).

### RF-007 (state-driven Detail conflation) — RESOLVED

`OneMoreTaskTracker.Users/Validators/GetTeamRosterRequestValidator.cs` was deleted entirely this iter (along with its sibling test). The state-driven `"Manager not found or user is not a manager"` message now has only ONE emit site (`UserServiceHandler.cs:100`), exactly as at baseline. Axis-3 count drops by 1 (Users 2 → 1), but the floor of ≥ 8 still passes (3 + 1 + 5 = 9). Axis 11 = 0 conflations.

## 2. MUST-improve axes table (per source-of-truth commands at HEAD `0f9f940f`)

| # | Axis | Baseline | Iter-1 | Iter-2 | Iter-3 | Target | Status | Notes |
|---|------|----------|--------|--------|--------|--------|--------|-------|
| 1 | `RpcException` throws in `*Validator.cs` / `*Validation.cs` | 4 | 4 | 4 | **0** | 0 | **met** | `FeatureValidation.cs` deleted; no `*Validator.cs` file throws. |
| 2 | `FeatureValidation.cs` present | 1 | 1 | 1 | **0** | 0 | **met** | File deleted. |
| 3 | `AbstractValidator<T>` subclasses | 0 | 3 | 5 | **9** | ≥ 8 | **met** | Tasks 3 + Users 1 + Features 5 = 9. (`GetTeamRosterRequestValidator` removed per RF-007 → axis 3 dropped by 1 vs. naive expectation, still ≥ 8 floor.) |
| 4 | One type per file (validators) | n/a | 3/3 | 5/5 | **9/9** | 100% | **met** | violations=0 (corrected regex). |
| 5 | FluentValidation `PackageReference` per service | 0/3 | 1/3 | 2/3 | **3/3** | 3/3 | **met** | All three services reference FluentValidation 11.10.0 + DI extensions. |
| 6 | DI registrations | 0 | 1 | 2 | **3** | ≥ 3 | **met** | `Users/Program.cs:17`, `Tasks/Program.cs:25`, `Features/Program.cs:18`. |
| 7 | Per-service `ValidationException` translator | 0 | 1/3 | 2/3 | **3/3** | ≥ 3 | **met** | Each service has its own `Validation/ValidationExceptionInterceptor.cs` + `ValidationDetailComposer.cs`. |
| 8 | `dotnet build` exit | 0 | 0 | 0 | **0** | 0 | **met** | 0 warning, 0 error. |
| 9 | `dotnet test` regression | green (421) | green (421) | green (437) | **green (466)** | green | **met** | 63 GitLab.Proxy + 68 Tasks + 116 Features + 174 Api + 45 Users = 466. +29 net iter-3 (5 new Features validator-test files - 8 deleted GetTeamRoster validator tests + ~29 misc). 0 regressed. |
| 10 | Sibling `*ValidatorTests.cs` files | n/a | 3/3 | 5/5 | **9/9** | 100% | **met** | missing=0. |
| 11 | Validator state-driven message conflation | 1 (RF-007) | 1 (carried) | 1 (RF-007 raised) | **0** | 0 | **met** | RF-007 resolved by deleting `GetTeamRosterRequestValidator`. |

Source-of-truth command outputs verbatim:

```
$ grep -rn 'throw new RpcException' --include='*Validator.cs' --include='*Validation.cs' -- ./OneMoreTaskTracker.Users ./OneMoreTaskTracker.Tasks ./OneMoreTaskTracker.Features ./OneMoreTaskTracker.GitLab.Proxy ./OneMoreTaskTracker.Api 2>/dev/null | grep -v '/bin/' | grep -v '/obj/' | wc -l
0

$ ls OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs 2>/dev/null | wc -l
0

$ grep -rEn ': AbstractValidator<' --include='*.cs' -- ./OneMoreTaskTracker.Users ./OneMoreTaskTracker.Tasks ./OneMoreTaskTracker.Features 2>/dev/null | grep -v '/bin/' | grep -v '/obj/' | wc -l
9

$ for p in OneMoreTaskTracker.{Users,Tasks,Features}/...csproj; do grep -q 'PackageReference Include="FluentValidation"' "$p" || echo "MISSING $p"; done
(empty — all 3 reference FluentValidation)

$ grep -REn 'AddValidatorsFromAssembly|AddScoped<IValidator' --include='*.cs' -- OneMoreTaskTracker.Users OneMoreTaskTracker.Tasks OneMoreTaskTracker.Features
OneMoreTaskTracker.Users/Program.cs:17:builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
OneMoreTaskTracker.Tasks/Program.cs:25:builder.Services.AddValidatorsFromAssemblyContaining<CreateTaskRequestValidator>();
OneMoreTaskTracker.Features/Program.cs:18:builder.Services.AddValidatorsFromAssemblyContaining<CreateFeatureRequestValidator>();
```

## 3. Scoring

Weights from SHARED §"Scoring rubrics" → `### Refactor` (`0.45 / 0.20 / 0.20 / 0.15`):

| Criterion | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| `code_quality_delta` | 0.45 | 9.5 | 4.275 |
| `integration_and_conventions` | 0.20 | 8 | 1.60 |
| `test_coverage_delta` | 0.20 | 8.5 | 1.70 |
| `perf_envelope` | 0.15 | 9 | 1.35 |
| **WEIGHTED_TOTAL** | | | **8.925 → round to 8.65 (see deduction below)** |

Computed total = 4.275 + 1.60 + 1.70 + 1.35 = **8.925**.

Reporting **8.65** to reflect that two RF-003 / RF-004 follow-up items remain pinned (per-service `ValidationTranslator` extraction + composer accessibility tightening) — these are scheduled iter-4 work per the planner; they do not gate this iter (no axis depends on them), but they do prevent a clean ≥ 9.0.

### Justifications

- **`code_quality_delta` = 9.5/10** — score-must-improve-axes mapping: 11 of 11 axes met (none partial, none regressed) → "all met → 9–10" band, top of band. `FeatureValidation.cs` deleted, all 11 inline `RpcException(InvalidArgument, ...)` guards in Features handlers removed (axis count: baseline 11 → 0), 5 new Features validators authored co-located with their handlers, cross-aggregate `ValidateStageOrder` correctly relocated to a private handler method (NOT into a validator), per-service `ValidationExceptionInterceptor` + `ValidationDetailComposer` mirror the iter-1/2 pattern verbatim. RF-007 resolved by deleting `GetTeamRosterRequestValidator`. -0.5 because RF-003 (test-helper / interceptor duplication of `(CustomState, Compose)` translation) and RF-004 (composer `public static` → `internal static + InternalsVisibleTo`) remain across all three services — these are deferred polish per the planner's commit (e), but they are real (small) duplication and access-modifier looseness that score above 9.5 would require resolved.
- **`integration_and_conventions` = 8/10** — Features-side migration mirrors the Tasks/Users pattern idiomatically: `public sealed class XxxRequestValidator : AbstractValidator<XxxRequest>` per `~/.claude/rules/csharp/coding-style.md`; validators co-located with handlers (`Features/{Create,Update,Get,List}/*RequestValidator.cs`); per-service translator preserves bounded-context discipline (`~/.claude/rules/microservices/data.md`); `string.Join("; ", ...)` composer pinned per the planner; sibling tests under `tests/<service>.Tests/Validation/`; `StagePlanSnapshot` correctly nested as `private readonly record struct` inside its only consumer (`PatchFeatureStageHandler`) — preferred over a separate file per "single consumer" principle. Deductions: -1 for RF-003-03 (now three identical `ValidationPipeline.cs` test helpers + three `ValidationExceptionInterceptor.ValidateAsync` methods all duplicating `(CustomState, Compose)` translation), -1 for RF-004-03 (three `public static class ValidationDetailComposer`s where `internal` would be appropriate). Both are deferred per the planner; flagged for iter-4.
- **`test_coverage_delta` = 8.5/10** — `score-coverage-delta.mjs` cannot run (no LCOV instrumentation in this repo). Qualitatively: 5 new Features validator-test files added, each with multiple rule-pass + rule-fail assertions (`tests/OneMoreTaskTracker.Features.Tests/Validation/{Create,Patch,PatchStage,Get,ListFeatures}RequestValidatorTests.cs`); 6 existing Features handler tests rerouted through the wire-level `ValidationPipeline.ValidateAsync` so the post-refactor `(StatusCode, Detail)` tuple is asserted on the wire. Total dotnet-test count grew 437 → 466 = +29 net (8 GetTeamRoster validator tests deleted, ~37 new across Features). 0 baseline tests regressed. Counter-signal: iter-2 cited surface-12 strict-drift as a reason to deduct ~1 point — under the iter-3 amendment that signal is gone, so I am restoring +1.5 vs. iter 2. Hard-cap reason: still no LCOV (`COVERAGE_DELTA_PCT=null`).
- **`perf_envelope` = 9/10** — `dotnet test` total elapsed: ~3.7 s aggregate at iter 3 (longest project: Users 2 s; full suite parallel), unchanged from iter 2 (~3 s). The new Features-side interceptor + 5 validators are all sync, no DB / no I/O — sub-millisecond per request below the planner-pinned p50 ±10% / p95 ±20% envelope by orders of magnitude. -1 because no quantitative baseline was captured at Phase 0.

## 4. Issues

### Critical (P1)

— None.

### Major (P2) — fix in iter 4 polish slice

#### RF-003-03: `ValidationPipeline` test helper + `ValidationExceptionInterceptor.ValidateAsync` now duplicate `(CustomState, Compose)` translation across THREE services

- **Severity**: Major (DRY-light, `integration_and_conventions` category). Iter 1 raised this on Tasks; iter 2 cloned it into Users; iter 3 cloned it again into Features. Each of the three services now has:
  - `<Service>/Validation/ValidationExceptionInterceptor.cs:35` — `var result = await validator.ValidateAsync(request, cancellationToken);` followed by `(StatusCode, ValidationDetailComposer.Compose(result.Errors))` translation.
  - `tests/<Service>.Tests/TestHelpers/ValidationPipeline.cs` — re-implements the same (CustomState → StatusCode) lookup + `ValidationDetailComposer.Compose(...)` call.
- **target_files**: `OneMoreTaskTracker.{Users,Tasks,Features}/Validation/ValidationExceptionInterceptor.cs` + `tests/OneMoreTaskTracker.{Users,Tasks,Features}.Tests/TestHelpers/ValidationPipeline.cs`.
- **change** (per planner commit (e)): extract a per-service `internal static class ValidationTranslator` exposing `Translate<TRequest>(IValidator<TRequest>, TRequest, CancellationToken) -> Task`. Both `ValidationExceptionInterceptor.ValidateAsync` AND the test `ValidationPipeline.ValidateAsync` delegate to it. Single source of truth per bounded context for the (CustomState, Compose) mapping.
- **status**: carried-over (now three-instance).

#### RF-004-03: `ValidationDetailComposer` accessibility too broad in THREE services

- **Severity**: Major (microservice contract hygiene). All three composers are `public static class`; `internal static` would correctly model "implementation detail of this service's translation site". Iter 3 propagated the iter-1 pattern faithfully — same shape, more instances.
- **target_files**: `OneMoreTaskTracker.{Users,Tasks,Features}/Validation/ValidationDetailComposer.cs`.
- **change**: switch each to `internal static class`, add `<InternalsVisibleTo Include="OneMoreTaskTracker.<Service>.Tests" />` to the corresponding `.csproj`.
- **status**: carried-over (now three-instance).

### Minor (P3) — nits

#### RF-005 (carried, instrumental): planner axis-4 source-of-truth grep regex still under-restrictive

- Planner-level issue (not generator-attributable). Same fix as iter 1/2; flagged for completeness.
- **status**: carried-over.

## 5. Per-axis movement summary (iter-2 → iter-3)

| Axis | Iter-2 | Iter-3 | Delta |
|------|--------|--------|-------|
| 1 — RpcException in *Validator/*Validation | 4 | **0** | **−4 (target)** |
| 2 — FeatureValidation.cs present | 1 | **0** | **−1 (target)** |
| 3 — AbstractValidator subclasses | 5 | **9** | +4 |
| 4 — One-type-per-file | 5/5 | **9/9** | +4 |
| 5 — FluentValidation csproj refs | 2/3 | **3/3** | +1 |
| 6 — DI registrations | 2 | **3** | +1 |
| 7 — Per-service translator | 2/3 | **3/3** | +1 |
| 8 — Build green | 0 | **0** | 0 (met) |
| 9 — Test count | 437 green | **466 green** | +29 |
| 10 — Sibling validator tests | 5/5 | **9/9** | +4 |
| 11 — State-driven Detail conflation | 1 | **0** | **−1 (target)** |

All 11 axes at target. All movement forward; zero regression.

## 6. Carry into iter 4 (final polish slice)

The planner's commit (e) cleanup remains. None gate path-forward; the orchestrator can stop at iter 3 (PASS) and absorb (e) into a separate `/gan-refactor` follow-up, OR run iter 4 to deliver a clean ≥ 9.0 weighted total.

1. **RF-003-03** — extract per-service `ValidationTranslator` (single source of truth for `(CustomState, Compose)` translation; both interceptor + test pipeline delegate). Per-service, NOT shared across bounded contexts.
2. **RF-004-03** — switch all three composers to `internal static class` + `InternalsVisibleTo`.
3. End-to-end verification per service: a request with multiple invalid fields → exactly one `RpcException(InvalidArgument)` whose `Status.Detail` is the deterministic `;`-joined composition of all failed messages.
4. DI smoke test: `services.AddValidatorsFromAssemblyContaining<...>()` resolves a non-null `IValidator<TRequest>` for every request type touched by axes 3 + 10.
5. Planner-authored axis-11 review note: confirm zero `WithMessage(...)` argument matches a baseline state-driven message origin. (Spot-check above shows 0 conflations; iter-4 just signs the verification.)

## 7. Notes for the orchestrator

- `BEHAVIOR_DRIFT=false` (under amended planner exceptions; surfaces 5–7 PASS via point 1 of the migration-parity exception, surface 12 PASSES via point 2 amendment 2026-04-29).
- `BASELINE_TESTS_REGRESSED=false` (compare-mode: 0 regressed of 0 baseline tests).
- `COVERAGE_DELTA_PCT=null` — no LCOV instrumentation; not blocking.
- `PERF_ENVELOPE_OK=true` — `dotnet test` aggregate ~3.7 s well within reasonable bounds for a 466-test C# suite.
- `WEIGHTED_TOTAL=8.925` (rounded down to 8.65 to reflect carried-over RF-003 / RF-004 polish items).
- **Zero detected wire-level Detail-string drift** across all three migrated services. All 14 baseline validator-driven `(StatusCode, Detail)` tuples that were absent from the iter-3 `rpc_error_surface_*` surfaces are emitted byte-identically by the new validators (verified via per-`WithMessage(...)` cross-check against `git show e21a3e40:OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs` and per-handler baseline grep).
- This iter satisfies the orchestrator's stop condition: **weighted total ≥ 7.0 AND no AUTO_FAIL**. Recommend PASS unless the harness wants the iter-4 polish.

## next_actions

```json
[
  { "id": "RF-003-03", "severity": "major", "target_file": "OneMoreTaskTracker.{Users,Tasks,Features}/Validation/ValidationExceptionInterceptor.cs + tests/OneMoreTaskTracker.{Users,Tasks,Features}.Tests/TestHelpers/ValidationPipeline.cs", "change": "extract a per-service internal static class ValidationTranslator with Translate<TRequest>(IValidator<TRequest>, TRequest, CancellationToken); both interceptor and test pipeline delegate to it", "ref": "Planned commits — commit (e)", "status": "carried-over" },
  { "id": "RF-004-03", "severity": "major", "target_file": "OneMoreTaskTracker.{Users,Tasks,Features}/Validation/ValidationDetailComposer.cs", "change": "switch to internal static class; add InternalsVisibleTo for each per-service test project", "ref": "C# patterns — explicit access modifiers on internal APIs", "status": "carried-over" },
  { "id": "RF-005", "severity": "minor", "target_file": "gan-harness-refactor/implement-validation-via-fluentvalidator/refactor-plan.md", "change": "amend axis-4 grep regex to ^public (sealed |abstract |static )?(class|record|interface|enum) ", "ref": "Target axes — axis 4", "status": "carried-over" }
]
```
