# Refactor Feedback — per-request-datetime-provider — iter 004

Iteration: 4
Generator commit: 13880e9acfc062bab19d554224e100462cbd08df
Working-tree HEAD evaluated: 13880e9acfc062bab19d554224e100462cbd08df
Behavior drift: false (gate green; only `test_corpus_assertion_count` differs and is planner-pinned additive-only)
Weighted total: 8.405

## Behavior preservation gate

- Status: **PASS**
- Re-capture: `gan-harness-refactor/per-request-datetime-provider/.iter/4/behavior-contract.json` (label `iter-4`, captured at HEAD `13880e9`).
- Frozen baseline: `gan-harness-refactor/per-request-datetime-provider/behavior-contract.json` (re-captured at `b96117e` after RF-001-01 + RF-002-03 v2 capture-surface fixes; see `run.log` for the trail).

`diff-behavior-contract.mjs` evidence map (verbatim, from `.iter/4/behavior-diff.json`):

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

`BEHAVIOR_DRIFT=true` was set by the diff script because the `test_corpus_assertion_count` surface bytes changed, but the planner pre-pinned a strict-superset additive exception for that one surface (see `refactor-plan.md` §"Behavior preservation envelope"). Baseline `969\n` → current `977\n` (+8) — extracted via `jq '.surfaces[] | select(.id=="test_corpus_assertion_count") | .data'` on both contracts. The +8 delta is **identical to iter-3** (iter-4 added 0 new tests; only mechanically rewired one production file). No assertion deletion: the other 7 surfaces — including the iter-3-flagship `feature_entity_shape` AND the just-edited `api_endpoint_matrix` — all show `no diff`. Treated as parity per plan. `AUTO_FAIL` is therefore overridden to `false`.

The most load-bearing observation this iteration is **`api_endpoint_matrix: no diff`**. The iter-4 generator chose a stylistic compromise (fully-qualified `OneMoreTaskTracker.Api.Time.IRequestClock` + ctor param inlined onto the `userService` line) specifically to keep the file at **129 lines** (= baseline) so every `[Http*]/[Authorize]/[Route]/[ApiController]` attribute remains on its baseline line number. The compromise is cosmetically suboptimal but behaviorally invisible — the matched route values, HTTP verbs, attribute markers, and ordering would have been byte-identical either way; it is the embedded `grep -n` line-number prefixes that are brittle. See `RF-004-01` below for the planner-side fix recommendation.

## Baseline-test regression check

- `check-baseline-tests.mjs --mode compare --feature-dir … --runners … --side backend` returned `BASELINE_TESTS_REGRESSED=false` with evidence `ran 0 tests, 0 regressed (baseline had 0)` — vacuous because `baseline-tests.json` has `tests: {}` (RF-001-06 sticky from iter-1 / iter-2 / iter-3).
- Direct cross-check: `dotnet test OneMoreTaskTracker.slnx --nologo --no-build` → **470/470 pass, 0 failed** (Tasks 68, Users 45, Features 118, GitLab.Proxy 63, Api 176). 0 build errors / 0 warnings (`dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`). Identical totals to iter-3 — confirming the rewire is mechanical and no test was inadvertently disabled or reworded.

## MUST-NOT-touch cross-check (manual)

