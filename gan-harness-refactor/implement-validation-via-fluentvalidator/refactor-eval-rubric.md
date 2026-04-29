# Refactor Eval Rubric — implement-validation-via-fluentvalidator

Track: backend

Canonical weights live in `GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`. Do not duplicate weights here. The orchestrator inlines that sub-section when this rubric is consumed.

Behavior preservation is a **gate**, not a weighted score: drift in the captured behavior contract forces auto-fail regardless of the weighted total. See `GAN-FEATURE-SHARED.md` §"Refactor auto-fail triggers".

## Criterion meanings (source-of-truth pointers)

- `code_quality_delta` — readability, coupling, duplication, dead code, dependency removal, file-size targets. Source of truth: the MUST-improve axes table in `refactor-plan.md` (axes 1–7). Each axis must move toward its target; regression on any axis caps this score at 4.
- `integration_and_conventions` — follows existing patterns; no new utilities duplicating existing ones; lint clean; no new TODO/FIXME introduced; imports stay within established module boundaries; **C# code style + microservice contract vocabulary rules in `~/.claude/rules/csharp/coding-style.md` and `~/.claude/rules/microservices/contracts.md`**; **one-type-per-file** and **minimize-comments** project instincts (see `refactor-plan.md` §"Feature-specific addenda").
- `test_coverage_delta` — coverage on touched files MUST be ≥ baseline (drop > 2% is auto-fail per SHARED §"Refactor auto-fail triggers"). New `*ValidatorTests.cs` files for the validators introduced under axis 3 earn points. Existing handler tests that previously asserted on inline-throw `Status.Detail` strings MUST still pass byte-identically — that is also where the behavior gate gets its teeth.
- `perf_envelope` — no regression on the perf signal pinned in `refactor-plan.md`. BE: p50 + p95 of `dotnet test` total elapsed (soft signal, planner-pinned ±10%/±20%). FluentValidation runs sync rules in-process; no DB / I/O per validation call. A regression beyond the pinned tolerance is auto-fail.

## Behavior-preservation gate (PRESERVED VERBATIM)

Diff baseline `behavior-contract.json` against re-captured contract from the iteration's HEAD:

- Backend: public API surface diff (proto + openapi.json + db migrations), endpoint behavior matrix diff, **gRPC `(StatusCode, Detail)` tuple diff** (per the `validation_test_assertions` surface — every previously-asserted error string MUST still be emittable byte-identically by the post-refactor service).

The 12 captured surfaces:

| # | Surface id | Tolerance | Gate behavior |
|---|------------|-----------|----------------|
| 1 | `openapi` | exact | Any byte diff → auto-fail. |
| 2 | `proto_features` | exact | Any byte diff → auto-fail. |
| 3 | `proto_tasks` | exact | Any byte diff → auto-fail. |
| 4 | `proto_users` | exact | Any byte diff → auto-fail. |
| 5 | `rpc_error_surface_users` | exact | **Drift ALLOWED** per migration-parity exception in `refactor-plan.md` §"Behavior preservation envelope" — line count + locations may change as throws move out of handler files into a translator/decorator. The semantic `(StatusCode, Detail)` tuple SET MUST be unchanged (enforced via surface 12 + axis 9). |
| 6 | `rpc_error_surface_tasks` | exact | Same as 5 (drift ALLOWED via the same exception). |
| 7 | `rpc_error_surface_features` | exact | Same as 5 (drift ALLOWED via the same exception). The legacy `FeatureValidation.cs` deletion will cause this surface to lose 4 lines; the corresponding throws must reappear (composed via `ValidationFailure.ErrorMessage`) elsewhere in the service so that surface 12's diff is empty. |
| 8 | `db_migrations_features` | exact | Any byte diff → auto-fail. |
| 9 | `db_migrations_tasks` | exact | Any byte diff → auto-fail. |
| 10 | `db_migrations_users` | exact | Any byte diff → auto-fail. |
| 11 | `endpoint_matrix_api` | exact | Any byte diff → auto-fail. |
| 12 | `validation_test_assertions` | exact | Any byte diff → auto-fail. This surface captures the literal asserted strings in test code. If a generator changes a test assertion to make it pass, this surface breaks → auto-fail. The intent: the test corpus is the wire-level contract for validator-driven errors; tests cannot be relaxed. |

Any non-empty diff (after applying the planner-pinned migration-parity exceptions on surfaces 5–7) → emit `BEHAVIOR_DRIFT=true` → auto-fail.

## Feature-specific addenda

- **Validator class hygiene**: every `*Validator.cs` file MUST declare exactly one top-level public type (axis 4). Aggregator files are a `code_quality_delta` cap-at-4 trigger and an `integration_and_conventions` deduction.
- **Throw-site discipline**: zero `throw new RpcException` lines may remain inside any file matching `*Validator.cs` or `*Validation.cs` (axis 1). One occurrence is auto-fail-grade for `code_quality_delta` (the entire point of this refactor is that the throw leaves the validator). The evaluator runs the axis-1 source-of-truth command at every iteration and treats a non-zero count as a hard auto-fail trigger in addition to the SHARED triggers.
- **DI registration**: each in-scope service's `Program.cs` MUST contain at least one `services.AddValidatorsFromAssembly*` or `services.AddScoped<IValidator<...>, ...>` call (axis 6). Missing registration on any of the three services → `integration_and_conventions` score capped at 5.
- **Translator determinism**: when multiple validation failures fire, the composed `Status.Detail` MUST be deterministic across runs (planner-pinned to `string.Join("; ", failures.Select(f => f.ErrorMessage))` in `refactor-plan.md` §"Planned commits" (a)). Non-determinism (e.g. ordering depending on hash-set iteration order) is a `code_quality_delta` deduction AND triggers the behavior-preservation gate the moment a multi-failure test snapshots a particular ordering.
- **Status-code preservation for non-`InvalidArgument` validators**: the `DetachTaskFromFeatureRequest.ReassignToFeatureId` rule MUST emit `FailedPrecondition`, not `InvalidArgument`, on failure — preserving the baseline wire contract. The planner-pinned mechanism is `RuleFor(...).WithState(StatusCode.FailedPrecondition)` consumed by the translator. Any other rule that needs a non-default status code MUST use the same mechanism. Hard-coding `InvalidArgument` for every translated `ValidationFailure` is a behavior-preservation gate failure.
- **Sibling test rule (axis 10)**: every `*Validator.cs` file produced MUST have a sibling `*ValidatorTests.cs` test file under `tests/<service>.Tests/`. Missing sibling test → `test_coverage_delta` cap-at-4 + the SHARED ">2% coverage drop on touched files" auto-fail trigger may also bite. The rubric prioritises the SHARED trigger (auto-fail) over the cap-at-4 deduction.
