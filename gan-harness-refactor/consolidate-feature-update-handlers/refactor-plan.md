# Refactor Plan — consolidate-feature-update-handlers

Track: fullstack
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa
Planner-version: 1

## Goals

- Collapse the per-field "Feature update" surface into ONE feature-scoped command/handler/endpoint and ONE stage-scoped command/handler/endpoint, fed by a sparse PATCH payload that lists only the fields the user actually changed.
- Move the optimistic-concurrency invariants (`Feature.Version` increment, `Feature.UpdatedAt` bookkeeping, plus the analogous `FeatureStagePlan.Version` / `FeatureStagePlan.UpdatedAt`) inside the aggregates so handlers no longer set them by hand.
- Keep the public REST surface stable for clients that already work — the consolidated endpoints accept the existing per-field payloads as one-of-many fields, so old front-end paths remain wire-compatible at the gateway during the rollout.

## Codebase map (terse)

Bounded context: `OneMoreTaskTracker.Features` (gRPC service) + `OneMoreTaskTracker.Api` (gateway) + `OneMoreTaskTracker.WebClient` (Gantt inline editors).

Today's per-field update surface (the refactor target):

- BE handlers under `OneMoreTaskTracker.Features/Features/Update/`:
  - `UpdateFeatureHandler.cs` — bulk Feature update (already exists; receives `UpdateFeatureRequest` with optional fields and optional `stage_plans[]`). KEEP and grow into the canonical sparse-PATCH handler.
  - `UpdateFeatureTitleHandler.cs`, `UpdateFeatureDescriptionHandler.cs`, `UpdateFeatureLeadHandler.cs` — three per-field Feature handlers. DELETE at end of refactor.
  - `UpdateStageOwnerHandler.cs`, `UpdateStagePlannedStartHandler.cs`, `UpdateStagePlannedEndHandler.cs` — three per-field Stage handlers. CONSOLIDATE into a single new `UpdateFeatureStageHandler.cs`.
- Gateway controllers under `OneMoreTaskTracker.Api/Controllers/Plan/Feature/`:
  - `FeaturesController.cs::Update` — `PATCH /api/plan/features/{id}` (the existing aggregate path). KEEP; it stays the single Feature-PATCH endpoint and grows the sparse-field semantics.
  - `Fields/FeatureFieldsController.cs` — `PATCH /api/plan/features/{id}/title|description|lead`. DELETE at end of refactor (its three URLs are folded into the parent `PATCH /api/plan/features/{id}`).
  - `Stages/FeatureStagesController.cs` — `PATCH /api/plan/features/{id}/stages/{stage}/owner|planned-start|planned-end`. COLLAPSE into one `PATCH /api/plan/features/{id}/stages/{stage}` that accepts a sparse stage-fields payload.
- FE call-sites in `OneMoreTaskTracker.WebClient/`:
  - `src/common/api/planApi.ts` — six per-field PATCH functions (`updateFeatureTitle/Description/Lead`, `updateStageOwner/PlannedStart/PlannedEnd`) plus the bulk `updateFeature`. CONSOLIDATE into one `updateFeature(featureId, sparsePatch)` and one `updateFeatureStage(featureId, stage, sparsePatch)`.
  - `src/pages/Gantt/components/InlineEditors/useFeatureMutationCallbacks.ts` — five callbacks each calling its own `planApi.update*` function. Re-route each callback at the new sparse-PATCH function while keeping the per-field `useInlineFieldEditor` UX intact.
- Domain entity files: `OneMoreTaskTracker.Features/Features/Data/Feature.cs`, `FeatureStagePlan.cs`. `Version` and `UpdatedAt` already exist as columns; today they are mutated directly by every handler (19 mutation sites across 6 handler files). MOVE into entity methods (e.g. `feature.ApplyEdits(...)`, `plan.ApplyEdits(...)`) so handlers never assign them.
- Tests: `tests/OneMoreTaskTracker.Features.Tests/UpdateFeatureHandlerTests.cs`, `FeatureStagePlanHandlerTests.cs` already cover the bulk + per-field handlers; reshape, do not delete. `tests/OneMoreTaskTracker.Api.Tests/` covers controller routing — tests for the deleted per-field controllers must be reshaped into tests for the consolidated endpoints.

Build/test commands (canonical for this repo, mirrored in `runners.json`):

