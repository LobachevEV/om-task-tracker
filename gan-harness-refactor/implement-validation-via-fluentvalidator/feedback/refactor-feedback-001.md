# Refactor Feedback — iter 001

Track: backend
Iteration: 1 / 8
Generator commit: `20bf53d035a589f4b289af81d6bd37fd75d8ec66`
Baseline SHA: `e21a3e403eeab550bed65b6c14db29fd41fdcd9e`

## 1. Behavior-preservation gate (PRIMARY)

**Verdict: RED — `BEHAVIOR_DRIFT=true`**

`diff-behavior-contract.mjs` evidence (verbatim):

```
{
  "BEHAVIOR_DRIFT": true,
  "diffs": [
    {"id":"rpc_error_surface_tasks","evidence":"text differs (5→2 lines, 695→183 bytes)"},
    {"id":"validation_test_assertions","evidence":"text differs (235→236 lines, 35442→35496 bytes)"}
  ]
}
```

### Surface-by-surface gate analysis

| # | Surface id | Tolerance | Diff result | Gate decision |
|---|------------|-----------|-------------|----------------|
| 1 | `openapi` | exact | no diff | PASS |
| 2 | `proto_features` | exact | no diff | PASS |
| 3 | `proto_tasks` | exact | no diff | PASS |
| 4 | `proto_users` | exact | no diff | PASS |
| 5 | `rpc_error_surface_users` | exact | no diff | PASS |
| 6 | `rpc_error_surface_tasks` | exact | text differs | PASS via planner-pinned migration-parity exception (refactor-plan.md §"Behavior preservation envelope" point 1). |
| 7 | `rpc_error_surface_features` | exact | no diff | PASS (Features service untouched this iter — expected). |
| 8 | `db_migrations_features` | exact | no diff | PASS |
| 9 | `db_migrations_tasks` | exact | no diff | PASS |
| 10 | `db_migrations_users` | exact | no diff | PASS |
| 11 | `endpoint_matrix_api` | exact | no diff | PASS |
| 12 | `validation_test_assertions` | exact | text differs | **FAIL — no migration-parity exception in plan.** |

### Detail of surface 6 (migration-parity exception applies)

Lines only in baseline (3 of 4 are validator-driven `InvalidArgument` throws — these correctly moved to the interceptor):

```
- OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureHandler.cs:16:    throw new RpcException(new Status(StatusCode.InvalidArgument, "jira_task_id is required"));
- OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureHandler.cs:18:    throw new RpcException(new Status(StatusCode.InvalidArgument, "feature_id is required"));
- OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureHandler.cs:22:    ?? throw new RpcException(new Status(StatusCode.NotFound, $"task {request.JiraTaskId} not found"));
- OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskHandler.cs:22:    throw new RpcException(new Status(StatusCode.InvalidArgument, "feature_id is required"));
```

Lines only in current:

```
+ OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureHandler.cs:17:    ?? throw new RpcException(new Status(StatusCode.NotFound, $"task {request.JiraTaskId} not found"));
```

The surviving `NotFound` throw (state-derived, not validator-driven) reappears at line 17 (was 22) — same `(StatusCode, Detail)` tuple. The 3 InvalidArgument tuples are preserved on the wire via the interceptor + composer (validated by the still-passing handler tests + the validator-pipeline tests). **Migration-parity exception correctly applied.**

### Detail of surface 12 (NO exception in plan — strict drift)

Lines only in baseline:

```
- tests/OneMoreTaskTracker.Tasks.Tests/AttachTaskToFeatureHandlerTests.cs:35: var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Attach(request, CreateContext()));
- tests/OneMoreTaskTracker.Tasks.Tests/AttachTaskToFeatureHandlerTests.cs:88: var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Detach(request, CreateContext()));
- tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:192: var ex = await Assert.ThrowsAsync<RpcException>(() => handler.Create(request, writer, ctx));
- tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:193: ex.StatusCode.Should().Be(StatusCode.InvalidArgument);
- tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:194: ex.Status.Detail.Should().Contain("feature_id");
```

Lines only in current:

```
+ tests/OneMoreTaskTracker.Tasks.Tests/AttachTaskToFeatureHandlerTests.cs:34: var ex = await Assert.ThrowsAsync<RpcException>(() =>
+ tests/OneMoreTaskTracker.Tasks.Tests/AttachTaskToFeatureHandlerTests.cs:87: var ex = await Assert.ThrowsAsync<RpcException>(() =>
+ tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:185: var ex = await Assert.ThrowsAsync<RpcException>(() =>
+ tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:188: ex.StatusCode.Should().Be(StatusCode.InvalidArgument);
+ tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs:189: ex.Status.Detail.Should().Contain("feature_id");
+ tests/OneMoreTaskTracker.Tasks.Tests/TestHelpers/ValidationPipeline.cs:22: throw new RpcException(new Status(statusCode, ValidationDetailComposer.Compose(result.Errors)));
```

