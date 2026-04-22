# GAN Harness Spec — Features gRPC contract (spec 02)

Source of truth: `.specs/features-and-plan/02-features-grpc-contract.md`.
This file is a pointer — the generator and evaluator MUST read the source spec verbatim.

## Brief

Implement `.specs/features-and-plan/02-features-grpc-contract.md`:

- Add 5 proto files under `OneMoreTaskTracker.Features/Protos/`:
  - `feature_state.proto` (shared enum)
  - `CreateFeatureCommand/create_feature_command_handler.proto` (service `FeatureCreator`, `FeatureDto` defined here)
  - `UpdateFeatureCommand/update_feature_command_handler.proto` (service `FeatureUpdater`)
  - `ListFeaturesQuery/list_features_query_handler.proto` (service `FeaturesLister`, unary)
  - `GetFeatureQuery/get_feature_query_handler.proto` (service `FeatureGetter`)
- Add 4 handler stubs inheriting directly from the generated `*Base` class, each throwing `RpcException(StatusCode.Unimplemented, "see spec 0{3,4}")`:
  - `Features/Create/CreateFeatureHandler.cs`
  - `Features/Update/UpdateFeatureHandler.cs`
  - `Features/List/ListFeaturesHandler.cs`
  - `Features/Get/GetFeatureHandler.cs`
- Add `<Protobuf>` items to `OneMoreTaskTracker.Features.csproj` with `GrpcServices=Server`, `ProtoRoot=Protos`, `Access=Public`, and `AdditionalImportDirs` as specified.
- Wire `app.MapGrpcService<Handler>()` lines into `Program.cs` (4 calls).
- Add `tests/OneMoreTaskTracker.Features.Tests/HandlerRegistrationTests.cs` — single xUnit fact per handler asserting `Unimplemented` status via a hosted `WebApplicationFactory<Program>` gRPC call.

## Existing-codebase conventions (binding overrides where spec 02 is ambiguous)

1. **`FeatureDto` layout.** The existing Tasks service *duplicates* `TaskDto` inside each proto that uses it (see `OneMoreTaskTracker.Tasks/Protos/CreateTaskCommand/create_task_command_handler.proto:25` and `.../ListTasksQuery/list_tasks_query_handler.proto:21`). Spec 02 § "Update" says: "Pick whichever the existing codebase already uses for TaskDto". **Therefore duplicate `FeatureDto` into each proto that returns it** (`CreateFeatureCommand`, `UpdateFeatureCommand`, `ListFeaturesQuery`, `GetFeatureQuery`). Do NOT import across protos. Adjust the `.csproj` accordingly: `AdditionalImportDirs` is only needed for the `feature_state.proto` cross-reference and therefore is just `Protos` for every file.
2. **`FeatureState` proto enum ordinals.** Spec 02 §47 notes the C# enum in spec 01 starts at 0 = `CsApproving`. The spec tolerates either approach; replicate whatever `task_state.proto` does. (Generator must grep `task_state.proto` and mirror its style.)
3. **Handler-as-service.** Each handler inherits directly from the generated base — no `Impl` class, no DI constructor in this spec (added in 03/04).
4. **Namespaces.**
   - Proto `csharp_namespace = "OneMoreTaskTracker.Proto.Features.<UseCase>"`
   - `feature_state.proto` uses `OneMoreTaskTracker.Proto.Features` (no sub-namespace)
   - Proto `package mr_helper.features;`
   - C# handler namespace: `OneMoreTaskTracker.Features.Features.<UseCase>`
5. **Program.cs.** Wire the four handlers with `app.MapGrpcService<Handler>()`. Keep `MapGrpcReflectionService()` call so `grpcurl list` works in Development.

## Acceptance (verbatim from spec 02)

- `dotnet build OneMoreTaskTracker.Features` succeeds.
- Starting the service and running `grpcurl -plaintext localhost:5110 list` returns (in addition to reflection):
  - `mr_helper.features.FeatureCreator`
  - `mr_helper.features.FeatureUpdater`
  - `mr_helper.features.FeaturesLister`
  - `mr_helper.features.FeatureGetter`
- Any of the four RPCs, invoked via grpcurl, returns `Unimplemented`.
- `dotnet test tests/OneMoreTaskTracker.Features.Tests` passes.
- No other service's compilation is affected.

## Out of scope

- Attach/detach RPCs (spec 05, Tasks service).
- Gateway REST layer (spec 07).
- Handler bodies (specs 03, 04).
