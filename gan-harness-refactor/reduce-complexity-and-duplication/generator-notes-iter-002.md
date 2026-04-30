# Generator notes — iter 002

Track: backend
Slice: migrate the 4 feature-level inline-edit handlers onto the iter-1 helpers (`FeatureLoader`, `FeatureOwnershipGuard`, `FeatureVersionGuard`, `FeatureConcurrencySaver`).

## Migrated handlers (LoC)

| Handler | Baseline | iter-002 | Delta |
|---------|----------|----------|-------|
| UpdateFeatureTitleHandler.cs | 61 | 45 | -16 |
| UpdateFeatureDescriptionHandler.cs | 64 | 47 | -17 |
| UpdateFeatureLeadHandler.cs | 56 | 40 | -16 |
| UpdateFeatureHandler.cs | 89 | 68 | -21 |
| UpdateStageOwnerHandler.cs (untouched) | 67 | 67 | 0 |
| UpdateStagePlannedStartHandler.cs (untouched) | 78 | 78 | 0 |
| UpdateStagePlannedEndHandler.cs (untouched) | 78 | 78 | 0 |
| **Total (axis 1)** | **493** | **423** | **-70** |

Target: ≤ 320. Partial credit; iter-3 will close the remaining gap by migrating the three stage-level handlers.

## Axis movement

| # | Axis | Baseline | iter-001 | iter-002 | Target |
|---|------|----------|----------|----------|--------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 493 | 423 | ≤ 320 |
| 2 | Manager-ownership guard literal copies | 7 | 7 | 3 | 1 |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | 8 | 5 | ≤ 2 (stretch 1) |

Axis 2: 4 leaf copies removed (4 feature-level handlers now call `FeatureOwnershipGuard.EnsureManager`). Remaining 3 copies are the 3 stage-level handlers (iter-3 target).

Axis 3: 3 leaf catches removed (3 of the 4 feature-level handlers had a catch — `UpdateFeatureHandler` never had one; its raw `SaveChangesAsync` is preserved unchanged). Remaining 5 = 3 stage-level handler catches + 2 helper catches (`SaveFeatureAsync` / `SaveStageAsync`).

## Behavior-contract drift (within planner tolerance)

- `openapi_json`, `features_proto_surface`, `ef_migrations_history`, `ef_schema_columns`, `feature_entity_shape`, `api_endpoint_matrix`: no diff.
- `grpc_status_code_emit_sites`: lines 33 → 26. All emission sites still inside `OneMoreTaskTracker.Features/Features/`. Set of distinct status codes unchanged: `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}`. `UpdateFeatureHandler.cs` lost its `NotFound` and `PermissionDenied` rows because those throw sites moved into `FeatureLoader.cs` / `FeatureOwnershipGuard.cs`. Plan §"Tolerance pinning — `grpc_status_code_emit_sites` will move" applies.
- `feature_inline_edit_log_format`: 6 templates (de-duped via `sort -u`) byte-identical; only the line-number prefixes shifted. Field names + template prefix preserved.
- `test_corpus_assertion_count`: 831 → 873 (strict superset, carried from iter-1; this iteration added zero test files). Plan §"Test-corpus assertion count is additive-only" applies.

## Handler-level subtleties preserved

- **Status codes**: each handler's specific 4xx-class status is preserved. `id <= 0` still throws `InvalidArgument`; load failure still throws `NotFound`; ownership failure still throws `PermissionDenied`; version mismatch / concurrent save both throw `AlreadyExists`.
- **Status detail strings**: byte-identical. `FeatureLoader` emits `"feature {id} not found"`; `FeatureOwnershipGuard` emits `"Not the feature owner"`; `FeatureVersionGuard` and `FeatureConcurrencySaver` emit `ConflictDetail.VersionMismatch(currentVersion)`.
- **Validation ordering**: id-validation → field-validation (title/description/lead) → load → ownership → version → mutate → save. This matches the baseline order; the only step relocated is "load" (now a method call), preserving the same observable sequence.
- **`+1` version-bump semantics**: leaf handlers continue to compute `versionBefore = feature.Version` and write `feature.Version = versionBefore + 1` themselves. Helpers only check / save / reload, never increment.
- **`UpdatedAt`**: still written by the leaf as `DateTime.UtcNow` (no clock injection in this iteration; that lives in a separate prior refactor on `main`).
- **Log lines**: kept leaf-side. Template text + structured field names byte-identical. Per `RF-001-07` recommendation, leaf-side logging stays until/unless centralisation drops the leaf to a single-field contribution.
- **`UpdateFeatureHandler` specifics**: this broad-PATCH handler had no `try/catch` at baseline (it never accepted `expectedVersion`), so it now uses `FeatureLoader` + `FeatureOwnershipGuard` only and keeps its raw `db.SaveChangesAsync`. The version-bump `+= 1` path is also absent there (broad PATCH does not bump). The `+= 2`/batching anti-pattern called out in the plan is therefore not reachable from this handler.

## Boy-Scout in-scope tightenings

- `UpdateFeatureHandler.cs`: removed three pre-existing comment blocks that referenced `spec 03 §170`, `api-contract.md v1`, `microservices/security.md`, and `microservices-contracts.md` — per project rule "minimize comments — never reference task IDs / spec sections / contract paths in code". Bounded to the method I was already editing.

## Deviations from `refactor-plan.md` §"Planned commits"

None. This is plan commit #2 verbatim. The new file `FeatureUpdateScaffolding.cs` proposed in plan commit #1 was already realised in iter-1 as four separate helpers (per one-type-per-file); this iteration consumes them.