**Semantic analysis**: every previously-asserted assertion is preserved verbatim — the 3 `Assert.ThrowsAsync` lambdas were reformatted from single-line to multi-line (the closing `=> handler.X(...)` moved to the next line, splitting one captured grep line into one captured line + one unmatched line). The 2 `StatusCode.Should().Be(...)` and `Status.Detail.Should().Contain(...)` assertions exist verbatim, just at lines 188/189 (was 193/194). One additive line in the new `ValidationPipeline.cs` test helper accounts for the +1 net line count.

**No assertion has been relaxed.** No `(StatusCode, Detail)` tuple is missing from the test corpus. The drift is purely cosmetic + additive. The rubric's stated intent (line 37 of `refactor-eval-rubric.md`: "If a generator changes a test assertion to make it pass, this surface breaks") is NOT triggered — the generator did not change an assertion to mask a behavior diff.

**However**, the planner pinned this surface to `tolerance: exact` with no migration-parity exception, and a non-empty diff is the literal definition of `BEHAVIOR_DRIFT=true`. Per skill instructions ("Do NOT silently widen tolerances"), this is reported as drift. See `RF-001` below.

## 2. MUST-improve axes table (per source-of-truth commands)

| # | Axis | Baseline | Iter-1 | Target | Status | Notes |
|---|------|----------|--------|--------|--------|-------|
| 1 | `RpcException` throws in `*Validator.cs` / `*Validation.cs` | 4 | 4 | 0 | **partial** | Tasks contributes 0; remaining 4 are inside `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs` (lines 24, 27, 35, 57). Untouched this iter — expected per slice plan. |
| 2 | `FeatureValidation.cs` present | 1 | 1 | 0 | **not started** | Will be deleted in iter-3 (commit (d)). |
| 3 | `AbstractValidator<T>` subclasses | 0 | 3 | ≥ 8 | **partial** | All 3 Tasks request types covered (Create, Attach, Detach). 5 Features + 2 Users still pending. |
| 4 | One type per file (validators) | n/a | 3/3 | 100% | **met** | NOTE: planner's source-of-truth grep `^public (class\|record\|interface\|enum) ` excludes `public sealed class`. Manual inspection confirms each `*Validator.cs` declares exactly one public type. See `RF-005` (planner-instrument issue, not generator-attributable). |
| 5 | FluentValidation `PackageReference` per service | 0/3 | 1/3 | 3/3 | **partial** | Tasks only. `Users` + `Features` `.csproj` still missing. |
| 6 | DI registrations | 0 | 1 | ≥ 3 | **partial** | `OneMoreTaskTracker.Tasks/Program.cs:25` uses `AddValidatorsFromAssemblyContaining<CreateTaskRequestValidator>()`. Users + Features `Program.cs` pending. |
| 7 | `ValidationException`/`ValidationResult`/`ValidateAsync(` references | 0 | 5 | ≥ 3 (per-service signal) | **partial** | All 5 hits are in Tasks. Per-service intent: 1 of 3 services covered. |
| 8 | `dotnet build` exit | 0 | 0 | 0 | **met** | Build green, 2 pre-existing warnings. |
| 9 | `dotnet test` regression | green | green (421/421) | green | **met** | All test projects green: GitLab.Proxy 63, Tasks 68, Features 84, Api 174, Users 32 = 421. |
| 10 | Sibling `*ValidatorTests.cs` files | n/a | 3/3 | 100% | **met** | Each new validator has a sibling test file under `tests/OneMoreTaskTracker.Tasks.Tests/Validation/`. |

Source-of-truth command output verbatim (current SHA `20bf53d`):

```
$ grep -REn ': AbstractValidator<' --include='*.cs' -- ./OneMoreTaskTracker.Users ./OneMoreTaskTracker.Tasks ./OneMoreTaskTracker.Features | grep -v '/bin/' | grep -v '/obj/'
OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureRequestValidator.cs:6:public sealed class AttachTaskToFeatureRequestValidator : AbstractValidator<AttachTaskToFeatureRequest>
OneMoreTaskTracker.Tasks/Tasks/Attach/DetachTaskFromFeatureRequestValidator.cs:7:public sealed class DetachTaskFromFeatureRequestValidator : AbstractValidator<DetachTaskFromFeatureRequest>
OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskRequestValidator.cs:6:public sealed class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
```

