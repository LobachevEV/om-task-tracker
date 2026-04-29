# Refactor Eval Rubric — consolidate-feature-update-handlers

Track: fullstack

Canonical weights live in `~/.claude/agents/GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`. Do not duplicate weights here. The orchestrator inlines that sub-section when this rubric is consumed.

Behavior preservation is a **gate**, not a weighted score: drift in the captured behavior contract forces auto-fail regardless of the weighted total. See `~/.claude/agents/GAN-FEATURE-SHARED.md` §"Refactor auto-fail triggers".

## Criterion meanings (source-of-truth pointers)

- `code_quality_delta` — readability, coupling, duplication, dead code, dependency removal, file-size targets. Source of truth: the MUST-improve axes table in `refactor-plan.md` (axes 1–7, 10). Each axis must move toward its target; regression on any axis caps this score at 4.
- `integration_and_conventions` — follows existing patterns; no new utilities duplicating existing ones; lint clean; no new TODO/FIXME introduced; imports stay within established module boundaries (`~/.claude/rules/microservices/contracts.md` and `composition.md`).
- `test_coverage_delta` — coverage on touched files MUST be ≥ baseline (drop > 2% is auto-fail per SHARED §"Refactor auto-fail triggers"). New tests for previously untested branches earn points. Source of truth: axes 8 + 9 (regression detector) and axis 10 (sibling-test-file existence).
- `perf_envelope` — no regression on the perf signal pinned in `refactor-plan.md`. The plan does NOT measure FE bundle size or BE p50/p95 at v1; this criterion scores on absence-of-regression in observable timings. Going beyond a soft tolerance (BE `dotnet test` total elapsed >10% slower than baseline; FE `dist/**` total bytes growing >2%) is a deduction, not an auto-fail.

## Behavior-preservation gate (PRESERVED VERBATIM)

Diff baseline `behavior-contract.json` against re-captured contract from the iteration's HEAD (re-run `node ~/.claude/scripts/gan-feature/capture-behavior-contract.mjs --config gan-harness-refactor/consolidate-feature-update-handlers/behavior-capture.json --out-dir <iter-dir> --track fullstack --label iter-NNN`):

- Frontend: component-API diff (props/types/exports) on the `inline_editor_component_api`, `planapi_exports`, `planapi_schemas` surfaces.
- Backend: public API surface diff on `openapi`, `proto_features`; persisted-data schema diff on `db_migrations_features`; endpoint behavior matrix diff on `endpoint_matrix_plan_features`; response-shape diff on `feature_summary_response_shape`.

Any non-empty diff (after applying planner-pinned tolerances; see `refactor-plan.md` § "Behavior preservation envelope" → "Migration-parity exceptions") → emit `BEHAVIOR_DRIFT=true` → auto-fail.

## Feature-specific addenda

These notes are additive to the SHARED `### Refactor` rubric and the SHARED auto-fail triggers — they do NOT redefine weights or introduce new gates beyond the canonical set.

1. **Behavior-drift gate clarifications** — for THIS refactor, the following surface diffs are auto-fail UNLESS the planner explicitly granted migration parity in `refactor-plan.md`:
   - Any change to `feature_summary_response_shape` (the wire shape of `FeatureSummaryResponse` / `FeatureDetailResponse` / stage-plan responses) is auto-fail. No exceptions — the FE depends on these field names.
   - Any change to the `[Authorize(Roles = ...)]` attribute on a Plan/Feature controller action is auto-fail (security regression).
   - Any change to `If-Match` header semantics on the consolidated PATCH endpoints is auto-fail (optimistic-concurrency regression).
   - The `db_migrations_features` surface MAY only grow by additive migrations (see `refactor-plan.md` migration-parity #3). Removing or editing an existing migration file is auto-fail.
   - Removed proto field numbers MUST be `reserved`-d in surviving messages (per `~/.claude/rules/microservices/contracts.md`). A removed-without-reserved field number is auto-fail.

2. **Project instincts (auto-fail when violated)**:
   - **One type per file (100% confidence project instinct)**: any file under `OneMoreTaskTracker.Features/` or `OneMoreTaskTracker.Api/` containing more than one top-level `public class|record|interface|enum|struct` declaration is auto-fail.
   - **Sibling test file per handler (95% confidence project instinct)**: every `*Handler.cs` under `OneMoreTaskTracker.Features/Features/Update/` MUST have a matching `*HandlerTests.cs` under `tests/OneMoreTaskTracker.Features.Tests/`. Axis 10 in the plan; missing sibling = auto-fail.
   - **Minimize comments (project instinct)**: comments that reference task IDs, "iter NNN" labels, or contract-section numbers are auto-fail. The generator inherits the existing comment style of the bounded context.
   - **Conventional Commits (100% confidence)**: every commit in the refactor MUST use `<type>(<scope>): <subject>`. Commits that delete proto messages MUST use the `!` breaking-change marker.

3. **Scope-overrun penalties** (deductions, not auto-fail):
   - Any edit to `OneMoreTaskTracker.Users/`, `OneMoreTaskTracker.Tasks/`, `OneMoreTaskTracker.GitLab.Proxy/`, `compose.yaml`, `appsettings*.json`, or any `Dockerfile` is auto-fail per the MUST-NOT-touch list in `refactor-plan.md`.
   - Edits that add a new bounded-context-crossing east-west call (Features service calling Users service, etc.) violate `~/.claude/rules/microservices/composition.md` and are auto-fail.

4. **Domain-encapsulation acceptance bar**:
   - At HEAD of the final commit, the regex `\b(feature\.Version|feature\.UpdatedAt|plan\.Version|plan\.UpdatedAt)\s*=` MUST return ZERO matches outside `OneMoreTaskTracker.Features/Features/Data/Feature.cs` and `FeatureStagePlan.cs`. This is the load-bearing acceptance criterion for the brief's "Version increment and UpdatedAt bookkeeping must be encapsulated inside the Feature aggregate" requirement.

5. **Test reshape, not test deletion**: existing `UpdateFeatureHandlerTests.cs` and `FeatureStagePlanHandlerTests.cs` cases that test per-field handler behavior MUST be reshaped to test the consolidated handlers, not deleted outright. Net test count over `tests/OneMoreTaskTracker.Features.Tests/` MUST be ≥ baseline (82 today). Net test count over `tests/OneMoreTaskTracker.Api.Tests/` MUST be ≥ baseline (183 today). Net test count over `OneMoreTaskTracker.WebClient/tests/` MUST be ≥ baseline (52 today).

6. **No new external dependencies**: the refactor MUST NOT add any new NuGet package or npm dependency. The consolidation is achievable with the existing toolset (Mapster, Grpc.AspNetCore, EF Core, Zod, vitest). New deps are auto-fail.
