<!-- Generated: 2026-04-03 | Files scanned: 50+ | Token estimate: ~1200 -->

# OneMoreTaskTracker Backend Services Codemap

**Last Updated:** 2026-04-03
**Services:** 5 services (3 gRPC, 1 REST gateway, 1 CLI), 1 Domain library

## Service Architecture

### 1. OneMoreTaskTracker.GitLab.Proxy (gRPC Bridge Service)

**Purpose:** Translate gRPC calls into GitLab REST API requests, returning streams of results.

**Port:** 5176 (HTTP/2 with gRPC)
**Entry:** `/OneMoreTaskTracker.GitLab.Proxy/Program.cs`

#### Handler Classes

| Handler               | Proto Service     | Method                                                             | File                               |
|-----------------------|-------------------|--------------------------------------------------------------------|------------------------------------|
| `FindMrHandler`       | `MrFinder`        | `Find(FindMrRequest) → stream FindMrResponse`                      | `/Services/FindMrHandler.cs`       |
| `CreateMrHandler`     | `MrCreator`       | `Create(stream CreateMrRequest) → stream CreateMrResponse`         | `/Services/CreateMrHandler.cs`     |
| `MergeMrService`      | `MrMerger`        | `Merge(stream MergeMrRequest) → stream MergeMrResponse`            | `/Services/MergeMrService.cs`      |
| `FindEventsHandler`   | `EventsFinder`    | `Find(FindEventsRequest) → stream FindEventsResponse`              | `/Services/FindEventsHandler.cs`   |
| `GetProjectHandler`   | `ProjectGetter`   | `Get(GetProjectQuery) → GetProjectResponse`                        | `/Services/GetProjectHandler.cs`   |
| `CreateBranchHandler` | `BranchesCreator` | `Create(stream CreateBranchRequest) → stream CreateBranchResponse` | `/Services/CreateBranchHandler.cs` |

#### Proto Files

```
/Protos/
├── MergeRequests/
│   ├── mr_finder.proto        (Find service: search MRs by state/labels)
│   ├── mr_creator.proto       (Create service: create new MRs)
│   └── mr_merger.proto        (Merge service: merge open MRs)
├── Branches/
│   └── branches_creator.proto (Create branches from base)
├── Events/
│   └── events_finder.proto    (Find push events by user/task)
└── Projects/
    └── project_getter.proto   (Get project by ID)
```

#### Dependencies
- `IGitLabApiClient` — HTTP client wrapper (Dependency Injection)
- `ILogger<T>` — Structured logging

#### Configuration
- `appsettings.json`: `GitLab:BaseUrl`, `GitLab:Token`
- Environment: HTTP/2, gRPC reflection enabled in Development

---

### 2. OneMoreTaskTracker.Tasks (Task Management gRPC Service)

**Purpose:** Manage task lifecycle (DB persistence), query MRs/projects, emit task state changes.

**Port:** 5102 (HTTP/2 with gRPC)
**Entry:** `/OneMoreTaskTracker.Tasks/Program.cs`
**Database:** PostgreSQL `Tasks` (via Entity Framework Core, with migrations)

#### Handler Classes

| Handler             | Proto Service | Method                                                  | File                                 |
|---------------------|---------------|---------------------------------------------------------|--------------------------------------|
| `CreateTaskHandler` | `TaskCreator` | `Create(CreateTaskRequest) → stream CreateTaskResponse` | `/Tasks/Create/CreateTaskHandler.cs` |
| `GetTaskHandler`    | `TaskGetter`  | `Get(GetTaskRequest) → GetTaskResponse`                 | `/Tasks/Get/GetTaskHandler.cs`       |
| `ListTasksHandler`  | `TaskLister`  | `ListTasks(ListTasksRequest) → ListTasksResponse`       | `/Tasks/List/ListTasksHandler.cs`    |

