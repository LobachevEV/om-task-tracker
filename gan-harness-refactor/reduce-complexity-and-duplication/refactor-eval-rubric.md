# Refactor Eval Rubric — reduce-complexity-and-duplication

Track: backend

Canonical weights live in `GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`. Do not duplicate weights here. The orchestrator inlines that sub-section when this rubric is consumed.

Behavior preservation is a **gate**, not a weighted score: drift in the captured behavior contract forces auto-fail regardless of the weighted total. See `GAN-FEATURE-SHARED.md` §"Refactor auto-fail triggers".

## Criterion meanings (source-of-truth pointers)

- `code_quality_delta` — readability, coupling, duplication, dead code, dependency removal, file-size targets. Source of truth: the MUST-improve axes table in `refactor-plan.md`. Each axis must move toward its target; regression on any axis caps this score at 4. Specifically for this refactor:
  - axis "total LoC across the seven inline-edit handlers" must drop from 469 → ≤ 300;
  - axes counting literal copies of the manager-ownership guard, `catch (DbUpdateConcurrencyException)`, `MapSummary` overloads, `NewConfig<Feature, ...>` blocks, `ExtractDisplayName` definitions, and gateway `DateOnly.TryParseExact("yyyy-MM-dd", ...)` call sites must each hit their per-axis targets;
  - regression on any single axis caps the score; partial credit (e.g. axis met for feature-level handlers but not stage-level) is the planner's expected mid-iteration state.
- `integration_and_conventions` — follows existing patterns; no new utilities duplicating existing ones; lint clean; no new TODO/FIXME introduced; imports stay within established module boundaries. For this refactor, specifically:
  - the new scaffolding lives inside `OneMoreTaskTracker.Features/Features/Update/` (no new `OneMoreTaskTracker.Common` project);
  - per-proto-namespace partial-class bridges live in a single bridges directory with one type per file;
  - the `csharp-proto-domain-interface` user skill is the recommended technique for collapsing the proto-FeatureDto fan-out — a roll-your-own approach must justify itself.
- `test_coverage_delta` — coverage on touched files MUST be ≥ baseline (drop > 2% is auto-fail per SHARED §"Refactor auto-fail triggers"). New tests for the extracted scaffolding earn points. The test-corpus assertion-count surface is pinned as additive-only in the Behavior preservation envelope; the count MAY rise but MUST NOT fall.
- `perf_envelope` — no regression on the perf signal pinned in `refactor-plan.md`. This refactor adds no extra DB calls per handler; the implicit envelope is "no test-suite wall-clock regression visible at the baseline test set". The shared scaffolding MUST NOT introduce a second `db.Features.Include(StagePlans).FirstOrDefault` per handler.

## Behavior-preservation gate (PRESERVED VERBATIM)

Diff baseline `behavior-contract.json` against re-captured contract from the iteration's HEAD:

- Frontend: component-API diff (props/types/exports), visual snapshot diff (pixel tolerance per `refactor-plan.md`), interaction trace diff.
- Backend: public API surface diff (openapi/sdl/types), persisted-data schema diff, endpoint behavior matrix diff.
- Fullstack: both.

Any non-empty diff (after applying planner-pinned tolerances) → emit `BEHAVIOR_DRIFT=true` → auto-fail.

## Feature-specific addenda

**Refactor-specific acceptance criteria** (these compose with the canonical weights, they do not replace them):

1. **Per-axis monotonicity.** Each axis in `refactor-plan.md` is monotonic: regression on any axis between iterations is reported as a finding. The evaluator runs the source-of-truth command for every axis at the iteration's HEAD and compares to baseline; any axis that moved AWAY from its target caps `code_quality_delta` at 4 even if the rest improved.

2. **Public-error-shape preservation.** Tests that assert exact `RpcException`/`StatusCode` values (e.g. `StatusCode.PermissionDenied`, `StatusCode.AlreadyExists`, `StatusCode.NotFound`, `StatusCode.InvalidArgument`, `StatusCode.FailedPrecondition`) MUST still pass with the same emitted code. The shared scaffolding may centralize the `throw` site, but the resulting status code at the wire boundary MUST be identical for every previously-tested input.

3. **Optimistic-concurrency increment preservation.** `Feature.Version` and `FeatureStagePlan.Version` MUST continue to bump by exactly +1 per per-field PATCH. A scaffolding implementation that bumps by +2 or batches multiple bumps into one save silently breaks the concurrency contract; this is auto-fail. The `behavior-capture.json` does not directly capture this (it's runtime state, not surface), so the evaluator relies on the existing `InlineEditEndpointsTests` and `UpdateFeatureHandlerTests` to guard it.

4. **Log-shape preservation tolerance.** The `feature_inline_edit_log_format` surface is captured as sorted log lines. After the refactor, log lines may move from per-handler call sites to a single shared emit. The evaluator accepts the diff as parity if and only if:
   - the template prefix `"Feature inline edit applied: feature_id={FeatureId} field=... ... actor_user_id={ActorUserId} ..."` is preserved verbatim;
   - the structured field names per category (feature-level: `version_before/version_after`; stage-level: `stage_version_before/stage_version_after` aliased as `{V0}/{V1}` or `{SV0}/{SV1}`) are preserved;
   - the field-specific bullet (`title_len_before` etc.) for each handler still appears in the resulting log line.

5. **gRPC status-code surface tolerance.** The `grpc_status_code_emit_sites` surface is captured as a per-file histogram. The refactor is allowed to move emission sites from leaf handler files into the scaffolding file, provided:
   - the **set** of distinct status codes emitted across `OneMoreTaskTracker.Features/Features` is unchanged at `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists, FailedPrecondition}`;
   - no emission moves OUT of `OneMoreTaskTracker.Features/Features/`.

6. **No silent contract reinterpretation.** The shared scaffolding MUST NOT change which `StatusCode` a given input maps to. Specifically: `request.CallerUserId <= 0` continues to map to `PermissionDenied` (not `Unauthenticated` — both are plausible reads, but the existing tests pin `PermissionDenied`).

7. **No new shared-infrastructure project.** Per project rules, the refactor MUST NOT introduce `OneMoreTaskTracker.Common` or any cross-bounded-context shared project. The scaffolding for inline-edit handlers lives inside `OneMoreTaskTracker.Features`; the gateway helpers stay inside `OneMoreTaskTracker.Api`. Cross-project sharing of the duplicate `ExtractDisplayName` is OK ONLY because both copies already live inside `OneMoreTaskTracker.Api`.
