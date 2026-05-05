# Verdict — per-request-datetime-provider — iter 004

Iteration: 4
Track: backend
Generator commit: 13880e9acfc062bab19d554224e100462cbd08df
Working-tree HEAD evaluated: 13880e9acfc062bab19d554224e100462cbd08df

## Top-line

- **Verdict: PASS** (above pass threshold; gate green; no auto-fail trigger fired)
- **Behavior drift: false   ← gate green** (only `test_corpus_assertion_count` differs and is planner-pinned additive-only; baseline 969 → current 977, +8, identical to iter-3 — iter-4 added 0 new tests, only mechanically rewired one production file)
- **Auto-fail: false**
- Weighted total: 8.405
- Pass threshold: 7.0

## Gate

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

`BEHAVIOR_DRIFT=true` was set by the diff script for `test_corpus_assertion_count`; planner pre-pinned a strict-superset additive exception for that surface (see `refactor-plan.md` §"Behavior preservation envelope"). Baseline `969` → current `977` (+8) — extracted via `jq '.surfaces[] | select(.id=="test_corpus_assertion_count") | .data'` on both contracts. The +8 delta is **identical to iter-3** (iter-4 added 0 new tests; only mechanically rewired `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs`). No assertion deletion: the other 7 surfaces — including the iter-3-flagship `feature_entity_shape` AND the just-edited `api_endpoint_matrix` — all show `no diff`. Treated as parity per plan. `AUTO_FAIL` overridden to `false`.

The most load-bearing observation this iteration is **`api_endpoint_matrix: no diff`** despite `TasksController.cs` being the file that just gained a primary-ctor parameter. This is by design: the iter-4 generator deliberately inlined the new ctor param onto the `userService` line and used a fully-qualified type (`OneMoreTaskTracker.Api.Time.IRequestClock`) so the file remains at exactly 129 lines — every `[Http*]/[Authorize]/[Route]/[ApiController]` attribute below the ctor stays on its baseline line number. The compromise is cosmetically suboptimal (logged as `RF-004-01`) but the routes themselves, the HTTP verbs, the `[Authorize]` policies, the `[AllowAnonymous]` markers, and the ordering are byte-identical to baseline.

## Score breakdown

| Criterion | Weight | Score | Contribution |
|-----------|--------|-------|--------------|
| code_quality_delta | 0.45 | 9.0 | 4.050 |
| integration_and_conventions | 0.20 | 8.3 | 1.660 |
| test_coverage_delta | 0.20 | 6.5 | 1.300 |
| perf_envelope | 0.15 | 9.3 | 1.395 |
| **Total** | 1.00 | | **8.405** |

## Auto-fail summary

Triggers from `GAN-FEATURE-SHARED.md` §"Refactor auto-fail triggers":