#### Create Task Flow
```csharp
// File: /Tasks/Create/CreateTaskHandler.cs
public override async Task Create(CreateTaskRequest, IServerStreamWriter<CreateTaskResponse>, ServerCallContext)
  1. Create Task (class) with JiraId, State=NOT_STARTED
  2. Save to DB, send CreateTaskResponse
  3. Find opened MRs via IMrsProvider.Find(jiraId, CancellationToken)
  4. For each MR: task.AddMr(mr) → state machine updates State by TargetBranch
  5. If no MRs found: search projects via IProjectsProvider
  6. Stream responses for each discovery phase
```

#### Task State Machine (encapsulated in Task class)

State is encapsulated in `Task.AddMr()` and `Task.AddProject()` methods (not external logic):

```csharp
// State transitions via AddMr (determined by TargetBranch):
NotStarted  + dev→release MR  → MrToRelease
NotStarted  + release→master MR → MrToMaster
MrToMaster  + dev→release MR  → MrToRelease  // downgrade: found earlier-stage MR
NotStarted  + project found   → InDev         // via AddProject
```

#### Get Task Flow
```csharp
// File: /Tasks/Get/GetTaskHandler.cs
public override async Task<GetTaskResponse> Get(GetTaskRequest, ServerCallContext)
  1. Find opened MRs for taskId → if found, return state from task.AddMr
  2. Else Get(userId, taskId, firstPushDate) → projects, State=IN_DEV or NOT_STARTED
```

#### Proto Files

```
/Protos/
├── task_state.proto              (Enum: NOT_STARTED, IN_DEV, MR_TO_RELEASE, IN_TEST, MR_TO_MASTER, COMPLETED)
├── CreateTaskCommand/
│   └── create_task_command_handler.proto  (TaskCreator service)
├── GetTaskQuery/
│   └── get_task_query_handler.proto       (TaskGetter service)
├── ListTasksQuery/
│   └── list_tasks_query_handler.proto     (TaskLister service)
└── MoveTaskCommand/
    └── move_task.proto           (TaskMover service for state transitions)
```

#### Database Context

**File:** `/Tasks/Data/TasksDbContext.cs`

```csharp
public class TasksDbContext : DbContext
{
    public DbSet<Task> Tasks { get; set; }
    public DbSet<GitRepo> GitRepos { get; set; }
    public DbSet<MergeRequest> MergeRequests { get; set; }
}

// Task is a CLASS (not record) — encapsulates state machine mutations
public class Task
{
    public int Id { get; init; }
    public required string JiraId { get; init; }
    public int State { get; private set; }  // Mutated via AddMr / AddProject
    public List<MergeRequest> MergeRequests { get; init; } = [];
    public List<GitRepo> GitRepos { get; init; } = [];

    public void AddMr(IMrInfo mr) { /* state machine transition by TargetBranch */ }
    public void AddProject(GitRepo repo) { /* sets InDev if no MRs yet */ }
}

public record GitRepo
{
    public int Id { get; init; }
    public int ExternalId { get; init; }  // GitLab project ID
    public int TaskId { get; init; }
    public required string Name { get; init; }
    public required string Link { get; init; }
}

public record MergeRequest
{
    public int Id { get; init; }
    public int TaskId { get; init; }           // Explicit FK (added)
    public int ExternalProjectId { get; init; }  // GitLab project ID
    public int ExternalId { get; init; }         // GitLab MR IID
    public required string Title { get; init; }
    public required string Link { get; init; }
    public string[] Labels { get; init; } = [];
}
```

#### Providers

| Provider            | Interface                                              | Implementation                            |
|---------------------|--------------------------------------------------------|-------------------------------------------|
| `IProjectsProvider` | Get projects for user/task                             | `EventBasedProjectsProvider` (/Projects/) |
| `IMrsProvider`      | Find MRs for task; returns `IAsyncEnumerable<IMrInfo>` | `MrsProvider` (/MergeRequests/)           |

Note: `IMrInfo` is an interface (implemented by `MrDto` via partial class `MrDtoExtension`) that decouples domain from proto types.

