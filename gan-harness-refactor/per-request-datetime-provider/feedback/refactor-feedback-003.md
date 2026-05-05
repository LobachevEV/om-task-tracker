# Refactor Feedback — per-request-datetime-provider — iter 003

Iteration: 3
Generator commit: 82f069a9ec7d867c49eaaf6e3f5af6dd62116b70
Working-tree HEAD evaluated: 82f069a9ec7d867c49eaaf6e3f5af6dd62116b70
Behavior drift: false (gate green; only `test_corpus_assertion_count` differs and is planner-pinned additive-only)
Weighted total: 8.14

## Behavior preservation gate

- Status: **PASS**
- Re-capture: `gan-harness-refactor/per-request-datetime-provider/.iter/3/behavior-contract.json` (label `iter-3`, captured at HEAD `82f069a`).
- Frozen baseline: `gan-harness-refactor/per-request-datetime-provider/behavior-contract.json` (re-captured at `b96117e` after RF-001-01 + RF-002-03 v2 capture-surface fixes; see `run.log` for the trail).

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

`BEHAVIOR_DRIFT=true` was set by the diff script because the `test_corpus_assertion_count` surface bytes changed, but the planner pre-pinned a strict-superset additive exception for that one surface (see `refactor-plan.md` §"Behavior preservation envelope"). Baseline `969\n` → current `977\n` (+8) — extracted via `jq '.surfaces[] | select(.id=="test_corpus_assertion_count") | .data'` on both contracts. No assertion deletion: the count is **identical to iter-2** (977; iter-3 added 0 new tests, only rewired 3 existing tests for the new construction shape). The other 7 surfaces — including the `feature_entity_shape` surface that *would* have caught this iter's entity-init drop without the RF-002-03 v2 sed-strip — all show `no diff`. Treated as parity per plan. `AUTO_FAIL` is therefore overridden to `false`.

The most load-bearing observation here is that `feature_entity_shape: no diff` survived the iter-3 default-initializer removal (`= DateTime.UtcNow` stripped from `Feature.{CreatedAt,UpdatedAt}` and `FeatureStagePlan.{CreatedAt,UpdatedAt}`). The iter-2-discovered RF-002-03 v2 sed pattern (`s/(\})[[:space:]]*=[[:space:]]*[^;]+;/\1/`) successfully normalises the trailing default expression away from the captured grep line, which is exactly the planner's stated intent ("public-shape grep, not default-initializer expressions"). The v2 fix is now empirically validated against the very edit it was designed to permit.

## Baseline-test regression check

- `check-baseline-tests.mjs --mode compare --feature-dir … --runners … --side backend` returned `BASELINE_TESTS_REGRESSED=false` with evidence `ran 0 tests, 0 regressed (baseline had 0)` — vacuous because `baseline-tests.json` has `tests: {}` (RF-001-06 sticky from iter-1 / iter-2).
- Direct cross-check: `dotnet test OneMoreTaskTracker.slnx --nologo` → **470/470 pass, 0 failed** (Tasks 68, Users 45, Features 118, GitLab.Proxy 63, Api 176). 0 build errors. No regression. Identical to iter-2 totals; expected since iter-3 added no new tests and only rewired existing ones.

## MUST-NOT-touch cross-check (manual)

`git diff --name-only b96117e..82f069a` (filtered against MUST-NOT-touch globs):