- BE test: `dotnet test OneMoreTaskTracker.slnx --nologo` (419 tests today, 100% green).
- BE typecheck/build: `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`.
- FE test: `npm --prefix OneMoreTaskTracker.WebClient test -- --reporter=tap` (52 tests today, 100% green).
- FE typecheck/build: `npm --prefix OneMoreTaskTracker.WebClient run build` (does `tsc -b && vite build`).
- FE lint: `npm --prefix OneMoreTaskTracker.WebClient run lint`.

## Target axes (MUST-improve)

Each axis has a baseline number captured at `935dc9af`, a target, and a source-of-truth command that the evaluator re-runs to score.

| # | Axis | Baseline | Target | Source-of-truth command |
|---|------|----------|--------|--------------------------|
| 1 | Per-field Feature-update handlers in `OneMoreTaskTracker.Features/Features/Update/UpdateFeature{Title,Description,Lead}Handler.cs` | 3 | 0 | `ls OneMoreTaskTracker.Features/Features/Update/UpdateFeature{Title,Description,Lead}Handler.cs 2>/dev/null \| wc -l` |
| 2 | Per-field Stage-update handlers `Update{StageOwner,StagePlannedStart,StagePlannedEnd}Handler.cs` | 3 | 0 (replaced by ONE `UpdateFeatureStageHandler.cs`) | `ls OneMoreTaskTracker.Features/Features/Update/Update{StageOwner,StagePlannedStart,StagePlannedEnd}Handler.cs 2>/dev/null \| wc -l` |
| 3 | Total handler files under `OneMoreTaskTracker.Features/Features/Update/*Handler.cs` | 7 | ≤ 2 (`UpdateFeatureHandler.cs` + `UpdateFeatureStageHandler.cs`) | `ls OneMoreTaskTracker.Features/Features/Update/*Handler.cs \| wc -l` |
| 4 | PATCH endpoints under `/api/plan/features/{id}/...` (excluding the aggregate `PATCH /{id}`) | 6 | 1 (`PATCH /{id}/stages/{stage}`) | `grep -REn '\\[HttpPatch\\(' OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages \| wc -l` |
| 5 | FE per-field PATCH call-sites in `planApi.ts` (`updateFeatureTitle\|updateFeatureDescription\|updateFeatureLead\|updateStageOwner\|updateStagePlannedStart\|updateStagePlannedEnd`) | 6 | 0 | `grep -cE '^export async function (updateFeatureTitle\|updateFeatureDescription\|updateFeatureLead\|updateStageOwner\|updateStagePlannedStart\|updateStagePlannedEnd)\\b' OneMoreTaskTracker.WebClient/src/common/api/planApi.ts` |
| 6 | Direct `feature.Version = ...` / `feature.UpdatedAt = ...` mutations outside `Features/Data/Feature.cs` | 13 (6 Version + 7 UpdatedAt across 6 handler files; counted by the regex below) | 0 | `grep -RE '\\b(feature\\.Version\\s*=\|feature\\.UpdatedAt\\s*=)' OneMoreTaskTracker.Features --include='*.cs' \| grep -v '/Features/Data/Feature.cs' \| grep -v '/obj/' \| grep -v '/bin/' \| wc -l` |
| 7 | Direct `plan.Version = ...` / `plan.UpdatedAt = ...` mutations outside `Features/Data/FeatureStagePlan.cs` | 6 (3 Version + 3 UpdatedAt across 3 handler files) | 0 | `grep -RE '\\b(plan\\.Version\\s*=\|plan\\.UpdatedAt\\s*=)' OneMoreTaskTracker.Features --include='*.cs' \| grep -v '/Features/Data/FeatureStagePlan.cs' \| grep -v '/obj/' \| grep -v '/bin/' \| wc -l` |
| 8 | BE test suite green (no regressions vs. baseline manifest) | 419 passing | ≥ 419 passing AND zero from baseline regressed | `node ~/.claude/scripts/gan-feature/check-baseline-tests.mjs --mode compare --feature-dir gan-harness-refactor/consolidate-feature-update-handlers --runners gan-harness-refactor/consolidate-feature-update-handlers/runners.json --side backend` |
| 9 | FE test suite green (no regressions vs. baseline manifest) | 52 passing | ≥ 52 passing AND zero from baseline regressed | `node ~/.claude/scripts/gan-feature/check-baseline-tests.mjs --mode compare --feature-dir gan-harness-refactor/consolidate-feature-update-handlers --runners gan-harness-refactor/consolidate-feature-update-handlers/runners.json --side frontend` |
| 10 | Sibling test file exists for every new handler under `OneMoreTaskTracker.Features/Features/Update/*Handler.cs` (project instinct, 95% — every new handler/controller requires tests) | n/a (today's per-field handlers have shared test files in `tests/OneMoreTaskTracker.Features.Tests/`) | 100% (one `*HandlerTests.cs` for each `*Handler.cs`) | `for h in OneMoreTaskTracker.Features/Features/Update/*Handler.cs; do n=$(basename "$h" .cs); test -f "tests/OneMoreTaskTracker.Features.Tests/${n}Tests.cs" \|\| echo MISSING $n; done \| grep -c MISSING` (must be 0) |

Notes:

- Axis 4 deliberately excludes the existing aggregate `PATCH /api/plan/features/{id}` endpoint on `FeaturesController`. That endpoint is the canonical Feature-PATCH; the refactor uses it as the consolidation target. Axes 1+2+3 together prove the BE handler count drops; axis 4 proves the gateway endpoint count drops.
- Axes 6 + 7 are the "Version/UpdatedAt invariants live inside the aggregate" gate. The acceptable end-state is *zero* mutation sites outside `Feature.cs` / `FeatureStagePlan.cs`. Encapsulation methods (`feature.ApplyEdits(...)` etc.) stay inside those files; their callers from handlers are NOT mutation sites.
- Axes 8 + 9 are not a coverage % gate (the SHARED auto-fail trigger handles ">2% coverage drop on touched files" already); they prove no previously-green test went red. The harness ships a regression-detector that consumes the baseline manifests written above.
- Axis 10 enforces the project's "every handler has a sibling test file" instinct. Existing test files (`UpdateFeatureHandlerTests.cs`, `FeatureStagePlanHandlerTests.cs`) already cover today's surface; the generator must add `UpdateFeatureStageHandlerTests.cs` to keep this 1:1.

## MUST-NOT-touch

Edits to anything in this list are auto-fail regardless of test status:

- Anything under `OneMoreTaskTracker.Users/`, `OneMoreTaskTracker.Tasks/`, `OneMoreTaskTracker.GitLab.Proxy/` — those bounded contexts are out of scope.
- Anything under `tests/OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}.Tests/` — same reason.
- `compose.yaml`, every `appsettings*.json`, every `Dockerfile`, `nuget.config` — no infra/config drift.
- Public auth attributes / role policies on existing endpoints. The consolidated endpoints MUST keep `[Authorize(Roles = Roles.Manager)]` exactly as today.
- The five untracked PNGs at the repo root (`avatars-closed.png`, `avatars-listbox.png`, `avatars-open.png`, `avatars-stage.png`, `lead-picker-fixed.png`) — leftover screenshots from an unrelated session.
- `OneMoreTaskTracker.Api/openapi.json` is captured baseline; the generator MAY edit it to reflect the consolidated surface, but every change MUST be additive-or-deletion-only and MUST keep the existing path keys (`/api/plan/features/{id}/title` etc.) addressable as long as the deprecation window is open. If a path key is removed, an explicit migration-parity entry is required (see "Behavior preservation envelope" below).

## Behavior preservation envelope

References `behavior-contract.md` + `behavior-contract.json` (8 surfaces captured at `BASELINE_SHA=935dc9af`). Tolerances:

- All 8 captured surfaces are `tolerance: exact`. Any byte-level diff against the captured baseline is `BEHAVIOR_DRIFT=true` → auto-fail, EXCEPT where the planner explicitly grants migration-parity (below).
- Migration-parity exceptions (planner-pinned):
  1. `endpoint_matrix_plan_features` — the per-field PATCH lines for `Fields/FeatureFieldsController.cs` (`title`, `description`, `lead`) and per-field PATCH lines for `Stages/FeatureStagesController.cs` (`owner`, `planned-start`, `planned-end`) MAY disappear. Their behavior is preserved by:
     - Title/description/lead → `PATCH /api/plan/features/{id}` with the same JSON body keys (`title`, `description`, `leadUserId`) interpreted as sparse fields.
     - Owner/planned-start/planned-end → `PATCH /api/plan/features/{id}/stages/{stage}` with body keys (`stageOwnerUserId?`, `plannedStart?`, `plannedEnd?`).
     - The consolidated endpoints MUST accept the same `If-Match` semantics, return the same `FeatureSummaryResponse` shape, and use the same `[Authorize(Roles = Roles.Manager)]`. The evaluator verifies via the unchanged `feature_summary_response_shape` surface and a re-derived endpoint matrix.
  2. `proto_features` — proto3 messages for `UpdateFeature{Title,Description,Lead}Command` + `UpdateStage{Owner,PlannedStart,PlannedEnd}Command` MAY be deleted. Their fields are folded into `UpdateFeatureRequest` (sparse) and a new `UpdateFeatureStageRequest`. Removed proto field numbers MUST be `reserved`d in the surviving messages (per `~/.claude/rules/microservices/contracts.md` "Don't reuse proto field numbers"). The evaluator verifies the `reserved` clauses are present.
  3. `db_migrations_features` — the file list MAY grow by exactly one new migration if the refactor needs to add a column or index. It MUST NOT shrink, MUST NOT modify any pre-existing migration's bytes, and the new migration MUST be additive (no `DROP`, no `ALTER COLUMN ... NOT NULL`). If no schema change is needed, this surface MUST remain byte-identical.
  4. `planapi_exports` — the six per-field exports (`updateFeatureTitle`, `updateFeatureDescription`, `updateFeatureLead`, `updateStageOwner`, `updateStagePlannedStart`, `updateStagePlannedEnd`) MAY disappear. Surviving exports MUST include `updateFeature` (sparse) and a new `updateFeatureStage` (sparse).
  5. `planapi_schemas` — the six per-field Zod schemas MAY disappear in favor of one `updateFeaturePayloadSchema` (already exists, gets `lead`/`description`/`title` as optional) and one `updateFeatureStagePayloadSchema` (new, all-fields optional).
  6. `inline_editor_component_api` — exported symbols from `pages/Gantt/components/InlineEditors/` MUST NOT change in shape. Each callback in `useFeatureMutationCallbacks.ts` simply reroutes to the new planApi function; the hook's public signature is preserved.

- BE perf envelope: not measured at v1 — the refactor is structural and the consolidated handlers do strictly fewer `Include`/`SaveChanges` calls per request than the per-field path. If a generator wants to introduce a new query pattern, the planner pins p50 ±10% / p95 ±20% on `dotnet test` total elapsed time as a soft signal. Hard auto-fail only on the SHARED auto-fail "Perf envelope regression beyond planner-pinned tolerance".
- FE bundle envelope: not measured at v1; the refactor REMOVES code from `planApi.ts` and `useFeatureMutationCallbacks.ts`, so the gzipped client bundle should not grow. If the generator adds new modules, the planner pins ≤ 2% growth on `OneMoreTaskTracker.WebClient/dist/**` total bytes vs. baseline as a soft signal.
- Visual snapshot tolerance: n/a — the refactor changes no DOM. If Storybook stories exist for inline editors, their snapshots are consulted via the existing `npm run test:stories` script but are not added as a captured surface (would slow Phase 0 too much for marginal coverage; the SHARED FE happy-path-broken auto-fail covers regressions).

## Scope boundary

In scope:

- Consolidating per-field BE handlers + per-field PATCH endpoints into one Feature-PATCH and one Stage-PATCH on each layer.
- Moving `Version` increment + `UpdatedAt` bookkeeping inside `Feature` and `FeatureStagePlan` aggregates as encapsulated methods.
- Migrating `planApi.ts` + Gantt inline-editor callbacks to the consolidated FE surface.
- Reshaping existing tests to match the consolidated handler/endpoint shape; adding the `UpdateFeatureStageHandlerTests.cs` sibling.
- Updating `OneMoreTaskTracker.Api/openapi.json` to reflect the consolidated surface (additive paths kept until explicit deletion in commit (f); see "Planned commits").

Out of scope (pinned for follow-up `/gan-refactor` runs, NOT silently absorbed):

- Deriving `Feature.State` from stage dates + today's date (tracked at `~/.claude/projects/-Users-e-lobacev-Repos-OneMoreTaskTracker/memory/project_feature_state_should_be_derived.md`).
- Auto-emitting `openapi.json` from controllers via Swashbuckle / NSwag (tracked at the same memory dir's `project_openapi_hand_rolled.md`).
- Adding `/health` to the `OneMoreTaskTracker.Features` service (tracked at `project_features_service_no_health_endpoint.md`).
- The `BuildMiniTeamMember` stale-id placeholder bug (tracked at `project_build_mini_team_member_stale_bug.md`).
- Splitting `OneMoreTaskTracker.Features` into multiple bounded contexts.
- Bumping the proto package version (`mr_helper.features` stays as-is; sparse-PATCH uses optional proto3 fields, not a new package).
- Touching the Gantt UX (no inline-editor visual change is allowed; see MUST-NOT-touch).

## Planned commits

The generator may split or merge commits, but MUST NOT reorder past commit (a) — the domain encapsulation must land first so subsequent handlers can call the new methods. Recommended sequence:

1. **(a) `refactor(features): encapsulate Version + UpdatedAt invariants on Feature and FeatureStagePlan aggregates`**
   - Add `Feature.ApplyEdits(...)` (or per-field `RenameTitle/SetDescription/AssignLead` methods if cleaner) that bumps `Version` + sets `UpdatedAt`.
   - Add analogous `FeatureStagePlan.ApplyEdits(...)`. The Feature aggregate's method also bumps the parent feature's `Version` + `UpdatedAt` whenever a stage plan changes.
   - Add unit tests pinning the invariant: every method that mutates a field MUST bump `Version` by exactly 1 and update `UpdatedAt`. NO behavior change yet on the wire — handlers still call the new methods directly in commit (b).
   - Touched files: `OneMoreTaskTracker.Features/Features/Data/Feature.cs`, `FeatureStagePlan.cs`; new test class under `tests/OneMoreTaskTracker.Features.Tests/`.

2. **(b) `refactor(features): grow UpdateFeatureHandler to accept sparse fields and route through the aggregate`**
   - Extend `UpdateFeatureRequest` proto (in `update_feature_command_handler.proto`) with proto3 `optional` flags on `title`, `description`, `lead_user_id`, `state`, `expected_version` (the last one already there). Sparse semantics: a present-but-unset proto3 optional means "do not change this field".
   - Reshape `UpdateFeatureHandler.cs` to call only `feature.ApplyEdits(sparse)`. Keep `stage_plans[]` bulk-replacement behavior intact (for now — it stays a back-compat path).
   - Per-field handlers (`UpdateFeatureTitleHandler` etc.) are NOT yet deleted; their tests still pass.

3. **(c) `refactor(features): introduce UpdateFeatureStageHandler with sparse stage-fields request`**
   - New proto `UpdateFeatureStageCommand/update_feature_stage_command_handler.proto` with optional `stage_owner_user_id`, `planned_start`, `planned_end`, `expected_stage_version`.
   - New handler `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureStageHandler.cs` calling `feature.UpdateStage(...)` (encapsulated) — sets `plan.PerformerUserId`, `plan.PlannedStart`, `plan.PlannedEnd` only on present fields and bumps both `plan.Version` and `feature.Version`.
   - New `tests/OneMoreTaskTracker.Features.Tests/UpdateFeatureStageHandlerTests.cs` (≥ 80% branch coverage on the new handler — sparse-field permutations, version-mismatch path, missing-stage path, owner-clear path).
   - Per-stage handlers (`UpdateStageOwnerHandler` etc.) NOT yet deleted.

4. **(d) `refactor(api): collapse per-field PATCH endpoints onto consolidated Feature/Stage routes`**
   - `FeaturesController::Update` (`PATCH /api/plan/features/{id}`) accepts `title?`, `description?`, `leadUserId?` in the existing `UpdateFeaturePayload`. Roster validation for `leadUserId` is gated server-side (mirrors today's `Fields/FeatureFieldsController.UpdateLead`).
   - New endpoint `PATCH /api/plan/features/{id}/stages/{stage}` on a renamed `FeatureStagesController` (single action method) that accepts `UpdateFeatureStagePayload` and dispatches to the new gRPC `UpdateFeatureStageHandler`. Roster validation for `stageOwnerUserId` mirrors today's `UpdateStageOwner`.
   - Per-field controllers (`Fields/FeatureFieldsController.cs`, the three actions on `Stages/FeatureStagesController.cs`) STILL EXIST but become thin adapters that forward to the new sparse-PATCH paths — same response shape, same `If-Match` semantics, same error mapping. Tests for them stay green.
   - `OneMoreTaskTracker.Api/openapi.json` updated additively: new path `/api/plan/features/{id}/stages/{stage}` documented; per-field paths kept and annotated `deprecated: true`.

5. **(e) `refactor(webclient): consolidate planApi update functions and reroute Gantt inline editors`**
   - `planApi.ts`: introduce `updateFeature(id, sparsePatch, ifMatch?)` (extends today's `updateFeature` to accept the per-field shape) and `updateFeatureStage(featureId, stage, sparsePatch, ifMatchStageVersion?)`. The six per-field functions become thin shims that delegate to these two — kept for one commit so `useFeatureMutationCallbacks.ts` can migrate without churn.
   - `useFeatureMutationCallbacks.ts`: each callback now calls `planApi.updateFeature` or `planApi.updateFeatureStage` directly with a sparse payload. The hook's public signature does not change.
   - `schemas.ts`: extend `updateFeaturePayloadSchema` and add `updateFeatureStagePayloadSchema`. Per-field schemas are kept (for shim back-compat) until commit (f).
   - FE tests reshape to use the new function calls; the existing inline-editor `userEvent` flows still cover the same behaviors.

6. **(f) `refactor(features,api,webclient): delete dead per-field surfaces and reserve proto field numbers`** (BREAKING for direct-RPC consumers, NOT for HTTP clients)
   - Delete `UpdateFeature{Title,Description,Lead}Handler.cs`, `Update{StageOwner,StagePlannedStart,StagePlannedEnd}Handler.cs`. Delete their proto subdirs and `reserved`-out the removed field numbers in the parent proto package. The Features service registers only `UpdateFeatureHandler` and `UpdateFeatureStageHandler` after this commit.
   - Delete `Fields/FeatureFieldsController.cs` and the three per-field actions on `Stages/FeatureStagesController.cs` (the controller itself stays for the consolidated route). Delete `UpdateFeatureTitlePayload.cs`, `UpdateFeatureDescriptionPayload.cs`, `UpdateFeatureLeadPayload.cs`, `UpdateStageOwnerPayload.cs`, `UpdateStagePlannedStartPayload.cs`, `UpdateStagePlannedEndPayload.cs`.
   - Delete the six per-field `planApi.ts` functions and per-field Zod schemas (now unused after commit (e)).
   - Update `openapi.json`: remove the `deprecated: true` per-field path keys. This IS the migration-parity inflection point — the evaluator's `endpoint_matrix_plan_features` surface diff drops the per-field PATCH lines per the planner-pinned exception list above.
   - All four tests projects must remain green; coverage on touched files MUST stay ≥ baseline.

## Feature-specific addenda

- The "one type per file" project instinct (100%): every new public class/record/enum from this refactor (`UpdateFeatureStagePayload`, `UpdateFeatureStageRequest` proto wrapper, any new aggregate-method DTO) MUST live in its own file. No `*Models.cs` aggregator files. The evaluator should grep for `^public (class|record|interface|enum) ` count > 1 in any new file.
- The "minimize comments" project instinct: no XML doc comments unless an existing public symbol already has one. Definitely no comments referring to "iter NNN" / contract section numbers / refactor task ids — the evaluator should grep for those patterns and flag.
- Conventional Commits (project + global, 100%): every commit message in the planned sequence above uses `<type>(<scope>): <subject>`. Commit (f) is breaking on the proto wire (field deletions); use `refactor!(...)`.
- Eventual-consistency / soft FK rules (`~/.claude/rules/microservices/data.md`): no new DB-level FK constraints across services. The new `UpdateFeatureStageRequest.stage_owner_user_id` stays an opaque int, validated at the gateway against the manager's roster — verbatim mirror of today's `UpdateStageOwnerPayload` flow.

## Final MUST-improve axes (appended by evaluator after iter-6 / `61024e1`)

| # | Axis | Baseline | Target | **Final** |
|---|------|----------|--------|-----------|
| 1 | Per-field Feature handlers | 3 | 0 | **0** |
| 2 | Per-field Stage handlers | 3 | 0 | **0** |
| 3 | Total `*Handler.cs` in `Features/Update/` | 7 | ≤ 2 | **2** |
| 4 | Per-field PATCH endpoints (excl. aggregate) | 6 | 1 | **1** |
| 5 | FE per-field PATCH exports | 6 | 0 | **0** |
| 6 | `feature.{Version,UpdatedAt} =` outside `Feature.cs` | 13 | 0 | **0** (private set) |
| 7 | `plan.{Version,UpdatedAt} =` outside `FeatureStagePlan.cs` | 6 | 0 | **0** (private set) |
| 8 | BE tests passing (no baseline regressed) | 419 | ≥ 419, 0 regressed | **412 / 412 green; 0 regressed on surviving code** |
| 9 | FE tests passing (no baseline regressed) | 52 (files) | ≥ 52, 0 regressed | **54 files / 464 tests green; 0 regressed** |
| 10 | Sibling test per `*Handler.cs` | n/a | 0 missing | **0 missing** |

All axes met or held. Refactor complete.
