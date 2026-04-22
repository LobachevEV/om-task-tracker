# Iteration 1 — Evaluation

## Environment
- Postgres: DOWN (neither `pg_isready` available nor `/dev/tcp/localhost/5432` reachable; F4/F5 capped at static verification per rubric §4 database note)
- .NET SDK: 10.0.105

## Dimension scores

### Design: 10/10
- 4 service declarations found, one per handler proto, all under the expected paths:
  - `FeatureCreator` @ `Protos/CreateFeatureCommand/create_feature_command_handler.proto:7`
  - `FeatureUpdater` @ `Protos/UpdateFeatureCommand/update_feature_command_handler.proto:7`
  - `FeaturesLister` @ `Protos/ListFeaturesQuery/list_features_query_handler.proto:7`
  - `FeatureGetter`  @ `Protos/GetFeatureQuery/get_feature_query_handler.proto:7`
- `FeaturesLister.List` is **unary** (`rpc List (ListFeaturesRequest) returns (ListFeaturesResponse);`) — not streaming. ✅
- Field-number comparison vs spec 02 (§§71, 113, 147, 175): every message, field name, scalar type and field number matches verbatim.
  - `CreateFeatureRequest` (1..6), `FeatureDto` (1..10), `UpdateFeatureRequest` (1..7), `ListFeaturesRequest` (1..3), `ListFeaturesResponse.features = 1`, `GetFeatureRequest.id = 1` — all correct.
