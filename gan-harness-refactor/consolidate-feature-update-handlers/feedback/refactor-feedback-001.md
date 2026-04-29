# Refactor feedback — iter 001

Track: fullstack
Generator commit: `ea45d57c15adf2e9c7ce00556c426b4a6b487512`
Baseline commit: `935dc9af224333e382e31d161a9a8eca9126ccfa`

## 1. Behavior-preservation gate

**`BEHAVIOR_DRIFT=false`** — all 8 captured surfaces re-captured at the generator's HEAD diff byte-for-byte against the frozen baseline.

Evidence (from `diff-behavior-contract.mjs`):

```
{
  "BEHAVIOR_DRIFT": false,
  "diffs": [],
  "evidence": {
    "openapi": "no diff",
    "proto_features": "no diff",
    "db_migrations_features": "no diff",
    "endpoint_matrix_plan_features": "no diff",
    "feature_summary_response_shape": "no diff",
    "planapi_exports": "no diff",
    "planapi_schemas": "no diff",
    "inline_editor_component_api": "no diff"
  }
}
```

The migration-parity exception list for iter 1 was empty (no wire surface was supposed to change). It wasn't needed — the diff is byte-clean.

## 2. MUST-NOT-touch gate

`MUST_NOT_TOUCH_VIOLATION=false`. Hand-verified: zero entries in the 11-file diff match `OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}/`, `tests/OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}.Tests/`, `compose.yaml`, `appsettings*.json`, any `Dockerfile`, `nuget.config`, or the five untracked PNGs. All 11 touched files live under `OneMoreTaskTracker.Features/` or `tests/OneMoreTaskTracker.Features.Tests/`.

## 3. Hard-bans scan

`scan-hard-bans.mjs` against the touched directories returned `{"matches":[],"auto_fail":false}`. The 3 static rules are CSS-only (gradient text, side-stripe, AI gradient #667eea); irrelevant to a BE-only iteration. Reflex-fonts rule N/A on FE (FE was untouched).

## 4. Baseline-test regression gate

`BASELINE_TESTS_REGRESSED=false`.

The harness baseline manifest captured at Phase 0 was empty (`tests: {}`) because the `generic` parser couldn't structure dotnet's per-project totals. I ran the BE suite at HEAD manually:

- `OneMoreTaskTracker.GitLab.Proxy.Tests`: 63 / 63
- `OneMoreTaskTracker.Features.Tests`: 98 / 98 (was 82 at baseline; +16 new aggregate-method tests)
- `OneMoreTaskTracker.Tasks.Tests`: 59 / 59
- `OneMoreTaskTracker.Api.Tests`: 183 / 183
- `OneMoreTaskTracker.Users.Tests`: 32 / 32
- **Total: 435 / 435** (baseline was 419; delta +16; 0 regressed)

FE: `npm --prefix OneMoreTaskTracker.WebClient test` — 52 test files / 435 individual test cases all passing, identical to baseline (FE source untouched in this iteration).

Generator's `dotnet test 435/435` and `npm test 52/52` claims verified.

## 5. MUST-improve axes — per-axis scoring

Source-of-truth commands re-run at HEAD (`ea45d57c`):

| # | Axis | Baseline | Target | At HEAD | Status | Notes |
|---|------|----------|--------|---------|--------|-------|
| 1 | Per-field Feature handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). OK at iter 1. |
| 2 | Per-field Stage handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). OK at iter 1. |
| 3 | Total handler files in `Features/Update/` | 7 | ≤ 2 | 7 | DEFERRED | Plan: drops in commits (b)–(f). OK at iter 1. |
| 4 | Per-field PATCH endpoints | 6 | 1 | 6 | DEFERRED | Plan: lands in commit (d)/(f). OK at iter 1. |
| 5 | FE per-field PATCH exports | 6 | 0 | 6 | DEFERRED | Plan: lands in commit (e)/(f). OK at iter 1. |
| 6 | `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 | **0** | **MET** | Iter 1 goal — hit target exactly. |
| 7 | `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 | **0** | **MET** | Iter 1 goal — hit target exactly. |
| 8 | BE tests passing | 419 | ≥ 419, 0 regressed | 435 | MET | +16 new aggregate-method unit tests. |
| 9 | FE tests passing | 52 | ≥ 52, 0 regressed | 52 | MET | FE untouched, all green. |
| 10 | Sibling test file per `*Handler.cs` | n/a (gaps existed at baseline) | 0 missing | 6 missing (pre-existing) | NEUTRAL | Not made worse; see RF-002 below. |

