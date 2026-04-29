# Generator notes — iter 005 (slice e)

Track: fullstack (FE-only commit)
Baseline SHA: `935dc9af224333e382e31d161a9a8eca9126ccfa`
Prev gen commit: `6c9c252e9b06ba3c1650771cce3f796d945c4a1d`

## Slice taken

Slice (e) — FE consolidation. Introduce two sparse-PATCH planApi
functions hitting the iter-4 consolidated gateway routes, reroute the
five Gantt inline-edit callbacks at them, and mark the six per-field
exports `@deprecated` (keeping them callable so the per-field
controllers can retire in slice f without churn).

## Files touched (4 modified, 2 added)

- `OneMoreTaskTracker.WebClient/src/common/api/planApi.ts` — added
  `patchFeature`, `patchFeatureStage`; per-field exports gain
  `@deprecated` JSDoc.
- `OneMoreTaskTracker.WebClient/src/common/api/schemas.ts` — added
  `patchFeatureRequestSchema`, `patchFeatureStageRequestSchema`. No
  existing schema mutated. Response shape continues to validate via
  the existing `featureSummarySchema`.
- `OneMoreTaskTracker.WebClient/src/common/types/feature.ts` — added
  `PatchFeaturePayload`, `PatchFeatureStagePayload` types (re-exported
  through `planApi.ts`).
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/useFeatureMutationCallbacks.ts`
  — five callbacks rerouted at the new sparse functions. The hook's
  exported signature (`FeatureMutationCallbacks`,
  `UseFeatureMutationCallbacksOptions`, `useFeatureMutationCallbacks`)
  is byte-identical — only the internal RPC dispatch changed. Surface 8
  (`inline_editor_component_api`) stays fixed.
- `OneMoreTaskTracker.WebClient/tests/common/api/patchFeature.test.ts`
  (NEW, 14 tests) — sparse payload semantics, If-Match wiring,
  null-description clear, schema validation.
- `OneMoreTaskTracker.WebClient/tests/common/api/patchFeatureStage.test.ts`
  (NEW, 16 tests) — URL has no per-field segment, sparse owner-only /
  start-only / end-only payloads, null-owner clear, If-Match wiring,
  schema validation.

## Each editor sends only the field that changed

Verified inline (no test asserts `Object.keys(body)`-equality alone — I
also assert `not.toHaveProperty('description')` etc. on the title-only
case). Brief contract honored:

- Title edit → `{ title, expectedVersion }` only.
- Lead edit → `{ leadUserId, expectedVersion }` only.
- Stage owner → `{ stageOwnerUserId, expectedStageVersion }` only.
- Stage planned-start → `{ plannedStart, expectedStageVersion }` only.
- Stage planned-end → `{ plannedEnd, expectedStageVersion }` only.

The hook never builds a `{ title, description, leadUserId }` triple
when only `title` changed; each callback constructs a fresh object
literal at the dispatch site.

## Drift envelope

- Surface 6 `planapi_exports` — ADDITIVE: `patchFeature`,
  `patchFeatureStage` added; six per-field exports remain (deprecated
  via JSDoc, still callable). Within planner allowance.
- Surface 7 `planapi_schemas` — ADDITIVE:
  `patchFeatureRequestSchema`, `patchFeatureStageRequestSchema` added;
  six per-field schemas unchanged. Within planner allowance.
- Surface 8 `inline_editor_component_api` — UNCHANGED at the prop /
  exported-symbol boundary. Internal dispatch only.
- Surfaces 1 (`openapi`), 2 (`proto_features`), 3
  (`db_migrations_features`), 4 (`endpoint_matrix_plan_features`), 5
  (`feature_summary_response_shape`) — UNCHANGED (no BE files touched).

## No log-only locals (`feedback_no_log_only_variables.md`)

Re-grepped my diff for `console.` / `logger.` in the four touched src
files and the two new test files: zero matches. Every `const` /
`let` introduced has a non-log consumer (request body, fetch init,
schema parse, assertion target).

Pre-existing log-only locals in the BE per-field handlers
(`UpdateStageOwnerHandler.cs:40`, etc.) noted in iter-4 feedback are
NOT touched here; they retire en bloc when slice (f) deletes those
handlers.

## One declaration per file

`schemas.ts` is the project's Zod aggregator (5 per-field schemas
already lived there pre-iter-5); appending two new request schemas
follows convention. The two new types
(`PatchFeaturePayload`, `PatchFeatureStagePayload`) are co-located in
`feature.ts` next to their per-field siblings — no new
`*Models.ts` aggregator.

## Test counts

- BE: `dotnet test OneMoreTaskTracker.slnx --nologo` →
  Api.Tests 212/212, Features.Tests 134/134, Tasks.Tests 59/59,
  GitLab.Proxy.Tests 63/63, Users.Tests 32/32 = **500/500**. Zero
  regressions vs. iter-4 baseline. (No BE code touched.)
- FE: `npx vitest run` → Test Files **72 passed (72)** total
  (54 unit + 18 storybook) / **539 tests passed**. Per the planner's
  baseline-comparison script the unit-file count grew from **52 → 54**
  with the two new sibling test files (`patchFeature.test.ts` +
  `patchFeatureStage.test.ts`). Zero baseline tests regressed.
- FE build: `tsc -b && vite build` clean.
- FE lint: 0 errors, 3 warnings (all pre-existing in `coverage/*.js`).

## Carry-overs (intentionally NOT resolved this iter)

- `RF-001` — setter visibility on `Feature.{UpdatedAt,Version}` /
  `FeatureStagePlan.{UpdatedAt,Version}`. Slice (f).
- `RF-002` — missing `UpdateFeatureLeadHandlerTests.cs`. Retires in
  slice (f) when the handler is deleted.
- `RF-004` — `UpdateFeatureHandler` bulk-replace path is still
  reachable via `PATCH /api/plan/features/{id}` with non-null
  `stagePlans[]`. Verified that no FE call site (here or elsewhere
  in `OneMoreTaskTracker.WebClient/src`) sends a non-null
  `stagePlans` array; `grep -RnE 'planApi\.updateFeature\b'`
  returns hits only inside `planApi.ts` itself (the legacy bulk
  function is otherwise unused). The bulk path will need its own
  decision in slice (f); not a blocker for slice (e).
- `RF-005` — closes here for slice (e). Per-field exports remain
  alive and deprecated, ready for physical removal in slice (f).
- `RF-006` — process gap on log-only locals; no new violations
  introduced this iter.
- `RF-007` — slice (f) decision on the bulk fork inside
  `FeaturesController.Update`.

## Commit

`refactor(webclient): consolidate planApi update functions and reroute Gantt inline editors`

Single iter-5 commit. No `!` — per-field exports stay alive
(deprecated via JSDoc), the public component API of inline editors
is unchanged, and the per-field gateway endpoints are still live.
The breaking change remains slice (f).

## Friction / surprises

None. The iter-4 gateway controllers exposed exactly the surface
described in the dispatch (`If-Match` header on both routes, body
`expectedVersion` / `expectedStageVersion` as alternate concurrency
token, response is the same `FeatureSummary` Mapster-mapped shape).
The FE side wires through cleanly without needing to touch any
inline-editor component / hook signature.