```
$ for p in OneMoreTaskTracker.{Users,Tasks,Features}/OneMoreTaskTracker.{Users,Tasks,Features}.csproj; do grep -q 'PackageReference Include="FluentValidation"' "$p" || echo "MISSING $p"; done
MISSING OneMoreTaskTracker.Users/OneMoreTaskTracker.Users.csproj
MISSING OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj
```

```
$ grep -REn 'AddValidatorsFromAssembly|AddScoped<IValidator' --include='*.cs' -- OneMoreTaskTracker.Users OneMoreTaskTracker.Tasks OneMoreTaskTracker.Features | grep -v '/bin/' | grep -v '/obj/'
OneMoreTaskTracker.Tasks/Program.cs:25:builder.Services.AddValidatorsFromAssemblyContaining<CreateTaskRequestValidator>();
```

## 3. Scoring

Weights anchored in `GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`:

| Criterion | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| `code_quality_delta` | 0.40 | 5 | 2.00 |
| `integration_and_conventions` | 0.25 | 8 | 2.00 |
| `test_coverage_delta` | 0.25 | 6 | 1.50 |
| `perf_envelope` | 0.10 | 9 | 0.90 |
| **WEIGHTED_TOTAL** | | | **6.40** |

### Justifications

- **`code_quality_delta` = 5/10**: 1 of 7 quality axes met (axis 4); 6 partial. No regression on any axis. Per skill rubric ("mostly partial → 5–6"). Tasks slice fully internally consistent (axes 3, 5, 6, 7, 10 all advanced together — no incoherent partial wiring).
- **`integration_and_conventions` = 8/10**: gRPC interceptor + composer + DI registration are idiomatic ASP.NET Core / FluentValidation. `public sealed class` per `~/.claude/rules/csharp/coding-style.md`. Composer matches planner-pinned `string.Join("; ", failures.Select(f => f.ErrorMessage))` byte-identically. Detach validator correctly uses `WithState(_ => StatusCode.FailedPrecondition)` for the non-`InvalidArgument` path. Validators co-located with handler subdirectories per existing convention. Minor deduction: `ValidationPipeline.cs` test helper duplicates the interceptor's translation logic (see `RF-003`).
- **`test_coverage_delta` = 6/10**: No LCOV available (no coverage collector wired into the repo) so the >2% drop auto-fail trigger cannot fire numerically — `COVERAGE_DELTA_PCT=null`. Qualitatively: 3 sibling `*ValidatorTests.cs` added (rule-pass + rule-fail per declared rule), 1 `ValidationPipeline.cs` test helper, 2 modified handler tests rerouted through the wire-level pipeline. All 421 tests green. Counter-signal: surface-12 drift (`RF-001`) — even cosmetic, reduces confidence that "tests are byte-identical" claim holds.
- **`perf_envelope` = 9/10**: `dotnet test` real time 4.50s on iter-1; baseline timing not captured at Phase 0, so this is a static signal only. FluentValidation rules are sync, no DB / I/O — sub-millisecond per request. No regression observed. -1 because no quantitative baseline reference.

## 4. Issues

### Critical (P1) — block path forward

#### RF-001: `validation_test_assertions` surface drifted with no planner-pinned exception

