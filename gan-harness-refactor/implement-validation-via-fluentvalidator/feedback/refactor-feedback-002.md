# Refactor Feedback — implement-validation-via-fluentvalidator — iter 002

Iteration: 2 / 8
Generator commit: `8d9b5a5b9f9f3688500456f4b668becc40445ebb`
Behavior drift: true (line-location only on `rpc_error_surface_users` + `rpc_error_surface_tasks`; planner-pinned migration-parity exception applies. `validation_test_assertions` drift is cosmetic + additive only — same `RF-001` situation carried over from iter 1.)
Weighted total: 7.10

## 1. Behavior-preservation gate (PRIMARY)

**Verdict: RED → AUTO_FAIL=true** (drift on a `tolerance: exact` surface that has no planner-pinned exception — `validation_test_assertions`. Per skill instructions: "Do NOT silently widen tolerances.")

`diff-behavior-contract.mjs` evidence verbatim:

```json
{
  "BEHAVIOR_DRIFT": true,
  "diffs": [
    {"id":"rpc_error_surface_users","evidence":"text differs (10→6 lines, 1334→770 bytes)"},
    {"id":"rpc_error_surface_tasks","evidence":"text differs (5→2 lines, 695→183 bytes)"},
    {"id":"validation_test_assertions","evidence":"text differs (235→237 lines, 35442→35675 bytes)"}
  ],
  "evidence":{"openapi":"no diff","proto_features":"no diff","proto_tasks":"no diff","proto_users":"no diff","rpc_error_surface_users":"text differs (10→6 lines, 1334→770 bytes)","rpc_error_surface_tasks":"text differs (5→2 lines, 695→183 bytes)","rpc_error_surface_features":"no diff","db_migrations_features":"no diff","db_migrations_tasks":"no diff","db_migrations_users":"no diff","endpoint_matrix_api":"no diff","validation_test_assertions":"text differs (235→237 lines, 35442→35675 bytes)"}
}
```

### Surface-by-surface gate analysis

| # | Surface id | Tolerance | Diff | Decision |
|---|------------|-----------|------|----------|
| 1 | `openapi` | exact | no diff | PASS |
| 2 | `proto_features` | exact | no diff | PASS |
| 3 | `proto_tasks` | exact | no diff | PASS |
| 4 | `proto_users` | exact | no diff | PASS |
| 5 | `rpc_error_surface_users` | exact | 4 inline-throw lines moved out, 0 added | PASS via planner migration-parity exception (refactor-plan.md §"Behavior preservation envelope" point 1). Line-number-stripped semantic diff is empty. |
| 6 | `rpc_error_surface_tasks` | exact | 3 inline-throw lines moved out, 0 added | PASS via planner migration-parity exception (unchanged from iter 1). |
| 7 | `rpc_error_surface_features` | exact | no diff | PASS (Features-side migration is iter-3) |
| 8 | `db_migrations_features` | exact | no diff | PASS |
| 9 | `db_migrations_tasks` | exact | no diff | PASS |
| 10 | `db_migrations_users` | exact | no diff | PASS |
| 11 | `endpoint_matrix_api` | exact | no diff | PASS |
| 12 | `validation_test_assertions` | exact | line-number drift + 2 new test-helper lines (`tests/.../TestHelpers/ValidationPipeline.cs:22`); no asserted (StatusCode, Detail) tuple removed | **FAIL** — no migration-parity exception. Carried over from iter 1 (`RF-001`). |

### Detail of surface 5 (rpc_error_surface_users) — migration-parity exception applies

Lines absent in current (validator-driven; correctly moved into validators):

```
- OneMoreTaskTracker.Users/UserServiceHandler.cs:20:    throw new RpcException(new Status(StatusCode.InvalidArgument, "Email and password are required"));
- OneMoreTaskTracker.Users/UserServiceHandler.cs:23:    throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid email address"));
- OneMoreTaskTracker.Users/UserServiceHandler.cs:26:    throw new RpcException(new Status(StatusCode.InvalidArgument,
- OneMoreTaskTracker.Users/UserServiceHandler.cs:43:        throw new RpcException(new Status(StatusCode.InvalidArgument,
```

