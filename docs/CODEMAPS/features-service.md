# `OneMoreTaskTracker.Features` — CODEMAP

gRPC service that owns the **feature aggregate**: identity, description, planning dates (`planned_start`, `planned_end`), lead, manager, and the feature lifecycle (`CsApproving → Development → Testing → EthalonTesting → LiveRelease`). Backed by its own PostgreSQL schema (`features`) and migrated on startup. The only caller is `OneMoreTaskTracker.Api.Controllers.PlanController`; sibling services do not call it east-west.

## Entry point

- `OneMoreTaskTracker.Features/Program.cs` — wires `FeaturesDbContext` (Npgsql, pooled), registers the 4 handlers, maps gRPC reflection in `Development`, and runs `Database.Migrate()` on boot.

## Domain

- `OneMoreTaskTracker.Features/Features/Data/Feature.cs` — the aggregate root. `Id`, `Title`, `Description?`, `State` (int-backed), `PlannedStart/End` (nullable `DateOnly`), `LeadUserId`, `ManagerUserId`, `CreatedAt`, `UpdatedAt`.
- `OneMoreTaskTracker.Features/Features/Data/FeatureState.cs` — enum ordinals that share wire values with the `feature_state.proto` enum (no `UNSPECIFIED` member).
- `OneMoreTaskTracker.Features/Features/Data/FeaturesDbContext.cs` — single `DbSet<Feature>`; god node for this service.

## Contract (proto files)

| Proto file | RPC service | RPC |
|---|---|---|
| `OneMoreTaskTracker.Features/Protos/CreateFeatureCommand/create_feature_command_handler.proto` | `FeatureCreator` | `Create` |
| `OneMoreTaskTracker.Features/Protos/UpdateFeatureCommand/update_feature_command_handler.proto` | `FeatureUpdater` | `Update` |
| `OneMoreTaskTracker.Features/Protos/ListFeaturesQuery/list_features_query_handler.proto` | `FeaturesLister` | `List` |
| `OneMoreTaskTracker.Features/Protos/GetFeatureQuery/get_feature_query_handler.proto` | `FeatureGetter` | `Get` |
| `OneMoreTaskTracker.Features/Protos/feature_state.proto` | — | shared `FeatureState` enum |

## Handlers

| Handler | File | gRPC status codes raised |
|---|---|---|
| Create | `OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs` | `InvalidArgument` (title missing, manager id missing, bad date format, start-after-end) |
| Update | `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs` | `NotFound` (unknown id), `InvalidArgument` (title missing, unknown state enum, bad date) |
| List   | `OneMoreTaskTracker.Features/Features/List/ListFeaturesHandler.cs` | (propagates DB errors; no domain validations) |
| Get    | `OneMoreTaskTracker.Features/Features/Get/GetFeatureHandler.cs` | `NotFound` (unknown id) |

All handlers derive from the generated `*.Base` class, use `Mapster` to project `Feature` → proto DTO, and pass the ambient `ServerCallContext.CancellationToken` into EF Core. Update intentionally does not mutate `ManagerUserId` — ownership transfer is out of scope.

## Mapping + validation

- `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` — `TypeAdapterConfig` for `Feature` → the four per-RPC `FeatureDto`s, centralising `DateOnly?` → ISO-8601 string coercion and `State` → proto enum cast. Registered once from `Program.cs`.
- `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs` — `ParseOptionalDate(input, fieldName)` and `ValidateDateOrder(start, end)` helpers that throw `RpcException(InvalidArgument, ...)` with the offending field name. Shared by Create and Update.

## Schema

- `OneMoreTaskTracker.Features/Migrations/20260422084830_InitialCreate.cs` — initial migration creating the `features` schema, the `Features` table, and its indexes.
- `OneMoreTaskTracker.Features/Migrations/FeaturesDbContextModelSnapshot.cs` — EF Core model snapshot.

The schema is isolated from `tasks` and `users`. There are no DB-level FK constraints across schemas — the link from `Task.FeatureId` to `Feature.Id` is enforced at the application boundary by `PlanController` / `AttachTaskToFeatureHandler`.

## Where it plugs into the rest of the system

`OneMoreTaskTracker.Api.Controllers.PlanController` is the only consumer of this service. It injects four generated clients (`FeatureCreator.FeatureCreatorClient`, `FeatureUpdater.FeatureUpdaterClient`, `FeaturesLister.FeaturesListerClient`, `FeatureGetter.FeatureGetterClient`, all registered in `OneMoreTaskTracker.Api/Program.cs` against the `FeaturesService:Address` config) and composes feature data with tasks + user roster to build `FeatureSummaryResponse` / `FeatureDetailResponse` for the `/api/plan/*` endpoints. `Task.FeatureId` is an opaque cross-context FK owned by `OneMoreTaskTracker.Tasks` — see [tasks-service.md](./tasks-service.md).