#### Configuration
- Connection string: `"TasksContext"` → PostgreSQL (localhost:5432, db: Tasks)
- Migrations: `/Migrations/` — auto-applied on startup via `Database.Migrate()`
- gRPC clients registered for: `EventsFinder`, `BranchesCreator`, `ProjectGetter`, `MrFinder`, `MrCreator`, `MrMerger`
- Service mapping: Maps `GetTaskHandler`, `CreateTaskHandler`, `ListTasksHandler` as gRPC services

---

### 3. OneMoreTaskTracker.Users (User Management gRPC Service) _(new)_

**Purpose:** User registration, authentication (BCrypt), and team hierarchy management.

**Port:** 5103 (HTTP/2 with gRPC)
**Entry:** `/OneMoreTaskTracker.Users/Program.cs`
**Database:** PostgreSQL `Users` (via Entity Framework Core, separate DB, with migrations)

#### Handler: `UserServiceHandler`

| Method                                      | Description                                                                        |
|---------------------------------------------|------------------------------------------------------------------------------------|
| `Register(RegisterRequest)`                 | Validate email/password, BCrypt hash (work factor 12), save user as Developer role |
| `Authenticate(AuthenticateRequest)`         | Find user by email, BCrypt.Verify password, return success + user info             |
| `GetTeamMemberIds(GetTeamMemberIdsRequest)` | Return user IDs where ManagerId matches the given manager                          |

#### User Model

```csharp
public class User
{
    public int Id { get; init; }
    public required string Email { get; init; }
    public required string PasswordHash { get; set; }   // BCrypt hash
    public required string Role { get; set; }           // "Developer" | "Manager"
    public int? ManagerId { get; set; }                 // Self-referential FK
    public User? Manager { get; init; }
    public List<User> TeamMembers { get; init; } = [];
}
```

#### Roles
- `Developer` — default on registration; sees own tasks
- `Manager` — sees all team members' tasks (via `GetTeamMemberIds`)

#### Proto File
```
/Protos/user_service.proto  (UserService: Register, Authenticate, GetTeamMemberIds)
```

#### Configuration
- Connection string: `"UsersContext"` → PostgreSQL (localhost:5432, db: Users)
- Migrations: auto-applied on startup

---

### 4. OneMoreTaskTracker.Api (REST API Gateway) _(new)_

**Purpose:** HTTP REST gateway for the frontend. Issues JWT tokens and proxies to gRPC services.

**Port:** 5000 (HTTP)
**Entry:** `/OneMoreTaskTracker.Api/Program.cs`

#### Controllers

**AuthController** (`/api/auth`):

| Endpoint             | Method | Auth | Description               |
|----------------------|--------|------|---------------------------|
| `/api/auth/register` | POST   | None | Register user → JWT token |
| `/api/auth/login`    | POST   | None | Authenticate → JWT token  |

**TasksController** (`/api/tasks`):

| Endpoint     | Method | Auth | Description                                         |
|--------------|--------|------|-----------------------------------------------------|
| `/api/tasks` | GET    | JWT  | List tasks (role-aware: Manager sees team)          |
| `/api/tasks` | POST   | JWT  | Create task (streaming gRPC, returns last response) |

#### JWT Configuration

**File:** `/Auth/JwtOptions.cs`

```csharp
public sealed class JwtOptions
{
    public required string Secret { get; init; }     // Min 32 chars
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public int ExpirationMinutes { get; init; } = 480;  // 8h default
}
```

#### Middleware
- `GrpcExceptionMiddleware` — translates gRPC `RpcException` status codes to HTTP status codes

#### Configuration (`appsettings.json`)
```json
{
  "TasksService": { "Address": "http://localhost:5102" },
  "UsersService": { "Address": "http://localhost:5103" },
  "Jwt": { "Secret": "...", "Issuer": "OneMoreTaskTracker", "Audience": "OneMoreTaskTracker", "ExpirationMinutes": 480 },
  "Cors": { "AllowedOrigins": ["http://localhost:5173"] }
}
```

---

### 5. OneMoreTaskTracker.GitLab.Proxy & Tasks Integration

