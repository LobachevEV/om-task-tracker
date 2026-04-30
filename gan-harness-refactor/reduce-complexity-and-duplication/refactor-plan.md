# Refactor Plan — reduce-complexity-and-duplication

Track: backend
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa
Planner-version: 1

## Goals

- Collapse the seven near-identical `Update*Handler` classes in `OneMoreTaskTracker.Features` onto a single shared scaffolding (load + manager-auth + version + concurrent-save + log + adapt + build-stage-plans), so each per-field handler reads as just "what to mutate" plus "what to log".
- Eliminate the per-FeatureDto-target duplication in `PlanMapper` and `FeatureMappingConfig` by replacing the N hand-written overload/registration blocks with a single generic projection or registration helper that runs once per target type.
- Single-source the `ExtractDisplayName` helper and the gateway's two `yyyy-MM-dd` date parsers — they currently exist as two definitions each within the gateway's own bounded context.

## Target axes (MUST-improve)

Each axis has a measurable baseline number AND a target. Anything unmeasurable does not belong here. All commands run from `$PROJECT_ROOT` (the worktree).

| Axis | Baseline | Target | Source-of-truth |
|------|----------|--------|-----------------|
| Total LoC across the seven inline-edit handlers (`UpdateFeatureTitleHandler.cs`, `UpdateFeatureDescriptionHandler.cs`, `UpdateFeatureLeadHandler.cs`, `UpdateStageOwnerHandler.cs`, `UpdateStagePlannedStartHandler.cs`, `UpdateStagePlannedEndHandler.cs`, `UpdateFeatureHandler.cs`) | 493 | ≤ 320 (≥ 35% reduction) | `wc -l OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedStartHandler.cs OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedEndHandler.cs OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs \| awk '/total/ {print $1}'` |
| Number of literal copies of the manager-ownership guard expression `request.CallerUserId <= 0 \|\| feature.ManagerUserId != request.CallerUserId` across `Features/Features/Update/*.cs` | 7 | 1 (single shared site, e.g. on a base class / pipeline component) | `grep -rEn 'request\.CallerUserId <= 0 \\\|\\\| feature\.ManagerUserId != request\.CallerUserId' OneMoreTaskTracker.Features/Features --include='*.cs' \| wc -l \| tr -d ' '` |
| Number of `catch (DbUpdateConcurrencyException)` blocks across `Features/Features/Update/*.cs` | 6 | ≤ 2 (one per category: feature-level vs stage-level retry; stretch target = 1) | `grep -rEn 'catch \(DbUpdateConcurrencyException\)' OneMoreTaskTracker.Features/Features --include='*.cs' \| wc -l \| tr -d ' '` |
| `MapSummary` overload count in `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` | 10 | 1 (a single generic / interface-bridged projection) | `grep -cE 'internal static FeatureSummaryResponse MapSummary\(' OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` |
| `TypeAdapterConfig<Feature, ...>.NewConfig()` blocks in `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` | 10 | 1 driver (a single shared mapping action invoked per target type, or a single `NewConfig()` block reused via reflection / partial-class bridging) | `grep -cE 'TypeAdapterConfig<Feature, [^>]+>\.NewConfig\(\)' OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` |
| Distinct `ExtractDisplayName` definitions in the gateway (`OneMoreTaskTracker.Api/**/*.cs`) | 2 | 1 (single helper consumed by `PlanMapper`, `FeaturesController`, `TeamController`) | `grep -rEn 'static[[:space:]]+string[[:space:]]+ExtractDisplayName' OneMoreTaskTracker.Api --include='*.cs' \| wc -l \| tr -d ' '` |
| Distinct `DateOnly.TryParseExact(... "yyyy-MM-dd" ...)` call sites in the gateway (`OneMoreTaskTracker.Api/**/*.cs`) | 2 | 1 (single shared helper; `PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate` collapse onto one) | `grep -rEn 'DateOnly\.TryParseExact\([^,]+,[[:space:]]*\"yyyy-MM-dd\"' OneMoreTaskTracker.Api --include='*.cs' \| wc -l \| tr -d ' '` |
| `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` | 0 errors / 0 warnings | 0 errors / 0 warnings | `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` |
| `dotnet test OneMoreTaskTracker.slnx --nologo` regression count | 0 regressed | 0 regressed (test count MAY rise; new tests for the extracted scaffolding are welcome) | `node ~/.claude/scripts/gan-feature/check-baseline-tests.mjs --mode compare --feature-dir gan-harness-refactor/reduce-complexity-and-duplication --runners gan-harness-refactor/reduce-complexity-and-duplication/runners.json --side backend --project-root <worktree>` |

