# Refactor Eval Rubric — per-request-datetime-provider

Track: backend

Canonical weights live in `GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`. Do not duplicate weights here. The orchestrator inlines that sub-section when this rubric is consumed.

Behavior preservation is a **gate**, not a weighted score: drift in the captured behavior contract forces auto-fail regardless of the weighted total. See `GAN-FEATURE-SHARED.md` §"Refactor auto-fail triggers".

## Criterion meanings (source-of-truth pointers)

- `code_quality_delta` — readability, coupling, duplication, dead code, dependency removal, file-size targets. Source of truth: the MUST-improve axes table in `refactor-plan.md`. Each axis must move toward its target; regression on any axis caps this score at 4. The two flagship axes for this refactor are (a) production `DateTime.UtcNow` reads → 0 in-scope, and (b) entity default initializers reading the clock → 0.
- `integration_and_conventions` — follows existing patterns; no new utilities duplicating existing ones; lint clean; no new TODO/FIXME introduced; imports stay within established module boundaries. Specific conventions to verify for THIS refactor:
  - One type per file (project rule: `~/.claude/projects/.../feedback_one_type_per_file.md` mirrored in OMEGA). `IRequestClock` and `RequestClock` are in separate files; same for any new test class.
  - Zero default comments (project rule: `feedback_minimize_comments.md`).
  - No log-only locals (project rule: `feedback_no_log_only_variables.md`).
  - Bounded-context isolation: each service registers its own `IRequestClock`. The presence of a shared `OneMoreTaskTracker.Common` project containing the abstraction is a §integration_and_conventions failure (the planner explicitly rejected this option).
  - Handler-per-use-case is preserved; constructors gain a single `IRequestClock` parameter, no new aggregator classes.
- `test_coverage_delta` — coverage on touched files MUST be ≥ baseline (drop > 2% is auto-fail per SHARED §"Refactor auto-fail triggers"). New tests for previously untested branches earn points. Specifically required (from MUST-improve axes):
  - At least one integration test asserting per-request-capture semantics (two clock reads in one scope → identical DateTime).
  - At least one unit test per service's `RequestClock` covering capture-once + cross-scope distinctness.
- `perf_envelope` — no regression on the perf signal pinned in `refactor-plan.md`. For this refactor the envelope is implicit: no new hot-path work, the injected clock adds one property read per call. The behavior-contract gate enforces the public-shape invariants; the perf envelope is satisfied as long as `dotnet test` wall-clock duration does not balloon (a 3× slowdown of any individual test would indicate a leak; otherwise this dimension is neutral).

## Behavior-preservation gate (PRESERVED VERBATIM)

Diff baseline `behavior-contract.json` against re-captured contract from the iteration's HEAD:

- Frontend: component-API diff (props/types/exports), visual snapshot diff (pixel tolerance per `refactor-plan.md`), interaction trace diff.
- Backend: public API surface diff (openapi/sdl/types), persisted-data schema diff, endpoint behavior matrix diff.
- Fullstack: both.

Any non-empty diff (after applying planner-pinned tolerances) → emit `BEHAVIOR_DRIFT=true` → auto-fail.

## Feature-specific addenda

**Pre-pinned tolerance for the `test_corpus_assertion_count` surface.**
This surface is additive-only. Re-captured assertion count MUST be ≥ baseline. A drop in the count is BEHAVIOR_DRIFT. A rise is acceptable (and expected — the new tests land in commits 1, 2, and 5 of the planned sequence). The evaluator must treat strict-superset drift on this single surface as parity. Every other surface (`openapi_json`, `features_proto_surface`, `feature_entity_shape`, `ef_migrations_history`, `ef_schema_columns`, `api_endpoint_matrix`, `jwt_claims_and_expiration_shape`) is exact-byte parity.

**Public-shape parity on the entity-shape surface.**
The `feature_entity_shape` surface intentionally captures property declarations (name, getter/setter/init access, type) rather than their default-initializer expressions. Removing `= DateTime.UtcNow` from `Feature.CreatedAt` / `Feature.UpdatedAt` and from `FeatureStagePlan.CreatedAt` / `FeatureStagePlan.UpdatedAt` therefore does NOT register as drift on this surface. This is by design — the public shape (consumers see `DateTime CreatedAt { get; init; }`) is what we promise to preserve; how the timestamp is supplied is implementation detail. If, after the refactor, the grep output for this surface differs, the divergence is real drift (e.g. a property was added, renamed, or its access modifier changed).

**Migration parity claim.**
No schema changes. The two relevant migrations (`20260422084830_InitialCreate`, `20260423104631_AddFeatureStagePlans`) define `CreatedAt` / `UpdatedAt` as `timestamp with time zone NOT NULL`. The refactor does not add, remove, rename, or retype any column. The `ef_schema_columns` surface in `behavior-contract.json` is exact-byte parity.

**MUST-NOT-touch enforcement.**
Edits to any file listed under `refactor-plan.md` §MUST-NOT-touch are auto-fail regardless of the weighted total. Particular attention to:
- `OneMoreTaskTracker.Api/Auth/JwtTokenService.cs` (line 40 `DateTime.UtcNow` stays).
- `OneMoreTaskTracker.Api/openapi.json` (zero diff).
- `OneMoreTaskTracker.Features/Migrations/**` (zero diff; no new migration files).
- `OneMoreTaskTracker.Features/Protos/**/*.proto` (zero diff).

**Axis-by-axis evidence the evaluator should produce.**
Each axis in `refactor-plan.md` §"Target axes" has a `Source-of-truth` shell command. The evaluator runs each command at the iteration HEAD and records the value alongside the baseline number. A miss on any of the seven axes (production-clock-read count, abstraction-injected count, entity-initializer count, integration-test presence, unit-test count, build, test pass count) is documented in `backend-feedback-NNN.md` with severity reflecting the gap.
