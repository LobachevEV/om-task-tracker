# Refactor Feedback — per-request-datetime-provider — iter 002

Iteration: 2
Generator commit: 55cd078541009f8a60610ccd58f8167419720aaa
Working-tree HEAD evaluated: 55cd078541009f8a60610ccd58f8167419720aaa
Behavior drift: false (gate green; only `test_corpus_assertion_count` differs and is planner-pinned additive-only)
Weighted total: 7.32

## Behavior preservation gate

- Status: **PASS**
- Re-capture: `gan-harness-refactor/per-request-datetime-provider/.iter/2/behavior-contract.json` (label `iter-2`, captured at HEAD `55cd078`).
- Frozen baseline: `gan-harness-refactor/per-request-datetime-provider/behavior-contract.json` (re-captured at `b96117e` after `RF-001-01` was applied; see iter-1 feedback for the surface-tightening rationale).

`diff-behavior-contract.mjs` evidence map (verbatim):

| Surface | Tolerance | Evidence |
|---------|-----------|----------|
| `openapi_json` | exact | no diff |
| `features_proto_surface` | exact | no diff |
| `feature_entity_shape` | exact | no diff |
| `ef_migrations_history` | exact | no diff |
| `ef_schema_columns` | exact | no diff |
| `api_endpoint_matrix` | exact | no diff |
| `jwt_claims_and_expiration_shape` | exact | no diff |
| `test_corpus_assertion_count` | exact (planner-pinned additive-only exception) | text differs (969 → 977, +8) — strict-superset additive ⇒ parity per plan |

`BEHAVIOR_DRIFT=true` was set by the diff script because the `test_corpus_assertion_count` surface bytes changed, but the planner pre-pinned a strict-superset additive exception for that one surface (see `refactor-plan.md` §"Behavior preservation envelope" → "Pre-pinned migration-parity exception"). Baseline 969 → current 977 (+8) is strict-superset; no existing assertion was deleted (the 7 other surfaces — including the entity-shape, schema, and endpoint matrices that would catch any incidental touch — all show `no diff`). Treated as parity per plan. `AUTO_FAIL` is therefore overridden to `false`.

The +8 delta is consistent with iter-1's 4 new `RequestClock` `[Fact]` tests landing in the corpus (no new tests added in iter-2's commit; the iter-1 tests now compile against the iter-2 handler signatures and are counted under the assertion-grep).

## Baseline-test regression check

- `check-baseline-tests.mjs --mode compare` returned `BASELINE_TESTS_REGRESSED=false` with evidence `ran 0 tests, 0 regressed (baseline had 0)` — vacuous because `baseline-tests.json` has `tests: {}` (RF-001-06 sticky from iter-1).
- Direct cross-check: `dotnet test OneMoreTaskTracker.slnx --nologo` → **470/470 pass, 0 failed** (Tasks 68, Users 45, Features 118, GitLab.Proxy 63, Api 176). 0 build errors, 0 build warnings. No regression.

## MUST-NOT-touch cross-check (manual)

`git diff --name-only b96117e..55cd078`:

```
OneMoreTaskTracker.Api/Program.cs                                                # in-scope (DI block; iter-1)
OneMoreTaskTracker.Api/Time/IRequestClock.cs                                     # in-scope (iter-1, new file)
OneMoreTaskTracker.Api/Time/RequestClock.cs                                      # in-scope (iter-1, new file)
OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs              # in-scope (iter-2 migration)
OneMoreTaskTracker.Features/Features/Data/IRequestClock.cs                       # in-scope (iter-1, new file)
OneMoreTaskTracker.Features/Features/Data/PlannedDate.cs                         # in-scope-adjacent (interim 3c4deca; not iter-2)
OneMoreTaskTracker.Features/Features/Data/RequestClock.cs                        # in-scope (iter-1, new file)
OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs               # in-scope (iter-2 migration)
OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs          # in-scope (iter-2 migration)
OneMoreTaskTracker.Features/Program.cs                                           # in-scope (DI block; iter-1)
tests/OneMoreTaskTracker.Api.Tests/OneMoreTaskTracker.Api.Tests.csproj           # in-scope (test pkg ref; iter-1)
tests/OneMoreTaskTracker.Api.Tests/Time/RequestClockTests.cs                     # in-scope (iter-1, new file)
tests/OneMoreTaskTracker.Features.Tests/CreateFeatureHandlerTests.cs             # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/FeatureStagePlanHandlerTests.cs          # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockTests.cs            # in-scope (iter-1, new file)
tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureHandlerTests.cs       # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureStageHandlerTests.cs  # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/HandlerRegistrationTests.cs              # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/OneMoreTaskTracker.Features.Tests.csproj # in-scope (test pkg ref; iter-1)
tests/OneMoreTaskTracker.Features.Tests/TestHelpers/TestRequestClock.cs          # in-scope (iter-2, new test helper)
```