Measurement notes:
- LoC counts include the file's namespace/using lines so a "split into two smaller files" tactic still has to come in under the budget.
- The "1 driver" target on `FeatureMappingConfig` is satisfied either by a single shared action invoked in a loop over `(targetType, mappingFn)` pairs, OR by collapsing onto a single `NewConfig` block via the `csharp-proto-domain-interface` partial-class technique. Both are scored as "1 driver".
- The `MapSummary` axis tolerates the generator splitting the projection into `MapSummary<T>(T, ...)` plus a private extract-fields helper; what's banned is repeating the body for each target type.

## MUST-NOT-touch

Hard boundary. Edits to these files / surfaces are auto-fail regardless of test status.

- `OneMoreTaskTracker.Features/Protos/**/*.proto` — frozen gRPC contract. The whole point of the refactor is that consumers see no wire change.
- `OneMoreTaskTracker.Api/openapi.json` — frozen REST contract (hand-rolled per project memory `project_openapi_hand_rolled`; drift-sensitive).
- `OneMoreTaskTracker.Tasks/Protos/**/*.proto`, `OneMoreTaskTracker.Users/Protos/**/*.proto`, `OneMoreTaskTracker.GitLab.Proxy/Protos/**/*.proto` — frozen.
- `OneMoreTaskTracker.Features/Migrations/**`, `OneMoreTaskTracker.Tasks/Migrations/**`, `OneMoreTaskTracker.Users/Migrations/**` — schema is frozen. No new migration in this refactor.
- `OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs` — entity configuration only changes if the entity public-property surface changes (it must not).
- `OneMoreTaskTracker.Api/Auth/JwtTokenService.cs`, `OneMoreTaskTracker.Api/Auth/JwtOptions.cs`, and the `AddAuthentication` / `AddJwtBearer` configuration block in `OneMoreTaskTracker.Api/Program.cs` — security boundary; pinned out per recurring repo policy.
- `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs` — this is the gateway's single error-translation point; touching it changes how every controller surfaces errors (`microservices/composition.md` § "Upstream-error translation is centralized"). It happens to look "ripe" for cleanup but is a public-error-shape boundary; out of scope here.
- Anything under `OneMoreTaskTracker.WebClient/` — backend-only refactor.
- Any `appsettings*.json`, `compose.yaml`, `Dockerfile`, `*.slnx`, `*.csproj` — infrastructure. (Generator MAY add a new file under an existing csproj's compile globs without editing the csproj.)
- Test files asserting an exact `RpcException` `StatusCode` value (e.g. `StatusCode.PermissionDenied`, `StatusCode.AlreadyExists`, `StatusCode.NotFound`) or an exact `Status.Detail` substring — those assertions encode the public contract surface this refactor must preserve.
- Existing log-message text (`"Feature inline edit applied: ..."`) — captured as a behavior surface; the structured fields named after the new pipeline MUST remain the same identifiers and produce semantically equivalent values.

## Behavior preservation envelope

References `behavior-contract.md` + `behavior-contract.json` (captured at 935dc9a on 2026-04-29).

Pinned tolerances and parity claims:

- **`openapi_json` surface**: exact byte parity. The REST surface does not change.
- **`features_proto_surface`**: exact byte parity. Proto definitions are frozen.
- **`feature_entity_shape`**: exact parity on the public-property shape (names, getter/setter/init access, types, ordering). Default initializer expressions on `CreatedAt` / `UpdatedAt` are stripped from the captured line by the same `sed` filter the prior `per-request-datetime-provider` refactor introduced — implementation detail of the entity is not part of the captured surface.
- **`ef_migrations_history`** + **`ef_schema_columns`**: exact byte parity. **Migration parity claim: no schema changes.** Column types, nullability, defaults, and indexes are unchanged.
- **`api_endpoint_matrix`**: exact byte parity. Routes, HTTP verbs, `[Authorize]` policies, and `[AllowAnonymous]` markers are unchanged.
- **`grpc_status_code_emit_sites`**: exact byte parity on the per-file × per-status-code occurrence histogram. The status code emitted from each handler file MUST match. (The shared scaffolding may centralize the `throw`, but the resulting per-file emission count must remain — this is encoded by the surface command counting per-file occurrences. If the generator collapses to a base class, individual handler files lose their emission counts; this is by design — the refactor is allowed to centralize provided the **set** of distinct status codes emitted across `Features/Features` stays exactly `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists, FailedPrecondition}`. **Tolerance pin:** treat the surface as parity if the unique set of status codes (right-hand column after `::`) is unchanged, even if the per-file file-name column shifts. The diff script's `exact` comparator may flag this surface; the evaluator treats movement of a status-code emission from a leaf handler into a single shared scaffolding file as parity for this surface only.
- **`feature_inline_edit_log_format`**: exact byte parity on the log message templates currently emitted by the seven update handlers. The shared scaffolding MUST emit the same `"Feature inline edit applied: feature_id=... field=... ... actor_user_id=... version_before=... version_after=..."` shape with the same structured-field names (`{FeatureId}`, `{Stage}` where applicable, `{ActorUserId}`, `{V0}`/`{V1}` or `{SV0}`/`{SV1}`). Field-specific bullets (`title_len_before`, `description_length`, `lead_before`, `old_value`, `new_value`) are produced via a per-field bullet contributed by the leaf handler — i.e. the leaf's only contribution to the log line is the field-specific value, not the surrounding scaffolding. **Tolerance pin:** the captured surface uses `sort` on the log lines; if the generator inlines the scaffolding into a single `LoggerMessage`-style template that still emits the same fields with the same names but in a slightly different order, the evaluator accepts the diff as parity provided the union of field names per category (feature-level vs stage-level) is unchanged.
- **`test_corpus_assertion_count`**: total `Should*/Be*/Equal/Throw/...` assertion count across `tests/**`. **Pre-pinned migration-parity exception (carried over from `per-request-datetime-provider`):** strict-superset additive drift is acceptable — the count MAY rise (new tests for the extracted scaffolding are welcome) but MUST NOT fall. No existing assertion may be deleted or reworded.
- **BE perf envelope**: this refactor does not introduce hot-path work or extra DB calls. Each per-field handler still does exactly one `db.Features.Include(StagePlans).FirstOrDefault` + one `db.SaveChanges`. No load-test sampling is performed; the implicit envelope is "no regression visible to baseline tests" (test wall-clock duration not asserted, but a wholesale slowdown would be evident).
- **Persisted-data shape**: no schema changes. `Feature.Version` and `FeatureStagePlan.Version` continue to bump by exactly +1 per per-field PATCH; `UpdatedAt` continues to receive a `DateTime` written by EF Core. The shared scaffolding MUST preserve the +1 increment semantics — going to `+= 2` or batching would silently break the optimistic-concurrency contract.

## Scope boundary

In scope:

- **Features service inline-edit handlers** (the highest-leverage target):
  - `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs`
  - `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs`
  - `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs`
  - `OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs`
  - `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedStartHandler.cs`
  - `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedEndHandler.cs`
  - `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs` (broad PATCH; the `+= 1` version-bump path here is independent of the per-field path but the auth + adapt + build-stage-plans postlude is shared)
  - One new file: `OneMoreTaskTracker.Features/Features/Update/FeatureUpdateScaffolding.cs` (or a similar single-purpose name) — owns the load + auth + concurrent-save + adapt + log scaffolding. **One type per file** (project rule).
  - DI registration in `OneMoreTaskTracker.Features/Program.cs` if the scaffolding is registered as a service. (The `AddAuthentication` block is in MUST-NOT-touch; the rest of `Program.cs` may be edited only to wire the new scaffolding.)
- **Gateway mappers**:
  - `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` — collapse the ten `MapSummary` overloads onto one generic projection. The `csharp-proto-domain-interface` skill (`partial class FeatureDto : ISomeMappingProjection`) is the .NET-canonical mechanism; the generator MAY introduce one `partial class` file per proto namespace under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/` (or similar) to declare `FeatureDto : IFeatureSummaryProjection` without touching the generated code.
  - `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` — collapse the 10 `NewConfig` blocks onto one driver (loop over target types OR partial-class bridge).
- **Gateway helpers (single-source)**:
  - `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs` — replace the local `ExtractDisplayName` with the shared one.
  - `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` — donate `ExtractDisplayName` to a shared place (e.g. `OneMoreTaskTracker.Api/Controllers/PlanRequestHelpers.cs` or a new sibling) that both gateways import. Or move it onto `MiniTeamMember` mapping at the bridge layer.
  - Collapse `PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate` onto one helper that both date-validation paths consume. The current double-definition violates DRY within a single bounded context.
- **New tests, optional** (additive only): a small unit test on the new scaffolding asserting (a) auth rejection, (b) concurrent-save retry, (c) version-bump = +1, (d) log shape. These ride for free since the new scaffolding is the only pre-existing untested branch the refactor introduces.

Out of scope (pinned for follow-up `/gan-refactor` runs):

- **`GrpcExceptionMiddleware`** and the `ConflictDetail.VersionMismatch` / `ConflictDetail.StageOrderOverlap` envelope — touched-by-everything but is the gateway's single public-error-shape contract surface (see MUST-NOT-touch). A separate refactor can simplify the `|conflict=` separator → typed object once we have a contract test that pins it.
- **Cross-bounded-context date-validation dedup** between `PlanMapper.ValidateOptionalReleaseDate` (gateway) and `FeatureValidation.ParseOptionalDate` (Features). The two-line duplication crosses a bounded-context boundary; per `microservices/contracts.md` and the project's own bounded-context rule, the right fix is "they're allowed to differ" — each owns its own validation idiom — not "introduce a shared infrastructure project". A follow-up can lift `FeatureValidation.ParseOptionalDate` to use `DateOnly`'s built-in error rather than the custom message.
- **`FeatureValidation.ValidateStageOrder` / `ValidateStagePlans`** — already a clean static helper; the duplication is only in CALLERS (handlers re-build the snapshot list). Improvable but small leverage; pin for later.
- **`UserServiceHandler.Register/Authenticate/GetTeamRoster/DeleteUser`** — 181 lines, mixes validation + DB IO + BCrypt + role logic. A real cleanup target but spans a different bounded context (Users) and would require capturing a separate behavior surface for the auth flow. Pin for a dedicated `/gan-refactor` slug — would compound badly with the Features-side refactor in one iteration.
- **`TasksController` lookback / `TasksControllerTests`** — uses `DateTime.UtcNow` directly; this is the same call-site issue the prior `per-request-datetime-provider` refactor resolved on `main`, but on this baseline (935dc9a, branched before that work) it's still raw. Pin as a separate refactor — compounding clock injection with the duplication-removal in one iteration is too risky.
- **`PlanController` (831 lines)** in the Stages directory — large but its bulk is the StagePlans GET composition logic, not duplicated branches. The single-method complexity is high; that's a "split into focused handlers" refactor, semantically distinct from "remove copy-paste" and should ride a separate iteration.
- **Dev-only `DevFeatureSeeder`** — uses `DateTime.UtcNow` for seed data; not a duplication target.

## Planned commits

Rough sequence the generator should follow. The generator may split or merge commits, but should not reorder past a commit that changes a "public" cross-handler boundary (the scaffolding contract). Each commit must leave `dotnet build` + `dotnet test` green.

1. **Introduce the inline-edit scaffolding.** Add `OneMoreTaskTracker.Features/Features/Update/FeatureUpdateScaffolding.cs` (or two: one for feature-level, one for stage-level — one type per file). Owns: id-validation, manager-ownership guard, optional `expectedVersion` / `expectedStageVersion` check, the EF concurrent-save try/catch, the `Adapt<TFeatureDto>` + `BuildProtoStagePlans` postlude, and a delegated structured-log emit. Include the unit tests for the scaffolding (auth rejection, version mismatch shape, concurrent-save retry, +1 increment, log shape). No call sites change yet — build stays green.
2. **Migrate the four feature-level inline-edit handlers** (`UpdateFeatureTitleHandler`, `UpdateFeatureDescriptionHandler`, `UpdateFeatureLeadHandler`, plus the broad-PATCH `UpdateFeatureHandler`'s shared postlude) onto the scaffolding. Each handler shrinks to a small "what to mutate + what to log" delegate. Existing handler tests continue to pass. After this commit, axes 1–3 are partially met.
3. **Migrate the three stage-level inline-edit handlers** (`UpdateStageOwnerHandler`, `UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`). The `RecomputeFeatureDates` step + the per-stage version increment ride on a stage-level overload of the scaffolding (or on a small `IStageMutator` pluggable). Existing tests continue to pass. After this commit, axes 1–3 are fully met.
4. **Collapse `PlanMapper.MapSummary` overloads.** Introduce a partial-class bridge per proto FeatureDto namespace (`OneMoreTaskTracker.Api/Controllers/Plan/Bridges/<Namespace>FeatureDto.cs`) declaring `partial class FeatureDto : IFeatureSummaryProjection` per the `csharp-proto-domain-interface` skill. Replace the ten `MapSummary` overloads with one `MapSummary(IFeatureSummaryProjection f, ...)`. Build + test green. Axis 4 met.
5. **Collapse `FeatureMappingConfig.Register` `NewConfig` blocks.** Either via a loop over `(targetType, registrationAction)` pairs or via the same partial-class bridging on the Features side. Build + test green. Axis 5 met.
6. **Single-source `ExtractDisplayName` and gateway date-parsing.** Move `ExtractDisplayName` onto `PlanRequestHelpers` (or a sibling `DisplayName` helper); delete the duplicate in `TeamController`. Collapse `PlanMapper.ValidateOptionalReleaseDate` + `PlanRequestHelpers.TryParseIsoDate` onto a single helper that both consumers call. Build + test green. Axes 6–7 met.
7. **Cleanup.** Re-grep all axes; assert each target hit. Run `dotnet build` + full `dotnet test` for a final green pass. Re-capture the behavior contract; diff against baseline; assert the only drifts are within the documented tolerance pins above.

## Feature-specific addenda

**Why a base class / shared scaffolding rather than middleware.**
gRPC interceptors run before the handler decides what entity to load and what fields to mutate; the scaffolding here needs the loaded entity and the mutated entity. Code-level scaffolding (a base class, an extension method on `FeaturesDbContext`, or a local pipeline helper) keeps the handler's "what to mutate" logic readable while centralising the unrelated load + auth + save + log work. Per project rules this is NOT a "speculative shared infrastructure project" — the scaffolding lives in the same `OneMoreTaskTracker.Features/Features/Update/` folder as its consumers.

**Why partial-class bridging for the proto FeatureDto fan-out.**
The 10 `MapSummary` overloads exist because each PATCH command's proto file generates its own `FeatureDto` class in its own C# namespace. They have identical public properties (`Id`, `Title`, `Description`, `State`, `PlannedStart`, `PlannedEnd`, `LeadUserId`, `ManagerUserId`, `Version`, `StagePlans`) but no shared interface. The user-global `csharp-proto-domain-interface` skill is the canonical .NET fix: declare `partial class FeatureDto : IFeatureSummaryProjection` in a single bridge file per namespace, so a single generic `MapSummary(IFeatureSummaryProjection)` consumes all ten. This is exactly the pattern recommended by the user's own rules at `~/.claude/rules/microservices/contracts.md` § "Generated transport types do not leak into domain".

**Why `FeatureMappingConfig.Register` is the same problem in disguise.**
The 10 `NewConfig` blocks exist because Mapster requires one registration per target type. Same root cause as the gateway `MapSummary` fan-out, same fix: an interface bridge collapses the registration to one block, OR a loop over target types invokes a shared registration action. Either is acceptable — the axis counts driver blocks, not technique.

**Tolerance pinning — `grpc_status_code_emit_sites` will move.**
Captured at baseline as a per-file × per-status-code histogram. After the refactor, three or four of the seven status-code emissions move from leaf handlers into the shared scaffolding file. The behavior preservation envelope above pins this as expected: the **set** of distinct status codes emitted across `Features/Features` MUST stay `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists, FailedPrecondition}`, but the per-file column may shift. Evaluator: treat per-file movement WITHIN `OneMoreTaskTracker.Features/Features` as parity for this surface only; movement OUTSIDE that subtree is drift.

**Tolerance pinning — `feature_inline_edit_log_format` will reorder.**
Captured as the seven log lines, sorted. After the refactor, log emission likely moves from per-handler `LogInformation` calls onto a single emit in the scaffolding, with the field-specific bullet contributed by the leaf. The structured field names (`{FeatureId}`, `{Stage}`, `{ActorUserId}`, `{V0}`, `{V1}`, `{SV0}`, `{SV1}`) are pinned; the surrounding template text is pinned at "Feature inline edit applied: feature_id=... field=... actor_user_id=...". Evaluator: treat field-name preservation + template-prefix preservation as parity even if the fields appear in a slightly different order.

**Test-corpus assertion count is additive-only** (carried over from prior refactors).
The new scaffolding tests will add assertions. The Behavior preservation envelope above pins this as acceptable strict-superset drift. No existing assertion may be deleted.

**One type per file, no comments, no log-only locals** (project rules).
The new scaffolding file holds exactly one type. The new partial-class bridge files (one per proto namespace) hold exactly one declaration each. None of the new code introduces a variable solely to feed a `LogInformation` call.
