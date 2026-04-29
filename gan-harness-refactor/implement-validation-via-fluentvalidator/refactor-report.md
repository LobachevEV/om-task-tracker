# Refactor Report — implement-validation-via-fluentvalidator

Track: backend
Baseline SHA: e21a3e403eeab550bed65b6c14db29fd41fdcd9e
Final SHA: 0f9f940fea6ca9a3084c7596c900b16448d330be
Iterations: 3
Final verdict: **PASS**
Final weighted total: **8.65** (raw 8.925, reported 8.65 to reflect two carried-over polish items)

## Behavior preservation summary

- Behavior contract: `behavior-contract.md` (+ `.json`), 12 surfaces captured at baseline SHA `e21a3e40`, frozen at iteration 0.
- Drift events across the run: 2 (iter 1, iter 2 — both attributed to the `validation_test_assertions` grep-snapshot surface, which was over-broad relative to the planner's stated intent).
- Final-iteration drift: **false** (under planner-pinned migration-parity exceptions).
- Plan amendment between iter 2 and iter 3 extended the migration-parity exception to `validation_test_assertions` for additive-only / cosmetic drift, with a strict-superset rule: every baseline `(StatusCode, Detail-substring)` tuple must appear in the candidate corpus. The 8 baseline detail-substring assertions all preserved verbatim post-iter-3.
- The semantic gate — wire-level `(StatusCode, Detail)` tuple set on every validation error path — was preserved byte-identically across all three migrated services.

## Outcome against MUST-improve axes

| Axis | Baseline | Target | Final | Status |
|------|----------|--------|-------|--------|
| 1 — `RpcException` throws inside `*Validator.cs` / `*Validation.cs` | 4 (all in `FeatureValidation.cs`) | 0 | **0** | met |
| 2 — `FeatureValidation.cs` static helper present | 1 | 0 | **0** | met |
| 3 — `AbstractValidator<T>` subclasses across in-scope services | 0 | ≥ 8 | **9** (Tasks 3 + Users 1 + Features 5) | met |
| 4 — One type per file (rule, 100%) | n/a | 100% | **100%** (0 violations across 9 validators) | met |
| 5 — `FluentValidation` package referenced by in-scope csproj | 0 / 3 | 3 / 3 | **3 / 3** | met |
| 6 — Validators registered in DI per service | 0 | ≥ 3 | **3** | met |
| 7 — Per-service `ValidationException → RpcException` translator | 0 | ≥ 3 | **3** | met |
| 8 — `dotnet build` exit code | 0 | 0 | **0** | met |
| 9 — `dotnet test` regression vs. baseline manifest | green | green | **green** (466 pass, 0 regressed) | met |
| 10 — Sibling `*ValidatorTests.cs` per `*Validator.cs` | n/a | 100% | **100%** | met |
| 11 — Validator state-driven Detail-string conflation (added by amendment) | 1 (RF-007 in `GetTeamRosterRequestValidator`) | 0 | **0** (validator deleted in iter 3) | met |

All 11 axes met at iter 3.

## Score progression

| Iter | Total | code_quality | integration | coverage | perf | drift | verdict |
|------|-------|--------------|-------------|----------|------|-------|---------|
| 1 | 6.40 | 5 / 10 | 8 / 10 | 6 / 10 | 9 / 10 | true | FAIL (auto-fail) |
| 2 | 7.50 | 7 / 10 | 8 / 10 | 7 / 10 | 9 / 10 | true | FAIL (auto-fail) |
| 3 | 8.65 | 9.5 / 10 | 8 / 10 | 8.5 / 10 | 9 / 10 | false | **PASS** |

Iter 1 and iter 2 auto-failed on the same `validation_test_assertions` over-capture issue. Iter 3 cleared after the planner amendment formalized the migration-parity exception for additive-only test-corpus drift.

## Notable changes

- **`OneMoreTaskTracker.Tasks/Validation/ValidationExceptionInterceptor.cs`** — gRPC interceptor that resolves `IValidator<TRequest>` from DI, runs validation, and translates `ValidationException → RpcException(InvalidArgument | CustomState)`. Same pattern duplicated per bounded context in `Users/Validation/` and `Features/Validation/` (per-service ownership; no cross-context infrastructure project).
- **`ValidationDetailComposer`** — `string.Join("; ", failures.Select(f => f.ErrorMessage))` per the planner-pinned multi-failure composition formula. Single-failure messages stay byte-identical to baseline.
- **`OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs`** — deleted in iter 3 (axis 2: 1 → 0). The 4 `RpcException(InvalidArgument)` throws and 1 `RpcException(FailedPrecondition)` throw migrated to `*Validator.cs` files (using `WithState(_ => StatusCode.FailedPrecondition)` for the cross-stage-ordering rule's state code) or, for the cross-aggregate `ValidateStageOrder` invariant, into `PatchFeatureStageHandler.EnsureStageOrder` as a private static method (commit `0f9f940`).
- **`GetTeamRosterRequestValidator`** — deleted in iter 3 to resolve RF-007. The validator's `ManagerId > 0` rule reused the state-driven `"Manager not found or user is not a manager"` Detail string, conflating request-shape and downstream-state error semantics. The handler's existing DB lookup already emits the same wire-level tuple from the state path.
- **9 sibling `*ValidatorTests.cs` files** under `tests/{Tasks,Users,Features}.Tests/Validation/` — at least one rule-pass and one rule-fail per declared rule. Test count grew from 421 → 466 (+45 net).
- **Plan amendment** (between iter 2 and iter 3): added migration-parity exception covering `validation_test_assertions`; added axis 11 for state-driven message conflation; updated Planned commits to reflect actual progress. Frozen contract artifacts (`behavior-contract.{md,json}`, `behavior-capture.json`, `baseline-tests.json`) were NOT modified.

## Out-of-scope follow-ups

From `refactor-plan.md` §"Scope boundary":

- REST DTO validation in `OneMoreTaskTracker.Api/Controllers/**` — gateway validation still uses inline `if`s. Could be a separate `/gan-refactor` run with its own contract (HTTP 400 wire surface).
- Frontend Zod schema validation in `OneMoreTaskTracker.WebClient/**` — unchanged.
- `openapi.json` auto-emit (currently hand-maintained per memory `project_openapi_hand_rolled.md`).
- `BuildMiniTeamMember` stale-id bug (memory `project_build_mini_team_member_stale_bug.md`).
- `Features` service `/health` endpoint (memory `project_features_service_no_health_endpoint.md`).
- `Feature.State` derivation from stage dates (memory `project_feature_state_should_be_derived.md`).

## Carry-over issues

Open `RF-*` issues that did not get resolved (pinned for an optional iter-4 polish slice or a separate `/gan-refactor` run):

| Issue | Severity | Target file(s) | Notes |
|-------|----------|----------------|-------|
| RF-003-03 | major | `OneMoreTaskTracker.{Users,Tasks,Features}/Validation/ValidationExceptionInterceptor.cs` + `tests/{...}.Tests/TestHelpers/ValidationPipeline.cs` | Three identical `(CustomState, Compose)` translation paths across services + test helpers. Extract per-service `ValidationTranslator` (still per-bounded-context, no shared infra project) so interceptor + test pipeline delegate to one method. |
| RF-004-03 | major | `OneMoreTaskTracker.{Users,Tasks,Features}/Validation/ValidationDetailComposer.cs` | Composer is `public static class` in three places. Switch to `internal static class` + `InternalsVisibleTo("<service>.Tests")`. |
| RF-005 | minor | `gan-harness-refactor/implement-validation-via-fluentvalidator/refactor-plan.md` (axis 4 grep regex) | Resolved by plan amendment; verify the amendment is on disk. |

Neither RF-003 nor RF-004 gates the harness — both are code-quality polish. The architectural goal (validators do not throw `RpcException`; throw decision lives in the interceptor) is fully achieved across all three services.