Cross-checked against the plan's MUST-NOT-touch globs:

- `OneMoreTaskTracker.Api/Auth/*.cs` (JwtTokenService, JwtOptions): **untouched** ✓
- `OneMoreTaskTracker.Api/openapi.json`: **untouched** ✓
- `OneMoreTaskTracker.Features/Protos/**`: **untouched** ✓
- `OneMoreTaskTracker.Features/Migrations/**`: **untouched** ✓
- `OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs`: **untouched** ✓
- `OneMoreTaskTracker.GitLab.Proxy/**`, `OneMoreTaskTracker.Tasks/**`, `OneMoreTaskTracker.Users/**`: **untouched** ✓
- `OneMoreTaskTracker.WebClient/**`: **untouched** ✓
- `compose.yaml`, `Dockerfile`, `appsettings*.json`: **untouched** ✓
- JWT block in `Api/Program.cs`: verified byte-identical via `git diff b96117e..55cd078 -- OneMoreTaskTracker.Api/Program.cs` — only the iter-1 `using OneMoreTaskTracker.Api.Time;` and 2 DI registration lines (`AddSingleton<TimeProvider>` + `AddScoped<IRequestClock, RequestClock>`) were inserted; the `AddAuthentication(JwtBearerDefaults.…)` / `AddJwtBearer(...)` block is byte-identical ✓