**Headline**: Iter 1's two declared targets (axes 6, 7) both at zero. Other axes are at baseline by design — the plan stages them across commits (b)–(f). The rubric is cumulative across iterations; deferred axes are NOT a deduction here.

## 6. Code-quality review

### What's good

- **Bump-and-stamp invariant is faithful.** Every "mutating" method on `Feature` (RenameTitle, SetDescription, AssignLead) and `FeatureStagePlan` (AssignOwner, SetPlannedStart, SetPlannedEnd) bumps `Version += 1` and assigns `UpdatedAt = now` exactly once. `Touch` exists for the bulk-update path that historically did NOT bump `Version` (preserves prior semantics on `UpdateFeatureHandler`). `RecordStageEdit` exists for stage-driven feature-version bumps without a field change. The five-method/four-method split mirrors today's mutation sites 1:1.
- **Single-snapshot semantics preserved.** Stage handlers previously took two `DateTime.UtcNow` reads (one for `plan.UpdatedAt`, then aliased to `feature.UpdatedAt`). The refactor takes ONE `var now = DateTime.UtcNow;` and threads it through `plan.AssignOwner(newOwner, now)` + `feature.RecordStageEdit(now)`. The "both timestamps equal" invariant the wire previously implied is now explicit. Generator's notes call this out; verified in the diff.
- **Bulk handler kept its idiosyncrasy.** `UpdateFeatureHandler` historically does NOT bump `Version` (it's the create-or-replace bulk path). The refactor preserves this by routing through `feature.Touch(now)` instead of `feature.Touch+RecordStageEdit`. This is a subtle correctness call that's easy to get wrong on a "consolidate everything" pass — the generator got it right.
- **Tests pin the invariants directly.** `FeatureAggregateTests` covers each method: bumps-version-by-one, stamps-UpdatedAt, RejectsNullTitle (ArgumentNullException), AcceptsNull-where-applicable, DoesNotMutateOtherFields, two-calls-bump-by-two. `FeatureStagePlanAggregateTests` mirrors this. 16 tests total, all green. These tests will catch the most likely AI regression in future iterations: forgetting to bump Version after adding a new mutator.
- **One type per file.** Both new test files contain exactly one top-level class. No `*Models.cs` aggregator files added.
- **No comment rot.** No iter labels, axis numbers, RF-NNN references, contract section refs, TODOs, or FIXMEs. The two existing block comments on `Feature.UpdatedAt` / `Feature.Version` (the EF Core concurrency-token notes) were preserved verbatim.
- **Idiomatic C#.** `Version += 1` not `Version = Version + 1`. `ArgumentNullException` with `nameof()`. Methods are `public void`, no async noise on synchronous in-memory mutators. Sealed test classes.

### Issues to carry forward

- **`RF-001` (LOW, deferred). Public setters on `Feature.UpdatedAt` / `Feature.Version` and `FeatureStagePlan.UpdatedAt` / `FeatureStagePlan.Version` are still `{ get; set; }`.** Generator's notes flag this as a conscious deviation: `CreateFeatureHandler` and `DevFeatureSeeder` populate `UpdatedAt` via object initializers, and tightening to `private set` would force an out-of-iter refactor of the create path. The grep-based axes (6, 7) — which are the actual gate — are at zero, so the encapsulation contract is met *for the update path*. Recommend tightening visibility once the consolidated handler surface lands (iter where commit (f) ships). At that point, the only remaining writer outside the aggregate is the create path, which can be migrated in the same commit.
- **`RF-002` (LOW, pre-existing). `UpdateFeatureLeadHandler.cs` has no sibling `*HandlerTests.cs`.** This gap existed at baseline (`935dc9af`). The other 5 per-field handlers do have siblings under `tests/.../Features/Update/`. Note: axis 10's source-of-truth command checks the FLAT path `tests/OneMoreTaskTracker.Features.Tests/${n}Tests.cs`; the actual repo organizes test files under `tests/.../Features/Update/${n}Tests.cs` (mirroring the source tree). The plan author may want to update axis 10's command in a future iteration to walk both paths, OR simply confirm that the lead handler will be deleted in commit (f) (per planner § "Planned commits") which retires the gap entirely. No action needed in iter 2; revisit at the iteration that deletes the per-field handlers.
- **`RF-003` (LOW). Test-class location.** The two new test classes live at `tests/OneMoreTaskTracker.Features.Tests/Features/Data/`. The other handler-tests in this project live at `tests/OneMoreTaskTracker.Features.Tests/` (flat) or `tests/OneMoreTaskTracker.Features.Tests/Features/Update/`. The new path mirrors the source path (`OneMoreTaskTracker.Features/Features/Data/`), which is consistent with the *source-tree* organization but inconsistent with the existing flat handler tests. Not a blocker; flag for the upcoming iteration that reshapes the existing flat handler-test files.

### What didn't need fixing

- The `RecordStageEdit(DateTime now)` method has no parameter for the field being edited. That's intentional — the method exists to bump the parent feature's version when a *child* (stage plan) was the one that changed. The aggregate's name is honest about this: "record the fact that a stage was edited". Don't be tempted to inline this back into the per-handler call site; the aggregate-vs-handler boundary is exactly right.
- The decision to make `Touch(DateTime now)` a separate method from `RecordStageEdit(DateTime now)` is correct. They have different semantics (no-version-bump vs. version-bump) and the bulk handler relies on the former.

## 7. Integration and conventions

- **Lint clean** (no lint runner for BE; the typecheck/build step in `runners.json` is the proxy and it's green via `dotnet test` exit 0 — `dotnet test` triggers a `dotnet build` first).
- **No new utilities.** The added methods all live on the aggregate they belong to; no new helpers added to `OneMoreTaskTracker.Features/Common/` or similar.
- **Imports stay within bounded context.** All edits live in `OneMoreTaskTracker.Features/`. No cross-context imports added; no new east-west calls; no Users-service / Tasks-service references.
- **No new TODO/FIXME** introduced (`grep -rE 'TODO|FIXME' touched files` → empty).
- **Conventional Commits compliant.** Commit message: `refactor(features): iter 1 — encapsulate Version + UpdatedAt invariants on Feature and FeatureStagePlan aggregates`. The "iter 1 — " infix is informational, not a comment in code; the `refactor(features):` prefix is correct. Future iter caveat: when commit (f) deletes proto messages, it MUST use `refactor!(features):` per the planner's pinned rule.

## 8. Coverage delta

LCOV not captured at baseline (Phase 0 didn't emit coverage artifacts), so percentage-based coverage delta is **N/A**. Test-count delta is +16 cases in `OneMoreTaskTracker.Features.Tests`, all on previously-unstested aggregate methods (the methods didn't exist at baseline). The auto-fail trigger ">2% drop on a touched file" cannot fire here — no touched file lost coverage; the new aggregate methods are explicitly covered by the 16 new tests.

`COVERAGE_DELTA_PCT=0` (proxy: no regression observed via test counts; positive proxy via +16 invariant tests).

## 9. Perf envelope

`dotnet test OneMoreTaskTracker.slnx --nologo` total wall: **4.25s** at HEAD (`/usr/bin/time -p` measurement). Baseline manifest didn't pin a runtime, so the soft-cap +10% envelope can't be evaluated quantitatively, but the absolute number (4.25s for 435 tests) is unremarkable and the iteration only added in-memory unit tests (no DB I/O, no integration setup). `PERF_ENVELOPE_OK=true`.

No FE bundle delta (FE source untouched).

## 10. Per-issue carry-overs for next iteration

- **`RF-001`** — tighten `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}` setter visibility to `private set` after the consolidated handler surface lands. Schedule for the iteration that ships commit (f) per the planner sequence; couple it with migrating `CreateFeatureHandler` and `DevFeatureSeeder` to the aggregate methods.
- **`RF-002`** — add a sibling `UpdateFeatureLeadHandlerTests.cs`, OR note explicitly when the lead handler is deleted in commit (f) that no test reshape is required. Pre-existing gap — not iter-1's responsibility but worth tracking.
- **`RF-003`** — when reshaping the existing flat `*HandlerTests.cs` files in `tests/OneMoreTaskTracker.Features.Tests/`, decide on a single test-tree convention (mirror source tree vs. flat). The new aggregate tests under `Features/Data/` set a precedent for "mirror source tree" — if that's the chosen direction, the existing flat files should move at the same iteration as the consolidation.

## 11. Score breakdown

| Criterion | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| code_quality_delta | 0.45 | 7.5 | 3.375 |
| integration_and_conventions | 0.20 | 8.5 | 1.700 |
| test_coverage_delta | 0.20 | 8.5 | 1.700 |
| perf_envelope | 0.15 | 9.0 | 1.350 |
| **Weighted total** | | | **8.125** |

Auto-fail triggers: none fired.

`VERDICT=PASS` (8.125 ≥ 7.0 AND no auto-fail).