Lines only in current (state-driven throws; same `(StatusCode, Detail)` tuples as baseline, just at new line numbers because the file shrank by 30 lines after the inline guards were removed):

```
+ ...UserServiceHandler.cs:15:  AlreadyExists, "Email already registered"  (was line 30)
+ ...UserServiceHandler.cs:28:  InvalidArgument, "Invalid ManagerId"       (was line 48)
+ ...UserServiceHandler.cs:100: InvalidArgument, "Manager not found or user is not a manager" (was line 120)
+ ...UserServiceHandler.cs:137: NotFound, "User not found"                 (was line 157)
+ ...UserServiceHandler.cs:141: PermissionDenied, "User is not on your team" (was line 161)
```

The line-number-stripped diff is empty. Every surviving (StatusCode, Detail) tuple is byte-identical to baseline. **Migration-parity exception correctly applies.**

### Detail-string drift investigation (orchestrator-pinned)

Per the orchestrator's specific suspicions, I cross-checked the iter-2 Detail strings against `git show e21a3e40:OneMoreTaskTracker.Users/UserServiceHandler.cs`:

| Suspicion | Baseline Detail | Iter-2 location | Iter-2 Detail | Match? |
|-----------|-----------------|-----------------|---------------|--------|
| "email is required" / "password is required" consolidation | `"Email and password are required"` (single message at line 20 — **not** two separate "X is required" messages; the baseline already used the consolidated form) | `RegisterRequestValidator.cs:18` and `:25` | `"Email and password are required"` | **byte-identical** |
| Role list consolidation | `"Role must be one of: FrontendDeveloper, BackendDeveloper, Qa"` (line 43–44) | `RegisterRequestValidator.cs:33` | `"Role must be one of: FrontendDeveloper, BackendDeveloper, Qa"` | **byte-identical** |
| Password-length wording | `$"Password must be at least {MinPasswordLength} characters"` with `MinPasswordLength = 8` → wire text `"Password must be at least 8 characters"` | `RegisterRequestValidator.cs:27`, with same `MinPasswordLength = 8` const | `$"Password must be at least {MinPasswordLength} characters"` → wire text `"Password must be at least 8 characters"` | **byte-identical** |
| Email format | `"Invalid email address"` (line 23) | `RegisterRequestValidator.cs:20` | `"Invalid email address"` | **byte-identical** |
| Invalid manager id | `"Invalid ManagerId"` (line 48) | still in `UserServiceHandler.cs:28` | `"Invalid ManagerId"` | **byte-identical** |
| GetTeamRoster manager check | `"Manager not found or user is not a manager"` (line 120) | `UserServiceHandler.cs:100` (state-driven) AND `GetTeamRosterRequestValidator.cs:12` (request-shape `ManagerId > 0` rule emits the same message — see `RF-007`) | `"Manager not found or user is not a manager"` | **byte-identical** |

**No Detail-string wire drift.** The orchestrator's three feared scenarios (consolidation of `email/password is required`, paraphrase of the role list message, change in the password-length number) did not occur. The baseline already used the consolidated `"Email and password are required"` form; the validator faithfully reproduces it via `Cascade.Stop` on both the Email and Password rules.

### Detail of surface 12 (validation_test_assertions) — strict drift, no exception

Lines reflecting actual semantic change in test corpus (line-number-stripped):

```
- tests/OneMoreTaskTracker.Tasks.Tests/AttachTaskToFeatureHandlerTests.cs:  var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Detach(request, CreateContext()));
- tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:  var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Create(request, writer, ctx));
+ tests/OneMoreTaskTracker.Tasks.Tests/AttachTaskToFeatureHandlerTests.cs:  var ex = await Assert.ThrowsAsync<RpcException>(() =>
+ tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:  var ex = await Assert.ThrowsAsync<RpcException>(() =>
+ tests/OneMoreTaskTracker.Tasks.Tests/TestHelpers/ValidationPipeline.cs:  throw new RpcException(new Status(statusCode, ValidationDetailComposer.Compose(result.Errors)));
+ tests/OneMoreTaskTracker.Users.Tests/TestHelpers/ValidationPipeline.cs:  throw new RpcException(new Status(statusCode, ValidationDetailComposer.Compose(result.Errors)));
```

