# `OneMoreTaskTracker.Api` — CODEMAP

The REST / BFF gateway. Owns JWT issuance + validation, CORS, and all cross-service composition. Sibling gRPC services (`Users`, `Tasks`, `Features`, `GitLab.Proxy`) do not call each other directly; every multi-context request flows through a controller here.

Entry point: `OneMoreTaskTracker.Api/Program.cs`.

## Controllers

| Controller | File | Purpose |
|---|---|---|
| `AuthController` | `OneMoreTaskTracker.Api/Controllers/AuthController.cs` | `POST /api/auth/login`, `POST /api/auth/register`. Issues JWTs via `JwtTokenService`. |
| `TasksController` | `OneMoreTaskTracker.Api/Controllers/TasksController.cs` | `/api/tasks/*`. Per-user task listing, creation, state transitions, MR attach. Forwards to the Tasks service. |
| `TeamController` | `OneMoreTaskTracker.Api/Controllers/TeamController.cs` | `/api/team/*`. Roster lookups for the active manager. |
| `PlanController` | `OneMoreTaskTracker.Api/Controllers/PlanController.cs` | `/api/plan/*`. **Cross-service composition point** — fans out to Features + Tasks + Users. See below. |

### `PlanController` endpoints

| Method | Route | Upstreams |
|---|---|---|
| `GET` | `/api/plan/features` | `FeaturesLister.List` + `TaskLister.ListTasks` + (for managers) `UserService.GetTeamMemberIds` |
| `GET` | `/api/plan/features/{id}` | `FeatureGetter.Get` + `TaskLister.ListTasks` + `UserService.GetTeamRoster` |
| `POST` | `/api/plan/features` (Manager) | `FeatureCreator.Create` |
| `PATCH` | `/api/plan/features/{id}` (Manager) | `FeatureUpdater.Update` |
| `POST` | `/api/plan/features/{id}/tasks/{jiraId}` (Manager) | `FeatureGetter.Get` + `TaskFeatureLinker.Attach` |
| `DELETE` | `/api/plan/features/{id}/tasks/{jiraId}` (Manager) | `TaskFeatureLinker.Detach` + `FeatureGetter.Get` |

Roles are mirrored in `OneMoreTaskTracker.Api/Auth/Roles.cs` and enforced per-endpoint via `[Authorize(Roles = Roles.Manager)]`. The controller validates that the feature exists via `FeatureGetter.Get` before calling `TaskFeatureLinker.Attach`, because the Tasks DB has no cross-schema FK constraint.

## Middleware

- `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs` — single `catch (RpcException)` block at the top of the pipeline; translates gRPC status codes to HTTP:

| gRPC `StatusCode` | HTTP status | Response body |
|---|---|---|
| `InvalidArgument` | `400` | `{ "error": "Invalid request data" }` |
| `FailedPrecondition` | `422` | `{ "error": "Precondition failed" }` |
| `NotFound` | `404` | `{ "error": "Resource not found" }` |
| `AlreadyExists` | `409` | `{ "error": "Resource already exists" }` |
| `Unauthenticated` | `401` | `{ "error": "Authentication required" }` |
| `PermissionDenied` | `403` | `{ "error": "Permission denied" }` |
| `DeadlineExceeded` | `504` | `{ "error": "Request timed out" }` |
| `ResourceExhausted` | `429` | `{ "error": "Too many requests" }` |
| `Unavailable` | `502` | `{ "error": "Service temporarily unavailable" }` |
| _other_ | `502` | `{ "error": "Service error" }` |

The `FailedPrecondition → 422` row was added in spec 07 so detach-without-reassignment surfaces as Unprocessable Entity rather than a generic 502.

## gRPC clients (registered in `Program.cs`)

Tasks service (`TasksService:Address`):

- `TaskCreator.TaskCreatorClient`
- `TaskLister.TaskListerClient`
- `TaskGetter.TaskGetterClient`
- `TaskMover.TaskMoverClient`
- `TaskAggregateQuery.TaskAggregateQueryClient`
- `TaskFeatureLinker.TaskFeatureLinkerClient` — attach / detach task ↔ feature; consumed by `PlanController`.

Users service (`UsersService:Address`):

- `UserService.UserServiceClient`

Features service (`FeaturesService:Address`):

- `FeatureCreator.FeatureCreatorClient`
- `FeatureUpdater.FeatureUpdaterClient`
- `FeaturesLister.FeaturesListerClient`
- `FeatureGetter.FeatureGetterClient`

## Config

- `OneMoreTaskTracker.Api/appsettings.json` — `Jwt:Secret/Issuer/Audience`, `Cors:AllowedOrigins`, and the three upstream addresses:
  - `TasksService:Address`
  - `UsersService:Address`
  - `FeaturesService:Address` (default `http://localhost:5110`)
- `Program.cs` throws on boot if any address is missing, so misconfiguration fails fast.
