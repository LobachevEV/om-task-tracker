# Refactor Plan — per-request-datetime-provider

Track: backend
Baseline SHA: b96117ef27e9f4aab5b6176520825d864157b4b6
Planner-version: 1

## Goals

- Every production read of "now" inside a single gRPC/HTTP request observes the SAME `DateTime` value, captured once at the start of the request and reused for every subsequent timestamp written in that scope (audit fields, `UpdatedAt`, lookback computations).
- Deterministic timestamps under test: production code reaches "now" through an injectable abstraction so tests substitute a fake clock instead of relying on wall-clock proximity assertions.
- Direct `DateTime.UtcNow` calls in production code paths under refactor go to zero (JWT expiration on the security boundary is intentionally pinned out of scope; see Scope boundary).

## Target axes (MUST-improve)

Each axis must have a measurable baseline number AND a target. Anything unmeasurable does not belong here. All commands run from `$PROJECT_ROOT`.

| Axis | Baseline | Target | Source-of-truth | Final (HEAD `1dffdda`) |
|------|----------|--------|-----------------|------------------------|
| Direct `DateTime.UtcNow` / `DateTimeOffset.UtcNow` reads in in-scope production code (excludes `OneMoreTaskTracker.Api/Auth/JwtTokenService.cs` per MUST-NOT-touch; excludes `tests/**`, `bin/**`, `obj/**`) | 10 | 0 | `grep -rEn 'DateTime(Offset)?\.UtcNow' OneMoreTaskTracker.Features OneMoreTaskTracker.Api/Controllers OneMoreTaskTracker.Api/Middleware --include='*.cs' \| wc -l` | **0** — TARGET MET |
| Handlers / controllers that previously read `DateTime.UtcNow` and now depend on the injected request-clock abstraction (CreateFeatureHandler, PatchFeatureHandler, PatchFeatureStageHandler, DevFeatureSeeder, TasksController) | 0 | 5 | `grep -rEln 'IRequestClock\b' OneMoreTaskTracker.Features/Features OneMoreTaskTracker.Api/Controllers --include='*.cs' \| sort -u \| wc -l` | **7** — over-target (5 real consumers + 2 impl files; semantic real-consumer count = 5, exactly the planner's intent — see RF-002-01) |
| Entity types whose default initializer reads `DateTime.UtcNow` (Feature, FeatureStagePlan) — must drop to 0; callers pass `now` explicitly via object-initializer or factory | 2 | 0 | `grep -E 'DateTime\.UtcNow' OneMoreTaskTracker.Features/Features/Data/Feature.cs OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs \| wc -l` | **0** — TARGET MET |
| Per-request-capture invariant covered by an integration test (one request → two clock reads → identical `DateTime`) | 0 tests | ≥ 1 test | `grep -rEln 'IRequestClock.*same\|capture.*once\|PerRequest.*Same' tests --include='*.cs' \| wc -l` | **1** — TARGET MET (`tests/OneMoreTaskTracker.Api.Tests/Time/RequestClockScopeIntegrationTests.cs`; matches via load-bearing `PerRequestSame` + `captures "now" once` header comment) |
| Unit-test coverage for the `RequestClock` implementation itself (capture-once semantics, idempotence under re-read, distinct values across distinct scopes) | 0 tests | ≥ 3 test methods (one per service that registers the clock — Features + Api — plus the cross-scope distinctness test in whichever side hosts the unit) | `grep -rEn '\[Fact\]\|\[Theory\]' tests --include='*RequestClock*Tests.cs' \| wc -l` | **6** — over-target (4 unit `[Fact]` across Features+Api `RequestClockTests.cs` + 2 integration `[Fact]` in `RequestClockScopeIntegrationTests.cs`) |
| `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` | 0 errors | 0 errors | `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` | **0 errors / 0 warnings** — TARGET MET |
| `dotnet test OneMoreTaskTracker.slnx --nologo` test count | baseline tests captured at b96117e (`baseline-tests.json`) | ≥ baseline; zero previously-passing tests turn red | `dotnet test OneMoreTaskTracker.slnx --nologo --logger:"console;verbosity=normal"` | **472 / 472 pass, 0 failed** (Tasks 68 + Users 45 + Features 118 + GitLab.Proxy 63 + Api 178; +6 vs baseline 466) |

## MUST-NOT-touch

Hard boundary. Edits to these files / surfaces are auto-fail regardless of test status.

- `OneMoreTaskTracker.Api/Auth/JwtTokenService.cs` — JWT issuance is on the security boundary; consistent with the prior consolidate-feature-update-handlers refactor's MUST-NOT-touch list (memory: project_consolidate_feature_update_handlers_shipped). The remaining `DateTime.UtcNow` on line 40 stays.
- `OneMoreTaskTracker.Api/Auth/JwtOptions.cs` and the `AddAuthentication` / `AddJwtBearer` configuration block in `OneMoreTaskTracker.Api/Program.cs` — same security pin.
- `OneMoreTaskTracker.Api/openapi.json` — frozen public REST contract; the refactor does not change the wire surface.
- `OneMoreTaskTracker.Features/Protos/**/*.proto` — frozen gRPC contract.
- `OneMoreTaskTracker.Features/Migrations/**` — schema is frozen. `CreatedAt` / `UpdatedAt` columns stay `timestamp with time zone NOT NULL`. No new migration in this refactor.
- `OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs` — entity configuration only changes if entity property surface changes (it must not — see migration parity).
- `OneMoreTaskTracker.GitLab.Proxy/**`, `OneMoreTaskTracker.Tasks/**`, `OneMoreTaskTracker.Users/**` — out of refactor scope; they have zero in-scope `DateTime.UtcNow` sites in production code anyway.
- `OneMoreTaskTracker.WebClient/**` — frontend untouched.
- `compose.yaml`, all `Dockerfile`s, all `appsettings*.json` — infrastructure is frozen.
- `tests/**/DateTime.UtcNow` reads — test-side clock reads are legitimate fixture data; do not migrate them. New tests for the new abstraction MAY use `FakeTimeProvider`.

## Behavior preservation envelope

References `behavior-contract.md` + `behavior-contract.json` (captured at b96117e on 2026-04-29).

Pinned tolerances and parity claims:

- **`openapi_json` surface**: exact byte parity. The REST surface does not change.
- **`features_proto_surface`**: exact byte parity. Proto definitions are frozen.
- **`feature_entity_shape`**: exact parity on the public-property shape (names, getter/setter/init access, types, ordering). The default-initializer expression on `CreatedAt` / `UpdatedAt` is NOT part of the public-shape grep — it is implementation detail. The capture command pipes the `grep -nE` output through `sed -E 's/(\}[[:space:]]*)=[[:space:]]*[^;]+;/\1;/'` to strip any trailing `= <expr>;` default-initializer suffix that would otherwise show up on the matched line, so removing `= DateTime.UtcNow` does not register as drift. Hardened on iter-3 after the original capture — which used `grep -nE` alone — was discovered to capture the entire matched line including the default-initializer suffix; see run.log "RF-002-03 fix".
- **`ef_migrations_history`** + **`ef_schema_columns`**: exact byte parity. **Migration parity claim: no schema changes.** Column types, nullability, defaults, and indexes are unchanged.
- **`api_endpoint_matrix`**: exact byte parity. Routes, HTTP verbs, `[Authorize]` policies, and `[AllowAnonymous]` markers are unchanged.
- **`jwt_claims_and_expiration_shape`**: exact byte parity. JWT issuance code is in MUST-NOT-touch — this surface is a guard against accidental edits.
- **`test_corpus_assertion_count`**: total `Should*/Be*/Equal/Throw/...` assertion count across `tests/**`. **Pre-pinned migration-parity exception (lesson from prior refactor):** strict-superset additive drift is acceptable — i.e. the count MAY rise (new tests for `RequestClock` and the per-request-capture integration test will add assertions) but MUST NOT fall. The evaluator is instructed to treat "new captured count ≥ baseline captured count" as parity for this surface only. No existing assertion may be deleted or reworded.
- **BE perf envelope**: this refactor does not introduce hot-path work. The injected clock adds a single property read per call. No load-test sampling is performed; the implicit envelope is "no regression visible to baseline tests" (test wall-clock duration not asserted, but a wholesale slowdown would be evident).
- **Persisted-data shape**: no schema changes. `CreatedAt` / `UpdatedAt` columns continue to receive a `DateTime` written by EF Core; the value source moves from the entity's default initializer to the handler's request-scoped clock, but the wire-level value (UTC kind, monotone within a request) is preserved.

## Scope boundary

In scope:

- `OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs` (line 27 `var now = DateTime.UtcNow;`).
- `OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs` (line 35).
- `OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs` (line 56).
- `OneMoreTaskTracker.Features/Features/Data/Feature.cs` (lines 18–19 — `CreatedAt`/`UpdatedAt` default initializers).
- `OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs` (lines 22–23 — same).
- `OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs` (line 90).
- `OneMoreTaskTracker.Features/Program.cs` — DI registration of `IRequestClock` + `TimeProvider` for the Features service.
- `OneMoreTaskTracker.Api/Controllers/Tasks/TasksController.cs` (lines 70 + 77).
- `OneMoreTaskTracker.Api/Program.cs` — DI registration of `IRequestClock` + `TimeProvider` for the Api service. The `JwtTokenService` registration line stays untouched.
- `OneMoreTaskTracker.Api.csproj` and `OneMoreTaskTracker.Features.csproj` — package reference for `Microsoft.Extensions.TimeProvider.Testing` (test-time only via the test projects' csproj; production projects need only the BCL `TimeProvider` which ships in net10.0).
- `tests/OneMoreTaskTracker.Features.Tests/OneMoreTaskTracker.Features.Tests.csproj` and `tests/OneMoreTaskTracker.Api.Tests/OneMoreTaskTracker.Api.Tests.csproj` — package reference for `Microsoft.Extensions.TimeProvider.Testing` to enable `FakeTimeProvider`.
- New files: `OneMoreTaskTracker.Features/Features/Data/IRequestClock.cs`, `OneMoreTaskTracker.Features/Features/Data/RequestClock.cs`, `OneMoreTaskTracker.Api/Time/IRequestClock.cs`, `OneMoreTaskTracker.Api/Time/RequestClock.cs` (per-bounded-context, per project rules — no shared infrastructure project). One type per file.
- New tests: `tests/OneMoreTaskTracker.Features.Tests/Features/RequestClockTests.cs`, `tests/OneMoreTaskTracker.Api.Tests/Time/RequestClockTests.cs`, plus one integration test (Features side preferred) asserting that two `_clock.GetUtcNow()` calls inside a single scoped DI scope return the same `DateTime`.

Out of scope (pinned for follow-up `/gan-refactor` runs):

- `OneMoreTaskTracker.Api/Auth/JwtTokenService.cs:40` — JWT `expires` calculation. Migrating this requires careful coordination with the `ValidateLifetime` clock on the bearer middleware; pin as a separate refactor with a tighter security review.
- `OneMoreTaskTracker.Users` and `OneMoreTaskTracker.Tasks` services — they contain zero production-code `DateTime.UtcNow` sites at b96117e, so no work is needed today. If future code in those services adds clock reads, a follow-up `/gan-refactor` extends the pattern.
- `OneMoreTaskTracker.GitLab.Proxy` — no production-code sites; no work.
- Test-side `DateTime.UtcNow` reads (22 sites across `tests/**`) — these are legitimate fixture/assertion data, not production paths.

## Planned commits

Rough sequence the generator should follow. The generator may split or merge commits, but should not reorder past a commit that changes a "public" boundary (entity construction shape).

1. **Introduce the abstraction in both bounded contexts.** Add `IRequestClock` + `RequestClock` (one type per file) inside `OneMoreTaskTracker.Features/Features/Data/` and `OneMoreTaskTracker.Api/Time/`. Both implementations wrap an injected `TimeProvider` (BCL) and lazily capture `_capturedNow` on first read; subsequent reads in the same scope return the same value. Register `services.AddSingleton<TimeProvider>(TimeProvider.System);` and `services.AddScoped<IRequestClock, RequestClock>();` in each service's `Program.cs`. Add unit tests for the `RequestClock` (capture-once, distinct-across-scopes). No call sites change yet — build stays green.
2. **Migrate Features handler-local clock reads.** Inject `IRequestClock` into `CreateFeatureHandler`, `PatchFeatureHandler`, `PatchFeatureStageHandler` constructors; replace `var now = DateTime.UtcNow;` with `var now = _clock.GetUtcNow();`. Existing handler tests continue to pass (they construct handlers via the test container or directly — pass a fake `IRequestClock` implementation in unit tests; `FakeTimeProvider` in integration tests).
3. **Migrate the entity default initializers.** Remove `= DateTime.UtcNow` from `Feature.CreatedAt` / `Feature.UpdatedAt` and `FeatureStagePlan.CreatedAt` / `FeatureStagePlan.UpdatedAt`. Callers (`CreateFeatureHandler`, `DevFeatureSeeder`, `PatchFeatureStageHandler` where `FeatureStagePlan` is materialised) supply `CreatedAt = now, UpdatedAt = now` explicitly via the `init` setters. Update `DevFeatureSeeder.SeedAsync` to receive an `IRequestClock` (Features `Program.cs` resolves it from the seed scope).
4. **Migrate the gateway controller.** Inject `IRequestClock` into `TasksController` constructor; replace both `DateTime.UtcNow` reads on lines 70 and 77 with `_clock.GetUtcNow()`. Update `TasksController` tests to pass a fake.
5. **Add the per-request-capture integration test.** In Features tests (preferred, since it's the heavier service), spin up a `WebApplicationFactory<Program>`-style scope, resolve `IRequestClock` twice from the same scope, advance `FakeTimeProvider` between the two reads, assert the two reads return the same `DateTime`. Resolve `IRequestClock` from a fresh scope, assert it now returns a different value (the advanced one). This is the canonical proof that the abstraction does what the brief promised.
6. **Cleanup.** Re-grep for `DateTime.UtcNow` across in-scope paths; assert zero matches (excluding MUST-NOT-touch). Run `dotnet build` + `dotnet test` for a final green pass.

## Feature-specific addenda

**Why `TimeProvider` + a thin `IRequestClock`, not just `TimeProvider` directly.**
`TimeProvider` is a singleton in the standard registration pattern. The brief explicitly requires PER-REQUEST capture (one timestamp held for the duration of the request, not "the system clock at any moment"). A scoped `IRequestClock` that lazily captures on first read and memoises until the scope is disposed is the smallest abstraction that delivers the per-request invariant while still leaning on `TimeProvider` underneath (so `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing` remains the test substitution point). This two-layer pattern is well-established in the .NET ecosystem and is not a custom invention.

**Why not a shared infrastructure project.**
Per project rules ("bounded-context isolation: each service registers its own `IRequestClock`. Don't introduce a shared infrastructure project unless the planner explicitly justifies it"), `IRequestClock` is duplicated — one in `OneMoreTaskTracker.Features`, one in `OneMoreTaskTracker.Api`. The duplication is two ~15-line files; introducing a shared `OneMoreTaskTracker.Common` project to dedupe them would couple deployment lifecycles for a trivial saving. Each service owns its own copy.

**Pre-pinned: test-corpus assertion-count is additive-only.**
The `test_corpus_assertion_count` surface in `behavior-contract.json` will rise when the new tests land. The Behavior preservation envelope above pins this as an acceptable strict-superset drift. The evaluator is instructed (via that section) to treat "new ≥ baseline" as parity for that one surface. Every other surface is exact-byte parity.

**One type per file (project rule).**
`IRequestClock` (interface), `RequestClock` (implementation) are separate files — even though they form a 2-line / 15-line pair. Same for any new test class.

**Zero comments (project rule).**
The new `RequestClock` implementation needs no inline commentary. The capture-once semantics are obvious from the code shape (one nullable backing field, one lazy assignment). The `IRequestClock` interface needs no XML doc.

**No log-only locals (project rule).**
None of the new code introduces a `DateTime` variable solely to feed a log statement. `var now = _clock.GetUtcNow();` is functional — it's then assigned to entity fields, returned from handlers, etc.