Two `Assert.ThrowsAsync` calls in the Tasks test suite were reformatted from one-line to multi-line; the `Should().Be(...)` / `Should().Contain(...)` assertions on subsequent lines are preserved verbatim. The new `ValidationPipeline.cs:22` throw lines are additive — the test helper that drives the wire-level pipeline. No asserted (StatusCode, Detail) tuple has been removed; new ones were added (the validator-test corpus exercises new failure paths).

This is the same situation as `RF-001` in iter 1: semantically benign, but the planner pinned this surface to `tolerance: exact` with no migration-parity exception. Per skill instruction "Do NOT silently widen tolerances", this evaluator must report drift even when the change is semantically benign.

## 2. MUST-improve axes table (per source-of-truth commands at HEAD `8d9b5a5b`)

| # | Axis | Baseline | Iter-1 | Iter-2 | Target | Status | Notes |
|---|------|----------|--------|--------|--------|--------|-------|
| 1 | `RpcException` throws in `*Validator.cs` / `*Validation.cs` | 4 | 4 | 4 | 0 | **partial (unchanged)** | Still all 4 inside `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs` (lines 24, 27, 35, 57). Iter-3 (commit (d)) closes this. |
| 2 | `FeatureValidation.cs` present | 1 | 1 | 1 | 0 | **not started** | Iter-3 (commit (d)) deletes it. |
| 3 | `AbstractValidator<T>` subclasses | 0 | 3 | 5 | ≥ 8 | **partial** | Tasks 3 + Users 2 = 5. 5 Features validators pending. |
| 4 | One type per file (validators) | n/a | 3/3 | 5/5 | 100% | **met** | Each `*Validator.cs` declares exactly one `public sealed class`. (Used the corrected regex `^public (sealed \|abstract \|static )?(class\|record\|interface\|enum) ` per `RF-005`.) |
| 5 | FluentValidation `PackageReference` per service | 0/3 | 1/3 | **2/3** | 3/3 | **partial** | Tasks + Users present; Features pending. |
| 6 | DI registrations (`AddValidatorsFromAssemblyContaining` / `AddScoped<IValidator`) | 0 | 1 | **2** | ≥ 3 | **partial** | Users `Program.cs:17` and Tasks `Program.cs:25`. Features pending. |
| 7 | `ValidationException`/`ValidationResult`/`ValidateAndThrowAsync`/`ValidateAsync(` references | 0 | 5 | **(qualitative) 2/3 services** | ≥ 3 (per-service signal) | **partial** | Each of Tasks + Users now has its own bounded-context interceptor + composer. Features pending. |
| 8 | `dotnet build OneMoreTaskTracker.slnx` | 0 (green) | 0 | **0 (green, 0 warnings)** | 0 | **met** | |
| 9 | `dotnet test` regression | green (421) | green (421) | **green (437)** | green | **met** | +16 net new validator tests (8 RegisterRequestValidatorTests + 8 GetTeamRosterRequestValidatorTests) all green; per-project: GitLab.Proxy 63 / Tasks 68 / Features 84 / Api 174 / Users 48 = 437. |
| 10 | Sibling `*ValidatorTests.cs` files | n/a | 3/3 | **5/5** | 100% | **met** | `tests/.../Validation/{Register,GetTeamRoster}RequestValidatorTests.cs` + 3 from iter-1. |

Source-of-truth command outputs verbatim:

```
$ grep -REn ': AbstractValidator<' --include='*.cs' -- ./OneMoreTaskTracker.Users ./OneMoreTaskTracker.Tasks ./OneMoreTaskTracker.Features | grep -v '/bin/' | grep -v '/obj/'
OneMoreTaskTracker.Users/Validators/GetTeamRosterRequestValidator.cs:6:public sealed class GetTeamRosterRequestValidator : AbstractValidator<GetTeamRosterRequest>
OneMoreTaskTracker.Users/Validators/RegisterRequestValidator.cs:8:public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureRequestValidator.cs:6:public sealed class AttachTaskToFeatureRequestValidator : AbstractValidator<AttachTaskToFeatureRequest>
OneMoreTaskTracker.Tasks/Tasks/Attach/DetachTaskFromFeatureRequestValidator.cs:7:public sealed class DetachTaskFromFeatureRequestValidator : AbstractValidator<DetachTaskFromFeatureRequest>
OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskRequestValidator.cs:6:public sealed class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
```

