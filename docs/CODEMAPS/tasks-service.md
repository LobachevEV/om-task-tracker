# `OneMoreTaskTracker.Tasks` — CODEMAP

gRPC service that owns the **task aggregate** and its lifecycle. Tasks are associated to a feature via an opaque `FeatureId` cross-context FK; no DB-level FK is enforced across schemas — the gateway enforces feature existence.

Entry point: `OneMoreTaskTracker.Tasks/Program.cs`. Persistence: `OneMoreTaskTracker.Tasks/Tasks/Data/TasksDbContext.cs`.

## Entity

- `OneMoreTaskTracker.Tasks/Tasks/Data/Task.cs` — aggregate root.
  - `Id`, `JiraId` (required, `init`), `UserId` (`init`) — assignee FK into the Users context.
  - `FeatureId` — **non-nullable `int` FK** into the Features context. Mutated only via `AttachToFeature(int featureId)`, which rejects values `<= 0`. Because the column is non-nullable, detach semantics require a reassignment target rather than a clear.
  - `State` — private-setter int backing the `TaskState` enum (`NotStarted → InDev → MrToRelease → InTest → MrToMaster → Completed`).
  - `MergeRequests`, `GitRepos` — owned collections; mutated through `AddMr(IMrInfo)` and `AddProject(externalId, name)`, which also advance `State`.

## Handlers

| Handler | File | Role |
|---|---|---|
| `CreateTaskHandler` | `OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskHandler.cs` | Creates a task for the current assignee with an initial `FeatureId`. |
| `ListTasksHandler` | `OneMoreTaskTracker.Tasks/Tasks/List/ListTasksHandler.cs` | Role-aware listing — self tasks for devs/QA, team tasks for managers. |
| `GetTaskHandler` | `OneMoreTaskTracker.Tasks/Tasks/Get/GetTaskHandler.cs` | Single-task read, projects `MergeRequests` + `GitRepos`. |
| `GetAssigneeTaskSummaryHandler` | `OneMoreTaskTracker.Tasks/Tasks/AssigneeSummary/GetAssigneeTaskSummaryHandler.cs` | Per-assignee counts per state; consumed by the dashboard. |
| `AttachTaskToFeatureHandler` | `OneMoreTaskTracker.Tasks/Tasks/Attach/AttachTaskToFeatureHandler.cs` | Serves both the `Attach` and `Detach` RPCs on `TaskFeatureLinker`. `Detach` requires `reassign_to_feature_id > 0` and raises `FailedPrecondition` otherwise (see `GrpcExceptionMiddleware` → HTTP 422). |

Other state transitions (move-to-test, move-to-completed, add-MR, add-project) live inside `Task` itself and are exposed through the `TaskMover` / MR flows in the existing protos.

## Protos

Located under `OneMoreTaskTracker.Tasks/Protos/`. New in this wave:

- `OneMoreTaskTracker.Tasks/Protos/AttachTaskCommand/attach_task_command_handler.proto` — defines the `TaskFeatureLinker` service with `Attach(AttachTaskToFeatureRequest)` and `Detach(DetachTaskFromFeatureRequest)`, both returning `AttachTaskToFeatureResponse`. Consumed by `OneMoreTaskTracker.Api.Controllers.PlanController` via `TaskFeatureLinker.TaskFeatureLinkerClient`.

Existing protos (unchanged by this wave but listed for navigation):

- `OneMoreTaskTracker.Tasks/Protos/CreateTaskCommand/create_task_command_handler.proto`
- `OneMoreTaskTracker.Tasks/Protos/ListTasksQuery/list_tasks_query_handler.proto`
- `OneMoreTaskTracker.Tasks/Protos/GetTaskQuery/get_task_query_handler.proto`
- `OneMoreTaskTracker.Tasks/Protos/MoveTaskCommand/move_task.proto`
- `OneMoreTaskTracker.Tasks/Protos/TaskAggregateQuery/assignee_task_summary.proto`
- `OneMoreTaskTracker.Tasks/Protos/task_state.proto`
- `OneMoreTaskTracker.Tasks/Protos/Clients/...` — outbound contracts into `GitLab.Proxy` (mr, branches, projects, events).

## Lifecycle (state machine)

From `CLAUDE.md`:

```
NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED
```

Transitions are embedded in `Task.AddMr` / `Task.AddProject` and the `TaskMover` handler. `AttachToFeature` never mutates `State`; the two concerns are orthogonal.

## Where it plugs into the rest of the system

- Inbound: only `OneMoreTaskTracker.Api` (`TasksController`, `PlanController`) calls this service.
- Outbound: `OneMoreTaskTracker.GitLab.Proxy` via the `Protos/Clients/*` contracts, for MR and project enrichment.
- Cross-context FK: `Task.FeatureId` references `OneMoreTaskTracker.Features.Feature.Id` — see [features-service.md](./features-service.md) and [api-gateway.md](./api-gateway.md).