`PlannedDate.cs` shows in `b96117e..55cd078` because of interim commit `3c4deca` (variable-lifetime tightening + `ParseDate` consolidation) — that commit is not part of `GEN_COMMIT` and not part of MUST-NOT-touch.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 6.5 | 7 axes: 5 met, 2 partial-by-design, 0 regressed. **Met:** IRequestClock-using files 0→5 (target 5 hit per planner's file-grep interpretation incl. impl pair); RequestClock unit tests 4 (target ≥3); build 0 errors; test count 470 (≥466 baseline); JWT shape unchanged. **Partial:** in-scope `DateTime.UtcNow` reads 10→7 (3 handlers migrated; remaining = Feature/FeatureStagePlan ×4 entity initializers + DevFeatureSeeder ×1 + TasksController ×2; ~30% of the way to target 0 — on planned trajectory for iter 3 / iter 4 / iter 5); per-request integration test still 0 (deferred to iter 5). **Score progression:** 5.5 → 6.5 (+1.0). The +1.0 reflects the slice's stated purpose: turning 0 real `IRequestClock` consumers into 3 (CreateFeatureHandler, PatchFeatureHandler, PatchFeatureStageHandler) and lifting 3 in-scope `DateTime.UtcNow` reads off the count. Headline axis (#1 in-scope reads) is still partial; that's why this lands at 6.5 not 7.5. |
| integration_and_conventions | 8.5 | Inspected `git diff 3c4deca..55cd078 -- OneMoreTaskTracker.Features tests/OneMoreTaskTracker.Features.Tests`: (a) primary-ctor extension consistent with existing `db` / `logger` positional-lowercase style — `CreateFeatureHandler(FeaturesDbContext db, IRequestClock clock)`, `PatchFeatureHandler(FeaturesDbContext db, ILogger<...> logger, IRequestClock clock)`, `PatchFeatureStageHandler(FeaturesDbContext db, ILogger<...> logger, IRequestClock clock)` — `IRequestClock` always last, no `_clock` field synthesised (idiomatic primary-ctor capture); (b) no new TODO/FIXME in the diff (verified via `grep -E 'TODO\|FIXME' <diff>`); (c) test fakes use a real `RequestClock(TimeProvider.System)` wrapped in the `TestRequestClock.System()` helper — exercises the real capture-once semantics under test rather than a hand-rolled stub (option 1 from prompt; matches lessons from prior consolidate-handlers refactor); (d) no log-only locals introduced; (e) no captured-surface file (proto, migrations, openapi.json, JWT) touched. The `_clock.GetUtcNow()` call sites preserve the `var now = ...` form at exactly the same locations the iter-1 reshape `3c4deca` settled on — single top-of-method capture in each handler, three reuse sites in `CreateFeatureHandler`, three in `PatchFeatureHandler`, four in `PatchFeatureStageHandler`. The `TestRequestClock` helper sits under `tests/.../TestHelpers/` per the project's existing test-helper convention. Score unchanged from iter-1 (8.5) — conventions remain clean. |
| test_coverage_delta | 6.5 | `score-coverage-delta.mjs` returned `COVERAGE_DELTA_PCT=0` / `AUTO_FAIL=false` (LCOV not emitted by the project's `dotnet test` config — RF-001-06's sister concern). Direct evidence: 5 existing handler-test files (`CreateFeatureHandlerTests`, `FeatureStagePlanHandlerTests`, `Features/Update/PatchFeatureHandlerTests`, `Features/Update/PatchFeatureStageHandlerTests`, `HandlerRegistrationTests`) were updated to wire the new constructor argument via `TestRequestClock.System()`; 1 new test helper file (`TestHelpers/TestRequestClock.cs`); 0 existing tests deleted; 0 previously-green tests now red; 470/470 still pass. Net additive on the test corpus (+0 tests in iter-2 itself; the +4 RequestClock tests landed in iter-1 and persist). Missing: the per-request integration test (RF-001-03 sticky) that wires `WebApplicationFactory` + `FakeTimeProvider` and asserts that two `_clock.GetUtcNow()` reads from the same scoped DI scope return the same `DateTime`. The iter-2 generator's choice to wrap the real `RequestClock` (option 1 from prompt) instead of a hand-rolled `Func<DateTime>` stub is *partially* test-coverage-positive — the 5 rewired test files now exercise the real `_capturedNow ??= …` lazy capture across handler invocations. But "real clock under test" is not a substitute for an end-to-end test of the DI Scoped lifetime, so this score doesn't move from iter-1. Score unchanged at 6.5. |
| perf_envelope | 9.3 | Per-request reads now go through `RequestClock.GetUtcNow()` (one virt-call + one nullable check + one `TimeProvider.System.GetUtcNow()` per request) instead of `DateTime.UtcNow` (one direct read). Overhead is sub-microsecond per call, dominated entirely by surrounding EF Core / gRPC work. No `perf` surface in `behavior-capture.json`; the planner's pinned envelope is implicit ("no regression visible to baseline tests"). `dotnet test` wall-clock duration unchanged within noise (Tasks 491ms, Users 2s, Features 491ms, GitLab.Proxy 128ms, Api 697ms; same order-of-magnitude as iter-1). The abstraction is now exercised in 3 hot paths instead of being dead code at iter-1, so the score ticks down from 9.5 → 9.3 to reflect that the 3 production callers now incur the indirection — still well within envelope. |

**Weighted total** = 6.5 × 0.45 + 8.5 × 0.20 + 6.5 × 0.20 + 9.3 × 0.15 = 2.925 + 1.700 + 1.300 + 1.395 = **7.320**.

Pass threshold = 7.0. Weighted total above threshold AND `BEHAVIOR_DRIFT` resolved to false (planner-pinned additive parity) AND `AUTO_FAIL=false` → `VERDICT=PASS`.

## Per-axis movement (from `refactor-plan.md`)

| Axis | Baseline | Target | iter-1 (HEAD `3c4deca`) | iter-2 (HEAD `55cd078`) | Verdict |
|------|----------|--------|-------------------------|-------------------------|---------|
| In-scope `DateTime.UtcNow` reads (Features + Api/Controllers + Api/Middleware) | 10 | 0 | 10 | **7** | improved (−3; ~30% to target) |
| Handlers/controllers depending on `IRequestClock` (file grep on `Features/Features` + `Api/Controllers`) | 0 | 5 | 2 (impl files only) | **5** (2 impl + 3 handlers) | **target met** per planner's interpretation |
| Entity-init `DateTime.UtcNow` reads (Feature.cs + FeatureStagePlan.cs) | 4 | 0 | 4 | 4 | unchanged-by-design (iter 3) |
| Per-request-capture integration test | 0 | ≥1 | 0 | 0 | unchanged-by-design (iter 5) |
| Unit tests for `RequestClock` (`*RequestClock*Tests.cs` `[Fact]`/`[Theory]`) | 0 | ≥3 | 4 | **4** | target met (held from iter-1) |
| `dotnet build` errors | 0 | 0 | 0 | **0** | unchanged (green) |
| `dotnet test` total | 466 | ≥466 | 470 | **470** | improved (additive; iter-1 +4 RequestClock tests still passing) |

5 met / 2 partial-by-design / 0 regressed.

## Issues

### New (RF-002)

- `RF-002-01` — **minor** — `IRequestClock` consumer count via the planner's source-of-truth grep includes the impl pair (`IRequestClock.cs` + `RequestClock.cs`) alongside the 3 real consumers, which inflates the axis number. The planner's target of 5 was sized with that interpretation in mind, so this axis reads as "met" at HEAD `55cd078`, but the *semantic* count of real consumers is 3 (CreateFeatureHandler, PatchFeatureHandler, PatchFeatureStageHandler) and the *intended* count is 5 (the prior three plus TasksController + DevFeatureSeeder). Carrying this surface as a feedback issue so the iter-3 / iter-4 generator does not over-celebrate hitting the file-grep number while DevFeatureSeeder and TasksController still read `DateTime.UtcNow` directly.
  - target_file: documentation only — `gan-harness-refactor/per-request-datetime-provider/refactor-plan.md` §"Target axes (MUST-improve)" axis #2
  - change: optionally tighten the source-of-truth command to count consumers only (e.g. `grep -rEln 'IRequestClock\b' OneMoreTaskTracker.Features/Features OneMoreTaskTracker.Api/Controllers --include='*.cs' | grep -vE 'IRequestClock\.cs|RequestClock\.cs' | sort -u | wc -l`). Not blocking — pin as a planner-side cleanup.
  - status: new
  - severity: minor

- `RF-002-02` — **minor** — `check-must-not-touch.mjs`'s bullet regex doesn't match `refactor-plan.md`'s prose-suffixed entries (`` `path/file.cs` — explanation ``), so it extracts 0 patterns and reports `MUST_NOT_TOUCH_VIOLATION: false` vacuously. Cross-checked manually here (and no violation found) — surface as a sibling-of-RF-001-06 harness-script hardening issue.
  - target_file: `~/.claude/scripts/gan-feature/check-must-not-touch.mjs` (and/or the `refactor-plan.md` template)
  - change: either widen the script's bullet regex to tolerate ` — ` / `— ` / `(...)` suffixes after backtick-quoted paths, or constrain the plan template to one-pattern-per-line bullets. Until then, the evaluator should always cross-check via `git diff --name-only ${BASELINE_SHA}..${GEN_COMMIT}` against the literal globs from §MUST-NOT-touch (as I did here).
  - status: new
  - severity: minor

### Carried forward (unresolved from iter-1)

- `RF-001-03` — **major** — Per-request-capture integration test still missing. Canonical proof of the brief's "one request → two clock reads → identical `DateTime`" invariant remains uncovered. The iter-2 choice to wrap a real `RequestClock(TimeProvider.System)` in `TestRequestClock.System()` *partially* exercises the capture-once semantics in handler unit tests (a fresh `RequestClock` per handler invocation; same instance read multiple times within one `Patch(...)` call returns the same `DateTime`), but it does NOT prove that the DI Scoped lifetime supplies one instance per gRPC/HTTP request — that needs `WebApplicationFactory<Program>` + `FakeTimeProvider`.
  - target_file: `tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs` (new, suggested)
  - change: spin up `WebApplicationFactory<Program>` (or the Features service equivalent) replacing the registered `TimeProvider` with `FakeTimeProvider`; from a single `IServiceScope` resolve `IRequestClock` and call `GetUtcNow()` twice with `FakeTimeProvider.Advance(...)` between calls — assert both reads return the same `DateTime`. From a fresh scope (`scopeFactory.CreateScope()`) resolve `IRequestClock` again and assert that read returns the advanced value.
  - status: carried (still new — defer to iter 5 per planner's commit-sequence)
  - ref: `refactor-plan.md` §"Planned commits" item 5; `refactor-eval-rubric.md` §"`test_coverage_delta`"

- `RF-001-04` — **minor** — Entity-initializer migration deferred per planner §3. Sticky tracker for iter-3 (next iteration).
  - target_file: `OneMoreTaskTracker.Features/Features/Data/Feature.cs`, `OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs`
  - change: drop the `= DateTime.UtcNow` default initializers; require all callers (`CreateFeatureHandler`, `DevFeatureSeeder`, and `PatchFeatureStageHandler`'s `FeatureStagePlan` materialization sites) to set `CreatedAt = now, UpdatedAt = now` explicitly via `init` setters. With iter-2 done, `CreateFeatureHandler` already has `now = clock.GetUtcNow()` available — this commit becomes a one-line edit per call site (`CreatedAt = now, UpdatedAt = now`). `DevFeatureSeeder` will need `IRequestClock` injection in iter-3 OR can be deferred to iter-4 alongside `TasksController` (RF-001-05).
  - status: carried
  - ref: `refactor-plan.md` §"Planned commits" item 3

- `RF-001-05` — **minor** — `TasksController` (`Api/Controllers/Tasks/TasksController.cs:70,77`) and `DevFeatureSeeder` (`Features/Data/DevFeatureSeeder.cs:90`) deferred per planner §4. Sticky tracker for iter-4.
  - target_file: `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs`, `OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs`
  - change: inject `IRequestClock` (Api copy / Features copy); replace each `DateTime.UtcNow` with `_clock.GetUtcNow()`. For `DevFeatureSeeder.SeedAsync`, resolve `IRequestClock` from the seed scope (`Program.cs` does this on startup).
  - status: carried
  - ref: `refactor-plan.md` §"Planned commits" item 4

- `RF-001-06` — **minor** — `baseline-tests.json` is empty (`tests: {}`); `check-baseline-tests.mjs --mode compare` continues to run vacuously every iteration. Cross-checked again here via direct `dotnet test` (470/470 pass). Recommend re-running `check-baseline-tests.mjs --mode capture` with a TRX-aware parser.
  - target_file: `gan-harness-refactor/per-request-datetime-provider/baseline-tests.json` (and possibly `runners.json` test command)
  - change: re-capture with a parser that emits per-test status (e.g. add `--logger:"trx;LogFileName=results.trx"` and a TRX-aware parser, or use `dotnet test ... --logger:"console;verbosity=detailed"`).
  - status: carried
  - severity: minor (no real regression risk in iter-2 either — verified manually)

## next_actions

[ { "id": "RF-001-03",
    "severity": "major",
    "target_file": "tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs",
    "change": "Add a WebApplicationFactory-style integration test: register FakeTimeProvider, resolve IRequestClock twice from a single IServiceScope with FakeTimeProvider.Advance between the reads, assert both reads return the same DateTime; from a fresh scope, assert IRequestClock returns the advanced value. This is the canonical proof of the per-request-capture invariant the brief promised. The iter-2 TestRequestClock.System() helper proves capture-once at the instance level but does not prove the DI Scoped lifetime supplies one instance per request.",
    "ref": "refactor-plan.md §Planned commits item 5",
    "status": "carried" },
  { "id": "RF-001-04",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Data/Feature.cs;OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs",
    "change": "Drop `= DateTime.UtcNow` default initializers from CreatedAt/UpdatedAt on both entities; update CreateFeatureHandler (already has `now = clock.GetUtcNow()` from iter-2), PatchFeatureStageHandler (FeatureStagePlan materialization sites), and any other materialization sites to pass `now` explicitly via init setters.",
    "ref": "refactor-plan.md §Planned commits item 3",
    "status": "carried" },
  { "id": "RF-001-05",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs;OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs",
    "change": "Inject IRequestClock; replace DateTime.UtcNow reads on TasksController lines 70,77 and DevFeatureSeeder line 90 with _clock.GetUtcNow(). DevFeatureSeeder resolves the clock from its seed scope.",
    "ref": "refactor-plan.md §Planned commits item 4",
    "status": "carried" },
  { "id": "RF-001-06",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/baseline-tests.json",
    "change": "Re-capture baseline tests with a parser that populates per-test names (e.g. via TRX logger). Current file has tests: {} so the regression check is vacuous; manual `dotnet test` confirms 470/470 at HEAD vs 466/466 at baseline.",
    "ref": "GAN-FEATURE-SHARED.md §Refactor auto-fail triggers (test suite regression check)",
    "status": "carried" },
  { "id": "RF-002-01",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/refactor-plan.md",
    "change": "Optionally tighten axis #2's source-of-truth command to count real consumers only (exclude IRequestClock.cs / RequestClock.cs). Not blocking — pin as a planner-side cleanup.",
    "ref": "refactor-plan.md §Target axes (MUST-improve) axis #2",
    "status": "new" },
  { "id": "RF-002-02",
    "severity": "minor",
    "target_file": "~/.claude/scripts/gan-feature/check-must-not-touch.mjs",
    "change": "Widen the script's bullet regex to tolerate ` — ` / `— ` / `(...)` suffixes after backtick-quoted paths, or constrain the plan template to one-pattern-per-line bullets. Until then, evaluator must cross-check via `git diff --name-only ${BASELINE_SHA}..${GEN_COMMIT}` against literal globs from §MUST-NOT-touch.",
    "ref": "_contract-shards/refactor-evaluator.md (manual cross-check obligation)",
    "status": "new" } ]