```
$ for p in OneMoreTaskTracker.{Users,Tasks,Features}/...csproj; do grep -q 'PackageReference Include="FluentValidation"' "$p" || echo "MISSING $p"; done
MISSING OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj
```

```
$ grep -REn 'AddValidatorsFromAssembly|AddScoped<IValidator' --include='*.cs' -- OneMoreTaskTracker.Users OneMoreTaskTracker.Tasks OneMoreTaskTracker.Features
OneMoreTaskTracker.Users/Program.cs:17:builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
OneMoreTaskTracker.Tasks/Program.cs:25:builder.Services.AddValidatorsFromAssemblyContaining<CreateTaskRequestValidator>();
```

## 3. Scoring

Weights from SHARED §"Scoring rubrics" → `### Refactor` (`0.45 / 0.20 / 0.20 / 0.15`):

| Criterion | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| `code_quality_delta` | 0.45 | 7 | 3.15 |
| `integration_and_conventions` | 0.20 | 8 | 1.60 |
| `test_coverage_delta` | 0.20 | 7 | 1.40 |
| `perf_envelope` | 0.15 | 9 | 1.35 |
| **WEIGHTED_TOTAL** | | | **7.50** |

(Note: the skill prompt mentions `0.40 / 0.25 / 0.25 / 0.10`; `GAN-FEATURE-SHARED.md` §"Refactor" pins `0.45 / 0.20 / 0.20 / 0.15` and SHARED is canonical. Using the canonical formula.)

### Justifications

- **`code_quality_delta` = 7/10** — score-must-improve-axes mapping: 4 met, 5 partial, 0 regressed → "all met/partial, none regressed → 7–8" band, lower end of band because two axes (1 and 2) are still at baseline (untouched, but still at baseline). Iter-2 advanced axes 3 (3→5), 5 (1→2), 6 (1→2), 7 (per-service: 1→2), 9 (+16 tests), 10 (3→5). The Users slice is internally coherent (validators + interceptor + composer + DI + sibling tests all advanced together) and mirrors the Tasks pattern from iter 1.
- **`integration_and_conventions` = 8/10** — Users-side interceptor + composer + DI registration mirror the Tasks pattern idiomatically; `public sealed class` per `~/.claude/rules/csharp/coding-style.md`; composer uses the planner-pinned `string.Join("; ", ...)` byte-identically; validators co-located in a `Validators/` subdirectory; per-service translator (NOT a shared one) preserves microservice bounded-context discipline. Minor deductions: (a) the Users-side `ValidationPipeline.cs` test helper now duplicates the production interceptor's `(CustomState, Compose)` translation a second time — same `RF-003` shape as iter 1, now in two services (`RF-003-02`); (b) the new `ValidationDetailComposer.cs` is `public static` in both Tasks and Users, when `internal` would be more appropriate (`RF-004-02`).
- **`test_coverage_delta` = 7/10** — `score-coverage-delta.mjs` cannot run (no LCOV instrumentation in this repo: `--baseline-coverage` is required and unavailable). Qualitatively: +16 new green validator tests; existing `UserServiceHandlerRegisterTests.cs` 8 validator-driven tests rerouted through the wire-level `ValidationPipeline.ValidateAsync` so the post-refactor (StatusCode, Detail) tuple is asserted (lines 25/26, 38/39, 51/52, 65/66, 78/79, 95/96, 287/288, 315/316, 376/377). State-driven tests (`AlreadyExists` for duplicate email at lines 118/119; `InvalidArgument` for invalid manager id at 140/141, 166/167) still call `Sut.Register` directly. Counter-signal: surface-12 strict drift (`RF-001` carried) reduces confidence by ~1 point. `COVERAGE_DELTA_PCT=null` (no LCOV).
- **`perf_envelope` = 9/10** — `dotnet test` real time on iter-2: ~3 s aggregate (longest project: Users 2 s; full suite parallel). Validators are sync, no DB / I/O — sub-millisecond per request. The new interceptor adds one `IValidator<T>` resolve + one `ValidateAsync` call per request; below the planner's pinned p50 ±10% / p95 ±20% envelope by orders of magnitude. -1 because no quantitative baseline was captured at Phase 0.