`git diff --name-only b96117e..13880e9` (filtered against the plan's MUST-NOT-touch globs):

```
git diff --name-only b96117e..13880e9 -- \
  OneMoreTaskTracker.Api/Auth/ \
  OneMoreTaskTracker.Api/openapi.json \
  OneMoreTaskTracker.Features/Protos/ \
  OneMoreTaskTracker.Features/Migrations/ \
  OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs \
  OneMoreTaskTracker.GitLab.Proxy/ \
  OneMoreTaskTracker.Tasks/ \
  OneMoreTaskTracker.Users/ \
  OneMoreTaskTracker.WebClient/ \
  compose.yaml '*Dockerfile*' '*appsettings*.json'
→ (0 lines of output)
```

iter-4's only touched file is `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs` — explicitly in scope per `refactor-plan.md` §"Scope boundary". `git diff --name-only 82f069a..13880e9` confirms exactly one file changed this iteration.

JWT block in `Api/Program.cs`: byte-identical. `git diff --stat 82f069a..13880e9 -- OneMoreTaskTracker.Api/Program.cs` is empty — iter-4 did not edit `Program.cs` at all. The cumulative `b96117e..13880e9` diff for `Api/Program.cs` shows ONLY the iter-1 insertions (`using OneMoreTaskTracker.Api.Time;` plus `AddSingleton<TimeProvider>(TimeProvider.System); AddScoped<IRequestClock, RequestClock>();` after `AddAuthorization()`); the `AddAuthentication(JwtBearerDefaults.…)` / `AddJwtBearer(...)` block is byte-identical to baseline.

`check-must-not-touch.mjs` again reports 0 violations vacuously per RF-002-02 (sticky); the manual cross-check above is the load-bearing evidence.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 9.0 | 7 axes: **6 met / over-target**, 0 partial, **1 unchanged-by-design** (#4 deferred to iter 5), 0 regressed. **Met:** axis #1 in-scope `DateTime.UtcNow` reads 10 → **0 = TARGET MET** (THE BRIEF'S FLAGSHIP GOAL — closed this iteration); axis #2 `IRequestClock`-using files 0 → **7** (target ≥5, semantic real-consumer count = 5: 3 handlers + DevFeatureSeeder + TasksController; +2 impl files inflate per RF-002-01); axis #3 entity-init reads 0 (held from iter-3 = TARGET MET); axis #5 RequestClock unit tests 4 (held from iter-1; ≥3 target); build 0 errors / 0 warnings; test count 470 (≥ 466 baseline). **Unchanged-by-design:** axis #4 per-request integration test 0 (carried as RF-001-03; iter 5 work). **Score progression:** 5.5 → 6.5 → 8.2 → **9.0** (+0.8 from iter-3). Per the rubric "all met / partial, none regressed → 7–8" with the flagship axis at zero lifting toward 9–10. Lands at 9.0 not 9.5 because axis #4 (the canonical integration-level proof of the per-request invariant) is the one remaining gap; it is iter 5's deliberate scope, but the single-axis pendency keeps this score below the "all axes truly green" 9.5–10 ceiling. |
| integration_and_conventions | 8.3 | Inspected `git diff 82f069a..13880e9 -- OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs` (only file changed iter-4): (a) **Primary-ctor extension** is consistent with the existing positional convention — `taskCreator, taskLister, taskGetter, taskMover, userService, [new param], logger`. The new `clock` parameter sits between `userService` and `logger` mirroring the iter-2 Features handlers' "clock at end before cross-cutting deps" pattern. (b) **`DefaultFirstPushDate` static→instance conversion** is correct: there are no other static callers of `DefaultFirstPushDate` (verified via grep on the Api project); only the `CreateTask` method calls it. The sibling `DefaultLookback` correctly remains `static readonly` because it is a pure constant — no clock dependency. (c) **Two `DateTime.UtcNow` reads** (lines 70 and 77 in baseline) cleanly replaced with `clock.GetUtcNow()` — the captured-once value is reused across both reads inside `CreateTask` (one in `DefaultFirstPushDate()`, one in the inline `payload.StartDate ?? clock.GetUtcNow() - DefaultLookback` expression). (d) **`OneMoreTaskTracker.Api.Time.IRequestClock` is fully-qualified** in the ctor, **without** a `using OneMoreTaskTracker.Api.Time;` directive. This is a **deliberate compromise** to preserve `api_endpoint_matrix` line-number parity (see RF-004-01 below); the alternative ("clean" ctor with a separate line per param + `using` import) would have shifted every `[Http*]/[Authorize]/[Route]/[ApiController]` attribute below the ctor by 2 lines, registering as gate drift on a surface where the routes themselves are byte-identical. The generator notes (`generator-notes-iter-004.md` §"Deviation from refactor-plan §'Planned commits' item 4") explicitly tag this compromise. **Cosmetically suboptimal but justified.** (e) **JWT block in `Api/Program.cs`**: byte-identical (verified — iter-4 didn't touch `Program.cs` at all; cumulative `b96117e..13880e9` diff for the file shows only the iter-1 insertions). (f) **No new TODO/FIXME** in the diff. (g) **No log-only `DateTime` locals** introduced. (h) Bounded-context isolation respected — `IRequestClock` reference uses the Api copy (`OneMoreTaskTracker.Api.Time.IRequestClock`) only, no leakage from the Features copy. **Score progression:** 8.5 → 8.5 → 8.7 → **8.3** (−0.4 vs iter-3). The −0.4 is the one tick down for the cosmetic compromise (fully-qualified type + inlined ctor param). Would be 9.0 with a clean `using` — which the planner-side RF-004-01 fix unlocks for any future controller migration. |
| test_coverage_delta | 6.5 | `score-coverage-delta.mjs` not run (project does not emit LCOV — sister concern of RF-001-06). Direct evidence: 0 new test files, 0 modified test files, 0 deleted, 0 regressed. The integration tests in `tests/OneMoreTaskTracker.Api.Tests/Controllers/Tasks*` (`TasksControllerCreateTaskTests.cs`, `TasksControllerGetTaskTests.cs`, `TasksControllerGetTasksTests.cs`, `TasksControllerMoveTaskTests.cs`, all extending `TasksControllerTestBase`) exercise the new clock indirectly: the `WebApplicationFactory<Program>` test fixture relies on the iter-1 DI registration (`AddScoped<IRequestClock, RequestClock>()` + `AddSingleton<TimeProvider>(TimeProvider.System)`) so the controller resolves a real `RequestClock` wrapping `TimeProvider.System` for every request the test makes. Strict-superset preserved: assertion count holds at **977** (identical to iter-3; iter-4 added no `Should*/Be*/Equal/...` calls). 470/470 still pass; 176 Api tests stay green. Net new test count: +0. Missing: per-request integration test (RF-001-03 sticky) — still uncovered until iter 5. **Score progression:** 6.5 → 6.5 → 6.5 → **6.5** (held flat). The per-request integration test (RF-001-03) is the next axis-mover; iter 5 work. |
| perf_envelope | 9.3 | TasksController endpoints (`GetTasks`, `GetTask`, `CreateTask`, `MoveTask`) now go through one extra virtcall per `DateTime` read — `clock.GetUtcNow()` resolves to `RequestClock.GetUtcNow()` which is a nullable-backing-field lazy read (`_capturedNow ??= _timeProvider.GetUtcNow().UtcDateTime`). Sub-µs regression in real terms; well within the planner's implicit envelope (no surface regression, no hot-path work added). Per-request reads now go through `RequestClock.GetUtcNow()` in **5** production hot paths total (3 Features handlers + DevFeatureSeeder + TasksController; the seeder runs once at startup, the rest are per-request). `dotnet test` wall-clock duration unchanged within noise vs iter-3 (Tasks 604ms, Users 2s, Features 540ms, GitLab.Proxy 151ms, Api 788ms). No surface regression. **Score progression:** 9.5 → 9.3 → 9.4 → **9.3** (−0.1 vs iter-3). The −0.1 reflects the +1 per-request hot path (TasksController) very slightly outweighing the retained iter-3 entity-default-removal micro-WIN. Functionally indistinguishable. |

**Weighted total** = 9.0 × 0.45 + 8.3 × 0.20 + 6.5 × 0.20 + 9.3 × 0.15 = 4.050 + 1.660 + 1.300 + 1.395 = **8.405**.

Pass threshold = 7.0. Weighted total above threshold AND `BEHAVIOR_DRIFT` resolved to false (planner-pinned additive parity) AND `AUTO_FAIL=false` → `VERDICT=PASS`.

## Per-axis movement (from `refactor-plan.md`)

| Axis | Baseline | Target | iter-1 (`3c4deca`) | iter-2 (`55cd078`) | iter-3 (`82f069a`) | iter-4 (`13880e9`) | Verdict |
|------|----------|--------|--------------------|--------------------|--------------------|--------------------|---------|
| In-scope `DateTime.UtcNow` reads (Features + Api/Controllers + Api/Middleware) | 10 | 0 | 10 | 7 | 2 | **0** | **TARGET MET** (the brief's flagship goal — closed iter-4) |
| Files depending on `IRequestClock` (file grep on `Features/Features` + `Api/Controllers`) | 0 | 5 | 2 (impl files only) | 5 (2 impl + 3 handlers) | 6 (+ DevFeatureSeeder) | **7** (+ TasksController) | **target met / over-target** per planner's interpretation; semantic real-consumer count 4 → **5** = exactly the planner-intended target |
| Entity-init `DateTime.UtcNow` reads (Feature.cs + FeatureStagePlan.cs) | 4 | 0 | 4 | 4 | **0** | **0** | TARGET MET (held from iter-3) |
| Per-request-capture integration test | 0 | ≥1 | 0 | 0 | 0 | **0** | unchanged-by-design (iter 5; carried as RF-001-03) |
| Unit tests for `RequestClock` (`*RequestClock*Tests.cs` `[Fact]`/`[Theory]`) | 0 | ≥3 | 4 | 4 | 4 | **4** | TARGET MET (held from iter-1) |
| `dotnet build` errors | 0 | 0 | 0 | 0 | 0 | **0** | unchanged (green; 0 warnings) |
| `dotnet test` total | 466 | ≥466 | 470 | 470 | 470 | **470** | improved-from-baseline (held; +4 from iter-1's RequestClock tests) |

6 met / 0 partial / 1 unchanged-by-design (#4 deferred) / 0 regressed.

## Issues

### New (RF-004)

- `RF-004-01` — **minor** — `api_endpoint_matrix` capture surface is line-number-sensitive. The capture command is `grep -rEn '^\s*\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|Route|Authorize|AllowAnonymous|ApiController)' OneMoreTaskTracker.Api/Controllers --include='*.cs' | sort`. The `-n` flag emits a `<filepath>:<line>:` prefix, which makes the captured text shift on every iteration that adds even one line above an attribute — even when the routes themselves are byte-identical. The iter-4 generator worked around this by inlining the new ctor parameter onto the `userService` line and using a fully-qualified type (`OneMoreTaskTracker.Api.Time.IRequestClock`) instead of adding a `using OneMoreTaskTracker.Api.Time;` import — keeping `TasksController.cs` at exactly 129 lines (= baseline). The workaround preserves parity but is cosmetically suboptimal and forces every future controller migration into the same constraint. Same class of brittleness as `feature_entity_shape` was before RF-002-03 v2 (default-initializer suffix capture) and `jwt_claims_and_expiration_shape` was before RF-001-01 (Program.cs line-number shift). Recommend the same shape of planner-side fix.
  - target_file: `gan-harness-refactor/per-request-datetime-provider/behavior-capture.json` (the `api_endpoint_matrix` surface entry)
  - change: harden the capture so it is insensitive to line-number shifts. Two equally good options: (a) drop `-n` from the grep — line numbers are not behaviorally meaningful for a route surface; the routes themselves carry the parity claim; (b) keep `-n` but post-process via `sed -E 's/^([^:]+):[0-9]+:/\1:/'` to strip the `:<line>:` prefix to a `:` prefix only. After the capture is hardened, re-baseline `behavior-contract.{json,md}` at `b96117e` (same procedure as RF-001-01 / RF-002-03 v2) and the iter-4 cosmetic compromise (`OneMoreTaskTracker.Api.Time.IRequestClock` inline + same-line ctor params) can be unwound to the natural `using OneMoreTaskTracker.Api.Time;` + one-param-per-line form. **Not blocking iter-5.** The orchestrator may either (i) apply the planner-side fix before iter 5 and follow with a cosmetic-cleanup commit on `TasksController.cs`, or (ii) accept the cosmetic compromise for the rest of the run and ship as-is. Option (i) is preferred for long-term maintainability; option (ii) is acceptable because the deviation is tagged in `generator-notes-iter-004.md` and the diff is one file.
  - status: new
  - severity: minor
  - ref: `behavior-capture.json` `api_endpoint_matrix` entry; `generator-notes-iter-004.md` §"Deviation from refactor-plan §'Planned commits' item 4"

### Resolved this iteration

- ~~`RF-001-05`~~ — **RESOLVED**. The DevFeatureSeeder half resolved in iter-3; the TasksController half lands now in iter-4. `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs:70` and `:77` (the last two in-scope `DateTime.UtcNow` reads in production code) are gone. `clock.GetUtcNow()` replaces both. Axis #1 hits target zero. The brief's flagship goal — "every production read of 'now' inside a single gRPC/HTTP request observes the SAME `DateTime` value, captured once at the start of the request" — is structurally achieved across every in-scope code path. (The remaining `DateTime.UtcNow` in `OneMoreTaskTracker.Api/Auth/JwtTokenService.cs:40` is intentionally pinned out of scope per `refactor-plan.md` §"Scope boundary" / §"MUST-NOT-touch".)

### Carried forward (unresolved)

- `RF-001-03` — **major** — Per-request-capture integration test still missing. Canonical proof of the brief's "one request → two clock reads → identical `DateTime`" invariant remains uncovered. The iter-1/2/3/4 unit tests prove capture-once at the **instance** level (a single `RequestClock` returns the same value for repeated `GetUtcNow()` calls), but they do not prove the **DI Scoped lifetime** supplies one `RequestClock` per request — i.e. that the framework-supplied scope boundary aligns with what the brief calls "per request". This is iter-5 work.
  - target_file: `tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs` (new, suggested) — or the Api-side equivalent under `tests/OneMoreTaskTracker.Api.Tests/Time/`. Features-side preferred per planner's note on "the heavier service".
  - change: spin up `WebApplicationFactory<Program>` (Features service preferred) replacing the registered `TimeProvider` with `Microsoft.Extensions.Time.Testing.FakeTimeProvider`; from a single `IServiceScope` resolve `IRequestClock` and call `GetUtcNow()` twice with `FakeTimeProvider.Advance(TimeSpan.FromMinutes(1))` between calls — assert both reads return the same `DateTime`. From a fresh scope (`scopeFactory.CreateScope()`) resolve `IRequestClock` again and assert that read returns the advanced value.
  - status: carried (defer to iter 5 per planner's commit-sequence)
  - ref: `refactor-plan.md` §"Planned commits" item 5
  - severity: major

- `RF-001-06` — **minor** — `baseline-tests.json` still has `tests: {}`; `check-baseline-tests.mjs --mode compare` continues to run vacuously every iteration (flagged this iteration as well — `evidence: ran 0 tests, 0 regressed (baseline had 0)`). Cross-checked again here via direct `dotnet test` (470/470 pass). Recommend re-running `check-baseline-tests.mjs --mode capture` with a TRX-aware parser. Non-blocking — the manual cross-check has worked reliably across 4 iterations.
  - target_file: `gan-harness-refactor/per-request-datetime-provider/baseline-tests.json` (and possibly `runners.json` test command)
  - change: re-capture with `dotnet test ... --logger:"trx;LogFileName=results.trx"` and a TRX-aware parser, OR use `--logger:"console;verbosity=detailed"` + parse pass/fail per-test from console output.
  - status: carried (4th iteration unresolved)
  - severity: minor

- `RF-002-01` — **minor** — Axis #2 source-of-truth grep over-counts at HEAD `13880e9`: the count is **7** (2 impl + 3 handlers + DevFeatureSeeder + TasksController), but the *real-consumer* count is 5 (3 handlers + DevFeatureSeeder + TasksController) — which IS the planner's target ≥5. The 2 impl files (`IRequestClock.cs` + `RequestClock.cs` in the Features side) inflate the number above 5. Note that the inflation is now mostly cosmetic — the semantic count does land exactly on the planner-intended target ≥5 — but a tightened grep would make the axis report directly readable.
  - target_file: documentation only — `gan-harness-refactor/per-request-datetime-provider/refactor-plan.md` §"Target axes (MUST-improve)" axis #2
  - change: optionally tighten the source-of-truth command to count real consumers only, e.g. `grep -rEln 'IRequestClock\b' OneMoreTaskTracker.Features/Features OneMoreTaskTracker.Api/Controllers --include='*.cs' | grep -vE 'IRequestClock\.cs|RequestClock\.cs' | sort -u | wc -l`. Not blocking — pin as a planner-side cleanup.
  - status: carried (3rd iteration unresolved)
  - severity: minor

- `RF-002-02` — **minor** — `check-must-not-touch.mjs`'s bullet regex still doesn't match `refactor-plan.md`'s prose-suffixed entries. Manual cross-check via `git diff --name-only ${BASELINE_SHA}..${GEN_COMMIT}` against literal globs from §MUST-NOT-touch (as done here) continues to be the reliable path. No violation found this iteration.
  - target_file: `~/.claude/scripts/gan-feature/check-must-not-touch.mjs` (and/or the `refactor-plan.md` template)
  - change: widen the script's bullet regex to tolerate ` — ` / `— ` / `(...)` suffixes after backtick-quoted paths, or constrain the plan template to one-pattern-per-line bullets.
  - status: carried (3rd iteration unresolved)
  - severity: minor

## next_actions

[ { "id": "RF-004-01",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/behavior-capture.json",
    "change": "Harden api_endpoint_matrix capture so it is insensitive to line-number shifts. Either drop -n from the grep, or post-process via sed -E 's/^([^:]+):[0-9]+:/\\1:/' to strip the :<line>: prefix. Then re-baseline behavior-contract.{json,md} at b96117e (same procedure as RF-001-01 / RF-002-03 v2). Optionally follow with a cosmetic-cleanup commit on TasksController.cs that reverts the inlined ctor param to one-line-per-param + adds 'using OneMoreTaskTracker.Api.Time;'. Not blocking iter 5; the orchestrator may instead accept the cosmetic compromise for the rest of the run.",
    "ref": "generator-notes-iter-004.md §Deviation from refactor-plan §'Planned commits' item 4; RF-001-01 + RF-002-03 v2 precedent",
    "status": "new" },
  { "id": "RF-001-03",
    "severity": "major",
    "target_file": "tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs",
    "change": "Add a WebApplicationFactory-style integration test: register FakeTimeProvider, resolve IRequestClock twice from a single IServiceScope with FakeTimeProvider.Advance between the reads, assert both reads return the same DateTime; from a fresh scope, assert IRequestClock returns the advanced value. This is the canonical proof of the per-request-capture invariant the brief promised. The handler-level TestRequestClock.System() helper proves capture-once at the instance level but does not prove the DI Scoped lifetime supplies one instance per request.",
    "ref": "refactor-plan.md §Planned commits item 5",
    "status": "carried" },
  { "id": "RF-001-06",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/baseline-tests.json",
    "change": "Re-capture baseline tests with a parser that populates per-test names (e.g. via TRX logger). Current file has tests: {} so the regression check is vacuous; manual `dotnet test` confirms 470/470 at HEAD vs 466/466 at baseline.",
    "ref": "GAN-FEATURE-SHARED.md §Refactor auto-fail triggers (test suite regression check)",
    "status": "carried (4th iteration unresolved)" },
  { "id": "RF-002-01",
    "severity": "minor",
    "target_file": "gan-harness-refactor/per-request-datetime-provider/refactor-plan.md",
    "change": "Optionally tighten axis #2's source-of-truth command to count real consumers only (exclude IRequestClock.cs / RequestClock.cs). At HEAD 13880e9 the file-grep count is 7; the semantic real-consumer count is 5 (3 handlers + DevFeatureSeeder + TasksController) — which IS the planner-intended target ≥5. Not blocking — pin as a planner-side cleanup.",
    "ref": "refactor-plan.md §Target axes (MUST-improve) axis #2",
    "status": "carried (3rd iteration unresolved)" },
  { "id": "RF-002-02",
    "severity": "minor",
    "target_file": "~/.claude/scripts/gan-feature/check-must-not-touch.mjs",
    "change": "Widen the script's bullet regex to tolerate ` — ` / `— ` / `(...)` suffixes after backtick-quoted paths, or constrain the plan template to one-pattern-per-line bullets. Until then, evaluator must cross-check via `git diff --name-only ${BASELINE_SHA}..${GEN_COMMIT}` against literal globs from §MUST-NOT-touch.",
    "ref": "_contract-shards/refactor-evaluator.md (manual cross-check obligation)",
    "status": "carried (3rd iteration unresolved)" } ]