```
OneMoreTaskTracker.Api/Program.cs                                                # in-scope (DI block; iter-1 only — JWT block byte-identical)
OneMoreTaskTracker.Api/Time/IRequestClock.cs                                     # in-scope (iter-1, new file)
OneMoreTaskTracker.Api/Time/RequestClock.cs                                      # in-scope (iter-1, new file)
OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs              # in-scope (iter-2 migration)
OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs                    # in-scope (iter-3 migration)
OneMoreTaskTracker.Features/Features/Data/Feature.cs                             # in-scope (iter-3 entity-init drop)
OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs                    # in-scope (iter-3 entity-init drop)
OneMoreTaskTracker.Features/Features/Data/IRequestClock.cs                       # in-scope (iter-1, new file)
OneMoreTaskTracker.Features/Features/Data/PlannedDate.cs                         # in-scope-adjacent (interim 3c4deca; not iter-3)
OneMoreTaskTracker.Features/Features/Data/RequestClock.cs                        # in-scope (iter-1, new file)
OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs               # in-scope (iter-2 migration)
OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs          # in-scope (iter-2 migration)
OneMoreTaskTracker.Features/Program.cs                                           # in-scope (DI block; iter-1 + iter-3 seeder registration)
tests/OneMoreTaskTracker.Api.Tests/OneMoreTaskTracker.Api.Tests.csproj           # in-scope (test pkg ref; iter-1)
tests/OneMoreTaskTracker.Api.Tests/Time/RequestClockTests.cs                     # in-scope (iter-1, new file)
tests/OneMoreTaskTracker.Features.Tests/CreateFeatureHandlerTests.cs             # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/DevFeatureSeederTests.cs                 # in-scope (iter-3; static→instance rewire + 1 fixture explicit init)
tests/OneMoreTaskTracker.Features.Tests/FeatureStagePlanHandlerTests.cs          # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/Features/Data/FeaturesDbContextSmokeTests.cs # in-scope (iter-3; explicit CreatedAt/Touch)
tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockTests.cs            # in-scope (iter-1, new file)
tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureHandlerTests.cs       # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureStageHandlerTests.cs  # in-scope (iter-2; ctor rewire)
tests/OneMoreTaskTracker.Features.Tests/GetFeatureHandlerTests.cs                # in-scope (iter-3; explicit CreatedAt/Touch)
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
- JWT block in `Api/Program.cs`: verified byte-identical via `git diff b96117e..82f069a -- OneMoreTaskTracker.Api/Program.cs`. The diff shows ONLY the iter-1 insertions: `using OneMoreTaskTracker.Api.Time;` plus `AddSingleton<TimeProvider>(TimeProvider.System); AddScoped<IRequestClock, RequestClock>();` (two DI lines after `AddAuthorization()`). The `AddAuthentication(JwtBearerDefaults.…)` / `AddJwtBearer(...)` block is byte-identical. iter-3 made zero edits to `Api/Program.cs` ✓

`PlannedDate.cs` shows in `b96117e..82f069a` because of interim commit `3c4deca` (variable-lifetime tightening + `ParseDate` consolidation) — not part of any harness iteration commit; not part of MUST-NOT-touch.

Bulk filter on `git diff b96117e..82f069a -- OneMoreTaskTracker.Api/Auth/ OneMoreTaskTracker.Api/openapi.json OneMoreTaskTracker.Features/Protos OneMoreTaskTracker.Features/Migrations OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs` yields **0 lines** of diff output — empirical confirmation.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 8.2 | 7 axes: 5 met, 1 substantially-partial (#1 at 80% to target), 1 unchanged-by-design (#4 deferred to iter 5), 0 regressed. **Met:** axis #2 IRequestClock-using files 6 (≥ target 5; 3 handlers + DevFeatureSeeder + 2 impl files — RF-002-01's known impl-pair inflation, but the *real-consumer* count semantically rises from 3 to **4** with `DevFeatureSeeder` added); **axis #3 entity-init reads 4 → 0 = TARGET MET** (the flagship goal of this slice); axis #5 RequestClock unit tests 4 (≥ 3); build 0 errors / 0 warnings; test count 470 (≥ 466 baseline). **Partial:** axis #1 in-scope `DateTime.UtcNow` reads 10 → **2** (TasksController:70,77 only) — ~80% to target 0, big jump from iter-2's 7. **Unchanged-by-design:** axis #4 per-request integration test 0 (deferred to iter 5 per planner §"Planned commits" item 5; carried as RF-001-03). **Score progression:** 5.5 → 6.5 → **8.2** (+1.7 from iter-2). The +1.7 reflects two flagship axes moving simultaneously this iteration: axis #3 hits target zero (the planner's primary "entity-init drops to 0" goal — this is the highest-risk surface, requiring the RF-002-03 v2 capture-surface fix to land safely), and axis #1 jumps from 30%-to-target (iter-2: 7) to 80%-to-target (iter-3: 2). Per the rubric "all met/partial, none regressed → 7–8 with the headline axis hitting target lifts toward the high end". Lands at 8.2 not 9.0 because axis #1 is still partial (the last 20% — 2 in-scope reads — is the entire raison d'être of iter-4's TasksController slice). |
| integration_and_conventions | 8.7 | Inspected `git diff 55cd078..82f069a -- OneMoreTaskTracker.Features tests/OneMoreTaskTracker.Features.Tests`: (a) `DevFeatureSeeder` cleanly converted from `static class DevFeatureSeeder` to `sealed class DevFeatureSeeder(IRequestClock clock)` — primary-ctor capture style consistent with iter-2's handler conversions (`CreateFeatureHandler(FeaturesDbContext db, IRequestClock clock)`); `static` modifier removed from `SeedAsync`; `var now = DateTime.UtcNow;` becomes `var now = clock.GetUtcNow();` — single-line edit that mirrors the iter-2 pattern; the seeder's data-shape (the `Features` static array, the `SeededManagerUserId` constant, the upfront duplicate-check on `dbContext.Features.AnyAsync(...)`) is untouched. (b) `Program.cs` registers `AddScoped<DevFeatureSeeder>()` next to `AddScoped<IRequestClock, RequestClock>()` (correct lifetime — the seeder needs the same scope as the clock so the seeded `now` is captured-once for the whole seed run); the startup migration scope (`using (var scope = app.Services.CreateScope())`) is reused — `featuresDb.Database.Migrate();` runs **before** `var seeder = scope.ServiceProvider.GetRequiredService<DevFeatureSeeder>(); await seeder.SeedAsync(featuresDb);` — migrations-before-seeding ordering preserved (verified by the `if (app.Environment.IsDevelopment())` guard around the seed call inside the same `using` block). (c) Entity edits drop ONLY the default-initializer expression: `Feature.CreatedAt { get; init; } = DateTime.UtcNow;` becomes `Feature.CreatedAt { get; init; }`; same for `Feature.UpdatedAt { get; private set; }`, `FeatureStagePlan.CreatedAt`, `FeatureStagePlan.UpdatedAt` — public-shape (name, type, getter/setter/init access) byte-identical, which the gate confirms. (d) Test changes are minimal and mechanical: `DevFeatureSeederTests.cs` introduces a `private static DevFeatureSeeder NewSeeder() => new(TestRequestClock.System());` factory and replaces 5 `DevFeatureSeeder.SeedAsync(db)` calls with `NewSeeder().SeedAsync(db)`; the pre-existing `Pre-existing` Feature fixture gains explicit `CreatedAt = DateTime.UtcNow` + `preExisting.Touch(DateTime.UtcNow);` to compensate for the entity default removal; `FeaturesDbContextSmokeTests.cs` and `GetFeatureHandlerTests.cs` add the same `CreatedAt = DateTime.UtcNow` + `feature.Touch(DateTime.UtcNow);` to their persisted fixtures (the second test in `FeaturesDbContextSmokeTests.cs` is non-persisting and correctly left as-is). (e) No new TODO/FIXME (verified via grep on the 4 production files). (f) No log-only `DateTime` locals introduced. (g) `_clock.GetUtcNow()` indirection vs `clock.GetUtcNow()` — the seeder uses primary-ctor positional-lowercase access (`clock.GetUtcNow()`, no `_clock` synthesised field), consistent with how the iter-2 handlers ended up. (h) Scope wiring respects the planner's "bounded-context isolation" rule — `DevFeatureSeeder` registers in `OneMoreTaskTracker.Features/Program.cs` only, no leakage into Api. **Score progression:** 8.5 → **8.7** (+0.2). The +0.2 reflects the seeder-scope wiring being trickier than a straight handler ctor injection (DI lifetime + startup scope ordering + correct-side resolution from the migration scope) and getting all of it right on the first replay. Holds back from 9.0 because axis #2's grep still over-counts: the planner intended ≥5 *real* consumers, the count semantically reads as 4 (3 handlers + DevFeatureSeeder) — closing the last gap is iter-4's `TasksController` work. |
| test_coverage_delta | 6.5 | `score-coverage-delta.mjs` not run (project does not emit LCOV — sister concern of RF-001-06; skipped per instruction). Direct evidence: 3 existing test files modified for the new entity/seeder construction shape (`DevFeatureSeederTests.cs` 5 callsite + 1 fixture migration; `GetFeatureHandlerTests.cs` 1 fixture explicit init; `FeaturesDbContextSmokeTests.cs` 1 fixture explicit init); 0 new test files added; 0 existing tests deleted; 0 previously-green tests now red; 470/470 still pass. Strict-superset preserved: assertion count holds at **977** (identical to iter-2; the `Touch(DateTime.UtcNow)` addition is a method invocation, not an assertion — `Should*/Be*/Equal/Throw/...` grep is unmoved). The new seeder ctor parameter is exercised by all 6 `DevFeatureSeederTests` `[Fact]`s (each `NewSeeder()` constructs a fresh `RequestClock(TimeProvider.System)` via `TestRequestClock.System()` — same option-1 pattern as iter-2). The entity init drop is exercised by every fixture that persists a `Feature` — coverage on `Feature.CreatedAt` / `UpdatedAt` is *positively* affected because the values are now set explicitly per call site instead of falling through to a hidden default. Net new test count: +0 (already includes iter-1's +4 RequestClock tests). Missing: the per-request integration test (RF-001-03 sticky) — still uncovered until iter 5. **Score progression:** 6.5 → 6.5 → **6.5** (flat). No new tests means no coverage uplift; the rewire is mechanical. |
| perf_envelope | 9.4 | Per-request reads now go through `RequestClock.GetUtcNow()` in **4** production hot paths instead of 3 (added: `DevFeatureSeeder.SeedAsync`). The seeder runs **once at startup**, not per request, so its hot-path classification is misleading — the marginal cost is 1 extra `RequestClock` materialisation per process boot, which is well below noise (the seed scope is already created for `featuresDb.Database.Migrate()`). Entity defaults (`= DateTime.UtcNow`) are gone — that is actually a **micro-perf WIN at object materialisation**: `new Feature { … }` no longer triggers a `DateTime.UtcNow` syscall during ctor synthesis (it now reads `default(DateTime)` for `CreatedAt`/`UpdatedAt` until the caller's `init` setter runs, which then assigns the same `now` from `_clock.GetUtcNow()`). For seeded data this means the seeder evaluates `DateTime.UtcNow` once via the clock and assigns it to N entities — vs the old behaviour where each entity ctor + each explicit caller assignment evaluated it independently (a tight count was unverified at baseline but at minimum the seed creates 6 features × 5 stage plans × 2 timestamps = 60 reads → now 1 read × 60 assignments). For runtime handlers the path-count is unchanged (handlers already passed `now` explicitly post iter-2). `dotnet test` wall-clock duration is unchanged within noise vs iter-2 (Tasks 479ms, Users 2s, Features 530ms, GitLab.Proxy 135ms, Api 679ms). No surface regression. **Score progression:** 9.5 → 9.3 → **9.4** (+0.1). The +0.1 reflects the entity-default-removal micro-WIN slightly outweighing the +1 startup-only hot path. |

**Weighted total** = 8.2 × 0.45 + 8.7 × 0.20 + 6.5 × 0.20 + 9.4 × 0.15 = 3.690 + 1.740 + 1.300 + 1.410 = **8.140**.

Pass threshold = 7.0. Weighted total above threshold AND `BEHAVIOR_DRIFT` resolved to false (planner-pinned additive parity) AND `AUTO_FAIL=false` → `VERDICT=PASS`.

## Per-axis movement (from `refactor-plan.md`)

| Axis | Baseline | Target | iter-1 (`3c4deca`) | iter-2 (`55cd078`) | iter-3 (`82f069a`) | Verdict |
|------|----------|--------|--------------------|--------------------|--------------------|---------|
| In-scope `DateTime.UtcNow` reads (Features + Api/Controllers + Api/Middleware) | 10 | 0 | 10 | 7 | **2** | improved (−5 vs iter-2; ~80% to target — only TasksController:70,77 remaining) |
| Files depending on `IRequestClock` (file grep on `Features/Features` + `Api/Controllers`) | 0 | 5 | 2 (impl files only) | 5 (2 impl + 3 handlers) | **6** (2 impl + 3 handlers + DevFeatureSeeder) | **target met / over-target** per planner's interpretation; semantic real-consumer count 3→**4** |
| Entity-init `DateTime.UtcNow` reads (Feature.cs + FeatureStagePlan.cs) | 4 | 0 | 4 | 4 | **0** | **TARGET MET** (the flagship axis of this slice) |
| Per-request-capture integration test | 0 | ≥1 | 0 | 0 | **0** | unchanged-by-design (iter 5; carried as RF-001-03) |
| Unit tests for `RequestClock` (`*RequestClock*Tests.cs` `[Fact]`/`[Theory]`) | 0 | ≥3 | 4 | 4 | **4** | target met (held from iter-1) |
| `dotnet build` errors | 0 | 0 | 0 | 0 | **0** | unchanged (green; 0 warnings too) |
| `dotnet test` total | 466 | ≥466 | 470 | 470 | **470** | improved-from-baseline (held; +4 from iter-1's RequestClock tests) |

5 met / 1 substantially-partial (#1 at 80%) / 1 unchanged-by-design (#4 deferred) / 0 regressed.

## Issues

### New (RF-003)

*(none — iter-3 introduced no new harness or planner artifacts)*

### Resolved this iteration

- ~~`RF-001-04`~~ — **RESOLVED**. Entity-init `DateTime.UtcNow` reads on `Feature.{CreatedAt,UpdatedAt}` and `FeatureStagePlan.{CreatedAt,UpdatedAt}` dropped to **0** at HEAD `82f069a`. The `feature_entity_shape` capture surface confirms the public shape (name, type, accessor) is byte-identical post-removal — the planner's claim that the default-initializer expression is implementation detail is now empirically validated against the very edit it was designed to permit.
- ~~`RF-001-05` (DevFeatureSeeder portion)~~ — **RESOLVED**. `DevFeatureSeeder` migrated from `static class` to `sealed class DevFeatureSeeder(IRequestClock clock)`; `SeedAsync` lost its `static` modifier; `var now = DateTime.UtcNow` became `var now = clock.GetUtcNow()`; `Program.cs` registers `AddScoped<DevFeatureSeeder>()` and resolves it from the existing migration scope before `SeedAsync`. Migrations-before-seeding ordering preserved. The TasksController portion of RF-001-05 remains carried (see below).

### Carried forward (unresolved)

- `RF-001-03` — **major** — Per-request-capture integration test still missing. Canonical proof of the brief's "one request → two clock reads → identical `DateTime`" invariant remains uncovered. iter-3 made no progress here; the slice was deliberately scoped to entity-init + DevFeatureSeeder per the iter-2 verdict's recommendation.
  - target_file: `tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs` (new, suggested)
  - change: spin up `WebApplicationFactory<Program>` (or the Features service equivalent) replacing the registered `TimeProvider` with `FakeTimeProvider`; from a single `IServiceScope` resolve `IRequestClock` and call `GetUtcNow()` twice with `FakeTimeProvider.Advance(...)` between calls — assert both reads return the same `DateTime`. From a fresh scope (`scopeFactory.CreateScope()`) resolve `IRequestClock` again and assert that read returns the advanced value.
  - status: carried (defer to iter 5 per planner's commit-sequence)
  - ref: `refactor-plan.md` §"Planned commits" item 5

- `RF-001-05` (TasksController portion only) — **minor** — `TasksController.cs:70,77` remain the only two in-scope `DateTime.UtcNow` reads. Inject `IRequestClock` (Api copy) into the controller ctor; replace each read with `_clock.GetUtcNow()`. Update `TasksController` tests to pass a fake (`TestRequestClock.System()` from the Api side). This is the obvious iter-4 slice — small, mechanical, and closes axis #1 to target zero (the brief's flagship goal).
  - target_file: `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs`
  - change: inject `IRequestClock _clock`; replace `DateTime.UtcNow` on lines 70 and 77 with `_clock.GetUtcNow()`. Add an Api-side `TestRequestClock` helper (mirror of the Features-side one) if one does not yet exist.
  - status: carried — only the TasksController half remains (DevFeatureSeeder half resolved this iteration)
  - ref: `refactor-plan.md` §"Planned commits" item 4

- `RF-001-06` — **minor** — `baseline-tests.json` still has `tests: {}`; `check-baseline-tests.mjs --mode compare` continues to run vacuously every iteration (flagged this iteration as well — `evidence: ran 0 tests, 0 regressed (baseline had 0)`). Cross-checked again here via direct `dotnet test` (470/470 pass). Recommend re-running `check-baseline-tests.mjs --mode capture` with a TRX-aware parser. Non-blocking — the manual cross-check has worked reliably across 3 iterations.
  - target_file: `gan-harness-refactor/per-request-datetime-provider/baseline-tests.json` (and possibly `runners.json` test command)
  - change: re-capture with `dotnet test ... --logger:"trx;LogFileName=results.trx"` and a TRX-aware parser, OR use `--logger:"console;verbosity=detailed"` + parse pass/fail per-test from console output.
  - status: carried (3rd iteration unresolved)
  - severity: minor

- `RF-002-01` — **minor** — Axis #2 source-of-truth grep over-counts at HEAD `82f069a`: the count is **6** (2 impl + 3 handlers + DevFeatureSeeder), but the *real-consumer* count is 4 (3 handlers + DevFeatureSeeder). The 2 impl files (`IRequestClock.cs` + `RequestClock.cs` in the Features side) inflate the number above the planner's target of 5. The axis still reads as "met / over-target" per the planner's file-grep interpretation, but the iter-4 generator should not over-celebrate — the *intended* count is "5 real consumers" which only lands when `TasksController` migrates.
  - target_file: documentation only — `gan-harness-refactor/per-request-datetime-provider/refactor-plan.md` §"Target axes (MUST-improve)" axis #2
  - change: optionally tighten the source-of-truth command to count real consumers only, e.g. `grep -rEln 'IRequestClock\b' OneMoreTaskTracker.Features/Features OneMoreTaskTracker.Api/Controllers --include='*.cs' | grep -vE 'IRequestClock\.cs|RequestClock\.cs' | sort -u | wc -l`. Not blocking — pin as a planner-side cleanup.
  - status: carried (2nd iteration unresolved)
  - severity: minor

- `RF-002-02` — **minor** — `check-must-not-touch.mjs`'s bullet regex still doesn't match `refactor-plan.md`'s prose-suffixed entries. Manual cross-check via `git diff --name-only ${BASELINE_SHA}..${GEN_COMMIT}` against literal globs from §MUST-NOT-touch (as done here) continues to be the reliable path. No violation found this iteration.
  - target_file: `~/.claude/scripts/gan-feature/check-must-not-touch.mjs` (and/or the `refactor-plan.md` template)
  - change: widen the script's bullet regex to tolerate ` — ` / `— ` / `(...)` suffixes after backtick-quoted paths, or constrain the plan template to one-pattern-per-line bullets.
  - status: carried (2nd iteration unresolved)
  - severity: minor

## next_actions

[ { "id": "RF-001-03",
    "severity": "major",
    "target_file": "tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs",
    "change": "Add a WebApplicationFactory-style integration test: register FakeTimeProvider, resolve IRequestClock twice from a single IServiceScope with FakeTimeProvider.Advance between the reads, assert both reads return the same DateTime; from a fresh scope, assert IRequestClock returns the advanced value. This is the canonical proof of the per-request-capture invariant the brief promised. The handler-level TestRequestClock.System() helper proves capture-once at the instance level but does not prove the DI Scoped lifetime supplies one instance per request.",
    "ref": "refactor-plan.md §Planned commits item 5",
    "status": "carried" },
  { "id": "RF-001-05",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs",
    "change": "Inject IRequestClock _clock into the controller ctor; replace DateTime.UtcNow on lines 70 and 77 with _clock.GetUtcNow(). This closes axis #1 to target zero. The DevFeatureSeeder half of this issue resolved in iter-3.",
    "ref": "refactor-plan.md §Planned commits item 4",
    "status": "carried (TasksController half only — DevFeatureSeeder half resolved iter-3)" },
  { "id": "RF-001-06",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/baseline-tests.json",
    "change": "Re-capture baseline tests with a parser that populates per-test names (e.g. via TRX logger). Current file has tests: {} so the regression check is vacuous; manual `dotnet test` confirms 470/470 at HEAD vs 466/466 at baseline.",
    "ref": "GAN-FEATURE-SHARED.md §Refactor auto-fail triggers (test suite regression check)",
    "status": "carried (3rd iteration unresolved)" },
  { "id": "RF-002-01",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/refactor-plan.md",
    "change": "Optionally tighten axis #2's source-of-truth command to count real consumers only (exclude IRequestClock.cs / RequestClock.cs). Now visibly inflated at HEAD 82f069a (6 vs the semantic 4). Not blocking — pin as a planner-side cleanup.",
    "ref": "refactor-plan.md §Target axes (MUST-improve) axis #2",
    "status": "carried (2nd iteration unresolved)" },
  { "id": "RF-002-02",
    "severity": "minor",
    "target_file": "~/.claude/scripts/gan-feature/check-must-not-touch.mjs",
    "change": "Widen the script's bullet regex to tolerate ` — ` / `— ` / `(...)` suffixes after backtick-quoted paths, or constrain the plan template to one-pattern-per-line bullets. Until then, evaluator must cross-check via `git diff --name-only ${BASELINE_SHA}..${GEN_COMMIT}` against literal globs from §MUST-NOT-touch.",
    "ref": "_contract-shards/refactor-evaluator.md (manual cross-check obligation)",
    "status": "carried (2nd iteration unresolved)" } ]
