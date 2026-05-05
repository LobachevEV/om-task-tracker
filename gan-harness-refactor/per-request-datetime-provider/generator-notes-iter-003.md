# Generator Notes — iter 003

Iteration: 3
Track: backend
Baseline SHA: b96117ef27e9f4aab5b6176520825d864157b4b6

## Slice taken

`refactor-plan.md` §"Planned commits" item 3 (entity-init drop) bundled with the
`DevFeatureSeeder` portion of item 4. `TasksController` (the other half of item
4) is intentionally deferred to iter-4.

Concretely:

- `Feature.{CreatedAt,UpdatedAt}` and `FeatureStagePlan.{CreatedAt,UpdatedAt}`
  no longer carry `= DateTime.UtcNow` default initializers. Existing callers
  (`CreateFeatureHandler`, `DevFeatureSeeder`) already set `CreatedAt = now`
  + call `Touch(now)` explicitly, so production didn't need follow-up edits
  beyond `DevFeatureSeeder` itself.
- `DevFeatureSeeder` converted from `static class` to `sealed class` with a
  primary constructor `(IRequestClock clock)`. `SeedAsync` lost its `static`
  modifier; `var now = DateTime.UtcNow` became `var now = clock.GetUtcNow()`.
- `OneMoreTaskTracker.Features/Program.cs` registers `AddScoped<DevFeatureSeeder>()`
  next to the existing `AddScoped<IRequestClock, RequestClock>()`, and the
  startup-seed call resolves the seeder from the existing migration scope
  before invoking `SeedAsync`.

## MUST-improve axes touched (before → after)

| Axis | Before (iter-2) | After (iter-3) | Plan target |
|------|-----------------|----------------|-------------|
| #1 In-scope production `DateTime.UtcNow` reads (Features + Api/Controllers + Api/Middleware) | 7 | **2** | 0 (TasksController:70,77 only — iter-4) |
| #3 Entity-init `DateTime.UtcNow` reads | 4 | **0** | 0 — **target met** |
| #2 Files depending on `IRequestClock` (production) | 5 (incl. impl pair) | **6** (+ DevFeatureSeeder) | 5 (planner's file-grep) — surpassed |
| Real `IRequestClock` consumers (semantic, RF-002-01) | 3 | **4** | 5 (TasksController in iter-4) |

## Behavior-contract self-check

`diff-behavior-contract.mjs` against the frozen `behavior-contract.json`
(re-captured at `b96117e` after RF-002-03 v2 sed-pattern correction):

- `openapi_json`, `features_proto_surface`, `feature_entity_shape`,
  `ef_migrations_history`, `ef_schema_columns`, `api_endpoint_matrix`,
  `jwt_claims_and_expiration_shape` → all `no diff`.
- `test_corpus_assertion_count` → `text differs (2→2 lines, 4→4 bytes)` —
  planner-pinned additive-only parity.

`feature_entity_shape` "no diff" with `= DateTime.UtcNow` defaults removed is
the success signal — the `sed -E 's/(\})[[:space:]]*=[[:space:]]*[^;]+;/\1/'`
strip applied at capture time correctly normalizes the default-initializer
suffix away.

## Files touched

Production (4): `Feature.cs`, `FeatureStagePlan.cs`, `DevFeatureSeeder.cs`,
`Program.cs`.

Tests (3): `DevFeatureSeederTests.cs` (5 static→instance migrations + 1
explicit `CreatedAt`/`Touch` on the pre-existing fixture),
`GetFeatureHandlerTests.cs` (1 explicit `CreatedAt`/`Touch` on the persisted
fixture), `Features/Data/FeaturesDbContextSmokeTests.cs` (1 explicit
`CreatedAt`/`Touch` on the smoke-test fixture; the second test in the file
doesn't persist and was left as-is per slice instructions).

Harness-skipped (intentionally NOT in commit, per orchestrator instructions):
`gan-harness-refactor/per-request-datetime-provider/behavior-capture.json`,
`behavior-contract.json`, `behavior-contract.md` — RF-002-03 capture-surface
edits owned by the orchestrator.

## Validation results

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` → 0 errors, 0 warnings.
- `dotnet test OneMoreTaskTracker.slnx --nologo` → **470/470 passed, 0 failed**
  (Tasks 68, Users 45, Features 118, GitLab.Proxy 63, Api 176).
- MUST-NOT-touch cross-check via `git diff --name-only b96117e..HEAD` (post-commit)
  — all 7 modified files are in-scope per `refactor-plan.md` §"Scope boundary".

## Deviation from plan

None within this slice. Item 4's `TasksController` portion is held back to
keep the iter-3 commit focused on entity-shape parity (the highest-risk
surface, requiring the RF-002-03 capture fix) — bundling `TasksController`
would have widened the diff without changing the entity-shape verification
story.

## Replay note

This is the **2nd replay of iter 3** after two RF-002-03 capture-surface
fixes (planner-side). The 1st RF-002-03 fix was insufficient; v2 (`sed -E
's/(\})[[:space:]]*=[[:space:]]*[^;]+;/\1/'`) — which strips the trailing
`= <expr>;` default-initializer suffix from the captured `grep -nE` line —
verified by orchestrator probe-edit before launching this run. See
`run.log` §"Phase 2 — Iteration 3 — RF-002-03 fix v2 (sed pattern correction)"
for the full trail.
