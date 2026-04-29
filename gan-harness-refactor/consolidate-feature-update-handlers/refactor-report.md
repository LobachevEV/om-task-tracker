# Refactor Report — consolidate-feature-update-handlers

Track: fullstack
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa
Final SHA: 61024e155bb8183cb80e30ce2000810bc5eb43ae
Iterations: 6 (PASS on iter 6, all 6 slices shipped)
Final verdict: PASS
Final weighted total: 9.325

## Behavior preservation summary

- Behavior contract: `behavior-contract.md` (+ `.json`), captured at baseline SHA `935dc9af`, frozen at iteration 0 across 8 surfaces (`openapi`, `proto_features`, `db_migrations_features`, `endpoint_matrix_plan_features`, `feature_summary_response_shape`, `planapi_exports`, `planapi_schemas`, `inline_editor_component_api`).
- Drift events across the run: 4 iterations reported `BEHAVIOR_DRIFT=true` at the surface level (iter-2 additive on `proto_features`; iter-3 additive on `proto_features`; iter-4 additive on `openapi` + `proto_features` + `endpoint_matrix_plan_features`; iter-5 additive on `planapi_exports` + `planapi_schemas`; iter-6 REMOVAL on 5 of 8). Every drift was within a planner-pinned migration-parity exception. Iter-1 reported no drift.
- Final-iteration drift: true at the surface level (5 of 8), all REMOVAL within slice (f) exceptions. The three "no-drift" surfaces — `db_migrations_features`, `feature_summary_response_shape`, `inline_editor_component_api` — are byte-identical to baseline at HEAD.

## Outcome against MUST-improve axes

| # | Axis | Baseline | Target | Final | Status |
|---|------|----------|--------|-------|--------|
| 1 | Per-field Feature handlers (`UpdateFeature{Title,Description,Lead}Handler.cs`) | 3 | 0 | **0** | MET |
| 2 | Per-field Stage handlers (`Update{StageOwner,StagePlannedStart,StagePlannedEnd}Handler.cs`) | 3 | 0 | **0** | MET |
| 3 | Total `*Handler.cs` files in `OneMoreTaskTracker.Features/Features/Update/` | 7 | ≤ 2 | **2** (`PatchFeatureHandler.cs`, `PatchFeatureStageHandler.cs`) | MET |
| 4 | Per-field PATCH endpoints under `/api/plan/features/{id}/...` (excluding aggregate) | 6 | 1 | **1** (`PATCH /api/plan/features/{id}/stages/{stage}`) | MET |
| 5 | FE per-field PATCH exports in `planApi.ts` | 6 | 0 | **0** (`patchFeature` + `patchFeatureStage` only) | MET |
| 6 | `feature.{Version,UpdatedAt} =` mutation sites outside `Feature.cs` | 13 | 0 | **0** (compiler-enforced via `private set` + aggregate methods) | MET |
| 7 | `plan.{Version,UpdatedAt} =` mutation sites outside `FeatureStagePlan.cs` | 6 | 0 | **0** (compiler-enforced via `private set` + aggregate methods) | MET |
| 8 | BE tests passing (no baseline regression) | 419 | ≥ 419, 0 regressed | **412/412 green; 0 baseline regressed** (drop = tests-of-deleted-code) | MET |
| 9 | FE tests passing (no baseline regression) | 52 files | ≥ 52 files, 0 regressed | **54 files / 464 tests green; 0 regressed** | MET |
| 10 | Sibling test file per `*Handler.cs` (project instinct) | n/a | 0 missing | **0 missing** | MET |

All 10 axes met. The brief's three binding requirements — "one for FeatureUpdate and one for StageUpdate", "Front should send only changed fields", "Version change and UpdatedAt should be inside the Feature class" — are all satisfied.

## Score progression

| Iter | Slice | Total | code_quality (0.45) | integration (0.20) | coverage (0.20) | perf (0.15) | Drift | Auto-fail |
|------|-------|-------|---------------------|--------------------|-----------------|-------------|-------|-----------|
| 1 | (a) aggregate invariants | 8.125 | 7.5 (3.375) | 8.5 (1.700) | 8.5 (1.700) | 9.0 (1.350) | false | false |
| 2 | (b) sparse `PatchFeatureHandler` | 8.125 | 7.5 (3.375) | 8.5 (1.700) | 8.5 (1.700) | 9.0 (1.350) | proto3 additive only | false |
| 3 | (c) sparse `PatchFeatureStageHandler` (+ corrective drop log-only locals) | 8.125 | 7.5 (3.375) | 8.5 (1.700) | 8.5 (1.700) | 9.0 (1.350) | proto3 additive only | false |
| 4 | (d) gateway endpoints | 8.475 | 8.0 (3.600) | 9.0 (1.800) | 9.0 (1.800) | 8.5 (1.275) | additive on 3 surfaces | false |
| 5 | (e) FE consolidation | 8.700 | 8.5 (3.825) | 9.0 (1.800) | 9.0 (1.800) | 8.5 (1.275) | additive on 2 surfaces | false |
| 6 | (f) deletion sweep + `refactor!` | **9.325** | 9.5 (4.275) | 9.5 (1.900) | 9.0 (1.800) | 9.0 (1.350) | REMOVAL on 5 surfaces (in-scope) | false |

Final iteration commit: `61024e1` — `refactor!(features,api,webclient): delete dead per-field PATCH surfaces and tighten aggregate invariants` (-4609 lines net delta on this iteration; cumulative refactor diff -1548 lines across +2824/-4372 over 68 files).