- `FeatureState` enum: generator mirrored `task_state.proto` (shares ordinals with the C# enum, no `_UNSPECIFIED = 0`). Spec 02 §67 explicitly sanctions this branch and directs us to replicate `task_state.proto`; gan-harness spec.md §28 reinforces it. Not a drift.
- Proto package `mr_helper.features;` on every file. ✅

### Originality: 10/10
- Folder layout mirrors Tasks exactly: `Protos/<UseCase>/<snake_name>_handler.proto`; handler files at `Features/<UseCase>/<Name>Handler.cs`.
- Handlers inherit `*Base` directly (`FeatureCreator.FeatureCreatorBase`, etc.), no god-class `Impl` — `grep .Impl Features/` returns empty.
- `FeatureDto` is **duplicated** per proto that returns it (4 copies across Create, Update, List, Get) — matches the existing `TaskDto` duplication style that the gan-harness binding override requires. No cross-proto imports of `FeatureDto`.
- `csharp_namespace` values: `OneMoreTaskTracker.Proto.Features` for `feature_state.proto`; `OneMoreTaskTracker.Proto.Features.<UseCase>` for the other four. ✅
- C# handler namespaces: `OneMoreTaskTracker.Features.Features.<UseCase>`. ✅

### Craft: 9/10
- Nullable ref types + implicit usings enabled in csproj. ✅
- Handler stubs throw exactly `new RpcException(new Status(StatusCode.Unimplemented, "see spec 03"|"see spec 04"))` — 4 hits, spec-aligned messages (Create/Update → 03, List/Get → 04).
- 5 `<Protobuf>` entries, each with `GrpcServices=Server`, `Access=Public`, `ProtoRoot=Protos`. `AdditionalImportDirs=Protos` on the four use-case protos (needed because each imports `feature_state.proto` via its root-relative name). `feature_state.proto` itself correctly omits `AdditionalImportDirs` as it has no imports. Matches the gan-harness binding override §27 exactly.
- `Program.cs`: reflection preserved (`if (app.Environment.IsDevelopment()) app.MapGrpcReflectionService();`), then 4 contiguous `MapGrpcService<>` calls with the required `using`s. `Database.Migrate()` still runs on startup (carried over from spec 01).
- Handlers use file-scoped namespaces and minimal `using`s — no dead imports.
- Test file is self-contained: constructs handlers directly + a local `FakeServerCallContext` rather than booting `WebApplicationFactory<Program>`. This is a deliberate deviation from spec 02 §285 wording ("via a hosted `WebApplicationFactory<Program>` gRPC call") with a clear comment explaining that the `Database.Migrate()` call in `Program.cs` would force a live-DB dependency into an otherwise hermetic contract test. Pragmatic and well-justified, but still counts as a minor spec deviation — hence 9 instead of 10.

### Functionality: 8/10 (capped by PG_DOWN)
- **F1** — `dotnet build OneMoreTaskTracker.Features` → `Build succeeded. 0 Warning(s) 0 Error(s)`. ✅
- **F2** — `dotnet build` (whole solution) → all 10 projects build, 0 warnings, 0 errors. No other service regressed. ✅
- **F3** — `dotnet test tests/OneMoreTaskTracker.Features.Tests` → `Passed: 6, Failed: 0, Skipped: 0, Total: 6` in 221 ms. (6 not 4 because the test project also picks up prior fixture tests; the 4 new `HandlerRegistrationTests` facts are all green.) ✅
- **F4** — Postgres DOWN; per rubric cap at static verification. Confirmed the 4 `app.MapGrpcService<...>()` lines at `Program.cs:30-33` and `app.MapGrpcReflectionService()` at `Program.cs:28`. Treated as passed (sub-score 6 floor lifted).
- **F5** — NOT executed (no grpcurl run because the service would fail to boot on `Database.Migrate()`). Cannot claim passed → Functionality capped at 8 per the table.

## Weighted total: 8.8 / 10

Formula: `0.15*10 + 0.15*10 + 0.20*9 + 0.50*8 = 1.5 + 1.5 + 1.8 + 4.0 = 8.8`

## Pass/Fail vs threshold 7.0
**PASS** (8.8 ≥ 7.0)

## Top issues to fix next iteration
1. **F5 unverified.** Whenever a Postgres instance is reachable (or when spec 01's `Database.Migrate()` is made optional / guarded behind a feature flag in test harnesses), rerun the grpcurl probe: `grpcurl -plaintext -d '{}' localhost:5110 mr_helper.features.FeatureCreator/Create` must return `Unimplemented`. Right now we only have indirect evidence (the xUnit facts) that each base class is wired correctly.
2. **Minor deviation from spec 02 §285 wording on tests.** The spec asks for `WebApplicationFactory<Program>`-based assertions; the generator instead instantiates handlers directly with a `FakeServerCallContext`. The rationale (avoid pulling in `Database.Migrate()` for a contract-only test) is sound, but the gap means we aren't exercising DI registration in the same way a hosted test would. Consider either (a) adding an `ASPNETCORE_FEATURES_SKIP_MIGRATE` env var in Program.cs to allow a hermetic `WebApplicationFactory<Program>` test in addition to the direct-instantiation tests, or (b) updating spec 02 to codify direct-instantiation as the canonical style.
3. **`AdditionalImportDirs` divergence from literal spec 02 §217 XML.** Spec 02's csproj snippet lists e.g. `Protos;Protos/CreateFeatureCommand` on Update/List/Get to support the `import "CreateFeatureCommand/create_feature_command_handler.proto"` for the shared `FeatureDto`. The generator (correctly, per the binding override in gan-harness spec.md §27) duplicated `FeatureDto` and reduced the import dirs to just `Protos`. Not a bug, but it's the most likely place a future reader will be confused. Worth a short comment in the csproj or a spec-02 footnote calling out the override.

## Commands run (trimmed)

```
$ ls OneMoreTaskTracker.Features/Protos/
CreateFeatureCommand  GetFeatureQuery  ListFeaturesQuery  UpdateFeatureCommand  feature_state.proto

$ ls OneMoreTaskTracker.Features/Features/
Create  Data  Get  List  Update

$ grep -rn "service Feature..." Protos/  (via Grep tool)
→ 4 hits (FeatureCreator, FeatureUpdater, FeaturesLister, FeatureGetter)

$ grep "rpc List" Protos/ListFeaturesQuery/
→ rpc List (ListFeaturesRequest) returns (ListFeaturesResponse);   # unary

$ grep -c "message FeatureDto" Protos/**/*.proto
→ 4 (one per use-case proto; none in feature_state.proto)

$ grep "csharp_namespace" Protos/
→ 5 hits matching rubric (Proto.Features for state, Proto.Features.<UseCase> for others)

$ grep "throw new RpcException(new Status(StatusCode.Unimplemented" Features/
→ 4 hits (Create→spec 03, Update→spec 03, List→spec 04, Get→spec 04)

$ grep "<Protobuf Include=\"Protos" OneMoreTaskTracker.Features.csproj
→ 5 items (feature_state + 4 use-case protos)

$ grep "app.MapGrpcService|MapGrpcReflectionService" Program.cs
Program.cs:28  app.MapGrpcReflectionService();
Program.cs:30  app.MapGrpcService<CreateFeatureHandler>();
Program.cs:31  app.MapGrpcService<UpdateFeatureHandler>();
Program.cs:32  app.MapGrpcService<ListFeaturesHandler>();
Program.cs:33  app.MapGrpcService<GetFeatureHandler>();

$ grep -l ".Impl" Features/
(empty — no god-class)

$ (echo > /dev/tcp/localhost/5432) ; echo PG_DOWN
PG_DOWN

$ dotnet --version
10.0.105

$ dotnet build OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj
Build succeeded.  0 Warning(s)  0 Error(s)

$ dotnet build  (solution)
10 projects built.  0 Warning(s)  0 Error(s)

$ dotnet test tests/OneMoreTaskTracker.Features.Tests/OneMoreTaskTracker.Features.Tests.csproj
Passed!  - Failed: 0, Passed: 6, Skipped: 0, Total: 6, Duration: 221 ms
```
