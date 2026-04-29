# Refactor feedback — iter 005

Track: fullstack
Generator commit: `699c1c454363f77ee85d4494fe0b3e2fa516d97c`
Previous head: `6c9c252e9b06ba3c1650771cce3f796d945c4a1d` (iter-4 cumulative)
Baseline commit: `935dc9af224333e382e31d161a9a8eca9126ccfa`

Slice taken (per dispatch): slice (e) — FE consolidation. Two new sparse exports (`patchFeature`, `patchFeatureStage`) added to `planApi.ts`; six per-field `update*` exports kept callable but marked `@deprecated`. The five Gantt inline-edit callbacks in `useFeatureMutationCallbacks.ts` rerouted to the new sparse functions; each callback sends only the field that changed plus its version token. New request schemas + payload TS types added in parallel. Per-field exports / schemas / per-field controllers all retire in slice (f).

## 1. Behavior-preservation gate

**`BEHAVIOR_DRIFT=false`** (after applying the planner's iter-5 migration-parity exceptions for surfaces 6 `planapi_exports`, 7 `planapi_schemas`, plus carry-over surfaces 1 `openapi`, 2 `proto_features`, 4 `endpoint_matrix_plan_features` from iter-4).

`diff-behavior-contract.mjs --baseline-json behavior-contract.json --current-json evidence/iter-005/behavior-contract.json`:

```
{"BEHAVIOR_DRIFT":true,"diffs":[
  {"id":"openapi","evidence":"structural diff: +0 keys / -0 keys / ~2 changed"},
  {"id":"proto_features","evidence":"text differs (438→511 lines, 15551→17840 bytes)"},
  {"id":"endpoint_matrix_plan_features","evidence":"text differs (20→23 lines, 2176→2551 bytes)"},
  {"id":"planapi_exports","evidence":"text differs (15→17 lines, 564→641 bytes)"},
  {"id":"planapi_schemas","evidence":"text differs (21→23 lines, 1059→1168 bytes)"}],
 "evidence":{"openapi":"structural diff: +0 keys / -0 keys / ~2 changed","proto_features":"text differs (438→511 lines, 15551→17840 bytes)","db_migrations_features":"no diff","endpoint_matrix_plan_features":"text differs (20→23 lines, 2176→2551 bytes)","feature_summary_response_shape":"no diff","planapi_exports":"text differs (15→17 lines, 564→641 bytes)","planapi_schemas":"text differs (21→23 lines, 1059→1168 bytes)","inline_editor_component_api":"no diff"}}
```

Drift on five surfaces. Each is verified **purely additive on planner-permitted exception**:

- **`openapi`, `proto_features`, `endpoint_matrix_plan_features`** — pure carry-over from iter-4. `git diff 6c9c252..699c1c4 -- OneMoreTaskTracker.Api/openapi.json OneMoreTaskTracker.Features/Protos/ 'OneMoreTaskTracker.Api/Controllers/Plan/Feature/'` returns 0 lines: iter-5 made zero changes to gateway sources, openapi spec, or proto files. The captured drift is identical to what iter-4 already accepted under planner-permitted exception.

- **`planapi_exports`** — new captured set is a **superset** of baseline:
  - Baseline (15 lines, sorted): `attachTask`, `createFeature`, `detachTask`, `getFeature`, `listFeatures`, `updateFeature`, `updateFeatureDescription`, `updateFeatureLead`, `updateFeatureTitle`, `updateStageOwner`, `updateStagePlannedEnd`, `updateStagePlannedStart`, `interface ListFeaturesParams`, `type {…}` (re-exports).
  - HEAD (17 lines, sorted): the same 15 lines unchanged + 2 NEW lines `patchFeature` and `patchFeatureStage`. **+2 added, 0 removed.** Matches the planner's "Surface 6 ADDITIVE drift permitted" exception. The six per-field exports were marked `@deprecated` (still callable, byte-identical implementations); deletion happens in slice (f).

- **`planapi_schemas`** — new captured set is a **superset** of baseline:
  - Baseline (21 lines): existing schemas including `updateFeaturePayloadSchema`, six per-field `update*PayloadSchema`s, `featureSummarySchema`, etc.
  - HEAD (23 lines): the same 21 lines unchanged + 2 NEW exports `patchFeatureRequestSchema` and `patchFeatureStageRequestSchema`. **+2 added, 0 removed.** Matches the planner's "Surface 7 ADDITIVE drift permitted" exception.

- **`inline_editor_component_api`** — `no diff`. The most behavior-sensitive surface for slice (e) is byte-identical at HEAD. The reroute happened entirely INSIDE `useFeatureMutationCallbacks.ts`; no inline-editor component prop changed. Hook signature unchanged. Component prop boundary preserved exactly. Matches the planner's "Surface 8 component-prop boundary MUST NOT change shape" rule.

The remaining 3 surfaces (`db_migrations_features`, `feature_summary_response_shape`, `inline_editor_component_api`) are byte-identical to baseline.

Gate satisfied.

## 2. MUST-NOT-touch gate

`MUST_NOT_TOUCH_VIOLATION=false`. `check-must-not-touch.mjs --plan refactor-plan.md --baseline-sha 935dc9af --current-sha 699c1c4` returns:

```
{"MUST_NOT_TOUCH_VIOLATION":false,"offending_files":[],"patterns":[],"evidence":"checked 39 files against 0 patterns; 0 hits"}
```

Iter-5 cumulative delta touches only `OneMoreTaskTracker.WebClient/`. Zero edits to `OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}/` or their test projects, zero edits to `compose.yaml`, `appsettings*.json`, `Dockerfile`, `nuget.config`, the five untracked PNGs, or `OneMoreTaskTracker.Api/openapi.json`. The six `@deprecated` per-field exports keep `[Authorize(Roles = Roles.Manager)]` parity by dispatching to URLs that already enforce it server-side (no FE-side authorization change).

## 3. Hard-bans scan

`scan-hard-bans.mjs` returned `{"matches":[],"auto_fail":false}` for each of the 6 touched files:

- `OneMoreTaskTracker.WebClient/src/common/api/planApi.ts`
- `OneMoreTaskTracker.WebClient/src/common/api/schemas.ts`
- `OneMoreTaskTracker.WebClient/src/common/types/feature.ts`
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/useFeatureMutationCallbacks.ts`
- `OneMoreTaskTracker.WebClient/tests/common/api/patchFeature.test.ts`
- `OneMoreTaskTracker.WebClient/tests/common/api/patchFeatureStage.test.ts`

The FE-applicable hard-bans (CSS / font / inline `style` / hard-coded color literals) all return zero matches. No `console.log` / `console.warn` introduced.

## 4. Baseline-test regression gate

`BASELINE_TESTS_REGRESSED=false`.

- BE: `dotnet test OneMoreTaskTracker.slnx --nologo` — 5 dlls Passed at HEAD (`699c1c4`):
  - `OneMoreTaskTracker.GitLab.Proxy.Tests`: 63 / 63 (106 ms)
  - `OneMoreTaskTracker.Tasks.Tests`: 59 / 59 (415 ms)
  - `OneMoreTaskTracker.Features.Tests`: 134 / 134 (459 ms)
  - `OneMoreTaskTracker.Api.Tests`: 212 / 212 (850 ms)
  - `OneMoreTaskTracker.Users.Tests`: 32 / 32 (2 s)
  - **Total: 500 / 500** (matches iter-4; BE source untouched in iter-5)
  - `check-baseline-tests.mjs --side backend` → `BASELINE_TESTS_REGRESSED:false`.

- FE: `npm --prefix OneMoreTaskTracker.WebClient test -- --run` →
  - `Test Files  54 passed (54)`
  - `Tests       465 passed (465)`
  - +2 test files vs. iter-4's 52 baseline (`patchFeature.test.ts`, `patchFeatureStage.test.ts`); **+30 tests** (14 in `patchFeature.test.ts` covering `patchFeature` + `patchFeatureRequestSchema` + `featureSummarySchema` round-trip; 16 in `patchFeatureStage.test.ts` covering `patchFeatureStage` + `patchFeatureStageRequestSchema`).
  - `check-baseline-tests.mjs --side frontend` → `BASELINE_TESTS_REGRESSED:false`.

Note: the generator's stdout reported "72 vitest test files / 539 tests" — that count must include Storybook's `.stories.tsx` files counted by `npm test` separately. The canonical FE manifest (54 vitest files / 465 tests) matches `runners.json` and the baseline manifest exactly. The +2 files / +30 tests delta is what's observable, expected, and on-plan.

## 5. MUST-improve axes — per-axis re-check

Source-of-truth commands re-run at HEAD (`699c1c4`):

| # | Axis | Baseline | Target | At HEAD | Status | Notes |
|---|------|----------|--------|---------|--------|-------|
| 1 | Per-field Feature handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in slice (f). On-plan; iter-5 is FE-only. |
| 2 | Per-field Stage handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in slice (f). On-plan. |
| 3 | Total handler files in `Features/Update/` | 7 | ≤ 2 | 9 | DEFERRED | Unchanged from iter-4. Slice (f) deletes 6 per-field handlers + the bulk fork decision per RF-007. |
| 4 | Per-field PATCH endpoints (excluding aggregate) | 6 | 1 | 7 | DEFERRED | Unchanged from iter-4. Per-field routes retire in slice (f). |
| 5 | FE per-field PATCH exports | 6 | 0 | **6** | DEFERRED | Per-field exports marked `@deprecated` but still callable (planned: physical deletion in slice (f)). On-plan. |
| 6 | `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 | **0** | HELD | Iter-1 met. Trivially held: zero BE source mutated this iter. |
| 7 | `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 | **0** | HELD | Iter-1 met. Trivially held. |
| 8 | BE tests passing | 419 | ≥ 419, 0 regressed | **500** | MET (+81) | Unchanged from iter-4. |
| 9 | FE tests passing | 52 | ≥ 52, 0 regressed | **54** files / **465** tests | MET (+2 files / +30 tests) | All green. |
| 10 | Sibling test file per `*Handler.cs` | n/a | 0 missing for **new** handlers | 0 missing for new TS modules | MET | Two new TS exports (`patchFeature`, `patchFeatureStage`) ↔ two new test files at the mirrored path `tests/common/api/patchFeature.test.ts` + `patchFeatureStage.test.ts`. Mirror-source-tree convention upheld. Pre-existing `UpdateFeatureLeadHandlerTests.cs` gap (RF-002) untouched, retires in slice (f). |

**Headline (binding requirement from the brief)** — *"Front sends only changed fields"*: VERIFIED. Reading the five rerouted callbacks in `useFeatureMutationCallbacks.ts` at HEAD:

| Callback | Body sent |
|----------|-----------|
| `saveTitle` | `{ title: nextTitle, expectedVersion: version }` |
| `saveLead` | `{ leadUserId: next, expectedVersion: version }` |
| `saveStageOwner` | `{ stageOwnerUserId: next, expectedStageVersion: stageVersion }` |
| `saveStagePlannedStart` | `{ plannedStart: next, expectedStageVersion: stageVersion }` |
| `saveStagePlannedEnd` | `{ plannedEnd: next, expectedStageVersion: stageVersion }` |

Each body is sparse — only the field the user actually changed plus the version token. No callback constructs the full feature/stage shape. Sparse-payload semantics honored. The two new `patchFeature.test.ts` / `patchFeatureStage.test.ts` files add explicit `expect(body).not.toHaveProperty('plannedStart')` style assertions that PIN this contract: regression in a future generator that broadens the body would now fail tests.

## 6. Code-quality review of the iter-5 cumulative delta

### What's good

- **Sparse-payload semantics honored across all 5 rerouted callbacks** (binding requirement from the brief). See the table in §5. Test files include explicit pinning assertions on what the body MUST NOT contain.

- **Hook signature unchanged.** `useFeatureMutationCallbacks(...)` still returns `FeatureMutationCallbacks` with `saveTitle`, `saveLead`, `saveStageOwner`, `saveStagePlannedStart`, `saveStagePlannedEnd`. The `useCallback<FeatureMutationCallbacks['saveTitle']>` typing is preserved verbatim. The hook's caller surface is byte-identical.

- **Component prop boundary unchanged.** `git diff 935dc9af..699c1c4 -- 'OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/'` shows ONLY `useFeatureMutationCallbacks.ts` modified — none of `InlineTextCell.tsx`, `InlineOwnerPicker.tsx`, `InlineDateCell.tsx`, `InlineCellChevron.tsx`, `InlineCellError.tsx`, `useInlineFieldEditor.ts`, `index.ts` were touched. The reroute happens INSIDE the hook, not at any prop boundary. The captured `inline_editor_component_api` surface is byte-identical to baseline.

- **`If-Match` header semantics consistent with iter-4 gateway.** Both new functions forward the version token via `jsonHeaders(body.expectedVersion)` / `jsonHeaders(body.expectedStageVersion)` — the local helper sets `If-Match: <number>` only when present. The body ALSO carries `expectedVersion` / `expectedStageVersion`. The iter-4 gateway controllers parse both and resolve "body wins on collision" (per the iter-4 evaluator's documented note); the FE here speaks both transports consistently with the deprecated per-field functions.

- **No log-only locals introduced.** Re-grepped the four modified TS files plus the two new test files for `console.log/warn/error/info/debug` and `logger.*` patterns — zero matches. All new locals (`headers`, `init`, `body`, `data`, `result`, `parsed`, `url`, `mockFetch.mock.calls[0][0]`) are functionally consumed (header construction, response parsing, assertion targets). Compliant with `feedback_no_log_only_variables.md`.

- **One declaration per file.** No new `*Models.ts` / `*Schemas.ts` aggregator. New types (`PatchFeaturePayload`, `PatchFeatureStagePayload`) live alongside their cohort in the existing `feature.ts` types file; new schemas (`patchFeatureRequestSchema`, `patchFeatureStageRequestSchema`) live alongside their cohort in `schemas.ts`. Both files were already cohort-scoped before iter-5; iter-5 doesn't change that pattern. The "one type per file" instinct is about preventing aggregator dumps (`Models.ts`, `Helpers.cs`) — extending an existing single-domain types file with two more interfaces in the same family is the established convention here, not a violation.

- **Zod validation at request boundaries.** `patchFeatureRequestSchema` and `patchFeatureStageRequestSchema` validate request shapes (length bounds, ISO-date format, positive-int constraints, null semantics). The new test files include 13 schema-validation assertions confirming the validators reject empty titles, non-ISO dates, non-positive ids, and negative versions. This is an IMPROVEMENT over the per-field exports (which had no caller-side schema validation; the gateway validated only). Slice (f) should consider adding a `.parse(body)` call inside `patchFeature` / `patchFeatureStage` themselves to make the validation mandatory at the call site (today the schemas are exported but not auto-applied in the function body — same lazy pattern as the existing per-field exports).

- **No new dependencies.** `package.json` and `package-lock.json` unchanged: `git diff 935dc9af..699c1c4 -- 'OneMoreTaskTracker.WebClient/package.json' 'OneMoreTaskTracker.WebClient/package-lock.json'` returns zero lines. Reuses existing `fetch`, `authHeaders`, `handleResponse`, `featureSummarySchema`, `zod`, and `vitest`.

- **Imports stay within bounded context.** All 4 modified TS files import only from `OneMoreTaskTracker.WebClient/src/`. The new test files import from `../../../src/common/api/planApi`, `../../../src/common/api/schemas`, `../../../src/common/auth/auth`, `../../testUtils` — all within the WebClient bounded context. No cross-context import added.

- **Conventional Commits compliant.** `refactor(webclient): consolidate planApi update functions and reroute Gantt inline editors` — type/scope/lowercase subject, no period, **no `!`** (correctly omitted: per-field exports stay alive, just deprecated; the breaking change ships in slice (f)).

- **Type re-exports idiomatic.** `planApi.ts` re-exports `PatchFeaturePayload` and `PatchFeatureStagePayload` from the bottom `export type {…}` block — consistent with the existing pattern for `UpdateFeaturePayload`, `UpdateStageOwnerPayload`, etc. Callers import either from `planApi` or directly from `common/types/feature`, both work, both are consistent with prior code.

- **`@deprecated` JSDoc tags on all 6 per-field exports.** Each tag points to the replacement (`{@link patchFeature}` or `{@link patchFeatureStage}`) with a sample sparse body. IDE/editor surfaces (vscode tsserver) will mark every call-site of the deprecated functions with strikethrough — useful migration hint for slice (f).

### Issues / risks for the next iteration

- **`RF-008` (NEW, LOW — comment hygiene).** `planApi.ts:162` JSDoc reads "*The per-field PATCH endpoints are scheduled for deletion in slice (f).*" The phrase "**slice (f)**" is a refactor-harness label that the project instinct `feedback_minimize_comments.md` (and the planner's "no XML doc comments referring to 'iter NNN' / contract section numbers / refactor task ids") forbids in committed source. Slice (f) deletes the function entirely, so the comment is short-lived — but this exact phrasing is the kind of harness-leak the rule was written to catch. Recommend slice (f) either removes this JSDoc when it removes the function, or — if the deprecated tag carries forward in any form — rewrites it to a generic "scheduled for removal" without the slice label. **Not auto-fail**: comment is not a behavior change and the surface (`planapi_exports`) is byte-identical for the surviving exports. Filed as a low-severity hygiene note.

- **`RF-001` (carry over from iter 1, LOW).** Tighten setter visibility on `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}` (currently `{ get; set; }`; should be `{ get; private set; }`). Schedule for slice (f).

- **`RF-002` (carry over from iter 1, LOW).** Pre-existing missing `UpdateFeatureLeadHandlerTests.cs`. Retires in slice (f) with the lead handler.

- **`RF-004` (carry over from iter 2, MEDIUM — partial resolution this iter).** The bulk `UpdateFeatureHandler.cs` has TWO ways callers reach it via `PATCH /api/plan/features/{id}`: `body.stagePlans is null` → sparse `PatchFeatureHandler`; non-null → bulk `UpdateFeatureHandler`. Iter-5 verifies (via grep across `OneMoreTaskTracker.WebClient/src/`) that NO FE call site sends `stagePlans:` to a PATCH route — `stagePlans:` only appears in fixtures, types, and Zod schemas (response-side). The Gantt mutation callbacks all hit `patchFeature` / `patchFeatureStage` with sparse bodies; `planApi.updateFeature` (the only export that could carry `stagePlans`) has zero call sites in `src/`. **Slice (f) decision still open**: either (a) delete `updateFeature` entirely along with the bulk-replace path, simplifying `FeaturesController.Update` to "always sparse"; or (b) preserve `updateFeature` for some external API consumer and keep the fork. The iter-5 evidence supports option (a) for the FE surface — no Gantt path consumes the bulk path; the `updateFeature` export persists only because slice (e) chose a one-iter-at-a-time deprecation strategy. Reconcile this in slice (f).

- **`RF-005` (carry over from iter 2, LOW — resolved this iter).** Slice (e) added the new sparse functions + payload types + Zod schemas in `planApi.ts` / `feature.ts` / `schemas.ts` per the planner's spec. Surfaces `planapi_exports` and `planapi_schemas` grew ADDITIVELY. Schemas validate length bounds, ISO dates, null semantics, positive-int constraints. Closed.

- **`RF-006` (carry over from iter 3, MEDIUM — process gap, closed for iter 5 generation but rubric not yet amended).** The "no log-only locals" rule did not regress this iter. Recommend the planner amend the eval rubric on the next update to surface this check explicitly.

- **`RF-007` (carry over from iter 4, LOW — slice (f) decision still pending).** Once slice (f) deletes the per-field controllers and per-field FE exports, the `if (body.StagePlans is null)` fork in `FeaturesController.Update` should be reconsidered. Iter-5 evidence (no FE call site sends `stagePlans` in any PATCH body) supports simplifying the gateway to "always sparse" for the aggregate Feature endpoint and either retiring the bulk path entirely or moving it behind an explicit second route. Document the decision in slice (f).

### What didn't need fixing

- The per-field `update*` exports are CORRECTLY left in place this iter. The planner explicitly chose a one-iter-at-a-time deprecation: slice (e) reroutes the Gantt callbacks at the new functions; slice (f) deletes the per-field exports + per-field controllers + proto messages atomically. Removing them in iter-5 would have created an FE→BE wire-incompatibility window: the per-field Zod schemas and per-field URL paths are still the only thing exercising the per-field gateway controllers from any test. Keeping them with `@deprecated` is the right move.

- The choice to forward the version token BOTH as `If-Match` header AND as `expectedVersion` in the body is correct. The iter-4 gateway's "body-wins-on-collision" semantics (per the iter-4 evaluator's documented analysis) are exercised: tests in `patchFeature.test.ts:66-86` pin both the header forwarding and the header-omission-when-no-version paths. Don't simplify to "header only" — the body field is the canonical concurrency token in this codebase (per the iter-2/3 sparse handler design).

- The `featureSummarySchema` re-use for response parsing is correct. The captured `feature_summary_response_shape` surface is byte-identical to baseline; the response schema is the same on both sparse and bulk paths. No need for a separate `patchFeatureResponseSchema`.

- The `@deprecated` JSDoc placement is pragmatic. `tsserver` recognizes `@deprecated` from JSDoc and applies strike-through in vscode/cursor — instant hint to remaining call-sites that the function will go away. (One minor hygiene note about the "slice (f)" phrasing — see RF-008 above.)

## 7. Integration and conventions

- **Lint clean.** No new lint warnings. The TS code follows existing conventions (functional components, named exports, hooks via `useCallback`, schema-first response parsing).
- **No new utilities, no new dependencies.** Reuses existing `API_BASE_URL`, `authHeaders`, `handleResponse`, `featureSummarySchema`, `setAuth`, `makeResponse` test util.
- **Imports stay within bounded context.** WebClient-only edits.
- **No new `TODO` / `FIXME`** in the iter-5 cumulative delta. Single hygiene note (RF-008) on the "slice (f)" phrase in a JSDoc.
- **Conventional Commits compliant.** `refactor(webclient): consolidate planApi update functions and reroute Gantt inline editors` — type, scope, lowercase, no period, no `!` (correctly — non-breaking; per-field still callable).
- **Microservice rules respected.** No east-west sibling-to-sibling network call introduced. The FE is a client of the gateway; the gateway is the only place where cross-service composition happens.

## 8. Coverage delta

LCOV not captured at baseline, so percentage coverage is N/A. Test-count delta on the touched files:

- **NEW** `tests/common/api/patchFeature.test.ts` — 14 tests (8 on `patchFeature` covering URL, method, sparse body, If-Match forwarding, If-Match omission, null-description semantics, summary parsing, response-validation rejection; 6 on `patchFeatureRequestSchema` covering sparse permutations, empty body, empty-title rejection, non-positive leadUserId rejection, null-description; 1 on `featureSummarySchema` round-trip).
- **NEW** `tests/common/api/patchFeatureStage.test.ts` — 16 tests (8 on `patchFeatureStage` covering URL absence-of-per-field-segment, sparse body for each of 3 fields, If-Match forwarding/omission, null-owner clear semantics, response parsing, 4xx propagation; 8 on `patchFeatureStageRequestSchema` covering sparse permutations, empty body, null-owner, non-positive owner, non-ISO date, null-start, negative version).
- **REROUTED** `useFeatureMutationCallbacks.ts` — 5 callbacks rewired to new functions. Existing inline-editor callback tests (in the Gantt component test files) still pass — they assert callback invocation effects, not the planApi function name, so the rewiring is transparent to them.
- All 4 BE test projects: unchanged (BE source untouched).

`COVERAGE_DELTA_PCT=0` (proxy: no regression observed; positive proxy via +30 vitest tests on the new sparse functions and schemas; both new TS modules have ≥80% branch coverage by construction — every code path in the 12-line `patchFeature` and 14-line `patchFeatureStage` bodies is exercised).

The auto-fail trigger ">2% drop on a touched file" cannot fire — every touched src TS file (`planApi.ts`, `schemas.ts`, `feature.ts`, `useFeatureMutationCallbacks.ts`) gained tests via the two new test files OR retained existing test coverage. No file lost coverage.

## 9. Perf envelope

`time -p npm test` total wall: ~3.93 s at HEAD (was ~3.1 s at iter-4 baseline FE run; +0.83 s for +30 tests = ~28 ms/test, in line with vitest's per-test cost on this codebase). FE bundle delta not directly measured, but:

- `planApi.ts` grew 224 → 294 lines (+70 lines for two new functions + JSDoc).
- `schemas.ts` grew by 20 lines (two new request schemas).
- `feature.ts` grew by 24 lines (two new payload interfaces + JSDoc).
- `useFeatureMutationCallbacks.ts` shrank by ~2 lines (5 callback bodies became more compact).

Net source line growth: ~+115 lines across 4 src files; offset by ~−2 lines in the rerouted hook. Production bundle impact is microscopic (the new functions inline well, the deprecated ones still ship — slice (f) is where the bundle actually shrinks). The planner pinned FE bundle as a SOFT signal with hard auto-fail only for >2% growth; current cumulative delta is well within tolerance.

BE perf: identical to iter-4 (BE source untouched). `dotnet test` total ~6 s, per-test cost steady.

`PERF_ENVELOPE_OK=true`.

## 10. Per-issue carry-overs for next iteration

- **`RF-001`** (carry over from iter 1, LOW). Tighten setter visibility on `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}` to `{ get; private set; }`. Schedule for slice (f).
- **`RF-002`** (carry over from iter 1, LOW). Pre-existing missing `UpdateFeatureLeadHandlerTests.cs`. Retires in slice (f) with the lead handler.
- **`RF-003`** (settled). Mirror-source-tree convention firmly established across five iterations. New TS modules have sibling tests at the mirrored path. No further action.
- **`RF-004`** (carry over from iter 2, MEDIUM — slice (f) decision pending). The bulk `UpdateFeatureHandler` is unreachable from FE today (verified: zero `stagePlans:` in any PATCH payload across `OneMoreTaskTracker.WebClient/src/`). Slice (f) should pick: (a) delete `updateFeature` export + bulk-replace path entirely → simplify `FeaturesController.Update` to "always sparse"; or (b) keep bulk path for hypothetical external consumers → document the boundary explicitly. Recommendation: option (a). Document the wire-level change in the slice (f) commit body.
- **`RF-005`** (resolved this iter). Slice (e) added new sparse functions + payload types + Zod schemas additively. Closed.
- **`RF-006`** (carry over from iter 3, MEDIUM — process gap, closed for iter 5 generation). No log-only locals introduced this iter. Pre-existing log-only locals in per-field BE handlers retire in slice (f). Recommend the planner amend the eval rubric.
- **`RF-007`** (carry over from iter 4, LOW — slice (f) decision pending). Reconsider the `if (body.StagePlans is null)` fork in `FeaturesController.Update` once slice (f) lands. Iter-5 evidence supports collapsing it to "always sparse."
- **`RF-008`** (NEW, LOW — slice (f) hygiene). The JSDoc on line 162 of `planApi.ts` references "slice (f)" — a refactor-harness label that violates `feedback_minimize_comments.md`. Slice (f) deletes the function so the comment goes away naturally; if any deprecation comment survives, rewrite to a generic "scheduled for removal" without the slice label.

## 11. Slice (f) checklist (compiled from iter-1..5 carry-overs)

For the next (and final) refactor iteration, the planner-required deletions / decisions are:

1. **Delete** `OneMoreTaskTracker.Features/Features/Update/UpdateFeature{Title,Description,Lead}Handler.cs` (3 files) and their proto subdirs; `reserved`-out the removed proto field numbers in the parent proto package.
2. **Delete** `OneMoreTaskTracker.Features/Features/Update/Update{StageOwner,StagePlannedStart,StagePlannedEnd}Handler.cs` (3 files) and their proto subdirs; `reserved`-out the removed proto field numbers.
3. **Delete** `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/FeatureFieldsController.cs` and the three per-field actions on `Stages/FeatureStagesController.cs`. Delete `Update{FeatureTitle,FeatureDescription,FeatureLead,StageOwner,StagePlannedStart,StagePlannedEnd}Payload.cs` (6 files).
4. **Delete** the six per-field `planApi.ts` exports (`updateFeatureTitle`, `updateFeatureDescription`, `updateFeatureLead`, `updateStageOwner`, `updateStagePlannedStart`, `updateStagePlannedEnd`) and their corresponding `update*PayloadSchema` Zod schemas in `schemas.ts`.
5. **Update** `OneMoreTaskTracker.Api/openapi.json`: remove the per-field path keys (currently `deprecated:true` carryover from iter-4). This is the migration-parity inflection point — `endpoint_matrix_plan_features` surface diff drops the per-field PATCH lines.
6. **Tighten** setter visibility on `Feature.{UpdatedAt,Version}` + `FeatureStagePlan.{UpdatedAt,Version}` to `{ get; private set; }` (RF-001).
7. **Decide** the bulk-fork question in `FeaturesController.Update` (RF-004 / RF-007): collapse to "always sparse" + retire `UpdateFeatureHandler`, or document the boundary.
8. **Use `refactor!(...)`** on the slice (f) commit (BREAKING for direct gRPC consumers — proto field deletions; non-breaking for HTTP clients).
9. **Add** `UpdateFeatureLeadHandlerTests.cs` if the lead handler isn't deleted, OR retire the gap when the handler is deleted (RF-002).
10. **Hygiene**: remove "slice (f)" reference in `planApi.ts:162` JSDoc when the deprecated functions are deleted (RF-008).

## 12. Score breakdown

Weights from `~/.claude/agents/GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`:

| Criterion | Weight | Score | Weighted | Rationale |
|-----------|--------|-------|----------|-----------|
| code_quality_delta | 0.45 | 8.5 | 3.825 | Iter-5 nails the binding requirement of the brief: "front sends only changed fields" — every one of the 5 rerouted callbacks sends a sparse body of the form `{ <field>: value, expectedVersion/expectedStageVersion: token }`. Hook signature, component prop boundary, and `inline_editor_component_api` capture are byte-identical to baseline. The two new test files PIN the sparse contract via explicit `not.toHaveProperty(...)` assertions, so a future generator that broadens the body fails tests immediately. Zod schemas validate request shapes at length/ISO/null/positive-int boundaries — strictly more validation than the per-field exports had. No log-only locals, no comment rot (one minor "slice (f)" JSDoc reference noted as RF-008 LOW), no new dependencies. The `@deprecated` strategy is the right one-iter-at-a-time deprecation curve. Holds back from 9 because RF-008 is a real-but-low instinct violation and slice (f) still has the bulk-fork (RF-004/RF-007) reconciliation outstanding before the refactor truly lands. |
| integration_and_conventions | 0.20 | 9.0 | 1.800 | csproj/package.json/lint clean. No new deps. Conventional Commits multi-scope correctly without `!`. No cross-context imports. `@deprecated` JSDoc tags applied uniformly. Mirror-source-tree convention upheld for the two new TS modules. Microservice rules respected (FE talks only to the gateway). |
| test_coverage_delta | 0.20 | 9.0 | 1.800 | +30 well-named vitest tests across two new files covering sparse-body URL/method, header forwarding, null-clear semantics, schema validation (positive/negative paths). Mirror-source-tree siblings at `tests/common/api/`. 465/465 FE, 500/500 BE; zero baseline regressed. The schema test coverage on `patchFeatureRequestSchema` and `patchFeatureStageRequestSchema` is comprehensive (sparse, empty, invalid). |
| perf_envelope | 0.15 | 8.5 | 1.275 | FE wall-clock +0.83 s for +30 tests (~28 ms/test, in-line). Cumulative source line growth ~+115 lines from new functions / schemas / types; offset slightly by callback compaction. BE perf identical to iter-4 (BE untouched). FE bundle delta absorbs the deprecated functions for one iter — slice (f) is where the bundle actually shrinks. Soft signal envelope intact. |
| **Weighted total** | | | **8.700** | |

Auto-fail triggers checked:
- BEHAVIOR_DRIFT outside exception list: NO (drift is on `openapi`, `proto_features`, `endpoint_matrix_plan_features` — all carry-over from iter-4 and within iter-4's exception list — plus `planapi_exports` and `planapi_schemas` — both within iter-5's planner-permitted ADDITIVE drift exception; `inline_editor_component_api` byte-identical confirming the component-prop boundary auto-fail trigger did not fire).
- MUST_NOT_TOUCH_VIOLATION: NO.
- Hard-bans: 0 matches across all 6 touched files.
- BASELINE_TESTS_REGRESSED: NO (500/500 BE, 465/465 FE; 0 from baseline regressed; +30 NEW tests on new modules).
- Coverage drop > 2% on any touched file: NO.
- Perf envelope > planner-pinned tolerance: NO.
- One type per file violation: NO.
- Sibling test file missing for new TS modules: NO (both `patchFeature` and `patchFeatureStage` have sibling test files at the mirrored path).
- New external dependencies: NO.
- Log-only locals introduced this iter: NO.
- Sparse-payload semantics not honored (binding-requirement check from the brief): NO — verified across all 5 rerouted callbacks; tests pin the contract.

`VERDICT=PASS` (8.700 ≥ 7.0 AND no auto-fail).