## 4. Issues

### Critical (P1) — block path forward

#### RF-001-02: `validation_test_assertions` surface still drifts (carried from iter 1)

- **Severity**: Critical (drives `AUTO_FAIL=true` on its own).
- **Status**: carried-over (RF-001 was raised in iter 1; iter-2 propagated the same pattern to the Users test corpus, so the drift volume grew rather than shrank).
- **What changed iter 2**: 8 `RegisterRequestValidator`-driven tests in `UserServiceHandlerRegisterTests.cs` were rerouted through `ValidationPipeline.ValidateAsync(...)` (lines 25/26, 38/39, 51/52, 65/66, 78/79, 95/96, 287/288, 315/316, 376/377 — preserving the asserted `StatusCode == InvalidArgument` tuple). One new `tests/OneMoreTaskTracker.Users.Tests/TestHelpers/ValidationPipeline.cs:22` line is captured as a `throw new RpcException(...)` site by the surface's grep regex.
- **Why this is drift even though semantic intent holds**: the planner pinned `validation_test_assertions` to `tolerance: exact` with no migration-parity exception. Every line-location change or additive line in the test corpus that contains the captured grep regex shows up as drift. The reformatting (Tasks side, iter 1) and the additive `ValidationPipeline.cs:22` lines (both Tasks and Users sides) are semantically benign — but the gate's job is line-byte identity.
- **Net effect on AUTO_FAIL**: this drift alone would force `AUTO_FAIL=true`. Iter 1 already set the same flag for the same reason; the orchestrator continued scoring per the harness's "continue scoring after drift" policy. The blocker on path forward remains.
- **`next_actions`** (in priority order; same shape as iter 1 RF-001):
  1. **Preferred** (planner re-entry): extend the migration-parity exception in `refactor-plan.md` §"Behavior preservation envelope" point 1 to cover `validation_test_assertions` for additive-only test-helper / cosmetic-formatting drift, with the rule "the (StatusCode, Detail) tuple set asserted by the test corpus MUST be a strict superset of baseline". This is the right resolution; the test corpus legitimately grows because new validator tests are added, and the existing wire-level assertions are preserved verbatim.
  2. **Acceptable workaround** (generator-side, narrow scope): delete the two `tests/.../TestHelpers/ValidationPipeline.cs` files and inline the same translation logic at every call site in the test corpus. This trades DRY for surface stability; not recommended (it materially hurts maintainability), but technically resolves the drift signal.
  3. **NOT acceptable**: silently widening surface 12's tolerance without an explicit planner amendment.
- **Recommendation to orchestrator**: trigger a planner re-entry between iter 2 and iter 3 to amend the migration-parity exception. Without this, every subsequent iteration will report `BEHAVIOR_DRIFT=true` for the same root cause and mask any real drift signals from iters 3–8.

### Major (P2) — fix in the next 1–2 iters

#### RF-002-02: 4 `RpcException` throws still inside `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs` (carried from iter 1)

- **Severity**: Major (axis 1 still at 4, target 0). Per `refactor-eval-rubric.md` §"Feature-specific addenda" / SHARED §"Refactor auto-fail triggers", a non-zero count on axis 1 at the FINAL iteration is auto-fail-grade for `code_quality_delta`. Iter 2 inherits this from baseline (Features-side migration is iter-3 commit (d) per planner sequence) — not a regression but the deadline is iter 3.
- **target_file**: `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs`
- **change**: Per planner commit (d): delete the file entirely; relocate `ParseOptionalDate` / `ValidateDateOrder` rules into `CreateFeatureRequestValidator`, `PatchFeatureRequestValidator`, `PatchFeatureStageRequestValidator`, `ListFeaturesRequestValidator`; relocate `ValidateStageOrder` into `PatchFeatureStageHandler` as a private `EnsureStageOrder` method (cross-aggregate check, NOT a request-shape rule).
- **status**: carried-over.