- [ ] Behavior contract drift — false (gate green; planner-pinned additive parity on `test_corpus_assertion_count`).
- [ ] Test suite regressed (previously-green test now red) — false; 470/470 pass at HEAD vs 466/466 at baseline (verified via direct `dotnet test --no-build`; the empty `baseline-tests.json` left the harness check vacuous, RF-001-06).
- [ ] Coverage on touched file dropped > 2% — false; net +0 new tests in iter-4 (1 production file rewired; 0 test files modified; 0 deleted; 0 regressed). The Api integration tests (`tests/OneMoreTaskTracker.Api.Tests/Controllers/Tasks*`) exercise the new clock indirectly via `WebApplicationFactory<Program>` + the iter-1 DI registration.
- [ ] Perf envelope regression beyond planner tolerance — false; abstraction now exercised in 5 production hot paths (3 Features handlers + DevFeatureSeeder + TasksController; the seeder runs once at startup, the rest are per-request); +1 virtcall per `DateTime` read inside TasksController endpoints; sub-µs in real terms; well within envelope.
- [ ] Contract bump attempted — false; all surfaces parity (or planner-pinned additive parity).
- [ ] MUST-NOT-touch violation — false; manually cross-checked `git diff --name-only b96117e..13880e9` against the plan's MUST-NOT-touch globs (the script reports 0 violations vacuously per RF-002-02; manual verification confirms zero MUST-NOT-touch hits). `git diff b96117e..13880e9 -- OneMoreTaskTracker.Api/Auth/ OneMoreTaskTracker.Api/openapi.json OneMoreTaskTracker.Features/Protos OneMoreTaskTracker.Features/Migrations OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs OneMoreTaskTracker.GitLab.Proxy/ OneMoreTaskTracker.Tasks/ OneMoreTaskTracker.Users/ OneMoreTaskTracker.WebClient/ compose.yaml '*Dockerfile*' '*appsettings*.json'` yields **0 lines**. iter-4's lone touched file is `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs` — explicitly in scope. JWT block in `Api/Program.cs` byte-identical (iter-4 didn't touch `Program.cs` at all).

## Score progression

| Iter | Total | code_quality | integration | coverage | perf | drift |
|------|-------|--------------|-------------|----------|------|-------|
| 1 | 6.900 | 5.5 | 8.5 | 6.5 | 9.5 | false (after RF-001-01) |
| 2 | 7.320 | 6.5 | 8.5 | 6.5 | 9.3 | false |
| 3 | 8.140 | 8.2 | 8.7 | 6.5 | 9.4 | false (after RF-002-03 v2) |
| 4 | **8.405** | 9.0 | 8.3 | 6.5 | 9.3 | false |
| Δ vs iter-3 | +0.265 | +0.8 | −0.4 | 0.0 | −0.1 | — |

iter-4 is the harness run's first iteration where **the brief's flagship goal is structurally met**: axis #1 (in-scope `DateTime.UtcNow` reads) drops from 2 → **0** = TARGET MET. The +0.8 jump in `code_quality_delta` reflects the closure of the last partial axis from the MUST-improve table; integration ticks **down** by 0.4 to register the cosmetic compromise (fully-qualified type + inlined ctor param, traded for `api_endpoint_matrix` line-number parity); coverage holds flat at 6.5 because iter-4 added 0 new tests; perf shifts down 0.1 because the abstraction now sees +1 per-request hot path. The net +0.265 is smaller than iter-3's +0.820 because iter-4's slice is intentionally small (1 file, 5 lines of substantive change) — the size matches the remaining work.

Per-axis status at HEAD `13880e9`: **6 met / over-target** (#1, #2 over-target / semantic-target-met, #3 held, #5 held, build, test count) / **0 partial** / **1 unchanged-by-design** (#4 deferred to iter 5) / **0 regressed**. This is the strongest axis-table position of the run.

## Recommendation

**Proceed to iter 5.** Above pass threshold AND gate green AND no auto-fail. Per the harness pseudocode (`/gan-refactor` SKILL §Phase 2), the loop continues to drive the remaining unchanged-by-design axis (#4 per-request integration test) toward target.

Specifically:

1. **iter-5 generator slice**: `refactor-plan.md` §"Planned commits" item 5 — add the per-request-capture integration test. **Features-side preferred** (planner: "the heavier service"). Spin up `WebApplicationFactory<Program>`-equivalent test fixture for the Features service; replace the registered `TimeProvider` with `Microsoft.Extensions.Time.Testing.FakeTimeProvider`; from a single `IServiceScope` resolve `IRequestClock` twice with `FakeTimeProvider.Advance(TimeSpan.FromMinutes(1))` between calls — assert both reads return the same `DateTime`. From a fresh scope (`scopeFactory.CreateScope()`) resolve `IRequestClock` again and assert that read returns the advanced value. This is the canonical proof of the brief's per-request-capture invariant via the DI Scoped lifetime — the unit-level `RequestClockTests` only prove capture-once at the instance level. New file: `tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockScopeIntegrationTests.cs`. Closes RF-001-03 and lifts axis #4 from 0 → ≥1 (target met). Expected impact on score: code_quality_delta lifts toward 9.5–10.0; test_coverage_delta lifts from 6.5 toward 7.5–8.0; weighted total lifts toward 9.0+.

2. **Optional planner-side fix** (orchestrator decision; non-blocking iter 5):
   - **`RF-004-01`** — harden the `api_endpoint_matrix` capture (drop `-n` from grep OR post-process to strip line-number prefix), then re-baseline `behavior-contract.{json,md}` at `b96117e`. After the fix, optionally follow with a cosmetic-cleanup commit on `TasksController.cs` that reverts the inlined ctor param to one-line-per-param + adds `using OneMoreTaskTracker.Api.Time;`. Same shape as RF-001-01 / RF-002-03 v2. **Either fix-then-iter-5 or accept-cosmetic-compromise-and-ship.** Option A is preferred for long-term maintainability; option B is acceptable because the deviation is tagged in `generator-notes-iter-004.md` and the diff is one file.

3. **Defer (sticky issues for future iterations)**:
   - `RF-001-06` — re-capture `baseline-tests.json` with a TRX-aware parser (4th iteration unresolved).
   - `RF-002-01` — tighten axis #2's source-of-truth grep to exclude impl files (semantic count now lands exactly on planner-intended target ≥5; cosmetic only).
   - `RF-002-02` — widen `check-must-not-touch.mjs`'s bullet regex.

The substantive iter-4 work is correct: `TasksController` ctor gains `IRequestClock clock`; `DefaultFirstPushDate` converts from `static` to instance (no other static callers; sibling `DefaultLookback` correctly remains `static readonly`); both `DateTime.UtcNow` reads → `clock.GetUtcNow()`; 470/470 still pass; build clean (0 errors / 0 warnings); JWT block byte-identical (iter-4 didn't touch Api/Program.cs at all); no MUST-NOT-touch violation; all 7 captured surfaces remain at parity (test_corpus_assertion_count is planner-pinned additive and held at 977 = iter-3 value). The brief's flagship goal — every production read of "now" inside a single request observes the same `DateTime` — is now structurally met across every in-scope code path; the iter-5 integration test will provide the canonical end-to-end proof.
