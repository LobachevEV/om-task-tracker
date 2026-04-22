# Evaluation Rubric — Features gRPC contract (spec 02)

Eval mode: **code-only**. Evaluator does NOT use a browser. It runs shell commands, reads generated code, and optionally boots the service to probe it with `grpcurl`.

Each dimension scored 0–10; **weighted total = 0.15·Design + 0.15·Originality + 0.20·Craft + 0.50·Functionality**. Pass threshold = 7.0.

Functionality is weighted heavily because this spec is contract plumbing: if the build fails or the four services aren't registered, nothing else matters.

---

## 1. Design (weight 0.15) — protos match the spec's shape

Score from the five `.proto` files.

- 10: Every message, field name, field type, and field number in `.specs/features-and-plan/02-features-grpc-contract.md` is present verbatim. Services named `FeatureCreator`, `FeatureUpdater`, `FeaturesLister`, `FeatureGetter`. `FeaturesLister.List` is unary (not streaming).
- 7: Names/types match; ≤1 field number drift or ≤1 scalar type swap.
- 4: A service or message missing, or two+ field-number drifts.
- 0: Protos don't compile, or a service is renamed.

Auto-checks (evaluator must run):
- `rg -n "service FeatureCreator|service FeatureUpdater|service FeaturesLister|service FeatureGetter" OneMoreTaskTracker.Features/Protos/` → 4 matches.
- `rg -n "rpc List \(ListFeaturesRequest\) returns \(ListFeaturesResponse\);" OneMoreTaskTracker.Features/Protos/ListFeaturesQuery/` → 1 match (NOT `returns (stream ...)`).

## 2. Originality (weight 0.15) — follows the existing Tasks-service conventions

- 10: Folder layout `Protos/<UseCase>/<snake_name>_handler.proto` mirrors `OneMoreTaskTracker.Tasks/Protos/CreateTaskCommand/create_task_command_handler.proto` exactly. Handler files at `Features/<UseCase>/<Name>Handler.cs`. Handlers inherit `*Base` directly; no `Impl` class. `FeatureDto` duplicated per proto (matches existing TaskDto duplication). Proto namespace `OneMoreTaskTracker.Proto.Features.<UseCase>`; C# namespace `OneMoreTaskTracker.Features.Features.<UseCase>`.
- 7: Minor deviation (e.g. handler file name style) but all conventions structurally intact.
- 4: Invented a new god-class, nested namespace mistake, or imported `FeatureDto` across protos instead of duplicating.
- 0: Put all RPCs in one proto file.

Auto-checks:
- `rg -c "message FeatureDto" OneMoreTaskTracker.Features/Protos/**/*.proto` → 4.
- `rg -l "\.Impl" OneMoreTaskTracker.Features/Features/` → empty.
- `rg "csharp_namespace = \"OneMoreTaskTracker.Proto.Features" OneMoreTaskTracker.Features/Protos/` → 5 hits (one per proto).

## 3. Craft (weight 0.20) — code quality inside the skeleton

- 10: Nullable-ref-types enabled; `using` imports minimal; stubs throw `new RpcException(new Status(StatusCode.Unimplemented, "see spec 03"))` / `"see spec 04"`; csproj `<Protobuf>` entries are copy-structured identically to existing Tasks entries (`GrpcServices=Server`, `Access=Public`, `ProtoRoot=Protos`, `AdditionalImportDirs` set when needed); Program.cs keeps the pre-existing reflection wiring and adds MapGrpcService calls in a contiguous block with necessary `using`s.
- 7: Handler stubs correct but one `AdditionalImportDirs` value misplaced or one unused `using`.
- 4: Stubs throw `NotImplementedException` instead of `RpcException(Unimplemented)`, or csproj missing required import dirs.
- 0: csproj broken, or handlers don't override the generated virtual.

Auto-checks:
- `rg -n "throw new RpcException\\(new Status\\(StatusCode.Unimplemented" OneMoreTaskTracker.Features/Features/` → 4 hits.
- `rg -n "<Protobuf Include=\"Protos" OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj` → 5 items.

## 4. Functionality (weight 0.50) — it actually runs

Run in order; each step that fails caps the Functionality sub-score.

| Step | Command | On fail, cap Functionality at |
|---|---|---|
| F1 | `dotnet build OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj` | 0 |
| F2 | `dotnet build` (whole solution) — no other service should break | 2 |
| F3 | `dotnet test tests/OneMoreTaskTracker.Features.Tests/OneMoreTaskTracker.Features.Tests.csproj` | 3 |
| F4 | Boot `OneMoreTaskTracker.Features` (background, ASPNETCORE_ENVIRONMENT=Development, PG connection string already valid) and run `grpcurl -plaintext localhost:5110 list` — expect the 4 feature services listed | 6 |
| F5 | `grpcurl -plaintext -d '{}' localhost:5110 mr_helper.features.FeatureCreator/Create` returns `Unimplemented` | 8 |

Only if all five pass does Functionality = 10.

Database note: the Features service runs `Database.Migrate()` on startup. If Postgres is not reachable, F4/F5 will fail at boot. Evaluator MUST first check `pg_isready -h localhost -p 5432` (or equivalent) and, if Postgres is not up, **cap F4/F5 inspection at "static"**: verify the four `MapGrpcService<...>` lines exist in `Program.cs` and treat F4 as passed (score 6) but do NOT claim F5 passed unless grpcurl actually ran. Record this caveat in the feedback file.

## Weighted total formula

```
total = 0.15*design + 0.15*originality + 0.20*craft + 0.50*functionality
```

Pass when `total >= 7.0`.