#### RF-003-02: `ValidationPipeline.cs` test helper duplicates production interceptor translation, now in TWO services

- **Severity**: Major (DRY-light, `integration_and_conventions` category). Iter 1 raised this for the Tasks side; iter 2 cloned the same shape into `tests/OneMoreTaskTracker.Users.Tests/TestHelpers/ValidationPipeline.cs:8-22`. Now both services have a test helper that re-implements the exact `CustomState as StatusCode? ?? StatusCode.InvalidArgument` lookup + `ValidationDetailComposer.Compose(...)` call from their respective `ValidationExceptionInterceptor.ValidateAsync` private method.
- **target_file**: `tests/OneMoreTaskTracker.Tasks.Tests/TestHelpers/ValidationPipeline.cs` + `tests/OneMoreTaskTracker.Users.Tests/TestHelpers/ValidationPipeline.cs`
- **change**: Extract a `public static class ValidationTranslator` (or `internal` with `InternalsVisibleTo`) per service inside `OneMoreTaskTracker.<Service>/Validation/` exposing `Translate<TRequest>(IValidator<TRequest>, TRequest, CancellationToken) -> Task`. Both `ValidationExceptionInterceptor.ValidateAsync` AND the test `ValidationPipeline.ValidateAsync` then delegate to it. Single source of truth per bounded context for the `(CustomState, Compose)` mapping. Generator note iter-002 explicitly defers this to iter-4 commit (e) — that is acceptable as long as it lands before iter 4 closes.
- **status**: carried-over (now multi-instance).

#### RF-004-02: `ValidationDetailComposer` accessibility too broad in TWO services

- **Severity**: Major (microservice contract hygiene). Same shape as iter 1 RF-004; iter 2 copied the `public static class ValidationDetailComposer` pattern from Tasks into Users. Both should be `internal static` plus `InternalsVisibleTo` for the test project. The composer is a translation-site implementation detail; it has no consumer outside its bounded-context.
- **target_file**: `OneMoreTaskTracker.Tasks/Validation/ValidationDetailComposer.cs` + `OneMoreTaskTracker.Users/Validation/ValidationDetailComposer.cs`
- **change**: Switch both to `internal static class`, add `<InternalsVisibleTo Include="OneMoreTaskTracker.<Service>.Tests" />` (or `[assembly: InternalsVisibleTo]`) per service so the test helper still compiles.
- **status**: carried-over (now multi-instance).

#### RF-007 (NEW): `GetTeamRosterRequestValidator` emits the state-driven message for a request-shape failure

- **Severity**: Major — wire-surface semantic concern that the contract gate did NOT catch.
- **target_file**: `OneMoreTaskTracker.Users/Validators/GetTeamRosterRequestValidator.cs:10-12`
- **What**: The validator declares `RuleFor(r => r.ManagerId).GreaterThan(0).WithMessage("Manager not found or user is not a manager");`. At baseline, `"Manager not found or user is not a manager"` was emitted from `UserServiceHandler.GetTeamRoster:120` ONLY when the DB lookup found no matching `Manager` row (state-driven). The validator now emits the same message for `ManagerId == 0` (or negative) — a request-shape failure.
- **Why this matters**: the Detail string is byte-identical to baseline, so the `validation_test_assertions` surface and the `rpc_error_surface_users` surface (after migration-parity) are both happy. BUT: an integration test that today calls `GetTeamRoster(ManagerId=0)` expecting `InvalidArgument: "Manager not found or user is not a manager"` would have hit a DB lookup at baseline (with `ManagerId=0` → 0 rows → manager null → throw); the new path short-circuits before the DB. Wire-level Detail tuple is unchanged. **No baseline test exists for `ManagerId=0` on `GetTeamRoster`** (per generator-notes-iter-002 §"Files touched": "`UserServiceHandlerGetTeamRosterTests.cs` not modified — its 4 tests all use positive `ManagerId` values"). So no test regressed.
- **However** the generator's choice to emit a state-driven message from a request-shape validator violates the planner's principle that the validator covers "single-request shape, not cross-aggregate" — and conflates two different failure semantics behind one Detail string. A future change to the state-driven message (e.g. "Manager 42 not found") would then have to scrub two emit sites, not one.
- **`next_actions`**:
  1. Either: drop the validator's `WithMessage(...)` and let the rule emit FluentValidation's default `"'Manager Id' must be greater than '0'."` for the request-shape case — but this CHANGES the wire surface for a potential `ManagerId=0` test. Risky.
  2. Better: drop the entire `GetTeamRoster` validator. The `GetTeamRosterRequest.ManagerId` field has no other request-shape rule; the existing handler check at line 100 catches `ManagerId=0` (DB returns null) and emits the same message anyway. Removing the validator (and the empty Users-side `Validators/` axis-3 contribution dropping from 2 to 1) is the cleanest path. Axis 3 still passes the floor of ≥ 8 once iter 3 lands the 5 Features validators (5 → 7 + 5 = 12 → still ≥ 8 even without GetTeamRoster).
  3. OR: keep the validator but change the Detail string to a request-shape-specific message like `"manager_id must be greater than 0"`. This DOES change the wire surface (new Detail string for the `ManagerId=0` case), so it requires confirmation that no test today asserts `"Manager not found or user is not a manager"` for the `ManagerId=0` input — see point 2 above.