- **Severity**: Critical (per rubric: surface 12 is `tolerance: exact`, no migration-parity exception granted; non-empty diff = `BEHAVIOR_DRIFT=true` = auto-fail).
- **What changed**: 5 baseline lines absent + 6 new lines, net +1 line. Inspection shows 3 single-line `Assert.ThrowsAsync<RpcException>(() => handler.X(...))` calls were reformatted into 3 multi-line `Assert.ThrowsAsync<RpcException>(() => \n     handler.X(...))` calls in `AttachTaskToFeatureHandlerTests.cs` + `CreateTaskHandlerTests.cs`. Two `Should()` assertion lines moved by 5 lines (192→188, 193→189) due to that reformatting. The new `tests/.../TestHelpers/ValidationPipeline.cs:22` line is additive — a `throw new RpcException(...)` in the test pipeline helper.
- **Why this is drift even though semantic intent holds**: the planner-rubric line 37 explicitly intends this surface to detect assertion relaxation. The reformatting did not relax assertions — every asserted `(StatusCode, Detail)` tuple is preserved verbatim. But the planner did NOT grant a migration-parity exception for surface 12 (it pinned exceptions for surfaces 5–7 only). Per skill instruction "Do NOT silently widen tolerances", this evaluator must report drift even when the change is semantically benign.
- **`next_actions`** (in priority order):
  1. Preferred: revert the multi-line `Assert.ThrowsAsync` reformatting in `AttachTaskToFeatureHandlerTests.cs` (lines 34, 87) and `CreateTaskHandlerTests.cs` (line 185) so each `Assert.ThrowsAsync<RpcException>(() => handler.X(...));` stays single-line. The reformatting has no functional value — the original single-line form is well within typical xUnit + FluentAssertions style. After reverting, re-run `node ~/.claude/scripts/gan-feature/diff-behavior-contract.mjs` and confirm only `rpc_error_surface_tasks` drifts (which has a planner-pinned exception).
  2. Acceptable alternative: request a planner amendment that extends the migration-parity exception in `refactor-plan.md` §"Behavior preservation envelope" point 1 to also cover `validation_test_assertions` for additive-only test-helper / cosmetic-formatting drift, with the rule "the (StatusCode, Detail) tuple set asserted by the test corpus MUST be a strict superset of baseline". This requires planner re-entry, not generator action.
  3. NOT acceptable: relax surface 12's tolerance without an explicit planner amendment.

### Major (P2) — fix in the next 1–2 iters

#### RF-002: 4 `RpcException` throws still live inside `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs`

- **Severity**: Major (axis 1 not at target; per `refactor-eval-rubric.md` §"Feature-specific addenda", "zero `throw new RpcException` lines may remain inside any file matching `*Validator.cs` or `*Validation.cs`. … One occurrence is auto-fail-grade for `code_quality_delta`."). Iter 1 inherits this from baseline, so it is not a regression — but the iter-3 commit (d) MUST close it. If commit (d) lands without removing those 4 lines, axis 1 fails the auto-fail trigger.
- **`next_actions`**: per planner commit (d), delete `FeatureValidation.cs` entirely; relocate `ParseOptionalDate`/`ValidateDateOrder`/`ValidateStageOrder` logic into the relevant FluentValidation validators (`CreateFeatureRequestValidator`, `PatchFeatureStageRequestValidator`) plus a private `EnsureStageOrder` method on `PatchFeatureStageHandler` for the cross-aggregate ordering check.

#### RF-003: `ValidationPipeline.cs` test helper duplicates `ValidationExceptionInterceptor` translation logic

- **Severity**: Major (DRY-light, `integration_and_conventions` category).
- **What**: `tests/OneMoreTaskTracker.Tasks.Tests/TestHelpers/ValidationPipeline.cs:8-22` re-implements the exact same `CustomState as StatusCode? ?? StatusCode.InvalidArgument` lookup and `ValidationDetailComposer.Compose(...)` call that `OneMoreTaskTracker.Tasks/Validation/ValidationExceptionInterceptor.cs:39-43` already performs. Today it works because `ValidationDetailComposer` is `public static`; if the composer's signature changes, both call sites must update.
- **Why it slipped through**: tests cannot drive the gRPC interceptor without `WebApplicationFactory<Program>` — a thin direct-invocation helper is reasonable. But the helper should _delegate_ to the production translation, not duplicate it.
- **`next_actions`**: extract a `public static class ValidationTranslator` with one method `Translate<TRequest>(IValidator<TRequest>, TRequest, CancellationToken) -> Task` in `OneMoreTaskTracker.Tasks/Validation/`. Both `ValidationExceptionInterceptor.ValidateAsync` and the test `ValidationPipeline.ValidateAsync` then call into it. Single source of truth for the `(CustomState, Compose)` mapping; no ergonomics lost.

#### RF-004: `ValidationDetailComposer` accessibility too broad for an internal-only helper

- **Severity**: Major (microservice contract hygiene; `integration_and_conventions` category).
- **What**: `OneMoreTaskTracker.Tasks/Validation/ValidationDetailComposer.cs` declares `public static class ValidationDetailComposer`. The class is a translation-site implementation detail; it has no consumer outside the Tasks service (and its test project, which lives in the same solution and can use `InternalsVisibleTo`).
- **`next_actions`**: change to `internal static class ValidationDetailComposer` and add `<InternalsVisibleTo Include="OneMoreTaskTracker.Tasks.Tests" />` (or equivalent `[assembly: InternalsVisibleTo(...)]`) so the test helper still compiles. This applies the project rule "Prefer explicit access modifiers on public and internal APIs" and avoids leaking a translation-format helper across the bounded-context boundary.

