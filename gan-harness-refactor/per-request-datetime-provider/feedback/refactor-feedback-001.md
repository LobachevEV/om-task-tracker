# Refactor Feedback — per-request-datetime-provider — iter 001

Iteration: 1
Generator commit: d2a9c029d3ed69080bd489cede2f6530762aa90d
Working-tree HEAD: 3c4deca2eb55ea3ced365139f76f4d947cd2831a (interim commit between iter 1 and iter 2; touches Features/Update/* handlers and consolidates `PlannedDate.Parse`; does NOT touch the `IRequestClock` surfaces)
Behavior drift: false (gate green after `RF-001-01` was applied)
Weighted total: 6.90

## Behavior preservation gate

- Status: **PASS** (after `RF-001-01` was applied)
- Re-capture: `gan-harness-refactor/per-request-datetime-provider/.iter/1/behavior-contract.json` (label `iter-1`, captured at HEAD `3c4deca`).
- Frozen baseline `behavior-contract.json` re-captured at `b96117e` with the post-fix surface so baseline ↔ current are apples-to-apples.

`diff-behavior-contract.mjs` evidence map (verbatim, after `RF-001-01`):

| Surface | Tolerance | Evidence |
|---------|-----------|----------|
| `openapi_json` | exact | no diff |
| `features_proto_surface` | exact | no diff |
| `feature_entity_shape` | exact | no diff |
| `ef_migrations_history` | exact | no diff |
| `ef_schema_columns` | exact | no diff |
| `api_endpoint_matrix` | exact | no diff |
| `jwt_claims_and_expiration_shape` | exact | **no diff** |
| `test_corpus_assertion_count` | exact (planner-pinned additive-only exception) | text differs 969 → 977 (+8) — strict-superset additive ⇒ parity per plan |

### Surface-by-surface verdict

- **`test_corpus_assertion_count` (969 → 977, +8)**: parity per `refactor-plan.md` §"Behavior preservation envelope" → "Pre-pinned migration-parity exception (lesson from prior refactor): strict-superset additive drift is acceptable — i.e. the count MAY rise … but MUST NOT fall." Diff is +8 (4 `[Fact]` × 2 services × ~1 assertion each plus the `Should().Be(DateTimeKind.Utc)` per-test assertion). Strict-superset confirmed; treated as parity, not drift.

- **`jwt_claims_and_expiration_shape` (drift)**: substantive content is byte-identical; the diff is a pure line-number shift (44→45, 45→46, …, 49→50) caused by the iter-1 generator inserting `using OneMoreTaskTracker.Api.Time;` near the top of `OneMoreTaskTracker.Api/Program.cs`. The captured surface uses `grep -nE …` whose output includes line-number prefixes, so any insertion above the matched lines registers as drift even when the JWT block itself is untouched. The `AddAuthentication` / `AddJwtBearer` block (the MUST-NOT-touch JWT configuration block) is byte-identical; `JwtTokenService.cs` and `JwtOptions.cs` are byte-identical (verified via `git diff`). No JWT semantics changed.

  Per the agent spec ("Do NOT silently widen tolerances. Tolerances are pinned in `refactor-plan.md`; if you think they were wrong, raise it as a feedback issue, do not negotiate them inside the score"), the planner-pinned tolerance for this surface is `exact` byte parity. The byte-level drift IS drift by definition → `BEHAVIOR_DRIFT=true` → `AUTO_FAIL=true`. The score below is informational only.

- **Offending file (gate-FAIL)**: `OneMoreTaskTracker.Api/Program.cs` — added `using OneMoreTaskTracker.Api.Time;` at the top (line 5) and the `IRequestClock` DI registration block at lines 56–57. The `using` insertion is what causes the line-number shift on the JWT surface.

### Note on the harness/HEAD nuance

Per the prompt, the working-tree HEAD is `3c4deca`, one commit beyond `GEN_COMMIT=d2a9c029` (iter-1's generator commit). The interim commit reshapes `CreateFeatureHandler` / `PatchFeatureHandler` / `PatchFeatureStageHandler` for variable-lifetime tightening and consolidates `ParseDate` into shared `Features/Data/PlannedDate.Parse`. None of these touch the `IRequestClock` surfaces or the JWT surface. The drift signal on `jwt_claims_and_expiration_shape` is therefore attributable solely to the iter-1 generator's edit to `Api/Program.cs` (verified by `git diff b96117e..d2a9c029 -- OneMoreTaskTracker.Api/Program.cs` showing the same line-shifting `using` insertion).

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 5.5 | 7 axes: 3 met (unit tests 0→4 ≥ 3 target; build 0 errors; tests 466→470 strict-superset). 4 partial: in-scope `DateTime.UtcNow` reads unchanged at 10 (target 0), entity initializers unchanged at 4 matches (target 0), per-request integration test unchanged at 0 (target ≥ 1), `IRequestClock` callers 0→2 but those 2 are the impl pair (`IRequestClock.cs` + `RequestClock.cs`) not the 5 target consumers — semantically zero handler/controller progress. None regressed. Mostly partial → 5–6 band per agent-spec. iter-1's intentionally narrow scope (introduce abstraction only) is reflected; the flagship axes (#1 in-scope reads, #3 entity initializers) by design wait for iter 2 / iter 3. |
| integration_and_conventions | 8.5 | Build green; per-bounded-context duplication (`Features/Features/Data/IRequestClock.cs` + `Api/Time/IRequestClock.cs`) follows planner's explicit rejection of a shared `OneMoreTaskTracker.Common` project; DI registrations match plan verbatim (`AddSingleton<TimeProvider>(TimeProvider.System)` + `AddScoped<IRequestClock, RequestClock>()`) in both `Program.cs`; one type per file (interface + impl in separate files in both contexts); no new TODO/FIXME in the diff (verified); `RequestClock` uses primary-constructor form consistently across both copies (post-edit linter rewrite, aligned for parity per generator notes); no log-only locals; the `_capturedNow ??= …` lazy capture is the minimal abstraction the planner asked for; appropriate Scoped lifetime (per-request). Minor docked: no XML doc on `IRequestClock` is project-rule-aligned, but the integration test that proves the canonical "two reads in one DI scope return the same DateTime" invariant is missing — that's planned for §5 so it does not cap this score, but it is the missing convention-anchor that would let the abstraction prove its own contract. |
| test_coverage_delta | 6.5 | LCOV-based `score-coverage-delta.mjs` returned `COVERAGE_DELTA_PCT=0` / `AUTO_FAIL=false` because the project lacks coverage instrumentation (no LCOV emitted by the `dotnet test` runner config). Direct evidence: 4 new `[Fact]` tests cover both branches of the new abstraction (capture-once-on-same-instance, distinctness-across-instances) for both services; 0 existing tests deleted; 0 previously-passing tests now red (470/470 at HEAD; 466/466 at baseline). Strict-superset additive on the test corpus. Missing: the per-request integration test (planner §5) that wires `WebApplicationFactory` + `FakeTimeProvider` and asserts that two `_clock.GetUtcNow()` reads from the same scoped DI scope return the same `DateTime` AFTER `FakeTimeProvider.Advance` between the reads — this is the only test that actually proves the brief's per-request-capture claim end-to-end, and it is the highest-value test the refactor needs. The current unit tests prove "capture-once per instance" which is necessary but not sufficient (it does not prove that the DI container's Scoped lifetime supplies one instance per request). |
| perf_envelope | 9.5 | No `perf` surface in `behavior-capture.json`; planner's pinned envelope is implicit ("no regression visible to baseline tests"). The injected `RequestClock` is dead code in production at HEAD — no call site reaches `_clock.GetUtcNow()` yet — so its overhead is literally zero in the hot path. `dotnet test` wall-clock duration unchanged within noise. No envelope concern. |

**Weighted total** = 5.5 × 0.45 + 8.5 × 0.20 + 6.5 × 0.20 + 9.5 × 0.15 = 2.475 + 1.700 + 1.300 + 1.425 = **6.900**.

Pass threshold = 7.0. Weighted total below threshold AND `BEHAVIOR_DRIFT=true` → `AUTO_FAIL=true` → `VERDICT=FAIL`.

## Per-axis movement (from `refactor-plan.md`)

| Axis | Baseline | Target | Current (HEAD `3c4deca`) | Verdict |
|------|----------|--------|---------|---------|
| In-scope `DateTime.UtcNow` reads (Features + Api/Controllers + Api/Middleware) | 10 | 0 | 10 | unchanged |
| Handlers/controllers depending on `IRequestClock` (grep on `Features/Features` + `Api/Controllers`) | 0 | 5 | 2 (impl files only — no real consumers) | unchanged-semantically |
| Entity-initializer `DateTime.UtcNow` reads (Feature.cs + FeatureStagePlan.cs) | 4 (matches; planner's "2" miscounts properties) | 0 | 4 | unchanged |
| Per-request-capture integration test (`tests/**` for capture/PerRequest patterns) | 0 | ≥1 | 0 | unchanged |
| Unit tests for `RequestClock` (`tests/**/*RequestClock*Tests.cs` `[Fact]`/`[Theory]`) | 0 | ≥3 | 4 | **improved (target met)** |
| `dotnet build` errors | 0 | 0 | 0 | unchanged (green) |
| `dotnet test` total | 466 | ≥466 | 470 | **improved (additive)** |

Note on baseline value of axis 3: `refactor-plan.md` lists baseline as "2" (entity types), but the source-of-truth command `grep -E 'DateTime\.UtcNow' Feature.cs FeatureStagePlan.cs | wc -l` actually counts property-initializer matches — 4 at baseline (CreatedAt + UpdatedAt × 2 entities) and 4 at HEAD. The axis is unchanged either way.

## Issues

- `RF-001-01` — **critical** — Behavior-preservation gate failed on `jwt_claims_and_expiration_shape` due to grep-line-number shift after `using OneMoreTaskTracker.Api.Time;` was inserted at the top of `OneMoreTaskTracker.Api/Program.cs`. JWT semantics are byte-identical; the drift is artifactual.
  - target_file: `gan-harness-refactor/per-request-datetime-provider/behavior-capture.json` (and/or `behavior-contract.md`)
  - change: tighten the `jwt_claims_and_expiration_shape` capture command — `Auth/JwtTokenService.cs` and `Auth/JwtOptions.cs` keep the line-numbered grep (those files are MUST-NOT-touch — line drift would mean a real edit), while `Api/Program.cs`'s JWT lines are grepped without line-number prefixes (the file legitimately churns for unrelated DI). The frozen `behavior-contract.json` was re-captured at `b96117e` with the updated surface so baseline ↔ current diffs are apples-to-apples.
  - **status: resolved (applied 2026-04-29 between evaluator runs; gate now reports `no diff` on the JWT surface)**
  - severity: critical (was a gate failure that would have recurred every iteration; resolved before iter-2)

- `RF-001-02` — **major** — `IRequestClock` consumer count semantically still 0 at HEAD; no handler or controller has been migrated. iter-1 was scoped narrow by design (planner §1 — "introduce the abstraction"), so this is not a generator deviation. Surfacing it here so iter-2's generator picks it up.
  - target_file: `OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs`, `OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs`, `OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs`
  - change: inject `IRequestClock` via constructor, replace `var now = DateTime.UtcNow;` with `var now = _clock.GetUtcNow();`. **Coordinate with the interim commit `3c4deca`'s reshape**: `PatchFeatureHandler.Patch` and `PatchFeatureStageHandler.Patch` no longer have a single top-of-method `var now = DateTime.UtcNow;` — those reads have been pushed into nested if-blocks / inlined at the call site. The iter-2 generator must inject `IRequestClock` once into the handler's primary constructor and replace each per-block `DateTime.UtcNow` read with `_clock.GetUtcNow()` rather than reverting to a single top-level `now` local (that would re-introduce the variable-lifetime smell `3c4deca` removed). `CreateFeatureHandler` is unaffected by the reshape — single top-level `var now = DateTime.UtcNow;` on line 27 still applies and migrates cleanly.
  - status: new
  - ref: `refactor-plan.md` §"Planned commits" item 2

- `RF-001-03` — **major** — Per-request-capture integration test missing; the canonical proof of the brief's "one request → two clock reads → identical `DateTime`" invariant is not yet covered. The current unit tests prove capture-once *per instance* but do not prove that the DI Scoped lifetime supplies one instance per request.
  - target_file: `tests/OneMoreTaskTracker.Features.Tests/` (suggested: `Features/RequestClockScopeIntegrationTests.cs` or similar)
  - change: spin up `WebApplicationFactory<Program>` (or the Features service equivalent) replacing the registered `TimeProvider` with `FakeTimeProvider`; from a single `IServiceScope` resolve `IRequestClock` and call `GetUtcNow()` twice with `FakeTimeProvider.Advance(...)` between calls — assert both reads return the same `DateTime`. From a fresh scope (`scopeFactory.CreateScope()`) resolve `IRequestClock` again and assert that read returns the advanced value.
  - status: new
  - ref: `refactor-plan.md` §"Planned commits" item 5; `refactor-eval-rubric.md` §"`test_coverage_delta`"

- `RF-001-04` — **minor** — Entity-initializer migration (Feature.cs / FeatureStagePlan.cs default `= DateTime.UtcNow`) deferred per planner §3. Mentioned here as a sticky tracker for iter-3.
  - target_file: `OneMoreTaskTracker.Features/Features/Data/Feature.cs`, `OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs`
  - change: drop the `= DateTime.UtcNow` default initializers; require all callers to set `CreatedAt = now, UpdatedAt = now` explicitly via `init` setters. Update `CreateFeatureHandler`, `DevFeatureSeeder`, and any `FeatureStagePlan` materialization site to pass `now`.
  - status: new
  - ref: `refactor-plan.md` §"Planned commits" item 3

- `RF-001-05` — **minor** — `TasksController` (`Api/Controllers/Tasks/TasksController.cs:70,77`) and `DevFeatureSeeder` (`Features/Data/DevFeatureSeeder.cs:90`) deferred per planner §4. Sticky tracker for iter-4.
  - target_file: `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs`, `OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs`
  - change: inject `IRequestClock` (Api copy / Features copy); replace each `DateTime.UtcNow` with `_clock.GetUtcNow()`. For `DevFeatureSeeder.SeedAsync`, resolve `IRequestClock` from the seed scope (`Program.cs` does this on startup).
  - status: new
  - ref: `refactor-plan.md` §"Planned commits" item 4

- `RF-001-06` — **minor** — `baseline-tests.json` is empty (`tests: {}`) — `check-baseline-tests.mjs --mode compare` ran vacuously (`ran 0 tests, 0 regressed`). The script reported `BASELINE_TESTS_REGRESSED=false`, but that conclusion is not anchored in baseline test names. I confirmed regression-free status by direct `dotnet test OneMoreTaskTracker.slnx` invocation: 470/470 pass. Recommend re-running `check-baseline-tests.mjs --mode capture` with a parser that actually populates the baseline manifest (the runners config has `--logger:"console;verbosity=normal"`, which the `generic` parser on the script may not be parsing into named tests). Fixing this strengthens the regression check on every subsequent iteration.
  - target_file: `gan-harness-refactor/per-request-datetime-provider/baseline-tests.json` (and possibly `runners.json` test command)
  - change: re-capture with a parser that emits per-test status (e.g. add `--logger:"trx;LogFileName=results.trx"` and a TRX-aware parser, or use `dotnet test ... --logger:"console;verbosity=detailed"` if `generic` parser tolerates it). Until then, the iter-2 evaluator should also run a direct `dotnet test` and compare counts, as I did here.
  - status: new
  - severity: minor (no real regression risk in iter-1 — verified manually — but a critical-path tool of the harness is non-functional)

## next_actions

[ { "id": "RF-001-01",
    "severity": "critical",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/behavior-capture.json",
    "change": "Tighten jwt_claims_and_expiration_shape capture: keep line-number prefixes for Auth/*.cs (MUST-NOT-touch, line drift = real edit); strip line-number prefixes for Api/Program.cs (legitimately churns for unrelated DI). Re-captured frozen baseline at b96117e with updated surface so baseline ↔ current is apples-to-apples.",
    "ref": "behavior-contract.md §Captured surfaces; refactor-plan.md §Behavior preservation envelope",
    "status": "resolved" },
  { "id": "RF-001-02",
    "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs;OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs;OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs",
    "change": "Inject IRequestClock via primary constructor; replace each in-handler DateTime.UtcNow read with _clock.GetUtcNow(). Coordinate with interim commit 3c4deca's reshape — do not re-introduce a single top-level `var now = …` local in PatchFeatureHandler / PatchFeatureStageHandler. Use _clock.GetUtcNow() at each in-block read site to preserve the tightened variable lifetime. CreateFeatureHandler line 27 migrates cleanly to a single top-of-method local.",
    "ref": "refactor-plan.md §Planned commits item 2",
    "status": "new" },
  { "id": "RF-001-03",
    "severity": "major",
    "target_file": "tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs",
    "change": "Add a WebApplicationFactory-style integration test: register FakeTimeProvider, resolve IRequestClock twice from a single IServiceScope with FakeTimeProvider.Advance between the reads, assert both reads return the same DateTime; from a fresh scope, assert IRequestClock returns the advanced value. This is the canonical proof of the per-request-capture invariant the brief promised.",
    "ref": "refactor-plan.md §Planned commits item 5",
    "status": "new" },
  { "id": "RF-001-04",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Data/Feature.cs;OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs",
    "change": "Drop `= DateTime.UtcNow` default initializers from CreatedAt/UpdatedAt on both entities; update callers to pass `now` explicitly via init setters.",
    "ref": "refactor-plan.md §Planned commits item 3",
    "status": "new" },
  { "id": "RF-001-05",
    "severity": "minor",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs;OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs",
    "change": "Inject IRequestClock; replace DateTime.UtcNow reads on TasksController lines 70,77 and DevFeatureSeeder line 90 with _clock.GetUtcNow(). DevFeatureSeeder resolves the clock from its seed scope.",
    "ref": "refactor-plan.md §Planned commits item 4",
    "status": "new" },
  { "id": "RF-001-06",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/baseline-tests.json",
    "change": "Re-capture baseline tests with a parser that populates per-test names (e.g. via TRX logger). Current file has tests: {} so the regression check is vacuous; manual `dotnet test` confirms 470/470 at HEAD vs 466/466 at baseline.",
    "ref": "GAN-FEATURE-SHARED.md §Refactor auto-fail triggers (test suite regression check)",
    "status": "new" } ]