**Circular Dependency Pattern:**
```
OneMoreTaskTracker.Tasks (client)
  ├─ depends on OneMoreTaskTracker.GitLab.Proxy gRPC services
  │  ├─ MrFinder.FindAsync() → /merge_requests with filters
  │  ├─ EventsFinder.FindAsync() → /events with user/task filter
  │  ├─ ProjectGetter.GetAsync() → /projects/{id}
  │  ├─ BranchesCreator.CreateAsync() → POST /branches
  │  └─ MrCreator.CreateAsync() → POST /merge_requests
  │
  └─ All services resolve via gRPC address in config:
     "GitLabProxy:Address" → http://localhost:5176
```

---

## CLI Application

**File:** `/OneMoreTaskTracker/Program.cs`

### Commands

| Command         | Class        | Alias | Handler               |
|-----------------|--------------|-------|-----------------------|
| DevToRelease    | `DtrCommand` | `dtr` | `DtrHandler.Handle()` |
| ReleaseToMaster | `RtmCommand` | `rtm` | `RtmHandler.Handle()` |
| MergeMrs        | `MmrCommand` | `mmr` | `MmrHandler.Handle()` |

### Usage
```bash
# Note: CLI help text still shows "mrHelper" (pending rename in Program.cs)
mrHelper dtr -tid=TASK-123 -fad=2026-03-20
mrHelper rtm -tid=TASK-123 -mst=merged
mrHelper mmr -tid=TASK-123
```

### Configuration Sources
1. User Secrets (dev)
2. Command-line args with switch mappings (`-tid` → taskId)
3. Environment variables

### Required Secrets
- `GITLAB_TOKEN` — Personal access token
- `GITLAB_USER_ID` — User ID for event filtering

---

## Domain Models

**File:** `/OneMoreTaskTracker.Domain/`

```csharp
// Base MR type (abstract record)
public abstract record MergeRequest(int ProjectId, string ProjectName, string Title,
                                     string SourceBranch, string TargetBranch);

// Subclasses
public record MrToRelease(...) : MergeRequest(...);  // Dev → Release
public record MrToMaster(...) : MergeRequest(...);   // Release → Master

// Project enriched with branch info
public record Project(int Id, string Name)
{
    internal string DevBranch { get; private set; }
    internal string TaskName { get; private set; }
    internal string ReleaseBranch => TaskName + "/release";
    internal Project Enrich(IEvent @event) { ... }
}

// Result pattern
public record Result(int ExitCode, string? Error = null);
```

---

## Workflow: DTR (Dev to Release)

**Handler:** `/OneMoreTaskTracker.Domain/DevToRelease/DtrHandler.cs`

```
1. eventsProvider.GetPushesSince(dtrCommand)
   → Stream of push events for user's commits after date

2. For each event:
   - projectsProvider.Get(projectId)
   - project.Enrich(event) → Set DevBranch, TaskName, ReleaseBranch

3. User confirmation ("Continue? [y/n]")

4. For each project:
   - branchCreator.CreateFromMaster(projectId, releaseBranch)
   - MrToRelease.Create(project, mrTitle)
   - mrCreator.Create(mr) → stream to GitLab Proxy

5. Output link to merge requests dashboard
```

---

## Key Patterns

### Handler Pattern
- One class per use-case (e.g., `CreateTaskHandler`, `FindMrHandler`)
- Implements service base from proto generation
- Dependency injection via constructor
- Async/await with streaming support

### Repository Pattern (Providers)
- `IProjectsProvider`, `IMrProvider`, `IEventsProvider`, etc.
- Abstract data access behind interface
- Enables swapping implementations, testing with mocks

### Mapping
- **Mapster:** Auto-mapping between DTOs and domain models
- Example: `task.Adapt<TaskDto>()` in handlers

### Related Codemaps
- See [data.md](data.md) for TaskState lifecycle
- See [architecture.md](architecture.md) for inter-service communication
- See [dependencies.md](dependencies.md) for external API contracts