### Minor (P3) — nits

#### RF-005: planner axis-4 source-of-truth grep regex is too restrictive

- **Severity**: Minor (planner-instrument defect; NOT generator-attributable; but flagged so the next planner re-entry can fix it).
- **What**: `refactor-plan.md` row 4 axis command uses `grep -cE '^public (class\|record\|interface\|enum) ' "$f"`. This excludes `public sealed class` (the idiomatic, project-required form per `~/.claude/rules/csharp/coding-style.md`). Result: every correctly-authored `public sealed class XxxValidator : AbstractValidator<...>` returns 0 public types and reads as a violation.
- **Workaround applied this iter**: manual inspection confirmed each of the 3 new `*Validator.cs` files declares exactly one top-level public type. Axis 4 scored as `met`.
- **`next_actions`** (planner re-entry only): change the regex to `^public (sealed |abstract |static )?(class|record|interface|enum) ` and re-baseline the axis-4 command on the next planner pass. Until then, evaluator overrides axis 4 by manual inspection per iteration.

#### RF-006: `ValidationPipeline.ValidateAsync` is not async-suffixed in its method name

- **Severity**: Minor (style nit). The C# convention is to suffix async methods with `Async`. The helper method is named `ValidateAsync` already, so this is a non-issue — included only for completeness; no action.

## 5. Carry into iter 2

Concrete next-slice items, ordered by dependency:

1. **(blocker) Resolve `RF-001`** — either revert test reformatting OR escalate planner amendment. Until resolved, the harness will report `BEHAVIOR_DRIFT=true` on every subsequent iteration, masking real drift signals from iters 2–8.
2. **Iter 2: migrate Users service** — per planner commit (b):
   - Add `<PackageReference Include="FluentValidation" Version="11.x" />` + `<PackageReference Include="FluentValidation.DependencyInjectionExtensions" Version="11.x" />` to `OneMoreTaskTracker.Users.csproj`.
   - Add `services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();` to `OneMoreTaskTracker.Users/Program.cs`.
   - Choose translation strategy: planner permits handler-prelude `await _validator.ValidateAndThrowAsync(...); catch ValidationException` OR a `ValidationExceptionInterceptor` mirroring Tasks. Recommendation: mirror Tasks (interceptor) — minimizes per-service drift in the translation pattern; pays for itself when iter-3 wires Features.
   - Author `RegisterRequestValidator` (rules: `Email NotEmpty`, `Email matches MailAddress`, `Password NotEmpty`, `Password MinimumLength 8`, conditional `When(r => r.ManagerId != 0)` block for role-membership + manager-id). NEVER add a settable `Role` rule (`~/.claude/rules/microservices/security.md` — privilege-granting fields).
   - Optional `GetTeamRosterRequestValidator` if any request-shape rules apply (`ManagerId > 0`); otherwise document why the file was omitted. The "Manager not found or user is not a manager" rule is state-driven and stays in the handler.
   - Sibling `*ValidatorTests.cs` per validator, rule-pass + rule-fail per declared rule.
   - Delete the inline guard throws from `UserServiceHandler.Register` covering the 4 InvalidArgument paths (email/password required, email format, password length, role membership, Invalid ManagerId).
   - Apply `RF-003` and `RF-004` resolutions to the Users service from the start (single shared `ValidationTranslator`, `internal` composer if possible).
3. **Iter 3: migrate Features service + delete `FeatureValidation.cs`** — per planner commit (d). Target axis 1 → 0 and axis 2 → 0 in the same iter. Move `StagePlanSnapshot` out to its own file before deleting the parent.
4. **Iter 4 (final): wiring smoke + multi-failure integration test** — per planner commit (e). Confirm DI container resolves `IValidator<TRequest>` for every covered request type; assert multi-failure `;`-joined Detail composition is byte-deterministic across runs.

## 6. Notes for the orchestrator

- `BASELINE_TESTS_REGRESSED=false` (compare-mode generic parser, exit 0).
- `BEHAVIOR_DRIFT=true` (surface 12, see `RF-001`). One auto-fail trigger fired.
- `COVERAGE_DELTA_PCT=null` — no LCOV instrumentation in this repo; not blocking.
- `PERF_ENVELOPE_OK=true` — no timing baseline captured, but `dotnet test` real-time 4.50s is well within reasonable bounds for a 421-test C# suite. Treat as soft-pass.
- `WEIGHTED_TOTAL=6.40` — informational only when `AUTO_FAIL=true`; verdict is `FAIL` regardless.