- **status**: new.

### Minor (P3) — nits

#### RF-005 (carried, instrumental): planner axis-4 source-of-truth grep regex still under-restrictive

- Same as iter 1 RF-005. Fixed by manual workaround (corrected regex). Calls for planner re-entry to amend the axis-4 command. Not generator-attributable; flagged for completeness.

#### RF-006 (carried, no action): `ValidationPipeline.ValidateAsync` async naming

- Same as iter 1; non-issue (already correctly `Async`-suffixed).

## 5. Per-axis movement summary (iter-1 → iter-2)

| Axis | Iter-1 | Iter-2 | Delta |
|------|--------|--------|-------|
| 1 — RpcException in *Validator/*Validation | 4 | 4 | 0 (target 0; unchanged, expected) |
| 2 — FeatureValidation.cs present | 1 | 1 | 0 (target 0; unchanged, expected) |
| 3 — AbstractValidator subclasses | 3 | 5 | +2 |
| 4 — One-type-per-file (validators) | 3/3 | 5/5 | +2 |
| 5 — FluentValidation csproj refs | 1/3 | 2/3 | +1 |
| 6 — DI registrations | 1 | 2 | +1 |
| 7 — Validation API references | 1/3 services | 2/3 services | +1 |
| 8 — Build green | 0 | 0 | 0 (met) |
| 9 — Test count + pass | 421 green | 437 green | +16 (met) |
| 10 — Sibling validator tests | 3/3 | 5/5 | +2 |

All axis movement is forward; zero regression. Two axes (1, 2) still untouched — these are the iter-3 Features-side deletion targets per the planner sequence.

## 6. Carry into iter 3

Concrete next-slice items (planner commit (d), Features-side):

1. **(highest priority)** Resolve `RF-001-02` via planner re-entry to extend the migration-parity exception to `validation_test_assertions`. Without this, `AUTO_FAIL=true` will fire on every subsequent iteration for the same root cause.
2. **Iter 3: migrate Features service + delete `FeatureValidation.cs`** — per planner commit (d). Target axes 1 → 0, 2 → 0, 3 → ≥ 10 (5 + 5 Features validators), 5 → 3/3, 6 → 3 (Features `Program.cs` registration), 7 → 3/3 services, 10 → 10/10 in the same iter.
3. **Iter 3 must also**: move `StagePlanSnapshot` record out of `FeatureValidation.cs` into its own file (`Features/Data/StagePlanSnapshot.cs`) before deleting the parent (one-type-per-file rule). Move `MinYear=2000`/`MaxYear=2100` constants into a new `FeatureDateRange.cs` (or as `private const` on the relevant validators).
4. **Iter 3 must also**: move `ValidateStageOrder` into `PatchFeatureStageHandler` as a private `EnsureStageOrder(feature, stageOrdinal)` method (cross-aggregate check, NOT a validator rule).
5. **Iter 3 should ALSO** apply `RF-003-02` and `RF-004-02` resolutions to all three services from the start (single shared `ValidationTranslator` per bounded context, `internal` composer with `InternalsVisibleTo`) — sets up iter 4 for the multi-failure integration test (commit (e)) without dragging tech-debt cleanup along.
6. **Iter 3 should ALSO** address `RF-007` (drop `GetTeamRosterRequestValidator` OR change its Detail string to a request-shape-specific message). Recommendation: drop the validator entirely; the existing handler check covers `ManagerId=0` with the same message.

## 7. Notes for the orchestrator

- `BEHAVIOR_DRIFT=true` (surface 12 strict-drift, see `RF-001-02`; surfaces 5 and 6 PASS via planner migration-parity exception).
- `BASELINE_TESTS_REGRESSED=false` (compare-mode parser: 0 regressed of 0 baseline tests).
- `COVERAGE_DELTA_PCT=null` — no LCOV instrumentation in this repo; not blocking.
- `PERF_ENVELOPE_OK=true` — no quantitative baseline at Phase 0; soft-pass on `dotnet test` aggregate ~3 s well within reasonable bounds for a 437-test C# suite.
- `WEIGHTED_TOTAL=7.50` — informational only; `AUTO_FAIL=true` so the verdict is `FAIL` regardless.
- **No Detail-string wire drift detected.** All four orchestrator-pinned suspicions (Email/password consolidation, role-list paraphrase, password-length number change, MailAddress message change) verified against `git show e21a3e40:OneMoreTaskTracker.Users/UserServiceHandler.cs`. Every `(StatusCode, Detail)` tuple emitted by the post-refactor service is byte-identical to baseline.

## next_actions

```json
[
  { "id": "RF-001-02", "severity": "critical", "target_file": "gan-harness-refactor/implement-validation-via-fluentvalidator/refactor-plan.md", "change": "extend migration-parity exception in §Behavior preservation envelope point 1 to cover validation_test_assertions for additive-only test-helper / cosmetic-formatting drift; rule: the (StatusCode, Detail) tuple set asserted by the test corpus MUST be a strict superset of baseline", "ref": "Behavior preservation envelope", "status": "carried-over" },
  { "id": "RF-002-02", "severity": "major", "target_file": "OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs", "change": "delete the file; move ParseOptionalDate/ValidateDateOrder logic into the relevant Features validators; move ValidateStageOrder into PatchFeatureStageHandler as a private EnsureStageOrder method", "ref": "Planned commits — commit (d)", "status": "carried-over" },
  { "id": "RF-003-02", "severity": "major", "target_file": "tests/OneMoreTaskTracker.{Tasks,Users}.Tests/TestHelpers/ValidationPipeline.cs", "change": "extract a per-service ValidationTranslator class shared by ValidationExceptionInterceptor.ValidateAsync and the test helper; both call sites delegate to a single (CustomState, Compose) mapping", "ref": "Planned commits — commit (e)", "status": "carried-over" },
  { "id": "RF-004-02", "severity": "major", "target_file": "OneMoreTaskTracker.{Tasks,Users}/Validation/ValidationDetailComposer.cs", "change": "change to internal static class; add InternalsVisibleTo for the per-service test project", "ref": "C# patterns — explicit access modifiers on internal APIs", "status": "carried-over" },
  { "id": "RF-007", "severity": "major", "target_file": "OneMoreTaskTracker.Users/Validators/GetTeamRosterRequestValidator.cs", "change": "drop the validator entirely (handler at line 100 already emits the same Detail for ManagerId=0 via the DB lookup) OR change its WithMessage(...) to a request-shape-specific string and confirm no test asserts the state-driven message for ManagerId<=0", "ref": "Scope boundary — request-shape vs state-driven split", "status": "new" },
  { "id": "RF-005", "severity": "minor", "target_file": "gan-harness-refactor/implement-validation-via-fluentvalidator/refactor-plan.md", "change": "amend axis-4 grep regex to ^public (sealed |abstract |static )?(class|record|interface|enum) ", "ref": "Target axes — axis 4", "status": "carried-over" }
]
```