## Notable changes

- **Aggregate invariants encapsulated** (commit `ea45d57`, slice a). `Feature` gained `RenameTitle`, `SetDescription`, `AssignLead`, `RecordStageEdit`, `Touch`; `FeatureStagePlan` gained `AssignOwner`, `SetPlannedStart`, `SetPlannedEnd`, `Touch`. Each method bumps `Version` and stamps `UpdatedAt` from a single caller-supplied `now`. Slice (f) tightened `Version`/`UpdatedAt` setters to `private set` so the invariant is now compiler-enforced; EF Core hydrates via reflection.
- **Two sparse-PATCH handlers ship in parallel** (commits `402b1f5` + `788918a`, slices b + c). Proto3 `optional` fields generate `Has<Field>` accessors; absent fields skip both validation and mutation, leaving the on-disk row untouched (no `Version` bump, no `UpdatedAt` stamp). All-fields-at-once requests use `prospectiveStart`/`prospectiveEnd` substitution to validate the user's intended end-state, not a half-applied state. Concurrency conflicts surface as `AlreadyExists` with a `currentVersion`-bearing envelope; the gateway's `GrpcExceptionMiddleware` maps to HTTP 409 verbatim.
- **Single-snapshot `var now = DateTime.UtcNow`** threaded through every aggregate call inside both patch handlers. The "monotonic UpdatedAt across multi-field patch" invariant is explicit. Multi-field requests bump the parent feature's `Version` exactly once via a single `feature.RecordStageEdit(now)` (vs. the per-field-handler era where N fields meant N parent-feature bumps).
- **Gateway collapsed to two routes** (commit `6c9c252`, slice d → simplified in `61024e1`, slice f). `PATCH /api/plan/features/{id}` is always-sparse; `PATCH /api/plan/features/{id}/stages/{stage}` handles every stage-field mutation. The 6 deprecated per-field paths were removed in slice (f). Auth attributes `[Authorize(Roles=Roles.Manager)]`, response shape `FeatureSummaryResponse`, and `If-Match` header semantics preserved verbatim.
- **FE sends only changed fields** (commit `699c1c4`, slice e). The 5 Gantt inline-editor callbacks in `useFeatureMutationCallbacks.ts` construct sparse bodies — title-only, description-only, lead-only, owner-only, dates-only — plus the version token. Pinned by `not.toHaveProperty(...)` assertions. Component prop boundary unchanged; the reroute happens inside the hook.
- **Bulk `UpdateFeatureHandler` retired entirely** (slice f, RF-004 resolved). Iter-5 evaluator confirmed zero FE call sites send `stagePlans:` payloads; keeping the bulk path would have been dead code. Slice (f) deletes the handler, its proto, its tests, and the `body.StagePlans` fork in `FeaturesController.Update`. Dead `StagePlanUpserter.ApplyStagePlans`, `FeatureValidation.ValidateStagePlans`, and `StagePlanInput` removed alongside.
- **One new project-rule memory** captured mid-run: `feedback_no_log_only_variables.md`. Triggered after the user flagged 4 `*Before` log-only locals in iter-2's `PatchFeatureHandler.cs`. The orchestrator applied a corrective (commit `788918a`, -22/+2 lines) removing 9 log-only locals across both patch handlers. Future evaluator rubrics should grep for the pattern (`var X = …;` whose only consumer is `logger.Log*`); this is filed as RF-006 against the next planner update, not a code regression.

## Out-of-scope follow-ups

From `refactor-plan.md` §"Scope boundary" out-of-scope list, re-listed so they don't get lost:

- Deriving `Feature.State` from stage dates + today's date (memory: `project_feature_state_should_be_derived.md`). Currently still a manual enum write; no PATCH endpoint exposes it.
- Auto-emitting `OneMoreTaskTracker.Api/openapi.json` from controllers via Swashbuckle / NSwag (memory: `project_openapi_hand_rolled.md`). The hand-maintained file survived iter-6's deletions cleanly, but drift risk persists on every endpoint change.
- Adding `/health` to the `OneMoreTaskTracker.Features` service (memory: `project_features_service_no_health_endpoint.md`).
- `BuildMiniTeamMember` stale-id placeholder bug (memory: `project_build_mini_team_member_stale_bug.md`).
- Splitting `OneMoreTaskTracker.Features` into multiple bounded contexts.
- Bumping the proto package version (`mr_helper.features` stays as-is; sparse-PATCH used existing proto3 `optional`, not a new package).
- Touching the Gantt UX (no inline-editor visual change was made; component prop boundary preserved per surface 8 invariant).

## Carry-over issues

Open `RF-*` issues at the close of the run:

| Issue | Severity | Target file | Notes |
|-------|----------|-------------|-------|
| RF-006 | MEDIUM (process) | planner / `refactor-eval-rubric.md` (next refactor) | Future evaluator rubrics should explicitly grep for log-only locals (`var x = …;` whose only consumer is `logger.Log*`). The iter-2 evaluator missed this; iter-3 generator inherited the anti-pattern. Process gap, not a code regression. |
| RF-009 | LOW | future proto evolution | Defensive `reserved <number>;` clauses on surviving proto messages were structurally vacuous in slice (f) because deleted protos were entire files (no within-message field-renumber). Worth filing as a checklist item for future refactors that DO renumber fields, per `~/.claude/rules/microservices/contracts.md`. |

All other carry-overs (RF-001, RF-002, RF-003, RF-004, RF-005, RF-007, RF-008) were retired in-run.
